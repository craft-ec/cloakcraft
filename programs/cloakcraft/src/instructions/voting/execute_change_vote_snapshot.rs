//! Execute Change Vote Snapshot (Phase 3)
//!
//! Updates ballot tally for vote change: decrements old choice, increments new choice.
//! Called after old_vote_commitment_nullifier is created (Phase 2).

use anchor_lang::prelude::*;

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{
    Ballot, BallotStatus, PendingOperation, RevealMode, VoteBindingMode,
    ELGAMAL_CIPHERTEXT_SIZE, MAX_BALLOT_OPTIONS,
};

use super::create_pending_with_proof_vote_snapshot::EncryptedContributions;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct ExecuteChangeVoteSnapshot<'info> {
    /// Ballot being voted on (mutable for tally update)
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::Snapshot @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Pending operation (must have proof verified, input verified, nullifier created)
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
        constraint = pending_operation.all_inputs_verified() @ CloakCraftError::CommitmentNotVerified,
        constraint = pending_operation.all_expected_nullifiers_created() @ CloakCraftError::NullifierNotCreated,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must match pending operation)
    #[account(
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,
}

pub fn execute_change_vote_snapshot(
    ctx: Context<ExecuteChangeVoteSnapshot>,
    _operation_id: [u8; 32],
    _ballot_id: [u8; 32],
    old_encrypted_contributions: Option<EncryptedContributions>,
    new_encrypted_contributions: Option<EncryptedContributions>,
) -> Result<()> {
    let ballot = &mut ctx.accounts.ballot;
    let pending_op = &ctx.accounts.pending_operation;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Verify ballot is still active
    if !ballot.is_active(current_time) {
        return Err(CloakCraftError::VotingEnded.into());
    }

    // Extract vote data from pending operation
    let old_vote_choice = pending_op.swap_amount as u8;
    let new_vote_choice = pending_op.output_amount as u8;
    let weight = pending_op.extra_amount;

    // Update tally based on reveal mode
    match ballot.reveal_mode {
        RevealMode::Public => {
            // Direct tally update: decrement old, increment new
            update_public_tally_change(ballot, old_vote_choice, new_vote_choice, weight)?;
        }
        RevealMode::TimeLocked | RevealMode::PermanentPrivate => {
            // Homomorphic tally update
            let old_contrib = old_encrypted_contributions
                .ok_or(CloakCraftError::InvalidPublicInputs)?;
            let new_contrib = new_encrypted_contributions
                .ok_or(CloakCraftError::InvalidPublicInputs)?;
            update_encrypted_tally_change(ballot, &old_contrib, &new_contrib)?;
        }
    }

    // Note: total_weight and vote_count remain unchanged for vote change
    // (same user, same weight, just different choice)

    msg!("Change vote snapshot executed");
    msg!("  Old choice: {}, New choice: {}", old_vote_choice, new_vote_choice);

    Ok(())
}

/// Update tally for public mode vote change
fn update_public_tally_change(
    ballot: &mut Ballot,
    old_vote_choice: u8,
    new_vote_choice: u8,
    weight: u64,
) -> Result<()> {
    if old_vote_choice >= ballot.num_options || new_vote_choice >= ballot.num_options {
        return Err(CloakCraftError::InvalidVoteOptionRange.into());
    }

    let old_idx = old_vote_choice as usize;
    let new_idx = new_vote_choice as usize;

    // Decrement old choice
    ballot.option_weights[old_idx] = ballot.option_weights[old_idx].saturating_sub(weight);

    // Increment new choice
    ballot.option_weights[new_idx] = ballot.option_weights[new_idx].saturating_add(weight);

    msg!("  Option {}: weight -{}", old_vote_choice, weight);
    msg!("  Option {}: weight +{}", new_vote_choice, weight);

    Ok(())
}

/// Update tally for encrypted modes vote change (homomorphic)
fn update_encrypted_tally_change(
    ballot: &mut Ballot,
    old_contributions: &EncryptedContributions,
    new_contributions: &EncryptedContributions,
) -> Result<()> {
    if old_contributions.ciphertexts.len() != ballot.num_options as usize
        || new_contributions.ciphertexts.len() != ballot.num_options as usize
    {
        return Err(CloakCraftError::InvalidPublicInputs.into());
    }

    for i in 0..ballot.num_options as usize {
        if i >= MAX_BALLOT_OPTIONS {
            break;
        }

        // Add old contributions (which contain negated weights for subtraction)
        let after_old = add_elgamal_ciphertexts(
            &ballot.encrypted_tally[i],
            &old_contributions.ciphertexts[i],
        )?;

        // Add new contributions (which contain positive weights for addition)
        let after_new = add_elgamal_ciphertexts(
            &after_old,
            &new_contributions.ciphertexts[i],
        )?;

        ballot.encrypted_tally[i] = after_new;
    }

    msg!("  Encrypted tally updated for vote change");

    Ok(())
}

/// Add two ElGamal ciphertexts (homomorphic addition)
/// Same as in execute_vote_snapshot.rs
fn add_elgamal_ciphertexts(
    ct_a: &[u8; ELGAMAL_CIPHERTEXT_SIZE],
    ct_b: &[u8; 64],
) -> Result<[u8; ELGAMAL_CIPHERTEXT_SIZE]> {
    let mut result = [0u8; ELGAMAL_CIPHERTEXT_SIZE];

    let c1_a = &ct_a[0..32];
    let c2_a = &ct_a[32..64];
    let c1_b = &ct_b[0..32];
    let c2_b = &ct_b[32..64];

    let is_a_zero = ct_a.iter().all(|&b| b == 0);
    let is_b_zero = ct_b.iter().all(|&b| b == 0);

    if is_a_zero {
        result.copy_from_slice(ct_b);
        return Ok(result);
    }
    if is_b_zero {
        result.copy_from_slice(ct_a);
        return Ok(result);
    }

    // Placeholder implementation (see execute_vote_snapshot.rs for notes)
    for i in 0..32 {
        result[i] = c1_a[i].wrapping_add(c1_b[i]);
        result[32 + i] = c2_a[i].wrapping_add(c2_b[i]);
    }

    Ok(result)
}
