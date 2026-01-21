/**
 * Swap operation hook
 *
 * Provides interface for AMM swaps
 */

import { useState, useCallback, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import {
  calculateSwapOutputUnified,
  calculateMinOutput,
  calculateAddLiquidityAmounts,
  calculateRemoveLiquidityOutput,
  generateStealthAddress,
  computeAmmStateHash,
  PoolType,
} from '@cloakcraft/sdk';
import type { DecryptedNote, AmmPoolState, TransactionResult } from '@cloakcraft/types';

interface SwapState {
  isSwapping: boolean;
  error: string | null;
  result: TransactionResult | null;
}

/** Progress stages for swap operation */
export type SwapProgressStage =
  | 'preparing'     // Preparing inputs/outputs
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming';   // Waiting for confirmation

interface SwapOptions {
  /** Input note to spend */
  input: DecryptedNote;
  /** AMM pool to swap through */
  pool: AmmPoolState & { address: PublicKey };
  /** Swap direction */
  swapDirection: 'aToB' | 'bToA';
  /** Amount to swap */
  swapAmount: bigint;
  /** Slippage tolerance in basis points (e.g., 50 = 0.5%) */
  slippageBps?: number;
  /** Optional progress callback */
  onProgress?: (stage: SwapProgressStage) => void;
}

export function useSwap() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<SwapState>({
    isSwapping: false,
    error: null,
    result: null,
  });

  const swap = useCallback(
    async (options: SwapOptions): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isSwapping: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isSwapping: false, error: 'Program not set', result: null });
        return null;
      }

      setState({ isSwapping: true, error: null, result: null });

      try {
        const { input, pool, swapDirection, swapAmount, slippageBps = 50, onProgress } = options;

        onProgress?.('preparing');

        // Calculate output amount from AMM (handles both ConstantProduct and StableSwap)
        const reserveIn = swapDirection === 'aToB' ? pool.reserveA : pool.reserveB;
        const reserveOut = swapDirection === 'aToB' ? pool.reserveB : pool.reserveA;
        const poolType = pool.poolType ?? PoolType.ConstantProduct;
        const amplification = pool.amplification ?? 0n;

        const { outputAmount } = calculateSwapOutputUnified(
          swapAmount,
          reserveIn,
          reserveOut,
          poolType,
          pool.feeBps,
          amplification
        );

        // Calculate minimum output with slippage
        const minOutput = calculateMinOutput(outputAmount, slippageBps);

        // Determine output token mint
        const outputTokenMint = swapDirection === 'aToB' ? pool.tokenBMint : pool.tokenAMint;

        // Generate stealth addresses for output and change
        const { stealthAddress: outputRecipient } = generateStealthAddress(wallet.publicKey);
        const { stealthAddress: changeRecipient } = generateStealthAddress(wallet.publicKey);

        // Re-scan to get fresh note with stealthEphemeralPubkey
        client.clearScanCache();
        const freshNotes = await client.scanNotes(input.tokenMint);
        const freshInput = freshNotes.find(
          (n) =>
            n.commitment &&
            input.commitment &&
            Buffer.from(n.commitment).toString('hex') === Buffer.from(input.commitment).toString('hex')
        );

        if (!freshInput) {
          throw new Error('Selected note not found. It may have been spent.');
        }

        // Build merkle root from commitment (same pattern as transfer)
        // Commitment existence is verified on-chain via Light Protocol account lookup.
        const merkleRoot = freshInput.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);

        const result = await client.swap({
          input: freshInput as any,
          poolId: pool.address,
          swapDirection,
          swapAmount,
          outputAmount,
          minOutput,
          outputTokenMint,
          outputRecipient,
          changeRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress,
        });

        onProgress?.('confirming');

        // Wait for indexer to pick up new compressed accounts
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes after successful swap
        await sync(input.tokenMint, true);
        await sync(outputTokenMint, true);

        setState({ isSwapping: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Swap failed';
        setState({ isSwapping: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isSwapping: false, error: null, result: null });
  }, []);

  return {
    ...state,
    swap,
    reset,
  };
}

/**
 * Hook for fetching AMM pools
 */
