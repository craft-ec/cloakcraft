import {
  checkNullifierSpent,
  deriveActionNullifier,
  deriveNullifierKey,
  deriveSpendingNullifier
} from "./chunk-N6EW6DLH.mjs";
import {
  computeCommitment,
  createNote,
  generateRandomness,
  verifyCommitment
} from "./chunk-R3JELV4G.mjs";
import {
  DOMAIN_ACTION_NULLIFIER,
  DOMAIN_COMMITMENT,
  DOMAIN_EMPTY_LEAF,
  DOMAIN_MERKLE,
  DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_STEALTH,
  __esm,
  __export,
  __require,
  __toCommonJS,
  bytesToField,
  fieldToBytes,
  init_poseidon,
  poseidonHash,
  poseidonHash2,
  poseidonHashDomain
} from "./chunk-EQ5SR4GO.mjs";

// src/crypto/babyjubjub.ts
var babyjubjub_exports = {};
__export(babyjubjub_exports, {
  GENERATOR: () => GENERATOR,
  IDENTITY: () => IDENTITY,
  derivePublicKey: () => derivePublicKey,
  isInSubgroup: () => isInSubgroup,
  isOnCurve: () => isOnCurve,
  pointAdd: () => pointAdd,
  scalarMul: () => scalarMul
});
function modInverse(a, m) {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return (old_s % m + m) % m;
}
function pointAdd(p1, p2) {
  const x1 = bytesToField(p1.x);
  const y1 = bytesToField(p1.y);
  const x2 = bytesToField(p2.x);
  const y2 = bytesToField(p2.y);
  const x1x2 = x1 * x2 % FIELD_MODULUS;
  const y1y2 = y1 * y2 % FIELD_MODULUS;
  const x1y2 = x1 * y2 % FIELD_MODULUS;
  const y1x2 = y1 * x2 % FIELD_MODULUS;
  const dx1x2y1y2 = D * x1x2 * y1y2 % FIELD_MODULUS;
  const xNum = (x1y2 + y1x2) % FIELD_MODULUS;
  const yNum = (y1y2 - A * x1x2 % FIELD_MODULUS + FIELD_MODULUS) % FIELD_MODULUS;
  const xDen = (1n + dx1x2y1y2) % FIELD_MODULUS;
  const yDen = (1n - dx1x2y1y2 + FIELD_MODULUS) % FIELD_MODULUS;
  const x3 = xNum * modInverse(xDen, FIELD_MODULUS) % FIELD_MODULUS;
  const y3 = yNum * modInverse(yDen, FIELD_MODULUS) % FIELD_MODULUS;
  return {
    x: fieldToBytes(x3),
    y: fieldToBytes(y3)
  };
}
function scalarMul(point, scalar) {
  let result = IDENTITY;
  let temp = point;
  let s = scalar % SUBGROUP_ORDER;
  while (s > 0n) {
    if (s & 1n) {
      result = pointAdd(result, temp);
    }
    temp = pointAdd(temp, temp);
    s >>= 1n;
  }
  return result;
}
function derivePublicKey(privateKey) {
  return scalarMul(GENERATOR, privateKey);
}
function isOnCurve(point) {
  const x = bytesToField(point.x);
  const y = bytesToField(point.y);
  const x2 = x * x % FIELD_MODULUS;
  const y2 = y * y % FIELD_MODULUS;
  const lhs = (A * x2 + y2) % FIELD_MODULUS;
  const rhs = (1n + D * x2 * y2 % FIELD_MODULUS) % FIELD_MODULUS;
  return lhs === rhs;
}
function isInSubgroup(point) {
  const shouldBeIdentity = scalarMul(point, SUBGROUP_ORDER);
  return bytesToField(shouldBeIdentity.x) === 0n && bytesToField(shouldBeIdentity.y) === 1n;
}
var FIELD_MODULUS, SUBGROUP_ORDER, A, D, GENERATOR, IDENTITY;
var init_babyjubjub = __esm({
  "src/crypto/babyjubjub.ts"() {
    "use strict";
    init_poseidon();
    FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
    A = 168700n;
    D = 168696n;
    GENERATOR = {
      x: fieldToBytes(5299619240641551281634865583518297030282874472190772894086521144482721001553n),
      y: fieldToBytes(16950150798460657717958625567821834550301663161624707787222815936182638968203n)
    };
    IDENTITY = {
      x: fieldToBytes(0n),
      y: fieldToBytes(1n)
    };
  }
});

// src/index.ts
export * from "@cloakcraft/types";

// src/client.ts
import {
  Connection,
  PublicKey as PublicKey3,
  Transaction
} from "@solana/web3.js";

// src/wallet.ts
init_babyjubjub();
init_poseidon();
var SUBGROUP_ORDER2 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
var DOMAIN_IVK = 0x10n;
var Wallet = class {
  constructor(keypair) {
    this.keypair = keypair;
  }
  /**
   * Get the spending key (secret - handle with care)
   */
  get spendingKey() {
    return this.keypair.spending;
  }
  /**
   * Get the viewing key (can share for read-only access)
   */
  get viewingKey() {
    return this.keypair.viewing;
  }
  /**
   * Get the public key (for receiving funds)
   */
  get publicKey() {
    return this.keypair.publicKey;
  }
  /**
   * Export spending key as bytes (for backup)
   */
  exportSpendingKey() {
    return new Uint8Array(this.keypair.spending.sk);
  }
  /**
   * Export viewing key as bytes (for watch-only access)
   */
  exportViewingKey() {
    return {
      nk: new Uint8Array(this.keypair.viewing.nk),
      ivk: new Uint8Array(this.keypair.viewing.ivk)
    };
  }
};
function createWallet() {
  const sk = generateRandomSpendingKey();
  return createWalletFromSpendingKey(sk);
}
function loadWallet(spendingKeyBytes) {
  if (spendingKeyBytes.length !== 32) {
    throw new Error("Spending key must be 32 bytes");
  }
  const sk = bytesToField(spendingKeyBytes);
  if (sk >= SUBGROUP_ORDER2) {
    throw new Error("Invalid spending key");
  }
  return createWalletFromSpendingKey(sk);
}
function createWatchOnlyWallet(viewingKey, publicKey) {
  const dummySk = {
    sk: new Uint8Array(32)
  };
  return new Wallet({
    spending: dummySk,
    viewing: viewingKey,
    publicKey
  });
}
async function deriveWalletFromSeed(seedPhrase, path2 = "m/44'/501'/0'/0'") {
  const encoder = new TextEncoder();
  const seedBytes = encoder.encode(seedPhrase);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    seedBytes,
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: encoder.encode("cloakcraft" + path2),
      iterations: 1e5,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
  const skBytes = new Uint8Array(derivedBits);
  const sk = bytesToField(skBytes) % SUBGROUP_ORDER2;
  return createWalletFromSpendingKey(sk);
}
function createWalletFromSpendingKey(sk) {
  const skBytes = fieldToBytes(sk);
  const nk = deriveNullifierKey(skBytes);
  const ivk = poseidonHashDomain(DOMAIN_IVK, skBytes);
  const publicKey = derivePublicKey(sk);
  const keypair = {
    spending: { sk: skBytes },
    viewing: { nk, ivk },
    publicKey
  };
  return new Wallet(keypair);
}
function generateRandomSpendingKey() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER2;
}

