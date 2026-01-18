//! Pending operation state for multi-phase commit pattern
//!
//! When a transaction is too large to fit in a single Solana transaction,
//! we split it into multiple phases:
//!
//! Phase 1 (verify_operation): Verify ZK proof + Store pending operation
//! Phase 2 (create_nullifier): Create nullifiers one at a time
//! Phase 3 (create_commitment): Create commitments one at a time
//! Phase 4 (close_operation): Close pending operation, reclaim rent
//!
//! This ensures:
//! - Each Light Protocol operation fits in one transaction (~400 bytes each)
//! - Double-spend protection via nullifiers
//! - Atomic proof verification before any state changes
//! - Flexible number of nullifiers and commitments per operation

use anchor_lang::prelude::*;
use super::commitment::MAX_ENCRYPTED_NOTE_SIZE;

/// Maximum number of pending commitments per operation
/// 8 outputs allows flexibility for change, fees, multi-recipient transfers
pub const MAX_PENDING_COMMITMENTS: usize = 8;

/// Maximum number of inputs per operation (each input = 1 commitment + 1 nullifier)
/// 3 inputs allows note consolidation (combine 3 notes into 1)
/// For more notes, use recursive consolidation: (1+2+3)→A, (A+4+5)→B, etc.
pub const MAX_INPUTS: usize = 3;

/// Pending operation for multi-phase commit with append pattern
///
/// SECURITY: Append pattern binds all phases together
/// Phase 0: Verify ZK proof → stores input_commitment, nullifier, outputs
/// Phase 1: Verify commitment exists → must match input_commitment from Phase 0
/// Phase 2: Create nullifier → must match nullifier from Phase 0
/// Phase 3+: Execute operation → requires all verifications complete
///
/// This prevents commitment/nullifier swap attacks.
///
/// DESIGN CHOICE: Store randomness instead of encrypted notes
/// - Encrypted notes = ~200 bytes per output (10 outputs = 2000 bytes!)
/// - Randomness = 32 bytes per output (10 outputs = 320 bytes)
/// - Savings: 1680 bytes (~0.012 SOL temporary rent reduction)
///
/// Trade-off: Must regenerate encrypted notes if Phase 4 fails
/// - Normal case: Generate once in Phase 4, no regeneration needed
/// - Failure case: SDK reads randomness from PDA, regenerates encrypted notes
/// - Compute is cheap, storage is expensive on Solana
#[account]
pub struct PendingOperation {
    /// Bump seed for PDA derivation
    pub bump: u8,

    /// Operation ID (unique per operation, derived from inputs)
    pub operation_id: [u8; 32],

    /// Relayer who initiated the operation
    pub relayer: Pubkey,

    /// Operation type (not used for logic, only for logging/debugging)
    pub operation_type: u8,

    /// SECURITY: State machine flags (prevent phase skipping)
    /// Phase 0 sets proof_verified
    pub proof_verified: bool,

    /// SECURITY: Input commitment from ZK proof (binds Phase 0 to Phase 1)
    /// Phase 0 extracts from proof public inputs
    /// Phase 1 must verify THIS exact commitment
    /// For single-input operations (swap, remove_liquidity): Uses index 0
    /// For multi-input operations (add_liquidity): Uses indices 0 and 1
    pub input_commitments: [[u8; 32]; MAX_INPUTS],

    /// SECURITY: Expected nullifiers from ZK proof (binds Phase 0 to Phase 2)
    /// Phase 0 extracts from proof public inputs
    /// Phase 2 must create THIS exact nullifier
    /// Matches input_commitments indices
    pub expected_nullifiers: [[u8; 32]; MAX_INPUTS],

    /// SECURITY: Input pools for each input commitment (binds Phase 1/2 to correct pool)
    /// Phase 0 stores which pool each input commitment belongs to
    /// Phase 1 must verify commitment EXISTS in THIS exact pool
    /// Phase 2 must create nullifier in THIS exact pool
    /// This prevents pool confusion attacks in multi-pool operations (e.g., swap)
    /// Matches input_commitments and expected_nullifiers indices
    pub input_pools: [[u8; 32]; MAX_INPUTS],

