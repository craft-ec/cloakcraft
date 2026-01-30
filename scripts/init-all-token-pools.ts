/**
 * Initialize Token Pools for WSOL, USDC, and TEST
 * 
 * Each token needs:
 * 1. Pool account (stores token config)
 * 2. Vault account (holds shielded tokens)
 * 3. Commitment counter (tracks merkle tree)
 * 
 * Usage: npx tsx scripts/init-all-token-pools.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, NATIVE_MINT } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Program ID
const PROGRAM_ID = new PublicKey("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");

// Tokens to initialize
const TOKENS = [
  {
    symbol: "WSOL",
    mint: new PublicKey("So11111111111111111111111111111111111111112"),
    decimals: 9,
  },
  {
    symbol: "USDC", 
    mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
    decimals: 6,
  },
  {
    symbol: "TEST",
    mint: new PublicKey("2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm"),
    decimals: 6,
  },
];

async function main() {
  // Setup connection
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "59353f30-dd17-43ae-9913-3599b9d99b11";
  const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const connection = new Connection(RPC_URL, "confirmed");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("=== Initialize Token Pools ===\n");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program:", PROGRAM_ID.toBase58());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  if (balance < 0.1 * 1e9) {
    console.error("[ERROR] Insufficient balance. Need at least 0.1 SOL");
    process.exit(1);
  }

  // Load IDL and setup program
  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);

  // Process each token
  for (const token of TOKENS) {
    console.log(`\n--- ${token.symbol} (${token.mint.toBase58()}) ---`);

    // Derive PDAs
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), token.mint.toBuffer()],
      PROGRAM_ID
    );
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), token.mint.toBuffer()],
      PROGRAM_ID
    );
    const [counterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("counter"), token.mint.toBuffer()],
      PROGRAM_ID
    );

    console.log("  Pool PDA:", poolPda.toBase58());
    console.log("  Vault PDA:", vaultPda.toBase58());
    console.log("  Counter PDA:", counterPda.toBase58());

    // Check if pool exists
    const poolInfo = await connection.getAccountInfo(poolPda);
    if (poolInfo) {
      console.log("  [SKIP] Pool already exists");
      
      // Check if counter exists
      const counterInfo = await connection.getAccountInfo(counterPda);
      if (!counterInfo) {
        console.log("  [INIT] Initializing commitment counter...");
        try {
          const tx = await program.methods
            .initializeCommitmentCounter()
            .accounts({
              counter: counterPda,
              pool: poolPda,
              tokenMint: token.mint,
              authority: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: anchor.web3.SystemProgram.programId,
            })
            .rpc();
          console.log("  [OK] Counter initialized:", tx);
        } catch (err: any) {
          console.log("  [ERROR] Counter init failed:", err.message);
        }
      } else {
        console.log("  [SKIP] Counter already exists");
      }
      continue;
    }

    // Initialize pool
    console.log("  [INIT] Initializing pool...");
    try {
      const tx = await program.methods
        .initializePool()
        .accounts({
          pool: poolPda,
          tokenMint: token.mint,
          vault: vaultPda,
          authority: wallet.publicKey,
          payer: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: anchor.web3.SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      console.log("  [OK] Pool initialized:", tx);
      console.log(`  https://explorer.solana.com/tx/${tx}?cluster=devnet`);
    } catch (err: any) {
      console.log("  [ERROR] Pool init failed:", err.message);
      continue;
    }

    // Wait a bit for the pool to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Initialize commitment counter
    console.log("  [INIT] Initializing commitment counter...");
    try {
      const tx2 = await program.methods
        .initializeCommitmentCounter()
        .accounts({
          counter: counterPda,
          pool: poolPda,
          tokenMint: token.mint,
          authority: wallet.publicKey,
          payer: wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("  [OK] Counter initialized:", tx2);
      console.log(`  https://explorer.solana.com/tx/${tx2}?cluster=devnet`);
    } catch (err: any) {
      console.log("  [ERROR] Counter init failed:", err.message);
    }
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
