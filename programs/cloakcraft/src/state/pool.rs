//! Shielded pool state
//!
//! Each token has its own pool with a merkle tree for commitments.

use anchor_lang::prelude::*;
use crate::constants::{MERKLE_TREE_DEPTH, HISTORICAL_ROOTS_COUNT};

/// Shielded pool for a single token
#[account]
#[derive(Default, InitSpace)]
pub struct Pool {
    /// SPL token mint address
    pub token_mint: Pubkey,

    /// PDA holding shielded tokens
    pub token_vault: Pubkey,

    /// Current merkle root
    pub merkle_root: [u8; 32],

    /// Historical roots for async proof verification
    /// Allows proofs generated against recent roots to still be valid
    pub historical_roots: [[u8; 32]; HISTORICAL_ROOTS_COUNT],

    /// Frontier nodes for O(1) merkle tree insertion
    /// Stores the rightmost node at each level
    pub frontier: [[u8; 32]; MERKLE_TREE_DEPTH],

    /// Next available leaf index
    pub next_leaf_index: u32,

    /// Total value locked (for analytics)
    pub total_shielded: u64,

    /// Pool authority (for upgrades)
    pub authority: Pubkey,

    /// PDA bump seed
    pub bump: u8,

    /// Vault bump seed
    pub vault_bump: u8,
}

impl Pool {
    /// Account space calculation
    pub const LEN: usize = 8  // discriminator
        + 32  // token_mint
        + 32  // token_vault
        + 32  // merkle_root
        + (32 * HISTORICAL_ROOTS_COUNT)  // historical_roots
        + (32 * MERKLE_TREE_DEPTH)  // frontier
        + 4   // next_leaf_index
        + 8   // total_shielded
        + 32  // authority
        + 1   // bump
        + 1;  // vault_bump

    /// Check if a merkle root is valid (current or historical)
    pub fn is_valid_root(&self, root: &[u8; 32]) -> bool {
        if &self.merkle_root == root {
            return true;
        }
        self.historical_roots.contains(root)
    }

    /// Update the merkle root (shifts historical roots)
    pub fn update_root(&mut self, new_root: [u8; 32]) {
        // Shift historical roots
        for i in (1..HISTORICAL_ROOTS_COUNT).rev() {
            self.historical_roots[i] = self.historical_roots[i - 1];
        }
        self.historical_roots[0] = self.merkle_root;
        self.merkle_root = new_root;
    }

    /// Check if tree has space for more leaves
    pub fn can_insert(&self) -> bool {
        self.next_leaf_index < (1u32 << MERKLE_TREE_DEPTH)
    }
}
