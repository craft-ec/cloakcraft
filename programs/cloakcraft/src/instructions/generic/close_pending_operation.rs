//! Close pending operation and reclaim rent
//!
//! This instruction closes a pending operation PDA and returns the rent to the relayer.
//! Can be called after all nullifiers and commitments are created, or after expiry.

use anchor_lang::prelude::*;

use crate::state::PendingOperation;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ClosePendingOperation<'info> {
    /// Pending operation PDA
    #[account(
        mut,
        close = relayer,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = pending_operation.is_complete() || pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationNotComplete,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (receives rent back)
    #[account(mut)]
    pub relayer: Signer<'info>,
}

pub fn close_pending_operation(
    _ctx: Context<ClosePendingOperation>,
    _operation_id: [u8; 32],
) -> Result<()> {
    // Account is closed automatically via close constraint
    Ok(())
}
