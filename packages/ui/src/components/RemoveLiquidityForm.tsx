/**
 * Remove Liquidity form component
 *
 * Burn LP tokens to withdraw liquidity from AMM pool
 */

import React, { useState, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useNoteSelector, useWallet, useCloakCraft } from '@cloakcraft/hooks';
import { generateStealthAddress, calculateRemoveLiquidityOutput } from '@cloakcraft/sdk';
import { styles, colors } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface RemoveLiquidityFormProps {
  tokens: TokenInfo[];
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
  className?: string;
  walletPublicKey?: PublicKey | null;
}

export function RemoveLiquidityForm({
  tokens,
  onSuccess,
  onError,
  className,
  walletPublicKey,
}: RemoveLiquidityFormProps) {
  const [tokenA, setTokenA] = useState(tokens[0]);
  const [tokenB, setTokenB] = useState(tokens[1] || tokens[0]);
  const [lpAmount, setLpAmount] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  const { isConnected, isInitialized, wallet } = useWallet();
  const { client } = useCloakCraft();

  // TODO: Fetch LP token mint for the selected pool
  // For now, using a placeholder
  const lpTokenMint = tokenA.mint;
  const { availableNotes: lpNotes, totalAvailable: totalLp, selectNotesForAmount: selectLp } = useNoteSelector(lpTokenMint);

  // Mock pool state (TODO: fetch from on-chain)
  const mockReserveA = 1000000n * BigInt(10 ** tokenA.decimals);
  const mockReserveB = 1000000n * BigInt(10 ** tokenB.decimals);
  const mockLpSupply = 1000000n * 1000000000n; // 1M LP tokens with 9 decimals

  const formatAmount = (value: bigint, decimals: number) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 4)}`;
  };

  const withdrawQuote = useMemo(() => {
    const lpAmountNum = parseFloat(lpAmount);

    if (isNaN(lpAmountNum) || lpAmountNum <= 0) {
      return null;
    }

    const lpAmountLamports = BigInt(Math.floor(lpAmountNum * 10 ** 9)); // LP tokens have 9 decimals

    try {
      const { outputA, outputB } = calculateRemoveLiquidityOutput(
        lpAmountLamports,
        mockLpSupply,
        mockReserveA,
        mockReserveB
      );

      return {
        outputA,
        outputB,
        shareOfPool: Number(lpAmountLamports * 10000n / mockLpSupply) / 100,
      };
    } catch (err) {
      return null;
    }
  }, [lpAmount, mockLpSupply, mockReserveA, mockReserveB]);

  const handleSetMaxLp = () => {
    const maxLp = formatAmount(totalLp, 9);
    setLpAmount(maxLp);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const lpAmountNum = parseFloat(lpAmount);

    if (isNaN(lpAmountNum) || lpAmountNum <= 0) {
      onError?.('Please enter a valid LP token amount');
      return;
    }

    if (tokenA.mint.equals(tokenB.mint)) {
      onError?.('Token A and Token B must be different');
      return;
    }

    if (!client?.getProgram()) {
      onError?.('Program not configured. Call setProgram() first.');
      return;
    }

    if (!withdrawQuote) {
      onError?.('Unable to calculate withdraw quote');
      return;
    }

    if (!wallet) {
      onError?.('Wallet not connected');
      return;
    }

    const lpAmountLamports = BigInt(Math.floor(lpAmountNum * 10 ** 9));

    // Select LP notes
    let selectedLpNotes;
    try {
      selectedLpNotes = selectLp(lpAmountLamports);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Insufficient LP balance');
      return;
    }

    if (selectedLpNotes.length !== 1) {
      onError?.('Remove liquidity requires exactly 1 LP note. Please consolidate notes first.');
      return;
    }

    setIsRemoving(true);

    try {
      // TODO: Implement removeLiquidity method in client
      // const { stealthAddress: outputAAddress } = generateStealthAddress(wallet.publicKey);
      // const { stealthAddress: outputBAddress } = generateStealthAddress(wallet.publicKey);

      // const result = await client.removeLiquidity({
      //   lpInput: selectedLpNotes[0],
      //   poolId: ...,
      //   lpAmount: lpAmountLamports,
      //   outputARecipient: outputAAddress,
      //   outputBRecipient: outputBAddress,
      // }, relayer);

      onError?.('Remove liquidity functionality not yet implemented');
      // onSuccess?.(result.signature);
      // setLpAmount('');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Remove liquidity failed');
    } finally {
      setIsRemoving(false);
    }
  };

  const isDisabled = !isConnected || !isInitialized || isRemoving || !lpAmount || !withdrawQuote;

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Remove Liquidity</h3>
      <p style={styles.cardDescription}>
        Withdraw your liquidity by burning LP tokens
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Pool Selection */}
        <div>
          <label style={styles.label}>Pool</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <select
              value={tokenA.mint.toBase58()}
              onChange={(e) => {
                const token = tokens.find(t => t.mint.toBase58() === e.target.value);
                if (token) setTokenA(token);
              }}
              disabled={isRemoving}
              style={{ ...styles.input, flex: 1 }}
            >
              {tokens.map(token => (
                <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                  {token.symbol}
                </option>
              ))}
            </select>
            <span style={{ padding: '12px 0', color: colors.textMuted }}>-</span>
            <select
              value={tokenB.mint.toBase58()}
              onChange={(e) => {
                const token = tokens.find(t => t.mint.toBase58() === e.target.value);
                if (token) setTokenB(token);
              }}
              disabled={isRemoving}
              style={{ ...styles.input, flex: 1 }}
            >
              {tokens.map(token => (
                <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* LP Amount */}
        <div>
          <label style={styles.label}>LP Tokens to Burn</label>
          <input
            type="number"
            value={lpAmount}
            onChange={(e) => setLpAmount(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            disabled={isRemoving}
            style={styles.input}
          />

          <div style={{ ...styles.spaceBetween, marginTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>Available LP</span>
            <button
              type="button"
              onClick={handleSetMaxLp}
              disabled={isRemoving}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                color: colors.primary,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {formatAmount(totalLp, 9)} LP (MAX)
            </button>
          </div>
        </div>

        {/* Withdraw Quote */}
        {withdrawQuote && (
          <div style={{
            background: colors.backgroundMuted,
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.875rem',
          }}>
            <div style={{ marginBottom: '12px', fontWeight: 600, color: colors.text }}>
              You will receive:
            </div>
            <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted }}>{tokenA.symbol}</span>
              <span>{formatAmount(withdrawQuote.outputA, tokenA.decimals)} {tokenA.symbol}</span>
            </div>
            <div style={{ ...styles.spaceBetween, marginBottom: '12px' }}>
              <span style={{ color: colors.textMuted }}>{tokenB.symbol}</span>
              <span>{formatAmount(withdrawQuote.outputB, tokenB.decimals)} {tokenB.symbol}</span>
            </div>
            <div style={styles.spaceBetween}>
              <span style={{ color: colors.textMuted }}>Your Share</span>
              <span>{withdrawQuote.shareOfPool.toFixed(2)}% of pool</span>
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
          {!isConnected
            ? 'Connect Wallet'
            : !isInitialized
            ? 'Initializing...'
            : isRemoving
            ? 'Removing Liquidity...'
            : 'Remove Liquidity'}
        </button>
      </form>
    </div>
  );
}
