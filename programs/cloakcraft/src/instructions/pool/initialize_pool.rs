//! Initialize a new shielded pool for a token
//!
//! Note: After initializing the pool, call initialize_commitment_counter
//! to enable Light Protocol commitment tracking.

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::Pool;
use crate::constants::seeds;

#[derive(Accounts)]
pub struct InitializePool<'info> {
    /// Pool account to initialize (boxed to reduce stack usage)
    #[account(
        init,
        payer = payer,
        space = Pool::LEN,
        seeds = [seeds::POOL, token_mint.key().as_ref()],
        bump
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Token vault PDA
    #[account(
        init,
        payer = payer,
        seeds = [seeds::VAULT, token_mint.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = pool,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// Token mint
    pub token_mint: Account<'info, Mint>,

    /// Pool authority
    pub authority: Signer<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,

    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    pool.token_mint = ctx.accounts.token_mint.key();
    pool.token_vault = ctx.accounts.token_vault.key();
    pool.authority = ctx.accounts.authority.key();
    pool.bump = ctx.bumps.pool;
    pool.vault_bump = ctx.bumps.token_vault;
    pool.total_shielded = 0;

    // Note: Merkle tree state is now managed by Light Protocol
    // Call initialize_commitment_counter after this to enable commitment tracking
    Ok(())
}
