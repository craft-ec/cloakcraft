//! Pyth Oracle integration utilities
//!
//! Provides helper functions for reading and validating Pyth price feeds.

use anchor_lang::prelude::*;
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2, Price, VerificationLevel};

use crate::errors::CloakCraftError;

/// Maximum age for price data in seconds
/// - Mainnet: 30 seconds (prices update frequently)
/// - Devnet: 120 seconds (updates less frequently)
#[cfg(not(feature = "devnet"))]
pub const MAXIMUM_PRICE_AGE: u64 = 30;

#[cfg(feature = "devnet")]
pub const MAXIMUM_PRICE_AGE: u64 = 120;

/// Minimum verification level for Pyth prices
///
/// Pyth v2 pull oracle uses partial verification to fit in single transactions.
/// 5 signatures is Pyth's recommended minimum (from SDK examples).
/// Full verification (13+ sigs) doesn't fit in Solana's tx size limit.
pub const MIN_VERIFICATION_LEVEL: VerificationLevel = VerificationLevel::Partial { num_signatures: 5 };

/// Price precision (6 decimals for USD)
pub const PRICE_PRECISION: u64 = 1_000_000;

/// Get price from Pyth price update account with validation
///
/// # Arguments
/// * `price_update` - The PriceUpdateV2 account containing the price data
/// * `feed_id` - Expected Pyth feed ID (32 bytes)
/// * `clock` - Solana clock for staleness check
///
/// # Returns
/// * Price in USD with 6 decimals (e.g., 150_000_000 = $150.00)
pub fn get_price(
    price_update: &Account<PriceUpdateV2>,
    feed_id: &[u8; 32],
    clock: &Clock,
) -> Result<u64> {
    // Validate feed ID matches
    require!(
        price_update.price_message.feed_id == *feed_id,
        CloakCraftError::InvalidPriceFeed
    );

    // Get price with staleness check and verification level
    let price = price_update
        .get_price_no_older_than_with_custom_verification_level(
            clock,
            MAXIMUM_PRICE_AGE,
            feed_id,
            MIN_VERIFICATION_LEVEL,
        )
        .map_err(|e| {
            msg!("Pyth price error: {:?}", e);
            CloakCraftError::PriceStale
        })?;

    // Convert to our standard format (USD with 6 decimals)
    convert_price_to_u64(&price)
}

/// Get price from Pyth without feed ID validation (for trusted accounts)
///
/// Use this when the account constraint already validates ownership
pub fn get_price_unchecked(
    price_update: &Account<PriceUpdateV2>,
    clock: &Clock,
) -> Result<u64> {
    let feed_id = price_update.price_message.feed_id;

    // Get price with staleness check and verification level
    let price = price_update
        .get_price_no_older_than_with_custom_verification_level(
            clock,
            MAXIMUM_PRICE_AGE,
            &feed_id,
            MIN_VERIFICATION_LEVEL,
        )
        .map_err(|e| {
            msg!("Pyth price error: {:?}", e);
            CloakCraftError::PriceStale
        })?;

    convert_price_to_u64(&price)
}

/// Convert Pyth Price to u64 with 6 decimal places
///
/// Pyth prices are i64 with variable exponent (typically -8)
/// We convert to u64 with 6 decimals for consistency
fn convert_price_to_u64(price: &Price) -> Result<u64> {
    // Price must be positive
    require!(price.price > 0, CloakCraftError::InvalidOraclePrice);

    let price_value = price.price as u64;
    let exponent = price.exponent;

    // Pyth exponent is typically negative (e.g., -8 means price has 8 decimals)
    // We want 6 decimals, so we need to adjust
    // If exponent is -8 and we want 6 decimals, we divide by 10^2
    // If exponent is -6 and we want 6 decimals, no change
    // If exponent is -4 and we want 6 decimals, multiply by 10^2

    let target_decimals: i32 = 6;
    let adjustment = target_decimals + exponent; // e.g., 6 + (-8) = -2

    let adjusted_price = if adjustment >= 0 {
        // Multiply to add decimals
        price_value
            .checked_mul(10u64.pow(adjustment as u32))
            .ok_or(CloakCraftError::AmountOverflow)?
    } else {
        // Divide to remove decimals
        price_value
            .checked_div(10u64.pow((-adjustment) as u32))
            .ok_or(CloakCraftError::AmountOverflow)?
    };

    Ok(adjusted_price)
}

