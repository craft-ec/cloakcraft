//! Create Pending with Proof - Vote Spend (Phase 0)
//!
//! SpendToVote mode: Tokens are locked in ballot vault.
//! User spends a token note to create a position.
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation
//! Phase 1: verify_commitment_exists for token note
//! Phase 2: create_nullifier_and_pending for spending_nullifier
//! Phase 3: execute_vote_spend - Update tally, lock tokens
//! Phase 4: create_commitment for position_commitment
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
pub struct CreatePendingWithProofVoteSpend<'info> {
    /// Ballot being voted on
    #[account(
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::SpendToVote @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Token pool (for note verification)
    #[account(
        seeds = [seeds::POOL, ballot.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Verification key for vote_spend circuit
    #[account(
        seeds = [seeds::VERIFICATION_KEY, crate::constants::circuits::VOTE_SPEND.as_ref()],
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
pub fn create_pending_with_proof_vote_spend<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofVoteSpend<'info>>,
    operation_id: [u8; 32],
    ballot_id: [u8; 32],
    proof: Vec<u8>,
    // Public inputs from ZK proof
    merkle_root: [u8; 32],
    input_commitment: [u8; 32],     // Token note being spent
    spending_nullifier: [u8; 32],
    position_commitment: [u8; 32],
    vote_choice: u64,               // For public mode
    amount: u64,                    // Tokens being locked
    weight: u64,                    // Calculated from amount via formula
    // Encrypted contributions (for encrypted modes)
    encrypted_contributions: Option<EncryptedContributions>,
    // Encrypted preimage for claim recovery
    encrypted_preimage: Option<Vec<u8>>,
    // Output data
    output_randomness: [u8; 32],
) -> Result<()> {
    let ballot = &ctx.accounts.ballot;
    let pool = &ctx.accounts.pool;
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

    // Note: Merkle root validation is handled by Light Protocol CPI during commitment verification
    // The root is verified in Phase 1 (verify_commitment_exists) via Light Protocol
    let _ = merkle_root; // Used in public inputs for ZK proof

    // Verify vote_choice is valid for public mode
    if ballot.reveal_mode == RevealMode::Public {
        if vote_choice >= ballot.num_options as u64 {
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
        let contributions = encrypted_contributions
            .as_ref()
            .ok_or(CloakCraftError::InvalidPublicInputs)?;
        if contributions.ciphertexts.len() != ballot.num_options as usize {
            return Err(CloakCraftError::InvalidPublicInputs.into());
        }
    }

    // Build public inputs for ZK proof verification
    let public_inputs = build_public_inputs(
        ballot,
        &ballot_id,
        &merkle_root,
        &spending_nullifier,
        &position_commitment,
        vote_choice,
        amount,
        weight,
        encrypted_contributions.as_ref(),
    )?;

    // Verify ZK proof
    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "vote_spend",
    )?;

    // Initialize pending operation
    let pending_op = &mut ctx.accounts.pending_operation;
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = operation_types::VOTE_SPEND;
    pending_op.proof_verified = true;

    // Store input commitment and nullifier
    pending_op.input_commitments[0] = input_commitment;
    pending_op.expected_nullifiers[0] = spending_nullifier;
    pending_op.num_inputs = 1;
    pending_op.inputs_verified_mask = 0;
    pending_op.nullifier_completed_mask = 0;

    // Store pool PDA for input verification (token pool, not ballot)
    // verify_commitment_exists checks pool.key() against this value
    pending_op.input_pools[0] = pool.key().to_bytes();

    // Store position_commitment as output
    pending_op.commitments[0] = position_commitment;
    pending_op.pools[0] = ballot_id; // Position is associated with ballot
    pending_op.num_commitments = 1;
    pending_op.completed_mask = 0;

    // Store output data
    pending_op.output_randomness[0] = output_randomness;
    pending_op.output_amounts[0] = amount;

    // Store vote-specific data
    // swap_amount = vote_choice, output_amount = weight, extra_amount = amount
    pending_op.swap_amount = vote_choice;
    pending_op.output_amount = weight;
    pending_op.extra_amount = amount;

    // Set expiry
    pending_op.created_at = current_time;
    pending_op.expires_at = current_time + PENDING_OPERATION_EXPIRY_SECONDS;

    msg!("Vote spend pending operation created");
    msg!("  Operation ID: {:?}", operation_id);
    msg!("  Amount: {}, Weight: {}", amount, weight);

    Ok(())
}

/// Build public inputs array for ZK proof verification
/// Must match the circuit's public inputs exactly in order:
/// 1. ballot_id
/// 2. merkle_root
/// 3. spending_nullifier
/// 4. position_commitment
/// 5. amount
/// 6. weight
/// 7. token_mint
/// 8. eligibility_root
/// 9. has_eligibility
/// 10. vote_choice
/// 11. is_public_mode
fn build_public_inputs(
    ballot: &Ballot,
    ballot_id: &[u8; 32],
    merkle_root: &[u8; 32],
    spending_nullifier: &[u8; 32],
    position_commitment: &[u8; 32],
    vote_choice: u64,
    amount: u64,
    weight: u64,
    _encrypted_contributions: Option<&EncryptedContributions>,
) -> Result<Vec<[u8; 32]>> {
    use crate::helpers::field::{bytes_to_field, pubkey_to_field, u64_to_field};

    let mut inputs = Vec::new();

    // 1. ballot_id
    inputs.push(bytes_to_field(ballot_id));

    // 2. merkle_root
    inputs.push(bytes_to_field(merkle_root));

    // 3. spending_nullifier
    inputs.push(bytes_to_field(spending_nullifier));

    // 4. position_commitment
    inputs.push(bytes_to_field(position_commitment));

    // 5. amount
    inputs.push(u64_to_field(amount));

    // 6. weight
    inputs.push(u64_to_field(weight));

    // 7. token_mint
    inputs.push(pubkey_to_field(&ballot.token_mint));

    // 8. eligibility_root (always included, 0 if no eligibility)
    inputs.push(bytes_to_field(&ballot.eligibility_root));

    // 9. has_eligibility (1 if eligibility check required, 0 otherwise)
    let has_elig = if ballot.has_eligibility_root { 1u64 } else { 0u64 };
    inputs.push(u64_to_field(has_elig));

    // 10. vote_choice (always included)
    inputs.push(u64_to_field(vote_choice));

    // 11. is_public_mode (1 if public, 0 if encrypted)
    let is_public = if ballot.reveal_mode == RevealMode::Public { 1u64 } else { 0u64 };
    inputs.push(u64_to_field(is_public));

    Ok(inputs)
}
