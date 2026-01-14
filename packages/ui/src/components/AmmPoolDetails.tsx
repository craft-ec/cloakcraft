/**
 * AMM Pool Details component
 *
 * Displays liquidity depth, price, and pool information for AMM pools
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { styles, colors } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  decimals: number;
}

interface AmmPoolDetailsProps {
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  pool: any; // AmmPoolState
  className?: string;
}

export function AmmPoolDetails({
  tokenA,
  tokenB,
  pool,
  className,
}: AmmPoolDetailsProps) {
  if (!pool) {
    return (
      <div className={className} style={styles.card}>
        <div style={{ padding: '16px', textAlign: 'center', color: colors.textMuted }}>
          No AMM pool found for this pair
        </div>
      </div>
    );
  }

  const formatAmount = (amount: bigint, decimals: number) => {
    const num = Number(amount) / Math.pow(10, decimals);

    // For very small amounts, show more decimals
    if (num < 0.0001 && num > 0) {
      return num.toFixed(decimals);
    }

    // For normal amounts, show 4 decimal places
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  };

  const formatCompact = (amount: bigint, decimals: number) => {
    const num = Number(amount) / Math.pow(10, decimals);
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(2)}M`;
    } else if (num >= 1_000) {
      return `${(num / 1_000).toFixed(2)}K`;
    }
    return num.toFixed(2);
  };

  // Calculate price ratio (Token B per Token A)
  // Price = (reserveB / decimalsB) / (reserveA / decimalsA)
  const reserveANum = Number(pool.reserveA) / Math.pow(10, tokenA.decimals);
  const reserveBNum = Number(pool.reserveB) / Math.pow(10, tokenB.decimals);

  const priceRatio = reserveANum > 0 ? reserveBNum / reserveANum : 0;

  // Calculate inverse price (Token A per Token B)
  const inversePriceRatio = reserveBNum > 0 ? reserveANum / reserveBNum : 0;

  const formatPrice = (price: number) => {
    if (price === 0) return '0';
    if (price < 0.000001) return price.toExponential(6);
    if (price < 0.01) return price.toFixed(8);
    return price.toFixed(6);
  };

  // Calculate pool depth percentage
  const totalValueLocked = formatCompact(pool.reserveA, tokenA.decimals);

  return (
    <div className={className} style={styles.card}>
      <h3 style={{ ...styles.cardTitle, marginBottom: '16px' }}>
        Pool Details: {tokenA.symbol}/{tokenB.symbol}
      </h3>

      {/* Price Display */}
      <div style={{
        padding: '16px',
        background: colors.backgroundDark,
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '4px' }}>
              Price
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {formatPrice(priceRatio)}
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '2px' }}>
              {tokenB.symbol} per {tokenA.symbol}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '4px' }}>
              Inverse Price
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
              {formatPrice(inversePriceRatio)}
            </div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '2px' }}>
              {tokenA.symbol} per {tokenB.symbol}
            </div>
          </div>
        </div>
      </div>

      {/* Liquidity Depth */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '12px' }}>
          Liquidity Depth
        </div>

        <div style={{ marginBottom: '8px' }}>
          <div style={styles.spaceBetween}>
            <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>
              {tokenA.symbol} Reserve
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {formatAmount(pool.reserveA, tokenA.decimals)}
            </span>
          </div>
          <LiquidityBar
            value={pool.reserveA}
            max={pool.reserveA + pool.reserveB}
            color={colors.primary}
          />
        </div>

        <div>
          <div style={styles.spaceBetween}>
            <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>
              {tokenB.symbol} Reserve
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>
              {formatAmount(pool.reserveB, tokenB.decimals)}
            </span>
          </div>
          <LiquidityBar
            value={pool.reserveB}
            max={pool.reserveA + pool.reserveB}
            color={colors.success}
          />
        </div>
      </div>

      {/* Pool Stats */}
      <div style={{ display: 'grid', gap: '8px' }}>
        <StatRow
          label="LP Supply"
          value={formatAmount(pool.lpSupply, 9)}
          unit="LP"
        />
        <StatRow
          label="Trading Fee"
          value={(pool.feeBps / 100).toFixed(2)}
          unit="%"
        />
        <StatRow
          label="Pool Status"
          value={pool.isActive ? 'Active' : 'Inactive'}
          valueColor={pool.isActive ? colors.success : colors.error}
        />
      </div>

      {/* Pool Address */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: colors.backgroundMuted,
        borderRadius: '6px',
      }}>
        <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '4px' }}>
          Pool ID
        </div>
        <div style={{ ...styles.mono, fontSize: '0.75rem', wordBreak: 'break-all' }}>
          {pool.poolId.toBase58()}
        </div>
      </div>
    </div>
  );
}

function LiquidityBar({
  value,
  max,
  color
}: {
  value: bigint;
  max: bigint;
  color: string;
}) {
  const percentage = max > 0n ? (Number(value) / Number(max)) * 100 : 0;

  return (
    <div style={{
      width: '100%',
      height: '6px',
      background: colors.backgroundMuted,
      borderRadius: '3px',
      overflow: 'hidden',
      marginTop: '4px',
    }}>
      <div style={{
        width: `${percentage}%`,
        height: '100%',
        background: color,
        transition: 'width 0.3s ease',
      }} />
    </div>
  );
}

function StatRow({
  label,
  value,
  unit,
  valueColor,
}: {
  label: string;
  value: string;
  unit?: string;
  valueColor?: string;
}) {
  return (
    <div style={styles.spaceBetween}>
      <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>
        {label}
      </span>
      <span style={{
        fontSize: '0.875rem',
        fontWeight: 500,
        color: valueColor || colors.text,
      }}>
        {value}{unit ? ` ${unit}` : ''}
      </span>
    </div>
  );
}
