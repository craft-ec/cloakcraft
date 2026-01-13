//! Threshold committee for decryption
//!
//! Manages committee members for threshold decryption of voting results.

use anchor_lang::prelude::*;

/// Maximum number of committee members
pub const MAX_COMMITTEE_MEMBERS: usize = 10;

/// Threshold committee
#[account]
#[derive(Default, InitSpace)]
pub struct ThresholdCommittee {
    /// Committee identifier
    pub committee_id: [u8; 32],

    /// Combined threshold public key
    pub threshold_pubkey: [u8; 32],

    /// Committee members
    #[max_len(10)]
    pub members: Vec<Pubkey>,

    /// Threshold (t of n)
    pub threshold: u8,

    /// Authority who can manage
    pub authority: Pubkey,

    /// Is active
    pub is_active: bool,

    /// PDA bump
    pub bump: u8,
}

impl ThresholdCommittee {
    /// Base account space
    pub const BASE_LEN: usize = 8  // discriminator
        + 32  // committee_id
        + 32  // threshold_pubkey
        + 4   // members vec len
        + 1   // threshold
        + 32  // authority
        + 1   // is_active
        + 1;  // bump

    /// Calculate space for given number of members
    pub fn space(num_members: usize) -> usize {
        Self::BASE_LEN + (num_members * 32)
    }

    /// Check if pubkey is a committee member
    pub fn is_member(&self, pubkey: &Pubkey) -> bool {
        self.members.contains(pubkey)
    }
}
