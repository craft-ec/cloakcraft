/**
 * Pyth Oracle Integration
 *
 * Provides helpers for fetching and posting Pyth price updates.
 * Follows Jupiter's pattern: bundle price post + execute + close in one tx.
 */

import { Connection, PublicKey, TransactionInstruction, Keypair } from '@solana/web3.js';

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

/** Result of preparing Pyth price update instructions */
export interface PythPriceUpdateResult {
  /** The PriceUpdateV2 account address */
  priceUpdateAccount: PublicKey;
  /** Instructions to post the price update (prepend to your tx) */
  postInstructions: TransactionInstruction[];
  /** Instructions to close the price account (append to your tx to reclaim rent) */
  closeInstructions: TransactionInstruction[];
}

/**
 * Pyth Price Service
 *
 * Handles fetching price updates from Hermes and building instructions
 * to post/close price update accounts on Solana.
 */
export class PythPriceService {
  private connection: Connection;
  private hermesUrl: string;
  private pythReceiver: any = null;
  private hermesClient: any = null;

  constructor(
    connection: Connection,
    hermesUrl: string = 'https://hermes.pyth.network'
  ) {
    this.connection = connection;
    this.hermesUrl = hermesUrl;
  }

  /**
   * Initialize the Pyth SDK (lazy load to avoid import issues)
   */
  private async init(payer: Keypair): Promise<void> {
    if (this.pythReceiver && this.hermesClient) return;

    // Dynamic imports to avoid module resolution issues
    const { HermesClient } = await import('@pythnetwork/hermes-client');
    const { PythSolanaReceiver } = await import('@pythnetwork/pyth-solana-receiver');

    this.hermesClient = new HermesClient(this.hermesUrl);
    this.pythReceiver = new PythSolanaReceiver({
      connection: this.connection,
      wallet: {
        publicKey: payer.publicKey,
        signTransaction: async (tx: any) => {
          tx.sign([payer]);
          return tx;
        },
        signAllTransactions: async (txs: any[]) => {
          txs.forEach(tx => tx.sign([payer]));
          return txs;
        },
      } as any,
    });
  }

  /**
   * Get instructions to post and close a Pyth price update.
   *
   * Usage (Jupiter style - all in one tx):
   * ```
   * const pyth = await pythService.preparePriceUpdate(feedId, payer);
   *
   * const tx = new Transaction()
   *   .add(...pyth.postInstructions)    // Post price update
   *   .add(yourPerpsInstruction)         // Your perps operation
   *   .add(...pyth.closeInstructions);  // Reclaim rent
   * ```
   *
   * @param feedId - The Pyth feed ID (e.g., PYTH_FEED_IDS.BTC_USD)
   * @param payer - The payer keypair
   * @returns Instructions and price update account address
   */
  async preparePriceUpdate(
    feedId: Uint8Array,
    payer: Keypair
  ): Promise<PythPriceUpdateResult> {
    await this.init(payer);

    const feedIdHex = feedIdToHex(feedId);

    // Fetch latest price update from Hermes
    const priceUpdates = await this.hermesClient.getLatestPriceUpdates([feedIdHex]);

    if (!priceUpdates?.binary?.data?.length) {
      throw new Error(`No price update available for feed ${feedIdHex}`);
    }

    // Build transaction to post price update
    const txBuilder = this.pythReceiver.newTransactionBuilder({
      closeUpdateAccounts: false, // We'll close manually
    });
    await txBuilder.addPostPriceUpdates(priceUpdates.binary.data);

    // Get the instructions
    const postInstructions = await txBuilder.buildInstructions();

    // Get the price update account address
    const priceUpdateAccount = this.pythReceiver.getPriceFeedAccountAddress(0, feedIdHex);

    // Build close instruction
    const closeBuilder = this.pythReceiver.newTransactionBuilder({
      closeUpdateAccounts: true,
    });
    await closeBuilder.addClosePriceUpdateAccounts([priceUpdateAccount]);
    const closeInstructions = await closeBuilder.buildInstructions();

    return {
      priceUpdateAccount,
      postInstructions,
      closeInstructions,
    };
  }

  /**
   * Get the current price from Hermes (off-chain, no tx needed)
   *
   * @param feedId - The Pyth feed ID
   * @returns The current price with metadata
   */
  async getPrice(feedId: Uint8Array): Promise<{
    price: bigint;
    confidence: bigint;
    expo: number;
    publishTime: number;
  }> {
    if (!this.hermesClient) {
      const { HermesClient } = await import('@pythnetwork/hermes-client');
      this.hermesClient = new HermesClient(this.hermesUrl);
    }

    const feedIdHex = feedIdToHex(feedId);
    const priceUpdates = await this.hermesClient.getLatestPriceUpdates([feedIdHex]);

    if (!priceUpdates?.parsed?.length) {
      throw new Error(`No price available for feed ${feedIdHex}`);
    }

    const parsed = priceUpdates.parsed[0].price;
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
   * @param decimals - Desired decimal places (default 6)
   * @returns Price in USD * 10^decimals
   */
  async getPriceUsd(feedId: Uint8Array, decimals: number = 6): Promise<bigint> {
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
}

// Export singleton for convenience
let defaultPythService: PythPriceService | null = null;

export function getPythService(connection: Connection): PythPriceService {
  if (!defaultPythService) {
    defaultPythService = new PythPriceService(connection);
  }
  return defaultPythService;
}
