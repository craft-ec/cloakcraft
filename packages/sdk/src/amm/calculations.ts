/**
 * AMM Calculations
 *
 * Implements multiple AMM formulas:
 * - Constant Product (x * y = k) - Uniswap V2 style, for volatile pairs
 * - StableSwap (Curve) - for pegged assets like stablecoins
 *
 * Features:
 * - Swap output calculation
 * - Liquidity addition/removal
 * - Price impact and slippage
 */

import { PoolType } from '@cloakcraft/types';

// Re-export PoolType from types for convenience
export { PoolType } from '@cloakcraft/types';

/**
 * Calculate swap output amount using StableSwap formula (Curve-style)
 *
 * StableSwap invariant: A * n^n * sum(x) + D = A * D * n^n + D^(n+1) / (n^n * prod(x))
 * For n=2: A * 4 * (x + y) + D = A * D * 4 + D^3 / (4 * x * y)
 *
 * @param inputAmount - Amount of input token to swap
 * @param reserveIn - Reserve of input token in pool
 * @param reserveOut - Reserve of output token in pool
 * @param amplification - Amplification coefficient (A), typically 100-1000
 * @param feeBps - Fee in basis points (default 4 = 0.04% for stables)
 * @returns Output amount and price impact percentage
 */
export function calculateStableSwapOutput(
  inputAmount: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  amplification: bigint,
  feeBps: number = 4
): { outputAmount: bigint; priceImpact: number } {
  if (inputAmount === 0n) {
    return { outputAmount: 0n, priceImpact: 0 };
  }

  if (reserveIn === 0n || reserveOut === 0n) {
    throw new Error('Pool has no liquidity');
  }

  if (amplification <= 0n) {
    throw new Error('Amplification must be positive');
  }

  // Apply fee
  const feeAmount = (inputAmount * BigInt(feeBps)) / 10000n;
  const inputWithFee = inputAmount - feeAmount;

  // Scale up for precision (1e18)
  const PRECISION = 1000000000000000000n;
  const x = reserveIn * PRECISION;
  const y = reserveOut * PRECISION;
  const dx = inputWithFee * PRECISION;

  // Calculate D (the invariant)
  const d = getD(x, y, amplification);

  // New x after swap
  const newX = x + dx;

  // Calculate new y
  const newY = getY(newX, d, amplification);

  // Output amount = old_y - new_y
  const outputScaled = y - newY;
  const outputAmount = outputScaled / PRECISION;

  // Calculate price impact (for stables, this should be very low near peg)
  const priceImpact = Number((inputAmount * 10000n) / reserveIn) / 100;

  return { outputAmount, priceImpact };
}

/**
 * Calculate D (the StableSwap invariant) using Newton-Raphson
 */
function getD(x: bigint, y: bigint, amp: bigint): bigint {
  const sum = x + y;
  if (sum === 0n) return 0n;

  const ann = amp * 4n; // A * n^n where n=2

  let d = sum;
  let dPrev: bigint;

  // Newton-Raphson iteration
  for (let i = 0; i < 255; i++) {
    // D_P = D^3 / (4 * x * y)
    let dP = d;
    dP = (dP * d) / (x * 2n);
    dP = (dP * d) / (y * 2n);

    dPrev = d;

    // d = (ann * sum + dP * 2) * d / ((ann - 1) * d + 3 * dP)
    const numerator = (ann * sum + dP * 2n) * d;
    const denominator = (ann - 1n) * d + dP * 3n;
    d = numerator / denominator;

    // Check convergence
    if (d > dPrev) {
      if (d - dPrev <= 1n) return d;
    } else {
      if (dPrev - d <= 1n) return d;
    }
  }

  throw new Error('StableSwap D calculation failed to converge');
}

/**
 * Calculate y given x and D using Newton-Raphson
 */
