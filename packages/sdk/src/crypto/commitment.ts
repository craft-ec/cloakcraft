/**
 * Note commitment utilities
 *
 * Supports three note types:
 * - Standard token notes (type 0): Poseidon(DOMAIN_COMMITMENT, stealthPubX, tokenMint, amount, randomness)
 * - Position notes (type 1): Two-stage hash for perps positions
 * - LP notes (type 2): Domain hash for perps LP tokens
 */

import type { FieldElement, Commitment, Note } from '@cloakcraft/types';
import { PublicKey } from '@solana/web3.js';
import { poseidonHash, poseidonHashDomain, DOMAIN_COMMITMENT, bytesToField, fieldToBytes } from './poseidon';

// =============================================================================
// Note Types
// =============================================================================

/** Note type discriminators (first byte of serialized note) */
export const NOTE_TYPE_STANDARD = 0;  // First byte < 0x31 (valid field element)
export const NOTE_TYPE_POSITION = 0x80;  // 0x80 - position note
export const NOTE_TYPE_LP = 0x81;  // 0x81 - LP note

/**
 * Position note for perps positions
 *
 * Commitment formula (two-stage):
 * stage1 = Poseidon(POSITION_DOMAIN, stealthPubX, marketId, isLong, margin)
 * commitment = Poseidon(stage1, size, leverage, entryPrice, randomness)
 *
 * Serialized format (123 bytes):
 * - type (1) + stealthPubX (32) + marketId (32) + isLong (1) + margin (8)
 * - + size (8) + leverage (1) + entryPrice (8) + randomness (32)
 * Encrypted: 123 + 80 (ECIES overhead) = 203 bytes (fits in 250-byte limit)
 */
export interface PositionNote {
  noteType: typeof NOTE_TYPE_POSITION;
  stealthPubX: Uint8Array;
  marketId: Uint8Array;  // Full 32-byte marketId
  isLong: boolean;
  margin: bigint;
  size: bigint;
  leverage: number;
  entryPrice: bigint;
  randomness: Uint8Array;  // Full 32 bytes
}

/**
 * LP note for perps liquidity
 *
 * Commitment formula:
 * commitment = Poseidon(LP_DOMAIN, stealthPubX, poolId, lpAmount, randomness)
 *
 * Serialized format (105 bytes):
 * - type (1) + stealthPubX (32) + poolId (32) + lpAmount (8) + randomness (32)
 * Encrypted: 105 + 80 (ECIES overhead) = 185 bytes (fits in 250-byte limit)
 */
export interface LpNote {
  noteType: typeof NOTE_TYPE_LP;
  stealthPubX: Uint8Array;
  poolId: Uint8Array;  // 32 bytes (perps pool id from account)
  lpAmount: bigint;
  randomness: Uint8Array;  // Full 32 bytes
}

/** Domain separators for perps commitments (must match circuits) */
export const POSITION_COMMITMENT_DOMAIN = 8n;
export const LP_COMMITMENT_DOMAIN = 9n;

/**
 * Compute note commitment
 *
 * commitment = poseidon(DOMAIN_COMMITMENT, stealth_pub_x, token_mint, amount, randomness)
 */
export function computeCommitment(note: Note): Commitment {
  const stealthPubX = note.stealthPubX;
  // Handle both Uint8Array (from scanner) and PublicKey (from creation)
  const tokenMintBytes = note.tokenMint instanceof Uint8Array
    ? note.tokenMint
    : note.tokenMint.toBytes();
  const amountBytes = fieldToBytes(note.amount);
  const randomness = note.randomness;

  // Debug logging
  if (typeof process !== 'undefined' && process.env.DEBUG_COMMITMENT) {
    console.log('[computeCommitment] Inputs:');
    console.log('  stealthPubX:', Buffer.from(stealthPubX).toString('hex').slice(0, 32));
    console.log('  tokenMint:', Buffer.from(tokenMintBytes).toString('hex').slice(0, 32));
    console.log('  amount (bigint):', note.amount.toString());
    console.log('  amount (bytes):', Buffer.from(amountBytes).toString('hex').slice(0, 32));
    console.log('  randomness:', Buffer.from(randomness).toString('hex').slice(0, 32));
  }

  return poseidonHashDomain(
    DOMAIN_COMMITMENT,
    stealthPubX,
    tokenMintBytes,
    amountBytes,
    randomness
  );
}

/**
 * Verify a commitment matches the note
 */
export function verifyCommitment(commitment: Commitment, note: Note): boolean {
  const computed = computeCommitment(note);
  return bytesToField(computed) === bytesToField(commitment);
}

/**
 * Generate random commitment randomness
 */
export function generateRandomness(): FieldElement {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Ensure it's in the field
  const value = bytesToField(bytes);
  return fieldToBytes(value);
}

