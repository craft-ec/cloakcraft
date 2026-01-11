import { EventEmitter } from 'events';
import { TransactionResult } from '@cloakcraft/types';

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

export { type DiscoveryConfig, DiscoveryService, type ErrorMessage, MessageType, PROTOCOL_NAME, PROTOCOL_VERSION, type PingMessage, type PongMessage, RELAY_TOPIC, RelayClient, type RelayClientConfig, type RelayMessage, RelayServer, type RelayServerConfig, type StatusMessage, type StatusResponseMessage, type SubmitTxMessage, type TxResultMessage, decodeMessage, encodeMessage, generateRequestId };
