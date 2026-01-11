/**
 * CloakCraft React Context Provider
 */

import React, { createContext, useContext, useMemo, useState, useCallback, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import { CloakCraftClient, Wallet } from '@cloakcraft/sdk';
import type { DecryptedNote, SyncStatus } from '@cloakcraft/types';

interface CloakCraftContextValue {
  client: CloakCraftClient | null;
  wallet: Wallet | null;
  isConnected: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus | null;
  notes: DecryptedNote[];
  // Actions
  connect: (spendingKey?: Uint8Array) => void;
  disconnect: () => void;
  sync: () => Promise<void>;
  createWallet: () => Wallet;
}

const CloakCraftContext = createContext<CloakCraftContextValue | null>(null);

interface CloakCraftProviderProps {
  children: ReactNode;
  rpcUrl: string;
  indexerUrl: string;
  programId: string;
}

export function CloakCraftProvider({
  children,
  rpcUrl,
  indexerUrl,
  programId,
}: CloakCraftProviderProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [notes, setNotes] = useState<DecryptedNote[]>([]);

  const client = useMemo(
    () =>
      new CloakCraftClient({
        rpcUrl,
        indexerUrl,
        programId: new PublicKey(programId),
      }),
    [rpcUrl, indexerUrl, programId]
  );

  const connect = useCallback(
    (spendingKey?: Uint8Array) => {
      const newWallet = spendingKey
        ? client.loadWallet(spendingKey)
        : client.createWallet();
      setWallet(newWallet);
    },
    [client]
  );

  const disconnect = useCallback(() => {
    setWallet(null);
    setNotes([]);
    setSyncStatus(null);
  }, []);

  const sync = useCallback(async () => {
    if (!wallet) return;

    setIsSyncing(true);
    try {
      const newNotes = await client.syncNotes();
      setNotes((prev) => [...prev, ...newNotes]);
      const status = await client.getSyncStatus();
      setSyncStatus(status);
    } finally {
      setIsSyncing(false);
    }
  }, [client, wallet]);

  const createWallet = useCallback(() => {
    return client.createWallet();
  }, [client]);

  const value: CloakCraftContextValue = {
    client,
    wallet,
    isConnected: wallet !== null,
    isSyncing,
    syncStatus,
    notes,
    connect,
    disconnect,
    sync,
    createWallet,
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
