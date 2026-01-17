'use client';

import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Full-screen loading overlay
 */
export function LoadingOverlay({
  message = 'Loading...',
  className,
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm',
        className
      )}
    >
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner
 */
export function LoadingSpinner({
  size = 'default',
  className,
}: {
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <Loader2 className={cn('animate-spin', sizeClasses[size], className)} />
  );
}

/**
 * Loading card placeholder
 */
export function LoadingCard({
  className,
  rows = 3,
}: {
  className?: string;
  rows?: number;
}) {
  return (
    <div className={cn('rounded-lg border p-6 space-y-4', className)}>
      <div className="h-6 w-1/3 bg-muted animate-pulse rounded" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-4 bg-muted animate-pulse rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
      ))}
    </div>
  );
}

/**
 * Multi-step progress indicator
 */
export function MultiStepProgress({
  steps,
  currentStep,
  className,
}: {
  steps: string[];
  currentStep: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div key={index} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                isCompleted && 'bg-green-500 text-white',
                isCurrent && 'bg-primary text-primary-foreground',
                isPending && 'bg-muted text-muted-foreground'
              )}
            >
              {isCompleted ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                index + 1
              )}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  'text-sm',
                  isCompleted && 'text-muted-foreground',
                  isCurrent && 'font-medium',
                  isPending && 'text-muted-foreground'
                )}
              >
                {step}
              </p>
              {isCurrent && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary animate-pulse" style={{ width: '50%' }} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Transaction progress for multi-phase operations
 */
export function TransactionProgress({
  phase,
  totalPhases,
  phaseName,
  className,
}: {
  phase: number;
  totalPhases: number;
  phaseName?: string;
  className?: string;
}) {
  const percentage = ((phase + 1) / totalPhases) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {phaseName || `Phase ${phase + 1} of ${totalPhases}`}
        </span>
        <span className="font-mono">{Math.round(percentage)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Pulsing dot indicator (for connection status, etc.)
 */
export function StatusDot({
  status,
  className,
}: {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  className?: string;
}) {
  const statusClasses = {
    connected: 'bg-green-500',
    connecting: 'bg-yellow-500 animate-pulse',
    disconnected: 'bg-gray-400',
    error: 'bg-red-500',
  };

  return (
    <span
      className={cn(
        'inline-block h-2 w-2 rounded-full',
        statusClasses[status],
        className
      )}
    />
  );
}
