/**
 * Relay server for processing and submitting transactions
 */

import { EventEmitter } from 'events';
import { Connection, Transaction } from '@solana/web3.js';
import { DiscoveryService } from './discovery';
import {
  MessageType,
  encodeMessage,
  decodeMessage,
  PROTOCOL_NAME,
  type RelayMessage,
  type SubmitTxMessage,
  type StatusMessage,
} from './protocol';

export interface RelayServerConfig {
  rpcUrl: string;
  maxQueueSize?: number;
  batchInterval?: number;
  maxBatchSize?: number;
}

interface QueuedTransaction {
  requestId: Uint8Array;
  transaction: Uint8Array;
  priority: 'low' | 'normal' | 'high';
  channel: any;
  timestamp: number;
}

/**
 * Relay server for receiving and processing transactions
 */
export class RelayServer extends EventEmitter {
  private discovery: DiscoveryService;
  private connection: Connection;
  private config: Required<RelayServerConfig>;
  private queue: QueuedTransaction[] = [];
  private isProcessing: boolean = false;
  private startTime: number = Date.now();
  private processedCount: number = 0;
  private batchTimer?: NodeJS.Timeout;

  constructor(config: RelayServerConfig) {
    super();
    this.discovery = new DiscoveryService(true);
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.config = {
      rpcUrl: config.rpcUrl,
      maxQueueSize: config.maxQueueSize ?? 1000,
      batchInterval: config.batchInterval ?? 500,
      maxBatchSize: config.maxBatchSize ?? 10,
    };
  }

  /**
   * Start the relay server
   */
  async start(): Promise<void> {
    await this.discovery.start();

    this.discovery.on('peer', async ({ socket, peerId }) => {
      console.log(`Client connected: ${peerId}`);

      // Set up Protomux
      const Protomux = (await import('protomux')).default;
      const mux = Protomux.from(socket);

      const channel = mux.createChannel({
        protocol: PROTOCOL_NAME,
        onopen: () => {
          console.log(`Channel open with ${peerId}`);
          this.emit('client:connected', peerId);
        },
        onclose: () => {
          console.log(`Channel closed with ${peerId}`);
          this.emit('client:disconnected', peerId);
        },
      });

      // Message handler
      channel.addMessage({
        encoding: {
          encode: (msg: Uint8Array) => msg,
          decode: (buf: Buffer) => new Uint8Array(buf),
        },
        onmessage: (data: Uint8Array) => {
          this.handleMessage(decodeMessage(data), channel);
        },
      });

      await channel.open();
    });

    // Start batch processing
    this.startBatchProcessing();

    console.log('Relay server started');
    this.emit('started');
  }

  /**
   * Stop the relay server
   */
  async stop(): Promise<void> {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = undefined;
    }
    await this.discovery.stop();
    this.queue = [];
    this.emit('stopped');
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(msg: RelayMessage, channel: any): void {
    switch (msg.type) {
      case MessageType.SUBMIT_TX:
        this.handleSubmitTx(msg as SubmitTxMessage, channel);
        break;

      case MessageType.GET_STATUS:
        this.handleGetStatus(msg as StatusMessage, channel);
        break;

      case MessageType.PING:
        this.handlePing(msg, channel);
        break;
    }
  }

  /**
   * Handle transaction submission
   */
  private handleSubmitTx(msg: SubmitTxMessage, channel: any): void {
    if (this.queue.length >= this.config.maxQueueSize) {
      const response = encodeMessage({
        type: MessageType.ERROR,
        requestId: msg.requestId,
        code: 503,
        message: 'Queue full, try again later',
      });
      channel.messages[0].send(response);
      return;
    }

    // Add to queue
    this.queue.push({
      requestId: msg.requestId,
      transaction: msg.transaction,
      priority: msg.priority ?? 'normal',
      channel,
      timestamp: Date.now(),
    });

    // Sort by priority
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    this.emit('tx:queued', { requestId: msg.requestId, queueSize: this.queue.length });
  }

  /**
   * Handle status request
   */
  private handleGetStatus(msg: StatusMessage, channel: any): void {
    const response = encodeMessage({
      type: MessageType.STATUS_RESPONSE,
      requestId: msg.requestId,
      relayId: this.discovery.getPeers()[0]?.id ?? 'unknown',
      version: 1,
      queueSize: this.queue.length,
      latestSlot: 0, // Would fetch from RPC
      uptime: Date.now() - this.startTime,
    });
    channel.messages[0].send(response);
  }

  /**
   * Handle ping
   */
  private handlePing(msg: any, channel: any): void {
    const response = encodeMessage({
      type: MessageType.PONG,
      timestamp: msg.timestamp,
      relayTimestamp: Date.now(),
    });
    channel.messages[0].send(response);
  }

  /**
   * Start batch processing loop
   */
  private startBatchProcessing(): void {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.config.batchInterval);
  }

  /**
   * Process a batch of transactions
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      const batch = this.queue.splice(0, this.config.maxBatchSize);

      await Promise.all(
        batch.map(async (item) => {
          try {
            // Deserialize and submit transaction
            const tx = Transaction.from(item.transaction);
            const signature = await this.connection.sendRawTransaction(item.transaction, {
              skipPreflight: false,
              preflightCommitment: 'confirmed',
            });

            // Wait for confirmation and check for execution errors
            const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
            if (confirmation.value.err) {
              throw new Error(`Transaction reverted: ${JSON.stringify(confirmation.value.err)}`);
            }

            // Send result
            const response = encodeMessage({
              type: MessageType.TX_RESULT,
              requestId: item.requestId,
              success: true,
              signature,
              slot: confirmation.context.slot,
            });
            item.channel.messages[0].send(response);

            this.processedCount++;
            this.emit('tx:processed', { signature, slot: confirmation.context.slot });
          } catch (err) {
            // Send error
            const response = encodeMessage({
              type: MessageType.TX_RESULT,
              requestId: item.requestId,
              success: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            });
            item.channel.messages[0].send(response);

            this.emit('tx:failed', { error: err });
          }
        })
      );
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get server statistics
   */
  getStats(): {
    queueSize: number;
    processedCount: number;
    uptime: number;
    connectedPeers: number;
  } {
    return {
      queueSize: this.queue.length,
      processedCount: this.processedCount,
      uptime: Date.now() - this.startTime,
      connectedPeers: this.discovery.getPeers().length,
    };
  }
}
