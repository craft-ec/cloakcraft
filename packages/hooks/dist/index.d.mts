import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';
import { PublicKey, Keypair } from '@solana/web3.js';
import * as _cloakcraft_sdk from '@cloakcraft/sdk';
import { CloakCraftClient, Wallet } from '@cloakcraft/sdk';
import * as _cloakcraft_types from '@cloakcraft/types';
import { SyncStatus, DecryptedNote, TransactionResult, StealthAddress, PoolState, OrderState } from '@cloakcraft/types';

interface CloakCraftContextValue {
    client: CloakCraftClient | null;
    wallet: Wallet | null;
    isConnected: boolean;
    isInitialized: boolean;
    isInitializing: boolean;
    isProverReady: boolean;
    isSyncing: boolean;
    syncStatus: SyncStatus | null;
    notes: DecryptedNote[];
    error: string | null;
    connect: (spendingKey: Uint8Array) => Promise<void>;
    disconnect: () => void;
    sync: (tokenMint?: PublicKey, clearCache?: boolean) => Promise<void>;
    createWallet: () => Wallet;
    /** Set the Anchor program instance (version-agnostic) */
    setProgram: (program: unknown) => void;
    initializeProver: (circuits?: string[]) => Promise<void>;
}
interface CloakCraftProviderProps {
    children: ReactNode;
    rpcUrl: string;
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
declare function CloakCraftProvider({ children, rpcUrl, indexerUrl, programId, heliusApiKey, network, autoInitialize, solanaWalletPubkey, addressLookupTables, }: CloakCraftProviderProps): react_jsx_runtime.JSX.Element;
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

/**
 * Transfer operation hook
 *
 * Provides a simplified interface for private transfers.
 * The client handles all cryptographic preparation.
 */

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
declare function useTransfer(): {
    transfer: (inputs: DecryptedNote[], outputs: TransferOutput[], unshield?: UnshieldOption, walletPublicKey?: PublicKey) => Promise<TransactionResult | null>;
    reset: () => void;
    isTransferring: boolean;
    error: string | null;
    result: TransactionResult | null;
};
/**
 * Hook for selecting notes for a transfer
 */
declare function useNoteSelector(tokenMint: PublicKey): {
    availableNotes: DecryptedNote[];
    selected: DecryptedNote[];
    totalAvailable: bigint;
    totalSelected: bigint;
    selectNotesForAmount: (targetAmount: bigint) => DecryptedNote[];
    clearSelection: () => void;
};

/**
 * Unshield operation hook
 *
 * Withdraws tokens from the privacy pool back to a public wallet.
 * This is done via a transfer with an unshield output (no recipient, just withdrawal).
 */

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
 */

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
 */
declare function useScanner(tokenMint?: PublicKey, autoRefreshMs?: number): {
    notes: DecryptedNote[];
    totalAmount: bigint;
    noteCount: number;
    scan: () => Promise<void>;
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

export { CloakCraftProvider, WALLET_DERIVATION_MESSAGE, useAllBalances, useBalance, useCloakCraft, useInitializePool, useNoteSelection, useNoteSelector, useNotes, useNullifierStatus, useOrders, usePool, usePoolList, usePrivateBalance, usePublicBalance, useScanner, useShield, useSolBalance, useTokenBalances, useTransfer, useUnshield, useWallet };
