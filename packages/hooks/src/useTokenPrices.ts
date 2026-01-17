/**
 * Token Prices Hook
 *
 * Provides token price data with automatic caching and refresh.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  TokenPriceFetcher,
  TokenPrice,
  formatPrice,
  formatPriceChange,
} from '@cloakcraft/sdk';

/**
 * Price fetcher singleton (shared across components)
 */
let sharedPriceFetcher: TokenPriceFetcher | null = null;

function getPriceFetcher(): TokenPriceFetcher {
  if (!sharedPriceFetcher) {
    sharedPriceFetcher = new TokenPriceFetcher();
  }
  return sharedPriceFetcher;
}

export interface UseTokenPricesResult {
  /** Map of token mint to price */
  prices: Map<string, TokenPrice>;
  /** Get price for a specific token */
  getPrice: (mint: string | PublicKey) => TokenPrice | undefined;
  /** Get USD value for token amount */
  getUsdValue: (mint: string | PublicKey, amount: bigint, decimals: number) => number;
  /** Whether prices are loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh prices */
  refresh: () => Promise<void>;
  /** SOL price in USD */
  solPrice: number;
  /** Last update timestamp */
  lastUpdated: number | null;
  /** Whether price API is available */
  isAvailable: boolean;
  /** Force retry (reset backoff) */
  forceRetry: () => Promise<void>;
}

/**
 * Hook for fetching token prices
 */
export function useTokenPrices(
  mints: (string | PublicKey)[],
  refreshInterval?: number
): UseTokenPricesResult {
  const [prices, setPrices] = useState<Map<string, TokenPrice>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const fetcher = useRef(getPriceFetcher());

  // Convert mints to strings for comparison
  const mintStrings = useMemo(
    () => mints.map((m) => (typeof m === 'string' ? m : m.toBase58())),
    [mints]
  );

  const fetchPrices = useCallback(async () => {
    if (mintStrings.length === 0) {
      setPrices(new Map());
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const priceMap = await fetcher.current.getPrices(mintStrings);
      setPrices(priceMap);
      setLastUpdated(Date.now());
      setIsAvailable(fetcher.current.isAvailable());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      setIsAvailable(fetcher.current.isAvailable());
    } finally {
      setIsLoading(false);
    }
  }, [mintStrings]);

  const forceRetry = useCallback(async () => {
    fetcher.current.resetBackoff();
    setIsAvailable(true);
    await fetchPrices();
  }, [fetchPrices]);

  // Initial fetch and refresh interval
  useEffect(() => {
    fetchPrices();

    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPrices, refreshInterval]);

  const getPrice = useCallback(
    (mint: string | PublicKey): TokenPrice | undefined => {
      const mintStr = typeof mint === 'string' ? mint : mint.toBase58();
      return prices.get(mintStr);
    },
    [prices]
  );

  const getUsdValue = useCallback(
    (mint: string | PublicKey, amount: bigint, decimals: number): number => {
      const price = getPrice(mint);
      if (!price) return 0;
      const amountNumber = Number(amount) / Math.pow(10, decimals);
      return amountNumber * price.priceUsd;
    },
    [getPrice]
  );

  const solPrice = useMemo(() => {
    const sol = prices.get('So11111111111111111111111111111111111111112');
    return sol?.priceUsd ?? 0;
  }, [prices]);

  return {
    prices,
    getPrice,
    getUsdValue,
    isLoading,
    error,
    refresh: fetchPrices,
    solPrice,
    lastUpdated,
    isAvailable,
    forceRetry,
  };
}

/**
 * Hook for a single token price
 */
export function useTokenPrice(mint: string | PublicKey | null) {
  const mints = useMemo(
    () => (mint ? [mint] : []),
    [mint]
  );

  const { prices, isLoading, error, refresh } = useTokenPrices(mints);

  const price = useMemo(() => {
    if (!mint) return null;
    const mintStr = typeof mint === 'string' ? mint : mint.toBase58();
    return prices.get(mintStr) ?? null;
  }, [mint, prices]);

  return {
    price,
    priceUsd: price?.priceUsd ?? 0,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for SOL price
 */
export function useSolPrice(refreshInterval: number = 60000) {
  const { solPrice, isLoading, error, refresh } = useTokenPrices(
    ['So11111111111111111111111111111111111111112'],
    refreshInterval
  );

  return {
    price: solPrice,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for calculating total portfolio value
 */
export function usePortfolioValue(
  balances: Array<{
    mint: string | PublicKey;
    amount: bigint;
    decimals: number;
  }>
) {
  const mints = useMemo(
    () => balances.map((b) => b.mint),
    [balances]
  );

  const { prices, isLoading, error } = useTokenPrices(mints);

  const totalValue = useMemo(() => {
    let total = 0;
    for (const balance of balances) {
      const mintStr = typeof balance.mint === 'string' ? balance.mint : balance.mint.toBase58();
      const price = prices.get(mintStr);
      if (price) {
        const amountNumber = Number(balance.amount) / Math.pow(10, balance.decimals);
        total += amountNumber * price.priceUsd;
      }
    }
    return total;
  }, [balances, prices]);

  const breakdown = useMemo(() => {
    return balances.map((balance) => {
      const mintStr = typeof balance.mint === 'string' ? balance.mint : balance.mint.toBase58();
      const price = prices.get(mintStr);
      const amountNumber = Number(balance.amount) / Math.pow(10, balance.decimals);
      const value = price ? amountNumber * price.priceUsd : 0;
      const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;

      return {
        mint: mintStr,
        amount: balance.amount,
        decimals: balance.decimals,
        priceUsd: price?.priceUsd ?? 0,
        valueUsd: value,
        percentage,
      };
    });
  }, [balances, prices, totalValue]);

  return {
    totalValue,
    breakdown,
    isLoading,
    error,
  };
}

// Re-export utilities
export { formatPrice, formatPriceChange } from '@cloakcraft/sdk';
export type { TokenPrice } from '@cloakcraft/sdk';
