//! Verify Vote Commitment Exists (Phase 1) - Voting-specific commitment verification
//!
//! SECURITY CRITICAL: This prevents spending non-existent vote commitments.
//!
//! This is Phase 1 of voting operations that spend existing commitments:
//! - change_vote_snapshot: Verify old_vote_commitment exists
//! - vote_spend: Verify token note commitment exists
//! - change_vote_spend: Verify old position commitment exists
//! - close_position: Verify position commitment exists
//! - claim: Verify position commitment exists
//!
//! Unlike the generic verify_commitment_exists (which uses Pool), this uses Ballot.

use anchor_lang::prelude::*;

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{Ballot, LightAddressTreeInfo, LightValidityProof, PendingOperation};

/// Merkle context for commitment verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct VoteCommitmentMerkleContext {
    pub merkle_tree_pubkey_index: u8,
    pub queue_pubkey_index: u8,
    pub leaf_index: u32,
    pub root_index: u16,
}

/// Parameters for vote commitment inclusion verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightVerifyVoteCommitmentParams {
    /// Account hash of commitment to verify (from Light Protocol indexer)
    pub commitment_account_hash: [u8; 32],
    /// Merkle context proving commitment exists
    pub commitment_merkle_context: VoteCommitmentMerkleContext,
    /// Inclusion proof for commitment
    pub commitment_inclusion_proof: LightValidityProof,
    /// Address tree info for commitment
    pub commitment_address_tree_info: LightAddressTreeInfo,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct VerifyVoteCommitmentExists<'info> {
    /// Ballot (used instead of Pool for voting operations)
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
        constraint = !pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationExpired,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must match pending operation)
    #[account(
        mut,
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    // Light Protocol accounts via remaining_accounts (~8 accounts)
}

/// Phase 1: Verify vote commitment exists in Light Protocol state tree
///
/// SECURITY CRITICAL: This prevents the attack where someone:
/// 1. Generates a fake vote commitment
/// 2. Creates valid ZK proof (proves math, not on-chain existence)
/// 3. Creates nullifier (would succeed without this check)
/// 4. Claims rewards or changes votes they never made
///
/// SECURITY BINDING: Commitment must match pending_op.input_commitments[index] from Phase 0.
/// This prevents commitment swap attacks.
///
/// For voting operations:
/// - change_vote_snapshot: Verify old_vote_commitment (index=0)
/// - vote_spend: Verify token note (index=0)
/// - change_vote_spend: Verify old position (index=0)
/// - close_position: Verify position (index=0)
/// - claim: Verify position (index=0)
pub fn verify_vote_commitment_exists<'info>(
    ctx: Context<'_, '_, '_, 'info, VerifyVoteCommitmentExists<'info>>,
    _operation_id: [u8; 32],
    ballot_id: [u8; 32],
    commitment_index: u8,
    light_params: LightVerifyVoteCommitmentParams,
) -> Result<()> {
    let ballot = &ctx.accounts.ballot;
    let pending_op = &mut ctx.accounts.pending_operation;

    msg!("=== Phase 1: Verify Vote Commitment Exists ===");
    msg!("Ballot: {:?}", ballot.key());
    msg!("Commitment index: {}", commitment_index);

    // VALIDATION: Check index is within bounds
    require!(
        (commitment_index as usize) < pending_op.num_inputs as usize,
        CloakCraftError::InvalidCommitmentIndex
    );

    // VALIDATION: Check this commitment hasn't been verified yet
    let bit_mask = 1u8 << commitment_index;
    require!(
        (pending_op.inputs_verified_mask & bit_mask) == 0,
        CloakCraftError::CommitmentAlreadyVerified
    );

    // SECURITY: Get commitment from Phase 0 (NOT from function parameter!)
    let input_commitment = pending_op.input_commitments[commitment_index as usize];

    // SECURITY: Verify ballot_id matches what Phase 0 expects
    // For voting, input_pools stores ballot_id (not pool pubkey)
    let expected_ballot_id = pending_op.input_pools[commitment_index as usize];
    require!(
        ballot_id == expected_ballot_id,
        CloakCraftError::BallotIdMismatch
    );

    msg!(
        "Commitment from Phase 0: {:02x?}...",
        &input_commitment[0..8]
    );
    msg!("Expected ballot_id: {:02x?}...", &expected_ballot_id[0..8]);
    msg!("Provided ballot_id: {:02x?}...", &ballot_id[0..8]);
    msg!(
        "Account hash: {:02x?}...",
        &light_params.commitment_account_hash[0..8]
    );

    // SECURITY: Verify THIS EXACT commitment exists in Light Protocol state tree
    // For voting, we use the ballot key as the "pool" context
    crate::light_cpi::verify_vote_commitment_inclusion(
        &ctx.accounts.relayer.to_account_info(),
        ctx.remaining_accounts,
        light_params.commitment_account_hash,
        light_params.commitment_merkle_context,
        light_params.commitment_inclusion_proof,
        light_params.commitment_address_tree_info,
        input_commitment,
        ballot.key(),
    )?;

    msg!("Vote commitment verified - exists in state tree");

    // SECURITY: Mark commitment as verified
    pending_op.inputs_verified_mask |= bit_mask;

    // Check if all inputs verified
    let all_verified_mask = (1u8 << pending_op.num_inputs) - 1;
    if pending_op.inputs_verified_mask == all_verified_mask {
        msg!("All {} input commitments verified", pending_op.num_inputs);
    } else {
        msg!(
            "Commitment {} verified ({}/{} total)",
            commitment_index,
            pending_op.inputs_verified_mask.count_ones(),
            pending_op.num_inputs
        );
    }

    msg!("Phase 1 complete: vote commitment {} verified", commitment_index);
    msg!(
        "Next: Phase 2 - create nullifier (index={})",
        commitment_index
    );

    Ok(())
}
