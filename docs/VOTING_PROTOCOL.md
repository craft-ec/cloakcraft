# CloakCraft Voting Protocol Specification

## Overview

A flexible, privacy-preserving voting protocol built on CloakCraft's shielded note infrastructure. Designed as a primitive layer that applications can configure for various use cases: governance, prediction markets, disputes, and more.

## Design Principles

1. **Protocol is primitive, apps interpret** - Protocol handles cryptographic guarantees, apps define business logic
2. **Configurable at ballot level** - Each ballot can have different settings
3. **Verifiable on-chain** - All payouts verified via ZK proofs, no trusted parties
4. **Privacy by default** - Voter identity always hidden, vote visibility configurable
5. **No trusted committees** - Use time-lock for decryption, not threshold key holders

---

## Core Concepts

### Vote Binding Mode

How votes are bound to tokens:

| Mode | Tokens | Use Case |
|------|--------|----------|
| Snapshot | Stay liquid (not locked) | Governance, polls |
| SpendToVote | Locked in pool, redistributed | Prediction markets, betting |

### Reveal Mode

What happens to individual votes:

| Mode | During Voting | After Unlock | Individual Votes |
|------|---------------|--------------|------------------|
| Public | Visible | Visible | Always public |
| TimeLocked | Hidden | Revealed | Public after unlock |
| PermanentPrivate | Hidden | Sum only | Never revealed |

### Weight Formula

How vote weight is calculated from token amount:

| Formula | Calculation | Use Case |
|---------|-------------|----------|
| Linear | `weight = amount` | Standard voting |
| Quadratic | `weight = sqrt(amount)` | Quadratic voting |
| Custom | `weight = f(amount, user_data)` | ScaleCraft (reputation-weighted) |

### Distribution

How locked tokens are redistributed (SpendToVote only):

| Formula | Calculation | Use Case |
|---------|-------------|----------|
| Proportional | `payout = (weight * pool) / winner_weight` | All prediction markets |

Distribution is always proportional to weight. The customization is in how weight is calculated.

### Resolution

How outcome is determined:

| Type | Determined By | Use Case |
|------|---------------|----------|
| TallyBased | Vote totals | Governance, disputes |
| Oracle | External data | Prediction markets |
| Authority | Designated resolver | Custom, appeals |

---

## Configuration

### Protocol Config (Global)

Set once by protocol admin. Applies to all ballots.

```rust
pub struct VotingProtocolConfig {
    pub authority: Pubkey,

    // Limits
    pub max_options: u8,              // Max vote options (e.g., 32)
    pub max_voting_duration: i64,     // Max voting period in seconds
    pub min_voting_duration: i64,     // Min voting period in seconds
    pub max_formula_ops: u8,          // Max ops in weight formula

    // Circuits
    pub vote_circuit_id: [u8; 32],
    pub claim_circuit_id: [u8; 32],

    // Fees
    pub ballot_creation_fee: u64,
    pub protocol_fee_bps: u16,        // Fee on pool (e.g., 50 = 0.5%)
    pub treasury: Pubkey,
}
```

### Ballot Config (Per Ballot)

App configures when creating a ballot.

```rust
pub struct BallotConfig {
    // Identity
    pub ballot_id: [u8; 32],
    pub creator: Pubkey,
    pub metadata_uri: Option<String>,  // Off-chain metadata (IPFS)

    // Vote structure
    pub num_options: u8,
    pub token_mint: Pubkey,            // Which token for voting/betting
    pub vote_type: VoteType,           // Single, Approval, or Ranked

    // Timing
    pub voting_start: i64,
    pub voting_end: i64,

    // Core modes
    pub vote_binding: VoteBindingMode,
    pub reveal_mode: RevealMode,
    pub weight_formula: WeightExpression,
    pub resolution: ResolutionType,

    // User data attestation (for custom weight formulas)
    pub user_data_authority: Option<Pubkey>,
}
```

### Vote Type

