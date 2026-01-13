/**
 * Update transfer_1x2 verification key on devnet
 *
 * Uses setVerificationKeyData to replace existing VK data.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");
const VK_SEED = Buffer.from("vk");
const CIRCUIT_ID = "transfer_1x2";

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Updating VK for:", CIRCUIT_ID);

  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = new Program(idl, provider);

  const circuitId = padCircuitId(CIRCUIT_ID);
  const [vkPda] = PublicKey.findProgramAddressSync(
    [VK_SEED, circuitId],
    PROGRAM_ID
  );

  console.log("VK PDA:", vkPda.toBase58());

  // Load new VK data
  const vkPath = path.join(__dirname, "..", "circuits", "target", "transfer_1x2.vk");
  const vkData = fs.readFileSync(vkPath);
  console.log("New VK size:", vkData.length, "bytes");

  // Check existing account
  const accountInfo = await connection.getAccountInfo(vkPda);
  if (!accountInfo) {
    console.log("Account doesn't exist, registering fresh...");

    // Create with empty data, then set
    await program.methods
      .registerVerificationKey(
        Array.from(circuitId) as any,
        Buffer.from([])
      )
      .accounts({
        verificationKey: vkPda,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Account created");
  } else {
    const vecLen = accountInfo.data.readUInt32LE(40);
    console.log("Current VK data length:", vecLen, "bytes");
  }

  // VK data might be too large for a single tx (~1036 bytes is borderline)
  // Try single tx first, fall back to chunked approach
  const SINGLE_TX_VK_LIMIT = 700;

  if (vkData.length <= SINGLE_TX_VK_LIMIT) {
    // Small enough for single tx
    console.log("Updating VK in single transaction...");
    const tx = await program.methods
      .setVerificationKeyData(
        Array.from(circuitId) as any,
        Buffer.from(vkData)
      )
      .accounts({
        verificationKey: vkPda,
        authority: wallet.publicKey,
      })
      .rpc();
    console.log("Tx:", tx);
  } else {
    // Too large - need to clear first then append in chunks
    console.log("VK too large for single tx, using chunked approach...");

    // First, set empty to clear
    await program.methods
      .setVerificationKeyData(
        Array.from(circuitId) as any,
        Buffer.from([])
      )
      .accounts({
        verificationKey: vkPda,
        authority: wallet.publicKey,
      })
      .rpc();
    console.log("VK data cleared");

    // Then append in chunks
    const CHUNK_SIZE = 500;
    const chunks: Buffer[] = [];
    for (let i = 0; i < vkData.length; i += CHUNK_SIZE) {
      chunks.push(vkData.slice(i, Math.min(i + CHUNK_SIZE, vkData.length)));
    }
    console.log(`Uploading ${chunks.length} chunks...`);

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
        })
        .rpc();
      console.log(`Chunk ${i + 1}/${chunks.length}: done`);
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Verify
  const finalAccount = await connection.getAccountInfo(vkPda);
  if (finalAccount) {
    const finalVecLen = finalAccount.data.readUInt32LE(40);
    console.log("\nFinal VK data length:", finalVecLen, "bytes");
    console.log("Expected:", vkData.length, "bytes");
    if (finalVecLen === vkData.length) {
      console.log("VK updated successfully!");
    } else {
      console.log("Warning: VK length mismatch");
    }
  }
}

main().catch(console.error);
