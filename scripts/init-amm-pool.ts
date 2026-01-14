/**
 * Initialize a new AMM liquidity pool
 *
 * Usage: npx tsx scripts/init-amm-pool.ts <tokenA> <tokenB> <feeBps>
 * Example: npx tsx scripts/init-amm-pool.ts So11111111111111111111111111111111111111112 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 30
 */

import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Keypair } from '@solana/web3.js';
import { CloakCraftClient } from '../packages/sdk/dist/index';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/init-amm-pool.ts <tokenA> <tokenB> [feeBps]');
    console.error('Example: npx tsx scripts/init-amm-pool.ts So11111111111111111111111111111111111111112 EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v 30');
    process.exit(1);
  }

  const tokenAMint = new PublicKey(args[0]);
  const tokenBMint = new PublicKey(args[1]);
  const feeBps = args[2] ? parseInt(args[2]) : 30; // Default 0.3%

  console.log('Initializing AMM Pool...');
  console.log('Token A:', tokenAMint.toBase58());
  console.log('Token B:', tokenBMint.toBase58());
  console.log('Fee:', feeBps / 100 + '%');

  // Setup provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load program
  const programId = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
  const idl = JSON.parse(
    require('fs').readFileSync('./target/idl/cloakcraft.json', 'utf8')
  );
  const program = new anchor.Program(idl, programId, provider);

  // Create client
  const client = new CloakCraftClient(provider.connection, programId);
  client.setProgram(program);

  // Generate LP mint keypair
  const lpMintKeypair = Keypair.generate();
  console.log('LP Mint:', lpMintKeypair.publicKey.toBase58());

  // Initialize pool
  const signature = await client.initializeAmmPool(
    tokenAMint,
    tokenBMint,
    lpMintKeypair,
    feeBps,
    provider.wallet.payer
  );

  console.log('\n✅ Pool initialized successfully!');
  console.log('Transaction:', signature);
  console.log(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  console.log('\n📝 Pool Details:');
  console.log('  Token A:', tokenAMint.toBase58());
  console.log('  Token B:', tokenBMint.toBase58());
  console.log('  LP Mint:', lpMintKeypair.publicKey.toBase58());
  console.log('  Fee:', feeBps / 100 + '%');
  console.log('\nNext step: Add initial liquidity to the pool');
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
