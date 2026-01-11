/**
 * Nullifier derivation utilities
 */

import type { FieldElement, Nullifier, Commitment } from '@cloakcraft/types';
import {
  poseidonHashDomain,
  DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_ACTION_NULLIFIER,
  DOMAIN_NULLIFIER_KEY,
  fieldToBytes,
} from './poseidon';

/**
 * Derive nullifier key from spending key
 *
 * nk = poseidon(DOMAIN_NULLIFIER_KEY, sk, 0)
 *
 * Matches circuit: hash3(NULLIFIER_KEY_DOMAIN, stealth_spending_key, 0)
 */
export function deriveNullifierKey(spendingKey: FieldElement): FieldElement {
  const zero = new Uint8Array(32); // 0 as field element
  return poseidonHashDomain(DOMAIN_NULLIFIER_KEY, spendingKey, zero);
}

/**
 * Derive spending nullifier (consumes the note)
 *
 * spending_nullifier = poseidon(DOMAIN_SPENDING_NULLIFIER, nk, commitment, leaf_index)
 *
 * The leaf_index is included to prevent nullifier collision attacks when the
 * same note could theoretically appear at multiple positions.
 */
export function deriveSpendingNullifier(
  nullifierKey: FieldElement,
  commitment: Commitment,
  leafIndex: number
): Nullifier {
  const leafIndexBytes = fieldToBytes(BigInt(leafIndex));
  return poseidonHashDomain(DOMAIN_SPENDING_NULLIFIER, nullifierKey, commitment, leafIndexBytes);
}

/**
 * Derive action nullifier (uses note without consuming)
 *
 * action_nullifier = poseidon(DOMAIN_ACTION_NULLIFIER, nk, commitment, action_domain)
 *
 * Used for voting: each proposal has a unique action_domain, so a note
 * can only vote once per proposal but remains spendable.
 */
export function deriveActionNullifier(
  nullifierKey: FieldElement,
  commitment: Commitment,
  actionDomain: FieldElement
): Nullifier {
  return poseidonHashDomain(DOMAIN_ACTION_NULLIFIER, nullifierKey, commitment, actionDomain);
}

/**
 * Check if a nullifier has been used (via indexer)
 */
export async function checkNullifierSpent(
  indexerUrl: string,
  nullifier: Nullifier
): Promise<boolean> {
  const nullifierHex = Buffer.from(nullifier).toString('hex');
  const response = await fetch(`${indexerUrl}/nullifier/${nullifierHex}`);
  if (!response.ok) {
    throw new Error('Failed to check nullifier');
  }
  const data = await response.json() as { spent: boolean };
  return data.spent;
}
