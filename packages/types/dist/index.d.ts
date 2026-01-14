import { PublicKey } from '@solana/web3.js';

/**
 * CloakCraft Type Definitions
 *
 * Core types for the privacy protocol
 */

/** 32-byte scalar field element */
type FieldElement = Uint8Array;
/** BabyJubJub point (compressed) */
interface Point {
    x: FieldElement;
    y: FieldElement;
}
/** Poseidon hash output */
type PoseidonHash = FieldElement;
/** Note commitment (32 bytes) */
type Commitment = FieldElement;
/** Nullifier (32 bytes) */
type Nullifier = FieldElement;
/** Merkle root (32 bytes) */
type MerkleRoot = FieldElement;
/** Merkle proof path */
interface MerkleProof {
    root: MerkleRoot;
    pathElements: FieldElement[];
    pathIndices: number[];
    leafIndex: number;
}
/** Unencrypted note data */
interface Note {
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
interface EncryptedNote {
    /** Ephemeral public key for ECDH */
    ephemeralPubkey: Point;
    /** Encrypted payload */
    ciphertext: Uint8Array;
    /** Authentication tag */
    tag: Uint8Array;
}
/** Decrypted note with additional metadata for spending */
interface DecryptedNote extends Note {
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
/** Spending key (master secret) */
interface SpendingKey {
    sk: FieldElement;
}
/** Viewing key (derived from spending key) */
interface ViewingKey {
    /** Nullifier key */
    nk: FieldElement;
    /** Incoming viewing key */
    ivk: FieldElement;
}
/** Full keypair */
interface Keypair {
    spending: SpendingKey;
    viewing: ViewingKey;
    /** Public key on BabyJubJub */
    publicKey: Point;
}
/** Stealth address (one-time address) */
interface StealthAddress {
    /** Stealth public key */
    stealthPubkey: Point;
    /** Ephemeral public key */
    ephemeralPubkey: Point;
}
/** Groth16 proof */
interface Groth16Proof {
    /** G1 point A */
    a: Uint8Array;
    /** G2 point B */
    b: Uint8Array;
    /** G1 point C */
    c: Uint8Array;
}
/** Transfer proof inputs */
interface TransferProofInputs {
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
interface AdapterProofInputs {
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
interface VoteProofInputs {
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
interface VoteParams {
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
/** Shield transaction parameters */
interface ShieldParams {
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
interface PreparedInput extends DecryptedNote {
}
/** Transfer output (prepared for proving) */
interface TransferOutput {
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
/** Transfer transaction parameters */
interface TransferParams {
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
}
/** AMM Swap parameters */
interface AmmSwapParams {
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
}
/** Add liquidity parameters */
interface AddLiquidityParams {
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
}
/** Remove liquidity parameters */
interface RemoveLiquidityParams {
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
}
/** Adapter swap parameters */
interface AdapterSwapParams {
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
interface OrderParams {
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
interface OrderTerms {
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
interface FillOrderParams {
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
interface CancelOrderParams {
    /** Order ID to cancel */
    orderId: FieldElement;
    /** Order state (fetched from chain) */
    order: OrderState;
    /** Recipient for refunded escrow */
    refundRecipient: StealthAddress;
    /** Current timestamp */
    currentTimestamp: number;
}
/** ElGamal ciphertext */
interface ElGamalCiphertext {
    /** First component C1 = r*G */
    c1: Point;
    /** Second component C2 = m*G + r*P */
    c2: Point;
}
/** Encrypted vote (one per option) */
interface EncryptedVote {
    /** Encrypted voting power for this option */
    ciphertext: ElGamalCiphertext;
}
/** Decryption share from committee member */
interface DecryptionShare {
    /** Committee member index */
    memberIndex: number;
    /** Partial decryption shares (one per option) */
    shares: Point[];
    /** DLEQ proofs of correctness */
    dleqProofs: Uint8Array[];
}
/** Create aggregation parameters */
interface CreateAggregationParams {
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
interface SubmitVoteParams {
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
interface SubmitDecryptionShareParams {
    /** Aggregation ID */
    aggregationId: FieldElement;
    /** Decryption shares (one per option) */
    shares: FieldElement[];
    /** DLEQ proofs for each share */
    dleqProofs: Uint8Array[];
}
/** Finalize voting parameters */
interface FinalizeVotingParams {
    /** Aggregation ID */
    aggregationId: FieldElement;
    /** Final decrypted totals */
    totals: bigint[];
}
/** Pool account state */
interface PoolState {
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
}
/** AMM pool state */
interface AmmPoolState {
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
}
/** Order account state */
interface OrderState {
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
declare enum OrderStatus {
    Open = 0,
    Filled = 1,
    Cancelled = 2
}
/** Vote aggregation state */
interface AggregationState {
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
declare enum AggregationStatus {
    Active = 0,
    Decrypting = 1,
    Finalized = 2
}
/** Note created event */
interface NoteCreatedEvent {
    pool: PublicKey;
    commitment: Commitment;
    leafIndex: number;
    encryptedNote: Uint8Array;
    timestamp: number;
}
/** Note spent event */
interface NoteSpentEvent {
    pool: PublicKey;
    nullifier: Nullifier;
    timestamp: number;
}
/** Order created event */
interface OrderCreatedEvent {
    orderId: FieldElement;
    escrowCommitment: Commitment;
    termsHash: FieldElement;
    expiry: number;
    timestamp: number;
}
/** Order filled event */
interface OrderFilledEvent {
    orderId: FieldElement;
    timestamp: number;
}
/** Vote submitted event */
interface VoteSubmittedEvent {
    aggregationId: FieldElement;
    actionNullifier: Nullifier;
    timestamp: number;
}
/** Transaction result */
interface TransactionResult {
    signature: string;
    slot: number;
    confirmations?: number;
}
/** Sync status */
interface SyncStatus {
    latestSlot: number;
    indexedSlot: number;
    isSynced: boolean;
}

export { type AdapterProofInputs, type AdapterSwapParams, type AddLiquidityParams, type AggregationState, AggregationStatus, type AmmPoolState, type AmmSwapParams, type CancelOrderParams, type Commitment, type CreateAggregationParams, type DecryptedNote, type DecryptionShare, type ElGamalCiphertext, type EncryptedNote, type EncryptedVote, type FieldElement, type FillOrderParams, type FinalizeVotingParams, type Groth16Proof, type Keypair, type MerkleProof, type MerkleRoot, type Note, type NoteCreatedEvent, type NoteSpentEvent, type Nullifier, type OrderCreatedEvent, type OrderFilledEvent, type OrderParams, type OrderState, OrderStatus, type OrderTerms, type Point, type PoolState, type PoseidonHash, type PreparedInput, type RemoveLiquidityParams, type ShieldParams, type SpendingKey, type StealthAddress, type SubmitDecryptionShareParams, type SubmitVoteParams, type SyncStatus, type TransactionResult, type TransferOutput, type TransferParams, type TransferProofInputs, type ViewingKey, type VoteParams, type VoteProofInputs, type VoteSubmittedEvent };
