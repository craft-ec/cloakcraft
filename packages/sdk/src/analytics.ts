/**
 * Pool Analytics Module
 *
 * Calculates and tracks AMM pool statistics, TVL, volume, and APY.
 */

import { PublicKey, Connection } from '@solana/web3.js';
import type { AmmPoolState } from '@cloakcraft/types';
import { TokenPriceFetcher } from './prices';

/**
 * Pool statistics
 */
export interface PoolStats {
  /** Pool address */
  poolAddress: string;
  /** Token A mint */
  tokenAMint: string;
  /** Token B mint */
  tokenBMint: string;
  /** Token A reserve */
  reserveA: bigint;
  /** Token B reserve */
  reserveB: bigint;
  /** LP token supply */
  lpSupply: bigint;
  /** Total Value Locked in USD */
  tvlUsd: number;
  /** Token A price in USD */
  tokenAPrice: number;
  /** Token B price in USD */
  tokenBPrice: number;
  /** Token A value in USD */
  tokenAValueUsd: number;
  /** Token B value in USD */
  tokenBValueUsd: number;
  /** Exchange rate (B per A) */
  rateAToB: number;
  /** Exchange rate (A per B) */
  rateBToA: number;
  /** Fee in basis points */
  feeBps: number;
  /** LP token price in USD */
  lpTokenPriceUsd: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * User's position in a pool
 */
export interface UserPoolPosition {
  /** Pool address */
  poolAddress: string;
  /** LP token balance */
  lpBalance: bigint;
  /** LP balance as percentage of total supply */
  sharePercent: number;
  /** Underlying token A amount */
  tokenAAmount: bigint;
  /** Underlying token B amount */
  tokenBAmount: bigint;
  /** Position value in USD */
  valueUsd: number;
}

/**
 * Pool analytics aggregator
 */
export interface PoolAnalytics {
  /** Total TVL across all pools */
  totalTvlUsd: number;
  /** Number of active pools */
  poolCount: number;
  /** Individual pool stats */
  pools: PoolStats[];
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Pool analytics calculator
 */
export class PoolAnalyticsCalculator {
  private priceFetcher: TokenPriceFetcher;

  constructor(priceFetcher?: TokenPriceFetcher) {
    this.priceFetcher = priceFetcher || new TokenPriceFetcher();
  }

  /**
   * Calculate statistics for a single pool
   */
  async calculatePoolStats(
    pool: AmmPoolState & { address: PublicKey },
    tokenADecimals: number = 9,
    tokenBDecimals: number = 9
  ): Promise<PoolStats> {
    // Fetch prices
    const prices = await this.priceFetcher.getPrices([
      pool.tokenAMint,
      pool.tokenBMint,
    ]);

    const tokenAPrice = prices.get(pool.tokenAMint.toBase58())?.priceUsd ?? 0;
    const tokenBPrice = prices.get(pool.tokenBMint.toBase58())?.priceUsd ?? 0;

    // Calculate USD values
    const tokenAValueUsd =
      (Number(pool.reserveA) / Math.pow(10, tokenADecimals)) * tokenAPrice;
    const tokenBValueUsd =
      (Number(pool.reserveB) / Math.pow(10, tokenBDecimals)) * tokenBPrice;
    const tvlUsd = tokenAValueUsd + tokenBValueUsd;

    // Calculate exchange rates
    const rateAToB =
      pool.reserveA > 0n
        ? (Number(pool.reserveB) / Number(pool.reserveA)) *
          Math.pow(10, tokenADecimals - tokenBDecimals)
        : 0;
    const rateBToA = rateAToB > 0 ? 1 / rateAToB : 0;

    // Calculate LP token price
    const lpTokenPriceUsd =
      pool.lpSupply > 0n ? tvlUsd / (Number(pool.lpSupply) / 1e9) : 0;

    return {
      poolAddress: pool.address.toBase58(),
      tokenAMint: pool.tokenAMint.toBase58(),
      tokenBMint: pool.tokenBMint.toBase58(),
      reserveA: pool.reserveA,
      reserveB: pool.reserveB,
      lpSupply: pool.lpSupply,
      tvlUsd,
      tokenAPrice,
      tokenBPrice,
      tokenAValueUsd,
      tokenBValueUsd,
      rateAToB,
      rateBToA,
      feeBps: pool.feeBps,
      lpTokenPriceUsd,
      updatedAt: Date.now(),
    };
  }

  /**
   * Calculate statistics for multiple pools
   */
  async calculateAnalytics(
    pools: Array<AmmPoolState & { address: PublicKey }>,
    decimalsMap?: Map<string, number>
  ): Promise<PoolAnalytics> {
    const poolStats: PoolStats[] = [];
    let totalTvlUsd = 0;

    for (const pool of pools) {
      const decimalsA = decimalsMap?.get(pool.tokenAMint.toBase58()) ?? 9;
      const decimalsB = decimalsMap?.get(pool.tokenBMint.toBase58()) ?? 9;

      const stats = await this.calculatePoolStats(pool, decimalsA, decimalsB);
      poolStats.push(stats);
      totalTvlUsd += stats.tvlUsd;
    }

    return {
      totalTvlUsd,
      poolCount: pools.length,
      pools: poolStats,
      updatedAt: Date.now(),
    };
  }

