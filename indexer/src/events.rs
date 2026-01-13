//! Event parsing and processing

use borsh::BorshDeserialize;

/// CloakCraft event discriminators
pub mod discriminators {
    pub const NOTE_CREATED: [u8; 8] = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08];
    pub const NOTE_SPENT: [u8; 8] = [0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17, 0x18];
    pub const ORDER_CREATED: [u8; 8] = [0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x28];
    pub const ORDER_FILLED: [u8; 8] = [0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38];
    pub const ORDER_CANCELLED: [u8; 8] = [0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48];
    pub const SWAP_EXECUTED: [u8; 8] = [0x51, 0x52, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58];
    pub const VOTE_SUBMITTED: [u8; 8] = [0x61, 0x62, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68];
}

/// Parsed CloakCraft event
#[derive(Debug, Clone)]
pub enum CloakCraftEvent {
    NoteCreated(NoteCreatedEvent),
    NoteSpent(NoteSpentEvent),
    OrderCreated(OrderCreatedEvent),
    OrderFilled(OrderFilledEvent),
    OrderCancelled(OrderCancelledEvent),
    SwapExecuted(SwapExecutedEvent),
    VoteSubmitted(VoteSubmittedEvent),
}

#[derive(Debug, Clone, BorshDeserialize)]
pub struct NoteCreatedEvent {
    pub pool: [u8; 32],
    pub commitment: [u8; 32],
    pub leaf_index: u32,
    pub encrypted_note: Vec<u8>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, BorshDeserialize)]
pub struct NoteSpentEvent {
    pub pool: [u8; 32],
    pub nullifier: [u8; 32],
    pub timestamp: i64,
}

#[derive(Debug, Clone, BorshDeserialize)]
pub struct OrderCreatedEvent {
    pub order_id: [u8; 32],
    pub escrow_commitment: [u8; 32],
    pub terms_hash: [u8; 32],
    pub expiry: i64,
    pub timestamp: i64,
}

#[derive(Debug, Clone, BorshDeserialize)]
pub struct OrderFilledEvent {
    pub order_id: [u8; 32],
    pub maker_commitment: [u8; 32],
    pub taker_commitment: [u8; 32],
    pub timestamp: i64,
}

#[derive(Debug, Clone, BorshDeserialize)]
pub struct OrderCancelledEvent {
    pub order_id: [u8; 32],
    pub refund_commitment: [u8; 32],
    pub timestamp: i64,
}

#[derive(Debug, Clone, BorshDeserialize)]
pub struct SwapExecutedEvent {
    pub amm_pool: [u8; 32],
    pub out_commitment: [u8; 32],
    pub change_commitment: [u8; 32],
    pub timestamp: i64,
}

#[derive(Debug, Clone, BorshDeserialize)]
pub struct VoteSubmittedEvent {
    pub aggregation_id: [u8; 32],
    pub action_nullifier: [u8; 32],
    pub timestamp: i64,
}

/// Parse event from transaction logs
pub fn parse_event(data: &[u8]) -> Option<CloakCraftEvent> {
    if data.len() < 8 {
        return None;
    }

    let discriminator: [u8; 8] = data[..8].try_into().ok()?;
    let event_data = &data[8..];

    match discriminator {
        discriminators::NOTE_CREATED => {
            NoteCreatedEvent::try_from_slice(event_data)
                .ok()
                .map(CloakCraftEvent::NoteCreated)
        }
        discriminators::NOTE_SPENT => {
            NoteSpentEvent::try_from_slice(event_data)
                .ok()
                .map(CloakCraftEvent::NoteSpent)
        }
        discriminators::ORDER_CREATED => {
            OrderCreatedEvent::try_from_slice(event_data)
                .ok()
                .map(CloakCraftEvent::OrderCreated)
        }
        discriminators::ORDER_FILLED => {
            OrderFilledEvent::try_from_slice(event_data)
                .ok()
                .map(CloakCraftEvent::OrderFilled)
        }
        discriminators::ORDER_CANCELLED => {
            OrderCancelledEvent::try_from_slice(event_data)
                .ok()
                .map(CloakCraftEvent::OrderCancelled)
        }
        discriminators::SWAP_EXECUTED => {
            SwapExecutedEvent::try_from_slice(event_data)
                .ok()
                .map(CloakCraftEvent::SwapExecuted)
        }
        discriminators::VOTE_SUBMITTED => {
            VoteSubmittedEvent::try_from_slice(event_data)
                .ok()
                .map(CloakCraftEvent::VoteSubmitted)
        }
        _ => None,
    }
}
