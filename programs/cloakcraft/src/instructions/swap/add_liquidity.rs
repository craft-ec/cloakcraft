//! Add liquidity to internal AMM pool (Multi-Phase)
//!
//! Phase 1 (add_liquidity): Verify proof + Verify commitments + Create nullifiers + Update AMM + Store pending
//! Phase 2 (create_commitment): Create LP commitment via generic instruction
//! Phase 3 (create_commitment): Create change A commitment via generic instruction
//! Phase 4 (create_commitment): Create change B commitment via generic instruction
//! Phase 5 (close_pending_operation): Close pending operation, reclaim rent
//!
//! SECURITY: Phase 1 atomically verifies both input commitments exist and creates nullifiers.
//! Uses generic Light Protocol instructions for output commitment storage.

use anchor_lang::prelude::*;

use crate::state::{
    Pool, AmmPool, VerificationKey, PoolCommitmentCounter,
    LightValidityProof, LightAddressTreeInfo, PendingOperation,
    PENDING_OPERATION_EXPIRY_SECONDS,
};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
// Removed: verify_and_spend_commitment (deprecated collapsed pattern)
use crate::helpers::field::pubkey_to_field;
use crate::helpers::amm_math::{calculate_initial_lp, calculate_proportional_lp, validate_lp_amount};
use crate::light_cpi::vec_to_fixed_note;
use crate::instructions::pool::CommitmentMerkleContext;

// =============================================================================
// Phase 1: Verify Proof + Store Pending Operation (NO Light Protocol calls)
// =============================================================================

/// Parameters for add liquidity Phase 1
/// SECURITY CRITICAL: Verifies both input commitments exist + creates nullifiers
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightAddLiquidityParams {
    // Input A commitment verification
    pub commitment_a_account_hash: [u8; 32],
    pub commitment_a_merkle_context: CommitmentMerkleContext,
    pub commitment_a_inclusion_proof: LightValidityProof,
    pub commitment_a_address_tree_info: LightAddressTreeInfo,
    pub nullifier_a_non_inclusion_proof: LightValidityProof,
    pub nullifier_a_address_tree_info: LightAddressTreeInfo,

    // Input B commitment verification
    pub commitment_b_account_hash: [u8; 32],
    pub commitment_b_merkle_context: CommitmentMerkleContext,
    pub commitment_b_inclusion_proof: LightValidityProof,
    pub commitment_b_address_tree_info: LightAddressTreeInfo,
    pub nullifier_b_non_inclusion_proof: LightValidityProof,
    pub nullifier_b_address_tree_info: LightAddressTreeInfo,

    /// Output state tree index for new nullifier accounts
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(
    operation_id: [u8; 32],
    _proof: Vec<u8>,
    _nullifier_a: [u8; 32],
    _nullifier_b: [u8; 32]
)]
pub struct AddLiquidity<'info> {
    /// Token A pool
    #[account(
        seeds = [seeds::POOL, pool_a.token_mint.as_ref()],
        bump = pool_a.bump,
    )]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Token B pool
    #[account(
        seeds = [seeds::POOL, pool_b.token_mint.as_ref()],
        bump = pool_b.bump,
    )]
    pub pool_b: Box<Account<'info, Pool>>,

    /// LP token pool (for LP commitment)
    #[account(
        seeds = [seeds::POOL, lp_pool.token_mint.as_ref()],
        bump = lp_pool.bump,
    )]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// AMM pool state
    #[account(
        mut,
        seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
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
}

/// Operation type constant for add_liquidity
pub const OP_TYPE_ADD_LIQUIDITY: u8 = 2;