```rust
pub enum VoteType {
    /// Vote for exactly one option
    /// Most common: Yes/No, A/B/C
    Single,

    /// Vote for multiple options (each gets full weight)
    /// "Which features do you want?" - select all that apply
    Approval {
        max_selections: u8,  // Max options voter can select
    },

    /// Rank options in preference order
    /// Weight distributed: 1st gets N points, 2nd gets N-1, etc.
    Ranked {
        num_ranks: u8,       // How many to rank (e.g., top 3)
        point_system: PointSystem,
    },

    /// Split weight across options
    /// "Allocate your 100 votes across projects"
    Weighted {
        max_selections: u8,
    },
}

pub enum PointSystem {
    /// 1st: N, 2nd: N-1, 3rd: N-2, etc. (Borda count)
    Borda,
    /// 1st: N, 2nd: N/2, 3rd: N/4, etc. (Exponential decay)
    Exponential,
    /// Custom points per rank
    Custom { points: Vec<u64> },
}
```

### Vote Binding Mode

```rust
pub enum VoteBindingMode {
    /// Prove note existed at snapshot, tokens stay liquid
    Snapshot {
        snapshot_slot: u64,
    },

    /// Spend note to vote, tokens locked until claim
    /// Distribution is always proportional to weight
    SpendToVote,
}
```

### Reveal Mode

```rust
pub enum RevealMode {
    /// Individual votes visible immediately
    /// Tally visible immediately
    Public,

    /// Individual votes encrypted, revealed after unlock
    /// Tally computable after unlock
    TimeLocked {
        unlock_slot: u64,
    },

    /// Individual votes never revealed
    /// Only sum (tally) decrypted after unlock
    PermanentPrivate {
        sum_unlock_slot: u64,
    },
}
```

### Weight Formula

```rust
pub struct WeightExpression {
    pub ops: [WeightOp; MAX_WEIGHT_OPS],
    pub num_ops: u8,
    pub params: [u64; MAX_WEIGHT_PARAMS],  // Constants for formula
}

pub enum WeightOp {
    // Push values onto stack
    PushConst(u8),        // Push params[index]
    PushAmount,           // Push user's token amount
    PushUserData(u8),     // Push user-specific data (e.g., reputation)

    // Arithmetic (pop 2, push 1)
    Add,
    Sub,
    Mul,
    Div,

    // Special
    Sqrt,                 // Pop 1, push sqrt
    Min,                  // Pop 2, push min
    Max,                  // Pop 2, push max
}
```

#### Common Weight Formulas

**Linear (default)**
```rust
// weight = amount
WeightExpression {
    ops: [PushAmount],
    num_ops: 1,
    params: [],
}
```

**Quadratic**
```rust
// weight = sqrt(amount)
WeightExpression {
    ops: [PushAmount, Sqrt],
    num_ops: 2,
    params: [],
}
```

**Capped**
```rust
// weight = min(amount, 1000)
WeightExpression {
    ops: [PushAmount, PushConst(0), Min],
    num_ops: 3,
    params: [1000],
}
```

**ScaleCraft (sqrt × reputation)**
```rust
// weight = sqrt(amount) * reputation / 100
// reputation provided as user_data[0]
WeightExpression {
    ops: [PushAmount, Sqrt, PushUserData(0), Mul, PushConst(0), Div],
    num_ops: 6,
    params: [100],
}
```

### Resolution Type

```rust
pub enum ResolutionType {
    /// Outcome = option with most weight
    TallyBased {
        quorum: Option<u64>,      // Minimum total weight required
        threshold_bps: u16,       // Win threshold (5000 = 50%)
    },

    /// Outcome from oracle
    Oracle {
        oracle_type: OracleType,
    },

    /// Outcome set by authority
    Authority {
        resolver: Pubkey,
    },
}

pub enum OracleType {
    /// Pyth price feed
    Pyth {
        feed_id: [u8; 32],
        condition: PriceCondition,
    },

    /// Switchboard feed
    Switchboard {
        aggregator: Pubkey,
        condition: PriceCondition,
    },

    /// Custom oracle program
    Custom {
        program: Pubkey,
        feed_id: [u8; 32],
    },
}

pub enum PriceCondition {
    /// Outcome 0 if price < threshold, 1 if >=
    AboveBelow { threshold: u64 },

    /// Outcome = bucket index where price falls
    Buckets { boundaries: Vec<u64> },
}
```

