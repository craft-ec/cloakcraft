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
//! Phase 3 (this): Execute swap logic + transfer protocol fees to treasury
//! Phase 4+: Create commitments
//! Final: Close pending operation

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{Pool, AmmPool, PendingOperation, ProtocolConfig};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteSwap<'info> {
    /// Input token pool (has vault for input token)
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

    /// Input token vault (source for protocol fee transfer)
    #[account(
        mut,
        constraint = input_vault.key() == input_pool.token_vault @ CloakCraftError::InvalidVault,
    )]
    pub input_vault: Box<Account<'info, TokenAccount>>,

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

    /// Protocol config (required - enforces fee collection)
    #[account(
        seeds = [seeds::PROTOCOL_CONFIG],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Box<Account<'info, ProtocolConfig>>,

    /// Treasury token account (receives protocol fees)
    /// Only required if fees are enabled and fee > 0
    #[account(mut)]
    pub treasury_ata: Option<Box<Account<'info, TokenAccount>>>,

    /// Token program for transfers
    pub token_program: Program<'info, Token>,
}

/// Phase 3: Execute swap by updating AMM pool reserves
///
/// SECURITY: This phase can only execute after:
/// - Phase 0: ZK proof verified
/// - Phase 1: Commitment existence verified
/// - Phase 2: Nullifier created (commitment now spent)
///
/// This phase:
/// 1. Calculates protocol fee (percentage of LP fees)
/// 2. Transfers protocol fee from vault to treasury
/// 3. Updates AMM pool reserves (minus protocol fee)
/// 4. Updates state hash
///
/// NO Light Protocol CPI calls (those were in Phases 1 & 2)
pub fn execute_swap<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteSwap<'info>>,
    _operation_id: [u8; 32],
) -> Result<()> {
    let amm_pool = &mut ctx.accounts.amm_pool;
    let pending_op = &ctx.accounts.pending_operation;
    let input_pool = &ctx.accounts.input_pool;

    msg!("=== Phase 3: Execute Swap ===");

    // Get swap parameters from Phase 0
    let swap_amount = pending_op.swap_amount;
    let min_output = pending_op.min_output;
    let swap_a_to_b = pending_op.swap_a_to_b;

    msg!("Swap direction: {}, amount: {}, min_output: {}",
        if swap_a_to_b { "A->B" } else { "B->A" }, swap_amount, min_output);

    // FLEXIBLE RECALCULATION: Calculate output using CURRENT pool reserves
    // This handles concurrent swaps gracefully:
    // - If price moved favorably → user gets more, tx succeeds
    // - If price moved within slippage → tx succeeds with slightly less
    // - If price moved beyond slippage → tx fails (correct behavior)
    let (output_amount, _fee_amount) = amm_pool.calculate_swap_output(swap_amount, swap_a_to_b)
        .ok_or(CloakCraftError::InvalidSwapOutput)?;

    // SECURITY: Verify recalculated output meets minimum (slippage protection)
    require!(
        output_amount >= min_output,
        CloakCraftError::SlippageExceeded
    );
    msg!("✅ Swap output calculated: {} (min: {}) using {} formula",
        output_amount, min_output,
        if amm_pool.pool_type == crate::state::PoolType::StableSwap { "StableSwap" } else { "ConstantProduct" });

    // Calculate protocol fee (percentage of LP fees)
    // The protocol takes swap_fee_share_bps% of the pool's LP fee
    let protocol_config = &ctx.accounts.protocol_config;
    let protocol_fee = if protocol_config.fees_enabled {
        let (fee, _lp_fee_remaining) = protocol_config.calculate_swap_fee(
            swap_amount,
            amm_pool.fee_bps
        );
        fee
    } else {
        0
    };

    // Transfer protocol fee from vault to treasury
    if protocol_fee > 0 {
        let treasury_ata = ctx.accounts.treasury_ata.as_ref()
            .ok_or(CloakCraftError::InvalidTreasury)?;

        // Create PDA signer for vault transfer
        let pool_mint = input_pool.token_mint;
        let pool_bump = input_pool.bump;
        let signer_seeds: &[&[&[u8]]] = &[&[
            seeds::POOL,
            pool_mint.as_ref(),
            &[pool_bump],
        ]];

        // Transfer protocol fee to treasury
        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.input_vault.to_account_info(),
                to: treasury_ata.to_account_info(),
                authority: input_pool.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, protocol_fee)?;

        msg!("Protocol fee transferred: {} to treasury", protocol_fee);
    }

    // Calculate amount added to pool (swap amount minus protocol fee)
    let amount_to_pool = swap_amount.checked_sub(protocol_fee)
        .ok_or(CloakCraftError::AmountOverflow)?;

    // Update AMM pool reserves based on swap direction
    // Protocol fee is subtracted from what goes into the pool
    if swap_a_to_b {
        // Swapping A for B: increase reserve_a (minus fee), decrease reserve_b
        amm_pool.reserve_a = amm_pool.reserve_a
            .checked_add(amount_to_pool)
            .ok_or(CloakCraftError::AmountOverflow)?;
        amm_pool.reserve_b = amm_pool.reserve_b
            .checked_sub(output_amount)
            .ok_or(CloakCraftError::InsufficientLiquidity)?;
    } else {
        // Swapping B for A: increase reserve_b (minus fee), decrease reserve_a
        amm_pool.reserve_b = amm_pool.reserve_b
            .checked_add(amount_to_pool)
            .ok_or(CloakCraftError::AmountOverflow)?;
        amm_pool.reserve_a = amm_pool.reserve_a
            .checked_sub(output_amount)
            .ok_or(CloakCraftError::InsufficientLiquidity)?;
    }

    // Update state hash
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("✅ Swap executed");
    msg!("Amount to pool: {}, Protocol fee: {}", amount_to_pool, protocol_fee);
    msg!("New reserves: reserve_a={}, reserve_b={}", amm_pool.reserve_a, amm_pool.reserve_b);
    msg!("Phase 3 complete");
    msg!("Next: Phase 4+ - create_commitment for each output");

    Ok(())
}
