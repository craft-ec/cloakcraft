'use client';

import { useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ConnectionProvider, WalletProvider, useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

const CloakCraftProvider = dynamic(
  () => import('@cloakcraft/hooks').then((mod) => mod.CloakCraftProvider),
  { ssr: false }
);


const DEMO_CONFIG = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
  indexerUrl: process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer.cloakcraft.io',
  programId: process.env.NEXT_PUBLIC_PROGRAM_ID || 'fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP',
  network: (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta',
  heliusApiKey: process.env.NEXT_PUBLIC_HELIUS_API_KEY,
};

// IDL for the program (minimal version for initialization)
const IDL = {
  version: '0.1.0',
  name: 'cloakcraft',
  instructions: [
    {
      name: 'initializePool',
      accounts: [
        { name: 'pool', isMut: true, isSigner: false },
        { name: 'tokenVault', isMut: true, isSigner: false },
        { name: 'tokenMint', isMut: false, isSigner: false },
        { name: 'authority', isMut: false, isSigner: true },
        { name: 'payer', isMut: true, isSigner: true },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'initializeNullifierCounter',
      accounts: [
        { name: 'counter', isMut: true, isSigner: false },
        { name: 'pool', isMut: false, isSigner: false },
        { name: 'payer', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [],
  errors: [],
};

function ProgramSetup({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const wallet = useWallet();

  useEffect(() => {
    async function setupProgram() {
      if (!wallet.publicKey || !wallet.signTransaction) return;

      try {
        const { useCloakCraft } = await import('@cloakcraft/hooks');
        // We can't use hooks here, so we'll set up the program in DemoApp
      } catch (err) {
        console.error('Failed to setup program:', err);
      }
    }

    setupProgram();
  }, [connection, wallet.publicKey, wallet.signTransaction]);

  return <>{children}</>;
}

// Inner component that has access to wallet context
function CloakCraftWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useWallet();

  return (
    <CloakCraftProvider
      rpcUrl={DEMO_CONFIG.rpcUrl}
      indexerUrl={DEMO_CONFIG.indexerUrl}
      programId={DEMO_CONFIG.programId}
      network={DEMO_CONFIG.network}
      heliusApiKey={DEMO_CONFIG.heliusApiKey}
      solanaWalletPubkey={publicKey?.toBase58()}
    >
      {children}
    </CloakCraftProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={DEMO_CONFIG.rpcUrl}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <CloakCraftWrapper>
            {children}
          </CloakCraftWrapper>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
