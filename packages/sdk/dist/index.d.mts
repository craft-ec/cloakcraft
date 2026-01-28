import { Note, Commitment, FieldElement, Point, DecryptedNote, Keypair, SpendingKey, ViewingKey, TransferParams, AdapterSwapParams, OrderParams, AmmSwapParams, AddLiquidityParams, RemoveLiquidityParams, ConsolidationParams, FillOrderParams, CancelOrderParams, Groth16Proof, PoolState, AmmPoolState, ShieldParams, TransactionResult, StealthAddress, TransferProgressStage, SyncStatus, OpenPerpsPositionParams, ClosePerpsPositionParams, PerpsAddLiquidityClientParams, PerpsRemoveLiquidityClientParams, PoseidonHash, Nullifier, EncryptedNote, ElGamalCiphertext, PoolType, PreparedInput } from '@cloakcraft/types';
export * from '@cloakcraft/types';
export { PoolType } from '@cloakcraft/types';
import * as _solana_web3_js from '@solana/web3.js';
import { PublicKey, AccountMeta, Connection, Transaction, VersionedTransaction, Keypair as Keypair$1, TransactionInstruction, AddressLookupTableAccount } from '@solana/web3.js';
import * as _lightprotocol_stateless_js from '@lightprotocol/stateless.js';
import { Rpc } from '@lightprotocol/stateless.js';
import { Program } from '@coral-xyz/anchor';

/**
 * Note commitment utilities
 *
 * Supports three note types:
 * - Standard token notes (type 0): Poseidon(DOMAIN_COMMITMENT, stealthPubX, tokenMint, amount, randomness)
 * - Position notes (type 1): Two-stage hash for perps positions
 * - LP notes (type 2): Domain hash for perps LP tokens
 */

/** Note type discriminators (first byte of serialized note) */
declare const NOTE_TYPE_STANDARD = 0;
declare const NOTE_TYPE_POSITION = 128;
declare const NOTE_TYPE_LP = 129;
/**
 * Position note for perps positions
 *
 * Commitment formula (two-stage):
 * stage1 = Poseidon(POSITION_DOMAIN, stealthPubX, marketId, isLong, margin)
 * commitment = Poseidon(stage1, size, leverage, entryPrice, randomness)
 *
 * Serialized format (123 bytes):
 * - type (1) + stealthPubX (32) + marketId (32) + isLong (1) + margin (8)
 * - + size (8) + leverage (1) + entryPrice (8) + randomness (32)
 * Encrypted: 123 + 80 (ECIES overhead) = 203 bytes (fits in 250-byte limit)
 */
interface PositionNote {
    noteType: typeof NOTE_TYPE_POSITION;
    stealthPubX: Uint8Array;
    marketId: Uint8Array;
    isLong: boolean;
    margin: bigint;
    size: bigint;
    leverage: number;
    entryPrice: bigint;
    randomness: Uint8Array;
}
/**
 * LP note for perps liquidity
 *
 * Commitment formula:
 * commitment = Poseidon(LP_DOMAIN, stealthPubX, poolId, lpAmount, randomness)
 *
 * Serialized format (105 bytes):
 * - type (1) + stealthPubX (32) + poolId (32) + lpAmount (8) + randomness (32)
 * Encrypted: 105 + 80 (ECIES overhead) = 185 bytes (fits in 250-byte limit)
 */
interface LpNote {
    noteType: typeof NOTE_TYPE_LP;
    stealthPubX: Uint8Array;
    poolId: Uint8Array;
    lpAmount: bigint;
    randomness: Uint8Array;
}
/** Domain separators for perps commitments (must match circuits) */
declare const POSITION_COMMITMENT_DOMAIN = 8n;
declare const LP_COMMITMENT_DOMAIN = 9n;
/**
 * Compute note commitment
 *
 * commitment = poseidon(DOMAIN_COMMITMENT, stealth_pub_x, token_mint, amount, randomness)
 */
declare function computeCommitment(note: Note): Commitment;
/**
 * Verify a commitment matches the note
 */
declare function verifyCommitment(commitment: Commitment, note: Note): boolean;
/**
 * Generate random commitment randomness
 */
declare function generateRandomness(): FieldElement;
/**
 * Create a new note
 */
declare function createNote(stealthPubX: FieldElement, tokenMint: PublicKey, amount: bigint, randomness?: FieldElement): Note;
/**
 * Compute position commitment (two-stage hash)
 *
 * Stage 1: Poseidon(POSITION_DOMAIN, stealthPubX, marketId, isLong, margin)
 * Stage 2: Poseidon(stage1, size, leverage, entryPrice, randomness)
 */
declare function computePositionCommitment(note: PositionNote): Commitment;
/**
 * Verify a position commitment matches the note
 */
declare function verifyPositionCommitment(commitment: Commitment, note: PositionNote): boolean;
/**
 * Create a position note
 *
 * @param stealthPubX - Stealth public key X coordinate
 * @param marketId - Full 32-byte market ID
 * @param isLong - True for long, false for short
 * @param margin - Margin amount
 * @param size - Position size
 * @param leverage - Leverage (0-255)
 * @param entryPrice - Entry price
 * @param randomness - Optional randomness (will generate if not provided)
 */
declare function createPositionNote(stealthPubX: FieldElement, marketId: Uint8Array, isLong: boolean, margin: bigint, size: bigint, leverage: number, entryPrice: bigint, randomness?: FieldElement): PositionNote;
/**
 * Compute LP commitment
 *
 * Poseidon(LP_DOMAIN, stealthPubX, poolId, lpAmount, randomness)
 *
 * Note: Accepts any object with the required fields (doesn't require noteType)
 */
declare function computeLpCommitment(note: Pick<LpNote, 'stealthPubX' | 'poolId' | 'lpAmount' | 'randomness'>): Commitment;
/**
 * Verify an LP commitment matches the note
 */
declare function verifyLpCommitment(commitment: Commitment, note: LpNote): boolean;
/**
 * Create an LP note
 *
 * @param stealthPubX - Stealth public key X coordinate
 * @param poolId - Perps pool ID (32 bytes)
 * @param lpAmount - LP token amount
 * @param randomness - Optional randomness (will generate if not provided)
 */
declare function createLpNote(stealthPubX: FieldElement, poolId: Uint8Array, lpAmount: bigint, randomness?: FieldElement): LpNote;
/**
 * Serialize position note to bytes
 *
 * Format (123 bytes total - encrypted ~203 bytes, fits in 250-byte limit):
 * - type (1 byte): 0x80
 * - stealthPubX (32 bytes)
 * - marketId (32 bytes)
 * - isLong (1 byte)
 * - margin (8 bytes LE)
 * - size (8 bytes LE)
 * - leverage (1 byte)
 * - entryPrice (8 bytes LE)
 * - randomness (32 bytes)
 */
declare function serializePositionNote(note: PositionNote): Uint8Array;
/**
 * Deserialize position note from bytes
 */
declare function deserializePositionNote(data: Uint8Array): PositionNote | null;
/**
 * Serialize LP note to bytes
 *
 * Format (105 bytes total - encrypted ~185 bytes, fits in 250-byte limit):
 * - type (1 byte): 0x81
 * - stealthPubX (32 bytes)
 * - poolId (32 bytes)
 * - lpAmount (8 bytes LE)
 * - randomness (32 bytes)
 */
declare function serializeLpNote(note: LpNote): Uint8Array;
/**
 * Deserialize LP note from bytes
 */
declare function deserializeLpNote(data: Uint8Array): LpNote | null;
/**
 * Detect note type from serialized bytes
 *
 * Uses the first byte as a type indicator:
 * - 0x80: Position note
 * - 0x81: LP note
 * - 0x00-0x30: Standard note (first byte is part of stealthPubX field element)
 */
declare function detectNoteType(data: Uint8Array): number;

/**
 * Light Protocol Integration
 *
 * Handles interaction with Helius Photon indexer for compressed account operations.
 * Used for nullifier and commitment storage via ZK Compression.
 * Includes note scanner for finding user's notes in compressed accounts.
 */

/**
 * Sleep for a given number of milliseconds
 */
declare function sleep(ms: number): Promise<void>;
/**
 * Configuration for retry logic
 */
interface RetryConfig {
    /** Maximum number of retry attempts (default: 5) */
    maxRetries: number;
    /** Base delay in ms for exponential backoff (default: 1000) */
    baseDelayMs: number;
    /** Maximum delay in ms (default: 30000) */
    maxDelayMs: number;
    /** Whether to log retry attempts (default: true) */
    logRetries: boolean;
}
/**
 * Execute a function with retry logic and exponential backoff
 *
 * Automatically retries on 429 (rate limit) errors with exponential backoff.
 * Other errors are thrown immediately.
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @param operation - Description of the operation (for logging)
 */
declare function withRetry<T>(fn: () => Promise<T>, config?: Partial<RetryConfig>, operation?: string): Promise<T>;
/**
 * Helius RPC endpoint configuration
 */
interface HeliusConfig {
    /** Helius API key */
    apiKey: string;
    /** Network: 'mainnet-beta' | 'devnet' */
    network: 'mainnet-beta' | 'devnet';
}
/**
 * Validity proof from Helius indexer
 */
interface ValidityProof {
    /** Compressed proof bytes */
    compressedProof: {
        a: number[];
        b: number[];
        c: number[];
    };
    /** Root indices for state trees */
    rootIndices: number[];
    /** Merkle context */
    merkleTrees: PublicKey[];
}
/**
 * Packed address tree info for Light Protocol CPI
 */
interface PackedAddressTreeInfo {
    /** Address merkle tree account */
    addressMerkleTreeAccountIndex: number;
    /** Address queue account */
    addressQueueAccountIndex: number;
}
/**
 * Light nullifier params for transaction
 */
interface LightNullifierParams$1 {
    /** Validity proof from indexer */
    validityProof: ValidityProof;
    /** Address tree info */
    addressTreeInfo: PackedAddressTreeInfo;
    /** Output tree index */
    outputTreeIndex: number;
}
/**
 * Compressed account info from indexer
 */
interface CompressedAccountInfo {
    /** Account hash */
    hash: string;
    /** Address (32 bytes hex) */
    address: string | null;
    /** Owner program */
    owner: string;
    /** Lamports */
    lamports: number;
    /** Data object with discriminator and base64 data */
    data: {
        discriminator: number;
        data: string;
    } | null;
}
/**
 * Light Protocol client for Helius Photon indexer
 *
 * All RPC calls include automatic retry with exponential backoff for rate limits.
 */
declare class LightClient {
    protected readonly rpcUrl: string;
    protected readonly lightRpc: Rpc;
    protected readonly retryConfig: Partial<RetryConfig>;
    constructor(config: HeliusConfig & {
        retryConfig?: Partial<RetryConfig>;
    });
    /**
     * Get compressed account by address
     *
     * Returns null if account doesn't exist (nullifier not spent)
     * Includes automatic retry with exponential backoff on rate limits.
     */
    getCompressedAccount(address: Uint8Array): Promise<CompressedAccountInfo | null>;
    /**
     * Check if a nullifier has been spent
     *
     * Returns true if the nullifier compressed account exists
     */
    isNullifierSpent(nullifier: Uint8Array, programId: PublicKey, addressTree: PublicKey, pool: PublicKey): Promise<boolean>;
    /**
     * Batch check if multiple nullifiers have been spent
     *
     * Uses getMultipleCompressedAccounts for efficiency (single API call)
     * Returns a Set of addresses that exist (are spent)
     * Includes automatic retry with exponential backoff on rate limits.
     */
    batchCheckNullifiers(addresses: string[]): Promise<Set<string>>;
    /**
     * Get validity proof for creating a new compressed account
     *
     * This proves that the address doesn't exist yet (non-inclusion proof)
     * Includes automatic retry with exponential backoff on rate limits.
     *
     * Helius API expects:
     * - hashes: Array of existing account hashes to verify (optional)
     * - newAddressesWithTrees: Array of {address, tree} for non-inclusion proofs
     */
    getValidityProof(params: {
        /** New addresses to create (non-inclusion proof) */
        newAddresses: Uint8Array[];
        /** Address merkle tree for each new address */
        addressMerkleTree: PublicKey;
        /** State merkle tree for output (not used in Helius API but needed for context) */
        stateMerkleTree: PublicKey;
        /** Optional: existing account hashes to include in proof */
        hashes?: string[];
    }): Promise<ValidityProof>;
    /**
     * Prepare Light Protocol params for transact instruction
     */
    prepareLightParams(params: {
        /** Nullifier hash */
        nullifier: Uint8Array;
        /** CloakCraft program ID */
        programId: PublicKey;
        /** Pool PDA (for nullifier address derivation) */
        pool: PublicKey;
        /** Address merkle tree account */
        addressMerkleTree: PublicKey;
        /** State merkle tree account */
        stateMerkleTree: PublicKey;
        /** Address merkle tree account index in remaining accounts */
        addressMerkleTreeAccountIndex: number;
        /** Address queue account index in remaining accounts */
        addressQueueAccountIndex: number;
        /** Output state tree index */
        outputTreeIndex: number;
    }): Promise<LightNullifierParams$1>;
    /**
     * Get remaining accounts needed for Light Protocol CPI
     *
     * These accounts must be passed to the transact instruction
     */
    getRemainingAccounts(params: {
        /** State merkle tree */
        stateMerkleTree: PublicKey;
        /** Address merkle tree */
        addressMerkleTree: PublicKey;
        /** Nullifier queue */
        nullifierQueue: PublicKey;
    }): Promise<AccountMeta[]>;
    /**
     * Derive spend nullifier compressed account address
     *
     * Uses Light Protocol's Poseidon-based address derivation.
     * Must match the on-chain derivation in light_cpi/mod.rs:
     * Seeds: ["spend_nullifier", pool, nullifier]
     */
    deriveNullifierAddress(nullifier: Uint8Array, programId: PublicKey, addressTree: PublicKey, pool?: PublicKey): Uint8Array;
}
/**
 * V2 State Tree Set - contains state tree, output queue, and CPI context
 */
interface StateTreeSet {
    stateTree: PublicKey;
    outputQueue: PublicKey;
    cpiContext: PublicKey;
}
/**
 * Light Protocol V2 batch tree accounts for devnet
 *
 * V2 uses batch merkle trees for better throughput.
 * There are 5 parallel state tree sets to avoid contention.
 * For address trees, the tree and queue are the same account.
 *
 * Address tree from Light SDK getBatchAddressTreeInfo()
 */
declare const DEVNET_LIGHT_TREES: {
    /** V2 batch address tree from Light SDK getBatchAddressTreeInfo() */
    addressTree: PublicKey;
    /** 5 parallel state tree sets for throughput */
    stateTrees: StateTreeSet[];
};
/**
 * Get a random state tree set for load balancing
 */
declare function getRandomStateTreeSet(): StateTreeSet;
/**
 * Get state tree set by index (0-4)
 */
declare function getStateTreeSet(index: number): StateTreeSet;
/**
 * Light Protocol V2 batch tree accounts for mainnet
 * Note: Update these with mainnet addresses when available
 */
declare const MAINNET_LIGHT_TREES: {
    addressTree: PublicKey;
    stateTrees: StateTreeSet[];
};
/**
 * Scanned note with spent status
 */
interface ScannedNote extends DecryptedNote {
    /** Whether this note has been spent */
    spent: boolean;
    /** Nullifier for this note (derived from nullifier key) */
    nullifier: Uint8Array;
}
/**
 * Scanned position note with spent status
 */
interface ScannedPositionNote extends PositionNote {
    /** Whether this position has been closed */
    spent: boolean;
    /** Nullifier for this position */
    nullifier: Uint8Array;
    /** Commitment hash */
    commitment: Uint8Array;
    /** Leaf index in merkle tree */
    leafIndex: number;
    /** Pool this position belongs to */
    pool: PublicKey;
    /** Account hash for merkle proof */
    accountHash: string;
    /** Stealth ephemeral pubkey for key derivation */
    stealthEphemeralPubkey?: Point;
}
/**
 * Scanned LP note with spent status
 */
interface ScannedLpNote extends LpNote {
    /** Whether this LP position has been spent */
    spent: boolean;
    /** Nullifier for this LP position */
    nullifier: Uint8Array;
    /** Commitment hash */
    commitment: Uint8Array;
    /** Leaf index in merkle tree */
    leafIndex: number;
    /** Pool this LP belongs to */
    pool: PublicKey;
    /** Account hash for merkle proof */
    accountHash: string;
    /** Stealth ephemeral pubkey for key derivation */
    stealthEphemeralPubkey?: Point;
}
/**
 * Commitment merkle proof from Helius
 */
interface CommitmentMerkleProof {
    /** Merkle root */
    root: Uint8Array;
    /** Path elements (siblings) */
    pathElements: Uint8Array[];
    /** Path indices (0 = left, 1 = right) */
    pathIndices: number[];
    /** Leaf index in tree */
    leafIndex: number;
}
/**
 * Scanner statistics for performance tracking
 */
interface ScannerStats {
    totalAccounts: number;
    cachedHits: number;
    decryptAttempts: number;
    successfulDecrypts: number;
    scanDurationMs: number;
    rpcCalls: number;
}
/**
 * Incremental scan options
 */
interface IncrementalScanOptions {
    /** Only scan accounts created after this slot */
    sinceSlot?: number;
    /** Maximum accounts to process per scan (for pagination) */
    maxAccounts?: number;
    /** Parallel decryption batch size (default: 10) */
    parallelBatchSize?: number;
}
/**
 * Extended Light client with commitment operations
 */
declare class LightCommitmentClient extends LightClient {
    private noteCache;
    private lastScannedSlot;
    private stats;
    /**
     * Get scanner statistics from last scan
     */
    getLastScanStats(): ScannerStats;
    /**
     * Get the last scanned slot for a pool (for incremental scanning)
     */
    getLastScannedSlot(pool?: PublicKey): number;
    /**
     * Set the last scanned slot (for restoring from persistent storage)
     */
    setLastScannedSlot(slot: number, pool?: PublicKey): void;
    /**
     * Clear note cache (call when wallet changes)
     */
    clearCache(): void;
    /**
     * Export cache state for persistent storage
     */
    exportCacheState(): {
        notes: Record<string, Record<string, any>>;
        slots: Record<string, number>;
    };
    /**
     * Import cache state from persistent storage
     */
    importCacheState(state: {
        notes: Record<string, Record<string, any>>;
        slots: Record<string, number>;
    }): void;
    /**
     * Get cache key from viewing key
     */
    private getCacheKey;
    /**
     * Reset scanner stats
     */
    private resetStats;
    /**
     * Get commitment by its address
     */
    getCommitment(pool: PublicKey, commitment: Uint8Array, programId: PublicKey, addressTree: PublicKey): Promise<CompressedAccountInfo | null>;
    /**
     * Check if a commitment exists in the tree
     */
    commitmentExists(pool: PublicKey, commitment: Uint8Array, programId: PublicKey, addressTree: PublicKey): Promise<boolean>;
    /**
     * Get merkle proof for a commitment using account hash
     *
     * This is the preferred method - uses the hash stored during scanning.
     * Uses Light SDK for proper API handling.
     */
    getMerkleProofByHash(accountHash: string): Promise<CommitmentMerkleProof>;
    /**
     * Get merkle proof for a commitment (legacy - derives address)
     *
     * Prefer getMerkleProofByHash if you have the account hash from scanning.
     */
    getCommitmentMerkleProof(pool: PublicKey, commitment: Uint8Array, programId: PublicKey, addressTree: PublicKey, _stateMerkleTree: PublicKey): Promise<CommitmentMerkleProof>;
    /**
     * Prepare Light params for shield instruction
     */
    prepareShieldParams(params: {
        commitment: Uint8Array;
        pool: PublicKey;
        programId: PublicKey;
        addressMerkleTree: PublicKey;
        stateMerkleTree: PublicKey;
        addressMerkleTreeAccountIndex: number;
        addressQueueAccountIndex: number;
        outputTreeIndex: number;
    }): Promise<LightNullifierParams$1>;
    /**
     * Derive commitment compressed account address
     *
     * Uses Light Protocol's address derivation (same as nullifier).
     * Seeds: ["commitment", pool, commitment_hash]
     */
    deriveCommitmentAddress(pool: PublicKey, commitment: Uint8Array, programId: PublicKey, addressTree: PublicKey): Uint8Array;
    /**
     * Convert leaf index to path indices (bit representation)
     */
    private leafIndexToPathIndices;
    /**
     * Scan for notes belonging to a user and check spent status
     *
     * Queries all commitment accounts, decrypts with viewing key,
     * then checks nullifier status for each note.
     *
     * @param viewingKey - User's viewing private key (for decryption)
     * @param nullifierKey - User's nullifier key (for deriving nullifiers)
     * @param programId - CloakCraft program ID
     * @param pool - Pool to scan (optional, scans all if not provided)
     * @returns Array of notes with spent status
     */
    scanNotesWithStatus(viewingKey: bigint, nullifierKey: Uint8Array, programId: PublicKey, pool?: PublicKey): Promise<ScannedNote[]>;
    /**
     * Get only unspent notes (available balance)
     */
    getUnspentNotes(viewingKey: bigint, nullifierKey: Uint8Array, programId: PublicKey, pool?: PublicKey): Promise<DecryptedNote[]>;
    /**
     * Calculate total balance from unspent notes
     */
    getBalance(viewingKey: bigint, nullifierKey: Uint8Array, programId: PublicKey, pool?: PublicKey): Promise<bigint>;
    /**
     * Scan for notes belonging to a user
     *
     * Queries all commitment accounts for a pool and attempts to decrypt
     * the encrypted notes with the user's viewing key.
     *
     * OPTIMIZED: Uses parallel decryption with configurable batch size.
     *
     * @param viewingKey - User's viewing private key (for decryption)
     * @param programId - CloakCraft program ID
     * @param pool - Pool to scan (optional, scans all if not provided)
     * @param options - Incremental scan options
     * @returns Array of decrypted notes owned by the user
     */
    scanNotes(viewingKey: bigint, programId: PublicKey, pool?: PublicKey, options?: IncrementalScanOptions): Promise<DecryptedNote[]>;
    /**
     * Process a single account for decryption (extracted for parallelization)
     */
    private processAccount;
    /**
     * Get all commitment compressed accounts
     *
     * Includes automatic retry with exponential backoff on rate limits.
     *
     * @param programId - CloakCraft program ID
     * @param poolPda - Pool PDA to filter by (optional). Note: pass the pool PDA, not the token mint.
     */
    getCommitmentAccounts(programId: PublicKey, poolPda?: PublicKey): Promise<CompressedAccountInfo[]>;
    /**
     * Parse commitment account data from base64
     *
     * Note: Helius returns discriminator separately, so data doesn't include it
     * Layout (after discriminator) - matches CommitmentAccount struct:
     * - pool: 32 bytes
     * - commitment: 32 bytes
     * - leaf_index: 8 bytes (u64)
     * - stealth_ephemeral_pubkey: 64 bytes (X + Y coordinates)
     * - encrypted_note: 200 bytes (FIXED SIZE array)
     * - encrypted_note_len: 2 bytes (u16) - actual length of data in encrypted_note
     * - created_at: 8 bytes (i64)
     *
     * Total: 32 + 32 + 8 + 64 + 200 + 2 + 8 = 346 bytes
     */
    private parseCommitmentAccountData;
    /**
     * Deserialize encrypted note from bytes
     *
     * Format:
     * - ephemeral_pubkey_x: 32 bytes
     * - ephemeral_pubkey_y: 32 bytes
     * - ciphertext_len: 4 bytes (u32 LE)
     * - ciphertext: variable (includes 12-byte nonce)
     * - tag: 16 bytes
     */
    private deserializeEncryptedNote;
    /**
     * Scan for position notes belonging to a user
     *
     * Similar to scanNotes but specifically for perps position commitments.
     * Uses the position commitment formula for verification.
     *
     * @param viewingKey - User's viewing private key (for decryption)
     * @param programId - CloakCraft program ID
     * @param positionPool - Position pool to scan
     * @returns Array of decrypted position notes owned by the user
     */
    scanPositionNotes(viewingKey: bigint, programId: PublicKey, positionPool: PublicKey): Promise<ScannedPositionNote[]>;
    /**
     * Scan for position notes with spent status
     */
    scanPositionNotesWithStatus(viewingKey: bigint, nullifierKey: Uint8Array, programId: PublicKey, positionPool: PublicKey): Promise<ScannedPositionNote[]>;
    /**
     * Get unspent position notes
     */
    getUnspentPositionNotes(viewingKey: bigint, nullifierKey: Uint8Array, programId: PublicKey, positionPool: PublicKey): Promise<ScannedPositionNote[]>;
    /**
     * Scan for LP notes belonging to a user
     *
     * Similar to scanNotes but specifically for perps LP commitments.
     * Uses the LP commitment formula for verification.
     *
     * @param viewingKey - User's viewing private key (for decryption)
     * @param programId - CloakCraft program ID
     * @param lpPool - LP pool to scan
     * @returns Array of decrypted LP notes owned by the user
     */
    scanLpNotes(viewingKey: bigint, programId: PublicKey, lpPool: PublicKey): Promise<ScannedLpNote[]>;
    /**
     * Scan for LP notes with spent status
     */
    scanLpNotesWithStatus(viewingKey: bigint, nullifierKey: Uint8Array, programId: PublicKey, lpPool: PublicKey): Promise<ScannedLpNote[]>;
    /**
     * Get unspent LP notes
     */
    getUnspentLpNotes(viewingKey: bigint, nullifierKey: Uint8Array, programId: PublicKey, lpPool: PublicKey): Promise<ScannedLpNote[]>;
    /**
     * Fetch position metadata for given position IDs
     *
     * Queries compressed PositionMeta accounts via Photon API.
     * These accounts are public and enable permissionless liquidation monitoring.
     *
     * @param programId - CloakCraft program ID
     * @param poolId - Pool ID (32 bytes)
     * @param positionIds - Array of position IDs to fetch metadata for
     * @returns Map of position ID (hex) to PositionMeta
     */
    fetchPositionMetas(programId: PublicKey, poolId: Uint8Array, positionIds: Uint8Array[]): Promise<Map<string, PositionMetaData>>;
    /**
     * Parse PositionMeta from base64-encoded compressed account data
     */
    private parsePositionMetaData;
    /**
     * Fetch all active position metas for a pool
     *
     * Useful for keepers to monitor all positions for liquidation.
     *
     * @param programId - CloakCraft program ID
     * @param poolId - Pool ID to scan
     * @returns Array of active PositionMeta
     */
    fetchActivePositionMetas(programId: PublicKey, poolId: Uint8Array): Promise<PositionMetaData[]>;
}
/** Position metadata data structure (matches on-chain PositionMeta) */
interface PositionMetaData {
    positionId: Uint8Array;
    poolId: Uint8Array;
    marketId: Uint8Array;
    marginAmount: bigint;
    liquidationPrice: bigint;
    isLong: boolean;
    positionSize: bigint;
    entryPrice: bigint;
    nullifierHash: Uint8Array;
    status: 0 | 1 | 2;
    createdAt: number;
    updatedAt: number;
    ownerStealthPubkey: Uint8Array;
}

/**
 * Wallet management for CloakCraft
 */

/**
 * Wallet class wrapping keypair with convenience methods
 */
declare class Wallet {
    readonly keypair: Keypair;
    constructor(keypair: Keypair);
    /**
     * Get the spending key (secret - handle with care)
     */
    get spendingKey(): SpendingKey;
    /**
     * Get the viewing key (can share for read-only access)
     */
    get viewingKey(): ViewingKey;
    /**
     * Get the public key (for receiving funds)
     */
    get publicKey(): Point;
    /**
     * Export spending key as bytes (for backup)
     */
    exportSpendingKey(): Uint8Array;
    /**
     * Export viewing key as bytes (for watch-only access)
     */
    exportViewingKey(): {
        nk: Uint8Array;
        ivk: Uint8Array;
    };
}
/**
 * Create a new random wallet
 */
declare function createWallet(): Wallet;
/**
 * Load wallet from spending key bytes
 */
declare function loadWallet(spendingKeyBytes: Uint8Array): Wallet;
/**
 * Create wallet from viewing key (watch-only)
 */
declare function createWatchOnlyWallet(viewingKey: ViewingKey, publicKey: Point): Wallet;
/**
 * Derive wallet from a Solana wallet signature
 *
 * This allows users to derive their stealth wallet from their Solana wallet,
 * so they only need to remember one seed phrase.
 */
declare function deriveWalletFromSignature(signature: Uint8Array): Wallet;
/**
 * The message to sign for wallet derivation
 * This is a constant so the same Solana wallet always derives the same stealth wallet
 */
declare const WALLET_DERIVATION_MESSAGE = "CloakCraft Stealth Wallet v1";
/**
 * Derive a wallet from a seed phrase (BIP-39 style)
 *
 * Note: In production, use proper BIP-39 implementation
 */
declare function deriveWalletFromSeed(seedPhrase: string, path?: string): Promise<Wallet>;

/**
 * Proof generation for ZK circuits
 *
 * Uses Circom circuits with snarkjs for Groth16 proofs.
 * Works in both browser and Node.js environments.
 */

/**
 * Configuration for Node.js proof generation
 */
interface NodeProverConfig {
    /** Path to circuits directory */
    circuitsDir: string;
    /** Path to circom build directory */
    circomBuildDir: string;
}
/**
 * Proof generator using Circom circuits with snarkjs
 */
