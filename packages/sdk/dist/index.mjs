import {
  buildShieldInstructions,
  buildShieldInstructionsForVersionedTx,
  buildShieldWithProgram,
  computeCommitment,
  createNote,
  generateRandomness,
  verifyCommitment
} from "./chunk-ZUIOLIGE.mjs";
import {
  buildAddLiquidityWithProgram,
  buildClosePendingOperationWithProgram,
  buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram,
  buildInitializeAmmPoolWithProgram,
  buildRemoveLiquidityWithProgram,
  buildSwapWithProgram,
  canonicalTokenOrder,
  deriveAmmPoolPda,
  derivePendingOperationPda,
  generateOperationId
} from "./chunk-FKIZJDB7.mjs";
import {
  DOMAIN_ACTION_NULLIFIER,
  DOMAIN_COMMITMENT,
  DOMAIN_EMPTY_LEAF,
  DOMAIN_MERKLE,
  DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_STEALTH,
  FIELD_MODULUS_FQ,
  FIELD_MODULUS_FR,
  GENERATOR,
  IDENTITY,
  LightProtocol,
  bytesToField,
  decryptNote,
  derivePublicKey,
  deserializeEncryptedNote,
  encryptNote,
  fieldToBytes,
  initPoseidon,
  isInSubgroup,
  isOnCurve,
  pointAdd,
  poseidonHash,
  poseidonHash2,
  poseidonHashAsync,
  poseidonHashDomain,
  poseidonHashDomainAsync,
  scalarMul,
  serializeEncryptedNote,
  tryDecryptNote
} from "./chunk-3EMHSCQ7.mjs";
import {
  BPS_DIVISOR,
  DEFAULT_FEE_CONFIG,
  MAX_FEE_BPS,
  calculateMinimumFee,
  calculateProtocolFee,
  estimateTotalCost,
  fetchProtocolFeeConfig,
  formatFeeAmount,
  formatFeeRate,
  getFeeBps,
  isFeeableOperation,
  isFreeOperation,
  verifyFeeAmount
} from "./chunk-JPXN5O7X.mjs";
import {
  CIRCUIT_IDS,
  DEVNET_V2_TREES,
  PROGRAM_ID,
  SEEDS,
  deriveCommitmentCounterPda,
  derivePoolPda,
  deriveProtocolConfigPda,
  deriveVaultPda,
  deriveVerificationKeyPda,
  padCircuitId
} from "./chunk-HQXTEDR6.mjs";
import {
  __require
} from "./chunk-Y6FXYEAI.mjs";

// src/index.ts
export * from "@cloakcraft/types";

// src/client.ts
import {
  Connection as Connection2,
  PublicKey as PublicKey9,
  Transaction as Transaction2
} from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

