'use client';

import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  useTokenPrice,
  useTokenPrices,
  usePortfolioValue,
  formatPrice,
} from '@cloakcraft/hooks';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Single token price display
 */
export function TokenPriceDisplay({
  mint,
  showSymbol = true,
  className,
}: {
  mint: string | PublicKey | null;
  showSymbol?: boolean;
  className?: string;
}) {
  const { price, priceUsd, isLoading } = useTokenPrice(mint);

  if (isLoading) {
    return <Skeleton className={cn('h-5 w-16', className)} />;
  }

  if (!price || priceUsd === 0) {
    return <span className={cn('text-muted-foreground', className)}>--</span>;
  }

  return (
    <span className={cn('font-mono', className)}>
      {showSymbol && <DollarSign className="inline h-3 w-3" />}
      {formatPrice(priceUsd)}
    </span>
  );
}

/**
 * Token value display (amount * price)
 */
export function TokenValueDisplay({
  mint,
  amount,
  decimals = 9,
  className,
}: {
  mint: string | PublicKey | null;
  amount: bigint;
  decimals?: number;
  className?: string;
}) {
  const { priceUsd, isLoading } = useTokenPrice(mint);

  const valueUsd = useMemo(() => {
    if (!priceUsd) return 0;
    const amountNumber = Number(amount) / Math.pow(10, decimals);
    return amountNumber * priceUsd;
  }, [amount, decimals, priceUsd]);

  if (isLoading) {
    return <Skeleton className={cn('h-4 w-14', className)} />;
  }

  if (valueUsd === 0) {
    return <span className={cn('text-muted-foreground text-sm', className)}>--</span>;
  }

  return (
    <span className={cn('text-sm text-muted-foreground font-mono', className)}>
      {formatPrice(valueUsd)}
    </span>
  );
}

/**
 * Price change indicator
 */
export function PriceChangeIndicator({
  change,
  className,
}: {
  change: number;
  className?: string;
}) {
  if (change === 0) {
    return (
      <span className={cn('flex items-center gap-1 text-muted-foreground', className)}>
        <Minus className="h-3 w-3" />
        <span>0%</span>
      </span>
    );
  }

  const isPositive = change > 0;

  return (
    <span
      className={cn(
        'flex items-center gap-1',
        isPositive ? 'text-green-600' : 'text-red-600',
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      <span>{isPositive ? '+' : ''}{change.toFixed(2)}%</span>
    </span>
  );
}

/**
 * Portfolio total value display
 */
export function PortfolioValueDisplay({
  balances,
  className,
}: {
  balances: Array<{
    mint: string | PublicKey;
    amount: bigint;
    decimals: number;
  }>;
  className?: string;
}) {
  const { totalValue, isLoading } = usePortfolioValue(balances);

  if (isLoading) {
    return <Skeleton className={cn('h-8 w-28', className)} />;
  }

  return (
    <div className={cn('', className)}>
      <p className="text-2xl font-bold font-mono">
        {formatPrice(totalValue)}
      </p>
      <p className="text-sm text-muted-foreground">Total Value</p>
    </div>
  );
}

/**
 * Multi-token prices card
 */
export function TokenPricesCard({
  mints,
  tokenInfo,
  className,
}: {
  mints: (string | PublicKey)[];
  tokenInfo?: Map<string, { symbol: string; name?: string }>;
  className?: string;
}) {
  const { prices, isLoading } = useTokenPrices(mints);

  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {mints.map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {mints.map((mint) => {
        const mintStr = typeof mint === 'string' ? mint : mint.toBase58();
        const price = prices.get(mintStr);
        const info = tokenInfo?.get(mintStr);

        return (
          <div key={mintStr} className="flex items-center justify-between">
            <div>
              <span className="font-medium">{info?.symbol || mintStr.slice(0, 6)}</span>
              {info?.name && (
                <span className="text-sm text-muted-foreground ml-2">{info.name}</span>
              )}
            </div>
            <span className="font-mono">
              {price ? formatPrice(price.priceUsd) : '--'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * SOL price ticker
 */
export function SolPriceTicker({ className }: { className?: string }) {
  const { priceUsd, isLoading } = useTokenPrice(
    'So11111111111111111111111111111111111111112'
  );

  if (isLoading) {
    return <Skeleton className={cn('h-5 w-20', className)} />;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground">SOL</span>
      <span className="font-mono">{formatPrice(priceUsd)}</span>
    </div>
  );
}
