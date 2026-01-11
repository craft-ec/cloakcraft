import { Keypair, SpendingKey, ViewingKey, Point, PoolState, DecryptedNote, ShieldParams, TransactionResult, TransferParams, AdapterSwapParams, OrderParams, SyncStatus, FieldElement, PoseidonHash, StealthAddress, Note, Commitment, Nullifier, EncryptedNote, Groth16Proof } from '@cloakcraft/types';
export * from '@cloakcraft/types';
import { Connection, PublicKey, Keypair as Keypair$1 } from '@solana/web3.js';

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
 * Derive a wallet from a seed phrase (BIP-39 style)
 *
 * Note: In production, use proper BIP-39 implementation
 */
declare function deriveWalletFromSeed(seedPhrase: string, path?: string): Promise<Wallet>;

/**
 * CloakCraft Client
 *
 * Main entry point for interacting with the protocol
 */

interface CloakCraftClientConfig {
    /** Solana RPC URL */
    rpcUrl: string;
    /** Indexer API URL */
    indexerUrl: string;
    /** CloakCraft program ID */
    programId: PublicKey;
    /** Optional commitment level */
    commitment?: 'processed' | 'confirmed' | 'finalized';
}
declare class CloakCraftClient {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly indexerUrl: string;
    private wallet;
    private noteManager;
    private proofGenerator;
    constructor(config: CloakCraftClientConfig);
    /**
     * Create a new wallet
     */
    createWallet(): Wallet;
    /**
     * Load wallet from spending key
     */
    loadWallet(spendingKey: Uint8Array): Wallet;
    /**
     * Get current wallet
     */
    getWallet(): Wallet | null;
    /**
     * Get pool state
     */
    getPool(tokenMint: PublicKey): Promise<PoolState | null>;
    /**
     * Sync notes for the current wallet
     */
    syncNotes(): Promise<DecryptedNote[]>;
    /**
     * Get unspent notes for a token
     */
    getUnspentNotes(tokenMint: PublicKey): Promise<DecryptedNote[]>;
    /**
     * Shield tokens into the pool
     */
    shield(params: ShieldParams, payer: Keypair$1): Promise<TransactionResult>;
    /**
     * Private transfer
     */
    transfer(params: TransferParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Swap through external adapter (partial privacy)
     */
    swapViaAdapter(params: AdapterSwapParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Create a market order
     */
    createOrder(params: OrderParams, relayer?: Keypair$1): Promise<TransactionResult>;
    /**
     * Get sync status
     */
    getSyncStatus(): Promise<SyncStatus>;
    private buildShieldTransaction;
    private buildTransferTransaction;
    private buildAdapterSwapTransaction;
    private buildCreateOrderTransaction;
    private getRelayer;
    private decodePoolState;
}

/**
 * Poseidon hash implementation for BN254 scalar field
 */

declare const DOMAIN_COMMITMENT = 1n;
declare const DOMAIN_SPENDING_NULLIFIER = 2n;
declare const DOMAIN_ACTION_NULLIFIER = 3n;
declare const DOMAIN_NULLIFIER_KEY = 4n;
declare const DOMAIN_STEALTH = 5n;
declare const DOMAIN_MERKLE = 6n;
declare const DOMAIN_EMPTY_LEAF = 7n;
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
 * Note: This is a placeholder implementation using SHA-256.
 * In production, use a proper Poseidon implementation for BN254.
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
 * Note commitment utilities
 */

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
 * Nullifier derivation utilities
 */

/**
 * Derive nullifier key from spending key
 *
 * nk = poseidon(DOMAIN_NULLIFIER_KEY, sk)
 */
declare function deriveNullifierKey(spendingKey: FieldElement): FieldElement;
/**
 * Derive spending nullifier (consumes the note)
 *
 * spending_nullifier = poseidon(DOMAIN_SPENDING_NULLIFIER, nk, commitment)
 */
declare function deriveSpendingNullifier(nullifierKey: FieldElement, commitment: Commitment): Nullifier;
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
 * Proof generation for ZK circuits
 */

/**
 * Proof generator using Noir circuits compiled via Sunspot
 */
declare class ProofGenerator {
    private wasmPath?;
    private zkeyPath?;
    constructor(config?: {
        wasmPath?: string;
        zkeyPath?: string;
    });
    /**
     * Generate a transfer proof
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
     * Generate a vote proof
     */
    generateVoteProof(note: DecryptedNote, keypair: Keypair, proposalId: Uint8Array, voteChoices: bigint[], thresholdPubkey: {
        x: Uint8Array;
        y: Uint8Array;
    }): Promise<Uint8Array>;
    private prove;
    private buildMerkleProof;
}
/**
 * Parse a Groth16 proof from bytes
 */
declare function parseGroth16Proof(bytes: Uint8Array): Groth16Proof;
/**
 * Serialize a Groth16 proof to bytes
 */
declare function serializeGroth16Proof(proof: Groth16Proof): Uint8Array;

export { CloakCraftClient, type CloakCraftClientConfig, DOMAIN_ACTION_NULLIFIER, DOMAIN_COMMITMENT, DOMAIN_EMPTY_LEAF, DOMAIN_MERKLE, DOMAIN_NULLIFIER_KEY, DOMAIN_SPENDING_NULLIFIER, DOMAIN_STEALTH, GENERATOR, IDENTITY, NoteManager, ProofGenerator, Wallet, bytesToField, checkNullifierSpent, checkStealthOwnership, computeCommitment, createNote, createWallet, createWatchOnlyWallet, decryptNote, deriveActionNullifier, deriveNullifierKey, derivePublicKey, deriveSpendingNullifier, deriveStealthPrivateKey, deriveWalletFromSeed, encryptNote, fieldToBytes, generateRandomness, generateStealthAddress, isInSubgroup, isOnCurve, loadWallet, parseGroth16Proof, pointAdd, poseidonHash, poseidonHash2, poseidonHashDomain, scalarMul, serializeGroth16Proof, tryDecryptNote, verifyCommitment };
