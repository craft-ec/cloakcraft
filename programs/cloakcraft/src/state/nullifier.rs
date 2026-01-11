//! Nullifier storage using Light Protocol compressed accounts
//!
//! Each spent nullifier is stored as a compressed account.
//! This prevents double-spending by verifying non-inclusion
//! before creating the nullifier compressed account.
//!
//! The compressed account address is derived from the nullifier hash,
//! ensuring uniqueness and preventing double-spend attempts.

use anchor_lang::prelude::*;
use light_sdk::LightDiscriminator;

/// Nullifier compressed account data
///
/// Minimal data since the existence of the account (at the derived address)
/// is what prevents double-spending. The nullifier hash itself is encoded
/// in the address derivation seeds.
#[derive(Clone, Debug, Default, LightDiscriminator, AnchorSerialize, AnchorDeserialize)]
pub struct NullifierAccount {
    /// Pool this nullifier belongs to (32 bytes)
    pub pool: [u8; 32],

    /// Timestamp when nullifier was spent (8 bytes)
    pub spent_at: i64,
}

impl NullifierAccount {
    /// Seeds prefix for nullifier address derivation
    pub const SEED_PREFIX: &'static [u8] = b"nullifier";
}
