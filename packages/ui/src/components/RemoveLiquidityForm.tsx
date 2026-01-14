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
import { keccak_256 } from '@noble/hashes/sha3';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface RemoveLiquidityFormProps {
  tokens: TokenInfo[];
  ammPools: any[]; // AMM pool data
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
  className?: string;
  walletPublicKey?: PublicKey | null;
}

export function RemoveLiquidityForm({
  tokens,
  ammPools,
  onSuccess,
  onError,
  className,
  walletPublicKey,
}: RemoveLiquidityFormProps) {
  const [selectedPool, setSelectedPool] = useState(ammPools[0]);
  const [lpAmount, setLpAmount] = useState('');
  const [exactLpAmount, setExactLpAmount] = useState<bigint | null>(null); // Track exact amount for MAX
  const [isRemoving, setIsRemoving] = useState(false);

  const { isConnected, isInitialized, wallet } = useWallet();
  const { client } = useCloakCraft();

  // Get LP token mint from selected pool
  const lpTokenMint = selectedPool?.lpMint;
  const { availableNotes: lpNotes, totalAvailable: totalLp, selectNotesForAmount: selectLp } = useNoteSelector(lpTokenMint);

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

  const formatAmount = (value: bigint, decimals: number) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 8)}`;
  };

  const withdrawQuote = useMemo(() => {
    if (!selectedPool) return null;

    // Use exact amount if available (from MAX button), otherwise parse input
    let lpAmountLamports: bigint;
    if (exactLpAmount !== null) {
      lpAmountLamports = exactLpAmount;
    } else {
      const lpAmountNum = parseFloat(lpAmount);
      if (isNaN(lpAmountNum) || lpAmountNum <= 0) {
        return null;
      }
      lpAmountLamports = BigInt(Math.floor(lpAmountNum * 10 ** 9)); // LP tokens have 9 decimals
    }

    try {
      const { outputA, outputB } = calculateRemoveLiquidityOutput(
        lpAmountLamports,
        selectedPool.lpSupply,
        selectedPool.reserveA,
        selectedPool.reserveB
      );

      // Calculate share of pool as percentage
      const shareOfPool = Number((lpAmountLamports * 10000n) / selectedPool.lpSupply) / 100;

      return {
        outputA,
        outputB,
        shareOfPool,
        lpAmountLamports, // Include exact amount in quote
      };
    } catch (err) {
      return null;
    }
  }, [lpAmount, exactLpAmount, selectedPool]);

  const handleSetMaxLp = () => {
    const maxLp = formatAmount(totalLp, 9);
    setLpAmount(maxLp);
    setExactLpAmount(totalLp); // Store exact bigint for precision
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPool) {
      onError?.('Please select a pool');
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

    // Use exact amount from withdrawQuote (handles both MAX and manual entry)
    const lpAmountLamports = withdrawQuote.lpAmountLamports;

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
      // Generate stealth addresses for outputs
      const { stealthAddress: outputAAddress } = generateStealthAddress(wallet.publicKey);
      const { stealthAddress: outputBAddress } = generateStealthAddress(wallet.publicKey);

      // Get merkle proof for LP token input note
      if (!selectedLpNotes[0].accountHash) {
        throw new Error('LP note missing accountHash. Try rescanning notes.');
      }

      const merkleProof = await client.getMerkleProof(selectedLpNotes[0].accountHash);

      // Compute pool state hashes (matches Rust: reserve_a || reserve_b || lp_supply || pool_id)
      const computePoolStateHash = (reserveA: bigint, reserveB: bigint, lpSupply: bigint, poolAddress: PublicKey): Uint8Array => {
        // Each reserve/supply is u64 (8 bytes), pool_id is 32 bytes
        const data = new Uint8Array(8 + 8 + 8 + 32); // Total: 56 bytes

        // Helper: Convert bigint to little-endian u64 (8 bytes)
        const bigintToLE = (value: bigint, offset: number) => {
          let v = value;
          for (let i = 0; i < 8; i++) {
            data[offset + i] = Number(v & 0xFFn);
            v = v >> 8n;
          }
        };

        // Convert bigints to little-endian bytes
        bigintToLE(reserveA, 0);
        bigintToLE(reserveB, 8);
        bigintToLE(lpSupply, 16);

        // Pool ID as 32 bytes (use account address)
        data.set(poolAddress.toBytes(), 24);

        // Use keccak256
        return keccak_256(data);
      };

      // Current pool state hash (use account address, not poolId field)
      const oldPoolStateHash = computePoolStateHash(
        selectedPool.reserveA,
        selectedPool.reserveB,
        selectedPool.lpSupply,
        selectedPool.address
      );

      // Calculate new state after removal
      const newReserveA = selectedPool.reserveA - withdrawQuote.outputA;
      const newReserveB = selectedPool.reserveB - withdrawQuote.outputB;
      const newLpSupply = selectedPool.lpSupply - lpAmountLamports;

      const newPoolStateHash = computePoolStateHash(
        newReserveA,
        newReserveB,
        newLpSupply,
        selectedPool.address
      );

      const result = await client.removeLiquidity({
        lpInput: selectedLpNotes[0],
        poolId: selectedPool.address, // Use account address, not stored poolId field
        lpAmount: lpAmountLamports,
        tokenAMint: tokenA.mint,
        tokenBMint: tokenB.mint,
        oldPoolStateHash,
        newPoolStateHash,
        outputARecipient: outputAAddress,
        outputBRecipient: outputBAddress,
        merklePath: merkleProof.pathElements,
        merklePathIndices: merkleProof.pathIndices,
        outputAAmount: withdrawQuote.outputA,
        outputBAmount: withdrawQuote.outputB,
      });

      onSuccess?.(result.signature);
      setLpAmount('');
      setExactLpAmount(null);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Remove liquidity failed');
    } finally {
      setIsRemoving(false);
    }
  };

  const isDisabled = !isConnected || !isInitialized || isRemoving || !lpAmount || !withdrawQuote || ammPools.length === 0;

  if (ammPools.length === 0) {
    return (
      <div className={className} style={styles.card}>
        <h3 style={styles.cardTitle}>Remove Liquidity</h3>
        <p style={{ ...styles.cardDescription, marginTop: '16px', color: colors.textMuted }}>
          No AMM pools available. Add liquidity to a pool first.
        </p>
      </div>
    );
  }

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Remove Liquidity</h3>
      <p style={styles.cardDescription}>
        Withdraw your liquidity by burning LP tokens
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Pool Selection */}
        <div>
          <label style={styles.label}>Select Pool</label>
          <select
            value={selectedPool?.address.toBase58() || ''}
            onChange={(e) => {
              const pool = ammPools.find(p => p.address.toBase58() === e.target.value);
              if (pool) {
                setSelectedPool(pool);
                setLpAmount('');
              }
            }}
            disabled={isRemoving}
            style={styles.input}
          >
            {ammPools.map(pool => {
              const tA = tokens.find(t => t.mint.equals(pool.tokenAMint));
              const tB = tokens.find(t => t.mint.equals(pool.tokenBMint));
              const symbolA = tA?.symbol || pool.tokenAMint.toBase58().slice(0, 6) + '...';
              const symbolB = tB?.symbol || pool.tokenBMint.toBase58().slice(0, 6) + '...';
              return (
                <option key={pool.address.toBase58()} value={pool.address.toBase58()}>
                  {symbolA} / {symbolB}
                </option>
              );
            })}
          </select>

          {/* Pool Details */}
          {selectedPool && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: colors.backgroundMuted,
              borderRadius: '8px',
              fontSize: '0.875rem',
            }}>
              <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
                <span style={{ color: colors.textMuted }}>Reserve {tokenA.symbol}</span>
                <span>{formatAmount(selectedPool.reserveA, tokenA.decimals)} {tokenA.symbol}</span>
              </div>
              <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
                <span style={{ color: colors.textMuted }}>Reserve {tokenB.symbol}</span>
                <span>{formatAmount(selectedPool.reserveB, tokenB.decimals)} {tokenB.symbol}</span>
              </div>
              <div style={styles.spaceBetween}>
                <span style={{ color: colors.textMuted }}>Total LP Supply</span>
                <span>{formatAmount(selectedPool.lpSupply, 9)} LP</span>
              </div>
            </div>
          )}
        </div>

        {/* LP Amount */}
        <div>
          <label style={styles.label}>LP Tokens to Burn</label>
          <input
            type="number"
            value={lpAmount}
            onChange={(e) => {
              setLpAmount(e.target.value);
              setExactLpAmount(null); // Clear exact amount when user manually types
            }}
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
