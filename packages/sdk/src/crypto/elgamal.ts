/**
 * ElGamal Encryption for Governance Voting
 *
 * Implements ElGamal encryption over BabyJubJub for homomorphic vote aggregation.
 * Encrypted votes can be homomorphically added without decryption.
 */

import type { Point, ElGamalCiphertext } from '@cloakcraft/types';
import { poseidonHash, fieldToBytes, bytesToField } from './poseidon';
import { derivePublicKey, scalarMul as multiplyPoint, pointAdd as addPoints, GENERATOR } from './babyjubjub';

// =============================================================================
// ElGamal Encryption
// =============================================================================

/**
 * Encrypt a value using ElGamal encryption
 *
 * ElGamal encryption:
 * - Choose random r
 * - c1 = r * G (ephemeral key)
 * - c2 = m * G + r * P (encrypted message)
 *
 * Where:
 * - G is the generator point
 * - P is the public key
 * - m is the message (voting power)
 *
 * @param message - Message to encrypt (voting power as bigint)
 * @param pubkey - Election/threshold public key
 * @param randomness - Random scalar for encryption
 */
export function elgamalEncrypt(
  message: bigint,
  pubkey: Point,
  randomness: bigint
): ElGamalCiphertext {
  // c1 = r * G
  const c1 = multiplyPoint(GENERATOR, randomness);

  // m * G
  const mG = multiplyPoint(GENERATOR, message);

  // r * P
  const rP = multiplyPoint(pubkey, randomness);

  // c2 = m * G + r * P
  const c2 = addPoints(mG, rP);

  return { c1, c2 };
}

/**
 * Add two ElGamal ciphertexts (homomorphic addition)
 *
 * (c1_a, c2_a) + (c1_b, c2_b) = (c1_a + c1_b, c2_a + c2_b)
 *
 * This allows aggregating encrypted votes without decryption.
 */
export function addCiphertexts(
  a: ElGamalCiphertext,
  b: ElGamalCiphertext
): ElGamalCiphertext {
  return {
    c1: addPoints(a.c1, b.c1),
    c2: addPoints(a.c2, b.c2),
  };
}

/**
 * Serialize ciphertext for on-chain storage
 *
 * Format: 64 bytes = c1_x (32) + c2_x (32)
 * (Y-coordinates can be recovered from X)
 */
export function serializeCiphertext(ct: ElGamalCiphertext): Uint8Array {
  const result = new Uint8Array(64);
  result.set(ct.c1.x, 0);
  result.set(ct.c2.x, 32);
  return result;
}

/**
 * Serialize ciphertext as full points (for circuit inputs)
 *
 * Format: 128 bytes = c1 (64) + c2 (64)
 */
export function serializeCiphertextFull(ct: ElGamalCiphertext): Uint8Array {
  const result = new Uint8Array(128);
  result.set(ct.c1.x, 0);
  result.set(ct.c1.y, 32);
  result.set(ct.c2.x, 64);
  result.set(ct.c2.y, 96);
  return result;
}

// =============================================================================
// Vote Encryption
// =============================================================================

/**
 * Vote options
 */
export enum VoteOption {
  Yes = 0,
  No = 1,
  Abstain = 2,
}

/**
 * Encrypted ballot (one ciphertext per option)
 *
 * For a vote with 3 options (yes/no/abstain):
 * - Selected option encrypts the voting power: Enc(votingPower)
 * - Other options encrypt zero: Enc(0)
 *
 * This allows homomorphic tallying while hiding individual votes.
 */
export interface EncryptedBallot {
  /** Encrypted value for "Yes" option */
  yes: ElGamalCiphertext;
  /** Encrypted value for "No" option */
  no: ElGamalCiphertext;
  /** Encrypted value for "Abstain" option */
  abstain: ElGamalCiphertext;
}

/**
 * Generate random encryption values for vote
 */
export function generateVoteRandomness(): {
  yes: bigint;
  no: bigint;
  abstain: bigint;
} {
  // Generate random 32-byte scalars
  const generateRandom = (): bigint => {
    const bytes = new Uint8Array(32);
    if (typeof globalThis.crypto !== 'undefined') {
      globalThis.crypto.getRandomValues(bytes);
    } else {
      // Fallback for Node.js
      const { randomBytes } = require('crypto');
      const nodeBytes = randomBytes(32);
      bytes.set(nodeBytes);
    }
    return bytesToField(bytes);
  };

  return {
    yes: generateRandom(),
    no: generateRandom(),
    abstain: generateRandom(),
  };
}

