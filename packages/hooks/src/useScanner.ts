/**
 * Scanner hook for automatic note detection
 *
 * Uses Light Protocol to scan for notes and track balances in real-time.
 *
 * OPTIMIZED: Includes debouncing and caching support.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import type { DecryptedNote } from '@cloakcraft/types';

interface ScannerState {
  isScanning: boolean;
  lastScanned: Date | null;
  error: string | null;
}

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
 * Debounce hook - prevents rapid function calls
 */
function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delayMs: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delayMs);
    }) as T,
    [delayMs]
  );
}

/**
 * Hook for getting private balance via Light Protocol scanning
 *
 * This uses the SDK's getPrivateBalance method which scans for unspent notes
 * and filters out spent ones using nullifier detection.
 */
export function usePrivateBalance(tokenMint?: PublicKey): UsePrivateBalanceResult {
  const { client, wallet } = useCloakCraft();
  const [balance, setBalance] = useState<bigint>(0n);
  const [noteCount, setNoteCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client || !wallet) {
      setError('Stealth wallet not connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const privateBalance = await client.getPrivateBalance(tokenMint);
      setBalance(privateBalance);

      // Get notes to count them
      const notes = await client.scanNotes(tokenMint);
      setNoteCount(notes.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balance';
      // Make Light Protocol error clearer
      if (message.includes('Light Protocol not configured')) {
        setError('Note scanning unavailable - Helius API not configured');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet, tokenMint]);

  // Initial fetch
  useEffect(() => {
    if (client && wallet) {
      refresh();
    }
  }, [client, wallet, tokenMint]);

  return {
    balance,
    noteCount,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for scanning notes with auto-refresh
 *
 * OPTIMIZED: Includes debouncing to prevent rapid scans
 *
 * @param tokenMint - Filter to specific token (optional)
 * @param autoRefreshMs - Auto-refresh interval in ms (optional)
 * @param debounceMs - Debounce rapid scan calls (default: 500ms)
 */
export function useScanner(
  tokenMint?: PublicKey,
  autoRefreshMs?: number,
  debounceMs: number = 500
) {
  const { client, wallet, notes, sync } = useCloakCraft();
  const [state, setState] = useState<ScannerState>({
    isScanning: false,
    lastScanned: null,
    error: null,
  });
  const [stats, setStats] = useState<ScannerStats | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isScanningRef = useRef(false); // Prevent concurrent scans

  const scanImpl = useCallback(async () => {
    if (!client || !wallet) {
      setState((s) => ({ ...s, error: 'Wallet not connected' }));
      return;
    }

    // Prevent concurrent scans
    if (isScanningRef.current) {
      return;
    }

    isScanningRef.current = true;
    setState((s) => ({ ...s, isScanning: true, error: null }));

    try {
      await sync(tokenMint);

      // Get stats from light client if available
      try {
        const lightClient = (client as any).lightClient;
        if (lightClient?.getLastScanStats) {
          setStats(lightClient.getLastScanStats());
        }
      } catch {
        // Stats not available
      }

      setState({
        isScanning: false,
        lastScanned: new Date(),
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Scan failed';
      setState((s) => ({ ...s, isScanning: false, error: message }));
    } finally {
      isScanningRef.current = false;
    }
  }, [client, wallet, sync, tokenMint]);

  // Debounced scan to prevent rapid calls
  const scan = useDebounce(scanImpl, debounceMs);

  // Immediate scan (bypasses debounce)
  const scanNow = scanImpl;

  // Auto-refresh
  useEffect(() => {
    if (autoRefreshMs && autoRefreshMs > 0 && client && wallet) {
      // Initial scan
      scanNow();

      // Set up interval
      intervalRef.current = setInterval(scanNow, autoRefreshMs);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefreshMs, client, wallet, scanNow]);

  // Filter notes by token mint (memoized)
  const filteredNotes = useMemo(() => {
    return tokenMint
      ? notes.filter((n) => n.tokenMint && n.tokenMint.equals(tokenMint))
      : notes;
  }, [notes, tokenMint]);

  const totalAmount = useMemo(() => {
    return filteredNotes.reduce((sum, n) => sum + n.amount, 0n);
  }, [filteredNotes]);

  return {
    ...state,
    notes: filteredNotes,
    totalAmount,
    noteCount: filteredNotes.length,
    scan, // Debounced
    scanNow, // Immediate
    stats, // Performance stats
  };
}

/**
 * Hook for checking if a specific note has been spent
 */
export function useNullifierStatus(note: DecryptedNote | null, pool?: PublicKey) {
  const { client } = useCloakCraft();
  const [isSpent, setIsSpent] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = useCallback(async () => {
    if (!client || !note || !pool) {
      return;
    }

    // Need to compute nullifier from note
    // This requires the spending key which is in the wallet
    setIsChecking(true);
    setError(null);

    try {
      // Import crypto functions
      const { deriveNullifierKey, deriveSpendingNullifier, computeCommitment } = await import('@cloakcraft/sdk');

      const wallet = client.getWallet();
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      const nullifierKey = deriveNullifierKey(wallet.keypair.spending.sk);
      const commitment = computeCommitment(note);
      const nullifier = deriveSpendingNullifier(nullifierKey, commitment, note.leafIndex);

      const spent = await client.isNullifierSpent(nullifier, pool);
      setIsSpent(spent);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check nullifier';
      setError(message);
    } finally {
      setIsChecking(false);
    }
  }, [client, note, pool]);

  useEffect(() => {
    if (note && pool) {
      check();
    }
  }, [note, pool]);

  return {
    isSpent,
    isChecking,
    error,
    check,
  };
}
