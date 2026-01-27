/**
 * TradeForm Component
 *
 * Form for opening perpetual positions with leverage
 */

import React, { useState, useMemo, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { styles, colors } from '../styles';

export interface NoteOption {
  commitment: string;
  tokenMint: PublicKey;
  amount: bigint;
  label?: string;
}

export interface MarketOption {
  address: string;
  name: string;
  baseToken: string;
  quoteToken: string;
  currentPrice: bigint;
  maxLeverage: number;
}

export interface TradeFormProps {
  markets: MarketOption[];
  notes: NoteOption[];
  selectedMarket?: string;
  onSelectMarket?: (marketAddress: string) => void;
  onSubmit: (params: {
    market: string;
    note: string;
    direction: 'long' | 'short';
    marginAmount: bigint;
    leverage: number;
  }) => void;
  isSubmitting?: boolean;
  tokenDecimals?: number;
  tokenSymbol?: string;
}

function formatBigInt(value: bigint, decimals: number = 6): string {
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = (value % divisor).toString().padStart(decimals, '0').slice(0, 2);
  return `${intPart}.${fracPart}`;
}

function formatPrice(value: bigint, decimals: number = 8): string {
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = (value % divisor).toString().padStart(decimals, '0').slice(0, 2);
  return `$${intPart}.${fracPart}`;
}

export function TradeForm({
  markets,
  notes,
  selectedMarket,
  onSelectMarket,
  onSubmit,
  isSubmitting = false,
  tokenDecimals = 6,
  tokenSymbol = 'USDC',
}: TradeFormProps) {
  const [marketAddress, setMarketAddress] = useState(selectedMarket || markets[0]?.address || '');
  const [noteCommitment, setNoteCommitment] = useState(notes[0]?.commitment || '');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [marginInput, setMarginInput] = useState('');
  const [leverage, setLeverage] = useState(10);

  const selectedMarketData = useMemo(() => {
    return markets.find(m => m.address === marketAddress);
  }, [markets, marketAddress]);

  const selectedNote = useMemo(() => {
    return notes.find(n => n.commitment === noteCommitment);
  }, [notes, noteCommitment]);

  const marginAmount = useMemo(() => {
    try {
      const parsed = parseFloat(marginInput);
      if (isNaN(parsed) || parsed <= 0) return 0n;
      return BigInt(Math.floor(parsed * 10 ** tokenDecimals));
    } catch {
      return 0n;
    }
  }, [marginInput, tokenDecimals]);

  const positionSize = useMemo(() => {
    return marginAmount * BigInt(leverage);
  }, [marginAmount, leverage]);

  const maxMargin = selectedNote?.amount || 0n;

  const validation = useMemo(() => {
    if (!selectedMarketData) {
      return { isValid: false, error: 'Select a market' };
    }
    if (!selectedNote) {
      return { isValid: false, error: 'Select a note' };
    }
    if (marginAmount <= 0n) {
      return { isValid: false, error: 'Enter margin amount' };
    }
    if (marginAmount > maxMargin) {
      return { isValid: false, error: 'Insufficient balance' };
    }
    if (leverage < 1 || leverage > selectedMarketData.maxLeverage) {
      return { isValid: false, error: `Leverage must be 1-${selectedMarketData.maxLeverage}x` };
    }
    return { isValid: true, error: null };
  }, [selectedMarketData, selectedNote, marginAmount, maxMargin, leverage]);

  const handleMarketChange = useCallback((address: string) => {
    setMarketAddress(address);
    onSelectMarket?.(address);
  }, [onSelectMarket]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid) return;

    onSubmit({
      market: marketAddress,
      note: noteCommitment,
      direction,
      marginAmount,
      leverage,
    });
  }, [validation.isValid, marketAddress, noteCommitment, direction, marginAmount, leverage, onSubmit]);

  const handleMaxMargin = useCallback(() => {
    if (maxMargin > 0n) {
      setMarginInput(formatBigInt(maxMargin, tokenDecimals));
    }
  }, [maxMargin, tokenDecimals]);

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        Open Position
      </h3>

      {/* Market Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>
          Market
        </label>
        <select
          value={marketAddress}
          onChange={(e) => handleMarketChange(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
        >
          {markets.length === 0 && <option value="">No markets available</option>}
          {markets.map((market) => (
            <option key={market.address} value={market.address}>
              {market.name} ({formatPrice(market.currentPrice)})
            </option>
          ))}
        </select>
      </div>

      {/* Direction Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>
          Direction
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setDirection('long')}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              backgroundColor: direction === 'long' ? colors.success : colors.border,
              color: direction === 'long' ? '#fff' : colors.text,
              transition: 'all 0.2s',
            }}
          >
            Long ↑
          </button>
          <button
            type="button"
            onClick={() => setDirection('short')}
            disabled={isSubmitting}
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '600',
              backgroundColor: direction === 'short' ? colors.error : colors.border,
              color: direction === 'short' ? '#fff' : colors.text,
              transition: 'all 0.2s',
            }}
          >
            Short ↓
          </button>
        </div>
      </div>

      {/* Note Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>
          Source Note
        </label>
        <select
          value={noteCommitment}
          onChange={(e) => setNoteCommitment(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
        >
          {notes.length === 0 && <option value="">No notes available</option>}
          {notes.map((note) => (
            <option key={note.commitment} value={note.commitment}>
              {note.label || note.commitment.slice(0, 8)}... ({formatBigInt(note.amount, tokenDecimals)} {tokenSymbol})
            </option>
          ))}
        </select>
      </div>

      {/* Margin Amount */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <label style={{ fontSize: '12px', color: colors.textMuted }}>
            Margin Amount
          </label>
          <button
            type="button"
            onClick={handleMaxMargin}
            style={{
              fontSize: '11px',
              color: colors.primary,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            Max: {formatBigInt(maxMargin, tokenDecimals)} {tokenSymbol}
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={marginInput}
            onChange={(e) => setMarginInput(e.target.value)}
            placeholder="0.00"
            style={styles.input}
            disabled={isSubmitting}
          />
          <span style={{
            position: 'absolute',
            right: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: colors.textMuted,
            fontSize: '14px',
          }}>
            {tokenSymbol}
          </span>
        </div>
      </div>

      {/* Leverage Slider */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontSize: '12px', color: colors.textMuted }}>
            Leverage
          </label>
          <span style={{ fontWeight: '600' }}>{leverage}x</span>
        </div>
        <input
          type="range"
          min={1}
          max={selectedMarketData?.maxLeverage || 100}
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value))}
          style={{ width: '100%' }}
          disabled={isSubmitting}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: colors.textMuted, marginTop: '4px' }}>
          <span>1x</span>
          <span>{selectedMarketData?.maxLeverage || 100}x</span>
        </div>
      </div>

      {/* Position Preview */}
      {marginAmount > 0n && selectedMarketData && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: colors.border + '30',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: colors.textMuted }}>Position Size</span>
            <span style={{ fontWeight: '500' }}>
              {formatBigInt(positionSize, tokenDecimals)} {tokenSymbol}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: colors.textMuted }}>Entry Price</span>
            <span style={{ fontWeight: '500' }}>
              {formatPrice(selectedMarketData.currentPrice)}
            </span>
          </div>
        </div>
      )}

      {/* Error Message */}
      {validation.error && marginInput && (
        <div style={{
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: `${colors.error}15`,
          color: colors.error,
          fontSize: '12px',
          marginBottom: '16px',
        }}>
          {validation.error}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!validation.isValid || isSubmitting}
        style={{
          ...styles.buttonPrimary,
          width: '100%',
          opacity: !validation.isValid || isSubmitting ? 0.6 : 1,
          backgroundColor: direction === 'long' ? colors.success : colors.error,
        }}
      >
        {isSubmitting
          ? 'Opening Position...'
          : `Open ${direction.charAt(0).toUpperCase() + direction.slice(1)} Position`}
      </button>
    </form>
  );
}

export default TradeForm;
