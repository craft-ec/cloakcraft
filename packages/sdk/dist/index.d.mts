import { DecryptedNote, Keypair, SpendingKey, ViewingKey, Point, TransferParams, AdapterSwapParams, OrderParams, VoteParams, Groth16Proof, PoolState, ShieldParams, TransactionResult, StealthAddress, SyncStatus, FieldElement, PoseidonHash, Note, Commitment, Nullifier, EncryptedNote } from '@cloakcraft/types';
export * from '@cloakcraft/types';
import * as _solana_web3_js from '@solana/web3.js';
import { PublicKey, AccountMeta, Connection, Keypair as Keypair$1, TransactionInstruction } from '@solana/web3.js';
import * as _lightprotocol_stateless_js from '@lightprotocol/stateless.js';
import { Rpc } from '@lightprotocol/stateless.js';
import { Program } from '@coral-xyz/anchor';
import { Poseidon } from 'circomlibjs';

/**
 * Light Protocol Integration
 *
 * Handles interaction with Helius Photon indexer for compressed account operations.
 * Used for nullifier and commitment storage via ZK Compression.
 * Includes note scanner for finding user's notes in compressed accounts.
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
    /** Data object with discriminator and base64 data */
    data: {
        discriminator: number;
        data: string;
    } | null;
}
/**
 * Light Protocol client for Helius Photon indexer
 */
