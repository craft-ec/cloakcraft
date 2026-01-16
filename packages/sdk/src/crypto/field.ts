/**
 * BN254 field element conversion utilities
 *
 * Ensures values are properly reduced modulo the BN254 field prime.
 */

import { PublicKey } from '@solana/web3.js';

/**
 * BN254 SCALAR field modulus (Fr) - big-endian
 * r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
 *
 * IMPORTANT: Circom/Groth16 circuits use the SCALAR field (Fr), not the base field (Fq).
 * - Fr = 21888242871839275222246405745257275088548364400416034343698204186575808495617 (circuit field)
 * - Fq = 21888242871839275222246405745257275088696311157297823662689037894645226208583 (curve coordinates)
 *
 * This MUST match the Rust program's helpers/field.rs BN254_SCALAR_FIELD_MODULUS!
 */
const BN254_FIELD_MODULUS = new Uint8Array([
  0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29,
  0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
  0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91,
  0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x01,
]);

/**
 * Convert a PublicKey to a BN254 field element
 *
 * Since PublicKey is 256 bits and BN254 field is ~254 bits, we reduce modulo the field prime.
 * This matches the on-chain implementation in helpers/field.rs
 */
export function pubkeyToField(pubkey: PublicKey): Uint8Array {
  const pubkeyBytes = pubkey.toBytes();
  const result = new Uint8Array(32);
  result.set(pubkeyBytes);

  // Subtract modulus while value >= modulus
  // Max 4 subtractions needed since pubkey is 256 bits and modulus is ~254 bits
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

/**
 * Subtract BN254 field modulus from value: result = value - modulus
 */
function subtractModulus(value: Uint8Array): Uint8Array {
  const result = new Uint8Array(32);
  let borrow = 0;

  // Big-endian subtraction
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

/**
 * Compare 32-byte big-endian number with BN254 field modulus
 * Returns true if value >= modulus
 */
function geModulus(value: Uint8Array): boolean {
  for (let i = 0; i < 32; i++) {
    if (value[i] > BN254_FIELD_MODULUS[i]) {
      return true;
    } else if (value[i] < BN254_FIELD_MODULUS[i]) {
      return false;
    }
  }
  return true; // equal
}
