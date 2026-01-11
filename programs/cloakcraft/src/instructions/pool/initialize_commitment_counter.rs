//! Initialize commitment counter for a pool
//!
//! Must be called after initialize_pool to enable Light Protocol commitment tracking.

use anchor_lang::prelude::*;

use crate::state::{Pool, PoolCommitmentCounter};
use crate::constants::seeds;

#[derive(Accounts)]
pub struct InitializeCommitmentCounter<'info> {
    /// Pool to initialize counter for
    #[account(
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    /// Commitment counter PDA
    #[account(
        init,
        payer = payer,
        space = 8 + PoolCommitmentCounter::INIT_SPACE,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool.key().as_ref()],
        bump,
    )]
    pub commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// Payer for account creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn initialize_commitment_counter(ctx: Context<InitializeCommitmentCounter>) -> Result<()> {
    let commitment_counter = &mut ctx.accounts.commitment_counter;

    commitment_counter.pool = ctx.accounts.pool.key();
    commitment_counter.next_leaf_index = 0;
    commitment_counter.total_commitments = 0;
    commitment_counter.bump = ctx.bumps.commitment_counter;

    Ok(())
}