---

## On-Chain State

### Ballot

```rust
pub struct Ballot {
    // Config (immutable after creation)
    pub config: BallotConfig,

    // Status
    pub status: BallotStatus,

    // Vote tracking
    pub vote_count: u64,

    // Tally (updated based on RevealMode)
    // Public: updated immediately
    // TimeLocked/PermanentPrivate: updated after decryption
    pub option_weights: [u64; MAX_OPTIONS],
    pub option_amounts: [u64; MAX_OPTIONS],
    pub total_weight: u64,
    pub total_amount: u64,

    // Pool (SpendToVote only)
    pub pool_balance: u64,
    pub total_distributed: u64,

    // Resolution
    pub outcome: Option<u8>,
    pub resolved_at: Option<i64>,

    // Encrypted data (TimeLocked/PermanentPrivate only)
    pub encrypted_tally: Option<[EncryptedValue; MAX_OPTIONS]>,

    // Merkle roots
    pub position_tree_root: [u8; 32],  // SpendToVote: positions
    pub nullifier_set: Pubkey,          // PDA for nullifier tracking

    pub bump: u8,
}

pub enum BallotStatus {
    Pending,      // Voting not started
    Active,       // Accepting votes
    Closed,       // Voting ended, awaiting resolution
    Resolved,     // Outcome set, claims open
    Finalized,    // All funds distributed
}
```

### Position (SpendToVote only)

```rust
// Position commitment (stored in merkle tree)
position_commitment = hash(
    ballot_id,
    vote_selections_hash,  // Hash of selections (supports multi-option)
    amount,
    weight,
    owner_pubkey_x,
    randomness
)

// Position data (held privately by user)
pub struct PositionData {
    pub ballot_id: [u8; 32],
    pub vote_selections: VoteSelections,
    pub amount: u64,
    pub weight: u64,
    pub owner_pubkey_x: [u8; 32],
    pub randomness: [u8; 32],
}

// Vote selections based on VoteType
pub enum VoteSelections {
    /// Single option
    Single { option: u8 },

    /// Multiple options (approval voting)
    Approval { options: Vec<u8> },

    /// Ranked options (1st, 2nd, 3rd, ...)
    Ranked { ranking: Vec<u8> },

    /// Weighted allocation across options
    Weighted { allocations: Vec<(u8, u64)> },  // [(option, weight), ...]
}
```

---

## Instructions

### Admin Instructions

#### `create_ballot`

```rust
pub fn create_ballot(
    ctx: Context<CreateBallot>,
    config: BallotConfig,
) -> Result<()>;

// Validation:
// - voting_start < voting_end
// - Duration within protocol limits
// - num_options <= max_options
// - weight_formula valid
// - Pay ballot_creation_fee
```

#### `resolve_ballot`

```rust
pub fn resolve_ballot(
    ctx: Context<ResolveBallot>,
    outcome: u8,
) -> Result<()>;

// For TallyBased: auto-computed from tally
// For Oracle: read from oracle
// For Authority: caller must be resolver
```

#### `finalize_ballot`

```rust
pub fn finalize_ballot(
    ctx: Context<FinalizeBallot>,
) -> Result<()>;

// Mark as finalized after all claims
// Remaining pool to creator/treasury
```

### Voting Instructions

#### `vote_snapshot`

Cast vote in Snapshot mode. Supports all vote types.

