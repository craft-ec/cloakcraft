//! Create Pending with Proof - Claim (Phase 0)
//!
//! SpendToVote mode only: Allows winners to claim their payout.
//! Payout = (user_weight / winner_weight) * total_pool
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof + Create PendingOperation
//! Phase 1: verify_commitment_exists for position
//! Phase 2: create_nullifier_and_pending for position_nullifier (prevents double-claim)
//! Phase 3: execute_claim - Calculate and transfer payout
//! Phase 4: create_commitment for payout_commitment
//! Phase 5: close_pending_operation

use anchor_lang::prelude::*;

use crate::constants::{operation_types, seeds, GROTH16_PROOF_SIZE};
use crate::errors::CloakCraftError;
use crate::helpers::proof::verify_groth16_proof;
use crate::state::{
    Ballot, BallotStatus, PendingOperation, RevealMode, VoteBindingMode, VerificationKey,
    PENDING_OPERATION_EXPIRY_SECONDS,
};

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct CreatePendingWithProofClaim<'info> {
    /// Ballot (must be resolved)
    #[account(
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::SpendToVote @ CloakCraftError::ClaimsNotAllowed,
        constraint = ballot.status == BallotStatus::Resolved @ CloakCraftError::BallotNotResolved,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Verification key for claim circuit
    #[account(
        seeds = [seeds::VERIFICATION_KEY, crate::constants::circuits::CLAIM.as_ref()],
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
pub fn create_pending_with_proof_claim<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofClaim<'info>>,
    operation_id: [u8; 32],
    ballot_id: [u8; 32],
    proof: Vec<u8>,
    // Public inputs from ZK proof
    position_commitment: [u8; 32],
    position_nullifier: [u8; 32],
    payout_commitment: [u8; 32],
    user_vote_choice: u64,          // For public/TimeLocked modes
    user_weight: u64,
    gross_payout: u64,
    net_payout: u64,
    // Output data
    output_randomness: [u8; 32],
) -> Result<()> {
    let ballot = &ctx.accounts.ballot;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Verify claim deadline hasn't passed
    if ballot.claim_deadline > 0 && current_time >= ballot.claim_deadline {
        return Err(CloakCraftError::ClaimDeadlinePassed.into());
    }

    // Verify proof length
    if proof.len() != GROTH16_PROOF_SIZE {
        return Err(CloakCraftError::InvalidProofLength.into());
    }

    // Verify ballot has an outcome
    if !ballot.has_outcome {
        return Err(CloakCraftError::BallotNotResolved.into());
    }

    // For public/TimeLocked modes, verify vote_choice was a winner
    if ballot.reveal_mode == RevealMode::Public || ballot.reveal_mode == RevealMode::TimeLocked {
        if !ballot.is_winner(user_vote_choice, ballot.outcome) {
            // User didn't vote for the winner, payout should be 0
            if gross_payout != 0 {
                return Err(CloakCraftError::InvalidOutcomeValue.into());
            }
        }
    }

    // Verify payout calculation
    let (expected_gross, expected_net) = ballot.calculate_payout(user_weight);

    // For winners, verify payout matches
    if ballot.is_winner(user_vote_choice, ballot.outcome) {
        // Allow small rounding differences (1 token)
        if gross_payout.abs_diff(expected_gross) > 1 {
            msg!("Gross payout mismatch: expected {}, got {}", expected_gross, gross_payout);
            return Err(CloakCraftError::InvalidOutcomeValue.into());
        }
        if net_payout.abs_diff(expected_net) > 1 {
            msg!("Net payout mismatch: expected {}, got {}", expected_net, net_payout);
            return Err(CloakCraftError::InvalidOutcomeValue.into());
        }
    }

    // Build public inputs for ZK proof verification
    let public_inputs = build_public_inputs(
        ballot,
        &ballot_id,
        &position_commitment,
        &position_nullifier,
        &payout_commitment,
        user_vote_choice,
        user_weight,
        gross_payout,
        net_payout,
    )?;

    // Verify ZK proof
    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "claim",
    )?;

    // Initialize pending operation
    let pending_op = &mut ctx.accounts.pending_operation;
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = operation_types::CLAIM;
    pending_op.proof_verified = true;

    // Store position as input commitment
    pending_op.input_commitments[0] = position_commitment;
    pending_op.expected_nullifiers[0] = position_nullifier;
    pending_op.num_inputs = 1;
    pending_op.inputs_verified_mask = 0;
    pending_op.nullifier_completed_mask = 0;

    // Store ballot_id as input pool
    pending_op.input_pools[0] = ballot_id;

    // Store payout_commitment as output
    pending_op.commitments[0] = payout_commitment;
    pending_op.num_commitments = 1;
    pending_op.completed_mask = 0;

    // Store output data
    pending_op.output_randomness[0] = output_randomness;
    pending_op.output_amounts[0] = net_payout;

    // Store claim-specific data
    // swap_amount = gross_payout, output_amount = net_payout, extra_amount = user_weight
    pending_op.swap_amount = gross_payout;
    pending_op.output_amount = net_payout;
    pending_op.extra_amount = user_weight;

    // Store fee amount
    pending_op.fee_amount = gross_payout.saturating_sub(net_payout);

    // Set expiry
    pending_op.created_at = current_time;
    pending_op.expires_at = current_time + PENDING_OPERATION_EXPIRY_SECONDS;

    msg!("Claim pending operation created");
    msg!("  Position: {:?}", position_commitment);
    msg!("  User weight: {}", user_weight);
    msg!("  Gross payout: {}, Net payout: {}", gross_payout, net_payout);

    Ok(())
}

