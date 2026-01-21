/**
 * AMM Pool Management
 *
 * Functions for fetching and managing AMM pool state
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { keccak_256 } from '@noble/hashes/sha3';
import { PoolType } from '@cloakcraft/types';
import type { AmmPoolState } from '@cloakcraft/types';
import { deriveAmmPoolPda } from '../instructions/constants';

/**
 * Fetch AMM pool state from on-chain account
 *
 * @param connection - Solana connection
 * @param ammPoolPda - AMM pool PDA address
 * @returns AMM pool state
 */
export async function fetchAmmPool(
  connection: Connection,
  ammPoolPda: PublicKey
): Promise<AmmPoolState> {
  const accountInfo = await connection.getAccountInfo(ammPoolPda);
  if (!accountInfo) {
    throw new Error(`AMM pool account not found: ${ammPoolPda.toBase58()}`);
  }

  const data = accountInfo.data;
  return deserializeAmmPool(data);
}

/**
 * Deserialize AMM pool account data
 *
 * Layout (matching Rust struct):
 * - discriminator: 8 bytes
 * - pool_id: 32 bytes (Pubkey)
 * - token_a_mint: 32 bytes (Pubkey)
 * - token_b_mint: 32 bytes (Pubkey)
 * - lp_mint: 32 bytes (Pubkey)
 * - state_hash: 32 bytes ([u8; 32])
 * - reserve_a: 8 bytes (u64 LE)
 * - reserve_b: 8 bytes (u64 LE)
 * - lp_supply: 8 bytes (u64 LE)
 * - fee_bps: 2 bytes (u16 LE)
 * - authority: 32 bytes (Pubkey)
 * - is_active: 1 byte (bool)
 * - bump: 1 byte (u8)
 * - lp_mint_bump: 1 byte (u8)
 * - pool_type: 1 byte (enum: 0=ConstantProduct, 1=StableSwap)
 * - amplification: 8 bytes (u64 LE)
 *
 * @param data - Raw account data
 * @returns Deserialized AMM pool state
 */
export function deserializeAmmPool(data: Buffer): AmmPoolState {
  // Skip 8-byte discriminator
  let offset = 8;

  const poolId = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const tokenAMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const tokenBMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const lpMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const stateHash = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;

  const view = new DataView(data.buffer, data.byteOffset + offset);
  const reserveA = view.getBigUint64(0, true); // little-endian
  const reserveB = view.getBigUint64(8, true);
  const lpSupply = view.getBigUint64(16, true);
  const feeBps = view.getUint16(24, true);
  offset += 26; // 8 + 8 + 8 + 2

  const authority = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const isActive = data[offset] === 1;
  offset += 1;

  const bump = data[offset];
  offset += 1;

  const lpMintBump = data[offset];
  offset += 1;

  // New fields for StableSwap support
  const poolTypeValue = data[offset];
  const poolType = poolTypeValue === 1 ? PoolType.StableSwap : PoolType.ConstantProduct;
  offset += 1;

  const view2 = new DataView(data.buffer, data.byteOffset + offset);
  const amplification = view2.getBigUint64(0, true);

  return {
    poolId,
    tokenAMint,
    tokenBMint,
    lpMint,
    stateHash,
    reserveA,
    reserveB,
    lpSupply,
    feeBps,
    authority,
    isActive,
    bump,
    lpMintBump,
    poolType,
    amplification,
  };
}

/**
 * Compute AMM state hash (matches on-chain compute_state_hash)
 *
 * State hash = keccak256(reserve_a_le || reserve_b_le || lp_supply_le || pool_id)
 *
 * @param reserveA - Reserve of token A
 * @param reserveB - Reserve of token B
 * @param lpSupply - Total LP token supply
 * @param poolId - AMM pool ID (Pubkey)
 * @returns State hash (32 bytes)
 */
