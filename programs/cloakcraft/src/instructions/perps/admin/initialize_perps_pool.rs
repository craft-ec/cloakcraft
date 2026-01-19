//! Initialize a perpetual futures liquidity pool
//!
//! Creates a multi-token pool with a single LP token representing share of total pool value.
//! Tokens are added separately via add_token_to_pool instruction.

use anchor_lang::prelude::*;
use anchor_lang::system_program::{create_account, CreateAccount};
use anchor_spl::token::{Token, InitializeMint};

use crate::state::PerpsPool;
use crate::constants::seeds;

#[derive(Accounts)]
#[instruction(pool_id: Pubkey)]
pub struct InitializePerpsPool<'info> {
    /// Perps pool account
    #[account(
        init,
        payer = payer,
        space = PerpsPool::LEN,
        seeds = [seeds::PERPS_POOL, pool_id.as_ref()],
        bump
    )]
    pub perps_pool: Account<'info, PerpsPool>,

    /// LP token mint (created as regular mint with perps_pool as authority)
    /// CHECK: This account is initialized as a mint via CPI and must be a signer
    #[account(mut, signer)]
    pub lp_mint: AccountInfo<'info>,

    /// Pool authority (admin)
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

/// Parameters for initializing a perps pool
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializePerpsPoolParams {
    /// Maximum leverage (1-100)
    pub max_leverage: u8,
    /// Position fee in basis points (e.g., 6 = 0.06%)
    pub position_fee_bps: u16,
    /// Maximum utilization per token in basis points (e.g., 8000 = 80%)
    pub max_utilization_bps: u16,
    /// Liquidation threshold in basis points (e.g., 50 = 0.5% margin remaining)
    pub liquidation_threshold_bps: u16,
    /// Liquidation penalty in basis points (e.g., 50 = 0.5%)
    pub liquidation_penalty_bps: u16,
    /// Base borrow rate per hour in basis points
    pub base_borrow_rate_bps: u16,
    /// Maximum imbalance fee in basis points (e.g., 3 = 0.03%)
    pub max_imbalance_fee_bps: u16,
}

impl Default for InitializePerpsPoolParams {
    fn default() -> Self {
        Self {
            max_leverage: 100,
            position_fee_bps: 6,
            max_utilization_bps: 8000,
            liquidation_threshold_bps: 50,
            liquidation_penalty_bps: 50,
            base_borrow_rate_bps: 1,
            max_imbalance_fee_bps: 3,
        }
    }
}

pub fn initialize_perps_pool(
    ctx: Context<InitializePerpsPool>,
    pool_id: Pubkey,
    params: InitializePerpsPoolParams,
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;

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

    // Set perps_pool as mint authority, no freeze authority
    // Using 6 decimals for LP token (matches USD value precision)
    anchor_spl::token::initialize_mint(cpi_ctx, 6, &perps_pool.key(), None)?;

    // Initialize pool state
    perps_pool.pool_id = pool_id;
    perps_pool.lp_mint = ctx.accounts.lp_mint.key();
    perps_pool.lp_supply = 0;
    perps_pool.authority = ctx.accounts.authority.key();
    perps_pool.num_tokens = 0;
    perps_pool.tokens = Default::default();

    // Configuration
    perps_pool.max_leverage = params.max_leverage;
    perps_pool.position_fee_bps = params.position_fee_bps;
    perps_pool.max_utilization_bps = params.max_utilization_bps;
    perps_pool.liquidation_threshold_bps = params.liquidation_threshold_bps;
    perps_pool.liquidation_penalty_bps = params.liquidation_penalty_bps;
    perps_pool.base_borrow_rate_bps = params.base_borrow_rate_bps;
    perps_pool.max_imbalance_fee_bps = params.max_imbalance_fee_bps;

    // State
    perps_pool.is_active = true;
    perps_pool.bump = ctx.bumps.perps_pool;
    perps_pool.lp_mint_bump = 0; // Not a PDA

    msg!(
        "Perps pool initialized: pool_id={}, max_leverage={}x, position_fee={}bps",
        pool_id,
        params.max_leverage,
        params.position_fee_bps
    );

    Ok(())
}
