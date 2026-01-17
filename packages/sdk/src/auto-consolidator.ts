/**
 * Auto-Consolidator
 *
 * Background service that monitors wallet fragmentation and automatically
 * triggers consolidation when thresholds are exceeded.
 */

import type { DecryptedNote } from '@cloakcraft/types';
import { ConsolidationService, FragmentationReport } from './consolidation';

/**
 * Auto-consolidation configuration
 */
export interface AutoConsolidationConfig {
  /** Enable auto-consolidation */
  enabled: boolean;
  /** Fragmentation score threshold to trigger consolidation (0-100, default: 60) */
  fragmentationThreshold?: number;
  /** Maximum number of notes before triggering consolidation (default: 8) */
  maxNoteCount?: number;
  /** Maximum dust notes before triggering consolidation (default: 3) */
  maxDustNotes?: number;
  /** Dust threshold in smallest units (default: 1000) */
  dustThreshold?: bigint;
  /** Minimum delay between consolidation checks in ms (default: 60000) */
  checkIntervalMs?: number;
  /** Callback when consolidation is recommended */
  onConsolidationRecommended?: (report: FragmentationReport) => void;
  /** Callback when consolidation starts */
  onConsolidationStart?: () => void;
  /** Callback when consolidation completes */
  onConsolidationComplete?: (success: boolean, error?: string) => void;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<AutoConsolidationConfig, 'onConsolidationRecommended' | 'onConsolidationStart' | 'onConsolidationComplete'>> = {
  enabled: false,
  fragmentationThreshold: 60,
  maxNoteCount: 8,
  maxDustNotes: 3,
  dustThreshold: 1000n,
  checkIntervalMs: 60000, // 1 minute
};

/**
 * Auto-consolidation state
 */
export interface AutoConsolidationState {
  /** Whether auto-consolidation is enabled */
  enabled: boolean;
  /** Last check timestamp */
  lastCheckAt: number | null;
  /** Whether consolidation is currently running */
  isConsolidating: boolean;
  /** Last fragmentation report */
  lastReport: FragmentationReport | null;
  /** Whether consolidation is currently recommended */
  isRecommended: boolean;
}

/**
 * Auto-Consolidator class
 *
 * Monitors note fragmentation and triggers consolidation when needed.
 * Can be run in background mode or manually triggered.
 */
export class AutoConsolidator {
  private config: Required<Omit<AutoConsolidationConfig, 'onConsolidationRecommended' | 'onConsolidationStart' | 'onConsolidationComplete'>> & Partial<Pick<AutoConsolidationConfig, 'onConsolidationRecommended' | 'onConsolidationStart' | 'onConsolidationComplete'>>;
  private service: ConsolidationService;
  private state: AutoConsolidationState;
  private checkInterval: NodeJS.Timeout | null = null;
  private noteProvider: (() => DecryptedNote[]) | null = null;

  constructor(config: AutoConsolidationConfig = { enabled: false }) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.service = new ConsolidationService(this.config.dustThreshold);
    this.state = {
      enabled: this.config.enabled,
      lastCheckAt: null,
      isConsolidating: false,
      lastReport: null,
      isRecommended: false,
    };
  }

  /**
   * Set the note provider function
   *
   * The provider is called periodically to get fresh notes for analysis.
   */
  setNoteProvider(provider: () => DecryptedNote[]): void {
    this.noteProvider = provider;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoConsolidationConfig>): void {
    this.config = { ...this.config, ...config };

    if (this.config.enabled !== this.state.enabled) {
      this.state.enabled = this.config.enabled;
      if (this.config.enabled) {
        this.start();
      } else {
        this.stop();
      }
    }
  }

  /**
   * Start background monitoring
   */
  start(): void {
    if (this.checkInterval) {
      return; // Already running
    }

    this.state.enabled = true;

    // Perform initial check
    this.check();

    // Start periodic checks
    this.checkInterval = setInterval(() => {
      this.check();
    }, this.config.checkIntervalMs);
  }

  /**
   * Stop background monitoring
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.state.enabled = false;
  }

  /**
   * Perform a manual check
   */
  check(): FragmentationReport | null {
    if (!this.noteProvider) {
      return null;
    }

    const notes = this.noteProvider();
    const report = this.service.analyzeNotes(notes);

    this.state.lastCheckAt = Date.now();
    this.state.lastReport = report;

    // Check if consolidation is recommended
    const isRecommended = this.shouldConsolidate(report);
    this.state.isRecommended = isRecommended;

    if (isRecommended && this.config.onConsolidationRecommended) {
      this.config.onConsolidationRecommended(report);
    }

    return report;
  }

  /**
   * Check if consolidation should be triggered
   */
  private shouldConsolidate(report: FragmentationReport): boolean {
    // Check fragmentation score
    if (report.fragmentationScore >= this.config.fragmentationThreshold) {
      return true;
    }

    // Check note count
    if (report.totalNotes >= this.config.maxNoteCount) {
      return true;
    }

    // Check dust notes
    if (report.dustNotes >= this.config.maxDustNotes) {
      return true;
    }

    return false;
  }

  /**
   * Get current state
   */
  getState(): AutoConsolidationState {
    return { ...this.state };
  }

  /**
   * Get the last fragmentation report
   */
  getLastReport(): FragmentationReport | null {
    return this.state.lastReport;
  }

  /**
   * Check if consolidation is currently recommended
   */
  isConsolidationRecommended(): boolean {
    return this.state.isRecommended;
  }

  /**
   * Get consolidation suggestions based on current notes
   */
  getSuggestions() {
    if (!this.noteProvider) {
      return [];
    }
    return this.service.suggestConsolidation(this.noteProvider());
  }

  /**
   * Estimate the cost of consolidation
   */
  estimateCost(): bigint {
    if (!this.noteProvider) {
      return 0n;
    }
    const notes = this.noteProvider();
    return this.service.estimateConsolidationCost(notes.length);
  }
}

// Singleton instance for global use
let globalAutoConsolidator: AutoConsolidator | null = null;

/**
 * Get or create the global auto-consolidator instance
 */
export function getAutoConsolidator(config?: AutoConsolidationConfig): AutoConsolidator {
  if (!globalAutoConsolidator) {
    globalAutoConsolidator = new AutoConsolidator(config);
  } else if (config) {
    globalAutoConsolidator.updateConfig(config);
  }
  return globalAutoConsolidator;
}

/**
 * Enable auto-consolidation globally
 */
export function enableAutoConsolidation(
  config: Omit<AutoConsolidationConfig, 'enabled'> = {}
): AutoConsolidator {
  const consolidator = getAutoConsolidator({ ...config, enabled: true });
  consolidator.start();
  return consolidator;
}

/**
 * Disable auto-consolidation globally
 */
export function disableAutoConsolidation(): void {
  if (globalAutoConsolidator) {
    globalAutoConsolidator.stop();
  }
}
