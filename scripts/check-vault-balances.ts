import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');

async function main() {
  // Token mints
  const solMint = new PublicKey('So11111111111111111111111111111111111111112');
  const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

  // Derive pool PDAs
  const [solPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), solMint.toBuffer()],
    PROGRAM_ID
  );
  const [usdcPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), usdcMint.toBuffer()],
    PROGRAM_ID
  );

  // Derive vault PDAs (token accounts owned by pools)
  const [solVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), solMint.toBuffer()],
    PROGRAM_ID
  );
  const [usdcVaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), usdcMint.toBuffer()],
    PROGRAM_ID
  );

  console.log('SOL Pool PDA:', solPoolPda.toBase58());
  console.log('SOL Vault PDA:', solVaultPda.toBase58());
  console.log('USDC Pool PDA:', usdcPoolPda.toBase58());
  console.log('USDC Vault PDA:', usdcVaultPda.toBase58());

  // Check actual vault balances
  const solVaultInfo = await connection.getAccountInfo(solVaultPda);
  const usdcVaultInfo = await connection.getAccountInfo(usdcVaultPda);

  if (solVaultInfo) {
    // Token account: amount is at offset 64, u64 little-endian
    const solAmount = solVaultInfo.data.readBigUInt64LE(64);
    console.log('\nSOL Vault Balance:', (Number(solAmount) / 1e9).toFixed(9), 'SOL');
  } else {
    console.log('\nSOL Vault: Not found');
  }

  if (usdcVaultInfo) {
    const usdcAmount = usdcVaultInfo.data.readBigUInt64LE(64);
    console.log('USDC Vault Balance:', (Number(usdcAmount) / 1e6).toFixed(6), 'USDC');
  } else {
    console.log('USDC Vault: Not found');
  }

  // Check AMM pool state
  const [ammPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('amm_pool'), solMint.toBuffer(), usdcMint.toBuffer()],
    PROGRAM_ID
  );

  const ammPoolInfo = await connection.getAccountInfo(ammPoolPda);
  if (ammPoolInfo) {
    // AmmPool: discriminator(8) + pool_id(32) + token_a(32) + token_b(32) + lp_mint(32) + state_hash(32) + reserve_a(8) + reserve_b(8)
    const reserve_a = ammPoolInfo.data.readBigUInt64LE(8 + 32 + 32 + 32 + 32 + 32);
    const reserve_b = ammPoolInfo.data.readBigUInt64LE(8 + 32 + 32 + 32 + 32 + 32 + 8);
    const lp_supply = ammPoolInfo.data.readBigUInt64LE(8 + 32 + 32 + 32 + 32 + 32 + 8 + 8);

    console.log('\nAMM Pool State (from PDA):');
    console.log('Reserve A:', (Number(reserve_a) / 1e9).toFixed(9), 'SOL');
    console.log('Reserve B:', (Number(reserve_b) / 1e6).toFixed(6), 'USDC');
    console.log('LP Supply:', (Number(lp_supply) / 1e9).toFixed(9));

    console.log('\n=== COMPARISON ===');
    console.log('Vault SOL vs Pool Reserve A:', solVaultInfo ? 'Match' : 'Vault missing');
    console.log('Vault USDC vs Pool Reserve B:', usdcVaultInfo ? 'Match' : 'Vault missing');
  }
}

main().catch(console.error);
