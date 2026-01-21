import { EventEmitter } from 'events';
import { TransactionResult } from '@cloakcraft/types';
import { PublicKey } from '@solana/web3.js';

/**
 * Relay protocol definitions
 */
declare const PROTOCOL_VERSION = 1;
declare const PROTOCOL_NAME = "cloakcraft-relay";
declare enum MessageType {
    SUBMIT_TX = 1,
    GET_STATUS = 2,
    PING = 3,
    TX_RESULT = 129,
    STATUS_RESPONSE = 130,
    PONG = 131,
    ERROR = 255
}
interface SubmitTxMessage {
    type: MessageType.SUBMIT_TX;
    requestId: Uint8Array;
    transaction: Uint8Array;
    priority?: 'low' | 'normal' | 'high';
}
interface TxResultMessage {
    type: MessageType.TX_RESULT;
    requestId: Uint8Array;
    success: boolean;
    signature?: string;
    error?: string;
    slot?: number;
}
interface StatusMessage {
    type: MessageType.GET_STATUS;
    requestId: Uint8Array;
}
interface StatusResponseMessage {
    type: MessageType.STATUS_RESPONSE;
    requestId: Uint8Array;
    relayId: string;
    version: number;
    queueSize: number;
    latestSlot: number;
    uptime: number;
}
interface PingMessage {
    type: MessageType.PING;
    timestamp: number;
}
interface PongMessage {
    type: MessageType.PONG;
    timestamp: number;
    relayTimestamp: number;
}
interface ErrorMessage {
    type: MessageType.ERROR;
    requestId?: Uint8Array;
    code: number;
    message: string;
}
type RelayMessage = SubmitTxMessage | TxResultMessage | StatusMessage | StatusResponseMessage | PingMessage | PongMessage | ErrorMessage;
/**
 * Encode a message to bytes
 */
declare function encodeMessage(msg: RelayMessage): Uint8Array;
/**
 * Decode a message from bytes
 */
declare function decodeMessage(data: Uint8Array): RelayMessage;
/**
 * Generate a random request ID
 */
declare function generateRequestId(): Uint8Array;

/**
 * Relay client for submitting transactions through the relay network
 */

interface RelayClientConfig {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
}
/**
 * Client for submitting transactions through relay network
 */
declare class RelayClient extends EventEmitter {
    private discovery;
    private config;
    private socket;
    private mux;
    private channel;
    private pendingRequests;
    constructor(config?: RelayClientConfig);
    /**
     * Connect to the relay network
     */
    connect(): Promise<void>;
    /**
     * Disconnect from relay network
     */
    disconnect(): Promise<void>;
    /**
     * Submit a transaction through the relay
     */
    submitTransaction(transaction: Uint8Array, priority?: 'low' | 'normal' | 'high'): Promise<TransactionResult>;
    /**
     * Get relay status
     */
    getStatus(): Promise<StatusResponseMessage>;
    /**
     * Ping the relay to measure latency
     */
    private ping;
    /**
     * Handle incoming messages
     */
    private handleMessage;
    /**
     * Send a message and wait for response
     */
    private sendAndWait;
}

/**
 * Relay server for processing and submitting transactions
 */

interface RelayServerConfig {
    rpcUrl: string;
    maxQueueSize?: number;
    batchInterval?: number;
    maxBatchSize?: number;
}
/**
 * Relay server for receiving and processing transactions
 */
declare class RelayServer extends EventEmitter {
    private discovery;
    private connection;
    private config;
    private queue;
    private isProcessing;
    private startTime;
    private processedCount;
    private batchTimer?;
    constructor(config: RelayServerConfig);
    /**
     * Start the relay server
     */
    start(): Promise<void>;
    /**
     * Stop the relay server
     */
    stop(): Promise<void>;
    /**
     * Handle incoming messages
     */
    private handleMessage;
    /**
     * Handle transaction submission
     */
    private handleSubmitTx;
    /**
     * Handle status request
     */
    private handleGetStatus;
    /**
     * Handle ping
     */
    private handlePing;
    /**
     * Start batch processing loop
     */
    private startBatchProcessing;
    /**
     * Process a batch of transactions
     */
    private processBatch;
    /**
     * Get server statistics
     */
    getStats(): {
        queueSize: number;
        processedCount: number;
        uptime: number;
        connectedPeers: number;
    };
}