```rust
pub fn vote_snapshot(
    ctx: Context<VoteSnapshot>,
    // Public inputs
    nullifier: [u8; 32],
    vote_selections: VoteSelectionsInput,  // Supports all vote types
    amount: u64,
    user_data: Vec<u64>,              // For weight formula (e.g., reputation)
    user_data_signature: Option<Signature>,  // If user_data_authority set
    // Encrypted vote (for TimeLocked/PermanentPrivate)
    encrypted_vote: Option<EncryptedVote>,
    // ZK proof
    proof: Proof,
) -> Result<()>;

pub enum VoteSelectionsInput {
    Single { option: u8 },
    Approval { options: Vec<u8> },
    Ranked { ranking: Vec<u8> },
    Weighted { allocations: Vec<(u8, u64)> },
}

// Protocol:
// 1. Verify ZK proof (note ownership at snapshot)
// 2. Verify vote_selections matches ballot.vote_type
// 3. Calculate weight = evaluate_formula(amount, user_data)
// 4. Store nullifier
// 5. Update tally based on vote type:
//    - Single: option_weights[option] += weight
//    - Approval: for each option: option_weights[option] += weight
//    - Ranked: option_weights[option] += weight * points_for_rank
//    - Weighted: option_weights[option] += allocation
```

#### `vote_spend`

Cast vote in SpendToVote mode. Supports all vote types.

```rust
pub fn vote_spend(
    ctx: Context<VoteSpend>,
    // Public inputs
    note_nullifier: [u8; 32],
    position_commitment: [u8; 32],
    vote_selections: VoteSelectionsInput,
    amount: u64,
    user_data: Vec<u64>,
    user_data_signature: Option<Signature>,
    encrypted_vote: Option<EncryptedVote>,
    // ZK proof
    proof: Proof,
    // Light Protocol params
    light_params: LightTransactParams,
) -> Result<()>;

// Protocol:
// 1. Verify ZK proof (note ownership, position commitment)
// 2. Verify vote_selections matches ballot.vote_type
// 3. Calculate weight
// 4. Nullify input note
// 5. Add position to tree
// 6. Transfer tokens to pool
// 7. Update tally based on vote type
```

### Claim Instructions

#### `claim`

Claim payout after resolution (SpendToVote only).

```rust
pub fn claim(
    ctx: Context<Claim>,
    // Public inputs
    position_nullifier: [u8; 32],
    payout_commitment: [u8; 32],
    claimed_payout: u64,
    // ZK proof
    proof: Proof,
    // Light Protocol params
    light_params: LightStoreCommitmentParams,
) -> Result<()>;

// ZK proof verifies:
// - Position exists and is valid
// - Nullifier correct (no double claim)
// - Payout = (my_weight * pool) / winner_total_weight
```

### Decrypt Instructions

#### `decrypt_tally`

Decrypt tally after unlock (TimeLocked/PermanentPrivate).

```rust
pub fn decrypt_tally(
    ctx: Context<DecryptTally>,
    decrypted_weights: [u64; MAX_OPTIONS],
    decryption_proof: Proof,
) -> Result<()>;

// Anyone can call after unlock_slot
// Proof verifies correct decryption
// Updates ballot.option_weights
```

---

## ZK Circuits

### Vote Selection Hashing

For multi-option voting, selections are hashed into a single `vote_selections_hash`:

```
vote_selections_hash = hash(vote_type, selections_data)

Single:      hash(0, option)
Approval:    hash(1, sorted_options[])     // Sorted for determinism
Ranked:      hash(2, ranking[])
Weighted:    hash(3, sorted_allocations[]) // [(option, weight), ...], sorted by option
```

### `vote_snapshot.circom`

