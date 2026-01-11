// Transfer 1x3 Circuit
// 1 input note -> 3 output notes (recipient + change + relayer fee)
// Private transfer with relayer fee support for IP privacy

use cloakcraft_lib::commitment::{compute_commitment, constrain_amount_64bit};
use cloakcraft_lib::nullifier::derive_spending_nullifier;
use cloakcraft_lib::merkle::verify_merkle_proof;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};

// Public outputs struct
pub struct PublicInputs {
    merkle_root: Field,
    nullifier: Field,
    out_commitment_1: Field,
    out_commitment_2: Field,
    out_commitment_3: Field,
    token_mint: Field,
    relayer_fee: Field,
    unshield_amount: Field,
}

fn main(
    // Public inputs - marked with pub for Sunspot/gnark compatibility
    merkle_root: pub Field,
    nullifier: pub Field,
    out_commitment_1: pub Field,
    out_commitment_2: pub Field,
    out_commitment_3: pub Field,
    token_mint: pub Field,
    relayer_fee: pub Field,
    unshield_amount: pub Field,

    // Private inputs - Input note details
    in_stealth_pub_x: Field,
    in_stealth_pub_y: Field,
    in_amount: Field,
    in_randomness: Field,
    in_stealth_spending_key: Field,

    // Merkle proof
    merkle_path: [Field; 16],
    merkle_path_indices: [Field; 16],
    leaf_index: Field,

    // Output 1 details (recipient)
    out_stealth_pub_x_1: Field,
    out_amount_1: Field,
    out_randomness_1: Field,

    // Output 2 details (change)
    out_stealth_pub_x_2: Field,
    out_amount_2: Field,
    out_randomness_2: Field,

    // Output 3 details (relayer fee)
    out_stealth_pub_x_3: Field,
    out_amount_3: Field,
    out_randomness_3: Field
) -> pub PublicInputs {
    // 1. Verify Input Commitment Ownership
    let derived_pub = scalar_mul(in_stealth_spending_key, Point::generator());
    assert(derived_pub.x == in_stealth_pub_x);
    assert(derived_pub.y == in_stealth_pub_y);

    // Reconstruct input commitment
    let in_commitment = compute_commitment(
        in_stealth_pub_x,
        token_mint,
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

    // 4. Verify Output Commitments
    let computed_out_1 = compute_commitment(
        out_stealth_pub_x_1,
        token_mint,
        out_amount_1,
        out_randomness_1
    );
    assert(out_commitment_1 == computed_out_1);

    let computed_out_2 = compute_commitment(
        out_stealth_pub_x_2,
        token_mint,
        out_amount_2,
        out_randomness_2
    );
    assert(out_commitment_2 == computed_out_2);

    let computed_out_3 = compute_commitment(
        out_stealth_pub_x_3,
        token_mint,
        out_amount_3,
        out_randomness_3
    );
    assert(out_commitment_3 == computed_out_3);

    // 5. Verify Relayer Fee
    assert(out_amount_3 == relayer_fee);

    // 6. Balance Check
    let total_out = out_amount_1 + out_amount_2 + out_amount_3 + unshield_amount;
    assert(in_amount == total_out);

    // 7. Range Checks (64-bit amounts)
    constrain_amount_64bit(in_amount);
    constrain_amount_64bit(out_amount_1);
    constrain_amount_64bit(out_amount_2);
    constrain_amount_64bit(out_amount_3);
    constrain_amount_64bit(unshield_amount);
    constrain_amount_64bit(relayer_fee);

    PublicInputs {
        merkle_root,
        nullifier,
        out_commitment_1,
        out_commitment_2,
        out_commitment_3,
        token_mint,
        relayer_fee,
        unshield_amount,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_transfer_1x3_basic() {
    // Test values
    let spending_key: Field = 789;
    let token_mint: Field = 3000;
    let in_amount: Field = 1000;
    let in_randomness: Field = 555;

    // Derive public key
    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;

    // Create input commitment
    let in_commitment = compute_commitment(in_stealth_pub_x, token_mint, in_amount, in_randomness);

    // Merkle path
    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Output 1: recipient gets 600
    let out_pub_x_1: Field = 11111;
    let out_amount_1: Field = 600;
    let out_randomness_1: Field = 100;
    let out_commitment_1 = compute_commitment(out_pub_x_1, token_mint, out_amount_1, out_randomness_1);

    // Output 2: change 350
    let out_pub_x_2: Field = 22222;
    let out_amount_2: Field = 350;
    let out_randomness_2: Field = 200;
    let out_commitment_2 = compute_commitment(out_pub_x_2, token_mint, out_amount_2, out_randomness_2);

    // Output 3: relayer fee 50
    let out_pub_x_3: Field = 33333;
    let out_amount_3: Field = 50;
    let out_randomness_3: Field = 300;
    let out_commitment_3 = compute_commitment(out_pub_x_3, token_mint, out_amount_3, out_randomness_3);

    let relayer_fee: Field = 50;
    let unshield_amount: Field = 0;

    // 600 + 350 + 50 + 0 = 1000
    let result = main(
        merkle_root,
        nullifier,
        out_commitment_1,
        out_commitment_2,
        out_commitment_3,
        token_mint,
        relayer_fee,
        unshield_amount,
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_amount,
        in_randomness,
        spending_key,
        merkle_path,
        merkle_path_indices,
        leaf_index,
        out_pub_x_1,
        out_amount_1,
        out_randomness_1,
        out_pub_x_2,
        out_amount_2,
        out_randomness_2,
        out_pub_x_3,
        out_amount_3,
        out_randomness_3
    );

    assert(result.relayer_fee == 50);
    assert(result.nullifier == nullifier);
}

#[test]
fn test_transfer_1x3_with_unshield() {
    let spending_key: Field = 999;
    let token_mint: Field = 4000;
    let in_amount: Field = 2000;
    let in_randomness: Field = 777;

    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;

    let in_commitment = compute_commitment(in_stealth_pub_x, token_mint, in_amount, in_randomness);

    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Output 1: 1000
    let out_pub_x_1: Field = 44444;
    let out_amount_1: Field = 1000;
    let out_randomness_1: Field = 111;
    let out_commitment_1 = compute_commitment(out_pub_x_1, token_mint, out_amount_1, out_randomness_1);

    // Output 2: 500 change
    let out_pub_x_2: Field = 55555;
    let out_amount_2: Field = 500;
    let out_randomness_2: Field = 222;
    let out_commitment_2 = compute_commitment(out_pub_x_2, token_mint, out_amount_2, out_randomness_2);

    // Output 3: 100 relayer fee
    let out_pub_x_3: Field = 66666;
    let out_amount_3: Field = 100;
    let out_randomness_3: Field = 333;
    let out_commitment_3 = compute_commitment(out_pub_x_3, token_mint, out_amount_3, out_randomness_3);

    let relayer_fee: Field = 100;
    let unshield_amount: Field = 400;

    // 1000 + 500 + 100 + 400 = 2000
    let result = main(
        merkle_root,
        nullifier,
        out_commitment_1,
        out_commitment_2,
        out_commitment_3,
        token_mint,
        relayer_fee,
        unshield_amount,
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_amount,
        in_randomness,
        spending_key,
        merkle_path,
        merkle_path_indices,
        leaf_index,
        out_pub_x_1,
        out_amount_1,
        out_randomness_1,
        out_pub_x_2,
        out_amount_2,
        out_randomness_2,
        out_pub_x_3,
        out_amount_3,
        out_randomness_3
    );

    assert(result.unshield_amount == 400);
}
