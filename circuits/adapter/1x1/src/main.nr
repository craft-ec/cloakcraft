// Adapter 1x1 Circuit
// External DEX swap: 1 input -> 1 output (no relayer fee)
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
    out_commitment: Field,
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
    out_commitment: pub Field,

    // Private inputs - Input note details
    in_stealth_pub_x: Field,
    in_stealth_pub_y: Field,
    in_randomness: Field,
    in_stealth_spending_key: Field,

    // Merkle proof
    merkle_path: [Field; 16],
    merkle_path_indices: [Field; 16],
    leaf_index: Field,

    // Output note details
    out_stealth_pub_x: Field,
    out_amount: Field,
    out_randomness: Field
) -> pub PublicInputs {
    // 1. Verify Input Commitment Ownership
    let derived_pub = scalar_mul(in_stealth_spending_key, Point::generator());
    assert(derived_pub.x == in_stealth_pub_x);
    assert(derived_pub.y == in_stealth_pub_y);

    let in_commitment = compute_commitment(
        in_stealth_pub_x,
        input_token,
        input_amount,
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

    // 4. Verify Output Commitment
    let computed_out = compute_commitment(
        out_stealth_pub_x,
        output_token,
        out_amount,
        out_randomness
    );
    assert(out_commitment == computed_out);

    // 5. Slippage Protection
    assert(out_amount as u64 >= min_output as u64);

    // 6. Range Checks
    constrain_amount_64bit(input_amount);
    constrain_amount_64bit(out_amount);
    constrain_amount_64bit(min_output);

    // 7. Adapter Params Binding
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
        out_commitment,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_adapter_1x1_basic() {
    // Test external DEX swap: 1 input -> 1 output
    let spending_key: Field = 111;
    let input_token: Field = 1000; // Token A
    let output_token: Field = 2000; // Token B
    let input_amount: Field = 500;
    let in_randomness: Field = 999;

    // Derive public key
    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;

    // Create input commitment
    let in_commitment = compute_commitment(in_stealth_pub_x, input_token, input_amount, in_randomness);

    // Merkle proof
    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Output: swap result (e.g., 480 token B for 500 token A)
    let out_stealth_pub_x: Field = 77777;
    let out_amount: Field = 480;
    let out_randomness: Field = 888;
    let out_commitment = compute_commitment(out_stealth_pub_x, output_token, out_amount, out_randomness);

    // Slippage: min 450 output
    let min_output: Field = 450;

    // Adapter module and params
    let adapt_module: Field = 12345; // DEX address/ID
    let adapt_params_hash: Field = 67890; // Hash of swap params

    let result = main(
        merkle_root,
        nullifier,
        input_token,
        input_amount,
        output_token,
        min_output,
        adapt_module,
        adapt_params_hash,
        out_commitment,
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_randomness,
        spending_key,
        merkle_path,
        merkle_path_indices,
        leaf_index,
        out_stealth_pub_x,
        out_amount,
        out_randomness
    );

    assert(result.input_amount == 500);
    assert(result.min_output == 450);
}

#[test]
fn test_adapter_1x1_slippage_exact() {
    // Test slippage protection at exact boundary
    let spending_key: Field = 222;
    let input_token: Field = 3000;
    let output_token: Field = 4000;
    let input_amount: Field = 1000;
    let in_randomness: Field = 123;

    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;

    let in_commitment = compute_commitment(in_stealth_pub_x, input_token, input_amount, in_randomness);

    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);
    let nullifier = derive_spending_nullifier(spending_key, in_commitment, leaf_index);

    // Output equals exactly min_output (edge case)
    let out_stealth_pub_x: Field = 88888;
    let out_amount: Field = 950;
    let out_randomness: Field = 456;
    let out_commitment = compute_commitment(out_stealth_pub_x, output_token, out_amount, out_randomness);

    let min_output: Field = 950; // Exact match

    let adapt_module: Field = 11111;
    let adapt_params_hash: Field = 22222;

    let result = main(
        merkle_root,
        nullifier,
        input_token,
        input_amount,
        output_token,
        min_output,
        adapt_module,
        adapt_params_hash,
        out_commitment,
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_randomness,
        spending_key,
        merkle_path,
        merkle_path_indices,
        leaf_index,
        out_stealth_pub_x,
        out_amount,
        out_randomness
    );

    assert(result.out_commitment == out_commitment);
}
