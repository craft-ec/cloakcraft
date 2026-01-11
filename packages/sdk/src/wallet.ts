/**
 * Wallet management for CloakCraft
 */

import type { Keypair, SpendingKey, ViewingKey, Point, FieldElement } from '@cloakcraft/types';
import { derivePublicKey } from './crypto/babyjubjub';
import { deriveNullifierKey } from './crypto/nullifier';
import { poseidonHashDomain, bytesToField, fieldToBytes } from './crypto/poseidon';

// BabyJubJub subgroup order
const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

// Domain separator for incoming viewing key
const DOMAIN_IVK = 0x10n;

/**
 * Wallet class wrapping keypair with convenience methods
 */
export class Wallet {
  readonly keypair: Keypair;

  constructor(keypair: Keypair) {
    this.keypair = keypair;
  }

  /**
   * Get the spending key (secret - handle with care)
   */
  get spendingKey(): SpendingKey {
    return this.keypair.spending;
  }

  /**
   * Get the viewing key (can share for read-only access)
   */
  get viewingKey(): ViewingKey {
    return this.keypair.viewing;
  }

  /**
   * Get the public key (for receiving funds)
   */
  get publicKey(): Point {
    return this.keypair.publicKey;
  }

  /**
   * Export spending key as bytes (for backup)
   */
  exportSpendingKey(): Uint8Array {
    return new Uint8Array(this.keypair.spending.sk);
  }

  /**
   * Export viewing key as bytes (for watch-only access)
   */
  exportViewingKey(): { nk: Uint8Array; ivk: Uint8Array } {
    return {
      nk: new Uint8Array(this.keypair.viewing.nk),
      ivk: new Uint8Array(this.keypair.viewing.ivk),
    };
  }
}

/**
 * Create a new random wallet
 */
export function createWallet(): Wallet {
  // Generate random spending key
  const sk = generateRandomSpendingKey();
  return createWalletFromSpendingKey(sk);
}

/**
 * Load wallet from spending key bytes
 */
export function loadWallet(spendingKeyBytes: Uint8Array): Wallet {
  if (spendingKeyBytes.length !== 32) {
    throw new Error('Spending key must be 32 bytes');
  }

  const sk = bytesToField(spendingKeyBytes);
  if (sk >= SUBGROUP_ORDER) {
    throw new Error('Invalid spending key');
  }

  return createWalletFromSpendingKey(sk);
}

/**
 * Create wallet from viewing key (watch-only)
 */
export function createWatchOnlyWallet(viewingKey: ViewingKey, publicKey: Point): Wallet {
  // For watch-only, we use a dummy spending key
  const dummySk: SpendingKey = {
    sk: new Uint8Array(32),
  };

  return new Wallet({
    spending: dummySk,
    viewing: viewingKey,
    publicKey,
  });
}

/**
 * Derive a wallet from a seed phrase (BIP-39 style)
 *
 * Note: In production, use proper BIP-39 implementation
 */
export async function deriveWalletFromSeed(
  seedPhrase: string,
  path: string = "m/44'/501'/0'/0'"
): Promise<Wallet> {
  // Hash the seed phrase to get entropy
  const encoder = new TextEncoder();
  const seedBytes = encoder.encode(seedPhrase);

  // Use SubtleCrypto for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    seedBytes,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: encoder.encode('cloakcraft' + path),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const skBytes = new Uint8Array(derivedBits);
  const sk = bytesToField(skBytes) % SUBGROUP_ORDER;

  return createWalletFromSpendingKey(sk);
}

// =============================================================================
// Private Helper Functions
// =============================================================================

function createWalletFromSpendingKey(sk: bigint): Wallet {
  const skBytes = fieldToBytes(sk);

  // Derive nullifier key: nk = poseidon(DOMAIN_NK, sk)
  const nk = deriveNullifierKey(skBytes);

  // Derive incoming viewing key: ivk = poseidon(DOMAIN_IVK, sk)
  const ivk = poseidonHashDomain(DOMAIN_IVK, skBytes);

  // Derive public key: pk = sk * G
  const publicKey = derivePublicKey(sk);

  const keypair: Keypair = {
    spending: { sk: skBytes },
    viewing: { nk, ivk },
    publicKey,
  };

  return new Wallet(keypair);
}

function generateRandomSpendingKey(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER;
}
