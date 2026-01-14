import {
  CIRCUIT_IDS,
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
  LightProtocol,
  PROGRAM_ID,
  SEEDS,
  buildAddLiquidityInstructionsForVersionedTx,
  buildAddLiquidityWithProgram,
  buildClosePendingOperationWithProgram,
  buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram,
  buildInitializeAmmPoolWithProgram,
  buildRemoveLiquidityInstructionsForVersionedTx,
  buildRemoveLiquidityWithProgram,
  buildSwapInstructionsForVersionedTx,
  buildSwapWithProgram,
  bytesToField,
  decryptNote,
  deriveAmmPoolPda,
  deriveCommitmentCounterPda,
  derivePendingOperationPda,
  derivePoolPda,
  derivePublicKey,
  deriveVaultPda,
  deriveVerificationKeyPda,
  deserializeEncryptedNote,
  encryptNote,
  fieldToBytes,
  generateOperationId,
  initPoseidon,
  isInSubgroup,
  isOnCurve,
  padCircuitId,
  pointAdd,
  poseidonHash,
  poseidonHash2,
  poseidonHashAsync,
  poseidonHashDomain,
  poseidonHashDomainAsync,
  scalarMul,
  serializeEncryptedNote,
  tryDecryptNote
} from "./chunk-QOGJM2A6.mjs";
import {
  MAX_TRANSACTION_SIZE,
  buildAtomicMultiPhaseTransaction,
  buildVersionedTransaction,
  canFitInSingleTransaction,
  estimateTransactionSize,
  executeVersionedTransaction,
  getInstructionFromAnchorMethod
} from "./chunk-DYUX7D5W.mjs";
import {
  __require
} from "./chunk-Y6FXYEAI.mjs";

// src/index.ts
export * from "@cloakcraft/types";

// src/client.ts
import {
  Connection as Connection2,
  PublicKey as PublicKey10,
  Transaction as Transaction2
} from "@solana/web3.js";

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

