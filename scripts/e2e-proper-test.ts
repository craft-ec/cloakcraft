/**
 * Proper End-to-End Proof Verification Test
 *
 * Uses existing proof/witness files and attempts on-chain verification.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Connection,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";

// Program ID
const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");

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

// Convert hex string to bytes array (32 bytes)
function hexToBytes32(hex: string): number[] {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = cleaned.padStart(64, "0");
  const bytes: number[] = [];
  for (let i = 0; i < 64; i += 2) {
    bytes.push(parseInt(padded.slice(i, i + 2), 16));
  }
  return bytes;
}

async function main() {
  console.log("=== Proper End-to-End Proof Verification Test ===\n");

  // Setup connection to devnet
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("Wallet:", wallet.publicKey.toBase58());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

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

  // Check VK is registered
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

  // Check for existing proof files
  const targetDir = path.join(__dirname, "..", "circuits", "target");
  const proofPath = path.join(targetDir, "transfer_1x2.proof");
  const pwPath = path.join(targetDir, "transfer_1x2.pw");
  const vkPath = path.join(targetDir, "transfer_1x2.vk");

  if (!fs.existsSync(proofPath) || !fs.existsSync(pwPath)) {
    console.log("ERROR: Proof or witness files not found.");
    console.log("Run sunspot prove first to generate proof files.");
    return;
  }

  console.log("Step 2: Loading proof and public witness...");
  console.log("Proof file:", proofPath);
  console.log("PW file:", pwPath);

  const proofData = fs.readFileSync(proofPath);
  const pwData = fs.readFileSync(pwPath);

  console.log("Proof size:", proofData.length, "bytes");
  console.log("PW size:", pwData.length, "bytes\n");

  // Parse public witness - format is: num_public(4 bytes BE) + field1(4 bytes BE) + field2(4 bytes BE) + values
  // Header is 12 bytes, then 32 bytes per public input
  const numPublic = pwData.readUInt32BE(0);
  console.log("Number of public outputs:", numPublic);

  // Extract public inputs (each is 32 bytes, starting at offset 12)
  const publicInputs: bigint[] = [];
  let offset = 12;  // Header is 12 bytes
  for (let i = 0; i < numPublic && offset + 32 <= pwData.length; i++) {
    const value = BigInt("0x" + pwData.slice(offset, offset + 32).toString("hex"));
    publicInputs.push(value);
    offset += 32;
  }

  const inputNames = ["merkle_root", "nullifier", "out_commitment_1", "out_commitment_2", "token_mint", "unshield_amount"];
  console.log("\nExtracted public inputs:");
  for (let i = 0; i < Math.min(publicInputs.length, inputNames.length); i++) {
    console.log(`  ${inputNames[i]}: 0x${publicInputs[i].toString(16).padStart(64, "0")}`);
  }

  // Verify locally with sunspot first
  console.log("\nStep 3: Verifying proof locally with sunspot...");
  const sunspotPath = path.join(__dirname, "sunspot");

  try {
    // Argument order: vk, proof, pw
    execFileSync(sunspotPath, ["verify", vkPath, proofPath, pwPath], {
      stdio: "pipe",
    });
    console.log("Local verification: PASSED\n");
  } catch (err: any) {
    console.log("Local verification FAILED:", err.message);
    return;
  }

  // Now attempt on-chain verification
  console.log("Step 4: Attempting on-chain verification...\n");

  // The proof format is A(64) + C(64) + B(128) = 256 bytes (gnark order)
  const proof256 = Array.from(proofData.slice(0, 256));

  // Prepare public inputs
  const merkleRootBytes = hexToBytes32(publicInputs[0]?.toString(16) || "0");
  const nullifierBytes = hexToBytes32(publicInputs[1]?.toString(16) || "0");
  const outCommitment1Bytes = hexToBytes32(publicInputs[2]?.toString(16) || "0");
  const outCommitment2Bytes = hexToBytes32(publicInputs[3]?.toString(16) || "0");
  const tokenMintField = publicInputs[4] || 0n;
  const unshieldAmount = Number(publicInputs[5] || 0n);

  console.log("token_mint (field):", tokenMintField.toString());
  console.log("unshield_amount:", unshieldAmount);

  // For testing, we need a pool that has the matching merkle_root
  // Let's search for any existing pools
  const pools = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ dataSize: 1592 }],
  });

  if (pools.length === 0) {
    console.log("\nNo pools found. Need to create a pool first.");
    console.log("\nTo complete on-chain verification:");
    console.log("1. Create a pool with a known token mint");
    console.log("2. Shield tokens (creates the commitment in merkle tree)");
    console.log("3. Generate proof for that exact pool state");
    console.log("4. Submit transact with the proof");
    console.log("\n=== Local Verification: PASSED ===");
    console.log("=== On-chain Verification: Requires matching pool state ===");
    return;
  }

  console.log("Found", pools.length, "pool(s)");
  const poolPda = pools[0].pubkey;
  console.log("Using pool:", poolPda.toBase58());

  // Get pool state
  const poolAccount = await (program.account as any).pool.fetch(poolPda);
  const poolMint = poolAccount.tokenMint;
  const poolMerkleRoot = Buffer.from(poolAccount.merkleRoot).toString("hex");

  console.log("Pool token mint:", poolMint.toBase58());
  console.log("Pool merkle root:", poolMerkleRoot);
  console.log("Proof merkle root:", publicInputs[0]?.toString(16).padStart(64, "0"));

  // Check if merkle roots match
  const proofMerkleRoot = publicInputs[0]?.toString(16).padStart(64, "0") || "";
  if (poolMerkleRoot !== proofMerkleRoot) {
    console.log("\nWARNING: Merkle roots don't match!");
    console.log("This proof was generated for a different pool state.");
    console.log("On-chain verification would fail with InvalidMerkleRoot.\n");
    console.log("=== Local Verification: PASSED ===");
    console.log("=== On-chain Verification: Skipped (merkle root mismatch) ===");
    return;
  }

  // If merkle roots match, proceed with on-chain verification
  console.log("\nMerkle roots match! Proceeding with on-chain verification...\n");

  // Get vault PDA
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, poolMint.toBuffer()],
    PROGRAM_ID
  );

  // Get wallet token account
  const walletAta = anchor.utils.token.associatedAddress({
    mint: poolMint,
    owner: wallet.publicKey,
  });

  try {
    const tx = await program.methods
      .transact(
        proof256,
        merkleRootBytes,
        nullifierBytes,
        [outCommitment1Bytes, outCommitment2Bytes],
        new anchor.BN(unshieldAmount),
        circuitId
      )
      .accounts({
        pool: poolPda,
        verificationKey: vkPda,
        tokenVault: vaultPda,
        recipientTokenAccount: walletAta,
        payer: wallet.publicKey,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ])
      .rpc();

    console.log("Transaction successful:", tx);
    console.log("\n=== ON-CHAIN VERIFICATION: PASSED ===");
  } catch (err: any) {
    console.log("Transaction failed:", err.message);

    // Parse error logs
    if (err.logs) {
      console.log("\nProgram logs:");
      for (const log of err.logs) {
        console.log("  ", log);
      }
    }

    console.log("\n=== ON-CHAIN VERIFICATION: FAILED ===");
  }
}

main().catch(console.error);
