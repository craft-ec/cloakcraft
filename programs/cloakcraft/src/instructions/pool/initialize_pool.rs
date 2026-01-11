//! Initialize a new shielded pool for a token

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::state::Pool;
use crate::constants::seeds;
use crate::events::PoolInitialized;

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
    pool.next_leaf_index = 0;
    pool.total_shielded = 0;

    // Initialize merkle root to empty tree root
    pool.merkle_root = compute_empty_root();

    emit!(PoolInitialized {
        pool: pool.key(),
        token_mint: pool.token_mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Compute empty merkle tree root
fn compute_empty_root() -> [u8; 32] {
    // For a tree of depth 16, start with empty leaf and hash up
    // This is a simplified version; real implementation uses Poseidon
    let mut current = [0u8; 32];
    for _ in 0..16 {
        let mut hasher = solana_keccak_hasher::Hasher::default();
        hasher.hash(&current);
        hasher.hash(&current);
        current = hasher.result().to_bytes();
    }
    current
}
