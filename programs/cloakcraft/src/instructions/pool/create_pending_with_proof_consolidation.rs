//! Create Pending Operation with Proof - Phase 0 (Consolidation-specific)
//!
//! This is Phase 0 of the append pattern for note consolidation.
//! Consolidation combines up to 3 notes into 1 using the consolidate_3x1 circuit.
//!
//! Circuit public inputs (consolidate_3x1):
//! - merkle_root
//! - nullifier_1, nullifier_2, nullifier_3
//! - out_commitment (single output)
//! - token_mint
//!
//! NOTE: Consolidation has NO fees (free operation - just reorganizing user's own notes)
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists (for each input)
//! Phase 2: Create nullifier (for each input)
//! Phase 3: (skipped - no unshield for consolidation)
//! Phase 4: Create commitment (single output)
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, VerificationKey, PendingOperation, PENDING_OPERATION_EXPIRY_SECONDS, MAX_INPUTS};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::pubkey_to_field;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePendingWithProofConsolidation<'info> {
    /// Pool
    #[account(
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Verification key for the consolidate_3x1 circuit
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

/// Phase 0: Verify ZK proof and create PendingOperation for consolidation
///
/// SECURITY CRITICAL: This phase verifies the consolidate_3x1 ZK proof.
/// The proof verifies:
/// - User knows spending keys for all input commitments
/// - All nullifiers are correctly derived
/// - Output commitment equals sum of inputs (minus any dust)
/// - Token mint is correct
///
/// Consolidation is FREE (no protocol fee) - just reorganizing notes.
#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof_consolidation(
    ctx: Context<CreatePendingWithProofConsolidation>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    num_inputs: u8,
    input_commitments: Vec<[u8; 32]>,
    nullifiers: Vec<[u8; 32]>,
    out_commitment: [u8; 32],
    output_recipient: [u8; 32],
    output_amount: u64,
    output_randomness: [u8; 32],
    stealth_ephemeral_pubkey: [u8; 64],
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 0: Verify Consolidation Proof and Create Pending Operation ===");
    msg!("Pool: {:?}", pool.key());
    msg!("Num inputs: {}", num_inputs);
    msg!("Output commitment: {:02x?}...", &out_commitment[0..8]);

    // Validate input count
    require!(
        num_inputs >= 2 && num_inputs as usize <= MAX_INPUTS,
        CloakCraftError::InvalidInputCount
    );
    require!(
        input_commitments.len() == num_inputs as usize,
        CloakCraftError::InvalidInputCount
    );
    require!(
        nullifiers.len() == num_inputs as usize,
        CloakCraftError::InvalidInputCount
    );

    // SECURITY: Verify ZK proof with public inputs
    #[cfg(not(feature = "skip-zk-verify"))]
    {
        let public_inputs = build_consolidation_public_inputs(
            &merkle_root,
            &nullifiers,
            &out_commitment,
            &pool.token_mint,
        );

        verify_groth16_proof(
            &proof,
            &ctx.accounts.verification_key.vk_data,
            &public_inputs,
            "Consolidation",
        )?;

        msg!("✅ ZK consolidation proof verified");
    }

    #[cfg(feature = "skip-zk-verify")]
    {
        msg!("WARNING: ZK proof verification skipped (testing mode)");
        let _ = &proof;
    }

    // Initialize pending operation PDA
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = 1; // 1 = consolidation
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // SECURITY: Store binding fields from ZK proof
    pending_op.num_inputs = num_inputs;
    for i in 0..num_inputs as usize {
        pending_op.input_commitments[i] = input_commitments[i];
        pending_op.expected_nullifiers[i] = nullifiers[i];
        pending_op.input_pools[i] = pool.key().to_bytes();
    }
    pending_op.inputs_verified_mask = 0;
    pending_op.proof_verified = true;

    msg!("SECURITY: Binding fields stored");
    for i in 0..num_inputs as usize {
        msg!("  input_commitment[{}]: {:02x?}...", i, &input_commitments[i][0..8]);
        msg!("  nullifier[{}]: {:02x?}...", i, &nullifiers[i][0..8]);
    }
    msg!("  input_pool: {:?}", pool.key());

    // Store nullifier tracking
    pending_op.nullifier_completed_mask = 0;

    // Store output commitment and regeneration data (single output)
    pending_op.num_commitments = 1;
    pending_op.pools[0] = pool.key().to_bytes();
    pending_op.commitments[0] = out_commitment;
    pending_op.output_recipients[0] = output_recipient;
    pending_op.output_amounts[0] = output_amount;
    pending_op.output_randomness[0] = output_randomness;
    pending_op.stealth_ephemeral_pubkeys[0] = stealth_ephemeral_pubkey;
    pending_op.completed_mask = 0;

    // Consolidation has NO fees and NO unshield
    pending_op.fee_amount = 0;
    pending_op.unshield_amount = 0;
    pending_op.fee_processed = true; // No fee to process

    msg!("Phase 0 complete: Consolidation proof verified, PendingOperation created");
    msg!("  num_inputs: {}", num_inputs);
    msg!("  output_commitment: {:02x?}...", &out_commitment[0..8]);
    msg!("Next: Phase 1 - verify_commitment_exists (for each input)");

    Ok(())
}

/// Build public inputs array for consolidation proof verification
/// Order matches consolidate_3x1 circuit: merkle_root, nullifier_1, nullifier_2, nullifier_3, out_commitment, token_mint
fn build_consolidation_public_inputs(
    merkle_root: &[u8; 32],
    nullifiers: &[[u8; 32]],
    out_commitment: &[u8; 32],
    token_mint: &Pubkey,
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();

    // merkle_root
    inputs.push(*merkle_root);

    // nullifiers (always 3 for consolidate_3x1, pad with zeros if less)
    for i in 0..3 {
        if i < nullifiers.len() {
            inputs.push(nullifiers[i]);
        } else {
            // Pad with zero nullifiers for unused inputs
            inputs.push([0u8; 32]);
        }
    }

    // out_commitment (single output)
    inputs.push(*out_commitment);

    // token_mint
    inputs.push(pubkey_to_field(token_mint));

    inputs
}
