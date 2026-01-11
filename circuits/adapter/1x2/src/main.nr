// Adapter 1x2 Circuit
// External DEX swap: 1 input -> 2 outputs (swap result + relayer fee)
// Partial privacy: amounts visible to DEX, identity hidden

use cloakcraft_lib::commitment::{compute_commitment, constrain_amount_64bit};
use cloakcraft_lib::nullifier::derive_spending_nullifier;
use cloakcraft_lib::merkle::verify_merkle_proof;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};
use cloakcraft_lib::poseidon::hash4;

pub struct PublicInputs {
    merkle_root: Field,
    nullifier: Field,
    input_token: Field,
    input_amount: Field,
    output_token: Field,
    min_output: Field,
    adapt_module: Field,
    adapt_params_hash: Field,
    out_commitment_1: Field,
    out_commitment_2: Field,
    relayer_fee: Field,
}

fn main(
    // Public inputs - marked with pub for Sunspot/gnark compatibility
    merkle_root: pub Field,
    nullifier: pub Field,
    input_token: pub Field,
    input_amount: pub Field,
    output_token: pub Field,
    min_output: pub Field,
    adapt_module: pub Field,
    adapt_params_hash: pub Field,
    out_commitment_1: pub Field,
    out_commitment_2: pub Field,
    relayer_fee: pub Field,

    // Private inputs - Input note
    in_stealth_pub_x: Field,
    in_stealth_pub_y: Field,
    in_full_amount: Field,
    in_randomness: Field,
    in_stealth_spending_key: Field,

    // Merkle proof
    merkle_path: [Field; 16],
    merkle_path_indices: [Field; 16],
    leaf_index: Field,

    // Output 1: Swap result
    out_stealth_pub_x_1: Field,
    out_amount_1: Field,
    out_randomness_1: Field,

    // Output 2: Relayer fee
    out_stealth_pub_x_2: Field,
    out_randomness_2: Field
) -> pub PublicInputs {
    // 1. Verify Input Commitment Ownership
    let derived_pub = scalar_mul(in_stealth_spending_key, Point::generator());
    assert(derived_pub.x == in_stealth_pub_x);
    assert(derived_pub.y == in_stealth_pub_y);

    let in_commitment = compute_commitment(
        in_stealth_pub_x,
        input_token,
        in_full_amount,
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

    // 4. Verify Balance (Input Side)
    assert(in_full_amount == input_amount + relayer_fee);

    // 5. Verify Output Commitments
    let computed_out_1 = compute_commitment(
        out_stealth_pub_x_1,
        output_token,
        out_amount_1,
        out_randomness_1
    );
    assert(out_commitment_1 == computed_out_1);

    let computed_out_2 = compute_commitment(
        out_stealth_pub_x_2,
        input_token,
        relayer_fee,
        out_randomness_2
    );
    assert(out_commitment_2 == computed_out_2);

    // 6. Slippage Protection
    assert(out_amount_1 as u64 >= min_output as u64);

    // 7. Range Checks
    constrain_amount_64bit(in_full_amount);
    constrain_amount_64bit(input_amount);
    constrain_amount_64bit(out_amount_1);
    constrain_amount_64bit(relayer_fee);
    constrain_amount_64bit(min_output);

    // 8. Adapter Binding
    let _binding = hash4(adapt_module, adapt_params_hash, input_token, output_token);

    PublicInputs {
        merkle_root,
        nullifier,
        input_token,
        input_amount,
        output_token,
        min_output,
        adapt_module,
        adapt_params_hash,
        out_commitment_1,
        out_commitment_2,
        relayer_fee,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_adapter_1x2_basic() {
    // Test external DEX swap with relayer fee: 1 input -> 2 outputs
    let spending_key: Field = 333;
    let input_token: Field = 5000;
    let output_token: Field = 6000;
    let in_full_amount: Field = 1000;
    let in_randomness: Field = 111;

    // Derive public key
    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;

    // Create input commitment
    let in_commitment = compute_commitment(in_stealth_pub_x, input_token, in_full_amount, in_randomness);

    // Merkle proof
    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Relayer fee: 50
    let relayer_fee: Field = 50;
    let input_amount: Field = 950; // 1000 - 50 = 950 to swap

    // Output 1: swap result (900 output tokens for 950 input)
    let out_stealth_pub_x_1: Field = 44444;
    let out_amount_1: Field = 900;
    let out_randomness_1: Field = 222;
    let out_commitment_1 = compute_commitment(out_stealth_pub_x_1, output_token, out_amount_1, out_randomness_1);

    // Output 2: relayer fee in input token
    let out_stealth_pub_x_2: Field = 55555;
    let out_randomness_2: Field = 333;
    let out_commitment_2 = compute_commitment(out_stealth_pub_x_2, input_token, relayer_fee, out_randomness_2);

    let min_output: Field = 850;
    let adapt_module: Field = 99999;
    let adapt_params_hash: Field = 88888;

    let result = main(
        merkle_root,
        nullifier,
        input_token,
        input_amount,
        output_token,
        min_output,
        adapt_module,
        adapt_params_hash,
        out_commitment_1,
        out_commitment_2,
        relayer_fee,
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_full_amount,
        in_randomness,
        spending_key,
        merkle_path,
        merkle_path_indices,
        leaf_index,
        out_stealth_pub_x_1,
        out_amount_1,
        out_randomness_1,
        out_stealth_pub_x_2,
        out_randomness_2
    );

    assert(result.relayer_fee == 50);
    assert(result.input_amount == 950);
}
