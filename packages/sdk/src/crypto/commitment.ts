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
