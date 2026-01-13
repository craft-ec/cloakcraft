import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");
const TOKEN_MINT = new PublicKey("2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8"))));

  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), TOKEN_MINT.toBuffer()],
    PROGRAM_ID
  );
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("commitment_counter"), poolPda.toBuffer()],
    PROGRAM_ID
  );

  console.log("Token:", TOKEN_MINT.toBase58());
  console.log("Pool PDA:", poolPda.toBase58());
  console.log("Counter PDA:", counterPda.toBase58());

  // Check if pool exists
  const poolInfo = await connection.getAccountInfo(poolPda);
  if (!poolInfo) {
    console.log("Pool does not exist! Creating...");

    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), TOKEN_MINT.toBuffer()],
      PROGRAM_ID
    );

    const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
    const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
    anchor.setProvider(provider);
    const program = new anchor.Program(idl, provider);

    const tx = await program.methods
      .initializePool()
      .accounts({
        pool: poolPda,
        tokenMint: TOKEN_MINT,
        vault: vaultPda,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log("Pool initialized:", tx);
  } else {
    console.log("Pool exists!");
  }

  // Check if counter exists
  const counterInfo = await connection.getAccountInfo(counterPda);
  if (counterInfo) {
    console.log("Counter already exists!");
    return;
  }

  console.log("Counter does not exist, creating...");

  // Setup program
  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);

  // Initialize counter
  const tx = await program.methods
    .initializeCommitmentCounter()
    .accounts({
      counter: counterPda,
      pool: poolPda,
      tokenMint: TOKEN_MINT,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  console.log("Counter initialized:", tx);
}

main().catch(console.error);
