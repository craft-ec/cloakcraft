/**
 * Balance tracking hook
 */

import { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';

interface TokenBalance {
  mint: PublicKey;
  amount: bigint;
  noteCount: number;
}

export function useBalance(tokenMint?: PublicKey) {
  const { client, wallet, notes } = useCloakCraft();
  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!client || !wallet || !tokenMint) return;

    setIsLoading(true);
    try {
      const unspentNotes = await client.getUnspentNotes(tokenMint);
      const total = unspentNotes.reduce((sum, note) => sum + note.amount, 0n);
      setBalance(total);
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet, tokenMint]);

  // Update balance when notes change
  useEffect(() => {
    refresh();
  }, [refresh, notes]);

  return {
    balance,
    isLoading,
    refresh,
  };
}

export function useAllBalances() {
  const { client, wallet, notes } = useCloakCraft();
  const [balances, setBalances] = useState<TokenBalance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!client || !wallet) return;

    setIsLoading(true);
    try {
      // Group notes by token mint
      const byMint = new Map<string, { mint: PublicKey; amount: bigint; count: number }>();

      for (const note of notes) {
        const mintStr = note.tokenMint.toBase58();
        const existing = byMint.get(mintStr);
        if (existing) {
          existing.amount += note.amount;
          existing.count += 1;
        } else {
          byMint.set(mintStr, {
            mint: note.tokenMint,
            amount: note.amount,
            count: 1,
          });
        }
      }

      setBalances(
        Array.from(byMint.values()).map((b) => ({
          mint: b.mint,
          amount: b.amount,
          noteCount: b.count,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet, notes]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    balances,
    isLoading,
    refresh,
  };
}
