/**
 * Setup fresh tokens for AMM testing
 * Creates Token A and Token B, initializes pools, and shields initial amounts
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
  process.exit(1);
}

const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

async function createToken(
  connection: Connection,
  wallet: Keypair,
  name: string
): Promise<PublicKey> {
  console.log(`\n[${name}] Creating token...`);
  const mintKeypair = Keypair.generate();
  const mintPubkey = mintKeypair.publicKey;

  const lamports = await getMinimumBalanceForRentExemptMint(connection);
  const tx = new Transaction();

  tx.add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mintPubkey,
      space: MINT_SIZE,
      lamports,
      programId: TOKEN_PROGRAM_ID,
    })
  );

  tx.add(
    createInitializeMint2Instruction(
      mintPubkey,
      9, // decimals
      wallet.publicKey,
      wallet.publicKey,
      TOKEN_PROGRAM_ID
    )
  );

  const sig = await connection.sendTransaction(tx, [wallet, mintKeypair]);
  await connection.confirmTransaction(sig);
  console.log(`  ✓ Created: ${mintPubkey.toBase58()}`);

  // Mint tokens
  const userAta = getAssociatedTokenAddressSync(mintPubkey, wallet.publicKey);
  const tx2 = new Transaction();

  tx2.add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      userAta,
      wallet.publicKey,
      mintPubkey
    )
  );

  tx2.add(
    createMintToInstruction(
      mintPubkey,
      userAta,
      wallet.publicKey,
      100000n * 10n ** 9n // 100,000 tokens
    )
  );

  await connection.sendTransaction(tx2, [wallet]);
  console.log(`  ✓ Minted 100,000 tokens`);

  return mintPubkey;
}

async function initializePool(
  program: anchor.Program,
  wallet: Keypair,
  tokenMint: PublicKey,
  name: string
): Promise<void> {
  console.log(`\n[${name}] Initializing pool...`);

  const [poolPda] = derivePoolPda(tokenMint, PROGRAM_ID);
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), tokenMint.toBuffer()],
    PROGRAM_ID
  );
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('commitment_counter'), poolPda.toBuffer()],
    PROGRAM_ID
  );

  await program.methods
    .initializePool()
    .accounts({
      pool: poolPda,
      tokenMint: tokenMint,
      tokenVault: vaultPda,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`  ✓ Pool: ${poolPda.toBase58()}`);

  await program.methods
    .initializeCommitmentCounter()
    .accounts({
      pool: poolPda,
      commitmentCounter: counterPda,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`  ✓ Counter initialized`);
}

async function shieldTokens(
  client: CloakCraftClient,
  wallet: Keypair,
  tokenMint: PublicKey,
  amount: bigint,
  privacyWallet: any,
  name: string
): Promise<string> {
  console.log(`\n[${name}] Shielding ${amount / 10n ** 9n} tokens...`);

  const { stealthAddress: recipient } = generateStealthAddress(privacyWallet.publicKey);
  const userAta = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey);

  const result = await client.shield(
    { pool: tokenMint, amount, recipient, userTokenAccount: userAta },
    wallet
  );

  const commitmentHex = Buffer.from(result.commitment).toString('hex');
  console.log(`  ✓ Shielded! Commitment: ${commitmentHex.slice(0, 16)}...`);

  return commitmentHex;
}

async function main() {
  console.log('\n=== SETUP FRESH AMM TOKENS ===\n');

  await initPoseidon();

  // Load wallet
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

  // Create or load privacy wallet
  const privacyWalletPath = './scripts/.fresh-amm-wallet.json';
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
  console.log('Privacy wallet X:', Buffer.from(privacyWallet.publicKey.x).toString('hex').slice(0, 16) + '...');

  // Create Token A
  const tokenA = await createToken(connection, mainWallet, 'TOKEN A');
  await initializePool(program, mainWallet, tokenA, 'TOKEN A');
  const commitmentA = await shieldTokens(client, mainWallet, tokenA, 5000n * 10n ** 9n, privacyWallet, 'TOKEN A');

  // Create Token B
  const tokenB = await createToken(connection, mainWallet, 'TOKEN B');
  await initializePool(program, mainWallet, tokenB, 'TOKEN B');
  const commitmentB = await shieldTokens(client, mainWallet, tokenB, 50000n * 10n ** 9n, privacyWallet, 'TOKEN B');

  // Save token info
  const tokenInfo = {
    tokenA: tokenA.toBase58(),
    tokenB: tokenB.toBase58(),
    privacyWallet: privacyWalletPath,
    commitmentA,
    commitmentB,
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync('./scripts/.fresh-amm-tokens.json', JSON.stringify(tokenInfo, null, 2));

  console.log('\n=== SETUP COMPLETE ===\n');
  console.log('Token A:', tokenA.toBase58());
  console.log('Token B:', tokenB.toBase58());
  console.log('\nToken info saved to: ./scripts/.fresh-amm-tokens.json');
  console.log('\nWaiting 15s for indexing, then verifying scan...');

  await new Promise(r => setTimeout(r, 15000));

  // Verify we can scan the notes
  console.log('\n=== VERIFICATION ===\n');
  const notesA = await client.scanNotes(tokenA);
  const notesB = await client.scanNotes(tokenB);

  console.log(`Token A: Found ${notesA.length} notes`);
  console.log(`Token B: Found ${notesB.length} notes`);

  if (notesA.length > 0 && notesB.length > 0) {
    console.log('\n✓✓✓ SUCCESS! Both tokens ready for AMM testing!');
    console.log('\nYou can now run AMM tests using these fresh tokens.');
  } else {
    console.log('\n⚠ Warning: Some notes not found yet. Wait a bit longer or check indexing.');
  }
}

main().catch(console.error);