```
Public inputs:
  ballot_id[256]
  nullifier[256]
  vote_type[8]                  // 0=Single, 1=Approval, 2=Ranked, 3=Weighted
  vote_selections_hash[256]     // Hash of selections
  amount[64]
  weight[64]                    // Calculated weight
  snapshot_root[256]

  // Vote type params (from ballot config)
  max_selections[8]             // For Approval/Weighted
  num_ranks[8]                  // For Ranked
  point_system[8]               // For Ranked (0=Borda, 1=Exp, 2=Custom)
  num_options[8]                // Total options in ballot

Private inputs:
  spending_key[256]
  note_commitment[256]
  note_amount[64]
  note_randomness[256]
  note_merkle_path[DEPTH][256]
  user_data[]

  // Vote selections (one branch used based on vote_type)
  single_option[8]
  approval_options[MAX_SELECTIONS][8]
  approval_count[8]
  ranked_options[MAX_RANKS][8]
  weighted_allocations[MAX_SELECTIONS][8]   // option indices
  weighted_amounts[MAX_SELECTIONS][64]      // amounts per option

Constraints:
  // Note exists in snapshot
  verify_merkle_proof(note_commitment, snapshot_root, note_merkle_path)

  // Amount matches note
  amount == note_amount

  // Weight calculated correctly
  weight == evaluate_formula(amount, user_data, formula_params)

  // Nullifier prevents double vote
  nullifier == hash(spending_key, ballot_id, note_commitment)

  // Vote selections valid and hash matches
  if vote_type == 0: // Single
    single_option < num_options
    vote_selections_hash == hash(0, single_option)

  if vote_type == 1: // Approval
    approval_count <= max_selections
    for each option in approval_options:
      option < num_options
    vote_selections_hash == hash(1, sorted(approval_options))

  if vote_type == 2: // Ranked
    for i in 0..num_ranks:
      ranked_options[i] < num_options
      ranked_options[i] unique
    vote_selections_hash == hash(2, ranked_options)

  if vote_type == 3: // Weighted
    sum(weighted_amounts) == weight  // Total allocation == vote weight
    for each (option, amt) in weighted:
      option < num_options
    vote_selections_hash == hash(3, sorted_by_option(allocations))
```

### `vote_spend.circom`

```
Public inputs:
  ballot_id[256]
  note_nullifier[256]
  position_commitment[256]
  vote_type[8]
  vote_selections_hash[256]
  amount[64]
  weight[64]

  // Vote type params
  max_selections[8]
  num_ranks[8]
  point_system[8]
  num_options[8]

Private inputs:
  spending_key[256]
  note_data { stealth_pub_x, token_mint, amount, randomness }
  note_merkle_path[DEPTH][256]
  user_data[]
  position_randomness[256]

  // Vote selections (same as snapshot)
  single_option[8]
  approval_options[MAX_SELECTIONS][8]
  approval_count[8]
  ranked_options[MAX_RANKS][8]
  weighted_allocations[MAX_SELECTIONS][8]
  weighted_amounts[MAX_SELECTIONS][64]

Constraints:
  // Note exists and valid
  note_commitment = hash(note_data.*)
  verify_merkle_proof(note_commitment, note_merkle_root, note_merkle_path)

  // Note nullifier
  note_nullifier = hash(spending_key, note_commitment)

  // Amount matches (no inflation)
  amount == note_data.amount

  // Weight calculated correctly
  weight == evaluate_formula(amount, user_data, formula_params)

  // Vote selections valid (same as snapshot circuit)
  validate_selections(vote_type, vote_selections_hash, ...)

  // Position commitment includes selections hash
  position_commitment = hash(ballot_id, vote_selections_hash, amount, weight,
                             owner_pubkey, position_randomness)
```

### `claim.circom`

Handles payout for all vote types. Outcome semantics vary by vote type:

| Vote Type | Outcome | Winner Determination |
|-----------|---------|---------------------|
| Single | winning option | vote matches outcome |
| Approval | winning option | vote included outcome |
| Ranked | winning option | points contribute to winner |
| Weighted | winning option | allocation to outcome |

