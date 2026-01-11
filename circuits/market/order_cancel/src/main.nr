// Market Order Cancel Circuit
// Cancels an unfilled order and returns escrowed funds to maker
// Full privacy

use cloakcraft_lib::commitment::{compute_commitment, constrain_amount_64bit};
use cloakcraft_lib::nullifier::derive_spending_nullifier;
use cloakcraft_lib::merkle::verify_merkle_proof;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};
use cloakcraft_lib::poseidon::hash5;

pub struct PublicInputs {
    merkle_root: Field,
    escrow_nullifier: Field,
    refund_commitment: Field,
    current_timestamp: Field,
}

fn main(
    // Public inputs - marked with pub for Sunspot/gnark compatibility
    merkle_root: pub Field,
    escrow_nullifier: pub Field,
    refund_commitment: pub Field,
    current_timestamp: pub Field,

    // Private inputs - Escrow note
    escrow_stealth_pub_x: Field,
    escrow_stealth_pub_y: Field,
    escrow_stealth_spending_key: Field,
    escrow_randomness: Field,
    escrow_merkle_path: [Field; 16],
    escrow_merkle_indices: [Field; 16],
    escrow_leaf_index: Field,

    // Order terms
    offer_token: Field,
    offer_amount: Field,
    ask_token: Field,
    ask_amount: Field,
    maker_receive_stealth_pub_x: Field,
    terms_hash: Field,

    // Refund output
    refund_stealth_pub_x: Field,
    refund_randomness: Field
) -> pub PublicInputs {
    // 1. Verify Escrow Ownership
    let escrow_derived_pub = scalar_mul(escrow_stealth_spending_key, Point::generator());
    assert(escrow_derived_pub.x == escrow_stealth_pub_x);
    assert(escrow_derived_pub.y == escrow_stealth_pub_y);

    let escrow_commitment = compute_commitment(
        escrow_stealth_pub_x,
        offer_token,
        offer_amount,
        escrow_randomness
    );

    // 2. Verify Merkle Inclusion
    assert(verify_merkle_proof(
        escrow_commitment,
        escrow_merkle_path,
        escrow_merkle_indices,
        merkle_root
    ));

    // 3. Verify Nullifier
    let computed_nullifier = derive_spending_nullifier(
        escrow_stealth_spending_key,
        escrow_commitment,
        escrow_leaf_index
    );
    assert(escrow_nullifier == computed_nullifier);

    // 4. Verify Terms Hash
    let computed_terms_hash = hash5(
        offer_token,
        offer_amount,
        ask_token,
        ask_amount,
        maker_receive_stealth_pub_x
    );
    assert(terms_hash == computed_terms_hash);

    // 5. Verify Refund Commitment
    let computed_refund = compute_commitment(
        refund_stealth_pub_x,
        offer_token,
        offer_amount,
        refund_randomness
    );
    assert(refund_commitment == computed_refund);

    // 6. Range Checks
    constrain_amount_64bit(offer_amount);

    PublicInputs {
        merkle_root,
        escrow_nullifier,
        refund_commitment,
        current_timestamp,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_order_cancel_basic() {
    // Test cancelling an order and reclaiming escrowed funds
    let escrow_spending_key: Field = 555;
    let offer_token: Field = 1000;
    let ask_token: Field = 2000;
    let offer_amount: Field = 500;
    let ask_amount: Field = 600;
    let current_timestamp: Field = 100000;

    // Escrow note
    let escrow_randomness: Field = 111;
    let escrow_derived_pub = scalar_mul(escrow_spending_key, Point::generator());
    let escrow_stealth_pub_x = escrow_derived_pub.x;
    let escrow_stealth_pub_y = escrow_derived_pub.y;
    let escrow_commitment = compute_commitment(escrow_stealth_pub_x, offer_token, offer_amount, escrow_randomness);

    let escrow_merkle_path: [Field; 16] = [0; 16];
    let escrow_merkle_indices: [Field; 16] = [0; 16];
    let escrow_leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(escrow_commitment, escrow_merkle_path, escrow_merkle_indices);
    let escrow_nullifier = derive_spending_nullifier(escrow_spending_key, escrow_commitment, escrow_leaf_index);

    // Maker's receiving address
    let maker_receive_stealth_pub_x: Field = 77777;

    // Terms hash
    let terms_hash = hash5(offer_token, offer_amount, ask_token, ask_amount, maker_receive_stealth_pub_x);

    // Refund commitment (full amount back to maker)
    let refund_stealth_pub_x: Field = 88888;
    let refund_randomness: Field = 222;
    let refund_commitment = compute_commitment(refund_stealth_pub_x, offer_token, offer_amount, refund_randomness);

    let result = main(
        merkle_root,
        escrow_nullifier,
        refund_commitment,
        current_timestamp,
        escrow_stealth_pub_x,
        escrow_stealth_pub_y,
        escrow_spending_key,
        escrow_randomness,
        escrow_merkle_path,
        escrow_merkle_indices,
        escrow_leaf_index,
        offer_token,
        offer_amount,
        ask_token,
        ask_amount,
        maker_receive_stealth_pub_x,
        terms_hash,
        refund_stealth_pub_x,
        refund_randomness
    );

    assert(result.escrow_nullifier == escrow_nullifier);
    assert(result.refund_commitment == refund_commitment);
    assert(result.current_timestamp == current_timestamp);
}
