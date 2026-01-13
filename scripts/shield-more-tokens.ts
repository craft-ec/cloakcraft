/**
 * Shield more tokens to existing AMM pools (no new token creation)
 */
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import fs from 'fs';
import { CloakCraftClient } from '../packages/sdk/src/client';

const RPC_URL = 'https://devnet.helius-rpc.com/?api-key=95814ac0-13d1-483b-b2c1-1f3cb5c7754e';
const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');

async function main() {
  console.log('\n=== SHIELD MORE TOKENS ===\n');

  const connection = new Connection(RPC_URL, 'confirmed');
  const mainWallet = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync('/Users/onlyabrak/.config/solana/id.json', 'utf-8')))
  );

  console.log(`Wallet: ${mainWallet.publicKey.toBase58()}`);

  // Load existing tokens
  const tokensConfig = JSON.parse(fs.readFileSync('./scripts/.fresh-amm-tokens.json', 'utf-8'));
  const TOKEN_A_MINT = new PublicKey(tokensConfig.tokenA);
  const TOKEN_B_MINT = new PublicKey(tokensConfig.tokenB);

  console.log(`Token A: ${TOKEN_A_MINT.toBase58()}`);
  console.log(`Token B: ${TOKEN_B_MINT.toBase58()}`);

  // Load privacy wallet
  const privacyWallet = JSON.parse(fs.readFileSync('./scripts/.fresh-amm-wallet.json', 'utf-8'));
  console.log(`Privacy wallet X: ${privacyWallet.publicKey.x.slice(0, 16)}...\n`);

  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(mainWallet), {});
  const client = new CloakCraftClient(provider, PROGRAM_ID, RPC_URL);

  // Shield Token A
  console.log('[TOKEN A] Shielding 5000 tokens...');
  const shieldATx = await client.shield(
    TOKEN_A_MINT,
    5000n * 1_000_000_000n, // 5000 tokens with 9 decimals
    privacyWallet,
    mainWallet
  );
  console.log(`  ✓ Shielded! TX: ${shieldATx.slice(0, 16)}...`);

  // Shield Token B
  console.log('\n[TOKEN B] Shielding 50000 tokens...');
  const shieldBTx = await client.shield(
    TOKEN_B_MINT,
    50000n * 1_000_000_000n, // 50000 tokens with 9 decimals
    privacyWallet,
    mainWallet
  );
  console.log(`  ✓ Shielded! TX: ${shieldBTx.slice(0, 16)}...`);

  console.log('\n✓✓✓ SUCCESS! Tokens shielded and ready for testing!\n');
  console.log('Waiting 15s for indexing before running tests...');
  await new Promise(resolve => setTimeout(resolve, 15000));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