// src/crypto/nullifier.ts
function deriveNullifierKey(spendingKey) {
  const zero = new Uint8Array(32);
  return poseidonHashDomain(DOMAIN_NULLIFIER_KEY, spendingKey, zero);
}
function deriveSpendingNullifier(nullifierKey, commitment, leafIndex) {
  const leafIndexBytes = fieldToBytes(BigInt(leafIndex));
  return poseidonHashDomain(DOMAIN_SPENDING_NULLIFIER, nullifierKey, commitment, leafIndexBytes);
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
var SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
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
  if (sk >= SUBGROUP_ORDER) {
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
function deriveWalletFromSignature(signature) {
  if (signature.length < 64) {
    throw new Error("Signature must be at least 64 bytes");
  }
  const sig1 = signature.slice(0, 32);
  const sig2 = signature.slice(32, 64);
  const DOMAIN_WALLET = 0x01n;
  const skBytes = poseidonHashDomain(DOMAIN_WALLET, sig1, sig2);
  const sk = bytesToField(skBytes) % SUBGROUP_ORDER;
  return createWalletFromSpendingKey(sk);
}
var WALLET_DERIVATION_MESSAGE = "CloakCraft Stealth Wallet v1";
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
  const sk = bytesToField(skBytes) % SUBGROUP_ORDER;
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
  return bytesToField(bytes) % SUBGROUP_ORDER;
}

// src/notes.ts
import { PublicKey } from "@solana/web3.js";
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
   *
   * Note: This method is deprecated. Use direct RPC scanning instead.
   * @deprecated Use client.getSyncStatus() which queries RPC directly
   */
  async getSyncStatus() {
    return {
      latestSlot: 0,
      indexedSlot: 0,
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

// src/crypto/stealth.ts
var SUBGROUP_ORDER2 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
function generateStealthAddress(recipientPubkey) {
  const toHex = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  const ephemeralPrivate = generateRandomScalar();
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
  const toHex = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  const sharedSecret = scalarMul(ephemeralPubkey, recipientPrivateKey);
  const factor = deriveStealthFactor(sharedSecret.x);
  const stealthPriv = (recipientPrivateKey + factor) % SUBGROUP_ORDER2;
  return stealthPriv;
}
function checkStealthOwnership(stealthPubkey, ephemeralPubkey, recipientKeypair) {
  const privateKey = bytesToField(recipientKeypair.spending.sk);
  const derivedStealthPrivate = deriveStealthPrivateKey(privateKey, ephemeralPubkey);
  const derivedStealthPubkey = derivePublicKey(derivedStealthPrivate);
  return bytesToField(derivedStealthPubkey.x) === bytesToField(stealthPubkey.x) && bytesToField(derivedStealthPubkey.y) === bytesToField(stealthPubkey.y);
}
function deriveStealthFactor(sharedSecretX) {
  const hash = poseidonHashDomain(DOMAIN_STEALTH, sharedSecretX);
  return bytesToField(hash) % SUBGROUP_ORDER2;
}
function addPoints(p1, p2) {
  return pointAdd(p1, p2);
}
function generateRandomScalar() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER2;
}

// src/crypto/field.ts
var BN254_FIELD_MODULUS = new Uint8Array([
  48,
  100,
  78,
  114,
  225,
  49,
  160,
  41,
  184,
  80,
  69,
  182,
  129,
  129,
  88,
  93,
  40,
  51,
  232,
  72,
  121,
  185,
  112,
  145,
  67,
  225,
  245,
  147,
  240,
  0,
  0,
  1
]);
function pubkeyToField(pubkey) {
  const pubkeyBytes = pubkey.toBytes();
  const result = new Uint8Array(32);
  result.set(pubkeyBytes);
  for (let i = 0; i < 4; i++) {
    if (geModulus(result)) {
      const reduced = subtractModulus(result);
      result.set(reduced);
    } else {
      break;
    }
  }
  return result;
}
function subtractModulus(value) {
  const result = new Uint8Array(32);
  let borrow = 0;
  for (let i = 31; i >= 0; i--) {
    const diff = value[i] - BN254_FIELD_MODULUS[i] - borrow;
    if (diff < 0) {
      result[i] = diff + 256;
      borrow = 1;
    } else {
      result[i] = diff;
      borrow = 0;
    }
  }
  return result;
}
function geModulus(value) {
  for (let i = 0; i < 32; i++) {
    if (value[i] > BN254_FIELD_MODULUS[i]) {
      return true;
    } else if (value[i] < BN254_FIELD_MODULUS[i]) {
      return false;
    }
  }
  return true;
}

// src/snarkjs-prover.ts
var BN254_FIELD_MODULUS2 = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
var artifactsCache = /* @__PURE__ */ new Map();
async function loadCircomArtifacts(circuitName, wasmUrl, zkeyUrl) {
  const cached = artifactsCache.get(circuitName);
  if (cached) {
    return cached;
  }
  const isNode = typeof globalThis.process !== "undefined" && globalThis.process.versions != null && globalThis.process.versions.node != null;
  let wasmBuffer;
  let zkeyBuffer;
  if (isNode) {
    const fs2 = await import("fs");
    const wasmPath = wasmUrl.split("?")[0];
    const zkeyPath = zkeyUrl.split("?")[0];
    wasmBuffer = fs2.readFileSync(wasmPath).buffer;
    zkeyBuffer = fs2.readFileSync(zkeyPath).buffer;
  } else {
    const wasmRes = await fetch(wasmUrl);
    if (!wasmRes.ok) {
      throw new Error(`Failed to load WASM: ${wasmRes.status}`);
    }
    wasmBuffer = await wasmRes.arrayBuffer();
    const zkeyRes = await fetch(zkeyUrl);
    if (!zkeyRes.ok) {
      throw new Error(`Failed to load zkey: ${zkeyRes.status}`);
    }
    zkeyBuffer = await zkeyRes.arrayBuffer();
  }
  const artifacts = { wasmBuffer, zkeyBuffer };
  artifactsCache.set(circuitName, artifacts);
  return artifacts;
}
async function generateSnarkjsProof(artifacts, inputs) {
  const snarkjs = await import("snarkjs");
  const startTime = performance.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    new Uint8Array(artifacts.wasmBuffer),
    new Uint8Array(artifacts.zkeyBuffer)
  );
  const elapsed = performance.now() - startTime;
  console.log("[snarkjs] Public signals from proof:");
  publicSignals.forEach((sig, i) => {
    const hex = BigInt(sig).toString(16).padStart(64, "0");
    console.log(`  [${i}]: ${sig} -> 0x${hex.slice(0, 16)}...`);
  });
  console.log("[snarkjs] Raw proof from snarkjs:");
  console.log("  pi_a[0] (Ax):", proof.pi_a[0]);
  console.log("  pi_a[1] (Ay):", proof.pi_a[1]);
  console.log("  pi_b[0][0] (Bx_re):", proof.pi_b[0][0]);
  console.log("  pi_b[0][1] (Bx_im):", proof.pi_b[0][1]);
  console.log("  pi_b[1][0] (By_re):", proof.pi_b[1][0]);
  console.log("  pi_b[1][1] (By_im):", proof.pi_b[1][1]);
  console.log("  pi_c[0] (Cx):", proof.pi_c[0]);
  console.log("  pi_c[1] (Cy):", proof.pi_c[1]);
  const formattedProof = formatSnarkjsProofForSolana(proof);
  const toHexStr = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log("[snarkjs] Formatted proof for Solana (first 16 bytes of each component):");
  console.log("  A.x (0-31):", toHexStr(formattedProof.slice(0, 16)) + "...");
  console.log("  A.y_neg (32-63):", toHexStr(formattedProof.slice(32, 48)) + "...");
  console.log("  B.x_im (64-95):", toHexStr(formattedProof.slice(64, 80)) + "...");
  console.log("  B.x_re (96-127):", toHexStr(formattedProof.slice(96, 112)) + "...");
  console.log("  B.y_im (128-159):", toHexStr(formattedProof.slice(128, 144)) + "...");
  console.log("  B.y_re (160-191):", toHexStr(formattedProof.slice(160, 176)) + "...");
  console.log("  C.x (192-223):", toHexStr(formattedProof.slice(192, 208)) + "...");
  console.log("  C.y (224-255):", toHexStr(formattedProof.slice(224, 240)) + "...");
  return formattedProof;
}
function formatSnarkjsProofForSolana(proof) {
  const formatted = new Uint8Array(256);
  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : BN254_FIELD_MODULUS2 - ay;
  formatted.set(bigIntToBytes(ax, 32), 0);
  formatted.set(bigIntToBytes(negAy, 32), 32);
  const bx0 = BigInt(proof.pi_b[0][0]);
  const bx1 = BigInt(proof.pi_b[0][1]);
  const by0 = BigInt(proof.pi_b[1][0]);
  const by1 = BigInt(proof.pi_b[1][1]);
  formatted.set(bigIntToBytes(bx1, 32), 64);
  formatted.set(bigIntToBytes(bx0, 32), 96);
  formatted.set(bigIntToBytes(by1, 32), 128);
  formatted.set(bigIntToBytes(by0, 32), 160);
  const cx = BigInt(proof.pi_c[0]);
  const cy = BigInt(proof.pi_c[1]);
  formatted.set(bigIntToBytes(cx, 32), 192);
  formatted.set(bigIntToBytes(cy, 32), 224);
  return formatted;
}
function bigIntToBytes(value, length) {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}
function bytesToFieldString(bytes) {
  let result = 0n;
  for (const byte of bytes) {
    result = result << 8n | BigInt(byte);
  }
  return result.toString();
}
function bigintToFieldString(value) {
  return value.toString();
}

// src/proofs.ts
var BN254_FIELD_MODULUS3 = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
var CIRCUIT_FILE_MAP = {
  "transfer/1x2": "transfer_1x2",
  "transfer/1x3": "transfer_1x3",
  "transfer/2x2": "transfer_2x2",
  "consolidate/3x1": "consolidate_3x1",
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
var ProofGenerator = class {
  constructor(config) {
    this.circuits = /* @__PURE__ */ new Map();
    /** Circom circuit base URL for browser proving */
    this.circomBaseUrl = "/circom";
    /** Cached circom artifacts */
    this.circomArtifacts = /* @__PURE__ */ new Map();
    this.baseUrl = config?.baseUrl ?? "/circuits";
    this.nodeConfig = config?.nodeConfig;
  }
  /**
   * Configure for Node.js proving (auto-detects paths if not provided)
   */
  configureForNode(config) {
    this.nodeConfig = {
      circuitsDir: config?.circuitsDir ?? path.resolve(__dirname, "../../../circom-circuits/circuits"),
      circomBuildDir: config?.circomBuildDir ?? path.resolve(__dirname, "../../../circom-circuits/build")
    };
  }
  /**
   * Initialize the prover with circuit artifacts
   */
  async initialize(circuitNames) {
    const circuits = circuitNames ?? [
      "transfer/1x2",
      "transfer/1x3",
      "transfer/2x2",
      "consolidate/3x1",
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
    } catch (err) {
      console.warn(`Failed to load circuit ${name}:`, err);
    }
  }
  /**
   * Load circuit from URL (browser)
   */
  async loadCircuitFromUrl(name) {
    const circuitFileName = CIRCUIT_FILE_MAP[name];
    if (!circuitFileName) {
      console.warn(`Unknown circuit: ${name}`);
      return;
    }
    console.log(`[Circuit] ${name} will be auto-loaded on-demand from ${this.baseUrl}/`);
    return;
  }
  /**
   * Check if a circuit is loaded or can be auto-loaded
   *
   * Circom circuits are auto-loaded on-demand, so we return true for known circuit names.
   */
  hasCircuit(name) {
    if (this.circuits.has(name)) {
      return true;
    }
    const knownCircuits = [
      "transfer/1x2",
      "transfer/1x3",
      "transfer/2x2",
      "consolidate/3x1",
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
    return knownCircuits.includes(name);
  }
  /**
   * Generate a transfer proof (1 input, 2 outputs)
   */
  async generateTransferProof(params, keypair) {
    const circuitName = "transfer/1x2";
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
  // =============================================================================
  // AMM Swap Proof Generation
  // =============================================================================
  /**
   * Generate a swap proof
   *
   * Returns both the proof and the computed commitments/nullifier
   * so the caller can pass the SAME values to the instruction.
   */
  async generateSwapProof(params, keypair) {
    const circuitName = "swap/swap";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);
    let effectiveSpendingKey;
    if (params.input.stealthEphemeralPubkey) {
      effectiveSpendingKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.input.stealthEphemeralPubkey
      );
    } else {
      effectiveSpendingKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveSpendingKey));
    const inputCommitment = computeCommitment(params.input);
    const nullifier = deriveSpendingNullifier(effectiveNullifierKey, inputCommitment, params.input.leafIndex);
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array ? params.input.tokenMint : params.input.tokenMint.toBytes();
    const outputTokenMint = params.outputTokenMint.toBytes();
    const poolIdBytes = pubkeyToField(params.poolId);
    const outRandomness = params.outRandomness ?? generateRandomness();
    const changeRandomness = params.changeRandomness ?? generateRandomness();
    const changeAmount = params.input.amount - params.swapAmount;
    const outputNoteWithRandomness = {
      stealthPubX: params.outputRecipient.stealthPubkey.x,
      tokenMint: outputTokenMint,
      amount: params.outputAmount,
      randomness: outRandomness
    };
    const changeNoteWithRandomness = {
      stealthPubX: params.changeRecipient.stealthPubkey.x,
      tokenMint: inputTokenMint,
      amount: changeAmount,
      randomness: changeRandomness
    };
    const outCommitment = computeCommitment(outputNoteWithRandomness);
    const changeCommitment = computeCommitment(changeNoteWithRandomness);
    const merklePath = [...params.merklePath];
    while (merklePath.length < 32) {
      merklePath.push(new Uint8Array(32));
    }
    const merkleIndices = [...params.merkleIndices];
    while (merkleIndices.length < 32) {
      merkleIndices.push(0);
    }
    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      pool_id: fieldToHex(poolIdBytes),
      out_commitment: fieldToHex(outCommitment),
      change_commitment: fieldToHex(changeCommitment),
      min_output: params.minOutput.toString(),
      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(effectiveSpendingKey)),
      token_mint: fieldToHex(inputTokenMint),
      // Merkle proof from Light Protocol
      merkle_path: merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map((i) => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      // Swap parameters
      swap_in_amount: params.swapAmount.toString(),
      swap_a_to_b: params.swapDirection === "aToB" ? "1" : "0",
      fee_bps: (params.feeBps ?? 30).toString(),
      // Output details
      out_stealth_pub_x: fieldToHex(params.outputRecipient.stealthPubkey.x),
      out_token_mint: fieldToHex(outputTokenMint),
      out_amount: params.outputAmount.toString(),
      out_randomness: fieldToHex(outRandomness),
      // Change details
      change_stealth_pub_x: fieldToHex(params.changeRecipient.stealthPubkey.x),
      change_amount: changeAmount.toString(),
      change_randomness: fieldToHex(changeRandomness)
    };
    const proof = await this.prove(circuitName, witnessInputs);
    return {
      proof,
      nullifier,
      outCommitment,
      changeCommitment,
      outRandomness,
      changeRandomness
    };
  }
  /**
   * Generate an add liquidity proof
   *
   * Returns both the proof and the computed commitments/nullifiers
   * so the caller can pass the SAME values to the instruction.
   */
  async generateAddLiquidityProof(params, keypair) {
    const circuitName = "swap/add_liquidity";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    const deriveEffectiveKey = (input) => {
      if (input.stealthEphemeralPubkey) {
        return deriveStealthPrivateKey(
          bytesToField(keypair.spending.sk),
          input.stealthEphemeralPubkey
        );
      }
      return bytesToField(keypair.spending.sk);
    };
    const effectiveKeyA = deriveEffectiveKey(params.inputA);
    const effectiveKeyB = deriveEffectiveKey(params.inputB);
    const nullifierKeyA = deriveNullifierKey(fieldToBytes(effectiveKeyA));
    const nullifierKeyB = deriveNullifierKey(fieldToBytes(effectiveKeyB));
    console.log(`[Proof Gen] stealthPubX: ${Buffer.from(params.inputA.stealthPubX).toString("hex").slice(0, 16)}...`);
    console.log(`[Proof Gen] amount: ${params.inputA.amount}`);
    console.log(`[Proof Gen] randomness: ${Buffer.from(params.inputA.randomness).toString("hex").slice(0, 16)}...`);
    const mintBytes = params.inputA.tokenMint instanceof Uint8Array ? params.inputA.tokenMint : params.inputA.tokenMint.toBytes();
    console.log(`[Proof Gen] tokenMint bytes: ${Buffer.from(mintBytes).toString("hex").slice(0, 16)}...`);
    const commitmentA = computeCommitment(params.inputA);
    const commitmentB = computeCommitment(params.inputB);
    console.log(`[Proof Gen] COMPUTED: ${Buffer.from(commitmentA).toString("hex").slice(0, 16)}...`);
    console.log(`[Proof Gen] ORIGINAL: ${Buffer.from(params.inputA.commitment).toString("hex").slice(0, 16)}...`);
    if (Buffer.from(commitmentA).toString("hex") !== Buffer.from(params.inputA.commitment).toString("hex")) {
      console.log(`[Proof Gen] \u274C COMMITMENT MISMATCH! This will cause nullifier collision!`);
    }
    const nullifierA = deriveSpendingNullifier(nullifierKeyA, commitmentA, params.inputA.leafIndex);
    const nullifierB = deriveSpendingNullifier(nullifierKeyB, commitmentB, params.inputB.leafIndex);
    console.log(`[Proof Gen] Computed nullifier A: ${Buffer.from(nullifierA).toString("hex").slice(0, 16)}...`);
    const poolIdBytes = pubkeyToField(params.poolId);
    const lpRandomness = params.lpRandomness ?? generateRandomness();
    const changeARandomness = params.changeARandomness ?? generateRandomness();
    const changeBRandomness = params.changeBRandomness ?? generateRandomness();
    const changeAAmount = params.inputA.amount - params.depositA;
    const changeBAmount = params.inputB.amount - params.depositB;
    const lpAmount = params.lpAmount;
    const tokenAMint = params.inputA.tokenMint instanceof Uint8Array ? params.inputA.tokenMint : params.inputA.tokenMint.toBytes();
    const tokenBMint = params.inputB.tokenMint instanceof Uint8Array ? params.inputB.tokenMint : params.inputB.tokenMint.toBytes();
    const lpTokenMint = params.lpMint instanceof Uint8Array ? params.lpMint : params.lpMint.toBytes();
    const lpNote = {
      stealthPubX: params.lpRecipient.stealthPubkey.x,
      tokenMint: lpTokenMint,
      amount: lpAmount,
      randomness: lpRandomness
    };
    const changeANote = {
      stealthPubX: params.changeARecipient.stealthPubkey.x,
      tokenMint: tokenAMint,
      amount: changeAAmount,
      randomness: changeARandomness
    };
    const changeBNote = {
      stealthPubX: params.changeBRecipient.stealthPubkey.x,
      tokenMint: tokenBMint,
      amount: changeBAmount,
      randomness: changeBRandomness
    };
    const lpCommitment = computeCommitment(lpNote);
    const changeACommitment = computeCommitment(changeANote);
    const changeBCommitment = computeCommitment(changeBNote);
    const dummyMerklePath = Array(32).fill(new Uint8Array(32));
    const dummyMerkleIndices = Array(32).fill(0);
    const witnessInputs = {
      // Public inputs
      nullifier_a: fieldToHex(nullifierA),
      nullifier_b: fieldToHex(nullifierB),
      pool_id: fieldToHex(poolIdBytes),
      lp_commitment: fieldToHex(lpCommitment),
      change_a_commitment: fieldToHex(changeACommitment),
      change_b_commitment: fieldToHex(changeBCommitment),
      // Private inputs - Token A
      in_a_stealth_pub_x: fieldToHex(params.inputA.stealthPubX),
      in_a_amount: params.inputA.amount.toString(),
      in_a_randomness: fieldToHex(params.inputA.randomness),
      in_a_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKeyA)),
      token_a_mint: fieldToHex(tokenAMint),
      in_a_leaf_index: params.inputA.leafIndex.toString(),
      merkle_path_a: dummyMerklePath.map((p) => fieldToHex(p)),
      merkle_path_indices_a: dummyMerkleIndices.map((i) => i.toString()),
      // Private inputs - Token B
      in_b_stealth_pub_x: fieldToHex(params.inputB.stealthPubX),
      in_b_amount: params.inputB.amount.toString(),
      in_b_randomness: fieldToHex(params.inputB.randomness),
      in_b_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKeyB)),
      token_b_mint: fieldToHex(tokenBMint),
      in_b_leaf_index: params.inputB.leafIndex.toString(),
      merkle_path_b: dummyMerklePath.map((p) => fieldToHex(p)),
      merkle_path_indices_b: dummyMerkleIndices.map((i) => i.toString()),
      // Deposit amounts
      deposit_a: params.depositA.toString(),
      deposit_b: params.depositB.toString(),
      // LP output
      lp_stealth_pub_x: fieldToHex(params.lpRecipient.stealthPubkey.x),
      lp_token_mint: fieldToHex(lpTokenMint),
      lp_amount: lpAmount.toString(),
      lp_randomness: fieldToHex(lpRandomness),
      // Change A output
      change_a_stealth_pub_x: fieldToHex(params.changeARecipient.stealthPubkey.x),
      change_a_amount: changeAAmount.toString(),
      change_a_randomness: fieldToHex(changeARandomness),
      // Change B output
      change_b_stealth_pub_x: fieldToHex(params.changeBRecipient.stealthPubkey.x),
      change_b_amount: changeBAmount.toString(),
      change_b_randomness: fieldToHex(changeBRandomness)
    };
    const proof = await this.prove(circuitName, witnessInputs);
    return {
      proof,
      nullifierA,
      nullifierB,
      lpCommitment,
      changeACommitment,
      changeBCommitment,
      lpRandomness,
      changeARandomness,
      changeBRandomness
    };
  }
  /**
   * Generate a remove liquidity proof
   */
  async generateRemoveLiquidityProof(params, keypair) {
    const circuitName = "swap/remove_liquidity";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    let effectiveKey;
    if (params.lpInput.stealthEphemeralPubkey) {
      effectiveKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.lpInput.stealthEphemeralPubkey
      );
    } else {
      effectiveKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));
    const lpCommitment = computeCommitment(params.lpInput);
    const lpNullifier = deriveSpendingNullifier(effectiveNullifierKey, lpCommitment, params.lpInput.leafIndex);
    const poolIdBytes = pubkeyToField(params.poolId);
    const oldStateHash = new Uint8Array(params.oldPoolStateHash);
    const newStateHash = new Uint8Array(params.newPoolStateHash);
    oldStateHash[0] &= 31;
    newStateHash[0] &= 31;
    const outputARandomness = params.outputARandomness ?? generateRandomness();
    const outputBRandomness = params.outputBRandomness ?? generateRandomness();
    const tokenAMint = params.tokenAMint.toBytes();
    const tokenBMint = params.tokenBMint.toBytes();
    const lpTokenMint = params.lpInput.tokenMint instanceof Uint8Array ? params.lpInput.tokenMint : params.lpInput.tokenMint.toBytes();
    const outputANote = {
      stealthPubX: params.outputARecipient.stealthPubkey.x,
      tokenMint: tokenAMint,
      amount: params.outputAAmount,
      randomness: outputARandomness
    };
    const outputBNote = {
      stealthPubX: params.outputBRecipient.stealthPubkey.x,
      tokenMint: tokenBMint,
      amount: params.outputBAmount,
      randomness: outputBRandomness
    };
    const outputACommitment = computeCommitment(outputANote);
    const outputBCommitment = computeCommitment(outputBNote);
    const witnessInputs = {
      // Public inputs
      lp_nullifier: fieldToHex(lpNullifier),
      pool_id: fieldToHex(poolIdBytes),
      out_a_commitment: fieldToHex(outputACommitment),
      out_b_commitment: fieldToHex(outputBCommitment),
      old_state_hash: fieldToHex(oldStateHash),
      new_state_hash: fieldToHex(newStateHash),
      // Private inputs - LP token
      lp_stealth_pub_x: fieldToHex(params.lpInput.stealthPubX),
      lp_amount: params.lpInput.amount.toString(),
      lp_randomness: fieldToHex(params.lpInput.randomness),
      lp_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),
      lp_token_mint: fieldToHex(lpTokenMint),
      lp_leaf_index: params.lpInput.leafIndex.toString(),
      // Merkle proof
      merkle_path: params.merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices: params.merklePathIndices.map((idx) => idx.toString()),
      // Output details
      out_a_stealth_pub_x: fieldToHex(params.outputARecipient.stealthPubkey.x),
      out_a_amount: params.outputAAmount.toString(),
      out_a_randomness: fieldToHex(outputARandomness),
      token_a_mint: fieldToHex(tokenAMint),
      out_b_stealth_pub_x: fieldToHex(params.outputBRecipient.stealthPubkey.x),
      out_b_amount: params.outputBAmount.toString(),
      out_b_randomness: fieldToHex(outputBRandomness),
      token_b_mint: fieldToHex(tokenBMint)
    };
    const proof = await this.prove(circuitName, witnessInputs);
    return {
      proof,
      lpNullifier,
      outputACommitment,
      outputBCommitment,
      outputARandomness,
      outputBRandomness
    };
  }
  // =============================================================================
  // Consolidation Proof Generation
  // =============================================================================
  /**
   * Generate a consolidation proof (3 inputs -> 1 output)
   *
   * Consolidation merges multiple notes into a single note.
   * - No fees (consolidation is free to encourage wallet cleanup)
   * - Supports 1-3 input notes (unused inputs are zeroed)
   * - Single output back to self
   */
  async generateConsolidationProof(params, keypair) {
    const circuitName = "consolidate/3x1";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    if (params.inputs.length === 0 || params.inputs.length > 3) {
      throw new Error("Consolidation requires 1-3 input notes");
    }
    const outputRandomness = params.outputRandomness ?? generateRandomness();
    const outputAmount = params.inputs.reduce((sum, input) => sum + input.amount, 0n);
    const tokenMintBytes = params.tokenMint.toBytes();
    const outputNote = {
      stealthPubX: params.outputRecipient.stealthPubkey.x,
      tokenMint: tokenMintBytes,
      amount: outputAmount,
      randomness: outputRandomness
    };
    const outputCommitment = computeCommitment(outputNote);
    const processedInputs = [];
    for (const input of params.inputs) {
      let effectiveKey;
      if (input.stealthEphemeralPubkey) {
        effectiveKey = deriveStealthPrivateKey(
          bytesToField(keypair.spending.sk),
          input.stealthEphemeralPubkey
        );
      } else {
        effectiveKey = bytesToField(keypair.spending.sk);
      }
      const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));
      const commitment = computeCommitment(input);
      const nullifier = deriveSpendingNullifier(effectiveNullifierKey, commitment, input.leafIndex);
      const dummyPath = Array(32).fill(new Uint8Array(32));
      const dummyIndices = Array(32).fill(0);
      processedInputs.push({
        nullifier,
        stealthPubX: input.stealthPubX,
        amount: input.amount,
        randomness: input.randomness,
        spendingKey: fieldToBytes(effectiveKey),
        leafIndex: input.leafIndex,
        merklePath: dummyPath,
        merklePathIndices: dummyIndices
      });
    }
    while (processedInputs.length < 3) {
      processedInputs.push({
        nullifier: new Uint8Array(32),
        stealthPubX: new Uint8Array(32),
        amount: 0n,
        randomness: new Uint8Array(32),
        spendingKey: new Uint8Array(32),
        leafIndex: 0,
        merklePath: Array(32).fill(new Uint8Array(32)),
        merklePathIndices: Array(32).fill(0)
      });
    }
    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier_1: fieldToHex(processedInputs[0].nullifier),
      nullifier_2: fieldToHex(processedInputs[1].nullifier),
      nullifier_3: fieldToHex(processedInputs[2].nullifier),
      out_commitment: fieldToHex(outputCommitment),
      token_mint: fieldToHex(tokenMintBytes),
      // Input 1 (always active)
      in_stealth_pub_x_1: fieldToHex(processedInputs[0].stealthPubX),
      in_amount_1: processedInputs[0].amount.toString(),
      in_randomness_1: fieldToHex(processedInputs[0].randomness),
      in_stealth_spending_key_1: fieldToHex(processedInputs[0].spendingKey),
      merkle_path_1: processedInputs[0].merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices_1: processedInputs[0].merklePathIndices.map((i) => i.toString()),
      leaf_index_1: processedInputs[0].leafIndex.toString(),
      // Input 2 (optional - can be zeros)
      in_stealth_pub_x_2: fieldToHex(processedInputs[1].stealthPubX),
      in_amount_2: processedInputs[1].amount.toString(),
      in_randomness_2: fieldToHex(processedInputs[1].randomness),
      in_stealth_spending_key_2: fieldToHex(processedInputs[1].spendingKey),
      merkle_path_2: processedInputs[1].merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices_2: processedInputs[1].merklePathIndices.map((i) => i.toString()),
      leaf_index_2: processedInputs[1].leafIndex.toString(),
      // Input 3 (optional - can be zeros)
      in_stealth_pub_x_3: fieldToHex(processedInputs[2].stealthPubX),
      in_amount_3: processedInputs[2].amount.toString(),
      in_randomness_3: fieldToHex(processedInputs[2].randomness),
      in_stealth_spending_key_3: fieldToHex(processedInputs[2].spendingKey),
      merkle_path_3: processedInputs[2].merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices_3: processedInputs[2].merklePathIndices.map((i) => i.toString()),
      leaf_index_3: processedInputs[2].leafIndex.toString(),
      // Output
      out_stealth_pub_x: fieldToHex(params.outputRecipient.stealthPubkey.x),
      out_amount: outputAmount.toString(),
      out_randomness: fieldToHex(outputRandomness)
    };
    const proof = await this.prove(circuitName, witnessInputs);
    return {
      proof,
      nullifiers: processedInputs.filter((i) => i.amount > 0n).map((i) => i.nullifier),
      outputCommitment,
      outputRandomness,
      outputAmount
    };
  }
  // =============================================================================
  // Market Order Proof Generation
  // =============================================================================
  /**
   * Generate a fill order proof
   */
  async generateFillOrderProof(params, keypair) {
    const circuitName = "market/order_fill";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    let effectiveKey;
    if (params.takerInput.stealthEphemeralPubkey) {
      effectiveKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.takerInput.stealthEphemeralPubkey
      );
    } else {
      effectiveKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));
    const takerCommitment = computeCommitment(params.takerInput);
    const takerNullifier = deriveSpendingNullifier(effectiveNullifierKey, takerCommitment, params.takerInput.leafIndex);
    const witnessInputs = {
      // Public inputs
      taker_nullifier: fieldToHex(takerNullifier),
      order_id: fieldToHex(params.orderId),
      current_timestamp: params.currentTimestamp.toString(),
      // Private inputs - Taker
      taker_stealth_pub_x: fieldToHex(params.takerInput.stealthPubX),
      taker_amount: params.takerInput.amount.toString(),
      taker_randomness: fieldToHex(params.takerInput.randomness),
      taker_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),
      // Output recipients
      taker_receive_stealth_pub_x: fieldToHex(params.takerReceiveRecipient.stealthPubkey.x),
      taker_change_stealth_pub_x: fieldToHex(params.takerChangeRecipient.stealthPubkey.x)
    };
    return this.prove(circuitName, witnessInputs);
  }
  /**
   * Generate a cancel order proof
   */
  async generateCancelOrderProof(params, keypair) {
    const circuitName = "market/order_cancel";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    const escrowSpendingKey = bytesToField(keypair.spending.sk);
    const escrowNullifierKey = deriveNullifierKey(fieldToBytes(escrowSpendingKey));
    const witnessInputs = {
      // Public inputs
      order_id: fieldToHex(params.orderId),
      current_timestamp: params.currentTimestamp.toString(),
      // Private inputs
      escrow_spending_key: fieldToHex(fieldToBytes(escrowSpendingKey)),
      // Output recipient
      refund_stealth_pub_x: fieldToHex(params.refundRecipient.stealthPubkey.x)
    };
    return this.prove(circuitName, witnessInputs);
  }
  /**
   * Generate a governance vote proof
   *
   * Proves ownership of voting power and correct encryption of the vote.
   */
  async generateVoteProof(params, keypair) {
    const circuitName = "governance/encrypted_submit";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }
    let effectiveKey;
    if (params.input.stealthEphemeralPubkey) {
      effectiveKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.input.stealthEphemeralPubkey
      );
    } else {
      effectiveKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));
    const inputCommitment = computeCommitment(params.input);
    const actionNullifier = poseidonHash([
      effectiveNullifierKey,
      params.proposalId
    ]);
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? params.input.tokenMint : params.input.tokenMint.toBytes();
    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      action_nullifier: fieldToHex(actionNullifier),
      proposal_id: fieldToHex(params.proposalId),
      token_mint: fieldToHex(tokenMint),
      threshold_pubkey_x: fieldToHex(params.electionPubkey.x),
      threshold_pubkey_y: fieldToHex(params.electionPubkey.y),
      // Encrypted votes (3 options: yes, no, abstain)
      encrypted_yes_r: fieldToHex(params.encryptionRandomness.yes),
      encrypted_no_r: fieldToHex(params.encryptionRandomness.no),
      encrypted_abstain_r: fieldToHex(params.encryptionRandomness.abstain),
      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),
      // Merkle proof
      merkle_path: params.merklePath.map((e) => fieldToHex(e)),
      merkle_indices: params.merkleIndices.map((i) => i.toString()),
      // Vote choice (0=yes, 1=no, 2=abstain)
      vote_choice: params.voteChoice.toString()
    };
    return this.prove(circuitName, witnessInputs);
  }
  // =============================================================================
  // Core Proving
  // =============================================================================
  /**
   * Generate a Groth16 proof for a circuit
   *
   * Returns 256-byte proof formatted for Solana's alt_bn128 verifier
   */
  async prove(circuitName, inputs) {
    const artifacts = this.circuits.get(circuitName);
    if (!artifacts) {
      const dummyArtifacts = {
        manifest: {},
        provingKey: new Uint8Array(0)
      };
      return this.proveNative(circuitName, inputs, dummyArtifacts);
    }
    return this.proveNative(circuitName, inputs, artifacts);
  }
  /**
   * Native Groth16 prover (WASM-based)
   *
   * Returns proof bytes already formatted for Solana (256 bytes)
   */
  async proveNative(circuitName, inputs, artifacts) {
    return this.proveViaWasm(circuitName, inputs, artifacts);
  }
  /**
   * Set custom circom base URL
   */
  setCircomBaseUrl(url) {
    this.circomBaseUrl = url;
  }
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
  async proveViaWasm(circuitName, inputs, _artifacts) {
    const circomFileName = this.getCircomFileName(circuitName);
    const cacheBuster = "v2";
    const wasmUrl = `${this.circomBaseUrl}/${circomFileName}.wasm?${cacheBuster}`;
    const zkeyUrl = `${this.circomBaseUrl}/${circomFileName}_final.zkey?${cacheBuster}`;
    let artifacts = this.circomArtifacts.get(circuitName);
    if (!artifacts) {
      artifacts = await loadCircomArtifacts(circuitName, wasmUrl, zkeyUrl);
      this.circomArtifacts.set(circuitName, artifacts);
    }
    const circomInputs = this.convertToCircomInputs(inputs);
    const proofBytes = await generateSnarkjsProof(artifacts, circomInputs);
    return proofBytes;
  }
  /**
   * Get circom file name from circuit name
   */
  getCircomFileName(circuitName) {
    const mapping = {
      "transfer/1x2": "transfer_1x2",
      "transfer/1x3": "transfer_1x3",
      "swap/swap": "swap",
      "swap/add_liquidity": "add_liquidity",
      "swap/remove_liquidity": "remove_liquidity"
    };
    return mapping[circuitName] ?? circuitName.replace("/", "_");
  }
  /**
   * Convert SDK inputs to circom format (string field elements)
   */
  convertToCircomInputs(inputs) {
    const result = {};
    for (const [key, value] of Object.entries(inputs)) {
      if (Array.isArray(value)) {
        result[key] = value.map((v) => this.valueToFieldString(v));
      } else {
        result[key] = this.valueToFieldString(value);
      }
    }
    return result;
  }
  /**
   * Convert a value to field element string
   */
  valueToFieldString(value) {
    if (typeof value === "string") {
      if (value.startsWith("0x")) {
        return BigInt(value).toString();
      }
      return value;
    }
    if (typeof value === "bigint") {
      return value.toString();
    }
    if (typeof value === "number") {
      return value.toString();
    }
    if (value instanceof Uint8Array) {
      return bytesToFieldString(value);
    }
    throw new Error(`Cannot convert ${typeof value} to field string`);
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
    const negY = y === 0n ? 0n : BN254_FIELD_MODULUS3 - y;
    const negYBytes = bigIntToBytes2(negY, 32);
    formatted.set(negYBytes, 32);
    formatted.set(proof.b, 64);
    formatted.set(proof.c, 192);
    return formatted;
  }
  // =============================================================================
  // Witness Building Helpers
  // =============================================================================
  buildTransferWitness(params, spendingKey, nullifierKey) {
    if (!params.inputs || params.inputs.length === 0) {
      throw new Error("TransferParams.inputs is empty. At least one input required.");
    }
    if (!params.outputs || params.outputs.length === 0) {
      throw new Error("TransferParams.outputs is empty. At least one output required.");
    }
    if (!params.outputs[0].commitment) {
      throw new Error("TransferParams.outputs[0].commitment is undefined. Use prepareAndTransfer() or ensure outputs have commitment, stealthPubX, and randomness.");
    }
    const input = params.inputs[0];
    let stealthSpendingKey;
    if (input.stealthEphemeralPubkey) {
      const baseSpendingKey = bytesToField(spendingKey);
      stealthSpendingKey = deriveStealthPrivateKey(baseSpendingKey, input.stealthEphemeralPubkey);
    } else {
      stealthSpendingKey = bytesToField(spendingKey);
      console.warn("[buildTransferWitness] No ephemeral pubkey - using base spending key directly");
    }
    const stealthNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
    const commitment = computeCommitment(input);
    const nullifier = deriveSpendingNullifier(stealthNullifierKey, commitment, input.leafIndex);
    const tokenMint = input.tokenMint instanceof Uint8Array ? input.tokenMint : input.tokenMint.toBytes();
    const out2StealthPubX = params.outputs[1]?.stealthPubX ?? new Uint8Array(32);
    const out2Amount = params.outputs[1]?.amount ?? 0n;
    const out2Randomness = params.outputs[1]?.randomness ?? new Uint8Array(32);
    let out2Commitment;
    if (params.outputs[1]?.commitment) {
      out2Commitment = params.outputs[1].commitment;
    } else {
      out2Commitment = poseidonHashDomain(
        DOMAIN_COMMITMENT,
        out2StealthPubX,
        tokenMint,
        fieldToBytes(out2Amount),
        out2Randomness
      );
    }
    const unshieldAmountForProof = params.unshield?.amount ?? 0n;
    const feeAmountForProof = params.fee ?? 0n;
    console.log("[buildTransferWitness] unshield_amount for proof:", unshieldAmountForProof.toString());
    console.log("[buildTransferWitness] fee_amount for proof:", feeAmountForProof.toString());
    console.log("[buildTransferWitness] params.unshield:", params.unshield);
    console.log("[buildTransferWitness] output 1 amount:", params.outputs[0].amount.toString());
    console.log("[buildTransferWitness] output 2 amount:", out2Amount.toString());
    console.log("[buildTransferWitness] input amount:", input.amount.toString());
    const expectedTotal = params.outputs[0].amount + out2Amount + unshieldAmountForProof + feeAmountForProof;
    console.log(
      "[buildTransferWitness] Balance check: input=",
      input.amount.toString(),
      "expected=",
      expectedTotal.toString(),
      "match=",
      input.amount === expectedTotal
    );
    console.log("[buildTransferWitness] === Commitment bytes for proof ===");
    console.log("  out_commitment_1 (full):", Buffer.from(params.outputs[0].commitment).toString("hex"));
    console.log("  out_commitment_2 (full):", Buffer.from(out2Commitment).toString("hex"));
    console.log("  out_stealth_pub_x_1:", Buffer.from(params.outputs[0].stealthPubX).toString("hex").slice(0, 32) + "...");
    console.log("  out_amount_1:", params.outputs[0].amount.toString());
    console.log("  out_randomness_1:", Buffer.from(params.outputs[0].randomness).toString("hex").slice(0, 32) + "...");
    return {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      out_commitment_1: fieldToHex(params.outputs[0].commitment),
      out_commitment_2: fieldToHex(out2Commitment),
      token_mint: fieldToHex(tokenMint),
      unshield_amount: unshieldAmountForProof.toString(),
      fee_amount: feeAmountForProof.toString(),
      // Private inputs (Circom circuit - no in_stealth_pub_y)
      in_stealth_pub_x: fieldToHex(input.stealthPubX),
      in_amount: input.amount.toString(),
      in_randomness: fieldToHex(input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(stealthSpendingKey)),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map((i) => i.toString()),
      leaf_index: input.leafIndex.toString(),
      // Output 1 (recipient)
      out_stealth_pub_x_1: fieldToHex(params.outputs[0].stealthPubX),
      out_amount_1: params.outputs[0].amount.toString(),
      out_randomness_1: fieldToHex(params.outputs[0].randomness),
      // Output 2 (change)
      out_stealth_pub_x_2: fieldToHex(out2StealthPubX),
      out_amount_2: out2Amount.toString(),
      out_randomness_2: fieldToHex(out2Randomness)
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
function bigIntToBytes2(value, length) {
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

// src/crypto/elgamal.ts
function elgamalEncrypt(message, pubkey, randomness) {
  const c1 = scalarMul(GENERATOR, randomness);
  const mG = scalarMul(GENERATOR, message);
  const rP = scalarMul(pubkey, randomness);
  const c2 = pointAdd(mG, rP);
  return { c1, c2 };
}
function addCiphertexts(a, b) {
  return {
    c1: pointAdd(a.c1, b.c1),
    c2: pointAdd(a.c2, b.c2)
  };
}
function serializeCiphertext(ct) {
  const result = new Uint8Array(64);
  result.set(ct.c1.x, 0);
  result.set(ct.c2.x, 32);
  return result;
}
function serializeCiphertextFull(ct) {
  const result = new Uint8Array(128);
  result.set(ct.c1.x, 0);
  result.set(ct.c1.y, 32);
  result.set(ct.c2.x, 64);
  result.set(ct.c2.y, 96);
  return result;
}
var VoteOption = /* @__PURE__ */ ((VoteOption2) => {
  VoteOption2[VoteOption2["Yes"] = 0] = "Yes";
  VoteOption2[VoteOption2["No"] = 1] = "No";
  VoteOption2[VoteOption2["Abstain"] = 2] = "Abstain";
  return VoteOption2;
})(VoteOption || {});
function generateVoteRandomness() {
  const generateRandom = () => {
    const bytes = new Uint8Array(32);
    if (typeof globalThis.crypto !== "undefined") {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      const { randomBytes } = __require("crypto");
      const nodeBytes = randomBytes(32);
      bytes.set(nodeBytes);
    }
    return bytesToField(bytes);
  };
  return {
    yes: generateRandom(),
    no: generateRandom(),
    abstain: generateRandom()
  };
}
function encryptVote(votingPower, choice, electionPubkey, randomness) {
  const yesAmount = choice === 0 /* Yes */ ? votingPower : 0n;
  const noAmount = choice === 1 /* No */ ? votingPower : 0n;
  const abstainAmount = choice === 2 /* Abstain */ ? votingPower : 0n;
  return {
    yes: elgamalEncrypt(yesAmount, electionPubkey, randomness.yes),
    no: elgamalEncrypt(noAmount, electionPubkey, randomness.no),
    abstain: elgamalEncrypt(abstainAmount, electionPubkey, randomness.abstain)
  };
}
function serializeEncryptedVote(vote) {
  return [
    serializeCiphertext(vote.yes),
    serializeCiphertext(vote.no),
    serializeCiphertext(vote.abstain)
  ];
}
function computeDecryptionShare(ciphertext, secretKeyShare) {
  return scalarMul(ciphertext.c1, secretKeyShare);
}
function lagrangeCoefficient(indices, myIndex, fieldOrder) {
  let numerator = 1n;
  let denominator = 1n;
  for (const j of indices) {
    if (j !== myIndex) {
      numerator = numerator * BigInt(j) % fieldOrder;
      const diff = (BigInt(j) - BigInt(myIndex) + fieldOrder) % fieldOrder;
      denominator = denominator * diff % fieldOrder;
    }
  }
  const denomInv = modInverse(denominator, fieldOrder);
  return numerator * denomInv % fieldOrder;
}
function modInverse(a, m) {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }
  if (old_r > 1n) {
    throw new Error("Modular inverse does not exist");
  }
  return (old_s % m + m) % m;
}
function combineShares(ciphertext, shares, indices, fieldOrder) {
  let combinedShare = { x: new Uint8Array(32), y: new Uint8Array(32) };
  combinedShare.y[0] = 1;
  for (let i = 0; i < shares.length; i++) {
    const lambda = lagrangeCoefficient(indices, indices[i], fieldOrder);
    const weightedShare = scalarMul(shares[i], lambda);
    combinedShare = pointAdd(combinedShare, weightedShare);
  }
  const negCombined = negatePoint(combinedShare);
  return pointAdd(ciphertext.c2, negCombined);
}
function negatePoint(p) {
  const negX = new Uint8Array(32);
  const fieldModulus = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  const x = bytesToField(p.x);
  const negXVal = (fieldModulus - x) % fieldModulus;
  const negXBytes = fieldToBytes(negXVal);
  negX.set(negXBytes);
  return { x: negX, y: p.y };
}
function generateDleqProof(secretKey, publicKey, c1, decryptionShare) {
  const k = generateRandomScalar2();
  const A = scalarMul(GENERATOR, k);
  const B = scalarMul(c1, k);
  const challenge = poseidonHash([
    GENERATOR.x,
    GENERATOR.y,
    publicKey.x,
    publicKey.y,
    c1.x,
    c1.y,
    decryptionShare.x,
    decryptionShare.y,
    A.x,
    A.y,
    B.x,
    B.y
  ]);
  const c = bytesToField(challenge);
  const fieldOrder = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  const s = ((k - c * secretKey) % fieldOrder + fieldOrder) % fieldOrder;
  return {
    c: challenge,
    s: fieldToBytes(s)
  };
}
function verifyDleqProof(proof, publicKey, c1, decryptionShare) {
  const c = bytesToField(proof.c);
  const s = bytesToField(proof.s);
  const sG = scalarMul(GENERATOR, s);
  const cP = scalarMul(publicKey, c);
  const Aprime = pointAdd(sG, cP);
  const sC1 = scalarMul(c1, s);
  const cD = scalarMul(decryptionShare, c);
  const Bprime = pointAdd(sC1, cD);
  const challenge = poseidonHash([
    GENERATOR.x,
    GENERATOR.y,
    publicKey.x,
    publicKey.y,
    c1.x,
    c1.y,
    decryptionShare.x,
    decryptionShare.y,
    Aprime.x,
    Aprime.y,
    Bprime.x,
    Bprime.y
  ]);
  const expectedC = bytesToField(challenge);
  return c === expectedC;
}
function generateRandomScalar2() {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    const { randomBytes } = __require("crypto");
    const nodeBytes = randomBytes(32);
    bytes.set(nodeBytes);
  }
  const value = bytesToField(bytes);
  const fieldOrder = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  return value % fieldOrder;
}

// src/light.ts
import { PublicKey as PublicKey2 } from "@solana/web3.js";
import { deriveAddressSeedV2, deriveAddressV2, createRpc, bn } from "@lightprotocol/stateless.js";
var LightClient = class {
  constructor(config) {
    const baseUrl = config.network === "mainnet-beta" ? "https://mainnet.helius-rpc.com" : "https://devnet.helius-rpc.com";
    this.rpcUrl = `${baseUrl}/?api-key=${config.apiKey}`;
    this.lightRpc = createRpc(this.rpcUrl, this.rpcUrl, this.rpcUrl);
  }
  /**
   * Get compressed account by address
   *
   * Returns null if account doesn't exist (nullifier not spent)
   */
  async getCompressedAccount(address) {
    const addressBase58 = new PublicKey2(address).toBase58();
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getCompressedAccount",
        params: {
          address: addressBase58
        }
      })
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }
    return result.result?.value ?? null;
  }
  /**
   * Check if a nullifier has been spent
   *
   * Returns true if the nullifier compressed account exists
   */
  async isNullifierSpent(nullifier, programId, addressTree, pool) {
    const address = this.deriveNullifierAddress(nullifier, programId, addressTree, pool);
    const account = await this.getCompressedAccount(address);
    return account !== null;
  }
  /**
   * Batch check if multiple nullifiers have been spent
   *
   * Uses getMultipleCompressedAccounts for efficiency (single API call)
   * Returns a Set of addresses that exist (are spent)
   */
  async batchCheckNullifiers(addresses) {
    if (addresses.length === 0) {
      return /* @__PURE__ */ new Set();
    }
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getMultipleCompressedAccounts",
        params: {
          addresses
        }
      })
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }
    const spentSet = /* @__PURE__ */ new Set();
    const items = result.result?.value?.items ?? [];
    for (const item of items) {
      if (item && item.address) {
        spentSet.add(item.address);
      }
    }
    return spentSet;
  }
  /**
   * Get validity proof for creating a new compressed account
   *
   * This proves that the address doesn't exist yet (non-inclusion proof)
   *
   * Helius API expects:
   * - hashes: Array of existing account hashes to verify (optional)
   * - newAddressesWithTrees: Array of {address, tree} for non-inclusion proofs
   */
  async getValidityProof(params) {
    const newAddressesWithTrees = params.newAddresses.map((addr) => ({
      address: new PublicKey2(addr).toBase58(),
      tree: params.addressMerkleTree.toBase58()
    }));
    const response = await fetch(this.rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getValidityProof",
        params: {
          // Helius expects hashes (for inclusion) and newAddressesWithTrees (for non-inclusion)
          hashes: params.hashes ?? [],
          newAddressesWithTrees
        }
      })
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(`failed to get validity proof for hashes ${params.hashes?.join(", ") ?? "[]"}: ${result.error.message}`);
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
      params.addressMerkleTree,
      params.pool
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
   * Derive spend nullifier compressed account address
   *
   * Uses Light Protocol's Poseidon-based address derivation.
   * Must match the on-chain derivation in light_cpi/mod.rs:
   * Seeds: ["spend_nullifier", pool, nullifier]
   */
  deriveNullifierAddress(nullifier, programId, addressTree, pool) {
    const seeds = pool ? [
      Buffer.from("spend_nullifier"),
      pool.toBuffer(),
      Buffer.from(nullifier)
    ] : [
      Buffer.from("spend_nullifier"),
      Buffer.from(nullifier)
    ];
    const seed = deriveAddressSeedV2(seeds);
    const address = deriveAddressV2(seed, addressTree, programId);
    return address.toBytes();
  }
};
var DEVNET_LIGHT_TREES = {
  /** V2 batch address tree from Light SDK getBatchAddressTreeInfo() */
  addressTree: new PublicKey2("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx"),
  /** 5 parallel state tree sets for throughput */
  stateTrees: [
    {
      stateTree: new PublicKey2("bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU"),
      outputQueue: new PublicKey2("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto"),
      cpiContext: new PublicKey2("cpi15BoVPKgEPw5o8wc2T816GE7b378nMXnhH3Xbq4y")
    },
    {
      stateTree: new PublicKey2("bmt2UxoBxB9xWev4BkLvkGdapsz6sZGkzViPNph7VFi"),
      outputQueue: new PublicKey2("oq2UkeMsJLfXt2QHzim242SUi3nvjJs8Pn7Eac9H9vg"),
      cpiContext: new PublicKey2("cpi2yGapXUR3As5SjnHBAVvmApNiLsbeZpF3euWnW6B")
    },
    {
      stateTree: new PublicKey2("bmt3ccLd4bqSVZVeCJnH1F6C8jNygAhaDfxDwePyyGb"),
      outputQueue: new PublicKey2("oq3AxjekBWgo64gpauB6QtuZNesuv19xrhaC1ZM1THQ"),
      cpiContext: new PublicKey2("cpi3mbwMpSX8FAGMZVP85AwxqCaQMfEk9Em1v8QK9Rf")
    },
    {
      stateTree: new PublicKey2("bmt4d3p1a4YQgk9PeZv5s4DBUmbF5NxqYpk9HGjQsd8"),
      outputQueue: new PublicKey2("oq4ypwvVGzCUMoiKKHWh4S1SgZJ9vCvKpcz6RT6A8dq"),
      cpiContext: new PublicKey2("cpi4yyPDc4bCgHAnsenunGA8Y77j3XEDyjgfyCKgcoc")
    },
    {
      stateTree: new PublicKey2("bmt5yU97jC88YXTuSukYHa8Z5Bi2ZDUtmzfkDTA2mG2"),
      outputQueue: new PublicKey2("oq5oh5ZR3yGomuQgFduNDzjtGvVWfDRGLuDVjv9a96P"),
      cpiContext: new PublicKey2("cpi5ZTjdgYpZ1Xr7B1cMLLUE81oTtJbNNAyKary2nV6")
    }
  ]
};
function getRandomStateTreeSet() {
  const index = Math.floor(Math.random() * DEVNET_LIGHT_TREES.stateTrees.length);
  return DEVNET_LIGHT_TREES.stateTrees[index];
}
function getStateTreeSet(index) {
  if (index < 0 || index >= DEVNET_LIGHT_TREES.stateTrees.length) {
    throw new Error(`Invalid state tree index: ${index}. Must be 0-4.`);
  }
  return DEVNET_LIGHT_TREES.stateTrees[index];
}
var MAINNET_LIGHT_TREES = {
  addressTree: new PublicKey2("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx"),
  stateTrees: DEVNET_LIGHT_TREES.stateTrees
};
var LightCommitmentClient = class extends LightClient {
  constructor() {
    super(...arguments);
    // Cache for decrypted notes - keyed by viewing key hash
    this.noteCache = /* @__PURE__ */ new Map();
  }
  /**
   * Clear note cache (call when wallet changes)
   */
  clearCache() {
    this.noteCache.clear();
  }
  /**
   * Get cache key from viewing key
   */
  getCacheKey(viewingKey) {
    return viewingKey.toString(16).slice(0, 16);
  }
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
   * Get merkle proof for a commitment using account hash
   *
   * This is the preferred method - uses the hash stored during scanning.
   * Uses Light SDK for proper API handling.
   */
  async getMerkleProofByHash(accountHash) {
    const hashBytes = new PublicKey2(accountHash).toBytes();
    const hashBn = bn(hashBytes);
    const proofResult = await this.lightRpc.getCompressedAccountProof(hashBn);
    const pathElements = proofResult.merkleProof.map((p) => {
      if (p.toArray) {
        return new Uint8Array(p.toArray("be", 32));
      }
      return new Uint8Array(p);
    });
    const pathIndices = this.leafIndexToPathIndices(proofResult.leafIndex, pathElements.length);
    const rootBytes = proofResult.root.toArray ? new Uint8Array(proofResult.root.toArray("be", 32)) : new Uint8Array(proofResult.root);
    return {
      root: rootBytes,
      pathElements,
      pathIndices,
      leafIndex: proofResult.leafIndex
    };
  }
  /**
   * Get merkle proof for a commitment (legacy - derives address)
   *
   * Prefer getMerkleProofByHash if you have the account hash from scanning.
   */
  async getCommitmentMerkleProof(pool, commitment, programId, addressTree, _stateMerkleTree) {
    const address = this.deriveCommitmentAddress(pool, commitment, programId, addressTree);
    const addressBase58 = new PublicKey2(address).toBase58();
    const account = await this.getCompressedAccount(address);
    if (!account) {
      throw new Error(`Commitment account not found at address: ${addressBase58}`);
    }
    return this.getMerkleProofByHash(account.hash);
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
   *
   * Uses Light Protocol's address derivation (same as nullifier).
   * Seeds: ["commitment", pool, commitment_hash]
   */
  deriveCommitmentAddress(pool, commitment, programId, addressTree) {
    const seeds = [
      Buffer.from("commitment"),
      pool.toBuffer(),
      Buffer.from(commitment)
    ];
    const seed = deriveAddressSeedV2(seeds);
    const address = deriveAddressV2(seed, addressTree, programId);
    return address.toBytes();
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
  // =========================================================================
  // Note Scanner
  // =========================================================================
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
  async scanNotesWithStatus(viewingKey, nullifierKey, programId, pool) {
    await initPoseidon();
    const notes = await this.scanNotes(viewingKey, programId, pool);
    if (notes.length === 0) {
      return [];
    }
    const addressTree = DEVNET_LIGHT_TREES.addressTree;
    const nullifierData = [];
    for (const note of notes) {
      let effectiveNullifierKey = nullifierKey;
      if (note.stealthEphemeralPubkey) {
        const stealthSpendingKey = deriveStealthPrivateKey(viewingKey, note.stealthEphemeralPubkey);
        effectiveNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
      }
      const nullifier = deriveSpendingNullifier(
        effectiveNullifierKey,
        note.commitment,
        note.leafIndex
      );
      const address = this.deriveNullifierAddress(nullifier, programId, addressTree, note.pool);
      const addressStr = new PublicKey2(address).toBase58();
      nullifierData.push({ note, nullifier, address });
    }
    const addresses = nullifierData.map((d) => new PublicKey2(d.address).toBase58());
    const spentSet = await this.batchCheckNullifiers(addresses);
    return nullifierData.map(({ note, nullifier, address }) => {
      const addressStr = new PublicKey2(address).toBase58();
      const isSpent = spentSet.has(addressStr);
      return {
        ...note,
        spent: isSpent,
        nullifier
      };
    });
  }
  /**
   * Get only unspent notes (available balance)
   */
  async getUnspentNotes(viewingKey, nullifierKey, programId, pool) {
    const notes = await this.scanNotesWithStatus(viewingKey, nullifierKey, programId, pool);
    return notes.filter((n) => !n.spent);
  }
  /**
   * Calculate total balance from unspent notes
   */
  async getBalance(viewingKey, nullifierKey, programId, pool) {
    const unspent = await this.getUnspentNotes(viewingKey, nullifierKey, programId, pool);
    return unspent.reduce((sum, note) => sum + note.amount, 0n);
  }
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
  async scanNotes(viewingKey, programId, pool) {
    const accounts = await this.getCommitmentAccounts(programId, pool);
    const cacheKey = this.getCacheKey(viewingKey);
    if (!this.noteCache.has(cacheKey)) {
      this.noteCache.set(cacheKey, /* @__PURE__ */ new Map());
    }
    const cache = this.noteCache.get(cacheKey);
    const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513e3;
    const decryptedNotes = [];
    for (const account of accounts) {
      if (!account.data?.data) {
        continue;
      }
      if (cache.has(account.hash)) {
        const cachedNote = cache.get(account.hash);
        if (cachedNote) {
          decryptedNotes.push(cachedNote);
        }
        continue;
      }
      const disc = account.data.discriminator;
      if (!disc || Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) > 1e3) {
        cache.set(account.hash, null);
        continue;
      }
      const dataLen = atob(account.data.data).length;
      if (dataLen < 346) {
        cache.set(account.hash, null);
        continue;
      }
      try {
        const parsed = this.parseCommitmentAccountData(account.data.data);
        if (!parsed) {
          cache.set(account.hash, null);
          continue;
        }
        const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
        if (!encryptedNote) {
          cache.set(account.hash, null);
          continue;
        }
        let decryptionKey;
        if (parsed.stealthEphemeralPubkey) {
          decryptionKey = deriveStealthPrivateKey(viewingKey, parsed.stealthEphemeralPubkey);
        } else {
          decryptionKey = viewingKey;
        }
        const note = tryDecryptNote(encryptedNote, decryptionKey);
        if (note) {
          const recomputed = computeCommitment(note);
          const matches = Buffer.from(recomputed).toString("hex") === Buffer.from(parsed.commitment).toString("hex");
          if (!matches) {
            cache.set(account.hash, null);
            continue;
          }
        }
        if (!note) {
          cache.set(account.hash, null);
          continue;
        }
        if (note.amount === 0n) {
          cache.set(account.hash, null);
          continue;
        }
        const decryptedNote = {
          ...note,
          commitment: parsed.commitment,
          leafIndex: parsed.leafIndex,
          pool: new PublicKey2(parsed.pool),
          accountHash: account.hash,
          // Store for merkle proof fetching
          stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? void 0
          // Store for stealth key derivation
        };
        cache.set(account.hash, decryptedNote);
        decryptedNotes.push(decryptedNote);
      } catch (err) {
        cache.set(account.hash, null);
        continue;
      }
    }
    return decryptedNotes;
  }
  /**
   * Get all commitment compressed accounts
   *
   * @param programId - CloakCraft program ID
   * @param poolPda - Pool PDA to filter by (optional). Note: pass the pool PDA, not the token mint.
   */
  async getCommitmentAccounts(programId, poolPda) {
    const response = await fetch(this["rpcUrl"], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getCompressedAccountsByOwner",
        params: {
          owner: programId.toBase58(),
          // Pool is first 32 bytes of data (Helius provides discriminator separately)
          filters: poolPda ? [
            { memcmp: { offset: 0, bytes: poolPda.toBase58() } }
          ] : void 0
        }
      })
    });
    const result = await response.json();
    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }
    return result.result?.value?.items ?? result.result?.items ?? [];
  }
  /**
   * Parse commitment account data from base64
   *
   * Note: Helius returns discriminator separately, so data doesn't include it
   * Layout (after discriminator) - matches CommitmentAccount struct:
   * - pool: 32 bytes
   * - commitment: 32 bytes
   * - leaf_index: 8 bytes (u64)
   * - stealth_ephemeral_pubkey: 64 bytes (X + Y coordinates)
   * - encrypted_note: 200 bytes (FIXED SIZE array)
   * - encrypted_note_len: 2 bytes (u16) - actual length of data in encrypted_note
   * - created_at: 8 bytes (i64)
   *
   * Total: 32 + 32 + 8 + 64 + 200 + 2 + 8 = 346 bytes
   */
  parseCommitmentAccountData(dataBase64) {
    try {
      const binaryString = atob(dataBase64);
      const data = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        data[i] = binaryString.charCodeAt(i);
      }
      if (data.length < 346) {
        return null;
      }
      const pool = data.slice(0, 32);
      const commitment = data.slice(32, 64);
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      const leafIndex = Number(view.getBigUint64(64, true));
      const ephemeralX = data.slice(72, 104);
      const ephemeralY = data.slice(104, 136);
      const isNonZero = ephemeralX.some((b) => b !== 0) || ephemeralY.some((b) => b !== 0);
      const stealthEphemeralPubkey = isNonZero ? { x: new Uint8Array(ephemeralX), y: new Uint8Array(ephemeralY) } : null;
      const encryptedNoteLen = view.getUint16(336, true);
      if (encryptedNoteLen > 200) {
        return null;
      }
      const encryptedNote = data.slice(136, 136 + encryptedNoteLen);
      return {
        pool: new Uint8Array(pool),
        commitment: new Uint8Array(commitment),
        leafIndex,
        stealthEphemeralPubkey,
        encryptedNote: new Uint8Array(encryptedNote)
      };
    } catch (err) {
      return null;
    }
  }
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
  deserializeEncryptedNote(data) {
    try {
      if (data.length < 32 + 32 + 4 + 16) {
        return null;
      }
      let offset = 0;
      const ephemeralX = data.slice(offset, offset + 32);
      offset += 32;
      const ephemeralY = data.slice(offset, offset + 32);
      offset += 32;
      const ciphertextLen = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true);
      offset += 4;
      const ciphertext = data.slice(offset, offset + ciphertextLen);
      offset += ciphertextLen;
      const tag = data.slice(offset, offset + 16);
      const ephemeralPubkey = {
        x: new Uint8Array(ephemeralX),
        y: new Uint8Array(ephemeralY)
      };
      return {
        ephemeralPubkey,
        ciphertext: new Uint8Array(ciphertext),
        tag: new Uint8Array(tag)
      };
    } catch {
      return null;
    }
  }
};

