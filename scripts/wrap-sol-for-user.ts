import { Connection, PublicKey, Keypair, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createSyncNativeInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccountInstruction, NATIVE_MINT } from '@solana/spl-token';
import * as fs from 'fs';

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const recipient = new PublicKey('EKRWJY7pLfNp5RJiqLinyAQf4ZFuU5aW1WoThMtYgMbc');
  
  // Load default keypair
  const keypairPath = process.env.HOME + '/.config/solana/id.json';
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
  const payer = Keypair.fromSecretKey(new Uint8Array(keypairData));
  
  // Get or create ATA for wSOL
  const ata = getAssociatedTokenAddressSync(NATIVE_MINT, recipient);
  
  const tx = new Transaction();
  
  // Check if ATA exists
  const ataInfo = await connection.getAccountInfo(ata);
  if (!ataInfo) {
    console.log('Creating wSOL ATA for recipient...');
    tx.add(createAssociatedTokenAccountInstruction(payer.publicKey, ata, recipient, NATIVE_MINT));
  }
  
  // Transfer SOL to the ATA
  const amount = 0.5 * LAMPORTS_PER_SOL;
  tx.add(SystemProgram.transfer({
    fromPubkey: payer.publicKey,
    toPubkey: ata,
    lamports: amount,
  }));
  
  // Sync native to update token balance
  tx.add(createSyncNativeInstruction(ata));
  
  const sig = await connection.sendTransaction(tx, [payer]);
  await connection.confirmTransaction(sig);
  console.log('Transaction:', sig);
  console.log('Sent 0.5 wSOL to', recipient.toBase58());
  console.log('ATA:', ata.toBase58());
}

main().catch(console.error);
