/**
 * Voting Types
 *
 * Type definitions for the voting protocol
 */

import { PublicKey } from '@solana/web3.js';

// ============ Enums (matching on-chain) ============

export enum VoteBindingMode {
  Snapshot = 0,
  SpendToVote = 1,
}

export enum RevealMode {
  Public = 0,
  TimeLocked = 1,
  PermanentPrivate = 2,
}

export enum VoteType {
  Single = 0,
  Approval = 1,
  Ranked = 2,
  Weighted = 3,
}

export enum ResolutionMode {
  TallyBased = 0,
  Oracle = 1,
  Authority = 2,
}

export enum BallotStatus {
  Pending = 0,
  Active = 1,
  Closed = 2,
  Resolved = 3,
  Finalized = 4,
}

// ============ Ballot Types ============

export interface BallotConfig {
  ballotId: Uint8Array;
  authority: PublicKey;
  tokenMint: PublicKey;

  bindingMode: VoteBindingMode;
  revealMode: RevealMode;
  voteType: VoteType;
  resolutionMode: ResolutionMode;

  numOptions: number;
  quorumThreshold: bigint;
  protocolFeeBps: number;
  protocolTreasury: PublicKey;

  startTime: number;
  endTime: number;
  snapshotSlot?: number;          // For Snapshot mode
  indexerPubkey?: PublicKey;      // For Snapshot mode

  eligibilityRoot?: Uint8Array;   // Merkle root of eligible addresses
  timeLockPubkey?: Uint8Array;    // For encrypted modes
  unlockSlot?: number;            // For TimeLocked mode
  claimDeadline?: number;         // For SpendToVote mode

  resolver?: PublicKey;           // For Authority mode
  oracle?: PublicKey;             // For Oracle mode

  weightFormula?: WeightOp[];
  weightParams?: bigint[];
}

export enum WeightOp {
  PushAmount = 0,
  PushConst = 1,
  PushUserData = 2,
  Add = 3,
  Sub = 4,
  Mul = 5,
  Div = 6,
  Sqrt = 7,
  Min = 8,
  Max = 9,
}

export interface Ballot {
  ballotId: Uint8Array;
  authority: PublicKey;
  tokenMint: PublicKey;
  tokenPool: PublicKey;

  bindingMode: VoteBindingMode;
  revealMode: RevealMode;
  voteType: VoteType;
  resolutionMode: ResolutionMode;
  status: BallotStatus;

  numOptions: number;
  quorumThreshold: bigint;
  protocolFeeBps: number;
  protocolTreasury: PublicKey;

  startTime: number;
  endTime: number;
  snapshotSlot: number;
  indexerPubkey: PublicKey;

  hasEligibilityRoot: boolean;
  eligibilityRoot: Uint8Array;
  timeLockPubkey: Uint8Array;
  unlockSlot: number;

  // Tally
  optionWeights: bigint[];
  optionAmounts: bigint[];
  totalWeight: bigint;
  totalAmount: bigint;
  voteCount: bigint;

  // Pool (SpendToVote)
  poolBalance: bigint;
  totalDistributed: bigint;
  feesCollected: bigint;

  // Encrypted tally
  encryptedTally: Uint8Array[];

  // Resolution
  hasOutcome: boolean;
  outcome: number;
  winnerWeight: bigint;
  resolver?: PublicKey;
  oracle?: PublicKey;
  claimDeadline: number;
}

// ============ Vote Types ============

export interface VoteSnapshotParams {
  ballotId: Uint8Array;
  noteCommitment: Uint8Array;         // The shielded note being used for voting
  noteAmount: bigint;                 // Amount in the note
  noteRandomness: Uint8Array;         // Note randomness
  stealthPubX: Uint8Array;            // User's stealth pubkey (x-coordinate)
  stealthSpendingKey: Uint8Array;     // Spending key (proves ownership)
  voteChoice: number;
  snapshotMerkleRoot: Uint8Array;     // Merkle root at snapshot slot
  merklePath: Uint8Array[];           // Merkle proof path (32 levels)
  merklePathIndices: number[];        // Merkle proof indices (32 levels)
  eligibilityProof?: MerkleProof;
}

export interface VoteSpendParams {
  ballotId: Uint8Array;
  noteCommitment: Uint8Array;
  noteAmount: bigint;
  noteRandomness: Uint8Array;
  stealthSpendingKey: Uint8Array;
  voteChoice: number;
  merklePath: Uint8Array[];
  merklePathIndices: number[];
  leafIndex: number;
  eligibilityProof?: MerkleProof;
}

