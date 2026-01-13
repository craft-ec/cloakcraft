/**
 * Setup Test Token
 *
 * Creates a new SPL token, initializes a CloakCraft pool, and transfers tokens to a user.
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
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
import "dotenv/config";

// Program ID
const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");

// Target user to receive tokens
const TARGET_USER = new PublicKey("EKRWJY7pLfNp5RJiqLinyAQf4ZFuU5aW1WoThMtYgMbc");

// Seeds
const SEEDS = {
  POOL: Buffer.from("pool"),
  VAULT: Buffer.from("vault"),
  COMMITMENT_COUNTER: Buffer.from("commitment_counter"),
};

async function main() {
  console.log("=== Setup Test Token ===\n");

  const apiKey = process.env.HELIUS_API_KEY;
  const rpcUrl = apiKey
    ? `https://devnet.helius-rpc.com/?api-key=${apiKey}`
    : "https://api.devnet.solana.com";

  const connection = new Connection(rpcUrl, "confirmed");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Target user:", TARGET_USER.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL\n");

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

  // === Step 1: Create new token ===
  console.log("Step 1: Creating new SPL token...");

  const tokenMint = await createMint(
    connection,
    wallet,
    wallet.publicKey, // mint authority
    wallet.publicKey, // freeze authority
    6 // 6 decimals
  );
  console.log("Token mint:", tokenMint.toBase58());

  // === Step 2: Initialize pool ===
  console.log("\nStep 2: Initializing CloakCraft pool...");

  const [poolPda] = PublicKey.findProgramAddressSync(
    [SEEDS.POOL, tokenMint.toBuffer()],
    PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, tokenMint.toBuffer()],
    PROGRAM_ID
  );
  const [counterPda] = PublicKey.findProgramAddressSync(
    [SEEDS.COMMITMENT_COUNTER, poolPda.toBuffer()],
    PROGRAM_ID
  );

  console.log("Pool PDA:", poolPda.toBase58());
  console.log("Vault PDA:", vaultPda.toBase58());
  console.log("Counter PDA:", counterPda.toBase58());

  // Initialize pool
  try {
    const tx1 = await program.methods
      .initializePool()
      .accountsStrict({
        pool: poolPda,
        tokenVault: vaultPda,
        tokenMint: tokenMint,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();
    console.log("Pool initialized:", tx1);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Pool already exists");
    } else {
      throw err;
    }
  }

  // Initialize commitment counter
  try {
    const tx2 = await program.methods
      .initializeCommitmentCounter()
      .accountsStrict({
        pool: poolPda,
        commitmentCounter: counterPda,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Counter initialized:", tx2);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Counter already exists");
    } else {
      throw err;
    }
  }

  // === Step 3: Mint and transfer tokens ===
  console.log("\nStep 3: Minting and transferring tokens...");

  // Create ATA for target user
  const targetAta = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    tokenMint,
    TARGET_USER
  );
  console.log("Target ATA:", targetAta.address.toBase58());

  // Also create ATA for wallet (for testing shield)
  const walletAta = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    tokenMint,
    wallet.publicKey
  );
  console.log("Wallet ATA:", walletAta.address.toBase58());

  // Mint tokens to target user
  const MINT_AMOUNT = 1_000_000 * 1e6; // 1 million tokens (6 decimals)
  await mintTo(
    connection,
    wallet,
    tokenMint,
    targetAta.address,
    wallet,
    MINT_AMOUNT
  );
  console.log("Minted", MINT_AMOUNT / 1e6, "tokens to target user");

  // Also mint some to wallet for testing
  await mintTo(
    connection,
    wallet,
    tokenMint,
    walletAta.address,
    wallet,
    MINT_AMOUNT
  );
  console.log("Minted", MINT_AMOUNT / 1e6, "tokens to wallet");

  console.log("\n=== Setup Complete ===");
  console.log("Token Mint:", tokenMint.toBase58());
  console.log("Pool PDA:", poolPda.toBase58());
  console.log("Target User:", TARGET_USER.toBase58());
  console.log("Target ATA:", targetAta.address.toBase58());
  console.log("\nYou can now shield tokens using this mint address in the demo app.");
}

main().catch(console.error);
