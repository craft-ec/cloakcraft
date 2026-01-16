'use client';

import { useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { ConnectionProvider, WalletProvider, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { useCloakCraft, CloakCraftProvider } from '@cloakcraft/hooks';
import { Program, AnchorProvider, setProvider } from '@coral-xyz/anchor';
import { RPC_URL, INDEXER_URL, NETWORK, HELIUS_API_KEY, ADDRESS_LOOKUP_TABLES, PROGRAM_ID } from './constants';
import { IDL } from '@cloakcraft/sdk/idl';

import '@solana/wallet-adapter-react-ui/styles.css';

// Dynamically import CloakCraftProvider to prevent SSR issues
const CloakCraftProviderDynamic = dynamic(
  () => import('@cloakcraft/hooks').then((mod) => mod.CloakCraftProvider),
  { ssr: false }
);

/**
 * Inner provider that sets up Anchor program after wallet connection
 */
function AnchorProgramSetup({ children }: { children: React.ReactNode }) {
  const { publicKey, signTransaction, signAllTransactions } = useSolanaWallet();
  const { setProgram, client } = useCloakCraft();

  useEffect(() => {
    if (publicKey && signTransaction && signAllTransactions && client) {
      // Create Anchor wallet adapter
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };

      // Create Anchor provider
      const provider = new AnchorProvider(client.connection, wallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });
      setProvider(provider);

      // Create program instance
      const program = new Program(IDL as any, provider);
      setProgram(program);
    }
  }, [publicKey, signTransaction, signAllTransactions, client, setProgram]);

  return <>{children}</>;
}

/**
 * CloakCraft wrapper with wallet pubkey for per-wallet stealth storage
 */
function CloakCraftWrapper({ children }: { children: React.ReactNode }) {
  const { publicKey } = useSolanaWallet();

  return (
    <CloakCraftProviderDynamic
      rpcUrl={RPC_URL}
      indexerUrl={INDEXER_URL}
      programId={PROGRAM_ID.toBase58()}
      network={NETWORK}
      heliusApiKey={HELIUS_API_KEY}
      solanaWalletPubkey={publicKey?.toBase58()}
      addressLookupTables={ADDRESS_LOOKUP_TABLES}
    >
      <AnchorProgramSetup>{children}</AnchorProgramSetup>
    </CloakCraftProviderDynamic>
  );
}

/**
 * Root providers for the application
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const wallets = useMemo(
    () => [new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <CloakCraftWrapper>{children}</CloakCraftWrapper>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
