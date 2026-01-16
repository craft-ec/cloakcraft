//! Generic create_nullifier instruction
//!
//! Creates ONE nullifier for a pending operation via Light Protocol.
//! Call this instruction N times for N nullifiers.

use anchor_lang::prelude::*;

use crate::state::{
    Pool, PendingOperation,
    LightValidityProof, LightAddressTreeInfo,
};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::create_spend_nullifier_account;

/// Parameters for Light Protocol nullifier creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCreateNullifierParams {
    /// Validity proof for nullifier (non-inclusion proof)
    pub proof: LightValidityProof,
    /// Address tree info for nullifier
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], nullifier_index: u8)]
pub struct CreateNullifier<'info> {
    /// Pool for this nullifier
    #[account(
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Pending operation PDA
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = !pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationExpired,
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

/// Create ONE nullifier for a pending operation
///
/// The nullifier hash was verified by the ZK proof in verify_operation.
/// This instruction just creates the Light Protocol compressed account.
pub fn create_nullifier<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateNullifier<'info>>,
    _operation_id: [u8; 32],
    nullifier_index: u8,
    light_params: LightCreateNullifierParams,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let pending_op = &mut ctx.accounts.pending_operation;

    // Validate index
    require!(
        nullifier_index < pending_op.num_inputs,
        CloakCraftError::InvalidNullifierIndex
    );

    // Check not already created
    require!(
        (pending_op.nullifier_completed_mask & (1u8 << nullifier_index)) == 0,
        CloakCraftError::NullifierAlreadyCreated
    );

    // Verify pool matches what was stored during verify_operation
    let expected_pool = pending_op.input_pools[nullifier_index as usize];
    require!(
        pool.key().to_bytes() == expected_pool,
        CloakCraftError::PoolMismatch
    );

    // Get nullifier hash from pending operation (verified by proof)
    let nullifier = pending_op.expected_nullifiers[nullifier_index as usize];

    // Create nullifier via Light Protocol (prevents double-spend)
    create_spend_nullifier_account(
        &ctx.accounts.relayer.to_account_info(),
        ctx.remaining_accounts,
        light_params.proof,
        light_params.address_tree_info,
        light_params.output_tree_index,
        pool.key(),
        nullifier,
    )?;

    // Mark as created
    pending_op.mark_nullifier_created(nullifier_index);

    Ok(())
}
