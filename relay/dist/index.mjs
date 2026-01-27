var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// src/client.ts
import { EventEmitter as EventEmitter2 } from "events";

// src/discovery.ts
import { EventEmitter } from "events";
var RELAY_TOPIC = Buffer.from("cloakcraft-relay-v1");
var DiscoveryService = class extends EventEmitter {
  constructor(isServer = false, config = {}) {
    super();
    this.peers = /* @__PURE__ */ new Map();
    this.isServer = isServer;
    this.config = {
      maxPeers: config.maxPeers ?? 10,
      announceInterval: config.announceInterval ?? 6e4,
      ...config
    };
  }
  /**
   * Start the discovery service
   */
  async start() {
    const Hyperswarm = (await import("hyperswarm")).default;
    this.swarm = new Hyperswarm();
    this.swarm.on("connection", (socket, info) => {
      const peerId = info.publicKey.toString("hex");
      this.peers.set(peerId, {
        id: peerId,
        address: socket.remoteAddress,
        port: socket.remotePort,
        lastSeen: Date.now()
      });
      this.emit("peer", { socket, info, peerId });
      socket.on("close", () => {
        this.peers.delete(peerId);
        this.emit("peer:disconnect", peerId);
      });
      socket.on("error", (err) => {
        console.error(`Peer ${peerId} error:`, err.message);
      });
    });
    const discovery = this.swarm.join(RELAY_TOPIC, {
      server: this.isServer,
      client: !this.isServer
    });
    if (this.isServer) {
      await discovery.flushed();
      console.log("Relay announced to DHT");
    }
    this.emit("started");
  }
  /**
   * Stop the discovery service
   */
  async stop() {
    if (this.swarm) {
      await this.swarm.leave(RELAY_TOPIC);
      await this.swarm.destroy();
      this.swarm = null;
    }
    this.peers.clear();
    this.emit("stopped");
  }
  /**
   * Get list of discovered peers
   */
  getPeers() {
    return Array.from(this.peers.values());
  }
  /**
   * Get the best peer (lowest latency)
   */
  getBestPeer() {
    const peers = this.getPeers();
    if (peers.length === 0) return null;
    const withLatency = peers.filter((p) => p.latency !== void 0);
    if (withLatency.length > 0) {
      return withLatency.reduce(
        (best, p) => (p.latency ?? Infinity) < (best.latency ?? Infinity) ? p : best
      );
    }
    return peers.reduce((best, p) => p.lastSeen > best.lastSeen ? p : best);
  }
  /**
   * Update peer latency
   */
  updatePeerLatency(peerId, latency) {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.latency = latency;
      peer.lastSeen = Date.now();
    }
  }
};

