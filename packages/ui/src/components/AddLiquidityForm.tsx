/**
 * Add Liquidity form component
 *
 * Add liquidity to an AMM pool and receive LP tokens
 */

import React, { useState, useMemo, useEffect } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useNoteSelector, useWallet, useCloakCraft } from '@cloakcraft/hooks';
import { generateStealthAddress, calculateAddLiquidityAmounts } from '@cloakcraft/sdk';
import { styles, colors } from '../styles';
import { AmmPoolDetails } from './AmmPoolDetails';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface AddLiquidityFormProps {
  tokens: TokenInfo[];
  ammPools: any[]; // AMM pool data
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
  className?: string;
  walletPublicKey?: PublicKey | null;
}

export function AddLiquidityForm({
  tokens,
  ammPools,
  onSuccess,
  onError,
  className,
  walletPublicKey,
}: AddLiquidityFormProps) {
  const [selectedPool, setSelectedPool] = useState(ammPools[0]);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [lastEditedField, setLastEditedField] = useState<'A' | 'B' | null>(null);
  const [slippageBps, setSlippageBps] = useState(100); // 1% default for liquidity (higher than swap due to MEV)
  const [isAdding, setIsAdding] = useState(false);

  const { isConnected, isInitialized, wallet } = useWallet();
  const { client } = useCloakCraft();

  // Get token info for the selected pool
  const tokenA = useMemo(() => {
    if (!selectedPool) return tokens[0];
    return tokens.find(t => t.mint.equals(selectedPool.tokenAMint)) || {
      mint: selectedPool.tokenAMint,
      symbol: selectedPool.tokenAMint.toBase58().slice(0, 8) + '...',
      name: selectedPool.tokenAMint.toBase58(),
      decimals: 9,
    };
  }, [selectedPool, tokens]);

  const tokenB = useMemo(() => {
    if (!selectedPool) return tokens[1] || tokens[0];
    return tokens.find(t => t.mint.equals(selectedPool.tokenBMint)) || {
      mint: selectedPool.tokenBMint,
      symbol: selectedPool.tokenBMint.toBase58().slice(0, 8) + '...',
      name: selectedPool.tokenBMint.toBase58(),
      decimals: 9,
    };
  }, [selectedPool, tokens]);

  const { availableNotes: notesA, totalAvailable: totalA, selectNotesForAmount: selectA } = useNoteSelector(tokenA.mint);
  const { availableNotes: notesB, totalAvailable: totalB, selectNotesForAmount: selectB } = useNoteSelector(tokenB.mint);

  const formatAmount = (value: bigint, decimals: number) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 8)}`;
  };

  // Auto-calculate the other amount when one field is edited
  // Skip for empty pools (initial liquidity) - let user set both amounts freely
  useEffect(() => {
    if (!selectedPool) return;

    // Check if pool is empty (initial liquidity)
    const isEmptyPool = selectedPool.reserveA === 0n || selectedPool.reserveB === 0n;

    // For empty pools, don't auto-calculate - let user set initial price ratio
    if (isEmptyPool) return;

    if (lastEditedField === 'A' && amountA) {
      const amountANum = parseFloat(amountA);
      if (!isNaN(amountANum) && amountANum > 0) {
        // Calculate B based on pool ratio: B = A * (reserveB / reserveA)
        const amountALamports = BigInt(Math.floor(amountANum * 10 ** tokenA.decimals));
        const calculatedBLamports = (amountALamports * selectedPool.reserveB) / selectedPool.reserveA;
        const calculatedB = Number(calculatedBLamports) / (10 ** tokenB.decimals);
        setAmountB(calculatedB.toFixed(Math.min(6, tokenB.decimals)));
      }
    } else if (lastEditedField === 'B' && amountB) {
      const amountBNum = parseFloat(amountB);
      if (!isNaN(amountBNum) && amountBNum > 0) {
        // Calculate A based on pool ratio: A = B * (reserveA / reserveB)
        const amountBLamports = BigInt(Math.floor(amountBNum * 10 ** tokenB.decimals));
        const calculatedALamports = (amountBLamports * selectedPool.reserveA) / selectedPool.reserveB;
        const calculatedA = Number(calculatedALamports) / (10 ** tokenA.decimals);
        setAmountA(calculatedA.toFixed(Math.min(6, tokenA.decimals)));
      }
    }
  }, [lastEditedField, amountA, amountB, selectedPool, tokenA.decimals, tokenB.decimals]);

  const liquidityQuote = useMemo(() => {
    if (!selectedPool) return null;

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
        selectedPool.reserveA,
        selectedPool.reserveB,
        selectedPool.lpSupply
      );

      // Calculate minimum LP amount with slippage protection
      const minLpAmount = (lpAmount * (10000n - BigInt(slippageBps))) / 10000n;

      return {
        depositA,
        depositB,
        lpAmount,
        minLpAmount,
        shareOfPool: Number(lpAmount * 10000n / (selectedPool.lpSupply + lpAmount)) / 100,
      };
    } catch (err) {
      return null;
    }
  }, [amountA, amountB, tokenA.decimals, tokenB.decimals, selectedPool, slippageBps]);

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
      // Generate stealth addresses for outputs
      const { stealthAddress: lpAddress } = generateStealthAddress(wallet.publicKey);
      const { stealthAddress: changeAAddress } = generateStealthAddress(wallet.publicKey);
      const { stealthAddress: changeBAddress } = generateStealthAddress(wallet.publicKey);

      // Call the SDK's addLiquidity method
      const result = await client.addLiquidity({
        inputA: selectedNotesA[0],
        inputB: selectedNotesB[0],
        poolId: selectedPool.address, // Use account address, not stored poolId field
        lpMint: selectedPool.lpMint,
        depositA: liquidityQuote.depositA,
        depositB: liquidityQuote.depositB,
        lpAmount: liquidityQuote.lpAmount,
        minLpAmount: liquidityQuote.minLpAmount,
        lpRecipient: lpAddress,
        changeARecipient: changeAAddress,
        changeBRecipient: changeBAddress,
      });

      onSuccess?.(result.signature);
      setAmountA('');
      setAmountB('');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Add liquidity failed');
    } finally {
      setIsAdding(false);
    }
  };

  const isDisabled = !isConnected || !isInitialized || isAdding || !amountA || !amountB || !liquidityQuote;

  if (ammPools.length === 0) {
    return (
      <div className={className} style={styles.card}>
        <h3 style={styles.cardTitle}>Add Liquidity</h3>
        <p style={styles.cardDescription}>
          Provide liquidity to earn fees from swaps
        </p>
        <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted }}>
          No AMM pools available. Create a pool first.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={className} style={styles.card}>
        <h3 style={styles.cardTitle}>Add Liquidity</h3>
        <p style={styles.cardDescription}>
          Provide liquidity to earn fees from swaps
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Pool Selection */}
          <div>
            <label style={styles.label}>Select Pool</label>
            <select
              value={selectedPool?.poolId.toBase58() || ''}
              onChange={(e) => {
                const pool = ammPools.find(p => p.poolId.toBase58() === e.target.value);
                if (pool) {
                  setSelectedPool(pool);
                  setAmountA('');
                  setAmountB('');
                  setLastEditedField(null);
                }
              }}
              disabled={isAdding}
              style={styles.input}
            >
              {ammPools.map(pool => {
                const tA = tokens.find(t => t.mint.equals(pool.tokenAMint));
                const tB = tokens.find(t => t.mint.equals(pool.tokenBMint));
                const symbolA = tA?.symbol || pool.tokenAMint.toBase58().slice(0, 6) + '...';
                const symbolB = tB?.symbol || pool.tokenBMint.toBase58().slice(0, 6) + '...';
                return (
                  <option key={pool.poolId.toBase58()} value={pool.poolId.toBase58()}>
                    {symbolA} / {symbolB}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Token A Amount */}
          <div>
            <label style={styles.label}>{tokenA.symbol}</label>
            <input
              type="number"
              value={amountA}
              onChange={(e) => {
                setAmountA(e.target.value);
                setLastEditedField('A');
              }}
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

          {/* Token B Amount */}
          <div>
            <label style={styles.label}>{tokenB.symbol}</label>
            <input
              type="number"
              value={amountB}
              onChange={(e) => {
                setAmountB(e.target.value);
                setLastEditedField('B');
              }}
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

        {/* Empty Pool Notice */}
        {selectedPool && (selectedPool.reserveA === 0n || selectedPool.reserveB === 0n) && (
          <div style={{
            background: colors.backgroundMuted,
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.875rem',
            color: colors.textMuted,
            border: `1px solid ${colors.border}`,
          }}>
            <strong style={{ color: colors.text }}>Initial Liquidity</strong>
            <div style={{ marginTop: '4px' }}>
              You're adding the first liquidity to this pool. The ratio you provide will set the initial price.
            </div>
          </div>
        )}

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
            <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted }}>Minimum LP Tokens</span>
              <span>{formatAmount(liquidityQuote.minLpAmount, 9)}</span>
            </div>
            <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted }}>Share of Pool</span>
              <span>{liquidityQuote.shareOfPool.toFixed(2)}%</span>
            </div>
            <div style={styles.spaceBetween}>
              <span style={{ color: colors.textMuted }}>Slippage Tolerance</span>
              <span>{(slippageBps / 100).toFixed(2)}%</span>
            </div>
          </div>
        )}

        {/* Slippage Settings */}
        <div>
          <label style={styles.label}>
            Slippage Tolerance (%)
            <input
              type="number"
              value={slippageBps / 100}
              onChange={(e) => setSlippageBps(Math.floor(parseFloat(e.target.value || '0') * 100))}
              placeholder="1.0"
              step="0.1"
              min="0.1"
              max="50"
              disabled={isAdding}
              style={{ ...styles.input, marginTop: '8px' }}
            />
          </label>
        </div>

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

      {/* AMM Pool Details */}
      {selectedPool && (
        <AmmPoolDetails
          tokenA={tokenA}
          tokenB={tokenB}
          pool={selectedPool}
          className={className}
        />
      )}
    </>
  );
}
