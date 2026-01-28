//! Update Position Metadata Closed - Phase 4b (Close Position)
//!
//! Creates a PositionStatusRecord marking the position as Closed.
//! This prevents the position from being closed again.
//!
//! Flow:
//! Phase 0: create_pending_with_proof_close_position (proof verified)
//! Phase 1a: verify_commitment_exists (position commitment)
//! Phase 1b: verify_position_meta_active (check not liquidated)
//! Phase 2: create_nullifier (close position)
//! Phase 3: execute_close_position (settle PnL, unlock tokens)
//! Phase 4a: create_commitment (settlement)
//! Phase 4b (this): create position status record (mark as Closed)
//! Final: close_pending_operation

use anchor_lang::prelude::*;

use crate::state::{PerpsPool, PendingOperation, PositionStatus, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::create_position_status_record;

/// Parameters for Light Protocol position status creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCreatePositionStatusParams {
    /// Validity proof for creating status record
    pub validity_proof: LightValidityProof,
    /// Address tree info
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePositionStatusClosed<'info> {
    /// Perps pool
    #[account(
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Pending operation PDA
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must match pending operation)
    #[account(
        mut,
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    // Light Protocol accounts via remaining_accounts
}

/// Create position status record marking as Closed
///
/// This is the final step of the close position flow.
/// It creates a status record so the position cannot be closed again.
pub fn create_position_status_closed<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePositionStatusClosed<'info>>,
    _operation_id: [u8; 32],
    position_id: [u8; 32],
    light_params: LightCreatePositionStatusParams,
) -> Result<()> {
    let perps_pool = &ctx.accounts.perps_pool;
    let pending_op = &ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 4b: Create Position Status (Closed) ===");

    // Validate pending operation state
    require!(
        !pending_op.is_expired(clock.unix_timestamp),
        CloakCraftError::PendingOperationExpired
    );

    // All previous phases must be complete
    require!(
        pending_op.all_inputs_verified(),
        CloakCraftError::CommitmentNotVerified
    );
    require!(
        pending_op.all_expected_nullifiers_created(),
        CloakCraftError::NullifierNotCreated
    );

    msg!("Creating position status record (Closed)");
    msg!("  Position ID: {:02x?}...", &position_id[0..8]);

    // Create position status record via Light Protocol
    create_position_status_record(
        ctx.accounts.relayer.as_ref(),
        ctx.remaining_accounts,
        light_params.validity_proof,
        light_params.address_tree_info,
        light_params.output_tree_index,
        perps_pool.pool_id.to_bytes(),
        position_id,
        PositionStatus::Closed,
    )?;

    msg!("✅ Position marked as Closed");
    msg!("Phase 4b complete");
    msg!("Next: close_pending_operation");

    Ok(())
}
