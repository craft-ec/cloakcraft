// Merkle Tree Verification
// Verifies inclusion proofs for commitments in the shielded pool

use crate::poseidon::hash2;
use crate::constants::MERKLE_DOMAIN;

// Verify a merkle inclusion proof
// path: sibling hashes from leaf to root
// path_indices: 0 = leaf is left child, 1 = leaf is right child
pub fn verify_merkle_proof(
    leaf: Field,
    path: [Field; 16],
    path_indices: [Field; 16],
    root: Field
) -> bool {
    let mut current = leaf;

    for i in 0..16 {
        let sibling = path[i];
        let is_right = path_indices[i];

        // Ensure path_indices are binary
        assert((is_right == 0) | (is_right == 1));

        // Hash with domain separation
        // If is_right == 0: current is left, sibling is right
        // If is_right == 1: sibling is left, current is right
        if is_right == 0 {
            current = hash2(MERKLE_DOMAIN + current, sibling);
        } else {
            current = hash2(MERKLE_DOMAIN + sibling, current);
        }
    }

    current == root
}

// Compute merkle root from leaf and path
pub fn compute_merkle_root(
    leaf: Field,
    path: [Field; 16],
    path_indices: [Field; 16]
) -> Field {
    let mut current = leaf;

    for i in 0..16 {
        let sibling = path[i];
        let is_right = path_indices[i];

        if is_right == 0 {
            current = hash2(MERKLE_DOMAIN + current, sibling);
        } else {
            current = hash2(MERKLE_DOMAIN + sibling, current);
        }
    }

    current
}

// Compute empty leaf hash (for padding)
pub fn empty_leaf() -> Field {
    hash2(0x07, 0) // EMPTY_LEAF_DOMAIN with zero
}

// Verify leaf index is valid
pub fn verify_leaf_index(index: Field) -> bool {
    // Index must be less than 2^16
    let index_bits: [u1; 32] = index.to_le_bits();
    let mut valid = true;

    // Check upper 16 bits are zero
    for i in 16..32 {
        if index_bits[i] == 1 {
            valid = false;
        }
    }

    valid
}

#[test]
fn test_empty_leaf() {
    let leaf = empty_leaf();
    assert(leaf != 0);
}

#[test]
fn test_merkle_single_leaf() {
    // Simple test with single leaf path
    let leaf: Field = 12345;
    let path: [Field; 16] = [0; 16];
    let path_indices: [Field; 16] = [0; 16];

    let root = compute_merkle_root(leaf, path, path_indices);
    assert(verify_merkle_proof(leaf, path, path_indices, root));
}
