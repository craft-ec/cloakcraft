//! Swap via internal AMM (Multi-Phase)
//!
//! Phase 1 (swap): Verify proof + Verify commitment + Create nullifier + Update AMM + Store pending
//! Phase 2 (create_commitment): Create output commitment via generic instruction
//! Phase 3 (create_commitment): Create change commitment via generic instruction
//! Phase 4 (close_pending_operation): Close pending operation, reclaim rent
//!
//! SECURITY: Phase 1 atomically verifies input commitment exists and creates nullifier.
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
use crate::instructions::pool::CommitmentMerkleContext;

// =============================================================================
// Phase 1: Verify Proof + Store Pending Operation (NO Light Protocol calls)
// =============================================================================

/// Operation type constant for swap
pub const OP_TYPE_SWAP: u8 = 1;

/// Parameters for swap Phase 1
/// SECURITY CRITICAL: Verifies input commitment exists + creates nullifier
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightSwapParams {
    /// Account hash of input commitment (for verification)
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
    _merkle_root: [u8; 32],
    _nullifier: [u8; 32]
)]
pub struct Swap<'info> {
    /// Input token pool (where the input commitment is spent from)
    #[account(mut, seeds = [seeds::POOL, input_pool.token_mint.as_ref()], bump = input_pool.bump)]
    pub input_pool: Box<Account<'info, Pool>>,

    /// Output token pool (where the swapped tokens go)
    #[account(seeds = [seeds::POOL, output_pool.token_mint.as_ref()], bump = output_pool.bump)]
    pub output_pool: Box<Account<'info, Pool>>,

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
/// 1. Verifies the ZK proof is valid
/// 2. Verifies input commitment exists in Light Protocol state tree
/// 3. Creates spend nullifier (prevents double-spend)
/// 4. Updates AMM reserves
/// 5. Stores pending commitments for subsequent phases
///
/// After this, call:
/// 1. create_commitment (index 0) for output commitment
/// 2. create_commitment (index 1) for change commitment
/// 3. close_pending_operation to reclaim rent
#[allow(clippy::too_many_arguments)]
pub fn swap<'info>(
    ctx: Context<'_, '_, '_, 'info, Swap<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    input_commitment: [u8; 32],
    nullifier: [u8; 32],
    out_commitment: [u8; 32],
    change_commitment: [u8; 32],
    swap_amount: u64,
    output_amount: u64,
    min_output: u64,
    swap_a_to_b: bool,
    num_commitments: u8,
    light_params: LightSwapParams,
) -> Result<()> {
    let input_pool = &ctx.accounts.input_pool;
    let output_pool = &ctx.accounts.output_pool;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    // 1. Verify ZK proof (6 public inputs matching Circom circuit)
    let mut min_output_bytes = [0u8; 32];
    // Use big-endian for BN254 field element interpretation
    min_output_bytes[24..].copy_from_slice(&min_output.to_be_bytes());

    let public_inputs = vec![
        merkle_root,
        nullifier,
        pubkey_to_field(&amm_pool.pool_id),
        out_commitment,
        change_commitment,
        min_output_bytes,
    ];

    verify_groth16_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs, "Swap")?;

    // 2. DEPRECATED: This collapsed version is no longer used. Use append pattern instead:
    // - create_pending_with_proof_swap (Phase 0)
    // - verify_commitment_exists (Phase 1)
    // - create_nullifier_and_pending (Phase 2)
    // - execute_swap (Phase 3)
    // - create_commitment (Phase 4+)
    msg!("=== DEPRECATED: Use append pattern instead ===");
    return Err(CloakCraftError::Deprecated.into());

    // 3. Update AMM pool reserves based on swap direction
    // Apply constant product formula: k = reserve_a * reserve_b
    if swap_a_to_b {
        // Swapping A for B: increase reserve_a, decrease reserve_b
        amm_pool.reserve_a = amm_pool.reserve_a.checked_add(swap_amount).ok_or(CloakCraftError::AmountOverflow)?;
        amm_pool.reserve_b = amm_pool.reserve_b.checked_sub(output_amount).ok_or(CloakCraftError::InsufficientLiquidity)?;
    } else {
        // Swapping B for A: increase reserve_b, decrease reserve_a
        amm_pool.reserve_b = amm_pool.reserve_b.checked_add(swap_amount).ok_or(CloakCraftError::AmountOverflow)?;
        amm_pool.reserve_a = amm_pool.reserve_a.checked_sub(output_amount).ok_or(CloakCraftError::InsufficientLiquidity)?;
    }
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("Swap executed: direction={}, swap_amount={}, output_amount={}",
         if swap_a_to_b { "A->B" } else { "B->A" }, swap_amount, output_amount);
    msg!("New reserves: reserve_a={}, reserve_b={}", amm_pool.reserve_a, amm_pool.reserve_b);

    // 4. Initialize pending operation PDA
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = OP_TYPE_SWAP;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // 5. Nullifier already created in Phase 1 (no Phase 2 needed)
    pending_op.nullifier_completed_mask = 0;

    // 6. Store commitment data for Phase 2/3 (create_commitment calls)
    pending_op.num_commitments = num_commitments;
    // Index 0: Output commitment (goes to output pool - the swapped tokens)
    pending_op.pools[0] = output_pool.key().to_bytes();
    pending_op.commitments[0] = out_commitment;
    // Index 1: Change commitment (goes back to input pool - remaining input tokens)
    pending_op.pools[1] = input_pool.key().to_bytes();
    pending_op.commitments[1] = change_commitment;
    pending_op.completed_mask = 0;

    Ok(())
}

// =============================================================================
// Phase 2/3/4 are now handled by generic instructions:
// - create_nullifier (from generic module) for nullifier
// - create_commitment (from generic module) for each commitment
// - close_pending_operation (from generic module) to reclaim rent
// =============================================================================
