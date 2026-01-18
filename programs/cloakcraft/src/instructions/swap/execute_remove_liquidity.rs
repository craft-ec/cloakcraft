//! Execute Remove Liquidity - Phase 3 (Remove Liquidity-specific)
//!
//! This is Phase 3 of the append pattern multi-phase operation for remove liquidity.
//! It executes the remove liquidity logic by updating AMM pool reserves and LP supply.
//!
//! Flow:
//! Phase 0: Verify ZK proof + Create PendingOperation
//! Phase 1: Verify LP commitment exists
//! Phase 2: Create nullifier (LP tokens now burned)
//! Phase 3 (this): Execute remove liquidity logic + transfer protocol fees to treasury
//! Phase 4+: Create commitments
//! Final: Close pending operation

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{Pool, AmmPool, PendingOperation, ProtocolConfig};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

/// Convert [u8; 32] to field element by zeroing MSB
/// keccak256 outputs big-endian bytes, so byte[0] is the MSB
fn to_field_element(hash: &[u8; 32]) -> [u8; 32] {
    let mut result = *hash;
    result[0] &= 0x1F; // Zero top 3 bits of MSB to ensure < BN254 modulus
    result
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ExecuteRemoveLiquidity<'info> {
    /// LP token pool (for reference)
    #[account(
        seeds = [seeds::POOL, lp_pool.token_mint.as_ref()],
        bump = lp_pool.bump,
    )]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// Token A pool (authority for vault_a transfers)
    #[account(
        seeds = [seeds::POOL, pool_a.token_mint.as_ref()],
        bump = pool_a.bump,
    )]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Token B pool (authority for vault_b transfers)
    #[account(
        seeds = [seeds::POOL, pool_b.token_mint.as_ref()],
        bump = pool_b.bump,
    )]
    pub pool_b: Box<Account<'info, Pool>>,

    /// AMM pool state (will be updated)
    #[account(
        mut,
        seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Token A vault (source for protocol fee transfer)
    #[account(
        mut,
        constraint = vault_a.key() == pool_a.token_vault @ CloakCraftError::InvalidVault,
    )]
    pub vault_a: Box<Account<'info, TokenAccount>>,

    /// Token B vault (source for protocol fee transfer)
    #[account(
        mut,
        constraint = vault_b.key() == pool_b.token_vault @ CloakCraftError::InvalidVault,
    )]
    pub vault_b: Box<Account<'info, TokenAccount>>,

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

    /// Treasury token account for token A (receives protocol fees)
    #[account(mut)]
    pub treasury_ata_a: Option<Box<Account<'info, TokenAccount>>>,

    /// Treasury token account for token B (receives protocol fees)
    #[account(mut)]
    pub treasury_ata_b: Option<Box<Account<'info, TokenAccount>>>,

    /// Token program for transfers
    pub token_program: Program<'info, Token>,
}

