import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as _cloakcraft_sdk from '@cloakcraft/sdk';
import { CloakCraftClient, Wallet, AnchorWallet, SelectionStrategy, TransactionFilter, TransactionRecord, TransactionType, TransactionStatus, TokenPrice, PoolAnalytics, PoolStats, UserPoolPosition, FragmentationReport, ConsolidationSuggestion, ConsolidationBatch, AutoConsolidationState, PerpsPoolState, PerpsMarketState, DecryptedPerpsPosition, PerpsPosition, PnLResult, LiquidationPriceResult, LpValueResult, WithdrawableResult, Ballot } from '@cloakcraft/sdk';
export { PoolAnalytics, PoolStats, TokenPrice, TransactionFilter, TransactionRecord, TransactionStatus, TransactionType, UserPoolPosition, formatApy, formatPrice, formatPriceChange, formatShare, formatTvl } from '@cloakcraft/sdk';
import * as _cloakcraft_types from '@cloakcraft/types';
import { SyncStatus, DecryptedNote, TransactionResult, StealthAddress, PoolState, OrderState, AmmPoolState, DecryptedLpNote } from '@cloakcraft/types';

interface CloakCraftContextValue {
    client: CloakCraftClient | null;
    wallet: Wallet | null;
    isConnected: boolean;
    isInitialized: boolean;
    isInitializing: boolean;
    isProverReady: boolean;
    isProgramReady: boolean;
    isSyncing: boolean;
    syncStatus: SyncStatus | null;
    notes: DecryptedNote[];
    error: string | null;
    connect: (spendingKey: Uint8Array) => Promise<void>;
    disconnect: () => void;
    sync: (tokenMint?: PublicKey, clearCache?: boolean) => Promise<void>;
    createWallet: () => Wallet;
    /** Set the Anchor program instance (version-agnostic) - @deprecated use setWallet instead */
    setProgram: (program: unknown) => void;
    /** Set wallet adapter and create AnchorProvider/Program internally (matches scalecraft pattern) */
    setWallet: (wallet: AnchorWallet) => void;
    initializeProver: (circuits?: string[]) => Promise<void>;
}
interface CloakCraftProviderProps {
    children: ReactNode;
    /** Solana RPC URL (use this OR connection, not both) */
    rpcUrl?: string;
    /** Solana Connection object from wallet adapter (preferred - matches scalecraft pattern) */
    connection?: Connection;
    /** Indexer URL for merkle proof fetching */
    indexerUrl: string;
    /** CloakCraft program ID */
    programId: string;
    /** Helius API key for Light Protocol (note scanning, nullifier detection) */
    heliusApiKey?: string;
    /** Network (devnet or mainnet-beta) */
    network?: 'devnet' | 'mainnet-beta';
    /** Auto-initialize Poseidon on mount */
    autoInitialize?: boolean;
    /** Connected Solana wallet public key (for per-wallet stealth key storage) */
    solanaWalletPubkey?: string;
    /** Address Lookup Table addresses for atomic transaction compression (optional) */
    addressLookupTables?: string[];
}
declare function CloakCraftProvider({ children, rpcUrl, connection, indexerUrl, programId, heliusApiKey, network, autoInitialize, solanaWalletPubkey, addressLookupTables, }: CloakCraftProviderProps): react_jsx_runtime.JSX.Element;
declare function useCloakCraft(): CloakCraftContextValue;

/**
 * Wallet management hook
 */
declare function useWallet(): {
    wallet: _cloakcraft_sdk.Wallet | null;
    publicKey: _cloakcraft_types.Point | null;
    isConnected: boolean;
    isConnecting: boolean;
    isInitialized: boolean;
    isInitializing: boolean;
    error: string | null;
    connect: (spendingKey: Uint8Array) => Promise<void>;
    disconnect: () => void;
    createWallet: () => _cloakcraft_sdk.Wallet;
    createAndConnect: () => Promise<_cloakcraft_sdk.Wallet>;
    deriveFromSignature: (signature: Uint8Array) => Promise<_cloakcraft_sdk.Wallet>;
    importFromSeed: (seedPhrase: string) => Promise<void>;
    importFromKey: (spendingKey: Uint8Array) => Promise<void>;
    exportSpendingKey: () => Uint8Array<ArrayBufferLike> | null;
};
/**
 * Message to sign for wallet derivation
 */
declare const WALLET_DERIVATION_MESSAGE = "CloakCraft Stealth Wallet v1";

/**
 * Balance tracking hook
 */

interface TokenBalance {
    mint: PublicKey;
    amount: bigint;
    noteCount: number;
}
declare function useBalance(tokenMint?: PublicKey): {
    balance: bigint;
    isLoading: boolean;
    refresh: () => Promise<void>;
};
declare function useAllBalances(): {
    balances: TokenBalance[];
    isLoading: boolean;
    refresh: () => Promise<void>;
};

/**
 * Note management hook
 */

declare function useNotes(tokenMint?: PublicKey): {
    notes: DecryptedNote[];
    totalAmount: bigint;
    noteCount: number;
    sync: (tokenMint?: PublicKey, clearCache?: boolean) => Promise<void>;
    isSyncing: boolean;
};
declare function useNoteSelection(tokenMint: PublicKey): {
    selectedNotes: DecryptedNote[];
    selectedAmount: bigint;
    toggleNote: (note: DecryptedNote) => void;
    selectAll: () => void;
    clearSelection: () => void;
};

/**
 * Shield operation hook
 *
 * Shields tokens into the privacy pool
 */

interface ShieldOptions {
    /** Token mint to shield */
    tokenMint: PublicKey;
    /** Amount to shield (in lamports/smallest unit) */
    amount: bigint;
    /** User's token account (source of tokens) */
    userTokenAccount: PublicKey;
    /** Wallet public key (for wallet adapter) */
    walletPublicKey?: PublicKey;
    /** Optional: Shield to a different recipient */
    recipient?: {
        x: Uint8Array;
        y: Uint8Array;
    };
}
declare function useShield(): {
    shield: (options: ShieldOptions, payer?: Keypair) => Promise<(TransactionResult & {
        commitment: Uint8Array;
        randomness: Uint8Array;
    }) | null>;
    reset: () => void;
    isShielding: boolean;
    error: string | null;
    result: (TransactionResult & {
        commitment: Uint8Array;
        randomness: Uint8Array;
    }) | null;
};

