//! Multi-token perpetual futures liquidity pool
//!
//! Supports multiple tokens (SOL, USDC, ETH, BTC) with a single LP token.
//! Similar to JLP (Jupiter Liquidity Provider) model.
//!
//! Key features:
//! - Single token deposit/withdrawal with auto-rebalance
//! - Per-token utilization tracking
//! - Utilization-based borrow fees
//! - Private liquidity operations via ZK proofs

use anchor_lang::prelude::*;

/// Maximum number of tokens supported in the pool
pub const MAX_PERPS_TOKENS: usize = 8;

/// Individual token configuration within the perps pool
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, InitSpace)]
pub struct PerpsToken {
    /// Token mint address
    pub mint: Pubkey,

    /// Token vault PDA holding pool assets
    pub vault: Pubkey,

    /// Pyth price feed ID (32 bytes hex)
    /// Used to validate the passed price update account
    pub pyth_feed_id: [u8; 32],

    /// Total balance in the pool (deposited by LPs)
    pub balance: u64,

    /// Amount locked in positions (borrowed + held)
    pub locked: u64,

    /// Cumulative borrow fee per token (scaled by 1e18)
    /// Used for fee accrual calculation
    pub cumulative_borrow_fee: u128,

    /// Last timestamp when borrow fee was updated
    pub last_fee_update: i64,

    /// Token decimals (for price calculations)
    pub decimals: u8,

    /// Whether this token slot is active
    pub is_active: bool,

    /// Vault bump seed
    pub vault_bump: u8,

    /// Reserved for future use
    pub _reserved: [u8; 5],
}

impl PerpsToken {
    /// Calculate available balance (not locked in positions)
    pub fn available(&self) -> u64 {
        self.balance.saturating_sub(self.locked)
    }

    /// Calculate utilization in basis points (0-10000)
    pub fn utilization_bps(&self) -> u16 {
        if self.balance == 0 {
            return 0;
        }
        let utilization = (self.locked as u128)
            .checked_mul(10000)
            .unwrap_or(0)
            .checked_div(self.balance as u128)
            .unwrap_or(0);
        utilization.min(10000) as u16
    }

    /// Check if adding more locked amount would exceed utilization limit
    pub fn can_lock(&self, additional: u64, max_utilization_bps: u16) -> bool {
        let new_locked = self.locked.saturating_add(additional);
        if self.balance == 0 {
            return false;
        }
        let new_utilization = (new_locked as u128)
            .checked_mul(10000)
            .unwrap_or(u128::MAX)
            .checked_div(self.balance as u128)
            .unwrap_or(u128::MAX);
        new_utilization <= max_utilization_bps as u128
    }
}

/// Multi-token perpetual futures liquidity pool
#[account]
#[derive(Default)]
pub struct PerpsPool {
    /// Unique pool identifier (used as PDA seed)
    pub pool_id: Pubkey,

    /// LP token mint (single token for entire pool)
    pub lp_mint: Pubkey,

    /// Position token mint (for position commitments)
    pub position_mint: Pubkey,

    /// Total LP token supply
    pub lp_supply: u64,

    /// Pool authority (admin)
    pub authority: Pubkey,

    /// Number of active tokens in the pool
    pub num_tokens: u8,

    /// Token configurations (up to MAX_PERPS_TOKENS)
    pub tokens: [PerpsToken; MAX_PERPS_TOKENS],

    // =============================================================================
    // Global Pool Configuration
    // =============================================================================

    /// Maximum leverage allowed (e.g., 100 = 100x)
    pub max_leverage: u8,

    /// Position fee in basis points (e.g., 6 = 0.06%)
    pub position_fee_bps: u16,

    /// Maximum utilization per token in basis points (e.g., 8000 = 80%)
    pub max_utilization_bps: u16,

    /// Liquidation threshold in basis points (e.g., 50 = 0.5% margin remaining)
    pub liquidation_threshold_bps: u16,

    /// Liquidation penalty in basis points (e.g., 50 = 0.5%)
    pub liquidation_penalty_bps: u16,

    /// Base borrow rate per hour in basis points (e.g., 1 = 0.01%/hour)
    pub base_borrow_rate_bps: u16,

    /// Maximum imbalance fee in basis points (e.g., 3 = 0.03%)
    pub max_imbalance_fee_bps: u16,

    // =============================================================================
    // Pool State
    // =============================================================================

    /// Whether the pool is active for trading
    pub is_active: bool,

    /// PDA bump seed
    pub bump: u8,

    /// LP mint bump seed
    pub lp_mint_bump: u8,

    /// Position mint bump seed
    pub position_mint_bump: u8,

    /// Reserved for future use (reduced from 32 to accommodate position_mint + bump)
    pub _reserved: [u8; 31],
}

impl PerpsPool {
    /// Account space calculation
    pub const LEN: usize = 8 + // discriminator
        32 + // pool_id
        32 + // lp_mint
        32 + // position_mint
        8 + // lp_supply
        32 + // authority
        1 + // num_tokens
        (PerpsToken::INIT_SPACE * MAX_PERPS_TOKENS) + // tokens
        1 + // max_leverage
        2 + // position_fee_bps
        2 + // max_utilization_bps
        2 + // liquidation_threshold_bps
        2 + // liquidation_penalty_bps
        2 + // base_borrow_rate_bps
        2 + // max_imbalance_fee_bps
        1 + // is_active
        1 + // bump
        1 + // lp_mint_bump
        1 + // position_mint_bump
        32; // _reserved

