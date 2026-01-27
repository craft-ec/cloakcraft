/**
 * ClaimButton Component
 *
 * Button for claiming winnings from resolved spend-to-vote ballots
 */

import React, { useMemo } from 'react';
import { styles, colors } from '../styles';

export interface ClaimButtonProps {
  /** User's vote choice */
  voteChoice: number;
  /** Winning option index */
  outcome: number;
  /** User's voting weight */
  userWeight: bigint;
  /** Total pool balance */
  totalPool: bigint;
  /** Total weight of winning option */
  winnerWeight: bigint;
  /** Protocol fee in basis points */
  protocolFeeBps: number;
  /** Token symbol */
  tokenSymbol: string;
  /** Token decimals */
  tokenDecimals?: number;
  /** Claim deadline timestamp */
  claimDeadline: number;
  /** Whether claim is already in progress */
  isClaiming?: boolean;
  /** Whether user has already claimed */
  hasClaimed?: boolean;
  /** Callback when claim is initiated */
  onClaim: () => void;
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
  if (seconds <= 0) return 'Expired';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

export function ClaimButton({
  voteChoice,
  outcome,
  userWeight,
  totalPool,
  winnerWeight,
  protocolFeeBps,
  tokenSymbol,
  tokenDecimals = 6,
  claimDeadline,
  isClaiming = false,
  hasClaimed = false,
  onClaim,
}: ClaimButtonProps) {
  const now = Math.floor(Date.now() / 1000);
  const timeRemaining = claimDeadline - now;
  const isExpired = timeRemaining <= 0;
  const isWinner = voteChoice === outcome;

  // Calculate payout
  const payout = useMemo(() => {
    if (!isWinner || winnerWeight === 0n) {
      return { gross: 0n, net: 0n, fee: 0n, multiplier: 0 };
    }

    const gross = (userWeight * totalPool) / winnerWeight;
    const fee = (gross * BigInt(protocolFeeBps)) / 10000n;
    const net = gross - fee;

    // Multiplier (ROI)
    const multiplier = userWeight > 0n
      ? Number(gross * 1000n / userWeight) / 1000
      : 0;

    return { gross, net, fee, multiplier };
  }, [isWinner, userWeight, totalPool, winnerWeight, protocolFeeBps]);

  // Already claimed
  if (hasClaimed) {
    return (
      <div style={{
        ...styles.card,
        padding: '16px',
        backgroundColor: colors.success + '10',
        border: `1px solid ${colors.success}40`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>✅</span>
          <div>
            <div style={{ fontWeight: '600', color: colors.success }}>
              Claimed Successfully
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted }}>
              You received {formatBigInt(payout.net, tokenDecimals)} {tokenSymbol}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Not a winner
  if (!isWinner) {
    return (
      <div style={{
        ...styles.card,
        padding: '16px',
        backgroundColor: colors.textMuted + '10',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>😔</span>
          <div>
            <div style={{ fontWeight: '500' }}>No Claim Available</div>
            <div style={{ fontSize: '12px', color: colors.textMuted }}>
              Your vote did not match the winning outcome.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Deadline expired
  if (isExpired) {
    return (
      <div style={{
        ...styles.card,
        padding: '16px',
        backgroundColor: colors.error + '10',
        border: `1px solid ${colors.error}40`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>⏰</span>
          <div>
            <div style={{ fontWeight: '500', color: colors.error }}>
              Claim Deadline Passed
            </div>
            <div style={{ fontSize: '12px', color: colors.textMuted }}>
              The claim window has expired.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Winner can claim
  return (
    <div style={{
      ...styles.card,
      padding: '20px',
      backgroundColor: colors.success + '08',
      border: `1px solid ${colors.success}30`,
    }}>
      {/* Winner Badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '16px',
      }}>
        <span style={{ fontSize: '24px' }}>🎉</span>
        <span style={{ fontWeight: '600', fontSize: '18px', color: colors.success }}>
          You Won!
        </span>
        <span style={{ fontSize: '24px' }}>🎉</span>
      </div>

      {/* Payout Details */}
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: colors.background,
        marginBottom: '16px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>
            Your Payout
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: colors.success }}>
            {formatBigInt(payout.net, tokenDecimals)} {tokenSymbol}
          </div>
          {payout.multiplier > 1 && (
            <div style={{ fontSize: '12px', color: colors.success, marginTop: '4px' }}>
              {payout.multiplier.toFixed(2)}x return
            </div>
          )}
        </div>

        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: '12px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            marginBottom: '4px',
          }}>
            <span style={{ color: colors.textMuted }}>Gross payout</span>
            <span>{formatBigInt(payout.gross, tokenDecimals)} {tokenSymbol}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            marginBottom: '4px',
          }}>
            <span style={{ color: colors.textMuted }}>Protocol fee ({(protocolFeeBps / 100).toFixed(1)}%)</span>
            <span style={{ color: colors.textMuted }}>-{formatBigInt(payout.fee, tokenDecimals)} {tokenSymbol}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            fontWeight: '500',
            paddingTop: '8px',
            borderTop: `1px dashed ${colors.border}`,
          }}>
            <span>Net payout</span>
            <span style={{ color: colors.success }}>{formatBigInt(payout.net, tokenDecimals)} {tokenSymbol}</span>
          </div>
        </div>
      </div>

      {/* Deadline Warning */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        fontSize: '12px',
        color: timeRemaining < 86400 ? colors.warning : colors.textMuted,
        marginBottom: '16px',
      }}>
        <span>⏰</span>
        <span>Claim within {formatTimeRemaining(timeRemaining)}</span>
      </div>

      {/* Claim Button */}
      <button
        onClick={onClaim}
        disabled={isClaiming}
        style={{
          ...styles.buttonPrimary,
          width: '100%',
          padding: '14px',
          fontSize: '16px',
          backgroundColor: colors.success,
          opacity: isClaiming ? 0.6 : 1,
        }}
      >
        {isClaiming ? 'Claiming...' : `Claim ${formatBigInt(payout.net, tokenDecimals)} ${tokenSymbol}`}
      </button>
    </div>
  );
}

export default ClaimButton;
