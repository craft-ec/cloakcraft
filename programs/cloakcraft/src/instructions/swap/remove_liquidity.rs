//! Remove liquidity from internal AMM pool (Multi-Phase)
//!
//! Phase 1 (remove_liquidity): Verify proof + Update AMM state + Store pending operation
//! Phase 2 (create_nullifier): Create LP nullifier via generic instruction
//! Phase 3 (create_commitment): Create each output commitment via generic instruction
//! Phase 4 (close_pending_operation): Close pending operation to reclaim rent
//!
//! Uses Light Protocol for nullifier and commitment storage.

use anchor_lang::prelude::*;

use crate::state::{
    Pool, AmmPool, VerificationKey, PoolCommitmentCounter,
    LightValidityProof, LightAddressTreeInfo, PendingOperation,
    PENDING_OPERATION_EXPIRY_SECONDS,
};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::crypto::verify_proof;
use crate::light_cpi::{create_spend_nullifier_account, create_commitment_account, vec_to_fixed_note};

// =============================================================================
// Field Element Conversion Helpers
// =============================================================================

/// Convert Pubkey to field element by zeroing MSB to ensure value < BN254 field modulus
fn pubkey_to_field_element(pubkey: &Pubkey) -> [u8; 32] {
    let mut bytes = pubkey.to_bytes();
    bytes[0] = 0;
    bytes
}

/// Convert [u8; 32] to field element by zeroing MSB
/// Used for state hashes (keccak256) which can exceed BN254 field modulus
fn to_field_element(hash: &[u8; 32]) -> [u8; 32] {
    let mut bytes = *hash;
    bytes[0] = 0;
    bytes
}

// =============================================================================
// Phase 1: Verify + Update AMM State + Store Pending
// =============================================================================

/// Parameters for remove liquidity Phase 1 (no Light Protocol params needed)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightRemoveLiquidityParams {
    /// Output state tree index (stored for Phase 2/3)
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

/// Phase 1: Verify proof + Update AMM state + Store pending operation
///
/// This instruction verifies the ZK proof, updates AMM reserves, and stores data for subsequent phases.
/// NO Light Protocol calls are made here to stay within transaction size limits.
///
/// Subsequent phases:
/// - Phase 2: create_nullifier (generic) to create LP spend nullifier
/// - Phase 3: create_commitment (generic) for each output commitment
/// - Phase 4: close_pending_operation (generic) to reclaim rent
#[allow(clippy::too_many_arguments)]
pub fn remove_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, RemoveLiquidity<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    lp_nullifier: [u8; 32],
    out_a_commitment: [u8; 32],
    out_b_commitment: [u8; 32],
    old_state_hash: [u8; 32],
    new_state_hash: [u8; 32],
    num_commitments: u8,
    _light_params: LightRemoveLiquidityParams,
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
        pubkey_to_field_element(&amm_pool.pool_id),
        out_a_commitment,
        out_b_commitment,
        to_field_element(&old_state_hash),
        to_field_element(&new_state_hash),
    ];

    verify_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs)?;

    // 3. Initialize pending operation PDA
    // NOTE: Nullifier and commitments will be created in subsequent phases
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = 3; // OP_TYPE_REMOVE_LIQUIDITY
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // Store nullifier data for Phase 2 (create_nullifier call)
    pending_op.num_nullifiers = 1;
    pending_op.nullifier_pools[0] = lp_pool.key().to_bytes();
    pending_op.nullifiers[0] = lp_nullifier;
    pending_op.nullifier_completed_mask = 0; // Not yet created

    // Store commitment data for Phase 3 (create_commitment calls)
    pending_op.num_commitments = num_commitments;
    // Index 0: Output A commitment (goes to pool A)
    pending_op.pools[0] = pool_a.key().to_bytes();
    pending_op.commitments[0] = out_a_commitment;
    // Index 1: Output B commitment (goes to pool B)
    pending_op.pools[1] = pool_b.key().to_bytes();
    pending_op.commitments[1] = out_b_commitment;
    pending_op.completed_mask = 0;

    // 4. Update AMM state
    amm_pool.state_hash = new_state_hash;

    msg!("Remove liquidity Phase 1 complete: operation_id stored");

    Ok(())
}

// =============================================================================
// Phase 2/3/4 are now handled by generic instructions:
// - create_nullifier (from generic module) for LP nullifier
// - create_commitment (from generic module) for each output commitment
// - close_pending_operation (from generic module) to reclaim rent
// =============================================================================
