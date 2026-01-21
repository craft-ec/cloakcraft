/**
 * Smart Note Selector
 *
 * Intelligently selects notes for transactions based on amount requirements
 * and circuit capabilities. Supports multiple selection strategies.
 */

import type { DecryptedNote } from '@cloakcraft/types';
import { CIRCUIT_IDS } from './instructions/constants';

/**
 * Selection strategy for note selection
 */
export type SelectionStrategy =
  | 'greedy'              // Select largest notes first until target met
  | 'exact'               // Find exact match or closest without change
  | 'minimize-change'     // Minimize change output for privacy
  | 'consolidation-aware' // Prefer using dust notes to clean up wallet
  | 'smallest-first';     // Use smallest notes first (for consolidation)

/**
 * Circuit type based on inputs/outputs
 * Note: Only transfer_1x2 is supported for transfers. Use consolidate_3x1 first if multiple inputs needed.
 */
export type CircuitType =
  | 'transfer_1x2'     // 1 input, 2 outputs
  | 'consolidate_3x1'; // 3 inputs, 1 output (consolidation)

/**
 * Result of note selection
 */
export interface NoteSelectionResult {
  /** Selected notes */
  notes: DecryptedNote[];
  /** Total amount of selected notes */
  totalAmount: bigint;
  /** Change amount (total - target) */
  changeAmount: bigint;
  /** Circuit type to use */
  circuitType: CircuitType;
  /** Whether consolidation is recommended before this transfer */
  needsConsolidation: boolean;
  /** Reason if selection failed */
  error?: string;
}

/**
 * Options for note selection
 */
export interface NoteSelectionOptions {
  /** Selection strategy (default: greedy) */
  strategy?: SelectionStrategy;
  /** Maximum number of inputs (default: 2) */
  maxInputs?: number;
  /** Include fee in target calculation */
  feeAmount?: bigint;
  /** Dust threshold - notes below this are considered dust (default: 1000 = 0.001 tokens at 6 decimals) */
  dustThreshold?: bigint;
}

/**
 * Fragmentation analysis result
 */
export interface FragmentationReport {
  /** Total number of notes */
  totalNotes: number;
  /** Number of dust notes (below threshold) */
  dustNotes: number;
  /** Largest note amount */
  largestNote: bigint;
  /** Smallest note amount */
  smallestNote: bigint;
  /** Total balance across all notes */
  totalBalance: bigint;
  /** Fragmentation score (0-100, higher = more fragmented) */
  fragmentationScore: number;
  /** Whether consolidation is recommended */
  shouldConsolidate: boolean;
}

/**
 * Default options
 *
 * Using 'smallest-first' as default to reduce wallet fragmentation.
 * This uses smaller notes first, creating smaller change outputs.
 */
const DEFAULT_OPTIONS: Required<NoteSelectionOptions> = {
  strategy: 'smallest-first',
  maxInputs: 2,
  feeAmount: 0n,
  dustThreshold: 1000n, // 0.001 tokens at 6 decimals
};

/**
 * Smart Note Selector
 *
 * Provides intelligent note selection for transactions based on:
 * - Amount requirements
 * - Available circuit types
 * - Privacy considerations
 * - Wallet cleanup (dust consolidation)
 */
export class SmartNoteSelector {
  private dustThreshold: bigint;

  constructor(dustThreshold: bigint = 1000n) {
    this.dustThreshold = dustThreshold;
  }

