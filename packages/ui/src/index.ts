/**
 * CloakCraft UI Components
 */

// Provider (re-export from hooks)
export { CloakCraftProvider } from '@cloakcraft/hooks';

// Core Components
export { WalletButton } from './components/WalletButton';
export { BalanceDisplay, BalanceInline } from './components/BalanceDisplay';
export { ShieldForm } from './components/ShieldForm';
export { TransferForm } from './components/TransferForm';
export { UnshieldForm } from './components/UnshieldForm';
export { NotesList } from './components/NotesList';
export { TransactionHistory } from './components/TransactionHistory';
export { OrderBook } from './components/OrderBook';

// Pool Management
export { InitializePoolForm } from './components/InitializePoolForm';
export { PoolInfo, PoolStatusBadge } from './components/PoolInfo';
export { TokenSelector, DEVNET_TOKENS, MAINNET_TOKENS } from './components/TokenSelector';

// Balance Display
export {
  PublicBalanceDisplay,
  MultiTokenBalanceDisplay,
  BalanceSummary,
} from './components/PublicBalanceDisplay';
export { MultiPrivateBalanceDisplay } from './components/MultiPrivateBalanceDisplay';

// Wallet Management
export { WalletBackup, WalletImport, WalletManager } from './components/WalletBackup';

// AMM / Swap
export { CreatePoolForm } from './components/CreatePoolForm';
export { SwapPanel } from './components/SwapPanel';
export { SwapForm } from './components/SwapForm';
export { AddLiquidityForm } from './components/AddLiquidityForm';
export { RemoveLiquidityForm } from './components/RemoveLiquidityForm';
export { AmmPoolDetails } from './components/AmmPoolDetails';

// Perpetuals Components
export { PositionCard } from './components/PositionCard';
export type { PositionData, PositionCardProps } from './components/PositionCard';
export { TradeForm } from './components/TradeForm';
export type { TradeFormProps, NoteOption as TradeNoteOption, MarketOption } from './components/TradeForm';
export { LiquidationWarning } from './components/LiquidationWarning';
export type { LiquidationWarningProps } from './components/LiquidationWarning';
export { PoolStats } from './components/PoolStats';
export type { PoolStatsProps, TokenUtilization } from './components/PoolStats';

// Voting Components
export { BallotCard } from './components/BallotCard';
export type {
  BallotCardProps,
  BallotOption,
  BallotStatus as BallotCardStatus,
  BindingMode,
  RevealMode as BallotRevealMode,
} from './components/BallotCard';
export { VoteForm } from './components/VoteForm';
export type { VoteFormProps, VoteOption, NoteOption as VoteNoteOption } from './components/VoteForm';
export { ClaimButton } from './components/ClaimButton';
export type { ClaimButtonProps } from './components/ClaimButton';
export { TallyDisplay } from './components/TallyDisplay';
export type { TallyDisplayProps, TallyOption } from './components/TallyDisplay';

// Styles (for customization)
export { styles, colors } from './styles';