```
Public inputs:
  ballot_id[256]
  position_nullifier[256]
  payout_commitment[256]
  claimed_payout[64]

  // From ballot (on-chain)
  vote_type[8]
  outcome[8]                    // Winning option index
  total_pool[64]
  winner_total_weight[64]       // Total weight that contributed to winner

  // For ranked: points per rank
  point_system[8]
  custom_points[MAX_RANKS][64]  // If point_system == Custom

Private inputs:
  spending_key[256]
  position_data { ballot_id, vote_selections_hash, amount, weight, owner_pubkey, randomness }
  position_merkle_path[DEPTH][256]
  payout_randomness[256]

  // Vote selections (to verify contribution to winner)
  single_option[8]
  approval_options[MAX_SELECTIONS][8]
  approval_count[8]
  ranked_options[MAX_RANKS][8]
  weighted_allocations[MAX_SELECTIONS][8]
  weighted_amounts[MAX_SELECTIONS][64]

Constraints:
  // Position exists
  position_commitment = hash(position_data.*)
  verify_merkle_proof(position_commitment, position_tree_root, position_merkle_path)

  // Verify selections hash
  vote_selections_hash == compute_selections_hash(vote_type, selections...)

  // Position nullifier
  position_nullifier = hash(spending_key, ballot_id, position_commitment)

  // Calculate contribution to winner based on vote type
  if vote_type == 0: // Single
    if single_option == outcome:
      contributed_weight = position_data.weight
    else:
      contributed_weight = 0

  if vote_type == 1: // Approval
    if outcome in approval_options:
      contributed_weight = position_data.weight
    else:
      contributed_weight = 0

  if vote_type == 2: // Ranked
    rank_of_outcome = find_rank(outcome, ranked_options)
    if rank_of_outcome exists:
      // Points based on rank position
      points = get_points(rank_of_outcome, point_system, custom_points)
      contributed_weight = position_data.weight * points / max_points
    else:
      contributed_weight = 0

  if vote_type == 3: // Weighted
    allocation_to_outcome = find_allocation(outcome, weighted_allocations, weighted_amounts)
    contributed_weight = allocation_to_outcome  // Direct weight allocation

  // Payout calculation (proportional to contributed weight)
  expected_payout = (contributed_weight * total_pool) / winner_total_weight

  claimed_payout == expected_payout

  // Payout commitment valid
  payout_commitment = hash(recipient_pubkey, token_mint, claimed_payout, payout_randomness)
```

---

## Flows

### Flow 1: Governance Poll (Snapshot + Public)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE BALLOT                                            │
│    vote_binding: Snapshot { snapshot_slot }                 │
│    reveal_mode: Public                                      │
│    resolution: TallyBased { threshold: 5000 }               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VOTE                                                     │
│    Users prove note ownership at snapshot                   │
│    Weight calculated, tally updated immediately             │
│    App shows live results: [Yes: 60%, No: 40%]              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RESOLVE                                                  │
│    Auto-resolve: Yes wins (60% > 50%)                       │
│    No claim needed (Snapshot mode)                          │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: Private Governance (Snapshot + PermanentPrivate)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE BALLOT                                            │
│    vote_binding: Snapshot { snapshot_slot }                 │
│    reveal_mode: PermanentPrivate { sum_unlock_slot }        │
│    resolution: TallyBased { threshold: 5000 }               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VOTE                                                     │
│    Users submit encrypted votes                             │
│    Encrypted tally accumulates (homomorphic)                │
│    App shows: "47 votes cast" (no breakdown)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. DECRYPT (after sum_unlock_slot)                          │
│    Anyone decrypts sum: [Yes: 1500, No: 800]                │
│    Individual votes: NEVER revealed                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RESOLVE                                                  │
│    Auto-resolve: Yes wins                                   │
└─────────────────────────────────────────────────────────────┘
```

### Flow 3: Prediction Market (SpendToVote + Public)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE BALLOT                                            │
│    vote_binding: SpendToVote                                │
│    reveal_mode: Public                                      │
│    resolution: Oracle { Pyth BTC/USD }                      │
│    weight_formula: Linear (weight = amount)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. PLACE BETS                                               │
│    Alice: note(100) → position(Yes, weight=100)             │
│    Bob: note(200) → position(No, weight=200)                │
│    Carol: note(300) → position(Yes, weight=300)             │
│                                                             │
│    Pool: 600 | Yes: 400 weight | No: 200 weight             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RESOLVE                                                  │
│    Oracle: BTC > $100k → outcome = Yes                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CLAIM                                                    │
│    Alice: (100 * 600) / 400 = 150                           │
│    Carol: (300 * 600) / 400 = 450                           │
│    Bob: 0 (lost)                                            │
└─────────────────────────────────────────────────────────────┘
```

### Flow 4: ScaleCraft Dispute (Two-Layer)

