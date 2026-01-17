'use client';

import { useMemo } from 'react';
import {
  useRecentTransactions,
  useTransactionHistory,
  TransactionType,
  TransactionStatus,
} from '@cloakcraft/hooks';
import type { TransactionRecord } from '@cloakcraft/hooks';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  ArrowDownUp,
  Droplets,
  Minus,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getExplorerTxUrl } from '@/lib/constants';
import { formatAmount, formatRelativeTime } from '@/lib/utils';

/**
 * Transaction type icon mapping
 */
function getTypeIcon(type: TransactionType) {
  switch (type) {
    case TransactionType.SHIELD:
      return <ArrowDownToLine className="h-4 w-4" />;
    case TransactionType.UNSHIELD:
      return <ArrowUpFromLine className="h-4 w-4" />;
    case TransactionType.TRANSFER:
      return <ArrowRight className="h-4 w-4" />;
    case TransactionType.SWAP:
      return <ArrowDownUp className="h-4 w-4" />;
    case TransactionType.ADD_LIQUIDITY:
      return <Droplets className="h-4 w-4" />;
    case TransactionType.REMOVE_LIQUIDITY:
      return <Minus className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

/**
 * Transaction type label
 */
function getTypeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.SHIELD:
      return 'Shield';
    case TransactionType.UNSHIELD:
      return 'Unshield';
    case TransactionType.TRANSFER:
      return 'Transfer';
    case TransactionType.SWAP:
      return 'Swap';
    case TransactionType.ADD_LIQUIDITY:
      return 'Add Liquidity';
    case TransactionType.REMOVE_LIQUIDITY:
      return 'Remove Liquidity';
    default:
      return 'Transaction';
  }
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: TransactionStatus }) {
  switch (status) {
    case TransactionStatus.PENDING:
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-500">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case TransactionStatus.CONFIRMED:
      return (
        <Badge variant="outline" className="text-green-600 border-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Confirmed
        </Badge>
      );
    case TransactionStatus.FAILED:
      return (
        <Badge variant="outline" className="text-red-600 border-red-500">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    default:
      return null;
  }
}

/**
 * Transaction row component
 */
function TransactionRow({ tx }: { tx: TransactionRecord }) {
  const formattedTime = useMemo(() => {
    return formatRelativeTime(new Date(tx.timestamp));
  }, [tx.timestamp]);

  const formattedAmount = useMemo(() => {
    // Default to 9 decimals, could be improved with token info lookup
    const decimals = 9;
    return formatAmount(BigInt(tx.amount), decimals);
  }, [tx.amount]);

  return (
    <div className="py-3 border-b last:border-0">
      <div className="flex items-start xs:items-center justify-between gap-2">
        <div className="flex items-start xs:items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            {getTypeIcon(tx.type)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1 xs:gap-2">
              <span className="font-medium">{getTypeLabel(tx.type)}</span>
              <StatusBadge status={tx.status} />
            </div>
            <div className="flex flex-wrap items-center gap-1 xs:gap-2 text-sm text-muted-foreground">
              <span>{formattedTime}</span>
              {tx.signature && (
                <>
                  <span className="hidden xs:inline">·</span>
                  <a
                    href={getExplorerTxUrl(tx.signature)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    View
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono font-medium text-sm xs:text-base">
            {formattedAmount} {tx.tokenSymbol || 'tokens'}
          </div>
          {tx.secondaryAmount && tx.secondaryTokenSymbol && (
            <div className="text-xs xs:text-sm text-muted-foreground font-mono">
              → {formatAmount(BigInt(tx.secondaryAmount), 9)} {tx.secondaryTokenSymbol}
            </div>
          )}
          {tx.error && (
            <div className="text-xs xs:text-sm text-destructive truncate max-w-[120px] xs:max-w-[200px]" title={tx.error}>
              {tx.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Transaction history skeleton
 */
function TransactionSkeleton() {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      <div className="space-y-2 text-right">
        <Skeleton className="h-4 w-20 ml-auto" />
        <Skeleton className="h-3 w-16 ml-auto" />
      </div>
    </div>
  );
}

/**
 * Recent transactions card (compact view)
 */
export function RecentTransactions({ limit = 5 }: { limit?: number }) {
  const { transactions, isLoading, refresh } = useRecentTransactions(limit);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <TransactionSkeleton />
            <TransactionSkeleton />
            <TransactionSkeleton />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No transactions yet</p>
            <p className="text-sm">Your activity will appear here</p>
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Full transaction history (with filters)
 */
export function TransactionHistoryList({
  type,
  status,
}: {
  type?: TransactionType;
  status?: TransactionStatus;
}) {
  const { transactions, isLoading, refresh, clearHistory, summary } = useTransactionHistory({
    type,
    status,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Transaction History</CardTitle>
          <div className="flex gap-3 mt-2 text-sm text-muted-foreground">
            <span>{summary.total} total</span>
            {summary.pending > 0 && <span className="text-yellow-600">{summary.pending} pending</span>}
            {summary.failed > 0 && <span className="text-red-600">{summary.failed} failed</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          {transactions.length > 0 && (
            <Button variant="ghost" size="icon" onClick={clearHistory}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <TransactionSkeleton key={i} />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No transactions found</p>
            <p className="text-sm">
              {type || status ? 'Try adjusting your filters' : 'Your activity will appear here'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
