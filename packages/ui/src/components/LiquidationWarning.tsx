/**
 * LiquidationWarning Component
 *
 * Displays liquidation risk warning with price distance indicator
 */

import React from 'react';
import { styles, colors } from '../styles';

export interface LiquidationWarningProps {
  currentPrice: bigint;
  liquidationPrice: bigint;
  direction: 'long' | 'short';
  priceDecimals?: number;
  threshold?: number; // Percentage threshold to show warning (default 10%)
  onAddMargin?: () => void;
}

function formatPrice(value: bigint, decimals: number = 8): string {
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = (value % divisor).toString().padStart(decimals, '0').slice(0, 4);
  return `$${intPart}.${fracPart}`;
}

export function LiquidationWarning({
  currentPrice,
  liquidationPrice,
  direction,
  priceDecimals = 8,
  threshold = 10,
  onAddMargin,
}: LiquidationWarningProps) {
  // Calculate distance to liquidation as percentage
  const distancePercent = currentPrice > 0n
    ? Number((currentPrice - liquidationPrice) * 10000n / currentPrice) / 100
    : 0;

  // For shorts, the liquidation price is above current price
  const absoluteDistance = direction === 'long'
    ? distancePercent
    : -distancePercent;

  // Risk levels
  const isHighRisk = absoluteDistance < 5;
  const isMediumRisk = absoluteDistance >= 5 && absoluteDistance < threshold;
  const isLowRisk = absoluteDistance >= threshold;

  // Only show if within threshold
  if (isLowRisk) {
    return null;
  }

  const riskLevel = isHighRisk ? 'critical' : 'warning';
  const bgColor = isHighRisk ? colors.error : colors.warning;

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '8px',
      backgroundColor: `${bgColor}15`,
      border: `1px solid ${bgColor}40`,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <span style={{ fontSize: '20px' }}>
          {isHighRisk ? '🚨' : '⚠️'}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontWeight: '600',
            color: bgColor,
            marginBottom: '4px',
          }}>
            {isHighRisk ? 'Liquidation Imminent!' : 'Liquidation Risk'}
          </div>
          <div style={{ fontSize: '13px', marginBottom: '8px' }}>
            Your position is <strong>{absoluteDistance.toFixed(2)}%</strong> away from liquidation.
          </div>

          {/* Price Info */}
          <div style={{
            display: 'flex',
            gap: '16px',
            fontSize: '12px',
            color: colors.textMuted,
            marginBottom: '12px',
          }}>
            <div>
              <span>Current: </span>
              <strong style={{ color: colors.text }}>{formatPrice(currentPrice, priceDecimals)}</strong>
            </div>
            <div>
              <span>Liquidation: </span>
              <strong style={{ color: bgColor }}>{formatPrice(liquidationPrice, priceDecimals)}</strong>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{
            height: '6px',
            borderRadius: '3px',
            backgroundColor: colors.border,
            overflow: 'hidden',
            marginBottom: onAddMargin ? '12px' : 0,
          }}>
            <div style={{
              height: '100%',
              width: `${Math.max(0, Math.min(100, 100 - absoluteDistance))}%`,
              backgroundColor: bgColor,
              transition: 'width 0.3s',
            }} />
          </div>

          {/* Action Button */}
          {onAddMargin && (
            <button
              onClick={onAddMargin}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: `1px solid ${bgColor}`,
                backgroundColor: 'transparent',
                color: bgColor,
                fontWeight: '500',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Add Margin
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default LiquidationWarning;