export interface ChangeVoteSnapshotParams {
  ballotId: Uint8Array;
  oldVoteCommitment: Uint8Array;
  oldVoteChoice: number;
  oldRandomness: Uint8Array;
  newVoteChoice: number;
  stealthSpendingKey: Uint8Array;
}

export interface ClosePositionParams {
  ballotId: Uint8Array;
  positionCommitment: Uint8Array;
  voteChoice: number;
  amount: bigint;
  weight: bigint;
  positionRandomness: Uint8Array;
  stealthSpendingKey: Uint8Array;
}

export interface ClaimParams {
  ballotId: Uint8Array;
  positionCommitment: Uint8Array;
  voteChoice: number;
  amount: bigint;
  weight: bigint;
  positionRandomness: Uint8Array;
  stealthSpendingKey: Uint8Array;
}

// ============ Position Types ============

export interface Position {
  ballotId: Uint8Array;
  commitment: Uint8Array;
  pubkey: PublicKey;
  voteChoice: number;
  amount: bigint;
  weight: bigint;
  randomness: Uint8Array;
  isNullified: boolean;
}

export interface VoteStatus {
  hasVoted: boolean;
  voteNullifier?: Uint8Array;
  voteCommitment?: Uint8Array;
  voteChoice?: number;
  weight?: bigint;
}

// ============ Attestation Types ============

export interface BalanceAttestation {
  pubkey: string;
  ballotId: string;
  tokenMint: string;
  totalAmount: string;
  snapshotSlot: number;
  signature: string;
  indexerPubkey: string;
}

export interface MerkleProof {
  pubkey: string;
  isEligible: boolean;
  merkleProof: string[];
  pathIndices: number[];
  leafIndex: number;
}

// ============ Encrypted Contributions ============

export interface EncryptedContributions {
  ciphertexts: Uint8Array[];  // ElGamal ciphertexts (64 bytes each)
}

// ============ Preimage Types ============

export interface VotePreimage {
  ballotId: Uint8Array;
  commitment: Uint8Array;
  encryptedData: Uint8Array;
  encryptionType: number;     // 0 = user_key, 1 = timelock_key
  bindingMode: VoteBindingMode;
}

export interface DecryptedVotePreimage {
  voteChoice: number;
  weight: bigint;
  randomness: Uint8Array;
  ballotId: Uint8Array;
  amount?: bigint;            // For SpendToVote
}

// ============ Proof Inputs ============

export interface VoteSnapshotProofInputs {
  // Public inputs (must match circuit order)
  ballot_id: bigint;
  snapshot_merkle_root: bigint;       // Merkle root at snapshot slot
  note_commitment: bigint;            // The shielded note being used
  vote_nullifier: bigint;
  vote_commitment: bigint;
  amount: bigint;                     // Note amount (voting weight base)
  weight: bigint;                     // Calculated voting weight
  token_mint: bigint;
  eligibility_root: bigint;
  has_eligibility: bigint;
  vote_choice: bigint;                // For public mode, actual choice; for encrypted, 0
  is_public_mode: bigint;

  // Private inputs
  in_stealth_pub_x: bigint;           // User's stealth pubkey in note
  in_randomness: bigint;              // Note randomness
  in_stealth_spending_key: bigint;    // Spending key (proves ownership)
  merkle_path: bigint[];              // 32 levels
  merkle_path_indices: bigint[];      // 32 levels
  vote_randomness: bigint;            // Vote commitment randomness
  eligibility_path: bigint[];         // 20 levels
  eligibility_path_indices: bigint[]; // 20 levels
  private_vote_choice: bigint;        // For encrypted modes
}

export interface ClaimProofInputs {
  // Public inputs
  ballotId: bigint;
  positionCommitment: bigint;
  positionNullifier: bigint;
  payoutCommitment: bigint;
  grossPayout: bigint;
  netPayout: bigint;
  voteType: bigint;
  userWeight: bigint;
  outcome: bigint;
  totalPool: bigint;
  winnerWeight: bigint;
  protocolFeeBps: bigint;
  tokenMint: bigint;
  userVoteChoice: bigint;
  isPrivateMode: bigint;

  // Private inputs
  spendingKey: bigint;
  pubkey: bigint;
  positionAmount: bigint;
  positionRandomness: bigint;
  privateVoteChoice: bigint;
  payoutRandomness: bigint;
}