    /// Number of input commitments to verify (1 for swap/remove, 2 for add_liquidity)
    pub num_inputs: u8,

    /// Bitmask tracking which input commitments have been verified
    /// Bit i = 1 means input_commitments[i] was verified
    pub inputs_verified_mask: u8,

    /// Which nullifiers have been created (bitmask)
    /// Uses same indices as expected_nullifiers array
    pub nullifier_completed_mask: u8,

    /// Number of pending commitments
    pub num_commitments: u8,

    /// Pools for each commitment
    pub pools: [[u8; 32]; MAX_PENDING_COMMITMENTS],

    /// Commitment hashes
    pub commitments: [[u8; 32]; MAX_PENDING_COMMITMENTS],

    /// Leaf indices for each commitment
    pub leaf_indices: [u64; MAX_PENDING_COMMITMENTS],

    /// Stealth ephemeral pubkeys (64 bytes each: X + Y coordinates)
    /// Used by scanner to derive stealth private key for decryption
    pub stealth_ephemeral_pubkeys: [[u8; 64]; MAX_PENDING_COMMITMENTS],

    /// Output recipients (stealth public key X coordinate)
    /// Used to regenerate encrypted notes
    pub output_recipients: [[u8; 32]; MAX_PENDING_COMMITMENTS],

    /// Output amounts
    /// Used to regenerate encrypted notes
    pub output_amounts: [u64; MAX_PENDING_COMMITMENTS],

    /// Output randomness (from ZK proof)
    /// CRITICAL: Used to regenerate encrypted notes
    /// Must match what was used in commitment computation
    pub output_randomness: [[u8; 32]; MAX_PENDING_COMMITMENTS],

    /// Which commitments have been created (bitmask)
    pub completed_mask: u8,

    /// Expiry timestamp (operation expires after this)
    pub expires_at: i64,

    /// Creation timestamp
    pub created_at: i64,

    // =============================================================================
    // Operation-specific fields (used by Phase 3 execute instructions)
    // These fields store operation-specific data from Phase 0 for use in Phase 3
    // =============================================================================

    /// Swap: Input amount being swapped
    /// Add Liquidity: Token A deposit amount
    /// Remove Liquidity: LP tokens burned
    pub swap_amount: u64,

    /// Swap: Output amount received (recalculated on-chain for flexibility)
    /// Add Liquidity: Token B deposit amount
    /// Remove Liquidity: Token A withdrawn
    pub output_amount: u64,

    /// Swap: Minimum acceptable output (slippage protection)
    /// Verified on-chain: recalculated_output >= min_output
    /// Add Liquidity/Remove Liquidity: unused
    pub min_output: u64,

    /// Swap: unused
    /// Add Liquidity: LP tokens minted
    /// Remove Liquidity: Token B withdrawn
    pub extra_amount: u64,

    /// Swap: Direction (1 = A->B, 0 = B->A)
    /// Add Liquidity: unused
    /// Remove Liquidity: unused
    pub swap_a_to_b: bool,

    // =============================================================================
    // Protocol Fee fields
    // =============================================================================

    /// Protocol fee amount (verified in ZK proof)
    /// Transfer/Unshield: Fee deducted from transfer amount
    /// Swap: Fee deducted from swap output
    /// Remove Liquidity: Fee deducted from withdrawal
    pub fee_amount: u64,

    /// Unshield amount (for process_unshield phase)
    pub unshield_amount: u64,

    /// Transfer amount (public for on-chain fee verification)
    /// This is the amount going to the recipient (out_amount_1 in circuit)
    pub transfer_amount: u64,

    /// Whether fee has been processed (transferred to treasury)
    pub fee_processed: bool,
}

impl PendingOperation {
    /// Seeds prefix for PDA derivation
    pub const SEEDS_PREFIX: &'static [u8] = b"pending_op";

