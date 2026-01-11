// Transfer 1x2 Circuit
// 1 input note -> 2 output notes (recipient + change)
// Basic private transfer without relayer fee

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
    token_mint: Field,
    unshield_amount: Field,
}

fn main(
    // Public inputs (verified against return value)
    merkle_root: Field,
    nullifier: Field,
    out_commitment_1: Field,
    out_commitment_2: Field,
    token_mint: Field,
    unshield_amount: Field,

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
    out_randomness_2: Field
) -> pub PublicInputs {
    // 1. Verify Input Commitment Ownership

    // Verify spending key corresponds to stealth public key
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

    // 5. Balance Check
    // input = output_1 + output_2 + unshield
    let total_out = out_amount_1 + out_amount_2 + unshield_amount;
    assert(in_amount == total_out);

    // 6. Range Checks (64-bit amounts)
    constrain_amount_64bit(in_amount);
    constrain_amount_64bit(out_amount_1);
    constrain_amount_64bit(out_amount_2);
    constrain_amount_64bit(unshield_amount);

    // Return public inputs for verification
    PublicInputs {
        merkle_root,
        nullifier,
        out_commitment_1,
        out_commitment_2,
        token_mint,
        unshield_amount,
    }
}

// Import for tests
use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_transfer_1x2_basic() {
    // Test values
    let spending_key: Field = 123;
    let token_mint: Field = 1000;
    let in_amount: Field = 500;
    let in_randomness: Field = 111;

    // Derive public key from spending key
    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;

    // Create input commitment
    let in_commitment = compute_commitment(
        in_stealth_pub_x,
        token_mint,
        in_amount,
        in_randomness
    );

    // Simple merkle path (all zeros for single leaf)
    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let leaf_index: Field = 0;

    // Compute merkle root
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);

    // Compute nullifier
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Output 1: recipient gets 300
    let out_pub_x_1: Field = 12345;
    let out_amount_1: Field = 300;
    let out_randomness_1: Field = 222;
    let out_commitment_1 = compute_commitment(out_pub_x_1, token_mint, out_amount_1, out_randomness_1);

    // Output 2: change 200
    let out_pub_x_2: Field = 67890;
    let out_amount_2: Field = 200;
    let out_randomness_2: Field = 333;
    let out_commitment_2 = compute_commitment(out_pub_x_2, token_mint, out_amount_2, out_randomness_2);

    // No unshield
    let unshield_amount: Field = 0;

    // Call main and verify it succeeds
    let result = main(
        merkle_root,
        nullifier,
        out_commitment_1,
        out_commitment_2,
        token_mint,
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
        out_randomness_2
    );

    // Verify returned public inputs
    assert(result.merkle_root == merkle_root);
    assert(result.nullifier == nullifier);
    assert(result.out_commitment_1 == out_commitment_1);
    assert(result.out_commitment_2 == out_commitment_2);
}

#[test]
fn test_transfer_1x2_with_unshield() {
    // Test with partial unshield (converting to public tokens)
    let spending_key: Field = 456;
    let token_mint: Field = 2000;
    let in_amount: Field = 1000;
    let in_randomness: Field = 999;

    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;

    let in_commitment = compute_commitment(in_stealth_pub_x, token_mint, in_amount, in_randomness);

    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Output 1: 400 to recipient
    let out_pub_x_1: Field = 11111;
    let out_amount_1: Field = 400;
    let out_randomness_1: Field = 100;
    let out_commitment_1 = compute_commitment(out_pub_x_1, token_mint, out_amount_1, out_randomness_1);

    // Output 2: 400 change
    let out_pub_x_2: Field = 22222;
    let out_amount_2: Field = 400;
    let out_randomness_2: Field = 200;
    let out_commitment_2 = compute_commitment(out_pub_x_2, token_mint, out_amount_2, out_randomness_2);

    // Unshield 200 (400 + 400 + 200 = 1000)
    let unshield_amount: Field = 200;

    let result = main(
        merkle_root,
        nullifier,
        out_commitment_1,
        out_commitment_2,
        token_mint,
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
        out_randomness_2
    );

    assert(result.unshield_amount == 200);
}
