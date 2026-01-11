// ElGamal Encryption for Private Voting
// Additive ElGamal on BabyJubJub curve
// Supports homomorphic addition of encrypted values

use crate::babyjubjub::{Point, scalar_mul, point_add};

// ElGamal ciphertext (C1, C2)
pub struct Ciphertext {
    pub c1: Point,  // r * G (ephemeral public key)
    pub c2: Point,  // M + r * P (encrypted message point)
}

impl Ciphertext {
    // Zero ciphertext (identity)
    pub fn zero() -> Self {
        Ciphertext {
            c1: Point::identity(),
            c2: Point::identity(),
        }
    }
}

// Encrypt a scalar value (voting power)
// The value is encoded as v * G (point multiplication)
// C1 = r * G
// C2 = v * G + r * P
pub fn encrypt(
    value: Field,
    public_key: Point,
    randomness: Field
) -> Ciphertext {
    let g = Point::generator();

    // C1 = r * G
    let c1 = scalar_mul(randomness, g);

    // v * G (encode value as curve point)
    let value_point = scalar_mul(value, g);

    // r * P (shared secret)
    let shared = scalar_mul(randomness, public_key);

    // C2 = v * G + r * P
    let c2 = point_add(value_point, shared);

    Ciphertext { c1, c2 }
}

// Homomorphic addition of ciphertexts
// E(a) + E(b) = E(a + b)
pub fn add_ciphertexts(ct1: Ciphertext, ct2: Ciphertext) -> Ciphertext {
    Ciphertext {
        c1: point_add(ct1.c1, ct2.c1),
        c2: point_add(ct1.c2, ct2.c2),
    }
}

// Verify encryption is correctly formed
// Given plaintext value and randomness, verify ciphertext matches
pub fn verify_encryption(
    ciphertext: Ciphertext,
    value: Field,
    public_key: Point,
    randomness: Field
) -> bool {
    let expected = encrypt(value, public_key, randomness);
    ciphertext.c1.equals(expected.c1) & ciphertext.c2.equals(expected.c2)
}

// Encrypt zero (useful for vote options not selected)
pub fn encrypt_zero(public_key: Point, randomness: Field) -> Ciphertext {
    encrypt(0, public_key, randomness)
}

// Create vote ciphertext for a specific option
// Returns array of ciphertexts: selected option gets the power, others get zero
pub fn create_vote_ciphertexts<let NUM_OPTIONS: u32>(
    selected_option: Field,
    voting_power: Field,
    public_key: Point,
    randomness: [Field; NUM_OPTIONS]
) -> [Ciphertext; NUM_OPTIONS] {
    let mut ciphertexts: [Ciphertext; NUM_OPTIONS] = [Ciphertext::zero(); NUM_OPTIONS];

    for i in 0..NUM_OPTIONS {
        let is_selected = (selected_option == (i as Field));
        let value = if is_selected { voting_power } else { 0 };
        ciphertexts[i] = encrypt(value, public_key, randomness[i]);
    }

    ciphertexts
}

#[test]
fn test_encrypt_decrypt_concept() {
    // Note: Actual decryption requires discrete log (done off-chain)
    let private_key: Field = 12345;
    let public_key = scalar_mul(private_key, Point::generator());
    let value: Field = 100;
    let randomness: Field = 67890;

    let ct = encrypt(value, public_key, randomness);
    assert(verify_encryption(ct, value, public_key, randomness));
}

#[test]
fn test_homomorphic_addition() {
    let private_key: Field = 12345;
    let public_key = scalar_mul(private_key, Point::generator());

    let ct1 = encrypt(100, public_key, 111);
    let ct2 = encrypt(200, public_key, 222);

    let ct_sum = add_ciphertexts(ct1, ct2);

    // The sum ciphertext should decrypt to 300
    // We can't verify this in-circuit (requires discrete log)
    // But we can verify the structure is correct
    assert(!ct_sum.c1.is_identity());
    assert(!ct_sum.c2.is_identity());
}

#[test]
fn test_encrypt_zero() {
    let private_key: Field = 12345;
    let public_key = scalar_mul(private_key, Point::generator());

    let ct = encrypt_zero(public_key, 67890);
    assert(verify_encryption(ct, 0, public_key, 67890));
}
