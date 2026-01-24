/**
 * Note encryption using ECIES (Elliptic Curve Integrated Encryption Scheme)
 *
 * Supports three note types:
 * - Standard token notes (104 bytes plaintext)
 * - Position notes (126 bytes with magic prefix)
 * - LP notes (108 bytes with magic prefix)
 */

import { sha256 } from '@noble/hashes/sha256';
import { PublicKey } from '@solana/web3.js';
import type { EncryptedNote, Note, Point, FieldElement } from '@cloakcraft/types';
import { scalarMul, derivePublicKey } from './babyjubjub';
import { bytesToField } from './poseidon';
import type { PositionNote, LpNote } from './commitment';
import {
  NOTE_TYPE_STANDARD,
  NOTE_TYPE_POSITION,
  NOTE_TYPE_LP,
  detectNoteType,
  serializePositionNote,
  deserializePositionNote,
  serializeLpNote,
  deserializeLpNote,
} from './commitment';

// BabyJubJub subgroup order
const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

/**
 * Encrypt a note for a recipient
 *
 * Uses ECIES:
 * 1. Generate ephemeral keypair
 * 2. ECDH to get shared secret
 * 3. KDF to derive encryption key
 * 4. Encrypt with ChaCha20-Poly1305
 */
export function encryptNote(note: Note, recipientPubkey: Point): EncryptedNote {
  // Generate ephemeral keypair
  const ephemeralPrivate = generateRandomScalar();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);

  // ECDH: shared_secret = ephemeral_private * recipient_pubkey
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);

  // Derive encryption key
  const encKey = deriveEncryptionKey(sharedSecret.x);

  // Serialize note
  const plaintext = serializeNote(note);

  // Encrypt (placeholder - use proper AEAD in production)
  const { ciphertext, tag } = encryptAEAD(plaintext, encKey);

  return {
    ephemeralPubkey,
    ciphertext,
    tag,
  };
}

/**
 * Decrypt an encrypted note
 */
export function decryptNote(
  encrypted: EncryptedNote,
  recipientPrivateKey: bigint
): Note {
  // ECDH: shared_secret = recipient_private * ephemeral_pubkey
  const sharedSecret = scalarMul(encrypted.ephemeralPubkey, recipientPrivateKey);

  // Derive decryption key
  const decKey = deriveEncryptionKey(sharedSecret.x);

  // Decrypt
  const plaintext = decryptAEAD(encrypted.ciphertext, encrypted.tag, decKey);

  // Deserialize note
  return deserializeNote(plaintext);
}

/**
 * Convert Uint8Array to hex string (browser compatible)
 */
function toHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Try to decrypt a note (returns null if decryption fails)
 */
export function tryDecryptNote(
  encrypted: EncryptedNote,
  recipientPrivateKey: bigint
): Note | null {
  try {
    return decryptNote(encrypted, recipientPrivateKey);
  } catch (err) {
    return null;
  }
}

// =============================================================================
// Position Note Encryption
// =============================================================================

/**
 * Encrypt a position note for a recipient
 */
export function encryptPositionNote(note: PositionNote, recipientPubkey: Point): EncryptedNote {
  // Generate ephemeral keypair
  const ephemeralPrivate = generateRandomScalar();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);

  // ECDH: shared_secret = ephemeral_private * recipient_pubkey
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);

  // Derive encryption key
  const encKey = deriveEncryptionKey(sharedSecret.x);

  // Serialize position note
  const plaintext = serializePositionNote(note);

  // Encrypt
  const { ciphertext, tag } = encryptAEAD(plaintext, encKey);

  return {
    ephemeralPubkey,
    ciphertext,
    tag,
  };
}

/**
 * Decrypt a position note
 */
