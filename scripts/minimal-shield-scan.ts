/**
 * Minimal shield + scan test with full debugging
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import { CloakCraftClient } from '../packages/sdk/src/client';
import { initPoseidon } from '../packages/sdk/src/crypto/poseidon';
import { generateStealthAddress } from '../packages/sdk/src/crypto/stealth';
import { derivePoolPda } from '../packages/sdk/src/instructions/constants';

const PROGRAM_ID = new PublicKey('HYqfv23HLd6tKBAiWZvvt8yyj6iySkx1kSSjhzqUvdmg');
const HELIUS_API_KEY = 'ccd7e34f-d7f9-49b2-81b9-cf9bbbc2b083';
const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const TOKEN_A_MINT = new PublicKey('28hZpf8DEpP9UrF2D9dHMJQE9kxAJ2fWZmWKVpF7pump');

async function main() {
  console.log('\n=== MINIMAL SHIELD + SCAN TEST ===\n');

  await initPoseidon();

  const walletData = JSON.parse(fs.readFileSync('./scripts/.test-wallet.json', 'utf-8'));
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
  console.log('Privacy wallet X:', Buffer.from(privacyWallet.publicKey.x).toString('hex').slice(0, 16) + '...\n');

  // Shield 100 tokens
  console.log('=== SHIELD ===\n');
  const { stealthAddress: recipient } = generateStealthAddress(privacyWallet.publicKey);
  const userAta = getAssociatedTokenAddressSync(TOKEN_A_MINT, mainWallet.publicKey);

  console.log('Recipient stealth X:', Buffer.from(recipient.stealthPubkey.x).toString('hex').slice(0, 16) + '...');
  console.log('Recipient ephemeral X:', Buffer.from(recipient.ephemeralPubkey.x).toString('hex').slice(0, 16) + '...\n');

  const result = await client.shield(
    { pool: TOKEN_A_MINT, amount: 100n, recipient, userTokenAccount: userAta },
    mainWallet
  );

  const commitmentHex = Buffer.from(result.commitment).toString('hex');
  console.log('\n✓ Shield complete!');
  console.log('Commitment:', commitmentHex.slice(0, 16) + '...');
  console.log('Full commitment:', commitmentHex);
  console.log('Signature:', result.signature);

  // Wait for indexing
  console.log('\nWaiting 15s for Helius indexing...');
  await new Promise(r => setTimeout(r, 15000));

  // Scan
  console.log('\n=== SCAN ===\n');
  const [poolPda] = derivePoolPda(TOKEN_A_MINT, PROGRAM_ID);
  console.log('Scanning pool:', poolPda.toBase58());
  console.log('Looking for commitment:', commitmentHex.slice(0, 16) + '...\n');

  const notes = await client.scanNotes(TOKEN_A_MINT);

  console.log(`\n=== RESULT ===`);
  console.log(`Found ${notes.length} notes`);

  if (notes.length > 0) {
    const foundOurNote = notes.some(n =>
      Buffer.from(n.commitment).toString('hex') === commitmentHex
    );

    if (foundOurNote) {
      console.log('✓ SUCCESS - Found our freshly shielded note!');
    } else {
      console.log('✗ PARTIAL - Found notes but not our fresh one');
      console.log('Found commitments:');
      notes.forEach(n => {
        console.log('  -', Buffer.from(n.commitment).toString('hex').slice(0, 16) + '...');
      });
    }
  } else {
    console.log('✗ FAILED - No notes found');
  }
}

main().catch(console.error);
