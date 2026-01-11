'use client';

import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { CloakCraftProvider } from '@cloakcraft/hooks';
import { PROGRAM_ID } from '@cloakcraft/sdk';

import '@solana/wallet-adapter-react-ui/styles.css';

// Demo configuration
const DEMO_CONFIG = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
  indexerUrl: process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer.cloakcraft.io',
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || PROGRAM_ID.toBase58(),
  network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta',
  heliusApiKey: process.env.NEXT_PUBLIC_HELIUS_API_KEY,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <html lang="en">
      <head>
        <title>CloakCraft Demo</title>
        <meta name="description" content="Privacy-preserving token transfers on Solana" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>{`
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: #0a0a0f;
            color: #e4e4e7;
            min-height: 100vh;
          }
          a {
            color: inherit;
            text-decoration: none;
          }
          .wallet-adapter-button {
            background: #6366f1 !important;
          }
          .wallet-adapter-modal-wrapper {
            background: rgba(0,0,0,0.8) !important;
          }
        `}</style>
      </head>
      <body>
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
      </body>
    </html>
  );
}
