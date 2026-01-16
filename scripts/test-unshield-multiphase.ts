/**
 * Test unshield with new multi-phase verification
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { CloakCraftClient } from '../packages/sdk/src/client';
import { loadWallet } from '../packages/sdk/src/wallet';
import { initPoseidon } from '../packages/sdk/src/crypto/poseidon';
import { generateStealthAddress } from '../packages/sdk/src/crypto/stealth';
import * as anchor from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '88ac54a3-8850-4686-a521-70d116779182';
const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function main() {
  console.log('='.repeat(80));
  console.log('TESTING MULTI-PHASE UNSHIELD WITH FIXED VERIFICATION');
  console.log('='.repeat(80));

  // Initialize Poseidon first
  await initPoseidon();

  // Load test data
  const testDataPath = path.join(__dirname, '.test-data.json');
  if (!fs.existsSync(testDataPath)) {
    console.error('\n❌ No test data found. Run scripts/sdk-shield.ts first to create test data.');
    return;
  }
  const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  const TOKEN_MINT = new PublicKey(testData.mint);

  // Load Solana wallet
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))));

  console.log('\nWallet:', wallet.publicKey.toBase58());
  console.log('Program:', PROGRAM_ID.toBase58());
  console.log('Token Mint:', TOKEN_MINT.toBase58());

  // Initialize client
  const client = new CloakCraftClient({
    rpcUrl: RPC_URL,
    programId: PROGRAM_ID,
    indexerUrl: '',
    heliusApiKey: HELIUS_API_KEY,
    network: 'devnet',
    nodeProverConfig: {
      circuitsDir: path.join(__dirname, '..', 'apps', 'demo', 'public', 'circuits'),
      circomBuildDir: path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom'),
    },
  });

  // Load IDL and set program
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'cloakcraft.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const connection = new Connection(RPC_URL, 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: 'confirmed' });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);
  client.setProgram(program);

  // Load privacy wallet from test data
  await client.loadWallet(new Uint8Array(testData.walletSpendingKey));
  console.log('Privacy wallet loaded');

  // Initialize prover
  console.log('\nInitializing cryptographic primitives...');

  // Manually configure circom base URL for Node.js
  const circomBuildDir = path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom');
  (client as any).proofGenerator.setCircomBaseUrl(circomBuildDir);

  await client.initializeProver(['transfer/1x2']);
  
  // Scan for notes
  console.log('\nScanning for shielded notes...');
  const notes = await client.scanNotes(TOKEN_MINT);
  console.log(`Found ${notes.length} notes`);
  
  if (notes.length === 0) {
    console.log('\n❌ No notes found. Please shield some tokens first.');
    return;
  }
  
  // Use the first note
  const note = notes[0];
  console.log('\nNote details:');
  console.log('- Amount:', note.amount.toString());
  console.log('- Pool:', note.pool.toBase58());
  console.log('- Leaf Index:', note.leafIndex);
  console.log('- Account Hash:', note.accountHash);
  
  // Get recipient token account
  const recipientAta = getAssociatedTokenAddressSync(TOKEN_MINT, wallet.publicKey);
  
  // Unshield the note
  const unshieldAmount = note.amount;
  console.log(`\n=== UNSHIELD ${unshieldAmount} tokens ===\n`);

  try {
    // Generate stealth address for dummy output (circuit requires at least one output)
    const privacyWallet = client.getWallet();
    if (!privacyWallet) {
      throw new Error('Privacy wallet not loaded');
    }
    const { stealthAddress } = generateStealthAddress(privacyWallet.publicKey);

    // Call prepareAndTransfer which will compute commitments for outputs
    // Circuit requires at least one output, so create a dummy zero-amount output
    const result = await client.prepareAndTransfer(
      {
        inputs: [note],
        outputs: [{
          recipient: stealthAddress,
          amount: 0n, // Dummy zero-amount output
          tokenMint: TOKEN_MINT,
        }],
        unshield: {
          amount: unshieldAmount,
          recipient: recipientAta,
        },
      },
      wallet // Pass Solana wallet as relayer for signing
    );
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ UNSHIELD SUCCESS!');
    console.log('='.repeat(80));
    console.log('Transaction signature:', result.signature);
    console.log('\nThe multi-phase verification worked correctly:');
    console.log('  Phase 0: ✅ Created pending operation + verified ZK proof');
    console.log('  Phase 1: ✅ Verified commitment exists (with_read_only_accounts)');
    console.log('  Phase 2: ✅ Created nullifier (prevents double-spend)');
    console.log('  Phase 3: ✅ Processed unshield');
    console.log('  Final:   ✅ Closed pending operation');
    
  } catch (error: any) {
    console.log('\n❌ UNSHIELD FAILED');
    console.log('Error:', error.message);
    if (error.logs) {
      console.log('\nTransaction logs:');
      error.logs.forEach((log: string) => console.log('  ', log));
    }
    throw error;
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
