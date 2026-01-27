/**
 * VoteForm Component
 *
 * Form for casting votes on ballots
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

export interface VoteOption {
  index: number;
  label: string;
  description?: string;
  currentWeight: bigint;
  currentPercentage: number;
}

export interface VoteFormProps {
  ballotTitle: string;
  options: VoteOption[];
  notes: NoteOption[];
  tokenSymbol: string;
  tokenDecimals?: number;
  bindingMode: 'snapshot' | 'spend-to-vote';
  isSubmitting?: boolean;
  onSubmit: (params: {
    noteCommitment: string;
    voteChoice: number;
  }) => void;
  onCancel?: () => void;
}

function formatBigInt(value: bigint, decimals: number = 6): string {
  if (value === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = Math.abs(Number((value % divisor) * 100n / divisor));
  if (fracPart === 0) return intPart.toLocaleString();
  return `${intPart.toLocaleString()}.${fracPart.toString().padStart(2, '0')}`;
}

export function VoteForm({
  ballotTitle,
  options,
  notes,
  tokenSymbol,
  tokenDecimals = 6,
  bindingMode,
  isSubmitting = false,
  onSubmit,
  onCancel,
}: VoteFormProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState(notes[0]?.commitment || '');

  const selectedNoteData = useMemo(() => {
    return notes.find(n => n.commitment === selectedNote);
  }, [notes, selectedNote]);

  const votingWeight = selectedNoteData?.amount || 0n;

  const validation = useMemo(() => {
    if (selectedOption === null) {
      return { isValid: false, error: 'Select an option to vote for' };
    }
    if (!selectedNoteData) {
      return { isValid: false, error: 'Select a note' };
    }
    if (votingWeight <= 0n) {
      return { isValid: false, error: 'Note has no balance' };
    }
    return { isValid: true, error: null };
  }, [selectedOption, selectedNoteData, votingWeight]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.isValid || selectedOption === null) return;

    onSubmit({
      noteCommitment: selectedNote,
      voteChoice: selectedOption,
    });
  }, [validation.isValid, selectedOption, selectedNote, onSubmit]);

  // Calculate what the new percentage would be with user's vote
  const projectedPercentages = useMemo(() => {
    if (selectedOption === null || votingWeight <= 0n) return null;

    const totalWithVote = options.reduce((sum, o) => sum + o.currentWeight, 0n) + votingWeight;

    return options.map((opt) => {
      const newWeight = opt.index === selectedOption
        ? opt.currentWeight + votingWeight
        : opt.currentWeight;
      return {
        index: opt.index,
        newPercentage: totalWithVote > 0n
          ? Number((newWeight * 10000n) / totalWithVote) / 100
          : 0,
      };
    });
  }, [options, selectedOption, votingWeight]);

  return (
    <form onSubmit={handleSubmit} style={styles.card}>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
          Cast Your Vote
        </h3>
        <p style={{ fontSize: '14px', color: colors.textMuted, margin: 0 }}>
          {ballotTitle}
        </p>
      </div>

      {/* Binding Mode Warning */}
      {bindingMode === 'spend-to-vote' && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: colors.warning + '15',
          border: `1px solid ${colors.warning}40`,
          marginBottom: '16px',
          fontSize: '13px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <span style={{ fontSize: '16px' }}>🔒</span>
            <div>
              <strong style={{ color: colors.warning }}>Spend-to-Vote Mode</strong>
              <p style={{ margin: '4px 0 0', color: colors.textMuted }}>
                Your tokens will be locked until the ballot is resolved. If you vote for the winning option, you can claim proportional winnings.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Note Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '4px' }}>
          Voting with
        </label>
        <select
          value={selectedNote}
          onChange={(e) => setSelectedNote(e.target.value)}
          style={styles.input}
          disabled={isSubmitting}
        >
          {notes.length === 0 && <option value="">No eligible notes</option>}
          {notes.map((note) => (
            <option key={note.commitment} value={note.commitment}>
              {formatBigInt(note.amount, tokenDecimals)} {tokenSymbol}
              {note.label ? ` (${note.label})` : ''}
            </option>
          ))}
        </select>
        <div style={{ fontSize: '11px', color: colors.textMuted, marginTop: '4px' }}>
          Your voting weight: <strong>{formatBigInt(votingWeight, tokenDecimals)} {tokenSymbol}</strong>
        </div>
      </div>

      {/* Vote Options */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '12px', color: colors.textMuted, marginBottom: '8px' }}>
          Select your choice
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {options.map((option) => {
            const isSelected = selectedOption === option.index;
            const projected = projectedPercentages?.find(p => p.index === option.index);

            return (
              <button
                key={option.index}
                type="button"
                onClick={() => setSelectedOption(option.index)}
                disabled={isSubmitting}
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: `2px solid ${isSelected ? colors.primary : colors.border}`,
                  backgroundColor: isSelected ? colors.primary + '10' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}>
                  <span style={{
                    fontWeight: '500',
                    color: isSelected ? colors.primary : colors.text,
                  }}>
                    {option.label}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: isSelected ? colors.primary : colors.textMuted,
                  }}>
                    {option.currentPercentage.toFixed(1)}%
                    {isSelected && projected && (
                      <span style={{ marginLeft: '4px' }}>
                        → {projected.newPercentage.toFixed(1)}%
                      </span>
                    )}
                  </span>
                </div>
                {option.description && (
                  <p style={{
                    fontSize: '12px',
                    color: colors.textMuted,
                    margin: '4px 0 8px',
                  }}>
                    {option.description}
                  </p>
                )}
                <div style={{
                  height: '4px',
                  borderRadius: '2px',
                  backgroundColor: colors.border,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${isSelected && projected ? projected.newPercentage : option.currentPercentage}%`,
                    backgroundColor: isSelected ? colors.primary : colors.textMuted + '60',
                    transition: 'width 0.3s, background-color 0.3s',
                  }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {selectedOption !== null && selectedNoteData && (
        <div style={{
          padding: '12px',
          borderRadius: '6px',
          backgroundColor: colors.primary + '10',
          marginBottom: '16px',
          fontSize: '13px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: colors.textMuted }}>Voting for</span>
            <strong>{options[selectedOption]?.label}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: colors.textMuted }}>Weight</span>
            <strong>{formatBigInt(votingWeight, tokenDecimals)} {tokenSymbol}</strong>
          </div>
        </div>
      )}

      {/* Error */}
      {validation.error && selectedNote && (
        <div style={{
          padding: '10px 12px',
          borderRadius: '6px',
          backgroundColor: colors.error + '15',
          color: colors.error,
          fontSize: '12px',
          marginBottom: '16px',
        }}>
          {validation.error}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              ...styles.buttonSecondary,
              flex: 1,
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!validation.isValid || isSubmitting}
          style={{
            ...styles.buttonPrimary,
            flex: 1,
            opacity: !validation.isValid || isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? 'Submitting Vote...' : 'Cast Vote'}
        </button>
      </div>
    </form>
  );
}

export default VoteForm;