/**
 * Relay discovery service using Hyperswarm DHT
 */

declare const RELAY_TOPIC: Buffer<ArrayBuffer>;
interface RelayPeer {
    id: string;
    address: string;
    port: number;
    lastSeen: number;
    latency?: number;
}
interface DiscoveryConfig {
    bootstrap?: string[];
    maxPeers?: number;
    announceInterval?: number;
}
/**
 * Discovery service for finding relay nodes
 */
declare class DiscoveryService extends EventEmitter {
    private swarm;
    private peers;
    private isServer;
    private config;
    constructor(isServer?: boolean, config?: DiscoveryConfig);
    /**
     * Start the discovery service
     */
    start(): Promise<void>;
    /**
     * Stop the discovery service
     */
    stop(): Promise<void>;
    /**
     * Get list of discovered peers
     */
    getPeers(): RelayPeer[];
    /**
     * Get the best peer (lowest latency)
     */
    getBestPeer(): RelayPeer | null;
    /**
     * Update peer latency
     */
    updatePeerLatency(peerId: string, latency: number): void;
}

/**
 * Eligibility service for voting whitelist management
 *
 * Generates and manages eligibility merkle trees for ballot access control.
 */
interface EligibilityCriteria {
    minBalance?: number;
    nftCollection?: string;
    customAddresses?: string[];
}
interface EligibilityResult {
    eligibilityRoot: string;
    eligibleCount: number;
    treeData: EligibilityTreeData;
}
interface EligibilityTreeData {
    root: string;
    leaves: string[];
    depth: number;
}
interface MerkleProof {
    pubkey: string;
    isEligible: boolean;
    merkleProof: string[];
    pathIndices: number[];
    leafIndex: number;
}
/**
 * Eligibility service for ballot whitelist management
 */
declare class EligibilityService {
    private connection;
    private trees;
    constructor(rpcUrl: string);
    /**
     * Generate eligibility whitelist based on criteria
     */
    generateEligibilityTree(tokenMint: string, snapshotSlot: number, criteria: EligibilityCriteria): Promise<EligibilityResult>;
    /**
     * Get merkle proof for a pubkey
     */
    getMerkleProof(eligibilityRoot: string, pubkey: string): MerkleProof | null;
    /**
     * Build merkle tree from leaves
     */
    private buildMerkleTree;
    /**
     * Generate merkle proof for a leaf index
     */
    private generateProof;
    /**
     * Get token holders above minimum balance at snapshot slot
     */
    private getTokenHolders;
    /**
     * Get NFT holders of a collection at snapshot slot
     */
    private getNftHolders;
    /**
     * Load a previously generated tree
     */
    loadTree(treeData: EligibilityTreeData): void;
    /**
     * Get tree by root
     */
    getTree(eligibilityRoot: string): EligibilityTreeData | undefined;
}

/**
 * Attestation service for balance attestations
 *
 * Signs balance attestations for snapshot mode voting.
 * The indexer attests to a user's token balance at a specific slot.
 */

interface BalanceAttestation {
    pubkey: string;
    ballotId: string;
    tokenMint: string;
    totalAmount: string;
    snapshotSlot: number;
    timestamp: number;
    signature: string;
    indexerPubkey: string;
}
interface AttestationRequest {
    ballotId: string;
    pubkey: string;
    tokenMint: string;
    snapshotSlot: number;
}
/**
 * Attestation service for signing balance attestations
 */
