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
  isSyncing: boolean;
  syncStatus: SyncStatus | null;
  notes: DecryptedNote[];
  error: string | null;
  // Actions
  connect: (spendingKey: Uint8Array) => Promise<void>;
  disconnect: () => void;
  sync: (tokenMint?: PublicKey) => Promise<void>;
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
}

export function CloakCraftProvider({
  children,
  rpcUrl,
  indexerUrl,
  programId,
  heliusApiKey,
  network = 'devnet',
  autoInitialize = true,
}: CloakCraftProviderProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [error, setError] = useState<string | null>(null);

  const client = useMemo(
    () =>
      new CloakCraftClient({
        rpcUrl,
        indexerUrl,
        programId: new PublicKey(programId),
        heliusApiKey,
        network,
      }),
    [rpcUrl, indexerUrl, programId, heliusApiKey, network]
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

  const connect = useCallback(
    async (spendingKey: Uint8Array) => {
      try {
        setError(null);
        const newWallet = await client.loadWallet(spendingKey);
        setWallet(newWallet);
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
  }, []);

  const sync = useCallback(async (tokenMint?: PublicKey) => {
    if (!wallet) return;

    setIsSyncing(true);
    setError(null);
    try {
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
