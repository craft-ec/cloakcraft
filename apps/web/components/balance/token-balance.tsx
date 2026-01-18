'use client';

import { PublicKey } from '@solana/web3.js';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EyeOff } from 'lucide-react';
import { formatAmount, cn } from '@/lib/utils';

interface TokenBalanceProps {
  symbol: string;
  name?: string;
  balance: bigint;
  decimals: number;
  mint?: PublicKey | string;
  isPrivate?: boolean;
  isLoading?: boolean;
  className?: string;
}

export function TokenBalance({
  symbol,
  name,
  balance,
  decimals,
  isPrivate = false,
  isLoading = false,
  className,
}: TokenBalanceProps) {
  if (isLoading) {
    return <TokenBalanceSkeleton />;
  }

  return (
    <div className={cn('flex items-center justify-between', className)}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium">
          {symbol.slice(0, 2)}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{symbol}</span>
            {isPrivate && (
              <Badge variant="secondary" className="text-xs gap-1">
                <EyeOff className="h-3 w-3" />
                Private
              </Badge>
            )}
          </div>
          {name && <p className="text-sm text-muted-foreground">{name}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono font-medium">{formatAmount(balance, decimals)}</p>
      </div>
    </div>
  );
}

export function TokenBalanceSkeleton() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div>
          <Skeleton className="h-5 w-16" />
          <Skeleton className="mt-1 h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-20" />
    </div>
  );
}