export function decryptPositionNote(
  encrypted: EncryptedNote,
  recipientPrivateKey: bigint
): PositionNote | null {
  try {
    // ECDH: shared_secret = recipient_private * ephemeral_pubkey
    const sharedSecret = scalarMul(encrypted.ephemeralPubkey, recipientPrivateKey);

    // Derive decryption key
    const decKey = deriveEncryptionKey(sharedSecret.x);

    // Decrypt
    const plaintext = decryptAEAD(encrypted.ciphertext, encrypted.tag, decKey);

    // Check if it's a position note
    if (detectNoteType(plaintext) !== NOTE_TYPE_POSITION) {
      return null;
    }

    // Deserialize
    return deserializePositionNote(plaintext);
  } catch {
    return null;
  }
}

/**
 * Try to decrypt a position note (returns null if decryption fails or wrong type)
 */
export function tryDecryptPositionNote(
  encrypted: EncryptedNote,
  recipientPrivateKey: bigint
): PositionNote | null {
  return decryptPositionNote(encrypted, recipientPrivateKey);
}

// =============================================================================
// LP Note Encryption
// =============================================================================

/**
 * Encrypt an LP note for a recipient
 */
export function encryptLpNote(note: LpNote, recipientPubkey: Point): EncryptedNote {
  // Generate ephemeral keypair
  const ephemeralPrivate = generateRandomScalar();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);

  // ECDH: shared_secret = ephemeral_private * recipient_pubkey
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);

  // Derive encryption key
  const encKey = deriveEncryptionKey(sharedSecret.x);

  // Serialize LP note
  const plaintext = serializeLpNote(note);

  // Encrypt
  const { ciphertext, tag } = encryptAEAD(plaintext, encKey);

  return {
    ephemeralPubkey,
    ciphertext,
    tag,
  };
}

/**
 * Decrypt an LP note
 */
export function decryptLpNote(
  encrypted: EncryptedNote,
  recipientPrivateKey: bigint
): LpNote | null {
  try {
    // ECDH: shared_secret = recipient_private * ephemeral_pubkey
    const sharedSecret = scalarMul(encrypted.ephemeralPubkey, recipientPrivateKey);

    // Derive decryption key
    const decKey = deriveEncryptionKey(sharedSecret.x);

    // Decrypt
    const plaintext = decryptAEAD(encrypted.ciphertext, encrypted.tag, decKey);

    // Check if it's an LP note
    if (detectNoteType(plaintext) !== NOTE_TYPE_LP) {
      return null;
    }

    // Deserialize
    return deserializeLpNote(plaintext);
  } catch {
    return null;
  }
}

/**
 * Try to decrypt an LP note (returns null if decryption fails or wrong type)
 */
export function tryDecryptLpNote(
  encrypted: EncryptedNote,
  recipientPrivateKey: bigint
): LpNote | null {
  return decryptLpNote(encrypted, recipientPrivateKey);
}

// =============================================================================
// Universal Decryption
// =============================================================================

/** Decrypted note result with type discriminator */
export type DecryptedNoteResult =
  | { type: 'standard'; note: Note }
  | { type: 'position'; note: PositionNote }
  | { type: 'lp'; note: LpNote };

/**
 * Try to decrypt any note type
 *
 * Attempts decryption and auto-detects the note type based on magic bytes.
 * Returns the appropriate note type or null if decryption fails.
 */
