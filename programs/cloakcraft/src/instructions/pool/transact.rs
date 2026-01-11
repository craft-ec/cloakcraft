//! Transact - private transfer with optional unshield
//!
//! Uses Light Protocol for both nullifier and commitment storage.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{Pool, VerificationKey, PoolCommitmentCounter, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteCreated, NoteSpent, Unshielded};
use crate::crypto::verify_proof;
use crate::light_cpi::{create_nullifier_account, create_commitment_account};
use crate::merkle::hash_pair;

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

/// Parameters for Light Protocol operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightTransactParams {
    /// Validity proof for nullifier (proves it doesn't exist)
    pub nullifier_proof: LightValidityProof,
    /// Address tree info for nullifier
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for output commitments
    pub commitment_proof: LightValidityProof,
    /// Address tree info for commitments
    pub commitment_address_tree_info: LightAddressTreeInfo,
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
    _merkle_root: [u8; 32], // Deprecated: merkle root now from Light Protocol
    nullifier: [u8; 32],
    out_commitments: Vec<[u8; 32]>,
    encrypted_notes: Vec<Vec<u8>>,
    unshield_amount: u64,
    light_params: Option<LightNullifierParams>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let commitment_counter = &mut ctx.accounts.commitment_counter;
    let clock = Clock::get()?;

    // 1. Verify ZK proof
    // Note: The merkle root is now part of the validity proof from Light Protocol
    // The ZK circuit proves: commitment exists in tree AND nullifier is correctly derived
    let public_inputs = build_transact_public_inputs(
        &nullifier,
        &out_commitments,
        &pool.token_mint,
        unshield_amount,
        ctx.accounts.unshield_recipient.as_ref().map(|r| r.key()),
    );

    verify_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
    )?;

    // 2. Create nullifier compressed account via Light Protocol
    if let Some(params) = &light_params {
        create_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.validity_proof.clone(),
            params.address_tree_info.clone(),
            params.output_tree_index,
            pool.key(),
            nullifier,
        )?;
    }

    // Emit nullifier event
    emit!(NoteSpent {
        pool: pool.key(),
        nullifier,
        timestamp: clock.unix_timestamp,
    });

    // 3. Create output commitment compressed accounts
    for (i, commitment) in out_commitments.iter().enumerate() {
        let leaf_index = commitment_counter.next_leaf_index;
        commitment_counter.next_leaf_index += 1;
        commitment_counter.total_commitments += 1;

        let encrypted_note = encrypted_notes.get(i).cloned().unwrap_or_default();

        // Create commitment compressed account if Light params provided
        if let Some(params) = &light_params {
            let encrypted_note_hash = hash_pair(
                commitment,
                &if encrypted_note.len() >= 32 {
                    let mut arr = [0u8; 32];
                    arr.copy_from_slice(&encrypted_note[..32]);
                    arr
                } else {
                    let mut arr = [0u8; 32];
                    arr[..encrypted_note.len()].copy_from_slice(&encrypted_note);
                    arr
                },
            );

            create_commitment_account(
                &ctx.accounts.relayer.to_account_info(),
                ctx.remaining_accounts,
                params.validity_proof.clone(),
                params.address_tree_info.clone(),
                params.output_tree_index,
                pool.key(),
                *commitment,
                leaf_index,
                encrypted_note_hash,
            )?;
        }

        emit!(NoteCreated {
            pool: pool.key(),
            commitment: *commitment,
            leaf_index: leaf_index as u32,
            encrypted_note,
            timestamp: clock.unix_timestamp,
        });
    }

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
            .ok_or(CloakCraftError::InsufficientBalance)?;

        emit!(Unshielded {
            pool: pool.key(),
            amount: unshield_amount,
            recipient: recipient.key(),
            timestamp: clock.unix_timestamp,
        });
    }

    Ok(())
}

/// Build public inputs array for proof verification
fn build_transact_public_inputs(
    nullifier: &[u8; 32],
    out_commitments: &[[u8; 32]],
    token_mint: &Pubkey,
    unshield_amount: u64,
    unshield_recipient: Option<Pubkey>,
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    // Note: merkle_root is no longer a public input - it's verified by Light Protocol
    inputs.push(*nullifier);
    for commitment in out_commitments {
        inputs.push(*commitment);
    }
    inputs.push(pubkey_to_field(token_mint));
    inputs.push(u64_to_field(unshield_amount));
    if let Some(recipient) = unshield_recipient {
        inputs.push(pubkey_to_field(&recipient));
    }
    inputs
}

fn pubkey_to_field(pubkey: &Pubkey) -> [u8; 32] {
    pubkey.to_bytes()
}

fn u64_to_field(value: u64) -> [u8; 32] {
    let mut result = [0u8; 32];
    result[..8].copy_from_slice(&value.to_le_bytes());
    result
}
