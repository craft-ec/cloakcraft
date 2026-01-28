/**
 * CloakCraft Type Definitions
 *
 * Core types for the privacy protocol
 */

import { PublicKey, TransactionInstruction, Keypair as SolanaKeypair } from '@solana/web3.js';

// =============================================================================
// Cryptographic Types
// =============================================================================

/** 32-byte scalar field element */
export type FieldElement = Uint8Array;

/** BabyJubJub point (compressed) */
export interface Point {
  x: FieldElement;
  y: FieldElement;
}

/** Poseidon hash output */
export type PoseidonHash = FieldElement;

/** Note commitment (32 bytes) */
export type Commitment = FieldElement;

/** Nullifier (32 bytes) */
export type Nullifier = FieldElement;

/** Merkle root (32 bytes) */
export type MerkleRoot = FieldElement;

/** Merkle proof path */
export interface MerkleProof {
  root: MerkleRoot;
  pathElements: FieldElement[];
  pathIndices: number[];
  leafIndex: number;
}

// =============================================================================
// Note Types
// =============================================================================

/** Unencrypted note data */
export interface Note {
  /** Stealth public key x-coordinate */
  stealthPubX: FieldElement;
  /** Token mint */
  tokenMint: PublicKey;
  /** Amount in lamports */
  amount: bigint;
  /** Randomness for commitment */
  randomness: FieldElement;
}

/** Encrypted note (ECIES encrypted) */
export interface EncryptedNote {
  /** Ephemeral public key for ECDH */
  ephemeralPubkey: Point;
  /** Encrypted payload */
  ciphertext: Uint8Array;
  /** Authentication tag */
  tag: Uint8Array;
}

/** Decrypted note with additional metadata for spending */
export interface DecryptedNote extends Note {
  /** Note commitment */
  commitment: Commitment;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Pool the note belongs to */
  pool: PublicKey;
  /** Compressed account hash (for merkle proof fetching) */
  accountHash?: string;
  /** Stealth ephemeral pubkey (needed to derive stealth private key for spending) */
  stealthEphemeralPubkey?: Point;
}

/** Position note data for perps positions */
export interface PositionNoteData {
  /** Stealth public key x-coordinate */
  stealthPubX: FieldElement;
  /** Market ID (32 bytes, field-reduced) */
  marketId: Uint8Array;
  /** Is long position */
  isLong: boolean;
  /** Margin amount */
  margin: bigint;
  /** Position size */
  size: bigint;
  /** Leverage (1-255) */
  leverage: number;
  /** Entry price */
  entryPrice: bigint;
  /** Randomness for commitment */
  randomness: FieldElement;
}

/** Decrypted position note with metadata for closing */
export interface DecryptedPositionNote extends PositionNoteData {
  /** Position commitment */
  commitment: Commitment;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Position pool the note belongs to */
  pool: PublicKey;
  /** Compressed account hash (for merkle proof fetching) */
  accountHash?: string;
  /** Stealth ephemeral pubkey (needed to derive stealth private key for spending) */
  stealthEphemeralPubkey?: Point;
}

/** LP note data for perps liquidity positions */
export interface LpNoteData {
  /** Stealth public key x-coordinate */
  stealthPubX: FieldElement;
  /** Pool ID (32 bytes) */
  poolId: Uint8Array;
  /** LP token amount */
  lpAmount: bigint;
  /** Randomness for commitment */
  randomness: FieldElement;
}

/** Decrypted LP note with metadata for removing liquidity */
export interface DecryptedLpNote extends LpNoteData {
  /** LP commitment */
  commitment: Commitment;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** LP pool the note belongs to */
  pool: PublicKey;
  /** Compressed account hash (for merkle proof fetching) */
  accountHash?: string;
  /** Stealth ephemeral pubkey (needed to derive stealth private key for spending) */
  stealthEphemeralPubkey?: Point;
}

// =============================================================================
// Key Types
// =============================================================================

/** Spending key (master secret) */
export interface SpendingKey {
  sk: FieldElement;
}

/** Viewing key (derived from spending key) */
export interface ViewingKey {
  /** Nullifier key */
  nk: FieldElement;
  /** Incoming viewing key */
  ivk: FieldElement;
}