declare class AttestationService {
    private connection;
    private indexerKeypair;
    constructor(rpcUrl: string, indexerSecretKey: Uint8Array);
    /**
     * Get the indexer's public key (for ballot configuration)
     */
    getIndexerPubkey(): PublicKey;
    /**
     * Generate a balance attestation for a user
     */
    generateAttestation(request: AttestationRequest): Promise<BalanceAttestation | null>;
    /**
     * Verify an attestation signature
     */
    verifyAttestation(attestation: BalanceAttestation): boolean;
    /**
     * Build the message to sign for an attestation
     * Format: pubkey || ballot_id || token_mint || total_amount || snapshot_slot
     */
    private buildAttestationMessage;
    /**
     * Get user's total token balance at a specific slot
     * In production, this would use Helius/Photon historical API
     */
    private getBalanceAtSlot;
    /**
     * Get user's shielded balance from indexed notes
     * In production, would scan and aggregate note commitments
     */
    private getShieldedBalance;
}
/**
 * Create a new indexer keypair (for initial setup)
 */
declare function createIndexerKeypair(): {
    publicKey: string;
    secretKey: string;
};

/**
 * Preimage scanner service for vote/position recovery
 *
 * Scans on-chain data to find encrypted vote preimages
 * that allow users to recover their vote details for claims.
 */
interface VotePreimage {
    ballotId: string;
    voteCommitment: string;
    encryptedPreimage: string;
    encryptionType: number;
    bindingMode: number;
    createdSlot: number;
    isNullified: boolean;
}
interface DecryptedPreimage {
    voteChoice: number;
    weight: string;
    randomness: string;
    ballotId: string;
    amount?: string;
}
interface ScanOptions {
    ballotId?: string;
    includeNullified?: boolean;
    limit?: number;
}
/**
 * Preimage scanner for vote/position recovery
 */
declare class PreimageScannerService {
    private connection;
    private programId;
    private preimageIndex;
    constructor(rpcUrl: string, programId: string);
    /**
     * Scan for a user's encrypted vote preimages
     */
    scanUserPreimages(pubkey: string, options?: ScanOptions): Promise<VotePreimage[]>;
    /**
     * Index a new vote preimage (called when vote/position is created)
     */
    indexPreimage(pubkey: string, preimage: VotePreimage): void;
    /**
     * Mark a preimage as nullified (vote changed or position claimed)
     */
    markNullified(pubkey: string, commitment: string): void;
    /**
     * Sync preimages from on-chain data
     * Called periodically to update the index
     */
    syncFromChain(startSlot?: number): Promise<number>;
    /**
     * Get preimage by commitment (for debugging/verification)
     */
    getByCommitment(commitment: string): VotePreimage | null;
    /**
     * Clear index (for testing)
     */
    clearIndex(): void;
    /**
     * Get index stats
     */
    getStats(): {
        userCount: number;
        preimageCount: number;
    };
}
/**
 * Decrypt a preimage using user's private key
 * In production, this would use proper ElGamal/ECIES decryption
 */
declare function decryptPreimage(encryptedPreimage: string, privateKey: Uint8Array, encryptionType: number): DecryptedPreimage | null;

/**
 * Voting API routes
 *
 * REST API endpoints for voting-related services:
 * - Eligibility whitelist generation
 * - Balance attestation
 * - Vote preimage scanning
 */

interface VotingApiConfig {
    rpcUrl: string;
    indexerSecretKey: Uint8Array;
    programId: string;
}
interface EligibilityRequest {
    tokenMint: string;
    snapshotSlot: number;
    criteria: EligibilityCriteria;
}
interface EligibilityResponse {
    eligibilityRoot: string;
    eligibleCount: number;
    treeUrl?: string;
}
interface AttestationResponse extends BalanceAttestation {
}
interface PreimageResponse {
    preimages: VotePreimage[];
}
/**
 * Voting API handler
 */
