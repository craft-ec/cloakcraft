//! Execute Vote Spend (Phase 3)
//!
//! Updates ballot tally and locks tokens for SpendToVote mode.
//! Called after spending_nullifier is created (Phase 2).

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{
    Ballot, BallotStatus, PendingOperation, RevealMode, VoteBindingMode,
    ELGAMAL_CIPHERTEXT_SIZE, MAX_BALLOT_OPTIONS,
};

use super::create_pending_with_proof_vote_snapshot::EncryptedContributions;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct ExecuteVoteSpend<'info> {
    /// Ballot being voted on (mutable for tally update)
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::SpendToVote @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Ballot vault (tokens are locked here)
    /// Note: Actual token transfer happens via the shielded pool mechanism
    /// The vault balance is tracked in ballot.pool_balance
    #[account(
        mut,
        seeds = [seeds::BALLOT_VAULT, ballot_id.as_ref()],
        bump,
        token::mint = ballot.token_mint,
        token::authority = ballot,
    )]
    pub ballot_vault: Account<'info, TokenAccount>,

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

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn execute_vote_spend(
    ctx: Context<ExecuteVoteSpend>,
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
        return Err(CloakCraftError::VotingEnded.into());
    }

    // Extract vote data from pending operation
    let vote_choice = pending_op.swap_amount;
    let weight = pending_op.output_amount;
    let amount = pending_op.extra_amount;

    // Update tally based on reveal mode
    match ballot.reveal_mode {
        RevealMode::Public => {
            // Direct tally update
            update_public_tally(ballot, vote_choice as u8, weight, amount)?;
        }
        RevealMode::TimeLocked | RevealMode::PermanentPrivate => {
            // Homomorphic tally update
            let contributions = encrypted_contributions
                .ok_or(CloakCraftError::InvalidPublicInputs)?;
            update_encrypted_tally(ballot, &contributions)?;
        }
    }

    // Update aggregate stats
    ballot.total_weight = ballot.total_weight.saturating_add(weight);
    ballot.total_amount = ballot.total_amount.saturating_add(amount);
    ballot.pool_balance = ballot.pool_balance.saturating_add(amount);
    ballot.vote_count = ballot.vote_count.saturating_add(1);

    msg!("Vote spend executed");
    msg!("  Amount locked: {}", amount);
    msg!("  Weight: {}", weight);
    msg!("  Pool balance: {}", ballot.pool_balance);
    msg!("  Vote count: {}", ballot.vote_count);

    Ok(())
}

/// Update tally for public mode
fn update_public_tally(
    ballot: &mut Ballot,
    vote_choice: u8,
    weight: u64,
    amount: u64,
) -> Result<()> {
    if vote_choice >= ballot.num_options {
        return Err(CloakCraftError::InvalidVoteOptionRange.into());
    }

    let idx = vote_choice as usize;
    ballot.option_weights[idx] = ballot.option_weights[idx].saturating_add(weight);
    ballot.option_amounts[idx] = ballot.option_amounts[idx].saturating_add(amount);

    msg!("  Option {}: weight +{}, amount +{}", vote_choice, weight, amount);

    Ok(())
}

/// Update tally for encrypted modes (homomorphic addition)
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

        let updated = add_elgamal_ciphertexts(&ballot.encrypted_tally[i], ciphertext)?;
        ballot.encrypted_tally[i] = updated;
    }

    msg!("  Encrypted tally updated for {} options", ballot.num_options);

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
