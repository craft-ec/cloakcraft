/**
 * FULL SYSTEM TEST - Light Protocol + Note Scanning
 *
 * This tests the ACTUAL system:
 * 1. Shield WITH Light Protocol (stores commitment on-chain)
 * 2. Scan notes FROM Light Protocol (retrieves commitment)
 * 3. Unshield using SCANNED note data
 */
// @ts-nocheck
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// SDK imports
import { CloakCraftClient } from '../packages/sdk/src/client';
import { initPoseidon, bytesToField, fieldToBytes, DOMAIN_COMMITMENT, poseidonHashDomain } from '../packages/sdk/src/crypto/poseidon';
import { computeCommitment, generateRandomness } from '../packages/sdk/src/crypto/commitment';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';
import { generateStealthAddress, deriveStealthPrivateKey } from '../packages/sdk/src/crypto/stealth';
import { derivePublicKey } from '../packages/sdk/src/crypto/babyjubjub';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const TOKEN_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');

// Load Helius API key from environment
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

const FQ_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log('='.repeat(80));
  console.log('FULL SYSTEM TEST - Light Protocol + Note Scanning');
  console.log('='.repeat(80));

  if (!HELIUS_API_KEY) {
    console.error('\n!!! HELIUS_API_KEY environment variable not set !!!');
    console.error('Run: export HELIUS_API_KEY=your_key_here');
    console.error('Get key from: https://dev.helius.xyz/');
    return;
  }
  console.log('\nHelius API key:', HELIUS_API_KEY.slice(0, 8) + '...');

  // Initialize SDK Poseidon
  await initPoseidon();

  // Setup wallet
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))));
  console.log('Wallet:', wallet.publicKey.toBase58());

  // Create CloakCraft client WITH Light Protocol
  const client = new CloakCraftClient({
    rpcUrl: 'https://api.devnet.solana.com',
    indexerUrl: '', // Not used
    programId: PROGRAM_ID,
    heliusApiKey: HELIUS_API_KEY,
    network: 'devnet',
  });

  // Load IDL and set program
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'cloakcraft.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: 'confirmed' });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);
  client.setProgram(program);

  // Initialize prover
  console.log('\nInitializing prover...');
  await client.initializeProver(['transfer/1x2']);

  // ============================================================
  // STEP 1: Create/load wallet with spending key
  // ============================================================
  console.log('\n=== STEP 1: Create wallet ===\n');

  // Create a new wallet (or load existing)
  const cloakWallet = client.createWallet();
  const baseSpendingKey = bytesToField(cloakWallet.keypair.spending.sk);
  console.log('Base spending key:', baseSpendingKey.toString(16).slice(0, 32) + '...');
  console.log('Public key X:', toHex(cloakWallet.publicKey.x).slice(0, 32) + '...');

  // ============================================================
  // STEP 2: Generate stealth address and shield WITH Light Protocol
  // ============================================================
  console.log('\n=== STEP 2: Shield WITH Light Protocol ===\n');

  const userTokenAccount = getAssociatedTokenAddressSync(TOKEN_MINT, wallet.publicKey);
  const SHIELD_AMOUNT = 1_000_000n;

  // Generate stealth address
  const { stealthAddress } = generateStealthAddress(cloakWallet.publicKey);
  console.log('Stealth pubkey X:', toHex(stealthAddress.stealthPubkey.x).slice(0, 32) + '...');
  console.log('Ephemeral pubkey X:', toHex(stealthAddress.ephemeralPubkey.x).slice(0, 32) + '...');

  // Shield using client (this uses Light Protocol internally)
  try {
    const shieldResult = await client.shieldWithWallet(
      {
        pool: TOKEN_MINT,
        amount: SHIELD_AMOUNT,
        recipient: stealthAddress,
        userTokenAccount: userTokenAccount,
      },
      wallet.publicKey
    );
    console.log('Shield SUCCESS:', shieldResult.signature);
    console.log('Commitment:', toHex(shieldResult.commitment));
  } catch (e: any) {
    console.log('Shield ERROR:', e.message);
    if (e.logs) e.logs.slice(-10).forEach((l: string) => console.log(' ', l));
    return;
  }

  // Wait for confirmation
  console.log('Waiting for Light Protocol indexing...');
  await new Promise(r => setTimeout(r, 5000));

  // ============================================================
  // STEP 3: Scan notes FROM Light Protocol
  // ============================================================
  console.log('\n=== STEP 3: Scan notes FROM Light Protocol ===\n');

  let scannedNotes;
  try {
    scannedNotes = await client.scanNotes(TOKEN_MINT);
    console.log(`Found ${scannedNotes.length} notes`);

    if (scannedNotes.length === 0) {
      console.error('No notes found! Light Protocol indexing may take longer.');
      return;
    }

    // Find the note we just shielded
    const ourNote = scannedNotes.find(n => n.amount === SHIELD_AMOUNT);
    if (!ourNote) {
      console.error('Could not find our shielded note');
      console.log('Available notes:', scannedNotes.map(n => ({ amount: n.amount.toString(), leafIndex: n.leafIndex })));
      return;
    }

    console.log('Found our note:');
    console.log('  Amount:', ourNote.amount.toString());
    console.log('  Leaf index:', ourNote.leafIndex);
    console.log('  Has ephemeralPubkey:', !!ourNote.stealthEphemeralPubkey);
    if (ourNote.stealthEphemeralPubkey) {
      console.log('  Ephemeral X:', toHex(ourNote.stealthEphemeralPubkey.x).slice(0, 32) + '...');
    }
  } catch (e: any) {
    console.error('Scan ERROR:', e.message);
    return;
  }

  // ============================================================
  // STEP 4: Unshield using SCANNED note (full frontend flow)
  // ============================================================
  console.log('\n=== STEP 4: Unshield using SCANNED note ===\n');

  const noteToSpend = scannedNotes.find(n => n.amount === SHIELD_AMOUNT)!;

  try {
    // Use prepareAndTransfer which is what the frontend uses
    const result = await client.prepareAndTransfer(
      {
        inputs: [noteToSpend],
        outputs: [{
          recipient: stealthAddress, // Change goes back to self
          amount: 0n, // Unshield everything
        }],
        unshield: {
          amount: SHIELD_AMOUNT,
          recipient: wallet.publicKey, // Pass wallet address, SDK derives ATA
        },
      }
    );

    console.log('='.repeat(80));
    console.log('SUCCESS! FULL SYSTEM WORKS!');
    console.log('TX:', result.signature);
    console.log('='.repeat(80));

  } catch (e: any) {
    console.log('Unshield ERROR:', e.message);
    if (e.logs) {
      console.log('\n=== LOGS ===');
      e.logs.forEach((l: string) => console.log(l));
    }
  }
}

main().catch(console.error);
