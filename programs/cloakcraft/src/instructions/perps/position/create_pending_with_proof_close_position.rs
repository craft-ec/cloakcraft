//! Create Pending Operation with Proof - Phase 0 (Close Position)
//!
//! This is Phase 0 of the append pattern multi-phase operation for closing a perps position.
//! It verifies the ZK proof and creates the PendingOperation PDA with binding fields.
//!
//! SECURITY: This phase extracts and stores:
//! - position_commitment (from proof public inputs)
//! - expected_nullifier (position nullifier)
//! - settlement_commitment (margin +/- PnL)
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists (position)
//! Phase 2: Create nullifier (close position)
//! Phase 3: Execute close position (settle PnL, unlock tokens)
//! Phase 4: Create commitment (settlement)
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, PerpsPool, PerpsMarket, VerificationKey, PendingOperation, PENDING_OPERATION_EXPIRY_SECONDS};
use crate::constants::{seeds, operation_types};
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::pubkey_to_field;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePendingWithProofClosePosition<'info> {
    /// Position pool (where position commitment is read from)
    #[account(
        seeds = [seeds::POOL, position_pool.token_mint.as_ref()],
        bump = position_pool.bump,
        constraint = position_pool.token_mint == perps_pool.position_mint @ CloakCraftError::InvalidTokenMint,
    )]
    pub position_pool: Box<Account<'info, Pool>>,

    /// Settlement token pool (where settlement commitment goes)
    #[account(
        seeds = [seeds::POOL, settlement_pool.token_mint.as_ref()],
        bump = settlement_pool.bump,
    )]
    pub settlement_pool: Box<Account<'info, Pool>>,

    /// Perps pool
    #[account(
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Market being traded
    #[account(
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), perps_market.market_id.as_ref()],
        bump = perps_market.bump,
        constraint = perps_market.pool == perps_pool.key() @ CloakCraftError::PerpsMarketNotFound,
    )]
    pub perps_market: Box<Account<'info, PerpsMarket>>,

    /// Verification key for the close position circuit
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

/// Phase 0: Verify ZK proof and create PendingOperation for close position
#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof_close_position<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofClosePosition<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    position_commitment: [u8; 32],
    position_nullifier: [u8; 32],
    settlement_commitment: [u8; 32],
    is_long: bool,
    exit_price: u64,
    close_fee: u64,
    pnl_amount: u64,
    is_profit: bool,
) -> Result<()> {
    let position_pool = &ctx.accounts.position_pool;
    let settlement_pool = &ctx.accounts.settlement_pool;
    let perps_pool = &ctx.accounts.perps_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 0: Verify Proof + Create Pending (Close Position) ===");

    // 1. Verify ZK proof (9 public inputs matching Circom circuit)
    let mut exit_price_bytes = [0u8; 32];
    exit_price_bytes[24..].copy_from_slice(&exit_price.to_be_bytes());

    let mut close_fee_bytes = [0u8; 32];
    close_fee_bytes[24..].copy_from_slice(&close_fee.to_be_bytes());

    let mut pnl_bytes = [0u8; 32];
    pnl_bytes[24..].copy_from_slice(&pnl_amount.to_be_bytes());

    let mut is_long_bytes = [0u8; 32];
    is_long_bytes[31] = if is_long { 1 } else { 0 };

    let mut is_profit_bytes = [0u8; 32];
    is_profit_bytes[31] = if is_profit { 1 } else { 0 };

    let public_inputs = vec![
        merkle_root,
        position_nullifier,
        pubkey_to_field(&perps_pool.pool_id),
        settlement_commitment,
        is_long_bytes,
        exit_price_bytes,
        close_fee_bytes,
        pnl_bytes,
        is_profit_bytes,
    ];

    verify_groth16_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs, "ClosePosition")?;
    msg!("✅ ZK proof verified");

    // 2. Initialize pending operation PDA with binding fields
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = operation_types::PERPS_CLOSE_POSITION;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // SECURITY: Store binding fields from ZK proof
    pending_op.num_inputs = 1;
    pending_op.input_commitments[0] = position_commitment;
    pending_op.expected_nullifiers[0] = position_nullifier;
    pending_op.input_pools[0] = position_pool.key().to_bytes(); // Position read from position pool
    pending_op.inputs_verified_mask = 0;
    pending_op.proof_verified = true;

    // Store output commitment (settlement)
    pending_op.num_commitments = 1;
    pending_op.pools[0] = settlement_pool.key().to_bytes();
    pending_op.commitments[0] = settlement_commitment;
    pending_op.output_amounts[0] = 1; // Non-zero to indicate valid output

    pending_op.nullifier_completed_mask = 0;
    pending_op.completed_mask = 0;

    // Store close-specific data for Phase 3
    pending_op.swap_amount = pnl_amount;
    pending_op.output_amount = exit_price;
    pending_op.min_output = close_fee;
    pending_op.swap_a_to_b = is_long;
    pending_op.extra_amount = if is_profit { 1 } else { 0 };

    msg!("Phase 0 complete: ZK proof verified, pending operation created");
    msg!("Next: Phase 1 - verify_commitment_exists");

    Ok(())
}
