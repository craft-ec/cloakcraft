/**
 * Multi Private Balance Display component
 *
 * Shows the user's private (shielded) token balances across multiple tokens
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { useNoteSelector, useCloakCraft } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface MultiPrivateBalanceDisplayProps {
  tokens: TokenInfo[];
  className?: string;
}

/**
 * Display multiple private token balances
 */
export function MultiPrivateBalanceDisplay({
  tokens,
  className,
}: MultiPrivateBalanceDisplayProps) {
  // Track if any refresh is in progress
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    // Give visual feedback
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className={className} style={styles.card}>
      <div style={{ ...styles.spaceBetween, marginBottom: '16px' }}>
        <h3 style={{ ...styles.cardTitle, margin: 0 }}>Private Balances</h3>
        <button
          onClick={handleRefreshAll}
          disabled={isRefreshing}
          style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh All'}
        </button>
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        <PrivateBalanceRows tokens={tokens} />
      </div>
    </div>
  );
}

function PrivateBalanceRows({ tokens }: { tokens: TokenInfo[] }) {
  // IMPORTANT: Also show unknown tokens (like LP tokens) that have balances
  const { notes } = useCloakCraft();

  // Get balances for known tokens
  const knownTokenBalances = tokens.map((token) => {
    const { totalAvailable } = useNoteSelector(token.mint);
    return { token, balance: totalAvailable };
  });

  // Group all notes by token mint to find unknown tokens
  const unknownTokenBalances = React.useMemo(() => {
    if (!notes) return [];

    const balanceMap = new Map<string, { token: TokenInfo; balance: bigint }>();

    notes.forEach((note) => {
      const mintStr = note.tokenMint.toBase58();
      const isKnownToken = tokens.some(t => t.mint.equals(note.tokenMint));

      // Only process unknown tokens
      if (!isKnownToken) {
        const existing = balanceMap.get(mintStr);
        if (existing) {
          existing.balance += note.amount;
        } else {
          // Create a placeholder token info for unknown mints
          balanceMap.set(mintStr, {
            token: {
              mint: note.tokenMint,
              symbol: `${mintStr.slice(0, 8)}...${mintStr.slice(-4)}`,
              name: `Unknown Token (${mintStr.slice(0, 6)}...)`,
              decimals: 9, // Assume 9 decimals for unknown tokens
            },
            balance: note.amount,
          });
        }
      }
    });

    return Array.from(balanceMap.values());
  }, [tokens, notes]);

  // Combine known and unknown balances
  const allBalances = [...knownTokenBalances, ...unknownTokenBalances];

  // Filter out zero balances
  const tokensWithBalance = allBalances.filter(({ balance }) => balance > BigInt(0));

  if (tokensWithBalance.length === 0) {
    return <div style={styles.emptyState}>No private balances yet</div>;
  }

  return (
    <>
      {tokensWithBalance.map(({ token, balance }) => (
        <PrivateBalanceRow key={token.mint.toBase58()} token={token} totalAvailable={balance} />
      ))}
    </>
  );
}

function PrivateBalanceRow({ token, totalAvailable }: { token: TokenInfo; totalAvailable: bigint }) {
  const formatAmount = (amount: bigint) => {
    const divisor = BigInt(10 ** token.decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(token.decimals, '0').slice(0, 8);
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
        {token.logoUri ? (
          <img
            src={token.logoUri}
            alt={token.symbol}
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
            {token.symbol.slice(0, 2)}
          </div>
        )}
        <div>
          <div style={{ fontWeight: 500 }}>{token.symbol}</div>
          <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{token.name}</div>
        </div>
      </div>

      <div style={{ textAlign: 'right' }}>
        <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>
          {formatAmount(totalAvailable)}
        </span>
      </div>
    </div>
  );
}
