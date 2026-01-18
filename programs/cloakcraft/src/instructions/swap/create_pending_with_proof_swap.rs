//! Create Pending Operation with Proof - Phase 0 (Swap-specific)
//!
//! This is Phase 0 of the append pattern multi-phase operation for swap.
//! It verifies the ZK proof and creates the PendingOperation PDA with binding fields.
//!
//! SECURITY: This phase extracts and stores:
//! - input_commitment (from proof public inputs)
//! - expected_nullifier (from proof public inputs)
//! - output commitments (out_commitment, change_commitment)
//!
//! These values bind all subsequent phases together, preventing swap attacks.
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation (NO Light CPI)
//! Phase 1: Verify commitment exists (must match input_commitment)
//! Phase 2: Create nullifier (must match expected_nullifier)
//! Phase 3: Execute swap (update AMM state)
//! Phase 4+: Create commitments
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, AmmPool, VerificationKey, PendingOperation, PENDING_OPERATION_EXPIRY_SECONDS};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::pubkey_to_field;

/// Operation type constant for swap
pub const OP_TYPE_SWAP: u8 = 1;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePendingWithProofSwap<'info> {
    /// Input token pool (where the input commitment is spent from)
    #[account(
        seeds = [seeds::POOL, input_pool.token_mint.as_ref()],
        bump = input_pool.bump,
    )]
    pub input_pool: Box<Account<'info, Pool>>,

    /// Output token pool (where the swapped tokens go)
    #[account(
        seeds = [seeds::POOL, output_pool.token_mint.as_ref()],
        bump = output_pool.bump,
    )]
    pub output_pool: Box<Account<'info, Pool>>,

    /// AMM pool state
    #[account(
        seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key for the swap circuit
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

/// Phase 0: Verify ZK proof and create PendingOperation for swap
///
/// This phase:
/// 1. Verifies the ZK proof is valid
/// 2. Creates PendingOperation with binding fields from proof
/// 3. Stores operation-specific data (swap_amount, output_amount, etc.)
///
/// NO Light Protocol CPI calls in this phase (keeps it small)
#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof_swap<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofSwap<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    input_commitment: [u8; 32],
    nullifier: [u8; 32],
    out_commitment: [u8; 32],
    change_commitment: [u8; 32],
    min_output: u64,
    swap_amount: u64,
    output_amount: u64,
    swap_a_to_b: bool,
    num_commitments: u8,
) -> Result<()> {
    let input_pool = &ctx.accounts.input_pool;
    let output_pool = &ctx.accounts.output_pool;
    let amm_pool = &ctx.accounts.amm_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 0: Verify Proof + Create Pending (Swap) ===");

    // 1. Verify ZK proof (6 public inputs matching Circom circuit)
    let mut min_output_bytes = [0u8; 32];
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
    msg!("✅ ZK proof verified");

    // 2. Initialize pending operation PDA with binding fields
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = OP_TYPE_SWAP;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // SECURITY: Store binding fields from ZK proof
    pending_op.num_inputs = 1; // Single input operation
    pending_op.input_commitments[0] = input_commitment;
    pending_op.expected_nullifiers[0] = nullifier;
    pending_op.input_pools[0] = input_pool.key().to_bytes(); // SECURITY: Bind input to input pool
    pending_op.inputs_verified_mask = 0; // Will be set in Phase 1
    pending_op.proof_verified = true;

    // SECURITY: Validate output count
    require!(
        num_commitments as usize <= crate::state::MAX_PENDING_COMMITMENTS,
        CloakCraftError::TooManyPendingCommitments
    );
    require!(
        num_commitments == 2,
        CloakCraftError::InvalidAmount  // Swap always has exactly 2 outputs
    );

    // Store output commitments
    pending_op.num_commitments = num_commitments;
    pending_op.pools[0] = output_pool.key().to_bytes(); // Out commitment (swapped tokens)
    pending_op.commitments[0] = out_commitment;
    pending_op.pools[1] = input_pool.key().to_bytes(); // Change commitment (remaining input)
    pending_op.commitments[1] = change_commitment;

    // CRITICAL FIX: Store output amounts for create_commitment validation
    // Without these, create_commitment skips commitments as "zero-amount dummies"
    pending_op.output_amounts[0] = output_amount; // Swap output amount
    pending_op.output_amounts[1] = 1; // Change placeholder (non-zero = not dummy, actual amount in encrypted note)

    pending_op.nullifier_completed_mask = 0;
    pending_op.completed_mask = 0;

    // Store swap-specific data for Phase 3
    pending_op.swap_amount = swap_amount;
    pending_op.output_amount = output_amount; // Client's expected output (may be recalculated)
    pending_op.min_output = min_output; // Slippage protection - recalculated output must be >= this
    pending_op.swap_a_to_b = swap_a_to_b;

    msg!("Phase 0 complete: ZK proof verified, pending operation created");
    msg!("Next: Phase 1 - verify_commitment_exists");

    Ok(())
}
