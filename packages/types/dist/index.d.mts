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
/** Decrypted note with additional metadata */
interface DecryptedNote extends Note {
    /** Note commitment */
    commitment: Commitment;
    /** Leaf index in merkle tree */
    leafIndex: number;
    /** Pool the note belongs to */
    pool: PublicKey;
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
/** Shield transaction parameters */
interface ShieldParams {
    /** Pool to shield into */
    pool: PublicKey;
    /** Amount to shield */
    amount: bigint;
    /** Recipient stealth address */
    recipient: StealthAddress;
}
/** Transfer transaction parameters */
interface TransferParams {
    /** Input notes to spend */
    inputs: DecryptedNote[];
    /** Output recipients and amounts */
    outputs: Array<{
        recipient: StealthAddress;
        amount: bigint;
    }>;
    /** Optional unshield */
    unshield?: {
        amount: bigint;
        recipient: PublicKey;
    };
}
/** Adapter swap parameters */
interface AdapterSwapParams {
    /** Input note */
    input: DecryptedNote;
    /** Output token mint */
    outputMint: PublicKey;
    /** Minimum output amount */
    minOutput: bigint;
    /** Adapter program */
    adapter: PublicKey;
    /** Adapter-specific params */
    adapterParams: Uint8Array;
    /** Output recipient */
    recipient: StealthAddress;
}
/** Market order parameters */
interface OrderParams {
    /** Input note for escrow */
    input: DecryptedNote;
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
/** Pool account state */
interface PoolState {
    /** Token mint for this pool */
    tokenMint: PublicKey;
    /** Current merkle root */
    merkleRoot: MerkleRoot;
    /** Historical roots (ring buffer) */
    historicalRoots: MerkleRoot[];
    /** Current root index */
    rootIndex: number;
    /** Next leaf index */
    nextLeafIndex: number;
    /** Merkle tree frontier */
    frontier: FieldElement[];
    /** Total shielded balance */
    totalShielded: bigint;
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
    stateHash: FieldElement;
    /** Fee in basis points */
    feeBps: number;
    /** Authority */
    authority: PublicKey;
    /** Is active */
    isActive: boolean;
    /** PDA bump */
    bump: number;
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

export { type AdapterProofInputs, type AdapterSwapParams, type AggregationState, AggregationStatus, type AmmPoolState, type Commitment, type DecryptedNote, type DecryptionShare, type ElGamalCiphertext, type EncryptedNote, type EncryptedVote, type FieldElement, type Groth16Proof, type Keypair, type MerkleProof, type MerkleRoot, type Note, type NoteCreatedEvent, type NoteSpentEvent, type Nullifier, type OrderCreatedEvent, type OrderFilledEvent, type OrderParams, type OrderState, OrderStatus, type OrderTerms, type Point, type PoolState, type PoseidonHash, type ShieldParams, type SpendingKey, type StealthAddress, type SyncStatus, type TransactionResult, type TransferParams, type TransferProofInputs, type ViewingKey, type VoteProofInputs, type VoteSubmittedEvent };