/**
 * Create a new note
 */
export function createNote(
  stealthPubX: FieldElement,
  tokenMint: PublicKey,
  amount: bigint,
  randomness?: FieldElement
): Note {
  return {
    stealthPubX,
    tokenMint,
    amount,
    randomness: randomness ?? generateRandomness(),
  };
}

// =============================================================================
// Position Commitment
// =============================================================================

/**
 * Compute position commitment (two-stage hash)
 *
 * Stage 1: Poseidon(POSITION_DOMAIN, stealthPubX, marketId, isLong, margin)
 * Stage 2: Poseidon(stage1, size, leverage, entryPrice, randomness)
 */
export function computePositionCommitment(note: PositionNote): Commitment {
  // Stage 1: domain hash with position metadata
  const stage1 = poseidonHashDomain(
    POSITION_COMMITMENT_DOMAIN,
    note.stealthPubX,
    note.marketId,
    fieldToBytes(BigInt(note.isLong ? 1 : 0)),
    fieldToBytes(note.margin)
  );

  // Stage 2: final commitment with trading params
  const commitment = poseidonHash([
    stage1,
    fieldToBytes(note.size),
    fieldToBytes(BigInt(note.leverage)),
    fieldToBytes(note.entryPrice),
    note.randomness,
  ]);

  return commitment;
}

/**
 * Verify a position commitment matches the note
 */
export function verifyPositionCommitment(commitment: Commitment, note: PositionNote): boolean {
  const computed = computePositionCommitment(note);
  return bytesToField(computed) === bytesToField(commitment);
}

/**
 * Create a position note
 *
 * @param stealthPubX - Stealth public key X coordinate
 * @param marketId - Full 32-byte market ID
 * @param isLong - True for long, false for short
 * @param margin - Margin amount
 * @param size - Position size
 * @param leverage - Leverage (0-255)
 * @param entryPrice - Entry price
 * @param randomness - Optional randomness (will generate if not provided)
 */
export function createPositionNote(
  stealthPubX: FieldElement,
  marketId: Uint8Array,
  isLong: boolean,
  margin: bigint,
  size: bigint,
  leverage: number,
  entryPrice: bigint,
  randomness?: FieldElement
): PositionNote {
  return {
    noteType: NOTE_TYPE_POSITION,
    stealthPubX,
    marketId,
    isLong,
    margin,
    size,
    leverage,
    entryPrice,
    randomness: randomness ?? generateRandomness(),
  };
}

// =============================================================================
// LP Commitment
// =============================================================================

/**
 * Compute LP commitment
 *
 * Poseidon(LP_DOMAIN, stealthPubX, poolId, lpAmount, randomness)
 *
 * Note: Accepts any object with the required fields (doesn't require noteType)
 */
export function computeLpCommitment(note: Pick<LpNote, 'stealthPubX' | 'poolId' | 'lpAmount' | 'randomness'>): Commitment {
  return poseidonHashDomain(
    LP_COMMITMENT_DOMAIN,
    note.stealthPubX,
    note.poolId,
    fieldToBytes(note.lpAmount),
    note.randomness
  );
}

/**
 * Verify an LP commitment matches the note
 */
export function verifyLpCommitment(commitment: Commitment, note: LpNote): boolean {
  const computed = computeLpCommitment(note);
  return bytesToField(computed) === bytesToField(commitment);
}

/**
 * Create an LP note
 *
 * @param stealthPubX - Stealth public key X coordinate
 * @param poolId - Perps pool ID (32 bytes)
 * @param lpAmount - LP token amount
 * @param randomness - Optional randomness (will generate if not provided)
 */
export function createLpNote(
  stealthPubX: FieldElement,
  poolId: Uint8Array,
  lpAmount: bigint,
  randomness?: FieldElement
): LpNote {
  return {
    noteType: NOTE_TYPE_LP,
    stealthPubX,
    poolId,
    lpAmount,
    randomness: randomness ?? generateRandomness(),
  };
}

// =============================================================================
// Serialization
// =============================================================================

/**
 * Serialize position note to bytes
 *
 * Format (123 bytes total - encrypted ~203 bytes, fits in 250-byte limit):
 * - type (1 byte): 0x80
 * - stealthPubX (32 bytes)
 * - marketId (32 bytes)
 * - isLong (1 byte)
 * - margin (8 bytes LE)
 * - size (8 bytes LE)
 * - leverage (1 byte)
 * - entryPrice (8 bytes LE)
 * - randomness (32 bytes)
 */
