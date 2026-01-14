'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { useCloakCraft, useNoteSelector, useTokenBalances } from '@cloakcraft/hooks';
import { IDL } from '@cloakcraft/sdk/idl';
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
  MultiTokenBalanceDisplay,
  MultiPrivateBalanceDisplay,
  BalanceSummary,
  WalletManager,
  DEVNET_TOKENS,
  colors,
  styles,
  SwapPanel,
} from '@cloakcraft/ui';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

type Tab = 'wallet' | 'swap';

interface DemoAppProps {
  initialTab?: Tab;
}

export default function DemoApp({ initialTab }: DemoAppProps) {
  const { isConnected: isCloakConnected, isInitializing, setProgram } = useCloakCraft();
  const { publicKey: solanaPublicKey, connected: isSolanaConnected, signMessage } = useSolanaWallet();
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Get tab from pathname or initialTab prop or default to 'wallet'
  const pathTab = pathname?.replace('/', '') as Tab;
  const activeTab = ['wallet', 'swap'].includes(pathTab)
    ? pathTab
    : initialTab || 'wallet';

  // Sub-tab state for Wallet (synced with URL)
  type WalletSubTab = 'account' | 'pool' | 'operations' | 'notes';
  const subTabParam = searchParams.get('subtab');
  const walletSubTab = (subTabParam && ['account', 'pool', 'operations', 'notes'].includes(subTabParam)
    ? subTabParam
    : 'account') as WalletSubTab;


  const setActiveTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    router.push(`/${tab}?${params.toString()}`, { scroll: false });
  };

  const setWalletSubTab = useCallback((subTab: WalletSubTab) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('subtab', subTab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, searchParams, router]);

  // Set up Anchor program when wallet connects
  useEffect(() => {
    if (anchorWallet && connection) {
      const provider = new AnchorProvider(connection, anchorWallet, {});
      const program = new Program(IDL as any, provider);
      setProgram(program);
    }
  }, [anchorWallet, connection, setProgram]);

  const tabs: { id: Tab; label: string; requiresWallet: boolean }[] = [
    { id: 'wallet', label: 'Wallet', requiresWallet: false },
    { id: 'swap', label: 'Swap', requiresWallet: true },
  ];


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
        {activeTab === 'wallet' && (
          <div style={{ maxWidth: '1200px' }}>
            {/* Sub-tab Navigation */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                borderBottom: `1px solid ${colors.border}`,
              }}
            >
              {[
                { id: 'account' as WalletSubTab, label: 'Account' },
                { id: 'pool' as WalletSubTab, label: 'Pool' },
                { id: 'operations' as WalletSubTab, label: 'Operations' },
                { id: 'notes' as WalletSubTab, label: 'Notes' },
              ].map((subTab) => (
                <button
                  key={subTab.id}
                  onClick={() => setWalletSubTab(subTab.id)}
                  style={{
                    padding: '12px 24px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom:
                      walletSubTab === subTab.id
                        ? `2px solid ${colors.primary}`
                        : '2px solid transparent',
                    color: walletSubTab === subTab.id ? colors.text : colors.textMuted,
                    fontWeight: 600,
                    opacity: walletSubTab === subTab.id ? 1 : 0.6,
                    cursor: 'pointer',
                    transition: 'color 0.2s, opacity 0.2s, border-color 0.2s',
                    fontSize: '14px',
                  }}
                >
                  {subTab.label}
                </button>
              ))}
            </div>

            {/* Sub-tab Content */}
            {walletSubTab === 'account' && (
              <div style={{
                display: 'grid',
                gap: '24px',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              }}>
                <WalletTab
                  solanaPublicKey={solanaPublicKey}
                  solanaConnected={isSolanaConnected}
                  signMessage={signMessage}
                />
              </div>
            )}

            {walletSubTab === 'pool' && (
              <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
                <PoolTab walletPublicKey={solanaPublicKey} />
              </div>
            )}

            {walletSubTab === 'operations' && (
              <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
                <ShieldTab solanaPublicKey={solanaPublicKey} />
                <TransferTab walletPublicKey={solanaPublicKey} />
                <UnshieldTab walletPublicKey={solanaPublicKey} />
              </div>
            )}

            {walletSubTab === 'notes' && (
              <div style={{ display: 'grid', gap: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))' }}>
                <NotesTab />
              </div>
            )}
          </div>
        )}

        {activeTab === 'swap' && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
            <SwapPanel walletPublicKey={solanaPublicKey} />
          </div>
        )}
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

