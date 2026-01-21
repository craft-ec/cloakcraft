//! Execute Close Position - Phase 3 (Close Position)
//!
//! This is Phase 3 of the append pattern multi-phase operation for closing a perps position.
//! It executes the position closing logic by settling PnL, unlocking tokens, and updating market OI.
//!
//! SECURITY: Requires all previous phases completed:
//! - Phase 0: Proof verified
//! - Phase 1: Commitment verified
//! - Phase 2: Nullifier created
//!
//! Bounded Profit Model:
//! - Maximum profit = margin (100% gain)
//! - Loss can be up to full margin (liquidation handled separately)
//!
//! Flow:
//! Phase 0: Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists (position)
//! Phase 2: Create nullifier (close position)
//! Phase 3 (this): Execute close position (settle PnL, unlock tokens)
//! Phase 4: Create commitment (settlement)
//! Final: Close pending operation

use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::state::{Pool, PerpsPool, PerpsMarket, PendingOperation};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::pyth;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteClosePosition<'info> {
    /// Settlement token pool
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

/// Phase 3: Execute close position by settling PnL and unlocking tokens
pub fn execute_close_position<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteClosePosition<'info>>,
    _operation_id: [u8; 32],
    position_margin: u64,      // Original margin (from position data)
    position_size: u64,        // Original position size
    entry_price: u64,          // Original entry price
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;
    let perps_market = &mut ctx.accounts.perps_market;
    let pending_op = &ctx.accounts.pending_operation;
    let price_update = &ctx.accounts.price_update;
    let clock = Clock::get()?;

    msg!("=== Phase 3: Execute Close Position ===");

    // Get close parameters from Phase 0
    let pnl_amount = pending_op.swap_amount;
    let _exit_price_param = pending_op.output_amount; // Kept for backwards compatibility
    let close_fee = pending_op.min_output;
    let is_long = pending_op.swap_a_to_b;
    let is_profit = pending_op.extra_amount == 1;

    // Get base token's Pyth feed ID and validate price
    let base_token_index = perps_market.base_token_index;
    let base_token = perps_pool.get_token(base_token_index)
        .ok_or(CloakCraftError::TokenNotInPool)?;

    // Read and validate exit price from Pyth
    let exit_price = pyth::get_price(price_update, &base_token.pyth_feed_id, &clock)?;

    msg!("Closing {} position: margin={}, size={}, entry={}, exit={}",
        if is_long { "LONG" } else { "SHORT" },
        position_margin, position_size, entry_price, exit_price);

    // Price is already validated by pyth::get_price
    require!(exit_price > 0, CloakCraftError::InvalidOraclePrice);

    // Verify PnL calculation
    // For long: profit if exit_price > entry_price
    // For short: profit if exit_price < entry_price
    let expected_profit = if is_long {
        exit_price > entry_price
    } else {
        exit_price < entry_price
    };
    require!(expected_profit == is_profit, CloakCraftError::InvalidAmount);

    // Calculate expected PnL for verification
    let price_diff = if is_profit {
        if is_long {
            exit_price.saturating_sub(entry_price)
        } else {
            entry_price.saturating_sub(exit_price)
        }
    } else {
        if is_long {
            entry_price.saturating_sub(exit_price)
        } else {
            exit_price.saturating_sub(entry_price)
        }
    };

    let calculated_pnl = (price_diff as u128)
        .checked_mul(position_size as u128)
        .unwrap_or(0)
        .checked_div(entry_price as u128)
        .unwrap_or(0) as u64;

    // Allow small tolerance for rounding
    let pnl_tolerance = 1;
    require!(
        pnl_amount <= calculated_pnl.saturating_add(pnl_tolerance) &&
        pnl_amount >= calculated_pnl.saturating_sub(pnl_tolerance),
        CloakCraftError::InvalidAmount
    );

    // Bounded profit: cap at margin
    let capped_profit = if is_profit {
        pnl_amount.min(position_margin)
    } else {
        pnl_amount
    };

    // Calculate settlement amount
    let settlement_amount = if is_profit {
        position_margin
            .checked_add(capped_profit)
            .ok_or(CloakCraftError::AmountOverflow)?
            .checked_sub(close_fee)
            .ok_or(CloakCraftError::InsufficientBalance)?
    } else {
        position_margin
            .checked_sub(pnl_amount)
            .ok_or(CloakCraftError::InsufficientBalance)?
            .checked_sub(close_fee)
            .ok_or(CloakCraftError::InsufficientBalance)?
    };

    msg!("Settlement: margin={}, pnl={} ({}), fee={}, result={}",
        position_margin,
        capped_profit,
        if is_profit { "profit" } else { "loss" },
        close_fee,
        settlement_amount);

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

    msg!("✅ Position closed, settlement: {}", settlement_amount);
    msg!("Market OI - Long: {}, Short: {}",
        perps_market.long_open_interest,
        perps_market.short_open_interest);
    msg!("Phase 3 complete");
    msg!("Next: Phase 4 - create_commitment for settlement");

    Ok(())
}
