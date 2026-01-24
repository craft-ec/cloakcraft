//! Initialize a perpetual futures liquidity pool
//!
//! Creates a multi-token pool with a single LP token representing share of total pool value.
//! Tokens are added separately via add_token_to_pool instruction.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_spl::token::Token;

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

    /// LP token mint (PDA derived from perps pool)
    /// CHECK: This account is initialized as a mint via CPI
    #[account(
        mut,
        seeds = [seeds::PERPS_LP_MINT, perps_pool.key().as_ref()],
        bump
    )]
    pub lp_mint: AccountInfo<'info>,

    /// Position token mint (PDA derived from perps pool, for position commitments)
    /// CHECK: This account is initialized as a mint via CPI
    #[account(
        mut,
        seeds = [seeds::PERPS_POSITION_MINT, perps_pool.key().as_ref()],
        bump
    )]
    pub position_mint: AccountInfo<'info>,

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
    let lp_mint_bump = ctx.bumps.lp_mint;
    let position_mint_bump = ctx.bumps.position_mint;
    let perps_pool_key = perps_pool.key();

    // Create LP mint account as PDA using invoke_signed
    let rent = Rent::get()?;
    let space = 82; // Mint account size
    let lamports = rent.minimum_balance(space);

    // LP mint PDA seeds: [PERPS_LP_MINT, perps_pool.key()]
    let lp_bump_bytes = [lp_mint_bump];
    let lp_mint_seeds: &[&[u8]] = &[
        seeds::PERPS_LP_MINT,
        perps_pool_key.as_ref(),
        &lp_bump_bytes,
    ];

    invoke_signed(
        &anchor_lang::solana_program::system_instruction::create_account(
            ctx.accounts.payer.key,
            ctx.accounts.lp_mint.key,
            lamports,
            space as u64,
            &ctx.accounts.token_program.key(),
        ),
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.lp_mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[lp_mint_seeds],
    )?;

    // Initialize the LP mint via CPI with PDA signer
    let lp_cpi_accounts = anchor_spl::token::InitializeMint {
        mint: ctx.accounts.lp_mint.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let lp_signer_seeds: &[&[&[u8]]] = &[lp_mint_seeds];
    let lp_cpi_ctx = CpiContext::new_with_signer(cpi_program.clone(), lp_cpi_accounts, lp_signer_seeds);

    // Set perps_pool as mint authority, no freeze authority
    // Using 6 decimals for LP token (matches USD value precision)
    anchor_spl::token::initialize_mint(lp_cpi_ctx, 6, &perps_pool_key, None)?;

    // Create Position mint account as PDA using invoke_signed
    let pos_bump_bytes = [position_mint_bump];
    let position_mint_seeds: &[&[u8]] = &[
        seeds::PERPS_POSITION_MINT,
        perps_pool_key.as_ref(),
        &pos_bump_bytes,
    ];

    invoke_signed(
        &anchor_lang::solana_program::system_instruction::create_account(
            ctx.accounts.payer.key,
            ctx.accounts.position_mint.key,
            lamports,
            space as u64,
            &ctx.accounts.token_program.key(),
        ),
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.position_mint.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
        &[position_mint_seeds],
    )?;

    // Initialize the Position mint via CPI with PDA signer
    let pos_cpi_accounts = anchor_spl::token::InitializeMint {
        mint: ctx.accounts.position_mint.to_account_info(),
        rent: ctx.accounts.rent.to_account_info(),
    };
    let pos_signer_seeds: &[&[&[u8]]] = &[position_mint_seeds];
    let pos_cpi_ctx = CpiContext::new_with_signer(cpi_program, pos_cpi_accounts, pos_signer_seeds);

    // Position mint also uses 6 decimals
    anchor_spl::token::initialize_mint(pos_cpi_ctx, 6, &perps_pool_key, None)?;

    // Initialize pool state
    perps_pool.pool_id = pool_id;
    perps_pool.lp_mint = ctx.accounts.lp_mint.key();
    perps_pool.position_mint = ctx.accounts.position_mint.key();
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
    perps_pool.lp_mint_bump = lp_mint_bump;
    perps_pool.position_mint_bump = position_mint_bump;

    msg!(
        "Perps pool initialized: pool_id={}, lp_mint={}, position_mint={}, max_leverage={}x",
        pool_id,
        ctx.accounts.lp_mint.key(),
        ctx.accounts.position_mint.key(),
        params.max_leverage
    );

    Ok(())
}
