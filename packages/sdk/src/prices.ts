/**
 * Token Price Module
 *
 * Fetches token prices from Jupiter Price API (free, no API key required).
 * Includes caching to minimize API calls.
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Token price data
 */
export interface TokenPrice {
  /** Token mint address */
  mint: string;
  /** Price in USD */
  priceUsd: number;
  /** 24h price change percentage */
  change24h?: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Price cache entry
 */
interface PriceCacheEntry {
  price: TokenPrice;
  expiresAt: number;
}

/**
 * Jupiter Price API response
 */
interface JupiterPriceResponse {
  data: Record<string, {
    id: string;
    mintSymbol: string;
    vsToken: string;
    vsTokenSymbol: string;
    price: number;
  }>;
  timeTaken: number;
}

/**
 * Default cache TTL (60 seconds)
 */
const DEFAULT_CACHE_TTL = 60 * 1000;

/**
 * Error backoff duration (5 minutes) - don't retry if API is down
 */
const ERROR_BACKOFF_MS = 5 * 60 * 1000;

/**
 * Jupiter Price API endpoint
 */
const JUPITER_PRICE_API = 'https://price.jup.ag/v6/price';

/**
 * SOL mint address (native)
 */
const SOL_MINT = 'So11111111111111111111111111111111111111112';

/**
 * USDC mint address (for reference pricing)
 */
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

/**
 * Token price fetcher
 */
export class TokenPriceFetcher {
  private cache: Map<string, PriceCacheEntry> = new Map();
  private cacheTtl: number;
  private pendingRequests: Map<string, Promise<TokenPrice | null>> = new Map();
  private apiUnavailableUntil: number = 0;
  private consecutiveErrors: number = 0;

  constructor(cacheTtlMs: number = DEFAULT_CACHE_TTL) {
    this.cacheTtl = cacheTtlMs;
  }

  /**
   * Check if API is currently in backoff state
   */
  private isApiUnavailable(): boolean {
    return Date.now() < this.apiUnavailableUntil;
  }

  /**
   * Mark API as unavailable for backoff period
   */
  private markApiUnavailable(): void {
    this.consecutiveErrors++;
    // Exponential backoff: 5min, 10min, 20min, max 30min
    const backoffMs = Math.min(ERROR_BACKOFF_MS * Math.pow(2, this.consecutiveErrors - 1), 30 * 60 * 1000);
    this.apiUnavailableUntil = Date.now() + backoffMs;
    console.warn(`[TokenPriceFetcher] API unavailable, backing off for ${backoffMs / 1000}s`);
  }

  /**
   * Mark API as available (reset backoff)
   */
  private markApiAvailable(): void {
    this.consecutiveErrors = 0;
    this.apiUnavailableUntil = 0;
  }

  /**
   * Get price for a single token
   */
  async getPrice(mint: string | PublicKey): Promise<TokenPrice | null> {
    const mintStr = typeof mint === 'string' ? mint : mint.toBase58();

    // Check cache first
    const cached = this.getCached(mintStr);
    if (cached) return cached;

    // Don't fetch if API is in backoff
    if (this.isApiUnavailable()) {
      return null;
    }

    // Check if there's already a pending request for this mint
    const pending = this.pendingRequests.get(mintStr);
    if (pending) return pending;

    // Create new request
    const request = this.fetchPrice(mintStr);
    this.pendingRequests.set(mintStr, request);

    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(mintStr);
    }
  }

  /**
   * Get prices for multiple tokens
   */
  async getPrices(mints: (string | PublicKey)[]): Promise<Map<string, TokenPrice>> {
    const mintStrs = mints.map((m) => (typeof m === 'string' ? m : m.toBase58()));
    const result = new Map<string, TokenPrice>();
    const uncached: string[] = [];

    // Check cache for each mint
    for (const mint of mintStrs) {
      const cached = this.getCached(mint);
      if (cached) {
        result.set(mint, cached);
      } else {
        uncached.push(mint);
      }
    }

    // Fetch uncached prices in batch (if API available)
    if (uncached.length > 0 && !this.isApiUnavailable()) {
      const fetched = await this.fetchPrices(uncached);
      for (const [mint, price] of fetched) {
        result.set(mint, price);
      }
    }

    return result;
  }

  /**
   * Get SOL price in USD
   */
  async getSolPrice(): Promise<number> {
    const price = await this.getPrice(SOL_MINT);
    return price?.priceUsd ?? 0;
  }