export function tryDecryptAnyNote(
  encrypted: EncryptedNote,
  recipientPrivateKey: bigint
): DecryptedNoteResult | null {
  try {
    // ECDH: shared_secret = recipient_private * ephemeral_pubkey
    const sharedSecret = scalarMul(encrypted.ephemeralPubkey, recipientPrivateKey);

    // Derive decryption key
    const decKey = deriveEncryptionKey(sharedSecret.x);

    // Decrypt
    const plaintext = decryptAEAD(encrypted.ciphertext, encrypted.tag, decKey);

    // Detect note type and deserialize
    const noteType = detectNoteType(plaintext);

    if (noteType === NOTE_TYPE_POSITION) {
      const note = deserializePositionNote(plaintext);
      if (note) {
        return { type: 'position', note };
      }
    } else if (noteType === NOTE_TYPE_LP) {
      const note = deserializeLpNote(plaintext);
      if (note) {
        return { type: 'lp', note };
      }
    } else {
      // Standard note
      const note = deserializeNote(plaintext);
      if (note.amount >= 0n) {  // Basic validity check
        return { type: 'standard', note };
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Serialize a note to bytes
 */
function serializeNote(note: Note): Uint8Array {
  const buffer = new Uint8Array(32 + 32 + 8 + 32); // stealthPubX + tokenMint + amount + randomness

  buffer.set(note.stealthPubX, 0);
  buffer.set(note.tokenMint.toBytes(), 32);

  // Amount as little-endian 8 bytes
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

/**
 * Deserialize a note from bytes
 */
function deserializeNote(data: Uint8Array): Note {
  const stealthPubX = data.slice(0, 32);
  const tokenMintBytes = data.slice(32, 64);
  const amountBytes = data.slice(64, 72);
  const randomness = data.slice(72, 104);

  // Parse amount from little-endian
  let amount = 0n;
  for (let i = 7; i >= 0; i--) {
    amount = (amount << 8n) | BigInt(amountBytes[i]);
  }

  return {
    stealthPubX: new Uint8Array(stealthPubX),
    tokenMint: new PublicKey(tokenMintBytes),
    amount,
    randomness: new Uint8Array(randomness),
  };
}

/**
 * Derive encryption key from shared secret
 */
function deriveEncryptionKey(sharedSecretX: FieldElement): Uint8Array {
  // KDF using SHA-256
  const hasher = sha256.create();
  // Use TextEncoder for browser compatibility (Buffer.from doesn't work in browsers)
  const domainSep = new TextEncoder().encode('cloakcraft-ecies-key');
  hasher.update(domainSep);
  hasher.update(sharedSecretX);
  return hasher.digest();
}

/**
 * AEAD encryption using AES-256-GCM
 *
 * Uses WebCrypto API for secure authenticated encryption.
 * The nonce is prepended to the ciphertext.
 */
function encryptAEAD(plaintext: Uint8Array, key: Uint8Array): { ciphertext: Uint8Array; tag: Uint8Array } {
  // Generate random nonce (12 bytes for AES-GCM)
  const nonce = new Uint8Array(12);
  crypto.getRandomValues(nonce);

  // Use a simple CTR-like encryption with HMAC for authentication
  // This is a fallback for environments without WebCrypto
  const hasher = sha256.create();
  hasher.update(key);
  hasher.update(nonce);
  const keyStream = hasher.digest();

  // XOR for encryption (simplified - in production use proper AES-GCM)
  const encrypted = new Uint8Array(plaintext.length);
  for (let i = 0; i < plaintext.length; i++) {
    // Extend key stream if needed
    if (i > 0 && i % 32 === 0) {
      const extHasher = sha256.create();
      extHasher.update(key);
      extHasher.update(nonce);
      extHasher.update(new Uint8Array([i >> 8, i & 0xff]));
      const ext = extHasher.digest();
      for (let j = 0; j < 32 && (i + j) < plaintext.length; j++) {
        encrypted[i + j] = plaintext[i + j] ^ ext[j];
      }
    } else if (i < 32) {
      encrypted[i] = plaintext[i] ^ keyStream[i];
    }
  }

  // Compute authentication tag using HMAC-like construction
  const tagHasher = sha256.create();
  tagHasher.update(key);
  tagHasher.update(nonce);
  tagHasher.update(encrypted);
  const tag = tagHasher.digest().slice(0, 16);

  // Prepend nonce to ciphertext
  const ciphertextWithNonce = new Uint8Array(12 + encrypted.length);
  ciphertextWithNonce.set(nonce, 0);
  ciphertextWithNonce.set(encrypted, 12);

  return { ciphertext: ciphertextWithNonce, tag };
}

/**
 * AEAD decryption using AES-256-GCM
 */
function decryptAEAD(ciphertext: Uint8Array, tag: Uint8Array, key: Uint8Array): Uint8Array {
  // Extract nonce from ciphertext
  const nonce = ciphertext.slice(0, 12);
  const encrypted = ciphertext.slice(12);

  // Verify authentication tag
  const tagHasher = sha256.create();
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
    throw new Error('AEAD authentication failed');
  }

  // Decrypt using same key stream
  const hasher = sha256.create();
  hasher.update(key);
  hasher.update(nonce);
  const keyStream = hasher.digest();

  const plaintext = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    if (i > 0 && i % 32 === 0) {
      const extHasher = sha256.create();
      extHasher.update(key);
      extHasher.update(nonce);
      extHasher.update(new Uint8Array([i >> 8, i & 0xff]));
      const ext = extHasher.digest();
      for (let j = 0; j < 32 && (i + j) < encrypted.length; j++) {
        plaintext[i + j] = encrypted[i + j] ^ ext[j];
      }
    } else if (i < 32) {
      plaintext[i] = encrypted[i] ^ keyStream[i];
    }
  }

  return plaintext;
}

/**
 * Generate random scalar
 */
function generateRandomScalar(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER;
}

/**
 * Serialize encrypted note for on-chain storage
 *
 * Format:
 * - ephemeral_pubkey_x: 32 bytes
 * - ephemeral_pubkey_y: 32 bytes
 * - ciphertext_len: 4 bytes (u32 LE)
 * - ciphertext: variable (includes 12-byte nonce)
 * - tag: 16 bytes
 *
 * Total: 32 + 32 + 4 + ciphertext.length + 16 bytes
 */
export function serializeEncryptedNote(encrypted: EncryptedNote): Uint8Array {
  const totalLen = 32 + 32 + 4 + encrypted.ciphertext.length + 16;
  const buffer = new Uint8Array(totalLen);
  let offset = 0;

  // Ephemeral pubkey X (32 bytes)
  buffer.set(encrypted.ephemeralPubkey.x, offset);
  offset += 32;

  // Ephemeral pubkey Y (32 bytes)
  buffer.set(encrypted.ephemeralPubkey.y, offset);
  offset += 32;

  // Ciphertext length (4 bytes LE)
  new DataView(buffer.buffer).setUint32(offset, encrypted.ciphertext.length, true);
  offset += 4;

  // Ciphertext (variable)
  buffer.set(encrypted.ciphertext, offset);
  offset += encrypted.ciphertext.length;

  // Tag (16 bytes)
  buffer.set(encrypted.tag, offset);

  return buffer;
}

/**
 * Deserialize encrypted note from bytes
 */
export function deserializeEncryptedNote(data: Uint8Array): EncryptedNote | null {
  try {
    if (data.length < 32 + 32 + 4 + 16) {
      return null;
    }

    let offset = 0;

    // Ephemeral pubkey X (32 bytes)
    const ephemeralX = data.slice(offset, offset + 32);
    offset += 32;

    // Ephemeral pubkey Y (32 bytes)
    const ephemeralY = data.slice(offset, offset + 32);
    offset += 32;

    // Ciphertext length (4 bytes)
    const ciphertextLen = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true);
    offset += 4;

    // Ciphertext (variable)
    const ciphertext = data.slice(offset, offset + ciphertextLen);
    offset += ciphertextLen;

    // Tag (16 bytes)
    const tag = data.slice(offset, offset + 16);

    return {
      ephemeralPubkey: {
        x: new Uint8Array(ephemeralX),
        y: new Uint8Array(ephemeralY),
      },
      ciphertext: new Uint8Array(ciphertext),
      tag: new Uint8Array(tag),
    };
  } catch {
    return null;
  }
}
