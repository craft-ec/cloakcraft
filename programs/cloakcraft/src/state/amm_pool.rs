//! Internal AMM pool state
//!
//! Private liquidity pools supporting multiple AMM formulas:
//! - Constant Product (x * y = k) - Uniswap V2 style
//! - StableSwap (Curve style) - optimized for pegged assets

use anchor_lang::prelude::*;

/// Pool type determining which AMM formula to use
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, Default, InitSpace)]
pub enum PoolType {
    /// Constant product formula: x * y = k
    /// Best for volatile pairs (e.g., SOL/USDC)
    #[default]
    ConstantProduct,
    /// StableSwap formula (Curve)
    /// Best for pegged pairs (e.g., USDC/USDT)
    StableSwap,
}

/// AMM pool for a token pair
#[account]
#[derive(Default, InitSpace)]
pub struct AmmPool {
    /// Pool ID (PDA seed)
    pub pool_id: Pubkey,

    /// Token A mint
    pub token_a_mint: Pubkey,

    /// Token B mint
    pub token_b_mint: Pubkey,

    /// LP token mint (created by pool)
    pub lp_mint: Pubkey,

    /// Current state hash (hash of reserves + lp_supply)
    /// Used for ZK proof verification of state transitions
    pub state_hash: [u8; 32],

    /// Reserve A (committed, updated via ZK proofs)
    pub reserve_a: u64,

    /// Reserve B (committed, updated via ZK proofs)
    pub reserve_b: u64,

    /// Total LP token supply
    pub lp_supply: u64,

    /// Fee in basis points (e.g., 30 = 0.3%)
    pub fee_bps: u16,

    /// Pool authority
    pub authority: Pubkey,

    /// Is pool active
    pub is_active: bool,

    /// PDA bump
    pub bump: u8,

    /// LP mint bump
    pub lp_mint_bump: u8,

    /// Pool type (ConstantProduct or StableSwap)
    pub pool_type: PoolType,

    /// Amplification coefficient for StableSwap (ignored for ConstantProduct)
    /// Higher values = more like constant sum (lower slippage at peg)
    /// Typical values: 100-1000 for stablecoins
    /// Stored as actual value (not scaled)
    pub amplification: u64,
}

impl AmmPool {
    /// Account space
    pub const LEN: usize = 8  // discriminator
        + 32  // pool_id
        + 32  // token_a_mint
        + 32  // token_b_mint
        + 32  // lp_mint
        + 32  // state_hash
        + 8   // reserve_a
        + 8   // reserve_b
        + 8   // lp_supply
        + 2   // fee_bps
        + 32  // authority
        + 1   // is_active
        + 1   // bump
        + 1   // lp_mint_bump
        + 1   // pool_type (enum = 1 byte)
        + 8;  // amplification

    /// Returns tokens in canonical order (sorted by bytes).
    /// This ensures USDC-SOL and SOL-USDC always derive the same pool PDA.
    pub fn canonical_order(mint_a: Pubkey, mint_b: Pubkey) -> (Pubkey, Pubkey) {
        if mint_a.as_ref() < mint_b.as_ref() {
            (mint_a, mint_b)
        } else {
            (mint_b, mint_a)
        }
    }

    /// Compute state hash from reserves
    pub fn compute_state_hash(&self) -> [u8; 32] {
        let mut data = Vec::with_capacity(32);
        data.extend_from_slice(&self.reserve_a.to_le_bytes());
        data.extend_from_slice(&self.reserve_b.to_le_bytes());
        data.extend_from_slice(&self.lp_supply.to_le_bytes());
        data.extend_from_slice(self.pool_id.as_ref());
        solana_keccak_hasher::hash(&data).to_bytes()
    }

    /// Verify state hash matches current reserves
    pub fn verify_state_hash(&self, expected: &[u8; 32]) -> bool {
        &self.compute_state_hash() == expected
    }

    /// Calculate swap output amount based on pool type
    /// Returns (output_amount, fee_amount)
    pub fn calculate_swap_output(
        &self,
        input_amount: u64,
        swap_a_to_b: bool,
    ) -> Option<(u64, u64)> {
        match self.pool_type {
            PoolType::ConstantProduct => {
                self.calculate_constant_product_output(input_amount, swap_a_to_b)
            }
            PoolType::StableSwap => {
                self.calculate_stable_swap_output(input_amount, swap_a_to_b)
            }
        }
    }

    /// Verify that the claimed output amount is correct for the given input
    /// Returns true if output_amount matches the formula (within tolerance)
    pub fn verify_swap_output(
        &self,
        input_amount: u64,
        output_amount: u64,
        swap_a_to_b: bool,
    ) -> bool {
        if let Some((calculated_output, _)) = self.calculate_swap_output(input_amount, swap_a_to_b) {
            // Allow 1 unit tolerance for rounding
            output_amount <= calculated_output && calculated_output.saturating_sub(output_amount) <= 1
        } else {
            false
        }
    }

