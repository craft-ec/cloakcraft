//! Field element conversion helpers for BN254 curve
//!
//! Provides utilities for converting Solana types (Pubkey, u64) to BN254 field elements
//! used in ZK proofs. Ensures all values are less than the BN254 scalar field modulus (Fr).
//!
//! IMPORTANT: Circom/Groth16 circuits use the SCALAR field (Fr), not the base field (Fq).
//! - Fr = 21888242871839275222246405745257275088548364400416034343698204186575808495617 (circuit field)
//! - Fq = 21888242871839275222246405745257275088696311157297823662689037894645226208583 (curve coordinates)

use anchor_lang::prelude::*;

/// BN254 scalar field modulus (Fr) - big-endian
/// This is the field used by Circom circuits for Groth16 proofs.
/// r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
const BN254_SCALAR_FIELD_MODULUS: [u8; 32] = [
    0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29,
    0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
    0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91,
    0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x01,
];

/// Convert a Pubkey to a BN254 field element
///
/// Since Pubkey is 256 bits and BN254 field is ~254 bits, we need to reduce modulo the field prime.
/// This ensures the resulting value can be used as a public input in ZK proofs.
pub fn pubkey_to_field(pubkey: &Pubkey) -> [u8; 32] {
    let mut value = pubkey.to_bytes();

    // Subtract modulus while value >= modulus
    // Max 4 subtractions needed since pubkey is 256 bits and modulus is ~254 bits
    for _ in 0..4 {
        if ge_modulus(&value) {
            value = subtract_modulus(&value);
        } else {
            break;
        }
    }

    value
}

/// Convert a u64 to a BN254 field element (big-endian)
///
/// u64 values are always less than the field modulus, so no reduction needed.
/// Result is a 32-byte big-endian representation with the u64 in the last 8 bytes.
pub fn u64_to_field(value: u64) -> [u8; 32] {
    let mut result = [0u8; 32];
    result[24..32].copy_from_slice(&value.to_be_bytes());
    result
}

/// Convert arbitrary 32 bytes to a BN254 field element
///
/// Similar to pubkey_to_field, but takes raw bytes (e.g., market_id).
/// Ensures the resulting value is less than the BN254 scalar field modulus.
pub fn bytes_to_field(bytes: &[u8; 32]) -> [u8; 32] {
    let mut value = *bytes;

    // Subtract modulus while value >= modulus
    // Max 4 subtractions needed since input is 256 bits and modulus is ~254 bits
    for _ in 0..4 {
        if ge_modulus(&value) {
            value = subtract_modulus(&value);
        } else {
            break;
        }
    }

    value
}

/// Subtract BN254 scalar field modulus from value: result = value - modulus
fn subtract_modulus(value: &[u8; 32]) -> [u8; 32] {
    let mut result = [0u8; 32];
    let mut borrow: i16 = 0;

    // Big-endian subtraction
    for i in (0..32).rev() {
        let diff = value[i] as i16 - BN254_SCALAR_FIELD_MODULUS[i] as i16 - borrow;
        if diff < 0 {
            result[i] = (diff + 256) as u8;
            borrow = 1;
        } else {
            result[i] = diff as u8;
            borrow = 0;
        }
    }
    result
}

/// Compare 32-byte big-endian number with BN254 scalar field modulus
///
/// Returns true if value >= modulus
fn ge_modulus(value: &[u8; 32]) -> bool {
    for i in 0..32 {
        if value[i] > BN254_SCALAR_FIELD_MODULUS[i] {
            return true;
        } else if value[i] < BN254_SCALAR_FIELD_MODULUS[i] {
            return false;
        }
    }
    true // equal
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_u64_to_field() {
        let value = 12345u64;
        let field_elem = u64_to_field(value);

        // Should be zero-padded with value in last 8 bytes
        assert_eq!(&field_elem[0..24], &[0u8; 24]);
        assert_eq!(&field_elem[24..32], &value.to_be_bytes());
    }

    #[test]
    fn test_pubkey_reduction() {
        // Test that reduction works for large values
        let mut large_value = [0xffu8; 32];
        large_value = subtract_modulus(&large_value);

        // Result should be less than modulus
        assert!(!ge_modulus(&large_value));
    }
}
