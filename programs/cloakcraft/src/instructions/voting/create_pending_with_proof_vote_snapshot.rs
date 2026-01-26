//! Create Pending with Proof - Vote Snapshot (Phase 0)
//!
//! Verifies ZK proof for snapshot voting and creates PendingOperation.
//! User proves ownership of a shielded note WITHOUT spending it.
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
use crate::helpers::field::{bytes_to_field, pubkey_to_field, u64_to_field};
use crate::helpers::proof::verify_groth16_proof;
use crate::state::{
    Ballot, BallotStatus, PendingOperation, RevealMode, VoteBindingMode, VerificationKey,
    MAX_PENDING_COMMITMENTS, PENDING_OPERATION_EXPIRY_SECONDS,
};

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
    // Public inputs from ZK proof (note-based ownership proof)
    snapshot_merkle_root: [u8; 32],  // Merkle root at snapshot slot
    note_commitment: [u8; 32],       // The shielded note being used
    vote_nullifier: [u8; 32],
    vote_commitment: [u8; 32],
    vote_choice: u64,                // For public mode, actual choice; for encrypted, 0
    amount: u64,                     // Note amount
    weight: u64,
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
    if amount == 0 {
        return Err(CloakCraftError::ZeroAmount.into());
    }

    // Build public inputs for ZK proof verification
    let public_inputs = build_public_inputs(
        ballot,
        &ballot_id,
        &snapshot_merkle_root,
        &note_commitment,
        &vote_nullifier,
        &vote_commitment,
        vote_choice,
        amount,
        weight,
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

    // Store note_commitment as input commitment (verified in Phase 1 via Light Protocol)
    pending_op.input_commitments[0] = note_commitment;
    pending_op.num_inputs = 1;
    pending_op.inputs_verified_mask = 0;

    // Store vote_nullifier as expected nullifier (created in Phase 2)
    pending_op.expected_nullifiers[0] = vote_nullifier;
    pending_op.nullifier_completed_mask = 0;

    // Store input pool as ballot_id (for nullifier verification)
    pending_op.input_pools[0] = ballot_id;

    // Store vote_commitment as output commitment
    pending_op.commitments[0] = vote_commitment;
    pending_op.num_commitments = 1;
    pending_op.completed_mask = 0;

    // Store ballot_id in pools array (for commitment verification)
    pending_op.pools[0] = ballot_id;

    // Store output data for commitment creation
    pending_op.output_randomness[0] = output_randomness;
    pending_op.output_amounts[0] = weight;

    // Store vote-specific data in operation fields
    // Using swap_amount for vote_choice, output_amount for weight, extra_amount for amount
    pending_op.swap_amount = vote_choice;
    pending_op.output_amount = weight;
    pending_op.extra_amount = amount;

    // Note: snapshot_merkle_root is verified in the ZK circuit, not stored on-chain
    // The circuit proves the note exists in the merkle tree at snapshot slot

    // Set expiry
    pending_op.created_at = current_time;
    pending_op.expires_at = current_time + PENDING_OPERATION_EXPIRY_SECONDS;

    msg!("Vote snapshot pending operation created (note-based)");
    msg!("  Operation ID: {:?}", operation_id);
    msg!("  Ballot ID: {:?}", ballot_id);
    msg!("  Note commitment: {:?}", note_commitment);
    msg!("  Vote nullifier: {:?}", vote_nullifier);
    msg!("  Weight: {}", weight);

    Ok(())
}

/// Build public inputs array for ZK proof verification
/// Must match the circuit's public inputs exactly in order:
/// 1. ballot_id
/// 2. snapshot_merkle_root
/// 3. note_commitment
/// 4. vote_nullifier
/// 5. vote_commitment
/// 6. amount
/// 7. weight
/// 8. token_mint
/// 9. eligibility_root
/// 10. has_eligibility
/// 11. vote_choice
/// 12. is_public_mode
///
/// All 32-byte inputs are reduced modulo BN254 scalar field to match circuit field elements.
fn build_public_inputs(
    ballot: &Ballot,
    ballot_id: &[u8; 32],
    snapshot_merkle_root: &[u8; 32],
    note_commitment: &[u8; 32],
    vote_nullifier: &[u8; 32],
    vote_commitment: &[u8; 32],
    vote_choice: u64,
    amount: u64,
    weight: u64,
) -> Result<Vec<[u8; 32]>> {
    let mut inputs = Vec::new();

    // 1. ballot_id - reduce to field element
    inputs.push(bytes_to_field(ballot_id));

    // 2. snapshot_merkle_root - merkle root at snapshot slot
    inputs.push(bytes_to_field(snapshot_merkle_root));

    // 3. note_commitment - the shielded note being used for voting
    inputs.push(bytes_to_field(note_commitment));

    // 4. vote_nullifier - already a Poseidon hash (valid field element)
    inputs.push(bytes_to_field(vote_nullifier));

    // 5. vote_commitment - already a Poseidon hash (valid field element)
    inputs.push(bytes_to_field(vote_commitment));

    // 6. amount - u64 is always < field modulus
    inputs.push(u64_to_field(amount));

    // 7. weight - u64 is always < field modulus
    inputs.push(u64_to_field(weight));

    // 8. token_mint - Solana pubkey, reduce to field element
    inputs.push(pubkey_to_field(&ballot.token_mint));

    // 9. eligibility_root (always included, 0 if no eligibility)
    inputs.push(bytes_to_field(&ballot.eligibility_root));

    // 10. has_eligibility (1 if eligibility check required, 0 otherwise)
    let has_elig = if ballot.has_eligibility_root { 1u64 } else { 0u64 };
    inputs.push(u64_to_field(has_elig));

    // 11. vote_choice (always included)
    inputs.push(u64_to_field(vote_choice));

    // 12. is_public_mode (1 if public, 0 if encrypted)
    let is_public = if ballot.reveal_mode == RevealMode::Public { 1u64 } else { 0u64 };
    inputs.push(u64_to_field(is_public));

    Ok(inputs)
}
