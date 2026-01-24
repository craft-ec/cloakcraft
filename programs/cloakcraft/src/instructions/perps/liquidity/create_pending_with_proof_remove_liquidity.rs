//! Create Pending Operation with Proof - Phase 0 (Remove Perps Liquidity)
//!
//! Single token withdrawal model:
//! - User burns LP tokens
//! - Can withdraw any supported token (up to available balance)
//! - Withdrawal limited by utilization (can't exceed 80%)
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists (LP token)
//! Phase 2: Create nullifier (burn LP)
//! Phase 3: Execute remove liquidity (burn LP, withdraw token)
//! Phase 4: Create commitments (token + LP change)
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, PerpsPool, VerificationKey, PendingOperation, PENDING_OPERATION_EXPIRY_SECONDS};
use crate::constants::{seeds, operation_types};
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::pubkey_to_field;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePendingWithProofRemovePerpsLiquidity<'info> {
    /// Withdrawal token pool
    #[account(
        seeds = [seeds::POOL, withdrawal_pool.token_mint.as_ref()],
        bump = withdrawal_pool.bump,
    )]
    pub withdrawal_pool: Box<Account<'info, Pool>>,

    /// LP token pool (for LP input and change commitments)
    #[account(
        seeds = [seeds::POOL, lp_pool.token_mint.as_ref()],
        bump = lp_pool.bump,
        constraint = lp_pool.token_mint == perps_pool.lp_mint @ CloakCraftError::InvalidTokenMint,
    )]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// Perps pool
    #[account(
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Verification key for the remove perps liquidity circuit
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Pending operation PDA (created in this instruction)
    #[account(
        init,
        payer = relayer,
        space = PendingOperation::SPACE,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (pays for PDA creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Phase 0: Verify ZK proof and create PendingOperation for remove perps liquidity
#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof_remove_perps_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofRemovePerpsLiquidity<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    lp_commitment: [u8; 32],
    lp_nullifier: [u8; 32],
    out_commitment: [u8; 32],
    change_lp_commitment: [u8; 32],
    token_index: u8,
    withdraw_amount: u64,
    lp_amount_burned: u64,
    fee_amount: u64,
) -> Result<()> {
    let withdrawal_pool = &ctx.accounts.withdrawal_pool;
    let perps_pool = &ctx.accounts.perps_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 0: Verify Proof + Create Pending (Remove Perps Liquidity) ===");

    // Validate token index
    require!(
        token_index < perps_pool.num_tokens,
        CloakCraftError::InvalidTokenIndex
    );

    // 1. Verify ZK proof (8 public inputs matching Circom circuit)
    let mut token_index_bytes = [0u8; 32];
    token_index_bytes[31] = token_index;

    let mut withdraw_bytes = [0u8; 32];
    withdraw_bytes[24..].copy_from_slice(&withdraw_amount.to_be_bytes());

    let mut lp_burned_bytes = [0u8; 32];
    lp_burned_bytes[24..].copy_from_slice(&lp_amount_burned.to_be_bytes());

    let mut fee_bytes = [0u8; 32];
    fee_bytes[24..].copy_from_slice(&fee_amount.to_be_bytes());

    let public_inputs = vec![
        merkle_root,
        lp_nullifier,
        pubkey_to_field(&perps_pool.pool_id),
        out_commitment,
        token_index_bytes,
        withdraw_bytes,
        lp_burned_bytes,
        fee_bytes,
    ];

    verify_groth16_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs, "RemovePerpsLiquidity")?;
    msg!("✅ ZK proof verified");

    // 2. Initialize pending operation PDA with binding fields
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = operation_types::PERPS_REMOVE_LIQUIDITY;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // SECURITY: Store binding fields from ZK proof
    pending_op.num_inputs = 1;
    pending_op.input_commitments[0] = lp_commitment;
    pending_op.expected_nullifiers[0] = lp_nullifier;
    pending_op.input_pools[0] = ctx.accounts.lp_pool.key().to_bytes(); // LP input from LP pool
    pending_op.inputs_verified_mask = 0;
    pending_op.proof_verified = true;

    // Store output commitments (withdrawn token + LP change)
    pending_op.num_commitments = 2;
    pending_op.pools[0] = withdrawal_pool.key().to_bytes(); // Withdrawn token to token pool
    pending_op.commitments[0] = out_commitment;
    pending_op.output_amounts[0] = withdraw_amount;
    pending_op.pools[1] = ctx.accounts.lp_pool.key().to_bytes(); // LP change to LP pool
    pending_op.commitments[1] = change_lp_commitment;
    pending_op.output_amounts[1] = 1; // LP change amount (non-zero if partial burn)

    pending_op.nullifier_completed_mask = 0;
    pending_op.completed_mask = 0;

    // Store remove liquidity-specific data for Phase 3
    pending_op.swap_amount = lp_amount_burned;
    pending_op.output_amount = withdraw_amount;
    pending_op.min_output = fee_amount;
    pending_op.extra_amount = token_index as u64;

    msg!("Phase 0 complete: ZK proof verified, pending operation created");
    msg!("Next: Phase 1 - verify_commitment_exists");

    Ok(())
}
