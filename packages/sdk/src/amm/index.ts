/**
 * AMM Module
 *
 * Exports all AMM-related functions for:
 * - Pool state management
 * - Swap calculations
 * - Liquidity calculations
 * - Price impact and slippage
 */

// Pool management
export {
  fetchAmmPool,
  deserializeAmmPool,
  computeAmmStateHash,
  ammPoolExists,
  getAmmPool,
  refreshAmmPool,
  verifyAmmStateHash,
  formatAmmPool,
} from './pool';

// Calculations
export {
  calculateStableSwapOutput,
  calculateSwapOutputUnified,
  calculateMinOutput,
  calculateAddLiquidityAmounts,
  calculateRemoveLiquidityOutput,
  calculatePriceImpact,
  calculateSlippage,
  calculatePriceRatio,
  calculateTotalLiquidity,
  validateSwapAmount,
  validateLiquidityAmounts,
  PoolType,
} from './calculations';
