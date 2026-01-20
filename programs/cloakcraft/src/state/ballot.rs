//! Ballot state for privacy-preserving voting protocol
//!
//! Supports:
//! - **Snapshot voting** (tokens stay liquid) and **SpendToVote** (tokens locked)
//! - **Public**, **TimeLocked**, and **PermanentPrivate** reveal modes
//! - **Single**, **Approval**, **Ranked**, and **Weighted** vote types
//! - **TallyBased**, **Oracle**, and **Authority** resolution

use anchor_lang::prelude::*;

/// Maximum number of voting options per ballot
pub const MAX_BALLOT_OPTIONS: usize = 16;

/// Maximum number of weight formula operations
pub const MAX_WEIGHT_FORMULA_OPS: usize = 16;

/// Maximum number of weight formula parameters
pub const MAX_WEIGHT_PARAMS: usize = 8;

/// ElGamal ciphertext size (C1 + C2, each 32 bytes)
pub const ELGAMAL_CIPHERTEXT_SIZE: usize = 64;

/// Vote binding mode - how tokens participate in voting
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace, Debug)]
pub enum VoteBindingMode {
    /// Snapshot: Tokens stay liquid, voting power based on balance at snapshot_slot
    /// Uses indexer attestation for balance verification
    #[default]
    Snapshot,
    /// SpendToVote: Tokens locked in ballot vault, returned/distributed at resolution
    /// Prediction market model: winners split pool proportionally
    SpendToVote,
}

/// Reveal mode - when and how vote information is revealed
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace, Debug)]
pub enum RevealMode {
    /// Public: vote_choice is a public input to circuit, visible immediately
    #[default]
    Public,
    /// TimeLocked: Encrypted with timelock key, revealed after unlock_slot
    /// Both aggregates AND individual votes revealed after unlock
    TimeLocked,
    /// PermanentPrivate: Aggregates revealed after timelock, individual votes NEVER revealed
    /// User encrypts preimage with own key for claim recovery
    PermanentPrivate,
}

/// Vote type - how votes are counted
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace, Debug)]
pub enum VoteType {
    /// Single: Choose one option (vote_choice = u8 option index)
    /// Tally: option_weights[vote_choice] += weight
    #[default]
    Single,
    /// Approval: Choose multiple options (vote_choice = u16 bitmap)
    /// Tally: For each bit set, option_weights[i] += weight
    Approval,
    /// Ranked: Borda count (vote_choice = packed u64, 4 bits per rank)
    /// Tally: option_weights[rank_i] += (num_options - i) * weight
    Ranked,
    /// Weighted: Same as Single but allows fractional weight distribution
    /// Tally: option_weights[vote_choice] += weight
    Weighted,
}

/// Resolution mode - how the outcome is determined
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace, Debug)]
pub enum ResolutionMode {
    /// TallyBased: Winner = argmax(option_weights[])
    /// Tie-breaking: lowest index wins
    #[default]
    TallyBased,
    /// Oracle: External oracle submits outcome
    Oracle,
    /// Authority: Designated authority sets outcome
    Authority,
}

/// Ballot status lifecycle
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace, Debug)]
pub enum BallotStatus {
    /// Ballot created but voting not yet started
    #[default]
    Pending,
    /// Voting is active (start_time <= current_time < end_time)
    Active,
    /// Voting ended (current_time >= end_time), awaiting resolution
    Closed,
    /// Outcome determined, claims allowed (SpendToVote only)
    Resolved,
    /// Claims period ended, remaining funds sent to treasury (SpendToVote only)
    Finalized,
}

/// Weight formula operation for stack-based DSL
///
/// Weight = evaluate(amount, weight_params) using these operations
/// Example: weight = sqrt(amount) → [PushAmount, Sqrt]
/// Example: weight = min(amount, 1000) → [PushAmount, PushConst(0), Min] where weight_params[0] = 1000
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Default, InitSpace, Debug)]
pub enum WeightOp {
    /// Push the input amount onto the stack
    #[default]
    PushAmount,
    /// Push weight_params[index] onto the stack
    PushConst,
    /// Push user-provided data (reserved for future use)
    PushUserData,
    /// Pop two values, push their sum
    Add,
    /// Pop two values, push (second - first)
    Sub,
    /// Pop two values, push their product
    Mul,
    /// Pop two values, push (second / first)
    Div,
    /// Pop one value, push its square root
    Sqrt,
    /// Pop two values, push the minimum
    Min,
    /// Pop two values, push the maximum
    Max,
}

