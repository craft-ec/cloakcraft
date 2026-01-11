// Stealth Address Derivation
// Uses ECDH to create unlinkable one-time addresses

use crate::babyjubjub::{Point, scalar_mul, point_add};
use crate::poseidon::hash2;
use crate::constants::STEALTH_DOMAIN;

// Stealth address components
pub struct StealthAddress {
    pub spending_pub: Point,  // One-time public key for spending
    pub eph_pub: Point,       // Ephemeral public key (stored with note)
}

// Sender derives stealth address for recipient
// 1. Generate random ephemeral key pair
// 2. Compute shared secret via ECDH
// 3. Derive one-time spending public key
pub fn derive_stealth_address(
    recipient_spending_pub: Point,
    recipient_viewing_pub: Point,
    eph_private: Field
) -> StealthAddress {
    // eph_pub = eph_private * G
    let eph_pub = scalar_mul(eph_private, Point::generator());

    // shared_point = eph_private * recipient_viewing_pub (ECDH)
    let shared_point = scalar_mul(eph_private, recipient_viewing_pub);

    // shared_hash = Poseidon(STEALTH_DOMAIN, shared_point.x, shared_point.y)
    let shared_hash = hash2(STEALTH_DOMAIN + shared_point.x, shared_point.y);

    // stealth_spending_pub = recipient_spending_pub + shared_hash * G
    let offset = scalar_mul(shared_hash, Point::generator());
    let spending_pub = point_add(recipient_spending_pub, offset);

    StealthAddress {
        spending_pub,
        eph_pub,
    }
}

// Recipient derives stealth spending key to spend received note
pub fn derive_stealth_spending_key(
    master_spending_key: Field,
    master_viewing_key: Field,
    eph_pub: Point
) -> Field {
    // shared_point = master_viewing_key * eph_pub (ECDH)
    let shared_point = scalar_mul(master_viewing_key, eph_pub);

    // shared_hash = Poseidon(STEALTH_DOMAIN, shared_point.x, shared_point.y)
    let shared_hash = hash2(STEALTH_DOMAIN + shared_point.x, shared_point.y);

    // stealth_spending_key = master_spending_key + shared_hash
    master_spending_key + shared_hash
}

// Verify that a stealth public key matches the expected derivation
pub fn verify_stealth_ownership(
    stealth_spending_key: Field,
    expected_stealth_pub: Point
) -> bool {
    let derived_pub = scalar_mul(stealth_spending_key, Point::generator());
    derived_pub.equals(expected_stealth_pub)
}

#[test]
fn test_stealth_address_derivation() {
    // Recipient keys
    let recipient_spending_key: Field = 12345;
    let recipient_viewing_key: Field = 67890;
    let recipient_spending_pub = scalar_mul(recipient_spending_key, Point::generator());
    let recipient_viewing_pub = scalar_mul(recipient_viewing_key, Point::generator());

    // Sender generates ephemeral key
    let eph_private: Field = 11111;

    // Sender derives stealth address
    let stealth = derive_stealth_address(
        recipient_spending_pub,
        recipient_viewing_pub,
        eph_private
    );

    // Recipient derives stealth spending key
    let stealth_spending_key = derive_stealth_spending_key(
        recipient_spending_key,
        recipient_viewing_key,
        stealth.eph_pub
    );

    // Verify ownership
    assert(verify_stealth_ownership(stealth_spending_key, stealth.spending_pub));
}
