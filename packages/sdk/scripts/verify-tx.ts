/**
 * Verify the exact transaction that Phantom receives
 * Run with: npx tsx scripts/verify-tx.ts
 */

import { Connection, Transaction } from '@solana/web3.js';

const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=59353f30-dd17-43ae-9913-3599b9d99b11';

// The exact base64 transaction from the browser
const TX_BASE64 = 'AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAYJmCgGrGv6Rz2zoidfET4N5rUAOA3fOSaBhDgiiIToykVx00E8cJBpxGs5BjHIKb/4o9sbcP7pXjS/waiVz/YLsoyNnkA5T9CtlLoSN0XKQFqGjHDtetXxQu3/AKvlIx/NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAc7JSCGOl4VB+Obx1l7XdBlTfwXk1D7T6ZxbI0lI4BWDtELLORIVfxOpM9ATQoLQMrX/7NAaLb8bd5BgjfAC6nAv0+ft4QudiBtvnuwsH8BOunakFajZkk3d28cHIPgIIGp9UXGSxcUSGMyUw9SvF/WNruCJuh/UTj29mKAAAAAAbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpQsTYQ4nsgJLjyAozFQfRJDIHc1K0az68+QL2R0051pMBBgkCAQQFAAADCAdTFDoTWQ7Bix8c7JSCGOl4VB+Obx1l7XdBlTfwXk1D7T6ZxbI0lI4BWDtELLORIVfxOpM9ATQoLQMrX/7NAaLb8bd5BgjfAC6nHgAAAAAAAAAAAAA=';

async function main() {
  console.log('='.repeat(80));
  console.log('VERIFYING EXACT TRANSACTION FROM BROWSER');
  console.log('='.repeat(80));

  // Decode the transaction
  const txBuffer = Buffer.from(TX_BASE64, 'base64');
  const tx = Transaction.from(txBuffer);

  console.log('\n[Transaction Details]');
  console.log('  Fee payer:', tx.feePayer?.toBase58());
  console.log('  Recent blockhash:', tx.recentBlockhash);
  console.log('  Instructions count:', tx.instructions.length);

  tx.instructions.forEach((ix, i) => {
    console.log(`\n  Instruction ${i}:`);
    console.log(`    programId: ${ix.programId.toBase58()}`);
    console.log(`    keys count: ${ix.keys.length}`);
    console.log(`    data length: ${ix.data.length} bytes`);
    console.log(`    data (hex): ${ix.data.toString('hex')}`);

    ix.keys.forEach((key, j) => {
      console.log(`    account[${j}]: ${key.pubkey.toBase58()} (signer: ${key.isSigner}, writable: ${key.isWritable})`);
    });
  });

  // Create connection to devnet
  console.log('\n[Simulating on Devnet]');
  const connection = new Connection(RPC_URL, 'confirmed');

  // Check if program exists
  const programId = tx.instructions[0].programId;
  console.log(`  Checking if program ${programId.toBase58()} exists...`);
  const programInfo = await connection.getAccountInfo(programId);
  if (programInfo) {
    console.log(`  ✓ Program EXISTS on devnet`);
    console.log(`    - Owner: ${programInfo.owner.toBase58()}`);
    console.log(`    - Executable: ${programInfo.executable}`);
    console.log(`    - Data length: ${programInfo.data.length}`);
  } else {
    console.log(`  ✗ Program DOES NOT EXIST on devnet!`);
  }

  // Simulate the transaction (without signing - just to see if it parses correctly)
  console.log('\n  Simulating transaction...');
  try {
    const simResult = await connection.simulateTransaction(tx);
    console.log('  Simulation result:');
    console.log('    - err:', JSON.stringify(simResult.value.err));
    if (simResult.value.logs) {
      console.log('    - logs:');
      simResult.value.logs.forEach(log => console.log('      ', log));
    }
  } catch (err: any) {
    console.log('  Simulation error:', err.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION COMPLETE');
  console.log('='.repeat(80));
}

main().catch(console.error);