export function computeAmmStateHash(
  reserveA: bigint,
  reserveB: bigint,
  lpSupply: bigint,
  poolId: PublicKey
): Uint8Array {
  // On-chain layout (56 bytes total):
  // - reserve_a: 8 bytes (u64 LE)
  // - reserve_b: 8 bytes (u64 LE)
  // - lp_supply: 8 bytes (u64 LE)
  // - pool_id: 32 bytes
  const data = new Uint8Array(56);
  const view = new DataView(data.buffer);

  // Write reserves and LP supply as little-endian u64
  view.setBigUint64(0, reserveA, true);
  view.setBigUint64(8, reserveB, true);
  view.setBigUint64(16, lpSupply, true);

  // Write pool_id (32 bytes starting at offset 24)
  data.set(poolId.toBytes(), 24);

  // Keccak256 hash
  return keccak_256(data);
}

/**
 * Check if AMM pool exists
 *
 * @param connection - Solana connection
 * @param tokenAMint - Token A mint address
 * @param tokenBMint - Token B mint address
 * @param programId - CloakCraft program ID
 * @returns True if pool exists
 */
export async function ammPoolExists(
  connection: Connection,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  programId: PublicKey
): Promise<boolean> {
  const [poolPda] = deriveAmmPoolPda(tokenAMint, tokenBMint, programId);
  const accountInfo = await connection.getAccountInfo(poolPda);
  return accountInfo !== null;
}

/**
 * Get or create AMM pool (fetch if exists, return null if not)
 *
 * @param connection - Solana connection
 * @param tokenAMint - Token A mint address
 * @param tokenBMint - Token B mint address
 * @param programId - CloakCraft program ID
 * @returns AMM pool state or null if doesn't exist
 */
export async function getAmmPool(
  connection: Connection,
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  programId: PublicKey
): Promise<AmmPoolState | null> {
  const [poolPda] = deriveAmmPoolPda(tokenAMint, tokenBMint, programId);

  try {
    return await fetchAmmPool(connection, poolPda);
  } catch (error) {
    // Pool doesn't exist
    return null;
  }
}

/**
 * Refresh AMM pool state
 *
 * @param connection - Solana connection
 * @param pool - Existing pool state
 * @returns Updated pool state
 */
export async function refreshAmmPool(
  connection: Connection,
  pool: AmmPoolState
): Promise<AmmPoolState> {
  return fetchAmmPool(connection, pool.poolId);
}

/**
 * Verify AMM state hash matches reserves
 *
 * @param pool - AMM pool state
 * @returns True if state hash is valid
 */
export function verifyAmmStateHash(pool: AmmPoolState): boolean {
  const computedHash = computeAmmStateHash(
    pool.reserveA,
    pool.reserveB,
    pool.lpSupply,
    pool.poolId
  );

  // Compare hashes
  if (computedHash.length !== pool.stateHash.length) {
    return false;
  }

  for (let i = 0; i < computedHash.length; i++) {
    if (computedHash[i] !== pool.stateHash[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Format AMM pool for display
 *
 * @param pool - AMM pool state
 * @param decimalsA - Token A decimals (default 9)
 * @param decimalsB - Token B decimals (default 9)
 * @returns Formatted pool data
 */
export function formatAmmPool(
  pool: AmmPoolState,
  decimalsA: number = 9,
  decimalsB: number = 9
) {
  const reserveAFormatted = Number(pool.reserveA) / Math.pow(10, decimalsA);
  const reserveBFormatted = Number(pool.reserveB) / Math.pow(10, decimalsB);
  const lpSupplyFormatted = Number(pool.lpSupply) / Math.pow(10, 9); // LP tokens always 9 decimals

  const priceRatio = pool.reserveA > 0n
    ? (Number(pool.reserveB) / Number(pool.reserveA)) * Math.pow(10, decimalsA - decimalsB)
    : 0;

  return {
    poolId: pool.poolId.toBase58(),
    tokenAMint: pool.tokenAMint.toBase58(),
    tokenBMint: pool.tokenBMint.toBase58(),
    lpMint: pool.lpMint.toBase58(),
    reserveA: reserveAFormatted,
    reserveB: reserveBFormatted,
    lpSupply: lpSupplyFormatted,
    priceRatio, // Token B per Token A
    feeBps: pool.feeBps,
    feePercent: pool.feeBps / 100,
    isActive: pool.isActive,
  };
}
