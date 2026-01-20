//! Execute Vote Snapshot (Phase 2)
//!
//! Updates ballot tally based on the verified vote.
//! Called after vote_nullifier is created (Phase 1).
//!
//! For Public mode: Updates option_weights[vote_choice] directly
//! For Encrypted modes: Adds encrypted_contributions to encrypted_tally

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
pub struct ExecuteVoteSnapshot<'info> {
    /// Ballot being voted on (mutable for tally update)
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::Snapshot @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Pending operation (must have proof verified and nullifier created)
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
        constraint = pending_operation.all_expected_nullifiers_created() @ CloakCraftError::NullifierNotCreated,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must match pending operation)
    #[account(
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,
}

pub fn execute_vote_snapshot(
    ctx: Context<ExecuteVoteSnapshot>,
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
    let total_amount = pending_op.extra_amount;

    // Update tally based on reveal mode
    match ballot.reveal_mode {
        RevealMode::Public => {
            // Direct tally update
            update_public_tally(ballot, vote_choice as u8, weight, total_amount)?;
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
    ballot.total_amount = ballot.total_amount.saturating_add(total_amount);
    ballot.vote_count = ballot.vote_count.saturating_add(1);

    msg!("Vote snapshot executed");
    msg!("  Total weight: {}", ballot.total_weight);
    msg!("  Total amount: {}", ballot.total_amount);
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

    msg!("  Option {}: weight +{}", vote_choice, weight);

    Ok(())
}

/// Update tally for encrypted modes (homomorphic addition)
///
/// Each encrypted_contribution is an ElGamal ciphertext.
/// We add all contributions to the tally - only one has non-zero weight,
/// but the program doesn't know which one (privacy preserved).
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

        // Homomorphic addition of ElGamal ciphertexts
        // C1_sum = C1_old + C1_new, C2_sum = C2_old + C2_new
        // This is elliptic curve point addition
        let updated = add_elgamal_ciphertexts(&ballot.encrypted_tally[i], ciphertext)?;
        ballot.encrypted_tally[i] = updated;
    }

    msg!("  Encrypted tally updated for {} options", ballot.num_options);

    Ok(())
}

/// Add two ElGamal ciphertexts (homomorphic addition)
///
/// ElGamal ciphertext: (C1, C2) where C1 = r*G, C2 = m*G + r*P
/// Addition: (C1_a + C1_b, C2_a + C2_b) = encrypt(m_a + m_b)
///
/// Note: This is a simplified implementation. In production, we'd use
/// proper elliptic curve point addition on BN254/BLS12-381.
fn add_elgamal_ciphertexts(
    ct_a: &[u8; ELGAMAL_CIPHERTEXT_SIZE],
    ct_b: &[u8; 64],
) -> Result<[u8; ELGAMAL_CIPHERTEXT_SIZE]> {
    let mut result = [0u8; ELGAMAL_CIPHERTEXT_SIZE];

    // Split into C1 and C2 (32 bytes each)
    let c1_a = &ct_a[0..32];
    let c2_a = &ct_a[32..64];
    let c1_b = &ct_b[0..32];
    let c2_b = &ct_b[32..64];

    // For identity ciphertext (all zeros), just copy the other
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

    // TODO: Implement proper elliptic curve point addition
    // For now, we use a placeholder that XORs the bytes
    // This is NOT cryptographically correct but allows the structure to compile
    // Production implementation would use:
    // - light_protocol's curve operations, or
    // - solana_program's alt_bn128 precompiles, or
    // - custom BN254 point addition

    // Placeholder: Simple byte addition (NOT secure, just for structure)
    for i in 0..32 {
        result[i] = c1_a[i].wrapping_add(c1_b[i]);
        result[32 + i] = c2_a[i].wrapping_add(c2_b[i]);
    }

    Ok(result)
}
