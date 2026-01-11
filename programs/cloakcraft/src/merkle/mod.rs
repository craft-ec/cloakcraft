//! Merkle tree operations using frontier-based O(1) insertion
//!
//! Note: Currently uses SHA-256 for on-chain hashing. The ZK circuits use Poseidon,
//! and commitments are computed off-chain. The merkle tree hash function should be
//! updated to Poseidon once dependency compatibility is resolved.

use anchor_lang::prelude::*;
use solana_sha256_hasher::Hasher;

use crate::constants::MERKLE_TREE_DEPTH;

/// Empty leaf hash (SHA-256 of empty data)
pub const EMPTY_LEAF: [u8; 32] = [
    0xe3, 0xb0, 0xc4, 0x42, 0x98, 0xfc, 0x1c, 0x14,
    0x9a, 0xfb, 0xf4, 0xc8, 0x99, 0x6f, 0xb9, 0x24,
    0x27, 0xae, 0x41, 0xe4, 0x64, 0x9b, 0x93, 0x4c,
    0xa4, 0x95, 0x99, 0x1b, 0x78, 0x52, 0xb8, 0x55,
];

/// Compute hash of two inputs for merkle tree
#[inline(always)]
pub fn hash_pair(left: &[u8; 32], right: &[u8; 32]) -> [u8; 32] {
    let mut hasher = Hasher::default();
    hasher.hash(left);
    hasher.hash(right);
    hasher.result().to_bytes()
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
/// Uses iterative computation to avoid large stack allocations
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

/// Verify a merkle proof
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
}
