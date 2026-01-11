/**
 * Shield form component
 */

import React, { useState } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useShield } from '@cloakcraft/hooks';

interface ShieldFormProps {
  tokenMint: PublicKey;
  decimals?: number;
  onSuccess?: (signature: string) => void;
  className?: string;
}

export function ShieldForm({
  tokenMint,
  decimals = 9,
  onSuccess,
  className,
}: ShieldFormProps) {
  const [amount, setAmount] = useState('');
  const { isShielding, error, result, shield, reset } = useShield();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));

    // In production: Use connected wallet
    const payer = SolanaKeypair.generate();

    const txResult = await shield(tokenMint, amountLamports, payer);
    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount('');
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ fontWeight: 500 }}>
          Amount to Shield
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.000001"
            min="0"
            disabled={isShielding}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginTop: '4px',
            }}
          />
        </label>

        <button
          type="submit"
          disabled={isShielding || !amount}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isShielding ? '#9ca3af' : '#6366f1',
            color: 'white',
            cursor: isShielding ? 'wait' : 'pointer',
            fontWeight: 500,
          }}
        >
          {isShielding ? 'Shielding...' : 'Shield Tokens'}
        </button>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ color: '#10b981', fontSize: '0.875rem' }}>
            Success! Tx: {result.signature.slice(0, 8)}...
          </div>
        )}
      </form>
    </div>
  );
}
