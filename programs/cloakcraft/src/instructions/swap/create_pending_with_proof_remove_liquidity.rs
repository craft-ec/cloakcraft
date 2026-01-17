//! Create Pending Operation with Proof - Phase 0 (Remove Liquidity-specific)
//!
//! This is Phase 0 of the append pattern multi-phase operation for remove liquidity.
//! It verifies the ZK proof and creates the PendingOperation PDA with binding fields.
//!
//! SECURITY: This phase extracts and stores:
//! - input_commitment (LP token commitment)
//! - expected_nullifier (LP token nullifier)
//! - output commitments (out_a_commitment, out_b_commitment)
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation (NO Light CPI)
//! Phase 1: Verify LP commitment exists
//! Phase 2: Create nullifier
//! Phase 3: Execute remove liquidity (update AMM state)
//! Phase 4+: Create commitments
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, AmmPool, VerificationKey, PendingOperation, PENDING_OPERATION_EXPIRY_SECONDS};
use crate::constants::seeds;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::pubkey_to_field;
use crate::errors::CloakCraftError;

/// Operation type constant for remove liquidity
pub const OP_TYPE_REMOVE_LIQUIDITY: u8 = 3;

/// Convert [u8; 32] to field element by zeroing MSB
/// Used for state hashes (keccak256) which can exceed BN254 field modulus
/// keccak256 outputs big-endian bytes, so byte[0] is the MSB
fn to_field_element(hash: &[u8; 32]) -> [u8; 32] {
    let mut result = *hash;
    result[0] &= 0x1F; // Zero top 3 bits of MSB to ensure < BN254 modulus
    result
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePendingWithProofRemoveLiquidity<'info> {
    /// LP token pool (where LP tokens are burned from)
    #[account(
        seeds = [seeds::POOL, lp_pool.token_mint.as_ref()],
        bump = lp_pool.bump,
    )]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// Token A pool (where output A goes)
    #[account(
        seeds = [seeds::POOL, pool_a.token_mint.as_ref()],
        bump = pool_a.bump,
    )]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Token B pool (where output B goes)
    #[account(
        seeds = [seeds::POOL, pool_b.token_mint.as_ref()],
        bump = pool_b.bump,
    )]
    pub pool_b: Box<Account<'info, Pool>>,

    /// AMM pool state
    #[account(
        seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key for the remove liquidity circuit
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

    /// Relayer (pays for PDA creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Phase 0: Verify ZK proof and create PendingOperation for remove liquidity
#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof_remove_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofRemoveLiquidity<'info>>,
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
) -> Result<()> {
    let lp_pool = &ctx.accounts.lp_pool;
    let pool_a = &ctx.accounts.pool_a;
    let pool_b = &ctx.accounts.pool_b;
    let amm_pool = &ctx.accounts.amm_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 0: Verify Proof + Create Pending (Remove Liquidity) ===");

    // 1. Verify AMM state hash matches
    require!(
        amm_pool.verify_state_hash(&old_state_hash),
        CloakCraftError::InvalidPoolState
    );
    msg!("✅ AMM state hash verified");

    // 2. Verify ZK proof (6 public inputs)
    let public_inputs = vec![
        lp_nullifier,
        pubkey_to_field(&amm_pool.pool_id),
        out_a_commitment,
        out_b_commitment,
        to_field_element(&old_state_hash),
        to_field_element(&new_state_hash),
    ];

    verify_groth16_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs, "RemoveLiquidity")?;
    msg!("✅ ZK proof verified");

    // 3. Initialize pending operation PDA with binding fields
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = OP_TYPE_REMOVE_LIQUIDITY;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // SECURITY: Store binding fields from ZK proof
    pending_op.num_inputs = 1; // Single input operation
    pending_op.input_commitments[0] = lp_input_commitment;
    pending_op.expected_nullifiers[0] = lp_nullifier;
    pending_op.input_pools[0] = lp_pool.key().to_bytes(); // SECURITY: Bind LP input to LP pool
    pending_op.inputs_verified_mask = 0; // Will be set in Phase 1
    pending_op.proof_verified = true;

    // SECURITY: Validate output count
    require!(
        num_commitments as usize <= crate::state::MAX_PENDING_COMMITMENTS,
        CloakCraftError::TooManyPendingCommitments
    );
    require!(
        num_commitments == 2,
        CloakCraftError::InvalidAmount  // Remove liquidity always has exactly 2 outputs
    );

    // Store output commitments
    pending_op.num_commitments = num_commitments;
    pending_op.pools[0] = pool_a.key().to_bytes(); // Output A
    pending_op.commitments[0] = out_a_commitment;
    pending_op.pools[1] = pool_b.key().to_bytes(); // Output B
    pending_op.commitments[1] = out_b_commitment;

    // CRITICAL FIX: Store output amounts for create_commitment validation
    // Without these, create_commitment skips commitments as "zero-amount dummies"
    pending_op.output_amounts[0] = withdraw_a_amount; // Token A withdrawn
    pending_op.output_amounts[1] = withdraw_b_amount; // Token B withdrawn

    pending_op.nullifier_completed_mask = 0;
    pending_op.completed_mask = 0;

    // Store remove liquidity-specific data for Phase 3
    pending_op.swap_amount = lp_amount_burned; // LP tokens burned
    pending_op.output_amount = withdraw_a_amount; // Token A withdrawn
    pending_op.extra_amount = withdraw_b_amount; // Token B withdrawn
    pending_op.swap_a_to_b = false; // unused

    msg!("Phase 0 complete: ZK proof verified, pending operation created");
    msg!("Next: Phase 1 - verify_commitment_exists");

    Ok(())
}
