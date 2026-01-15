//! Create Nullifier and Pending Operation - Phase 2 (GENERIC, Append Pattern)
//!
//! This is Phase 2 of the append pattern multi-phase operation.
//! It creates the nullifier for the verified commitment.
//!
//! SECURITY BINDING: The nullifier must match pending_op.expected_nullifier
//! from Phase 0. This prevents nullifier swap attacks.
//!
//! SECURITY REQUIREMENT: pending_op.commitment_verified must be true.
//! This ensures commitment existence was verified in Phase 1.
//!
//! CRITICAL POINT: After this phase, the commitment is marked as spent.
//! Output commitments MUST be created or funds will be lost.
//!
//! Generic Flow:
//! Phase 0: Verify ZK proof + Create PendingOperation
//! Phase 1: Verify commitment exists
//! Phase 2 (this): Create nullifier (CRITICAL POINT)
//! Phase 3: Execute operation logic
//! Phase 4+: Create commitments
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, PendingOperation, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::create_spend_nullifier_account;

/// Parameters for Light Protocol nullifier creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCreateNullifierAndPendingParams {
    /// Validity proof for nullifier (non-inclusion proof)
    pub proof: LightValidityProof,
    /// Address tree info for nullifier
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreateNullifierAndPending<'info> {
    /// Pool for this nullifier
    #[account(
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Pending operation PDA (from Phase 0)
    /// Note: commitment_verified and nullifier_created constraints removed - now checked per-input via bitmask in function
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = !pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationExpired,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
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

/// Phase 2: Create nullifier for verified commitment (GENERIC)
///
/// CRITICAL: This is the point of no return. After the nullifier is created,
/// the commitment is marked as spent and output commitments MUST be created
/// or the funds will be lost.
///
/// SECURITY BINDING: Nullifier is read from pending_op.expected_nullifiers[index]
/// (set in Phase 0 from ZK proof). This prevents nullifier swap attacks.
///
/// SECURITY REQUIREMENT: Requires corresponding commitment verified (bit set in inputs_verified_mask).
///
/// This instruction is GENERIC and works for ALL operations:
/// - Transfer: create nullifier for input (index=0)
/// - Swap: create nullifier for input (index=0)
/// - Remove Liquidity: create nullifier for LP token (index=0)
/// - Add Liquidity: create nullifier for input A (index=0), then input B (index=1)
/// - Market: create nullifier for escrow (index=0)
///
/// For multi-input operations, call this instruction multiple times with different indices.
///
/// Uses ~8 Light Protocol accounts for nullifier creation.
pub fn create_nullifier_and_pending<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateNullifierAndPending<'info>>,
    _operation_id: [u8; 32],
    nullifier_index: u8,
    light_params: LightCreateNullifierAndPendingParams,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let pending_op = &mut ctx.accounts.pending_operation;

    msg!("=== Phase 2: Create Nullifier (CRITICAL POINT) ===");
    msg!("Pool: {:?}", pool.key());
    msg!("Nullifier index: {}", nullifier_index);

    // VALIDATION: Check index is within bounds
    require!(
        (nullifier_index as usize) < pending_op.num_inputs as usize,
        CloakCraftError::InvalidNullifierIndex
    );

    // SECURITY: Check corresponding commitment was verified in Phase 1
    let bit_mask = 1u8 << nullifier_index;
    require!(
        (pending_op.inputs_verified_mask & bit_mask) != 0,
        CloakCraftError::CommitmentNotVerified
    );

    // VALIDATION: Check this nullifier hasn't been created yet
    require!(
        (pending_op.nullifier_completed_mask & bit_mask) == 0,
        CloakCraftError::NullifierAlreadyCreated
    );

    // SECURITY: Get nullifier from Phase 0 (NOT from function parameter!)
    // This prevents attacker from passing a different nullifier
    let nullifier = pending_op.expected_nullifiers[nullifier_index as usize];

    // SECURITY: Verify pool matches what Phase 0 expects
    // This prevents pool confusion attacks in multi-pool operations
    // E.g., prevents creating nullifier in wrong pool during swap
    let expected_pool = pending_op.input_pools[nullifier_index as usize];
    require!(
        pool.key().to_bytes() == expected_pool,
        CloakCraftError::PoolMismatch
    );

    msg!("Nullifier from Phase 0: {:02x?}...", &nullifier[0..8]);
    msg!("Expected pool: {:?}", Pubkey::try_from(expected_pool).unwrap_or_default());
    msg!("Provided pool: {:?}", pool.key());
    msg!("CRITICAL: Commitment will be marked as spent!");

    // SECURITY: Create spend nullifier via Light Protocol (prevents double-spend)
    create_spend_nullifier_account(
        &ctx.accounts.relayer.to_account_info(),
        ctx.remaining_accounts,
        light_params.proof,
        light_params.address_tree_info,
        light_params.output_tree_index,
        pool.key(),
        nullifier,
    )?;

    msg!("✅ Nullifier created - commitment marked as spent");

    // SECURITY: Mark nullifier as created
    pending_op.nullifier_completed_mask |= bit_mask;

    // Check if all nullifiers created
    let all_nullifiers_mask = (1u8 << pending_op.num_inputs) - 1;
    if pending_op.nullifier_completed_mask == all_nullifiers_mask {
        msg!("✅ All {} nullifiers created - point of no return passed", pending_op.num_inputs);
    } else {
        msg!("✅ Nullifier {} created ({}/{} total)",
            nullifier_index,
            pending_op.nullifier_completed_mask.count_ones(),
            pending_op.num_inputs);
    }

    msg!("Phase 2 complete: nullifier {} created", nullifier_index);
    msg!("Next: Phase 3 - execute operation logic (when all nullifiers created)");

    Ok(())
}
