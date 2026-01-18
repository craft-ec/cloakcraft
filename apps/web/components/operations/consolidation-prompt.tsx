'use client';

import { useState } from 'react';
import { AlertTriangle, Zap, ChevronRight, X, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useConsolidation, useShouldConsolidate } from '@cloakcraft/hooks';
import { PublicKey } from '@solana/web3.js';
import { TransactionOverlay, TransactionStep } from './transaction-overlay';

interface ConsolidationPromptProps {
  /** Token mint to check consolidation for */
  tokenMint: PublicKey;
  /** Token symbol for display */
  tokenSymbol?: string;
  /** Callback when consolidation completes */
  onConsolidated?: () => void;
  /** Whether to show as inline alert or dismissible banner */
  variant?: 'alert' | 'banner';
  /** Additional class names */
  className?: string;
}

/**
 * Consolidation recommendation prompt
 * Shows when user's notes are fragmented and recommends consolidation
 */
export function ConsolidationPrompt({
  tokenMint,
  tokenSymbol = 'tokens',
  onConsolidated,
  variant = 'alert',
  className,
}: ConsolidationPromptProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);

  const shouldConsolidate = useShouldConsolidate(tokenMint);
  const {
    consolidate,
    isConsolidating,
    fragmentationReport,
    error,
  } = useConsolidation({ tokenMint });

  const reset = () => {}; // Consolidation hook doesn't have reset, add dummy

  // Transaction overlay state
  const [overlaySteps, setOverlaySteps] = useState<TransactionStep[]>([]);
  const [overlayStatus, setOverlayStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');

  if (!shouldConsolidate || isDismissed) {
    return null;
  }

  const handleConsolidate = async () => {
    // Initialize overlay
    const steps: TransactionStep[] = [
      { id: 'prepare', name: 'Preparing consolidation', description: 'Analyzing notes...', status: 'active' },
      { id: 'proof', name: 'Generating proof', description: 'Creating zero-knowledge proof...', status: 'pending' },
      { id: 'submit', name: 'Submitting transaction', description: 'Sending to network...', status: 'pending' },
      { id: 'confirm', name: 'Confirming', description: 'Waiting for confirmation...', status: 'pending' },
    ];
    setOverlaySteps(steps);
    setOverlayStatus('pending');
    setShowOverlay(true);

    try {
      // Update to proof generation
      setOverlaySteps(prev => prev.map(s =>
        s.id === 'prepare' ? { ...s, status: 'completed' } :
        s.id === 'proof' ? { ...s, status: 'active' } : s
      ));

      await consolidate();

      // Mark all as completed
      setOverlaySteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
      setOverlayStatus('success');
      onConsolidated?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Consolidation failed';
      setOverlaySteps(prev => {
        const activeIndex = prev.findIndex(s => s.status === 'active');
        return prev.map((s, i) => i === activeIndex ? { ...s, status: 'error', error: errorMsg } : s);
      });
      setOverlayStatus('error');
    }
  };

  const handleCloseOverlay = () => {
    setShowOverlay(false);
    if (overlayStatus === 'success') {
      setIsDismissed(true);
    }
    reset();
  };

  if (variant === 'banner') {
    return (
      <>
        <div
          className={cn(
            'relative overflow-hidden rounded-lg border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:border-orange-900/50 dark:from-orange-950/30 dark:to-amber-950/30',
            className
          )}
        >
          <div className="flex items-center gap-4 p-4">
            <div className="flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-orange-800 dark:text-orange-200">
                Optimize Your Wallet
              </h4>
              <p className="text-sm text-orange-700/80 dark:text-orange-300/80 mt-0.5">
                Your {tokenSymbol} balance is spread across {fragmentationReport?.totalNotes || 'multiple'} notes.
                Consolidating will improve transaction efficiency.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleConsolidate}
                disabled={isConsolidating}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {isConsolidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Consolidating...
                  </>
                ) : (
                  <>
                    Consolidate
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDismissed(true)}
                className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/50"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Decorative element */}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-orange-200/50 dark:bg-orange-800/20 blur-2xl" />
        </div>

        <TransactionOverlay
          isOpen={showOverlay}
          onClose={handleCloseOverlay}
          title="Consolidating Notes"
          steps={overlaySteps}
          status={overlayStatus}
          onRetry={handleConsolidate}
        />
      </>
    );
  }

  // Alert variant
  return (
    <>
      <div
        className={cn(
          'flex items-start gap-3 p-3 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-950/30',
          className
        )}
      >
        <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
            Note consolidation recommended
          </p>
          <p className="text-xs text-orange-600/80 dark:text-orange-400/80 mt-0.5">
            {fragmentationReport?.totalNotes || 'Multiple'} fragmented notes detected.
            {fragmentationReport?.fragmentationScore && ` Fragmentation score: ${fragmentationReport.fragmentationScore}%`}
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={handleConsolidate}
            disabled={isConsolidating}
            className="h-auto p-0 text-orange-600 hover:text-orange-700 mt-1"
          >
            {isConsolidating ? 'Consolidating...' : 'Consolidate now'}
            {!isConsolidating && <ChevronRight className="ml-1 h-3 w-3" />}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsDismissed(true)}
          className="h-6 w-6 text-orange-500 hover:text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900/50 -mt-1 -mr-1"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>

      <TransactionOverlay
        isOpen={showOverlay}
        onClose={handleCloseOverlay}
        title="Consolidating Notes"
        steps={overlaySteps}
        status={overlayStatus}
        onRetry={handleConsolidate}
      />
    </>
  );
}

/**
 * Fragmentation indicator badge
 * Shows the fragmentation status of a token's notes
 */
export function FragmentationBadge({
  tokenMint,
  className,
}: {
  tokenMint: PublicKey;
  className?: string;
}) {
  const { fragmentationReport, shouldConsolidate } = useConsolidation({ tokenMint });

  if (!fragmentationReport || fragmentationReport.totalNotes <= 1) {
    return null;
  }

  const score = fragmentationReport.fragmentationScore || 0;
  const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';

  const colors = {
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        colors[level],
        className
      )}
    >
      {fragmentationReport.totalNotes} notes
      {shouldConsolidate && (
        <AlertTriangle className="h-3 w-3" />
      )}
    </span>
  );
}
