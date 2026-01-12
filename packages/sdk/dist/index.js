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
var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
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
  CIRCUIT_IDS: () => CIRCUIT_IDS,
  CloakCraftClient: () => CloakCraftClient,
  DEVNET_LIGHT_TREES: () => DEVNET_LIGHT_TREES,
  DEVNET_V2_TREES: () => DEVNET_V2_TREES,
  DOMAIN_ACTION_NULLIFIER: () => DOMAIN_ACTION_NULLIFIER,
  DOMAIN_COMMITMENT: () => DOMAIN_COMMITMENT,
  DOMAIN_EMPTY_LEAF: () => DOMAIN_EMPTY_LEAF,
  DOMAIN_MERKLE: () => DOMAIN_MERKLE,
  DOMAIN_NULLIFIER_KEY: () => DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER: () => DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_STEALTH: () => DOMAIN_STEALTH,
  FIELD_MODULUS_FQ: () => FIELD_MODULUS_FQ,
  FIELD_MODULUS_FR: () => FIELD_MODULUS_FR,
  GENERATOR: () => GENERATOR,
  IDENTITY: () => IDENTITY,
  LightClient: () => LightClient,
  LightCommitmentClient: () => LightCommitmentClient,
  LightProtocol: () => LightProtocol,
  MAINNET_LIGHT_TREES: () => MAINNET_LIGHT_TREES,
  NoteManager: () => NoteManager,
  PROGRAM_ID: () => PROGRAM_ID,
  ProofGenerator: () => ProofGenerator,
  SEEDS: () => SEEDS,
  WALLET_DERIVATION_MESSAGE: () => WALLET_DERIVATION_MESSAGE,
  Wallet: () => Wallet,
  bigintToFieldString: () => bigintToFieldString,
  buildInitializeCommitmentCounterWithProgram: () => buildInitializeCommitmentCounterWithProgram,
  buildInitializePoolWithProgram: () => buildInitializePoolWithProgram,
  buildShieldInstructions: () => buildShieldInstructions,
  buildShieldWithProgram: () => buildShieldWithProgram,
  buildStoreCommitmentWithProgram: () => buildStoreCommitmentWithProgram,
  buildTransactWithProgram: () => buildTransactWithProgram,
  bytesToField: () => bytesToField,
  bytesToFieldString: () => bytesToFieldString,
  checkNullifierSpent: () => checkNullifierSpent,
  checkStealthOwnership: () => checkStealthOwnership,
  computeCircuitInputs: () => computeCircuitInputs,
  computeCommitment: () => computeCommitment,
  createNote: () => createNote,
  createWallet: () => createWallet,
  createWatchOnlyWallet: () => createWatchOnlyWallet,
  decryptNote: () => decryptNote,
  deriveActionNullifier: () => deriveActionNullifier,
  deriveCommitmentCounterPda: () => deriveCommitmentCounterPda,
  deriveNullifierKey: () => deriveNullifierKey,
  derivePoolPda: () => derivePoolPda,
  derivePublicKey: () => derivePublicKey,
  deriveSpendingNullifier: () => deriveSpendingNullifier,
  deriveStealthPrivateKey: () => deriveStealthPrivateKey,
  deriveVaultPda: () => deriveVaultPda,
  deriveVerificationKeyPda: () => deriveVerificationKeyPda,
  deriveWalletFromSeed: () => deriveWalletFromSeed,
  deriveWalletFromSignature: () => deriveWalletFromSignature,
  deserializeEncryptedNote: () => deserializeEncryptedNote,
  encryptNote: () => encryptNote,
  fieldToBytes: () => fieldToBytes,
  generateRandomness: () => generateRandomness,
  generateSnarkjsProof: () => generateSnarkjsProof,
  generateStealthAddress: () => generateStealthAddress,
  getRandomStateTreeSet: () => getRandomStateTreeSet,
  getStateTreeSet: () => getStateTreeSet,
  initPoseidon: () => initPoseidon,
  initializePool: () => initializePool,
  isInSubgroup: () => isInSubgroup,
  isOnCurve: () => isOnCurve,
  loadCircomArtifacts: () => loadCircomArtifacts,
  loadWallet: () => loadWallet,
  padCircuitId: () => padCircuitId,
  parseGroth16Proof: () => parseGroth16Proof,
  pointAdd: () => pointAdd,
  poseidonHash: () => poseidonHash,
  poseidonHash2: () => poseidonHash2,
  poseidonHashAsync: () => poseidonHashAsync,
  poseidonHashDomain: () => poseidonHashDomain,
  poseidonHashDomainAsync: () => poseidonHashDomainAsync,
  scalarMul: () => scalarMul,
  serializeEncryptedNote: () => serializeEncryptedNote,
  serializeGroth16Proof: () => serializeGroth16Proof,
  storeCommitments: () => storeCommitments,
  tryDecryptNote: () => tryDecryptNote,
  verifyCommitment: () => verifyCommitment
});
module.exports = __toCommonJS(index_exports);
__reExport(index_exports, require("@cloakcraft/types"), module.exports);

// src/client.ts
var import_web310 = require("@solana/web3.js");

// src/crypto/poseidon.ts
var import_circomlibjs = require("circomlibjs");
var DOMAIN_COMMITMENT = 0x01n;
var DOMAIN_SPENDING_NULLIFIER = 0x02n;
var DOMAIN_ACTION_NULLIFIER = 0x03n;
var DOMAIN_NULLIFIER_KEY = 0x04n;
var DOMAIN_STEALTH = 0x05n;
var DOMAIN_MERKLE = 0x06n;
var DOMAIN_EMPTY_LEAF = 0x07n;
var FIELD_MODULUS_FR = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
var FIELD_MODULUS_FQ = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
var FIELD_MODULUS = FIELD_MODULUS_FR;
var poseidonInstance = null;
async function initPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await (0, import_circomlibjs.buildPoseidon)();
  }
  return poseidonInstance;
}
function getPoseidon() {
  if (!poseidonInstance) {
    throw new Error("Poseidon not initialized. Call initPoseidon() first.");
  }
  return poseidonInstance;
}
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
  const poseidon = getPoseidon();
  const fieldInputs = [];
  if (domain !== void 0) {
    fieldInputs.push(domain);
  }
  for (const input of inputs) {
    fieldInputs.push(bytesToField(input));
  }
  const hashResult = poseidon(fieldInputs);
  const hashBigInt = poseidon.F.toObject(hashResult);
  return fieldToBytes(hashBigInt);
}
function poseidonHash2(left, right) {
  return poseidonHash([left, right], DOMAIN_MERKLE);
}
function poseidonHashDomain(domain, ...inputs) {
  return poseidonHash(inputs, domain);
}
async function poseidonHashAsync(inputs, domain) {
  await initPoseidon();
  return poseidonHash(inputs, domain);
}
async function poseidonHashDomainAsync(domain, ...inputs) {
  await initPoseidon();
  return poseidonHashDomain(domain, ...inputs);
}