function WalletTab({
  solanaPublicKey,
  solanaConnected,
  signMessage,
}: {
  solanaPublicKey: PublicKey | null;
  solanaConnected: boolean;
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}) {
  const { isConnected } = useCloakCraft();

  return (
    <>
      {/* Column 1: Wallet Management */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div>
          <h3 style={{ marginBottom: '16px', fontSize: '1.125rem' }}>Stealth Wallet</h3>
          <WalletButton solanaConnected={solanaConnected} signMessage={signMessage} />
        </div>
        <WalletManager />
      </div>

      {/* Column 2: Public Balances */}
      <div>
        {solanaPublicKey ? (
          <>
            <h3 style={{ marginBottom: '16px', fontSize: '1.125rem' }}>Public Balances</h3>
            <MultiTokenBalanceDisplay owner={solanaPublicKey} tokens={DEVNET_TOKENS} showSol={true} />
          </>
        ) : (
          <div style={styles.card}>
            <p style={{ color: colors.textMuted, textAlign: 'center' }}>
              Connect your Solana wallet to view balances
            </p>
          </div>
        )}
      </div>

      {/* Column 3: Private Balances */}
      <div>
        {isConnected ? (
          <>
            <h3 style={{ marginBottom: '16px', fontSize: '1.125rem' }}>Private Balances</h3>
            <MultiPrivateBalanceDisplay tokens={DEVNET_TOKENS} />
          </>
        ) : (
          <div style={styles.card}>
            <p style={{ color: colors.textMuted, textAlign: 'center' }}>
              Connect your stealth wallet to view private balances
            </p>
          </div>
        )}
      </div>
    </>
  );
}

function PoolTab({ walletPublicKey }: { walletPublicKey: PublicKey | null }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <>
      <PoolInfoCard refreshKey={refreshKey} />
      <InitializePoolForm
        walletPublicKey={walletPublicKey}
        defaultTokenMint={DEVNET_TOKENS[0].mint}
        onSuccess={(poolTx, counterTx) => {
          console.log('Pool initialized:', { poolTx, counterTx });
          alert(`Pool initialized!\nPool TX: ${poolTx}\nCounter TX: ${counterTx}`);
          setRefreshKey((k) => k + 1);
        }}
        onError={(error) => {
          console.error('Pool init error:', error);
          alert(`Error: ${error}`);
        }}
      />
    </>
  );
}

interface PoolDisplay {
  mint: PublicKey;
  symbol?: string;
  name?: string;
  decimals: number;
}

function PoolInfoCard({ refreshKey }: { refreshKey: number }) {
  const { client } = useCloakCraft();
  const [initializedPools, setInitializedPools] = useState<PoolDisplay[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolDisplay | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInitializedPools = async () => {
      if (!client) return;

      setIsLoading(true);
      try {
        const pools = await client.getAllPools();

        // Only show pools with liquidity (totalShielded > 0)
        const poolDisplays = pools
          .filter((pool) => pool.totalShielded > BigInt(0))
          .map((pool) => {
            const knownToken = DEVNET_TOKENS.find(t => t.mint.equals(pool.tokenMint));

            if (knownToken) {
              return {
                mint: pool.tokenMint,
                symbol: knownToken.symbol,
                name: knownToken.name,
                decimals: knownToken.decimals,
              };
            } else {
              // Unknown token - show mint address
              return {
                mint: pool.tokenMint,
                symbol: pool.tokenMint.toBase58().slice(0, 8) + '...',
                name: pool.tokenMint.toBase58(),
                decimals: 9,
              };
            }
          });

        setInitializedPools(poolDisplays);
        if (poolDisplays.length > 0 && !selectedPool) {
          setSelectedPool(poolDisplays[0]);
        }
      } catch (err) {
        console.error('Error fetching pools:', err);
        setInitializedPools([]);
      }
      setIsLoading(false);
    };

    fetchInitializedPools();
  }, [client, refreshKey]);

  if (isLoading) {
    return (
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Pool Information</h3>
        <p style={{ color: colors.textMuted, textAlign: 'center' }}>
          Loading pools...
        </p>
      </div>
    );
  }

  if (initializedPools.length === 0) {
    return (
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Pool Information</h3>
        <p style={{ color: colors.textMuted, textAlign: 'center' }}>
          No pools initialized yet. Initialize a pool below.
        </p>
      </div>
    );
  }

  if (!selectedPool) {
    return (
      <div style={styles.card}>
        <h3 style={styles.cardTitle}>Pool Information</h3>
        <p style={{ color: colors.textMuted, textAlign: 'center' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>Pool Information</h3>
      <label style={styles.label}>
        Select Pool
        <select
          value={selectedPool.mint.toBase58()}
          onChange={(e) => {
            const pool = initializedPools.find(p => p.mint.toBase58() === e.target.value);
            if (pool) setSelectedPool(pool);
          }}
          style={styles.input}
        >
          {initializedPools.map(pool => (
            <option key={pool.mint.toBase58()} value={pool.mint.toBase58()}>
              {pool.symbol} {pool.name ? `- ${pool.name}` : ''}
            </option>
          ))}
        </select>
      </label>
      <PoolInfo
        key={`${refreshKey}-${selectedPool.mint.toBase58()}`}
        tokenMint={selectedPool.mint}
        decimals={selectedPool.decimals}
        symbol={selectedPool.symbol || 'Token'}
      />
    </div>
  );
}

function ShieldTab({ solanaPublicKey }: { solanaPublicKey: PublicKey | null }) {
  if (!solanaPublicKey) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>Connect your Solana wallet to shield tokens</p>
      </div>
    );
  }

  return <ShieldFormWithFilter solanaPublicKey={solanaPublicKey} />;
}

