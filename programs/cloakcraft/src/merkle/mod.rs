//! Merkle tree operations using frontier-based O(1) insertion
//!
//! Uses Poseidon2 hash function via Light Protocol for ZK-compatible merkle trees.

use anchor_lang::prelude::*;
use light_hasher::{Hasher, Poseidon};

use crate::constants::MERKLE_TREE_DEPTH;

/// Empty leaf hash (Poseidon hash of 32 zero bytes)
/// Pre-computed for efficiency - this is Poseidon([0u8; 32])
/// Computed from Light Protocol's light-hasher Poseidon implementation
pub const EMPTY_LEAF: [u8; 32] = [
    0x2a, 0x09, 0xa9, 0xfd, 0x93, 0xc5, 0x90, 0xc2,
    0x6b, 0x91, 0xef, 0xfb, 0xb2, 0x49, 0x9f, 0x07,
    0xe8, 0xf7, 0xaa, 0x12, 0xe2, 0xb4, 0x94, 0x0a,
    0x3a, 0xed, 0x24, 0x11, 0xcb, 0x65, 0xe1, 0x1c,
];

/// Compute Poseidon hash of two 32-byte inputs
#[inline(always)]
pub fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    Poseidon::hashv(&[left.as_ref(), right.as_ref()]).unwrap_or([0u8; 32])
}

/// Compute empty subtree hash at given level (for off-chain use)
pub fn compute_empty_hash_at_level(level: usize) -> [u8; 32] {
    let mut hash = EMPTY_LEAF;
    for _ in 0..level {
        hash = hash_pair(&hash, &hash);
    }
    hash
}

/// Insert a leaf into the merkle tree using frontier-based approach
/// Returns the new root hash
///
/// Uses Poseidon hash for ZK circuit compatibility
#[inline(never)]
pub fn insert_leaf(
    frontier: &mut [[u8; 32]; MERKLE_TREE_DEPTH],
    leaf_count: u32,
    leaf: [u8; 32],
) -> Result<[u8; 32]> {
    let mut current_hash = leaf;
    let mut index = leaf_count;

    // Compute empty hash iteratively as we go (avoids storing 17x32 bytes)
    let mut empty_at_level = EMPTY_LEAF;

    for level in 0..MERKLE_TREE_DEPTH {
        if index % 2 == 0 {
            // Left child: store in frontier, hash with empty right sibling
            frontier[level] = current_hash;
            current_hash = hash_pair(&current_hash, &empty_at_level);
        } else {
            // Right child: hash with frontier (left sibling)
            current_hash = hash_pair(&frontier[level], &current_hash);
        }
        // Update empty hash for next level
        empty_at_level = hash_pair(&empty_at_level, &empty_at_level);
        index /= 2;
    }

    Ok(current_hash)
}

/// Verify a merkle proof using Poseidon hash
pub fn verify_merkle_proof(
    root: &[u8; 32],
    leaf: &[u8; 32],
    leaf_index: u32,
    path: &[[u8; 32]; MERKLE_TREE_DEPTH],
) -> Result<bool> {
    let mut current_hash = *leaf;
    let mut index = leaf_index;

    for level in 0..MERKLE_TREE_DEPTH {
        let sibling = &path[level];
        current_hash = if index % 2 == 0 {
            hash_pair(&current_hash, sibling)
        } else {
            hash_pair(sibling, &current_hash)
        };
        index /= 2;
    }

    Ok(current_hash == *root)
}

/// Check if a root is in the historical roots array
pub fn is_known_root(
    historical_roots: &[[u8; 32]],
    root_to_check: &[u8; 32],
) -> bool {
    historical_roots.iter().any(|root| root == root_to_check)
}

/// Update historical roots after inserting a new leaf
pub fn update_historical_roots(
    historical_roots: &mut [[u8; 32]],
    current_root_index: &mut u8,
    new_root: [u8; 32],
) {
    let len = historical_roots.len();
    let next_index = (*current_root_index as usize + 1) % len;
    historical_roots[next_index] = new_root;
    *current_root_index = next_index as u8;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_insert_leaf() {
        let mut frontier = [[0u8; 32]; MERKLE_TREE_DEPTH];
        let leaf = [1u8; 32];

        let root = insert_leaf(&mut frontier, 0, leaf).unwrap();
        assert_ne!(root, [0u8; 32]);
    }

    #[test]
    fn test_insert_multiple_leaves() {
        let mut frontier = [[0u8; 32]; MERKLE_TREE_DEPTH];

        let root1 = insert_leaf(&mut frontier, 0, [1u8; 32]).unwrap();
        let root2 = insert_leaf(&mut frontier, 1, [2u8; 32]).unwrap();

        assert_ne!(root1, root2);
    }

    #[test]
    fn test_hash_pair_consistency() {
        let left = [1u8; 32];
        let right = [2u8; 32];

        let hash1 = hash_pair(&left, &right);
        let hash2 = hash_pair(&left, &right);

        assert_eq!(hash1, hash2);
    }

    #[test]
    fn test_empty_leaf_constant() {
        // Verify EMPTY_LEAF matches Poseidon hash of 32 zero bytes
        let zero_bytes = [0u8; 32];
        let computed = Poseidon::hash(&zero_bytes).unwrap();
        assert_eq!(computed, EMPTY_LEAF, "EMPTY_LEAF constant doesn't match Poseidon([0u8; 32])");
    }

    #[test]
    fn test_poseidon_deterministic() {
        // Ensure Poseidon produces consistent results
        let input = [42u8; 32];
        let hash1 = Poseidon::hash(&input).unwrap();
        let hash2 = Poseidon::hash(&input).unwrap();
        assert_eq!(hash1, hash2);
    }
}
