/**
 * Perpetual Futures hooks
 *
 * Provides interface for perps operations: positions, liquidity, and calculations
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import {
  generateStealthAddress,
  calculatePnL,
  calculateLiquidationPrice,
  calculateLpValue,
  calculateLpMintAmount,
  calculateWithdrawAmount,
  calculateMaxWithdrawable,
  calculateBorrowFees,
  calculateUtilization,
  calculateBorrowRate,
  isValidLeverage,
  wouldExceedUtilization,
  derivePerpsPoolPda,
  derivePerpsMarketPda,
  fetchPythPriceUsd,
  PERPS_PYTH_FEED_IDS,
  getFeedIdBySymbol,
} from '@cloakcraft/sdk';
import type {
  DecryptedNote,
  DecryptedLpNote,
  TransactionResult,
} from '@cloakcraft/types';
import type {
  PerpsPoolState,
  PerpsMarketState,
  PerpsPosition,
  DecryptedPerpsPosition,
  PnLResult,
  LiquidationPriceResult,
  LpValueResult,
  WithdrawableResult,
} from '@cloakcraft/sdk';

// =============================================================================
// Types
// =============================================================================

/** Progress stages for perps operations */
export type PerpsProgressStage =
  | 'preparing'     // Preparing inputs/outputs
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming';   // Waiting for confirmation

interface OpenPositionOptions {
  /** Input margin note to spend */
  marginInput: DecryptedNote;
  /** Perps pool */
  pool: PerpsPoolState & { address: PublicKey };
  /** Market to trade */
  market: PerpsMarketState & { address: PublicKey };
  /** Position direction */
  direction: 'long' | 'short';
  /** Margin amount */
  marginAmount: bigint;
  /** Leverage (1-100) */
  leverage: number;
  /** Current oracle price */
  oraclePrice: bigint;
  /** Optional progress callback */
  onProgress?: (stage: PerpsProgressStage) => void;
}

interface ClosePositionOptions {
  /** Position to close */
  position: DecryptedPerpsPosition;
  /** Perps pool */
  pool: PerpsPoolState & { address: PublicKey };
  /** Market */
  market: PerpsMarketState & { address: PublicKey };
  /** Current oracle price */
  oraclePrice: bigint;
  /** Optional progress callback */
  onProgress?: (stage: PerpsProgressStage) => void;
}

interface AddPerpsLiquidityOptions {
  /** Input token note to deposit */
  tokenInput: DecryptedNote;
  /** Perps pool */
  pool: PerpsPoolState & { address: PublicKey };
  /** Token index in pool */
  tokenIndex: number;
  /** Deposit amount */
  depositAmount: bigint;
  /** Current oracle prices for all tokens */
  oraclePrices: bigint[];
  /** Optional progress callback */
  onProgress?: (stage: PerpsProgressStage) => void;
}

interface RemovePerpsLiquidityOptions {
  /** LP token note to burn */
  lpInput: DecryptedLpNote;
  /** Perps pool */
  pool: PerpsPoolState & { address: PublicKey };
  /** Token index to withdraw */
  tokenIndex: number;
  /** LP amount to burn */
  lpAmount: bigint;
  /** Current oracle prices for all tokens */
  oraclePrices: bigint[];
  /** Optional progress callback */
  onProgress?: (stage: PerpsProgressStage) => void;
}

// =============================================================================
// Pool & Market Fetching Hooks
// =============================================================================

/**
 * Hook for fetching all perps pools
 */
