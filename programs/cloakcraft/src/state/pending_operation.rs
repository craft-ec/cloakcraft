//! Pending operation state for multi-phase commit pattern
//!
//! When a transaction is too large to fit in a single Solana transaction,
//! we split it into multiple phases:
//!
//! Phase 1 (verify_operation): Verify ZK proof + Store pending operation
//! Phase 2 (create_nullifier): Create nullifiers one at a time
//! Phase 3 (create_commitment): Create commitments one at a time
//! Phase 4 (close_operation): Close pending operation, reclaim rent
//!
//! This ensures:
//! - Each Light Protocol operation fits in one transaction (~400 bytes each)
//! - Double-spend protection via nullifiers
//! - Atomic proof verification before any state changes
//! - Flexible number of nullifiers and commitments per operation

use anchor_lang::prelude::*;
use super::commitment::MAX_ENCRYPTED_NOTE_SIZE;

/// Maximum number of pending commitments per operation
pub const MAX_PENDING_COMMITMENTS: usize = 5;

/// Maximum number of pending nullifiers per operation
pub const MAX_PENDING_NULLIFIERS: usize = 3;

/// Pending operation for multi-phase commit
#[account]
pub struct PendingOperation {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Operation ID (unique per operation, derived from inputs)
    pub operation_id: [u8; 32],

    /// Relayer who initiated the operation
    pub relayer: Pubkey,

    /// Operation type (for validation in subsequent phases)
    /// 0 = Transact, 1 = Swap, 2 = AddLiquidity, 3 = RemoveLiquidity
    pub operation_type: u8,

    /// Number of pending nullifiers
    pub num_nullifiers: u8,

    /// Pool keys for each nullifier (serialized as [u8; 32])
    pub nullifier_pools: [[u8; 32]; MAX_PENDING_NULLIFIERS],

    /// Nullifier hashes
    pub nullifiers: [[u8; 32]; MAX_PENDING_NULLIFIERS],

    /// Which nullifiers have been created (bitmask)
    pub nullifier_completed_mask: u8,

    /// Number of pending commitments
    pub num_commitments: u8,

    /// Pools for each commitment
    pub pools: [[u8; 32]; MAX_PENDING_COMMITMENTS],

    /// Commitment hashes
    pub commitments: [[u8; 32]; MAX_PENDING_COMMITMENTS],

    /// Leaf indices for each commitment
    pub leaf_indices: [u64; MAX_PENDING_COMMITMENTS],

    /// Stealth ephemeral pubkeys (64 bytes each)
    pub stealth_ephemeral_pubkeys: [[u8; 64]; MAX_PENDING_COMMITMENTS],

    /// Encrypted notes (variable length, stored with length prefix)
    pub encrypted_notes: [[u8; MAX_ENCRYPTED_NOTE_SIZE]; MAX_PENDING_COMMITMENTS],

    /// Actual lengths of encrypted notes
    pub encrypted_note_lens: [u16; MAX_PENDING_COMMITMENTS],

    /// Which commitments have been created (bitmask)
    pub completed_mask: u8,

    /// Expiry timestamp (operation expires after this)
    pub expires_at: i64,

    /// Creation timestamp
    pub created_at: i64,
}

impl PendingOperation {
    /// Seeds prefix for PDA derivation
    pub const SEEDS_PREFIX: &'static [u8] = b"pending_op";

    /// Space required for account (with padding)
    pub const SPACE: usize = 8 + // discriminator
        1 + // bump
        32 + // operation_id
        32 + // relayer
        1 + // operation_type
        1 + // num_nullifiers
        (32 * MAX_PENDING_NULLIFIERS) + // nullifier_pools
        (32 * MAX_PENDING_NULLIFIERS) + // nullifiers
        1 + // nullifier_completed_mask
        1 + // num_commitments
        (32 * MAX_PENDING_COMMITMENTS) + // pools
        (32 * MAX_PENDING_COMMITMENTS) + // commitments
        (8 * MAX_PENDING_COMMITMENTS) + // leaf_indices
        (64 * MAX_PENDING_COMMITMENTS) + // stealth_ephemeral_pubkeys
        (MAX_ENCRYPTED_NOTE_SIZE * MAX_PENDING_COMMITMENTS) + // encrypted_notes
        (2 * MAX_PENDING_COMMITMENTS) + // encrypted_note_lens
        1 + // completed_mask
        8 + // expires_at
        8; // created_at

    /// Check if all nullifiers have been created
    pub fn all_nullifiers_created(&self) -> bool {
        if self.num_nullifiers == 0 {
            return true;
        }
        let mask = (1u8 << self.num_nullifiers) - 1;
        self.nullifier_completed_mask == mask
    }

    /// Check if all commitments have been created
    pub fn all_commitments_created(&self) -> bool {
        if self.num_commitments == 0 {
            return true;
        }
        let mask = (1u8 << self.num_commitments) - 1;
        self.completed_mask == mask
    }

    /// Check if operation is complete (all nullifiers AND commitments created)
    pub fn is_complete(&self) -> bool {
        self.all_nullifiers_created() && self.all_commitments_created()
    }

    /// Check if operation has expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time > self.expires_at
    }

    /// Mark a nullifier as created
    pub fn mark_nullifier_created(&mut self, index: u8) {
        self.nullifier_completed_mask |= 1u8 << index;
    }

    /// Mark a commitment as completed
    pub fn mark_completed(&mut self, index: u8) {
        self.completed_mask |= 1u8 << index;
    }

    /// Get next uncreated nullifier index
    pub fn next_uncreated_nullifier(&self) -> Option<u8> {
        for i in 0..self.num_nullifiers {
            if (self.nullifier_completed_mask & (1u8 << i)) == 0 {
                return Some(i);
            }
        }
        None
    }

    /// Get next uncompleted commitment index
    pub fn next_uncompleted(&self) -> Option<u8> {
        for i in 0..self.num_commitments {
            if (self.completed_mask & (1u8 << i)) == 0 {
                return Some(i);
            }
        }
        None
    }
}

/// Expiry duration for pending operations (5 minutes)
pub const PENDING_OPERATION_EXPIRY_SECONDS: i64 = 300;
