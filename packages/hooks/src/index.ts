/**
 * CloakCraft React Hooks
 */

export { CloakCraftProvider, useCloakCraft } from './provider';
export { useWallet, WALLET_DERIVATION_MESSAGE } from './useWallet';
export { useBalance, useAllBalances } from './useBalance';
export { useNotes, useNoteSelection } from './useNotes';
export { useShield } from './useShield';
export { useTransfer, useNoteSelector } from './useTransfer';
export { useUnshield } from './useUnshield';
export { useScanner, usePrivateBalance, useNullifierStatus } from './useScanner';
export { usePool, useInitializePool, usePoolList } from './usePool';
export { usePublicBalance, useSolBalance, useTokenBalances } from './usePublicBalance';
export { useOrders } from './useOrders';
export { useSwap, useAmmPools, useSwapQuote, useInitializeAmmPool, useAddLiquidity, useRemoveLiquidity } from './useSwap';

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
