// Note Commitment Scheme
// commitment = Poseidon(COMMITMENT_DOMAIN, stealth_pub_x, token_mint, amount, randomness)

use crate::poseidon::hash5;
use crate::constants::COMMITMENT_DOMAIN;

// Create a note commitment
pub fn compute_commitment(
    stealth_pub_x: Field,
    token_mint: Field,
    amount: Field,
    randomness: Field
) -> Field {
    hash5(COMMITMENT_DOMAIN, stealth_pub_x, token_mint, amount, randomness)
}

// Verify commitment matches expected value
pub fn verify_commitment(
    expected: Field,
    stealth_pub_x: Field,
    token_mint: Field,
    amount: Field,
    randomness: Field
) -> bool {
    let computed = compute_commitment(stealth_pub_x, token_mint, amount, randomness);
    computed == expected
}

// Range check for amount (64-bit)
pub fn check_amount_range(amount: Field) -> bool {
    let bits: [u1; 64] = amount.to_le_bits();
    // Reconstruct and verify
    let mut reconstructed: Field = 0;
    let mut multiplier: Field = 1;
    for i in 0..64 {
        reconstructed += (bits[i] as Field) * multiplier;
        multiplier *= 2;
    }
    reconstructed == amount
}

// Constrain amount to 64-bit range
pub fn constrain_amount_64bit(amount: Field) {
    let bits: [u1; 64] = amount.to_le_bits();
    let mut reconstructed: Field = 0;
    let mut multiplier: Field = 1;
    for i in 0..64 {
        reconstructed += (bits[i] as Field) * multiplier;
        multiplier *= 2;
    }
    assert(reconstructed == amount);
}

#[test]
fn test_commitment() {
    let stealth_pub_x: Field = 12345;
    let token_mint: Field = 67890;
    let amount: Field = 1000;
    let randomness: Field = 99999;

    let commitment = compute_commitment(stealth_pub_x, token_mint, amount, randomness);
    assert(commitment != 0);
    assert(verify_commitment(commitment, stealth_pub_x, token_mint, amount, randomness));
}

#[test]
fn test_different_randomness() {
    let stealth_pub_x: Field = 12345;
    let token_mint: Field = 67890;
    let amount: Field = 1000;

    let c1 = compute_commitment(stealth_pub_x, token_mint, amount, 111);
    let c2 = compute_commitment(stealth_pub_x, token_mint, amount, 222);

    // Different randomness should produce different commitments
    assert(c1 != c2);
}

#[test]
fn test_amount_range_valid() {
    let amount: Field = 1000000000; // 1 billion, fits in 64 bits
    assert(check_amount_range(amount));
}