/** Full keypair */
export interface Keypair {
  spending: SpendingKey;
  viewing: ViewingKey;
  /** Public key on BabyJubJub */
  publicKey: Point;
}

/** Stealth address (one-time address) */
export interface StealthAddress {
  /** Stealth public key */
  stealthPubkey: Point;
  /** Ephemeral public key */
  ephemeralPubkey: Point;
}

// =============================================================================
// Proof Types
// =============================================================================

/** Groth16 proof */
export interface Groth16Proof {
  /** G1 point A */
  a: Uint8Array;
  /** G2 point B */
  b: Uint8Array;
  /** G1 point C */
  c: Uint8Array;
}

/** Transfer proof inputs */
export interface TransferProofInputs {
  /** Input note */
  inputNote: Note;
  /** Nullifier key */
  nk: FieldElement;
  /** Merkle proof */
  merkleProof: MerkleProof;
  /** Output notes */
  outputNotes: Note[];
  /** Unshield amount (0 if no unshield) */
  unshieldAmount: bigint;
  /** Unshield recipient */
  unshieldRecipient?: PublicKey;
}

/** Adapter proof inputs */
export interface AdapterProofInputs {
  /** Input note */
  inputNote: Note;
  /** Nullifier key */
  nk: FieldElement;
  /** Merkle proof */
  merkleProof: MerkleProof;
  /** Input amount (public) */
  inputAmount: bigint;
  /** Output token mint */
  outputTokenMint: PublicKey;
  /** Minimum output amount */
  minOutput: bigint;
  /** Adapter program */
  adapterProgram: PublicKey;
  /** Output note */
  outputNote: Note;
}

/** Vote proof inputs */
export interface VoteProofInputs {
  /** Token note (for voting power) */
  tokenNote: Note;
  /** Nullifier key */
  nk: FieldElement;
  /** Merkle proof */
  merkleProof: MerkleProof;
  /** Action domain (proposal-specific) */
  actionDomain: FieldElement;
  /** Vote choices (encrypted) */
  voteChoices: bigint[];
  /** Threshold public key */
  thresholdPubkey: Point;
}

/** Vote parameters for proof generation */
export interface VoteParams {
  /** Input note with Y-coordinate */
  input: PreparedInput;
  /** Merkle root */
  merkleRoot: MerkleRoot;
  /** Merkle proof path */
  merklePath: FieldElement[];
  /** Merkle proof indices */
  merkleIndices: number[];
  /** Proposal/aggregation ID */
  proposalId: FieldElement;
  /** Vote choice (0, 1, 2 for yes/no/abstain) */
  voteChoice: number;
  /** Election public key */
  electionPubkey: Point;
  /** Encryption randomness for each option */
  encryptionRandomness: {
    yes: FieldElement;
    no: FieldElement;
    abstain: FieldElement;
  };
}

// =============================================================================
// Transaction Types
// =============================================================================

/** Shield transaction parameters */
export interface ShieldParams {
  /** Pool (token mint) to shield into */
  pool: PublicKey;
  /** Amount to shield */
  amount: bigint;
  /** Recipient stealth address (stealthPubkey for encryption, ephemeralPubkey stored on-chain) */
  recipient: StealthAddress;
  /** User's token account (source of funds) */
  userTokenAccount?: PublicKey;
}

/** Prepared input for proving */
export interface PreparedInput extends DecryptedNote {}

/** Transfer output (prepared for proving) */
export interface TransferOutput {
  /** Recipient stealth address */
  recipient: StealthAddress;
  /** Amount to transfer */
  amount: bigint;
  /** Output commitment */
  commitment: Commitment;
  /** Stealth public key X-coordinate */
  stealthPubX: FieldElement;
  /** Randomness for commitment */
  randomness: FieldElement;
}

/** Progress stages for transfer operation */
export type TransferProgressStage =
  | 'preparing'     // Preparing inputs/outputs
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming';   // Waiting for confirmation

/** Transfer transaction parameters */
export interface TransferParams {
  /** Input notes with derived Y-coordinate */
  inputs: PreparedInput[];
  /** Merkle root (must be valid for all inputs) */
  merkleRoot: MerkleRoot;
  /** Merkle proof path elements */
  merklePath: FieldElement[];
  /** Merkle proof path indices */
  merkleIndices: number[];
  /** Output recipients and amounts (prepared) */
  outputs: TransferOutput[];
  /** Optional unshield */
  unshield?: {
    amount: bigint;
    recipient: PublicKey;
  };
  /** Protocol fee amount (required for proof generation) */
  fee?: bigint;
  /** Optional progress callback for UI updates */
  onProgress?: (stage: TransferProgressStage) => void;
}

