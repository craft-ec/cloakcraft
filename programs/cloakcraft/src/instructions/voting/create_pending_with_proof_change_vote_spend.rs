//! Create Pending with Proof - Change Vote Spend (Phase 0)
//!
//! SpendToVote mode: Atomic vote change.
//! Nullifies old position and creates new position with different vote choice.
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation
//! Phase 1: verify_commitment_exists for old_position
//! Phase 2: create_nullifier_and_pending for old_position_nullifier
//! Phase 3: execute_change_vote_spend - Update tally (decrement old, increment new)
//! Phase 4: create_commitment for new_position
//! Phase 5: close_pending_operation

use anchor_lang::prelude::*;

use crate::constants::{operation_types, seeds, GROTH16_PROOF_SIZE};
use crate::errors::CloakCraftError;
use crate::helpers::proof::verify_groth16_proof;
use crate::state::{
    Ballot, BallotStatus, PendingOperation, Pool, RevealMode, VoteBindingMode, VerificationKey,
    PENDING_OPERATION_EXPIRY_SECONDS,
};

use super::create_pending_with_proof_vote_snapshot::EncryptedContributions;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct CreatePendingWithProofChangeVoteSpend<'info> {
    /// Ballot being voted on
    #[account(
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::SpendToVote @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Token pool (for verification reference)
    #[account(
        seeds = [seeds::POOL, ballot.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Verification key for change_vote_spend circuit
    #[account(
        seeds = [seeds::VERIFICATION_KEY, crate::constants::circuits::CHANGE_VOTE_SPEND.as_ref()],
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
pub fn create_pending_with_proof_change_vote_spend<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofChangeVoteSpend<'info>>,
    operation_id: [u8; 32],
    ballot_id: [u8; 32],
    proof: Vec<u8>,
    // Public inputs from ZK proof
    old_position_commitment: [u8; 32],
    old_position_nullifier: [u8; 32],
    new_position_commitment: [u8; 32],
    old_vote_choice: u64,           // For public mode
    new_vote_choice: u64,           // For public mode
    amount: u64,                    // Unchanged
    weight: u64,                    // Unchanged
    // Encrypted contributions (for encrypted modes)
    old_encrypted_contributions: Option<EncryptedContributions>,  // Negated for decrement
    new_encrypted_contributions: Option<EncryptedContributions>,  // For increment
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

    // Verify vote choices are valid for public mode
    if ballot.reveal_mode == RevealMode::Public {
        if old_vote_choice >= ballot.num_options as u64
            || new_vote_choice >= ballot.num_options as u64
        {
            return Err(CloakCraftError::InvalidVoteOptionRange.into());
        }
    }

    // Verify amount is non-zero
    if amount == 0 {
        return Err(CloakCraftError::ZeroAmount.into());
    }

    // Verify encrypted contributions for encrypted modes
    if ballot.reveal_mode == RevealMode::TimeLocked
        || ballot.reveal_mode == RevealMode::PermanentPrivate
    {
        let old_contrib = old_encrypted_contributions
            .as_ref()
            .ok_or(CloakCraftError::InvalidPublicInputs)?;
        let new_contrib = new_encrypted_contributions
            .as_ref()
            .ok_or(CloakCraftError::InvalidPublicInputs)?;

        if old_contrib.ciphertexts.len() != ballot.num_options as usize
            || new_contrib.ciphertexts.len() != ballot.num_options as usize
        {
            return Err(CloakCraftError::InvalidPublicInputs.into());
        }
    }

    // Build public inputs for ZK proof verification
    let public_inputs = build_public_inputs(
        ballot,
        &ballot_id,
        &old_position_commitment,
        &old_position_nullifier,
        &new_position_commitment,
        old_vote_choice,
        new_vote_choice,
        amount,
        weight,
    )?;

    // Verify ZK proof
    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "change_vote_spend",
    )?;

    // Initialize pending operation
    let pending_op = &mut ctx.accounts.pending_operation;
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = operation_types::CHANGE_VOTE_SPEND;
    pending_op.proof_verified = true;

    // Store old_position as input commitment (verified in Phase 1)
    pending_op.input_commitments[0] = old_position_commitment;
    pending_op.expected_nullifiers[0] = old_position_nullifier;
    pending_op.num_inputs = 1;
    pending_op.inputs_verified_mask = 0;
    pending_op.nullifier_completed_mask = 0;

    // Store ballot_id as input pool (position is associated with ballot)
    pending_op.input_pools[0] = ballot_id;

    // Store new_position as output commitment
    pending_op.commitments[0] = new_position_commitment;
    pending_op.pools[0] = ballot_id;  // Position is associated with ballot
    pending_op.num_commitments = 1;
    pending_op.completed_mask = 0;

    // Store output data
    pending_op.output_randomness[0] = output_randomness;
    pending_op.output_amounts[0] = amount;

    // Store vote-specific data
    // swap_amount = old_vote_choice, output_amount = new_vote_choice, extra_amount = weight
    // Note: For change_vote_spend, we also need amount, stored in output_amounts[0]
    pending_op.swap_amount = old_vote_choice;
    pending_op.output_amount = new_vote_choice;
    pending_op.extra_amount = weight;

    // Set expiry
    pending_op.created_at = current_time;
    pending_op.expires_at = current_time + PENDING_OPERATION_EXPIRY_SECONDS;

    msg!("Change vote spend pending operation created");
    msg!("  Operation ID: {:?}", operation_id);
    msg!("  Old choice: {}, New choice: {}", old_vote_choice, new_vote_choice);
    msg!("  Amount: {}, Weight: {}", amount, weight);

    Ok(())
}

/// Build public inputs array for ZK proof verification
/// Must match the circuit's public inputs exactly in order:
/// 1. ballot_id
/// 2. old_position_commitment
/// 3. old_position_nullifier
/// 4. new_position_commitment
/// 5. amount
/// 6. weight
/// 7. token_mint
/// 8. old_vote_choice
/// 9. new_vote_choice
/// 10. is_public_mode
fn build_public_inputs(
    ballot: &Ballot,
    ballot_id: &[u8; 32],
    old_position_commitment: &[u8; 32],
    old_position_nullifier: &[u8; 32],
    new_position_commitment: &[u8; 32],
    old_vote_choice: u64,
    new_vote_choice: u64,
    amount: u64,
    weight: u64,
) -> Result<Vec<[u8; 32]>> {
    use crate::helpers::field::{bytes_to_field, pubkey_to_field, u64_to_field};

    let mut inputs = Vec::new();

    // 1. ballot_id
    inputs.push(bytes_to_field(ballot_id));

    // 2. old_position_commitment
    inputs.push(bytes_to_field(old_position_commitment));

    // 3. old_position_nullifier
    inputs.push(bytes_to_field(old_position_nullifier));

    // 4. new_position_commitment
    inputs.push(bytes_to_field(new_position_commitment));

    // 5. amount
    inputs.push(u64_to_field(amount));

    // 6. weight
    inputs.push(u64_to_field(weight));

    // 7. token_mint
    inputs.push(pubkey_to_field(&ballot.token_mint));

    // 8. old_vote_choice
    inputs.push(u64_to_field(old_vote_choice));

    // 9. new_vote_choice
    inputs.push(u64_to_field(new_vote_choice));

    // 10. is_public_mode
    let is_public = if ballot.reveal_mode == RevealMode::Public { 1u64 } else { 0u64 };
    inputs.push(u64_to_field(is_public));

    Ok(inputs)
}
