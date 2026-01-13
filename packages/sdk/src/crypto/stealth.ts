/**
 * Stealth address implementation using ECDH on BabyJubJub
 */

import type { Point, FieldElement, StealthAddress, Keypair } from '@cloakcraft/types';
import { scalarMul, GENERATOR, derivePublicKey, pointAdd } from './babyjubjub';
import { poseidonHashDomain, DOMAIN_STEALTH, bytesToField } from './poseidon';

// BabyJubJub subgroup order
const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

/**
 * Generate a stealth address for a recipient
 *
 * Sender:
 * 1. Generate random ephemeral keypair (e, E = e*G)
 * 2. Compute shared secret: S = e * recipient_pubkey
 * 3. Derive stealth private key factor: f = H(S.x)
 * 4. Stealth public key: P' = recipient_pubkey + f*G
 */
export function generateStealthAddress(recipientPubkey: Point): {
  stealthAddress: StealthAddress;
  ephemeralPrivate: bigint;
} {
  const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

  // Generate random ephemeral private key
  const ephemeralPrivate = generateRandomScalar();
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);

  // Compute shared secret
  const sharedSecret = scalarMul(recipientPubkey, ephemeralPrivate);

  // Derive stealth key factor
  const factor = deriveStealthFactor(sharedSecret.x);

  // Compute stealth public key: recipient_pubkey + factor * G
  const factorPoint = scalarMul(GENERATOR, factor);
  const stealthPubkey = addPoints(recipientPubkey, factorPoint);

  return {
    stealthAddress: {
      stealthPubkey,
      ephemeralPubkey,
    },
    ephemeralPrivate,
  };
}

/**
 * Scan and derive stealth private key (recipient side)
 *
 * Recipient:
 * 1. Compute shared secret: S = sk * E (where E is ephemeral pubkey)
 * 2. Derive factor: f = H(S.x)
 * 3. Stealth private key: sk' = sk + f
 */
export function deriveStealthPrivateKey(
  recipientPrivateKey: bigint,
  ephemeralPubkey: Point
): bigint {
  const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

  // Compute shared secret
  const sharedSecret = scalarMul(ephemeralPubkey, recipientPrivateKey);

  // Derive factor
  const factor = deriveStealthFactor(sharedSecret.x);

  // Stealth private key: sk + factor (mod subgroup_order)
  const stealthPriv = (recipientPrivateKey + factor) % SUBGROUP_ORDER;
  return stealthPriv;
}

/**
 * Check if a stealth address belongs to us
 */
export function checkStealthOwnership(
  stealthPubkey: Point,
  ephemeralPubkey: Point,
  recipientKeypair: Keypair
): boolean {
  // Derive what the stealth pubkey should be
  const privateKey = bytesToField(recipientKeypair.spending.sk);
  const derivedStealthPrivate = deriveStealthPrivateKey(privateKey, ephemeralPubkey);
  const derivedStealthPubkey = derivePublicKey(derivedStealthPrivate);

  // Compare
  return (
    bytesToField(derivedStealthPubkey.x) === bytesToField(stealthPubkey.x) &&
    bytesToField(derivedStealthPubkey.y) === bytesToField(stealthPubkey.y)
  );
}

/**
 * Derive stealth factor from shared secret
 */
function deriveStealthFactor(sharedSecretX: FieldElement): bigint {
  const hash = poseidonHashDomain(DOMAIN_STEALTH, sharedSecretX);
  return bytesToField(hash) % SUBGROUP_ORDER;
}

/**
 * Point addition helper
 */
function addPoints(p1: Point, p2: Point): Point {
  return pointAdd(p1, p2);
}

/**
 * Generate a random scalar in the subgroup
 */
function generateRandomScalar(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER;
}
