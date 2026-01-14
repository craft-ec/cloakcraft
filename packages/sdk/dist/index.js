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
    SUBGROUP_ORDER3 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
  }
});

// src/instructions/constants.ts
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
var import_web34, PROGRAM_ID, SEEDS, DEVNET_V2_TREES, CIRCUIT_IDS;
var init_constants = __esm({
  "src/instructions/constants.ts"() {
    "use strict";
    import_web34 = require("@solana/web3.js");
    PROGRAM_ID = new import_web34.PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");
    SEEDS = {
      POOL: Buffer.from("pool"),
      VAULT: Buffer.from("vault"),
      VERIFICATION_KEY: Buffer.from("vk"),
      COMMITMENT_COUNTER: Buffer.from("commitment_counter")
    };
    DEVNET_V2_TREES = {
      STATE_TREE: new import_web34.PublicKey("bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU"),
      OUTPUT_QUEUE: new import_web34.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto"),
      ADDRESS_TREE: new import_web34.PublicKey("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx")
    };
    CIRCUIT_IDS = {
      TRANSFER_1X2: "transfer_1x2",
      TRANSFER_1X3: "transfer_1x3",
      TRANSFER_2X2: "transfer_2x2",
      TRANSFER_2X3: "transfer_2x3",
      TRANSFER_3X2: "transfer_3x2",
      TRANSFER_3X3: "transfer_3x3",
      SWAP: "swap_swap",
      ADD_LIQUIDITY: "swap_add_liquidity",
      REMOVE_LIQUIDITY: "swap_remove_liquidity",
      ORDER_CREATE: "market_order_create",
      ORDER_FILL: "market_order_fill",
      ORDER_CANCEL: "market_order_cancel",
      GOVERNANCE_VOTE: "governance_encrypted_submit"
    };
  }
});

// src/instructions/light-helpers.ts
var import_stateless2, LightProtocol;
var init_light_helpers = __esm({
  "src/instructions/light-helpers.ts"() {
    "use strict";
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
  }
});

