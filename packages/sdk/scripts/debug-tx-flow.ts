/**
 * Debug script to trace the entire transaction flow step by step
 * Run with: npx ts-node scripts/debug-tx-flow.ts
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { IDL } from '../src/idl';

// Configuration
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=59353f30-dd17-43ae-9913-3599b9d99b11';
const PROGRAM_ID = new PublicKey('2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG');

// Test tokens (devnet)
const TOKEN_A = new PublicKey('So11111111111111111111111111111111111111112'); // WSOL
const TOKEN_B = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // USDC devnet

async function main() {
  console.log('='.repeat(80));
  console.log('DEBUG: Transaction Flow Trace');
  console.log('='.repeat(80));

  // STEP 1: Create Connection
  console.log('\n[STEP 1] Creating Connection...');
  const connection = new Connection(RPC_URL, 'confirmed');
  console.log('  Connection endpoint:', RPC_URL);
  console.log('  Connection commitment:', 'confirmed');

  // STEP 2: Create a test wallet (simulating wallet adapter)
  console.log('\n[STEP 2] Creating test wallet (simulating wallet adapter)...');
  const testKeypair = Keypair.generate();
  console.log('  Wallet publicKey:', testKeypair.publicKey.toBase58());

  // Simulate wallet adapter object (what the browser wallet provides)
  const walletAdapter = {
    publicKey: testKeypair.publicKey,
    signTransaction: async <T extends Transaction>(tx: T): Promise<T> => {
      console.log('  [WALLET ADAPTER] signTransaction called');
      console.log('  [WALLET ADAPTER] Transaction details:');
      if (tx instanceof Transaction) {
        console.log('    - Type: Legacy Transaction');
        console.log('    - Instructions count:', tx.instructions.length);
        tx.instructions.forEach((ix, i) => {
          console.log(`    - Instruction ${i}:`);
          console.log(`      - programId: ${ix.programId.toBase58()}`);
          console.log(`      - keys count: ${ix.keys.length}`);
          console.log(`      - data length: ${ix.data.length}`);
          console.log(`      - data (hex): ${ix.data.toString('hex').substring(0, 64)}...`);
        });
      } else {
        console.log('    - Type: VersionedTransaction');
      }
      // In real scenario, this is where wallet popup would appear
      // and wallet would simulate the transaction
      return tx;
    },
    signAllTransactions: async <T extends Transaction>(txs: T[]): Promise<T[]> => {
      console.log('  [WALLET ADAPTER] signAllTransactions called, count:', txs.length);
      return txs;
    },
  };

  // STEP 3: Create AnchorProvider (what CloakCraftClient.setWallet does)
  console.log('\n[STEP 3] Creating AnchorProvider...');
  const provider = new AnchorProvider(connection, walletAdapter as any, {
    commitment: 'confirmed',
  });
  console.log('  Provider created');
  console.log('  Provider.publicKey:', provider.publicKey?.toBase58());
  console.log('  Provider.connection:', provider.connection.rpcEndpoint);

  // STEP 4: Create Program (what CloakCraftClient.initProgram does)
  console.log('\n[STEP 4] Creating Program...');
  console.log('  IDL address:', (IDL as any).address);
  console.log('  IDL metadata.name:', (IDL as any).metadata?.name);
  console.log('  IDL spec:', (IDL as any).metadata?.spec);

  const program = new Program(IDL as any, provider);
  console.log('  Program created');
  console.log('  Program.programId:', program.programId.toBase58());

  // Verify program ID matches
  if (program.programId.toBase58() !== PROGRAM_ID.toBase58()) {
    console.log('  ⚠️  WARNING: Program ID mismatch!');
    console.log('    Expected:', PROGRAM_ID.toBase58());
    console.log('    Got:', program.programId.toBase58());
  } else {
    console.log('  ✓ Program ID matches expected');
  }

  // STEP 4b: Verify program account exists on chain
  console.log('\n[STEP 4b] Verifying program exists on devnet...');
  const programAccountInfo = await connection.getAccountInfo(PROGRAM_ID);
  if (programAccountInfo) {
    console.log('  ✓ Program account EXISTS on devnet');
    console.log('    - Owner:', programAccountInfo.owner.toBase58());
    console.log('    - Executable:', programAccountInfo.executable);
    console.log('    - Lamports:', programAccountInfo.lamports);
    console.log('    - Data length:', programAccountInfo.data.length);
  } else {
    console.log('  ✗ Program account DOES NOT EXIST on devnet!');
    console.log('    This is the cause of "Attempt to load a program that does not exist"');
  }

  // STEP 5: Prepare instruction arguments
  console.log('\n[STEP 5] Preparing instruction arguments...');

  // Sort tokens into canonical order
  const [canonicalA, canonicalB] = TOKEN_A.toBuffer().compare(TOKEN_B.toBuffer()) < 0
    ? [TOKEN_A, TOKEN_B]
    : [TOKEN_B, TOKEN_A];

  console.log('  Token A (original):', TOKEN_A.toBase58());
  console.log('  Token B (original):', TOKEN_B.toBase58());
  console.log('  Canonical A:', canonicalA.toBase58());
  console.log('  Canonical B:', canonicalB.toBase58());

  const feeBps = 30;
  const poolTypeEnum = { constantProduct: {} };
  const amplification = new BN(0);

  console.log('  Fee BPS:', feeBps);
  console.log('  Pool Type:', JSON.stringify(poolTypeEnum));
  console.log('  Amplification:', amplification.toString());

  // STEP 6: Build the MethodsBuilder
  console.log('\n[STEP 6] Building MethodsBuilder...');

  const methodsBuilder = program.methods
    .initializeAmmPool(
      canonicalA,
      canonicalB,
      feeBps,
      poolTypeEnum,
      amplification
    )
    .accountsPartial({
      tokenAMintAccount: canonicalA,
      tokenBMintAccount: canonicalB,
    });

  console.log('  MethodsBuilder created');

  // STEP 7: Get resolved accounts
  console.log('\n[STEP 7] Resolving accounts...');
  try {
    const resolvedKeys = await methodsBuilder.pubkeys();
    console.log('  Resolved accounts:');
    for (const [name, pubkey] of Object.entries(resolvedKeys)) {
      if (pubkey && typeof pubkey === 'object' && 'toBase58' in pubkey) {
        console.log(`    - ${name}: ${(pubkey as PublicKey).toBase58()}`);
      } else {
        console.log(`    - ${name}: ${pubkey}`);
      }
    }
  } catch (err) {
    console.log('  Error resolving accounts:', err);
  }

  // STEP 8: Build the instruction
  console.log('\n[STEP 8] Building instruction...');
  try {
    const instruction = await methodsBuilder.instruction();
    console.log('  Instruction built:');
    console.log('    - programId:', instruction.programId.toBase58());
    console.log('    - data length:', instruction.data.length);
    console.log('    - data (hex):', Buffer.from(instruction.data).toString('hex'));
    console.log('    - keys count:', instruction.keys.length);
    instruction.keys.forEach((key, i) => {
      console.log(`    - key[${i}]: ${key.pubkey.toBase58()} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
    });
  } catch (err) {
    console.log('  Error building instruction:', err);
  }

  // STEP 9: Build the transaction
  console.log('\n[STEP 9] Building transaction...');
  try {
    const tx = await methodsBuilder.transaction();
    console.log('  Transaction built:');
    console.log('    - Instructions count:', tx.instructions.length);
    console.log('    - Fee payer:', tx.feePayer?.toBase58());
    console.log('    - Recent blockhash:', tx.recentBlockhash);

    tx.instructions.forEach((ix, i) => {
      console.log(`    - Instruction ${i}:`);
      console.log(`      - programId: ${ix.programId.toBase58()}`);
      console.log(`      - data (hex): ${ix.data.toString('hex').substring(0, 64)}...`);
    });
  } catch (err) {
    console.log('  Error building transaction:', err);
  }

  // STEP 10: Simulate the transaction (what our app does)
  console.log('\n[STEP 10] Simulating transaction (app-side)...');
  try {
    const simResult = await methodsBuilder.simulate();
    console.log('  ✓ Simulation SUCCESS');
    console.log('  Full result:', JSON.stringify(simResult, null, 2));
  } catch (err: any) {
    console.log('  ✗ Simulation FAILED');
    console.log('  Error message:', err.message);
    console.log('  Error name:', err.name);
    console.log('  Error code:', err.code);
    console.log('  Full error:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    if (err.logs) {
      console.log('  Logs:');
      err.logs.forEach((log: string) => console.log('    ', log));
    }
    if (err.simulationResponse) {
      console.log('  SimulationResponse:', JSON.stringify(err.simulationResponse, null, 2));
    }
  }

  // STEP 10b: Try raw connection simulation
  console.log('\n[STEP 10b] Raw connection.simulateTransaction...');
  try {
    const tx = await methodsBuilder.transaction();
    tx.feePayer = testKeypair.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    const simResult = await connection.simulateTransaction(tx);
    console.log('  Simulation result:');
    console.log('    - err:', JSON.stringify(simResult.value.err));
    console.log('    - logs:');
    simResult.value.logs?.forEach((log: string) => console.log('      ', log));
  } catch (err: any) {
    console.log('  Raw simulation error:', err.message);
  }

  // STEP 11: Try to call .rpc() - this will trigger wallet signing
  console.log('\n[STEP 11] Calling .rpc() (this triggers wallet.signTransaction)...');
  console.log('  NOTE: This will fail because test wallet has no SOL, but we can see what gets passed to wallet');

  try {
    const signature = await methodsBuilder.rpc();
    console.log('  ✓ Transaction sent:', signature);
  } catch (err: any) {
    console.log('  ✗ RPC failed (expected):', err.message);

    // Check if the error contains simulation details
    if (err.logs) {
      console.log('  Transaction logs:');
      err.logs.forEach((log: string) => console.log('    ', log));
    }

    if (err.simulationResponse) {
      console.log('  Simulation response:', JSON.stringify(err.simulationResponse, null, 2));
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('DEBUG COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