/// Phase 3: Execute remove liquidity by updating AMM pool state
///
/// SECURITY: This phase can only execute after:
/// - Phase 0: ZK proof verified
/// - Phase 1: Commitment existence verified
/// - Phase 2: Nullifier created (LP tokens now burned)
///
/// This phase:
/// 1. Calculates protocol fee (percentage of withdrawn amounts)
/// 2. Transfers protocol fees from vaults to treasury
/// 3. Updates AMM pool reserves and LP supply
/// 4. Updates state hash
pub fn execute_remove_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, ExecuteRemoveLiquidity<'info>>,
    _operation_id: [u8; 32],
    new_state_hash: [u8; 32],
) -> Result<()> {
    let amm_pool = &mut ctx.accounts.amm_pool;
    let pending_op = &ctx.accounts.pending_operation;
    let pool_a = &ctx.accounts.pool_a;
    let pool_b = &ctx.accounts.pool_b;
    let protocol_config = &ctx.accounts.protocol_config;

    msg!("=== Phase 3: Execute Remove Liquidity ===");

    // Get parameters from Phase 0
    let lp_amount_burned = pending_op.swap_amount;
    let withdraw_a_amount = pending_op.output_amount;
    let withdraw_b_amount = pending_op.extra_amount;

    msg!("LP burned: {}, Withdraw A: {}, Withdraw B: {}",
        lp_amount_burned, withdraw_a_amount, withdraw_b_amount);

    // Calculate protocol fees for both tokens
    let (fee_a, _) = if protocol_config.fees_enabled {
        protocol_config.calculate_remove_liquidity_fee(withdraw_a_amount)
    } else {
        (0, withdraw_a_amount)
    };

    let (fee_b, _) = if protocol_config.fees_enabled {
        protocol_config.calculate_remove_liquidity_fee(withdraw_b_amount)
    } else {
        (0, withdraw_b_amount)
    };

    msg!("Protocol fees: A={}, B={}", fee_a, fee_b);

    // Transfer protocol fee for token A
    if fee_a > 0 {
        let treasury_ata_a = ctx.accounts.treasury_ata_a.as_ref()
            .ok_or(CloakCraftError::InvalidTreasury)?;

        let pool_a_mint = pool_a.token_mint;
        let pool_a_bump = pool_a.bump;
        let signer_seeds_a: &[&[&[u8]]] = &[&[
            seeds::POOL,
            pool_a_mint.as_ref(),
            &[pool_a_bump],
        ]];

        let transfer_ctx_a = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_a.to_account_info(),
                to: treasury_ata_a.to_account_info(),
                authority: pool_a.to_account_info(),
            },
            signer_seeds_a,
        );
        token::transfer(transfer_ctx_a, fee_a)?;

        msg!("Protocol fee A transferred: {} to treasury", fee_a);
    }

    // Transfer protocol fee for token B
    if fee_b > 0 {
        let treasury_ata_b = ctx.accounts.treasury_ata_b.as_ref()
            .ok_or(CloakCraftError::InvalidTreasury)?;

        let pool_b_mint = pool_b.token_mint;
        let pool_b_bump = pool_b.bump;
        let signer_seeds_b: &[&[&[u8]]] = &[&[
            seeds::POOL,
            pool_b_mint.as_ref(),
            &[pool_b_bump],
        ]];

        let transfer_ctx_b = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_b.to_account_info(),
                to: treasury_ata_b.to_account_info(),
                authority: pool_b.to_account_info(),
            },
            signer_seeds_b,
        );
        token::transfer(transfer_ctx_b, fee_b)?;

        msg!("Protocol fee B transferred: {} to treasury", fee_b);
    }

    // Update AMM reserves (full amounts, fees are taken from vault separately)
    let new_reserve_a = amm_pool.reserve_a
        .checked_sub(withdraw_a_amount)
        .ok_or(CloakCraftError::InvalidAmount)?;
    let new_reserve_b = amm_pool.reserve_b
        .checked_sub(withdraw_b_amount)
        .ok_or(CloakCraftError::InvalidAmount)?;
    let new_lp_supply = amm_pool.lp_supply
        .checked_sub(lp_amount_burned)
        .ok_or(CloakCraftError::InvalidAmount)?;

    // Verify new state hash matches computed values
    let mut data = Vec::with_capacity(32);
    data.extend_from_slice(&new_reserve_a.to_le_bytes());
    data.extend_from_slice(&new_reserve_b.to_le_bytes());
    data.extend_from_slice(&new_lp_supply.to_le_bytes());
    data.extend_from_slice(amm_pool.pool_id.as_ref());
    let computed_hash = solana_keccak_hasher::hash(&data).to_bytes();

    // Compare field-reduced versions
    require!(
        to_field_element(&computed_hash) == to_field_element(&new_state_hash),
        CloakCraftError::InvalidPoolState
    );

    // Apply state changes
    amm_pool.reserve_a = new_reserve_a;
    amm_pool.reserve_b = new_reserve_b;
    amm_pool.lp_supply = new_lp_supply;
    amm_pool.state_hash = computed_hash;

    msg!("✅ Remove liquidity executed");
    msg!("Total fees collected: A={}, B={}", fee_a, fee_b);
    msg!("New reserves: A={}, B={}, LP supply={}", new_reserve_a, new_reserve_b, new_lp_supply);
    msg!("Phase 3 complete");
    msg!("Next: Phase 4+ - create_commitment for each output");

    Ok(())
}
