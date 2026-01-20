//! Execute Close Vote Position (Phase 3)
//!
//! Decrements ballot tally and releases tokens from position.
//! Called after position_nullifier is created (Phase 2).

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
pub struct ExecuteCloseVotePosition<'info> {
    /// Ballot (position is being closed)
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::SpendToVote @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Pending operation
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

pub fn execute_close_vote_position(
    ctx: Context<ExecuteCloseVotePosition>,
    _operation_id: [u8; 32],
    _ballot_id: [u8; 32],
    encrypted_contributions: Option<EncryptedContributions>,
) -> Result<()> {
    let ballot = &mut ctx.accounts.ballot;
    let pending_op = &ctx.accounts.pending_operation;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Verify ballot is still active
    if !ballot.is_active(current_time) {
        return Err(CloakCraftError::PositionCloseNotAllowed.into());
    }

    // Extract position data from pending operation
    let vote_choice = pending_op.swap_amount as u8;
    let weight = pending_op.output_amount;
    let amount = pending_op.extra_amount;

    // Update tally based on reveal mode (DECREMENT)
    match ballot.reveal_mode {
        RevealMode::Public => {
            // Direct tally decrement
            decrement_public_tally(ballot, vote_choice, weight, amount)?;
        }
        RevealMode::TimeLocked | RevealMode::PermanentPrivate => {
            // Homomorphic tally update (contributions contain negated weights)
            let contributions = encrypted_contributions
                .ok_or(CloakCraftError::InvalidPublicInputs)?;
            update_encrypted_tally(ballot, &contributions)?;
        }
    }

    // Decrement aggregate stats
    ballot.total_weight = ballot.total_weight.saturating_sub(weight);
    ballot.total_amount = ballot.total_amount.saturating_sub(amount);
    ballot.pool_balance = ballot.pool_balance.saturating_sub(amount);
    ballot.vote_count = ballot.vote_count.saturating_sub(1);

    msg!("Close vote position executed");
    msg!("  Amount released: {}", amount);
    msg!("  Weight removed: {}", weight);
    msg!("  Pool balance: {}", ballot.pool_balance);
    msg!("  Vote count: {}", ballot.vote_count);

    Ok(())
}

/// Decrement tally for public mode
fn decrement_public_tally(
    ballot: &mut Ballot,
    vote_choice: u8,
    weight: u64,
    amount: u64,
) -> Result<()> {
    if vote_choice >= ballot.num_options {
        return Err(CloakCraftError::InvalidVoteOptionRange.into());
    }

    let idx = vote_choice as usize;
    ballot.option_weights[idx] = ballot.option_weights[idx].saturating_sub(weight);
    ballot.option_amounts[idx] = ballot.option_amounts[idx].saturating_sub(amount);

    msg!("  Option {}: weight -{}, amount -{}", vote_choice, weight, amount);

    Ok(())
}

/// Update tally for encrypted modes (homomorphic addition of negated contributions)
fn update_encrypted_tally(
    ballot: &mut Ballot,
    contributions: &EncryptedContributions,
) -> Result<()> {
    if contributions.ciphertexts.len() != ballot.num_options as usize {
        return Err(CloakCraftError::InvalidPublicInputs.into());
    }

    for (i, ciphertext) in contributions.ciphertexts.iter().enumerate() {
        if i >= MAX_BALLOT_OPTIONS {
            break;
        }

        // Add contributions (which contain negated weights for subtraction)
        let updated = add_elgamal_ciphertexts(&ballot.encrypted_tally[i], ciphertext)?;
        ballot.encrypted_tally[i] = updated;
    }

    msg!("  Encrypted tally updated (decremented)");

    Ok(())
}

/// Add two ElGamal ciphertexts (homomorphic addition)
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

    // Placeholder implementation
    for i in 0..32 {
        result[i] = c1_a[i].wrapping_add(c1_b[i]);
        result[32 + i] = c2_a[i].wrapping_add(c2_b[i]);
    }

    Ok(result)
}
