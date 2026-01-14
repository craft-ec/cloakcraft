/**
 * Notes list component
 *
 * Displays all notes owned by the user
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { useScanner, useWallet } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface NotesListProps {
  tokenMint: PublicKey;
  decimals?: number;
  symbol?: string;
  className?: string;
  /** Auto-refresh interval in milliseconds (0 to disable) */
  autoRefreshMs?: number;
}

export function NotesList({
  tokenMint,
  decimals = 9,
  symbol = 'tokens',
  className,
  autoRefreshMs = 0,
}: NotesListProps) {
  const { notes, totalAmount, isScanning, lastScanned, scan, error } = useScanner(tokenMint, autoRefreshMs);
  const { isConnected } = useWallet();

  const formatAmount = (amount: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, 8);
    return `${whole}.${fractionalStr}`;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'Just now';
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className={className} style={styles.card}>
      <div style={{ ...styles.spaceBetween, marginBottom: '16px' }}>
        <div>
          <h3 style={{ ...styles.cardTitle, margin: 0 }}>Your Notes</h3>
          {lastScanned && (
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '2px' }}>
              Updated {formatTime(lastScanned)}
            </div>
          )}
        </div>
        <button
          onClick={scan}
          disabled={isScanning || !isConnected}
          style={{
            ...styles.buttonSecondary,
            ...styles.buttonSmall,
            ...(isScanning || !isConnected ? { opacity: 0.5 } : {}),
          }}
        >
          {isScanning ? 'Scanning...' : 'Refresh'}
        </button>
      </div>

      {error && <div style={{ ...styles.errorText, marginBottom: '12px' }}>{error}</div>}

      {/* Summary */}
      <div style={{
        marginBottom: '16px',
        padding: '12px 16px',
        background: colors.backgroundDark,
        borderRadius: '8px',
        ...styles.spaceBetween,
      }}>
        <div>
          <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>Total Balance</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, fontSize: '1.25rem' }}>
            {formatAmount(totalAmount)} {symbol}
          </div>
          <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'}
          </div>
        </div>
      </div>

      {/* Notes List */}
      {!isConnected ? (
        <div style={styles.emptyState}>
          Connect your wallet to view notes
        </div>
      ) : notes.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ marginBottom: '8px' }}>No notes found</div>
          <div style={{ fontSize: '0.8125rem', color: colors.textLight }}>
            Shield some tokens to get started
          </div>
        </div>
      ) : (
        <div style={styles.stack}>
          {notes.map((note, index) => (
            <div
              key={index}
              style={styles.listItem}
            >
              <div>
                <div style={{ fontWeight: 500, marginBottom: '2px' }}>
                  {formatAmount(note.amount)} {symbol}
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                  <span style={{ color: colors.textMuted }}>Leaf #{note.leafIndex.toString()}</span>
                  <span style={{ ...styles.mono, color: colors.textLight }}>
                    {Buffer.from(note.commitment).toString('hex').slice(0, 12)}...
                  </span>
                </div>
              </div>
              <div
                style={{
                  ...styles.badge,
                  backgroundColor: '#ecfdf5',
                  color: colors.success,
                }}
              >
                Unspent
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
