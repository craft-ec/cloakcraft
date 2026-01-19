//! Add a trading market to a perpetual futures pool
//!
//! Creates a new trading pair (e.g., SOL/USD) within a perps pool.
//! Each market tracks its own open interest for longs and shorts.

use anchor_lang::prelude::*;

use crate::state::{PerpsPool, PerpsMarket};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
#[instruction(market_id: [u8; 32])]
pub struct AddMarket<'info> {
    /// Perps pool account (boxed due to large size)
    #[account(
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
        has_one = authority @ CloakCraftError::Unauthorized
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Market account
    #[account(
        init,
        payer = payer,
        space = 8 + PerpsMarket::INIT_SPACE,
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), market_id.as_ref()],
        bump
    )]
    pub perps_market: Account<'info, PerpsMarket>,

    /// Pool authority
    pub authority: Signer<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn add_market(
    ctx: Context<AddMarket>,
    market_id: [u8; 32],
    base_token_index: u8,
    quote_token_index: u8,
    max_position_size: u64,
) -> Result<()> {
    let perps_pool = &ctx.accounts.perps_pool;
    let perps_market = &mut ctx.accounts.perps_market;

    // Validate token indices
    require!(
        base_token_index < perps_pool.num_tokens,
        CloakCraftError::InvalidTokenIndex
    );
    require!(
        quote_token_index < perps_pool.num_tokens,
        CloakCraftError::InvalidTokenIndex
    );
    require!(
        base_token_index != quote_token_index,
        CloakCraftError::SameBaseQuoteToken
    );

    // Validate tokens are active
    require!(
        perps_pool.tokens[base_token_index as usize].is_active,
        CloakCraftError::TokenNotActive
    );
    require!(
        perps_pool.tokens[quote_token_index as usize].is_active,
        CloakCraftError::TokenNotActive
    );

    // Initialize market
    perps_market.market_id = market_id;
    perps_market.pool = perps_pool.key();
    perps_market.base_token_index = base_token_index;
    perps_market.quote_token_index = quote_token_index;
    perps_market.long_open_interest = 0;
    perps_market.short_open_interest = 0;
    perps_market.max_position_size = max_position_size;
    perps_market.is_active = true;
    perps_market.bump = ctx.bumps.perps_market;

    msg!(
        "Market added: market_id={:?}, base_index={}, quote_index={}, max_size={}",
        market_id,
        base_token_index,
        quote_token_index,
        max_position_size
    );

    Ok(())
}
