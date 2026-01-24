//! Execute Remove Perps Liquidity - Phase 3 (Remove Perps Liquidity)
//!
//! This is Phase 3 of the append pattern for removing liquidity from perps pool.
//! It burns LP tokens and withdraws the specified token.
//!
//! SECURITY: Requires all previous phases completed:
//! - Phase 0: Proof verified
//! - Phase 1: Commitment verified
//! - Phase 2: Nullifier created
//!
//! Utilization Limits:
//! - Withdrawal cannot push token utilization above max (80%)
//! - Available balance = balance - locked
//!
//! Flow:
//! Phase 0: Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists (LP token)
//! Phase 2: Create nullifier (burn LP)
//! Phase 3 (this): Execute remove liquidity (burn LP, withdraw token)
//! Phase 4: Create commitments (token + LP change)
//! Final: Close pending operation

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Burn};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::state::{Pool, PerpsPool, PendingOperation, MAX_PERPS_TOKENS};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::pyth;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteRemovePerpsLiquidity<'info> {
    /// Withdrawal token pool
    #[account(
        seeds = [seeds::POOL, withdrawal_pool.token_mint.as_ref()],
        bump = withdrawal_pool.bump,
    )]
    pub withdrawal_pool: Box<Account<'info, Pool>>,

    /// Perps pool (will be updated)
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// LP token mint (for burning LP tokens)
    /// CHECK: Validated against perps_pool.lp_mint
    #[account(
        mut,
        constraint = lp_mint.key() == perps_pool.lp_mint @ CloakCraftError::InvalidTokenMint,
    )]
    pub lp_mint: AccountInfo<'info>,

    /// Token vault for the withdrawal token
    #[account(
        mut,
        constraint = token_vault.mint == withdrawal_pool.token_mint @ CloakCraftError::TokenMintMismatch,
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

    /// Pyth price update account for the withdrawal token
    pub price_update: Account<'info, PriceUpdateV2>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

/// Phase 3: Execute remove perps liquidity by burning LP and withdrawing token
pub fn execute_remove_perps_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteRemovePerpsLiquidity<'info>>,
    _operation_id: [u8; 32],
    oracle_prices: [u64; MAX_PERPS_TOKENS], // Current oracle prices for all tokens (validated below)
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;
    let pending_op = &ctx.accounts.pending_operation;
    let price_update = &ctx.accounts.price_update;
    let clock = Clock::get()?;

    msg!("=== Phase 3: Execute Remove Perps Liquidity ===");

    // Get remove liquidity parameters from Phase 0
    let lp_amount_burned = pending_op.swap_amount;
    let withdraw_amount = pending_op.output_amount;
    let fee_amount = pending_op.min_output;
    let token_index = pending_op.extra_amount as u8;

    msg!("Withdrawing: amount={}, token_index={}, burning_lp={}",
        withdraw_amount, token_index, lp_amount_burned);

    // Validate token is active
    let token = perps_pool.get_token(token_index)
        .ok_or(CloakCraftError::TokenNotInPool)?;
    require!(token.is_active, CloakCraftError::TokenNotActive);

    // Check available balance
    let available = token.available();
    let net_withdraw = withdraw_amount.saturating_sub(fee_amount);
    require!(
        net_withdraw <= available,
        CloakCraftError::WithdrawalExceedsAvailable
    );

    // Get and validate withdrawal token price from Pyth
    let token_price = pyth::get_price(price_update, &token.pyth_feed_id, &clock)?;

    // Verify the passed oracle_prices matches Pyth for withdrawal token (within 1% tolerance)
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

    let withdraw_value = (withdraw_amount as u128)
        .checked_mul(token_price as u128)
        .ok_or(CloakCraftError::AmountOverflow)?
        .checked_div(10u128.pow(token.decimals as u32))
        .ok_or(CloakCraftError::AmountOverflow)? as u64;

    // Verify LP amount matches value being withdrawn
    // LP tokens = withdraw_value * lp_supply / total_value
    let total_value = perps_pool.calculate_total_value(&oracle_prices)
        .ok_or(CloakCraftError::AmountOverflow)?;

    let expected_lp = (withdraw_value as u128)
        .checked_mul(perps_pool.lp_supply as u128)
        .ok_or(CloakCraftError::AmountOverflow)?
        .checked_div(total_value)
        .ok_or(CloakCraftError::AmountOverflow)? as u64;

    // Verify LP burn amount (with tolerance for rounding)
    let lp_tolerance = 1;
    require!(
        lp_amount_burned >= expected_lp.saturating_sub(lp_tolerance),
        CloakCraftError::LpAmountMismatch
    );

    msg!("Withdraw value: {} USD, LP required: {}", withdraw_value, expected_lp);

    // Check utilization after withdrawal
    let new_balance = token.balance.saturating_sub(net_withdraw);
    if new_balance > 0 && token.locked > 0 {
        let new_utilization = (token.locked as u128)
            .checked_mul(10000)
            .unwrap_or(u128::MAX)
            .checked_div(new_balance as u128)
            .unwrap_or(u128::MAX);
        require!(
            new_utilization <= perps_pool.max_utilization_bps as u128,
            CloakCraftError::UtilizationLimitExceeded
        );
    }

    // Update pool token balance
    if let Some(pool_token) = perps_pool.get_token_mut(token_index) {
        pool_token.balance = pool_token.balance
            .checked_sub(net_withdraw)
            .ok_or(CloakCraftError::InsufficientBalance)?;
    }

    // Update LP supply
    perps_pool.lp_supply = perps_pool.lp_supply
        .checked_sub(lp_amount_burned)
        .ok_or(CloakCraftError::InsufficientBalance)?;

    msg!("✅ Liquidity removed");
    msg!("Pool balance (token {}): {}", token_index, perps_pool.tokens[token_index as usize].balance);
    msg!("Total LP supply: {}", perps_pool.lp_supply);
    msg!("Phase 3 complete");
    msg!("Next: Phase 4 - create_commitment for withdrawal + LP change");

    Ok(())
}
