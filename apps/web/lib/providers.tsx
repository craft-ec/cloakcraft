'use client';

import { useMemo, useEffect, useCallback, useState } from 'react';
import { ConnectionProvider, WalletProvider, useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { WalletError } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useStandardWalletAdapters } from '@solana/wallet-standard-wallet-adapter-react';
import { useCloakCraft, CloakCraftProvider } from '@cloakcraft/hooks';
import { DIRECT_RPC_URL, WSS_URL, INDEXER_URL, NETWORK, HELIUS_API_KEY, ADDRESS_LOOKUP_TABLES, PROGRAM_ID } from './constants';
import { DevWalletAdapter } from './dev-wallet-adapter';

import '@solana/wallet-adapter-react-ui/styles.css';

// Import CloakCraftProvider directly (matches scalecraft pattern)
// SSR is handled by 'use client' directive

/**
 * Inner component that sets up wallet in SDK after wallet connection
 * Matches scalecraft pattern exactly - pass wallet functions directly
 */
function WalletSetup({ children }: { children: React.ReactNode }) {
  const wallet = useSolanaWallet();
  const { setWallet, client } = useCloakCraft();

  // Update wallet in client when wallet changes (matches scalecraft exactly)
  useEffect(() => {
    if (client && wallet.publicKey && wallet.signTransaction && wallet.signAllTransactions) {
      // Cast to any to bypass Anchor's payer requirement (matches scalecraft)
      const anchorWallet = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction,
        signAllTransactions: wallet.signAllTransactions,
      } as any;
      setWallet(anchorWallet);
    }
  }, [client, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions, setWallet]);

  return <>{children}</>;
}

/**
 * CloakCraft wrapper that passes wallet adapter's connection to SDK
 * This ensures the SDK uses the SAME connection as wallet adapter (like scalecraft)
 */
function CloakCraftWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useSolanaWallet();
  const { connection } = useConnection();

  return (
    <CloakCraftProvider
      connection={connection}
      indexerUrl={INDEXER_URL}
      programId={PROGRAM_ID.toBase58()}
      network={NETWORK}
      heliusApiKey={HELIUS_API_KEY}
      solanaWalletPubkey={publicKey?.toBase58()}
      addressLookupTables={ADDRESS_LOOKUP_TABLES}
    >
      <WalletSetup>{children}</WalletSetup>
    </CloakCraftProvider>
  );
}

/**
 * Base wallet adapters (legacy)
 */
const baseWallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

/**
 * Inner wallet provider that combines standard wallets with legacy adapters
 * This enables auto-detection of Wallet Standard wallets like Backpack
 */
function WalletProviderWithStandard({ 
  children, 
  onError 
}: { 
  children: React.ReactNode; 
  onError: (error: WalletError) => void;
}) {
  // Combine standard wallets (Backpack, etc.) with legacy adapters
  const wallets = useStandardWalletAdapters(baseWallets);

  return (
    <WalletProvider wallets={wallets} autoConnect onError={onError}>
      <WalletModalProvider>
        <CloakCraftWrapper>{children}</CloakCraftWrapper>
      </WalletModalProvider>
    </WalletProvider>
  );
}

/**
 * Root providers for the application
 */
export function Providers({ children }: { children: React.ReactNode }) {
  // Use state to hold the endpoint - only set after mounting on client
  const [rpcUrl, setRpcUrl] = useState<string | null>(null);

  useEffect(() => {
    // Only runs on client, so window is available
    setRpcUrl(`${window.location.origin}/api/rpc`);
  }, []);

  // Log configuration on mount
  useEffect(() => {
    if (rpcUrl) {
      console.log('[Providers] ======== CONFIGURATION ========');
      console.log('[Providers] RPC_URL (proxy):', rpcUrl);
      console.log('[Providers] DIRECT_RPC_URL:', DIRECT_RPC_URL);
      console.log('[Providers] WSS_URL:', WSS_URL);
      console.log('[Providers] INDEXER_URL:', INDEXER_URL);
      console.log('[Providers] NETWORK:', NETWORK);
      console.log('[Providers] PROGRAM_ID:', PROGRAM_ID.toBase58());
      console.log('[Providers] HELIUS_API_KEY:', HELIUS_API_KEY ? '***' + HELIUS_API_KEY.slice(-4) : 'undefined');
      console.log('[Providers] ====================================');
    }
  }, [rpcUrl]);

  // Connection config with WebSocket for transaction confirmations
  const connectionConfig = useMemo(() => ({
    commitment: 'confirmed' as const,
    wsEndpoint: WSS_URL,
  }), []);

  // Log wallet errors for debugging
  const onError = useCallback((error: WalletError) => {
    console.error('[Wallet] Error:', {
      name: error.name,
      message: error.message,
    });
  }, []);

  // Don't render children until endpoint is set to ensure we use the RPC proxy
  if (!rpcUrl) {
    return null;
  }

  return (
    <ConnectionProvider endpoint={rpcUrl} config={connectionConfig}>
      <WalletProviderWithStandard onError={onError}>
        {children}
      </WalletProviderWithStandard>
    </ConnectionProvider>
  );
}
