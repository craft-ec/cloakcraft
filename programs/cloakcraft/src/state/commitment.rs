//! Commitment storage using Light Protocol compressed accounts
//!
//! Each note commitment is stored as a compressed account.
//! This replaces the on-chain frontier-based merkle tree with
//! Light Protocol's state merkle tree infrastructure.
//!
//! Benefits:
//! - No rent for commitment storage
//! - Helius Photon provides merkle proofs
//! - Scales to millions of commitments

use anchor_lang::prelude::*;
use light_sdk::LightDiscriminator;

/// Commitment compressed account data
///
/// Stores a note commitment in the Light Protocol state tree.
/// The commitment hash is encoded in the address derivation for uniqueness.
#[derive(Clone, Debug, Default, LightDiscriminator, AnchorSerialize, AnchorDeserialize)]
pub struct CommitmentAccount {
    /// Pool this commitment belongs to (32 bytes)
    pub pool: [u8; 32],

    /// The commitment hash (32 bytes)
    /// This is also encoded in the address, but stored for easy retrieval
    pub commitment: [u8; 32],

    /// Leaf index in the merkle tree (8 bytes)
    /// Assigned sequentially per pool
    pub leaf_index: u64,

    /// Encrypted note data (variable, stored separately or as reference)
    /// For compressed accounts, we store a hash/reference to off-chain data
    pub encrypted_note_hash: [u8; 32],

    /// Timestamp when commitment was created (8 bytes)
    pub created_at: i64,
}

impl CommitmentAccount {
    /// Seeds prefix for commitment address derivation
    pub const SEED_PREFIX: &'static [u8] = b"commitment";

    /// Maximum encrypted note size to store inline
    /// Larger notes should use off-chain storage with hash reference
    pub const MAX_INLINE_NOTE_SIZE: usize = 256;
}

/// Pool commitment counter - tracks next leaf index
///
/// This is a regular PDA (not compressed) that tracks the
/// next available leaf index for each pool. Needed for
/// sequential leaf index assignment.
#[account]
#[derive(Default, InitSpace)]
pub struct PoolCommitmentCounter {
    /// Pool this counter belongs to
    pub pool: Pubkey,

    /// Next available leaf index
    pub next_leaf_index: u64,

    /// Total commitments created
    pub total_commitments: u64,

    /// PDA bump seed
    pub bump: u8,
}

impl PoolCommitmentCounter {
    /// Seeds for PDA derivation
    pub const SEEDS_PREFIX: &'static [u8] = b"commitment_counter";
}