export function usePerpsPools() {
  const { client } = useCloakCraft();
  const [pools, setPools] = useState<Array<PerpsPoolState & { address: PublicKey }>>([]);
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
      const program = client.getProgram() as any;
      if (!program) {
        throw new Error('Program not available');
      }
      // Fetch all PerpsPool accounts
      const accounts = await program.account.perpsPool.all();
      const poolData = accounts
        .map((acc: { publicKey: PublicKey; account: PerpsPoolState }) => ({
          ...acc.account,
          address: acc.publicKey,
        }))
        // Filter out pools with no tokens (can't trade on them)
        .filter((pool: PerpsPoolState) => pool.numTokens > 0);
      setPools(poolData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch perps pools');
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
 * Hook for fetching a single perps pool
 */
export function usePerpsPool(poolAddress: PublicKey | null) {
  const { client } = useCloakCraft();
  const [pool, setPool] = useState<(PerpsPoolState & { address: PublicKey }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client?.getProgram() || !poolAddress) {
      setPool(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = client.getProgram() as any;
      if (!program) {
        throw new Error('Program not available');
      }
      const account = await program.account.perpsPool.fetch(poolAddress);
      setPool({ ...account, address: poolAddress });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch perps pool');
      setPool(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, poolAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    pool,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching perps markets for a pool
 */
export function usePerpsMarkets(poolAddress: PublicKey | null) {
  const { client } = useCloakCraft();
  const [markets, setMarkets] = useState<Array<PerpsMarketState & { address: PublicKey }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client?.getProgram() || !poolAddress) {
      setMarkets([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = client.getProgram() as any;
      if (!program) {
        throw new Error('Program not available');
      }
      // Fetch all PerpsMarket accounts filtered by pool
      const accounts = await program.account.perpsMarket.all([
        { memcmp: { offset: 8 + 32, bytes: poolAddress.toBase58() } }, // pool field offset
      ]);
      const marketData = accounts.map((acc: { publicKey: PublicKey; account: PerpsMarketState }) => ({
        ...acc.account,
        address: acc.publicKey,
      }));
      setMarkets(marketData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch perps markets');
      setMarkets([]);
    } finally {
      setIsLoading(false);
    }
  }, [client, poolAddress]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    markets,
    isLoading,
    error,
    refresh,
  };
}

// =============================================================================
// Position Operations
// =============================================================================

/**
 * Hook for opening a perpetual position
 */
export function useOpenPosition() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<{
    isOpening: boolean;
    error: string | null;
    result: TransactionResult | null;
  }>({
    isOpening: false,
    error: null,
    result: null,
  });

  const openPosition = useCallback(
    async (options: OpenPositionOptions): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isOpening: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isOpening: false, error: 'Program not set', result: null });
        return null;
      }

      setState({ isOpening: true, error: null, result: null });

      try {
        const {
          marginInput,
          pool,
          market,
          direction,
          marginAmount,
          leverage,
          oraclePrice,
          onProgress,
        } = options;

        onProgress?.('preparing');

        // Validate leverage
        if (!isValidLeverage(leverage, pool.maxLeverage)) {
          throw new Error(`Invalid leverage. Must be between 1 and ${pool.maxLeverage}`);
        }

        // Calculate position size
        const positionSize = marginAmount * BigInt(leverage);

        // Check utilization wouldn't be exceeded
        const tokenIndex = direction === 'long' ? market.quoteTokenIndex : market.baseTokenIndex;
        const token = pool.tokens[tokenIndex];
        if (token && wouldExceedUtilization(token, positionSize, pool.maxUtilizationBps)) {
          throw new Error('Position would exceed pool utilization limit');
        }

        // Generate stealth address for position commitment
        const { stealthAddress: positionRecipient } = generateStealthAddress(wallet.publicKey);
        const { stealthAddress: changeRecipient } = generateStealthAddress(wallet.publicKey);

        // Re-scan for fresh note
        client.clearScanCache();
        const freshNotes = await client.scanNotes(marginInput.tokenMint);
        const freshInput = freshNotes.find(
          (n) =>
            n.commitment &&
            marginInput.commitment &&
            Buffer.from(n.commitment).toString('hex') === Buffer.from(marginInput.commitment).toString('hex')
        );

        if (!freshInput) {
          throw new Error('Margin note not found. It may have been spent.');
        }

        onProgress?.('generating');

        // Get market ID from market state
        const marketId = market.marketId || new Uint8Array(32);

        // Build merkle root from commitment (same pattern as swap)
        // Commitment existence is verified on-chain via Light Protocol account lookup.
        const merkleRoot = freshInput.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);

        // Call SDK openPerpsPosition method
        const result = await client.openPerpsPosition({
          input: freshInput,
          poolId: pool.address,
          marketId: marketId,
          direction,
          marginAmount,
          leverage,
          oraclePrice,
          positionRecipient,
          changeRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress,
        });

        // Wait for indexer
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes
        await sync(marginInput.tokenMint, true);

        setState({ isOpening: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Open position failed';
        setState({ isOpening: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isOpening: false, error: null, result: null });
  }, []);

  return {
    ...state,
    openPosition,
    reset,
  };
}

/**
 * Hook for closing a perpetual position
 */
export function useClosePosition() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<{
    isClosing: boolean;
    error: string | null;
    result: TransactionResult | null;
  }>({
    isClosing: false,
    error: null,
    result: null,
  });

  const closePosition = useCallback(
    async (options: ClosePositionOptions): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isClosing: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isClosing: false, error: 'Program not set', result: null });
        return null;
      }

      setState({ isClosing: true, error: null, result: null });

      try {
        const { position, pool, market, oraclePrice, onProgress } = options;

        onProgress?.('preparing');

        // Calculate PnL
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const pnlResult = calculatePnL(position, oraclePrice, pool, currentTimestamp);

        // Generate stealth address for settlement
        const { stealthAddress: settlementRecipient } = generateStealthAddress(wallet.publicKey);

        onProgress?.('generating');

        // Get market ID and settlement token
        const marketId = market.marketId || new Uint8Array(32);
        const settlementTokenIndex = position.direction === 'long'
          ? market.quoteTokenIndex
          : market.baseTokenIndex;
        const settlementToken = pool.tokens[settlementTokenIndex];

        if (!settlementToken) {
          throw new Error('Settlement token not found in pool');
        }

        // Build merkle root from commitment (same pattern as swap)
        const merkleRoot = position.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);

        // Call SDK closePerpsPosition method
        const result = await client.closePerpsPosition({
          positionInput: position as any,
          poolId: pool.address,
          marketId: marketId,
          settlementTokenMint: settlementToken.mint,
          oraclePrice,
          settlementRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress,
        });

        // Wait for indexer
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes for settlement token
        if (settlementToken) {
          await sync(settlementToken.mint, true);
        }

        setState({ isClosing: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Close position failed';
        setState({ isClosing: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isClosing: false, error: null, result: null });
  }, []);

  return {
    ...state,
    closePosition,
    reset,
  };
}

