/**
 * Register verification keys on Solana devnet
 *
 * Usage: npx ts-node scripts/register-vkeys.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Program ID
const PROGRAM_ID = new PublicKey("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");

// Seeds
const VK_SEED = Buffer.from("vk");

// Circuit configurations
const CIRCUITS = [
  { id: "transfer_1x2", file: "transfer_1x2.vk" },
  { id: "transfer_2x2", file: "transfer_2x2.vk" },
  { id: "adapter_1x1", file: "adapter_1x1.vk" },
  { id: "adapter_1x2", file: "adapter_1x2.vk" },
  { id: "market_order_create", file: "market_order_create.vk" },
  { id: "market_order_fill", file: "market_order_fill.vk" },
  { id: "market_order_cancel", file: "market_order_cancel.vk" },
  { id: "swap_add_liquidity", file: "swap_add_liquidity.vk" },
  { id: "swap_remove_liquidity", file: "swap_remove_liquidity.vk" },
  { id: "swap_swap", file: "swap_swap.vk" },
  { id: "governance_encrypted_submit", file: "governance_encrypted_submit.vk" },
];

function padCircuitId(id: string): Buffer {
  // Pad with underscores to match on-chain constants.rs format
  const padded = id.padEnd(32, '_');
  return Buffer.from(padded);
}

async function main() {
  // Check for --force flag
  const forceUpdate = process.argv.includes('--force');
  if (forceUpdate) {
    console.log("Force update mode: will overwrite existing VKs\n");
  }

  // Setup connection
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY || '88ac54a3-8850-4686-a521-70d116779182';
  const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const connection = new Connection(RPC_URL, "confirmed");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program:", PROGRAM_ID.toBase58());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  // Load IDL
  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  // Setup provider and program
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = new Program(idl, provider);

  // VK directory (Circom VKs converted to Solana format)
  const vkDir = path.join(__dirname, "..", "keys");

  // Register each circuit
  for (const circuit of CIRCUITS) {
    const circuitId = padCircuitId(circuit.id);
    const [vkPda] = PublicKey.findProgramAddressSync(
      [VK_SEED, circuitId],
      PROGRAM_ID
    );

    console.log(`\n[${circuit.id}]`);
    console.log("  PDA:", vkPda.toBase58());

    // Check if already registered
    const accountInfo = await connection.getAccountInfo(vkPda);
    if (accountInfo) {
      // Check if VK data is actually populated
      const vecLen = accountInfo.data.readUInt32LE(40);
      if (vecLen > 0 && !forceUpdate) {
        console.log("  Status: Already registered ✓");
        continue;
      }
      if (vecLen > 0 && forceUpdate) {
        console.log("  Status: Already registered, will overwrite...");
      } else {
        console.log("  Account exists but VK data is empty, uploading...");
      }
    }

    // Load VK data
    const vkPath = path.join(vkDir, circuit.file);
    if (!fs.existsSync(vkPath)) {
      console.log("  Status: VK file not found, skipping");
      continue;
    }

    const vkData = fs.readFileSync(vkPath);
    console.log("  VK size:", vkData.length, "bytes");

    try {
      const SINGLE_TX_VK_LIMIT = 700; // ~700 bytes is safe for single tx
      const CHUNK_SIZE = 500; // Safe chunk size for transaction limits

      // Determine if account already exists (from previous failed attempt)
      const accountExists = accountInfo !== null;

      // Force update: clear existing data then append in chunks
      if (forceUpdate && accountExists) {
        console.log("  Clearing existing VK data...");
        // First clear the VK data (with realloc support)
        await program.methods
          .setVerificationKeyData(
            Array.from(circuitId) as any,
            Buffer.from([]) // Empty data to clear
          )
          .accounts({
            verificationKey: vkPda,
            authority: wallet.publicKey,
            payer: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
        console.log("  VK data cleared ✓");

        // Wait for confirmation
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Upload VK data in chunks
        const chunks = [];
        for (let i = 0; i < vkData.length; i += CHUNK_SIZE) {
          chunks.push(vkData.slice(i, i + CHUNK_SIZE));
        }
        console.log(`  Uploading ${chunks.length} chunks...`);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          await program.methods
            .appendVerificationKeyData(
              Array.from(circuitId) as any,
              Buffer.from(chunk)
            )
            .accounts({
              verificationKey: vkPda,
              authority: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
          console.log(`  Chunk ${i + 1}/${chunks.length}: ✓`);

          // Small delay between chunks
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        console.log("  Status: Updated ✓");
        continue;
      }

      if (!accountExists && vkData.length <= SINGLE_TX_VK_LIMIT) {
        // Small VK, no existing account - register in single transaction
        const tx = await program.methods
          .registerVerificationKey(
            Array.from(circuitId) as any,
            Buffer.from(vkData)
          )
          .accounts({
            verificationKey: vkPda,
            authority: wallet.publicKey,
            payer: wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        console.log("  Status: Registered ✓");
        console.log("  Tx:", tx);
      } else {
        // Either large VK or account exists with empty data - use chunked approach
        console.log("  Using chunked upload...");

        if (!accountExists) {
          // Create account with empty data
          const tx1 = await program.methods
            .registerVerificationKey(
              Array.from(circuitId) as any,
              Buffer.from([]) // Empty data
            )
            .accounts({
              verificationKey: vkPda,
              authority: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
          console.log("  Account created ✓");
          console.log("  Tx:", tx1);

          // Wait for confirmation
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Upload VK data in chunks
        const chunks = [];
        for (let i = 0; i < vkData.length; i += CHUNK_SIZE) {
          chunks.push(vkData.slice(i, i + CHUNK_SIZE));
        }
        console.log(`  Uploading ${chunks.length} chunks...`);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          await program.methods
            .appendVerificationKeyData(
              Array.from(circuitId) as any,
              Buffer.from(chunk)
            )
            .accounts({
              verificationKey: vkPda,
              authority: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
          console.log(`  Chunk ${i + 1}/${chunks.length}: ✓`);

          // Small delay between chunks
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        console.log("  Status: Registered ✓");
      }
    } catch (err: any) {
      console.log("  Status: Failed ✗");
      console.log("  Error:", err.message);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
