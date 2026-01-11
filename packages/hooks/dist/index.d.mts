import * as react_jsx_runtime from 'react/jsx-runtime';
import { ReactNode } from 'react';
import * as _cloakcraft_sdk from '@cloakcraft/sdk';
import { CloakCraftClient, Wallet } from '@cloakcraft/sdk';
import * as _cloakcraft_types from '@cloakcraft/types';
import { SyncStatus, DecryptedNote, TransactionResult, StealthAddress, OrderState } from '@cloakcraft/types';
import { PublicKey, Keypair } from '@solana/web3.js';

interface CloakCraftContextValue {
    client: CloakCraftClient | null;
    wallet: Wallet | null;
    isConnected: boolean;
    isSyncing: boolean;
    syncStatus: SyncStatus | null;
    notes: DecryptedNote[];
    connect: (spendingKey?: Uint8Array) => void;
    disconnect: () => void;
    sync: () => Promise<void>;
    createWallet: () => Wallet;
}
interface CloakCraftProviderProps {
    children: ReactNode;
    rpcUrl: string;
    indexerUrl: string;
    programId: string;
}
declare function CloakCraftProvider({ children, rpcUrl, indexerUrl, programId, }: CloakCraftProviderProps): react_jsx_runtime.JSX.Element;
declare function useCloakCraft(): CloakCraftContextValue;

/**
 * Wallet management hook
 */
declare function useWallet(): {
    wallet: _cloakcraft_sdk.Wallet | null;
    publicKey: _cloakcraft_types.Point | null;
    isConnected: boolean;
    connect: (spendingKey?: Uint8Array) => void;
    disconnect: () => void;
    createWallet: () => _cloakcraft_sdk.Wallet;
    importFromSeed: (seedPhrase: string) => Promise<void>;
    importFromKey: (spendingKey: Uint8Array) => void;
    exportSpendingKey: () => Uint8Array<ArrayBufferLike> | null;
};

/**
 * Balance tracking hook
 */

declare function useBalance(tokenMint?: PublicKey): {
    balance: bigint;
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
    sync: () => Promise<void>;
    isSyncing: boolean;
};

/**
 * Shield operation hook
 */

declare function useShield(): {
    shield: (tokenMint: PublicKey, amount: bigint, payer: Keypair) => Promise<TransactionResult | null>;
    reset: () => void;
    isShielding: boolean;
    error: string | null;
    result: TransactionResult | null;
};

/**
 * Transfer operation hook
 */

interface TransferOutput {
    recipient: StealthAddress;
    amount: bigint;
}
declare function useTransfer(): {
    transfer: (inputs: DecryptedNote[], outputs: TransferOutput[], unshield?: {
        amount: bigint;
        recipient: PublicKey;
    }, relayer?: Keypair) => Promise<TransactionResult | null>;
    reset: () => void;
    isTransferring: boolean;
    error: string | null;
    result: TransactionResult | null;
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

export { CloakCraftProvider, useBalance, useCloakCraft, useNotes, useOrders, useShield, useTransfer, useWallet };
