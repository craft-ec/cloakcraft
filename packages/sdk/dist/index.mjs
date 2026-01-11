var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/crypto/poseidon.ts
import { sha256 } from "@noble/hashes/sha256";
function bytesToField(bytes) {
  let result = 0n;
  for (const byte of bytes) {
    result = result << 8n | BigInt(byte);
  }
  return result % FIELD_MODULUS;
}
function fieldToBytes(field) {
  const bytes = new Uint8Array(32);
  let value = field % FIELD_MODULUS;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}
function poseidonHash(inputs, domain) {
  const hasher = sha256.create();
  if (domain !== void 0) {
    hasher.update(fieldToBytes(domain));
  }
  for (const input of inputs) {
    hasher.update(input);
  }
  const hash = hasher.digest();
  const hashBigInt = bytesToField(hash);
  return fieldToBytes(hashBigInt);
}
function poseidonHash2(left, right) {
  return poseidonHash([left, right], DOMAIN_MERKLE);
}
function poseidonHashDomain(domain, ...inputs) {
  return poseidonHash(inputs, domain);
}
var DOMAIN_COMMITMENT, DOMAIN_SPENDING_NULLIFIER, DOMAIN_ACTION_NULLIFIER, DOMAIN_NULLIFIER_KEY, DOMAIN_STEALTH, DOMAIN_MERKLE, DOMAIN_EMPTY_LEAF, FIELD_MODULUS;
var init_poseidon = __esm({
  "src/crypto/poseidon.ts"() {
    "use strict";
    DOMAIN_COMMITMENT = 0x01n;
    DOMAIN_SPENDING_NULLIFIER = 0x02n;
    DOMAIN_ACTION_NULLIFIER = 0x03n;
    DOMAIN_NULLIFIER_KEY = 0x04n;
    DOMAIN_STEALTH = 0x05n;
    DOMAIN_MERKLE = 0x06n;
    DOMAIN_EMPTY_LEAF = 0x07n;
    FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  }
});

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
  const x1x2 = x1 * x2 % FIELD_MODULUS2;
  const y1y2 = y1 * y2 % FIELD_MODULUS2;
  const x1y2 = x1 * y2 % FIELD_MODULUS2;
  const y1x2 = y1 * x2 % FIELD_MODULUS2;
  const dx1x2y1y2 = D * x1x2 * y1y2 % FIELD_MODULUS2;
  const xNum = (x1y2 + y1x2) % FIELD_MODULUS2;
  const yNum = (y1y2 - A * x1x2 % FIELD_MODULUS2 + FIELD_MODULUS2) % FIELD_MODULUS2;
  const xDen = (1n + dx1x2y1y2) % FIELD_MODULUS2;
  const yDen = (1n - dx1x2y1y2 + FIELD_MODULUS2) % FIELD_MODULUS2;
  const x3 = xNum * modInverse(xDen, FIELD_MODULUS2) % FIELD_MODULUS2;
  const y3 = yNum * modInverse(yDen, FIELD_MODULUS2) % FIELD_MODULUS2;
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
  const x2 = x * x % FIELD_MODULUS2;
  const y2 = y * y % FIELD_MODULUS2;
  const lhs = (A * x2 + y2) % FIELD_MODULUS2;
  const rhs = (1n + D * x2 * y2 % FIELD_MODULUS2) % FIELD_MODULUS2;
  return lhs === rhs;
}
function isInSubgroup(point) {
  const shouldBeIdentity = scalarMul(point, SUBGROUP_ORDER);
  return bytesToField(shouldBeIdentity.x) === 0n && bytesToField(shouldBeIdentity.y) === 1n;
}
var FIELD_MODULUS2, SUBGROUP_ORDER, A, D, GENERATOR, IDENTITY;
var init_babyjubjub = __esm({
  "src/crypto/babyjubjub.ts"() {
    "use strict";
    init_poseidon();
    FIELD_MODULUS2 = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
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
  PublicKey as PublicKey2,
  Transaction
} from "@solana/web3.js";

// src/wallet.ts
init_babyjubjub();

// src/crypto/nullifier.ts
init_poseidon();
function deriveNullifierKey(spendingKey) {
  return poseidonHashDomain(DOMAIN_NULLIFIER_KEY, spendingKey);
}
function deriveSpendingNullifier(nullifierKey, commitment) {
  return poseidonHashDomain(DOMAIN_SPENDING_NULLIFIER, nullifierKey, commitment);
}
function deriveActionNullifier(nullifierKey, commitment, actionDomain) {
  return poseidonHashDomain(DOMAIN_ACTION_NULLIFIER, nullifierKey, commitment, actionDomain);
}
async function checkNullifierSpent(indexerUrl, nullifier) {
  const nullifierHex = Buffer.from(nullifier).toString("hex");
  const response = await fetch(`${indexerUrl}/nullifier/${nullifierHex}`);
  if (!response.ok) {
    throw new Error("Failed to check nullifier");
  }
  const data = await response.json();
  return data.spent;
}

// src/wallet.ts
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
async function deriveWalletFromSeed(seedPhrase, path = "m/44'/501'/0'/0'") {
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
      salt: encoder.encode("cloakcraft" + path),
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
import { sha256 as sha2562 } from "@noble/hashes/sha256";
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
  const { PublicKey: PublicKey3 } = __require("@solana/web3.js");
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
    tokenMint: new PublicKey3(tokenMintBytes),
    amount,
    randomness: new Uint8Array(randomness)
  };
}
function deriveEncryptionKey(sharedSecretX) {
  const hasher = sha2562.create();
  hasher.update(Buffer.from("cloakcraft-ecies-key"));
  hasher.update(sharedSecretX);
  return hasher.digest();
}
function encryptAEAD(plaintext, key) {
  const keyStream = sha2562(key);
  const ciphertext = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i++) {
    ciphertext[i] = plaintext[i] ^ keyStream[i % keyStream.length];
  }
  const tag = sha2562(new Uint8Array([...key, ...ciphertext])).slice(0, 16);
  return { ciphertext, tag };
}
function decryptAEAD(ciphertext, tag, key) {
  const expectedTag = sha2562(new Uint8Array([...key, ...ciphertext])).slice(0, 16);
  for (let i = 0; i < 16; i++) {
    if (expectedTag[i] !== tag[i]) {
      throw new Error("AEAD authentication failed");
    }
  }
  const keyStream = sha2562(key);
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

// src/crypto/commitment.ts
init_poseidon();
function computeCommitment(note) {
  const stealthPubX = note.stealthPubX;
  const tokenMintBytes = note.tokenMint.toBytes();
  const amountBytes = fieldToBytes(note.amount);
  const randomness = note.randomness;
  return poseidonHashDomain(
    DOMAIN_COMMITMENT,
    stealthPubX,
    tokenMintBytes,
    amountBytes,
    randomness
  );
}
function verifyCommitment(commitment, note) {
  const computed = computeCommitment(note);
  return bytesToField(computed) === bytesToField(commitment);
}
function generateRandomness() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const value = bytesToField(bytes);
  return fieldToBytes(value);
}
function createNote(stealthPubX, tokenMint, amount, randomness) {
  return {
    stealthPubX,
    tokenMint,
    amount,
    randomness: randomness ?? generateRandomness()
  };
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
        const nullifier = deriveSpendingNullifier(nullifierKey, note.commitment);
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
      const nullifier = deriveSpendingNullifier(nullifierKey, note.commitment);
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
var ProofGenerator = class {
  constructor(config) {
    this.wasmPath = config?.wasmPath;
    this.zkeyPath = config?.zkeyPath;
  }
  /**
   * Generate a transfer proof
   */
  async generateTransferProof(params, keypair) {
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    const inputs = params.inputs.map((note) => ({
      inputNote: {
        stealthPubX: note.stealthPubX,
        tokenMint: note.tokenMint,
        amount: note.amount,
        randomness: note.randomness
      },
      nk: nullifierKey,
      merkleProof: this.buildMerkleProof(note),
      outputNotes: params.outputs.map((out) => ({
        stealthPubX: out.recipient.stealthPubkey.x,
        tokenMint: note.tokenMint,
        amount: out.amount,
        randomness: new Uint8Array(32)
        // Will be generated
      })),
      unshieldAmount: params.unshield?.amount ?? 0n,
      unshieldRecipient: params.unshield?.recipient
    }));
    return this.prove("transfer", inputs);
  }
  /**
   * Generate an adapter swap proof
   */
  async generateAdapterProof(params, keypair) {
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    const inputs = {
      inputNote: {
        stealthPubX: params.input.stealthPubX,
        tokenMint: params.input.tokenMint,
        amount: params.input.amount,
        randomness: params.input.randomness
      },
      nk: nullifierKey,
      merkleProof: this.buildMerkleProof(params.input),
      inputAmount: params.input.amount,
      // Public
      outputTokenMint: params.outputMint,
      minOutput: params.minOutput,
      adapterProgram: params.adapter,
      outputNote: {
        stealthPubX: params.recipient.stealthPubkey.x,
        tokenMint: params.outputMint,
        amount: params.minOutput,
        // Will be updated by adapter
        randomness: new Uint8Array(32)
      }
    };
    return this.prove("adapter", inputs);
  }
  /**
   * Generate an order creation proof
   */
  async generateOrderProof(params, keypair) {
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    const inputs = {
      inputNote: {
        stealthPubX: params.input.stealthPubX,
        tokenMint: params.input.tokenMint,
        amount: params.input.amount,
        randomness: params.input.randomness
      },
      nk: nullifierKey,
      merkleProof: this.buildMerkleProof(params.input),
      terms: params.terms,
      expiry: params.expiry
    };
    return this.prove("order_create", inputs);
  }
  /**
   * Generate a vote proof
   */
  async generateVoteProof(note, keypair, proposalId, voteChoices, thresholdPubkey) {
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    const inputs = {
      tokenNote: {
        stealthPubX: note.stealthPubX,
        tokenMint: note.tokenMint,
        amount: note.amount,
        randomness: note.randomness
      },
      nk: nullifierKey,
      merkleProof: this.buildMerkleProof(note),
      actionDomain: proposalId,
      voteChoices,
      thresholdPubkey
    };
    return this.prove("encrypted_submit", inputs);
  }
  // =============================================================================
  // Private Methods
  // =============================================================================
  async prove(circuit, inputs) {
    console.log(`Generating ${circuit} proof with inputs:`, inputs);
    const proof = new Uint8Array(256);
    crypto.getRandomValues(proof);
    return proof;
  }
  buildMerkleProof(note) {
    return {
      root: new Uint8Array(32),
      pathElements: Array(16).fill(new Uint8Array(32)),
      pathIndices: Array(16).fill(0),
      leafIndex: note.leafIndex
    };
  }
};
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
var CloakCraftClient = class {
  constructor(config) {
    this.wallet = null;
    this.connection = new Connection(config.rpcUrl, config.commitment ?? "confirmed");
    this.programId = config.programId;
    this.indexerUrl = config.indexerUrl;
    this.noteManager = new NoteManager(config.indexerUrl);
    this.proofGenerator = new ProofGenerator();
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
    const [poolPda] = PublicKey2.findProgramAddressSync(
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
  DOMAIN_ACTION_NULLIFIER,
  DOMAIN_COMMITMENT,
  DOMAIN_EMPTY_LEAF,
  DOMAIN_MERKLE,
  DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_STEALTH,
  GENERATOR,
  IDENTITY,
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
