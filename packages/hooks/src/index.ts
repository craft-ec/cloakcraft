/**
 * CloakCraft React Hooks
 */

export { CloakCraftProvider, useCloakCraft } from './provider';
export { useWallet, WALLET_DERIVATION_MESSAGE } from './useWallet';
export { useBalance, useAllBalances } from './useBalance';
export { useNotes, useNoteSelection } from './useNotes';
export { useShield } from './useShield';
export { useTransfer, useNoteSelector } from './useTransfer';
export type { TransferProgressStage } from './useTransfer';
export { useUnshield } from './useUnshield';
export type { UnshieldProgressStage } from './useUnshield';
export { useScanner, usePrivateBalance, useNullifierStatus } from './useScanner';
export { usePool, useInitializePool, usePoolList } from './usePool';
export { usePublicBalance, useSolBalance, useTokenBalances } from './usePublicBalance';
export { useOrders } from './useOrders';
export { useSwap, useAmmPools, useSwapQuote, useInitializeAmmPool, useAddLiquidity, useRemoveLiquidity } from './useSwap';
export type { SwapProgressStage, AddLiquidityProgressStage, RemoveLiquidityProgressStage } from './useSwap';

// Transaction history
export {
  useTransactionHistory,
  useRecentTransactions,
  TransactionType,
  TransactionStatus,
} from './useTransactionHistory';
export type { TransactionRecord, TransactionFilter } from './useTransactionHistory';

// Token prices
export {
  useTokenPrices,
  useTokenPrice,
  useSolPrice,
  usePortfolioValue,
  formatPrice,
  formatPriceChange,
} from './useTokenPrices';
export type { TokenPrice } from './useTokenPrices';

// Pool analytics
export {
  usePoolAnalytics,
  usePoolStats,
  useUserPosition,
  useImpermanentLoss,
  formatTvl,
  formatApy,
  formatShare,
} from './usePoolAnalytics';
export type { PoolStats, PoolAnalytics, UserPoolPosition } from './usePoolAnalytics';

// Consolidation
export {
  useConsolidation,
  useShouldConsolidate,
  useFragmentationScore,
} from './useConsolidation';
export type { ConsolidationState, UseConsolidationOptions, ConsolidationProgressStage, ConsolidationBatchInfo, ConsolidationProgressCallback } from './useConsolidation';

// Auto-consolidation
export {
  useAutoConsolidation,
  useIsConsolidationRecommended,
} from './useAutoConsolidation';
export type { UseAutoConsolidationResult, UseAutoConsolidationOptions } from './useAutoConsolidation';

// Protocol fees
export {
  useProtocolFees,
  useIsFreeOperation,
} from './useProtocolFees';
export type { ProtocolFeeConfig, UseProtocolFeesResult } from './useProtocolFees';

// Perpetual futures
export {
  // Pool & market fetching
  usePerpsPools,
  usePerpsPool,
  usePerpsMarkets,
  // Position operations
  useOpenPosition,
  useClosePosition,
  // Position scanning
  usePerpsPositions,
  // Liquidity operations
  usePerpsAddLiquidity,
  usePerpsRemoveLiquidity,
  // Calculations
  usePositionPnL,
  useLiquidationPrice,
  useLpValue,
  useLpMintPreview,
  useWithdrawPreview,
  useTokenUtilization,
  usePositionValidation,
  usePythPrice,
  usePythPrices,
  // Keeper
  useKeeperMonitor,
  useLiquidate,
  // Admin
  useInitializePerpsPool,
  useAddPerpsToken,
  useAddPerpsMarket,
  useUpdatePerpsPoolConfig,
} from './usePerps';
export type { PerpsProgressStage, ScannedPerpsPosition, LiquidatablePosition, PositionMetaStatus } from './usePerps';

// Voting / Governance
export {
  // Ballot fetching
  useBallots,
  useActiveBallots,
  useBallot,
  useBallotTally,
  useBallotTimeStatus,
  // Voting operations
  useVoteSnapshot,
  useVoteSpend,
  useChangeVote,
  useCloseVotePosition,
  useClaim,
  // Admin operations
  useResolveBallot,
  useFinalizeBallot,
  useDecryptTally,
  useIsBallotAuthority,
  // Calculations
  usePayoutPreview,
  useVoteValidation,
  useCanClaim,
} from './useVoting';
export type {
  VotingProgressStage,
  BallotWithAddress,
  VoteSnapshotOptions,
  VoteSpendOptions,
  ChangeVoteOptions,
  ClosePositionOptions,
  ClaimOptions,
  VoteResult,
  SpendResult,
  ClaimResult,
} from './useVoting';