// =============================================================================
// AMM Swap Types
// =============================================================================

/** AMM Swap parameters */
export interface AmmSwapParams {
  /** Input note to spend */
  input: PreparedInput;
  /** AMM pool ID */
  poolId: PublicKey;
  /** Swap direction */
  swapDirection: 'aToB' | 'bToA';
  /** Amount to swap */
  swapAmount: bigint;
  /** Actual output amount from AMM calculation */
  outputAmount: bigint;
  /** Minimum output amount (slippage protection) */
  minOutput: bigint;
  /** Output token mint (different from input token for swaps) */
  outputTokenMint: PublicKey;
  /** Recipient for swap output */
  outputRecipient: StealthAddress;
  /** Recipient for change (input - swap amount) */
  changeRecipient: StealthAddress;
  /** Fee in basis points */
  feeBps?: number;
  /** Merkle root for input note */
  merkleRoot: Uint8Array;
  /** Merkle path elements (siblings) */
  merklePath: Uint8Array[];
  /** Merkle path indices (0=left, 1=right) */
  merkleIndices: number[];
  /** Optional progress callback */
  onProgress?: (stage: TransferProgressStage) => void;
}

/** Add liquidity parameters */
export interface AddLiquidityParams {
  /** Token A input note */
  inputA: PreparedInput;
  /** Token B input note */
  inputB: PreparedInput;
  /** AMM pool ID */
  poolId: PublicKey;
  /** LP token mint */
  lpMint: PublicKey;
  /** Amount of token A to deposit */
  depositA: bigint;
  /** Amount of token B to deposit */
  depositB: bigint;
  /** Actual LP tokens to receive (calculated from pool state) */
  lpAmount: bigint;
  /** Minimum LP tokens acceptable (slippage protection) */
  minLpAmount: bigint;
  /** Recipient for LP tokens */
  lpRecipient: StealthAddress;
  /** Recipient for token A change */
  changeARecipient: StealthAddress;
  /** Recipient for token B change */
  changeBRecipient: StealthAddress;
  /** Optional progress callback */
  onProgress?: (stage: TransferProgressStage) => void;
}

/** Remove liquidity parameters */
export interface RemoveLiquidityParams {
  /** LP token input note */
  lpInput: PreparedInput;
  /** AMM pool ID */
  poolId: PublicKey;
  /** Amount of LP tokens to burn */
  lpAmount: bigint;
  /** Token A mint */
  tokenAMint: PublicKey;
  /** Token B mint */
  tokenBMint: PublicKey;
  /** Old pool state hash (before removal) */
  oldPoolStateHash: Uint8Array;
  /** New pool state hash (after removal) */
  newPoolStateHash: Uint8Array;
  /** Recipient for token A output */
  outputARecipient: StealthAddress;
  /** Recipient for token B output */
  outputBRecipient: StealthAddress;
  /** Merkle proof for LP token input */
  merklePath: Uint8Array[];
  /** Merkle proof indices */
  merklePathIndices: number[];
  /** Expected Token A output amount */
  outputAAmount: bigint;
  /** Expected Token B output amount */
  outputBAmount: bigint;
  /** Optional progress callback */
  onProgress?: (stage: TransferProgressStage) => void;
}

// =============================================================================
// Consolidation Types
// =============================================================================

/** Consolidation parameters for merging multiple notes into one */
export interface ConsolidationParams {
  /** Input notes to consolidate (1-3 notes) */
  inputs: PreparedInput[];
  /** Merkle root (for Light Protocol verification) */
  merkleRoot: MerkleRoot;
  /** Token mint (all inputs must have same mint) */
  tokenMint: PublicKey;
  /** Output stealth address (to self) */
  outputRecipient: StealthAddress;
  /** Pre-computed output commitment */
  outputCommitment?: Commitment;
  /** Output randomness (generated if not provided) */
  outputRandomness?: Uint8Array;
}

// =============================================================================
// Adapter Types
// =============================================================================

