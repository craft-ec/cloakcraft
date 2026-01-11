//! CloakCraft events for indexer consumption

use anchor_lang::prelude::*;

/// Emitted when a new note is created (shield or transact output)
#[event]
pub struct NoteCreated {
    /// Pool the note belongs to
    pub pool: Pubkey,
    /// Commitment hash
    pub commitment: [u8; 32],
    /// Leaf index in merkle tree
    pub leaf_index: u32,
    /// Encrypted note data
    pub encrypted_note: Vec<u8>,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when a note is spent (nullifier revealed)
#[event]
pub struct NoteSpent {
    /// Pool the note belonged to
    pub pool: Pubkey,
    /// Nullifier
    pub nullifier: [u8; 32],
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when tokens are shielded
#[event]
pub struct Shielded {
    /// Pool
    pub pool: Pubkey,
    /// Amount shielded
    pub amount: u64,
    /// User who shielded (public)
    pub user: Pubkey,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when tokens are unshielded
#[event]
pub struct Unshielded {
    /// Pool
    pub pool: Pubkey,
    /// Amount unshielded
    pub amount: u64,
    /// Recipient (public)
    pub recipient: Pubkey,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when a new pool is initialized
#[event]
pub struct PoolInitialized {
    /// Pool address
    pub pool: Pubkey,
    /// Token mint
    pub token_mint: Pubkey,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when merkle root is updated
#[event]
pub struct MerkleRootUpdated {
    /// Pool
    pub pool: Pubkey,
    /// New root
    pub new_root: [u8; 32],
    /// Next leaf index
    pub next_leaf_index: u32,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when an order is created
#[event]
pub struct OrderCreated {
    /// Order ID
    pub order_id: [u8; 32],
    /// Escrow commitment
    pub escrow_commitment: [u8; 32],
    /// Terms hash (tokens and amounts hidden)
    pub terms_hash: [u8; 32],
    /// Expiry timestamp
    pub expiry: i64,
    /// Creation timestamp
    pub timestamp: i64,
}

/// Emitted when an order is filled
#[event]
pub struct OrderFilled {
    /// Order ID
    pub order_id: [u8; 32],
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when an order is cancelled
#[event]
pub struct OrderCancelled {
    /// Order ID
    pub order_id: [u8; 32],
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when AMM pool is initialized
#[event]
pub struct AmmPoolInitialized {
    /// Pool ID
    pub pool_id: Pubkey,
    /// Token A mint
    pub token_a_mint: Pubkey,
    /// Token B mint
    pub token_b_mint: Pubkey,
    /// LP token mint
    pub lp_mint: Pubkey,
    /// Fee in basis points
    pub fee_bps: u16,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when AMM pool state changes
#[event]
pub struct AmmPoolStateChanged {
    /// Pool ID
    pub pool_id: Pubkey,
    /// New state hash
    pub state_hash: [u8; 32],
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when a voting aggregation is created
#[event]
pub struct AggregationCreated {
    /// Aggregation ID
    pub id: [u8; 32],
    /// Token mint for voting power
    pub token_mint: Pubkey,
    /// Number of options
    pub num_options: u8,
    /// Voting deadline
    pub deadline: i64,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when an encrypted vote is submitted
#[event]
pub struct VoteSubmitted {
    /// Aggregation ID
    pub aggregation_id: [u8; 32],
    /// Action nullifier (prevents double voting)
    pub action_nullifier: [u8; 32],
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when voting results are finalized
#[event]
pub struct AggregationFinalized {
    /// Aggregation ID
    pub id: [u8; 32],
    /// Final vote totals per option
    pub totals: Vec<u64>,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when an adapter module is registered
#[event]
pub struct AdapterRegistered {
    /// Adapter program ID
    pub adapter: Pubkey,
    /// Interface version
    pub interface_version: u8,
    /// Timestamp
    pub timestamp: i64,
}

/// Emitted when a verification key is registered
#[event]
pub struct VerificationKeyRegistered {
    /// Circuit ID
    pub circuit_id: [u8; 32],
    /// Timestamp
    pub timestamp: i64,
}
