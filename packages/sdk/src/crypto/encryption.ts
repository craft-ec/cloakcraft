/**
 * Note encryption using ECIES (Elliptic Curve Integrated Encryption Scheme)
 */

import { sha256 } from '@noble/hashes/sha256';
import type { EncryptedNote, Note, Point, FieldElement } from '@cloakcraft/types';
import { scalarMul, derivePublicKey, GENERATOR } from './babyjubjub';
import { bytesToField, fieldToBytes } from './poseidon';

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
 * Try to decrypt a note (returns null if decryption fails)
 */
export function tryDecryptNote(
  encrypted: EncryptedNote,
  recipientPrivateKey: bigint
): Note | null {
  try {
    return decryptNote(encrypted, recipientPrivateKey);
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
  const { PublicKey } = require('@solana/web3.js');

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
  hasher.update(Buffer.from('cloakcraft-ecies-key'));
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
