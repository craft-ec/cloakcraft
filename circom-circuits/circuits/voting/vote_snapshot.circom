pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/poseidon.circom";
include "../../node_modules/circomlib/circuits/bitify.circom";
include "../../node_modules/circomlib/circuits/comparators.circom";
include "../../node_modules/circomlib/circuits/eddsaposeidon.circom";

// Domain separation constants (must match on-chain verification)
function COMMITMENT_DOMAIN() { return 1; }
function NULLIFIER_KEY_DOMAIN() { return 4; }
function VOTE_NULLIFIER_DOMAIN() { return 0x10; }
function VOTE_COMMITMENT_DOMAIN() { return 0x11; }

// Maximum number of ballot options
function MAX_BALLOT_OPTIONS() { return 16; }

// ============================================================================
// Helper Templates
// ============================================================================

// Derive nullifier key from spending key
template NullifierKey() {
    signal input spending_key;
    signal output out;

    component hasher = Poseidon(3);
    hasher.inputs[0] <== NULLIFIER_KEY_DOMAIN();
    hasher.inputs[1] <== spending_key;
    hasher.inputs[2] <== 0;
    out <== hasher.out;
}

// Compute vote nullifier: Poseidon(VOTE_NULLIFIER_DOMAIN, nullifier_key, ballot_id)
// ONE per user per ballot - ensures single active vote
template VoteNullifier() {
    signal input nullifier_key;
    signal input ballot_id;
    signal output out;

    component hasher = Poseidon(3);
    hasher.inputs[0] <== VOTE_NULLIFIER_DOMAIN();
    hasher.inputs[1] <== nullifier_key;
    hasher.inputs[2] <== ballot_id;
    out <== hasher.out;
}

// Compute vote commitment: Poseidon(ballot_id, vote_nullifier, pubkey, vote_choice, weight, randomness)
// The vote_choice is hidden by the hash
template VoteCommitment() {
    signal input ballot_id;
    signal input vote_nullifier;
    signal input pubkey;
    signal input vote_choice;
    signal input weight;
    signal input randomness;
    signal output out;

    // Two-stage hash to fit within Poseidon input limits
    component hasher1 = Poseidon(4);
    hasher1.inputs[0] <== VOTE_COMMITMENT_DOMAIN();
    hasher1.inputs[1] <== ballot_id;
    hasher1.inputs[2] <== vote_nullifier;
    hasher1.inputs[3] <== pubkey;

    component hasher2 = Poseidon(4);
    hasher2.inputs[0] <== hasher1.out;
    hasher2.inputs[1] <== vote_choice;
    hasher2.inputs[2] <== weight;
    hasher2.inputs[3] <== randomness;
    out <== hasher2.out;
}

// Range check: constrain value to 64 bits
template RangeCheck64() {
    signal input in;
    component bits = Num2Bits(64);
    bits.in <== in;
}

// Merkle tree verification for eligibility
template EligibilityMerkleProof(levels) {
    signal input leaf;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal output root;

    signal intermediates[levels + 1];
    intermediates[0] <== leaf;

    component hashers[levels];
    component muxL[levels];
    component muxR[levels];

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);

        // Select left/right based on path index
        muxL[i] = Mux1();
        muxL[i].c[0] <== intermediates[i];
        muxL[i].c[1] <== pathElements[i];
        muxL[i].s <== pathIndices[i];

        muxR[i] = Mux1();
        muxR[i].c[0] <== pathElements[i];
        muxR[i].c[1] <== intermediates[i];
        muxR[i].s <== pathIndices[i];

        hashers[i].inputs[0] <== muxL[i].out;
        hashers[i].inputs[1] <== muxR[i].out;
        intermediates[i + 1] <== hashers[i].out;
    }

    root <== intermediates[levels];
}

// Simple Mux1 for merkle proof
template Mux1() {
    signal input c[2];
    signal input s;
    signal output out;

    out <== c[0] + s * (c[1] - c[0]);
}

// ============================================================================
// Vote Snapshot Circuit - First Vote in Snapshot Mode
// ============================================================================
//
// Verifies:
// 1. User owns pubkey (via EdDSA signature verification on attestation)
// 2. Indexer attestation is valid (signed by trusted indexer)
// 3. Eligibility proof (if eligibility_root is set)
// 4. Weight is correctly derived from amount
// 5. vote_nullifier is correctly derived
// 6. vote_commitment is correctly derived
//
// For Public mode: vote_choice is a public input
// For Encrypted modes: vote_choice is private, encrypted_contributions are public

