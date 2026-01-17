/**
 * Transaction History Hook
 *
 * Provides access to transaction history with automatic persistence.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  TransactionHistory,
  TransactionRecord,
  TransactionFilter,
  TransactionType,
  TransactionStatus,
  createPendingTransaction,
} from '@cloakcraft/sdk';
import { useCloakCraft } from './provider';

export interface UseTransactionHistoryResult {
  /** Transaction history records */
  transactions: TransactionRecord[];
  /** Whether history is loading */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Add a new transaction */
  addTransaction: (
    type: TransactionType,
    tokenMint: string | PublicKey,
    amount: bigint,
    options?: {
      tokenSymbol?: string;
      secondaryAmount?: bigint;
      secondaryTokenMint?: string | PublicKey;
      secondaryTokenSymbol?: string;
      recipient?: string;
      metadata?: Record<string, unknown>;
    }
  ) => Promise<TransactionRecord | null>;
  /** Update an existing transaction */
  updateTransaction: (
    id: string,
    updates: {
      status?: TransactionStatus;
      signature?: string;
      error?: string;
    }
  ) => Promise<TransactionRecord | null>;
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

export function useTransactionHistory(
  filter?: TransactionFilter
): UseTransactionHistoryResult {
  const { wallet } = useCloakCraft();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<TransactionHistory | null>(null);

  // Serialize filter for stable dependency comparison
  const filterKey = useMemo(
    () => JSON.stringify(filter ?? {}),
    [filter?.type, filter?.status, filter?.limit, filter?.tokenMint, filter?.after?.getTime(), filter?.before?.getTime()]
  );

  // Store filter in ref for use in callbacks
  const filterRef = useRef(filter);
  filterRef.current = filter;

  // Initialize history manager
  useEffect(() => {
    if (!wallet?.publicKey) {
      setHistory(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    const initHistory = async () => {
      try {
        // Use wallet public key x-coordinate as identifier
        const walletId = Buffer.from(wallet.publicKey.x).toString('hex');
        const historyManager = new TransactionHistory(walletId);
        await historyManager.initialize();
        setHistory(historyManager);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize history');
        setIsLoading(false);
      }
    };

    initHistory();
  }, [wallet]);

  // Load transactions when history is initialized or filter changes
  useEffect(() => {
    if (!history) return;

    const loadTransactions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const txs = await history.getTransactions(filterRef.current);
        setTransactions(txs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    loadTransactions();
  }, [history, filterKey]);

  const refresh = useCallback(async () => {
    if (!history) return;

    setIsLoading(true);
    try {
      const txs = await history.getTransactions(filterRef.current);
      setTransactions(txs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh history');
    } finally {
      setIsLoading(false);
    }
  }, [history]);

  const addTransaction = useCallback(
    async (
      type: TransactionType,
      tokenMint: string | PublicKey,
      amount: bigint,
      options?: {
        tokenSymbol?: string;
        secondaryAmount?: bigint;
        secondaryTokenMint?: string | PublicKey;
        secondaryTokenSymbol?: string;
        recipient?: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<TransactionRecord | null> => {
      if (!history) return null;

      try {
        const pending = createPendingTransaction(type, tokenMint, amount, options);
        const record = await history.addTransaction(pending);
        setTransactions((prev) => [record, ...prev]);
        return record;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add transaction');
        return null;
      }
    },
    [history]
  );

  const updateTransaction = useCallback(
    async (
      id: string,
      updates: {
        status?: TransactionStatus;
        signature?: string;
        error?: string;
      }
    ): Promise<TransactionRecord | null> => {
      if (!history) return null;

      try {
        const updated = await history.updateTransaction(id, updates);
        if (updated) {
          setTransactions((prev) =>
            prev.map((tx) => (tx.id === id ? updated : tx))
          );
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update transaction');
        return null;
      }
    },
    [history]
  );

  const confirmTransaction = useCallback(
    async (id: string, signature: string): Promise<TransactionRecord | null> => {
      return updateTransaction(id, {
        status: TransactionStatus.CONFIRMED,
        signature,
      });
    },
    [updateTransaction]
  );

  const failTransaction = useCallback(
    async (id: string, errorMsg: string): Promise<TransactionRecord | null> => {
      return updateTransaction(id, {
        status: TransactionStatus.FAILED,
        error: errorMsg,
      });
    },
    [updateTransaction]
  );

  const clearHistory = useCallback(async () => {
    if (!history) return;

    try {
      await history.clearHistory();
      setTransactions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear history');
    }
  }, [history]);

  const summary = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let failed = 0;

    for (const tx of transactions) {
      switch (tx.status) {
        case TransactionStatus.PENDING:
          pending++;
          break;
        case TransactionStatus.CONFIRMED:
          confirmed++;
          break;
        case TransactionStatus.FAILED:
          failed++;
          break;
      }
    }

    return {
      total: transactions.length,
      pending,
      confirmed,
      failed,
    };
  }, [transactions]);

  return {
    transactions,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    confirmTransaction,
    failTransaction,
    refresh,
    clearHistory,
    count: transactions.length,
    summary,
  };
}

/**
 * Hook for recent transactions (simplified view)
 */
export function useRecentTransactions(limit: number = 5) {
  return useTransactionHistory({ limit });
}

// Re-export types for convenience
export { TransactionType, TransactionStatus } from '@cloakcraft/sdk';
export type { TransactionRecord, TransactionFilter } from '@cloakcraft/sdk';
