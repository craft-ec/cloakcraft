//! Protocol configuration for fees and treasury
//!
//! Stores fee rates and treasury address for protocol fee collection.
//! Fee operations: transfer, unshield, swap, remove_liquidity
//! Free operations: shield, add_liquidity, consolidate (add value to protocol)

use anchor_lang::prelude::*;

/// Protocol configuration account
///
/// Stores fee rates in basis points (10000 = 100%) and treasury address.
/// Fee rates can be updated by the authority.
#[account]
#[derive(InitSpace)]
pub struct ProtocolConfig {
    /// Authority that can update fees
    pub authority: Pubkey,

    /// Treasury account that receives protocol fees
    pub treasury: Pubkey,

    /// Transfer fee in basis points (e.g., 10 = 0.1%)
    /// Applied to private → private transfers
    pub transfer_fee_bps: u16,

    /// Unshield fee in basis points (e.g., 25 = 0.25%)
    /// Applied to private → public withdrawals
    pub unshield_fee_bps: u16,

    /// Protocol's share of LP swap fees in basis points (e.g., 2000 = 20%)
    /// Protocol fee = LP fee * swap_fee_share_bps / 10000
    /// Example: 0.3% LP fee * 20% = 0.06% protocol fee
    pub swap_fee_share_bps: u16,

    /// Remove liquidity fee in basis points (e.g., 25 = 0.25%)
    /// Applied to LP token withdrawals
    pub remove_liquidity_fee_bps: u16,

    /// Whether fees are enabled (can be paused)
    pub fees_enabled: bool,

    /// PDA bump seed
    pub bump: u8,

    /// Reserved for future use
    pub _reserved: [u8; 62],
}

impl Default for ProtocolConfig {
    fn default() -> Self {
        Self {
            authority: Pubkey::default(),
            treasury: Pubkey::default(),
            transfer_fee_bps: 0,
            unshield_fee_bps: 0,
            swap_fee_share_bps: 0,
            remove_liquidity_fee_bps: 0,
            fees_enabled: false,
            bump: 0,
            _reserved: [0u8; 62],
        }
    }
}

impl ProtocolConfig {
    /// Account space calculation
    pub const LEN: usize = 8  // discriminator
        + 32  // authority
        + 32  // treasury
        + 2   // transfer_fee_bps
        + 2   // unshield_fee_bps
        + 2   // swap_fee_share_bps
        + 2   // remove_liquidity_fee_bps
        + 1   // fees_enabled
        + 1   // bump
        + 62; // reserved

    /// Maximum fee in basis points (10% = 1000 bps)
    pub const MAX_FEE_BPS: u16 = 1000;

    /// Calculate fee amount from transfer amount
    /// Returns (fee_amount, amount_after_fee)
    pub fn calculate_transfer_fee(&self, amount: u64) -> (u64, u64) {
        if !self.fees_enabled || self.transfer_fee_bps == 0 {
            return (0, amount);
        }
        let fee = self.calculate_fee(amount, self.transfer_fee_bps);
        (fee, amount.saturating_sub(fee))
    }

    /// Calculate fee amount from unshield amount
    /// Returns (fee_amount, amount_after_fee)
    pub fn calculate_unshield_fee(&self, amount: u64) -> (u64, u64) {
        if !self.fees_enabled || self.unshield_fee_bps == 0 {
            return (0, amount);
        }
        let fee = self.calculate_fee(amount, self.unshield_fee_bps);
        (fee, amount.saturating_sub(fee))
    }

    /// Calculate protocol fee from swap as percentage of LP fee
    /// Protocol fee = (swap_amount * lp_fee_bps * swap_fee_share_bps) / (10000 * 10000)
    /// Returns (protocol_fee_amount, lp_fee_remaining)
    pub fn calculate_swap_fee(&self, swap_amount: u64, lp_fee_bps: u16) -> (u64, u64) {
        if !self.fees_enabled || self.swap_fee_share_bps == 0 || lp_fee_bps == 0 {
            // No protocol fee, all LP fee stays in pool
            let lp_fee = self.calculate_fee(swap_amount, lp_fee_bps);
            return (0, lp_fee);
        }
        // Calculate total LP fee first
        let total_lp_fee = self.calculate_fee(swap_amount, lp_fee_bps);
        // Protocol takes swap_fee_share_bps% of the LP fee
        let protocol_fee = self.calculate_fee(total_lp_fee, self.swap_fee_share_bps);
        // Remaining LP fee stays in pool
        let lp_fee_remaining = total_lp_fee.saturating_sub(protocol_fee);
        (protocol_fee, lp_fee_remaining)
    }

    /// Calculate fee amount from remove liquidity amount
    /// Returns (fee_amount, amount_after_fee)
    pub fn calculate_remove_liquidity_fee(&self, amount: u64) -> (u64, u64) {
        if !self.fees_enabled || self.remove_liquidity_fee_bps == 0 {
            return (0, amount);
        }
        let fee = self.calculate_fee(amount, self.remove_liquidity_fee_bps);
        (fee, amount.saturating_sub(fee))
    }

    /// Fee calculation: (amount * fee_bps) / 10000
    pub fn calculate_fee(&self, amount: u64, fee_bps: u16) -> u64 {
        // Use u128 to avoid overflow during multiplication
        let fee = (amount as u128)
            .checked_mul(fee_bps as u128)
            .unwrap_or(0)
            .checked_div(10000)
            .unwrap_or(0);
        fee as u64
    }

    /// Verify that a fee amount meets minimum requirements
    /// fee_amount >= (amount * fee_bps) / 10000
    pub fn verify_fee(&self, amount: u64, fee_amount: u64, fee_bps: u16) -> bool {
        if !self.fees_enabled || fee_bps == 0 {
            return true; // No fee required
        }
        let min_fee = self.calculate_fee(amount, fee_bps);
        fee_amount >= min_fee
    }
}

/// Operation types for fee calculation
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum FeeOperation {
    /// Private → private transfer
    Transfer,
    /// Private → public withdrawal
    Unshield,
    /// Private AMM swap
    Swap,
    /// LP token withdrawal
    RemoveLiquidity,
    /// Free operations (shield, add_liquidity, consolidate)
    Free,
}

impl FeeOperation {
    /// Check if this operation is free (no fees)
    pub fn is_free(&self) -> bool {
        matches!(self, FeeOperation::Free)
    }
}
