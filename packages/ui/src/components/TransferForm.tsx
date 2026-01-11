/**
 * Transfer form component
 */

import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useTransfer, useNotes } from '@cloakcraft/hooks';
import { generateStealthAddress } from '@cloakcraft/sdk';

interface TransferFormProps {
  tokenMint: PublicKey;
  decimals?: number;
  onSuccess?: (signature: string) => void;
  className?: string;
}

export function TransferForm({
  tokenMint,
  decimals = 9,
  onSuccess,
  className,
}: TransferFormProps) {
  const [recipientPubkey, setRecipientPubkey] = useState('');
  const [amount, setAmount] = useState('');
  const { isTransferring, error, result, transfer, reset } = useTransfer();
  const { notes } = useNotes(tokenMint);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }

    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));

    // Select notes for transfer
    let total = 0n;
    const selectedNotes = [];
    for (const note of notes) {
      if (total >= amountLamports) break;
      selectedNotes.push(note);
      total += note.amount;
    }

    if (total < amountLamports) {
      return;
    }

    // Parse recipient public key
    const recipientPoint = parsePublicKey(recipientPubkey);
    if (!recipientPoint) {
      return;
    }

    // Generate stealth address for recipient
    const { stealthAddress } = generateStealthAddress(recipientPoint);

    const txResult = await transfer(
      selectedNotes,
      [{ recipient: stealthAddress, amount: amountLamports }]
    );

    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount('');
      setRecipientPubkey('');
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <label style={{ fontWeight: 500 }}>
          Recipient Public Key
          <input
            type="text"
            value={recipientPubkey}
            onChange={(e) => setRecipientPubkey(e.target.value)}
            placeholder="Enter recipient's BabyJubJub public key"
            disabled={isTransferring}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              marginTop: '4px',
              fontFamily: 'monospace',
              fontSize: '0.875rem',
            }}
          />
        </label>

        <label style={{ fontWeight: 500 }}>
          Amount
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="0.000001"
            min="0"
            disabled={isTransferring}
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
          disabled={isTransferring || !amount || !recipientPubkey}
          style={{
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: isTransferring ? '#9ca3af' : '#6366f1',
            color: 'white',
            cursor: isTransferring ? 'wait' : 'pointer',
            fontWeight: 500,
          }}
        >
          {isTransferring ? 'Transferring...' : 'Send Private Transfer'}
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

function parsePublicKey(hex: string): { x: Uint8Array; y: Uint8Array } | null {
  try {
    const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
    if (clean.length !== 128) return null;
    const bytes = Buffer.from(clean, 'hex');
    return {
      x: new Uint8Array(bytes.slice(0, 32)),
      y: new Uint8Array(bytes.slice(32, 64)),
    };
  } catch {
    return null;
  }
}