/// Phase 1: Verify proof + Verify commitments + Create nullifiers + Update AMM + Store pending
///
/// SECURITY CRITICAL: This instruction atomically:
/// 1. Verifies the ZK proof is valid
/// 2. Verifies input A commitment exists in Light Protocol state tree
/// 3. Creates spend nullifier A (prevents double-spend)
/// 4. Verifies input B commitment exists in Light Protocol state tree
/// 5. Creates spend nullifier B (prevents double-spend)
/// 6. Validates LP amount calculation
/// 7. Updates AMM reserves
/// 8. Stores pending commitments for subsequent phases
///
/// After this, call:
/// 1. create_commitment (index 0) for LP commitment
/// 2. create_commitment (index 1) for change A commitment
/// 3. create_commitment (index 2) for change B commitment
/// 4. close_pending_operation to reclaim rent
#[allow(clippy::too_many_arguments)]
pub fn add_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, AddLiquidity<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    input_commitment_a: [u8; 32],
    input_commitment_b: [u8; 32],
    nullifier_a: [u8; 32],
    nullifier_b: [u8; 32],
    lp_commitment: [u8; 32],
    change_a_commitment: [u8; 32],
    change_b_commitment: [u8; 32],
    deposit_a: u64,
    deposit_b: u64,
    lp_amount: u64,
    min_lp_amount: u64,
    num_commitments: u8,
    light_params: LightAddLiquidityParams,
) -> Result<()> {
    let pool_a = &ctx.accounts.pool_a;
    let pool_b = &ctx.accounts.pool_b;
    let lp_pool = &ctx.accounts.lp_pool;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    // 1. Verify ZK proof (Circom circuit has 6 public inputs)
    let public_inputs = build_add_liquidity_inputs(
        &nullifier_a,
        &nullifier_b,
        &amm_pool.pool_id,
        &lp_commitment,
        &change_a_commitment,
        &change_b_commitment,
    );

    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "AddLiquidity",
    )?;

    // 2. DEPRECATED: This collapsed version is no longer used. Use append pattern instead:
    // - create_pending_with_proof_add_liquidity (Phase 0)
    // - verify_commitment_exists(index=0) for deposit A (Phase 1a)
    // - verify_commitment_exists(index=1) for deposit B (Phase 1b)
    // - create_nullifier_and_pending(index=0) for deposit A (Phase 2a)
    // - create_nullifier_and_pending(index=1) for deposit B (Phase 2b)
    // - execute_add_liquidity (Phase 3)
    // - create_commitment (Phase 4+)
    msg!("=== DEPRECATED: Use append pattern instead ===");
    return Err(CloakCraftError::Deprecated.into());

    // 4. CRITICAL SECURITY CHECK: Validate LP amount calculation
    // This prevents attackers from minting arbitrary LP tokens
    let calculated_lp = if amm_pool.lp_supply == 0 {
        calculate_initial_lp(deposit_a, deposit_b)?
    } else {
        calculate_proportional_lp(
            deposit_a,
            deposit_b,
            amm_pool.reserve_a,
            amm_pool.reserve_b,
            amm_pool.lp_supply,
        )?
    };

    // Validate LP amount and check slippage
    validate_lp_amount(lp_amount, calculated_lp, min_lp_amount)?;

    // 5. Update AMM pool state
    amm_pool.reserve_a = amm_pool.reserve_a.checked_add(deposit_a).ok_or(CloakCraftError::AmountOverflow)?;
    amm_pool.reserve_b = amm_pool.reserve_b.checked_add(deposit_b).ok_or(CloakCraftError::AmountOverflow)?;
    amm_pool.lp_supply = amm_pool.lp_supply.checked_add(lp_amount).ok_or(CloakCraftError::AmountOverflow)?;
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("Updated AMM state: reserve_a={}, reserve_b={}, lp_supply={}",
         amm_pool.reserve_a, amm_pool.reserve_b, amm_pool.lp_supply);

    // 6. Initialize pending operation PDA
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = OP_TYPE_ADD_LIQUIDITY;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // 7. Nullifiers already created in Phase 1 (no Phase 2 needed)
    pending_op.nullifier_completed_mask = 0;

    // 8. Store commitment data for Phase 2/3 (create_commitment calls)
    pending_op.num_commitments = num_commitments;
    // Index 0: LP commitment (goes to LP pool)
    pending_op.pools[0] = lp_pool.key().to_bytes();
    pending_op.commitments[0] = lp_commitment;
    // Index 1: Change A commitment (goes to pool A)
    pending_op.pools[1] = pool_a.key().to_bytes();
    pending_op.commitments[1] = change_a_commitment;
    // Index 2: Change B commitment (goes to pool B)
    pending_op.pools[2] = pool_b.key().to_bytes();
    pending_op.commitments[2] = change_b_commitment;
    pending_op.completed_mask = 0;

    Ok(())
}

fn build_add_liquidity_inputs(
    nullifier_a: &[u8; 32],
    nullifier_b: &[u8; 32],
    pool_id: &Pubkey,
    lp_commitment: &[u8; 32],
    change_a_commitment: &[u8; 32],
    change_b_commitment: &[u8; 32],
) -> Vec<[u8; 32]> {
    vec![
        *nullifier_a,
        *nullifier_b,
        pubkey_to_field(pool_id),
        *lp_commitment,
        *change_a_commitment,
        *change_b_commitment,
    ]
}

// =============================================================================
// Phase 2/3/4 are now handled by generic instructions:
// - create_nullifier (from generic module) for each nullifier
// - create_commitment (from generic module) for each commitment
// - close_pending_operation (from generic module) to reclaim rent
// =============================================================================
