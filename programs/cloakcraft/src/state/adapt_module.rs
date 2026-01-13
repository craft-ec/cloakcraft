//! Adapter module registry
//!
//! Whitelisted external programs that CloakCraft can CPI to for swaps.

use anchor_lang::prelude::*;

/// Registered adapter module
#[account]
#[derive(Default, InitSpace)]
pub struct AdaptModule {
    /// Adapter program address
    pub program_id: Pubkey,

    /// Interface version (for compatibility)
    pub interface_version: u8,

    /// Is enabled
    pub enabled: bool,

    /// Authority who can manage
    pub authority: Pubkey,

    /// Registration timestamp
    pub registered_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl AdaptModule {
    /// Account space
    pub const LEN: usize = 8  // discriminator
        + 32  // program_id
        + 1   // interface_version
        + 1   // enabled
        + 32  // authority
        + 8   // registered_at
        + 1;  // bump

    /// Check if adapter can be used
    pub fn is_usable(&self) -> bool {
        self.enabled
    }
}
