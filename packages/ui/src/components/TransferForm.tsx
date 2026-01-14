/**
 * Transfer form component
 *
 * Private transfer to another stealth address
 */

import React, { useState, useMemo } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useTransfer, useNoteSelector, useWallet, useCloakCraft } from '@cloakcraft/hooks';
import { generateStealthAddress } from '@cloakcraft/sdk';
import { styles, colors } from '../styles';

// Define TokenInfo interface locally
interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface TransferFormProps {
  tokenMint: PublicKey;
  decimals?: number;
  symbol?: string;
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

export function TransferForm({
  tokenMint,
  decimals = 9,
  symbol = 'tokens',
  onSuccess,
  onError,
  className,
  walletPublicKey,
  tokens,
  onTokenChange,
}: TransferFormProps) {
  const [recipientPubkey, setRecipientPubkey] = useState('');
  const [amount, setAmount] = useState('');
  const { isTransferring, error, result, transfer, reset } = useTransfer();
  const { isConnected, isInitialized, wallet } = useWallet();
  const { client } = useCloakCraft();
  const { availableNotes, totalAvailable, selectNotesForAmount } = useNoteSelector(tokenMint);

  const formatAmount = (value: bigint) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 8)}`;
  };

  const parseRecipientPublicKey = (hex: string): { x: Uint8Array; y: Uint8Array } | null => {
    try {
      const clean = hex.trim().startsWith('0x') ? hex.trim().slice(2) : hex.trim();
      if (clean.length !== 128) return null; // 64 bytes = 128 hex chars (x + y)
      const bytes = Buffer.from(clean, 'hex');
      return {
        x: new Uint8Array(bytes.slice(0, 32)),
        y: new Uint8Array(bytes.slice(32, 64)),
      };
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onError?.('Please enter a valid amount');
      return;
    }

    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));

    // Parse recipient public key
    const recipientPoint = parseRecipientPublicKey(recipientPubkey);
    if (!recipientPoint) {
      onError?.('Invalid recipient public key. Expected 128 hex characters (x + y coordinates).');
      return;
    }

    if (!client?.getProgram()) {
      onError?.('Program not configured. Call setProgram() first.');
      return;
    }

    // Select notes for transfer
    let selectedNotes;
    try {
      selectedNotes = selectNotesForAmount(amountLamports);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Insufficient balance');
      return;
    }

    // Generate stealth address for recipient
    const { stealthAddress } = generateStealthAddress(recipientPoint);

    // Calculate change
    const totalInput = selectedNotes.reduce((sum, n) => sum + n.amount, 0n);
    const change = totalInput - amountLamports;

    // Build outputs
    const outputs = [
      { recipient: stealthAddress, amount: amountLamports },
    ];

    // Add change output back to self if needed
    if (change > 0n && wallet) {
      const { stealthAddress: changeAddress } = generateStealthAddress(wallet.publicKey);
      outputs.push({ recipient: changeAddress, amount: change });
    }

    const txResult = await transfer(selectedNotes, outputs, undefined, walletPublicKey ?? undefined);

    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount('');
      setRecipientPubkey('');
    } else if (error) {
      onError?.(error);
    }
  };

  const isDisabled = !isConnected || !isInitialized || isTransferring || !amount || !recipientPubkey;

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Private Transfer</h3>
      <p style={styles.cardDescription}>
        Send tokens privately. Only the recipient can decrypt the note.
      </p>

      <div style={{ marginBottom: '16px', ...styles.spaceBetween }}>
        <span style={{ fontSize: '0.875rem', color: colors.textMuted }}>Available Balance</span>
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
              disabled={isTransferring}
            />
          </label>
        )}

        <label style={styles.label}>
          Recipient Stealth Public Key
          <textarea
            value={recipientPubkey}
            onChange={(e) => setRecipientPubkey(e.target.value)}
            placeholder="Paste the recipient's stealth public key from their Account tab (128 hex characters)"
            disabled={isTransferring}
            style={{...styles.textarea, minHeight: '80px'}}
          />
          <span style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '4px' }}>
            Find this in the recipient's Account tab under "Stealth Public Key"
          </span>
        </label>

        <label style={styles.label}>
          Amount ({symbol})
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            disabled={isTransferring}
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
            : isTransferring
            ? 'Transferring...'
            : 'Send Private Transfer'}
        </button>

        {error && <div style={styles.errorText}>{error}</div>}

        {result && (
          <div style={styles.successBox}>
            <div style={styles.successText}>Transfer sent successfully!</div>
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
      {tokens.map(token => (
        <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
          {token.symbol}
        </option>
      ))}
    </select>
  );
}
