'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { ConnectionProvider, WalletProvider, useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import {
  Transaction,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';

import '@solana/wallet-adapter-react-ui/styles.css';

const RPC_URL = 'https://api.devnet.solana.com';

function TestContent() {
  const wallet = useWallet();
  const { publicKey, signTransaction, sendTransaction } = wallet;
  // signAndSendTransaction is Phantom-specific, access via adapter
  const signAndSendTransaction = (wallet as any).signAndSendTransaction;
  const { connection } = useConnection();
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const log = (msg: string) => {
    console.log(msg);
    setResults((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  const clearLogs = () => setResults([]);

  // Method 1: Manual sign + sendRawTransaction (Legacy Transaction)
  const testMethod1 = async () => {
    if (!publicKey || !signTransaction) return;
    setIsLoading(true);
    log('=== Method 1: Manual sign + sendRawTransaction (Legacy) ===');

    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000,
        })
      );

      tx.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;

      log('Requesting wallet signature...');
      const signedTx = await signTransaction(tx);
      log('Signed! Sending raw transaction...');

      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      log(`Sent! Signature: ${signature}`);
      log('Waiting for confirmation...');

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      log(`SUCCESS: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (err: any) {
      log(`ERROR: ${err.message}`);
    }
    setIsLoading(false);
  };

  // Method 2: sendTransaction from wallet adapter (Legacy Transaction)
  const testMethod2 = async () => {
    if (!publicKey || !sendTransaction) return;
    setIsLoading(true);
    log('=== Method 2: sendTransaction from wallet adapter (Legacy) ===');

    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000,
        })
      );

      log('Calling sendTransaction...');
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      log(`Sent! Signature: ${signature}`);
      log('Waiting for confirmation...');

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      log(`SUCCESS: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (err: any) {
      log(`ERROR: ${err.message}`);
    }
    setIsLoading(false);
  };

  // Method 3: Versioned Transaction with manual sign + send
  const testMethod3 = async () => {
    if (!publicKey || !signTransaction) return;
    setIsLoading(true);
    log('=== Method 3: Versioned Transaction (manual sign + send) ===');

    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: publicKey,
            lamports: 1000,
          }),
        ],
      }).compileToV0Message();

      const versionedTx = new VersionedTransaction(messageV0);

      log('Requesting wallet signature for versioned tx...');
      const signedTx = await signTransaction(versionedTx);
      log('Signed! Sending raw transaction...');

      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      log(`Sent! Signature: ${signature}`);
      log('Waiting for confirmation...');

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      log(`SUCCESS: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (err: any) {
      log(`ERROR: ${err.message}`);
    }
    setIsLoading(false);
  };

  // Method 4: sendTransaction with Versioned Transaction
  const testMethod4 = async () => {
    if (!publicKey || !sendTransaction) return;
    setIsLoading(true);
    log('=== Method 4: sendTransaction with Versioned Transaction ===');

    try {
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: publicKey,
            lamports: 1000,
          }),
        ],
      }).compileToV0Message();

      const versionedTx = new VersionedTransaction(messageV0);

      log('Calling sendTransaction with versioned tx...');
      const signature = await sendTransaction(versionedTx, connection, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      log(`Sent! Signature: ${signature}`);
      log('Waiting for confirmation...');

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      log(`SUCCESS: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (err: any) {
      log(`ERROR: ${err.message}`);
    }
    setIsLoading(false);
  };

  // Method 5: signAndSendTransaction (if available - Phantom specific)
  const testMethod5 = async () => {
    if (!publicKey || !signAndSendTransaction) {
      log('signAndSendTransaction not available on this wallet');
      return;
    }
    setIsLoading(true);
    log('=== Method 5: signAndSendTransaction (Phantom native) ===');

    try {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 1000,
        })
      );

      tx.feePayer = publicKey;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;

      log('Calling signAndSendTransaction...');
      const { signature } = await signAndSendTransaction(tx);

      log(`Sent! Signature: ${signature}`);
      log('Waiting for confirmation...');

      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
      log(`SUCCESS: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    } catch (err: any) {
      log(`ERROR: ${err.message}`);
    }
    setIsLoading(false);
  };

  return (
    <div>
      <h1 style={{ marginBottom: '1rem' }}>Wallet Transaction Test</h1>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Test different transaction methods to see which one works correctly.
      </p>

      <div style={{ marginBottom: '2rem' }}>
        <WalletMultiButton />
      </div>

      {publicKey && (
        <>
          <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', marginBottom: '2rem' }}>
            Connected: {publicKey.toBase58()}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
            <button onClick={testMethod1} disabled={isLoading} style={buttonStyle}>
              Method 1: Manual sign + sendRawTransaction (Legacy)
            </button>
            <button onClick={testMethod2} disabled={isLoading} style={buttonStyle}>
              Method 2: sendTransaction from adapter (Legacy)
            </button>
            <button onClick={testMethod3} disabled={isLoading} style={buttonStyle}>
              Method 3: Versioned TX + manual sign/send
            </button>
            <button onClick={testMethod4} disabled={isLoading} style={buttonStyle}>
              Method 4: sendTransaction with Versioned TX
            </button>
            <button onClick={testMethod5} disabled={isLoading || !signAndSendTransaction} style={buttonStyle}>
              Method 5: signAndSendTransaction (Phantom native)
            </button>
            <button onClick={clearLogs} style={{ ...buttonStyle, background: '#666' }}>
              Clear Logs
            </button>
          </div>

          <div
            style={{
              background: '#1a1a1a',
              color: '#0f0',
              padding: '1rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              maxHeight: '400px',
              overflow: 'auto',
            }}
          >
            {results.length === 0 ? (
              <p style={{ color: '#666' }}>Click a button to test...</p>
            ) : (
              results.map((r, i) => <div key={i}>{r}</div>)
            )}
          </div>
        </>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  background: '#512da8',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '0.875rem',
  textAlign: 'left',
};

// Wrap with providers - must be dynamic to avoid SSR
function WalletWrapper() {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <TestContent />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Dynamic import to prevent SSR
const DynamicWalletWrapper = dynamic(() => Promise.resolve(WalletWrapper), {
  ssr: false,
});

export default function TestWalletPage() {
  return <DynamicWalletWrapper />;
}
