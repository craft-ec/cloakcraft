/**
 * Register verification keys on Solana using Anchor client
 *
 * Usage: npx tsx scripts/register-vkeys.ts [--network <network>]
 */

import * as fs from 'fs';
import * as path from 'path';
import { Connection, PublicKey, Keypair, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';

// Load IDL
const IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'target', 'idl', 'cloakcraft.json'), 'utf-8')
);

// Circuit configuration
const CIRCUITS = [
  { id: 'transfer_1x2', name: 'transfer_1x2____________________' },
  { id: 'transfer_1x3', name: 'transfer_1x3____________________' },
  { id: 'adapter_1x1', name: 'adapter_1x1_____________________' },
  { id: 'adapter_1x2', name: 'adapter_1x2_____________________' },
  { id: 'market_order_create', name: 'market_order_create_____________' },
  { id: 'market_order_fill', name: 'market_order_fill_______________' },
  { id: 'market_order_cancel', name: 'market_order_cancel_____________' },
  { id: 'swap_add_liquidity', name: 'swap_add_liquidity______________' },
  { id: 'swap_remove_liquidity', name: 'swap_remove_liquidity___________' },
  { id: 'swap_swap', name: 'swap_swap_______________________' },
  { id: 'governance_encrypted_submit', name: 'governance_encrypted_submit_____' },
] as const;

// Network configurations
const NETWORKS: Record<string, { url: string }> = {
  localnet: { url: 'http://localhost:8899' },
  devnet: { url: 'https://api.devnet.solana.com' },
};

/**
 * Convert circuit ID string to 32-byte array
 */
function circuitIdToBytes(name: string): number[] {
  const bytes = new Array(32).fill(0);
  const encoded = Buffer.from(name, 'utf-8');
  for (let i = 0; i < Math.min(encoded.length, 32); i++) {
    bytes[i] = encoded[i];
  }
  return bytes;
}

/**
 * Load verification key from file
 */
function loadVkData(circuitId: string): Buffer | null {
  const keysDir = path.join(__dirname, '..', 'keys');
  const vkPath = path.join(keysDir, `${circuitId}.vk`);

  if (!fs.existsSync(vkPath)) {
    console.log(`  Warning: VK file not found: ${vkPath}`);
    return null;
  }

  return fs.readFileSync(vkPath);
}

// Instruction discriminators from IDL
const REGISTER_VK_DISCRIMINATOR = Buffer.from([252, 136, 235, 8, 197, 79, 40, 67]);
const SET_VK_DATA_DISCRIMINATOR = Buffer.from([117, 234, 100, 99, 128, 32, 44, 101]);

/**
 * Build raw instruction data for register_verification_key (with empty VK)
 */
function buildRegisterInstructionData(circuitId: number[]): Buffer {
  const data = Buffer.alloc(8 + 32 + 4); // discriminator + circuit_id + empty vec
  let offset = 0;

  REGISTER_VK_DISCRIMINATOR.copy(data, offset);
  offset += 8;

  Buffer.from(circuitId).copy(data, offset);
  offset += 32;

  data.writeUInt32LE(0, offset); // empty vk_data
  return data;
}

/**
 * Build raw instruction data for set_verification_key_data
 */
