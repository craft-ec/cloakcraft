/**
 * CloakCraft React Context Provider
 */

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, ReactNode } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { CloakCraftClient, Wallet, initPoseidon } from '@cloakcraft/sdk';
import type { DecryptedNote, SyncStatus } from '@cloakcraft/types';

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
  // Actions
  connect: (spendingKey: Uint8Array) => Promise<void>;
  disconnect: () => void;
  sync: (tokenMint?: PublicKey, clearCache?: boolean) => Promise<void>;
  createWallet: () => Wallet;
  /** Set the Anchor program instance (version-agnostic) */
  setProgram: (program: unknown) => void;
  initializeProver: (circuits?: string[]) => Promise<void>;
}

const CloakCraftContext = createContext<CloakCraftContextValue | null>(null);

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

export function CloakCraftProvider({
  children,
  rpcUrl,
  indexerUrl,
  programId,
  heliusApiKey,
  network = 'devnet',
  autoInitialize = true,
  solanaWalletPubkey,
  addressLookupTables,
}: CloakCraftProviderProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProverReady, setIsProverReady] = useState(false);
  const [isProgramReady, setIsProgramReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Storage key is per-Solana-wallet to prevent cross-wallet stealth key sharing
  const STORAGE_KEY = solanaWalletPubkey
    ? `cloakcraft_spending_key_${solanaWalletPubkey}`
    : 'cloakcraft_spending_key';

  // Clear stealth wallet when Solana wallet changes
  useEffect(() => {
    if (solanaWalletPubkey) {
      // Reset state when Solana wallet changes
      setWallet(null);
      setNotes([]);
      setIsProverReady(false);
    }
  }, [solanaWalletPubkey]);

  const client = useMemo(
    () =>
      new CloakCraftClient({
        rpcUrl,
        indexerUrl,
        programId: new PublicKey(programId),
        heliusApiKey,
        network,
        circuitsBaseUrl: '/circom',  // Circom circuits in /public/circom/
        addressLookupTables: addressLookupTables?.map(addr => new PublicKey(addr)),
      }),
    [rpcUrl, indexerUrl, programId, heliusApiKey, network, addressLookupTables]
  );

  // Initialize Poseidon on mount
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isInitializing) {
      setIsInitializing(true);
      initPoseidon()
        .then(() => {
          setIsInitialized(true);
          setError(null);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to initialize');
        })
        .finally(() => {
          setIsInitializing(false);
        });
    }
  }, [autoInitialize, isInitialized, isInitializing]);

  // Restore wallet from localStorage on init
  useEffect(() => {
    if (isInitialized && !wallet) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const spendingKey = new Uint8Array(JSON.parse(stored));
          client.loadWallet(spendingKey).then(setWallet).catch(() => {
            // Invalid stored key, clear it
            localStorage.removeItem(STORAGE_KEY);
          });
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [isInitialized, wallet, client]);

  // Auto-sync notes when wallet connects and program is ready
  useEffect(() => {
    if (wallet && isProgramReady && !isSyncing && notes.length === 0) {
      console.log('[CloakCraft] Auto-syncing notes on wallet connect...');
      sync().catch((err) => {
        console.error('[CloakCraft] Auto-sync failed:', err);
      });
    }
  }, [wallet, isProgramReady]);

  // Auto-initialize prover for transfer circuits when wallet connects
  useEffect(() => {
    if (wallet && isInitialized && !isInitializing && !isProverReady) {
      // Load transfer circuits for unshield/transfer operations
      console.log('[CloakCraft] Initializing prover...');
      client.initializeProver(['transfer/1x2', 'transfer/1x3'])
        .then(() => {
          console.log('[CloakCraft] Prover initialized successfully');
          setIsProverReady(true);
        })
        .catch((err) => {
          console.error('[CloakCraft] Prover init failed:', err);
          setError(`Prover initialization failed: ${err.message}`);
        });
    }
  }, [wallet, isInitialized, isInitializing, isProverReady, client]);

  const connect = useCallback(
    async (spendingKey: Uint8Array) => {
      try {
        setError(null);
        const newWallet = await client.loadWallet(spendingKey);
        setWallet(newWallet);
        // Persist to localStorage
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(spendingKey)));
        } catch {
          // Ignore localStorage errors
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to connect wallet';
        setError(message);
        throw err;
      }
    },
    [client]
  );

  const disconnect = useCallback(() => {
    setWallet(null);
    setNotes([]);
    setSyncStatus(null);
    setError(null);
    // Clear from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const sync = useCallback(async (tokenMint?: PublicKey, clearCache = false) => {
    if (!wallet) return;

    setIsSyncing(true);
    setError(null);
    try {
      // Clear cache if requested (e.g., after transactions)
      if (clearCache) {
        client.clearScanCache();
      }
      // Use Light Protocol scanning if configured
      const scannedNotes = await client.scanNotes(tokenMint);
      setNotes(scannedNotes);
      const status = await client.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
    } finally {
      setIsSyncing(false);
    }
  }, [client, wallet]);

  const createWallet = useCallback(() => {
    return client.createWallet();
  }, [client]);

  const setProgram = useCallback((program: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.setProgram(program as any);
    setIsProgramReady(true);
  }, [client]);

  const initializeProver = useCallback(async (circuits?: string[]) => {
    setIsInitializing(true);
    try {
      await client.initializeProver(circuits);
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize prover';
      setError(message);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [client]);

  const value: CloakCraftContextValue = {
    client,
    wallet,
    isConnected: wallet !== null,
    isInitialized,
    isInitializing,
    isProverReady,
    isProgramReady,
    isSyncing,
    syncStatus,
    notes,
    error,
    connect,
    disconnect,
    sync,
    createWallet,
    setProgram,
    initializeProver,
  };

  return (
    <CloakCraftContext.Provider value={value}>
      {children}
    </CloakCraftContext.Provider>
  );
}

export function useCloakCraft(): CloakCraftContextValue {
  const context = useContext(CloakCraftContext);
  if (!context) {
    throw new Error('useCloakCraft must be used within a CloakCraftProvider');
  }
  return context;
}