    /// Constant Product formula: x * y = k
    /// output = (reserve_out * input_with_fee) / (reserve_in + input_with_fee)
    fn calculate_constant_product_output(
        &self,
        input_amount: u64,
        swap_a_to_b: bool,
    ) -> Option<(u64, u64)> {
        let (reserve_in, reserve_out) = if swap_a_to_b {
            (self.reserve_a, self.reserve_b)
        } else {
            (self.reserve_b, self.reserve_a)
        };

        if reserve_in == 0 || reserve_out == 0 || input_amount == 0 {
            return None;
        }

        // Calculate fee: fee = input * fee_bps / 10000
        let fee_amount = (input_amount as u128)
            .checked_mul(self.fee_bps as u128)?
            .checked_div(10000)? as u64;

        let input_with_fee = input_amount.checked_sub(fee_amount)?;

        // output = (reserve_out * input_with_fee) / (reserve_in + input_with_fee)
        let numerator = (reserve_out as u128).checked_mul(input_with_fee as u128)?;
        let denominator = (reserve_in as u128).checked_add(input_with_fee as u128)?;
        let output_amount = numerator.checked_div(denominator)? as u64;

        Some((output_amount, fee_amount))
    }

    /// StableSwap formula (Curve)
    /// Uses the invariant: A * n^n * sum(x) + D = A * D * n^n + D^(n+1) / (n^n * prod(x))
    /// For n=2: A * 4 * (x + y) + D = A * D * 4 + D^3 / (4 * x * y)
    fn calculate_stable_swap_output(
        &self,
        input_amount: u64,
        swap_a_to_b: bool,
    ) -> Option<(u64, u64)> {
        let (reserve_in, reserve_out) = if swap_a_to_b {
            (self.reserve_a, self.reserve_b)
        } else {
            (self.reserve_b, self.reserve_a)
        };

        if reserve_in == 0 || reserve_out == 0 || input_amount == 0 {
            return None;
        }

        let amp = self.amplification;
        if amp == 0 {
            return None;
        }

        // Calculate fee
        let fee_amount = (input_amount as u128)
            .checked_mul(self.fee_bps as u128)?
            .checked_div(10000)? as u64;

        let input_with_fee = input_amount.checked_sub(fee_amount)?;

        // Scale up to avoid precision loss (use 1e18 precision)
        const PRECISION: u128 = 1_000_000_000_000_000_000; // 1e18

        let x = (reserve_in as u128).checked_mul(PRECISION)?;
        let y = (reserve_out as u128).checked_mul(PRECISION)?;
        let dx = (input_with_fee as u128).checked_mul(PRECISION)?;

        // Calculate D (the invariant) using Newton-Raphson
        let d = self.get_d(x, y, amp as u128)?;

        // New x after swap
        let new_x = x.checked_add(dx)?;

        // Calculate new y using the invariant
        let new_y = self.get_y(new_x, d, amp as u128)?;

        // Output amount = old_y - new_y
        let output_scaled = y.checked_sub(new_y)?;
        let output_amount = output_scaled.checked_div(PRECISION)? as u64;

        Some((output_amount, fee_amount))
    }

    /// Calculate D (the StableSwap invariant) using Newton-Raphson
    /// D is the total value of the pool in the "ideal" balanced state
    fn get_d(&self, x: u128, y: u128, amp: u128) -> Option<u128> {
        // D = sum(x) when pool is balanced
        // Starting approximation
        let sum = x.checked_add(y)?;
        if sum == 0 {
            return Some(0);
        }

        let ann = amp.checked_mul(4)?; // A * n^n where n=2

        let mut d = sum;
        let mut d_prev: u128;

        // Newton-Raphson iteration (typically converges in < 10 iterations)
        for _ in 0..255 {
            // D_P = D^3 / (4 * x * y)
            let mut d_p = d;
            d_p = d_p.checked_mul(d)?.checked_div(x.checked_mul(2)?)?;
            d_p = d_p.checked_mul(d)?.checked_div(y.checked_mul(2)?)?;

            d_prev = d;

            // d = (ann * sum + d_p * 2) * d / ((ann - 1) * d + 3 * d_p)
            let numerator = ann
                .checked_mul(sum)?
                .checked_add(d_p.checked_mul(2)?)?
                .checked_mul(d)?;

            let denominator = ann
                .checked_sub(1)?
                .checked_mul(d)?
                .checked_add(d_p.checked_mul(3)?)?;

            d = numerator.checked_div(denominator)?;

            // Check convergence (within 1)
            if d > d_prev {
                if d.checked_sub(d_prev)? <= 1 {
                    return Some(d);
                }
            } else if d_prev.checked_sub(d)? <= 1 {
                return Some(d);
            }
        }

        None // Failed to converge
    }

    /// Calculate y given x and D using Newton-Raphson
    /// Solves for y in the StableSwap invariant
    fn get_y(&self, x: u128, d: u128, amp: u128) -> Option<u128> {
        let ann = amp.checked_mul(4)?; // A * n^n where n=2

        // c = D^3 / (4 * x * ann)
        let c = d
            .checked_mul(d)?
            .checked_div(x.checked_mul(2)?)?
            .checked_mul(d)?
            .checked_div(ann.checked_mul(2)?)?;

        // b = x + D / ann
        let b = x.checked_add(d.checked_div(ann)?)?;

        let mut y = d;
        let mut y_prev: u128;

        // Newton-Raphson iteration
        for _ in 0..255 {
            y_prev = y;

            // y = (y^2 + c) / (2*y + b - D)
            let numerator = y.checked_mul(y)?.checked_add(c)?;
            let denominator = y.checked_mul(2)?.checked_add(b)?.checked_sub(d)?;

            y = numerator.checked_div(denominator)?;

            // Check convergence
            if y > y_prev {
                if y.checked_sub(y_prev)? <= 1 {
                    return Some(y);
                }
            } else if y_prev.checked_sub(y)? <= 1 {
                return Some(y);
            }
        }

        None // Failed to converge
    }
}
