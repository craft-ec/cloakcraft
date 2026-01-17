/**
 * Auto-Consolidation Hook
 *
 * React hook for managing automatic note consolidation in the background.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import {
  AutoConsolidator,
  AutoConsolidationConfig,
  AutoConsolidationState,
  FragmentationReport,
} from '@cloakcraft/sdk';

/**
 * Auto-consolidation hook result
 */
export interface UseAutoConsolidationResult {
  /** Current state */
  state: AutoConsolidationState;
  /** Whether auto-consolidation is enabled */
  isEnabled: boolean;
  /** Whether consolidation is currently recommended */
  isRecommended: boolean;
  /** Last fragmentation report */
  lastReport: FragmentationReport | null;
  /** Enable auto-consolidation */
  enable: () => void;
  /** Disable auto-consolidation */
  disable: () => void;
  /** Toggle auto-consolidation */
  toggle: () => void;
  /** Manually trigger a check */
  checkNow: () => void;
  /** Estimated cost of consolidation */
  estimatedCost: bigint;
}

/**
 * Auto-consolidation hook options
 */
export interface UseAutoConsolidationOptions {
  /** Token mint to monitor (required) */
  tokenMint: PublicKey;
  /** Initial enabled state (default: false) */
  initialEnabled?: boolean;
  /** Fragmentation threshold to trigger (default: 60) */
  fragmentationThreshold?: number;
  /** Max note count before triggering (default: 8) */
  maxNoteCount?: number;
  /** Max dust notes before triggering (default: 3) */
  maxDustNotes?: number;
  /** Dust threshold in smallest units (default: 1000) */
  dustThreshold?: bigint;
  /** Check interval in ms (default: 60000) */
  checkIntervalMs?: number;
}

/**
 * Hook for managing automatic note consolidation
 *
 * @param options - Configuration options
 * @returns Auto-consolidation controls and state
 */
export function useAutoConsolidation(
  options: UseAutoConsolidationOptions
): UseAutoConsolidationResult {
  const { notes } = useCloakCraft();
  const {
    tokenMint,
    initialEnabled = false,
    fragmentationThreshold = 60,
    maxNoteCount = 8,
    maxDustNotes = 3,
    dustThreshold = 1000n,
    checkIntervalMs = 60000,
  } = options;

  // Filter notes for this token
  const tokenNotes = useMemo(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );

  // Create consolidator
  const [consolidator] = useState(() => new AutoConsolidator({
    enabled: initialEnabled,
    fragmentationThreshold,
    maxNoteCount,
    maxDustNotes,
    dustThreshold,
    checkIntervalMs,
  }));

  // State
  const [state, setState] = useState<AutoConsolidationState>(
    consolidator.getState()
  );
  const [estimatedCost, setEstimatedCost] = useState<bigint>(0n);

  // Update note provider when notes change
  useEffect(() => {
    consolidator.setNoteProvider(() => tokenNotes);
  }, [consolidator, tokenNotes]);

  // Update callbacks to refresh state
  useEffect(() => {
    consolidator.updateConfig({
      onConsolidationRecommended: () => {
        setState(consolidator.getState());
      },
    });
  }, [consolidator]);

  // Refresh state periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setState(consolidator.getState());
      setEstimatedCost(consolidator.estimateCost());
    }, 5000);

    return () => clearInterval(interval);
  }, [consolidator]);

  // Enable auto-consolidation
  const enable = useCallback(() => {
    consolidator.start();
    setState(consolidator.getState());
  }, [consolidator]);

  // Disable auto-consolidation
  const disable = useCallback(() => {
    consolidator.stop();
    setState(consolidator.getState());
  }, [consolidator]);

  // Toggle auto-consolidation
  const toggle = useCallback(() => {
    if (consolidator.getState().enabled) {
      consolidator.stop();
    } else {
      consolidator.start();
    }
    setState(consolidator.getState());
  }, [consolidator]);

  // Manual check
  const checkNow = useCallback(() => {
    consolidator.check();
    setState(consolidator.getState());
    setEstimatedCost(consolidator.estimateCost());
  }, [consolidator]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      consolidator.stop();
    };
  }, [consolidator]);

  return {
    state,
    isEnabled: state.enabled,
    isRecommended: state.isRecommended,
    lastReport: state.lastReport,
    enable,
    disable,
    toggle,
    checkNow,
    estimatedCost,
  };
}

/**
 * Simple hook for checking if auto-consolidation is recommended
 */
export function useIsConsolidationRecommended(tokenMint: PublicKey): boolean {
  const { notes } = useCloakCraft();
  const [consolidator] = useState(() => new AutoConsolidator());

  const tokenNotes = useMemo(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );

  useEffect(() => {
    consolidator.setNoteProvider(() => tokenNotes);
  }, [consolidator, tokenNotes]);

  const [isRecommended, setIsRecommended] = useState(false);

  useEffect(() => {
    consolidator.check();
    setIsRecommended(consolidator.isConsolidationRecommended());
  }, [consolidator, tokenNotes]);

  return isRecommended;
}