/// Get confidence interval from Pyth price
/// Returns confidence as a percentage (basis points)
pub fn get_confidence_bps(price: &Price) -> u16 {
    if price.price <= 0 {
        return 10000; // 100% if price is invalid
    }

    // conf / price * 10000
    let conf_bps = (price.conf as u128)
        .checked_mul(10000)
        .unwrap_or(u128::MAX)
        .checked_div(price.price as u128)
        .unwrap_or(10000);

    conf_bps.min(10000) as u16
}

/// Maximum acceptable confidence interval in basis points (1%)
pub const MAX_CONFIDENCE_BPS: u16 = 100;

/// Validate price confidence is acceptable
pub fn validate_confidence(price: &Price) -> Result<()> {
    let conf_bps = get_confidence_bps(price);
    require!(
        conf_bps <= MAX_CONFIDENCE_BPS,
        CloakCraftError::PriceConfidenceTooHigh
    );
    Ok(())
}

/// Well-known Pyth feed IDs for common pairs
pub mod feed_ids {
    /// SOL/USD feed ID
    pub const SOL_USD: [u8; 32] = [
        0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
        0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
        0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc,
        0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
    ];

    /// BTC/USD feed ID
    pub const BTC_USD: [u8; 32] = [
        0xe6, 0x2d, 0xf6, 0xc8, 0xb4, 0xa8, 0x5f, 0xe1,
        0xa6, 0x7d, 0xb4, 0x4d, 0xc1, 0x2d, 0xe5, 0xdb,
        0x33, 0x0f, 0x7a, 0xc6, 0x6b, 0x72, 0xdc, 0x65,
        0x8a, 0xfe, 0xdf, 0x0f, 0x4a, 0x41, 0x5b, 0x43,
    ];

    /// ETH/USD feed ID
    pub const ETH_USD: [u8; 32] = [
        0xff, 0x61, 0x49, 0x1a, 0x93, 0x11, 0x12, 0xdd,
        0xf1, 0xbd, 0x81, 0x47, 0xcd, 0x1b, 0x64, 0x13,
        0x75, 0xf7, 0x9f, 0x58, 0x25, 0x12, 0x6d, 0x66,
        0x54, 0x80, 0x87, 0x46, 0x34, 0xfd, 0x0a, 0xce,
    ];

    /// USDC/USD feed ID (stablecoin, usually ~$1)
    pub const USDC_USD: [u8; 32] = [
        0xea, 0xa0, 0x20, 0xc6, 0x1c, 0xc4, 0x79, 0x71,
        0x2a, 0x35, 0x7a, 0xb5, 0xe4, 0xc7, 0x9a, 0x98,
        0xed, 0x97, 0x9e, 0xd4, 0x30, 0x24, 0xf7, 0x50,
        0x56, 0xbe, 0x2d, 0xb8, 0xbf, 0x6a, 0x43, 0x58,
    ];
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_price_conversion() {
        // Test price with -8 exponent (typical Pyth format)
        let price = Price {
            price: 15000000000, // $150.00 with 8 decimals
            conf: 1000000,
            exponent: -8,
            publish_time: 0,
        };

        let result = convert_price_to_u64(&price).unwrap();
        assert_eq!(result, 150_000_000); // $150.00 with 6 decimals
    }

    #[test]
    fn test_confidence_bps() {
        let price = Price {
            price: 10000,
            conf: 100, // 1% confidence
            exponent: -8,
            publish_time: 0,
        };

        let conf_bps = get_confidence_bps(&price);
        assert_eq!(conf_bps, 100); // 1%
    }
}
