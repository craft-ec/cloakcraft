/**
 * Initialize Protocol Configuration
 *
 * Creates the global ProtocolConfig account with initial fee rates and treasury.
 *
 * Usage:
 *   npx tsx scripts/init-protocol-config.ts [--treasury <pubkey>] [--fees-disabled]
 *
 * Default fees (in basis points, 100 = 1%):
 *   - transfer: 10 (0.1%)
 *   - unshield: 25 (0.25%)
 *   - swap: 30 (0.3%)
 *   - remove_liquidity: 25 (0.25%)
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Program ID (update to match your deployment)
const PROGRAM_ID = new PublicKey("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");

// Protocol config seed
const PROTOCOL_CONFIG_SEED = Buffer.from("protocol_config");

// Default fee rates (in basis points)
const DEFAULT_TRANSFER_FEE_BPS = 10;      // 0.1%
const DEFAULT_UNSHIELD_FEE_BPS = 25;      // 0.25%
const DEFAULT_SWAP_FEE_BPS = 30;          // 0.3%
const DEFAULT_REMOVE_LIQUIDITY_FEE_BPS = 25; // 0.25%

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  let treasuryArg: string | undefined;
  let feesEnabled = true;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--treasury" && args[i + 1]) {
      treasuryArg = args[i + 1];
      i++;
    } else if (args[i] === "--fees-disabled") {
      feesEnabled = false;
    }
  }

  // Setup connection
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "88ac54a3-8850-4686-a521-70d116779182";
  const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const connection = new Connection(RPC_URL, "confirmed");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("=== Initialize Protocol Config ===\n");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program:", PROGRAM_ID.toBase58());

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL\n");

  // Derive protocol config PDA
  const [protocolConfigPda, bump] = PublicKey.findProgramAddressSync(
    [PROTOCOL_CONFIG_SEED],
    PROGRAM_ID
  );
  console.log("Protocol Config PDA:", protocolConfigPda.toBase58());
  console.log("Bump:", bump);

  // Check if already exists
  const existingAccount = await connection.getAccountInfo(protocolConfigPda);
  if (existingAccount) {
    console.log("\n[!] Protocol config already exists!");
    console.log("    Use update-protocol-fees.ts to modify fee rates.");
    return;
  }

  // Determine treasury address
  const treasury = treasuryArg
    ? new PublicKey(treasuryArg)
    : wallet.publicKey; // Default to wallet if not specified

  console.log("\nConfiguration:");
  console.log("  Treasury:", treasury.toBase58());
  console.log("  Transfer Fee:", DEFAULT_TRANSFER_FEE_BPS, "bps (", DEFAULT_TRANSFER_FEE_BPS / 100, "%)");
  console.log("  Unshield Fee:", DEFAULT_UNSHIELD_FEE_BPS, "bps (", DEFAULT_UNSHIELD_FEE_BPS / 100, "%)");
  console.log("  Swap Fee:", DEFAULT_SWAP_FEE_BPS, "bps (", DEFAULT_SWAP_FEE_BPS / 100, "%)");
  console.log("  Remove Liquidity Fee:", DEFAULT_REMOVE_LIQUIDITY_FEE_BPS, "bps (", DEFAULT_REMOVE_LIQUIDITY_FEE_BPS / 100, "%)");
  console.log("  Fees Enabled:", feesEnabled);

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

  console.log("\nInitializing protocol config...");

  try {
    const tx = await program.methods
      .initializeProtocolConfig(
        DEFAULT_TRANSFER_FEE_BPS,
        DEFAULT_UNSHIELD_FEE_BPS,
        DEFAULT_SWAP_FEE_BPS,
        DEFAULT_REMOVE_LIQUIDITY_FEE_BPS,
        feesEnabled
      )
      .accounts({
        protocolConfig: protocolConfigPda,
        treasury: treasury,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("\n[OK] Protocol config initialized!");
    console.log("Transaction:", tx);
    console.log("\nView on explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (err) {
    console.error("\n[ERROR] Failed to initialize protocol config:");
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
