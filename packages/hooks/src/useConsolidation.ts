/**
 * Note Consolidation Hook
 *
 * Provides tools for analyzing wallet fragmentation and consolidating notes.
 */

import { useState, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import {
  ConsolidationService,
  FragmentationReport,
  ConsolidationSuggestion,
  ConsolidationBatch,
} from '@cloakcraft/sdk';

/**
 * Consolidation state
 */
export interface ConsolidationState {
  isAnalyzing: boolean;
  isConsolidating: boolean;
  currentBatch: number;
  totalBatches: number;
  error: string | null;
}

/**
 * Consolidation hook options
 */
export interface UseConsolidationOptions {
  /** Token mint to consolidate (required) */
  tokenMint: PublicKey;
  /** Dust threshold in smallest units (default: 1000) */
  dustThreshold?: bigint;
  /** Max notes per consolidation batch (default: 3) */
  maxNotesPerBatch?: number;
}

/**
 * Hook for note consolidation
 *
 * @param options - Consolidation options
 * @returns Consolidation tools and state
 */
export function useConsolidation(options: UseConsolidationOptions) {
  const { notes, sync, client, wallet, isProverReady } = useCloakCraft();
  const { tokenMint, dustThreshold = 1000n, maxNotesPerBatch = 3 } = options;

  const [state, setState] = useState<ConsolidationState>({
    isAnalyzing: false,
    isConsolidating: false,
    currentBatch: 0,
    totalBatches: 0,
    error: null,
  });

  // Create consolidation service
  const service = useMemo(
    () => new ConsolidationService(dustThreshold),
    [dustThreshold]
  );

  // Filter notes for this token
  const tokenNotes = useMemo(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );

  // Analyze fragmentation
  const fragmentationReport = useMemo<FragmentationReport>(
    () => service.analyzeNotes(tokenNotes),
    [service, tokenNotes]
  );

  // Get consolidation suggestions
  const suggestions = useMemo<ConsolidationSuggestion[]>(
    () => service.suggestConsolidation(tokenNotes, { maxNotesPerBatch }),
    [service, tokenNotes, maxNotesPerBatch]
  );

  // Plan consolidation batches
  const consolidationPlan = useMemo<ConsolidationBatch[]>(
    () => service.planConsolidation(tokenNotes, { maxNotesPerBatch }),
    [service, tokenNotes, maxNotesPerBatch]
  );

  // Get summary for UI
  const summary = useMemo(
    () => service.getConsolidationSummary(tokenNotes),
    [service, tokenNotes]
  );

  /**
   * Consolidate notes (placeholder - actual implementation requires circuit)
   *
   * This will:
   * 1. Select notes for consolidation
   * 2. Generate ZK proof
   * 3. Execute multi-phase transaction
   * 4. Sync wallet after completion
   */
  const consolidate = useCallback(async () => {
    if (!wallet || !client || !isProverReady) {
      setState((s) => ({
        ...s,
        error: 'Wallet or prover not ready',
      }));
      return;
    }

    if (tokenNotes.length <= 1) {
      setState((s) => ({
        ...s,
        error: 'Nothing to consolidate',
      }));
      return;
    }

    setState({
      isAnalyzing: false,
      isConsolidating: true,
      currentBatch: 0,
      totalBatches: consolidationPlan.length,
      error: null,
    });

    try {
      // TODO: Implement actual consolidation using consolidate_3x1 circuit
      // For now, this is a placeholder that shows the intent

      // For each batch:
      // 1. Select notes from batch
      // 2. Generate stealth output (to self)
      // 3. Create ZK proof
      // 4. Execute multi-phase transaction
      // 5. Wait for confirmation
      // 6. Update state

      // Placeholder: just log the plan
      console.log('[useConsolidation] Consolidation plan:', consolidationPlan);

      // After all batches, sync wallet
      await sync(tokenMint, true);

      setState((s) => ({
        ...s,
        isConsolidating: false,
        currentBatch: consolidationPlan.length,
        error: null,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isConsolidating: false,
        error: err instanceof Error ? err.message : 'Consolidation failed',
      }));
    }
  }, [wallet, client, isProverReady, tokenNotes, consolidationPlan, sync, tokenMint]);

  /**
   * Consolidate a specific batch
   */
  const consolidateBatch = useCallback(async (batchIndex: number) => {
    if (!wallet || !client || !isProverReady) {
      setState((s) => ({
        ...s,
        error: 'Wallet or prover not ready',
      }));
      return;
    }

    const batch = consolidationPlan[batchIndex];
    if (!batch) {
      setState((s) => ({
        ...s,
        error: 'Invalid batch index',
      }));
      return;
    }

    setState((s) => ({
      ...s,
      isConsolidating: true,
      currentBatch: batchIndex,
      error: null,
    }));

    try {
      // TODO: Implement actual batch consolidation
      console.log('[useConsolidation] Consolidating batch:', batch);

      setState((s) => ({
        ...s,
        isConsolidating: false,
        currentBatch: batchIndex + 1,
      }));
    } catch (err) {
      setState((s) => ({
        ...s,
        isConsolidating: false,
        error: err instanceof Error ? err.message : 'Batch consolidation failed',
      }));
    }
  }, [wallet, client, isProverReady, consolidationPlan]);

  /**
   * Estimate gas cost for consolidation
   */
  const estimatedCost = useMemo(() => {
    return service.estimateConsolidationCost(
      consolidationPlan.reduce((sum, batch) => sum + batch.notes.length, 0)
    );
  }, [service, consolidationPlan]);

  return {
    // State
    ...state,

    // Analysis
    fragmentationReport,
    suggestions,
    consolidationPlan,
    summary,

    // Data
    tokenNotes,
    noteCount: tokenNotes.length,
    shouldConsolidate: fragmentationReport.shouldConsolidate,

    // Costs
    estimatedCost,

    // Actions
    consolidate,
    consolidateBatch,

    // Helpers
    canConsolidate: wallet !== null && isProverReady && tokenNotes.length > 1,
  };
}

/**
 * Simple hook for checking if consolidation is recommended
 */
export function useShouldConsolidate(tokenMint: PublicKey): boolean {
  const { notes } = useCloakCraft();
  const service = useMemo(() => new ConsolidationService(), []);

  return useMemo(() => {
    const tokenNotes = notes.filter((n) => n.tokenMint.equals(tokenMint));
    return service.shouldConsolidate(tokenNotes);
  }, [notes, tokenMint, service]);
}

/**
 * Hook for getting fragmentation score
 */
export function useFragmentationScore(tokenMint: PublicKey): number {
  const { notes } = useCloakCraft();
  const service = useMemo(() => new ConsolidationService(), []);

  return useMemo(() => {
    const tokenNotes = notes.filter((n) => n.tokenMint.equals(tokenMint));
    const report = service.analyzeNotes(tokenNotes);
    return report.fragmentationScore;
  }, [notes, tokenMint, service]);
}
