/**
 * Debug script using CloakCraftClient - exactly like the web app
 * Run with: npx tsx scripts/debug-client-flow.ts
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { CloakCraftClient, AnchorWallet } from '../src/client';

// Configuration (same as web app)
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=59353f30-dd17-43ae-9913-3599b9d99b11';
const PROGRAM_ID = new PublicKey('2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG');
const INDEXER_URL = 'https://indexer.cloakcraft.io';

// Test tokens (devnet)
const TOKEN_A = new PublicKey('So11111111111111111111111111111111111111112'); // WSOL
const TOKEN_B = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // USDC devnet

async function main() {
  console.log('='.repeat(80));
  console.log('DEBUG: CloakCraftClient Flow (exactly like web app)');
  console.log('='.repeat(80));

  // STEP 1: Create Connection (like wallet adapter ConnectionProvider)
  console.log('\n[STEP 1] Creating Connection (like ConnectionProvider)...');
  const connection = new Connection(RPC_URL, 'confirmed');
  console.log('  Connection created:', RPC_URL);

  // STEP 2: Create test wallet (simulating wallet adapter's useWallet)
  console.log('\n[STEP 2] Creating wallet adapter mock...');
  const testKeypair = Keypair.generate();

  let signTransactionCalled = false;
  let transactionPassed: Transaction | null = null;

  const walletAdapter: AnchorWallet = {
    publicKey: testKeypair.publicKey,
    signTransaction: async <T extends Transaction>(tx: T): Promise<T> => {
      signTransactionCalled = true;
      transactionPassed = tx as unknown as Transaction;
      console.log('\n  ========================================');
      console.log('  [WALLET ADAPTER] signTransaction CALLED!');
      console.log('  ========================================');
      console.log('  This is what gets sent to the browser wallet.');

      if (tx instanceof Transaction) {
        console.log('\n  Transaction details:');
        console.log('    - Type: Legacy Transaction');
        console.log('    - Fee payer:', tx.feePayer?.toBase58());
        console.log('    - Recent blockhash:', tx.recentBlockhash);
        console.log('    - Instructions count:', tx.instructions.length);

        tx.instructions.forEach((ix, i) => {
          console.log(`\n    Instruction ${i}:`);
          console.log(`      - programId: ${ix.programId.toBase58()}`);
          console.log(`      - keys count: ${ix.keys.length}`);
          console.log(`      - data length: ${ix.data.length} bytes`);
          console.log(`      - data (hex): ${ix.data.toString('hex')}`);

          console.log(`      - accounts:`);
          ix.keys.forEach((key, j) => {
            console.log(`        [${j}] ${key.pubkey.toBase58()}`);
            console.log(`            signer: ${key.isSigner}, writable: ${key.isWritable}`);
          });
        });

        // Check if any instruction's programId doesn't exist
        console.log('\n  Checking all program IDs...');
        for (const ix of tx.instructions) {
          const accountInfo = await connection.getAccountInfo(ix.programId);
          if (accountInfo) {
            console.log(`    ✓ ${ix.programId.toBase58()} - EXISTS (executable: ${accountInfo.executable})`);
          } else {
            console.log(`    ✗ ${ix.programId.toBase58()} - DOES NOT EXIST!`);
          }
        }
      }

      // Throw to simulate what wallet would do (can't actually sign without private key match)
      throw new Error('TEST: signTransaction intercepted - check logs above');
    },
    signAllTransactions: async <T extends Transaction>(txs: T[]): Promise<T[]> => {
      console.log('  [WALLET ADAPTER] signAllTransactions called, count:', txs.length);
      return txs;
    },
  };
  console.log('  Wallet publicKey:', testKeypair.publicKey.toBase58());

  // STEP 3: Create CloakCraftClient (like CloakCraftProvider does)
  console.log('\n[STEP 3] Creating CloakCraftClient (like CloakCraftProvider)...');
  const client = new CloakCraftClient({
    connection,
    indexerUrl: INDEXER_URL,
    programId: PROGRAM_ID,
    network: 'devnet',
  });
  console.log('  Client created');
  console.log('  Client.programId:', client.programId.toBase58());

  // STEP 4: Set wallet (like WalletSetup component does)
  console.log('\n[STEP 4] Calling client.setWallet (like WalletSetup)...');
  client.setWallet(walletAdapter);
  console.log('  Wallet set');

  const program = client.getProgram();
  if (program) {
    console.log('  Program created internally');
    console.log('  Program.programId:', program.programId.toBase58());
  } else {
    console.log('  ✗ Program NOT created!');
  }

  // STEP 5: Call initializeAmmPool (like CreatePoolForm does)
  console.log('\n[STEP 5] Calling client.initializeAmmPool (like CreatePoolForm)...');
  console.log('  Token A:', TOKEN_A.toBase58());
  console.log('  Token B:', TOKEN_B.toBase58());
  console.log('  Fee BPS: 30');

  try {
    const signature = await client.initializeAmmPool(
      TOKEN_A,
      TOKEN_B,
      30  // 0.3% fee
    );
    console.log('  ✓ Success:', signature);
  } catch (err: any) {
    if (err.message.includes('TEST: signTransaction intercepted')) {
      console.log('\n  ✓ Test complete - transaction was built and passed to wallet');
      console.log('  See details above for what the wallet received');
    } else {
      console.log('\n  ✗ Error BEFORE reaching wallet:', err.message);
      if (err.logs) {
        console.log('  Logs:', err.logs);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('DEBUG COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
