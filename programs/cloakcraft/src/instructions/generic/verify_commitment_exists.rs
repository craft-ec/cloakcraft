//! Verify Commitment Exists Phase 1 - Verify commitment is in Light Protocol state tree (GENERIC)
//!
//! SECURITY CRITICAL: This prevents spending non-existent commitments.
//!
//! This is Phase 1 of the append pattern multi-phase operation.
//! It verifies that the input commitment from Phase 0 actually exists on-chain.
//!
//! SECURITY BINDING: The commitment parameter must match pending_op.input_commitment
//! from Phase 0. This prevents commitment swap attacks.
//!
//! Generic Flow (ANY spend operation):
//! Phase 0: Verify ZK proof + Create PendingOperation (stores input_commitment)
//! Phase 1 (this): Verify commitment exists (must match input_commitment from Phase 0)
//! Phase 2: Create nullifier (must match expected_nullifier from Phase 0)
//! Phase 3: Execute operation logic (operation-specific)
//! Phase 4+: Create commitments (GENERIC)
//! Final: Close pending operation (GENERIC)

use anchor_lang::prelude::*;

use crate::state::{Pool, PendingOperation, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

/// Merkle context for commitment verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CommitmentMerkleContext {
    pub merkle_tree_pubkey_index: u8,
    pub queue_pubkey_index: u8,
    pub leaf_index: u32,
    pub root_index: u16,
}

/// Parameters for commitment inclusion verification
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightVerifyCommitmentParams {
    /// Account hash of commitment to verify
    pub commitment_account_hash: [u8; 32],
    /// Merkle context proving commitment exists
    pub commitment_merkle_context: CommitmentMerkleContext,
    /// Inclusion proof for commitment (from getInclusionProofByHash)
    pub commitment_inclusion_proof: LightValidityProof,
    /// Address tree info for commitment
    pub commitment_address_tree_info: LightAddressTreeInfo,
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct VerifyCommitmentExists<'info> {
    /// Pool
    #[account(
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Pending operation PDA (from Phase 0)
    /// Note: commitment_verified constraint removed - now checked per-input via bitmask in function
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = !pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationExpired,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (pays for Light Protocol CPI, must match pending operation)
    #[account(
        mut,
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    // Light Protocol accounts via remaining_accounts (~8 accounts)
}

/// Phase 1: Verify commitment exists in Light Protocol state tree (GENERIC)
///
/// SECURITY CRITICAL: This prevents the attack where someone:
/// 1. Generates a fake commitment
/// 2. Creates valid ZK proof (proves math, not on-chain existence)
/// 3. Creates nullifier (would succeed without this check)
/// 4. Withdraws tokens they never deposited
///
/// SECURITY BINDING: Commitment must match pending_op.input_commitments[index] from Phase 0.
/// This prevents commitment swap attacks where attacker proves one commitment
/// but tries to spend a different one.
///
/// This instruction is GENERIC and works for ALL spend operations:
/// - Transfer: verify input commitment (index=0)
/// - Swap: verify input commitment (index=0)
/// - Remove Liquidity: verify LP commitment (index=0)
/// - Add Liquidity: verify input A (index=0), then input B (index=1)
/// - Market: verify escrow commitment (index=0)
///
/// For multi-input operations, call this instruction multiple times with different indices.
///
/// This phase uses Light Protocol CPI with inclusion proof (~8 Light accounts).
/// Updates state: Sets bit in inputs_verified_mask.
pub fn verify_commitment_exists<'info>(
    ctx: Context<'_, '_, '_, 'info, VerifyCommitmentExists<'info>>,
    _operation_id: [u8; 32],
    commitment_index: u8,
    light_params: LightVerifyCommitmentParams,
) -> Result<()> {
    let pool = &ctx.accounts.pool;
    let pending_op = &mut ctx.accounts.pending_operation;

    msg!("=== Phase 1: Verify Commitment Exists (GENERIC SECURITY CHECK) ===");
    msg!("Pool: {:?}", pool.key());
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
    // This prevents attacker from passing a different commitment
    let input_commitment = pending_op.input_commitments[commitment_index as usize];

    // SECURITY: Verify pool matches what Phase 0 expects
    // This prevents pool confusion attacks in multi-pool operations
    let expected_pool = pending_op.input_pools[commitment_index as usize];
    require!(
        pool.key().to_bytes() == expected_pool,
        CloakCraftError::PoolMismatch
    );

    msg!("Commitment from Phase 0: {:02x?}...", &input_commitment[0..8]);
    msg!("Expected pool: {:?}", Pubkey::try_from(expected_pool).unwrap_or_default());
    msg!("Provided pool: {:?}", pool.key());
    msg!("Account hash: {:02x?}...", &light_params.commitment_account_hash[0..8]);

    // SECURITY: Verify THIS EXACT commitment exists in Light Protocol state tree
    crate::light_cpi::verify_commitment_inclusion(
        &ctx.accounts.relayer.to_account_info(),
        ctx.remaining_accounts,
        light_params.commitment_account_hash,
        light_params.commitment_merkle_context,
        light_params.commitment_inclusion_proof,
        light_params.commitment_address_tree_info,
        input_commitment,
        pool.key(),
    )?;

    msg!("✅ Commitment verified - exists in state tree");

    // SECURITY: Mark commitment as verified
    pending_op.inputs_verified_mask |= bit_mask;

    // Check if all inputs verified
    let all_verified_mask = (1u8 << pending_op.num_inputs) - 1;
    if pending_op.inputs_verified_mask == all_verified_mask {
        msg!("✅ All {} input commitments verified", pending_op.num_inputs);
    } else {
        msg!("✅ Commitment {} verified ({}/{} total)",
            commitment_index,
            pending_op.inputs_verified_mask.count_ones(),
            pending_op.num_inputs);
    }

    msg!("Phase 1 complete: commitment {} verified", commitment_index);
    msg!("Next: Phase 2 - create_nullifier_and_pending (index={})", commitment_index);

    Ok(())
}
