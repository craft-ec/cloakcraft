//! Transact - private transfer with optional unshield (Multi-Phase)
//!
//! Phase 1 (transact): Verify proof + Verify commitment + Create nullifier + Store pending + Unshield
//! Phase 2+ (create_commitment): Create each output commitment via generic instruction
//! Phase 3 (close_pending_operation): Close pending operation to reclaim rent
//!
//! SECURITY: Phase 1 atomically verifies input commitment exists and creates nullifier.
//! Uses generic Light Protocol instructions for output commitment storage.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{
    Pool, VerificationKey, PoolCommitmentCounter,
    LightValidityProof, LightAddressTreeInfo, PendingOperation,
    PENDING_OPERATION_EXPIRY_SECONDS,
};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::{pubkey_to_field, u64_to_field};
use crate::helpers::vault::{transfer_from_vault, update_pool_balance};
// Removed: verify_and_spend_commitment (deprecated collapsed pattern)
// use crate::helpers::commitment::verify_and_spend_commitment;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct Transact<'info> {
    /// Pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Pending operation PDA (created in this instruction)
    #[account(
        init,
        payer = relayer,
        space = PendingOperation::SPACE,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

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

    /// System program
    pub system_program: Program<'info, System>,

    // Light Protocol accounts are passed via remaining_accounts
}

/// Operation type constant for transact
pub const OP_TYPE_TRANSACT: u8 = 0;

/// Merkle context for verifying commitment exists in state tree
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CommitmentMerkleContext {
    pub merkle_tree_pubkey_index: u8,
    pub leaf_index: u32,
    pub root_index: u16,
}

/// Parameters for transact Phase 1
/// SECURITY CRITICAL: Verifies commitment exists + creates nullifier
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightTransactParams {
    /// Account hash of input commitment (for verification)
    pub commitment_account_hash: [u8; 32],
    /// Merkle context proving commitment exists in state tree
    pub commitment_merkle_context: CommitmentMerkleContext,
    /// Commitment inclusion proof (SECURITY: proves commitment EXISTS)
    pub commitment_inclusion_proof: LightValidityProof,
    /// Address tree info for commitment verification
    pub commitment_address_tree_info: LightAddressTreeInfo,
    /// Nullifier non-inclusion proof (proves nullifier doesn't exist yet)
    pub nullifier_non_inclusion_proof: LightValidityProof,
    /// Address tree info for nullifier creation
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index for new nullifier account
    pub output_tree_index: u8,
}

/// Phase 1: Verify proof + Verify commitment + Create nullifier + Store pending + Unshield
///
/// SECURITY CRITICAL: This instruction atomically:
/// 1. Verifies the ZK proof is valid
/// 2. Verifies input commitment exists in Light Protocol state tree
/// 3. Creates spend nullifier (prevents double-spend)
/// 4. Processes unshield if requested
/// 5. Stores pending commitments for subsequent phases
///
/// After this, call:
/// 1. create_commitment (generic) for each output commitment
/// 2. close_pending_operation (generic) to reclaim rent
#[allow(clippy::too_many_arguments)]
pub fn transact<'info>(
    ctx: Context<'_, '_, '_, 'info, Transact<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    nullifier: [u8; 32],
    _input_commitment: [u8; 32], // For debugging only, not used in logic
    out_commitments: Vec<[u8; 32]>,
    _encrypted_notes: Vec<Vec<u8>>, // Stored in pending operation
    unshield_amount: u64,
    num_commitments: u8,
    light_params: LightTransactParams,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    // 1. Verify ZK proof (SECURITY CRITICAL)
    // The ZK circuit proves:
    // - Input commitment exists in merkle tree with given root
    // - Nullifier is correctly derived from commitment
    // - Output commitments are correctly computed
    // - Token mint and amounts are correct
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

        verify_groth16_proof(
            &proof,
            &ctx.accounts.verification_key.vk_data,
            &public_inputs,
            "Transfer",
        )?;
    }

    // Log that verification was skipped (for testing only)
    #[cfg(feature = "skip-zk-verify")]
    {
        msg!("WARNING: ZK proof verification skipped (testing mode)");
        let _ = &proof; // Suppress unused warning
    }

    // 2. SECURITY: Verify input commitment exists + create spend nullifier
    // DEPRECATED: This collapsed version is no longer used. Use append pattern instead:
    // - create_pending_with_proof (Phase 0)
    // - verify_commitment_exists (Phase 1)
    // - create_nullifier_and_pending (Phase 2)
    // - process_unshield (Phase 3)
    // - create_commitment (Phase 4+)
    msg!("=== DEPRECATED: Use append pattern instead ===");
    return Err(CloakCraftError::Deprecated.into());

    // 3. Initialize pending operation PDA
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = OP_TYPE_TRANSACT;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // Nullifier already created in Phase 1 (no Phase 2 nullifier creation needed)
    pending_op.nullifier_completed_mask = 0;

    // Store commitment data for Phase 2+ (create_commitment calls)
    pending_op.num_commitments = num_commitments;
    for (i, commitment) in out_commitments.iter().enumerate() {
        if i >= pending_op.commitments.len() {
            break;
        }
        pending_op.pools[i] = pool.key().to_bytes();
        pending_op.commitments[i] = *commitment;
    }
    pending_op.completed_mask = 0;

    msg!("Transact Phase 1 complete: proof verified, nullifier created, {} commitments pending", num_commitments);

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

        transfer_from_vault(
            &ctx.accounts.token_program,
            &ctx.accounts.token_vault,
            recipient,
            &pool.to_account_info(),
            signer_seeds,
            unshield_amount,
        )?;

        update_pool_balance(pool, unshield_amount, false)?;
    }

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
