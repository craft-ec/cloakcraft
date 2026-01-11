"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  DiscoveryService: () => DiscoveryService,
  MessageType: () => MessageType,
  PROTOCOL_NAME: () => PROTOCOL_NAME,
  PROTOCOL_VERSION: () => PROTOCOL_VERSION,
  RELAY_TOPIC: () => RELAY_TOPIC,
  RelayClient: () => RelayClient,
  RelayServer: () => RelayServer,
  decodeMessage: () => decodeMessage,
  encodeMessage: () => encodeMessage,
  generateRequestId: () => generateRequestId
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_events2 = require("events");

// src/discovery.ts
var import_events = require("events");
var RELAY_TOPIC = Buffer.from("cloakcraft-relay-v1");
var DiscoveryService = class extends import_events.EventEmitter {
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
    require("crypto").randomFillSync(id);
  }
  return id;
}

// src/client.ts
var RelayClient = class extends import_events2.EventEmitter {
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
var import_events3 = require("events");
var import_web3 = require("@solana/web3.js");
var RelayServer = class extends import_events3.EventEmitter {
  constructor(config) {
    super();
    this.queue = [];
    this.isProcessing = false;
    this.startTime = Date.now();
    this.processedCount = 0;
    this.discovery = new DiscoveryService(true);
    this.connection = new import_web3.Connection(config.rpcUrl, "confirmed");
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
            const tx = import_web3.Transaction.from(item.transaction);
            const signature = await this.connection.sendRawTransaction(item.transaction, {
              skipPreflight: false,
              preflightCommitment: "confirmed"
            });
            const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DiscoveryService,
  MessageType,
  PROTOCOL_NAME,
  PROTOCOL_VERSION,
  RELAY_TOPIC,
  RelayClient,
  RelayServer,
  decodeMessage,
  encodeMessage,
  generateRequestId
});
