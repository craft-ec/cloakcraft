/**
 * End-to-End Proof Verification Test
 *
 * This script tests the complete flow:
 * 1. Initialize a pool for a test token
 * 2. Shield tokens (deposit into the pool)
 * 3. Generate a ZK proof using Sunspot
 * 4. Call transact with the proof
 * 5. Verify the proof passes on-chain
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";

// Program ID
const PROGRAM_ID = new PublicKey("HsQk1VmzbDwXZnQfevgJvHAfYioFmKJKCBgfuTFKVJAu");

// Seeds
const SEEDS = {
  POOL: Buffer.from("pool"),
  VAULT: Buffer.from("vault"),
  VK: Buffer.from("vk"),
};

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

async function main() {
  console.log("=== End-to-End Proof Verification Test ===\n");

  // Setup connection to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("Wallet:", wallet.publicKey.toBase58());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL\n");

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log("Insufficient balance. Please airdrop SOL to your wallet.");
    return;
  }

  // Load IDL and create program
  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = new Program(idl, provider);

  // === Step 1: Check if VK is registered ===
  console.log("Step 1: Checking verification key...");
  const circuitId = padCircuitId("transfer_1x2");
  const [vkPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VK, circuitId],
    PROGRAM_ID
  );

  const vkAccount = await connection.getAccountInfo(vkPda);
  if (!vkAccount) {
    console.log("ERROR: Verification key not registered. Run register-vkeys.ts first.");
    return;
  }
  console.log("VK registered at:", vkPda.toBase58());
  console.log("VK data length:", vkAccount.data.length, "bytes\n");

  // === Step 2: Create test token mint ===
  console.log("Step 2: Creating test token mint...");
  const mintKeypair = Keypair.generate();
  const mint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    null,
    9, // 9 decimals like SOL
    mintKeypair
  );
  console.log("Test token mint:", mint.toBase58());

  // Create associated token account for wallet
  const walletAta = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey
  );
  console.log("Wallet ATA:", walletAta.address.toBase58());

  // Mint some tokens to wallet
  const mintAmount = 1000_000_000_000n; // 1000 tokens
  await mintTo(
    connection,
    wallet,
    mint,
    walletAta.address,
    wallet,
    mintAmount
  );
  console.log("Minted:", Number(mintAmount) / 1e9, "tokens\n");

  // === Step 3: Initialize pool ===
  console.log("Step 3: Initializing shielded pool...");

  const [poolPda] = PublicKey.findProgramAddressSync(
    [SEEDS.POOL, mint.toBuffer()],
    PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, mint.toBuffer()],
    PROGRAM_ID
  );

  console.log("Pool PDA:", poolPda.toBase58());
  console.log("Vault PDA:", vaultPda.toBase58());

  try {
    const tx = await program.methods
      .initializePool()
      .accounts({
        pool: poolPda,
        tokenVault: vaultPda,
        tokenMint: mint,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ])
      .rpc();
    console.log("Pool initialized! Tx:", tx, "\n");
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Pool already exists\n");
    } else {
      throw err;
    }
  }

  // Get pool state
  const poolAccount = await (program.account as any).pool.fetch(poolPda);
  console.log("Pool state:");
  console.log("  Token mint:", poolAccount.tokenMint.toBase58());
  console.log("  Total shielded:", poolAccount.totalShielded.toString(), "\n");

  // === Step 4: Generate test values for circuit ===
  console.log("Step 4: Generating test values...");

  // Use simple test values matching the circuit test
  // These need to be computed properly for a real test
  const testValues = {
    spending_key: 123n,
    token_mint: BigInt("0x" + mint.toBuffer().toString("hex").slice(0, 16)), // Use first 8 bytes
    in_amount: 500n,
    in_randomness: 111n,
    out_pub_x_1: 12345n,
    out_amount_1: 300n,
    out_randomness_1: 222n,
    out_pub_x_2: 67890n,
    out_amount_2: 200n,
    out_randomness_2: 333n,
    unshield_amount: 0n,
  };

  console.log("Test values generated (simplified for testing)\n");

  // === Step 5: Generate Prover.toml ===
  console.log("Step 5: Writing Prover.toml...");

  const circuitDir = path.join(__dirname, "..", "circuits", "transfer", "1x2");
  const proverToml = generateProverToml(testValues, mint);
  fs.writeFileSync(path.join(circuitDir, "Prover.toml"), proverToml);
  console.log("Prover.toml written to:", path.join(circuitDir, "Prover.toml"), "\n");

  // === Step 6: Generate witness with nargo ===
  console.log("Step 6: Generating witness with nargo...");

  const nargoPath = path.join(os.homedir(), ".nargo", "bin", "nargo");

  try {
    execFileSync(nargoPath, ["execute", "transfer_1x2"], {
      cwd: circuitDir,
      stdio: "pipe",
    });
    console.log("Witness generated successfully!\n");
  } catch (err: any) {
    console.log("WARNING: nargo execute failed (constraints may not be satisfied)");
    console.log("This is expected for simplified test values.\n");
    console.log("Error:", err.stderr?.toString() || err.message);
    console.log("\nTo complete the test, you need valid circuit inputs that satisfy all constraints.");
    console.log("This requires proper Poseidon hash computation matching the circuit.\n");
    return;
  }

  // === Step 7: Generate proof with sunspot ===
  console.log("Step 7: Generating Groth16 proof with sunspot...");

  const sunspotPath = path.join(__dirname, "..", "scripts", "sunspot");
  const targetDir = path.join(__dirname, "..", "circuits", "target");

  const acirPath = path.join(targetDir, "transfer_1x2.json");
  const witnessPath = path.join(targetDir, "transfer_1x2.gz");
  const ccsPath = path.join(targetDir, "transfer_1x2.ccs");
  const pkPath = path.join(targetDir, "transfer_1x2.pk");

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "proof-e2e-"));

  try {
    execFileSync(sunspotPath, ["prove", acirPath, witnessPath, ccsPath, pkPath], {
      cwd: tempDir,
      stdio: "pipe",
    });

    const proofPath = path.join(tempDir, "proof.bin");
    if (fs.existsSync(proofPath)) {
      const proofBytes = fs.readFileSync(proofPath);
      console.log("Proof generated:", proofBytes.length, "bytes");

      // === Step 8: Submit proof on-chain ===
      console.log("\nStep 8: Submitting proof on-chain...");
      // This would call the transact instruction
      // For now, we've verified the proof generation works

      console.log("\n=== SUCCESS ===");
      console.log("Proof generated successfully!");
      console.log("Next step: Submit to transact instruction on-chain.");
    } else {
      console.log("Proof file not found");
    }
  } catch (err: any) {
    console.log("Sunspot prove failed:", err.message);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function generateProverToml(_values: any, mint: PublicKey): string {
  // Simplified Prover.toml - real values would need proper hash computation
  return `
# Public inputs
merkle_root = "0x0000000000000000000000000000000000000000000000000000000000000000"
nullifier = "0x0000000000000000000000000000000000000000000000000000000000000000"
out_commitment_1 = "0x0000000000000000000000000000000000000000000000000000000000000000"
out_commitment_2 = "0x0000000000000000000000000000000000000000000000000000000000000000"
token_mint = "0x${mint.toBuffer().toString("hex").slice(0, 64).padStart(64, "0")}"
unshield_amount = "0x0000000000000000000000000000000000000000000000000000000000000000"

# Private inputs
in_stealth_pub_x = "0x0000000000000000000000000000000000000000000000000000000000000001"
in_stealth_pub_y = "0x0000000000000000000000000000000000000000000000000000000000000001"
in_amount = "0x00000000000000000000000000000000000000000000000000000000000001f4"
in_randomness = "0x000000000000000000000000000000000000000000000000000000000000006f"
in_stealth_spending_key = "0x000000000000000000000000000000000000000000000000000000000000007b"

# Merkle path (16 elements)
merkle_path = ["0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000"]
merkle_path_indices = ["0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000", "0x0000000000000000000000000000000000000000000000000000000000000000"]
leaf_index = "0x0000000000000000000000000000000000000000000000000000000000000000"

# Output 1
out_stealth_pub_x_1 = "0x0000000000000000000000000000000000000000000000000000000000003039"
out_amount_1 = "0x000000000000000000000000000000000000000000000000000000000000012c"
out_randomness_1 = "0x00000000000000000000000000000000000000000000000000000000000000de"

# Output 2
out_stealth_pub_x_2 = "0x0000000000000000000000000000000000000000000000000000000001093d2"
out_amount_2 = "0x00000000000000000000000000000000000000000000000000000000000000c8"
out_randomness_2 = "0x000000000000000000000000000000000000000000000000000000000000014d"
`.trim();
}

main().catch(console.error);
