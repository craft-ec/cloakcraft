/**
 * Protocol Fee Utilities
 *
 * Handles fee calculation and estimation for CloakCraft operations.
 *
 * Fee Operations (charged):
 * - transfer: Private → private transfers (0.1% suggested)
 * - unshield: Private → public withdrawals (0.25% suggested)
 * - swap: Protocol takes 20% of LP fees (e.g., 0.3% LP fee → 0.06% protocol fee)
 * - remove_liquidity: LP token withdrawals (0.25% suggested)
 *
 * Free Operations (add value to protocol):
 * - shield: Adding tokens to privacy pool
 * - add_liquidity: Providing LP capital
 * - consolidate: Reorganizing user's own notes
 * - stake: Locking tokens for security (future)
 * - vote: Governance participation (future)
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, deriveProtocolConfigPda as deriveConfigPda } from './instructions/constants';

/**
 * Fee-able operation types
 */
export type FeeableOperation = 'transfer' | 'unshield' | 'swap' | 'remove_liquidity';

/**
 * Free operation types (no fees)
 */
export type FreeOperation = 'shield' | 'add_liquidity' | 'consolidate' | 'stake' | 'vote';

/**
 * All operation types
 */
export type OperationType = FeeableOperation | FreeOperation;

/**
 * Protocol fee configuration
 */
export interface ProtocolFeeConfig {
  /** Authority that can update fees */
  authority: PublicKey;
  /** Treasury receiving fees */
  treasury: PublicKey;
  /** Transfer fee in basis points (10 = 0.1%) */
  transferFeeBps: number;
  /** Unshield fee in basis points (25 = 0.25%) */
  unshieldFeeBps: number;
  /** Protocol's share of LP swap fees in basis points (2000 = 20%) */
  swapFeeShareBps: number;
  /** Remove liquidity fee in basis points (25 = 0.25%) */
  removeLiquidityFeeBps: number;
  /** Whether fees are enabled */
  feesEnabled: boolean;
}

/**
 * Fee calculation result
 */
export interface FeeCalculation {
  /** Original amount before fees */
  amount: bigint;
  /** Fee amount to pay */
  feeAmount: bigint;
  /** Amount after fee deduction */
  amountAfterFee: bigint;
  /** Fee rate in basis points */
  feeBps: number;
  /** Whether this operation is free */
  isFree: boolean;
}

/**
 * Default fee configuration (suggested rates)
 */
export const DEFAULT_FEE_CONFIG: Omit<ProtocolFeeConfig, 'authority' | 'treasury'> = {
  transferFeeBps: 10,         // 0.1%
  unshieldFeeBps: 25,         // 0.25%
  swapFeeShareBps: 2000,      // 20% of LP fees
  removeLiquidityFeeBps: 25,  // 0.25%
  feesEnabled: true,
};

/**
 * Maximum fee in basis points (10%)
 */
export const MAX_FEE_BPS = 1000;

/**
 * Basis points divisor
 */
export const BPS_DIVISOR = 10000n;

/**
 * Check if an operation is free (no fees)
 */
export function isFreeOperation(operation: OperationType): operation is FreeOperation {
  return ['shield', 'add_liquidity', 'consolidate', 'stake', 'vote'].includes(operation);
}

/**
 * Check if an operation requires fees
 */
export function isFeeableOperation(operation: OperationType): operation is FeeableOperation {
  return ['transfer', 'unshield', 'swap', 'remove_liquidity'].includes(operation);
}

/**
 * Calculate protocol fee for an operation
 *
 * @param amount - The amount to calculate fee for
 * @param operation - The operation type
 * @param config - Protocol fee configuration (or null if not fetched)
 * @returns Fee calculation result
 */
export function calculateProtocolFee(
  amount: bigint,
  operation: OperationType,
  config: ProtocolFeeConfig | null
): FeeCalculation {
  // Free operations have no fee
  if (isFreeOperation(operation)) {
    return {
      amount,
      feeAmount: 0n,
      amountAfterFee: amount,
      feeBps: 0,
      isFree: true,
    };
  }

  // If config is null or fees disabled, no fee
  if (!config || !config.feesEnabled) {
    return {
      amount,
      feeAmount: 0n,
      amountAfterFee: amount,
      feeBps: 0,
      isFree: false,
    };
  }

  // Get fee rate for operation
  const feeBps = getFeeBps(operation, config);

  // Calculate fee: (amount * feeBps) / 10000
  const feeAmount = (amount * BigInt(feeBps)) / BPS_DIVISOR;
  const amountAfterFee = amount - feeAmount;

  return {
    amount,
    feeAmount,
    amountAfterFee,
    feeBps,
    isFree: false,
  };
}

/**
 * Get fee basis points for an operation (except swap which uses share of LP fees)
 */
export function getFeeBps(operation: FeeableOperation, config: ProtocolFeeConfig): number {
  switch (operation) {
    case 'transfer':
      return config.transferFeeBps;
    case 'unshield':
      return config.unshieldFeeBps;
    case 'swap':
      // For swap, use calculateSwapProtocolFee instead
      // This returns 0 as swaps use percentage of LP fee, not fixed rate
      return 0;
    case 'remove_liquidity':
      return config.removeLiquidityFeeBps;
    default:
      return 0;
  }
}

/**
 * Calculate swap protocol fee (20% of LP fees)
 *
 * @param swapAmount - Amount being swapped
 * @param lpFeeBps - Pool's LP fee in basis points (e.g., 30 = 0.3%)
 * @param config - Protocol fee configuration
 * @returns Object with protocol fee and remaining LP fee
 */
