/**
 * CloakCraft Perpetual Futures Calculations
 *
 * PnL, liquidation price, LP value, and other perps-related calculations.
 */

import { PublicKey } from '@solana/web3.js';
import type {
  PerpsPoolState,
  PerpsMarketState,
  PerpsPosition,
  PnLResult,
  LiquidationPriceResult,
  LpValueResult,
  WithdrawableResult,
  MAX_PERPS_TOKENS,
} from './types';

// =============================================================================
// Position Calculations
// =============================================================================

/**
 * Calculate position PnL
 *
 * @param position - The position to calculate PnL for
 * @param currentPrice - Current oracle price
 * @param pool - Perps pool state
 * @param currentTimestamp - Current timestamp for borrow fee calculation
 */
export function calculatePnL(
  position: PerpsPosition,
  currentPrice: bigint,
  pool: PerpsPoolState,
  currentTimestamp: number
): PnLResult {
  const { margin, size, entryPrice, direction, entryBorrowFee } = position;

  // Calculate raw PnL
  let pnl: bigint;
  let isProfit: boolean;

  if (direction === 'long') {
    // Long: profit when price goes up
    if (currentPrice > entryPrice) {
      pnl = (currentPrice - entryPrice) * size / entryPrice;
      isProfit = true;
    } else {
      pnl = (entryPrice - currentPrice) * size / entryPrice;
      isProfit = false;
    }
  } else {
    // Short: profit when price goes down
    if (currentPrice < entryPrice) {
      pnl = (entryPrice - currentPrice) * size / entryPrice;
      isProfit = true;
    } else {
      pnl = (currentPrice - entryPrice) * size / entryPrice;
      isProfit = false;
    }
  }

  // Calculate borrow fees
  const borrowFees = calculateBorrowFees(position, pool, currentTimestamp);

  // Apply bounded profit model: max profit = margin
  let boundedPnl = pnl;
  let atProfitBound = false;
  if (isProfit && pnl >= margin) {
    boundedPnl = margin;
    atProfitBound = true;
  }

  // Calculate effective margin (margin +/- PnL - borrow fees)
  const effectiveMargin = isProfit
    ? margin + boundedPnl - borrowFees
    : margin - pnl - borrowFees;

  // Calculate PnL percentage (scaled by 10000)
  const pnlBps = Number((isProfit ? boundedPnl : -pnl) * 10000n / margin);

  // Calculate settlement amount
  const settlementAmount = effectiveMargin > 0n ? effectiveMargin : 0n;

  // Check if liquidatable (effective margin < liquidation threshold)
  const liquidationThreshold = margin * BigInt(pool.liquidationThresholdBps) / 10000n;
  const isLiquidatable = effectiveMargin < liquidationThreshold;

  return {
    pnl: isProfit ? boundedPnl : -pnl,
    isProfit,
    pnlBps,
    effectiveMargin,
    borrowFees,
    settlementAmount,
    atProfitBound,
    isLiquidatable,
  };
}

/**
 * Calculate accumulated borrow fees for a position
 *
 * @param position - The position
 * @param pool - Perps pool state
 * @param currentTimestamp - Current timestamp
 */
export function calculateBorrowFees(
  position: PerpsPosition,
  pool: PerpsPoolState,
  currentTimestamp: number
): bigint {
  // Find the token being borrowed (for longs: quote, for shorts: base)
  // For simplicity, we'll use the first active token's fee accumulator
  const token = pool.tokens[0];
  if (!token || !token.isActive) {
    return 0n;
  }

  // Calculate fee delta since position entry
  const feeDelta = token.cumulativeBorrowFee - position.entryBorrowFee;

  // Apply to position size
  // Fee is scaled by 1e18, so divide by 1e18
  const borrowFee = position.size * feeDelta / BigInt(1e18);

  return borrowFee;
}

/**
 * Calculate liquidation price for a position
 *
 * @param position - The position
 * @param pool - Perps pool state
 * @param currentTimestamp - Current timestamp for fee estimation
 */
export function calculateLiquidationPrice(
  position: PerpsPosition,
  pool: PerpsPoolState,
  currentTimestamp: number
): LiquidationPriceResult {
  const { margin, size, entryPrice, direction } = position;

  // Liquidation threshold (e.g., 50 bps = 0.5% of margin)
  const liquidationThreshold = margin * BigInt(pool.liquidationThresholdBps) / 10000n;

  // Estimate borrow fees (assume they grow linearly)
  const currentBorrowFees = calculateBorrowFees(position, pool, currentTimestamp);

  // Available margin for losses
  const availableForLoss = margin - liquidationThreshold - currentBorrowFees;

  if (availableForLoss <= 0n) {
    // Already liquidatable
    return {
      price: entryPrice,
      distanceBps: 0,
    };
  }

  // Calculate price movement that causes loss = availableForLoss
  // Loss = |price_diff| * size / entryPrice
  // price_diff = availableForLoss * entryPrice / size
  const priceDiff = availableForLoss * entryPrice / size;

  let liquidationPrice: bigint;
  if (direction === 'long') {
    // Long loses when price drops
    liquidationPrice = entryPrice - priceDiff;
    if (liquidationPrice < 0n) liquidationPrice = 0n;
  } else {
    // Short loses when price rises
    liquidationPrice = entryPrice + priceDiff;
  }

  // Calculate distance from entry in basis points
  const distanceBps = Number(
    (direction === 'long' ? entryPrice - liquidationPrice : liquidationPrice - entryPrice)
    * 10000n / entryPrice
  );

  return {
    price: liquidationPrice,
    distanceBps,
  };
}

