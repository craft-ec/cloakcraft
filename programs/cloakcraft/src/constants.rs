//! Protocol constants and domain separators

/// Merkle tree depth (2^16 = 65,536 leaves)
pub const MERKLE_TREE_DEPTH: usize = 16;

/// Maximum number of historical roots to store
pub const HISTORICAL_ROOTS_COUNT: usize = 30;

/// Maximum number of leaves in merkle tree
pub const MAX_LEAVES: u32 = 65536;

/// Domain separators for Poseidon hashes
pub mod domains {
    pub const COMMITMENT: u64 = 0x01;
    pub const SPENDING_NULLIFIER: u64 = 0x02;
    pub const ACTION_NULLIFIER: u64 = 0x03;
    pub const NULLIFIER_KEY: u64 = 0x04;
    pub const STEALTH: u64 = 0x05;
    pub const MERKLE: u64 = 0x06;
    pub const EMPTY_LEAF: u64 = 0x07;

    // Voting domains
    /// vote_nullifier = hash(VOTE_NULLIFIER, nullifier_key, ballot_id)
    /// ONE per user per ballot, ensures single active vote
    pub const VOTE_NULLIFIER: u64 = 0x10;
    /// vote_commitment_nullifier = hash(VOTE_COMMITMENT, nullifier_key, vote_commitment)
    /// Used when changing vote in Snapshot mode
    pub const VOTE_COMMITMENT: u64 = 0x11;
    /// spending_nullifier for vote_spend = hash(SPENDING, nullifier_key, note_commitment)
    /// Reuses SPENDING_NULLIFIER domain for SpendToVote
    pub const VOTE_SPENDING: u64 = 0x12;
    /// position_nullifier = hash(POSITION, nullifier_key, position_commitment)
    /// Used for close_position and claim
    pub const POSITION: u64 = 0x13;
}

/// Circuit IDs for verification key lookup
pub mod circuits {
    pub const TRANSFER_1X2: [u8; 32] = *b"transfer_1x2____________________";
    pub const CONSOLIDATE_3X1: [u8; 32] = *b"consolidate_3x1_________________";
    pub const ADAPTER_1X1: [u8; 32] = *b"adapter_1x1_____________________";
    pub const ADAPTER_1X2: [u8; 32] = *b"adapter_1x2_____________________";
    pub const MARKET_ORDER_CREATE: [u8; 32] = *b"market_order_create_____________";
    pub const MARKET_ORDER_FILL: [u8; 32] = *b"market_order_fill_______________";
    pub const MARKET_ORDER_CANCEL: [u8; 32] = *b"market_order_cancel_____________";
    pub const SWAP_ADD_LIQUIDITY: [u8; 32] = *b"swap_add_liquidity______________";
    pub const SWAP_REMOVE_LIQUIDITY: [u8; 32] = *b"swap_remove_liquidity___________";
    pub const SWAP_SWAP: [u8; 32] = *b"swap_swap_______________________";

    // Perpetual futures circuits
    pub const PERPS_OPEN_POSITION: [u8; 32] = *b"perps_open_position_____________";
    pub const PERPS_CLOSE_POSITION: [u8; 32] = *b"perps_close_position____________";
    pub const PERPS_LIQUIDATE: [u8; 32] = *b"perps_liquidate_________________";
    pub const PERPS_ADD_LIQUIDITY: [u8; 32] = *b"perps_add_liquidity_____________";
    pub const PERPS_REMOVE_LIQUIDITY: [u8; 32] = *b"perps_remove_liquidity__________";

    // Voting circuits
    /// Snapshot mode first vote circuit
    pub const VOTE_SNAPSHOT: [u8; 32] = *b"vote_snapshot___________________";
    /// Snapshot mode vote change circuit (atomic close+new)
    pub const CHANGE_VOTE_SNAPSHOT: [u8; 32] = *b"change_vote_snapshot____________";
    /// SpendToVote mode voting circuit
    pub const VOTE_SPEND: [u8; 32] = *b"vote_spend______________________";
    /// SpendToVote mode vote change circuit (atomic close+new position)
    pub const CHANGE_VOTE_SPEND: [u8; 32] = *b"change_vote_spend_______________";
    /// SpendToVote mode close position circuit (for exit/cancel)
    pub const CLOSE_POSITION: [u8; 32] = *b"close_position__________________";
    /// SpendToVote mode claim circuit
    pub const CLAIM: [u8; 32] = *b"claim___________________________";
}

/// PDA seeds
pub mod seeds {
    pub const POOL: &[u8] = b"pool";
    pub const VAULT: &[u8] = b"vault";
    pub const ORDER: &[u8] = b"order";
    pub const AMM_POOL: &[u8] = b"amm_pool";
    pub const LP_MINT: &[u8] = b"lp_mint";
    pub const AGGREGATION: &[u8] = b"aggregation";
    pub const VERIFICATION_KEY: &[u8] = b"vk";
    pub const ADAPT_MODULE: &[u8] = b"adapt";
    pub const COMMITTEE: &[u8] = b"committee";
    pub const PROTOCOL_CONFIG: &[u8] = b"protocol_config";

    // Perpetual futures seeds
    pub const PERPS_POOL: &[u8] = b"perps_pool";
    pub const PERPS_LP_MINT: &[u8] = b"perps_lp_mint";
    pub const PERPS_POSITION_MINT: &[u8] = b"perps_pos_mint";
    pub const PERPS_VAULT: &[u8] = b"perps_vault";
    pub const PERPS_MARKET: &[u8] = b"perps_market";

    // Voting seeds
    /// Ballot PDA seed: ["ballot", ballot_id]
    pub const BALLOT: &[u8] = b"ballot";
    /// Ballot vault PDA seed: ["ballot_vault", ballot_id]
    pub const BALLOT_VAULT: &[u8] = b"ballot_vault";
}

/// Operation types for pending operations
pub mod operation_types {
    pub const TRANSFER: u8 = 0;
    pub const SWAP: u8 = 1;
    pub const ADD_LIQUIDITY: u8 = 2;
    pub const REMOVE_LIQUIDITY: u8 = 3;
    pub const CONSOLIDATE: u8 = 4;

    // Perpetual futures operation types
    pub const PERPS_OPEN_POSITION: u8 = 10;
    pub const PERPS_CLOSE_POSITION: u8 = 11;
    pub const PERPS_LIQUIDATE: u8 = 12;
    pub const PERPS_ADD_LIQUIDITY: u8 = 13;
    pub const PERPS_REMOVE_LIQUIDITY: u8 = 14;

    // Voting operation types
    /// Snapshot mode first vote
    pub const VOTE_SNAPSHOT: u8 = 20;
    /// Snapshot mode vote change (atomic close+new)
    pub const CHANGE_VOTE_SNAPSHOT: u8 = 21;
    /// SpendToVote mode voting
    pub const VOTE_SPEND: u8 = 22;
    /// SpendToVote mode vote change (atomic close+new position)
    pub const CHANGE_VOTE_SPEND: u8 = 25;
    /// SpendToVote mode close vote position
    pub const CLOSE_VOTE_POSITION: u8 = 23;
    /// SpendToVote mode claim
    pub const CLAIM: u8 = 24;
}

/// Encrypted note size in bytes
pub const ENCRYPTED_NOTE_SIZE: usize = 184;

/// Groth16 proof size in bytes
pub const GROTH16_PROOF_SIZE: usize = 256;

/// ElGamal ciphertext size (C1 + C2, each 32 bytes x, y)
pub const ELGAMAL_CIPHERTEXT_SIZE: usize = 64;