// src/crypto/babyjubjub.ts
var FIELD_MODULUS2 = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
var SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
var A = 168700n;
var D = 168696n;
var GENERATOR = {
  x: fieldToBytes(5299619240641551281634865583518297030282874472190772894086521144482721001553n),
  y: fieldToBytes(16950150798460657717958625567821834550301663161624707787222815936182638968203n)
};
var IDENTITY = {
  x: fieldToBytes(0n),
  y: fieldToBytes(1n)
};
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
function deriveWalletFromSignature(signature) {
  if (signature.length < 64) {
    throw new Error("Signature must be at least 64 bytes");
  }
  const sig1 = signature.slice(0, 32);
  const sig2 = signature.slice(32, 64);
  const DOMAIN_WALLET = 0x01n;
  const skBytes = poseidonHashDomain(DOMAIN_WALLET, sig1, sig2);
  const sk = bytesToField(skBytes) % SUBGROUP_ORDER2;
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
var import_web32 = require("@solana/web3.js");

// src/crypto/encryption.ts
var import_sha256 = require("@noble/hashes/sha256");
var import_web3 = require("@solana/web3.js");
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
function toHex(arr) {
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function tryDecryptNote(encrypted, recipientPrivateKey) {
  try {
    console.log("[tryDecryptNote] Attempting decryption with key:", recipientPrivateKey.toString(16).slice(0, 16) + "...");
    console.log("[tryDecryptNote] ECIES ephemeral pubkey X:", toHex(encrypted.ephemeralPubkey.x).slice(0, 32) + "...");
    return decryptNote(encrypted, recipientPrivateKey);
  } catch (err) {
    console.log("[tryDecryptNote] Decryption failed:", err);
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
    tokenMint: new import_web3.PublicKey(tokenMintBytes),
    amount,
    randomness: new Uint8Array(randomness)
  };
}
function deriveEncryptionKey(sharedSecretX) {
  const hasher = import_sha256.sha256.create();
  const domainSep = new TextEncoder().encode("cloakcraft-ecies-key");
  hasher.update(domainSep);
  hasher.update(sharedSecretX);
  return hasher.digest();
}
function encryptAEAD(plaintext, key) {
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);
  const hasher = import_sha256.sha256.create();
  hasher.update(key);
  hasher.update(nonce);
  const keyStream = hasher.digest();
  const encrypted = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i++) {
    if (i > 0 && i % 32 === 0) {
      const extHasher = import_sha256.sha256.create();
      extHasher.update(key);
      extHasher.update(nonce);
      extHasher.update(new Uint8Array([i >> 8, i & 255]));
      const ext = extHasher.digest();
      for (let j = 0; j < 32 && i + j < plaintext.length; j++) {
        encrypted[i + j] = plaintext[i + j] ^ ext[j];
      }
    } else if (i < 32) {
      encrypted[i] = plaintext[i] ^ keyStream[i];
    }
  }
  const tagHasher = import_sha256.sha256.create();
  tagHasher.update(key);
  tagHasher.update(nonce);
  tagHasher.update(encrypted);
  const tag = tagHasher.digest().slice(0, 16);
  const ciphertextWithNonce = new Uint8Array(12 + encrypted.length);
  ciphertextWithNonce.set(nonce, 0);
  ciphertextWithNonce.set(encrypted, 12);
  return { ciphertext: ciphertextWithNonce, tag };
}
function decryptAEAD(ciphertext, tag, key) {
  const nonce = ciphertext.slice(0, 12);
  const encrypted = ciphertext.slice(12);
  const tagHasher = import_sha256.sha256.create();
  tagHasher.update(key);
  tagHasher.update(nonce);
  tagHasher.update(encrypted);
  const expectedTag = tagHasher.digest().slice(0, 16);
  let tagValid = true;
  for (let i = 0; i < 16; i++) {
    if (expectedTag[i] !== tag[i]) {
      tagValid = false;
    }
  }
  if (!tagValid) {
    throw new Error("AEAD authentication failed");
  }
  const hasher = import_sha256.sha256.create();
  hasher.update(key);
  hasher.update(nonce);
  const keyStream = hasher.digest();
  const plaintext = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    if (i > 0 && i % 32 === 0) {
      const extHasher = import_sha256.sha256.create();
      extHasher.update(key);
      extHasher.update(nonce);
      extHasher.update(new Uint8Array([i >> 8, i & 255]));
      const ext = extHasher.digest();
      for (let j = 0; j < 32 && i + j < encrypted.length; j++) {
        plaintext[i + j] = encrypted[i + j] ^ ext[j];
      }
    } else if (i < 32) {
      plaintext[i] = encrypted[i] ^ keyStream[i];
    }
  }
  return plaintext;
}
function generateRandomScalar() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER3;
}
function serializeEncryptedNote(encrypted) {
  const totalLen = 32 + 32 + 4 + encrypted.ciphertext.length + 16;
  const buffer = new Uint8Array(totalLen);
  let offset = 0;
  buffer.set(encrypted.ephemeralPubkey.x, offset);
  offset += 32;
  buffer.set(encrypted.ephemeralPubkey.y, offset);
  offset += 32;
  new DataView(buffer.buffer).setUint32(offset, encrypted.ciphertext.length, true);
  offset += 4;
  buffer.set(encrypted.ciphertext, offset);
  offset += encrypted.ciphertext.length;
  buffer.set(encrypted.tag, offset);
  return buffer;
}
function deserializeEncryptedNote(data) {
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
    return {
      ephemeralPubkey: {
        x: new Uint8Array(ephemeralX),
        y: new Uint8Array(ephemeralY)
      },
      ciphertext: new Uint8Array(ciphertext),
      tag: new Uint8Array(tag)
    };
  } catch {
    return null;
  }
}

// src/crypto/commitment.ts
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
            pool: new import_web32.PublicKey(entry.pool)
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
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var os = __toESM(require("os"));