// src/instructions/transact.ts
import {
  PublicKey as PublicKey3,
  ComputeBudgetProgram
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction
} from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
async function buildTransactWithProgram(program, params, rpcUrl, circuitId = CIRCUIT_IDS.TRANSFER_1X2) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const [vkPda] = deriveVerificationKeyPda(circuitId, programId);
  let nullifier;
  let inputCommitment;
  if (params.nullifier && params.inputCommitment) {
    nullifier = params.nullifier;
    inputCommitment = params.inputCommitment;
  } else {
    const nullifierKey = deriveNullifierKey(
      new Uint8Array(new BigUint64Array([params.input.spendingKey]).buffer)
    );
    inputCommitment = computeCommitment({
      stealthPubX: params.input.stealthPubX,
      tokenMint: params.tokenMint,
      amount: params.input.amount,
      randomness: params.input.randomness
    });
    nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, params.input.leafIndex);
  }
  let outputCommitments = [];
  const encryptedNotes = [];
  const outputRandomness = [];
  const stealthEphemeralPubkeys = [];
  const outputAmounts = [];
  if (params.outputCommitments && params.outputCommitments.length === params.outputs.length) {
    outputCommitments = params.outputCommitments;
  }
  for (let i = 0; i < params.outputs.length; i++) {
    const output = params.outputs[i];
    outputAmounts.push(output.amount);
    const randomness = output.randomness ?? generateRandomness();
    outputRandomness.push(randomness);
    const note = {
      stealthPubX: output.recipientPubkey.x,
      tokenMint: params.tokenMint,
      amount: output.amount,
      randomness
    };
    if (!outputCommitments[i]) {
      outputCommitments[i] = output.commitment ?? computeCommitment(note);
    }
    const encrypted = encryptNote(note, output.recipientPubkey);
    encryptedNotes.push(Buffer.from(serializeEncryptedNote(encrypted)));
    if (output.ephemeralPubkey) {
      const ephemeralBytes = new Uint8Array(64);
      ephemeralBytes.set(output.ephemeralPubkey.x, 0);
      ephemeralBytes.set(output.ephemeralPubkey.y, 32);
      stealthEphemeralPubkeys.push(ephemeralBytes);
    } else {
      stealthEphemeralPubkeys.push(new Uint8Array(64));
    }
  }
  if (circuitId === CIRCUIT_IDS.TRANSFER_1X2 && outputCommitments.length === 1) {
    const dummyCommitment = computeCommitment({
      stealthPubX: new Uint8Array(32),
      // zeros
      tokenMint: params.tokenMint,
      amount: 0n,
      randomness: new Uint8Array(32)
      // zeros
    });
    outputCommitments.push(dummyCommitment);
    outputRandomness.push(new Uint8Array(32));
    stealthEphemeralPubkeys.push(new Uint8Array(64));
    encryptedNotes.push(Buffer.alloc(0));
    outputAmounts.push(0n);
  }
  const { generateOperationId: generateOperationId2, derivePendingOperationPda: derivePendingOperationPda2 } = await import("./swap-MYDEZ2QE.mjs");
  const operationId = generateOperationId2(
    nullifier,
    outputCommitments[0],
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  console.log(`[Transact Phase 1] Generated operation ID: ${Buffer.from(operationId).toString("hex").slice(0, 16)}...`);
  console.log(`[Transact Phase 1] Nullifier: ${Buffer.from(nullifier).toString("hex").slice(0, 16)}...`);
  const pendingCommitments = [];
  for (let i = 0; i < outputCommitments.length; i++) {
    pendingCommitments.push({
      pool: poolPda,
      commitment: outputCommitments[i],
      stealthEphemeralPubkey: stealthEphemeralPubkeys[i],
      encryptedNote: encryptedNotes[i]
    });
  }
  if (!params.input.accountHash) {
    throw new Error("Input note missing accountHash. Ensure notes are from scanNotes() which includes accountHash.");
  }
  console.log("[Transact] Input commitment:", Buffer.from(inputCommitment).toString("hex").slice(0, 16) + "...");
  console.log("[Transact] Account hash from scanner:", params.input.accountHash);
  console.log("[Transact] Pool:", poolPda.toBase58());
  console.log("[Transact] Fetching commitment inclusion proof...");
  const commitmentProof = await lightProtocol.getInclusionProofByHash(params.input.accountHash);
  console.log("[Transact] Commitment proof:", JSON.stringify(commitmentProof, null, 2));
  console.log("[Transact] Fetching nullifier non-inclusion proof...");
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const commitmentTree = new PublicKey3(commitmentProof.treeInfo.tree);
  const commitmentQueue = new PublicKey3(commitmentProof.treeInfo.queue);
  const commitmentCpiContext = commitmentProof.treeInfo.cpiContext ? new PublicKey3(commitmentProof.treeInfo.cpiContext) : null;
  const { SystemAccountMetaConfig, PackedAccounts } = await import("@lightprotocol/stateless.js");
  const { DEVNET_V2_TREES: DEVNET_V2_TREES2 } = await import("./constants-2I4ET3IX.mjs");
  const systemConfig = SystemAccountMetaConfig.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES2.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES2.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
  const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);
  if (commitmentCpiContext) {
    packedAccounts.insertOrGet(commitmentCpiContext);
    console.log("[Transact] Added CPI context from proof:", commitmentCpiContext.toBase58());
  }
  console.log("[Transact] STATE tree from proof:", commitmentTree.toBase58(), "index:", commitmentStateTreeIndex);
  console.log("[Transact] ADDRESS tree (current):", addressTree.toBase58(), "index:", addressTreeIndex);
  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();
  const lightParams = {
    commitmentAccountHash: Array.from(new PublicKey3(params.input.accountHash).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentStateTreeIndex,
      // STATE tree from proof (for data/merkle verification)
      queuePubkeyIndex: commitmentQueueIndex,
      // Queue from proof
      leafIndex: commitmentProof.leafIndex,
      rootIndex: commitmentProof.rootIndex
    },
    // SECURITY: Convert commitment inclusion proof (Groth16 SNARK)
    commitmentInclusionProof: LightProtocol.convertCompressedProof(commitmentProof),
    // VERIFY existing commitment: Address tree for CPI address derivation
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      // CURRENT address tree (for CPI address derivation)
      addressQueuePubkeyIndex: addressTreeIndex,
      // CURRENT address tree queue
      rootIndex: nullifierProof.rootIndices[0] ?? 0
      // Current address tree root
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierProof),
    // CREATE new nullifier: Use current address tree
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      // CURRENT address tree
      addressQueuePubkeyIndex: addressTreeIndex,
      // CURRENT address tree queue
      rootIndex: nullifierProof.rootIndices[0] ?? 0
      // Current root
    },
    outputTreeIndex
  };
  let unshieldRecipientAta = null;
  if (params.unshieldRecipient && params.unshieldAmount && params.unshieldAmount > 0n) {
    unshieldRecipientAta = params.unshieldRecipient;
  }
  const outputRecipients = params.outputs.map((output) => Array.from(output.recipientPubkey.x));
  const unshieldAmountForInstruction = params.unshieldAmount ?? 0n;
  const feeAmountForInstruction = params.feeAmount ?? 0n;
  console.log("[Phase 0] unshield_amount for instruction:", unshieldAmountForInstruction.toString());
  console.log("[Phase 0] fee_amount for instruction:", feeAmountForInstruction.toString());
  console.log("[Phase 0] params.unshieldAmount:", params.unshieldAmount);
  console.log("[Phase 0] params.feeAmount:", params.feeAmount);
  console.log("[Phase 0] Public inputs for on-chain verification:");
  console.log("  [0] merkle_root:", Buffer.from(params.merkleRoot).toString("hex").slice(0, 32) + "...");
  console.log("  [1] nullifier:", Buffer.from(nullifier).toString("hex").slice(0, 32) + "...");
  for (let i = 0; i < outputCommitments.length; i++) {
    console.log(`  [${2 + i}] out_commitment_${i + 1}:`, Buffer.from(outputCommitments[i]).toString("hex").slice(0, 32) + "...");
  }
  console.log(`  [${2 + outputCommitments.length}] token_mint:`, params.tokenMint.toBase58());
  console.log(`  [${3 + outputCommitments.length}] unshield_amount:`, unshieldAmountForInstruction.toString());
  console.log(`  [${4 + outputCommitments.length}] fee_amount:`, feeAmountForInstruction.toString());
  console.log("[Phase 0] === FULL commitment bytes for on-chain ===");
  for (let i = 0; i < outputCommitments.length; i++) {
    console.log(`  out_commitment_${i + 1} (full):`, Buffer.from(outputCommitments[i]).toString("hex"));
  }
  const phase0Tx = await program.methods.createPendingWithProof(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(inputCommitment),
    Array.from(nullifier),
    outputCommitments.map((c) => Array.from(c)),
    outputRecipients,
    outputAmounts.map((a) => new BN(a.toString())),
    outputRandomness.map((r) => Array.from(r)),
    stealthEphemeralPubkeys.map((e) => Array.from(e)),
    new BN(unshieldAmountForInstruction.toString()),
    new BN(feeAmountForInstruction.toString())
  ).accountsStrict({
    pool: poolPda,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: new PublicKey3("11111111111111111111111111111111")
  }).preInstructions([
    ComputeBudgetProgram.setComputeUnitLimit({ units: 45e4 }),
    // Reduced: smaller PDA (192 bytes saved) = less serialization
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  const phase1Tx = await program.methods.verifyCommitmentExists(
    Array.from(operationId),
    0,
    // commitment_index (always 0 for single-input transfer)
    {
      commitmentAccountHash: lightParams.commitmentAccountHash,
      commitmentMerkleContext: lightParams.commitmentMerkleContext,
      commitmentInclusionProof: lightParams.commitmentInclusionProof,
      commitmentAddressTreeInfo: lightParams.commitmentAddressTreeInfo
    }
  ).accountsStrict({
    pool: poolPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    // Light Protocol inclusion proof (simple CPI)
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  const phase2Tx = await program.methods.createNullifierAndPending(
    Array.from(operationId),
    0,
    // nullifier_index (always 0 for single-input transfer)
    {
      proof: lightParams.nullifierNonInclusionProof,
      addressTreeInfo: lightParams.nullifierAddressTreeInfo,
      outputTreeIndex: lightParams.outputTreeIndex
    }
  ).accountsStrict({
    pool: poolPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    // Light Protocol non-inclusion proof (simple CPI)
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  let phase3Tx = null;
  const needsPhase3 = params.unshieldAmount && params.unshieldAmount > 0n || params.feeAmount && params.feeAmount > 0n;
  if (needsPhase3) {
    console.log("[Phase 3] Building with:");
    console.log("  pool:", poolPda.toBase58());
    console.log("  tokenVault:", vaultPda.toBase58());
    console.log("  pendingOperation:", pendingOpPda.toBase58());
    console.log("  unshieldRecipient:", unshieldRecipientAta?.toBase58() ?? "null");
    console.log("  protocolConfig:", params.protocolConfig?.toBase58() ?? "null");
    console.log("  treasuryTokenAccount:", params.treasuryTokenAccount?.toBase58() ?? "null");
    console.log("  relayer:", params.relayer.toBase58());
    console.log("  feeAmount:", feeAmountForInstruction.toString());
    console.log("  unshieldAmount:", unshieldAmountForInstruction.toString());
    const phase3Accounts = {
      pool: poolPda,
      tokenVault: vaultPda,
      pendingOperation: pendingOpPda,
      protocolConfig: params.protocolConfig ?? null,
      treasuryTokenAccount: params.treasuryTokenAccount ?? null,
      unshieldRecipient: unshieldRecipientAta ?? null,
      relayer: params.relayer,
      tokenProgram: TOKEN_PROGRAM_ID
    };
    const phase3PreInstructions = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 15e4 }),
      // Increased for fee transfer
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
    ];
    if (params.treasuryWallet && params.treasuryTokenAccount && params.feeAmount && params.feeAmount > 0n) {
      console.log("[Phase 3] Adding create treasury ATA instruction (idempotent)");
      phase3PreInstructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          params.relayer,
          // payer
          params.treasuryTokenAccount,
          // associated token account
          params.treasuryWallet,
          // owner
          params.tokenMint,
          // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    phase3Tx = await program.methods.processUnshield(
      Array.from(operationId),
      new BN(unshieldAmountForInstruction.toString())
      // unshield_amount parameter
    ).accounts(phase3Accounts).preInstructions(phase3PreInstructions);
    console.log("[Phase 3] Transaction builder created");
  }
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    result: {
      nullifier,
      outputCommitments,
      encryptedNotes,
      outputRandomness,
      stealthEphemeralPubkeys,
      outputAmounts
    },
    operationId,
    pendingCommitments
  };
}
function computeCircuitInputs(input, outputs, tokenMint, unshieldAmount = 0n) {
  const inputCommitment = computeCommitment({
    stealthPubX: input.stealthPubX,
    tokenMint,
    amount: input.amount,
    randomness: input.randomness
  });
  const nullifierKey = deriveNullifierKey(
    new Uint8Array(new BigUint64Array([input.spendingKey]).buffer)
  );
  const nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, input.leafIndex);
  const outputCommitments = outputs.map((output) => {
    const randomness = generateRandomness();
    return computeCommitment({
      stealthPubX: output.recipientPubkey.x,
      tokenMint,
      amount: output.amount,
      randomness
    });
  });
  return { inputCommitment, nullifier, outputCommitments };
}
async function buildConsolidationWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const circuitId = "consolidate_3x1";
  if (params.inputs.length < 2 || params.inputs.length > 3) {
    throw new Error("Consolidation requires 2-3 input notes");
  }
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vkPda] = deriveVerificationKeyPda(circuitId, programId);
  const { generateOperationId: generateOperationId2, derivePendingOperationPda: derivePendingOperationPda2 } = await import("./swap-MYDEZ2QE.mjs");
  const operationId = generateOperationId2(
    params.nullifiers[0],
    params.outputCommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  console.log(`[Consolidation Phase 0] Generated operation ID: ${Buffer.from(operationId).toString("hex").slice(0, 16)}...`);
  console.log(`[Consolidation Phase 0] Num inputs: ${params.inputs.length}`);
  console.log(`[Consolidation Phase 0] Nullifiers: ${params.nullifiers.length}`);
  const stealthEphemeralPubkey = new Uint8Array(64);
  stealthEphemeralPubkey.set(params.outputRecipient.ephemeralPubkey.x, 0);
  stealthEphemeralPubkey.set(params.outputRecipient.ephemeralPubkey.y, 32);
  const outputNote = {
    stealthPubX: params.outputRecipient.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.outputAmount,
    randomness: params.outputRandomness
  };
  const encrypted = encryptNote(outputNote, params.outputRecipient.stealthPubkey);
  const encryptedNote = Buffer.from(serializeEncryptedNote(encrypted));
  const pendingCommitments = [{
    pool: poolPda,
    commitment: params.outputCommitment,
    stealthEphemeralPubkey,
    encryptedNote: new Uint8Array(encryptedNote)
  }];
  const { SystemAccountMetaConfig, PackedAccounts } = await import("@lightprotocol/stateless.js");
  const { DEVNET_V2_TREES: DEVNET_V2_TREES2 } = await import("./constants-2I4ET3IX.mjs");
  const systemConfig = SystemAccountMetaConfig.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES2.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES2.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const inputProofs = await Promise.all(
    params.inputs.map(async (input, i) => {
      console.log(`[Consolidation] Fetching proof for input ${i}: ${input.accountHash}`);
      const commitmentProof = await lightProtocol.getInclusionProofByHash(input.accountHash);
      const commitmentTree = new PublicKey3(commitmentProof.treeInfo.tree);
      const commitmentQueue = new PublicKey3(commitmentProof.treeInfo.queue);
      const treeIndex = packedAccounts.insertOrGet(commitmentTree);
      const queueIndex = packedAccounts.insertOrGet(commitmentQueue);
      if (commitmentProof.treeInfo.cpiContext) {
        packedAccounts.insertOrGet(new PublicKey3(commitmentProof.treeInfo.cpiContext));
      }
      return {
        commitmentProof,
        treeIndex,
        queueIndex
      };
    })
  );
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, params.nullifiers[0]);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();
  const phase0Tx = await program.methods.createPendingWithProofConsolidation(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    params.inputs.length,
    // num_inputs
    params.inputs.map((i) => Array.from(i.commitment)),
    // input_commitments
    params.nullifiers.map((n) => Array.from(n)),
    // nullifiers
    Array.from(params.outputCommitment),
    // out_commitment
    Array.from(params.outputRecipient.stealthPubkey.x),
    // output_recipient
    new BN(params.outputAmount.toString()),
    // output_amount
    Array.from(params.outputRandomness),
    // output_randomness
    Array.from(stealthEphemeralPubkey)
    // stealth_ephemeral_pubkey
  ).accountsStrict({
    pool: poolPda,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: new PublicKey3("11111111111111111111111111111111")
  }).preInstructions([
    ComputeBudgetProgram.setComputeUnitLimit({ units: 45e4 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  const phase1Txs = await Promise.all(
    params.inputs.map(async (input, i) => {
      const proof = inputProofs[i];
      const lightParams = {
        commitmentAccountHash: Array.from(new PublicKey3(input.accountHash).toBytes()),
        commitmentMerkleContext: {
          merkleTreePubkeyIndex: proof.treeIndex,
          queuePubkeyIndex: proof.queueIndex,
          leafIndex: proof.commitmentProof.leafIndex,
          rootIndex: proof.commitmentProof.rootIndex
        },
        commitmentInclusionProof: LightProtocol.convertCompressedProof(proof.commitmentProof),
        commitmentAddressTreeInfo: {
          addressMerkleTreePubkeyIndex: addressTreeIndex,
          addressQueuePubkeyIndex: addressTreeIndex,
          rootIndex: nullifierProof.rootIndices[0] ?? 0
        }
      };
      return program.methods.verifyCommitmentExists(
        Array.from(operationId),
        i,
        // commitment_index
        lightParams
      ).accountsStrict({
        pool: poolPda,
        pendingOperation: pendingOpPda,
        relayer: params.relayer
      }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
        pubkey: acc.pubkey,
        isSigner: acc.isSigner,
        isWritable: acc.isWritable
      }))).preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
      ]);
    })
  );
  const phase2Txs = await Promise.all(
    params.inputs.map(async (input, i) => {
      const nullifierAddr = lightProtocol.deriveNullifierAddress(poolPda, params.nullifiers[i]);
      const nullProof = await lightProtocol.getValidityProof([nullifierAddr]);
      const lightParams = {
        proof: LightProtocol.convertCompressedProof(nullProof),
        addressTreeInfo: {
          addressMerkleTreePubkeyIndex: addressTreeIndex,
          addressQueuePubkeyIndex: addressTreeIndex,
          rootIndex: nullProof.rootIndices[0] ?? 0
        },
        outputTreeIndex
      };
      return program.methods.createNullifierAndPending(
        Array.from(operationId),
        i,
        // nullifier_index
        lightParams
      ).accountsStrict({
        pool: poolPda,
        pendingOperation: pendingOpPda,
        relayer: params.relayer
      }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
        pubkey: acc.pubkey,
        isSigner: acc.isSigner,
        isWritable: acc.isWritable
      }))).preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
      ]);
    })
  );
  console.log(`[Consolidation] Built Phase 0 + ${phase1Txs.length} Phase 1 + ${phase2Txs.length} Phase 2 transactions`);
  return {
    phase0Tx,
    phase1Txs,
    phase2Txs,
    operationId,
    pendingCommitments
  };
}