function buildSetVkDataInstructionData(circuitId: number[], vkData: Buffer): Buffer {
  const data = Buffer.alloc(8 + 32 + 4 + vkData.length);
  let offset = 0;

  SET_VK_DATA_DISCRIMINATOR.copy(data, offset);
  offset += 8;

  Buffer.from(circuitId).copy(data, offset);
  offset += 32;

  data.writeUInt32LE(vkData.length, offset);
  offset += 4;

  vkData.copy(data, offset);
  return data;
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  let network = 'localnet';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--network' && args[i + 1]) {
      network = args[i + 1];
      i++;
    }
  }

  if (!NETWORKS[network]) {
    console.error(`Unknown network: ${network}`);
    console.error(`Available networks: ${Object.keys(NETWORKS).join(', ')}`);
    process.exit(1);
  }

  const config = NETWORKS[network];
  console.log('==========================================');
  console.log('CloakCraft Verification Key Registration');
  console.log('==========================================');
  console.log(`Network: ${network}`);
  console.log(`RPC: ${config.url}`);
  console.log(`Program: ${IDL.address}`);
  console.log('');

  // Load authority keypair
  const authorityPath = process.env.AUTHORITY_KEYPAIR
    ?? path.join(process.env.HOME ?? '', '.config', 'solana', 'id.json');

  if (!fs.existsSync(authorityPath)) {
    console.error(`Authority keypair not found: ${authorityPath}`);
    console.error('Set AUTHORITY_KEYPAIR environment variable or configure Solana CLI');
    process.exit(1);
  }

  const authorityData = JSON.parse(fs.readFileSync(authorityPath, 'utf-8'));
  const authority = Keypair.fromSecretKey(new Uint8Array(authorityData));
  console.log(`Authority: ${authority.publicKey.toBase58()}`);
  console.log('');

  // Setup Anchor - Anchor 0.30+ API: Program(idl, provider)
  // programId comes from idl.address
  const connection = new Connection(config.url, 'confirmed');
  const wallet = new Wallet(authority);
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(IDL, provider);
  const programId = program.programId;

  // Check authority balance
  const balance = await connection.getBalance(authority.publicKey);
  console.log(`Authority balance: ${balance / 1e9} SOL`);
  if (balance < 1e8) {
    console.warn('Warning: Low balance. Each VK registration costs ~0.02 SOL');
  }
  console.log('');

  // Register each circuit's VK
  let registered = 0;
  let skipped = 0;
  let failed = 0;

  for (const circuit of CIRCUITS) {
    console.log(`[${circuit.id}]`);

    const vkData = loadVkData(circuit.id);
    if (!vkData) {
      console.log('  Skipped (no VK data)');
      skipped++;
      continue;
    }

    const circuitId = circuitIdToBytes(circuit.name);

    // Derive VK PDA
    const [vkPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vk'), Buffer.from(circuitId)],
      programId
    );

    // Check if already registered
    const existing = await connection.getAccountInfo(vkPda);
    if (existing) {
      console.log(`  Already registered at ${vkPda.toBase58()}`);
      skipped++;
      continue;
    }

    try {
      let signature: string;

      // Large VKs need two-step process due to transaction size limits
      // Step 1: Initialize account with empty VK (needs SystemProgram = more accounts)
      // Step 2: Set VK data (fewer accounts, more room for data)
      if (vkData.length > 900) {
        console.log(`  Using two-step process (VK size ${vkData.length} bytes)`);

        // Step 1: Initialize account with empty VK
        const registerData = buildRegisterInstructionData(circuitId);
        const registerIx = new TransactionInstruction({
          keys: [
            { pubkey: vkPda, isSigner: false, isWritable: true },
            { pubkey: authority.publicKey, isSigner: true, isWritable: false },
            { pubkey: authority.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
          ],
          programId,
          data: registerData,
        });

        const tx1 = new Transaction().add(registerIx);
        let { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
        tx1.recentBlockhash = blockhash;
        tx1.feePayer = authority.publicKey;
        tx1.sign(authority);

        const sig1 = await connection.sendRawTransaction(tx1.serialize());
        await connection.confirmTransaction({ signature: sig1, blockhash, lastValidBlockHeight }, 'confirmed');
        console.log(`  Step 1 (init): ${sig1}`);

        // Step 2: Set VK data (no SystemProgram needed)
        const setVkData = buildSetVkDataInstructionData(circuitId, vkData);
        const setVkIx = new TransactionInstruction({
          keys: [
            { pubkey: vkPda, isSigner: false, isWritable: true },
            { pubkey: authority.publicKey, isSigner: true, isWritable: false },
          ],
          programId,
          data: setVkData,
        });

        const tx2 = new Transaction().add(setVkIx);
        ({ blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash());
        tx2.recentBlockhash = blockhash;
        tx2.feePayer = authority.publicKey;
        tx2.sign(authority);

        signature = await connection.sendRawTransaction(tx2.serialize());
        await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
        console.log(`  Step 2 (data): ${signature}`);
      } else {
        signature = await program.methods
          .registerVerificationKey(circuitId, vkData)
          .accounts({
            verificationKey: vkPda,
            authority: authority.publicKey,
            payer: authority.publicKey,
            systemProgram: PublicKey.default,
          })
          .rpc();
        console.log(`  Registered: ${signature}`);
      }

      console.log(`  PDA: ${vkPda.toBase58()}`);
      console.log(`  VK size: ${vkData.length} bytes`);
      registered++;
    } catch (err: any) {
      console.error(`  Failed: ${err.message || err}`);
      if (err.logs) {
        console.error('  Logs:', err.logs.slice(-5).join('\n       '));
      }
      failed++;
    }
  }

  console.log('');
  console.log('==========================================');
  console.log('Summary');
  console.log('==========================================');
  console.log(`Registered: ${registered}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
}

main().catch(console.error);