/**
 * Calculate position fee
 *
 * @param positionSize - Size of the position
 * @param feeBps - Fee in basis points
 */
export function calculatePositionFee(positionSize: bigint, feeBps: number): bigint {
  return positionSize * BigInt(feeBps) / 10000n;
}

/**
 * Calculate imbalance fee for opening a position
 *
 * @param market - Market state
 * @param positionSize - Size of position being opened
 * @param isLong - Whether opening a long
 */
export function calculateImbalanceFee(
  market: PerpsMarketState,
  positionSize: bigint,
  isLong: boolean
): bigint {
  const { longOpenInterest, shortOpenInterest } = market;
  const totalOI = longOpenInterest + shortOpenInterest;

  if (totalOI === 0n) {
    return 0n;
  }

  // Calculate imbalance ratio
  const imbalance = longOpenInterest > shortOpenInterest
    ? longOpenInterest - shortOpenInterest
    : shortOpenInterest - longOpenInterest;

  const imbalanceRatio = imbalance * 10000n / totalOI;

  // If opening in minority direction, no fee
  const isMinority = (isLong && shortOpenInterest > longOpenInterest) ||
    (!isLong && longOpenInterest > shortOpenInterest);

  if (isMinority) {
    return 0n;
  }

  // Fee = 3 * imbalanceRatio / 10000 (max 3 bps)
  const feeBps = Number(imbalanceRatio * 3n / 10000n);
  const cappedFeeBps = Math.min(feeBps, 3);

  return positionSize * BigInt(cappedFeeBps) / 10000n;
}

// =============================================================================
// LP Calculations
// =============================================================================

/**
 * Calculate total pool value and LP token value
 *
 * @param pool - Perps pool state
 * @param oraclePrices - Current oracle prices for each token (USD, scaled by 1e6)
 */
export function calculateLpValue(
  pool: PerpsPoolState,
  oraclePrices: bigint[]
): LpValueResult {
  let totalValueUsd = 0n;
  const tokenValues: LpValueResult['tokenValues'] = [];

  for (let i = 0; i < pool.numTokens; i++) {
    const token = pool.tokens[i];
    if (!token || !token.isActive) continue;

    const price = oraclePrices[i] ?? 0n;
    const valueUsd = token.balance * price / BigInt(10 ** token.decimals);

    tokenValues.push({
      mint: token.mint,
      balance: token.balance,
      priceUsd: price,
      valueUsd,
    });

    totalValueUsd += valueUsd;
  }

  // Value per LP token
  const valuePerLp = pool.lpSupply > 0n
    ? totalValueUsd * BigInt(1e6) / pool.lpSupply
    : 0n;

  return {
    totalValueUsd,
    valuePerLp,
    tokenValues,
  };
}

/**
 * Calculate LP tokens to mint for a deposit
 *
 * @param pool - Perps pool state
 * @param depositAmount - Amount of token to deposit
 * @param tokenIndex - Index of token being deposited
 * @param oraclePrices - Current oracle prices
 */
export function calculateLpMintAmount(
  pool: PerpsPoolState,
  depositAmount: bigint,
  tokenIndex: number,
  oraclePrices: bigint[]
): bigint {
  const token = pool.tokens[tokenIndex];
  if (!token || !token.isActive) {
    throw new Error(`Invalid token index: ${tokenIndex}`);
  }

  // Calculate deposit value in USD
  const depositValueUsd = depositAmount * oraclePrices[tokenIndex] / BigInt(10 ** token.decimals);

  // If pool is empty, mint 1:1 with value
  if (pool.lpSupply === 0n) {
    return depositValueUsd;
  }

  // Calculate current pool value
  const { totalValueUsd } = calculateLpValue(pool, oraclePrices);

  if (totalValueUsd === 0n) {
    return depositValueUsd;
  }

  // LP to mint = depositValue / totalValue * lpSupply
  return depositValueUsd * pool.lpSupply / totalValueUsd;
}

/**
 * Calculate token amount for LP withdrawal
 *
 * @param pool - Perps pool state
 * @param lpAmount - Amount of LP tokens to burn
 * @param tokenIndex - Index of token to withdraw
 * @param oraclePrices - Current oracle prices
 */
