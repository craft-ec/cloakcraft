/**
 * CloakCraft Perpetual Futures Types
 *
 * Types for the lending-based perpetual futures system.
 */

import { PublicKey } from '@solana/web3.js';
import type {
  FieldElement,
  PreparedInput,
  StealthAddress,
  TransferProgressStage,
} from '@cloakcraft/types';

// =============================================================================
// Perps Pool Types
// =============================================================================

/** Maximum number of tokens supported in a perps pool */
export const MAX_PERPS_TOKENS = 8;

/** Token configuration in a perps pool */
export interface PerpsToken {
  /** Token mint */
  mint: PublicKey;
  /** Token vault PDA */
  vault: PublicKey;
  /** Price oracle */
  oracle: PublicKey;
  /** Total balance in pool */
  balance: bigint;
  /** Amount locked in positions */
  locked: bigint;
  /** Cumulative borrow fee (scaled by 1e18) */
  cumulativeBorrowFee: bigint;
  /** Last fee update timestamp */
  lastFeeUpdate: number;
  /** Token decimals */
  decimals: number;
  /** Is active */
  isActive: boolean;
}

/** Perps pool state */
export interface PerpsPoolState {
  /** Pool ID */
  poolId: PublicKey;
  /** LP token mint */
  lpMint: PublicKey;
  /** LP token supply */
  lpSupply: bigint;
  /** Pool authority */
  authority: PublicKey;
  /** Number of tokens in pool */
  numTokens: number;
  /** Token configurations */
  tokens: PerpsToken[];
  /** Max leverage (e.g., 100 for 100x) */
  maxLeverage: number;
  /** Position fee in basis points */
  positionFeeBps: number;
  /** Max utilization in basis points (e.g., 8000 for 80%) */
  maxUtilizationBps: number;
  /** Liquidation threshold in basis points */
  liquidationThresholdBps: number;
  /** Liquidation penalty in basis points */
  liquidationPenaltyBps: number;
  /** Base borrow rate in basis points (per hour) */
  baseBorrowRateBps: number;
  /** Is pool active */
  isActive: boolean;
  /** PDA bump */
  bump: number;
}

/** Perps market state (trading pair) */
export interface PerpsMarketState {
  /** Market ID */
  marketId: Uint8Array;
  /** Parent pool */
  pool: PublicKey;
  /** Base token index in pool */
  baseTokenIndex: number;
  /** Quote token index in pool */
  quoteTokenIndex: number;
  /** Long open interest */
  longOpenInterest: bigint;
  /** Short open interest */
  shortOpenInterest: bigint;
  /** Max position size */
  maxPositionSize: bigint;
  /** Is market active */
  isActive: boolean;
  /** PDA bump */
  bump: number;
}

// =============================================================================
// Position Types
// =============================================================================

/** Position direction */
export type PositionDirection = 'long' | 'short';

/** Position data (stored in commitment) */
export interface PerpsPosition {
  /** Position commitment */
  commitment: Uint8Array;
  /** Market */
  market: PublicKey;
  /** Direction */
  direction: PositionDirection;
  /** Margin amount */
  margin: bigint;
  /** Position size (margin * leverage) */
  size: bigint;
  /** Leverage multiplier */
  leverage: number;
  /** Entry price */
  entryPrice: bigint;
  /** Cumulative borrow fee at entry (for fee calculation) */
  entryBorrowFee: bigint;
  /** Entry timestamp */
  entryTimestamp: number;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Stealth ephemeral pubkey (for spending) */
  stealthEphemeralPubkey?: { x: FieldElement; y: FieldElement };
}

/** Decoded position from encrypted note */
export interface DecryptedPerpsPosition extends PerpsPosition {
  /** Account hash for Light Protocol */
  accountHash?: string;
}

// =============================================================================
// Operation Parameters
// =============================================================================

/** Open position parameters */
export interface OpenPositionParams {
  /** Input note (margin source) */
  input: PreparedInput;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Market to trade */
  market: PublicKey;
  /** Position direction */
  direction: PositionDirection;
  /** Margin amount to use */
  margin: bigint;
  /** Leverage multiplier (1-100) */
  leverage: number;
  /** Entry price from oracle */
  entryPrice: bigint;
  /** Recipient for position commitment */
  positionRecipient: StealthAddress;
  /** Recipient for change (input - margin - fee) */
  changeRecipient: StealthAddress;
  /** Merkle root for input */
  merkleRoot: Uint8Array;
  /** Merkle path elements */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
  /** Optional progress callback */
  onProgress?: (stage: TransferProgressStage) => void;
}

/** Close position parameters */
export interface ClosePositionParams {
  /** Position note to close */
  position: DecryptedPerpsPosition;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Market */
  market: PublicKey;
  /** Exit price from oracle */
  exitPrice: bigint;
  /** Recipient for settlement (margin + PnL) */
  settlementRecipient: StealthAddress;
  /** Merkle root for position */
  merkleRoot: Uint8Array;
  /** Merkle path elements */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
  /** Optional progress callback */
  onProgress?: (stage: TransferProgressStage) => void;
}

