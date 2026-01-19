//! Perpetual futures market (trading pair)
//!
//! Represents a trading pair within a perps pool (e.g., SOL/USD, ETH/USD).
//! Tracks open interest and imbalance for fee calculations.

use anchor_lang::prelude::*;

/// Perpetual futures market for a trading pair
#[account]
#[derive(Default, InitSpace)]
pub struct PerpsMarket {
    /// Unique market identifier (32-byte hash)
    pub market_id: [u8; 32],

    /// Associated perps pool
    pub pool: Pubkey,

    /// Base token index in pool.tokens (e.g., SOL for SOL/USD)
    pub base_token_index: u8,

    /// Quote token index in pool.tokens (e.g., USDC for SOL/USD)
    pub quote_token_index: u8,

    /// Total long open interest (in base token units)
    pub long_open_interest: u64,

    /// Total short open interest (in base token units)
    pub short_open_interest: u64,

    /// Maximum position size (in base token units, 0 = unlimited)
    pub max_position_size: u64,

    /// Whether the market is active for trading
    pub is_active: bool,

    /// PDA bump seed
    pub bump: u8,

    /// Reserved for future use
    pub _reserved: [u8; 32],
}

impl PerpsMarket {
    /// PDA seeds prefix
    pub const SEEDS_PREFIX: &'static [u8] = b"perps_market";

    /// Calculate total open interest
    pub fn total_open_interest(&self) -> u64 {
        self.long_open_interest.saturating_add(self.short_open_interest)
    }

    /// Calculate open interest imbalance ratio (scaled by 10000)
    /// Returns (imbalance_ratio, is_long_dominant)
    /// imbalance_ratio = |long - short| / (long + short) * 10000
    pub fn calculate_imbalance(&self) -> (u16, bool) {
        let total = self.total_open_interest();
        if total == 0 {
            return (0, false);
        }

        let is_long_dominant = self.long_open_interest >= self.short_open_interest;
        let diff = if is_long_dominant {
            self.long_open_interest.saturating_sub(self.short_open_interest)
        } else {
            self.short_open_interest.saturating_sub(self.long_open_interest)
        };

        let imbalance_ratio = (diff as u128)
            .checked_mul(10000)
            .unwrap_or(0)
            .checked_div(total as u128)
            .unwrap_or(0);

        (imbalance_ratio.min(10000) as u16, is_long_dominant)
    }

    /// Calculate imbalance fee for opening a position
    /// is_long: true if opening a long position
    /// max_fee_bps: maximum fee in basis points
    /// Returns fee in basis points (0 if position helps balance)
    pub fn calculate_imbalance_fee(&self, is_long: bool, max_fee_bps: u16) -> u16 {
        let (imbalance_ratio, is_long_dominant) = self.calculate_imbalance();

        // If opening in the dominant direction, apply fee
        // If opening in minority direction, no fee (helps balance)
        if is_long == is_long_dominant {
            // Fee = max_fee * imbalance_ratio / 10000
            let fee = (max_fee_bps as u32)
                .checked_mul(imbalance_ratio as u32)
                .unwrap_or(0)
                .checked_div(10000)
                .unwrap_or(0);
            fee.min(max_fee_bps as u32) as u16
        } else {
            0
        }
    }

    /// Update open interest when opening a position
    pub fn add_open_interest(&mut self, size: u64, is_long: bool) {
        if is_long {
            self.long_open_interest = self.long_open_interest.saturating_add(size);
        } else {
            self.short_open_interest = self.short_open_interest.saturating_add(size);
        }
    }

    /// Update open interest when closing a position
    pub fn remove_open_interest(&mut self, size: u64, is_long: bool) {
        if is_long {
            self.long_open_interest = self.long_open_interest.saturating_sub(size);
        } else {
            self.short_open_interest = self.short_open_interest.saturating_sub(size);
        }
    }

    /// Check if adding a position would exceed max position size
    pub fn check_position_size(&self, size: u64) -> bool {
        if self.max_position_size == 0 {
            return true; // No limit
        }
        size <= self.max_position_size
    }
}

/// Position direction
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, Default, InitSpace)]
pub enum PositionDirection {
    #[default]
    Long,
    Short,
}

impl PositionDirection {
    pub fn is_long(&self) -> bool {
        matches!(self, PositionDirection::Long)
    }
}

