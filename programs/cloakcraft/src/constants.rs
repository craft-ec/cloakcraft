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
}

/// Circuit IDs for verification key lookup
pub mod circuits {
    pub const TRANSFER_1X2: [u8; 32] = *b"transfer_1x2____________________";
    pub const TRANSFER_1X3: [u8; 32] = *b"transfer_1x3____________________";
    pub const ADAPTER_1X1: [u8; 32] = *b"adapter_1x1_____________________";
    pub const ADAPTER_1X2: [u8; 32] = *b"adapter_1x2_____________________";
    pub const MARKET_ORDER_CREATE: [u8; 32] = *b"market_order_create_____________";
    pub const MARKET_ORDER_FILL: [u8; 32] = *b"market_order_fill_______________";
    pub const MARKET_ORDER_CANCEL: [u8; 32] = *b"market_order_cancel_____________";
    pub const SWAP_ADD_LIQUIDITY: [u8; 32] = *b"swap_add_liquidity______________";
    pub const SWAP_REMOVE_LIQUIDITY: [u8; 32] = *b"swap_remove_liquidity___________";
    pub const SWAP_SWAP: [u8; 32] = *b"swap_swap_______________________";
    pub const GOVERNANCE_ENCRYPTED: [u8; 32] = *b"governance_encrypted_submit_____";
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
}

/// Encrypted note size in bytes
pub const ENCRYPTED_NOTE_SIZE: usize = 184;

/// Groth16 proof size in bytes
pub const GROTH16_PROOF_SIZE: usize = 256;

/// ElGamal ciphertext size (C1 + C2, each 32 bytes x, y)
pub const ELGAMAL_CIPHERTEXT_SIZE: usize = 64;
