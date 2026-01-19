//! Trigger Bound Close
//!
//! Keeper instruction to close positions that have hit their profit bound.
//! In the bounded profit model, max profit = margin (100% gain).
//!
//! When a position reaches this bound:
//! - Keeper can trigger automatic close
//! - Position owner receives margin + margin (2x margin)
//! - Keeper receives a small fee for the service
//!
//! This is a single-phase instruction for detection, followed by the
//! standard close position multi-phase flow.

use anchor_lang::prelude::*;

use crate::state::{PerpsPool, PerpsMarket};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct CheckProfitBound<'info> {
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

    /// Oracle for current price
    /// CHECK: Validated by oracle integration
    pub oracle: AccountInfo<'info>,

    /// Keeper
    pub keeper: Signer<'info>,
}

/// Check if a position has hit its profit bound
///
/// This is a view-only instruction that returns whether a position
/// should be closed due to hitting the profit bound.
///
/// The actual close is performed through the standard close position flow
/// with the keeper providing proof of the position being at bound.
pub fn check_profit_bound(
    ctx: Context<CheckProfitBound>,
    position_margin: u64,
    position_size: u64,
    entry_price: u64,
    is_long: bool,
    current_price: u64,
) -> Result<bool> {
    let _perps_pool = &ctx.accounts.perps_pool;
    let _perps_market = &ctx.accounts.perps_market;

    msg!("=== Check Profit Bound ===");

    // Validate prices
    require!(entry_price > 0, CloakCraftError::InvalidOraclePrice);
    require!(current_price > 0, CloakCraftError::InvalidOraclePrice);

    // Calculate PnL
    let is_profit = if is_long {
        current_price > entry_price
    } else {
        current_price < entry_price
    };

    if !is_profit {
        msg!("Position is not in profit, not at bound");
        return Ok(false);
    }

    let price_diff = if is_long {
        current_price.saturating_sub(entry_price)
    } else {
        entry_price.saturating_sub(current_price)
    };

    let pnl = (price_diff as u128)
        .checked_mul(position_size as u128)
        .unwrap_or(0)
        .checked_div(entry_price as u128)
        .unwrap_or(0) as u64;

    // Check if PnL >= margin (profit bound)
    let at_bound = pnl >= position_margin;

    msg!(
        "Position: margin={}, size={}, entry={}, current={}, pnl={}, at_bound={}",
        position_margin, position_size, entry_price, current_price, pnl, at_bound
    );

    if at_bound {
        msg!("✅ Position is at profit bound, should be closed");
    }

    Ok(at_bound)
}

/// Event emitted when a position is at profit bound
/// Keepers can listen for this to initiate close position flow
#[event]
pub struct ProfitBoundReached {
    pub pool: Pubkey,
    pub market: Pubkey,
    pub position_commitment: [u8; 32],
    pub margin: u64,
    pub pnl: u64,
    pub current_price: u64,
}

/// Emit event when profit bound is detected
/// This helps keepers discover positions that need closing
#[derive(Accounts)]
pub struct EmitProfitBoundEvent<'info> {
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

    /// Keeper
    pub keeper: Signer<'info>,
}

pub fn emit_profit_bound_event(
    ctx: Context<EmitProfitBoundEvent>,
    position_commitment: [u8; 32],
    margin: u64,
    pnl: u64,
    current_price: u64,
) -> Result<()> {
    emit!(ProfitBoundReached {
        pool: ctx.accounts.perps_pool.key(),
        market: ctx.accounts.perps_market.key(),
        position_commitment,
        margin,
        pnl,
        current_price,
    });

    msg!("Profit bound event emitted for position");

    Ok(())
}