// src/notes.ts
import { PublicKey } from "@solana/web3.js";

// src/crypto/encryption.ts
init_babyjubjub();
init_poseidon();
import { sha256 } from "@noble/hashes/sha256";
var SUBGROUP_ORDER3 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
function encryptNote(note, recipientPubkey) {
  const ephemeralPrivate = generateRandomScalar();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);
  const encKey = deriveEncryptionKey(sharedSecret.x);
  const plaintext = serializeNote(note);
  const { ciphertext, tag } = encryptAEAD(plaintext, encKey);
  return {
    ephemeralPubkey,
    ciphertext,
    tag
  };
}
function decryptNote(encrypted, recipientPrivateKey) {
  const sharedSecret = scalarMul(encrypted.ephemeralPubkey, recipientPrivateKey);
  const decKey = deriveEncryptionKey(sharedSecret.x);
  const plaintext = decryptAEAD(encrypted.ciphertext, encrypted.tag, decKey);
  return deserializeNote(plaintext);
}
function tryDecryptNote(encrypted, recipientPrivateKey) {
  try {
    return decryptNote(encrypted, recipientPrivateKey);
  } catch {
    return null;
  }
}
function serializeNote(note) {
  const buffer = new Uint8Array(32 + 32 + 8 + 32);
  buffer.set(note.stealthPubX, 0);
  buffer.set(note.tokenMint.toBytes(), 32);
  const amountBytes = new Uint8Array(8);
  let amount = note.amount;
  for (let i = 0; i < 8; i++) {
    amountBytes[i] = Number(amount & 0xffn);
    amount >>= 8n;
  }
  buffer.set(amountBytes, 64);
  buffer.set(note.randomness, 72);
  return buffer;
}
function deserializeNote(data) {
  const { PublicKey: PublicKey4 } = __require("@solana/web3.js");
  const stealthPubX = data.slice(0, 32);
  const tokenMintBytes = data.slice(32, 64);
  const amountBytes = data.slice(64, 72);
  const randomness = data.slice(72, 104);
  let amount = 0n;
  for (let i = 7; i >= 0; i--) {
    amount = amount << 8n | BigInt(amountBytes[i]);
  }
  return {
    stealthPubX: new Uint8Array(stealthPubX),
    tokenMint: new PublicKey4(tokenMintBytes),
    amount,
    randomness: new Uint8Array(randomness)
  };
}
function deriveEncryptionKey(sharedSecretX) {
  const hasher = sha256.create();
  hasher.update(Buffer.from("cloakcraft-ecies-key"));
  hasher.update(sharedSecretX);
  return hasher.digest();
}
function encryptAEAD(plaintext, key) {
  const keyStream = sha256(key);
  const ciphertext = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i++) {
    ciphertext[i] = plaintext[i] ^ keyStream[i % keyStream.length];
  }
  const tag = sha256(new Uint8Array([...key, ...ciphertext])).slice(0, 16);
  return { ciphertext, tag };
}
function decryptAEAD(ciphertext, tag, key) {
  const expectedTag = sha256(new Uint8Array([...key, ...ciphertext])).slice(0, 16);
  for (let i = 0; i < 16; i++) {
    if (expectedTag[i] !== tag[i]) {
      throw new Error("AEAD authentication failed");
    }
  }
  const keyStream = sha256(key);
  const plaintext = new Uint8Array(ciphertext.length);
  for (let i = 0; i < ciphertext.length; i++) {
    plaintext[i] = ciphertext[i] ^ keyStream[i % keyStream.length];
  }
  return plaintext;
}
function generateRandomScalar() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER3;
}

// src/notes.ts
init_poseidon();
var NoteManager = class {
  constructor(indexerUrl) {
    this.cachedNotes = /* @__PURE__ */ new Map();
    this.spentNullifiers = /* @__PURE__ */ new Set();
    this.lastSyncSlot = 0;
    this.indexerUrl = indexerUrl;
  }
  /**
   * Sync notes from the indexer for a keypair
   */
  async syncNotes(keypair) {
    const syncStatus = await this.getSyncStatus();
    const newNotes = [];
    const commitments = await this.fetchCommitments(this.lastSyncSlot);
    for (const entry of commitments) {
      const encryptedNote = this.parseEncryptedNote(entry.encryptedNote);
      const privateKey = bytesToField(keypair.spending.sk);
      const decrypted = tryDecryptNote(encryptedNote, privateKey);
      if (decrypted) {
        const commitment = computeCommitment(decrypted);
        if (Buffer.from(commitment).toString("hex") === entry.commitment) {
          const note = {
            ...decrypted,
            commitment,
            leafIndex: entry.leafIndex,
            pool: new PublicKey(entry.pool)
          };
          const key = this.noteKey(commitment);
          if (!this.cachedNotes.has(key)) {
            this.cachedNotes.set(key, note);
            newNotes.push(note);
          }
        }
      }
    }
    await this.checkSpentNotes(keypair);
    this.lastSyncSlot = syncStatus.latestSlot;
    return newNotes;
  }
  /**
   * Get all unspent notes for a token
   */
  async getUnspentNotes(keypair, tokenMint) {
    const notes = [];
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    for (const note of this.cachedNotes.values()) {
      if (note.tokenMint.equals(tokenMint)) {
        const nullifier = deriveSpendingNullifier(nullifierKey, note.commitment, note.leafIndex);
        const nullifierHex = Buffer.from(nullifier).toString("hex");
        if (!this.spentNullifiers.has(nullifierHex)) {
          const isSpent = await checkNullifierSpent(this.indexerUrl, nullifier);
          if (isSpent) {
            this.spentNullifiers.add(nullifierHex);
          } else {
            notes.push(note);
          }
        }
      }
    }
    return notes;
  }
  /**
   * Get total balance for a token
   */
  async getBalance(keypair, tokenMint) {
    const notes = await this.getUnspentNotes(keypair, tokenMint);
    return notes.reduce((sum, note) => sum + note.amount, 0n);
  }
  /**
   * Select notes for a transfer
   */
  async selectNotesForAmount(keypair, tokenMint, targetAmount) {
    const available = await this.getUnspentNotes(keypair, tokenMint);
    available.sort((a, b) => {
      if (a.amount > b.amount) return -1;
      if (a.amount < b.amount) return 1;
      return 0;
    });
    const selected = [];
    let total = 0n;
    for (const note of available) {
      if (total >= targetAmount) break;
      selected.push(note);
      total += note.amount;
    }
    if (total < targetAmount) {
      throw new Error(`Insufficient balance: need ${targetAmount}, have ${total}`);
    }
    return { notes: selected, totalAmount: total };
  }
  /**
   * Get sync status
   */
  async getSyncStatus() {
    const response = await fetch(`${this.indexerUrl}/sync-status`);
    if (!response.ok) {
      throw new Error("Failed to get sync status");
    }
    const data = await response.json();
    return {
      latestSlot: data.latest_slot,
      indexedSlot: data.latest_slot,
      isSynced: true
    };
  }
  /**
   * Mark notes as spent locally
   */
  markSpent(nullifiers) {
    for (const nullifier of nullifiers) {
      this.spentNullifiers.add(Buffer.from(nullifier).toString("hex"));
    }
  }
  // =============================================================================
  // Private Methods
  // =============================================================================
  async fetchCommitments(sinceSlot) {
    const response = await fetch(
      `${this.indexerUrl}/commitments?since_slot=${sinceSlot}&limit=10000`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch commitments");
    }
    return response.json();
  }
  async checkSpentNotes(keypair) {
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    for (const note of this.cachedNotes.values()) {
      const nullifier = deriveSpendingNullifier(nullifierKey, note.commitment, note.leafIndex);
      const nullifierHex = Buffer.from(nullifier).toString("hex");
      if (!this.spentNullifiers.has(nullifierHex)) {
        const isSpent = await checkNullifierSpent(this.indexerUrl, nullifier);
        if (isSpent) {
          this.spentNullifiers.add(nullifierHex);
        }
      }
    }
  }
  parseEncryptedNote(data) {
    const bytes = Buffer.from(data, "hex");
    return {
      ephemeralPubkey: {
        x: new Uint8Array(bytes.slice(0, 32)),
        y: new Uint8Array(bytes.slice(32, 64))
      },
      ciphertext: new Uint8Array(bytes.slice(64, bytes.length - 16)),
      tag: new Uint8Array(bytes.slice(bytes.length - 16))
    };
  }
  noteKey(commitment) {
    return Buffer.from(commitment).toString("hex");
  }
};

