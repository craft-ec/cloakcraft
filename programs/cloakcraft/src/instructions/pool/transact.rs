//! Transact - private transfer with optional unshield
//!
//! Uses Light Protocol for both nullifier and commitment storage.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{Pool, VerificationKey, PoolCommitmentCounter, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::crypto::verify_proof;
use crate::light_cpi::create_spend_nullifier_account;

#[derive(Accounts)]
pub struct Transact<'info> {
    /// Pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Commitment counter for this pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool.key().as_ref()],
        bump = commitment_counter.bump,
    )]
    pub commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// Token vault
    #[account(
        mut,
        seeds = [seeds::VAULT, pool.token_mint.as_ref()],
        bump = pool.vault_bump,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// Verification key for the circuit (boxed to reduce stack usage)
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Unshield recipient (optional, can be any account)
    /// CHECK: This is the recipient for unshielded tokens
    #[account(mut)]
    pub unshield_recipient: Option<Account<'info, TokenAccount>>,

    /// Relayer/submitter (pays for compressed account creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,

    // Light Protocol accounts are passed via remaining_accounts
}

/// Parameters for Light Protocol combined validity proof
///
/// The combined proof verifies:
/// - Commitment exists (inclusion) - prevents fake commitment attacks
/// - Nullifier doesn't exist (non-inclusion) - prevents double-spend
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightTransactParams {
    /// Combined validity proof (commitment inclusion + nullifier non-inclusion)
    pub validity_proof: LightValidityProof,
    /// Address tree info for nullifier creation
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

/// Legacy params for backwards compatibility
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightNullifierParams {
    /// Validity proof from Helius indexer (proves nullifier doesn't exist)
    pub validity_proof: LightValidityProof,
    /// Address tree info for compressed account address derivation
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index for the new compressed account
    pub output_tree_index: u8,
}

pub fn transact<'info>(
    ctx: Context<'_, '_, '_, 'info, Transact<'info>>,
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    nullifier: [u8; 32],
    out_commitments: Vec<[u8; 32]>,
    _encrypted_notes: Vec<Vec<u8>>, // Passed to store_commitment separately
    unshield_amount: u64,
    light_params: Option<LightTransactParams>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let commitment_counter = &mut ctx.accounts.commitment_counter;
    let clock = Clock::get()?;

    // 1. Verify ZK proof
    // Note: The merkle root is now part of the validity proof from Light Protocol
    // The ZK circuit proves: commitment exists in tree AND nullifier is correctly derived
    //
    // TODO: Enable verification once sunspot/gnark supports Noir public inputs.
    // Currently sunspot extracts nbPublic=0 from Noir circuits because Noir uses
    // return values for public inputs while gnark expects them in the constraint system.
    // See: https://github.com/reilabs/sunspot/issues/XX
    #[cfg(not(feature = "skip-zk-verify"))]
    {
        let token_mint_field = pubkey_to_field(&pool.token_mint);
        let unshield_field = u64_to_field(unshield_amount);

        msg!("=== ZK Public Inputs Debug ===");
        msg!("merkle_root: {:?}", &merkle_root[..8]);
        msg!("nullifier: {:?}", &nullifier[..8]);
        msg!("out_commitment_1: {:?}", &out_commitments[0][..8]);
        msg!("out_commitment_2: {:?}", &out_commitments[1][..8]);
        msg!("token_mint raw: {}", pool.token_mint);
        msg!("token_mint field: {:?}", &token_mint_field[..8]);
        msg!("unshield_amount: {}", unshield_amount);
        msg!("unshield field: {:?}", &unshield_field[24..32]);

        let public_inputs = build_transact_public_inputs(
            &merkle_root,
            &nullifier,
            &out_commitments,
            &pool.token_mint,
            unshield_amount,
        );

        msg!("Total public inputs: {}", public_inputs.len());

        verify_proof(
            &proof,
            &ctx.accounts.verification_key.vk_data,
            &public_inputs,
        )?;
    }

    // Log that verification was skipped (for testing only)
    #[cfg(feature = "skip-zk-verify")]
    {
        msg!("WARNING: ZK proof verification skipped (testing mode)");
        let _ = &proof; // Suppress unused warning
    }

    // 2. Create spend nullifier via Light Protocol
    // The validity_proof verifies both commitment existence and nullifier non-existence
    if let Some(params) = &light_params {
        create_spend_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.validity_proof.clone(),
            params.nullifier_address_tree_info.clone(),
            params.output_tree_index,
            pool.key(),
            nullifier,
        )?;
    }

    // Emit nullifier event
    // 3. Update commitment counter for leaf index assignment
    // Commitments are stored via separate store_commitment transactions
    // Caller reads counter before transact to know starting leaf index
    let commitment_count = out_commitments.len() as u64;
    commitment_counter.next_leaf_index += commitment_count;
    commitment_counter.total_commitments += commitment_count;

    // 4. Process unshield if amount > 0
    if unshield_amount > 0 {
        let recipient = ctx.accounts.unshield_recipient.as_ref()
            .ok_or(CloakCraftError::InvalidAmount)?;

        // Transfer from vault to recipient
        let pool_seeds = &[
            seeds::POOL,
            pool.token_mint.as_ref(),
            &[pool.bump],
        ];
        let signer_seeds = &[&pool_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: recipient.to_account_info(),
            authority: pool.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, unshield_amount)?;

        pool.total_shielded = pool.total_shielded.checked_sub(unshield_amount)
            .ok_or(CloakCraftError::InsufficientBalance)?;    }

    Ok(())
}

