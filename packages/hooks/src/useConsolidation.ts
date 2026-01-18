/**
 * Note Consolidation Hook
 *
 * Provides tools for analyzing wallet fragmentation and consolidating notes.
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import {
  ConsolidationService,
  FragmentationReport,
  ConsolidationSuggestion,
  ConsolidationBatch,
} from '@cloakcraft/sdk';

/** Progress stages for consolidation operation */
export type ConsolidationProgressStage =
  | 'preparing'     // Preparing notes for consolidation
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming'    // Waiting for confirmation
  | 'syncing';      // Syncing notes after batch

/** Batch info passed to progress callback */
export interface ConsolidationBatchInfo {
  current: number;
  total: number;
}

/** Progress callback type for consolidation */
export type ConsolidationProgressCallback = (
  stage: ConsolidationProgressStage,
  batchInfo?: ConsolidationBatchInfo
) => void;

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

  // Ref to prevent concurrent consolidation calls
  const isConsolidatingRef = useRef(false);

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
   * Consolidate notes using the consolidate_3x1 circuit
   *
   * This will:
   * 1. Select notes for consolidation (up to 3 per batch)
   * 2. Generate ZK proof for each batch
   * 3. Execute multi-phase transaction
   * 4. Resync notes and repeat until target is achievable or fully consolidated
   *
   * IMPORTANT: After each batch, notes are spent and new ones created.
   * We must resync and recalculate the plan after each batch.
   *
   * @param onProgress - Optional progress callback for UI updates
   * @param targetAmount - Optional target amount; stops early when achievable with maxInputs notes
   * @param maxInputs - Max notes allowed for transaction (default 2)
   */
  const consolidate = useCallback(async (
    onProgress?: ConsolidationProgressCallback,
    targetAmount?: bigint,
    maxInputs: number = 2
  ) => {
    // Guard against concurrent calls using ref (faster than state)
    if (isConsolidatingRef.current) {
      console.log('[useConsolidation] Already consolidating, skipping...');
      return;
    }

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

    // Set ref immediately to prevent concurrent calls
    isConsolidatingRef.current = true;

    // Estimate total batches needed based on target amount if specified
    let estimatedBatches: number;
    if (targetAmount !== undefined) {
      // Calculate how many notes we need for the target
      const sortedNotes = [...tokenNotes].sort((a, b) => Number(a.amount - b.amount));
      let sum = 0n;
      let notesNeeded = 0;
      for (const note of sortedNotes) {
        sum += note.amount;
        notesNeeded++;
        if (sum >= targetAmount) break;
      }
      // Each batch consolidates 3→1, reducing note count by 2
      // We need to get from notesNeeded down to maxInputs
      if (notesNeeded <= maxInputs) {
        estimatedBatches = 0;
      } else {
        estimatedBatches = Math.ceil((notesNeeded - maxInputs) / 2);
      }
    } else {
      // No target - estimate based on total notes
      estimatedBatches = Math.ceil(Math.log(tokenNotes.length) / Math.log(3));
    }

    setState({
      isAnalyzing: false,
      isConsolidating: true,
      currentBatch: 0,
      totalBatches: estimatedBatches,
      error: null,
    });

    try {
      console.log('[useConsolidation] Starting recursive consolidation...', {
        noteCount: tokenNotes.length,
        notesForTarget: targetAmount !== undefined ? 'calculated' : 'all',
        estimatedBatches,
      });

      let batchNumber = 0;
      let currentTotalBatches = estimatedBatches;
      const maxIterations = 10; // Safety limit

      // Recursive consolidation loop
      while (batchNumber < maxIterations) {
        // Get fresh notes directly from client (not from React state which is stale in closure)
        console.log('[useConsolidation] Fetching fresh notes from client...');
        client.clearScanCache();
        const freshNotes = await client.scanNotes(tokenMint);

        // Filter for this token
        const currentNotes = freshNotes.filter((n) => n.tokenMint.equals(tokenMint));
        console.log(`[useConsolidation] Fresh notes for token: ${currentNotes.length}`);

        // Also update the context state
        await sync(tokenMint, true);

        // Check if we're done
        if (currentNotes.length <= 1) {
          console.log('[useConsolidation] Consolidation complete - only 1 note remaining');
          break;
        }

        // Sort by amount ascending (smallest first) - we prefer using/consolidating small notes
        const sortedBySmallest = [...currentNotes].sort((a, b) => Number(a.amount - b.amount));

        // If target amount specified, find smallest notes needed to cover target
        let notesToConsolidate: typeof currentNotes;

        if (targetAmount !== undefined) {
          // Find minimum smallest notes needed to cover target
          let sum = 0n;
          let notesNeeded = 0;
          for (const note of sortedBySmallest) {
            sum += note.amount;
            notesNeeded++;
            if (sum >= targetAmount) break;
          }

          if (notesNeeded <= maxInputs && sum >= targetAmount) {
            console.log(`[useConsolidation] Target achievable with ${notesNeeded} smallest notes (max ${maxInputs}), stopping early`);
            break;
          }

          // Consolidate exactly the notes needed for target (up to 3 per batch)
          // This creates 1 note that covers the target after consolidation
          const notesForTarget = sortedBySmallest.slice(0, notesNeeded);
          notesToConsolidate = notesForTarget.slice(0, Math.min(3, notesForTarget.length));

          console.log(`[useConsolidation] Need ${notesNeeded} notes for target, consolidating ${notesToConsolidate.length} smallest...`);
        } else {
          // No target - just consolidate 3 smallest to clean up dust
          notesToConsolidate = sortedBySmallest.slice(0, Math.min(3, sortedBySmallest.length));
        }

        if (notesToConsolidate.length < 2) {
          console.log('[useConsolidation] Not enough notes to consolidate');
          break;
        }

        batchNumber++;
        // Recalculate total batches based on remaining notes
        const remainingAfterBatch = currentNotes.length - notesToConsolidate.length + 1;
        // When target is specified and remaining notes <= maxInputs, we'll stop after this batch
        const willStopAfterBatch = targetAmount !== undefined && remainingAfterBatch <= maxInputs;
        const additionalBatches = willStopAfterBatch ? 0 : (remainingAfterBatch > 1 ? Math.ceil(Math.log(remainingAfterBatch) / Math.log(3)) : 0);
        currentTotalBatches = Math.max(currentTotalBatches, batchNumber + additionalBatches);

        console.log(`[useConsolidation] Processing batch ${batchNumber} of ${currentTotalBatches}...`, {
          notesToConsolidate: notesToConsolidate.length,
          remainingNotes: currentNotes.length,
        });

        setState((s) => ({
          ...s,
          currentBatch: batchNumber,
          totalBatches: currentTotalBatches,
        }));

        // Create a wrapper that adds batch info to the progress callback
        const batchInfo: ConsolidationBatchInfo = { current: batchNumber, total: currentTotalBatches };
        const wrappedOnProgress = onProgress
          ? (stage: ConsolidationProgressStage) => onProgress(stage, batchInfo)
          : undefined;

        // Execute consolidation for this batch
        const result = await client.prepareAndConsolidate(notesToConsolidate, tokenMint, wrappedOnProgress);
        console.log(`[useConsolidation] Batch ${batchNumber} completed:`, result.signature);

        // Wait for indexer to catch up before next iteration
        onProgress?.('syncing', batchInfo);
        console.log('[useConsolidation] Waiting for indexer sync...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Final sync to update React state
      await sync(tokenMint, true);

      setState((s) => ({
        ...s,
        isConsolidating: false,
        currentBatch: batchNumber,
        error: null,
      }));

      console.log('[useConsolidation] Consolidation complete!');
    } catch (err) {
      console.error('[useConsolidation] Consolidation failed:', err);
      setState((s) => ({
        ...s,
        isConsolidating: false,
        error: err instanceof Error ? err.message : 'Consolidation failed',
      }));
      // Re-throw so callers can handle the error
      throw err;
    } finally {
      // Always reset the ref when done
      isConsolidatingRef.current = false;
    }
  }, [wallet, client, isProverReady, tokenNotes, sync, tokenMint]);

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
      console.log(`[useConsolidation] Consolidating batch ${batchIndex + 1}...`, batch);

      // Get notes for this batch (max 3)
      const batchNotes = batch.notes.slice(0, 3);

      if (batchNotes.length === 0) {
        throw new Error('Empty batch');
      }

      // Execute consolidation for this batch
      const result = await client.prepareAndConsolidate(batchNotes, tokenMint);
      console.log(`[useConsolidation] Batch ${batchIndex + 1} completed:`, result.signature);

      // Sync after consolidation
      await sync(tokenMint, true);

      setState((s) => ({
        ...s,
        isConsolidating: false,
        currentBatch: batchIndex + 1,
      }));
    } catch (err) {
      console.error('[useConsolidation] Batch consolidation failed:', err);
      setState((s) => ({
        ...s,
        isConsolidating: false,
        error: err instanceof Error ? err.message : 'Batch consolidation failed',
      }));
    }
  }, [wallet, client, isProverReady, consolidationPlan, tokenMint, sync]);

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
