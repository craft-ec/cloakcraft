//! Initialize an internal AMM pool
//!
//! Supports two pool types:
//! - ConstantProduct (default): x * y = k formula, best for volatile pairs
//! - StableSwap: Curve-style formula, best for pegged assets (stablecoins)

use anchor_lang::prelude::*;
use anchor_lang::system_program::{create_account, CreateAccount};
use anchor_spl::token::{Mint, Token, InitializeMint};

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
    pub amm_pool: Account<'info, AmmPool>,

    /// LP token mint (created as regular mint with amm_pool as authority)
    /// CHECK: This account is initialized as a mint via CPI and must be a signer
    #[account(mut, signer)]
    pub lp_mint: AccountInfo<'info>,

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
    let _clock = Clock::get()?;

    // Create LP mint account
    let rent = Rent::get()?;
    let space = 82; // Mint account size
    let lamports = rent.minimum_balance(space);

    create_account(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            CreateAccount {
                from: ctx.accounts.payer.to_account_info(),
                to: ctx.accounts.lp_mint.to_account_info(),
            },
        ),
        lamports,
        space as u64,
        &ctx.accounts.token_program.key(),
    )?;

    // Initialize the LP mint via CPI
    let cpi_accounts = anchor_spl::token::InitializeMint {
        mint: ctx.accounts.lp_mint.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    // Set amm_pool as mint authority, no freeze authority
    anchor_spl::token::initialize_mint(cpi_ctx, 9, &amm_pool.key(), None)?;

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
    amm_pool.lp_mint_bump = 0; // No longer a PDA, set to 0
    amm_pool.pool_type = pool_type;
    amm_pool.amplification = if pool_type == PoolType::StableSwap {
        amplification
    } else {
        0 // Not used for ConstantProduct pools
    };

    // Initialize state hash
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("AMM pool initialized: type={:?}, amplification={}",
        pool_type,
        amm_pool.amplification
    );

    Ok(())
}