/** Simple transfer output */
interface TransferOutput {
    recipient: StealthAddress;
    amount: bigint;
}
/** Unshield option for partial withdrawal */
interface UnshieldOption {
    amount: bigint;
    recipient: PublicKey;
}
/** Progress stages for transfer operation */
type TransferProgressStage = 'scanning' | 'preparing' | 'generating' | 'building' | 'approving' | 'executing' | 'confirming';
/** Transfer options */
interface TransferOptions {
    inputs: DecryptedNote[];
    outputs: TransferOutput[];
    unshield?: UnshieldOption;
    walletPublicKey?: PublicKey;
    onProgress?: (stage: TransferProgressStage) => void;
}
declare function useTransfer(): {
    transfer: (inputsOrOptions: DecryptedNote[] | TransferOptions, outputs?: TransferOutput[], unshield?: UnshieldOption, walletPublicKey?: PublicKey) => Promise<TransactionResult | null>;
    reset: () => void;
    isTransferring: boolean;
    error: string | null;
    result: TransactionResult | null;
};
/**
 * Hook for selecting notes for a transfer
 *
 * Uses SmartNoteSelector for intelligent note selection based on:
 * - Available circuit types (1x2, 2x2, 3x2)
 * - Selection strategy
 * - Fee amounts
 */
declare function useNoteSelector(tokenMint: PublicKey): {
    availableNotes: DecryptedNote[];
    selected: DecryptedNote[];
    totalAvailable: bigint;
    totalSelected: bigint;
    selectNotesForAmount: (targetAmount: bigint, options?: {
        strategy?: SelectionStrategy;
        maxInputs?: number;
        feeAmount?: bigint;
    }) => DecryptedNote[];
    getSelectionResult: (targetAmount: bigint, options?: {
        strategy?: SelectionStrategy;
        maxInputs?: number;
        feeAmount?: bigint;
    }) => _cloakcraft_sdk.NoteSelectionResult;
    clearSelection: () => void;
    fragmentation: _cloakcraft_sdk.FragmentationReport;
    shouldConsolidate: boolean;
};

/**
 * Unshield operation hook
 *
 * Withdraws tokens from the privacy pool back to a public wallet.
 * This is done via a transfer with an unshield output (no recipient, just withdrawal).
 */

/** Progress stages for unshield operation */
type UnshieldProgressStage = 'scanning' | 'preparing' | 'generating' | 'building' | 'approving' | 'executing' | 'confirming';
interface UnshieldOptions {
    /** Notes to spend */
    inputs: DecryptedNote[];
    /** Amount to withdraw */
    amount: bigint;
    /** Recipient wallet address (will derive token account) or token account directly */
    recipient: PublicKey;
    /** Wallet public key (for wallet adapter) */
    walletPublicKey?: PublicKey;
    /** If true, recipient is a wallet address and token account will be derived */
    isWalletAddress?: boolean;
    /** Optional progress callback */
    onProgress?: (stage: UnshieldProgressStage) => void;
}
declare function useUnshield(): {
    unshield: (options: UnshieldOptions) => Promise<TransactionResult | null>;
    reset: () => void;
    isUnshielding: boolean;
    error: string | null;
    result: TransactionResult | null;
};

/**
 * Scanner hook for automatic note detection
 *
 * Uses Light Protocol to scan for notes and track balances in real-time.
 *
 * OPTIMIZED: Includes debouncing and caching support.
 */

/**
 * Scanner statistics for performance monitoring
 */
interface ScannerStats {
    totalAccounts: number;
    cachedHits: number;
    decryptAttempts: number;
    successfulDecrypts: number;
    scanDurationMs: number;
    rpcCalls: number;
}
interface UsePrivateBalanceResult {
    balance: bigint;
    noteCount: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}
/**
 * Hook for getting private balance via Light Protocol scanning
 *
 * This uses the SDK's getPrivateBalance method which scans for unspent notes
 * and filters out spent ones using nullifier detection.
 */
declare function usePrivateBalance(tokenMint?: PublicKey): UsePrivateBalanceResult;
/**
 * Hook for scanning notes with auto-refresh
 *
 * OPTIMIZED: Includes debouncing to prevent rapid scans
 *
 * @param tokenMint - Filter to specific token (optional)
 * @param autoRefreshMs - Auto-refresh interval in ms (optional)
 * @param debounceMs - Debounce rapid scan calls (default: 500ms)
 */
declare function useScanner(tokenMint?: PublicKey, autoRefreshMs?: number, debounceMs?: number): {
    notes: DecryptedNote[];
    totalAmount: bigint;
    noteCount: number;
    scan: () => Promise<void>;
    scanNow: () => Promise<void>;
    stats: ScannerStats | null;
    isScanning: boolean;
    lastScanned: Date | null;
    error: string | null;
};
/**
 * Hook for checking if a specific note has been spent
 */
declare function useNullifierStatus(note: DecryptedNote | null, pool?: PublicKey): {
    isSpent: boolean | null;
    isChecking: boolean;
    error: string | null;
    check: () => Promise<void>;
};

/**
 * Pool management hooks
 *
 * Hooks for fetching pool info and initializing new pools
 */

/**
 * Hook for fetching pool information
 */
declare function usePool(tokenMint?: PublicKey): {
    pool: PoolState | null;
    poolPda: PublicKey | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    exists: boolean;
};
/**
 * Hook for initializing a new pool
 */
declare function useInitializePool(): {
    initializePool: (tokenMint: PublicKey, payer: Keypair) => Promise<{
        poolTx: string;
        counterTx: string;
    } | null>;
    initializePoolWithWallet: (tokenMint: PublicKey, walletPublicKey: PublicKey) => Promise<{
        poolTx: string;
        counterTx: string;
    } | null>;
    reset: () => void;
    isInitializing: boolean;
    error: string | null;
    result: {
        poolTx: string;
        counterTx: string;
    } | null;
};
/**
 * Hook for listing all pools (requires indexer or on-chain scanning)
 */