// src/crypto/stealth.ts
var SUBGROUP_ORDER4 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
function generateStealthAddress(recipientPubkey) {
  const toHex2 = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log("[generateStealthAddress] recipientPubkey X:", toHex2(recipientPubkey.x).slice(0, 32) + "...");
  const ephemeralPrivate = generateRandomScalar2();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);
  console.log("[generateStealthAddress] ephemeralPrivate:", ephemeralPrivate.toString(16).slice(0, 16) + "...");
  console.log("[generateStealthAddress] ephemeralPubkey X:", toHex2(ephemeralPubkey.x).slice(0, 32) + "...");
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);
  console.log("[generateStealthAddress] sharedSecret X:", toHex2(sharedSecret.x).slice(0, 32) + "...");
  const factor = deriveStealthFactor(sharedSecret.x);
  console.log("[generateStealthAddress] factor:", factor.toString(16).slice(0, 16) + "...");
  const factorPoint = scalarMul(GENERATOR, factor);
  const stealthPubkey = addPoints(recipientPubkey, factorPoint);
  console.log("[generateStealthAddress] stealthPubkey X:", toHex2(stealthPubkey.x).slice(0, 32) + "...");
  return {
    stealthAddress: {
      stealthPubkey,
      ephemeralPubkey
    },
    ephemeralPrivate
  };
}
function deriveStealthPrivateKey(recipientPrivateKey, ephemeralPubkey) {
  const toHex2 = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log("[deriveStealthPrivateKey] recipientPrivateKey:", recipientPrivateKey.toString(16).slice(0, 16) + "...");
  console.log("[deriveStealthPrivateKey] ephemeralPubkey X:", toHex2(ephemeralPubkey.x).slice(0, 32) + "...");
  const sharedSecret = scalarMul(ephemeralPubkey, recipientPrivateKey);
  console.log("[deriveStealthPrivateKey] sharedSecret X:", toHex2(sharedSecret.x).slice(0, 32) + "...");
  const factor = deriveStealthFactor(sharedSecret.x);
  console.log("[deriveStealthPrivateKey] factor:", factor.toString(16).slice(0, 16) + "...");
  const stealthPriv = (recipientPrivateKey + factor) % SUBGROUP_ORDER4;
  console.log("[deriveStealthPrivateKey] stealthPrivateKey:", stealthPriv.toString(16).slice(0, 16) + "...");
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
  return bytesToField(hash) % SUBGROUP_ORDER4;
}
function addPoints(p1, p2) {
  return pointAdd(p1, p2);
}
function generateRandomScalar2() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER4;
}

