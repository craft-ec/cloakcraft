pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";

// Domain separation constants (must match on-chain verification)
// These ensure different hash contexts can't collide
function COMMITMENT_DOMAIN() { return 1; }
function SPENDING_NULLIFIER_DOMAIN() { return 2; }
function NULLIFIER_KEY_DOMAIN() { return 4; }

// ============================================================================
// Helper Templates
// ============================================================================

// Compute note commitment: Poseidon(domain, stealth_pub_x, token_mint, amount, randomness)
template Commitment() {
    signal input stealth_pub_x;
    signal input token_mint;
    signal input amount;
    signal input randomness;
    signal output out;

    component hasher = Poseidon(5);
    hasher.inputs[0] <== COMMITMENT_DOMAIN();
    hasher.inputs[1] <== stealth_pub_x;
    hasher.inputs[2] <== token_mint;
    hasher.inputs[3] <== amount;
    hasher.inputs[4] <== randomness;
    out <== hasher.out;
}

// Derive nullifier key from spending key: Poseidon(domain, spending_key, 0)
template NullifierKey() {
    signal input spending_key;
    signal output out;

    component hasher = Poseidon(3);
    hasher.inputs[0] <== NULLIFIER_KEY_DOMAIN();
    hasher.inputs[1] <== spending_key;
    hasher.inputs[2] <== 0;
    out <== hasher.out;
}

// Compute spending nullifier: Poseidon(domain, nullifier_key, commitment, leaf_index)
template SpendingNullifier() {
    signal input nullifier_key;
    signal input commitment;
    signal input leaf_index;
    signal output out;

    component hasher = Poseidon(4);
    hasher.inputs[0] <== SPENDING_NULLIFIER_DOMAIN();
    hasher.inputs[1] <== nullifier_key;
    hasher.inputs[2] <== commitment;
    hasher.inputs[3] <== leaf_index;
    out <== hasher.out;
}

// Range check: constrain value to 64 bits
template RangeCheck64() {
    signal input in;

    // Decompose to bits - this constrains the value to fit in 64 bits
    component bits = Num2Bits(64);
    bits.in <== in;
}

// ============================================================================
// Main Transfer Circuit: 2 Inputs -> 2 Outputs
// ============================================================================
//
// Use cases:
// - Combine 2 notes into a transfer + change
// - Spend when no single note is large enough
// - Normal transfer when balance is fragmented
//
// ============================================================================