export function useAmmPools() {
  const { client } = useCloakCraft();
  const [pools, setPools] = useState<Array<AmmPoolState & { address: PublicKey }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client?.getProgram()) {
      setPools([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const allPools = await client.getAllAmmPools();
      setPools(allPools);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch pools');
      setPools([]);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    pools,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for swap quote calculation
 */
export function useSwapQuote(
  pool: (AmmPoolState & { address: PublicKey }) | null,
  swapDirection: 'aToB' | 'bToA',
  inputAmount: bigint
) {
  const [quote, setQuote] = useState<{
    outputAmount: bigint;
    minOutput: bigint;
    priceImpact: number;
  } | null>(null);

  useEffect(() => {
    if (!pool || inputAmount <= 0n) {
      setQuote(null);
      return;
    }

    try {
      const reserveIn = swapDirection === 'aToB' ? pool.reserveA : pool.reserveB;
      const reserveOut = swapDirection === 'aToB' ? pool.reserveB : pool.reserveA;
      const poolType = pool.poolType ?? PoolType.ConstantProduct;
      const amplification = pool.amplification ?? 0n;

      const { outputAmount, priceImpact } = calculateSwapOutputUnified(
        inputAmount,
        reserveIn,
        reserveOut,
        poolType,
        pool.feeBps,
        amplification
      );

      const minOutput = calculateMinOutput(outputAmount, 50); // 0.5% slippage

      setQuote({ outputAmount, minOutput, priceImpact });
    } catch {
      setQuote(null);
    }
  }, [pool, swapDirection, inputAmount]);

  return quote;
}

/**
 * Hook for initializing AMM pool
 */
export function useInitializeAmmPool() {
  const { client } = useCloakCraft();
  const [state, setState] = useState<{
    isInitializing: boolean;
    error: string | null;
    result: string | null;
  }>({
    isInitializing: false,
    error: null,
    result: null,
  });

  const initializePool = useCallback(
    async (
      tokenAMint: PublicKey,
      tokenBMint: PublicKey,
      feeBps: number = 30,
      poolType: 'constantProduct' | 'stableSwap' = 'constantProduct',
      amplification: number = 200
    ): Promise<string | null> => {
      if (!client?.getProgram()) {
        setState({ isInitializing: false, error: 'Program not set', result: null });
        return null;
      }

      setState({ isInitializing: true, error: null, result: null });

      try {
        // LP mint is now a PDA derived from the AMM pool, no keypair needed
        const signature = await client.initializeAmmPool(
          tokenAMint,
          tokenBMint,
          feeBps,
          poolType,
          amplification
        );

        setState({ isInitializing: false, error: null, result: signature });
        return signature;
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
    reset,
  };
}

/** Progress stages for add liquidity operation */
export type AddLiquidityProgressStage =
  | 'preparing'     // Preparing inputs/outputs
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming';   // Waiting for confirmation

/**
 * Hook for adding liquidity
 */
export function useAddLiquidity() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<{
    isAdding: boolean;
    error: string | null;
    result: TransactionResult | null;
  }>({
    isAdding: false,
    error: null,
    result: null,
  });

  const addLiquidity = useCallback(
    async (options: {
      pool: AmmPoolState & { address: PublicKey };
      inputA: DecryptedNote;
      inputB: DecryptedNote;
      amountA: bigint;
      amountB: bigint;
      slippageBps?: number;
      onProgress?: (stage: AddLiquidityProgressStage) => void;
    }): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isAdding: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isAdding: false, error: 'Program not set', result: null });
        return null;
      }

      setState({ isAdding: true, error: null, result: null });

      try {
        const { pool, inputA, inputB, amountA, amountB, slippageBps = 50, onProgress } = options;

        onProgress?.('preparing');

        // Calculate LP tokens to receive
        const { depositA, depositB, lpAmount } = calculateAddLiquidityAmounts(
          amountA,
          amountB,
          pool.reserveA,
          pool.reserveB,
          pool.lpSupply
        );

        // Calculate minimum LP with slippage
        const minLpAmount = (lpAmount * BigInt(10000 - slippageBps)) / 10000n;

        // Generate stealth addresses for outputs
        const { stealthAddress: lpRecipient } = generateStealthAddress(wallet.publicKey);
        const { stealthAddress: changeARecipient } = generateStealthAddress(wallet.publicKey);
        const { stealthAddress: changeBRecipient } = generateStealthAddress(wallet.publicKey);

        // Re-scan for fresh notes
        client.clearScanCache();
        const freshNotesA = await client.scanNotes(inputA.tokenMint);
        const freshNotesB = await client.scanNotes(inputB.tokenMint);

        const freshInputA = freshNotesA.find(
          (n) => n.commitment && inputA.commitment &&
            Buffer.from(n.commitment).toString('hex') === Buffer.from(inputA.commitment).toString('hex')
        );
        const freshInputB = freshNotesB.find(
          (n) => n.commitment && inputB.commitment &&
            Buffer.from(n.commitment).toString('hex') === Buffer.from(inputB.commitment).toString('hex')
        );

        if (!freshInputA || !freshInputB) {
          throw new Error('Selected notes not found. They may have been spent.');
        }

        const result = await client.addLiquidity({
          inputA: freshInputA as any,
          inputB: freshInputB as any,
          poolId: pool.address,
          lpMint: pool.lpMint,
          depositA,
          depositB,
          lpAmount,
          minLpAmount,
          lpRecipient,
          changeARecipient,
          changeBRecipient,
          onProgress,
        });

        onProgress?.('confirming');

        // Wait for indexer to pick up new compressed accounts
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes
        await sync(inputA.tokenMint, true);
        await sync(inputB.tokenMint, true);
        await sync(pool.lpMint, true);

        setState({ isAdding: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Add liquidity failed';
        setState({ isAdding: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isAdding: false, error: null, result: null });
  }, []);

  return {
    ...state,
    addLiquidity,
    reset,
  };
}

/** Progress stages for remove liquidity operation */
export type RemoveLiquidityProgressStage =
  | 'preparing'     // Preparing inputs/outputs
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming';   // Waiting for confirmation

/**
 * Hook for removing liquidity
 */
export function useRemoveLiquidity() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<{
    isRemoving: boolean;
    error: string | null;
    result: TransactionResult | null;
  }>({
    isRemoving: false,
    error: null,
    result: null,
  });

  const removeLiquidity = useCallback(
    async (options: {
      pool: AmmPoolState & { address: PublicKey };
      lpInput: DecryptedNote;
      lpAmount: bigint;
      slippageBps?: number;
      onProgress?: (stage: RemoveLiquidityProgressStage) => void;
    }): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isRemoving: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isRemoving: false, error: 'Program not set', result: null });
        return null;
      }

      setState({ isRemoving: true, error: null, result: null });

      try {
        const { pool, lpInput, lpAmount, slippageBps = 50, onProgress } = options;

        onProgress?.('preparing');

        // Calculate output amounts
        const { outputA, outputB } = calculateRemoveLiquidityOutput(
          lpAmount,
          pool.lpSupply,
          pool.reserveA,
          pool.reserveB
        );

        // Generate stealth addresses for outputs
        const { stealthAddress: outputARecipient } = generateStealthAddress(wallet.publicKey);
        const { stealthAddress: outputBRecipient } = generateStealthAddress(wallet.publicKey);

        // Re-scan for fresh LP note
        client.clearScanCache();
        const freshNotes = await client.scanNotes(pool.lpMint);
        const freshLpInput = freshNotes.find(
          (n) => n.commitment && lpInput.commitment &&
            Buffer.from(n.commitment).toString('hex') === Buffer.from(lpInput.commitment).toString('hex')
        );

        if (!freshLpInput) {
          throw new Error('LP note not found. It may have been spent.');
        }

        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);

        // Compute state hashes
        // Old state hash: hash of current pool state
        const oldPoolStateHash = computeAmmStateHash(
          pool.reserveA,
          pool.reserveB,
          pool.lpSupply,
          pool.poolId
        );

        // New state hash: hash of pool state after removing liquidity
        const newReserveA = pool.reserveA - outputA;
        const newReserveB = pool.reserveB - outputB;
        const newLpSupply = pool.lpSupply - lpAmount;
        const newPoolStateHash = computeAmmStateHash(
          newReserveA,
          newReserveB,
          newLpSupply,
          pool.poolId
        );

        const result = await client.removeLiquidity({
          lpInput: freshLpInput as any,
          poolId: pool.address,
          tokenAMint: pool.tokenAMint,
          tokenBMint: pool.tokenBMint,
          lpAmount,
          outputAAmount: outputA,
          outputBAmount: outputB,
          outputARecipient,
          outputBRecipient,
          oldPoolStateHash,
          newPoolStateHash,
          merklePath: dummyPath,
          merklePathIndices: dummyIndices,
          onProgress,
        });

        onProgress?.('confirming');

        // Wait for indexer to pick up new compressed accounts
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes
        await sync(pool.lpMint, true);
        await sync(pool.tokenAMint, true);
        await sync(pool.tokenBMint, true);

        setState({ isRemoving: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Remove liquidity failed';
        setState({ isRemoving: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isRemoving: false, error: null, result: null });
  }, []);

  return {
    ...state,
    removeLiquidity,
    reset,
  };
}
