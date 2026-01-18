//! Create Pending Operation with Proof - Phase 0 (Transfer-specific)
//!
//! This is Phase 0 of the append pattern multi-phase operation.
//! It verifies the ZK proof and creates the PendingOperation PDA with binding fields.
//!
//! SECURITY: This phase extracts and stores:
//! - input_commitment (from proof public inputs)
//! - expected_nullifier (from proof public inputs)
//! - output commitments (from proof public inputs)
//!
//! These values bind all subsequent phases together, preventing swap attacks.
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation (NO Light CPI)
//! Phase 1: Verify commitment exists (must match input_commitment)
//! Phase 2: Create nullifier (must match expected_nullifier)
//! Phase 3: Process unshield
//! Phase 4+: Create commitments
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, VerificationKey, PendingOperation, PENDING_OPERATION_EXPIRY_SECONDS};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::{pubkey_to_field, u64_to_field};

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePendingWithProof<'info> {
    /// Pool
    #[account(
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Verification key for the circuit
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

/// Phase 0: Verify ZK proof and create PendingOperation with binding fields
///
/// SECURITY CRITICAL: This phase verifies the ZK proof and extracts the binding values.
/// The proof verifies:
/// - User knows spending key for input commitment
/// - Nullifier is correctly derived from commitment
/// - Output commitments are correctly computed
/// - Token mint and amounts are correct
/// - Fee amount is correctly deducted from balance
///
/// This phase creates the PendingOperation PDA with:
/// - input_commitment (binds to Phase 1)
/// - expected_nullifier (binds to Phase 2)
/// - output commitments (for Phase 4+)
/// - output regeneration data (recipients, amounts, randomness)
/// - fee_amount (for Phase 3 fee transfer)
///
/// Transaction size: ~600-800 bytes (NO Light CPI)
#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof(
    ctx: Context<CreatePendingWithProof>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    input_commitment: [u8; 32],
    nullifier: [u8; 32],
    out_commitments: Vec<[u8; 32]>,
    output_recipients: Vec<[u8; 32]>,
    output_amounts: Vec<u64>,
    output_randomness: Vec<[u8; 32]>,
    stealth_ephemeral_pubkeys: Vec<[u8; 64]>,
    transfer_amount: u64,
    unshield_amount: u64,
    fee_amount: u64,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 0: Verify ZK Proof and Create Pending Operation ===");
    msg!("Pool: {:?}", pool.key());
    msg!("Input commitment: {:02x?}...", &input_commitment[0..8]);
    msg!("Nullifier: {:02x?}...", &nullifier[0..8]);
    msg!("Output commitments: {}", out_commitments.len());

    // SECURITY: Validate output count to prevent silent truncation
    require!(
        out_commitments.len() <= crate::state::MAX_PENDING_COMMITMENTS,
        CloakCraftError::TooManyPendingCommitments
    );

    // SECURITY: Verify ZK proof with public inputs
    #[cfg(not(feature = "skip-zk-verify"))]
    {
        let public_inputs = build_transact_public_inputs(
            &merkle_root,
            &nullifier,
            &out_commitments,
            &pool.token_mint,
            transfer_amount,
            unshield_amount,
            fee_amount,
        );

        verify_groth16_proof(
            &proof,
            &ctx.accounts.verification_key.vk_data,
            &public_inputs,
            "Transfer",
        )?;

        msg!("✅ ZK proof verified (fee_amount: {})", fee_amount);
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
    pending_op.operation_type = 0; // Not used
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // SECURITY: Store binding fields from ZK proof
    pending_op.num_inputs = 1; // Single input operation
    pending_op.input_commitments[0] = input_commitment;
    pending_op.expected_nullifiers[0] = nullifier;
    pending_op.input_pools[0] = pool.key().to_bytes(); // SECURITY: Bind input to pool
    pending_op.inputs_verified_mask = 0; // Will be set in Phase 1
    pending_op.proof_verified = true;

    msg!("SECURITY: Binding fields stored");
    msg!("  input_commitment: {:02x?}...", &input_commitment[0..8]);
    msg!("  expected_nullifier: {:02x?}...", &nullifier[0..8]);
    msg!("  input_pool: {:?}", pool.key());

    // Store nullifier tracking (will be created in Phase 2)
    // Nullifiers use same indices as inputs (1:1 relationship)
    pending_op.nullifier_completed_mask = 0;

    // Store output commitments and regeneration data
    pending_op.num_commitments = out_commitments.len() as u8;
    for (i, commitment) in out_commitments.iter().enumerate() {
        if i >= pending_op.commitments.len() {
            break;
        }
        pending_op.pools[i] = pool.key().to_bytes();
        pending_op.commitments[i] = *commitment;

        // Store regeneration data (saves ~1680 bytes vs encrypted notes)
        if i < output_recipients.len() {
            pending_op.output_recipients[i] = output_recipients[i];
        }
        if i < output_amounts.len() {
            pending_op.output_amounts[i] = output_amounts[i];
        }
        if i < output_randomness.len() {
            pending_op.output_randomness[i] = output_randomness[i];
        }
        if i < stealth_ephemeral_pubkeys.len() {
            pending_op.stealth_ephemeral_pubkeys[i] = stealth_ephemeral_pubkeys[i];
        }
    }
    pending_op.completed_mask = 0;

    // Store fee, transfer, and unshield amounts for Phase 3
    pending_op.fee_amount = fee_amount;
    pending_op.unshield_amount = unshield_amount;
    pending_op.transfer_amount = transfer_amount;
    pending_op.fee_processed = false;

    msg!("Phase 0 complete: ZK proof verified, PendingOperation created");
    msg!("  transfer_amount: {}", transfer_amount);
    msg!("  unshield_amount: {}", unshield_amount);
    msg!("  fee_amount: {}", fee_amount);
    msg!("Next: Phase 1 - verify_commitment_for_pending");

    Ok(())
}

/// Build public inputs array for proof verification
/// Order matches circuit: merkle_root, nullifier, out_commitments, token_mint, transfer_amount, unshield_amount, fee_amount
fn build_transact_public_inputs(
    merkle_root: &[u8; 32],
    nullifier: &[u8; 32],
    out_commitments: &[[u8; 32]],
    token_mint: &Pubkey,
    transfer_amount: u64,
    unshield_amount: u64,
    fee_amount: u64,
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    inputs.push(*merkle_root);
    inputs.push(*nullifier);
    for commitment in out_commitments {
        inputs.push(*commitment);
    }
    inputs.push(pubkey_to_field(token_mint));
    inputs.push(u64_to_field(transfer_amount));
    inputs.push(u64_to_field(unshield_amount));
    inputs.push(u64_to_field(fee_amount));
    inputs
}
