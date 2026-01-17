'use client';

import { AlertCircle, AlertTriangle, XCircle, RefreshCw, Info } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  severity?: ErrorSeverity;
  onRetry?: () => void;
  onDismiss?: () => void;
  details?: string;
  className?: string;
}

/**
 * Parse common Solana/program errors into user-friendly messages
 */
export function parseErrorMessage(error: string): {
  title: string;
  message: string;
  severity: ErrorSeverity;
} {
  const lowerError = error.toLowerCase();

  // Wallet errors
  if (lowerError.includes('wallet') && lowerError.includes('connect')) {
    return {
      title: 'Wallet Not Connected',
      message: 'Please connect your wallet to continue.',
      severity: 'warning',
    };
  }

  if (lowerError.includes('user rejected') || lowerError.includes('rejected')) {
    return {
      title: 'Transaction Cancelled',
      message: 'You cancelled the transaction in your wallet.',
      severity: 'info',
    };
  }

  // Balance errors
  if (lowerError.includes('insufficient') && lowerError.includes('balance')) {
    return {
      title: 'Insufficient Balance',
      message: 'You don\'t have enough tokens for this operation.',
      severity: 'warning',
    };
  }

  if (lowerError.includes('insufficient') && lowerError.includes('sol')) {
    return {
      title: 'Insufficient SOL',
      message: 'You need more SOL to pay for transaction fees.',
      severity: 'warning',
    };
  }

  // Pool errors
  if (lowerError.includes('pool') && lowerError.includes('not') && lowerError.includes('initialized')) {
    return {
      title: 'Pool Not Initialized',
      message: 'This token pool needs to be initialized first.',
      severity: 'warning',
    };
  }

  // Slippage errors
  if (lowerError.includes('slippage') || lowerError.includes('price') && lowerError.includes('moved')) {
    return {
      title: 'Price Changed',
      message: 'The price moved too much. Try again or increase slippage tolerance.',
      severity: 'warning',
    };
  }

  // Network errors
  if (lowerError.includes('timeout') || lowerError.includes('network')) {
    return {
      title: 'Network Error',
      message: 'There was a problem connecting to the network. Please try again.',
      severity: 'error',
    };
  }

  if (lowerError.includes('blockhash')) {
    return {
      title: 'Transaction Expired',
      message: 'The transaction took too long and expired. Please try again.',
      severity: 'warning',
    };
  }

  // Proof errors
  if (lowerError.includes('proof') && lowerError.includes('verif')) {
    return {
      title: 'Proof Verification Failed',
      message: 'The zero-knowledge proof could not be verified.',
      severity: 'error',
    };
  }

  // Rate limiting
  if (lowerError.includes('rate') && lowerError.includes('limit')) {
    return {
      title: 'Rate Limited',
      message: 'Too many requests. Please wait a moment and try again.',
      severity: 'warning',
    };
  }

  // Default
  return {
    title: 'Error',
    message: error,
    severity: 'error',
  };
}

/**
 * Styled error display component
 */
export function ErrorDisplay({
  title,
  message,
  severity = 'error',
  onRetry,
  onDismiss,
  details,
  className,
}: ErrorDisplayProps) {
  const severityConfig = {
    info: {
      icon: Info,
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/50',
      text: 'text-blue-600',
      iconColor: 'text-blue-500',
    },
    warning: {
      icon: AlertTriangle,
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/50',
      text: 'text-yellow-600',
      iconColor: 'text-yellow-500',
    },
    error: {
      icon: AlertCircle,
      bg: 'bg-red-500/10',
      border: 'border-red-500/50',
      text: 'text-red-600',
      iconColor: 'text-red-500',
    },
    critical: {
      icon: XCircle,
      bg: 'bg-red-500/20',
      border: 'border-red-500',
      text: 'text-red-700',
      iconColor: 'text-red-600',
    },
  };

  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 mt-0.5', config.iconColor)} />
        <div className="flex-1 space-y-2">
          {title && (
            <p className={cn('font-medium', config.text)}>{title}</p>
          )}
          <p className="text-sm text-muted-foreground">{message}</p>
          {details && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Show details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 font-mono">
                {details}
              </pre>
            </details>
          )}
          {(onRetry || onDismiss) && (
            <div className="flex gap-2 pt-2">
              {onRetry && (
                <Button variant="outline" size="sm" onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button variant="ghost" size="sm" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Inline error message (for form fields)
 */
export function InlineError({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p className={cn('text-sm text-destructive flex items-center gap-1', className)}>
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}

/**
 * Error boundary fallback
 */
export function ErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError?: () => void;
}) {
  return (
    <div className="flex min-h-[200px] items-center justify-center p-6">
      <div className="text-center space-y-4">
        <XCircle className="h-12 w-12 mx-auto text-destructive" />
        <div>
          <h3 className="font-medium">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mt-1">
            {error.message || 'An unexpected error occurred'}
          </p>
        </div>
        {resetError && (
          <Button onClick={resetError} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}
