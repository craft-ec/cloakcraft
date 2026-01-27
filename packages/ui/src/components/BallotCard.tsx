/**
 * BallotCard Component
 *
 * Displays ballot information with status, options, and tally
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { styles, colors } from '../styles';

export type BallotStatus = 'pending' | 'active' | 'closed' | 'resolved' | 'finalized';
export type BindingMode = 'snapshot' | 'spend-to-vote';
export type RevealMode = 'public' | 'time-locked' | 'permanent-private';

export interface BallotOption {
  index: number;
  label: string;
  weight: bigint;
  amount: bigint;
  percentage: number;
  isWinner?: boolean;
}

export interface BallotCardProps {
  ballotId: string;
  title: string;
  description?: string;
  status: BallotStatus;
  bindingMode: BindingMode;
  revealMode: RevealMode;
  tokenSymbol: string;
  tokenMint?: PublicKey;
  options: BallotOption[];
  totalVotes: number;
  totalWeight: bigint;
  quorumThreshold: bigint;
  hasQuorum: boolean;
  startTime: number;
  endTime: number;
  outcome?: number;
  userVote?: number;
  userWeight?: bigint;
  compact?: boolean;
  onClick?: () => void;
}

function formatBigInt(value: bigint, decimals: number = 6): string {
  if (value === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = Math.abs(Number((value % divisor) * 100n / divisor));
  if (fracPart === 0) return intPart.toLocaleString();
  return `${intPart.toLocaleString()}.${fracPart.toString().padStart(2, '0')}`;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const statusColors: Record<BallotStatus, string> = {
  pending: colors.textMuted,
  active: colors.success,
  closed: colors.warning,
  resolved: colors.primary,
  finalized: colors.textMuted,
};

const statusLabels: Record<BallotStatus, string> = {
  pending: 'Pending',
  active: 'Active',
  closed: 'Closed',
  resolved: 'Resolved',
  finalized: 'Finalized',
};

export function BallotCard({
  ballotId,
  title,
  description,
  status,
  bindingMode,
  revealMode,
  tokenSymbol,
  options,
  totalVotes,
  totalWeight,
  quorumThreshold,
  hasQuorum,
  startTime,
  endTime,
  outcome,
  userVote,
  userWeight,
  compact = false,
  onClick,
}: BallotCardProps) {
  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = endTime - now;
  const isActive = status === 'active';
  const hasOutcome = typeof outcome === 'number';
  const hasUserVoted = typeof userVote === 'number';

  // Quorum progress
  const quorumProgress = quorumThreshold > 0n
    ? Math.min(100, Number((totalWeight * 100n) / quorumThreshold))
    : 100;

  if (compact) {
    return (
      <div
        style={{
          ...styles.card,
          padding: '12px 16px',
          cursor: onClick ? 'pointer' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
        }}
        onClick={onClick}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
            <span style={{
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '600',
              backgroundColor: `${statusColors[status]}20`,
              color: statusColors[status],
              textTransform: 'uppercase',
            }}>
              {statusLabels[status]}
            </span>
            <span style={{
              fontWeight: '500',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {title}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: colors.textMuted }}>
            {totalVotes} votes • {isActive ? formatTimeRemaining(timeRemaining) : formatDate(endTime)}
          </div>
        </div>
        {hasUserVoted && (
          <span style={{ fontSize: '12px', color: colors.success }}>✓ Voted</span>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.card,
        cursor: onClick ? 'pointer' : 'default',
      }}
      onClick={onClick}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            {title}
          </h3>
          <span style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '600',
            backgroundColor: `${statusColors[status]}20`,
            color: statusColors[status],
            textTransform: 'uppercase',
            flexShrink: 0,
          }}>
            {statusLabels[status]}
          </span>
        </div>
        {description && (
          <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
            {description}
          </p>
        )}
      </div>

      {/* Mode Badges */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <span style={{
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '500',
          backgroundColor: colors.border,
          color: colors.textMuted,
          textTransform: 'uppercase',
        }}>
          {bindingMode === 'snapshot' ? '📸 Snapshot' : '🔒 Spend-to-Vote'}
        </span>
        <span style={{
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '500',
          backgroundColor: colors.border,
          color: colors.textMuted,
          textTransform: 'uppercase',
        }}>
          {revealMode === 'public' ? '👁️ Public' : revealMode === 'time-locked' ? '⏰ Time-Locked' : '🔐 Private'}
        </span>
        <span style={{
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          fontWeight: '500',
          backgroundColor: colors.border,
          color: colors.textMuted,
        }}>
          {tokenSymbol}
        </span>
      </div>

      {/* Options / Tally */}
      <div style={{ marginBottom: '16px' }}>
        {options.map((option) => (
          <div key={option.index} style={{ marginBottom: '10px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: '500' }}>
                  {option.label}
                </span>
                {option.isWinner && (
                  <span style={{ fontSize: '12px' }}>🏆</span>
                )}
                {userVote === option.index && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: colors.primary + '20',
                    color: colors.primary,
                  }}>
                    Your vote
                  </span>
                )}
              </div>
              <span style={{ fontSize: '13px', color: colors.textMuted }}>
                {option.percentage.toFixed(1)}%
              </span>
            </div>
            <div style={{
              height: '8px',
              borderRadius: '4px',
              backgroundColor: colors.border,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${option.percentage}%`,
                backgroundColor: option.isWinner
                  ? colors.success
                  : userVote === option.index
                    ? colors.primary
                    : colors.textMuted,
                transition: 'width 0.3s',
              }} />
            </div>
            <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '2px' }}>
              {formatBigInt(option.weight)} {tokenSymbol} weight
            </div>
          </div>
        ))}
      </div>

      {/* Quorum Progress */}
      <div style={{
        padding: '10px 12px',
        borderRadius: '6px',
        backgroundColor: colors.border + '30',
        marginBottom: '16px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          fontSize: '12px',
        }}>
          <span style={{ color: colors.textMuted }}>Quorum</span>
          <span style={{ color: hasQuorum ? colors.success : colors.textMuted }}>
            {hasQuorum ? '✓ Reached' : `${quorumProgress.toFixed(0)}%`}
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
            backgroundColor: hasQuorum ? colors.success : colors.primary,
          }} />
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: colors.textMuted,
          marginTop: '4px',
        }}>
          <span>{formatBigInt(totalWeight)} {tokenSymbol}</span>
          <span>{formatBigInt(quorumThreshold)} {tokenSymbol} required</span>
        </div>
      </div>

      {/* Footer Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '12px',
        color: colors.textMuted,
      }}>
        <span>{totalVotes} total votes</span>
        <span>
          {isActive
            ? `Ends in ${formatTimeRemaining(timeRemaining)}`
            : `Ended ${formatDate(endTime)}`}
        </span>
      </div>

      {/* User Vote Info */}
      {hasUserVoted && userWeight !== undefined && userWeight > 0n && (
        <div style={{
          marginTop: '12px',
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: colors.primary + '10',
          fontSize: '12px',
        }}>
          <span style={{ color: colors.textMuted }}>You voted for </span>
          <strong>{options[userVote]?.label || `Option ${userVote}`}</strong>
          <span style={{ color: colors.textMuted }}> with {formatBigInt(userWeight)} {tokenSymbol}</span>
        </div>
      )}
    </div>
  );
}

export default BallotCard;
