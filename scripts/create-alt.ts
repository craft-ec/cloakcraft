/**
 * Create and populate Address Lookup Table for CloakCraft
 *
 * This script creates an ALT with all common CloakCraft accounts,
 * enabling atomic execution of complex operations like add liquidity.
 *
 * Usage:
 *   npx ts-node scripts/create-alt.ts
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  createCloakCraftALT,
  getLightProtocolCommonAccounts,
  type CloakCraftALTAccounts,
} from '../packages/sdk/src/address-lookup-table';
import * as fs from 'fs';

const NETWORK = 'devnet';
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const LIGHT_PROTOCOL_PROGRAM = new PublicKey('SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7');

async function main() {
  console.log('🏗️  Creating CloakCraft Address Lookup Table...\n');

  // Load authority keypair
  const keypairPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;
  console.log(`Loading authority keypair from: ${keypairPath}`);

  let authorityKeypair: Keypair;
  try {
    const secretKey = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    authorityKeypair = Keypair.fromSecretKey(new Uint8Array(secretKey));
    console.log(`Authority: ${authorityKeypair.publicKey.toBase58()}\n`);
  } catch (err) {
    console.error('❌ Failed to load keypair:', err);
    console.error('\nMake sure you have a keypair at ~/.config/solana/id.json');
    console.error('Or set KEYPAIR_PATH environment variable');
    process.exit(1);
  }

  // Create connection
  const connection = new Connection(RPC_URL, 'confirmed');
  console.log(`Connected to: ${RPC_URL}`);

  // Check balance
  const balance = await connection.getBalance(authorityKeypair.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);

  if (balance < 0.1 * 1e9) {
    console.error('\n❌ Insufficient balance! Need at least 0.1 SOL for ALT creation.');
    console.error('Run: solana airdrop 1');
    process.exit(1);
  }

  console.log('\n📦 Gathering common CloakCraft accounts...');

  // Get Light Protocol accounts for this network
  const lightAccounts = getLightProtocolCommonAccounts(NETWORK as 'mainnet-beta' | 'devnet');

  // Build full account list
  const accounts: CloakCraftALTAccounts = {
    program: PROGRAM_ID,
    lightProtocol: LIGHT_PROTOCOL_PROGRAM,
    stateTrees: lightAccounts.stateTrees,
    addressTrees: lightAccounts.addressTrees,
    nullifierQueues: lightAccounts.nullifierQueues,
    systemAccounts: lightAccounts.systemAccounts,
    systemProgram: new PublicKey('11111111111111111111111111111111'),
    tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
  };

  console.log(`Total accounts to add: ${
    1 + // program
    1 + // lightProtocol
    accounts.stateTrees.length +
    accounts.addressTrees.length +
    accounts.nullifierQueues.length +
    accounts.systemAccounts.length +
    2 // system + token programs
  }`);

  console.log('\n🚀 Creating and populating ALT...');

  try {
    const altAddress = await createCloakCraftALT(connection, authorityKeypair, accounts);

    console.log('\n✅ ALT created successfully!');
    console.log(`\nAddress: ${altAddress.toBase58()}`);
    console.log('\n📝 Add this to your CloakCraftClient config:');
    console.log(`
const client = new CloakCraftClient({
  rpcUrl: '${RPC_URL}',
  indexerUrl: 'http://localhost:3000',
  programId: new PublicKey('${PROGRAM_ID.toBase58()}'),
  heliusApiKey: 'your-api-key',
  network: '${NETWORK}',
  addressLookupTables: [
    new PublicKey('${altAddress.toBase58()}'),
  ],
});
`);

    // Save to file
    const configPath = '.alt-config.json';
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          network: NETWORK,
          altAddress: altAddress.toBase58(),
          authority: authorityKeypair.publicKey.toBase58(),
          createdAt: new Date().toISOString(),
        },
        null,
        2
      )
    );

    console.log(`\n💾 Config saved to: ${configPath}`);
    console.log('\n🎉 Done! Atomic transactions for add liquidity should now work!');
  } catch (err) {
    console.error('\n❌ Failed to create ALT:', err);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