  /**
   * Calculate user's position in a pool
   */
  async calculateUserPosition(
    pool: AmmPoolState & { address: PublicKey },
    lpBalance: bigint,
    tokenADecimals: number = 9,
    tokenBDecimals: number = 9
  ): Promise<UserPoolPosition> {
    // Calculate share percentage
    const sharePercent =
      pool.lpSupply > 0n
        ? (Number(lpBalance) / Number(pool.lpSupply)) * 100
        : 0;

    // Calculate underlying token amounts
    const tokenAAmount =
      pool.lpSupply > 0n
        ? (lpBalance * pool.reserveA) / pool.lpSupply
        : 0n;
    const tokenBAmount =
      pool.lpSupply > 0n
        ? (lpBalance * pool.reserveB) / pool.lpSupply
        : 0n;

    // Get prices and calculate USD value
    const prices = await this.priceFetcher.getPrices([
      pool.tokenAMint,
      pool.tokenBMint,
    ]);

    const tokenAPrice = prices.get(pool.tokenAMint.toBase58())?.priceUsd ?? 0;
    const tokenBPrice = prices.get(pool.tokenBMint.toBase58())?.priceUsd ?? 0;

    const valueUsd =
      (Number(tokenAAmount) / Math.pow(10, tokenADecimals)) * tokenAPrice +
      (Number(tokenBAmount) / Math.pow(10, tokenBDecimals)) * tokenBPrice;

    return {
      poolAddress: pool.address.toBase58(),
      lpBalance,
      sharePercent,
      tokenAAmount,
      tokenBAmount,
      valueUsd,
    };
  }

  /**
   * Calculate impermanent loss percentage
   */
  calculateImpermanentLoss(
    initialPriceRatio: number,
    currentPriceRatio: number
  ): number {
    if (initialPriceRatio <= 0 || currentPriceRatio <= 0) return 0;

    const priceRatioChange = currentPriceRatio / initialPriceRatio;
    const sqrtRatio = Math.sqrt(priceRatioChange);

    // IL formula: 2 * sqrt(price_ratio) / (1 + price_ratio) - 1
    const il = (2 * sqrtRatio) / (1 + priceRatioChange) - 1;

    // Return as positive percentage
    return Math.abs(il) * 100;
  }

  /**
   * Estimate APY based on fee income (simplified)
   * Note: This is an estimate and would need historical volume data for accuracy
   */
  estimateApy(
    feeBps: number,
    estimatedDailyVolumeUsd: number,
    tvlUsd: number
  ): number {
    if (tvlUsd <= 0) return 0;

    // Daily fee income
    const dailyFeeIncome = (estimatedDailyVolumeUsd * feeBps) / 10000;

    // Daily yield
    const dailyYield = dailyFeeIncome / tvlUsd;

    // Annualized (compound)
    const apy = (Math.pow(1 + dailyYield, 365) - 1) * 100;

    return apy;
  }
}

/**
 * Format TVL for display
 */
export function formatTvl(tvlUsd: number): string {
  if (tvlUsd === 0) return '$0';

  if (tvlUsd >= 1000000000) {
    return `$${(tvlUsd / 1000000000).toFixed(2)}B`;
  }

  if (tvlUsd >= 1000000) {
    return `$${(tvlUsd / 1000000).toFixed(2)}M`;
  }

  if (tvlUsd >= 1000) {
    return `$${(tvlUsd / 1000).toFixed(2)}K`;
  }

  return `$${tvlUsd.toFixed(2)}`;
}

/**
 * Format APY for display
 */
export function formatApy(apy: number): string {
  if (apy === 0) return '0%';

  if (apy >= 10000) {
    return `${(apy / 1000).toFixed(1)}K%`;
  }

  if (apy >= 100) {
    return `${apy.toFixed(0)}%`;
  }

  return `${apy.toFixed(2)}%`;
}

/**
 * Format share percentage for display
 */
export function formatShare(sharePercent: number): string {
  if (sharePercent === 0) return '0%';

  if (sharePercent < 0.01) {
    return '<0.01%';
  }

  if (sharePercent < 1) {
    return `${sharePercent.toFixed(4)}%`;
  }

  return `${sharePercent.toFixed(2)}%`;
}

/**
 * Calculate constant product invariant
 */
export function calculateInvariant(reserveA: bigint, reserveB: bigint): bigint {
  return reserveA * reserveB;
}

/**
 * Verify constant product invariant is maintained (with tolerance for fees)
 */
export function verifyInvariant(
  oldReserveA: bigint,
  oldReserveB: bigint,
  newReserveA: bigint,
  newReserveB: bigint,
  feeBps: number
): boolean {
  const oldK = oldReserveA * oldReserveB;
  const newK = newReserveA * newReserveB;

  // New K should be >= old K (fees are added to reserves)
  return newK >= oldK;
}
