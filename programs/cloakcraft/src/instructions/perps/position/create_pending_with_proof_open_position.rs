//! Create Pending Operation with Proof - Phase 0 (Open Position)
//!
//! This is Phase 0 of the append pattern multi-phase operation for opening a perps position.
//! It verifies the ZK proof and creates the PendingOperation PDA with binding fields.
//!
//! SECURITY: This phase extracts and stores:
//! - input_commitment (margin commitment from proof public inputs)
//! - expected_nullifier (from proof public inputs)
//! - position_commitment (new position commitment)
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists (margin)
//! Phase 2: Create nullifier (spend margin)
//! Phase 3: Execute open position (lock tokens, update market OI)
//! Phase 4: Create commitment (position)
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, PerpsPool, PerpsMarket, VerificationKey, PendingOperation, PENDING_OPERATION_EXPIRY_SECONDS};
use crate::constants::{seeds, operation_types};
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::{pubkey_to_field, bytes_to_field};

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePendingWithProofOpenPosition<'info> {
    /// Margin token pool (where the margin commitment is spent from)
    #[account(
        seeds = [seeds::POOL, margin_pool.token_mint.as_ref()],
        bump = margin_pool.bump,
    )]
    pub margin_pool: Box<Account<'info, Pool>>,

    /// Position pool (where position commitments are stored)
    #[account(
        seeds = [seeds::POOL, position_pool.token_mint.as_ref()],
        bump = position_pool.bump,
        constraint = position_pool.token_mint == perps_pool.position_mint @ CloakCraftError::InvalidTokenMint,
    )]
    pub position_pool: Box<Account<'info, Pool>>,

    /// Perps pool
    #[account(
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
        constraint = perps_pool.is_active @ CloakCraftError::PerpsPoolNotActive,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Market being traded
    #[account(
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), perps_market.market_id.as_ref()],
        bump = perps_market.bump,
        constraint = perps_market.pool == perps_pool.key() @ CloakCraftError::PerpsMarketNotFound,
        constraint = perps_market.is_active @ CloakCraftError::PerpsMarketNotActive,
    )]
    pub perps_market: Box<Account<'info, PerpsMarket>>,

    /// Verification key for the open position circuit
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

/// Phase 0: Verify ZK proof and create PendingOperation for open position
#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof_open_position<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofOpenPosition<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    input_commitment: [u8; 32],
    nullifier: [u8; 32],
    position_commitment: [u8; 32],
    change_commitment: [u8; 32],
    is_long: bool,
    margin_amount: u64,
    leverage: u8,
    position_fee: u64,
    change_amount: u64,
) -> Result<()> {
    let margin_pool = &ctx.accounts.margin_pool;
    let position_pool = &ctx.accounts.position_pool;
    let perps_pool = &ctx.accounts.perps_pool;
    let perps_market = &ctx.accounts.perps_market;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 0: Verify Proof + Create Pending (Open Position) ===");

    // Validate leverage
    require!(
        leverage >= 1 && leverage <= perps_pool.max_leverage,
        CloakCraftError::LeverageExceeded
    );

    // Validate margin amount
    require!(margin_amount > 0, CloakCraftError::InvalidMarginAmount);

    // 1. Verify ZK proof (11 public inputs matching Circom circuit)
    let mut margin_bytes = [0u8; 32];
    margin_bytes[24..].copy_from_slice(&margin_amount.to_be_bytes());

    let mut leverage_bytes = [0u8; 32];
    leverage_bytes[31] = leverage;

    let mut fee_bytes = [0u8; 32];
    fee_bytes[24..].copy_from_slice(&position_fee.to_be_bytes());

    let mut is_long_bytes = [0u8; 32];
    is_long_bytes[31] = if is_long { 1 } else { 0 };

    let mut change_amount_bytes = [0u8; 32];
    change_amount_bytes[24..].copy_from_slice(&change_amount.to_be_bytes());

    let public_inputs = vec![
        merkle_root,
        nullifier,
        pubkey_to_field(&perps_pool.pool_id),
        // IMPORTANT: market_id must be reduced to field element to match SDK's bytesToField
        bytes_to_field(&perps_market.market_id),
        position_commitment,
        change_commitment,
        is_long_bytes,
        margin_bytes,
        leverage_bytes,
        fee_bytes,
        change_amount_bytes,
    ];

    verify_groth16_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs, "OpenPosition")?;
    msg!("✅ ZK proof verified");

    // 2. Initialize pending operation PDA with binding fields
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = operation_types::PERPS_OPEN_POSITION;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // SECURITY: Store binding fields from ZK proof
    pending_op.num_inputs = 1;
    pending_op.input_commitments[0] = input_commitment;
    pending_op.expected_nullifiers[0] = nullifier;
    pending_op.input_pools[0] = margin_pool.key().to_bytes();
    pending_op.inputs_verified_mask = 0;
    pending_op.proof_verified = true;

    // Store output commitments (position + optional change)
    pending_op.pools[0] = position_pool.key().to_bytes(); // Position stored in position pool
    pending_op.commitments[0] = position_commitment;
    pending_op.output_amounts[0] = 1; // Non-zero to indicate valid output (position)

    // Store change commitment if change_amount > 0
    if change_amount > 0 {
        pending_op.num_commitments = 2;
        pending_op.pools[1] = margin_pool.key().to_bytes(); // Change goes back to margin pool
        pending_op.commitments[1] = change_commitment;
        pending_op.output_amounts[1] = change_amount;
    } else {
        pending_op.num_commitments = 1;
    }

    pending_op.nullifier_completed_mask = 0;
    pending_op.completed_mask = 0;

    // Store position-specific data for Phase 3
    // Reusing existing fields
    pending_op.swap_amount = margin_amount;
    pending_op.output_amount = leverage as u64; // Store leverage in output_amount
    pending_op.min_output = position_fee; // Store fee in min_output
    pending_op.swap_a_to_b = is_long;

    // Store change_amount in extra_amount field for reference
    pending_op.extra_amount = change_amount;

    msg!("Phase 0 complete: ZK proof verified, pending operation created");
    msg!("Next: Phase 1 - verify_commitment_exists");

    Ok(())
}
