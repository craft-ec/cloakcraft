//! Remove liquidity from internal AMM pool (Multi-Phase)
//!
//! Phase 1 (remove_liquidity): Verify proof + Verify commitment + Create nullifier + Update AMM + Store pending
//! Phase 2 (create_commitment): Create output A commitment via generic instruction
//! Phase 3 (create_commitment): Create output B commitment via generic instruction
//! Phase 4 (close_pending_operation): Close pending operation to reclaim rent
//!
//! SECURITY: Phase 1 atomically verifies LP commitment exists and creates nullifier.
//! Uses Light Protocol for output commitment storage.

use anchor_lang::prelude::*;

use crate::state::{
    Pool, AmmPool, VerificationKey, PoolCommitmentCounter,
    LightValidityProof, LightAddressTreeInfo, PendingOperation,
    PENDING_OPERATION_EXPIRY_SECONDS,
};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::{verify_groth16_proof, field::pubkey_to_field};
// Removed: verify_and_spend_commitment (deprecated collapsed pattern)
use crate::light_cpi::{create_spend_nullifier_account, create_commitment_account, vec_to_fixed_note};
use crate::instructions::pool::CommitmentMerkleContext;

// =============================================================================
// Field Element Conversion Helpers
// =============================================================================

/// Convert [u8; 32] to field element by zeroing MSB
/// Used for state hashes (keccak256) which can exceed BN254 field modulus
fn to_field_element(hash: &[u8; 32]) -> [u8; 32] {
    let mut result = *hash;
    result[0] &= 0x1F; // Zero top 3 bits of MSB to ensure < BN254 modulus
    result
}

// =============================================================================
// Phase 1: Verify + Update AMM State + Store Pending
// =============================================================================

/// Parameters for remove liquidity Phase 1
/// SECURITY CRITICAL: Verifies LP commitment exists + creates nullifier
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightRemoveLiquidityParams {
    /// Account hash of LP input commitment (for verification)
    pub commitment_account_hash: [u8; 32],
    /// Merkle context proving commitment exists in state tree
    pub commitment_merkle_context: CommitmentMerkleContext,
    /// Commitment inclusion proof (SECURITY: proves commitment EXISTS)
    pub commitment_inclusion_proof: LightValidityProof,
    /// Address tree info for commitment verification
    pub commitment_address_tree_info: LightAddressTreeInfo,
    /// Nullifier non-inclusion proof (proves nullifier doesn't exist yet)
    pub nullifier_non_inclusion_proof: LightValidityProof,
    /// Address tree info for nullifier creation
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index for new nullifier account
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(
    operation_id: [u8; 32],
    _proof: Vec<u8>,
    _lp_nullifier: [u8; 32]
)]
pub struct RemoveLiquidity<'info> {
    /// LP token pool (where the LP tokens are burned from)
    #[account(mut, seeds = [seeds::POOL, lp_pool.token_mint.as_ref()], bump = lp_pool.bump)]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// Token A pool (where output A commitment goes)
    #[account(seeds = [seeds::POOL, pool_a.token_mint.as_ref()], bump = pool_a.bump)]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Token B pool (where output B commitment goes)
    #[account(seeds = [seeds::POOL, pool_b.token_mint.as_ref()], bump = pool_b.bump)]
    pub pool_b: Box<Account<'info, Pool>>,

    /// AMM pool state
    #[account(mut, seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()], bump = amm_pool.bump)]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key
    #[account(seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()], bump = verification_key.bump)]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Pending operation PDA (created in this instruction)
    #[account(
        init,
        payer = relayer,
        space = PendingOperation::SPACE,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (pays for accounts)
    #[account(mut)]
    pub relayer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    // Light Protocol accounts are passed via remaining_accounts
}

