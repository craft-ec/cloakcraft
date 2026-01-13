/**
 * Quick shield+scan test with detailed logging
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import { CloakCraftClient } from '../packages/sdk/src/client';
import { initPoseidon } from '../packages/sdk/src/crypto/poseidon';
import { generateStealthAddress } from '../packages/sdk/src/crypto/stealth';

const PROGRAM_ID = new PublicKey('HYqfv23HLd6tKBAiWZvvt8yyj6iySkx1kSSjhzqUvdmg');
const HELIUS_API_KEY = 'ccd7e34f-d7f9-49b2-81b9-cf9bbbc2b083';
const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const TOKEN_A_MINT = new PublicKey('28hZpf8DEpP9UrF2D9dHMJQE9kxAJ2fWZmWKVpF7pump');

async function main() {
  await initPoseidon();

  const walletData = JSON.parse(fs.readFileSync('./scripts/.test-wallet.json', 'utf-8'));
  const mainWallet = Keypair.fromSecretKey(new Uint8Array(walletData));

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
  console.log(`Privacy wallet X: ${Buffer.from(privacyWallet.publicKey.x).toString('hex').slice(0, 16)}...`);

  console.log('\n=== SHIELD ===\n');
  const { stealthAddress: recipient } = generateStealthAddress(privacyWallet.publicKey);
  const userAta = getAssociatedTokenAddressSync(TOKEN_A_MINT, mainWallet.publicKey);

  const result = await client.shield(
    { pool: TOKEN_A_MINT, amount: 50n, recipient, userTokenAccount: userAta },
    mainWallet
  );

  console.log(`\nShield complete! Commitment: ${Buffer.from(result.commitment).toString('hex').slice(0, 16)}...`);
  console.log('Waiting 15s for indexing...\n');
  await new Promise(r => setTimeout(r, 15000));

  console.log('=== SCAN ===\n');
  const notes = await client.scanNotes(TOKEN_A_MINT);
  console.log(`\nFound ${notes.length} notes`);
}

main().catch(console.error);