/** Adapter swap parameters */
export interface AdapterSwapParams {
  /** Input note with derived Y-coordinate */
  input: PreparedInput;
  /** Merkle root */
  merkleRoot: MerkleRoot;
  /** Merkle proof path */
  merklePath: FieldElement[];
  /** Merkle proof indices */
  merkleIndices: number[];
  /** Output token mint */
  outputMint: PublicKey;
  /** Minimum output amount */
  minOutput: bigint;
  /** Adapter program */
  adapter: PublicKey;
  /** Adapter-specific params */
  adapterParams: Uint8Array;
  /** Output commitment */
  outputCommitment: Commitment;
  /** Change commitment (if any) */
  changeCommitment: Commitment;
  /** Output recipient stealth public key X */
  outputStealthPubX: FieldElement;
  /** Output randomness */
  outputRandomness: FieldElement;
}

/** Market order parameters */
export interface OrderParams {
  /** Input note with derived Y-coordinate */
  input: PreparedInput;
  /** Merkle root */
  merkleRoot: MerkleRoot;
  /** Merkle proof path */
  merklePath: FieldElement[];
  /** Merkle proof indices */
  merkleIndices: number[];
  /** Nullifier */
  nullifier: Nullifier;
  /** Order ID */
  orderId: FieldElement;
  /** Escrow commitment */
  escrowCommitment: Commitment;
  /** Terms hash */
  termsHash: FieldElement;
  /** Escrow stealth public key X */
  escrowStealthPubX: FieldElement;
  /** Escrow randomness */
  escrowRandomness: FieldElement;
  /** Maker's receiving stealth public key X */
  makerReceiveStealthPubX: FieldElement;
  /** Offer terms */
  terms: OrderTerms;
  /** Expiry timestamp */
  expiry: number;
}

/** Order terms */
export interface OrderTerms {
  /** Offered token mint */
  offerMint: PublicKey;
  /** Offered amount */
  offerAmount: bigint;
  /** Requested token mint */
  requestMint: PublicKey;
  /** Requested amount */
  requestAmount: bigint;
}

/** Fill order parameters */
export interface FillOrderParams {
  /** Order ID to fill */
  orderId: FieldElement;
  /** Order state (fetched from chain) */
  order: OrderState;
  /** Taker's input note (payment) */
  takerInput: PreparedInput;
  /** Recipient for taker's output (receives offer tokens) */
  takerReceiveRecipient: StealthAddress;
  /** Recipient for taker's change */
  takerChangeRecipient: StealthAddress;
  /** Current timestamp for expiry check */
  currentTimestamp: number;
}

/** Cancel order parameters */
export interface CancelOrderParams {
  /** Order ID to cancel */
  orderId: FieldElement;
  /** Order state (fetched from chain) */
  order: OrderState;
  /** Recipient for refunded escrow */
  refundRecipient: StealthAddress;
  /** Current timestamp */
  currentTimestamp: number;
}

// =============================================================================
// ElGamal Types (for Voting)
// =============================================================================

/** ElGamal ciphertext */
export interface ElGamalCiphertext {
  /** First component C1 = r*G */
  c1: Point;
  /** Second component C2 = m*G + r*P */
  c2: Point;
}

/** Encrypted vote (one per option) */
export interface EncryptedVote {
  /** Encrypted voting power for this option */
  ciphertext: ElGamalCiphertext;
}

/** Decryption share from committee member */
export interface DecryptionShare {
  /** Committee member index */
  memberIndex: number;
  /** Partial decryption shares (one per option) */
  shares: Point[];
  /** DLEQ proofs of correctness */
  dleqProofs: Uint8Array[];
}

/** Create aggregation parameters */
export interface CreateAggregationParams {
  /** Unique aggregation ID */
  id: FieldElement;
  /** Token mint for voting power */
  tokenMint: PublicKey;
  /** Election/threshold public key */
  thresholdPubkey: Point;
  /** Required threshold for decryption (t of n) */
  threshold: number;
  /** Number of voting options */
  numOptions: number;
  /** Voting deadline (unix timestamp) */
  deadline: number;
  /** Action domain for nullifier derivation */
  actionDomain: FieldElement;
}

