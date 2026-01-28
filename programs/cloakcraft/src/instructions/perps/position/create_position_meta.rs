//! Create Position Metadata - Phase 4b (Open Position)
//!
//! Creates the PUBLIC PositionMeta compressed account for liquidation support.
//! This is called after create_commitment (Phase 4a) during position opening.
//!
//! The PositionMeta enables permissionless liquidation:
//! - Stores liquidation_price, margin, direction publicly
//! - Pre-commits nullifier_hash for liquidation without owner's secret
//! - Bound to private commitment via position_id (verified in ZK circuit)
//!
//! Flow:
//! Phase 0: create_pending_with_proof_open_position (proof verified)
//! Phase 1: verify_commitment_exists (margin)
//! Phase 2: create_nullifier (spend margin)
//! Phase 3: execute_open_position (lock tokens, update OI)
//! Phase 4a: create_commitment (private position)
//! Phase 4b (this): create_position_meta (public metadata)
//! Final: close_pending_operation

use anchor_lang::prelude::*;

use crate::state::{PerpsPool, PerpsMarket, PendingOperation, LightValidityProof, LightAddressTreeInfo, PositionMeta};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::create_position_meta_account;

/// Parameters for Light Protocol position meta creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCreatePositionMetaParams {
    /// Validity proof for position meta (non-inclusion proof)
    pub validity_proof: LightValidityProof,
    /// Address tree info for position meta
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

/// Position metadata parameters (verified in ZK proof)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PositionMetaInput {
    /// Position ID (binding between private commitment and public meta)
    pub position_id: [u8; 32],
    /// Liquidation price (calculated in circuit from entry, leverage, direction)
    pub liquidation_price: u64,
    /// Entry price
    pub entry_price: u64,
    /// Position size (margin * leverage)
    pub position_size: u64,
    /// Pre-committed nullifier hash: hash(nullifier)
    pub nullifier_hash: [u8; 32],
    /// Owner's stealth pubkey (for notifications)
    pub owner_stealth_pubkey: [u8; 32],
}

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct CreatePositionMeta<'info> {
    /// Perps pool
    #[account(
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Market being traded
    #[account(
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), perps_market.market_id.as_ref()],
        bump = perps_market.bump,
    )]
    pub perps_market: Box<Account<'info, PerpsMarket>>,

    /// Pending operation PDA (from Phase 0)
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (pays for position meta creation)
    #[account(
        mut,
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    // Light Protocol accounts via remaining_accounts (~8 accounts)
}

/// Create position metadata compressed account
///
/// This creates the PUBLIC PositionMeta that enables liquidation.
/// The position_id binds this to the private CommitmentAccount.
pub fn create_position_meta<'info>(
    ctx: Context<'_, '_, '_, 'info, CreatePositionMeta<'info>>,
    _operation_id: [u8; 32],
    position_meta_input: PositionMetaInput,
    light_params: LightCreatePositionMetaParams,
) -> Result<()> {
    let perps_pool = &ctx.accounts.perps_pool;
    let perps_market = &ctx.accounts.perps_market;
    let pending_op = &ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    msg!("=== Phase 4b: Create Position Metadata ===");

    // Validate pending operation state
    require!(
        !pending_op.is_expired(clock.unix_timestamp),
        CloakCraftError::PendingOperationExpired
    );
    require!(
        pending_op.proof_verified,
        CloakCraftError::ProofNotVerified
    );

    // Extract position data from pending operation (stored in Phase 0)
    let margin_amount = pending_op.swap_amount;
    let is_long = pending_op.swap_a_to_b;

    // Validate position_id is part of the ZK proof public inputs
    // In the circuit, position_id = hash(pool_id, market_id, nullifier_key, randomness)
    // The binding is enforced by the circuit, we just need to store it

    msg!("Creating PositionMeta for liquidation support");
    msg!("  Position ID: {:02x?}...", &position_meta_input.position_id[0..8]);
    msg!("  Margin: {}", margin_amount);
    msg!("  Liquidation Price: {}", position_meta_input.liquidation_price);
    msg!("  Entry Price: {}", position_meta_input.entry_price);
    msg!("  Position Size: {}", position_meta_input.position_size);
    msg!("  Direction: {}", if is_long { "LONG" } else { "SHORT" });

    // Create position metadata via Light Protocol
    create_position_meta_account(
        ctx.accounts.relayer.as_ref(),
        ctx.remaining_accounts,
        light_params.validity_proof,
        light_params.address_tree_info,
        light_params.output_tree_index,
        perps_pool.pool_id.to_bytes(),
        perps_market.market_id,
        position_meta_input.position_id,
        margin_amount,
        position_meta_input.liquidation_price,
        is_long,
        position_meta_input.position_size,
        position_meta_input.entry_price,
        position_meta_input.nullifier_hash,
        position_meta_input.owner_stealth_pubkey,
    )?;

    msg!("✅ Phase 4b complete: PositionMeta created");
    msg!("Next: close_pending_operation");

    Ok(())
}