/**
 * Encrypt a vote
 *
 * @param votingPower - User's voting power (token amount)
 * @param choice - Vote choice (0=Yes, 1=No, 2=Abstain)
 * @param electionPubkey - Election public key for encryption
 * @param randomness - Random values for each option (must be unique)
 */
export function encryptVote(
  votingPower: bigint,
  choice: VoteOption,
  electionPubkey: Point,
  randomness: { yes: bigint; no: bigint; abstain: bigint }
): EncryptedBallot {
  // Encrypt voting power for selected option, zero for others
  const yesAmount = choice === VoteOption.Yes ? votingPower : 0n;
  const noAmount = choice === VoteOption.No ? votingPower : 0n;
  const abstainAmount = choice === VoteOption.Abstain ? votingPower : 0n;

  return {
    yes: elgamalEncrypt(yesAmount, electionPubkey, randomness.yes),
    no: elgamalEncrypt(noAmount, electionPubkey, randomness.no),
    abstain: elgamalEncrypt(abstainAmount, electionPubkey, randomness.abstain),
  };
}

/**
 * Serialize encrypted ballot for on-chain submission
 *
 * Format: Array of 64-byte ciphertexts (one per option)
 */
export function serializeEncryptedVote(vote: EncryptedBallot): Uint8Array[] {
  return [
    serializeCiphertext(vote.yes),
    serializeCiphertext(vote.no),
    serializeCiphertext(vote.abstain),
  ];
}

// =============================================================================
// Threshold Decryption
// =============================================================================

/**
 * Decryption share data from a committee member
 *
 * For threshold decryption with t-of-n, each committee member:
 * 1. Computes their partial decryption share: D_i = sk_i * c1
 * 2. Provides a DLEQ proof that D_i is correctly computed
 *
 * After t shares are collected, the plaintext can be recovered:
 * m * G = c2 - sum(lagrange_i * D_i)
 */
export interface DecryptionShareData {
  /** Committee member index (1-indexed) */
  memberIndex: number;
  /** Partial decryption shares (one per option) */
  shares: Point[];
  /** DLEQ proofs of correctness */
  dleqProofs: Uint8Array[];
}

/**
 * Compute a partial decryption share
 *
 * @param ciphertext - Encrypted ciphertext
 * @param secretKeyShare - Committee member's secret key share
 */
export function computeDecryptionShare(
  ciphertext: ElGamalCiphertext,
  secretKeyShare: bigint
): Point {
  // D = sk * c1
  return multiplyPoint(ciphertext.c1, secretKeyShare);
}

/**
 * Compute Lagrange coefficient for threshold decryption
 *
 * @param indices - Indices of participating members (1-indexed)
 * @param myIndex - Index of the member computing the coefficient
 * @param fieldOrder - Field order for modular arithmetic
 */
export function lagrangeCoefficient(
  indices: number[],
  myIndex: number,
  fieldOrder: bigint
): bigint {
  let numerator = 1n;
  let denominator = 1n;

  for (const j of indices) {
    if (j !== myIndex) {
      numerator = (numerator * BigInt(j)) % fieldOrder;
      const diff = (BigInt(j) - BigInt(myIndex) + fieldOrder) % fieldOrder;
      denominator = (denominator * diff) % fieldOrder;
    }
  }

  // Compute modular inverse of denominator
  const denomInv = modInverse(denominator, fieldOrder);
  return (numerator * denomInv) % fieldOrder;
}

/**
 * Modular inverse using extended Euclidean algorithm
 */
function modInverse(a: bigint, m: bigint): bigint {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];

  while (r !== 0n) {
    const quotient = old_r / r;
    [old_r, r] = [r, old_r - quotient * r];
    [old_s, s] = [s, old_s - quotient * s];
  }

  if (old_r > 1n) {
    throw new Error('Modular inverse does not exist');
  }

  return ((old_s % m) + m) % m;
}

/**
 * Combine decryption shares to recover encrypted total
 *
 * @param ciphertext - Aggregated encrypted ciphertext
 * @param shares - Decryption shares from committee members
 * @param indices - Indices of participating members
 * @param fieldOrder - Field order for Lagrange coefficients
 */