declare class LightClient {
    protected readonly rpcUrl: string;
    protected readonly lightRpc: Rpc;
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
    isNullifierSpent(nullifier: Uint8Array, programId: PublicKey, addressTree: PublicKey, pool: PublicKey): Promise<boolean>;
    /**
     * Get validity proof for creating a new compressed account
     *
     * This proves that the address doesn't exist yet (non-inclusion proof)
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
    }): Promise<LightNullifierParams>;
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
     * @param viewingKey - User's viewing private key (for decryption)
     * @param programId - CloakCraft program ID
     * @param pool - Pool to scan (optional, scans all if not provided)
     * @returns Array of decrypted notes owned by the user
     */
    scanNotes(viewingKey: bigint, programId: PublicKey, pool?: PublicKey): Promise<DecryptedNote[]>;
    /**
     * Get all commitment compressed accounts
     *
     * @param programId - CloakCraft program ID
     * @param poolPda - Pool PDA to filter by (optional). Note: pass the pool PDA, not the token mint.
     */
    getCommitmentAccounts(programId: PublicKey, poolPda?: PublicKey): Promise<CompressedAccountInfo[]>;
    /**
     * Parse commitment account data from base64
     *
     * Note: Helius returns discriminator separately, so data doesn't include it
     * Layout (after discriminator):
     * - pool: 32 bytes
     * - commitment: 32 bytes
     * - leaf_index: 8 bytes (u64)
     * - stealth_ephemeral_pubkey: 64 bytes (X + Y coordinates)
     * - encrypted_note_len: 4 bytes (u32)
     * - encrypted_note: variable bytes
     * - created_at: 8 bytes (i64)
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
     * Get circom file name from circuit name
     */
    private getCircomFileName;
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
    /** Base URL for circuit artifacts (browser only) */
    circuitsBaseUrl?: string;
    /** Node.js prover config (auto-detected if not provided) */
    nodeProverConfig?: {
        circuitsDir: string;
        sunspotPath: string;
        nargoPath: string;
    };
}
declare class CloakCraftClient {
    readonly connection: Connection;
    readonly programId: PublicKey;
    readonly rpcUrl: string;
    readonly indexerUrl: string;
    readonly network: 'mainnet-beta' | 'devnet';
    private wallet;
    private noteManager;
    private proofGenerator;
    private lightClient;
    private program;
    private heliusRpcUrl;
    constructor(config: CloakCraftClientConfig);
    /**
     * Get the Helius RPC URL (required for Light Protocol operations)
     */
    getHeliusRpcUrl(): string;
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
     * Set the Anchor program instance
     * Required for transaction building
     */
    setProgram(program: Program): void;
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
    prepareLightParams(nullifier: Uint8Array, pool: PublicKey): Promise<LightNullifierParams>;
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
     * Sync notes for the current wallet
     */
    syncNotes(): Promise<DecryptedNote[]>;
    /**
     * Get unspent notes for a token
     */
    getUnspentNotes(tokenMint: PublicKey): Promise<DecryptedNote[]>;
    /**
     * Shield tokens into the pool
     *
     * Uses the new instruction builder for full Light Protocol integration
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
    /**
     * Scan for notes belonging to the current wallet
     *
     * Uses the Light Protocol scanner to find and decrypt notes
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
}

/**
 * Poseidon hash implementation for BN254 scalar field
 *
 * Uses circomlibjs which matches Noir's Poseidon implementation (not Poseidon2)
 * Compatible with Solana's sol_poseidon syscall
 */

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
 * Uses circomlibjs which matches Noir's Poseidon implementation.
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
};
declare const DEVNET_V2_TREES: {
    readonly STATE_TREE: PublicKey;
    readonly OUTPUT_QUEUE: PublicKey;
    readonly ADDRESS_TREE: PublicKey;
};
declare const CIRCUIT_IDS: {
    readonly TRANSFER_1X2: "transfer_1x2";
    readonly TRANSFER_1X3: "transfer_1x3";
    readonly TRANSFER_2X2: "transfer_2x2";
    readonly TRANSFER_2X3: "transfer_2x3";
    readonly TRANSFER_3X2: "transfer_3x2";
    readonly TRANSFER_3X3: "transfer_3x3";
};
/**
 * Pad circuit ID to 32 bytes
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
declare function deriveVerificationKeyPda(circuitId: string, programId?: PublicKey): [PublicKey, number];

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
     * Get combined validity proof for transact:
     * - Inclusion proof for commitment (proves note exists on-chain)
     * - Non-inclusion proof for nullifier (proves not yet spent)
     *
     * This prevents fake commitment attacks where someone fabricates
     * commitment data without having actually shielded tokens.
     */
    getCombinedValidityProof(commitmentAccountHash: string, nullifierAddress: PublicKey): Promise<_lightprotocol_stateless_js.ValidityProofWithContext>;
    /**
     * Build remaining accounts for Light Protocol CPI
     */
    buildRemainingAccounts(): {
        accounts: AccountMeta[];
        outputTreeIndex: number;
        addressTreeIndex: number;
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
 * Combined validity proof verifies:
 * - Commitment exists (inclusion) - prevents fake commitment attacks
 * - Nullifier doesn't exist (non-inclusion) - prevents double-spend
 */
interface LightTransactParams {
    /** Combined validity proof (commitment inclusion + nullifier non-inclusion) */
    validityProof: {
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
 * Shield Instruction Builder
 *
 * Deposits tokens into the privacy pool and creates a commitment
 */

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
    /** Account hash from scanning (for commitment existence proof) */
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
 * Transact parameters
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
    /** Relayer public key */
    relayer: PublicKey;
    /** ZK proof bytes */
    proof: Uint8Array;
    /** Pre-computed nullifier (must match ZK proof) */
    nullifier?: Uint8Array;
    /** Pre-computed input commitment (must match ZK proof) */
    inputCommitment?: Uint8Array;
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
}
/**
 * Build transact transaction using Anchor program
 */
declare function buildTransactWithProgram(program: Program, params: TransactInstructionParams, rpcUrl: string, circuitId?: string): Promise<{
    tx: any;
    result: TransactResult;
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
 */
declare function initializePool(program: Program, tokenMint: PublicKey, authority: PublicKey, payer: PublicKey): Promise<{
    poolTx: string;
    counterTx: string;
}>;

export { CIRCUIT_IDS, type CircomArtifacts, CloakCraftClient, type CloakCraftClientConfig, type CommitmentMerkleProof, type CompressedAccountInfo, DEVNET_LIGHT_TREES, DEVNET_V2_TREES, DOMAIN_ACTION_NULLIFIER, DOMAIN_COMMITMENT, DOMAIN_EMPTY_LEAF, DOMAIN_MERKLE, DOMAIN_NULLIFIER_KEY, DOMAIN_SPENDING_NULLIFIER, DOMAIN_STEALTH, FIELD_MODULUS_FQ, FIELD_MODULUS_FR, GENERATOR, type HeliusConfig, IDENTITY, type InitializePoolParams, LightClient, LightCommitmentClient, type LightNullifierParams, LightProtocol, type LightShieldParams, type LightStoreCommitmentParams, type LightTransactParams, MAINNET_LIGHT_TREES, NoteManager, PROGRAM_ID, type PackedAddressTreeInfo, ProofGenerator, SEEDS, type ScannedNote, type ShieldInstructionParams, type ShieldResult, type StateTreeSet, type StoreCommitmentParams, type TransactInput, type TransactInstructionParams, type TransactOutput, type TransactResult, type ValidityProof, WALLET_DERIVATION_MESSAGE, Wallet, bigintToFieldString, buildInitializeCommitmentCounterWithProgram, buildInitializePoolWithProgram, buildShieldInstructions, buildShieldWithProgram, buildStoreCommitmentWithProgram, buildTransactWithProgram, bytesToField, bytesToFieldString, checkNullifierSpent, checkStealthOwnership, computeCircuitInputs, computeCommitment, createNote, createWallet, createWatchOnlyWallet, decryptNote, deriveActionNullifier, deriveCommitmentCounterPda, deriveNullifierKey, derivePoolPda, derivePublicKey, deriveSpendingNullifier, deriveStealthPrivateKey, deriveVaultPda, deriveVerificationKeyPda, deriveWalletFromSeed, deriveWalletFromSignature, deserializeEncryptedNote, encryptNote, fieldToBytes, generateRandomness, generateSnarkjsProof, generateStealthAddress, getRandomStateTreeSet, getStateTreeSet, initPoseidon, initializePool, isInSubgroup, isOnCurve, loadCircomArtifacts, loadWallet, padCircuitId, parseGroth16Proof, pointAdd, poseidonHash, poseidonHash2, poseidonHashAsync, poseidonHashDomain, poseidonHashDomainAsync, scalarMul, serializeEncryptedNote, serializeGroth16Proof, storeCommitments, tryDecryptNote, verifyCommitment };