declare class VotingApi {
    private eligibilityService;
    private attestationService;
    private preimageScannerService;
    constructor(config: VotingApiConfig);
    /**
     * Get indexer public key for ballot configuration
     */
    getIndexerPubkey(): string;
    /**
     * POST /api/voting/eligibility
     *
     * Generate eligibility whitelist based on criteria
     */
    generateEligibility(request: EligibilityRequest): Promise<EligibilityResponse>;
    /**
     * GET /api/voting/eligibility-proof/:eligibilityRoot/:pubkey
     *
     * Get eligibility merkle proof for a pubkey
     */
    getEligibilityProof(eligibilityRoot: string, pubkey: string): MerkleProof | null;
    /**
     * GET /api/voting/attestation/:ballotId/:pubkey
     *
     * Get balance attestation for a user
     */
    getAttestation(ballotId: string, pubkey: string, tokenMint: string, snapshotSlot: number): Promise<AttestationResponse | null>;
    /**
     * POST /api/voting/attestation/verify
     *
     * Verify an attestation signature
     */
    verifyAttestation(attestation: BalanceAttestation): boolean;
    /**
     * GET /api/voting/preimages/:pubkey
     *
     * Scan for user's encrypted vote preimages
     */
    getPreimages(pubkey: string, options?: ScanOptions): Promise<PreimageResponse>;
    /**
     * POST /api/voting/preimages/sync
     *
     * Sync preimages from on-chain data (admin only)
     */
    syncPreimages(startSlot?: number): Promise<{
        syncedCount: number;
    }>;
    /**
     * POST /api/voting/preimages/index
     *
     * Index a new preimage (called by relayer after vote/position creation)
     */
    indexPreimage(pubkey: string, preimage: VotePreimage): void;
    /**
     * POST /api/voting/preimages/nullify
     *
     * Mark a preimage as nullified (called by relayer after vote change/claim)
     */
    markPreimageNullified(pubkey: string, commitment: string): void;
    /**
     * GET /api/voting/stats
     *
     * Get indexer statistics
     */
    getStats(): {
        indexerPubkey: string;
        preimageStats: {
            userCount: number;
            preimageCount: number;
        };
    };
}
/**
 * Express/Hono route handler factory
 *
 * Example usage with Hono:
 * ```typescript
 * import { Hono } from 'hono';
 * import { createVotingRoutes, VotingApiConfig } from './routes/voting';
 *
 * const app = new Hono();
 * const votingRoutes = createVotingRoutes(config);
 * app.route('/api/voting', votingRoutes);
 * ```
 */
declare function createVotingRouteHandlers(api: VotingApi): {
    'POST /eligibility': (req: {
        body: EligibilityRequest;
    }) => Promise<EligibilityResponse>;
    'GET /eligibility-proof/:root/:pubkey': (req: {
        params: {
            root: string;
            pubkey: string;
        };
    }) => MerkleProof;
    'GET /attestation/:ballotId/:pubkey': (req: {
        params: {
            ballotId: string;
            pubkey: string;
        };
        query: {
            tokenMint: string;
            snapshotSlot: string;
        };
    }) => Promise<AttestationResponse>;
    'POST /attestation/verify': (req: {
        body: BalanceAttestation;
    }) => {
        valid: boolean;
    };
    'GET /preimages/:pubkey': (req: {
        params: {
            pubkey: string;
        };
        query: {
            ballotId?: string;
            includeNullified?: string;
        };
    }) => Promise<PreimageResponse>;
    'GET /stats': () => {
        indexerPubkey: string;
        preimageStats: {
            userCount: number;
            preimageCount: number;
        };
    };
};

export { AttestationService, type BalanceAttestation, type DecryptedPreimage, type DiscoveryConfig, DiscoveryService, type EligibilityCriteria, type EligibilityResult, EligibilityService, type ErrorMessage, type MerkleProof, MessageType, PROTOCOL_NAME, PROTOCOL_VERSION, type PingMessage, type PongMessage, PreimageScannerService, RELAY_TOPIC, RelayClient, type RelayClientConfig, type RelayMessage, RelayServer, type RelayServerConfig, type StatusMessage, type StatusResponseMessage, type SubmitTxMessage, type TxResultMessage, type VotePreimage, VotingApi, type VotingApiConfig, createIndexerKeypair, createVotingRouteHandlers, decodeMessage, decryptPreimage, encodeMessage, generateRequestId };
