/**
 * PoolStats Component
 *
 * Displays perpetual pool statistics and token utilization
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { styles, colors } from '../styles';

export interface TokenUtilization {
  tokenIndex: number;
  mint: PublicKey;
  symbol: string;
  balance: bigint;
  reserved: bigint;
  utilization: number; // 0-100
  borrowRate: number; // APR in basis points
}

export interface PoolStatsProps {
  poolName: string;
  poolAddress?: string;
  tvl: bigint;
  totalOpenInterest: bigint;
  numPositions: number;
  maxLeverage: number;
  maxUtilization: number;
  baseBorrowRate: number;
  tokens: TokenUtilization[];
  lpSupply?: bigint;
  lpPrice?: bigint;
  tokenDecimals?: number;
  tokenSymbol?: string;
  onAddLiquidity?: () => void;
  onRemoveLiquidity?: () => void;
}

function formatBigInt(value: bigint, decimals: number = 6): string {
  if (value === 0n) return '0.00';
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = Math.abs(Number((value % divisor) * 100n / divisor));
  return `${intPart.toLocaleString()}.${fracPart.toString().padStart(2, '0')}`;
}

function formatCompact(value: bigint, decimals: number = 6): string {
  const num = Number(value) / 10 ** decimals;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

function formatPercent(bps: number): string {
  return `${(bps / 100).toFixed(2)}%`;
}

export function PoolStats({
  poolName,
  poolAddress,
  tvl,
  totalOpenInterest,
  numPositions,
  maxLeverage,
  maxUtilization,
  baseBorrowRate,
  tokens,
  lpSupply,
  lpPrice,
  tokenDecimals = 6,
  tokenSymbol = 'USDC',
  onAddLiquidity,
  onRemoveLiquidity,
}: PoolStatsProps) {
  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '20px',
      }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
            {poolName}
          </h3>
          {poolAddress && (
            <div style={{ fontSize: '11px', color: colors.textMuted, fontFamily: 'monospace' }}>
              {poolAddress.slice(0, 8)}...{poolAddress.slice(-8)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: colors.textMuted }}>TVL</div>
          <div style={{ fontSize: '20px', fontWeight: '600' }}>
            {formatCompact(tvl, tokenDecimals)}
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '20px',
      }}>
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: colors.border + '30',
        }}>
          <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
            Open Interest
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>
            {formatCompact(totalOpenInterest, tokenDecimals)}
          </div>
        </div>
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: colors.border + '30',
        }}>
          <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
            Positions
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>
            {numPositions.toLocaleString()}
          </div>
        </div>
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: colors.border + '30',
        }}>
          <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '4px' }}>
            Max Leverage
          </div>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>
            {maxLeverage}x
          </div>
        </div>
      </div>

      {/* Token Utilization */}
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: colors.textMuted }}>
          Token Utilization
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {tokens.map((token) => (
            <div key={token.tokenIndex} style={{
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${colors.border}`,
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}>
                <span style={{ fontWeight: '500' }}>{token.symbol}</span>
                <span style={{ fontSize: '13px', color: colors.textMuted }}>
                  {formatBigInt(token.balance, tokenDecimals)} available
                </span>
              </div>

              {/* Utilization Bar */}
              <div style={{
                height: '8px',
                borderRadius: '4px',
                backgroundColor: colors.border,
                overflow: 'hidden',
                marginBottom: '8px',
              }}>
                <div style={{
                  height: '100%',
                  width: `${token.utilization}%`,
                  backgroundColor: token.utilization > 80
                    ? colors.error
                    : token.utilization > 60
                      ? colors.warning
                      : colors.primary,
                  transition: 'width 0.3s, background-color 0.3s',
                }} />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: colors.textMuted,
              }}>
                <span>Utilization: {token.utilization.toFixed(1)}%</span>
                <span>Borrow Rate: {formatPercent(token.borrowRate)} APR</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LP Info */}
      {lpSupply !== undefined && lpPrice !== undefined && (
        <div style={{
          padding: '12px',
          borderRadius: '8px',
          backgroundColor: colors.primary + '10',
          marginBottom: '16px',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '2px' }}>
                LP Token Price
              </div>
              <div style={{ fontWeight: '600' }}>
                ${formatBigInt(lpPrice, 6)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: colors.textMuted, marginBottom: '2px' }}>
                LP Supply
              </div>
              <div style={{ fontWeight: '600' }}>
                {formatBigInt(lpSupply, tokenDecimals)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pool Parameters */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: colors.textMuted,
        marginBottom: '16px',
      }}>
        <span>Max Utilization: {formatPercent(maxUtilization)}</span>
        <span>Base Borrow Rate: {formatPercent(baseBorrowRate)}</span>
      </div>

      {/* Actions */}
      {(onAddLiquidity || onRemoveLiquidity) && (
        <div style={{ display: 'flex', gap: '8px' }}>
          {onAddLiquidity && (
            <button
              onClick={onAddLiquidity}
              style={{
                ...styles.buttonPrimary,
                flex: 1,
              }}
            >
              Add Liquidity
            </button>
          )}
          {onRemoveLiquidity && (
            <button
              onClick={onRemoveLiquidity}
              style={{
                ...styles.buttonSecondary,
                flex: 1,
              }}
            >
              Remove Liquidity
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default PoolStats;
