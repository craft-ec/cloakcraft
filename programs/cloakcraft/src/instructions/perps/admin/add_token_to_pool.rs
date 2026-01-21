//! Add a token to a perpetual futures pool
//!
//! Adds a new supported token to the multi-token pool.
//! Each token has its own vault and Pyth price feed for oracle pricing.

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;

use crate::state::{PerpsPool, PerpsToken, MAX_PERPS_TOKENS};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct AddTokenToPool<'info> {
    /// Perps pool account (boxed due to large size)
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
        has_one = authority @ CloakCraftError::Unauthorized
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Token mint to add
    pub token_mint: Account<'info, Mint>,

    /// Token vault for the pool (ATA owned by pool)
    #[account(
        init,
        payer = payer,
        associated_token::mint = token_mint,
        associated_token::authority = perps_pool
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// Pool authority
    pub authority: Signer<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,

    /// Associated token program
    pub associated_token_program: Program<'info, AssociatedToken>,
}

/// Add a token to the perps pool with its Pyth price feed ID
///
/// # Arguments
/// * `pyth_feed_id` - The 32-byte Pyth price feed ID for this token (e.g., SOL/USD feed)
pub fn add_token_to_pool(ctx: Context<AddTokenToPool>, pyth_feed_id: [u8; 32]) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;
    let token_mint = &ctx.accounts.token_mint;

    // Check if pool has capacity for more tokens
    require!(
        (perps_pool.num_tokens as usize) < MAX_PERPS_TOKENS,
        CloakCraftError::MaxTokensReached
    );

    // Check if token already exists in pool
    for i in 0..perps_pool.num_tokens as usize {
        require!(
            perps_pool.tokens[i].mint != token_mint.key(),
            CloakCraftError::TokenAlreadyInPool
        );
    }

    // Add token to pool
    let token_index = perps_pool.num_tokens as usize;
    let clock = Clock::get()?;

    perps_pool.tokens[token_index] = PerpsToken {
        mint: token_mint.key(),
        vault: ctx.accounts.token_vault.key(),
        pyth_feed_id,
        balance: 0,
        locked: 0,
        cumulative_borrow_fee: 0,
        last_fee_update: clock.unix_timestamp,
        decimals: token_mint.decimals,
        is_active: true,
        vault_bump: 0, // ATA, not a custom PDA
        _reserved: [0; 5],
    };

    perps_pool.num_tokens += 1;

    msg!(
        "Token added to perps pool: mint={}, index={}, decimals={}",
        token_mint.key(),
        token_index,
        token_mint.decimals
    );

    Ok(())
}
