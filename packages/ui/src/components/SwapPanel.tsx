/**
 * Swap Panel - AMM interface with tabs for Swap, Add Liquidity, Remove Liquidity
 */

import { useState, useEffect, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useCloakCraft } from '@cloakcraft/hooks';
import { colors } from '../styles';
import { SwapForm } from './SwapForm';
import { AddLiquidityForm } from './AddLiquidityForm';
import { RemoveLiquidityForm } from './RemoveLiquidityForm';
import { DEVNET_TOKENS } from './TokenSelector';

type AmmTab = 'swap' | 'add' | 'remove';

interface TokenInfo {
  mint: PublicKey;
  symbol: string;
  name: string;
  decimals: number;
  logoUri?: string;
}

interface SwapPanelProps {
  /** Optional initial tab */
  initialTab?: AmmTab;
  /** Wallet public key for transactions */
  walletPublicKey?: PublicKey | null;
}

export function SwapPanel({ initialTab = 'swap', walletPublicKey }: SwapPanelProps) {
  const [activeTab, setActiveTab] = useState<AmmTab>(initialTab);
  const [initializedPoolMints, setInitializedPoolMints] = useState<Set<string>>(new Set());
  const [isLoadingPools, setIsLoadingPools] = useState(true);
  const { client, notes } = useCloakCraft();

  // Fetch initialized pools on mount
  useEffect(() => {
    const fetchPools = async () => {
      if (!client) return;
      setIsLoadingPools(true);

      try {
        const pools = await client.getAllPools();
        const mints = new Set(pools.map((pool) => pool.tokenMint.toBase58()));
        setInitializedPoolMints(mints);
      } catch (err) {
        console.error('Error fetching pools:', err);
        setInitializedPoolMints(new Set());
      }
      setIsLoadingPools(false);
    };

    fetchPools();
  }, [client]);

  // Get all tokens (known + unknown from initialized pools)
  const poolTokens = useMemo(() => {
    const tokens: TokenInfo[] = [];

    // Add known tokens that have pools
    DEVNET_TOKENS.forEach((token) => {
      if (initializedPoolMints.has(token.mint.toBase58())) {
        tokens.push(token);
      }
    });

    // Add unknown tokens from pools
    initializedPoolMints.forEach((mintStr) => {
      const isKnown = DEVNET_TOKENS.some(t => t.mint.toBase58() === mintStr);
      if (!isKnown) {
        tokens.push({
          mint: new PublicKey(mintStr),
          symbol: mintStr.slice(0, 8) + '...',
          name: mintStr,
          decimals: 9,
        });
      }
    });

    return tokens;
  }, [initializedPoolMints]);

  // For remove liquidity, additionally filter to tokens user has notes for
  const tokensWithNotes = useMemo(() => {
    const notesByMint = new Map<string, number>();
    notes.forEach((note) => {
      const mintStr = note.tokenMint.toBase58();
      notesByMint.set(mintStr, (notesByMint.get(mintStr) || 0) + 1);
    });

    return poolTokens.filter((token) => {
      const noteCount = notesByMint.get(token.mint.toBase58()) || 0;
      return noteCount > 0;
    });
  }, [poolTokens, notes]);

  const tabs: { id: AmmTab; label: string }[] = [
    { id: 'swap', label: 'Swap' },
    { id: 'add', label: 'Add Liquidity' },
    { id: 'remove', label: 'Remove Liquidity' },
  ];

  if (isLoadingPools) {
    return (
      <div style={{ width: '100%', maxWidth: '600px', padding: '24px', textAlign: 'center' }}>
        Loading pools...
      </div>
    );
  }

  if (poolTokens.length === 0) {
    return (
      <div style={{ width: '100%', maxWidth: '600px', padding: '24px', textAlign: 'center' }}>
        No initialized pools found. Please initialize a pool first.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', maxWidth: '600px' }}>
      {/* Tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 24px',
              background: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === tab.id ? `2px solid ${colors.primary}` : '2px solid transparent',
              color: activeTab === tab.id ? colors.text : colors.textMuted,
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.2s',
              fontSize: '14px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'swap' && (
        <SwapForm
          tokens={poolTokens}
          walletPublicKey={walletPublicKey}
          onSuccess={(signature) => {
            console.log('Swap success:', signature);
            alert(`Swap successful!\nTX: ${signature}`);
          }}
          onError={(error) => {
            console.error('Swap error:', error);
            alert(`Swap error: ${error}`);
          }}
        />
      )}

      {activeTab === 'add' && (
        <AddLiquidityForm
          tokens={poolTokens}
          walletPublicKey={walletPublicKey}
          onSuccess={(signature) => {
            console.log('Add liquidity success:', signature);
            alert(`Liquidity added successfully!\nTX: ${signature}`);
          }}
          onError={(error) => {
            console.error('Add liquidity error:', error);
            alert(`Add liquidity error: ${error}`);
          }}
        />
      )}

      {activeTab === 'remove' && tokensWithNotes.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted }}>
          No LP tokens found. Add liquidity to a pool first.
        </div>
      ) : activeTab === 'remove' ? (
        <RemoveLiquidityForm
          tokens={tokensWithNotes}
          walletPublicKey={walletPublicKey}
          onSuccess={(signature) => {
            console.log('Remove liquidity success:', signature);
            alert(`Liquidity removed successfully!\nTX: ${signature}`);
          }}
          onError={(error) => {
            console.error('Remove liquidity error:', error);
            alert(`Remove liquidity error: ${error}`);
          }}
        />
      ) : null}
    </div>
  );
}
