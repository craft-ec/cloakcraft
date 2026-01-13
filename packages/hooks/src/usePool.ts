/**
 * Pool management hooks
 *
 * Hooks for fetching pool info and initializing new pools
 */

import { useState, useCallback, useEffect } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import type { PoolState, TransactionResult } from '@cloakcraft/types';

/**
 * Hook for fetching pool information
 */
export function usePool(tokenMint?: PublicKey) {
  const { client } = useCloakCraft();
  const [pool, setPool] = useState<PoolState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client || !tokenMint) {
      setPool(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const poolState = await client.getPool(tokenMint);
      setPool(poolState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch pool';
      setError(message);
      setPool(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, tokenMint]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Derive pool PDA
  const poolPda = tokenMint && client
    ? PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), tokenMint.toBuffer()],
        client.programId
      )[0]
    : null;

  return {
    pool,
    poolPda,
    isLoading,
    error,
    refresh,
    exists: pool !== null,
  };
}

interface InitializePoolState {
  isInitializing: boolean;
  error: string | null;
  result: { poolTx: string; counterTx: string } | null;
}

/**
 * Hook for initializing a new pool
 */
export function useInitializePool() {
  const { client } = useCloakCraft();
  const [state, setState] = useState<InitializePoolState>({
    isInitializing: false,
    error: null,
    result: null,
  });

  const initializePool = useCallback(
    async (
      tokenMint: PublicKey,
      payer: SolanaKeypair
    ): Promise<{ poolTx: string; counterTx: string } | null> => {
      if (!client) {
        setState({ isInitializing: false, error: 'Client not initialized', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isInitializing: false, error: 'Program not set. Call setProgram() first.', result: null });
        return null;
      }

      setState({ isInitializing: true, error: null, result: null });

      try {
        const result = await client.initializePool(tokenMint, payer);
        setState({ isInitializing: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to initialize pool';
        setState({ isInitializing: false, error, result: null });
        return null;
      }
    },
    [client]
  );

  /**
   * Initialize pool using wallet adapter (no keypair needed)
   * Builds and sends transaction using Anchor's wallet provider
   */
  const initializePoolWithWallet = useCallback(
    async (
      tokenMint: PublicKey,
      walletPublicKey: PublicKey
    ): Promise<{ poolTx: string; counterTx: string } | null> => {
      if (!client) {
        setState({ isInitializing: false, error: 'Client not initialized', result: null });
        return null;
      }

      const program = client.getProgram();
      if (!program) {
        setState({ isInitializing: false, error: 'Program not set. Call setProgram() first.', result: null });
        return null;
      }

      setState({ isInitializing: true, error: null, result: null });

      try {
        // Import the instruction builder
        const { initializePool: initPoolFn } = await import('@cloakcraft/sdk');

        // Build and send using the program's provider (which has wallet adapter)
        const result = await initPoolFn(program, tokenMint, walletPublicKey, walletPublicKey);

        setState({ isInitializing: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to initialize pool';
        setState({ isInitializing: false, error, result: null });
        return null;
      }
    },
    [client]
  );

  const reset = useCallback(() => {
    setState({ isInitializing: false, error: null, result: null });
  }, []);

  return {
    ...state,
    initializePool,
    initializePoolWithWallet,
    reset,
  };
}

/**
 * Hook for listing all pools (requires indexer or on-chain scanning)
 */
export function usePoolList() {
  const { client } = useCloakCraft();
  const [pools, setPools] = useState<Array<{ tokenMint: PublicKey; poolPda: PublicKey }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Note: In production, this would fetch from an indexer
  // For now, it's a placeholder that needs to be populated manually
  const addPool = useCallback((tokenMint: PublicKey) => {
    if (!client) return;

    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenMint.toBuffer()],
      client.programId
    );

    setPools((prev) => {
      // Check if already exists
      if (prev.some((p) => p.tokenMint.equals(tokenMint))) {
        return prev;
      }
      return [...prev, { tokenMint, poolPda }];
    });
  }, [client]);

  const removePool = useCallback((tokenMint: PublicKey) => {
    setPools((prev) => prev.filter((p) => !p.tokenMint.equals(tokenMint)));
  }, []);

  return {
    pools,
    isLoading,
    error,
    addPool,
    removePool,
  };
}
