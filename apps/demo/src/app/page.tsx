'use client';

import { useState, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useCloakCraft } from '@cloakcraft/hooks';
import {
  WalletButton,
  BalanceDisplay,
  ShieldForm,
  TransferForm,
  UnshieldForm,
  NotesList,
  InitializePoolForm,
  PoolInfo,
  TokenSelector,
  PublicBalanceDisplay,
  WalletManager,
  DEVNET_TOKENS,
  colors,
} from '@cloakcraft/ui';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

type Tab = 'wallet' | 'pool' | 'shield' | 'transfer' | 'unshield' | 'notes';

export default function Home() {
  const { isConnected: isCloakConnected, isInitializing } = useCloakCraft();
  const { publicKey: solanaPublicKey, connected: isSolanaConnected } = useSolanaWallet();
  const [activeTab, setActiveTab] = useState<Tab>('wallet');
  const [selectedToken, setSelectedToken] = useState(DEVNET_TOKENS[0]);

  const tabs: { id: Tab; label: string; requiresWallet: boolean }[] = [
    { id: 'wallet', label: 'Wallet', requiresWallet: false },
    { id: 'pool', label: 'Pool', requiresWallet: false },
    { id: 'shield', label: 'Shield', requiresWallet: true },
    { id: 'transfer', label: 'Transfer', requiresWallet: true },
    { id: 'unshield', label: 'Unshield', requiresWallet: true },
    { id: 'notes', label: 'Notes', requiresWallet: true },
  ];

  // Derive user's token account
  const userTokenAccount = useMemo(() => {
    if (!solanaPublicKey) return null;
    try {
      return getAssociatedTokenAddressSync(selectedToken.mint, solanaPublicKey);
    } catch {
      return null;
    }
  }, [solanaPublicKey, selectedToken.mint]);

  return (
    <div style={{ minHeight: '100vh', padding: '24px' }}>
      {/* Header */}
      <header
        style={{
          maxWidth: '1200px',
          margin: '0 auto 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>
            CloakCraft
          </h1>
          <p style={{ fontSize: '0.875rem', color: colors.textMuted }}>
            Privacy-preserving token transfers on Solana
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Token Selector */}
          <div style={{ width: '180px' }}>
            <TokenSelector
              tokens={DEVNET_TOKENS}
              selected={selectedToken.mint}
              onSelect={setSelectedToken}
              showPoolStatus={true}
            />
          </div>

          {/* Solana Wallet Button */}
          <WalletMultiButton />

          {/* Status Indicator */}
          <div
            style={{
              padding: '8px 16px',
              background: colors.backgroundMuted,
              borderRadius: '8px',
              fontSize: '0.75rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <div>
              Solana:{' '}
              <span style={{ color: isSolanaConnected ? colors.success : colors.textMuted }}>
                {isSolanaConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <div>
              Stealth:{' '}
              <span style={{ color: isCloakConnected ? colors.success : colors.textMuted }}>
                {isInitializing ? 'Loading...' : isCloakConnected ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Navigation Tabs */}
        <nav
          style={{
            display: 'flex',
            gap: '4px',
            marginBottom: '24px',
            borderBottom: `1px solid ${colors.border}`,
            paddingBottom: '0',
            overflowX: 'auto',
          }}
        >
          {tabs.map((tab) => {
            const isDisabled = tab.requiresWallet && !isCloakConnected;
            return (
              <button
                key={tab.id}
                onClick={() => !isDisabled && setActiveTab(tab.id)}
                disabled={isDisabled}
                style={{
                  padding: '12px 24px',
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    activeTab === tab.id ? `2px solid ${colors.primary}` : '2px solid transparent',
                  color: isDisabled
                    ? colors.textMuted
                    : activeTab === tab.id
                    ? colors.primary
                    : colors.text,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  fontSize: '0.9375rem',
                  opacity: isDisabled ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
          {activeTab === 'wallet' && <WalletTab solanaPublicKey={solanaPublicKey} />}
          {activeTab === 'pool' && (
            <PoolTab
              tokenMint={selectedToken.mint}
              symbol={selectedToken.symbol}
              decimals={selectedToken.decimals}
            />
          )}
          {activeTab === 'shield' && (
            <ShieldTab
              tokenMint={selectedToken.mint}
              symbol={selectedToken.symbol}
              decimals={selectedToken.decimals}
              solanaPublicKey={solanaPublicKey}
              userTokenAccount={userTokenAccount}
            />
          )}
          {activeTab === 'transfer' && (
            <TransferTab
              tokenMint={selectedToken.mint}
              symbol={selectedToken.symbol}
              decimals={selectedToken.decimals}
            />
          )}
          {activeTab === 'unshield' && (
            <UnshieldTab
              tokenMint={selectedToken.mint}
              symbol={selectedToken.symbol}
              decimals={selectedToken.decimals}
            />
          )}
          {activeTab === 'notes' && (
            <NotesTab
              tokenMint={selectedToken.mint}
              symbol={selectedToken.symbol}
              decimals={selectedToken.decimals}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          maxWidth: '1200px',
          margin: '48px auto 0',
          padding: '24px 0',
          borderTop: `1px solid ${colors.border}`,
          textAlign: 'center',
          fontSize: '0.8125rem',
          color: colors.textMuted,
        }}
      >
        CloakCraft Demo - Running on Solana Devnet
      </footer>
    </div>
  );
}

function WalletTab({ solanaPublicKey }: { solanaPublicKey: PublicKey | null }) {
  const { isConnected } = useCloakCraft();

  return (
    <>
      <div>
        <h3 style={{ marginBottom: '16px', fontSize: '1.125rem' }}>Stealth Wallet</h3>
        <WalletButton />
        {isConnected && solanaPublicKey && (
          <div style={{ marginTop: '16px' }}>
            <PublicBalanceDisplay
              owner={solanaPublicKey}
              token={DEVNET_TOKENS[0]}
              showSol={true}
            />
          </div>
        )}
      </div>
      <WalletManager />
    </>
  );
}

function PoolTab({
  tokenMint,
  symbol,
  decimals,
}: {
  tokenMint: PublicKey;
  symbol: string;
  decimals: number;
}) {
  return (
    <>
      <PoolInfo tokenMint={tokenMint} decimals={decimals} symbol={symbol} />
      <InitializePoolForm
        onSuccess={(poolTx, counterTx) => {
          console.log('Pool initialized:', { poolTx, counterTx });
          alert(`Pool initialized!\nPool TX: ${poolTx}\nCounter TX: ${counterTx}`);
        }}
        onError={(error) => {
          console.error('Pool init error:', error);
          alert(`Error: ${error}`);
        }}
      />
    </>
  );
}

function ShieldTab({
  tokenMint,
  symbol,
  decimals,
  solanaPublicKey,
  userTokenAccount,
}: {
  tokenMint: PublicKey;
  symbol: string;
  decimals: number;
  solanaPublicKey: PublicKey | null;
  userTokenAccount: PublicKey | null;
}) {
  if (!userTokenAccount) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: colors.textMuted }}>
        Connect your Solana wallet to shield tokens
      </div>
    );
  }

  return (
    <>
      {solanaPublicKey && (
        <PublicBalanceDisplay
          owner={solanaPublicKey}
          token={{ mint: tokenMint, symbol, name: symbol, decimals }}
          showSol={true}
        />
      )}
      <ShieldForm
        tokenMint={tokenMint}
        userTokenAccount={userTokenAccount}
        decimals={decimals}
        symbol={symbol}
        onSuccess={(tx) => {
          console.log('Shield success:', tx);
          alert(`Shielded successfully!\nTX: ${tx}`);
        }}
        onError={(err) => {
          console.error('Shield error:', err);
          alert(`Shield error: ${err}`);
        }}
      />
    </>
  );
}

function TransferTab({
  tokenMint,
  symbol,
  decimals,
}: {
  tokenMint: PublicKey;
  symbol: string;
  decimals: number;
}) {
  return (
    <>
      <BalanceDisplay tokenMint={tokenMint} decimals={decimals} symbol={symbol} />
      <TransferForm
        tokenMint={tokenMint}
        decimals={decimals}
        symbol={symbol}
        onSuccess={(tx) => {
          console.log('Transfer success:', tx);
          alert(`Transferred successfully!\nTX: ${tx}`);
        }}
        onError={(err) => {
          console.error('Transfer error:', err);
          alert(`Transfer error: ${err}`);
        }}
      />
    </>
  );
}

function UnshieldTab({
  tokenMint,
  symbol,
  decimals,
}: {
  tokenMint: PublicKey;
  symbol: string;
  decimals: number;
}) {
  return (
    <>
      <BalanceDisplay tokenMint={tokenMint} decimals={decimals} symbol={symbol} />
      <UnshieldForm
        tokenMint={tokenMint}
        decimals={decimals}
        symbol={symbol}
        onSuccess={(tx) => {
          console.log('Unshield success:', tx);
          alert(`Unshielded successfully!\nTX: ${tx}`);
        }}
        onError={(err) => {
          console.error('Unshield error:', err);
          alert(`Unshield error: ${err}`);
        }}
      />
    </>
  );
}

function NotesTab({
  tokenMint,
  symbol,
  decimals,
}: {
  tokenMint: PublicKey;
  symbol: string;
  decimals: number;
}) {
  return (
    <>
      <BalanceDisplay tokenMint={tokenMint} decimals={decimals} symbol={symbol} />
      <NotesList tokenMint={tokenMint} decimals={decimals} symbol={symbol} />
    </>
  );
}
