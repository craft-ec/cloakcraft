/**
 * CloakCraft SDK Constants
 */

import { PublicKey } from '@solana/web3.js';

// Default program ID (devnet deployment)
export const PROGRAM_ID = new PublicKey('DsCP619hPxpvY1SKfCqoKMB7om52UJBKBewevvoNN7Ha');

// PDA seeds
export const SEEDS = {
  POOL: Buffer.from('pool'),
  VAULT: Buffer.from('vault'),
  VERIFICATION_KEY: Buffer.from('vk'),
  COMMITMENT_COUNTER: Buffer.from('commitment_counter'),
} as const;

// V2 Batch Trees (Devnet)
export const DEVNET_V2_TREES = {
  STATE_TREE: new PublicKey('bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU'),
  OUTPUT_QUEUE: new PublicKey('oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto'),
  ADDRESS_TREE: new PublicKey('amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx'),
} as const;

// Circuit IDs
export const CIRCUIT_IDS = {
  TRANSFER_1X2: 'transfer_1x2',
  TRANSFER_1X3: 'transfer_1x3',
  TRANSFER_2X2: 'transfer_2x2',
  TRANSFER_2X3: 'transfer_2x3',
  TRANSFER_3X2: 'transfer_3x2',
  TRANSFER_3X3: 'transfer_3x3',
  SWAP: 'swap_swap',
  ADD_LIQUIDITY: 'swap_add_liquidity',
  REMOVE_LIQUIDITY: 'swap_remove_liquidity',
  ORDER_CREATE: 'market_order_create',
  ORDER_FILL: 'market_order_fill',
  ORDER_CANCEL: 'market_order_cancel',
  GOVERNANCE_VOTE: 'governance_encrypted_submit',
} as const;

/**
 * Pad circuit ID to 32 bytes
 */
export function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

/**
 * Derive pool PDA
 */
export function derivePoolPda(tokenMint: PublicKey, programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.POOL, tokenMint.toBuffer()],
    programId
  );
}

/**
 * Derive vault PDA
 */
export function deriveVaultPda(tokenMint: PublicKey, programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, tokenMint.toBuffer()],
    programId
  );
}

/**
 * Derive commitment counter PDA
 */
export function deriveCommitmentCounterPda(pool: PublicKey, programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.COMMITMENT_COUNTER, pool.toBuffer()],
    programId
  );
}

/**
 * Derive verification key PDA
 */
export function deriveVerificationKeyPda(circuitId: string, programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.VERIFICATION_KEY, padCircuitId(circuitId)],
    programId
  );
}
