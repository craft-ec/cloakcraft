/**
 * Pool Analytics Hook
 *
 * Provides pool statistics, TVL, and user position data.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  PoolAnalyticsCalculator,
  PoolStats,
  PoolAnalytics,
  UserPoolPosition,
  TokenPriceFetcher,
  formatTvl,
  formatApy,
  formatShare,
} from '@cloakcraft/sdk';
import type { AmmPoolState } from '@cloakcraft/types';
import { useCloakCraft } from './provider';
import { useAmmPools } from './useSwap';

/**
 * Shared analytics calculator
 */
let sharedCalculator: PoolAnalyticsCalculator | null = null;

function getCalculator(): PoolAnalyticsCalculator {
  if (!sharedCalculator) {
    sharedCalculator = new PoolAnalyticsCalculator();
  }
  return sharedCalculator;
}

export interface UsePoolAnalyticsResult {
  /** Pool analytics data */
  analytics: PoolAnalytics | null;
  /** Total TVL across all pools */
  totalTvl: number;
  /** Formatted total TVL */
  formattedTvl: string;
  /** Number of pools */
  poolCount: number;
  /** Individual pool stats */
  poolStats: PoolStats[];
  /** Whether loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh analytics */
  refresh: () => Promise<void>;
  /** Last update timestamp */
  lastUpdated: number | null;
}

/**
 * Hook for overall pool analytics
 */
export function usePoolAnalytics(
  decimalsMap?: Map<string, number>,
  refreshInterval?: number
): UsePoolAnalyticsResult {
  const { pools, isLoading: poolsLoading, refresh: refreshPools } = useAmmPools();
  const [analytics, setAnalytics] = useState<PoolAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const calculator = useRef(getCalculator());

  const calculateAnalytics = useCallback(async () => {
    if (pools.length === 0) {
      setAnalytics(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await calculator.current.calculateAnalytics(pools, decimalsMap);
      setAnalytics(result);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate analytics');
    } finally {
      setIsLoading(false);
    }
  }, [pools, decimalsMap]);

  // Calculate on pools change
  useEffect(() => {
    if (!poolsLoading) {
      calculateAnalytics();
    }
  }, [pools, poolsLoading, calculateAnalytics]);

  // Refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshPools();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshPools]);

  const refresh = useCallback(async () => {
    await refreshPools();
    await calculateAnalytics();
  }, [refreshPools, calculateAnalytics]);

  return {
    analytics,
    totalTvl: analytics?.totalTvlUsd ?? 0,
    formattedTvl: formatTvl(analytics?.totalTvlUsd ?? 0),
    poolCount: analytics?.poolCount ?? 0,
    poolStats: analytics?.pools ?? [],
    isLoading: isLoading || poolsLoading,
    error,
    refresh,
    lastUpdated,
  };
}

export interface UsePoolStatsResult {
  /** Pool statistics */
  stats: PoolStats | null;
  /** Whether loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh stats */
  refresh: () => Promise<void>;
}

/**
 * Hook for single pool statistics
 */
export function usePoolStats(
  pool: (AmmPoolState & { address: PublicKey }) | null,
  tokenADecimals: number = 9,
  tokenBDecimals: number = 9
): UsePoolStatsResult {
  const [stats, setStats] = useState<PoolStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const calculator = useRef(getCalculator());

  const calculateStats = useCallback(async () => {
    if (!pool) {
      setStats(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await calculator.current.calculatePoolStats(
        pool,
        tokenADecimals,
        tokenBDecimals
      );
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate stats');
    } finally {
      setIsLoading(false);
    }
  }, [pool, tokenADecimals, tokenBDecimals]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  return {
    stats,
    isLoading,
    error,
    refresh: calculateStats,
  };
}

export interface UseUserPositionResult {
  /** User's position in the pool */
  position: UserPoolPosition | null;
  /** LP balance */
  lpBalance: bigint;
  /** Share percentage */
  sharePercent: number;
  /** Position value in USD */
  valueUsd: number;
  /** Whether loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh position */
  refresh: () => Promise<void>;
}

/**
 * Hook for user's position in a pool
 */
export function useUserPosition(
  pool: (AmmPoolState & { address: PublicKey }) | null,
  lpBalance: bigint,
  tokenADecimals: number = 9,
  tokenBDecimals: number = 9
): UseUserPositionResult {
  const [position, setPosition] = useState<UserPoolPosition | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const calculator = useRef(getCalculator());

  const calculatePosition = useCallback(async () => {
    if (!pool || lpBalance === 0n) {
      setPosition(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await calculator.current.calculateUserPosition(
        pool,
        lpBalance,
        tokenADecimals,
        tokenBDecimals
      );
      setPosition(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate position');
    } finally {
      setIsLoading(false);
    }
  }, [pool, lpBalance, tokenADecimals, tokenBDecimals]);

  useEffect(() => {
    calculatePosition();
  }, [calculatePosition]);

  return {
    position,
    lpBalance,
    sharePercent: position?.sharePercent ?? 0,
    valueUsd: position?.valueUsd ?? 0,
    isLoading,
    error,
    refresh: calculatePosition,
  };
}

/**
 * Hook for impermanent loss calculation
 */
export function useImpermanentLoss(
  initialPriceRatio: number,
  currentPriceRatio: number
) {
  const calculator = useRef(getCalculator());

  const impermanentLoss = useMemo(() => {
    return calculator.current.calculateImpermanentLoss(
      initialPriceRatio,
      currentPriceRatio
    );
  }, [initialPriceRatio, currentPriceRatio]);

  const formattedLoss = useMemo(() => {
    return `${impermanentLoss.toFixed(2)}%`;
  }, [impermanentLoss]);

  return {
    impermanentLoss,
    formattedLoss,
  };
}

// Re-export utilities
export { formatTvl, formatApy, formatShare } from '@cloakcraft/sdk';
export type { PoolStats, PoolAnalytics, UserPoolPosition } from '@cloakcraft/sdk';