/// Build public inputs array for ZK proof verification
fn build_public_inputs(
    ballot: &Ballot,
    ballot_id: &[u8; 32],
    position_commitment: &[u8; 32],
    position_nullifier: &[u8; 32],
    payout_commitment: &[u8; 32],
    user_vote_choice: u64,
    user_weight: u64,
    gross_payout: u64,
    net_payout: u64,
) -> Result<Vec<[u8; 32]>> {
    let mut inputs = Vec::new();

    // Core public inputs
    inputs.push(*ballot_id);
    inputs.push(*position_nullifier);
    inputs.push(*position_commitment);
    inputs.push(*payout_commitment);

    // Payout amounts
    let mut gross_bytes = [0u8; 32];
    gross_bytes[24..32].copy_from_slice(&gross_payout.to_be_bytes());
    inputs.push(gross_bytes);

    let mut net_bytes = [0u8; 32];
    net_bytes[24..32].copy_from_slice(&net_payout.to_be_bytes());
    inputs.push(net_bytes);

    // Vote type (needed for circuit to know which winner check to perform)
    let mut vote_type_bytes = [0u8; 32];
    vote_type_bytes[31] = ballot.vote_type as u8;
    inputs.push(vote_type_bytes);

    // For public/TimeLocked modes, user_vote_choice is public
    if ballot.reveal_mode == RevealMode::Public || ballot.reveal_mode == RevealMode::TimeLocked {
        let mut choice_bytes = [0u8; 32];
        choice_bytes[24..32].copy_from_slice(&user_vote_choice.to_be_bytes());
        inputs.push(choice_bytes);
    }

    // User weight
    let mut weight_bytes = [0u8; 32];
    weight_bytes[24..32].copy_from_slice(&user_weight.to_be_bytes());
    inputs.push(weight_bytes);

    // Outcome
    let mut outcome_bytes = [0u8; 32];
    outcome_bytes[31] = ballot.outcome;
    inputs.push(outcome_bytes);

    // Total pool
    let mut pool_bytes = [0u8; 32];
    pool_bytes[24..32].copy_from_slice(&ballot.pool_balance.to_be_bytes());
    inputs.push(pool_bytes);

    // Winner weight
    let mut winner_weight_bytes = [0u8; 32];
    winner_weight_bytes[24..32].copy_from_slice(&ballot.winner_weight.to_be_bytes());
    inputs.push(winner_weight_bytes);

    // Protocol fee bps
    let mut fee_bps_bytes = [0u8; 32];
    fee_bps_bytes[30..32].copy_from_slice(&ballot.protocol_fee_bps.to_be_bytes());
    inputs.push(fee_bps_bytes);

    Ok(inputs)
}
