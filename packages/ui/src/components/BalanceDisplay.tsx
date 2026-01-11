/**
 * Balance display component
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { useBalance } from '@cloakcraft/hooks';

interface BalanceDisplayProps {
  tokenMint: PublicKey;
  decimals?: number;
  symbol?: string;
  className?: string;
}

export function BalanceDisplay({
  tokenMint,
  decimals = 9,
  symbol = 'tokens',
  className,
}: BalanceDisplayProps) {
  const { balance, isLoading, refresh } = useBalance(tokenMint);

  const formatBalance = (amount: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, 4);
    return `${whole}.${fractionalStr}`;
  };

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ fontSize: '1.5rem', fontWeight: 600 }}>
        {isLoading ? '...' : formatBalance(balance)}
      </span>
      <span style={{ color: '#6b7280' }}>{symbol}</span>
      <button
        onClick={refresh}
        disabled={isLoading}
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          border: '1px solid #e5e7eb',
          background: 'white',
          cursor: 'pointer',
        }}
      >
        ↻
      </button>
    </div>
  );
}
