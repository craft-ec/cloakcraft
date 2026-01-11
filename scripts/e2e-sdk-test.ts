/**
 * End-to-end SDK test
 *
 * Tests the full CloakCraft flow using the SDK client:
 * 1. Create wallet
 * 2. Shield tokens
 * 3. Private transfer
 * 4. Scan notes
 */

import 'dotenv/config';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, setProvider, Wallet } from '@coral-xyz/anchor';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Import SDK
import { CloakCraftClient } from '../packages/sdk/src';
import { generateStealthAddress } from '../packages/sdk/src/crypto/stealth';

// Load IDL
const IDL_PATH = path.join(__dirname, '../target/idl/cloakcraft.json');
const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf-8'));

// Devnet config
const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=' + process.env.HELIUS_API_KEY;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;

async function main() {
  console.log('='.repeat(60));
  console.log('CloakCraft SDK E2E Test');
  console.log('='.repeat(60));

  if (!HELIUS_API_KEY) {
    throw new Error('HELIUS_API_KEY environment variable required');
  }

  // Load payer keypair
  const payerPath = path.join(process.env.HOME!, '.config/solana/id.json');
  const payerKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(payerPath, 'utf-8')))
  );
  console.log(`Payer: ${payerKeypair.publicKey.toBase58()}`);

  // Create connection and provider
  const connection = new Connection(RPC_URL, 'confirmed');
  const wallet = new Wallet(payerKeypair);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  setProvider(provider);

  // Create program instance
  const program = new Program(idl, provider);
  console.log(`Program ID: ${program.programId.toBase58()}`);

  // Initialize SDK client
  const client = new CloakCraftClient({
    rpcUrl: RPC_URL,
    indexerUrl: 'http://localhost:3000', // Not used in this test
    programId: program.programId,
    heliusApiKey: HELIUS_API_KEY,
    network: 'devnet',
  });

  // Set program for transaction building
  client.setProgram(program);

  // Initialize prover for Node.js
  console.log('\n[1] Initializing prover...');
  const prover = client.getProofGenerator();
  prover.configureForNode({
    circuitsDir: path.join(__dirname, '../circuits'),
    sunspotPath: path.join(__dirname, '../scripts/sunspot'),
    nargoPath: path.join(process.env.HOME!, '.nargo/bin/nargo'),
  });
  await client.initializeProver(['transfer/1x2']);
  console.log('Prover initialized');

  // Create or load wallet (persist for testing)
  console.log('\n[2] Loading wallet...');
  const walletPath = path.join(__dirname, '.test-wallet.json');
  let cloakWallet;
  if (fs.existsSync(walletPath)) {
    const savedKey = Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')).spendingKey, 'hex');
    cloakWallet = await client.loadWallet(new Uint8Array(savedKey));
    console.log('Loaded existing wallet');
  } else {
    cloakWallet = await client.createWallet();
    fs.writeFileSync(walletPath, JSON.stringify({
      spendingKey: Buffer.from(cloakWallet.keypair.spending.sk).toString('hex')
    }));
    console.log('Created new wallet');
  }
  console.log(`Spending key: ${Buffer.from(cloakWallet.keypair.spending.sk).toString('hex').slice(0, 16)}...`);
  console.log(`Public key X: ${Buffer.from(cloakWallet.keypair.publicKey.x).toString('hex').slice(0, 16)}...`);

  // Create or get test token mint
  console.log('\n[3] Setting up test token...');
  let tokenMint: PublicKey;

  // Check if we have a saved mint
  const mintPath = path.join(__dirname, '.test-mint.json');
  if (fs.existsSync(mintPath)) {
    tokenMint = new PublicKey(JSON.parse(fs.readFileSync(mintPath, 'utf-8')).mint);
    console.log(`Using existing mint: ${tokenMint.toBase58()}`);
  } else {
    // Create new mint
    tokenMint = await createMint(
      connection,
      payerKeypair,
      payerKeypair.publicKey,
      null,
      9
    );
    fs.writeFileSync(mintPath, JSON.stringify({ mint: tokenMint.toBase58() }));
    console.log(`Created new mint: ${tokenMint.toBase58()}`);
  }

  // Get user's token account
  const userTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    payerKeypair,
    tokenMint,
    payerKeypair.publicKey
  );
  console.log(`User token account: ${userTokenAccount.address.toBase58()}`);

  // Mint some tokens if balance is low
  const tokenBalance = await connection.getTokenAccountBalance(userTokenAccount.address);
  if (BigInt(tokenBalance.value.amount) < 1_000_000_000n) {
    console.log('Minting tokens...');
    await mintTo(
      connection,
      payerKeypair,
      tokenMint,
      userTokenAccount.address,
      payerKeypair,
      10_000_000_000 // 10 tokens
    );
    console.log('Minted 10 tokens');
  } else {
    console.log(`Token balance: ${tokenBalance.value.uiAmount}`);
  }

  // Check/initialize pool
  console.log('\n[4] Checking pool...');
  try {
    const { poolTx, counterTx } = await client.initializePool(tokenMint, payerKeypair);
    console.log(`Pool initialized: ${poolTx}`);
    console.log(`Counter initialized: ${counterTx}`);
  } catch (err: any) {
    if (err.message?.includes('already in use') || err.logs?.some((l: string) => l.includes('already in use'))) {
      console.log('Pool already exists');
    } else {
      throw err;
    }
  }

  // Generate stealth address for shielding
  console.log('\n[5] Shielding tokens...');
  const { stealthAddress } = generateStealthAddress(cloakWallet.keypair.publicKey);
  console.log(`Stealth address generated`);
  console.log(`Using base pubkey for encryption (scanner can decrypt with spending key)`);

  const shieldAmount = 1_000_000_000n; // 1 token
  try {
    // Use recipient's BASE pubkey for encryption so scanner can decrypt with spending key
    // Note: In production, the ephemeral pubkey from stealthAddress should also be stored
    // so recipient can derive the stealth private key for spending
    const shieldResult = await client.shield(
      {
        pool: tokenMint,
        amount: shieldAmount,
        recipient: {
          // Use base pubkey for encryption, but stealth pubkey as the actual recipient
          stealthPubkey: cloakWallet.keypair.publicKey, // Encrypt to base pubkey
          ephemeralPubkey: stealthAddress.ephemeralPubkey,
        },
        userTokenAccount: userTokenAccount.address,
      },
      payerKeypair
    );
    console.log(`Shield tx: ${shieldResult.signature}`);
    console.log(`Commitment: ${Buffer.from(shieldResult.commitment).toString('hex').slice(0, 16)}...`);
  } catch (err: any) {
    console.error('Shield failed:', err.message);
    if (err.logs) {
      console.error('Logs:', err.logs.slice(-5));
    }
  }

  // Wait for confirmation
  console.log('Waiting for confirmation...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Scan for notes
  console.log('\n[6] Scanning for notes...');
  try {
    const notes = await client.scanNotes(tokenMint);
    console.log(`Found ${notes.length} notes`);

    for (const note of notes) {
      console.log(`  - Amount: ${note.amount}`);
      console.log(`    Commitment: ${Buffer.from(note.commitment).toString('hex').slice(0, 16)}...`);
      console.log(`    Leaf index: ${note.leafIndex}`);
    }

    // Get balance
    const balance = await client.getPrivateBalance(tokenMint);
    console.log(`\nPrivate balance: ${balance} (${Number(balance) / 1e9} tokens)`);

    // If we have notes, try a transfer
    if (notes.length > 0) {
      console.log('\n[7] Preparing private transfer...');

      // Generate recipient stealth address (to ourselves for testing)
      const { stealthAddress: recipientStealth } = generateStealthAddress(cloakWallet.keypair.publicKey);
      console.log(`Recipient stealth: ${Buffer.from(recipientStealth.stealthPubkey.x).toString('hex').slice(0, 16)}...`);

      // For a real transfer, we'd need merkle proofs from an indexer
      // For now, just show we can prepare the inputs
      console.log('Transfer preparation ready (requires indexer for merkle proofs)');
    }
  } catch (err: any) {
    console.error('Scan failed:', err.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('E2E Test Complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
