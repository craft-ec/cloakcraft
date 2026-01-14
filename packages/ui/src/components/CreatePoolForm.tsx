/**
 * Create AMM Pool form component
 *
 * Initialize a new liquidity pool for a token pair
 */

import React, { useState } from 'react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { useCloakCraft } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface CreatePoolFormProps {
  tokens: TokenInfo[];
  onSuccess?: (signature: string, tokenA: TokenInfo, tokenB: TokenInfo) => void;
  onError?: (error: string) => void;
  className?: string;
  /** Wallet public key for transaction signing */
  walletPublicKey?: PublicKey | null;
}

export function CreatePoolForm({
  tokens,
  onSuccess,
  onError,
  className,
  walletPublicKey,
}: CreatePoolFormProps) {
  const [tokenAMint, setTokenAMint] = useState<string>('');
  const [tokenBMint, setTokenBMint] = useState<string>('');
  const [feeBps, setFeeBps] = useState<string>('30'); // 0.3% default
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const { client } = useCloakCraft();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    // Validate inputs
    if (!tokenAMint || !tokenBMint) {
      const err = 'Please select both tokens';
      setError(err);
      onError?.(err);
      return;
    }

    if (tokenAMint === tokenBMint) {
      const err = 'Cannot create pool with the same token';
      setError(err);
      onError?.(err);
      return;
    }

    const feeNum = parseFloat(feeBps);
    if (isNaN(feeNum) || feeNum < 0 || feeNum > 10000) {
      const err = 'Fee must be between 0 and 10000 basis points';
      setError(err);
      onError?.(err);
      return;
    }

    if (!client?.getProgram()) {
      const err = 'Program not configured. Call setProgram() first.';
      setError(err);
      onError?.(err);
      return;
    }

    if (!walletPublicKey) {
      const err = 'Wallet not connected';
      setError(err);
      onError?.(err);
      return;
    }

    setIsCreating(true);

    try {
      const tokenA = new PublicKey(tokenAMint);
      const tokenB = new PublicKey(tokenBMint);

      // Generate new LP mint keypair
      const lpMintKeypair = Keypair.generate();

      // Create a dummy keypair for payer - the actual signing will be done by wallet adapter
      // through the Anchor provider
      const dummyPayer = Keypair.generate();
      // Override public key to match connected wallet
      Object.defineProperty(dummyPayer, 'publicKey', {
        value: walletPublicKey,
        writable: false,
      });

      const signature = await client.initializeAmmPool(
        tokenA,
        tokenB,
        lpMintKeypair,
        Math.floor(feeNum),
        dummyPayer
      );

      setResult(signature);
      const selectedTokenA = tokens.find(t => t.mint.equals(tokenA));
      const selectedTokenB = tokens.find(t => t.mint.equals(tokenB));

      if (selectedTokenA && selectedTokenB) {
        onSuccess?.(signature, selectedTokenA, selectedTokenB);
      }

      // Reset form
      setTokenAMint('');
      setTokenBMint('');
      setFeeBps('30');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create pool';
      setError(message);
      onError?.(message);
    } finally {
      setIsCreating(false);
    }
  };

  const selectedTokenA = tokens.find(t => t.mint.toBase58() === tokenAMint);
  const selectedTokenB = tokens.find(t => t.mint.toBase58() === tokenBMint);

  const isDisabled = isCreating || !tokenAMint || !tokenBMint || !walletPublicKey;

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Create Liquidity Pool</h3>
      <p style={styles.cardDescription}>
        Initialize a new AMM pool for a token pair. You'll need to add initial
        liquidity after creating the pool.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>
          Token A
          <select
            value={tokenAMint}
            onChange={(e) => setTokenAMint(e.target.value)}
            disabled={isCreating}
            style={styles.input}
          >
            <option value="">Select token...</option>
            {tokens.map((token) => (
              <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                {token.symbol} - {token.name}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          Token B
          <select
            value={tokenBMint}
            onChange={(e) => setTokenBMint(e.target.value)}
            disabled={isCreating}
            style={styles.input}
          >
            <option value="">Select token...</option>
            {tokens
              .filter((token) => token.mint.toBase58() !== tokenAMint)
              .map((token) => (
                <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                  {token.symbol} - {token.name}
                </option>
              ))}
          </select>
        </label>

        <label style={styles.label}>
          Trading Fee (basis points)
          <input
            type="number"
            value={feeBps}
            onChange={(e) => setFeeBps(e.target.value)}
            placeholder="30"
            min="0"
            max="10000"
            step="1"
            disabled={isCreating}
            style={styles.input}
          />
          <span style={{ fontSize: '0.75rem', color: colors.textMuted, marginTop: '4px' }}>
            {feeBps ? `${parseFloat(feeBps) / 100}% trading fee` : 'Default: 0.3%'}
          </span>
        </label>

        {selectedTokenA && selectedTokenB && (
          <div style={styles.infoBox}>
            <div style={{ fontWeight: 600, marginBottom: '8px' }}>Pool Details</div>
            <div style={{ fontSize: '0.875rem' }}>
              <div>Pair: {selectedTokenA.symbol}/{selectedTokenB.symbol}</div>
              <div>Fee: {parseFloat(feeBps) / 100}%</div>
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
          {!walletPublicKey
            ? 'Connect Wallet'
            : isCreating
            ? 'Creating Pool...'
            : 'Create Pool'}
        </button>

        {error && <div style={styles.errorText}>{error}</div>}

        {result && (
          <div style={styles.successBox}>
            <div style={styles.successText}>Pool created successfully!</div>
            <div style={styles.txLink}>
              <a
                href={`https://explorer.solana.com/tx/${result}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.link}
              >
                View transaction
              </a>
            </div>
            <div style={{ fontSize: '0.875rem', marginTop: '12px' }}>
              Next: Add initial liquidity to activate the pool
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
