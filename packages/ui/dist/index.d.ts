export { CloakCraftProvider } from '@cloakcraft/hooks';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { PublicKey, Keypair } from '@solana/web3.js';
import { CSSProperties } from 'react';

/**
 * Wallet connection button component
 */
interface WalletButtonProps {
    className?: string;
    /** Show import option */
    showImport?: boolean;
    /** Solana wallet connection status */
    solanaConnected?: boolean;
    /** Sign message function from Solana wallet */
    signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}
declare function WalletButton({ className, showImport, solanaConnected, signMessage, }: WalletButtonProps): react_jsx_runtime.JSX.Element;

interface BalanceDisplayProps {
    tokenMint: PublicKey;
    decimals?: number;
    symbol?: string;
    showNoteCount?: boolean;
    className?: string;
}
declare function BalanceDisplay({ tokenMint, decimals, symbol, showNoteCount, className, }: BalanceDisplayProps): react_jsx_runtime.JSX.Element;
/**
 * Compact balance display for inline use
 */
declare function BalanceInline({ tokenMint, decimals, symbol, }: {
    tokenMint: PublicKey;
    decimals?: number;
    symbol?: string;
}): react_jsx_runtime.JSX.Element;

interface TokenInfo$a {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface ShieldFormProps {
    tokenMint: PublicKey;
    userTokenAccount: PublicKey | null;
    decimals?: number;
    symbol?: string;
    onSuccess?: (signature: string, commitment: Uint8Array) => void;
    onError?: (error: string) => void;
    className?: string;
    /** Wallet public key (for wallet adapter) */
    walletPublicKey?: PublicKey | null;
    /** Token list for dropdown */
    tokens?: TokenInfo$a[];
    /** Callback when token changes */
    onTokenChange?: (token: TokenInfo$a) => void;
}
declare function ShieldForm({ tokenMint, userTokenAccount, decimals, symbol, onSuccess, onError, className, walletPublicKey, tokens, onTokenChange, }: ShieldFormProps): react_jsx_runtime.JSX.Element;

interface TokenInfo$9 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface TransferFormProps {
    tokenMint: PublicKey;
    decimals?: number;
    symbol?: string;
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    className?: string;
    /** Wallet public key (for wallet adapter) */
    walletPublicKey?: PublicKey | null;
    /** Token list for dropdown */
    tokens?: TokenInfo$9[];
    /** Callback when token changes */
    onTokenChange?: (token: TokenInfo$9) => void;
}
declare function TransferForm({ tokenMint, decimals, symbol, onSuccess, onError, className, walletPublicKey, tokens, onTokenChange, }: TransferFormProps): react_jsx_runtime.JSX.Element;

interface TokenInfo$8 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface UnshieldFormProps {
    tokenMint: PublicKey;
    decimals?: number;
    symbol?: string;
    /** Default recipient token account */
    defaultRecipient?: PublicKey;
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    className?: string;
    /** Wallet public key (for wallet adapter) */
    walletPublicKey?: PublicKey | null;
    /** Token list for dropdown */
    tokens?: TokenInfo$8[];
    /** Callback when token changes */
    onTokenChange?: (token: TokenInfo$8) => void;
}
declare function UnshieldForm({ tokenMint, decimals, symbol, defaultRecipient, onSuccess, onError, className, walletPublicKey, tokens, onTokenChange, }: UnshieldFormProps): react_jsx_runtime.JSX.Element;

interface NotesListProps {
    tokenMint: PublicKey;
    decimals?: number;
    symbol?: string;
    className?: string;
    /** Auto-refresh interval in milliseconds (0 to disable) */
    autoRefreshMs?: number;
}
declare function NotesList({ tokenMint, decimals, symbol, className, autoRefreshMs, }: NotesListProps): react_jsx_runtime.JSX.Element;

interface TransactionHistoryProps {
    tokenMint?: PublicKey;
    decimals?: number;
    symbol?: string;
    maxItems?: number;
    className?: string;
}
declare function TransactionHistory({ tokenMint, decimals, symbol, maxItems, className, }: TransactionHistoryProps): react_jsx_runtime.JSX.Element;

/**
 * Order book component for the private market
 */
interface OrderBookProps {
    className?: string;
}
declare function OrderBook({ className }: OrderBookProps): react_jsx_runtime.JSX.Element;

interface InitializePoolFormProps {
    onSuccess?: (poolTx: string, counterTx: string) => void;
    onError?: (error: string) => void;
    className?: string;
    /** Payer keypair for transaction fees (optional if walletPublicKey provided) */
    payer?: Keypair;
    /** Wallet public key from wallet adapter */
    walletPublicKey?: PublicKey | null;
    /** Default token mint to pre-fill */
    defaultTokenMint?: PublicKey;
}
declare function InitializePoolForm({ onSuccess, onError, className, payer, walletPublicKey, defaultTokenMint, }: InitializePoolFormProps): react_jsx_runtime.JSX.Element;

interface PoolInfoProps {
    tokenMint: PublicKey;
    decimals?: number;
    symbol?: string;
    className?: string;
}
declare function PoolInfo({ tokenMint, decimals, symbol, className, }: PoolInfoProps): react_jsx_runtime.JSX.Element;
/**
 * Compact pool status badge
 */
declare function PoolStatusBadge({ tokenMint }: {
    tokenMint: PublicKey;
}): react_jsx_runtime.JSX.Element;

interface TokenInfo$7 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface TokenSelectorProps {
    /** List of available tokens */
    tokens: TokenInfo$7[];
    /** Currently selected token */
    selected?: PublicKey;
    /** Callback when token is selected */
    onSelect: (token: TokenInfo$7) => void;
    /** Show pool status badge */
    showPoolStatus?: boolean;
    /** Allow custom token input */
    allowCustom?: boolean;
    className?: string;
}
declare function TokenSelector({ tokens, selected, onSelect, showPoolStatus, allowCustom, className, }: TokenSelectorProps): react_jsx_runtime.JSX.Element;
/**
 * Common token presets for devnet/mainnet
 */
declare const DEVNET_TOKENS: TokenInfo$7[];
declare const MAINNET_TOKENS: TokenInfo$7[];

interface TokenInfo$6 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface PublicBalanceDisplayProps {
    /** Owner wallet address */
    owner: PublicKey;
    /** Token to display balance for */
    token?: TokenInfo$6;
    /** Show SOL balance alongside token */
    showSol?: boolean;
    /** Compact display mode */
    compact?: boolean;
    className?: string;
}
/**
 * Display a single token's public balance
 */
declare function PublicBalanceDisplay({ owner, token, showSol, compact, className, }: PublicBalanceDisplayProps): react_jsx_runtime.JSX.Element;
interface MultiTokenBalanceDisplayProps {
    owner: PublicKey;
    tokens: TokenInfo$6[];
    showSol?: boolean;
    className?: string;
}
/**
 * Display multiple token balances
 */
declare function MultiTokenBalanceDisplay({ owner, tokens, showSol, className, }: MultiTokenBalanceDisplayProps): react_jsx_runtime.JSX.Element;
/**
 * Simple balance summary for header/nav
 */
declare function BalanceSummary({ owner, token, className, }: {
    owner: PublicKey;
    token?: TokenInfo$6;
    className?: string;
}): react_jsx_runtime.JSX.Element;

interface TokenInfo$5 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface MultiPrivateBalanceDisplayProps {
    tokens: TokenInfo$5[];
    className?: string;
}
/**
 * Display multiple private token balances
 */
declare function MultiPrivateBalanceDisplay({ tokens, className, }: MultiPrivateBalanceDisplayProps): react_jsx_runtime.JSX.Element;

/**
 * Wallet Backup component
 *
 * Allows users to backup/export their spending key and view wallet info
 */
interface WalletBackupProps {
    className?: string;
    onBackupComplete?: () => void;
}
declare function WalletBackup({ className, onBackupComplete }: WalletBackupProps): react_jsx_runtime.JSX.Element;
/**
 * Import wallet from backup file
 */
interface WalletImportProps {
    className?: string;
    onImportSuccess?: () => void;
    onError?: (error: string) => void;
}
declare function WalletImport({ className, onImportSuccess, onError }: WalletImportProps): react_jsx_runtime.JSX.Element;
/**
 * Combined backup/import component
 */
declare function WalletManager({ className }: {
    className?: string;
}): react_jsx_runtime.JSX.Element;

interface TokenInfo$4 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface CreatePoolFormProps {
    tokens: TokenInfo$4[];
    onSuccess?: (signature: string, tokenA: TokenInfo$4, tokenB: TokenInfo$4) => void;
    onError?: (error: string) => void;
    className?: string;
    /** Wallet public key for transaction signing */
    walletPublicKey?: PublicKey | null;
}
declare function CreatePoolForm({ tokens, onSuccess, onError, className, walletPublicKey, }: CreatePoolFormProps): react_jsx_runtime.JSX.Element;

type AmmTab = 'swap' | 'add' | 'remove';
interface SwapPanelProps {
    /** Optional initial tab */
    initialTab?: AmmTab;
    /** Wallet public key for transactions */
    walletPublicKey?: PublicKey | null;
}
declare function SwapPanel({ initialTab, walletPublicKey }: SwapPanelProps): react_jsx_runtime.JSX.Element;

interface TokenInfo$3 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface SwapFormProps {
    tokens: TokenInfo$3[];
    ammPools: any[];
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    className?: string;
    walletPublicKey?: PublicKey | null;
}
declare function SwapForm({ tokens, ammPools, onSuccess, onError, className, walletPublicKey, }: SwapFormProps): react_jsx_runtime.JSX.Element;

interface TokenInfo$2 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface AddLiquidityFormProps {
    tokens: TokenInfo$2[];
    ammPools: any[];
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    className?: string;
    walletPublicKey?: PublicKey | null;
}
declare function AddLiquidityForm({ tokens, ammPools, onSuccess, onError, className, walletPublicKey, }: AddLiquidityFormProps): react_jsx_runtime.JSX.Element;

interface TokenInfo$1 {
    mint: PublicKey;
    symbol: string;
    name: string;
    decimals: number;
    logoUri?: string;
}
interface RemoveLiquidityFormProps {
    tokens: TokenInfo$1[];
    ammPools: any[];
    onSuccess?: (signature: string) => void;
    onError?: (error: string) => void;
    className?: string;
    walletPublicKey?: PublicKey | null;
}
declare function RemoveLiquidityForm({ tokens, ammPools, onSuccess, onError, className, walletPublicKey, }: RemoveLiquidityFormProps): react_jsx_runtime.JSX.Element;

interface TokenInfo {
    mint: PublicKey;
    symbol: string;
    decimals: number;
}
interface AmmPoolDetailsProps {
    tokenA: TokenInfo;
    tokenB: TokenInfo;
    pool: any;
    className?: string;
}
declare function AmmPoolDetails({ tokenA, tokenB, pool, className, }: AmmPoolDetailsProps): react_jsx_runtime.JSX.Element;

/**
 * Shared styles for CloakCraft UI components
 * Theme: Technical Precision - Clean light theme emphasizing cryptographic clarity
 */

declare const colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    success: string;
    successLight: string;
    error: string;
    errorLight: string;
    warning: string;
    warningLight: string;
    text: string;
    textMuted: string;
    textLight: string;
    border: string;
    borderHover: string;
    background: string;
    backgroundMuted: string;
    backgroundDark: string;
};
declare const styles: Record<string, CSSProperties>;

export { AddLiquidityForm, AmmPoolDetails, BalanceDisplay, BalanceInline, BalanceSummary, CreatePoolForm, DEVNET_TOKENS, InitializePoolForm, MAINNET_TOKENS, MultiPrivateBalanceDisplay, MultiTokenBalanceDisplay, NotesList, OrderBook, PoolInfo, PoolStatusBadge, PublicBalanceDisplay, RemoveLiquidityForm, ShieldForm, SwapForm, SwapPanel, TokenSelector, TransactionHistory, TransferForm, UnshieldForm, WalletBackup, WalletButton, WalletImport, WalletManager, colors, styles };
