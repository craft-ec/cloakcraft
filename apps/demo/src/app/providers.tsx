'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';

import '@solana/wallet-adapter-react-ui/styles.css';

const CloakCraftProvider = dynamic(
  () => import('@cloakcraft/hooks').then((mod) => mod.CloakCraftProvider),
  { ssr: false }
);

const DEMO_CONFIG = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
  indexerUrl: process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer.cloakcraft.io',
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || 'HsQk1VmzbDwXZnQfevgJvHAfYioFmKJKCBgfuTFKVJAu',
  network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta',
  heliusApiKey: process.env.NEXT_PUBLIC_HELIUS_API_KEY,
};

export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={DEMO_CONFIG.rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <CloakCraftProvider
            rpcUrl={DEMO_CONFIG.rpcUrl}
            indexerUrl={DEMO_CONFIG.indexerUrl}
            programId={DEMO_CONFIG.programId}
            network={DEMO_CONFIG.network}
            heliusApiKey={DEMO_CONFIG.heliusApiKey}
          >
            {children}
          </CloakCraftProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