  /**
   * Select notes for a transaction
   *
   * @param notes - Available notes to select from
   * @param targetAmount - Amount needed for the transaction
   * @param options - Selection options
   * @returns Selection result with notes, circuit type, and metadata
   */
  selectNotes(
    notes: DecryptedNote[],
    targetAmount: bigint,
    options: NoteSelectionOptions = {}
  ): NoteSelectionResult {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const effectiveTarget = targetAmount + (opts.feeAmount ?? 0n);

    // Filter out notes with 0 amount
    const validNotes = notes.filter(n => n.amount > 0n);

    if (validNotes.length === 0) {
      return {
        notes: [],
        totalAmount: 0n,
        changeAmount: 0n,
        circuitType: 'transfer_1x2',
        needsConsolidation: false,
        error: 'No valid notes available',
      };
    }

    // Calculate total balance
    const totalBalance = validNotes.reduce((sum, n) => sum + n.amount, 0n);

    if (totalBalance < effectiveTarget) {
      return {
        notes: [],
        totalAmount: 0n,
        changeAmount: 0n,
        circuitType: 'transfer_1x2',
        needsConsolidation: false,
        error: `Insufficient balance: have ${totalBalance}, need ${effectiveTarget}`,
      };
    }

    // Try different strategies based on options
    switch (opts.strategy) {
      case 'exact':
        return this.selectExact(validNotes, effectiveTarget, opts.maxInputs);
      case 'minimize-change':
        return this.selectMinimizeChange(validNotes, effectiveTarget, opts.maxInputs);
      case 'consolidation-aware':
        return this.selectConsolidationAware(validNotes, effectiveTarget, opts.maxInputs);
      case 'smallest-first':
        return this.selectSmallestFirst(validNotes, effectiveTarget, opts.maxInputs);
      case 'greedy':
      default:
        return this.selectGreedy(validNotes, effectiveTarget, opts.maxInputs);
    }
  }

  /**
   * Greedy selection - select largest notes first
   */
  private selectGreedy(
    notes: DecryptedNote[],
    target: bigint,
    maxInputs: number
  ): NoteSelectionResult {
    // Sort by amount descending
    const sorted = [...notes].sort((a, b) =>
      Number(b.amount - a.amount)
    );

    const selected: DecryptedNote[] = [];
    let total = 0n;

    for (const note of sorted) {
      if (total >= target) break;
      if (selected.length >= maxInputs) break;

      selected.push(note);
      total += note.amount;
    }

    if (total < target) {
      // Check if we could succeed with more inputs
      const needsConsolidation = this.wouldSucceedWithMoreInputs(sorted, target, maxInputs);
      return {
        notes: [],
        totalAmount: 0n,
        changeAmount: 0n,
        circuitType: this.getCircuitType(maxInputs),
        needsConsolidation,
        error: needsConsolidation
          ? 'Need more inputs than supported. Consolidate notes first.'
          : 'Cannot select sufficient notes',
      };
    }

    return {
      notes: selected,
      totalAmount: total,
      changeAmount: total - target,
      circuitType: this.getCircuitType(selected.length),
      needsConsolidation: false,
    };
  }