function getY(x: bigint, d: bigint, amp: bigint): bigint {
  const ann = amp * 4n; // A * n^n where n=2

  // c = D^3 / (4 * x * ann)
  const c = ((d * d) / (x * 2n) * d) / (ann * 2n);

  // b = x + D / ann
  const b = x + d / ann;

  let y = d;
  let yPrev: bigint;

  // Newton-Raphson iteration
  for (let i = 0; i < 255; i++) {
    yPrev = y;

    // y = (y^2 + c) / (2*y + b - D)
    const numerator = y * y + c;
    const denominator = y * 2n + b - d;
    y = numerator / denominator;

    // Check convergence
    if (y > yPrev) {
      if (y - yPrev <= 1n) return y;
    } else {
      if (yPrev - y <= 1n) return y;
    }
  }

  throw new Error('StableSwap Y calculation failed to converge');
}

/**
 * Unified swap output calculation that handles both pool types
 *
 * @param inputAmount - Amount of input token to swap
 * @param reserveIn - Reserve of input token in pool
 * @param reserveOut - Reserve of output token in pool
 * @param poolType - Pool type (ConstantProduct or StableSwap)
 * @param feeBps - Fee in basis points
 * @param amplification - Amplification coefficient (only for StableSwap)
 * @returns Output amount and price impact percentage
 */
export function calculateSwapOutputUnified(
  inputAmount: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  poolType: PoolType,
  feeBps: number,
  amplification: bigint = 0n
): { outputAmount: bigint; priceImpact: number } {
  if (poolType === PoolType.StableSwap) {
    return calculateStableSwapOutput(inputAmount, reserveIn, reserveOut, amplification, feeBps);
  }

  // Constant Product (x * y = k) formula
  if (inputAmount === 0n) {
    return { outputAmount: 0n, priceImpact: 0 };
  }

  if (reserveIn === 0n || reserveOut === 0n) {
    throw new Error('Pool has no liquidity');
  }

  // Apply fee: amountWithFee = inputAmount * (10000 - feeBps)
  const feeMultiplier = BigInt(10000 - feeBps);
  const amountWithFee = inputAmount * feeMultiplier;

  // Calculate output: (reserveOut * amountWithFee) / (reserveIn * 10000 + amountWithFee)
  const numerator = reserveOut * amountWithFee;
  const denominator = reserveIn * 10000n + amountWithFee;
  const outputAmount = numerator / denominator;

  // Calculate price impact
  const priceImpact = Number((inputAmount * 10000n) / reserveIn) / 100;

  return { outputAmount, priceImpact };
}

/**
 * Calculate minimum output amount with slippage tolerance
 *
 * @param outputAmount - Expected output amount
 * @param slippageBps - Slippage tolerance in basis points (e.g., 50 = 0.5%)
 * @returns Minimum output amount to accept
 */
export function calculateMinOutput(
  outputAmount: bigint,
  slippageBps: number
): bigint {
  if (slippageBps < 0 || slippageBps > 10000) {
    throw new Error('Slippage must be between 0 and 10000 bps');
  }

  // minOutput = outputAmount * (10000 - slippageBps) / 10000
  const minOutput = (outputAmount * BigInt(10000 - slippageBps)) / 10000n;
  return minOutput;
}

/**
 * Calculate optimal amounts for adding liquidity
 * Maintains pool ratio to avoid price impact
 *
 * @param desiredA - Desired amount of token A
 * @param desiredB - Desired amount of token B
 * @param reserveA - Current reserve of token A
 * @param reserveB - Current reserve of token B
 * @returns Optimal deposit amounts and LP tokens to receive
 */