/** Submit vote parameters */
export interface SubmitVoteParams {
  /** Aggregation ID */
  aggregationId: FieldElement;
  /** Input note (for voting power) */
  input: PreparedInput;
  /** Vote choice (0=Yes, 1=No, 2=Abstain) */
  voteChoice: 0 | 1 | 2;
  /** Election public key for encryption */
  electionPubkey: Point;
}

/** Submit decryption share parameters */
export interface SubmitDecryptionShareParams {
  /** Aggregation ID */
  aggregationId: FieldElement;
  /** Decryption shares (one per option) */
  shares: FieldElement[];
  /** DLEQ proofs for each share */
  dleqProofs: Uint8Array[];
}

/** Finalize voting parameters */
export interface FinalizeVotingParams {
  /** Aggregation ID */
  aggregationId: FieldElement;
  /** Final decrypted totals */
  totals: bigint[];
}

// =============================================================================
// Account Types
// =============================================================================

/** Pool account state */
export interface PoolState {
  /** Token mint for this pool */
  tokenMint: PublicKey;
  /** Token vault PDA */
  tokenVault: PublicKey;
  /** Total shielded balance */
  totalShielded: bigint;
  /** Pool authority */
  authority: PublicKey;
  /** PDA bump */
  bump: number;
  /** Vault PDA bump */
  vaultBump: number;
  /** Commitment counter (number of commitments in this pool) */
  commitmentCounter?: bigint;
}

/** Pool type determining which AMM formula to use */
export enum PoolType {
  /** Constant product formula: x * y = k (Uniswap V2 style) */
  ConstantProduct = 0,
  /** StableSwap formula (Curve style) for pegged assets */
  StableSwap = 1,
}

/** AMM pool state */
export interface AmmPoolState {
  /** Pool ID */
  poolId: PublicKey;
  /** Token A mint */
  tokenAMint: PublicKey;
  /** Token B mint */
  tokenBMint: PublicKey;
  /** LP token mint */
  lpMint: PublicKey;
  /** Current state hash (commitments) */
  stateHash: Uint8Array;
  /** Reserve of token A */
  reserveA: bigint;
  /** Reserve of token B */
  reserveB: bigint;
  /** Total LP token supply */
  lpSupply: bigint;
  /** Fee in basis points */
  feeBps: number;
  /** Authority */
  authority: PublicKey;
  /** Is active */
  isActive: boolean;
  /** PDA bump */
  bump: number;
  /** LP mint bump */
  lpMintBump: number;
  /** Pool type (ConstantProduct or StableSwap) */
  poolType: PoolType;
  /** Amplification coefficient for StableSwap pools (0 for ConstantProduct) */
  amplification: bigint;
}

/** Order account state */
export interface OrderState {
  /** Order ID */
  orderId: FieldElement;
  /** Escrow commitment */
  escrowCommitment: Commitment;
  /** Terms hash */
  termsHash: FieldElement;
  /** Encrypted escrow note */
  encryptedEscrow: Uint8Array;
  /** Expiry timestamp */
  expiry: number;
  /** Status (0=Open, 1=Filled, 2=Cancelled) */
  status: OrderStatus;
  /** Created at timestamp */
  createdAt: number;
  /** PDA bump */
  bump: number;
}

export enum OrderStatus {
  Open = 0,
  Filled = 1,
  Cancelled = 2,
}

/** Vote aggregation state */
export interface AggregationState {
  /** Aggregation ID */
  id: FieldElement;
  /** Token mint for voting power */
  tokenMint: PublicKey;
  /** Threshold public key */
  thresholdPubkey: FieldElement;
  /** Required threshold for decryption */
  threshold: number;
  /** Number of voting options */
  numOptions: number;
  /** Deadline timestamp */
  deadline: number;
  /** Action domain for nullifier derivation */
  actionDomain: FieldElement;
  /** Encrypted tallies (homomorphically aggregated) */
  encryptedTallies: ElGamalCiphertext[];
  /** Decryption shares received */
  decryptionShares: DecryptionShare[];
  /** Final decrypted totals (after threshold decryption) */
  decryptedTotals?: bigint[];
  /** Status */
  status: AggregationStatus;
  /** Authority */
  authority: PublicKey;
  /** PDA bump */
  bump: number;
}

export enum AggregationStatus {
  Active = 0,
  Decrypting = 1,
  Finalized = 2,
}

