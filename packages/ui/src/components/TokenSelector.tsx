/**
 * Token Selector component
 *
 * Dropdown for selecting which token pool to use
 */

import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { usePool, usePoolList } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface TokenSelectorProps {
  /** List of available tokens */
  tokens: TokenInfo[];
  /** Currently selected token */
  selected?: PublicKey;
  /** Callback when token is selected */
  onSelect: (token: TokenInfo) => void;
  /** Show pool status badge */
  showPoolStatus?: boolean;
  /** Allow custom token input */
  allowCustom?: boolean;
  className?: string;
}

export function TokenSelector({
  tokens,
  selected,
  onSelect,
  showPoolStatus = true,
  allowCustom = false,
  className,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customMint, setCustomMint] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const selectedToken = tokens.find((t) => selected && t.mint.equals(selected));

  const handleSelect = (token: TokenInfo) => {
    onSelect(token);
    setIsOpen(false);
    setShowCustomInput(false);
  };

  const handleCustomSubmit = () => {
    try {
      const mint = new PublicKey(customMint.trim());
      onSelect({
        mint,
        symbol: 'CUSTOM',
        name: 'Custom Token',
        decimals: 9,
      });
      setIsOpen(false);
      setShowCustomInput(false);
      setCustomMint('');
    } catch {
      // Invalid mint - ignore
    }
  };

  return (
    <div className={className} style={{ position: 'relative' }}>
      {/* Selected Token Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          ...styles.buttonSecondary,
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedToken?.logoUri && (
            <img
              src={selectedToken.logoUri}
              alt={selectedToken.symbol}
              style={{ width: 24, height: 24, borderRadius: '50%' }}
            />
          )}
          <span style={{ fontWeight: 500 }}>
            {selectedToken?.symbol ?? 'Select Token'}
          </span>
        </div>
        <span style={{ color: colors.textMuted }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 100,
            maxHeight: '300px',
            overflowY: 'auto',
          }}
        >
          {tokens.map((token) => (
            <TokenOption
              key={token.mint.toBase58()}
              token={token}
              isSelected={selected ? token.mint.equals(selected) : false}
              showPoolStatus={showPoolStatus}
              onClick={() => handleSelect(token)}
            />
          ))}

          {allowCustom && (
            <>
              <div style={{ borderTop: `1px solid ${colors.border}`, margin: '4px 0' }} />

              {showCustomInput ? (
                <div style={{ padding: '8px 12px' }}>
                  <input
                    type="text"
                    value={customMint}
                    onChange={(e) => setCustomMint(e.target.value)}
                    placeholder="Enter token mint address"
                    style={{
                      ...styles.input,
                      fontSize: '0.8125rem',
                      padding: '8px',
                      marginBottom: '8px',
                    }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setShowCustomInput(false)}
                      style={{ ...styles.buttonSecondary, ...styles.buttonSmall, flex: 1 }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCustomSubmit}
                      disabled={!customMint.trim()}
                      style={{
                        ...styles.buttonPrimary,
                        ...styles.buttonSmall,
                        flex: 1,
                        ...(!customMint.trim() ? styles.buttonDisabled : {}),
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowCustomInput(true)}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: colors.primary,
                    fontSize: '0.875rem',
                  }}
                >
                  + Add Custom Token
                </button>
              )}
            </>
          )}

          {tokens.length === 0 && !allowCustom && (
            <div style={{ ...styles.emptyState, padding: '16px' }}>
              No tokens available
            </div>
          )}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99,
          }}
          onClick={() => {
            setIsOpen(false);
            setShowCustomInput(false);
          }}
        />
      )}
    </div>
  );
}

function TokenOption({
  token,
  isSelected,
  showPoolStatus,
  onClick,
}: {
  token: TokenInfo;
  isSelected: boolean;
  showPoolStatus: boolean;
  onClick: () => void;
}) {
  const { exists, isLoading } = usePool(showPoolStatus ? token.mint : undefined);

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 16px',
        background: isSelected ? colors.backgroundMuted : 'none',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {token.logoUri && (
          <img
            src={token.logoUri}
            alt={token.symbol}
            style={{ width: 24, height: 24, borderRadius: '50%' }}
          />
        )}
        <div>
          <div style={{ fontWeight: 500 }}>{token.symbol}</div>
          <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>{token.name}</div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showPoolStatus && (
          <span
            style={{
              ...styles.badge,
              ...(isLoading
                ? { backgroundColor: colors.backgroundDark }
                : exists
                ? styles.badgeSuccess
                : styles.badgeWarning),
            }}
          >
            {isLoading ? '...' : exists ? 'Active' : 'No Pool'}
          </span>
        )}
        {isSelected && <span style={{ color: colors.primary }}>✓</span>}
      </div>
    </button>
  );
}

/**
 * Common token presets for devnet/mainnet
 */
export const DEVNET_TOKENS: TokenInfo[] = [
  {
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
  },
  {
    mint: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'),
    symbol: 'USDC',
    name: 'USD Coin (Devnet)',
    decimals: 6,
  },
  {
    mint: new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm'),
    symbol: 'TEST',
    name: 'CloakCraft Test Token',
    decimals: 6,
  },
];

export const MAINNET_TOKENS: TokenInfo[] = [
  {
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
    symbol: 'SOL',
    name: 'Wrapped SOL',
    decimals: 9,
  },
  {
    mint: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
  },
  {
    mint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
  },
];
