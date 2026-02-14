"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/crypto/poseidon.ts
var poseidon_exports = {};
__export(poseidon_exports, {
  DOMAIN_ACTION_NULLIFIER: () => DOMAIN_ACTION_NULLIFIER,
  DOMAIN_COMMITMENT: () => DOMAIN_COMMITMENT,
  DOMAIN_EMPTY_LEAF: () => DOMAIN_EMPTY_LEAF,
  DOMAIN_MERKLE: () => DOMAIN_MERKLE,
  DOMAIN_NULLIFIER_KEY: () => DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER: () => DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_STEALTH: () => DOMAIN_STEALTH,
  FIELD_MODULUS_FQ: () => FIELD_MODULUS_FQ,
  FIELD_MODULUS_FR: () => FIELD_MODULUS_FR,
  bytesToField: () => bytesToField,
  fieldToBytes: () => fieldToBytes,
  initPoseidon: () => initPoseidon,
  poseidonHash: () => poseidonHash,
  poseidonHash2: () => poseidonHash2,
  poseidonHashAsync: () => poseidonHashAsync,
  poseidonHashDomain: () => poseidonHashDomain,
  poseidonHashDomainAsync: () => poseidonHashDomainAsync
});
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
var import_circomlibjs, DOMAIN_COMMITMENT, DOMAIN_SPENDING_NULLIFIER, DOMAIN_ACTION_NULLIFIER, DOMAIN_NULLIFIER_KEY, DOMAIN_STEALTH, DOMAIN_MERKLE, DOMAIN_EMPTY_LEAF, FIELD_MODULUS_FR, FIELD_MODULUS_FQ, FIELD_MODULUS, poseidonInstance;
var init_poseidon = __esm({
  "src/crypto/poseidon.ts"() {
    "use strict";
    import_circomlibjs = require("circomlibjs");
    DOMAIN_COMMITMENT = 0x01n;
    DOMAIN_SPENDING_NULLIFIER = 0x02n;
    DOMAIN_ACTION_NULLIFIER = 0x03n;
    DOMAIN_NULLIFIER_KEY = 0x04n;
    DOMAIN_STEALTH = 0x05n;
    DOMAIN_MERKLE = 0x06n;
    DOMAIN_EMPTY_LEAF = 0x07n;
    FIELD_MODULUS_FR = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
    FIELD_MODULUS_FQ = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;
    FIELD_MODULUS = FIELD_MODULUS_FR;
    poseidonInstance = null;
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
var init_nullifier = __esm({
  "src/crypto/nullifier.ts"() {
    "use strict";
    init_poseidon();
  }
});

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
function computePositionCommitment(note) {
  const stage1 = poseidonHashDomain(
    POSITION_COMMITMENT_DOMAIN,
    note.stealthPubX,
    note.marketId,
    fieldToBytes(BigInt(note.isLong ? 1 : 0)),
    fieldToBytes(note.margin)
  );
  const commitment = poseidonHash([
    stage1,
    fieldToBytes(note.size),
    fieldToBytes(BigInt(note.leverage)),
    fieldToBytes(note.entryPrice),
    note.randomness
  ]);
  return commitment;
}
function verifyPositionCommitment(commitment, note) {
  const computed = computePositionCommitment(note);
  return bytesToField(computed) === bytesToField(commitment);
}
function createPositionNote(stealthPubX, marketId, isLong, margin, size, leverage, entryPrice, randomness) {
  return {
    noteType: NOTE_TYPE_POSITION,
    stealthPubX,
    marketId,
    isLong,
    margin,
    size,
    leverage,
    entryPrice,
    randomness: randomness ?? generateRandomness()
  };
}
function computeLpCommitment(note) {
  return poseidonHashDomain(
    LP_COMMITMENT_DOMAIN,
    note.stealthPubX,
    note.poolId,
    fieldToBytes(note.lpAmount),
    note.randomness
  );
}
function verifyLpCommitment(commitment, note) {
  const computed = computeLpCommitment(note);
  return bytesToField(computed) === bytesToField(commitment);
}
function createLpNote(stealthPubX, poolId, lpAmount, randomness) {
  return {
    noteType: NOTE_TYPE_LP,
    stealthPubX,
    poolId,
    lpAmount,
    randomness: randomness ?? generateRandomness()
  };
}
function serializePositionNote(note) {
  const buffer = new Uint8Array(123);
  let offset = 0;
  buffer[offset] = NOTE_TYPE_POSITION;
  offset += 1;
  buffer.set(note.stealthPubX, offset);
  offset += 32;
  buffer.set(note.marketId, offset);
  offset += 32;
  buffer[offset] = note.isLong ? 1 : 0;
  offset += 1;
  let margin = note.margin;
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number(margin & 0xffn);
    margin >>= 8n;
  }
  offset += 8;
  let size = note.size;
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number(size & 0xffn);
    size >>= 8n;
  }
  offset += 8;
  buffer[offset] = note.leverage;
  offset += 1;
  let entryPrice = note.entryPrice;
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number(entryPrice & 0xffn);
    entryPrice >>= 8n;
  }
  offset += 8;
  buffer.set(note.randomness, offset);
  return buffer;
}
function deserializePositionNote(data) {
  if (data.length < 123) return null;
  if (data[0] !== NOTE_TYPE_POSITION) return null;
  let offset = 1;
  const stealthPubX = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  const marketId = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  const isLong = data[offset] !== 0;
  offset += 1;
  let margin = 0n;
  for (let i = 7; i >= 0; i--) {
    margin = margin << 8n | BigInt(data[offset + i]);
  }
  offset += 8;
  let size = 0n;
  for (let i = 7; i >= 0; i--) {
    size = size << 8n | BigInt(data[offset + i]);
  }
  offset += 8;
  const leverage = data[offset];
  offset += 1;
  let entryPrice = 0n;
  for (let i = 7; i >= 0; i--) {
    entryPrice = entryPrice << 8n | BigInt(data[offset + i]);
  }
  offset += 8;
  const randomness = new Uint8Array(data.slice(offset, offset + 32));
  return {
    noteType: NOTE_TYPE_POSITION,
    stealthPubX,
    marketId,
    isLong,
    margin,
    size,
    leverage,
    entryPrice,
    randomness
  };
}
function serializeLpNote(note) {
  const buffer = new Uint8Array(105);
  let offset = 0;
  buffer[offset] = NOTE_TYPE_LP;
  offset += 1;
  buffer.set(note.stealthPubX, offset);
  offset += 32;
  buffer.set(note.poolId, offset);
  offset += 32;
  let lpAmount = note.lpAmount;
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number(lpAmount & 0xffn);
    lpAmount >>= 8n;
  }
  offset += 8;
  buffer.set(note.randomness, offset);
  return buffer;
}
function deserializeLpNote(data) {
  if (data.length < 105) return null;
  if (data[0] !== NOTE_TYPE_LP) return null;
  let offset = 1;
  const stealthPubX = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  const poolId = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  let lpAmount = 0n;
  for (let i = 7; i >= 0; i--) {
    lpAmount = lpAmount << 8n | BigInt(data[offset + i]);
  }
  offset += 8;
  const randomness = new Uint8Array(data.slice(offset, offset + 32));
  return {
    noteType: NOTE_TYPE_LP,
    stealthPubX,
    poolId,
    lpAmount,
    randomness
  };
}
function detectNoteType(data) {
  if (data.length >= 1) {
    if (data[0] === NOTE_TYPE_POSITION) {
      return NOTE_TYPE_POSITION;
    }
    if (data[0] === NOTE_TYPE_LP) {
      return NOTE_TYPE_LP;
    }
  }
  return NOTE_TYPE_STANDARD;
}
var NOTE_TYPE_STANDARD, NOTE_TYPE_POSITION, NOTE_TYPE_LP, POSITION_COMMITMENT_DOMAIN, LP_COMMITMENT_DOMAIN;
var init_commitment = __esm({
  "src/crypto/commitment.ts"() {
    "use strict";
    init_poseidon();
    NOTE_TYPE_STANDARD = 0;
    NOTE_TYPE_POSITION = 128;
    NOTE_TYPE_LP = 129;
    POSITION_COMMITMENT_DOMAIN = 8n;
    LP_COMMITMENT_DOMAIN = 9n;
  }
});

// src/crypto/encryption.ts
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
  } catch (err) {
    return null;
  }
}
function encryptPositionNote(note, recipientPubkey) {
  const ephemeralPrivate = generateRandomScalar();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);
  const encKey = deriveEncryptionKey(sharedSecret.x);
  const plaintext = serializePositionNote(note);
  const { ciphertext, tag } = encryptAEAD(plaintext, encKey);
  return {
    ephemeralPubkey,
    ciphertext,
    tag
  };
}
function decryptPositionNote(encrypted, recipientPrivateKey) {
  try {
    const sharedSecret = scalarMul(encrypted.ephemeralPubkey, recipientPrivateKey);
    const decKey = deriveEncryptionKey(sharedSecret.x);
    const plaintext = decryptAEAD(encrypted.ciphertext, encrypted.tag, decKey);
    if (detectNoteType(plaintext) !== NOTE_TYPE_POSITION) {
      return null;
    }
    return deserializePositionNote(plaintext);
  } catch {
    return null;
  }
}
function tryDecryptPositionNote(encrypted, recipientPrivateKey) {
  return decryptPositionNote(encrypted, recipientPrivateKey);
}
function encryptLpNote(note, recipientPubkey) {
  const ephemeralPrivate = generateRandomScalar();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);
  const encKey = deriveEncryptionKey(sharedSecret.x);
  const plaintext = serializeLpNote(note);
  const { ciphertext, tag } = encryptAEAD(plaintext, encKey);
  return {
    ephemeralPubkey,
    ciphertext,
    tag
  };
}
function decryptLpNote(encrypted, recipientPrivateKey) {
  try {
    const sharedSecret = scalarMul(encrypted.ephemeralPubkey, recipientPrivateKey);
    const decKey = deriveEncryptionKey(sharedSecret.x);
    const plaintext = decryptAEAD(encrypted.ciphertext, encrypted.tag, decKey);
    if (detectNoteType(plaintext) !== NOTE_TYPE_LP) {
      return null;
    }
    return deserializeLpNote(plaintext);
  } catch {
    return null;
  }
}
function tryDecryptLpNote(encrypted, recipientPrivateKey) {
  return decryptLpNote(encrypted, recipientPrivateKey);
}
function tryDecryptAnyNote(encrypted, recipientPrivateKey) {
  try {
    const sharedSecret = scalarMul(encrypted.ephemeralPubkey, recipientPrivateKey);
    const decKey = deriveEncryptionKey(sharedSecret.x);
    const plaintext = decryptAEAD(encrypted.ciphertext, encrypted.tag, decKey);
    const noteType = detectNoteType(plaintext);
    if (noteType === NOTE_TYPE_POSITION) {
      const note = deserializePositionNote(plaintext);
      if (note) {
        return { type: "position", note };
      }
    } else if (noteType === NOTE_TYPE_LP) {
      const note = deserializeLpNote(plaintext);
      if (note) {
        return { type: "lp", note };
      }
    } else {
      const note = deserializeNote(plaintext);
      if (note.amount >= 0n) {
        return { type: "standard", note };
      }
    }
    return null;
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
var import_sha256, import_web3, SUBGROUP_ORDER3;
var init_encryption = __esm({
  "src/crypto/encryption.ts"() {
    "use strict";
    import_sha256 = require("@noble/hashes/sha256");
    import_web3 = require("@solana/web3.js");
    init_babyjubjub();
    init_poseidon();
    init_commitment();
    SUBGROUP_ORDER3 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
  }
});

// src/crypto/stealth.ts
function generateStealthAddress(recipientPubkey) {
  const toHex = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
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
  const toHex = (arr) => Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
  const sharedSecret = scalarMul(ephemeralPubkey, recipientPrivateKey);
  const factor = deriveStealthFactor(sharedSecret.x);
  const stealthPriv = (recipientPrivateKey + factor) % SUBGROUP_ORDER4;
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
var SUBGROUP_ORDER4;
var init_stealth = __esm({
  "src/crypto/stealth.ts"() {
    "use strict";
    init_babyjubjub();
    init_poseidon();
    SUBGROUP_ORDER4 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
  }
});

// src/light.ts
var light_exports = {};
__export(light_exports, {
  DEVNET_LIGHT_TREES: () => DEVNET_LIGHT_TREES,
  LightClient: () => LightClient,
  LightCommitmentClient: () => LightCommitmentClient,
  MAINNET_LIGHT_TREES: () => MAINNET_LIGHT_TREES,
  getRandomStateTreeSet: () => getRandomStateTreeSet,
  getStateTreeSet: () => getStateTreeSet,
  sleep: () => sleep,
  withRetry: () => withRetry
});
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
function isRateLimitError(error) {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes("429") || msg.includes("rate limit") || msg.includes("too many requests") || msg.includes("quota exceeded");
  }
  return false;
}
function isRateLimitResponse(response) {
  return response.status === 429;
}
async function withRetry(fn, config = {}, operation = "RPC call") {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = isRateLimitError(error);
      const isLastAttempt = attempt >= cfg.maxRetries;
      if (!isRateLimit || isLastAttempt) {
        throw error;
      }
      const exponentialDelay = cfg.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = Math.min(exponentialDelay + jitter, cfg.maxDelayMs);
      if (cfg.logRetries) {
        console.warn(
          `[Light] Rate limited on ${operation}, attempt ${attempt + 1}/${cfg.maxRetries + 1}. Retrying in ${Math.round(delay)}ms...`
        );
      }
      await sleep(delay);
    }
  }
  throw new Error(`[Light] ${operation} failed after ${cfg.maxRetries + 1} attempts`);
}
async function fetchWithRetry(url, options, config = {}, operation = "fetch") {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    const response = await fetch(url, options);
    if (isRateLimitResponse(response)) {
      const isLastAttempt = attempt >= cfg.maxRetries;
      if (isLastAttempt) {
        throw new Error(`Rate limit exceeded (429) after ${cfg.maxRetries + 1} attempts for ${operation}`);
      }
      const exponentialDelay = cfg.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = Math.min(exponentialDelay + jitter, cfg.maxDelayMs);
      const retryAfter = response.headers.get("Retry-After");
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1e3 : delay;
      const actualDelay = Math.min(retryAfterMs, cfg.maxDelayMs);
      if (cfg.logRetries) {
        console.warn(
          `[Light] Rate limited (429) on ${operation}, attempt ${attempt + 1}/${cfg.maxRetries + 1}. Retrying in ${Math.round(actualDelay)}ms...`
        );
      }
      await sleep(actualDelay);
      continue;
    }
    return response;
  }
  throw new Error(`[Light] ${operation} failed after ${cfg.maxRetries + 1} attempts`);
}
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
var import_web34, import_stateless, DEFAULT_RETRY_CONFIG, LightClient, DEVNET_LIGHT_TREES, MAINNET_LIGHT_TREES, LightCommitmentClient;
var init_light = __esm({
  "src/light.ts"() {
    "use strict";
    import_web34 = require("@solana/web3.js");
    import_stateless = require("@lightprotocol/stateless.js");
    init_encryption();
    init_nullifier();
    init_poseidon();
    init_stealth();
    init_commitment();
    DEFAULT_RETRY_CONFIG = {
      maxRetries: 5,
      baseDelayMs: 1e3,
      maxDelayMs: 3e4,
      logRetries: true
    };
    LightClient = class {
      constructor(config) {
        const baseUrl = config.network === "mainnet-beta" ? "https://mainnet.helius-rpc.com" : "https://devnet.helius-rpc.com";
        this.rpcUrl = `${baseUrl}/?api-key=${config.apiKey}`;
        this.lightRpc = (0, import_stateless.createRpc)(this.rpcUrl, this.rpcUrl, this.rpcUrl);
        this.retryConfig = config.retryConfig ?? {};
      }
      /**
       * Get compressed account by address
       *
       * Returns null if account doesn't exist (nullifier not spent)
       * Includes automatic retry with exponential backoff on rate limits.
       */
      async getCompressedAccount(address) {
        const addressBase58 = new import_web34.PublicKey(address).toBase58();
        const response = await fetchWithRetry(
          this.rpcUrl,
          {
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
          },
          this.retryConfig,
          "getCompressedAccount"
        );
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
       * Includes automatic retry with exponential backoff on rate limits.
       */
      async batchCheckNullifiers(addresses) {
        if (addresses.length === 0) {
          return /* @__PURE__ */ new Set();
        }
        const response = await fetchWithRetry(
          this.rpcUrl,
          {
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
          },
          this.retryConfig,
          "batchCheckNullifiers"
        );
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
       * Includes automatic retry with exponential backoff on rate limits.
       *
       * Helius API expects:
       * - hashes: Array of existing account hashes to verify (optional)
       * - newAddressesWithTrees: Array of {address, tree} for non-inclusion proofs
       */
      async getValidityProof(params) {
        const newAddressesWithTrees = params.newAddresses.map((addr) => ({
          address: new import_web34.PublicKey(addr).toBase58(),
          tree: params.addressMerkleTree.toBase58()
        }));
        const response = await fetchWithRetry(
          this.rpcUrl,
          {
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
          },
          this.retryConfig,
          "getValidityProof"
        );
        const result = await response.json();
        if (result.error) {
          throw new Error(`failed to get validity proof for hashes ${params.hashes?.join(", ") ?? "[]"}: ${result.error.message}`);
        }
        return {
          compressedProof: result.result.compressedProof,
          rootIndices: result.result.rootIndices,
          merkleTrees: result.result.merkleTrees.map((t) => new import_web34.PublicKey(t))
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
        const LIGHT_SYSTEM_PROGRAM = new import_web34.PublicKey("LightSystem111111111111111111111111111111111");
        const ACCOUNT_COMPRESSION_PROGRAM = new import_web34.PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
        const NOOP_PROGRAM = new import_web34.PublicKey("noopb9bkMVfRPU8AsBHBNRs27gxNvyqrDGj3zPqsR");
        const REGISTERED_PROGRAM_PDA = new import_web34.PublicKey("4LfVCK1CgVbS6Xeu1RSMvKWv9NLLdwVBJ64dJpqpKbLi");
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
    DEVNET_LIGHT_TREES = {
      /** V2 batch address tree from Light SDK getBatchAddressTreeInfo() */
      addressTree: new import_web34.PublicKey("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx"),
      /** 5 parallel state tree sets for throughput */
      stateTrees: [
        {
          stateTree: new import_web34.PublicKey("bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU"),
          outputQueue: new import_web34.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto"),
          cpiContext: new import_web34.PublicKey("cpi15BoVPKgEPw5o8wc2T816GE7b378nMXnhH3Xbq4y")
        },
        {
          stateTree: new import_web34.PublicKey("bmt2UxoBxB9xWev4BkLvkGdapsz6sZGkzViPNph7VFi"),
          outputQueue: new import_web34.PublicKey("oq2UkeMsJLfXt2QHzim242SUi3nvjJs8Pn7Eac9H9vg"),
          cpiContext: new import_web34.PublicKey("cpi2yGapXUR3As5SjnHBAVvmApNiLsbeZpF3euWnW6B")
        },
        {
          stateTree: new import_web34.PublicKey("bmt3ccLd4bqSVZVeCJnH1F6C8jNygAhaDfxDwePyyGb"),
          outputQueue: new import_web34.PublicKey("oq3AxjekBWgo64gpauB6QtuZNesuv19xrhaC1ZM1THQ"),
          cpiContext: new import_web34.PublicKey("cpi3mbwMpSX8FAGMZVP85AwxqCaQMfEk9Em1v8QK9Rf")
        },
        {
          stateTree: new import_web34.PublicKey("bmt4d3p1a4YQgk9PeZv5s4DBUmbF5NxqYpk9HGjQsd8"),
          outputQueue: new import_web34.PublicKey("oq4ypwvVGzCUMoiKKHWh4S1SgZJ9vCvKpcz6RT6A8dq"),
          cpiContext: new import_web34.PublicKey("cpi4yyPDc4bCgHAnsenunGA8Y77j3XEDyjgfyCKgcoc")
        },
        {
          stateTree: new import_web34.PublicKey("bmt5yU97jC88YXTuSukYHa8Z5Bi2ZDUtmzfkDTA2mG2"),
          outputQueue: new import_web34.PublicKey("oq5oh5ZR3yGomuQgFduNDzjtGvVWfDRGLuDVjv9a96P"),
          cpiContext: new import_web34.PublicKey("cpi5ZTjdgYpZ1Xr7B1cMLLUE81oTtJbNNAyKary2nV6")
        }
      ]
    };
    MAINNET_LIGHT_TREES = {
      addressTree: new import_web34.PublicKey("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx"),
      stateTrees: DEVNET_LIGHT_TREES.stateTrees
    };
    LightCommitmentClient = class extends LightClient {
      constructor() {
        super(...arguments);
        // Cache for decrypted notes - keyed by viewing key hash
        this.noteCache = /* @__PURE__ */ new Map();
        // Track highest slot seen for incremental scanning
        this.lastScannedSlot = /* @__PURE__ */ new Map();
        // pool -> slot
        // Scanner statistics (reset each scan)
        this.stats = {
          totalAccounts: 0,
          cachedHits: 0,
          decryptAttempts: 0,
          successfulDecrypts: 0,
          scanDurationMs: 0,
          rpcCalls: 0
        };
      }
      /**
       * Get scanner statistics from last scan
       */
      getLastScanStats() {
        return { ...this.stats };
      }
      /**
       * Get the last scanned slot for a pool (for incremental scanning)
       */
      getLastScannedSlot(pool) {
        const key = pool?.toBase58() ?? "all";
        return this.lastScannedSlot.get(key) ?? 0;
      }
      /**
       * Set the last scanned slot (for restoring from persistent storage)
       */
      setLastScannedSlot(slot, pool) {
        const key = pool?.toBase58() ?? "all";
        this.lastScannedSlot.set(key, slot);
      }
      /**
       * Clear note cache (call when wallet changes)
       */
      clearCache() {
        this.noteCache.clear();
        this.lastScannedSlot.clear();
      }
      /**
       * Export cache state for persistent storage
       */
      exportCacheState() {
        const notes = {};
        for (const [viewKey, cache] of this.noteCache.entries()) {
          notes[viewKey] = {};
          for (const [hash, note] of cache.entries()) {
            if (note) {
              notes[viewKey][hash] = {
                ...note,
                commitment: Buffer.from(note.commitment).toString("hex"),
                pool: note.pool.toBase58(),
                tokenMint: note.tokenMint.toBase58(),
                stealthPubX: Buffer.from(note.stealthPubX).toString("hex"),
                randomness: Buffer.from(note.randomness).toString("hex"),
                amount: note.amount.toString()
                // BigInt to string
              };
            }
          }
        }
        const slots = {};
        for (const [key, slot] of this.lastScannedSlot.entries()) {
          slots[key] = slot;
        }
        return { notes, slots };
      }
      /**
       * Import cache state from persistent storage
       */
      importCacheState(state) {
        for (const [key, slot] of Object.entries(state.slots)) {
          this.lastScannedSlot.set(key, slot);
        }
        for (const [viewKey, cache] of Object.entries(state.notes)) {
          if (!this.noteCache.has(viewKey)) {
            this.noteCache.set(viewKey, /* @__PURE__ */ new Map());
          }
          const noteMap = this.noteCache.get(viewKey);
          for (const [hash, noteData] of Object.entries(cache)) {
            if (noteData) {
              noteMap.set(hash, {
                ...noteData,
                commitment: new Uint8Array(Buffer.from(noteData.commitment, "hex")),
                pool: new import_web34.PublicKey(noteData.pool),
                tokenMint: new import_web34.PublicKey(noteData.tokenMint),
                stealthPubX: new Uint8Array(Buffer.from(noteData.stealthPubX, "hex")),
                randomness: new Uint8Array(Buffer.from(noteData.randomness, "hex")),
                amount: BigInt(noteData.amount)
              });
            }
          }
        }
      }
      /**
       * Get cache key from viewing key
       */
      getCacheKey(viewingKey) {
        return viewingKey.toString(16).slice(0, 16);
      }
      /**
       * Reset scanner stats
       */
      resetStats() {
        this.stats = {
          totalAccounts: 0,
          cachedHits: 0,
          decryptAttempts: 0,
          successfulDecrypts: 0,
          scanDurationMs: 0,
          rpcCalls: 0
        };
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
        const hashBytes = new import_web34.PublicKey(accountHash).toBytes();
        const hashBn = (0, import_stateless.bn)(hashBytes);
        const proofResult = await this.lightRpc.getCompressedAccountProof(hashBn);
        const pathElements = proofResult.merkleProof.map((p) => {
          if (p.toArray) {
            return new Uint8Array(p.toArray("be", 32));
          }
          return new Uint8Array(p);
        });
        const pathIndices = this.leafIndexToPathIndices(proofResult.leafIndex, pathElements.length);
        let rootBytes;
        if (proofResult.root.toArray) {
          rootBytes = new Uint8Array(proofResult.root.toArray("be", 32));
        } else if (proofResult.root instanceof Uint8Array) {
          rootBytes = proofResult.root;
        } else if (Array.isArray(proofResult.root)) {
          rootBytes = new Uint8Array(proofResult.root);
        } else {
          rootBytes = new Uint8Array(32);
        }
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
        const addressBase58 = new import_web34.PublicKey(address).toBase58();
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
          const addressStr = new import_web34.PublicKey(address).toBase58();
          nullifierData.push({ note, nullifier, address });
        }
        const addresses = nullifierData.map((d) => new import_web34.PublicKey(d.address).toBase58());
        const spentSet = await this.batchCheckNullifiers(addresses);
        return nullifierData.map(({ note, nullifier, address }) => {
          const addressStr = new import_web34.PublicKey(address).toBase58();
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
       * OPTIMIZED: Uses parallel decryption with configurable batch size.
       *
       * @param viewingKey - User's viewing private key (for decryption)
       * @param programId - CloakCraft program ID
       * @param pool - Pool to scan (optional, scans all if not provided)
       * @param options - Incremental scan options
       * @returns Array of decrypted notes owned by the user
       */
      async scanNotes(viewingKey, programId, pool, options) {
        const startTime = performance.now();
        this.resetStats();
        this.stats.rpcCalls++;
        const accounts = await this.getCommitmentAccounts(programId, pool);
        this.stats.totalAccounts = accounts.length;
        const cacheKey = this.getCacheKey(viewingKey);
        if (!this.noteCache.has(cacheKey)) {
          this.noteCache.set(cacheKey, /* @__PURE__ */ new Map());
        }
        const cache = this.noteCache.get(cacheKey);
        const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513e3;
        const decryptedNotes = [];
        const accountsToProcess = [];
        let highestSlot = options?.sinceSlot ?? 0;
        for (const account of accounts) {
          if (!account.data?.data) {
            continue;
          }
          const accountSlot = account.slotCreated || 0;
          if (accountSlot > highestSlot) {
            highestSlot = accountSlot;
          }
          if (options?.sinceSlot && accountSlot <= options.sinceSlot) {
            if (cache.has(account.hash)) {
              const cachedNote = cache.get(account.hash);
              if (cachedNote) {
                this.stats.cachedHits++;
                decryptedNotes.push(cachedNote);
              }
            }
            continue;
          }
          if (cache.has(account.hash)) {
            const cachedNote = cache.get(account.hash);
            if (cachedNote) {
              this.stats.cachedHits++;
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
          if (dataLen < 396) {
            cache.set(account.hash, null);
            continue;
          }
          accountsToProcess.push(account);
          if (options?.maxAccounts && accountsToProcess.length >= options.maxAccounts) {
            break;
          }
        }
        const batchSize = options?.parallelBatchSize ?? 10;
        for (let i = 0; i < accountsToProcess.length; i += batchSize) {
          const batch = accountsToProcess.slice(i, i + batchSize);
          const results = await Promise.all(
            batch.map((account) => this.processAccount(account, viewingKey, cache))
          );
          for (const result of results) {
            this.stats.decryptAttempts++;
            if (result) {
              this.stats.successfulDecrypts++;
              decryptedNotes.push(result);
            }
          }
        }
        const poolKey = pool?.toBase58() ?? "all";
        this.lastScannedSlot.set(poolKey, highestSlot);
        this.stats.scanDurationMs = performance.now() - startTime;
        return decryptedNotes;
      }
      /**
       * Process a single account for decryption (extracted for parallelization)
       */
      async processAccount(account, viewingKey, cache) {
        try {
          const parsed = this.parseCommitmentAccountData(account.data.data);
          if (!parsed) {
            cache.set(account.hash, null);
            return null;
          }
          const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
          if (!encryptedNote) {
            cache.set(account.hash, null);
            return null;
          }
          let decryptionKey;
          if (parsed.stealthEphemeralPubkey) {
            decryptionKey = deriveStealthPrivateKey(viewingKey, parsed.stealthEphemeralPubkey);
          } else {
            decryptionKey = viewingKey;
          }
          const decryptResult = tryDecryptAnyNote(encryptedNote, decryptionKey);
          if (!decryptResult) {
            cache.set(account.hash, null);
            return null;
          }
          let recomputed;
          let noteAmount;
          if (decryptResult.type === "standard") {
            recomputed = computeCommitment(decryptResult.note);
            noteAmount = decryptResult.note.amount;
          } else if (decryptResult.type === "position") {
            recomputed = computePositionCommitment(decryptResult.note);
            noteAmount = decryptResult.note.margin;
          } else if (decryptResult.type === "lp") {
            recomputed = computeLpCommitment(decryptResult.note);
            noteAmount = decryptResult.note.lpAmount;
          } else {
            cache.set(account.hash, null);
            return null;
          }
          const matches = Buffer.from(recomputed).toString("hex") === Buffer.from(parsed.commitment).toString("hex");
          if (!matches) {
            cache.set(account.hash, null);
            return null;
          }
          if (noteAmount === 0n) {
            cache.set(account.hash, null);
            return null;
          }
          if (decryptResult.type !== "standard") {
            cache.set(account.hash, null);
            return null;
          }
          const note = decryptResult.note;
          const decryptedNote = {
            ...note,
            commitment: parsed.commitment,
            leafIndex: parsed.leafIndex,
            pool: new import_web34.PublicKey(parsed.pool),
            accountHash: account.hash,
            // Store for merkle proof fetching
            stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? void 0
            // Store for stealth key derivation
          };
          cache.set(account.hash, decryptedNote);
          return decryptedNote;
        } catch (err) {
          cache.set(account.hash, null);
          return null;
        }
      }
      /**
       * Get all commitment compressed accounts
       *
       * Includes automatic retry with exponential backoff on rate limits.
       *
       * @param programId - CloakCraft program ID
       * @param poolPda - Pool PDA to filter by (optional). Note: pass the pool PDA, not the token mint.
       */
      async getCommitmentAccounts(programId, poolPda) {
        console.log(`[getCommitmentAccounts] Querying with pool filter: ${poolPda?.toBase58() ?? "none"}`);
        const response = await fetchWithRetry(
          this["rpcUrl"],
          {
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
          },
          this.retryConfig,
          "getCompressedAccountsByOwner"
        );
        const result = await response.json();
        if (result.error) {
          throw new Error(`Helius RPC error: ${result.error.message}`);
        }
        const items = result.result?.value?.items ?? result.result?.items ?? [];
        console.log(`[getCommitmentAccounts] Helius returned ${items.length} accounts`);
        if (poolPda && items.length === 0) {
          const debugResponse = await fetchWithRetry(
            this["rpcUrl"],
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                jsonrpc: "2.0",
                id: 1,
                method: "getCompressedAccountsByOwner",
                params: { owner: programId.toBase58() }
              })
            },
            this.retryConfig,
            "getCompressedAccountsByOwner (debug)"
          );
          const debugResult = await debugResponse.json();
          const totalItems = debugResult.result?.value?.items ?? debugResult.result?.items ?? [];
          console.log(`[getCommitmentAccounts] DEBUG: Total accounts without filter: ${totalItems.length}`);
          if (totalItems.length > 0) {
            console.log(`[getCommitmentAccounts] DEBUG: First 3 account pools:`);
            for (let i = 0; i < Math.min(3, totalItems.length); i++) {
              const item = totalItems[i];
              if (item.data?.data) {
                try {
                  const dataBytes = Uint8Array.from(atob(item.data.data), (c) => c.charCodeAt(0));
                  if (dataBytes.length >= 32) {
                    const storedPool = new import_web34.PublicKey(dataBytes.slice(0, 32));
                    console.log(`  [${i}] Pool: ${storedPool.toBase58()}`);
                  }
                } catch (e) {
                  console.log(`  [${i}] Failed to parse pool`);
                }
              }
            }
          }
        }
        return items;
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
          const MIN_SIZE = 396;
          const MAX_NOTE_SIZE = 250;
          if (data.length < MIN_SIZE) {
            console.log(`[parseCommitmentAccountData] Data too short: ${data.length} < ${MIN_SIZE}`);
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
          const encryptedNoteLen = view.getUint16(386, true);
          if (encryptedNoteLen > MAX_NOTE_SIZE) {
            console.log(`[parseCommitmentAccountData] Invalid note length: ${encryptedNoteLen} > ${MAX_NOTE_SIZE}`);
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
      // =========================================================================
      // Position Note Scanner (Perps)
      // =========================================================================
      /**
       * Scan for position notes belonging to a user
       *
       * Similar to scanNotes but specifically for perps position commitments.
       * Uses the position commitment formula for verification.
       *
       * @param viewingKey - User's viewing private key (for decryption)
       * @param programId - CloakCraft program ID
       * @param positionPool - Position pool to scan
       * @returns Array of decrypted position notes owned by the user
       */
      async scanPositionNotes(viewingKey, programId, positionPool) {
        await initPoseidon();
        const accounts = await this.getCommitmentAccounts(programId, positionPool);
        console.log(`[scanPositionNotes] Found ${accounts.length} accounts in position pool`);
        const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513e3;
        const positionNotes = [];
        for (const account of accounts) {
          if (!account.data?.data) {
            continue;
          }
          const disc = account.data.discriminator;
          if (!disc || Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) > 1e3) {
            continue;
          }
          const dataLen = atob(account.data.data).length;
          if (dataLen < 346) {
            continue;
          }
          try {
            const parsed = this.parseCommitmentAccountData(account.data.data);
            if (!parsed) continue;
            const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
            if (!encryptedNote) continue;
            let decryptionKey;
            if (parsed.stealthEphemeralPubkey) {
              decryptionKey = deriveStealthPrivateKey(viewingKey, parsed.stealthEphemeralPubkey);
            } else {
              decryptionKey = viewingKey;
            }
            const decryptResult = tryDecryptAnyNote(encryptedNote, decryptionKey);
            if (!decryptResult || decryptResult.type !== "position") {
              continue;
            }
            const recomputed = computePositionCommitment(decryptResult.note);
            const matches = Buffer.from(recomputed).toString("hex") === Buffer.from(parsed.commitment).toString("hex");
            if (!matches) {
              console.log(`[scanPositionNotes] Commitment mismatch for account ${account.hash.slice(0, 8)}...`);
              console.log(`  Stored commitment:    ${Buffer.from(parsed.commitment).toString("hex")}`);
              console.log(`  Recomputed commitment: ${Buffer.from(recomputed).toString("hex")}`);
              console.log(`  Note fields:`);
              console.log(`    stealthPubX: ${Buffer.from(decryptResult.note.stealthPubX).toString("hex").slice(0, 16)}...`);
              console.log(`    marketId: ${Buffer.from(decryptResult.note.marketId).toString("hex")}`);
              console.log(`    isLong: ${decryptResult.note.isLong}`);
              console.log(`    margin: ${decryptResult.note.margin}`);
              console.log(`    size: ${decryptResult.note.size}`);
              console.log(`    leverage: ${decryptResult.note.leverage}`);
              console.log(`    entryPrice: ${decryptResult.note.entryPrice}`);
              console.log(`    randomness: ${Buffer.from(decryptResult.note.randomness).toString("hex").slice(0, 16)}...`);
              continue;
            }
            if (decryptResult.note.margin === 0n) {
              continue;
            }
            console.log(`[scanPositionNotes] FOUND valid position: margin=${decryptResult.note.margin}, size=${decryptResult.note.size}`);
            const scannedNote = {
              ...decryptResult.note,
              spent: false,
              // Will be set by scanPositionNotesWithStatus
              nullifier: new Uint8Array(32),
              // Will be computed by scanPositionNotesWithStatus
              commitment: parsed.commitment,
              leafIndex: parsed.leafIndex,
              pool: positionPool,
              accountHash: account.hash,
              stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? void 0
            };
            positionNotes.push(scannedNote);
          } catch {
            continue;
          }
        }
        return positionNotes;
      }
      /**
       * Scan for position notes with spent status
       */
      async scanPositionNotesWithStatus(viewingKey, nullifierKey, programId, positionPool) {
        const notes = await this.scanPositionNotes(viewingKey, programId, positionPool);
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
          nullifierData.push({ note, nullifier, address });
        }
        const addresses = nullifierData.map((d) => new import_web34.PublicKey(d.address).toBase58());
        const spentSet = await this.batchCheckNullifiers(addresses);
        return nullifierData.map(({ note, nullifier, address }) => {
          const addressStr = new import_web34.PublicKey(address).toBase58();
          return {
            ...note,
            spent: spentSet.has(addressStr),
            nullifier
          };
        });
      }
      /**
       * Get unspent position notes
       */
      async getUnspentPositionNotes(viewingKey, nullifierKey, programId, positionPool) {
        const notes = await this.scanPositionNotesWithStatus(viewingKey, nullifierKey, programId, positionPool);
        return notes.filter((n) => !n.spent);
      }
      // =========================================================================
      // LP Note Scanner (Perps)
      // =========================================================================
      /**
       * Scan for LP notes belonging to a user
       *
       * Similar to scanNotes but specifically for perps LP commitments.
       * Uses the LP commitment formula for verification.
       *
       * @param viewingKey - User's viewing private key (for decryption)
       * @param programId - CloakCraft program ID
       * @param lpPool - LP pool to scan
       * @returns Array of decrypted LP notes owned by the user
       */
      async scanLpNotes(viewingKey, programId, lpPool) {
        await initPoseidon();
        const accounts = await this.getCommitmentAccounts(programId, lpPool);
        console.log(`[scanLpNotes] Found ${accounts.length} accounts in LP pool`);
        const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513e3;
        const lpNotes = [];
        for (const account of accounts) {
          if (!account.data?.data) {
            continue;
          }
          const disc = account.data.discriminator;
          if (!disc || Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) > 1e3) {
            continue;
          }
          const dataLen = atob(account.data.data).length;
          if (dataLen < 346) {
            continue;
          }
          try {
            const parsed = this.parseCommitmentAccountData(account.data.data);
            if (!parsed) continue;
            const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
            if (!encryptedNote) continue;
            let decryptionKey;
            if (parsed.stealthEphemeralPubkey) {
              decryptionKey = deriveStealthPrivateKey(viewingKey, parsed.stealthEphemeralPubkey);
            } else {
              decryptionKey = viewingKey;
            }
            const decryptResult = tryDecryptAnyNote(encryptedNote, decryptionKey);
            if (!decryptResult || decryptResult.type !== "lp") {
              continue;
            }
            const recomputed = computeLpCommitment(decryptResult.note);
            const matches = Buffer.from(recomputed).toString("hex") === Buffer.from(parsed.commitment).toString("hex");
            if (!matches) {
              console.log(`[scanLpNotes] Commitment mismatch for account ${account.hash.slice(0, 8)}...`);
              continue;
            }
            if (decryptResult.note.lpAmount === 0n) {
              continue;
            }
            console.log(`[scanLpNotes] FOUND valid LP note: lpAmount=${decryptResult.note.lpAmount}`);
            const scannedNote = {
              ...decryptResult.note,
              spent: false,
              nullifier: new Uint8Array(32),
              commitment: parsed.commitment,
              leafIndex: parsed.leafIndex,
              pool: lpPool,
              accountHash: account.hash,
              stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? void 0
            };
            lpNotes.push(scannedNote);
          } catch {
            continue;
          }
        }
        return lpNotes;
      }
      /**
       * Scan for LP notes with spent status
       */
      async scanLpNotesWithStatus(viewingKey, nullifierKey, programId, lpPool) {
        const notes = await this.scanLpNotes(viewingKey, programId, lpPool);
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
          nullifierData.push({ note, nullifier, address });
        }
        const addresses = nullifierData.map((d) => new import_web34.PublicKey(d.address).toBase58());
        const spentSet = await this.batchCheckNullifiers(addresses);
        return nullifierData.map(({ note, nullifier, address }) => {
          const addressStr = new import_web34.PublicKey(address).toBase58();
          return {
            ...note,
            spent: spentSet.has(addressStr),
            nullifier
          };
        });
      }
      /**
       * Get unspent LP notes
       */
      async getUnspentLpNotes(viewingKey, nullifierKey, programId, lpPool) {
        const notes = await this.scanLpNotesWithStatus(viewingKey, nullifierKey, programId, lpPool);
        return notes.filter((n) => !n.spent);
      }
      // =========================================================================
      // Position Metadata Operations
      // =========================================================================
      /**
       * Fetch position metadata for given position IDs
       *
       * Queries compressed PositionMeta accounts via Photon API.
       * These accounts are public and enable permissionless liquidation monitoring.
       *
       * @param programId - CloakCraft program ID
       * @param poolId - Pool ID (32 bytes)
       * @param positionIds - Array of position IDs to fetch metadata for
       * @returns Map of position ID (hex) to PositionMeta
       */
      async fetchPositionMetas(programId, poolId, positionIds) {
        if (positionIds.length === 0) {
          return /* @__PURE__ */ new Map();
        }
        const addressTree = DEVNET_LIGHT_TREES.addressTree;
        const addresses = [];
        const positionIdMap = /* @__PURE__ */ new Map();
        for (const positionId of positionIds) {
          const seeds = [
            Buffer.from("position_meta"),
            Buffer.from(poolId),
            Buffer.from(positionId)
          ];
          const seed = (0, import_stateless.deriveAddressSeedV2)(seeds);
          const address = (0, import_stateless.deriveAddressV2)(
            seed,
            new import_web34.PublicKey(addressTree),
            programId
          );
          const addressStr = new import_web34.PublicKey(address).toBase58();
          addresses.push(addressStr);
          positionIdMap.set(addressStr, Buffer.from(positionId).toString("hex"));
        }
        const response = await fetchWithRetry(
          this.rpcUrl,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getMultipleCompressedAccounts",
              params: { addresses }
            })
          },
          this.retryConfig,
          "fetchPositionMetas"
        );
        const result = await response.json();
        if (result.error) {
          throw new Error(`Helius RPC error: ${result.error.message}`);
        }
        const metas = /* @__PURE__ */ new Map();
        const items = result.result?.value?.items ?? [];
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (!item || !item.data?.data) continue;
          const positionIdHex = positionIdMap.get(addresses[i]);
          if (!positionIdHex) continue;
          try {
            const meta = this.parsePositionMetaData(item.data.data);
            if (meta) {
              metas.set(positionIdHex, meta);
            }
          } catch {
            continue;
          }
        }
        return metas;
      }
      /**
       * Parse PositionMeta from base64-encoded compressed account data
       */
      parsePositionMetaData(base64Data) {
        try {
          const data = Buffer.from(base64Data, "base64");
          if (data.length < 210) {
            return null;
          }
          const positionId = new Uint8Array(data.subarray(0, 32));
          const poolId = new Uint8Array(data.subarray(32, 64));
          const marketId = new Uint8Array(data.subarray(64, 96));
          const marginAmount = data.readBigUInt64LE(96);
          const liquidationPrice = data.readBigUInt64LE(104);
          const isLong = data[112] === 1;
          const positionSize = data.readBigUInt64LE(113);
          const entryPrice = data.readBigUInt64LE(121);
          const nullifierHash = new Uint8Array(data.subarray(129, 161));
          const status = data[161];
          const createdAt = Number(data.readBigInt64LE(162));
          const updatedAt = Number(data.readBigInt64LE(170));
          const ownerStealthPubkey = new Uint8Array(data.subarray(178, 210));
          return {
            positionId,
            poolId,
            marketId,
            marginAmount,
            liquidationPrice,
            isLong,
            positionSize,
            entryPrice,
            nullifierHash,
            status,
            createdAt,
            updatedAt,
            ownerStealthPubkey
          };
        } catch {
          return null;
        }
      }
      /**
       * Fetch all active position metas for a pool
       *
       * Useful for keepers to monitor all positions for liquidation.
       *
       * @param programId - CloakCraft program ID
       * @param poolId - Pool ID to scan
       * @returns Array of active PositionMeta
       */
      async fetchActivePositionMetas(programId, poolId) {
        const response = await fetchWithRetry(
          this.rpcUrl,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getCompressedAccountsByOwner",
              params: {
                owner: programId.toBase58(),
                filters: [
                  // Filter by pool_id at offset 32 (after position_id)
                  { memcmp: { offset: 32, bytes: Buffer.from(poolId).toString("base64") } }
                ]
              }
            })
          },
          this.retryConfig,
          "fetchActivePositionMetas"
        );
        const result = await response.json();
        if (result.error) {
          throw new Error(`Helius RPC error: ${result.error.message}`);
        }
        const items = result.result?.value?.items ?? result.result?.items ?? [];
        const metas = [];
        for (const item of items) {
          if (!item.data?.data) continue;
          try {
            const meta = this.parsePositionMetaData(item.data.data);
            if (meta && meta.status === 0) {
              metas.push(meta);
            }
          } catch {
            continue;
          }
        }
        return metas;
      }
    };
  }
});

// src/instructions/constants.ts
var constants_exports = {};
__export(constants_exports, {
  CIRCUIT_IDS: () => CIRCUIT_IDS,
  DEVNET_V2_TREES: () => DEVNET_V2_TREES,
  PROGRAM_ID: () => PROGRAM_ID,
  SEEDS: () => SEEDS,
  deriveAmmPoolPda: () => deriveAmmPoolPda,
  deriveCommitmentCounterPda: () => deriveCommitmentCounterPda,
  deriveLpMintPda: () => deriveLpMintPda,
  derivePoolPda: () => derivePoolPda,
  deriveProtocolConfigPda: () => deriveProtocolConfigPda,
  deriveVaultPda: () => deriveVaultPda,
  deriveVerificationKeyPda: () => deriveVerificationKeyPda,
  padCircuitId: () => padCircuitId
});
function padCircuitId(id) {
  const padded = id.padEnd(32, "_");
  return Buffer.from(padded);
}
function derivePoolPda(tokenMint, programId = PROGRAM_ID) {
  return import_web35.PublicKey.findProgramAddressSync(
    [SEEDS.POOL, tokenMint.toBuffer()],
    programId
  );
}
function deriveVaultPda(tokenMint, programId = PROGRAM_ID) {
  return import_web35.PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, tokenMint.toBuffer()],
    programId
  );
}
function deriveCommitmentCounterPda(pool, programId = PROGRAM_ID) {
  return import_web35.PublicKey.findProgramAddressSync(
    [SEEDS.COMMITMENT_COUNTER, pool.toBuffer()],
    programId
  );
}
function deriveVerificationKeyPda(circuitId, programId = PROGRAM_ID) {
  return import_web35.PublicKey.findProgramAddressSync(
    [SEEDS.VERIFICATION_KEY, padCircuitId(circuitId)],
    programId
  );
}
function deriveProtocolConfigPda(programId = PROGRAM_ID) {
  return import_web35.PublicKey.findProgramAddressSync(
    [SEEDS.PROTOCOL_CONFIG],
    programId
  );
}
function deriveAmmPoolPda(tokenAMint, tokenBMint, programId = PROGRAM_ID) {
  const [first, second] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0 ? [tokenAMint, tokenBMint] : [tokenBMint, tokenAMint];
  return import_web35.PublicKey.findProgramAddressSync(
    [SEEDS.AMM_POOL, first.toBuffer(), second.toBuffer()],
    programId
  );
}
function deriveLpMintPda(tokenAMint, tokenBMint, programId = PROGRAM_ID) {
  const [first, second] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0 ? [tokenAMint, tokenBMint] : [tokenBMint, tokenAMint];
  return import_web35.PublicKey.findProgramAddressSync(
    [SEEDS.LP_MINT, first.toBuffer(), second.toBuffer()],
    programId
  );
}
var import_web35, PROGRAM_ID, SEEDS, DEVNET_V2_TREES, CIRCUIT_IDS;
var init_constants = __esm({
  "src/instructions/constants.ts"() {
    "use strict";
    import_web35 = require("@solana/web3.js");
    PROGRAM_ID = new import_web35.PublicKey("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");
    SEEDS = {
      POOL: Buffer.from("pool"),
      VAULT: Buffer.from("vault"),
      VERIFICATION_KEY: Buffer.from("vk"),
      COMMITMENT_COUNTER: Buffer.from("commitment_counter"),
      PROTOCOL_CONFIG: Buffer.from("protocol_config"),
      AMM_POOL: Buffer.from("amm_pool"),
      LP_MINT: Buffer.from("lp_mint")
    };
    DEVNET_V2_TREES = {
      STATE_TREE: new import_web35.PublicKey("bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU"),
      OUTPUT_QUEUE: new import_web35.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto"),
      ADDRESS_TREE: new import_web35.PublicKey("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx")
    };
    CIRCUIT_IDS = {
      TRANSFER_1X2: "transfer_1x2",
      CONSOLIDATE_3X1: "consolidate_3x1",
      SWAP: "swap_swap",
      ADD_LIQUIDITY: "swap_add_liquidity",
      REMOVE_LIQUIDITY: "swap_remove_liquidity",
      ORDER_CREATE: "market_order_create",
      ORDER_FILL: "market_order_fill",
      ORDER_CANCEL: "market_order_cancel",
      // Perpetual futures circuits
      PERPS_OPEN_POSITION: "perps_open_position",
      PERPS_CLOSE_POSITION: "perps_close_position",
      PERPS_ADD_LIQUIDITY: "perps_add_liquidity",
      PERPS_REMOVE_LIQUIDITY: "perps_remove_liquidity",
      PERPS_LIQUIDATE: "perps_liquidate"
    };
  }
});

// src/instructions/light-helpers.ts
var light_helpers_exports = {};
__export(light_helpers_exports, {
  LightProtocol: () => LightProtocol
});
var import_web36, import_stateless2, LightProtocol;
var init_light_helpers = __esm({
  "src/instructions/light-helpers.ts"() {
    "use strict";
    import_web36 = require("@solana/web3.js");
    import_stateless2 = require("@lightprotocol/stateless.js");
    init_constants();
    LightProtocol = class {
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
       * Get inclusion proof for existing compressed account
       *
       * Uses Light SDK's getCompressedAccountProof which properly proves
       * the account hash exists in the state tree.
       */
      async getInclusionProofByHash(accountHash) {
        const hashBytes = new import_web36.PublicKey(accountHash).toBytes();
        const hashBn = (0, import_stateless2.bn)(hashBytes);
        return this.rpc.getCompressedAccountProof(hashBn);
      }
      /**
       * Get inclusion validity proof for verifying a compressed account exists.
       *
       * Uses getValidityProofV0 which returns a compressed ZK proof suitable
       * for on-chain verification, along with leafIndices, rootIndices, and
       * proveByIndices that indicate whether the account is still in the
       * output queue (prove_by_index=true) or has been batched into the
       * state tree (prove_by_index=false).
       */
      async getInclusionValidityProof(accountHash, tree, queue) {
        const hashBytes = new import_web36.PublicKey(accountHash).toBytes();
        return this.rpc.getValidityProofV0(
          [{ hash: (0, import_stateless2.bn)(hashBytes), tree, queue }],
          []
        );
      }
      /**
       * Build remaining accounts for Light Protocol CPI (simple version - no commitment)
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
       * Build remaining accounts for spending operations (with commitment verification)
       *
       * CENTRALIZED TREE HANDLING - Use this for all spend operations!
       * Handles tree/queue extraction from commitment proof and builds correct indices.
       *
       * @param commitmentProof - Inclusion proof for commitment (from getInclusionProofByHash)
       * @param nullifierProof - Non-inclusion proof for nullifier (from getValidityProof)
       * @returns Everything needed for Light Protocol CPI with commitment verification
       */
      buildRemainingAccountsWithCommitment(commitmentProof, nullifierProof) {
        const systemConfig = import_stateless2.SystemAccountMetaConfig.new(this.programId);
        const packedAccounts = import_stateless2.PackedAccounts.newWithSystemAccountsV2(systemConfig);
        const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);
        const currentAddressTree = this.getAddressTreeInfo().tree;
        const nullifierAddressTreeIndex = packedAccounts.insertOrGet(currentAddressTree);
        const commitmentTree = new import_web36.PublicKey(commitmentProof.treeInfo.tree);
        const commitmentQueue = new import_web36.PublicKey(commitmentProof.treeInfo.queue);
        const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
        const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);
        const commitmentAddressTreeIndex = commitmentStateTreeIndex;
        const { remainingAccounts } = packedAccounts.toAccountMetas();
        const accounts = remainingAccounts.map((acc) => ({
          pubkey: acc.pubkey,
          isWritable: Boolean(acc.isWritable),
          isSigner: Boolean(acc.isSigner)
        }));
        return {
          accounts,
          outputTreeIndex,
          commitmentStateTreeIndex,
          commitmentAddressTreeIndex,
          commitmentQueueIndex,
          nullifierAddressTreeIndex
        };
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
  }
});

// src/instructions/shield.ts
var shield_exports = {};
__export(shield_exports, {
  buildShieldInstructions: () => buildShieldInstructions,
  buildShieldInstructionsForVersionedTx: () => buildShieldInstructionsForVersionedTx,
  buildShieldWithProgram: () => buildShieldWithProgram
});
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
    import_web37.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web37.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    new import_bn.default(params.amount.toString()),
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
    import_web37.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web37.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return { tx, commitment, randomness };
}
async function buildShieldInstructionsForVersionedTx(program, params, rpcUrl) {
  const { tx, commitment, randomness } = await buildShieldWithProgram(program, params, rpcUrl);
  const shieldIx = await tx.instruction();
  return {
    instructions: [shieldIx],
    commitment,
    randomness
  };
}
var import_web37, import_spl_token, import_bn;
var init_shield = __esm({
  "src/instructions/shield.ts"() {
    "use strict";
    import_web37 = require("@solana/web3.js");
    import_spl_token = require("@solana/spl-token");
    import_bn = __toESM(require("bn.js"));
    init_constants();
    init_light_helpers();
    init_commitment();
    init_encryption();
  }
});

// src/instructions/swap.ts
var swap_exports = {};
__export(swap_exports, {
  buildAddLiquidityWithProgram: () => buildAddLiquidityWithProgram,
  buildClosePendingOperationWithProgram: () => buildClosePendingOperationWithProgram,
  buildCreateCommitmentWithProgram: () => buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram: () => buildCreateNullifierWithProgram,
  buildInitializeAmmPoolWithProgram: () => buildInitializeAmmPoolWithProgram,
  buildRemoveLiquidityWithProgram: () => buildRemoveLiquidityWithProgram,
  buildSwapWithProgram: () => buildSwapWithProgram,
  canonicalTokenOrder: () => canonicalTokenOrder,
  derivePendingOperationPda: () => derivePendingOperationPda,
  generateOperationId: () => generateOperationId
});
function derivePendingOperationPda(operationId, programId) {
  return import_web38.PublicKey.findProgramAddressSync(
    [Buffer.from("pending_op"), Buffer.from(operationId)],
    programId
  );
}
function generateOperationId(nullifier, commitment, timestamp) {
  const data = new Uint8Array(32 + 32 + 8);
  data.set(nullifier, 0);
  data.set(commitment, 32);
  new DataView(data.buffer).setBigUint64(64, BigInt(timestamp), true);
  const id = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    id[i] = data[i] ^ data[32 + i % 32] ^ data[64 + i % 8];
  }
  return id;
}
function canonicalTokenOrder(tokenA, tokenB) {
  return tokenA.toBuffer().compare(tokenB.toBuffer()) < 0 ? [tokenA, tokenB] : [tokenB, tokenA];
}
async function buildInitializeAmmPoolWithProgram(program, params) {
  const programId = program.programId;
  const [canonicalA, canonicalB] = canonicalTokenOrder(params.tokenAMint, params.tokenBMint);
  const [ammPoolPda] = deriveAmmPoolPda(canonicalA, canonicalB, programId);
  const [lpMintPda] = deriveLpMintPda(canonicalA, canonicalB, programId);
  const poolTypeEnum = params.poolType === "stableSwap" ? { stableSwap: {} } : { constantProduct: {} };
  const amplification = params.amplification ?? (params.poolType === "stableSwap" ? 200 : 0);
  const tx = program.methods.initializeAmmPool(
    canonicalA,
    canonicalB,
    params.feeBps,
    poolTypeEnum,
    new import_bn2.default(amplification)
  ).accountsPartial({
    ammPool: ammPoolPda,
    lpMint: lpMintPda,
    tokenAMintAccount: canonicalA,
    tokenBMintAccount: canonicalB,
    authority: params.authority,
    payer: params.payer
  });
  return { tx, lpMint: lpMintPda, ammPool: ammPoolPda };
}
async function buildSwapWithProgram(program, params, rpcUrl) {
  console.log("[Swap] Building multi-phase transactions...");
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const operationId = generateOperationId(
    params.nullifier,
    params.outputCommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.SWAP, programId);
  const outputRandomness = params.outRandomness;
  const changeRandomness = params.changeRandomness;
  const outputNote = {
    stealthPubX: params.outputRecipient.stealthPubkey.x,
    tokenMint: params.outputTokenMint,
    amount: params.outputAmount,
    randomness: outputRandomness
  };
  const changeNote = {
    stealthPubX: params.changeRecipient.stealthPubkey.x,
    tokenMint: params.inputTokenMint,
    amount: params.inputAmount - params.swapAmount,
    randomness: changeRandomness
  };
  console.log("[Swap] Output note: tokenMint:", params.outputTokenMint.toBase58(), "amount:", params.outputAmount.toString());
  console.log("[Swap] Change note: tokenMint:", params.inputTokenMint.toBase58(), "amount:", (params.inputAmount - params.swapAmount).toString());
  const encryptedOutputNote = encryptNote(outputNote, params.outputRecipient.stealthPubkey);
  const encryptedChangeNote = encryptNote(changeNote, params.changeRecipient.stealthPubkey);
  const outputEphemeralBytes = new Uint8Array(64);
  outputEphemeralBytes.set(params.outputRecipient.ephemeralPubkey.x, 0);
  outputEphemeralBytes.set(params.outputRecipient.ephemeralPubkey.y, 32);
  const changeEphemeralBytes = new Uint8Array(64);
  changeEphemeralBytes.set(params.changeRecipient.ephemeralPubkey.x, 0);
  changeEphemeralBytes.set(params.changeRecipient.ephemeralPubkey.y, 32);
  const pendingCommitments = [
    {
      pool: params.outputPool,
      commitment: params.outputCommitment,
      stealthEphemeralPubkey: outputEphemeralBytes,
      encryptedNote: serializeEncryptedNote(encryptedOutputNote)
    },
    {
      pool: params.inputPool,
      commitment: params.changeCommitment,
      stealthEphemeralPubkey: changeEphemeralBytes,
      encryptedNote: serializeEncryptedNote(encryptedChangeNote)
    }
  ];
  console.log("[Swap] Fetching commitment inclusion proof...");
  const commitmentProof = await lightProtocol.getInclusionProofByHash(params.accountHash);
  const commitmentTree = new import_web38.PublicKey(commitmentProof.treeInfo.tree);
  const commitmentQueue = new import_web38.PublicKey(commitmentProof.treeInfo.queue);
  const commitmentCpiContext = commitmentProof.treeInfo.cpiContext ? new import_web38.PublicKey(commitmentProof.treeInfo.cpiContext) : null;
  console.log("[Swap] Fetching inclusion validity proof...");
  const inclusionValidityProof = await lightProtocol.getInclusionValidityProof(
    params.accountHash,
    commitmentTree,
    commitmentQueue
  );
  const proveByIndex = inclusionValidityProof.proveByIndices?.[0] ?? true;
  console.log("[Swap] proveByIndex:", proveByIndex);
  console.log("[Swap] Fetching nullifier non-inclusion proof...");
  const nullifierAddress = lightProtocol.deriveNullifierAddress(params.inputPool, params.nullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { SystemAccountMetaConfig: SystemAccountMetaConfig2, PackedAccounts: PackedAccounts2 } = await import("@lightprotocol/stateless.js");
  const { DEVNET_V2_TREES: DEVNET_V2_TREES2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
  const systemConfig = SystemAccountMetaConfig2.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts2.newWithSystemAccountsV2(systemConfig);
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES2.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES2.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
  const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);
  if (commitmentCpiContext) {
    packedAccounts.insertOrGet(commitmentCpiContext);
  }
  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();
  const lightParams = {
    commitmentAccountHash: Array.from(new import_web38.PublicKey(params.accountHash).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentStateTreeIndex,
      queuePubkeyIndex: commitmentQueueIndex,
      leafIndex: inclusionValidityProof.leafIndices?.[0] ?? commitmentProof.leafIndex,
      rootIndex: inclusionValidityProof.rootIndices?.[0] ?? commitmentProof.rootIndex,
      proveByIndex
    },
    commitmentInclusionProof: LightProtocol.convertCompressedProof(inclusionValidityProof),
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const numCommitments = 2;
  console.log("[Swap Phase 0] Building createPendingWithProofSwap...");
  const phase0Tx = await program.methods.createPendingWithProofSwap(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(params.inputCommitment),
    Array.from(params.nullifier),
    Array.from(params.outputCommitment),
    Array.from(params.changeCommitment),
    new import_bn2.default(params.minOutput.toString()),
    new import_bn2.default(params.swapAmount.toString()),
    new import_bn2.default(params.outputAmount.toString()),
    params.swapDirection === "aToB",
    numCommitments
  ).accountsStrict({
    inputPool: params.inputPool,
    outputPool: params.outputPool,
    ammPool: params.ammPool,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: new import_web38.PublicKey("11111111111111111111111111111111")
  }).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 45e4 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[Swap Phase 1] Building verifyCommitmentExists...");
  const phase1Tx = await program.methods.verifyCommitmentExists(
    Array.from(operationId),
    0,
    // commitment_index (single input for swap)
    {
      commitmentAccountHash: lightParams.commitmentAccountHash,
      commitmentMerkleContext: lightParams.commitmentMerkleContext,
      commitmentInclusionProof: lightParams.commitmentInclusionProof,
      commitmentAddressTreeInfo: lightParams.commitmentAddressTreeInfo
    }
  ).accountsStrict({
    pool: params.inputPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[Swap Phase 2] Building createNullifierAndPending...");
  const phase2Tx = await program.methods.createNullifierAndPending(
    Array.from(operationId),
    0,
    // nullifier_index (single nullifier for swap)
    {
      proof: lightParams.nullifierNonInclusionProof,
      addressTreeInfo: lightParams.nullifierAddressTreeInfo,
      outputTreeIndex: lightParams.outputTreeIndex
    }
  ).accountsStrict({
    pool: params.inputPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[Swap Phase 3] Building executeSwap...");
  const phase3Accounts = {
    inputPool: params.inputPool,
    outputPool: params.outputPool,
    ammPool: params.ammPool,
    inputVault: params.inputVault,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    protocolConfig: params.protocolConfig,
    // Required
    tokenProgram: import_spl_token2.TOKEN_PROGRAM_ID
  };
  if (params.treasuryAta) {
    phase3Accounts.treasuryAta = params.treasuryAta;
  }
  const phase3Tx = await program.methods.executeSwap(
    Array.from(operationId)
  ).accounts(phase3Accounts).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 15e4 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[Swap] All phase transactions built successfully");
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments
  };
}
async function buildAddLiquidityWithProgram(program, params, rpcUrl) {
  console.log("[AddLiquidity] Building multi-phase transactions...");
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const operationId = generateOperationId(
    params.nullifierA,
    params.lpCommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.ADD_LIQUIDITY, programId);
  const lpRandomness = params.lpRandomness;
  const changeARandomness = params.changeARandomness;
  const changeBRandomness = params.changeBRandomness;
  const lpNote = {
    stealthPubX: params.lpRecipient.stealthPubkey.x,
    tokenMint: params.lpMint,
    amount: params.lpAmount,
    randomness: lpRandomness
  };
  const changeANote = {
    stealthPubX: params.changeARecipient.stealthPubkey.x,
    tokenMint: params.tokenAMint,
    amount: params.inputAAmount - params.depositA,
    randomness: changeARandomness
  };
  const changeBNote = {
    stealthPubX: params.changeBRecipient.stealthPubkey.x,
    tokenMint: params.tokenBMint,
    amount: params.inputBAmount - params.depositB,
    randomness: changeBRandomness
  };
  console.log("[AddLiquidity] LP note: amount:", params.lpAmount.toString());
  console.log("[AddLiquidity] Change A note: amount:", (params.inputAAmount - params.depositA).toString());
  console.log("[AddLiquidity] Change B note: amount:", (params.inputBAmount - params.depositB).toString());
  const encryptedLp = encryptNote(lpNote, params.lpRecipient.stealthPubkey);
  const encryptedChangeA = encryptNote(changeANote, params.changeARecipient.stealthPubkey);
  const encryptedChangeB = encryptNote(changeBNote, params.changeBRecipient.stealthPubkey);
  const lpEphemeral = new Uint8Array(64);
  lpEphemeral.set(params.lpRecipient.ephemeralPubkey.x, 0);
  lpEphemeral.set(params.lpRecipient.ephemeralPubkey.y, 32);
  const changeAEphemeral = new Uint8Array(64);
  changeAEphemeral.set(params.changeARecipient.ephemeralPubkey.x, 0);
  changeAEphemeral.set(params.changeARecipient.ephemeralPubkey.y, 32);
  const changeBEphemeral = new Uint8Array(64);
  changeBEphemeral.set(params.changeBRecipient.ephemeralPubkey.x, 0);
  changeBEphemeral.set(params.changeBRecipient.ephemeralPubkey.y, 32);
  const pendingCommitments = [
    {
      pool: params.lpPool,
      commitment: params.lpCommitment,
      stealthEphemeralPubkey: lpEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedLp)
    },
    {
      pool: params.poolA,
      commitment: params.changeACommitment,
      stealthEphemeralPubkey: changeAEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedChangeA)
    },
    {
      pool: params.poolB,
      commitment: params.changeBCommitment,
      stealthEphemeralPubkey: changeBEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedChangeB)
    }
  ];
  console.log("[AddLiquidity] Fetching commitment A inclusion proof...");
  const commitmentAProof = await lightProtocol.getInclusionProofByHash(params.accountHashA);
  console.log("[AddLiquidity] Fetching commitment B inclusion proof...");
  const commitmentBProof = await lightProtocol.getInclusionProofByHash(params.accountHashB);
  const commitmentATree = new import_web38.PublicKey(commitmentAProof.treeInfo.tree);
  const commitmentAQueue = new import_web38.PublicKey(commitmentAProof.treeInfo.queue);
  const commitmentACpiContext = commitmentAProof.treeInfo.cpiContext ? new import_web38.PublicKey(commitmentAProof.treeInfo.cpiContext) : null;
  const commitmentBTree = new import_web38.PublicKey(commitmentBProof.treeInfo.tree);
  const commitmentBQueue = new import_web38.PublicKey(commitmentBProof.treeInfo.queue);
  const commitmentBCpiContext = commitmentBProof.treeInfo.cpiContext ? new import_web38.PublicKey(commitmentBProof.treeInfo.cpiContext) : null;
  console.log("[AddLiquidity] Fetching inclusion validity proofs...");
  const inclusionValidityProofA = await lightProtocol.getInclusionValidityProof(
    params.accountHashA,
    commitmentATree,
    commitmentAQueue
  );
  const proveByIndexA = inclusionValidityProofA.proveByIndices?.[0] ?? true;
  const inclusionValidityProofB = await lightProtocol.getInclusionValidityProof(
    params.accountHashB,
    commitmentBTree,
    commitmentBQueue
  );
  const proveByIndexB = inclusionValidityProofB.proveByIndices?.[0] ?? true;
  console.log("[AddLiquidity] Fetching nullifier A non-inclusion proof...");
  const nullifierAAddress = lightProtocol.deriveNullifierAddress(params.poolA, params.nullifierA);
  const nullifierAProof = await lightProtocol.getValidityProof([nullifierAAddress]);
  console.log("[AddLiquidity] Fetching nullifier B non-inclusion proof...");
  const nullifierBAddress = lightProtocol.deriveNullifierAddress(params.poolB, params.nullifierB);
  const nullifierBProof = await lightProtocol.getValidityProof([nullifierBAddress]);
  const { SystemAccountMetaConfig: SystemAccountMetaConfig2, PackedAccounts: PackedAccounts2 } = await import("@lightprotocol/stateless.js");
  const { DEVNET_V2_TREES: DEVNET_V2_TREES2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
  const systemConfig = SystemAccountMetaConfig2.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts2.newWithSystemAccountsV2(systemConfig);
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES2.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES2.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const commitmentAStateTreeIndex = packedAccounts.insertOrGet(commitmentATree);
  const commitmentAQueueIndex = packedAccounts.insertOrGet(commitmentAQueue);
  const commitmentBStateTreeIndex = packedAccounts.insertOrGet(commitmentBTree);
  const commitmentBQueueIndex = packedAccounts.insertOrGet(commitmentBQueue);
  if (commitmentACpiContext) {
    packedAccounts.insertOrGet(commitmentACpiContext);
  }
  if (commitmentBCpiContext) {
    packedAccounts.insertOrGet(commitmentBCpiContext);
  }
  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();
  const lightParamsA = {
    commitmentAccountHash: Array.from(new import_web38.PublicKey(params.accountHashA).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentAStateTreeIndex,
      queuePubkeyIndex: commitmentAQueueIndex,
      leafIndex: inclusionValidityProofA.leafIndices?.[0] ?? commitmentAProof.leafIndex,
      rootIndex: inclusionValidityProofA.rootIndices?.[0] ?? commitmentAProof.rootIndex,
      proveByIndex: proveByIndexA
    },
    commitmentInclusionProof: LightProtocol.convertCompressedProof(inclusionValidityProofA),
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierAProof.rootIndices[0] ?? 0
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierAProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierAProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const lightParamsB = {
    commitmentAccountHash: Array.from(new import_web38.PublicKey(params.accountHashB).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentBStateTreeIndex,
      queuePubkeyIndex: commitmentBQueueIndex,
      leafIndex: inclusionValidityProofB.leafIndices?.[0] ?? commitmentBProof.leafIndex,
      rootIndex: inclusionValidityProofB.rootIndices?.[0] ?? commitmentBProof.rootIndex,
      proveByIndex: proveByIndexB
    },
    commitmentInclusionProof: LightProtocol.convertCompressedProof(inclusionValidityProofB),
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierBProof.rootIndices[0] ?? 0
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierBProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierBProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const numCommitments = 3;
  console.log("[AddLiquidity Phase 0] Building createPendingWithProofAddLiquidity...");
  const phase0Tx = await program.methods.createPendingWithProofAddLiquidity(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.inputCommitmentA),
    Array.from(params.inputCommitmentB),
    Array.from(params.nullifierA),
    Array.from(params.nullifierB),
    Array.from(params.lpCommitment),
    Array.from(params.changeACommitment),
    Array.from(params.changeBCommitment),
    new import_bn2.default(params.depositA.toString()),
    new import_bn2.default(params.depositB.toString()),
    new import_bn2.default(params.lpAmount.toString()),
    new import_bn2.default(params.minLpAmount.toString()),
    numCommitments
  ).accountsStrict({
    poolA: params.poolA,
    poolB: params.poolB,
    lpPool: params.lpPool,
    ammPool: params.ammPool,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: new import_web38.PublicKey("11111111111111111111111111111111")
  }).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 45e4 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[AddLiquidity Phase 1a] Building verifyCommitmentExists for deposit A...");
  const phase1aTx = await program.methods.verifyCommitmentExists(
    Array.from(operationId),
    0,
    // commitment_index for input A
    {
      commitmentAccountHash: lightParamsA.commitmentAccountHash,
      commitmentMerkleContext: lightParamsA.commitmentMerkleContext,
      commitmentInclusionProof: lightParamsA.commitmentInclusionProof,
      commitmentAddressTreeInfo: lightParamsA.commitmentAddressTreeInfo
    }
  ).accountsStrict({
    pool: params.poolA,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[AddLiquidity Phase 1b] Building verifyCommitmentExists for deposit B...");
  const phase1bTx = await program.methods.verifyCommitmentExists(
    Array.from(operationId),
    1,
    // commitment_index for input B
    {
      commitmentAccountHash: lightParamsB.commitmentAccountHash,
      commitmentMerkleContext: lightParamsB.commitmentMerkleContext,
      commitmentInclusionProof: lightParamsB.commitmentInclusionProof,
      commitmentAddressTreeInfo: lightParamsB.commitmentAddressTreeInfo
    }
  ).accountsStrict({
    pool: params.poolB,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[AddLiquidity Phase 2a] Building createNullifierAndPending for deposit A...");
  const phase2aTx = await program.methods.createNullifierAndPending(
    Array.from(operationId),
    0,
    // nullifier_index for input A
    {
      proof: lightParamsA.nullifierNonInclusionProof,
      addressTreeInfo: lightParamsA.nullifierAddressTreeInfo,
      outputTreeIndex: lightParamsA.outputTreeIndex
    }
  ).accountsStrict({
    pool: params.poolA,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[AddLiquidity Phase 2b] Building createNullifierAndPending for deposit B...");
  const phase2bTx = await program.methods.createNullifierAndPending(
    Array.from(operationId),
    1,
    // nullifier_index for input B
    {
      proof: lightParamsB.nullifierNonInclusionProof,
      addressTreeInfo: lightParamsB.nullifierAddressTreeInfo,
      outputTreeIndex: lightParamsB.outputTreeIndex
    }
  ).accountsStrict({
    pool: params.poolB,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[AddLiquidity Phase 3] Building executeAddLiquidity...");
  const phase3Tx = await program.methods.executeAddLiquidity(
    Array.from(operationId),
    new import_bn2.default(params.minLpAmount.toString())
  ).accountsStrict({
    poolA: params.poolA,
    poolB: params.poolB,
    lpPool: params.lpPool,
    ammPool: params.ammPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 1e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[AddLiquidity] All phase transactions built successfully");
  return {
    tx: phase0Tx,
    phase1aTx,
    phase1bTx,
    phase2aTx,
    phase2bTx,
    phase3Tx,
    operationId,
    pendingCommitments
  };
}
async function buildCreateNullifierWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [pendingOpPda] = derivePendingOperationPda(params.operationId, programId);
  let nullifier;
  if (params.nullifier) {
    nullifier = params.nullifier;
    console.log(`[Phase 2] Using provided nullifier: ${Buffer.from(nullifier).toString("hex").slice(0, 16)}...`);
  } else {
    console.log(`[Phase 2] Fetching PendingOperation: ${pendingOpPda.toBase58()}`);
    console.log(`[Phase 2] Operation ID: ${Buffer.from(params.operationId).toString("hex").slice(0, 16)}...`);
    const pendingOp = await program.account.pendingOperation.fetch(pendingOpPda);
    nullifier = new Uint8Array(pendingOp.nullifiers[params.nullifierIndex]);
    console.log(`[Phase 2] Fetched nullifier from PendingOp: ${Buffer.from(nullifier).toString("hex").slice(0, 16)}...`);
  }
  const nullifierAddress = lightProtocol.deriveNullifierAddress(params.pool, nullifier);
  console.log(`[Instruction] Trying to create nullifier address: ${nullifierAddress.toBase58()}`);
  console.log(`[Instruction] Pool: ${params.pool.toBase58()}`);
  console.log(`[Instruction] Nullifier: ${Buffer.from(nullifier).toString("hex").slice(0, 16)}...`);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const lightParams = {
    proof: LightProtocol.convertCompressedProof(nullifierProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const tx = await program.methods.createNullifier(
    Array.from(params.operationId),
    params.nullifierIndex,
    lightParams
  ).accountsStrict({
    pool: params.pool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(remainingAccounts).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return { tx };
}
async function buildCreateCommitmentWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const [pendingOpPda] = derivePendingOperationPda(params.operationId, programId);
  const [counterPda] = deriveCommitmentCounterPda(params.pool, programId);
  let commitment;
  if (params.commitment) {
    commitment = params.commitment;
    console.log(`[Phase 3] Using provided commitment: ${Buffer.from(commitment).toString("hex").slice(0, 16)}...`);
  } else {
    const pendingOp = await program.account.pendingOperation.fetch(pendingOpPda);
    commitment = new Uint8Array(pendingOp.commitments[params.commitmentIndex]);
    console.log(`[Phase 3] Fetched commitment from PendingOp: ${Buffer.from(commitment).toString("hex").slice(0, 16)}...`);
  }
  const commitmentAddress = lightProtocol.deriveCommitmentAddress(params.pool, commitment);
  const commitmentProof = await lightProtocol.getValidityProof([commitmentAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();
  const lightParams = {
    proof: LightProtocol.convertCompressedProof(commitmentProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: commitmentProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const tx = await program.methods.createCommitment(
    Array.from(params.operationId),
    params.commitmentIndex,
    Array.from(params.stealthEphemeralPubkey),
    Buffer.from(params.encryptedNote),
    lightParams
  ).accountsStrict({
    pool: params.pool,
    commitmentCounter: counterPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(remainingAccounts).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return { tx };
}
async function buildClosePendingOperationWithProgram(program, operationId, relayer) {
  const programId = program.programId;
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const tx = await program.methods.closePendingOperation(Array.from(operationId)).accountsStrict({
    pendingOperation: pendingOpPda,
    relayer
  }).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return { tx };
}
async function buildRemoveLiquidityWithProgram(program, params, rpcUrl) {
  console.log("[RemoveLiquidity] Building multi-phase transactions...");
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const operationId = generateOperationId(
    params.lpNullifier,
    params.outputACommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.REMOVE_LIQUIDITY, programId);
  const outputARandomness = params.outputARandomness;
  const outputBRandomness = params.outputBRandomness;
  const outputANote = {
    stealthPubX: params.outputARecipient.stealthPubkey.x,
    tokenMint: params.tokenAMint,
    amount: params.outputAAmount,
    randomness: outputARandomness
  };
  const outputBNote = {
    stealthPubX: params.outputBRecipient.stealthPubkey.x,
    tokenMint: params.tokenBMint,
    amount: params.outputBAmount,
    randomness: outputBRandomness
  };
  console.log("[RemoveLiquidity] Output A note: amount:", params.outputAAmount.toString());
  console.log("[RemoveLiquidity] Output B note: amount:", params.outputBAmount.toString());
  const encryptedOutputA = encryptNote(outputANote, params.outputARecipient.stealthPubkey);
  const encryptedOutputB = encryptNote(outputBNote, params.outputBRecipient.stealthPubkey);
  const outputAEphemeral = new Uint8Array(64);
  outputAEphemeral.set(params.outputARecipient.ephemeralPubkey.x, 0);
  outputAEphemeral.set(params.outputARecipient.ephemeralPubkey.y, 32);
  const outputBEphemeral = new Uint8Array(64);
  outputBEphemeral.set(params.outputBRecipient.ephemeralPubkey.x, 0);
  outputBEphemeral.set(params.outputBRecipient.ephemeralPubkey.y, 32);
  const pendingCommitments = [
    {
      pool: params.poolA,
      commitment: params.outputACommitment,
      stealthEphemeralPubkey: outputAEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedOutputA)
    },
    {
      pool: params.poolB,
      commitment: params.outputBCommitment,
      stealthEphemeralPubkey: outputBEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedOutputB)
    }
  ];
  console.log("[RemoveLiquidity] Fetching LP commitment inclusion proof...");
  const commitmentProof = await lightProtocol.getInclusionProofByHash(params.accountHash);
  const commitmentTree = new import_web38.PublicKey(commitmentProof.treeInfo.tree);
  const commitmentQueue = new import_web38.PublicKey(commitmentProof.treeInfo.queue);
  const commitmentCpiContext = commitmentProof.treeInfo.cpiContext ? new import_web38.PublicKey(commitmentProof.treeInfo.cpiContext) : null;
  console.log("[RemoveLiquidity] Fetching inclusion validity proof...");
  const inclusionValidityProof = await lightProtocol.getInclusionValidityProof(
    params.accountHash,
    commitmentTree,
    commitmentQueue
  );
  const proveByIndex = inclusionValidityProof.proveByIndices?.[0] ?? true;
  console.log("[RemoveLiquidity] Fetching LP nullifier non-inclusion proof...");
  const nullifierAddress = lightProtocol.deriveNullifierAddress(params.lpPool, params.lpNullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { SystemAccountMetaConfig: SystemAccountMetaConfig2, PackedAccounts: PackedAccounts2 } = await import("@lightprotocol/stateless.js");
  const { DEVNET_V2_TREES: DEVNET_V2_TREES2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
  const systemConfig = SystemAccountMetaConfig2.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts2.newWithSystemAccountsV2(systemConfig);
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES2.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES2.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
  const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);
  if (commitmentCpiContext) {
    packedAccounts.insertOrGet(commitmentCpiContext);
  }
  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();
  const lightParams = {
    commitmentAccountHash: Array.from(new import_web38.PublicKey(params.accountHash).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentStateTreeIndex,
      queuePubkeyIndex: commitmentQueueIndex,
      leafIndex: inclusionValidityProof.leafIndices?.[0] ?? commitmentProof.leafIndex,
      rootIndex: inclusionValidityProof.rootIndices?.[0] ?? commitmentProof.rootIndex,
      proveByIndex
    },
    commitmentInclusionProof: LightProtocol.convertCompressedProof(inclusionValidityProof),
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0
    },
    outputTreeIndex
  };
  const numCommitments = 2;
  console.log("[RemoveLiquidity Phase 0] Building createPendingWithProofRemoveLiquidity...");
  const phase0Tx = await program.methods.createPendingWithProofRemoveLiquidity(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.lpInputCommitment),
    Array.from(params.lpNullifier),
    Array.from(params.outputACommitment),
    Array.from(params.outputBCommitment),
    Array.from(params.oldPoolStateHash),
    Array.from(params.newPoolStateHash),
    new import_bn2.default(params.lpAmount.toString()),
    new import_bn2.default(params.outputAAmount.toString()),
    new import_bn2.default(params.outputBAmount.toString()),
    numCommitments
  ).accountsStrict({
    lpPool: params.lpPool,
    poolA: params.poolA,
    poolB: params.poolB,
    ammPool: params.ammPool,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: new import_web38.PublicKey("11111111111111111111111111111111")
  }).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 45e4 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[RemoveLiquidity Phase 1] Building verifyCommitmentExists...");
  const phase1Tx = await program.methods.verifyCommitmentExists(
    Array.from(operationId),
    0,
    // commitment_index (single LP input)
    {
      commitmentAccountHash: lightParams.commitmentAccountHash,
      commitmentMerkleContext: lightParams.commitmentMerkleContext,
      commitmentInclusionProof: lightParams.commitmentInclusionProof,
      commitmentAddressTreeInfo: lightParams.commitmentAddressTreeInfo
    }
  ).accountsStrict({
    pool: params.lpPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[RemoveLiquidity Phase 2] Building createNullifierAndPending...");
  const phase2Tx = await program.methods.createNullifierAndPending(
    Array.from(operationId),
    0,
    // nullifier_index (single LP nullifier)
    {
      proof: lightParams.nullifierNonInclusionProof,
      addressTreeInfo: lightParams.nullifierAddressTreeInfo,
      outputTreeIndex: lightParams.outputTreeIndex
    }
  ).accountsStrict({
    pool: params.lpPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(finalRemainingAccounts.map((acc) => ({
    pubkey: acc.pubkey,
    isSigner: acc.isSigner,
    isWritable: acc.isWritable
  }))).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[RemoveLiquidity Phase 3] Building executeRemoveLiquidity...");
  const phase3Accounts = {
    lpPool: params.lpPool,
    poolA: params.poolA,
    poolB: params.poolB,
    ammPool: params.ammPool,
    vaultA: params.vaultA,
    vaultB: params.vaultB,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    protocolConfig: params.protocolConfig,
    tokenProgram: import_spl_token2.TOKEN_PROGRAM_ID
  };
  if (params.treasuryAtaA) {
    phase3Accounts.treasuryAtaA = params.treasuryAtaA;
  }
  if (params.treasuryAtaB) {
    phase3Accounts.treasuryAtaB = params.treasuryAtaB;
  }
  const phase3Tx = await program.methods.executeRemoveLiquidity(
    Array.from(operationId),
    Array.from(params.newPoolStateHash)
  ).accounts(phase3Accounts).preInstructions([
    import_web38.ComputeBudgetProgram.setComputeUnitLimit({ units: 15e4 }),
    import_web38.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  console.log("[RemoveLiquidity] All phase transactions built successfully");
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments
  };
}
var import_web38, import_spl_token2, import_bn2;
var init_swap = __esm({
  "src/instructions/swap.ts"() {
    "use strict";
    import_web38 = require("@solana/web3.js");
    import_spl_token2 = require("@solana/spl-token");
    import_bn2 = __toESM(require("bn.js"));
    init_constants();
    init_light_helpers();
    init_encryption();
  }
});

// src/fees.ts
var fees_exports = {};
__export(fees_exports, {
  BPS_DIVISOR: () => BPS_DIVISOR,
  DEFAULT_FEE_CONFIG: () => DEFAULT_FEE_CONFIG,
  MAX_FEE_BPS: () => MAX_FEE_BPS,
  calculateMinimumFee: () => calculateMinimumFee,
  calculateProtocolFee: () => calculateProtocolFee,
  calculateSwapProtocolFee: () => calculateSwapProtocolFee,
  estimateTotalCost: () => estimateTotalCost,
  fetchProtocolFeeConfig: () => fetchProtocolFeeConfig,
  formatFeeAmount: () => formatFeeAmount,
  formatFeeRate: () => formatFeeRate,
  getFeeBps: () => getFeeBps,
  isFeeableOperation: () => isFeeableOperation,
  isFreeOperation: () => isFreeOperation,
  verifyFeeAmount: () => verifyFeeAmount
});
function isFreeOperation(operation) {
  return ["shield", "add_liquidity", "consolidate", "stake", "vote"].includes(operation);
}
function isFeeableOperation(operation) {
  return ["transfer", "unshield", "swap", "remove_liquidity"].includes(operation);
}
function calculateProtocolFee(amount, operation, config) {
  if (isFreeOperation(operation)) {
    return {
      amount,
      feeAmount: 0n,
      amountAfterFee: amount,
      feeBps: 0,
      isFree: true
    };
  }
  if (!config || !config.feesEnabled) {
    return {
      amount,
      feeAmount: 0n,
      amountAfterFee: amount,
      feeBps: 0,
      isFree: false
    };
  }
  const feeBps = getFeeBps(operation, config);
  const feeAmount = amount * BigInt(feeBps) / BPS_DIVISOR;
  const amountAfterFee = amount - feeAmount;
  return {
    amount,
    feeAmount,
    amountAfterFee,
    feeBps,
    isFree: false
  };
}
function getFeeBps(operation, config) {
  switch (operation) {
    case "transfer":
      return config.transferFeeBps;
    case "unshield":
      return config.unshieldFeeBps;
    case "swap":
      return 0;
    case "remove_liquidity":
      return config.removeLiquidityFeeBps;
    default:
      return 0;
  }
}
function calculateSwapProtocolFee(swapAmount, lpFeeBps, config) {
  if (!config || !config.feesEnabled || config.swapFeeShareBps === 0 || lpFeeBps === 0) {
    const totalLpFee2 = swapAmount * BigInt(lpFeeBps) / BPS_DIVISOR;
    return {
      protocolFee: 0n,
      lpFeeRemaining: totalLpFee2,
      totalLpFee: totalLpFee2,
      effectiveFeeBps: 0
    };
  }
  const totalLpFee = swapAmount * BigInt(lpFeeBps) / BPS_DIVISOR;
  const protocolFee = totalLpFee * BigInt(config.swapFeeShareBps) / BPS_DIVISOR;
  const lpFeeRemaining = totalLpFee - protocolFee;
  const effectiveFeeBps = Math.floor(lpFeeBps * config.swapFeeShareBps / 1e4);
  return {
    protocolFee,
    lpFeeRemaining,
    totalLpFee,
    effectiveFeeBps
  };
}
function calculateMinimumFee(amount, feeBps) {
  if (feeBps === 0) return 0n;
  const numerator = amount * BigInt(feeBps) + (BPS_DIVISOR - 1n);
  return numerator / BPS_DIVISOR;
}
function verifyFeeAmount(amount, feeAmount, feeBps) {
  if (feeBps === 0) return true;
  const minFee = calculateMinimumFee(amount, feeBps);
  return feeAmount >= minFee;
}
async function fetchProtocolFeeConfig(connection, programId = PROGRAM_ID) {
  const [configPda] = deriveProtocolConfigPda(programId);
  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    return null;
  }
  const data = accountInfo.data.slice(8);
  let offset = 0;
  const authority = new import_web315.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const treasury = new import_web315.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const transferFeeBps = data.readUInt16LE(offset);
  offset += 2;
  const unshieldFeeBps = data.readUInt16LE(offset);
  offset += 2;
  const swapFeeShareBps = data.readUInt16LE(offset);
  offset += 2;
  const removeLiquidityFeeBps = data.readUInt16LE(offset);
  offset += 2;
  const feesEnabled = data[offset] === 1;
  return {
    authority,
    treasury,
    transferFeeBps,
    unshieldFeeBps,
    swapFeeShareBps,
    removeLiquidityFeeBps,
    feesEnabled
  };
}
function formatFeeAmount(feeAmount, decimals) {
  const divisor = BigInt(10 ** decimals);
  const whole = feeAmount / divisor;
  const fraction = feeAmount % divisor;
  if (fraction === 0n) {
    return whole.toString();
  }
  const fractionStr = fraction.toString().padStart(decimals, "0");
  const trimmed = fractionStr.replace(/0+$/, "");
  return `${whole}.${trimmed}`;
}
function formatFeeRate(feeBps) {
  const percent = feeBps / 100;
  return `${percent}%`;
}
function estimateTotalCost(amount, operation, config) {
  const feeCalc = calculateProtocolFee(amount, operation, config);
  return {
    amount,
    fee: feeCalc.feeAmount,
    total: amount + feeCalc.feeAmount,
    feeRate: formatFeeRate(feeCalc.feeBps)
  };
}
var import_web315, DEFAULT_FEE_CONFIG, MAX_FEE_BPS, BPS_DIVISOR;
var init_fees = __esm({
  "src/fees.ts"() {
    "use strict";
    import_web315 = require("@solana/web3.js");
    init_constants();
    DEFAULT_FEE_CONFIG = {
      transferFeeBps: 10,
      // 0.1%
      unshieldFeeBps: 25,
      // 0.25%
      swapFeeShareBps: 2e3,
      // 20% of LP fees
      removeLiquidityFeeBps: 25,
      // 0.25%
      feesEnabled: true
    };
    MAX_FEE_BPS = 1e3;
    BPS_DIVISOR = 10000n;
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ALTManager: () => ALTManager,
  AutoConsolidator: () => AutoConsolidator,
  BPS_DIVISOR: () => BPS_DIVISOR,
  BallotStatus: () => BallotStatus,
  CIRCUIT_IDS: () => CIRCUIT_IDS,
  CloakCraftClient: () => CloakCraftClient,
  ConsolidationService: () => ConsolidationService,
  DEFAULT_FEE_CONFIG: () => DEFAULT_FEE_CONFIG,
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
  LP_COMMITMENT_DOMAIN: () => LP_COMMITMENT_DOMAIN,
  LightClient: () => LightClient,
  LightCommitmentClient: () => LightCommitmentClient,
  LightProtocol: () => LightProtocol,
  MAINNET_LIGHT_TREES: () => MAINNET_LIGHT_TREES,
  MAX_FEE_BPS: () => MAX_FEE_BPS,
  MAX_PERPS_TOKENS: () => MAX_PERPS_TOKENS,
  MAX_TRANSACTION_SIZE: () => MAX_TRANSACTION_SIZE,
  NOTE_TYPE_LP: () => NOTE_TYPE_LP,
  NOTE_TYPE_POSITION: () => NOTE_TYPE_POSITION,
  NOTE_TYPE_STANDARD: () => NOTE_TYPE_STANDARD,
  NoteManager: () => NoteManager,
  PERPS_CIRCUIT_IDS: () => PERPS_CIRCUIT_IDS,
  PERPS_PYTH_FEED_IDS: () => PERPS_PYTH_FEED_IDS,
  PERPS_SEEDS: () => PERPS_SEEDS,
  POSITION_COMMITMENT_DOMAIN: () => POSITION_COMMITMENT_DOMAIN,
  PROGRAM_ID: () => PROGRAM_ID,
  PYTH_FEED_IDS: () => PYTH_FEED_IDS,
  PoolAnalyticsCalculator: () => PoolAnalyticsCalculator,
  PoolType: () => import_types4.PoolType,
  ProofGenerator: () => ProofGenerator,
  PythPriceService: () => PythPriceService,
  ResolutionMode: () => ResolutionMode,
  RevealMode: () => RevealMode,
  SEEDS: () => SEEDS,
  SmartNoteSelector: () => SmartNoteSelector,
  TokenPriceFetcher: () => TokenPriceFetcher,
  TransactionHistory: () => TransactionHistory,
  TransactionStatus: () => TransactionStatus,
  TransactionType: () => TransactionType,
  VOTING_CIRCUIT_IDS: () => CIRCUIT_IDS3,
  VOTING_SEEDS: () => VOTING_SEEDS,
  VoteBindingMode: () => VoteBindingMode,
  VoteOption: () => VoteOption,
  VoteRecoveryManager: () => VoteRecoveryManager,
  VoteType: () => VoteType,
  VotingClient: () => VotingClient,
  WALLET_DERIVATION_MESSAGE: () => WALLET_DERIVATION_MESSAGE,
  Wallet: () => Wallet,
  WeightOp: () => WeightOp,
  addCiphertexts: () => addCiphertexts,
  ammPoolExists: () => ammPoolExists,
  bigintToFieldString: () => bigintToFieldString,
  buildAddLiquidityWithProgram: () => buildAddLiquidityWithProgram,
  buildAddMarketWithProgram: () => buildAddMarketWithProgram,
  buildAddPerpsLiquidityWithProgram: () => buildAddPerpsLiquidityWithProgram,
  buildAddTokenToPoolWithProgram: () => buildAddTokenToPoolWithProgram,
  buildAtomicMultiPhaseTransaction: () => buildAtomicMultiPhaseTransaction,
  buildCancelOrderWithProgram: () => buildCancelOrderWithProgram,
  buildChangeVoteSnapshotExecuteInstruction: () => buildChangeVoteSnapshotExecuteInstruction,
  buildChangeVoteSnapshotInstructions: () => buildChangeVoteSnapshotInstructions,
  buildChangeVoteSnapshotPhase0Instruction: () => buildChangeVoteSnapshotPhase0Instruction,
  buildClaimExecuteInstruction: () => buildClaimExecuteInstruction,
  buildClaimPhase0Instruction: () => buildClaimPhase0Instruction,
  buildClosePendingOperationWithProgram: () => buildClosePendingOperationWithProgram,
  buildClosePositionWithProgram: () => buildClosePositionWithProgram,
  buildCloseVotePositionExecuteInstruction: () => buildCloseVotePositionExecuteInstruction,
  buildCloseVotePositionPhase0Instruction: () => buildCloseVotePositionPhase0Instruction,
  buildCloseVotingPositionInstructions: () => buildClosePositionInstructions,
  buildConsolidationWithProgram: () => buildConsolidationWithProgram,
  buildCreateBallotInstruction: () => buildCreateBallotInstruction,
  buildCreateCommitmentWithProgram: () => buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram: () => buildCreateNullifierWithProgram,
  buildDecryptTallyInstruction: () => buildDecryptTallyInstruction,
  buildFillOrderWithProgram: () => buildFillOrderWithProgram,
  buildFinalizeBallotInstruction: () => buildFinalizeBallotInstruction,
  buildInitializeAmmPoolWithProgram: () => buildInitializeAmmPoolWithProgram,
  buildInitializeCommitmentCounterWithProgram: () => buildInitializeCommitmentCounterWithProgram,
  buildInitializePerpsPoolWithProgram: () => buildInitializePerpsPoolWithProgram,
  buildInitializePoolWithProgram: () => buildInitializePoolWithProgram,
  buildLiquidatePositionWithProgram: () => buildLiquidatePositionWithProgram,
  buildOpenPositionWithProgram: () => buildOpenPositionWithProgram,
  buildRemoveLiquidityWithProgram: () => buildRemoveLiquidityWithProgram,
  buildRemovePerpsLiquidityWithProgram: () => buildRemovePerpsLiquidityWithProgram,
  buildResolveBallotInstruction: () => buildResolveBallotInstruction,
  buildShieldInstructions: () => buildShieldInstructions,
  buildShieldInstructionsForVersionedTx: () => buildShieldInstructionsForVersionedTx,
  buildShieldWithProgram: () => buildShieldWithProgram,
  buildStoreCommitmentWithProgram: () => buildStoreCommitmentWithProgram,
  buildSwapWithProgram: () => buildSwapWithProgram,
  buildTransactWithProgram: () => buildTransactWithProgram,
  buildUpdateBorrowFeesWithProgram: () => buildUpdateBorrowFeesWithProgram,
  buildUpdateMarketStatusWithProgram: () => buildUpdateMarketStatusWithProgram,
  buildUpdatePoolConfigWithProgram: () => buildUpdatePoolConfigWithProgram,
  buildUpdateTokenStatusWithProgram: () => buildUpdateTokenStatusWithProgram,
  buildVerifyVoteCommitmentExistsInstruction: () => buildVerifyVoteCommitmentExistsInstruction,
  buildVersionedTransaction: () => buildVersionedTransaction,
  buildVoteSnapshotExecuteInstruction: () => buildVoteSnapshotExecuteInstruction,
  buildVoteSnapshotInstructions: () => buildVoteSnapshotInstructions,
  buildVoteSnapshotPhase0Instruction: () => buildVoteSnapshotPhase0Instruction,
  buildVoteSpendExecuteInstruction: () => buildVoteSpendExecuteInstruction,
  buildVoteSpendInstructions: () => buildVoteSpendInstructions,
  buildVoteSpendPhase0Instruction: () => buildVoteSpendPhase0Instruction,
  buildVotingClaimInstructions: () => buildClaimInstructions,
  bytesToField: () => bytesToField,
  bytesToFieldString: () => bytesToFieldString,
  calculateAddLiquidityAmounts: () => calculateAddLiquidityAmounts,
  calculateBorrowFees: () => calculateBorrowFees,
  calculateBorrowRate: () => calculateBorrowRate,
  calculateImbalanceFee: () => calculateImbalanceFee,
  calculateInvariant: () => calculateInvariant,
  calculateLiquidationAmounts: () => calculateLiquidationAmounts,
  calculateLiquidationPrice: () => calculateLiquidationPrice,
  calculateLpMintAmount: () => calculateLpMintAmount,
  calculateLpValue: () => calculateLpValue,
  calculateMaxWithdrawable: () => calculateMaxWithdrawable,
  calculateMinOutput: () => calculateMinOutput,
  calculateMinimumFee: () => calculateMinimumFee,
  calculatePnL: () => calculatePnL,
  calculatePositionFee: () => calculatePositionFee,
  calculatePositionPrice: () => calculatePositionPrice,
  calculatePriceImpact: () => calculatePriceImpact,
  calculatePriceRatio: () => calculatePriceRatio,
  calculateProtocolFee: () => calculateProtocolFee,
  calculateRemoveLiquidityOutput: () => calculateRemoveLiquidityOutput,
  calculateSlippage: () => calculateSlippage,
  calculateStableSwapOutput: () => calculateStableSwapOutput,
  calculateSwapOutputUnified: () => calculateSwapOutputUnified,
  calculateSwapProtocolFee: () => calculateSwapProtocolFee,
  calculateTotalLiquidity: () => calculateTotalLiquidity,
  calculateUsdPriceImpact: () => calculateUsdPriceImpact,
  calculateUtilization: () => calculateUtilization,
  calculateWithdrawAmount: () => calculateWithdrawAmount,
  canFitInSingleTransaction: () => canFitInSingleTransaction,
  canonicalTokenOrder: () => canonicalTokenOrder,
  checkNullifierSpent: () => checkNullifierSpent,
  checkStealthOwnership: () => checkStealthOwnership,
  clearCircomCache: () => clearCircomCache,
  combineShares: () => combineShares,
  computeAmmStateHash: () => computeAmmStateHash,
  computeCircuitInputs: () => computeCircuitInputs,
  computeCommitment: () => computeCommitment,
  computeDecryptionShare: () => computeDecryptionShare,
  computeLpCommitment: () => computeLpCommitment,
  computePositionCommitment: () => computePositionCommitment,
  consolidationService: () => consolidationService,
  convertInputsToSnarkjs: () => convertInputsToSnarkjs,
  createAddressLookupTable: () => createAddressLookupTable,
  createCloakCraftALT: () => createCloakCraftALT,
  createLpNote: () => createLpNote,
  createNote: () => createNote,
  createPendingTransaction: () => createPendingTransaction,
  createPositionNote: () => createPositionNote,
  createWallet: () => createWallet,
  createWatchOnlyWallet: () => createWatchOnlyWallet,
  decryptLpNote: () => decryptLpNote,
  decryptNote: () => decryptNote,
  decryptPositionNote: () => decryptPositionNote,
  deriveActionNullifier: () => deriveActionNullifier,
  deriveAmmPoolPda: () => deriveAmmPoolPda,
  deriveBallotPda: () => deriveBallotPda,
  deriveBallotVaultPda: () => deriveBallotVaultPda,
  deriveCommitmentCounterPda: () => deriveCommitmentCounterPda,
  deriveLpMintPda: () => deriveLpMintPda,
  deriveNullifierKey: () => deriveNullifierKey,
  deriveOrderPda: () => deriveOrderPda,
  derivePendingOperationPda: () => derivePendingOperationPda,
  derivePerpsLpMintPda: () => derivePerpsLpMintPda,
  derivePerpsMarketPda: () => derivePerpsMarketPda,
  derivePerpsPoolPda: () => derivePerpsPoolPda,
  derivePerpsVaultPda: () => derivePerpsVaultPda,
  derivePoolPda: () => derivePoolPda,
  deriveProtocolConfigPda: () => deriveProtocolConfigPda,
  derivePublicKey: () => derivePublicKey,
  deriveSpendingNullifier: () => deriveSpendingNullifier,
  deriveStealthPrivateKey: () => deriveStealthPrivateKey,
  deriveVaultPda: () => deriveVaultPda,
  deriveVerificationKeyPda: () => deriveVerificationKeyPda,
  deriveVotingPendingOperationPda: () => derivePendingOperationPda2,
  deriveVotingVerificationKeyPda: () => deriveVerificationKeyPda2,
  deriveWalletFromSeed: () => deriveWalletFromSeed,
  deriveWalletFromSignature: () => deriveWalletFromSignature,
  deserializeAmmPool: () => deserializeAmmPool,
  deserializeEncryptedNote: () => deserializeEncryptedNote,
  deserializeLpNote: () => deserializeLpNote,
  deserializePositionNote: () => deserializePositionNote,
  detectNoteType: () => detectNoteType,
  disableAutoConsolidation: () => disableAutoConsolidation,
  elgamalEncrypt: () => elgamalEncrypt,
  enableAutoConsolidation: () => enableAutoConsolidation,
  encryptLpNote: () => encryptLpNote,
  encryptNote: () => encryptNote,
  encryptPositionNote: () => encryptPositionNote,
  encryptPreimage: () => encryptPreimage,
  encryptVote: () => encryptVote,
  estimateTotalCost: () => estimateTotalCost,
  estimateTransactionSize: () => estimateTransactionSize,
  executeVersionedTransaction: () => executeVersionedTransaction,
  extendAddressLookupTable: () => extendAddressLookupTable,
  feedIdToHex: () => feedIdToHex,
  fetchAddressLookupTable: () => fetchAddressLookupTable,
  fetchAmmPool: () => fetchAmmPool,
  fetchProtocolFeeConfig: () => fetchProtocolFeeConfig,
  fetchPythPrice: () => fetchPythPrice,
  fetchPythPriceUsd: () => fetchPythPriceUsd,
  fetchPythPrices: () => fetchPythPrices,
  fetchPythVaa: () => fetchPythVaa,
  fieldToBytes: () => fieldToBytes,
  formatAmmPool: () => formatAmmPool,
  formatApy: () => formatApy,
  formatFeeAmount: () => formatFeeAmount,
  formatFeeRate: () => formatFeeRate,
  formatPrice: () => formatPrice,
  formatPriceChange: () => formatPriceChange,
  formatShare: () => formatShare,
  formatTvl: () => formatTvl,
  generateChangeVoteSnapshotInputs: () => generateChangeVoteSnapshotInputs,
  generateDleqProof: () => generateDleqProof,
  generateEncryptedContributions: () => generateEncryptedContributions,
  generateNegatedEncryptedContributions: () => generateNegatedEncryptedContributions,
  generateOperationId: () => generateOperationId,
  generateRandomness: () => generateRandomness,
  generateSnarkjsProof: () => generateSnarkjsProof,
  generateSnarkjsProofFromCircuit: () => generateSnarkjsProofFromCircuit,
  generateStealthAddress: () => generateStealthAddress,
  generateVoteRandomness: () => generateVoteRandomness,
  generateVoteSnapshotInputs: () => generateVoteSnapshotInputs,
  generateVoteSpendInputs: () => generateVoteSpendInputs,
  generateVotingClaimInputs: () => generateClaimInputs,
  generateVotingOperationId: () => generateOperationId2,
  getAmmPool: () => getAmmPool,
  getAutoConsolidator: () => getAutoConsolidator,
  getFeeBps: () => getFeeBps,
  getFeedIdBySymbol: () => getFeedIdBySymbol,
  getInstructionFromAnchorMethod: () => getInstructionFromAnchorMethod,
  getLightProtocolCommonAccounts: () => getLightProtocolCommonAccounts,
  getPoolOraclePrices: () => getPoolOraclePrices,
  getPriceUpdateAccountAddress: () => getPriceUpdateAccountAddress,
  getPythService: () => getPythService,
  getRandomStateTreeSet: () => getRandomStateTreeSet,
  getStateTreeSet: () => getStateTreeSet,
  initPoseidon: () => initPoseidon,
  initializePool: () => initializePool,
  isFeeableOperation: () => isFeeableOperation,
  isFreeOperation: () => isFreeOperation,
  isInSubgroup: () => isInSubgroup,
  isOnCurve: () => isOnCurve,
  isPriceUpdateValid: () => isPriceUpdateValid,
  isValidLeverage: () => isValidLeverage,
  isValidPositionSize: () => isValidPositionSize,
  lagrangeCoefficient: () => lagrangeCoefficient,
  loadCircomArtifacts: () => loadCircomArtifacts,
  loadWallet: () => loadWallet,
  noteSelector: () => noteSelector,
  padCircuitId: () => padCircuitId,
  parseGroth16Proof: () => parseGroth16Proof,
  pointAdd: () => pointAdd,
  poseidonHash: () => poseidonHash,
  poseidonHash2: () => poseidonHash2,
  poseidonHashAsync: () => poseidonHashAsync,
  poseidonHashDomain: () => poseidonHashDomain,
  poseidonHashDomainAsync: () => poseidonHashDomainAsync,
  pubkeyToField: () => pubkeyToField,
  refreshAmmPool: () => refreshAmmPool,
  scalarMul: () => scalarMul,
  serializeCiphertext: () => serializeCiphertext,
  serializeCiphertextFull: () => serializeCiphertextFull,
  serializeEncryptedNote: () => serializeEncryptedNote,
  serializeEncryptedVote: () => serializeEncryptedVote,
  serializeGroth16Proof: () => serializeGroth16Proof,
  serializeLpNote: () => serializeLpNote,
  serializePositionNote: () => serializePositionNote,
  shouldLiquidate: () => shouldLiquidate,
  sleep: () => sleep,
  storeCommitments: () => storeCommitments,
  tryDecryptAnyNote: () => tryDecryptAnyNote,
  tryDecryptLpNote: () => tryDecryptLpNote,
  tryDecryptNote: () => tryDecryptNote,
  tryDecryptPositionNote: () => tryDecryptPositionNote,
  validateLiquidityAmounts: () => validateLiquidityAmounts,
  validateSwapAmount: () => validateSwapAmount,
  verifyAmmStateHash: () => verifyAmmStateHash,
  verifyCommitment: () => verifyCommitment,
  verifyDleqProof: () => verifyDleqProof,
  verifyFeeAmount: () => verifyFeeAmount,
  verifyInvariant: () => verifyInvariant,
  verifyLpCommitment: () => verifyLpCommitment,
  verifyPositionCommitment: () => verifyPositionCommitment,
  withRetry: () => withRetry,
  wouldExceedUtilization: () => wouldExceedUtilization
});
module.exports = __toCommonJS(index_exports);
__reExport(index_exports, require("@cloakcraft/types"), module.exports);

// src/client.ts
var import_web316 = require("@solana/web3.js");
var import_spl_token5 = require("@solana/spl-token");
var import_anchor = require("@coral-xyz/anchor");

// src/idl/cloakcraft.json
var cloakcraft_default = {
  address: "2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG",
  metadata: {
    name: "cloakcraft",
    version: "0.1.0",
    spec: "0.1.0"
  },
  instructions: [
    {
      name: "add_market",
      docs: [
        "Add a trading market to a perps pool",
        "",
        "Creates a new trading pair (e.g., SOL/USD)."
      ],
      discriminator: [
        41,
        137,
        185,
        126,
        69,
        139,
        254,
        55
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool account (boxed due to large size)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "arg",
                path: "market_id"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Pool authority"
          ],
          signer: true,
          relations: [
            "perps_pool"
          ]
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "market_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "base_token_index",
          type: "u8"
        },
        {
          name: "quote_token_index",
          type: "u8"
        },
        {
          name: "max_position_size",
          type: "u64"
        }
      ]
    },
    {
      name: "add_token_to_pool",
      docs: [
        "Add a token to a perps pool",
        "",
        "Adds a new supported token with its own vault and Pyth price feed."
      ],
      discriminator: [
        35,
        121,
        233,
        111,
        213,
        155,
        197,
        192
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool account (boxed due to large size)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "token_mint",
          docs: [
            "Token mint to add"
          ]
        },
        {
          name: "token_vault",
          docs: [
            "Token vault for the pool (ATA owned by pool)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "const",
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                kind: "account",
                path: "token_mint"
              }
            ],
            program: {
              kind: "const",
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          name: "authority",
          docs: [
            "Pool authority"
          ],
          signer: true,
          relations: [
            "perps_pool"
          ]
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "associated_token_program",
          docs: [
            "Associated token program"
          ],
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        }
      ],
      args: [
        {
          name: "pyth_feed_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "append_verification_key_data",
      docs: [
        "Append verification key data to an existing account",
        "Used for chunked upload of large VKs"
      ],
      discriminator: [
        21,
        242,
        226,
        2,
        197,
        148,
        11,
        181
      ],
      accounts: [
        {
          name: "verification_key",
          docs: [
            "Verification key account (must already be initialized)",
            "Realloc to max size to support larger VK updates"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "arg",
                path: "circuit_id"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Authority"
          ],
          signer: true,
          relations: [
            "verification_key"
          ]
        },
        {
          name: "payer",
          docs: [
            "Payer for reallocation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program for reallocation"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "circuit_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "data_chunk",
          type: "bytes"
        }
      ]
    },
    {
      name: "cancel_order",
      docs: [
        "Cancel an order"
      ],
      discriminator: [
        95,
        129,
        237,
        240,
        8,
        49,
        223,
        132
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "commitment_counter",
          docs: [
            "Commitment counter for this pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "order",
          docs: [
            "Order being cancelled"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                kind: "arg",
                path: "order_id"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key (boxed to reduce stack usage)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer/maker (pays for compressed account creation)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "escrow_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "order_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "refund_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "encrypted_note",
          type: "bytes"
        },
        {
          name: "light_params",
          type: {
            option: {
              defined: {
                name: "LightCancelOrderParams"
              }
            }
          }
        }
      ]
    },
    {
      name: "check_perps_profit_bound",
      docs: [
        "Check if a position is at profit bound"
      ],
      discriminator: [
        242,
        173,
        27,
        80,
        189,
        52,
        119,
        168
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "oracle",
          docs: [
            "Oracle for current price"
          ]
        },
        {
          name: "keeper",
          docs: [
            "Keeper"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "position_margin",
          type: "u64"
        },
        {
          name: "position_size",
          type: "u64"
        },
        {
          name: "entry_price",
          type: "u64"
        },
        {
          name: "is_long",
          type: "bool"
        },
        {
          name: "current_price",
          type: "u64"
        }
      ],
      returns: "bool"
    },
    {
      name: "close_pending_operation",
      docs: [
        "Close pending operation after all nullifiers and commitments created or expired"
      ],
      discriminator: [
        251,
        131,
        94,
        64,
        37,
        41,
        43,
        157
      ],
      accounts: [
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (receives rent back)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "create_ballot",
      docs: [
        "Create a voting ballot",
        "",
        "Initializes a new ballot with the specified configuration.",
        "Supports Snapshot (tokens liquid) and SpendToVote (tokens locked) modes.",
        "For SpendToVote mode, creates a token vault."
      ],
      discriminator: [
        143,
        185,
        213,
        35,
        169,
        149,
        14,
        28
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot account to create"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "token_mint",
          docs: [
            "Token mint for voting power"
          ]
        },
        {
          name: "ballot_vault",
          docs: [
            "Token vault for SpendToVote mode (optional, only needed for SpendToVote)",
            "Must be a PDA owned by this program"
          ],
          writable: true,
          optional: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Authority who creates and can manage the ballot"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "config",
          type: {
            defined: {
              name: "BallotConfigInput"
            }
          }
        }
      ]
    },
    {
      name: "create_commitment",
      docs: [
        "Create a commitment for a pending operation",
        "",
        "This is a generic instruction that can be used by any multi-phase operation",
        "to create commitments one at a time. Each call creates ONE commitment to stay",
        "within transaction size limits.",
        "",
        "IMPORTANT: All nullifiers must be created before any commitments."
      ],
      discriminator: [
        232,
        31,
        118,
        65,
        229,
        2,
        2,
        170
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool for this commitment"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "commitment_counter",
          docs: [
            "Commitment counter for the pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must be same as operation creator)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "commitment_index",
          type: "u8"
        },
        {
          name: "stealth_ephemeral_pubkey",
          type: {
            array: [
              "u8",
              64
            ]
          }
        },
        {
          name: "encrypted_note",
          type: "bytes"
        },
        {
          name: "light_params",
          type: {
            defined: {
              name: "LightCreateCommitmentParams"
            }
          }
        }
      ]
    },
    {
      name: "create_nullifier",
      docs: [
        "Create a nullifier for a pending operation",
        "",
        "This is a generic instruction that can be used by any multi-phase operation",
        "to create nullifiers one at a time. Each call creates ONE nullifier to stay",
        "within transaction size limits.",
        "",
        "Must be called after the operation's Phase 1 (e.g., add_liquidity) and before",
        "any commitments can be created."
      ],
      discriminator: [
        171,
        144,
        50,
        154,
        87,
        170,
        57,
        66
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool for this nullifier"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must be same as operation creator)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier_index",
          type: "u8"
        },
        {
          name: "light_params",
          type: {
            defined: {
              name: "LightCreateNullifierParams"
            }
          }
        }
      ]
    },
    {
      name: "create_nullifier_and_pending",
      docs: [
        "Create Nullifier and Pending Operation Phase 2 (GENERIC)",
        "",
        "CRITICAL POINT: After this, nullifier exists and outputs MUST be created.",
        "Works for ALL operations: transfer, swap, add/remove liquidity, market.",
        "",
        "Phase 2: Create nullifier from pending operation (APPEND PATTERN)",
        "",
        "SECURITY: Reads nullifier from PendingOperation (created in Phase 0).",
        "This prevents nullifier swap attacks - attacker cannot substitute a different nullifier.",
        "",
        "For multi-input operations (add_liquidity), call this instruction multiple times:",
        "- First call with nullifier_index=0 for input A",
        "- Second call with nullifier_index=1 for input B"
      ],
      discriminator: [
        72,
        148,
        152,
        177,
        52,
        246,
        217,
        202
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool for this nullifier"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)",
            "Note: commitment_verified and nullifier_created constraints removed - now checked per-input via bitmask in function"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for nullifier creation, must match pending operation)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier_index",
          type: "u8"
        },
        {
          name: "light_params",
          type: {
            defined: {
              name: "LightCreateNullifierAndPendingParams"
            }
          }
        }
      ]
    },
    {
      name: "create_order",
      docs: [
        "Create a limit order"
      ],
      discriminator: [
        141,
        54,
        37,
        207,
        237,
        210,
        250,
        215
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool for the offer token (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "commitment_counter",
          docs: [
            "Commitment counter for this pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "order",
          docs: [
            "Order account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                kind: "arg",
                path: "order_id"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key (boxed to reduce stack usage)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Payer (pays for compressed account creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "order_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "escrow_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "terms_hash",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "expiry",
          type: "i64"
        },
        {
          name: "encrypted_escrow",
          type: "bytes"
        },
        {
          name: "light_params",
          type: {
            option: {
              defined: {
                name: "LightOrderParams"
              }
            }
          }
        }
      ]
    },
    {
      name: "create_pending_with_proof",
      docs: [
        "Create Pending with Proof Phase 0 - verify ZK proof and create PendingOperation (Transfer-specific)",
        "",
        "Append Pattern multi-phase operation flow:",
        "Phase 0 (this): Verify ZK proof + Create PendingOperation (binds all phases)",
        "Phase 1: Verify commitment exists (GENERIC, binds to Phase 0)",
        "Phase 2: Create nullifier (GENERIC, binds to Phase 0)",
        "Phase 3: Process unshield (operation-specific)",
        "Phase 4+: Create commitments (GENERIC)",
        "Final: Close pending operation (GENERIC)",
        "",
        "SECURITY: ZK proof verified, binding fields stored in PendingOperation.",
        "Fee amount is a public input verified in the ZK proof."
      ],
      discriminator: [
        115,
        102,
        69,
        37,
        52,
        183,
        212,
        240
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "input_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "out_commitments",
          type: {
            vec: {
              array: [
                "u8",
                32
              ]
            }
          }
        },
        {
          name: "output_recipients",
          type: {
            vec: {
              array: [
                "u8",
                32
              ]
            }
          }
        },
        {
          name: "output_amounts",
          type: {
            vec: "u64"
          }
        },
        {
          name: "output_randomness",
          type: {
            vec: {
              array: [
                "u8",
                32
              ]
            }
          }
        },
        {
          name: "stealth_ephemeral_pubkeys",
          type: {
            vec: {
              array: [
                "u8",
                64
              ]
            }
          }
        },
        {
          name: "transfer_amount",
          type: "u64"
        },
        {
          name: "unshield_amount",
          type: "u64"
        },
        {
          name: "fee_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "create_pending_with_proof_add_liquidity",
      docs: [
        "Create Pending with Proof Phase 0 - Add Liquidity (Append Pattern)",
        "",
        "Flow:",
        "Phase 0 (this): Verify ZK proof + Create PendingOperation",
        "Phase 1a: verify_commitment_exists(index=0) for deposit A",
        "Phase 1b: verify_commitment_exists(index=1) for deposit B",
        "Phase 2a: create_nullifier_and_pending(index=0) for deposit A",
        "Phase 2b: create_nullifier_and_pending(index=1) for deposit B",
        "Phase 3: execute_add_liquidity to update AMM state",
        "Phase 4+: create_commitment for LP token and change outputs",
        "Final: close_pending_operation"
      ],
      discriminator: [
        65,
        218,
        153,
        125,
        62,
        172,
        209,
        39
      ],
      accounts: [
        {
          name: "pool_a",
          docs: [
            "Token A pool (for deposit A)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool_a.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pool_b",
          docs: [
            "Token B pool (for deposit B)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool_b.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "lp_pool",
          docs: [
            "LP token pool (where LP tokens are minted to)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "lp_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "amm_pool",
          docs: [
            "AMM pool state"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "amm_pool.token_a_mint",
                account: "AmmPool"
              },
              {
                kind: "account",
                path: "amm_pool.token_b_mint",
                account: "AmmPool"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the add liquidity circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "input_commitment_a",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "input_commitment_b",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier_a",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier_b",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "lp_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "change_a_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "change_b_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "deposit_a",
          type: "u64"
        },
        {
          name: "deposit_b",
          type: "u64"
        },
        {
          name: "lp_amount",
          type: "u64"
        },
        {
          name: "min_lp_amount",
          type: "u64"
        },
        {
          name: "num_commitments",
          type: "u8"
        }
      ]
    },
    {
      name: "create_pending_with_proof_add_perps_liquidity",
      docs: [
        "Create Pending with Proof Phase 0 - Add Perps Liquidity"
      ],
      discriminator: [
        45,
        13,
        145,
        184,
        173,
        121,
        130,
        145
      ],
      accounts: [
        {
          name: "deposit_pool",
          docs: [
            "Deposit token pool (where the token commitment is spent from)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "deposit_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "lp_pool",
          docs: [
            "LP token pool (where LP token commitment will be created)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "lp_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the add perps liquidity circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "input_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "lp_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "token_index",
          type: "u8"
        },
        {
          name: "deposit_amount",
          type: "u64"
        },
        {
          name: "lp_amount_minted",
          type: "u64"
        },
        {
          name: "fee_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "create_pending_with_proof_change_vote_snapshot",
      docs: [
        "Create Pending with Proof - Change Vote Snapshot (Phase 0)",
        "",
        "Atomic vote change: nullifies old vote_commitment and creates new one."
      ],
      discriminator: [
        184,
        170,
        141,
        161,
        120,
        153,
        54,
        35
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot being voted on"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for change_vote_snapshot circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "const",
                value: [
                  99,
                  104,
                  97,
                  110,
                  103,
                  101,
                  95,
                  118,
                  111,
                  116,
                  101,
                  95,
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95
                ]
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation account (created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer executing the transaction"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "old_vote_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "old_vote_commitment_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "new_vote_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "vote_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "old_vote_choice",
          type: "u64"
        },
        {
          name: "new_vote_choice",
          type: "u64"
        },
        {
          name: "weight",
          type: "u64"
        },
        {
          name: "old_encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "new_encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "output_randomness",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "create_pending_with_proof_change_vote_spend",
      docs: [
        "Create Pending with Proof - Change Vote Spend (Phase 0)",
        "",
        "SpendToVote mode: Atomic vote change (old position -> new position)."
      ],
      discriminator: [
        116,
        105,
        71,
        15,
        101,
        194,
        230,
        208
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot being voted on"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pool",
          docs: [
            "Token pool (for verification reference)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "ballot.token_mint",
                account: "Ballot"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for change_vote_spend circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "const",
                value: [
                  99,
                  104,
                  97,
                  110,
                  103,
                  101,
                  95,
                  118,
                  111,
                  116,
                  101,
                  95,
                  115,
                  112,
                  101,
                  110,
                  100,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95
                ]
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation account (created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer executing the transaction"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "old_position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "old_position_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "new_position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "old_vote_choice",
          type: "u64"
        },
        {
          name: "new_vote_choice",
          type: "u64"
        },
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "weight",
          type: "u64"
        },
        {
          name: "old_encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "new_encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "output_randomness",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "create_pending_with_proof_claim",
      docs: [
        "Create Pending with Proof - Claim (Phase 0)",
        "",
        "Allows winners to claim their payout."
      ],
      discriminator: [
        113,
        180,
        7,
        31,
        252,
        1,
        205,
        4
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot (must be resolved)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for claim circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "const",
                value: [
                  99,
                  108,
                  97,
                  105,
                  109,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95
                ]
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation account (created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer executing the transaction"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "payout_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "user_vote_choice",
          type: "u64"
        },
        {
          name: "user_weight",
          type: "u64"
        },
        {
          name: "gross_payout",
          type: "u64"
        },
        {
          name: "net_payout",
          type: "u64"
        },
        {
          name: "output_randomness",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "create_pending_with_proof_close_position",
      docs: [
        "Create Pending with Proof Phase 0 - Close Position"
      ],
      discriminator: [
        18,
        208,
        74,
        198,
        104,
        122,
        129,
        21
      ],
      accounts: [
        {
          name: "position_pool",
          docs: [
            "Position pool (where position commitment is read from)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "position_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "settlement_pool",
          docs: [
            "Settlement token pool (where settlement commitment goes)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "settlement_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market being traded"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the close position circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "settlement_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "is_long",
          type: "bool"
        },
        {
          name: "exit_price",
          type: "u64"
        },
        {
          name: "close_fee",
          type: "u64"
        },
        {
          name: "pnl_amount",
          type: "u64"
        },
        {
          name: "is_profit",
          type: "bool"
        }
      ]
    },
    {
      name: "create_pending_with_proof_close_vote_position",
      docs: [
        "Create Pending with Proof - Close Position (Phase 0)",
        "",
        "Allows closing position during voting to change vote or exit."
      ],
      discriminator: [
        43,
        87,
        195,
        136,
        171,
        106,
        175,
        37
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot (position is being closed)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for close_position circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "const",
                value: [
                  99,
                  108,
                  111,
                  115,
                  101,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95
                ]
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation account (created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer executing the transaction"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "token_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "vote_choice",
          type: "u64"
        },
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "weight",
          type: "u64"
        },
        {
          name: "encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "output_randomness",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "create_pending_with_proof_consolidation",
      docs: [
        "Create Pending with Proof Phase 0 - Consolidation (Append Pattern)",
        "",
        "Consolidates up to 3 notes into 1 using the consolidate_3x1 circuit.",
        "This is a FREE operation (no protocol fee) - just reorganizing user's own notes.",
        "",
        "Flow:",
        "Phase 0 (this): Verify ZK consolidation proof + Create PendingOperation",
        "Phase 1: verify_commitment_exists for each input (1-3 times)",
        "Phase 2: create_nullifier_and_pending for each input (1-3 times)",
        "Phase 3: (skipped - no unshield for consolidation)",
        "Phase 4: create_commitment for single output",
        "Final: close_pending_operation"
      ],
      discriminator: [
        59,
        97,
        237,
        177,
        118,
        164,
        58,
        81
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the consolidate_3x1 circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "num_inputs",
          type: "u8"
        },
        {
          name: "input_commitments",
          type: {
            vec: {
              array: [
                "u8",
                32
              ]
            }
          }
        },
        {
          name: "nullifiers",
          type: {
            vec: {
              array: [
                "u8",
                32
              ]
            }
          }
        },
        {
          name: "out_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "output_recipient",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "output_amount",
          type: "u64"
        },
        {
          name: "output_randomness",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "stealth_ephemeral_pubkey",
          type: {
            array: [
              "u8",
              64
            ]
          }
        }
      ]
    },
    {
      name: "create_pending_with_proof_liquidate",
      docs: [
        "Create Pending with Proof Phase 0 - Liquidate"
      ],
      discriminator: [
        114,
        140,
        105,
        161,
        93,
        58,
        197,
        244
      ],
      accounts: [
        {
          name: "settlement_pool",
          docs: [
            "Settlement pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "settlement_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for liquidate circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "keeper",
          docs: [
            "Keeper (initiates liquidation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "owner_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "liquidator_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "current_price",
          type: "u64"
        },
        {
          name: "liquidator_reward",
          type: "u64"
        },
        {
          name: "owner_remainder",
          type: "u64"
        }
      ]
    },
    {
      name: "create_pending_with_proof_open_position",
      docs: [
        "Create Pending with Proof Phase 0 - Open Position",
        "",
        "Flow:",
        "Phase 0 (this): Verify ZK proof + Create PendingOperation",
        "Phase 1: verify_commitment_exists for margin",
        "Phase 2: create_nullifier_and_pending for margin",
        "Phase 3: execute_open_position to lock tokens",
        "Phase 4: create_commitment for position",
        "Final: close_pending_operation"
      ],
      discriminator: [
        226,
        174,
        223,
        251,
        81,
        153,
        185,
        125
      ],
      accounts: [
        {
          name: "margin_pool",
          docs: [
            "Margin token pool (where the margin commitment is spent from)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "margin_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "position_pool",
          docs: [
            "Position pool (where position commitments are stored)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "position_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market being traded"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the open position circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "input_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "change_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "is_long",
          type: "bool"
        },
        {
          name: "margin_amount",
          type: "u64"
        },
        {
          name: "leverage",
          type: "u8"
        },
        {
          name: "position_fee",
          type: "u64"
        },
        {
          name: "change_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "create_pending_with_proof_remove_liquidity",
      docs: [
        "Create Pending with Proof Phase 0 - Remove Liquidity (Append Pattern)",
        "",
        "Flow:",
        "Phase 0 (this): Verify ZK proof + Create PendingOperation",
        "Phase 1: verify_commitment_exists for LP input",
        "Phase 2: create_nullifier_and_pending for LP input",
        "Phase 3: execute_remove_liquidity to update AMM state",
        "Phase 4+: create_commitment for token outputs",
        "Final: close_pending_operation"
      ],
      discriminator: [
        60,
        19,
        211,
        251,
        49,
        5,
        103,
        176
      ],
      accounts: [
        {
          name: "lp_pool",
          docs: [
            "LP token pool (where LP tokens are burned from)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "lp_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pool_a",
          docs: [
            "Token A pool (where output A goes)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool_a.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pool_b",
          docs: [
            "Token B pool (where output B goes)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool_b.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "amm_pool",
          docs: [
            "AMM pool state"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "amm_pool.token_a_mint",
                account: "AmmPool"
              },
              {
                kind: "account",
                path: "amm_pool.token_b_mint",
                account: "AmmPool"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the remove liquidity circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "lp_input_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "lp_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "out_a_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "out_b_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "old_state_hash",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "new_state_hash",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "lp_amount_burned",
          type: "u64"
        },
        {
          name: "withdraw_a_amount",
          type: "u64"
        },
        {
          name: "withdraw_b_amount",
          type: "u64"
        },
        {
          name: "num_commitments",
          type: "u8"
        }
      ]
    },
    {
      name: "create_pending_with_proof_remove_perps_liquidity",
      docs: [
        "Create Pending with Proof Phase 0 - Remove Perps Liquidity"
      ],
      discriminator: [
        122,
        52,
        28,
        5,
        51,
        176,
        82,
        219
      ],
      accounts: [
        {
          name: "withdrawal_pool",
          docs: [
            "Withdrawal token pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "withdrawal_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "lp_pool",
          docs: [
            "LP token pool (for LP input and change commitments)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "lp_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the remove perps liquidity circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "lp_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "lp_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "out_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "change_lp_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "token_index",
          type: "u8"
        },
        {
          name: "withdraw_amount",
          type: "u64"
        },
        {
          name: "lp_amount_burned",
          type: "u64"
        },
        {
          name: "fee_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "create_pending_with_proof_swap",
      docs: [
        "Create Pending with Proof Phase 0 - Swap (Append Pattern)",
        "",
        "Flow:",
        "Phase 0 (this): Verify ZK proof + Create PendingOperation",
        "Phase 1: verify_commitment_exists for input",
        "Phase 2: create_nullifier_and_pending for input",
        "Phase 3: execute_swap to update AMM state",
        "Phase 4+: create_commitment for outputs",
        "Final: close_pending_operation"
      ],
      discriminator: [
        250,
        231,
        89,
        171,
        94,
        41,
        47,
        245
      ],
      accounts: [
        {
          name: "input_pool",
          docs: [
            "Input token pool (where the input commitment is spent from)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "input_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "output_pool",
          docs: [
            "Output token pool (where the swapped tokens go)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "output_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "amm_pool",
          docs: [
            "AMM pool state"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "amm_pool.token_a_mint",
                account: "AmmPool"
              },
              {
                kind: "account",
                path: "amm_pool.token_b_mint",
                account: "AmmPool"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the swap circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for PDA creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "input_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "out_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "change_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "min_output",
          type: "u64"
        },
        {
          name: "swap_amount",
          type: "u64"
        },
        {
          name: "output_amount",
          type: "u64"
        },
        {
          name: "swap_a_to_b",
          type: "bool"
        },
        {
          name: "num_commitments",
          type: "u8"
        }
      ]
    },
    {
      name: "create_pending_with_proof_vote_snapshot",
      docs: [
        "Create Pending with Proof - Vote Snapshot (Phase 0)",
        "",
        "Verifies ZK proof for snapshot voting and creates PendingOperation.",
        "User proves ownership of shielded note WITHOUT spending it."
      ],
      discriminator: [
        154,
        186,
        239,
        245,
        157,
        252,
        209,
        213
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot being voted on"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for vote_snapshot circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "const",
                value: [
                  118,
                  111,
                  116,
                  101,
                  95,
                  115,
                  110,
                  97,
                  112,
                  115,
                  104,
                  111,
                  116,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95
                ]
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation account (created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer executing the transaction"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "snapshot_merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "note_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "vote_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "vote_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "vote_choice",
          type: "u64"
        },
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "weight",
          type: "u64"
        },
        {
          name: "encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "encrypted_preimage",
          type: {
            option: "bytes"
          }
        },
        {
          name: "output_randomness",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "create_pending_with_proof_vote_spend",
      docs: [
        "Create Pending with Proof - Vote Spend (Phase 0)",
        "",
        "SpendToVote mode: Locks tokens in ballot vault."
      ],
      discriminator: [
        121,
        101,
        52,
        45,
        181,
        24,
        248,
        55
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot being voted on"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pool",
          docs: [
            "Token pool (for note verification)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "ballot.token_mint",
                account: "Ballot"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for vote_spend circuit"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "const",
                value: [
                  118,
                  111,
                  116,
                  101,
                  95,
                  115,
                  112,
                  101,
                  110,
                  100,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95,
                  95
                ]
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation account (created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer executing the transaction"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "input_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "spending_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "vote_choice",
          type: "u64"
        },
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "weight",
          type: "u64"
        },
        {
          name: "encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "encrypted_preimage",
          type: {
            option: "bytes"
          }
        },
        {
          name: "output_randomness",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "create_vote_commitment",
      docs: [
        "Create Vote Commitment (Phase 3)",
        "",
        "Creates the vote_commitment via Light Protocol.",
        "Uses ballot_id for commitment address derivation."
      ],
      discriminator: [
        165,
        146,
        239,
        8,
        166,
        54,
        3,
        188
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot for this vote"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for commitment creation, must match pending operation)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "commitment_index",
          type: "u8"
        },
        {
          name: "encrypted_preimage",
          type: {
            array: [
              "u8",
              128
            ]
          }
        },
        {
          name: "encryption_type",
          type: "u8"
        },
        {
          name: "light_params",
          type: {
            defined: {
              name: "LightCreateVoteCommitmentParams"
            }
          }
        }
      ]
    },
    {
      name: "create_vote_nullifier",
      docs: [
        "Create Vote Nullifier (Phase 1)",
        "",
        "Creates the vote_nullifier via Light Protocol.",
        "Uses action_nullifier with ballot_id as aggregation_id."
      ],
      discriminator: [
        33,
        125,
        29,
        9,
        192,
        226,
        105,
        173
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot for this vote"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for nullifier creation, must match pending operation)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier_index",
          type: "u8"
        },
        {
          name: "light_params",
          type: {
            defined: {
              name: "LightCreateVoteNullifierParams"
            }
          }
        }
      ]
    },
    {
      name: "decrypt_tally",
      docs: [
        "Decrypt voting tally",
        "",
        "Called after timelock expires for TimeLocked and PermanentPrivate modes.",
        "Decrypts the homomorphic tally to reveal aggregate vote counts.",
        "For PermanentPrivate mode, this reveals ONLY aggregates, not individual votes."
      ],
      discriminator: [
        35,
        58,
        172,
        153,
        3,
        216,
        134,
        230
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot to decrypt"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "caller",
          docs: [
            "Anyone can call decrypt_tally after timelock expires",
            "The decryption key itself proves authorization"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "decryption_key",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "decrypted_weights",
          type: {
            vec: "u64"
          }
        }
      ]
    },
    {
      name: "disable_adapt_module",
      docs: [
        "Disable an adapter module"
      ],
      discriminator: [
        226,
        114,
        232,
        9,
        230,
        15,
        68,
        225
      ],
      accounts: [
        {
          name: "adapt_module",
          docs: [
            "Adapter module"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  100,
                  97,
                  112,
                  116
                ]
              },
              {
                kind: "account",
                path: "adapt_module.program_id",
                account: "AdaptModule"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Authority"
          ],
          signer: true,
          relations: [
            "adapt_module"
          ]
        }
      ],
      args: []
    },
    {
      name: "emit_perps_profit_bound_event",
      docs: [
        "Emit profit bound event for keeper detection"
      ],
      discriminator: [
        161,
        213,
        122,
        121,
        146,
        211,
        120,
        106
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "keeper",
          docs: [
            "Keeper"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "position_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "margin",
          type: "u64"
        },
        {
          name: "pnl",
          type: "u64"
        },
        {
          name: "current_price",
          type: "u64"
        }
      ]
    },
    {
      name: "execute_add_liquidity",
      docs: [
        "Execute Add Liquidity Phase 3 - Update AMM state (Append Pattern)",
        "",
        "Must be called after verify_commitment_exists and create_nullifier_and_pending for both deposits.",
        "Updates AMM pool reserves and LP supply based on verified liquidity addition."
      ],
      discriminator: [
        31,
        200,
        193,
        210,
        136,
        205,
        216,
        24
      ],
      accounts: [
        {
          name: "pool_a",
          docs: [
            "Token A pool (for reference)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool_a.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pool_b",
          docs: [
            "Token B pool (for reference)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool_b.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "lp_pool",
          docs: [
            "LP token pool (for reference)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "lp_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "amm_pool",
          docs: [
            "AMM pool state (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "amm_pool.token_a_mint",
                account: "AmmPool"
              },
              {
                kind: "account",
                path: "amm_pool.token_b_mint",
                account: "AmmPool"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "min_lp_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "execute_add_perps_liquidity",
      docs: [
        "Execute Add Perps Liquidity Phase 3"
      ],
      discriminator: [
        207,
        85,
        131,
        134,
        222,
        254,
        248,
        203
      ],
      accounts: [
        {
          name: "deposit_pool",
          docs: [
            "Deposit token pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "deposit_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint (for minting LP tokens)"
          ],
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "Token vault for the deposited token"
          ],
          writable: true
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        },
        {
          name: "price_update",
          docs: [
            "Pyth price update account for the deposit token"
          ]
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "oracle_prices",
          type: {
            array: [
              "u64",
              8
            ]
          }
        }
      ]
    },
    {
      name: "execute_change_vote_snapshot",
      docs: [
        "Execute Change Vote Snapshot (Phase 3)",
        "",
        "Updates ballot tally for vote change: decrements old, increments new."
      ],
      discriminator: [
        36,
        232,
        114,
        236,
        99,
        218,
        182,
        195
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot being voted on (mutable for tally update)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation (must have proof verified, input verified, nullifier created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "old_encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "new_encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        }
      ]
    },
    {
      name: "execute_change_vote_spend",
      docs: [
        "Execute Change Vote Spend (Phase 3)",
        "",
        "Updates ballot tally for SpendToVote vote change: decrements old, increments new."
      ],
      discriminator: [
        207,
        176,
        177,
        79,
        110,
        184,
        148,
        190
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot being voted on (mutable for tally update)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation (must have proof verified, input verified, nullifier created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "old_encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        },
        {
          name: "new_encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        }
      ]
    },
    {
      name: "execute_claim",
      docs: [
        "Execute Claim (Phase 3)",
        "",
        "Transfers payout from ballot vault."
      ],
      discriminator: [
        186,
        104,
        236,
        95,
        252,
        189,
        167,
        99
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot (must be resolved)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "ballot_vault",
          docs: [
            "Ballot vault (source of payout)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "protocol_treasury",
          docs: [
            "Protocol treasury (receives fee)"
          ],
          writable: true
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "execute_close_position",
      docs: [
        "Execute Close Position Phase 3"
      ],
      discriminator: [
        196,
        191,
        155,
        142,
        229,
        185,
        92,
        229
      ],
      accounts: [
        {
          name: "settlement_pool",
          docs: [
            "Settlement token pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "settlement_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market being traded (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        },
        {
          name: "price_update",
          docs: [
            "Pyth price update account for the base token"
          ]
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_margin",
          type: "u64"
        },
        {
          name: "position_size",
          type: "u64"
        },
        {
          name: "entry_price",
          type: "u64"
        }
      ]
    },
    {
      name: "execute_close_vote_position",
      docs: [
        "Execute Close Vote Position (Phase 3)",
        "",
        "Decrements ballot tally and releases tokens."
      ],
      discriminator: [
        249,
        60,
        175,
        202,
        45,
        50,
        135,
        168
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot (position is being closed)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        }
      ]
    },
    {
      name: "execute_liquidate",
      docs: [
        "Execute Liquidate Phase 3"
      ],
      discriminator: [
        153,
        46,
        46,
        219,
        247,
        2,
        99,
        232
      ],
      accounts: [
        {
          name: "settlement_pool",
          docs: [
            "Settlement pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "settlement_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "keeper",
          docs: [
            "Keeper"
          ],
          signer: true
        },
        {
          name: "oracle",
          docs: [
            "Oracle"
          ]
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "position_margin",
          type: "u64"
        },
        {
          name: "position_size",
          type: "u64"
        },
        {
          name: "is_long",
          type: "bool"
        }
      ]
    },
    {
      name: "execute_open_position",
      docs: [
        "Execute Open Position Phase 3"
      ],
      discriminator: [
        240,
        148,
        192,
        97,
        135,
        229,
        49,
        244
      ],
      accounts: [
        {
          name: "margin_pool",
          docs: [
            "Margin token pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "margin_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market being traded (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        },
        {
          name: "price_update",
          docs: [
            "Pyth price update account for the base token"
          ]
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "entry_price",
          type: "u64"
        }
      ]
    },
    {
      name: "execute_remove_liquidity",
      docs: [
        "Execute Remove Liquidity Phase 3 - Update AMM state (Append Pattern)",
        "",
        "Must be called after verify_commitment_exists and create_nullifier_and_pending.",
        "Updates AMM pool reserves and LP supply based on verified liquidity removal."
      ],
      discriminator: [
        21,
        226,
        243,
        31,
        221,
        192,
        31,
        201
      ],
      accounts: [
        {
          name: "lp_pool",
          docs: [
            "LP token pool (for reference)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "lp_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pool_a",
          docs: [
            "Token A pool (authority for vault_a transfers)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool_a.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pool_b",
          docs: [
            "Token B pool (authority for vault_b transfers)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool_b.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "amm_pool",
          docs: [
            "AMM pool state (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "amm_pool.token_a_mint",
                account: "AmmPool"
              },
              {
                kind: "account",
                path: "amm_pool.token_b_mint",
                account: "AmmPool"
              }
            ]
          }
        },
        {
          name: "vault_a",
          docs: [
            "Token A vault (source for protocol fee transfer)"
          ],
          writable: true
        },
        {
          name: "vault_b",
          docs: [
            "Token B vault (source for protocol fee transfer)"
          ],
          writable: true
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        },
        {
          name: "protocol_config",
          docs: [
            "Protocol config (required - enforces fee collection)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          name: "treasury_ata_a",
          docs: [
            "Treasury token account for token A (receives protocol fees)"
          ],
          writable: true,
          optional: true
        },
        {
          name: "treasury_ata_b",
          docs: [
            "Treasury token account for token B (receives protocol fees)"
          ],
          writable: true,
          optional: true
        },
        {
          name: "token_program",
          docs: [
            "Token program for transfers"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "new_state_hash",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "execute_remove_perps_liquidity",
      docs: [
        "Execute Remove Perps Liquidity Phase 3"
      ],
      discriminator: [
        46,
        31,
        102,
        209,
        147,
        205,
        196,
        29
      ],
      accounts: [
        {
          name: "withdrawal_pool",
          docs: [
            "Withdrawal token pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "withdrawal_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "perps_pool",
          docs: [
            "Perps pool (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint (for burning LP tokens)"
          ],
          writable: true
        },
        {
          name: "token_vault",
          docs: [
            "Token vault for the withdrawal token"
          ],
          writable: true
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        },
        {
          name: "price_update",
          docs: [
            "Pyth price update account for the withdrawal token"
          ]
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "oracle_prices",
          type: {
            array: [
              "u64",
              8
            ]
          }
        }
      ]
    },
    {
      name: "execute_swap",
      docs: [
        "Execute Swap Phase 3 - Update AMM state (Append Pattern)",
        "",
        "Must be called after verify_commitment_exists and create_nullifier_and_pending.",
        "Updates AMM pool reserves based on verified swap."
      ],
      discriminator: [
        56,
        182,
        124,
        215,
        155,
        140,
        157,
        102
      ],
      accounts: [
        {
          name: "input_pool",
          docs: [
            "Input token pool (has vault for input token)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "input_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "output_pool",
          docs: [
            "Output token pool (for reference)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "output_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "amm_pool",
          docs: [
            "AMM pool state (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "amm_pool.token_a_mint",
                account: "AmmPool"
              },
              {
                kind: "account",
                path: "amm_pool.token_b_mint",
                account: "AmmPool"
              }
            ]
          }
        },
        {
          name: "input_vault",
          docs: [
            "Input token vault (source for protocol fee transfer)"
          ],
          writable: true
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        },
        {
          name: "protocol_config",
          docs: [
            "Protocol config (required - enforces fee collection)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          name: "treasury_ata",
          docs: [
            "Treasury token account (receives protocol fees)",
            "Only required if fees are enabled and fee > 0"
          ],
          writable: true,
          optional: true
        },
        {
          name: "token_program",
          docs: [
            "Token program for transfers"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "execute_vote_snapshot",
      docs: [
        "Execute Vote Snapshot (Phase 2)",
        "",
        "Updates ballot tally based on the verified vote."
      ],
      discriminator: [
        73,
        17,
        216,
        207,
        210,
        195,
        175,
        54
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot being voted on (mutable for tally update)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation (must have proof verified and nullifier created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        }
      ]
    },
    {
      name: "execute_vote_spend",
      docs: [
        "Execute Vote Spend (Phase 3)",
        "",
        "Updates ballot tally and locks tokens."
      ],
      discriminator: [
        17,
        112,
        255,
        194,
        200,
        212,
        19,
        143
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot being voted on (mutable for tally update)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "ballot_vault",
          docs: [
            "Ballot vault (tokens are locked here)",
            "Note: Actual token transfer happens via the shielded pool mechanism",
            "The vault balance is tracked in ballot.pool_balance"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation (must have proof verified, input verified, nullifier created)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "encrypted_contributions",
          type: {
            option: {
              defined: {
                name: "EncryptedContributions"
              }
            }
          }
        }
      ]
    },
    {
      name: "fill_order",
      docs: [
        "Fill an order atomically"
      ],
      discriminator: [
        232,
        122,
        115,
        25,
        199,
        143,
        136,
        162
      ],
      accounts: [
        {
          name: "maker_pool",
          docs: [
            "Maker's offer token pool (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "maker_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "maker_commitment_counter",
          docs: [
            "Commitment counter for maker pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "maker_pool"
              }
            ]
          }
        },
        {
          name: "taker_pool",
          docs: [
            "Taker's payment token pool (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "taker_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "taker_commitment_counter",
          docs: [
            "Commitment counter for taker pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "taker_pool"
              }
            ]
          }
        },
        {
          name: "order",
          docs: [
            "Order being filled"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  111,
                  114,
                  100,
                  101,
                  114
                ]
              },
              {
                kind: "arg",
                path: "order_id"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key (boxed to reduce stack usage)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for compressed account creation)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "maker_proof",
          type: "bytes"
        },
        {
          name: "taker_proof",
          type: "bytes"
        },
        {
          name: "escrow_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "taker_nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "order_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "maker_out_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "taker_out_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "encrypted_notes",
          type: {
            vec: "bytes"
          }
        },
        {
          name: "light_params",
          type: {
            option: {
              defined: {
                name: "LightFillOrderParams"
              }
            }
          }
        }
      ]
    },
    {
      name: "finalize_ballot",
      docs: [
        "Finalize a voting ballot",
        "",
        "Called after claim period expires (SpendToVote only).",
        "Transfers unclaimed tokens from vault to protocol treasury."
      ],
      discriminator: [
        212,
        43,
        85,
        58,
        158,
        34,
        41,
        42
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot to finalize"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "ballot_vault",
          docs: [
            "Ballot vault holding remaining tokens"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "protocol_treasury",
          docs: [
            "Protocol treasury to receive unclaimed tokens"
          ],
          writable: true
        },
        {
          name: "authority",
          docs: [
            "Authority (anyone can call finalize after deadline)"
          ],
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      name: "initialize_amm_pool",
      docs: [
        "Initialize a liquidity pool",
        "",
        "Supports two pool types:",
        "- ConstantProduct (pool_type=0): x * y = k formula, best for volatile pairs",
        "- StableSwap (pool_type=1): Curve-style formula, best for pegged assets",
        "",
        "For StableSwap pools, amplification should be 100-1000 (typical: 200 for stablecoins).",
        "For ConstantProduct pools, amplification is ignored (can pass 0)."
      ],
      discriminator: [
        20,
        58,
        19,
        89,
        14,
        193,
        139,
        31
      ],
      accounts: [
        {
          name: "amm_pool",
          docs: [
            "AMM pool account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "arg",
                path: "token_a_mint"
              },
              {
                kind: "arg",
                path: "token_b_mint"
              }
            ]
          }
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint (PDA derived from token pair)",
            "Using Anchor's init macro ensures simulation works correctly"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "arg",
                path: "token_a_mint"
              },
              {
                kind: "arg",
                path: "token_b_mint"
              }
            ]
          }
        },
        {
          name: "token_a_mint_account",
          docs: [
            "Token A mint"
          ]
        },
        {
          name: "token_b_mint_account",
          docs: [
            "Token B mint"
          ]
        },
        {
          name: "authority",
          docs: [
            "Authority"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "token_a_mint",
          type: "pubkey"
        },
        {
          name: "token_b_mint",
          type: "pubkey"
        },
        {
          name: "fee_bps",
          type: "u16"
        },
        {
          name: "pool_type",
          type: {
            defined: {
              name: "PoolType"
            }
          }
        },
        {
          name: "amplification",
          type: "u64"
        }
      ]
    },
    {
      name: "initialize_commitment_counter",
      docs: [
        "Initialize commitment counter for a pool",
        "",
        "Must be called after initialize_pool to enable commitment tracking."
      ],
      discriminator: [
        158,
        181,
        246,
        128,
        22,
        64,
        90,
        146
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool to initialize counter for"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "commitment_counter",
          docs: [
            "Commitment counter PDA"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "initialize_perps_pool",
      docs: [
        "Initialize a perpetual futures pool",
        "",
        "Creates a multi-token pool with a single LP token.",
        "Tokens are added separately via add_token_to_pool."
      ],
      discriminator: [
        246,
        147,
        238,
        44,
        78,
        181,
        140,
        46
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "arg",
                path: "pool_id"
              }
            ]
          }
        },
        {
          name: "lp_mint",
          docs: [
            "LP token mint (PDA derived from perps pool)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  108,
                  112,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              }
            ]
          }
        },
        {
          name: "position_mint",
          docs: [
            "Position token mint (PDA derived from perps pool, for position commitments)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  115,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Pool authority (admin)"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "rent",
          docs: [
            "Rent sysvar"
          ],
          address: "SysvarRent111111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "pool_id",
          type: "pubkey"
        },
        {
          name: "params",
          type: {
            defined: {
              name: "InitializePerpsPoolParams"
            }
          }
        }
      ]
    },
    {
      name: "initialize_pool",
      docs: [
        "Initialize a new shielded pool for a token"
      ],
      discriminator: [
        95,
        180,
        10,
        172,
        84,
        174,
        232,
        40
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool account to initialize (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "token_mint"
              }
            ]
          }
        },
        {
          name: "token_vault",
          docs: [
            "Token vault PDA"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "token_mint"
              }
            ]
          }
        },
        {
          name: "token_mint",
          docs: [
            "Token mint"
          ]
        },
        {
          name: "authority",
          docs: [
            "Pool authority"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "rent",
          docs: [
            "Rent sysvar"
          ],
          address: "SysvarRent111111111111111111111111111111111"
        }
      ],
      args: []
    },
    {
      name: "initialize_protocol_config",
      docs: [
        "Initialize protocol configuration with fee rates",
        "",
        "Creates the global ProtocolConfig account. Can only be called once.",
        "Fee rates are in basis points. swap_fee_share_bps is protocol's share of LP fees (2000 = 20%)."
      ],
      discriminator: [
        28,
        50,
        43,
        233,
        244,
        98,
        123,
        118
      ],
      accounts: [
        {
          name: "protocol_config",
          docs: [
            "Protocol config account (singleton PDA)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          name: "treasury",
          docs: [
            "Treasury account that will receive fees"
          ]
        },
        {
          name: "authority",
          docs: [
            "Authority that can update config (typically a multisig or governance)"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer for account creation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "transfer_fee_bps",
          type: "u16"
        },
        {
          name: "unshield_fee_bps",
          type: "u16"
        },
        {
          name: "swap_fee_share_bps",
          type: "u16"
        },
        {
          name: "remove_liquidity_fee_bps",
          type: "u16"
        },
        {
          name: "fees_enabled",
          type: "bool"
        }
      ]
    },
    {
      name: "process_unshield",
      docs: [
        "Process Unshield Phase 3 - process unshield only (Transfer-specific)",
        "",
        "Must be called after create_nullifier_and_pending (Phase 2) and before create_commitment (Phase 4+).",
        "This phase has NO Light Protocol CPI calls.",
        "",
        "NOTE: Encrypted notes are NOT stored in PDA (saves ~1680 bytes).",
        "SDK must regenerate encrypted notes in Phase 4 from randomness stored in PendingOperation."
      ],
      discriminator: [
        139,
        41,
        106,
        165,
        62,
        234,
        120,
        132
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "token_vault",
          docs: [
            "Token vault (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "protocol_config",
          docs: [
            "Protocol config (required - enforces fee verification)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          name: "treasury_token_account",
          docs: [
            "Treasury token account for receiving fees (required if fee > 0)"
          ],
          writable: true,
          optional: true
        },
        {
          name: "unshield_recipient",
          docs: [
            "Unshield recipient (optional, boxed to reduce stack usage)"
          ],
          writable: true,
          optional: true
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match operation creator)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "unshield_amount",
          type: "u64"
        }
      ]
    },
    {
      name: "register_adapt_module",
      docs: [
        "Register an adapter module"
      ],
      discriminator: [
        106,
        98,
        19,
        132,
        158,
        99,
        214,
        47
      ],
      accounts: [
        {
          name: "adapt_module",
          docs: [
            "Adapter module account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  100,
                  97,
                  112,
                  116
                ]
              },
              {
                kind: "account",
                path: "adapter_program"
              }
            ]
          }
        },
        {
          name: "adapter_program",
          docs: [
            "Adapter program"
          ]
        },
        {
          name: "authority",
          docs: [
            "Authority"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "interface_version",
          type: "u8"
        }
      ]
    },
    {
      name: "register_threshold_committee",
      docs: [
        "Register a threshold committee"
      ],
      discriminator: [
        93,
        46,
        75,
        78,
        68,
        136,
        109,
        217
      ],
      accounts: [
        {
          name: "committee",
          docs: [
            "Committee account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  116,
                  101,
                  101
                ]
              },
              {
                kind: "arg",
                path: "committee_id"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Authority"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "committee_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "members",
          type: {
            vec: "pubkey"
          }
        },
        {
          name: "threshold_pubkey",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "threshold",
          type: "u8"
        }
      ]
    },
    {
      name: "register_verification_key",
      docs: [
        "Register a verification key for a circuit"
      ],
      discriminator: [
        252,
        136,
        235,
        8,
        197,
        79,
        40,
        67
      ],
      accounts: [
        {
          name: "verification_key",
          docs: [
            "Verification key account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "arg",
                path: "circuit_id"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Authority"
          ],
          signer: true
        },
        {
          name: "payer",
          docs: [
            "Payer"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "circuit_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "vk_data",
          type: "bytes"
        }
      ]
    },
    {
      name: "reset_amm_pool",
      docs: [
        "Reset AMM pool state (admin only)",
        "Used to fix corrupted pool state"
      ],
      discriminator: [
        67,
        206,
        131,
        179,
        253,
        87,
        240,
        165
      ],
      accounts: [
        {
          name: "amm_pool",
          docs: [
            "AMM pool to reset"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "amm_pool.token_a_mint",
                account: "AmmPool"
              },
              {
                kind: "account",
                path: "amm_pool.token_b_mint",
                account: "AmmPool"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Pool authority (must match)"
          ],
          signer: true,
          relations: [
            "amm_pool"
          ]
        }
      ],
      args: []
    },
    {
      name: "resolve_ballot",
      docs: [
        "Resolve a voting ballot",
        "",
        "Determines the outcome based on the configured resolution mode:",
        "- TallyBased: Winner = argmax(option_weights[])",
        "- Oracle: Reads outcome from oracle",
        "- Authority: Designated resolver sets outcome"
      ],
      discriminator: [
        67,
        63,
        34,
        133,
        20,
        164,
        64,
        4
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot to resolve"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "resolver",
          docs: [
            "Resolver (required for Authority mode, optional otherwise)",
            "Must match ballot.resolver for Authority mode"
          ],
          signer: true,
          optional: true
        },
        {
          name: "authority",
          docs: [
            "Authority (required for non-Authority modes if resolver not set)"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "outcome",
          type: {
            option: "u8"
          }
        }
      ]
    },
    {
      name: "set_verification_key_data",
      docs: [
        "Set verification key data on an existing account",
        "Used for large VKs that exceed transaction size limits"
      ],
      discriminator: [
        117,
        234,
        100,
        99,
        128,
        32,
        44,
        101
      ],
      accounts: [
        {
          name: "verification_key",
          docs: [
            "Verification key account (must already be initialized)",
            "Realloc to max size to support larger VK updates"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "arg",
                path: "circuit_id"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Authority"
          ],
          signer: true,
          relations: [
            "verification_key"
          ]
        },
        {
          name: "payer",
          docs: [
            "Payer for reallocation"
          ],
          writable: true,
          signer: true
        },
        {
          name: "system_program",
          docs: [
            "System program for reallocation"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "circuit_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "vk_data",
          type: "bytes"
        }
      ]
    },
    {
      name: "shield",
      docs: [
        "Shield tokens - deposit public tokens into the shielded pool",
        "",
        "Uses Light Protocol compressed accounts for commitment storage.",
        "The light_params enable on-chain commitment storage via Light Protocol.",
        "The stealth_ephemeral_pubkey is stored so recipient can derive",
        "the stealth private key for decryption."
      ],
      discriminator: [
        220,
        198,
        253,
        246,
        231,
        84,
        147,
        98
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool to shield into (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "commitment_counter",
          docs: [
            "Commitment counter for this pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "pool"
              }
            ]
          }
        },
        {
          name: "token_vault",
          docs: [
            "Token vault"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "user_token_account",
          docs: [
            "User's token account (source)"
          ],
          writable: true
        },
        {
          name: "user",
          docs: [
            "User (pays for compressed account creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "amount",
          type: "u64"
        },
        {
          name: "stealth_ephemeral_pubkey",
          type: {
            array: [
              "u8",
              64
            ]
          }
        },
        {
          name: "encrypted_note",
          type: "bytes"
        },
        {
          name: "light_params",
          type: {
            option: {
              defined: {
                name: "LightCommitmentParams"
              }
            }
          }
        }
      ]
    },
    {
      name: "store_commitment",
      docs: [
        "Store a commitment as a Light Protocol compressed account",
        "",
        "Called after transact to persist commitments on-chain.",
        "Can be called in separate transactions to avoid size limits."
      ],
      discriminator: [
        188,
        162,
        140,
        134,
        138,
        242,
        159,
        54
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer/submitter (pays for compressed account creation)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "StoreCommitmentParams"
            }
          }
        }
      ]
    },
    {
      name: "test_verify_proof",
      docs: [
        "Test proof verification (development only)",
        "Verifies a proof without pool state checks"
      ],
      discriminator: [
        252,
        208,
        59,
        22,
        178,
        59,
        46,
        253
      ],
      accounts: [
        {
          name: "verification_key",
          docs: [
            "The verification key account"
          ]
        },
        {
          name: "payer",
          docs: [
            "Payer for the transaction"
          ],
          signer: true
        }
      ],
      args: [
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "public_inputs",
          type: {
            vec: {
              array: [
                "u8",
                32
              ]
            }
          }
        }
      ]
    },
    {
      name: "transact",
      docs: [
        "Transact Phase 1 (DEPRECATED) - private transfer with optional unshield",
        "",
        "DEPRECATED: Use the new multi-phase flow instead:",
        "1. verify_proof_for_transact (Phase 0)",
        "2. verify_commitment_for_transact (Phase 1)",
        "3. create_nullifier (Phase 2)",
        "4. process_unshield (Phase 3)",
        "5. create_commitment (Phase 4+)",
        "6. close_pending_operation (Final)",
        "",
        "This old instruction exceeds transaction size limits and should not be used."
      ],
      discriminator: [
        217,
        149,
        130,
        143,
        221,
        52,
        252,
        119
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (created in this instruction)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "token_vault",
          docs: [
            "Token vault"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key for the circuit (boxed to reduce stack usage)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "unshield_recipient",
          docs: [
            "Unshield recipient (optional, can be any account)"
          ],
          writable: true,
          optional: true
        },
        {
          name: "relayer",
          docs: [
            "Relayer/submitter (pays for compressed account creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          name: "system_program",
          docs: [
            "System program"
          ],
          address: "11111111111111111111111111111111"
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "merkle_root",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "input_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "out_commitments",
          type: {
            vec: {
              array: [
                "u8",
                32
              ]
            }
          }
        },
        {
          name: "encrypted_notes",
          type: {
            vec: "bytes"
          }
        },
        {
          name: "unshield_amount",
          type: "u64"
        },
        {
          name: "num_commitments",
          type: "u8"
        },
        {
          name: "light_params",
          type: {
            defined: {
              name: "LightTransactParams"
            }
          }
        }
      ]
    },
    {
      name: "transact_adapt",
      docs: [
        "Transact via adapter - swap through external DEX"
      ],
      discriminator: [
        240,
        109,
        123,
        193,
        132,
        96,
        145,
        122
      ],
      accounts: [
        {
          name: "input_pool",
          docs: [
            "Input token pool (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "input_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "output_pool",
          docs: [
            "Output token pool (boxed to reduce stack usage)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "output_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "output_commitment_counter",
          docs: [
            "Commitment counter for output pool"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  99,
                  111,
                  109,
                  109,
                  105,
                  116,
                  109,
                  101,
                  110,
                  116,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              },
              {
                kind: "account",
                path: "output_pool"
              }
            ]
          }
        },
        {
          name: "input_vault",
          docs: [
            "Input token vault"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "input_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "output_vault",
          docs: [
            "Output token vault"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                kind: "account",
                path: "output_pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "adapt_module",
          docs: [
            "Adapter module"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  97,
                  100,
                  97,
                  112,
                  116
                ]
              },
              {
                kind: "account",
                path: "adapt_module.program_id",
                account: "AdaptModule"
              }
            ]
          }
        },
        {
          name: "verification_key",
          docs: [
            "Verification key (boxed to reduce stack usage)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  118,
                  107
                ]
              },
              {
                kind: "account",
                path: "verification_key.circuit_id",
                account: "VerificationKey"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for compressed account creation)"
          ],
          writable: true,
          signer: true
        },
        {
          name: "token_program",
          docs: [
            "Token program"
          ],
          address: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      args: [
        {
          name: "proof",
          type: "bytes"
        },
        {
          name: "nullifier",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "input_amount",
          type: "u64"
        },
        {
          name: "min_output",
          type: "u64"
        },
        {
          name: "adapt_params",
          type: "bytes"
        },
        {
          name: "out_commitment",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "encrypted_note",
          type: "bytes"
        },
        {
          name: "light_params",
          type: {
            option: {
              defined: {
                name: "LightAdaptParams"
              }
            }
          }
        }
      ]
    },
    {
      name: "update_perps_borrow_fees",
      docs: [
        "Update borrow fee accumulators for all tokens",
        "",
        "Keeper instruction - anyone can call to update fees."
      ],
      discriminator: [
        151,
        120,
        43,
        40,
        162,
        202,
        198,
        242
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool (will be updated)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "keeper",
          docs: [
            "Keeper (anyone can call this)"
          ],
          signer: true
        }
      ],
      args: []
    },
    {
      name: "update_perps_market_status",
      docs: [
        "Update market status"
      ],
      discriminator: [
        135,
        231,
        26,
        105,
        251,
        160,
        241,
        48
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool account (boxed due to large size)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "perps_market",
          docs: [
            "Market account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  109,
                  97,
                  114,
                  107,
                  101,
                  116
                ]
              },
              {
                kind: "account",
                path: "perps_pool"
              },
              {
                kind: "account",
                path: "perps_market.market_id",
                account: "PerpsMarket"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Pool authority"
          ],
          signer: true,
          relations: [
            "perps_pool"
          ]
        }
      ],
      args: [
        {
          name: "is_active",
          type: "bool"
        }
      ]
    },
    {
      name: "update_perps_pool_config",
      docs: [
        "Update perps pool configuration"
      ],
      discriminator: [
        28,
        193,
        134,
        255,
        202,
        194,
        54,
        56
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool account (boxed due to large size)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Pool authority"
          ],
          signer: true,
          relations: [
            "perps_pool"
          ]
        }
      ],
      args: [
        {
          name: "params",
          type: {
            defined: {
              name: "UpdatePoolConfigParams"
            }
          }
        }
      ]
    },
    {
      name: "update_perps_token_status",
      docs: [
        "Update token status in perps pool"
      ],
      discriminator: [
        233,
        63,
        249,
        50,
        165,
        122,
        230,
        98
      ],
      accounts: [
        {
          name: "perps_pool",
          docs: [
            "Perps pool account (boxed due to large size)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  114,
                  112,
                  115,
                  95,
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "perps_pool.pool_id",
                account: "PerpsPool"
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Pool authority"
          ],
          signer: true,
          relations: [
            "perps_pool"
          ]
        }
      ],
      args: [
        {
          name: "token_index",
          type: "u8"
        },
        {
          name: "is_active",
          type: "bool"
        }
      ]
    },
    {
      name: "update_protocol_authority",
      docs: [
        "Transfer protocol authority to a new account",
        "",
        "Only callable by the current authority."
      ],
      discriminator: [
        207,
        19,
        17,
        100,
        133,
        169,
        89,
        253
      ],
      accounts: [
        {
          name: "protocol_config",
          docs: [
            "Protocol config account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          name: "new_authority",
          docs: [
            "New authority"
          ]
        },
        {
          name: "authority",
          docs: [
            "Current authority"
          ],
          signer: true,
          relations: [
            "protocol_config"
          ]
        }
      ],
      args: []
    },
    {
      name: "update_protocol_fees",
      docs: [
        "Update protocol fee rates",
        "",
        "Only callable by the protocol authority. Allows updating individual",
        "fee rates or toggling fees on/off."
      ],
      discriminator: [
        158,
        219,
        253,
        143,
        54,
        45,
        113,
        182
      ],
      accounts: [
        {
          name: "protocol_config",
          docs: [
            "Protocol config account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          name: "authority",
          docs: [
            "Authority that can update fees"
          ],
          signer: true,
          relations: [
            "protocol_config"
          ]
        }
      ],
      args: [
        {
          name: "transfer_fee_bps",
          type: {
            option: "u16"
          }
        },
        {
          name: "unshield_fee_bps",
          type: {
            option: "u16"
          }
        },
        {
          name: "swap_fee_share_bps",
          type: {
            option: "u16"
          }
        },
        {
          name: "remove_liquidity_fee_bps",
          type: {
            option: "u16"
          }
        },
        {
          name: "fees_enabled",
          type: {
            option: "bool"
          }
        }
      ]
    },
    {
      name: "update_treasury",
      docs: [
        "Update protocol treasury address",
        "",
        "Only callable by the protocol authority. Changes where fees are sent."
      ],
      discriminator: [
        60,
        16,
        243,
        66,
        96,
        59,
        254,
        131
      ],
      accounts: [
        {
          name: "protocol_config",
          docs: [
            "Protocol config account"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          name: "new_treasury",
          docs: [
            "New treasury account"
          ]
        },
        {
          name: "authority",
          docs: [
            "Authority that can update treasury"
          ],
          signer: true,
          relations: [
            "protocol_config"
          ]
        }
      ],
      args: []
    },
    {
      name: "verify_commitment_exists",
      docs: [
        "Verify Commitment Exists Phase 1 - verify commitment in Light Protocol state tree (GENERIC)",
        "",
        "SECURITY CRITICAL: This prevents spending non-existent commitments.",
        "Works for ALL spend operations: transfer, swap, remove liquidity, market operations.",
        "",
        "This phase uses Light Protocol CPI with inclusion proof (~8 Light accounts).",
        "NO state changes - if fails, no cleanup needed.",
        "",
        "For multi-input operations (add_liquidity), call this instruction multiple times:",
        "- First call with commitment_index=0 for input A",
        "- Second call with commitment_index=1 for input B"
      ],
      discriminator: [
        126,
        11,
        155,
        178,
        177,
        176,
        157,
        136
      ],
      accounts: [
        {
          name: "pool",
          docs: [
            "Pool"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  111,
                  111,
                  108
                ]
              },
              {
                kind: "account",
                path: "pool.token_mint",
                account: "Pool"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)",
            "Note: commitment_verified constraint removed - now checked per-input via bitmask in function"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (pays for Light Protocol CPI, must match pending operation)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "commitment_index",
          type: "u8"
        },
        {
          name: "light_params",
          type: {
            defined: {
              name: "LightVerifyCommitmentParams"
            }
          }
        }
      ]
    },
    {
      name: "verify_vote_commitment_exists",
      docs: [
        "Verify Vote Commitment Exists (Phase 1)",
        "",
        "Voting-specific commitment verification for operations that spend existing commitments.",
        "Uses Ballot account instead of Pool account."
      ],
      discriminator: [
        76,
        132,
        220,
        91,
        78,
        223,
        179,
        81
      ],
      accounts: [
        {
          name: "ballot",
          docs: [
            "Ballot (used instead of Pool for voting operations)"
          ],
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  98,
                  97,
                  108,
                  108,
                  111,
                  116
                ]
              },
              {
                kind: "arg",
                path: "ballot_id"
              }
            ]
          }
        },
        {
          name: "pending_operation",
          docs: [
            "Pending operation PDA (from Phase 0)"
          ],
          writable: true,
          pda: {
            seeds: [
              {
                kind: "const",
                value: [
                  112,
                  101,
                  110,
                  100,
                  105,
                  110,
                  103,
                  95,
                  111,
                  112
                ]
              },
              {
                kind: "arg",
                path: "operation_id"
              }
            ]
          }
        },
        {
          name: "relayer",
          docs: [
            "Relayer (must match pending operation)"
          ],
          writable: true,
          signer: true
        }
      ],
      args: [
        {
          name: "operation_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "ballot_id",
          type: {
            array: [
              "u8",
              32
            ]
          }
        },
        {
          name: "commitment_index",
          type: "u8"
        },
        {
          name: "light_params",
          type: {
            defined: {
              name: "LightVerifyVoteCommitmentParams"
            }
          }
        }
      ]
    }
  ],
  accounts: [
    {
      name: "AdaptModule",
      discriminator: [
        104,
        31,
        171,
        41,
        105,
        229,
        28,
        169
      ]
    },
    {
      name: "AmmPool",
      discriminator: [
        54,
        82,
        185,
        138,
        179,
        191,
        211,
        169
      ]
    },
    {
      name: "Ballot",
      discriminator: [
        3,
        232,
        121,
        204,
        232,
        137,
        138,
        164
      ]
    },
    {
      name: "Order",
      discriminator: [
        134,
        173,
        223,
        185,
        77,
        86,
        28,
        51
      ]
    },
    {
      name: "PendingOperation",
      discriminator: [
        124,
        146,
        84,
        123,
        121,
        210,
        217,
        118
      ]
    },
    {
      name: "PerpsMarket",
      discriminator: [
        183,
        30,
        212,
        45,
        203,
        82,
        36,
        185
      ]
    },
    {
      name: "PerpsPool",
      discriminator: [
        144,
        115,
        10,
        89,
        166,
        167,
        55,
        164
      ]
    },
    {
      name: "Pool",
      discriminator: [
        241,
        154,
        109,
        4,
        17,
        177,
        109,
        188
      ]
    },
    {
      name: "PoolCommitmentCounter",
      discriminator: [
        104,
        144,
        242,
        34,
        19,
        153,
        118,
        196
      ]
    },
    {
      name: "PriceUpdateV2",
      discriminator: [
        34,
        241,
        35,
        99,
        157,
        126,
        244,
        205
      ]
    },
    {
      name: "ProtocolConfig",
      discriminator: [
        207,
        91,
        250,
        28,
        152,
        179,
        215,
        209
      ]
    },
    {
      name: "ThresholdCommittee",
      discriminator: [
        28,
        130,
        118,
        105,
        148,
        110,
        97,
        147
      ]
    },
    {
      name: "VerificationKey",
      discriminator: [
        57,
        106,
        137,
        188,
        100,
        187,
        148,
        137
      ]
    }
  ],
  events: [
    {
      name: "ProfitBoundReached",
      discriminator: [
        202,
        251,
        230,
        179,
        158,
        47,
        20,
        242
      ]
    }
  ],
  errors: [
    {
      code: 6e3,
      name: "InvalidProof",
      msg: "Invalid zero-knowledge proof"
    },
    {
      code: 6001,
      name: "ProofVerificationFailed",
      msg: "Proof verification failed"
    },
    {
      code: 6002,
      name: "InvalidPublicInputs",
      msg: "Invalid public inputs for proof"
    },
    {
      code: 6003,
      name: "InvalidMerkleRoot",
      msg: "Merkle root not found in current or historical roots"
    },
    {
      code: 6004,
      name: "TreeFull",
      msg: "Merkle tree is full"
    },
    {
      code: 6005,
      name: "InvalidMerkleProof",
      msg: "Invalid merkle proof"
    },
    {
      code: 6006,
      name: "NullifierAlreadyUsed",
      msg: "Nullifier has already been used"
    },
    {
      code: 6007,
      name: "InvalidNullifier",
      msg: "Invalid nullifier derivation"
    },
    {
      code: 6008,
      name: "InvalidCommitment",
      msg: "Invalid commitment"
    },
    {
      code: 6009,
      name: "CommitmentExists",
      msg: "Commitment already exists"
    },
    {
      code: 6010,
      name: "CommitmentNotFound",
      msg: "Commitment not found in Light Protocol state tree"
    },
    {
      code: 6011,
      name: "CommitmentInclusionFailed",
      msg: "Commitment inclusion proof verification failed"
    },
    {
      code: 6012,
      name: "CommitmentAccountHashMismatch",
      msg: "Commitment account hash does not match derived address"
    },
    {
      code: 6013,
      name: "CommitmentMismatch",
      msg: "Commitment value mismatch"
    },
    {
      code: 6014,
      name: "InsufficientBalance",
      msg: "Insufficient balance"
    },
    {
      code: 6015,
      name: "AmountOverflow",
      msg: "Amount overflow"
    },
    {
      code: 6016,
      name: "InvalidAmount",
      msg: "Invalid amount"
    },
    {
      code: 6017,
      name: "InvalidTokenMint",
      msg: "Invalid token mint"
    },
    {
      code: 6018,
      name: "TokenMintMismatch",
      msg: "Token mint mismatch"
    },
    {
      code: 6019,
      name: "PoolAlreadyInitialized",
      msg: "Pool already initialized"
    },
    {
      code: 6020,
      name: "PoolNotFound",
      msg: "Pool not found"
    },
    {
      code: 6021,
      name: "OrderNotFound",
      msg: "Order not found"
    },
    {
      code: 6022,
      name: "OrderAlreadyFilled",
      msg: "Order already filled"
    },
    {
      code: 6023,
      name: "OrderExpired",
      msg: "Order expired"
    },
    {
      code: 6024,
      name: "OrderNotExpired",
      msg: "Order not expired yet"
    },
    {
      code: 6025,
      name: "InvalidOrderTerms",
      msg: "Invalid order terms"
    },
    {
      code: 6026,
      name: "AmmPoolNotFound",
      msg: "AMM pool not found"
    },
    {
      code: 6027,
      name: "TokensNotInCanonicalOrder",
      msg: "Tokens must be in canonical order (token_a < token_b by bytes)"
    },
    {
      code: 6028,
      name: "SlippageExceeded",
      msg: "Slippage exceeded"
    },
    {
      code: 6029,
      name: "InsufficientLiquidity",
      msg: "Insufficient liquidity"
    },
    {
      code: 6030,
      name: "InvalidPoolState",
      msg: "Invalid pool state transition"
    },
    {
      code: 6031,
      name: "InvariantViolated",
      msg: "Constant product invariant violated"
    },
    {
      code: 6032,
      name: "InvalidLpAmount",
      msg: "Invalid LP token amount - must match calculated amount"
    },
    {
      code: 6033,
      name: "InvalidSwapOutput",
      msg: "Swap output amount does not match AMM formula calculation"
    },
    {
      code: 6034,
      name: "InvalidAmplification",
      msg: "Invalid amplification coefficient for StableSwap pool"
    },
    {
      code: 6035,
      name: "AggregationNotFound",
      msg: "Aggregation not found"
    },
    {
      code: 6036,
      name: "AggregationNotActive",
      msg: "Aggregation not active"
    },
    {
      code: 6037,
      name: "AggregationDeadlinePassed",
      msg: "Aggregation deadline passed"
    },
    {
      code: 6038,
      name: "AlreadyVoted",
      msg: "Already voted on this proposal"
    },
    {
      code: 6039,
      name: "InvalidVoteOption",
      msg: "Invalid vote option"
    },
    {
      code: 6040,
      name: "DecryptionNotComplete",
      msg: "Decryption not complete"
    },
    {
      code: 6041,
      name: "InvalidDecryptionShare",
      msg: "Invalid decryption share"
    },
    {
      code: 6042,
      name: "ThresholdNotMet",
      msg: "Threshold not met"
    },
    {
      code: 6043,
      name: "AdapterNotRegistered",
      msg: "Adapter module not registered"
    },
    {
      code: 6044,
      name: "AdapterDisabled",
      msg: "Adapter module disabled"
    },
    {
      code: 6045,
      name: "AdapterExecutionFailed",
      msg: "Adapter execution failed"
    },
    {
      code: 6046,
      name: "Unauthorized",
      msg: "Unauthorized"
    },
    {
      code: 6047,
      name: "InvalidVerificationKey",
      msg: "Invalid verification key"
    },
    {
      code: 6048,
      name: "VerificationKeyNotFound",
      msg: "Verification key not found"
    },
    {
      code: 6049,
      name: "CommitteeNotFound",
      msg: "Committee not found"
    },
    {
      code: 6050,
      name: "NotCommitteeMember",
      msg: "Not a committee member"
    },
    {
      code: 6051,
      name: "InvalidEncryptedNote",
      msg: "Invalid encrypted note"
    },
    {
      code: 6052,
      name: "DecryptionFailed",
      msg: "Decryption failed"
    },
    {
      code: 6053,
      name: "InvalidCiphertext",
      msg: "Invalid ciphertext"
    },
    {
      code: 6054,
      name: "LightProtocolError",
      msg: "Light Protocol CPI failed"
    },
    {
      code: 6055,
      name: "LightCpiError",
      msg: "Light Protocol CPI operation failed"
    },
    {
      code: 6056,
      name: "NullifierTreeError",
      msg: "Nullifier tree error"
    },
    {
      code: 6057,
      name: "NullifierInsertionFailed",
      msg: "Failed to insert nullifier"
    },
    {
      code: 6058,
      name: "NullifierAlreadySpent",
      msg: "Nullifier has already been spent (compressed account exists)"
    },
    {
      code: 6059,
      name: "ActionNullifierAlreadyUsed",
      msg: "Action nullifier has already been used (already voted)"
    },
    {
      code: 6060,
      name: "CommitmentCreationFailed",
      msg: "Failed to create commitment compressed account"
    },
    {
      code: 6061,
      name: "CommitmentProofFailed",
      msg: "Commitment merkle proof verification failed"
    },
    {
      code: 6062,
      name: "PoseidonHashError",
      msg: "Poseidon hash computation failed"
    },
    {
      code: 6063,
      name: "InvalidProofLength",
      msg: "Invalid proof length"
    },
    {
      code: 6064,
      name: "Bn254MulError",
      msg: "BN254 scalar multiplication failed"
    },
    {
      code: 6065,
      name: "Bn254AddError",
      msg: "BN254 point addition failed"
    },
    {
      code: 6066,
      name: "Bn254PairingError",
      msg: "BN254 pairing check failed"
    },
    {
      code: 6067,
      name: "AdapterSwapFailed",
      msg: "Adapter swap execution failed"
    },
    {
      code: 6068,
      name: "TooManyPendingCommitments",
      msg: "Too many pending commitments"
    },
    {
      code: 6069,
      name: "PendingOperationExpired",
      msg: "Pending operation has expired"
    },
    {
      code: 6070,
      name: "PendingOperationNotComplete",
      msg: "Pending operation not complete or expired"
    },
    {
      code: 6071,
      name: "InvalidCommitmentIndex",
      msg: "Invalid commitment index"
    },
    {
      code: 6072,
      name: "CommitmentAlreadyCreated",
      msg: "Commitment already created"
    },
    {
      code: 6073,
      name: "PoolMismatch",
      msg: "Pool mismatch for commitment"
    },
    {
      code: 6074,
      name: "InvalidRelayer",
      msg: "Invalid relayer for pending operation"
    },
    {
      code: 6075,
      name: "InvalidNullifierIndex",
      msg: "Invalid nullifier index"
    },
    {
      code: 6076,
      name: "NullifierAlreadyCreated",
      msg: "Nullifier already created"
    },
    {
      code: 6077,
      name: "NullifiersNotComplete",
      msg: "Not all nullifiers have been created yet"
    },
    {
      code: 6078,
      name: "NullifiersNotCreated",
      msg: "Nullifiers have not been created - required before processing unshield"
    },
    {
      code: 6079,
      name: "ProofNotVerified",
      msg: "ZK proof has not been verified - Phase 0 required"
    },
    {
      code: 6080,
      name: "CommitmentNotVerified",
      msg: "Commitment existence has not been verified - Phase 1 required"
    },
    {
      code: 6081,
      name: "CommitmentAlreadyVerified",
      msg: "Commitment has already been verified"
    },
    {
      code: 6082,
      name: "NullifierNotCreated",
      msg: "Nullifier has not been created - Phase 2 required"
    },
    {
      code: 6083,
      name: "Deprecated",
      msg: "This instruction is deprecated - use append pattern instead"
    },
    {
      code: 6084,
      name: "InvalidInputCount",
      msg: "Invalid input count - must be between 2 and 3 for consolidation"
    },
    {
      code: 6085,
      name: "InvalidVault",
      msg: "Invalid vault account"
    },
    {
      code: 6086,
      name: "InvalidTreasury",
      msg: "Treasury ATA required when protocol fees are enabled"
    },
    {
      code: 6087,
      name: "InsufficientFee",
      msg: "Fee amount is less than required minimum"
    },
    {
      code: 6088,
      name: "PerpsPoolNotFound",
      msg: "Perps pool not found"
    },
    {
      code: 6089,
      name: "PerpsPoolNotActive",
      msg: "Perps pool is not active"
    },
    {
      code: 6090,
      name: "PerpsMarketNotFound",
      msg: "Perps market not found"
    },
    {
      code: 6091,
      name: "PerpsMarketNotActive",
      msg: "Perps market is not active"
    },
    {
      code: 6092,
      name: "MaxTokensReached",
      msg: "Maximum tokens in pool reached"
    },
    {
      code: 6093,
      name: "TokenAlreadyInPool",
      msg: "Token already exists in pool"
    },
    {
      code: 6094,
      name: "TokenNotInPool",
      msg: "Token not found in pool"
    },
    {
      code: 6095,
      name: "TokenNotActive",
      msg: "Token is not active"
    },
    {
      code: 6096,
      name: "UtilizationLimitExceeded",
      msg: "Utilization limit exceeded"
    },
    {
      code: 6097,
      name: "InsufficientAvailableLiquidity",
      msg: "Insufficient available liquidity"
    },
    {
      code: 6098,
      name: "PositionSizeExceeded",
      msg: "Position size exceeds maximum"
    },
    {
      code: 6099,
      name: "LeverageExceeded",
      msg: "Leverage exceeds maximum allowed"
    },
    {
      code: 6100,
      name: "InvalidLeverage",
      msg: "Invalid leverage value"
    },
    {
      code: 6101,
      name: "PositionNotLiquidatable",
      msg: "Position not liquidatable"
    },
    {
      code: 6102,
      name: "PositionAtProfitBound",
      msg: "Position at profit bound - must close"
    },
    {
      code: 6103,
      name: "InvalidOraclePrice",
      msg: "Invalid oracle price"
    },
    {
      code: 6104,
      name: "StaleOraclePrice",
      msg: "Oracle price is stale"
    },
    {
      code: 6105,
      name: "InvalidPriceFeed",
      msg: "Invalid Pyth price feed - feed ID mismatch"
    },
    {
      code: 6106,
      name: "PriceStale",
      msg: "Pyth price is stale - exceeds maximum age"
    },
    {
      code: 6107,
      name: "PriceConfidenceTooHigh",
      msg: "Pyth price confidence interval too high"
    },
    {
      code: 6108,
      name: "InvalidPositionDirection",
      msg: "Invalid position direction"
    },
    {
      code: 6109,
      name: "InvalidMarginAmount",
      msg: "Invalid margin amount"
    },
    {
      code: 6110,
      name: "InvalidPositionSize",
      msg: "Invalid position size"
    },
    {
      code: 6111,
      name: "LpAmountMismatch",
      msg: "LP token amount mismatch"
    },
    {
      code: 6112,
      name: "WithdrawalExceedsAvailable",
      msg: "Withdrawal exceeds available balance"
    },
    {
      code: 6113,
      name: "InvalidBorrowFee",
      msg: "Invalid borrow fee calculation"
    },
    {
      code: 6114,
      name: "SameBaseQuoteToken",
      msg: "Market base and quote tokens must be different"
    },
    {
      code: 6115,
      name: "InvalidTokenIndex",
      msg: "Invalid token index"
    },
    {
      code: 6116,
      name: "PositionMetaNotFound",
      msg: "Position metadata not found"
    },
    {
      code: 6117,
      name: "PositionMetaCreationFailed",
      msg: "Failed to create position metadata"
    },
    {
      code: 6118,
      name: "PositionMetaUpdateFailed",
      msg: "Failed to update position metadata"
    },
    {
      code: 6119,
      name: "PositionNotActive",
      msg: "Position is not active - may be liquidated or closed"
    },
    {
      code: 6120,
      name: "PositionAlreadyLiquidated",
      msg: "Position has already been liquidated"
    },
    {
      code: 6121,
      name: "PositionAlreadyClosed",
      msg: "Position has already been closed"
    },
    {
      code: 6122,
      name: "LiquidationNullifierFailed",
      msg: "Failed to create liquidation nullifier"
    },
    {
      code: 6123,
      name: "PositionIdMismatch",
      msg: "Position ID mismatch between commitment and metadata"
    },
    {
      code: 6124,
      name: "NullifierHashMismatch",
      msg: "Nullifier hash mismatch"
    },
    {
      code: 6125,
      name: "BallotNotFound",
      msg: "Ballot not found"
    },
    {
      code: 6126,
      name: "BallotNotActive",
      msg: "Ballot is not active for voting"
    },
    {
      code: 6127,
      name: "BallotNotResolved",
      msg: "Ballot has not been resolved yet"
    },
    {
      code: 6128,
      name: "BallotNotFinalized",
      msg: "Ballot has not been finalized yet"
    },
    {
      code: 6129,
      name: "BallotAlreadyFinalized",
      msg: "Ballot has already been finalized"
    },
    {
      code: 6130,
      name: "BallotAlreadyResolved",
      msg: "Ballot is already resolved"
    },
    {
      code: 6131,
      name: "InvalidVoteOptionRange",
      msg: "Invalid vote option - exceeds num_options"
    },
    {
      code: 6132,
      name: "VoteNullifierNotFound",
      msg: "Vote nullifier not found - user must vote before changing"
    },
    {
      code: 6133,
      name: "InvalidBindingMode",
      msg: "Invalid binding mode for this operation"
    },
    {
      code: 6134,
      name: "InvalidVoteTypeForBallot",
      msg: "Invalid vote type for this ballot"
    },
    {
      code: 6135,
      name: "InvalidRevealModeForOperation",
      msg: "Invalid reveal mode for this operation"
    },
    {
      code: 6136,
      name: "NotEligible",
      msg: "User not eligible to vote (not in whitelist)"
    },
    {
      code: 6137,
      name: "ZeroAmount",
      msg: "Cannot vote with zero amount"
    },
    {
      code: 6138,
      name: "QuorumNotMet",
      msg: "Quorum threshold not met"
    },
    {
      code: 6139,
      name: "InvalidOutcomeValue",
      msg: "Invalid outcome value"
    },
    {
      code: 6140,
      name: "ClaimsNotAllowed",
      msg: "Claims not allowed for Snapshot mode"
    },
    {
      code: 6141,
      name: "ClaimAlreadyProcessed",
      msg: "Position already claimed (nullifier exists)"
    },
    {
      code: 6142,
      name: "ClaimDeadlinePassed",
      msg: "Claim deadline has passed"
    },
    {
      code: 6143,
      name: "TimelockNotExpired",
      msg: "Timelock has not expired yet"
    },
    {
      code: 6144,
      name: "InvalidDecryptionKey",
      msg: "Invalid decryption key - does not match time_lock_pubkey"
    },
    {
      code: 6145,
      name: "InvalidAttestationSignature",
      msg: "Invalid attestation signature"
    },
    {
      code: 6146,
      name: "InvalidWeightFormula",
      msg: "Invalid weight formula - evaluation error"
    },
    {
      code: 6147,
      name: "PositionCloseNotAllowed",
      msg: "Position close not allowed outside voting period"
    },
    {
      code: 6148,
      name: "InvalidSnapshotSlot",
      msg: "Invalid snapshot slot"
    },
    {
      code: 6149,
      name: "InvalidBallotTiming",
      msg: "Invalid ballot timing - start_time must be before end_time"
    },
    {
      code: 6150,
      name: "InvalidNumOptions",
      msg: "Invalid number of options - must be between 1 and 16"
    },
    {
      code: 6151,
      name: "VotingNotStarted",
      msg: "Voting period has not started yet"
    },
    {
      code: 6152,
      name: "VotingEnded",
      msg: "Voting period has ended"
    },
    {
      code: 6153,
      name: "UnauthorizedResolver",
      msg: "Only authority can resolve in Authority mode"
    },
    {
      code: 6154,
      name: "OracleOutcomeNotSubmitted",
      msg: "Oracle has not submitted outcome"
    },
    {
      code: 6155,
      name: "TallyNotDecrypted",
      msg: "Tally must be decrypted before resolution"
    },
    {
      code: 6156,
      name: "InvalidEligibilityProof",
      msg: "Invalid eligibility proof"
    },
    {
      code: 6157,
      name: "WeightFormulaTooLong",
      msg: "Weight formula too long"
    },
    {
      code: 6158,
      name: "TooManyWeightParams",
      msg: "Too many weight parameters"
    },
    {
      code: 6159,
      name: "ProtocolFeeExceedsMax",
      msg: "Protocol fee exceeds maximum (10000 bps = 100%)"
    },
    {
      code: 6160,
      name: "BallotIdMismatch",
      msg: "Ballot ID mismatch - does not match expected ballot"
    }
  ],
  types: [
    {
      name: "AdaptModule",
      docs: [
        "Registered adapter module"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "program_id",
            docs: [
              "Adapter program address"
            ],
            type: "pubkey"
          },
          {
            name: "interface_version",
            docs: [
              "Interface version (for compatibility)"
            ],
            type: "u8"
          },
          {
            name: "enabled",
            docs: [
              "Is enabled"
            ],
            type: "bool"
          },
          {
            name: "authority",
            docs: [
              "Authority who can manage"
            ],
            type: "pubkey"
          },
          {
            name: "registered_at",
            docs: [
              "Registration timestamp"
            ],
            type: "i64"
          },
          {
            name: "bump",
            docs: [
              "PDA bump"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "AmmPool",
      docs: [
        "AMM pool for a token pair"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_id",
            docs: [
              "Pool ID (PDA seed)"
            ],
            type: "pubkey"
          },
          {
            name: "token_a_mint",
            docs: [
              "Token A mint"
            ],
            type: "pubkey"
          },
          {
            name: "token_b_mint",
            docs: [
              "Token B mint"
            ],
            type: "pubkey"
          },
          {
            name: "lp_mint",
            docs: [
              "LP token mint (created by pool)"
            ],
            type: "pubkey"
          },
          {
            name: "state_hash",
            docs: [
              "Current state hash (hash of reserves + lp_supply)",
              "Used for ZK proof verification of state transitions"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "reserve_a",
            docs: [
              "Reserve A (committed, updated via ZK proofs)"
            ],
            type: "u64"
          },
          {
            name: "reserve_b",
            docs: [
              "Reserve B (committed, updated via ZK proofs)"
            ],
            type: "u64"
          },
          {
            name: "lp_supply",
            docs: [
              "Total LP token supply"
            ],
            type: "u64"
          },
          {
            name: "fee_bps",
            docs: [
              "Fee in basis points (e.g., 30 = 0.3%)"
            ],
            type: "u16"
          },
          {
            name: "authority",
            docs: [
              "Pool authority"
            ],
            type: "pubkey"
          },
          {
            name: "is_active",
            docs: [
              "Is pool active"
            ],
            type: "bool"
          },
          {
            name: "bump",
            docs: [
              "PDA bump"
            ],
            type: "u8"
          },
          {
            name: "lp_mint_bump",
            docs: [
              "LP mint bump"
            ],
            type: "u8"
          },
          {
            name: "pool_type",
            docs: [
              "Pool type (ConstantProduct or StableSwap)"
            ],
            type: {
              defined: {
                name: "PoolType"
              }
            }
          },
          {
            name: "amplification",
            docs: [
              "Amplification coefficient for StableSwap (ignored for ConstantProduct)",
              "Higher values = more like constant sum (lower slippage at peg)",
              "Typical values: 100-1000 for stablecoins",
              "Stored as actual value (not scaled)"
            ],
            type: "u64"
          }
        ]
      }
    },
    {
      name: "Ballot",
      docs: [
        "Main ballot account storing all voting configuration and state"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "ballot_id",
            docs: [
              "Unique ballot identifier"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "authority",
            docs: [
              "Authority who can resolve (for Authority mode) or manage ballot"
            ],
            type: "pubkey"
          },
          {
            name: "token_mint",
            docs: [
              "Token mint for voting power"
            ],
            type: "pubkey"
          },
          {
            name: "token_pool",
            docs: [
              "Token vault PDA (SpendToVote only, holds locked tokens)"
            ],
            type: "pubkey"
          },
          {
            name: "binding_mode",
            docs: [
              "How tokens participate in voting"
            ],
            type: {
              defined: {
                name: "VoteBindingMode"
              }
            }
          },
          {
            name: "reveal_mode",
            docs: [
              "When and how votes are revealed"
            ],
            type: {
              defined: {
                name: "RevealMode"
              }
            }
          },
          {
            name: "vote_type",
            docs: [
              "How votes are counted"
            ],
            type: {
              defined: {
                name: "VoteType"
              }
            }
          },
          {
            name: "resolution_mode",
            docs: [
              "How outcome is determined"
            ],
            type: {
              defined: {
                name: "ResolutionMode"
              }
            }
          },
          {
            name: "status",
            docs: [
              "Current ballot status"
            ],
            type: {
              defined: {
                name: "BallotStatus"
              }
            }
          },
          {
            name: "num_options",
            docs: [
              "Number of voting options (max 16)"
            ],
            type: "u8"
          },
          {
            name: "quorum_threshold",
            docs: [
              "Minimum weight/amount required for valid outcome (0 = no quorum)"
            ],
            type: "u64"
          },
          {
            name: "protocol_fee_bps",
            docs: [
              "Protocol fee in basis points (SpendToVote only, max 10000 = 100%)"
            ],
            type: "u16"
          },
          {
            name: "protocol_treasury",
            docs: [
              "Treasury account for fee collection"
            ],
            type: "pubkey"
          },
          {
            name: "start_time",
            docs: [
              "When voting starts"
            ],
            type: "i64"
          },
          {
            name: "end_time",
            docs: [
              "When voting ends"
            ],
            type: "i64"
          },
          {
            name: "snapshot_slot",
            docs: [
              "For Snapshot mode: slot at which balances are checked"
            ],
            type: "u64"
          },
          {
            name: "indexer_pubkey",
            docs: [
              "Trusted indexer public key for balance attestation (Snapshot mode)"
            ],
            type: "pubkey"
          },
          {
            name: "eligibility_root",
            docs: [
              "Merkle root of eligible addresses (None = open to all token holders)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "has_eligibility_root",
            docs: [
              "Whether eligibility_root is set (workaround for Option not being well-supported)"
            ],
            type: "bool"
          },
          {
            name: "weight_formula",
            docs: [
              "Weight formula operations (evaluated left to right)"
            ],
            type: {
              array: [
                "u8",
                16
              ]
            }
          },
          {
            name: "weight_formula_len",
            docs: [
              "Number of operations in weight_formula"
            ],
            type: "u8"
          },
          {
            name: "weight_params",
            docs: [
              "Parameters for PushConst operations"
            ],
            type: {
              array: [
                "u64",
                8
              ]
            }
          },
          {
            name: "option_weights",
            docs: [
              "Weight per option (after weight formula applied)"
            ],
            type: {
              array: [
                "u64",
                16
              ]
            }
          },
          {
            name: "option_amounts",
            docs: [
              "Raw amounts per option (before weight formula)"
            ],
            type: {
              array: [
                "u64",
                16
              ]
            }
          },
          {
            name: "total_weight",
            docs: [
              "Total weight across all votes"
            ],
            type: "u64"
          },
          {
            name: "total_amount",
            docs: [
              "Total amount across all votes"
            ],
            type: "u64"
          },
          {
            name: "vote_count",
            docs: [
              "Number of votes cast"
            ],
            type: "u64"
          },
          {
            name: "pool_balance",
            docs: [
              "Current balance in the vault"
            ],
            type: "u64"
          },
          {
            name: "total_distributed",
            docs: [
              "Total payouts distributed during claims"
            ],
            type: "u64"
          },
          {
            name: "fees_collected",
            docs: [
              "Total fees collected during claims"
            ],
            type: "u64"
          },
          {
            name: "encrypted_tally",
            docs: [
              "ElGamal ciphertexts for homomorphic vote counting",
              "Note: Used for AGGREGATE counting only",
              "Individual vote_choice hidden by commitment hash, NOT by this encryption"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    64
                  ]
                },
                16
              ]
            }
          },
          {
            name: "time_lock_pubkey",
            docs: [
              "Public key for timelock encryption"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "unlock_slot",
            docs: [
              "Slot after which timelock key is released"
            ],
            type: "u64"
          },
          {
            name: "outcome",
            docs: [
              "Winning option index (None if no winner or quorum not met)"
            ],
            type: "u8"
          },
          {
            name: "has_outcome",
            docs: [
              "Whether outcome has been set"
            ],
            type: "bool"
          },
          {
            name: "winner_weight",
            docs: [
              "Total weight that voted for winner (for payout calculation)"
            ],
            type: "u64"
          },
          {
            name: "resolver",
            docs: [
              "Designated resolver for Authority mode"
            ],
            type: "pubkey"
          },
          {
            name: "has_resolver",
            docs: [
              "Whether resolver is set"
            ],
            type: "bool"
          },
          {
            name: "oracle",
            docs: [
              "Oracle account for Oracle mode"
            ],
            type: "pubkey"
          },
          {
            name: "has_oracle",
            docs: [
              "Whether oracle is set"
            ],
            type: "bool"
          },
          {
            name: "claim_deadline",
            docs: [
              "Deadline for claims (SpendToVote only, 0 for Snapshot)"
            ],
            type: "i64"
          },
          {
            name: "bump",
            docs: [
              "PDA bump seed"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "BallotConfigInput",
      docs: [
        "Input configuration for creating a ballot"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "binding_mode",
            type: {
              defined: {
                name: "VoteBindingMode"
              }
            }
          },
          {
            name: "reveal_mode",
            type: {
              defined: {
                name: "RevealMode"
              }
            }
          },
          {
            name: "vote_type",
            type: {
              defined: {
                name: "VoteType"
              }
            }
          },
          {
            name: "resolution_mode",
            type: {
              defined: {
                name: "ResolutionMode"
              }
            }
          },
          {
            name: "num_options",
            type: "u8"
          },
          {
            name: "quorum_threshold",
            type: "u64"
          },
          {
            name: "protocol_fee_bps",
            type: "u16"
          },
          {
            name: "protocol_treasury",
            type: "pubkey"
          },
          {
            name: "start_time",
            type: "i64"
          },
          {
            name: "end_time",
            type: "i64"
          },
          {
            name: "snapshot_slot",
            type: "u64"
          },
          {
            name: "indexer_pubkey",
            type: "pubkey"
          },
          {
            name: "eligibility_root",
            type: {
              option: {
                array: [
                  "u8",
                  32
                ]
              }
            }
          },
          {
            name: "weight_formula",
            type: "bytes"
          },
          {
            name: "weight_params",
            type: {
              vec: "u64"
            }
          },
          {
            name: "time_lock_pubkey",
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "unlock_slot",
            type: "u64"
          },
          {
            name: "resolver",
            type: {
              option: "pubkey"
            }
          },
          {
            name: "oracle",
            type: {
              option: "pubkey"
            }
          },
          {
            name: "claim_deadline",
            type: "i64"
          }
        ]
      }
    },
    {
      name: "BallotStatus",
      docs: [
        "Ballot status lifecycle"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Pending"
          },
          {
            name: "Active"
          },
          {
            name: "Closed"
          },
          {
            name: "Resolved"
          },
          {
            name: "Finalized"
          }
        ]
      }
    },
    {
      name: "EncryptedContributions",
      docs: [
        "Encrypted contributions for tally update (encrypted modes only)",
        "One ciphertext per option - program adds all to tally without knowing which is non-zero"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "ciphertexts",
            docs: [
              "Array of ElGamal ciphertexts, one per option",
              "Only one has non-zero weight (circuit enforces this)"
            ],
            type: {
              vec: {
                array: [
                  "u8",
                  64
                ]
              }
            }
          }
        ]
      }
    },
    {
      name: "InitializePerpsPoolParams",
      docs: [
        "Parameters for initializing a perps pool"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "max_leverage",
            docs: [
              "Maximum leverage (1-100)"
            ],
            type: "u8"
          },
          {
            name: "position_fee_bps",
            docs: [
              "Position fee in basis points (e.g., 6 = 0.06%)"
            ],
            type: "u16"
          },
          {
            name: "max_utilization_bps",
            docs: [
              "Maximum utilization per token in basis points (e.g., 8000 = 80%)"
            ],
            type: "u16"
          },
          {
            name: "liquidation_threshold_bps",
            docs: [
              "Liquidation threshold in basis points (e.g., 50 = 0.5% margin remaining)"
            ],
            type: "u16"
          },
          {
            name: "liquidation_penalty_bps",
            docs: [
              "Liquidation penalty in basis points (e.g., 50 = 0.5%)"
            ],
            type: "u16"
          },
          {
            name: "base_borrow_rate_bps",
            docs: [
              "Base borrow rate per hour in basis points"
            ],
            type: "u16"
          },
          {
            name: "max_imbalance_fee_bps",
            docs: [
              "Maximum imbalance fee in basis points (e.g., 3 = 0.03%)"
            ],
            type: "u16"
          }
        ]
      }
    },
    {
      name: "LightAdaptParams",
      docs: [
        "Parameters for Light Protocol operations"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "nullifier_proof",
            docs: [
              "Validity proof for nullifier (proves it doesn't exist)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "nullifier_address_tree_info",
            docs: [
              "Address tree info for nullifier"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "commitment_proof",
            docs: [
              "Validity proof for output commitment"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "commitment_address_tree_info",
            docs: [
              "Address tree info for commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightAddressTreeInfo",
      docs: [
        "IDL-safe wrapper for Light Protocol address tree info",
        "",
        "Contains tree configuration for compressed account address derivation."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "address_merkle_tree_pubkey_index",
            docs: [
              "Index of the address merkle tree pubkey in remaining_accounts"
            ],
            type: "u8"
          },
          {
            name: "address_queue_pubkey_index",
            docs: [
              "Index of the address queue pubkey in remaining_accounts"
            ],
            type: "u8"
          },
          {
            name: "root_index",
            docs: [
              "Root index for the merkle tree"
            ],
            type: "u16"
          }
        ]
      }
    },
    {
      name: "LightCancelOrderParams",
      docs: [
        "Parameters for Light Protocol operations"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "nullifier_proof",
            docs: [
              "Validity proof for nullifier"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "nullifier_address_tree_info",
            docs: [
              "Address tree info for nullifier"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "commitment_proof",
            docs: [
              "Validity proof for refund commitment"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "commitment_address_tree_info",
            docs: [
              "Address tree info for refund commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightCommitmentParams",
      docs: [
        "Parameters for Light Protocol commitment creation"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "validity_proof",
            docs: [
              "Validity proof from Helius indexer"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "address_tree_info",
            docs: [
              "Address tree info for compressed account address derivation"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index for the new compressed account"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightCreateCommitmentParams",
      docs: [
        "Parameters for Light Protocol commitment creation"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "proof",
            docs: [
              "Validity proof for commitment"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "address_tree_info",
            docs: [
              "Address tree info for commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightCreateNullifierAndPendingParams",
      docs: [
        "Parameters for Light Protocol nullifier creation"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "proof",
            docs: [
              "Validity proof for nullifier (non-inclusion proof)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "address_tree_info",
            docs: [
              "Address tree info for nullifier"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightCreateNullifierParams",
      docs: [
        "Parameters for Light Protocol nullifier creation"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "proof",
            docs: [
              "Validity proof for nullifier (non-inclusion proof)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "address_tree_info",
            docs: [
              "Address tree info for nullifier"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightCreateVoteCommitmentParams",
      docs: [
        "Parameters for Light Protocol vote commitment creation"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "validity_proof",
            docs: [
              "Validity proof for commitment (non-inclusion proof)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "address_tree_info",
            docs: [
              "Address tree info for commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightCreateVoteNullifierParams",
      docs: [
        "Parameters for Light Protocol vote nullifier creation"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "validity_proof",
            docs: [
              "Validity proof for nullifier (non-inclusion proof)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "address_tree_info",
            docs: [
              "Address tree info for nullifier"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightFillOrderParams",
      docs: [
        "Parameters for Light Protocol operations in fill order"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "escrow_nullifier_proof",
            docs: [
              "Validity proof for escrow nullifier"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "escrow_nullifier_address_tree_info",
            docs: [
              "Address tree info for escrow nullifier"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "taker_nullifier_proof",
            docs: [
              "Validity proof for taker nullifier"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "taker_nullifier_address_tree_info",
            docs: [
              "Address tree info for taker nullifier"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "maker_commitment_proof",
            docs: [
              "Validity proof for maker output commitment"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "maker_commitment_address_tree_info",
            docs: [
              "Address tree info for maker output commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "taker_commitment_proof",
            docs: [
              "Validity proof for taker output commitment"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "taker_commitment_address_tree_info",
            docs: [
              "Address tree info for taker output commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightOrderParams",
      docs: [
        "Parameters for Light Protocol operations"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "nullifier_proof",
            docs: [
              "Validity proof for nullifier"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "nullifier_address_tree_info",
            docs: [
              "Address tree info for nullifier"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "commitment_proof",
            docs: [
              "Validity proof for commitment"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "commitment_address_tree_info",
            docs: [
              "Address tree info for commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightTransactParams",
      docs: [
        "Parameters for transact Phase 1",
        "SECURITY CRITICAL: Verifies commitment exists + creates nullifier"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "commitment_account_hash",
            docs: [
              "Account hash of input commitment (for verification)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "commitment_merkle_context",
            docs: [
              "Merkle context proving commitment exists in state tree"
            ],
            type: {
              defined: {
                name: "cloakcraft::instructions::pool::transact::CommitmentMerkleContext"
              }
            }
          },
          {
            name: "commitment_inclusion_proof",
            docs: [
              "Commitment inclusion proof (SECURITY: proves commitment EXISTS)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "commitment_address_tree_info",
            docs: [
              "Address tree info for commitment verification"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "nullifier_non_inclusion_proof",
            docs: [
              "Nullifier non-inclusion proof (proves nullifier doesn't exist yet)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "nullifier_address_tree_info",
            docs: [
              "Address tree info for nullifier creation"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index for new nullifier account"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "LightValidityProof",
      docs: [
        "IDL-safe wrapper for Light Protocol validity proof",
        "",
        "Contains the serialized proof data that can be deserialized",
        "into a ValidityProof for Light CPI operations."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "a",
            docs: [
              "Compressed proof point A (32 bytes)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "b",
            docs: [
              "Compressed proof point B (64 bytes)"
            ],
            type: {
              array: [
                "u8",
                64
              ]
            }
          },
          {
            name: "c",
            docs: [
              "Compressed proof point C (32 bytes)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      name: "LightVerifyCommitmentParams",
      docs: [
        "Parameters for commitment inclusion verification"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "commitment_account_hash",
            docs: [
              "Account hash of commitment to verify"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "commitment_merkle_context",
            docs: [
              "Merkle context proving commitment exists"
            ],
            type: {
              defined: {
                name: "cloakcraft::instructions::generic::verify_commitment_exists::CommitmentMerkleContext"
              }
            }
          },
          {
            name: "commitment_inclusion_proof",
            docs: [
              "Inclusion proof for commitment (from getInclusionProofByHash)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "commitment_address_tree_info",
            docs: [
              "Address tree info for commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          }
        ]
      }
    },
    {
      name: "LightVerifyVoteCommitmentParams",
      docs: [
        "Parameters for vote commitment inclusion verification"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "commitment_account_hash",
            docs: [
              "Account hash of commitment to verify (from Light Protocol indexer)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "commitment_merkle_context",
            docs: [
              "Merkle context proving commitment exists"
            ],
            type: {
              defined: {
                name: "VoteCommitmentMerkleContext"
              }
            }
          },
          {
            name: "commitment_inclusion_proof",
            docs: [
              "Inclusion proof for commitment"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "commitment_address_tree_info",
            docs: [
              "Address tree info for commitment"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          }
        ]
      }
    },
    {
      name: "Order",
      docs: [
        "Market order (escrow)"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "order_id",
            docs: [
              "Unique order ID (derived from nullifier + terms)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "escrow_commitment",
            docs: [
              "Escrow commitment (locked maker funds)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "terms_hash",
            docs: [
              "Hash of order terms (offer_token, offer_amount, ask_token, ask_amount, maker_receive)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "encrypted_escrow",
            docs: [
              "Encrypted escrow note (for maker to decrypt)"
            ],
            type: "bytes"
          },
          {
            name: "expiry",
            docs: [
              "Expiry timestamp"
            ],
            type: "i64"
          },
          {
            name: "status",
            docs: [
              "Order status"
            ],
            type: {
              defined: {
                name: "OrderStatus"
              }
            }
          },
          {
            name: "created_at",
            docs: [
              "Creation timestamp"
            ],
            type: "i64"
          },
          {
            name: "bump",
            docs: [
              "PDA bump"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "OrderStatus",
      docs: [
        "Order status"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Open"
          },
          {
            name: "Filled"
          },
          {
            name: "Cancelled"
          }
        ]
      }
    },
    {
      name: "PendingOperation",
      docs: [
        "Pending operation for multi-phase commit with append pattern",
        "",
        "SECURITY: Append pattern binds all phases together",
        "Phase 0: Verify ZK proof \u2192 stores input_commitment, nullifier, outputs",
        "Phase 1: Verify commitment exists \u2192 must match input_commitment from Phase 0",
        "Phase 2: Create nullifier \u2192 must match nullifier from Phase 0",
        "Phase 3+: Execute operation \u2192 requires all verifications complete",
        "",
        "This prevents commitment/nullifier swap attacks.",
        "",
        "DESIGN CHOICE: Store randomness instead of encrypted notes",
        "- Encrypted notes = ~200 bytes per output (10 outputs = 2000 bytes!)",
        "- Randomness = 32 bytes per output (10 outputs = 320 bytes)",
        "- Savings: 1680 bytes (~0.012 SOL temporary rent reduction)",
        "",
        "Trade-off: Must regenerate encrypted notes if Phase 4 fails",
        "- Normal case: Generate once in Phase 4, no regeneration needed",
        "- Failure case: SDK reads randomness from PDA, regenerates encrypted notes",
        "- Compute is cheap, storage is expensive on Solana"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "bump",
            docs: [
              "Bump seed for PDA derivation"
            ],
            type: "u8"
          },
          {
            name: "operation_id",
            docs: [
              "Operation ID (unique per operation, derived from inputs)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "relayer",
            docs: [
              "Relayer who initiated the operation"
            ],
            type: "pubkey"
          },
          {
            name: "operation_type",
            docs: [
              "Operation type (not used for logic, only for logging/debugging)"
            ],
            type: "u8"
          },
          {
            name: "proof_verified",
            docs: [
              "SECURITY: State machine flags (prevent phase skipping)",
              "Phase 0 sets proof_verified"
            ],
            type: "bool"
          },
          {
            name: "input_commitments",
            docs: [
              "SECURITY: Input commitment from ZK proof (binds Phase 0 to Phase 1)",
              "Phase 0 extracts from proof public inputs",
              "Phase 1 must verify THIS exact commitment",
              "For single-input operations (swap, remove_liquidity): Uses index 0",
              "For multi-input operations (add_liquidity): Uses indices 0 and 1"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    32
                  ]
                },
                3
              ]
            }
          },
          {
            name: "expected_nullifiers",
            docs: [
              "SECURITY: Expected nullifiers from ZK proof (binds Phase 0 to Phase 2)",
              "Phase 0 extracts from proof public inputs",
              "Phase 2 must create THIS exact nullifier",
              "Matches input_commitments indices"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    32
                  ]
                },
                3
              ]
            }
          },
          {
            name: "input_pools",
            docs: [
              "SECURITY: Input pools for each input commitment (binds Phase 1/2 to correct pool)",
              "Phase 0 stores which pool each input commitment belongs to",
              "Phase 1 must verify commitment EXISTS in THIS exact pool",
              "Phase 2 must create nullifier in THIS exact pool",
              "This prevents pool confusion attacks in multi-pool operations (e.g., swap)",
              "Matches input_commitments and expected_nullifiers indices"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    32
                  ]
                },
                3
              ]
            }
          },
          {
            name: "num_inputs",
            docs: [
              "Number of input commitments to verify (1 for swap/remove, 2 for add_liquidity)"
            ],
            type: "u8"
          },
          {
            name: "inputs_verified_mask",
            docs: [
              "Bitmask tracking which input commitments have been verified",
              "Bit i = 1 means input_commitments[i] was verified"
            ],
            type: "u8"
          },
          {
            name: "nullifier_completed_mask",
            docs: [
              "Which nullifiers have been created (bitmask)",
              "Uses same indices as expected_nullifiers array"
            ],
            type: "u8"
          },
          {
            name: "num_commitments",
            docs: [
              "Number of pending commitments"
            ],
            type: "u8"
          },
          {
            name: "pools",
            docs: [
              "Pools for each commitment"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    32
                  ]
                },
                8
              ]
            }
          },
          {
            name: "commitments",
            docs: [
              "Commitment hashes"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    32
                  ]
                },
                8
              ]
            }
          },
          {
            name: "leaf_indices",
            docs: [
              "Leaf indices for each commitment"
            ],
            type: {
              array: [
                "u64",
                8
              ]
            }
          },
          {
            name: "stealth_ephemeral_pubkeys",
            docs: [
              "Stealth ephemeral pubkeys (64 bytes each: X + Y coordinates)",
              "Used by scanner to derive stealth private key for decryption"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    64
                  ]
                },
                8
              ]
            }
          },
          {
            name: "output_recipients",
            docs: [
              "Output recipients (stealth public key X coordinate)",
              "Used to regenerate encrypted notes"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    32
                  ]
                },
                8
              ]
            }
          },
          {
            name: "output_amounts",
            docs: [
              "Output amounts",
              "Used to regenerate encrypted notes"
            ],
            type: {
              array: [
                "u64",
                8
              ]
            }
          },
          {
            name: "output_randomness",
            docs: [
              "Output randomness (from ZK proof)",
              "CRITICAL: Used to regenerate encrypted notes",
              "Must match what was used in commitment computation"
            ],
            type: {
              array: [
                {
                  array: [
                    "u8",
                    32
                  ]
                },
                8
              ]
            }
          },
          {
            name: "completed_mask",
            docs: [
              "Which commitments have been created (bitmask)"
            ],
            type: "u8"
          },
          {
            name: "expires_at",
            docs: [
              "Expiry timestamp (operation expires after this)"
            ],
            type: "i64"
          },
          {
            name: "created_at",
            docs: [
              "Creation timestamp"
            ],
            type: "i64"
          },
          {
            name: "swap_amount",
            docs: [
              "Swap: Input amount being swapped",
              "Add Liquidity: Token A deposit amount",
              "Remove Liquidity: LP tokens burned"
            ],
            type: "u64"
          },
          {
            name: "output_amount",
            docs: [
              "Swap: Output amount received (recalculated on-chain for flexibility)",
              "Add Liquidity: Token B deposit amount",
              "Remove Liquidity: Token A withdrawn"
            ],
            type: "u64"
          },
          {
            name: "min_output",
            docs: [
              "Swap: Minimum acceptable output (slippage protection)",
              "Verified on-chain: recalculated_output >= min_output",
              "Add Liquidity/Remove Liquidity: unused"
            ],
            type: "u64"
          },
          {
            name: "extra_amount",
            docs: [
              "Swap: unused",
              "Add Liquidity: LP tokens minted",
              "Remove Liquidity: Token B withdrawn"
            ],
            type: "u64"
          },
          {
            name: "swap_a_to_b",
            docs: [
              "Swap: Direction (1 = A->B, 0 = B->A)",
              "Add Liquidity: unused",
              "Remove Liquidity: unused"
            ],
            type: "bool"
          },
          {
            name: "fee_amount",
            docs: [
              "Protocol fee amount (verified in ZK proof)",
              "Transfer/Unshield: Fee deducted from transfer amount",
              "Swap: Fee deducted from swap output",
              "Remove Liquidity: Fee deducted from withdrawal"
            ],
            type: "u64"
          },
          {
            name: "unshield_amount",
            docs: [
              "Unshield amount (for process_unshield phase)"
            ],
            type: "u64"
          },
          {
            name: "transfer_amount",
            docs: [
              "Transfer amount (public for on-chain fee verification)",
              "This is the amount going to the recipient (out_amount_1 in circuit)"
            ],
            type: "u64"
          },
          {
            name: "fee_processed",
            docs: [
              "Whether fee has been processed (transferred to treasury)"
            ],
            type: "bool"
          }
        ]
      }
    },
    {
      name: "PerpsMarket",
      docs: [
        "Perpetual futures market for a trading pair"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "market_id",
            docs: [
              "Unique market identifier (32-byte hash)"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "pool",
            docs: [
              "Associated perps pool"
            ],
            type: "pubkey"
          },
          {
            name: "base_token_index",
            docs: [
              "Base token index in pool.tokens (e.g., SOL for SOL/USD)"
            ],
            type: "u8"
          },
          {
            name: "quote_token_index",
            docs: [
              "Quote token index in pool.tokens (e.g., USDC for SOL/USD)"
            ],
            type: "u8"
          },
          {
            name: "long_open_interest",
            docs: [
              "Total long open interest (in base token units)"
            ],
            type: "u64"
          },
          {
            name: "short_open_interest",
            docs: [
              "Total short open interest (in base token units)"
            ],
            type: "u64"
          },
          {
            name: "max_position_size",
            docs: [
              "Maximum position size (in base token units, 0 = unlimited)"
            ],
            type: "u64"
          },
          {
            name: "is_active",
            docs: [
              "Whether the market is active for trading"
            ],
            type: "bool"
          },
          {
            name: "bump",
            docs: [
              "PDA bump seed"
            ],
            type: "u8"
          },
          {
            name: "_reserved",
            docs: [
              "Reserved for future use"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      name: "PerpsPool",
      docs: [
        "Multi-token perpetual futures liquidity pool"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool_id",
            docs: [
              "Unique pool identifier (used as PDA seed)"
            ],
            type: "pubkey"
          },
          {
            name: "lp_mint",
            docs: [
              "LP token mint (single token for entire pool)"
            ],
            type: "pubkey"
          },
          {
            name: "position_mint",
            docs: [
              "Position token mint (for position commitments)"
            ],
            type: "pubkey"
          },
          {
            name: "lp_supply",
            docs: [
              "Total LP token supply"
            ],
            type: "u64"
          },
          {
            name: "authority",
            docs: [
              "Pool authority (admin)"
            ],
            type: "pubkey"
          },
          {
            name: "num_tokens",
            docs: [
              "Number of active tokens in the pool"
            ],
            type: "u8"
          },
          {
            name: "tokens",
            docs: [
              "Token configurations (up to MAX_PERPS_TOKENS)"
            ],
            type: {
              array: [
                {
                  defined: {
                    name: "PerpsToken"
                  }
                },
                8
              ]
            }
          },
          {
            name: "max_leverage",
            docs: [
              "Maximum leverage allowed (e.g., 100 = 100x)"
            ],
            type: "u8"
          },
          {
            name: "position_fee_bps",
            docs: [
              "Position fee in basis points (e.g., 6 = 0.06%)"
            ],
            type: "u16"
          },
          {
            name: "max_utilization_bps",
            docs: [
              "Maximum utilization per token in basis points (e.g., 8000 = 80%)"
            ],
            type: "u16"
          },
          {
            name: "liquidation_threshold_bps",
            docs: [
              "Liquidation threshold in basis points (e.g., 50 = 0.5% margin remaining)"
            ],
            type: "u16"
          },
          {
            name: "liquidation_penalty_bps",
            docs: [
              "Liquidation penalty in basis points (e.g., 50 = 0.5%)"
            ],
            type: "u16"
          },
          {
            name: "base_borrow_rate_bps",
            docs: [
              "Base borrow rate per hour in basis points (e.g., 1 = 0.01%/hour)"
            ],
            type: "u16"
          },
          {
            name: "max_imbalance_fee_bps",
            docs: [
              "Maximum imbalance fee in basis points (e.g., 3 = 0.03%)"
            ],
            type: "u16"
          },
          {
            name: "is_active",
            docs: [
              "Whether the pool is active for trading"
            ],
            type: "bool"
          },
          {
            name: "bump",
            docs: [
              "PDA bump seed"
            ],
            type: "u8"
          },
          {
            name: "lp_mint_bump",
            docs: [
              "LP mint bump seed"
            ],
            type: "u8"
          },
          {
            name: "position_mint_bump",
            docs: [
              "Position mint bump seed"
            ],
            type: "u8"
          },
          {
            name: "_reserved",
            docs: [
              "Reserved for future use (reduced from 32 to accommodate position_mint + bump)"
            ],
            type: {
              array: [
                "u8",
                31
              ]
            }
          }
        ]
      }
    },
    {
      name: "PerpsToken",
      docs: [
        "Individual token configuration within the perps pool"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "mint",
            docs: [
              "Token mint address"
            ],
            type: "pubkey"
          },
          {
            name: "vault",
            docs: [
              "Token vault PDA holding pool assets"
            ],
            type: "pubkey"
          },
          {
            name: "pyth_feed_id",
            docs: [
              "Pyth price feed ID (32 bytes hex)",
              "Used to validate the passed price update account"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "balance",
            docs: [
              "Total balance in the pool (deposited by LPs)"
            ],
            type: "u64"
          },
          {
            name: "locked",
            docs: [
              "Amount locked in positions (borrowed + held)"
            ],
            type: "u64"
          },
          {
            name: "cumulative_borrow_fee",
            docs: [
              "Cumulative borrow fee per token (scaled by 1e18)",
              "Used for fee accrual calculation"
            ],
            type: "u128"
          },
          {
            name: "last_fee_update",
            docs: [
              "Last timestamp when borrow fee was updated"
            ],
            type: "i64"
          },
          {
            name: "decimals",
            docs: [
              "Token decimals (for price calculations)"
            ],
            type: "u8"
          },
          {
            name: "is_active",
            docs: [
              "Whether this token slot is active"
            ],
            type: "bool"
          },
          {
            name: "vault_bump",
            docs: [
              "Vault bump seed"
            ],
            type: "u8"
          },
          {
            name: "_reserved",
            docs: [
              "Reserved for future use"
            ],
            type: {
              array: [
                "u8",
                5
              ]
            }
          }
        ]
      }
    },
    {
      name: "Pool",
      docs: [
        "Shielded pool for a single token",
        "",
        "Note: Merkle tree state (commitments, roots) is now stored in Light Protocol",
        "compressed accounts. The PoolCommitmentCounter tracks leaf indices."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "token_mint",
            docs: [
              "SPL token mint address"
            ],
            type: "pubkey"
          },
          {
            name: "token_vault",
            docs: [
              "PDA holding shielded tokens"
            ],
            type: "pubkey"
          },
          {
            name: "total_shielded",
            docs: [
              "Total value locked (for analytics)"
            ],
            type: "u64"
          },
          {
            name: "authority",
            docs: [
              "Pool authority (for upgrades)"
            ],
            type: "pubkey"
          },
          {
            name: "bump",
            docs: [
              "PDA bump seed"
            ],
            type: "u8"
          },
          {
            name: "vault_bump",
            docs: [
              "Vault bump seed"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "PoolCommitmentCounter",
      docs: [
        "Pool commitment counter - tracks next leaf index",
        "",
        "This is a regular PDA (not compressed) that tracks the",
        "next available leaf index for each pool. Needed for",
        "sequential leaf index assignment."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            docs: [
              "Pool this counter belongs to"
            ],
            type: "pubkey"
          },
          {
            name: "next_leaf_index",
            docs: [
              "Next available leaf index"
            ],
            type: "u64"
          },
          {
            name: "total_commitments",
            docs: [
              "Total commitments created"
            ],
            type: "u64"
          },
          {
            name: "bump",
            docs: [
              "PDA bump seed"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "PoolType",
      docs: [
        "Pool type determining which AMM formula to use"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "ConstantProduct"
          },
          {
            name: "StableSwap"
          }
        ]
      }
    },
    {
      name: "PriceFeedMessage",
      repr: {
        kind: "c"
      },
      type: {
        kind: "struct",
        fields: [
          {
            name: "feed_id",
            docs: [
              "`FeedId` but avoid the type alias because of compatibility issues with Anchor's `idl-build` feature."
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "price",
            type: "i64"
          },
          {
            name: "conf",
            type: "u64"
          },
          {
            name: "exponent",
            type: "i32"
          },
          {
            name: "publish_time",
            docs: [
              "The timestamp of this price update in seconds"
            ],
            type: "i64"
          },
          {
            name: "prev_publish_time",
            docs: [
              "The timestamp of the previous price update. This field is intended to allow users to",
              "identify the single unique price update for any moment in time:",
              "for any time t, the unique update is the one such that prev_publish_time < t <= publish_time.",
              "",
              "Note that there may not be such an update while we are migrating to the new message-sending logic,",
              "as some price updates on pythnet may not be sent to other chains (because the message-sending",
              "logic may not have triggered). We can solve this problem by making the message-sending mandatory",
              "(which we can do once publishers have migrated over).",
              "",
              "Additionally, this field may be equal to publish_time if the message is sent on a slot where",
              "where the aggregation was unsuccesful. This problem will go away once all publishers have",
              "migrated over to a recent version of pyth-agent."
            ],
            type: "i64"
          },
          {
            name: "ema_price",
            type: "i64"
          },
          {
            name: "ema_conf",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "PriceUpdateV2",
      docs: [
        "A price update account. This account is used by the Pyth Receiver program to store a verified price update from a Pyth price feed.",
        "It contains:",
        "- `write_authority`: The write authority for this account. This authority can close this account to reclaim rent or update the account to contain a different price update.",
        "- `verification_level`: The [`VerificationLevel`] of this price update. This represents how many Wormhole guardian signatures have been verified for this price update.",
        "- `price_message`: The actual price update.",
        "- `posted_slot`: The slot at which this price update was posted."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "write_authority",
            type: "pubkey"
          },
          {
            name: "verification_level",
            type: {
              defined: {
                name: "VerificationLevel"
              }
            }
          },
          {
            name: "price_message",
            type: {
              defined: {
                name: "PriceFeedMessage"
              }
            }
          },
          {
            name: "posted_slot",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "ProfitBoundReached",
      docs: [
        "Event emitted when a position is at profit bound",
        "Keepers can listen for this to initiate close position flow"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "pool",
            type: "pubkey"
          },
          {
            name: "market",
            type: "pubkey"
          },
          {
            name: "position_commitment",
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "margin",
            type: "u64"
          },
          {
            name: "pnl",
            type: "u64"
          },
          {
            name: "current_price",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "ProtocolConfig",
      docs: [
        "Protocol configuration account",
        "",
        "Stores fee rates in basis points (10000 = 100%) and treasury address.",
        "Fee rates can be updated by the authority."
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            docs: [
              "Authority that can update fees"
            ],
            type: "pubkey"
          },
          {
            name: "treasury",
            docs: [
              "Treasury account that receives protocol fees"
            ],
            type: "pubkey"
          },
          {
            name: "transfer_fee_bps",
            docs: [
              "Transfer fee in basis points (e.g., 10 = 0.1%)",
              "Applied to private \u2192 private transfers"
            ],
            type: "u16"
          },
          {
            name: "unshield_fee_bps",
            docs: [
              "Unshield fee in basis points (e.g., 25 = 0.25%)",
              "Applied to private \u2192 public withdrawals"
            ],
            type: "u16"
          },
          {
            name: "swap_fee_share_bps",
            docs: [
              "Protocol's share of LP swap fees in basis points (e.g., 2000 = 20%)",
              "Protocol fee = LP fee * swap_fee_share_bps / 10000",
              "Example: 0.3% LP fee * 20% = 0.06% protocol fee"
            ],
            type: "u16"
          },
          {
            name: "remove_liquidity_fee_bps",
            docs: [
              "Remove liquidity fee in basis points (e.g., 25 = 0.25%)",
              "Applied to LP token withdrawals"
            ],
            type: "u16"
          },
          {
            name: "fees_enabled",
            docs: [
              "Whether fees are enabled (can be paused)"
            ],
            type: "bool"
          },
          {
            name: "bump",
            docs: [
              "PDA bump seed"
            ],
            type: "u8"
          },
          {
            name: "_reserved",
            docs: [
              "Reserved for future use"
            ],
            type: {
              array: [
                "u8",
                62
              ]
            }
          }
        ]
      }
    },
    {
      name: "ResolutionMode",
      docs: [
        "Resolution mode - how the outcome is determined"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "TallyBased"
          },
          {
            name: "Oracle"
          },
          {
            name: "Authority"
          }
        ]
      }
    },
    {
      name: "RevealMode",
      docs: [
        "Reveal mode - when and how vote information is revealed"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Public"
          },
          {
            name: "TimeLocked"
          },
          {
            name: "PermanentPrivate"
          }
        ]
      }
    },
    {
      name: "StoreCommitmentParams",
      docs: [
        "Parameters for storing a single commitment"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "commitment",
            docs: [
              "The commitment hash"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "leaf_index",
            docs: [
              "Leaf index (read from commitment counter before transact)"
            ],
            type: "u64"
          },
          {
            name: "stealth_ephemeral_pubkey",
            docs: [
              "Stealth ephemeral pubkey for deriving decryption key (64 bytes: X + Y)",
              "If all zeros, decrypt with original spending key (internal operations)"
            ],
            type: {
              array: [
                "u8",
                64
              ]
            }
          },
          {
            name: "encrypted_note",
            docs: [
              "Encrypted note data (Vec to avoid heap issues during deserialization)"
            ],
            type: "bytes"
          },
          {
            name: "validity_proof",
            docs: [
              "Validity proof for the commitment address (non-inclusion)"
            ],
            type: {
              defined: {
                name: "LightValidityProof"
              }
            }
          },
          {
            name: "address_tree_info",
            docs: [
              "Address tree info"
            ],
            type: {
              defined: {
                name: "LightAddressTreeInfo"
              }
            }
          },
          {
            name: "output_tree_index",
            docs: [
              "Output state tree index"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "ThresholdCommittee",
      docs: [
        "Threshold committee"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "committee_id",
            docs: [
              "Committee identifier"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "threshold_pubkey",
            docs: [
              "Combined threshold public key"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "members",
            docs: [
              "Committee members"
            ],
            type: {
              vec: "pubkey"
            }
          },
          {
            name: "threshold",
            docs: [
              "Threshold (t of n)"
            ],
            type: "u8"
          },
          {
            name: "authority",
            docs: [
              "Authority who can manage"
            ],
            type: "pubkey"
          },
          {
            name: "is_active",
            docs: [
              "Is active"
            ],
            type: "bool"
          },
          {
            name: "bump",
            docs: [
              "PDA bump"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "UpdatePoolConfigParams",
      docs: [
        "Parameters that can be updated"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "max_leverage",
            docs: [
              "Maximum leverage (1-100), None to keep current"
            ],
            type: {
              option: "u8"
            }
          },
          {
            name: "position_fee_bps",
            docs: [
              "Position fee in basis points, None to keep current"
            ],
            type: {
              option: "u16"
            }
          },
          {
            name: "max_utilization_bps",
            docs: [
              "Maximum utilization per token in basis points, None to keep current"
            ],
            type: {
              option: "u16"
            }
          },
          {
            name: "liquidation_threshold_bps",
            docs: [
              "Liquidation threshold in basis points, None to keep current"
            ],
            type: {
              option: "u16"
            }
          },
          {
            name: "liquidation_penalty_bps",
            docs: [
              "Liquidation penalty in basis points, None to keep current"
            ],
            type: {
              option: "u16"
            }
          },
          {
            name: "base_borrow_rate_bps",
            docs: [
              "Base borrow rate per hour in basis points, None to keep current"
            ],
            type: {
              option: "u16"
            }
          },
          {
            name: "max_imbalance_fee_bps",
            docs: [
              "Maximum imbalance fee in basis points, None to keep current"
            ],
            type: {
              option: "u16"
            }
          },
          {
            name: "is_active",
            docs: [
              "Pool active status, None to keep current"
            ],
            type: {
              option: "bool"
            }
          }
        ]
      }
    },
    {
      name: "VerificationKey",
      docs: [
        "Verification key for a circuit"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "circuit_id",
            docs: [
              "Circuit identifier"
            ],
            type: {
              array: [
                "u8",
                32
              ]
            }
          },
          {
            name: "vk_data",
            docs: [
              "Groth16 verification key components (serialized)",
              "Format: alpha_g1 (64) + beta_g2 (128) + gamma_g2 (128) + delta_g2 (128) + ic_len (4) + ic (64 * ic_len)"
            ],
            type: "bytes"
          },
          {
            name: "authority",
            docs: [
              "Authority who can update"
            ],
            type: "pubkey"
          },
          {
            name: "is_active",
            docs: [
              "Is active"
            ],
            type: "bool"
          },
          {
            name: "bump",
            docs: [
              "PDA bump"
            ],
            type: "u8"
          }
        ]
      }
    },
    {
      name: "VerificationLevel",
      docs: [
        "Pyth price updates are bridged to all blockchains via Wormhole.",
        "Using the price updates on another chain requires verifying the signatures of the Wormhole guardians.",
        "The usual process is to check the signatures for two thirds of the total number of guardians, but this can be cumbersome on Solana because of the transaction size limits,",
        "so we also allow for partial verification.",
        "",
        "This enum represents how much a price update has been verified:",
        "- If `Full`, we have verified the signatures for two thirds of the current guardians.",
        "- If `Partial`, only `num_signatures` guardian signatures have been checked.",
        "",
        "# Warning",
        "Using partially verified price updates is dangerous, as it lowers the threshold of guardians that need to collude to produce a malicious price update."
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Partial",
            fields: [
              {
                name: "num_signatures",
                type: "u8"
              }
            ]
          },
          {
            name: "Full"
          }
        ]
      }
    },
    {
      name: "VoteBindingMode",
      docs: [
        "Vote binding mode - how tokens participate in voting"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Snapshot"
          },
          {
            name: "SpendToVote"
          }
        ]
      }
    },
    {
      name: "VoteCommitmentMerkleContext",
      docs: [
        "Merkle context for commitment verification"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "merkle_tree_pubkey_index",
            type: "u8"
          },
          {
            name: "queue_pubkey_index",
            type: "u8"
          },
          {
            name: "leaf_index",
            type: "u32"
          },
          {
            name: "root_index",
            type: "u16"
          }
        ]
      }
    },
    {
      name: "VoteType",
      docs: [
        "Vote type - how votes are counted"
      ],
      type: {
        kind: "enum",
        variants: [
          {
            name: "Single"
          },
          {
            name: "Approval"
          },
          {
            name: "Ranked"
          },
          {
            name: "Weighted"
          }
        ]
      }
    },
    {
      name: "cloakcraft::instructions::generic::verify_commitment_exists::CommitmentMerkleContext",
      docs: [
        "Merkle context for commitment verification"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "merkle_tree_pubkey_index",
            type: "u8"
          },
          {
            name: "queue_pubkey_index",
            type: "u8"
          },
          {
            name: "leaf_index",
            type: "u32"
          },
          {
            name: "root_index",
            type: "u16"
          },
          {
            name: "prove_by_index",
            type: "bool"
          }
        ]
      }
    },
    {
      name: "cloakcraft::instructions::pool::transact::CommitmentMerkleContext",
      docs: [
        "Merkle context for verifying commitment exists in state tree"
      ],
      type: {
        kind: "struct",
        fields: [
          {
            name: "merkle_tree_pubkey_index",
            type: "u8"
          },
          {
            name: "leaf_index",
            type: "u32"
          },
          {
            name: "root_index",
            type: "u16"
          }
        ]
      }
    }
  ]
};

// src/wallet.ts
init_babyjubjub();
init_nullifier();
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
init_encryption();
init_commitment();
init_nullifier();
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
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
init_nullifier();
init_commitment();
init_stealth();
init_poseidon();

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

// src/proofs.ts
var import_web33 = require("@solana/web3.js");

// src/snarkjs-prover.ts
var BN254_FIELD_MODULUS2 = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");
var artifactsCache = /* @__PURE__ */ new Map();
function clearCircomCache() {
  artifactsCache.clear();
}
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
  const typedProof = proof;
  console.log("[snarkjs] Raw proof from snarkjs:");
  console.log("  pi_a[0] (Ax):", typedProof.pi_a[0]);
  console.log("  pi_a[1] (Ay):", typedProof.pi_a[1]);
  console.log("  pi_b[0][0] (Bx_re):", typedProof.pi_b[0][0]);
  console.log("  pi_b[0][1] (Bx_im):", typedProof.pi_b[0][1]);
  console.log("  pi_b[1][0] (By_re):", typedProof.pi_b[1][0]);
  console.log("  pi_b[1][1] (By_im):", typedProof.pi_b[1][1]);
  console.log("  pi_c[0] (Cx):", typedProof.pi_c[0]);
  console.log("  pi_c[1] (Cy):", typedProof.pi_c[1]);
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
async function generateSnarkjsProofFromCircuit(circuitName, inputs, buildDir) {
  const wasmPath = `${buildDir}/${circuitName}/${circuitName.split("/").pop()}_js/${circuitName.split("/").pop()}.wasm`;
  const zkeyPath = `${buildDir}/${circuitName}/${circuitName.split("/").pop()}_0001.zkey`;
  const artifacts = await loadCircomArtifacts(circuitName, wasmPath, zkeyPath);
  return generateSnarkjsProof(artifacts, inputs);
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
  "consolidate/3x1": "consolidate_3x1",
  "adapter/1x1": "adapter_1x1",
  "adapter/1x2": "adapter_1x2",
  "market/order_create": "market_order_create",
  "market/order_fill": "market_order_fill",
  "market/order_cancel": "market_order_cancel",
  "swap/add_liquidity": "swap_add_liquidity",
  "swap/remove_liquidity": "swap_remove_liquidity",
  "swap/swap": "swap_swap",
  // Perps circuits
  "perps/open_position": "open_position",
  "perps/close_position": "close_position",
  "perps/add_liquidity": "add_liquidity",
  "perps/remove_liquidity": "remove_liquidity",
  "perps/liquidate": "liquidate"
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
   * Clear all circuit caches
   *
   * Call this to force reloading of circuit files after they've been recompiled.
   */
  clearCache() {
    this.circuits.clear();
    this.circomArtifacts.clear();
    clearCircomCache();
  }
  /**
   * Initialize the prover with circuit artifacts
   */
  async initialize(circuitNames) {
    const circuits = circuitNames ?? [
      "transfer/1x2",
      "consolidate/3x1",
      "adapter/1x1",
      "adapter/1x2",
      "market/order_create",
      "market/order_fill",
      "market/order_cancel",
      "swap/add_liquidity",
      "swap/remove_liquidity",
      "swap/swap"
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
   *
   * Note: For circom circuits, we use on-demand loading via snarkjs.
   * The manifest/pk files are optional - if they don't exist, we skip
   * and rely on the .wasm/.zkey files being loaded during proof generation.
   */
  async loadCircuitFromFs(name) {
    if (!this.nodeConfig) {
      throw new Error("Node.js prover not configured");
    }
    const circuitFileName = CIRCUIT_FILE_MAP[name];
    if (!circuitFileName) {
      if (name.includes("/")) {
        const { wasmPath } = this.getCircomFilePaths(name);
        const fullWasmPath = path.join(this.nodeConfig.circomBuildDir, wasmPath);
        if (fs.existsSync(fullWasmPath)) {
          this.circuits.set(name, { manifest: {}, provingKey: new Uint8Array() });
          return;
        }
      }
      throw new Error(`Unknown circuit: ${name}`);
    }
    const targetDir = path.join(this.nodeConfig.circuitsDir, "target");
    const manifestPath = path.join(targetDir, `${circuitFileName}.json`);
    const pkPath = path.join(targetDir, `${circuitFileName}.pk`);
    if (!fs.existsSync(manifestPath)) {
      const { wasmPath } = this.getCircomFilePaths(name);
      const fullWasmPath = path.join(this.nodeConfig.circomBuildDir, wasmPath);
      if (fs.existsSync(fullWasmPath)) {
        this.circuits.set(name, { manifest: {}, provingKey: new Uint8Array() });
        return;
      }
      console.warn(`Circuit ${name} not found in target or build directory`);
      return;
    }
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
      "consolidate/3x1",
      "adapter/1x1",
      "adapter/1x2",
      "market/order_create",
      "market/order_fill",
      "market/order_cancel",
      "swap/add_liquidity",
      "swap/remove_liquidity",
      "swap/swap",
      // Perps circuits
      "perps/open_position",
      "perps/close_position",
      "perps/add_liquidity",
      "perps/remove_liquidity",
      "perps/liquidate"
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
    const { wasmPath, zkeyPath } = this.getCircomFilePaths(circuitName);
    const cacheBuster = "v2";
    const baseUrl = this.nodeConfig?.circomBuildDir ?? this.circomBaseUrl;
    const wasmUrl = `${baseUrl}/${wasmPath}?${cacheBuster}`;
    const zkeyUrl = `${baseUrl}/${zkeyPath}?${cacheBuster}`;
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
   * Get circom file paths from circuit name
   * WASM files are in {name}_js/ subdirectories, zkey files are directly in the parent dir
   *
   * Examples:
   *   transfer/1x2: wasm=transfer_1x2_js/transfer_1x2.wasm, zkey=transfer_1x2_final.zkey
   *   perps/open_position: wasm=perps/open_position_js/open_position.wasm, zkey=perps/open_position_final.zkey
   */
  getCircomFilePaths(circuitName) {
    const mapping = {
      // Transfer circuits
      "transfer/1x2": { wasmPath: "transfer_1x2_js/transfer_1x2.wasm", zkeyPath: "transfer_1x2_final.zkey" },
      // Consolidation circuits
      "consolidate/3x1": { wasmPath: "consolidate_3x1/consolidate_3x1_js/consolidate_3x1.wasm", zkeyPath: "consolidate_3x1/consolidate_3x1_final.zkey" },
      // Swap/AMM circuits
      "swap/swap": { wasmPath: "swap_js/swap.wasm", zkeyPath: "swap_final.zkey" },
      "swap/add_liquidity": { wasmPath: "add_liquidity_js/add_liquidity.wasm", zkeyPath: "add_liquidity_final.zkey" },
      "swap/remove_liquidity": { wasmPath: "remove_liquidity_js/remove_liquidity.wasm", zkeyPath: "remove_liquidity_final.zkey" },
      // Perps circuits
      "perps/open_position": { wasmPath: "perps/open_position_js/open_position.wasm", zkeyPath: "perps/open_position_final.zkey" },
      "perps/close_position": { wasmPath: "perps/close_position_js/close_position.wasm", zkeyPath: "perps/close_position_final.zkey" },
      "perps/add_liquidity": { wasmPath: "perps/add_liquidity_js/add_liquidity.wasm", zkeyPath: "perps/add_liquidity_final.zkey" },
      "perps/remove_liquidity": { wasmPath: "perps/remove_liquidity_js/remove_liquidity.wasm", zkeyPath: "perps/remove_liquidity_final.zkey" },
      "perps/liquidate": { wasmPath: "perps/liquidate_js/liquidate.wasm", zkeyPath: "perps/liquidate_final.zkey" },
      // Voting circuits
      "voting/vote_snapshot": { wasmPath: "voting/vote_snapshot_js/vote_snapshot.wasm", zkeyPath: "voting/vote_snapshot_final.zkey" },
      "voting/change_vote_snapshot": { wasmPath: "voting/change_vote_snapshot_js/change_vote_snapshot.wasm", zkeyPath: "voting/change_vote_snapshot_final.zkey" },
      "voting/vote_spend": { wasmPath: "voting/vote_spend_js/vote_spend.wasm", zkeyPath: "voting/vote_spend_final.zkey" },
      "voting/close_position": { wasmPath: "voting/close_position_js/close_position.wasm", zkeyPath: "voting/close_position_final.zkey" },
      "voting/claim": { wasmPath: "voting/claim_js/claim.wasm", zkeyPath: "voting/claim_final.zkey" }
    };
    if (mapping[circuitName]) {
      return mapping[circuitName];
    }
    const baseName = circuitName.replace("/", "_");
    return {
      wasmPath: `${baseName}_js/${baseName}.wasm`,
      zkeyPath: `${baseName}_final.zkey`
    };
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
      transfer_amount: params.outputs[0].amount.toString(),
      // NEW: Public for on-chain fee verification
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
  // =============================================================================
  // Perpetual Futures Proof Generation
  // =============================================================================
  /**
   * Generate proof for opening a perps position
   *
   * Circuit proves:
   * - Ownership of margin commitment
   * - Correct nullifier derivation
   * - Correct position commitment computation
   * - Balance check: input = margin + fee
   */
  async generateOpenPositionProof(params, keypair) {
    const circuitName = "perps/open_position";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`${circuitName} circuit not loaded. Circuits need to be compiled first.`);
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
    const nullifier = deriveSpendingNullifier(effectiveNullifierKey, inputCommitment, params.input.leafIndex);
    const positionRandomness = generateRandomness();
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? params.input.tokenMint : params.input.tokenMint.toBytes();
    const totalRequired = params.marginAmount + params.positionFee;
    const changeAmount = params.input.amount - totalRequired;
    console.log("[OpenPosition] Change amount debug:");
    console.log("  input.amount:", params.input.amount.toString());
    console.log("  marginAmount:", params.marginAmount.toString());
    console.log("  positionFee:", params.positionFee.toString());
    console.log("  totalRequired:", totalRequired.toString());
    console.log("  changeAmount:", changeAmount.toString());
    console.log("  changeAmount > 0n:", changeAmount > 0n);
    if (changeAmount < 0n) {
      throw new Error(
        `Insufficient input amount: input (${params.input.amount}) < required (${totalRequired}). Need at least ${totalRequired} to cover margin (${params.marginAmount}) + fee (${params.positionFee}).`
      );
    }
    const changeRandomness = generateRandomness();
    let changeCommitment;
    if (changeAmount > 0n) {
      const COMMITMENT_DOMAIN = 1n;
      console.log("[OpenPosition] Computing change commitment:");
      console.log("  stealthPubX:", Buffer.from(params.input.stealthPubX).toString("hex").slice(0, 16) + "...");
      console.log("  tokenMint:", Buffer.from(tokenMint).toString("hex").slice(0, 16) + "...");
      console.log("  changeAmount (bigint):", changeAmount.toString());
      console.log("  changeAmount (bytes):", Buffer.from(fieldToBytes(changeAmount)).toString("hex").slice(0, 16) + "...");
      console.log("  changeRandomness:", Buffer.from(changeRandomness).toString("hex").slice(0, 16) + "...");
      changeCommitment = poseidonHashDomain(
        COMMITMENT_DOMAIN,
        params.input.stealthPubX,
        tokenMint,
        fieldToBytes(changeAmount),
        changeRandomness
      );
      console.log("  computed changeCommitment:", Buffer.from(changeCommitment).toString("hex"));
    } else {
      changeCommitment = new Uint8Array(32);
      console.log("[OpenPosition] No change (changeAmount <= 0), using zero commitment");
    }
    const POSITION_COMMITMENT_DOMAIN2 = 8n;
    const stage1 = poseidonHashDomain(
      POSITION_COMMITMENT_DOMAIN2,
      params.input.stealthPubX,
      fieldToBytes(params.marketId),
      fieldToBytes(BigInt(params.isLong ? 1 : 0)),
      fieldToBytes(params.marginAmount)
    );
    const positionCommitment = poseidonHash([
      stage1,
      fieldToBytes(params.positionSize),
      fieldToBytes(BigInt(params.leverage)),
      fieldToBytes(params.entryPrice),
      positionRandomness
    ]);
    const merklePath = [...params.merklePath];
    while (merklePath.length < 32) {
      merklePath.push(new Uint8Array(32));
    }
    const merkleIndices = [...params.merkleIndices];
    while (merkleIndices.length < 32) {
      merkleIndices.push(0);
    }
    console.log("[OpenPosition] market_id debug:");
    console.log("  params.marketId (bigint):", params.marketId.toString());
    console.log("  params.marketId (hex):", "0x" + params.marketId.toString(16).padStart(64, "0"));
    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      // IMPORTANT: Use pubkeyToField to match on-chain pubkey_to_field reduction
      perps_pool_id: fieldToHex(pubkeyToField(new import_web33.PublicKey(params.perpsPoolId))),
      // IMPORTANT: market_id is already reduced by bytesToField in client.ts, convert to hex format
      market_id: "0x" + params.marketId.toString(16).padStart(64, "0"),
      position_commitment: fieldToHex(positionCommitment),
      change_commitment: fieldToHex(changeCommitment),
      is_long: params.isLong ? "1" : "0",
      margin_amount: params.marginAmount.toString(),
      leverage: params.leverage.toString(),
      position_fee: params.positionFee.toString(),
      change_amount: changeAmount.toString(),
      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),
      token_mint: fieldToHex(tokenMint),
      merkle_path: merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map((i) => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      position_size: params.positionSize.toString(),
      entry_price: params.entryPrice.toString(),
      position_randomness: fieldToHex(positionRandomness),
      change_randomness: fieldToHex(changeRandomness)
    };
    console.log("[OpenPosition] Public inputs for circuit:");
    console.log("  merkle_root:", witnessInputs.merkle_root);
    console.log("  nullifier:", witnessInputs.nullifier);
    console.log("  perps_pool_id:", witnessInputs.perps_pool_id);
    console.log("  market_id:", witnessInputs.market_id);
    console.log("  position_commitment:", witnessInputs.position_commitment);
    console.log("  change_commitment:", witnessInputs.change_commitment);
    const proof = await this.prove(circuitName, witnessInputs);
    return {
      proof,
      nullifier,
      positionCommitment,
      positionRandomness,
      changeCommitment,
      changeRandomness,
      changeAmount
    };
  }
  /**
   * Generate proof for closing a perps position
   *
   * Circuit proves:
   * - Ownership of position commitment
   * - Correct nullifier derivation
   * - Correct settlement calculation (margin +/- PnL - fees)
   * - Bounded profit (max profit = margin)
   */
  async generateClosePositionProof(params, keypair) {
    const circuitName = "perps/close_position";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`${circuitName} circuit not loaded. Circuits need to be compiled first.`);
    }
    const effectiveNullifierKey = deriveNullifierKey(params.position.spendingKey);
    const POSITION_COMMITMENT_DOMAIN2 = 8n;
    const stage1 = poseidonHashDomain(
      POSITION_COMMITMENT_DOMAIN2,
      params.position.stealthPubX,
      fieldToBytes(params.position.marketId),
      fieldToBytes(BigInt(params.position.isLong ? 1 : 0)),
      fieldToBytes(params.position.margin)
    );
    const positionCommitment = poseidonHash([
      stage1,
      fieldToBytes(params.position.size),
      fieldToBytes(BigInt(params.position.leverage)),
      fieldToBytes(params.position.entryPrice),
      params.position.randomness
    ]);
    const positionNullifier = deriveSpendingNullifier(
      effectiveNullifierKey,
      positionCommitment,
      params.position.leafIndex
    );
    let settlementAmount;
    if (params.isProfit) {
      const cappedPnl = params.pnlAmount > params.position.margin ? params.position.margin : params.pnlAmount;
      settlementAmount = params.position.margin + cappedPnl - params.closeFee;
    } else {
      settlementAmount = params.position.margin - params.pnlAmount - params.closeFee;
    }
    if (settlementAmount < 0n) {
      settlementAmount = 0n;
    }
    const settlementRandomness = generateRandomness();
    const settlementCommitment = computeCommitment({
      stealthPubX: params.settlementRecipient.stealthPubkey.x,
      tokenMint: params.tokenMint,
      amount: settlementAmount,
      randomness: settlementRandomness
    });
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
      position_nullifier: fieldToHex(positionNullifier),
      // IMPORTANT: Use pubkeyToField to match on-chain pubkey_to_field reduction
      perps_pool_id: fieldToHex(pubkeyToField(new import_web33.PublicKey(params.perpsPoolId))),
      out_commitment: fieldToHex(settlementCommitment),
      is_long: params.position.isLong ? "1" : "0",
      exit_price: params.exitPrice.toString(),
      close_fee: params.closeFee.toString(),
      pnl_amount: params.pnlAmount.toString(),
      is_profit: params.isProfit ? "1" : "0",
      // Private inputs
      position_stealth_pub_x: fieldToHex(params.position.stealthPubX),
      // IMPORTANT: market_id must be in hex format to match circuit expectations
      market_id: "0x" + params.position.marketId.toString(16).padStart(64, "0"),
      position_margin: params.position.margin.toString(),
      position_size: params.position.size.toString(),
      position_leverage: params.position.leverage.toString(),
      entry_price: params.position.entryPrice.toString(),
      position_randomness: fieldToHex(params.position.randomness),
      position_spending_key: fieldToHex(params.position.spendingKey),
      merkle_path: merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map((i) => i.toString()),
      leaf_index: params.position.leafIndex.toString(),
      out_stealth_pub_x: fieldToHex(params.settlementRecipient.stealthPubkey.x),
      out_token_mint: fieldToHex(params.tokenMint),
      out_amount: settlementAmount.toString(),
      out_randomness: fieldToHex(settlementRandomness)
    };
    const proof = await this.prove(circuitName, witnessInputs);
    return {
      proof,
      positionNullifier,
      settlementCommitment,
      settlementRandomness,
      settlementAmount
    };
  }
  /**
   * Generate proof for adding perps liquidity (single token deposit)
   *
   * Circuit proves:
   * - Ownership of deposit commitment
   * - Correct nullifier derivation
   * - Correct LP commitment computation
   * - Balance check: input = deposit + fee
   */
  async generateAddPerpsLiquidityProof(params, keypair) {
    const circuitName = "perps/add_liquidity";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`${circuitName} circuit not loaded. Circuits need to be compiled first.`);
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
    const nullifier = deriveSpendingNullifier(effectiveNullifierKey, inputCommitment, params.input.leafIndex);
    const lpRandomness = generateRandomness();
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? params.input.tokenMint : params.input.tokenMint.toBytes();
    const LP_COMMITMENT_DOMAIN2 = 9n;
    const lpCommitment = poseidonHashDomain(
      LP_COMMITMENT_DOMAIN2,
      params.lpRecipient.stealthPubkey.x,
      params.perpsPoolId,
      fieldToBytes(params.lpAmountMinted),
      lpRandomness
    );
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
      // IMPORTANT: Use pubkeyToField to match on-chain pubkey_to_field reduction
      perps_pool_id: fieldToHex(pubkeyToField(new import_web33.PublicKey(params.perpsPoolId))),
      lp_commitment: fieldToHex(lpCommitment),
      token_index: params.tokenIndex.toString(),
      deposit_amount: params.depositAmount.toString(),
      lp_amount_minted: params.lpAmountMinted.toString(),
      fee_amount: params.feeAmount.toString(),
      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),
      token_mint: fieldToHex(tokenMint),
      merkle_path: merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map((i) => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      lp_stealth_pub_x: fieldToHex(params.lpRecipient.stealthPubkey.x),
      lp_randomness: fieldToHex(lpRandomness)
    };
    const proof = await this.prove(circuitName, witnessInputs);
    return {
      proof,
      nullifier,
      lpCommitment,
      lpRandomness
    };
  }
  /**
   * Generate proof for removing perps liquidity
   *
   * Circuit proves:
   * - Ownership of LP commitment
   * - Correct LP nullifier derivation
   * - Correct output token commitment
   * - Correct change LP commitment
   * - LP balance: lp_amount = burned + change
   */
  async generateRemovePerpsLiquidityProof(params, keypair) {
    const circuitName = "perps/remove_liquidity";
    if (!this.hasCircuit(circuitName)) {
      throw new Error(`${circuitName} circuit not loaded. Circuits need to be compiled first.`);
    }
    const effectiveNullifierKey = deriveNullifierKey(params.lpInput.spendingKey);
    const LP_COMMITMENT_DOMAIN2 = 9n;
    const lpCommitment = poseidonHashDomain(
      LP_COMMITMENT_DOMAIN2,
      params.lpInput.stealthPubX,
      params.perpsPoolId,
      fieldToBytes(params.lpInput.lpAmount),
      params.lpInput.randomness
    );
    const lpNullifier = deriveSpendingNullifier(
      effectiveNullifierKey,
      lpCommitment,
      params.lpInput.leafIndex
    );
    const outputRandomness = generateRandomness();
    const changeLpRandomness = generateRandomness();
    const outputCommitment = computeCommitment({
      stealthPubX: params.outputRecipient.stealthPubkey.x,
      tokenMint: params.outputTokenMint,
      amount: params.withdrawAmount,
      randomness: outputRandomness
    });
    const changeLpCommitment = poseidonHashDomain(
      LP_COMMITMENT_DOMAIN2,
      params.lpInput.stealthPubX,
      // Same owner
      params.perpsPoolId,
      fieldToBytes(params.changeLpAmount),
      changeLpRandomness
    );
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
      lp_nullifier: fieldToHex(lpNullifier),
      // IMPORTANT: Use pubkeyToField to match on-chain pubkey_to_field reduction
      perps_pool_id: fieldToHex(pubkeyToField(new import_web33.PublicKey(params.perpsPoolId))),
      out_commitment: fieldToHex(outputCommitment),
      token_index: params.tokenIndex.toString(),
      withdraw_amount: params.withdrawAmount.toString(),
      lp_amount_burned: params.lpAmountBurned.toString(),
      fee_amount: params.feeAmount.toString(),
      // Private inputs
      lp_stealth_pub_x: fieldToHex(params.lpInput.stealthPubX),
      lp_amount: params.lpInput.lpAmount.toString(),
      lp_randomness: fieldToHex(params.lpInput.randomness),
      lp_spending_key: fieldToHex(params.lpInput.spendingKey),
      merkle_path: merklePath.map((p) => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map((i) => i.toString()),
      leaf_index: params.lpInput.leafIndex.toString(),
      out_stealth_pub_x: fieldToHex(params.outputRecipient.stealthPubkey.x),
      out_token_mint: fieldToHex(params.outputTokenMint),
      out_randomness: fieldToHex(outputRandomness),
      change_lp_commitment: fieldToHex(changeLpCommitment),
      change_lp_amount: params.changeLpAmount.toString(),
      change_lp_randomness: fieldToHex(changeLpRandomness)
    };
    const proof = await this.prove(circuitName, witnessInputs);
    return {
      proof,
      lpNullifier,
      outputCommitment,
      changeLpCommitment,
      outputRandomness,
      changeLpRandomness
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

// src/client.ts
init_commitment();
init_poseidon();
init_nullifier();
init_stealth();
init_light();

// src/pyth.ts
var PYTH_FEED_IDS = {
  /** SOL/USD price feed */
  SOL_USD: new Uint8Array([
    239,
    13,
    139,
    111,
    218,
    44,
    235,
    164,
    29,
    161,
    93,
    64,
    149,
    209,
    218,
    57,
    42,
    13,
    47,
    142,
    208,
    198,
    199,
    188,
    15,
    76,
    250,
    200,
    194,
    128,
    181,
    109
  ]),
  /** BTC/USD price feed */
  BTC_USD: new Uint8Array([
    230,
    45,
    246,
    200,
    180,
    168,
    95,
    225,
    166,
    125,
    180,
    77,
    193,
    45,
    229,
    219,
    51,
    15,
    122,
    198,
    107,
    114,
    220,
    101,
    138,
    254,
    223,
    15,
    74,
    65,
    91,
    67
  ]),
  /** ETH/USD price feed */
  ETH_USD: new Uint8Array([
    255,
    97,
    73,
    26,
    147,
    17,
    18,
    221,
    241,
    189,
    129,
    71,
    205,
    27,
    100,
    19,
    117,
    247,
    159,
    88,
    37,
    18,
    109,
    102,
    84,
    128,
    135,
    70,
    52,
    253,
    10,
    206
  ]),
  /** USDC/USD price feed */
  USDC_USD: new Uint8Array([
    234,
    160,
    32,
    198,
    28,
    196,
    121,
    113,
    42,
    53,
    122,
    181,
    228,
    199,
    154,
    152,
    237,
    151,
    158,
    212,
    48,
    36,
    247,
    80,
    86,
    190,
    45,
    184,
    191,
    106,
    67,
    88
  ])
};
function feedIdToHex(feedId) {
  return "0x" + Array.from(feedId).map((b) => b.toString(16).padStart(2, "0")).join("");
}
var PythPriceService = class {
  constructor(_connection, hermesUrl = "https://hermes.pyth.network") {
    this.hermesUrl = hermesUrl;
  }
  /**
   * Get the current price from Hermes API
   *
   * @param feedId - The Pyth feed ID (e.g., PYTH_FEED_IDS.BTC_USD)
   * @returns The current price with metadata
   */
  async getPrice(feedId) {
    const feedIdHex = feedIdToHex(feedId);
    const response = await fetch(
      `${this.hermesUrl}/v2/updates/price/latest?ids[]=${feedIdHex}`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data?.parsed?.length) {
      throw new Error(`No price available for feed ${feedIdHex}`);
    }
    const parsed = data.parsed[0].price;
    return {
      price: BigInt(parsed.price),
      confidence: BigInt(parsed.conf),
      expo: parsed.expo,
      publishTime: parsed.publish_time
    };
  }
  /**
   * Get price in USD with decimals normalized
   *
   * @param feedId - The Pyth feed ID
   * @param decimals - Desired decimal places (default 9 for Solana token standard)
   * @returns Price in USD * 10^decimals
   */
  async getPriceUsd(feedId, decimals = 9) {
    const { price, expo } = await this.getPrice(feedId);
    const expoAdjustment = decimals + expo;
    if (expoAdjustment >= 0) {
      return price * BigInt(10 ** expoAdjustment);
    } else {
      return price / BigInt(10 ** -expoAdjustment);
    }
  }
  /**
   * Get the VAA (Verified Action Approval) data for posting on-chain
   *
   * Returns the raw binary data that can be used with Pyth Receiver program
   * to post a price update on-chain.
   *
   * @param feedId - The Pyth feed ID
   * @returns The VAA binary data as base64 string
   */
  async getVaaData(feedId) {
    const feedIdHex = feedIdToHex(feedId);
    const response = await fetch(
      `${this.hermesUrl}/v2/updates/price/latest?ids[]=${feedIdHex}&encoding=base64`
    );
    if (!response.ok) {
      throw new Error(`Failed to fetch VAA: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data?.binary?.data?.length) {
      throw new Error(`No VAA available for feed ${feedIdHex}`);
    }
    return data.binary.data;
  }
};
var defaultPythService = null;
function getPythService(connection) {
  if (!defaultPythService) {
    defaultPythService = new PythPriceService(connection);
  }
  return defaultPythService;
}

// src/instructions/index.ts
init_constants();
init_light_helpers();
init_shield();

// src/instructions/transact.ts
var import_web39 = require("@solana/web3.js");
var import_spl_token3 = require("@solana/spl-token");
var import_bn3 = __toESM(require("bn.js"));
init_constants();
init_light_helpers();
init_commitment();
init_encryption();
init_nullifier();
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
  const { generateOperationId: generateOperationId3, derivePendingOperationPda: derivePendingOperationPda3 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
  const operationId = generateOperationId3(
    nullifier,
    outputCommitments[0],
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda3(operationId, programId);
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
  const commitmentTree = new import_web39.PublicKey(commitmentProof.treeInfo.tree);
  const commitmentQueue = new import_web39.PublicKey(commitmentProof.treeInfo.queue);
  console.log("[Transact] Fetching inclusion validity proof...");
  const inclusionValidityProof = await lightProtocol.getInclusionValidityProof(
    params.input.accountHash,
    commitmentTree,
    commitmentQueue
  );
  const proveByIndex = inclusionValidityProof.proveByIndices?.[0] ?? true;
  console.log("[Transact] proveByIndex:", proveByIndex);
  console.log("[Transact] Fetching nullifier non-inclusion proof...");
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const commitmentCpiContext = commitmentProof.treeInfo.cpiContext ? new import_web39.PublicKey(commitmentProof.treeInfo.cpiContext) : null;
  const { SystemAccountMetaConfig: SystemAccountMetaConfig2, PackedAccounts: PackedAccounts2 } = await import("@lightprotocol/stateless.js");
  const { DEVNET_V2_TREES: DEVNET_V2_TREES2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
  const systemConfig = SystemAccountMetaConfig2.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts2.newWithSystemAccountsV2(systemConfig);
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
    commitmentAccountHash: Array.from(new import_web39.PublicKey(params.input.accountHash).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentStateTreeIndex,
      // STATE tree from proof (for data/merkle verification)
      queuePubkeyIndex: commitmentQueueIndex,
      // Queue from proof
      leafIndex: inclusionValidityProof.leafIndices?.[0] ?? commitmentProof.leafIndex,
      rootIndex: inclusionValidityProof.rootIndices?.[0] ?? commitmentProof.rootIndex,
      proveByIndex
    },
    // SECURITY: Convert commitment inclusion proof (compressed ZK proof from validity proof)
    commitmentInclusionProof: LightProtocol.convertCompressedProof(inclusionValidityProof),
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
  const transferAmountForInstruction = outputAmounts[0] ?? 0n;
  const unshieldAmountForInstruction = params.unshieldAmount ?? 0n;
  const feeAmountForInstruction = params.feeAmount ?? 0n;
  console.log("[Phase 0] transfer_amount for instruction:", transferAmountForInstruction.toString());
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
  console.log(`  [${3 + outputCommitments.length}] transfer_amount:`, transferAmountForInstruction.toString());
  console.log(`  [${4 + outputCommitments.length}] unshield_amount:`, unshieldAmountForInstruction.toString());
  console.log(`  [${5 + outputCommitments.length}] fee_amount:`, feeAmountForInstruction.toString());
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
    outputAmounts.map((a) => new import_bn3.default(a.toString())),
    outputRandomness.map((r) => Array.from(r)),
    stealthEphemeralPubkeys.map((e) => Array.from(e)),
    new import_bn3.default(transferAmountForInstruction.toString()),
    new import_bn3.default(unshieldAmountForInstruction.toString()),
    new import_bn3.default(feeAmountForInstruction.toString())
  ).accountsStrict({
    pool: poolPda,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: new import_web39.PublicKey("11111111111111111111111111111111")
  }).preInstructions([
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 45e4 }),
    // Reduced: smaller PDA (192 bytes saved) = less serialization
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    // Light Protocol inclusion proof (simple CPI)
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    // Light Protocol non-inclusion proof (simple CPI)
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
      tokenProgram: import_spl_token3.TOKEN_PROGRAM_ID
    };
    const phase3PreInstructions = [
      import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 15e4 }),
      // Increased for fee transfer
      import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
    ];
    if (params.treasuryWallet && params.treasuryTokenAccount && params.feeAmount && params.feeAmount > 0n) {
      console.log("[Phase 3] Adding create treasury ATA instruction (idempotent)");
      phase3PreInstructions.push(
        (0, import_spl_token3.createAssociatedTokenAccountIdempotentInstruction)(
          params.relayer,
          // payer
          params.treasuryTokenAccount,
          // associated token account
          params.treasuryWallet,
          // owner
          params.tokenMint,
          // mint
          import_spl_token3.TOKEN_PROGRAM_ID,
          import_spl_token3.ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }
    phase3Tx = await program.methods.processUnshield(
      Array.from(operationId),
      new import_bn3.default(unshieldAmountForInstruction.toString())
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
  const { generateOperationId: generateOperationId3, derivePendingOperationPda: derivePendingOperationPda3 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
  const operationId = generateOperationId3(
    params.nullifiers[0],
    params.outputCommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda3(operationId, programId);
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
  const { SystemAccountMetaConfig: SystemAccountMetaConfig2, PackedAccounts: PackedAccounts2 } = await import("@lightprotocol/stateless.js");
  const { DEVNET_V2_TREES: DEVNET_V2_TREES2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
  const systemConfig = SystemAccountMetaConfig2.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts2.newWithSystemAccountsV2(systemConfig);
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES2.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES2.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const inputProofs = await Promise.all(
    params.inputs.map(async (input, i) => {
      console.log(`[Consolidation] Fetching proof for input ${i}: ${input.accountHash}`);
      const commitmentProof = await lightProtocol.getInclusionProofByHash(input.accountHash);
      const commitmentTree = new import_web39.PublicKey(commitmentProof.treeInfo.tree);
      const commitmentQueue = new import_web39.PublicKey(commitmentProof.treeInfo.queue);
      const treeIndex = packedAccounts.insertOrGet(commitmentTree);
      const queueIndex = packedAccounts.insertOrGet(commitmentQueue);
      if (commitmentProof.treeInfo.cpiContext) {
        packedAccounts.insertOrGet(new import_web39.PublicKey(commitmentProof.treeInfo.cpiContext));
      }
      const inclusionValidityProof = await lightProtocol.getInclusionValidityProof(
        input.accountHash,
        commitmentTree,
        commitmentQueue
      );
      const proveByIndex = inclusionValidityProof.proveByIndices?.[0] ?? true;
      return {
        commitmentProof,
        inclusionValidityProof,
        proveByIndex,
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
    new import_bn3.default(params.outputAmount.toString()),
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
    systemProgram: new import_web39.PublicKey("11111111111111111111111111111111")
  }).preInstructions([
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 45e4 }),
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  const phase1Txs = await Promise.all(
    params.inputs.map(async (input, i) => {
      const proof = inputProofs[i];
      const lightParams = {
        commitmentAccountHash: Array.from(new import_web39.PublicKey(input.accountHash).toBytes()),
        commitmentMerkleContext: {
          merkleTreePubkeyIndex: proof.treeIndex,
          queuePubkeyIndex: proof.queueIndex,
          leafIndex: proof.inclusionValidityProof.leafIndices?.[0] ?? proof.commitmentProof.leafIndex,
          rootIndex: proof.inclusionValidityProof.rootIndices?.[0] ?? proof.commitmentProof.rootIndex,
          proveByIndex: proof.proveByIndex
        },
        commitmentInclusionProof: LightProtocol.convertCompressedProof(proof.inclusionValidityProof),
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
        import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
        import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
var import_web310 = require("@solana/web3.js");
var import_bn4 = __toESM(require("bn.js"));
init_constants();
init_light_helpers();
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
    leafIndex: new import_bn4.default(params.leafIndex.toString()),
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
    import_web310.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web310.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
init_constants();
async function buildInitializePoolWithProgram(program, params) {
  const programId = program.programId;
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const tx = await program.methods.initializePool().accountsPartial({
    pool: poolPda,
    tokenVault: vaultPda,
    tokenMint: params.tokenMint,
    authority: params.authority,
    payer: params.payer
  });
  return tx;
}
async function buildInitializeCommitmentCounterWithProgram(program, params) {
  const programId = program.programId;
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);
  const tx = await program.methods.initializeCommitmentCounter().accountsPartial({
    pool: poolPda,
    commitmentCounter: counterPda,
    authority: params.authority,
    payer: params.payer
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

// src/instructions/index.ts
init_swap();

// src/instructions/market.ts
var import_web311 = require("@solana/web3.js");
init_constants();
init_light_helpers();
init_commitment();
init_encryption();
function deriveOrderPda(orderId, programId) {
  return import_web311.PublicKey.findProgramAddressSync(
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
    import_web311.ComputeBudgetProgram.setComputeUnitLimit({ units: 1e6 }),
    import_web311.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    import_web311.ComputeBudgetProgram.setComputeUnitLimit({ units: 8e5 }),
    import_web311.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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

// src/perps/types.ts
var MAX_PERPS_TOKENS = 8;

// src/perps/calculations.ts
function calculatePnL(position, currentPrice, pool, currentTimestamp) {
  const { margin, size, entryPrice, direction, entryBorrowFee } = position;
  let pnl;
  let isProfit;
  if (direction === "long") {
    if (currentPrice > entryPrice) {
      pnl = (currentPrice - entryPrice) * size / entryPrice;
      isProfit = true;
    } else {
      pnl = (entryPrice - currentPrice) * size / entryPrice;
      isProfit = false;
    }
  } else {
    if (currentPrice < entryPrice) {
      pnl = (entryPrice - currentPrice) * size / entryPrice;
      isProfit = true;
    } else {
      pnl = (currentPrice - entryPrice) * size / entryPrice;
      isProfit = false;
    }
  }
  const borrowFees = calculateBorrowFees(position, pool, currentTimestamp);
  let boundedPnl = pnl;
  let atProfitBound = false;
  if (isProfit && pnl >= margin) {
    boundedPnl = margin;
    atProfitBound = true;
  }
  const effectiveMargin = isProfit ? margin + boundedPnl - borrowFees : margin - pnl - borrowFees;
  const pnlBps = Number((isProfit ? boundedPnl : -pnl) * 10000n / margin);
  const settlementAmount = effectiveMargin > 0n ? effectiveMargin : 0n;
  const liquidationThreshold = margin * BigInt(pool.liquidationThresholdBps) / 10000n;
  const isLiquidatable = effectiveMargin < liquidationThreshold;
  return {
    pnl: isProfit ? boundedPnl : -pnl,
    isProfit,
    pnlBps,
    effectiveMargin,
    borrowFees,
    settlementAmount,
    atProfitBound,
    isLiquidatable
  };
}
function calculateBorrowFees(position, pool, currentTimestamp) {
  const token = pool.tokens[0];
  if (!token || !token.isActive) {
    return 0n;
  }
  const feeDelta = token.cumulativeBorrowFee - position.entryBorrowFee;
  const borrowFee = position.size * feeDelta / BigInt(1e18);
  return borrowFee;
}
function calculateLiquidationPrice(position, pool, currentTimestamp) {
  const { margin, size, entryPrice, direction } = position;
  const liquidationThreshold = margin * BigInt(pool.liquidationThresholdBps) / 10000n;
  const currentBorrowFees = calculateBorrowFees(position, pool, currentTimestamp);
  const availableForLoss = margin - liquidationThreshold - currentBorrowFees;
  if (availableForLoss <= 0n) {
    return {
      price: entryPrice,
      distanceBps: 0
    };
  }
  const priceDiff = availableForLoss * entryPrice / size;
  let liquidationPrice;
  if (direction === "long") {
    liquidationPrice = entryPrice - priceDiff;
    if (liquidationPrice < 0n) liquidationPrice = 0n;
  } else {
    liquidationPrice = entryPrice + priceDiff;
  }
  const distanceBps = Number(
    (direction === "long" ? entryPrice - liquidationPrice : liquidationPrice - entryPrice) * 10000n / entryPrice
  );
  return {
    price: liquidationPrice,
    distanceBps
  };
}
function calculatePositionFee(positionSize, feeBps) {
  return positionSize * BigInt(feeBps) / 10000n;
}
function calculateImbalanceFee(market, positionSize, isLong) {
  const { longOpenInterest, shortOpenInterest } = market;
  const totalOI = longOpenInterest + shortOpenInterest;
  if (totalOI === 0n) {
    return 0n;
  }
  const imbalance = longOpenInterest > shortOpenInterest ? longOpenInterest - shortOpenInterest : shortOpenInterest - longOpenInterest;
  const imbalanceRatio = imbalance * 10000n / totalOI;
  const isMinority = isLong && shortOpenInterest > longOpenInterest || !isLong && longOpenInterest > shortOpenInterest;
  if (isMinority) {
    return 0n;
  }
  const feeBps = Number(imbalanceRatio * 3n / 10000n);
  const cappedFeeBps = Math.min(feeBps, 3);
  return positionSize * BigInt(cappedFeeBps) / 10000n;
}
function calculateLpValue(pool, oraclePrices) {
  let totalValueUsd = 0n;
  const tokenValues = [];
  for (let i = 0; i < pool.numTokens; i++) {
    const token = pool.tokens[i];
    if (!token || !token.isActive) continue;
    const price = oraclePrices[i] ?? 0n;
    const valueUsd = token.balance * price / BigInt(10 ** token.decimals);
    tokenValues.push({
      mint: token.mint,
      balance: token.balance,
      priceUsd: price,
      valueUsd
    });
    totalValueUsd += valueUsd;
  }
  const valuePerLp = pool.lpSupply > 0n ? totalValueUsd * BigInt(1e6) / pool.lpSupply : 0n;
  return {
    totalValueUsd,
    valuePerLp,
    tokenValues
  };
}
function calculateLpMintAmount(pool, depositAmount, tokenIndex, oraclePrices) {
  const token = pool.tokens[tokenIndex];
  if (!token || !token.isActive) {
    throw new Error(`Invalid token index: ${tokenIndex}`);
  }
  const depositValueUsd = depositAmount * oraclePrices[tokenIndex] / BigInt(10 ** token.decimals);
  if (pool.lpSupply === 0n) {
    return depositValueUsd;
  }
  const { totalValueUsd } = calculateLpValue(pool, oraclePrices);
  if (totalValueUsd === 0n) {
    return depositValueUsd;
  }
  return depositValueUsd * pool.lpSupply / totalValueUsd;
}
function calculateWithdrawAmount(pool, lpAmount, tokenIndex, oraclePrices) {
  const token = pool.tokens[tokenIndex];
  if (!token || !token.isActive) {
    throw new Error(`Invalid token index: ${tokenIndex}`);
  }
  const { totalValueUsd } = calculateLpValue(pool, oraclePrices);
  if (totalValueUsd === 0n || pool.lpSupply === 0n) {
    return 0n;
  }
  const withdrawValueUsd = lpAmount * totalValueUsd / pool.lpSupply;
  const price = oraclePrices[tokenIndex];
  if (price === 0n) {
    throw new Error(`No price for token index: ${tokenIndex}`);
  }
  return withdrawValueUsd * BigInt(10 ** token.decimals) / price;
}
function calculateMaxWithdrawable(pool, tokenIndex, lpAmount, oraclePrices) {
  const token = pool.tokens[tokenIndex];
  if (!token || !token.isActive) {
    throw new Error(`Invalid token index: ${tokenIndex}`);
  }
  const availableBalance = token.balance - token.locked;
  const withdrawAmount = calculateWithdrawAmount(pool, lpAmount, tokenIndex, oraclePrices);
  const maxAmount = withdrawAmount > availableBalance ? availableBalance : withdrawAmount;
  const newBalance = token.balance - maxAmount;
  const utilizationAfter = newBalance > 0n ? Number(token.locked * 10000n / newBalance) : 1e4;
  const lpRequired = calculateLpForWithdrawal(pool, maxAmount, tokenIndex, oraclePrices);
  return {
    maxAmount,
    utilizationAfter,
    lpRequired
  };
}
function calculateLpForWithdrawal(pool, withdrawAmount, tokenIndex, oraclePrices) {
  const token = pool.tokens[tokenIndex];
  if (!token || !token.isActive) {
    return 0n;
  }
  const { totalValueUsd } = calculateLpValue(pool, oraclePrices);
  const price = oraclePrices[tokenIndex];
  if (totalValueUsd === 0n || pool.lpSupply === 0n || price === 0n) {
    return 0n;
  }
  const withdrawValueUsd = withdrawAmount * price / BigInt(10 ** token.decimals);
  return withdrawValueUsd * pool.lpSupply / totalValueUsd;
}
function calculateUtilization(token) {
  if (token.balance === 0n) return 0;
  return Number(token.locked * 10000n / token.balance);
}
function calculateBorrowRate(utilization, baseBorrowRateBps) {
  const multiplier = 1e4 + utilization;
  return baseBorrowRateBps * multiplier / 1e4;
}
function isValidLeverage(leverage, maxLeverage) {
  return leverage >= 1 && leverage <= maxLeverage && Number.isInteger(leverage);
}
function wouldExceedUtilization(token, additionalLock, maxUtilizationBps) {
  const newLocked = token.locked + additionalLock;
  const utilization = Number(newLocked * 10000n / token.balance);
  return utilization > maxUtilizationBps;
}
function isValidPositionSize(positionSize, market) {
  return positionSize > 0n && positionSize <= market.maxPositionSize;
}

// src/perps/instructions.ts
var import_web312 = require("@solana/web3.js");
var import_spl_token4 = require("@solana/spl-token");
var import_bn5 = __toESM(require("bn.js"));
init_constants();
init_swap();
init_encryption();
init_commitment();
init_poseidon();
var PYTH_FEED_IDS2 = {
  /** SOL/USD price feed */
  SOL_USD: new Uint8Array([
    239,
    13,
    139,
    111,
    218,
    44,
    235,
    164,
    29,
    161,
    93,
    64,
    149,
    209,
    218,
    57,
    42,
    13,
    47,
    142,
    208,
    198,
    199,
    188,
    15,
    76,
    250,
    200,
    194,
    128,
    181,
    109
  ]),
  /** BTC/USD price feed */
  BTC_USD: new Uint8Array([
    230,
    45,
    246,
    200,
    180,
    168,
    95,
    225,
    166,
    125,
    180,
    77,
    193,
    45,
    229,
    219,
    51,
    15,
    122,
    198,
    107,
    114,
    220,
    101,
    138,
    254,
    223,
    15,
    74,
    65,
    91,
    67
  ]),
  /** ETH/USD price feed */
  ETH_USD: new Uint8Array([
    255,
    97,
    73,
    26,
    147,
    17,
    18,
    221,
    241,
    189,
    129,
    71,
    205,
    27,
    100,
    19,
    117,
    247,
    159,
    88,
    37,
    18,
    109,
    102,
    84,
    128,
    135,
    70,
    52,
    253,
    10,
    206
  ]),
  /** USDC/USD price feed (stablecoin) */
  USDC_USD: new Uint8Array([
    234,
    160,
    32,
    198,
    28,
    196,
    121,
    113,
    42,
    53,
    122,
    181,
    228,
    199,
    154,
    152,
    237,
    151,
    158,
    212,
    48,
    36,
    247,
    80,
    86,
    190,
    45,
    184,
    191,
    106,
    67,
    88
  ])
};
var PERPS_SEEDS = {
  PERPS_POOL: Buffer.from("perps_pool"),
  PERPS_MARKET: Buffer.from("perps_market"),
  PERPS_VAULT: Buffer.from("perps_vault"),
  PERPS_LP_MINT: Buffer.from("perps_lp_mint")
};
var PERPS_CIRCUIT_IDS = {
  OPEN_POSITION: "perps_open_position",
  CLOSE_POSITION: "perps_close_position",
  ADD_LIQUIDITY: "perps_add_liquidity",
  REMOVE_LIQUIDITY: "perps_remove_liquidity",
  LIQUIDATE: "perps_liquidate"
};
function derivePerpsPoolPda(poolId, programId = PROGRAM_ID) {
  return import_web312.PublicKey.findProgramAddressSync(
    [PERPS_SEEDS.PERPS_POOL, poolId.toBuffer()],
    programId
  );
}
function derivePerpsMarketPda(perpsPool, marketId, programId = PROGRAM_ID) {
  return import_web312.PublicKey.findProgramAddressSync(
    [PERPS_SEEDS.PERPS_MARKET, perpsPool.toBuffer(), Buffer.from(marketId)],
    programId
  );
}
function derivePerpsVaultPda(perpsPool, tokenMint, programId = PROGRAM_ID) {
  return import_web312.PublicKey.findProgramAddressSync(
    [PERPS_SEEDS.PERPS_VAULT, perpsPool.toBuffer(), tokenMint.toBuffer()],
    programId
  );
}
function derivePerpsLpMintPda(perpsPool, programId = PROGRAM_ID) {
  return import_web312.PublicKey.findProgramAddressSync(
    [PERPS_SEEDS.PERPS_LP_MINT, perpsPool.toBuffer()],
    programId
  );
}
async function buildOpenPositionWithProgram(program, params) {
  const programId = program.programId;
  const operationId = generateOperationId(
    params.nullifier,
    params.positionCommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(PERPS_CIRCUIT_IDS.OPEN_POSITION, programId);
  const phase0Tx = await program.methods.createPendingWithProofOpenPosition(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(params.inputCommitment),
    Array.from(params.nullifier),
    Array.from(params.positionCommitment),
    Array.from(params.changeCommitment),
    params.isLong,
    new import_bn5.default(params.marginAmount.toString()),
    params.leverage,
    new import_bn5.default(params.positionFee.toString()),
    new import_bn5.default(params.changeAmount.toString())
  ).accountsStrict({
    marginPool: params.settlementPool,
    positionPool: params.positionPool,
    perpsPool: params.perpsPool,
    perpsMarket: params.market,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: import_web312.SystemProgram.programId
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 8e5 })
  ]);
  const phase1Tx = await program.methods.verifyCommitmentExists(
    Array.from(operationId),
    0,
    // commitment_index
    params.lightVerifyParams
  ).accountsStrict({
    pool: params.settlementPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase2Tx = await program.methods.createNullifierAndPending(
    Array.from(operationId),
    0,
    // nullifier_index
    params.lightNullifierParams
  ).accountsStrict({
    pool: params.settlementPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase3Tx = await program.methods.executeOpenPosition(
    Array.from(operationId),
    new import_bn5.default(params.entryPrice.toString())
  ).accountsStrict({
    marginPool: params.settlementPool,
    perpsPool: params.perpsPool,
    perpsMarket: params.market,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    priceUpdate: params.priceUpdate
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 })
  ]);
  const fieldReducedMarketId = fieldToBytes(bytesToField(params.marketId));
  const positionNote = createPositionNote(
    params.inputStealthPubX,
    // Use input's stealthPubX to match circuit
    fieldReducedMarketId,
    // Field-reduced marketId for commitment computation match
    params.isLong,
    params.marginAmount,
    params.positionSize,
    params.leverage,
    params.entryPrice,
    params.positionRandomness
  );
  const positionEncrypted = encryptPositionNote(positionNote, params.positionRecipient.stealthPubkey);
  const pendingCommitments = [
    {
      pool: params.positionPool,
      // Position commitment goes to position pool
      commitment: params.positionCommitment,
      stealthEphemeralPubkey: new Uint8Array([
        ...params.positionRecipient.ephemeralPubkey.x,
        ...params.positionRecipient.ephemeralPubkey.y
      ]),
      encryptedNote: serializeEncryptedNote(positionEncrypted)
    }
  ];
  if (params.changeAmount > 0n) {
    const changeNote = {
      stealthPubX: params.inputStealthPubX,
      // Use input's stealthPubX to match circuit
      tokenMint: params.tokenMint,
      amount: params.changeAmount,
      randomness: params.changeRandomness
    };
    const changeEncrypted = encryptNote(changeNote, params.changeRecipient.stealthPubkey);
    pendingCommitments.push({
      pool: params.settlementPool,
      // Change goes back to margin pool
      commitment: params.changeCommitment,
      // Use change commitment from params
      stealthEphemeralPubkey: new Uint8Array([
        ...params.changeRecipient.ephemeralPubkey.x,
        ...params.changeRecipient.ephemeralPubkey.y
      ]),
      encryptedNote: serializeEncryptedNote(changeEncrypted)
    });
  }
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments
  };
}
async function buildClosePositionWithProgram(program, params) {
  const programId = program.programId;
  const operationId = generateOperationId(
    params.positionNullifier,
    params.settlementCommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(PERPS_CIRCUIT_IDS.CLOSE_POSITION, programId);
  const phase0Tx = await program.methods.createPendingWithProofClosePosition(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(params.positionCommitment),
    Array.from(params.positionNullifier),
    Array.from(params.settlementCommitment),
    params.isLong,
    new import_bn5.default(params.exitPrice.toString()),
    new import_bn5.default(params.closeFee.toString()),
    new import_bn5.default(params.pnlAmount.toString()),
    params.isProfit
  ).accountsStrict({
    positionPool: params.positionPool,
    settlementPool: params.settlementPool,
    perpsPool: params.perpsPool,
    perpsMarket: params.market,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: import_web312.SystemProgram.programId
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 8e5 })
  ]);
  const phase1Tx = await program.methods.verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams).accountsStrict({
    pool: params.positionPool,
    // Position is in position pool
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase2Tx = await program.methods.createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams).accountsStrict({
    pool: params.positionPool,
    // Nullify position in position pool
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase3Tx = await program.methods.executeClosePosition(
    Array.from(operationId),
    new import_bn5.default(params.positionMargin.toString()),
    new import_bn5.default(params.positionSize.toString()),
    new import_bn5.default(params.entryPrice.toString())
  ).accountsStrict({
    settlementPool: params.settlementPool,
    perpsPool: params.perpsPool,
    perpsMarket: params.market,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    priceUpdate: params.priceUpdate
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 })
  ]);
  const settlementNote = {
    stealthPubX: params.settlementRecipient.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.settlementAmount,
    randomness: params.settlementRandomness
  };
  const settlementEncrypted = encryptNote(settlementNote, params.settlementRecipient.stealthPubkey);
  const pendingCommitments = [{
    pool: params.settlementPool,
    commitment: params.settlementCommitment,
    stealthEphemeralPubkey: new Uint8Array([
      ...params.settlementRecipient.ephemeralPubkey.x,
      ...params.settlementRecipient.ephemeralPubkey.y
    ]),
    encryptedNote: serializeEncryptedNote(settlementEncrypted)
  }];
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments
  };
}
async function buildAddPerpsLiquidityWithProgram(program, params) {
  const programId = program.programId;
  const operationId = generateOperationId(params.nullifier, params.lpCommitment, Date.now());
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(PERPS_CIRCUIT_IDS.ADD_LIQUIDITY, programId);
  const [lpPoolPda] = derivePoolPda(params.lpMint, programId);
  const oraclePricesBN = [];
  for (let i = 0; i < 8; i++) {
    oraclePricesBN.push(new import_bn5.default((params.oraclePrices[i] ?? 0n).toString()));
  }
  const phase0Tx = await program.methods.createPendingWithProofAddPerpsLiquidity(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(params.inputCommitment),
    Array.from(params.nullifier),
    Array.from(params.lpCommitment),
    params.tokenIndex,
    new import_bn5.default(params.depositAmount.toString()),
    new import_bn5.default(params.lpAmountMinted.toString()),
    new import_bn5.default(params.feeAmount.toString())
  ).accountsStrict({
    depositPool: params.depositPool,
    lpPool: lpPoolPda,
    perpsPool: params.perpsPool,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: import_web312.SystemProgram.programId
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 8e5 })
  ]);
  const phase1Tx = await program.methods.verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams).accountsStrict({
    pool: params.depositPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase2Tx = await program.methods.createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams).accountsStrict({
    pool: params.depositPool,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase3Tx = await program.methods.executeAddPerpsLiquidity(Array.from(operationId), oraclePricesBN).accountsStrict({
    depositPool: params.depositPool,
    perpsPool: params.perpsPool,
    lpMint: params.lpMintAccount,
    tokenVault: params.tokenVault,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    priceUpdate: params.priceUpdate,
    tokenProgram: import_spl_token4.TOKEN_PROGRAM_ID
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 })
  ]);
  const lpNote = createLpNote(
    params.lpRecipient.stealthPubkey.x,
    params.perpsPoolId,
    params.lpAmountMinted,
    params.lpRandomness
  );
  const lpEncrypted = encryptLpNote(lpNote, params.lpRecipient.stealthPubkey);
  const pendingCommitments = [{
    pool: lpPoolPda,
    commitment: params.lpCommitment,
    stealthEphemeralPubkey: new Uint8Array([
      ...params.lpRecipient.ephemeralPubkey.x,
      ...params.lpRecipient.ephemeralPubkey.y
    ]),
    encryptedNote: serializeEncryptedNote(lpEncrypted)
  }];
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments
  };
}
async function buildRemovePerpsLiquidityWithProgram(program, params) {
  const programId = program.programId;
  const operationId = generateOperationId(params.lpNullifier, params.outputCommitment, Date.now());
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(PERPS_CIRCUIT_IDS.REMOVE_LIQUIDITY, programId);
  const [lpPoolPda] = derivePoolPda(params.lpMint, programId);
  const oraclePricesBN = [];
  for (let i = 0; i < 8; i++) {
    oraclePricesBN.push(new import_bn5.default((params.oraclePrices[i] ?? 0n).toString()));
  }
  const phase0Tx = await program.methods.createPendingWithProofRemovePerpsLiquidity(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(params.lpCommitment),
    Array.from(params.lpNullifier),
    Array.from(params.outputCommitment),
    Array.from(params.changeLpCommitment),
    params.tokenIndex,
    new import_bn5.default(params.withdrawAmount.toString()),
    new import_bn5.default(params.lpAmountBurned.toString()),
    new import_bn5.default(params.feeAmount.toString())
  ).accountsStrict({
    withdrawalPool: params.withdrawalPool,
    lpPool: lpPoolPda,
    perpsPool: params.perpsPool,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: import_web312.SystemProgram.programId
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 8e5 })
  ]);
  const phase1Tx = await program.methods.verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams).accountsStrict({
    pool: lpPoolPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase2Tx = await program.methods.createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams).accountsStrict({
    pool: lpPoolPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase3Tx = await program.methods.executeRemovePerpsLiquidity(Array.from(operationId), oraclePricesBN).accountsStrict({
    withdrawalPool: params.withdrawalPool,
    perpsPool: params.perpsPool,
    lpMint: params.lpMintAccount,
    tokenVault: params.tokenVault,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    priceUpdate: params.priceUpdate,
    tokenProgram: import_spl_token4.TOKEN_PROGRAM_ID
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 })
  ]);
  const outputNote = {
    stealthPubX: params.outputRecipient.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.withdrawAmount,
    randomness: params.outputRandomness
  };
  const outputEncrypted = encryptNote(outputNote, params.outputRecipient.stealthPubkey);
  const pendingCommitments = [{
    pool: params.withdrawalPool,
    commitment: params.outputCommitment,
    stealthEphemeralPubkey: new Uint8Array([
      ...params.outputRecipient.ephemeralPubkey.x,
      ...params.outputRecipient.ephemeralPubkey.y
    ]),
    encryptedNote: serializeEncryptedNote(outputEncrypted)
  }];
  if (params.lpChangeAmount > 0n) {
    const lpChangeNote = createLpNote(
      params.lpChangeRecipient.stealthPubkey.x,
      params.perpsPoolId,
      params.lpChangeAmount,
      params.lpChangeRandomness
    );
    const lpChangeEncrypted = encryptLpNote(lpChangeNote, params.lpChangeRecipient.stealthPubkey);
    pendingCommitments.push({
      pool: lpPoolPda,
      // LP change goes back to LP pool
      commitment: params.changeLpCommitment,
      stealthEphemeralPubkey: new Uint8Array([
        ...params.lpChangeRecipient.ephemeralPubkey.x,
        ...params.lpChangeRecipient.ephemeralPubkey.y
      ]),
      encryptedNote: serializeEncryptedNote(lpChangeEncrypted)
    });
  }
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments
  };
}
async function buildInitializePerpsPoolWithProgram(program, params) {
  const programId = program.programId;
  const [perpsPoolPda] = derivePerpsPoolPda(params.poolId, programId);
  const [lpMintPda] = derivePerpsLpMintPda(perpsPoolPda, programId);
  const initParams = {
    maxLeverage: params.maxLeverage ?? 100,
    positionFeeBps: params.positionFeeBps ?? 6,
    maxUtilizationBps: params.maxUtilizationBps ?? 8e3,
    liquidationThresholdBps: params.liquidationThresholdBps ?? 50,
    liquidationPenaltyBps: params.liquidationPenaltyBps ?? 50,
    baseBorrowRateBps: params.baseBorrowRateBps ?? 10
  };
  const tx = await program.methods.initializePerpsPool(params.poolId, initParams).accountsStrict({
    perpsPool: perpsPoolPda,
    lpMint: lpMintPda,
    authority: params.authority,
    payer: params.payer,
    systemProgram: import_web312.SystemProgram.programId,
    tokenProgram: import_spl_token4.TOKEN_PROGRAM_ID
  });
  return { tx };
}
async function buildAddTokenToPoolWithProgram(program, params) {
  const programId = program.programId;
  const { getAssociatedTokenAddressSync: getAssociatedTokenAddressSync4 } = await import("@solana/spl-token");
  const vaultPda = getAssociatedTokenAddressSync4(params.tokenMint, params.perpsPool, true);
  const tx = await program.methods.addTokenToPool(Array.from(params.pythFeedId)).accountsStrict({
    perpsPool: params.perpsPool,
    tokenMint: params.tokenMint,
    tokenVault: vaultPda,
    authority: params.authority,
    payer: params.payer,
    systemProgram: import_web312.SystemProgram.programId,
    tokenProgram: import_spl_token4.TOKEN_PROGRAM_ID,
    associatedTokenProgram: new import_web312.PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL")
  });
  return { tx };
}
async function buildAddMarketWithProgram(program, params) {
  const programId = program.programId;
  const [marketPda] = derivePerpsMarketPda(params.perpsPool, params.marketId, programId);
  const tx = await program.methods.addMarket(
    Array.from(params.marketId),
    params.baseTokenIndex,
    params.quoteTokenIndex,
    new import_bn5.default(params.maxPositionSize.toString())
  ).accountsStrict({
    perpsPool: params.perpsPool,
    perpsMarket: marketPda,
    authority: params.authority,
    payer: params.payer,
    systemProgram: import_web312.SystemProgram.programId
  });
  return { tx };
}
async function buildUpdatePoolConfigWithProgram(program, params) {
  const updateParams = {
    maxLeverage: params.maxLeverage ?? null,
    positionFeeBps: params.positionFeeBps ?? null,
    maxUtilizationBps: params.maxUtilizationBps ?? null,
    liquidationThresholdBps: params.liquidationThresholdBps ?? null,
    liquidationPenaltyBps: params.liquidationPenaltyBps ?? null,
    baseBorrowRateBps: params.baseBorrowRateBps ?? null,
    maxImbalanceFeeBps: params.maxImbalanceFeeBps ?? null,
    isActive: params.isActive ?? null
  };
  const tx = await program.methods.updatePerpsPoolConfig(updateParams).accountsStrict({
    perpsPool: params.perpsPool,
    authority: params.authority
  });
  return { tx };
}
async function buildUpdateTokenStatusWithProgram(program, params) {
  const tx = await program.methods.updatePerpsTokenStatus(params.tokenIndex, params.isActive).accountsStrict({
    perpsPool: params.perpsPool,
    authority: params.authority
  });
  return { tx };
}
async function buildUpdateMarketStatusWithProgram(program, params) {
  const tx = await program.methods.updatePerpsMarketStatus(params.isActive).accountsStrict({
    perpsPool: params.perpsPool,
    perpsMarket: params.market,
    authority: params.authority
  });
  return { tx };
}
async function buildUpdateBorrowFeesWithProgram(program, perpsPool, keeper) {
  const tx = await program.methods.updatePerpsBorrowFees().accountsStrict({
    perpsPool,
    keeper
  });
  return { tx };
}
async function buildLiquidatePositionWithProgram(program, params) {
  const programId = program.programId;
  const operationId = generateOperationId(
    params.positionNullifier,
    params.ownerCommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda("perps_liquidate", programId);
  const phase0Tx = await program.methods.createPendingWithProofLiquidate(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(params.positionCommitment),
    Array.from(params.positionNullifier),
    Array.from(params.ownerCommitment),
    Array.from(params.liquidatorCommitment),
    new import_bn5.default(params.currentPrice.toString()),
    new import_bn5.default(params.liquidatorReward.toString()),
    new import_bn5.default(params.ownerRemainder.toString())
  ).accountsStrict({
    settlementPool: params.settlementPool,
    perpsPool: params.perpsPool,
    perpsMarket: params.market,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    keeper: params.keeper,
    systemProgram: import_web312.SystemProgram.programId
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 8e5 })
  ]);
  const phase1Tx = await program.methods.verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams).accountsStrict({
    pool: params.settlementPool,
    pendingOperation: pendingOpPda,
    relayer: params.keeper
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase2Tx = await program.methods.createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams).accountsStrict({
    pool: params.settlementPool,
    pendingOperation: pendingOpPda,
    relayer: params.keeper
  }).remainingAccounts(params.remainingAccounts).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  const phase3Tx = await program.methods.executeLiquidate(
    Array.from(operationId),
    new import_bn5.default(params.positionMargin.toString()),
    new import_bn5.default(params.positionSize.toString()),
    params.isLong
  ).accountsStrict({
    settlementPool: params.settlementPool,
    perpsPool: params.perpsPool,
    perpsMarket: params.market,
    pendingOperation: pendingOpPda,
    keeper: params.keeper,
    oracle: params.oracle
  }).preInstructions([
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 })
  ]);
  const pendingCommitments = [];
  if (params.ownerRemainder > 0n) {
    const ownerNote = {
      stealthPubX: params.ownerRecipient.stealthPubkey.x,
      tokenMint: params.tokenMint,
      amount: params.ownerRemainder,
      randomness: params.ownerRandomness
    };
    const ownerEncrypted = encryptNote(ownerNote, params.ownerRecipient.stealthPubkey);
    pendingCommitments.push({
      pool: params.settlementPool,
      commitment: params.ownerCommitment,
      stealthEphemeralPubkey: new Uint8Array([
        ...params.ownerRecipient.ephemeralPubkey.x,
        ...params.ownerRecipient.ephemeralPubkey.y
      ]),
      encryptedNote: serializeEncryptedNote(ownerEncrypted)
    });
  }
  if (params.liquidatorReward > 0n) {
    const liquidatorNote = {
      stealthPubX: params.liquidatorRecipient.stealthPubkey.x,
      tokenMint: params.tokenMint,
      amount: params.liquidatorReward,
      randomness: params.liquidatorRandomness
    };
    const liquidatorEncrypted = encryptNote(liquidatorNote, params.liquidatorRecipient.stealthPubkey);
    pendingCommitments.push({
      pool: params.settlementPool,
      commitment: params.liquidatorCommitment,
      stealthEphemeralPubkey: new Uint8Array([
        ...params.liquidatorRecipient.ephemeralPubkey.x,
        ...params.liquidatorRecipient.ephemeralPubkey.y
      ]),
      encryptedNote: serializeEncryptedNote(liquidatorEncrypted)
    });
  }
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments
  };
}
function shouldLiquidate(position, currentPrice, pool) {
  const { margin, size, entryPrice, direction } = position;
  let pnl;
  let isProfit;
  if (direction === "long") {
    if (currentPrice > entryPrice) {
      pnl = (currentPrice - entryPrice) * size / entryPrice;
      isProfit = true;
    } else {
      pnl = (entryPrice - currentPrice) * size / entryPrice;
      isProfit = false;
    }
  } else {
    if (currentPrice < entryPrice) {
      pnl = (entryPrice - currentPrice) * size / entryPrice;
      isProfit = true;
    } else {
      pnl = (currentPrice - entryPrice) * size / entryPrice;
      isProfit = false;
    }
  }
  if (isProfit && pnl >= margin) {
    return { shouldLiquidate: true, reason: "profit_bound", pnl, isProfit };
  }
  const effectiveMargin = isProfit ? margin + pnl : margin - pnl;
  const liquidationThreshold = margin * BigInt(pool.liquidationThresholdBps) / 10000n;
  if (effectiveMargin < liquidationThreshold) {
    return { shouldLiquidate: true, reason: "underwater", pnl, isProfit };
  }
  return { shouldLiquidate: false, reason: null, pnl, isProfit };
}
function calculateLiquidationAmounts(margin, pnl, isProfit, liquidationPenaltyBps) {
  const effectiveMargin = isProfit ? margin + pnl : margin > pnl ? margin - pnl : 0n;
  const liquidatorReward = margin * BigInt(liquidationPenaltyBps) / 10000n;
  const ownerRemainder = effectiveMargin > liquidatorReward ? effectiveMargin - liquidatorReward : 0n;
  return { ownerRemainder, liquidatorReward };
}

// src/perps/oracle.ts
var import_web313 = require("@solana/web3.js");
var PERPS_PYTH_FEED_IDS = {
  /** SOL/USD price feed */
  SOL_USD: new Uint8Array([
    239,
    13,
    139,
    111,
    218,
    44,
    235,
    164,
    29,
    161,
    93,
    64,
    149,
    209,
    218,
    57,
    42,
    13,
    47,
    142,
    208,
    198,
    199,
    188,
    15,
    76,
    250,
    200,
    194,
    128,
    181,
    109
  ]),
  /** BTC/USD price feed */
  BTC_USD: new Uint8Array([
    230,
    45,
    246,
    200,
    180,
    168,
    95,
    225,
    166,
    125,
    180,
    77,
    193,
    45,
    229,
    219,
    51,
    15,
    122,
    198,
    107,
    114,
    220,
    101,
    138,
    254,
    223,
    15,
    74,
    65,
    91,
    67
  ]),
  /** ETH/USD price feed */
  ETH_USD: new Uint8Array([
    255,
    97,
    73,
    26,
    147,
    17,
    18,
    221,
    241,
    189,
    129,
    71,
    205,
    27,
    100,
    19,
    117,
    247,
    159,
    88,
    37,
    18,
    109,
    102,
    84,
    128,
    135,
    70,
    52,
    253,
    10,
    206
  ]),
  /** USDC/USD price feed (stablecoin) */
  USDC_USD: new Uint8Array([
    234,
    160,
    32,
    198,
    28,
    196,
    121,
    113,
    42,
    53,
    122,
    181,
    228,
    199,
    154,
    152,
    237,
    151,
    158,
    212,
    48,
    36,
    247,
    80,
    86,
    190,
    45,
    184,
    191,
    106,
    67,
    88
  ]),
  /** USDT/USD price feed */
  USDT_USD: new Uint8Array([
    43,
    137,
    185,
    220,
    143,
    223,
    159,
    52,
    18,
    77,
    178,
    41,
    55,
    101,
    214,
    31,
    89,
    53,
    44,
    105,
    254,
    241,
    95,
    51,
    195,
    144,
    239,
    22,
    144,
    62,
    56,
    241
  ])
};
function getFeedIdBySymbol(symbol) {
  const symbolToFeed = {
    "SOL": PERPS_PYTH_FEED_IDS.SOL_USD,
    "BTC": PERPS_PYTH_FEED_IDS.BTC_USD,
    "ETH": PERPS_PYTH_FEED_IDS.ETH_USD,
    "USDC": PERPS_PYTH_FEED_IDS.USDC_USD,
    "USDT": PERPS_PYTH_FEED_IDS.USDT_USD
  };
  return symbolToFeed[symbol.toUpperCase()];
}
async function fetchPythPrice(feedId, hermesUrl = "https://hermes.pyth.network") {
  const feedIdHex = feedIdToHex(feedId);
  const response = await fetch(
    `${hermesUrl}/v2/updates/price/latest?ids[]=${feedIdHex}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Pyth price: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data?.parsed?.length) {
    throw new Error(`No price available for feed ${feedIdHex}`);
  }
  const parsed = data.parsed[0].price;
  return {
    price: BigInt(parsed.price),
    confidence: BigInt(parsed.conf),
    expo: parsed.expo,
    publishTime: parsed.publish_time
  };
}
async function fetchPythPriceUsd(feedId, decimals = 9, hermesUrl) {
  const priceData = await fetchPythPrice(feedId, hermesUrl);
  const expoAdjustment = decimals + priceData.expo;
  if (expoAdjustment >= 0) {
    return priceData.price * BigInt(10 ** expoAdjustment);
  } else {
    return priceData.price / BigInt(10 ** -expoAdjustment);
  }
}
async function fetchPythVaa(feedId, hermesUrl = "https://hermes.pyth.network") {
  const feedIdHex = feedIdToHex(feedId);
  const response = await fetch(
    `${hermesUrl}/v2/updates/price/latest?ids[]=${feedIdHex}&encoding=base64`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Pyth VAA: ${response.statusText}`);
  }
  const data = await response.json();
  if (!data?.binary?.data?.length) {
    throw new Error(`No VAA available for feed ${feedIdHex}`);
  }
  return data.binary.data;
}
async function getPriceUpdateAccountAddress(connection, feedId) {
  const PYTH_RECEIVER_PROGRAM = new import_web313.PublicKey("rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ");
  const [pda] = import_web313.PublicKey.findProgramAddressSync(
    [Buffer.from("price_feed"), feedId],
    PYTH_RECEIVER_PROGRAM
  );
  return pda;
}
async function isPriceUpdateValid(connection, priceUpdateAccount, maxAge = 60) {
  try {
    const accountInfo = await connection.getAccountInfo(priceUpdateAccount);
    if (!accountInfo) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
function calculatePositionPrice(oraclePrice, isLong, slippageBps = 10) {
  const slippageMultiplier = isLong ? 10000n + BigInt(slippageBps) : 10000n - BigInt(slippageBps);
  return oraclePrice * slippageMultiplier / 10000n;
}
async function fetchPythPrices(feedIds, hermesUrl = "https://hermes.pyth.network") {
  const feedIdHexes = feedIds.map(feedIdToHex);
  const idsParam = feedIdHexes.map((id) => `ids[]=${id}`).join("&");
  const response = await fetch(
    `${hermesUrl}/v2/updates/price/latest?${idsParam}`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch Pyth prices: ${response.statusText}`);
  }
  const data = await response.json();
  const result = /* @__PURE__ */ new Map();
  if (data?.parsed) {
    for (const item of data.parsed) {
      const feedId = "0x" + item.id;
      result.set(feedId, {
        price: BigInt(item.price.price),
        confidence: BigInt(item.price.conf),
        expo: item.price.expo,
        publishTime: item.price.publish_time
      });
    }
  }
  return result;
}
async function getPoolOraclePrices(tokenFeedIds, decimals = 9, hermesUrl) {
  const pricesMap = await fetchPythPrices(tokenFeedIds, hermesUrl);
  const prices = [];
  for (const feedId of tokenFeedIds) {
    const feedIdHex = feedIdToHex(feedId);
    const priceData = pricesMap.get(feedIdHex);
    if (!priceData) {
      prices.push(0n);
      continue;
    }
    const expoAdjustment = decimals + priceData.expo;
    if (expoAdjustment >= 0) {
      prices.push(priceData.price * BigInt(10 ** expoAdjustment));
    } else {
      prices.push(priceData.price / BigInt(10 ** -expoAdjustment));
    }
  }
  while (prices.length < 8) {
    prices.push(0n);
  }
  return prices;
}

// src/address-lookup-table.ts
var import_web314 = require("@solana/web3.js");
async function createAddressLookupTable(connection, authority, recentSlot) {
  const slot = recentSlot ?? await connection.getSlot();
  const [instruction, address] = import_web314.AddressLookupTableProgram.createLookupTable({
    authority,
    payer: authority,
    recentSlot: slot
  });
  console.log(`[ALT] Created lookup table at ${address.toBase58()}`);
  return { address, instruction };
}
function extendAddressLookupTable(address, authority, addresses) {
  console.log(`[ALT] Extending lookup table with ${addresses.length} addresses`);
  return import_web314.AddressLookupTableProgram.extendLookupTable({
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
  const createTx = new import_web314.Transaction().add(createIx);
  const createSig = await (0, import_web314.sendAndConfirmTransaction)(connection, createTx, [authority]);
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
    const extendTx = new import_web314.Transaction().add(extendIx);
    const extendSig = await (0, import_web314.sendAndConfirmTransaction)(connection, extendTx, [authority]);
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
        new import_web314.PublicKey("BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW")
        // State tree 0
      ],
      addressTrees: [
        new import_web314.PublicKey("F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A")
        // Address tree 0
      ],
      nullifierQueues: [
        new import_web314.PublicKey("8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z")
        // Nullifier queue 0
      ],
      // Additional Light Protocol system accounts (from PackedAccounts)
      systemAccounts: [
        new import_web314.PublicKey("94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3"),
        new import_web314.PublicKey("35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh"),
        new import_web314.PublicKey("HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA"),
        new import_web314.PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq"),
        new import_web314.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto")
      ]
    };
  } else {
    return {
      stateTrees: [
        new import_web314.PublicKey("BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW")
        // Placeholder
      ],
      addressTrees: [
        new import_web314.PublicKey("F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A")
        // Placeholder
      ],
      nullifierQueues: [
        new import_web314.PublicKey("8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z")
        // Placeholder
      ],
      systemAccounts: [
        new import_web314.PublicKey("94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3"),
        // Placeholder
        new import_web314.PublicKey("35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh"),
        // Placeholder
        new import_web314.PublicKey("HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA"),
        // Placeholder
        new import_web314.PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq"),
        // Placeholder
        new import_web314.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto")
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
async function verifyTransactionSuccess(connection, signature, operationName) {
  const status = await connection.getSignatureStatus(signature, {
    searchTransactionHistory: true
  });
  if (status.value?.err) {
    throw new Error(`[${operationName}] Transaction reverted: ${JSON.stringify(status.value.err)}`);
  }
}
var CloakCraftClient = class {
  constructor(config) {
    this.wallet = null;
    this.anchorWallet = null;
    this.lightClient = null;
    this.program = null;
    this.heliusRpcUrl = null;
    if (config.connection) {
      this.connection = config.connection;
      this.rpcUrl = "";
    } else if (config.rpcUrl) {
      this.connection = new import_web316.Connection(config.rpcUrl, config.commitment ?? "confirmed");
      this.rpcUrl = config.rpcUrl;
    } else {
      throw new Error("Either connection or rpcUrl must be provided");
    }
    this.programId = config.programId;
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
   * Build Light Protocol params for spending operations (perps, swaps, etc.)
   *
   * This is a centralized helper that:
   * 1. Gets commitment inclusion proof (proves input exists)
   * 2. Gets nullifier non-inclusion proof (proves not double-spent)
   * 3. Builds packed accounts with correct tree indices
   *
   * @param accountHash - Account hash of the commitment (from scanNotes)
   * @param nullifier - Nullifier to be created
   * @param pool - Pool PDA (used for nullifier address derivation)
   * @param rpcUrl - Helius RPC URL for Light Protocol queries
   */
  async buildLightProtocolParams(accountHash, nullifier, pool, rpcUrl) {
    const { LightProtocol: LightProtocol2 } = await Promise.resolve().then(() => (init_light_helpers(), light_helpers_exports));
    const { SystemAccountMetaConfig: SystemAccountMetaConfig2, PackedAccounts: PackedAccounts2 } = await import("@lightprotocol/stateless.js");
    const { DEVNET_V2_TREES: DEVNET_V2_TREES2 } = await Promise.resolve().then(() => (init_constants(), constants_exports));
    const lightProtocol = new LightProtocol2(rpcUrl, this.programId);
    console.log("[buildLightProtocolParams] Fetching commitment inclusion proof...");
    const commitmentProof = await lightProtocol.getInclusionProofByHash(accountHash);
    console.log("[buildLightProtocolParams] Commitment proof leaf index:", commitmentProof.leafIndex);
    const commitmentTree = new import_web316.PublicKey(commitmentProof.treeInfo.tree);
    const commitmentQueue = new import_web316.PublicKey(commitmentProof.treeInfo.queue);
    console.log("[buildLightProtocolParams] Fetching inclusion validity proof...");
    const inclusionValidityProof = await lightProtocol.getInclusionValidityProof(
      accountHash,
      commitmentTree,
      commitmentQueue
    );
    const proveByIndex = inclusionValidityProof.proveByIndices?.[0] ?? true;
    console.log("[buildLightProtocolParams] proveByIndex:", proveByIndex);
    console.log("[buildLightProtocolParams] Fetching nullifier non-inclusion proof...");
    const nullifierAddress = lightProtocol.deriveNullifierAddress(pool, nullifier);
    const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
    const systemConfig = SystemAccountMetaConfig2.new(this.programId);
    const packedAccounts = PackedAccounts2.newWithSystemAccountsV2(systemConfig);
    const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES2.OUTPUT_QUEUE);
    const addressTree = DEVNET_V2_TREES2.ADDRESS_TREE;
    const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
    const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
    const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);
    const commitmentCpiContext = commitmentProof.treeInfo.cpiContext ? new import_web316.PublicKey(commitmentProof.treeInfo.cpiContext) : null;
    if (commitmentCpiContext) {
      packedAccounts.insertOrGet(commitmentCpiContext);
    }
    const { remainingAccounts } = packedAccounts.toAccountMetas();
    const accounts = remainingAccounts.map((acc) => ({
      pubkey: acc.pubkey,
      isWritable: Boolean(acc.isWritable),
      isSigner: Boolean(acc.isSigner)
    }));
    const leafIndex = inclusionValidityProof.leafIndices?.[0] ?? commitmentProof.leafIndex;
    const rootIndex = inclusionValidityProof.rootIndices?.[0] ?? commitmentProof.rootIndex;
    const lightVerifyParams = {
      commitmentAccountHash: Array.from(new import_web316.PublicKey(accountHash).toBytes()),
      commitmentMerkleContext: {
        merkleTreePubkeyIndex: commitmentStateTreeIndex,
        queuePubkeyIndex: commitmentQueueIndex,
        leafIndex,
        rootIndex,
        proveByIndex
      },
      commitmentInclusionProof: LightProtocol2.convertCompressedProof(inclusionValidityProof),
      commitmentAddressTreeInfo: {
        addressMerkleTreePubkeyIndex: addressTreeIndex,
        addressQueuePubkeyIndex: addressTreeIndex,
        rootIndex: nullifierProof.rootIndices[0] ?? 0
      }
    };
    const lightNullifierParams = {
      proof: LightProtocol2.convertCompressedProof(nullifierProof),
      addressTreeInfo: {
        addressMerkleTreePubkeyIndex: addressTreeIndex,
        addressQueuePubkeyIndex: addressTreeIndex,
        rootIndex: nullifierProof.rootIndices[0] ?? 0
      },
      outputTreeIndex
    };
    return {
      lightVerifyParams,
      lightNullifierParams,
      remainingAccounts: accounts
    };
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
   * @deprecated Use setWallet() instead for proper wallet integration
   */
  setProgram(program) {
    this.program = program;
  }
  /**
   * Set the wallet and create AnchorProvider/Program internally
   * This matches scalecraft's pattern where the SDK owns the program creation
   * @param wallet - Wallet adapter wallet with signTransaction/signAllTransactions
   */
  setWallet(wallet) {
    this.anchorWallet = wallet;
    this.initProgram();
  }
  /**
   * Initialize the Anchor program with the current wallet
   * Called internally by setWallet (matches scalecraft pattern exactly)
   */
  initProgram() {
    if (!this.anchorWallet) return;
    const provider = new import_anchor.AnchorProvider(this.connection, this.anchorWallet, {
      commitment: "confirmed"
    });
    this.program = new import_anchor.Program(cloakcraft_default, provider);
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
    const [poolPda] = import_web316.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    const [counterPda] = import_web316.PublicKey.findProgramAddressSync(
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
      tokenMint: new import_web316.PublicKey(data.subarray(8, 40)),
      tokenVault: new import_web316.PublicKey(data.subarray(40, 72)),
      totalShielded: data.readBigUInt64LE(72),
      authority: new import_web316.PublicKey(data.subarray(80, 112)),
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
        lpMintBump: pool.account.lpMintBump,
        poolType: pool.account.poolType?.stableSwap !== void 0 ? 1 : 0,
        amplification: BigInt(pool.account.amplification?.toString() ?? "0")
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
    const { buildShieldWithProgram: buildShieldWithProgram2 } = await Promise.resolve().then(() => (init_shield(), shield_exports));
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
    const tokenMint = params.inputs[0].tokenMint instanceof Uint8Array ? new import_web316.PublicKey(params.inputs[0].tokenMint) : params.inputs[0].tokenMint;
    const [poolPda] = import_web316.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    const [counterPda] = import_web316.PublicKey.findProgramAddressSync(
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
      const { fetchProtocolFeeConfig: fetchProtocolFeeConfig2 } = await Promise.resolve().then(() => (init_fees(), fees_exports));
      const feeConfig = await fetchProtocolFeeConfig2(this.connection, this.programId);
      if (feeConfig?.treasury) {
        treasuryWallet = feeConfig.treasury;
        treasuryTokenAccount = (0, import_spl_token5.getAssociatedTokenAddressSync)(
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
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];
          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);
          return new VersionedTransaction4(
            new TransactionMessage3({
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
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[Transfer] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
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
    let preparedOutputs = await this.prepareOutputs(request.outputs, tokenMint);
    console.log("[prepareAndTransfer] Prepared outputs:");
    preparedOutputs.forEach((o, i) => {
      console.log(`  Output ${i}: amount=${o.amount}, commitment=${Buffer.from(o.commitment).toString("hex").slice(0, 16)}...`);
    });
    const hasUnshield = request.unshield && request.unshield.amount > 0n;
    const allOutputsToSelf = preparedOutputs.length === 0 || preparedOutputs.every(
      (output) => checkStealthOwnership(
        output.recipient.stealthPubkey,
        output.recipient.ephemeralPubkey,
        this.wallet.keypair
      )
    );
    const isPureUnshield = hasUnshield && allOutputsToSelf;
    if (isPureUnshield) {
      console.log("[prepareAndTransfer] Pure unshield detected - restructuring outputs for fair fee");
      const dummyStealthAddress = {
        stealthPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) },
        ephemeralPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) }
      };
      const dummyNote = createNote(
        new Uint8Array(32),
        tokenMint,
        0n,
        new Uint8Array(32)
      );
      const dummyCommitment = computeCommitment(dummyNote);
      const dummyOutput = {
        recipient: dummyStealthAddress,
        amount: 0n,
        commitment: dummyCommitment,
        stealthPubX: new Uint8Array(32),
        randomness: new Uint8Array(32)
      };
      if (preparedOutputs.length > 0) {
        preparedOutputs = [dummyOutput, preparedOutputs[0]];
        console.log("[prepareAndTransfer] Restructured: out_1=dummy(0), out_2=change");
      } else {
        const selfStealth = generateStealthAddress(this.wallet.keypair.publicKey);
        const dustNote = createNote(
          selfStealth.stealthAddress.stealthPubkey.x,
          tokenMint,
          0n,
          generateRandomness()
        );
        const dustCommitment = computeCommitment(dustNote);
        const dustOutput = {
          recipient: selfStealth.stealthAddress,
          amount: 0n,
          commitment: dustCommitment,
          stealthPubX: selfStealth.stealthAddress.stealthPubkey.x,
          randomness: dustNote.randomness
        };
        preparedOutputs = [dummyOutput, dustOutput];
        console.log("[prepareAndTransfer] Full unshield: out_1=dummy(0), out_2=dust(0)");
      }
    }
    const commitment = preparedInputs[0].commitment;
    const dummyPath = Array(32).fill(new Uint8Array(32));
    const dummyIndices = Array(32).fill(0);
    const { fetchProtocolFeeConfig: fetchProtocolFeeConfig2, calculateProtocolFee: calculateProtocolFee2 } = await Promise.resolve().then(() => (init_fees(), fees_exports));
    const feeConfig = await fetchProtocolFeeConfig2(this.connection, this.programId);
    const totalInputAmount = preparedInputs.reduce((sum, input) => sum + input.amount, 0n);
    const transferAmount = preparedOutputs[0]?.amount ?? 0n;
    const unshieldAmount = request.unshield?.amount ?? 0n;
    const feeableAmount = transferAmount + unshieldAmount;
    const feeCalc = calculateProtocolFee2(feeableAmount, "transfer", feeConfig);
    console.log("[prepareAndTransfer] Fee calculation:", {
      transferAmount: transferAmount.toString(),
      unshieldAmount: unshieldAmount.toString(),
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
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        const mainIx = await builder.instruction();
        const preIxs = builder._preInstructions || [];
        const allInstructions = [...preIxs, mainIx];
        return new VersionedTransaction4(
          new TransactionMessage3({
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
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[Consolidation] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
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
    if (confirmation.value.err) {
      throw new Error(`[AdapterSwap] Transaction reverted: ${JSON.stringify(confirmation.value.err)}`);
    }
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
    if (confirmation.value.err) {
      throw new Error(`[CreateOrder] Transaction reverted: ${JSON.stringify(confirmation.value.err)}`);
    }
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
   * LP mint is now a PDA derived from the AMM pool, no keypair needed.
   *
   * @param tokenAMint - First token mint
   * @param tokenBMint - Second token mint
   * @param feeBps - Trading fee in basis points (e.g., 30 = 0.3%)
   * @param poolType - Pool type: 'constantProduct' (default) or 'stableSwap'
   * @param amplification - Amplification coefficient for StableSwap (100-10000, default: 200)
   * @param payer - Payer for transaction fees and rent
   * @returns Transaction signature
   */
  async initializeAmmPool(tokenAMint, tokenBMint, feeBps, poolType = "constantProduct", amplification = 200, payer) {
    console.log("[initializeAmmPool] ======== START ========");
    console.log("[initializeAmmPool] tokenAMint:", tokenAMint.toBase58());
    console.log("[initializeAmmPool] tokenBMint:", tokenBMint.toBase58());
    console.log("[initializeAmmPool] feeBps:", feeBps);
    console.log("[initializeAmmPool] poolType:", poolType);
    console.log("[initializeAmmPool] amplification:", amplification);
    if (!this.program) {
      console.log("[initializeAmmPool] ERROR: No program set");
      throw new Error("No program set. Call setProgram() first.");
    }
    console.log("[initializeAmmPool] Program exists:", !!this.program);
    console.log("[initializeAmmPool] Program.programId:", this.program.programId.toBase58());
    console.log("[initializeAmmPool] Provider exists:", !!this.program.provider);
    console.log("[initializeAmmPool] Provider.publicKey:", this.program.provider.publicKey?.toBase58());
    console.log("[initializeAmmPool] Connection RPC:", this.program.provider.connection.rpcEndpoint);
    const [canonicalA, canonicalB] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0 ? [tokenAMint, tokenBMint] : [tokenBMint, tokenAMint];
    console.log("[initializeAmmPool] Canonical order:");
    console.log("[initializeAmmPool]   canonicalA:", canonicalA.toBase58());
    console.log("[initializeAmmPool]   canonicalB:", canonicalB.toBase58());
    const poolTypeEnum = poolType === "stableSwap" ? { stableSwap: {} } : { constantProduct: {} };
    const amp = poolType === "stableSwap" ? amplification : 0;
    const [lpMintPda] = import_web316.PublicKey.findProgramAddressSync(
      [Buffer.from("lp_mint"), canonicalA.toBuffer(), canonicalB.toBuffer()],
      this.programId
    );
    console.log("[initializeAmmPool] Derived lpMintPda:", lpMintPda.toBase58());
    console.log("[initializeAmmPool] Building MethodsBuilder...");
    const methodsBuilder = this.program.methods.initializeAmmPool(
      canonicalA,
      canonicalB,
      feeBps,
      poolTypeEnum,
      new import_anchor.BN(amp)
    ).accountsPartial({
      tokenAMintAccount: canonicalA,
      tokenBMintAccount: canonicalB
    });
    console.log("[initializeAmmPool] MethodsBuilder created");
    console.log("[initializeAmmPool] CALLING .rpc() - This will trigger wallet.signTransaction()");
    console.log("[initializeAmmPool] ======== BEFORE .rpc() ========");
    let signature;
    try {
      signature = await methodsBuilder.rpc({ skipPreflight: true });
      console.log("[initializeAmmPool] ======== AFTER .rpc() SUCCESS ========");
      console.log("[initializeAmmPool] Signature:", signature);
    } catch (rpcError) {
      console.log("[initializeAmmPool] ======== AFTER .rpc() ERROR ========");
      console.log("[initializeAmmPool] Error name:", rpcError?.name);
      console.log("[initializeAmmPool] Error message:", rpcError?.message);
      console.log("[initializeAmmPool] Error logs:", rpcError?.logs);
      console.log("[initializeAmmPool] Full error:", JSON.stringify(rpcError, Object.getOwnPropertyNames(rpcError || {}), 2));
      throw rpcError;
    }
    console.log(`[AMM] Pool initialized: ${signature}`);
    const payerPubkey = payer?.publicKey ?? this.program.provider.publicKey;
    if (payerPubkey) {
      try {
        await initializePool(this.program, lpMintPda, payerPubkey, payerPubkey);
        console.log(`[AMM] LP pool initialized`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes("already in use") && !errMsg.includes("already_exists")) {
          console.warn(`[AMM] LP pool init failed: ${errMsg}`);
        }
      }
    }
    return signature;
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
    params.onProgress?.("generating");
    const proofResult = await this.proofGenerator.generateSwapProof(
      params,
      this.wallet.keypair
    );
    params.onProgress?.("building");
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array ? new import_web316.PublicKey(params.input.tokenMint) : params.input.tokenMint;
    const ammPoolAccount = await this.program.account.ammPool.fetch(params.poolId);
    const outputTokenMint = params.swapDirection === "aToB" ? ammPoolAccount.tokenBMint : ammPoolAccount.tokenAMint;
    const [inputPoolPda] = derivePoolPda(inputTokenMint, this.programId);
    const [outputPoolPda] = derivePoolPda(outputTokenMint, this.programId);
    const inputPoolAccount = await this.program.account.pool.fetch(inputPoolPda);
    const inputVault = inputPoolAccount.tokenVault;
    const [protocolConfigPda] = deriveProtocolConfigPda(this.programId);
    let treasuryAta;
    try {
      const configAccount = await this.program.account.protocolConfig.fetch(protocolConfigPda);
      if (configAccount && configAccount.feesEnabled) {
        const { getAssociatedTokenAddress } = await import("@solana/spl-token");
        treasuryAta = await getAssociatedTokenAddress(inputTokenMint, configAccount.treasury);
      }
    } catch {
      console.warn("[Swap] Protocol config not found - swap will fail if not initialized");
    }
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
      inputVault,
      protocolConfig: protocolConfigPda,
      // Required
      treasuryAta,
      // Optional - only if fees enabled
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
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];
          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);
          return new VersionedTransaction4(
            new TransactionMessage3({
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
    console.log(`[Swap] All ${signedTransactions.length} transactions signed!`);
    console.log("[Swap] Executing signed transactions sequentially...");
    params.onProgress?.("executing");
    let phase0Signature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      console.log(`[Swap] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[Swap] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
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
    params.onProgress?.("generating");
    const lpAmount = params.lpAmount;
    const proofResult = await this.proofGenerator.generateAddLiquidityProof(
      params,
      this.wallet.keypair
    );
    params.onProgress?.("building");
    const tokenAMint = params.inputA.tokenMint instanceof Uint8Array ? new import_web316.PublicKey(params.inputA.tokenMint) : params.inputA.tokenMint;
    const tokenBMint = params.inputB.tokenMint instanceof Uint8Array ? new import_web316.PublicKey(params.inputB.tokenMint) : params.inputB.tokenMint;
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
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];
          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);
          return new VersionedTransaction4(
            new TransactionMessage3({
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
    console.log(`[Add Liquidity] All ${signedTransactions.length} transactions signed!`);
    console.log("[Add Liquidity] Executing signed transactions sequentially...");
    params.onProgress?.("executing");
    let phase0Signature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      console.log(`[Add Liquidity] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[Add Liquidity] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
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
    params.onProgress?.("generating");
    const tokenAMint = params.tokenAMint;
    const tokenBMint = params.tokenBMint;
    const lpMint = params.lpInput.tokenMint instanceof Uint8Array ? new import_web316.PublicKey(params.lpInput.tokenMint) : params.lpInput.tokenMint;
    const [poolA] = derivePoolPda(tokenAMint, this.programId);
    const [poolB] = derivePoolPda(tokenBMint, this.programId);
    const [lpPool] = derivePoolPda(lpMint, this.programId);
    console.log("[Remove Liquidity] Pool PDAs:");
    console.log(`  Token A Pool: ${poolA.toBase58()}`);
    console.log(`  Token B Pool: ${poolB.toBase58()}`);
    console.log(`  LP Token Pool: ${lpPool.toBase58()}`);
    const poolAAccount = await this.program.account.pool.fetch(poolA);
    const poolBAccount = await this.program.account.pool.fetch(poolB);
    const vaultA = poolAAccount.tokenVault;
    const vaultB = poolBAccount.tokenVault;
    const [protocolConfigPda] = deriveProtocolConfigPda(this.programId);
    let treasuryAtaA;
    let treasuryAtaB;
    try {
      const configAccount = await this.connection.getAccountInfo(protocolConfigPda);
      if (configAccount) {
        const data = configAccount.data;
        const treasury = new import_web316.PublicKey(data.subarray(40, 72));
        const feesEnabled = data[80] === 1;
        if (feesEnabled) {
          const { getAssociatedTokenAddress } = await import("@solana/spl-token");
          treasuryAtaA = await getAssociatedTokenAddress(tokenAMint, treasury, true);
          treasuryAtaB = await getAssociatedTokenAddress(tokenBMint, treasury, true);
          console.log("[Remove Liquidity] Fees enabled, treasury ATAs:", treasuryAtaA.toBase58(), treasuryAtaB.toBase58());
        }
      }
    } catch (e) {
      console.warn("[Remove Liquidity] Could not fetch protocol config:", e);
    }
    const { proof, lpNullifier, outputACommitment, outputBCommitment, outputARandomness, outputBRandomness } = await this.proofGenerator.generateRemoveLiquidityProof(
      params,
      this.wallet.keypair
    );
    params.onProgress?.("building");
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
      vaultA,
      vaultB,
      protocolConfig: protocolConfigPda,
      treasuryAtaA,
      treasuryAtaB,
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
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];
          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);
          return new VersionedTransaction4(
            new TransactionMessage3({
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
    console.log(`[Remove Liquidity] All ${signedTransactions.length} transactions signed!`);
    console.log("[Remove Liquidity] Executing signed transactions sequentially...");
    params.onProgress?.("executing");
    let phase0Signature = "";
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;
      console.log(`[Remove Liquidity] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed"
      });
      const confirmation = await this.connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[Remove Liquidity] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
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
    const makerPool = new import_web316.PublicKey(orderAccount.makerPool || params.order.escrowCommitment);
    const takerInputMint = params.takerInput.tokenMint instanceof Uint8Array ? new import_web316.PublicKey(params.takerInput.tokenMint) : params.takerInput.tokenMint;
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
    await verifyTransactionSuccess(this.connection, signature, "FillOrder");
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
    const pool = new import_web316.PublicKey(orderAccount.pool || orderAccount.makerPool);
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
    await verifyTransactionSuccess(this.connection, signature, "CancelOrder");
    return {
      signature,
      slot: 0
    };
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
      [poolPda] = import_web316.PublicKey.findProgramAddressSync(
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
      [poolPda] = import_web316.PublicKey.findProgramAddressSync(
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
    const tx = new import_web316.Transaction();
    return tx;
  }
  async buildCreateOrderTransaction(_params, _proof) {
    const tx = new import_web316.Transaction();
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
  // =============================================================================
  // Perpetual Futures Operations
  // =============================================================================
  /**
   * Open a perpetual futures position
   *
   * @param params - Open position parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async openPerpsPosition(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("perps/open_position")) {
      throw new Error("Prover not initialized. Call initializeProver(['perps/open_position']) first.");
    }
    params.onProgress?.("preparing");
    const positionSize = params.marginAmount * BigInt(params.leverage);
    const accountHash = params.input.accountHash;
    if (!accountHash) {
      throw new Error("Input note missing accountHash. Use scanNotes() to get notes with accountHash.");
    }
    const feedId = params.pythFeedId || PYTH_FEED_IDS.BTC_USD;
    let oraclePrice = params.oraclePrice;
    const pythPriceUpdate = params.priceUpdate;
    if (!oraclePrice) {
      const pythService = new PythPriceService(this.connection);
      oraclePrice = await pythService.getPriceUsd(feedId, 9);
    }
    if (!pythPriceUpdate) {
      throw new Error("priceUpdate account is required. Use @pythnetwork/pyth-solana-receiver to create one.");
    }
    params.onProgress?.("generating");
    const positionFee = positionSize * 6n / 10000n;
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? params.input.tokenMint : params.input.tokenMint.toBytes();
    const perpsPoolAccount = await this.program.account.perpsPool.fetch(params.poolId);
    const actualPoolId = perpsPoolAccount.poolId;
    const proofParams = {
      input: {
        stealthPubX: params.input.stealthPubX,
        tokenMint,
        amount: params.input.amount,
        randomness: params.input.randomness,
        leafIndex: params.input.leafIndex,
        stealthEphemeralPubkey: params.input.stealthEphemeralPubkey
      },
      perpsPoolId: actualPoolId.toBytes(),
      marketId: bytesToField(params.marketId),
      isLong: params.direction === "long",
      marginAmount: params.marginAmount,
      leverage: params.leverage,
      positionSize,
      entryPrice: oraclePrice,
      positionFee,
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merkleIndices: params.merkleIndices
    };
    const proofResult = await this.proofGenerator.generateOpenPositionProof(
      proofParams,
      this.wallet.keypair
    );
    params.onProgress?.("building");
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array ? new import_web316.PublicKey(params.input.tokenMint) : params.input.tokenMint;
    const [inputPoolPda] = derivePoolPda(inputTokenMint, this.programId);
    const inputPoolAccount = await this.program.account.pool.fetch(inputPoolPda);
    const inputVault = inputPoolAccount.tokenVault;
    const positionMint = perpsPoolAccount.positionMint;
    const [positionPoolPda] = derivePoolPda(positionMint, this.programId);
    console.log(`[OpenPosition] Position mint from perps pool: ${positionMint.toBase58()}`);
    console.log(`[OpenPosition] Position pool derived: ${positionPoolPda.toBase58()}`);
    const [protocolConfigPda] = deriveProtocolConfigPda(this.programId);
    const inputCommitment = computeCommitment(params.input);
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? await this.getRelayerPubkey();
    const { proof, nullifier, positionCommitment, positionRandomness, changeCommitment, changeRandomness, changeAmount } = proofResult;
    const [perpsMarketPda] = derivePerpsMarketPda(params.poolId, params.marketId, this.programId);
    const lightParams = await this.buildLightProtocolParams(
      accountHash,
      nullifier,
      inputPoolPda,
      heliusRpcUrl
    );
    const instructionParams = {
      // Required fields matching OpenPositionInstructionParams
      settlementPool: inputPoolPda,
      positionPool: positionPoolPda,
      perpsPool: params.poolId,
      market: perpsMarketPda,
      marketId: params.marketId,
      // 32 bytes for position note encryption
      priceUpdate: pythPriceUpdate,
      proof,
      merkleRoot: params.merkleRoot,
      inputCommitment,
      nullifier,
      positionCommitment,
      changeCommitment,
      isLong: params.direction === "long",
      marginAmount: params.marginAmount,
      positionSize,
      // margin * leverage for position note
      leverage: params.leverage,
      positionFee,
      entryPrice: oraclePrice,
      relayer: relayerPubkey,
      positionRecipient: params.positionRecipient,
      changeRecipient: params.changeRecipient,
      positionRandomness,
      changeRandomness,
      changeAmount,
      tokenMint: inputTokenMint,
      // IMPORTANT: Circuit uses input note's stealthPubX for position commitment
      inputStealthPubX: params.input.stealthPubX,
      lightVerifyParams: lightParams.lightVerifyParams,
      lightNullifierParams: lightParams.lightNullifierParams,
      remainingAccounts: lightParams.remainingAccounts
    };
    console.log("[OpenPosition] === Starting Multi-Phase Open Position ===");
    console.log("[OpenPosition] Direction:", params.direction);
    console.log("[OpenPosition] Margin:", params.marginAmount.toString());
    console.log("[OpenPosition] Leverage:", params.leverage);
    const buildResult = await buildOpenPositionWithProgram(
      this.program,
      instructionParams
    );
    params.onProgress?.("approving");
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const lookupTables = await this.getAddressLookupTables();
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: buildResult.tx });
    transactionBuilders.push({ name: "Phase 1 (Verify Commitment)", builder: buildResult.phase1Tx });
    transactionBuilders.push({ name: "Phase 2 (Create Nullifier)", builder: buildResult.phase2Tx });
    transactionBuilders.push({ name: "Phase 3 (Execute Open Position)", builder: buildResult.phase3Tx });
    const { operationId, pendingCommitments } = buildResult;
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
    const transactions = [];
    for (const { name, builder } of transactionBuilders) {
      const mainIx = await builder.instruction();
      const preIxs = builder._preInstructions || [];
      let allInstructions = [...preIxs, mainIx];
      let extraSigners = [];
      if (name.includes("Phase 3") && params.pythPostInstructions?.length) {
        allInstructions = [...params.pythPostInstructions, ...allInstructions];
        if (params.priceUpdateKeypair) {
          extraSigners.push(params.priceUpdateKeypair);
        }
      }
      if (name.includes("Final") && params.pythCloseInstructions?.length) {
        allInstructions = [...allInstructions, ...params.pythCloseInstructions];
      }
      const tx = new VersionedTransaction4(
        new TransactionMessage3({
          payerKey: relayerPubkey,
          recentBlockhash: blockhash,
          instructions: allInstructions
        }).compileToV0Message(lookupTables)
      );
      transactions.push({ name, tx, extraSigners });
    }
    params.onProgress?.("executing");
    let finalSignature = "";
    for (const { name, tx, extraSigners } of transactions) {
      console.log(`[OpenPosition] Executing ${name}...`);
      const signers = relayer ? [relayer] : [];
      if (extraSigners?.length) {
        signers.push(...extraSigners);
      }
      if (signers.length > 0) {
        tx.sign(signers);
      }
      const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
      const confirmation = await this.connection.confirmTransaction(sig, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[OpenPosition] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[OpenPosition] ${name} confirmed: ${sig}`);
      finalSignature = sig;
    }
    return {
      signature: finalSignature,
      slot: 0
    };
  }
  /**
   * Close a perpetual futures position
   *
   * @param params - Close position parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async closePerpsPosition(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("perps/close_position")) {
      throw new Error("Prover not initialized. Call initializeProver(['perps/close_position']) first.");
    }
    params.onProgress?.("preparing");
    const accountHash = params.positionInput.accountHash;
    if (!accountHash) {
      throw new Error("Position note missing accountHash. Use scanNotes() to get notes with accountHash.");
    }
    const feedId = params.pythFeedId || PYTH_FEED_IDS.BTC_USD;
    let oraclePrice = params.oraclePrice;
    const pythPriceUpdate = params.priceUpdate;
    if (!oraclePrice) {
      const pythService = new PythPriceService(this.connection);
      oraclePrice = await pythService.getPriceUsd(feedId, 9);
    }
    if (!pythPriceUpdate) {
      throw new Error("priceUpdate account is required. Use @pythnetwork/pyth-solana-receiver to create one.");
    }
    params.onProgress?.("generating");
    const closeFee = params.positionInput.margin * 6n / 10000n;
    const entryPrice = params.positionInput.entryPrice;
    const exitPrice = oraclePrice;
    const isLong = params.positionInput.isLong;
    const isProfit = isLong ? exitPrice > entryPrice : exitPrice < entryPrice;
    const priceDiff = isProfit ? isLong ? exitPrice - entryPrice : entryPrice - exitPrice : isLong ? entryPrice - exitPrice : exitPrice - entryPrice;
    const pnlAmount = priceDiff * params.positionInput.size / entryPrice;
    const tokenMint = params.settlementTokenMint.toBytes();
    const perpsPoolAccount = await this.program.account.perpsPool.fetch(params.poolId);
    const actualPoolId = perpsPoolAccount.poolId;
    const proofParams = {
      position: {
        stealthPubX: params.positionInput.stealthPubX,
        marketId: bytesToField(params.positionInput.marketId),
        isLong: params.positionInput.isLong,
        margin: params.positionInput.margin,
        size: params.positionInput.size,
        leverage: params.positionInput.leverage,
        entryPrice: params.positionInput.entryPrice,
        randomness: params.positionInput.randomness,
        leafIndex: params.positionInput.leafIndex,
        spendingKey: this.wallet.keypair.spending.sk
      },
      perpsPoolId: actualPoolId.toBytes(),
      exitPrice: oraclePrice,
      // Use resolved oracle price
      pnlAmount,
      isProfit,
      closeFee,
      settlementRecipient: params.settlementRecipient,
      tokenMint,
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merkleIndices: params.merkleIndices
    };
    const proofResult = await this.proofGenerator.generateClosePositionProof(
      proofParams,
      this.wallet.keypair
    );
    params.onProgress?.("building");
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? await this.getRelayerPubkey();
    const { proof, positionNullifier: nullifier, settlementCommitment, settlementRandomness, settlementAmount } = proofResult;
    const positionCommitment = computePositionCommitment(params.positionInput);
    const settlementTokenMint = params.settlementTokenMint;
    const [settlementPoolPda] = derivePoolPda(settlementTokenMint, this.programId);
    const [perpsMarketPda] = derivePerpsMarketPda(params.poolId, params.marketId, this.programId);
    const positionMint = perpsPoolAccount.positionMint;
    const [positionPoolPda] = derivePoolPda(positionMint, this.programId);
    const lightParams = await this.buildLightProtocolParams(
      accountHash,
      nullifier,
      positionPoolPda,
      // Position is in position pool
      heliusRpcUrl
    );
    const instructionParams = {
      positionPool: positionPoolPda,
      settlementPool: settlementPoolPda,
      perpsPool: params.poolId,
      market: perpsMarketPda,
      priceUpdate: pythPriceUpdate,
      proof,
      merkleRoot: params.merkleRoot,
      positionCommitment,
      positionNullifier: nullifier,
      settlementCommitment,
      isLong: params.positionInput.isLong,
      exitPrice: oraclePrice,
      closeFee,
      pnlAmount,
      isProfit,
      positionMargin: params.positionInput.margin,
      positionSize: params.positionInput.size,
      entryPrice: params.positionInput.entryPrice,
      relayer: relayerPubkey,
      settlementRecipient: params.settlementRecipient,
      settlementRandomness,
      settlementAmount: settlementAmount ?? params.positionInput.margin,
      tokenMint: settlementTokenMint,
      lightVerifyParams: lightParams.lightVerifyParams,
      lightNullifierParams: lightParams.lightNullifierParams,
      remainingAccounts: lightParams.remainingAccounts
    };
    console.log("[ClosePosition] === Starting Multi-Phase Close Position ===");
    const buildResult = await buildClosePositionWithProgram(
      this.program,
      instructionParams
    );
    params.onProgress?.("approving");
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const lookupTables = await this.getAddressLookupTables();
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: buildResult.tx });
    transactionBuilders.push({ name: "Phase 1 (Verify Commitment)", builder: buildResult.phase1Tx });
    transactionBuilders.push({ name: "Phase 2 (Create Nullifier)", builder: buildResult.phase2Tx });
    transactionBuilders.push({ name: "Phase 3 (Execute Close Position)", builder: buildResult.phase3Tx });
    const { operationId, pendingCommitments } = buildResult;
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
    const transactions = [];
    for (const { name, builder } of transactionBuilders) {
      const mainIx = await builder.instruction();
      const preIxs = builder._preInstructions || [];
      let allInstructions = [...preIxs, mainIx];
      let extraSigners = [];
      if (name.includes("Phase 3") && params.pythPostInstructions?.length) {
        allInstructions = [...params.pythPostInstructions, ...allInstructions];
        if (params.priceUpdateKeypair) {
          extraSigners.push(params.priceUpdateKeypair);
        }
      }
      if (name.includes("Final") && params.pythCloseInstructions?.length) {
        allInstructions = [...allInstructions, ...params.pythCloseInstructions];
      }
      const tx = new VersionedTransaction4(
        new TransactionMessage3({
          payerKey: relayerPubkey,
          recentBlockhash: blockhash,
          instructions: allInstructions
        }).compileToV0Message(lookupTables)
      );
      transactions.push({ name, tx, extraSigners });
    }
    params.onProgress?.("executing");
    let finalSignature = "";
    for (const { name, tx, extraSigners } of transactions) {
      console.log(`[ClosePosition] Executing ${name}...`);
      const signers = relayer ? [relayer] : [];
      if (extraSigners?.length) {
        signers.push(...extraSigners);
      }
      if (signers.length > 0) {
        tx.sign(signers);
      }
      const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
      const confirmation = await this.connection.confirmTransaction(sig, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[ClosePosition] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[ClosePosition] ${name} confirmed: ${sig}`);
      finalSignature = sig;
    }
    return {
      signature: finalSignature,
      slot: 0
    };
  }
  /**
   * Add liquidity to a perpetual futures pool
   *
   * @param params - Add liquidity parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async addPerpsLiquidity(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("perps/add_liquidity")) {
      throw new Error("Prover not initialized. Call initializeProver(['perps/add_liquidity']) first.");
    }
    params.onProgress?.("preparing");
    const accountHash = params.input.accountHash;
    if (!accountHash) {
      throw new Error("Input note missing accountHash. Use scanNotes() to get notes with accountHash.");
    }
    const feedId = params.pythFeedId || PYTH_FEED_IDS.BTC_USD;
    let oraclePrices = params.oraclePrices;
    const pythPriceUpdate = params.priceUpdate;
    if (!oraclePrices) {
      const pythService = new PythPriceService(this.connection);
      const price = await pythService.getPriceUsd(feedId, 9);
      oraclePrices = [price];
    }
    if (!pythPriceUpdate) {
      throw new Error("priceUpdate account is required. Use @pythnetwork/pyth-solana-receiver to create one.");
    }
    params.onProgress?.("generating");
    const feeAmount = 0n;
    const perpsPoolAccount = await this.program.account.perpsPool.fetch(params.poolId);
    const actualPoolId = perpsPoolAccount.poolId;
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? params.input.tokenMint : params.input.tokenMint.toBytes();
    const proofParams = {
      input: {
        stealthPubX: params.input.stealthPubX,
        tokenMint,
        amount: params.input.amount,
        randomness: params.input.randomness,
        leafIndex: params.input.leafIndex,
        stealthEphemeralPubkey: params.input.stealthEphemeralPubkey
      },
      perpsPoolId: actualPoolId.toBytes(),
      tokenIndex: params.tokenIndex,
      depositAmount: params.depositAmount,
      lpAmountMinted: params.lpAmount,
      feeAmount,
      lpRecipient: params.lpRecipient,
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merkleIndices: params.merkleIndices
    };
    const proofResult = await this.proofGenerator.generateAddPerpsLiquidityProof(
      proofParams,
      this.wallet.keypair
    );
    const changeRandomness = generateRandomness();
    const changeCommitment = new Uint8Array(32);
    params.onProgress?.("building");
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array ? new import_web316.PublicKey(params.input.tokenMint) : params.input.tokenMint;
    const [depositPoolPda] = derivePoolPda(inputTokenMint, this.programId);
    const depositPoolAccount = await this.program.account.pool.fetch(depositPoolPda);
    const [perpsVaultPda] = derivePerpsVaultPda(params.poolId, inputTokenMint, this.programId);
    const lpMint = perpsPoolAccount.lpMint;
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? await this.getRelayerPubkey();
    const { proof, nullifier, lpCommitment, lpRandomness } = proofResult;
    const inputCommitment = computeCommitment(params.input);
    const lightParams = await this.buildLightProtocolParams(
      accountHash,
      nullifier,
      depositPoolPda,
      heliusRpcUrl
    );
    const instructionParams = {
      depositPool: depositPoolPda,
      perpsPool: params.poolId,
      perpsPoolId: actualPoolId.toBytes(),
      // 32 bytes for LP note encryption
      priceUpdate: pythPriceUpdate,
      lpMintAccount: lpMint,
      tokenVault: depositPoolAccount.tokenVault,
      proof,
      merkleRoot: params.merkleRoot,
      inputCommitment,
      nullifier,
      lpCommitment,
      tokenIndex: params.tokenIndex,
      depositAmount: params.depositAmount,
      lpAmountMinted: params.lpAmount,
      feeAmount: 0n,
      oraclePrices,
      relayer: relayerPubkey,
      lpRecipient: params.lpRecipient,
      lpRandomness,
      tokenMint: inputTokenMint,
      lpMint,
      lightVerifyParams: lightParams.lightVerifyParams,
      lightNullifierParams: lightParams.lightNullifierParams,
      remainingAccounts: lightParams.remainingAccounts
    };
    console.log("[AddPerpsLiquidity] === Starting Multi-Phase Add Liquidity ===");
    console.log("[AddPerpsLiquidity] Token index:", params.tokenIndex);
    console.log("[AddPerpsLiquidity] Deposit amount:", params.depositAmount.toString());
    const buildResult = await buildAddPerpsLiquidityWithProgram(
      this.program,
      instructionParams
    );
    params.onProgress?.("approving");
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const lookupTables = await this.getAddressLookupTables();
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: buildResult.tx });
    transactionBuilders.push({ name: "Phase 1 (Verify Commitment)", builder: buildResult.phase1Tx });
    transactionBuilders.push({ name: "Phase 2 (Create Nullifier)", builder: buildResult.phase2Tx });
    transactionBuilders.push({ name: "Phase 3 (Execute Add Liquidity)", builder: buildResult.phase3Tx });
    const { operationId, pendingCommitments } = buildResult;
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
    const transactions = [];
    for (const { name, builder } of transactionBuilders) {
      const mainIx = await builder.instruction();
      const preIxs = builder._preInstructions || [];
      let allInstructions = [...preIxs, mainIx];
      let extraSigners = [];
      if (name.includes("Phase 3") && params.pythPostInstructions?.length) {
        allInstructions = [...params.pythPostInstructions, ...allInstructions];
        if (params.priceUpdateKeypair) {
          extraSigners.push(params.priceUpdateKeypair);
        }
      }
      if (name.includes("Final") && params.pythCloseInstructions?.length) {
        allInstructions = [...allInstructions, ...params.pythCloseInstructions];
      }
      const tx = new VersionedTransaction4(
        new TransactionMessage3({
          payerKey: relayerPubkey,
          recentBlockhash: blockhash,
          instructions: allInstructions
        }).compileToV0Message(lookupTables)
      );
      transactions.push({ name, tx, extraSigners });
    }
    params.onProgress?.("executing");
    let finalSignature = "";
    for (const { name, tx, extraSigners } of transactions) {
      console.log(`[AddPerpsLiquidity] Executing ${name}...`);
      const signers = relayer ? [relayer] : [];
      if (extraSigners?.length) {
        signers.push(...extraSigners);
      }
      if (signers.length > 0) {
        tx.sign(signers);
      }
      const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
      const confirmation = await this.connection.confirmTransaction(sig, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[AddPerpsLiquidity] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[AddPerpsLiquidity] ${name} confirmed: ${sig}`);
      finalSignature = sig;
    }
    return {
      signature: finalSignature,
      slot: 0
    };
  }
  /**
   * Remove liquidity from a perpetual futures pool
   *
   * @param params - Remove liquidity parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async removePerpsLiquidity(params, relayer) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    if (!this.proofGenerator.hasCircuit("perps/remove_liquidity")) {
      throw new Error("Prover not initialized. Call initializeProver(['perps/remove_liquidity']) first.");
    }
    params.onProgress?.("preparing");
    const accountHash = params.lpInput.accountHash;
    if (!accountHash) {
      throw new Error("LP note missing accountHash. Use scanNotes() to get notes with accountHash.");
    }
    const feedId = params.pythFeedId || PYTH_FEED_IDS.BTC_USD;
    let oraclePrices = params.oraclePrices;
    const pythPriceUpdate = params.priceUpdate;
    if (!oraclePrices) {
      const pythService = new PythPriceService(this.connection);
      const price = await pythService.getPriceUsd(feedId, 9);
      oraclePrices = [price];
    }
    if (!pythPriceUpdate) {
      throw new Error("priceUpdate account is required. Use @pythnetwork/pyth-solana-receiver to create one.");
    }
    params.onProgress?.("generating");
    const [perpsPoolAccount] = derivePerpsPoolPda(params.poolId, this.programId);
    const poolData = await this.program.account.perpsPool.fetch(params.poolId);
    const actualPoolId = poolData.poolId;
    const tokenMint = poolData.tokens[params.tokenIndex].mint;
    const tokenMintBytes = tokenMint.toBytes();
    const feeAmount = 0n;
    const changeLpAmount = params.lpInput.lpAmount - params.lpAmount;
    const proofParams = {
      lpInput: {
        stealthPubX: params.lpInput.stealthPubX,
        lpAmount: params.lpInput.lpAmount,
        randomness: params.lpInput.randomness,
        leafIndex: params.lpInput.leafIndex,
        spendingKey: this.wallet.keypair.spending.sk
      },
      perpsPoolId: actualPoolId.toBytes(),
      tokenIndex: params.tokenIndex,
      lpAmountBurned: params.lpAmount,
      withdrawAmount: params.withdrawAmount,
      feeAmount,
      outputRecipient: params.withdrawRecipient,
      outputTokenMint: tokenMintBytes,
      changeLpAmount,
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merkleIndices: params.merkleIndices
    };
    const proofResult = await this.proofGenerator.generateRemovePerpsLiquidityProof(
      proofParams,
      this.wallet.keypair
    );
    params.onProgress?.("building");
    const [withdrawalPoolPda] = derivePoolPda(tokenMint, this.programId);
    const withdrawalPoolAccount = await this.program.account.pool.fetch(withdrawalPoolPda);
    const [perpsVaultPda] = derivePerpsVaultPda(params.poolId, tokenMint, this.programId);
    const lpMint = poolData.lpMint;
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? await this.getRelayerPubkey();
    const {
      proof,
      lpNullifier: nullifier,
      outputCommitment: withdrawCommitment,
      changeLpCommitment: lpChangeCommitment,
      outputRandomness: withdrawRandomness,
      changeLpRandomness: lpChangeRandomness
    } = proofResult;
    const lpCommitment = computeLpCommitment(params.lpInput);
    const [lpPoolPda] = derivePoolPda(lpMint, this.programId);
    const lightParams = await this.buildLightProtocolParams(
      accountHash,
      nullifier,
      lpPoolPda,
      // LP commitment is in LP pool
      heliusRpcUrl
    );
    const instructionParams = {
      withdrawalPool: withdrawalPoolPda,
      perpsPool: params.poolId,
      perpsPoolId: actualPoolId.toBytes(),
      // 32 bytes for LP note encryption
      priceUpdate: pythPriceUpdate,
      lpMintAccount: lpMint,
      tokenVault: withdrawalPoolAccount.tokenVault,
      proof,
      merkleRoot: params.merkleRoot,
      lpCommitment,
      lpNullifier: nullifier,
      outputCommitment: withdrawCommitment,
      changeLpCommitment: lpChangeCommitment,
      tokenIndex: params.tokenIndex,
      withdrawAmount: params.withdrawAmount,
      lpAmountBurned: params.lpAmount,
      feeAmount: 0n,
      oraclePrices,
      relayer: relayerPubkey,
      outputRecipient: params.withdrawRecipient,
      lpChangeRecipient: params.lpChangeRecipient,
      outputRandomness: withdrawRandomness,
      lpChangeRandomness,
      tokenMint,
      lpMint,
      lpChangeAmount: changeLpAmount,
      lightVerifyParams: lightParams.lightVerifyParams,
      lightNullifierParams: lightParams.lightNullifierParams,
      remainingAccounts: lightParams.remainingAccounts
    };
    console.log("[RemovePerpsLiquidity] === Starting Multi-Phase Remove Liquidity ===");
    console.log("[RemovePerpsLiquidity] Token index:", params.tokenIndex);
    console.log("[RemovePerpsLiquidity] LP amount:", params.lpAmount.toString());
    const buildResult = await buildRemovePerpsLiquidityWithProgram(
      this.program,
      instructionParams
    );
    params.onProgress?.("approving");
    const { buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
    const { VersionedTransaction: VersionedTransaction4, TransactionMessage: TransactionMessage3 } = await import("@solana/web3.js");
    const { blockhash } = await this.connection.getLatestBlockhash("confirmed");
    const lookupTables = await this.getAddressLookupTables();
    const transactionBuilders = [];
    transactionBuilders.push({ name: "Phase 0 (Create Pending)", builder: buildResult.tx });
    transactionBuilders.push({ name: "Phase 1 (Verify Commitment)", builder: buildResult.phase1Tx });
    transactionBuilders.push({ name: "Phase 2 (Create Nullifier)", builder: buildResult.phase2Tx });
    transactionBuilders.push({ name: "Phase 3 (Execute Remove Liquidity)", builder: buildResult.phase3Tx });
    const { operationId, pendingCommitments } = buildResult;
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
    const transactions = [];
    for (const { name, builder } of transactionBuilders) {
      const mainIx = await builder.instruction();
      const preIxs = builder._preInstructions || [];
      let allInstructions = [...preIxs, mainIx];
      let extraSigners = [];
      if (name.includes("Phase 3") && params.pythPostInstructions?.length) {
        allInstructions = [...params.pythPostInstructions, ...allInstructions];
        if (params.priceUpdateKeypair) {
          extraSigners.push(params.priceUpdateKeypair);
        }
      }
      if (name.includes("Final") && params.pythCloseInstructions?.length) {
        allInstructions = [...allInstructions, ...params.pythCloseInstructions];
      }
      const tx = new VersionedTransaction4(
        new TransactionMessage3({
          payerKey: relayerPubkey,
          recentBlockhash: blockhash,
          instructions: allInstructions
        }).compileToV0Message(lookupTables)
      );
      transactions.push({ name, tx, extraSigners });
    }
    params.onProgress?.("executing");
    let finalSignature = "";
    for (const { name, tx, extraSigners } of transactions) {
      console.log(`[RemovePerpsLiquidity] Executing ${name}...`);
      const signers = relayer ? [relayer] : [];
      if (extraSigners?.length) {
        signers.push(...extraSigners);
      }
      if (signers.length > 0) {
        tx.sign(signers);
      }
      const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
      const confirmation = await this.connection.confirmTransaction(sig, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`[RemovePerpsLiquidity] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[RemovePerpsLiquidity] ${name} confirmed: ${sig}`);
      finalSignature = sig;
    }
    return {
      signature: finalSignature,
      slot: 0
    };
  }
  /**
   * Fetch all perps pools
   */
  async getAllPerpsPools() {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const accounts = await this.program.account.perpsPool.all();
    return accounts.map((acc) => ({
      address: acc.publicKey,
      data: acc.account
    }));
  }
  /**
   * Fetch a specific perps pool
   */
  async getPerpsPool(poolAddress) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    return await this.program.account.perpsPool.fetch(poolAddress);
  }
  /**
   * Fetch perps markets for a pool
   */
  async getPerpsMarkets(poolAddress) {
    if (!this.program) {
      throw new Error("No program set. Call setProgram() first.");
    }
    const accounts = await this.program.account.perpsMarket.all([
      { memcmp: { offset: 8 + 32, bytes: poolAddress.toBase58() } }
    ]);
    return accounts.map((acc) => ({
      address: acc.publicKey,
      data: acc.account
    }));
  }
  // =============================================================================
  // Perps Note Scanning
  // =============================================================================
  /**
   * Scan for position notes belonging to the current wallet
   *
   * Scans the position pool for encrypted position notes and attempts to decrypt
   * them with the user's viewing key. Returns only unspent positions.
   *
   * @param positionMint - The position mint (from perps pool's positionMint field)
   * @returns Array of decrypted position notes owned by the user
   */
  async scanPositionNotes(positionMint) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    const [positionPoolPda] = import_web316.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), positionMint.toBuffer()],
      this.programId
    );
    return this.lightClient.getUnspentPositionNotes(viewingKey, nullifierKey, this.programId, positionPoolPda);
  }
  /**
   * Scan for LP notes belonging to the current wallet
   *
   * Scans the LP pool for encrypted LP notes and attempts to decrypt
   * them with the user's viewing key. Returns only unspent LP positions.
   *
   * @param lpMint - The LP mint (from perps pool's lpMint field)
   * @returns Array of decrypted LP notes owned by the user
   */
  async scanLpNotes(lpMint) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    const [lpPoolPda] = import_web316.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), lpMint.toBuffer()],
      this.programId
    );
    return this.lightClient.getUnspentLpNotes(viewingKey, nullifierKey, this.programId, lpPoolPda);
  }
  /**
   * Scan for all position notes (including spent) for advanced use cases
   *
   * @param positionMint - The position mint
   * @returns Array of position notes with spent status
   */
  async scanPositionNotesWithStatus(positionMint) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    const [positionPoolPda] = import_web316.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), positionMint.toBuffer()],
      this.programId
    );
    return this.lightClient.scanPositionNotesWithStatus(viewingKey, nullifierKey, this.programId, positionPoolPda);
  }
  /**
   * Scan for all LP notes (including spent) for advanced use cases
   *
   * @param lpMint - The LP mint
   * @returns Array of LP notes with spent status
   */
  async scanLpNotesWithStatus(lpMint) {
    if (!this.wallet) {
      throw new Error("No wallet loaded");
    }
    if (!this.lightClient) {
      throw new Error("Light Protocol not configured. Provide heliusApiKey in config.");
    }
    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    const [lpPoolPda] = import_web316.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), lpMint.toBuffer()],
      this.programId
    );
    return this.lightClient.scanLpNotesWithStatus(viewingKey, nullifierKey, this.programId, lpPoolPda);
  }
  /**
   * Fetch position metadata for given position IDs
   *
   * Queries public PositionMeta compressed accounts to get status,
   * liquidation price, and other metadata for positions.
   *
   * @param poolId - Pool address (will be converted to bytes)
   * @param positionIds - Array of position IDs to fetch
   * @returns Map of position ID (hex) to PositionMeta
   */
  async fetchPositionMetas(poolId, positionIds) {
    if (!this.lightClient) {
      throw new Error("Light client not initialized");
    }
    return this.lightClient.fetchPositionMetas(
      this.programId,
      poolId.toBytes(),
      positionIds
    );
  }
  /**
   * Fetch all active position metas for a pool
   *
   * Useful for keepers to monitor all positions for liquidation.
   *
   * @param poolId - Pool address to scan
   * @returns Array of active PositionMeta
   */
  async fetchActivePositionMetas(poolId) {
    if (!this.lightClient) {
      throw new Error("Light client not initialized");
    }
    return this.lightClient.fetchActivePositionMetas(
      this.programId,
      poolId.toBytes()
    );
  }
};

// src/crypto/index.ts
init_poseidon();
init_babyjubjub();
init_stealth();
init_commitment();
init_nullifier();
init_encryption();

// src/crypto/elgamal.ts
init_poseidon();
init_babyjubjub();
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
      const { randomBytes } = require("crypto");
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
  const denomInv = modInverse2(denominator, fieldOrder);
  return numerator * denomInv % fieldOrder;
}
function modInverse2(a, m) {
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
  const k = generateRandomScalar3();
  const A2 = scalarMul(GENERATOR, k);
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
    A2.x,
    A2.y,
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
function generateRandomScalar3() {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== "undefined") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    const { randomBytes } = require("crypto");
    const nodeBytes = randomBytes(32);
    bytes.set(nodeBytes);
  }
  const value = bytesToField(bytes);
  const fieldOrder = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  return value % fieldOrder;
}

// src/index.ts
init_light();

// src/amm/pool.ts
var import_web317 = require("@solana/web3.js");
var import_sha3 = require("@noble/hashes/sha3");
var import_types2 = require("@cloakcraft/types");
init_constants();
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
  const poolId = new import_web317.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const tokenAMint = new import_web317.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const tokenBMint = new import_web317.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const lpMint = new import_web317.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const stateHash = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset + offset);
  const reserveA = view.getBigUint64(0, true);
  const reserveB = view.getBigUint64(8, true);
  const lpSupply = view.getBigUint64(16, true);
  const feeBps = view.getUint16(24, true);
  offset += 26;
  const authority = new import_web317.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const isActive = data[offset] === 1;
  offset += 1;
  const bump = data[offset];
  offset += 1;
  const lpMintBump = data[offset];
  offset += 1;
  const poolTypeValue = data[offset];
  const poolType = poolTypeValue === 1 ? import_types2.PoolType.StableSwap : import_types2.PoolType.ConstantProduct;
  offset += 1;
  const view2 = new DataView(data.buffer, data.byteOffset + offset);
  const amplification = view2.getBigUint64(0, true);
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
    lpMintBump,
    poolType,
    amplification
  };
}
function computeAmmStateHash(reserveA, reserveB, lpSupply, poolId) {
  const data = new Uint8Array(56);
  const view = new DataView(data.buffer);
  view.setBigUint64(0, reserveA, true);
  view.setBigUint64(8, reserveB, true);
  view.setBigUint64(16, lpSupply, true);
  data.set(poolId.toBytes(), 24);
  return (0, import_sha3.keccak_256)(data);
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
var import_types3 = require("@cloakcraft/types");
var import_types4 = require("@cloakcraft/types");
function calculateStableSwapOutput(inputAmount, reserveIn, reserveOut, amplification, feeBps = 4) {
  if (inputAmount === 0n) {
    return { outputAmount: 0n, priceImpact: 0 };
  }
  if (reserveIn === 0n || reserveOut === 0n) {
    throw new Error("Pool has no liquidity");
  }
  if (amplification <= 0n) {
    throw new Error("Amplification must be positive");
  }
  const feeAmount = inputAmount * BigInt(feeBps) / 10000n;
  const inputWithFee = inputAmount - feeAmount;
  const PRECISION = 1000000000000000000n;
  const x = reserveIn * PRECISION;
  const y = reserveOut * PRECISION;
  const dx = inputWithFee * PRECISION;
  const d = getD(x, y, amplification);
  const newX = x + dx;
  const newY = getY(newX, d, amplification);
  const outputScaled = y - newY;
  const outputAmount = outputScaled / PRECISION;
  const priceImpact = Number(inputAmount * 10000n / reserveIn) / 100;
  return { outputAmount, priceImpact };
}
function getD(x, y, amp) {
  const sum = x + y;
  if (sum === 0n) return 0n;
  const ann = amp * 4n;
  let d = sum;
  let dPrev;
  for (let i = 0; i < 255; i++) {
    let dP = d;
    dP = dP * d / (x * 2n);
    dP = dP * d / (y * 2n);
    dPrev = d;
    const numerator = (ann * sum + dP * 2n) * d;
    const denominator = (ann - 1n) * d + dP * 3n;
    d = numerator / denominator;
    if (d > dPrev) {
      if (d - dPrev <= 1n) return d;
    } else {
      if (dPrev - d <= 1n) return d;
    }
  }
  throw new Error("StableSwap D calculation failed to converge");
}
function getY(x, d, amp) {
  const ann = amp * 4n;
  const c = d * d / (x * 2n) * d / (ann * 2n);
  const b = x + d / ann;
  let y = d;
  let yPrev;
  for (let i = 0; i < 255; i++) {
    yPrev = y;
    const numerator = y * y + c;
    const denominator = y * 2n + b - d;
    y = numerator / denominator;
    if (y > yPrev) {
      if (y - yPrev <= 1n) return y;
    } else {
      if (yPrev - y <= 1n) return y;
    }
  }
  throw new Error("StableSwap Y calculation failed to converge");
}
function calculateSwapOutputUnified(inputAmount, reserveIn, reserveOut, poolType, feeBps, amplification = 0n) {
  if (poolType === import_types3.PoolType.StableSwap) {
    return calculateStableSwapOutput(inputAmount, reserveIn, reserveOut, amplification, feeBps);
  }
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
function calculatePriceImpact(inputAmount, reserveIn, reserveOut, poolType = import_types3.PoolType.ConstantProduct, feeBps = 30, amplification = 0n) {
  if (inputAmount === 0n || reserveIn === 0n) {
    return 0;
  }
  const impact = Number(inputAmount * 10000n / reserveIn) / 100;
  if (impact > 1) {
    const priceBefore = Number(reserveOut) / Number(reserveIn);
    const newReserveIn = reserveIn + inputAmount;
    const { outputAmount } = calculateSwapOutputUnified(inputAmount, reserveIn, reserveOut, poolType, feeBps, amplification);
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
var import_web318 = require("@solana/web3.js");
var MAX_TRANSACTION_SIZE = 1232;
async function buildVersionedTransaction(connection, instructions, payer, config = {}) {
  const computeBudgetIxs = [];
  const computeUnits = config.computeUnits ?? 14e5;
  computeBudgetIxs.push(
    import_web318.ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
  );
  if (config.computeUnitPrice !== void 0) {
    computeBudgetIxs.push(
      import_web318.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.computeUnitPrice })
    );
  }
  const allInstructions = [...computeBudgetIxs, ...instructions];
  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = new import_web318.TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: allInstructions
  }).compileToV0Message(config.lookupTables);
  const versionedTx = new import_web318.VersionedTransaction(messageV0);
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

// src/index.ts
init_fees();

// src/note-selector.ts
init_constants();
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
              circuitType: "transfer_1x2",
              needsConsolidation: true
              // Multiple inputs require consolidation first
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
                circuitType: "transfer_1x2",
                needsConsolidation: true
                // Multiple inputs require consolidation first
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
                circuitType: "transfer_1x2",
                needsConsolidation: true
                // Multiple inputs require consolidation first
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
   * Note: Only transfer_1x2 is supported. For multiple inputs, consolidate first.
   */
  getCircuitType(numInputs) {
    return "transfer_1x2";
  }
  /**
   * Get circuit ID for the given circuit type
   */
  getCircuitId(circuitType) {
    switch (circuitType) {
      case "transfer_1x2":
        return CIRCUIT_IDS.TRANSFER_1X2;
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

// src/voting/types.ts
var VoteBindingMode = /* @__PURE__ */ ((VoteBindingMode3) => {
  VoteBindingMode3[VoteBindingMode3["Snapshot"] = 0] = "Snapshot";
  VoteBindingMode3[VoteBindingMode3["SpendToVote"] = 1] = "SpendToVote";
  return VoteBindingMode3;
})(VoteBindingMode || {});
var RevealMode = /* @__PURE__ */ ((RevealMode2) => {
  RevealMode2[RevealMode2["Public"] = 0] = "Public";
  RevealMode2[RevealMode2["TimeLocked"] = 1] = "TimeLocked";
  RevealMode2[RevealMode2["PermanentPrivate"] = 2] = "PermanentPrivate";
  return RevealMode2;
})(RevealMode || {});
var VoteType = /* @__PURE__ */ ((VoteType2) => {
  VoteType2[VoteType2["Single"] = 0] = "Single";
  VoteType2[VoteType2["Approval"] = 1] = "Approval";
  VoteType2[VoteType2["Ranked"] = 2] = "Ranked";
  VoteType2[VoteType2["Weighted"] = 3] = "Weighted";
  return VoteType2;
})(VoteType || {});
var ResolutionMode = /* @__PURE__ */ ((ResolutionMode2) => {
  ResolutionMode2[ResolutionMode2["TallyBased"] = 0] = "TallyBased";
  ResolutionMode2[ResolutionMode2["Oracle"] = 1] = "Oracle";
  ResolutionMode2[ResolutionMode2["Authority"] = 2] = "Authority";
  return ResolutionMode2;
})(ResolutionMode || {});
var BallotStatus = /* @__PURE__ */ ((BallotStatus2) => {
  BallotStatus2[BallotStatus2["Pending"] = 0] = "Pending";
  BallotStatus2[BallotStatus2["Active"] = 1] = "Active";
  BallotStatus2[BallotStatus2["Closed"] = 2] = "Closed";
  BallotStatus2[BallotStatus2["Resolved"] = 3] = "Resolved";
  BallotStatus2[BallotStatus2["Finalized"] = 4] = "Finalized";
  return BallotStatus2;
})(BallotStatus || {});
var WeightOp = /* @__PURE__ */ ((WeightOp2) => {
  WeightOp2[WeightOp2["PushAmount"] = 0] = "PushAmount";
  WeightOp2[WeightOp2["PushConst"] = 1] = "PushConst";
  WeightOp2[WeightOp2["PushUserData"] = 2] = "PushUserData";
  WeightOp2[WeightOp2["Add"] = 3] = "Add";
  WeightOp2[WeightOp2["Sub"] = 4] = "Sub";
  WeightOp2[WeightOp2["Mul"] = 5] = "Mul";
  WeightOp2[WeightOp2["Div"] = 6] = "Div";
  WeightOp2[WeightOp2["Sqrt"] = 7] = "Sqrt";
  WeightOp2[WeightOp2["Min"] = 8] = "Min";
  WeightOp2[WeightOp2["Max"] = 9] = "Max";
  return WeightOp2;
})(WeightOp || {});

// src/voting/instructions.ts
var import_web319 = require("@solana/web3.js");
var import_spl_token6 = require("@solana/spl-token");
var import_anchor2 = require("@coral-xyz/anchor");
init_constants();
init_poseidon();
var VOTING_SEEDS = {
  BALLOT: Buffer.from("ballot"),
  BALLOT_VAULT: Buffer.from("ballot_vault"),
  PENDING_OP: Buffer.from("pending_op"),
  VK: Buffer.from("vk")
};
var CIRCUIT_IDS3 = {
  // Voting circuits - 32 bytes, underscore-padded (must match constants.rs)
  VOTE_SNAPSHOT: Buffer.from("vote_snapshot___________________"),
  // 32 chars
  CHANGE_VOTE_SNAPSHOT: Buffer.from("change_vote_snapshot____________"),
  // 32 chars
  VOTE_SPEND: Buffer.from("vote_spend______________________"),
  // 32 chars
  CLOSE_POSITION: Buffer.from("close_position__________________"),
  // 32 chars - shared with perps
  CLAIM: Buffer.from("claim___________________________")
  // 32 chars
};
function deriveBallotPda(ballotId, programId = PROGRAM_ID) {
  return import_web319.PublicKey.findProgramAddressSync(
    [VOTING_SEEDS.BALLOT, Buffer.from(ballotId)],
    programId
  );
}
function deriveBallotVaultPda(ballotId, programId = PROGRAM_ID) {
  return import_web319.PublicKey.findProgramAddressSync(
    [VOTING_SEEDS.BALLOT_VAULT, Buffer.from(ballotId)],
    programId
  );
}
function derivePendingOperationPda2(operationId, programId = PROGRAM_ID) {
  return import_web319.PublicKey.findProgramAddressSync(
    [VOTING_SEEDS.PENDING_OP, Buffer.from(operationId)],
    programId
  );
}
function deriveVerificationKeyPda2(circuitId, programId = PROGRAM_ID) {
  return import_web319.PublicKey.findProgramAddressSync(
    [VOTING_SEEDS.VK, Buffer.from(circuitId)],
    programId
  );
}
function generateOperationId2() {
  return crypto.getRandomValues(new Uint8Array(32));
}
async function buildCreateBallotInstruction(program, params, tokenMint, authority, payer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [vaultPda] = deriveBallotVaultPda(params.ballotId, programId);
  const isSpendToVote = "spendToVote" in params.bindingMode;
  const accounts = {
    ballot: ballotPda,
    tokenMint,
    authority,
    payer,
    systemProgram: import_web319.SystemProgram.programId,
    tokenProgram: import_spl_token6.TOKEN_PROGRAM_ID
  };
  if (isSpendToVote) {
    accounts.ballotVault = vaultPda;
  }
  return program.methods.createBallot(
    Array.from(params.ballotId),
    {
      bindingMode: params.bindingMode,
      revealMode: params.revealMode,
      voteType: params.voteType,
      resolutionMode: params.resolutionMode,
      numOptions: params.numOptions,
      quorumThreshold: new import_anchor2.BN(params.quorumThreshold.toString()),
      protocolFeeBps: params.protocolFeeBps,
      protocolTreasury: params.protocolTreasury,
      startTime: new import_anchor2.BN(params.startTime),
      endTime: new import_anchor2.BN(params.endTime),
      snapshotSlot: new import_anchor2.BN(params.snapshotSlot),
      indexerPubkey: params.indexerPubkey,
      eligibilityRoot: params.eligibilityRoot ? Array.from(params.eligibilityRoot) : null,
      weightFormula: Buffer.from(params.weightFormula),
      weightParams: params.weightParams.map((p) => new import_anchor2.BN(p.toString())),
      timeLockPubkey: Array.from(params.timeLockPubkey),
      unlockSlot: new import_anchor2.BN(params.unlockSlot),
      resolver: params.resolver,
      oracle: params.oracle,
      claimDeadline: new import_anchor2.BN(params.claimDeadline)
    }
  ).accounts(accounts).instruction();
}
async function buildResolveBallotInstruction(program, ballotId, outcome, authority, resolver, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const accounts = {
    ballot: ballotPda,
    authority
  };
  if (resolver) {
    accounts.resolver = resolver;
  }
  return program.methods.resolveBallot(Array.from(ballotId), outcome !== null ? outcome : null).accounts(accounts).instruction();
}
async function buildFinalizeBallotInstruction(program, ballotId, tokenMint, protocolTreasury, authority, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [vaultPda] = deriveBallotVaultPda(ballotId, programId);
  const treasuryAta = (0, import_spl_token6.getAssociatedTokenAddressSync)(tokenMint, protocolTreasury);
  return program.methods.finalizeBallot().accounts({
    ballot: ballotPda,
    ballotVault: vaultPda,
    treasury: treasuryAta,
    authority,
    tokenProgram: import_spl_token6.TOKEN_PROGRAM_ID
  }).instruction();
}
async function buildDecryptTallyInstruction(program, ballotId, decryptionKey, authority, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  return program.methods.decryptTally(Array.from(decryptionKey)).accounts({
    ballot: ballotPda,
    authority
  }).instruction();
}
async function buildVoteSnapshotPhase0Instruction(program, params, operationId, payer, relayer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda2(CIRCUIT_IDS3.VOTE_SNAPSHOT, programId);
  return program.methods.createPendingWithProofVoteSnapshot(
    Array.from(operationId),
    Array.from(params.ballotId),
    Buffer.from(params.proof),
    // bytes type needs Buffer
    Array.from(params.snapshotMerkleRoot),
    Array.from(params.noteCommitment),
    Array.from(params.voteNullifier),
    Array.from(params.voteCommitment),
    new import_anchor2.BN(params.voteChoice),
    new import_anchor2.BN(params.amount.toString()),
    new import_anchor2.BN(params.weight.toString()),
    params.encryptedContributions ? { ciphertexts: params.encryptedContributions.map((c) => Array.from(c)) } : null,
    params.encryptedPreimage ? Buffer.from(params.encryptedPreimage) : null,
    // bytes type needs Buffer
    Array.from(params.outputRandomness)
  ).accounts({
    ballot: ballotPda,
    pendingOperation: pendingOpPda,
    verificationKey: vkPda,
    relayer,
    payer,
    systemProgram: import_web319.SystemProgram.programId
  }).instruction();
}
async function buildVoteSnapshotExecuteInstruction(program, operationId, ballotId, relayer, encryptedContributions = null, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  return program.methods.executeVoteSnapshot(
    Array.from(operationId),
    Array.from(ballotId),
    encryptedContributions ? { ciphertexts: encryptedContributions.map((c) => Array.from(c)) } : null
  ).accounts({
    ballot: ballotPda,
    pendingOperation: pendingOpPda,
    relayer
  }).instruction();
}
async function buildChangeVoteSnapshotPhase0Instruction(program, params, operationId, payer, relayer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda2(CIRCUIT_IDS3.CHANGE_VOTE_SNAPSHOT, programId);
  return program.methods.createPendingWithProofChangeVoteSnapshot(
    Array.from(operationId),
    Array.from(params.oldVoteCommitment),
    Array.from(params.oldVoteCommitmentNullifier),
    Array.from(params.newVoteCommitment),
    Array.from(params.voteNullifier),
    params.oldVoteChoice,
    params.newVoteChoice,
    new import_anchor2.BN(params.weight.toString()),
    Array.from(params.proof),
    params.oldEncryptedContributions?.map((c) => Array.from(c)) || null,
    params.newEncryptedContributions?.map((c) => Array.from(c)) || null
  ).accounts({
    ballot: ballotPda,
    pendingOperation: pendingOpPda,
    verificationKey: vkPda,
    relayer,
    payer,
    systemProgram: import_web319.SystemProgram.programId
  }).instruction();
}
async function buildChangeVoteSnapshotExecuteInstruction(program, operationId, ballotId, relayer, oldEncryptedContributions = null, newEncryptedContributions = null, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  return program.methods.executeChangeVoteSnapshot(
    Array.from(operationId),
    Array.from(ballotId),
    oldEncryptedContributions ? { ciphertexts: oldEncryptedContributions.map((c) => Array.from(c)) } : null,
    newEncryptedContributions ? { ciphertexts: newEncryptedContributions.map((c) => Array.from(c)) } : null
  ).accounts({
    ballot: ballotPda,
    pendingOperation: pendingOpPda,
    relayer
  }).instruction();
}
async function buildVerifyVoteCommitmentExistsInstruction(program, operationId, ballotId, commitmentIndex, lightParams, relayer, remainingAccounts, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const onChainParams = {
    commitmentAccountHash: Array.from(lightParams.commitmentAccountHash),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: lightParams.commitmentMerkleContext.merkleTreePubkeyIndex,
      queuePubkeyIndex: lightParams.commitmentMerkleContext.queuePubkeyIndex,
      leafIndex: lightParams.commitmentMerkleContext.leafIndex,
      rootIndex: lightParams.commitmentMerkleContext.rootIndex
    },
    commitmentInclusionProof: {
      rootIndices: lightParams.commitmentInclusionProof.rootIndices,
      proof: lightParams.commitmentInclusionProof.proof.map((p) => Array.from(p))
    },
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: lightParams.commitmentAddressTreeInfo.addressMerkleTreePubkeyIndex,
      addressQueuePubkeyIndex: lightParams.commitmentAddressTreeInfo.addressQueuePubkeyIndex
    }
  };
  return program.methods.verifyVoteCommitmentExists(
    Array.from(operationId),
    Array.from(ballotId),
    commitmentIndex,
    onChainParams
  ).accounts({
    ballot: ballotPda,
    pendingOperation: pendingOpPda,
    relayer
  }).remainingAccounts(remainingAccounts).instruction();
}
async function buildVoteSpendPhase0Instruction(program, params, operationId, inputCommitment, payer, relayer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda2(CIRCUIT_IDS3.VOTE_SPEND, programId);
  return program.methods.createPendingWithProofVoteSpend(
    Array.from(operationId),
    Array.from(inputCommitment),
    Array.from(params.spendingNullifier),
    Array.from(params.positionCommitment),
    params.voteChoice,
    new import_anchor2.BN(params.amount.toString()),
    new import_anchor2.BN(params.weight.toString()),
    Array.from(params.proof),
    params.encryptedContributions?.map((c) => Array.from(c)) || null,
    params.encryptedPreimage ? Array.from(params.encryptedPreimage) : null
  ).accounts({
    ballot: ballotPda,
    pendingOperation: pendingOpPda,
    verificationKey: vkPda,
    relayer,
    payer,
    systemProgram: import_web319.SystemProgram.programId
  }).instruction();
}
async function buildVoteSpendExecuteInstruction(program, operationId, ballotId, tokenMint, relayer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const [vaultPda] = deriveBallotVaultPda(ballotId, programId);
  return program.methods.executeVoteSpend().accounts({
    ballot: ballotPda,
    ballotVault: vaultPda,
    pendingOperation: pendingOpPda,
    relayer,
    tokenProgram: import_spl_token6.TOKEN_PROGRAM_ID
  }).instruction();
}
async function buildCloseVotePositionPhase0Instruction(program, params, operationId, payer, relayer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda2(CIRCUIT_IDS3.CLOSE_POSITION, programId);
  return program.methods.createPendingWithProofCloseVotePosition(
    Array.from(operationId),
    Array.from(params.positionCommitment),
    Array.from(params.positionNullifier),
    Array.from(params.newTokenCommitment),
    params.voteChoice,
    new import_anchor2.BN(params.amount.toString()),
    new import_anchor2.BN(params.weight.toString()),
    Array.from(params.proof),
    params.encryptedContributions?.map((c) => Array.from(c)) || null
  ).accounts({
    ballot: ballotPda,
    pendingOperation: pendingOpPda,
    verificationKey: vkPda,
    relayer,
    payer,
    systemProgram: import_web319.SystemProgram.programId
  }).instruction();
}
async function buildCloseVotePositionExecuteInstruction(program, operationId, ballotId, tokenMint, relayer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const [vaultPda] = deriveBallotVaultPda(ballotId, programId);
  return program.methods.executeCloseVotePosition().accounts({
    ballot: ballotPda,
    ballotVault: vaultPda,
    pendingOperation: pendingOpPda,
    relayer,
    tokenProgram: import_spl_token6.TOKEN_PROGRAM_ID
  }).instruction();
}
async function buildClaimPhase0Instruction(program, params, operationId, payer, relayer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda2(CIRCUIT_IDS3.CLAIM, programId);
  return program.methods.createPendingWithProofClaim(
    Array.from(operationId),
    Array.from(params.positionCommitment),
    Array.from(params.positionNullifier),
    Array.from(params.payoutCommitment),
    params.voteChoice,
    new import_anchor2.BN(params.grossPayout.toString()),
    new import_anchor2.BN(params.netPayout.toString()),
    new import_anchor2.BN(params.userWeight.toString()),
    Array.from(params.proof)
  ).accounts({
    ballot: ballotPda,
    pendingOperation: pendingOpPda,
    verificationKey: vkPda,
    relayer,
    payer,
    systemProgram: import_web319.SystemProgram.programId
  }).instruction();
}
async function buildClaimExecuteInstruction(program, operationId, ballotId, tokenMint, protocolTreasury, relayer, programId = PROGRAM_ID) {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda2(operationId, programId);
  const [vaultPda] = deriveBallotVaultPda(ballotId, programId);
  const treasuryAta = (0, import_spl_token6.getAssociatedTokenAddressSync)(tokenMint, protocolTreasury);
  return program.methods.executeClaim().accounts({
    ballot: ballotPda,
    ballotVault: vaultPda,
    treasury: treasuryAta,
    pendingOperation: pendingOpPda,
    relayer,
    tokenProgram: import_spl_token6.TOKEN_PROGRAM_ID
  }).instruction();
}
var FIELD_MODULUS3 = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
function generateEncryptedContributions(voteChoice, weight, numOptions, timeLockPubkey, encryptionSeed) {
  const ciphertexts = [];
  for (let i = 0; i < numOptions; i++) {
    const value = i === voteChoice ? weight : 0n;
    const ciphertext = encryptElGamal(value, timeLockPubkey, encryptionSeed, i);
    ciphertexts.push(ciphertext);
  }
  return { ciphertexts };
}
function generateNegatedEncryptedContributions(voteChoice, weight, numOptions, timeLockPubkey, encryptionSeed) {
  const ciphertexts = [];
  for (let i = 0; i < numOptions; i++) {
    const value = i === voteChoice ? (FIELD_MODULUS3 - weight) % FIELD_MODULUS3 : 0n;
    const ciphertext = encryptElGamal(value, timeLockPubkey, encryptionSeed, i);
    ciphertexts.push(ciphertext);
  }
  return { ciphertexts };
}
function encryptElGamal(value, pubkey, seed, index) {
  const indexBytes = new Uint8Array(4);
  new DataView(indexBytes.buffer).setUint32(0, index, true);
  const combined = new Uint8Array(seed.length + 4);
  combined.set(seed);
  combined.set(indexBytes, seed.length);
  const rHash = poseidonHashDomain(0x42n, combined);
  const r = bytesToField(rHash);
  const h = bytesToField(pubkey);
  const c1 = r % FIELD_MODULUS3;
  const c2 = (h * r % FIELD_MODULUS3 + value) % FIELD_MODULUS3;
  const ciphertext = new Uint8Array(64);
  const c1Bytes = fieldToBytes(c1);
  const c2Bytes = fieldToBytes(c2);
  ciphertext.set(c1Bytes, 0);
  ciphertext.set(c2Bytes, 32);
  return ciphertext;
}
async function buildVoteSnapshotInstructions(program, params, payer, relayer, programId = PROGRAM_ID) {
  const operationId = generateOperationId2();
  const phase0 = [
    import_web319.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    await buildVoteSnapshotPhase0Instruction(program, params, operationId, payer, relayer, programId)
  ];
  const phase2 = [
    await buildVoteSnapshotExecuteInstruction(program, operationId, params.ballotId, relayer, params.encryptedContributions || null, programId)
  ];
  return [phase0, phase2];
}
async function buildChangeVoteSnapshotInstructions(program, params, payer, relayer, programId = PROGRAM_ID) {
  const operationId = generateOperationId2();
  const phase0 = [
    import_web319.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    await buildChangeVoteSnapshotPhase0Instruction(program, params, operationId, payer, relayer, programId)
  ];
  const phase2 = [
    await buildChangeVoteSnapshotExecuteInstruction(
      program,
      operationId,
      params.ballotId,
      relayer,
      params.oldEncryptedContributions || null,
      params.newEncryptedContributions || null,
      programId
    )
  ];
  return [phase0, phase2];
}
async function buildVoteSpendInstructions(program, params, inputCommitment, tokenMint, payer, relayer, programId = PROGRAM_ID) {
  const operationId = generateOperationId2();
  const phase0 = [
    import_web319.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    await buildVoteSpendPhase0Instruction(program, params, operationId, inputCommitment, payer, relayer, programId)
  ];
  const phase2 = [
    await buildVoteSpendExecuteInstruction(program, operationId, params.ballotId, tokenMint, relayer, programId)
  ];
  return [phase0, phase2];
}
async function buildClosePositionInstructions(program, params, tokenMint, payer, relayer, programId = PROGRAM_ID) {
  const operationId = generateOperationId2();
  const phase0 = [
    import_web319.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    await buildCloseVotePositionPhase0Instruction(program, params, operationId, payer, relayer, programId)
  ];
  const phase2 = [
    await buildCloseVotePositionExecuteInstruction(program, operationId, params.ballotId, tokenMint, relayer, programId)
  ];
  return [phase0, phase2];
}
async function buildClaimInstructions(program, params, tokenMint, protocolTreasury, payer, relayer, programId = PROGRAM_ID) {
  const operationId = generateOperationId2();
  const phase0 = [
    import_web319.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    await buildClaimPhase0Instruction(program, params, operationId, payer, relayer, programId)
  ];
  const phase2 = [
    await buildClaimExecuteInstruction(program, operationId, params.ballotId, tokenMint, protocolTreasury, relayer, programId)
  ];
  return [phase0, phase2];
}

// src/voting/proofs.ts
init_nullifier();
init_commitment();
init_poseidon();
init_babyjubjub();
var VOTE_NULLIFIER_DOMAIN = BigInt(16);
var VOTE_COMMITMENT_DOMAIN = BigInt(17);
var POSITION_DOMAIN = BigInt(19);
var NULLIFIER_KEY_DOMAIN = BigInt(4);
async function generateVoteSnapshotInputs(params, revealMode, tokenMint, eligibilityRoot = BigInt(0)) {
  const spendingKeyBigInt = bytesToBigInt2(params.stealthSpendingKey);
  const stealthPubXBigInt = bytesToBigInt2(params.stealthPubX);
  const ballotIdBigInt = bytesToBigInt2(params.ballotId);
  const noteCommitmentBigInt = bytesToBigInt2(params.noteCommitment);
  const snapshotMerkleRootBigInt = bytesToBigInt2(params.snapshotMerkleRoot);
  const tokenMintBigInt = bytesToBigInt2(tokenMint);
  const voteRandomness = generateRandomness();
  const voteRandomnessBigInt = bytesToBigInt2(voteRandomness);
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);
  const voteNullifier = computeVoteNullifier(nullifierKey, params.ballotId);
  const voteNullifierBigInt = bytesToBigInt2(voteNullifier);
  const amount = params.noteAmount;
  const weight = amount;
  const voteCommitment = computeVoteCommitment(
    params.ballotId,
    voteNullifier,
    params.stealthPubX,
    params.voteChoice,
    weight,
    voteRandomness
  );
  const voteCommitmentBigInt = bytesToBigInt2(voteCommitment);
  const merklePathBigInt = params.merklePath.map((p) => bytesToBigInt2(p));
  const merklePathIndicesBigInt = params.merklePathIndices.map((i) => BigInt(i));
  while (merklePathBigInt.length < 32) {
    merklePathBigInt.push(BigInt(0));
    merklePathIndicesBigInt.push(BigInt(0));
  }
  const inputs = {
    // Public inputs (must match circuit order)
    ballot_id: ballotIdBigInt,
    snapshot_merkle_root: snapshotMerkleRootBigInt,
    note_commitment: noteCommitmentBigInt,
    vote_nullifier: voteNullifierBigInt,
    vote_commitment: voteCommitmentBigInt,
    amount,
    weight,
    token_mint: tokenMintBigInt,
    eligibility_root: eligibilityRoot,
    has_eligibility: eligibilityRoot !== BigInt(0) ? BigInt(1) : BigInt(0),
    vote_choice: revealMode === 0 /* Public */ ? BigInt(params.voteChoice) : BigInt(0),
    is_public_mode: revealMode === 0 /* Public */ ? BigInt(1) : BigInt(0),
    // Private inputs
    in_stealth_pub_x: stealthPubXBigInt,
    in_randomness: bytesToBigInt2(params.noteRandomness),
    in_stealth_spending_key: spendingKeyBigInt,
    merkle_path: merklePathBigInt,
    merkle_path_indices: merklePathIndicesBigInt,
    vote_randomness: voteRandomnessBigInt,
    eligibility_path: params.eligibilityProof?.merkleProof.map((s) => BigInt(s)) || Array(20).fill(BigInt(0)),
    eligibility_path_indices: params.eligibilityProof?.pathIndices.map((i) => BigInt(i)) || Array(20).fill(BigInt(0)),
    private_vote_choice: BigInt(params.voteChoice)
  };
  return {
    inputs,
    voteNullifier,
    voteCommitment,
    voteRandomness
  };
}
async function generateChangeVoteSnapshotInputs(params, revealMode, weight) {
  const spendingKeyBigInt = bytesToBigInt2(params.stealthSpendingKey);
  const ballotIdBigInt = bytesToBigInt2(params.ballotId);
  const newRandomness = generateRandomness();
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);
  const nullifierKeyBigInt = bytesToBigInt2(nullifierKey);
  const voteNullifier = computeVoteNullifier(nullifierKey, params.ballotId);
  const voteNullifierBigInt = bytesToBigInt2(voteNullifier);
  const oldVoteCommitmentNullifier = computeVoteCommitmentNullifier(
    nullifierKey,
    params.oldVoteCommitment
  );
  const pubkey = derivePublicKeyFromSpendingKey(params.stealthSpendingKey);
  const newVoteCommitment = computeVoteCommitment(
    params.ballotId,
    voteNullifier,
    pubkey,
    params.newVoteChoice,
    weight,
    newRandomness
  );
  const inputs = {
    ballotId: ballotIdBigInt,
    voteNullifier: voteNullifierBigInt,
    oldVoteCommitment: bytesToBigInt2(params.oldVoteCommitment),
    oldVoteCommitmentNullifier: bytesToBigInt2(oldVoteCommitmentNullifier),
    newVoteCommitment: bytesToBigInt2(newVoteCommitment),
    weight,
    oldVoteChoice: revealMode === 0 /* Public */ ? BigInt(params.oldVoteChoice) : BigInt(0),
    newVoteChoice: revealMode === 0 /* Public */ ? BigInt(params.newVoteChoice) : BigInt(0),
    isPublicMode: revealMode === 0 /* Public */ ? BigInt(1) : BigInt(0),
    // Private inputs
    spendingKey: spendingKeyBigInt,
    pubkey: bytesToBigInt2(pubkey),
    oldRandomness: bytesToBigInt2(params.oldRandomness),
    newRandomness: bytesToBigInt2(newRandomness),
    privateOldVoteChoice: BigInt(params.oldVoteChoice),
    privateNewVoteChoice: BigInt(params.newVoteChoice)
  };
  return {
    oldVoteCommitmentNullifier,
    newVoteCommitment,
    newRandomness,
    inputs
  };
}
async function generateVoteSpendInputs(params, revealMode, eligibilityRoot = BigInt(0)) {
  const spendingKeyBigInt = bytesToBigInt2(params.stealthSpendingKey);
  const ballotIdBigInt = bytesToBigInt2(params.ballotId);
  const positionRandomness = generateRandomness();
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);
  const spendingNullifier = deriveSpendingNullifier(
    nullifierKey,
    params.noteCommitment,
    params.leafIndex
  );
  const pubkey = derivePublicKeyFromSpendingKey(params.stealthSpendingKey);
  const weight = params.noteAmount;
  const positionCommitment = computePositionCommitment2(
    params.ballotId,
    pubkey,
    params.voteChoice,
    params.noteAmount,
    weight,
    positionRandomness
  );
  const inputs = {
    ballotId: ballotIdBigInt,
    merkleRoot: BigInt(0),
    // Would be fetched from Light Protocol
    spendingNullifier: bytesToBigInt2(spendingNullifier),
    positionCommitment: bytesToBigInt2(positionCommitment),
    amount: params.noteAmount,
    weight,
    tokenMint: BigInt(0),
    // Would be ballot.tokenMint
    eligibilityRoot,
    hasEligibility: eligibilityRoot !== BigInt(0) ? BigInt(1) : BigInt(0),
    voteChoice: revealMode === 0 /* Public */ ? BigInt(params.voteChoice) : BigInt(0),
    isPublicMode: revealMode === 0 /* Public */ ? BigInt(1) : BigInt(0),
    // Private inputs
    inStealthPubX: bytesToBigInt2(pubkey),
    inAmount: params.noteAmount,
    inRandomness: bytesToBigInt2(params.noteRandomness),
    inStealthSpendingKey: spendingKeyBigInt,
    merklePath: params.merklePath.map((p) => bytesToBigInt2(p)),
    merklePathIndices: params.merklePathIndices.map((i) => BigInt(i)),
    leafIndex: BigInt(params.leafIndex),
    positionRandomness: bytesToBigInt2(positionRandomness),
    privateVoteChoice: BigInt(params.voteChoice),
    eligibilityPath: params.eligibilityProof?.merkleProof.map((s) => BigInt(s)) || Array(20).fill(BigInt(0)),
    eligibilityPathIndices: params.eligibilityProof?.pathIndices.map((i) => BigInt(i)) || Array(20).fill(BigInt(0))
  };
  return {
    spendingNullifier,
    positionCommitment,
    positionRandomness,
    inputs
  };
}
async function generateClaimInputs(params, ballot) {
  const spendingKeyBigInt = bytesToBigInt2(params.stealthSpendingKey);
  const ballotIdBigInt = bytesToBigInt2(params.ballotId);
  const payoutRandomness = generateRandomness();
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);
  const positionNullifier = computePositionNullifier(
    nullifierKey,
    params.positionCommitment
  );
  const isWinner = checkIsWinner(params.voteChoice, ballot.outcome, ballot.voteType);
  let grossPayout = BigInt(0);
  let netPayout = BigInt(0);
  if (isWinner && ballot.winnerWeight > BigInt(0)) {
    grossPayout = params.weight * ballot.totalPool / ballot.winnerWeight;
    const fee = grossPayout * BigInt(ballot.protocolFeeBps) / BigInt(1e4);
    netPayout = grossPayout - fee;
  }
  const pubkey = derivePublicKeyFromSpendingKey(params.stealthSpendingKey);
  const payoutCommitment = computeTokenCommitment(
    pubkey,
    ballot.tokenMint,
    netPayout,
    payoutRandomness
  );
  const isPrivateMode = ballot.revealMode === 2 /* PermanentPrivate */;
  const inputs = {
    ballotId: ballotIdBigInt,
    positionCommitment: bytesToBigInt2(params.positionCommitment),
    positionNullifier: bytesToBigInt2(positionNullifier),
    payoutCommitment: bytesToBigInt2(payoutCommitment),
    grossPayout,
    netPayout,
    voteType: BigInt(ballot.voteType),
    userWeight: params.weight,
    outcome: BigInt(ballot.outcome),
    totalPool: ballot.totalPool,
    winnerWeight: ballot.winnerWeight,
    protocolFeeBps: BigInt(ballot.protocolFeeBps),
    tokenMint: bytesToBigInt2(ballot.tokenMint),
    userVoteChoice: isPrivateMode ? BigInt(0) : BigInt(params.voteChoice),
    isPrivateMode: isPrivateMode ? BigInt(1) : BigInt(0),
    spendingKey: spendingKeyBigInt,
    pubkey: bytesToBigInt2(pubkey),
    positionAmount: params.amount,
    positionRandomness: bytesToBigInt2(params.positionRandomness),
    privateVoteChoice: BigInt(params.voteChoice),
    payoutRandomness: bytesToBigInt2(payoutRandomness)
  };
  return {
    positionNullifier,
    payoutCommitment,
    payoutRandomness,
    grossPayout,
    netPayout,
    inputs
  };
}
function bytesToBigInt2(bytes) {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    result = result << BigInt(8) | BigInt(bytes[i]);
  }
  return result;
}
function computeVoteNullifier(nullifierKey, ballotId) {
  return poseidonHashDomain(VOTE_NULLIFIER_DOMAIN, nullifierKey, ballotId);
}
function computeVoteCommitment(ballotId, voteNullifier, pubkey, voteChoice, weight, randomness) {
  return poseidonHashDomain(
    VOTE_COMMITMENT_DOMAIN,
    ballotId,
    voteNullifier,
    pubkey,
    fieldToBytes(BigInt(voteChoice)),
    fieldToBytes(weight),
    randomness
  );
}
function computeVoteCommitmentNullifier(nullifierKey, voteCommitment) {
  return poseidonHashDomain(VOTE_COMMITMENT_DOMAIN, nullifierKey, voteCommitment);
}
function computePositionCommitment2(ballotId, pubkey, voteChoice, amount, weight, randomness) {
  return poseidonHashDomain(
    POSITION_DOMAIN,
    ballotId,
    pubkey,
    fieldToBytes(BigInt(voteChoice)),
    fieldToBytes(amount),
    fieldToBytes(weight),
    randomness
  );
}
function computePositionNullifier(nullifierKey, positionCommitment) {
  return poseidonHashDomain(POSITION_DOMAIN, nullifierKey, positionCommitment);
}
function computeTokenCommitment(pubkey, tokenMint, amount, randomness) {
  const COMMITMENT_DOMAIN = 0x01n;
  return poseidonHashDomain(
    COMMITMENT_DOMAIN,
    pubkey,
    tokenMint,
    fieldToBytes(amount),
    randomness
  );
}
function derivePublicKeyFromSpendingKey(spendingKey) {
  const sk = bytesToField(spendingKey);
  const pk = derivePublicKey(sk);
  return pk.x;
}
function convertInputsToSnarkjs(inputs) {
  const result = {};
  for (const [key, value] of Object.entries(inputs)) {
    if (Array.isArray(value)) {
      result[key] = value.map((v) => v.toString());
    } else {
      result[key] = value.toString();
    }
  }
  return result;
}
function checkIsWinner(voteChoice, outcome, voteType) {
  switch (voteType) {
    case 0:
    // Single
    case 3:
      return voteChoice === outcome;
    case 1:
      return (voteChoice & 1 << outcome) !== 0;
    case 2:
      for (let rank = 0; rank < 16; rank++) {
        const rankedOption = voteChoice >> rank * 4 & 15;
        if (rankedOption === outcome) {
          return true;
        }
      }
      return false;
    default:
      return false;
  }
}

// src/voting/recovery.ts
var import_web320 = require("@solana/web3.js");
var VoteRecoveryManager = class {
  constructor(config) {
    this.cachedPreimages = /* @__PURE__ */ new Map();
    this.indexerUrl = config.indexerUrl;
    this.programId = config.programId || new import_web320.PublicKey("CLoak1111111111111111111111111111111111111");
  }
  /**
   * Scan for user's vote preimages
   */
  async scanPreimages(pubkey, options = {}) {
    const queryParams = new URLSearchParams();
    if (options.ballotId) {
      queryParams.set("ballotId", Buffer.from(options.ballotId).toString("hex"));
    }
    if (options.includeNullified) {
      queryParams.set("includeNullified", "true");
    }
    const response = await fetch(
      `${this.indexerUrl}/api/voting/preimages/${pubkey.toBase58()}?${queryParams}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch preimages");
    }
    const data = await response.json();
    const preimages = [];
    for (const entry of data.preimages) {
      const preimage = {
        ballotId: hexToBytes(entry.ballotId),
        commitment: hexToBytes(entry.commitment),
        encryptedData: hexToBytes(entry.encryptedPreimage),
        encryptionType: entry.encryptionType,
        bindingMode: entry.bindingMode
      };
      const key = entry.commitment;
      if (!this.cachedPreimages.has(key)) {
        this.cachedPreimages.set(key, preimage);
      }
      preimages.push(preimage);
    }
    return preimages;
  }
  /**
   * Decrypt a vote preimage with user's secret key
   * For PermanentPrivate mode (encryption_type = 0)
   */
  decryptWithUserKey(preimage, secretKey) {
    if (preimage.encryptionType !== 0) {
      throw new Error("Preimage is not encrypted with user key");
    }
    try {
      const decrypted = decryptPreimageWithKey(preimage.encryptedData, secretKey);
      return parseDecryptedPreimage(decrypted, preimage.bindingMode);
    } catch {
      return null;
    }
  }
  /**
   * Decrypt a vote preimage with timelock key
   * For TimeLocked mode (encryption_type = 1)
   */
  decryptWithTimelockKey(preimage, timelockDecryptionKey) {
    if (preimage.encryptionType !== 1) {
      throw new Error("Preimage is not encrypted with timelock key");
    }
    try {
      const decrypted = decryptPreimageWithKey(preimage.encryptedData, timelockDecryptionKey);
      return parseDecryptedPreimage(decrypted, preimage.bindingMode);
    } catch {
      return null;
    }
  }
  /**
   * Recover claim data for a SpendToVote position
   */
  async recoverClaimData(secretKey, ballotId, ballot) {
    if (ballot.bindingMode !== 1 /* SpendToVote */) {
      throw new Error("Claim recovery only available for SpendToVote mode");
    }
    const pubkey = derivePublicKeyFromSecret(secretKey);
    const preimages = await this.scanPreimages(new import_web320.PublicKey(pubkey), {
      ballotId,
      includeNullified: false
    });
    const claims = [];
    for (const preimage of preimages) {
      if (preimage.bindingMode !== 1 /* SpendToVote */) {
        continue;
      }
      let decrypted = null;
      if (preimage.encryptionType === 0) {
        decrypted = this.decryptWithUserKey(preimage, secretKey);
      } else if (preimage.encryptionType === 1 && ballot.revealMode === 1 /* TimeLocked */) {
        continue;
      }
      if (decrypted && decrypted.amount !== void 0) {
        claims.push({
          ballotId: decrypted.ballotId,
          positionCommitment: preimage.commitment,
          voteChoice: decrypted.voteChoice,
          amount: decrypted.amount,
          weight: decrypted.weight,
          randomness: decrypted.randomness
        });
      }
    }
    return claims;
  }
  /**
   * Recover vote data for Snapshot mode (for change vote)
   */
  async recoverVoteData(secretKey, ballotId, ballot) {
    if (ballot.bindingMode !== 0 /* Snapshot */) {
      throw new Error("Vote recovery only available for Snapshot mode");
    }
    const pubkey = derivePublicKeyFromSecret(secretKey);
    const preimages = await this.scanPreimages(new import_web320.PublicKey(pubkey), {
      ballotId,
      includeNullified: false
    });
    const votes = [];
    for (const preimage of preimages) {
      if (preimage.bindingMode !== 0 /* Snapshot */) {
        continue;
      }
      let decrypted = null;
      if (preimage.encryptionType === 0) {
        decrypted = this.decryptWithUserKey(preimage, secretKey);
      }
      if (decrypted) {
        votes.push({
          ballotId: decrypted.ballotId,
          voteCommitment: preimage.commitment,
          voteChoice: decrypted.voteChoice,
          weight: decrypted.weight,
          randomness: decrypted.randomness
        });
      }
    }
    return votes;
  }
  /**
   * Get active positions for a user on a ballot
   */
  async getActivePositions(secretKey, ballotId, ballot) {
    const pubkey = derivePublicKeyFromSecret(secretKey);
    const preimages = await this.scanPreimages(new import_web320.PublicKey(pubkey), {
      ballotId,
      includeNullified: false
    });
    const positions = [];
    for (const preimage of preimages) {
      let decrypted = null;
      if (preimage.encryptionType === 0) {
        decrypted = this.decryptWithUserKey(preimage, secretKey);
      }
      if (decrypted) {
        positions.push({
          ballotId: decrypted.ballotId,
          commitment: preimage.commitment,
          pubkey: new import_web320.PublicKey(pubkey),
          voteChoice: decrypted.voteChoice,
          amount: decrypted.amount || 0n,
          weight: decrypted.weight,
          randomness: decrypted.randomness,
          isNullified: false
        });
      }
    }
    return positions;
  }
  /**
   * Clear cached preimages
   */
  clearCache() {
    this.cachedPreimages.clear();
  }
};
function decryptPreimageWithKey(encryptedData, key) {
  if (encryptedData.length < 28) {
    throw new Error("Invalid encrypted data length");
  }
  const nonce = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12, encryptedData.length - 16);
  const tag = encryptedData.slice(encryptedData.length - 16);
  return decryptChaCha20Poly1305(ciphertext, key, nonce, tag);
}
function decryptChaCha20Poly1305(ciphertext, key, nonce, tag) {
  const { chacha20poly1305 } = require("@noble/ciphers/chacha.js");
  if (key.length !== 32) {
    throw new Error(`Invalid key length: expected 32, got ${key.length}`);
  }
  if (nonce.length !== 12) {
    throw new Error(`Invalid nonce length: expected 12, got ${nonce.length}`);
  }
  const cipher = chacha20poly1305(key, nonce);
  const sealed = new Uint8Array(ciphertext.length + tag.length);
  sealed.set(ciphertext, 0);
  sealed.set(tag, ciphertext.length);
  try {
    return cipher.decrypt(sealed);
  } catch (e) {
    throw new Error("Decryption failed: authentication tag mismatch or corrupted data");
  }
}
function parseDecryptedPreimage(data, bindingMode) {
  const expectedLength = bindingMode === 0 /* Snapshot */ ? 73 : 81;
  if (data.length !== expectedLength) {
    throw new Error(`Invalid preimage length: expected ${expectedLength}, got ${data.length}`);
  }
  let offset = 0;
  const voteChoice = data[offset];
  offset += 1;
  const weightBytes = data.slice(offset, offset + 8);
  const weight = bytesToBigInt3(weightBytes);
  offset += 8;
  let amount;
  if (bindingMode === 1 /* SpendToVote */) {
    const amountBytes = data.slice(offset, offset + 8);
    amount = bytesToBigInt3(amountBytes);
    offset += 8;
  }
  const randomness = data.slice(offset, offset + 32);
  offset += 32;
  const ballotId = data.slice(offset, offset + 32);
  return {
    voteChoice,
    weight,
    randomness,
    ballotId,
    amount
  };
}
function encryptPreimage(preimage, encryptionKey, isTimelockKey) {
  const serialized = serializePreimage(preimage);
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  const { ciphertext, tag } = encryptChaCha20Poly1305(serialized, encryptionKey, nonce);
  const result = new Uint8Array(12 + ciphertext.length + 16);
  result.set(nonce, 0);
  result.set(ciphertext, 12);
  result.set(tag, 12 + ciphertext.length);
  return result;
}
function serializePreimage(preimage) {
  const hasAmount = preimage.amount !== void 0;
  const length = hasAmount ? 81 : 73;
  const result = new Uint8Array(length);
  let offset = 0;
  result[offset] = preimage.voteChoice;
  offset += 1;
  result.set(bigIntToBytes3(preimage.weight), offset);
  offset += 8;
  if (hasAmount) {
    result.set(bigIntToBytes3(preimage.amount), offset);
    offset += 8;
  }
  result.set(preimage.randomness, offset);
  offset += 32;
  result.set(preimage.ballotId, offset);
  return result;
}
function encryptChaCha20Poly1305(plaintext, key, nonce) {
  const { chacha20poly1305 } = require("@noble/ciphers/chacha.js");
  if (key.length !== 32) {
    throw new Error(`Invalid key length: expected 32, got ${key.length}`);
  }
  if (nonce.length !== 12) {
    throw new Error(`Invalid nonce length: expected 12, got ${nonce.length}`);
  }
  const cipher = chacha20poly1305(key, nonce);
  const sealed = cipher.encrypt(plaintext);
  const ciphertext = sealed.slice(0, sealed.length - 16);
  const tag = sealed.slice(sealed.length - 16);
  return { ciphertext, tag };
}
function hexToBytes(hex) {
  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
function bytesToBigInt3(bytes) {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = result | BigInt(bytes[i]) << BigInt(i * 8);
  }
  return result;
}
function bigIntToBytes3(value) {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number(value >> BigInt(i * 8) & 0xffn);
  }
  return bytes;
}
function derivePublicKeyFromSecret(secretKey) {
  const { derivePublicKey: derivePublicKey3 } = (init_babyjubjub(), __toCommonJS(babyjubjub_exports));
  const { bytesToField: bytesToField3, fieldToBytes: fieldToBytes3 } = (init_poseidon(), __toCommonJS(poseidon_exports));
  const secretKeyBigInt = bytesToField3(secretKey);
  const pubkeyPoint = derivePublicKey3(secretKeyBigInt);
  return fieldToBytes3(pubkeyPoint.x);
}

// src/voting/client.ts
var import_web321 = require("@solana/web3.js");
var import_spl_token7 = require("@solana/spl-token");
init_commitment();
init_nullifier();
init_poseidon();
init_babyjubjub();
var VOTE_NULLIFIER_DOMAIN2 = BigInt(16);
var VOTE_COMMITMENT_DOMAIN2 = BigInt(17);
var POSITION_DOMAIN2 = BigInt(19);
var VotingClient = class {
  constructor(config) {
    this.connection = config.connection;
    this.program = config.program;
    this.programId = config.programId;
    this.lightClient = config.lightClient;
    this.circuitsBuildDir = config.circuitsBuildDir;
    this.addressMerkleTree = config.addressMerkleTree;
    this.stateMerkleTree = config.stateMerkleTree;
    this.addressLookupTables = config.addressLookupTables || [];
  }
  // ============================================================================
  // VOTE SNAPSHOT - Full Multi-Phase Execution
  // ============================================================================
  /**
   * Execute complete vote_snapshot flow (all phases)
   *
   * Phase 0: Create pending with ZK proof
   * Phase 1: Create vote nullifier (Light Protocol)
   * Phase 2: Execute vote (update tally)
   * Phase 3: Create vote commitment (Light Protocol)
   * Phase 4: Close pending operation
   */
  async voteSnapshot(params, ballot, payer, onProgress) {
    const report = (phase, msg) => {
      console.log(`[VoteSnapshot Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };
    report(0, "Generating proof inputs...");
    const { inputs, voteNullifier, voteCommitment, voteRandomness } = await generateVoteSnapshotInputs(
      params,
      ballot.revealMode,
      ballot.tokenMint.toBytes(),
      ballot.hasEligibilityRoot ? bytesToField(ballot.eligibilityRoot) : 0n
    );
    report(0, "Generating ZK proof...");
    const proofResult = await generateSnarkjsProofFromCircuit(
      "voting/vote_snapshot",
      convertInputsToSnarkjs(inputs),
      this.circuitsBuildDir
    );
    report(0, `Proof generated: ${proofResult.length} bytes`);
    let encryptedContributions;
    if (ballot.revealMode !== 0 /* Public */) {
      const encSeed = generateRandomness();
      encryptedContributions = generateEncryptedContributions(
        params.voteChoice,
        params.noteAmount,
        // weight = amount for linear formula
        ballot.numOptions,
        ballot.timeLockPubkey,
        encSeed
      );
    }
    let encryptedPreimage;
    if (ballot.revealMode !== 0 /* Public */) {
      const preimageData = {
        voteChoice: params.voteChoice,
        weight: params.noteAmount,
        randomness: voteRandomness,
        ballotId: params.ballotId
      };
      const encryptionKey = ballot.revealMode === 2 /* PermanentPrivate */ ? params.stealthSpendingKey : ballot.timeLockPubkey;
      const isTimelockKey = ballot.revealMode === 1 /* TimeLocked */;
      encryptedPreimage = encryptPreimage(preimageData, encryptionKey, isTimelockKey);
    }
    const operationId = generateOperationId2();
    const [pendingOpPda] = derivePendingOperationPda2(operationId, this.programId);
    const [ballotPda] = deriveBallotPda(params.ballotId, this.programId);
    report(0, `Operation ID: ${Buffer.from(operationId).toString("hex").slice(0, 16)}...`);
    const phase0Params = {
      ballotId: params.ballotId,
      snapshotMerkleRoot: params.snapshotMerkleRoot,
      noteCommitment: params.noteCommitment,
      voteNullifier,
      voteCommitment,
      voteChoice: params.voteChoice,
      amount: params.noteAmount,
      weight: params.noteAmount,
      // weight = amount for linear formula
      proof: proofResult,
      outputRandomness: voteRandomness,
      encryptedContributions: encryptedContributions?.ciphertexts,
      encryptedPreimage
    };
    const signatures = [];
    report(0, "Submitting Phase 0: Create pending with proof...");
    const phase0Ix = await buildVoteSnapshotPhase0Instruction(
      this.program,
      phase0Params,
      operationId,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );
    const phase0Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
        phase0Ix
      ],
      payer,
      "Phase 0"
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);
    report(1, "Creating vote nullifier...");
    await this.waitForConfirmation(phase0Sig);
    report(2, "Executing vote...");
    const phase2Ix = await buildVoteSnapshotExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      payer.publicKey,
      encryptedContributions?.ciphertexts || null,
      this.programId
    );
    const phase2Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        phase2Ix
      ],
      payer,
      "Phase 2 (Execute)"
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);
    report(3, "Creating vote commitment...");
    const { DEVNET_LIGHT_TREES: DEVNET_LIGHT_TREES2 } = await Promise.resolve().then(() => (init_light(), light_exports));
    const createCommitmentIx = await this.program.methods.createCommitment(
      Array.from(operationId),
      0
      // commitment index
    ).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase3Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        createCommitmentIx
      ],
      payer,
      "Phase 3 (Create Commitment)"
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);
    report(4, "Closing pending operation...");
    const closeIx = await this.program.methods.closePendingOperation(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase4Sig = await this.sendTransaction(
      [closeIx],
      payer,
      "Phase 4 (Close)"
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);
    report(4, `Vote snapshot complete! ${signatures.length} transactions`);
    return {
      operationId,
      voteNullifier,
      voteCommitment,
      voteRandomness,
      signatures
    };
  }
  // ============================================================================
  // VOTE SPEND - Full Multi-Phase Execution (SpendToVote)
  // ============================================================================
  /**
   * Execute complete vote_spend flow (all phases)
   *
   * Phase 0: Create pending with ZK proof
   * Phase 1: Verify input commitment exists (Light Protocol)
   * Phase 2: Create spending nullifier (Light Protocol)
   * Phase 3: Execute vote spend (update tally, transfer to vault)
   * Phase 4: Create position commitment (Light Protocol)
   * Phase 5: Close pending operation
   */
  async voteSpend(params, ballot, inputNote, payer, onProgress) {
    const report = (phase, msg) => {
      console.log(`[VoteSpend Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };
    report(0, "Generating proof inputs...");
    const { spendingNullifier, positionCommitment, positionRandomness, inputs } = await generateVoteSpendInputs(
      params,
      ballot.revealMode,
      ballot.hasEligibilityRoot ? bytesToField(ballot.eligibilityRoot) : 0n
    );
    report(0, "Generating ZK proof...");
    const proofResult = await generateSnarkjsProofFromCircuit(
      "voting/vote_spend",
      convertInputsToSnarkjs(inputs),
      this.circuitsBuildDir
    );
    report(0, `Proof generated: ${proofResult.length} bytes`);
    let encryptedContributions;
    if (ballot.revealMode !== 0 /* Public */) {
      const encSeed = generateRandomness();
      encryptedContributions = generateEncryptedContributions(
        params.voteChoice,
        inputNote.amount,
        ballot.numOptions,
        ballot.timeLockPubkey,
        encSeed
      );
    }
    let encryptedPreimage;
    if (ballot.revealMode !== 0 /* Public */) {
      const preimageData = {
        voteChoice: params.voteChoice,
        weight: inputNote.amount,
        amount: inputNote.amount,
        randomness: positionRandomness,
        ballotId: params.ballotId
      };
      const encryptionKey = ballot.revealMode === 2 /* PermanentPrivate */ ? params.stealthSpendingKey : ballot.timeLockPubkey;
      const isTimelockKey = ballot.revealMode === 1 /* TimeLocked */;
      encryptedPreimage = encryptPreimage(preimageData, encryptionKey, isTimelockKey);
    }
    const operationId = generateOperationId2();
    const [pendingOpPda] = derivePendingOperationPda2(operationId, this.programId);
    const [ballotPda] = deriveBallotPda(params.ballotId, this.programId);
    const [ballotVaultPda] = deriveBallotVaultPda(params.ballotId, this.programId);
    report(0, `Operation ID: ${Buffer.from(operationId).toString("hex").slice(0, 16)}...`);
    report(0, "Fetching Light Protocol proofs...");
    const commitmentProof = await this.lightClient.getMerkleProofByHash(inputNote.accountHash);
    const nullifierAddress = this.lightClient.deriveNullifierAddress(
      spendingNullifier,
      this.programId,
      this.addressMerkleTree,
      ballotPda
    );
    const nullifierProof = await this.lightClient.getValidityProof({
      newAddresses: [nullifierAddress],
      addressMerkleTree: this.addressMerkleTree,
      stateMerkleTree: this.stateMerkleTree
    });
    const signatures = [];
    report(0, "Submitting Phase 0: Create pending with proof...");
    const phase0Params = {
      ballotId: params.ballotId,
      spendingNullifier,
      positionCommitment,
      voteChoice: params.voteChoice,
      amount: inputNote.amount,
      weight: inputNote.amount,
      proof: proofResult,
      encryptedContributions: encryptedContributions?.ciphertexts,
      encryptedPreimage
    };
    const phase0Ix = await buildVoteSpendPhase0Instruction(
      this.program,
      phase0Params,
      operationId,
      inputNote.commitment,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );
    const phase0Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
        phase0Ix
      ],
      payer,
      "Phase 0"
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);
    report(1, "Verifying input commitment exists...");
    const verifyCommitmentIx = await this.program.methods.verifyCommitmentExists(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase1Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        verifyCommitmentIx
      ],
      payer,
      "Phase 1 (Verify Commitment)"
    );
    signatures.push(phase1Sig);
    report(1, `Phase 1 complete: ${phase1Sig}`);
    report(2, "Creating spending nullifier...");
    const createNullifierIx = await this.program.methods.createNullifierAndPending(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase2Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        createNullifierIx
      ],
      payer,
      "Phase 2 (Create Nullifier)"
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);
    report(3, "Executing vote spend...");
    const phase3Ix = await buildVoteSpendExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      ballot.tokenMint,
      payer.publicKey,
      this.programId
    );
    const phase3Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        phase3Ix
      ],
      payer,
      "Phase 3 (Execute Vote Spend)"
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);
    report(4, "Creating position commitment...");
    const createCommitmentIx = await this.program.methods.createCommitment(Array.from(operationId), 0).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase4Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        createCommitmentIx
      ],
      payer,
      "Phase 4 (Create Commitment)"
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);
    report(5, "Closing pending operation...");
    const closeIx = await this.program.methods.closePendingOperation(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase5Sig = await this.sendTransaction(
      [closeIx],
      payer,
      "Phase 5 (Close)"
    );
    signatures.push(phase5Sig);
    report(5, `Phase 5 complete: ${phase5Sig}`);
    report(5, `Vote spend complete! ${signatures.length} transactions`);
    return {
      operationId,
      spendingNullifier,
      positionCommitment,
      positionRandomness,
      signatures
    };
  }
  // ============================================================================
  // CHANGE VOTE SNAPSHOT - Full Multi-Phase Execution
  // ============================================================================
  /**
   * Execute complete change_vote_snapshot flow (atomic vote change)
   */
  async changeVoteSnapshot(params, ballot, oldWeight, payer, onProgress) {
    const report = (phase, msg) => {
      console.log(`[ChangeVote Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };
    report(0, "Generating proof inputs...");
    const { oldVoteCommitmentNullifier, newVoteCommitment, newRandomness, inputs } = await generateChangeVoteSnapshotInputs(params, ballot.revealMode, oldWeight);
    report(0, "Generating ZK proof...");
    const proofResult = await generateSnarkjsProofFromCircuit(
      "voting/change_vote_snapshot",
      convertInputsToSnarkjs(inputs),
      this.circuitsBuildDir
    );
    report(0, `Proof generated: ${proofResult.length} bytes`);
    let oldEncryptedContributions;
    let newEncryptedContributions;
    if (ballot.revealMode !== 0 /* Public */) {
      const oldEncSeed = generateRandomness();
      const newEncSeed = generateRandomness();
      oldEncryptedContributions = generateNegatedEncryptedContributions(
        params.oldVoteChoice,
        oldWeight,
        ballot.numOptions,
        ballot.timeLockPubkey,
        oldEncSeed
      ).ciphertexts;
      newEncryptedContributions = generateEncryptedContributions(
        params.newVoteChoice,
        oldWeight,
        // weight unchanged in snapshot mode
        ballot.numOptions,
        ballot.timeLockPubkey,
        newEncSeed
      ).ciphertexts;
    }
    const operationId = generateOperationId2();
    const [pendingOpPda] = derivePendingOperationPda2(operationId, this.programId);
    report(0, `Operation ID: ${Buffer.from(operationId).toString("hex").slice(0, 16)}...`);
    const signatures = [];
    report(0, "Submitting Phase 0...");
    const phase0Ix = await buildChangeVoteSnapshotPhase0Instruction(
      this.program,
      {
        ballotId: params.ballotId,
        oldVoteCommitment: params.oldVoteCommitment,
        oldVoteCommitmentNullifier,
        newVoteCommitment,
        voteNullifier: new Uint8Array(32),
        // Derived in circuit
        oldVoteChoice: params.oldVoteChoice,
        newVoteChoice: params.newVoteChoice,
        weight: oldWeight,
        proof: proofResult,
        oldEncryptedContributions,
        newEncryptedContributions
      },
      operationId,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );
    const phase0Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
        phase0Ix
      ],
      payer,
      "Phase 0"
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);
    report(1, "Verifying old vote commitment exists...");
    const verifyIx = await this.program.methods.verifyCommitmentExists(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase1Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        verifyIx
      ],
      payer,
      "Phase 1 (Verify)"
    );
    signatures.push(phase1Sig);
    report(1, `Phase 1 complete: ${phase1Sig}`);
    report(2, "Creating old vote commitment nullifier...");
    const nullifierIx = await this.program.methods.createNullifierAndPending(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase2Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        nullifierIx
      ],
      payer,
      "Phase 2 (Nullifier)"
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);
    report(3, "Executing change vote...");
    const executeIx = await buildChangeVoteSnapshotExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      payer.publicKey,
      oldEncryptedContributions || null,
      newEncryptedContributions || null,
      this.programId
    );
    const phase3Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        executeIx
      ],
      payer,
      "Phase 3 (Execute)"
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);
    report(4, "Creating new vote commitment...");
    const createCommitmentIx = await this.program.methods.createCommitment(Array.from(operationId), 0).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase4Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        createCommitmentIx
      ],
      payer,
      "Phase 4 (Create Commitment)"
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);
    report(5, "Closing pending operation...");
    const closeIx = await this.program.methods.closePendingOperation(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase5Sig = await this.sendTransaction(
      [closeIx],
      payer,
      "Phase 5 (Close)"
    );
    signatures.push(phase5Sig);
    report(5, `Phase 5 complete: ${phase5Sig}`);
    report(5, `Change vote complete! ${signatures.length} transactions`);
    return {
      operationId,
      oldVoteCommitmentNullifier,
      newVoteCommitment,
      newRandomness,
      signatures
    };
  }
  // ============================================================================
  // CLOSE POSITION - Full Multi-Phase Execution
  // ============================================================================
  /**
   * Execute complete close_position flow (exit SpendToVote position)
   */
  async closePosition(params, ballot, positionNote, newTokenRandomness, payer, onProgress) {
    const report = (phase, msg) => {
      console.log(`[ClosePosition Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };
    report(0, "Generating proof inputs...");
    const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);
    const positionNullifier = poseidonHashDomain(
      POSITION_DOMAIN2,
      nullifierKey,
      params.positionCommitment
    );
    const pubkey = derivePublicKey(bytesToField(params.stealthSpendingKey)).x;
    const newTokenCommitment = computeCommitment({
      stealthPubX: pubkey,
      tokenMint: ballot.tokenMint,
      amount: params.amount,
      randomness: newTokenRandomness
    });
    const inputs = {
      ballotId: bytesToField(params.ballotId),
      positionCommitment: bytesToField(params.positionCommitment),
      positionNullifier: bytesToField(positionNullifier),
      tokenCommitment: bytesToField(newTokenCommitment),
      voteChoice: ballot.revealMode === 0 /* Public */ ? BigInt(params.voteChoice) : 0n,
      amount: params.amount,
      weight: params.weight,
      isPublicMode: ballot.revealMode === 0 /* Public */ ? 1n : 0n,
      // Private inputs
      spendingKey: bytesToField(params.stealthSpendingKey),
      pubkey: bytesToField(pubkey),
      positionRandomness: bytesToField(params.positionRandomness),
      tokenRandomness: bytesToField(newTokenRandomness),
      tokenMint: bytesToField(ballot.tokenMint.toBytes()),
      privateVoteChoice: BigInt(params.voteChoice)
    };
    report(0, "Generating ZK proof...");
    const proofResult = await generateSnarkjsProofFromCircuit(
      "voting/close_position",
      convertInputsToSnarkjs(inputs),
      this.circuitsBuildDir
    );
    report(0, `Proof generated: ${proofResult.length} bytes`);
    let encryptedContributions;
    if (ballot.revealMode !== 0 /* Public */) {
      const encSeed = generateRandomness();
      encryptedContributions = generateNegatedEncryptedContributions(
        params.voteChoice,
        params.weight,
        ballot.numOptions,
        ballot.timeLockPubkey,
        encSeed
      ).ciphertexts;
    }
    const operationId = generateOperationId2();
    const [pendingOpPda] = derivePendingOperationPda2(operationId, this.programId);
    report(0, `Operation ID: ${Buffer.from(operationId).toString("hex").slice(0, 16)}...`);
    const signatures = [];
    report(0, "Submitting Phase 0...");
    const phase0Params = {
      ballotId: params.ballotId,
      positionNullifier,
      positionCommitment: params.positionCommitment,
      newTokenCommitment,
      voteChoice: params.voteChoice,
      amount: params.amount,
      weight: params.weight,
      proof: proofResult,
      encryptedContributions
    };
    const phase0Ix = await buildCloseVotePositionPhase0Instruction(
      this.program,
      phase0Params,
      operationId,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );
    const phase0Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
        phase0Ix
      ],
      payer,
      "Phase 0"
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);
    report(1, "Verifying position exists...");
    const verifyIx = await this.program.methods.verifyCommitmentExists(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase1Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        verifyIx
      ],
      payer,
      "Phase 1 (Verify)"
    );
    signatures.push(phase1Sig);
    report(1, `Phase 1 complete: ${phase1Sig}`);
    report(2, "Creating position nullifier...");
    const nullifierIx = await this.program.methods.createNullifierAndPending(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase2Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        nullifierIx
      ],
      payer,
      "Phase 2 (Nullifier)"
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);
    report(3, "Executing close position...");
    const executeIx = await buildCloseVotePositionExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      ballot.tokenMint,
      payer.publicKey,
      this.programId
    );
    const phase3Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        executeIx
      ],
      payer,
      "Phase 3 (Execute)"
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);
    report(4, "Creating new token commitment...");
    const createCommitmentIx = await this.program.methods.createCommitment(Array.from(operationId), 0).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase4Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        createCommitmentIx
      ],
      payer,
      "Phase 4 (Create Commitment)"
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);
    report(5, "Closing pending operation...");
    const closeIx = await this.program.methods.closePendingOperation(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase5Sig = await this.sendTransaction(
      [closeIx],
      payer,
      "Phase 5 (Close)"
    );
    signatures.push(phase5Sig);
    report(5, `Phase 5 complete: ${phase5Sig}`);
    report(5, `Close position complete! ${signatures.length} transactions`);
    return {
      operationId,
      positionNullifier,
      newTokenCommitment,
      tokenRandomness: newTokenRandomness,
      signatures
    };
  }
  // ============================================================================
  // CLAIM - Full Multi-Phase Execution
  // ============================================================================
  /**
   * Execute complete claim flow (claim winnings from SpendToVote ballot)
   */
  async claim(params, ballot, positionNote, payer, onProgress) {
    const report = (phase, msg) => {
      console.log(`[Claim Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };
    if (!ballot.hasOutcome) {
      throw new Error("Ballot not resolved - cannot claim");
    }
    report(0, "Generating proof inputs...");
    const { positionNullifier, payoutCommitment, payoutRandomness, grossPayout, netPayout, inputs } = await generateClaimInputs(params, {
      outcome: ballot.outcome,
      totalPool: ballot.poolBalance,
      winnerWeight: ballot.winnerWeight,
      protocolFeeBps: ballot.protocolFeeBps,
      voteType: 3,
      // Weighted (SpendToVote always weighted)
      tokenMint: ballot.tokenMint.toBytes(),
      revealMode: ballot.revealMode
    });
    report(0, `Gross payout: ${grossPayout}, Net payout: ${netPayout}`);
    report(0, "Generating ZK proof...");
    const proofResult = await generateSnarkjsProofFromCircuit(
      "voting/claim",
      convertInputsToSnarkjs(inputs),
      this.circuitsBuildDir
    );
    report(0, `Proof generated: ${proofResult.length} bytes`);
    const operationId = generateOperationId2();
    const [pendingOpPda] = derivePendingOperationPda2(operationId, this.programId);
    const [ballotVaultPda] = deriveBallotVaultPda(params.ballotId, this.programId);
    const protocolTreasuryAta = (0, import_spl_token7.getAssociatedTokenAddressSync)(
      ballot.tokenMint,
      ballot.protocolTreasury
    );
    report(0, `Operation ID: ${Buffer.from(operationId).toString("hex").slice(0, 16)}...`);
    const signatures = [];
    report(0, "Submitting Phase 0...");
    const phase0Params = {
      ballotId: params.ballotId,
      positionNullifier,
      positionCommitment: params.positionCommitment,
      payoutCommitment,
      voteChoice: params.voteChoice,
      grossPayout,
      netPayout,
      userWeight: params.weight,
      proof: proofResult
    };
    const phase0Ix = await buildClaimPhase0Instruction(
      this.program,
      phase0Params,
      operationId,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );
    const phase0Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
        phase0Ix
      ],
      payer,
      "Phase 0"
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);
    report(1, "Verifying position exists...");
    const verifyIx = await this.program.methods.verifyCommitmentExists(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase1Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        verifyIx
      ],
      payer,
      "Phase 1 (Verify)"
    );
    signatures.push(phase1Sig);
    report(1, `Phase 1 complete: ${phase1Sig}`);
    report(2, "Creating position nullifier...");
    const nullifierIx = await this.program.methods.createNullifierAndPending(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase2Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        nullifierIx
      ],
      payer,
      "Phase 2 (Nullifier)"
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);
    report(3, "Executing claim...");
    const executeIx = await buildClaimExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      ballot.tokenMint,
      protocolTreasuryAta,
      payer.publicKey,
      this.programId
    );
    const phase3Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }),
        executeIx
      ],
      payer,
      "Phase 3 (Execute)"
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);
    report(4, "Creating payout commitment...");
    const createCommitmentIx = await this.program.methods.createCommitment(Array.from(operationId), 0).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase4Sig = await this.sendTransaction(
      [
        import_web321.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
        createCommitmentIx
      ],
      payer,
      "Phase 4 (Create Commitment)"
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);
    report(5, "Closing pending operation...");
    const closeIx = await this.program.methods.closePendingOperation(Array.from(operationId)).accounts({
      pendingOperation: pendingOpPda,
      relayer: payer.publicKey
    }).instruction();
    const phase5Sig = await this.sendTransaction(
      [closeIx],
      payer,
      "Phase 5 (Close)"
    );
    signatures.push(phase5Sig);
    report(5, `Phase 5 complete: ${phase5Sig}`);
    report(5, `Claim complete! ${signatures.length} transactions, payout: ${netPayout}`);
    return {
      operationId,
      positionNullifier,
      payoutCommitment,
      grossPayout,
      netPayout,
      signatures
    };
  }
  // ============================================================================
  // Helper Methods
  // ============================================================================
  async sendTransaction(instructions, payer, phaseName) {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    const message = new import_web321.TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();
    const tx = new import_web321.VersionedTransaction(message);
    tx.sign([payer]);
    const signature = await this.connection.sendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: "confirmed"
    });
    const confirmation = await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    });
    if (confirmation.value.err) {
      throw new Error(`${phaseName} transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    return signature;
  }
  async waitForConfirmation(signature) {
    const status = await this.connection.getSignatureStatus(signature, {
      searchTransactionHistory: true
    });
    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ALTManager,
  AutoConsolidator,
  BPS_DIVISOR,
  BallotStatus,
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
  LP_COMMITMENT_DOMAIN,
  LightClient,
  LightCommitmentClient,
  LightProtocol,
  MAINNET_LIGHT_TREES,
  MAX_FEE_BPS,
  MAX_PERPS_TOKENS,
  MAX_TRANSACTION_SIZE,
  NOTE_TYPE_LP,
  NOTE_TYPE_POSITION,
  NOTE_TYPE_STANDARD,
  NoteManager,
  PERPS_CIRCUIT_IDS,
  PERPS_PYTH_FEED_IDS,
  PERPS_SEEDS,
  POSITION_COMMITMENT_DOMAIN,
  PROGRAM_ID,
  PYTH_FEED_IDS,
  PoolAnalyticsCalculator,
  PoolType,
  ProofGenerator,
  PythPriceService,
  ResolutionMode,
  RevealMode,
  SEEDS,
  SmartNoteSelector,
  TokenPriceFetcher,
  TransactionHistory,
  TransactionStatus,
  TransactionType,
  VOTING_CIRCUIT_IDS,
  VOTING_SEEDS,
  VoteBindingMode,
  VoteOption,
  VoteRecoveryManager,
  VoteType,
  VotingClient,
  WALLET_DERIVATION_MESSAGE,
  Wallet,
  WeightOp,
  addCiphertexts,
  ammPoolExists,
  bigintToFieldString,
  buildAddLiquidityWithProgram,
  buildAddMarketWithProgram,
  buildAddPerpsLiquidityWithProgram,
  buildAddTokenToPoolWithProgram,
  buildAtomicMultiPhaseTransaction,
  buildCancelOrderWithProgram,
  buildChangeVoteSnapshotExecuteInstruction,
  buildChangeVoteSnapshotInstructions,
  buildChangeVoteSnapshotPhase0Instruction,
  buildClaimExecuteInstruction,
  buildClaimPhase0Instruction,
  buildClosePendingOperationWithProgram,
  buildClosePositionWithProgram,
  buildCloseVotePositionExecuteInstruction,
  buildCloseVotePositionPhase0Instruction,
  buildCloseVotingPositionInstructions,
  buildConsolidationWithProgram,
  buildCreateBallotInstruction,
  buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram,
  buildDecryptTallyInstruction,
  buildFillOrderWithProgram,
  buildFinalizeBallotInstruction,
  buildInitializeAmmPoolWithProgram,
  buildInitializeCommitmentCounterWithProgram,
  buildInitializePerpsPoolWithProgram,
  buildInitializePoolWithProgram,
  buildLiquidatePositionWithProgram,
  buildOpenPositionWithProgram,
  buildRemoveLiquidityWithProgram,
  buildRemovePerpsLiquidityWithProgram,
  buildResolveBallotInstruction,
  buildShieldInstructions,
  buildShieldInstructionsForVersionedTx,
  buildShieldWithProgram,
  buildStoreCommitmentWithProgram,
  buildSwapWithProgram,
  buildTransactWithProgram,
  buildUpdateBorrowFeesWithProgram,
  buildUpdateMarketStatusWithProgram,
  buildUpdatePoolConfigWithProgram,
  buildUpdateTokenStatusWithProgram,
  buildVerifyVoteCommitmentExistsInstruction,
  buildVersionedTransaction,
  buildVoteSnapshotExecuteInstruction,
  buildVoteSnapshotInstructions,
  buildVoteSnapshotPhase0Instruction,
  buildVoteSpendExecuteInstruction,
  buildVoteSpendInstructions,
  buildVoteSpendPhase0Instruction,
  buildVotingClaimInstructions,
  bytesToField,
  bytesToFieldString,
  calculateAddLiquidityAmounts,
  calculateBorrowFees,
  calculateBorrowRate,
  calculateImbalanceFee,
  calculateInvariant,
  calculateLiquidationAmounts,
  calculateLiquidationPrice,
  calculateLpMintAmount,
  calculateLpValue,
  calculateMaxWithdrawable,
  calculateMinOutput,
  calculateMinimumFee,
  calculatePnL,
  calculatePositionFee,
  calculatePositionPrice,
  calculatePriceImpact,
  calculatePriceRatio,
  calculateProtocolFee,
  calculateRemoveLiquidityOutput,
  calculateSlippage,
  calculateStableSwapOutput,
  calculateSwapOutputUnified,
  calculateSwapProtocolFee,
  calculateTotalLiquidity,
  calculateUsdPriceImpact,
  calculateUtilization,
  calculateWithdrawAmount,
  canFitInSingleTransaction,
  canonicalTokenOrder,
  checkNullifierSpent,
  checkStealthOwnership,
  clearCircomCache,
  combineShares,
  computeAmmStateHash,
  computeCircuitInputs,
  computeCommitment,
  computeDecryptionShare,
  computeLpCommitment,
  computePositionCommitment,
  consolidationService,
  convertInputsToSnarkjs,
  createAddressLookupTable,
  createCloakCraftALT,
  createLpNote,
  createNote,
  createPendingTransaction,
  createPositionNote,
  createWallet,
  createWatchOnlyWallet,
  decryptLpNote,
  decryptNote,
  decryptPositionNote,
  deriveActionNullifier,
  deriveAmmPoolPda,
  deriveBallotPda,
  deriveBallotVaultPda,
  deriveCommitmentCounterPda,
  deriveLpMintPda,
  deriveNullifierKey,
  deriveOrderPda,
  derivePendingOperationPda,
  derivePerpsLpMintPda,
  derivePerpsMarketPda,
  derivePerpsPoolPda,
  derivePerpsVaultPda,
  derivePoolPda,
  deriveProtocolConfigPda,
  derivePublicKey,
  deriveSpendingNullifier,
  deriveStealthPrivateKey,
  deriveVaultPda,
  deriveVerificationKeyPda,
  deriveVotingPendingOperationPda,
  deriveVotingVerificationKeyPda,
  deriveWalletFromSeed,
  deriveWalletFromSignature,
  deserializeAmmPool,
  deserializeEncryptedNote,
  deserializeLpNote,
  deserializePositionNote,
  detectNoteType,
  disableAutoConsolidation,
  elgamalEncrypt,
  enableAutoConsolidation,
  encryptLpNote,
  encryptNote,
  encryptPositionNote,
  encryptPreimage,
  encryptVote,
  estimateTotalCost,
  estimateTransactionSize,
  executeVersionedTransaction,
  extendAddressLookupTable,
  feedIdToHex,
  fetchAddressLookupTable,
  fetchAmmPool,
  fetchProtocolFeeConfig,
  fetchPythPrice,
  fetchPythPriceUsd,
  fetchPythPrices,
  fetchPythVaa,
  fieldToBytes,
  formatAmmPool,
  formatApy,
  formatFeeAmount,
  formatFeeRate,
  formatPrice,
  formatPriceChange,
  formatShare,
  formatTvl,
  generateChangeVoteSnapshotInputs,
  generateDleqProof,
  generateEncryptedContributions,
  generateNegatedEncryptedContributions,
  generateOperationId,
  generateRandomness,
  generateSnarkjsProof,
  generateSnarkjsProofFromCircuit,
  generateStealthAddress,
  generateVoteRandomness,
  generateVoteSnapshotInputs,
  generateVoteSpendInputs,
  generateVotingClaimInputs,
  generateVotingOperationId,
  getAmmPool,
  getAutoConsolidator,
  getFeeBps,
  getFeedIdBySymbol,
  getInstructionFromAnchorMethod,
  getLightProtocolCommonAccounts,
  getPoolOraclePrices,
  getPriceUpdateAccountAddress,
  getPythService,
  getRandomStateTreeSet,
  getStateTreeSet,
  initPoseidon,
  initializePool,
  isFeeableOperation,
  isFreeOperation,
  isInSubgroup,
  isOnCurve,
  isPriceUpdateValid,
  isValidLeverage,
  isValidPositionSize,
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
  serializeLpNote,
  serializePositionNote,
  shouldLiquidate,
  sleep,
  storeCommitments,
  tryDecryptAnyNote,
  tryDecryptLpNote,
  tryDecryptNote,
  tryDecryptPositionNote,
  validateLiquidityAmounts,
  validateSwapAmount,
  verifyAmmStateHash,
  verifyCommitment,
  verifyDleqProof,
  verifyFeeAmount,
  verifyInvariant,
  verifyLpCommitment,
  verifyPositionCommitment,
  withRetry,
  wouldExceedUtilization,
  ...require("@cloakcraft/types")
});
