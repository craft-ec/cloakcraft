/**
 * Update swap_add_liquidity verification key on devnet
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");
const VK_SEED = Buffer.from("vk");
const CIRCUIT_ID = "swap_add_liquidity";

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
  const vkPath = path.join(__dirname, "..", "keys", "swap_add_liquidity.vk");
  const vkData = fs.readFileSync(vkPath);
  console.log("New VK size:", vkData.length, "bytes");

  // Check existing account
  const accountInfo = await connection.getAccountInfo(vkPda);
  if (!accountInfo) {
    throw new Error("VK account doesn't exist! Register it first.");
  }

  const vecLen = accountInfo.data.readUInt32LE(40);
  console.log("Current VK data length:", vecLen, "bytes");

  // Update VK data (replaces entire VK in one transaction)
  console.log(`Updating VK with ${vkData.length} bytes...`);

  const tx = await program.methods
    .setVerificationKeyData(
      Array.from(circuitId) as any,
      Array.from(vkData)
    )
    .accounts({
      verificationKey: vkPda,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log(`TX: ${tx}`);

  console.log("✅ VK updated successfully!");

  // Verify
  const updatedInfo = await connection.getAccountInfo(vkPda);
  if (updatedInfo) {
    const updatedLen = updatedInfo.data.readUInt32LE(40);
    console.log("Final VK data length:", updatedLen, "bytes");
    if (updatedLen === vkData.length) {
      console.log("✅ Verification successful!");
    } else {
      console.log("❌ Length mismatch!");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