// =============================================================================
// Event Types
// =============================================================================

/** Note created event */
export interface NoteCreatedEvent {
  pool: PublicKey;
  commitment: Commitment;
  leafIndex: number;
  encryptedNote: Uint8Array;
  timestamp: number;
}

/** Note spent event */
export interface NoteSpentEvent {
  pool: PublicKey;
  nullifier: Nullifier;
  timestamp: number;
}

/** Order created event */
export interface OrderCreatedEvent {
  orderId: FieldElement;
  escrowCommitment: Commitment;
  termsHash: FieldElement;
  expiry: number;
  timestamp: number;
}

/** Order filled event */
export interface OrderFilledEvent {
  orderId: FieldElement;
  timestamp: number;
}

/** Vote submitted event */
export interface VoteSubmittedEvent {
  aggregationId: FieldElement;
  actionNullifier: Nullifier;
  timestamp: number;
}

// =============================================================================
// Utility Types
// =============================================================================

/** Transaction result */
export interface TransactionResult {
  signature: string;
  slot: number;
  confirmations?: number;
}

/** Sync status */
export interface SyncStatus {
  latestSlot: number;
  indexedSlot: number;
  isSynced: boolean;
}

// =============================================================================
// Perpetual Futures Types
// =============================================================================

/** Progress stages for perps operations */
export type PerpsProgressStage =
  | 'preparing'
  | 'generating'
  | 'building'
  | 'approving'
  | 'executing'
  | 'confirming';

/** Open position parameters for client */
export interface OpenPerpsPositionParams {
  /** Input margin note */
  input: DecryptedNote;
  /** Perps pool address */
  poolId: PublicKey;
  /** Market ID */
  marketId: Uint8Array;
  /** Position direction */
  direction: 'long' | 'short';
  /** Margin amount */
  marginAmount: bigint;
  /** Leverage (1-100) */
  leverage: number;
  /** Current oracle price (if not provided, will be fetched from Pyth) */
  oraclePrice?: bigint;
  /** Pyth price update account (if not provided, will be auto-posted and closed) */
  priceUpdate?: PublicKey;
  /** Pyth feed ID for auto-fetching price (default: BTC/USD) */
  pythFeedId?: Uint8Array;
  /** Pyth post instructions for Jupiter-style bundling */
  pythPostInstructions?: TransactionInstruction[];
  /** Pyth close instructions for Jupiter-style bundling */
  pythCloseInstructions?: TransactionInstruction[];
  /** Pyth price update keypair for signing */
  priceUpdateKeypair?: SolanaKeypair;
  /** Stealth address for position commitment */
  positionRecipient: StealthAddress;
  /** Stealth address for change commitment */
  changeRecipient: StealthAddress;
  /** Merkle root for input proof */
  merkleRoot: Uint8Array;
  /** Merkle path for input */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
  /** Progress callback */
  onProgress?: (stage: PerpsProgressStage) => void;
}

/** Close position parameters for client */
export interface ClosePerpsPositionParams {
  /** Position note to close */
  positionInput: DecryptedPositionNote;
  /** Perps pool address */
  poolId: PublicKey;
  /** Market ID */
  marketId: Uint8Array;
  /** Settlement token mint (the token to receive profit/loss in) */
  settlementTokenMint: PublicKey;
  /** Current oracle price (if not provided, will be fetched from Pyth) */
  oraclePrice?: bigint;
  /** Pyth price update account (if not provided, will be auto-posted and closed) */
  priceUpdate?: PublicKey;
  /** Pyth feed ID for auto-fetching price (default: BTC/USD) */
  pythFeedId?: Uint8Array;
  /** Pyth post instructions for Jupiter-style bundling */
  pythPostInstructions?: TransactionInstruction[];
  /** Pyth close instructions for Jupiter-style bundling */
  pythCloseInstructions?: TransactionInstruction[];
  /** Pyth price update keypair for signing */
  priceUpdateKeypair?: SolanaKeypair;
  /** Stealth address for settlement output */
  settlementRecipient: StealthAddress;
  /** Merkle root for position proof */
  merkleRoot: Uint8Array;
  /** Merkle path for position */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
  /** Progress callback */
  onProgress?: (stage: PerpsProgressStage) => void;
}

