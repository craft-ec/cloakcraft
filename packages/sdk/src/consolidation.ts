/**
 * Consolidation Service
 *
 * Helps users manage note fragmentation by consolidating multiple notes
 * into fewer, larger notes. This improves wallet usability and reduces
 * the number of transactions needed for larger transfers.
 */

import type { DecryptedNote, Point } from '@cloakcraft/types';
import { SmartNoteSelector, FragmentationReport } from './note-selector';

// Re-export FragmentationReport for consumers
export { FragmentationReport } from './note-selector';

/**
 * Consolidation suggestion
 */
export interface ConsolidationSuggestion {
  /** Notes recommended for consolidation */
  notesToConsolidate: DecryptedNote[];
  /** Total amount after consolidation */
  resultingAmount: bigint;
  /** Number of notes reduced */
  notesReduced: number;
  /** Priority (higher = more important) */
  priority: 'low' | 'medium' | 'high';
  /** Reason for suggestion */
  reason: string;
}

/**
 * Consolidation result
 */
export interface ConsolidationResult {
  /** Whether consolidation was successful */
  success: boolean;
  /** New consolidated note (if successful) */
  newNote?: DecryptedNote;
  /** Notes that were consolidated */
  consolidatedNotes: DecryptedNote[];
  /** Transaction signature */
  signature?: string;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Consolidation batch
 */
export interface ConsolidationBatch {
  /** Notes in this batch */
  notes: DecryptedNote[];
  /** Total amount */
  totalAmount: bigint;
  /** Batch number (for multi-batch consolidation) */
  batchNumber: number;
}

/**
 * Options for consolidation
 */
export interface ConsolidationOptions {
  /** Target number of notes after consolidation (default: 1) */
  targetNoteCount?: number;
  /** Maximum notes to consolidate per transaction (default: 3) */
  maxNotesPerBatch?: number;
  /** Dust threshold for prioritizing small notes (default: 1000) */
  dustThreshold?: bigint;
  /** Output stealth pubkey (required for creating new note) */
  outputStealthPubkey?: Point;
  /** Output ephemeral pubkey (required for stealth addresses) */
  outputEphemeralPubkey?: Point;
}

/**
 * Default consolidation options
 */
const DEFAULT_OPTIONS: Required<Omit<ConsolidationOptions, 'outputStealthPubkey' | 'outputEphemeralPubkey'>> = {
  targetNoteCount: 1,
  maxNotesPerBatch: 3, // consolidate_3x1 circuit supports 3 inputs
  dustThreshold: 1000n,
};

/**
 * Consolidation Service
 *
 * Provides tools for analyzing and executing note consolidation:
 * - Analyze fragmentation level
 * - Suggest consolidation opportunities
 * - Plan multi-batch consolidation
 * - Execute consolidation transactions
 */
export class ConsolidationService {
  private noteSelector: SmartNoteSelector;
  private dustThreshold: bigint;

  constructor(dustThreshold: bigint = 1000n) {
    this.dustThreshold = dustThreshold;
    this.noteSelector = new SmartNoteSelector(dustThreshold);
  }

  /**
   * Analyze note fragmentation
   *
   * @param notes - Notes to analyze
   * @returns Fragmentation report
   */
  analyzeNotes(notes: DecryptedNote[]): FragmentationReport {
    return this.noteSelector.analyzeFragmentation(notes);
  }

  /**
   * Suggest consolidation opportunities
   *
   * @param notes - Available notes
   * @param options - Consolidation options
   * @returns Array of consolidation suggestions
   */
  suggestConsolidation(
    notes: DecryptedNote[],
    options: ConsolidationOptions = {}
  ): ConsolidationSuggestion[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const suggestions: ConsolidationSuggestion[] = [];
    const validNotes = notes.filter(n => n.amount > 0n);

    if (validNotes.length <= 1) {
      return []; // Nothing to consolidate
    }

    // Separate dust and non-dust notes
    const dustNotes = validNotes.filter(n => n.amount < opts.dustThreshold);
    const regularNotes = validNotes.filter(n => n.amount >= opts.dustThreshold);

    // High priority: Too many dust notes
    if (dustNotes.length >= 3) {
      const toConsolidate = dustNotes.slice(0, opts.maxNotesPerBatch);
      const totalAmount = toConsolidate.reduce((sum, n) => sum + n.amount, 0n);

      suggestions.push({
        notesToConsolidate: toConsolidate,
        resultingAmount: totalAmount,
        notesReduced: toConsolidate.length - 1,
        priority: 'high',
        reason: `${dustNotes.length} dust notes detected. Consolidating will improve wallet performance.`,
      });
    }

    // Medium priority: More than 5 regular notes
    if (regularNotes.length > 5) {
      // Take smallest regular notes (they're most likely to cause fragmentation issues)
      const sorted = [...regularNotes].sort((a, b) => Number(a.amount - b.amount));
      const toConsolidate = sorted.slice(0, opts.maxNotesPerBatch);
      const totalAmount = toConsolidate.reduce((sum, n) => sum + n.amount, 0n);

      suggestions.push({
        notesToConsolidate: toConsolidate,
        resultingAmount: totalAmount,
        notesReduced: toConsolidate.length - 1,
        priority: 'medium',
        reason: `${regularNotes.length} notes in wallet. Consolidating smallest notes will simplify transfers.`,
      });
    }

    // Low priority: General cleanup opportunity
    if (validNotes.length > 2 && suggestions.length === 0) {
      const sorted = [...validNotes].sort((a, b) => Number(a.amount - b.amount));
      const toConsolidate = sorted.slice(0, Math.min(opts.maxNotesPerBatch, validNotes.length));
      const totalAmount = toConsolidate.reduce((sum, n) => sum + n.amount, 0n);

      suggestions.push({
        notesToConsolidate: toConsolidate,
        resultingAmount: totalAmount,
        notesReduced: toConsolidate.length - 1,
        priority: 'low',
        reason: 'Optional cleanup: consolidating notes may improve future transaction efficiency.',
      });
    }

    return suggestions;
  }

