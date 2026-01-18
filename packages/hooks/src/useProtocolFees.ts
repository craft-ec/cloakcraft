/**
 * Protocol Fees Hook
 *
 * Fetches and caches the protocol fee configuration from the chain.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import { deriveProtocolConfigPda, PROGRAM_ID } from '@cloakcraft/sdk';

/**
 * Protocol fee configuration
 */
export interface ProtocolFeeConfig {
  /** Transfer fee in basis points (100 = 1%) */
  transferFeeBps: number;
  /** Unshield fee in basis points */
  unshieldFeeBps: number;
  /** Protocol's share of LP swap fees in basis points (2000 = 20%) */
  swapFeeShareBps: number;
  /** Remove liquidity fee in basis points */
  removeLiquidityFeeBps: number;
  /** Whether fees are enabled */
  feesEnabled: boolean;
  /** Treasury address */
  treasury: PublicKey;
  /** Authority who can update fees */
  authority: PublicKey;
}

/**
 * Hook result
 */
export interface UseProtocolFeesResult {
  /** Fee configuration (null if not loaded) */
  config: ProtocolFeeConfig | null;
  /** Whether the config is loading */
  isLoading: boolean;
  /** Error message if failed to load */
  error: string | null;
  /** Refresh the config */
  refresh: () => Promise<void>;
  /** Calculate fee for a given amount and operation */
  calculateFee: (amount: bigint, operation: 'transfer' | 'unshield' | 'swap' | 'remove_liquidity') => bigint;
}

// Default fee rates (used as fallback)
const DEFAULT_FEES: Omit<ProtocolFeeConfig, 'treasury' | 'authority'> = {
  transferFeeBps: 10,         // 0.1%
  unshieldFeeBps: 25,         // 0.25%
  swapFeeShareBps: 2000,      // 20% of LP fees
  removeLiquidityFeeBps: 25,  // 0.25%
  feesEnabled: true,
};

/**
 * Hook for fetching and using protocol fees
 */
export function useProtocolFees(): UseProtocolFeesResult {
  const { client, isProgramReady } = useCloakCraft();

  const [config, setConfig] = useState<ProtocolFeeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch config from chain
  const fetchConfig = useCallback(async () => {
    if (!client || !isProgramReady) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = client.getProgram();
      if (!program) {
        throw new Error('Program not initialized');
      }

      const [configPda] = deriveProtocolConfigPda(PROGRAM_ID);

      // Try to fetch the account
      const accountInfo = await program.provider.connection.getAccountInfo(configPda);

      if (!accountInfo) {
        // Config doesn't exist yet, use defaults
        console.log('[useProtocolFees] Protocol config not found, using defaults');
        setConfig(null);
        setIsLoading(false);
        return;
      }

      // Parse the account data
      // Account structure:
      // 8 bytes discriminator
      // 32 bytes authority
      // 32 bytes treasury
      // 2 bytes transfer_fee_bps
      // 2 bytes unshield_fee_bps
      // 2 bytes swap_fee_share_bps
      // 2 bytes remove_liquidity_fee_bps
      // 1 byte fees_enabled
      // ...reserved

      const data = accountInfo.data;
      const authority = new PublicKey(data.subarray(8, 40));
      const treasury = new PublicKey(data.subarray(40, 72));
      const transferFeeBps = data.readUInt16LE(72);
      const unshieldFeeBps = data.readUInt16LE(74);
      const swapFeeShareBps = data.readUInt16LE(76);
      const removeLiquidityFeeBps = data.readUInt16LE(78);
      const feesEnabled = data[80] !== 0;

      setConfig({
        authority,
        treasury,
        transferFeeBps,
        unshieldFeeBps,
        swapFeeShareBps,
        removeLiquidityFeeBps,
        feesEnabled,
      });
    } catch (err) {
      console.error('[useProtocolFees] Failed to fetch config:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fee config');
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, isProgramReady]);

  // Fetch on mount and when program is ready
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Calculate fee for an amount
  // Note: For swaps, use calculateSwapFee instead since it requires the pool's LP fee
  const calculateFee = useCallback(
    (amount: bigint, operation: 'transfer' | 'unshield' | 'swap' | 'remove_liquidity'): bigint => {
      const cfg = config ?? {
        ...DEFAULT_FEES,
        authority: PublicKey.default,
        treasury: PublicKey.default,
      };

      if (!cfg.feesEnabled) {
        return 0n;
      }

      // Swap fees are calculated differently (% of LP fee, not fixed rate)
      // Use calculateSwapFee for swaps
      if (operation === 'swap') {
        return 0n;
      }

      const bps = {
        transfer: cfg.transferFeeBps,
        unshield: cfg.unshieldFeeBps,
        remove_liquidity: cfg.removeLiquidityFeeBps,
      }[operation];

      return (amount * BigInt(bps)) / 10000n;
    },
    [config]
  );

  return {
    config,
    isLoading,
    error,
    refresh: fetchConfig,
    calculateFee,
  };
}

/**
 * Hook to check if an operation is free
 */
export function useIsFreeOperation(
  operation: 'shield' | 'add_liquidity' | 'consolidate' | 'transfer' | 'unshield' | 'swap' | 'remove_liquidity'
): boolean {
  return useMemo(() => {
    const freeOperations = ['shield', 'add_liquidity', 'consolidate'];
    return freeOperations.includes(operation);
  }, [operation]);
}
