//! Liquidate Position with Metadata
//!
//! Permissionless liquidation using PositionMeta compressed account.
//! Any keeper can liquidate underwater positions by:
//! 1. Reading PositionMeta from indexer (Photon API)
//! 2. Checking oracle price vs liquidation_price
//! 3. Calling this instruction with the position data
//!
//! This approach doesn't require the keeper to generate ZK proofs.
//! The pre-committed nullifier_hash allows invalidating the position
//! without knowing the owner's secret nullifier_key.
//!
//! Flow:
//! 1. Keeper queries PositionMeta via Photon API
//! 2. Keeper checks if position is liquidatable (oracle vs liq_price)
//! 3. Keeper calls liquidate_with_meta
//! 4. On-chain: Verify PositionMeta inclusion + price check
//! 5. On-chain: Create liquidation nullifier from pre-committed hash
//! 6. On-chain: Update PositionMeta status to Liquidated
//! 7. On-chain: Unlock margin, pay keeper reward

use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use crate::state::{PerpsPool, PerpsMarket, PositionStatus, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::light_cpi::{
    verify_position_meta_inclusion, create_position_status_record,
    create_liquidation_nullifier, PositionMetaMerkleContext,
};
use crate::pyth;

/// Light Protocol parameters for liquidation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightLiquidateParams {
    /// Proof for verifying PositionMeta inclusion
    pub inclusion_proof: LightValidityProof,
    /// Proof for creating liquidation nullifier
    pub nullifier_proof: LightValidityProof,
    /// Proof for creating position status record
    pub status_proof: LightValidityProof,
    /// Address tree info
    pub address_tree_info: LightAddressTreeInfo,
    /// Merkle context for PositionMeta
    pub merkle_context: PositionMetaMerkleContext,
    /// Output state tree index for new accounts
    pub output_tree_index: u8,
}

/// Position metadata from indexer (all fields for update)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PositionMetaForLiquidation {
    // Identifiers
    pub position_id: [u8; 32],
    pub market_id: [u8; 32],
    pub account_hash: [u8; 32],
    
    // Position data
    pub margin_amount: u64,
    pub liquidation_price: u64,
    pub is_long: bool,
    pub position_size: u64,
    pub entry_price: u64,
    
    // For nullifier creation
    pub nullifier_hash: [u8; 32],
    
    // Current status (must be Active)
    pub status: u8,
    pub created_at: i64,
    
    // Owner info
    pub owner_stealth_pubkey: [u8; 32],
}

#[derive(Accounts)]
pub struct LiquidateWithMeta<'info> {
    /// Perps pool
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Market being traded
    #[account(
        mut,
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), perps_market.market_id.as_ref()],
        bump = perps_market.bump,
        constraint = perps_market.pool == perps_pool.key() @ CloakCraftError::PerpsMarketNotFound,
    )]
    pub perps_market: Box<Account<'info, PerpsMarket>>,

    /// Pyth price update account
    pub price_update: Account<'info, PriceUpdateV2>,

    /// Keeper (anyone can liquidate, receives reward)
    #[account(mut)]
    pub keeper: Signer<'info>,

    // Light Protocol accounts via remaining_accounts (~12 accounts)
    // - Address tree
    // - State tree  
    // - Queue
    // - etc.
}

