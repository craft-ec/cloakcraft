//! Generic create_commitment instruction
//!
//! Creates ONE commitment for a pending operation via Light Protocol.
//! Call this instruction M times for M commitments.

use anchor_lang::prelude::*;

use crate::state::{
    Pool, PoolCommitmentCounter, PendingOperation,
    LightValidityProof, LightAddressTreeInfo,
};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::{create_commitment_account, vec_to_fixed_note};

/// Parameters for Light Protocol commitment creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCreateCommitmentParams {
    /// Validity proof for commitment
    pub proof: LightValidityProof,
    /// Address tree info for commitment
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], commitment_index: u8)]
pub struct CreateCommitment<'info> {
    /// Pool for this commitment
    #[account(
        mut,
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Commitment counter for the pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool.key().as_ref()],
        bump = commitment_counter.bump,
    )]
    pub commitment_counter: Box<Account<'info, PoolCommitmentCounter>>,

    /// Pending operation PDA
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = !pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationExpired,
        // SECURITY FIX: Check expected nullifiers (from append pattern), not legacy nullifiers
        // This ensures ALL nullifiers are created before commitments in multi-input operations
        constraint = pending_operation.all_expected_nullifiers_created() @ CloakCraftError::NullifierNotCreated,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must be same as operation creator)
    #[account(
        mut,
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    // Light Protocol accounts via remaining_accounts
}

/// Create ONE commitment for a pending operation
///
/// The commitment hash was verified by the ZK proof in verify_operation.
/// This instruction creates the Light Protocol compressed account.
///
/// IMPORTANT: All nullifiers must be created before any commitments.
pub fn create_commitment<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateCommitment<'info>>,
    _operation_id: [u8; 32],
    commitment_index: u8,
    stealth_ephemeral_pubkey: [u8; 64],
    encrypted_note: Vec<u8>,
    light_params: LightCreateCommitmentParams,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let counter = &mut ctx.accounts.commitment_counter;
    let pending_op = &mut ctx.accounts.pending_operation;

    // Validate index
    require!(
        commitment_index < pending_op.num_commitments,
        CloakCraftError::InvalidCommitmentIndex
    );

    // Check not already completed
    require!(
        (pending_op.completed_mask & (1u8 << commitment_index)) == 0,
        CloakCraftError::CommitmentAlreadyCreated
    );

    // Verify pool matches what was stored during verify_operation
    let expected_pool = pending_op.pools[commitment_index as usize];
    require!(
        pool.key().to_bytes() == expected_pool,
        CloakCraftError::PoolMismatch
    );

    // Get commitment hash from pending operation (verified by proof)
    let commitment = pending_op.commitments[commitment_index as usize];

    // Skip zero commitments (no change needed)
    if commitment == [0u8; 32] {
        pending_op.mark_completed(commitment_index);
        return Ok(());
    }

    // Skip zero-amount dummy commitments (circuit padding)
    // These are created by SDK to satisfy circuit input requirements (e.g., transfer_1x2 needs exactly 2 outputs)
    // Instead of creating actual Light Protocol accounts, we mark them complete immediately
    let output_amount = pending_op.output_amounts[commitment_index as usize];
    if output_amount == 0 {
        msg!("Skipping zero-amount dummy commitment at index {}", commitment_index);
        pending_op.mark_completed(commitment_index);
        return Ok(());
    }

    // Convert Vec to fixed-size array for Light Protocol
    let (encrypted_note_fixed, note_len) = vec_to_fixed_note(&encrypted_note);

    // Allocate leaf index
    let leaf_index = counter.next_leaf_index;
    counter.next_leaf_index += 1;
    counter.total_commitments += 1;

    // Store leaf index in pending op (for reference)
    pending_op.leaf_indices[commitment_index as usize] = leaf_index;

    // Create commitment via Light Protocol
    create_commitment_account(
        &ctx.accounts.relayer.to_account_info(),
        ctx.remaining_accounts,
        light_params.proof,
        light_params.address_tree_info,
        light_params.output_tree_index,
        pool.key(),
        commitment,
        leaf_index,
        stealth_ephemeral_pubkey,
        encrypted_note_fixed,
        note_len,
    )?;

    // Mark as completed
    pending_op.mark_completed(commitment_index);

    Ok(())
}
