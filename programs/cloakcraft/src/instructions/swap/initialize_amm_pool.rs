//! Initialize an internal AMM pool
//!
//! Supports two pool types:
//! - ConstantProduct (default): x * y = k formula, best for volatile pairs
//! - StableSwap: Curve-style formula, best for pegged assets (stablecoins)

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

use crate::state::{AmmPool, PoolType};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

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
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// LP token mint (PDA derived from token pair)
    /// Using Anchor's init macro ensures simulation works correctly
    #[account(
        init,
        payer = payer,
        seeds = [seeds::LP_MINT, token_a_mint.as_ref(), token_b_mint.as_ref()],
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
}

pub fn initialize_amm_pool(
    ctx: Context<InitializeAmmPool>,
    token_a_mint: Pubkey,
    token_b_mint: Pubkey,
    fee_bps: u16,
    pool_type: PoolType,
    amplification: u64,
) -> Result<()> {
    // Enforce canonical ordering: token_a must be < token_b by bytes
    // This ensures USDC-SOL and SOL-USDC always create the same pool
    let (canonical_a, canonical_b) = AmmPool::canonical_order(token_a_mint, token_b_mint);
    require!(
        token_a_mint == canonical_a && token_b_mint == canonical_b,
        CloakCraftError::TokensNotInCanonicalOrder
    );

    // Validate amplification coefficient for StableSwap pools
    if pool_type == PoolType::StableSwap {
        // Amplification must be between 1 and 10000 (typical: 100-1000)
        require!(
            amplification >= 1 && amplification <= 10000,
            CloakCraftError::InvalidAmplification
        );
    }

    let amm_pool = &mut ctx.accounts.amm_pool;

    // LP mint is now initialized by Anchor via the init macro
    // No manual invoke_signed needed - this ensures simulation works correctly

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
    amm_pool.pool_type = pool_type;
    amm_pool.amplification = if pool_type == PoolType::StableSwap {
        amplification
    } else {
        0 // Not used for ConstantProduct pools
    };

    // Initialize state hash
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("AMM pool initialized: type={:?}, amplification={}, lp_mint={}",
        pool_type,
        amm_pool.amplification,
        ctx.accounts.lp_mint.key()
    );

    Ok(())
}