export function combineShares(
  ciphertext: ElGamalCiphertext,
  shares: Point[],
  indices: number[],
  fieldOrder: bigint
): Point {
  // Compute sum of (lagrange_i * D_i) for each share
  let combinedShare: Point = { x: new Uint8Array(32), y: new Uint8Array(32) };
  combinedShare.y[0] = 1; // Identity point

  for (let i = 0; i < shares.length; i++) {
    const lambda = lagrangeCoefficient(indices, indices[i], fieldOrder);
    const weightedShare = multiplyPoint(shares[i], lambda);
    combinedShare = addPoints(combinedShare, weightedShare);
  }

  // m * G = c2 - combinedShare
  const negCombined = negatePoint(combinedShare);
  return addPoints(ciphertext.c2, negCombined);
}

/**
 * Negate a point (for subtraction)
 */
function negatePoint(p: Point): Point {
  // On twisted Edwards, negation is (-x, y)
  const negX = new Uint8Array(32);
  // For simplicity, assuming little-endian field representation
  // In practice, need proper field negation
  const fieldModulus = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  const x = bytesToField(p.x);
  const negXVal = (fieldModulus - x) % fieldModulus;
  const negXBytes = fieldToBytes(negXVal);
  negX.set(negXBytes);

  return { x: negX, y: p.y };
}

// =============================================================================
// DLEQ Proof (Discrete Log Equality)
// =============================================================================

/**
 * DLEQ proof structure
 *
 * Proves that log_G(P) = log_c1(D) without revealing the discrete log.
 * This ensures committee members computed their shares correctly.
 */
export interface DleqProof {
  /** Challenge value */
  c: Uint8Array;
  /** Response value */
  s: Uint8Array;
}

/**
 * Generate a DLEQ proof
 *
 * Proves: log_G(publicKey) = log_c1(decryptionShare)
 * Where secretKey is the common discrete log.
 *
 * @param secretKey - Secret key (discrete log)
 * @param publicKey - P = secretKey * G
 * @param c1 - Ciphertext c1 component
 * @param decryptionShare - D = secretKey * c1
 */
export function generateDleqProof(
  secretKey: bigint,
  publicKey: Point,
  c1: Point,
  decryptionShare: Point
): DleqProof {
  // Generate random k
  const k = generateRandomScalar();

  // A = k * G
  const A = multiplyPoint(GENERATOR, k);

  // B = k * c1
  const B = multiplyPoint(c1, k);

  // Challenge c = H(G, P, c1, D, A, B)
  const challenge = poseidonHash([
    GENERATOR.x,
    GENERATOR.y,
    publicKey.x,
    publicKey.y,
    c1.x,
    c1.y,
    decryptionShare.x,
    decryptionShare.y,
    A.x,
    A.y,
    B.x,
    B.y,
  ]);

  const c = bytesToField(challenge);

  // Response s = k - c * secretKey (mod field_order)
  const fieldOrder = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  const s = ((k - c * secretKey) % fieldOrder + fieldOrder) % fieldOrder;

  return {
    c: challenge,
    s: fieldToBytes(s),
  };
}

/**
 * Verify a DLEQ proof
 */
export function verifyDleqProof(
  proof: DleqProof,
  publicKey: Point,
  c1: Point,
  decryptionShare: Point
): boolean {
  const c = bytesToField(proof.c);
  const s = bytesToField(proof.s);

  // A' = s * G + c * P
  const sG = multiplyPoint(GENERATOR, s);
  const cP = multiplyPoint(publicKey, c);
  const Aprime = addPoints(sG, cP);

  // B' = s * c1 + c * D
  const sC1 = multiplyPoint(c1, s);
  const cD = multiplyPoint(decryptionShare, c);
  const Bprime = addPoints(sC1, cD);

  // Recompute challenge and verify
  const challenge = poseidonHash([
    GENERATOR.x,
    GENERATOR.y,
    publicKey.x,
    publicKey.y,
    c1.x,
    c1.y,
    decryptionShare.x,
    decryptionShare.y,
    Aprime.x,
    Aprime.y,
    Bprime.x,
    Bprime.y,
  ]);

  // Compare challenges
  const expectedC = bytesToField(challenge);
  return c === expectedC;
}

/**
 * Generate a random scalar
 */
function generateRandomScalar(): bigint {
  const bytes = new Uint8Array(32);
  if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    const { randomBytes } = require('crypto');
    const nodeBytes = randomBytes(32);
    bytes.set(nodeBytes);
  }

  // Reduce mod field order
  const value = bytesToField(bytes);
  const fieldOrder = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
  return value % fieldOrder;
}