  /**
   * Plan consolidation into batches
   *
   * For many notes, multiple consolidation transactions may be needed.
   * This method plans the batches to minimize the number of transactions.
   *
   * @param notes - Notes to consolidate
   * @param options - Consolidation options
   * @returns Array of consolidation batches
   */
  planConsolidation(
    notes: DecryptedNote[],
    options: ConsolidationOptions = {}
  ): ConsolidationBatch[] {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const validNotes = notes.filter(n => n.amount > 0n);

    if (validNotes.length <= opts.targetNoteCount) {
      return []; // Already at target
    }

    const batches: ConsolidationBatch[] = [];

    // Sort by amount ascending (consolidate smallest first)
    const sorted = [...validNotes].sort((a, b) => Number(a.amount - b.amount));

    // Plan batches
    let remaining = [...sorted];
    let batchNumber = 1;

    while (remaining.length > opts.targetNoteCount) {
      const batchSize = Math.min(opts.maxNotesPerBatch, remaining.length);
      const batchNotes = remaining.slice(0, batchSize);
      const totalAmount = batchNotes.reduce((sum, n) => sum + n.amount, 0n);

      batches.push({
        notes: batchNotes,
        totalAmount,
        batchNumber,
      });

      // Remove consolidated notes and add "virtual" resulting note
      remaining = remaining.slice(batchSize);

      // If more batches needed, the result of this batch becomes input for next
      // (we represent this as a virtual note with the combined amount)
      if (remaining.length + 1 > opts.targetNoteCount) {
        // Add a placeholder for the consolidated result
        // This will be replaced with the actual note after execution
        const virtualNote: DecryptedNote = {
          stealthPubX: batchNotes[0].stealthPubX, // Placeholder
          tokenMint: batchNotes[0].tokenMint,
          amount: totalAmount,
          randomness: new Uint8Array(32),
          leafIndex: -1, // Indicates virtual
          pool: batchNotes[0].pool, // Same pool as source notes
          accountHash: '',
          commitment: new Uint8Array(32),
          // stealthEphemeralPubkey omitted - virtual note placeholder
        };
        remaining.push(virtualNote);
        remaining.sort((a, b) => Number(a.amount - b.amount));
      }

      batchNumber++;
    }

    return batches;
  }

  /**
   * Get optimal notes for a single consolidation transaction
   *
   * @param notes - Available notes
   * @param maxInputs - Maximum inputs (default: 3)
   * @returns Notes to consolidate in this batch
   */
  selectForConsolidation(
    notes: DecryptedNote[],
    maxInputs: number = 3
  ): DecryptedNote[] {
    return this.noteSelector.selectForConsolidation(notes, maxInputs);
  }

  /**
   * Check if consolidation is recommended
   *
   * @param notes - Notes to check
   * @returns Whether consolidation is recommended
   */
  shouldConsolidate(notes: DecryptedNote[]): boolean {
    const report = this.analyzeNotes(notes);
    return report.shouldConsolidate;
  }

  /**
   * Get consolidation summary for UI
   *
   * @param notes - Notes to analyze
   * @returns Summary object for display
   */
  getConsolidationSummary(notes: DecryptedNote[]): {
    totalNotes: number;
    dustNotes: number;
    totalBalance: bigint;
    shouldConsolidate: boolean;
    estimatedBatches: number;
    message: string;
  } {
    const report = this.analyzeNotes(notes);
    const batches = this.planConsolidation(notes);

    let message = '';
    if (!report.shouldConsolidate) {
      message = 'Your wallet is well organized. No consolidation needed.';
    } else if (report.dustNotes > 2) {
      message = `You have ${report.dustNotes} small notes that should be consolidated to improve wallet performance.`;
    } else if (report.totalNotes > 5) {
      message = `You have ${report.totalNotes} notes. Consolidating would simplify your transfers.`;
    } else {
      message = 'Optional cleanup available.';
    }

    return {
      totalNotes: report.totalNotes,
      dustNotes: report.dustNotes,
      totalBalance: report.totalBalance,
      shouldConsolidate: report.shouldConsolidate,
      estimatedBatches: batches.length,
      message,
    };
  }

  /**
   * Estimate gas cost for consolidation
   *
   * @param numInputs - Number of input notes
   * @returns Estimated cost in lamports
   */
  estimateConsolidationCost(numInputs: number): bigint {
    // Base cost + per-input cost
    // Phase 0 (proof verification): ~50,000 CU
    // Phase 1 (verify commitment) per input: ~30,000 CU
    // Phase 2 (create nullifier) per input: ~30,000 CU
    // Phase 4 (create commitment): ~30,000 CU
    // Total: ~50,000 + 60,000 * numInputs + 30,000

    // At 50 microlamports per CU:
    // ~80,000 + 60,000 * numInputs CU
    // ~4,000 + 3,000 * numInputs microlamports
    // ~4,000,000 + 3,000,000 * numInputs lamports for priority fees

    // Plus base transaction fee: 5,000 lamports per signature
    // Assuming 4 transactions: 20,000 lamports

    const baseCost = 100_000n; // Base lamports
    const perInputCost = 50_000n; // Per input lamports

    return baseCost + perInputCost * BigInt(numInputs);
  }
}

// Export a default instance
export const consolidationService = new ConsolidationService();
