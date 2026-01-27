/**
 * TallyDisplay Component
 *
 * Displays vote tally results with animated bars and statistics
 */

import React from 'react';
import { styles, colors } from '../styles';

export interface TallyOption {
  index: number;
  label: string;
  weight: bigint;
  amount: bigint;
  voteCount: number;
  percentage: number;
  isWinner?: boolean;
}

export interface TallyDisplayProps {
  options: TallyOption[];
  totalVotes: number;
  totalWeight: bigint;
  totalAmount: bigint;
  quorumThreshold: bigint;
  hasQuorum: boolean;
  tokenSymbol: string;
  tokenDecimals?: number;
  revealMode: 'public' | 'time-locked' | 'permanent-private';
  isRevealed?: boolean;
  unlockTime?: number;
  outcome?: number;
  showVoteCounts?: boolean;
  showAmounts?: boolean;
  compact?: boolean;
}

function formatBigInt(value: bigint, decimals: number = 6): string {
  if (value === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = Math.abs(Number((value % divisor) * 100n / divisor));
  if (fracPart === 0) return intPart.toLocaleString();
  return `${intPart.toLocaleString()}.${fracPart.toString().padStart(2, '0')}`;
}

function formatCompact(value: bigint, decimals: number = 6): string {
  const num = Number(value) / 10 ** decimals;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toFixed(1);
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Now';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

const optionColors = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#F97316', // orange
];

export function TallyDisplay({
  options,
  totalVotes,
  totalWeight,
  totalAmount,
  quorumThreshold,
  hasQuorum,
  tokenSymbol,
  tokenDecimals = 6,
  revealMode,
  isRevealed = true,
  unlockTime,
  outcome,
  showVoteCounts = true,
  showAmounts = false,
  compact = false,
}: TallyDisplayProps) {
  const now = Math.floor(Date.now() / 1000);
  const timeUntilReveal = unlockTime ? unlockTime - now : 0;
  const hasOutcome = typeof outcome === 'number';

  // Sort options by weight for display
  const sortedOptions = [...options].sort((a, b) =>
    Number(b.weight - a.weight)
  );

  // Quorum progress
  const quorumProgress = quorumThreshold > 0n
    ? Math.min(100, Number((totalWeight * 100n) / quorumThreshold))
    : 100;

  // Encrypted mode not yet revealed
  if (revealMode !== 'public' && !isRevealed) {
    return (
      <div style={styles.card}>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <span style={{ fontSize: '48px', marginBottom: '12px', display: 'block' }}>
            🔐
          </span>
          <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
            {revealMode === 'time-locked' ? 'Time-Locked Results' : 'Private Results'}
          </h3>
          <p style={{ fontSize: '14px', color: colors.textMuted, marginBottom: '16px' }}>
            {revealMode === 'time-locked'
              ? `Results will be revealed in ${formatTimeRemaining(timeUntilReveal)}`
              : 'Results are permanently private'}
          </p>

          {/* Show aggregate stats even when hidden */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: colors.border + '30',
          }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>{totalVotes}</div>
              <div style={{ fontSize: '11px', color: colors.textMuted }}>Total Votes</div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '600' }}>
                {formatCompact(totalWeight, tokenDecimals)}
              </div>
              <div style={{ fontSize: '11px', color: colors.textMuted }}>Total Weight</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div style={styles.card}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          {sortedOptions.map((option, i) => (
            <div
              key={option.index}
              style={{
                height: '6px',
                borderRadius: '3px',
                flex: option.percentage,
                backgroundColor: option.isWinner ? colors.success : optionColors[i % optionColors.length],
                transition: 'flex 0.3s',
              }}
            />
          ))}
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: colors.textMuted,
        }}>
          <span>{totalVotes} votes</span>
          <span>{formatCompact(totalWeight, tokenDecimals)} {tokenSymbol}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
          Vote Results
        </h3>
        {hasOutcome && (
          <span style={{
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: colors.success + '20',
            color: colors.success,
          }}>
            ✓ Resolved
          </span>
        )}
      </div>

      {/* Options */}
      <div style={{ marginBottom: '16px' }}>
        {sortedOptions.map((option, i) => {
          const isWinner = hasOutcome && option.index === outcome;
          const barColor = isWinner ? colors.success : optionColors[i % optionColors.length];

          return (
            <div key={option.index} style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '3px',
                    backgroundColor: barColor,
                  }} />
                  <span style={{
                    fontWeight: isWinner ? '600' : '500',
                    color: isWinner ? colors.success : colors.text,
                  }}>
                    {option.label}
                  </span>
                  {isWinner && <span style={{ fontSize: '12px' }}>🏆</span>}
                </div>
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isWinner ? colors.success : colors.textMuted,
                }}>
                  {option.percentage.toFixed(1)}%
                </span>
              </div>

              {/* Progress Bar */}
              <div style={{
                height: '10px',
                borderRadius: '5px',
                backgroundColor: colors.border,
                overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${option.percentage}%`,
                  backgroundColor: barColor,
                  transition: 'width 0.5s ease-out',
                }} />
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '11px',
                color: colors.textMuted,
                marginTop: '4px',
              }}>
                <span>{formatBigInt(option.weight, tokenDecimals)} {tokenSymbol}</span>
                {showVoteCounts && <span>{option.voteCount} votes</span>}
                {showAmounts && <span>{formatBigInt(option.amount, tokenDecimals)} locked</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quorum Status */}
      <div style={{
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: hasQuorum ? colors.success + '10' : colors.warning + '10',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}>
          <span style={{
            fontSize: '12px',
            color: hasQuorum ? colors.success : colors.warning,
            fontWeight: '500',
          }}>
            {hasQuorum ? '✓ Quorum Reached' : '⏳ Quorum Progress'}
          </span>
          <span style={{ fontSize: '12px', color: colors.textMuted }}>
            {quorumProgress.toFixed(0)}%
          </span>
        </div>
        <div style={{
          height: '4px',
          borderRadius: '2px',
          backgroundColor: colors.border,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${quorumProgress}%`,
            backgroundColor: hasQuorum ? colors.success : colors.warning,
            transition: 'width 0.3s',
          }} />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: colors.textMuted,
          marginTop: '4px',
        }}>
          <span>{formatCompact(totalWeight, tokenDecimals)} {tokenSymbol}</span>
          <span>{formatCompact(quorumThreshold, tokenDecimals)} {tokenSymbol} required</span>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        textAlign: 'center',
      }}>
        <div style={{
          padding: '10px',
          borderRadius: '6px',
          backgroundColor: colors.border + '30',
        }}>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>{totalVotes}</div>
          <div style={{ fontSize: '10px', color: colors.textMuted }}>Votes</div>
        </div>
        <div style={{
          padding: '10px',
          borderRadius: '6px',
          backgroundColor: colors.border + '30',
        }}>
          <div style={{ fontSize: '16px', fontWeight: '600' }}>
            {formatCompact(totalWeight, tokenDecimals)}
          </div>
          <div style={{ fontSize: '10px', color: colors.textMuted }}>Weight</div>
        </div>
        {showAmounts && (
          <div style={{
            padding: '10px',
            borderRadius: '6px',
            backgroundColor: colors.border + '30',
          }}>
            <div style={{ fontSize: '16px', fontWeight: '600' }}>
              {formatCompact(totalAmount, tokenDecimals)}
            </div>
            <div style={{ fontSize: '10px', color: colors.textMuted }}>Locked</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TallyDisplay;
