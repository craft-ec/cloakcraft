'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { PublicKey } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

const CloakCraftProvider = dynamic(
  () => import('@cloakcraft/hooks').then((mod) => mod.CloakCraftProvider),
  { ssr: false }
);

const DEMO_CONFIG = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
  indexerUrl: process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer.cloakcraft.io',
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || 'FKaC6fnSJYBrssPCtwh94hwg3C38xKzUDAxaK8mfjX3a',
  network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta',
  heliusApiKey: process.env.NEXT_PUBLIC_HELIUS_API_KEY,
  // Address Lookup Table for atomic transaction compression
  addressLookupTables: [
    new PublicKey('3B7MRpzeNnX9uaf1SuJqgNwjtJLLCKQp2Go2hexcxGHa'), // Devnet ALT
  ],
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
            addressLookupTables={DEMO_CONFIG.addressLookupTables.map(key => key.toBase58())}
          >
            {children}
          </CloakCraftProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
