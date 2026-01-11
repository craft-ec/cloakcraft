//! Initialize an internal AMM pool

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::state::AmmPool;
use crate::constants::seeds;
use crate::events::AmmPoolInitialized;

#[derive(Accounts)]
#[instruction(token_a_mint: Pubkey, token_b_mint: Pubkey)]
pub struct InitializeAmmPool<'info> {
    /// AMM pool account
    #[account(
        init,
        payer = payer,
        space = AmmPool::LEN,
        seeds = [seeds::AMM_POOL, token_a_mint.as_ref(), token_b_mint.as_ref()],
        bump
    )]
    pub amm_pool: Account<'info, AmmPool>,

    /// LP token mint (created by pool)
    #[account(
        init,
        payer = payer,
        seeds = [seeds::LP_MINT, amm_pool.key().as_ref()],
        bump,
        mint::decimals = 9,
        mint::authority = amm_pool,
    )]
    pub lp_mint: Account<'info, Mint>,

    /// Token A mint
    pub token_a_mint_account: Account<'info, Mint>,

    /// Token B mint
    pub token_b_mint_account: Account<'info, Mint>,

    /// Authority
    pub authority: Signer<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program
    pub token_program: Program<'info, Token>,

    /// Rent
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_amm_pool(
    ctx: Context<InitializeAmmPool>,
    token_a_mint: Pubkey,
    token_b_mint: Pubkey,
    fee_bps: u16,
) -> Result<()> {
    let amm_pool = &mut ctx.accounts.amm_pool;
    let clock = Clock::get()?;

    amm_pool.pool_id = amm_pool.key();
    amm_pool.token_a_mint = token_a_mint;
    amm_pool.token_b_mint = token_b_mint;
    amm_pool.lp_mint = ctx.accounts.lp_mint.key();
    amm_pool.reserve_a = 0;
    amm_pool.reserve_b = 0;
    amm_pool.lp_supply = 0;
    amm_pool.fee_bps = fee_bps;
    amm_pool.authority = ctx.accounts.authority.key();
    amm_pool.is_active = true;
    amm_pool.bump = ctx.bumps.amm_pool;
    amm_pool.lp_mint_bump = ctx.bumps.lp_mint;

    // Initialize state hash
    amm_pool.state_hash = amm_pool.compute_state_hash();

    emit!(AmmPoolInitialized {
        pool_id: amm_pool.pool_id,
        token_a_mint,
        token_b_mint,
        lp_mint: ctx.accounts.lp_mint.key(),
        fee_bps,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
