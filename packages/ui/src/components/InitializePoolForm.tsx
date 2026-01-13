/**
 * Initialize Pool Form component
 *
 * Creates a new privacy pool for a token
 */

import React, { useState } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useInitializePool, usePool, useCloakCraft } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface InitializePoolFormProps {
  onSuccess?: (poolTx: string, counterTx: string) => void;
  onError?: (error: string) => void;
  className?: string;
  /** Payer keypair for transaction fees (optional if walletPublicKey provided) */
  payer?: SolanaKeypair;
  /** Wallet public key from wallet adapter */
  walletPublicKey?: PublicKey | null;
  /** Default token mint to pre-fill */
  defaultTokenMint?: PublicKey;
}

export function InitializePoolForm({
  onSuccess,
  onError,
  className,
  payer,
  walletPublicKey,
  defaultTokenMint,
}: InitializePoolFormProps) {
  const [tokenMintInput, setTokenMintInput] = useState(defaultTokenMint?.toBase58() ?? '');
  const [validMint, setValidMint] = useState<PublicKey | null>(defaultTokenMint ?? null);
  const { isInitializing, error, result, initializePool, initializePoolWithWallet, reset } = useInitializePool();
  const { pool, exists, isLoading: isCheckingPool } = usePool(validMint ?? undefined);
  const { client } = useCloakCraft();

  const handleMintChange = (value: string) => {
    setTokenMintInput(value);
    reset();

    // Validate pubkey format
    try {
      if (value.trim().length > 0) {
        const mint = new PublicKey(value.trim());
        setValidMint(mint);
      } else {
        setValidMint(null);
      }
    } catch {
      setValidMint(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    if (!validMint) {
      onError?.('Invalid token mint address');
      return;
    }

    if (!payer && !walletPublicKey) {
      onError?.('No wallet connected');
      return;
    }

    if (!client?.getProgram()) {
      onError?.('Program not configured. Call setProgram() first.');
      return;
    }

    let txResult;
    if (payer) {
      // Use keypair if provided
      txResult = await initializePool(validMint, payer);
    } else if (walletPublicKey) {
      // Use wallet adapter
      txResult = await initializePoolWithWallet(validMint, walletPublicKey);
    }

    if (txResult) {
      onSuccess?.(txResult.poolTx, txResult.counterTx);
      setTokenMintInput('');
      setValidMint(null);
    } else if (error) {
      onError?.(error);
    }
  };

  const isValidInput = validMint !== null;
  const poolAlreadyExists = isValidInput && exists;
  const hasWallet = !!payer || !!walletPublicKey;
  const isDisabled = !isValidInput || isInitializing || poolAlreadyExists || !hasWallet;

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Initialize Pool</h3>
      <p style={styles.cardDescription}>
        Create a new privacy pool for any SPL token. Each token needs its own pool.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Token Mint Address
          <input
            type="text"
            value={tokenMintInput}
            onChange={(e) => handleMintChange(e.target.value)}
            placeholder="Enter SPL token mint address"
            disabled={isInitializing}
            style={{
              ...styles.input,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              borderColor: tokenMintInput && !isValidInput ? colors.error : colors.border,
            }}
          />
        </label>

        {/* Validation feedback */}
        {tokenMintInput && !isValidInput && (
          <div style={styles.errorText}>Invalid token mint address</div>
        )}

        {isCheckingPool && validMint && (
          <div style={{ fontSize: '0.875rem', color: colors.textMuted }}>
            Checking if pool exists...
          </div>
        )}

        {poolAlreadyExists && (
          <div style={styles.warningBox}>
            <div style={{ fontWeight: 500, marginBottom: '4px' }}>Pool Already Exists</div>
            <div style={{ fontSize: '0.8125rem', color: colors.textMuted }}>
              A pool for this token has already been initialized.
              Total shielded: {pool?.totalShielded?.toString() ?? '0'}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isDisabled}
          style={{
            ...styles.buttonPrimary,
            ...(isDisabled ? styles.buttonDisabled : {}),
          }}
        >
          {isInitializing ? 'Initializing...' : 'Initialize Pool'}
        </button>

        {error && <div style={styles.errorText}>{error}</div>}

        {result && (
          <div style={styles.successBox}>
            <div style={styles.successText}>Pool initialized successfully!</div>
            <div style={{ marginTop: '8px', fontSize: '0.8125rem' }}>
              {result.poolTx !== 'already_exists' && (
                <div>
                  Pool TX:{' '}
                  <a
                    href={`https://explorer.solana.com/tx/${result.poolTx}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {result.poolTx.slice(0, 8)}...
                  </a>
                </div>
              )}
              {result.counterTx !== 'already_exists' && (
                <div>
                  Counter TX:{' '}
                  <a
                    href={`https://explorer.solana.com/tx/${result.counterTx}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {result.counterTx.slice(0, 8)}...
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
