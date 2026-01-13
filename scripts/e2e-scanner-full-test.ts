/**
 * E2E Scanner Full Test
 *
 * Tests the complete flow with proper encrypted notes:
 * 1. Generate viewing/spending keypair
 * 2. Shield tokens with properly encrypted note
 * 3. Scan for notes using viewing key
 * 4. Verify decryption works
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
import * as crypto from "crypto";
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

// SDK crypto imports
import { derivePublicKey, scalarMul, GENERATOR } from "../packages/sdk/src/crypto/babyjubjub";
import { computeCommitment, generateRandomness } from "../packages/sdk/src/crypto/commitment";
import { encryptNote, serializeEncryptedNote, tryDecryptNote } from "../packages/sdk/src/crypto/encryption";
import { bytesToField, fieldToBytes } from "../packages/sdk/src/crypto/poseidon";

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

// BabyJubJub subgroup order
const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

// Generate random scalar in subgroup
function generateRandomScalar(): bigint {
  const bytes = new Uint8Array(32);
  crypto.randomFillSync(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER;
}

async function main() {
  console.log("=== E2E Scanner Full Test ===\n");

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

  // === Step 1: Generate recipient keys ===
  console.log("Step 1: Generating recipient keys...");

  const spendingKey = generateRandomScalar();
  const viewingKey = spendingKey; // For simplicity, same key
  const recipientPubkey = derivePublicKey(viewingKey);

  console.log("  Viewing key:", viewingKey.toString().slice(0, 20) + "...");
  console.log("  Recipient pubkey X:", Buffer.from(recipientPubkey.x).toString("hex").slice(0, 16) + "...");

  // === Step 2: Set up test token and pool ===
  console.log("\nStep 2: Setting up test token and pool...");

  const tokenMint = await createMint(
    connection,
    wallet,
    wallet.publicKey,
    null,
    9
  );
  console.log("  Token mint:", tokenMint.toBase58());

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
  console.log("  Minted", Number(SHIELD_AMOUNT) / 1e9, "tokens");

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
    console.log("  Pool initialized");
  } catch (e: any) {
    if (!e.message?.includes("already in use")) throw e;
    console.log("  Pool already exists");
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
    console.log("  Commitment counter initialized");
  } catch (e: any) {
    if (!e.message?.includes("already in use")) throw e;
    console.log("  Commitment counter already exists");
  }

  // === Step 3: Create note and compute commitment ===
  console.log("\nStep 3: Creating note with proper encryption...");

  const randomness = generateRandomness();

  // Create the note
  const note = {
    stealthPubX: recipientPubkey.x,
    tokenMint: tokenMint,
    amount: SHIELD_AMOUNT,
    randomness: randomness,
  };

  // Compute commitment
  const commitment = computeCommitment(note);
  console.log("  Commitment:", Buffer.from(commitment).toString("hex").slice(0, 16) + "...");

  // Encrypt note for recipient
  const encryptedNote = encryptNote(note, recipientPubkey);
  const serializedNote = serializeEncryptedNote(encryptedNote);
  console.log("  Encrypted note size:", serializedNote.length, "bytes");
  console.log("  Ephemeral pubkey X:", Buffer.from(encryptedNote.ephemeralPubkey.x).toString("hex").slice(0, 16) + "...");

  // === Step 4: Get Light Protocol validity proof ===
  console.log("\nStep 4: Getting Light Protocol validity proof...");

  const addressTreeInfo = getBatchAddressTreeInfo();

  // Derive commitment address
  const commitmentSeeds = [
    Buffer.from("commitment"),
    poolPda.toBuffer(),
    Buffer.from(commitment),
  ];
  const commitmentAddressSeed = deriveAddressSeedV2(commitmentSeeds);
  const commitmentAddress = deriveAddressV2(commitmentAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
  console.log("  Commitment address:", commitmentAddress.toBase58());

  // Get validity proof (non-inclusion - commitment doesn't exist yet)
  const validityProof = await lightRpc.getValidityProofV0(
    [],
    [{
      address: bn(commitmentAddress.toBytes()),
      tree: addressTreeInfo.tree,
      queue: addressTreeInfo.queue,
    }]
  );
  console.log("  Validity proof received");

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

  // === Step 5: Shield with encrypted note ===
  console.log("\nStep 5: Shielding with encrypted note...");

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

  const vaultBefore = await getAccount(connection, vaultPda);
  console.log("  Vault balance before:", Number(vaultBefore.amount) / 1e9, "tokens");

  let shieldTx: string;
  try {
    shieldTx = await program.methods
      .shield(
        Array.from(commitment),
        new anchor.BN(SHIELD_AMOUNT.toString()),
        Buffer.from(serializedNote),
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

    console.log("  Shield TX:", shieldTx);

    const vaultAfter = await getAccount(connection, vaultPda);
    console.log("  Vault balance after:", Number(vaultAfter.amount) / 1e9, "tokens");
  } catch (err: any) {
    console.error("  Shield failed:", err.message);
    if (err.logs) {
      console.log("\n  Program logs:");
      err.logs.slice(-15).forEach((log: string) => console.log("    ", log));
    }
    return;
  }

  // === Step 6: Test local decryption ===
  console.log("\nStep 6: Testing local decryption...");

  const decrypted = tryDecryptNote(encryptedNote, viewingKey);
  if (decrypted) {
    console.log("  Decryption successful!");
    console.log("  Amount:", decrypted.amount.toString());
    console.log("  Token mint:", decrypted.tokenMint.toBase58());
  } else {
    console.log("  Decryption FAILED - check encryption implementation");
  }

  // === Step 7: Wait and scan ===
  console.log("\nStep 7: Waiting for indexer and scanning...");
  console.log("  Waiting 5 seconds for Helius to index...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Query commitment accounts
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getCompressedAccountsByOwner',
      params: {
        owner: PROGRAM_ID.toBase58(),
      },
    }),
  });

  const result = await response.json() as any;

  if (result.error) {
    console.log("  Query error:", result.error.message);
  } else {
    // Helius returns items in result.value.items, not result.items
    const accounts = result.result?.value?.items ?? result.result?.items ?? [];
    console.log("  Found", accounts.length, "compressed accounts");

    // Look for our commitment
    console.log("  Looking for commitment:", Buffer.from(commitment).toString("hex").slice(0, 16) + "...");
    let foundOurCommitment = false;
    let commitmentAccounts = 0;
    const COMMITMENT_DISCRIMINATOR = 15491678376909512437n;

    for (const account of accounts) {
      if (!account.data?.data) continue;

      try {
        // Decode base64 data
        const data = Buffer.from(account.data.data, 'base64');

        // Check discriminator - only process commitment accounts
        if (account.data.discriminator !== Number(COMMITMENT_DISCRIMINATOR)) continue;
        commitmentAccounts++;

        // Helius returns data WITHOUT discriminator prefix (discriminator is separate field)
        // Layout: pool(32) + commitment(32) + leaf_index(8) + encrypted_note_len(4) + encrypted_note
        if (data.length < 76) continue;

        const storedPool = data.slice(0, 32);
        const storedCommitment = data.slice(32, 64);
        const leafIndex = data.readBigUInt64LE(64);
        const encryptedNoteLen = data.readUInt32LE(72);
        const storedEncryptedNote = data.slice(76, 76 + encryptedNoteLen);

        // Check if this is our commitment
        if (Buffer.from(storedCommitment).equals(Buffer.from(commitment))) {
          foundOurCommitment = true;
          console.log("\n  Found our commitment!");
          console.log("    Leaf index:", leafIndex.toString());
          console.log("    Encrypted note size:", encryptedNoteLen, "bytes");
          console.log("    Pool matches:", Buffer.from(storedPool).equals(poolPda.toBuffer()));

          // Try to decrypt the stored note
          if (encryptedNoteLen >= 84) {
            // Parse encrypted note: ephemeral_x(32) + ephemeral_y(32) + ciphertext_len(4) + ciphertext + tag(16)
            const ephemeralX = storedEncryptedNote.slice(0, 32);
            const ephemeralY = storedEncryptedNote.slice(32, 64);
            const ciphertextLen = storedEncryptedNote.readUInt32LE(64);
            const ciphertext = storedEncryptedNote.slice(68, 68 + ciphertextLen);
            const tag = storedEncryptedNote.slice(68 + ciphertextLen, 68 + ciphertextLen + 16);

            const storedEncNote = {
              ephemeralPubkey: {
                x: new Uint8Array(ephemeralX),
                y: new Uint8Array(ephemeralY),
              },
              ciphertext: new Uint8Array(ciphertext),
              tag: new Uint8Array(tag),
            };

            console.log("    Attempting decryption from stored data...");
            const decryptedFromChain = tryDecryptNote(storedEncNote, viewingKey);
            if (decryptedFromChain) {
              console.log("    Decryption from chain SUCCESSFUL!");
              console.log("      Amount:", decryptedFromChain.amount.toString());
              console.log("      Token:", decryptedFromChain.tokenMint.toBase58());
            } else {
              console.log("    Decryption from chain FAILED");
            }
          }
          break;
        }
      } catch (e: any) {
        // Skip malformed accounts
        continue;
      }
    }

    console.log("  Commitment accounts found:", commitmentAccounts);

    if (!foundOurCommitment) {
      console.log("  Did not find our commitment in indexed accounts yet");
      console.log("  This may be due to indexer delay - try running scan again in a few seconds");
    }
  }

  console.log("\n=== Scanner Full Test Complete ===");
  console.log("\nSummary:");
  console.log("  - Generated viewing key");
  console.log("  - Shielded with properly encrypted note");
  console.log("  - Local decryption: " + (decrypted ? "SUCCESS" : "FAILED"));
  console.log("  - Shield TX:", shieldTx!);
}

main().catch(console.error);
