//! Reset AMM pool state (admin only)
//!
//! Used to fix corrupted pool state from buggy remove_liquidity

use anchor_lang::prelude::*;

use crate::state::AmmPool;
use crate::constants::seeds;

#[derive(Accounts)]
pub struct ResetAmmPool<'info> {
    /// AMM pool to reset
    #[account(
        mut,
        seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
        has_one = authority
    )]
    pub amm_pool: Account<'info, AmmPool>,

    /// Pool authority (must match)
    pub authority: Signer<'info>,
}

pub fn reset_amm_pool(ctx: Context<ResetAmmPool>) -> Result<()> {
    let amm_pool = &mut ctx.accounts.amm_pool;

    // Reset to initial state
    amm_pool.reserve_a = 0;
    amm_pool.reserve_b = 0;
    amm_pool.lp_supply = 0;
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("AMM pool reset to initial state");
    msg!("Reserve A: {}", amm_pool.reserve_a);
    msg!("Reserve B: {}", amm_pool.reserve_b);
    msg!("LP Supply: {}", amm_pool.lp_supply);

    Ok(())
}
