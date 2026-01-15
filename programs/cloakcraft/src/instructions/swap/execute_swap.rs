//! Execute Swap - Phase 3 (Swap-specific)
//!
//! This is Phase 3 of the append pattern multi-phase operation for swap.
//! It executes the swap logic by updating AMM pool reserves.
//!
//! SECURITY: Requires all previous phases completed:
//! - Phase 0: Proof verified
//! - Phase 1: Commitment verified
//! - Phase 2: Nullifier created
//!
//! Flow:
//! Phase 0: Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists
//! Phase 2: Create nullifier (CRITICAL POINT - commitment now spent)
//! Phase 3 (this): Execute swap logic
//! Phase 4+: Create commitments
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, AmmPool, PendingOperation};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteSwap<'info> {
    /// Input token pool (for reference)
    #[account(
        seeds = [seeds::POOL, input_pool.token_mint.as_ref()],
        bump = input_pool.bump,
    )]
    pub input_pool: Box<Account<'info, Pool>>,

    /// Output token pool (for reference)
    #[account(
        seeds = [seeds::POOL, output_pool.token_mint.as_ref()],
        bump = output_pool.bump,
    )]
    pub output_pool: Box<Account<'info, Pool>>,

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

/// Phase 3: Execute swap by updating AMM pool reserves
///
/// SECURITY: This phase can only execute after:
/// - Phase 0: ZK proof verified
/// - Phase 1: Commitment existence verified
/// - Phase 2: Nullifier created (commitment now spent)
///
/// This phase:
/// 1. Updates AMM pool reserves based on swap direction
/// 2. Applies constant product formula: k = reserve_a * reserve_b
/// 3. Updates state hash
///
/// NO Light Protocol CPI calls (those were in Phases 1 & 2)
pub fn execute_swap<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteSwap<'info>>,
    _operation_id: [u8; 32],
) -> Result<()> {
    let amm_pool = &mut ctx.accounts.amm_pool;
    let pending_op = &ctx.accounts.pending_operation;

    msg!("=== Phase 3: Execute Swap ===");

    // Get swap parameters from Phase 0
    let swap_amount = pending_op.swap_amount;
    let output_amount = pending_op.output_amount;
    let swap_a_to_b = pending_op.swap_a_to_b;

    msg!("Swap direction: {}, amount: {}, output: {}",
        if swap_a_to_b { "A->B" } else { "B->A" }, swap_amount, output_amount);

    // Update AMM pool reserves based on swap direction
    // Apply constant product formula: k = reserve_a * reserve_b
    if swap_a_to_b {
        // Swapping A for B: increase reserve_a, decrease reserve_b
        amm_pool.reserve_a = amm_pool.reserve_a
            .checked_add(swap_amount)
            .ok_or(CloakCraftError::AmountOverflow)?;
        amm_pool.reserve_b = amm_pool.reserve_b
            .checked_sub(output_amount)
            .ok_or(CloakCraftError::InsufficientLiquidity)?;
    } else {
        // Swapping B for A: increase reserve_b, decrease reserve_a
        amm_pool.reserve_b = amm_pool.reserve_b
            .checked_add(swap_amount)
            .ok_or(CloakCraftError::AmountOverflow)?;
        amm_pool.reserve_a = amm_pool.reserve_a
            .checked_sub(output_amount)
            .ok_or(CloakCraftError::InsufficientLiquidity)?;
    }

    // Update state hash
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("✅ Swap executed");
    msg!("New reserves: reserve_a={}, reserve_b={}", amm_pool.reserve_a, amm_pool.reserve_b);
    msg!("Phase 3 complete");
    msg!("Next: Phase 4+ - create_commitment for each output");

    Ok(())
}
