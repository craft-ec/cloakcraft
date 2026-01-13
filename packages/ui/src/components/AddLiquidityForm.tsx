/**
 * Add Liquidity form component
 *
 * Add liquidity to an AMM pool and receive LP tokens
 */

import React, { useState, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useNoteSelector, useWallet, useCloakCraft } from '@cloakcraft/hooks';
import { generateStealthAddress, calculateAddLiquidityAmounts } from '@cloakcraft/sdk';
import { styles, colors } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface AddLiquidityFormProps {
  tokens: TokenInfo[];
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
  className?: string;
  walletPublicKey?: PublicKey | null;
}

export function AddLiquidityForm({
  tokens,
  onSuccess,
  onError,
  className,
  walletPublicKey,
}: AddLiquidityFormProps) {
  const [tokenA, setTokenA] = useState(tokens[0]);
  const [tokenB, setTokenB] = useState(tokens[1] || tokens[0]);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const { isConnected, isInitialized, wallet } = useWallet();
  const { client } = useCloakCraft();
  const { availableNotes: notesA, totalAvailable: totalA, selectNotesForAmount: selectA } = useNoteSelector(tokenA.mint);
  const { availableNotes: notesB, totalAvailable: totalB, selectNotesForAmount: selectB } = useNoteSelector(tokenB.mint);

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

  const liquidityQuote = useMemo(() => {
    const amountANum = parseFloat(amountA);
    const amountBNum = parseFloat(amountB);

    if (isNaN(amountANum) || amountANum <= 0 || isNaN(amountBNum) || amountBNum <= 0) {
      return null;
    }

    const desiredA = BigInt(Math.floor(amountANum * 10 ** tokenA.decimals));
    const desiredB = BigInt(Math.floor(amountBNum * 10 ** tokenB.decimals));

    try {
      const { depositA, depositB, lpAmount } = calculateAddLiquidityAmounts(
        desiredA,
        desiredB,
        mockReserveA,
        mockReserveB,
        mockLpSupply
      );

      return {
        depositA,
        depositB,
        lpAmount,
        shareOfPool: Number(lpAmount * 10000n / (mockLpSupply + lpAmount)) / 100,
      };
    } catch (err) {
      return null;
    }
  }, [amountA, amountB, tokenA.decimals, tokenB.decimals, mockReserveA, mockReserveB, mockLpSupply]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountANum = parseFloat(amountA);
    const amountBNum = parseFloat(amountB);

    if (isNaN(amountANum) || amountANum <= 0 || isNaN(amountBNum) || amountBNum <= 0) {
      onError?.('Please enter valid amounts for both tokens');
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

    if (!liquidityQuote) {
      onError?.('Unable to calculate liquidity quote');
      return;
    }

    if (!wallet) {
      onError?.('Wallet not connected');
      return;
    }

    // Select notes
    let selectedNotesA, selectedNotesB;
    try {
      selectedNotesA = selectA(liquidityQuote.depositA);
      selectedNotesB = selectB(liquidityQuote.depositB);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Insufficient balance');
      return;
    }

    if (selectedNotesA.length !== 1 || selectedNotesB.length !== 1) {
      onError?.('Add liquidity requires exactly 1 note per token. Please consolidate notes first.');
      return;
    }

    setIsAdding(true);

    try {
      // TODO: Implement addLiquidity method in client
      // const { stealthAddress: lpAddress } = generateStealthAddress(wallet.publicKey);
      // const { stealthAddress: changeAAddress } = generateStealthAddress(wallet.publicKey);
      // const { stealthAddress: changeBAddress } = generateStealthAddress(wallet.publicKey);

      // const result = await client.addLiquidity({
      //   inputA: selectedNotesA[0],
      //   inputB: selectedNotesB[0],
      //   poolId: ...,
      //   depositA: liquidityQuote.depositA,
      //   depositB: liquidityQuote.depositB,
      //   lpRecipient: lpAddress,
      //   changeARecipient: changeAAddress,
      //   changeBRecipient: changeBAddress,
      // }, relayer);

      onError?.('Add liquidity functionality not yet implemented');
      // onSuccess?.(result.signature);
      // setAmountA('');
      // setAmountB('');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Add liquidity failed');
    } finally {
      setIsAdding(false);
    }
  };

  const isDisabled = !isConnected || !isInitialized || isAdding || !amountA || !amountB || !liquidityQuote;

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Add Liquidity</h3>
      <p style={styles.cardDescription}>
        Provide liquidity to earn fees from swaps
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Token A */}
        <div>
          <label style={styles.label}>Token A</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <select
              value={tokenA.mint.toBase58()}
              onChange={(e) => {
                const token = tokens.find(t => t.mint.toBase58() === e.target.value);
                if (token) setTokenA(token);
              }}
              disabled={isAdding}
              style={{ ...styles.input, flex: 1 }}
            >
              {tokens.map(token => (
                <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            value={amountA}
            onChange={(e) => setAmountA(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            disabled={isAdding}
            style={styles.input}
          />

          <div style={{ ...styles.spaceBetween, marginTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>Available</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {formatAmount(totalA, tokenA.decimals)} {tokenA.symbol}
            </span>
          </div>
        </div>

        {/* Plus Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          <div
            style={{
              background: colors.backgroundMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '8px',
              color: colors.text,
            }}
          >
            +
          </div>
        </div>

        {/* Token B */}
        <div>
          <label style={styles.label}>Token B</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <select
              value={tokenB.mint.toBase58()}
              onChange={(e) => {
                const token = tokens.find(t => t.mint.toBase58() === e.target.value);
                if (token) setTokenB(token);
              }}
              disabled={isAdding}
              style={{ ...styles.input, flex: 1 }}
            >
              {tokens.map(token => (
                <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>

          <input
            type="number"
            value={amountB}
            onChange={(e) => setAmountB(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            disabled={isAdding}
            style={styles.input}
          />

          <div style={{ ...styles.spaceBetween, marginTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>Available</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {formatAmount(totalB, tokenB.decimals)} {tokenB.symbol}
            </span>
          </div>
        </div>

        {/* Liquidity Quote */}
        {liquidityQuote && (
          <div style={{
            background: colors.backgroundMuted,
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.875rem',
          }}>
            <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted }}>Actual Deposit A</span>
              <span>{formatAmount(liquidityQuote.depositA, tokenA.decimals)} {tokenA.symbol}</span>
            </div>
            <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted }}>Actual Deposit B</span>
              <span>{formatAmount(liquidityQuote.depositB, tokenB.decimals)} {tokenB.symbol}</span>
            </div>
            <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted }}>LP Tokens</span>
              <span>{formatAmount(liquidityQuote.lpAmount, 9)}</span>
            </div>
            <div style={styles.spaceBetween}>
              <span style={{ color: colors.textMuted }}>Share of Pool</span>
              <span>{liquidityQuote.shareOfPool.toFixed(2)}%</span>
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
            : isAdding
            ? 'Adding Liquidity...'
            : 'Add Liquidity'}
        </button>

        {liquidityQuote && (liquidityQuote.depositA !== BigInt(Math.floor(parseFloat(amountA) * 10 ** tokenA.decimals)) ||
                            liquidityQuote.depositB !== BigInt(Math.floor(parseFloat(amountB) * 10 ** tokenB.decimals))) && (
          <div style={{ ...styles.errorText, background: colors.backgroundMuted, padding: '12px', borderRadius: '8px', color: colors.textMuted }}>
            Note: Amounts will be adjusted to match pool ratio
          </div>
        )}
      </form>
    </div>
  );
}