export function calculateAddLiquidityAmounts(
  desiredA: bigint,
  desiredB: bigint,
  reserveA: bigint,
  reserveB: bigint,
  lpSupply: bigint
): { depositA: bigint; depositB: bigint; lpAmount: bigint } {
  if (desiredA === 0n || desiredB === 0n) {
    throw new Error('Desired amounts must be greater than 0');
  }

  // First liquidity provision (bootstrap)
  if (reserveA === 0n && reserveB === 0n && lpSupply === 0n) {
    // LP tokens = sqrt(depositA * depositB)
    const lpAmount = sqrt(desiredA * desiredB);
    return {
      depositA: desiredA,
      depositB: desiredB,
      lpAmount,
    };
  }

  if (reserveA === 0n || reserveB === 0n) {
    throw new Error('Pool reserves cannot be zero after initialization');
  }

  // Calculate optimal amounts maintaining pool ratio
  // ratio = reserveB / reserveA
  // optimalB = desiredA * reserveB / reserveA
  const optimalB = (desiredA * reserveB) / reserveA;

  let depositA: bigint;
  let depositB: bigint;

  if (optimalB <= desiredB) {
    // Use all of desiredA, adjust B
    depositA = desiredA;
    depositB = optimalB;
  } else {
    // Use all of desiredB, adjust A
    // optimalA = desiredB * reserveA / reserveB
    const optimalA = (desiredB * reserveA) / reserveB;
    depositA = optimalA;
    depositB = desiredB;
  }

  // Calculate LP tokens proportional to share of pool
  // lpAmount = min(depositA * lpSupply / reserveA, depositB * lpSupply / reserveB)
  const lpAmountA = (depositA * lpSupply) / reserveA;
  const lpAmountB = (depositB * lpSupply) / reserveB;
  const lpAmount = lpAmountA < lpAmountB ? lpAmountA : lpAmountB;

  return { depositA, depositB, lpAmount };
}

/**
 * Calculate output amounts for removing liquidity
 *
 * @param lpAmount - Amount of LP tokens to burn
 * @param lpSupply - Total LP token supply
 * @param reserveA - Current reserve of token A
 * @param reserveB - Current reserve of token B
 * @returns Amount of token A and B to receive
 */
export function calculateRemoveLiquidityOutput(
  lpAmount: bigint,
  lpSupply: bigint,
  reserveA: bigint,
  reserveB: bigint
): { outputA: bigint; outputB: bigint } {
  if (lpAmount === 0n) {
    return { outputA: 0n, outputB: 0n };
  }

  if (lpSupply === 0n) {
    throw new Error('No LP tokens in circulation');
  }

  if (lpAmount > lpSupply) {
    throw new Error('LP amount exceeds total supply');
  }

  // outputA = (lpAmount * reserveA) / lpSupply
  // outputB = (lpAmount * reserveB) / lpSupply
  const outputA = (lpAmount * reserveA) / lpSupply;
  const outputB = (lpAmount * reserveB) / lpSupply;

  return { outputA, outputB };
}

/**
 * Calculate price impact as percentage
 *
 * @param inputAmount - Amount of input token
 * @param reserveIn - Reserve of input token
 * @param reserveOut - Reserve of output token
 * @param poolType - Pool type (defaults to ConstantProduct)
 * @param feeBps - Fee in basis points (defaults to 30)
 * @param amplification - Amplification coefficient (only for StableSwap)
 * @returns Price impact as percentage (e.g., 1.5 = 1.5%)
 */
export function calculatePriceImpact(
  inputAmount: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  poolType: PoolType = PoolType.ConstantProduct,
  feeBps: number = 30,
  amplification: bigint = 0n
): number {
  if (inputAmount === 0n || reserveIn === 0n) {
    return 0;
  }

  // Price impact approximation: (inputAmount / reserveIn) * 100
  // More accurate for small trades
  const impact = Number((inputAmount * 10000n) / reserveIn) / 100;

  // For larger trades, use exact formula
  if (impact > 1) {
    // Calculate spot price before and after
    const priceBefore = Number(reserveOut) / Number(reserveIn);
    const newReserveIn = reserveIn + inputAmount;
    const { outputAmount } = calculateSwapOutputUnified(inputAmount, reserveIn, reserveOut, poolType, feeBps, amplification);
    const newReserveOut = reserveOut - outputAmount;
    const priceAfter = Number(newReserveOut) / Number(newReserveIn);

    const exactImpact = Math.abs((priceAfter - priceBefore) / priceBefore) * 100;
    return exactImpact;
  }

  return impact;
}

