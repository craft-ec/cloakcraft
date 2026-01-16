'use client';

import { CheckCircle, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getExplorerTxUrl } from '@/lib/constants';
import { formatSignature } from '@/lib/utils';

interface TransactionStatusProps {
  status: 'idle' | 'pending' | 'success' | 'error';
  signature?: string;
  error?: string;
  onReset?: () => void;
}

export function TransactionStatus({
  status,
  signature,
  error,
  onReset,
}: TransactionStatusProps) {
  if (status === 'idle') return null;

  return (
    <div className="rounded-lg border p-4">
      {status === 'pending' && (
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <div>
            <p className="font-medium">Transaction Pending</p>
            <p className="text-sm text-muted-foreground">
              Please approve the transaction in your wallet...
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-medium">Transaction Successful</p>
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
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Transaction Failed</p>
              {error && (
                <p className="text-sm text-muted-foreground">{error}</p>
              )}
            </div>
          </div>
          {onReset && (
            <Button variant="ghost" size="sm" onClick={onReset}>
              Try Again
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
