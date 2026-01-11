/**
 * Shield form component
 *
 * Deposits tokens into the privacy pool
 */

import React, { useState } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useShield, useWallet, useCloakCraft } from '@cloakcraft/hooks';
import { styles } from '../styles';

interface ShieldFormProps {
  tokenMint: PublicKey;
  userTokenAccount: PublicKey;
  decimals?: number;
  symbol?: string;
  onSuccess?: (signature: string, commitment: Uint8Array) => void;
  onError?: (error: string) => void;
  className?: string;
  /** Payer keypair for transaction fees */
  payer?: SolanaKeypair;
}

export function ShieldForm({
  tokenMint,
  userTokenAccount,
  decimals = 9,
  symbol = 'tokens',
  onSuccess,
  onError,
  className,
  payer,
}: ShieldFormProps) {
  const [amount, setAmount] = useState('');
  const { isShielding, error, result, shield, reset } = useShield();
  const { isConnected, isInitialized } = useWallet();
  const { client } = useCloakCraft();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onError?.('Please enter a valid amount');
      return;
    }

    if (!payer) {
      onError?.('No payer keypair provided');
      return;
    }

    if (!client?.getProgram()) {
      onError?.('Program not configured. Call setProgram() first.');
      return;
    }

    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));

    const txResult = await shield(
      {
        tokenMint,
        amount: amountLamports,
        userTokenAccount,
      },
      payer
    );

    if (txResult) {
      onSuccess?.(txResult.signature, txResult.commitment);
      setAmount('');
    } else if (error) {
      onError?.(error);
    }
  };

  const isDisabled = !isConnected || !isInitialized || isShielding || !amount || !payer;

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Shield Tokens</h3>
      <p style={styles.cardDescription}>
        Deposit tokens into the privacy pool to enable private transfers.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Amount ({symbol})
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            disabled={isShielding}
            style={styles.input}
          />
        </label>

        <button
          type="submit"
          disabled={isDisabled}
          style={{
            ...styles.buttonPrimary,
            ...(isDisabled ? styles.buttonDisabled : {}),
          }}
        >
          {!isConnected
            ? 'Connect Wallet'
            : !isInitialized
            ? 'Initializing...'
            : isShielding
            ? 'Shielding...'
            : 'Shield Tokens'}
        </button>

        {error && <div style={styles.errorText}>{error}</div>}

        {result && (
          <div style={styles.successBox}>
            <div style={styles.successText}>Tokens shielded successfully!</div>
            <div style={styles.txLink}>
              <a
                href={`https://explorer.solana.com/tx/${result.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                View transaction
              </a>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
