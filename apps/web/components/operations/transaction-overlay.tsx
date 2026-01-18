'use client';

import { useMemo } from 'react';
import { CheckCircle, XCircle, Loader2, ExternalLink, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getExplorerTxUrl } from '@/lib/constants';
import { formatSignature } from '@/lib/utils';
import { parseErrorMessage } from '@/components/ui/error-display';

/**
 * Transaction step definition
 */
export interface TransactionStep {
  /** Unique step identifier */
  id: string;
  /** Step display name */
  name: string;
  /** Step description (shown while active) */
  description?: string;
  /** Step status */
  status: 'pending' | 'active' | 'completed' | 'error' | 'skipped';
  /** Transaction signature (if step produced one) */
  signature?: string;
  /** Error message (if step failed) */
  error?: string;
}

/**
 * Transaction overlay props
 */
interface TransactionOverlayProps {
  /** Whether the overlay is visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Transaction title */
  title: string;
  /** Transaction steps */
  steps: TransactionStep[];
  /** Overall status */
  status: 'idle' | 'pending' | 'success' | 'error';
  /** Final transaction signature (for success state) */
  finalSignature?: string;
  /** Action to retry on error */
  onRetry?: () => void;
  /** Action to start new transaction */
  onNewTransaction?: () => void;
  /** Whether user can close during pending state */
  allowCloseWhilePending?: boolean;
  /** Fee breakdown to display */
  feeBreakdown?: {
    amount: string;
    protocolFee?: string;
    networkFee?: string;
    total: string;
    symbol: string;
  };
}

/**
 * Unified transaction overlay that shows step-by-step progress
 */
