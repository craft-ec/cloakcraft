/**
 * Poseidon hash implementation for BN254 scalar field
 */

import { sha256 } from '@noble/hashes/sha256';
import type { FieldElement, PoseidonHash } from '@cloakcraft/types';

// Domain separators matching the circuits
export const DOMAIN_COMMITMENT = 0x01n;
export const DOMAIN_SPENDING_NULLIFIER = 0x02n;
export const DOMAIN_ACTION_NULLIFIER = 0x03n;
export const DOMAIN_NULLIFIER_KEY = 0x04n;
export const DOMAIN_STEALTH = 0x05n;
export const DOMAIN_MERKLE = 0x06n;
export const DOMAIN_EMPTY_LEAF = 0x07n;

// BN254 scalar field modulus
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Convert bytes to field element (big-endian)
 */
export function bytesToField(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result % FIELD_MODULUS;
}

/**
 * Convert field element to bytes (32 bytes, big-endian)
 */
export function fieldToBytes(field: bigint): FieldElement {
  const bytes = new Uint8Array(32);
  let value = field % FIELD_MODULUS;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

/**
 * Poseidon hash with domain separation
 *
 * Note: This is a placeholder implementation using SHA-256.
 * In production, use a proper Poseidon implementation for BN254.
 */
export function poseidonHash(inputs: FieldElement[], domain?: bigint): PoseidonHash {
  // Placeholder: Use SHA-256 for now
  // In production: Implement actual Poseidon for BN254
  const hasher = sha256.create();

  if (domain !== undefined) {
    hasher.update(fieldToBytes(domain));
  }

  for (const input of inputs) {
    hasher.update(input);
  }

  const hash = hasher.digest();

  // Reduce to field
  const hashBigInt = bytesToField(hash);
  return fieldToBytes(hashBigInt);
}

/**
 * Poseidon hash of two elements (for merkle tree)
 */
export function poseidonHash2(left: FieldElement, right: FieldElement): PoseidonHash {
  return poseidonHash([left, right], DOMAIN_MERKLE);
}

/**
 * Poseidon hash of multiple elements with domain
 */
export function poseidonHashDomain(domain: bigint, ...inputs: FieldElement[]): PoseidonHash {
  return poseidonHash(inputs, domain);
}
