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

/// Maximum encrypted note size (fixed to avoid heap allocation issues)
/// Contains: ECIES ephemeral pubkey (64) + ciphertext (~up to 140) + tag (16) = ~220 bytes
/// Using 250 bytes to support position notes (126 bytes plaintext) and LP notes (108 bytes)
pub const MAX_ENCRYPTED_NOTE_SIZE: usize = 250;

/// Commitment compressed account data
///
/// Stores a note commitment in the Light Protocol state tree.
/// The commitment hash is encoded in the address derivation for uniqueness.
/// Encrypted note is stored inline for scanning without external indexer.
#[derive(Clone, Debug, LightDiscriminator, AnchorSerialize, AnchorDeserialize)]
pub struct CommitmentAccount {
    /// Pool this commitment belongs to (32 bytes)
    pub pool: [u8; 32],

    /// The commitment hash (32 bytes)
    /// This is also encoded in the address, but stored for easy retrieval
    pub commitment: [u8; 32],

    /// Leaf index in the merkle tree (8 bytes)
    /// Assigned sequentially per pool
    pub leaf_index: u64,

    /// Stealth address ephemeral pubkey (64 bytes: X + Y coordinates)
    /// Used by recipient to derive stealth private key for decryption:
    /// stealthPrivateKey = spendingKey + H(spendingKey * ephemeralPubkey)
    pub stealth_ephemeral_pubkey: [u8; 64],

    /// Encrypted note data stored inline (fixed size to avoid heap issues)
    /// Contains: ECIES ephemeral pubkey (64) + ciphertext (~100) + tag (16) = ~180 bytes
    /// Encrypted to stealthPubkey, decrypted with stealthPrivateKey
    /// Scannable via Light Protocol API without external indexer
    pub encrypted_note: [u8; MAX_ENCRYPTED_NOTE_SIZE],

    /// Actual length of encrypted note data
    pub encrypted_note_len: u16,

    /// Timestamp when commitment was created (8 bytes)
    pub created_at: i64,
}

impl Default for CommitmentAccount {
    fn default() -> Self {
        Self {
            pool: [0u8; 32],
            commitment: [0u8; 32],
            leaf_index: 0,
            stealth_ephemeral_pubkey: [0u8; 64],
            encrypted_note: [0u8; MAX_ENCRYPTED_NOTE_SIZE],
            encrypted_note_len: 0,
            created_at: 0,
        }
    }
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
