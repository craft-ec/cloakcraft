/**
 * End-to-End Shield Test
 *
 * Tests the shield instruction that deposits tokens into the privacy pool.
 *
 * Flow:
 * 1. Create/use existing pool
 * 2. Generate stealth address for recipient
 * 3. Compute commitment from stealth address + amount
 * 4. Get Light Protocol validity proof for commitment address
 * 5. Call shield instruction (transfers tokens + creates commitment)
 * 6. Verify commitment was created
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
  getAccount,
} from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  createRpc,
  bn,
  deriveAddressSeedV2,
  deriveAddressV2,
  PackedAccounts,
  SystemAccountMetaConfig,
  getBatchAddressTreeInfo,
} from "@lightprotocol/stateless.js";
import "dotenv/config";

// Program ID
const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");

// V2 Batch Trees (Devnet)
const V2_OUTPUT_QUEUE = new PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto");

// Seeds
const SEEDS = {
  POOL: Buffer.from("pool"),
  VAULT: Buffer.from("vault"),
  COMMITMENT_COUNTER: Buffer.from("commitment_counter"),
};

// Simple Poseidon-like hash for testing (in production, use actual Poseidon)
function simpleHash(...inputs: Uint8Array[]): Uint8Array {
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256");
  for (const input of inputs) {
    hash.update(input);
  }
  return new Uint8Array(hash.digest());
}

// Compute commitment from note data
function computeCommitment(
  stealthPubX: Uint8Array,
  tokenMint: PublicKey,
  amount: bigint,
  randomness: Uint8Array
): Uint8Array {
  const amountBytes = new Uint8Array(32);
  const view = new DataView(amountBytes.buffer);
  view.setBigUint64(24, amount, false); // Big-endian, last 8 bytes

  return simpleHash(
    stealthPubX,
    tokenMint.toBytes(),
    amountBytes,
    randomness
  );
}

async function main() {
  console.log("=== End-to-End Shield Test ===\n");

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    console.error("ERROR: HELIUS_API_KEY not set in environment");
    return;
  }

  const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  const connection = new Connection(rpcUrl, "confirmed");
  const lightRpc = createRpc(rpcUrl, rpcUrl);

  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("Wallet:", wallet.publicKey.toBase58());
  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / LAMPORTS_PER_SOL, "SOL\n");

  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);
  const program = new Program(idl, provider);

  // === Step 1: Set up test token and pool ===
  console.log("Step 1: Setting up test token and pool...");

  const tokenMint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    null,
    9
  );
  console.log("Token mint:", tokenMint.toBase58());

  const userAta = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    tokenMint,
    wallet.publicKey
  );

  const SHIELD_AMOUNT = 100_000_000_000n; // 100 tokens
  await mintTo(
    connection,
    wallet,
    tokenMint,
    userAta.address,
    wallet,
    Number(SHIELD_AMOUNT)
  );
  console.log("Minted", Number(SHIELD_AMOUNT) / 1e9, "tokens");

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

  try {
    await program.methods
      .initializePool()
      .accounts({
        pool: poolPda,
        tokenVault: vaultPda,
        tokenMint: tokenMint,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Pool initialized");
  } catch (e: any) {
    if (!e.message?.includes("already in use")) throw e;
    console.log("Pool already exists");
  }

  try {
    await program.methods
      .initializeCommitmentCounter()
      .accounts({
        pool: poolPda,
        commitmentCounter: counterPda,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log("Commitment counter initialized");
  } catch (e: any) {
    if (!e.message?.includes("already in use")) throw e;
    console.log("Commitment counter already exists");
  }

  // === Step 2: Generate stealth address and commitment ===
  console.log("\nStep 2: Generating commitment...");

  // For testing, use random bytes as stealth public key
  const stealthPubX = new Uint8Array(32);
  require("crypto").randomFillSync(stealthPubX);

  const randomness = new Uint8Array(32);
  require("crypto").randomFillSync(randomness);

  const commitment = computeCommitment(
    stealthPubX,
    tokenMint,
    SHIELD_AMOUNT,
    randomness
  );
  console.log("Commitment:", "0x" + Buffer.from(commitment).toString("hex").slice(0, 16) + "...");

  // === Step 3: Get Light Protocol validity proof ===
  console.log("\nStep 3: Getting Light Protocol validity proof...");

  const addressTreeInfo = getBatchAddressTreeInfo();

  // Derive commitment address
  const commitmentSeeds = [
    Buffer.from("commitment"),
    poolPda.toBuffer(),
    Buffer.from(commitment),
  ];
  const commitmentAddressSeed = deriveAddressSeedV2(commitmentSeeds);
  const commitmentAddress = deriveAddressV2(commitmentAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
  console.log("Commitment address:", commitmentAddress.toBase58());

  // Get validity proof (non-inclusion - commitment doesn't exist yet)
  const validityProof = await lightRpc.getValidityProofV0(
    [],
    [{
      address: bn(commitmentAddress.toBytes()),
      tree: addressTreeInfo.tree,
      queue: addressTreeInfo.queue,
    }]
  );
  console.log("Validity proof received");

  // Build remaining accounts
  const systemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

  const outputTreeIndex = packedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
  const addressTreeIndex = packedAccounts.insertOrGet(addressTreeInfo.tree);

  const { remainingAccounts: rawAccounts } = packedAccounts.toAccountMetas();
  const remainingAccounts = rawAccounts.map((acc: any) => ({
    pubkey: acc.pubkey,
    isWritable: Boolean(acc.isWritable),
    isSigner: Boolean(acc.isSigner),
  }));

  // === Step 4: Call shield instruction ===
  console.log("\nStep 4: Calling shield instruction...");

  // Helper to convert Light SDK proof
  function convertCompressedProof(proof: any) {
    const proofA = new Uint8Array(32);
    const proofB = new Uint8Array(64);
    const proofC = new Uint8Array(32);
    if (proof.compressedProof) {
      proofA.set(proof.compressedProof.a.slice(0, 32));
      proofB.set(proof.compressedProof.b.slice(0, 64));
      proofC.set(proof.compressedProof.c.slice(0, 32));
    }
    return { a: Array.from(proofA), b: Array.from(proofB), c: Array.from(proofC) };
  }

  const lightParams = {
    validityProof: convertCompressedProof(validityProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: validityProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex: outputTreeIndex,
  };

  // Encrypted note (placeholder - just the randomness for now)
  const encryptedNote = Buffer.from(randomness);

  // Check vault balance before
  const vaultBefore = await getAccount(connection, vaultPda);
  console.log("Vault balance before:", Number(vaultBefore.amount) / 1e9, "tokens");

  try {
    const tx = await program.methods
      .shield(
        Array.from(commitment),
        new anchor.BN(SHIELD_AMOUNT.toString()),
        encryptedNote,
        lightParams
      )
      .accountsStrict({
        pool: poolPda,
        commitmentCounter: counterPda,
        tokenVault: vaultPda,
        userTokenAccount: userAta.address,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
      ])
      .rpc();

    console.log("Shield successful:", tx);

    // Check vault balance after
    const vaultAfter = await getAccount(connection, vaultPda);
    console.log("Vault balance after:", Number(vaultAfter.amount) / 1e9, "tokens");

    // Verify commitment counter increased
    const counterData = await connection.getAccountInfo(counterPda);
    if (counterData) {
      const nextLeafIndex = counterData.data.readBigUInt64LE(8 + 32);
      console.log("Next leaf index:", nextLeafIndex.toString());
    }

    console.log("\n=== SUCCESS ===");
    console.log("Shield completed! Tokens deposited and commitment created.");

  } catch (err: any) {
    console.error("Shield failed:", err.message);
    if (err.logs) {
      console.log("\nProgram logs:");
      err.logs.slice(-20).forEach((log: string) => console.log("  ", log));
    }
  }
}

main().catch(console.error);