function ShieldFormWithFilter({ solanaPublicKey }: { solanaPublicKey: PublicKey }) {
  const { sync } = useCloakCraft();

  // Use the same hook pattern as Account tab
  const tokenMints = useMemo(() => DEVNET_TOKENS.map((t) => t.mint), []);
  const { getBalance, isLoading } = useTokenBalances(tokenMints, solanaPublicKey);

  // Filter to only show tokens with non-zero balance ONLY after loading completes
  const availableTokens = useMemo(() => {
    if (isLoading) return []; // Don't filter while loading
    return DEVNET_TOKENS.filter((token) => {
      const balance = getBalance(token.mint);
      return balance > BigInt(0);
    });
  }, [getBalance, isLoading]);

  // Only set selected token after we have available tokens (no default)
  const [selectedToken, setSelectedToken] = useState<typeof DEVNET_TOKENS[0] | null>(null);

  // Set first available token once loaded
  useEffect(() => {
    if (!isLoading && availableTokens.length > 0 && !selectedToken) {
      setSelectedToken(availableTokens[0]);
    }
  }, [isLoading, availableTokens, selectedToken]);

  const userTokenAccount = useMemo(() => {
    if (!solanaPublicKey || !selectedToken) return null;
    try {
      return getAssociatedTokenAddressSync(selectedToken.mint, solanaPublicKey);
    } catch {
      return null;
    }
  }, [solanaPublicKey, selectedToken]);

  if (isLoading) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>Loading available tokens...</p>
      </div>
    );
  }

  if (availableTokens.length === 0) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>No tokens available to shield</p>
      </div>
    );
  }

  if (!selectedToken) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>Loading...</p>
      </div>
    );
  }

  return (
    <ShieldForm
      tokenMint={selectedToken.mint}
      userTokenAccount={userTokenAccount}
      decimals={selectedToken.decimals}
      symbol={selectedToken.symbol}
      walletPublicKey={solanaPublicKey}
      tokens={availableTokens}
      onTokenChange={setSelectedToken}
      onSuccess={async (tx) => {
        console.log('Shield success:', tx);
        alert(`Shielded successfully!\nTX: ${tx}`);
        // Rescan all pools to find new shielded notes
        await sync(undefined, true);
      }}
      onError={(err) => {
        console.error('Shield error:', err);
        alert(`Shield error: ${err}`);
      }}
    />
  );
}

function TransferTab({ walletPublicKey }: { walletPublicKey: PublicKey | null }) {
  return <TransferFormWithFilter walletPublicKey={walletPublicKey} />;
}

function TransferFormWithFilter({ walletPublicKey }: { walletPublicKey: PublicKey | null }) {
  const { sync } = useCloakCraft();

  // Get available tokens with private balance using hooks
  const tokenBalances = DEVNET_TOKENS.map((token) => {
    const { totalAvailable } = useNoteSelector(token.mint);
    return { token, balance: totalAvailable };
  });

  const availableTokens = tokenBalances
    .filter(({ balance }) => balance > BigInt(0))
    .map(({ token }) => token);

  // Only set selected token after we have available tokens (no default)
  const [selectedToken, setSelectedToken] = useState<typeof DEVNET_TOKENS[0] | null>(null);

  // Set first available token once we have data
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedToken) {
      setSelectedToken(availableTokens[0]);
    }
  }, [availableTokens, selectedToken]);

  if (availableTokens.length === 0) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>
          No private balances available. Shield some tokens first.
        </p>
      </div>
    );
  }

  if (!selectedToken) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>Loading...</p>
      </div>
    );
  }

  return (
    <TransferForm
      tokenMint={selectedToken.mint}
      decimals={selectedToken.decimals}
      symbol={selectedToken.symbol}
      walletPublicKey={walletPublicKey}
      tokens={availableTokens}
      onTokenChange={setSelectedToken}
      onSuccess={async (tx) => {
        console.log('Transfer success:', tx);
        alert(`Transferred successfully!\nTX: ${tx}`);
        // Rescan all pools to find output and change notes
        await sync(undefined, true);
      }}
      onError={(err) => {
        console.error('Transfer error:', err);
        alert(`Transfer error: ${err}`);
      }}
    />
  );
}

