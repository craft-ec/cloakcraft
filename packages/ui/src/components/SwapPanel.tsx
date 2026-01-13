/**
 * Swap Panel - AMM interface with tabs for Swap, Add Liquidity, Remove Liquidity
 */

import { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { colors } from '../styles';
import { SwapForm } from './SwapForm';
import { AddLiquidityForm } from './AddLiquidityForm';
import { RemoveLiquidityForm } from './RemoveLiquidityForm';
import { DEVNET_TOKENS } from './TokenSelector';

type AmmTab = 'swap' | 'add' | 'remove';

interface SwapPanelProps {
  /** Optional initial tab */
  initialTab?: AmmTab;
  /** Wallet public key for transactions */
  walletPublicKey?: PublicKey | null;
}

export function SwapPanel({ initialTab = 'swap', walletPublicKey }: SwapPanelProps) {
  const [activeTab, setActiveTab] = useState<AmmTab>(initialTab);

  const tabs: { id: AmmTab; label: string }[] = [
    { id: 'swap', label: 'Swap' },
    { id: 'add', label: 'Add Liquidity' },
    { id: 'remove', label: 'Remove Liquidity' },
  ];

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
          tokens={DEVNET_TOKENS}
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
          tokens={DEVNET_TOKENS}
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

      {activeTab === 'remove' && (
        <RemoveLiquidityForm
          tokens={DEVNET_TOKENS}
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
      )}
    </div>
  );
}
