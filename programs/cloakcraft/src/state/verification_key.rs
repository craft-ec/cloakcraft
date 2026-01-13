//! Verification key storage
//!
//! Stores Groth16 verification keys for each circuit type.

use anchor_lang::prelude::*;

/// Maximum size for verification key data
/// alpha_g1 (64) + beta_g2 (128) + gamma_g2 (128) + delta_g2 (128) + ic (64 * 20 max inputs)
pub const MAX_VK_DATA_SIZE: usize = 1728;

/// Verification key for a circuit
#[account]
#[derive(Default, InitSpace)]
pub struct VerificationKey {
    /// Circuit identifier
    pub circuit_id: [u8; 32],

    /// Groth16 verification key components (serialized)
    /// Format: alpha_g1 (64) + beta_g2 (128) + gamma_g2 (128) + delta_g2 (128) + ic_len (4) + ic (64 * ic_len)
    #[max_len(1728)]
    pub vk_data: Vec<u8>,

    /// Authority who can update
    pub authority: Pubkey,

    /// Is active
    pub is_active: bool,

    /// PDA bump
    pub bump: u8,
}

impl VerificationKey {
    /// Base account space
    pub const BASE_LEN: usize = 8  // discriminator
        + 32  // circuit_id
        + 4   // vk_data vec len
        + 32  // authority
        + 1   // is_active
        + 1;  // bump

    /// Calculate space for given VK size
    pub fn space(vk_data_len: usize) -> usize {
        Self::BASE_LEN + vk_data_len
    }

    /// Typical VK size for circuits with ~10 public inputs
    /// alpha_g1 (64) + beta_g2 (128) + gamma_g2 (128) + delta_g2 (128) + ic (64 * 12)
    pub const TYPICAL_VK_SIZE: usize = 64 + 128 + 128 + 128 + (64 * 12);
}
