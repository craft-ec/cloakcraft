/**
 * Pyth Oracle Integration (Lightweight)
 *
 * Uses Hermes API directly to fetch prices without the heavy SDK dependencies.
 * For posting price updates on-chain, users should use the Pyth SDK directly
 * or pass an existing price update account.
 */

import { Connection, PublicKey } from '@solana/web3.js';

// Pyth Feed IDs (from https://pyth.network/developers/price-feed-ids)
export const PYTH_FEED_IDS = {
  /** SOL/USD price feed */
  SOL_USD: new Uint8Array([
    0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
    0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
    0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc,
    0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
  ]),
  /** BTC/USD price feed */
  BTC_USD: new Uint8Array([
    0xe6, 0x2d, 0xf6, 0xc8, 0xb4, 0xa8, 0x5f, 0xe1,
    0xa6, 0x7d, 0xb4, 0x4d, 0xc1, 0x2d, 0xe5, 0xdb,
    0x33, 0x0f, 0x7a, 0xc6, 0x6b, 0x72, 0xdc, 0x65,
    0x8a, 0xfe, 0xdf, 0x0f, 0x4a, 0x41, 0x5b, 0x43,
  ]),
  /** ETH/USD price feed */
  ETH_USD: new Uint8Array([
    0xff, 0x61, 0x49, 0x1a, 0x93, 0x11, 0x12, 0xdd,
    0xf1, 0xbd, 0x81, 0x47, 0xcd, 0x1b, 0x64, 0x13,
    0x75, 0xf7, 0x9f, 0x58, 0x25, 0x12, 0x6d, 0x66,
    0x54, 0x80, 0x87, 0x46, 0x34, 0xfd, 0x0a, 0xce,
  ]),
  /** USDC/USD price feed */
  USDC_USD: new Uint8Array([
    0xea, 0xa0, 0x20, 0xc6, 0x1c, 0xc4, 0x79, 0x71,
    0x2a, 0x35, 0x7a, 0xb5, 0xe4, 0xc7, 0x9a, 0x98,
    0xed, 0x97, 0x9e, 0xd4, 0x30, 0x24, 0xf7, 0x50,
    0x56, 0xbe, 0x2d, 0xb8, 0xbf, 0x6a, 0x43, 0x58,
  ]),
} as const;

/** Convert feed ID bytes to hex string for Hermes API */
export function feedIdToHex(feedId: Uint8Array): string {
  return '0x' + Array.from(feedId).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** Pyth price data from Hermes API */
export interface PythPrice {
  price: bigint;
  confidence: bigint;
  expo: number;
  publishTime: number;
}

/**
 * Pyth Price Service (Lightweight)
 *
 * Fetches prices directly from Hermes API without heavy SDK dependencies.
 */
export class PythPriceService {
  private hermesUrl: string;

  constructor(
    _connection?: Connection, // Keep for backward compatibility but unused
    hermesUrl: string = 'https://hermes.pyth.network'
  ) {
    this.hermesUrl = hermesUrl;
  }

  /**
   * Get the current price from Hermes API
   *
   * @param feedId - The Pyth feed ID (e.g., PYTH_FEED_IDS.BTC_USD)
   * @returns The current price with metadata
   */
  async getPrice(feedId: Uint8Array): Promise<PythPrice> {
    const feedIdHex = feedIdToHex(feedId);

    const response = await fetch(
      `${this.hermesUrl}/v2/updates/price/latest?ids[]=${feedIdHex}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch price: ${response.statusText}`);
    }

    const data = await response.json() as any;

    if (!data?.parsed?.length) {
      throw new Error(`No price available for feed ${feedIdHex}`);
    }

    const parsed = data.parsed[0].price;
    return {
      price: BigInt(parsed.price),
      confidence: BigInt(parsed.conf),
      expo: parsed.expo,
      publishTime: parsed.publish_time,
    };
  }

  /**
   * Get price in USD with decimals normalized
   *
   * @param feedId - The Pyth feed ID
   * @param decimals - Desired decimal places (default 9 for Solana token standard)
   * @returns Price in USD * 10^decimals
   */
  async getPriceUsd(feedId: Uint8Array, decimals: number = 9): Promise<bigint> {
    const { price, expo } = await this.getPrice(feedId);

    // Pyth prices have negative exponent (e.g., expo = -8 means price is in 10^-8)
    // We want to normalize to our decimal places
    const expoAdjustment = decimals + expo;

    if (expoAdjustment >= 0) {
      return price * BigInt(10 ** expoAdjustment);
    } else {
      return price / BigInt(10 ** (-expoAdjustment));
    }
  }

  /**
   * Get the VAA (Verified Action Approval) data for posting on-chain
   *
   * Returns the raw binary data that can be used with Pyth Receiver program
   * to post a price update on-chain.
   *
   * @param feedId - The Pyth feed ID
   * @returns The VAA binary data as base64 string
   */
  async getVaaData(feedId: Uint8Array): Promise<string[]> {
    const feedIdHex = feedIdToHex(feedId);

    const response = await fetch(
      `${this.hermesUrl}/v2/updates/price/latest?ids[]=${feedIdHex}&encoding=base64`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch VAA: ${response.statusText}`);
    }

    const data = await response.json() as any;

    if (!data?.binary?.data?.length) {
      throw new Error(`No VAA available for feed ${feedIdHex}`);
    }

    return data.binary.data;
  }
}

// Export singleton for convenience
let defaultPythService: PythPriceService | null = null;

export function getPythService(connection?: Connection): PythPriceService {
  if (!defaultPythService) {
    defaultPythService = new PythPriceService(connection);
  }
  return defaultPythService;
}

/**
 * NOTE: For posting price updates on-chain, you have two options:
 *
 * 1. Use the Pyth SDK directly in your application:
 *    ```
 *    import { PythSolanaReceiver } from '@pythnetwork/pyth-solana-receiver';
 *    // ... create and post price update
 *    ```
 *
 * 2. Pass an existing price update account to the perps functions:
 *    ```
 *    await client.openPerpsPosition({
 *      ...params,
 *      priceUpdate: existingPriceUpdateAccount,
 *      oraclePrice: priceFromOracle,
 *    });
 *    ```
 *
 * The SDK will auto-fetch prices if oraclePrice is not provided,
 * but you need to pass the priceUpdate account separately.
 */
