//! Update Borrow Fees
//!
//! Keeper instruction to update cumulative borrow fee accumulators for each token.
//! Borrow fees are charged based on:
//! - Time elapsed since last update
//! - Token utilization (higher utilization = higher rate)
//!
//! This is a single-phase instruction (no ZK proof needed).

use anchor_lang::prelude::*;

use crate::state::PerpsPool;
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct UpdateBorrowFees<'info> {
    /// Perps pool (will be updated)
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Keeper (anyone can call this)
    pub keeper: Signer<'info>,
}

/// Update borrow fee accumulators for all tokens in the pool
pub fn update_borrow_fees(ctx: Context<UpdateBorrowFees>) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    msg!("=== Update Borrow Fees ===");

    for i in 0..perps_pool.num_tokens as usize {
        if !perps_pool.tokens[i].is_active {
            continue;
        }

        let token = &perps_pool.tokens[i];
        let last_update = token.last_fee_update;

        // Calculate time elapsed in hours (scaled by 1e6 for precision)
        let elapsed_seconds = current_time.saturating_sub(last_update);
        if elapsed_seconds <= 0 {
            continue;
        }

        // Calculate borrow rate based on utilization
        let borrow_rate_bps = perps_pool.calculate_borrow_rate(i as u8)
            .unwrap_or(perps_pool.base_borrow_rate_bps);

        // Fee per hour in basis points, convert to per-second
        // cumulative_fee += rate_bps * elapsed_seconds / 3600 / 10000
        // Scaled by 1e18 for precision
        let fee_increment = (borrow_rate_bps as u128)
            .checked_mul(elapsed_seconds as u128)
            .unwrap_or(0)
            .checked_mul(1_000_000_000_000_000_000u128) // 1e18
            .unwrap_or(0)
            .checked_div(3600) // per hour to per second
            .unwrap_or(0)
            .checked_div(10000) // basis points to ratio
            .unwrap_or(0);

        // Update token
        let token_mut = &mut perps_pool.tokens[i];
        token_mut.cumulative_borrow_fee = token_mut.cumulative_borrow_fee
            .checked_add(fee_increment)
            .unwrap_or(token_mut.cumulative_borrow_fee);
        token_mut.last_fee_update = current_time;

        msg!(
            "Token {}: rate={}bps, elapsed={}s, fee_increment={}",
            i, borrow_rate_bps, elapsed_seconds, fee_increment
        );
    }

    msg!("✅ Borrow fees updated");

    Ok(())
}
