/**
 * Minimal test to debug shield and scan with detailed logging
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import { CloakCraftClient } from '../packages/sdk/src/client';
import { initPoseidon } from '../packages/sdk/src/crypto/poseidon';
import { generateStealthAddress } from '../packages/sdk/src/crypto/stealth';

const PROGRAM_ID = new PublicKey('HYqfv23HLd6tKBAiWZvvt8yyj6iySkx1kSSjhzqUvdmg');
const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

// Token A (existing test token)
const TOKEN_A_MINT = new PublicKey('28hZpf8DEpP9UrF2D9dHMJQE9kxAJ2fWZmWKVpF7pump');

async function main() {
  console.log('\n=== SHIELD AND SCAN DEBUG TEST ===\n');

  // Initialize Poseidon
  await initPoseidon();

  // Load or generate main wallet
  const walletPath = './scripts/.test-wallet.json';
  let mainWallet: Keypair;
  try {
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    mainWallet = Keypair.fromSecretKey(new Uint8Array(walletData));
    console.log('Loaded existing wallet');
  } catch {
    mainWallet = Keypair.generate();
    fs.writeFileSync(walletPath, JSON.stringify(Array.from(mainWallet.secretKey)));
    console.log('Generated new wallet');
  }
  console.log('Main wallet:', mainWallet.publicKey.toBase58());

  const connection = new Connection(rpcUrl, 'confirmed');
  const balance = await connection.getBalance(mainWallet.publicKey);
  console.log(`SOL balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

  // Setup Anchor
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(mainWallet),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync('./packages/sdk/src/idl/cloakcraft.json', 'utf-8')
  );
  const program = new anchor.Program(idl, provider);

  // Create client and wallet
  const client = new CloakCraftClient({
    rpcUrl,
    indexerUrl: 'http://localhost:3000',
    heliusApiKey: HELIUS_API_KEY,
    programId: PROGRAM_ID,
    network: 'devnet',
  });
  client.setProgram(program);

  // Load or create privacy wallet
  const privacyWalletPath = './scripts/.test-privacy-wallet.json';
  let privacyWallet;
  if (fs.existsSync(privacyWalletPath)) {
    const sk = new Uint8Array(JSON.parse(fs.readFileSync(privacyWalletPath, 'utf-8')));
    privacyWallet = await client.loadWallet(sk);
    console.log('Loaded existing privacy wallet');
  } else {
    privacyWallet = client.createWallet();
    fs.writeFileSync(privacyWalletPath, JSON.stringify(Array.from(privacyWallet.exportSpendingKey())));
    console.log('Created new privacy wallet');
  }
  console.log(`Privacy wallet pubkey X: ${Buffer.from(privacyWallet.publicKey.x).toString('hex').slice(0, 16)}...\n`);

  // Step 1: Shield 100 tokens
  console.log('[1/2] Shielding 100 tokens...');
  const { stealthAddress: recipient } = generateStealthAddress(privacyWallet.publicKey);
  const userAta = getAssociatedTokenAddressSync(TOKEN_A_MINT, mainWallet.publicKey);

  console.log(`   Recipient stealth X: ${Buffer.from(recipient.stealthPubkey.x).toString('hex').slice(0, 16)}...`);
  console.log(`   Recipient ephemeral X: ${Buffer.from(recipient.ephemeralPubkey.x).toString('hex').slice(0, 16)}...`);

  const shieldResult = await client.shield(
    {
      pool: TOKEN_A_MINT,
      amount: 100n,
      recipient,
      userTokenAccount: userAta,
    },
    mainWallet
  );

  console.log(`   ✓ Shielded, commitment: ${Buffer.from(shieldResult.commitment).toString('hex').slice(0, 16)}...`);
  console.log(`   Transaction: ${shieldResult.signature.slice(0, 16)}...\n`);

  // Step 2: Wait and scan
  console.log('[2/2] Waiting 10s for indexing...');
  await new Promise(r => setTimeout(r, 10000));

  console.log('Scanning for notes...\n');
  const notes = await client.scanNotes(TOKEN_A_MINT);

  console.log(`\nFound ${notes.length} notes`);
  if (notes.length > 0) {
    console.log('✓ TEST PASSED - Note was decrypted and validated successfully!');
  } else {
    console.log('✗ TEST FAILED - No notes found (decryption or validation failed)');
  }
}

main().catch(console.error);
