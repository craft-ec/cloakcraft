//! Create Pending with Proof - Vote Snapshot (Phase 0)
//!
//! Verifies ZK proof for snapshot voting and creates PendingOperation.
//! Uses indexer attestation for balance verification.
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation
//! Phase 1: create_nullifier_and_pending for vote_nullifier (if first vote)
//! Phase 2: execute_vote_snapshot - Update tally
//! Phase 3: create_commitment for vote_commitment
//! Phase 4: close_pending_operation

use anchor_lang::prelude::*;

use crate::constants::{operation_types, seeds, GROTH16_PROOF_SIZE};
use crate::errors::CloakCraftError;
use crate::helpers::proof::verify_groth16_proof;
use crate::state::{
    Ballot, BallotStatus, PendingOperation, RevealMode, VoteBindingMode, VerificationKey,
    MAX_PENDING_COMMITMENTS, PENDING_OPERATION_EXPIRY_SECONDS,
};

/// Light Protocol parameters for vote snapshot operation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightVoteSnapshotParams {
    /// Merkle root for commitment verification (if checking existing vote)
    pub merkle_root: [u8; 32],
}

/// Encrypted contributions for tally update (encrypted modes only)
/// One ciphertext per option - program adds all to tally without knowing which is non-zero
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EncryptedContributions {
    /// Array of ElGamal ciphertexts, one per option
    /// Only one has non-zero weight (circuit enforces this)
    pub ciphertexts: Vec<[u8; 64]>,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct CreatePendingWithProofVoteSnapshot<'info> {
    /// Ballot being voted on
    #[account(
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::Snapshot @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Verification key for vote_snapshot circuit
    #[account(
        seeds = [seeds::VERIFICATION_KEY, crate::constants::circuits::VOTE_SNAPSHOT.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Account<'info, VerificationKey>,

    /// Pending operation account (created)
    #[account(
        init,
        payer = payer,
        space = PendingOperation::SPACE,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer executing the transaction
    pub relayer: Signer<'info>,

    /// Payer for account creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

#[allow(clippy::too_many_arguments)]
pub fn create_pending_with_proof_vote_snapshot<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofVoteSnapshot<'info>>,
    operation_id: [u8; 32],
    ballot_id: [u8; 32],
    proof: Vec<u8>,
    // Public inputs from ZK proof
    vote_nullifier: [u8; 32],
    vote_commitment: [u8; 32],
    vote_choice: u64,           // For public mode, actual choice; for encrypted, ignored
    total_amount: u64,
    weight: u64,
    // Attestation data (verified in circuit)
    attestation_signature: [u8; 64],
    // Encrypted contributions (for TimeLocked/PermanentPrivate modes)
    encrypted_contributions: Option<EncryptedContributions>,
    // Encrypted preimage for claim recovery (encrypted modes only)
    encrypted_preimage: Option<Vec<u8>>,
    // Output data
    output_randomness: [u8; 32],
) -> Result<()> {
    let ballot = &ctx.accounts.ballot;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Verify ballot is active
    if !ballot.is_active(current_time) {
        if ballot.status == BallotStatus::Pending {
            return Err(CloakCraftError::VotingNotStarted.into());
        }
        return Err(CloakCraftError::VotingEnded.into());
    }

    // Verify proof length
    if proof.len() != GROTH16_PROOF_SIZE {
        return Err(CloakCraftError::InvalidProofLength.into());
    }

    // Verify vote_choice is valid for public mode
    if ballot.reveal_mode == RevealMode::Public {
        if vote_choice >= ballot.num_options as u64 {
            return Err(CloakCraftError::InvalidVoteOptionRange.into());
        }
    }

    // Verify encrypted contributions for encrypted modes
    if ballot.reveal_mode == RevealMode::TimeLocked
        || ballot.reveal_mode == RevealMode::PermanentPrivate
    {
        let contributions = encrypted_contributions
            .as_ref()
            .ok_or(CloakCraftError::InvalidPublicInputs)?;
        if contributions.ciphertexts.len() != ballot.num_options as usize {
            return Err(CloakCraftError::InvalidPublicInputs.into());
        }
    }

    // Verify amount is non-zero
    if total_amount == 0 {
        return Err(CloakCraftError::ZeroAmount.into());
    }

    // Build public inputs for ZK proof verification
    let public_inputs = build_public_inputs(
        ballot,
        &ballot_id,
        &vote_nullifier,
        &vote_commitment,
        vote_choice,
        total_amount,
        weight,
        &attestation_signature,
        encrypted_contributions.as_ref(),
    )?;

    // Verify ZK proof
    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "vote_snapshot",
    )?;

    // Initialize pending operation
    let pending_op = &mut ctx.accounts.pending_operation;
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = operation_types::VOTE_SNAPSHOT;
    pending_op.proof_verified = true;

    // Store vote_nullifier as expected nullifier (created in Phase 1)
    pending_op.expected_nullifiers[0] = vote_nullifier;
    pending_op.num_inputs = 1;
    pending_op.inputs_verified_mask = 0;
    pending_op.nullifier_completed_mask = 0;

    // Store input pool as ballot_id (for verification)
    pending_op.input_pools[0] = ballot_id;

    // Store vote_commitment as output commitment
    pending_op.commitments[0] = vote_commitment;
    pending_op.num_commitments = 1;
    pending_op.completed_mask = 0;

    // Store output data for commitment creation
    pending_op.output_randomness[0] = output_randomness;
    pending_op.output_amounts[0] = weight;

    // Store vote-specific data in operation fields
    // Using swap_amount for vote_choice, output_amount for weight, extra_amount for total_amount
    pending_op.swap_amount = vote_choice;
    pending_op.output_amount = weight;
    pending_op.extra_amount = total_amount;

    // Set expiry
    pending_op.created_at = current_time;
    pending_op.expires_at = current_time + PENDING_OPERATION_EXPIRY_SECONDS;

    msg!("Vote snapshot pending operation created");
    msg!("  Operation ID: {:?}", operation_id);
    msg!("  Ballot ID: {:?}", ballot_id);
    msg!("  Vote nullifier: {:?}", vote_nullifier);
    msg!("  Weight: {}", weight);

    Ok(())
}

