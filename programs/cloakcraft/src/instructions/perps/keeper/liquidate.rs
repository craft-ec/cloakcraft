//! Liquidate Position
//!
//! Keeper instruction to liquidate underwater positions.
//! A position is liquidatable when effective margin drops below liquidation threshold.
//!
//! Liquidation follows the multi-phase append pattern but with keeper initiation:
//! - Phase 0: Verify liquidation proof + Create pending operation
//! - Phase 1-2: Generic commitment/nullifier phases
//! - Phase 3: Execute liquidation (close position, distribute rewards)
//! - Phase 4+: Create commitments (owner remainder + liquidator reward)
//!
//! This file contains Phase 0 and Phase 3 for liquidation.

use anchor_lang::prelude::*;

use crate::state::{Pool, PerpsPool, PerpsMarket, VerificationKey, PendingOperation, PENDING_OPERATION_EXPIRY_SECONDS};
use crate::constants::{seeds, operation_types};
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::pubkey_to_field;

// ============================================================================
// Phase 0: Create Pending with Proof Liquidate
// ============================================================================

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePendingWithProofLiquidate<'info> {
    /// Settlement pool
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

    /// Market
    #[account(
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), perps_market.market_id.as_ref()],
        bump = perps_market.bump,
    )]
    pub perps_market: Box<Account<'info, PerpsMarket>>,

    /// Verification key for liquidate circuit
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Pending operation PDA
    #[account(
        init,
        payer = keeper,
        space = PendingOperation::SPACE,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Keeper (initiates liquidation)
    #[account(mut)]
    pub keeper: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof_liquidate<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofLiquidate<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    position_commitment: [u8; 32],
    position_nullifier: [u8; 32],
    owner_commitment: [u8; 32],
    liquidator_commitment: [u8; 32],
    current_price: u64,
    liquidator_reward: u64,
    owner_remainder: u64,
) -> Result<()> {
    let settlement_pool = &ctx.accounts.settlement_pool;
    let perps_pool = &ctx.accounts.perps_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 0: Verify Proof + Create Pending (Liquidate) ===");

    // Verify ZK proof (8 public inputs)
    let mut price_bytes = [0u8; 32];
    price_bytes[24..].copy_from_slice(&current_price.to_be_bytes());

    let mut reward_bytes = [0u8; 32];
    reward_bytes[24..].copy_from_slice(&liquidator_reward.to_be_bytes());

    let mut remainder_bytes = [0u8; 32];
    remainder_bytes[24..].copy_from_slice(&owner_remainder.to_be_bytes());

    let public_inputs = vec![
        merkle_root,
        position_nullifier,
        pubkey_to_field(&perps_pool.pool_id),
        owner_commitment,
        liquidator_commitment,
        price_bytes,
        reward_bytes,
        remainder_bytes,
    ];

    verify_groth16_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs, "Liquidate")?;
    msg!("✅ ZK proof verified");

    // Initialize pending operation
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.keeper.key();
    pending_op.operation_type = operation_types::PERPS_LIQUIDATE;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // Store binding fields
    pending_op.num_inputs = 1;
    pending_op.input_commitments[0] = position_commitment;
    pending_op.expected_nullifiers[0] = position_nullifier;
    pending_op.input_pools[0] = settlement_pool.key().to_bytes();
    pending_op.inputs_verified_mask = 0;
    pending_op.proof_verified = true;

    // Store output commitments (owner + liquidator)
    pending_op.num_commitments = 2;
    pending_op.pools[0] = settlement_pool.key().to_bytes();
    pending_op.commitments[0] = owner_commitment;
    pending_op.output_amounts[0] = owner_remainder;
    pending_op.pools[1] = settlement_pool.key().to_bytes();
    pending_op.commitments[1] = liquidator_commitment;
    pending_op.output_amounts[1] = liquidator_reward;

    pending_op.nullifier_completed_mask = 0;
    pending_op.completed_mask = 0;

    // Store liquidation-specific data
    pending_op.swap_amount = current_price;
    pending_op.output_amount = liquidator_reward;
    pending_op.min_output = owner_remainder;

    msg!("Phase 0 complete: Liquidation proof verified");

    Ok(())
}

// ============================================================================
// Phase 3: Execute Liquidate
// ============================================================================

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteLiquidate<'info> {
    /// Settlement pool
    #[account(
        seeds = [seeds::POOL, settlement_pool.token_mint.as_ref()],
        bump = settlement_pool.bump,
    )]
    pub settlement_pool: Box<Account<'info, Pool>>,

    /// Perps pool (will be updated)
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Market (will be updated)
    #[account(
        mut,
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), perps_market.market_id.as_ref()],
        bump = perps_market.bump,
    )]
    pub perps_market: Box<Account<'info, PerpsMarket>>,

    /// Pending operation
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = !pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationExpired,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
        constraint = pending_operation.all_inputs_verified() @ CloakCraftError::CommitmentNotVerified,
        constraint = pending_operation.all_expected_nullifiers_created() @ CloakCraftError::NullifierNotCreated,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Keeper
    #[account(
        constraint = keeper.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub keeper: Signer<'info>,

    /// Oracle
    /// CHECK: Validated by oracle integration
    pub oracle: AccountInfo<'info>,
}

pub fn execute_liquidate<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteLiquidate<'info>>,
    _operation_id: [u8; 32],
    position_margin: u64,
    position_size: u64,
    is_long: bool,
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;
    let perps_market = &mut ctx.accounts.perps_market;
    let pending_op = &ctx.accounts.pending_operation;

    msg!("=== Phase 3: Execute Liquidate ===");

    let current_price = pending_op.swap_amount;
    let liquidator_reward = pending_op.output_amount;
    let owner_remainder = pending_op.min_output;

    msg!("Liquidating position: margin={}, size={}, price={}",
        position_margin, position_size, current_price);

    // Verify liquidation reward is within bounds (liquidation penalty)
    let max_reward = (position_margin as u128)
        .checked_mul(perps_pool.liquidation_penalty_bps as u128)
        .unwrap_or(0)
        .checked_div(10000)
        .unwrap_or(0) as u64;

    require!(
        liquidator_reward <= max_reward.saturating_add(1), // +1 for rounding
        CloakCraftError::InvalidAmount
    );

    // Verify total outputs don't exceed margin
    require!(
        liquidator_reward.saturating_add(owner_remainder) <= position_margin,
        CloakCraftError::InvalidAmount
    );

    // Unlock tokens from pool
    let base_token_index = perps_market.base_token_index;
    let quote_token_index = perps_market.quote_token_index;
    let lock_amount = position_margin;

    if let Some(base_token) = perps_pool.get_token_mut(base_token_index) {
        base_token.locked = base_token.locked.saturating_sub(lock_amount);
    }
    if let Some(quote_token) = perps_pool.get_token_mut(quote_token_index) {
        quote_token.locked = quote_token.locked.saturating_sub(lock_amount);
    }

    // Update market open interest
    perps_market.remove_open_interest(position_size, is_long);

    msg!("✅ Position liquidated");
    msg!("Liquidator reward: {}, Owner remainder: {}", liquidator_reward, owner_remainder);
    msg!("Phase 3 complete");

    Ok(())
}
