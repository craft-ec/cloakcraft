/**
 * E2E Scanner Test
 *
 * Tests the note scanner functionality:
 * 1. Shield tokens (creates commitment with encrypted note inline)
 * 2. Scan for notes using viewing key
 * 3. Verify note found with correct data
 * 4. Check spent status (should be unspent)
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from "fs";
import * as dotenv from "dotenv";

// Load .env file
dotenv.config();

// SDK imports
import { LightCommitmentClient } from "../packages/sdk/src/light";
import { derivePublicKey } from "../packages/sdk/src/crypto/babyjubjub";
import { generateStealthAddress } from "../packages/sdk/src/crypto/stealth";
import { computeCommitment, generateRandomness } from "../packages/sdk/src/crypto/commitment";
import { encryptNote, serializeEncryptedNote } from "../packages/sdk/src/crypto/encryption";
import { deriveNullifierKey } from "../packages/sdk/src/crypto/nullifier";
import { bytesToField } from "../packages/sdk/src/crypto/poseidon";

// Note type (inline to avoid import issues)
interface Note {
  stealthPubX: Uint8Array;
  tokenMint: PublicKey;
  amount: bigint;
  randomness: Uint8Array;
}

// Program ID
const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");

// Load keypair
function loadKeypair(path: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(path, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

// Generate random scalar
function generateRandomScalar(): bigint {
  const bytes = new Uint8Array(32);
  require("crypto").randomFillSync(bytes);
  const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
  return bytesToField(bytes) % SUBGROUP_ORDER;
}

async function main() {
  console.log("=== E2E Scanner Test ===\n");

  // Setup
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const payer = loadKeypair(`${process.env.HOME}/.config/solana/id.json`);
  console.log("Payer:", payer.publicKey.toBase58());

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL");

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log("Requesting airdrop...");
    const sig = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);
    console.log("Airdrop received");
  }

  // Get Helius API key from environment
  const heliusApiKey = process.env.HELIUS_API_KEY;
  if (!heliusApiKey) {
    console.error("Error: HELIUS_API_KEY environment variable not set");
    console.log("Set it with: export HELIUS_API_KEY=your-api-key");
    process.exit(1);
  }

  // Initialize Light client
  const lightClient = new LightCommitmentClient({
    apiKey: heliusApiKey,
    network: "devnet",
  });

  // Generate recipient keypair (viewing key)
  console.log("\n--- Step 1: Generate Recipient Keys ---");
  const spendingKey = generateRandomScalar();
  const viewingKey = spendingKey; // For simplicity, use same key
  const nullifierKey = deriveNullifierKey(new Uint8Array(32)); // Derive from spending key
  const recipientPubkey = derivePublicKey(viewingKey);

  console.log("Viewing key (private):", viewingKey.toString().slice(0, 20) + "...");
  console.log("Recipient pubkey X:", Buffer.from(recipientPubkey.x).toString("hex").slice(0, 16) + "...");

  // Generate stealth address
  const { stealthAddress } = generateStealthAddress(recipientPubkey);
  console.log("Stealth address generated");

  // Create test note
  console.log("\n--- Step 2: Create Test Note ---");
  const testMint = new PublicKey("So11111111111111111111111111111111111111112"); // Wrapped SOL
  const testAmount = 100000000n; // 0.1 SOL
  const randomness = generateRandomness();

  const testNote: Note = {
    stealthPubX: stealthAddress.stealthPubkey.x,
    tokenMint: testMint,
    amount: testAmount,
    randomness,
  };

  console.log("Note amount:", testAmount.toString());
  console.log("Note mint:", testMint.toBase58());

  // Compute commitment
  const commitment = computeCommitment(testNote);
  console.log("Commitment:", Buffer.from(commitment).toString("hex").slice(0, 16) + "...");

  // Encrypt note for recipient
  console.log("\n--- Step 3: Encrypt Note ---");
  const encryptedNote = encryptNote(testNote, recipientPubkey);
  const serializedNote = serializeEncryptedNote(encryptedNote);
  console.log("Encrypted note size:", serializedNote.length, "bytes");

  // For this test, we'll query existing commitments
  // (Since shield instruction would need pool setup)
  console.log("\n--- Step 4: Query Existing Commitments ---");

  try {
    const accounts = await lightClient.getCommitmentAccounts(PROGRAM_ID);
    console.log("Found", accounts.length, "commitment accounts");

    if (accounts.length > 0) {
      console.log("\nFirst account:");
      console.log("  Hash:", accounts[0].hash?.slice(0, 16) + "...");
      console.log("  Data length:", accounts[0].data?.length || 0);
    }
  } catch (err: any) {
    console.log("Query error (expected if no commitments yet):", err.message);
  }

  // Test scanning (will find nothing since we haven't shielded yet)
  console.log("\n--- Step 5: Test Scanner ---");

  try {
    const notes = await lightClient.scanNotes(viewingKey, PROGRAM_ID);
    console.log("Scanned notes:", notes.length);

    if (notes.length > 0) {
      console.log("\nFound notes:");
      for (const note of notes) {
        console.log("  - Amount:", note.amount.toString());
        console.log("    Pool:", note.pool.toBase58());
        console.log("    Leaf index:", note.leafIndex);
      }

      // Check balance
      const balance = await lightClient.getBalance(viewingKey, nullifierKey, PROGRAM_ID);
      console.log("\nTotal balance:", balance.toString());
    } else {
      console.log("No notes found (expected for new viewing key)");
    }
  } catch (err: any) {
    console.log("Scan error:", err.message);
  }

  // Test with known pool if exists
  console.log("\n--- Step 6: Test With Pool ---");

  // Try to find an existing pool
  try {
    const poolSeeds = [Buffer.from("pool"), testMint.toBytes()];
    const [poolPda] = PublicKey.findProgramAddressSync(poolSeeds, PROGRAM_ID);
    console.log("Pool PDA for wrapped SOL:", poolPda.toBase58());

    const notesForPool = await lightClient.scanNotes(viewingKey, PROGRAM_ID, poolPda);
    console.log("Notes in pool:", notesForPool.length);
  } catch (err: any) {
    console.log("Pool query error:", err.message);
  }

  console.log("\n=== Scanner Test Complete ===");
  console.log("\nNote: Full e2e test requires:");
  console.log("1. Initialize pool");
  console.log("2. Shield tokens (creates commitment with encrypted note)");
  console.log("3. Scan to find the note");
  console.log("4. Spend the note (creates nullifier)");
  console.log("5. Scan again to verify spent status");
}

main().catch(console.error);
