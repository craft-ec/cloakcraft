import { Keypair, SpendingKey, ViewingKey, Point, PoolState, DecryptedNote, ShieldParams, TransactionResult, TransferParams, StealthAddress, AdapterSwapParams, OrderParams, SyncStatus, FieldElement, PoseidonHash, Note, Commitment, Nullifier, EncryptedNote, VoteParams, Groth16Proof } from '@cloakcraft/types';
export * from '@cloakcraft/types';
import * as _solana_web3_js from '@solana/web3.js';
import { PublicKey, AccountMeta, Connection, Keypair as Keypair$1 } from '@solana/web3.js';

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
 * Light Protocol Integration
 *
 * Handles interaction with Helius Photon indexer for compressed account operations.
 * Used for nullifier storage via ZK Compression.
 */

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
interface LightNullifierParams {
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
    /** Data (base64) */
    data: string | null;
}
/**
 * Light Protocol client for Helius Photon indexer
 */
declare class LightClient {
    private readonly rpcUrl;
    constructor(config: HeliusConfig);
    /**
     * Get compressed account by address
     *
     * Returns null if account doesn't exist (nullifier not spent)
     */
    getCompressedAccount(address: Uint8Array): Promise<CompressedAccountInfo | null>;
    /**
     * Check if a nullifier has been spent
     *
     * Returns true if the nullifier compressed account exists
     */
    isNullifierSpent(nullifier: Uint8Array, programId: PublicKey, addressTree: PublicKey): Promise<boolean>;
    /**
     * Get validity proof for creating a new compressed account
     *
     * This proves that the address doesn't exist yet (non-inclusion proof)
     */
    getValidityProof(params: {
        /** New address to create (nullifier address) */
        newAddresses: Uint8Array[];
        /** Address merkle tree */
        addressMerkleTree: PublicKey;
        /** State merkle tree for output */
        stateMerkleTree: PublicKey;
    }): Promise<ValidityProof>;
    /**
     * Prepare Light Protocol params for transact instruction
     */
    prepareLightParams(params: {
        /** Nullifier hash */
        nullifier: Uint8Array;
        /** CloakCraft program ID */
        programId: PublicKey;
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
    }): Promise<LightNullifierParams>;
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
     * Derive nullifier compressed account address
     *
     * Matches the on-chain derive_nullifier_address function
     */
    deriveNullifierAddress(nullifier: Uint8Array, programId: PublicKey, addressTree: PublicKey): Uint8Array;
}
/**
 * Light Protocol tree accounts for devnet
 *
 * These are the default merkle trees on devnet for ZK Compression
 */
declare const DEVNET_LIGHT_TREES: {
    stateMerkleTree: PublicKey;
    addressMerkleTree: PublicKey;
    nullifierQueue: PublicKey;
};
/**
 * Light Protocol tree accounts for mainnet
 */
declare const MAINNET_LIGHT_TREES: {
    stateMerkleTree: PublicKey;
    addressMerkleTree: PublicKey;
    nullifierQueue: PublicKey;
};
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
 * Extended Light client with commitment operations
 */
declare class LightCommitmentClient extends LightClient {
    /**
     * Get commitment by its address
     */
    getCommitment(pool: PublicKey, commitment: Uint8Array, programId: PublicKey, addressTree: PublicKey): Promise<CompressedAccountInfo | null>;
    /**
     * Check if a commitment exists in the tree
     */
    commitmentExists(pool: PublicKey, commitment: Uint8Array, programId: PublicKey, addressTree: PublicKey): Promise<boolean>;
    /**
     * Get merkle proof for a commitment
     *
     * This fetches the inclusion proof from Helius Photon indexer
     */
    getCommitmentMerkleProof(pool: PublicKey, commitment: Uint8Array, programId: PublicKey, addressTree: PublicKey, stateMerkleTree: PublicKey): Promise<CommitmentMerkleProof>;
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
    }): Promise<LightNullifierParams>;
    /**
     * Derive commitment compressed account address
     */
    deriveCommitmentAddress(pool: PublicKey, commitment: Uint8Array, programId: PublicKey, addressTree: PublicKey): Uint8Array;
    /**
     * Convert leaf index to path indices (bit representation)
     */
    private leafIndexToPathIndices;
}

