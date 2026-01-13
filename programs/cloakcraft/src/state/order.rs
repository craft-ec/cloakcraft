//! Market order state
//!
//! Orders are escrow-based limit orders for the internal private market.

use anchor_lang::prelude::*;
use crate::constants::ENCRYPTED_NOTE_SIZE;

/// Order status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace)]
pub enum OrderStatus {
    #[default]
    Open,
    Filled,
    Cancelled,
}

/// Market order (escrow)
#[account]
#[derive(Default, InitSpace)]
pub struct Order {
    /// Unique order ID (derived from nullifier + terms)
    pub order_id: [u8; 32],

    /// Escrow commitment (locked maker funds)
    pub escrow_commitment: [u8; 32],

    /// Hash of order terms (offer_token, offer_amount, ask_token, ask_amount, maker_receive)
    pub terms_hash: [u8; 32],

    /// Encrypted escrow note (for maker to decrypt)
    #[max_len(256)]
    pub encrypted_escrow: Vec<u8>,

    /// Expiry timestamp
    pub expiry: i64,

    /// Order status
    pub status: OrderStatus,

    /// Creation timestamp
    pub created_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl Order {
    /// Base account space (without encrypted_escrow Vec)
    pub const BASE_LEN: usize = 8  // discriminator
        + 32  // order_id
        + 32  // escrow_commitment
        + 32  // terms_hash
        + 4   // encrypted_escrow vec length
        + 8   // expiry
        + 1   // status
        + 8   // created_at
        + 1;  // bump

    /// Calculate space with encrypted note
    pub fn space(encrypted_note_len: usize) -> usize {
        Self::BASE_LEN + encrypted_note_len
    }

    /// Check if order is open
    pub fn is_open(&self) -> bool {
        self.status == OrderStatus::Open
    }

    /// Check if order is expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time >= self.expiry
    }
}