// src/snarkjs-prover.ts
var BN254_FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
var artifactsCache = /* @__PURE__ */ new Map();
async function loadCircomArtifacts(circuitName, wasmUrl, zkeyUrl) {
  const cached = artifactsCache.get(circuitName);
  if (cached) {
    console.log(`[${circuitName}] Using cached artifacts`);
    return cached;
  }
  const isNode = typeof globalThis.process !== "undefined" && globalThis.process.versions != null && globalThis.process.versions.node != null;
  let wasmBuffer;
  let zkeyBuffer;
  if (isNode) {
    const fs2 = await import("fs");
    const path2 = await import("path");
    const projectRoot = path2.resolve(__dirname, "../../..");
    const circomDir = path2.join(projectRoot, "apps", "demo", "public", "circom");
    const wasmPath = path2.join(circomDir, path2.basename(wasmUrl));
    const zkeyPath = path2.join(circomDir, path2.basename(zkeyUrl));
    console.log(`[${circuitName}] Loading WASM from ${wasmPath}`);
    wasmBuffer = fs2.readFileSync(wasmPath).buffer;
    console.log(`[${circuitName}] WASM loaded (${wasmBuffer.byteLength} bytes)`);
    console.log(`[${circuitName}] Loading zkey from ${zkeyPath}`);
    zkeyBuffer = fs2.readFileSync(zkeyPath).buffer;
    console.log(`[${circuitName}] zkey loaded (${zkeyBuffer.byteLength} bytes)`);
  } else {
    console.log(`[${circuitName}] Loading WASM from ${wasmUrl}`);
    const wasmRes = await fetch(wasmUrl);
    if (!wasmRes.ok) {
      throw new Error(`Failed to load WASM: ${wasmRes.status}`);
    }
    wasmBuffer = await wasmRes.arrayBuffer();
    console.log(`[${circuitName}] WASM loaded (${wasmBuffer.byteLength} bytes)`);
    console.log(`[${circuitName}] Loading zkey from ${zkeyUrl}`);
    const zkeyRes = await fetch(zkeyUrl);
    if (!zkeyRes.ok) {
      throw new Error(`Failed to load zkey: ${zkeyRes.status}`);
    }
    zkeyBuffer = await zkeyRes.arrayBuffer();
    console.log(`[${circuitName}] zkey loaded (${zkeyBuffer.byteLength} bytes)`);
  }
  const artifacts = { wasmBuffer, zkeyBuffer };
  artifactsCache.set(circuitName, artifacts);
  return artifacts;
}
async function generateSnarkjsProof(artifacts, inputs) {
  const snarkjs = await import("snarkjs");
  console.log("[snarkjs] Generating witness...");
  const startTime = performance.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    new Uint8Array(artifacts.wasmBuffer),
    new Uint8Array(artifacts.zkeyBuffer)
  );
  const elapsed = performance.now() - startTime;
  console.log(`[snarkjs] Proof generated in ${elapsed.toFixed(0)}ms`);
  console.log("[snarkjs] Public signals (decimal):", publicSignals);
  console.log("[snarkjs] Public signals (hex):");
  publicSignals.forEach((sig, i) => {
    const hex = BigInt(sig).toString(16).padStart(64, "0");
    console.log(`  [${i}]: 0x${hex}`);
  });
  console.log("[snarkjs] Raw proof from snarkjs:");
  console.log("  pi_a[0] (x):", proof.pi_a[0]);
  console.log("  pi_a[1] (y):", proof.pi_a[1]);
  console.log("  pi_b[0][0] (x_re):", proof.pi_b[0][0]);
  console.log("  pi_b[0][1] (x_im):", proof.pi_b[0][1]);
  console.log("  pi_b[1][0] (y_re):", proof.pi_b[1][0]);
  console.log("  pi_b[1][1] (y_im):", proof.pi_b[1][1]);
  console.log("  pi_c[0] (x):", proof.pi_c[0]);
  console.log("  pi_c[1] (y):", proof.pi_c[1]);
  const formattedProof = formatSnarkjsProofForSolana(proof);
  const toHexStr = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log("[snarkjs] Formatted proof:");
  console.log("  A.x (0-32):  ", toHexStr(formattedProof.slice(0, 32)));
  console.log("  A.y (32-64): ", toHexStr(formattedProof.slice(32, 64)), "(negated)");
  console.log("  B.x_im (64-96):", toHexStr(formattedProof.slice(64, 96)));
  console.log("  B.x_re (96-128):", toHexStr(formattedProof.slice(96, 128)));
  console.log("  B.y_im (128-160):", toHexStr(formattedProof.slice(128, 160)));
  console.log("  B.y_re (160-192):", toHexStr(formattedProof.slice(160, 192)));
  console.log("  C.x (192-224):", toHexStr(formattedProof.slice(192, 224)));
  console.log("  C.y (224-256):", toHexStr(formattedProof.slice(224, 256)));
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
    const circuitFileName = CIRCUIT_FILE_MAP[name];
    if (!circuitFileName) {
      console.warn(`Unknown circuit: ${name}`);
      return;
    }
    const basePath = `${this.baseUrl}/target`;
    try {
      const manifestUrl = `${basePath}/${circuitFileName}.json`;
      console.log(`[${name}] Loading manifest from ${manifestUrl}`);
      const manifestRes = await fetch(manifestUrl);
      if (!manifestRes.ok) throw new Error(`Failed to load manifest: ${manifestRes.status}`);
      const manifest = await manifestRes.json();
      const pkUrl = `${basePath}/${circuitFileName}.pk`;
      console.log(`[${name}] Loading proving key from ${pkUrl}`);
      const pkRes = await fetch(pkUrl);
      if (!pkRes.ok) throw new Error(`Failed to load proving key: ${pkRes.status}`);
      const provingKey = new Uint8Array(await pkRes.arrayBuffer());
      this.circuits.set(name, { manifest, provingKey });
      console.log(`[${name}] Circuit loaded successfully`);
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
   *
   * Returns 256-byte proof formatted for Solana's alt_bn128 verifier
   */
  async prove(circuitName, inputs) {
    const artifacts = this.circuits.get(circuitName);
    if (!artifacts) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
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
   * Prove via subprocess (Node.js)
   *
   * Workflow:
   * 1. Write Prover.toml with inputs
   * 2. Run nargo execute to generate witness
   * 3. Run sunspot prove with witness, ACIR, CCS, PK
   * 4. Parse proof output
   */
  async proveViaSubprocess(circuitName, inputs, _artifacts) {
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
    const witnessPath = path.join(targetDir, `${circuitFileName}.gz`);
    const proofPath = path.join(targetDir, `${circuitFileName}.proof`);
    if (!fs.existsSync(acirPath)) throw new Error(`ACIR not found: ${acirPath}`);
    if (!fs.existsSync(ccsPath)) throw new Error(`CCS not found: ${ccsPath}`);
    if (!fs.existsSync(pkPath)) throw new Error(`PK not found: ${pkPath}`);
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
    if (!fs.existsSync(witnessPath)) {
      throw new Error(`Witness not generated at ${witnessPath}`);
    }
    console.log(`[${circuitName}] Generating Groth16 proof...`);
    try {
      execFileSync(sunspotPath, ["prove", acirPath, witnessPath, ccsPath, pkPath], {
        cwd: targetDir,
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
    const rawProofBytes = fs.readFileSync(proofPath);
    console.log(`[${circuitName}] Raw proof generated (${rawProofBytes.length} bytes)`);
    if (rawProofBytes.length < 256) {
      throw new Error(`Proof too small: ${rawProofBytes.length} bytes (need at least 256)`);
    }
    return {
      a: new Uint8Array(rawProofBytes.slice(0, 64)),
      b: new Uint8Array(rawProofBytes.slice(64, 192)),
      c: new Uint8Array(rawProofBytes.slice(192, 256))
    };
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
    console.log(`[${circuitName}] Loading circom artifacts...`);
    let artifacts = this.circomArtifacts.get(circuitName);
    if (!artifacts) {
      artifacts = await loadCircomArtifacts(circuitName, wasmUrl, zkeyUrl);
      this.circomArtifacts.set(circuitName, artifacts);
    }
    const circomInputs = this.convertToCircomInputs(inputs);
    console.log(`[${circuitName}] Circom inputs prepared`);
    console.log(`[${circuitName}] Generating Groth16 proof via snarkjs...`);
    const proofBytes = await generateSnarkjsProof(artifacts, circomInputs);
    console.log(`[${circuitName}] Proof generated (${proofBytes.length} bytes)`);
    return proofBytes;
  }
  /**
   * Get circom file name from circuit name
   */
  getCircomFileName(circuitName) {
    const mapping = {
      "transfer/1x2": "transfer_1x2",
      "transfer/1x3": "transfer_1x3"
      // Add more circuits as they're ported
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
      console.log("[buildTransferWitness] Derived stealth spending key from ephemeral pubkey");
    } else {
      stealthSpendingKey = bytesToField(spendingKey);
      console.warn("[buildTransferWitness] No ephemeral pubkey - using base spending key directly");
    }
    const stealthNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
    const commitment = computeCommitment(input);
    const nullifier = deriveSpendingNullifier(stealthNullifierKey, commitment, input.leafIndex);
    console.log("[buildTransferWitness] === Proof Public Inputs Debug ===");
    console.log("[buildTransferWitness] nullifier:", Array.from(nullifier.slice(0, 8)));
    console.log("[buildTransferWitness] input commitment:", Array.from(commitment.slice(0, 8)));
    console.log("[buildTransferWitness] out_commitment_1:", Array.from(params.outputs[0].commitment.slice(0, 8)));
    console.log("[buildTransferWitness] leafIndex:", input.leafIndex);
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

// src/light.ts
var import_web33 = require("@solana/web3.js");
var import_stateless = require("@lightprotocol/stateless.js");
var LightClient = class {
  constructor(config) {
    const baseUrl = config.network === "mainnet-beta" ? "https://mainnet.helius-rpc.com" : "https://devnet.helius-rpc.com";
    this.rpcUrl = `${baseUrl}/?api-key=${config.apiKey}`;
    this.lightRpc = (0, import_stateless.createRpc)(this.rpcUrl, this.rpcUrl, this.rpcUrl);
  }
  /**
   * Get compressed account by address
   *
   * Returns null if account doesn't exist (nullifier not spent)
   */
  async getCompressedAccount(address) {
    const addressBase58 = new import_web33.PublicKey(address).toBase58();
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
      address: new import_web33.PublicKey(addr).toBase58(),
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
      merkleTrees: result.result.merkleTrees.map((t) => new import_web33.PublicKey(t))
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
    const LIGHT_SYSTEM_PROGRAM = new import_web33.PublicKey("LightSystem111111111111111111111111111111111");
    const ACCOUNT_COMPRESSION_PROGRAM = new import_web33.PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
    const NOOP_PROGRAM = new import_web33.PublicKey("noopb9bkMVfRPU8AsBHBNRs27gxNvyqrDGj3zPqsR");
    const REGISTERED_PROGRAM_PDA = new import_web33.PublicKey("4LfVCK1CgVbS6Xeu1RSMvKWv9NLLdwVBJ64dJpqpKbLi");
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
    const seed = (0, import_stateless.deriveAddressSeedV2)(seeds);
    const address = (0, import_stateless.deriveAddressV2)(seed, addressTree, programId);
    return address.toBytes();
  }
};
var DEVNET_LIGHT_TREES = {
  /** V2 batch address tree from Light SDK getBatchAddressTreeInfo() */
  addressTree: new import_web33.PublicKey("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx"),
  /** 5 parallel state tree sets for throughput */
  stateTrees: [
    {
      stateTree: new import_web33.PublicKey("bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU"),
      outputQueue: new import_web33.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto"),
      cpiContext: new import_web33.PublicKey("cpi15BoVPKgEPw5o8wc2T816GE7b378nMXnhH3Xbq4y")
    },
    {
      stateTree: new import_web33.PublicKey("bmt2UxoBxB9xWev4BkLvkGdapsz6sZGkzViPNph7VFi"),
      outputQueue: new import_web33.PublicKey("oq2UkeMsJLfXt2QHzim242SUi3nvjJs8Pn7Eac9H9vg"),
      cpiContext: new import_web33.PublicKey("cpi2yGapXUR3As5SjnHBAVvmApNiLsbeZpF3euWnW6B")
    },
    {
      stateTree: new import_web33.PublicKey("bmt3ccLd4bqSVZVeCJnH1F6C8jNygAhaDfxDwePyyGb"),
      outputQueue: new import_web33.PublicKey("oq3AxjekBWgo64gpauB6QtuZNesuv19xrhaC1ZM1THQ"),
      cpiContext: new import_web33.PublicKey("cpi3mbwMpSX8FAGMZVP85AwxqCaQMfEk9Em1v8QK9Rf")
    },
    {
      stateTree: new import_web33.PublicKey("bmt4d3p1a4YQgk9PeZv5s4DBUmbF5NxqYpk9HGjQsd8"),
      outputQueue: new import_web33.PublicKey("oq4ypwvVGzCUMoiKKHWh4S1SgZJ9vCvKpcz6RT6A8dq"),
      cpiContext: new import_web33.PublicKey("cpi4yyPDc4bCgHAnsenunGA8Y77j3XEDyjgfyCKgcoc")
    },
    {
      stateTree: new import_web33.PublicKey("bmt5yU97jC88YXTuSukYHa8Z5Bi2ZDUtmzfkDTA2mG2"),
      outputQueue: new import_web33.PublicKey("oq5oh5ZR3yGomuQgFduNDzjtGvVWfDRGLuDVjv9a96P"),
      cpiContext: new import_web33.PublicKey("cpi5ZTjdgYpZ1Xr7B1cMLLUE81oTtJbNNAyKary2nV6")
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
  addressTree: new import_web33.PublicKey("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx"),
  stateTrees: DEVNET_LIGHT_TREES.stateTrees
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
   * Get merkle proof for a commitment using account hash
   *
   * This is the preferred method - uses the hash stored during scanning.
   * Uses Light SDK for proper API handling.
   */
  async getMerkleProofByHash(accountHash) {
    console.log("[getMerkleProofByHash] Fetching proof for hash:", accountHash);
    const hashBytes = new import_web33.PublicKey(accountHash).toBytes();
    const hashBn = (0, import_stateless.bn)(hashBytes);
    const proofResult = await this.lightRpc.getCompressedAccountProof(hashBn);
    console.log("[getMerkleProofByHash] Got proof, leafIndex:", proofResult.leafIndex);
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
    const addressBase58 = new import_web33.PublicKey(address).toBase58();
    console.log("[getCommitmentMerkleProof] Derived address:", addressBase58);
    const account = await this.getCompressedAccount(address);
    if (!account) {
      throw new Error(`Commitment account not found at address: ${addressBase58}`);
    }
    console.log("[getCommitmentMerkleProof] Found account with hash:", account.hash);
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
    const seed = (0, import_stateless.deriveAddressSeedV2)(seeds);
    const address = (0, import_stateless.deriveAddressV2)(seed, addressTree, programId);
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
    const addressTree = DEVNET_LIGHT_TREES.addressTree;
    const results = [];
    for (const note of notes) {
      const nullifier = deriveSpendingNullifier(
        nullifierKey,
        note.commitment,
        note.leafIndex
      );
      const spent = await this.isNullifierSpent(nullifier, programId, addressTree, note.pool);
      results.push({
        ...note,
        spent,
        nullifier
      });
    }
    return results;
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
    console.log(`[scanNotes] Scanning for notes. Pool: ${pool?.toBase58() ?? "all"}`);
    const accounts = await this.getCommitmentAccounts(programId, pool);
    console.log(`[scanNotes] Found ${accounts.length} accounts from Helius`);
    const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513e3;
    const decryptedNotes = [];
    for (const account of accounts) {
      if (!account.data?.data) {
        console.log("[scanNotes] Skipping account - no data");
        continue;
      }
      const disc = account.data.discriminator;
      console.log(`[scanNotes] Account discriminator: ${disc}`);
      if (!disc || Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) > 1e3) {
        console.log("[scanNotes] Skipping - discriminator mismatch");
        continue;
      }
      const dataLen = atob(account.data.data).length;
      console.log(`[scanNotes] Account data length: ${dataLen}`);
      if (dataLen < 260) {
        console.log("[scanNotes] Skipping - data too short");
        continue;
      }
      try {
        const parsed = this.parseCommitmentAccountData(account.data.data);
        if (!parsed) {
          console.log("[scanNotes] Failed to parse commitment account");
          continue;
        }
        console.log(`[scanNotes] Parsed commitment, leafIndex: ${parsed.leafIndex}`);
        const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
        if (!encryptedNote) {
          console.log("[scanNotes] Failed to deserialize encrypted note");
          continue;
        }
        console.log("[scanNotes] Deserialized encrypted note");
        let decryptionKey;
        const toHex2 = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
        if (parsed.stealthEphemeralPubkey) {
          console.log("[scanNotes] Stealth ephemeral X:", toHex2(parsed.stealthEphemeralPubkey.x).slice(0, 32) + "...");
          console.log("[scanNotes] viewingKey:", viewingKey.toString(16).slice(0, 16) + "...");
          decryptionKey = deriveStealthPrivateKey(viewingKey, parsed.stealthEphemeralPubkey);
          console.log("[scanNotes] Derived stealthPrivateKey:", decryptionKey.toString(16).slice(0, 16) + "...");
        } else {
          decryptionKey = viewingKey;
          console.log("[scanNotes] Using original viewingKey for decryption (internal op)");
        }
        const note = tryDecryptNote(encryptedNote, decryptionKey);
        if (!note) {
          console.log("[scanNotes] Failed to decrypt note (not ours or wrong format)");
          continue;
        }
        console.log(`[scanNotes] Decrypted note! Amount: ${note.amount}`);
        console.log("[scanNotes] leafIndex:", parsed.leafIndex);
        decryptedNotes.push({
          ...note,
          commitment: parsed.commitment,
          leafIndex: parsed.leafIndex,
          pool: new import_web33.PublicKey(parsed.pool),
          accountHash: account.hash,
          // Store for merkle proof fetching
          stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? void 0
          // Store for stealth key derivation
        });
      } catch (err) {
        console.log("[scanNotes] Error processing account:", err);
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
   * Layout (after discriminator):
   * - pool: 32 bytes
   * - commitment: 32 bytes
   * - leaf_index: 8 bytes (u64)
   * - stealth_ephemeral_pubkey: 64 bytes (X + Y coordinates)
   * - encrypted_note_len: 4 bytes (u32)
   * - encrypted_note: variable bytes
   * - created_at: 8 bytes (i64)
   */
  parseCommitmentAccountData(dataBase64) {
    try {
      const binaryString = atob(dataBase64);
      const data = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        data[i] = binaryString.charCodeAt(i);
      }
      if (data.length < 140) {
        console.log("[parseCommitment] Data too short");
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
      const encryptedNoteLen = view.getUint32(136, true);
      if (encryptedNoteLen > data.length - 140) {
        console.log(`[parseCommitment] Invalid encrypted note length - would exceed buffer`);
        return null;
      }
      const encryptedNote = data.slice(140, 140 + encryptedNoteLen);
      return {
        pool: new Uint8Array(pool),
        commitment: new Uint8Array(commitment),
        leafIndex,
        stealthEphemeralPubkey,
        encryptedNote: new Uint8Array(encryptedNote)
      };
    } catch (err) {
      console.log("[parseCommitment] Error:", err);
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

// src/instructions/constants.ts
var import_web34 = require("@solana/web3.js");
var PROGRAM_ID = new import_web34.PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");
var SEEDS = {
  POOL: Buffer.from("pool"),
  VAULT: Buffer.from("vault"),
  VERIFICATION_KEY: Buffer.from("vk"),
  COMMITMENT_COUNTER: Buffer.from("commitment_counter")
};
var DEVNET_V2_TREES = {
  STATE_TREE: new import_web34.PublicKey("bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU"),
  OUTPUT_QUEUE: new import_web34.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto"),
  ADDRESS_TREE: new import_web34.PublicKey("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx")
};
var CIRCUIT_IDS = {
  TRANSFER_1X2: "transfer_1x2",
  TRANSFER_1X3: "transfer_1x3",
  TRANSFER_2X2: "transfer_2x2",
  TRANSFER_2X3: "transfer_2x3",
  TRANSFER_3X2: "transfer_3x2",
  TRANSFER_3X3: "transfer_3x3"
};
function padCircuitId(id) {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}
function derivePoolPda(tokenMint, programId = PROGRAM_ID) {
  return import_web34.PublicKey.findProgramAddressSync(
    [SEEDS.POOL, tokenMint.toBuffer()],
    programId
  );
}
function deriveVaultPda(tokenMint, programId = PROGRAM_ID) {
  return import_web34.PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, tokenMint.toBuffer()],
    programId
  );
}
function deriveCommitmentCounterPda(pool, programId = PROGRAM_ID) {
  return import_web34.PublicKey.findProgramAddressSync(
    [SEEDS.COMMITMENT_COUNTER, pool.toBuffer()],
    programId
  );
}
function deriveVerificationKeyPda(circuitId, programId = PROGRAM_ID) {
  return import_web34.PublicKey.findProgramAddressSync(
    [SEEDS.VERIFICATION_KEY, padCircuitId(circuitId)],
    programId
  );
}

// src/instructions/light-helpers.ts
var import_web35 = require("@solana/web3.js");
var import_stateless2 = require("@lightprotocol/stateless.js");
var LightProtocol = class {
  constructor(rpcUrl, programId = PROGRAM_ID) {
    this.rpc = (0, import_stateless2.createRpc)(rpcUrl, rpcUrl);
    this.programId = programId;
  }
  /**
   * Get batch address tree info
   */
  getAddressTreeInfo() {
    return (0, import_stateless2.getBatchAddressTreeInfo)();
  }
  /**
   * Derive commitment address using Light SDK V2
   */
  deriveCommitmentAddress(pool, commitment) {
    const addressTreeInfo = this.getAddressTreeInfo();
    const seeds = [
      Buffer.from("commitment"),
      pool.toBuffer(),
      Buffer.from(commitment)
    ];
    const addressSeed = (0, import_stateless2.deriveAddressSeedV2)(seeds);
    return (0, import_stateless2.deriveAddressV2)(addressSeed, addressTreeInfo.tree, this.programId);
  }
  /**
   * Derive nullifier address using Light SDK V2
   */
  deriveNullifierAddress(pool, nullifier) {
    const addressTreeInfo = this.getAddressTreeInfo();
    const seeds = [
      Buffer.from("spend_nullifier"),
      pool.toBuffer(),
      Buffer.from(nullifier)
    ];
    const addressSeed = (0, import_stateless2.deriveAddressSeedV2)(seeds);
    return (0, import_stateless2.deriveAddressV2)(addressSeed, addressTreeInfo.tree, this.programId);
  }
  /**
   * Get validity proof for creating a new compressed account (non-inclusion)
   */
  async getValidityProof(addresses) {
    const addressTreeInfo = this.getAddressTreeInfo();
    return this.rpc.getValidityProofV0(
      [],
      // No existing hashes
      addresses.map((addr) => ({
        address: (0, import_stateless2.bn)(addr.toBytes()),
        tree: addressTreeInfo.tree,
        queue: addressTreeInfo.queue
      }))
    );
  }
  /**
   * Get combined validity proof for transact:
   * - Inclusion proof for commitment (proves note exists on-chain)
   * - Non-inclusion proof for nullifier (proves not yet spent)
   *
   * This prevents fake commitment attacks where someone fabricates
   * commitment data without having actually shielded tokens.
   */
  async getCombinedValidityProof(commitmentAccountHash, nullifierAddress) {
    const addressTreeInfo = this.getAddressTreeInfo();
    const hashBytes = new import_web35.PublicKey(commitmentAccountHash).toBytes();
    return this.rpc.getValidityProofV0(
      // Inclusion: commitment exists in state tree
      [{
        hash: (0, import_stateless2.bn)(hashBytes),
        tree: DEVNET_V2_TREES.STATE_TREE,
        queue: DEVNET_V2_TREES.OUTPUT_QUEUE
      }],
      // Non-inclusion: nullifier doesn't exist yet
      [{
        address: (0, import_stateless2.bn)(nullifierAddress.toBytes()),
        tree: addressTreeInfo.tree,
        queue: addressTreeInfo.queue
      }]
    );
  }
  /**
   * Build remaining accounts for Light Protocol CPI
   */
  buildRemainingAccounts() {
    const systemConfig = import_stateless2.SystemAccountMetaConfig.new(this.programId);
    const packedAccounts = import_stateless2.PackedAccounts.newWithSystemAccountsV2(systemConfig);
    const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);
    const addressTreeInfo = this.getAddressTreeInfo();
    const addressTreeIndex = packedAccounts.insertOrGet(addressTreeInfo.tree);
    const { remainingAccounts } = packedAccounts.toAccountMetas();
    const accounts = remainingAccounts.map((acc) => ({
      pubkey: acc.pubkey,
      isWritable: Boolean(acc.isWritable),
      isSigner: Boolean(acc.isSigner)
    }));
    return { accounts, outputTreeIndex, addressTreeIndex };
  }
  /**
   * Convert Light SDK compressed proof to Anchor format
   */
  static convertCompressedProof(proof) {
    const proofA = new Uint8Array(32);
    const proofB = new Uint8Array(64);
    const proofC = new Uint8Array(32);
    if (proof.compressedProof) {
      proofA.set(proof.compressedProof.a.slice(0, 32));
      proofB.set(proof.compressedProof.b.slice(0, 64));
      proofC.set(proof.compressedProof.c.slice(0, 32));
    }
    return {
      a: Array.from(proofA),
      b: Array.from(proofB),
      c: Array.from(proofC)
    };
  }
};

// src/instructions/shield.ts
var import_web36 = require("@solana/web3.js");
var import_spl_token = require("@solana/spl-token");
var import_anchor = require("@coral-xyz/anchor");
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
  const toHex2 = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log("[shield] Encrypting to stealthPubkey X:", toHex2(params.stealthPubkey.x).slice(0, 32) + "...");
  console.log("[shield] stealthEphemeralPubkey X:", toHex2(params.stealthEphemeralPubkey.x).slice(0, 32) + "...");
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
    import_web36.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web36.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
  const toHex2 = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  console.log("[buildShieldWithProgram] Encrypting to stealthPubkey X:", toHex2(params.stealthPubkey.x).slice(0, 32) + "...");
  console.log("[buildShieldWithProgram] stealthEphemeralPubkey X:", toHex2(params.stealthEphemeralPubkey.x).slice(0, 32) + "...");
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
    new import_anchor.BN(params.amount.toString()),
    Array.from(stealthEphemeralBytes),
    Buffer.from(serializedNote),
    lightParams
  ).accountsStrict({
    pool: poolPda,
    commitmentCounter: counterPda,
    tokenVault: vaultPda,
    userTokenAccount: params.userTokenAccount,
    user: params.user,
    tokenProgram: import_spl_token.TOKEN_PROGRAM_ID
  }).remainingAccounts(remainingAccounts).preInstructions([
    import_web36.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web36.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return { tx, commitment, randomness };
}

// src/instructions/transact.ts
var import_web37 = require("@solana/web3.js");
var import_spl_token2 = require("@solana/spl-token");
var import_anchor2 = require("@coral-xyz/anchor");
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
  for (const output of params.outputs) {
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
  }
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
  const combinedProof = await lightProtocol.getCombinedValidityProof(
    params.input.accountHash,
    nullifierAddress
  );
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const lightParams = {
    validityProof: LightProtocol.convertCompressedProof(combinedProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: combinedProof.rootIndices[1] ?? 0
      // Index 1 is for address tree (nullifier)
    },
    outputTreeIndex
  };
  let unshieldRecipientAta = null;
  if (params.unshieldRecipient && params.unshieldAmount && params.unshieldAmount > 0n) {
    unshieldRecipientAta = (0, import_spl_token2.getAssociatedTokenAddressSync)(
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
    new import_anchor2.BN((params.unshieldAmount ?? 0n).toString()),
    lightParams
  ).accountsStrict({
    pool: poolPda,
    commitmentCounter: counterPda,
    tokenVault: vaultPda,
    verificationKey: vkPda,
    unshieldRecipient: unshieldRecipientAta ?? null,
    relayer: params.relayer,
    tokenProgram: import_spl_token2.TOKEN_PROGRAM_ID
  }).remainingAccounts(remainingAccounts).preInstructions([
    import_web37.ComputeBudgetProgram.setComputeUnitLimit({ units: 14e5 }),
    import_web37.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return {
    tx,
    result: {
      nullifier,
      outputCommitments,
      encryptedNotes,
      outputRandomness,
      stealthEphemeralPubkeys
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
var import_web38 = require("@solana/web3.js");
var import_anchor3 = require("@coral-xyz/anchor");
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
    leafIndex: new import_anchor3.BN(params.leafIndex.toString()),
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
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
var import_web39 = require("@solana/web3.js");
var import_spl_token3 = require("@solana/spl-token");
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
    tokenProgram: import_spl_token3.TOKEN_PROGRAM_ID,
    systemProgram: import_web39.SystemProgram.programId
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
    systemProgram: import_web39.SystemProgram.programId
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

// src/client.ts
var CloakCraftClient = class {
  constructor(config) {
    this.wallet = null;
    this.lightClient = null;
    this.program = null;
    this.heliusRpcUrl = null;
    this.connection = new import_web310.Connection(config.rpcUrl, config.commitment ?? "confirmed");
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
    const [poolPda] = import_web310.PublicKey.findProgramAddressSync(
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
      tokenMint: new import_web310.PublicKey(data.subarray(8, 40)),
      tokenVault: new import_web310.PublicKey(data.subarray(40, 72)),
      totalShielded: data.readBigUInt64LE(72),
      authority: new import_web310.PublicKey(data.subarray(80, 112)),
      bump: data[112],
      vaultBump: data[113]
    };
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
    const tokenMint = params.inputs[0].tokenMint instanceof Uint8Array ? new import_web310.PublicKey(params.inputs[0].tokenMint) : params.inputs[0].tokenMint;
    const [poolPda] = import_web310.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    const [counterPda] = import_web310.PublicKey.findProgramAddressSync(
      [Buffer.from("commitment_counter"), poolPda.toBuffer()],
      this.programId
    );
    const counterAccount = await this.connection.getAccountInfo(counterPda);
    if (!counterAccount) {
      throw new Error("PoolCommitmentCounter not found. Initialize pool first.");
    }
    const baseLeafIndex = counterAccount.data.readBigUInt64LE(40);
    console.log(`[transfer] Current leaf index: ${baseLeafIndex}`);
    console.log("[transfer] Generating ZK proof...");
    const proof = await this.proofGenerator.generateTransferProof(
      params,
      this.wallet.keypair
    );
    console.log(`[transfer] Proof generated (${proof.length} bytes)`);
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
    const toHex2 = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
    const toFieldBigInt = (arr) => BigInt("0x" + toHex2(arr));
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
    console.log("[transfer] === SDK Public Inputs (hex) - COMPARE WITH SNARKJS ===");
    console.log("[transfer] [0] merkle_root:      0x" + toFieldBigInt(params.merkleRoot).toString(16).padStart(64, "0"));
    console.log("[transfer] [1] nullifier:        0x" + toFieldBigInt(nullifier).toString(16).padStart(64, "0"));
    console.log("[transfer] [2] out_commitment_1: 0x" + toFieldBigInt(params.outputs[0].commitment).toString(16).padStart(64, "0"));
    console.log("[transfer] [3] out_commitment_2: 0x" + toFieldBigInt(out2Commitment).toString(16).padStart(64, "0"));
    console.log("[transfer] [4] token_mint:       0x" + tokenMintField.toString(16).padStart(64, "0"));
    console.log("[transfer] [5] unshield_amount:  0x" + (params.unshield?.amount ?? 0n).toString(16).padStart(64, "0"));
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
    console.log(`[transfer] Transaction submitted: ${signature}`);
    const realOutputs = result.outputCommitments.map((c, i) => ({
      commitment: c,
      leafIndex: baseLeafIndex + BigInt(i),
      stealthEphemeralPubkey: result.stealthEphemeralPubkeys[i],
      encryptedNote: result.encryptedNotes[i]
    })).filter((o) => o.encryptedNote.length > 0);
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
    console.log("[prepareAndTransfer] Using leafIndex from scanned note:", preparedInputs[0].leafIndex);
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
    console.log("[createAMMOrder] Updating leafIndex from proof:", merkleProof.leafIndex);
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
  /**
   * Scan for notes belonging to the current wallet
   *
   * Uses the Light Protocol scanner to find and decrypt notes
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
    let poolPda;
    if (tokenMint) {
      [poolPda] = import_web310.PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), tokenMint.toBuffer()],
        this.programId
      );
    }
    return this.lightClient.scanNotes(viewingKey, this.programId, poolPda);
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
      [poolPda] = import_web310.PublicKey.findProgramAddressSync(
        [Buffer.from("pool"), tokenMint.toBuffer()],
        this.programId
      );
    }
    return this.lightClient.getBalance(viewingKey, nullifierKey, this.programId, poolPda);
  }
  // =============================================================================
  // Private Methods
  // =============================================================================
  async buildAdapterSwapTransaction(_params, _proof) {
    const tx = new import_web310.Transaction();
    return tx;
  }
  async buildCreateOrderTransaction(_params, _proof) {
    const tx = new import_web310.Transaction();
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
    console.log("[prepareOutputs] Using tokenMint:", tokenMint.toBase58());
    return outputs.map((output) => {
      const randomness = generateRandomness();
      const note = createNote(
        output.recipient.stealthPubkey.x,
        tokenMint,
        output.amount,
        randomness
      );
      const commitment = computeCommitment(note);
      console.log("[prepareOutputs] Output amount:", output.amount.toString());
      console.log("[prepareOutputs] Commitment:", Buffer.from(commitment).toString("hex").slice(0, 24) + "...");
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
      console.log("[fetchMerkleProof] Using stored accountHash");
      const proof2 = await this.lightClient.getMerkleProofByHash(note.accountHash);
      console.log("[fetchMerkleProof] Proof leafIndex:", proof2.leafIndex);
      return {
        root: proof2.root,
        pathElements: proof2.pathElements,
        pathIndices: proof2.pathIndices,
        leafIndex: proof2.leafIndex
      };
    }
    console.log("[fetchMerkleProof] No accountHash, deriving address...");
    const trees = this.getLightTrees();
    const stateTreeSet = trees.stateTrees[0];
    const proof = await this.lightClient.getCommitmentMerkleProof(
      note.pool,
      note.commitment,
      this.programId,
      trees.addressTree,
      stateTreeSet.stateTree
    );
    console.log("[fetchMerkleProof] Proof leafIndex:", proof.leafIndex);
    return {
      root: proof.root,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
      leafIndex: proof.leafIndex
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  NoteManager,
  PROGRAM_ID,
  ProofGenerator,
  SEEDS,
  WALLET_DERIVATION_MESSAGE,
  Wallet,
  bigintToFieldString,
  buildInitializeCommitmentCounterWithProgram,
  buildInitializePoolWithProgram,
  buildShieldInstructions,
  buildShieldWithProgram,
  buildStoreCommitmentWithProgram,
  buildTransactWithProgram,
  bytesToField,
  bytesToFieldString,
  checkNullifierSpent,
  checkStealthOwnership,
  computeCircuitInputs,
  computeCommitment,
  createNote,
  createWallet,
  createWatchOnlyWallet,
  decryptNote,
  deriveActionNullifier,
  deriveCommitmentCounterPda,
  deriveNullifierKey,
  derivePoolPda,
  derivePublicKey,
  deriveSpendingNullifier,
  deriveStealthPrivateKey,
  deriveVaultPda,
  deriveVerificationKeyPda,
  deriveWalletFromSeed,
  deriveWalletFromSignature,
  deserializeEncryptedNote,
  encryptNote,
  fieldToBytes,
  generateRandomness,
  generateSnarkjsProof,
  generateStealthAddress,
  getRandomStateTreeSet,
  getStateTreeSet,
  initPoseidon,
  initializePool,
  isInSubgroup,
  isOnCurve,
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
  scalarMul,
  serializeEncryptedNote,
  serializeGroth16Proof,
  storeCommitments,
  tryDecryptNote,
  verifyCommitment,
  ...require("@cloakcraft/types")
});