/// Vote preimage account for encrypted modes
/// Stored as Light Protocol compressed account alongside vote_commitment
///
/// This allows users to recover their vote data for claims by scanning the chain.
/// Same pattern as token notes - user encrypts with own key, recovers by scanning.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, InitSpace)]
pub struct VotePreimageData {
    /// Ballot this vote belongs to
    pub ballot_id: [u8; 32],
    /// User's public key (for indexer to match on scan)
    pub pubkey: [u8; 32],
    /// Links to the vote_commitment (Snapshot) or position_commitment (SpendToVote)
    pub commitment: [u8; 32],
    /// User's self-encrypted vote data (128 bytes max)
    /// Contains: vote_choice, weight, [amount for SpendToVote], randomness, ballot_id
    #[max_len(128)]
    pub encrypted_preimage: Vec<u8>,
    /// Encryption type: 0 = user_key (PermanentPrivate), 1 = timelock_key (TimeLocked)
    pub encryption_type: u8,
    /// Binding mode: 0 = Snapshot, 1 = SpendToVote
    pub binding_mode: u8,
}

/// Main ballot account storing all voting configuration and state
#[account]
pub struct Ballot {
    // =========================================================================
    // Identifiers
    // =========================================================================
    /// Unique ballot identifier
    pub ballot_id: [u8; 32],
    /// Authority who can resolve (for Authority mode) or manage ballot
    pub authority: Pubkey,
    /// Token mint for voting power
    pub token_mint: Pubkey,
    /// Token vault PDA (SpendToVote only, holds locked tokens)
    pub token_pool: Pubkey,

    // =========================================================================
    // Configuration
    // =========================================================================
    /// How tokens participate in voting
    pub binding_mode: VoteBindingMode,
    /// When and how votes are revealed
    pub reveal_mode: RevealMode,
    /// How votes are counted
    pub vote_type: VoteType,
    /// How outcome is determined
    pub resolution_mode: ResolutionMode,
    /// Current ballot status
    pub status: BallotStatus,

    /// Number of voting options (max 16)
    pub num_options: u8,
    /// Minimum weight/amount required for valid outcome (0 = no quorum)
    pub quorum_threshold: u64,
    /// Protocol fee in basis points (SpendToVote only, max 10000 = 100%)
    pub protocol_fee_bps: u16,
    /// Treasury account for fee collection
    pub protocol_treasury: Pubkey,

    // =========================================================================
    // Timing
    // =========================================================================
    /// When voting starts
    pub start_time: i64,
    /// When voting ends
    pub end_time: i64,
    /// For Snapshot mode: slot at which balances are checked
    pub snapshot_slot: u64,
    /// Trusted indexer public key for balance attestation (Snapshot mode)
    pub indexer_pubkey: Pubkey,
    /// Merkle root of eligible addresses (None = open to all token holders)
    pub eligibility_root: [u8; 32],
    /// Whether eligibility_root is set (workaround for Option not being well-supported)
    pub has_eligibility_root: bool,

    // =========================================================================
    // Weight Formula (stack-based DSL)
    // =========================================================================
    /// Weight formula operations (evaluated left to right)
    pub weight_formula: [u8; MAX_WEIGHT_FORMULA_OPS],
    /// Number of operations in weight_formula
    pub weight_formula_len: u8,
    /// Parameters for PushConst operations
    pub weight_params: [u64; MAX_WEIGHT_PARAMS],

    // =========================================================================
    // Tally (Public mode or after decrypt)
    // =========================================================================
    /// Weight per option (after weight formula applied)
    pub option_weights: [u64; MAX_BALLOT_OPTIONS],
    /// Raw amounts per option (before weight formula)
    pub option_amounts: [u64; MAX_BALLOT_OPTIONS],
    /// Total weight across all votes
    pub total_weight: u64,
    /// Total amount across all votes
    pub total_amount: u64,
    /// Number of votes cast
    pub vote_count: u64,

