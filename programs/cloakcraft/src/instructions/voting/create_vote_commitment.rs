//! Create Vote Commitment (Phase 3)
//!
//! Creates the vote_commitment for a pending vote operation using Light Protocol.
//! This is Phase 3 of the multi-phase voting flow.
//!
//! vote_commitment = hash(ballot_id, vote_nullifier, pubkey, vote_choice, weight, randomness)
//! The vote_commitment tracks the user's vote and enables vote changes.
//!
//! Flow:
//! Phase 0: create_pending_with_proof_vote_snapshot (proof verified)
//! Phase 1: create_vote_nullifier (Light Protocol CPI)
//! Phase 2: execute_vote_snapshot (tally update)
//! Phase 3 (this): create_vote_commitment (Light Protocol CPI)
//! Phase 4: close_pending_operation

use anchor_lang::prelude::*;

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::create_vote_commitment_account;
use crate::state::{Ballot, PendingOperation, LightValidityProof, LightAddressTreeInfo};

/// Parameters for Light Protocol vote commitment creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCreateVoteCommitmentParams {
    /// Validity proof for commitment (non-inclusion proof)
    pub validity_proof: LightValidityProof,
    /// Address tree info for commitment
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct CreateVoteCommitment<'info> {
    /// Ballot for this vote
    #[account(
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Pending operation PDA (from Phase 0)
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (pays for commitment creation, must match pending operation)
    #[account(
        mut,
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    // Light Protocol accounts via remaining_accounts (~8 accounts)
}

/// Create vote commitment via Light Protocol
///
/// This creates the vote_commitment that tracks the user's vote.
/// The commitment enables vote changes via the change_vote_snapshot flow.
///
/// Seeds: ["vote_commitment", ballot_id, commitment]
pub fn create_vote_commitment<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateVoteCommitment<'info>>,
    _operation_id: [u8; 32],
    ballot_id: [u8; 32],
    commitment_index: u8,
    encrypted_preimage: [u8; 128],
    encryption_type: u8,
    light_params: LightCreateVoteCommitmentParams,
) -> Result<()> {
    let pending_op = &mut ctx.accounts.pending_operation;

    // Validate pending operation state
    let clock = Clock::get()?;
    require!(
        !pending_op.is_expired(clock.unix_timestamp),
        CloakCraftError::PendingOperationExpired
    );
    require!(
        pending_op.proof_verified,
        CloakCraftError::ProofNotVerified
    );
    // All nullifiers must be created before commitments
    require!(
        pending_op.all_expected_nullifiers_created(),
        CloakCraftError::NullifierNotCreated
    );

    // Validate commitment index
    require!(
        commitment_index < pending_op.num_commitments,
        CloakCraftError::InvalidCommitmentIndex
    );

    // Check if this commitment was already created
    let mask = 1u8 << commitment_index;
    require!(
        (pending_op.completed_mask & mask) == 0,
        CloakCraftError::CommitmentAlreadyCreated
    );

    // Verify ballot_id matches the stored pool (ballot binding)
    require!(
        ballot_id == pending_op.pools[commitment_index as usize],
        CloakCraftError::PoolMismatch
    );

    // Get commitment hash from pending operation (verified by proof)
    let commitment = pending_op.commitments[commitment_index as usize];

    // Skip zero commitments (no change needed)
    if commitment == [0u8; 32] {
        pending_op.mark_completed(commitment_index);
        msg!("Skipping zero commitment at index {}", commitment_index);
        return Ok(());
    }

    // Use a simple leaf index (commitment_index based)
    let leaf_index = commitment_index as u64;

    // Create the vote commitment via Light Protocol CPI
    create_vote_commitment_account(
        ctx.accounts.relayer.as_ref(),
        ctx.remaining_accounts,
        light_params.validity_proof,
        light_params.address_tree_info,
        light_params.output_tree_index,
        ballot_id,
        commitment,
        leaf_index,
        encrypted_preimage,
        encryption_type,
    )?;

    // Mark commitment as created
    pending_op.mark_completed(commitment_index);

    msg!("Vote commitment created for ballot");
    msg!("  Ballot ID: {:?}", ballot_id);
    msg!("  Commitment index: {}", commitment_index);
    msg!("  Completed mask: {}", pending_op.completed_mask);

    Ok(())
}