function UnshieldTab({ walletPublicKey }: { walletPublicKey: PublicKey | null }) {
  return <UnshieldFormWithFilter walletPublicKey={walletPublicKey} />;
}

function UnshieldFormWithFilter({ walletPublicKey }: { walletPublicKey: PublicKey | null }) {
  const { sync } = useCloakCraft();

  // Get available tokens with private balance using hooks
  const tokenBalances = DEVNET_TOKENS.map((token) => {
    const { totalAvailable } = useNoteSelector(token.mint);
    return { token, balance: totalAvailable };
  });

  const availableTokens = tokenBalances
    .filter(({ balance }) => balance > BigInt(0))
    .map(({ token }) => token);

  // Only set selected token after we have available tokens (no default)
  const [selectedToken, setSelectedToken] = useState<typeof DEVNET_TOKENS[0] | null>(null);

  // Set first available token once we have data
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedToken) {
      setSelectedToken(availableTokens[0]);
    }
  }, [availableTokens, selectedToken]);

  if (availableTokens.length === 0) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>
          No private balances available. Shield some tokens first.
        </p>
      </div>
    );
  }

  if (!selectedToken) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>Loading...</p>
      </div>
    );
  }

  return (
    <UnshieldForm
      tokenMint={selectedToken.mint}
      decimals={selectedToken.decimals}
      symbol={selectedToken.symbol}
      walletPublicKey={walletPublicKey}
      tokens={availableTokens}
      onTokenChange={setSelectedToken}
      onSuccess={async (tx) => {
        console.log('Unshield success:', tx);
        alert(`Unshielded successfully!\nTX: ${tx}`);
        // Rescan all pools to find change notes
        await sync(undefined, true);
      }}
      onError={(err) => {
        console.error('Unshield error:', err);
        alert(`Unshield error: ${err}`);
      }}
    />
  );
}

function NotesTab() {
  const { wallet, notes, sync } = useCloakCraft();
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<Date | null>(null);

  const handleScan = async () => {
    if (!wallet) return;

    setIsScanning(true);
    setScanError(null);

    try {
      await sync(); // Use provider's sync method to properly update notes state
      setLastScanned(new Date());
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed');
      console.error('[NotesTab] Scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Count notes per token for display
  const noteCountsByToken = useMemo(() => {
    const counts = new Map<string, number>();
    notes.forEach((note) => {
      if (note.tokenMint) {
        const key = note.tokenMint.toBase58();
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return counts;
  }, [notes]);

  if (!wallet) {
    return (
      <div style={{ ...styles.card, textAlign: 'center' }}>
        <p style={{ color: colors.textMuted }}>
          Connect your stealth wallet to view notes
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Scanner Control Card */}
      <div style={styles.card}>
        <div style={{ ...styles.spaceBetween, marginBottom: '16px' }}>
          <div>
            <h3 style={{ ...styles.cardTitle, margin: 0 }}>Notes Scanner</h3>
            <p style={{ fontSize: '0.875rem', color: colors.textMuted, marginTop: '4px' }}>
              {notes.length} note{notes.length !== 1 ? 's' : ''} found
              {lastScanned && ` • Last scanned: ${lastScanned.toLocaleTimeString()}`}
            </p>
          </div>
          <button
            onClick={handleScan}
            disabled={isScanning}
            style={{
              ...styles.buttonPrimary,
              ...(isScanning ? styles.buttonDisabled : {}),
            }}
          >
            {isScanning ? 'Scanning...' : 'Scan for Notes'}
          </button>
        </div>

        {scanError && (
          <div style={{ ...styles.errorText, marginTop: '12px' }}>
            {scanError}
          </div>
        )}

        {notes.length === 0 && !isScanning && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: colors.textMuted }}>
            <p>No notes found. Click "Scan for Notes" to search for your shielded assets.</p>
          </div>
        )}
      </div>

      {/* Token Notes Lists - Show only tokens with notes */}
      {DEVNET_TOKENS.filter((token) => {
        const noteCount = noteCountsByToken.get(token.mint.toBase58()) || 0;
        return noteCount > 0;
      }).map((token) => (
        <div key={token.mint.toBase58()}>
          <BalanceDisplay
            tokenMint={token.mint}
            decimals={token.decimals}
            symbol={token.symbol}
          />
          <NotesList
            tokenMint={token.mint}
            decimals={token.decimals}
            symbol={token.symbol}
          />
        </div>
      ))}
    </>
  );
}