export function calculateWithdrawAmount(
  pool: PerpsPoolState,
  lpAmount: bigint,
  tokenIndex: number,
  oraclePrices: bigint[]
): bigint {
  const token = pool.tokens[tokenIndex];
  if (!token || !token.isActive) {
    throw new Error(`Invalid token index: ${tokenIndex}`);
  }

  // Calculate LP value
  const { totalValueUsd } = calculateLpValue(pool, oraclePrices);

  if (totalValueUsd === 0n || pool.lpSupply === 0n) {
    return 0n;
  }

  // Calculate value being withdrawn
  const withdrawValueUsd = lpAmount * totalValueUsd / pool.lpSupply;

  // Convert to token amount
  const price = oraclePrices[tokenIndex];
  if (price === 0n) {
    throw new Error(`No price for token index: ${tokenIndex}`);
  }

  return withdrawValueUsd * BigInt(10 ** token.decimals) / price;
}

/**
 * Calculate maximum withdrawable amount for a token
 *
 * @param pool - Perps pool state
 * @param tokenIndex - Index of token to withdraw
 * @param lpAmount - Amount of LP tokens to burn
 * @param oraclePrices - Current oracle prices
 */
export function calculateMaxWithdrawable(
  pool: PerpsPoolState,
  tokenIndex: number,
  lpAmount: bigint,
  oraclePrices: bigint[]
): WithdrawableResult {
  const token = pool.tokens[tokenIndex];
  if (!token || !token.isActive) {
    throw new Error(`Invalid token index: ${tokenIndex}`);
  }

  // Calculate available balance (not locked)
  const availableBalance = token.balance - token.locked;

  // Calculate what LP tokens are worth
  const withdrawAmount = calculateWithdrawAmount(pool, lpAmount, tokenIndex, oraclePrices);

  // Cap at available balance
  const maxAmount = withdrawAmount > availableBalance ? availableBalance : withdrawAmount;

  // Calculate utilization after withdrawal
  const newBalance = token.balance - maxAmount;
  const utilizationAfter = newBalance > 0n
    ? Number(token.locked * 10000n / newBalance)
    : 10000;

  // Calculate LP required for max amount
  const lpRequired = calculateLpForWithdrawal(pool, maxAmount, tokenIndex, oraclePrices);

  return {
    maxAmount,
    utilizationAfter,
    lpRequired,
  };
}

/**
 * Calculate LP tokens required to withdraw a specific amount
 */
function calculateLpForWithdrawal(
  pool: PerpsPoolState,
  withdrawAmount: bigint,
  tokenIndex: number,
  oraclePrices: bigint[]
): bigint {
  const token = pool.tokens[tokenIndex];
  if (!token || !token.isActive) {
    return 0n;
  }

  const { totalValueUsd } = calculateLpValue(pool, oraclePrices);
  const price = oraclePrices[tokenIndex];

  if (totalValueUsd === 0n || pool.lpSupply === 0n || price === 0n) {
    return 0n;
  }

  const withdrawValueUsd = withdrawAmount * price / BigInt(10 ** token.decimals);
  return withdrawValueUsd * pool.lpSupply / totalValueUsd;
}

/**
 * Calculate token utilization rate
 *
 * @param token - Token state
 */
export function calculateUtilization(token: { balance: bigint; locked: bigint }): number {
  if (token.balance === 0n) return 0;
  return Number(token.locked * 10000n / token.balance);
}

/**
 * Calculate borrow rate based on utilization
 *
 * @param utilization - Current utilization (basis points, 0-10000)
 * @param baseBorrowRateBps - Base borrow rate in bps
 */
export function calculateBorrowRate(
  utilization: number,
  baseBorrowRateBps: number
): number {
  // Linear scaling: rate = baseRate * (1 + utilization)
  // At 80% utilization, rate is 1.8x base
  const multiplier = 10000 + utilization;
  return baseBorrowRateBps * multiplier / 10000;
}

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a leverage is valid
 */
export function isValidLeverage(leverage: number, maxLeverage: number): boolean {
  return leverage >= 1 && leverage <= maxLeverage && Number.isInteger(leverage);
}

/**
 * Check if utilization would exceed limit after an operation
 */
export function wouldExceedUtilization(
  token: { balance: bigint; locked: bigint },
  additionalLock: bigint,
  maxUtilizationBps: number
): boolean {
  const newLocked = token.locked + additionalLock;
  const utilization = Number(newLocked * 10000n / token.balance);
  return utilization > maxUtilizationBps;
}

/**
 * Validate position size against market limits
 */
export function isValidPositionSize(
  positionSize: bigint,
  market: PerpsMarketState
): boolean {
  return positionSize > 0n && positionSize <= market.maxPositionSize;
}
