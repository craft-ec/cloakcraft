/**
 * Balance display component
 *
 * Shows the user's private balance for a token
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { usePrivateBalance, useWallet } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface BalanceDisplayProps {
  tokenMint: PublicKey;
  decimals?: number;
  symbol?: string;
  showNoteCount?: boolean;
  className?: string;
}

export function BalanceDisplay({
  tokenMint,
  decimals = 9,
  symbol = 'tokens',
  showNoteCount = true,
  className,
}: BalanceDisplayProps) {
  const { balance, noteCount, isLoading, error, refresh } = usePrivateBalance(tokenMint);
  const { isConnected } = useWallet();

  const formatBalance = (amount: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, 8);
    return `${whole}.${fractionalStr}`;
  };

  return (
    <div className={className} style={styles.card}>
      <div style={styles.spaceBetween}>
        <div>
          <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '4px' }}>
            Private Balance
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span style={{ fontSize: '2rem', fontWeight: 600, color: colors.text }}>
              {!isConnected ? '---' : isLoading ? '...' : formatBalance(balance)}
            </span>
            <span style={{ fontSize: '1rem', color: colors.textMuted }}>{symbol}</span>
          </div>
          {showNoteCount && isConnected && (
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '4px' }}>
              {noteCount} {noteCount === 1 ? 'note' : 'notes'}
            </div>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={isLoading || !isConnected}
          style={{
            ...styles.buttonSecondary,
            ...styles.buttonSmall,
            ...(isLoading || !isConnected ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
          }}
        >
          {isLoading ? '...' : 'Refresh'}
        </button>
      </div>
      {error && (
        <div style={{ ...styles.errorText, marginTop: '8px', fontSize: '0.75rem', wordBreak: 'break-word' }}>
          {error}
        </div>
      )}
    </div>
  );
}

/**
 * Compact balance display for inline use
 */
export function BalanceInline({
  tokenMint,
  decimals = 9,
  symbol,
}: {
  tokenMint: PublicKey;
  decimals?: number;
  symbol?: string;
}) {
  const { balance, isLoading } = usePrivateBalance(tokenMint);
  const { isConnected } = useWallet();

  const formatBalance = (amount: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 2)}`;
  };

  if (!isConnected) return <span style={{ color: colors.textMuted }}>---</span>;
  if (isLoading) return <span style={{ color: colors.textMuted }}>...</span>;

  return (
    <span style={{ fontWeight: 500 }}>
      {formatBalance(balance)} {symbol}
    </span>
  );
}
