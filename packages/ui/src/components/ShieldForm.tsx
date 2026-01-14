/**
 * Shield form component
 *
 * Deposits tokens into the privacy pool
 */

import React, { useState } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useShield, useWallet, useCloakCraft, useTokenBalances } from '@cloakcraft/hooks';
import { styles } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface ShieldFormProps {
  tokenMint: PublicKey;
  userTokenAccount: PublicKey | null;
  decimals?: number;
  symbol?: string;
  onSuccess?: (signature: string, commitment: Uint8Array) => void;
  onError?: (error: string) => void;
  className?: string;
  /** Wallet public key (for wallet adapter) */
  walletPublicKey?: PublicKey | null;
  /** Token list for dropdown */
  tokens?: TokenInfo[];
  /** Callback when token changes */
  onTokenChange?: (token: TokenInfo) => void;
}

export function ShieldForm({
  tokenMint,
  userTokenAccount,
  decimals = 9,
  symbol = 'tokens',
  onSuccess,
  onError,
  className,
  walletPublicKey,
  tokens,
  onTokenChange,
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

    if (!walletPublicKey) {
      onError?.('No wallet connected');
      return;
    }

    if (!client?.getProgram()) {
      onError?.('Program not configured. Call setProgram() first.');
      return;
    }

    if (!userTokenAccount) {
      onError?.('Token account not found. Please ensure you have the selected token.');
      return;
    }

    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));

    const txResult = await shield({
      tokenMint,
      amount: amountLamports,
      userTokenAccount,
      walletPublicKey,
    });

    if (txResult) {
      onSuccess?.(txResult.signature, txResult.commitment);
      setAmount('');
    } else if (error) {
      onError?.(error);
    }
  };

  const isDisabled = !isConnected || !isInitialized || isShielding || !amount || !walletPublicKey;

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Shield Tokens</h3>
      <p style={styles.cardDescription}>
        Deposit tokens into the privacy pool to enable private transfers.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {tokens && onTokenChange && (
          <label style={styles.label}>
            Token
            <TokenSelectorWithBalance
              tokens={tokens}
              selected={tokenMint}
              onSelect={(token) => onTokenChange(token)}
              disabled={isShielding}
              owner={walletPublicKey}
            />
          </label>
        )}

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

function TokenSelectorWithBalance({
  tokens,
  selected,
  onSelect,
  disabled,
  owner,
}: {
  tokens: TokenInfo[];
  selected: PublicKey;
  onSelect: (token: TokenInfo) => void;
  disabled?: boolean;
  owner?: PublicKey | null;
}) {
  const tokenMints = React.useMemo(() => tokens.map((t) => t.mint), [tokens]);
  const { getBalance } = useTokenBalances(tokenMints, owner || undefined);

  const formatBalance = (balance: bigint, decimals: number) => {
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fractional = balance % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, 8);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };

  return (
    <select
      value={selected.toBase58()}
      onChange={(e) => {
        const token = tokens.find(t => t.mint.toBase58() === e.target.value);
        if (token) onSelect(token);
      }}
      disabled={disabled}
      style={styles.input}
    >
      {tokens.map(token => {
        const balance = getBalance(token.mint);
        const balanceStr = formatBalance(balance, token.decimals);
        return (
          <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
            {token.symbol} - {balanceStr}
          </option>
        );
      })}
    </select>
  );
}
