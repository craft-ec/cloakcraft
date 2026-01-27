/**
 * PositionCard Component
 *
 * Displays a perpetual position with PnL, leverage, and action buttons
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { styles, colors } from '../styles';

export interface PositionData {
  id: string;
  market: string;
  direction: 'long' | 'short';
  size: bigint;
  margin: bigint;
  leverage: number;
  entryPrice: bigint;
  markPrice: bigint;
  liquidationPrice: bigint;
  pnl: bigint;
  pnlPercentage: number;
  borrowFees: bigint;
  timestamp: number;
}

export interface PositionCardProps {
  position: PositionData;
  tokenSymbol?: string;
  tokenDecimals?: number;
  onClose?: () => void;
  onAddMargin?: () => void;
  isClosing?: boolean;
  compact?: boolean;
}

function formatBigInt(value: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = (value % divisor).toString().padStart(decimals, '0').slice(0, 2);
  return `${intPart}.${fracPart}`;
}

function formatPrice(value: bigint, decimals: number = 8): string {
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = (value % divisor).toString().padStart(decimals, '0').slice(0, 4);
  return `$${intPart}.${fracPart}`;
}

export function PositionCard({
  position,
  tokenSymbol = 'USDC',
  tokenDecimals = 6,
  onClose,
  onAddMargin,
  isClosing = false,
  compact = false,
}: PositionCardProps) {
  const isLong = position.direction === 'long';
  const isProfitable = position.pnl > 0n;
  const isAtRisk = position.pnlPercentage < -50;

  const directionColor = isLong ? colors.success : colors.error;
  const pnlColor = isProfitable ? colors.success : colors.error;

  if (compact) {
    return (
      <div style={{
        ...styles.card,
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '12px',
            fontWeight: '600',
            color: directionColor,
            textTransform: 'uppercase',
          }}>
            {position.direction}
          </span>
          <span style={{ fontWeight: '600' }}>{position.market}</span>
          <span style={{ color: colors.textMuted, fontSize: '12px' }}>{position.leverage}x</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: pnlColor, fontWeight: '500' }}>
            {isProfitable ? '+' : ''}{formatBigInt(position.pnl, tokenDecimals)} {tokenSymbol}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              disabled={isClosing}
              style={{
                ...styles.buttonSecondary,
                padding: '4px 12px',
                fontSize: '12px',
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      ...styles.card,
      border: isAtRisk ? `1px solid ${colors.error}` : undefined,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '16px',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              backgroundColor: isLong ? `${colors.success}20` : `${colors.error}20`,
              color: directionColor,
              textTransform: 'uppercase',
            }}>
              {position.direction}
            </span>
            <span style={{ fontSize: '18px', fontWeight: '600' }}>{position.market}</span>
          </div>
          <div style={{ fontSize: '12px', color: colors.textMuted }}>
            {position.leverage}x Leverage
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{
            fontSize: '20px',
            fontWeight: '600',
            color: pnlColor,
          }}>
            {isProfitable ? '+' : ''}{formatBigInt(position.pnl, tokenDecimals)} {tokenSymbol}
          </div>
          <div style={{
            fontSize: '12px',
            color: pnlColor,
          }}>
            ({position.pnlPercentage > 0 ? '+' : ''}{position.pnlPercentage.toFixed(2)}%)
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '12px',
        marginBottom: '16px',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>
            Size
          </div>
          <div style={{ fontWeight: '500' }}>
            {formatBigInt(position.size, tokenDecimals)} {tokenSymbol}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>
            Margin
          </div>
          <div style={{ fontWeight: '500' }}>
            {formatBigInt(position.margin, tokenDecimals)} {tokenSymbol}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>
            Entry Price
          </div>
          <div style={{ fontWeight: '500' }}>
            {formatPrice(position.entryPrice)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>
            Mark Price
          </div>
          <div style={{ fontWeight: '500' }}>
            {formatPrice(position.markPrice)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>
            Liquidation Price
          </div>
          <div style={{
            fontWeight: '500',
            color: isAtRisk ? colors.error : undefined,
          }}>
            {formatPrice(position.liquidationPrice)}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '2px' }}>
            Borrow Fees
          </div>
          <div style={{ fontWeight: '500', color: colors.textMuted }}>
            -{formatBigInt(position.borrowFees, tokenDecimals)} {tokenSymbol}
          </div>
        </div>
      </div>

      {/* Warning */}
      {isAtRisk && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: `${colors.error}15`,
          color: colors.error,
          fontSize: '12px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <span>⚠️</span>
          <span>Position at risk of liquidation</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {onAddMargin && (
          <button
            onClick={onAddMargin}
            style={{
              ...styles.buttonSecondary,
              flex: 1,
            }}
          >
            Add Margin
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            disabled={isClosing}
            style={{
              ...styles.buttonPrimary,
              flex: 1,
              opacity: isClosing ? 0.6 : 1,
            }}
          >
            {isClosing ? 'Closing...' : 'Close Position'}
          </button>
        )}
      </div>
    </div>
  );
}

export default PositionCard;
