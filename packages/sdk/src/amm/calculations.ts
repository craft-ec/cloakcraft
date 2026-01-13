/**
 * AMM Calculations
 *
 * Implements constant product (x * y = k) AMM formulas for:
 * - Swap output calculation
 * - Liquidity addition/removal
 * - Price impact and slippage
 */

/**
 * Calculate swap output amount using constant product formula
 *
 * Formula: output = (reserveOut * inputAmount * (10000 - fee)) / ((reserveIn * 10000) + (inputAmount * (10000 - fee)))
 *
 * @param inputAmount - Amount of input token to swap
 * @param reserveIn - Reserve of input token in pool
 * @param reserveOut - Reserve of output token in pool
 * @param feeBps - Fee in basis points (default 30 = 0.3%)
 * @returns Output amount and price impact percentage
 */
export function calculateSwapOutput(
  inputAmount: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  feeBps: number = 30
): { outputAmount: bigint; priceImpact: number } {
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
  // Price impact = (inputAmount / reserveIn) * 100
  // This approximates how much the price moves
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
 * @returns Price impact as percentage (e.g., 1.5 = 1.5%)
 */
export function calculatePriceImpact(
  inputAmount: bigint,
  reserveIn: bigint,
  reserveOut: bigint
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
    const { outputAmount } = calculateSwapOutput(inputAmount, reserveIn, reserveOut);
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
