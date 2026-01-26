/**
 * Voting Recovery Module
 *
 * Handles recovery of vote preimages for claim operations.
 * Similar to notes.ts but for voting-specific data.
 */

import { PublicKey } from '@solana/web3.js';

import {
  VotePreimage,
  DecryptedVotePreimage,
  Position,
  VoteBindingMode,
  RevealMode,
  Ballot,
} from './types';

// ============ Types ============

export interface VoteRecoveryConfig {
  indexerUrl: string;
  programId?: PublicKey;
}

export interface RecoveredClaim {
  ballotId: Uint8Array;
  positionCommitment: Uint8Array;
  voteChoice: number;
  amount: bigint;
  weight: bigint;
  randomness: Uint8Array;
}

export interface RecoveredVote {
  ballotId: Uint8Array;
  voteCommitment: Uint8Array;
  voteChoice: number;
  weight: bigint;
  randomness: Uint8Array;
}

interface PreimageEntry {
  ballotId: string;
  pubkey: string;
  commitment: string;
  encryptedPreimage: string;
  encryptionType: number;
  bindingMode: number;
  createdSlot: number;
  isNullified: boolean;
}

// ============ Recovery Manager ============

/**
 * Manager for recovering vote preimages
 */
export class VoteRecoveryManager {
  private indexerUrl: string;
  private programId: PublicKey;
  private cachedPreimages: Map<string, VotePreimage> = new Map();

  constructor(config: VoteRecoveryConfig) {
    this.indexerUrl = config.indexerUrl;
    this.programId = config.programId || new PublicKey('CLoak1111111111111111111111111111111111111');
  }