/** Add perps liquidity parameters */
export interface AddPerpsLiquidityParams {
  /** Input note (single token) */
  input: PreparedInput;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Token index in pool */
  tokenIndex: number;
  /** Amount to deposit */
  depositAmount: bigint;
  /** LP tokens to receive */
  lpAmount: bigint;
  /** Recipient for LP tokens */
  lpRecipient: StealthAddress;
  /** Recipient for change (input - deposit) */
  changeRecipient: StealthAddress;
  /** Merkle root for input */
  merkleRoot: Uint8Array;
  /** Merkle path elements */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
  /** Current oracle prices for all tokens */
  oraclePrices: bigint[];
  /** Optional progress callback */
  onProgress?: (stage: TransferProgressStage) => void;
}

/** Remove perps liquidity parameters */
export interface RemovePerpsLiquidityParams {
  /** LP token note */
  lpInput: PreparedInput;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Token index to withdraw */
  tokenIndex: number;
  /** LP tokens to burn */
  lpAmount: bigint;
  /** Amount to withdraw */
  withdrawAmount: bigint;
  /** Recipient for withdrawn tokens */
  outputRecipient: StealthAddress;
  /** Recipient for LP change (if any) */
  lpChangeRecipient: StealthAddress;
  /** Merkle root for LP input */
  merkleRoot: Uint8Array;
  /** Merkle path elements */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
  /** Current oracle prices for all tokens */
  oraclePrices: bigint[];
  /** Optional progress callback */
  onProgress?: (stage: TransferProgressStage) => void;
}

/** Liquidate position parameters */
export interface LiquidatePositionParams {
  /** Position to liquidate */
  position: DecryptedPerpsPosition;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Market */
  market: PublicKey;
  /** Current price from oracle */
  currentPrice: bigint;
  /** Keeper/liquidator receiving reward */
  liquidatorRecipient: StealthAddress;
  /** Position owner receiving remainder */
  ownerRecipient: StealthAddress;
  /** Merkle root for position */
  merkleRoot: Uint8Array;
  /** Merkle path elements */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merkleIndices: number[];
}

// =============================================================================
// Proof Results
// =============================================================================

/** Open position proof result */
export interface OpenPositionProofResult {
  proof: Uint8Array;
  nullifier: Uint8Array;
  positionCommitment: Uint8Array;
  changeCommitment: Uint8Array;
  positionRandomness: Uint8Array;
  changeRandomness: Uint8Array;
  positionFee: bigint;
}

/** Close position proof result */
export interface ClosePositionProofResult {
  proof: Uint8Array;
  positionNullifier: Uint8Array;
  settlementCommitment: Uint8Array;
  settlementRandomness: Uint8Array;
  pnlAmount: bigint;
  isProfit: boolean;
  closeFee: bigint;
}

/** Add perps liquidity proof result */
export interface AddPerpsLiquidityProofResult {
  proof: Uint8Array;
  nullifier: Uint8Array;
  lpCommitment: Uint8Array;
  changeCommitment: Uint8Array;
  lpRandomness: Uint8Array;
  changeRandomness: Uint8Array;
  feeAmount: bigint;
}

/** Remove perps liquidity proof result */
export interface RemovePerpsLiquidityProofResult {
  proof: Uint8Array;
  lpNullifier: Uint8Array;
  outputCommitment: Uint8Array;
  lpChangeCommitment: Uint8Array;
  outputRandomness: Uint8Array;
  lpChangeRandomness: Uint8Array;
  feeAmount: bigint;
}

/** Liquidate position proof result */
export interface LiquidateProofResult {
  proof: Uint8Array;
  positionNullifier: Uint8Array;
  ownerCommitment: Uint8Array;
  liquidatorCommitment: Uint8Array;
  ownerRandomness: Uint8Array;
  liquidatorRandomness: Uint8Array;
  liquidatorReward: bigint;
  ownerRemainder: bigint;
}

// =============================================================================
// PnL Calculation Types
// =============================================================================

/** PnL calculation result */
export interface PnLResult {
  /** Raw PnL amount (positive = profit, negative = loss) */
  pnl: bigint;
  /** Is position in profit */
  isProfit: boolean;
  /** PnL percentage (scaled by 10000, e.g., 500 = 5%) */
  pnlBps: number;
  /** Effective margin after PnL */
  effectiveMargin: bigint;
  /** Accumulated borrow fees */
  borrowFees: bigint;
  /** Total settlement amount */
  settlementAmount: bigint;
  /** Is position at profit bound (PnL >= margin) */
  atProfitBound: boolean;
  /** Is position liquidatable */
  isLiquidatable: boolean;
}

/** Liquidation price result */
export interface LiquidationPriceResult {
  /** Liquidation price */
  price: bigint;
  /** Distance from current price in basis points */
  distanceBps: number;
}

/** LP value calculation result */
export interface LpValueResult {
  /** Total value in USD (scaled by 1e6) */
  totalValueUsd: bigint;
  /** Value per LP token */
  valuePerLp: bigint;
  /** Token balances and values */
  tokenValues: {
    mint: PublicKey;
    balance: bigint;
    priceUsd: bigint;
    valueUsd: bigint;
  }[];
}

/** Withdrawable amount result */
export interface WithdrawableResult {
  /** Max withdrawable amount of requested token */
  maxAmount: bigint;
  /** Current utilization after withdrawal */
  utilizationAfter: number;
  /** LP tokens required to burn */
  lpRequired: bigint;
}
