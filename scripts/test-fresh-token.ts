/**
 * Test with a completely fresh token to verify shield+scan works
 */

import 'dotenv/config';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import {
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  getMinimumBalanceForRentExemptMint,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import { CloakCraftClient } from '../packages/sdk/src/client';
import { initPoseidon } from '../packages/sdk/src/crypto/poseidon';
import { generateStealthAddress } from '../packages/sdk/src/crypto/stealth';
import { derivePoolPda } from '../packages/sdk/src/instructions/constants';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

if (!HELIUS_API_KEY) {
  console.error('Error: HELIUS_API_KEY environment variable not set');
  console.error('Light Protocol requires Helius RPC for compressed accounts');
  process.exit(1);
}

const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function main() {
  console.log('\n=== FRESH TOKEN TEST ===\n');

  await initPoseidon();

  const os = await import('os');
  const path = await import('path');
  const walletPath = path.join(os.homedir(), '.config/solana/id.json');
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const mainWallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  console.log('Wallet:', mainWallet.publicKey.toBase58());

  const connection = new Connection(rpcUrl, 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(mainWallet), { commitment: 'confirmed' });
  anchor.setProvider(provider);

  const idl = JSON.parse(fs.readFileSync('./packages/sdk/src/idl/cloakcraft.json', 'utf-8'));
  const program = new anchor.Program(idl, provider);

  const client = new CloakCraftClient({
    rpcUrl,
    indexerUrl: 'http://localhost:3000',
    heliusApiKey: HELIUS_API_KEY,
    programId: PROGRAM_ID,
    network: 'devnet',
  });
  client.setProgram(program);

  const privacyWallet = client.createWallet();
  console.log('Privacy wallet X:', Buffer.from(privacyWallet.publicKey.x).toString('hex').slice(0, 16) + '...');

  // Step 1: Create a brand new token
  console.log('\n[1/5] Creating fresh token...');
  const mintKeypair = Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;

  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const tx1 = new Transaction();

  tx1.add(
    SystemProgram.createAccount({
      fromPubkey: mainWallet.publicKey,
      newAccountPubkey: mintPubkey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  tx1.add(
    createInitializeMint2Instruction(
      mintPubkey,
      9, // decimals
      mainWallet.publicKey, // mint authority
      mainWallet.publicKey, // freeze authority
      TOKEN_PROGRAM_ID
    )
  );

  const sig1 = await connection.sendTransaction(tx1, [mainWallet, mintKeypair]);
  await connection.confirmTransaction(sig1);
  console.log('   ✓ Token created:', mintPubkey.toBase58());

  // Step 2: Create ATA and mint tokens
  console.log('\n[2/5] Minting tokens to wallet...');
  const userAta = getAssociatedTokenAddressSync(mintPubkey, mainWallet.publicKey);

  const tx2 = new Transaction();
  tx2.add(
    createAssociatedTokenAccountInstruction(
      mainWallet.publicKey,
      userAta,
      mainWallet.publicKey,
      mintPubkey
    )
  );

  tx2.add(
    createMintToInstruction(
      mintPubkey,
      userAta,
      mainWallet.publicKey,
      10000n * 10n ** 9n // 10,000 tokens
    )
  );

  const sig2 = await connection.sendTransaction(tx2, [mainWallet]);
  await connection.confirmTransaction(sig2);
  console.log('   ✓ Minted 10,000 tokens to ATA');

  // Step 3: Initialize pool
  console.log('\n[3/5] Initializing pool...');
  const [poolPda] = derivePoolPda(mintPubkey, PROGRAM_ID);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), mintPubkey.toBuffer()],
    PROGRAM_ID
  );
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('commitment_counter'), poolPda.toBuffer()],
    PROGRAM_ID
  );

  const poolTx = await program.methods
    .initializePool()
    .accounts({
      pool: poolPda,
      tokenMint: mintPubkey,
      tokenVault: vaultPda,
      authority: mainWallet.publicKey,
      payer: mainWallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('   ✓ Pool initialized:', poolPda.toBase58().slice(0, 16) + '...');

  // Initialize commitment counter
  const counterTx = await program.methods
    .initializeCommitmentCounter()
    .accounts({
      pool: poolPda,
      commitmentCounter: counterPda,
      authority: mainWallet.publicKey,
      payer: mainWallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('   ✓ Counter initialized:', counterTx.slice(0, 16) + '...');

  // Step 4: Shield tokens
  console.log('\n[4/5] Shielding 100 tokens...');
  const { stealthAddress: recipient } = generateStealthAddress(privacyWallet.publicKey);

  const shieldResult = await client.shield(
    { pool: mintPubkey, amount: 100n * 10n ** 9n, recipient, userTokenAccount: userAta },
    mainWallet
  );

  const commitmentHex = Buffer.from(shieldResult.commitment).toString('hex');
  console.log('   ✓ Shielded!');
  console.log('   Commitment:', commitmentHex.slice(0, 16) + '...');
  console.log('   Full:', commitmentHex);

  // Step 5: Scan
  console.log('\n[5/5] Waiting 15s then scanning...');
  await new Promise(r => setTimeout(r, 15000));

  const notes = await client.scanNotes(mintPubkey);

  console.log('\n=== RESULT ===');
  console.log(`Found ${notes.length} notes`);

  if (notes.length > 0) {
    const foundOurNote = notes.some(n =>
      Buffer.from(n.commitment).toString('hex') === commitmentHex
    );

    if (foundOurNote) {
      console.log('✓✓✓ SUCCESS! Fresh token works - found our note!');
      console.log('\nThis proves the current code is CORRECT.');
      console.log('The issue is with old notes on devnet.');
    } else {
      console.log('✗ Found notes but not ours:');
      notes.forEach(n => {
        console.log('  -', Buffer.from(n.commitment).toString('hex').slice(0, 16) + '...');
      });
    }
  } else {
    console.log('✗✗✗ FAILED - No notes found');
    console.log('This indicates a bug in the current code.');
  }
}

main().catch(console.error);
