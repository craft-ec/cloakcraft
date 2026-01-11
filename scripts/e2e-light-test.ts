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
  defaultTestStateTreeAccounts,
  defaultStaticAccountsStruct,
  deriveAddressSeed,
  deriveAddress,
  LightSystemProgram,
} from "@lightprotocol/stateless.js";
import "dotenv/config";

// Program ID
const PROGRAM_ID = new PublicKey("HsQk1VmzbDwXZnQfevgJvHAfYioFmKJKCBgfuTFKVJAu");

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

// Light Protocol program IDs
const LIGHT_SYSTEM_PROGRAM = new PublicKey("SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7");
const ACCOUNT_COMPRESSION_PROGRAM = new PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
const NOOP_PROGRAM = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");

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

  // Get Light Protocol tree accounts
  const treeAccounts = defaultTestStateTreeAccounts();
  const staticAccounts = defaultStaticAccountsStruct();
  console.log("Using Light Protocol accounts:");
  console.log("  Address Tree:", treeAccounts.addressTree.toBase58());
  console.log("  Address Queue:", treeAccounts.addressQueue.toBase58());
  console.log("  State Tree:", treeAccounts.merkleTree.toBase58());
  console.log("  Nullifier Queue:", treeAccounts.nullifierQueue.toBase58());
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

  // Derive commitment address using Light SDK (matches on-chain logic)
  // Seeds: ["commitment", pool_pubkey, commitment_hash]
  const seeds = [
    Buffer.from("commitment"),
    poolPda.toBuffer(),
    commitment,
  ];
  const addressSeed = deriveAddressSeed(seeds, PROGRAM_ID);
  const commitmentAddress = deriveAddress(addressSeed, treeAccounts.addressTree, PROGRAM_ID);
  console.log("Commitment address:", commitmentAddress.toBase58());

  try {
    // Get validity proof using Light SDK
    const proof = await lightRpc.getValidityProofV0(
      [], // no existing accounts to prove
      [{
        address: bn(commitmentAddress.toBytes()),
        tree: treeAccounts.addressTree,
        queue: treeAccounts.addressQueue,
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

    // Prepare Light params matching our on-chain types
    // Indices must match the position in remaining_accounts array
    // Based on CompressionCpiAccountIndex enum (light-sdk-types):
    // [0] LightSystemProgram
    // [1] Authority (CPI signer PDA)
    // [2] RegisteredProgramPda
    // [3] NoopProgram
    // [4] AccountCompressionAuthority
    // [5] AccountCompressionProgram
    // [6] InvokingProgram (our program ID)
    // [7] SolPoolPda (placeholder: Light System Program)
    // [8] DecompressionRecipient (placeholder: Light System Program)
    // [9] SystemProgram
    // [10] CpiContext (placeholder: Light System Program)
    // [11] State Merkle Tree (output tree)
    // [12] Nullifier Queue
    // [13] Address Tree
    // [14] Address Queue
    // Note: The SDK adds an offset of 8 to tree indices
    // So for addressTree at remaining_accounts[13], pass: 13 - 8 = 5
    const SDK_TREE_OFFSET = 8;
    const lightParams = {
      validityProof: {
        a: Array.from(proof.compressedProof.a),
        b: Array.from(proof.compressedProof.b),
        c: Array.from(proof.compressedProof.c),
      },
      addressTreeInfo: {
        addressMerkleTreePubkeyIndex: 13 - SDK_TREE_OFFSET, // addressTree at idx 13, pass 5
        addressQueuePubkeyIndex: 14 - SDK_TREE_OFFSET,      // addressQueue at idx 14, pass 6
        rootIndex: proof.rootIndices[0] ?? 0,
      },
      outputTreeIndex: 11 - SDK_TREE_OFFSET, // merkleTree at idx 11, pass 3
    };

    // Build remaining accounts for Light Protocol CPI
    // Order matches CompressionCpiAccountIndex enum
    const remainingAccounts = [
      // [0] LightSystemProgram
      { pubkey: LIGHT_SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      // [1] Authority (CPI signer PDA derived with seeds ["cpi_authority"])
      { pubkey: CPI_SIGNER_PDA, isSigner: false, isWritable: false },
      // [2] RegisteredProgramPda
      { pubkey: staticAccounts.registeredProgramPda, isSigner: false, isWritable: false },
      // [3] NoopProgram
      { pubkey: NOOP_PROGRAM, isSigner: false, isWritable: false },
      // [4] AccountCompressionAuthority
      { pubkey: staticAccounts.accountCompressionAuthority, isSigner: false, isWritable: false },
      // [5] AccountCompressionProgram
      { pubkey: ACCOUNT_COMPRESSION_PROGRAM, isSigner: false, isWritable: false },
      // [6] InvokingProgram (our program ID)
      { pubkey: PROGRAM_ID, isSigner: false, isWritable: false },
      // [7] SolPoolPda (not used, placeholder)
      { pubkey: LIGHT_SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      // [8] DecompressionRecipient (not used, placeholder)
      { pubkey: LIGHT_SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      // [9] SystemProgram
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      // [10] CpiContext (not used, placeholder)
      { pubkey: LIGHT_SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      // [11] State Merkle Tree (output tree)
      { pubkey: treeAccounts.merkleTree, isSigner: false, isWritable: true },
      // [12] Nullifier Queue
      { pubkey: treeAccounts.nullifierQueue, isSigner: false, isWritable: true },
      // [13] Address Tree
      { pubkey: treeAccounts.addressTree, isSigner: false, isWritable: true },
      // [14] Address Queue
      { pubkey: treeAccounts.addressQueue, isSigner: false, isWritable: true },
    ];

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