  /**
   * Exact selection - try to find exact match
   */
  private selectExact(
    notes: DecryptedNote[],
    target: bigint,
    maxInputs: number
  ): NoteSelectionResult {
    // First, check for a single note that exactly matches
    const exactMatch = notes.find(n => n.amount === target);
    if (exactMatch) {
      return {
        notes: [exactMatch],
        totalAmount: target,
        changeAmount: 0n,
        circuitType: 'transfer_1x2',
        needsConsolidation: false,
      };
    }

    // Try all 2-note combinations for exact match
    if (maxInputs >= 2) {
      for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
          const sum = notes[i].amount + notes[j].amount;
          if (sum === target) {
            return {
              notes: [notes[i], notes[j]],
              totalAmount: target,
              changeAmount: 0n,
              circuitType: 'transfer_1x2',
              needsConsolidation: true, // Multiple inputs require consolidation first
            };
          }
        }
      }
    }

    // Fall back to greedy
    return this.selectGreedy(notes, target, maxInputs);
  }

  /**
   * Minimize change - find combination with smallest change
   */
  private selectMinimizeChange(
    notes: DecryptedNote[],
    target: bigint,
    maxInputs: number
  ): NoteSelectionResult {
    let bestResult: NoteSelectionResult | null = null;

    // Try single notes
    for (const note of notes) {
      if (note.amount >= target) {
        const change = note.amount - target;
        if (!bestResult || change < bestResult.changeAmount) {
          bestResult = {
            notes: [note],
            totalAmount: note.amount,
            changeAmount: change,
            circuitType: 'transfer_1x2',
            needsConsolidation: false,
          };
        }
      }
    }

    // Try 2-note combinations
    if (maxInputs >= 2) {
      for (let i = 0; i < notes.length; i++) {
        for (let j = i + 1; j < notes.length; j++) {
          const sum = notes[i].amount + notes[j].amount;
          if (sum >= target) {
            const change = sum - target;
            if (!bestResult || change < bestResult.changeAmount) {
              bestResult = {
                notes: [notes[i], notes[j]],
                totalAmount: sum,
                changeAmount: change,
                circuitType: 'transfer_1x2',
              needsConsolidation: true, // Multiple inputs require consolidation first
              };
            }
          }
        }
      }
    }

    if (bestResult) {
      return bestResult;
    }

    // Fall back to greedy
    return this.selectGreedy(notes, target, maxInputs);
  }

  /**
   * Consolidation-aware - prefer using dust notes
   */
  private selectConsolidationAware(
    notes: DecryptedNote[],
    target: bigint,
    maxInputs: number
  ): NoteSelectionResult {
    // Separate dust and non-dust notes
    const dustNotes = notes.filter(n => n.amount < this.dustThreshold);
    const regularNotes = notes.filter(n => n.amount >= this.dustThreshold);

    // First, try to use dust notes if they can cover the amount
    if (dustNotes.length > 0) {
      const dustTotal = dustNotes.reduce((sum, n) => sum + n.amount, 0n);

      // If dust can cover target, use dust first
      if (dustTotal >= target) {
        const result = this.selectGreedy(dustNotes, target, maxInputs);
        if (!result.error) {
          return result;
        }
      }

      // Try combining dust with one regular note
      if (maxInputs >= 2 && regularNotes.length > 0) {
        // Sort dust by amount descending
        const sortedDust = [...dustNotes].sort((a, b) => Number(b.amount - a.amount));
        const sortedRegular = [...regularNotes].sort((a, b) => Number(b.amount - a.amount));

        for (const dust of sortedDust) {
          for (const regular of sortedRegular) {
            const sum = dust.amount + regular.amount;
            if (sum >= target) {
              return {
                notes: [regular, dust], // Put larger first for consistency
                totalAmount: sum,
                changeAmount: sum - target,
                circuitType: 'transfer_1x2',
              needsConsolidation: true, // Multiple inputs require consolidation first
              };
            }
          }
        }
      }
    }

    // Fall back to greedy
    return this.selectGreedy(notes, target, maxInputs);
  }

  /**
   * Smallest-first selection - for consolidation operations
   */
  private selectSmallestFirst(
    notes: DecryptedNote[],
    target: bigint,
    maxInputs: number
  ): NoteSelectionResult {
    // Sort by amount ascending
    const sorted = [...notes].sort((a, b) =>
      Number(a.amount - b.amount)
    );

    const selected: DecryptedNote[] = [];
    let total = 0n;

    for (const note of sorted) {
      if (total >= target) break;
      if (selected.length >= maxInputs) break;

      selected.push(note);
      total += note.amount;
    }

    if (total < target) {
      const needsConsolidation = this.wouldSucceedWithMoreInputs(sorted, target, maxInputs);
      return {
        notes: [],
        totalAmount: 0n,
        changeAmount: 0n,
        circuitType: this.getCircuitType(maxInputs),
        needsConsolidation,
        error: needsConsolidation
          ? 'Need more inputs than supported. Consolidate notes first.'
          : 'Cannot select sufficient notes',
      };
    }

    return {
      notes: selected,
      totalAmount: total,
      changeAmount: total - target,
      circuitType: this.getCircuitType(selected.length),
      needsConsolidation: false,
    };
  }

  /**
   * Check if we would succeed with more inputs
   */
  private wouldSucceedWithMoreInputs(
    sortedNotes: DecryptedNote[],
    target: bigint,
    currentMaxInputs: number
  ): boolean {
    let total = 0n;
    for (let i = 0; i < sortedNotes.length; i++) {
      total += sortedNotes[i].amount;
      if (total >= target && i >= currentMaxInputs) {
        return true; // Would succeed with more inputs
      }
    }
    return false;
  }

  /**
   * Get circuit type based on number of inputs
   * Note: Only transfer_1x2 is supported. For multiple inputs, consolidate first.
   */
  private getCircuitType(numInputs: number): CircuitType {
    // Only transfer_1x2 is supported - use consolidate_3x1 first for multiple inputs
    return 'transfer_1x2';
  }

  /**
   * Get circuit ID for the given circuit type
   */
  getCircuitId(circuitType: CircuitType): string {
    switch (circuitType) {
      case 'transfer_1x2':
        return CIRCUIT_IDS.TRANSFER_1X2;
      case 'consolidate_3x1':
        return CIRCUIT_IDS.CONSOLIDATE_3X1;
      default:
        return CIRCUIT_IDS.TRANSFER_1X2;
    }
  }

  /**
   * Analyze wallet fragmentation
   */
  analyzeFragmentation(notes: DecryptedNote[]): FragmentationReport {
    const validNotes = notes.filter(n => n.amount > 0n);

    if (validNotes.length === 0) {
      return {
        totalNotes: 0,
        dustNotes: 0,
        largestNote: 0n,
        smallestNote: 0n,
        totalBalance: 0n,
        fragmentationScore: 0,
        shouldConsolidate: false,
      };
    }

    const dustNotes = validNotes.filter(n => n.amount < this.dustThreshold).length;
    const amounts = validNotes.map(n => n.amount);
    const largestNote = amounts.reduce((max, a) => a > max ? a : max, 0n);
    const smallestNote = amounts.reduce((min, a) => a < min ? a : min, largestNote);
    const totalBalance = amounts.reduce((sum, a) => sum + a, 0n);

    // Calculate fragmentation score:
    // - More notes = more fragmented
    // - More dust notes = more fragmented
    // - If largest note is small fraction of total = fragmented
    const noteCountFactor = Math.min(validNotes.length / 10, 1) * 40; // 0-40 points
    const dustFactor = (dustNotes / validNotes.length) * 30; // 0-30 points
    const concentrationFactor = totalBalance > 0n
      ? (1 - Number(largestNote * 100n / totalBalance) / 100) * 30
      : 0; // 0-30 points

    const fragmentationScore = Math.round(noteCountFactor + dustFactor + concentrationFactor);

    // Recommend consolidation if:
    // - More than 5 notes
    // - More than 2 dust notes
    // - Fragmentation score > 50
    const shouldConsolidate =
      validNotes.length > 5 ||
      dustNotes > 2 ||
      fragmentationScore > 50;

    return {
      totalNotes: validNotes.length,
      dustNotes,
      largestNote,
      smallestNote,
      totalBalance,
      fragmentationScore,
      shouldConsolidate,
    };
  }

  /**
   * Select notes for consolidation
   *
   * @param notes - Available notes
   * @param maxInputs - Maximum inputs (default: 3 for consolidate_3x1)
   * @returns Notes to consolidate
   */
  selectForConsolidation(
    notes: DecryptedNote[],
    maxInputs: number = 3
  ): DecryptedNote[] {
    const validNotes = notes.filter(n => n.amount > 0n);

    if (validNotes.length <= 1) {
      return []; // Nothing to consolidate
    }

    // For consolidation, prefer smallest notes first to clean up dust
    const sorted = [...validNotes].sort((a, b) => Number(a.amount - b.amount));

    return sorted.slice(0, Math.min(maxInputs, sorted.length));
  }
}

// Export a default instance
export const noteSelector = new SmartNoteSelector();
