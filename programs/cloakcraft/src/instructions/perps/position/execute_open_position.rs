//! Execute Open Position - Phase 3 (Open Position)
//!
//! This is Phase 3 of the append pattern multi-phase operation for opening a perps position.
//! It executes the position opening logic by locking tokens in the pool and updating market OI.
//!
//! SECURITY: Requires all previous phases completed:
//! - Phase 0: Proof verified
//! - Phase 1: Commitment verified
//! - Phase 2: Nullifier created
//!
//! Flow:
//! Phase 0: Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists (margin)
//! Phase 2: Create nullifier (spend margin)
//! Phase 3 (this): Execute open position (lock tokens, update market OI)
//! Phase 4: Create commitment (position)
//! Final: Close pending operation

use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::state::{Pool, PerpsPool, PerpsMarket, PendingOperation};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::pyth;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteOpenPosition<'info> {
    /// Margin token pool
    #[account(
        seeds = [seeds::POOL, margin_pool.token_mint.as_ref()],
        bump = margin_pool.bump,
    )]
    pub margin_pool: Box<Account<'info, Pool>>,

    /// Perps pool (will be updated)
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Market being traded (will be updated)
    #[account(
        mut,
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), perps_market.market_id.as_ref()],
        bump = perps_market.bump,
        constraint = perps_market.pool == perps_pool.key() @ CloakCraftError::PerpsMarketNotFound,
    )]
    pub perps_market: Box<Account<'info, PerpsMarket>>,

    /// Pending operation PDA (from Phase 0)
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

    /// Relayer (must match pending operation)
    #[account(
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    /// Pyth price update account for the base token
    pub price_update: Account<'info, PriceUpdateV2>,
}

/// Phase 3: Execute open position by locking tokens and updating market OI
pub fn execute_open_position<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteOpenPosition<'info>>,
    _operation_id: [u8; 32],
    _entry_price: u64,  // Kept for backwards compatibility, actual price read from Pyth
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;
    let perps_market = &mut ctx.accounts.perps_market;
    let pending_op = &ctx.accounts.pending_operation;
    let price_update = &ctx.accounts.price_update;
    let clock = Clock::get()?;

    msg!("=== Phase 3: Execute Open Position ===");

    // Get position parameters from Phase 0
    let margin_amount = pending_op.swap_amount;
    let leverage = pending_op.output_amount as u8;
    let position_fee = pending_op.min_output;
    let is_long = pending_op.swap_a_to_b;

    // Get base token's Pyth feed ID and validate price
    let base_token_index = perps_market.base_token_index;
    let base_token = perps_pool.get_token(base_token_index)
        .ok_or(CloakCraftError::TokenNotInPool)?;

    // Read and validate price from Pyth
    let entry_price = pyth::get_price(price_update, &base_token.pyth_feed_id, &clock)?;

    msg!("Opening {} position: margin={}, leverage={}x, entry_price={}",
        if is_long { "LONG" } else { "SHORT" },
        margin_amount, leverage, entry_price);

    // Price is already validated by pyth::get_price
    require!(entry_price > 0, CloakCraftError::InvalidOraclePrice);

    // Calculate position size (margin * leverage)
    // Note: Actual implementation should use proper decimal handling
    let position_size = (margin_amount as u128)
        .checked_mul(leverage as u128)
        .ok_or(CloakCraftError::AmountOverflow)? as u64;

    // Validate position size against market limits
    require!(
        perps_market.check_position_size(position_size),
        CloakCraftError::PositionSizeExceeded
    );

    // Calculate imbalance fee
    let imbalance_fee = perps_market.calculate_imbalance_fee(is_long, perps_pool.max_imbalance_fee_bps);
    let total_fee = position_fee.checked_add(
        (margin_amount as u128)
            .checked_mul(imbalance_fee as u128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0) as u64
    ).ok_or(CloakCraftError::AmountOverflow)?;

    msg!("Position size: {}, Total fee: {} (position: {}, imbalance: {} bps)",
        position_size, total_fee, position_fee, imbalance_fee);

    // Determine which tokens to lock based on position direction
    // LONG: Borrow quote (USD), swap to base (SOL) → lock quote + base
    // SHORT: Borrow base (SOL), swap to quote (USD) → lock base + quote
    let base_token_index = perps_market.base_token_index;
    let quote_token_index = perps_market.quote_token_index;

    // Calculate lock amounts based on position mechanics
    // For simplicity, we lock margin worth of both tokens
    let lock_amount = margin_amount;

    // Check utilization limits
    require!(
        perps_pool.can_open_position(
            base_token_index,
            quote_token_index,
            lock_amount,
            lock_amount
        ),
        CloakCraftError::UtilizationLimitExceeded
    );

    // Lock tokens in pool
    if let Some(base_token) = perps_pool.get_token_mut(base_token_index) {
        base_token.locked = base_token.locked
            .checked_add(lock_amount)
            .ok_or(CloakCraftError::AmountOverflow)?;
    }
    if let Some(quote_token) = perps_pool.get_token_mut(quote_token_index) {
        quote_token.locked = quote_token.locked
            .checked_add(lock_amount)
            .ok_or(CloakCraftError::AmountOverflow)?;
    }

    // Update market open interest
    perps_market.add_open_interest(position_size, is_long);

    msg!("✅ Position opened");
    msg!("Market OI - Long: {}, Short: {}",
        perps_market.long_open_interest,
        perps_market.short_open_interest);
    msg!("Phase 3 complete");
    msg!("Next: Phase 4 - create_commitment for position");

    Ok(())
}