declare class ProofGenerator {
    private circuits;
    private baseUrl;
    private nodeConfig?;
    constructor(config?: {
        baseUrl?: string;
        nodeConfig?: NodeProverConfig;
    });
    /**
     * Configure for Node.js proving (auto-detects paths if not provided)
     */
    configureForNode(config?: Partial<NodeProverConfig>): void;
    /**
     * Clear all circuit caches
     *
     * Call this to force reloading of circuit files after they've been recompiled.
     */
    clearCache(): void;
    /**
     * Initialize the prover with circuit artifacts
     */
    initialize(circuitNames?: string[]): Promise<void>;
    /**
     * Load a circuit's artifacts
     *
     * In Node.js with nodeConfig set, loads from file system.
     * In browser, loads via fetch from baseUrl.
     */
    loadCircuit(name: string): Promise<void>;
    /**
     * Load circuit from file system (Node.js)
     *
     * Note: For circom circuits, we use on-demand loading via snarkjs.
     * The manifest/pk files are optional - if they don't exist, we skip
     * and rely on the .wasm/.zkey files being loaded during proof generation.
     */
    private loadCircuitFromFs;
    /**
     * Load circuit from URL (browser)
     */
    private loadCircuitFromUrl;
    /**
     * Check if a circuit is loaded or can be auto-loaded
     *
     * Circom circuits are auto-loaded on-demand, so we return true for known circuit names.
     */
    hasCircuit(name: string): boolean;
    /**
     * Generate a transfer proof (1 input, 2 outputs)
     */
    generateTransferProof(params: TransferParams, keypair: Keypair): Promise<Uint8Array>;
    /**
     * Generate an adapter swap proof
     */
    generateAdapterProof(params: AdapterSwapParams, keypair: Keypair): Promise<Uint8Array>;
    /**
     * Generate an order creation proof
     */
    generateOrderProof(params: OrderParams, keypair: Keypair): Promise<Uint8Array>;
    /**
     * Generate a swap proof
     *
     * Returns both the proof and the computed commitments/nullifier
     * so the caller can pass the SAME values to the instruction.
     */
    generateSwapProof(params: AmmSwapParams, keypair: Keypair): Promise<{
        proof: Uint8Array;
        nullifier: Uint8Array;
        outCommitment: Uint8Array;
        changeCommitment: Uint8Array;
        outRandomness: Uint8Array;
        changeRandomness: Uint8Array;
    }>;
    /**
     * Generate an add liquidity proof
     *
     * Returns both the proof and the computed commitments/nullifiers
     * so the caller can pass the SAME values to the instruction.
     */
    generateAddLiquidityProof(params: AddLiquidityParams, keypair: Keypair): Promise<{
        proof: Uint8Array;
        nullifierA: Uint8Array;
        nullifierB: Uint8Array;
        lpCommitment: Uint8Array;
        changeACommitment: Uint8Array;
        changeBCommitment: Uint8Array;
        lpRandomness: Uint8Array;
        changeARandomness: Uint8Array;
        changeBRandomness: Uint8Array;
    }>;
    /**
     * Generate a remove liquidity proof
     */
    generateRemoveLiquidityProof(params: RemoveLiquidityParams, keypair: Keypair): Promise<{
        proof: Uint8Array;
        lpNullifier: Uint8Array;
        outputACommitment: Uint8Array;
        outputBCommitment: Uint8Array;
        outputARandomness: Uint8Array;
        outputBRandomness: Uint8Array;
    }>;
    /**
     * Generate a consolidation proof (3 inputs -> 1 output)
     *
     * Consolidation merges multiple notes into a single note.
     * - No fees (consolidation is free to encourage wallet cleanup)
     * - Supports 1-3 input notes (unused inputs are zeroed)
     * - Single output back to self
     */
    generateConsolidationProof(params: ConsolidationParams, keypair: Keypair): Promise<{
        proof: Uint8Array;
        nullifiers: Uint8Array[];
        outputCommitment: Uint8Array;
        outputRandomness: Uint8Array;
        outputAmount: bigint;
    }>;
    /**
     * Generate a fill order proof
     */
    generateFillOrderProof(params: FillOrderParams, keypair: Keypair): Promise<Uint8Array>;
    /**
     * Generate a cancel order proof
     */
    generateCancelOrderProof(params: CancelOrderParams, keypair: Keypair): Promise<Uint8Array>;
    /**
     * Generate a Groth16 proof for a circuit
     *
     * Returns 256-byte proof formatted for Solana's alt_bn128 verifier
     */
    private prove;
    /**
     * Native Groth16 prover (WASM-based)
     *
     * Returns proof bytes already formatted for Solana (256 bytes)
     */
    private proveNative;
    /** Circom circuit base URL for browser proving */
    private circomBaseUrl;
    /** Cached circom artifacts */
    private circomArtifacts;
    /**
     * Set custom circom base URL
     */
    setCircomBaseUrl(url: string): void;
    /**
     * Prove via snarkjs (browser) using Circom circuits
     *
     * Privacy-preserving: All proving happens client-side.
     * The witness (containing spending keys) never leaves the browser.
     *
     * Workflow:
     * 1. Load circom WASM (witness calculator) and zkey (proving key)
     * 2. Convert inputs to circom format (field element strings)
     * 3. Generate Groth16 proof using snarkjs
     * 4. Return proof already formatted for Solana (snarkjs-prover handles A negation)
     */
    private proveViaWasm;
    /**
     * Get circom file paths from circuit name
     * WASM files are in {name}_js/ subdirectories, zkey files are directly in the parent dir
     *
     * Examples:
     *   transfer/1x2: wasm=transfer_1x2_js/transfer_1x2.wasm, zkey=transfer_1x2_final.zkey
     *   perps/open_position: wasm=perps/open_position_js/open_position.wasm, zkey=perps/open_position_final.zkey
     */
    private getCircomFilePaths;
    /**
     * Convert SDK inputs to circom format (string field elements)
     */
    private convertToCircomInputs;
    /**
     * Convert a value to field element string
     */
    private valueToFieldString;
    /**
     * Format proof for Solana's alt_bn128 pairing check
     *
     * Solana uses the equation: e(-A, B) * e(alpha, beta) * e(PIC, gamma) * e(C, delta) = 1
     * This requires negating the A-component (negating Y coordinate)
     */
    private formatProofForSolana;
    private buildTransferWitness;
    /**
     * Generate proof for opening a perps position
     *
     * Circuit proves:
     * - Ownership of margin commitment
     * - Correct nullifier derivation
     * - Correct position commitment computation
     * - Balance check: input = margin + fee
     */
    generateOpenPositionProof(params: {
        /** Input note (margin source) */
        input: {
            stealthPubX: Uint8Array;
            tokenMint: any;
            amount: bigint;
            randomness: Uint8Array;
            leafIndex: number;
            stealthEphemeralPubkey?: {
                x: Uint8Array;
                y: Uint8Array;
            };
        };
        /** Perps pool ID (Pubkey bytes) */
        perpsPoolId: Uint8Array;
        /** Market ID */
        marketId: bigint;
        /** Is long position */
        isLong: boolean;
        /** Margin amount */
        marginAmount: bigint;
        /** Leverage (1-100) */
        leverage: number;
        /** Position size */
        positionSize: bigint;
        /** Entry price */
        entryPrice: bigint;
        /** Position fee */
        positionFee: bigint;
        /** Merkle root */
        merkleRoot: Uint8Array;
        /** Merkle path */
        merklePath: Uint8Array[];
        /** Merkle path indices */
        merkleIndices: number[];
    }, keypair: Keypair): Promise<{
        proof: Uint8Array;
        nullifier: Uint8Array;
        positionCommitment: Uint8Array;
        positionRandomness: Uint8Array;
        changeCommitment: Uint8Array;
        changeRandomness: Uint8Array;
        changeAmount: bigint;
    }>;
    /**
     * Generate proof for closing a perps position
     *
     * Circuit proves:
     * - Ownership of position commitment
     * - Correct nullifier derivation
     * - Correct settlement calculation (margin +/- PnL - fees)
     * - Bounded profit (max profit = margin)
     */
    generateClosePositionProof(params: {
        /** Position details */
        position: {
            stealthPubX: Uint8Array;
            marketId: bigint;
            isLong: boolean;
            margin: bigint;
            size: bigint;
            leverage: number;
            entryPrice: bigint;
            randomness: Uint8Array;
            leafIndex: number;
            spendingKey: Uint8Array;
        };
        /** Perps pool ID */
        perpsPoolId: Uint8Array;
        /** Exit price from oracle */
        exitPrice: bigint;
        /** PnL amount (absolute value) */
        pnlAmount: bigint;
        /** Is profit (true) or loss (false) */
        isProfit: boolean;
        /** Close fee */
        closeFee: bigint;
        /** Settlement recipient stealth address */
        settlementRecipient: {
            stealthPubkey: {
                x: Uint8Array;
            };
        };
        /** Token mint for settlement */
        tokenMint: Uint8Array;
        /** Merkle root */
        merkleRoot: Uint8Array;
        /** Merkle path */
        merklePath: Uint8Array[];
        /** Merkle path indices */
        merkleIndices: number[];
    }, keypair: Keypair): Promise<{
        proof: Uint8Array;
        positionNullifier: Uint8Array;
        settlementCommitment: Uint8Array;
        settlementRandomness: Uint8Array;
        settlementAmount: bigint;
    }>;
    /**
     * Generate proof for adding perps liquidity (single token deposit)
     *
     * Circuit proves:
     * - Ownership of deposit commitment
     * - Correct nullifier derivation
     * - Correct LP commitment computation
     * - Balance check: input = deposit + fee
     */
    generateAddPerpsLiquidityProof(params: {
        /** Input note (deposit token) */
        input: {
            stealthPubX: Uint8Array;
            tokenMint: any;
            amount: bigint;
            randomness: Uint8Array;
            leafIndex: number;
            stealthEphemeralPubkey?: {
                x: Uint8Array;
                y: Uint8Array;
            };
        };
        /** Perps pool ID */
        perpsPoolId: Uint8Array;
        /** Token index in pool (0-7) */
        tokenIndex: number;
        /** Deposit amount */
        depositAmount: bigint;
        /** LP amount to mint (calculated on-chain) */
        lpAmountMinted: bigint;
        /** Fee amount */
        feeAmount: bigint;
        /** LP recipient stealth address */
        lpRecipient: {
            stealthPubkey: {
                x: Uint8Array;
            };
        };
        /** Merkle root */
        merkleRoot: Uint8Array;
        /** Merkle path */
        merklePath: Uint8Array[];
        /** Merkle path indices */
        merkleIndices: number[];
    }, keypair: Keypair): Promise<{
        proof: Uint8Array;
        nullifier: Uint8Array;
        lpCommitment: Uint8Array;
        lpRandomness: Uint8Array;
    }>;
    /**
     * Generate proof for removing perps liquidity
     *
     * Circuit proves:
     * - Ownership of LP commitment
     * - Correct LP nullifier derivation
     * - Correct output token commitment
     * - Correct change LP commitment
     * - LP balance: lp_amount = burned + change
     */
    generateRemovePerpsLiquidityProof(params: {
        /** LP token input */
        lpInput: {
            stealthPubX: Uint8Array;
            lpAmount: bigint;
            randomness: Uint8Array;
            leafIndex: number;
            spendingKey: Uint8Array;
        };
        /** Perps pool ID */
        perpsPoolId: Uint8Array;
        /** Token index to withdraw (0-7) */
        tokenIndex: number;
        /** LP amount to burn */
        lpAmountBurned: bigint;
        /** Withdraw amount */
        withdrawAmount: bigint;
        /** Fee amount */
        feeAmount: bigint;
        /** Output token recipient */
        outputRecipient: {
            stealthPubkey: {
                x: Uint8Array;
            };
        };
        /** Output token mint */
        outputTokenMint: Uint8Array;
        /** Change LP amount */
        changeLpAmount: bigint;
        /** Merkle root */
        merkleRoot: Uint8Array;
        /** Merkle path */
        merklePath: Uint8Array[];
        /** Merkle path indices */
        merkleIndices: number[];
    }, keypair: Keypair): Promise<{
        proof: Uint8Array;
        lpNullifier: Uint8Array;
        outputCommitment: Uint8Array;
        changeLpCommitment: Uint8Array;
        outputRandomness: Uint8Array;
        changeLpRandomness: Uint8Array;
    }>;
}
/**
 * Parse a Groth16 proof from bytes
 */
declare function parseGroth16Proof(bytes: Uint8Array): Groth16Proof;
/**
 * Serialize a Groth16 proof to bytes
 */
declare function serializeGroth16Proof(proof: Groth16Proof): Uint8Array;

interface CloakCraftClientConfig {
    /** Solana RPC URL (required if connection not provided) */
    rpcUrl?: string;
    /** Solana Connection object (preferred - use same connection as wallet adapter) */
    connection?: Connection;
    /** Indexer API URL */
    indexerUrl: string;
    /** CloakCraft program ID */
    programId: PublicKey;
    /** Optional commitment level */
    commitment?: 'processed' | 'confirmed' | 'finalized';
    /** Helius API key for Light Protocol (nullifier storage) */
    heliusApiKey?: string;
    /** Network for Light Protocol */
    network?: 'mainnet-beta' | 'devnet';
    /** Base URL for circuit artifacts (browser only) */
    circuitsBaseUrl?: string;
    /** Node.js prover config (auto-detected if not provided) */
    nodeProverConfig?: {
        circuitsDir: string;
        circomBuildDir: string;
    };
    /** Address Lookup Table addresses for atomic transaction compression (optional) */
    addressLookupTables?: PublicKey[];
}
/**
 * Wallet interface for Anchor (matches wallet adapter structure)
 */
interface AnchorWallet {
    publicKey: PublicKey;
    signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
    signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}
