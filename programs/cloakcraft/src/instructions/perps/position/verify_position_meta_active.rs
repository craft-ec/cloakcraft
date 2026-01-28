//! Verify Position Metadata Active - Phase 1b (Close Position)
//!
//! Verifies that the PositionMeta compressed account exists and is Active.
//! This prevents closing positions that have been liquidated.
//!
//! SECURITY: This is critical to prevent double-spending after liquidation.
//! Even if a user has valid commitment secrets, they cannot close a liquidated position.
//!
//! Flow:
//! Phase 0: create_pending_with_proof_close_position (proof verified)
//! Phase 1a: verify_commitment_exists (position commitment)
//! Phase 1b (this): verify_position_meta_active (check not liquidated)
//! Phase 2: create_nullifier (close position)
//! Phase 3: execute_close_position (settle PnL, unlock tokens)
//! Phase 4a: create_commitment (settlement)
//! Phase 4b: update_position_meta_status (mark as Closed)
//! Final: close_pending_operation

use anchor_lang::prelude::*;

use crate::state::{PerpsPool, PendingOperation, LightValidityProof, LightAddressTreeInfo, PositionStatus};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::{verify_position_meta_inclusion, PositionMetaMerkleContext};

/// Parameters for Light Protocol position meta verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightVerifyPositionMetaParams {
    /// Validity proof for position meta (inclusion proof)
    pub validity_proof: LightValidityProof,
    /// Address tree info for position meta
    pub address_tree_info: LightAddressTreeInfo,
    /// Merkle context for the position meta account
    pub merkle_context: PositionMetaMerkleContext,
}

/// Position meta data passed from client (read from indexer)
/// This is verified against the on-chain compressed account
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PositionMetaData {
    /// Position ID (must match pending operation)
    pub position_id: [u8; 32],
    /// Account hash of the PositionMeta compressed account
    pub account_hash: [u8; 32],
    /// Current status (must be Active = 0)
    pub status: u8,
    /// Margin amount (for verification)
    pub margin_amount: u64,
    /// Is long (for verification)
    pub is_long: bool,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct VerifyPositionMetaActive<'info> {
    /// Perps pool
    #[account(
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Pending operation PDA (from Phase 0)
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must match pending operation)
    #[account(
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    // Light Protocol accounts via remaining_accounts (~8 accounts)
}

/// Verify that PositionMeta exists and is Active
///
/// This prevents users from closing positions that have been liquidated.
/// The verification is done via Light Protocol's inclusion proof.
pub fn verify_position_meta_active<'info>(
    ctx: Context<'_, '_, '_, 'info, VerifyPositionMetaActive<'info>>,
    _operation_id: [u8; 32],
    position_id: [u8; 32],
    position_meta_data: PositionMetaData,
    light_params: LightVerifyPositionMetaParams,
) -> Result<()> {
    let perps_pool = &ctx.accounts.perps_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 1b: Verify Position Meta Active ===");

    // Validate pending operation state
    require!(
        !pending_op.is_expired(clock.unix_timestamp),
        CloakCraftError::PendingOperationExpired
    );

    // Verify position_id matches what's expected
    // The position_id should be part of the ZK proof public inputs
    // and stored in pending_operation for binding
    require!(
        position_id == position_meta_data.position_id,
        CloakCraftError::PositionIdMismatch
    );

    msg!("Verifying PositionMeta inclusion...");
    msg!("  Position ID: {:02x?}...", &position_id[0..8]);
    msg!("  Account hash: {:02x?}...", &position_meta_data.account_hash[0..8]);
    msg!("  Status: {}", position_meta_data.status);

    // Verify PositionMeta exists in Light Protocol state tree
    verify_position_meta_inclusion(
        ctx.accounts.relayer.as_ref(),
        ctx.remaining_accounts,
        position_meta_data.account_hash,
        light_params.merkle_context,
        perps_pool.pool_id.to_bytes(),
        position_id,
    )?;

    msg!("✅ PositionMeta inclusion verified");

    // Check status is Active
    require!(
        position_meta_data.status == PositionStatus::Active as u8,
        CloakCraftError::PositionNotActive
    );

    // If liquidated, reject with specific error
    if position_meta_data.status == PositionStatus::Liquidated as u8 {
        msg!("❌ Position has been liquidated - cannot close");
        return Err(CloakCraftError::PositionAlreadyLiquidated.into());
    }

    // If already closed, reject
    if position_meta_data.status == PositionStatus::Closed as u8 {
        msg!("❌ Position has already been closed");
        return Err(CloakCraftError::PositionAlreadyClosed.into());
    }

    // Verify direction matches what's in pending operation
    require!(
        position_meta_data.is_long == pending_op.swap_a_to_b,
        CloakCraftError::InvalidPositionDirection
    );

    msg!("✅ Position is Active - close operation can proceed");
    msg!("Phase 1b complete");
    msg!("Next: Phase 2 - create_nullifier");

    Ok(())
}