/// Build public inputs array for proof verification
/// Order matches circuit: merkle_root, nullifier, out_commitments, token_mint, unshield_amount
fn build_transact_public_inputs(
    merkle_root: &[u8; 32],
    nullifier: &[u8; 32],
    out_commitments: &[[u8; 32]],
    token_mint: &Pubkey,
    unshield_amount: u64,
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    inputs.push(*merkle_root);
    inputs.push(*nullifier);
    for commitment in out_commitments {
        inputs.push(*commitment);
    }
    inputs.push(pubkey_to_field(token_mint));
    inputs.push(u64_to_field(unshield_amount));
    inputs
}

/// BN254 field modulus as bytes (big-endian)
const BN254_FIELD_MODULUS: [u8; 32] = [
    0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29,
    0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
    0x97, 0x81, 0x6a, 0x91, 0x68, 0x71, 0xca, 0x8d,
    0x3c, 0x20, 0x8c, 0x16, 0xd8, 0x7c, 0xfd, 0x47,
];

/// Subtract modulus from value: result = value - modulus
fn subtract_modulus(value: &[u8; 32]) -> [u8; 32] {
    let mut result = [0u8; 32];
    let mut borrow: i16 = 0;

    for i in (0..32).rev() {
        let diff = value[i] as i16 - BN254_FIELD_MODULUS[i] as i16 - borrow;
        if diff < 0 {
            result[i] = (diff + 256) as u8;
            borrow = 1;
        } else {
            result[i] = diff as u8;
            borrow = 0;
        }
    }
    result
}

/// Compare two 32-byte big-endian numbers: returns true if a >= b
fn ge_modulus(a: &[u8; 32]) -> bool {
    for i in 0..32 {
        if a[i] > BN254_FIELD_MODULUS[i] {
            return true;
        } else if a[i] < BN254_FIELD_MODULUS[i] {
            return false;
        }
    }
    true // equal
}

/// Convert a pubkey to a field element by taking modulo the BN254 field prime
fn pubkey_to_field(pubkey: &Pubkey) -> [u8; 32] {
    let mut value = pubkey.to_bytes();

    // Subtract modulus while value >= modulus
    // Max 4 subtractions needed since pubkey is 256 bits and modulus is ~254 bits
    for _ in 0..4 {
        if ge_modulus(&value) {
            value = subtract_modulus(&value);
        } else {
            break;
        }
    }

    value
}

fn u64_to_field(value: u64) -> [u8; 32] {
    // Convert u64 to 32-byte big-endian field element
    let mut result = [0u8; 32];
    result[24..32].copy_from_slice(&value.to_be_bytes());
    result
}
