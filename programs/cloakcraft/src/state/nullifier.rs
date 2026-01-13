//! Nullifier storage using Light Protocol compressed accounts
//!
//! Two types of nullifiers are stored:
//! 1. Spend Nullifiers - prevent double-spending of notes in transact
//! 2. Action Nullifiers - prevent double-voting in governance
//!
//! Each type has its own namespace to avoid collisions:
//! - Spend: ["spend_nullifier", pool, nullifier]
//! - Action: ["action_nullifier", aggregation, nullifier]

use anchor_lang::prelude::*;
use light_sdk::LightDiscriminator;

/// Spend Nullifier compressed account data
///
/// Created when a note is spent in a transact operation.
/// The existence of this account (at the derived address) prevents double-spending.
/// Scoped to a specific pool.
#[derive(Clone, Debug, Default, LightDiscriminator, AnchorSerialize, AnchorDeserialize)]
pub struct SpendNullifierAccount {
    /// Pool this nullifier belongs to (32 bytes)
    pub pool: [u8; 32],

    /// Timestamp when nullifier was spent (8 bytes)
    pub spent_at: i64,
}

impl SpendNullifierAccount {
    /// Seeds prefix for spend nullifier address derivation
    pub const SEED_PREFIX: &'static [u8] = b"spend_nullifier";
}

/// Action Nullifier compressed account data
///
/// Created when a vote is cast in a governance aggregation.
/// The existence of this account (at the derived address) prevents double-voting.
/// Scoped to a specific aggregation (proposal).
#[derive(Clone, Debug, Default, LightDiscriminator, AnchorSerialize, AnchorDeserialize)]
pub struct ActionNullifierAccount {
    /// Aggregation this nullifier belongs to (32 bytes)
    pub aggregation: [u8; 32],

    /// Timestamp when vote was cast (8 bytes)
    pub voted_at: i64,
}

impl ActionNullifierAccount {
    /// Seeds prefix for action nullifier address derivation
    pub const SEED_PREFIX: &'static [u8] = b"action_nullifier";
}