    /// PDA seeds prefix
    pub const SEEDS_PREFIX: &'static [u8] = b"perps_pool";

    /// LP mint seeds prefix
    pub const LP_MINT_SEEDS_PREFIX: &'static [u8] = b"perps_lp_mint";

    /// Find token by mint address, returns (index, token)
    pub fn find_token(&self, mint: &Pubkey) -> Option<(usize, &PerpsToken)> {
        for i in 0..self.num_tokens as usize {
            if self.tokens[i].mint == *mint && self.tokens[i].is_active {
                return Some((i, &self.tokens[i]));
            }
        }
        None
    }

    /// Find token by index
    pub fn get_token(&self, index: u8) -> Option<&PerpsToken> {
        if index < self.num_tokens && self.tokens[index as usize].is_active {
            Some(&self.tokens[index as usize])
        } else {
            None
        }
    }

    /// Find mutable token by index
    pub fn get_token_mut(&mut self, index: u8) -> Option<&mut PerpsToken> {
        if index < self.num_tokens && self.tokens[index as usize].is_active {
            Some(&mut self.tokens[index as usize])
        } else {
            None
        }
    }

    /// Calculate total pool value in USD (using oracle prices)
    /// Returns value scaled by 1e6 (USD with 6 decimals)
    pub fn calculate_total_value(&self, prices: &[u64; MAX_PERPS_TOKENS]) -> Option<u128> {
        let mut total: u128 = 0;
        for i in 0..self.num_tokens as usize {
            if !self.tokens[i].is_active {
                continue;
            }
            // value = balance * price / 10^decimals
            // prices are assumed to be in USD with 6 decimals
            let token_value = (self.tokens[i].balance as u128)
                .checked_mul(prices[i] as u128)?
                .checked_div(10u128.pow(self.tokens[i].decimals as u32))?;
            total = total.checked_add(token_value)?;
        }
        Some(total)
    }

    /// Calculate LP token value based on pool total value
    /// Returns value per LP token scaled by 1e6
    pub fn calculate_lp_value(&self, prices: &[u64; MAX_PERPS_TOKENS]) -> Option<u64> {
        if self.lp_supply == 0 {
            return Some(1_000_000); // Initial LP value = 1 USD
        }
        let total_value = self.calculate_total_value(prices)?;
        let value_per_lp = total_value.checked_div(self.lp_supply as u128)?;
        Some(value_per_lp as u64)
    }

    /// Calculate LP tokens to mint for a deposit
    /// deposit_value is in USD with 6 decimals
    pub fn calculate_lp_mint_amount(
        &self,
        deposit_value: u64,
        prices: &[u64; MAX_PERPS_TOKENS],
    ) -> Option<u64> {
        if self.lp_supply == 0 {
            // First deposit: 1 LP = 1 USD of value
            return Some(deposit_value);
        }
        let total_value = self.calculate_total_value(prices)?;
        if total_value == 0 {
            return Some(deposit_value);
        }
        // lp_amount = deposit_value * lp_supply / total_value
        let lp_amount = (deposit_value as u128)
            .checked_mul(self.lp_supply as u128)?
            .checked_div(total_value)?;
        Some(lp_amount as u64)
    }

    /// Calculate tokens to withdraw for LP burn
    /// Returns amount of specified token to withdraw
    pub fn calculate_withdraw_amount(
        &self,
        lp_amount: u64,
        token_index: u8,
        prices: &[u64; MAX_PERPS_TOKENS],
    ) -> Option<u64> {
        if self.lp_supply == 0 || lp_amount == 0 {
            return None;
        }
        let token = self.get_token(token_index)?;
        let total_value = self.calculate_total_value(prices)?;

        // value_to_withdraw = lp_amount * total_value / lp_supply
        let value_to_withdraw = (lp_amount as u128)
            .checked_mul(total_value)?
            .checked_div(self.lp_supply as u128)?;

        // token_amount = value_to_withdraw * 10^decimals / price
        let token_amount = value_to_withdraw
            .checked_mul(10u128.pow(token.decimals as u32))?
            .checked_div(prices[token_index as usize] as u128)?;

        // Cap at available balance
        let available = token.available();
        Some((token_amount as u64).min(available))
    }

    /// Calculate borrow fee rate based on utilization
    /// Higher utilization = higher borrow rate
    /// Returns rate per hour in basis points
    pub fn calculate_borrow_rate(&self, token_index: u8) -> Option<u16> {
        let token = self.get_token(token_index)?;
        let utilization = token.utilization_bps();

        // Linear scaling: rate = base_rate * (1 + utilization_ratio)
        // At 0% utilization: rate = base_rate
        // At 80% utilization: rate = base_rate * 1.8
        let rate = (self.base_borrow_rate_bps as u32)
            .checked_mul(10000 + utilization as u32)?
            .checked_div(10000)?;

        Some(rate.min(u16::MAX as u32) as u16)
    }

    /// Check if pool can handle a new position
    pub fn can_open_position(
        &self,
        base_token_index: u8,
        quote_token_index: u8,
        base_lock_amount: u64,
        quote_lock_amount: u64,
    ) -> bool {
        let base_token = match self.get_token(base_token_index) {
            Some(t) => t,
            None => return false,
        };
        let quote_token = match self.get_token(quote_token_index) {
            Some(t) => t,
            None => return false,
        };

        base_token.can_lock(base_lock_amount, self.max_utilization_bps)
            && quote_token.can_lock(quote_lock_amount, self.max_utilization_bps)
    }
}
