//! Position Metadata - Public compressed account for liquidation
//!
//! Each perps position has two compressed accounts:
//! 1. CommitmentAccount (private) - encrypted position details
//! 2. PositionMeta (public) - liquidation parameters, queryable by keepers
//!
//! Both are bound together via `position_id` enforced in the ZK circuit.
//!
//! This enables permissionless liquidation:
//! - Keepers query PositionMeta via Photon API
//! - Check oracle price vs liquidation_price
//! - If underwater, publish pre-committed nullifier
//! - Position becomes unspendable by owner

use anchor_lang::prelude::*;
use light_sdk::LightDiscriminator;

/// Position status for lifecycle tracking
#[derive(Clone, Copy, Debug, PartialEq, Eq, AnchorSerialize, AnchorDeserialize, Default)]
#[repr(u8)]
pub enum PositionStatus {
    /// Position is active and can be modified/closed by owner
    #[default]
    Active = 0,
    /// Position was liquidated - commitment is now unspendable
    Liquidated = 1,
    /// Position was closed normally by owner
    Closed = 2,
}

impl From<u8> for PositionStatus {
    fn from(value: u8) -> Self {
        match value {
            0 => PositionStatus::Active,
            1 => PositionStatus::Liquidated,
            2 => PositionStatus::Closed,
            _ => PositionStatus::Active,
        }
    }
}

/// Public position metadata - stored as compressed account
///
/// This account is readable by anyone and enables permissionless liquidation.
/// It's bound to the private CommitmentAccount via position_id in the ZK proof.
///
/// Seeds: ["position_meta", pool_id, position_id]
#[derive(Clone, Debug, LightDiscriminator, AnchorSerialize, AnchorDeserialize)]
pub struct PositionMeta {
    // =========================================================================
    // Binding Fields (link to private commitment)
    // =========================================================================
    
    /// Unique position identifier
    /// Derived in ZK circuit: position_id = hash(pool_id, market_id, nullifier_key, randomness)
    /// Same value stored in private commitment for binding
    pub position_id: [u8; 32],
    
    /// Pool this position belongs to
    pub pool_id: [u8; 32],
    
    /// Market being traded (e.g., SOL-PERP)
    pub market_id: [u8; 32],
    
    // =========================================================================
    // Liquidation Parameters (public for keeper access)
    // =========================================================================
    
    /// Margin amount locked for this position
    pub margin_amount: u64,
    
    /// Price at which position becomes liquidatable
    /// For LONG: liquidation if current_price <= liquidation_price
    /// For SHORT: liquidation if current_price >= liquidation_price
    pub liquidation_price: u64,
    
    /// Position direction
    pub is_long: bool,
    
    /// Position size (margin * leverage)
    pub position_size: u64,
    
    /// Entry price (for PnL calculation)
    pub entry_price: u64,
    
    // =========================================================================
    // Nullifier Pre-commitment (for liquidation without owner's secret)
    // =========================================================================
    
    /// Pre-committed nullifier hash: hash(nullifier)
    /// The actual nullifier = hash(DOMAIN, nullifier_key, position_id)
    /// Liquidator can publish this hash to invalidate the position
    /// without knowing the nullifier_key
    pub nullifier_hash: [u8; 32],
    
    // =========================================================================
    // Status & Timestamps
    // =========================================================================
    
    /// Current position status
    pub status: u8,  // PositionStatus as u8 for serialization
    
    /// Timestamp when position was opened
    pub created_at: i64,
    
    /// Timestamp of last status update
    pub updated_at: i64,
    
    /// Owner's stealth address (for notifications, optional)
    /// Not used for auth - just for off-chain indexing
    pub owner_stealth_pubkey: [u8; 32],
}

impl Default for PositionMeta {
    fn default() -> Self {
        Self {
            position_id: [0u8; 32],
            pool_id: [0u8; 32],
            market_id: [0u8; 32],
            margin_amount: 0,
            liquidation_price: 0,
            is_long: false,
            position_size: 0,
            entry_price: 0,
            nullifier_hash: [0u8; 32],
            status: PositionStatus::Active as u8,
            created_at: 0,
            updated_at: 0,
            owner_stealth_pubkey: [0u8; 32],
        }
    }
}

impl PositionMeta {
    /// Seeds prefix for address derivation
    pub const SEED_PREFIX: &'static [u8] = b"position_meta";
    
    /// Check if position is active
    pub fn is_active(&self) -> bool {
        self.status == PositionStatus::Active as u8
    }
    
    /// Check if position is liquidated
    pub fn is_liquidated(&self) -> bool {
        self.status == PositionStatus::Liquidated as u8
    }
    
    /// Check if position should be liquidated at given price
    pub fn is_liquidatable(&self, current_price: u64) -> bool {
        if !self.is_active() {
            return false;
        }
        
        if self.is_long {
            // Long position: liquidate when price drops below threshold
            current_price <= self.liquidation_price
        } else {
            // Short position: liquidate when price rises above threshold
            current_price >= self.liquidation_price
        }
    }
    
    /// Calculate liquidation price from position parameters
    /// 
    /// For LONG: liq_price = entry_price * (1 - 1/leverage + maintenance_margin_ratio)
    /// For SHORT: liq_price = entry_price * (1 + 1/leverage - maintenance_margin_ratio)
    /// 
    /// Simplified: liq_price = entry_price * (1 ± margin_ratio)
    /// where margin_ratio = margin / position_size = 1 / leverage
    pub fn calculate_liquidation_price(
        entry_price: u64,
        leverage: u8,
        is_long: bool,
        maintenance_margin_bps: u16,  // e.g., 50 = 0.5%
    ) -> u64 {
        // margin_ratio = 1 / leverage (as basis points for precision)
        let margin_ratio_bps = 10000u64 / leverage as u64;
        
        // Liquidation buffer = margin_ratio - maintenance_margin
        // Position is liquidated when losses eat into maintenance margin
        let buffer_bps = margin_ratio_bps.saturating_sub(maintenance_margin_bps as u64);
        
        if is_long {
            // Long: liq when price drops by buffer_bps
            // liq_price = entry_price * (1 - buffer_bps / 10000)
            let loss_amount = (entry_price as u128)
                .checked_mul(buffer_bps as u128)
                .unwrap_or(0)
                .checked_div(10000)
                .unwrap_or(0) as u64;
            entry_price.saturating_sub(loss_amount)
        } else {
            // Short: liq when price rises by buffer_bps
            // liq_price = entry_price * (1 + buffer_bps / 10000)
            let gain_amount = (entry_price as u128)
                .checked_mul(buffer_bps as u128)
                .unwrap_or(0)
                .checked_div(10000)
                .unwrap_or(0) as u64;
            entry_price.saturating_add(gain_amount)
        }
    }
}

/// Parameters for creating PositionMeta in ZK proof public inputs
/// These are verified in the circuit and passed to the on-chain instruction
#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct PositionMetaParams {
    pub position_id: [u8; 32],
    pub liquidation_price: u64,
    pub entry_price: u64,
    pub position_size: u64,
    pub nullifier_hash: [u8; 32],
    pub owner_stealth_pubkey: [u8; 32],
}
