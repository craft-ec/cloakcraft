/**
 * Pool Info component
 *
 * Displays information about a privacy pool
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { usePool } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface PoolInfoProps {
  tokenMint: PublicKey;
  decimals?: number;
  symbol?: string;
  className?: string;
}

export function PoolInfo({
  tokenMint,
  decimals = 9,
  symbol = 'tokens',
  className,
}: PoolInfoProps) {
  const { pool, poolPda, isLoading, error, refresh, exists } = usePool(tokenMint);

  const formatAmount = (amount: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 8)}`;
  };

  const truncateAddress = (address: PublicKey | null) => {
    if (!address) return '---';
    const str = address.toBase58();
    return `${str.slice(0, 8)}...${str.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <div className={className} style={styles.card}>
        <div style={styles.emptyState}>Loading pool info...</div>
      </div>
    );
  }

  if (!exists) {
    return (
      <div className={className} style={styles.card}>
        <h3 style={styles.cardTitle}>Pool Not Found</h3>
        <div style={styles.emptyState}>
          <div style={{ marginBottom: '8px' }}>No pool exists for this token</div>
          <div style={{ fontSize: '0.8125rem', color: colors.textLight, marginBottom: '16px' }}>
            Initialize a pool first to enable private transfers
          </div>
        </div>
        <div style={{ display: 'grid', gap: '12px' }}>
          <InfoRow
            label="Pool Address (PDA)"
            value={truncateAddress(poolPda)}
            copyValue={poolPda?.toBase58()}
          />
          <InfoRow
            label="Token Mint"
            value={truncateAddress(tokenMint)}
            copyValue={tokenMint.toBase58()}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={styles.card}>
      <div style={{ ...styles.spaceBetween, marginBottom: '16px' }}>
        <h3 style={{ ...styles.cardTitle, margin: 0 }}>Pool Info</h3>
        <button
          onClick={refresh}
          disabled={isLoading}
          style={{
            ...styles.buttonSecondary,
            ...styles.buttonSmall,
          }}
        >
          Refresh
        </button>
      </div>

      {error && <div style={{ ...styles.errorText, marginBottom: '12px' }}>{error}</div>}

      <div style={styles.stack}>
        {/* Total Shielded */}
        <div style={{
          padding: '16px',
          background: colors.backgroundDark,
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '4px' }}>
            Total Shielded
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            {formatAmount(pool?.totalShielded ?? 0n)} {symbol}
          </div>
        </div>

        {/* Pool Details */}
        <div style={{ display: 'grid', gap: '12px' }}>
          <InfoRow
            label="Pool Address"
            value={truncateAddress(poolPda)}
            copyValue={poolPda?.toBase58()}
          />
          <InfoRow
            label="Token Mint"
            value={truncateAddress(tokenMint)}
            copyValue={tokenMint.toBase58()}
          />
          <InfoRow
            label="Token Vault"
            value={truncateAddress(pool?.tokenVault ?? null)}
            copyValue={pool?.tokenVault?.toBase58()}
          />
          <InfoRow
            label="Authority"
            value={truncateAddress(pool?.authority ?? null)}
            copyValue={pool?.authority?.toBase58()}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyValue,
}: {
  label: string;
  value: string;
  copyValue?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore copy errors
    }
  };

  return (
    <div style={styles.spaceBetween}>
      <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ ...styles.mono, fontSize: '0.875rem' }}>{value}</span>
        {copyValue && (
          <button
            onClick={handleCopy}
            style={{
              ...styles.buttonSecondary,
              padding: '2px 6px',
              fontSize: '0.6875rem',
            }}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Compact pool status badge
 */
export function PoolStatusBadge({ tokenMint }: { tokenMint: PublicKey }) {
  const { exists, isLoading } = usePool(tokenMint);

  if (isLoading) {
    return <span style={{ ...styles.badge, backgroundColor: colors.backgroundDark }}>...</span>;
  }

  if (exists) {
    return (
      <span style={{ ...styles.badge, ...styles.badgeSuccess }}>
        Pool Active
      </span>
    );
  }

  return (
    <span style={{ ...styles.badge, ...styles.badgeWarning }}>
      No Pool
    </span>
  );
}
