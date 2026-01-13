/**
 * Relay client for submitting transactions through the relay network
 */

import { EventEmitter } from 'events';
import type { TransactionResult } from '@cloakcraft/types';
import { DiscoveryService } from './discovery';
import {
  MessageType,
  encodeMessage,
  decodeMessage,
  generateRequestId,
  PROTOCOL_NAME,
  type RelayMessage,
  type TxResultMessage,
  type StatusResponseMessage,
} from './protocol';

export interface RelayClientConfig {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
}

interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Client for submitting transactions through relay network
 */
export class RelayClient extends EventEmitter {
  private discovery: DiscoveryService;
  private config: Required<RelayClientConfig>;
  private socket: any = null;
  private mux: any = null;
  private channel: any = null;
  private pendingRequests: Map<string, PendingRequest> = new Map();

  constructor(config: RelayClientConfig = {}) {
    super();
    this.discovery = new DiscoveryService(false);
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1000,
      timeout: config.timeout ?? 30000,
    };
  }

  /**
   * Connect to the relay network
   */
  async connect(): Promise<void> {
    await this.discovery.start();

    this.discovery.on('peer', async ({ socket, peerId }) => {
      console.log(`Connected to relay: ${peerId}`);

      this.socket = socket;

      // Set up Protomux
      const Protomux = (await import('protomux')).default;
      this.mux = Protomux.from(socket);

      this.channel = this.mux.createChannel({
        protocol: PROTOCOL_NAME,
        onopen: () => {
          console.log('Relay channel open');
          this.emit('connected', peerId);
        },
        onclose: () => {
          console.log('Relay channel closed');
          this.emit('disconnected', peerId);
        },
      });

      // Message handler
      this.channel.addMessage({
        encoding: {
          encode: (msg: Uint8Array) => msg,
          decode: (buf: Buffer) => new Uint8Array(buf),
        },
        onmessage: (data: Uint8Array) => {
          this.handleMessage(decodeMessage(data));
        },
      });

      await this.channel.open();

      // Ping to measure latency
      this.ping(peerId);
    });
  }

  /**
   * Disconnect from relay network
   */
  async disconnect(): Promise<void> {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (this.mux) {
      this.mux = null;
    }
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
    await this.discovery.stop();

    // Reject all pending requests
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error('Client disconnected'));
    }
    this.pendingRequests.clear();
  }

  /**
   * Submit a transaction through the relay
   */
  async submitTransaction(
    transaction: Uint8Array,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<TransactionResult> {
    if (!this.channel) {
      throw new Error('Not connected to relay');
    }

    const requestId = generateRequestId();
    const message = encodeMessage({
      type: MessageType.SUBMIT_TX,
      requestId,
      transaction,
      priority,
    });

    return this.sendAndWait<TxResultMessage>(requestId, message).then((result) => {
      if (!result.success) {
        throw new Error(result.error ?? 'Transaction failed');
      }
      return {
        signature: result.signature!,
        slot: result.slot!,
      };
    });
  }

  /**
   * Get relay status
   */
  async getStatus(): Promise<StatusResponseMessage> {
    if (!this.channel) {
      throw new Error('Not connected to relay');
    }

    const requestId = generateRequestId();
    const message = encodeMessage({
      type: MessageType.GET_STATUS,
      requestId,
    });

    return this.sendAndWait<StatusResponseMessage>(requestId, message);
  }

  /**
   * Ping the relay to measure latency
   */
  private async ping(peerId: string): Promise<void> {
    const start = Date.now();
    const message = encodeMessage({
      type: MessageType.PING,
      timestamp: start,
    });

    this.channel.messages[0].send(message);

    // Latency will be updated when pong is received
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(msg: RelayMessage): void {
    switch (msg.type) {
      case MessageType.TX_RESULT:
      case MessageType.STATUS_RESPONSE: {
        const requestId = Buffer.from(msg.requestId).toString('hex');
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(requestId);
          pending.resolve(msg);
        }
        break;
      }

      case MessageType.PONG: {
        const latency = Date.now() - msg.timestamp;
        const peerId = this.socket?.publicKey?.toString('hex');
        if (peerId) {
          this.discovery.updatePeerLatency(peerId, latency);
          this.emit('latency', { peerId, latency });
        }
        break;
      }

      case MessageType.ERROR: {
        if (msg.requestId) {
          const requestId = Buffer.from(msg.requestId).toString('hex');
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(requestId);
            pending.reject(new Error(msg.message));
          }
        }
        this.emit('error', new Error(msg.message));
        break;
      }
    }
  }

  /**
   * Send a message and wait for response
   */
  private sendAndWait<T>(requestId: Uint8Array, message: Uint8Array): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = Buffer.from(requestId).toString('hex');

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }, this.config.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.channel.messages[0].send(message);
    });
  }
}
