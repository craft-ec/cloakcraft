import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import idl from '../packages/sdk/src/idl/cloakcraft.json';

const LP_MINT = new PublicKey('7NfG79TEbBEhs1jb6x2WWFRTVHNnkqbkZAvfqxBEKjLd');

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = new Program(idl as any, provider);

  console.log('Initializing LP Pool for SOL/USDC AMM...');
  console.log(`LP Mint: ${LP_MINT.toBase58()}`);
  console.log(`Payer: ${provider.wallet.publicKey.toBase58()}`);

  // Derive Pool PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), LP_MINT.toBuffer()],
    program.programId
  );
  console.log(`Pool PDA: ${poolPda.toBase58()}`);

  // Derive Vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), LP_MINT.toBuffer()],
    program.programId
  );
  console.log(`Vault PDA: ${vaultPda.toBase58()}`);

  // Initialize Pool
  try {
    const poolTx = await (program.methods as any)
      .initializePool()
      .accounts({
        pool: poolPda,
        tokenMint: LP_MINT,
        tokenVault: vaultPda,
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log('✅ Pool initialized!');
    console.log(`Transaction: ${poolTx}`);
    console.log(`https://explorer.solana.com/tx/${poolTx}?cluster=devnet`);
  } catch (err) {
    console.error('Error initializing pool:', err);
    throw err;
  }

  // Initialize Commitment Counter
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('commitment_counter'), poolPda.toBuffer()],
    program.programId
  );
  console.log(`\nCommitment Counter PDA: ${counterPda.toBase58()}`);

  try {
    const counterTx = await (program.methods as any)
      .initializeCommitmentCounter()
      .accounts({
        pool: poolPda,
        commitmentCounter: counterPda,
        authority: provider.wallet.publicKey,
        payer: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log('✅ Commitment counter initialized!');
    console.log(`Transaction: ${counterTx}`);
    console.log(`https://explorer.solana.com/tx/${counterTx}?cluster=devnet`);
  } catch (err) {
    console.error('Error initializing counter:', err);
    throw err;
  }

  console.log('\n🎉 SOL/USDC LP Pool is now ready for liquidity!');
}

main().catch(console.error);