// src/protocol.ts
var PROTOCOL_VERSION = 1;
var PROTOCOL_NAME = "cloakcraft-relay";
var MessageType = /* @__PURE__ */ ((MessageType2) => {
  MessageType2[MessageType2["SUBMIT_TX"] = 1] = "SUBMIT_TX";
  MessageType2[MessageType2["GET_STATUS"] = 2] = "GET_STATUS";
  MessageType2[MessageType2["PING"] = 3] = "PING";
  MessageType2[MessageType2["TX_RESULT"] = 129] = "TX_RESULT";
  MessageType2[MessageType2["STATUS_RESPONSE"] = 130] = "STATUS_RESPONSE";
  MessageType2[MessageType2["PONG"] = 131] = "PONG";
  MessageType2[MessageType2["ERROR"] = 255] = "ERROR";
  return MessageType2;
})(MessageType || {});
function encodeMessage(msg) {
  const json = JSON.stringify(
    msg,
    (_, value) => value instanceof Uint8Array ? Array.from(value) : value
  );
  const payload = new TextEncoder().encode(json);
  const buffer = new Uint8Array(4 + payload.length);
  buffer[0] = PROTOCOL_VERSION;
  buffer[1] = msg.type;
  buffer[2] = payload.length >> 8 & 255;
  buffer[3] = payload.length & 255;
  buffer.set(payload, 4);
  return buffer;
}
function decodeMessage(data) {
  if (data.length < 4) {
    throw new Error("Message too short");
  }
  const version = data[0];
  if (version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${version}`);
  }
  const type = data[1];
  const length = data[2] << 8 | data[3];
  if (data.length < 4 + length) {
    throw new Error("Incomplete message");
  }
  const payloadBytes = data.slice(4, 4 + length);
  const json = new TextDecoder().decode(payloadBytes);
  const parsed = JSON.parse(json, (key, value) => {
    if (Array.isArray(value) && value.every((n) => typeof n === "number")) {
      return new Uint8Array(value);
    }
    return value;
  });
  parsed.type = type;
  return parsed;
}
function generateRequestId() {
  const id = new Uint8Array(16);
  if (typeof crypto !== "undefined") {
    crypto.getRandomValues(id);
  } else {
    __require("crypto").randomFillSync(id);
  }
  return id;
}

// src/client.ts
var RelayClient = class extends EventEmitter2 {
  constructor(config = {}) {
    super();
    this.socket = null;
    this.mux = null;
    this.channel = null;
    this.pendingRequests = /* @__PURE__ */ new Map();
    this.discovery = new DiscoveryService(false);
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 1e3,
      timeout: config.timeout ?? 3e4
    };
  }
  /**
   * Connect to the relay network
   */
  async connect() {
    await this.discovery.start();
    this.discovery.on("peer", async ({ socket, peerId }) => {
      console.log(`Connected to relay: ${peerId}`);
      this.socket = socket;
      const Protomux = (await import("protomux")).default;
      this.mux = Protomux.from(socket);
      this.channel = this.mux.createChannel({
        protocol: PROTOCOL_NAME,
        onopen: () => {
          console.log("Relay channel open");
          this.emit("connected", peerId);
        },
        onclose: () => {
          console.log("Relay channel closed");
          this.emit("disconnected", peerId);
        }
      });
      this.channel.addMessage({
        encoding: {
          encode: (msg) => msg,
          decode: (buf) => new Uint8Array(buf)
        },
        onmessage: (data) => {
          this.handleMessage(decodeMessage(data));
        }
      });
      await this.channel.open();
      this.ping(peerId);
    });
  }
  /**
   * Disconnect from relay network
   */
  async disconnect() {
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
    for (const [id, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      request.reject(new Error("Client disconnected"));
    }
    this.pendingRequests.clear();
  }
  /**
   * Submit a transaction through the relay
   */
  async submitTransaction(transaction, priority = "normal") {
    if (!this.channel) {
      throw new Error("Not connected to relay");
    }
    const requestId = generateRequestId();
    const message = encodeMessage({
      type: 1 /* SUBMIT_TX */,
      requestId,
      transaction,
      priority
    });
    return this.sendAndWait(requestId, message).then((result) => {
      if (!result.success) {
        throw new Error(result.error ?? "Transaction failed");
      }
      return {
        signature: result.signature,
        slot: result.slot
      };
    });
  }
  /**
   * Get relay status
   */
  async getStatus() {
    if (!this.channel) {
      throw new Error("Not connected to relay");
    }
    const requestId = generateRequestId();
    const message = encodeMessage({
      type: 2 /* GET_STATUS */,
      requestId
    });
    return this.sendAndWait(requestId, message);
  }
  /**
   * Ping the relay to measure latency
   */
  async ping(peerId) {
    const start = Date.now();
    const message = encodeMessage({
      type: 3 /* PING */,
      timestamp: start
    });
    this.channel.messages[0].send(message);
  }
  /**
   * Handle incoming messages
   */
  handleMessage(msg) {
    switch (msg.type) {
      case 129 /* TX_RESULT */:
      case 130 /* STATUS_RESPONSE */: {
        const requestId = Buffer.from(msg.requestId).toString("hex");
        const pending = this.pendingRequests.get(requestId);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pendingRequests.delete(requestId);
          pending.resolve(msg);
        }
        break;
      }
      case 131 /* PONG */: {
        const latency = Date.now() - msg.timestamp;
        const peerId = this.socket?.publicKey?.toString("hex");
        if (peerId) {
          this.discovery.updatePeerLatency(peerId, latency);
          this.emit("latency", { peerId, latency });
        }
        break;
      }
      case 255 /* ERROR */: {
        if (msg.requestId) {
          const requestId = Buffer.from(msg.requestId).toString("hex");
          const pending = this.pendingRequests.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(requestId);
            pending.reject(new Error(msg.message));
          }
        }
        this.emit("error", new Error(msg.message));
        break;
      }
    }
  }
  /**
   * Send a message and wait for response
   */
  sendAndWait(requestId, message) {
    return new Promise((resolve, reject) => {
      const id = Buffer.from(requestId).toString("hex");
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("Request timeout"));
      }, this.config.timeout);
      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.channel.messages[0].send(message);
    });
  }
};

// src/server.ts
import { EventEmitter as EventEmitter3 } from "events";
import { Connection, Transaction } from "@solana/web3.js";
var RelayServer = class extends EventEmitter3 {
  constructor(config) {
    super();
    this.queue = [];
    this.isProcessing = false;
    this.startTime = Date.now();
    this.processedCount = 0;
    this.discovery = new DiscoveryService(true);
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.config = {
      rpcUrl: config.rpcUrl,
      maxQueueSize: config.maxQueueSize ?? 1e3,
      batchInterval: config.batchInterval ?? 500,
      maxBatchSize: config.maxBatchSize ?? 10
    };
  }
  /**
   * Start the relay server
   */
  async start() {
    await this.discovery.start();
    this.discovery.on("peer", async ({ socket, peerId }) => {
      console.log(`Client connected: ${peerId}`);
      const Protomux = (await import("protomux")).default;
      const mux = Protomux.from(socket);
      const channel = mux.createChannel({
        protocol: PROTOCOL_NAME,
        onopen: () => {
          console.log(`Channel open with ${peerId}`);
          this.emit("client:connected", peerId);
        },
        onclose: () => {
          console.log(`Channel closed with ${peerId}`);
          this.emit("client:disconnected", peerId);
        }
      });
      channel.addMessage({
        encoding: {
          encode: (msg) => msg,
          decode: (buf) => new Uint8Array(buf)
        },
        onmessage: (data) => {
          this.handleMessage(decodeMessage(data), channel);
        }
      });
      await channel.open();
    });
    this.startBatchProcessing();
    console.log("Relay server started");
    this.emit("started");
  }
  /**
   * Stop the relay server
   */
  async stop() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = void 0;
    }
    await this.discovery.stop();
    this.queue = [];
    this.emit("stopped");
  }
  /**
   * Handle incoming messages
   */
  handleMessage(msg, channel) {
    switch (msg.type) {
      case 1 /* SUBMIT_TX */:
        this.handleSubmitTx(msg, channel);
        break;
      case 2 /* GET_STATUS */:
        this.handleGetStatus(msg, channel);
        break;
      case 3 /* PING */:
        this.handlePing(msg, channel);
        break;
    }
  }
  /**
   * Handle transaction submission
   */
  handleSubmitTx(msg, channel) {
    if (this.queue.length >= this.config.maxQueueSize) {
      const response = encodeMessage({
        type: 255 /* ERROR */,
        requestId: msg.requestId,
        code: 503,
        message: "Queue full, try again later"
      });
      channel.messages[0].send(response);
      return;
    }
    this.queue.push({
      requestId: msg.requestId,
      transaction: msg.transaction,
      priority: msg.priority ?? "normal",
      channel,
      timestamp: Date.now()
    });
    this.queue.sort((a, b) => {
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
    this.emit("tx:queued", { requestId: msg.requestId, queueSize: this.queue.length });
  }
  /**
   * Handle status request
   */
  handleGetStatus(msg, channel) {
    const response = encodeMessage({
      type: 130 /* STATUS_RESPONSE */,
      requestId: msg.requestId,
      relayId: this.discovery.getPeers()[0]?.id ?? "unknown",
      version: 1,
      queueSize: this.queue.length,
      latestSlot: 0,
      // Would fetch from RPC
      uptime: Date.now() - this.startTime
    });
    channel.messages[0].send(response);
  }
  /**
   * Handle ping
   */
  handlePing(msg, channel) {
    const response = encodeMessage({
      type: 131 /* PONG */,
      timestamp: msg.timestamp,
      relayTimestamp: Date.now()
    });
    channel.messages[0].send(response);
  }
  /**
   * Start batch processing loop
   */
  startBatchProcessing() {
    this.batchTimer = setInterval(() => {
      this.processBatch();
    }, this.config.batchInterval);
  }
  /**
   * Process a batch of transactions
   */
  async processBatch() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    this.isProcessing = true;
    try {
      const batch = this.queue.splice(0, this.config.maxBatchSize);
      await Promise.all(
        batch.map(async (item) => {
          try {
            const tx = Transaction.from(item.transaction);
            const signature = await this.connection.sendRawTransaction(item.transaction, {
              skipPreflight: false,
              preflightCommitment: "confirmed"
            });
            const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
            if (confirmation.value.err) {
              throw new Error(`Transaction reverted: ${JSON.stringify(confirmation.value.err)}`);
            }
            const response = encodeMessage({
              type: 129 /* TX_RESULT */,
              requestId: item.requestId,
              success: true,
              signature,
              slot: confirmation.context.slot
            });
            item.channel.messages[0].send(response);
            this.processedCount++;
            this.emit("tx:processed", { signature, slot: confirmation.context.slot });
          } catch (err) {
            const response = encodeMessage({
              type: 129 /* TX_RESULT */,
              requestId: item.requestId,
              success: false,
              error: err instanceof Error ? err.message : "Unknown error"
            });
            item.channel.messages[0].send(response);
            this.emit("tx:failed", { error: err });
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
  getStats() {
    return {
      queueSize: this.queue.length,
      processedCount: this.processedCount,
      uptime: Date.now() - this.startTime,
      connectedPeers: this.discovery.getPeers().length
    };
  }
};

// src/services/eligibility.ts
import { PublicKey, Connection as Connection2 } from "@solana/web3.js";
function poseidonHash(inputs) {
  let hash = BigInt(0);
  for (const input of inputs) {
    hash = hash ^ input;
    hash = hash * BigInt("0x9e3779b97f4a7c15") & (BigInt(1) << BigInt(254)) - BigInt(1);
  }
  return hash;
}
var EligibilityService = class {
  constructor(rpcUrl) {
    this.trees = /* @__PURE__ */ new Map();
    this.connection = new Connection2(rpcUrl, "confirmed");
  }
  /**
   * Generate eligibility whitelist based on criteria
   */
  async generateEligibilityTree(tokenMint, snapshotSlot, criteria) {
    const eligibleAddresses = /* @__PURE__ */ new Set();
    if (criteria.customAddresses) {
      for (const addr of criteria.customAddresses) {
        eligibleAddresses.add(addr);
      }
    }
    if (criteria.minBalance !== void 0 && criteria.minBalance > 0) {
      const holders = await this.getTokenHolders(tokenMint, snapshotSlot, criteria.minBalance);
      for (const holder of holders) {
        eligibleAddresses.add(holder);
      }
    }
    if (criteria.nftCollection) {
      const nftHolders = await this.getNftHolders(criteria.nftCollection, snapshotSlot);
      for (const holder of nftHolders) {
        eligibleAddresses.add(holder);
      }
    }
    const leaves = Array.from(eligibleAddresses).sort();
    const treeData = this.buildMerkleTree(leaves);
    this.trees.set(treeData.root, treeData);
    return {
      eligibilityRoot: treeData.root,
      eligibleCount: leaves.length,
      treeData
    };
  }
  /**
   * Get merkle proof for a pubkey
   */
  getMerkleProof(eligibilityRoot, pubkey) {
    const tree = this.trees.get(eligibilityRoot);
    if (!tree) {
      return null;
    }
    const leafIndex = tree.leaves.indexOf(pubkey);
    if (leafIndex === -1) {
      return {
        pubkey,
        isEligible: false,
        merkleProof: [],
        pathIndices: [],
        leafIndex: -1
      };
    }
    const { proof, pathIndices } = this.generateProof(tree, leafIndex);
    return {
      pubkey,
      isEligible: true,
      merkleProof: proof,
      pathIndices,
      leafIndex
    };
  }
  /**
   * Build merkle tree from leaves
   */
  buildMerkleTree(leaves) {
    if (leaves.length === 0) {
      return {
        root: "0x" + BigInt(0).toString(16).padStart(64, "0"),
        leaves: [],
        depth: 0
      };
    }
    const depth = Math.ceil(Math.log2(Math.max(leaves.length, 2)));
    const paddedSize = Math.pow(2, depth);
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < paddedSize) {
      paddedLeaves.push("0x" + BigInt(0).toString(16).padStart(64, "0"));
    }
    const leafHashes = paddedLeaves.map((addr) => {
      const bytes = new PublicKey(addr).toBytes();
      return BigInt("0x" + Buffer.from(bytes).toString("hex"));
    });
    let currentLevel = leafHashes;
    while (currentLevel.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || BigInt(0);
        nextLevel.push(poseidonHash([left, right]));
      }
      currentLevel = nextLevel;
    }
    const root = "0x" + currentLevel[0].toString(16).padStart(64, "0");
    return {
      root,
      leaves: paddedLeaves,
      depth
    };
  }
  /**
   * Generate merkle proof for a leaf index
   */
  generateProof(tree, leafIndex) {
    const proof = [];
    const pathIndices = [];
    const leafHashes = tree.leaves.map((addr) => {
      try {
        const bytes = new PublicKey(addr).toBytes();
        return BigInt("0x" + Buffer.from(bytes).toString("hex"));
      } catch {
        return BigInt(0);
      }
    });
    let currentLevel = leafHashes;
    let index = leafIndex;
    while (currentLevel.length > 1) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      const sibling = currentLevel[siblingIndex] || BigInt(0);
      proof.push("0x" + sibling.toString(16).padStart(64, "0"));
      pathIndices.push(index % 2);
      const nextLevel = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || BigInt(0);
        nextLevel.push(poseidonHash([left, right]));
      }
      currentLevel = nextLevel;
      index = Math.floor(index / 2);
    }
    return { proof, pathIndices };
  }
  /**
   * Get token holders above minimum balance at snapshot slot
   */
  async getTokenHolders(tokenMint, snapshotSlot, minBalance) {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(tokenMint),
        { programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA") }
      );
      const holders = [];
      for (const account of tokenAccounts.value) {
        const info = account.account.data.parsed?.info;
        if (info && Number(info.tokenAmount?.amount || 0) >= minBalance) {
          holders.push(info.owner);
        }
      }
      return holders;
    } catch (error) {
      console.error("Error fetching token holders:", error);
      return [];
    }
  }
  /**
   * Get NFT holders of a collection at snapshot slot
   */
  async getNftHolders(collection, snapshotSlot) {
    console.log(`Querying NFT holders for collection ${collection} at slot ${snapshotSlot}`);
    return [];
  }
  /**
   * Load a previously generated tree
   */
  loadTree(treeData) {
    this.trees.set(treeData.root, treeData);
  }
  /**
   * Get tree by root
   */
  getTree(eligibilityRoot) {
    return this.trees.get(eligibilityRoot);
  }
};

// src/services/attestation.ts
import { Keypair, PublicKey as PublicKey2, Connection as Connection3 } from "@solana/web3.js";
import * as nacl from "tweetnacl";
var AttestationService = class {
  constructor(rpcUrl, indexerSecretKey) {
    this.connection = new Connection3(rpcUrl, "confirmed");
    this.indexerKeypair = Keypair.fromSecretKey(indexerSecretKey);
  }
  /**
   * Get the indexer's public key (for ballot configuration)
   */
  getIndexerPubkey() {
    return this.indexerKeypair.publicKey;
  }
  /**
   * Generate a balance attestation for a user
   */
  async generateAttestation(request) {
    const { ballotId, pubkey, tokenMint, snapshotSlot } = request;
    try {
      const totalAmount = await this.getBalanceAtSlot(pubkey, tokenMint, snapshotSlot);
      if (totalAmount === null) {
        return null;
      }
      const message = this.buildAttestationMessage(pubkey, ballotId, tokenMint, totalAmount, snapshotSlot);
      const signature = nacl.sign.detached(message, this.indexerKeypair.secretKey);
      return {
        pubkey,
        ballotId,
        tokenMint,
        totalAmount: totalAmount.toString(),
        snapshotSlot,
        timestamp: Date.now(),
        signature: Buffer.from(signature).toString("hex"),
        indexerPubkey: this.indexerKeypair.publicKey.toBase58()
      };
    } catch (error) {
      console.error("Error generating attestation:", error);
      return null;
    }
  }
  /**
   * Verify an attestation signature
   */
  verifyAttestation(attestation) {
    try {
      const message = this.buildAttestationMessage(
        attestation.pubkey,
        attestation.ballotId,
        attestation.tokenMint,
        BigInt(attestation.totalAmount),
        attestation.snapshotSlot
      );
      const signature = Buffer.from(attestation.signature, "hex");
      const pubkey = new PublicKey2(attestation.indexerPubkey).toBytes();
      return nacl.sign.detached.verify(message, signature, pubkey);
    } catch (error) {
      console.error("Error verifying attestation:", error);
      return false;
    }
  }
  /**
   * Build the message to sign for an attestation
   * Format: pubkey || ballot_id || token_mint || total_amount || snapshot_slot
   */
  buildAttestationMessage(pubkey, ballotId, tokenMint, totalAmount, snapshotSlot) {
    const pubkeyBytes = new PublicKey2(pubkey).toBytes();
    const ballotIdBytes = Buffer.from(ballotId.replace("0x", ""), "hex");
    const tokenMintBytes = new PublicKey2(tokenMint).toBytes();
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(totalAmount);
    const slotBuffer = Buffer.alloc(8);
    slotBuffer.writeBigUInt64LE(BigInt(snapshotSlot));
    return Buffer.concat([
      pubkeyBytes,
      ballotIdBytes,
      tokenMintBytes,
      amountBuffer,
      slotBuffer
    ]);
  }
  /**
   * Get user's total token balance at a specific slot
   * In production, this would use Helius/Photon historical API
   */
  async getBalanceAtSlot(pubkey, tokenMint, snapshotSlot) {
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey2(pubkey),
        { mint: new PublicKey2(tokenMint) }
      );
      let totalBalance = BigInt(0);
      for (const account of tokenAccounts.value) {
        const amount = account.account.data.parsed?.info?.tokenAmount?.amount;
        if (amount) {
          totalBalance += BigInt(amount);
        }
      }
      const shieldedBalance = await this.getShieldedBalance(pubkey, tokenMint, snapshotSlot);
      totalBalance += shieldedBalance;
      return totalBalance;
    } catch (error) {
      console.error("Error fetching balance:", error);
      return null;
    }
  }
  /**
   * Get user's shielded balance from indexed notes
   * In production, would scan and aggregate note commitments
   */
  async getShieldedBalance(pubkey, tokenMint, snapshotSlot) {
    return BigInt(0);
  }
};
function createIndexerKeypair() {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Buffer.from(keypair.secretKey).toString("hex")
  };
}

// src/services/preimage-scanner.ts
import { Connection as Connection4, PublicKey as PublicKey3 } from "@solana/web3.js";
var PreimageScannerService = class {
  constructor(rpcUrl, programId) {
    // In-memory index of preimages (in production, would use database)
    this.preimageIndex = /* @__PURE__ */ new Map();
    this.connection = new Connection4(rpcUrl, "confirmed");
    this.programId = new PublicKey3(programId);
  }
  /**
   * Scan for a user's encrypted vote preimages
   */
  async scanUserPreimages(pubkey, options = {}) {
    const userPreimages = this.preimageIndex.get(pubkey) || [];
    let filtered = userPreimages;
    if (options.ballotId) {
      filtered = filtered.filter((p) => p.ballotId === options.ballotId);
    }
    if (!options.includeNullified) {
      filtered = filtered.filter((p) => !p.isNullified);
    }
    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }
    return filtered;
  }
  /**
   * Index a new vote preimage (called when vote/position is created)
   */
  indexPreimage(pubkey, preimage) {
    const existing = this.preimageIndex.get(pubkey) || [];
    existing.push(preimage);
    this.preimageIndex.set(pubkey, existing);
  }
  /**
   * Mark a preimage as nullified (vote changed or position claimed)
   */
  markNullified(pubkey, commitment) {
    const preimages = this.preimageIndex.get(pubkey);
    if (!preimages) return;
    for (const p of preimages) {
      if (p.voteCommitment === commitment) {
        p.isNullified = true;
        break;
      }
    }
  }
  /**
   * Sync preimages from on-chain data
   * Called periodically to update the index
   */
  async syncFromChain(startSlot) {
    let syncedCount = 0;
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        this.programId,
        { limit: 1e3 }
      );
      for (const sig of signatures) {
        if (startSlot && sig.slot < startSlot) continue;
        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0
          });
          if (!tx?.meta?.logMessages) continue;
          for (const log of tx.meta.logMessages) {
            if (log.includes("Vote preimage stored:")) {
              syncedCount++;
            }
          }
        } catch (e) {
        }
      }
    } catch (error) {
      console.error("Error syncing preimages:", error);
    }
    return syncedCount;
  }
  /**
   * Get preimage by commitment (for debugging/verification)
   */
  getByCommitment(commitment) {
    for (const [, preimages] of this.preimageIndex) {
      for (const p of preimages) {
        if (p.voteCommitment === commitment) {
          return p;
        }
      }
    }
    return null;
  }
  /**
   * Clear index (for testing)
   */
  clearIndex() {
    this.preimageIndex.clear();
  }
  /**
   * Get index stats
   */
  getStats() {
    let preimageCount = 0;
    for (const preimages of this.preimageIndex.values()) {
      preimageCount += preimages.length;
    }
    return {
      userCount: this.preimageIndex.size,
      preimageCount
    };
  }
};
function decryptPreimage(encryptedPreimage, privateKey, encryptionType) {
  try {
    const encrypted = Buffer.from(encryptedPreimage, "hex");
    return null;
  } catch (error) {
    console.error("Error decrypting preimage:", error);
    return null;
  }
}

// src/routes/voting.ts
var VotingApi = class {
  constructor(config) {
    this.eligibilityService = new EligibilityService(config.rpcUrl);
    this.attestationService = new AttestationService(config.rpcUrl, config.indexerSecretKey);
    this.preimageScannerService = new PreimageScannerService(config.rpcUrl, config.programId);
  }
  /**
   * Get indexer public key for ballot configuration
   */
  getIndexerPubkey() {
    return this.attestationService.getIndexerPubkey().toBase58();
  }
  // ============ Eligibility Endpoints ============
  /**
   * POST /api/voting/eligibility
   *
   * Generate eligibility whitelist based on criteria
   */
  async generateEligibility(request) {
    const result = await this.eligibilityService.generateEligibilityTree(
      request.tokenMint,
      request.snapshotSlot,
      request.criteria
    );
    return {
      eligibilityRoot: result.eligibilityRoot,
      eligibleCount: result.eligibleCount,
      // In production, would upload tree data to IPFS/Arweave
      treeUrl: void 0
    };
  }
  /**
   * GET /api/voting/eligibility-proof/:eligibilityRoot/:pubkey
   *
   * Get eligibility merkle proof for a pubkey
   */
  getEligibilityProof(eligibilityRoot, pubkey) {
    return this.eligibilityService.getMerkleProof(eligibilityRoot, pubkey);
  }
  // ============ Attestation Endpoints ============
  /**
   * GET /api/voting/attestation/:ballotId/:pubkey
   *
   * Get balance attestation for a user
   */
  async getAttestation(ballotId, pubkey, tokenMint, snapshotSlot) {
    return this.attestationService.generateAttestation({
      ballotId,
      pubkey,
      tokenMint,
      snapshotSlot
    });
  }
  /**
   * POST /api/voting/attestation/verify
   *
   * Verify an attestation signature
   */
  verifyAttestation(attestation) {
    return this.attestationService.verifyAttestation(attestation);
  }
  // ============ Preimage Endpoints ============
  /**
   * GET /api/voting/preimages/:pubkey
   *
   * Scan for user's encrypted vote preimages
   */
  async getPreimages(pubkey, options = {}) {
    const preimages = await this.preimageScannerService.scanUserPreimages(pubkey, options);
    return { preimages };
  }
  /**
   * POST /api/voting/preimages/sync
   *
   * Sync preimages from on-chain data (admin only)
   */
  async syncPreimages(startSlot) {
    const syncedCount = await this.preimageScannerService.syncFromChain(startSlot);
    return { syncedCount };
  }
  /**
   * POST /api/voting/preimages/index
   *
   * Index a new preimage (called by relayer after vote/position creation)
   */
  indexPreimage(pubkey, preimage) {
    this.preimageScannerService.indexPreimage(pubkey, preimage);
  }
  /**
   * POST /api/voting/preimages/nullify
   *
   * Mark a preimage as nullified (called by relayer after vote change/claim)
   */
  markPreimageNullified(pubkey, commitment) {
    this.preimageScannerService.markNullified(pubkey, commitment);
  }
  // ============ Stats Endpoints ============
  /**
   * GET /api/voting/stats
   *
   * Get indexer statistics
   */
  getStats() {
    return {
      indexerPubkey: this.getIndexerPubkey(),
      preimageStats: this.preimageScannerService.getStats()
    };
  }
};
function createVotingRouteHandlers(api) {
  return {
    // Eligibility
    "POST /eligibility": async (req) => {
      return api.generateEligibility(req.body);
    },
    "GET /eligibility-proof/:root/:pubkey": (req) => {
      const proof = api.getEligibilityProof(req.params.root, req.params.pubkey);
      if (!proof) {
        throw new Error("Eligibility root not found");
      }
      return proof;
    },
    // Attestation
    "GET /attestation/:ballotId/:pubkey": async (req) => {
      const attestation = await api.getAttestation(
        req.params.ballotId,
        req.params.pubkey,
        req.query.tokenMint,
        parseInt(req.query.snapshotSlot, 10)
      );
      if (!attestation) {
        throw new Error("Could not generate attestation");
      }
      return attestation;
    },
    "POST /attestation/verify": (req) => {
      return { valid: api.verifyAttestation(req.body) };
    },
    // Preimages
    "GET /preimages/:pubkey": async (req) => {
      return api.getPreimages(req.params.pubkey, {
        ballotId: req.query.ballotId,
        includeNullified: req.query.includeNullified === "true"
      });
    },
    // Stats
    "GET /stats": () => {
      return api.getStats();
    }
  };
}
export {
  AttestationService,
  DiscoveryService,
  EligibilityService,
  MessageType,
  PROTOCOL_NAME,
  PROTOCOL_VERSION,
  PreimageScannerService,
  RELAY_TOPIC,
  RelayClient,
  RelayServer,
  VotingApi,
  createIndexerKeypair,
  createVotingRouteHandlers,
  decodeMessage,
  decryptPreimage,
  encodeMessage,
  generateRequestId
};