```
┌─────────────────────────────────────────────────────────────┐
│ LAYER 1: JUROR BALLOT                                       │
│    vote_binding: Snapshot                                   │
│    reveal_mode: Public                                      │
│    weight_formula: sqrt(amount) * reputation                │
│    resolution: TallyBased                                   │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│ LAYER 2: BETTOR BALLOT                                      │
│    vote_binding: SpendToVote                                │
│    reveal_mode: Public                                      │
│    weight_formula: Linear                                   │
│    resolution: Authority (= ScaleCraft app)                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. JURORS VOTE                                              │
│    Juror A: 1000 tokens, 80% rep → weight = 25.3            │
│    Juror B: 500 tokens, 60% rep → weight = 13.4             │
│    Weighted tally: [ForChallenger: 25.3, ForDefender: 13.4] │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. BETTORS BET                                              │
│    Bet on juror outcome                                     │
│    Pool accumulates                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. JUROR BALLOT RESOLVES                                    │
│    ForChallenger wins (25.3 > 13.4)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. APP RESOLVES BETTOR BALLOT                               │
│    ScaleCraft reads juror outcome                           │
│    Calls resolve_ballot(bettor_ballot, ForChallenger)       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. BETTORS CLAIM                                            │
│    Winners claim proportional payout                        │
│    Jurors claim fees (separate ScaleCraft mechanism)        │
└─────────────────────────────────────────────────────────────┘
```

