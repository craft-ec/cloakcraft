//! AMM (Automated Market Maker) math helpers
//!
//! Provides calculation functions for liquidity pool operations including:
//! - LP token minting for initial and subsequent liquidity
//! - LP amount validation and slippage checks
//! - Integer square root for constant product formula

use anchor_lang::prelude::*;
use crate::errors::CloakCraftError;

/// Calculate LP tokens for initial liquidity provision
///
/// Formula: LP = sqrt(depositA * depositB)
///
/// This is used when the pool is empty (lp_supply = 0).
/// The geometric mean ensures fair token distribution regardless of deposit ratio.
///
/// # Arguments
/// * `deposit_a` - Amount of token A being deposited
/// * `deposit_b` - Amount of token B being deposited
///
/// # Returns
/// LP tokens to mint
///
/// # Errors
/// * `AmountOverflow` - Multiplication overflow
pub fn calculate_initial_lp(
    deposit_a: u64,
    deposit_b: u64,
) -> Result<u64> {
    let product = (deposit_a as u128)
        .checked_mul(deposit_b as u128)
        .ok_or(CloakCraftError::AmountOverflow)?;

    Ok(integer_sqrt(product) as u64)
}

/// Calculate LP tokens for subsequent liquidity provision
///
/// Formula: LP = min(depositA * lpSupply / reserveA, depositB * lpSupply / reserveB)
///
/// This maintains the constant product invariant and prevents manipulation.
/// Uses minimum to ensure deposits maintain pool ratio.
///
/// # Arguments
/// * `deposit_a` - Amount of token A being deposited
/// * `deposit_b` - Amount of token B being deposited
/// * `reserve_a` - Current reserve of token A in pool
/// * `reserve_b` - Current reserve of token B in pool
/// * `lp_supply` - Current total LP token supply
///
/// # Returns
/// LP tokens to mint
///
/// # Errors
/// * `AmountOverflow` - Multiplication overflow
/// * `InsufficientLiquidity` - Division by zero (empty reserves)
pub fn calculate_proportional_lp(
    deposit_a: u64,
    deposit_b: u64,
    reserve_a: u64,
    reserve_b: u64,
    lp_supply: u64,
) -> Result<u64> {
    // LP from token A: (depositA * lpSupply) / reserveA
    let lp_from_a = ((deposit_a as u128)
        .checked_mul(lp_supply as u128)
        .ok_or(CloakCraftError::AmountOverflow)?
        .checked_div(reserve_a as u128)
        .ok_or(CloakCraftError::InsufficientLiquidity)?) as u64;

    // LP from token B: (depositB * lpSupply) / reserveB
    let lp_from_b = ((deposit_b as u128)
        .checked_mul(lp_supply as u128)
        .ok_or(CloakCraftError::AmountOverflow)?
        .checked_div(reserve_b as u128)
        .ok_or(CloakCraftError::InsufficientLiquidity)?) as u64;

    // Use minimum to maintain pool ratio
    Ok(lp_from_a.min(lp_from_b))
}

/// Validate LP amount and check slippage
///
/// SECURITY CRITICAL: This function prevents LP token inflation attacks by requiring
/// exact match between provided and calculated LP amounts.
///
/// Also enforces slippage protection to prevent front-running attacks.
///
/// # Arguments
/// * `provided_lp` - LP amount claimed by the transaction
/// * `calculated_lp` - LP amount calculated from deposits
/// * `min_lp` - Minimum LP amount acceptable (slippage tolerance)
///
/// # Errors
/// * `InvalidLpAmount` - Provided LP doesn't match calculated (SECURITY)
/// * `SlippageExceeded` - LP amount below minimum (front-run protection)
pub fn validate_lp_amount(
    provided_lp: u64,
    calculated_lp: u64,
    min_lp: u64,
) -> Result<()> {
    // CRITICAL SECURITY CHECK: Exact match prevents inflation attacks
    require!(
        provided_lp == calculated_lp,
        CloakCraftError::InvalidLpAmount
    );

    msg!("LP amount validated: provided={}, calculated={}", provided_lp, calculated_lp);

    // SLIPPAGE PROTECTION: Ensure user gets at least min_lp (front-running protection)
    require!(
        provided_lp >= min_lp,
        CloakCraftError::SlippageExceeded
    );

    msg!("Slippage check passed: lp_amount={}, min_lp_amount={}", provided_lp, min_lp);

    Ok(())
}

/// Integer square root using Newton's method (Babylonian method)
///
/// Returns floor(sqrt(n)) for any u128 value.
/// Used for calculating initial LP tokens.
///
/// # Algorithm
/// Newton iteration: x_{n+1} = (x_n + n/x_n) / 2
/// Converges quadratically to floor(sqrt(n))
///
/// # Examples
/// ```ignore
/// assert_eq!(integer_sqrt(0), 0);
/// assert_eq!(integer_sqrt(1), 1);
/// assert_eq!(integer_sqrt(4), 2);
/// assert_eq!(integer_sqrt(15), 3);
/// assert_eq!(integer_sqrt(16), 4);
/// ```
fn integer_sqrt(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }
    if n <= 3 {
        return 1;
    }

    // Initial guess: use bit length / 2
    let mut x = n;
    let mut y = (x + 1) / 2;

    // Newton iteration: y = (x + n/x) / 2
    // Continue until convergence (y >= x)
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }

    x
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_integer_sqrt() {
        assert_eq!(integer_sqrt(0), 0);
        assert_eq!(integer_sqrt(1), 1);
        assert_eq!(integer_sqrt(4), 2);
        assert_eq!(integer_sqrt(9), 3);
        assert_eq!(integer_sqrt(15), 3); // floor(sqrt(15)) = 3
        assert_eq!(integer_sqrt(16), 4);
        assert_eq!(integer_sqrt(100), 10);
        assert_eq!(integer_sqrt(1000000), 1000);
    }

    #[test]
    fn test_initial_lp() {
        // sqrt(100 * 400) = sqrt(40000) = 200
        let lp = calculate_initial_lp(100, 400).unwrap();
        assert_eq!(lp, 200);

        // sqrt(1000 * 1000) = 1000
        let lp = calculate_initial_lp(1000, 1000).unwrap();
        assert_eq!(lp, 1000);
    }

    #[test]
    fn test_proportional_lp() {
        // Pool: reserveA=1000, reserveB=2000, lpSupply=1414
        // Deposit: depositA=100, depositB=200
        // LP from A: 100 * 1414 / 1000 = 141
        // LP from B: 200 * 1414 / 2000 = 141
        // min(141, 141) = 141
        let lp = calculate_proportional_lp(100, 200, 1000, 2000, 1414).unwrap();
        assert_eq!(lp, 141);
    }
}
