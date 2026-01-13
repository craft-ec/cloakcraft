/**
 * End-to-End Light Protocol Integration Test
 *
 * Tests the full flow with Light Protocol compressed accounts:
 * 1. Initialize pool and commitment counter
 * 2. Shield tokens with Light Protocol validity proof
 * 3. Verify compressed account creation
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
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
import {
  createRpc,
  bn,
  defaultStaticAccountsStruct,
  deriveAddressSeedV2,
  deriveAddressV2,
  LightSystemProgram,
  PackedAccounts,
  SystemAccountMetaConfig,
  getBatchAddressTreeInfo,
} from "@lightprotocol/stateless.js";
import "dotenv/config";

// Program ID
const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");

// CPI Signer PDA - derived with seeds ["cpi_authority"] from program ID
const [CPI_SIGNER_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("cpi_authority")],
  PROGRAM_ID
);

// Seeds
const SEEDS = {
  POOL: Buffer.from("pool"),
  VAULT: Buffer.from("vault"),
  COMMITMENT_COUNTER: Buffer.from("commitment_counter"),
};

// V2 Batch Trees and CPI Context (Devnet)
// See: https://www.zkcompression.com/resources/addresses-and-urls#v2
const V2_OUTPUT_QUEUE = new PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto");
const V2_CPI_CONTEXT = new PublicKey("cpi15BoVPKgEPw5o8wc2T816GE7b378nMXnhH3Xbq4y");

async function main() {
  console.log("=== Light Protocol E2E Test ===\n");

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    console.error("ERROR: HELIUS_API_KEY not set in .env");
    return;
  }

  const heliusUrl = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  console.log("Using Helius devnet RPC\n");

  // Create Light RPC client
  const lightRpc = createRpc(heliusUrl, heliusUrl);
  const connection = new Connection(heliusUrl, "confirmed");

  // Get Light Protocol tree accounts (V2)
  const addressTreeInfo = getBatchAddressTreeInfo();
  const staticAccounts = defaultStaticAccountsStruct();
  console.log("Using Light Protocol V2 accounts:");
  console.log("  Address Tree (V2):", addressTreeInfo.tree.toBase58());
  console.log("  Address Queue (V2):", addressTreeInfo.queue.toBase58());
  console.log("  Output Queue (V2):", V2_OUTPUT_QUEUE.toBase58());
  console.log("  CPI Context (V2):", V2_CPI_CONTEXT.toBase58());
  console.log("  Registered Program PDA:", staticAccounts.registeredProgramPda.toBase58());

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("\nWallet:", wallet.publicKey.toBase58());
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL\n");

  if (balance < 0.1 * LAMPORTS_PER_SOL) {
    console.log("Insufficient balance. Run: solana airdrop 1 --url devnet");
    return;
  }

  // Load IDL
  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  if (!fs.existsSync(idlPath)) {
    console.error("IDL not found. Run: anchor build");
    return;
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = new Program(idl, provider);

  // === Step 1: Create test token ===
  console.log("Step 1: Creating test token...");
  const mintKeypair = Keypair.generate();
  const mint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    null,
    9,
    mintKeypair
  );
  console.log("Token mint:", mint.toBase58());

  const walletAta = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    mint,
    wallet.publicKey
  );

  await mintTo(connection, wallet, mint, walletAta.address, wallet, 1000_000_000_000n);
  console.log("Minted 1000 tokens to wallet\n");

  // === Step 2: Initialize pool ===
  console.log("Step 2: Initializing pool...");
  const [poolPda] = PublicKey.findProgramAddressSync(
    [SEEDS.POOL, mint.toBuffer()],
    PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, mint.toBuffer()],
    PROGRAM_ID
  );

  try {
    const tx = await program.methods
      .initializePool()
      .accounts({
        pool: poolPda,
        tokenVault: vaultPda,
        tokenMint: mint,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ])
      .rpc();
    console.log("Pool initialized:", tx);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Pool already exists");
    } else {
      throw err;
    }
  }

  // === Step 3: Initialize commitment counter ===
  console.log("\nStep 3: Initializing commitment counter...");
  const [counterPda] = PublicKey.findProgramAddressSync(
    [SEEDS.COMMITMENT_COUNTER, poolPda.toBuffer()],
    PROGRAM_ID
  );

  try {
    const tx = await program.methods
      .initializeCommitmentCounter()
      .accounts({
        commitmentCounter: counterPda,
        pool: poolPda,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Commitment counter initialized:", tx);
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Commitment counter already exists");
    } else {
      throw err;
    }
  }

  // === Step 4: Get validity proof using Light SDK ===
  console.log("\nStep 4: Getting validity proof using Light SDK...");

  // Generate a test commitment
  const crypto = require("crypto");
  const commitment = crypto.randomBytes(32);
  console.log("Test commitment:", Buffer.from(commitment).toString("hex").slice(0, 16) + "...");

  // Derive commitment address using Light SDK V2 (matches on-chain logic)
  // Seeds: ["commitment", pool_pubkey, commitment_hash]
  const seeds = [
    Buffer.from("commitment"),
    poolPda.toBuffer(),
    commitment,
  ];
  const addressSeed = deriveAddressSeedV2(seeds, PROGRAM_ID);
  const commitmentAddress = deriveAddressV2(addressSeed, addressTreeInfo.tree, PROGRAM_ID);
  console.log("Commitment address:", commitmentAddress.toBase58());

  try {
    // Get validity proof using Light SDK
    const proof = await lightRpc.getValidityProofV0(
      [], // no existing accounts to prove
      [{
        address: bn(commitmentAddress.toBytes()),
        tree: addressTreeInfo.tree,
        queue: addressTreeInfo.queue,
      }]
    );

    console.log("Validity proof received!");
    console.log("  Proof A length:", proof.compressedProof.a.length);
    console.log("  Proof B length:", proof.compressedProof.b.length);
    console.log("  Proof C length:", proof.compressedProof.c.length);
    console.log("  Root indices:", proof.rootIndices);

    // === Step 5: Shield tokens with Light Protocol ===
    console.log("\nStep 5: Shielding tokens with Light Protocol...");

    const shieldAmount = new anchor.BN(100_000_000); // 0.1 tokens
    const encryptedNote = Buffer.alloc(64); // Placeholder encrypted note

    // Use SDK's PackedAccounts to build remaining accounts (v2)
    // This handles all the account ordering and index calculation automatically
    const systemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
    const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

    // Insert output tree (V2 batch state tree via output queue)
    const outputTreeIndex = packedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
    console.log("  Output tree index:", outputTreeIndex);

    // Insert address tree (for v2, tree and queue are the same account)
    const addressTreeIndex = packedAccounts.insertOrGet(addressTreeInfo.tree);
    // For v2 batch address tree, queue is the same as tree
    const addressQueueIndex = addressTreeIndex;
    console.log("  Address tree index:", addressTreeIndex);
    console.log("  Address queue index:", addressQueueIndex, "(same as tree for v2)");

    // Build lightParams using SDK-computed indices
    const lightParams = {
      validityProof: {
        a: Array.from(proof.compressedProof.a),
        b: Array.from(proof.compressedProof.b),
        c: Array.from(proof.compressedProof.c),
      },
      addressTreeInfo: {
        addressMerkleTreePubkeyIndex: addressTreeIndex,
        addressQueuePubkeyIndex: addressQueueIndex,
        rootIndex: proof.rootIndices[0] ?? 0,
      },
      outputTreeIndex: outputTreeIndex,
    };

    // Get remaining accounts from SDK
    const { remainingAccounts: rawAccounts } = packedAccounts.toAccountMetas();

    // Convert SDK account metas (which use numbers 0/1) to proper booleans for Anchor
    const remainingAccounts = rawAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isWritable: Boolean(acc.isWritable),
      isSigner: Boolean(acc.isSigner),
    }));
    console.log("  Remaining accounts count:", remainingAccounts.length);

    // Debug: show account order
    console.log("  Account order:");
    remainingAccounts.slice(0, 12).forEach((acc: any, i: number) => {
      console.log(`    [${i}] ${acc.pubkey.toBase58().slice(0, 12)}... (w:${acc.isWritable}, s:${acc.isSigner})`);
    });

    try {
      const tx = await program.methods
        .shield(
          Array.from(commitment),
          shieldAmount,
          encryptedNote,
          lightParams
        )
        .accounts({
          pool: poolPda,
          commitmentCounter: counterPda,
          tokenVault: vaultPda,
          userTokenAccount: walletAta.address,
          user: wallet.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(remainingAccounts)
        .preInstructions([
          ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
        ])
        .rpc();

      console.log("Shield successful:", tx);

      // Verify on-chain state
      console.log("\nStep 6: Verifying on-chain state...");
      const counterData = await program.account.poolCommitmentCounter.fetch(counterPda);
      console.log("Total commitments:", (counterData as any).totalCommitments?.toString());
      console.log("Next leaf index:", (counterData as any).nextLeafIndex?.toString());

      const vaultInfo = await connection.getTokenAccountBalance(vaultPda);
      console.log("Vault balance:", vaultInfo.value.uiAmount, "tokens");

      console.log("\n=== SUCCESS ===");
      console.log("Light Protocol integration working on devnet!");
    } catch (err: any) {
      console.log("Shield with Light failed:", err.message);
      if (err.logs) {
        console.log("\nProgram logs:");
        err.logs.slice(-15).forEach((log: string) => console.log("  ", log));
      }
      throw err;
    }
  } catch (err: any) {
    console.log("Error:", err.message);
    throw err;
  }
}

main().catch(console.error);