// src/proofs.ts
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
var BN254_FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
var CIRCUIT_FILE_MAP = {
  "transfer/1x2": "transfer_1x2",
  "transfer/1x3": "transfer_1x3",
  "adapter/1x1": "adapter_1x1",
  "adapter/1x2": "adapter_1x2",
  "market/order_create": "market_order_create",
  "market/order_fill": "market_order_fill",
  "market/order_cancel": "market_order_cancel",
  "swap/add_liquidity": "swap_add_liquidity",
  "swap/remove_liquidity": "swap_remove_liquidity",
  "swap/swap": "swap_swap",
  "governance/encrypted_submit": "governance_encrypted_submit"
};
var CIRCUIT_DIR_MAP = {
  "transfer/1x2": "transfer/1x2",
  "transfer/1x3": "transfer/1x3",
  "adapter/1x1": "adapter/1x1",
  "adapter/1x2": "adapter/1x2",
  "market/order_create": "market/order_create",
  "market/order_fill": "market/order_fill",
  "market/order_cancel": "market/order_cancel",
  "swap/add_liquidity": "swap/add_liquidity",
  "swap/remove_liquidity": "swap/remove_liquidity",
  "swap/swap": "swap/swap",
  "governance/encrypted_submit": "governance/encrypted_submit"
};
var ProofGenerator = class {
  constructor(config) {
    this.circuits = /* @__PURE__ */ new Map();
    this.isInitialized = false;
    this.baseUrl = config?.baseUrl ?? "/circuits";
    this.nodeConfig = config?.nodeConfig;
  }
  /**
   * Configure for Node.js proving (auto-detects paths if not provided)
   */
  configureForNode(config) {
    const homeDir = os.homedir();
    this.nodeConfig = {
      circuitsDir: config?.circuitsDir ?? path.resolve(__dirname, "../../../circuits"),
      sunspotPath: config?.sunspotPath ?? path.resolve(__dirname, "../../../scripts/sunspot"),
      nargoPath: config?.nargoPath ?? path.join(homeDir, ".nargo/bin/nargo")
    };
  }
  /**
   * Initialize the prover with circuit artifacts
   */
  async initialize(circuitNames) {
    const circuits = circuitNames ?? [
      "transfer/1x2",
      "transfer/1x3",
      "adapter/1x1",
      "adapter/1x2",
      "market/order_create",
      "market/order_fill",
      "market/order_cancel",
      "swap/add_liquidity",
      "swap/remove_liquidity",
      "swap/swap",
      "governance/encrypted_submit"
    ];
    await Promise.all(circuits.map((name) => this.loadCircuit(name)));
    this.isInitialized = true;
  }
  /**
   * Load a circuit's artifacts
   *
   * In Node.js with nodeConfig set, loads from file system.
   * In browser, loads via fetch from baseUrl.
   */
  async loadCircuit(name) {
    const isNode = typeof globalThis.process !== "undefined" && globalThis.process.versions != null && globalThis.process.versions.node != null;
    if (isNode && this.nodeConfig) {
      return this.loadCircuitFromFs(name);
    } else {
      return this.loadCircuitFromUrl(name);
    }
  }
  /**
   * Load circuit from file system (Node.js)
   */
  async loadCircuitFromFs(name) {
    if (!this.nodeConfig) {
      throw new Error("Node.js prover not configured");
    }
    const circuitFileName = CIRCUIT_FILE_MAP[name];
    if (!circuitFileName) {
      throw new Error(`Unknown circuit: ${name}`);
    }
    const targetDir = path.join(this.nodeConfig.circuitsDir, "target");
    const manifestPath = path.join(targetDir, `${circuitFileName}.json`);
    const pkPath = path.join(targetDir, `${circuitFileName}.pk`);
    try {
      const manifestData = fs.readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(manifestData);
      const provingKey = new Uint8Array(fs.readFileSync(pkPath));
      this.circuits.set(name, { manifest, provingKey });
      console.log(`[${name}] Loaded circuit from ${targetDir}`);
    } catch (err) {
      console.warn(`Failed to load circuit ${name}:`, err);
    }
  }
  /**
   * Load circuit from URL (browser)
   */
  async loadCircuitFromUrl(name) {
    const basePath = `${this.baseUrl}/${name}/target`;
    try {
      const manifestRes = await fetch(`${basePath}/${name.split("/").pop()}.json`);
      if (!manifestRes.ok) throw new Error(`Failed to load manifest: ${manifestRes.status}`);
      const manifest = await manifestRes.json();
      const pkRes = await fetch(`${basePath}/${name.split("/").pop()}.pk`);
      if (!pkRes.ok) throw new Error(`Failed to load proving key: ${pkRes.status}`);
      const provingKey = new Uint8Array(await pkRes.arrayBuffer());
      let wasmBytes;
      try {
        const wasmRes = await fetch(`${basePath}/${name.split("/").pop()}.wasm`);
        if (wasmRes.ok) {
          wasmBytes = new Uint8Array(await wasmRes.arrayBuffer());
        }
      } catch {
      }
      this.circuits.set(name, { manifest, provingKey, wasmBytes });
    } catch (err) {
      console.warn(`Failed to load circuit ${name}:`, err);
    }
  }
  /**
   * Check if a circuit is loaded
   */
  hasCircuit(name) {
    return this.circuits.has(name);
  }
  /**
   * Generate a transfer proof (1 input, 2 outputs)
   */
  async generateTransferProof(params, keypair) {
    const circuitName = params.inputs.length === 1 ? "transfer/1x2" : "transfer/1x3";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    const witnessInputs = this.buildTransferWitness(params, keypair.spending.sk, nullifierKey);
    return this.prove(circuitName, witnessInputs);
  }
  /**
   * Generate an adapter swap proof
   */
  async generateAdapterProof(params, keypair) {
    const circuitName = "adapter/1x1";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    const adapterBytes = params.adapter.toBytes();
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? params.input.tokenMint : params.input.tokenMint.toBytes();
    const inputCommitment = computeCommitment(params.input);
    const inputNullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, params.input.leafIndex);
    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(inputNullifier),
      input_amount: params.input.amount.toString(),
      output_commitment: fieldToHex(params.outputCommitment),
      change_commitment: fieldToHex(params.changeCommitment),
      adapter_program: fieldToHex(adapterBytes),
      min_output: params.minOutput.toString(),
      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_stealth_pub_y: fieldToHex(params.input.stealthPubY),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(keypair.spending.sk),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map((i) => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      token_mint: fieldToHex(tokenMint),
      out_stealth_pub_x: fieldToHex(params.outputStealthPubX),
      out_randomness: fieldToHex(params.outputRandomness)
    };
    return this.prove(circuitName, witnessInputs);
  }
  /**
   * Generate an order creation proof
   */
  async generateOrderProof(params, keypair) {
    const circuitName = "market/order_create";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    const offerMintBytes = params.terms.offerMint.toBytes();
    const requestMintBytes = params.terms.requestMint.toBytes();
    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(params.nullifier),
      order_id: fieldToHex(params.orderId),
      escrow_commitment: fieldToHex(params.escrowCommitment),
      terms_hash: fieldToHex(params.termsHash),
      expiry: params.expiry.toString(),
      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_stealth_pub_y: fieldToHex(params.input.stealthPubY),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(keypair.spending.sk),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map((i) => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      offer_token: fieldToHex(offerMintBytes),
      offer_amount: params.terms.offerAmount.toString(),
      ask_token: fieldToHex(requestMintBytes),
      ask_amount: params.terms.requestAmount.toString(),
      escrow_stealth_pub_x: fieldToHex(params.escrowStealthPubX),
      escrow_randomness: fieldToHex(params.escrowRandomness),
      maker_receive_stealth_pub_x: fieldToHex(params.makerReceiveStealthPubX)
    };
    return this.prove(circuitName, witnessInputs);
  }
  /**
   * Generate a vote proof
   */
  async generateVoteProof(params, keypair) {
    const circuitName = "governance/encrypted_submit";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? params.input.tokenMint : params.input.tokenMint.toBytes();
    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      proposal_id: fieldToHex(params.proposalId),
      token_mint: fieldToHex(tokenMint),
      election_pubkey_x: fieldToHex(params.electionPubkey.x),
      election_pubkey_y: fieldToHex(params.electionPubkey.y),
      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_stealth_pub_y: fieldToHex(params.input.stealthPubY),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(keypair.spending.sk),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map((i) => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      vote_choice: params.voteChoice.toString(),
      encryption_randomness_yes: fieldToHex(params.encryptionRandomness.yes),
      encryption_randomness_no: fieldToHex(params.encryptionRandomness.no),
      encryption_randomness_abstain: fieldToHex(params.encryptionRandomness.abstain)
    };
    return this.prove(circuitName, witnessInputs);
  }
  // =============================================================================
  // Core Proving
  // =============================================================================
  /**
   * Generate a Groth16 proof for a circuit
   */
  async prove(circuitName, inputs) {
    const artifacts = this.circuits.get(circuitName);
    if (!artifacts) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    const proof = await this.proveNative(circuitName, inputs, artifacts);
    return this.formatProofForSolana(proof);
  }
  /**
   * Native Groth16 prover (WASM-based)
   */
  async proveNative(circuitName, inputs, artifacts) {
    const isNode = typeof globalThis.process !== "undefined" && globalThis.process.versions != null && globalThis.process.versions.node != null;
    if (isNode) {
      return this.proveViaSubprocess(circuitName, inputs, artifacts);
    } else {
      return this.proveViaWasm(circuitName, inputs, artifacts);
    }
  }
  /**
   * Prove via subprocess (Node.js)
   *
   * Workflow:
   * 1. Write Prover.toml with inputs
   * 2. Run nargo execute to generate witness
   * 3. Run sunspot prove with witness, ACIR, CCS, PK
   * 4. Parse proof output
   */
  async proveViaSubprocess(circuitName, inputs, artifacts) {
    const { execFileSync } = await import("child_process");
    if (!this.nodeConfig) {
      throw new Error("Node.js prover not configured. Call configureForNode() first.");
    }
    const { circuitsDir, sunspotPath, nargoPath } = this.nodeConfig;
    const circuitFileName = CIRCUIT_FILE_MAP[circuitName];
    const circuitDirName = CIRCUIT_DIR_MAP[circuitName];
    if (!circuitFileName || !circuitDirName) {
      throw new Error(`Unknown circuit: ${circuitName}`);
    }
    const circuitDir = path.join(circuitsDir, circuitDirName);
    const targetDir = path.join(circuitsDir, "target");
    const acirPath = path.join(targetDir, `${circuitFileName}.json`);
    const ccsPath = path.join(targetDir, `${circuitFileName}.ccs`);
    const pkPath = path.join(targetDir, `${circuitFileName}.pk`);
    if (!fs.existsSync(acirPath)) throw new Error(`ACIR not found: ${acirPath}`);
    if (!fs.existsSync(ccsPath)) throw new Error(`CCS not found: ${ccsPath}`);
    if (!fs.existsSync(pkPath)) throw new Error(`PK not found: ${pkPath}`);
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cloakcraft-proof-"));
    try {
      const proverToml = this.inputsToProverToml(inputs);
      const proverPath = path.join(circuitDir, "Prover.toml");
      fs.writeFileSync(proverPath, proverToml);
      console.log(`[${circuitName}] Generating witness...`);
      const witnessName = circuitFileName;
      try {
        execFileSync(nargoPath, ["execute", witnessName], {
          cwd: circuitDir,
          stdio: ["pipe", "pipe", "pipe"]
        });
      } catch (err) {
        const stderr = err.stderr?.toString() || "";
        const stdout = err.stdout?.toString() || "";
        throw new Error(`nargo execute failed: ${stderr || stdout || err.message}`);
      }
      const witnessPath = path.join(targetDir, `${circuitFileName}.gz`);
      if (!fs.existsSync(witnessPath)) {
        throw new Error(`Witness not generated at ${witnessPath}`);
      }
      console.log(`[${circuitName}] Generating Groth16 proof...`);
      const proofPath = path.join(tempDir, "proof.bin");
      try {
        execFileSync(sunspotPath, ["prove", acirPath, witnessPath, ccsPath, pkPath], {
          cwd: tempDir,
          stdio: ["pipe", "pipe", "pipe"]
        });
      } catch (err) {
        const stderr = err.stderr?.toString() || "";
        const stdout = err.stdout?.toString() || "";
        throw new Error(`sunspot prove failed: ${stderr || stdout || err.message}`);
      }
      if (!fs.existsSync(proofPath)) {
        throw new Error(`Proof not generated at ${proofPath}`);
      }
      const proofBytes = fs.readFileSync(proofPath);
      console.log(`[${circuitName}] Proof generated (${proofBytes.length} bytes)`);
      if (proofBytes.length !== 256) {
        throw new Error(`Unexpected proof size: ${proofBytes.length} (expected 256)`);
      }
      return {
        a: new Uint8Array(proofBytes.slice(0, 64)),
        b: new Uint8Array(proofBytes.slice(64, 192)),
        c: new Uint8Array(proofBytes.slice(192, 256))
      };
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  /**
   * Convert witness inputs to Prover.toml format
   */
  inputsToProverToml(inputs) {
    const lines = [];
    for (const [key, value] of Object.entries(inputs)) {
      if (Array.isArray(value)) {
        const values = value.map((v) => `"${v}"`).join(", ");
        lines.push(`${key} = [${values}]`);
      } else {
        lines.push(`${key} = "${value}"`);
      }
    }
    return lines.join("\n") + "\n";
  }
  /**
   * Configure remote prover for browser environments
   *
   * Since Groth16 proving requires heavy computation,
   * browser environments should use a remote proving service.
   */
  configureRemoteProver(url) {
    this.remoteProverUrl = url;
  }
  /**
   * Prove via WASM/remote service (browser)
   *
   * Workflow:
   * 1. Use @noir-lang/noir_js to generate witness from inputs
   * 2. Send witness + circuit artifacts to remote prover
   * 3. Receive Groth16 proof
   */
  async proveViaWasm(circuitName, inputs, artifacts) {
    console.log(`[${circuitName}] Generating witness via noir_js...`);
    const { Noir } = await import("@noir-lang/noir_js");
    const noir = new Noir(artifacts.manifest);
    const { witness } = await noir.execute(inputs);
    console.log(`[${circuitName}] Witness generated (${witness.length} bytes)`);
    if (this.remoteProverUrl) {
      return this.proveViaRemote(circuitName, witness, artifacts);
    }
    throw new Error(
      `Browser Groth16 proving requires a remote prover. Call configureRemoteProver(url) before generating proofs.`
    );
  }
  /**
   * Send witness to remote Groth16 prover
   */
  async proveViaRemote(circuitName, witness, artifacts) {
    if (!this.remoteProverUrl) {
      throw new Error("Remote prover URL not configured");
    }
    console.log(`[${circuitName}] Sending to remote prover...`);
    const response = await fetch(`${this.remoteProverUrl}/prove`, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Circuit-Name": circuitName
      },
      body: new Blob([
        // Pack witness length (4 bytes) + witness + proving key
        new Uint32Array([witness.length]),
        witness,
        artifacts.provingKey
      ])
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Remote prover error: ${error}`);
    }
    const proofBytes = new Uint8Array(await response.arrayBuffer());
    console.log(`[${circuitName}] Received proof (${proofBytes.length} bytes)`);
    if (proofBytes.length !== 256) {
      throw new Error(`Invalid proof size from remote prover: ${proofBytes.length}`);
    }
    return {
      a: proofBytes.slice(0, 64),
      b: proofBytes.slice(64, 192),
      c: proofBytes.slice(192, 256)
    };
  }
  /**
   * Format proof for Solana's alt_bn128 pairing check
   *
   * Solana uses the equation: e(-A, B) * e(alpha, beta) * e(PIC, gamma) * e(C, delta) = 1
   * This requires negating the A-component (negating Y coordinate)
   */
  formatProofForSolana(proof) {
    const formatted = new Uint8Array(256);
    formatted.set(proof.a.slice(0, 32), 0);
    const yBytes = proof.a.slice(32, 64);
    const y = bytesToBigInt(yBytes);
    const negY = y === 0n ? 0n : BN254_FIELD_MODULUS - y;
    const negYBytes = bigIntToBytes(negY, 32);
    formatted.set(negYBytes, 32);
    formatted.set(proof.b, 64);
    formatted.set(proof.c, 192);
    return formatted;
  }
  // =============================================================================
  // Witness Building Helpers
  // =============================================================================
  buildTransferWitness(params, spendingKey, nullifierKey) {
    const input = params.inputs[0];
    const commitment = computeCommitment(input);
    const nullifier = deriveSpendingNullifier(nullifierKey, commitment, input.leafIndex);
    const tokenMint = input.tokenMint instanceof Uint8Array ? input.tokenMint : input.tokenMint.toBytes();
    return {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      out_commitment_1: fieldToHex(params.outputs[0].commitment),
      out_commitment_2: fieldToHex(params.outputs[1]?.commitment ?? new Uint8Array(32)),
      token_mint: fieldToHex(tokenMint),
      unshield_amount: (params.unshield?.amount ?? 0n).toString(),
      // Private inputs
      in_stealth_pub_x: fieldToHex(input.stealthPubX),
      in_stealth_pub_y: fieldToHex(input.stealthPubY),
      in_amount: input.amount.toString(),
      in_randomness: fieldToHex(input.randomness),
      in_stealth_spending_key: fieldToHex(spendingKey),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map((i) => i.toString()),
      leaf_index: input.leafIndex.toString(),
      // Output 1 (recipient)
      out_stealth_pub_x_1: fieldToHex(params.outputs[0].stealthPubX),
      out_amount_1: params.outputs[0].amount.toString(),
      out_randomness_1: fieldToHex(params.outputs[0].randomness),
      // Output 2 (change)
      out_stealth_pub_x_2: fieldToHex(params.outputs[1]?.stealthPubX ?? new Uint8Array(32)),
      out_amount_2: (params.outputs[1]?.amount ?? 0n).toString(),
      out_randomness_2: fieldToHex(params.outputs[1]?.randomness ?? new Uint8Array(32))
    };
  }
};
function fieldToHex(bytes) {
  if (typeof bytes === "bigint") {
    return "0x" + bytes.toString(16).padStart(64, "0");
  }
  if (typeof bytes === "number") {
    return "0x" + bytes.toString(16).padStart(64, "0");
  }
  return "0x" + Buffer.from(bytes).toString("hex");
}
function bytesToBigInt(bytes) {
  let result = 0n;
  for (const byte of bytes) {
    result = result << 8n | BigInt(byte);
  }
  return result;
}
function bigIntToBytes(value, length) {
  const bytes = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}
function parseGroth16Proof(bytes) {
  if (bytes.length !== 256) {
    throw new Error(`Invalid proof length: ${bytes.length}`);
  }
  return {
    a: bytes.slice(0, 64),
    b: bytes.slice(64, 192),
    c: bytes.slice(192, 256)
  };
}
function serializeGroth16Proof(proof) {
  const bytes = new Uint8Array(256);
  bytes.set(proof.a, 0);
  bytes.set(proof.b, 64);
  bytes.set(proof.c, 192);
  return bytes;
}

// src/client.ts
init_babyjubjub();

// src/light.ts
import { PublicKey as PublicKey2 } from "@solana/web3.js";
var LightClient = class {
  constructor(config) {
    const baseUrl = config.network === "mainnet-beta" ? "https://mainnet.helius-rpc.com" : "https://devnet.helius-rpc.com";
    this.rpcUrl = `${baseUrl}/?api-key=${config.apiKey}`;
  }
  /**
   * Get compressed account by address
   *
   * Returns null if account doesn't exist (nullifier not spent)
   */
  async getCompressedAccount(address) {
    const addressHex = Buffer.from(address).toString("hex");
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getCompressedAccount",
        params: {
          address: addressHex
        }
      })
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }
    return result.result;
  }
  /**
   * Check if a nullifier has been spent
   *
   * Returns true if the nullifier compressed account exists
   */
  async isNullifierSpent(nullifier, programId, addressTree) {
    const address = this.deriveNullifierAddress(nullifier, programId, addressTree);
    const account = await this.getCompressedAccount(address);
    return account !== null;
  }
  /**
   * Get validity proof for creating a new compressed account
   *
   * This proves that the address doesn't exist yet (non-inclusion proof)
   */
  async getValidityProof(params) {
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getValidityProof",
        params: {
          newAddresses: params.newAddresses.map((a) => Buffer.from(a).toString("hex")),
          addressMerkleTree: params.addressMerkleTree.toBase58(),
          stateMerkleTree: params.stateMerkleTree.toBase58()
        }
      })
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }
    return {
      compressedProof: result.result.compressedProof,
      rootIndices: result.result.rootIndices,
      merkleTrees: result.result.merkleTrees.map((t) => new PublicKey2(t))
    };
  }
  /**
   * Prepare Light Protocol params for transact instruction
   */
  async prepareLightParams(params) {
    const nullifierAddress = this.deriveNullifierAddress(
      params.nullifier,
      params.programId,
      params.addressMerkleTree
    );
    const validityProof = await this.getValidityProof({
      newAddresses: [nullifierAddress],
      addressMerkleTree: params.addressMerkleTree,
      stateMerkleTree: params.stateMerkleTree
    });
    return {
      validityProof,
      addressTreeInfo: {
        addressMerkleTreeAccountIndex: params.addressMerkleTreeAccountIndex,
        addressQueueAccountIndex: params.addressQueueAccountIndex
      },
      outputTreeIndex: params.outputTreeIndex
    };
  }
  /**
   * Get remaining accounts needed for Light Protocol CPI
   *
   * These accounts must be passed to the transact instruction
   */
  async getRemainingAccounts(params) {
    const LIGHT_SYSTEM_PROGRAM = new PublicKey2("LightSystem111111111111111111111111111111111");
    const ACCOUNT_COMPRESSION_PROGRAM = new PublicKey2("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
    const NOOP_PROGRAM = new PublicKey2("noopb9bkMVfRPU8AsBHBNRs27gxNvyqrDGj3zPqsR");
    const REGISTERED_PROGRAM_PDA = new PublicKey2("4LfVCK1CgVbS6Xeu1RSMvKWv9NLLdwVBJ64dJpqpKbLi");
    return [
      // Light system accounts
      { pubkey: LIGHT_SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: ACCOUNT_COMPRESSION_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: NOOP_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: REGISTERED_PROGRAM_PDA, isSigner: false, isWritable: false },
      // Merkle trees
      { pubkey: params.stateMerkleTree, isSigner: false, isWritable: true },
      { pubkey: params.addressMerkleTree, isSigner: false, isWritable: true },
      { pubkey: params.nullifierQueue, isSigner: false, isWritable: true }
    ];
  }
  /**
   * Derive nullifier compressed account address
   *
   * Matches the on-chain derive_nullifier_address function
   */
  deriveNullifierAddress(nullifier, programId, addressTree) {
    const { createHash } = __require("crypto");
    const hash = createHash("sha256").update(Buffer.from("nullifier")).update(nullifier).update(addressTree.toBytes()).update(programId.toBytes()).digest();
    return new Uint8Array(hash);
  }
};
var DEVNET_LIGHT_TREES = {
  stateMerkleTree: new PublicKey2("smt1NamzXdq4AMqS2fS2F1i5KTYPZRhoHgWx38d8WsT"),
  addressMerkleTree: new PublicKey2("amt1Ayt45jfbh91kth2zmwZHc7N5rSYFPCmk5cEVQBv"),
  nullifierQueue: new PublicKey2("nfq1NvQDJ2GEgnS8zt9prAe8rjjpAW1zFkrvZoBR148")
};
var MAINNET_LIGHT_TREES = {
  stateMerkleTree: new PublicKey2("smt1NamzXdq4AMqS2fS2F1i5KTYPZRhoHgWx38d8WsT"),
  addressMerkleTree: new PublicKey2("amt1Ayt45jfbh91kth2zmwZHc7N5rSYFPCmk5cEVQBv"),
  nullifierQueue: new PublicKey2("nfq1NvQDJ2GEgnS8zt9prAe8rjjpAW1zFkrvZoBR148")
};
var LightCommitmentClient = class extends LightClient {
  /**
   * Get commitment by its address
   */
  async getCommitment(pool, commitment, programId, addressTree) {
    const address = this.deriveCommitmentAddress(pool, commitment, programId, addressTree);
    return this.getCompressedAccount(address);
  }
  /**
   * Check if a commitment exists in the tree
   */
  async commitmentExists(pool, commitment, programId, addressTree) {
    const account = await this.getCommitment(pool, commitment, programId, addressTree);
    return account !== null;
  }
  /**
   * Get merkle proof for a commitment
   *
   * This fetches the inclusion proof from Helius Photon indexer
   */
  async getCommitmentMerkleProof(pool, commitment, programId, addressTree, stateMerkleTree) {
    const address = this.deriveCommitmentAddress(pool, commitment, programId, addressTree);
    const response = await fetch(this["rpcUrl"], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getValidityProof",
        params: {
          hashes: [Buffer.from(address).toString("hex")],
          stateMerkleTree: stateMerkleTree.toBase58()
        }
      })
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }
    const pathElements = result.result.proof.map((p) => Buffer.from(p, "hex"));
    const pathIndices = this.leafIndexToPathIndices(result.result.leafIndex, pathElements.length);
    return {
      root: Buffer.from(result.result.root, "hex"),
      pathElements,
      pathIndices,
      leafIndex: result.result.leafIndex
    };
  }
  /**
   * Prepare Light params for shield instruction
   */
  async prepareShieldParams(params) {
    const address = this.deriveCommitmentAddress(
      params.pool,
      params.commitment,
      params.programId,
      params.addressMerkleTree
    );
    const validityProof = await this.getValidityProof({
      newAddresses: [address],
      addressMerkleTree: params.addressMerkleTree,
      stateMerkleTree: params.stateMerkleTree
    });
    return {
      validityProof,
      addressTreeInfo: {
        addressMerkleTreeAccountIndex: params.addressMerkleTreeAccountIndex,
        addressQueueAccountIndex: params.addressQueueAccountIndex
      },
      outputTreeIndex: params.outputTreeIndex
    };
  }
  /**
   * Derive commitment compressed account address
   */
  deriveCommitmentAddress(pool, commitment, programId, addressTree) {
    const { createHash } = __require("crypto");
    const hash = createHash("sha256").update(Buffer.from("commitment")).update(pool.toBytes()).update(commitment).update(addressTree.toBytes()).update(programId.toBytes()).digest();
    return new Uint8Array(hash);
  }
  /**
   * Convert leaf index to path indices (bit representation)
   */
  leafIndexToPathIndices(leafIndex, depth) {
    const indices = [];
    let idx = leafIndex;
    for (let i = 0; i < depth; i++) {
      indices.push(idx & 1);
      idx >>= 1;
    }
    return indices;
  }
};

// src/client.ts
var CloakCraftClient = class {
  constructor(config) {
    this.wallet = null;
    this.lightClient = null;
    this.connection = new Connection(config.rpcUrl, config.commitment ?? "confirmed");
    this.programId = config.programId;
    this.indexerUrl = config.indexerUrl;
    this.network = config.network ?? "devnet";
    this.noteManager = new NoteManager(config.indexerUrl);
    this.proofGenerator = new ProofGenerator();
    if (config.heliusApiKey) {
      this.lightClient = new LightClient({
        apiKey: config.heliusApiKey,
        network: this.network
      });
    }
  }
  /**
   * Get Light Protocol tree accounts for current network
   */
  getLightTrees() {
    return this.network === "mainnet-beta" ? MAINNET_LIGHT_TREES : DEVNET_LIGHT_TREES;
  }
  /**
   * Check if a nullifier has been spent
   *
   * Returns true if the nullifier compressed account exists
   */
  async isNullifierSpent(nullifier) {
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const trees = this.getLightTrees();
    return this.lightClient.isNullifierSpent(
      nullifier,
      this.programId,
      trees.addressMerkleTree
    );
  }
  /**
   * Prepare Light Protocol params for a transact instruction
   *
   * This fetches the validity proof from Helius for nullifier creation
   */
  async prepareLightParams(nullifier) {
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const trees = this.getLightTrees();
    return this.lightClient.prepareLightParams({
      nullifier,
      programId: this.programId,
      addressMerkleTree: trees.addressMerkleTree,
      stateMerkleTree: trees.stateMerkleTree,
      // These indices depend on how remaining_accounts is ordered
      addressMerkleTreeAccountIndex: 5,
      addressQueueAccountIndex: 6,
      outputTreeIndex: 0
    });
  }
  /**
   * Get remaining accounts needed for Light Protocol CPI
   */
  async getLightRemainingAccounts() {
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const trees = this.getLightTrees();
    return this.lightClient.getRemainingAccounts(trees);
  }
  /**
   * Create a new wallet
   */
  createWallet() {
    this.wallet = createWallet();
    return this.wallet;
  }
  /**
   * Load wallet from spending key
   */
  loadWallet(spendingKey) {
    this.wallet = loadWallet(spendingKey);
    return this.wallet;
  }
  /**
   * Get current wallet
   */
  getWallet() {
    return this.wallet;
  }
  /**
   * Get pool state
   */
  async getPool(tokenMint) {
    const [poolPda] = PublicKey3.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    const accountInfo = await this.connection.getAccountInfo(poolPda);
    if (!accountInfo) return null;
    return this.decodePoolState(accountInfo.data);
  }
  /**
   * Sync notes for the current wallet
   */
  async syncNotes() {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    return this.noteManager.syncNotes(this.wallet.keypair);
  }
  /**
   * Get unspent notes for a token
   */
  async getUnspentNotes(tokenMint) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    return this.noteManager.getUnspentNotes(this.wallet.keypair, tokenMint);
  }
  /**
   * Shield tokens into the pool
   */
  async shield(params, payer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    const tx = await this.buildShieldTransaction(params);
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);
    const signature = await this.connection.sendRawTransaction(tx.serialize());
    const confirmation = await this.connection.confirmTransaction(signature);
    return {
      signature,
      slot: confirmation.context.slot
    };
  }
  /**
   * Private transfer
   */
  async transfer(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    const proof = await this.proofGenerator.generateTransferProof(
      params,
      this.wallet.keypair
    );
    const tx = await this.buildTransferTransaction(params, proof);
    const payer = relayer ?? await this.getRelayer();
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);
    const signature = await this.connection.sendRawTransaction(tx.serialize());
    const confirmation = await this.connection.confirmTransaction(signature);
    return {
      signature,
      slot: confirmation.context.slot
    };
  }
  /**
   * Prepare simple transfer inputs and execute transfer
   *
   * This is a convenience method that handles all cryptographic preparation:
   * - Derives Y-coordinates from spending key
   * - Fetches merkle proofs from indexer
   * - Computes output commitments
   */
  async prepareAndTransfer(request, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    const preparedInputs = await this.prepareInputs(request.inputs);
    const preparedOutputs = await this.prepareOutputs(request.outputs);
    const merkleProof = await this.fetchMerkleProof(request.inputs[0]);
    const params = {
      inputs: preparedInputs,
      merkleRoot: merkleProof.root,
      merklePath: merkleProof.pathElements,
      merkleIndices: merkleProof.pathIndices,
      outputs: preparedOutputs,
      unshield: request.unshield
    };
    return this.transfer(params, relayer);
  }
  /**
   * Swap through external adapter (partial privacy)
   */
  async swapViaAdapter(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    const proof = await this.proofGenerator.generateAdapterProof(
      params,
      this.wallet.keypair
    );
    const tx = await this.buildAdapterSwapTransaction(params, proof);
    const payer = relayer ?? await this.getRelayer();
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);
    const signature = await this.connection.sendRawTransaction(tx.serialize());
    const confirmation = await this.connection.confirmTransaction(signature);
    return {
      signature,
      slot: confirmation.context.slot
    };
  }
  /**
   * Create a market order
   */
  async createOrder(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    const proof = await this.proofGenerator.generateOrderProof(
      params,
      this.wallet.keypair
    );
    const tx = await this.buildCreateOrderTransaction(params, proof);
    const payer = relayer ?? await this.getRelayer();
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);
    const signature = await this.connection.sendRawTransaction(tx.serialize());
    const confirmation = await this.connection.confirmTransaction(signature);
    return {
      signature,
      slot: confirmation.context.slot
    };
  }
  /**
   * Prepare and create a market order (convenience method)
   */
  async prepareAndCreateOrder(request, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    const [preparedInput] = await this.prepareInputs([request.input]);
    const merkleProof = await this.fetchMerkleProof(request.input);
    const { poseidonHash: poseidonHash3, fieldToBytes: fieldToBytes4 } = await import("./poseidon-RP7HBBUP.mjs");
    const orderIdBytes = generateRandomness();
    const escrowRandomness = generateRandomness();
    const escrowNote = (await import("./commitment-6H7B6UBR.mjs")).createNote(
      preparedInput.stealthPubX,
      request.terms.offerMint,
      request.terms.offerAmount,
      escrowRandomness
    );
    const escrowCommitment = computeCommitment(escrowNote);
    const termsHash = poseidonHash3([
      request.terms.offerMint.toBytes(),
      fieldToBytes4(request.terms.offerAmount),
      request.terms.requestMint.toBytes(),
      fieldToBytes4(request.terms.requestAmount)
    ]);
    const { deriveNullifierKey: deriveNullifierKey2, deriveSpendingNullifier: deriveSpendingNullifier2 } = await import("./nullifier-FPRZPFE3.mjs");
    const nullifierKey = deriveNullifierKey2(this.wallet.keypair.spending.sk);
    const inputCommitment = computeCommitment(request.input);
    const nullifier = deriveSpendingNullifier2(nullifierKey, inputCommitment, request.input.leafIndex);
    const params = {
      input: preparedInput,
      merkleRoot: merkleProof.root,
      merklePath: merkleProof.pathElements,
      merkleIndices: merkleProof.pathIndices,
      nullifier,
      orderId: orderIdBytes,
      escrowCommitment,
      termsHash,
      // poseidonHash already returns FieldElement
      escrowStealthPubX: preparedInput.stealthPubX,
      escrowRandomness,
      makerReceiveStealthPubX: preparedInput.stealthPubX,
      // Self
      terms: request.terms,
      expiry: request.expiry
    };
    return this.createOrder(params, relayer);
  }
  /**
   * Get sync status
   */
  async getSyncStatus() {
    return this.noteManager.getSyncStatus();
  }
  // =============================================================================
  // Private Methods
  // =============================================================================
  async buildShieldTransaction(params) {
    const tx = new Transaction();
    return tx;
  }
  async buildTransferTransaction(params, proof) {
    const tx = new Transaction();
    return tx;
  }
  async buildAdapterSwapTransaction(params, proof) {
    const tx = new Transaction();
    return tx;
  }
  async buildCreateOrderTransaction(params, proof) {
    const tx = new Transaction();
    return tx;
  }
  async getRelayer() {
    throw new Error("No relayer configured");
  }
  decodePoolState(data) {
    throw new Error("Not implemented");
  }
  /**
   * Prepare inputs by deriving Y-coordinates from the wallet's spending key
   */
  async prepareInputs(inputs) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    const { bytesToField: bytesToField2 } = await import("./poseidon-RP7HBBUP.mjs");
    return inputs.map((input) => {
      const spendingKey = bytesToField2(this.wallet.keypair.spending.sk);
      const publicKey = derivePublicKey(spendingKey);
      return {
        ...input,
        stealthPubY: publicKey.y
      };
    });
  }
  /**
   * Prepare outputs by computing commitments
   */
  async prepareOutputs(outputs) {
    const { createNote: createNote2 } = await import("./commitment-6H7B6UBR.mjs");
    return outputs.map((output) => {
      const randomness = generateRandomness();
      const tokenMint = new PublicKey3(new Uint8Array(32));
      const note = createNote2(
        output.recipient.stealthPubkey.x,
        tokenMint,
        output.amount,
        randomness
      );
      const commitment = computeCommitment(note);
      return {
        recipient: output.recipient,
        amount: output.amount,
        commitment,
        stealthPubX: output.recipient.stealthPubkey.x,
        randomness
      };
    });
  }
  /**
   * Fetch merkle proof from indexer
   */
  async fetchMerkleProof(note) {
    const commitmentHex = Buffer.from(note.commitment).toString("hex");
    const response = await fetch(`${this.indexerUrl}/merkle-proof/${commitmentHex}`);
    if (!response.ok) {
      throw new Error("Failed to fetch merkle proof");
    }
    const data = await response.json();
    return {
      root: Buffer.from(data.root, "hex"),
      pathElements: data.pathElements.map((e) => Buffer.from(e, "hex")),
      pathIndices: data.pathIndices
    };
  }
};

// src/crypto/index.ts
init_poseidon();
init_babyjubjub();

// src/crypto/stealth.ts
init_babyjubjub();
init_poseidon();
var SUBGROUP_ORDER4 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
function generateStealthAddress(recipientPubkey) {
  const ephemeralPrivate = generateRandomScalar2();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);
  const factor = deriveStealthFactor(sharedSecret.x);
  const factorPoint = scalarMul(GENERATOR, factor);
  const stealthPubkey = addPoints(recipientPubkey, factorPoint);
  return {
    stealthAddress: {
      stealthPubkey,
      ephemeralPubkey
    },
    ephemeralPrivate
  };
}
function deriveStealthPrivateKey(recipientPrivateKey, ephemeralPubkey) {
  const sharedSecret = scalarMul(ephemeralPubkey, recipientPrivateKey);
  const factor = deriveStealthFactor(sharedSecret.x);
  return (recipientPrivateKey + factor) % SUBGROUP_ORDER4;
}
function checkStealthOwnership(stealthPubkey, ephemeralPubkey, recipientKeypair) {
  const privateKey = bytesToField(recipientKeypair.spending.sk);
  const derivedStealthPrivate = deriveStealthPrivateKey(privateKey, ephemeralPubkey);
  const derivedStealthPubkey = derivePublicKey(derivedStealthPrivate);
  return bytesToField(derivedStealthPubkey.x) === bytesToField(stealthPubkey.x) && bytesToField(derivedStealthPubkey.y) === bytesToField(stealthPubkey.y);
}
function deriveStealthFactor(sharedSecretX) {
  const hash = poseidonHashDomain(DOMAIN_STEALTH, sharedSecretX);
  return bytesToField(hash) % SUBGROUP_ORDER4;
}
function addPoints(p1, p2) {
  const { pointAdd: pointAdd2 } = (init_babyjubjub(), __toCommonJS(babyjubjub_exports));
  return pointAdd2(p1, p2);
}
function generateRandomScalar2() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER4;
}
export {
  CloakCraftClient,
  DEVNET_LIGHT_TREES,
  DOMAIN_ACTION_NULLIFIER,
  DOMAIN_COMMITMENT,
  DOMAIN_EMPTY_LEAF,
  DOMAIN_MERKLE,
  DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_STEALTH,
  GENERATOR,
  IDENTITY,
  LightClient,
  LightCommitmentClient,
  MAINNET_LIGHT_TREES,
  NoteManager,
  ProofGenerator,
  Wallet,
  bytesToField,
  checkNullifierSpent,
  checkStealthOwnership,
  computeCommitment,
  createNote,
  createWallet,
  createWatchOnlyWallet,
  decryptNote,
  deriveActionNullifier,
  deriveNullifierKey,
  derivePublicKey,
  deriveSpendingNullifier,
  deriveStealthPrivateKey,
  deriveWalletFromSeed,
  encryptNote,
  fieldToBytes,
  generateRandomness,
  generateStealthAddress,
  isInSubgroup,
  isOnCurve,
  loadWallet,
  parseGroth16Proof,
  pointAdd,
  poseidonHash,
  poseidonHash2,
  poseidonHashDomain,
  scalarMul,
  serializeGroth16Proof,
  tryDecryptNote,
  verifyCommitment
};