/** Add perps liquidity client parameters */
export interface PerpsAddLiquidityClientParams {
  /** Input token note */
  input: DecryptedNote;
  /** Perps pool address */
  poolId: PublicKey;
  /** Token index in pool */
  tokenIndex: number;
  /** Deposit amount */
  depositAmount: bigint;
  /** Expected LP tokens to receive */
  lpAmount: bigint;
  /** Current oracle prices for pool tokens (if not provided, will be fetched from Pyth) */
  oraclePrices?: bigint[];
  /** Pyth price update account (if not provided, will be auto-posted and closed) */
  priceUpdate?: PublicKey;
  /** Pyth feed ID for auto-fetching price */
  pythFeedId?: Uint8Array;
  /** Pyth post instructions for Jupiter-style bundling */
  pythPostInstructions?: TransactionInstruction[];
  /** Pyth close instructions for Jupiter-style bundling */
  pythCloseInstructions?: TransactionInstruction[];
  /** Pyth price update keypair for signing */
  priceUpdateKeypair?: SolanaKeypair;
  /** Stealth address for LP commitment */
  lpRecipient: StealthAddress;
  /** Stealth address for change commitment */
  changeRecipient: StealthAddress;
  /** Merkle root for input proof */
  merkleRoot: Uint8Array;
  /** Merkle path for input */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
  /** Progress callback */
  onProgress?: (stage: PerpsProgressStage) => void;
}

// =============================================================================
// Position Metadata Types (for Liquidation)
// =============================================================================

/** Position status for lifecycle tracking */
export enum PositionStatus {
  /** Position is active and can be modified/closed by owner */
  Active = 0,
  /** Position was liquidated - commitment is now unspendable */
  Liquidated = 1,
  /** Position was closed normally by owner */
  Closed = 2,
}

/** Public position metadata - stored as compressed account for permissionless liquidation */
export interface PositionMeta {
  /** Unique position identifier (hash of pool_id, market_id, nullifier_key, randomness) */
  positionId: Uint8Array;
  /** Pool this position belongs to */
  poolId: Uint8Array;
  /** Market being traded (e.g., SOL-PERP) */
  marketId: Uint8Array;
  /** Margin amount locked for this position */
  marginAmount: bigint;
  /** Price at which position becomes liquidatable */
  liquidationPrice: bigint;
  /** Position direction */
  isLong: boolean;
  /** Position size (margin * leverage) */
  positionSize: bigint;
  /** Entry price */
  entryPrice: bigint;
  /** Pre-committed nullifier hash for liquidation */
  nullifierHash: Uint8Array;
  /** Current position status */
  status: PositionStatus;
  /** Timestamp when position was opened */
  createdAt: number;
  /** Timestamp of last status update */
  updatedAt: number;
  /** Owner's stealth address (for notifications) */
  ownerStealthPubkey: Uint8Array;
}

/** Remove perps liquidity client parameters */
export interface PerpsRemoveLiquidityClientParams {
  /** LP token note to burn */
  lpInput: DecryptedLpNote;
  /** Perps pool address */
  poolId: PublicKey;
  /** Token index to withdraw */
  tokenIndex: number;
  /** LP amount to burn */
  lpAmount: bigint;
  /** Expected token amount to receive */
  withdrawAmount: bigint;
  /** Current oracle prices for pool tokens (if not provided, will be fetched from Pyth) */
  oraclePrices?: bigint[];
  /** Pyth price update account (if not provided, will be auto-posted and closed) */
  priceUpdate?: PublicKey;
  /** Pyth feed ID for auto-fetching price */
  pythFeedId?: Uint8Array;
  /** Pyth post instructions for Jupiter-style bundling */
  pythPostInstructions?: TransactionInstruction[];
  /** Pyth close instructions for Jupiter-style bundling */
  pythCloseInstructions?: TransactionInstruction[];
  /** Pyth price update keypair for signing */
  priceUpdateKeypair?: SolanaKeypair;
  /** Stealth address for withdrawal output */
  withdrawRecipient: StealthAddress;
  /** Stealth address for LP change (if any) */
  lpChangeRecipient: StealthAddress;
  /** Merkle root for LP proof */
  merkleRoot: Uint8Array;
  /** Merkle path for LP note */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
  /** Progress callback */
  onProgress?: (stage: PerpsProgressStage) => void;
}
