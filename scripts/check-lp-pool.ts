import { Connection, PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import idl from '../packages/sdk/src/idl/cloakcraft.json';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new Program(idl as any, provider);
  const PROGRAM_ID = program.programId;

  // Get all AMM pools
  const ammPools = await (program.account as any).ammPool.all();

  console.log(`Found ${ammPools.length} AMM pools\n`);

  for (const { publicKey, account } of ammPools) {
    const tokenA = account.tokenAMint as PublicKey;
    const tokenB = account.tokenBMint as PublicKey;
    const lpMint = account.lpMint as PublicKey;

    console.log('='.repeat(80));
    console.log(`AMM Pool: ${publicKey.toBase58()}`);
    console.log(`Token A: ${tokenA.toBase58()}`);
    console.log(`Token B: ${tokenB.toBase58()}`);
    console.log(`LP Mint: ${lpMint.toBase58()}`);
    console.log(`Reserve A: ${account.reserveA.toString()}`);
    console.log(`Reserve B: ${account.reserveB.toString()}`);
    console.log(`LP Supply: ${account.lpSupply.toString()}`);

    // Check if LP Pool exists
    const [lpPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), lpMint.toBuffer()],
      PROGRAM_ID
    );

    const lpPoolAccount = await provider.connection.getAccountInfo(lpPoolPda);

    console.log(`\nLP Pool PDA: ${lpPoolPda.toBase58()}`);
    if (lpPoolAccount) {
      console.log('✅ LP Pool EXISTS');

      // Try to fetch and decode it
      try {
        const lpPool = await (program.account as any).pool.fetch(lpPoolPda);
        console.log(`   Token Mint: ${(lpPool.tokenMint as PublicKey).toBase58()}`);
        console.log(`   Total Shielded: ${lpPool.totalShielded.toString()}`);
      } catch (err) {
        console.log('   (Could not decode pool data)');
      }
    } else {
      console.log('❌ LP Pool DOES NOT EXIST - Needs initialization!');
    }
    console.log();
  }
}

main().catch(console.error);