### Flow 5: Quadratic Funding (Weighted + SpendToVote)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE BALLOT                                            │
│    vote_type: Weighted { max_selections: 10 }               │
│    vote_binding: SpendToVote                                │
│    reveal_mode: Public                                      │
│    weight_formula: Quadratic (sqrt(amount))                 │
│    resolution: TallyBased                                   │
│    options: [Project A, Project B, Project C, ...]          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ALLOCATE VOTES                                           │
│    Alice (100 tokens, weight=10):                           │
│      allocations: [(A, 5), (B, 3), (C, 2)]                  │
│                                                             │
│    Bob (400 tokens, weight=20):                             │
│      allocations: [(A, 10), (C, 10)]                        │
│                                                             │
│    Carol (25 tokens, weight=5):                             │
│      allocations: [(B, 5)]                                  │
│                                                             │
│    Tally: A=15, B=8, C=12                                   │
│    Pool: 525 tokens                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RESOLVE                                                  │
│    outcome = A (highest tally: 15)                          │
│    winner_total_weight = 15 (total allocated to A)          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CLAIM                                                    │
│    Alice contributed 5 to A:                                │
│      payout = (5 * 525) / 15 = 175                          │
│                                                             │
│    Bob contributed 10 to A:                                 │
│      payout = (10 * 525) / 15 = 350                         │
│                                                             │
│    Carol: 0 (didn't allocate to A)                          │
└─────────────────────────────────────────────────────────────┘
```

### Flow 6: Ranked Choice Election (Ranked + Snapshot)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE BALLOT                                            │
│    vote_type: Ranked { num_ranks: 3, Borda }                │
│    vote_binding: Snapshot                                   │
│    reveal_mode: PermanentPrivate                            │
│    resolution: TallyBased                                   │
│    options: [Candidate A, Candidate B, Candidate C, D]      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. RANK CANDIDATES                                          │
│    Borda points: 1st=3, 2nd=2, 3rd=1                        │
│                                                             │
│    Voter 1 (weight 100): [A, B, C]                          │
│      A: +300, B: +200, C: +100                              │
│                                                             │
│    Voter 2 (weight 50): [B, C, A]                           │
│      B: +150, C: +100, A: +50                               │
│                                                             │
│    Voter 3 (weight 75): [C, A, B]                           │
│      C: +225, A: +150, B: +75                               │
│                                                             │
│    Encrypted tally accumulates...                           │
│    App shows: "3 votes cast"                                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. DECRYPT & RESOLVE                                        │
│    Final tally: A=500, B=425, C=425, D=0                    │
│    Individual rankings: NEVER revealed                      │
│    outcome = A (highest points)                             │
└─────────────────────────────────────────────────────────────┘
```

### Flow 7: Multi-Project Approval (Approval + SpendToVote)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE BALLOT                                            │
│    vote_type: Approval { max_selections: 3 }                │
│    vote_binding: SpendToVote                                │
│    reveal_mode: Public                                      │
│    resolution: TallyBased                                   │
│    options: [Grant A, Grant B, Grant C, Grant D, Grant E]   │
│    (Top 2 get funded)                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. APPROVE PROJECTS                                         │
│    Alice (weight 100): approves [A, B, D]                   │
│      A: +100, B: +100, D: +100                              │
│                                                             │
│    Bob (weight 50): approves [B, C]                         │
│      B: +50, C: +50                                         │
│                                                             │
│    Carol (weight 75): approves [A, C, E]                    │
│      A: +75, C: +75, E: +75                                 │
│                                                             │
│    Tally: A=175, B=150, C=125, D=100, E=75                  │
│    Pool: 225 tokens                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RESOLVE (Top 2)                                          │
│    App logic: Winners = [A, B]                              │
│    Protocol outcome = A (primary winner)                    │
│    App handles B payout separately (second ballot or       │
│    custom logic)                                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CLAIM                                                    │
│    Alice approved A: payout = (100 * 225) / 175 = 128.5     │
│    Carol approved A: payout = (75 * 225) / 175 = 96.4       │
│    Bob: 0 (didn't approve A)                                │
└─────────────────────────────────────────────────────────────┘
```

---

## Privacy Summary

### Voter Identity

**Always hidden.** Nullifiers are unlinkable to spending keys.

### Vote Content

| Reveal Mode | During Voting | After Unlock | Forever |
|-------------|---------------|--------------|---------|
| Public | Visible | Visible | Visible |
| TimeLocked | Hidden | Visible | Visible |
| PermanentPrivate | Hidden | Sum only | Sum only |

### What App Can Display

| Data | Public | TimeLocked | PermanentPrivate |
|------|--------|------------|------------------|
| Vote count | ✓ | ✓ | ✓ |
| Live tally | ✓ | ✗ | ✗ |
| Final tally | ✓ | ✓ (after) | ✓ (after) |
| Individual votes | ✓ | ✓ (after) | ✗ Never |

---

## Security Considerations

### Double Voting Prevention

| Mode | Nullifier | Prevents |
|------|-----------|----------|
| Snapshot | `hash(spending_key, ballot_id, note_commitment)` | Same note voting twice |
| SpendToVote | `hash(spending_key, note_commitment)` | Note already spent |

### Weight Inflation Attack

```
Attack: Claim more voting power than owned
Defense: ZK circuit verifies weight = formula(amount, user_data)
         Amount verified against note commitment
```

### Payout Manipulation

```
Attack: Claim incorrect payout
Defense: ZK circuit calculates: payout = (weight * pool) / winner_weight
         All inputs from on-chain state
```

### User Data Manipulation

```
Attack: Fake reputation/user_data for higher weight
Defense: user_data_authority signs user_data
         ZK circuit verifies signature (or app attests)
```

### Front-Running (Snapshot)

```
Attack: See votes, acquire tokens, vote
Defense: Snapshot at fixed past slot, can't acquire retroactively
```

---

## Integration with CloakCraft

### Shared Infrastructure

| Component | Reused |
|-----------|--------|
| Note commitments | Existing structure |
| Light Protocol | Merkle trees, compressed accounts |
| ZK proving | Circom + Groth16 |
| Poseidon hash | Existing implementation |

### New Components

| Component | Purpose |
|-----------|---------|
| Ballot state | Configuration and tally |
| Position commitments | SpendToVote positions |
| Vote circuits | Snapshot and spend proofs |
| Claim circuit | Payout verification |
| Weight evaluator | In-circuit formula evaluation |
| Time-lock encryption | Vote privacy |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1.0 | 2026-01-20 | Initial specification |
| 0.2.0 | 2026-01-20 | Simplified: removed TallyMode, added RevealMode, weight formula at ballot level, proportional-only distribution, no threshold committees |
| 0.3.0 | 2026-01-20 | Multi-option voting: added VoteType (Single, Approval, Ranked, Weighted), updated ZK circuits for vote_selections_hash, added PointSystem for ranked voting |