declare class CloakCraftClient {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly rpcUrl: string;
    readonly indexerUrl: string;
    readonly network: 'mainnet-beta' | 'devnet';
    private wallet;
    private anchorWallet;
    private noteManager;
    private proofGenerator;
    private lightClient;
    private program;
    private heliusRpcUrl;
    private altManager;
    private altAddresses;
    constructor(config: CloakCraftClientConfig);
    /**
     * Get the Helius RPC URL (required for Light Protocol operations)
     */
    getHeliusRpcUrl(): string;
    /**
     * Build Light Protocol params for spending operations (perps, swaps, etc.)
     *
     * This is a centralized helper that:
     * 1. Gets commitment inclusion proof (proves input exists)
     * 2. Gets nullifier non-inclusion proof (proves not double-spent)
     * 3. Builds packed accounts with correct tree indices
     *
     * @param accountHash - Account hash of the commitment (from scanNotes)
     * @param nullifier - Nullifier to be created
     * @param pool - Pool PDA (used for nullifier address derivation)
     * @param rpcUrl - Helius RPC URL for Light Protocol queries
     */
    buildLightProtocolParams(accountHash: string, nullifier: Uint8Array, pool: PublicKey, rpcUrl: string): Promise<{
        lightVerifyParams: {
            commitmentAccountHash: number[];
            commitmentMerkleContext: {
                merkleTreePubkeyIndex: number;
                queuePubkeyIndex: number;
                leafIndex: number;
                rootIndex: number;
            };
            commitmentInclusionProof: {
                a: number[];
                b: number[];
                c: number[];
            };
            commitmentAddressTreeInfo: {
                addressMerkleTreePubkeyIndex: number;
                addressQueuePubkeyIndex: number;
                rootIndex: number;
            };
        };
        lightNullifierParams: {
            proof: {
                a: number[];
                b: number[];
                c: number[];
            };
            addressTreeInfo: {
                addressMerkleTreePubkeyIndex: number;
                addressQueuePubkeyIndex: number;
                rootIndex: number;
            };
            outputTreeIndex: number;
        };
        remainingAccounts: _solana_web3_js.AccountMeta[];
    }>;
    /**
     * Initialize proof generator
     *
     * Must be called before generating proofs.
     * Loads circuit artifacts (manifests, proving keys, zkeys).
     *
     * @param circuits - Optional list of circuits to load (loads all by default)
     */
    initializeProver(circuits?: string[]): Promise<void>;
    /**
     * Get the proof generator instance
     *
     * For advanced usage - direct proof generation
     */
    getProofGenerator(): ProofGenerator;
    /**
     * Get loaded Address Lookup Tables
     *
     * Returns null if no ALTs configured or failed to load
     */
    getAddressLookupTables(): Promise<_solana_web3_js.AddressLookupTableAccount[]>;
    /**
     * Set the Anchor program instance
     * Required for transaction building
     * @deprecated Use setWallet() instead for proper wallet integration
     */
    setProgram(program: Program): void;
    /**
     * Set the wallet and create AnchorProvider/Program internally
     * This matches scalecraft's pattern where the SDK owns the program creation
     * @param wallet - Wallet adapter wallet with signTransaction/signAllTransactions
     */
    setWallet(wallet: AnchorWallet): void;
    /**
     * Initialize the Anchor program with the current wallet
     * Called internally by setWallet (matches scalecraft pattern exactly)
     */
    private initProgram;
    /**
     * Get the Anchor program instance
     */
    getProgram(): Program | null;
    /**
     * Get Light Protocol tree accounts for current network
     */
    getLightTrees(): {
        addressTree: PublicKey;
        stateTrees: StateTreeSet[];
    };
    /**
     * Check if a nullifier has been spent
     *
     * Returns true if the nullifier compressed account exists
     *
     * @param nullifier - The nullifier bytes
     * @param pool - The pool public key (used in address derivation seeds)
     */
    isNullifierSpent(nullifier: Uint8Array, pool: PublicKey): Promise<boolean>;
    /**
     * Prepare Light Protocol params for a transact instruction
     *
     * This fetches the validity proof from Helius for nullifier creation
     *
     * @param nullifier - The nullifier bytes
     * @param pool - The pool public key (used in address derivation seeds)
     */
    prepareLightParams(nullifier: Uint8Array, pool: PublicKey): Promise<LightNullifierParams$1>;
    /**
     * Get remaining accounts needed for Light Protocol CPI
     */
    getLightRemainingAccounts(): Promise<_solana_web3_js.AccountMeta[]>;
    /**
     * Create a new wallet
     */
    createWallet(): Wallet;
    /**
     * Load wallet from spending key
     * Async because it initializes Poseidon hash function if needed
     */
    loadWallet(spendingKey: Uint8Array): Promise<Wallet>;
    /**
     * Get current wallet
     */
    getWallet(): Wallet | null;
    /**
     * Initialize a new pool for a token
     */
    initializePool(tokenMint: PublicKey, payer: Keypair$1): Promise<{
        poolTx: string;
        counterTx: string;
    }>;
    /**
     * Get pool state
     */
    getPool(tokenMint: PublicKey): Promise<PoolState | null>;
    /**
     * Get all initialized pools
     */
    getAllPools(): Promise<Array<PoolState & {
        address: PublicKey;
    }>>;
    /**
     * Get all AMM pools
     */
    getAllAmmPools(): Promise<Array<AmmPoolState & {
        address: PublicKey;
    }>>;
    /**
     * Sync notes for the current wallet
     */
    syncNotes(): Promise<DecryptedNote[]>;
    /**
     * Get unspent notes for a token
     */
    getUnspentNotes(tokenMint: PublicKey): Promise<DecryptedNote[]>;
    /**
     * Get merkle proof for a note
     */
    getMerkleProof(accountHash: string): Promise<{
        root: Uint8Array;
        pathElements: Uint8Array[];
        pathIndices: number[];
        leafIndex: number;
    }>;
    /**
     * Shield tokens into the pool
     *
     * Uses versioned transactions for atomic execution with Address Lookup Tables
     */
    shield(params: ShieldParams, payer: Keypair$1): Promise<TransactionResult & {
        commitment: Uint8Array;
        randomness: Uint8Array;
    }>;
    /**
     * Shield tokens into the pool using wallet adapter
     *
     * Uses the program's provider wallet for signing
     */
    shieldWithWallet(params: ShieldParams, walletPublicKey: PublicKey): Promise<TransactionResult & {
        commitment: Uint8Array;
        randomness: Uint8Array;
    }>;
    /**
     * Private transfer
     *
     * Generates ZK proof client-side (privacy-preserving) and submits transaction.
     * The proof generation happens entirely in the browser/local environment.
     *
     * @param params - Transfer parameters with prepared inputs
     * @param relayer - Optional relayer keypair for transaction fees
     */
    transfer(params: TransferParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Get relayer public key (without requiring keypair)
     * Falls back to self-relay mode (provider wallet pays own fees) if no relayer configured
     */
    private getRelayerPubkey;
    /**
     * Sign all transactions at once (batch signing)
     *
     * @param transactions - Array of transactions to sign
     * @param relayer - Optional relayer keypair. If not provided, uses wallet adapter's signAllTransactions
     * @returns Array of signed transactions
     */
    private signAllTransactions;
    /**
     * Prepare simple transfer inputs and execute transfer
     *
     * This is a convenience method that handles all cryptographic preparation:
     * - Derives Y-coordinates from spending key
     * - Fetches merkle proofs from indexer
     * - Computes output commitments
     */
    prepareAndTransfer(request: {
        inputs: DecryptedNote[];
        outputs: Array<{
            recipient: StealthAddress;
            amount: bigint;
        }>;
        unshield?: {
            amount: bigint;
            recipient: PublicKey;
        };
        onProgress?: (stage: TransferProgressStage) => void;
    }, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Prepare and consolidate notes
     *
     * Consolidates multiple notes into a single note.
     * This is used to reduce wallet fragmentation.
     *
     * @param inputs - Notes to consolidate (1-3)
     * @param tokenMint - Token mint (all inputs must use same token)
     * @param onProgress - Optional progress callback
     * @returns Transaction result with signature
     */
    prepareAndConsolidate(inputs: DecryptedNote[], tokenMint: PublicKey, onProgress?: (stage: TransferProgressStage) => void): Promise<TransactionResult>;
    /**
     * Execute consolidation transaction (multi-phase)
     *
     * Uses the consolidate_3x1 circuit and pre-generated proof.
     */
    private executeConsolidation;
    /**
     * Swap through external adapter (partial privacy)
     */
    swapViaAdapter(params: AdapterSwapParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Create a market order
     */
    createOrder(params: OrderParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Prepare and create a market order (convenience method)
     */
    prepareAndCreateOrder(request: {
        input: DecryptedNote;
        terms: {
            offerMint: PublicKey;
            offerAmount: bigint;
            requestMint: PublicKey;
            requestAmount: bigint;
        };
        expiry: number;
    }, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Get sync status
     *
     * Uses direct RPC scanning via Helius, so sync status is always current
     */
    getSyncStatus(): Promise<SyncStatus>;
    /**
     * Initialize a new AMM liquidity pool
     *
     * Creates a new AMM pool for a token pair. This must be done before
     * anyone can add liquidity or swap between these tokens.
     *
     * LP mint is now a PDA derived from the AMM pool, no keypair needed.
     *
     * @param tokenAMint - First token mint
     * @param tokenBMint - Second token mint
     * @param feeBps - Trading fee in basis points (e.g., 30 = 0.3%)
     * @param poolType - Pool type: 'constantProduct' (default) or 'stableSwap'
     * @param amplification - Amplification coefficient for StableSwap (100-10000, default: 200)
     * @param payer - Payer for transaction fees and rent
     * @returns Transaction signature
     */
    initializeAmmPool(tokenAMint: PublicKey, tokenBMint: PublicKey, feeBps: number, poolType?: 'constantProduct' | 'stableSwap', amplification?: number, payer?: Keypair$1): Promise<string>;
    /**
     * Initialize LP pool for an existing AMM pool
     *
     * Call this if you have an AMM pool whose LP token pool wasn't created.
     * This is required for LP tokens to be scannable after adding liquidity.
     *
     * @param ammPoolAddress - Address of the AMM pool
     * @returns Transaction signature
     */
    initializeLpPool(ammPoolAddress: PublicKey): Promise<{
        poolTx: string;
        counterTx: string;
    }>;
    /**
     * Initialize LP pools for all existing AMM pools
     *
     * Useful for ensuring all LP tokens are scannable.
     */
    initializeAllLpPools(): Promise<void>;
    /**
     * Execute an AMM swap
     *
     * Swaps tokens through the private AMM pool.
     *
     * @param params - Swap parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    swap(params: AmmSwapParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Add liquidity to an AMM pool
     *
     * @param params - Add liquidity parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    addLiquidity(params: AddLiquidityParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Remove liquidity from an AMM pool
     *
     * @param params - Remove liquidity parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    removeLiquidity(params: RemoveLiquidityParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Fill a market order
     *
     * Atomically fills a maker's order by spending taker's input note
     * and exchanging tokens.
     *
     * @param params - Fill order parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    fillOrder(params: FillOrderParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Cancel a market order
     *
     * Cancels an open order and refunds the escrowed tokens to the maker.
     *
     * @param params - Cancel order parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    cancelOrder(params: CancelOrderParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Helper to compute input nullifier
     */
    private computeInputNullifier;
    /**
     * Scan for unspent notes belonging to the current wallet
     *
     * Uses the Light Protocol scanner to find and decrypt notes,
     * then filters out spent notes using nullifier detection.
     *
     * @param tokenMint - Optional token mint to filter by (derives pool PDA internally)
     */
    scanNotes(tokenMint?: PublicKey): Promise<DecryptedNote[]>;
    /**
     * Get balance for the current wallet
     *
     * Scans for unspent notes and sums their amounts
     *
     * @param tokenMint - Optional token mint to filter by (derives pool PDA internally)
     */
    getPrivateBalance(tokenMint?: PublicKey): Promise<bigint>;
    /**
     * Clear the note scanning cache
     *
     * Call this after transactions to ensure fresh data on next scan.
     * The cache improves performance by skipping already-processed accounts,
     * but should be cleared after state changes.
     */
    clearScanCache(): void;
    private buildAdapterSwapTransaction;
    private buildCreateOrderTransaction;
    private getRelayer;
    private decodePoolState;
    /**
     * Prepare inputs for proving
     */
    private prepareInputs;
    /**
     * Prepare outputs by computing commitments
     *
     * @param outputs - Output recipients and amounts
     * @param tokenMint - Token mint for all outputs (must match inputs)
     */
    private prepareOutputs;
    /**
     * Fetch merkle proof from Light Protocol
     *
     * Uses accountHash if available (from scanner), otherwise derives address.
     */
    private fetchMerkleProof;
    /**
     * Open a perpetual futures position
     *
     * @param params - Open position parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    openPerpsPosition(params: OpenPerpsPositionParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Close a perpetual futures position
     *
     * @param params - Close position parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    closePerpsPosition(params: ClosePerpsPositionParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Add liquidity to a perpetual futures pool
     *
     * @param params - Add liquidity parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    addPerpsLiquidity(params: PerpsAddLiquidityClientParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Remove liquidity from a perpetual futures pool
     *
     * @param params - Remove liquidity parameters
     * @param relayer - Optional relayer keypair for transaction fees
     */
    removePerpsLiquidity(params: PerpsRemoveLiquidityClientParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Fetch all perps pools
     */
    getAllPerpsPools(): Promise<Array<{
        address: PublicKey;
        data: any;
    }>>;
    /**
     * Fetch a specific perps pool
     */
    getPerpsPool(poolAddress: PublicKey): Promise<any>;
    /**
     * Fetch perps markets for a pool
     */
    getPerpsMarkets(poolAddress: PublicKey): Promise<Array<{
        address: PublicKey;
        data: any;
    }>>;
    /**
     * Scan for position notes belonging to the current wallet
     *
     * Scans the position pool for encrypted position notes and attempts to decrypt
     * them with the user's viewing key. Returns only unspent positions.
     *
     * @param positionMint - The position mint (from perps pool's positionMint field)
     * @returns Array of decrypted position notes owned by the user
     */
    scanPositionNotes(positionMint: PublicKey): Promise<ScannedPositionNote[]>;
    /**
     * Scan for LP notes belonging to the current wallet
     *
     * Scans the LP pool for encrypted LP notes and attempts to decrypt
     * them with the user's viewing key. Returns only unspent LP positions.
     *
     * @param lpMint - The LP mint (from perps pool's lpMint field)
     * @returns Array of decrypted LP notes owned by the user
     */
    scanLpNotes(lpMint: PublicKey): Promise<ScannedLpNote[]>;
    /**
     * Scan for all position notes (including spent) for advanced use cases
     *
     * @param positionMint - The position mint
     * @returns Array of position notes with spent status
     */
    scanPositionNotesWithStatus(positionMint: PublicKey): Promise<ScannedPositionNote[]>;
    /**
     * Scan for all LP notes (including spent) for advanced use cases
     *
     * @param lpMint - The LP mint
     * @returns Array of LP notes with spent status
     */
    scanLpNotesWithStatus(lpMint: PublicKey): Promise<ScannedLpNote[]>;
    /**
     * Fetch position metadata for given position IDs
     *
     * Queries public PositionMeta compressed accounts to get status,
     * liquidation price, and other metadata for positions.
     *
     * @param poolId - Pool address (will be converted to bytes)
     * @param positionIds - Array of position IDs to fetch
     * @returns Map of position ID (hex) to PositionMeta
     */
    fetchPositionMetas(poolId: PublicKey, positionIds: Uint8Array[]): Promise<Map<string, PositionMetaData>>;
    /**
     * Fetch all active position metas for a pool
     *
     * Useful for keepers to monitor all positions for liquidation.
     *
     * @param poolId - Pool address to scan
     * @returns Array of active PositionMeta
     */
    fetchActivePositionMetas(poolId: PublicKey): Promise<PositionMetaData[]>;
}

/**
 * Poseidon hash implementation for BN254 scalar field
 *
 * Uses circomlibjs which matches the Circom Poseidon implementation
 * Compatible with Solana's sol_poseidon syscall
 */
interface Poseidon {
    (inputs: bigint[]): Uint8Array;
    F: {
        toObject(element: Uint8Array): bigint;
        fromObject(value: bigint): Uint8Array;
    };
}

declare const DOMAIN_COMMITMENT = 1n;
declare const DOMAIN_SPENDING_NULLIFIER = 2n;
declare const DOMAIN_ACTION_NULLIFIER = 3n;
declare const DOMAIN_NULLIFIER_KEY = 4n;
declare const DOMAIN_STEALTH = 5n;
declare const DOMAIN_MERKLE = 6n;
declare const DOMAIN_EMPTY_LEAF = 7n;
declare const FIELD_MODULUS_FR = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
declare const FIELD_MODULUS_FQ = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
/**
 * Initialize Poseidon hash function (async, call once at startup)
 */
declare function initPoseidon(): Promise<Poseidon>;
/**
 * Convert bytes to field element (big-endian)
 */
declare function bytesToField(bytes: Uint8Array): bigint;
/**
 * Convert field element to bytes (32 bytes, big-endian)
 */
declare function fieldToBytes(field: bigint): FieldElement;
/**
 * Poseidon hash with domain separation
 *
 * Uses circomlibjs which matches the Circom Poseidon implementation.
 * Domain is included as the first element in the hash input.
 */
declare function poseidonHash(inputs: FieldElement[], domain?: bigint): PoseidonHash;
/**
 * Poseidon hash of two elements (for merkle tree)
 */
declare function poseidonHash2(left: FieldElement, right: FieldElement): PoseidonHash;
/**
 * Poseidon hash of multiple elements with domain
 */
declare function poseidonHashDomain(domain: bigint, ...inputs: FieldElement[]): PoseidonHash;
/**
 * Async version of poseidonHash that auto-initializes
 */
declare function poseidonHashAsync(inputs: FieldElement[], domain?: bigint): Promise<PoseidonHash>;
/**
 * Async version of poseidonHashDomain that auto-initializes
 */
declare function poseidonHashDomainAsync(domain: bigint, ...inputs: FieldElement[]): Promise<PoseidonHash>;

/**
 * BabyJubJub curve operations
 *
 * BabyJubJub is a twisted Edwards curve over the BN254 scalar field.
 */

declare const GENERATOR: Point;
declare const IDENTITY: Point;
/**
 * Point addition on BabyJubJub (twisted Edwards curve)
 *
 * (x1, y1) + (x2, y2) = ((x1*y2 + y1*x2) / (1 + d*x1*x2*y1*y2),
 *                        (y1*y2 - a*x1*x2) / (1 - d*x1*x2*y1*y2))
 */
declare function pointAdd(p1: Point, p2: Point): Point;
/**
 * Scalar multiplication using double-and-add
 */
declare function scalarMul(point: Point, scalar: bigint): Point;
/**
 * Generate a public key from a private key
 */
declare function derivePublicKey(privateKey: bigint): Point;
/**
 * Check if a point is on the curve
 */
declare function isOnCurve(point: Point): boolean;
/**
 * Check if a point is in the prime-order subgroup
 */
declare function isInSubgroup(point: Point): boolean;

/**
 * Stealth address implementation using ECDH on BabyJubJub
 */

/**
 * Generate a stealth address for a recipient
 *
 * Sender:
 * 1. Generate random ephemeral keypair (e, E = e*G)
 * 2. Compute shared secret: S = e * recipient_pubkey
 * 3. Derive stealth private key factor: f = H(S.x)
 * 4. Stealth public key: P' = recipient_pubkey + f*G
 */
declare function generateStealthAddress(recipientPubkey: Point): {
    stealthAddress: StealthAddress;
    ephemeralPrivate: bigint;
};
/**
 * Scan and derive stealth private key (recipient side)
 *
 * Recipient:
 * 1. Compute shared secret: S = sk * E (where E is ephemeral pubkey)
 * 2. Derive factor: f = H(S.x)
 * 3. Stealth private key: sk' = sk + f
 */
declare function deriveStealthPrivateKey(recipientPrivateKey: bigint, ephemeralPubkey: Point): bigint;
/**
 * Check if a stealth address belongs to us
 */
declare function checkStealthOwnership(stealthPubkey: Point, ephemeralPubkey: Point, recipientKeypair: Keypair): boolean;

/**
 * Nullifier derivation utilities
 */

/**
 * Derive nullifier key from spending key
 *
 * nk = poseidon(DOMAIN_NULLIFIER_KEY, sk, 0)
 *
 * Matches circuit: hash3(NULLIFIER_KEY_DOMAIN, stealth_spending_key, 0)
 */
declare function deriveNullifierKey(spendingKey: FieldElement): FieldElement;
/**
 * Derive spending nullifier (consumes the note)
 *
 * spending_nullifier = poseidon(DOMAIN_SPENDING_NULLIFIER, nk, commitment, leaf_index)
 *
 * The leaf_index is included to prevent nullifier collision attacks when the
 * same note could theoretically appear at multiple positions.
 */
declare function deriveSpendingNullifier(nullifierKey: FieldElement, commitment: Commitment, leafIndex: number): Nullifier;
/**
 * Derive action nullifier (uses note without consuming)
 *
 * action_nullifier = poseidon(DOMAIN_ACTION_NULLIFIER, nk, commitment, action_domain)
 *
 * Used for voting: each proposal has a unique action_domain, so a note
 * can only vote once per proposal but remains spendable.
 */
declare function deriveActionNullifier(nullifierKey: FieldElement, commitment: Commitment, actionDomain: FieldElement): Nullifier;
/**
 * Check if a nullifier has been used (via indexer)
 */
declare function checkNullifierSpent(indexerUrl: string, nullifier: Nullifier): Promise<boolean>;

/**
 * Note encryption using ECIES (Elliptic Curve Integrated Encryption Scheme)
 *
 * Supports three note types:
 * - Standard token notes (104 bytes plaintext)
 * - Position notes (126 bytes with magic prefix)
 * - LP notes (108 bytes with magic prefix)
 */

/**
 * Encrypt a note for a recipient
 *
 * Uses ECIES:
 * 1. Generate ephemeral keypair
 * 2. ECDH to get shared secret
 * 3. KDF to derive encryption key
 * 4. Encrypt with ChaCha20-Poly1305
 */
declare function encryptNote(note: Note, recipientPubkey: Point): EncryptedNote;
/**
 * Decrypt an encrypted note
 */
declare function decryptNote(encrypted: EncryptedNote, recipientPrivateKey: bigint): Note;
/**
 * Try to decrypt a note (returns null if decryption fails)
 */
declare function tryDecryptNote(encrypted: EncryptedNote, recipientPrivateKey: bigint): Note | null;
/**
 * Encrypt a position note for a recipient
 */
declare function encryptPositionNote(note: PositionNote, recipientPubkey: Point): EncryptedNote;
/**
 * Decrypt a position note
 */
declare function decryptPositionNote(encrypted: EncryptedNote, recipientPrivateKey: bigint): PositionNote | null;
/**
 * Try to decrypt a position note (returns null if decryption fails or wrong type)
 */
declare function tryDecryptPositionNote(encrypted: EncryptedNote, recipientPrivateKey: bigint): PositionNote | null;
/**
 * Encrypt an LP note for a recipient
 */
declare function encryptLpNote(note: LpNote, recipientPubkey: Point): EncryptedNote;
/**
 * Decrypt an LP note
 */
declare function decryptLpNote(encrypted: EncryptedNote, recipientPrivateKey: bigint): LpNote | null;
/**
 * Try to decrypt an LP note (returns null if decryption fails or wrong type)
 */
declare function tryDecryptLpNote(encrypted: EncryptedNote, recipientPrivateKey: bigint): LpNote | null;
/** Decrypted note result with type discriminator */
type DecryptedNoteResult = {
    type: 'standard';
    note: Note;
} | {
    type: 'position';
    note: PositionNote;
} | {
    type: 'lp';
    note: LpNote;
};
/**
 * Try to decrypt any note type
 *
 * Attempts decryption and auto-detects the note type based on magic bytes.
 * Returns the appropriate note type or null if decryption fails.
 */
declare function tryDecryptAnyNote(encrypted: EncryptedNote, recipientPrivateKey: bigint): DecryptedNoteResult | null;
/**
 * Serialize encrypted note for on-chain storage
 *
 * Format:
 * - ephemeral_pubkey_x: 32 bytes
 * - ephemeral_pubkey_y: 32 bytes
 * - ciphertext_len: 4 bytes (u32 LE)
 * - ciphertext: variable (includes 12-byte nonce)
 * - tag: 16 bytes
 *
 * Total: 32 + 32 + 4 + ciphertext.length + 16 bytes
 */
declare function serializeEncryptedNote(encrypted: EncryptedNote): Uint8Array;
/**
 * Deserialize encrypted note from bytes
 */
declare function deserializeEncryptedNote(data: Uint8Array): EncryptedNote | null;

/**
 * ElGamal Encryption for Governance Voting
 *
 * Implements ElGamal encryption over BabyJubJub for homomorphic vote aggregation.
 * Encrypted votes can be homomorphically added without decryption.
 */

/**
 * Encrypt a value using ElGamal encryption
 *
 * ElGamal encryption:
 * - Choose random r
 * - c1 = r * G (ephemeral key)
 * - c2 = m * G + r * P (encrypted message)
 *
 * Where:
 * - G is the generator point
 * - P is the public key
 * - m is the message (voting power)
 *
 * @param message - Message to encrypt (voting power as bigint)
 * @param pubkey - Election/threshold public key
 * @param randomness - Random scalar for encryption
 */
declare function elgamalEncrypt(message: bigint, pubkey: Point, randomness: bigint): ElGamalCiphertext;
/**
 * Add two ElGamal ciphertexts (homomorphic addition)
 *
 * (c1_a, c2_a) + (c1_b, c2_b) = (c1_a + c1_b, c2_a + c2_b)
 *
 * This allows aggregating encrypted votes without decryption.
 */
declare function addCiphertexts(a: ElGamalCiphertext, b: ElGamalCiphertext): ElGamalCiphertext;
/**
 * Serialize ciphertext for on-chain storage
 *
 * Format: 64 bytes = c1_x (32) + c2_x (32)
 * (Y-coordinates can be recovered from X)
 */
declare function serializeCiphertext(ct: ElGamalCiphertext): Uint8Array;
/**
 * Serialize ciphertext as full points (for circuit inputs)
 *
 * Format: 128 bytes = c1 (64) + c2 (64)
 */
declare function serializeCiphertextFull(ct: ElGamalCiphertext): Uint8Array;
/**
 * Vote options
 */
declare enum VoteOption {
    Yes = 0,
    No = 1,
    Abstain = 2
}
/**
 * Encrypted ballot (one ciphertext per option)
 *
 * For a vote with 3 options (yes/no/abstain):
 * - Selected option encrypts the voting power: Enc(votingPower)
 * - Other options encrypt zero: Enc(0)
 *
 * This allows homomorphic tallying while hiding individual votes.
 */
interface EncryptedBallot {
    /** Encrypted value for "Yes" option */
    yes: ElGamalCiphertext;
    /** Encrypted value for "No" option */
    no: ElGamalCiphertext;
    /** Encrypted value for "Abstain" option */
    abstain: ElGamalCiphertext;
}
/**
 * Generate random encryption values for vote
 */
declare function generateVoteRandomness(): {
    yes: bigint;
    no: bigint;
    abstain: bigint;
};
/**
 * Encrypt a vote
 *
 * @param votingPower - User's voting power (token amount)
 * @param choice - Vote choice (0=Yes, 1=No, 2=Abstain)
 * @param electionPubkey - Election public key for encryption
 * @param randomness - Random values for each option (must be unique)
 */
declare function encryptVote(votingPower: bigint, choice: VoteOption, electionPubkey: Point, randomness: {
    yes: bigint;
    no: bigint;
    abstain: bigint;
}): EncryptedBallot;
/**
 * Serialize encrypted ballot for on-chain submission
 *
 * Format: Array of 64-byte ciphertexts (one per option)
 */
declare function serializeEncryptedVote(vote: EncryptedBallot): Uint8Array[];
/**
 * Decryption share data from a committee member
 *
 * For threshold decryption with t-of-n, each committee member:
 * 1. Computes their partial decryption share: D_i = sk_i * c1
 * 2. Provides a DLEQ proof that D_i is correctly computed
 *
 * After t shares are collected, the plaintext can be recovered:
 * m * G = c2 - sum(lagrange_i * D_i)
 */
interface DecryptionShareData {
    /** Committee member index (1-indexed) */
    memberIndex: number;
    /** Partial decryption shares (one per option) */
    shares: Point[];
    /** DLEQ proofs of correctness */
    dleqProofs: Uint8Array[];
}
/**
 * Compute a partial decryption share
 *
 * @param ciphertext - Encrypted ciphertext
 * @param secretKeyShare - Committee member's secret key share
 */
declare function computeDecryptionShare(ciphertext: ElGamalCiphertext, secretKeyShare: bigint): Point;
/**
 * Compute Lagrange coefficient for threshold decryption
 *
 * @param indices - Indices of participating members (1-indexed)
 * @param myIndex - Index of the member computing the coefficient
 * @param fieldOrder - Field order for modular arithmetic
 */
declare function lagrangeCoefficient(indices: number[], myIndex: number, fieldOrder: bigint): bigint;
/**
 * Combine decryption shares to recover encrypted total
 *
 * @param ciphertext - Aggregated encrypted ciphertext
 * @param shares - Decryption shares from committee members
 * @param indices - Indices of participating members
 * @param fieldOrder - Field order for Lagrange coefficients
 */
declare function combineShares(ciphertext: ElGamalCiphertext, shares: Point[], indices: number[], fieldOrder: bigint): Point;
/**
 * DLEQ proof structure
 *
 * Proves that log_G(P) = log_c1(D) without revealing the discrete log.
 * This ensures committee members computed their shares correctly.
 */
interface DleqProof {
    /** Challenge value */
    c: Uint8Array;
    /** Response value */
    s: Uint8Array;
}
/**
 * Generate a DLEQ proof
 *
 * Proves: log_G(publicKey) = log_c1(decryptionShare)
 * Where secretKey is the common discrete log.
 *
 * @param secretKey - Secret key (discrete log)
 * @param publicKey - P = secretKey * G
 * @param c1 - Ciphertext c1 component
 * @param decryptionShare - D = secretKey * c1
 */
declare function generateDleqProof(secretKey: bigint, publicKey: Point, c1: Point, decryptionShare: Point): DleqProof;
/**
 * Verify a DLEQ proof
 */
declare function verifyDleqProof(proof: DleqProof, publicKey: Point, c1: Point, decryptionShare: Point): boolean;

/**
 * BN254 field element conversion utilities
 *
 * Ensures values are properly reduced modulo the BN254 field prime.
 */

/**
 * Convert a PublicKey to a BN254 field element
 *
 * Since PublicKey is 256 bits and BN254 field is ~254 bits, we reduce modulo the field prime.
 * This matches the on-chain implementation in helpers/field.rs
 */
declare function pubkeyToField(pubkey: PublicKey): Uint8Array;

/**
 * Note management - syncing, scanning, and tracking notes
 */

/**
 * Note manager for syncing and managing wallet notes
 */
declare class NoteManager {
    private indexerUrl;
    private cachedNotes;
    private spentNullifiers;
    private lastSyncSlot;
    constructor(indexerUrl: string);
    /**
     * Sync notes from the indexer for a keypair
     */
    syncNotes(keypair: Keypair): Promise<DecryptedNote[]>;
    /**
     * Get all unspent notes for a token
     */
    getUnspentNotes(keypair: Keypair, tokenMint: PublicKey): Promise<DecryptedNote[]>;
    /**
     * Get total balance for a token
     */
    getBalance(keypair: Keypair, tokenMint: PublicKey): Promise<bigint>;
    /**
     * Select notes for a transfer
     */
    selectNotesForAmount(keypair: Keypair, tokenMint: PublicKey, targetAmount: bigint): Promise<{
        notes: DecryptedNote[];
        totalAmount: bigint;
    }>;
    /**
     * Get sync status
     *
     * Note: This method is deprecated. Use direct RPC scanning instead.
     * @deprecated Use client.getSyncStatus() which queries RPC directly
     */
    getSyncStatus(): Promise<SyncStatus>;
    /**
     * Mark notes as spent locally
     */
    markSpent(nullifiers: Nullifier[]): void;
    private fetchCommitments;
    private checkSpentNotes;
    private parseEncryptedNote;
    private noteKey;
}

/**
 * snarkjs-based Groth16 prover for browser
 *
 * Uses circom circuits with snarkjs for BN254 Groth16 proving.
 * This produces proofs compatible with Solana's alt_bn128 precompiles.
 */
/**
 * Circuit artifacts for snarkjs proving
 */
interface CircomArtifacts {
    /** WASM witness calculator */
    wasmBuffer: ArrayBuffer;
    /** Proving key (zkey) */
    zkeyBuffer: ArrayBuffer;
}
/**
 * Clear the circuit artifacts cache
 *
 * Call this to force reloading of circuit files after they've been recompiled.
 */
declare function clearCircomCache(): void;
/**
 * Load circuit artifacts from URLs or file paths
 *
 * In browser: Uses fetch with URLs
 * In Node.js: Reads from file system (resolves relative paths from project root)
 */
declare function loadCircomArtifacts(circuitName: string, wasmUrl: string, zkeyUrl: string): Promise<CircomArtifacts>;
/**
 * Generate a Groth16 proof using snarkjs
 *
 * @param artifacts - Circuit WASM and zkey
 * @param inputs - Circuit inputs as key-value pairs
 * @returns Proof formatted for Solana
 */
declare function generateSnarkjsProof(artifacts: CircomArtifacts, inputs: Record<string, string | string[]>): Promise<Uint8Array>;
/**
 * Generate a Groth16 proof using snarkjs with automatic artifact loading
 *
 * @param circuitName - Circuit name (e.g., 'voting/claim')
 * @param inputs - Circuit inputs as key-value pairs
 * @param buildDir - Directory containing circuit build artifacts
 * @returns Proof formatted for Solana
 */
declare function generateSnarkjsProofFromCircuit(circuitName: string, inputs: Record<string, string | string[]>, buildDir: string): Promise<Uint8Array>;
/**
 * Convert Uint8Array to field element string for circom
 */
declare function bytesToFieldString(bytes: Uint8Array): string;
/**
 * Convert bigint to field element string for circom
 */
declare function bigintToFieldString(value: bigint): string;

/**
 * CloakCraft SDK Constants
 */

declare const PROGRAM_ID: PublicKey;
declare const SEEDS: {
    readonly POOL: Buffer<ArrayBuffer>;
    readonly VAULT: Buffer<ArrayBuffer>;
    readonly VERIFICATION_KEY: Buffer<ArrayBuffer>;
    readonly COMMITMENT_COUNTER: Buffer<ArrayBuffer>;
    readonly PROTOCOL_CONFIG: Buffer<ArrayBuffer>;
    readonly AMM_POOL: Buffer<ArrayBuffer>;
    readonly LP_MINT: Buffer<ArrayBuffer>;
};
declare const DEVNET_V2_TREES: {
    readonly STATE_TREE: PublicKey;
    readonly OUTPUT_QUEUE: PublicKey;
    readonly ADDRESS_TREE: PublicKey;
};
declare const CIRCUIT_IDS$1: {
    readonly TRANSFER_1X2: "transfer_1x2";
    readonly CONSOLIDATE_3X1: "consolidate_3x1";
    readonly SWAP: "swap_swap";
    readonly ADD_LIQUIDITY: "swap_add_liquidity";
    readonly REMOVE_LIQUIDITY: "swap_remove_liquidity";
    readonly ORDER_CREATE: "market_order_create";
    readonly ORDER_FILL: "market_order_fill";
    readonly ORDER_CANCEL: "market_order_cancel";
    readonly PERPS_OPEN_POSITION: "perps_open_position";
    readonly PERPS_CLOSE_POSITION: "perps_close_position";
    readonly PERPS_ADD_LIQUIDITY: "perps_add_liquidity";
    readonly PERPS_REMOVE_LIQUIDITY: "perps_remove_liquidity";
    readonly PERPS_LIQUIDATE: "perps_liquidate";
};
/**
 * Pad circuit ID to 32 bytes with underscores
 * Must match on-chain constants.rs format: "transfer_1x2____________________"
 */
declare function padCircuitId(id: string): Buffer;
/**
 * Derive pool PDA
 */
declare function derivePoolPda(tokenMint: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derive vault PDA
 */
declare function deriveVaultPda(tokenMint: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derive commitment counter PDA
 */
declare function deriveCommitmentCounterPda(pool: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derive verification key PDA
 */
declare function deriveVerificationKeyPda$1(circuitId: string, programId?: PublicKey): [PublicKey, number];
/**
 * Derive protocol config PDA
 */
declare function deriveProtocolConfigPda(programId?: PublicKey): [PublicKey, number];
/**
 * Derive AMM pool PDA from token pair (uses canonical ordering)
 */
declare function deriveAmmPoolPda(tokenAMint: PublicKey, tokenBMint: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derive LP mint PDA from token pair (uses canonical ordering)
 */
declare function deriveLpMintPda(tokenAMint: PublicKey, tokenBMint: PublicKey, programId?: PublicKey): [PublicKey, number];

/**
 * Light Protocol RPC client wrapper
 */
declare class LightProtocol {
    readonly rpc: Rpc;
    readonly programId: PublicKey;
    constructor(rpcUrl: string, programId?: PublicKey);
    /**
     * Get batch address tree info
     */
    getAddressTreeInfo(): {
        tree: PublicKey;
        queue: PublicKey;
        cpiContext: undefined;
        treeType: _lightprotocol_stateless_js.TreeType;
        nextTreeInfo: null;
    };
    /**
     * Derive commitment address using Light SDK V2
     */
    deriveCommitmentAddress(pool: PublicKey, commitment: Uint8Array): PublicKey;
    /**
     * Derive nullifier address using Light SDK V2
     */
    deriveNullifierAddress(pool: PublicKey, nullifier: Uint8Array): PublicKey;
    /**
     * Get validity proof for creating a new compressed account (non-inclusion)
     */
    getValidityProof(addresses: PublicKey[]): Promise<_lightprotocol_stateless_js.ValidityProofWithContext>;
    /**
     * Get inclusion proof for existing compressed account
     *
     * Uses Light SDK's getCompressedAccountProof which properly proves
     * the account hash exists in the state tree.
     */
    getInclusionProofByHash(accountHash: string): Promise<_lightprotocol_stateless_js.MerkleContextWithMerkleProof>;
    /**
     * Build remaining accounts for Light Protocol CPI (simple version - no commitment)
     */
    buildRemainingAccounts(): {
        accounts: AccountMeta[];
        outputTreeIndex: number;
        addressTreeIndex: number;
    };
    /**
     * Build remaining accounts for spending operations (with commitment verification)
     *
     * CENTRALIZED TREE HANDLING - Use this for all spend operations!
     * Handles tree/queue extraction from commitment proof and builds correct indices.
     *
     * @param commitmentProof - Inclusion proof for commitment (from getInclusionProofByHash)
     * @param nullifierProof - Non-inclusion proof for nullifier (from getValidityProof)
     * @returns Everything needed for Light Protocol CPI with commitment verification
     */
    buildRemainingAccountsWithCommitment(commitmentProof: any, nullifierProof: any): {
        accounts: AccountMeta[];
        outputTreeIndex: number;
        commitmentStateTreeIndex: number;
        commitmentAddressTreeIndex: number;
        commitmentQueueIndex: number;
        nullifierAddressTreeIndex: number;
    };
    /**
     * Convert Light SDK compressed proof to Anchor format
     */
    static convertCompressedProof(proof: any): {
        a: number[];
        b: number[];
        c: number[];
    };
}
/**
 * Light params for shield instruction
 */
interface LightShieldParams {
    validityProof: {
        a: number[];
        b: number[];
        c: number[];
    };
    addressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
        rootIndex: number;
    };
    outputTreeIndex: number;
}
/**
 * Light params for transact instruction
 *
 * SECURITY CRITICAL: Requires TWO separate proofs to prevent fake commitment attacks
 * - Commitment inclusion proof: Verifies input commitment EXISTS in Light Protocol tree
 * - Nullifier non-inclusion proof: Verifies nullifier DOESN'T exist (prevents double-spend)
 *
 * Light Protocol validates both proofs automatically via CPI.
 */
interface LightTransactParams {
    /** Account hash of input commitment (for state tree verification) */
    commitmentAccountHash: number[];
    /** Commitment merkle context (proves commitment exists in state tree) */
    commitmentMerkleContext: {
        merkleTreePubkeyIndex: number;
        queuePubkeyIndex: number;
        leafIndex: number;
        rootIndex: number;
    };
    /** Commitment inclusion proof (SECURITY: proves commitment exists) */
    commitmentInclusionProof: {
        a: number[];
        b: number[];
        c: number[];
    };
    /** Address tree info for commitment verification */
    commitmentAddressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
        rootIndex: number;
    };
    /** Nullifier non-inclusion proof (prevents double-spend) */
    nullifierNonInclusionProof: {
        a: number[];
        b: number[];
        c: number[];
    };
    /** Address tree info for nullifier creation */
    nullifierAddressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
        rootIndex: number;
    };
    /** Output state tree index for new nullifier account */
    outputTreeIndex: number;
}
/**
 * Light params for store_commitment instruction
 */
interface LightStoreCommitmentParams {
    commitment: number[];
    leafIndex: bigint;
    stealthEphemeralPubkey: number[];
    encryptedNote: number[];
    validityProof: {
        a: number[];
        b: number[];
        c: number[];
    };
    addressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
        rootIndex: number;
    };
    outputTreeIndex: number;
}

/**
 * Shield parameters
 */
interface ShieldInstructionParams {
    /** Token mint to shield */
    tokenMint: PublicKey;
    /** Amount to shield (in token base units) */
    amount: bigint;
    /** Recipient's stealth public key (for commitment and encryption) */
    stealthPubkey: Point;
    /** Stealth address ephemeral pubkey (stored on-chain for decryption key derivation) */
    stealthEphemeralPubkey: Point;
    /** User's token account */
    userTokenAccount: PublicKey;
    /** User's wallet public key */
    user: PublicKey;
}
/**
 * Shield result containing the generated note data
 */
interface ShieldResult {
    /** Transaction instructions */
    instructions: TransactionInstruction[];
    /** The commitment hash */
    commitment: Uint8Array;
    /** Randomness used (needed for spending) */
    randomness: Uint8Array;
    /** Serialized encrypted note (stored on-chain) */
    encryptedNote: Buffer;
}
/**
 * Build shield transaction instructions
 */
declare function buildShieldInstructions(params: ShieldInstructionParams, rpcUrl: string, programId?: PublicKey): Promise<ShieldResult>;
/**
 * Build shield instruction using Anchor program
 */
declare function buildShieldWithProgram(program: Program, params: ShieldInstructionParams, rpcUrl: string): Promise<{
    tx: any;
    commitment: Uint8Array;
    randomness: Uint8Array;
}>;
/**
 * Build shield instruction for versioned transaction
 *
 * Shield is a single-phase operation - it creates the commitment on-chain directly.
 * This function returns the instruction for atomic execution with other operations.
 *
 * @returns Shield instruction ready for versioned transaction
 */
declare function buildShieldInstructionsForVersionedTx(program: Program, params: ShieldInstructionParams, rpcUrl: string): Promise<{
    instructions: _solana_web3_js.TransactionInstruction[];
    commitment: Uint8Array;
    randomness: Uint8Array;
}>;

/**
 * Transact Instruction Builder
 *
 * Private transfer with optional unshield
 */

/**
 * Input note for spending
 */
interface TransactInput {
    /** Stealth public key X coordinate */
    stealthPubX: Uint8Array;
    /** Amount */
    amount: bigint;
    /** Randomness */
    randomness: Uint8Array;
    /** Leaf index in merkle tree */
    leafIndex: number;
    /** Spending key for this note */
    spendingKey: bigint;
    /** Account hash from scanning (REQUIRED - this is where commitment exists in state tree) */
    accountHash: string;
}
/**
 * Output note to create
 */
interface TransactOutput {
    /** Recipient's stealth public key */
    recipientPubkey: Point;
    /** Ephemeral public key for stealth derivation (stored on-chain for recipient scanning) */
    ephemeralPubkey?: Point;
    /** Amount */
    amount: bigint;
    /** Pre-computed commitment (if already computed for ZK proof) */
    commitment?: Uint8Array;
    /** Pre-computed randomness (if already computed for ZK proof) */
    randomness?: Uint8Array;
}
/**
 * Transact parameters (Multi-Phase)
 */
interface TransactInstructionParams {
    /** Token mint */
    tokenMint: PublicKey;
    /** Input note to spend */
    input: TransactInput;
    /** Output notes to create */
    outputs: TransactOutput[];
    /** Merkle root for input verification */
    merkleRoot: Uint8Array;
    /** Merkle path for input */
    merklePath: Uint8Array[];
    /** Merkle path indices */
    merklePathIndices: number[];
    /** Amount to unshield (0 for pure private transfer) */
    unshieldAmount?: bigint;
    /** Unshield recipient token account */
    unshieldRecipient?: PublicKey;
    /** Protocol fee amount (verified in ZK proof) */
    feeAmount?: bigint;
    /** Treasury wallet address (owner of treasury token account) */
    treasuryWallet?: PublicKey;
    /** Treasury token account for receiving fees (required if feeAmount > 0) */
    treasuryTokenAccount?: PublicKey;
    /** Protocol config PDA (optional, used for fee verification) */
    protocolConfig?: PublicKey;
    /** Relayer public key */
    relayer: PublicKey;
    /** ZK proof bytes */
    proof: Uint8Array;
    /** Pre-computed nullifier (must match ZK proof) */
    nullifier?: Uint8Array;
    /** Pre-computed input commitment (must match ZK proof) */
    inputCommitment?: Uint8Array;
    /** Pre-computed output commitments (must match ZK proof) */
    outputCommitments?: Uint8Array[];
}
/**
 * Transact result
 */
interface TransactResult {
    /** Nullifier that was created */
    nullifier: Uint8Array;
    /** Output commitments */
    outputCommitments: Uint8Array[];
    /** Encrypted notes for outputs */
    encryptedNotes: Buffer[];
    /** Randomness for each output (needed for spending) */
    outputRandomness: Uint8Array[];
    /** Stealth ephemeral pubkeys for each output (64 bytes each: X + Y) */
    stealthEphemeralPubkeys: Uint8Array[];
    /** Output amounts (for filtering 0-amount outputs) */
    outputAmounts: bigint[];
}
/**
 * Build transact Phase 1 transaction (Multi-Phase)
 *
 * Multi-phase approach to stay under transaction size limits:
 * - Phase 1 (transact): Verify proof + Verify commitment + Create nullifier + Store pending + Unshield
 * - Phase 2+ (create_commitment): Create each output commitment via generic instruction
 * - Final (close_pending_operation): Close pending operation to reclaim rent
 */
declare function buildTransactWithProgram(program: Program, params: TransactInstructionParams, rpcUrl: string, circuitId?: string): Promise<{
    tx: any;
    phase1Tx: any;
    phase2Tx: any;
    phase3Tx: any | null;
    result: TransactResult;
    operationId: Uint8Array;
    pendingCommitments: Array<{
        pool: PublicKey;
        commitment: Uint8Array;
        stealthEphemeralPubkey: Uint8Array;
        encryptedNote: Uint8Array;
    }>;
}>;
/**
 * Helper to compute derived values for circuit inputs
 */
declare function computeCircuitInputs(input: TransactInput, outputs: TransactOutput[], tokenMint: PublicKey, unshieldAmount?: bigint): {
    inputCommitment: Uint8Array;
    nullifier: Uint8Array;
    outputCommitments: Uint8Array[];
};
/**
 * Consolidation input (prepared note with all required fields)
 */
interface ConsolidationInput {
    /** Stealth public key X coordinate */
    stealthPubX: Uint8Array;
    /** Amount */
    amount: bigint;
    /** Randomness */
    randomness: Uint8Array;
    /** Leaf index in merkle tree */
    leafIndex: number;
    /** Pre-computed commitment */
    commitment: Uint8Array;
    /** Account hash from scanning */
    accountHash: string;
}
/**
 * Consolidation instruction parameters
 */
interface ConsolidationInstructionParams {
    /** Token mint */
    tokenMint: PublicKey;
    /** Input notes to consolidate (2-3) */
    inputs: ConsolidationInput[];
    /** Pre-computed nullifiers (from ZK proof) */
    nullifiers: Uint8Array[];
    /** Pre-computed output commitment (from ZK proof) */
    outputCommitment: Uint8Array;
    /** Output randomness (from ZK proof) */
    outputRandomness: Uint8Array;
    /** Output amount (from ZK proof) */
    outputAmount: bigint;
    /** Output stealth recipient */
    outputRecipient: {
        stealthPubkey: {
            x: Uint8Array;
            y: Uint8Array;
        };
        ephemeralPubkey: {
            x: Uint8Array;
            y: Uint8Array;
        };
    };
    /** Merkle root (for ZK proof - dummy, Light Protocol verifies on-chain) */
    merkleRoot: Uint8Array;
    /** Relayer public key */
    relayer: PublicKey;
    /** ZK proof bytes */
    proof: Uint8Array;
}
/**
 * Build consolidation multi-phase transaction
 *
 * Uses the consolidate_3x1 circuit which has different public inputs than transfer:
 * - merkle_root
 * - nullifier_1, nullifier_2, nullifier_3
 * - out_commitment (single)
 * - token_mint
 *
 * NO unshield or fee (consolidation is free)
 */
declare function buildConsolidationWithProgram(program: Program, params: ConsolidationInstructionParams, rpcUrl: string): Promise<{
    phase0Tx: any;
    phase1Txs: any[];
    phase2Txs: any[];
    operationId: Uint8Array;
    pendingCommitments: Array<{
        pool: PublicKey;
        commitment: Uint8Array;
        stealthEphemeralPubkey: Uint8Array;
        encryptedNote: Uint8Array;
    }>;
}>;

/**
 * Store Commitment Instruction Builder
 *
 * Stores commitments as Light Protocol compressed accounts
 * Called after transact to store output commitments
 */

/**
 * Store commitment parameters
 */
interface StoreCommitmentParams {
    /** Token mint */
    tokenMint: PublicKey;
    /** Commitment to store */
    commitment: Uint8Array;
    /** Leaf index in tree */
    leafIndex: bigint;
    /** Stealth ephemeral pubkey (64 bytes) for deriving decryption key */
    stealthEphemeralPubkey: Uint8Array;
    /** Encrypted note data */
    encryptedNote: Buffer;
    /** Relayer public key */
    relayer: PublicKey;
}
/**
 * Build store_commitment transaction using Anchor program
 */
declare function buildStoreCommitmentWithProgram(program: Program, params: StoreCommitmentParams, rpcUrl: string): Promise<any>;
/**
 * Build and execute store_commitment transactions for multiple commitments
 *
 * After transact, call this to store each output commitment
 * Note: Anchor's .rpc() already handles confirmation - no extra verification needed
 */
declare function storeCommitments(program: Program, tokenMint: PublicKey, commitments: Array<{
    commitment: Uint8Array;
    leafIndex: bigint;
    stealthEphemeralPubkey: Uint8Array;
    encryptedNote: Buffer;
}>, relayer: PublicKey, rpcUrl: string): Promise<string[]>;

/**
 * Pool Initialization Instructions
 *
 * Initialize pool and commitment counter
 */

/**
 * Initialize pool parameters
 */
interface InitializePoolParams {
    /** Token mint for this pool */
    tokenMint: PublicKey;
    /** Authority (usually the payer) */
    authority: PublicKey;
    /** Payer for account creation */
    payer: PublicKey;
}
/**
 * Build initialize_pool transaction using Anchor program
 */
declare function buildInitializePoolWithProgram(program: Program, params: InitializePoolParams): Promise<any>;
/**
 * Build initialize_commitment_counter transaction using Anchor program
 */
declare function buildInitializeCommitmentCounterWithProgram(program: Program, params: {
    tokenMint: PublicKey;
    authority: PublicKey;
    payer: PublicKey;
}): Promise<any>;
/**
 * Initialize a new pool with commitment counter
 *
 * Combines both initialization instructions
 * Note: Anchor's .rpc() already handles confirmation - no extra verification needed
 */
declare function initializePool(program: Program, tokenMint: PublicKey, authority: PublicKey, payer: PublicKey): Promise<{
    poolTx: string;
    counterTx: string;
}>;

/**
 * AMM Swap Instruction Builders (Multi-Phase)
 *
 * All AMM operations use multi-phase commit due to Solana transaction size limits:
 * - Phase 1: Verify proof + Store pending operation (+ create nullifier for single-nullifier ops)
 * - Phase 2: Create each nullifier (for multi-nullifier ops like add_liquidity)
 * - Phase 3: Create each commitment
 * - Phase 4: Close pending operation
 */

/**
 * Derive pending operation PDA
 */
declare function derivePendingOperationPda$1(operationId: Uint8Array, programId: PublicKey): [PublicKey, number];
/**
 * Generate unique operation ID
 */
declare function generateOperationId$1(nullifier: Uint8Array, commitment: Uint8Array, timestamp: number): Uint8Array;
/**
 * Pending commitment data stored client-side between phases
 */
interface PendingCommitmentData {
    pool: PublicKey;
    commitment: Uint8Array;
    stealthEphemeralPubkey: Uint8Array;
    encryptedNote: Uint8Array;
}
/**
 * Pending nullifier data stored client-side between phases
 */
interface PendingNullifierData {
    pool: PublicKey;
    nullifier: Uint8Array;
}
/**
 * Initialize AMM pool instruction parameters
 */
/**
 * Pool type for AMM
 * 0 = ConstantProduct (x * y = k)
 * 1 = StableSwap (Curve style)
 */
type PoolTypeParam = {
    constantProduct: {};
} | {
    stableSwap: {};
};
interface InitializeAmmPoolParams {
    /** Token A mint */
    tokenAMint: PublicKey;
    /** Token B mint */
    tokenBMint: PublicKey;
    /** Fee in basis points (e.g., 30 = 0.3%) */
    feeBps: number;
    /** Authority */
    authority: PublicKey;
    /** Payer */
    payer: PublicKey;
    /** Pool type: 'constantProduct' or 'stableSwap' */
    poolType?: 'constantProduct' | 'stableSwap';
    /** Amplification coefficient for StableSwap pools (100-10000, typical: 200) */
    amplification?: number;
}
/**
 * Returns tokens in canonical order (lower pubkey first by bytes).
 * This ensures USDC-SOL and SOL-USDC always derive the same pool PDA.
 */
declare function canonicalTokenOrder(tokenA: PublicKey, tokenB: PublicKey): [PublicKey, PublicKey];
/**
 * Build initialize AMM pool transaction
 */
declare function buildInitializeAmmPoolWithProgram(program: Program, params: InitializeAmmPoolParams): Promise<{
    tx: any;
    lpMint: PublicKey;
    ammPool: PublicKey;
}>;
/**
 * Swap Phase 1 instruction parameters
 */
interface SwapInstructionParams {
    /** Input token pool */
    inputPool: PublicKey;
    /** Output token pool */
    outputPool: PublicKey;
    /** Input token mint (SPL token address) */
    inputTokenMint: PublicKey;
    /** Output token mint (SPL token address) */
    outputTokenMint: PublicKey;
    /** AMM pool state */
    ammPool: PublicKey;
    /** Input token vault (for protocol fee transfer) */
    inputVault: PublicKey;
    /** Protocol config PDA (required - enforces fee collection) */
    protocolConfig: PublicKey;
    /** Treasury ATA for input token (required if fees enabled and > 0) */
    treasuryAta?: PublicKey;
    /** Relayer public key */
    relayer: PublicKey;
    /** ZK proof bytes */
    proof: Uint8Array;
    /** Merkle root for input proof */
    merkleRoot: Uint8Array;
    /** Pre-computed nullifier */
    nullifier: Uint8Array;
    /** Pre-computed input commitment (for verification) */
    inputCommitment: Uint8Array;
    /** Input commitment account hash (from scanning) */
    accountHash: string;
    /** Input commitment leaf index */
    leafIndex: number;
    /** Pre-computed output commitment */
    outputCommitment: Uint8Array;
    /** Pre-computed change commitment */
    changeCommitment: Uint8Array;
    /** Minimum output amount */
    minOutput: bigint;
    /** Output recipient stealth address */
    outputRecipient: StealthAddress;
    /** Change recipient stealth address */
    changeRecipient: StealthAddress;
    /** Input amount for change calculation */
    inputAmount: bigint;
    /** Swap amount */
    swapAmount: bigint;
    /** Actual output amount from AMM calculation */
    outputAmount: bigint;
    /** Swap direction (aToB = true, bToA = false) */
    swapDirection: 'aToB' | 'bToA';
    /** Randomness used in proof generation (MUST be same for encryption) */
    outRandomness: Uint8Array;
    changeRandomness: Uint8Array;
}
/**
 * Swap Phase 2 parameters
 */
interface SwapPhase2Params {
    /** Operation ID from Phase 1 */
    operationId: Uint8Array;
    /** Index of commitment to create (0 = output, 1 = change) */
    commitmentIndex: number;
    /** Pool for this commitment */
    pool: PublicKey;
    /** Relayer public key */
    relayer: PublicKey;
    /** Stealth ephemeral pubkey (64 bytes: x || y) */
    stealthEphemeralPubkey: Uint8Array;
    /** Encrypted note */
    encryptedNote: Uint8Array;
}
/**
 * Build Swap Multi-Phase Transactions
 *
 * Returns all phase transactions for the multi-phase swap operation:
 * - Phase 0: createPendingWithProofSwap (verify proof + create pending)
 * - Phase 1: verifyCommitmentExists (verify input commitment)
 * - Phase 2: createNullifierAndPending (create nullifier)
 * - Phase 3: executeSwap (execute AMM swap logic)
 * - Phase 4+: createCommitment (handled by caller)
 * - Final: closePendingOperation (handled by caller)
 */
declare function buildSwapWithProgram(program: Program, params: SwapInstructionParams, rpcUrl: string): Promise<{
    tx: any;
    phase1Tx: any;
    phase2Tx: any;
    phase3Tx: any;
    operationId: Uint8Array;
    pendingCommitments: PendingCommitmentData[];
}>;
/**
 * Add Liquidity Phase 1 parameters
 */
interface AddLiquidityInstructionParams {
    /** Token A pool */
    poolA: PublicKey;
    /** Token B pool */
    poolB: PublicKey;
    /** Token A mint */
    tokenAMint: PublicKey;
    /** Token B mint */
    tokenBMint: PublicKey;
    /** LP token pool */
    lpPool: PublicKey;
    /** LP token mint */
    lpMint: PublicKey;
    /** AMM pool state */
    ammPool: PublicKey;
    /** Relayer */
    relayer: PublicKey;
    /** ZK proof */
    proof: Uint8Array;
    /** Pre-computed values */
    nullifierA: Uint8Array;
    nullifierB: Uint8Array;
    /** Pre-computed input commitments (for verification) */
    inputCommitmentA: Uint8Array;
    inputCommitmentB: Uint8Array;
    /** Input commitment account hashes (from scanning) */
    accountHashA: string;
    accountHashB: string;
    /** Input commitment leaf indices */
    leafIndexA: number;
    leafIndexB: number;
    lpCommitment: Uint8Array;
    changeACommitment: Uint8Array;
    changeBCommitment: Uint8Array;
    /** Randomness used in proof generation (MUST be same for encryption) */
    lpRandomness: Uint8Array;
    changeARandomness: Uint8Array;
    changeBRandomness: Uint8Array;
    /** Recipients */
    lpRecipient: StealthAddress;
    changeARecipient: StealthAddress;
    changeBRecipient: StealthAddress;
    /** Input amounts for change calculation */
    inputAAmount: bigint;
    inputBAmount: bigint;
    depositA: bigint;
    depositB: bigint;
    lpAmount: bigint;
    minLpAmount: bigint;
}
/**
 * Add Liquidity Phase 2 parameters
 */
interface AddLiquidityPhase2Params {
    /** Operation ID from Phase 1 */
    operationId: Uint8Array;
    /** Index of commitment (0 = LP, 1 = Change A, 2 = Change B) */
    commitmentIndex: number;
    /** Pool for this commitment */
    pool: PublicKey;
    /** Relayer */
    relayer: PublicKey;
    /** Stealth ephemeral pubkey */
    stealthEphemeralPubkey: Uint8Array;
    /** Encrypted note */
    encryptedNote: Uint8Array;
}
/**
 * Build Add Liquidity Multi-Phase Transactions
 *
 * Returns all phase transactions for the multi-phase add liquidity operation:
 * - Phase 0: createPendingWithProofAddLiquidity (verify proof + create pending)
 * - Phase 1a: verifyCommitmentExists (verify deposit A commitment)
 * - Phase 1b: verifyCommitmentExists (verify deposit B commitment)
 * - Phase 2a: createNullifierAndPending (create nullifier A)
 * - Phase 2b: createNullifierAndPending (create nullifier B)
 * - Phase 3: executeAddLiquidity (update AMM state)
 * - Phase 4+: createCommitment (handled by caller)
 * - Final: closePendingOperation (handled by caller)
 */
declare function buildAddLiquidityWithProgram(program: Program, params: AddLiquidityInstructionParams, rpcUrl: string): Promise<{
    tx: any;
    phase1aTx: any;
    phase1bTx: any;
    phase2aTx: any;
    phase2bTx: any;
    phase3Tx: any;
    operationId: Uint8Array;
    pendingCommitments: PendingCommitmentData[];
}>;
/**
 * Create Nullifier instruction parameters
 */
interface CreateNullifierParams {
    /** Operation ID from Phase 1 */
    operationId: Uint8Array;
    /** Index of nullifier to create */
    nullifierIndex: number;
    /** Pool for this nullifier */
    pool: PublicKey;
    /** Relayer */
    relayer: PublicKey;
    /** Nullifier value (optional, if not provided will fetch from PendingOperation) */
    nullifier?: Uint8Array;
}
/**
 * Build Create Nullifier instruction (generic)
 *
 * Call this for each nullifier in a multi-nullifier operation like add_liquidity.
 */
declare function buildCreateNullifierWithProgram(program: Program, params: CreateNullifierParams, rpcUrl: string): Promise<{
    tx: any;
}>;
/**
 * Create Commitment instruction parameters
 */
interface CreateCommitmentParams {
    /** Operation ID from Phase 1 */
    operationId: Uint8Array;
    /** Index of commitment to create */
    commitmentIndex: number;
    /** Pool for this commitment */
    pool: PublicKey;
    /** Relayer */
    relayer: PublicKey;
    /** Stealth ephemeral pubkey (64 bytes: x || y) */
    stealthEphemeralPubkey: Uint8Array;
    /** Encrypted note */
    encryptedNote: Uint8Array;
    /** Commitment value (optional, if not provided will fetch from PendingOperation) */
    commitment?: Uint8Array;
}
/**
 * Build Create Commitment instruction (generic)
 *
 * Call this for each commitment in a multi-commitment operation.
 */
declare function buildCreateCommitmentWithProgram(program: Program, params: CreateCommitmentParams, rpcUrl: string): Promise<{
    tx: any;
}>;
/**
 * Build Close Pending Operation instruction (generic)
 */
declare function buildClosePendingOperationWithProgram(program: Program, operationId: Uint8Array, relayer: PublicKey): Promise<{
    tx: any;
}>;
/**
 * Remove Liquidity Phase 1 parameters
 */
interface RemoveLiquidityInstructionParams {
    /** LP token pool */
    lpPool: PublicKey;
    /** Token A pool */
    poolA: PublicKey;
    /** Token B pool */
    poolB: PublicKey;
    /** Token A mint (SPL token address) */
    tokenAMint: PublicKey;
    /** Token B mint (SPL token address) */
    tokenBMint: PublicKey;
    /** AMM pool state */
    ammPool: PublicKey;
    /** Token A vault (for protocol fee transfer) */
    vaultA: PublicKey;
    /** Token B vault (for protocol fee transfer) */
    vaultB: PublicKey;
    /** Protocol config PDA (required - enforces fee collection) */
    protocolConfig: PublicKey;
    /** Treasury ATA for token A (required if fees enabled and > 0) */
    treasuryAtaA?: PublicKey;
    /** Treasury ATA for token B (required if fees enabled and > 0) */
    treasuryAtaB?: PublicKey;
    /** Relayer */
    relayer: PublicKey;
    /** ZK proof */
    proof: Uint8Array;
    /** Pre-computed values */
    lpNullifier: Uint8Array;
    /** Pre-computed LP input commitment (for verification) */
    lpInputCommitment: Uint8Array;
    /** LP input commitment account hash (from scanning) */
    accountHash: string;
    /** LP input commitment leaf index */
    leafIndex: number;
    outputACommitment: Uint8Array;
    outputBCommitment: Uint8Array;
    oldPoolStateHash: Uint8Array;
    newPoolStateHash: Uint8Array;
    /** Recipients */
    outputARecipient: StealthAddress;
    outputBRecipient: StealthAddress;
    /** LP amount being removed */
    lpAmount: bigint;
    /** Output amounts */
    outputAAmount: bigint;
    outputBAmount: bigint;
    /** Randomness used in proof generation */
    outputARandomness: Uint8Array;
    outputBRandomness: Uint8Array;
}
/**
 * Remove Liquidity Phase 2 parameters
 */
interface RemoveLiquidityPhase2Params {
    /** Operation ID from Phase 1 */
    operationId: Uint8Array;
    /** Index of commitment (0 = Output A, 1 = Output B) */
    commitmentIndex: number;
    /** Pool for this commitment */
    pool: PublicKey;
    /** Relayer */
    relayer: PublicKey;
    /** Stealth ephemeral pubkey */
    stealthEphemeralPubkey: Uint8Array;
    /** Encrypted note */
    encryptedNote: Uint8Array;
}
/**
 * Build Remove Liquidity Multi-Phase Transactions
 *
 * Returns all phase transactions for the multi-phase remove liquidity operation:
 * - Phase 0: createPendingWithProofRemoveLiquidity (verify proof + create pending)
 * - Phase 1: verifyCommitmentExists (verify LP commitment)
 * - Phase 2: createNullifierAndPending (create LP nullifier)
 * - Phase 3: executeRemoveLiquidity (update AMM state)
 * - Phase 4+: createCommitment (handled by caller)
 * - Final: closePendingOperation (handled by caller)
 */
declare function buildRemoveLiquidityWithProgram(program: Program, params: RemoveLiquidityInstructionParams, rpcUrl: string): Promise<{
    tx: any;
    phase1Tx: any;
    phase2Tx: any;
    phase3Tx: any;
    operationId: Uint8Array;
    pendingCommitments: PendingCommitmentData[];
}>;

/**
 * Market Order Instruction Builders
 *
 * Builds instructions for fill order and cancel order operations.
 */

/**
 * Derive order PDA from order ID
 */
declare function deriveOrderPda(orderId: Uint8Array, programId: PublicKey): [PublicKey, number];
/**
 * Fill order instruction parameters
 */
interface FillOrderInstructionParams {
    /** Maker pool (offers this token) */
    makerPool: PublicKey;
    /** Taker pool (pays with this token) */
    takerPool: PublicKey;
    /** Order ID */
    orderId: Uint8Array;
    /** Taker input note details */
    takerInput: {
        stealthPubX: Uint8Array;
        amount: bigint;
        randomness: Uint8Array;
        leafIndex: number;
        accountHash: string;
    };
    /** Maker output recipient (receives taker's tokens) */
    makerOutputRecipient: StealthAddress;
    /** Taker output recipient (receives maker's escrowed tokens) */
    takerOutputRecipient: StealthAddress;
    /** Taker change recipient */
    takerChangeRecipient: StealthAddress;
    /** Relayer public key */
    relayer: PublicKey;
    /** Maker proof bytes */
    makerProof: Uint8Array;
    /** Taker proof bytes */
    takerProof: Uint8Array;
    /** Pre-computed escrow nullifier */
    escrowNullifier: Uint8Array;
    /** Pre-computed taker nullifier */
    takerNullifier: Uint8Array;
    /** Pre-computed maker output commitment */
    makerOutCommitment: Uint8Array;
    /** Pre-computed taker output commitment */
    takerOutCommitment: Uint8Array;
    /** Order terms */
    orderTerms: {
        offerAmount: bigint;
        requestAmount: bigint;
    };
}
/**
 * Fill order result
 */
interface FillOrderResult {
    escrowNullifier: Uint8Array;
    takerNullifier: Uint8Array;
    makerOutCommitment: Uint8Array;
    takerOutCommitment: Uint8Array;
    encryptedNotes: Buffer[];
    randomness: Uint8Array[];
    stealthEphemeralPubkeys: Uint8Array[];
}
/**
 * Build fill order transaction
 */
declare function buildFillOrderWithProgram(program: Program, params: FillOrderInstructionParams, rpcUrl: string): Promise<{
    tx: any;
    result: FillOrderResult;
}>;
/**
 * Cancel order instruction parameters
 */
interface CancelOrderInstructionParams {
    /** Pool */
    pool: PublicKey;
    /** Order ID */
    orderId: Uint8Array;
    /** Refund recipient */
    refundRecipient: StealthAddress;
    /** Relayer public key */
    relayer: PublicKey;
    /** ZK proof */
    proof: Uint8Array;
    /** Pre-computed escrow nullifier */
    escrowNullifier: Uint8Array;
    /** Pre-computed refund commitment */
    refundCommitment: Uint8Array;
    /** Escrowed amount (for encrypted note) */
    escrowedAmount: bigint;
}
/**
 * Cancel order result
 */
interface CancelOrderResult {
    escrowNullifier: Uint8Array;
    refundCommitment: Uint8Array;
    encryptedNote: Buffer;
    randomness: Uint8Array;
    stealthEphemeralPubkey: Uint8Array;
}
/**
 * Build cancel order transaction
 */
declare function buildCancelOrderWithProgram(program: Program, params: CancelOrderInstructionParams, rpcUrl: string): Promise<{
    tx: any;
    result: CancelOrderResult;
}>;

/**
 * AMM Pool Management
 *
 * Functions for fetching and managing AMM pool state
 */

/**
 * Fetch AMM pool state from on-chain account
 *
 * @param connection - Solana connection
 * @param ammPoolPda - AMM pool PDA address
 * @returns AMM pool state
 */
declare function fetchAmmPool(connection: Connection, ammPoolPda: PublicKey): Promise<AmmPoolState>;
/**
 * Deserialize AMM pool account data
 *
 * Layout (matching Rust struct):
 * - discriminator: 8 bytes
 * - pool_id: 32 bytes (Pubkey)
 * - token_a_mint: 32 bytes (Pubkey)
 * - token_b_mint: 32 bytes (Pubkey)
 * - lp_mint: 32 bytes (Pubkey)
 * - state_hash: 32 bytes ([u8; 32])
 * - reserve_a: 8 bytes (u64 LE)
 * - reserve_b: 8 bytes (u64 LE)
 * - lp_supply: 8 bytes (u64 LE)
 * - fee_bps: 2 bytes (u16 LE)
 * - authority: 32 bytes (Pubkey)
 * - is_active: 1 byte (bool)
 * - bump: 1 byte (u8)
 * - lp_mint_bump: 1 byte (u8)
 * - pool_type: 1 byte (enum: 0=ConstantProduct, 1=StableSwap)
 * - amplification: 8 bytes (u64 LE)
 *
 * @param data - Raw account data
 * @returns Deserialized AMM pool state
 */
declare function deserializeAmmPool(data: Buffer): AmmPoolState;
/**
 * Compute AMM state hash (matches on-chain compute_state_hash)
 *
 * State hash = keccak256(reserve_a_le || reserve_b_le || lp_supply_le || pool_id)
 *
 * @param reserveA - Reserve of token A
 * @param reserveB - Reserve of token B
 * @param lpSupply - Total LP token supply
 * @param poolId - AMM pool ID (Pubkey)
 * @returns State hash (32 bytes)
 */
declare function computeAmmStateHash(reserveA: bigint, reserveB: bigint, lpSupply: bigint, poolId: PublicKey): Uint8Array;
/**
 * Check if AMM pool exists
 *
 * @param connection - Solana connection
 * @param tokenAMint - Token A mint address
 * @param tokenBMint - Token B mint address
 * @param programId - CloakCraft program ID
 * @returns True if pool exists
 */
declare function ammPoolExists(connection: Connection, tokenAMint: PublicKey, tokenBMint: PublicKey, programId: PublicKey): Promise<boolean>;
/**
 * Get or create AMM pool (fetch if exists, return null if not)
 *
 * @param connection - Solana connection
 * @param tokenAMint - Token A mint address
 * @param tokenBMint - Token B mint address
 * @param programId - CloakCraft program ID
 * @returns AMM pool state or null if doesn't exist
 */
declare function getAmmPool(connection: Connection, tokenAMint: PublicKey, tokenBMint: PublicKey, programId: PublicKey): Promise<AmmPoolState | null>;
/**
 * Refresh AMM pool state
 *
 * @param connection - Solana connection
 * @param pool - Existing pool state
 * @returns Updated pool state
 */
declare function refreshAmmPool(connection: Connection, pool: AmmPoolState): Promise<AmmPoolState>;
/**
 * Verify AMM state hash matches reserves
 *
 * @param pool - AMM pool state
 * @returns True if state hash is valid
 */
declare function verifyAmmStateHash(pool: AmmPoolState): boolean;
/**
 * Format AMM pool for display
 *
 * @param pool - AMM pool state
 * @param decimalsA - Token A decimals (default 9)
 * @param decimalsB - Token B decimals (default 9)
 * @returns Formatted pool data
 */
declare function formatAmmPool(pool: AmmPoolState, decimalsA?: number, decimalsB?: number): {
    poolId: string;
    tokenAMint: string;
    tokenBMint: string;
    lpMint: string;
    reserveA: number;
    reserveB: number;
    lpSupply: number;
    priceRatio: number;
    feeBps: number;
    feePercent: number;
    isActive: boolean;
};

/**
 * AMM Calculations
 *
 * Implements multiple AMM formulas:
 * - Constant Product (x * y = k) - Uniswap V2 style, for volatile pairs
 * - StableSwap (Curve) - for pegged assets like stablecoins
 *
 * Features:
 * - Swap output calculation
 * - Liquidity addition/removal
 * - Price impact and slippage
 */

/**
 * Calculate swap output amount using StableSwap formula (Curve-style)
 *
 * StableSwap invariant: A * n^n * sum(x) + D = A * D * n^n + D^(n+1) / (n^n * prod(x))
 * For n=2: A * 4 * (x + y) + D = A * D * 4 + D^3 / (4 * x * y)
 *
 * @param inputAmount - Amount of input token to swap
 * @param reserveIn - Reserve of input token in pool
 * @param reserveOut - Reserve of output token in pool
 * @param amplification - Amplification coefficient (A), typically 100-1000
 * @param feeBps - Fee in basis points (default 4 = 0.04% for stables)
 * @returns Output amount and price impact percentage
 */
declare function calculateStableSwapOutput(inputAmount: bigint, reserveIn: bigint, reserveOut: bigint, amplification: bigint, feeBps?: number): {
    outputAmount: bigint;
    priceImpact: number;
};
/**
 * Unified swap output calculation that handles both pool types
 *
 * @param inputAmount - Amount of input token to swap
 * @param reserveIn - Reserve of input token in pool
 * @param reserveOut - Reserve of output token in pool
 * @param poolType - Pool type (ConstantProduct or StableSwap)
 * @param feeBps - Fee in basis points
 * @param amplification - Amplification coefficient (only for StableSwap)
 * @returns Output amount and price impact percentage
 */
declare function calculateSwapOutputUnified(inputAmount: bigint, reserveIn: bigint, reserveOut: bigint, poolType: PoolType, feeBps: number, amplification?: bigint): {
    outputAmount: bigint;
    priceImpact: number;
};
/**
 * Calculate minimum output amount with slippage tolerance
 *
 * @param outputAmount - Expected output amount
 * @param slippageBps - Slippage tolerance in basis points (e.g., 50 = 0.5%)
 * @returns Minimum output amount to accept
 */
declare function calculateMinOutput(outputAmount: bigint, slippageBps: number): bigint;
/**
 * Calculate optimal amounts for adding liquidity
 * Maintains pool ratio to avoid price impact
 *
 * @param desiredA - Desired amount of token A
 * @param desiredB - Desired amount of token B
 * @param reserveA - Current reserve of token A
 * @param reserveB - Current reserve of token B
 * @returns Optimal deposit amounts and LP tokens to receive
 */
declare function calculateAddLiquidityAmounts(desiredA: bigint, desiredB: bigint, reserveA: bigint, reserveB: bigint, lpSupply: bigint): {
    depositA: bigint;
    depositB: bigint;
    lpAmount: bigint;
};
/**
 * Calculate output amounts for removing liquidity
 *
 * @param lpAmount - Amount of LP tokens to burn
 * @param lpSupply - Total LP token supply
 * @param reserveA - Current reserve of token A
 * @param reserveB - Current reserve of token B
 * @returns Amount of token A and B to receive
 */
declare function calculateRemoveLiquidityOutput(lpAmount: bigint, lpSupply: bigint, reserveA: bigint, reserveB: bigint): {
    outputA: bigint;
    outputB: bigint;
};
/**
 * Calculate price impact as percentage
 *
 * @param inputAmount - Amount of input token
 * @param reserveIn - Reserve of input token
 * @param reserveOut - Reserve of output token
 * @param poolType - Pool type (defaults to ConstantProduct)
 * @param feeBps - Fee in basis points (defaults to 30)
 * @param amplification - Amplification coefficient (only for StableSwap)
 * @returns Price impact as percentage (e.g., 1.5 = 1.5%)
 */
declare function calculatePriceImpact(inputAmount: bigint, reserveIn: bigint, reserveOut: bigint, poolType?: PoolType, feeBps?: number, amplification?: bigint): number;
/**
 * Calculate slippage percentage
 *
 * @param expectedOutput - Expected output amount
 * @param minOutput - Minimum output amount
 * @returns Slippage as percentage (e.g., 0.5 = 0.5%)
 */
declare function calculateSlippage(expectedOutput: bigint, minOutput: bigint): number;
/**
 * Calculate price ratio between two tokens
 *
 * @param reserveA - Reserve of token A
 * @param reserveB - Reserve of token B
 * @param decimalsA - Decimals of token A (default 9)
 * @param decimalsB - Decimals of token B (default 9)
 * @returns Price of token A in terms of token B
 */
declare function calculatePriceRatio(reserveA: bigint, reserveB: bigint, decimalsA?: number, decimalsB?: number): number;
/**
 * Calculate total liquidity in pool (in terms of token A)
 *
 * @param reserveA - Reserve of token A
 * @param reserveB - Reserve of token B
 * @param priceRatio - Price ratio (B/A)
 * @returns Total liquidity in token A units
 */
declare function calculateTotalLiquidity(reserveA: bigint, reserveB: bigint, priceRatio: number): bigint;
/**
 * Validate swap parameters
 *
 * @param inputAmount - Amount to swap
 * @param maxBalance - Maximum balance available
 * @param slippageBps - Slippage tolerance in bps
 * @returns Error message or null if valid
 */
declare function validateSwapAmount(inputAmount: bigint, maxBalance: bigint, slippageBps: number): string | null;
/**
 * Validate liquidity parameters
 *
 * @param amountA - Amount of token A
 * @param amountB - Amount of token B
 * @param balanceA - Available balance of token A
 * @param balanceB - Available balance of token B
 * @returns Error message or null if valid
 */
declare function validateLiquidityAmounts(amountA: bigint, amountB: bigint, balanceA: bigint, balanceB: bigint): string | null;

/**
 * Versioned Transaction Utilities
 *
 * Enables atomic multi-phase execution by combining all instructions
 * into a single versioned transaction.
 *
 * Benefits:
 * - Single signature (vs 5 separate signatures)
 * - Atomic execution (all succeed or all revert)
 * - Works on devnet and mainnet
 */

/**
 * Maximum transaction size in bytes
 * Solana's limit is 1232 bytes for versioned transactions
 */
declare const MAX_TRANSACTION_SIZE = 1232;
/**
 * Configuration for versioned transaction builder
 */
interface VersionedTransactionConfig {
    /** Compute unit limit (default: 1.4M for complex ZK operations) */
    computeUnits?: number;
    /** Compute unit price in micro-lamports (default: auto) */
    computeUnitPrice?: number;
    /** Address lookup tables for address compression (enables larger transactions) */
    lookupTables?: AddressLookupTableAccount[];
}
/**
 * Build a versioned transaction from instructions
 *
 * @param connection - Solana connection
 * @param instructions - Instructions to include
 * @param payer - Transaction fee payer
 * @param config - Configuration options
 * @returns Versioned transaction
 */
declare function buildVersionedTransaction(connection: Connection, instructions: TransactionInstruction[], payer: PublicKey, config?: VersionedTransactionConfig): Promise<VersionedTransaction>;
/**
 * Estimate the size of a versioned transaction
 *
 * @param tx - Versioned transaction
 * @returns Estimated size in bytes, or -1 if serialization fails
 */
declare function estimateTransactionSize(tx: VersionedTransaction): number;
/**
 * Check if instructions will fit in a single versioned transaction
 *
 * @param connection - Solana connection
 * @param instructions - Instructions to check
 * @param payer - Transaction fee payer
 * @param config - Configuration options
 * @returns True if instructions fit within size limit
 */
declare function canFitInSingleTransaction(connection: Connection, instructions: TransactionInstruction[], payer: PublicKey, config?: VersionedTransactionConfig): Promise<boolean>;
/**
 * Multi-phase operation instructions
 */
interface MultiPhaseInstructions {
    /** Phase 1: Verify proof + update state */
    phase1: TransactionInstruction;
    /** Phase 2: Create nullifiers */
    nullifiers: TransactionInstruction[];
    /** Phase 3: Create commitments */
    commitments: TransactionInstruction[];
    /** Phase 4: Close pending operation */
    cleanup: TransactionInstruction;
}
/**
 * Build atomic multi-phase transaction
 *
 * Combines all phases into a single versioned transaction for atomic execution.
 *
 * @param connection - Solana connection
 * @param phases - Multi-phase instructions
 * @param payer - Transaction fee payer
 * @param config - Configuration options
 * @returns Versioned transaction or null if too large
 */
declare function buildAtomicMultiPhaseTransaction(connection: Connection, phases: MultiPhaseInstructions, payer: PublicKey, config?: VersionedTransactionConfig): Promise<VersionedTransaction | null>;
/**
 * Execute versioned transaction with retry logic
 *
 * @param connection - Solana connection
 * @param tx - Versioned transaction (must be signed)
 * @param options - Send options
 * @returns Transaction signature
 */
declare function executeVersionedTransaction(connection: Connection, tx: VersionedTransaction, options?: {
    maxRetries?: number;
    skipPreflight?: boolean;
}): Promise<string>;
/**
 * Build instruction from Anchor method builder
 *
 * Helper to extract TransactionInstruction from Anchor's method builder.
 *
 * @param methodBuilder - Anchor method builder (with .instruction())
 * @returns TransactionInstruction
 */
declare function getInstructionFromAnchorMethod(methodBuilder: any): Promise<TransactionInstruction>;

/**
 * Address Lookup Table (ALT) Management
 *
 * ALTs compress account references from 32 bytes to 1 byte,
 * enabling larger transactions to fit within the 1232 byte limit.
 */

/**
 * Common accounts that appear in most CloakCraft transactions
 * These should be added to the ALT for maximum compression benefit
 */
interface CloakCraftALTAccounts {
    /** CloakCraft program ID */
    program: PublicKey;
    /** Light Protocol program ID */
    lightProtocol: PublicKey;
    /** Light Protocol state tree accounts (frequently used) */
    stateTrees: PublicKey[];
    /** Light Protocol address tree accounts */
    addressTrees: PublicKey[];
    /** Light Protocol nullifier queue accounts */
    nullifierQueues: PublicKey[];
    /** Light Protocol additional system accounts */
    systemAccounts: PublicKey[];
    /** System program */
    systemProgram: PublicKey;
    /** Token program */
    tokenProgram: PublicKey;
}
/**
 * Create a new Address Lookup Table
 *
 * @param connection - Solana connection
 * @param authority - ALT authority (must sign)
 * @param recentSlot - Recent slot for ALT creation
 * @returns ALT address and creation instruction
 */
declare function createAddressLookupTable(connection: Connection, authority: PublicKey, recentSlot?: number): Promise<{
    address: PublicKey;
    instruction: TransactionInstruction;
}>;
/**
 * Extend an Address Lookup Table with new addresses
 *
 * @param address - ALT address
 * @param authority - ALT authority (must sign)
 * @param addresses - Addresses to add
 * @returns Extend instruction
 */
declare function extendAddressLookupTable(address: PublicKey, authority: PublicKey, addresses: PublicKey[]): TransactionInstruction;
/**
 * Fetch an Address Lookup Table account
 *
 * @param connection - Solana connection
 * @param address - ALT address
 * @returns ALT account or null if doesn't exist
 */
declare function fetchAddressLookupTable(connection: Connection, address: PublicKey): Promise<AddressLookupTableAccount | null>;
/**
 * Create and populate a CloakCraft ALT with common accounts
 *
 * This is a helper that creates an ALT and adds all common CloakCraft accounts.
 * Should be called once during setup.
 *
 * @param connection - Solana connection
 * @param authority - Authority keypair
 * @param accounts - Common CloakCraft accounts to add
 * @returns ALT address
 */
declare function createCloakCraftALT(connection: Connection, authority: Keypair$1, accounts: CloakCraftALTAccounts): Promise<PublicKey>;
/**
 * Get Light Protocol common accounts for ALT
 *
 * These are the Merkle tree accounts that appear in every Light Protocol operation.
 *
 * @param network - Network (mainnet-beta or devnet)
 * @returns Light Protocol account addresses
 */
declare function getLightProtocolCommonAccounts(network: 'mainnet-beta' | 'devnet'): {
    stateTrees: PublicKey[];
    addressTrees: PublicKey[];
    nullifierQueues: PublicKey[];
    systemAccounts: PublicKey[];
};
/**
 * ALT Manager - Caches loaded ALTs for reuse
 */
declare class ALTManager {
    private cache;
    private connection;
    constructor(connection: Connection);
    /**
     * Get an ALT account (from cache or fetch)
     */
    get(address: PublicKey): Promise<AddressLookupTableAccount | null>;
    /**
     * Preload multiple ALTs
     */
    preload(addresses: PublicKey[]): Promise<void>;
    /**
     * Clear the cache
     */
    clear(): void;
}

/**
 * Transaction History Module
 *
 * Tracks and persists transaction history for privacy operations.
 * Uses IndexedDB for browser storage with fallback to localStorage.
 */

/**
 * Transaction type enum
 */
declare enum TransactionType {
    SHIELD = "shield",
    UNSHIELD = "unshield",
    TRANSFER = "transfer",
    SWAP = "swap",
    ADD_LIQUIDITY = "add_liquidity",
    REMOVE_LIQUIDITY = "remove_liquidity"
}
/**
 * Transaction status enum
 */
declare enum TransactionStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    FAILED = "failed"
}
/**
 * Transaction record
 */
interface TransactionRecord {
    /** Unique transaction ID */
    id: string;
    /** Transaction type */
    type: TransactionType;
    /** Transaction status */
    status: TransactionStatus;
    /** Transaction signature (if confirmed) */
    signature?: string;
    /** Timestamp (ISO string) */
    timestamp: string;
    /** Token mint address */
    tokenMint: string;
    /** Token symbol (for display) */
    tokenSymbol?: string;
    /** Amount in lamports/smallest unit */
    amount: string;
    /** Secondary amount (for swaps/liquidity) */
    secondaryAmount?: string;
    /** Secondary token mint (for swaps/liquidity) */
    secondaryTokenMint?: string;
    /** Secondary token symbol */
    secondaryTokenSymbol?: string;
    /** Recipient address (for transfers/unshield) */
    recipient?: string;
    /** Error message (if failed) */
    error?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Transaction history filter options
 */
interface TransactionFilter {
    /** Filter by type */
    type?: TransactionType;
    /** Filter by status */
    status?: TransactionStatus;
    /** Filter by token mint */
    tokenMint?: string;
    /** Filter after this date */
    after?: Date;
    /** Filter before this date */
    before?: Date;
    /** Maximum number of results */
    limit?: number;
    /** Offset for pagination */
    offset?: number;
}
/**
 * Transaction history manager
 */
declare class TransactionHistory {
    private readonly walletId;
    private db;
    private useIndexedDB;
    constructor(walletPublicKey: string | PublicKey);
    /**
     * Initialize the database
     */
    initialize(): Promise<void>;
    /**
     * Open IndexedDB database
     */
    private openDatabase;
    /**
     * Generate a unique transaction ID
     */
    private generateId;
    /**
     * Add a new transaction record
     */
    addTransaction(params: Omit<TransactionRecord, 'id' | 'timestamp'>): Promise<TransactionRecord>;
    /**
     * Update an existing transaction record
     */
    updateTransaction(id: string, updates: Partial<Omit<TransactionRecord, 'id' | 'timestamp'>>): Promise<TransactionRecord | null>;
    /**
     * Get a single transaction by ID
     */
    getTransaction(id: string): Promise<TransactionRecord | null>;
    /**
     * Get transaction history with optional filters
     */
    getTransactions(filter?: TransactionFilter): Promise<TransactionRecord[]>;
    /**
     * Get recent transactions
     */
    getRecentTransactions(limit?: number): Promise<TransactionRecord[]>;
    /**
     * Delete a transaction record
     */
    deleteTransaction(id: string): Promise<boolean>;
    /**
     * Clear all transaction history
     */
    clearHistory(): Promise<void>;
    /**
     * Get transaction count
     */
    getTransactionCount(filter?: TransactionFilter): Promise<number>;
    /**
     * Get transaction summary (counts by type and status)
     */
    getSummary(): Promise<{
        total: number;
        byType: Record<TransactionType, number>;
        byStatus: Record<TransactionStatus, number>;
    }>;
    private saveToIndexedDB;
    private getFromIndexedDB;
    private getAllFromIndexedDB;
    private deleteFromIndexedDB;
    private clearIndexedDB;
    private getStorageKey;
    private saveToLocalStorage;
    private getFromLocalStorage;
    private getAllFromLocalStorage;
    private deleteFromLocalStorage;
    private clearLocalStorage;
}
/**
 * Create a pending transaction record
 */
declare function createPendingTransaction(type: TransactionType, tokenMint: string | PublicKey, amount: bigint, options?: {
    tokenSymbol?: string;
    secondaryAmount?: bigint;
    secondaryTokenMint?: string | PublicKey;
    secondaryTokenSymbol?: string;
    recipient?: string;
    metadata?: Record<string, unknown>;
}): Omit<TransactionRecord, 'id' | 'timestamp'>;

/**
 * Token Price Module
 *
 * Fetches token prices from Jupiter Price API (free, no API key required).
 * Includes caching to minimize API calls.
 */

/**
 * Token price data
 */
interface TokenPrice {
    /** Token mint address */
    mint: string;
    /** Price in USD */
    priceUsd: number;
    /** 24h price change percentage */
    change24h?: number;
    /** Last update timestamp */
    updatedAt: number;
}
/**
 * Token price fetcher
 */
declare class TokenPriceFetcher {
    private cache;
    private cacheTtl;
    private pendingRequests;
    private apiUnavailableUntil;
    private consecutiveErrors;
    constructor(cacheTtlMs?: number);
    /**
     * Check if API is currently in backoff state
     */
    private isApiUnavailable;
    /**
     * Mark API as unavailable for backoff period
     */
    private markApiUnavailable;
    /**
     * Mark API as available (reset backoff)
     */
    private markApiAvailable;
    /**
     * Get price for a single token
     */
    getPrice(mint: string | PublicKey): Promise<TokenPrice | null>;
    /**
     * Get prices for multiple tokens
     */
    getPrices(mints: (string | PublicKey)[]): Promise<Map<string, TokenPrice>>;
    /**
     * Get SOL price in USD
     */
    getSolPrice(): Promise<number>;
    /**
     * Convert token amount to USD value
     */
    getUsdValue(mint: string | PublicKey, amount: bigint, decimals: number): Promise<number>;
    /**
     * Get total USD value for multiple tokens
     */
    getTotalUsdValue(balances: Array<{
        mint: string | PublicKey;
        amount: bigint;
        decimals: number;
    }>): Promise<number>;
    /**
     * Clear the price cache
     */
    clearCache(): void;
    /**
     * Get cached price if not expired
     */
    private getCached;
    /**
     * Cache a price
     */
    private setCache;
    /**
     * Fetch price for a single token from Jupiter
     */
    private fetchPrice;
    /**
     * Fetch prices for multiple tokens from Jupiter (batch)
     */
    private fetchPrices;
    /**
     * Check if price API is currently available
     */
    isAvailable(): boolean;
    /**
     * Force reset the backoff state (for manual retry)
     */
    resetBackoff(): void;
}
/**
 * Format price for display
 */
declare function formatPrice(price: number, decimals?: number): string;
/**
 * Format price change for display
 */
declare function formatPriceChange(change: number): string;
/**
 * Calculate price impact for a swap based on USD values
 */
declare function calculateUsdPriceImpact(inputAmount: bigint, outputAmount: bigint, inputPrice: number, outputPrice: number, inputDecimals: number, outputDecimals: number): number;

/**
 * Pool Analytics Module
 *
 * Calculates and tracks AMM pool statistics, TVL, volume, and APY.
 */

/**
 * Pool statistics
 */
interface PoolStats {
    /** Pool address */
    poolAddress: string;
    /** Token A mint */
    tokenAMint: string;
    /** Token B mint */
    tokenBMint: string;
    /** Token A reserve */
    reserveA: bigint;
    /** Token B reserve */
    reserveB: bigint;
    /** LP token supply */
    lpSupply: bigint;
    /** Total Value Locked in USD */
    tvlUsd: number;
    /** Token A price in USD */
    tokenAPrice: number;
    /** Token B price in USD */
    tokenBPrice: number;
    /** Token A value in USD */
    tokenAValueUsd: number;
    /** Token B value in USD */
    tokenBValueUsd: number;
    /** Exchange rate (B per A) */
    rateAToB: number;
    /** Exchange rate (A per B) */
    rateBToA: number;
    /** Fee in basis points */
    feeBps: number;
    /** LP token price in USD */
    lpTokenPriceUsd: number;
    /** Last update timestamp */
    updatedAt: number;
}
/**
 * User's position in a pool
 */
interface UserPoolPosition {
    /** Pool address */
    poolAddress: string;
    /** LP token balance */
    lpBalance: bigint;
    /** LP balance as percentage of total supply */
    sharePercent: number;
    /** Underlying token A amount */
    tokenAAmount: bigint;
    /** Underlying token B amount */
    tokenBAmount: bigint;
    /** Position value in USD */
    valueUsd: number;
}
/**
 * Pool analytics aggregator
 */
interface PoolAnalytics {
    /** Total TVL across all pools */
    totalTvlUsd: number;
    /** Number of active pools */
    poolCount: number;
    /** Individual pool stats */
    pools: PoolStats[];
    /** Last update timestamp */
    updatedAt: number;
}
/**
 * Pool analytics calculator
 */
declare class PoolAnalyticsCalculator {
    private priceFetcher;
    constructor(priceFetcher?: TokenPriceFetcher);
    /**
     * Calculate statistics for a single pool
     */
    calculatePoolStats(pool: AmmPoolState & {
        address: PublicKey;
    }, tokenADecimals?: number, tokenBDecimals?: number): Promise<PoolStats>;
    /**
     * Calculate statistics for multiple pools
     */
    calculateAnalytics(pools: Array<AmmPoolState & {
        address: PublicKey;
    }>, decimalsMap?: Map<string, number>): Promise<PoolAnalytics>;
    /**
     * Calculate user's position in a pool
     */
    calculateUserPosition(pool: AmmPoolState & {
        address: PublicKey;
    }, lpBalance: bigint, tokenADecimals?: number, tokenBDecimals?: number): Promise<UserPoolPosition>;
    /**
     * Calculate impermanent loss percentage
     */
    calculateImpermanentLoss(initialPriceRatio: number, currentPriceRatio: number): number;
    /**
     * Estimate APY based on fee income (simplified)
     * Note: This is an estimate and would need historical volume data for accuracy
     */
    estimateApy(feeBps: number, estimatedDailyVolumeUsd: number, tvlUsd: number): number;
}
/**
 * Format TVL for display
 */
declare function formatTvl(tvlUsd: number): string;
/**
 * Format APY for display
 */
declare function formatApy(apy: number): string;
/**
 * Format share percentage for display
 */
declare function formatShare(sharePercent: number): string;
/**
 * Calculate constant product invariant
 */
declare function calculateInvariant(reserveA: bigint, reserveB: bigint): bigint;
/**
 * Verify constant product invariant is maintained (with tolerance for fees)
 */
declare function verifyInvariant(oldReserveA: bigint, oldReserveB: bigint, newReserveA: bigint, newReserveB: bigint, feeBps: number): boolean;

/**
 * Protocol Fee Utilities
 *
 * Handles fee calculation and estimation for CloakCraft operations.
 *
 * Fee Operations (charged):
 * - transfer: Private → private transfers (0.1% suggested)
 * - unshield: Private → public withdrawals (0.25% suggested)
 * - swap: Protocol takes 20% of LP fees (e.g., 0.3% LP fee → 0.06% protocol fee)
 * - remove_liquidity: LP token withdrawals (0.25% suggested)
 *
 * Free Operations (add value to protocol):
 * - shield: Adding tokens to privacy pool
 * - add_liquidity: Providing LP capital
 * - consolidate: Reorganizing user's own notes
 * - stake: Locking tokens for security (future)
 * - vote: Governance participation (future)
 */

/**
 * Fee-able operation types
 */
type FeeableOperation = 'transfer' | 'unshield' | 'swap' | 'remove_liquidity';
/**
 * Free operation types (no fees)
 */
type FreeOperation = 'shield' | 'add_liquidity' | 'consolidate' | 'stake' | 'vote';
/**
 * All operation types
 */
type OperationType = FeeableOperation | FreeOperation;
/**
 * Protocol fee configuration
 */
interface ProtocolFeeConfig {
    /** Authority that can update fees */
    authority: PublicKey;
    /** Treasury receiving fees */
    treasury: PublicKey;
    /** Transfer fee in basis points (10 = 0.1%) */
    transferFeeBps: number;
    /** Unshield fee in basis points (25 = 0.25%) */
    unshieldFeeBps: number;
    /** Protocol's share of LP swap fees in basis points (2000 = 20%) */
    swapFeeShareBps: number;
    /** Remove liquidity fee in basis points (25 = 0.25%) */
    removeLiquidityFeeBps: number;
    /** Whether fees are enabled */
    feesEnabled: boolean;
}
/**
 * Fee calculation result
 */
interface FeeCalculation {
    /** Original amount before fees */
    amount: bigint;
    /** Fee amount to pay */
    feeAmount: bigint;
    /** Amount after fee deduction */
    amountAfterFee: bigint;
    /** Fee rate in basis points */
    feeBps: number;
    /** Whether this operation is free */
    isFree: boolean;
}
/**
 * Default fee configuration (suggested rates)
 */
declare const DEFAULT_FEE_CONFIG: Omit<ProtocolFeeConfig, 'authority' | 'treasury'>;
/**
 * Maximum fee in basis points (10%)
 */
declare const MAX_FEE_BPS = 1000;
/**
 * Basis points divisor
 */
declare const BPS_DIVISOR = 10000n;
/**
 * Check if an operation is free (no fees)
 */
declare function isFreeOperation(operation: OperationType): operation is FreeOperation;
/**
 * Check if an operation requires fees
 */
declare function isFeeableOperation(operation: OperationType): operation is FeeableOperation;
/**
 * Calculate protocol fee for an operation
 *
 * @param amount - The amount to calculate fee for
 * @param operation - The operation type
 * @param config - Protocol fee configuration (or null if not fetched)
 * @returns Fee calculation result
 */
declare function calculateProtocolFee(amount: bigint, operation: OperationType, config: ProtocolFeeConfig | null): FeeCalculation;
/**
 * Get fee basis points for an operation (except swap which uses share of LP fees)
 */
declare function getFeeBps(operation: FeeableOperation, config: ProtocolFeeConfig): number;
/**
 * Calculate swap protocol fee (20% of LP fees)
 *
 * @param swapAmount - Amount being swapped
 * @param lpFeeBps - Pool's LP fee in basis points (e.g., 30 = 0.3%)
 * @param config - Protocol fee configuration
 * @returns Object with protocol fee and remaining LP fee
 */
declare function calculateSwapProtocolFee(swapAmount: bigint, lpFeeBps: number, config: ProtocolFeeConfig | null): {
    protocolFee: bigint;
    lpFeeRemaining: bigint;
    totalLpFee: bigint;
    effectiveFeeBps: number;
};
/**
 * Calculate minimum fee required (rounds up to ensure sufficient fee)
 *
 * @param amount - The amount to calculate fee for
 * @param feeBps - Fee rate in basis points
 * @returns Minimum fee amount
 */
declare function calculateMinimumFee(amount: bigint, feeBps: number): bigint;
/**
 * Verify that a fee amount meets minimum requirements
 *
 * @param amount - The amount the fee is calculated from
 * @param feeAmount - The fee amount to verify
 * @param feeBps - Expected fee rate in basis points
 * @returns True if fee is sufficient
 */
declare function verifyFeeAmount(amount: bigint, feeAmount: bigint, feeBps: number): boolean;
/**
 * Fetch protocol fee configuration from on-chain account
 *
 * @param connection - Solana connection
 * @param programId - Program ID
 * @returns Protocol fee config or null if not initialized
 */
declare function fetchProtocolFeeConfig(connection: Connection, programId?: PublicKey): Promise<ProtocolFeeConfig | null>;
/**
 * Format fee amount for display
 *
 * @param feeAmount - Fee amount in smallest units
 * @param decimals - Token decimals
 * @returns Formatted string
 */
declare function formatFeeAmount(feeAmount: bigint, decimals: number): string;
/**
 * Format fee rate for display
 *
 * @param feeBps - Fee rate in basis points
 * @returns Formatted percentage string
 */
declare function formatFeeRate(feeBps: number): string;
/**
 * Estimate total cost including fees
 *
 * @param amount - The amount to transfer/withdraw
 * @param operation - The operation type
 * @param config - Protocol fee configuration
 * @returns Object with breakdown
 */
declare function estimateTotalCost(amount: bigint, operation: OperationType, config: ProtocolFeeConfig | null): {
    amount: bigint;
    fee: bigint;
    total: bigint;
    feeRate: string;
};

/**
 * Smart Note Selector
 *
 * Intelligently selects notes for transactions based on amount requirements
 * and circuit capabilities. Supports multiple selection strategies.
 */

/**
 * Selection strategy for note selection
 */
type SelectionStrategy = 'greedy' | 'exact' | 'minimize-change' | 'consolidation-aware' | 'smallest-first';
/**
 * Circuit type based on inputs/outputs
 * Note: Only transfer_1x2 is supported for transfers. Use consolidate_3x1 first if multiple inputs needed.
 */
type CircuitType = 'transfer_1x2' | 'consolidate_3x1';
/**
 * Result of note selection
 */
interface NoteSelectionResult {
    /** Selected notes */
    notes: DecryptedNote[];
    /** Total amount of selected notes */
    totalAmount: bigint;
    /** Change amount (total - target) */
    changeAmount: bigint;
    /** Circuit type to use */
    circuitType: CircuitType;
    /** Whether consolidation is recommended before this transfer */
    needsConsolidation: boolean;
    /** Reason if selection failed */
    error?: string;
}
/**
 * Options for note selection
 */
interface NoteSelectionOptions {
    /** Selection strategy (default: greedy) */
    strategy?: SelectionStrategy;
    /** Maximum number of inputs (default: 2) */
    maxInputs?: number;
    /** Include fee in target calculation */
    feeAmount?: bigint;
    /** Dust threshold - notes below this are considered dust (default: 1000 = 0.001 tokens at 6 decimals) */
    dustThreshold?: bigint;
}
/**
 * Fragmentation analysis result
 */
interface FragmentationReport {
    /** Total number of notes */
    totalNotes: number;
    /** Number of dust notes (below threshold) */
    dustNotes: number;
    /** Largest note amount */
    largestNote: bigint;
    /** Smallest note amount */
    smallestNote: bigint;
    /** Total balance across all notes */
    totalBalance: bigint;
    /** Fragmentation score (0-100, higher = more fragmented) */
    fragmentationScore: number;
    /** Whether consolidation is recommended */
    shouldConsolidate: boolean;
}
/**
 * Smart Note Selector
 *
 * Provides intelligent note selection for transactions based on:
 * - Amount requirements
 * - Available circuit types
 * - Privacy considerations
 * - Wallet cleanup (dust consolidation)
 */
declare class SmartNoteSelector {
    private dustThreshold;
    constructor(dustThreshold?: bigint);
    /**
     * Select notes for a transaction
     *
     * @param notes - Available notes to select from
     * @param targetAmount - Amount needed for the transaction
     * @param options - Selection options
     * @returns Selection result with notes, circuit type, and metadata
     */
    selectNotes(notes: DecryptedNote[], targetAmount: bigint, options?: NoteSelectionOptions): NoteSelectionResult;
    /**
     * Greedy selection - select largest notes first
     */
    private selectGreedy;
    /**
     * Exact selection - try to find exact match
     */
    private selectExact;
    /**
     * Minimize change - find combination with smallest change
     */
    private selectMinimizeChange;
    /**
     * Consolidation-aware - prefer using dust notes
     */
    private selectConsolidationAware;
    /**
     * Smallest-first selection - for consolidation operations
     */
    private selectSmallestFirst;
    /**
     * Check if we would succeed with more inputs
     */
    private wouldSucceedWithMoreInputs;
    /**
     * Get circuit type based on number of inputs
     * Note: Only transfer_1x2 is supported. For multiple inputs, consolidate first.
     */
    private getCircuitType;
    /**
     * Get circuit ID for the given circuit type
     */
    getCircuitId(circuitType: CircuitType): string;
    /**
     * Analyze wallet fragmentation
     */
    analyzeFragmentation(notes: DecryptedNote[]): FragmentationReport;
    /**
     * Select notes for consolidation
     *
     * @param notes - Available notes
     * @param maxInputs - Maximum inputs (default: 3 for consolidate_3x1)
     * @returns Notes to consolidate
     */
    selectForConsolidation(notes: DecryptedNote[], maxInputs?: number): DecryptedNote[];
}
declare const noteSelector: SmartNoteSelector;

/**
 * Consolidation Service
 *
 * Helps users manage note fragmentation by consolidating multiple notes
 * into fewer, larger notes. This improves wallet usability and reduces
 * the number of transactions needed for larger transfers.
 */

/**
 * Consolidation suggestion
 */
interface ConsolidationSuggestion {
    /** Notes recommended for consolidation */
    notesToConsolidate: DecryptedNote[];
    /** Total amount after consolidation */
    resultingAmount: bigint;
    /** Number of notes reduced */
    notesReduced: number;
    /** Priority (higher = more important) */
    priority: 'low' | 'medium' | 'high';
    /** Reason for suggestion */
    reason: string;
}
/**
 * Consolidation result
 */
interface ConsolidationResult {
    /** Whether consolidation was successful */
    success: boolean;
    /** New consolidated note (if successful) */
    newNote?: DecryptedNote;
    /** Notes that were consolidated */
    consolidatedNotes: DecryptedNote[];
    /** Transaction signature */
    signature?: string;
    /** Error message (if failed) */
    error?: string;
}
/**
 * Consolidation batch
 */
interface ConsolidationBatch {
    /** Notes in this batch */
    notes: DecryptedNote[];
    /** Total amount */
    totalAmount: bigint;
    /** Batch number (for multi-batch consolidation) */
    batchNumber: number;
}
/**
 * Options for consolidation
 */
interface ConsolidationOptions {
    /** Target number of notes after consolidation (default: 1) */
    targetNoteCount?: number;
    /** Maximum notes to consolidate per transaction (default: 3) */
    maxNotesPerBatch?: number;
    /** Dust threshold for prioritizing small notes (default: 1000) */
    dustThreshold?: bigint;
    /** Output stealth pubkey (required for creating new note) */
    outputStealthPubkey?: Point;
    /** Output ephemeral pubkey (required for stealth addresses) */
    outputEphemeralPubkey?: Point;
}
/**
 * Consolidation Service
 *
 * Provides tools for analyzing and executing note consolidation:
 * - Analyze fragmentation level
 * - Suggest consolidation opportunities
 * - Plan multi-batch consolidation
 * - Execute consolidation transactions
 */
declare class ConsolidationService {
    private noteSelector;
    private dustThreshold;
    constructor(dustThreshold?: bigint);
    /**
     * Analyze note fragmentation
     *
     * @param notes - Notes to analyze
     * @returns Fragmentation report
     */
    analyzeNotes(notes: DecryptedNote[]): FragmentationReport;
    /**
     * Suggest consolidation opportunities
     *
     * @param notes - Available notes
     * @param options - Consolidation options
     * @returns Array of consolidation suggestions
     */
    suggestConsolidation(notes: DecryptedNote[], options?: ConsolidationOptions): ConsolidationSuggestion[];
    /**
     * Plan consolidation into batches
     *
     * For many notes, multiple consolidation transactions may be needed.
     * This method plans the batches to minimize the number of transactions.
     *
     * @param notes - Notes to consolidate
     * @param options - Consolidation options
     * @returns Array of consolidation batches
     */
    planConsolidation(notes: DecryptedNote[], options?: ConsolidationOptions): ConsolidationBatch[];
    /**
     * Get optimal notes for a single consolidation transaction
     *
     * @param notes - Available notes
     * @param maxInputs - Maximum inputs (default: 3)
     * @returns Notes to consolidate in this batch
     */
    selectForConsolidation(notes: DecryptedNote[], maxInputs?: number): DecryptedNote[];
    /**
     * Check if consolidation is recommended
     *
     * @param notes - Notes to check
     * @returns Whether consolidation is recommended
     */
    shouldConsolidate(notes: DecryptedNote[]): boolean;
    /**
     * Get consolidation summary for UI
     *
     * @param notes - Notes to analyze
     * @returns Summary object for display
     */
    getConsolidationSummary(notes: DecryptedNote[]): {
        totalNotes: number;
        dustNotes: number;
        totalBalance: bigint;
        shouldConsolidate: boolean;
        estimatedBatches: number;
        message: string;
    };
    /**
     * Estimate gas cost for consolidation
     *
     * @param numInputs - Number of input notes
     * @returns Estimated cost in lamports
     */
    estimateConsolidationCost(numInputs: number): bigint;
}
declare const consolidationService: ConsolidationService;

/**
 * Auto-consolidation configuration
 */
interface AutoConsolidationConfig {
    /** Enable auto-consolidation */
    enabled: boolean;
    /** Fragmentation score threshold to trigger consolidation (0-100, default: 60) */
    fragmentationThreshold?: number;
    /** Maximum number of notes before triggering consolidation (default: 8) */
    maxNoteCount?: number;
    /** Maximum dust notes before triggering consolidation (default: 3) */
    maxDustNotes?: number;
    /** Dust threshold in smallest units (default: 1000) */
    dustThreshold?: bigint;
    /** Minimum delay between consolidation checks in ms (default: 60000) */
    checkIntervalMs?: number;
    /** Callback when consolidation is recommended */
    onConsolidationRecommended?: (report: FragmentationReport) => void;
    /** Callback when consolidation starts */
    onConsolidationStart?: () => void;
    /** Callback when consolidation completes */
    onConsolidationComplete?: (success: boolean, error?: string) => void;
}
/**
 * Auto-consolidation state
 */
interface AutoConsolidationState {
    /** Whether auto-consolidation is enabled */
    enabled: boolean;
    /** Last check timestamp */
    lastCheckAt: number | null;
    /** Whether consolidation is currently running */
    isConsolidating: boolean;
    /** Last fragmentation report */
    lastReport: FragmentationReport | null;
    /** Whether consolidation is currently recommended */
    isRecommended: boolean;
}
/**
 * Auto-Consolidator class
 *
 * Monitors note fragmentation and triggers consolidation when needed.
 * Can be run in background mode or manually triggered.
 */
declare class AutoConsolidator {
    private config;
    private service;
    private state;
    private checkInterval;
    private noteProvider;
    constructor(config?: AutoConsolidationConfig);
    /**
     * Set the note provider function
     *
     * The provider is called periodically to get fresh notes for analysis.
     */
    setNoteProvider(provider: () => DecryptedNote[]): void;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<AutoConsolidationConfig>): void;
    /**
     * Start background monitoring
     */
    start(): void;
    /**
     * Stop background monitoring
     */
    stop(): void;
    /**
     * Perform a manual check
     */
    check(): FragmentationReport | null;
    /**
     * Check if consolidation should be triggered
     */
    private shouldConsolidate;
    /**
     * Get current state
     */
    getState(): AutoConsolidationState;
    /**
     * Get the last fragmentation report
     */
    getLastReport(): FragmentationReport | null;
    /**
     * Check if consolidation is currently recommended
     */
    isConsolidationRecommended(): boolean;
    /**
     * Get consolidation suggestions based on current notes
     */
    getSuggestions(): ConsolidationSuggestion[];
    /**
     * Estimate the cost of consolidation
     */
    estimateCost(): bigint;
}
/**
 * Get or create the global auto-consolidator instance
 */
declare function getAutoConsolidator(config?: AutoConsolidationConfig): AutoConsolidator;
/**
 * Enable auto-consolidation globally
 */
declare function enableAutoConsolidation(config?: Omit<AutoConsolidationConfig, 'enabled'>): AutoConsolidator;
/**
 * Disable auto-consolidation globally
 */
declare function disableAutoConsolidation(): void;

/**
 * CloakCraft Perpetual Futures Types
 *
 * Types for the lending-based perpetual futures system.
 */

/** Maximum number of tokens supported in a perps pool */
declare const MAX_PERPS_TOKENS = 8;
/** Token configuration in a perps pool */
interface PerpsToken {
    /** Token mint */
    mint: PublicKey;
    /** Token vault PDA */
    vault: PublicKey;
    /** Price oracle */
    oracle: PublicKey;
    /** Total balance in pool */
    balance: bigint;
    /** Amount locked in positions */
    locked: bigint;
    /** Cumulative borrow fee (scaled by 1e18) */
    cumulativeBorrowFee: bigint;
    /** Last fee update timestamp */
    lastFeeUpdate: number;
    /** Token decimals */
    decimals: number;
    /** Is active */
    isActive: boolean;
}
/** Perps pool state */
interface PerpsPoolState {
    /** Pool ID */
    poolId: PublicKey;
    /** LP token mint */
    lpMint: PublicKey;
    /** LP token supply */
    lpSupply: bigint;
    /** Pool authority */
    authority: PublicKey;
    /** Number of tokens in pool */
    numTokens: number;
    /** Token configurations */
    tokens: PerpsToken[];
    /** Max leverage (e.g., 100 for 100x) */
    maxLeverage: number;
    /** Position fee in basis points */
    positionFeeBps: number;
    /** Max utilization in basis points (e.g., 8000 for 80%) */
    maxUtilizationBps: number;
    /** Liquidation threshold in basis points */
    liquidationThresholdBps: number;
    /** Liquidation penalty in basis points */
    liquidationPenaltyBps: number;
    /** Base borrow rate in basis points (per hour) */
    baseBorrowRateBps: number;
    /** Is pool active */
    isActive: boolean;
    /** PDA bump */
    bump: number;
}
/** Perps market state (trading pair) */
interface PerpsMarketState {
    /** Market ID */
    marketId: Uint8Array;
    /** Parent pool */
    pool: PublicKey;
    /** Base token index in pool */
    baseTokenIndex: number;
    /** Quote token index in pool */
    quoteTokenIndex: number;
    /** Long open interest */
    longOpenInterest: bigint;
    /** Short open interest */
    shortOpenInterest: bigint;
    /** Max position size */
    maxPositionSize: bigint;
    /** Is market active */
    isActive: boolean;
    /** PDA bump */
    bump: number;
}
/** Position direction */
type PositionDirection = 'long' | 'short';
/** Position data (stored in commitment) */
interface PerpsPosition {
    /** Position commitment */
    commitment: Uint8Array;
    /** Market */
    market: PublicKey;
    /** Direction */
    direction: PositionDirection;
    /** Margin amount */
    margin: bigint;
    /** Position size (margin * leverage) */
    size: bigint;
    /** Leverage multiplier */
    leverage: number;
    /** Entry price */
    entryPrice: bigint;
    /** Cumulative borrow fee at entry (for fee calculation) */
    entryBorrowFee: bigint;
    /** Entry timestamp */
    entryTimestamp: number;
    /** Leaf index in merkle tree */
    leafIndex: number;
    /** Stealth ephemeral pubkey (for spending) */
    stealthEphemeralPubkey?: {
        x: FieldElement;
        y: FieldElement;
    };
}
/** Decoded position from encrypted note */
interface DecryptedPerpsPosition extends PerpsPosition {
    /** Account hash for Light Protocol */
    accountHash?: string;
}
/** Open position parameters */
interface OpenPositionParams {
    /** Input note (margin source) */
    input: PreparedInput;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Market to trade */
    market: PublicKey;
    /** Position direction */
    direction: PositionDirection;
    /** Margin amount to use */
    margin: bigint;
    /** Leverage multiplier (1-100) */
    leverage: number;
    /** Entry price from oracle */
    entryPrice: bigint;
    /** Recipient for position commitment */
    positionRecipient: StealthAddress;
    /** Recipient for change (input - margin - fee) */
    changeRecipient: StealthAddress;
    /** Merkle root for input */
    merkleRoot: Uint8Array;
    /** Merkle path elements */
    merklePath: Uint8Array[];
    /** Merkle path indices */
    merkleIndices: number[];
    /** Optional progress callback */
    onProgress?: (stage: TransferProgressStage) => void;
}
/** Close position parameters */
interface ClosePositionParams$1 {
    /** Position note to close */
    position: DecryptedPerpsPosition;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Market */
    market: PublicKey;
    /** Exit price from oracle */
    exitPrice: bigint;
    /** Recipient for settlement (margin + PnL) */
    settlementRecipient: StealthAddress;
    /** Merkle root for position */
    merkleRoot: Uint8Array;
    /** Merkle path elements */
    merklePath: Uint8Array[];
    /** Merkle path indices */
    merkleIndices: number[];
    /** Optional progress callback */
    onProgress?: (stage: TransferProgressStage) => void;
}
/** Add perps liquidity parameters */
interface AddPerpsLiquidityParams {
    /** Input note (single token) */
    input: PreparedInput;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Token index in pool */
    tokenIndex: number;
    /** Amount to deposit */
    depositAmount: bigint;
    /** LP tokens to receive */
    lpAmount: bigint;
    /** Recipient for LP tokens */
    lpRecipient: StealthAddress;
    /** Recipient for change (input - deposit) */
    changeRecipient: StealthAddress;
    /** Merkle root for input */
    merkleRoot: Uint8Array;
    /** Merkle path elements */
    merklePath: Uint8Array[];
    /** Merkle path indices */
    merkleIndices: number[];
    /** Current oracle prices for all tokens */
    oraclePrices: bigint[];
    /** Optional progress callback */
    onProgress?: (stage: TransferProgressStage) => void;
}
/** Remove perps liquidity parameters */
interface RemovePerpsLiquidityParams {
    /** LP token note */
    lpInput: PreparedInput;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Token index to withdraw */
    tokenIndex: number;
    /** LP tokens to burn */
    lpAmount: bigint;
    /** Amount to withdraw */
    withdrawAmount: bigint;
    /** Recipient for withdrawn tokens */
    outputRecipient: StealthAddress;
    /** Recipient for LP change (if any) */
    lpChangeRecipient: StealthAddress;
    /** Merkle root for LP input */
    merkleRoot: Uint8Array;
    /** Merkle path elements */
    merklePath: Uint8Array[];
    /** Merkle path indices */
    merkleIndices: number[];
    /** Current oracle prices for all tokens */
    oraclePrices: bigint[];
    /** Optional progress callback */
    onProgress?: (stage: TransferProgressStage) => void;
}
/** Liquidate position parameters */
interface LiquidatePositionParams {
    /** Position to liquidate */
    position: DecryptedPerpsPosition;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Market */
    market: PublicKey;
    /** Current price from oracle */
    currentPrice: bigint;
    /** Keeper/liquidator receiving reward */
    liquidatorRecipient: StealthAddress;
    /** Position owner receiving remainder */
    ownerRecipient: StealthAddress;
    /** Merkle root for position */
    merkleRoot: Uint8Array;
    /** Merkle path elements */
    merklePath: Uint8Array[];
    /** Merkle path indices */
    merkleIndices: number[];
}
/** Open position proof result */
interface OpenPositionProofResult {
    proof: Uint8Array;
    nullifier: Uint8Array;
    positionCommitment: Uint8Array;
    changeCommitment: Uint8Array;
    positionRandomness: Uint8Array;
    changeRandomness: Uint8Array;
    positionFee: bigint;
}
/** Close position proof result */
interface ClosePositionProofResult {
    proof: Uint8Array;
    positionNullifier: Uint8Array;
    settlementCommitment: Uint8Array;
    settlementRandomness: Uint8Array;
    pnlAmount: bigint;
    isProfit: boolean;
    closeFee: bigint;
}
/** Add perps liquidity proof result */
interface AddPerpsLiquidityProofResult {
    proof: Uint8Array;
    nullifier: Uint8Array;
    lpCommitment: Uint8Array;
    changeCommitment: Uint8Array;
    lpRandomness: Uint8Array;
    changeRandomness: Uint8Array;
    feeAmount: bigint;
}
/** Remove perps liquidity proof result */
interface RemovePerpsLiquidityProofResult {
    proof: Uint8Array;
    lpNullifier: Uint8Array;
    outputCommitment: Uint8Array;
    lpChangeCommitment: Uint8Array;
    outputRandomness: Uint8Array;
    lpChangeRandomness: Uint8Array;
    feeAmount: bigint;
}
/** Liquidate position proof result */
interface LiquidateProofResult {
    proof: Uint8Array;
    positionNullifier: Uint8Array;
    ownerCommitment: Uint8Array;
    liquidatorCommitment: Uint8Array;
    ownerRandomness: Uint8Array;
    liquidatorRandomness: Uint8Array;
    liquidatorReward: bigint;
    ownerRemainder: bigint;
}
/** PnL calculation result */
interface PnLResult {
    /** Raw PnL amount (positive = profit, negative = loss) */
    pnl: bigint;
    /** Is position in profit */
    isProfit: boolean;
    /** PnL percentage (scaled by 10000, e.g., 500 = 5%) */
    pnlBps: number;
    /** Effective margin after PnL */
    effectiveMargin: bigint;
    /** Accumulated borrow fees */
    borrowFees: bigint;
    /** Total settlement amount */
    settlementAmount: bigint;
    /** Is position at profit bound (PnL >= margin) */
    atProfitBound: boolean;
    /** Is position liquidatable */
    isLiquidatable: boolean;
}
/** Liquidation price result */
interface LiquidationPriceResult {
    /** Liquidation price */
    price: bigint;
    /** Distance from current price in basis points */
    distanceBps: number;
}
/** LP value calculation result */
interface LpValueResult {
    /** Total value in USD (scaled by 1e6) */
    totalValueUsd: bigint;
    /** Value per LP token */
    valuePerLp: bigint;
    /** Token balances and values */
    tokenValues: {
        mint: PublicKey;
        balance: bigint;
        priceUsd: bigint;
        valueUsd: bigint;
    }[];
}
/** Withdrawable amount result */
interface WithdrawableResult {
    /** Max withdrawable amount of requested token */
    maxAmount: bigint;
    /** Current utilization after withdrawal */
    utilizationAfter: number;
    /** LP tokens required to burn */
    lpRequired: bigint;
}

/**
 * CloakCraft Perpetual Futures Calculations
 *
 * PnL, liquidation price, LP value, and other perps-related calculations.
 */

/**
 * Calculate position PnL
 *
 * @param position - The position to calculate PnL for
 * @param currentPrice - Current oracle price
 * @param pool - Perps pool state
 * @param currentTimestamp - Current timestamp for borrow fee calculation
 */
declare function calculatePnL(position: PerpsPosition, currentPrice: bigint, pool: PerpsPoolState, currentTimestamp: number): PnLResult;
/**
 * Calculate accumulated borrow fees for a position
 *
 * @param position - The position
 * @param pool - Perps pool state
 * @param currentTimestamp - Current timestamp
 */
declare function calculateBorrowFees(position: PerpsPosition, pool: PerpsPoolState, currentTimestamp: number): bigint;
/**
 * Calculate liquidation price for a position
 *
 * @param position - The position
 * @param pool - Perps pool state
 * @param currentTimestamp - Current timestamp for fee estimation
 */
declare function calculateLiquidationPrice(position: PerpsPosition, pool: PerpsPoolState, currentTimestamp: number): LiquidationPriceResult;
/**
 * Calculate position fee
 *
 * @param positionSize - Size of the position
 * @param feeBps - Fee in basis points
 */
declare function calculatePositionFee(positionSize: bigint, feeBps: number): bigint;
/**
 * Calculate imbalance fee for opening a position
 *
 * @param market - Market state
 * @param positionSize - Size of position being opened
 * @param isLong - Whether opening a long
 */
declare function calculateImbalanceFee(market: PerpsMarketState, positionSize: bigint, isLong: boolean): bigint;
/**
 * Calculate total pool value and LP token value
 *
 * @param pool - Perps pool state
 * @param oraclePrices - Current oracle prices for each token (USD, scaled by 1e6)
 */
declare function calculateLpValue(pool: PerpsPoolState, oraclePrices: bigint[]): LpValueResult;
/**
 * Calculate LP tokens to mint for a deposit
 *
 * @param pool - Perps pool state
 * @param depositAmount - Amount of token to deposit
 * @param tokenIndex - Index of token being deposited
 * @param oraclePrices - Current oracle prices
 */
declare function calculateLpMintAmount(pool: PerpsPoolState, depositAmount: bigint, tokenIndex: number, oraclePrices: bigint[]): bigint;
/**
 * Calculate token amount for LP withdrawal
 *
 * @param pool - Perps pool state
 * @param lpAmount - Amount of LP tokens to burn
 * @param tokenIndex - Index of token to withdraw
 * @param oraclePrices - Current oracle prices
 */
declare function calculateWithdrawAmount(pool: PerpsPoolState, lpAmount: bigint, tokenIndex: number, oraclePrices: bigint[]): bigint;
/**
 * Calculate maximum withdrawable amount for a token
 *
 * @param pool - Perps pool state
 * @param tokenIndex - Index of token to withdraw
 * @param lpAmount - Amount of LP tokens to burn
 * @param oraclePrices - Current oracle prices
 */
declare function calculateMaxWithdrawable(pool: PerpsPoolState, tokenIndex: number, lpAmount: bigint, oraclePrices: bigint[]): WithdrawableResult;
/**
 * Calculate token utilization rate
 *
 * @param token - Token state
 */
declare function calculateUtilization(token: {
    balance: bigint;
    locked: bigint;
}): number;
/**
 * Calculate borrow rate based on utilization
 *
 * @param utilization - Current utilization (basis points, 0-10000)
 * @param baseBorrowRateBps - Base borrow rate in bps
 */
declare function calculateBorrowRate(utilization: number, baseBorrowRateBps: number): number;
/**
 * Check if a leverage is valid
 */
declare function isValidLeverage(leverage: number, maxLeverage: number): boolean;
/**
 * Check if utilization would exceed limit after an operation
 */
declare function wouldExceedUtilization(token: {
    balance: bigint;
    locked: bigint;
}, additionalLock: bigint, maxUtilizationBps: number): boolean;
/**
 * Validate position size against market limits
 */
declare function isValidPositionSize(positionSize: bigint, market: PerpsMarketState): boolean;

/**
 * CloakCraft Perpetual Futures Instruction Builders
 *
 * Multi-phase instruction builders for perps operations.
 * Follows the append pattern for complex operations.
 */

declare const PERPS_SEEDS: {
    readonly PERPS_POOL: Buffer<ArrayBuffer>;
    readonly PERPS_MARKET: Buffer<ArrayBuffer>;
    readonly PERPS_VAULT: Buffer<ArrayBuffer>;
    readonly PERPS_LP_MINT: Buffer<ArrayBuffer>;
};
declare const PERPS_CIRCUIT_IDS: {
    readonly OPEN_POSITION: "perps_open_position";
    readonly CLOSE_POSITION: "perps_close_position";
    readonly ADD_LIQUIDITY: "perps_add_liquidity";
    readonly REMOVE_LIQUIDITY: "perps_remove_liquidity";
    readonly LIQUIDATE: "perps_liquidate";
};
/**
 * Derive perps pool PDA
 */
declare function derivePerpsPoolPda(poolId: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derive perps market PDA
 */
declare function derivePerpsMarketPda(perpsPool: PublicKey, marketId: Uint8Array, programId?: PublicKey): [PublicKey, number];
/**
 * Derive perps vault PDA for a token
 */
declare function derivePerpsVaultPda(perpsPool: PublicKey, tokenMint: PublicKey, programId?: PublicKey): [PublicKey, number];
/**
 * Derive perps LP mint PDA
 */
declare function derivePerpsLpMintPda(perpsPool: PublicKey, programId?: PublicKey): [PublicKey, number];
/** Light params for verify commitment */
interface LightVerifyParams {
    commitmentAccountHash: number[];
    commitmentMerkleContext: {
        merkleTreePubkeyIndex: number;
        queuePubkeyIndex: number;
        leafIndex: number;
        rootIndex: number;
    };
    commitmentInclusionProof: {
        a: number[];
        b: number[];
        c: number[];
    };
    commitmentAddressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
        rootIndex: number;
    };
}
/** Light params for create nullifier */
interface LightNullifierParams {
    proof: {
        a: number[];
        b: number[];
        c: number[];
    };
    addressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
        rootIndex: number;
    };
    outputTreeIndex: number;
}
interface OpenPositionInstructionParams {
    /** Settlement pool (where margin comes from and change goes to) */
    settlementPool: PublicKey;
    /** Position pool (where position commitments are stored) */
    positionPool: PublicKey;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Market */
    market: PublicKey;
    /** Market ID (32 bytes, for position note encryption and commitment) */
    marketId: Uint8Array;
    /** Pyth price update account for the base token */
    priceUpdate: PublicKey;
    /** ZK proof */
    proof: Uint8Array;
    /** Merkle root */
    merkleRoot: Uint8Array;
    /** Input commitment (margin) */
    inputCommitment: Uint8Array;
    /** Nullifier */
    nullifier: Uint8Array;
    /** Position commitment */
    positionCommitment: Uint8Array;
    /** Change commitment (0x00...00 if no change) */
    changeCommitment: Uint8Array;
    /** Is long position */
    isLong: boolean;
    /** Margin amount */
    marginAmount: bigint;
    /** Position size (margin * leverage) */
    positionSize: bigint;
    /** Leverage */
    leverage: number;
    /** Position fee */
    positionFee: bigint;
    /** Entry price */
    entryPrice: bigint;
    /** Relayer/payer */
    relayer: PublicKey;
    /** Position stealth address for encryption */
    positionRecipient: StealthAddress;
    /** Change stealth address */
    changeRecipient: StealthAddress;
    /** Position randomness (from proof generation) */
    positionRandomness: Uint8Array;
    /** Change randomness */
    changeRandomness: Uint8Array;
    /** Change amount */
    changeAmount: bigint;
    /** Token mint for margin */
    tokenMint: PublicKey;
    /** Input note's stealthPubX (circuit uses this for position commitment) */
    inputStealthPubX: Uint8Array;
    /** Light params for verify commitment */
    lightVerifyParams: LightVerifyParams;
    /** Light params for create nullifier */
    lightNullifierParams: LightNullifierParams;
    /** Remaining accounts for Light Protocol */
    remainingAccounts: {
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
    }[];
}
/**
 * Build open position multi-phase instructions
 */
declare function buildOpenPositionWithProgram(program: Program, params: OpenPositionInstructionParams): Promise<{
    tx: any;
    phase1Tx: any;
    phase2Tx: any;
    phase3Tx: any;
    operationId: Uint8Array;
    pendingCommitments: PendingCommitmentData[];
}>;
interface ClosePositionInstructionParams {
    /** Position pool (where position commitment is read from) */
    positionPool: PublicKey;
    /** Settlement pool (where settlement commitment goes) */
    settlementPool: PublicKey;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Market */
    market: PublicKey;
    /** Pyth price update account for the base token */
    priceUpdate: PublicKey;
    /** ZK proof */
    proof: Uint8Array;
    /** Merkle root */
    merkleRoot: Uint8Array;
    /** Position commitment */
    positionCommitment: Uint8Array;
    /** Position nullifier */
    positionNullifier: Uint8Array;
    /** Settlement commitment */
    settlementCommitment: Uint8Array;
    /** Is long */
    isLong: boolean;
    /** Exit price */
    exitPrice: bigint;
    /** Close fee */
    closeFee: bigint;
    /** PnL amount */
    pnlAmount: bigint;
    /** Is profit */
    isProfit: boolean;
    /** Position margin */
    positionMargin: bigint;
    /** Position size */
    positionSize: bigint;
    /** Entry price */
    entryPrice: bigint;
    /** Relayer */
    relayer: PublicKey;
    /** Settlement recipient */
    settlementRecipient: StealthAddress;
    /** Settlement randomness */
    settlementRandomness: Uint8Array;
    /** Settlement amount */
    settlementAmount: bigint;
    /** Token mint */
    tokenMint: PublicKey;
    /** Light verify params */
    lightVerifyParams: LightVerifyParams;
    /** Light nullifier params */
    lightNullifierParams: LightNullifierParams;
    /** Remaining accounts */
    remainingAccounts: {
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
    }[];
}
/**
 * Build close position multi-phase instructions
 */
declare function buildClosePositionWithProgram(program: Program, params: ClosePositionInstructionParams): Promise<{
    tx: any;
    phase1Tx: any;
    phase2Tx: any;
    phase3Tx: any;
    operationId: Uint8Array;
    pendingCommitments: PendingCommitmentData[];
}>;
interface AddPerpsLiquidityInstructionParams {
    /** Deposit token pool */
    depositPool: PublicKey;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Perps pool ID (32 bytes, for LP note encryption) */
    perpsPoolId: Uint8Array;
    /** Pyth price update account for the deposit token */
    priceUpdate: PublicKey;
    /** LP mint for LP tokens */
    lpMintAccount: PublicKey;
    /** Token vault for the deposited token */
    tokenVault: PublicKey;
    /** ZK proof */
    proof: Uint8Array;
    /** Merkle root */
    merkleRoot: Uint8Array;
    /** Input commitment */
    inputCommitment: Uint8Array;
    /** Nullifier */
    nullifier: Uint8Array;
    /** LP commitment */
    lpCommitment: Uint8Array;
    /** Token index */
    tokenIndex: number;
    /** Deposit amount */
    depositAmount: bigint;
    /** LP amount to mint */
    lpAmountMinted: bigint;
    /** Fee amount */
    feeAmount: bigint;
    /** Oracle prices for all tokens (8 elements) */
    oraclePrices: bigint[];
    /** Relayer */
    relayer: PublicKey;
    /** LP recipient */
    lpRecipient: StealthAddress;
    /** LP randomness */
    lpRandomness: Uint8Array;
    /** Token mint */
    tokenMint: PublicKey;
    /** LP mint */
    lpMint: PublicKey;
    /** Light verify params */
    lightVerifyParams: LightVerifyParams;
    /** Light nullifier params */
    lightNullifierParams: LightNullifierParams;
    /** Remaining accounts */
    remainingAccounts: {
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
    }[];
}
/**
 * Build add perps liquidity multi-phase instructions
 */
declare function buildAddPerpsLiquidityWithProgram(program: Program, params: AddPerpsLiquidityInstructionParams): Promise<{
    tx: any;
    phase1Tx: any;
    phase2Tx: any;
    phase3Tx: any;
    operationId: Uint8Array;
    pendingCommitments: PendingCommitmentData[];
}>;
interface RemovePerpsLiquidityInstructionParams {
    /** Withdrawal token pool */
    withdrawalPool: PublicKey;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Perps pool ID (32 bytes, for LP note encryption) */
    perpsPoolId: Uint8Array;
    /** Pyth price update account for the withdrawal token */
    priceUpdate: PublicKey;
    /** LP mint for LP tokens */
    lpMintAccount: PublicKey;
    /** Token vault for the withdrawal token */
    tokenVault: PublicKey;
    /** ZK proof */
    proof: Uint8Array;
    /** Merkle root */
    merkleRoot: Uint8Array;
    /** LP commitment */
    lpCommitment: Uint8Array;
    /** LP nullifier */
    lpNullifier: Uint8Array;
    /** Output commitment */
    outputCommitment: Uint8Array;
    /** Change LP commitment */
    changeLpCommitment: Uint8Array;
    /** Token index to withdraw */
    tokenIndex: number;
    /** Withdraw amount */
    withdrawAmount: bigint;
    /** LP amount to burn */
    lpAmountBurned: bigint;
    /** Fee amount */
    feeAmount: bigint;
    /** Oracle prices */
    oraclePrices: bigint[];
    /** Relayer */
    relayer: PublicKey;
    /** Output recipient */
    outputRecipient: StealthAddress;
    /** LP change recipient */
    lpChangeRecipient: StealthAddress;
    /** Output randomness */
    outputRandomness: Uint8Array;
    /** LP change randomness */
    lpChangeRandomness: Uint8Array;
    /** Token mint */
    tokenMint: PublicKey;
    /** LP mint */
    lpMint: PublicKey;
    /** LP change amount */
    lpChangeAmount: bigint;
    /** Light verify params */
    lightVerifyParams: LightVerifyParams;
    /** Light nullifier params */
    lightNullifierParams: LightNullifierParams;
    /** Remaining accounts */
    remainingAccounts: {
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
    }[];
}
/**
 * Build remove perps liquidity multi-phase instructions
 */
declare function buildRemovePerpsLiquidityWithProgram(program: Program, params: RemovePerpsLiquidityInstructionParams): Promise<{
    tx: any;
    phase1Tx: any;
    phase2Tx: any;
    phase3Tx: any;
    operationId: Uint8Array;
    pendingCommitments: PendingCommitmentData[];
}>;
interface InitializePerpsPoolParams {
    poolId: PublicKey;
    authority: PublicKey;
    payer: PublicKey;
    maxLeverage?: number;
    positionFeeBps?: number;
    maxUtilizationBps?: number;
    liquidationThresholdBps?: number;
    liquidationPenaltyBps?: number;
    baseBorrowRateBps?: number;
}
/**
 * Build initialize perps pool instruction
 */
declare function buildInitializePerpsPoolWithProgram(program: Program, params: InitializePerpsPoolParams): Promise<{
    tx: any;
}>;
interface AddTokenToPoolParams {
    perpsPool: PublicKey;
    tokenMint: PublicKey;
    /** Pyth price feed ID (32 bytes) for this token */
    pythFeedId: Uint8Array;
    authority: PublicKey;
    payer: PublicKey;
}
/**
 * Build add token to pool instruction
 *
 * @param program - Anchor program instance
 * @param params - Instruction parameters including Pyth feed ID
 */
declare function buildAddTokenToPoolWithProgram(program: Program, params: AddTokenToPoolParams): Promise<{
    tx: any;
}>;
interface AddMarketParams {
    perpsPool: PublicKey;
    marketId: Uint8Array;
    baseTokenIndex: number;
    quoteTokenIndex: number;
    maxPositionSize: bigint;
    authority: PublicKey;
    payer: PublicKey;
}
/**
 * Build add market instruction
 */
declare function buildAddMarketWithProgram(program: Program, params: AddMarketParams): Promise<{
    tx: any;
}>;
/** Parameters that can be updated on a perps pool */
interface UpdatePoolConfigParams {
    perpsPool: PublicKey;
    authority: PublicKey;
    /** Maximum leverage (1-100), undefined to keep current */
    maxLeverage?: number;
    /** Position fee in basis points, undefined to keep current */
    positionFeeBps?: number;
    /** Maximum utilization per token in basis points, undefined to keep current */
    maxUtilizationBps?: number;
    /** Liquidation threshold in basis points, undefined to keep current */
    liquidationThresholdBps?: number;
    /** Liquidation penalty in basis points, undefined to keep current */
    liquidationPenaltyBps?: number;
    /** Base borrow rate per hour in basis points, undefined to keep current */
    baseBorrowRateBps?: number;
    /** Maximum imbalance fee in basis points, undefined to keep current */
    maxImbalanceFeeBps?: number;
    /** Pool active status (true = active, false = paused), undefined to keep current */
    isActive?: boolean;
}
/**
 * Build update pool config instruction
 *
 * Allows admin to update pool parameters such as fees, leverage limits, etc.
 * Pass undefined for any parameter to keep its current value.
 *
 * @example
 * ```ts
 * // Pause the pool
 * const { tx } = await buildUpdatePoolConfigWithProgram(program, {
 *   perpsPool,
 *   authority: wallet.publicKey,
 *   isActive: false,
 * });
 *
 * // Update fees and leverage
 * const { tx } = await buildUpdatePoolConfigWithProgram(program, {
 *   perpsPool,
 *   authority: wallet.publicKey,
 *   maxLeverage: 50,
 *   positionFeeBps: 10,
 * });
 * ```
 */
declare function buildUpdatePoolConfigWithProgram(program: Program, params: UpdatePoolConfigParams): Promise<{
    tx: any;
}>;
interface UpdateTokenStatusParams {
    perpsPool: PublicKey;
    authority: PublicKey;
    /** Token index in the pool (0-7) */
    tokenIndex: number;
    /** Whether the token should be active */
    isActive: boolean;
}
/**
 * Build update token status instruction
 *
 * Allows admin to pause/unpause a specific token in the pool.
 * Paused tokens cannot be used for new positions or liquidity operations.
 *
 * @example
 * ```ts
 * // Pause token at index 1
 * const { tx } = await buildUpdateTokenStatusWithProgram(program, {
 *   perpsPool,
 *   authority: wallet.publicKey,
 *   tokenIndex: 1,
 *   isActive: false,
 * });
 * ```
 */
declare function buildUpdateTokenStatusWithProgram(program: Program, params: UpdateTokenStatusParams): Promise<{
    tx: any;
}>;
interface UpdateMarketStatusParams {
    perpsPool: PublicKey;
    market: PublicKey;
    authority: PublicKey;
    /** Whether the market should be active */
    isActive: boolean;
}
/**
 * Build update market status instruction
 *
 * Allows admin to pause/unpause a specific market.
 * Paused markets cannot accept new positions but existing positions can still be closed.
 *
 * @example
 * ```ts
 * // Pause the SOL-PERP market
 * const { tx } = await buildUpdateMarketStatusWithProgram(program, {
 *   perpsPool,
 *   market: solPerpMarket,
 *   authority: wallet.publicKey,
 *   isActive: false,
 * });
 * ```
 */
declare function buildUpdateMarketStatusWithProgram(program: Program, params: UpdateMarketStatusParams): Promise<{
    tx: any;
}>;
/**
 * Build update borrow fees instruction
 */
declare function buildUpdateBorrowFeesWithProgram(program: Program, perpsPool: PublicKey, keeper: PublicKey): Promise<{
    tx: any;
}>;
interface LiquidatePositionInstructionParams {
    /** Settlement pool (where position margin comes from) */
    settlementPool: PublicKey;
    /** Perps pool */
    perpsPool: PublicKey;
    /** Market */
    market: PublicKey;
    /** Oracle for current price */
    oracle: PublicKey;
    /** ZK proof */
    proof: Uint8Array;
    /** Merkle root */
    merkleRoot: Uint8Array;
    /** Position commitment being liquidated */
    positionCommitment: Uint8Array;
    /** Position nullifier */
    positionNullifier: Uint8Array;
    /** Owner's remainder commitment (margin - loss - penalty) */
    ownerCommitment: Uint8Array;
    /** Liquidator's reward commitment */
    liquidatorCommitment: Uint8Array;
    /** Current price from oracle */
    currentPrice: bigint;
    /** Liquidator reward amount */
    liquidatorReward: bigint;
    /** Owner remainder amount */
    ownerRemainder: bigint;
    /** Position margin */
    positionMargin: bigint;
    /** Position size */
    positionSize: bigint;
    /** Is long position */
    isLong: boolean;
    /** Keeper/liquidator */
    keeper: PublicKey;
    /** Owner stealth address (for remainder commitment) */
    ownerRecipient: StealthAddress;
    /** Liquidator stealth address (for reward commitment) */
    liquidatorRecipient: StealthAddress;
    /** Owner randomness */
    ownerRandomness: Uint8Array;
    /** Liquidator randomness */
    liquidatorRandomness: Uint8Array;
    /** Token mint */
    tokenMint: PublicKey;
    /** Light verify params */
    lightVerifyParams: LightVerifyParams;
    /** Light nullifier params */
    lightNullifierParams: LightNullifierParams;
    /** Remaining accounts */
    remainingAccounts: {
        pubkey: PublicKey;
        isSigner: boolean;
        isWritable: boolean;
    }[];
}
/**
 * Build liquidate position multi-phase instructions
 *
 * Liquidation can happen when:
 * 1. Position is underwater (effective margin < liquidation threshold)
 * 2. Position hit profit bound (PnL >= margin, 100% gain)
 *
 * Liquidator receives penalty as reward, owner receives remainder.
 */
declare function buildLiquidatePositionWithProgram(program: Program, params: LiquidatePositionInstructionParams): Promise<{
    tx: any;
    phase1Tx: any;
    phase2Tx: any;
    phase3Tx: any;
    operationId: Uint8Array;
    pendingCommitments: PendingCommitmentData[];
}>;
/**
 * Check if a position should be liquidated
 *
 * Returns true if:
 * 1. Underwater: effectiveMargin < liquidationThreshold
 * 2. At profit bound: PnL >= margin (100% gain)
 */
declare function shouldLiquidate(position: {
    margin: bigint;
    size: bigint;
    entryPrice: bigint;
    direction: 'long' | 'short';
}, currentPrice: bigint, pool: {
    liquidationThresholdBps: number;
}): {
    shouldLiquidate: boolean;
    reason: 'underwater' | 'profit_bound' | null;
    pnl: bigint;
    isProfit: boolean;
};
/**
 * Calculate liquidation amounts
 *
 * @returns Owner remainder and liquidator reward
 */
declare function calculateLiquidationAmounts(margin: bigint, pnl: bigint, isProfit: boolean, liquidationPenaltyBps: number): {
    ownerRemainder: bigint;
    liquidatorReward: bigint;
};

/**
 * CloakCraft Perps Oracle Integration
 *
 * Pyth oracle helpers for perpetual futures pricing.
 * Uses Hermes API for off-chain price fetching and Pyth Solana Receiver for on-chain.
 */

/**
 * Well-known Pyth price feed IDs for common trading pairs.
 *
 * Feed IDs sourced from: https://pyth.network/developers/price-feed-ids
 */
declare const PERPS_PYTH_FEED_IDS: {
    /** SOL/USD price feed */
    readonly SOL_USD: Uint8Array<ArrayBuffer>;
    /** BTC/USD price feed */
    readonly BTC_USD: Uint8Array<ArrayBuffer>;
    /** ETH/USD price feed */
    readonly ETH_USD: Uint8Array<ArrayBuffer>;
    /** USDC/USD price feed (stablecoin) */
    readonly USDC_USD: Uint8Array<ArrayBuffer>;
    /** USDT/USD price feed */
    readonly USDT_USD: Uint8Array<ArrayBuffer>;
};
/** Pyth price data from Hermes API */
interface PythPriceData {
    /** Price (scaled by 10^expo) */
    price: bigint;
    /** Confidence interval */
    confidence: bigint;
    /** Exponent (e.g., -8 means price is in 10^-8) */
    expo: number;
    /** Unix timestamp of publish time */
    publishTime: number;
}
/** Price update result with account and instructions */
interface PriceUpdateResult {
    /** Price update account (pass to perps instructions) */
    priceUpdateAccount: PublicKey;
    /** Instructions to post price update on-chain */
    postInstructions: TransactionInstruction[];
    /** Instructions to close price update account (reclaim rent) */
    closeInstructions: TransactionInstruction[];
    /** Keypair for the price update account (needed for signing) */
    priceUpdateKeypair: Keypair$1;
    /** The fetched price data */
    priceData: PythPriceData;
}
/**
 * Get feed ID for a token symbol
 *
 * @param symbol - Token symbol (e.g., 'BTC', 'SOL', 'ETH')
 * @returns Feed ID or undefined if not found
 */
declare function getFeedIdBySymbol(symbol: string): Uint8Array | undefined;
/**
 * Fetch current price from Pyth Hermes API
 *
 * @param feedId - Pyth feed ID (32 bytes)
 * @param hermesUrl - Hermes API URL (default: mainnet)
 * @returns Price data including price, confidence, and exponent
 */
declare function fetchPythPrice(feedId: Uint8Array, hermesUrl?: string): Promise<PythPriceData>;
/**
 * Fetch price normalized to USD with specified decimal places
 *
 * @param feedId - Pyth feed ID
 * @param decimals - Desired decimal places (default 9 for Solana token standard)
 * @param hermesUrl - Hermes API URL
 * @returns Price in USD * 10^decimals
 */
declare function fetchPythPriceUsd(feedId: Uint8Array, decimals?: number, hermesUrl?: string): Promise<bigint>;
/**
 * Fetch VAA (Verified Action Approval) data for posting on-chain
 *
 * Returns the raw binary data that can be used with Pyth Receiver program
 * to post a price update on-chain.
 *
 * @param feedId - Pyth feed ID
 * @param hermesUrl - Hermes API URL
 * @returns Array of base64-encoded VAA data
 */
declare function fetchPythVaa(feedId: Uint8Array, hermesUrl?: string): Promise<string[]>;
/**
 * Get price update account address (if using Pyth Receiver)
 *
 * The Pyth Solana Receiver creates price update accounts at deterministic addresses.
 * This function returns the expected address for a given feed ID.
 *
 * Note: You need to actually post the price update using the Pyth SDK before
 * the account exists on-chain.
 *
 * @param connection - Solana connection
 * @param feedId - Pyth feed ID
 * @returns Price update account address (may not exist yet)
 */
declare function getPriceUpdateAccountAddress(connection: Connection, feedId: Uint8Array): Promise<PublicKey>;
/**
 * Check if a price update account exists and is recent
 *
 * @param connection - Solana connection
 * @param priceUpdateAccount - Price update account address
 * @param maxAge - Maximum age in seconds (default 60)
 * @returns True if the account exists and is recent enough
 */
declare function isPriceUpdateValid(connection: Connection, priceUpdateAccount: PublicKey, maxAge?: number): Promise<boolean>;
/**
 * Calculate position entry/exit price from oracle
 *
 * Applies slippage and spread calculations for realistic position pricing.
 *
 * @param oraclePrice - Current oracle price (normalized to decimals)
 * @param isLong - True for long positions
 * @param slippageBps - Slippage in basis points (default 10 = 0.1%)
 * @returns Adjusted price for position entry/exit
 */
declare function calculatePositionPrice(oraclePrice: bigint, isLong: boolean, slippageBps?: number): bigint;
/**
 * Fetch prices for multiple feeds in one request
 *
 * @param feedIds - Array of Pyth feed IDs
 * @param hermesUrl - Hermes API URL
 * @returns Map of feed ID hex to price data
 */
declare function fetchPythPrices(feedIds: Uint8Array[], hermesUrl?: string): Promise<Map<string, PythPriceData>>;
/**
 * Get oracle prices for all tokens in a perps pool
 *
 * @param tokenFeedIds - Array of feed IDs for each token in the pool (up to 8)
 * @param decimals - Desired decimal places
 * @param hermesUrl - Hermes API URL
 * @returns Array of prices (index matches token index)
 */
declare function getPoolOraclePrices(tokenFeedIds: Uint8Array[], decimals?: number, hermesUrl?: string): Promise<bigint[]>;

/**
 * Pyth Oracle Integration (Lightweight)
 *
 * Uses Hermes API directly to fetch prices without the heavy SDK dependencies.
 * For posting price updates on-chain, users should use the Pyth SDK directly
 * or pass an existing price update account.
 */

declare const PYTH_FEED_IDS: {
    /** SOL/USD price feed */
    readonly SOL_USD: Uint8Array<ArrayBuffer>;
    /** BTC/USD price feed */
    readonly BTC_USD: Uint8Array<ArrayBuffer>;
    /** ETH/USD price feed */
    readonly ETH_USD: Uint8Array<ArrayBuffer>;
    /** USDC/USD price feed */
    readonly USDC_USD: Uint8Array<ArrayBuffer>;
};
/** Convert feed ID bytes to hex string for Hermes API */
declare function feedIdToHex(feedId: Uint8Array): string;
/** Pyth price data from Hermes API */
interface PythPrice {
    price: bigint;
    confidence: bigint;
    expo: number;
    publishTime: number;
}
/**
 * Pyth Price Service (Lightweight)
 *
 * Fetches prices directly from Hermes API without heavy SDK dependencies.
 */
declare class PythPriceService {
    private hermesUrl;
    constructor(_connection?: Connection, // Keep for backward compatibility but unused
    hermesUrl?: string);
    /**
     * Get the current price from Hermes API
     *
     * @param feedId - The Pyth feed ID (e.g., PYTH_FEED_IDS.BTC_USD)
     * @returns The current price with metadata
     */
    getPrice(feedId: Uint8Array): Promise<PythPrice>;
    /**
     * Get price in USD with decimals normalized
     *
     * @param feedId - The Pyth feed ID
     * @param decimals - Desired decimal places (default 9 for Solana token standard)
     * @returns Price in USD * 10^decimals
     */
    getPriceUsd(feedId: Uint8Array, decimals?: number): Promise<bigint>;
    /**
     * Get the VAA (Verified Action Approval) data for posting on-chain
     *
     * Returns the raw binary data that can be used with Pyth Receiver program
     * to post a price update on-chain.
     *
     * @param feedId - The Pyth feed ID
     * @returns The VAA binary data as base64 string
     */
    getVaaData(feedId: Uint8Array): Promise<string[]>;
}
declare function getPythService(connection?: Connection): PythPriceService;

/**
 * Voting Types
 *
 * Type definitions for the voting protocol
 */

declare enum VoteBindingMode {
    Snapshot = 0,
    SpendToVote = 1
}
declare enum RevealMode {
    Public = 0,
    TimeLocked = 1,
    PermanentPrivate = 2
}
declare enum VoteType {
    Single = 0,
    Approval = 1,
    Ranked = 2,
    Weighted = 3
}
declare enum ResolutionMode {
    TallyBased = 0,
    Oracle = 1,
    Authority = 2
}
declare enum BallotStatus {
    Pending = 0,
    Active = 1,
    Closed = 2,
    Resolved = 3,
    Finalized = 4
}
interface BallotConfig {
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
    snapshotSlot?: number;
    indexerPubkey?: PublicKey;
    eligibilityRoot?: Uint8Array;
    timeLockPubkey?: Uint8Array;
    unlockSlot?: number;
    claimDeadline?: number;
    resolver?: PublicKey;
    oracle?: PublicKey;
    weightFormula?: WeightOp[];
    weightParams?: bigint[];
}
declare enum WeightOp {
    PushAmount = 0,
    PushConst = 1,
    PushUserData = 2,
    Add = 3,
    Sub = 4,
    Mul = 5,
    Div = 6,
    Sqrt = 7,
    Min = 8,
    Max = 9
}
interface Ballot {
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
    optionWeights: bigint[];
    optionAmounts: bigint[];
    totalWeight: bigint;
    totalAmount: bigint;
    voteCount: bigint;
    poolBalance: bigint;
    totalDistributed: bigint;
    feesCollected: bigint;
    encryptedTally: Uint8Array[];
    hasOutcome: boolean;
    outcome: number;
    winnerWeight: bigint;
    resolver?: PublicKey;
    oracle?: PublicKey;
    claimDeadline: number;
}
interface VoteSnapshotParams {
    ballotId: Uint8Array;
    noteCommitment: Uint8Array;
    noteAmount: bigint;
    noteRandomness: Uint8Array;
    stealthPubX: Uint8Array;
    stealthSpendingKey: Uint8Array;
    voteChoice: number;
    snapshotMerkleRoot: Uint8Array;
    merklePath: Uint8Array[];
    merklePathIndices: number[];
    eligibilityProof?: MerkleProof;
}
interface VoteSpendParams {
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
interface ChangeVoteSnapshotParams {
    ballotId: Uint8Array;
    oldVoteCommitment: Uint8Array;
    oldVoteChoice: number;
    oldRandomness: Uint8Array;
    newVoteChoice: number;
    stealthSpendingKey: Uint8Array;
}
interface ClosePositionParams {
    ballotId: Uint8Array;
    positionCommitment: Uint8Array;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    positionRandomness: Uint8Array;
    stealthSpendingKey: Uint8Array;
}
interface ClaimParams {
    ballotId: Uint8Array;
    positionCommitment: Uint8Array;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    positionRandomness: Uint8Array;
    stealthSpendingKey: Uint8Array;
}
interface Position {
    ballotId: Uint8Array;
    commitment: Uint8Array;
    pubkey: PublicKey;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    randomness: Uint8Array;
    isNullified: boolean;
}
interface VoteStatus {
    hasVoted: boolean;
    voteNullifier?: Uint8Array;
    voteCommitment?: Uint8Array;
    voteChoice?: number;
    weight?: bigint;
}
interface BalanceAttestation {
    pubkey: string;
    ballotId: string;
    tokenMint: string;
    totalAmount: string;
    snapshotSlot: number;
    signature: string;
    indexerPubkey: string;
}
interface MerkleProof {
    pubkey: string;
    isEligible: boolean;
    merkleProof: string[];
    pathIndices: number[];
    leafIndex: number;
}
interface EncryptedContributions {
    ciphertexts: Uint8Array[];
}
interface VotePreimage {
    ballotId: Uint8Array;
    commitment: Uint8Array;
    encryptedData: Uint8Array;
    encryptionType: number;
    bindingMode: VoteBindingMode;
}
interface DecryptedVotePreimage {
    voteChoice: number;
    weight: bigint;
    randomness: Uint8Array;
    ballotId: Uint8Array;
    amount?: bigint;
}
interface VoteSnapshotProofInputs {
    ballot_id: bigint;
    snapshot_merkle_root: bigint;
    note_commitment: bigint;
    vote_nullifier: bigint;
    vote_commitment: bigint;
    amount: bigint;
    weight: bigint;
    token_mint: bigint;
    eligibility_root: bigint;
    has_eligibility: bigint;
    vote_choice: bigint;
    is_public_mode: bigint;
    in_stealth_pub_x: bigint;
    in_randomness: bigint;
    in_stealth_spending_key: bigint;
    merkle_path: bigint[];
    merkle_path_indices: bigint[];
    vote_randomness: bigint;
    eligibility_path: bigint[];
    eligibility_path_indices: bigint[];
    private_vote_choice: bigint;
}
interface ClaimProofInputs {
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
    spendingKey: bigint;
    pubkey: bigint;
    positionAmount: bigint;
    positionRandomness: bigint;
    privateVoteChoice: bigint;
    payoutRandomness: bigint;
}

/**
 * Voting Instruction Builders
 *
 * High-level instruction builders for voting operations.
 * Uses multi-phase pattern for complex ZK operations.
 */

declare const VOTING_SEEDS: {
    readonly BALLOT: Buffer<ArrayBuffer>;
    readonly BALLOT_VAULT: Buffer<ArrayBuffer>;
    readonly PENDING_OP: Buffer<ArrayBuffer>;
    readonly VK: Buffer<ArrayBuffer>;
};
declare const CIRCUIT_IDS: {
    VOTE_SNAPSHOT: Buffer<ArrayBuffer>;
    CHANGE_VOTE_SNAPSHOT: Buffer<ArrayBuffer>;
    VOTE_SPEND: Buffer<ArrayBuffer>;
    CLOSE_POSITION: Buffer<ArrayBuffer>;
    CLAIM: Buffer<ArrayBuffer>;
};
declare function deriveBallotPda(ballotId: Uint8Array, programId?: PublicKey): [PublicKey, number];
declare function deriveBallotVaultPda(ballotId: Uint8Array, programId?: PublicKey): [PublicKey, number];
declare function derivePendingOperationPda(operationId: Uint8Array, programId?: PublicKey): [PublicKey, number];
declare function deriveVerificationKeyPda(circuitId: Uint8Array, programId?: PublicKey): [PublicKey, number];
declare function generateOperationId(): Uint8Array;
interface CreateBallotInstructionParams {
    ballotId: Uint8Array;
    bindingMode: {
        snapshot: {};
    } | {
        spendToVote: {};
    };
    revealMode: {
        public: {};
    } | {
        timeLocked: {};
    } | {
        permanentPrivate: {};
    };
    voteType: {
        single: {};
    } | {
        approval: {};
    } | {
        ranked: {};
    } | {
        weighted: {};
    };
    resolutionMode: {
        tallyBased: {};
    } | {
        oracle: {};
    } | {
        authority: {};
    };
    numOptions: number;
    quorumThreshold: bigint;
    protocolFeeBps: number;
    protocolTreasury: PublicKey;
    startTime: number;
    endTime: number;
    snapshotSlot: number;
    indexerPubkey: PublicKey;
    eligibilityRoot: Uint8Array | null;
    weightFormula: number[];
    weightParams: bigint[];
    timeLockPubkey: Uint8Array;
    unlockSlot: number;
    resolver: PublicKey | null;
    oracle: PublicKey | null;
    claimDeadline: number;
}
/**
 * Build create_ballot instruction using Anchor program
 */
declare function buildCreateBallotInstruction(program: Program, params: CreateBallotInstructionParams, tokenMint: PublicKey, authority: PublicKey, payer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Build resolve_ballot instruction
 *
 * @param resolver - Optional resolver (required for Authority mode)
 * @param authority - Signer (required for all modes)
 */
declare function buildResolveBallotInstruction(program: Program, ballotId: Uint8Array, outcome: number | null, authority: PublicKey, resolver?: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Build finalize_ballot instruction
 */
declare function buildFinalizeBallotInstruction(program: Program, ballotId: Uint8Array, tokenMint: PublicKey, protocolTreasury: PublicKey, authority: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Build decrypt_tally instruction
 */
declare function buildDecryptTallyInstruction(program: Program, ballotId: Uint8Array, decryptionKey: Uint8Array, authority: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
interface VoteSnapshotInstructionParams {
    ballotId: Uint8Array;
    snapshotMerkleRoot: Uint8Array;
    noteCommitment: Uint8Array;
    voteNullifier: Uint8Array;
    voteCommitment: Uint8Array;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    proof: Uint8Array;
    outputRandomness: Uint8Array;
    encryptedContributions?: Uint8Array[];
    encryptedPreimage?: Uint8Array;
}
/**
 * Build vote_snapshot Phase 0 instruction (create pending with proof)
 *
 * Note-based ownership proof: User proves they own a shielded note WITHOUT spending it.
 * The note stays intact - user just proves ownership for voting weight via merkle proof.
 *
 * On-chain expects:
 * - operation_id: [u8; 32]
 * - ballot_id: [u8; 32]
 * - proof: Vec<u8>
 * - snapshot_merkle_root: [u8; 32]
 * - note_commitment: [u8; 32]
 * - vote_nullifier: [u8; 32]
 * - vote_commitment: [u8; 32]
 * - vote_choice: u64
 * - amount: u64
 * - weight: u64
 * - encrypted_contributions: Option<EncryptedContributions>
 * - encrypted_preimage: Option<Vec<u8>>
 * - output_randomness: [u8; 32]
 */
declare function buildVoteSnapshotPhase0Instruction(program: Program, params: VoteSnapshotInstructionParams, operationId: Uint8Array, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Build vote_snapshot Phase 2 instruction (execute vote)
 */
declare function buildVoteSnapshotExecuteInstruction(program: Program, operationId: Uint8Array, ballotId: Uint8Array, relayer: PublicKey, encryptedContributions?: Uint8Array[] | null, programId?: PublicKey): Promise<TransactionInstruction>;
interface ChangeVoteSnapshotInstructionParams {
    ballotId: Uint8Array;
    oldVoteCommitment: Uint8Array;
    oldVoteCommitmentNullifier: Uint8Array;
    newVoteCommitment: Uint8Array;
    voteNullifier: Uint8Array;
    oldVoteChoice: number;
    newVoteChoice: number;
    weight: bigint;
    proof: Uint8Array;
    oldEncryptedContributions?: Uint8Array[];
    newEncryptedContributions?: Uint8Array[];
}
/**
 * Build change_vote_snapshot Phase 0 instruction
 */
declare function buildChangeVoteSnapshotPhase0Instruction(program: Program, params: ChangeVoteSnapshotInstructionParams, operationId: Uint8Array, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Build change_vote_snapshot execute instruction
 */
declare function buildChangeVoteSnapshotExecuteInstruction(program: Program, operationId: Uint8Array, ballotId: Uint8Array, relayer: PublicKey, oldEncryptedContributions?: Uint8Array[] | null, newEncryptedContributions?: Uint8Array[] | null, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Merkle context for vote commitment verification
 */
interface VoteCommitmentMerkleContext {
    merkleTreePubkeyIndex: number;
    queuePubkeyIndex: number;
    leafIndex: number;
    rootIndex: number;
}
/**
 * Parameters for verifying vote commitment exists
 */
interface LightVerifyVoteCommitmentParams {
    commitmentAccountHash: Uint8Array;
    commitmentMerkleContext: VoteCommitmentMerkleContext;
    commitmentInclusionProof: {
        rootIndices: number[];
        proof: Uint8Array[];
    };
    commitmentAddressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
    };
}
/**
 * Build verify_vote_commitment_exists instruction (Phase 1)
 *
 * Voting-specific commitment verification for operations that spend existing commitments.
 * Uses Ballot account instead of Pool account.
 *
 * Required for:
 * - change_vote_snapshot: Verify old_vote_commitment exists
 * - vote_spend: Verify token note commitment exists
 * - change_vote_spend: Verify old position commitment exists
 * - close_position: Verify position commitment exists
 * - claim: Verify position commitment exists
 */
declare function buildVerifyVoteCommitmentExistsInstruction(program: Program, operationId: Uint8Array, ballotId: Uint8Array, commitmentIndex: number, lightParams: LightVerifyVoteCommitmentParams, relayer: PublicKey, remainingAccounts: {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
}[], programId?: PublicKey): Promise<TransactionInstruction>;
interface VoteSpendInstructionParams {
    ballotId: Uint8Array;
    spendingNullifier: Uint8Array;
    positionCommitment: Uint8Array;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    proof: Uint8Array;
    encryptedContributions?: Uint8Array[];
    encryptedPreimage?: Uint8Array;
}
/**
 * Build vote_spend Phase 0 instruction
 */
declare function buildVoteSpendPhase0Instruction(program: Program, params: VoteSpendInstructionParams, operationId: Uint8Array, inputCommitment: Uint8Array, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Build vote_spend execute instruction
 */
declare function buildVoteSpendExecuteInstruction(program: Program, operationId: Uint8Array, ballotId: Uint8Array, tokenMint: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
interface CloseVotePositionInstructionParams {
    ballotId: Uint8Array;
    positionCommitment: Uint8Array;
    positionNullifier: Uint8Array;
    newTokenCommitment: Uint8Array;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    proof: Uint8Array;
    encryptedContributions?: Uint8Array[];
}
/**
 * Build close_vote_position Phase 0 instruction
 */
declare function buildCloseVotePositionPhase0Instruction(program: Program, params: CloseVotePositionInstructionParams, operationId: Uint8Array, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Build close_vote_position execute instruction
 */
declare function buildCloseVotePositionExecuteInstruction(program: Program, operationId: Uint8Array, ballotId: Uint8Array, tokenMint: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
interface ClaimInstructionParams {
    ballotId: Uint8Array;
    positionCommitment: Uint8Array;
    positionNullifier: Uint8Array;
    payoutCommitment: Uint8Array;
    voteChoice: number;
    grossPayout: bigint;
    netPayout: bigint;
    userWeight: bigint;
    proof: Uint8Array;
}
/**
 * Build claim Phase 0 instruction
 */
declare function buildClaimPhase0Instruction(program: Program, params: ClaimInstructionParams, operationId: Uint8Array, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Build claim execute instruction
 */
declare function buildClaimExecuteInstruction(program: Program, operationId: Uint8Array, ballotId: Uint8Array, tokenMint: PublicKey, protocolTreasury: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction>;
/**
 * Generate encrypted contributions for encrypted modes
 * Each option gets an ElGamal ciphertext of the weight (or 0 if not voted for)
 */
declare function generateEncryptedContributions(voteChoice: number, weight: bigint, numOptions: number, timeLockPubkey: Uint8Array, encryptionSeed: Uint8Array): EncryptedContributions;
/**
 * Generate negated encrypted contributions for close position / vote change
 */
declare function generateNegatedEncryptedContributions(voteChoice: number, weight: bigint, numOptions: number, timeLockPubkey: Uint8Array, encryptionSeed: Uint8Array): EncryptedContributions;
/**
 * Build all vote_snapshot instructions for multi-phase execution
 * Returns array of instruction arrays for each phase
 */
declare function buildVoteSnapshotInstructions(program: Program, params: VoteSnapshotInstructionParams, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction[][]>;
/**
 * Build all change_vote_snapshot instructions for multi-phase execution
 */
declare function buildChangeVoteSnapshotInstructions(program: Program, params: ChangeVoteSnapshotInstructionParams, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction[][]>;
/**
 * Build all vote_spend instructions for multi-phase execution
 */
declare function buildVoteSpendInstructions(program: Program, params: VoteSpendInstructionParams, inputCommitment: Uint8Array, tokenMint: PublicKey, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction[][]>;
/**
 * Build all close_position instructions for multi-phase execution
 */
declare function buildClosePositionInstructions(program: Program, params: CloseVotePositionInstructionParams, tokenMint: PublicKey, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction[][]>;
/**
 * Build all claim instructions for multi-phase execution
 */
declare function buildClaimInstructions(program: Program, params: ClaimInstructionParams, tokenMint: PublicKey, protocolTreasury: PublicKey, payer: PublicKey, relayer: PublicKey, programId?: PublicKey): Promise<TransactionInstruction[][]>;

/**
 * Voting Proof Generation
 *
 * ZK proof generation for voting operations
 */

/**
 * Generate vote_snapshot proof inputs
 *
 * Note-based ownership proof: User proves they own a shielded note WITHOUT spending it.
 * The note stays intact - user just proves ownership for voting weight via merkle proof.
 */
declare function generateVoteSnapshotInputs(params: VoteSnapshotParams, revealMode: RevealMode, tokenMint: Uint8Array, eligibilityRoot?: bigint): Promise<{
    inputs: VoteSnapshotProofInputs;
    voteNullifier: Uint8Array;
    voteCommitment: Uint8Array;
    voteRandomness: Uint8Array;
}>;
/**
 * Generate change_vote_snapshot proof inputs
 */
declare function generateChangeVoteSnapshotInputs(params: ChangeVoteSnapshotParams, revealMode: RevealMode, weight: bigint): Promise<{
    oldVoteCommitmentNullifier: Uint8Array;
    newVoteCommitment: Uint8Array;
    newRandomness: Uint8Array;
    inputs: Record<string, bigint | bigint[]>;
}>;
/**
 * Generate vote_spend proof inputs
 */
declare function generateVoteSpendInputs(params: VoteSpendParams, revealMode: RevealMode, eligibilityRoot?: bigint): Promise<{
    spendingNullifier: Uint8Array;
    positionCommitment: Uint8Array;
    positionRandomness: Uint8Array;
    inputs: Record<string, bigint | bigint[]>;
}>;
/**
 * Generate claim proof inputs
 */
declare function generateClaimInputs(params: ClaimParams, ballot: {
    outcome: number;
    totalPool: bigint;
    winnerWeight: bigint;
    protocolFeeBps: number;
    voteType: number;
    tokenMint: Uint8Array;
    revealMode: RevealMode;
}): Promise<{
    positionNullifier: Uint8Array;
    payoutCommitment: Uint8Array;
    payoutRandomness: Uint8Array;
    grossPayout: bigint;
    netPayout: bigint;
    inputs: ClaimProofInputs;
}>;
/**
 * Convert proof inputs with bigint values to snarkjs-compatible string format
 */
declare function convertInputsToSnarkjs(inputs: Record<string, bigint | bigint[]>): Record<string, string | string[]>;

/**
 * Voting Recovery Module
 *
 * Handles recovery of vote preimages for claim operations.
 * Similar to notes.ts but for voting-specific data.
 */

interface VoteRecoveryConfig {
    indexerUrl: string;
    programId?: PublicKey;
}
interface RecoveredClaim {
    ballotId: Uint8Array;
    positionCommitment: Uint8Array;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    randomness: Uint8Array;
}
interface RecoveredVote {
    ballotId: Uint8Array;
    voteCommitment: Uint8Array;
    voteChoice: number;
    weight: bigint;
    randomness: Uint8Array;
}
/**
 * Manager for recovering vote preimages
 */
declare class VoteRecoveryManager {
    private indexerUrl;
    private programId;
    private cachedPreimages;
    constructor(config: VoteRecoveryConfig);
    /**
     * Scan for user's vote preimages
     */
    scanPreimages(pubkey: PublicKey, options?: {
        ballotId?: Uint8Array;
        includeNullified?: boolean;
    }): Promise<VotePreimage[]>;
    /**
     * Decrypt a vote preimage with user's secret key
     * For PermanentPrivate mode (encryption_type = 0)
     */
    decryptWithUserKey(preimage: VotePreimage, secretKey: Uint8Array): DecryptedVotePreimage | null;
    /**
     * Decrypt a vote preimage with timelock key
     * For TimeLocked mode (encryption_type = 1)
     */
    decryptWithTimelockKey(preimage: VotePreimage, timelockDecryptionKey: Uint8Array): DecryptedVotePreimage | null;
    /**
     * Recover claim data for a SpendToVote position
     */
    recoverClaimData(secretKey: Uint8Array, ballotId: Uint8Array, ballot: Ballot): Promise<RecoveredClaim[]>;
    /**
     * Recover vote data for Snapshot mode (for change vote)
     */
    recoverVoteData(secretKey: Uint8Array, ballotId: Uint8Array, ballot: Ballot): Promise<RecoveredVote[]>;
    /**
     * Get active positions for a user on a ballot
     */
    getActivePositions(secretKey: Uint8Array, ballotId: Uint8Array, ballot: Ballot): Promise<Position[]>;
    /**
     * Clear cached preimages
     */
    clearCache(): void;
}
/**
 * Encrypt preimage data for storage
 */
declare function encryptPreimage(preimage: DecryptedVotePreimage, encryptionKey: Uint8Array, isTimelockKey: boolean): Uint8Array;

/**
 * Voting Client
 *
 * Complete multi-phase voting execution with Light Protocol integration.
 * Handles all voting flows: Snapshot, SpendToVote, Vote Change, Position Close, Claim.
 */

interface VotingClientConfig {
    connection: Connection;
    program: Program;
    programId: PublicKey;
    lightClient: LightCommitmentClient;
    circuitsBuildDir: string;
    addressMerkleTree: PublicKey;
    stateMerkleTree: PublicKey;
    addressLookupTables?: PublicKey[];
}
interface VoteSnapshotResult {
    operationId: Uint8Array;
    voteNullifier: Uint8Array;
    voteCommitment: Uint8Array;
    voteRandomness: Uint8Array;
    signatures: string[];
}
interface VoteSpendResult {
    operationId: Uint8Array;
    spendingNullifier: Uint8Array;
    positionCommitment: Uint8Array;
    positionRandomness: Uint8Array;
    signatures: string[];
}
interface ChangeVoteResult {
    operationId: Uint8Array;
    oldVoteCommitmentNullifier: Uint8Array;
    newVoteCommitment: Uint8Array;
    newRandomness: Uint8Array;
    signatures: string[];
}
interface ClosePositionResult {
    operationId: Uint8Array;
    positionNullifier: Uint8Array;
    newTokenCommitment: Uint8Array;
    tokenRandomness: Uint8Array;
    signatures: string[];
}
interface ClaimResult {
    operationId: Uint8Array;
    positionNullifier: Uint8Array;
    payoutCommitment: Uint8Array;
    grossPayout: bigint;
    netPayout: bigint;
    signatures: string[];
}
/**
 * VotingClient - Complete multi-phase voting execution
 */
declare class VotingClient {
    private connection;
    private program;
    private programId;
    private lightClient;
    private circuitsBuildDir;
    private addressMerkleTree;
    private stateMerkleTree;
    private addressLookupTables;
    constructor(config: VotingClientConfig);
    /**
     * Execute complete vote_snapshot flow (all phases)
     *
     * Phase 0: Create pending with ZK proof
     * Phase 1: Create vote nullifier (Light Protocol)
     * Phase 2: Execute vote (update tally)
     * Phase 3: Create vote commitment (Light Protocol)
     * Phase 4: Close pending operation
     */
    voteSnapshot(params: VoteSnapshotParams, ballot: Ballot, payer: Keypair$1, onProgress?: (phase: number, message: string) => void): Promise<VoteSnapshotResult>;
    /**
     * Execute complete vote_spend flow (all phases)
     *
     * Phase 0: Create pending with ZK proof
     * Phase 1: Verify input commitment exists (Light Protocol)
     * Phase 2: Create spending nullifier (Light Protocol)
     * Phase 3: Execute vote spend (update tally, transfer to vault)
     * Phase 4: Create position commitment (Light Protocol)
     * Phase 5: Close pending operation
     */
    voteSpend(params: VoteSpendParams, ballot: Ballot, inputNote: {
        commitment: Uint8Array;
        accountHash: string;
        amount: bigint;
        randomness: Uint8Array;
        stealthPubX: Uint8Array;
        leafIndex: number;
    }, payer: Keypair$1, onProgress?: (phase: number, message: string) => void): Promise<VoteSpendResult>;
    /**
     * Execute complete change_vote_snapshot flow (atomic vote change)
     */
    changeVoteSnapshot(params: ChangeVoteSnapshotParams, ballot: Ballot, oldWeight: bigint, payer: Keypair$1, onProgress?: (phase: number, message: string) => void): Promise<ChangeVoteResult>;
    /**
     * Execute complete close_position flow (exit SpendToVote position)
     */
    closePosition(params: ClosePositionParams, ballot: Ballot, positionNote: {
        commitment: Uint8Array;
        accountHash: string;
    }, newTokenRandomness: Uint8Array, payer: Keypair$1, onProgress?: (phase: number, message: string) => void): Promise<ClosePositionResult>;
    /**
     * Execute complete claim flow (claim winnings from SpendToVote ballot)
     */
    claim(params: ClaimParams, ballot: Ballot, positionNote: {
        commitment: Uint8Array;
        accountHash: string;
    }, payer: Keypair$1, onProgress?: (phase: number, message: string) => void): Promise<ClaimResult>;
    private sendTransaction;
    private waitForConfirmation;
}

export { ALTManager, type AddLiquidityInstructionParams, type AddLiquidityPhase2Params, type AddMarketParams, type AddPerpsLiquidityInstructionParams, type AddPerpsLiquidityParams, type AddPerpsLiquidityProofResult, type AddTokenToPoolParams, type AnchorWallet, type AutoConsolidationConfig, type AutoConsolidationState, AutoConsolidator, BPS_DIVISOR, type Ballot, BallotStatus, CIRCUIT_IDS$1 as CIRCUIT_IDS, type CancelOrderInstructionParams, type CancelOrderResult, type ChangeVoteResult, type ChangeVoteSnapshotInstructionParams, type ChangeVoteSnapshotParams, type CircomArtifacts, type CircuitType, type ClaimInstructionParams, type ClaimResult, type CloakCraftALTAccounts, CloakCraftClient, type CloakCraftClientConfig, type ClosePositionInstructionParams, type ClosePositionParams$1 as ClosePositionParams, type ClosePositionProofResult, type ClosePositionResult, type CloseVotePositionInstructionParams, type CommitmentMerkleProof, type CompressedAccountInfo, type ConsolidationBatch, type ConsolidationInput, type ConsolidationInstructionParams, type ConsolidationOptions, type ConsolidationResult, ConsolidationService, type ConsolidationSuggestion, type CreateBallotInstructionParams, type CreateCommitmentParams, type CreateNullifierParams, DEFAULT_FEE_CONFIG, DEVNET_LIGHT_TREES, DEVNET_V2_TREES, DOMAIN_ACTION_NULLIFIER, DOMAIN_COMMITMENT, DOMAIN_EMPTY_LEAF, DOMAIN_MERKLE, DOMAIN_NULLIFIER_KEY, DOMAIN_SPENDING_NULLIFIER, DOMAIN_STEALTH, type DecryptedNoteResult, type DecryptedPerpsPosition, type DecryptedVotePreimage, type DecryptionShareData, type DleqProof, type EncryptedBallot, type EncryptedContributions, FIELD_MODULUS_FQ, FIELD_MODULUS_FR, type FeeCalculation, type FeeableOperation, type FillOrderInstructionParams, type FillOrderResult, type FragmentationReport, type FreeOperation, GENERATOR, type HeliusConfig, IDENTITY, type IncrementalScanOptions, type InitializeAmmPoolParams, type InitializePerpsPoolParams, type InitializePoolParams, LP_COMMITMENT_DOMAIN, LightClient, LightCommitmentClient, type LightNullifierParams$1 as LightNullifierParams, LightProtocol, type LightShieldParams, type LightStoreCommitmentParams, type LightTransactParams, type LightVerifyVoteCommitmentParams, type LiquidatePositionInstructionParams, type LiquidatePositionParams, type LiquidateProofResult, type LiquidationPriceResult, type LpNote, type LpValueResult, MAINNET_LIGHT_TREES, MAX_FEE_BPS, MAX_PERPS_TOKENS, MAX_TRANSACTION_SIZE, type MultiPhaseInstructions, NOTE_TYPE_LP, NOTE_TYPE_POSITION, NOTE_TYPE_STANDARD, NoteManager, type NoteSelectionOptions, type NoteSelectionResult, type OpenPositionInstructionParams, type OpenPositionParams, type OpenPositionProofResult, type OperationType, PERPS_CIRCUIT_IDS, PERPS_PYTH_FEED_IDS, PERPS_SEEDS, POSITION_COMMITMENT_DOMAIN, PROGRAM_ID, PYTH_FEED_IDS, type PackedAddressTreeInfo, type PendingCommitmentData, type PendingNullifierData, type PerpsMarketState, type PerpsPoolState, type PerpsPosition, type PerpsToken, type PnLResult, type PoolAnalytics, PoolAnalyticsCalculator, type PoolStats, type PoolTypeParam, type PositionDirection, type PositionMetaData, type PositionNote, type PriceUpdateResult, ProofGenerator, type ProtocolFeeConfig, type PythPrice, type PythPriceData, PythPriceService, type RecoveredClaim, type RecoveredVote, type RemoveLiquidityInstructionParams, type RemoveLiquidityPhase2Params, type RemovePerpsLiquidityInstructionParams, type RemovePerpsLiquidityParams, type RemovePerpsLiquidityProofResult, ResolutionMode, type RetryConfig, RevealMode, SEEDS, type ScannedLpNote, type ScannedNote, type ScannedPositionNote, type ScannerStats, type SelectionStrategy, type ShieldInstructionParams, type ShieldResult, SmartNoteSelector, type StateTreeSet, type StoreCommitmentParams, type SwapInstructionParams, type SwapPhase2Params, type TokenPrice, TokenPriceFetcher, type TransactInput, type TransactInstructionParams, type TransactOutput, type TransactResult, type TransactionFilter, TransactionHistory, type TransactionRecord, TransactionStatus, TransactionType, type UpdateMarketStatusParams, type UpdatePoolConfigParams, type UpdateTokenStatusParams, type UserPoolPosition, CIRCUIT_IDS as VOTING_CIRCUIT_IDS, VOTING_SEEDS, type ValidityProof, type VersionedTransactionConfig, VoteBindingMode, type VoteCommitmentMerkleContext, VoteOption, type VotePreimage, type VoteRecoveryConfig, VoteRecoveryManager, type VoteSnapshotInstructionParams, type VoteSnapshotParams, type VoteSnapshotProofInputs, type VoteSnapshotResult, type VoteSpendInstructionParams, type VoteSpendParams, type VoteSpendResult, type VoteStatus, VoteType, type BalanceAttestation as VotingBalanceAttestation, type BallotConfig as VotingBallotConfig, type ClaimParams as VotingClaimParams, type ClaimProofInputs as VotingClaimProofInputs, VotingClient, type VotingClientConfig, type ClosePositionParams as VotingClosePositionParams, type MerkleProof as VotingMerkleProof, type Position as VotingPosition, WALLET_DERIVATION_MESSAGE, Wallet, WeightOp, type WithdrawableResult, addCiphertexts, ammPoolExists, bigintToFieldString, buildAddLiquidityWithProgram, buildAddMarketWithProgram, buildAddPerpsLiquidityWithProgram, buildAddTokenToPoolWithProgram, buildAtomicMultiPhaseTransaction, buildCancelOrderWithProgram, buildChangeVoteSnapshotExecuteInstruction, buildChangeVoteSnapshotInstructions, buildChangeVoteSnapshotPhase0Instruction, buildClaimExecuteInstruction, buildClaimPhase0Instruction, buildClosePendingOperationWithProgram, buildClosePositionWithProgram, buildCloseVotePositionExecuteInstruction, buildCloseVotePositionPhase0Instruction, buildClosePositionInstructions as buildCloseVotingPositionInstructions, buildConsolidationWithProgram, buildCreateBallotInstruction, buildCreateCommitmentWithProgram, buildCreateNullifierWithProgram, buildDecryptTallyInstruction, buildFillOrderWithProgram, buildFinalizeBallotInstruction, buildInitializeAmmPoolWithProgram, buildInitializeCommitmentCounterWithProgram, buildInitializePerpsPoolWithProgram, buildInitializePoolWithProgram, buildLiquidatePositionWithProgram, buildOpenPositionWithProgram, buildRemoveLiquidityWithProgram, buildRemovePerpsLiquidityWithProgram, buildResolveBallotInstruction, buildShieldInstructions, buildShieldInstructionsForVersionedTx, buildShieldWithProgram, buildStoreCommitmentWithProgram, buildSwapWithProgram, buildTransactWithProgram, buildUpdateBorrowFeesWithProgram, buildUpdateMarketStatusWithProgram, buildUpdatePoolConfigWithProgram, buildUpdateTokenStatusWithProgram, buildVerifyVoteCommitmentExistsInstruction, buildVersionedTransaction, buildVoteSnapshotExecuteInstruction, buildVoteSnapshotInstructions, buildVoteSnapshotPhase0Instruction, buildVoteSpendExecuteInstruction, buildVoteSpendInstructions, buildVoteSpendPhase0Instruction, buildClaimInstructions as buildVotingClaimInstructions, bytesToField, bytesToFieldString, calculateAddLiquidityAmounts, calculateBorrowFees, calculateBorrowRate, calculateImbalanceFee, calculateInvariant, calculateLiquidationAmounts, calculateLiquidationPrice, calculateLpMintAmount, calculateLpValue, calculateMaxWithdrawable, calculateMinOutput, calculateMinimumFee, calculatePnL, calculatePositionFee, calculatePositionPrice, calculatePriceImpact, calculatePriceRatio, calculateProtocolFee, calculateRemoveLiquidityOutput, calculateSlippage, calculateStableSwapOutput, calculateSwapOutputUnified, calculateSwapProtocolFee, calculateTotalLiquidity, calculateUsdPriceImpact, calculateUtilization, calculateWithdrawAmount, canFitInSingleTransaction, canonicalTokenOrder, checkNullifierSpent, checkStealthOwnership, clearCircomCache, combineShares, computeAmmStateHash, computeCircuitInputs, computeCommitment, computeDecryptionShare, computeLpCommitment, computePositionCommitment, consolidationService, convertInputsToSnarkjs, createAddressLookupTable, createCloakCraftALT, createLpNote, createNote, createPendingTransaction, createPositionNote, createWallet, createWatchOnlyWallet, decryptLpNote, decryptNote, decryptPositionNote, deriveActionNullifier, deriveAmmPoolPda, deriveBallotPda, deriveBallotVaultPda, deriveCommitmentCounterPda, deriveLpMintPda, deriveNullifierKey, deriveOrderPda, derivePendingOperationPda$1 as derivePendingOperationPda, derivePerpsLpMintPda, derivePerpsMarketPda, derivePerpsPoolPda, derivePerpsVaultPda, derivePoolPda, deriveProtocolConfigPda, derivePublicKey, deriveSpendingNullifier, deriveStealthPrivateKey, deriveVaultPda, deriveVerificationKeyPda$1 as deriveVerificationKeyPda, derivePendingOperationPda as deriveVotingPendingOperationPda, deriveVerificationKeyPda as deriveVotingVerificationKeyPda, deriveWalletFromSeed, deriveWalletFromSignature, deserializeAmmPool, deserializeEncryptedNote, deserializeLpNote, deserializePositionNote, detectNoteType, disableAutoConsolidation, elgamalEncrypt, enableAutoConsolidation, encryptLpNote, encryptNote, encryptPositionNote, encryptPreimage, encryptVote, estimateTotalCost, estimateTransactionSize, executeVersionedTransaction, extendAddressLookupTable, feedIdToHex, fetchAddressLookupTable, fetchAmmPool, fetchProtocolFeeConfig, fetchPythPrice, fetchPythPriceUsd, fetchPythPrices, fetchPythVaa, fieldToBytes, formatAmmPool, formatApy, formatFeeAmount, formatFeeRate, formatPrice, formatPriceChange, formatShare, formatTvl, generateChangeVoteSnapshotInputs, generateDleqProof, generateEncryptedContributions, generateNegatedEncryptedContributions, generateOperationId$1 as generateOperationId, generateRandomness, generateSnarkjsProof, generateSnarkjsProofFromCircuit, generateStealthAddress, generateVoteRandomness, generateVoteSnapshotInputs, generateVoteSpendInputs, generateClaimInputs as generateVotingClaimInputs, generateOperationId as generateVotingOperationId, getAmmPool, getAutoConsolidator, getFeeBps, getFeedIdBySymbol, getInstructionFromAnchorMethod, getLightProtocolCommonAccounts, getPoolOraclePrices, getPriceUpdateAccountAddress, getPythService, getRandomStateTreeSet, getStateTreeSet, initPoseidon, initializePool, isFeeableOperation, isFreeOperation, isInSubgroup, isOnCurve, isPriceUpdateValid, isValidLeverage, isValidPositionSize, lagrangeCoefficient, loadCircomArtifacts, loadWallet, noteSelector, padCircuitId, parseGroth16Proof, pointAdd, poseidonHash, poseidonHash2, poseidonHashAsync, poseidonHashDomain, poseidonHashDomainAsync, pubkeyToField, refreshAmmPool, scalarMul, serializeCiphertext, serializeCiphertextFull, serializeEncryptedNote, serializeEncryptedVote, serializeGroth16Proof, serializeLpNote, serializePositionNote, shouldLiquidate, sleep, storeCommitments, tryDecryptAnyNote, tryDecryptLpNote, tryDecryptNote, tryDecryptPositionNote, validateLiquidityAmounts, validateSwapAmount, verifyAmmStateHash, verifyCommitment, verifyDleqProof, verifyFeeAmount, verifyInvariant, verifyLpCommitment, verifyPositionCommitment, withRetry, wouldExceedUtilization };