// src/crypto/commitment.ts
function computeCommitment(note) {
  const stealthPubX = note.stealthPubX;
  const tokenMintBytes = note.tokenMint instanceof Uint8Array ? note.tokenMint : note.tokenMint.toBytes();
  const amountBytes = fieldToBytes(note.amount);
  const randomness = note.randomness;
  if (typeof process !== "undefined" && process.env.DEBUG_COMMITMENT) {
    console.log("[computeCommitment] Inputs:");
    console.log("  stealthPubX:", Buffer.from(stealthPubX).toString("hex").slice(0, 32));
    console.log("  tokenMint:", Buffer.from(tokenMintBytes).toString("hex").slice(0, 32));
    console.log("  amount (bigint):", note.amount.toString());
    console.log("  amount (bytes):", Buffer.from(amountBytes).toString("hex").slice(0, 32));
    console.log("  randomness:", Buffer.from(randomness).toString("hex").slice(0, 32));
  }
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

// src/snarkjs-prover.ts
var BN254_FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
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
    wasmBuffer = fs2.readFileSync(wasmUrl).buffer;
    zkeyBuffer = fs2.readFileSync(zkeyUrl).buffer;
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
  publicSignals.forEach((sig, i) => {
    const hex = BigInt(sig).toString(16).padStart(64, "0");
  });
  const formattedProof = formatSnarkjsProofForSolana(proof);
  const toHexStr = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  return formattedProof;
}
function formatSnarkjsProofForSolana(proof) {
  const formatted = new Uint8Array(256);
  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : BN254_FIELD_MODULUS - ay;
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
var BN254_FIELD_MODULUS2 = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
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
    const poolIdBytes = params.poolId.toBytes();
    poolIdBytes[0] = 0;
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
    const poolIdBytes = params.poolId.toBytes();
    poolIdBytes[0] = 0;
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
    const poolIdBytes = params.poolId.toBytes();
    poolIdBytes[0] = 0;
    const oldStateHash = new Uint8Array(params.oldPoolStateHash);
    const newStateHash = new Uint8Array(params.newPoolStateHash);
    oldStateHash[0] = 0;
    newStateHash[0] = 0;
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
    const wasmUrl = `${this.circomBaseUrl}/${circomFileName}.wasm`;
    const zkeyUrl = `${this.circomBaseUrl}/${circomFileName}_final.zkey`;
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
    const negY = y === 0n ? 0n : BN254_FIELD_MODULUS2 - y;
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
    return {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      out_commitment_1: fieldToHex(params.outputs[0].commitment),
      out_commitment_2: fieldToHex(out2Commitment),
      token_mint: fieldToHex(tokenMint),
      unshield_amount: (params.unshield?.amount ?? 0n).toString(),
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
      const poolStr = note.pool ? note.pool.toBase58() : "none";
      const nullifierHex = Buffer.from(nullifier).toString("hex").slice(0, 16);
      console.log(`[Scanner] Note ${note.amount}, pool: ${poolStr.slice(0, 8)}..., nullifier: ${nullifierHex}..., addr: ${addressStr.slice(0, 8)}...`);
      nullifierData.push({ note, nullifier, address });
    }
    const addresses = nullifierData.map((d) => new PublicKey2(d.address).toBase58());
    const spentSet = await this.batchCheckNullifiers(addresses);
    const spentCount = Array.from(spentSet).length;
    console.log(`[Scanner] Checked ${addresses.length} nullifiers, found ${spentCount} spent`);
    return nullifierData.map(({ note, nullifier, address }) => {
      const addressStr = new PublicKey2(address).toBase58();
      const isSpent = spentSet.has(addressStr);
      if (isSpent) {
        console.log(`[Scanner] Note ${addressStr.slice(0, 8)}... is SPENT, filtering out`);
      }
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
    console.log(`[Scanner] Found ${accounts.length} commitment accounts${pool ? ` for pool ${pool.toBase58()}` : " (all pools)"}`);
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
        console.log(`[Scanner] Decrypted note: tokenMint=${new PublicKey2(note.tokenMint).toBase58().slice(0, 8)}..., amount=${note.amount}, pool=${new PublicKey2(parsed.pool).toBase58().slice(0, 8)}...`);
        cache.set(account.hash, decryptedNote);
        decryptedNotes.push(decryptedNote);
      } catch (err) {
        cache.set(account.hash, null);
        continue;
      }
    }
    console.log(`[Scanner] Total decrypted notes: ${decryptedNotes.length}`);
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

// src/instructions/shield.ts
import {
  ComputeBudgetProgram
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";
async function buildShieldInstructions(params, rpcUrl, programId = PROGRAM_ID) {
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);
  const randomness = generateRandomness();
  const note = {
    stealthPubX: params.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.amount,
    randomness
  };
  const commitment = computeCommitment(note);
  const toHex = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  const encryptedNote = encryptNote(note, params.stealthPubkey);
  const serializedNote = serializeEncryptedNote(encryptedNote);
  const stealthEphemeralBytes = new Uint8Array(64);
  stealthEphemeralBytes.set(params.stealthEphemeralPubkey.x, 0);
  stealthEphemeralBytes.set(params.stealthEphemeralPubkey.y, 32);
  const commitmentAddress = lightProtocol.deriveCommitmentAddress(poolPda, commitment);
  const validityProof = await lightProtocol.getValidityProof([commitmentAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const lightParams = {
    validityProof: LightProtocol.convertCompressedProof(validityProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: validityProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const instructions = [];
  instructions.push(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  );
  return {
    instructions,
    commitment,
    randomness,
    encryptedNote: Buffer.from(serializedNote)
  };
}
async function buildShieldWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);
  const randomness = generateRandomness();
  const note = {
    stealthPubX: params.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.amount,
    randomness
  };
  const commitment = computeCommitment(note);
  const toHex = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log(`[Shield] Creating note with:`);
  console.log(`[Shield]   stealthPubX: ${Buffer.from(note.stealthPubX).toString("hex").slice(0, 16)}...`);
  console.log(`[Shield]   tokenMint: ${note.tokenMint.toBase58().slice(0, 16)}...`);
  console.log(`[Shield]   amount: ${note.amount}`);
  console.log(`[Shield]   randomness: ${Buffer.from(note.randomness).toString("hex").slice(0, 16)}...`);
  console.log(`[Shield]   Commitment: ${Buffer.from(commitment).toString("hex").slice(0, 16)}...`);
  console.log(`[Shield]   Encrypting to stealthPubkey X: ${Buffer.from(params.stealthPubkey.x).toString("hex").slice(0, 16)}...`);
  console.log(`[Shield]   Stealth ephemeral X: ${Buffer.from(params.stealthEphemeralPubkey.x).toString("hex").slice(0, 16)}...`);
  const encryptedNote = encryptNote(note, params.stealthPubkey);
  const serializedNote = serializeEncryptedNote(encryptedNote);
  const stealthEphemeralBytes = new Uint8Array(64);
  stealthEphemeralBytes.set(params.stealthEphemeralPubkey.x, 0);
  stealthEphemeralBytes.set(params.stealthEphemeralPubkey.y, 32);
  const commitmentAddress = lightProtocol.deriveCommitmentAddress(poolPda, commitment);
  const validityProof = await lightProtocol.getValidityProof([commitmentAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const lightParams = {
    validityProof: LightProtocol.convertCompressedProof(validityProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: validityProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const tx = await program.methods.shield(
    Array.from(commitment),
    new BN(params.amount.toString()),
    Array.from(stealthEphemeralBytes),
    Buffer.from(serializedNote),
    lightParams
  ).accountsStrict({
    pool: poolPda,
    commitmentCounter: counterPda,
    tokenVault: vaultPda,
    userTokenAccount: params.userTokenAccount,
    user: params.user,
    tokenProgram: TOKEN_PROGRAM_ID
  }).remainingAccounts(remainingAccounts).preInstructions([
    ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return { tx, commitment, randomness };
}

// src/instructions/transact.ts
import {
  ComputeBudgetProgram as ComputeBudgetProgram2
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID as TOKEN_PROGRAM_ID2, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { BN as BN2 } from "@coral-xyz/anchor";
async function buildTransactWithProgram(program, params, rpcUrl, circuitId = CIRCUIT_IDS.TRANSFER_1X2) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);
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
  const outputCommitments = [];
  const encryptedNotes = [];
  const outputRandomness = [];
  const stealthEphemeralPubkeys = [];
  const outputAmounts = [];
  for (const output of params.outputs) {
    outputAmounts.push(output.amount);
    const randomness = output.randomness ?? generateRandomness();
    outputRandomness.push(randomness);
    const note = {
      stealthPubX: output.recipientPubkey.x,
      tokenMint: params.tokenMint,
      amount: output.amount,
      randomness
    };
    const commitment = output.commitment ?? computeCommitment(note);
    outputCommitments.push(commitment);
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
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const lightParams = {
    validityProof: LightProtocol.convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  let unshieldRecipientAta = null;
  if (params.unshieldRecipient && params.unshieldAmount && params.unshieldAmount > 0n) {
    unshieldRecipientAta = getAssociatedTokenAddressSync(
      params.tokenMint,
      params.unshieldRecipient,
      true
      // allowOwnerOffCurve - in case recipient is a PDA
    );
  }
  const tx = await program.methods.transact(
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(nullifier),
    outputCommitments.map((c) => Array.from(c)),
    [],
    // Encrypted notes passed to store_commitment separately
    new BN2((params.unshieldAmount ?? 0n).toString()),
    lightParams
  ).accountsStrict({
    pool: poolPda,
    commitmentCounter: counterPda,
    tokenVault: vaultPda,
    verificationKey: vkPda,
    unshieldRecipient: unshieldRecipientAta ?? null,
    relayer: params.relayer,
    tokenProgram: TOKEN_PROGRAM_ID2
  }).remainingAccounts(remainingAccounts).preInstructions([
    ComputeBudgetProgram2.setComputeUnitLimit({ units: 14e5 }),
    ComputeBudgetProgram2.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return {
    tx,
    result: {
      nullifier,
      outputCommitments,
      encryptedNotes,
      outputRandomness,
      stealthEphemeralPubkeys,
      outputAmounts
    }
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

// src/instructions/store-commitment.ts
import {
  ComputeBudgetProgram as ComputeBudgetProgram3
} from "@solana/web3.js";
import { BN as BN3 } from "@coral-xyz/anchor";
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
    leafIndex: new BN3(params.leafIndex.toString()),
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
    ComputeBudgetProgram3.setComputeUnitLimit({ units: 6e5 }),
    ComputeBudgetProgram3.setComputeUnitPrice({ microLamports: 5e4 })
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
import { TOKEN_PROGRAM_ID as TOKEN_PROGRAM_ID3 } from "@solana/spl-token";
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
    tokenProgram: TOKEN_PROGRAM_ID3,
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
  PublicKey as PublicKey7,
  ComputeBudgetProgram as ComputeBudgetProgram4
} from "@solana/web3.js";
function deriveOrderPda(orderId, programId) {
  return PublicKey7.findProgramAddressSync(
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
    ComputeBudgetProgram4.setComputeUnitLimit({ units: 1e6 }),
    ComputeBudgetProgram4.setComputeUnitPrice({ microLamports: 5e4 })
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
    ComputeBudgetProgram4.setComputeUnitLimit({ units: 8e5 }),
    ComputeBudgetProgram4.setComputeUnitPrice({ microLamports: 5e4 })
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
  PublicKey as PublicKey8,
  ComputeBudgetProgram as ComputeBudgetProgram5
} from "@solana/web3.js";
import { BN as BN4 } from "@coral-xyz/anchor";
function deriveAggregationPda(id, programId) {
  return PublicKey8.findProgramAddressSync(
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
    new BN4(params.deadline),
    Array.from(params.actionDomain)
  ).accountsStrict({
    aggregation: aggregationPda,
    tokenPool: tokenPoolPda,
    authority: params.authority,
    payer: params.payer,
    systemProgram: PublicKey8.default
  }).preInstructions([
    ComputeBudgetProgram5.setComputeUnitLimit({ units: 2e5 })
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
    ComputeBudgetProgram5.setComputeUnitLimit({ units: 8e5 }),
    ComputeBudgetProgram5.setComputeUnitPrice({ microLamports: 5e4 })
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
    ComputeBudgetProgram5.setComputeUnitLimit({ units: 4e5 })
  ]);
  return tx;
}
async function buildFinalizeDecryptionWithProgram(program, params) {
  const programId = program.programId;
  const [aggregationPda] = deriveAggregationPda(params.aggregationId, programId);
  const totalsArray = params.totals.map((t) => new BN4(t.toString()));
  const tx = await program.methods.finalizeDecryption(totalsArray).accountsStrict({
    aggregation: aggregationPda,
    authority: params.authority
  }).preInstructions([
    ComputeBudgetProgram5.setComputeUnitLimit({ units: 2e5 })
  ]);
  return tx;
}

// src/address-lookup-table.ts
import {
  PublicKey as PublicKey9,
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
        new PublicKey9("BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW")
        // State tree 0
      ],
      addressTrees: [
        new PublicKey9("F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A")
        // Address tree 0
      ],
      nullifierQueues: [
        new PublicKey9("8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z")
        // Nullifier queue 0
      ],
      // Additional Light Protocol system accounts (from PackedAccounts)
      systemAccounts: [
        new PublicKey9("94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3"),
        new PublicKey9("35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh"),
        new PublicKey9("HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA"),
        new PublicKey9("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq"),
        new PublicKey9("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto")
      ]
    };
  } else {
    return {
      stateTrees: [
        new PublicKey9("BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW")
        // Placeholder
      ],
      addressTrees: [
        new PublicKey9("F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A")
        // Placeholder
      ],
      nullifierQueues: [
        new PublicKey9("8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z")
        // Placeholder
      ],
      systemAccounts: [
        new PublicKey9("94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3"),
        // Placeholder
        new PublicKey9("35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh"),
        // Placeholder
        new PublicKey9("HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA"),
        // Placeholder
        new PublicKey9("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq"),
        // Placeholder
        new PublicKey9("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto")
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
    const [poolPda] = PublicKey10.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    if (this.program) {
      try {
        const pool = await this.program.account.pool.fetch(poolPda);
        return {
          tokenMint: pool.tokenMint,
          tokenVault: pool.tokenVault,
          totalShielded: BigInt(pool.totalShielded.toString()),
          authority: pool.authority,
          bump: pool.bump,
          vaultBump: pool.vaultBump
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
    return {
      tokenMint: new PublicKey10(data.subarray(8, 40)),
      tokenVault: new PublicKey10(data.subarray(40, 72)),
      totalShielded: data.readBigUInt64LE(72),
      authority: new PublicKey10(data.subarray(80, 112)),
      bump: data[112],
      vaultBump: data[113]
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
   * Uses the new instruction builder for full Light Protocol integration
   */
  async shield(params, payer) {
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
        user: payer.publicKey
      },
      this.getHeliusRpcUrl()
    );
    const signature = await tx.rpc();
    return {
      signature,
      slot: 0,
      // Slot is not available from rpc()
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
    const signature = await tx.rpc();
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
    const circuitName = params.inputs.length === 1 ? "transfer/1x2" : "transfer/1x3";
    if (!this.proofGenerator.hasCircuit(circuitName)) {
      throw new Error(`Prover not initialized. Call initializeProver(['${circuitName}']) first.`);
    }
    const tokenMint = params.inputs[0].tokenMint instanceof Uint8Array ? new PublicKey10(params.inputs[0].tokenMint) : params.inputs[0].tokenMint;
    const [poolPda] = PublicKey10.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    const [counterPda] = PublicKey10.findProgramAddressSync(
      [Buffer.from("commitment_counter"), poolPda.toBuffer()],
      this.programId
    );
    const counterAccount = await this.connection.getAccountInfo(counterPda);
    if (!counterAccount) {
      throw new Error("PoolCommitmentCounter not found. Initialize pool first.");
    }
    const baseLeafIndex = counterAccount.data.readBigUInt64LE(40);
    const proof = await this.proofGenerator.generateTransferProof(
      params,
      this.wallet.keypair
    );
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
    const { tx, result } = await buildTransactWithProgram(
      this.program,
      {
        tokenMint,
        input: {
          stealthPubX: params.inputs[0].stealthPubX,
          amount: params.inputs[0].amount,
          randomness: params.inputs[0].randomness,
          leafIndex: params.inputs[0].leafIndex,
          spendingKey: BigInt("0x" + Buffer.from(this.wallet.keypair.spending.sk).toString("hex")),
          accountHash
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
        relayer: relayer?.publicKey ?? await this.getRelayerPubkey(),
        proof,
        nullifier,
        inputCommitment
      },
      heliusRpcUrl,
      circuitName === "transfer/1x2" ? "transfer_1x2" : "transfer_1x3"
    );
    const signature = await tx.rpc();
    const realOutputs = result.outputCommitments.map((c, i) => ({
      commitment: c,
      leafIndex: baseLeafIndex + BigInt(i),
      stealthEphemeralPubkey: result.stealthEphemeralPubkeys[i],
      encryptedNote: result.encryptedNotes[i],
      amount: result.outputAmounts[i]
    })).filter((o) => o.encryptedNote.length > 0 && o.amount > 0n);
    if (realOutputs.length > 0) {
      await storeCommitments(
        this.program,
        tokenMint,
        realOutputs,
        relayer?.publicKey ?? await this.getRelayerPubkey(),
        heliusRpcUrl
      );
    }
    return {
      signature,
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
    const commitment = preparedInputs[0].commitment;
    const dummyPath = Array(32).fill(new Uint8Array(32));
    const dummyIndices = Array(32).fill(0);
    const params = {
      inputs: preparedInputs,
      merkleRoot: commitment,
      merklePath: dummyPath,
      merkleIndices: dummyIndices,
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
   */
  async getSyncStatus() {
    return this.noteManager.getSyncStatus();
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
      const tx = await buildInitializeAmmPoolWithProgram(this.program, {
        tokenAMint,
        tokenBMint,
        lpMint: lpMintKeypair.publicKey,
        feeBps,
        authority: payer.publicKey,
        payer: payer.publicKey
      });
      const hasSecretKey = payer.secretKey && payer.secretKey.length > 0;
      const signature = await tx.signers(hasSecretKey ? [payer, lpMintKeypair] : [lpMintKeypair]).rpc();
      console.log(`[AMM] Pool initialized: ${signature}`);
      return signature;
    } catch (err) {
      console.error("[AMM] Failed to initialize pool:", err);
      throw err;
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
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array ? new PublicKey10(params.input.tokenMint) : params.input.tokenMint;
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
    console.log("[Swap] Attempting atomic execution with versioned transaction...");
    try {
      const { instructions, operationId: operationId2 } = await buildSwapInstructionsForVersionedTx(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      console.log(`[Swap] Built ${instructions.length} instructions for atomic execution`);
      const lookupTables = await this.getAddressLookupTables();
      if (lookupTables.length > 0) {
        console.log(`[Swap] Using ${lookupTables.length} Address Lookup Tables for compression`);
      }
      const versionedTx = await buildVersionedTransaction(
        this.connection,
        instructions,
        relayerPubkey,
        {
          computeUnits: 14e5,
          computeUnitPrice: 5e4,
          lookupTables
        }
      );
      const size = estimateTransactionSize(versionedTx);
      if (size === -1) {
        console.log("[Swap] Transaction serialization failed, falling back to sequential execution");
      } else {
        console.log(`[Swap] Versioned transaction size: ${size}/${MAX_TRANSACTION_SIZE} bytes`);
      }
      if (size > 0 && size <= MAX_TRANSACTION_SIZE) {
        if (relayer) {
          versionedTx.sign([relayer]);
        } else {
          throw new Error("Relayer keypair required for signing versioned transaction");
        }
        console.log("[Swap] Executing atomic transaction...");
        const signature = await executeVersionedTransaction(this.connection, versionedTx, {
          skipPreflight: false
        });
        console.log("[Swap] Atomic execution successful!");
        return { signature, slot: 0 };
      }
      console.log("[Swap] Transaction too large, falling back to sequential execution");
    } catch (err) {
      console.error("[Swap] Atomic execution failed, falling back to sequential:", err);
    }
    console.log("[Swap] Using sequential multi-phase execution with batch signing...");
    const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildSwapWithProgram(
      this.program,
      instructionParams,
      heliusRpcUrl
    );
    const { buildCreateNullifierWithProgram: buildCreateNullifierWithProgram2, buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await import("./swap-3V2JKETZ.mjs");
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 1", builder: phase1Tx });
    for (let i = 0; i < pendingNullifiers.length; i++) {
      const pn = pendingNullifiers[i];
      const { tx: nullifierTx } = await buildCreateNullifierWithProgram2(
        this.program,
        {
          operationId,
          nullifierIndex: i,
          pool: pn.pool,
          relayer: relayerPubkey
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Nullifier ${i}`, builder: nullifierTx });
    }
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
          encryptedNote: pc.encryptedNote
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Commitment ${i}`, builder: commitmentTx });
    }
    const { tx: closeTx } = await buildClosePendingOperationWithProgram2(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: "Close", builder: closeTx });
    console.log(`[Swap] Built ${transactionBuilders.length} transactions for batch signing`);
    const { Transaction: Transaction3 } = await import("@solana/web3.js");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ builder }) => await builder.transaction())
    );
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    transactions.forEach((tx) => {
      tx.recentBlockhash = blockhash;
      tx.feePayer = relayerPubkey;
    });
    console.log("[Swap] Requesting signature for all transactions...");
    const signedTransactions = await this.signAllTransactions(transactions, relayer);
    console.log(`[Swap] All ${signedTransactions.length} transactions signed!`);
    let phase1Signature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      await this.connection.confirmTransaction(signature, "confirmed");
      console.log(`[Swap] ${name} confirmed: ${signature}`);
      if (i === 0) phase1Signature = signature;
    }
    return {
      signature: phase1Signature,
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
    const tokenAMint = params.inputA.tokenMint instanceof Uint8Array ? new PublicKey10(params.inputA.tokenMint) : params.inputA.tokenMint;
    const tokenBMint = params.inputB.tokenMint instanceof Uint8Array ? new PublicKey10(params.inputB.tokenMint) : params.inputB.tokenMint;
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
    console.log("[Add Liquidity] Attempting atomic execution with versioned transaction...");
    try {
      const { instructions, operationId: operationId2 } = await buildAddLiquidityInstructionsForVersionedTx(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      console.log(`[Add Liquidity] Built ${instructions.length} instructions for atomic execution`);
      const lookupTables = await this.getAddressLookupTables();
      if (lookupTables.length > 0) {
        console.log(`[Add Liquidity] Using ${lookupTables.length} Address Lookup Tables for compression`);
      }
      const versionedTx = await buildVersionedTransaction(
        this.connection,
        instructions,
        relayerPubkey,
        {
          computeUnits: 14e5,
          computeUnitPrice: 5e4,
          lookupTables
        }
      );
      const size = estimateTransactionSize(versionedTx);
      if (size === -1) {
        console.log("[Add Liquidity] Transaction serialization failed, falling back to sequential execution");
      } else {
        console.log(`[Add Liquidity] Versioned transaction size: ${size}/${MAX_TRANSACTION_SIZE} bytes`);
      }
      if (size > 0 && size <= MAX_TRANSACTION_SIZE) {
        if (relayer) {
          versionedTx.sign([relayer]);
        } else {
          throw new Error("Relayer keypair required for signing versioned transaction");
        }
        console.log("[Add Liquidity] Executing atomic transaction...");
        const signature = await executeVersionedTransaction(this.connection, versionedTx, {
          skipPreflight: false
        });
        console.log("[Add Liquidity] Atomic execution successful!");
        return { signature, slot: 0 };
      }
      console.log("[Add Liquidity] Transaction too large, falling back to sequential execution");
    } catch (err) {
      console.error("[Add Liquidity] Atomic execution failed, falling back to sequential:", err);
    }
    console.log("[Add Liquidity] Using sequential multi-phase execution with batch signing...");
    const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildAddLiquidityWithProgram(
      this.program,
      instructionParams,
      heliusRpcUrl
    );
    const { buildCreateNullifierWithProgram: buildCreateNullifierWithProgram2, buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await import("./swap-3V2JKETZ.mjs");
    console.log("[Add Liquidity] Building all transactions for batch signing...");
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 1", builder: phase1Tx });
    for (let i = 0; i < pendingNullifiers.length; i++) {
      const pn = pendingNullifiers[i];
      const { tx: nullifierTx } = await buildCreateNullifierWithProgram2(
        this.program,
        {
          operationId,
          nullifierIndex: i,
          pool: pn.pool,
          relayer: relayerPubkey,
          nullifier: pn.nullifier
          // Pass nullifier directly for batch signing
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Nullifier ${i}`, builder: nullifierTx });
    }
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
          // Pass commitment directly for batch signing
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Commitment ${i}`, builder: commitmentTx });
    }
    const { tx: closeTx } = await buildClosePendingOperationWithProgram2(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: "Close", builder: closeTx });
    console.log(`[Add Liquidity] Built ${transactionBuilders.length} transactions`);
    const { Transaction: Transaction3 } = await import("@solana/web3.js");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ builder }) => {
        const tx = await builder.transaction();
        return tx;
      })
    );
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    transactions.forEach((tx) => {
      tx.recentBlockhash = blockhash;
      tx.feePayer = relayerPubkey;
    });
    console.log("[Add Liquidity] Requesting signature for all transactions...");
    const signedTransactions = await this.signAllTransactions(transactions, relayer);
    console.log(`[Add Liquidity] All ${signedTransactions.length} transactions signed!`);
    console.log("[Add Liquidity] Executing signed transactions sequentially...");
    let phase1Signature = "";
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
        phase1Signature = signature;
      }
    }
    console.log("[Add Liquidity] All transactions executed successfully!");
    return {
      signature: phase1Signature,
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
    const lpMint = params.lpInput.tokenMint instanceof Uint8Array ? new PublicKey10(params.lpInput.tokenMint) : params.lpInput.tokenMint;
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
    console.log("[Remove Liquidity] Attempting atomic execution with versioned transaction...");
    try {
      const { buildRemoveLiquidityInstructionsForVersionedTx: buildRemoveLiquidityInstructionsForVersionedTx3 } = await import("./swap-3V2JKETZ.mjs");
      const { instructions, operationId: operationId2 } = await buildRemoveLiquidityInstructionsForVersionedTx3(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      console.log(`[Remove Liquidity] Built ${instructions.length} instructions for atomic execution`);
      const lookupTables = await this.getAddressLookupTables();
      if (lookupTables.length > 0) {
        console.log(`[Remove Liquidity] Using ${lookupTables.length} Address Lookup Tables for compression`);
      }
      const { buildVersionedTransaction: buildVersionedTransaction2, estimateTransactionSize: estimateTransactionSize2, executeVersionedTransaction: executeVersionedTransaction2, MAX_TRANSACTION_SIZE: MAX_TRANSACTION_SIZE2 } = await import("./versioned-transaction-IWYBACS7.mjs");
      const versionedTx = await buildVersionedTransaction2(
        this.connection,
        instructions,
        relayerPubkey,
        {
          computeUnits: 14e5,
          computeUnitPrice: 5e4,
          lookupTables
        }
      );
      const size = estimateTransactionSize2(versionedTx);
      if (size === -1) {
        console.log("[Remove Liquidity] Transaction serialization failed, falling back to sequential execution");
      } else {
        console.log(`[Remove Liquidity] Versioned transaction size: ${size}/${MAX_TRANSACTION_SIZE2} bytes`);
      }
      if (size > 0 && size <= MAX_TRANSACTION_SIZE2) {
        if (relayer) {
          versionedTx.sign([relayer]);
        } else {
          throw new Error("Relayer keypair required for signing versioned transaction");
        }
        console.log("[Remove Liquidity] Executing atomic transaction...");
        const signature = await executeVersionedTransaction2(this.connection, versionedTx, {
          skipPreflight: false
        });
        console.log("[Remove Liquidity] Atomic execution successful!");
        return { signature, slot: 0 };
      }
      console.log("[Remove Liquidity] Transaction too large, falling back to sequential execution");
    } catch (err) {
      console.error("[Remove Liquidity] Atomic execution failed, falling back to sequential:", err);
    }
    console.log("[Remove Liquidity] Using sequential multi-phase execution with batch signing...");
    const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildRemoveLiquidityWithProgram(
      this.program,
      instructionParams,
      heliusRpcUrl
    );
    const { buildCreateNullifierWithProgram: buildCreateNullifierWithProgram2, buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await import("./swap-3V2JKETZ.mjs");
    console.log("[Remove Liquidity] Building all transactions for batch signing...");
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 1", builder: phase1Tx });
    for (let i = 0; i < pendingNullifiers.length; i++) {
      const pn = pendingNullifiers[i];
      const { tx: nullifierTx } = await buildCreateNullifierWithProgram2(
        this.program,
        {
          operationId,
          nullifierIndex: i,
          pool: pn.pool,
          relayer: relayerPubkey,
          nullifier: pn.nullifier
          // Pass nullifier directly for batch signing
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Nullifier ${i}`, builder: nullifierTx });
    }
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
          // Pass commitment directly for batch signing
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Commitment ${i}`, builder: commitmentTx });
    }
    const { tx: closeTx } = await buildClosePendingOperationWithProgram2(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: "Close", builder: closeTx });
    console.log(`[Remove Liquidity] Built ${transactionBuilders.length} transactions`);
    const { Transaction: Transaction3 } = await import("@solana/web3.js");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ builder }) => {
        const tx = await builder.transaction();
        return tx;
      })
    );
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    transactions.forEach((tx) => {
      tx.recentBlockhash = blockhash;
      tx.feePayer = relayerPubkey;
    });
    console.log("[Remove Liquidity] Requesting signature for all transactions...");
    const signedTransactions = await this.signAllTransactions(transactions, relayer);
    console.log(`[Remove Liquidity] All ${signedTransactions.length} transactions signed!`);
    console.log("[Remove Liquidity] Executing signed transactions sequentially...");
    let phase1Signature = "";
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
        phase1Signature = signature;
      }
    }
    console.log("[Remove Liquidity] All transactions executed successfully!");
    return {
      signature: phase1Signature,
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
    const makerPool = new PublicKey10(orderAccount.makerPool || params.order.escrowCommitment);
    const takerInputMint = params.takerInput.tokenMint instanceof Uint8Array ? new PublicKey10(params.takerInput.tokenMint) : params.takerInput.tokenMint;
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
    const pool = new PublicKey10(orderAccount.pool || orderAccount.makerPool);
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
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? new PublicKey10(params.input.tokenMint) : params.input.tokenMint;
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
      [poolPda] = PublicKey10.findProgramAddressSync(
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
      [poolPda] = PublicKey10.findProgramAddressSync(
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
      const randomness = generateRandomness();
      const note = createNote(
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
import { PublicKey as PublicKey11 } from "@solana/web3.js";
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
  const poolId = new PublicKey11(data.slice(offset, offset + 32));
  offset += 32;
  const tokenAMint = new PublicKey11(data.slice(offset, offset + 32));
  offset += 32;
  const tokenBMint = new PublicKey11(data.slice(offset, offset + 32));
  offset += 32;
  const lpMint = new PublicKey11(data.slice(offset, offset + 32));
  offset += 32;
  const stateHash = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset + offset);
  const reserveA = view.getBigUint64(0, true);
  const reserveB = view.getBigUint64(8, true);
  const lpSupply = view.getBigUint64(16, true);
  const feeBps = view.getUint16(24, true);
  offset += 26;
  const authority = new PublicKey11(data.slice(offset, offset + 32));
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
  const data = new Uint8Array(32);
  const view = new DataView(data.buffer);
  view.setBigUint64(0, reserveA, true);
  view.setBigUint64(8, reserveB, true);
  view.setBigUint64(16, lpSupply, true);
  const fullData = new Uint8Array(32 + 32);
  fullData.set(data.slice(0, 24), 0);
  fullData.set(poolId.toBytes(), 24);
  return keccak_256(fullData);
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
export {
  ALTManager,
  CIRCUIT_IDS,
  CloakCraftClient,
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
  MAX_TRANSACTION_SIZE,
  NoteManager,
  PROGRAM_ID,
  ProofGenerator,
  SEEDS,
  VoteOption,
  WALLET_DERIVATION_MESSAGE,
  Wallet,
  addCiphertexts,
  ammPoolExists,
  bigintToFieldString,
  buildAddLiquidityInstructionsForVersionedTx,
  buildAddLiquidityWithProgram,
  buildAtomicMultiPhaseTransaction,
  buildCancelOrderWithProgram,
  buildClosePendingOperationWithProgram,
  buildCreateAggregationWithProgram,
  buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram,
  buildFillOrderWithProgram,
  buildFinalizeDecryptionWithProgram,
  buildInitializeAmmPoolWithProgram,
  buildInitializeCommitmentCounterWithProgram,
  buildInitializePoolWithProgram,
  buildRemoveLiquidityInstructionsForVersionedTx,
  buildRemoveLiquidityWithProgram,
  buildShieldInstructions,
  buildShieldWithProgram,
  buildStoreCommitmentWithProgram,
  buildSubmitDecryptionShareWithProgram,
  buildSubmitVoteWithProgram,
  buildSwapInstructionsForVersionedTx,
  buildSwapWithProgram,
  buildTransactWithProgram,
  buildVersionedTransaction,
  bytesToField,
  bytesToFieldString,
  calculateAddLiquidityAmounts,
  calculateMinOutput,
  calculatePriceImpact,
  calculatePriceRatio,
  calculateRemoveLiquidityOutput,
  calculateSlippage,
  calculateSwapOutput,
  calculateTotalLiquidity,
  canFitInSingleTransaction,
  checkNullifierSpent,
  checkStealthOwnership,
  combineShares,
  computeAmmStateHash,
  computeCircuitInputs,
  computeCommitment,
  computeDecryptionShare,
  createAddressLookupTable,
  createCloakCraftALT,
  createNote,
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
  derivePublicKey,
  deriveSpendingNullifier,
  deriveStealthPrivateKey,
  deriveVaultPda,
  deriveVerificationKeyPda,
  deriveWalletFromSeed,
  deriveWalletFromSignature,
  deserializeAmmPool,
  deserializeEncryptedNote,
  elgamalEncrypt,
  encryptNote,
  encryptVote,
  estimateTransactionSize,
  executeVersionedTransaction,
  extendAddressLookupTable,
  fetchAddressLookupTable,
  fetchAmmPool,
  fieldToBytes,
  formatAmmPool,
  generateDleqProof,
  generateOperationId,
  generateRandomness,
  generateSnarkjsProof,
  generateStealthAddress,
  generateVoteRandomness,
  getAmmPool,
  getInstructionFromAnchorMethod,
  getLightProtocolCommonAccounts,
  getRandomStateTreeSet,
  getStateTreeSet,
  initPoseidon,
  initializePool,
  isInSubgroup,
  isOnCurve,
  lagrangeCoefficient,
  loadCircomArtifacts,
  loadWallet,
  padCircuitId,
  parseGroth16Proof,
  pointAdd,
  poseidonHash,
  poseidonHash2,
  poseidonHashAsync,
  poseidonHashDomain,
  poseidonHashDomainAsync,
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
  verifyDleqProof
};