    /// Space required for account (with padding)
    /// Using Option A: Store randomness instead of encrypted notes
    /// Saves ~1680 bytes compared to storing encrypted notes
    pub const SPACE: usize = 8 + // discriminator
        1 + // bump
        32 + // operation_id
        32 + // relayer
        1 + // operation_type
        1 + // proof_verified
        (32 * MAX_INPUTS) + // input_commitments (3 × 32 = 96) (SECURITY: binds Phase 0 to Phase 1)
        (32 * MAX_INPUTS) + // expected_nullifiers (3 × 32 = 96) (SECURITY: binds Phase 0 to Phase 2)
        (32 * MAX_INPUTS) + // input_pools (3 × 32 = 96) (SECURITY: binds Phase 1/2 to correct pool)
        1 + // num_inputs
        1 + // inputs_verified_mask
        1 + // nullifier_completed_mask
        1 + // num_commitments
        (32 * MAX_PENDING_COMMITMENTS) + // pools (8 × 32 = 256)
        (32 * MAX_PENDING_COMMITMENTS) + // commitments (8 × 32 = 256)
        (8 * MAX_PENDING_COMMITMENTS) + // leaf_indices (8 × 8 = 64)
        (64 * MAX_PENDING_COMMITMENTS) + // stealth_ephemeral_pubkeys (8 × 64 = 512)
        (32 * MAX_PENDING_COMMITMENTS) + // output_recipients (8 × 32 = 256)
        (8 * MAX_PENDING_COMMITMENTS) + // output_amounts (8 × 8 = 64)
        (32 * MAX_PENDING_COMMITMENTS) + // output_randomness (8 × 32 = 256)
        1 + // completed_mask
        8 + // expires_at
        8 + // created_at
        8 + // swap_amount (operation-specific)
        8 + // output_amount (operation-specific)
        8 + // min_output (slippage protection for swap)
        8 + // extra_amount (operation-specific)
        1 + // swap_a_to_b (operation-specific)
        8 + // fee_amount (protocol fee)
        8 + // unshield_amount
        8 + // transfer_amount (public for fee verification)
        1; // fee_processed
        // Total: ~2,083 bytes with 3 inputs + 8 outputs (safe for 4KB stack)

    /// Check if all input commitments have been verified
    pub fn all_inputs_verified(&self) -> bool {
        let mask = (1u8 << self.num_inputs) - 1;
        self.inputs_verified_mask == mask
    }

    /// Check if all expected nullifiers have been created
    /// For multi-input operations, this checks nullifier_completed_mask
    /// For operations using expected_nullifiers array, check if num_inputs nullifiers are created
    pub fn all_expected_nullifiers_created(&self) -> bool {
        if self.num_inputs == 0 {
            return true;
        }
        let mask = (1u8 << self.num_inputs) - 1;
        (self.nullifier_completed_mask & mask) == mask
    }

    /// Check if all nullifiers have been created
    /// This is the same as all_expected_nullifiers_created() - kept for compatibility
    pub fn all_nullifiers_created(&self) -> bool {
        self.all_expected_nullifiers_created()
    }

    /// Check if all commitments have been created
    pub fn all_commitments_created(&self) -> bool {
        if self.num_commitments == 0 {
            return true;
        }
        let mask = (1u8 << self.num_commitments) - 1;
        self.completed_mask == mask
    }

    /// Check if operation is complete (all nullifiers AND commitments created)
    pub fn is_complete(&self) -> bool {
        self.all_nullifiers_created() && self.all_commitments_created()
    }

    /// Check if operation has expired
    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time > self.expires_at
    }

    /// Mark a nullifier as created
    pub fn mark_nullifier_created(&mut self, index: u8) {
        self.nullifier_completed_mask |= 1u8 << index;
    }

    /// Mark a commitment as completed
    pub fn mark_completed(&mut self, index: u8) {
        self.completed_mask |= 1u8 << index;
    }

    /// Get next uncreated nullifier index
    pub fn next_uncreated_nullifier(&self) -> Option<u8> {
        for i in 0..self.num_inputs {
            if (self.nullifier_completed_mask & (1u8 << i)) == 0 {
                return Some(i);
            }
        }
        None
    }

    /// Get next uncompleted commitment index
    pub fn next_uncompleted(&self) -> Option<u8> {
        for i in 0..self.num_commitments {
            if (self.completed_mask & (1u8 << i)) == 0 {
                return Some(i);
            }
        }
        None
    }
}

/// Expiry duration for pending operations (5 minutes)
pub const PENDING_OPERATION_EXPIRY_SECONDS: i64 = 300;