export function calculateSwapProtocolFee(
  swapAmount: bigint,
  lpFeeBps: number,
  config: ProtocolFeeConfig | null
): {
  protocolFee: bigint;
  lpFeeRemaining: bigint;
  totalLpFee: bigint;
  effectiveFeeBps: number;
} {
  // If no config or fees disabled, all LP fee stays in pool
  if (!config || !config.feesEnabled || config.swapFeeShareBps === 0 || lpFeeBps === 0) {
    const totalLpFee = (swapAmount * BigInt(lpFeeBps)) / BPS_DIVISOR;
    return {
      protocolFee: 0n,
      lpFeeRemaining: totalLpFee,
      totalLpFee,
      effectiveFeeBps: 0,
    };
  }

  // Calculate total LP fee first
  const totalLpFee = (swapAmount * BigInt(lpFeeBps)) / BPS_DIVISOR;

  // Protocol takes swapFeeShareBps% of the LP fee
  const protocolFee = (totalLpFee * BigInt(config.swapFeeShareBps)) / BPS_DIVISOR;

  // Remaining LP fee stays in pool
  const lpFeeRemaining = totalLpFee - protocolFee;

  // Calculate effective fee rate for display
  // effectiveFeeBps = lpFeeBps * swapFeeShareBps / 10000
  const effectiveFeeBps = Math.floor((lpFeeBps * config.swapFeeShareBps) / 10000);

  return {
    protocolFee,
    lpFeeRemaining,
    totalLpFee,
    effectiveFeeBps,
  };
}

/**
 * Calculate minimum fee required (rounds up to ensure sufficient fee)
 *
 * @param amount - The amount to calculate fee for
 * @param feeBps - Fee rate in basis points
 * @returns Minimum fee amount
 */
export function calculateMinimumFee(amount: bigint, feeBps: number): bigint {
  if (feeBps === 0) return 0n;

  // Round up: (amount * feeBps + 9999) / 10000
  const numerator = amount * BigInt(feeBps) + (BPS_DIVISOR - 1n);
  return numerator / BPS_DIVISOR;
}

/**
 * Verify that a fee amount meets minimum requirements
 *
 * @param amount - The amount the fee is calculated from
 * @param feeAmount - The fee amount to verify
 * @param feeBps - Expected fee rate in basis points
 * @returns True if fee is sufficient
 */
export function verifyFeeAmount(amount: bigint, feeAmount: bigint, feeBps: number): boolean {
  if (feeBps === 0) return true;
  const minFee = calculateMinimumFee(amount, feeBps);
  return feeAmount >= minFee;
}


/**
 * Fetch protocol fee configuration from on-chain account
 *
 * @param connection - Solana connection
 * @param programId - Program ID
 * @returns Protocol fee config or null if not initialized
 */
export async function fetchProtocolFeeConfig(
  connection: Connection,
  programId: PublicKey = PROGRAM_ID
): Promise<ProtocolFeeConfig | null> {
  const [configPda] = deriveConfigPda(programId);

  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    return null;
  }

  // Parse account data (skip 8-byte discriminator)
  const data = accountInfo.data.slice(8);

  // Parse fields according to ProtocolConfig struct layout
  let offset = 0;

  // authority: Pubkey (32 bytes)
  const authority = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // treasury: Pubkey (32 bytes)
  const treasury = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // transfer_fee_bps: u16 (2 bytes, little-endian)
  const transferFeeBps = data.readUInt16LE(offset);
  offset += 2;

  // unshield_fee_bps: u16 (2 bytes, little-endian)
  const unshieldFeeBps = data.readUInt16LE(offset);
  offset += 2;

  // swap_fee_share_bps: u16 (2 bytes, little-endian)
  const swapFeeShareBps = data.readUInt16LE(offset);
  offset += 2;

  // remove_liquidity_fee_bps: u16 (2 bytes, little-endian)
  const removeLiquidityFeeBps = data.readUInt16LE(offset);
  offset += 2;

  // fees_enabled: bool (1 byte)
  const feesEnabled = data[offset] === 1;

  return {
    authority,
    treasury,
    transferFeeBps,
    unshieldFeeBps,
    swapFeeShareBps,
    removeLiquidityFeeBps,
    feesEnabled,
  };
}

/**
 * Format fee amount for display
 *
 * @param feeAmount - Fee amount in smallest units
 * @param decimals - Token decimals
 * @returns Formatted string
 */
export function formatFeeAmount(feeAmount: bigint, decimals: number): string {
  const divisor = BigInt(10 ** decimals);
  const whole = feeAmount / divisor;
  const fraction = feeAmount % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  // Trim trailing zeros
  const trimmed = fractionStr.replace(/0+$/, '');
  return `${whole}.${trimmed}`;
}

/**
 * Format fee rate for display
 *
 * @param feeBps - Fee rate in basis points
 * @returns Formatted percentage string
 */
export function formatFeeRate(feeBps: number): string {
  const percent = feeBps / 100;
  return `${percent}%`;
}

/**
 * Estimate total cost including fees
 *
 * @param amount - The amount to transfer/withdraw
 * @param operation - The operation type
 * @param config - Protocol fee configuration
 * @returns Object with breakdown
 */
export function estimateTotalCost(
  amount: bigint,
  operation: OperationType,
  config: ProtocolFeeConfig | null
): {
  amount: bigint;
  fee: bigint;
  total: bigint;
  feeRate: string;
} {
  const feeCalc = calculateProtocolFee(amount, operation, config);

  return {
    amount,
    fee: feeCalc.feeAmount,
    total: amount + feeCalc.feeAmount,
    feeRate: formatFeeRate(feeCalc.feeBps),
  };
}
