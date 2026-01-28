/**
 * CloakCraft Perpetual Futures Module
 *
 * A lending-based perpetual futures system with:
 * - Multi-token liquidity pool (like JLP)
 * - Private positions and liquidity via ZK proofs
 * - Bounded profit model (max profit = margin)
 * - Utilization-based constraints
 */

// Types
export type {
  // Pool & Market State
  PerpsToken,
  PerpsPoolState,
  PerpsMarketState,
  // Position Types
  PositionDirection,
  PerpsPosition,
  DecryptedPerpsPosition,
  // Operation Parameters
  OpenPositionParams,
  ClosePositionParams,
  AddPerpsLiquidityParams,
  RemovePerpsLiquidityParams,
  LiquidatePositionParams,
  // Proof Results
  OpenPositionProofResult,
  ClosePositionProofResult,
  AddPerpsLiquidityProofResult,
  RemovePerpsLiquidityProofResult,
  LiquidateProofResult,
  // Calculation Results
  PnLResult,
  LiquidationPriceResult,
  LpValueResult,
  WithdrawableResult,
} from './types';

export { MAX_PERPS_TOKENS } from './types';

// Calculations
export {
  // Position calculations
  calculatePnL,
  calculateBorrowFees,
  calculateLiquidationPrice,
  calculatePositionFee,
  calculateImbalanceFee,
  // LP calculations
  calculateLpValue,
  calculateLpMintAmount,
  calculateWithdrawAmount,
  calculateMaxWithdrawable,
  calculateUtilization,
  calculateBorrowRate,
  // Validation helpers
  isValidLeverage,
  wouldExceedUtilization,
  isValidPositionSize,
} from './calculations';

// Instructions
export {
  // Seeds and circuit IDs
  PERPS_SEEDS,
  PERPS_CIRCUIT_IDS,
  // PDA derivation
  derivePerpsPoolPda,
  derivePerpsMarketPda,
  derivePerpsVaultPda,
  derivePerpsLpMintPda,
  // Instruction builders - Trading
  buildOpenPositionWithProgram,
  buildClosePositionWithProgram,
  buildAddPerpsLiquidityWithProgram,
  buildRemovePerpsLiquidityWithProgram,
  // Instruction builders - Admin
  buildInitializePerpsPoolWithProgram,
  buildAddTokenToPoolWithProgram,
  buildAddMarketWithProgram,
  buildUpdatePoolConfigWithProgram,
  buildUpdateTokenStatusWithProgram,
  buildUpdateMarketStatusWithProgram,
  // Instruction builders - Keeper
  buildUpdateBorrowFeesWithProgram,
  buildLiquidatePositionWithProgram,
  // Keeper helpers
  shouldLiquidate,
  calculateLiquidationAmounts,
} from './instructions';

export type {
  // Instruction params - Trading
  OpenPositionInstructionParams,
  ClosePositionInstructionParams,
  AddPerpsLiquidityInstructionParams,
  RemovePerpsLiquidityInstructionParams,
  // Instruction params - Admin
  InitializePerpsPoolParams,
  AddTokenToPoolParams,
  AddMarketParams,
  UpdatePoolConfigParams,
  UpdateTokenStatusParams,
  UpdateMarketStatusParams,
  // Instruction params - Keeper
  LiquidatePositionInstructionParams,
} from './instructions';

// Oracle Integration
export {
  // Pyth Feed IDs
  PERPS_PYTH_FEED_IDS,
  // Feed ID helpers (feedIdToHex is exported from main pyth module)
  getFeedIdBySymbol,
  // Price fetching
  fetchPythPrice,
  fetchPythPriceUsd,
  fetchPythVaa,
  fetchPythPrices,
  // Price update helpers
  getPriceUpdateAccountAddress,
  isPriceUpdateValid,
  // Price calculations
  calculatePositionPrice,
  // Multi-feed support
  getPoolOraclePrices,
} from './oracle';

export type {
  // Oracle types
  PythPriceData,
  PriceUpdateResult,
} from './oracle';
