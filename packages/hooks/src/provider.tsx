/**
 * CloakCraft React Context Provider
 */

import React, { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { PublicKey, Keypair as SolanaKeypair, Connection, Transaction } from '@solana/web3.js';
import { CloakCraftClient, Wallet, initPoseidon, AnchorWallet } from '@cloakcraft/sdk';
import type { DecryptedNote, SyncStatus } from '@cloakcraft/types';

interface CloakCraftContextValue {
  client: CloakCraftClient | null;
  wallet: Wallet | null;
  /** Solana wallet public key (for admin/signing operations) */
  solanaPublicKey: PublicKey | null;
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
  /** Set the Anchor program instance (version-agnostic) - @deprecated use setWallet instead */
  setProgram: (program: unknown) => void;
  /** Set wallet adapter and create AnchorProvider/Program internally (matches scalecraft pattern) */
  setWallet: (wallet: AnchorWallet) => void;
  initializeProver: (circuits?: string[]) => Promise<void>;
}

const CloakCraftContext = createContext<CloakCraftContextValue | null>(null);

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

export function CloakCraftProvider({
  children,
  rpcUrl,
  connection,
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

  // Ref to prevent concurrent syncs (more reliable than state for race conditions)
  const syncLockRef = useRef(false);
  // Ref to track if initial auto-sync has been done
  const hasAutoSyncedRef = useRef(false);
  // Ref to hold sync function for use in effects (avoids circular dependency)
  const syncRef = useRef<((tokenMint?: PublicKey, clearCache?: boolean) => Promise<void>) | null>(null);

  // Storage key is per-Solana-wallet to prevent cross-wallet stealth key sharing
  const STORAGE_KEY = solanaWalletPubkey
    ? `cloakcraft_spending_key_${solanaWalletPubkey}`
    : 'cloakcraft_spending_key';

  // Track previous wallet pubkey to detect actual wallet changes (not just initial connection)
  const prevWalletPubkeyRef = useRef<string | undefined>(undefined);

  // Clear stealth wallet when Solana wallet CHANGES (not on initial connection)
  useEffect(() => {
    if (solanaWalletPubkey) {
      // Only reset if this is an actual wallet change, not initial connection
      if (prevWalletPubkeyRef.current && prevWalletPubkeyRef.current !== solanaWalletPubkey) {
        console.log('[CloakCraft] Wallet changed, clearing stealth wallet...');
        setWallet(null);
        setNotes([]);
        setIsProverReady(false);
        hasAutoSyncedRef.current = false;
      }
      prevWalletPubkeyRef.current = solanaWalletPubkey;
    }
  }, [solanaWalletPubkey]);

  const client = useMemo(
    () =>
      new CloakCraftClient({
        // Use connection if provided (matches scalecraft pattern), otherwise use rpcUrl
        connection,
        rpcUrl,
        indexerUrl,
        programId: new PublicKey(programId),
        heliusApiKey,
        network,
        circuitsBaseUrl: '/circom',  // Circom circuits in /public/circom/
        addressLookupTables: addressLookupTables?.map(addr => new PublicKey(addr)),
      }),
    [connection, rpcUrl, indexerUrl, programId, heliusApiKey, network, addressLookupTables]
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

  // Track restoration attempts to prevent double-restore
  const restorationAttemptedRef = useRef<string | null>(null);

  // Restore wallet from localStorage on init (only when solanaWalletPubkey is known)
  useEffect(() => {
    // Only attempt restoration once per pubkey
    if (isInitialized && solanaWalletPubkey && restorationAttemptedRef.current !== solanaWalletPubkey) {
      restorationAttemptedRef.current = solanaWalletPubkey;
      
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        console.log('[CloakCraft] Checking localStorage for:', STORAGE_KEY, '| Found:', !!stored);
        
        if (stored && !wallet) {
          console.log('[CloakCraft] Restoring stealth wallet from localStorage...');
          const spendingKey = new Uint8Array(JSON.parse(stored));
          client.loadWallet(spendingKey).then((restoredWallet) => {
            console.log('[CloakCraft] Stealth wallet restored successfully');
            setWallet(restoredWallet);
          }).catch((err) => {
            console.error('[CloakCraft] Failed to restore wallet:', err);
            // Invalid stored key, clear it
            localStorage.removeItem(STORAGE_KEY);
          });
        } else if (!stored) {
          console.log('[CloakCraft] No stored stealth wallet found for this Solana wallet');
        }
      } catch (e) {
        console.error('[CloakCraft] localStorage error:', e);
      }
    }
  }, [isInitialized, wallet, client, solanaWalletPubkey, STORAGE_KEY]);

  // Auto-sync notes when wallet connects and program is ready
  // Use ref to prevent double-sync (React Strict Mode can cause double effect runs)
  useEffect(() => {
    // Only auto-sync once per wallet session
    if (wallet && isProgramReady && !hasAutoSyncedRef.current && !syncLockRef.current && syncRef.current) {
      hasAutoSyncedRef.current = true;
      console.log('[CloakCraft] Auto-syncing notes on wallet connect...');
      syncRef.current().catch((err) => {
        console.error('[CloakCraft] Auto-sync failed:', err);
        // Reset flag on error so user can retry
        hasAutoSyncedRef.current = false;
      });
    }
  }, [wallet, isProgramReady]);

  // Auto-initialize prover for transfer circuits when wallet connects
  useEffect(() => {
    if (wallet && isInitialized && !isInitializing && !isProverReady) {
      // Load transfer circuits for unshield/transfer operations
      console.log('[CloakCraft] Initializing prover...');
      client.initializeProver(['transfer/1x2'])
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
        // Persist to localStorage with the current STORAGE_KEY
        try {
          console.log('[CloakCraft] Persisting stealth wallet to:', STORAGE_KEY);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(spendingKey)));
        } catch (e) {
          console.error('[CloakCraft] Failed to persist wallet:', e);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to connect wallet';
        setError(message);
        throw err;
      }
    },
    [client, STORAGE_KEY]
  );

  const disconnect = useCallback(() => {
    setWallet(null);
    setNotes([]);
    setSyncStatus(null);
    setError(null);
    // Reset sync refs so next connect can sync fresh
    hasAutoSyncedRef.current = false;
    syncLockRef.current = false;
    // Clear from localStorage
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const sync = useCallback(async (tokenMint?: PublicKey, clearCache = false) => {
    if (!wallet) return;

    // Prevent concurrent syncs using ref (more reliable than state for async operations)
    if (syncLockRef.current) {
      console.log('[CloakCraft] Sync already in progress, skipping...');
      return;
    }

    syncLockRef.current = true;
    setIsSyncing(true);
    setError(null);
    try {
      // Clear cache if requested (e.g., after transactions)
      if (clearCache) {
        client.clearScanCache();
      }
      // Use Light Protocol scanning if configured
      const scannedNotes = await client.scanNotes(tokenMint);

      // If scanning for a specific token, merge with existing notes instead of replacing
      // This prevents losing notes for other tokens when syncing multiple tokens sequentially
      if (tokenMint) {
        setNotes((prevNotes) => {
          // Remove old notes for this token
          const otherNotes = prevNotes.filter(
            (n) => n.tokenMint && !n.tokenMint.equals(tokenMint)
          );
          // Deduplicate scanned notes by commitment hash to prevent duplicates
          const seen = new Set<string>();
          const uniqueNotes = scannedNotes.filter((note) => {
            const key = Buffer.from(note.commitment).toString('hex');
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return [...otherNotes, ...uniqueNotes];
        });
      } else {
        // Full sync - replace all notes, but deduplicate first
        const seen = new Set<string>();
        const uniqueNotes = scannedNotes.filter((note) => {
          const key = Buffer.from(note.commitment).toString('hex');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setNotes(uniqueNotes);
      }

      const status = await client.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed';
      setError(message);
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
    }
  }, [client, wallet]);

  // Keep syncRef in sync with the sync callback
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);

  const createWallet = useCallback(() => {
    return client.createWallet();
  }, [client]);

  const setProgram = useCallback((program: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.setProgram(program as any);
    setIsProgramReady(true);
  }, [client]);

  // setWallet - creates AnchorProvider and Program internally (matches scalecraft pattern)
  const setAnchorWallet = useCallback((anchorWallet: AnchorWallet) => {
    client.setWallet(anchorWallet);
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

  // Parse Solana wallet pubkey from prop
  const solanaPublicKey = useMemo(() => {
    if (!solanaWalletPubkey) return null;
    try {
      return new PublicKey(solanaWalletPubkey);
    } catch {
      return null;
    }
  }, [solanaWalletPubkey]);

  const value: CloakCraftContextValue = {
    client,
    wallet,
    solanaPublicKey,
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
    setWallet: setAnchorWallet,
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
