import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');

async function main() {
  // Derive AMM pool PDA for SOL/USDC
  const solMint = new PublicKey('So11111111111111111111111111111111111111112');
  const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'); // DevNet USDC

  const [ammPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('amm_pool'), solMint.toBuffer(), usdcMint.toBuffer()],
    PROGRAM_ID
  );

  console.log('AMM Pool PDA:', ammPoolPda.toBase58());

  const accountInfo = await connection.getAccountInfo(ammPoolPda);
  if (!accountInfo) {
    console.log('Pool not found');
    return;
  }

  // Parse the account data
  // AmmPool structure: discriminator (8) + token_a_mint (32) + token_b_mint (32) + pool_id (32) + reserve_a (8) + reserve_b (8) + lp_supply (8) + state_hash (32) + fee_bps (2) + bump (1)
  const data = accountInfo.data;
  const reserve_a = data.readBigUInt64LE(8 + 32 + 32 + 32);
  const reserve_b = data.readBigUInt64LE(8 + 32 + 32 + 32 + 8);
  const lp_supply = data.readBigUInt64LE(8 + 32 + 32 + 32 + 8 + 8);
  const state_hash = data.slice(8 + 32 + 32 + 32 + 8 + 8 + 8, 8 + 32 + 32 + 32 + 8 + 8 + 8 + 32);

  console.log('\nCurrent Pool State:');
  console.log('Reserve A (SOL):', (Number(reserve_a) / 1e9).toFixed(9), 'SOL');
  console.log('Reserve B (USDC):', (Number(reserve_b) / 1e6).toFixed(6), 'USDC');
  console.log('LP Supply:', (Number(lp_supply) / 1e9).toFixed(9));
  console.log('State Hash:', state_hash.toString('hex'));
}

main().catch(console.error);
