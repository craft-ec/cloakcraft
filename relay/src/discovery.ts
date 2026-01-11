/**
 * Relay discovery service using Hyperswarm DHT
 */

import { EventEmitter } from 'events';

// Topic for relay discovery
export const RELAY_TOPIC = Buffer.from('cloakcraft-relay-v1');

interface RelayPeer {
  id: string;
  address: string;
  port: number;
  lastSeen: number;
  latency?: number;
}

export interface DiscoveryConfig {
  bootstrap?: string[];
  maxPeers?: number;
  announceInterval?: number;
}

/**
 * Discovery service for finding relay nodes
 */
export class DiscoveryService extends EventEmitter {
  private swarm: any;
  private peers: Map<string, RelayPeer> = new Map();
  private isServer: boolean;
  private config: DiscoveryConfig;

  constructor(isServer: boolean = false, config: DiscoveryConfig = {}) {
    super();
    this.isServer = isServer;
    this.config = {
      maxPeers: config.maxPeers ?? 10,
      announceInterval: config.announceInterval ?? 60000,
      ...config,
    };
  }

  /**
   * Start the discovery service
   */
  async start(): Promise<void> {
    // Dynamic import for Hyperswarm
    const Hyperswarm = (await import('hyperswarm')).default;

    this.swarm = new Hyperswarm();

    this.swarm.on('connection', (socket: any, info: any) => {
      const peerId = info.publicKey.toString('hex');

      // Add to peers
      this.peers.set(peerId, {
        id: peerId,
        address: socket.remoteAddress,
        port: socket.remotePort,
        lastSeen: Date.now(),
      });

      this.emit('peer', { socket, info, peerId });

      socket.on('close', () => {
        this.peers.delete(peerId);
        this.emit('peer:disconnect', peerId);
      });

      socket.on('error', (err: Error) => {
        console.error(`Peer ${peerId} error:`, err.message);
      });
    });

    // Join the relay topic
    const discovery = this.swarm.join(RELAY_TOPIC, {
      server: this.isServer,
      client: !this.isServer,
    });

    if (this.isServer) {
      await discovery.flushed();
      console.log('Relay announced to DHT');
    }

    this.emit('started');
  }

  /**
   * Stop the discovery service
   */
  async stop(): Promise<void> {
    if (this.swarm) {
      await this.swarm.leave(RELAY_TOPIC);
      await this.swarm.destroy();
      this.swarm = null;
    }
    this.peers.clear();
    this.emit('stopped');
  }

  /**
   * Get list of discovered peers
   */
  getPeers(): RelayPeer[] {
    return Array.from(this.peers.values());
  }

  /**
   * Get the best peer (lowest latency)
   */
  getBestPeer(): RelayPeer | null {
    const peers = this.getPeers();
    if (peers.length === 0) return null;

    // Prefer peers with known latency
    const withLatency = peers.filter((p) => p.latency !== undefined);
    if (withLatency.length > 0) {
      return withLatency.reduce((best, p) =>
        (p.latency ?? Infinity) < (best.latency ?? Infinity) ? p : best
      );
    }

    // Otherwise return most recently seen
    return peers.reduce((best, p) => (p.lastSeen > best.lastSeen ? p : best));
  }

  /**
   * Update peer latency
   */
  updatePeerLatency(peerId: string, latency: number): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.latency = latency;
      peer.lastSeen = Date.now();
    }
  }
}
