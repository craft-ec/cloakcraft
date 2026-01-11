// Helper circuit to compute and print test values
// Run with: nargo execute --print-acir compute_test_values

use cloakcraft_lib::commitment::compute_commitment;
use cloakcraft_lib::nullifier::derive_spending_nullifier;
use cloakcraft_lib::merkle::compute_merkle_root;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};

fn main(
    // Inputs for test case
    spending_key: Field,
    token_mint: Field,
    in_amount: Field,
    in_randomness: Field,
    leaf_index: Field,
    out_pub_x_1: Field,
    out_amount_1: Field,
    out_randomness_1: Field,
    out_pub_x_2: Field,
    out_amount_2: Field,
    out_randomness_2: Field
) -> pub (Field, Field, Field, Field, Field, Field, Field, Field) {
    // Derive public key from spending key
    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;

    // Compute input commitment
    let in_commitment = compute_commitment(
        in_stealth_pub_x,
        token_mint,
        in_amount,
        in_randomness
    );

    // Compute merkle root (single leaf at index 0)
    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);

    // Compute nullifier
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Compute output commitments
    let out_commitment_1 = compute_commitment(out_pub_x_1, token_mint, out_amount_1, out_randomness_1);
    let out_commitment_2 = compute_commitment(out_pub_x_2, token_mint, out_amount_2, out_randomness_2);

    // Return all computed values
    (
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_commitment,
        merkle_root,
        nullifier,
        out_commitment_1,
        out_commitment_2,
        token_mint
    )
}