// =============================================================================
// Liquidity Operations
// =============================================================================

/**
 * Hook for adding liquidity to perps pool
 */
export function usePerpsAddLiquidity() {
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
    async (options: AddPerpsLiquidityOptions): Promise<TransactionResult | null> => {
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
        const { tokenInput, pool, tokenIndex, depositAmount, oraclePrices, onProgress } = options;

        onProgress?.('preparing');

        // Validate token index
        if (tokenIndex >= pool.numTokens) {
          throw new Error('Invalid token index');
        }

        const token = pool.tokens[tokenIndex];
        if (!token?.isActive) {
          throw new Error('Token not active in pool');
        }

        // Calculate LP tokens to receive
        const lpAmount = calculateLpMintAmount(pool, depositAmount, tokenIndex, oraclePrices);

        // Generate stealth addresses
        const { stealthAddress: lpRecipient } = generateStealthAddress(wallet.publicKey);
        const { stealthAddress: changeRecipient } = generateStealthAddress(wallet.publicKey);

        // Re-scan for fresh note
        client.clearScanCache();
        const freshNotes = await client.scanNotes(tokenInput.tokenMint);
        const freshInput = freshNotes.find(
          (n) =>
            n.commitment &&
            tokenInput.commitment &&
            Buffer.from(n.commitment).toString('hex') === Buffer.from(tokenInput.commitment).toString('hex')
        );

        if (!freshInput) {
          throw new Error('Token note not found. It may have been spent.');
        }

        onProgress?.('generating');

        // Build merkle root from commitment (same pattern as swap)
        const merkleRoot = freshInput.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);

        // Call SDK addPerpsLiquidity method
        const result = await client.addPerpsLiquidity({
          input: freshInput,
          poolId: pool.address,
          tokenIndex,
          depositAmount,
          lpAmount,
          oraclePrices,
          lpRecipient,
          changeRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress,
        });

        // Wait for indexer
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes
        await sync(tokenInput.tokenMint, true);
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

/**
 * Hook for removing liquidity from perps pool
 */
export function usePerpsRemoveLiquidity() {
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
    async (options: RemovePerpsLiquidityOptions): Promise<TransactionResult | null> => {
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
        const { lpInput, pool, tokenIndex, lpAmount, oraclePrices, onProgress } = options;

        onProgress?.('preparing');

        // Validate token index
        if (tokenIndex >= pool.numTokens) {
          throw new Error('Invalid token index');
        }

        const token = pool.tokens[tokenIndex];
        if (!token?.isActive) {
          throw new Error('Token not active in pool');
        }

        // Calculate withdrawal amount
        const withdrawAmount = calculateWithdrawAmount(pool, lpAmount, tokenIndex, oraclePrices);

        // Check max withdrawable
        const { maxAmount, utilizationAfter } = calculateMaxWithdrawable(
          pool,
          tokenIndex,
          lpAmount,
          oraclePrices
        );

        if (withdrawAmount > maxAmount) {
          throw new Error('Withdrawal would exceed available balance');
        }

        // Generate stealth address for withdrawal
        const { stealthAddress: withdrawRecipient } = generateStealthAddress(wallet.publicKey);
        const { stealthAddress: lpChangeRecipient } = generateStealthAddress(wallet.publicKey);

        // Re-scan for fresh LP note
        client.clearScanCache();
        const freshNotes = await client.scanNotes(pool.lpMint);
        const freshInput = freshNotes.find(
          (n) =>
            n.commitment &&
            lpInput.commitment &&
            Buffer.from(n.commitment).toString('hex') === Buffer.from(lpInput.commitment).toString('hex')
        );

        if (!freshInput) {
          throw new Error('LP note not found. It may have been spent.');
        }

        onProgress?.('generating');

        // Build merkle root from commitment (same pattern as swap)
        const merkleRoot = freshInput.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);

        // Call SDK removePerpsLiquidity method
        const result = await client.removePerpsLiquidity({
          lpInput: freshInput as unknown as DecryptedLpNote,
          poolId: pool.address,
          tokenIndex,
          lpAmount,
          withdrawAmount,
          oraclePrices,
          withdrawRecipient,
          lpChangeRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress,
        });

        // Wait for indexer
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes
        await sync(pool.lpMint, true);
        await sync(token.mint, true);

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

// =============================================================================
// Calculation Hooks
// =============================================================================

/**
 * Hook for calculating position PnL
 */
export function usePositionPnL(
  position: PerpsPosition | null,
  currentPrice: bigint,
  pool: PerpsPoolState | null
): PnLResult | null {
  return useMemo(() => {
    if (!position || !pool || currentPrice <= 0n) {
      return null;
    }

    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      return calculatePnL(position, currentPrice, pool, currentTimestamp);
    } catch {
      return null;
    }
  }, [position, currentPrice, pool]);
}

/**
 * Hook for calculating liquidation price
 */
export function useLiquidationPrice(
  position: PerpsPosition | null,
  pool: PerpsPoolState | null
): LiquidationPriceResult | null {
  return useMemo(() => {
    if (!position || !pool) {
      return null;
    }

    try {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      return calculateLiquidationPrice(position, pool, currentTimestamp);
    } catch {
      return null;
    }
  }, [position, pool]);
}

/**
 * Hook for calculating LP value
 */
export function useLpValue(
  pool: PerpsPoolState | null,
  oraclePrices: bigint[]
): LpValueResult | null {
  return useMemo(() => {
    if (!pool || oraclePrices.length === 0) {
      return null;
    }

    try {
      return calculateLpValue(pool, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, oraclePrices]);
}

/**
 * Hook for calculating LP mint amount preview
 */
export function useLpMintPreview(
  pool: PerpsPoolState | null,
  depositAmount: bigint,
  tokenIndex: number,
  oraclePrices: bigint[]
): bigint | null {
  return useMemo(() => {
    if (!pool || depositAmount <= 0n || oraclePrices.length === 0) {
      return null;
    }

    try {
      return calculateLpMintAmount(pool, depositAmount, tokenIndex, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, depositAmount, tokenIndex, oraclePrices]);
}

/**
 * Hook for calculating withdrawal preview
 */
export function useWithdrawPreview(
  pool: PerpsPoolState | null,
  lpAmount: bigint,
  tokenIndex: number,
  oraclePrices: bigint[]
): WithdrawableResult | null {
  return useMemo(() => {
    if (!pool || lpAmount <= 0n || oraclePrices.length === 0) {
      return null;
    }

    try {
      return calculateMaxWithdrawable(pool, tokenIndex, lpAmount, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, lpAmount, tokenIndex, oraclePrices]);
}

/**
 * Hook for token utilization rates
 */
export function useTokenUtilization(pool: PerpsPoolState | null) {
  return useMemo(() => {
    if (!pool) {
      return [];
    }

    return pool.tokens
      .filter((t) => t?.isActive)
      .map((token, index) => ({
        tokenIndex: index,
        mint: token.mint,
        utilization: calculateUtilization(token),
        borrowRate: calculateBorrowRate(
          calculateUtilization(token),
          pool.baseBorrowRateBps
        ),
      }));
  }, [pool]);
}

/**
 * Hook for position validation
 */
export function usePositionValidation(
  pool: PerpsPoolState | null,
  market: PerpsMarketState | null,
  marginAmount: bigint,
  leverage: number,
  direction: 'long' | 'short'
) {
  return useMemo(() => {
    if (!pool || !market) {
      return { isValid: false, error: 'Pool or market not loaded' };
    }

    // Validate leverage
    if (!isValidLeverage(leverage, pool.maxLeverage)) {
      return { isValid: false, error: `Leverage must be between 1 and ${pool.maxLeverage}` };
    }

    // Calculate position size
    const positionSize = marginAmount * BigInt(leverage);

    // Check utilization
    const tokenIndex = direction === 'long' ? market.quoteTokenIndex : market.baseTokenIndex;
    const token = pool.tokens[tokenIndex];

    if (!token?.isActive) {
      return { isValid: false, error: 'Token not active' };
    }

    if (wouldExceedUtilization(token, positionSize, pool.maxUtilizationBps)) {
      return { isValid: false, error: 'Would exceed pool utilization limit' };
    }

    return { isValid: true, error: null, positionSize };
  }, [pool, market, marginAmount, leverage, direction]);
}

// =============================================================================
// Position Scanning Hook
// =============================================================================

/** Position status from PositionMeta */
export type PositionMetaStatus = 'active' | 'liquidated' | 'closed' | 'unknown';

/** Scanned position data for UI display */
export interface ScannedPerpsPosition {
  /** Position commitment hash */
  commitment: Uint8Array;
  /** Account hash for Light Protocol operations */
  accountHash: string;
  /** Market ID (32 bytes) */
  marketId: Uint8Array;
  /** Position direction */
  isLong: boolean;
  /** Margin amount */
  margin: bigint;
  /** Position size (margin * leverage) */
  size: bigint;
  /** Leverage multiplier */
  leverage: number;
  /** Entry price */
  entryPrice: bigint;
  /** Position randomness */
  randomness: Uint8Array;
  /** Pool this position belongs to */
  pool: PublicKey;
  /** Whether position is closed/spent (from nullifier check) */
  spent: boolean;
  // =========================================================================
  // Position Metadata (from PositionMeta compressed account)
  // =========================================================================
  /** Position status from metadata (Active/Liquidated/Closed) */
  status: PositionMetaStatus;
  /** Liquidation price from metadata */
  liquidationPrice?: bigint;
  /** Timestamp when position was opened */
  createdAt?: number;
  /** Whether PositionMeta was found for this position */
  hasMetadata: boolean;
}

/**
 * Convert numeric status to PositionMetaStatus
 */
function toPositionStatus(status: number): PositionMetaStatus {
  switch (status) {
    case 0: return 'active';
    case 1: return 'liquidated';
    case 2: return 'closed';
    default: return 'unknown';
  }
}

/**
 * Derive position ID from position data
 * position_id = hash(pool_id, market_id, nullifier_key_derived, randomness)
 * For now, we use commitment as a proxy since we don't have access to nullifier_key here
 */
function derivePositionId(commitment: Uint8Array, randomness: Uint8Array): Uint8Array {
  // Position ID is derived in the ZK circuit. For matching with PositionMeta,
  // we need to derive it the same way. Since we have the position data, we can
  // match by commitment hash or randomness as fallback.
  // For now, return commitment as the position identifier for metadata lookup.
  return commitment;
}

/**
 * Hook for scanning user's perps positions
 *
 * Scans Light Protocol compressed accounts for position notes
 * belonging to the current user's stealth wallet.
 * Also fetches public PositionMeta for status/liquidation info.
 *
 * @param positionPool - Position pool address (perps pool's position commitment pool)
 */
export function usePerpsPositions(positionPool: PublicKey | null) {
  const { client, wallet } = useCloakCraft();
  const [positions, setPositions] = useState<ScannedPerpsPosition[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client || !wallet || !positionPool) {
      setPositions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // scanPositionNotes returns ScannedPositionNote[] from light.ts
      // which includes: commitment, accountHash, marketId, isLong, margin, size, leverage, entryPrice, randomness, pool, spent
      const scannedPositions = await client.scanPositionNotes(positionPool);

      if (scannedPositions.length === 0) {
        setPositions([]);
        return;
      }

      // Fetch position metadata for all positions
      // Use commitment as position ID for lookup (PositionMeta is keyed by position_id)
      const positionIds = scannedPositions.map((pos: any) =>
        derivePositionId(pos.commitment, pos.randomness)
      );

      let metadataMap: Map<string, any> = new Map();
      try {
        metadataMap = await client.fetchPositionMetas(positionPool, positionIds);
      } catch (metaErr) {
        // Metadata fetch is optional - positions still work without it
        console.warn('[usePerpsPositions] Failed to fetch position metadata:', metaErr);
      }

      // Map to our UI format with metadata
      const uiPositions: ScannedPerpsPosition[] = scannedPositions.map((pos: any) => {
        const positionIdHex = Buffer.from(derivePositionId(pos.commitment, pos.randomness)).toString('hex');
        const meta = metadataMap.get(positionIdHex);

        return {
          commitment: pos.commitment,
          accountHash: pos.accountHash,
          marketId: pos.marketId,
          isLong: pos.isLong,
          margin: pos.margin,
          size: pos.size,
          leverage: pos.leverage,
          entryPrice: pos.entryPrice,
          randomness: pos.randomness,
          pool: pos.pool,
          spent: pos.spent,
          // Metadata fields
          status: meta ? toPositionStatus(meta.status) : (pos.spent ? 'closed' : 'active'),
          liquidationPrice: meta?.liquidationPrice,
          createdAt: meta?.createdAt,
          hasMetadata: !!meta,
        };
      });

      // Filter out spent/closed positions (but keep liquidated for display)
      setPositions(uiPositions.filter(p => !p.spent && p.status !== 'closed'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan positions');
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet, positionPool]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    positions,
    isLoading,
    error,
    refresh,
  };
}

// =============================================================================
// Oracle Price Hooks
// =============================================================================

/**
 * Hook for fetching Pyth oracle price
 *
 * @param symbol - Token symbol (e.g., 'SOL', 'BTC', 'ETH')
 * @param refreshInterval - Auto-refresh interval in ms (default: 10000)
 */
export function usePythPrice(symbol: string | null, refreshInterval: number = 10000) {
  const [price, setPrice] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!symbol) {
      setPrice(null);
      return;
    }

    const feedId = getFeedIdBySymbol(symbol);
    if (!feedId) {
      setError(`Unknown symbol: ${symbol}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch price with 9 decimals (standard for Solana)
      const priceUsd = await fetchPythPriceUsd(feedId, 9);
      setPrice(priceUsd);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
      setPrice(null);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    refresh();

    // Auto-refresh at specified interval
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, refreshInterval]);

  return {
    price,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching multiple Pyth oracle prices
 *
 * @param symbols - Array of token symbols
 * @param refreshInterval - Auto-refresh interval in ms (default: 10000)
 */
export function usePythPrices(symbols: string[], refreshInterval: number = 10000) {
  const [prices, setPrices] = useState<Map<string, bigint>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!symbols.length) {
      setPrices(new Map());
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const priceMap = new Map<string, bigint>();

      await Promise.all(
        symbols.map(async (symbol) => {
          const feedId = getFeedIdBySymbol(symbol);
          if (feedId) {
            const priceUsd = await fetchPythPriceUsd(feedId, 9);
            priceMap.set(symbol, priceUsd);
          }
        })
      );

      setPrices(priceMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
    } finally {
      setIsLoading(false);
    }
  }, [symbols]);

  useEffect(() => {
    refresh();

    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, refreshInterval]);

  return {
    prices,
    isLoading,
    error,
    refresh,
  };
}

// =============================================================================
// Keeper Hooks
// =============================================================================

export interface LiquidatablePosition {
  position: ScannedPerpsPosition;
  reason: 'underwater' | 'profit_bound';
  currentPrice: bigint;
  pnl: bigint;
  isProfit: boolean;
  ownerRemainder: bigint;
  liquidatorReward: bigint;
}

/**
 * Hook for keeper to monitor positions for liquidation
 *
 * Polls positions and prices, identifies liquidatable positions.
 *
 * @param pool - Perps pool state
 * @param positionPool - Position pool address (Light Protocol)
 * @param pollInterval - Polling interval in ms (default: 5000)
 */
export function useKeeperMonitor(
  pool: PerpsPoolState | null,
  positionPool: PublicKey | null,
  pollInterval: number = 5000
) {
  const { positions, isLoading: isScanning, refresh: refreshPositions } = usePerpsPositions(positionPool);
  const [liquidatable, setLiquidatable] = useState<LiquidatablePosition[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<number>(0);

  // Get token symbols for price fetching
  const tokenSymbols = useMemo(() => {
    if (!pool) return [];
    return pool.tokens
      .filter(t => t.isActive)
      .map(t => {
        // Map mint to symbol (simplified - in production use a lookup)
        const mintStr = t.mint.toBase58();
        if (mintStr.includes('So1')) return 'SOL';
        if (mintStr.includes('USDC') || mintStr.includes('EPj')) return 'USDC';
        return 'SOL'; // Default
      });
  }, [pool]);

  const { prices, refresh: refreshPrices } = usePythPrices(tokenSymbols, pollInterval);

  // Check positions for liquidation
  const checkPositions = useCallback(async () => {
    if (!pool || !positions.length || !prices.size) {
      setLiquidatable([]);
      return;
    }

    setIsChecking(true);
    try {
      // Import liquidation helpers from SDK
      const sdk = await import('@cloakcraft/sdk');
      const shouldLiquidateFn = (sdk as any).shouldLiquidate;
      const calculateLiquidationAmountsFn = (sdk as any).calculateLiquidationAmounts;

      if (!shouldLiquidateFn || !calculateLiquidationAmountsFn) {
        console.warn('Liquidation functions not available in SDK');
        setLiquidatable([]);
        return;
      }

      const liquidatablePositions: LiquidatablePosition[] = [];

      for (const position of positions) {
        // Skip spent positions
        if (position.spent) continue;

        // Get current price for the position's market
        // Simplified: use first price available
        const currentPrice = prices.values().next().value || 0n;
        if (currentPrice === 0n) continue;

        const result = shouldLiquidateFn(
          {
            margin: position.margin,
            size: position.size,
            entryPrice: position.entryPrice,
            direction: position.isLong ? 'long' : 'short',
          },
          currentPrice,
          { liquidationThresholdBps: pool.liquidationThresholdBps }
        );

        if (result.shouldLiquidate && result.reason) {
          const amounts = calculateLiquidationAmountsFn(
            position.margin,
            result.pnl,
            result.isProfit,
            pool.liquidationPenaltyBps
          );

          liquidatablePositions.push({
            position,
            reason: result.reason,
            currentPrice,
            pnl: result.pnl,
            isProfit: result.isProfit,
            ownerRemainder: amounts.ownerRemainder,
            liquidatorReward: amounts.liquidatorReward,
          });
        }
      }

      setLiquidatable(liquidatablePositions);
      setLastCheck(Date.now());
    } finally {
      setIsChecking(false);
    }
  }, [pool, positions, prices]);

  // Poll on interval
  useEffect(() => {
    checkPositions();

    if (pollInterval > 0) {
      const interval = setInterval(() => {
        refreshPositions();
        refreshPrices();
        checkPositions();
      }, pollInterval);
      return () => clearInterval(interval);
    }
  }, [checkPositions, pollInterval, refreshPositions, refreshPrices]);

  return {
    /** All scanned positions */
    positions,
    /** Positions ready for liquidation */
    liquidatable,
    /** Is currently scanning/checking */
    isLoading: isScanning || isChecking,
    /** Last check timestamp */
    lastCheck,
    /** Manual refresh */
    refresh: checkPositions,
  };
}

/**
 * Hook for executing liquidation
 */
export function useLiquidate() {
  const { client, wallet } = useCloakCraft();
  const [isLiquidating, setIsLiquidating] = useState(false);

  const liquidate = useCallback(async (options: {
    position: LiquidatablePosition;
    pool: PerpsPoolState;
    market: PerpsMarketState;
    liquidatorRecipient: any; // StealthAddress
    onProgress?: (stage: PerpsProgressStage, phase?: number) => void;
  }): Promise<{ signature: string } | null> => {
    const { position, pool, market, liquidatorRecipient, onProgress } = options;
    const program = client?.getProgram();

    if (!program || !wallet) {
      throw new Error('Program or wallet not available');
    }

    setIsLiquidating(true);
    try {
      onProgress?.('building');

      // Note: Full implementation would need to:
      // 1. Generate ZK proof for liquidation
      // 2. Get Light Protocol params
      // 3. Build multi-phase transactions
      // 4. Execute all phases

      // For now, return a placeholder
      throw new Error('Liquidation proof generation not yet implemented');
    } finally {
      setIsLiquidating(false);
    }
  }, [client, wallet]);

  return { liquidate, isLiquidating };
}

// =============================================================================
// Admin Hooks
// =============================================================================

/**
 * Hook for initializing a new perps pool (admin only)
 */
export function useInitializePerpsPool() {
  const { client, solanaPublicKey } = useCloakCraft();
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async (options: {
    poolId: PublicKey;
    maxLeverage?: number;
    positionFeeBps?: number;
    maxUtilizationBps?: number;
    liquidationThresholdBps?: number;
    liquidationPenaltyBps?: number;
    baseBorrowRateBps?: number;
  }): Promise<TransactionResult | null> => {
    const program = client?.getProgram();
    if (!program || !solanaPublicKey) {
      setError('Program or Solana wallet not available');
      return null;
    }

    setIsInitializing(true);
    setError(null);

    try {
      const { buildInitializePerpsPoolWithProgram } = await import('@cloakcraft/sdk');
      
      const { tx } = await buildInitializePerpsPoolWithProgram(program, {
        poolId: options.poolId,
        authority: solanaPublicKey,
        payer: solanaPublicKey,
        maxLeverage: options.maxLeverage,
        positionFeeBps: options.positionFeeBps,
        maxUtilizationBps: options.maxUtilizationBps,
        liquidationThresholdBps: options.liquidationThresholdBps,
        liquidationPenaltyBps: options.liquidationPenaltyBps,
        baseBorrowRateBps: options.baseBorrowRateBps,
      });

      const signature = await tx.rpc();
      return { signature, slot: 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize pool';
      setError(message);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [client, solanaPublicKey]);

  return { initialize, isInitializing, error };
}

/**
 * Hook for adding a token to a perps pool (admin only)
 */
export function useAddPerpsToken() {
  const { client, solanaPublicKey } = useCloakCraft();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToken = useCallback(async (options: {
    perpsPool: PublicKey;
    tokenMint: PublicKey;
    pythFeedId: Uint8Array;
  }): Promise<TransactionResult | null> => {
    const program = client?.getProgram();
    if (!program || !solanaPublicKey) {
      setError('Program or Solana wallet not available');
      return null;
    }

    setIsAdding(true);
    setError(null);

    try {
      const { buildAddTokenToPoolWithProgram } = await import('@cloakcraft/sdk');
      
      const { tx } = await buildAddTokenToPoolWithProgram(program, {
        perpsPool: options.perpsPool,
        tokenMint: options.tokenMint,
        pythFeedId: options.pythFeedId,
        authority: solanaPublicKey,
        payer: solanaPublicKey,
      });

      const signature = await tx.rpc();
      return { signature, slot: 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add token';
      setError(message);
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, [client, solanaPublicKey]);

  return { addToken, isAdding, error };
}

/**
 * Hook for adding a market to a perps pool (admin only)
 */
export function useAddPerpsMarket() {
  const { client, solanaPublicKey } = useCloakCraft();
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMarket = useCallback(async (options: {
    perpsPool: PublicKey;
    marketId: Uint8Array;
    baseTokenIndex: number;
    quoteTokenIndex: number;
    maxPositionSize: bigint;
  }): Promise<TransactionResult | null> => {
    const program = client?.getProgram();
    if (!program || !solanaPublicKey) {
      setError('Program or Solana wallet not available');
      return null;
    }

    setIsAdding(true);
    setError(null);

    try {
      const { buildAddMarketWithProgram } = await import('@cloakcraft/sdk');
      
      const { tx } = await buildAddMarketWithProgram(program, {
        perpsPool: options.perpsPool,
        marketId: options.marketId,
        baseTokenIndex: options.baseTokenIndex,
        quoteTokenIndex: options.quoteTokenIndex,
        maxPositionSize: options.maxPositionSize,
        authority: solanaPublicKey,
        payer: solanaPublicKey,
      });

      const signature = await tx.rpc();
      return { signature, slot: 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add market';
      setError(message);
      throw err;
    } finally {
      setIsAdding(false);
    }
  }, [client, solanaPublicKey]);

  return { addMarket, isAdding, error };
}

/**
 * Hook for updating perps pool config (admin only)
 */
export function useUpdatePerpsPoolConfig() {
  const { client, solanaPublicKey } = useCloakCraft();
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateConfig = useCallback(async (options: {
    perpsPool: PublicKey;
    maxLeverage?: number;
    positionFeeBps?: number;
    maxUtilizationBps?: number;
    liquidationThresholdBps?: number;
    liquidationPenaltyBps?: number;
    baseBorrowRateBps?: number;
    isActive?: boolean;
  }): Promise<TransactionResult | null> => {
    const program = client?.getProgram();
    if (!program || !solanaPublicKey) {
      setError('Program or Solana wallet not available');
      return null;
    }

    setIsUpdating(true);
    setError(null);

    try {
      const { buildUpdatePoolConfigWithProgram } = await import('@cloakcraft/sdk');
      
      const { tx } = await buildUpdatePoolConfigWithProgram(program, {
        perpsPool: options.perpsPool,
        authority: solanaPublicKey,
        maxLeverage: options.maxLeverage,
        positionFeeBps: options.positionFeeBps,
        maxUtilizationBps: options.maxUtilizationBps,
        liquidationThresholdBps: options.liquidationThresholdBps,
        liquidationPenaltyBps: options.liquidationPenaltyBps,
        baseBorrowRateBps: options.baseBorrowRateBps,
        isActive: options.isActive,
      });

      const signature = await tx.rpc();
      return { signature, slot: 0 };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update config';
      setError(message);
      throw err;
    } finally {
      setIsUpdating(false);
    }
  }, [client, solanaPublicKey]);

  return { updateConfig, isUpdating, error };
}
