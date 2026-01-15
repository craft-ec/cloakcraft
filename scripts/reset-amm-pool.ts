/**
 * Reset corrupted AMM pool state
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("Wallet:", wallet.publicKey.toBase58());

  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = new Program(idl, provider);

  // Derive AMM pool PDA for SOL/USDC
  const solMint = new PublicKey("So11111111111111111111111111111111111111112");
  const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

  const [ammPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("amm_pool"), solMint.toBuffer(), usdcMint.toBuffer()],
    PROGRAM_ID
  );

  console.log("AMM Pool PDA:", ammPoolPda.toBase58());

  // Fetch current state
  const ammPool = await program.account.ammPool.fetch(ammPoolPda);
  console.log("\nCurrent State:");
  console.log("Reserve A:", ammPool.reserveA.toString());
  console.log("Reserve B:", ammPool.reserveB.toString());
  console.log("LP Supply:", ammPool.lpSupply.toString());

  // Reset pool
  console.log("\nResetting pool...");
  const tx = await program.methods
    .resetAmmPool()
    .accounts({
      ammPool: ammPoolPda,
      authority: wallet.publicKey,
    })
    .rpc();

  console.log("Reset TX:", tx);

  // Verify new state
  const updatedPool = await program.account.ammPool.fetch(ammPoolPda);
  console.log("\nNew State:");
  console.log("Reserve A:", updatedPool.reserveA.toString());
  console.log("Reserve B:", updatedPool.reserveB.toString());
  console.log("LP Supply:", updatedPool.lpSupply.toString());
  console.log("\n✅ Pool reset successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
