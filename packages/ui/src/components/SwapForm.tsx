/**
 * Swap form component
 *
 * Privacy-preserving token swap using AMM
 */

import React, { useState, useMemo } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useNoteSelector, useWallet, useCloakCraft } from '@cloakcraft/hooks';
import { generateStealthAddress, calculateSwapOutput, calculateMinOutput } from '@cloakcraft/sdk';
import { styles, colors } from '../styles';
import { AmmPoolDetails } from './AmmPoolDetails';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface SwapFormProps {
  tokens: TokenInfo[];
  ammPools: any[]; // AMM pool pairs
  onSuccess?: (signature: string) => void;
  onError?: (error: string) => void;
  className?: string;
  walletPublicKey?: PublicKey | null;
}

export function SwapForm({
  tokens,
  ammPools,
  onSuccess,
  onError,
  className,
  walletPublicKey,
}: SwapFormProps) {
  const { isConnected, isInitialized, wallet } = useWallet();
  const { client, notes } = useCloakCraft();

  // Filter tokens to only show those with available notes for "From" selector
  const tokensWithBalance = useMemo(() => {
    const notesByMint = new Map<string, bigint>();
    notes.forEach((note) => {
      const mintStr = note.tokenMint.toBase58();
      const current = notesByMint.get(mintStr) || BigInt(0);
      notesByMint.set(mintStr, current + note.amount);
    });

    return tokens.filter((token) => {
      const balance = notesByMint.get(token.mint.toBase58()) || BigInt(0);
      return balance > BigInt(0);
    });
  }, [tokens, notes]);

  const [inputToken, setInputToken] = useState(tokensWithBalance[0] || tokens[0]);
  const [inputAmount, setInputAmount] = useState('');
  const [slippageBps, setSlippageBps] = useState(50); // 0.5% default
  const [isSwapping, setIsSwapping] = useState(false);

  // Filter output tokens based on AMM pool pairing with input token
  const availableOutputTokens = useMemo(() => {
    if (!inputToken) return [];

    const inputMintStr = inputToken.mint.toBase58();
    const pairedMints = new Set<string>();

    // Find all tokens paired with inputToken in AMM pools
    ammPools.forEach((pool) => {
      const tokenAStr = pool.tokenAMint.toBase58();
      const tokenBStr = pool.tokenBMint.toBase58();

      if (tokenAStr === inputMintStr) {
        pairedMints.add(tokenBStr);
      } else if (tokenBStr === inputMintStr) {
        pairedMints.add(tokenAStr);
      }
    });

    // Filter tokens to only those paired with inputToken
    return tokens.filter((token) => pairedMints.has(token.mint.toBase58()));
  }, [inputToken, ammPools, tokens]);

  const [outputToken, setOutputToken] = useState(availableOutputTokens[0] || tokens[0]);

  // Find the AMM pool for the selected token pair
  const selectedAmmPool = useMemo(() => {
    if (!inputToken || !outputToken) return null;

    const inputMintStr = inputToken.mint.toBase58();
    const outputMintStr = outputToken.mint.toBase58();

    return ammPools.find((pool) => {
      const tokenAStr = pool.tokenAMint.toBase58();
      const tokenBStr = pool.tokenBMint.toBase58();

      return (
        (tokenAStr === inputMintStr && tokenBStr === outputMintStr) ||
        (tokenAStr === outputMintStr && tokenBStr === inputMintStr)
      );
    });
  }, [inputToken, outputToken, ammPools]);

  // Update output token when available outputs change
  React.useEffect(() => {
    if (availableOutputTokens.length > 0) {
      // If current output token is not in available list, select first available
      const isCurrentOutputAvailable = availableOutputTokens.some(
        (t) => outputToken && t.mint.equals(outputToken.mint)
      );
      if (!isCurrentOutputAvailable) {
        setOutputToken(availableOutputTokens[0]);
      }
    }
  }, [availableOutputTokens]);

  const { availableNotes, totalAvailable, selectNotesForAmount } = useNoteSelector(inputToken?.mint);

  // Mock pool reserves (TODO: fetch from on-chain pool state)
  const mockReserveIn = 1000000n * BigInt(10 ** inputToken.decimals);
  const mockReserveOut = 1000000n * BigInt(10 ** outputToken.decimals);

  const formatAmount = (value: bigint, decimals: number) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, '0').slice(0, 4)}`;
  };

  const swapQuote = useMemo(() => {
    if (!inputToken) return null;

    const amountNum = parseFloat(inputAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return null;
    }

    const amountLamports = BigInt(Math.floor(amountNum * 10 ** inputToken.decimals));

    try {
      const { outputAmount, priceImpact } = calculateSwapOutput(
        amountLamports,
        mockReserveIn,
        mockReserveOut,
        30 // 0.3% fee
      );

      const minOutput = calculateMinOutput(outputAmount, slippageBps);

      return {
        outputAmount,
        minOutput,
        priceImpact,
        priceRatio: Number(mockReserveOut) / Number(mockReserveIn),
      };
    } catch (err) {
      return null;
    }
  }, [inputAmount, inputToken, mockReserveIn, mockReserveOut, slippageBps]);

  const handleSwapTokens = () => {
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setInputAmount('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNum = parseFloat(inputAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onError?.('Please enter a valid amount');
      return;
    }

    if (inputToken.mint.equals(outputToken.mint)) {
      onError?.('Input and output tokens must be different');
      return;
    }

    const amountLamports = BigInt(Math.floor(amountNum * 10 ** inputToken.decimals));

    if (!client?.getProgram()) {
      onError?.('Program not configured. Call setProgram() first.');
      return;
    }

    if (!swapQuote) {
      onError?.('Unable to calculate swap quote');
      return;
    }

    // Select notes for swap
    let selectedNotes;
    try {
      selectedNotes = selectNotesForAmount(amountLamports);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Insufficient balance');
      return;
    }

    if (selectedNotes.length !== 1) {
      onError?.('Swap requires exactly 1 input note. Please consolidate notes first.');
      return;
    }

    // Generate stealth addresses for output and change
    if (!wallet) {
      onError?.('Wallet not connected');
      return;
    }

    const { stealthAddress: outputAddress } = generateStealthAddress(wallet.publicKey);
    const { stealthAddress: changeAddress } = generateStealthAddress(wallet.publicKey);

    setIsSwapping(true);

    try {
      // TODO: Implement swap method in client
      // const result = await client.swap({
      //   input: selectedNotes[0],
      //   poolId: ...,
      //   swapDirection: 'aToB',
      //   inputAmount: amountLamports,
      //   minOutput: swapQuote.minOutput,
      //   outputRecipient: outputAddress,
      //   changeRecipient: changeAddress,
      // }, relayer);

      onError?.('Swap functionality not yet implemented');
      // onSuccess?.(result.signature);
      // setInputAmount('');
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Swap failed');
    } finally {
      setIsSwapping(false);
    }
  };

  const isDisabled = !isConnected || !isInitialized || isSwapping || !inputAmount || !swapQuote || tokensWithBalance.length === 0;

  if (tokensWithBalance.length === 0) {
    return (
      <div className={className} style={styles.card}>
        <h3 style={styles.cardTitle}>Swap Tokens</h3>
        <p style={styles.cardDescription}>
          Exchange tokens privately using the AMM pool
        </p>
        <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted }}>
          No tokens available to swap. Shield some tokens first.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={className} style={styles.card}>
        <h3 style={styles.cardTitle}>Swap Tokens</h3>
        <p style={styles.cardDescription}>
          Exchange tokens privately using the AMM pool
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
        {/* Input Token */}
        <div>
          <label style={styles.label}>From</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <select
              value={inputToken?.mint.toBase58() || ''}
              onChange={(e) => {
                const token = tokensWithBalance.find(t => t.mint.toBase58() === e.target.value);
                if (token) setInputToken(token);
              }}
              disabled={isSwapping || tokensWithBalance.length === 0}
              style={{ ...styles.input, flex: 1 }}
            >
              {tokensWithBalance.length === 0 ? (
                <option value="">No tokens with balance</option>
              ) : (
                tokensWithBalance.map(token => (
                  <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                    {token.symbol}
                  </option>
                ))
              )}
            </select>
          </div>

          <input
            type="number"
            value={inputAmount}
            onChange={(e) => setInputAmount(e.target.value)}
            placeholder="0.00"
            step="any"
            min="0"
            disabled={isSwapping}
            style={styles.input}
          />

          <div style={{ ...styles.spaceBetween, marginTop: '8px' }}>
            <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>Available</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
              {inputToken ? formatAmount(totalAvailable, inputToken.decimals) : '0'} {inputToken?.symbol || ''}
            </span>
          </div>
        </div>

        {/* Swap Direction Button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          <button
            type="button"
            onClick={handleSwapTokens}
            disabled={isSwapping}
            style={{
              background: colors.backgroundMuted,
              border: `1px solid ${colors.border}`,
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: colors.text,
            }}
          >
            ↓
          </button>
        </div>

        {/* Output Token */}
        <div>
          <label style={styles.label}>To (estimated)</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
            <select
              value={outputToken?.mint.toBase58() || ''}
              onChange={(e) => {
                const token = availableOutputTokens.find(t => t.mint.toBase58() === e.target.value);
                if (token) setOutputToken(token);
              }}
              disabled={isSwapping || availableOutputTokens.length === 0}
              style={{ ...styles.input, flex: 1 }}
            >
              {availableOutputTokens.length === 0 ? (
                <option value="">No pools paired with {inputToken?.symbol || 'selected token'}</option>
              ) : (
                availableOutputTokens.map(token => (
                  <option key={token.mint.toBase58()} value={token.mint.toBase58()}>
                    {token.symbol}
                  </option>
                ))
              )}
            </select>
          </div>

          <div
            style={{
              ...styles.input,
              background: colors.backgroundMuted,
              color: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>
              {swapQuote
                ? formatAmount(swapQuote.outputAmount, outputToken.decimals)
                : '0.00'}
            </span>
            <span style={{ fontSize: '0.875rem' }}>{outputToken.symbol}</span>
          </div>
        </div>

        {/* Quote Details */}
        {swapQuote && (
          <div style={{
            background: colors.backgroundMuted,
            padding: '12px',
            borderRadius: '8px',
            fontSize: '0.875rem',
          }}>
            <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted }}>Price Impact</span>
              <span style={{ color: swapQuote.priceImpact > 5 ? colors.error : colors.text }}>
                {swapQuote.priceImpact.toFixed(2)}%
              </span>
            </div>
            <div style={{ ...styles.spaceBetween, marginBottom: '8px' }}>
              <span style={{ color: colors.textMuted }}>Minimum Received</span>
              <span>{formatAmount(swapQuote.minOutput, outputToken.decimals)} {outputToken.symbol}</span>
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
              placeholder="0.5"
              step="0.1"
              min="0.1"
              max="50"
              disabled={isSwapping}
              style={styles.input}
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
            : isSwapping
            ? 'Swapping...'
            : 'Swap Tokens'}
        </button>

        {swapQuote && swapQuote.priceImpact > 10 && (
          <div style={{ ...styles.errorText, background: colors.backgroundMuted, padding: '12px', borderRadius: '8px' }}>
            Warning: High price impact! Consider reducing swap amount.
          </div>
        )}
      </form>
      </div>

      {/* AMM Pool Details */}
      {inputToken && outputToken && selectedAmmPool && (
        <AmmPoolDetails
          tokenA={inputToken}
          tokenB={outputToken}
          pool={selectedAmmPool}
          className={className}
        />
      )}
    </>
  );
}
