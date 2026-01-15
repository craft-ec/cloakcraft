//! Execute Add Liquidity - Phase 3 (Add Liquidity-specific)
//!
//! This is Phase 3 of the append pattern multi-phase operation for add liquidity.
//! It executes the add liquidity logic by updating AMM pool reserves and LP supply.
//!
//! Flow:
//! Phase 0: Verify ZK proof + Create PendingOperation
//! Phase 1a: Verify deposit A commitment exists
//! Phase 1b: Verify deposit B commitment exists
//! Phase 2a: Create nullifier A (deposit A now spent)
//! Phase 2b: Create nullifier B (deposit B now spent)
//! Phase 3 (this): Execute add liquidity logic
//! Phase 4+: Create commitments (LP, change A, change B)
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, AmmPool, PendingOperation};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::amm_math::{calculate_initial_lp, calculate_proportional_lp, validate_lp_amount};

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteAddLiquidity<'info> {
    /// Token A pool (for reference)
    #[account(
        seeds = [seeds::POOL, pool_a.token_mint.as_ref()],
        bump = pool_a.bump,
    )]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Token B pool (for reference)
    #[account(
        seeds = [seeds::POOL, pool_b.token_mint.as_ref()],
        bump = pool_b.bump,
    )]
    pub pool_b: Box<Account<'info, Pool>>,

    /// LP token pool (for reference)
    #[account(
        seeds = [seeds::POOL, lp_pool.token_mint.as_ref()],
        bump = lp_pool.bump,
    )]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// AMM pool state (will be updated)
    #[account(
        mut,
        seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

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
}

/// Phase 3: Execute add liquidity by updating AMM pool state
pub fn execute_add_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteAddLiquidity<'info>>,
    _operation_id: [u8; 32],
    min_lp_amount: u64,
) -> Result<()> {
    let amm_pool = &mut ctx.accounts.amm_pool;
    let pending_op = &ctx.accounts.pending_operation;

    msg!("=== Phase 3: Execute Add Liquidity ===");

    // Get parameters from Phase 0
    let deposit_a = pending_op.swap_amount;
    let deposit_b = pending_op.output_amount;
    let lp_amount = pending_op.extra_amount;

    msg!("Deposit A: {}, Deposit B: {}, LP amount: {}",
        deposit_a, deposit_b, lp_amount);

    // CRITICAL SECURITY CHECK: Validate LP amount calculation
    // This prevents attackers from minting arbitrary LP tokens
    let calculated_lp = if amm_pool.lp_supply == 0 {
        msg!("Initial liquidity provision");
        calculate_initial_lp(deposit_a, deposit_b)?
    } else {
        msg!("Proportional liquidity provision");
        calculate_proportional_lp(
            deposit_a,
            deposit_b,
            amm_pool.reserve_a,
            amm_pool.reserve_b,
            amm_pool.lp_supply,
        )?
    };

    msg!("Calculated LP: {}, Claimed LP: {}, Min LP: {}",
        calculated_lp, lp_amount, min_lp_amount);

    // Validate LP amount and check slippage
    validate_lp_amount(lp_amount, calculated_lp, min_lp_amount)?;
    msg!("✅ LP amount validated");

    // Update AMM reserves
    let new_reserve_a = amm_pool.reserve_a
        .checked_add(deposit_a)
        .ok_or(CloakCraftError::AmountOverflow)?;
    let new_reserve_b = amm_pool.reserve_b
        .checked_add(deposit_b)
        .ok_or(CloakCraftError::AmountOverflow)?;
    let new_lp_supply = amm_pool.lp_supply
        .checked_add(lp_amount)
        .ok_or(CloakCraftError::AmountOverflow)?;

    // Apply state changes
    amm_pool.reserve_a = new_reserve_a;
    amm_pool.reserve_b = new_reserve_b;
    amm_pool.lp_supply = new_lp_supply;
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("✅ Add liquidity executed");
    msg!("New reserves: A={}, B={}, LP supply={}", new_reserve_a, new_reserve_b, new_lp_supply);
    msg!("Phase 3 complete");
    msg!("Next: Phase 4+ - create_commitment for LP, change A, change B");

    Ok(())
}