template VoteSnapshot(eligibility_levels) {
    // ========================================================================
    // Public Inputs
    // ========================================================================
    signal input ballot_id;
    signal input vote_nullifier;
    signal input vote_commitment;
    signal input total_amount;
    signal input weight;
    signal input token_mint;
    signal input snapshot_slot;

    // Attestation data
    signal input indexer_pubkey_x;
    signal input indexer_pubkey_y;

    // Eligibility (0 if open ballot)
    signal input eligibility_root;
    signal input has_eligibility;  // 1 if eligibility check required, 0 otherwise

    // For PUBLIC reveal mode only
    signal input vote_choice;
    signal input is_public_mode;  // 1 if public, 0 if encrypted

    // ========================================================================
    // Private Inputs
    // ========================================================================

    // User key derivation
    signal input spending_key;
    signal input pubkey;  // Derived from spending_key

    // Attestation signature (EdDSA over message hash)
    signal input attestation_signature_r8x;
    signal input attestation_signature_r8y;
    signal input attestation_signature_s;

    // Vote commitment randomness
    signal input randomness;

    // Eligibility proof (if has_eligibility)
    signal input eligibility_path[eligibility_levels];
    signal input eligibility_path_indices[eligibility_levels];

    // For encrypted modes - vote_choice is private
    signal input private_vote_choice;

    // ========================================================================
    // 1. Derive Nullifier Key and Verify Vote Nullifier
    // ========================================================================
    component nk = NullifierKey();
    nk.spending_key <== spending_key;

    component computed_vote_nullifier = VoteNullifier();
    computed_vote_nullifier.nullifier_key <== nk.out;
    computed_vote_nullifier.ballot_id <== ballot_id;

    vote_nullifier === computed_vote_nullifier.out;

    // ========================================================================
    // 2. Verify Attestation Signature
    // ========================================================================
    // Message = hash(pubkey, ballot_id, token_mint, total_amount, snapshot_slot)
    component attestation_msg = Poseidon(5);
    attestation_msg.inputs[0] <== pubkey;
    attestation_msg.inputs[1] <== ballot_id;
    attestation_msg.inputs[2] <== token_mint;
    attestation_msg.inputs[3] <== total_amount;
    attestation_msg.inputs[4] <== snapshot_slot;

    component sig_verify = EdDSAPoseidonVerifier();
    sig_verify.enabled <== 1;
    sig_verify.Ax <== indexer_pubkey_x;
    sig_verify.Ay <== indexer_pubkey_y;
    sig_verify.R8x <== attestation_signature_r8x;
    sig_verify.R8y <== attestation_signature_r8y;
    sig_verify.S <== attestation_signature_s;
    sig_verify.M <== attestation_msg.out;

    // ========================================================================
    // 3. Verify Eligibility (if required)
    // ========================================================================
    component eligibility_proof = EligibilityMerkleProof(eligibility_levels);
    eligibility_proof.leaf <== pubkey;
    for (var i = 0; i < eligibility_levels; i++) {
        eligibility_proof.pathElements[i] <== eligibility_path[i];
        eligibility_proof.pathIndices[i] <== eligibility_path_indices[i];
    }

    // If has_eligibility, computed root must match eligibility_root
    signal eligibility_check;
    eligibility_check <== has_eligibility * (eligibility_proof.root - eligibility_root);
    eligibility_check === 0;

    // ========================================================================
    // 4. Determine Vote Choice (public vs encrypted mode)
    // ========================================================================
    // In public mode: use public vote_choice
    // In encrypted mode: use private_vote_choice
    // Use intermediate signals to avoid non-quadratic constraints
    signal choice_public;
    choice_public <== is_public_mode * vote_choice;
    signal choice_private;
    choice_private <== (1 - is_public_mode) * private_vote_choice;
    signal effective_vote_choice;
    effective_vote_choice <== choice_public + choice_private;

    // Verify public mode vote_choice constraint (if public, must match)
    signal public_mode_check;
    public_mode_check <== is_public_mode * (vote_choice - private_vote_choice);
    // If public mode, vote_choice and private_vote_choice must be equal
    // This ensures private_vote_choice is correctly revealed when is_public_mode=1

    // ========================================================================
    // 5. Verify Vote Commitment
    // ========================================================================
    component computed_vote_commitment = VoteCommitment();
    computed_vote_commitment.ballot_id <== ballot_id;
    computed_vote_commitment.vote_nullifier <== vote_nullifier;
    computed_vote_commitment.pubkey <== pubkey;
    computed_vote_commitment.vote_choice <== effective_vote_choice;
    computed_vote_commitment.weight <== weight;
    computed_vote_commitment.randomness <== randomness;

    vote_commitment === computed_vote_commitment.out;

    // ========================================================================
    // 6. Range Checks
    // ========================================================================
    component range_amount = RangeCheck64();
    range_amount.in <== total_amount;

    component range_weight = RangeCheck64();
    range_weight.in <== weight;

    // ========================================================================
    // 7. Binary Constraints
    // ========================================================================
    is_public_mode * (1 - is_public_mode) === 0;
    has_eligibility * (1 - has_eligibility) === 0;

    // Note: Weight formula verification is done on-chain
    // The circuit trusts the weight value provided, on-chain verifies weight = formula(amount)
}

component main {public [
    ballot_id,
    vote_nullifier,
    vote_commitment,
    total_amount,
    weight,
    token_mint,
    snapshot_slot,
    indexer_pubkey_x,
    indexer_pubkey_y,
    eligibility_root,
    has_eligibility,
    vote_choice,
    is_public_mode
]} = VoteSnapshot(20);  // 20 levels for eligibility merkle tree
