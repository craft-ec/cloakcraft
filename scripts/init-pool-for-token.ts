import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");
const TOKEN_MINT = new PublicKey("AiYgse3ZRED1SkdvPwFi5URhBMpjKXzciPwS4YFKuSDx");

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, "utf-8"))));

  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), TOKEN_MINT.toBuffer()],
    PROGRAM_ID
  );

  console.log("Token:", TOKEN_MINT.toBase58());
  console.log("Pool PDA:", poolPda.toBase58());

  // Check if pool exists
  const poolInfo = await connection.getAccountInfo(poolPda);
  if (poolInfo) {
    console.log("Pool already exists!");
    return;
  }

  console.log("Pool does not exist, creating...");

  // Setup program
  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: "confirmed" });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);

  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), TOKEN_MINT.toBuffer()],
    PROGRAM_ID
  );
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), TOKEN_MINT.toBuffer()],
    PROGRAM_ID
  );

  // Initialize pool
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

  // Initialize counter
  const tx2 = await program.methods
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
  console.log("Counter initialized:", tx2);

  console.log("\nPool ready for token:", TOKEN_MINT.toBase58());
}

main().catch(console.error);
