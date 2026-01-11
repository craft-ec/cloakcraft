/**
 * BabyJubJub curve operations
 *
 * BabyJubJub is a twisted Edwards curve over the BN254 scalar field.
 */

import type { Point } from '@cloakcraft/types';
import { fieldToBytes, bytesToField } from './poseidon';

// BN254 scalar field modulus
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// BabyJubJub subgroup order
const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

// Curve parameters
const A = 168700n;
const D = 168696n;

// Generator point
export const GENERATOR: Point = {
  x: fieldToBytes(5299619240641551281634865583518297030282874472190772894086521144482721001553n),
  y: fieldToBytes(16950150798460657717958625567821834550301663161624707787222815936182638968203n),
};

// Identity point (0, 1)
export const IDENTITY: Point = {
  x: fieldToBytes(0n),
  y: fieldToBytes(1n),
};

/**
 * Modular inverse using extended Euclidean algorithm
 */
function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];

  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }

  return ((old_s % m) + m) % m;
}

/**
 * Point addition on BabyJubJub (twisted Edwards curve)
 *
 * (x1, y1) + (x2, y2) = ((x1*y2 + y1*x2) / (1 + d*x1*x2*y1*y2),
 *                        (y1*y2 - a*x1*x2) / (1 - d*x1*x2*y1*y2))
 */
export function pointAdd(p1: Point, p2: Point): Point {
  const x1 = bytesToField(p1.x);
  const y1 = bytesToField(p1.y);
  const x2 = bytesToField(p2.x);
  const y2 = bytesToField(p2.y);

  const x1x2 = (x1 * x2) % FIELD_MODULUS;
  const y1y2 = (y1 * y2) % FIELD_MODULUS;
  const x1y2 = (x1 * y2) % FIELD_MODULUS;
  const y1x2 = (y1 * x2) % FIELD_MODULUS;
  const dx1x2y1y2 = (D * x1x2 * y1y2) % FIELD_MODULUS;

  // Numerators
  const xNum = (x1y2 + y1x2) % FIELD_MODULUS;
  const yNum = (y1y2 - A * x1x2 % FIELD_MODULUS + FIELD_MODULUS) % FIELD_MODULUS;

  // Denominators
  const xDen = (1n + dx1x2y1y2) % FIELD_MODULUS;
  const yDen = (1n - dx1x2y1y2 + FIELD_MODULUS) % FIELD_MODULUS;

  // Compute result
  const x3 = (xNum * modInverse(xDen, FIELD_MODULUS)) % FIELD_MODULUS;
  const y3 = (yNum * modInverse(yDen, FIELD_MODULUS)) % FIELD_MODULUS;

  return {
    x: fieldToBytes(x3),
    y: fieldToBytes(y3),
  };
}

/**
 * Scalar multiplication using double-and-add
 */
export function scalarMul(point: Point, scalar: bigint): Point {
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

/**
 * Generate a public key from a private key
 */
export function derivePublicKey(privateKey: bigint): Point {
  return scalarMul(GENERATOR, privateKey);
}

/**
 * Check if a point is on the curve
 */
export function isOnCurve(point: Point): boolean {
  const x = bytesToField(point.x);
  const y = bytesToField(point.y);

  // Check: a*x^2 + y^2 = 1 + d*x^2*y^2
  const x2 = (x * x) % FIELD_MODULUS;
  const y2 = (y * y) % FIELD_MODULUS;
  const lhs = (A * x2 + y2) % FIELD_MODULUS;
  const rhs = (1n + D * x2 * y2 % FIELD_MODULUS) % FIELD_MODULUS;

  return lhs === rhs;
}

/**
 * Check if a point is in the prime-order subgroup
 */
export function isInSubgroup(point: Point): boolean {
  const shouldBeIdentity = scalarMul(point, SUBGROUP_ORDER);
  return (
    bytesToField(shouldBeIdentity.x) === 0n &&
    bytesToField(shouldBeIdentity.y) === 1n
  );
}
