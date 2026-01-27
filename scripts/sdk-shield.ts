import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { CloakCraftClient } from '../packages/sdk/src/client';
import { initPoseidon } from '../packages/sdk/src/crypto/poseidon';
import { generateStealthAddress } from '../packages/sdk/src/crypto/stealth';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

async function main() {
  console.log('=== SDK-Based Shield Test ===\n');

  // Initialize Poseidon first
  await initPoseidon();

  const apiKey = process.env.HELIUS_API_KEY || '88ac54a3-8850-4686-a521-70d116779182';
  const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  const connection = new Connection(rpcUrl, 'confirmed');

  // Load wallet
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  console.log('Wallet:', wallet.publicKey.toBase58());

  // Create new mint for testing
  console.log('\nCreating test token...');
  const mint = await createMint(connection, wallet, wallet.publicKey, null, 9);
  console.log('Token mint:', mint.toBase58());

  const userAta = await getOrCreateAssociatedTokenAccount(connection, wallet, mint, wallet.publicKey);
  await mintTo(connection, wallet, mint, userAta.address, wallet, 500_000_000_000); // 500 tokens
  console.log('Minted 500 tokens');

  // Initialize SDK client
  console.log('\nInitializing CloakCraft SDK...');
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

  // Create privacy wallet
  console.log('Creating privacy wallet...');
  const privacyWallet = client.createWallet();
  console.log('Privacy public key:', privacyWallet.publicKey);

  // Generate stealth address for the privacy wallet
  const { stealthAddress } = generateStealthAddress(privacyWallet.publicKey);

  // Initialize pool
  console.log('\nInitializing pool...');
  try {
    await client.initializePool(mint, wallet);
    console.log('Pool initialized');
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      console.log('Pool already exists');
    } else {
      throw e;
    }
  }

  // Shield tokens
  console.log('\nShielding 100 tokens...');
  const shieldAmount = BigInt(100_000_000_000); // 100 tokens

  const result = await client.shield(
    {
      pool: mint,
      amount: shieldAmount,
      recipient: stealthAddress,
      userTokenAccount: userAta.address,
    },
    wallet
  );

  console.log('Shield successful!');
  console.log('Transaction:', result);
  console.log('\nYou can now run the unshield test with this mint:', mint.toBase58());
  console.log('Update test-unshield-multiphase.ts with TOKEN_MINT:', mint.toBase58());

  // Save wallet and mint for unshield test
  const testData = {
    mint: mint.toBase58(),
    walletSpendingKey: Array.from(privacyWallet.exportSpendingKey()),
  };
  fs.writeFileSync(
    path.join(__dirname, '.test-data.json'),
    JSON.stringify(testData, null, 2)
  );
  console.log('\nTest data saved to scripts/.test-data.json');
}

main().catch(console.error);
