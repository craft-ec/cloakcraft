'use client';

import { useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import {
  usePoolAnalytics,
  usePoolStats,
  useUserPosition,
  formatTvl,
  formatShare,
} from '@cloakcraft/hooks';
import type { PoolStats } from '@cloakcraft/hooks';
import type { AmmPoolState } from '@cloakcraft/sdk';
import {
  TrendingUp,
  Droplets,
  BarChart3,
  PieChart,
  RefreshCw,
  DollarSign,
  Percent,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatAmount, formatUsd, cn } from '@/lib/utils';
import { getTokenInfo } from '@/lib/constants';

/**
 * Overall protocol analytics card
 */
export function ProtocolAnalytics({ className }: { className?: string }) {
  const { analytics, totalTvl, formattedTvl, poolCount, isLoading, refresh } =
    usePoolAnalytics();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Protocol Stats
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <StatSkeleton />
            <StatSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Total Value Locked"
              value={formattedTvl}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <StatCard
              label="Active Pools"
              value={poolCount.toString()}
              icon={<Droplets className="h-4 w-4" />}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Single pool stats card
 */
export function PoolStatsCard({
  pool,
  tokenADecimals = 9,
  tokenBDecimals = 9,
  className,
}: {
  pool: (AmmPoolState & { address: PublicKey }) | null;
  tokenADecimals?: number;
  tokenBDecimals?: number;
  className?: string;
}) {
  const { stats, isLoading, refresh } = usePoolStats(pool, tokenADecimals, tokenBDecimals);

  const tokenAInfo = useMemo(
    () => (pool ? getTokenInfo(pool.tokenAMint) : null),
    [pool]
  );
  const tokenBInfo = useMemo(
    () => (pool ? getTokenInfo(pool.tokenBMint) : null),
    [pool]
  );

  if (!pool) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {tokenAInfo?.symbol || 'Token A'} / {tokenBInfo?.symbol || 'Token B'}
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </div>
        ) : stats ? (
          <div className="space-y-4">
            {/* TVL */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Total Value Locked"
                value={formatTvl(stats.tvlUsd)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <StatCard
                label="Fee"
                value={`${stats.feeBps / 100}%`}
                icon={<Percent className="h-4 w-4" />}
              />
            </div>

            {/* Reserves */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Reserves</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">{tokenAInfo?.symbol}</p>
                  <p className="font-mono font-medium">
                    {formatAmount(stats.reserveA, tokenADecimals)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatUsd(stats.tokenAValueUsd)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">{tokenBInfo?.symbol}</p>
                  <p className="font-mono font-medium">
                    {formatAmount(stats.reserveB, tokenBDecimals)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatUsd(stats.tokenBValueUsd)}
                  </p>
                </div>
              </div>
            </div>

            {/* Exchange Rates */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Exchange Rate</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground">1 {tokenAInfo?.symbol} = </span>
                  <span className="font-mono">
                    {stats.rateAToB > 0 ? stats.rateAToB.toFixed(6) : '—'} {tokenBInfo?.symbol}
                  </span>
                </div>
                <div className="rounded bg-muted/50 px-3 py-2">
                  <span className="text-muted-foreground">1 {tokenBInfo?.symbol} = </span>
                  <span className="font-mono">
                    {stats.rateBToA > 0 ? stats.rateBToA.toFixed(6) : '—'} {tokenAInfo?.symbol}
                  </span>
                </div>
              </div>
            </div>

            {/* LP Token Info */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">LP Token</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">Total Supply</p>
                  <p className="font-mono font-medium">
                    {formatAmount(stats.lpSupply, 9)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">LP Token Price</p>
                  <p className="font-mono font-medium">
                    {formatUsd(stats.lpTokenPriceUsd)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No stats available</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * User's pool position card
 */
export function UserPositionCard({
  pool,
  lpBalance,
  tokenADecimals = 9,
  tokenBDecimals = 9,
  className,
}: {
  pool: (AmmPoolState & { address: PublicKey }) | null;
  lpBalance: bigint;
  tokenADecimals?: number;
  tokenBDecimals?: number;
  className?: string;
}) {
  const { position, isLoading, refresh } = useUserPosition(
    pool,
    lpBalance,
    tokenADecimals,
    tokenBDecimals
  );

  const tokenAInfo = useMemo(
    () => (pool ? getTokenInfo(pool.tokenAMint) : null),
    [pool]
  );
  const tokenBInfo = useMemo(
    () => (pool ? getTokenInfo(pool.tokenBMint) : null),
    [pool]
  );

  if (!pool || lpBalance === 0n) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Your Position
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            <StatSkeleton />
            <StatSkeleton />
          </div>
        ) : position ? (
          <div className="space-y-4">
            {/* Position Value */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="Position Value"
                value={formatUsd(position.valueUsd)}
                icon={<DollarSign className="h-4 w-4" />}
              />
              <StatCard
                label="Pool Share"
                value={formatShare(position.sharePercent)}
                icon={<PieChart className="h-4 w-4" />}
              />
            </div>

            {/* Underlying Assets */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Underlying Assets</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">{tokenAInfo?.symbol}</p>
                  <p className="font-mono font-medium">
                    {formatAmount(position.tokenAAmount, tokenADecimals)}
                  </p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-sm text-muted-foreground">{tokenBInfo?.symbol}</p>
                  <p className="font-mono font-medium">
                    {formatAmount(position.tokenBAmount, tokenBDecimals)}
                  </p>
                </div>
              </div>
            </div>

            {/* LP Tokens */}
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">LP Tokens</p>
              <p className="font-mono font-medium">{formatAmount(position.lpBalance, 9)}</p>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">No position data</p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Pool list with stats
 */
export function PoolList({ className }: { className?: string }) {
  const { poolStats, isLoading, refresh } = usePoolAnalytics();

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg">All Pools</CardTitle>
        <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <PoolRowSkeleton />
            <PoolRowSkeleton />
          </div>
        ) : poolStats.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No pools available</p>
        ) : (
          <div className="space-y-2">
            {/* Header - hidden on mobile */}
            <div className="hidden sm:grid grid-cols-4 gap-4 text-sm text-muted-foreground px-2">
              <span>Pool</span>
              <span className="text-right">TVL</span>
              <span className="text-right">Volume 24h</span>
              <span className="text-right">Fee</span>
            </div>
            {/* Rows */}
            <div className="space-y-2 sm:space-y-1">
              {poolStats.map((stats) => (
                <PoolRow key={stats.poolAddress} stats={stats} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Pool row in list
 */
function PoolRow({ stats }: { stats: PoolStats }) {
  const tokenAInfo = useMemo(
    () => getTokenInfo(new PublicKey(stats.tokenAMint)),
    [stats.tokenAMint]
  );
  const tokenBInfo = useMemo(
    () => getTokenInfo(new PublicKey(stats.tokenBMint)),
    [stats.tokenBMint]
  );

  return (
    <div className="rounded-lg bg-muted/50 p-3 text-sm hover:bg-muted transition-colors">
      {/* Mobile layout - stacked */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium">
            {tokenAInfo?.symbol || 'Unknown'} / {tokenBInfo?.symbol || 'Unknown'}
          </span>
          <span className="text-xs bg-muted px-2 py-0.5 rounded">{stats.feeBps / 100}% fee</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>TVL</span>
          <span className="font-mono">{formatTvl(stats.tvlUsd)}</span>
        </div>
      </div>
      {/* Desktop layout - grid */}
      <div className="hidden sm:grid grid-cols-4 gap-4">
        <div className="font-medium">
          {tokenAInfo?.symbol || 'Unknown'} / {tokenBInfo?.symbol || 'Unknown'}
        </div>
        <div className="text-right font-mono">{formatTvl(stats.tvlUsd)}</div>
        <div className="text-right font-mono text-muted-foreground">--</div>
        <div className="text-right">{stats.feeBps / 100}%</div>
      </div>
    </div>
  );
}

/**
 * Stat card component
 */
function StatCard({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('rounded-lg bg-muted p-3', className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

/**
 * Stat skeleton
 */
function StatSkeleton() {
  return (
    <div className="rounded-lg bg-muted p-3 space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

/**
 * Pool row skeleton
 */
function PoolRowSkeleton() {
  return (
    <div className="rounded-lg bg-muted/50 p-3">
      {/* Mobile skeleton */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-12" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-8" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      {/* Desktop skeleton */}
      <div className="hidden sm:grid grid-cols-4 gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-16 ml-auto" />
        <Skeleton className="h-5 w-16 ml-auto" />
        <Skeleton className="h-5 w-12 ml-auto" />
      </div>
    </div>
  );
}
