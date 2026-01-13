//! Voting aggregation state
//!
//! Stores encrypted vote tallies for private governance.

use anchor_lang::prelude::*;

/// Maximum number of voting options
pub const MAX_VOTING_OPTIONS: usize = 10;
/// Maximum committee size for decryption
pub const MAX_DECRYPTION_COMMITTEE: usize = 10;
/// Maximum DLEQ proof size
pub const MAX_DLEQ_PROOF_SIZE: usize = 128;

/// Aggregation status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace)]
pub enum AggregationStatus {
    #[default]
    Active,
    DecryptionInProgress,
    Finalized,
}

/// ElGamal ciphertext (C1, C2)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Default, InitSpace)]
pub struct ElGamalCiphertext {
    /// C1 = r * G (32 bytes x, 32 bytes y compressed to 32)
    pub c1: [u8; 32],
    /// C2 = m * G + r * P
    pub c2: [u8; 32],
}

/// Decryption share from a committee member
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, InitSpace)]
pub struct DecryptionShare {
    /// Committee member who submitted
    pub party: Pubkey,
    /// Decryption shares (one per option)
    #[max_len(10)]
    pub shares: Vec<[u8; 32]>,
    /// DLEQ proofs for correctness
    #[max_len(10, 128)]
    pub dleq_proofs: Vec<Vec<u8>>,
}

/// Voting aggregation
#[account]
#[derive(Default, InitSpace)]
pub struct Aggregation {
    /// Unique identifier
    pub id: [u8; 32],

    /// Threshold public key (combined from committee)
    pub threshold_pubkey: [u8; 32],

    /// Token mint for voting power
    pub token_mint: Pubkey,

    /// Number of voting options
    pub num_options: u8,

    /// Threshold required for decryption (t of n)
    pub threshold: u8,

    /// Voting deadline
    pub deadline: i64,

    /// Action domain for nullifiers (prevents cross-proposal voting)
    pub action_domain: [u8; 32],

    /// Encrypted vote tallies (one ElGamal ciphertext per option)
    /// These are homomorphically summed as votes come in
    #[max_len(10)]
    pub encrypted_tallies: Vec<ElGamalCiphertext>,

    /// Decryption shares submitted by committee members
    #[max_len(10)]
    pub decryption_shares: Vec<DecryptionShare>,

    /// Final decrypted totals (None until finalized)
    #[max_len(10)]
    pub totals: Vec<u64>,

    /// Status
    pub status: AggregationStatus,

    /// Creation timestamp
    pub created_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl Aggregation {
    /// Base account space (without dynamic vecs)
    pub const BASE_LEN: usize = 8  // discriminator
        + 32  // id
        + 32  // threshold_pubkey
        + 32  // token_mint
        + 1   // num_options
        + 1   // threshold
        + 8   // deadline
        + 32  // action_domain
        + 4   // encrypted_tallies vec len
        + 4   // decryption_shares vec len
        + 4   // totals vec len
        + 1   // status
        + 8   // created_at
        + 1;  // bump

    /// Calculate space for given number of options
    pub fn space(num_options: u8, max_committee_size: u8) -> usize {
        Self::BASE_LEN
            + (num_options as usize * 64)  // encrypted_tallies
            + (max_committee_size as usize * (32 + 4 + num_options as usize * 32 + 4 + num_options as usize * 128))  // decryption_shares estimate
            + (num_options as usize * 8)  // totals
    }

    /// Check if aggregation is active
    pub fn is_active(&self, current_time: i64) -> bool {
        self.status == AggregationStatus::Active && current_time < self.deadline
    }

    /// Check if decryption threshold is met
    pub fn threshold_met(&self) -> bool {
        self.decryption_shares.len() >= self.threshold as usize
    }
}
