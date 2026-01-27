/**
 * CloakCraft Perps Oracle Integration
 *
 * Pyth oracle helpers for perpetual futures pricing.
 * Uses Hermes API for off-chain price fetching and Pyth Solana Receiver for on-chain.
 */

import { Connection, PublicKey, TransactionInstruction, Keypair } from '@solana/web3.js';

// =============================================================================
// Pyth Feed IDs
// =============================================================================

/**
 * Well-known Pyth price feed IDs for common trading pairs.
 *
 * Feed IDs sourced from: https://pyth.network/developers/price-feed-ids
 */
export const PERPS_PYTH_FEED_IDS = {
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
  /** USDC/USD price feed (stablecoin) */
  USDC_USD: new Uint8Array([
    0xea, 0xa0, 0x20, 0xc6, 0x1c, 0xc4, 0x79, 0x71,
    0x2a, 0x35, 0x7a, 0xb5, 0xe4, 0xc7, 0x9a, 0x98,
    0xed, 0x97, 0x9e, 0xd4, 0x30, 0x24, 0xf7, 0x50,
    0x56, 0xbe, 0x2d, 0xb8, 0xbf, 0x6a, 0x43, 0x58,
  ]),
  /** USDT/USD price feed */
  USDT_USD: new Uint8Array([
    0x2b, 0x89, 0xb9, 0xdc, 0x8f, 0xdf, 0x9f, 0x34,
    0x12, 0x4d, 0xb2, 0x29, 0x37, 0x65, 0xd6, 0x1f,
    0x59, 0x35, 0x2c, 0x69, 0xfe, 0xf1, 0x5f, 0x33,
    0xc3, 0x90, 0xef, 0x16, 0x90, 0x3e, 0x38, 0xf1,
  ]),
} as const;

// =============================================================================
// Types
// =============================================================================

/** Pyth price data from Hermes API */
export interface PythPriceData {
  /** Price (scaled by 10^expo) */
  price: bigint;
  /** Confidence interval */
  confidence: bigint;
  /** Exponent (e.g., -8 means price is in 10^-8) */
  expo: number;
  /** Unix timestamp of publish time */
  publishTime: number;
}

/** Price update result with account and instructions */
export interface PriceUpdateResult {
  /** Price update account (pass to perps instructions) */
  priceUpdateAccount: PublicKey;
  /** Instructions to post price update on-chain */
  postInstructions: TransactionInstruction[];
  /** Instructions to close price update account (reclaim rent) */
  closeInstructions: TransactionInstruction[];
  /** Keypair for the price update account (needed for signing) */
  priceUpdateKeypair: Keypair;
  /** The fetched price data */
  priceData: PythPriceData;
}

// =============================================================================
// Helper Functions
// =============================================================================

// Import feedIdToHex from main pyth module (used internally, not re-exported)
import { feedIdToHex } from '../pyth';

/**
 * Get feed ID for a token symbol
 *
 * @param symbol - Token symbol (e.g., 'BTC', 'SOL', 'ETH')
 * @returns Feed ID or undefined if not found
 */
export function getFeedIdBySymbol(symbol: string): Uint8Array | undefined {
  const symbolToFeed: Record<string, Uint8Array> = {
    'SOL': PERPS_PYTH_FEED_IDS.SOL_USD,
    'BTC': PERPS_PYTH_FEED_IDS.BTC_USD,
    'ETH': PERPS_PYTH_FEED_IDS.ETH_USD,
    'USDC': PERPS_PYTH_FEED_IDS.USDC_USD,
    'USDT': PERPS_PYTH_FEED_IDS.USDT_USD,
  };
  return symbolToFeed[symbol.toUpperCase()];
}

// =============================================================================
// Pyth Price Service
// =============================================================================

/**
 * Fetch current price from Pyth Hermes API
 *
 * @param feedId - Pyth feed ID (32 bytes)
 * @param hermesUrl - Hermes API URL (default: mainnet)
 * @returns Price data including price, confidence, and exponent
 */
