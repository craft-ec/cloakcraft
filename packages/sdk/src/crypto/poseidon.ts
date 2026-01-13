/**
 * Poseidon hash implementation for BN254 scalar field
 *
 * Uses circomlibjs which matches the Circom Poseidon implementation
 * Compatible with Solana's sol_poseidon syscall
 */

// @ts-ignore - circomlibjs lacks types
import { buildPoseidon } from 'circomlibjs';

interface Poseidon {
  (inputs: bigint[]): Uint8Array;
  F: {
    toObject(element: Uint8Array): bigint;
    fromObject(value: bigint): Uint8Array;
  };
}
import type { FieldElement, PoseidonHash } from '@cloakcraft/types';

// Domain separators matching the circuits
export const DOMAIN_COMMITMENT = 0x01n;
export const DOMAIN_SPENDING_NULLIFIER = 0x02n;
export const DOMAIN_ACTION_NULLIFIER = 0x03n;
export const DOMAIN_NULLIFIER_KEY = 0x04n;
export const DOMAIN_STEALTH = 0x05n;
export const DOMAIN_MERKLE = 0x06n;
export const DOMAIN_EMPTY_LEAF = 0x07n;

// BN254 scalar field (Fr) modulus - this is the native field for Groth16/Circom circuits
// Fr = 21888242871839275222246405745257275088548364400416034343698204186575808495617
// NOTE: Some old notes were created with the wrong Fq modulus. We need to support both.
export const FIELD_MODULUS_FR = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// BN254 base field (Fq) modulus - LEGACY, only for backwards compatibility
// Fq = 21888242871839275222246405745257275088696311157297823662689037894645226208583
export const FIELD_MODULUS_FQ = 21888242871839275222246405745257275088696311157297823662689037894645226208583n;

// Default to Fr (correct for Circom circuits)
const FIELD_MODULUS = FIELD_MODULUS_FR;

// Singleton Poseidon instance
let poseidonInstance: Poseidon | null = null;

/**
 * Initialize Poseidon hash function (async, call once at startup)
 */
export async function initPoseidon(): Promise<Poseidon> {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon() as unknown as Poseidon;
  }
  return poseidonInstance!;
}

// Promise for ongoing initialization (prevents race conditions)
let initPromise: Promise<Poseidon> | null = null;

/**
 * Get Poseidon instance, auto-initializing if needed
 * Uses a blocking pattern since circomlibjs requires async init
 */
async function getPoseidonAsync(): Promise<Poseidon> {
  if (poseidonInstance) {
    return poseidonInstance;
  }
  return initPoseidon();
}

/**
 * Get Poseidon instance (throws if not initialized)
 * For sync usage, call initPoseidon() first
 */
function getPoseidon(): Poseidon {
  if (!poseidonInstance) {
    throw new Error('Poseidon not initialized. Call initPoseidon() first.');
  }
  return poseidonInstance;
}

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
 * Uses circomlibjs which matches the Circom Poseidon implementation.
 * Domain is included as the first element in the hash input.
 */
export function poseidonHash(inputs: FieldElement[], domain?: bigint): PoseidonHash {
  const poseidon = getPoseidon();

  // Convert inputs to bigints
  const fieldInputs: bigint[] = [];

  // Add domain as first element if provided
  if (domain !== undefined) {
    fieldInputs.push(domain);
  }

  // Convert byte arrays to field elements
  for (const input of inputs) {
    fieldInputs.push(bytesToField(input));
  }

  // Compute Poseidon hash
  // circomlibjs returns a Uint8Array in F format, need to convert to bigint then to bytes
  const hashResult = poseidon(fieldInputs);
  const hashBigInt = poseidon.F.toObject(hashResult) as bigint;

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

/**
 * Async version of poseidonHash that auto-initializes
 */
export async function poseidonHashAsync(inputs: FieldElement[], domain?: bigint): Promise<PoseidonHash> {
  await initPoseidon();
  return poseidonHash(inputs, domain);
}

/**
 * Async version of poseidonHashDomain that auto-initializes
 */
export async function poseidonHashDomainAsync(domain: bigint, ...inputs: FieldElement[]): Promise<PoseidonHash> {
  await initPoseidon();
  return poseidonHashDomain(domain, ...inputs);
}
