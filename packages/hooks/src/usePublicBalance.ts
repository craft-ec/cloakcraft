/**
 * Public balance hook
 *
 * Fetches the user's public (non-shielded) token balance
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { useCloakCraft } from './provider';

interface PublicBalanceState {
  balance: bigint;
  tokenAccount: PublicKey | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for fetching public token balance
 *
 * @param tokenMint - The token mint to check balance for
 * @param owner - The wallet owner (defaults to connected Solana wallet)
 */
export function usePublicBalance(tokenMint?: PublicKey, owner?: PublicKey) {
  const { client } = useCloakCraft();
  const [state, setState] = useState<PublicBalanceState>({
    balance: 0n,
    tokenAccount: null,
    isLoading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    if (!client || !tokenMint || !owner) {
      setState((s) => ({ ...s, balance: 0n, tokenAccount: null }));
      return;
    }

    setState((s) => ({ ...s, isLoading: true, error: null }));

    try {
      // Get associated token account
      const tokenAccount = getAssociatedTokenAddressSync(tokenMint, owner);

      // Fetch token account info
      const accountInfo = await client.connection.getAccountInfo(tokenAccount);

      if (!accountInfo) {
        setState({
          balance: 0n,
          tokenAccount: null,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Parse token account data (SPL Token account layout)
      // Offset 64: amount (u64, little-endian)
      const amount = accountInfo.data.readBigUInt64LE(64);

      setState({
        balance: amount,
        tokenAccount,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balance';
      setState((s) => ({
        ...s,
        isLoading: false,
        error: message,
      }));
    }
  }, [client, tokenMint, owner]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ...state,
    refresh,
  };
}

/**
 * Hook for fetching SOL balance
 */
export function useSolBalance(owner?: PublicKey) {
  const { client } = useCloakCraft();
  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client || !owner) {
      setBalance(0n);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const lamports = await client.connection.getBalance(owner);
      setBalance(BigInt(lamports));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch SOL balance';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [client, owner]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    balance,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching multiple token balances at once
 */
export function useTokenBalances(
  tokenMints: PublicKey[],
  owner?: PublicKey
) {
  const { client } = useCloakCraft();
  const [balances, setBalances] = useState<Map<string, bigint>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create stable string key for mints array to avoid re-render loops
  const mintsKey = useMemo(
    () => tokenMints.map((m) => m.toBase58()).join(','),
    [tokenMints]
  );

  const refresh = useCallback(async () => {
    if (!client || !owner || tokenMints.length === 0) {
      setBalances(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newBalances = new Map<string, bigint>();

      // Get all token accounts
      const tokenAccounts = tokenMints.map((mint) => getAssociatedTokenAddressSync(mint, owner));

      const accountInfos = await client.connection.getMultipleAccountsInfo(tokenAccounts);

      for (let i = 0; i < tokenMints.length; i++) {
        const mint = tokenMints[i];
        const accountInfo = accountInfos[i];

        if (accountInfo) {
          const amount = accountInfo.data.readBigUInt64LE(64);
          newBalances.set(mint.toBase58(), amount);
        } else {
          newBalances.set(mint.toBase58(), 0n);
        }
      }

      setBalances(newBalances);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch balances';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [client, owner, mintsKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getBalance = useCallback(
    (tokenMint: PublicKey): bigint => {
      return balances.get(tokenMint.toBase58()) ?? 0n;
    },
    [balances]
  );

  return {
    balances,
    getBalance,
    isLoading,
    error,
    refresh,
  };
}