export function serializePositionNote(note: PositionNote): Uint8Array {
  const buffer = new Uint8Array(123);
  let offset = 0;

  // Type byte
  buffer[offset] = NOTE_TYPE_POSITION;
  offset += 1;

  // stealthPubX
  buffer.set(note.stealthPubX, offset);
  offset += 32;

  // marketId (32 bytes)
  buffer.set(note.marketId, offset);
  offset += 32;

  // isLong
  buffer[offset] = note.isLong ? 1 : 0;
  offset += 1;

  // margin (8 bytes LE)
  let margin = note.margin;
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number(margin & 0xffn);
    margin >>= 8n;
  }
  offset += 8;

  // size (8 bytes LE)
  let size = note.size;
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number(size & 0xffn);
    size >>= 8n;
  }
  offset += 8;

  // leverage (1 byte)
  buffer[offset] = note.leverage;
  offset += 1;

  // entryPrice (8 bytes LE)
  let entryPrice = note.entryPrice;
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number(entryPrice & 0xffn);
    entryPrice >>= 8n;
  }
  offset += 8;

  // randomness (32 bytes)
  buffer.set(note.randomness, offset);

  return buffer;
}

/**
 * Deserialize position note from bytes
 */
export function deserializePositionNote(data: Uint8Array): PositionNote | null {
  if (data.length < 123) return null;

  // Check type byte
  if (data[0] !== NOTE_TYPE_POSITION) return null;

  let offset = 1;

  // stealthPubX
  const stealthPubX = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;

  // marketId
  const marketId = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;

  // isLong
  const isLong = data[offset] !== 0;
  offset += 1;

  // margin
  let margin = 0n;
  for (let i = 7; i >= 0; i--) {
    margin = (margin << 8n) | BigInt(data[offset + i]);
  }
  offset += 8;

  // size
  let size = 0n;
  for (let i = 7; i >= 0; i--) {
    size = (size << 8n) | BigInt(data[offset + i]);
  }
  offset += 8;

  // leverage
  const leverage = data[offset];
  offset += 1;

  // entryPrice
  let entryPrice = 0n;
  for (let i = 7; i >= 0; i--) {
    entryPrice = (entryPrice << 8n) | BigInt(data[offset + i]);
  }
  offset += 8;

  // randomness (32 bytes)
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
    randomness,
  };
}

/**
 * Serialize LP note to bytes
 *
 * Format (105 bytes total - encrypted ~185 bytes, fits in 250-byte limit):
 * - type (1 byte): 0x81
 * - stealthPubX (32 bytes)
 * - poolId (32 bytes)
 * - lpAmount (8 bytes LE)
 * - randomness (32 bytes)
 */
export function serializeLpNote(note: LpNote): Uint8Array {
  const buffer = new Uint8Array(105);
  let offset = 0;

  // Type byte
  buffer[offset] = NOTE_TYPE_LP;
  offset += 1;

  // stealthPubX
  buffer.set(note.stealthPubX, offset);
  offset += 32;

  // poolId
  buffer.set(note.poolId, offset);
  offset += 32;

  // lpAmount (8 bytes LE)
  let lpAmount = note.lpAmount;
  for (let i = 0; i < 8; i++) {
    buffer[offset + i] = Number(lpAmount & 0xffn);
    lpAmount >>= 8n;
  }
  offset += 8;

  // randomness (32 bytes)
  buffer.set(note.randomness, offset);

  return buffer;
}

/**
 * Deserialize LP note from bytes
 */
export function deserializeLpNote(data: Uint8Array): LpNote | null {
  if (data.length < 105) return null;

  // Check type byte
  if (data[0] !== NOTE_TYPE_LP) return null;

  let offset = 1;

  // stealthPubX
  const stealthPubX = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;

  // poolId
  const poolId = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;

  // lpAmount
  let lpAmount = 0n;
  for (let i = 7; i >= 0; i--) {
    lpAmount = (lpAmount << 8n) | BigInt(data[offset + i]);
  }
  offset += 8;

  // randomness (32 bytes)
  const randomness = new Uint8Array(data.slice(offset, offset + 32));

  return {
    noteType: NOTE_TYPE_LP,
    stealthPubX,
    poolId,
    lpAmount,
    randomness,
  };
}

/**
 * Detect note type from serialized bytes
 *
 * Uses the first byte as a type indicator:
 * - 0x80: Position note
 * - 0x81: LP note
 * - 0x00-0x30: Standard note (first byte is part of stealthPubX field element)
 */
export function detectNoteType(data: Uint8Array): number {
  if (data.length >= 1) {
    // Check for position note type byte
    if (data[0] === NOTE_TYPE_POSITION) {
      return NOTE_TYPE_POSITION;
    }
    // Check for LP note type byte
    if (data[0] === NOTE_TYPE_LP) {
      return NOTE_TYPE_LP;
    }
  }
  // Default to standard note (first byte < 0x31 for valid BN254 field elements)
  return NOTE_TYPE_STANDARD;
}