// src/instructions/store-commitment.ts
import {
  ComputeBudgetProgram as ComputeBudgetProgram2
} from "@solana/web3.js";
import { BN as BN2 } from "@coral-xyz/anchor";
async function buildStoreCommitmentWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const commitmentAddress = lightProtocol.deriveCommitmentAddress(poolPda, params.commitment);
  const validityProof = await lightProtocol.getValidityProof([commitmentAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const convertedProof = LightProtocol.convertCompressedProof(validityProof);
  const addressTreeInfo = {
    addressMerkleTreePubkeyIndex: addressTreeIndex,
    addressQueuePubkeyIndex: addressTreeIndex,
    rootIndex: validityProof.rootIndices[0] ?? 0
  };
  const tx = await program.methods.storeCommitment({
    commitment: Array.from(params.commitment),
    leafIndex: new BN2(params.leafIndex.toString()),
    stealthEphemeralPubkey: Array.from(params.stealthEphemeralPubkey),
    encryptedNote: Buffer.from(params.encryptedNote),
    // Buffer, not number[]
    validityProof: convertedProof,
    addressTreeInfo,
    outputTreeIndex
  }).accountsStrict({
    pool: poolPda,
    relayer: params.relayer
  }).remainingAccounts(remainingAccounts).preInstructions([
    ComputeBudgetProgram2.setComputeUnitLimit({ units: 6e5 }),
    ComputeBudgetProgram2.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return tx;
}
async function storeCommitments(program, tokenMint, commitments, relayer, rpcUrl) {
  const signatures = [];
  for (const commitment of commitments) {
    const tx = await buildStoreCommitmentWithProgram(
      program,
      {
        tokenMint,
        commitment: commitment.commitment,
        leafIndex: commitment.leafIndex,
        stealthEphemeralPubkey: commitment.stealthEphemeralPubkey,
        encryptedNote: commitment.encryptedNote,
        relayer
      },
      rpcUrl
    );
    const sig = await tx.rpc();
    signatures.push(sig);
  }
  return signatures;
}

// src/instructions/initialize.ts
import {
  SystemProgram as SystemProgram2
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID as TOKEN_PROGRAM_ID2 } from "@solana/spl-token";
async function buildInitializePoolWithProgram(program, params) {
  const programId = program.programId;
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const tx = await program.methods.initializePool().accounts({
    pool: poolPda,
    tokenVault: vaultPda,
    tokenMint: params.tokenMint,
    authority: params.authority,
    payer: params.payer,
    tokenProgram: TOKEN_PROGRAM_ID2,
    systemProgram: SystemProgram2.programId
  });
  return tx;
}
async function buildInitializeCommitmentCounterWithProgram(program, params) {
  const programId = program.programId;
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);
  const tx = await program.methods.initializeCommitmentCounter().accounts({
    pool: poolPda,
    commitmentCounter: counterPda,
    authority: params.authority,
    payer: params.payer,
    systemProgram: SystemProgram2.programId
  });
  return tx;
}
async function initializePool(program, tokenMint, authority, payer) {
  const poolTxBuilder = await buildInitializePoolWithProgram(program, {
    tokenMint,
    authority,
    payer
  });
  let poolTx;
  try {
    poolTx = await poolTxBuilder.rpc();
  } catch (e) {
    if (e.message?.includes("already in use")) {
      poolTx = "already_exists";
    } else {
      throw e;
    }
  }
  const counterTxBuilder = await buildInitializeCommitmentCounterWithProgram(program, {
    tokenMint,
    authority,
    payer
  });
  let counterTx;
  try {
    counterTx = await counterTxBuilder.rpc();
  } catch (e) {
    if (e.message?.includes("already in use")) {
      counterTx = "already_exists";
    } else {
      throw e;
    }
  }
  return { poolTx, counterTx };
}

// src/instructions/market.ts
import {
  PublicKey as PublicKey6,
  ComputeBudgetProgram as ComputeBudgetProgram3
} from "@solana/web3.js";
function deriveOrderPda(orderId, programId) {
  return PublicKey6.findProgramAddressSync(
    [Buffer.from("order"), Buffer.from(orderId)],
    programId
  );
}
async function buildFillOrderWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [orderPda] = deriveOrderPda(params.orderId, programId);
  const [makerCounterPda] = deriveCommitmentCounterPda(params.makerPool, programId);
  const [takerCounterPda] = deriveCommitmentCounterPda(params.takerPool, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.ORDER_FILL, programId);
  const makerOutRandomness = generateRandomness();
  const takerOutRandomness = generateRandomness();
  const makerNote = {
    stealthPubX: params.makerOutputRecipient.stealthPubkey.x,
    tokenMint: params.takerPool,
    // Maker receives taker's tokens
    amount: params.orderTerms.requestAmount,
    randomness: makerOutRandomness
  };
  const takerNote = {
    stealthPubX: params.takerOutputRecipient.stealthPubkey.x,
    tokenMint: params.makerPool,
    // Taker receives maker's tokens
    amount: params.orderTerms.offerAmount,
    randomness: takerOutRandomness
  };
  const encryptedMakerNote = encryptNote(makerNote, params.makerOutputRecipient.stealthPubkey);
  const encryptedTakerNote = encryptNote(takerNote, params.takerOutputRecipient.stealthPubkey);
  const addresses = [
    lightProtocol.deriveNullifierAddress(params.makerPool, params.escrowNullifier),
    lightProtocol.deriveNullifierAddress(params.takerPool, params.takerNullifier),
    lightProtocol.deriveCommitmentAddress(params.takerPool, params.makerOutCommitment),
    lightProtocol.deriveCommitmentAddress(params.makerPool, params.takerOutCommitment)
  ];
  const validityProof = await lightProtocol.getValidityProof(addresses);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const convertedProof = LightProtocol.convertCompressedProof(validityProof);
  const baseAddressTreeInfo = {
    addressMerkleTreePubkeyIndex: addressTreeIndex,
    addressQueuePubkeyIndex: addressTreeIndex,
    rootIndex: validityProof.rootIndices[0] ?? 0
  };
  const lightParams = {
    escrowNullifierProof: convertedProof,
    escrowNullifierAddressTreeInfo: baseAddressTreeInfo,
    takerNullifierProof: convertedProof,
    takerNullifierAddressTreeInfo: baseAddressTreeInfo,
    makerCommitmentProof: convertedProof,
    makerCommitmentAddressTreeInfo: baseAddressTreeInfo,
    takerCommitmentProof: convertedProof,
    takerCommitmentAddressTreeInfo: baseAddressTreeInfo,
    outputTreeIndex
  };
  const tx = await program.methods.fillOrder(
    Array.from(params.makerProof),
    Array.from(params.takerProof),
    Array.from(params.escrowNullifier),
    Array.from(params.takerNullifier),
    Array.from(params.orderId),
    Array.from(params.makerOutCommitment),
    Array.from(params.takerOutCommitment),
    [
      Buffer.from(serializeEncryptedNote(encryptedMakerNote)),
      Buffer.from(serializeEncryptedNote(encryptedTakerNote))
    ],
    lightParams
  ).accountsStrict({
    makerPool: params.makerPool,
    makerCommitmentCounter: makerCounterPda,
    takerPool: params.takerPool,
    takerCommitmentCounter: takerCounterPda,
    order: orderPda,
    verificationKey: vkPda,
    relayer: params.relayer
  }).remainingAccounts(remainingAccounts).preInstructions([
    ComputeBudgetProgram3.setComputeUnitLimit({ units: 1e6 }),
    ComputeBudgetProgram3.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return {
    tx,
    result: {
      escrowNullifier: params.escrowNullifier,
      takerNullifier: params.takerNullifier,
      makerOutCommitment: params.makerOutCommitment,
      takerOutCommitment: params.takerOutCommitment,
      encryptedNotes: [
        Buffer.from(serializeEncryptedNote(encryptedMakerNote)),
        Buffer.from(serializeEncryptedNote(encryptedTakerNote))
      ],
      randomness: [makerOutRandomness, takerOutRandomness],
      stealthEphemeralPubkeys: []
    }
  };
}
async function buildCancelOrderWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [orderPda] = deriveOrderPda(params.orderId, programId);
  const [counterPda] = deriveCommitmentCounterPda(params.pool, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.ORDER_CANCEL, programId);
  const refundRandomness = generateRandomness();
  const refundNote = {
    stealthPubX: params.refundRecipient.stealthPubkey.x,
    tokenMint: params.pool,
    amount: params.escrowedAmount,
    randomness: refundRandomness
  };
  const encryptedRefundNote = encryptNote(refundNote, params.refundRecipient.stealthPubkey);
  const ephemeralBytes = new Uint8Array(64);
  ephemeralBytes.set(params.refundRecipient.ephemeralPubkey.x, 0);
  ephemeralBytes.set(params.refundRecipient.ephemeralPubkey.y, 32);
  const addresses = [
    lightProtocol.deriveNullifierAddress(params.pool, params.escrowNullifier),
    lightProtocol.deriveCommitmentAddress(params.pool, params.refundCommitment)
  ];
  const validityProof = await lightProtocol.getValidityProof(addresses);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const convertedProof = LightProtocol.convertCompressedProof(validityProof);
  const baseAddressTreeInfo = {
    addressMerkleTreePubkeyIndex: addressTreeIndex,
    addressQueuePubkeyIndex: addressTreeIndex,
    rootIndex: validityProof.rootIndices[0] ?? 0
  };
  const lightParams = {
    nullifierProof: convertedProof,
    nullifierAddressTreeInfo: baseAddressTreeInfo,
    commitmentProof: convertedProof,
    commitmentAddressTreeInfo: baseAddressTreeInfo,
    outputTreeIndex
  };
  const tx = await program.methods.cancelOrder(
    Array.from(params.proof),
    Array.from(params.escrowNullifier),
    Array.from(params.orderId),
    Array.from(params.refundCommitment),
    Buffer.from(serializeEncryptedNote(encryptedRefundNote)),
    lightParams
  ).accountsStrict({
    pool: params.pool,
    commitmentCounter: counterPda,
    order: orderPda,
    verificationKey: vkPda,
    relayer: params.relayer
  }).remainingAccounts(remainingAccounts).preInstructions([
    ComputeBudgetProgram3.setComputeUnitLimit({ units: 8e5 }),
    ComputeBudgetProgram3.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return {
    tx,
    result: {
      escrowNullifier: params.escrowNullifier,
      refundCommitment: params.refundCommitment,
      encryptedNote: Buffer.from(serializeEncryptedNote(encryptedRefundNote)),
      randomness: refundRandomness,
      stealthEphemeralPubkey: ephemeralBytes
    }
  };
}

// src/instructions/governance.ts
import {
  PublicKey as PublicKey7,
  ComputeBudgetProgram as ComputeBudgetProgram4
} from "@solana/web3.js";
import { BN as BN3 } from "@coral-xyz/anchor";
function deriveAggregationPda(id, programId) {
  return PublicKey7.findProgramAddressSync(
    [Buffer.from("aggregation"), Buffer.from(id)],
    programId
  );
}
async function buildCreateAggregationWithProgram(program, params) {
  const programId = program.programId;
  const [aggregationPda] = deriveAggregationPda(params.id, programId);
  const [tokenPoolPda] = derivePoolPda(params.tokenMint, programId);
  const tx = await program.methods.createAggregation(
    Array.from(params.id),
    Array.from(params.thresholdPubkey),
    params.threshold,
    params.numOptions,
    new BN3(params.deadline),
    Array.from(params.actionDomain)
  ).accountsStrict({
    aggregation: aggregationPda,
    tokenPool: tokenPoolPda,
    authority: params.authority,
    payer: params.payer,
    systemProgram: PublicKey7.default
  }).preInstructions([
    ComputeBudgetProgram4.setComputeUnitLimit({ units: 2e5 })
  ]);
  return tx;
}
async function buildSubmitVoteWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [aggregationPda] = deriveAggregationPda(params.aggregationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.GOVERNANCE_VOTE, programId);
  const nullifierAddress = lightProtocol.deriveNullifierAddress(
    aggregationPda,
    // Use aggregation as the "pool" for nullifier derivation
    params.actionNullifier
  );
  const validityProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const convertedProof = LightProtocol.convertCompressedProof(validityProof);
  const lightParams = {
    nullifierProof: convertedProof,
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: validityProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const encryptedVotesArray = params.encryptedVotes.map((ev) => Array.from(ev));
  const tx = await program.methods.submitEncrypted(
    Array.from(params.proof),
    Array(32).fill(0),
    // merkle_root (deprecated, verified by Light Protocol)
    Array.from(params.actionNullifier),
    encryptedVotesArray,
    lightParams
  ).accountsStrict({
    aggregation: aggregationPda,
    pool: params.tokenPool,
    verificationKey: vkPda,
    relayer: params.relayer
  }).remainingAccounts(remainingAccounts).preInstructions([
    ComputeBudgetProgram4.setComputeUnitLimit({ units: 8e5 }),
    ComputeBudgetProgram4.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return tx;
}
async function buildSubmitDecryptionShareWithProgram(program, params) {
  const programId = program.programId;
  const [aggregationPda] = deriveAggregationPda(params.aggregationId, programId);
  const sharesArray = params.shares.map((s) => Array.from(s));
  const proofsArray = params.dleqProofs.map((p) => Array.from(p));
  const tx = await program.methods.submitDecryptionShare(
    params.memberIndex,
    sharesArray,
    proofsArray
  ).accountsStrict({
    aggregation: aggregationPda,
    member: params.member
  }).preInstructions([
    ComputeBudgetProgram4.setComputeUnitLimit({ units: 4e5 })
  ]);
  return tx;
}
async function buildFinalizeDecryptionWithProgram(program, params) {
  const programId = program.programId;
  const [aggregationPda] = deriveAggregationPda(params.aggregationId, programId);
  const totalsArray = params.totals.map((t) => new BN3(t.toString()));
  const tx = await program.methods.finalizeDecryption(totalsArray).accountsStrict({
    aggregation: aggregationPda,
    authority: params.authority
  }).preInstructions([
    ComputeBudgetProgram4.setComputeUnitLimit({ units: 2e5 })
  ]);
  return tx;
}

// src/address-lookup-table.ts
import {
  PublicKey as PublicKey8,
  AddressLookupTableProgram,
  Transaction,
  sendAndConfirmTransaction
} from "@solana/web3.js";
async function createAddressLookupTable(connection, authority, recentSlot) {
  const slot = recentSlot ?? await connection.getSlot();
  const [instruction, address] = AddressLookupTableProgram.createLookupTable({
    authority,
    payer: authority,
    recentSlot: slot
  });
  console.log(`[ALT] Created lookup table at ${address.toBase58()}`);
  return { address, instruction };
}
function extendAddressLookupTable(address, authority, addresses) {
  console.log(`[ALT] Extending lookup table with ${addresses.length} addresses`);
  return AddressLookupTableProgram.extendLookupTable({
    lookupTable: address,
    authority,
    payer: authority,
    addresses
  });
}
async function fetchAddressLookupTable(connection, address) {
  try {
    const accountInfo = await connection.getAddressLookupTable(address);
    if (!accountInfo.value) {
      console.warn(`[ALT] Lookup table not found: ${address.toBase58()}`);
      return null;
    }
    console.log(`[ALT] Loaded lookup table with ${accountInfo.value.state.addresses.length} addresses`);
    return accountInfo.value;
  } catch (err) {
    console.error(`[ALT] Failed to fetch lookup table:`, err);
    return null;
  }
}
async function createCloakCraftALT(connection, authority, accounts) {
  console.log("[ALT] Creating CloakCraft Address Lookup Table...");
  const { address, instruction: createIx } = await createAddressLookupTable(
    connection,
    authority.publicKey
  );
  const createTx = new Transaction().add(createIx);
  const createSig = await sendAndConfirmTransaction(connection, createTx, [authority]);
  console.log(`[ALT] Created ALT: ${address.toBase58()} (${createSig})`);
  await new Promise((resolve2) => setTimeout(resolve2, 500));
  const allAddresses = [
    accounts.program,
    accounts.lightProtocol,
    ...accounts.stateTrees,
    ...accounts.addressTrees,
    ...accounts.nullifierQueues,
    ...accounts.systemAccounts,
    accounts.systemProgram,
    accounts.tokenProgram
  ];
  const BATCH_SIZE = 30;
  for (let i = 0; i < allAddresses.length; i += BATCH_SIZE) {
    const batch = allAddresses.slice(i, i + BATCH_SIZE);
    const extendIx = extendAddressLookupTable(address, authority.publicKey, batch);
    const extendTx = new Transaction().add(extendIx);
    const extendSig = await sendAndConfirmTransaction(connection, extendTx, [authority]);
    console.log(`[ALT] Extended ALT with ${batch.length} addresses (${extendSig})`);
    await new Promise((resolve2) => setTimeout(resolve2, 500));
  }
  console.log(`[ALT] CloakCraft ALT ready: ${address.toBase58()}`);
  console.log(`[ALT] Total addresses: ${allAddresses.length}`);
  return address;
}
function getLightProtocolCommonAccounts(network) {
  if (network === "devnet") {
    return {
      stateTrees: [
        new PublicKey8("BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW")
        // State tree 0
      ],
      addressTrees: [
        new PublicKey8("F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A")
        // Address tree 0
      ],
      nullifierQueues: [
        new PublicKey8("8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z")
        // Nullifier queue 0
      ],
      // Additional Light Protocol system accounts (from PackedAccounts)
      systemAccounts: [
        new PublicKey8("94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3"),
        new PublicKey8("35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh"),
        new PublicKey8("HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA"),
        new PublicKey8("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq"),
        new PublicKey8("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto")
      ]
    };
  } else {
    return {
      stateTrees: [
        new PublicKey8("BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW")
        // Placeholder
      ],
      addressTrees: [
        new PublicKey8("F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A")
        // Placeholder
      ],
      nullifierQueues: [
        new PublicKey8("8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z")
        // Placeholder
      ],
      systemAccounts: [
        new PublicKey8("94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3"),
        // Placeholder
        new PublicKey8("35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh"),
        // Placeholder
        new PublicKey8("HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA"),
        // Placeholder
        new PublicKey8("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq"),
        // Placeholder
        new PublicKey8("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto")
        // Placeholder
      ]
    };
  }
}
var ALTManager = class {
  constructor(connection) {
    this.cache = /* @__PURE__ */ new Map();
    this.connection = connection;
  }
  /**
   * Get an ALT account (from cache or fetch)
   */
  async get(address) {
    const key = address.toBase58();
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const alt = await fetchAddressLookupTable(this.connection, address);
    if (alt) {
      this.cache.set(key, alt);
    }
    return alt;
  }
  /**
   * Preload multiple ALTs
   */
  async preload(addresses) {
    await Promise.all(addresses.map((addr) => this.get(addr)));
  }
  /**
   * Clear the cache
   */
  clear() {
    this.cache.clear();
  }
};

// src/client.ts
var CloakCraftClient = class {
  constructor(config) {
    this.wallet = null;
    this.lightClient = null;
    this.program = null;
    this.heliusRpcUrl = null;
    this.connection = new Connection2(config.rpcUrl, config.commitment ?? "confirmed");
    this.programId = config.programId;
    this.rpcUrl = config.rpcUrl;
    this.indexerUrl = config.indexerUrl;
    this.network = config.network ?? "devnet";
    this.noteManager = new NoteManager(config.indexerUrl);
    this.proofGenerator = new ProofGenerator({
      baseUrl: config.circuitsBaseUrl,
      nodeConfig: config.nodeProverConfig
    });
    const isNode = typeof globalThis.process !== "undefined" && globalThis.process.versions != null && globalThis.process.versions.node != null;
    if (isNode && !config.nodeProverConfig) {
      this.proofGenerator.configureForNode();
    }
    if (config.heliusApiKey) {
      const baseUrl = this.network === "mainnet-beta" ? "https://mainnet.helius-rpc.com" : "https://devnet.helius-rpc.com";
      this.heliusRpcUrl = `${baseUrl}/?api-key=${config.heliusApiKey}`;
      this.lightClient = new LightCommitmentClient({
        apiKey: config.heliusApiKey,
        network: this.network
      });
    }
    this.altManager = new ALTManager(this.connection);
    this.altAddresses = config.addressLookupTables ?? [];
    if (this.altAddresses.length > 0) {
      console.log(`[Client] Preloading ${this.altAddresses.length} Address Lookup Tables...`);
      this.altManager.preload(this.altAddresses).catch((err) => {
        console.error("[Client] Failed to preload ALTs:", err);
      });
    }
  }
  /**
   * Get the Helius RPC URL (required for Light Protocol operations)
   */
  getHeliusRpcUrl() {
    if (!this.heliusRpcUrl) {
      throw new Error("Helius API key not configured. Light Protocol operations require heliusApiKey in config.");
    }
    return this.heliusRpcUrl;
  }
  /**
   * Initialize proof generator
   *
   * Must be called before generating proofs.
   * Loads circuit artifacts (manifests, proving keys, zkeys).
   *
   * @param circuits - Optional list of circuits to load (loads all by default)
   */
  async initializeProver(circuits) {
    await initPoseidon();
    await this.proofGenerator.initialize(circuits);
  }
  /**
   * Get the proof generator instance
   *
   * For advanced usage - direct proof generation
   */
  getProofGenerator() {
    return this.proofGenerator;
  }
  /**
   * Get loaded Address Lookup Tables
   *
   * Returns null if no ALTs configured or failed to load
   */
  async getAddressLookupTables() {
    if (this.altAddresses.length === 0) {
      return [];
    }
    const alts = await Promise.all(
      this.altAddresses.map((addr) => this.altManager.get(addr))
    );
    return alts.filter((alt) => alt !== null);
  }
  /**
   * Set the Anchor program instance
   * Required for transaction building
   */
  setProgram(program) {
    this.program = program;
  }
  /**
   * Get the Anchor program instance
   */
  getProgram() {
    return this.program;
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
   *
   * @param nullifier - The nullifier bytes
   * @param pool - The pool public key (used in address derivation seeds)
   */
  async isNullifierSpent(nullifier, pool) {
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const trees = this.getLightTrees();
    return this.lightClient.isNullifierSpent(
      nullifier,
      this.programId,
      trees.addressTree,
      pool
    );
  }
  /**
   * Prepare Light Protocol params for a transact instruction
   *
   * This fetches the validity proof from Helius for nullifier creation
   *
   * @param nullifier - The nullifier bytes
   * @param pool - The pool public key (used in address derivation seeds)
   */
  async prepareLightParams(nullifier, pool) {
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const trees = this.getLightTrees();
    const stateTreeSet = trees.stateTrees[0];
    return this.lightClient.prepareLightParams({
      nullifier,
      pool,
      programId: this.programId,
      addressMerkleTree: trees.addressTree,
      stateMerkleTree: stateTreeSet.stateTree,
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
    const stateTreeSet = trees.stateTrees[0];
    return this.lightClient.getRemainingAccounts({
      stateMerkleTree: stateTreeSet.stateTree,
      addressMerkleTree: trees.addressTree,
      nullifierQueue: stateTreeSet.outputQueue
    });
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
   * Async because it initializes Poseidon hash function if needed
   */
  async loadWallet(spendingKey) {
    await initPoseidon();
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
   * Initialize a new pool for a token
   */
  async initializePool(tokenMint, payer) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    return initializePool(this.program, tokenMint, payer.publicKey, payer.publicKey);
  }
  /**
   * Get pool state
   */
  async getPool(tokenMint) {
    const [poolPda] = PublicKey9.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    const [counterPda] = PublicKey9.findProgramAddressSync(
      [Buffer.from("commitment_counter"), poolPda.toBuffer()],
      this.programId
    );
    if (this.program) {
      try {
        const pool = await this.program.account.pool.fetch(poolPda);
        let commitmentCounter2;
        try {
          const counter = await this.program.account.poolCommitmentCounter.fetch(counterPda);
          commitmentCounter2 = BigInt((counter.totalCommitments || counter.total_commitments || 0).toString());
        } catch (e) {
          console.log("[getPool] Could not fetch commitment counter:", e);
          commitmentCounter2 = 0n;
        }
        return {
          tokenMint: pool.tokenMint,
          tokenVault: pool.tokenVault,
          totalShielded: BigInt(pool.totalShielded.toString()),
          authority: pool.authority,
          bump: pool.bump,
          vaultBump: pool.vaultBump,
          commitmentCounter: commitmentCounter2
        };
      } catch (e) {
        const msg = e.message?.toLowerCase() ?? "";
        if (msg.includes("account does not exist") || msg.includes("could not find") || msg.includes("not found") || msg.includes("null") || e.toString().includes("AccountNotFound")) {
          return null;
        }
        throw e;
      }
    }
    const accountInfo = await this.connection.getAccountInfo(poolPda);
    if (!accountInfo) return null;
    const data = accountInfo.data;
    if (data.length < 114) return null;
    let commitmentCounter;
    const counterInfo = await this.connection.getAccountInfo(counterPda);
    if (counterInfo && counterInfo.data.length >= 16) {
      commitmentCounter = counterInfo.data.readBigUInt64LE(8);
    }
    return {
      tokenMint: new PublicKey9(data.subarray(8, 40)),
      tokenVault: new PublicKey9(data.subarray(40, 72)),
      totalShielded: data.readBigUInt64LE(72),
      authority: new PublicKey9(data.subarray(80, 112)),
      bump: data[112],
      vaultBump: data[113],
      commitmentCounter
    };
  }
  /**
   * Get all initialized pools
   */
  async getAllPools() {
    if (!this.program) {
      throw new Error("Program not configured. Call setProgram() first.");
    }
    try {
      const pools = await this.program.account.pool.all();
      return pools.map((pool) => ({
        address: pool.publicKey,
        tokenMint: pool.account.tokenMint,
        tokenVault: pool.account.tokenVault,
        totalShielded: BigInt(pool.account.totalShielded.toString()),
        authority: pool.account.authority,
        bump: pool.account.bump,
        vaultBump: pool.account.vaultBump
      }));
    } catch (e) {
      console.error("Error fetching all pools:", e);
      return [];
    }
  }
  /**
   * Get all AMM pools
   */
  async getAllAmmPools() {
    if (!this.program) {
      throw new Error("Program not configured. Call setProgram() first.");
    }
    try {
      const pools = await this.program.account.ammPool.all();
      return pools.map((pool) => ({
        address: pool.publicKey,
        poolId: pool.account.poolId,
        tokenAMint: pool.account.tokenAMint,
        tokenBMint: pool.account.tokenBMint,
        lpMint: pool.account.lpMint,
        stateHash: pool.account.stateHash,
        reserveA: BigInt(pool.account.reserveA.toString()),
        reserveB: BigInt(pool.account.reserveB.toString()),
        lpSupply: BigInt(pool.account.lpSupply.toString()),
        feeBps: pool.account.feeBps,
        authority: pool.account.authority,
        isActive: pool.account.isActive,
        bump: pool.account.bump,
        lpMintBump: pool.account.lpMintBump
      }));
    } catch (e) {
      console.error("Error fetching all AMM pools:", e);
      return [];
    }
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
   * Get merkle proof for a note
   */
  async getMerkleProof(accountHash) {
    if (!this.lightClient) {
      throw new Error("Light client not initialized");
    }
    const proof = await this.lightClient.getMerkleProofByHash(accountHash);
    return {
      root: proof.root,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
      leafIndex: proof.leafIndex
    };
  }
  /**
   * Shield tokens into the pool
   *
   * Uses versioned transactions for atomic execution with Address Lookup Tables
   */
  async shield(params, payer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const instructionParams = {
      tokenMint: params.pool,
      amount: params.amount,
      stealthPubkey: params.recipient.stealthPubkey,
      stealthEphemeralPubkey: params.recipient.ephemeralPubkey,
      userTokenAccount: params.userTokenAccount,
      user: payer.publicKey
    };
    console.log("[Shield] Building transaction with Anchor...");
    const { buildShieldWithProgram: buildShieldWithProgram2 } = await import("./shield-KJFMXCZO.mjs");
    const { tx: anchorTx, commitment, randomness } = await buildShieldWithProgram2(
      this.program,
      instructionParams,
      heliusRpcUrl
    );
    const { Transaction: Transaction3 } = await import("@solana/web3.js");
    const tx = await anchorTx.transaction();
    tx.feePayer = payer.publicKey;
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.sign(payer);
    const rawTransaction = tx.serialize();
    const signature = await this.connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: "confirmed"
    });
    const confirmation = await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, "confirmed");
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    console.log("[Shield] \u2705 Transaction confirmed:", signature);
    return {
      signature,
      slot: 0,
      commitment,
      randomness
    };
  }
  /**
   * Shield tokens into the pool using wallet adapter
   *
   * Uses the program's provider wallet for signing
   */
  async shieldWithWallet(params, walletPublicKey) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const { tx, commitment, randomness } = await buildShieldWithProgram(
      this.program,
      {
        tokenMint: params.pool,
        amount: params.amount,
        stealthPubkey: params.recipient.stealthPubkey,
        stealthEphemeralPubkey: params.recipient.ephemeralPubkey,
        userTokenAccount: params.userTokenAccount,
        user: walletPublicKey
      },
      this.getHeliusRpcUrl()
    );
    console.log("[Shield] Sending transaction...");
    const signature = await tx.rpc({
      skipPreflight: false,
      commitment: "confirmed"
    });
    console.log("[Shield] Transaction sent:", signature);
    return {
      signature,
      slot: 0,
      commitment,
      randomness
    };
  }
  /**
   * Private transfer
   *
   * Generates ZK proof client-side (privacy-preserving) and submits transaction.
   * The proof generation happens entirely in the browser/local environment.
   *
   * @param params - Transfer parameters with prepared inputs
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async transfer(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const circuitName = "transfer/1x2";
    if (!this.proofGenerator.hasCircuit(circuitName)) {
      throw new Error(`Prover not initialized. Call initializeProver(['${circuitName}']) first.`);
    }
    const tokenMint = params.inputs[0].tokenMint instanceof Uint8Array ? new PublicKey9(params.inputs[0].tokenMint) : params.inputs[0].tokenMint;
    const [poolPda] = PublicKey9.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    const [counterPda] = PublicKey9.findProgramAddressSync(
      [Buffer.from("commitment_counter"), poolPda.toBuffer()],
      this.programId
    );
    const counterAccount = await this.connection.getAccountInfo(counterPda);
    if (!counterAccount) {
      throw new Error("PoolCommitmentCounter not found. Initialize pool first.");
    }
    const baseLeafIndex = counterAccount.data.readBigUInt64LE(40);
    params.onProgress?.("generating");
    const proof = await this.proofGenerator.generateTransferProof(
      params,
      this.wallet.keypair
    );
    params.onProgress?.("building");
    const accountHash = params.inputs[0].accountHash;
    if (!accountHash) {
      throw new Error("Input note missing accountHash. Use scanNotes() to get notes with accountHash.");
    }
    const input = params.inputs[0];
    let stealthSpendingKey;
    if (input.stealthEphemeralPubkey) {
      const baseSpendingKey = bytesToField(this.wallet.keypair.spending.sk);
      stealthSpendingKey = deriveStealthPrivateKey(baseSpendingKey, input.stealthEphemeralPubkey);
    } else {
      stealthSpendingKey = bytesToField(this.wallet.keypair.spending.sk);
    }
    const stealthNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
    const inputCommitment = computeCommitment(input);
    const nullifier = deriveSpendingNullifier(stealthNullifierKey, inputCommitment, input.leafIndex);
    const toHex = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    const toFieldBigInt = (arr) => BigInt("0x" + toHex(arr));
    let out2Commitment;
    if (params.outputs[1]?.commitment) {
      out2Commitment = params.outputs[1].commitment;
    } else {
      out2Commitment = computeCommitment({
        stealthPubX: new Uint8Array(32),
        tokenMint,
        amount: 0n,
        randomness: new Uint8Array(32)
      });
    }
    const tokenMintBytes = tokenMint.toBytes();
    const tokenMintField = toFieldBigInt(tokenMintBytes);
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? await this.getRelayerPubkey();
    let protocolConfig;
    let treasuryWallet;
    let treasuryTokenAccount;
    if (params.fee && params.fee > 0n) {
      const [configPda] = deriveProtocolConfigPda(this.programId);
      protocolConfig = configPda;
      const { fetchProtocolFeeConfig: fetchProtocolFeeConfig2 } = await import("./fees-ZC4M2ATQ.mjs");
      const feeConfig = await fetchProtocolFeeConfig2(this.connection, this.programId);
      if (feeConfig?.treasury) {
        treasuryWallet = feeConfig.treasury;
        treasuryTokenAccount = getAssociatedTokenAddressSync(
          tokenMint,
          treasuryWallet,
          true
          // allowOwnerOffCurve
        );
        console.log("[Transfer] Treasury wallet:", treasuryWallet.toBase58());
        console.log("[Transfer] Treasury token account:", treasuryTokenAccount.toBase58());
      }
    }
    const instructionParams = {
      tokenMint,
      input: {
        stealthPubX: params.inputs[0].stealthPubX,
        amount: params.inputs[0].amount,
        randomness: params.inputs[0].randomness,
        leafIndex: params.inputs[0].leafIndex,
        spendingKey: BigInt("0x" + Buffer.from(this.wallet.keypair.spending.sk).toString("hex")),
        accountHash
        // Scanner's accountHash - where commitment actually exists
      },
      outputs: params.outputs.map((o) => ({
        recipientPubkey: o.recipient.stealthPubkey,
        ephemeralPubkey: o.recipient.ephemeralPubkey,
        amount: o.amount,
        commitment: o.commitment,
        randomness: o.randomness
      })),
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merklePathIndices: params.merkleIndices,
      unshieldAmount: params.unshield?.amount,
      unshieldRecipient: params.unshield?.recipient,
      feeAmount: params.fee,
      protocolConfig,
      treasuryWallet,
      treasuryTokenAccount,
      relayer: relayerPubkey,
      proof,
      nullifier,
      inputCommitment
    };
    const circuitId = "transfer_1x2";
    console.log("[Transfer] === Starting Multi-Phase Transfer ===");
    console.log("[Transfer] Circuit:", circuitName);
    console.log("[Transfer] Token:", params.inputs[0].tokenMint.toBase58());
    console.log("[Transfer] Inputs:", params.inputs.length);
    console.log("[Transfer] Outputs:", params.outputs.length);
    console.log("[Transfer] Unshield:", instructionParams.unshieldAmount?.toString() || "none");
    if (instructionParams.unshieldRecipient) {
      console.log("[Transfer] Unshield recipient:", instructionParams.unshieldRecipient.toBase58());
    }
    console.log("[Transfer] Fee:", instructionParams.feeAmount?.toString() || "0");
    if (protocolConfig) {
      console.log("[Transfer] Protocol config:", protocolConfig.toBase58());
    }
    if (treasuryTokenAccount) {
      console.log("[Transfer] Treasury token account:", treasuryTokenAccount.toBase58());
    }
    console.log("[Transfer] Building phase transactions...");
    let phase0Tx, phase1Tx, phase2Tx, phase3Tx, result, operationId, pendingCommitments;
    try {
      const buildResult = await buildTransactWithProgram(
        this.program,
        instructionParams,
        heliusRpcUrl,
        circuitId
      );
      phase0Tx = buildResult.tx;
      phase1Tx = buildResult.phase1Tx;
      phase2Tx = buildResult.phase2Tx;
      phase3Tx = buildResult.phase3Tx;
      result = buildResult.result;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log("[Transfer] Phase transactions built successfully");
    } catch (error) {
      console.error("[Transfer] FAILED to build phase transactions:", error);
      throw error;
    }
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await import("./swap-MYDEZ2QE.mjs");
    console.log("[Transfer] Building all transactions for batch signing...");
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: phase0Tx });
    transactionBuilders.push({ name: "Phase 1 (Verify Commitment)", builder: phase1Tx });
    transactionBuilders.push({ name: "Phase 2 (Create Nullifier)", builder: phase2Tx });
    if (phase3Tx) {
      transactionBuilders.push({ name: "Phase 3 (Unshield)", builder: phase3Tx });
    }
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram2(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4 + i} (Commitment ${i})`, builder: commitmentTx });
    }
    const { tx: closeTx } = await buildClosePendingOperationWithProgram2(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: "Final (Close Pending)", builder: closeTx });
    console.log(`[Transfer] Built ${transactionBuilders.length} transactions`);
    const lookupTables = await this.getAddressLookupTables();
    if (lookupTables.length === 0) {
      console.warn("[Transfer] No Address Lookup Tables configured! Phase 1 may exceed size limit.");
      console.warn("[Transfer] Run: pnpm tsx scripts/create-alt.ts to create an ALT");
    } else {
      console.log(`[Transfer] Using ${lookupTables.length} Address Lookup Tables for compression`);
      lookupTables.forEach((alt, i) => {
        console.log(`[Transfer] ALT ${i}: ${alt.state.addresses.length} addresses`);
      });
    }
    const { VersionedTransaction: VersionedTransaction2, TransactionMessage: TransactionMessage2 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];
          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);
          return new VersionedTransaction2(
            new TransactionMessage2({
              payerKey: relayerPubkey,
              recentBlockhash: blockhash,
              instructions: allInstructions
              // Include compute budget + main instruction
            }).compileToV0Message(lookupTables)
            // V0 = ALT-enabled format
          );
        } catch (error) {
          console.error(`[Transfer] Failed to build transaction: ${name}`, error);
          throw new Error(`Failed to build ${name}: ${error?.message || String(error)}`);
        }
      })
    );
    console.log("[Transfer] Requesting signature for all transactions...");
    params.onProgress?.("approving");
    let signedTransactions;
    if (relayer) {
      signedTransactions = transactions.map((tx) => {
        tx.sign([relayer]);
        return tx;
      });
    } else if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === "function") {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error("Wallet does not support batch signing");
      }
    } else {
      throw new Error("No signing method available");
    }
    console.log(`[Transfer] All ${signedTransactions.length} transactions signed!`);
    params.onProgress?.("executing");
    console.log("[Transfer] Executing signed transactions sequentially...");
    let phase1Signature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      console.log(`[Transfer] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log(`[Transfer] ${name} confirmed: ${signature}`);
      if (i === 0) {
        phase1Signature = signature;
      }
    }
    params.onProgress?.("confirming");
    return {
      signature: phase1Signature,
      slot: 0
    };
  }
  /**
   * Get relayer public key (without requiring keypair)
   * Falls back to self-relay mode (provider wallet pays own fees) if no relayer configured
   */
  async getRelayerPubkey() {
    if (this.program?.provider && "publicKey" in this.program.provider) {
      const providerWallet = this.program.provider;
      console.warn("[getRelayerPubkey] No relayer configured - using self-relay mode (provider wallet pays fees)");
      return providerWallet.publicKey;
    }
    throw new Error("No relayer configured and no provider wallet available.");
  }
  /**
   * Sign all transactions at once (batch signing)
   *
   * @param transactions - Array of transactions to sign
   * @param relayer - Optional relayer keypair. If not provided, uses wallet adapter's signAllTransactions
   * @returns Array of signed transactions
   */
  async signAllTransactions(transactions, relayer) {
    const { Transaction: Transaction3 } = await import("@solana/web3.js");
    if (relayer) {
      const signedTxs = transactions.map((tx) => {
        const signedTx = new Transaction3();
        signedTx.recentBlockhash = tx.recentBlockhash;
        signedTx.feePayer = tx.feePayer;
        signedTx.instructions = tx.instructions;
        signedTx.sign(relayer);
        return signedTx;
      });
      return signedTxs;
    }
    if (this.program?.provider && "wallet" in this.program.provider) {
      const provider = this.program.provider;
      const wallet = provider.wallet;
      if (wallet && typeof wallet.signAllTransactions === "function") {
        console.log("[Batch Sign] Using wallet adapter signAllTransactions");
        const signedTxs = await wallet.signAllTransactions(transactions);
        return signedTxs;
      }
      if (wallet && typeof wallet.signTransaction === "function") {
        console.warn("[Batch Sign] Wallet does not support signAllTransactions, signing individually");
        const signedTxs = [];
        for (const tx of transactions) {
          const signedTx = await wallet.signTransaction(tx);
          signedTxs.push(signedTx);
        }
        return signedTxs;
      }
    }
    throw new Error("No signing method available - provide relayer keypair or ensure wallet adapter is connected");
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
    const tokenMint = request.inputs[0].tokenMint;
    const preparedInputs = await this.prepareInputs(request.inputs);
    const preparedOutputs = await this.prepareOutputs(request.outputs, tokenMint);
    console.log("[prepareAndTransfer] Prepared outputs:");
    preparedOutputs.forEach((o, i) => {
      console.log(`  Output ${i}: amount=${o.amount}, commitment=${Buffer.from(o.commitment).toString("hex").slice(0, 16)}...`);
    });
    const commitment = preparedInputs[0].commitment;
    const dummyPath = Array(32).fill(new Uint8Array(32));
    const dummyIndices = Array(32).fill(0);
    const { fetchProtocolFeeConfig: fetchProtocolFeeConfig2, calculateProtocolFee: calculateProtocolFee2 } = await import("./fees-ZC4M2ATQ.mjs");
    const feeConfig = await fetchProtocolFeeConfig2(this.connection, this.programId);
    const operationType = request.unshield ? "unshield" : "transfer";
    const totalInputAmount = preparedInputs.reduce((sum, input) => sum + input.amount, 0n);
    const feeableAmount = request.unshield?.amount ?? request.outputs[0]?.amount ?? 0n;
    const feeCalc = calculateProtocolFee2(feeableAmount, operationType, feeConfig);
    console.log("[prepareAndTransfer] Fee calculation:", {
      operationType,
      feeableAmount: feeableAmount.toString(),
      feeAmount: feeCalc.feeAmount.toString(),
      feeBps: feeCalc.feeBps,
      feesEnabled: feeConfig?.feesEnabled ?? false,
      totalInput: totalInputAmount.toString()
    });
    let adjustedOutputs = preparedOutputs;
    let adjustedUnshield = request.unshield;
    if (feeCalc.feeAmount > 0n) {
      if (request.unshield && request.unshield.amount > 0n) {
        if (request.unshield.amount < feeCalc.feeAmount) {
          throw new Error(
            `Insufficient unshield amount to pay protocol fee. Unshield: ${request.unshield.amount}, Fee: ${feeCalc.feeAmount}.`
          );
        }
        adjustedUnshield = {
          ...request.unshield,
          amount: request.unshield.amount - feeCalc.feeAmount
        };
        console.log("[prepareAndTransfer] Adjusted unshield for fee:", {
          originalAmount: request.unshield.amount.toString(),
          adjustedAmount: adjustedUnshield.amount.toString(),
          feeDeducted: feeCalc.feeAmount.toString()
        });
      } else if (preparedOutputs.length > 0) {
        const changeOutputIndex = preparedOutputs.length > 1 ? 1 : 0;
        const changeOutput = preparedOutputs[changeOutputIndex];
        if (changeOutput.amount < feeCalc.feeAmount) {
          throw new Error(
            `Insufficient balance to pay protocol fee. Change: ${changeOutput.amount}, Fee: ${feeCalc.feeAmount}. Please use a larger input amount or reduce the transfer amount.`
          );
        }
        const adjustedChangeOutput = {
          ...changeOutput,
          amount: changeOutput.amount - feeCalc.feeAmount
        };
        const adjustedNote = {
          stealthPubX: adjustedChangeOutput.stealthPubX,
          tokenMint,
          amount: adjustedChangeOutput.amount,
          randomness: adjustedChangeOutput.randomness
        };
        adjustedChangeOutput.commitment = computeCommitment(adjustedNote);
        adjustedOutputs = [...preparedOutputs];
        adjustedOutputs[changeOutputIndex] = adjustedChangeOutput;
        console.log("[prepareAndTransfer] Adjusted change output for fee:", {
          originalAmount: changeOutput.amount.toString(),
          adjustedAmount: adjustedChangeOutput.amount.toString(),
          feeDeducted: feeCalc.feeAmount.toString()
        });
      }
    }
    request.onProgress?.("preparing");
    const params = {
      inputs: preparedInputs,
      merkleRoot: commitment,
      merklePath: dummyPath,
      merkleIndices: dummyIndices,
      outputs: adjustedOutputs,
      unshield: adjustedUnshield,
      fee: feeCalc.feeAmount,
      onProgress: request.onProgress
    };
    return this.transfer(params, relayer);
  }
  /**
   * Prepare and consolidate notes
   *
   * Consolidates multiple notes into a single note.
   * This is used to reduce wallet fragmentation.
   *
   * @param inputs - Notes to consolidate (1-3)
   * @param tokenMint - Token mint (all inputs must use same token)
   * @param onProgress - Optional progress callback
   * @returns Transaction result with signature
   */
  async prepareAndConsolidate(inputs, tokenMint, onProgress) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("Program not set. Call setProgram() first.");
    }
    if (inputs.length === 0 || inputs.length > 3) {
      throw new Error("Consolidation requires 1-3 input notes");
    }
    onProgress?.("preparing");
    console.log(`[prepareAndConsolidate] Consolidating ${inputs.length} notes...`);
    this.clearScanCache();
    const freshNotes = await this.scanNotes(tokenMint);
    const matchedInputs = [];
    for (const input of inputs) {
      const fresh = freshNotes.find(
        (n) => n.commitment && input.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(input.commitment).toString("hex")
      );
      if (fresh) {
        matchedInputs.push(fresh);
      } else {
        throw new Error("Selected note not found in pool. It may have been spent or not yet synced.");
      }
    }
    const preparedInputs = await this.prepareInputs(matchedInputs);
    const { stealthAddress } = generateStealthAddress(this.wallet.keypair.publicKey);
    const commitment = preparedInputs[0].commitment;
    const consolidationParams = {
      inputs: preparedInputs,
      merkleRoot: commitment,
      tokenMint,
      outputRecipient: stealthAddress
    };
    onProgress?.("generating");
    console.log("[prepareAndConsolidate] Generating consolidation proof...");
    const proofResult = await this.proofGenerator.generateConsolidationProof(
      consolidationParams,
      this.wallet.keypair
    );
    console.log(`[prepareAndConsolidate] Proof generated. Output amount: ${proofResult.outputAmount}`);
    console.log(`[prepareAndConsolidate] Nullifiers: ${proofResult.nullifiers.length}`);
    onProgress?.("building");
    const result = await this.executeConsolidation(
      preparedInputs,
      proofResult,
      tokenMint,
      stealthAddress,
      onProgress
    );
    onProgress?.("confirming");
    await new Promise((resolve2) => setTimeout(resolve2, 2e3));
    this.clearScanCache();
    await this.scanNotes(tokenMint);
    return result;
  }
  /**
   * Execute consolidation transaction (multi-phase)
   *
   * Uses the consolidate_3x1 circuit and pre-generated proof.
   */
  async executeConsolidation(inputs, proofResult, tokenMint, outputRecipient, onProgress) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set");
    }
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = await this.getRelayerPubkey();
    for (let i = 0; i < inputs.length; i++) {
      if (!inputs[i].accountHash) {
        throw new Error(`Input note ${i} missing accountHash`);
      }
    }
    console.log("[Consolidation] === Starting Multi-Phase Consolidation ===");
    console.log("[Consolidation] Token:", tokenMint.toBase58());
    console.log("[Consolidation] Inputs:", inputs.length);
    console.log("[Consolidation] Output amount:", proofResult.outputAmount.toString());
    const consolidationParams = {
      tokenMint,
      inputs: inputs.map((input) => ({
        stealthPubX: input.stealthPubX,
        amount: input.amount,
        randomness: input.randomness,
        leafIndex: input.leafIndex,
        commitment: input.commitment,
        accountHash: input.accountHash
      })),
      nullifiers: proofResult.nullifiers,
      outputCommitment: proofResult.outputCommitment,
      outputRandomness: proofResult.outputRandomness,
      outputAmount: proofResult.outputAmount,
      outputRecipient,
      merkleRoot: inputs[0].commitment,
      // Dummy - Light Protocol verifies on-chain
      relayer: relayerPubkey,
      proof: proofResult.proof
    };
    let phase0Tx, phase1Txs, phase2Txs, operationId, pendingCommitments;
    try {
      const buildResult = await buildConsolidationWithProgram(
        this.program,
        consolidationParams,
        heliusRpcUrl
      );
      phase0Tx = buildResult.phase0Tx;
      phase1Txs = buildResult.phase1Txs;
      phase2Txs = buildResult.phase2Txs;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log("[Consolidation] Phase transactions built successfully");
      console.log(`[Consolidation] Phase 0: 1, Phase 1: ${phase1Txs.length}, Phase 2: ${phase2Txs.length}`);
    } catch (error) {
      console.error("[Consolidation] FAILED to build phase transactions:", error);
      throw error;
    }
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await import("./swap-MYDEZ2QE.mjs");
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: phase0Tx });
    for (let i = 0; i < phase1Txs.length; i++) {
      transactionBuilders.push({ name: `Phase 1.${i} (Verify Commitment ${i})`, builder: phase1Txs[i] });
    }
    for (let i = 0; i < phase2Txs.length; i++) {
      transactionBuilders.push({ name: `Phase 2.${i} (Create Nullifier ${i})`, builder: phase2Txs[i] });
    }
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram2(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase 4 (Commitment ${i})`, builder: commitmentTx });
    }
    const { tx: closeTx } = await buildClosePendingOperationWithProgram2(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: "Final (Close Pending)", builder: closeTx });
    console.log(`[Consolidation] Built ${transactionBuilders.length} transactions total`);
    const lookupTables = await this.getAddressLookupTables();
    const { VersionedTransaction: VersionedTransaction2, TransactionMessage: TransactionMessage2 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        const mainIx = await builder.instruction();
        const preIxs = builder._preInstructions || [];
        const allInstructions = [...preIxs, mainIx];
        return new VersionedTransaction2(
          new TransactionMessage2({
            payerKey: relayerPubkey,
            recentBlockhash: blockhash,
            instructions: allInstructions
          }).compileToV0Message(lookupTables)
        );
      })
    );
    console.log("[Consolidation] Requesting signature for all transactions...");
    onProgress?.("approving");
    let signedTransactions;
    if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === "function") {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error("Wallet does not support batch signing");
      }
    } else {
      throw new Error("No signing method available");
    }
    console.log(`[Consolidation] All ${signedTransactions.length} transactions signed!`);
    onProgress?.("executing");
    let finalSignature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      console.log(`[Consolidation] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log(`[Consolidation] ${name} confirmed: ${signature}`);
      finalSignature = signature;
    }
    console.log("[Consolidation] === Consolidation Complete ===");
    return {
      signature: finalSignature,
      slot: 0
      // Could fetch from confirmation if needed
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
   * Prepare and create a market order (convenience method)
   */
  async prepareAndCreateOrder(request, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    const [preparedInput] = await this.prepareInputs([request.input]);
    const merkleProof = await this.fetchMerkleProof(request.input);
    preparedInput.leafIndex = merkleProof.leafIndex;
    const orderIdBytes = generateRandomness();
    const escrowRandomness = generateRandomness();
    const escrowNote = createNote(
      preparedInput.stealthPubX,
      request.terms.offerMint,
      request.terms.offerAmount,
      escrowRandomness
    );
    const escrowCommitment = computeCommitment(escrowNote);
    const termsHash = poseidonHash([
      request.terms.offerMint.toBytes(),
      fieldToBytes(request.terms.offerAmount),
      request.terms.requestMint.toBytes(),
      fieldToBytes(request.terms.requestAmount)
    ]);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    const inputCommitment = computeCommitment(request.input);
    const nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, merkleProof.leafIndex);
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
   *
   * Uses direct RPC scanning via Helius, so sync status is always current
   */
  async getSyncStatus() {
    const slot = await this.connection.getSlot();
    return {
      latestSlot: slot,
      indexedSlot: slot,
      isSynced: true
    };
  }
  // =============================================================================
  // AMM Swap Methods
  // =============================================================================
  /**
   * Initialize a new AMM liquidity pool
   *
   * Creates a new AMM pool for a token pair. This must be done before
   * anyone can add liquidity or swap between these tokens.
   *
   * @param tokenAMint - First token mint
   * @param tokenBMint - Second token mint
   * @param lpMintKeypair - LP token mint keypair (newly generated)
   * @param feeBps - Trading fee in basis points (e.g., 30 = 0.3%)
   * @param payer - Payer for transaction fees and rent
   * @returns Transaction signature
   */
  async initializeAmmPool(tokenAMint, tokenBMint, lpMintKeypair, feeBps, payer) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    try {
      let payerPublicKey;
      let payerKeypair = null;
      if (payer && payer.secretKey && payer.secretKey.length > 0) {
        payerPublicKey = payer.publicKey;
        payerKeypair = payer;
      } else if (payer) {
        payerPublicKey = payer.publicKey;
      } else {
        const wallet = this.program.provider.publicKey;
        if (!wallet) {
          throw new Error("No wallet connected. Please connect your wallet first.");
        }
        payerPublicKey = wallet;
      }
      const tx = await buildInitializeAmmPoolWithProgram(this.program, {
        tokenAMint,
        tokenBMint,
        lpMint: lpMintKeypair.publicKey,
        feeBps,
        authority: payerPublicKey,
        payer: payerPublicKey
      });
      let ammSignature;
      if (payerKeypair) {
        ammSignature = await tx.signers([payerKeypair, lpMintKeypair]).rpc();
        console.log(`[AMM] Pool initialized (CLI): ${ammSignature}`);
      } else {
        const transaction = await tx.transaction();
        const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.lastValidBlockHeight = lastValidBlockHeight;
        transaction.feePayer = payerPublicKey;
        transaction.partialSign(lpMintKeypair);
        const wallet = this.program.provider.wallet;
        if (!wallet || !wallet.signTransaction) {
          throw new Error("Wallet does not support transaction signing");
        }
        const signedTx = await wallet.signTransaction(transaction);
        ammSignature = await this.connection.sendRawTransaction(signedTx.serialize());
        await this.connection.confirmTransaction({
          signature: ammSignature,
          blockhash,
          lastValidBlockHeight
        });
        console.log(`[AMM] Pool initialized (wallet): ${ammSignature}`);
      }
      console.log(`[AMM] Initializing LP token pool: ${lpMintKeypair.publicKey.toBase58()}`);
      try {
        const lpPoolInit = await initializePool(this.program, lpMintKeypair.publicKey, payerPublicKey, payerPublicKey);
        console.log(`[AMM] LP pool initialized: pool=${lpPoolInit.poolTx}, counter=${lpPoolInit.counterTx}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes("already in use") && !errMsg.includes("already_exists")) {
          console.error(`[AMM] LP pool initialization failed: ${errMsg}`);
          throw new Error(`AMM pool created but LP pool initialization failed: ${errMsg}. LP tokens will not be scannable.`);
        }
        console.log(`[AMM] LP pool already exists`);
      }
      return ammSignature;
    } catch (err) {
      console.error("[AMM] Failed to initialize pool:", err);
      throw err;
    }
  }
  /**
   * Initialize LP pool for an existing AMM pool
   *
   * Call this if you have an AMM pool whose LP token pool wasn't created.
   * This is required for LP tokens to be scannable after adding liquidity.
   *
   * @param ammPoolAddress - Address of the AMM pool
   * @returns Transaction signature
   */
  async initializeLpPool(ammPoolAddress) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const ammPoolAccount = await this.program.account.ammPool.fetch(ammPoolAddress);
    const lpMint = ammPoolAccount.lpMint;
    const payer = this.program.provider.publicKey;
    if (!payer) {
      throw new Error("No wallet connected");
    }
    console.log(`[AMM] Initializing LP pool for mint: ${lpMint.toBase58()}`);
    return initializePool(this.program, lpMint, payer, payer);
  }
  /**
   * Initialize LP pools for all existing AMM pools
   *
   * Useful for ensuring all LP tokens are scannable.
   */
  async initializeAllLpPools() {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const pools = await this.getAllAmmPools();
    console.log(`[AMM] Initializing LP pools for ${pools.length} AMM pools...`);
    for (const pool of pools) {
      try {
        const result = await this.initializeLpPool(pool.address);
        console.log(`[AMM] LP pool for ${pool.lpMint.toBase58()}: pool=${result.poolTx}, counter=${result.counterTx}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes("already in use") && !errMsg.includes("already_exists")) {
          console.error(`[AMM] Failed to init LP pool for ${pool.lpMint.toBase58()}: ${errMsg}`);
        }
      }
    }
  }
  /**
   * Execute an AMM swap
   *
   * Swaps tokens through the private AMM pool.
   *
   * @param params - Swap parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async swap(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("swap/swap")) {
      throw new Error("Prover not initialized. Call initializeProver(['swap/swap']) first.");
    }
    const proofResult = await this.proofGenerator.generateSwapProof(
      params,
      this.wallet.keypair
    );
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array ? new PublicKey9(params.input.tokenMint) : params.input.tokenMint;
    const ammPoolAccount = await this.program.account.ammPool.fetch(params.poolId);
    const outputTokenMint = params.swapDirection === "aToB" ? ammPoolAccount.tokenBMint : ammPoolAccount.tokenAMint;
    const [inputPoolPda] = derivePoolPda(inputTokenMint, this.programId);
    const [outputPoolPda] = derivePoolPda(outputTokenMint, this.programId);
    const accountHash = params.input.accountHash;
    if (!accountHash) {
      throw new Error("Input note missing accountHash. Use scanNotes() to get notes with accountHash.");
    }
    const { proof, nullifier, outCommitment, changeCommitment, outRandomness, changeRandomness } = proofResult;
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? await this.getRelayerPubkey();
    const inputCommitment = computeCommitment(params.input);
    const instructionParams = {
      inputPool: inputPoolPda,
      outputPool: outputPoolPda,
      inputTokenMint,
      outputTokenMint,
      ammPool: params.poolId,
      relayer: relayerPubkey,
      proof,
      merkleRoot: params.merkleRoot,
      nullifier,
      inputCommitment,
      accountHash,
      leafIndex: params.input.leafIndex,
      outputCommitment: outCommitment,
      changeCommitment,
      minOutput: params.minOutput,
      outputRecipient: params.outputRecipient,
      changeRecipient: params.changeRecipient,
      inputAmount: params.input.amount,
      swapAmount: params.swapAmount,
      outputAmount: params.outputAmount,
      swapDirection: params.swapDirection,
      outRandomness,
      changeRandomness
    };
    console.log("[Swap] === Starting Multi-Phase Swap ===");
    console.log("[Swap] Input token:", inputTokenMint.toBase58());
    console.log("[Swap] Output token:", outputTokenMint.toBase58());
    console.log("[Swap] Swap amount:", params.swapAmount.toString());
    console.log("[Swap] Min output:", params.minOutput.toString());
    console.log("[Swap] Building phase transactions...");
    let phase0Tx, phase1Tx, phase2Tx, phase3Tx, operationId, pendingCommitments;
    try {
      const buildResult = await buildSwapWithProgram(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      phase0Tx = buildResult.tx;
      phase1Tx = buildResult.phase1Tx;
      phase2Tx = buildResult.phase2Tx;
      phase3Tx = buildResult.phase3Tx;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log("[Swap] Phase transactions built successfully");
    } catch (error) {
      console.error("[Swap] FAILED to build phase transactions:", error);
      throw error;
    }
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await import("./swap-MYDEZ2QE.mjs");
    console.log("[Swap] Building all transactions for batch signing...");
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: phase0Tx });
    transactionBuilders.push({ name: "Phase 1 (Verify Commitment)", builder: phase1Tx });
    transactionBuilders.push({ name: "Phase 2 (Create Nullifier)", builder: phase2Tx });
    transactionBuilders.push({ name: "Phase 3 (Execute Swap)", builder: phase3Tx });
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      if (pc.commitment.every((b) => b === 0)) continue;
      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram2(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4 + i} (Commitment ${i})`, builder: commitmentTx });
    }
    const { tx: closeTx } = await buildClosePendingOperationWithProgram2(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: "Final (Close Pending)", builder: closeTx });
    console.log(`[Swap] Built ${transactionBuilders.length} transactions`);
    const lookupTables = await this.getAddressLookupTables();
    if (lookupTables.length === 0) {
      console.warn("[Swap] No Address Lookup Tables configured! May exceed size limit.");
      console.warn("[Swap] Run: pnpm tsx scripts/create-alt.ts to create an ALT");
    } else {
      console.log(`[Swap] Using ${lookupTables.length} Address Lookup Tables for compression`);
      lookupTables.forEach((alt, i) => {
        console.log(`[Swap] ALT ${i}: ${alt.state.addresses.length} addresses`);
      });
    }
    const { VersionedTransaction: VersionedTransaction2, TransactionMessage: TransactionMessage2 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];
          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);
          return new VersionedTransaction2(
            new TransactionMessage2({
              payerKey: relayerPubkey,
              recentBlockhash: blockhash,
              instructions: allInstructions
            }).compileToV0Message(lookupTables)
          );
        } catch (error) {
          console.error(`[Swap] Failed to build transaction: ${name}`, error);
          throw new Error(`Failed to build ${name}: ${error?.message || String(error)}`);
        }
      })
    );
    console.log("[Swap] Requesting signature for all transactions...");
    let signedTransactions;
    if (relayer) {
      signedTransactions = transactions.map((tx) => {
        tx.sign([relayer]);
        return tx;
      });
    } else if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === "function") {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error("Wallet does not support batch signing");
      }
    } else {
      throw new Error("No signing method available");
    }
    console.log(`[Swap] All ${signedTransactions.length} transactions signed!`);
    console.log("[Swap] Executing signed transactions sequentially...");
    let phase0Signature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      console.log(`[Swap] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log(`[Swap] ${name} confirmed: ${signature}`);
      if (i === 0) {
        phase0Signature = signature;
      }
    }
    return {
      signature: phase0Signature,
      slot: 0
    };
  }
  /**
   * Add liquidity to an AMM pool
   *
   * @param params - Add liquidity parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async addLiquidity(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("swap/add_liquidity")) {
      throw new Error("Prover not initialized. Call initializeProver(['swap/add_liquidity']) first.");
    }
    const lpAmount = params.lpAmount;
    const proofResult = await this.proofGenerator.generateAddLiquidityProof(
      params,
      this.wallet.keypair
    );
    const tokenAMint = params.inputA.tokenMint instanceof Uint8Array ? new PublicKey9(params.inputA.tokenMint) : params.inputA.tokenMint;
    const tokenBMint = params.inputB.tokenMint instanceof Uint8Array ? new PublicKey9(params.inputB.tokenMint) : params.inputB.tokenMint;
    const [poolA] = derivePoolPda(tokenAMint, this.programId);
    const [poolB] = derivePoolPda(tokenBMint, this.programId);
    const [lpPool] = derivePoolPda(params.lpMint, this.programId);
    const {
      proof,
      nullifierA,
      nullifierB,
      lpCommitment,
      changeACommitment,
      changeBCommitment,
      lpRandomness,
      changeARandomness,
      changeBRandomness
    } = proofResult;
    const inputCommitmentA = computeCommitment(params.inputA);
    const inputCommitmentB = computeCommitment(params.inputB);
    if (!params.inputA.accountHash || !params.inputB.accountHash) {
      throw new Error("Input notes must have accountHash for commitment verification");
    }
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? await this.getRelayerPubkey();
    const instructionParams = {
      poolA,
      poolB,
      tokenAMint: params.inputA.tokenMint,
      tokenBMint: params.inputB.tokenMint,
      lpPool,
      lpMint: params.lpMint,
      ammPool: params.poolId,
      relayer: relayerPubkey,
      proof,
      nullifierA,
      nullifierB,
      inputCommitmentA,
      inputCommitmentB,
      accountHashA: params.inputA.accountHash,
      accountHashB: params.inputB.accountHash,
      leafIndexA: params.inputA.leafIndex,
      leafIndexB: params.inputB.leafIndex,
      lpCommitment,
      changeACommitment,
      changeBCommitment,
      lpRandomness,
      changeARandomness,
      changeBRandomness,
      lpRecipient: params.lpRecipient,
      changeARecipient: params.changeARecipient,
      changeBRecipient: params.changeBRecipient,
      inputAAmount: params.inputA.amount,
      inputBAmount: params.inputB.amount,
      depositA: params.depositA,
      depositB: params.depositB,
      lpAmount,
      minLpAmount: params.minLpAmount
    };
    console.log("[Add Liquidity] === Starting Multi-Phase Add Liquidity ===");
    console.log("[Add Liquidity] Token A:", tokenAMint.toBase58());
    console.log("[Add Liquidity] Token B:", tokenBMint.toBase58());
    console.log("[Add Liquidity] Deposit A:", params.depositA.toString());
    console.log("[Add Liquidity] Deposit B:", params.depositB.toString());
    console.log("[Add Liquidity] LP amount:", lpAmount.toString());
    console.log("[Add Liquidity] Building phase transactions...");
    let phase0Tx, phase1aTx, phase1bTx, phase2aTx, phase2bTx, phase3Tx, operationId, pendingCommitments;
    try {
      const buildResult = await buildAddLiquidityWithProgram(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      phase0Tx = buildResult.tx;
      phase1aTx = buildResult.phase1aTx;
      phase1bTx = buildResult.phase1bTx;
      phase2aTx = buildResult.phase2aTx;
      phase2bTx = buildResult.phase2bTx;
      phase3Tx = buildResult.phase3Tx;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log("[Add Liquidity] Phase transactions built successfully");
    } catch (error) {
      console.error("[Add Liquidity] FAILED to build phase transactions:", error);
      throw error;
    }
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await import("./swap-MYDEZ2QE.mjs");
    console.log("[Add Liquidity] Building all transactions for batch signing...");
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: phase0Tx });
    transactionBuilders.push({ name: "Phase 1a (Verify Commit A)", builder: phase1aTx });
    transactionBuilders.push({ name: "Phase 1b (Verify Commit B)", builder: phase1bTx });
    transactionBuilders.push({ name: "Phase 2a (Create Null A)", builder: phase2aTx });
    transactionBuilders.push({ name: "Phase 2b (Create Null B)", builder: phase2bTx });
    transactionBuilders.push({ name: "Phase 3 (Execute Add Liq)", builder: phase3Tx });
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      if (pc.commitment.every((b) => b === 0)) continue;
      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram2(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${6 + i} (Commitment ${i})`, builder: commitmentTx });
    }
    const { tx: closeTx } = await buildClosePendingOperationWithProgram2(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: "Final (Close Pending)", builder: closeTx });
    console.log(`[Add Liquidity] Built ${transactionBuilders.length} transactions`);
    const lookupTables = await this.getAddressLookupTables();
    if (lookupTables.length === 0) {
      console.warn("[Add Liquidity] No Address Lookup Tables configured! May exceed size limit.");
      console.warn("[Add Liquidity] Run: pnpm tsx scripts/create-alt.ts to create an ALT");
    } else {
      console.log(`[Add Liquidity] Using ${lookupTables.length} Address Lookup Tables for compression`);
      lookupTables.forEach((alt, i) => {
        console.log(`[Add Liquidity] ALT ${i}: ${alt.state.addresses.length} addresses`);
      });
    }
    const { VersionedTransaction: VersionedTransaction2, TransactionMessage: TransactionMessage2 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];
          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);
          return new VersionedTransaction2(
            new TransactionMessage2({
              payerKey: relayerPubkey,
              recentBlockhash: blockhash,
              instructions: allInstructions
            }).compileToV0Message(lookupTables)
          );
        } catch (error) {
          console.error(`[Add Liquidity] Failed to build transaction: ${name}`, error);
          throw new Error(`Failed to build ${name}: ${error?.message || String(error)}`);
        }
      })
    );
    console.log("[Add Liquidity] Requesting signature for all transactions...");
    let signedTransactions;
    if (relayer) {
      signedTransactions = transactions.map((tx) => {
        tx.sign([relayer]);
        return tx;
      });
    } else if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === "function") {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error("Wallet does not support batch signing");
      }
    } else {
      throw new Error("No signing method available");
    }
    console.log(`[Add Liquidity] All ${signedTransactions.length} transactions signed!`);
    console.log("[Add Liquidity] Executing signed transactions sequentially...");
    let phase0Signature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      console.log(`[Add Liquidity] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log(`[Add Liquidity] ${name} confirmed: ${signature}`);
      if (i === 0) {
        phase0Signature = signature;
      }
    }
    console.log("[Add Liquidity] All transactions executed successfully!");
    return {
      signature: phase0Signature,
      slot: 0
    };
  }
  /**
   * Remove liquidity from an AMM pool
   *
   * @param params - Remove liquidity parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async removeLiquidity(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("swap/remove_liquidity")) {
      throw new Error("Prover not initialized. Call initializeProver(['swap/remove_liquidity']) first.");
    }
    const tokenAMint = params.tokenAMint;
    const tokenBMint = params.tokenBMint;
    const lpMint = params.lpInput.tokenMint instanceof Uint8Array ? new PublicKey9(params.lpInput.tokenMint) : params.lpInput.tokenMint;
    const [poolA] = derivePoolPda(tokenAMint, this.programId);
    const [poolB] = derivePoolPda(tokenBMint, this.programId);
    const [lpPool] = derivePoolPda(lpMint, this.programId);
    console.log("[Remove Liquidity] Pool PDAs:");
    console.log(`  Token A Pool: ${poolA.toBase58()}`);
    console.log(`  Token B Pool: ${poolB.toBase58()}`);
    console.log(`  LP Token Pool: ${lpPool.toBase58()}`);
    const { proof, lpNullifier, outputACommitment, outputBCommitment, outputARandomness, outputBRandomness } = await this.proofGenerator.generateRemoveLiquidityProof(
      params,
      this.wallet.keypair
    );
    const lpInputCommitment = computeCommitment(params.lpInput);
    if (!params.lpInput.accountHash) {
      throw new Error("LP input note must have accountHash for commitment verification");
    }
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? await this.getRelayerPubkey();
    const instructionParams = {
      lpPool,
      poolA,
      poolB,
      tokenAMint: params.tokenAMint,
      // Use raw format like addLiquidity
      tokenBMint: params.tokenBMint,
      // Use raw format like addLiquidity
      ammPool: params.poolId,
      relayer: relayerPubkey,
      proof,
      lpNullifier,
      lpInputCommitment,
      accountHash: params.lpInput.accountHash,
      leafIndex: params.lpInput.leafIndex,
      outputACommitment,
      outputBCommitment,
      oldPoolStateHash: params.oldPoolStateHash,
      newPoolStateHash: params.newPoolStateHash,
      outputARecipient: params.outputARecipient,
      outputBRecipient: params.outputBRecipient,
      lpAmount: params.lpAmount,
      outputAAmount: params.outputAAmount,
      outputBAmount: params.outputBAmount,
      outputARandomness,
      outputBRandomness
    };
    console.log("[Remove Liquidity] === Starting Multi-Phase Remove Liquidity ===");
    console.log("[Remove Liquidity] LP mint:", lpMint.toBase58());
    console.log("[Remove Liquidity] LP amount:", params.lpAmount.toString());
    console.log("[Remove Liquidity] Output A:", params.outputAAmount.toString());
    console.log("[Remove Liquidity] Output B:", params.outputBAmount.toString());
    console.log("[Remove Liquidity] Building phase transactions...");
    let phase0Tx, phase1Tx, phase2Tx, phase3Tx, operationId, pendingCommitments;
    try {
      const buildResult = await buildRemoveLiquidityWithProgram(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      phase0Tx = buildResult.tx;
      phase1Tx = buildResult.phase1Tx;
      phase2Tx = buildResult.phase2Tx;
      phase3Tx = buildResult.phase3Tx;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log("[Remove Liquidity] Phase transactions built successfully");
    } catch (error) {
      console.error("[Remove Liquidity] FAILED to build phase transactions:", error);
      throw error;
    }
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await import("./swap-MYDEZ2QE.mjs");
    console.log("[Remove Liquidity] Building all transactions for batch signing...");
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: phase0Tx });
    transactionBuilders.push({ name: "Phase 1 (Verify LP Commit)", builder: phase1Tx });
    transactionBuilders.push({ name: "Phase 2 (Create LP Null)", builder: phase2Tx });
    transactionBuilders.push({ name: "Phase 3 (Execute Remove Liq)", builder: phase3Tx });
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      if (pc.commitment.every((b) => b === 0)) continue;
      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram2(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4 + i} (Commitment ${i})`, builder: commitmentTx });
    }
    const { tx: closeTx } = await buildClosePendingOperationWithProgram2(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: "Final (Close Pending)", builder: closeTx });
    console.log(`[Remove Liquidity] Built ${transactionBuilders.length} transactions`);
    const lookupTables = await this.getAddressLookupTables();
    if (lookupTables.length === 0) {
      console.warn("[Remove Liquidity] No Address Lookup Tables configured! May exceed size limit.");
      console.warn("[Remove Liquidity] Run: pnpm tsx scripts/create-alt.ts to create an ALT");
    } else {
      console.log(`[Remove Liquidity] Using ${lookupTables.length} Address Lookup Tables for compression`);
      lookupTables.forEach((alt, i) => {
        console.log(`[Remove Liquidity] ALT ${i}: ${alt.state.addresses.length} addresses`);
      });
    }
    const { VersionedTransaction: VersionedTransaction2, TransactionMessage: TransactionMessage2 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];
          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);
          return new VersionedTransaction2(
            new TransactionMessage2({
              payerKey: relayerPubkey,
              recentBlockhash: blockhash,
              instructions: allInstructions
            }).compileToV0Message(lookupTables)
          );
        } catch (error) {
          console.error(`[Remove Liquidity] Failed to build transaction: ${name}`, error);
          throw new Error(`Failed to build ${name}: ${error?.message || String(error)}`);
        }
      })
    );
    console.log("[Remove Liquidity] Requesting signature for all transactions...");
    let signedTransactions;
    if (relayer) {
      signedTransactions = transactions.map((tx) => {
        tx.sign([relayer]);
        return tx;
      });
    } else if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === "function") {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error("Wallet does not support batch signing");
      }
    } else {
      throw new Error("No signing method available");
    }
    console.log(`[Remove Liquidity] All ${signedTransactions.length} transactions signed!`);
    console.log("[Remove Liquidity] Executing signed transactions sequentially...");
    let phase0Signature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      console.log(`[Remove Liquidity] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log(`[Remove Liquidity] ${name} confirmed: ${signature}`);
      if (i === 0) {
        phase0Signature = signature;
      }
    }
    console.log("[Remove Liquidity] All transactions executed successfully!");
    return {
      signature: phase0Signature,
      slot: 0
    };
  }
  // =============================================================================
  // Market Order Methods
  // =============================================================================
  /**
   * Fill a market order
   *
   * Atomically fills a maker's order by spending taker's input note
   * and exchanging tokens.
   *
   * @param params - Fill order parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async fillOrder(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("market/order_fill")) {
      throw new Error("Prover not initialized. Call initializeProver(['market/order_fill']) first.");
    }
    const proof = await this.proofGenerator.generateFillOrderProof(
      params,
      this.wallet.keypair
    );
    const [orderPda] = deriveOrderPda(params.orderId, this.programId);
    const orderAccount = await this.program.account.order.fetch(orderPda);
    const makerPool = new PublicKey9(orderAccount.makerPool || params.order.escrowCommitment);
    const takerInputMint = params.takerInput.tokenMint instanceof Uint8Array ? new PublicKey9(params.takerInput.tokenMint) : params.takerInput.tokenMint;
    const [takerPool] = derivePoolPda(takerInputMint, this.programId);
    const escrowNullifier = new Uint8Array(32);
    const takerNullifier = this.computeInputNullifier(params.takerInput);
    const makerOutCommitment = computeCommitment({
      stealthPubX: params.takerReceiveRecipient.stealthPubkey.x,
      tokenMint: takerInputMint,
      // Maker receives taker's payment
      amount: 0n,
      // Based on order terms
      randomness: generateRandomness()
    });
    const takerOutCommitment = computeCommitment({
      stealthPubX: params.takerReceiveRecipient.stealthPubkey.x,
      tokenMint: makerPool,
      // Taker receives maker's escrowed tokens
      amount: 0n,
      // Based on order terms
      randomness: generateRandomness()
    });
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const { tx, result } = await buildFillOrderWithProgram(
      this.program,
      {
        makerPool,
        takerPool,
        orderId: params.orderId,
        takerInput: {
          stealthPubX: params.takerInput.stealthPubX,
          amount: params.takerInput.amount,
          randomness: params.takerInput.randomness,
          leafIndex: params.takerInput.leafIndex,
          accountHash: params.takerInput.accountHash
        },
        makerOutputRecipient: params.takerReceiveRecipient,
        // Maker gets paid
        takerOutputRecipient: params.takerReceiveRecipient,
        // Taker gets offer
        takerChangeRecipient: params.takerChangeRecipient,
        relayer: relayer?.publicKey ?? await this.getRelayerPubkey(),
        makerProof: proof,
        // Same proof for simplified case
        takerProof: proof,
        escrowNullifier,
        takerNullifier,
        makerOutCommitment,
        takerOutCommitment,
        orderTerms: {
          offerAmount: 0n,
          requestAmount: 0n
        }
      },
      heliusRpcUrl
    );
    const signature = await tx.rpc();
    return {
      signature,
      slot: 0
    };
  }
  /**
   * Cancel a market order
   *
   * Cancels an open order and refunds the escrowed tokens to the maker.
   *
   * @param params - Cancel order parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async cancelOrder(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("market/order_cancel")) {
      throw new Error("Prover not initialized. Call initializeProver(['market/order_cancel']) first.");
    }
    const proof = await this.proofGenerator.generateCancelOrderProof(
      params,
      this.wallet.keypair
    );
    const [orderPda] = deriveOrderPda(params.orderId, this.programId);
    const orderAccount = await this.program.account.order.fetch(orderPda);
    const pool = new PublicKey9(orderAccount.pool || orderAccount.makerPool);
    const escrowNullifier = new Uint8Array(32);
    const refundCommitment = computeCommitment({
      stealthPubX: params.refundRecipient.stealthPubkey.x,
      tokenMint: pool,
      amount: 0n,
      // Full escrow amount
      randomness: generateRandomness()
    });
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const { tx, result } = await buildCancelOrderWithProgram(
      this.program,
      {
        pool,
        orderId: params.orderId,
        refundRecipient: params.refundRecipient,
        relayer: relayer?.publicKey ?? await this.getRelayerPubkey(),
        proof,
        escrowNullifier,
        refundCommitment,
        escrowedAmount: 0n
        // From order
      },
      heliusRpcUrl
    );
    const signature = await tx.rpc();
    return {
      signature,
      slot: 0
    };
  }
  // =============================================================================
  // Governance Methods
  // =============================================================================
  /**
   * Create a new vote aggregation
   *
   * Sets up an encrypted voting aggregation for a proposal.
   *
   * @param params - Aggregation parameters
   * @param payer - Payer for transaction fees
   */
  async createAggregation(params, payer) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const tx = await buildCreateAggregationWithProgram(
      this.program,
      {
        id: params.id,
        tokenMint: params.tokenMint,
        thresholdPubkey: params.thresholdPubkey.x,
        threshold: params.threshold,
        numOptions: params.numOptions,
        deadline: params.deadline,
        actionDomain: params.actionDomain,
        authority: payer.publicKey,
        payer: payer.publicKey
      }
    );
    const signature = await tx.rpc();
    return {
      signature,
      slot: 0
    };
  }
  /**
   * Submit an encrypted vote
   *
   * Generates ZK proof of voting power and encrypts vote choice.
   *
   * @param params - Vote parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async submitVote(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("governance/encrypted_submit")) {
      throw new Error("Prover not initialized. Call initializeProver(['governance/encrypted_submit']) first.");
    }
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? new PublicKey9(params.input.tokenMint) : params.input.tokenMint;
    const [tokenPool] = derivePoolPda(tokenMint, this.programId);
    const randomness = generateVoteRandomness();
    const voteOption = params.voteChoice === 0 ? 0 /* Yes */ : params.voteChoice === 1 ? 1 /* No */ : 2 /* Abstain */;
    const encryptedVote = encryptVote(
      params.input.amount,
      // voting power
      voteOption,
      params.electionPubkey,
      randomness
    );
    const encryptedVotes = serializeEncryptedVote(encryptedVote);
    const actionNullifier = poseidonHash([
      params.aggregationId,
      this.wallet.keypair.spending.sk
    ]);
    const proof = await this.proofGenerator.generateVoteProof(
      {
        input: params.input,
        merkleRoot: params.input.commitment,
        // Dummy - verified via Light Protocol
        merklePath: Array(32).fill(new Uint8Array(32)),
        merkleIndices: Array(32).fill(0),
        proposalId: params.aggregationId,
        voteChoice: params.voteChoice,
        electionPubkey: params.electionPubkey,
        encryptionRandomness: {
          yes: fieldToBytes(randomness.yes),
          no: fieldToBytes(randomness.no),
          abstain: fieldToBytes(randomness.abstain)
        }
      },
      this.wallet.keypair
    );
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const tx = await buildSubmitVoteWithProgram(
      this.program,
      {
        aggregationId: params.aggregationId,
        tokenPool,
        input: {
          stealthPubX: params.input.stealthPubX,
          amount: params.input.amount,
          randomness: params.input.randomness,
          leafIndex: params.input.leafIndex,
          accountHash: params.input.accountHash
        },
        actionNullifier,
        encryptedVotes,
        proof,
        relayer: relayer?.publicKey ?? await this.getRelayerPubkey()
      },
      heliusRpcUrl
    );
    const signature = await tx.rpc();
    return {
      signature,
      slot: 0
    };
  }
  /**
   * Submit a decryption share (committee member only)
   *
   * After voting ends, committee members submit their decryption shares
   * to enable threshold decryption of the aggregated votes.
   *
   * @param params - Decryption share parameters
   * @param memberKeypair - Committee member's keypair (has secret share)
   * @param secretKeyShare - Member's secret key share for decryption
   */
  async submitDecryptionShare(params, memberKeypair, secretKeyShare, memberIndex) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const sharesArray = params.shares;
    const proofsArray = params.dleqProofs;
    const tx = await buildSubmitDecryptionShareWithProgram(
      this.program,
      {
        aggregationId: params.aggregationId,
        memberIndex,
        shares: sharesArray,
        dleqProofs: proofsArray,
        member: memberKeypair.publicKey
      }
    );
    const signature = await tx.rpc();
    return {
      signature,
      slot: 0
    };
  }
  /**
   * Finalize voting and publish results
   *
   * Called by the authority after threshold decryption completes.
   *
   * @param params - Finalize parameters with decrypted totals
   * @param authority - Authority keypair
   */
  async finalizeVoting(params, authority) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const tx = await buildFinalizeDecryptionWithProgram(
      this.program,
      {
        aggregationId: params.aggregationId,
        totals: params.totals,
        authority: authority.publicKey
      }
    );
    const signature = await tx.rpc();
    return {
      signature,
      slot: 0
    };
  }
  /**
   * Get aggregation state
   *
   * Fetches the current state of a vote aggregation.
   */
  async getAggregation(aggregationId) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const [aggregationPda] = deriveAggregationPda(aggregationId, this.programId);
    try {
      const aggregation = await this.program.account.aggregation.fetch(aggregationPda);
      return aggregation;
    } catch (e) {
      const msg = e.message?.toLowerCase() ?? "";
      if (msg.includes("account does not exist") || msg.includes("could not find") || msg.includes("not found")) {
        return null;
      }
      throw e;
    }
  }
  /**
   * Helper to compute input nullifier
   */
  computeInputNullifier(input) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    let stealthSpendingKey;
    if (input.stealthEphemeralPubkey) {
      const baseSpendingKey = bytesToField(this.wallet.keypair.spending.sk);
      stealthSpendingKey = deriveStealthPrivateKey(baseSpendingKey, input.stealthEphemeralPubkey);
    } else {
      stealthSpendingKey = bytesToField(this.wallet.keypair.spending.sk);
    }
    const stealthNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
    const inputCommitment = computeCommitment(input);
    return deriveSpendingNullifier(stealthNullifierKey, inputCommitment, input.leafIndex);
  }
  /**
   * Scan for unspent notes belonging to the current wallet
   *
   * Uses the Light Protocol scanner to find and decrypt notes,
   * then filters out spent notes using nullifier detection.
   *
   * @param tokenMint - Optional token mint to filter by (derives pool PDA internally)
   */
  async scanNotes(tokenMint) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    let poolPda;
    if (tokenMint) {
      [poolPda] = PublicKey9.findProgramAddressSync(
        [Buffer.from("pool"), tokenMint.toBuffer()],
        this.programId
      );
    }
    return this.lightClient.getUnspentNotes(viewingKey, nullifierKey, this.programId, poolPda);
  }
  /**
   * Get balance for the current wallet
   *
   * Scans for unspent notes and sums their amounts
   *
   * @param tokenMint - Optional token mint to filter by (derives pool PDA internally)
   */
  async getPrivateBalance(tokenMint) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    let poolPda;
    if (tokenMint) {
      [poolPda] = PublicKey9.findProgramAddressSync(
        [Buffer.from("pool"), tokenMint.toBuffer()],
        this.programId
      );
    }
    return this.lightClient.getBalance(viewingKey, nullifierKey, this.programId, poolPda);
  }
  /**
   * Clear the note scanning cache
   *
   * Call this after transactions to ensure fresh data on next scan.
   * The cache improves performance by skipping already-processed accounts,
   * but should be cleared after state changes.
   */
  clearScanCache() {
    this.lightClient?.clearCache();
  }
  // =============================================================================
  // Private Methods
  // =============================================================================
  async buildAdapterSwapTransaction(_params, _proof) {
    const tx = new Transaction2();
    return tx;
  }
  async buildCreateOrderTransaction(_params, _proof) {
    const tx = new Transaction2();
    return tx;
  }
  async getRelayer() {
    throw new Error("No relayer configured");
  }
  decodePoolState(_data) {
    throw new Error("Not implemented");
  }
  /**
   * Prepare inputs for proving
   */
  async prepareInputs(inputs) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    return inputs.map((input) => ({ ...input }));
  }
  /**
   * Prepare outputs by computing commitments
   *
   * @param outputs - Output recipients and amounts
   * @param tokenMint - Token mint for all outputs (must match inputs)
   */
  async prepareOutputs(outputs, tokenMint) {
    return outputs.map((output) => {
      const isDummy = output.recipient.stealthPubkey.x.every((b) => b === 0);
      const randomness = isDummy ? new Uint8Array(32) : generateRandomness();
      const note = createNote(
        output.recipient.stealthPubkey.x,
        tokenMint,
        output.amount,
        randomness
      );
      const commitment = computeCommitment(note);
      if (isDummy) {
        console.log("[prepareOutputs] Dummy output detected - using zero randomness");
        console.log("[prepareOutputs] Dummy commitment:", Buffer.from(commitment).toString("hex").slice(0, 32) + "...");
      }
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
   * Fetch merkle proof from Light Protocol
   *
   * Uses accountHash if available (from scanner), otherwise derives address.
   */
  async fetchMerkleProof(note) {
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    if (note.accountHash) {
      const proof2 = await this.lightClient.getMerkleProofByHash(note.accountHash);
      return {
        root: proof2.root,
        pathElements: proof2.pathElements,
        pathIndices: proof2.pathIndices,
        leafIndex: proof2.leafIndex
      };
    }
    const trees = this.getLightTrees();
    const stateTreeSet = trees.stateTrees[0];
    const proof = await this.lightClient.getCommitmentMerkleProof(
      note.pool,
      note.commitment,
      this.programId,
      trees.addressTree,
      stateTreeSet.stateTree
    );
    return {
      root: proof.root,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
      leafIndex: proof.leafIndex
    };
  }
};

// src/amm/pool.ts
import { PublicKey as PublicKey10 } from "@solana/web3.js";
import { keccak_256 } from "@noble/hashes/sha3";
async function fetchAmmPool(connection, ammPoolPda) {
  const accountInfo = await connection.getAccountInfo(ammPoolPda);
  if (!accountInfo) {
    throw new Error(`AMM pool account not found: ${ammPoolPda.toBase58()}`);
  }
  const data = accountInfo.data;
  return deserializeAmmPool(data);
}
function deserializeAmmPool(data) {
  let offset = 8;
  const poolId = new PublicKey10(data.slice(offset, offset + 32));
  offset += 32;
  const tokenAMint = new PublicKey10(data.slice(offset, offset + 32));
  offset += 32;
  const tokenBMint = new PublicKey10(data.slice(offset, offset + 32));
  offset += 32;
  const lpMint = new PublicKey10(data.slice(offset, offset + 32));
  offset += 32;
  const stateHash = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset + offset);
  const reserveA = view.getBigUint64(0, true);
  const reserveB = view.getBigUint64(8, true);
  const lpSupply = view.getBigUint64(16, true);
  const feeBps = view.getUint16(24, true);
  offset += 26;
  const authority = new PublicKey10(data.slice(offset, offset + 32));
  offset += 32;
  const isActive = data[offset] === 1;
  offset += 1;
  const bump = data[offset];
  offset += 1;
  const lpMintBump = data[offset];
  return {
    poolId,
    tokenAMint,
    tokenBMint,
    lpMint,
    stateHash,
    reserveA,
    reserveB,
    lpSupply,
    feeBps,
    authority,
    isActive,
    bump,
    lpMintBump
  };
}
function computeAmmStateHash(reserveA, reserveB, lpSupply, poolId) {
  const data = new Uint8Array(56);
  const view = new DataView(data.buffer);
  view.setBigUint64(0, reserveA, true);
  view.setBigUint64(8, reserveB, true);
  view.setBigUint64(16, lpSupply, true);
  data.set(poolId.toBytes(), 24);
  return keccak_256(data);
}
async function ammPoolExists(connection, tokenAMint, tokenBMint, programId) {
  const [poolPda] = deriveAmmPoolPda(tokenAMint, tokenBMint, programId);
  const accountInfo = await connection.getAccountInfo(poolPda);
  return accountInfo !== null;
}
async function getAmmPool(connection, tokenAMint, tokenBMint, programId) {
  const [poolPda] = deriveAmmPoolPda(tokenAMint, tokenBMint, programId);
  try {
    return await fetchAmmPool(connection, poolPda);
  } catch (error) {
    return null;
  }
}
async function refreshAmmPool(connection, pool) {
  return fetchAmmPool(connection, pool.poolId);
}
function verifyAmmStateHash(pool) {
  const computedHash = computeAmmStateHash(
    pool.reserveA,
    pool.reserveB,
    pool.lpSupply,
    pool.poolId
  );
  if (computedHash.length !== pool.stateHash.length) {
    return false;
  }
  for (let i = 0; i < computedHash.length; i++) {
    if (computedHash[i] !== pool.stateHash[i]) {
      return false;
    }
  }
  return true;
}
function formatAmmPool(pool, decimalsA = 9, decimalsB = 9) {
  const reserveAFormatted = Number(pool.reserveA) / Math.pow(10, decimalsA);
  const reserveBFormatted = Number(pool.reserveB) / Math.pow(10, decimalsB);
  const lpSupplyFormatted = Number(pool.lpSupply) / Math.pow(10, 9);
  const priceRatio = pool.reserveA > 0n ? Number(pool.reserveB) / Number(pool.reserveA) * Math.pow(10, decimalsA - decimalsB) : 0;
  return {
    poolId: pool.poolId.toBase58(),
    tokenAMint: pool.tokenAMint.toBase58(),
    tokenBMint: pool.tokenBMint.toBase58(),
    lpMint: pool.lpMint.toBase58(),
    reserveA: reserveAFormatted,
    reserveB: reserveBFormatted,
    lpSupply: lpSupplyFormatted,
    priceRatio,
    // Token B per Token A
    feeBps: pool.feeBps,
    feePercent: pool.feeBps / 100,
    isActive: pool.isActive
  };
}

// src/amm/calculations.ts
function calculateSwapOutput(inputAmount, reserveIn, reserveOut, feeBps = 30) {
  if (inputAmount === 0n) {
    return { outputAmount: 0n, priceImpact: 0 };
  }
  if (reserveIn === 0n || reserveOut === 0n) {
    throw new Error("Pool has no liquidity");
  }
  const feeMultiplier = BigInt(1e4 - feeBps);
  const amountWithFee = inputAmount * feeMultiplier;
  const numerator = reserveOut * amountWithFee;
  const denominator = reserveIn * 10000n + amountWithFee;
  const outputAmount = numerator / denominator;
  const priceImpact = Number(inputAmount * 10000n / reserveIn) / 100;
  return { outputAmount, priceImpact };
}
function calculateMinOutput(outputAmount, slippageBps) {
  if (slippageBps < 0 || slippageBps > 1e4) {
    throw new Error("Slippage must be between 0 and 10000 bps");
  }
  const minOutput = outputAmount * BigInt(1e4 - slippageBps) / 10000n;
  return minOutput;
}
function calculateAddLiquidityAmounts(desiredA, desiredB, reserveA, reserveB, lpSupply) {
  if (desiredA === 0n || desiredB === 0n) {
    throw new Error("Desired amounts must be greater than 0");
  }
  if (reserveA === 0n && reserveB === 0n && lpSupply === 0n) {
    const lpAmount2 = sqrt(desiredA * desiredB);
    return {
      depositA: desiredA,
      depositB: desiredB,
      lpAmount: lpAmount2
    };
  }
  if (reserveA === 0n || reserveB === 0n) {
    throw new Error("Pool reserves cannot be zero after initialization");
  }
  const optimalB = desiredA * reserveB / reserveA;
  let depositA;
  let depositB;
  if (optimalB <= desiredB) {
    depositA = desiredA;
    depositB = optimalB;
  } else {
    const optimalA = desiredB * reserveA / reserveB;
    depositA = optimalA;
    depositB = desiredB;
  }
  const lpAmountA = depositA * lpSupply / reserveA;
  const lpAmountB = depositB * lpSupply / reserveB;
  const lpAmount = lpAmountA < lpAmountB ? lpAmountA : lpAmountB;
  return { depositA, depositB, lpAmount };
}
function calculateRemoveLiquidityOutput(lpAmount, lpSupply, reserveA, reserveB) {
  if (lpAmount === 0n) {
    return { outputA: 0n, outputB: 0n };
  }
  if (lpSupply === 0n) {
    throw new Error("No LP tokens in circulation");
  }
  if (lpAmount > lpSupply) {
    throw new Error("LP amount exceeds total supply");
  }
  const outputA = lpAmount * reserveA / lpSupply;
  const outputB = lpAmount * reserveB / lpSupply;
  return { outputA, outputB };
}
function calculatePriceImpact(inputAmount, reserveIn, reserveOut) {
  if (inputAmount === 0n || reserveIn === 0n) {
    return 0;
  }
  const impact = Number(inputAmount * 10000n / reserveIn) / 100;
  if (impact > 1) {
    const priceBefore = Number(reserveOut) / Number(reserveIn);
    const newReserveIn = reserveIn + inputAmount;
    const { outputAmount } = calculateSwapOutput(inputAmount, reserveIn, reserveOut);
    const newReserveOut = reserveOut - outputAmount;
    const priceAfter = Number(newReserveOut) / Number(newReserveIn);
    const exactImpact = Math.abs((priceAfter - priceBefore) / priceBefore) * 100;
    return exactImpact;
  }
  return impact;
}
function calculateSlippage(expectedOutput, minOutput) {
  if (expectedOutput === 0n) {
    return 0;
  }
  const slippage = Number((expectedOutput - minOutput) * 10000n / expectedOutput) / 100;
  return slippage;
}
function calculatePriceRatio(reserveA, reserveB, decimalsA = 9, decimalsB = 9) {
  if (reserveA === 0n) {
    return 0;
  }
  const decimalAdjustment = Math.pow(10, decimalsB - decimalsA);
  const ratio = Number(reserveB) / Number(reserveA) * decimalAdjustment;
  return ratio;
}
function calculateTotalLiquidity(reserveA, reserveB, priceRatio) {
  const reserveBInA = BigInt(Math.floor(Number(reserveB) / priceRatio));
  return reserveA + reserveBInA;
}
function sqrt(value) {
  if (value < 0n) {
    throw new Error("Square root of negative number");
  }
  if (value === 0n) return 0n;
  if (value < 4n) return 1n;
  let z = value;
  let x = value / 2n + 1n;
  while (x < z) {
    z = x;
    x = (value / x + x) / 2n;
  }
  return z;
}
function validateSwapAmount(inputAmount, maxBalance, slippageBps) {
  if (inputAmount <= 0n) {
    return "Amount must be greater than 0";
  }
  if (inputAmount > maxBalance) {
    return "Insufficient balance";
  }
  if (slippageBps < 0 || slippageBps > 1e4) {
    return "Slippage must be between 0 and 100%";
  }
  return null;
}
function validateLiquidityAmounts(amountA, amountB, balanceA, balanceB) {
  if (amountA <= 0n || amountB <= 0n) {
    return "Amounts must be greater than 0";
  }
  if (amountA > balanceA) {
    return "Insufficient balance for token A";
  }
  if (amountB > balanceB) {
    return "Insufficient balance for token B";
  }
  return null;
}

// src/versioned-transaction.ts
import {
  TransactionMessage,
  VersionedTransaction,
  ComputeBudgetProgram as ComputeBudgetProgram5
} from "@solana/web3.js";
var MAX_TRANSACTION_SIZE = 1232;
async function buildVersionedTransaction(connection, instructions, payer, config = {}) {
  const computeBudgetIxs = [];
  const computeUnits = config.computeUnits ?? 14e5;
  computeBudgetIxs.push(
    ComputeBudgetProgram5.setComputeUnitLimit({ units: computeUnits })
  );
  if (config.computeUnitPrice !== void 0) {
    computeBudgetIxs.push(
      ComputeBudgetProgram5.setComputeUnitPrice({ microLamports: config.computeUnitPrice })
    );
  }
  const allInstructions = [...computeBudgetIxs, ...instructions];
  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: allInstructions
  }).compileToV0Message(config.lookupTables);
  const versionedTx = new VersionedTransaction(messageV0);
  return versionedTx;
}
function estimateTransactionSize(tx) {
  try {
    const serialized = tx.serialize();
    return serialized.length;
  } catch (err) {
    console.error("[Versioned TX] Failed to serialize transaction:", err);
    return -1;
  }
}
async function canFitInSingleTransaction(connection, instructions, payer, config = {}) {
  try {
    const tx = await buildVersionedTransaction(connection, instructions, payer, config);
    const size = estimateTransactionSize(tx);
    if (size === -1) {
      console.log("[Versioned TX] Transaction serialization failed - too large or malformed");
      return false;
    }
    console.log(`[Versioned TX] Estimated size: ${size}/${MAX_TRANSACTION_SIZE} bytes`);
    return size <= MAX_TRANSACTION_SIZE;
  } catch (err) {
    console.error("[Versioned TX] Size check failed:", err);
    return false;
  }
}
async function buildAtomicMultiPhaseTransaction(connection, phases, payer, config = {}) {
  const allInstructions = [
    phases.phase1,
    ...phases.nullifiers,
    ...phases.commitments,
    phases.cleanup
  ];
  console.log(`[Atomic TX] Building transaction with ${allInstructions.length} instructions`);
  console.log(`  - Phase 1: 1 instruction`);
  console.log(`  - Nullifiers: ${phases.nullifiers.length} instructions`);
  console.log(`  - Commitments: ${phases.commitments.length} instructions`);
  console.log(`  - Cleanup: 1 instruction`);
  const canFit = await canFitInSingleTransaction(connection, allInstructions, payer, config);
  if (!canFit) {
    console.log("[Atomic TX] Transaction too large, falling back to sequential execution");
    return null;
  }
  const tx = await buildVersionedTransaction(connection, allInstructions, payer, config);
  console.log("[Atomic TX] Transaction built successfully");
  return tx;
}
async function executeVersionedTransaction(connection, tx, options = {}) {
  const maxRetries = options.maxRetries ?? 3;
  const skipPreflight = options.skipPreflight ?? false;
  let lastError = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Versioned TX] Sending transaction (attempt ${attempt + 1}/${maxRetries})...`);
      const rawTransaction = tx.serialize();
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight,
        maxRetries: 0,
        // Handle retries ourselves
        preflightCommitment: "confirmed"
      });
      console.log(`[Versioned TX] Transaction sent: ${signature}`);
      console.log(`[Versioned TX] Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
      const latestBlockhash = await connection.getLatestBlockhash("confirmed");
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
      }, "confirmed");
      if (confirmation.value.err) {
        console.error("[Versioned TX] Transaction failed:", confirmation.value.err);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[Versioned TX] \u2705 Transaction confirmed successfully: ${signature}`);
      return signature;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[Versioned TX] Attempt ${attempt + 1} failed:`, lastError.message);
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1e3 * Math.pow(2, attempt), 5e3);
        console.log(`[Versioned TX] Retrying in ${delay}ms...`);
        await new Promise((resolve2) => setTimeout(resolve2, delay));
      }
    }
  }
  throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
}
async function getInstructionFromAnchorMethod(methodBuilder) {
  return await methodBuilder.instruction();
}

