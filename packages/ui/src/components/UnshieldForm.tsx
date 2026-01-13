/**
 * Unshield form component
 *
 * Withdraw tokens from the privacy pool back to a public wallet
 */

import React, { useState } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useUnshield, useNoteSelector, useWallet, useCloakCraft } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface UnshieldFormProps {
  tokenMint: PublicKey;
  decimals?: number;
  symbol?: string;
  /** Default recipient token account */
  defaultRecipient?: PublicKey;
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
  className?: string;
  /** Wallet public key (for wallet adapter) */
  walletPublicKey?: PublicKey | null;
  /** Token list for dropdown */
  tokens?: TokenInfo[];
  /** Callback when token changes */
  onTokenChange?: (token: TokenInfo) => void;
}

export function UnshieldForm({
  tokenMint,
  decimals = 9,
  symbol = 'tokens',
  defaultRecipient,
  onSuccess,
  onError,
  className,
  walletPublicKey,
  tokens,
  onTokenChange,
}: UnshieldFormProps) {
  const [recipient, setRecipient] = useState(defaultRecipient?.toBase58() ?? '');
  const [amount, setAmount] = useState('');
  const { isUnshielding, error, result, unshield, reset } = useUnshield();
  const { isConnected, isInitialized } = useWallet();
  const { client } = useCloakCraft();
  const { availableNotes, totalAvailable, selectNotesForAmount } = useNoteSelector(tokenMint);

  const formatAmount = (value: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 4)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onError?.('Please enter a valid amount');
      return;
    }

    // Validate recipient address
    let recipientPubkey: PublicKey;
    try {
      recipientPubkey = new PublicKey(recipient);
    } catch {
      onError?.('Invalid recipient token account address');
      return;
    }

    if (!client?.getProgram()) {
      onError?.('Program not configured. Call setProgram() first.');
      return;
    }

    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));

    // Select notes for unshield
    let selectedNotes;
    try {
      selectedNotes = selectNotesForAmount(amountLamports);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Insufficient balance');
      return;
    }

    const txResult = await unshield(
      {
        inputs: selectedNotes,
        amount: amountLamports,
        recipient: recipientPubkey,
        walletPublicKey: walletPublicKey ?? undefined,
      }
    );

    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount('');
    } else if (error) {
      onError?.(error);
    }
  };

  const handleMax = () => {
    const maxAmount = Number(totalAvailable) / 10 ** decimals;
    setAmount(maxAmount.toString());
  };

  const isDisabled = !isConnected || !isInitialized || isUnshielding || !amount || !recipient;

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Withdraw Tokens</h3>
      <p style={styles.cardDescription}>
        Withdraw tokens from the privacy pool back to your public wallet.
      </p>

      <div style={{ marginBottom: '16px', ...styles.spaceBetween }}>
        <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>Private Balance</span>
        <span style={{ fontWeight: 600 }}>{formatAmount(totalAvailable)} {symbol}</span>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {tokens && onTokenChange && (
          <label style={styles.label}>
            Token
            <PrivateTokenSelectorWithBalance
              tokens={tokens}
              selected={tokenMint}
              onSelect={(token) => onTokenChange(token)}
              disabled={isUnshielding}
            />
          </label>
        )}

        <label style={styles.label}>
          Recipient Token Account
          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Enter token account address"
            disabled={isUnshielding}
            style={{ ...styles.input, fontFamily: 'monospace', fontSize: '0.875rem' }}
          />
        </label>

        <label style={styles.label}>
          <div style={styles.spaceBetween}>
            <span>Amount ({symbol})</span>
            <button
              type="button"
              onClick={handleMax}
              disabled={isUnshielding || totalAvailable === 0n}
              style={{
                ...styles.buttonSecondary,
                ...styles.buttonSmall,
                padding: '2px 8px',
                fontSize: '0.75rem',
              }}
            >
              MAX
            </button>
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            disabled={isUnshielding}
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
            : isUnshielding
            ? 'Withdrawing...'
            : 'Withdraw Tokens'}
        </button>

        {error && <div style={styles.errorText}>{error}</div>}

        {result && (
          <div style={styles.successBox}>
            <div style={styles.successText}>Withdrawal successful!</div>
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

function PrivateTokenSelectorWithBalance({
  tokens,
  selected,
  onSelect,
  disabled,
}: {
  tokens: TokenInfo[];
  selected: PublicKey;
  onSelect: (token: TokenInfo) => void;
  disabled?: boolean;
}) {
  const formatBalance = (balance: bigint, decimals: number) => {
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fractional = balance % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, '0').slice(0, 4);
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
        // Get private balance for each token
        const { totalAvailable } = useNoteSelector(token.mint);
        const balanceStr = formatBalance(totalAvailable, token.decimals);
        return (
          <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
            {token.symbol} - {balanceStr}
          </option>
        );
      })}
    </select>
  );
}
