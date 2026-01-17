'use client';

import { useMemo } from 'react';
import { CheckCircle, XCircle, Loader2, ExternalLink, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TransactionProgress } from '@/components/ui/loading';
import { parseErrorMessage } from '@/components/ui/error-display';
import { getExplorerTxUrl } from '@/lib/constants';
import { formatSignature } from '@/lib/utils';

interface TransactionStatusProps {
  status: 'idle' | 'pending' | 'success' | 'error';
  signature?: string;
  error?: string;
  onReset?: () => void;
  /** For multi-phase transactions */
  phase?: number;
  totalPhases?: number;
  phaseName?: string;
}

export function TransactionStatus({
  status,
  signature,
  error,
  onReset,
  phase,
  totalPhases,
  phaseName,
}: TransactionStatusProps) {
  if (status === 'idle') return null;

  const parsedError = useMemo(() => {
    if (!error) return null;
    return parseErrorMessage(error);
  }, [error]);

  const isMultiPhase = totalPhases !== undefined && totalPhases > 1;

  return (
    <div className="rounded-lg border p-4">
      {status === 'pending' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {isMultiPhase ? 'Processing Transaction' : 'Transaction Pending'}
              </p>
              <p className="text-sm text-muted-foreground">
                {phaseName || 'Please approve the transaction in your wallet...'}
              </p>
            </div>
          </div>

          {isMultiPhase && phase !== undefined && (
            <TransactionProgress
              phase={phase}
              totalPhases={totalPhases}
              phaseName={phaseName}
            />
          )}

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>This may take a few moments</span>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-green-600">Transaction Successful</p>
              {signature && (
                <p className="text-sm font-mono text-muted-foreground">
                  {formatSignature(signature)}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {signature && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(getExplorerTxUrl(signature), '_blank')}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View on Explorer
              </Button>
            )}
            {onReset && (
              <Button variant="ghost" size="sm" onClick={onReset}>
                New Transaction
              </Button>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-600">
                {parsedError?.title || 'Transaction Failed'}
              </p>
              <p className="text-sm text-muted-foreground">
                {parsedError?.message || error}
              </p>
            </div>
          </div>
          {error && parsedError?.message !== error && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Technical details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                {error}
              </pre>
            </details>
          )}
          {onReset && (
            <Button variant="outline" size="sm" onClick={onReset}>
              Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
