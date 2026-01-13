/**
 * Test on-chain proof verification
 *
 * Calls the test_verify_proof instruction to verify the G2 conversion fix works.
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
  VK: Buffer.from("vk"),
};

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

async function main() {
  console.log("=== Test On-Chain Proof Verification ===\n");

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

  // Get VK PDA
  const circuitId = padCircuitId("transfer_1x2");
  const [vkPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VK, circuitId],
    PROGRAM_ID
  );

  console.log("VK PDA:", vkPda.toBase58());

  // Check VK exists
  const vkAccount = await connection.getAccountInfo(vkPda);
  if (!vkAccount) {
    console.log("ERROR: VK not registered");
    return;
  }
  console.log("VK data length:", vkAccount.data.length, "bytes\n");

  // Load proof and public witness
  const targetDir = path.join(__dirname, "..", "circuits", "target");
  const proofPath = path.join(targetDir, "transfer_1x2.proof");
  const pwPath = path.join(targetDir, "transfer_1x2.pw");
  const vkPath = path.join(targetDir, "transfer_1x2.vk");

  if (!fs.existsSync(proofPath) || !fs.existsSync(pwPath)) {
    console.log("ERROR: Proof or witness files not found");
    return;
  }

  // Verify locally first
  console.log("Step 1: Verifying proof locally with sunspot...");
  const sunspotPath = path.join(__dirname, "sunspot");

  try {
    execFileSync(sunspotPath, ["verify", vkPath, proofPath, pwPath], {
      stdio: "pipe",
    });
    console.log("Local verification: PASSED\n");
  } catch (err: any) {
    console.log("Local verification FAILED:", err.message);
    return;
  }

  // Load files
  const proofData = fs.readFileSync(proofPath);
  const pwData = fs.readFileSync(pwPath);

  console.log("Proof size:", proofData.length, "bytes");
  console.log("PW size:", pwData.length, "bytes");

  // Parse public witness - header is 12 bytes, then 32 bytes per value
  const numPublic = pwData.readUInt32BE(0);
  console.log("Number of public inputs:", numPublic);

  // Extract public inputs (32 bytes each, starting at offset 12)
  const publicInputs: number[][] = [];
  let offset = 12;
  for (let i = 0; i < numPublic && offset + 32 <= pwData.length; i++) {
    const value = Array.from(pwData.slice(offset, offset + 32));
    publicInputs.push(value);
    offset += 32;
  }

  const inputNames = ["merkle_root", "nullifier", "out_commitment_1", "out_commitment_2", "token_mint", "unshield_amount"];
  console.log("\nPublic inputs:");
  for (let i = 0; i < Math.min(publicInputs.length, inputNames.length); i++) {
    console.log(`  ${inputNames[i]}: 0x${Buffer.from(publicInputs[i]).toString("hex").slice(0, 16)}...`);
  }

  // Extract 256-byte proof
  const proof = Array.from(proofData.slice(0, 256));
  console.log("\nProof bytes (first 16):", Buffer.from(proof.slice(0, 16)).toString("hex"));

  // Call test_verify_proof
  console.log("\nStep 2: Calling test_verify_proof on-chain...\n");

  try {
    const tx = await program.methods
      .testVerifyProof(
        Buffer.from(proof),
        publicInputs.map(pi => Buffer.from(pi))
      )
      .accounts({
        verificationKey: vkPda,
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