/**
 * Calculate slippage percentage
 *
 * @param expectedOutput - Expected output amount
 * @param minOutput - Minimum output amount
 * @returns Slippage as percentage (e.g., 0.5 = 0.5%)
 */
export function calculateSlippage(
  expectedOutput: bigint,
  minOutput: bigint
): number {
  if (expectedOutput === 0n) {
    return 0;
  }

  // slippage = ((expected - min) / expected) * 100
  const slippage = Number(((expectedOutput - minOutput) * 10000n) / expectedOutput) / 100;
  return slippage;
}

/**
 * Calculate price ratio between two tokens
 *
 * @param reserveA - Reserve of token A
 * @param reserveB - Reserve of token B
 * @param decimalsA - Decimals of token A (default 9)
 * @param decimalsB - Decimals of token B (default 9)
 * @returns Price of token A in terms of token B
 */
export function calculatePriceRatio(
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number = 9,
  decimalsB: number = 9
): number {
  if (reserveA === 0n) {
    return 0;
  }

  // Adjust for decimals
  const decimalAdjustment = Math.pow(10, decimalsB - decimalsA);
  const ratio = (Number(reserveB) / Number(reserveA)) * decimalAdjustment;

  return ratio;
}

/**
 * Calculate total liquidity in pool (in terms of token A)
 *
 * @param reserveA - Reserve of token A
 * @param reserveB - Reserve of token B
 * @param priceRatio - Price ratio (B/A)
 * @returns Total liquidity in token A units
 */
export function calculateTotalLiquidity(
  reserveA: bigint,
  reserveB: bigint,
  priceRatio: number
): bigint {
  // Total = reserveA + (reserveB / priceRatio)
  const reserveBInA = BigInt(Math.floor(Number(reserveB) / priceRatio));
  return reserveA + reserveBInA;
}

/**
 * Integer square root using Newton's method
 * Used for calculating initial LP tokens
 *
 * @param value - Value to take square root of
 * @returns Integer square root
 */
function sqrt(value: bigint): bigint {
  if (value < 0n) {
    throw new Error('Square root of negative number');
  }
  if (value === 0n) return 0n;
  if (value < 4n) return 1n;

  // Newton's method
  let z = value;
  let x = value / 2n + 1n;

  while (x < z) {
    z = x;
    x = (value / x + x) / 2n;
  }

  return z;
}

/**
 * Validate swap parameters
 *
 * @param inputAmount - Amount to swap
 * @param maxBalance - Maximum balance available
 * @param slippageBps - Slippage tolerance in bps
 * @returns Error message or null if valid
 */
export function validateSwapAmount(
  inputAmount: bigint,
  maxBalance: bigint,
  slippageBps: number
): string | null {
  if (inputAmount <= 0n) {
    return 'Amount must be greater than 0';
  }

  if (inputAmount > maxBalance) {
    return 'Insufficient balance';
  }

  if (slippageBps < 0 || slippageBps > 10000) {
    return 'Slippage must be between 0 and 100%';
  }

  return null;
}

/**
 * Validate liquidity parameters
 *
 * @param amountA - Amount of token A
 * @param amountB - Amount of token B
 * @param balanceA - Available balance of token A
 * @param balanceB - Available balance of token B
 * @returns Error message or null if valid
 */
export function validateLiquidityAmounts(
  amountA: bigint,
  amountB: bigint,
  balanceA: bigint,
  balanceB: bigint
): string | null {
  if (amountA <= 0n || amountB <= 0n) {
    return 'Amounts must be greater than 0';
  }

  if (amountA > balanceA) {
    return 'Insufficient balance for token A';
  }

  if (amountB > balanceB) {
    return 'Insufficient balance for token B';
  }

  return null;
}
