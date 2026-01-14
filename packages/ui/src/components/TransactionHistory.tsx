/**
 * Transaction history component
 *
 * Displays recent transactions (shields, transfers, unshields)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface Transaction {
  signature: string;
  type: 'shield' | 'transfer' | 'unshield';
  amount: bigint;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
}

interface TransactionHistoryProps {
  tokenMint?: PublicKey;
  decimals?: number;
  symbol?: string;
  maxItems?: number;
  className?: string;
}

export function TransactionHistory({
  tokenMint,
  decimals = 9,
  symbol = 'tokens',
  maxItems = 10,
  className,
}: TransactionHistoryProps) {
  const { client, isConnected } = useCloakCraft();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const formatAmount = (value: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 8)}`;
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getTypeLabel = (type: Transaction['type']) => {
    switch (type) {
      case 'shield':
        return 'Shielded';
      case 'transfer':
        return 'Transferred';
      case 'unshield':
        return 'Withdrew';
    }
  };

  const getTypeStyle = (type: Transaction['type']): React.CSSProperties => {
    switch (type) {
      case 'shield':
        return { ...styles.badge, backgroundColor: '#ecfdf5', color: colors.success };
      case 'transfer':
        return { ...styles.badge, backgroundColor: '#eef2ff', color: colors.primary };
      case 'unshield':
        return { ...styles.badge, backgroundColor: '#fef3c7', color: colors.warning };
    }
  };

  const getStatusStyle = (status: Transaction['status']): React.CSSProperties => {
    switch (status) {
      case 'confirmed':
        return { color: colors.success };
      case 'pending':
        return { color: colors.warning };
      case 'failed':
        return { color: colors.error };
    }
  };

  // Note: In a real implementation, this would fetch from the indexer
  // For now, this is a placeholder that shows how the component would work
  const refresh = useCallback(async () => {
    if (!client || !isConnected) return;

    setIsLoading(true);
    try {
      // TODO: Implement transaction history fetching from indexer
      // const history = await client.getTransactionHistory(tokenMint, maxItems);
      // setTransactions(history);

      // Placeholder: Show empty state
      setTransactions([]);
    } catch (err) {
      console.error('Failed to fetch transaction history:', err);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected, tokenMint, maxItems]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className={className} style={styles.card}>
      <div style={{ ...styles.spaceBetween, marginBottom: '16px' }}>
        <h3 style={{ ...styles.cardTitle, margin: 0 }}>Transaction History</h3>
        <button
          onClick={refresh}
          disabled={isLoading || !isConnected}
          style={{
            ...styles.buttonSecondary,
            ...styles.buttonSmall,
          }}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {!isConnected ? (
        <div style={styles.emptyState}>
          Connect your wallet to view transaction history
        </div>
      ) : transactions.length === 0 ? (
        <div style={styles.emptyState}>
          No transactions yet
        </div>
      ) : (
        <div style={styles.stack}>
          {transactions.map((tx) => (
            <div key={tx.signature} style={styles.listItem}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={styles.row}>
                  <span style={getTypeStyle(tx.type)}>{getTypeLabel(tx.type)}</span>
                  <span style={{ fontWeight: 500 }}>
                    {formatAmount(tx.amount)} {symbol}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem' }}>
                  <span style={{ ...styles.mono, color: colors.textMuted }}>
                    {tx.signature.slice(0, 8)}...{tx.signature.slice(-8)}
                  </span>
                  <span style={getStatusStyle(tx.status)}>
                    {tx.status}
                  </span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8125rem', color: colors.textMuted }}>
                  {formatTime(tx.timestamp)}
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ ...styles.link, fontSize: '0.75rem' }}
                >
                  View
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