    // =========================================================================
    // Pool State (SpendToVote only)
    // =========================================================================
    /// Current balance in the vault
    pub pool_balance: u64,
    /// Total payouts distributed during claims
    pub total_distributed: u64,
    /// Total fees collected during claims
    pub fees_collected: u64,

    // =========================================================================
    // Encrypted Tally (TimeLocked/PermanentPrivate modes)
    // =========================================================================
    /// ElGamal ciphertexts for homomorphic vote counting
    /// Note: Used for AGGREGATE counting only
    /// Individual vote_choice hidden by commitment hash, NOT by this encryption
    pub encrypted_tally: [[u8; ELGAMAL_CIPHERTEXT_SIZE]; MAX_BALLOT_OPTIONS],
    /// Public key for timelock encryption
    pub time_lock_pubkey: [u8; 32],
    /// Slot after which timelock key is released
    pub unlock_slot: u64,

    // =========================================================================
    // Resolution
    // =========================================================================
    /// Winning option index (None if no winner or quorum not met)
    pub outcome: u8,
    /// Whether outcome has been set
    pub has_outcome: bool,
    /// Total weight that voted for winner (for payout calculation)
    pub winner_weight: u64,
    /// Designated resolver for Authority mode
    pub resolver: Pubkey,
    /// Whether resolver is set
    pub has_resolver: bool,
    /// Oracle account for Oracle mode
    pub oracle: Pubkey,
    /// Whether oracle is set
    pub has_oracle: bool,
    /// Deadline for claims (SpendToVote only, 0 for Snapshot)
    pub claim_deadline: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl Ballot {
    /// Seeds prefix for ballot PDA
    pub const SEEDS_PREFIX: &'static [u8] = b"ballot";

    /// Seeds prefix for ballot vault PDA
    pub const VAULT_SEEDS_PREFIX: &'static [u8] = b"ballot_vault";

    /// Calculate account space
    pub const SPACE: usize = 8 + // discriminator
        // Identifiers
        32 + // ballot_id
        32 + // authority
        32 + // token_mint
        32 + // token_pool
        // Configuration
        1 + // binding_mode
        1 + // reveal_mode
        1 + // vote_type
        1 + // resolution_mode
        1 + // status
        1 + // num_options
        8 + // quorum_threshold
        2 + // protocol_fee_bps
        32 + // protocol_treasury
        // Timing
        8 + // start_time
        8 + // end_time
        8 + // snapshot_slot
        32 + // indexer_pubkey
        32 + // eligibility_root
        1 + // has_eligibility_root
        // Weight formula
        MAX_WEIGHT_FORMULA_OPS + // weight_formula (16 bytes)
        1 + // weight_formula_len
        (8 * MAX_WEIGHT_PARAMS) + // weight_params (64 bytes)
        // Tally
        (8 * MAX_BALLOT_OPTIONS) + // option_weights (128 bytes)
        (8 * MAX_BALLOT_OPTIONS) + // option_amounts (128 bytes)
        8 + // total_weight
        8 + // total_amount
        8 + // vote_count
        // Pool state
        8 + // pool_balance
        8 + // total_distributed
        8 + // fees_collected
        // Encrypted tally
        (ELGAMAL_CIPHERTEXT_SIZE * MAX_BALLOT_OPTIONS) + // encrypted_tally (1024 bytes)
        32 + // time_lock_pubkey
        8 + // unlock_slot
        // Resolution
        1 + // outcome
        1 + // has_outcome
        8 + // winner_weight
        32 + // resolver
        1 + // has_resolver
        32 + // oracle
        1 + // has_oracle
        8 + // claim_deadline
        1; // bump
        // Total: ~1,768 bytes

    /// Check if ballot is currently active for voting
    pub fn is_active(&self, current_time: i64) -> bool {
        self.status == BallotStatus::Active
            && current_time >= self.start_time
            && current_time < self.end_time
    }

    /// Check if voting period has ended
    pub fn is_voting_ended(&self, current_time: i64) -> bool {
        current_time >= self.end_time
    }

    /// Check if ballot is resolved
    pub fn is_resolved(&self) -> bool {
        self.status == BallotStatus::Resolved
    }

    /// Check if ballot is finalized
    pub fn is_finalized(&self) -> bool {
        self.status == BallotStatus::Finalized
    }

    /// Check if quorum is met
    /// For SpendToVote: checks pool_balance >= quorum_threshold
    /// For Snapshot: checks total_weight >= quorum_threshold
    pub fn quorum_met(&self) -> bool {
        if self.quorum_threshold == 0 {
            return true;
        }
        match self.binding_mode {
            VoteBindingMode::SpendToVote => self.pool_balance >= self.quorum_threshold,
            VoteBindingMode::Snapshot => self.total_weight >= self.quorum_threshold,
        }
    }

    /// Check if claims are allowed (SpendToVote only, after resolution)
    pub fn claims_allowed(&self, current_time: i64) -> bool {
        self.binding_mode == VoteBindingMode::SpendToVote
            && self.status == BallotStatus::Resolved
            && (self.claim_deadline == 0 || current_time < self.claim_deadline)
    }

    /// Calculate payout for a winner
    /// payout = (user_weight / winner_weight) * total_pool
    /// Returns (gross_payout, net_payout) after fee deduction
    pub fn calculate_payout(&self, user_weight: u64) -> (u64, u64) {
        if self.winner_weight == 0 || !self.has_outcome {
            return (0, 0);
        }

        // gross_payout = (user_weight * pool_balance) / winner_weight
        // Use u128 to prevent overflow
        let gross_payout = ((user_weight as u128) * (self.pool_balance as u128)
            / (self.winner_weight as u128)) as u64;

        // fee = gross_payout * protocol_fee_bps / 10000
        let fee = (gross_payout as u128 * self.protocol_fee_bps as u128 / 10000) as u64;
        let net_payout = gross_payout.saturating_sub(fee);

        (gross_payout, net_payout)
    }

    /// Determine winner based on TallyBased resolution
    /// Returns winning option index (lowest index on tie)
    pub fn tally_based_winner(&self) -> Option<u8> {
        if self.num_options == 0 {
            return None;
        }

        let mut max_weight = 0u64;
        let mut winner = 0u8;

        for i in 0..self.num_options as usize {
            if self.option_weights[i] > max_weight {
                max_weight = self.option_weights[i];
                winner = i as u8;
            }
        }

        if max_weight == 0 {
            return None;
        }

        Some(winner)
    }

    /// Check if a vote choice won (for claims)
    /// Handles different vote types appropriately
    pub fn is_winner(&self, vote_choice: u64, outcome: u8) -> bool {
        match self.vote_type {
            VoteType::Single | VoteType::Weighted => {
                // vote_choice is the option index
                vote_choice as u8 == outcome
            }
            VoteType::Approval => {
                // vote_choice is a bitmap, check if outcome bit is set
                (vote_choice & (1u64 << outcome)) != 0
            }
            VoteType::Ranked => {
                // vote_choice is packed 4 bits per rank
                // Check if outcome appears in any rank position
                for rank in 0..self.num_options {
                    let ranked_option = ((vote_choice >> (rank * 4)) & 0xF) as u8;
                    if ranked_option == outcome {
                        return true;
                    }
                }
                false
            }
        }
    }

    /// Get the weight formula as a slice
    pub fn get_weight_formula(&self) -> &[u8] {
        &self.weight_formula[..self.weight_formula_len as usize]
    }
}

/// Input configuration for creating a ballot
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BallotConfigInput {
    pub binding_mode: VoteBindingMode,
    pub reveal_mode: RevealMode,
    pub vote_type: VoteType,
    pub resolution_mode: ResolutionMode,
    pub num_options: u8,
    pub quorum_threshold: u64,
    pub protocol_fee_bps: u16,
    pub protocol_treasury: Pubkey,
    pub start_time: i64,
    pub end_time: i64,
    pub snapshot_slot: u64,
    pub indexer_pubkey: Pubkey,
    pub eligibility_root: Option<[u8; 32]>,
    pub weight_formula: Vec<u8>,
    pub weight_params: Vec<u64>,
    pub time_lock_pubkey: [u8; 32],
    pub unlock_slot: u64,
    pub resolver: Option<Pubkey>,
    pub oracle: Option<Pubkey>,
    pub claim_deadline: i64,
}