// src/instructions/swap.ts
var swap_exports = {};
__export(swap_exports, {
  buildAddLiquidityInstructionsForVersionedTx: () => buildAddLiquidityInstructionsForVersionedTx,
  buildAddLiquidityWithProgram: () => buildAddLiquidityWithProgram,
  buildClosePendingOperationWithProgram: () => buildClosePendingOperationWithProgram,
  buildCreateCommitmentWithProgram: () => buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram: () => buildCreateNullifierWithProgram,
  buildInitializeAmmPoolWithProgram: () => buildInitializeAmmPoolWithProgram,
  buildRemoveLiquidityInstructionsForVersionedTx: () => buildRemoveLiquidityInstructionsForVersionedTx,
  buildRemoveLiquidityWithProgram: () => buildRemoveLiquidityWithProgram,
  buildSwapInstructionsForVersionedTx: () => buildSwapInstructionsForVersionedTx,
  buildSwapWithProgram: () => buildSwapWithProgram,
  deriveAmmPoolPda: () => deriveAmmPoolPda,
  derivePendingOperationPda: () => derivePendingOperationPda,
  generateOperationId: () => generateOperationId
});
function deriveAmmPoolPda(tokenAMint, tokenBMint, programId) {
  const [first, second] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0 ? [tokenAMint, tokenBMint] : [tokenBMint, tokenAMint];
  return import_web39.PublicKey.findProgramAddressSync(
    [Buffer.from("amm_pool"), first.toBuffer(), second.toBuffer()],
    programId
  );
}
function derivePendingOperationPda(operationId, programId) {
  return import_web39.PublicKey.findProgramAddressSync(
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
async function buildInitializeAmmPoolWithProgram(program, params) {
  const programId = program.programId;
  const [ammPoolPda] = deriveAmmPoolPda(params.tokenAMint, params.tokenBMint, programId);
  const tx = await program.methods.initializeAmmPool(
    params.tokenAMint,
    params.tokenBMint,
    params.feeBps
  ).accountsStrict({
    ammPool: ammPoolPda,
    lpMint: params.lpMint,
    tokenAMintAccount: params.tokenAMint,
    tokenBMintAccount: params.tokenBMint,
    authority: params.authority,
    payer: params.payer,
    systemProgram: import_web39.SystemProgram.programId,
    tokenProgram: new import_web39.PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
    rent: import_web39.SYSVAR_RENT_PUBKEY
  }).preInstructions([
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 })
  ]);
  return tx;
}
async function buildSwapWithProgram(program, params, rpcUrl) {
  console.log("[DEBUG] buildSwapWithProgram params:", {
    inputPool: params.inputPool?.toBase58(),
    outputPool: params.outputPool?.toBase58(),
    inputTokenMint: params.inputTokenMint?.toBase58(),
    outputTokenMint: params.outputTokenMint?.toBase58(),
    ammPool: params.ammPool?.toBase58(),
    relayer: params.relayer?.toBase58()
  });
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
    // Use actual output amount, not minOutput
    randomness: outputRandomness
  };
  const changeNote = {
    stealthPubX: params.changeRecipient.stealthPubkey.x,
    tokenMint: params.inputTokenMint,
    amount: params.inputAmount - params.swapAmount,
    randomness: changeRandomness
  };
  console.log("[Swap] Encrypting output note: tokenMint:", params.outputTokenMint.toBase58(), "amount:", params.outputAmount.toString());
  console.log("[Swap] Encrypting change note: tokenMint:", params.inputTokenMint.toBase58(), "amount:", (params.inputAmount - params.swapAmount).toString());
  const encryptedOutputNote = encryptNote(outputNote, params.outputRecipient.stealthPubkey);
  const encryptedChangeNote = encryptNote(changeNote, params.changeRecipient.stealthPubkey);
  const outputEphemeralBytes = new Uint8Array(64);
  outputEphemeralBytes.set(params.outputRecipient.ephemeralPubkey.x, 0);
  outputEphemeralBytes.set(params.outputRecipient.ephemeralPubkey.y, 32);
  const changeEphemeralBytes = new Uint8Array(64);
  changeEphemeralBytes.set(params.changeRecipient.ephemeralPubkey.x, 0);
  changeEphemeralBytes.set(params.changeRecipient.ephemeralPubkey.y, 32);
  const pendingNullifiers = [
    {
      pool: params.inputPool,
      nullifier: params.nullifier
    }
  ];
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
  const outputTreeIndex = 0;
  const lightParams = {
    outputTreeIndex
  };
  const numCommitments = 2;
  const tx = await program.methods.swap(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.merkleRoot),
    Array.from(params.nullifier),
    Array.from(params.outputCommitment),
    Array.from(params.changeCommitment),
    new import_anchor4.BN(params.swapAmount.toString()),
    new import_anchor4.BN(params.outputAmount.toString()),
    new import_anchor4.BN(params.minOutput.toString()),
    params.swapDirection === "aToB",
    numCommitments,
    lightParams
  ).accountsStrict({
    inputPool: params.inputPool,
    outputPool: params.outputPool,
    ammPool: params.ammPool,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: import_web39.PublicKey.default
  }).preInstructions([
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return {
    tx,
    operationId,
    pendingNullifiers,
    pendingCommitments
  };
}
async function buildAddLiquidityWithProgram(program, params, _rpcUrl) {
  const programId = program.programId;
  const operationId = generateOperationId(
    params.nullifierA,
    params.lpCommitment,
    Date.now()
  );
  console.log(`[Phase 1] Generated operation ID: ${Buffer.from(operationId).toString("hex").slice(0, 16)}...`);
  console.log(`[Phase 1] Nullifier A: ${Buffer.from(params.nullifierA).toString("hex").slice(0, 16)}...`);
  console.log(`[Phase 1] Nullifier B: ${Buffer.from(params.nullifierB).toString("hex").slice(0, 16)}...`);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.ADD_LIQUIDITY, programId);
  const lpRandomness = params.lpRandomness;
  const changeARandomness = params.changeARandomness;
  const changeBRandomness = params.changeBRandomness;
  const lpNote = {
    stealthPubX: params.lpRecipient.stealthPubkey.x,
    tokenMint: params.lpMint,
    amount: params.lpAmount,
    // Use the actual LP amount, not 0
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
  const lightParams = {
    outputTreeIndex: 0
    // Not used in Phase 1
  };
  const numCommitments = 3;
  const tx = await program.methods.addLiquidity(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.nullifierA),
    Array.from(params.nullifierB),
    Array.from(params.lpCommitment),
    Array.from(params.changeACommitment),
    Array.from(params.changeBCommitment),
    new import_anchor4.BN(params.depositA.toString()),
    new import_anchor4.BN(params.depositB.toString()),
    new import_anchor4.BN(params.lpAmount.toString()),
    new import_anchor4.BN(params.minLpAmount.toString()),
    numCommitments,
    lightParams
  ).accountsStrict({
    poolA: params.poolA,
    poolB: params.poolB,
    lpPool: params.lpPool,
    ammPool: params.ammPool,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: import_web39.PublicKey.default
  }).preInstructions([
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  const pendingNullifiers = [
    { pool: params.poolA, nullifier: params.nullifierA },
    { pool: params.poolB, nullifier: params.nullifierB }
  ];
  return {
    tx,
    operationId,
    pendingNullifiers,
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
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }),
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return { tx };
}
async function buildRemoveLiquidityWithProgram(program, params, rpcUrl) {
  const programId = program.programId;
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
    // Use actual amount from withdrawal
    randomness: outputARandomness
  };
  const outputBNote = {
    stealthPubX: params.outputBRecipient.stealthPubkey.x,
    tokenMint: params.tokenBMint,
    amount: params.outputBAmount,
    // Use actual amount from withdrawal
    randomness: outputBRandomness
  };
  const encryptedOutputA = encryptNote(outputANote, params.outputARecipient.stealthPubkey);
  const encryptedOutputB = encryptNote(outputBNote, params.outputBRecipient.stealthPubkey);
  const outputAEphemeral = new Uint8Array(64);
  outputAEphemeral.set(params.outputARecipient.ephemeralPubkey.x, 0);
  outputAEphemeral.set(params.outputARecipient.ephemeralPubkey.y, 32);
  const outputBEphemeral = new Uint8Array(64);
  outputBEphemeral.set(params.outputBRecipient.ephemeralPubkey.x, 0);
  outputBEphemeral.set(params.outputBRecipient.ephemeralPubkey.y, 32);
  const pendingNullifiers = [
    {
      pool: params.lpPool,
      nullifier: params.lpNullifier
    }
  ];
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
  const outputTreeIndex = 0;
  const lightParams = {
    outputTreeIndex
  };
  const numCommitments = 2;
  const tx = await program.methods.removeLiquidity(
    Array.from(operationId),
    Buffer.from(params.proof),
    Array.from(params.lpNullifier),
    Array.from(params.outputACommitment),
    Array.from(params.outputBCommitment),
    Array.from(params.oldPoolStateHash),
    Array.from(params.newPoolStateHash),
    numCommitments,
    lightParams
  ).accountsStrict({
    lpPool: params.lpPool,
    poolA: params.poolA,
    poolB: params.poolB,
    ammPool: params.ammPool,
    verificationKey: vkPda,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    systemProgram: import_web39.PublicKey.default
  }).preInstructions([
    import_web39.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 }),
    import_web39.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return {
    tx,
    operationId,
    pendingNullifiers,
    pendingCommitments
  };
}
async function buildSwapInstructionsForVersionedTx(program, params, rpcUrl) {
  const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildSwapWithProgram(program, params, rpcUrl);
  const instructions = [];
  const phase1Ix = await phase1Tx.instruction();
  instructions.push(phase1Ix);
  for (let i = 0; i < pendingNullifiers.length; i++) {
    const pn = pendingNullifiers[i];
    const { tx: nullifierTx } = await buildCreateNullifierWithProgram(
      program,
      {
        operationId,
        nullifierIndex: i,
        pool: pn.pool,
        relayer: params.relayer,
        nullifier: pn.nullifier
        // Pass nullifier directly for versioned tx
      },
      rpcUrl
    );
    const nullifierIx = await nullifierTx.instruction();
    instructions.push(nullifierIx);
  }
  for (let i = 0; i < pendingCommitments.length; i++) {
    const pc = pendingCommitments[i];
    if (pc.commitment.every((b) => b === 0)) continue;
    const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
      program,
      {
        operationId,
        commitmentIndex: i,
        pool: pc.pool,
        relayer: params.relayer,
        stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
        encryptedNote: pc.encryptedNote,
        commitment: pc.commitment
        // Pass commitment directly for versioned tx
      },
      rpcUrl
    );
    const commitmentIx = await commitmentTx.instruction();
    instructions.push(commitmentIx);
  }
  const { tx: closeTx } = await buildClosePendingOperationWithProgram(
    program,
    operationId,
    params.relayer
  );
  const closeIx = await closeTx.instruction();
  instructions.push(closeIx);
  return { instructions, operationId };
}
async function buildAddLiquidityInstructionsForVersionedTx(program, params, rpcUrl) {
  const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildAddLiquidityWithProgram(program, params, rpcUrl);
  const instructions = [];
  const phase1Ix = await phase1Tx.instruction();
  instructions.push(phase1Ix);
  for (let i = 0; i < pendingNullifiers.length; i++) {
    const pn = pendingNullifiers[i];
    const { tx: nullifierTx } = await buildCreateNullifierWithProgram(
      program,
      {
        operationId,
        nullifierIndex: i,
        pool: pn.pool,
        relayer: params.relayer,
        nullifier: pn.nullifier
        // Pass nullifier directly for versioned tx
      },
      rpcUrl
    );
    const nullifierIx = await nullifierTx.instruction();
    instructions.push(nullifierIx);
  }
  for (let i = 0; i < pendingCommitments.length; i++) {
    const pc = pendingCommitments[i];
    if (pc.commitment.every((b) => b === 0)) continue;
    const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
      program,
      {
        operationId,
        commitmentIndex: i,
        pool: pc.pool,
        relayer: params.relayer,
        stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
        encryptedNote: pc.encryptedNote,
        commitment: pc.commitment
        // Pass commitment directly for versioned tx
      },
      rpcUrl
    );
    const commitmentIx = await commitmentTx.instruction();
    instructions.push(commitmentIx);
  }
  const { tx: closeTx } = await buildClosePendingOperationWithProgram(
    program,
    operationId,
    params.relayer
  );
  const closeIx = await closeTx.instruction();
  instructions.push(closeIx);
  return { instructions, operationId };
}
async function buildRemoveLiquidityInstructionsForVersionedTx(program, params, rpcUrl) {
  const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildRemoveLiquidityWithProgram(program, params, rpcUrl);
  const instructions = [];
  const phase1Ix = await phase1Tx.instruction();
  instructions.push(phase1Ix);
  for (let i = 0; i < pendingNullifiers.length; i++) {
    const pn = pendingNullifiers[i];
    const { tx: nullifierTx } = await buildCreateNullifierWithProgram(
      program,
      {
        operationId,
        nullifierIndex: i,
        pool: pn.pool,
        relayer: params.relayer,
        nullifier: pn.nullifier
        // Pass nullifier directly for versioned tx
      },
      rpcUrl
    );
    const nullifierIx = await nullifierTx.instruction();
    instructions.push(nullifierIx);
  }
  for (let i = 0; i < pendingCommitments.length; i++) {
    const pc = pendingCommitments[i];
    if (pc.commitment.every((b) => b === 0)) continue;
    const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
      program,
      {
        operationId,
        commitmentIndex: i,
        pool: pc.pool,
        relayer: params.relayer,
        stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
        encryptedNote: pc.encryptedNote,
        commitment: pc.commitment
        // Pass commitment directly for versioned tx
      },
      rpcUrl
    );
    const commitmentIx = await commitmentTx.instruction();
    instructions.push(commitmentIx);
  }
  const { tx: closeTx } = await buildClosePendingOperationWithProgram(
    program,
    operationId,
    params.relayer
  );
  const closeIx = await closeTx.instruction();
  instructions.push(closeIx);
  return { instructions, operationId };
}
var import_web39, import_anchor4;
var init_swap = __esm({
  "src/instructions/swap.ts"() {
    "use strict";
    import_web39 = require("@solana/web3.js");
    import_anchor4 = require("@coral-xyz/anchor");
    init_constants();
    init_light_helpers();
    init_encryption();
  }
});