// src/history.ts
var TransactionType = /* @__PURE__ */ ((TransactionType2) => {
  TransactionType2["SHIELD"] = "shield";
  TransactionType2["UNSHIELD"] = "unshield";
  TransactionType2["TRANSFER"] = "transfer";
  TransactionType2["SWAP"] = "swap";
  TransactionType2["ADD_LIQUIDITY"] = "add_liquidity";
  TransactionType2["REMOVE_LIQUIDITY"] = "remove_liquidity";
  return TransactionType2;
})(TransactionType || {});
var TransactionStatus = /* @__PURE__ */ ((TransactionStatus2) => {
  TransactionStatus2["PENDING"] = "pending";
  TransactionStatus2["CONFIRMED"] = "confirmed";
  TransactionStatus2["FAILED"] = "failed";
  return TransactionStatus2;
})(TransactionStatus || {});
var STORAGE_KEY_PREFIX = "cloakcraft_tx_history_";
var DB_NAME = "CloakCraftHistory";
var DB_VERSION = 1;
var STORE_NAME = "transactions";
var TransactionHistory = class {
  constructor(walletPublicKey) {
    this.db = null;
    this.useIndexedDB = false;
    this.walletId = typeof walletPublicKey === "string" ? walletPublicKey : walletPublicKey.toBase58();
  }
  /**
   * Initialize the database
   */
  async initialize() {
    if (typeof window === "undefined") {
      this.useIndexedDB = false;
      return;
    }
    try {
      this.db = await this.openDatabase();
      this.useIndexedDB = true;
    } catch (err) {
      console.warn("[TransactionHistory] IndexedDB not available, falling back to localStorage");
      this.useIndexedDB = false;
    }
  }
  /**
   * Open IndexedDB database
   */
  openDatabase() {
    return new Promise((resolve2, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve2(request.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
          store.createIndex("walletId", "walletId", { unique: false });
          store.createIndex("type", "type", { unique: false });
          store.createIndex("status", "status", { unique: false });
          store.createIndex("timestamp", "timestamp", { unique: false });
          store.createIndex("tokenMint", "tokenMint", { unique: false });
        }
      };
    });
  }
  /**
   * Generate a unique transaction ID
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }
  /**
   * Add a new transaction record
   */
  async addTransaction(params) {
    const record = {
      ...params,
      id: this.generateId(),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (this.useIndexedDB && this.db) {
      await this.saveToIndexedDB(record);
    } else {
      this.saveToLocalStorage(record);
    }
    return record;
  }
  /**
   * Update an existing transaction record
   */
  async updateTransaction(id, updates) {
    const existing = await this.getTransaction(id);
    if (!existing) return null;
    const updated = {
      ...existing,
      ...updates
    };
    if (this.useIndexedDB && this.db) {
      await this.saveToIndexedDB(updated);
    } else {
      this.saveToLocalStorage(updated);
    }
    return updated;
  }
  /**
   * Get a single transaction by ID
   */
  async getTransaction(id) {
    if (this.useIndexedDB && this.db) {
      return this.getFromIndexedDB(id);
    }
    return this.getFromLocalStorage(id);
  }
  /**
   * Get transaction history with optional filters
   */
  async getTransactions(filter) {
    let transactions;
    if (this.useIndexedDB && this.db) {
      transactions = await this.getAllFromIndexedDB();
    } else {
      transactions = this.getAllFromLocalStorage();
    }
    if (filter) {
      transactions = transactions.filter((tx) => {
        if (filter.type && tx.type !== filter.type) return false;
        if (filter.status && tx.status !== filter.status) return false;
        if (filter.tokenMint && tx.tokenMint !== filter.tokenMint) return false;
        if (filter.after && new Date(tx.timestamp) < filter.after) return false;
        if (filter.before && new Date(tx.timestamp) > filter.before) return false;
        return true;
      });
    }
    transactions.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter?.offset) {
      transactions = transactions.slice(filter.offset);
    }
    if (filter?.limit) {
      transactions = transactions.slice(0, filter.limit);
    }
    return transactions;
  }
  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit = 10) {
    return this.getTransactions({ limit });
  }
  /**
   * Delete a transaction record
   */
  async deleteTransaction(id) {
    if (this.useIndexedDB && this.db) {
      return this.deleteFromIndexedDB(id);
    }
    return this.deleteFromLocalStorage(id);
  }
  /**
   * Clear all transaction history
   */
  async clearHistory() {
    if (this.useIndexedDB && this.db) {
      await this.clearIndexedDB();
    } else {
      this.clearLocalStorage();
    }
  }
  /**
   * Get transaction count
   */
  async getTransactionCount(filter) {
    const transactions = await this.getTransactions(filter);
    return transactions.length;
  }
  /**
   * Get transaction summary (counts by type and status)
   */
  async getSummary() {
    const transactions = await this.getTransactions();
    const byType = {};
    const byStatus = {};
    for (const tx of transactions) {
      byType[tx.type] = (byType[tx.type] || 0) + 1;
      byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;
    }
    return {
      total: transactions.length,
      byType,
      byStatus
    };
  }
  // =========================================================================
  // IndexedDB Methods
  // =========================================================================
  async saveToIndexedDB(record) {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve2, reject) => {
      const transaction = this.db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ ...record, walletId: this.walletId });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve2();
    });
  }
  async getFromIndexedDB(id) {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve2, reject) => {
      const transaction = this.db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.walletId === this.walletId) {
          const { walletId, ...record } = result;
          resolve2(record);
        } else {
          resolve2(null);
        }
      };
    });
  }
  async getAllFromIndexedDB() {
    if (!this.db) throw new Error("Database not initialized");
    return new Promise((resolve2, reject) => {
      const transaction = this.db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index("walletId");
      const request = index.getAll(this.walletId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result.map((r) => {
          const { walletId, ...record } = r;
          return record;
        });
        resolve2(results);
      };
    });
  }
  async deleteFromIndexedDB(id) {
    if (!this.db) throw new Error("Database not initialized");
    const existing = await this.getFromIndexedDB(id);
    if (!existing) return false;
    return new Promise((resolve2, reject) => {
      const transaction = this.db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve2(true);
    });
  }
  async clearIndexedDB() {
    if (!this.db) throw new Error("Database not initialized");
    const records = await this.getAllFromIndexedDB();
    return new Promise((resolve2, reject) => {
      const transaction = this.db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      let completed = 0;
      const total = records.length;
      if (total === 0) {
        resolve2();
        return;
      }
      for (const record of records) {
        const request = store.delete(record.id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve2();
        };
      }
    });
  }
  // =========================================================================
  // LocalStorage Methods (fallback)
  // =========================================================================
  getStorageKey() {
    return `${STORAGE_KEY_PREFIX}${this.walletId}`;
  }
  saveToLocalStorage(record) {
    const key = this.getStorageKey();
    const existing = this.getAllFromLocalStorage();
    const index = existing.findIndex((t) => t.id === record.id);
    if (index >= 0) {
      existing[index] = record;
    } else {
      existing.push(record);
    }
    try {
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (err) {
      console.error("[TransactionHistory] Failed to save to localStorage:", err);
    }
  }
  getFromLocalStorage(id) {
    const all = this.getAllFromLocalStorage();
    return all.find((t) => t.id === id) || null;
  }
  getAllFromLocalStorage() {
    const key = this.getStorageKey();
    try {
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  deleteFromLocalStorage(id) {
    const key = this.getStorageKey();
    const existing = this.getAllFromLocalStorage();
    const filtered = existing.filter((t) => t.id !== id);
    if (filtered.length === existing.length) return false;
    try {
      localStorage.setItem(key, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }
  clearLocalStorage() {
    const key = this.getStorageKey();
    try {
      localStorage.removeItem(key);
    } catch {
    }
  }
};
function createPendingTransaction(type, tokenMint, amount, options) {
  return {
    type,
    status: "pending" /* PENDING */,
    tokenMint: typeof tokenMint === "string" ? tokenMint : tokenMint.toBase58(),
    tokenSymbol: options?.tokenSymbol,
    amount: amount.toString(),
    secondaryAmount: options?.secondaryAmount?.toString(),
    secondaryTokenMint: options?.secondaryTokenMint ? typeof options.secondaryTokenMint === "string" ? options.secondaryTokenMint : options.secondaryTokenMint.toBase58() : void 0,
    secondaryTokenSymbol: options?.secondaryTokenSymbol,
    recipient: options?.recipient,
    metadata: options?.metadata
  };
}

// src/prices.ts
var DEFAULT_CACHE_TTL = 60 * 1e3;
var ERROR_BACKOFF_MS = 5 * 60 * 1e3;
var JUPITER_PRICE_API = "https://price.jup.ag/v6/price";
var SOL_MINT = "So11111111111111111111111111111111111111112";
var TokenPriceFetcher = class {
  constructor(cacheTtlMs = DEFAULT_CACHE_TTL) {
    this.cache = /* @__PURE__ */ new Map();
    this.pendingRequests = /* @__PURE__ */ new Map();
    this.apiUnavailableUntil = 0;
    this.consecutiveErrors = 0;
    this.cacheTtl = cacheTtlMs;
  }
  /**
   * Check if API is currently in backoff state
   */
  isApiUnavailable() {
    return Date.now() < this.apiUnavailableUntil;
  }
  /**
   * Mark API as unavailable for backoff period
   */
  markApiUnavailable() {
    this.consecutiveErrors++;
    const backoffMs = Math.min(ERROR_BACKOFF_MS * Math.pow(2, this.consecutiveErrors - 1), 30 * 60 * 1e3);
    this.apiUnavailableUntil = Date.now() + backoffMs;
    console.warn(`[TokenPriceFetcher] API unavailable, backing off for ${backoffMs / 1e3}s`);
  }
  /**
   * Mark API as available (reset backoff)
   */
  markApiAvailable() {
    this.consecutiveErrors = 0;
    this.apiUnavailableUntil = 0;
  }
  /**
   * Get price for a single token
   */
  async getPrice(mint) {
    const mintStr = typeof mint === "string" ? mint : mint.toBase58();
    const cached = this.getCached(mintStr);
    if (cached) return cached;
    if (this.isApiUnavailable()) {
      return null;
    }
    const pending = this.pendingRequests.get(mintStr);
    if (pending) return pending;
    const request = this.fetchPrice(mintStr);
    this.pendingRequests.set(mintStr, request);
    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(mintStr);
    }
  }
  /**
   * Get prices for multiple tokens
   */
  async getPrices(mints) {
    const mintStrs = mints.map((m) => typeof m === "string" ? m : m.toBase58());
    const result = /* @__PURE__ */ new Map();
    const uncached = [];
    for (const mint of mintStrs) {
      const cached = this.getCached(mint);
      if (cached) {
        result.set(mint, cached);
      } else {
        uncached.push(mint);
      }
    }
    if (uncached.length > 0 && !this.isApiUnavailable()) {
      const fetched = await this.fetchPrices(uncached);
      for (const [mint, price] of fetched) {
        result.set(mint, price);
      }
    }
    return result;
  }
  /**
   * Get SOL price in USD
   */
  async getSolPrice() {
    const price = await this.getPrice(SOL_MINT);
    return price?.priceUsd ?? 0;
  }
  /**
   * Convert token amount to USD value
   */
  async getUsdValue(mint, amount, decimals) {
    const price = await this.getPrice(mint);
    if (!price) return 0;
    const amountNumber = Number(amount) / Math.pow(10, decimals);
    return amountNumber * price.priceUsd;
  }
  /**
   * Get total USD value for multiple tokens
   */
  async getTotalUsdValue(balances) {
    const mints = balances.map(
      (b) => typeof b.mint === "string" ? b.mint : b.mint.toBase58()
    );
    const prices = await this.getPrices(mints);
    let total = 0;
    for (const balance of balances) {
      const mintStr = typeof balance.mint === "string" ? balance.mint : balance.mint.toBase58();
      const price = prices.get(mintStr);
      if (price) {
        const amountNumber = Number(balance.amount) / Math.pow(10, balance.decimals);
        total += amountNumber * price.priceUsd;
      }
    }
    return total;
  }
  /**
   * Clear the price cache
   */
  clearCache() {
    this.cache.clear();
  }
  /**
   * Get cached price if not expired
   */
  getCached(mint) {
    const entry = this.cache.get(mint);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(mint);
      return null;
    }
    return entry.price;
  }
  /**
   * Cache a price
   */
  setCache(price) {
    this.cache.set(price.mint, {
      price,
      expiresAt: Date.now() + this.cacheTtl
    });
  }
  /**
   * Fetch price for a single token from Jupiter
   */
  async fetchPrice(mint) {
    try {
      const url = `${JUPITER_PRICE_API}?ids=${mint}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status >= 500) {
          this.markApiUnavailable();
        }
        return null;
      }
      const data = await response.json();
      const priceData = data.data[mint];
      this.markApiAvailable();
      if (!priceData) {
        return null;
      }
      const price = {
        mint,
        priceUsd: priceData.price,
        updatedAt: Date.now()
      };
      this.setCache(price);
      return price;
    } catch (err) {
      this.markApiUnavailable();
      return null;
    }
  }
  /**
   * Fetch prices for multiple tokens from Jupiter (batch)
   */
  async fetchPrices(mints) {
    const result = /* @__PURE__ */ new Map();
    if (mints.length === 0) return result;
    try {
      const url = `${JUPITER_PRICE_API}?ids=${mints.join(",")}`;
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status >= 500) {
          this.markApiUnavailable();
        }
        return result;
      }
      const data = await response.json();
      this.markApiAvailable();
      for (const mint of mints) {
        const priceData = data.data[mint];
        if (priceData) {
          const price = {
            mint,
            priceUsd: priceData.price,
            updatedAt: Date.now()
          };
          this.setCache(price);
          result.set(mint, price);
        }
      }
    } catch (err) {
      this.markApiUnavailable();
    }
    return result;
  }
  /**
   * Check if price API is currently available
   */
  isAvailable() {
    return !this.isApiUnavailable();
  }
  /**
   * Force reset the backoff state (for manual retry)
   */
  resetBackoff() {
    this.markApiAvailable();
  }
};
function formatPrice(price, decimals = 2) {
  if (price === 0) return "$0.00";
  if (price < 0.01) {
    return `$${price.toFixed(6)}`;
  }
  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }
  if (price >= 1e6) {
    return `$${(price / 1e6).toFixed(2)}M`;
  }
  if (price >= 1e3) {
    return `$${(price / 1e3).toFixed(2)}K`;
  }
  return `$${price.toFixed(decimals)}`;
}
function formatPriceChange(change) {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}
function calculateUsdPriceImpact(inputAmount, outputAmount, inputPrice, outputPrice, inputDecimals, outputDecimals) {
  if (inputPrice === 0 || outputPrice === 0) return 0;
  const inputValue = Number(inputAmount) / Math.pow(10, inputDecimals) * inputPrice;
  const outputValue = Number(outputAmount) / Math.pow(10, outputDecimals) * outputPrice;
  if (inputValue === 0) return 0;
  const impact = (inputValue - outputValue) / inputValue * 100;
  return Math.max(0, impact);
}

// src/analytics.ts
var PoolAnalyticsCalculator = class {
  constructor(priceFetcher) {
    this.priceFetcher = priceFetcher || new TokenPriceFetcher();
  }
  /**
   * Calculate statistics for a single pool
   */
  async calculatePoolStats(pool, tokenADecimals = 9, tokenBDecimals = 9) {
    const prices = await this.priceFetcher.getPrices([
      pool.tokenAMint,
      pool.tokenBMint
    ]);
    const tokenAPrice = prices.get(pool.tokenAMint.toBase58())?.priceUsd ?? 0;
    const tokenBPrice = prices.get(pool.tokenBMint.toBase58())?.priceUsd ?? 0;
    const tokenAValueUsd = Number(pool.reserveA) / Math.pow(10, tokenADecimals) * tokenAPrice;
    const tokenBValueUsd = Number(pool.reserveB) / Math.pow(10, tokenBDecimals) * tokenBPrice;
    const tvlUsd = tokenAValueUsd + tokenBValueUsd;
    const rateAToB = pool.reserveA > 0n ? Number(pool.reserveB) / Number(pool.reserveA) * Math.pow(10, tokenADecimals - tokenBDecimals) : 0;
    const rateBToA = rateAToB > 0 ? 1 / rateAToB : 0;
    const lpTokenPriceUsd = pool.lpSupply > 0n ? tvlUsd / (Number(pool.lpSupply) / 1e9) : 0;
    return {
      poolAddress: pool.address.toBase58(),
      tokenAMint: pool.tokenAMint.toBase58(),
      tokenBMint: pool.tokenBMint.toBase58(),
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      lpSupply: pool.lpSupply,
      tvlUsd,
      tokenAPrice,
      tokenBPrice,
      tokenAValueUsd,
      tokenBValueUsd,
      rateAToB,
      rateBToA,
      feeBps: pool.feeBps,
      lpTokenPriceUsd,
      updatedAt: Date.now()
    };
  }
  /**
   * Calculate statistics for multiple pools
   */
  async calculateAnalytics(pools, decimalsMap) {
    const poolStats = [];
    let totalTvlUsd = 0;
    for (const pool of pools) {
      const decimalsA = decimalsMap?.get(pool.tokenAMint.toBase58()) ?? 9;
      const decimalsB = decimalsMap?.get(pool.tokenBMint.toBase58()) ?? 9;
      const stats = await this.calculatePoolStats(pool, decimalsA, decimalsB);
      poolStats.push(stats);
      totalTvlUsd += stats.tvlUsd;
    }
    return {
      totalTvlUsd,
      poolCount: pools.length,
      pools: poolStats,
      updatedAt: Date.now()
    };
  }
  /**
   * Calculate user's position in a pool
   */
  async calculateUserPosition(pool, lpBalance, tokenADecimals = 9, tokenBDecimals = 9) {
    const sharePercent = pool.lpSupply > 0n ? Number(lpBalance) / Number(pool.lpSupply) * 100 : 0;
    const tokenAAmount = pool.lpSupply > 0n ? lpBalance * pool.reserveA / pool.lpSupply : 0n;
    const tokenBAmount = pool.lpSupply > 0n ? lpBalance * pool.reserveB / pool.lpSupply : 0n;
    const prices = await this.priceFetcher.getPrices([
      pool.tokenAMint,
      pool.tokenBMint
    ]);
    const tokenAPrice = prices.get(pool.tokenAMint.toBase58())?.priceUsd ?? 0;
    const tokenBPrice = prices.get(pool.tokenBMint.toBase58())?.priceUsd ?? 0;
    const valueUsd = Number(tokenAAmount) / Math.pow(10, tokenADecimals) * tokenAPrice + Number(tokenBAmount) / Math.pow(10, tokenBDecimals) * tokenBPrice;
    return {
      poolAddress: pool.address.toBase58(),
      lpBalance,
      sharePercent,
      tokenAAmount,
      tokenBAmount,
      valueUsd
    };
  }
  /**
   * Calculate impermanent loss percentage
   */
  calculateImpermanentLoss(initialPriceRatio, currentPriceRatio) {
    if (initialPriceRatio <= 0 || currentPriceRatio <= 0) return 0;
    const priceRatioChange = currentPriceRatio / initialPriceRatio;
    const sqrtRatio = Math.sqrt(priceRatioChange);
    const il = 2 * sqrtRatio / (1 + priceRatioChange) - 1;
    return Math.abs(il) * 100;
  }
  /**
   * Estimate APY based on fee income (simplified)
   * Note: This is an estimate and would need historical volume data for accuracy
   */
  estimateApy(feeBps, estimatedDailyVolumeUsd, tvlUsd) {
    if (tvlUsd <= 0) return 0;
    const dailyFeeIncome = estimatedDailyVolumeUsd * feeBps / 1e4;
    const dailyYield = dailyFeeIncome / tvlUsd;
    const apy = (Math.pow(1 + dailyYield, 365) - 1) * 100;
    return apy;
  }
};
function formatTvl(tvlUsd) {
  if (tvlUsd === 0) return "$0";
  if (tvlUsd >= 1e9) {
    return `$${(tvlUsd / 1e9).toFixed(2)}B`;
  }
  if (tvlUsd >= 1e6) {
    return `$${(tvlUsd / 1e6).toFixed(2)}M`;
  }
  if (tvlUsd >= 1e3) {
    return `$${(tvlUsd / 1e3).toFixed(2)}K`;
  }
  return `$${tvlUsd.toFixed(2)}`;
}
function formatApy(apy) {
  if (apy === 0) return "0%";
  if (apy >= 1e4) {
    return `${(apy / 1e3).toFixed(1)}K%`;
  }
  if (apy >= 100) {
    return `${apy.toFixed(0)}%`;
  }
  return `${apy.toFixed(2)}%`;
}
function formatShare(sharePercent) {
  if (sharePercent === 0) return "0%";
  if (sharePercent < 0.01) {
    return "<0.01%";
  }
  if (sharePercent < 1) {
    return `${sharePercent.toFixed(4)}%`;
  }
  return `${sharePercent.toFixed(2)}%`;
}
function calculateInvariant(reserveA, reserveB) {
  return reserveA * reserveB;
}
function verifyInvariant(oldReserveA, oldReserveB, newReserveA, newReserveB, feeBps) {
  const oldK = oldReserveA * oldReserveB;
  const newK = newReserveA * newReserveB;
  return newK >= oldK;
}

// src/note-selector.ts
var DEFAULT_OPTIONS = {
  strategy: "smallest-first",
  maxInputs: 2,
  feeAmount: 0n,
  dustThreshold: 1000n
  // 0.001 tokens at 6 decimals
};
var SmartNoteSelector = class {
  constructor(dustThreshold = 1000n) {
    this.dustThreshold = dustThreshold;
  }
  /**
   * Select notes for a transaction
   *
   * @param notes - Available notes to select from
   * @param targetAmount - Amount needed for the transaction
   * @param options - Selection options
   * @returns Selection result with notes, circuit type, and metadata
   */
  selectNotes(notes, targetAmount, options = {}) {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const effectiveTarget = targetAmount + (opts.feeAmount ?? 0n);
    const validNotes = notes.filter((n) => n.amount > 0n);
    if (validNotes.length === 0) {
      return {
        notes: [],
        totalAmount: 0n,
        changeAmount: 0n,
        circuitType: "transfer_1x2",
        needsConsolidation: false,
        error: "No valid notes available"
      };
    }
    const totalBalance = validNotes.reduce((sum, n) => sum + n.amount, 0n);
    if (totalBalance < effectiveTarget) {
      return {
        notes: [],
        totalAmount: 0n,
        changeAmount: 0n,
        circuitType: "transfer_1x2",
        needsConsolidation: false,
        error: `Insufficient balance: have ${totalBalance}, need ${effectiveTarget}`
      };
    }
    switch (opts.strategy) {
      case "exact":
        return this.selectExact(validNotes, effectiveTarget, opts.maxInputs);
      case "minimize-change":
        return this.selectMinimizeChange(validNotes, effectiveTarget, opts.maxInputs);
      case "consolidation-aware":
        return this.selectConsolidationAware(validNotes, effectiveTarget, opts.maxInputs);
      case "smallest-first":
        return this.selectSmallestFirst(validNotes, effectiveTarget, opts.maxInputs);
      case "greedy":
      default:
        return this.selectGreedy(validNotes, effectiveTarget, opts.maxInputs);
    }
  }
  /**
   * Greedy selection - select largest notes first
   */
  selectGreedy(notes, target, maxInputs) {
    const sorted = [...notes].sort(
      (a, b) => Number(b.amount - a.amount)
    );
    const selected = [];
    let total = 0n;
    for (const note of sorted) {
      if (total >= target) break;
      if (selected.length >= maxInputs) break;
      selected.push(note);
      total += note.amount;
    }
    if (total < target) {
      const needsConsolidation = this.wouldSucceedWithMoreInputs(sorted, target, maxInputs);
      return {
        notes: [],
        totalAmount: 0n,
        changeAmount: 0n,
        circuitType: this.getCircuitType(maxInputs),
        needsConsolidation,
        error: needsConsolidation ? "Need more inputs than supported. Consolidate notes first." : "Cannot select sufficient notes"
      };
    }
    return {
      notes: selected,
      totalAmount: total,
      changeAmount: total - target,
      circuitType: this.getCircuitType(selected.length),
      needsConsolidation: false
    };
  }
  /**
   * Exact selection - try to find exact match
   */
  selectExact(notes, target, maxInputs) {
    const exactMatch = notes.find((n) => n.amount === target);
    if (exactMatch) {
      return {
        notes: [exactMatch],
        totalAmount: target,
        changeAmount: 0n,
        circuitType: "transfer_1x2",
        needsConsolidation: false
      };
    }
    if (maxInputs >= 2) {
      for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
          const sum = notes[i].amount + notes[j].amount;
          if (sum === target) {
            return {
              notes: [notes[i], notes[j]],
              totalAmount: target,
              changeAmount: 0n,
              circuitType: "transfer_2x2",
              needsConsolidation: false
            };
          }
        }
      }
    }
    return this.selectGreedy(notes, target, maxInputs);
  }
  /**
   * Minimize change - find combination with smallest change
   */
  selectMinimizeChange(notes, target, maxInputs) {
    let bestResult = null;
    for (const note of notes) {
      if (note.amount >= target) {
        const change = note.amount - target;
        if (!bestResult || change < bestResult.changeAmount) {
          bestResult = {
            notes: [note],
            totalAmount: note.amount,
            changeAmount: change,
            circuitType: "transfer_1x2",
            needsConsolidation: false
          };
        }
      }
    }
    if (maxInputs >= 2) {
      for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
          const sum = notes[i].amount + notes[j].amount;
          if (sum >= target) {
            const change = sum - target;
            if (!bestResult || change < bestResult.changeAmount) {
              bestResult = {
                notes: [notes[i], notes[j]],
                totalAmount: sum,
                changeAmount: change,
                circuitType: "transfer_2x2",
                needsConsolidation: false
              };
            }
          }
        }
      }
    }
    if (bestResult) {
      return bestResult;
    }
    return this.selectGreedy(notes, target, maxInputs);
  }
  /**
   * Consolidation-aware - prefer using dust notes
   */
  selectConsolidationAware(notes, target, maxInputs) {
    const dustNotes = notes.filter((n) => n.amount < this.dustThreshold);
    const regularNotes = notes.filter((n) => n.amount >= this.dustThreshold);
    if (dustNotes.length > 0) {
      const dustTotal = dustNotes.reduce((sum, n) => sum + n.amount, 0n);
      if (dustTotal >= target) {
        const result = this.selectGreedy(dustNotes, target, maxInputs);
        if (!result.error) {
          return result;
        }
      }
      if (maxInputs >= 2 && regularNotes.length > 0) {
        const sortedDust = [...dustNotes].sort((a, b) => Number(b.amount - a.amount));
        const sortedRegular = [...regularNotes].sort((a, b) => Number(b.amount - a.amount));
        for (const dust of sortedDust) {
          for (const regular of sortedRegular) {
            const sum = dust.amount + regular.amount;
            if (sum >= target) {
              return {
                notes: [regular, dust],
                // Put larger first for consistency
                totalAmount: sum,
                changeAmount: sum - target,
                circuitType: "transfer_2x2",
                needsConsolidation: false
              };
            }
          }
        }
      }
    }
    return this.selectGreedy(notes, target, maxInputs);
  }
  /**
   * Smallest-first selection - for consolidation operations
   */
  selectSmallestFirst(notes, target, maxInputs) {
    const sorted = [...notes].sort(
      (a, b) => Number(a.amount - b.amount)
    );
    const selected = [];
    let total = 0n;
    for (const note of sorted) {
      if (total >= target) break;
      if (selected.length >= maxInputs) break;
      selected.push(note);
      total += note.amount;
    }
    if (total < target) {
      const needsConsolidation = this.wouldSucceedWithMoreInputs(sorted, target, maxInputs);
      return {
        notes: [],
        totalAmount: 0n,
        changeAmount: 0n,
        circuitType: this.getCircuitType(maxInputs),
        needsConsolidation,
        error: needsConsolidation ? "Need more inputs than supported. Consolidate notes first." : "Cannot select sufficient notes"
      };
    }
    return {
      notes: selected,
      totalAmount: total,
      changeAmount: total - target,
      circuitType: this.getCircuitType(selected.length),
      needsConsolidation: false
    };
  }
  /**
   * Check if we would succeed with more inputs
   */
  wouldSucceedWithMoreInputs(sortedNotes, target, currentMaxInputs) {
    let total = 0n;
    for (let i = 0; i < sortedNotes.length; i++) {
      total += sortedNotes[i].amount;
      if (total >= target && i >= currentMaxInputs) {
        return true;
      }
    }
    return false;
  }
  /**
   * Get circuit type based on number of inputs
   */
  getCircuitType(numInputs) {
    switch (numInputs) {
      case 1:
        return "transfer_1x2";
      case 2:
        return "transfer_2x2";
      case 3:
        return "transfer_3x2";
      default:
        return "transfer_1x2";
    }
  }
  /**
   * Get circuit ID for the given circuit type
   */
  getCircuitId(circuitType) {
    switch (circuitType) {
      case "transfer_1x2":
        return CIRCUIT_IDS.TRANSFER_1X2;
      case "transfer_2x2":
        return CIRCUIT_IDS.TRANSFER_2X2;
      case "transfer_3x2":
        return CIRCUIT_IDS.TRANSFER_3X2;
      case "consolidate_3x1":
        return CIRCUIT_IDS.CONSOLIDATE_3X1;
      default:
        return CIRCUIT_IDS.TRANSFER_1X2;
    }
  }
  /**
   * Analyze wallet fragmentation
   */
  analyzeFragmentation(notes) {
    const validNotes = notes.filter((n) => n.amount > 0n);
    if (validNotes.length === 0) {
      return {
        totalNotes: 0,
        dustNotes: 0,
        largestNote: 0n,
        smallestNote: 0n,
        totalBalance: 0n,
        fragmentationScore: 0,
        shouldConsolidate: false
      };
    }
    const dustNotes = validNotes.filter((n) => n.amount < this.dustThreshold).length;
    const amounts = validNotes.map((n) => n.amount);
    const largestNote = amounts.reduce((max, a) => a > max ? a : max, 0n);
    const smallestNote = amounts.reduce((min, a) => a < min ? a : min, largestNote);
    const totalBalance = amounts.reduce((sum, a) => sum + a, 0n);
    const noteCountFactor = Math.min(validNotes.length / 10, 1) * 40;
    const dustFactor = dustNotes / validNotes.length * 30;
    const concentrationFactor = totalBalance > 0n ? (1 - Number(largestNote * 100n / totalBalance) / 100) * 30 : 0;
    const fragmentationScore = Math.round(noteCountFactor + dustFactor + concentrationFactor);
    const shouldConsolidate = validNotes.length > 5 || dustNotes > 2 || fragmentationScore > 50;
    return {
      totalNotes: validNotes.length,
      dustNotes,
      largestNote,
      smallestNote,
      totalBalance,
      fragmentationScore,
      shouldConsolidate
    };
  }
  /**
   * Select notes for consolidation
   *
   * @param notes - Available notes
   * @param maxInputs - Maximum inputs (default: 3 for consolidate_3x1)
   * @returns Notes to consolidate
   */
  selectForConsolidation(notes, maxInputs = 3) {
    const validNotes = notes.filter((n) => n.amount > 0n);
    if (validNotes.length <= 1) {
      return [];
    }
    const sorted = [...validNotes].sort((a, b) => Number(a.amount - b.amount));
    return sorted.slice(0, Math.min(maxInputs, sorted.length));
  }
};
var noteSelector = new SmartNoteSelector();

// src/consolidation.ts
var DEFAULT_OPTIONS2 = {
  targetNoteCount: 1,
  maxNotesPerBatch: 3,
  // consolidate_3x1 circuit supports 3 inputs
  dustThreshold: 1000n
};
var ConsolidationService = class {
  constructor(dustThreshold = 1000n) {
    this.dustThreshold = dustThreshold;
    this.noteSelector = new SmartNoteSelector(dustThreshold);
  }
  /**
   * Analyze note fragmentation
   *
   * @param notes - Notes to analyze
   * @returns Fragmentation report
   */
  analyzeNotes(notes) {
    return this.noteSelector.analyzeFragmentation(notes);
  }
  /**
   * Suggest consolidation opportunities
   *
   * @param notes - Available notes
   * @param options - Consolidation options
   * @returns Array of consolidation suggestions
   */
  suggestConsolidation(notes, options = {}) {
    const opts = { ...DEFAULT_OPTIONS2, ...options };
    const suggestions = [];
    const validNotes = notes.filter((n) => n.amount > 0n);
    if (validNotes.length <= 1) {
      return [];
    }
    const dustNotes = validNotes.filter((n) => n.amount < opts.dustThreshold);
    const regularNotes = validNotes.filter((n) => n.amount >= opts.dustThreshold);
    if (dustNotes.length >= 3) {
      const toConsolidate = dustNotes.slice(0, opts.maxNotesPerBatch);
      const totalAmount = toConsolidate.reduce((sum, n) => sum + n.amount, 0n);
      suggestions.push({
        notesToConsolidate: toConsolidate,
        resultingAmount: totalAmount,
        notesReduced: toConsolidate.length - 1,
        priority: "high",
        reason: `${dustNotes.length} dust notes detected. Consolidating will improve wallet performance.`
      });
    }
    if (regularNotes.length > 5) {
      const sorted = [...regularNotes].sort((a, b) => Number(a.amount - b.amount));
      const toConsolidate = sorted.slice(0, opts.maxNotesPerBatch);
      const totalAmount = toConsolidate.reduce((sum, n) => sum + n.amount, 0n);
      suggestions.push({
        notesToConsolidate: toConsolidate,
        resultingAmount: totalAmount,
        notesReduced: toConsolidate.length - 1,
        priority: "medium",
        reason: `${regularNotes.length} notes in wallet. Consolidating smallest notes will simplify transfers.`
      });
    }
    if (validNotes.length > 2 && suggestions.length === 0) {
      const sorted = [...validNotes].sort((a, b) => Number(a.amount - b.amount));
      const toConsolidate = sorted.slice(0, Math.min(opts.maxNotesPerBatch, validNotes.length));
      const totalAmount = toConsolidate.reduce((sum, n) => sum + n.amount, 0n);
      suggestions.push({
        notesToConsolidate: toConsolidate,
        resultingAmount: totalAmount,
        notesReduced: toConsolidate.length - 1,
        priority: "low",
        reason: "Optional cleanup: consolidating notes may improve future transaction efficiency."
      });
    }
    return suggestions;
  }
  /**
   * Plan consolidation into batches
   *
   * For many notes, multiple consolidation transactions may be needed.
   * This method plans the batches to minimize the number of transactions.
   *
   * @param notes - Notes to consolidate
   * @param options - Consolidation options
   * @returns Array of consolidation batches
   */
  planConsolidation(notes, options = {}) {
    const opts = { ...DEFAULT_OPTIONS2, ...options };
    const validNotes = notes.filter((n) => n.amount > 0n);
    if (validNotes.length <= opts.targetNoteCount) {
      return [];
    }
    const batches = [];
    const sorted = [...validNotes].sort((a, b) => Number(a.amount - b.amount));
    let remaining = [...sorted];
    let batchNumber = 1;
    while (remaining.length > opts.targetNoteCount) {
      const batchSize = Math.min(opts.maxNotesPerBatch, remaining.length);
      const batchNotes = remaining.slice(0, batchSize);
      const totalAmount = batchNotes.reduce((sum, n) => sum + n.amount, 0n);
      batches.push({
        notes: batchNotes,
        totalAmount,
        batchNumber
      });
      remaining = remaining.slice(batchSize);
      if (remaining.length + 1 > opts.targetNoteCount) {
        const virtualNote = {
          stealthPubX: batchNotes[0].stealthPubX,
          // Placeholder
          tokenMint: batchNotes[0].tokenMint,
          amount: totalAmount,
          randomness: new Uint8Array(32),
          leafIndex: -1,
          // Indicates virtual
          pool: batchNotes[0].pool,
          // Same pool as source notes
          accountHash: "",
          commitment: new Uint8Array(32)
          // stealthEphemeralPubkey omitted - virtual note placeholder
        };
        remaining.push(virtualNote);
        remaining.sort((a, b) => Number(a.amount - b.amount));
      }
      batchNumber++;
    }
    return batches;
  }
  /**
   * Get optimal notes for a single consolidation transaction
   *
   * @param notes - Available notes
   * @param maxInputs - Maximum inputs (default: 3)
   * @returns Notes to consolidate in this batch
   */
  selectForConsolidation(notes, maxInputs = 3) {
    return this.noteSelector.selectForConsolidation(notes, maxInputs);
  }
  /**
   * Check if consolidation is recommended
   *
   * @param notes - Notes to check
   * @returns Whether consolidation is recommended
   */
  shouldConsolidate(notes) {
    const report = this.analyzeNotes(notes);
    return report.shouldConsolidate;
  }
  /**
   * Get consolidation summary for UI
   *
   * @param notes - Notes to analyze
   * @returns Summary object for display
   */
  getConsolidationSummary(notes) {
    const report = this.analyzeNotes(notes);
    const batches = this.planConsolidation(notes);
    let message = "";
    if (!report.shouldConsolidate) {
      message = "Your wallet is well organized. No consolidation needed.";
    } else if (report.dustNotes > 2) {
      message = `You have ${report.dustNotes} small notes that should be consolidated to improve wallet performance.`;
    } else if (report.totalNotes > 5) {
      message = `You have ${report.totalNotes} notes. Consolidating would simplify your transfers.`;
    } else {
      message = "Optional cleanup available.";
    }
    return {
      totalNotes: report.totalNotes,
      dustNotes: report.dustNotes,
      totalBalance: report.totalBalance,
      shouldConsolidate: report.shouldConsolidate,
      estimatedBatches: batches.length,
      message
    };
  }
  /**
   * Estimate gas cost for consolidation
   *
   * @param numInputs - Number of input notes
   * @returns Estimated cost in lamports
   */
  estimateConsolidationCost(numInputs) {
    const baseCost = 100000n;
    const perInputCost = 50000n;
    return baseCost + perInputCost * BigInt(numInputs);
  }
};
var consolidationService = new ConsolidationService();

// src/auto-consolidator.ts
var DEFAULT_CONFIG = {
  enabled: false,
  fragmentationThreshold: 60,
  maxNoteCount: 8,
  maxDustNotes: 3,
  dustThreshold: 1000n,
  checkIntervalMs: 6e4
  // 1 minute
};
var AutoConsolidator = class {
  constructor(config = { enabled: false }) {
    this.checkInterval = null;
    this.noteProvider = null;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.service = new ConsolidationService(this.config.dustThreshold);
    this.state = {
      enabled: this.config.enabled,
      lastCheckAt: null,
      isConsolidating: false,
      lastReport: null,
      isRecommended: false
    };
  }
  /**
   * Set the note provider function
   *
   * The provider is called periodically to get fresh notes for analysis.
   */
  setNoteProvider(provider) {
    this.noteProvider = provider;
  }
  /**
   * Update configuration
   */
  updateConfig(config) {
    this.config = { ...this.config, ...config };
    if (this.config.enabled !== this.state.enabled) {
      this.state.enabled = this.config.enabled;
      if (this.config.enabled) {
        this.start();
      } else {
        this.stop();
      }
    }
  }
  /**
   * Start background monitoring
   */
  start() {
    if (this.checkInterval) {
      return;
    }
    this.state.enabled = true;
    this.check();
    this.checkInterval = setInterval(() => {
      this.check();
    }, this.config.checkIntervalMs);
  }
  /**
   * Stop background monitoring
   */
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.state.enabled = false;
  }
  /**
   * Perform a manual check
   */
  check() {
    if (!this.noteProvider) {
      return null;
    }
    const notes = this.noteProvider();
    const report = this.service.analyzeNotes(notes);
    this.state.lastCheckAt = Date.now();
    this.state.lastReport = report;
    const isRecommended = this.shouldConsolidate(report);
    this.state.isRecommended = isRecommended;
    if (isRecommended && this.config.onConsolidationRecommended) {
      this.config.onConsolidationRecommended(report);
    }
    return report;
  }
  /**
   * Check if consolidation should be triggered
   */
  shouldConsolidate(report) {
    if (report.fragmentationScore >= this.config.fragmentationThreshold) {
      return true;
    }
    if (report.totalNotes >= this.config.maxNoteCount) {
      return true;
    }
    if (report.dustNotes >= this.config.maxDustNotes) {
      return true;
    }
    return false;
  }
  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }
  /**
   * Get the last fragmentation report
   */
  getLastReport() {
    return this.state.lastReport;
  }
  /**
   * Check if consolidation is currently recommended
   */
  isConsolidationRecommended() {
    return this.state.isRecommended;
  }
  /**
   * Get consolidation suggestions based on current notes
   */
  getSuggestions() {
    if (!this.noteProvider) {
      return [];
    }
    return this.service.suggestConsolidation(this.noteProvider());
  }
  /**
   * Estimate the cost of consolidation
   */
  estimateCost() {
    if (!this.noteProvider) {
      return 0n;
    }
    const notes = this.noteProvider();
    return this.service.estimateConsolidationCost(notes.length);
  }
};
var globalAutoConsolidator = null;
function getAutoConsolidator(config) {
  if (!globalAutoConsolidator) {
    globalAutoConsolidator = new AutoConsolidator(config);
  } else if (config) {
    globalAutoConsolidator.updateConfig(config);
  }
  return globalAutoConsolidator;
}
function enableAutoConsolidation(config = {}) {
  const consolidator = getAutoConsolidator({ ...config, enabled: true });
  consolidator.start();
  return consolidator;
}
function disableAutoConsolidation() {
  if (globalAutoConsolidator) {
    globalAutoConsolidator.stop();
  }
}
export {
  ALTManager,
  AutoConsolidator,
  BPS_DIVISOR,
  CIRCUIT_IDS,
  CloakCraftClient,
  ConsolidationService,
  DEFAULT_FEE_CONFIG,
  DEVNET_LIGHT_TREES,
  DEVNET_V2_TREES,
  DOMAIN_ACTION_NULLIFIER,
  DOMAIN_COMMITMENT,
  DOMAIN_EMPTY_LEAF,
  DOMAIN_MERKLE,
  DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_STEALTH,
  FIELD_MODULUS_FQ,
  FIELD_MODULUS_FR,
  GENERATOR,
  IDENTITY,
  LightClient,
  LightCommitmentClient,
  LightProtocol,
  MAINNET_LIGHT_TREES,
  MAX_FEE_BPS,
  MAX_TRANSACTION_SIZE,
  NoteManager,
  PROGRAM_ID,
  PoolAnalyticsCalculator,
  ProofGenerator,
  SEEDS,
  SmartNoteSelector,
  TokenPriceFetcher,
  TransactionHistory,
  TransactionStatus,
  TransactionType,
  VoteOption,
  WALLET_DERIVATION_MESSAGE,
  Wallet,
  addCiphertexts,
  ammPoolExists,
  bigintToFieldString,
  buildAddLiquidityWithProgram,
  buildAtomicMultiPhaseTransaction,
  buildCancelOrderWithProgram,
  buildClosePendingOperationWithProgram,
  buildConsolidationWithProgram,
  buildCreateAggregationWithProgram,
  buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram,
  buildFillOrderWithProgram,
  buildFinalizeDecryptionWithProgram,
  buildInitializeAmmPoolWithProgram,
  buildInitializeCommitmentCounterWithProgram,
  buildInitializePoolWithProgram,
  buildRemoveLiquidityWithProgram,
  buildShieldInstructions,
  buildShieldInstructionsForVersionedTx,
  buildShieldWithProgram,
  buildStoreCommitmentWithProgram,
  buildSubmitDecryptionShareWithProgram,
  buildSubmitVoteWithProgram,
  buildSwapWithProgram,
  buildTransactWithProgram,
  buildVersionedTransaction,
  bytesToField,
  bytesToFieldString,
  calculateAddLiquidityAmounts,
  calculateInvariant,
  calculateMinOutput,
  calculateMinimumFee,
  calculatePriceImpact,
  calculatePriceRatio,
  calculateProtocolFee,
  calculateRemoveLiquidityOutput,
  calculateSlippage,
  calculateSwapOutput,
  calculateTotalLiquidity,
  calculateUsdPriceImpact,
  canFitInSingleTransaction,
  canonicalTokenOrder,
  checkNullifierSpent,
  checkStealthOwnership,
  combineShares,
  computeAmmStateHash,
  computeCircuitInputs,
  computeCommitment,
  computeDecryptionShare,
  consolidationService,
  createAddressLookupTable,
  createCloakCraftALT,
  createNote,
  createPendingTransaction,
  createWallet,
  createWatchOnlyWallet,
  decryptNote,
  deriveActionNullifier,
  deriveAggregationPda,
  deriveAmmPoolPda,
  deriveCommitmentCounterPda,
  deriveNullifierKey,
  deriveOrderPda,
  derivePendingOperationPda,
  derivePoolPda,
  deriveProtocolConfigPda,
  derivePublicKey,
  deriveSpendingNullifier,
  deriveStealthPrivateKey,
  deriveVaultPda,
  deriveVerificationKeyPda,
  deriveWalletFromSeed,
  deriveWalletFromSignature,
  deserializeAmmPool,
  deserializeEncryptedNote,
  disableAutoConsolidation,
  elgamalEncrypt,
  enableAutoConsolidation,
  encryptNote,
  encryptVote,
  estimateTotalCost,
  estimateTransactionSize,
  executeVersionedTransaction,
  extendAddressLookupTable,
  fetchAddressLookupTable,
  fetchAmmPool,
  fetchProtocolFeeConfig,
  fieldToBytes,
  formatAmmPool,
  formatApy,
  formatFeeAmount,
  formatFeeRate,
  formatPrice,
  formatPriceChange,
  formatShare,
  formatTvl,
  generateDleqProof,
  generateOperationId,
  generateRandomness,
  generateSnarkjsProof,
  generateStealthAddress,
  generateVoteRandomness,
  getAmmPool,
  getAutoConsolidator,
  getFeeBps,
  getInstructionFromAnchorMethod,
  getLightProtocolCommonAccounts,
  getRandomStateTreeSet,
  getStateTreeSet,
  initPoseidon,
  initializePool,
  isFeeableOperation,
  isFreeOperation,
  isInSubgroup,
  isOnCurve,
  lagrangeCoefficient,
  loadCircomArtifacts,
  loadWallet,
  noteSelector,
  padCircuitId,
  parseGroth16Proof,
  pointAdd,
  poseidonHash,
  poseidonHash2,
  poseidonHashAsync,
  poseidonHashDomain,
  poseidonHashDomainAsync,
  pubkeyToField,
  refreshAmmPool,
  scalarMul,
  serializeCiphertext,
  serializeCiphertextFull,
  serializeEncryptedNote,
  serializeEncryptedVote,
  serializeGroth16Proof,
  storeCommitments,
  tryDecryptNote,
  validateLiquidityAmounts,
  validateSwapAmount,
  verifyAmmStateHash,
  verifyCommitment,
  verifyDleqProof,
  verifyFeeAmount,
  verifyInvariant
};
