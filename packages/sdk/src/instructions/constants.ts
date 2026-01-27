/**
 * CloakCraft SDK Constants
 */

import { PublicKey } from '@solana/web3.js';

// Default program ID (devnet deployment)
export const PROGRAM_ID = new PublicKey('2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG');

// PDA seeds
export const SEEDS = {
  POOL: Buffer.from('pool'),
  VAULT: Buffer.from('vault'),
  VERIFICATION_KEY: Buffer.from('vk'),
  COMMITMENT_COUNTER: Buffer.from('commitment_counter'),
  PROTOCOL_CONFIG: Buffer.from('protocol_config'),
  AMM_POOL: Buffer.from('amm_pool'),
  LP_MINT: Buffer.from('lp_mint'),
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
  CONSOLIDATE_3X1: 'consolidate_3x1',
  SWAP: 'swap_swap',
  ADD_LIQUIDITY: 'swap_add_liquidity',
  REMOVE_LIQUIDITY: 'swap_remove_liquidity',
  ORDER_CREATE: 'market_order_create',
  ORDER_FILL: 'market_order_fill',
  ORDER_CANCEL: 'market_order_cancel',
  // Perpetual futures circuits
  PERPS_OPEN_POSITION: 'perps_open_position',
  PERPS_CLOSE_POSITION: 'perps_close_position',
  PERPS_ADD_LIQUIDITY: 'perps_add_liquidity',
  PERPS_REMOVE_LIQUIDITY: 'perps_remove_liquidity',
  PERPS_LIQUIDATE: 'perps_liquidate',
} as const;

/**
 * Pad circuit ID to 32 bytes with underscores
 * Must match on-chain constants.rs format: "transfer_1x2____________________"
 */
export function padCircuitId(id: string): Buffer {
  const padded = id.padEnd(32, '_');
  return Buffer.from(padded);
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

/**
 * Derive protocol config PDA
 */
export function deriveProtocolConfigPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [SEEDS.PROTOCOL_CONFIG],
    programId
  );
}

/**
 * Derive AMM pool PDA from token pair (uses canonical ordering)
 */
export function deriveAmmPoolPda(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  // Canonical ordering: lower pubkey bytes first
  const [first, second] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0
    ? [tokenAMint, tokenBMint]
    : [tokenBMint, tokenAMint];

  return PublicKey.findProgramAddressSync(
    [SEEDS.AMM_POOL, first.toBuffer(), second.toBuffer()],
    programId
  );
}

/**
 * Derive LP mint PDA from token pair (uses canonical ordering)
 */
export function deriveLpMintPda(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  // Canonical ordering: lower pubkey bytes first
  const [first, second] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0
    ? [tokenAMint, tokenBMint]
    : [tokenBMint, tokenAMint];

  return PublicKey.findProgramAddressSync(
    [SEEDS.LP_MINT, first.toBuffer(), second.toBuffer()],
    programId
  );
}