/// Liquidate an underwater position using PositionMeta
///
/// This is the main liquidation entry point for keepers.
/// No ZK proof generation required - just read PositionMeta from indexer
/// and verify the position is underwater.
pub fn liquidate_with_meta<'info>(
    ctx: Context<'_, '_, '_, 'info, LiquidateWithMeta<'info>>,
    position_meta: PositionMetaForLiquidation,
    light_params: LightLiquidateParams,
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;
    let perps_market = &mut ctx.accounts.perps_market;
    let price_update = &ctx.accounts.price_update;
    let clock = Clock::get()?;

    msg!("=== Liquidate Position with Metadata ===");
    msg!("Position ID: {:02x?}...", &position_meta.position_id[0..8]);
    msg!("Margin: {}", position_meta.margin_amount);
    msg!("Liquidation Price: {}", position_meta.liquidation_price);
    msg!("Direction: {}", if position_meta.is_long { "LONG" } else { "SHORT" });

    // 1. Verify position meta exists in state tree
    msg!("Step 1: Verifying PositionMeta inclusion...");
    verify_position_meta_inclusion(
        ctx.accounts.keeper.as_ref(),
        ctx.remaining_accounts,
        position_meta.account_hash,
        light_params.merkle_context.clone(),
        perps_pool.pool_id.to_bytes(),
        position_meta.position_id,
    )?;
    msg!("✅ PositionMeta verified");

    // 2. Check position is Active
    require!(
        position_meta.status == PositionStatus::Active as u8,
        CloakCraftError::PositionNotActive
    );

    // 3. Verify market_id matches
    require!(
        position_meta.market_id == perps_market.market_id,
        CloakCraftError::PerpsMarketNotFound
    );

    // 4. Get current price from oracle
    let base_token_index = perps_market.base_token_index;
    let base_token = perps_pool.get_token(base_token_index)
        .ok_or(CloakCraftError::TokenNotInPool)?;

    let current_price = pyth::get_price(price_update, &base_token.pyth_feed_id, &clock)?;
    msg!("Current price: {}", current_price);

    // 5. Check if position is liquidatable
    let is_liquidatable = if position_meta.is_long {
        // Long position: liquidate when price drops below threshold
        current_price <= position_meta.liquidation_price
    } else {
        // Short position: liquidate when price rises above threshold
        current_price >= position_meta.liquidation_price
    };

    require!(is_liquidatable, CloakCraftError::PositionNotLiquidatable);
    msg!("✅ Position is liquidatable (price {} vs liq_price {})",
        current_price, position_meta.liquidation_price);

    // 6. Create liquidation nullifier using pre-committed hash
    // This prevents the owner from closing the position later
    msg!("Step 2: Creating liquidation nullifier...");
    create_liquidation_nullifier(
        ctx.accounts.keeper.as_ref(),
        ctx.remaining_accounts,
        light_params.nullifier_proof,
        light_params.address_tree_info.clone(),
        light_params.output_tree_index,
        perps_pool.pool_id.to_bytes(),
        position_meta.nullifier_hash,
    )?;
    msg!("✅ Liquidation nullifier created");

    // 7. Create position status record (marks as Liquidated)
    msg!("Step 3: Creating position status record...");
    create_position_status_record(
        ctx.accounts.keeper.as_ref(),
        ctx.remaining_accounts,
        light_params.status_proof,
        light_params.address_tree_info.clone(),
        light_params.output_tree_index,
        perps_pool.pool_id.to_bytes(),
        position_meta.position_id,
        PositionStatus::Liquidated,
    )?;
    msg!("✅ Position marked as Liquidated");

    // 8. Calculate and distribute liquidation proceeds
    let liquidation_penalty = (position_meta.margin_amount as u128)
        .checked_mul(perps_pool.liquidation_penalty_bps as u128)
        .unwrap_or(0)
        .checked_div(10000)
        .unwrap_or(0) as u64;

    // Keeper gets the penalty as reward
    let keeper_reward = liquidation_penalty;
    // Remaining goes back to pool
    let pool_receives = position_meta.margin_amount.saturating_sub(liquidation_penalty);

    msg!("Liquidation proceeds:");
    msg!("  Keeper reward: {}", keeper_reward);
    msg!("  Pool receives: {}", pool_receives);

    // 9. Unlock tokens from pool
    let base_token_index = perps_market.base_token_index;
    let quote_token_index = perps_market.quote_token_index;
    
    if let Some(base_token) = perps_pool.get_token_mut(base_token_index) {
        base_token.locked = base_token.locked.saturating_sub(position_meta.margin_amount);
    }
    if let Some(quote_token) = perps_pool.get_token_mut(quote_token_index) {
        quote_token.locked = quote_token.locked.saturating_sub(position_meta.margin_amount);
    }

    // 10. Update market open interest
    perps_market.remove_open_interest(position_meta.position_size, position_meta.is_long);

    msg!("✅ Position liquidated successfully");
    msg!("Market OI - Long: {}, Short: {}",
        perps_market.long_open_interest,
        perps_market.short_open_interest);

    // TODO: Transfer keeper_reward to keeper via CPI to token program
    // This would require vault accounts and token transfers
    // For now, the keeper reward accounting is done but actual transfer needs implementation

    Ok(())
}
