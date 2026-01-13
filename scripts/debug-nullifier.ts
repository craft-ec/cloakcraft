/**
 * Debug nullifier computation - compare SDK vs circuit
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { CloakCraftClient, deriveSpendingKey } from '../packages/sdk/src/index';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';
import { DEVNET_LIGHT_TREES } from '../packages/sdk/src/light';
import { bytesToField, fieldToBytes, initPoseidon } from '../packages/sdk/src/crypto/poseidon';
import { deriveAddressSeed, deriveAddress } from '@lightprotocol/stateless.js';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import 'dotenv/config';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');

// Load keypair from file
const walletPath = path.join(process.env.HOME || '', '.config/solana/id.json');
const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf8'));
const keypair = Keypair.fromSecretKey(new Uint8Array(walletData));
const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
const connection = new Connection(rpcUrl);
const TOKEN_MINT = new PublicKey('GrB5zNSto58kiNwDd52Ma5aVgf5hCCdQ3T97AzZpN7En');

async function main() {
  // Initialize Poseidon hash function
  await initPoseidon();

  // Load test wallet
  const testWalletPath = path.join(__dirname, '.test-wallet.json');
  if (!fs.existsSync(testWalletPath)) {
    console.error('ERROR: No test wallet found. Run e2e-sdk-test.ts first.');
    return;
  }
  const savedKey = Buffer.from(
    JSON.parse(fs.readFileSync(testWalletPath, 'utf-8')).spendingKey,
    'hex'
  );

  // Create client and scan notes
  const client = new CloakCraftClient({
    rpcUrl,
    indexerUrl: 'http://localhost:3000',
    programId: PROGRAM_ID,
    heliusApiKey: process.env.HELIUS_API_KEY!,
    network: 'devnet',
  });
  const cloakWallet = client.loadWallet(new Uint8Array(savedKey));

  const notes = await client.scanNotes(TOKEN_MINT);
  console.log('Notes found:', notes.length);

  // Find note with leafIndex=5
  const note5 = notes.find(n => n.leafIndex === 5);
  if (!note5) {
    console.log('Note with leafIndex=5 not found in scanned notes');
    return;
  }

  console.log('\n=== Note with leafIndex=5 ===');
  console.log('Amount:', note5.amount.toString());
  console.log('Commitment:', Buffer.from(note5.commitment).toString('hex'));

  // Compute nullifier key and nullifier using SDK
  const spendingKey = new Uint8Array(savedKey);
  console.log('\nSpending key:', Buffer.from(spendingKey).toString('hex'));

  const nk = deriveNullifierKey(spendingKey);
  console.log('Nullifier key (SDK):', Buffer.from(nk).toString('hex'));

  const nullifier = deriveSpendingNullifier(nk, note5.commitment, note5.leafIndex);
  console.log('Nullifier (SDK):', Buffer.from(nullifier).toString('hex'));

  // Derive nullifier address using Light Protocol
  // Seeds must match on-chain: ["spend_nullifier", pool, nullifier]
  const poolPda = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), TOKEN_MINT.toBuffer()],
    PROGRAM_ID
  )[0];

  const seeds = [
    Buffer.from('spend_nullifier'),
    poolPda.toBuffer(),
    Buffer.from(nullifier),
  ];

  const addressSeed = deriveAddressSeed(seeds, PROGRAM_ID);
  const nullifierAddress = deriveAddress(addressSeed, DEVNET_LIGHT_TREES.addressTree);
  console.log('Nullifier address (SDK):', nullifierAddress.toBase58());

  // Run helper circuit to get circuit's nullifier value
  console.log('\n=== Computing with helper circuit ===');
  const helperCircuitPath = path.join(__dirname, '../circuits/helpers');
  const proverTomlPath = path.join(helperCircuitPath, 'Prover.toml');

  const spendingKeyBigInt = bytesToField(spendingKey);
  const commitmentBigInt = bytesToField(note5.commitment);

  const proverToml = `stealth_spending_key = "${spendingKeyBigInt.toString()}"
in_commitment = "${commitmentBigInt.toString()}"
in_leaf_index = ${note5.leafIndex}
`;

  fs.writeFileSync(proverTomlPath, proverToml);
  console.log('Prover.toml written with:');
  console.log('  spending_key:', spendingKeyBigInt.toString());
  console.log('  commitment:', commitmentBigInt.toString());
  console.log('  leaf_index:', note5.leafIndex);

  // Run nargo execute to get circuit output
  try {
    const nargoPath = path.join(process.env.HOME || '', '.nargo/bin/nargo');
    execFileSync(nargoPath, ['execute'], { cwd: helperCircuitPath, stdio: 'pipe' });
    console.log('Circuit executed successfully');
  } catch (err: any) {
    // nargo outputs to stderr even on success
    const output = err.stdout?.toString() || err.stderr?.toString() || '';
    // Look for nullifier in output
    const nullifierMatch = output.match(/nullifier_key:\s*0x([0-9a-f]+)/i) ||
                           output.match(/nullifier:\s*0x([0-9a-f]+)/i);
    if (nullifierMatch) {
      console.log('Circuit nullifier:', nullifierMatch[1]);
    }
  }

  // Check if nullifier address exists on-chain
  console.log('\n=== Checking on-chain nullifier ===');
  const accountInfo = await connection.getAccountInfo(nullifierAddress);
  if (accountInfo) {
    console.log('Nullifier account EXISTS on chain (note is SPENT)');
    console.log('Account owner:', accountInfo.owner.toBase58());
    console.log('Account data length:', accountInfo.data.length);
  } else {
    console.log('Nullifier account does NOT exist (note is UNSPENT)');
  }

  // Check the address that was created when we actually spent note 5
  const actualNullifierAddress = new PublicKey('1263hzyu7V84FUouFy9GkDBWP4EYKgPhph4ir7bxPUeT');
  console.log('\n=== Checking actual nullifier address from previous spend ===');
  console.log('Actual address:', actualNullifierAddress.toBase58());
  const actualAccountInfo = await connection.getAccountInfo(actualNullifierAddress);
  if (actualAccountInfo) {
    console.log('Account EXISTS on chain (note WAS spent)');
    console.log('Account owner:', actualAccountInfo.owner.toBase58());
    console.log('Account data length:', actualAccountInfo.data.length);
  } else {
    console.log('Account does NOT exist');
  }
}

main().catch(console.error);