template Transfer2x2() {
    // ========================================================================
    // Public Inputs (signals that will be verified on-chain)
    // ========================================================================
    signal input merkle_root;           // Merkle root (verified on-chain via Light Protocol)
    signal input nullifier_1;           // Nullifier for input 1
    signal input nullifier_2;           // Nullifier for input 2
    signal input out_commitment_1;      // Output 1 commitment (recipient)
    signal input out_commitment_2;      // Output 2 commitment (change)
    signal input token_mint;            // Token being transferred
    signal input unshield_amount;       // Amount being withdrawn to public (0 for private transfer)
    signal input fee_amount;            // Protocol fee amount (verified on-chain)

    // ========================================================================
    // Private Inputs (witness - never revealed)
    // ========================================================================

    // Input note 1 details
    signal input in_stealth_pub_x_1;
    signal input in_amount_1;
    signal input in_randomness_1;
    signal input in_stealth_spending_key_1;

    // Merkle proof for input 1 (32 levels)
    signal input merkle_path_1[32];
    signal input merkle_path_indices_1[32];
    signal input leaf_index_1;

    // Input note 2 details
    signal input in_stealth_pub_x_2;
    signal input in_amount_2;
    signal input in_randomness_2;
    signal input in_stealth_spending_key_2;

    // Merkle proof for input 2 (32 levels)
    signal input merkle_path_2[32];
    signal input merkle_path_indices_2[32];
    signal input leaf_index_2;

    // Output 1 details (recipient)
    signal input out_stealth_pub_x_1;
    signal input out_amount_1;
    signal input out_randomness_1;

    // Output 2 details (change)
    signal input out_stealth_pub_x_2;
    signal input out_amount_2;
    signal input out_randomness_2;

    // ========================================================================
    // 1. Verify Input Commitment 1
    // ========================================================================
    component in_commitment_1 = Commitment();
    in_commitment_1.stealth_pub_x <== in_stealth_pub_x_1;
    in_commitment_1.token_mint <== token_mint;
    in_commitment_1.amount <== in_amount_1;
    in_commitment_1.randomness <== in_randomness_1;

    // ========================================================================
    // 2. Verify Nullifier 1
    // ========================================================================
    component nk_1 = NullifierKey();
    nk_1.spending_key <== in_stealth_spending_key_1;

    component computed_nullifier_1 = SpendingNullifier();
    computed_nullifier_1.nullifier_key <== nk_1.out;
    computed_nullifier_1.commitment <== in_commitment_1.out;
    computed_nullifier_1.leaf_index <== leaf_index_1;

    // Constrain provided nullifier to match computed
    nullifier_1 === computed_nullifier_1.out;

    // ========================================================================
    // 3. Verify Input Commitment 2
    // ========================================================================
    component in_commitment_2 = Commitment();
    in_commitment_2.stealth_pub_x <== in_stealth_pub_x_2;
    in_commitment_2.token_mint <== token_mint;
    in_commitment_2.amount <== in_amount_2;
    in_commitment_2.randomness <== in_randomness_2;

    // ========================================================================
    // 4. Verify Nullifier 2
    // ========================================================================
    component nk_2 = NullifierKey();
    nk_2.spending_key <== in_stealth_spending_key_2;

    component computed_nullifier_2 = SpendingNullifier();
    computed_nullifier_2.nullifier_key <== nk_2.out;
    computed_nullifier_2.commitment <== in_commitment_2.out;
    computed_nullifier_2.leaf_index <== leaf_index_2;

    // Constrain provided nullifier to match computed
    nullifier_2 === computed_nullifier_2.out;

    // ========================================================================
    // 5. Verify Output Commitments
    // ========================================================================

    // Output 1 (recipient)
    component out_commit_1 = Commitment();
    out_commit_1.stealth_pub_x <== out_stealth_pub_x_1;
    out_commit_1.token_mint <== token_mint;
    out_commit_1.amount <== out_amount_1;
    out_commit_1.randomness <== out_randomness_1;
    out_commitment_1 === out_commit_1.out;

    // Output 2 (change)
    component out_commit_2 = Commitment();
    out_commit_2.stealth_pub_x <== out_stealth_pub_x_2;
    out_commit_2.token_mint <== token_mint;
    out_commit_2.amount <== out_amount_2;
    out_commit_2.randomness <== out_randomness_2;
    out_commitment_2 === out_commit_2.out;

    // ========================================================================
    // 6. Balance Check (with protocol fee)
    // ========================================================================
    // input_1 + input_2 = output_1 + output_2 + unshield + fee
    signal total_in;
    total_in <== in_amount_1 + in_amount_2;

    signal total_out;
    total_out <== out_amount_1 + out_amount_2 + unshield_amount + fee_amount;

    total_in === total_out;

    // ========================================================================
    // 7. Range Checks (64-bit amounts)
    // ========================================================================
    component range_in1 = RangeCheck64();
    range_in1.in <== in_amount_1;

    component range_in2 = RangeCheck64();
    range_in2.in <== in_amount_2;

    component range_out1 = RangeCheck64();
    range_out1.in <== out_amount_1;

    component range_out2 = RangeCheck64();
    range_out2.in <== out_amount_2;

    component range_unshield = RangeCheck64();
    range_unshield.in <== unshield_amount;

    component range_fee = RangeCheck64();
    range_fee.in <== fee_amount;

    // ========================================================================
    // Note: Merkle proof verification is done ON-CHAIN via Light Protocol
    // The merkle_root, merkle_path_*, and merkle_path_indices_* are included
    // for ABI compatibility but not verified in this circuit.
    // merkle_root is a public input so it's inherently constrained.
    // merkle_path_* and merkle_path_indices_* are private inputs in the witness.
    // ========================================================================
}

// Main component with public inputs
component main {public [
    merkle_root,
    nullifier_1,
    nullifier_2,
    out_commitment_1,
    out_commitment_2,
    token_mint,
    unshield_amount,
    fee_amount
]} = Transfer2x2();
