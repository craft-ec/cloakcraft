//! Shielded pool state
//!
//! Each token has its own pool. Merkle tree state is now managed by
//! Light Protocol compressed accounts instead of on-chain storage.

use anchor_lang::prelude::*;

/// Shielded pool for a single token
///
/// Note: Merkle tree state (commitments, roots) is now stored in Light Protocol
/// compressed accounts. The PoolCommitmentCounter tracks leaf indices.
#[account]
#[derive(Default, InitSpace)]
pub struct Pool {
    /// SPL token mint address
    pub token_mint: Pubkey,

    /// PDA holding shielded tokens
    pub token_vault: Pubkey,

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
        + 8   // total_shielded
        + 32  // authority
        + 1   // bump
        + 1;  // vault_bump
}