/// Build public inputs array for ZK proof verification
fn build_public_inputs(
    ballot: &Ballot,
    ballot_id: &[u8; 32],
    vote_nullifier: &[u8; 32],
    vote_commitment: &[u8; 32],
    vote_choice: u64,
    total_amount: u64,
    weight: u64,
    attestation_signature: &[u8; 64],
    encrypted_contributions: Option<&EncryptedContributions>,
) -> Result<Vec<[u8; 32]>> {
    let mut inputs = Vec::new();

    // Core public inputs
    inputs.push(*ballot_id);
    inputs.push(*vote_nullifier);
    inputs.push(*vote_commitment);

    // For public mode, vote_choice is public
    if ballot.reveal_mode == RevealMode::Public {
        let mut choice_bytes = [0u8; 32];
        choice_bytes[24..32].copy_from_slice(&vote_choice.to_be_bytes());
        inputs.push(choice_bytes);
    }

    // Amount and weight
    let mut amount_bytes = [0u8; 32];
    amount_bytes[24..32].copy_from_slice(&total_amount.to_be_bytes());
    inputs.push(amount_bytes);

    let mut weight_bytes = [0u8; 32];
    weight_bytes[24..32].copy_from_slice(&weight.to_be_bytes());
    inputs.push(weight_bytes);

    // Token mint
    inputs.push(ballot.token_mint.to_bytes());

    // Snapshot slot
    let mut slot_bytes = [0u8; 32];
    slot_bytes[24..32].copy_from_slice(&ballot.snapshot_slot.to_be_bytes());
    inputs.push(slot_bytes);

    // Indexer pubkey
    inputs.push(ballot.indexer_pubkey.to_bytes());

    // Attestation signature (split into two 32-byte chunks)
    let mut sig_part1 = [0u8; 32];
    let mut sig_part2 = [0u8; 32];
    sig_part1.copy_from_slice(&attestation_signature[0..32]);
    sig_part2.copy_from_slice(&attestation_signature[32..64]);
    inputs.push(sig_part1);
    inputs.push(sig_part2);

    // Eligibility root (if set)
    if ballot.has_eligibility_root {
        inputs.push(ballot.eligibility_root);
    }

    // Encrypted contributions (for encrypted modes)
    if let Some(contributions) = encrypted_contributions {
        for ciphertext in &contributions.ciphertexts {
            // Split 64-byte ciphertext into two 32-byte inputs
            let mut ct_part1 = [0u8; 32];
            let mut ct_part2 = [0u8; 32];
            ct_part1.copy_from_slice(&ciphertext[0..32]);
            ct_part2.copy_from_slice(&ciphertext[32..64]);
            inputs.push(ct_part1);
            inputs.push(ct_part2);
        }

        // Time lock pubkey
        inputs.push(ballot.time_lock_pubkey);
    }

    Ok(inputs)
}
