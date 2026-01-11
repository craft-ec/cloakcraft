/**
 * Note commitment utilities
 */

import type { FieldElement, Commitment, Note } from '@cloakcraft/types';
import { PublicKey } from '@solana/web3.js';
import { poseidonHashDomain, DOMAIN_COMMITMENT, bytesToField, fieldToBytes } from './poseidon';

/**
 * Compute note commitment
 *
 * commitment = poseidon(DOMAIN_COMMITMENT, stealth_pub_x, token_mint, amount, randomness)
 */
export function computeCommitment(note: Note): Commitment {
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