declare function usePoolList(): {
    pools: {
        tokenMint: PublicKey;
        poolPda: PublicKey;
    }[];
    isLoading: boolean;
    error: string | null;
    addPool: (tokenMint: PublicKey) => void;
    removePool: (tokenMint: PublicKey) => void;
};

/**
 * Public balance hook
 *
 * Fetches the user's public (non-shielded) token balance
 */

/**
 * Hook for fetching public token balance
 *
 * @param tokenMint - The token mint to check balance for
 * @param owner - The wallet owner (defaults to connected Solana wallet)
 */
declare function usePublicBalance(tokenMint?: PublicKey, owner?: PublicKey): {
    refresh: () => Promise<void>;
    balance: bigint;
    tokenAccount: PublicKey | null;
    isLoading: boolean;
    error: string | null;
};
/**
 * Hook for fetching SOL balance
 */
declare function useSolBalance(owner?: PublicKey): {
    balance: bigint;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for fetching multiple token balances at once
 */
declare function useTokenBalances(tokenMints: PublicKey[], owner?: PublicKey): {
    balances: Map<string, bigint>;
    getBalance: (tokenMint: PublicKey) => bigint;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};

/**
 * Market orders hook
 */

declare function useOrders(): {
    refresh: () => Promise<void>;
    orders: OrderState[];
    isLoading: boolean;
    error: string | null;
};

/**
 * Swap operation hook
 *
 * Provides interface for AMM swaps
 */

/** Progress stages for swap operation */
type SwapProgressStage = 'preparing' | 'generating' | 'building' | 'approving' | 'executing' | 'confirming';
interface SwapOptions {
    /** Input note to spend */
    input: DecryptedNote;
    /** AMM pool to swap through */
    pool: AmmPoolState & {
        address: PublicKey;
    };
    /** Swap direction */
    swapDirection: 'aToB' | 'bToA';
    /** Amount to swap */
    swapAmount: bigint;
    /** Slippage tolerance in basis points (e.g., 50 = 0.5%) */
    slippageBps?: number;
    /** Optional progress callback */
    onProgress?: (stage: SwapProgressStage) => void;
}
declare function useSwap(): {
    swap: (options: SwapOptions) => Promise<TransactionResult | null>;
    reset: () => void;
    isSwapping: boolean;
    error: string | null;
    result: TransactionResult | null;
};
/**
 * Hook for fetching AMM pools
 */
declare function useAmmPools(): {
    pools: (AmmPoolState & {
        address: PublicKey;
    })[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for swap quote calculation
 */
declare function useSwapQuote(pool: (AmmPoolState & {
    address: PublicKey;
}) | null, swapDirection: 'aToB' | 'bToA', inputAmount: bigint): {
    outputAmount: bigint;
    minOutput: bigint;
    priceImpact: number;
} | null;
/**
 * Hook for initializing AMM pool
 */
declare function useInitializeAmmPool(): {
    initializePool: (tokenAMint: PublicKey, tokenBMint: PublicKey, feeBps?: number, poolType?: "constantProduct" | "stableSwap", amplification?: number) => Promise<string | null>;
    reset: () => void;
    isInitializing: boolean;
    error: string | null;
    result: string | null;
};
/** Progress stages for add liquidity operation */
type AddLiquidityProgressStage = 'preparing' | 'generating' | 'building' | 'approving' | 'executing' | 'confirming';
/**
 * Hook for adding liquidity
 */
declare function useAddLiquidity(): {
    addLiquidity: (options: {
        pool: AmmPoolState & {
            address: PublicKey;
        };
        inputA: DecryptedNote;
        inputB: DecryptedNote;
        amountA: bigint;
        amountB: bigint;
        slippageBps?: number;
        onProgress?: (stage: AddLiquidityProgressStage) => void;
    }) => Promise<TransactionResult | null>;
    reset: () => void;
    isAdding: boolean;
    error: string | null;
    result: TransactionResult | null;
};
/** Progress stages for remove liquidity operation */
type RemoveLiquidityProgressStage = 'preparing' | 'generating' | 'building' | 'approving' | 'executing' | 'confirming';
/**
 * Hook for removing liquidity
 */
declare function useRemoveLiquidity(): {
    removeLiquidity: (options: {
        pool: AmmPoolState & {
            address: PublicKey;
        };
        lpInput: DecryptedNote;
        lpAmount: bigint;
        slippageBps?: number;
        onProgress?: (stage: RemoveLiquidityProgressStage) => void;
    }) => Promise<TransactionResult | null>;
    reset: () => void;
    isRemoving: boolean;
    error: string | null;
    result: TransactionResult | null;
};

/**
 * Transaction History Hook
 *
 * Provides access to transaction history with automatic persistence.
 */

interface UseTransactionHistoryResult {
    /** Transaction history records */
    transactions: TransactionRecord[];
    /** Whether history is loading */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Add a new transaction */
    addTransaction: (type: TransactionType, tokenMint: string | PublicKey, amount: bigint, options?: {
        tokenSymbol?: string;
        secondaryAmount?: bigint;
        secondaryTokenMint?: string | PublicKey;
        secondaryTokenSymbol?: string;
        recipient?: string;
        metadata?: Record<string, unknown>;
    }) => Promise<TransactionRecord | null>;
    /** Update an existing transaction */
    updateTransaction: (id: string, updates: {
        status?: TransactionStatus;
        signature?: string;
        error?: string;
    }) => Promise<TransactionRecord | null>;
    /** Mark transaction as confirmed */
    confirmTransaction: (id: string, signature: string) => Promise<TransactionRecord | null>;
    /** Mark transaction as failed */
    failTransaction: (id: string, error: string) => Promise<TransactionRecord | null>;
    /** Refresh transaction history */
    refresh: () => Promise<void>;
    /** Clear all history */
    clearHistory: () => Promise<void>;
    /** Get transaction count */
    count: number;
    /** Transaction summary */
    summary: {
        total: number;
        pending: number;
        confirmed: number;
        failed: number;
    };
}
declare function useTransactionHistory(filter?: TransactionFilter): UseTransactionHistoryResult;
/**
 * Hook for recent transactions (simplified view)
 */
declare function useRecentTransactions(limit?: number): UseTransactionHistoryResult;

/**
 * Token Prices Hook
 *
 * Provides token price data with automatic caching and refresh.
 */

interface UseTokenPricesResult {
    /** Map of token mint to price */
    prices: Map<string, TokenPrice>;
    /** Get price for a specific token */
    getPrice: (mint: string | PublicKey) => TokenPrice | undefined;
    /** Get USD value for token amount */
    getUsdValue: (mint: string | PublicKey, amount: bigint, decimals: number) => number;
    /** Whether prices are loading */
    isLoading: boolean;
    /** Error message if any */
    error: string | null;
    /** Refresh prices */
    refresh: () => Promise<void>;
    /** SOL price in USD */
    solPrice: number;
    /** Last update timestamp */
    lastUpdated: number | null;
    /** Whether price API is available */
    isAvailable: boolean;
    /** Force retry (reset backoff) */
    forceRetry: () => Promise<void>;
}
/**
 * Hook for fetching token prices
 */
declare function useTokenPrices(mints: (string | PublicKey)[], refreshInterval?: number): UseTokenPricesResult;
/**
 * Hook for a single token price
 */
declare function useTokenPrice(mint: string | PublicKey | null): {
    price: TokenPrice | null;
    priceUsd: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for SOL price
 */
declare function useSolPrice(refreshInterval?: number): {
    price: number;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for calculating total portfolio value
 */
declare function usePortfolioValue(balances: Array<{
    mint: string | PublicKey;
    amount: bigint;
    decimals: number;
}>): {
    totalValue: number;
    breakdown: {
        mint: string;
        amount: bigint;
        decimals: number;
        priceUsd: number;
        valueUsd: number;
        percentage: number;
    }[];
    isLoading: boolean;
    error: string | null;
};

/**
 * Pool Analytics Hook
 *
 * Provides pool statistics, TVL, and user position data.
 */

interface UsePoolAnalyticsResult {
    /** Pool analytics data */
    analytics: PoolAnalytics | null;
    /** Total TVL across all pools */
    totalTvl: number;
    /** Formatted total TVL */
    formattedTvl: string;
    /** Number of pools */
    poolCount: number;
    /** Individual pool stats */
    poolStats: PoolStats[];
    /** Whether loading */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Refresh analytics */
    refresh: () => Promise<void>;
    /** Last update timestamp */
    lastUpdated: number | null;
}
/**
 * Hook for overall pool analytics
 */
declare function usePoolAnalytics(decimalsMap?: Map<string, number>, refreshInterval?: number): UsePoolAnalyticsResult;
interface UsePoolStatsResult {
    /** Pool statistics */
    stats: PoolStats | null;
    /** Whether loading */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Refresh stats */
    refresh: () => Promise<void>;
}
/**
 * Hook for single pool statistics
 */
declare function usePoolStats(pool: (AmmPoolState & {
    address: PublicKey;
}) | null, tokenADecimals?: number, tokenBDecimals?: number): UsePoolStatsResult;
interface UseUserPositionResult {
    /** User's position in the pool */
    position: UserPoolPosition | null;
    /** LP balance */
    lpBalance: bigint;
    /** Share percentage */
    sharePercent: number;
    /** Position value in USD */
    valueUsd: number;
    /** Whether loading */
    isLoading: boolean;
    /** Error message */
    error: string | null;
    /** Refresh position */
    refresh: () => Promise<void>;
}
/**
 * Hook for user's position in a pool
 */
declare function useUserPosition(pool: (AmmPoolState & {
    address: PublicKey;
}) | null, lpBalance: bigint, tokenADecimals?: number, tokenBDecimals?: number): UseUserPositionResult;
/**
 * Hook for impermanent loss calculation
 */
declare function useImpermanentLoss(initialPriceRatio: number, currentPriceRatio: number): {
    impermanentLoss: number;
    formattedLoss: string;
};

/** Progress stages for consolidation operation */
type ConsolidationProgressStage = 'preparing' | 'generating' | 'building' | 'approving' | 'executing' | 'confirming' | 'syncing';
/** Batch info passed to progress callback */
interface ConsolidationBatchInfo {
    current: number;
    total: number;
}
/** Progress callback type for consolidation */
type ConsolidationProgressCallback = (stage: ConsolidationProgressStage, batchInfo?: ConsolidationBatchInfo) => void;
/**
 * Consolidation state
 */
interface ConsolidationState {
    isAnalyzing: boolean;
    isConsolidating: boolean;
    currentBatch: number;
    totalBatches: number;
    error: string | null;
}
/**
 * Consolidation hook options
 */
interface UseConsolidationOptions {
    /** Token mint to consolidate (required) */
    tokenMint: PublicKey;
    /** Dust threshold in smallest units (default: 1000) */
    dustThreshold?: bigint;
    /** Max notes per consolidation batch (default: 3) */
    maxNotesPerBatch?: number;
}
/**
 * Hook for note consolidation
 *
 * @param options - Consolidation options
 * @returns Consolidation tools and state
 */
declare function useConsolidation(options: UseConsolidationOptions): {
    fragmentationReport: FragmentationReport;
    suggestions: ConsolidationSuggestion[];
    consolidationPlan: ConsolidationBatch[];
    summary: {
        totalNotes: number;
        dustNotes: number;
        totalBalance: bigint;
        shouldConsolidate: boolean;
        estimatedBatches: number;
        message: string;
    };
    tokenNotes: _cloakcraft_types.DecryptedNote[];
    noteCount: number;
    shouldConsolidate: boolean;
    estimatedCost: bigint;
    consolidate: (onProgress?: ConsolidationProgressCallback, targetAmount?: bigint, maxInputs?: number) => Promise<void>;
    consolidateBatch: (batchIndex: number) => Promise<void>;
    canConsolidate: boolean;
    isAnalyzing: boolean;
    isConsolidating: boolean;
    currentBatch: number;
    totalBatches: number;
    error: string | null;
};
/**
 * Simple hook for checking if consolidation is recommended
 */
declare function useShouldConsolidate(tokenMint: PublicKey): boolean;
/**
 * Hook for getting fragmentation score
 */
declare function useFragmentationScore(tokenMint: PublicKey): number;

/**
 * Auto-Consolidation Hook
 *
 * React hook for managing automatic note consolidation in the background.
 */

/**
 * Auto-consolidation hook result
 */
interface UseAutoConsolidationResult {
    /** Current state */
    state: AutoConsolidationState;
    /** Whether auto-consolidation is enabled */
    isEnabled: boolean;
    /** Whether consolidation is currently recommended */
    isRecommended: boolean;
    /** Last fragmentation report */
    lastReport: FragmentationReport | null;
    /** Enable auto-consolidation */
    enable: () => void;
    /** Disable auto-consolidation */
    disable: () => void;
    /** Toggle auto-consolidation */
    toggle: () => void;
    /** Manually trigger a check */
    checkNow: () => void;
    /** Estimated cost of consolidation */
    estimatedCost: bigint;
}
/**
 * Auto-consolidation hook options
 */
interface UseAutoConsolidationOptions {
    /** Token mint to monitor (required) */
    tokenMint: PublicKey;
    /** Initial enabled state (default: false) */
    initialEnabled?: boolean;
    /** Fragmentation threshold to trigger (default: 60) */
    fragmentationThreshold?: number;
    /** Max note count before triggering (default: 8) */
    maxNoteCount?: number;
    /** Max dust notes before triggering (default: 3) */
    maxDustNotes?: number;
    /** Dust threshold in smallest units (default: 1000) */
    dustThreshold?: bigint;
    /** Check interval in ms (default: 60000) */
    checkIntervalMs?: number;
}
/**
 * Hook for managing automatic note consolidation
 *
 * @param options - Configuration options
 * @returns Auto-consolidation controls and state
 */
declare function useAutoConsolidation(options: UseAutoConsolidationOptions): UseAutoConsolidationResult;
/**
 * Simple hook for checking if auto-consolidation is recommended
 */
declare function useIsConsolidationRecommended(tokenMint: PublicKey): boolean;

/**
 * Protocol Fees Hook
 *
 * Fetches and caches the protocol fee configuration from the chain.
 */

/**
 * Protocol fee configuration
 */
interface ProtocolFeeConfig {
    /** Transfer fee in basis points (100 = 1%) */
    transferFeeBps: number;
    /** Unshield fee in basis points */
    unshieldFeeBps: number;
    /** Protocol's share of LP swap fees in basis points (2000 = 20%) */
    swapFeeShareBps: number;
    /** Remove liquidity fee in basis points */
    removeLiquidityFeeBps: number;
    /** Whether fees are enabled */
    feesEnabled: boolean;
    /** Treasury address */
    treasury: PublicKey;
    /** Authority who can update fees */
    authority: PublicKey;
}
/**
 * Hook result
 */
interface UseProtocolFeesResult {
    /** Fee configuration (null if not loaded) */
    config: ProtocolFeeConfig | null;
    /** Whether the config is loading */
    isLoading: boolean;
    /** Error message if failed to load */
    error: string | null;
    /** Refresh the config */
    refresh: () => Promise<void>;
    /** Calculate fee for a given amount and operation */
    calculateFee: (amount: bigint, operation: 'transfer' | 'unshield' | 'swap' | 'remove_liquidity') => bigint;
}
/**
 * Hook for fetching and using protocol fees
 */
declare function useProtocolFees(): UseProtocolFeesResult;
/**
 * Hook to check if an operation is free
 */
declare function useIsFreeOperation(operation: 'shield' | 'add_liquidity' | 'consolidate' | 'transfer' | 'unshield' | 'swap' | 'remove_liquidity'): boolean;

/**
 * Perpetual Futures hooks
 *
 * Provides interface for perps operations: positions, liquidity, and calculations
 */

/** Progress stages for perps operations */
type PerpsProgressStage = 'preparing' | 'generating' | 'building' | 'approving' | 'executing' | 'confirming';
interface OpenPositionOptions {
    /** Input margin note to spend */
    marginInput: DecryptedNote;
    /** Perps pool */
    pool: PerpsPoolState & {
        address: PublicKey;
    };
    /** Market to trade */
    market: PerpsMarketState & {
        address: PublicKey;
    };
    /** Position direction */
    direction: 'long' | 'short';
    /** Margin amount */
    marginAmount: bigint;
    /** Leverage (1-100) */
    leverage: number;
    /** Current oracle price */
    oraclePrice: bigint;
    /** Optional progress callback */
    onProgress?: (stage: PerpsProgressStage) => void;
}
interface ClosePositionOptions$1 {
    /** Position to close */
    position: DecryptedPerpsPosition;
    /** Perps pool */
    pool: PerpsPoolState & {
        address: PublicKey;
    };
    /** Market */
    market: PerpsMarketState & {
        address: PublicKey;
    };
    /** Current oracle price */
    oraclePrice: bigint;
    /** Optional progress callback */
    onProgress?: (stage: PerpsProgressStage) => void;
}
interface AddPerpsLiquidityOptions {
    /** Input token note to deposit */
    tokenInput: DecryptedNote;
    /** Perps pool */
    pool: PerpsPoolState & {
        address: PublicKey;
    };
    /** Token index in pool */
    tokenIndex: number;
    /** Deposit amount */
    depositAmount: bigint;
    /** Current oracle prices for all tokens */
    oraclePrices: bigint[];
    /** Optional progress callback */
    onProgress?: (stage: PerpsProgressStage) => void;
}
interface RemovePerpsLiquidityOptions {
    /** LP token note to burn */
    lpInput: DecryptedLpNote;
    /** Perps pool */
    pool: PerpsPoolState & {
        address: PublicKey;
    };
    /** Token index to withdraw */
    tokenIndex: number;
    /** LP amount to burn */
    lpAmount: bigint;
    /** Current oracle prices for all tokens */
    oraclePrices: bigint[];
    /** Optional progress callback */
    onProgress?: (stage: PerpsProgressStage) => void;
}
/**
 * Hook for fetching all perps pools
 */
declare function usePerpsPools(): {
    pools: (PerpsPoolState & {
        address: PublicKey;
    })[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for fetching a single perps pool
 */
declare function usePerpsPool(poolAddress: PublicKey | null): {
    pool: (PerpsPoolState & {
        address: PublicKey;
    }) | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for fetching perps markets for a pool
 */
declare function usePerpsMarkets(poolAddress: PublicKey | null): {
    markets: (PerpsMarketState & {
        address: PublicKey;
    })[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for opening a perpetual position
 */
declare function useOpenPosition(): {
    openPosition: (options: OpenPositionOptions) => Promise<TransactionResult | null>;
    reset: () => void;
    isOpening: boolean;
    error: string | null;
    result: TransactionResult | null;
};
/**
 * Hook for closing a perpetual position
 */
declare function useClosePosition(): {
    closePosition: (options: ClosePositionOptions$1) => Promise<TransactionResult | null>;
    reset: () => void;
    isClosing: boolean;
    error: string | null;
    result: TransactionResult | null;
};
/**
 * Hook for adding liquidity to perps pool
 */
declare function usePerpsAddLiquidity(): {
    addLiquidity: (options: AddPerpsLiquidityOptions) => Promise<TransactionResult | null>;
    reset: () => void;
    isAdding: boolean;
    error: string | null;
    result: TransactionResult | null;
};
/**
 * Hook for removing liquidity from perps pool
 */
declare function usePerpsRemoveLiquidity(): {
    removeLiquidity: (options: RemovePerpsLiquidityOptions) => Promise<TransactionResult | null>;
    reset: () => void;
    isRemoving: boolean;
    error: string | null;
    result: TransactionResult | null;
};
/**
 * Hook for calculating position PnL
 */
declare function usePositionPnL(position: PerpsPosition | null, currentPrice: bigint, pool: PerpsPoolState | null): PnLResult | null;
/**
 * Hook for calculating liquidation price
 */
declare function useLiquidationPrice(position: PerpsPosition | null, pool: PerpsPoolState | null): LiquidationPriceResult | null;
/**
 * Hook for calculating LP value
 */
declare function useLpValue(pool: PerpsPoolState | null, oraclePrices: bigint[]): LpValueResult | null;
/**
 * Hook for calculating LP mint amount preview
 */
declare function useLpMintPreview(pool: PerpsPoolState | null, depositAmount: bigint, tokenIndex: number, oraclePrices: bigint[]): bigint | null;
/**
 * Hook for calculating withdrawal preview
 */
declare function useWithdrawPreview(pool: PerpsPoolState | null, lpAmount: bigint, tokenIndex: number, oraclePrices: bigint[]): WithdrawableResult | null;
/**
 * Hook for token utilization rates
 */
declare function useTokenUtilization(pool: PerpsPoolState | null): {
    tokenIndex: number;
    mint: PublicKey;
    utilization: number;
    borrowRate: number;
}[];
/**
 * Hook for position validation
 */
declare function usePositionValidation(pool: PerpsPoolState | null, market: PerpsMarketState | null, marginAmount: bigint, leverage: number, direction: 'long' | 'short'): {
    isValid: boolean;
    error: string;
    positionSize?: undefined;
} | {
    isValid: boolean;
    error: null;
    positionSize: bigint;
};
/** Position status from PositionMeta */
type PositionMetaStatus = 'active' | 'liquidated' | 'closed' | 'unknown';
/** Scanned position data for UI display */
interface ScannedPerpsPosition {
    /** Position commitment hash */
    commitment: Uint8Array;
    /** Account hash for Light Protocol operations */
    accountHash: string;
    /** Market ID (32 bytes) */
    marketId: Uint8Array;
    /** Position direction */
    isLong: boolean;
    /** Margin amount */
    margin: bigint;
    /** Position size (margin * leverage) */
    size: bigint;
    /** Leverage multiplier */
    leverage: number;
    /** Entry price */
    entryPrice: bigint;
    /** Position randomness */
    randomness: Uint8Array;
    /** Pool this position belongs to */
    pool: PublicKey;
    /** Whether position is closed/spent (from nullifier check) */
    spent: boolean;
    /** Position status from metadata (Active/Liquidated/Closed) */
    status: PositionMetaStatus;
    /** Liquidation price from metadata */
    liquidationPrice?: bigint;
    /** Timestamp when position was opened */
    createdAt?: number;
    /** Whether PositionMeta was found for this position */
    hasMetadata: boolean;
}
/**
 * Hook for scanning user's perps positions
 *
 * Scans Light Protocol compressed accounts for position notes
 * belonging to the current user's stealth wallet.
 * Also fetches public PositionMeta for status/liquidation info.
 *
 * @param positionPool - Position pool address (perps pool's position commitment pool)
 */
declare function usePerpsPositions(positionPool: PublicKey | null): {
    positions: ScannedPerpsPosition[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for fetching Pyth oracle price
 *
 * @param symbol - Token symbol (e.g., 'SOL', 'BTC', 'ETH')
 * @param refreshInterval - Auto-refresh interval in ms (default: 10000)
 */
declare function usePythPrice(symbol: string | null, refreshInterval?: number): {
    price: bigint | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for fetching multiple Pyth oracle prices
 *
 * @param symbols - Array of token symbols
 * @param refreshInterval - Auto-refresh interval in ms (default: 10000)
 */
declare function usePythPrices(symbols: string[], refreshInterval?: number): {
    prices: Map<string, bigint>;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
interface LiquidatablePosition {
    position: ScannedPerpsPosition;
    reason: 'underwater' | 'profit_bound';
    currentPrice: bigint;
    pnl: bigint;
    isProfit: boolean;
    ownerRemainder: bigint;
    liquidatorReward: bigint;
}
/**
 * Hook for keeper to monitor positions for liquidation
 *
 * Polls positions and prices, identifies liquidatable positions.
 *
 * @param pool - Perps pool state
 * @param positionPool - Position pool address (Light Protocol)
 * @param pollInterval - Polling interval in ms (default: 5000)
 */
declare function useKeeperMonitor(pool: PerpsPoolState | null, positionPool: PublicKey | null, pollInterval?: number): {
    /** All scanned positions */
    positions: ScannedPerpsPosition[];
    /** Positions ready for liquidation */
    liquidatable: LiquidatablePosition[];
    /** Is currently scanning/checking */
    isLoading: boolean;
    /** Last check timestamp */
    lastCheck: number;
    /** Manual refresh */
    refresh: () => Promise<void>;
};
/**
 * Hook for executing liquidation
 */
declare function useLiquidate(): {
    liquidate: (options: {
        position: LiquidatablePosition;
        pool: PerpsPoolState;
        market: PerpsMarketState;
        liquidatorRecipient: any;
        onProgress?: (stage: PerpsProgressStage, phase?: number) => void;
    }) => Promise<{
        signature: string;
    } | null>;
    isLiquidating: boolean;
};

/**
 * Voting hooks
 *
 * Provides interface for voting operations: ballots, voting, and claims
 */

/** Progress stages for voting operations */
type VotingProgressStage = 'preparing' | 'generating' | 'building' | 'approving' | 'executing' | 'confirming';
interface BallotWithAddress extends Ballot {
    address: PublicKey;
}
interface VoteSnapshotOptions {
    /** Ballot to vote on */
    ballot: BallotWithAddress;
    /** Input note for snapshot voting (proves balance) */
    note: DecryptedNote;
    /** Vote choice (option index) */
    voteChoice: number;
    /** Merkle proof for note inclusion in snapshot */
    snapshotMerkleRoot: Uint8Array;
    merklePath: Uint8Array[];
    merklePathIndices: number[];
    /** Optional eligibility proof */
    eligibilityProof?: {
        merkleProof: Uint8Array[];
        pathIndices: number[];
        leafIndex: number;
    };
    /** Optional progress callback */
    onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}
interface VoteSpendOptions {
    /** Ballot to vote on */
    ballot: BallotWithAddress;
    /** Input note to spend (locks tokens) */
    note: DecryptedNote;
    /** Vote choice (option index) */
    voteChoice: number;
    /** Merkle proof for note */
    merklePath: Uint8Array[];
    merklePathIndices: number[];
    leafIndex: number;
    /** Optional eligibility proof */
    eligibilityProof?: {
        merkleProof: Uint8Array[];
        pathIndices: number[];
        leafIndex: number;
    };
    /** Optional progress callback */
    onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}
interface ChangeVoteOptions {
    /** Ballot */
    ballot: BallotWithAddress;
    /** Old vote commitment */
    oldVoteCommitment: Uint8Array;
    /** Old vote choice */
    oldVoteChoice: number;
    /** Old randomness */
    oldRandomness: Uint8Array;
    /** New vote choice */
    newVoteChoice: number;
    /** Optional progress callback */
    onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}
interface ClosePositionOptions {
    /** Ballot */
    ballot: BallotWithAddress;
    /** Position commitment */
    positionCommitment: Uint8Array;
    /** Vote choice */
    voteChoice: number;
    /** Amount locked */
    amount: bigint;
    /** Vote weight */
    weight: bigint;
    /** Position randomness */
    positionRandomness: Uint8Array;
    /** Optional progress callback */
    onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}
interface ClaimOptions {
    /** Ballot */
    ballot: BallotWithAddress;
    /** Position commitment */
    positionCommitment: Uint8Array;
    /** Vote choice */
    voteChoice: number;
    /** Amount locked */
    amount: bigint;
    /** Vote weight */
    weight: bigint;
    /** Position randomness */
    positionRandomness: Uint8Array;
    /** Optional progress callback */
    onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}
interface VoteResult {
    operationId: Uint8Array;
    voteNullifier?: Uint8Array;
    voteCommitment?: Uint8Array;
    voteRandomness?: Uint8Array;
    signatures: string[];
}
interface SpendResult {
    operationId: Uint8Array;
    spendingNullifier: Uint8Array;
    positionCommitment: Uint8Array;
    positionRandomness: Uint8Array;
    signatures: string[];
}
interface ClaimResult {
    operationId: Uint8Array;
    positionNullifier: Uint8Array;
    payoutCommitment: Uint8Array;
    grossPayout: bigint;
    netPayout: bigint;
    signatures: string[];
}
/**
 * Hook for fetching all ballots
 */
declare function useBallots(): {
    ballots: BallotWithAddress[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for fetching active ballots only
 */
declare function useActiveBallots(): {
    ballots: BallotWithAddress[];
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
/**
 * Hook for fetching a single ballot
 */
declare function useBallot(ballotAddress: PublicKey | string | null): {
    ballot: BallotWithAddress | null;
    isLoading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
};
declare function useBallotTally(ballot: Ballot | null): {
    totalVotes: number;
    totalWeight: bigint;
    totalAmount: bigint;
    optionStats: {
        index: number;
        weight: bigint;
        amount: bigint;
        percentage: number;
    }[];
    leadingOption: {
        index: number;
        weight: bigint;
        amount: bigint;
        percentage: number;
    };
    hasQuorum: boolean;
    quorumProgress: number;
} | null;
/**
 * Hook for ballot time status
 */
declare function useBallotTimeStatus(ballot: Ballot | null): {
    now: number;
    startTime: number;
    endTime: number;
    claimDeadline: number;
    hasStarted: boolean;
    hasEnded: boolean;
    canClaim: boolean;
    claimExpired: boolean;
    timeUntilStart: number;
    timeUntilEnd: number;
    timeUntilClaimDeadline: number;
    isVotingPeriod: boolean;
} | null;
/**
 * Hook for snapshot voting (tokens stay liquid)
 */
declare function useVoteSnapshot(): {
    vote: (options: VoteSnapshotOptions) => Promise<VoteResult | null>;
    reset: () => void;
    isVoting: boolean;
    error: string | null;
    result: VoteResult | null;
};
/**
 * Hook for spend-to-vote (tokens locked until outcome)
 */
declare function useVoteSpend(): {
    vote: (options: VoteSpendOptions) => Promise<SpendResult | null>;
    reset: () => void;
    isVoting: boolean;
    error: string | null;
    result: SpendResult | null;
};
/**
 * Hook for changing vote (snapshot mode only)
 */
declare function useChangeVote(): {
    changeVote: (options: ChangeVoteOptions) => Promise<VoteResult | null>;
    reset: () => void;
    isChanging: boolean;
    error: string | null;
    result: VoteResult | null;
};
/**
 * Hook for closing a vote position (exit before resolution)
 */
declare function useCloseVotePosition(): {
    closePosition: (options: ClosePositionOptions) => Promise<VoteResult | null>;
    reset: () => void;
    isClosing: boolean;
    error: string | null;
    result: VoteResult | null;
};
/**
 * Hook for claiming winnings from resolved ballot
 */
declare function useClaim(): {
    claim: (options: ClaimOptions) => Promise<ClaimResult | null>;
    reset: () => void;
    isClaiming: boolean;
    error: string | null;
    result: ClaimResult | null;
};
/**
 * Hook for calculating potential payout from a position
 */
declare function usePayoutPreview(ballot: Ballot | null, voteChoice: number, weight: bigint | {
    toString(): string;
}): {
    grossPayout: bigint;
    netPayout: bigint;
    multiplier: number;
} | null;
/**
 * Hook for vote validation
 */
declare function useVoteValidation(ballot: Ballot | null, note: DecryptedNote | null, voteChoice: number): {
    isValid: boolean;
    error: string;
    weight?: undefined;
} | {
    isValid: boolean;
    error: null;
    weight: bigint;
};
/**
 * Hook for determining if user can claim
 */
declare function useCanClaim(ballot: Ballot | null, voteChoice: number | null): {
    canClaim: boolean;
    reason: string;
} | {
    canClaim: boolean;
    reason: null;
};
/**
 * Hook for resolving a ballot
 */
declare function useResolveBallot(): {
    resolve: (options: {
        ballot: BallotWithAddress;
        outcome?: number;
        onProgress?: (stage: "building" | "approving" | "confirming") => void;
    }) => Promise<{
        signature: string;
    } | null>;
    isResolving: boolean;
};
/**
 * Hook for finalizing a ballot
 */
declare function useFinalizeBallot(): {
    finalize: (options: {
        ballot: BallotWithAddress;
        onProgress?: (stage: "building" | "approving" | "confirming") => void;
    }) => Promise<{
        signature: string;
    } | null>;
    isFinalizing: boolean;
};
/**
 * Hook for decrypting time-locked tally
 */
declare function useDecryptTally(): {
    decrypt: (options: {
        ballot: BallotWithAddress;
        decryptionKey: Uint8Array;
        onProgress?: (stage: "building" | "approving" | "confirming") => void;
    }) => Promise<{
        signature: string;
    } | null>;
    isDecrypting: boolean;
};
/**
 * Hook to check if current user is ballot authority
 */
declare function useIsBallotAuthority(ballot: Ballot | null, walletPubkey: PublicKey | null): boolean;

export { type AddLiquidityProgressStage, type BallotWithAddress, type ChangeVoteOptions, type ClaimOptions, type ClaimResult, CloakCraftProvider, type ClosePositionOptions, type ConsolidationBatchInfo, type ConsolidationProgressCallback, type ConsolidationProgressStage, type ConsolidationState, type LiquidatablePosition, type PerpsProgressStage, type PositionMetaStatus, type ProtocolFeeConfig, type RemoveLiquidityProgressStage, type ScannedPerpsPosition, type SpendResult, type SwapProgressStage, type TransferProgressStage, type UnshieldProgressStage, type UseAutoConsolidationOptions, type UseAutoConsolidationResult, type UseConsolidationOptions, type UseProtocolFeesResult, type VoteResult, type VoteSnapshotOptions, type VoteSpendOptions, type VotingProgressStage, WALLET_DERIVATION_MESSAGE, useActiveBallots, useAddLiquidity, useAllBalances, useAmmPools, useAutoConsolidation, useBalance, useBallot, useBallotTally, useBallotTimeStatus, useBallots, useCanClaim, useChangeVote, useClaim, useCloakCraft, useClosePosition, useCloseVotePosition, useConsolidation, useDecryptTally, useFinalizeBallot, useFragmentationScore, useImpermanentLoss, useInitializeAmmPool, useInitializePool, useIsBallotAuthority, useIsConsolidationRecommended, useIsFreeOperation, useKeeperMonitor, useLiquidate, useLiquidationPrice, useLpMintPreview, useLpValue, useNoteSelection, useNoteSelector, useNotes, useNullifierStatus, useOpenPosition, useOrders, usePayoutPreview, usePerpsAddLiquidity, usePerpsMarkets, usePerpsPool, usePerpsPools, usePerpsPositions, usePerpsRemoveLiquidity, usePool, usePoolAnalytics, usePoolList, usePoolStats, usePortfolioValue, usePositionPnL, usePositionValidation, usePrivateBalance, useProtocolFees, usePublicBalance, usePythPrice, usePythPrices, useRecentTransactions, useRemoveLiquidity, useResolveBallot, useScanner, useShield, useShouldConsolidate, useSolBalance, useSolPrice, useSwap, useSwapQuote, useTokenBalances, useTokenPrice, useTokenPrices, useTokenUtilization, useTransactionHistory, useTransfer, useUnshield, useUserPosition, useVoteSnapshot, useVoteSpend, useVoteValidation, useWallet, useWithdrawPreview };
