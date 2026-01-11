// Market Order Fill Circuit
// Atomically fills an order: maker gets ask_token, taker gets offer_token
// Full privacy: both parties shielded

use cloakcraft_lib::commitment::{compute_commitment, constrain_amount_64bit};
use cloakcraft_lib::nullifier::derive_spending_nullifier;
use cloakcraft_lib::merkle::verify_merkle_proof;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};
use cloakcraft_lib::poseidon::hash5;

pub struct PublicInputs {
    merkle_root_maker: Field,
    merkle_root_taker: Field,
    escrow_nullifier: Field,
    taker_nullifier: Field,
    maker_output_commitment: Field,
    taker_output_commitment: Field,
    taker_change_commitment: Field,
    current_timestamp: Field,
}

fn main(
    // Public inputs - marked with pub for Sunspot/gnark compatibility
    merkle_root_maker: pub Field,
    merkle_root_taker: pub Field,
    escrow_nullifier: pub Field,
    taker_nullifier: pub Field,
    maker_output_commitment: pub Field,
    taker_output_commitment: pub Field,
    taker_change_commitment: pub Field,
    current_timestamp: pub Field,

    // Private inputs - Escrow (Maker Side)
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
    expiry: Field,

    // Private inputs - Taker
    taker_stealth_pub_x: Field,
    taker_stealth_pub_y: Field,
    taker_amount: Field,
    taker_randomness: Field,
    taker_stealth_spending_key: Field,
    taker_merkle_path: [Field; 16],
    taker_merkle_indices: [Field; 16],
    taker_leaf_index: Field,

    // Taker's receiving address
    taker_receive_stealth_pub_x: Field,

    // Private inputs - Outputs
    maker_output_randomness: Field,
    taker_output_randomness: Field,
    taker_change_stealth_pub_x: Field,
    taker_change_randomness: Field
) -> pub PublicInputs {
    // 1. Verify Escrow (Maker's Locked Funds)
    let escrow_derived_pub = scalar_mul(escrow_stealth_spending_key, Point::generator());
    assert(escrow_derived_pub.x == escrow_stealth_pub_x);
    assert(escrow_derived_pub.y == escrow_stealth_pub_y);

    let escrow_commitment = compute_commitment(
        escrow_stealth_pub_x,
        offer_token,
        offer_amount,
        escrow_randomness
    );

    assert(verify_merkle_proof(
        escrow_commitment,
        escrow_merkle_path,
        escrow_merkle_indices,
        merkle_root_maker
    ));

    let computed_escrow_nullifier = derive_spending_nullifier(
        escrow_stealth_spending_key,
        escrow_commitment,
        escrow_leaf_index
    );
    assert(escrow_nullifier == computed_escrow_nullifier);

    // 2. Verify Order ID
    let computed_terms_hash = hash5(
        offer_token,
        offer_amount,
        ask_token,
        ask_amount,
        maker_receive_stealth_pub_x
    );
    assert(terms_hash == computed_terms_hash);

    // 3. Verify Taker's Input
    let taker_derived_pub = scalar_mul(taker_stealth_spending_key, Point::generator());
    assert(taker_derived_pub.x == taker_stealth_pub_x);
    assert(taker_derived_pub.y == taker_stealth_pub_y);

    let taker_commitment = compute_commitment(
        taker_stealth_pub_x,
        ask_token,
        taker_amount,
        taker_randomness
    );

    assert(verify_merkle_proof(
        taker_commitment,
        taker_merkle_path,
        taker_merkle_indices,
        merkle_root_taker
    ));

    let computed_taker_nullifier = derive_spending_nullifier(
        taker_stealth_spending_key,
        taker_commitment,
        taker_leaf_index
    );
    assert(taker_nullifier == computed_taker_nullifier);

    // 4. Verify Taker Provides Enough
    assert(taker_amount as u64 >= ask_amount as u64);

    // 5. Verify Order Not Expired
    assert((current_timestamp as u64) <= (expiry as u64));

    // 6. Verify Output Commitments
    let computed_maker_output = compute_commitment(
        maker_receive_stealth_pub_x,
        ask_token,
        ask_amount,
        maker_output_randomness
    );
    assert(maker_output_commitment == computed_maker_output);

    let computed_taker_output = compute_commitment(
        taker_receive_stealth_pub_x,
        offer_token,
        offer_amount,
        taker_output_randomness
    );
    assert(taker_output_commitment == computed_taker_output);

    // 7. Verify Taker Change Output
    let taker_change_amount = taker_amount - ask_amount;
    let computed_taker_change = compute_commitment(
        taker_change_stealth_pub_x,
        ask_token,
        taker_change_amount,
        taker_change_randomness
    );
    assert(taker_change_commitment == computed_taker_change);

    // 8. Range Checks
    constrain_amount_64bit(offer_amount);
    constrain_amount_64bit(ask_amount);
    constrain_amount_64bit(taker_amount);
    constrain_amount_64bit(taker_change_amount);

    PublicInputs {
        merkle_root_maker,
        merkle_root_taker,
        escrow_nullifier,
        taker_nullifier,
        maker_output_commitment,
        taker_output_commitment,
        taker_change_commitment,
        current_timestamp,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_order_fill_basic() {
    // Test filling an order: maker's offer_token -> taker, taker's ask_token -> maker
    let escrow_spending_key: Field = 111;
    let taker_spending_key: Field = 222;

    let offer_token: Field = 1000;
    let ask_token: Field = 2000;
    let offer_amount: Field = 500;
    let ask_amount: Field = 600;
    let expiry: Field = 1000000;
    let current_timestamp: Field = 500000; // Before expiry

    // Escrow (maker's locked funds)
    let escrow_randomness: Field = 111;
    let escrow_derived_pub = scalar_mul(escrow_spending_key, Point::generator());
    let escrow_stealth_pub_x = escrow_derived_pub.x;
    let escrow_stealth_pub_y = escrow_derived_pub.y;
    let escrow_commitment = compute_commitment(escrow_stealth_pub_x, offer_token, offer_amount, escrow_randomness);

    let escrow_merkle_path: [Field; 16] = [0; 16];
    let escrow_merkle_indices: [Field; 16] = [0; 16];
    let escrow_leaf_index: Field = 0;
    let merkle_root_maker = compute_merkle_root(escrow_commitment, escrow_merkle_path, escrow_merkle_indices);
    let escrow_nullifier = derive_spending_nullifier(escrow_spending_key, escrow_commitment, escrow_leaf_index);

    // Maker's receiving address
    let maker_receive_stealth_pub_x: Field = 33333;

    // Terms hash
    let terms_hash = hash5(offer_token, offer_amount, ask_token, ask_amount, maker_receive_stealth_pub_x);

    // Taker's input (ask_token with extra for change)
    let taker_amount: Field = 700; // 600 for trade + 100 change
    let taker_randomness: Field = 222;
    let taker_derived_pub = scalar_mul(taker_spending_key, Point::generator());
    let taker_stealth_pub_x = taker_derived_pub.x;
    let taker_stealth_pub_y = taker_derived_pub.y;
    let taker_commitment = compute_commitment(taker_stealth_pub_x, ask_token, taker_amount, taker_randomness);

    let taker_merkle_path: [Field; 16] = [0; 16];
    let taker_merkle_indices: [Field; 16] = [0; 16];
    let taker_leaf_index: Field = 0;
    let merkle_root_taker = compute_merkle_root(taker_commitment, taker_merkle_path, taker_merkle_indices);
    let taker_nullifier = derive_spending_nullifier(taker_spending_key, taker_commitment, taker_leaf_index);

    // Taker's receiving address
    let taker_receive_stealth_pub_x: Field = 44444;

    // Output commitments
    let maker_output_randomness: Field = 333;
    let maker_output_commitment = compute_commitment(maker_receive_stealth_pub_x, ask_token, ask_amount, maker_output_randomness);

    let taker_output_randomness: Field = 444;
    let taker_output_commitment = compute_commitment(taker_receive_stealth_pub_x, offer_token, offer_amount, taker_output_randomness);

    // Taker change (100 ask_token)
    let taker_change_stealth_pub_x: Field = 55555;
    let taker_change_randomness: Field = 555;
    let taker_change_commitment = compute_commitment(taker_change_stealth_pub_x, ask_token, 100, taker_change_randomness);

    let result = main(
        merkle_root_maker,
        merkle_root_taker,
        escrow_nullifier,
        taker_nullifier,
        maker_output_commitment,
        taker_output_commitment,
        taker_change_commitment,
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
        expiry,
        taker_stealth_pub_x,
        taker_stealth_pub_y,
        taker_amount,
        taker_randomness,
        taker_spending_key,
        taker_merkle_path,
        taker_merkle_indices,
        taker_leaf_index,
        taker_receive_stealth_pub_x,
        maker_output_randomness,
        taker_output_randomness,
        taker_change_stealth_pub_x,
        taker_change_randomness
    );

    assert(result.escrow_nullifier == escrow_nullifier);
    assert(result.taker_nullifier == taker_nullifier);
    assert(result.current_timestamp == current_timestamp);
}