/// Phase 1: Verify proof + Verify commitment + Create nullifier + Update AMM + Store pending
///
/// SECURITY CRITICAL: This instruction atomically:
/// 1. Verifies AMM state matches old state hash
/// 2. Verifies the ZK proof is valid
/// 3. Verifies LP commitment exists in Light Protocol state tree
/// 4. Creates spend nullifier (prevents double-spend)
/// 5. Updates AMM reserves
/// 6. Stores pending commitments for subsequent phases
///
/// Subsequent phases:
/// - Phase 2: create_commitment (generic) for output A commitment
/// - Phase 3: create_commitment (generic) for output B commitment
/// - Phase 4: close_pending_operation (generic) to reclaim rent
#[allow(clippy::too_many_arguments)]
pub fn remove_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, RemoveLiquidity<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    lp_input_commitment: [u8; 32],
    lp_nullifier: [u8; 32],
    out_a_commitment: [u8; 32],
    out_b_commitment: [u8; 32],
    old_state_hash: [u8; 32],
    new_state_hash: [u8; 32],
    lp_amount_burned: u64,
    withdraw_a_amount: u64,
    withdraw_b_amount: u64,
    num_commitments: u8,
    light_params: LightRemoveLiquidityParams,
) -> Result<()> {
    let lp_pool = &ctx.accounts.lp_pool;
    let pool_a = &ctx.accounts.pool_a;
    let pool_b = &ctx.accounts.pool_b;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    // 1. Verify AMM state
    require!(amm_pool.verify_state_hash(&old_state_hash), CloakCraftError::InvalidPoolState);

    // 2. Verify ZK proof (6 public inputs for remove_liquidity circuit)
    let public_inputs = vec![
        lp_nullifier,
        pubkey_to_field(&amm_pool.pool_id),
        out_a_commitment,
        out_b_commitment,
        to_field_element(&old_state_hash),
        to_field_element(&new_state_hash),
    ];

    verify_groth16_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs, "RemoveLiquidity")?;

    // 3. DEPRECATED: This collapsed version is no longer used. Use append pattern instead:
    // - create_pending_with_proof_remove_liquidity (Phase 0)
    // - verify_commitment_exists for LP input (Phase 1)
    // - create_nullifier_and_pending for LP input (Phase 2)
    // - execute_remove_liquidity (Phase 3)
    // - create_commitment (Phase 4+)
    msg!("=== DEPRECATED: Use append pattern instead ===");
    return Err(CloakCraftError::Deprecated.into());

    // 4. Initialize pending operation PDA
    // NOTE: Nullifier already created in Phase 1; commitments will be created in subsequent phases
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = 3; // OP_TYPE_REMOVE_LIQUIDITY
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // Nullifier already created in Phase 1 (no Phase 2 needed)
    pending_op.nullifier_completed_mask = 0;

    // Store commitment data for Phase 2/3 (create_commitment calls)
    pending_op.num_commitments = num_commitments;
    // Index 0: Output A commitment (goes to pool A)
    pending_op.pools[0] = pool_a.key().to_bytes();
    pending_op.commitments[0] = out_a_commitment;
    // Index 1: Output B commitment (goes to pool B)
    pending_op.pools[1] = pool_b.key().to_bytes();
    pending_op.commitments[1] = out_b_commitment;
    pending_op.completed_mask = 0;

    // 5. Update AMM reserves (apply the state transition)
    let new_reserve_a = amm_pool.reserve_a.checked_sub(withdraw_a_amount)
        .ok_or(CloakCraftError::InvalidAmount)?;
    let new_reserve_b = amm_pool.reserve_b.checked_sub(withdraw_b_amount)
        .ok_or(CloakCraftError::InvalidAmount)?;
    let new_lp_supply = amm_pool.lp_supply.checked_sub(lp_amount_burned)
        .ok_or(CloakCraftError::InvalidAmount)?;

    // Verify the new state hash matches computed values
    let mut data = Vec::with_capacity(32);
    data.extend_from_slice(&new_reserve_a.to_le_bytes());
    data.extend_from_slice(&new_reserve_b.to_le_bytes());
    data.extend_from_slice(&new_lp_supply.to_le_bytes());
    data.extend_from_slice(amm_pool.pool_id.as_ref());
    let computed_hash = solana_keccak_hasher::hash(&data).to_bytes();
    require!(computed_hash == new_state_hash, CloakCraftError::InvalidPoolState);

    // Apply new state
    amm_pool.reserve_a = new_reserve_a;
    amm_pool.reserve_b = new_reserve_b;
    amm_pool.lp_supply = new_lp_supply;
    amm_pool.state_hash = new_state_hash;

    msg!("Remove liquidity Phase 1 complete: reserves updated");
    msg!("  New Reserve A: {}", new_reserve_a);
    msg!("  New Reserve B: {}", new_reserve_b);
    msg!("  New LP Supply: {}", new_lp_supply);

    Ok(())
}

// =============================================================================
// Phase 2/3/4 are now handled by generic instructions:
// - create_nullifier (from generic module) for LP nullifier
// - create_commitment (from generic module) for each output commitment
// - close_pending_operation (from generic module) to reclaim rent
// =============================================================================