// src/versioned-transaction.ts
var versioned_transaction_exports = {};
__export(versioned_transaction_exports, {
  MAX_TRANSACTION_SIZE: () => MAX_TRANSACTION_SIZE,
  buildAtomicMultiPhaseTransaction: () => buildAtomicMultiPhaseTransaction,
  buildVersionedTransaction: () => buildVersionedTransaction,
  canFitInSingleTransaction: () => canFitInSingleTransaction,
  estimateTransactionSize: () => estimateTransactionSize,
  executeVersionedTransaction: () => executeVersionedTransaction,
  getInstructionFromAnchorMethod: () => getInstructionFromAnchorMethod
});
async function buildVersionedTransaction(connection, instructions, payer, config = {}) {
  const computeBudgetIxs = [];
  const computeUnits = config.computeUnits ?? 14e5;
  computeBudgetIxs.push(
    import_web312.ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
  );
  if (config.computeUnitPrice !== void 0) {
    computeBudgetIxs.push(
      import_web312.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.computeUnitPrice })
    );
  }
  const allInstructions = [...computeBudgetIxs, ...instructions];
  const { blockhash } = await connection.getLatestBlockhash();
  const messageV0 = new import_web312.TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: allInstructions
  }).compileToV0Message(config.lookupTables);
  const versionedTx = new import_web312.VersionedTransaction(messageV0);
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
      const signature = await connection.sendTransaction(tx, {
        skipPreflight,
        maxRetries: 0
        // Handle retries ourselves
      });
      console.log(`[Versioned TX] Transaction sent: ${signature}`);
      const confirmation = await connection.confirmTransaction(signature, "confirmed");
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[Versioned TX] Transaction confirmed: ${signature}`);
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
var import_web312, MAX_TRANSACTION_SIZE;
var init_versioned_transaction = __esm({
  "src/versioned-transaction.ts"() {
    "use strict";
    import_web312 = require("@solana/web3.js");
    MAX_TRANSACTION_SIZE = 1232;
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  ALTManager: () => ALTManager,
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
  MAX_TRANSACTION_SIZE: () => MAX_TRANSACTION_SIZE,
  NoteManager: () => NoteManager,
  PROGRAM_ID: () => PROGRAM_ID,
  ProofGenerator: () => ProofGenerator,
  SEEDS: () => SEEDS,
  VoteOption: () => VoteOption,
  WALLET_DERIVATION_MESSAGE: () => WALLET_DERIVATION_MESSAGE,
  Wallet: () => Wallet,
  addCiphertexts: () => addCiphertexts,
  ammPoolExists: () => ammPoolExists,
  bigintToFieldString: () => bigintToFieldString,
  buildAddLiquidityInstructionsForVersionedTx: () => buildAddLiquidityInstructionsForVersionedTx,
  buildAddLiquidityWithProgram: () => buildAddLiquidityWithProgram,
  buildAtomicMultiPhaseTransaction: () => buildAtomicMultiPhaseTransaction,
  buildCancelOrderWithProgram: () => buildCancelOrderWithProgram,
  buildClosePendingOperationWithProgram: () => buildClosePendingOperationWithProgram,
  buildCreateAggregationWithProgram: () => buildCreateAggregationWithProgram,
  buildCreateCommitmentWithProgram: () => buildCreateCommitmentWithProgram,
  buildCreateNullifierWithProgram: () => buildCreateNullifierWithProgram,
  buildFillOrderWithProgram: () => buildFillOrderWithProgram,
  buildFinalizeDecryptionWithProgram: () => buildFinalizeDecryptionWithProgram,
  buildInitializeAmmPoolWithProgram: () => buildInitializeAmmPoolWithProgram,
  buildInitializeCommitmentCounterWithProgram: () => buildInitializeCommitmentCounterWithProgram,
  buildInitializePoolWithProgram: () => buildInitializePoolWithProgram,
  buildRemoveLiquidityInstructionsForVersionedTx: () => buildRemoveLiquidityInstructionsForVersionedTx,
  buildRemoveLiquidityWithProgram: () => buildRemoveLiquidityWithProgram,
  buildShieldInstructions: () => buildShieldInstructions,
  buildShieldWithProgram: () => buildShieldWithProgram,
  buildStoreCommitmentWithProgram: () => buildStoreCommitmentWithProgram,
  buildSubmitDecryptionShareWithProgram: () => buildSubmitDecryptionShareWithProgram,
  buildSubmitVoteWithProgram: () => buildSubmitVoteWithProgram,
  buildSwapInstructionsForVersionedTx: () => buildSwapInstructionsForVersionedTx,
  buildSwapWithProgram: () => buildSwapWithProgram,
  buildTransactWithProgram: () => buildTransactWithProgram,
  buildVersionedTransaction: () => buildVersionedTransaction,
  bytesToField: () => bytesToField,
  bytesToFieldString: () => bytesToFieldString,
  calculateAddLiquidityAmounts: () => calculateAddLiquidityAmounts,
  calculateMinOutput: () => calculateMinOutput,
  calculatePriceImpact: () => calculatePriceImpact,
  calculatePriceRatio: () => calculatePriceRatio,
  calculateRemoveLiquidityOutput: () => calculateRemoveLiquidityOutput,
  calculateSlippage: () => calculateSlippage,
  calculateSwapOutput: () => calculateSwapOutput,
  calculateTotalLiquidity: () => calculateTotalLiquidity,
  canFitInSingleTransaction: () => canFitInSingleTransaction,
  checkNullifierSpent: () => checkNullifierSpent,
  checkStealthOwnership: () => checkStealthOwnership,
  combineShares: () => combineShares,
  computeAmmStateHash: () => computeAmmStateHash,
  computeCircuitInputs: () => computeCircuitInputs,
  computeCommitment: () => computeCommitment,
  computeDecryptionShare: () => computeDecryptionShare,
  createAddressLookupTable: () => createAddressLookupTable,
  createCloakCraftALT: () => createCloakCraftALT,
  createNote: () => createNote,
  createWallet: () => createWallet,
  createWatchOnlyWallet: () => createWatchOnlyWallet,
  decryptNote: () => decryptNote,
  deriveActionNullifier: () => deriveActionNullifier,
  deriveAggregationPda: () => deriveAggregationPda,
  deriveAmmPoolPda: () => deriveAmmPoolPda,
  deriveCommitmentCounterPda: () => deriveCommitmentCounterPda,
  deriveNullifierKey: () => deriveNullifierKey,
  deriveOrderPda: () => deriveOrderPda,
  derivePendingOperationPda: () => derivePendingOperationPda,
  derivePoolPda: () => derivePoolPda,
  derivePublicKey: () => derivePublicKey,
  deriveSpendingNullifier: () => deriveSpendingNullifier,
  deriveStealthPrivateKey: () => deriveStealthPrivateKey,
  deriveVaultPda: () => deriveVaultPda,
  deriveVerificationKeyPda: () => deriveVerificationKeyPda,
  deriveWalletFromSeed: () => deriveWalletFromSeed,
  deriveWalletFromSignature: () => deriveWalletFromSignature,
  deserializeAmmPool: () => deserializeAmmPool,
  deserializeEncryptedNote: () => deserializeEncryptedNote,
  elgamalEncrypt: () => elgamalEncrypt,
  encryptNote: () => encryptNote,
  encryptVote: () => encryptVote,
  estimateTransactionSize: () => estimateTransactionSize,
  executeVersionedTransaction: () => executeVersionedTransaction,
  extendAddressLookupTable: () => extendAddressLookupTable,
  fetchAddressLookupTable: () => fetchAddressLookupTable,
  fetchAmmPool: () => fetchAmmPool,
  fieldToBytes: () => fieldToBytes,
  formatAmmPool: () => formatAmmPool,
  generateDleqProof: () => generateDleqProof,
  generateOperationId: () => generateOperationId,
  generateRandomness: () => generateRandomness,
  generateSnarkjsProof: () => generateSnarkjsProof,
  generateStealthAddress: () => generateStealthAddress,
  generateVoteRandomness: () => generateVoteRandomness,
  getAmmPool: () => getAmmPool,
  getInstructionFromAnchorMethod: () => getInstructionFromAnchorMethod,
  getLightProtocolCommonAccounts: () => getLightProtocolCommonAccounts,
  getRandomStateTreeSet: () => getRandomStateTreeSet,
  getStateTreeSet: () => getStateTreeSet,
  initPoseidon: () => initPoseidon,
  initializePool: () => initializePool,
  isInSubgroup: () => isInSubgroup,
  isOnCurve: () => isOnCurve,
  lagrangeCoefficient: () => lagrangeCoefficient,
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
  refreshAmmPool: () => refreshAmmPool,
  scalarMul: () => scalarMul,
  serializeCiphertext: () => serializeCiphertext,
  serializeCiphertextFull: () => serializeCiphertextFull,
  serializeEncryptedNote: () => serializeEncryptedNote,
  serializeEncryptedVote: () => serializeEncryptedVote,
  serializeGroth16Proof: () => serializeGroth16Proof,
  storeCommitments: () => storeCommitments,
  tryDecryptNote: () => tryDecryptNote,
  validateLiquidityAmounts: () => validateLiquidityAmounts,
  validateSwapAmount: () => validateSwapAmount,
  verifyAmmStateHash: () => verifyAmmStateHash,
  verifyCommitment: () => verifyCommitment,
  verifyDleqProof: () => verifyDleqProof
});
module.exports = __toCommonJS(index_exports);
__reExport(index_exports, require("@cloakcraft/types"), module.exports);

// src/client.ts
var import_web314 = require("@solana/web3.js");

// src/wallet.ts
init_babyjubjub();

// src/crypto/nullifier.ts
init_poseidon();
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

// src/crypto/commitment.ts
init_poseidon();
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

// src/crypto/stealth.ts
init_babyjubjub();
init_poseidon();
var SUBGROUP_ORDER4 = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
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

// src/proofs.ts
init_poseidon();

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

// src/client.ts
init_poseidon();

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

// src/light.ts
var import_web33 = require("@solana/web3.js");
var import_stateless = require("@lightprotocol/stateless.js");
init_encryption();
init_poseidon();
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
    const hashBytes = new import_web33.PublicKey(accountHash).toBytes();
    const hashBn = (0, import_stateless.bn)(hashBytes);
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
    const addressBase58 = new import_web33.PublicKey(address).toBase58();
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
      const addressStr = new import_web33.PublicKey(address).toBase58();
      const poolStr = note.pool ? note.pool.toBase58() : "none";
      const nullifierHex = Buffer.from(nullifier).toString("hex").slice(0, 16);
      console.log(`[Scanner] Note ${note.amount}, pool: ${poolStr.slice(0, 8)}..., nullifier: ${nullifierHex}..., addr: ${addressStr.slice(0, 8)}...`);
      nullifierData.push({ note, nullifier, address });
    }
    const addresses = nullifierData.map((d) => new import_web33.PublicKey(d.address).toBase58());
    const spentSet = await this.batchCheckNullifiers(addresses);
    const spentCount = Array.from(spentSet).length;
    console.log(`[Scanner] Checked ${addresses.length} nullifiers, found ${spentCount} spent`);
    return nullifierData.map(({ note, nullifier, address }) => {
      const addressStr = new import_web33.PublicKey(address).toBase58();
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
          pool: new import_web33.PublicKey(parsed.pool),
          accountHash: account.hash,
          // Store for merkle proof fetching
          stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? void 0
          // Store for stealth key derivation
        };
        console.log(`[Scanner] Decrypted note: tokenMint=${new import_web33.PublicKey(note.tokenMint).toBase58().slice(0, 8)}..., amount=${note.amount}, pool=${new import_web33.PublicKey(parsed.pool).toBase58().slice(0, 8)}...`);
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

// src/instructions/index.ts
init_constants();
init_light_helpers();

// src/instructions/shield.ts
var import_web35 = require("@solana/web3.js");
var import_spl_token = require("@solana/spl-token");
var import_anchor = require("@coral-xyz/anchor");
init_constants();
init_light_helpers();
init_encryption();
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
    import_web35.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web35.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    import_web35.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web35.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
  ]);
  return { tx, commitment, randomness };
}

// src/instructions/transact.ts
var import_web36 = require("@solana/web3.js");
var import_spl_token2 = require("@solana/spl-token");
var import_anchor2 = require("@coral-xyz/anchor");
init_constants();
init_light_helpers();
init_encryption();
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
    import_web36.ComputeBudgetProgram.setComputeUnitLimit({ units: 14e5 }),
    import_web36.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
var import_web37 = require("@solana/web3.js");
var import_anchor3 = require("@coral-xyz/anchor");
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
    import_web37.ComputeBudgetProgram.setComputeUnitLimit({ units: 6e5 }),
    import_web37.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
var import_web38 = require("@solana/web3.js");
var import_spl_token3 = require("@solana/spl-token");
init_constants();
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
    systemProgram: import_web38.SystemProgram.programId
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
    systemProgram: import_web38.SystemProgram.programId
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
var import_web310 = require("@solana/web3.js");
init_constants();
init_light_helpers();
init_encryption();
function deriveOrderPda(orderId, programId) {
  return import_web310.PublicKey.findProgramAddressSync(
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
    import_web310.ComputeBudgetProgram.setComputeUnitLimit({ units: 1e6 }),
    import_web310.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    import_web310.ComputeBudgetProgram.setComputeUnitLimit({ units: 8e5 }),
    import_web310.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
var import_web311 = require("@solana/web3.js");
var import_anchor5 = require("@coral-xyz/anchor");
init_constants();
init_light_helpers();
function deriveAggregationPda(id, programId) {
  return import_web311.PublicKey.findProgramAddressSync(
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
    new import_anchor5.BN(params.deadline),
    Array.from(params.actionDomain)
  ).accountsStrict({
    aggregation: aggregationPda,
    tokenPool: tokenPoolPda,
    authority: params.authority,
    payer: params.payer,
    systemProgram: import_web311.PublicKey.default
  }).preInstructions([
    import_web311.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 })
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
    import_web311.ComputeBudgetProgram.setComputeUnitLimit({ units: 8e5 }),
    import_web311.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 5e4 })
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
    import_web311.ComputeBudgetProgram.setComputeUnitLimit({ units: 4e5 })
  ]);
  return tx;
}
async function buildFinalizeDecryptionWithProgram(program, params) {
  const programId = program.programId;
  const [aggregationPda] = deriveAggregationPda(params.aggregationId, programId);
  const totalsArray = params.totals.map((t) => new import_anchor5.BN(t.toString()));
  const tx = await program.methods.finalizeDecryption(totalsArray).accountsStrict({
    aggregation: aggregationPda,
    authority: params.authority
  }).preInstructions([
    import_web311.ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 })
  ]);
  return tx;
}

// src/client.ts
init_versioned_transaction();

// src/address-lookup-table.ts
var import_web313 = require("@solana/web3.js");
async function createAddressLookupTable(connection, authority, recentSlot) {
  const slot = recentSlot ?? await connection.getSlot();
  const [instruction, address] = import_web313.AddressLookupTableProgram.createLookupTable({
    authority,
    payer: authority,
    recentSlot: slot
  });
  console.log(`[ALT] Created lookup table at ${address.toBase58()}`);
  return { address, instruction };
}
function extendAddressLookupTable(address, authority, addresses) {
  console.log(`[ALT] Extending lookup table with ${addresses.length} addresses`);
  return import_web313.AddressLookupTableProgram.extendLookupTable({
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
  const createTx = new import_web313.Transaction().add(createIx);
  const createSig = await (0, import_web313.sendAndConfirmTransaction)(connection, createTx, [authority]);
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
    const extendTx = new import_web313.Transaction().add(extendIx);
    const extendSig = await (0, import_web313.sendAndConfirmTransaction)(connection, extendTx, [authority]);
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
        new import_web313.PublicKey("BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW")
        // State tree 0
      ],
      addressTrees: [
        new import_web313.PublicKey("F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A")
        // Address tree 0
      ],
      nullifierQueues: [
        new import_web313.PublicKey("8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z")
        // Nullifier queue 0
      ],
      // Additional Light Protocol system accounts (from PackedAccounts)
      systemAccounts: [
        new import_web313.PublicKey("94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3"),
        new import_web313.PublicKey("35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh"),
        new import_web313.PublicKey("HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA"),
        new import_web313.PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq"),
        new import_web313.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto")
      ]
    };
  } else {
    return {
      stateTrees: [
        new import_web313.PublicKey("BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW")
        // Placeholder
      ],
      addressTrees: [
        new import_web313.PublicKey("F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A")
        // Placeholder
      ],
      nullifierQueues: [
        new import_web313.PublicKey("8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z")
        // Placeholder
      ],
      systemAccounts: [
        new import_web313.PublicKey("94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3"),
        // Placeholder
        new import_web313.PublicKey("35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh"),
        // Placeholder
        new import_web313.PublicKey("HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA"),
        // Placeholder
        new import_web313.PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq"),
        // Placeholder
        new import_web313.PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto")
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
    this.connection = new import_web314.Connection(config.rpcUrl, config.commitment ?? "confirmed");
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
    const [poolPda] = import_web314.PublicKey.findProgramAddressSync(
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
      tokenMint: new import_web314.PublicKey(data.subarray(8, 40)),
      tokenVault: new import_web314.PublicKey(data.subarray(40, 72)),
      totalShielded: data.readBigUInt64LE(72),
      authority: new import_web314.PublicKey(data.subarray(80, 112)),
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
    const tokenMint = params.inputs[0].tokenMint instanceof Uint8Array ? new import_web314.PublicKey(params.inputs[0].tokenMint) : params.inputs[0].tokenMint;
    const [poolPda] = import_web314.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      this.programId
    );
    const [counterPda] = import_web314.PublicKey.findProgramAddressSync(
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
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array ? new import_web314.PublicKey(params.input.tokenMint) : params.input.tokenMint;
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
    const { buildCreateNullifierWithProgram: buildCreateNullifierWithProgram2, buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
    const tokenAMint = params.inputA.tokenMint instanceof Uint8Array ? new import_web314.PublicKey(params.inputA.tokenMint) : params.inputA.tokenMint;
    const tokenBMint = params.inputB.tokenMint instanceof Uint8Array ? new import_web314.PublicKey(params.inputB.tokenMint) : params.inputB.tokenMint;
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
    const { buildCreateNullifierWithProgram: buildCreateNullifierWithProgram2, buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
    const lpMint = params.lpInput.tokenMint instanceof Uint8Array ? new import_web314.PublicKey(params.lpInput.tokenMint) : params.lpInput.tokenMint;
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
      const { buildRemoveLiquidityInstructionsForVersionedTx: buildRemoveLiquidityInstructionsForVersionedTx3 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
      const { buildVersionedTransaction: buildVersionedTransaction2, estimateTransactionSize: estimateTransactionSize2, executeVersionedTransaction: executeVersionedTransaction2, MAX_TRANSACTION_SIZE: MAX_TRANSACTION_SIZE2 } = await Promise.resolve().then(() => (init_versioned_transaction(), versioned_transaction_exports));
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
    const { buildCreateNullifierWithProgram: buildCreateNullifierWithProgram2, buildCreateCommitmentWithProgram: buildCreateCommitmentWithProgram2, buildClosePendingOperationWithProgram: buildClosePendingOperationWithProgram2 } = await Promise.resolve().then(() => (init_swap(), swap_exports));
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
    const makerPool = new import_web314.PublicKey(orderAccount.makerPool || params.order.escrowCommitment);
    const takerInputMint = params.takerInput.tokenMint instanceof Uint8Array ? new import_web314.PublicKey(params.takerInput.tokenMint) : params.takerInput.tokenMint;
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
    const pool = new import_web314.PublicKey(orderAccount.pool || orderAccount.makerPool);
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
    const tokenMint = params.input.tokenMint instanceof Uint8Array ? new import_web314.PublicKey(params.input.tokenMint) : params.input.tokenMint;
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
      [poolPda] = import_web314.PublicKey.findProgramAddressSync(
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
      [poolPda] = import_web314.PublicKey.findProgramAddressSync(
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
    const tx = new import_web314.Transaction();
    return tx;
  }
  async buildCreateOrderTransaction(_params, _proof) {
    const tx = new import_web314.Transaction();
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

// src/crypto/index.ts
init_poseidon();
init_babyjubjub();
init_encryption();

// src/amm/pool.ts
var import_web315 = require("@solana/web3.js");
var import_sha3 = require("@noble/hashes/sha3");
init_swap();
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
  const poolId = new import_web315.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const tokenAMint = new import_web315.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const tokenBMint = new import_web315.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const lpMint = new import_web315.PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const stateHash = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;
  const view = new DataView(data.buffer, data.byteOffset + offset);
  const reserveA = view.getBigUint64(0, true);
  const reserveB = view.getBigUint64(8, true);
  const lpSupply = view.getBigUint64(16, true);
  const feeBps = view.getUint16(24, true);
  offset += 26;
  const authority = new import_web315.PublicKey(data.slice(offset, offset + 32));
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
  return (0, import_sha3.keccak_256)(fullData);
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

// src/index.ts
init_versioned_transaction();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
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
  verifyDleqProof,
  ...require("@cloakcraft/types")
});