/// Position state for tracking within commitments
/// This is stored off-chain in the encrypted note, not on-chain
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default)]
pub struct PositionData {
    /// Market ID
    pub market_id: [u8; 32],

    /// Position direction (long/short)
    pub direction: PositionDirection,

    /// Margin amount (collateral)
    pub margin: u64,

    /// Position size (in base token units)
    pub size: u64,

    /// Leverage (1-100)
    pub leverage: u8,

    /// Entry price (scaled by 1e6)
    pub entry_price: u64,

    /// Cumulative borrow fee at entry (for fee calculation)
    pub entry_cumulative_borrow_fee: u128,

    /// Timestamp when position was opened
    pub opened_at: i64,
}

impl PositionData {
    /// Calculate position value at current price
    /// Returns (value, is_profit)
    pub fn calculate_pnl(&self, current_price: u64) -> (u64, bool) {
        // For long: profit = (current_price - entry_price) * size / entry_price
        // For short: profit = (entry_price - current_price) * size / entry_price

        let is_profit = match self.direction {
            PositionDirection::Long => current_price >= self.entry_price,
            PositionDirection::Short => current_price <= self.entry_price,
        };

        let price_diff = if is_profit {
            match self.direction {
                PositionDirection::Long => current_price.saturating_sub(self.entry_price),
                PositionDirection::Short => self.entry_price.saturating_sub(current_price),
            }
        } else {
            match self.direction {
                PositionDirection::Long => self.entry_price.saturating_sub(current_price),
                PositionDirection::Short => current_price.saturating_sub(self.entry_price),
            }
        };

        // PnL = price_diff * size / entry_price
        let pnl = (price_diff as u128)
            .checked_mul(self.size as u128)
            .unwrap_or(0)
            .checked_div(self.entry_price as u128)
            .unwrap_or(0) as u64;

        (pnl, is_profit)
    }

    /// Calculate effective margin after PnL
    pub fn effective_margin(&self, current_price: u64) -> u64 {
        let (pnl, is_profit) = self.calculate_pnl(current_price);
        if is_profit {
            // Bounded profit: max profit = margin
            self.margin.saturating_add(pnl.min(self.margin))
        } else {
            self.margin.saturating_sub(pnl)
        }
    }

    /// Check if position should be liquidated
    /// liquidation_threshold_bps: margin percentage at which liquidation occurs
    pub fn is_liquidatable(&self, current_price: u64, liquidation_threshold_bps: u16) -> bool {
        let effective = self.effective_margin(current_price);
        let threshold = (self.margin as u128)
            .checked_mul(liquidation_threshold_bps as u128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0) as u64;

        effective <= threshold
    }

    /// Calculate liquidation price
    /// Returns the price at which position gets liquidated
    pub fn liquidation_price(&self, liquidation_threshold_bps: u16) -> u64 {
        // For long: liq_price = entry_price * (1 - margin/size * (1 - threshold/10000))
        // For short: liq_price = entry_price * (1 + margin/size * (1 - threshold/10000))

        let margin_ratio = (self.margin as u128)
            .checked_mul(10000)
            .unwrap_or(0)
            .checked_div(self.size as u128)
            .unwrap_or(0);

        let effective_ratio = margin_ratio
            .checked_mul(10000 - liquidation_threshold_bps as u128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0);

        match self.direction {
            PositionDirection::Long => {
                // liq_price = entry_price * (10000 - effective_ratio) / 10000
                (self.entry_price as u128)
                    .checked_mul(10000u128.saturating_sub(effective_ratio))
                    .unwrap_or(0)
                    .checked_div(10000)
                    .unwrap_or(0) as u64
            }
            PositionDirection::Short => {
                // liq_price = entry_price * (10000 + effective_ratio) / 10000
                (self.entry_price as u128)
                    .checked_mul(10000u128.saturating_add(effective_ratio))
                    .unwrap_or(0)
                    .checked_div(10000)
                    .unwrap_or(0) as u64
            }
        }
    }

    /// Check if position has hit profit bound (profit = margin)
    pub fn is_at_profit_bound(&self, current_price: u64) -> bool {
        let (pnl, is_profit) = self.calculate_pnl(current_price);
        is_profit && pnl >= self.margin
    }
}