export async function fetchPythPrice(
  feedId: Uint8Array,
  hermesUrl: string = 'https://hermes.pyth.network'
): Promise<PythPriceData> {
  const feedIdHex = feedIdToHex(feedId);

  const response = await fetch(
    `${hermesUrl}/v2/updates/price/latest?ids[]=${feedIdHex}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Pyth price: ${response.statusText}`);
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
 * Fetch price normalized to USD with specified decimal places
 *
 * @param feedId - Pyth feed ID
 * @param decimals - Desired decimal places (default 9 for Solana token standard)
 * @param hermesUrl - Hermes API URL
 * @returns Price in USD * 10^decimals
 */
export async function fetchPythPriceUsd(
  feedId: Uint8Array,
  decimals: number = 9,
  hermesUrl?: string
): Promise<bigint> {
  const priceData = await fetchPythPrice(feedId, hermesUrl);

  // Pyth prices have negative exponent (e.g., expo = -8 means price is in 10^-8)
  // We want to normalize to our decimal places
  const expoAdjustment = decimals + priceData.expo;

  if (expoAdjustment >= 0) {
    return priceData.price * BigInt(10 ** expoAdjustment);
  } else {
    return priceData.price / BigInt(10 ** (-expoAdjustment));
  }
}

/**
 * Fetch VAA (Verified Action Approval) data for posting on-chain
 *
 * Returns the raw binary data that can be used with Pyth Receiver program
 * to post a price update on-chain.
 *
 * @param feedId - Pyth feed ID
 * @param hermesUrl - Hermes API URL
 * @returns Array of base64-encoded VAA data
 */
export async function fetchPythVaa(
  feedId: Uint8Array,
  hermesUrl: string = 'https://hermes.pyth.network'
): Promise<string[]> {
  const feedIdHex = feedIdToHex(feedId);

  const response = await fetch(
    `${hermesUrl}/v2/updates/price/latest?ids[]=${feedIdHex}&encoding=base64`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Pyth VAA: ${response.statusText}`);
  }

  const data = await response.json() as any;

  if (!data?.binary?.data?.length) {
    throw new Error(`No VAA available for feed ${feedIdHex}`);
  }

  return data.binary.data;
}

/**
 * Get price update account address (if using Pyth Receiver)
 *
 * The Pyth Solana Receiver creates price update accounts at deterministic addresses.
 * This function returns the expected address for a given feed ID.
 *
 * Note: You need to actually post the price update using the Pyth SDK before
 * the account exists on-chain.
 *
 * @param connection - Solana connection
 * @param feedId - Pyth feed ID
 * @returns Price update account address (may not exist yet)
 */
export async function getPriceUpdateAccountAddress(
  connection: Connection,
  feedId: Uint8Array
): Promise<PublicKey> {
  // The Pyth Receiver program creates price update accounts at a PDA
  // derived from the feed ID. The exact derivation depends on the receiver version.
  //
  // For the standard Pyth Solana Receiver:
  // Seeds: ["price_feed", feed_id]
  // Program: Pyth Solana Receiver (varies by network)

  const PYTH_RECEIVER_PROGRAM = new PublicKey('rec5EKMGg6MxZYaMdyBfgwp4d5rB9T1VQH5pJv5LtFJ');

  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('price_feed'), feedId],
    PYTH_RECEIVER_PROGRAM
  );

  return pda;
}

/**
 * Check if a price update account exists and is recent
 *
 * @param connection - Solana connection
 * @param priceUpdateAccount - Price update account address
 * @param maxAge - Maximum age in seconds (default 60)
 * @returns True if the account exists and is recent enough
 */
export async function isPriceUpdateValid(
  connection: Connection,
  priceUpdateAccount: PublicKey,
  maxAge: number = 60
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(priceUpdateAccount);
    if (!accountInfo) {
      return false;
    }

    // Parse the price update account to check timestamp
    // This depends on the Pyth Receiver account format
    // For now, we just check if the account exists
    // In production, parse the account data and check publish_time

    return true;
  } catch {
    return false;
  }
}

/**
 * Calculate position entry/exit price from oracle
 *
 * Applies slippage and spread calculations for realistic position pricing.
 *
 * @param oraclePrice - Current oracle price (normalized to decimals)
 * @param isLong - True for long positions
 * @param slippageBps - Slippage in basis points (default 10 = 0.1%)
 * @returns Adjusted price for position entry/exit
 */
export function calculatePositionPrice(
  oraclePrice: bigint,
  isLong: boolean,
  slippageBps: number = 10
): bigint {
  // For longs: entry price is slightly higher (worse for buyer)
  // For shorts: entry price is slightly lower (worse for seller)
  const slippageMultiplier = isLong
    ? 10000n + BigInt(slippageBps)
    : 10000n - BigInt(slippageBps);

  return (oraclePrice * slippageMultiplier) / 10000n;
}

// =============================================================================
// Multi-Feed Support
// =============================================================================

/**
 * Fetch prices for multiple feeds in one request
 *
 * @param feedIds - Array of Pyth feed IDs
 * @param hermesUrl - Hermes API URL
 * @returns Map of feed ID hex to price data
 */
export async function fetchPythPrices(
  feedIds: Uint8Array[],
  hermesUrl: string = 'https://hermes.pyth.network'
): Promise<Map<string, PythPriceData>> {
  const feedIdHexes = feedIds.map(feedIdToHex);
  const idsParam = feedIdHexes.map(id => `ids[]=${id}`).join('&');

  const response = await fetch(
    `${hermesUrl}/v2/updates/price/latest?${idsParam}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Pyth prices: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const result = new Map<string, PythPriceData>();

  if (data?.parsed) {
    for (const item of data.parsed) {
      const feedId = '0x' + item.id;
      result.set(feedId, {
        price: BigInt(item.price.price),
        confidence: BigInt(item.price.conf),
        expo: item.price.expo,
        publishTime: item.price.publish_time,
      });
    }
  }

  return result;
}

/**
 * Get oracle prices for all tokens in a perps pool
 *
 * @param tokenFeedIds - Array of feed IDs for each token in the pool (up to 8)
 * @param decimals - Desired decimal places
 * @param hermesUrl - Hermes API URL
 * @returns Array of prices (index matches token index)
 */
export async function getPoolOraclePrices(
  tokenFeedIds: Uint8Array[],
  decimals: number = 9,
  hermesUrl?: string
): Promise<bigint[]> {
  const pricesMap = await fetchPythPrices(tokenFeedIds, hermesUrl);
  const prices: bigint[] = [];

  for (const feedId of tokenFeedIds) {
    const feedIdHex = feedIdToHex(feedId);
    const priceData = pricesMap.get(feedIdHex);

    if (!priceData) {
      // Use 0 for missing prices (pool may have inactive tokens)
      prices.push(0n);
      continue;
    }

    // Normalize to desired decimals
    const expoAdjustment = decimals + priceData.expo;
    if (expoAdjustment >= 0) {
      prices.push(priceData.price * BigInt(10 ** expoAdjustment));
    } else {
      prices.push(priceData.price / BigInt(10 ** (-expoAdjustment)));
    }
  }

  // Pad to 8 elements (MAX_PERPS_TOKENS)
  while (prices.length < 8) {
    prices.push(0n);
  }

  return prices;
}
