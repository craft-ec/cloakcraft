/**
 * Quick shield to existing pool
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { CloakCraftClient } from '../packages/sdk/src/client';
import { initPoseidon } from '../packages/sdk/src/crypto/poseidon';
import { generateStealthAddress } from '../packages/sdk/src/crypto/stealth';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== Quick Shield Test ===\n');

  // Initialize Poseidon first
  await initPoseidon();

  // Load test data
  const testDataPath = path.join(__dirname, '.test-data.json');
  if (!fs.existsSync(testDataPath)) {
    console.error('No test data found. Run sdk-shield.ts first.');
    process.exit(1);
  }
  const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
  const TOKEN_MINT = new PublicKey(testData.mint);

  const apiKey = process.env.HELIUS_API_KEY || '88ac54a3-8850-4686-a521-70d116779182';
  const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  const connection = new Connection(rpcUrl, 'confirmed');

  // Load wallet
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  console.log('Wallet:', wallet.publicKey.toBase58());
  console.log('Token:', TOKEN_MINT.toBase58());

  // Initialize SDK client
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'cloakcraft.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

  const client = new CloakCraftClient({
    rpcUrl,
    heliusApiKey: apiKey,
    programId: '2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG',
  });

  // Set program
  const { Program, AnchorProvider, Wallet } = await import('@coral-xyz/anchor');
  const provider = new AnchorProvider(connection, new Wallet(wallet), { commitment: 'confirmed' });
  const program = new Program(idl, provider);
  client.setProgram(program);

  // Load existing privacy wallet
  await client.loadWallet(new Uint8Array(testData.walletSpendingKey));
  const privacyWallet = client.getWallet();
  if (!privacyWallet) {
    throw new Error('Failed to load privacy wallet');
  }
  console.log('Privacy wallet loaded');

  // Generate stealth address
  const { stealthAddress } = generateStealthAddress(privacyWallet.publicKey);

  // Shield tokens
  console.log('\nShielding 100 tokens...');
  const shieldAmount = BigInt(100_000_000_000); // 100 tokens

  const result = await client.shield(
    {
      pool: TOKEN_MINT,
      amount: shieldAmount,
      recipient: stealthAddress,
    },
    wallet
  );

  console.log('\n✅ Shield successful!');
  console.log('Transaction:', result.signature);
  console.log('\nNote details:');
  console.log('- Amount:', shieldAmount.toString());
  console.log('- Commitment:', Buffer.from(result.commitment).toString('hex'));
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