interface CloakCraftClientConfig {
    /** Solana RPC URL */
    rpcUrl: string;
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
}
declare class CloakCraftClient {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly indexerUrl: string;
    readonly network: 'mainnet-beta' | 'devnet';
    private wallet;
    private noteManager;
    private proofGenerator;
    private lightClient;
    constructor(config: CloakCraftClientConfig);
    /**
     * Get Light Protocol tree accounts for current network
     */
    getLightTrees(): {
        stateMerkleTree: PublicKey;
        addressMerkleTree: PublicKey;
        nullifierQueue: PublicKey;
    };
    /**
     * Check if a nullifier has been spent
     *
     * Returns true if the nullifier compressed account exists
     */
    isNullifierSpent(nullifier: Uint8Array): Promise<boolean>;
    /**
     * Prepare Light Protocol params for a transact instruction
     *
     * This fetches the validity proof from Helius for nullifier creation
     */
    prepareLightParams(nullifier: Uint8Array): Promise<LightNullifierParams>;
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
    }, relayer?: Keypair$1): Promise<TransactionResult>;
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
     */
    getSyncStatus(): Promise<SyncStatus>;
    private buildShieldTransaction;
    private buildTransferTransaction;
    private buildAdapterSwapTransaction;
    private buildCreateOrderTransaction;
    private getRelayer;
    private decodePoolState;
    /**
     * Prepare inputs by deriving Y-coordinates from the wallet's spending key
     */
    private prepareInputs;
    /**
     * Prepare outputs by computing commitments
     */
    private prepareOutputs;
    /**
     * Fetch merkle proof from indexer
     */
    private fetchMerkleProof;
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
 *
 * Uses Noir circuits compiled via Sunspot for Groth16 proofs
 */

/**
 * Configuration for Node.js proof generation
 */
interface NodeProverConfig {
    /** Path to circuits directory */
    circuitsDir: string;
    /** Path to sunspot binary */
    sunspotPath: string;
    /** Path to nargo binary */
    nargoPath: string;
}
/**
 * Proof generator using Noir circuits compiled via Sunspot
 */
declare class ProofGenerator {
    private circuits;
    private baseUrl;
    private isInitialized;
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
     */
    private loadCircuitFromFs;
    /**
     * Load circuit from URL (browser)
     */
    private loadCircuitFromUrl;
    /**
     * Check if a circuit is loaded
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
     * Generate a vote proof
     */
    generateVoteProof(params: VoteParams, keypair: Keypair): Promise<Uint8Array>;
    /**
     * Generate a Groth16 proof for a circuit
     */
    private prove;
    /**
     * Native Groth16 prover (WASM-based)
     */
    private proveNative;
    /**
     * Prove via subprocess (Node.js)
     *
     * Workflow:
     * 1. Write Prover.toml with inputs
     * 2. Run nargo execute to generate witness
     * 3. Run sunspot prove with witness, ACIR, CCS, PK
     * 4. Parse proof output
     */
    private proveViaSubprocess;
    /**
     * Convert witness inputs to Prover.toml format
     */
    private inputsToProverToml;
    /** URL for remote Groth16 proving service (browser only) */
    private remoteProverUrl?;
    /**
     * Configure remote prover for browser environments
     *
     * Since Groth16 proving requires heavy computation,
     * browser environments should use a remote proving service.
     */
    configureRemoteProver(url: string): void;
    /**
     * Prove via WASM/remote service (browser)
     *
     * Workflow:
     * 1. Use @noir-lang/noir_js to generate witness from inputs
     * 2. Send witness + circuit artifacts to remote prover
     * 3. Receive Groth16 proof
     */
    private proveViaWasm;
    /**
     * Send witness to remote Groth16 prover
     */
    private proveViaRemote;
    /**
     * Format proof for Solana's alt_bn128 pairing check
     *
     * Solana uses the equation: e(-A, B) * e(alpha, beta) * e(PIC, gamma) * e(C, delta) = 1
     * This requires negating the A-component (negating Y coordinate)
     */
    private formatProofForSolana;
    private buildTransferWitness;
}
/**
 * Parse a Groth16 proof from bytes
 */
declare function parseGroth16Proof(bytes: Uint8Array): Groth16Proof;
/**
 * Serialize a Groth16 proof to bytes
 */
declare function serializeGroth16Proof(proof: Groth16Proof): Uint8Array;

export { CloakCraftClient, type CloakCraftClientConfig, type CommitmentMerkleProof, type CompressedAccountInfo, DEVNET_LIGHT_TREES, DOMAIN_ACTION_NULLIFIER, DOMAIN_COMMITMENT, DOMAIN_EMPTY_LEAF, DOMAIN_MERKLE, DOMAIN_NULLIFIER_KEY, DOMAIN_SPENDING_NULLIFIER, DOMAIN_STEALTH, GENERATOR, type HeliusConfig, IDENTITY, LightClient, LightCommitmentClient, type LightNullifierParams, MAINNET_LIGHT_TREES, NoteManager, type PackedAddressTreeInfo, ProofGenerator, type ValidityProof, Wallet, bytesToField, checkNullifierSpent, checkStealthOwnership, computeCommitment, createNote, createWallet, createWatchOnlyWallet, decryptNote, deriveActionNullifier, deriveNullifierKey, derivePublicKey, deriveSpendingNullifier, deriveStealthPrivateKey, deriveWalletFromSeed, encryptNote, fieldToBytes, generateRandomness, generateStealthAddress, isInSubgroup, isOnCurve, loadWallet, parseGroth16Proof, pointAdd, poseidonHash, poseidonHash2, poseidonHashDomain, scalarMul, serializeGroth16Proof, tryDecryptNote, verifyCommitment };
