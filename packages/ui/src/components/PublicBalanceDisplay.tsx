/**
 * Public Balance Display component
 *
 * Shows the user's public (non-shielded) token balances
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { usePublicBalance, useSolBalance, useTokenBalances } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface PublicBalanceDisplayProps {
  /** Owner wallet address */
  owner: PublicKey;
  /** Token to display balance for */
  token?: TokenInfo;
  /** Show SOL balance alongside token */
  showSol?: boolean;
  /** Compact display mode */
  compact?: boolean;
  className?: string;
}

/**
 * Display a single token's public balance
 */
export function PublicBalanceDisplay({
  owner,
  token,
  showSol = true,
  compact = false,
  className,
}: PublicBalanceDisplayProps) {
  const { balance: solBalance, isLoading: solLoading } = useSolBalance(owner);
  const {
    balance: tokenBalance,
    isLoading: tokenLoading,
    refresh,
  } = usePublicBalance(token?.mint, owner);

  const formatAmount = (amount: bigint, decimals: number) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, 8);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };

  const formatSol = (lamports: bigint) => {
    return formatAmount(lamports, 9);
  };

  if (compact) {
    return (
      <div className={className} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {showSol && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>SOL:</span>
            <span style={{ fontWeight: 500 }}>
              {solLoading ? '...' : formatSol(solBalance)}
            </span>
          </div>
        )}
        {token && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {token.logoUri && (
              <img
                src={token.logoUri}
                alt={token.symbol}
                style={{ width: 16, height: 16, borderRadius: '50%' }}
              />
            )}
            <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>
              {token.symbol}:
            </span>
            <span style={{ fontWeight: 500 }}>
              {tokenLoading ? '...' : formatAmount(tokenBalance, token.decimals)}
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className} style={styles.card}>
      <div style={{ ...styles.spaceBetween, marginBottom: '16px' }}>
        <h3 style={{ ...styles.cardTitle, margin: 0 }}>Public Balance</h3>
        <button
          onClick={refresh}
          style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
        >
          Refresh
        </button>
      </div>

      <div style={{ display: 'grid', gap: '12px' }}>
        {showSol && (
          <BalanceRow
            symbol="SOL"
            name="Solana"
            balance={solBalance}
            decimals={9}
            isLoading={solLoading}
          />
        )}

        {token && (
          <BalanceRow
            symbol={token.symbol}
            name={token.name}
            balance={tokenBalance}
            decimals={token.decimals}
            logoUri={token.logoUri}
            isLoading={tokenLoading}
          />
        )}

        {!token && !showSol && (
          <div style={styles.emptyState}>No tokens to display</div>
        )}
      </div>
    </div>
  );
}

interface MultiTokenBalanceDisplayProps {
  owner: PublicKey;
  tokens: TokenInfo[];
  showSol?: boolean;
  className?: string;
}

/**
 * Display multiple token balances
 */
export function MultiTokenBalanceDisplay({
  owner,
  tokens,
  showSol = true,
  className,
}: MultiTokenBalanceDisplayProps) {
  const tokenMints = React.useMemo(() => tokens.map((t) => t.mint), [tokens]);
  const { balance: solBalance, isLoading: solLoading, refresh: refreshSol } = useSolBalance(owner);
  const { balances, getBalance, isLoading, refresh } = useTokenBalances(
    tokenMints,
    owner
  );

  const handleRefresh = () => {
    refresh();
    refreshSol();
  };

  // Filter to only show tokens with non-zero balance
  const tokensWithBalance = tokens.filter((token) => {
    const balance = getBalance(token.mint);
    return balance > BigInt(0);
  });

  const hasSolBalance = solBalance > BigInt(0);
  const hasAnyBalance = hasSolBalance || tokensWithBalance.length > 0;

  return (
    <div className={className} style={styles.card}>
      <div style={{ ...styles.spaceBetween, marginBottom: '16px' }}>
        <h3 style={{ ...styles.cardTitle, margin: 0 }}>Public Balances</h3>
        <button
          onClick={handleRefresh}
          disabled={isLoading || solLoading}
          style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
        >
          Refresh All
        </button>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {!isLoading && !solLoading && !hasAnyBalance && (
          <div style={styles.emptyState}>No public balances yet</div>
        )}

        {showSol && hasSolBalance && (
          <BalanceRow
            symbol="SOL"
            name="Solana"
            balance={solBalance}
            decimals={9}
            isLoading={solLoading}
          />
        )}

        {tokensWithBalance.map((token) => (
          <BalanceRow
            key={token.mint.toBase58()}
            symbol={token.symbol}
            name={token.name}
            balance={getBalance(token.mint)}
            decimals={token.decimals}
            logoUri={token.logoUri}
            isLoading={isLoading}
          />
        ))}
      </div>
    </div>
  );
}

function BalanceRow({
  symbol,
  name,
  balance,
  decimals,
  logoUri,
  isLoading,
}: {
  symbol: string;
  name: string;
  balance: bigint;
  decimals: number;
  logoUri?: string;
  isLoading: boolean;
}) {
  const formatAmount = (amount: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, 8);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px',
        background: colors.backgroundMuted,
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {logoUri ? (
          <img
            src={logoUri}
            alt={symbol}
            style={{ width: 28, height: 28, borderRadius: '50%' }}
          />
        ) : (
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: colors.backgroundDark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 600,
            }}
          >
            {symbol.slice(0, 2)}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 500 }}>{symbol}</div>
          <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{name}</div>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        {isLoading ? (
          <span style={{ color: colors.textMuted }}>Loading...</span>
        ) : (
          <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>
            {formatAmount(balance)}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Simple balance summary for header/nav
 */
export function BalanceSummary({
  owner,
  token,
  className,
}: {
  owner: PublicKey;
  token?: TokenInfo;
  className?: string;
}) {
  const { balance: solBalance, isLoading: solLoading } = useSolBalance(owner);
  const { balance: tokenBalance, isLoading: tokenLoading } = usePublicBalance(
    token?.mint,
    owner
  );

  const formatSol = (lamports: bigint) => {
    const sol = Number(lamports) / 1e9;
    return sol.toFixed(2);
  };

  const formatToken = (amount: bigint, decimals: number) => {
    const value = Number(amount) / 10 ** decimals;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toFixed(2);
  };

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        gap: '12px',
        fontSize: '0.875rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ color: colors.textMuted }}>SOL</span>
        <span style={{ fontWeight: 500 }}>
          {solLoading ? '...' : formatSol(solBalance)}
        </span>
      </div>
      {token && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: colors.textMuted }}>{token.symbol}</span>
          <span style={{ fontWeight: 500 }}>
            {tokenLoading ? '...' : formatToken(tokenBalance, token.decimals)}
          </span>
        </div>
      )}
    </div>
  );
}
