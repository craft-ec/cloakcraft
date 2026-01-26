//! Create Vote Nullifier (Phase 1)
//!
//! Creates the vote_nullifier for a pending vote operation using Light Protocol.
//! This is Phase 1 of the multi-phase voting flow.
//!
//! For Snapshot mode: vote_nullifier = hash(VOTE_NULLIFIER_DOMAIN, nullifier_key, ballot_id)
//! The vote_nullifier ensures ONE vote per user per ballot.
//!
//! Flow:
//! Phase 0: create_pending_with_proof_vote_snapshot (proof verified)
//! Phase 1 (this): create_vote_nullifier (Light Protocol CPI)
//! Phase 2: execute_vote_snapshot (tally update)
//! Phase 3: create_commitment (vote_commitment)
//! Phase 4: close_pending_operation

use anchor_lang::prelude::*;

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::create_action_nullifier_account;
use crate::state::{Ballot, PendingOperation, LightValidityProof, LightAddressTreeInfo};

/// Parameters for Light Protocol vote nullifier creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCreateVoteNullifierParams {
    /// Validity proof for nullifier (non-inclusion proof)
    pub validity_proof: LightValidityProof,
    /// Address tree info for nullifier
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct CreateVoteNullifier<'info> {
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

    /// Relayer (pays for nullifier creation, must match pending operation)
    #[account(
        mut,
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    // Light Protocol accounts via remaining_accounts (~8 accounts)
}

/// Create vote nullifier via Light Protocol
///
/// This ensures a user can only have ONE active vote per ballot.
/// Uses action_nullifier with ballot_id as the aggregation_id.
///
/// Seeds: ["action_nullifier", ballot_id, vote_nullifier]
pub fn create_vote_nullifier<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateVoteNullifier<'info>>,
    _operation_id: [u8; 32],
    ballot_id: [u8; 32],
    nullifier_index: u8,
    light_params: LightCreateVoteNullifierParams,
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

    // Validate nullifier index
    require!(
        (nullifier_index as usize) < pending_op.num_inputs as usize,
        CloakCraftError::InvalidNullifierIndex
    );

    // Check if this nullifier was already created
    let mask = 1u8 << nullifier_index;
    require!(
        (pending_op.nullifier_completed_mask & mask) == 0,
        CloakCraftError::NullifierAlreadyCreated
    );

    // Get the expected nullifier from pending operation
    let expected_nullifier = pending_op.expected_nullifiers[nullifier_index as usize];

    // Verify ballot_id matches the stored input_pool (ballot binding)
    require!(
        ballot_id == pending_op.input_pools[nullifier_index as usize],
        CloakCraftError::PoolMismatch
    );

    // Create the vote nullifier via Light Protocol CPI
    // Uses action_nullifier with ballot_id as aggregation_id
    create_action_nullifier_account(
        ctx.accounts.relayer.as_ref(),
        ctx.remaining_accounts,
        light_params.validity_proof,
        light_params.address_tree_info,
        light_params.output_tree_index,
        ballot_id,
        expected_nullifier,
    )?;

    // Mark nullifier as created
    pending_op.nullifier_completed_mask |= mask;

    msg!("Vote nullifier created for ballot");
    msg!("  Ballot ID: {:?}", ballot_id);
    msg!("  Nullifier index: {}", nullifier_index);
    msg!("  Completed mask: {}", pending_op.nullifier_completed_mask);

    Ok(())
}