  /**
   * Scan for user's vote preimages
   */
  async scanPreimages(
    pubkey: PublicKey,
    options: {
      ballotId?: Uint8Array;
      includeNullified?: boolean;
    } = {}
  ): Promise<VotePreimage[]> {
    const queryParams = new URLSearchParams();
    if (options.ballotId) {
      queryParams.set('ballotId', Buffer.from(options.ballotId).toString('hex'));
    }
    if (options.includeNullified) {
      queryParams.set('includeNullified', 'true');
    }

    const response = await fetch(
      `${this.indexerUrl}/api/voting/preimages/${pubkey.toBase58()}?${queryParams}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch preimages');
    }

    const data = (await response.json()) as { preimages: PreimageEntry[] };
    const preimages: VotePreimage[] = [];

    for (const entry of data.preimages) {
      const preimage: VotePreimage = {
        ballotId: hexToBytes(entry.ballotId),
        commitment: hexToBytes(entry.commitment),
        encryptedData: hexToBytes(entry.encryptedPreimage),
        encryptionType: entry.encryptionType,
        bindingMode: entry.bindingMode as VoteBindingMode,
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
  decryptWithUserKey(
    preimage: VotePreimage,
    secretKey: Uint8Array
  ): DecryptedVotePreimage | null {
    if (preimage.encryptionType !== 0) {
      throw new Error('Preimage is not encrypted with user key');
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
  decryptWithTimelockKey(
    preimage: VotePreimage,
    timelockDecryptionKey: Uint8Array
  ): DecryptedVotePreimage | null {
    if (preimage.encryptionType !== 1) {
      throw new Error('Preimage is not encrypted with timelock key');
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
  async recoverClaimData(
    secretKey: Uint8Array,
    ballotId: Uint8Array,
    ballot: Ballot
  ): Promise<RecoveredClaim[]> {
    if (ballot.bindingMode !== VoteBindingMode.SpendToVote) {
      throw new Error('Claim recovery only available for SpendToVote mode');
    }

    // Get user's public key from secret key
    const pubkey = derivePublicKeyFromSecret(secretKey);

    // Scan for preimages
    const preimages = await this.scanPreimages(new PublicKey(pubkey), {
      ballotId,
      includeNullified: false,
    });

    const claims: RecoveredClaim[] = [];

    for (const preimage of preimages) {
      if (preimage.bindingMode !== VoteBindingMode.SpendToVote) {
        continue;
      }

      let decrypted: DecryptedVotePreimage | null = null;

      // Decrypt based on encryption type
      if (preimage.encryptionType === 0) {
        // User key encryption (PermanentPrivate)
        decrypted = this.decryptWithUserKey(preimage, secretKey);
      } else if (preimage.encryptionType === 1 && ballot.revealMode === RevealMode.TimeLocked) {
        // Timelock encryption - need to fetch decryption key
        // In production, would fetch from timelock service after unlock_slot
        // For now, skip timelock-encrypted preimages unless key is provided
        continue;
      }

      if (decrypted && decrypted.amount !== undefined) {
        claims.push({
          ballotId: decrypted.ballotId,
          positionCommitment: preimage.commitment,
          voteChoice: decrypted.voteChoice,
          amount: decrypted.amount,
          weight: decrypted.weight,
          randomness: decrypted.randomness,
        });
      }
    }

    return claims;
  }

  /**
   * Recover vote data for Snapshot mode (for change vote)
   */
  async recoverVoteData(
    secretKey: Uint8Array,
    ballotId: Uint8Array,
    ballot: Ballot
  ): Promise<RecoveredVote[]> {
    if (ballot.bindingMode !== VoteBindingMode.Snapshot) {
      throw new Error('Vote recovery only available for Snapshot mode');
    }

    const pubkey = derivePublicKeyFromSecret(secretKey);
    const preimages = await this.scanPreimages(new PublicKey(pubkey), {
      ballotId,
      includeNullified: false,
    });

    const votes: RecoveredVote[] = [];

    for (const preimage of preimages) {
      if (preimage.bindingMode !== VoteBindingMode.Snapshot) {
        continue;
      }

      let decrypted: DecryptedVotePreimage | null = null;

      if (preimage.encryptionType === 0) {
        decrypted = this.decryptWithUserKey(preimage, secretKey);
      }

      if (decrypted) {
        votes.push({
          ballotId: decrypted.ballotId,
          voteCommitment: preimage.commitment,
          voteChoice: decrypted.voteChoice,
          weight: decrypted.weight,
          randomness: decrypted.randomness,
        });
      }
    }

    return votes;
  }

  /**
   * Get active positions for a user on a ballot
   */
  async getActivePositions(
    secretKey: Uint8Array,
    ballotId: Uint8Array,
    ballot: Ballot
  ): Promise<Position[]> {
    const pubkey = derivePublicKeyFromSecret(secretKey);
    const preimages = await this.scanPreimages(new PublicKey(pubkey), {
      ballotId,
      includeNullified: false,
    });

    const positions: Position[] = [];

    for (const preimage of preimages) {
      let decrypted: DecryptedVotePreimage | null = null;

      if (preimage.encryptionType === 0) {
        decrypted = this.decryptWithUserKey(preimage, secretKey);
      }

      if (decrypted) {
        positions.push({
          ballotId: decrypted.ballotId,
          commitment: preimage.commitment,
          pubkey: new PublicKey(pubkey),
          voteChoice: decrypted.voteChoice,
          amount: decrypted.amount || 0n,
          weight: decrypted.weight,
          randomness: decrypted.randomness,
          isNullified: false,
        });
      }
    }

    return positions;
  }

  /**
   * Clear cached preimages
   */
  clearCache(): void {
    this.cachedPreimages.clear();
  }
}

// ============ Encryption Helpers ============

/**
 * Decrypt preimage data using a key
 * Uses ChaCha20-Poly1305 AEAD encryption
 */
function decryptPreimageWithKey(
  encryptedData: Uint8Array,
  key: Uint8Array
): Uint8Array {
  // Expected format: nonce (12 bytes) + ciphertext + tag (16 bytes)
  if (encryptedData.length < 28) {
    throw new Error('Invalid encrypted data length');
  }

  const nonce = encryptedData.slice(0, 12);
  const ciphertext = encryptedData.slice(12, encryptedData.length - 16);
  const tag = encryptedData.slice(encryptedData.length - 16);

  // Use Web Crypto API for decryption
  // In production, would use a proper ChaCha20-Poly1305 implementation
  // For now, use a placeholder that matches the encryption scheme
  return decryptChaCha20Poly1305(ciphertext, key, nonce, tag);
}

/**
 * ChaCha20-Poly1305 decryption
 * Uses @noble/ciphers for proper AEAD decryption
 */
function decryptChaCha20Poly1305(
  ciphertext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array,
  tag: Uint8Array
): Uint8Array {
  // Import @noble/ciphers for ChaCha20-Poly1305
  // Using dynamic import to avoid bundling issues
  const { chacha20poly1305 } = require('@noble/ciphers/chacha.js');

  // Validate key length (must be 32 bytes for ChaCha20)
  if (key.length !== 32) {
    throw new Error(`Invalid key length: expected 32, got ${key.length}`);
  }

  // Validate nonce length (must be 12 bytes for ChaCha20-Poly1305)
  if (nonce.length !== 12) {
    throw new Error(`Invalid nonce length: expected 12, got ${nonce.length}`);
  }

  // Create cipher instance
  const cipher = chacha20poly1305(key, nonce);

  // Concatenate ciphertext and tag for decryption
  // ChaCha20-Poly1305 expects: ciphertext || tag
  const sealed = new Uint8Array(ciphertext.length + tag.length);
  sealed.set(ciphertext, 0);
  sealed.set(tag, ciphertext.length);

  // Decrypt and verify authentication tag
  try {
    return cipher.decrypt(sealed);
  } catch (e) {
    throw new Error('Decryption failed: authentication tag mismatch or corrupted data');
  }
}

/**
 * Parse decrypted preimage bytes into structured data
 */
function parseDecryptedPreimage(
  data: Uint8Array,
  bindingMode: VoteBindingMode
): DecryptedVotePreimage {
  // Format varies by binding mode:
  // Snapshot: vote_choice (1) + weight (8) + randomness (32) + ballot_id (32) = 73 bytes
  // SpendToVote: vote_choice (1) + weight (8) + amount (8) + randomness (32) + ballot_id (32) = 81 bytes

  const expectedLength = bindingMode === VoteBindingMode.Snapshot ? 73 : 81;
  if (data.length !== expectedLength) {
    throw new Error(`Invalid preimage length: expected ${expectedLength}, got ${data.length}`);
  }

  let offset = 0;

  const voteChoice = data[offset];
  offset += 1;

  const weightBytes = data.slice(offset, offset + 8);
  const weight = bytesToBigInt(weightBytes);
  offset += 8;

  let amount: bigint | undefined;
  if (bindingMode === VoteBindingMode.SpendToVote) {
    const amountBytes = data.slice(offset, offset + 8);
    amount = bytesToBigInt(amountBytes);
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
    amount,
  };
}

/**
 * Encrypt preimage data for storage
 */
export function encryptPreimage(
  preimage: DecryptedVotePreimage,
  encryptionKey: Uint8Array,
  isTimelockKey: boolean
): Uint8Array {
  // Serialize preimage
  const serialized = serializePreimage(preimage);

  // Generate random nonce
  const nonce = crypto.getRandomValues(new Uint8Array(12));

  // Encrypt with ChaCha20-Poly1305
  const { ciphertext, tag } = encryptChaCha20Poly1305(serialized, encryptionKey, nonce);

  // Return nonce + ciphertext + tag
  const result = new Uint8Array(12 + ciphertext.length + 16);
  result.set(nonce, 0);
  result.set(ciphertext, 12);
  result.set(tag, 12 + ciphertext.length);

  return result;
}

/**
 * Serialize preimage to bytes
 */
function serializePreimage(preimage: DecryptedVotePreimage): Uint8Array {
  const hasAmount = preimage.amount !== undefined;
  const length = hasAmount ? 81 : 73;
  const result = new Uint8Array(length);

  let offset = 0;

  result[offset] = preimage.voteChoice;
  offset += 1;

  result.set(bigIntToBytes(preimage.weight), offset);
  offset += 8;

  if (hasAmount) {
    result.set(bigIntToBytes(preimage.amount!), offset);
    offset += 8;
  }

  result.set(preimage.randomness, offset);
  offset += 32;

  result.set(preimage.ballotId, offset);

  return result;
}

/**
 * ChaCha20-Poly1305 encryption
 * Uses @noble/ciphers for proper AEAD encryption
 */
function encryptChaCha20Poly1305(
  plaintext: Uint8Array,
  key: Uint8Array,
  nonce: Uint8Array
): { ciphertext: Uint8Array; tag: Uint8Array } {
  // Import @noble/ciphers for ChaCha20-Poly1305
  const { chacha20poly1305 } = require('@noble/ciphers/chacha.js');

  // Validate key length (must be 32 bytes for ChaCha20)
  if (key.length !== 32) {
    throw new Error(`Invalid key length: expected 32, got ${key.length}`);
  }

  // Validate nonce length (must be 12 bytes for ChaCha20-Poly1305)
  if (nonce.length !== 12) {
    throw new Error(`Invalid nonce length: expected 12, got ${nonce.length}`);
  }

  // Create cipher instance
  const cipher = chacha20poly1305(key, nonce);

  // Encrypt - returns ciphertext || tag (tag is 16 bytes)
  const sealed = cipher.encrypt(plaintext);

  // Split into ciphertext and tag
  const ciphertext = sealed.slice(0, sealed.length - 16);
  const tag = sealed.slice(sealed.length - 16);

  return { ciphertext, tag };
}

// ============ Utility Functions ============

function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith('0x')) {
    hex = hex.slice(2);
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = result | (BigInt(bytes[i]) << BigInt(i * 8));
  }
  return result;
}

function bigIntToBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    bytes[i] = Number((value >> BigInt(i * 8)) & 0xffn);
  }
  return bytes;
}

function derivePublicKeyFromSecret(secretKey: Uint8Array): Uint8Array {
  // Derive public key from secret key using BabyJubJub curve
  // This is the same curve used for stealth addresses in the protocol

  // Import the BabyJubJub derivePublicKey function
  const { derivePublicKey } = require('../crypto/babyjubjub');
  const { bytesToField, fieldToBytes } = require('../crypto/poseidon');

  // Convert secret key bytes to field element (bigint)
  const secretKeyBigInt = bytesToField(secretKey);

  // Derive public key point on BabyJubJub curve
  const pubkeyPoint = derivePublicKey(secretKeyBigInt);

  // Return the x-coordinate as bytes (standard representation)
  return fieldToBytes(pubkeyPoint.x);
}
