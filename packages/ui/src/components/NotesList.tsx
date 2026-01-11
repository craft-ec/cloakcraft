/**
 * Notes list component
 */

import React from 'react';
import { PublicKey } from '@solana/web3.js';
import { useNotes } from '@cloakcraft/hooks';

interface NotesListProps {
  tokenMint: PublicKey;
  decimals?: number;
  symbol?: string;
  className?: string;
}

export function NotesList({
  tokenMint,
  decimals = 9,
  symbol = 'tokens',
  className,
}: NotesListProps) {
  const { notes, totalAmount, isSyncing, sync } = useNotes(tokenMint);

  const formatAmount = (amount: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, 4);
    return `${whole}.${fractionalStr}`;
  };

  return (
    <div className={className}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0 }}>Your Notes ({notes.length})</h3>
        <button
          onClick={sync}
          disabled={isSyncing}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
            background: 'white',
            cursor: isSyncing ? 'wait' : 'pointer',
          }}
        >
          {isSyncing ? 'Syncing...' : 'Refresh'}
        </button>
      </div>

      <div style={{ marginBottom: '12px', padding: '12px', background: '#f3f4f6', borderRadius: '8px' }}>
        <span style={{ fontWeight: 500 }}>Total: </span>
        <span>{formatAmount(totalAmount)} {symbol}</span>
      </div>

      {notes.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>
          No notes found. Shield some tokens to get started.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {notes.map((note, index) => (
            <div
              key={index}
              style={{
                padding: '12px',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 500 }}>
                  {formatAmount(note.amount)} {symbol}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                  Leaf #{note.leafIndex}
                </div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                {Buffer.from(note.commitment).toString('hex').slice(0, 8)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
