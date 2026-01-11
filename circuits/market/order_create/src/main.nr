// Market Order Create Circuit
// Creates a limit order by locking funds in escrow
// Full privacy: order terms are hidden on-chain

use cloakcraft_lib::commitment::{compute_commitment, constrain_amount_64bit};
use cloakcraft_lib::nullifier::derive_spending_nullifier;
use cloakcraft_lib::merkle::verify_merkle_proof;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};
use cloakcraft_lib::poseidon::hash5;

pub struct PublicInputs {
    merkle_root: Field,
    nullifier: Field,
    order_id: Field,
    escrow_commitment: Field,
    terms_hash: Field,
    expiry: Field,
}

fn main(
    // Public inputs
    merkle_root: Field,
    nullifier: Field,
    order_id: Field,
    escrow_commitment: Field,
    terms_hash: Field,
    expiry: Field,

    // Private inputs - Input note
    in_stealth_pub_x: Field,
    in_stealth_pub_y: Field,
    in_amount: Field,
    in_randomness: Field,
    in_stealth_spending_key: Field,

    // Merkle proof
    merkle_path: [Field; 16],
    merkle_path_indices: [Field; 16],
    leaf_index: Field,

    // Order terms (private)
    offer_token: Field,
    offer_amount: Field,
    ask_token: Field,
    ask_amount: Field,

    // Escrow note details
    escrow_stealth_pub_x: Field,
    escrow_randomness: Field,

    // Maker's receiving address
    maker_receive_stealth_pub_x: Field
) -> pub PublicInputs {
    // 1. Verify Input Ownership
    let derived_pub = scalar_mul(in_stealth_spending_key, Point::generator());
    assert(derived_pub.x == in_stealth_pub_x);
    assert(derived_pub.y == in_stealth_pub_y);

    let in_commitment = compute_commitment(
        in_stealth_pub_x,
        offer_token,
        in_amount,
        in_randomness
    );

    // 2. Verify Merkle Inclusion
    assert(verify_merkle_proof(
        in_commitment,
        merkle_path,
        merkle_path_indices,
        merkle_root
    ));

    // 3. Verify Nullifier
    let computed_nullifier = derive_spending_nullifier(
        in_stealth_spending_key,
        in_commitment,
        leaf_index
    );
    assert(nullifier == computed_nullifier);

    // 4. Verify Amount Match
    assert(in_amount == offer_amount);

    // 5. Verify Terms Hash
    let computed_terms_hash = hash5(
        offer_token,
        offer_amount,
        ask_token,
        ask_amount,
        maker_receive_stealth_pub_x
    );
    assert(terms_hash == computed_terms_hash);

    // 6. Verify Order ID
    let computed_order_id = hash5(
        nullifier,
        terms_hash,
        expiry,
        0,
        0
    );
    assert(order_id == computed_order_id);

    // 7. Verify Escrow Commitment
    let computed_escrow = compute_commitment(
        escrow_stealth_pub_x,
        offer_token,
        offer_amount,
        escrow_randomness
    );
    assert(escrow_commitment == computed_escrow);

    // 8. Range Checks
    constrain_amount_64bit(offer_amount);
    constrain_amount_64bit(ask_amount);

    PublicInputs {
        merkle_root,
        nullifier,
        order_id,
        escrow_commitment,
        terms_hash,
        expiry,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_order_create_basic() {
    // Test creating a limit order
    let spending_key: Field = 444;
    let offer_token: Field = 1000;
    let ask_token: Field = 2000;
    let offer_amount: Field = 500;
    let ask_amount: Field = 600;
    let expiry: Field = 1000000; // Block height

    // Input note (offer token)
    let in_amount: Field = 500;
    let in_randomness: Field = 111;
    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;
    let in_commitment = compute_commitment(in_stealth_pub_x, offer_token, in_amount, in_randomness);

    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Maker's receiving address
    let maker_receive_stealth_pub_x: Field = 77777;

    // Terms hash
    let terms_hash = hash5(offer_token, offer_amount, ask_token, ask_amount, maker_receive_stealth_pub_x);

    // Order ID
    let order_id = hash5(nullifier, terms_hash, expiry, 0, 0);

    // Escrow commitment
    let escrow_stealth_pub_x: Field = 88888;
    let escrow_randomness: Field = 222;
    let escrow_commitment = compute_commitment(escrow_stealth_pub_x, offer_token, offer_amount, escrow_randomness);

    let result = main(
        merkle_root,
        nullifier,
        order_id,
        escrow_commitment,
        terms_hash,
        expiry,
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_amount,
        in_randomness,
        spending_key,
        merkle_path,
        merkle_path_indices,
        leaf_index,
        offer_token,
        offer_amount,
        ask_token,
        ask_amount,
        escrow_stealth_pub_x,
        escrow_randomness,
        maker_receive_stealth_pub_x
    );

    assert(result.order_id == order_id);
    assert(result.terms_hash == terms_hash);
    assert(result.expiry == expiry);
}