export function TransactionOverlay({
  isOpen,
  onClose,
  title,
  steps,
  status,
  finalSignature,
  onRetry,
  onNewTransaction,
  allowCloseWhilePending = false,
  feeBreakdown,
}: TransactionOverlayProps) {
  if (!isOpen) return null;

  const canClose = status !== 'pending' || allowCloseWhilePending;
  const currentStepIndex = steps.findIndex((s) => s.status === 'active');
  const completedSteps = steps.filter((s) => s.status === 'completed').length;
  const progress = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const parsedError = useMemo(() => {
    const errorStep = steps.find((s) => s.status === 'error');
    if (!errorStep?.error) return null;
    return parseErrorMessage(errorStep.error);
  }, [steps]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={canClose ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-card border rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            {status === 'pending' && (
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
                <div className="absolute -inset-1 rounded-full border-2 border-primary/30 animate-ping" />
              </div>
            )}
            {status === 'success' && (
              <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
            )}
            {status === 'error' && (
              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            )}
            <div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-xs text-muted-foreground">
                {status === 'pending' && `Step ${currentStepIndex + 1} of ${steps.length}`}
                {status === 'success' && 'All steps completed'}
                {status === 'error' && 'Transaction failed'}
              </p>
            </div>
          </div>
          {canClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-muted">
          <div
            className={cn(
              'h-full transition-all duration-500',
              status === 'success' && 'bg-green-500',
              status === 'error' && 'bg-red-500',
              status === 'pending' && 'bg-primary'
            )}
            style={{ width: status === 'success' ? '100%' : `${progress}%` }}
          />
        </div>

        {/* Steps */}
        <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg transition-colors',
                step.status === 'active' && 'bg-primary/5 border border-primary/20',
                step.status === 'completed' && 'opacity-60',
                step.status === 'error' && 'bg-red-500/5 border border-red-500/20',
                step.status === 'pending' && 'opacity-40'
              )}
            >
              {/* Step indicator */}
              <div className="flex-shrink-0 mt-0.5">
                {step.status === 'pending' && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                    {index + 1}
                  </div>
                )}
                {step.status === 'active' && (
                  <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                    <Loader2 className="h-3 w-3 animate-spin text-primary-foreground" />
                  </div>
                )}
                {step.status === 'completed' && (
                  <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                )}
                {step.status === 'error' && (
                  <div className="h-6 w-6 rounded-full bg-red-500 flex items-center justify-center">
                    <XCircle className="h-3 w-3 text-white" />
                  </div>
                )}
                {step.status === 'skipped' && (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">-</span>
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-sm font-medium',
                  step.status === 'active' && 'text-primary',
                  step.status === 'error' && 'text-red-600'
                )}>
                  {step.name}
                </p>
                {step.status === 'active' && step.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                )}
                {step.status === 'completed' && step.signature && (
                  <a
                    href={getExplorerTxUrl(step.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5"
                  >
                    {formatSignature(step.signature)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {step.status === 'error' && step.error && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {parseErrorMessage(step.error)?.message || step.error}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Fee breakdown (if provided) */}
        {feeBreakdown && status !== 'error' && (
          <div className="px-4 pb-2">
            <div className="p-3 rounded-lg bg-muted/50 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span>{feeBreakdown.amount} {feeBreakdown.symbol}</span>
              </div>
              {feeBreakdown.protocolFee && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protocol Fee</span>
                  <span className="text-orange-500">-{feeBreakdown.protocolFee} {feeBreakdown.symbol}</span>
                </div>
              )}
              {feeBreakdown.networkFee && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Network Fee</span>
                  <span>~{feeBreakdown.networkFee} SOL</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>Total</span>
                <span>{feeBreakdown.total} {feeBreakdown.symbol}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error details */}
        {status === 'error' && parsedError && (
          <div className="px-4 pb-2">
            <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-red-600">{parsedError.title}</p>
                  <p className="text-xs text-red-500/80 mt-0.5">{parsedError.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="p-4 border-t bg-muted/30 flex gap-2">
          {status === 'pending' && (
            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Please approve in your wallet...
            </p>
          )}

          {status === 'success' && (
            <>
              {finalSignature && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(getExplorerTxUrl(finalSignature), '_blank')}
                  className="flex-1"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View on Explorer
                </Button>
              )}
              {onNewTransaction && (
                <Button size="sm" onClick={onNewTransaction} className="flex-1">
                  New Transaction
                </Button>
              )}
              {!onNewTransaction && (
                <Button size="sm" onClick={onClose} className="flex-1">
                  Done
                </Button>
              )}
            </>
          )}

          {status === 'error' && (
            <>
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry} className="flex-1">
                  Try Again
                </Button>
              )}
              <Button size="sm" onClick={onClose} className="flex-1">
                Close
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to manage transaction overlay state
 */
export function useTransactionOverlay() {
  const [isOpen, setIsOpen] = useState(false);
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [finalSignature, setFinalSignature] = useState<string>();

  const open = (initialSteps: Omit<TransactionStep, 'status'>[]) => {
    setSteps(initialSteps.map((s, i) => ({
      ...s,
      status: i === 0 ? 'active' : 'pending',
    })));
    setStatus('pending');
    setFinalSignature(undefined);
    setIsOpen(true);
  };

  const updateStep = (stepId: string, update: Partial<TransactionStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, ...update } : s))
    );
  };

  const completeStep = (stepId: string, signature?: string) => {
    setSteps((prev) => {
      const stepIndex = prev.findIndex((s) => s.id === stepId);
      return prev.map((s, i) => {
        if (s.id === stepId) {
          return { ...s, status: 'completed', signature };
        }
        // Activate next pending step
        if (i === stepIndex + 1 && s.status === 'pending') {
          return { ...s, status: 'active' };
        }
        return s;
      });
    });
  };

  const failStep = (stepId: string, error: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: 'error', error } : s))
    );
    setStatus('error');
  };

  const complete = (signature?: string) => {
    setStatus('success');
    setFinalSignature(signature);
  };

  const close = () => {
    setIsOpen(false);
    // Reset after animation
    setTimeout(() => {
      setSteps([]);
      setStatus('idle');
      setFinalSignature(undefined);
    }, 300);
  };

  const reset = () => {
    setSteps([]);
    setStatus('idle');
    setFinalSignature(undefined);
    setIsOpen(false);
  };

  return {
    isOpen,
    steps,
    status,
    finalSignature,
    open,
    updateStep,
    completeStep,
    failStep,
    complete,
    close,
    reset,
  };
}

// Need to import useState for the hook
import { useState } from 'react';
