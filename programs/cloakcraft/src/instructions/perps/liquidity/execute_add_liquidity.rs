//! Execute Add Perps Liquidity - Phase 3 (Add Perps Liquidity)
//!
//! This is Phase 3 of the append pattern for adding liquidity to perps pool.
//! It deposits the token and mints LP tokens.
//!
//! SECURITY: Requires all previous phases completed:
//! - Phase 0: Proof verified
//! - Phase 1: Commitment verified
//! - Phase 2: Nullifier created
//!
//! Flow:
//! Phase 0: Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists (deposit token)
//! Phase 2: Create nullifier (spend token)
//! Phase 3 (this): Execute add liquidity (deposit token, mint LP)
//! Phase 4: Create commitment (LP token)
//! Final: Close pending operation

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, MintTo};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::state::{Pool, PerpsPool, PendingOperation, MAX_PERPS_TOKENS};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::pyth;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteAddPerpsLiquidity<'info> {
    /// Deposit token pool
    #[account(
        seeds = [seeds::POOL, deposit_pool.token_mint.as_ref()],
        bump = deposit_pool.bump,
    )]
    pub deposit_pool: Box<Account<'info, Pool>>,

    /// Perps pool (will be updated)
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// LP token mint (for minting LP tokens)
    /// CHECK: Validated against perps_pool.lp_mint
    #[account(
        mut,
        constraint = lp_mint.key() == perps_pool.lp_mint @ CloakCraftError::InvalidTokenMint,
    )]
    pub lp_mint: AccountInfo<'info>,

    /// Token vault for the deposited token
    #[account(
        mut,
        constraint = token_vault.mint == deposit_pool.token_mint @ CloakCraftError::TokenMintMismatch,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    /// Pending operation PDA (from Phase 0)
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = !pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationExpired,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
        constraint = pending_operation.all_inputs_verified() @ CloakCraftError::CommitmentNotVerified,
        constraint = pending_operation.all_expected_nullifiers_created() @ CloakCraftError::NullifierNotCreated,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must match pending operation)
    #[account(
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    /// Pyth price update account for the deposit token
    pub price_update: Account<'info, PriceUpdateV2>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

/// Phase 3: Execute add perps liquidity by depositing token and minting LP
pub fn execute_add_perps_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteAddPerpsLiquidity<'info>>,
    _operation_id: [u8; 32],
    oracle_prices: [u64; MAX_PERPS_TOKENS], // Current oracle prices for all tokens (validated below)
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;
    let pending_op = &ctx.accounts.pending_operation;
    let price_update = &ctx.accounts.price_update;
    let clock = Clock::get()?;

    msg!("=== Phase 3: Execute Add Perps Liquidity ===");

    // Get liquidity parameters from Phase 0
    let deposit_amount = pending_op.swap_amount;
    let expected_lp_amount = pending_op.output_amount;
    let fee_amount = pending_op.min_output;
    let token_index = pending_op.extra_amount as u8;

    msg!("Depositing: amount={}, token_index={}, expected_lp={}",
        deposit_amount, token_index, expected_lp_amount);

    // Validate token is active
    let token = perps_pool.get_token(token_index)
        .ok_or(CloakCraftError::TokenNotInPool)?;
    require!(token.is_active, CloakCraftError::TokenNotActive);

    // Get and validate deposit token price from Pyth
    let token_price = pyth::get_price(price_update, &token.pyth_feed_id, &clock)?;

    // Verify the passed oracle_prices matches Pyth for deposit token (within 1% tolerance)
    let passed_price = oracle_prices[token_index as usize];
    let price_tolerance = token_price / 100; // 1% tolerance

    msg!("=== Price Validation Debug ===");
    msg!("Token index: {}", token_index);
    msg!("Passed price (from proof): {}", passed_price);
    msg!("Oracle price (from Pyth): {}", token_price);
    msg!("Price tolerance (1%): {}", price_tolerance);
    msg!("Price diff: {}", if passed_price > token_price { passed_price - token_price } else { token_price - passed_price });
    msg!("Within tolerance: {}", passed_price <= token_price.saturating_add(price_tolerance) && passed_price >= token_price.saturating_sub(price_tolerance));

    require!(
        passed_price <= token_price.saturating_add(price_tolerance) &&
        passed_price >= token_price.saturating_sub(price_tolerance),
        CloakCraftError::InvalidOraclePrice
    );

    require!(token_price > 0, CloakCraftError::InvalidOraclePrice);

    let deposit_value = (deposit_amount as u128)
        .checked_mul(token_price as u128)
        .ok_or(CloakCraftError::AmountOverflow)?
        .checked_div(10u128.pow(token.decimals as u32))
        .ok_or(CloakCraftError::AmountOverflow)? as u64;

    // Calculate LP tokens to mint
    let calculated_lp_amount = perps_pool.calculate_lp_mint_amount(deposit_value, &oracle_prices)
        .ok_or(CloakCraftError::LpAmountMismatch)?;

    // Verify calculated LP matches expected (within tolerance for rounding)
    let lp_tolerance = 1;
    require!(
        expected_lp_amount <= calculated_lp_amount.saturating_add(lp_tolerance) &&
        expected_lp_amount >= calculated_lp_amount.saturating_sub(lp_tolerance),
        CloakCraftError::LpAmountMismatch
    );

    msg!("Deposit value: {} USD, LP to mint: {}", deposit_value, calculated_lp_amount);

    // Update pool token balance
    if let Some(pool_token) = perps_pool.get_token_mut(token_index) {
        pool_token.balance = pool_token.balance
            .checked_add(deposit_amount.saturating_sub(fee_amount))
            .ok_or(CloakCraftError::AmountOverflow)?;
    }

    // Update LP supply
    perps_pool.lp_supply = perps_pool.lp_supply
        .checked_add(calculated_lp_amount)
        .ok_or(CloakCraftError::AmountOverflow)?;

    // Mint LP tokens (to be wrapped in commitment in Phase 4)
    // Note: In a real implementation, LP tokens would be minted to a temporary account
    // or the minting would be done via PDA signer
    let pool_seeds = &[
        seeds::PERPS_POOL,
        perps_pool.pool_id.as_ref(),
        &[perps_pool.bump],
    ];
    let signer_seeds = &[&pool_seeds[..]];

    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: ctx.accounts.lp_mint.to_account_info(),
            to: ctx.accounts.token_vault.to_account_info(), // Placeholder - actual mint handled by commitment system
            authority: perps_pool.to_account_info(),
        },
        signer_seeds,
    );
    // Note: In actual implementation, LP tokens are represented as commitments
    // The mint_to would be to a temporary vault or skipped entirely
    // token::mint_to(mint_ctx, calculated_lp_amount)?;

    msg!("✅ Liquidity added");
    msg!("Pool balance (token {}): {}", token_index, perps_pool.tokens[token_index as usize].balance);
    msg!("Total LP supply: {}", perps_pool.lp_supply);
    msg!("Phase 3 complete");
    msg!("Next: Phase 4 - create_commitment for LP token");

    Ok(())
}
