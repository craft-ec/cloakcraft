'use client';

import { useMemo } from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Fee breakdown for display
 */
export interface FeeBreakdownData {
  /** Amount being sent/swapped */
  amount: string;
  /** Protocol fee amount */
  protocolFee?: string;
  /** Estimated network fee in SOL */
  networkFee?: string;
  /** Total amount (amount - protocolFee for sends) */
  total: string;
  /** Token symbol */
  symbol: string;
  /** Fee rate in basis points (for tooltip) */
  feeRateBps?: number;
  /** Whether fees are being charged */
  feesEnabled?: boolean;
}

interface FeeBreakdownProps {
  /** Fee data to display */
  data: FeeBreakdownData;
  /** Whether to show as compact inline or full card */
  variant?: 'compact' | 'card';
  /** Additional class names */
  className?: string;
  /** Whether to show network fee */
  showNetworkFee?: boolean;
  /** Label for the amount row */
  amountLabel?: string;
  /** Label for the total row */
  totalLabel?: string;
}

/**
 * Reusable fee breakdown component
 * Shows amount, protocol fee, network fee, and total
 */
export function FeeBreakdown({
  data,
  variant = 'card',
  className,
  showNetworkFee = true,
  amountLabel = 'Amount',
  totalLabel = 'You receive',
}: FeeBreakdownProps) {
  const hasProtocolFee = data.protocolFee && parseFloat(data.protocolFee) > 0;
  const hasNetworkFee = showNetworkFee && data.networkFee;
  const feePercentage = data.feeRateBps ? (data.feeRateBps / 100).toFixed(2) : null;

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-2 text-xs text-muted-foreground', className)}>
        {hasProtocolFee && (
          <>
            <span>Fee: {data.protocolFee} {data.symbol}</span>
            {feePercentage && (
              <span className="text-muted-foreground/60">({feePercentage}%)</span>
            )}
          </>
        )}
        {hasNetworkFee && (
          <>
            {hasProtocolFee && <span>·</span>}
            <span>Network: ~{data.networkFee} SOL</span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg bg-muted/50 p-3 space-y-2', className)}>
      {/* Amount */}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{amountLabel}</span>
        <span className="font-medium">{data.amount} {data.symbol}</span>
      </div>

      {/* Protocol Fee */}
      {hasProtocolFee && (
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Protocol Fee</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">
                    {feePercentage
                      ? `A ${feePercentage}% fee is charged on this operation to support protocol development.`
                      : 'A small fee is charged to support protocol development.'}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-orange-500 dark:text-orange-400">
            -{data.protocolFee} {data.symbol}
          </span>
        </div>
      )}

      {/* Network Fee */}
      {hasNetworkFee && (
        <div className="flex justify-between text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span>Network Fee</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">
                    Estimated Solana network fee for this transaction.
                    Actual fee may vary slightly.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <span className="text-muted-foreground">~{data.networkFee} SOL</span>
        </div>
      )}

      {/* Divider */}
      {(hasProtocolFee || hasNetworkFee) && (
        <div className="border-t pt-2" />
      )}

      {/* Total */}
      <div className="flex justify-between text-sm font-medium">
        <span>{totalLabel}</span>
        <span className="text-foreground">{data.total} {data.symbol}</span>
      </div>
    </div>
  );
}

/**
 * Fee estimation loading state
 */
export function FeeBreakdownSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg bg-muted/50 p-3 space-y-2 animate-pulse', className)}>
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
      <div className="flex justify-between">
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded" />
      </div>
      <div className="border-t pt-2" />
      <div className="flex justify-between">
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="h-4 w-24 bg-muted rounded" />
      </div>
    </div>
  );
}

/**
 * Free operation indicator
 * Shows when an operation has no protocol fee
 */
export function FreeOperationBadge({ className }: { className?: string }) {
  return (
    <div className={cn(
      'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      'text-xs font-medium',
      className
    )}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      No protocol fee
    </div>
  );
}

/**
 * Hook to calculate fee breakdown from transaction parameters
 */
export function useFeeBreakdown({
  amount,
  feeRateBps,
  feesEnabled = true,
  symbol,
  decimals = 9,
  networkFeeEstimate,
}: {
  amount: bigint | undefined;
  feeRateBps: number;
  feesEnabled?: boolean;
  symbol: string;
  decimals?: number;
  networkFeeEstimate?: number;
}): FeeBreakdownData | null {
  return useMemo(() => {
    if (!amount || amount <= 0n) return null;

    const divisor = 10n ** BigInt(decimals);

    // Calculate protocol fee
    const protocolFee = feesEnabled && feeRateBps > 0
      ? (amount * BigInt(feeRateBps)) / 10000n
      : 0n;

    // Calculate total after fee
    const totalAfterFee = amount - protocolFee;

    // Format values
    const formatAmount = (val: bigint): string => {
      const whole = val / divisor;
      const fraction = val % divisor;
      if (fraction === 0n) return whole.toString();

      const fractionStr = fraction.toString().padStart(decimals, '0');
      // Trim trailing zeros but keep at least 2 decimal places for display
      const trimmed = fractionStr.replace(/0+$/, '').padEnd(2, '0');
      return `${whole}.${trimmed}`;
    };

    return {
      amount: formatAmount(amount),
      protocolFee: protocolFee > 0n ? formatAmount(protocolFee) : undefined,
      networkFee: networkFeeEstimate ? networkFeeEstimate.toFixed(6) : undefined,
      total: formatAmount(totalAfterFee),
      symbol,
      feeRateBps,
      feesEnabled,
    };
  }, [amount, feeRateBps, feesEnabled, symbol, decimals, networkFeeEstimate]);
}

/**
 * Warning for high fee scenarios
 */
export function HighFeeWarning({
  feePercentage,
  className,
}: {
  feePercentage: number;
  className?: string;
}) {
  if (feePercentage < 1) return null;

  return (
    <div className={cn(
      'flex items-start gap-2 p-3 rounded-lg',
      'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50',
      className
    )}>
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          High fee for small amount
        </p>
        <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
          The protocol fee is {feePercentage.toFixed(1)}% of your transaction.
          Consider sending a larger amount to reduce the fee percentage.
        </p>
      </div>
    </div>
  );
}