  /**
   * Convert token amount to USD value
   */
  async getUsdValue(
    mint: string | PublicKey,
    amount: bigint,
    decimals: number
  ): Promise<number> {
    const price = await this.getPrice(mint);
    if (!price) return 0;

    const amountNumber = Number(amount) / Math.pow(10, decimals);
    return amountNumber * price.priceUsd;
  }

  /**
   * Get total USD value for multiple tokens
   */
  async getTotalUsdValue(
    balances: Array<{ mint: string | PublicKey; amount: bigint; decimals: number }>
  ): Promise<number> {
    const mints = balances.map((b) =>
      typeof b.mint === 'string' ? b.mint : b.mint.toBase58()
    );
    const prices = await this.getPrices(mints);

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
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cached price if not expired
   */
  private getCached(mint: string): TokenPrice | null {
    const entry = this.cache.get(mint);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(mint);
      return null;
    }

    return entry.price;
  }

  /**
   * Cache a price
   */
  private setCache(price: TokenPrice): void {
    this.cache.set(price.mint, {
      price,
      expiresAt: Date.now() + this.cacheTtl,
    });
  }

  /**
   * Fetch price for a single token from Jupiter
   */
  private async fetchPrice(mint: string): Promise<TokenPrice | null> {
    try {
      const url = `${JUPITER_PRICE_API}?ids=${mint}`;
      const response = await fetch(url);

      if (!response.ok) {
        // Don't treat 4xx as API being down (just that token not found)
        if (response.status >= 500) {
          this.markApiUnavailable();
        }
        return null;
      }

      const data: JupiterPriceResponse = await response.json();
      const priceData = data.data[mint];

      // API is working, reset backoff
      this.markApiAvailable();

      if (!priceData) {
        return null;
      }

      const price: TokenPrice = {
        mint,
        priceUsd: priceData.price,
        updatedAt: Date.now(),
      };

      this.setCache(price);
      return price;
    } catch (err) {
      // Network errors suggest API is unavailable
      this.markApiUnavailable();
      return null;
    }
  }

  /**
   * Fetch prices for multiple tokens from Jupiter (batch)
   */
  private async fetchPrices(mints: string[]): Promise<Map<string, TokenPrice>> {
    const result = new Map<string, TokenPrice>();

    if (mints.length === 0) return result;

    try {
      const url = `${JUPITER_PRICE_API}?ids=${mints.join(',')}`;
      const response = await fetch(url);

      if (!response.ok) {
        // Server errors suggest API is unavailable
        if (response.status >= 500) {
          this.markApiUnavailable();
        }
        return result;
      }

      const data: JupiterPriceResponse = await response.json();

      // API is working, reset backoff
      this.markApiAvailable();

      for (const mint of mints) {
        const priceData = data.data[mint];
        if (priceData) {
          const price: TokenPrice = {
            mint,
            priceUsd: priceData.price,
            updatedAt: Date.now(),
          };
          this.setCache(price);
          result.set(mint, price);
        }
      }
    } catch (err) {
      // Network errors suggest API is unavailable
      this.markApiUnavailable();
    }

    return result;
  }

  /**
   * Check if price API is currently available
   */
  isAvailable(): boolean {
    return !this.isApiUnavailable();
  }

  /**
   * Force reset the backoff state (for manual retry)
   */
  resetBackoff(): void {
    this.markApiAvailable();
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number, decimals: number = 2): string {
  if (price === 0) return '$0.00';

  if (price < 0.01) {
    // Show more decimals for very small prices
    return `$${price.toFixed(6)}`;
  }

  if (price < 1) {
    return `$${price.toFixed(4)}`;
  }

  if (price >= 1000000) {
    return `$${(price / 1000000).toFixed(2)}M`;
  }

  if (price >= 1000) {
    return `$${(price / 1000).toFixed(2)}K`;
  }

  return `$${price.toFixed(decimals)}`;
}

/**
 * Format price change for display
 */
export function formatPriceChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * Calculate price impact for a swap based on USD values
 */
export function calculateUsdPriceImpact(
  inputAmount: bigint,
  outputAmount: bigint,
  inputPrice: number,
  outputPrice: number,
  inputDecimals: number,
  outputDecimals: number
): number {
  if (inputPrice === 0 || outputPrice === 0) return 0;

  const inputValue = (Number(inputAmount) / Math.pow(10, inputDecimals)) * inputPrice;
  const outputValue = (Number(outputAmount) / Math.pow(10, outputDecimals)) * outputPrice;

  if (inputValue === 0) return 0;

  const impact = ((inputValue - outputValue) / inputValue) * 100;
  return Math.max(0, impact);
}
