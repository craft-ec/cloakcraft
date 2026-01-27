/**
 * E2E Test - Voting Protocol On-Chain Execution with ZK Proofs
 *
 * Tests actual on-chain execution of voting instructions:
 * - Ballot creation (all modes)
 * - Vote submission with real ZK proofs
 * - Note-based ownership proof (merkle proof of shielded note)
 * - Ballot resolution (after voting period)
 * - Ballot finalization (SpendToVote)
 *
 * COMPLETE FLOWS:
 * - vote_snapshot: FULL 5-PHASE FLOW (note-based ownership proof)
 * - change_vote_snapshot: Phase 0-1 (Light Protocol V2 inclusion proof needed)
 * - vote_spend/change_vote_spend/close_position: Phase 0 (needs shielded tokens for Phase 1+)
 *
 * To enable full SpendToVote flows:
 * 1. Run: npx tsx scripts/sdk-shield.ts
 * 2. Use the saved commitment data with this test
 *
 * Usage: npx tsx scripts/e2e-voting-onchain-test.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
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
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

// Import SDK client for shielding
import { CloakCraftClient } from "../packages/sdk/src/client";
import { generateStealthAddress } from "../packages/sdk/src/crypto/stealth";

// Import SDK voting module
import {
  deriveBallotPda,
  deriveBallotVaultPda,
  deriveVotingPendingOperationPda,
  buildCreateBallotInstruction,
  buildResolveBallotInstruction,
  buildFinalizeBallotInstruction,
  buildDecryptTallyInstruction,
  buildVoteSnapshotPhase0Instruction,
  buildVoteSnapshotExecuteInstruction,
  deriveVotingVerificationKeyPda,
  generateVotingOperationId,
  VOTING_CIRCUIT_IDS,
} from "../packages/sdk/src/voting";
import { generateVoteSnapshotInputs } from "../packages/sdk/src/voting/proofs";
import { RevealMode } from "../packages/sdk/src/voting/types";
import { buildChangeVoteSnapshotExecuteInstruction } from "../packages/sdk/src/voting/instructions";
import { initPoseidon, bytesToField, fieldToBytes, poseidonHashDomain } from "../packages/sdk/src/crypto/poseidon";
import { derivePublicKey } from "../packages/sdk/src/crypto/babyjubjub";
import { deriveNullifierKey } from "../packages/sdk/src/crypto/nullifier";
import { generateRandomness } from "../packages/sdk/src/crypto/commitment";
import { loadCircomArtifacts, generateSnarkjsProof } from "../packages/sdk/src/snarkjs-prover";
// @ts-ignore - no type declarations
import { buildPoseidon } from "circomlibjs";

// Program ID
const PROGRAM_ID = new PublicKey("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");

// Light Protocol V2 accounts (Devnet)
const V2_STATE_TREE = new PublicKey("bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU");
const V2_OUTPUT_QUEUE = new PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto");
const V2_ADDRESS_TREE = new PublicKey("amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx");
const V2_CPI_CONTEXT = new PublicKey("cpi15BoVPKgEPw5o8wc2T816GE7b378nMXnhH3Xbq4y");

// CPI Signer PDA
const [CPI_SIGNER_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("cpi_authority")],
  PROGRAM_ID
);

// Voting period (1 minute for testing)
const VOTING_PERIOD_SECONDS = 60;

// Logging helpers
function logSection(name: string) {
  console.log("\n" + "═".repeat(60));
  console.log(`  ${name}`);
  console.log("═".repeat(60));
}

function logPass(name: string, details?: string) {
  console.log(`  [✓] ${name}${details ? `: ${details}` : ""}`);
}

function logFail(name: string, error: string) {
  console.log(`  [✗] ${name}: ${error}`);
}

function logSkip(name: string, reason: string) {
  console.log(`  [○] ${name}: ${reason}`);
}

function logInfo(message: string) {
  console.log(`      ${message}`);
}

// Helper functions
function loadKeypair(walletPath: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(secretKey));
}

function generateBallotId(): Uint8Array {
  // Generate random bytes and ensure they're valid field elements (< BN254 Fr modulus)
  // by clearing the top bits to ensure value < 2^254 (always less than the ~2^254 modulus)
  const bytes = crypto.randomBytes(32);
  bytes[0] &= 0x1F; // Clear top 3 bits to ensure < 2^253 (well under the ~2^254 modulus)
  return bytes;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Domain constant for note commitment (must match circuit)
const COMMITMENT_DOMAIN = 1n;

/**
 * Build a simple merkle tree with Poseidon hash
 * Returns the root and merkle proof for a specific leaf
 * Uses a small practical tree depth and pads to required circuit depth
 */
async function buildMerkleTreeWithProof(
  poseidon: any,
  leaves: bigint[],
  leafIndex: number,
  requiredDepth: number
): Promise<{
  root: bigint;
  path: bigint[];
  pathIndices: number[];
}> {
  // Use a practical tree depth (max 10 levels = 1024 leaves)
  // to avoid memory issues (32 levels = 4 billion leaves)
  const practicalDepth = Math.min(10, Math.ceil(Math.log2(Math.max(leaves.length, 2))));
  const size = Math.pow(2, practicalDepth);
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length < size) {
    paddedLeaves.push(0n);
  }

  // Build tree level by level
  let currentLevel = paddedLeaves;
  const path: bigint[] = [];
  const pathIndices: number[] = [];
  let currentIndex = leafIndex;

  for (let level = 0; level < practicalDepth; level++) {
    const nextLevel: bigint[] = [];

    // Get sibling for merkle proof
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    path.push(currentLevel[siblingIndex] || 0n);
    pathIndices.push(currentIndex % 2); // 0 if left child, 1 if right child

    // Build next level
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] || 0n;
      const hash = poseidon.F.toObject(poseidon([poseidon.F.e(left), poseidon.F.e(right)]));
      nextLevel.push(hash);
    }

    currentLevel = nextLevel;
    currentIndex = Math.floor(currentIndex / 2);
  }

  // Continue building tree with zero siblings until we reach required depth
  // This simulates a sparse merkle tree where upper levels are mostly empty
  let currentRoot = currentLevel[0];
  for (let level = practicalDepth; level < requiredDepth; level++) {
    path.push(0n); // Zero sibling
    pathIndices.push(0); // Left child (doesn't matter for zero siblings)
    // Hash with zero sibling on right
    currentRoot = poseidon.F.toObject(poseidon([poseidon.F.e(currentRoot), poseidon.F.e(0n)]));
  }

  return {
    root: currentRoot,
    path,
    pathIndices,
  };
}

// ============================================================================
// Main Test
// ============================================================================

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║     CLOAKCRAFT VOTING - ON-CHAIN EXECUTION TESTS           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Initialize Poseidon
  console.log("\nInitializing cryptographic components...");
  await initPoseidon();

  // Setup connection
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "88ac54a3-8850-4686-a521-70d116779182";
  const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const connection = new Connection(RPC_URL, "confirmed");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const wallet = loadKeypair(walletPath);

  console.log("\n=== Configuration ===");
  console.log("  Wallet:", wallet.publicKey.toBase58());
  console.log("  Program:", PROGRAM_ID.toBase58());

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("  Balance:", (balance / 1e9).toFixed(4), "SOL");

  if (balance < 0.5 * 1e9) {
    console.log("\n⚠️  Warning: Low balance. Some tests may fail.");
  }

  // Setup Light Protocol RPC
  const lightRpc = createRpc(RPC_URL, RPC_URL);
  const addressTreeInfo = getBatchAddressTreeInfo();
  const staticAccounts = defaultStaticAccountsStruct();
  console.log("  Light Protocol V2 ready");

  // Load IDL and setup program
  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  if (!fs.existsSync(idlPath)) {
    console.error("Error: IDL not found at", idlPath);
    console.log("Run 'anchor build' first to generate the IDL.");
    process.exit(1);
  }
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);

  let passCount = 0;
  let failCount = 0;
  let skipCount = 0;

  // Store vote data from Test 4 for use in change vote test
  let test4VoteData: {
    voterSpendingKey: Uint8Array;
    voterPubkeyXBigInt: bigint;
    voteNullifierBigInt: bigint;
    voteCommitmentBigInt: bigint;
    oldVoteChoice: number;
    weight: bigint;
    randomnessBigInt: bigint;
    ballotIdBigInt: bigint;
    voteCommitmentBytes: Uint8Array;
  } | null = null;

  // Store vote_spend position data from Test 4c for change_vote_spend and close_position tests
  let test4cVoteSpendData: {
    ballotId: Uint8Array;
    ballotPda: PublicKey;
    vaultPda: PublicKey;
    stealthSpendingKey: bigint;
    stealthPubXBigInt: bigint;
    positionCommitmentBigInt: bigint;
    positionCommitmentBytes: Uint8Array;
    positionRandomnessBigInt: bigint;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    tokenMintBigInt: bigint;
    positionAccountHash: string | null;
    positionAddress: string;
    positionTreePubkey: PublicKey;
    positionQueuePubkey: PublicKey;
  } | null = null;

  // Store change_vote_spend new position data from Test 4d for close_position test
  let test4dChangeVoteSpendData: {
    ballotId: Uint8Array;
    ballotPda: PublicKey;
    vaultPda: PublicKey;
    stealthSpendingKey: bigint;
    stealthPubXBigInt: bigint;
    positionCommitmentBigInt: bigint;
    positionCommitmentBytes: Uint8Array;
    positionRandomnessBigInt: bigint;
    voteChoice: number;
    amount: bigint;
    weight: bigint;
    tokenMintBigInt: bigint;
    positionAccountHash: string | null;
    positionAddress: string;
  } | null = null;

  // =========================================================================
  // TEST 1: Create Token Mint
  // =========================================================================
  logSection("TEST 1: TOKEN MINT CREATION");

  let tokenMint: PublicKey;
  try {
    tokenMint = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      null,
      6
    );
    logPass("Created token mint", tokenMint.toBase58().slice(0, 16) + "...");
    passCount++;

    // Mint tokens
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      tokenMint,
      wallet.publicKey
    );
    await mintTo(
      connection,
      wallet,
      tokenMint,
      tokenAccount.address,
      wallet,
      1_000_000_000_000
    );
    logPass("Minted 1,000,000 tokens");
    passCount++;
  } catch (err: any) {
    logFail("Token mint creation", err.message?.slice(0, 60) || "Error");
    failCount++;
    process.exit(1);
  }

  // =========================================================================
  // TEST 2: Create Public/Snapshot Ballot with Short End Time
  // =========================================================================
  logSection("TEST 2: CREATE BALLOT (PUBLIC/SNAPSHOT)");

  const ballotId1 = generateBallotId();
  const [ballotPda1] = deriveBallotPda(ballotId1, PROGRAM_ID);

  try {
    const now = Math.floor(Date.now() / 1000);
    const currentSlot = await connection.getSlot();

    const ix = await buildCreateBallotInstruction(
      program,
      {
        ballotId: ballotId1,
        bindingMode: { snapshot: {} },
        revealMode: { public: {} },
        voteType: { single: {} },
        resolutionMode: { tallyBased: {} },
        numOptions: 4,
        quorumThreshold: 0n,
        protocolFeeBps: 0,
        protocolTreasury: wallet.publicKey,
        startTime: now - 5,  // Start 5 seconds ago
        endTime: now + VOTING_PERIOD_SECONDS,  // End in 1 minute
        snapshotSlot: currentSlot - 10,
        indexerPubkey: wallet.publicKey,
        eligibilityRoot: null,
        weightFormula: [0], // PushAmount
        weightParams: [],
        timeLockPubkey: new Uint8Array(32),
        unlockSlot: 0,
        resolver: null,
        oracle: null,
        claimDeadline: 0,
      },
      tokenMint,
      wallet.publicKey,
      wallet.publicKey,
      PROGRAM_ID
    );

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ix
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
    logPass("Created Public/Snapshot ballot", sig.slice(0, 16) + "...");
    logInfo(`Ballot PDA: ${ballotPda1.toBase58().slice(0, 20)}...`);
    passCount++;

    // Verify ballot state
    const ballotAccount = await (program.account as any).ballot.fetch(ballotPda1);
    logInfo(`Options: ${ballotAccount.numOptions}, Status: ${Object.keys(ballotAccount.status)[0]}`);
  } catch (err: any) {
    logFail("Create ballot", err.logs?.slice(-1)[0] || err.message?.slice(0, 60) || "Error");
    failCount++;
  }

  // =========================================================================
  // TEST 3: Create SpendToVote Ballot
  // =========================================================================
  logSection("TEST 3: CREATE BALLOT (SPENDTOVOTE)");

  const ballotId2 = generateBallotId();
  const [ballotPda2] = deriveBallotPda(ballotId2, PROGRAM_ID);
  const [vaultPda2] = deriveBallotVaultPda(ballotId2, PROGRAM_ID);

  try {
    const now = Math.floor(Date.now() / 1000);
    const currentSlot = await connection.getSlot();

    // Build create ballot instruction manually for SpendToVote
    // (needs vault account)
    const config = {
      bindingMode: { spendToVote: {} },
      revealMode: { public: {} },
      voteType: { weighted: {} },
      resolutionMode: { oracle: {} },
      numOptions: 2,
      quorumThreshold: new BN(0),
      protocolFeeBps: 100, // 1%
      protocolTreasury: wallet.publicKey,
      startTime: new BN(now - 5),
      endTime: new BN(now + 5),
      snapshotSlot: new BN(currentSlot),
      indexerPubkey: wallet.publicKey,
      eligibilityRoot: null,
      weightFormula: Buffer.from([0]),
      weightParams: [],
      timeLockPubkey: Array.from(new Uint8Array(32)),
      unlockSlot: new BN(0),
      resolver: null,
      oracle: wallet.publicKey,
      claimDeadline: new BN(now + 3600),
    };

    const tx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    );

    // Check if vault ATA needs to be created
    const vaultAta = getAssociatedTokenAddressSync(tokenMint, vaultPda2, true);
    const vaultAtaInfo = await connection.getAccountInfo(vaultAta);
    if (!vaultAtaInfo) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey,
          vaultAta,
          vaultPda2,
          tokenMint
        )
      );
    }

    tx.add(
      await program.methods
        .createBallot(Array.from(ballotId2), config)
        .accounts({
          ballot: ballotPda2,
          ballotVault: vaultPda2,
          tokenMint,
          authority: wallet.publicKey,
          payer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction()
    );

    const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
    logPass("Created SpendToVote ballot", sig.slice(0, 16) + "...");
    logInfo(`Ballot PDA: ${ballotPda2.toBase58().slice(0, 20)}...`);
    logInfo(`Vault PDA: ${vaultPda2.toBase58().slice(0, 20)}...`);
    passCount++;

    // Verify ballot state
    const ballotAccount = await (program.account as any).ballot.fetch(ballotPda2);
    logInfo(`Options: ${ballotAccount.numOptions}, Fee: ${ballotAccount.protocolFeeBps}bps`);
  } catch (err: any) {
    logFail("Create SpendToVote ballot", err.logs?.slice(-1)[0] || err.message?.slice(0, 60) || "Error");
    failCount++;
  }

  // =========================================================================
  // TEST 4: VOTE WITH ZK PROOF (vote_snapshot circuit - REAL shielded tokens)
  // =========================================================================
  logSection("TEST 4: VOTE WITH ZK PROOF (Real Shielded Tokens)");

  // Check if vote_snapshot VK is registered (must use correct circuit ID with underscore padding)
  const vkCircuitId = Buffer.from('vote_snapshot___________________'); // Must match constants.rs
  const [vkPda] = PublicKey.findProgramAddressSync([Buffer.from("vk"), vkCircuitId], PROGRAM_ID);
  const vkAccount = await connection.getAccountInfo(vkPda);

  logInfo(`Looking for VK at: ${vkPda.toBase58()}`);

  if (!vkAccount) {
    logSkip("Vote with ZK proof", "vote_snapshot VK not registered - run: npx tsx scripts/register-circom-vkeys.ts --circuit vote_snapshot --force");
    skipCount++;
  } else {
    try {
      logInfo("VK registered, starting REAL shielding flow...");

      // ======================================================================
      // STEP 1: Initialize SDK and shield tokens (REAL - no mock data)
      // ======================================================================
      const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "88ac54a3-8850-4686-a521-70d116779182";
      const snapshotClient = new CloakCraftClient({
        rpcUrl: RPC_URL,
        heliusApiKey: HELIUS_API_KEY,
        programId: PROGRAM_ID,  // Pass PublicKey directly, not string
        indexerUrl: "",  // Not used but required by interface
      });
      snapshotClient.setProgram(program);

      // Initialize pool (pool + commitment counter)
      logInfo("Initializing pool for vote_snapshot test...");
      try {
        await snapshotClient.initializePool(tokenMint, wallet);
        logInfo("Pool initialized");
      } catch (poolErr: any) {
        if (!poolErr.message?.includes("already in use") && !poolErr.message?.includes("already_exists")) {
          throw poolErr;
        }
        logInfo("Pool already exists");
      }

      // Create privacy wallet for shielding
      const snapshotPrivacyWallet = snapshotClient.createWallet();
      const { stealthAddress: snapshotStealthAddress } = generateStealthAddress(snapshotPrivacyWallet.publicKey);

      // Get user token account
      const snapshotUserTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        tokenMint,
        wallet.publicKey
      );

      // Shield tokens - NO MOCK DATA
      const snapshotShieldAmount = BigInt(100_000_000); // 100 tokens (0.1 with 9 decimals)
      logInfo(`Shielding ${Number(snapshotShieldAmount) / 1e6} tokens...`);

      const snapshotShieldResult = await snapshotClient.shield(
        {
          pool: tokenMint,
          amount: snapshotShieldAmount,
          recipient: snapshotStealthAddress,
          userTokenAccount: snapshotUserTokenAccount.address,
        },
        wallet
      );
      logPass("Shielded tokens for vote_snapshot", `${Number(snapshotShieldAmount) / 1e6} tokens`);
      passCount++;

      // Wait for Light Protocol to index the commitment
      logInfo("Waiting for Light Protocol indexing (5 seconds)...");
      await sleep(5000);

      // ======================================================================
      // STEP 2: Get REAL merkle proof from Light Protocol
      // ======================================================================
      logInfo("Loading privacy wallet and scanning for shielded notes...");

      // Load the privacy wallet into the client to scan notes
      snapshotClient.loadWallet(snapshotPrivacyWallet.exportSpendingKey());

      // Scan notes to get the shielded note with accountHash
      const scannedNotes = await snapshotClient.scanNotes(tokenMint);
      if (scannedNotes.length === 0) {
        throw new Error("No shielded notes found after shielding - Light Protocol indexing may have failed");
      }

      const shieldedNote = scannedNotes[0];
      if (!shieldedNote.accountHash) {
        throw new Error("Shielded note missing accountHash - cannot get merkle proof");
      }

      logInfo(`Found shielded note: amount=${shieldedNote.amount}, accountHash=${shieldedNote.accountHash.slice(0, 20)}...`);

      // Get merkle proof from Light Protocol
      const { LightProtocol } = await import("../packages/sdk/src/instructions/light-helpers");
      const lightProtocol = new LightProtocol(RPC_URL, PROGRAM_ID);
      const merkleProofResult = await lightProtocol.rpc.getCompressedAccountProof(bn(new PublicKey(shieldedNote.accountHash).toBytes()));

      logInfo(`Light Protocol merkle proof: leafIndex=${merkleProofResult.leafIndex}, pathLength=${merkleProofResult.merkleProof.length}`);

      // Convert Light Protocol merkle proof to circuit format (pad to 32 levels)
      const MERKLE_LEVELS = 32;
      const lightMerklePath = merkleProofResult.merkleProof.map((p: any) => p.toString());
      const merklePath: bigint[] = [];
      const merklePathIndices: number[] = [];

      // Use Light Protocol path (18 levels) and pad with zeros to 32 levels
      for (let i = 0; i < MERKLE_LEVELS; i++) {
        if (i < lightMerklePath.length) {
          merklePath.push(BigInt(lightMerklePath[i]));
          // Compute path index from leaf index
          merklePathIndices.push((merkleProofResult.leafIndex >> i) & 1);
        } else {
          // Pad with zeros for unused levels
          merklePath.push(0n);
          merklePathIndices.push(0);
        }
      }

      const snapshotMerkleRoot = BigInt(merkleProofResult.root.toString());
      logInfo(`Snapshot merkle root: ${snapshotMerkleRoot.toString().slice(0, 20)}...`);

      // ======================================================================
      // STEP 3: Prepare circuit inputs using REAL data
      // ======================================================================
      const poseidon = await buildPoseidon();

      // Use REAL STEALTH pubkey and spending key from the shielded note
      // The note stores stealthPubX (the stealth pubkey's x-coordinate)
      // We need to derive the stealth spending key to prove ownership
      const { deriveStealthPrivateKey } = await import("../packages/sdk/src/crypto/stealth");

      const recipientSpendingKey = snapshotPrivacyWallet.exportSpendingKey();
      const recipientSpendingKeyBigInt = bytesToField(recipientSpendingKey);

      // The stealth pubkey X is already in the note (what was used in commitment)
      const stealthPubX = shieldedNote.stealthPubX;
      const stealthPubXBigInt = bytesToField(stealthPubX);

      // Derive stealth spending key using ephemeral pubkey
      // stealthSpendingKey = recipientPrivateKey + factor(ephemeralPubkey)
      if (!shieldedNote.stealthEphemeralPubkey) {
        throw new Error("Note missing stealthEphemeralPubkey - cannot derive stealth spending key");
      }
      const stealthSpendingKey = deriveStealthPrivateKey(
        recipientSpendingKeyBigInt,
        shieldedNote.stealthEphemeralPubkey
      );

      // Verify: deriving pubkey from stealth spending key should match stealthPubX
      const derivedPubkey = derivePublicKey(stealthSpendingKey);
      const derivedPubkeyXBigInt = bytesToField(derivedPubkey.x);
      if (derivedPubkeyXBigInt !== stealthPubXBigInt) {
        logInfo(`WARNING: Stealth pubkey mismatch!`);
        logInfo(`  Expected (from note): ${stealthPubXBigInt.toString().slice(0, 20)}...`);
        logInfo(`  Derived (from key):   ${derivedPubkeyXBigInt.toString().slice(0, 20)}...`);
      }

      logInfo(`Stealth pubkey X: ${stealthPubXBigInt.toString().slice(0, 20)}...`);

      // Use REAL note data
      const noteAmount = BigInt(shieldedNote.amount);
      const weight = noteAmount; // Simple weight = amount
      const noteRandomness = shieldedNote.randomness;
      const noteRandomnessBigInt = bytesToField(noteRandomness);

      // Get token mint and ballot data
      const tokenMintBytes = tokenMint.toBytes();
      const tokenMintBigInt = bytesToField(tokenMintBytes);
      const ballotIdBigInt = bytesToField(ballotId1);

      // The note commitment should match what was shielded
      const noteCommitmentBigInt = bytesToField(shieldedNote.commitment);
      logInfo(`Note commitment (from shield): ${noteCommitmentBigInt.toString().slice(0, 20)}...`);

      // Derive nullifier key from STEALTH spending key (not recipient key)
      const stealthSpendingKeyBytes = fieldToBytes(stealthSpendingKey);
      const nullifierKey = deriveNullifierKey(stealthSpendingKeyBytes);
      const voteNullifier = poseidonHashDomain(BigInt(0x10), nullifierKey, ballotId1);
      const voteNullifierBigInt = bytesToField(voteNullifier);

      // Generate vote commitment randomness
      const voteRandomness = generateRandomness();
      const voteRandomnessBigInt = bytesToField(voteRandomness);

      // Compute vote commitment using two-stage hash (matching circuit)
      // Use stealthPubX as the pubkey (not recipientPubkey)
      const voteChoice = 0; // Vote for option 0

      // First stage: hash(VOTE_COMMITMENT_DOMAIN, ballot_id, vote_nullifier, pubkey)
      const hash1 = poseidon([
        poseidon.F.e(BigInt(0x11)), // VOTE_COMMITMENT_DOMAIN
        poseidon.F.e(ballotIdBigInt),
        poseidon.F.e(voteNullifierBigInt),
        poseidon.F.e(stealthPubXBigInt),  // Use stealth pubkey, not recipient pubkey
      ]);

      // Second stage: hash(hash1, vote_choice, weight, randomness)
      const voteCommitment = poseidon([
        hash1,
        poseidon.F.e(BigInt(voteChoice)),
        poseidon.F.e(weight),
        poseidon.F.e(voteRandomnessBigInt),
      ]);
      const voteCommitmentBigInt = poseidon.F.toObject(voteCommitment);

      logInfo(`Vote commitment: ${voteCommitmentBigInt.toString().slice(0, 20)}...`);

      // Build circuit inputs using REAL data
      const circuitInputs: Record<string, string | string[]> = {
        // Public inputs (must match circuit order)
        ballot_id: ballotIdBigInt.toString(),
        snapshot_merkle_root: snapshotMerkleRoot.toString(),
        note_commitment: noteCommitmentBigInt.toString(),
        vote_nullifier: voteNullifierBigInt.toString(),
        vote_commitment: voteCommitmentBigInt.toString(),
        amount: noteAmount.toString(),
        weight: weight.toString(),
        token_mint: tokenMintBigInt.toString(),
        eligibility_root: "0",
        has_eligibility: "0",
        vote_choice: voteChoice.toString(),
        is_public_mode: "1", // Public mode

        // Private inputs - ALL using REAL STEALTH data
        in_stealth_pub_x: stealthPubXBigInt.toString(),  // From the note (stealth pubkey)
        in_randomness: noteRandomnessBigInt.toString(),
        in_stealth_spending_key: stealthSpendingKey.toString(),  // Derived stealth spending key
        merkle_path: merklePath.map(p => p.toString()),
        merkle_path_indices: merklePathIndices.map(i => i.toString()),
        vote_randomness: voteRandomnessBigInt.toString(),
        eligibility_path: Array(20).fill("0"),
        eligibility_path_indices: Array(20).fill("0"),
        private_vote_choice: voteChoice.toString(),
      };

      logInfo("Loading circuit artifacts...");

      // Load circuit artifacts
      const circuitDir = path.join(__dirname, "..", "circom-circuits", "build", "voting");
      const wasmPath = path.join(circuitDir, "vote_snapshot_js", "vote_snapshot.wasm");
      const zkeyPath = path.join(circuitDir, "vote_snapshot_final.zkey");

      if (!fs.existsSync(wasmPath) || !fs.existsSync(zkeyPath)) {
        logSkip("Vote with ZK proof", "Circuit artifacts not found - compile circuits first");
        skipCount++;
      } else {
        const artifacts = await loadCircomArtifacts("vote_snapshot", wasmPath, zkeyPath);

        logInfo("Generating Groth16 proof...");
        const proofBytes = await generateSnarkjsProof(artifacts, circuitInputs);

        logInfo(`Proof generated: ${proofBytes.length} bytes`);
        logPass("Generated ZK proof", `${proofBytes.length} bytes`);
        passCount++;

        // Now submit the vote on-chain
        logInfo("Submitting vote on-chain...");

        const operationId = generateVotingOperationId();
        const voteNullifierBytes = fieldToBytes(voteNullifierBigInt);
        const voteCommitmentBytes = fieldToBytes(voteCommitmentBigInt);

        // Convert merkle root and note commitment to bytes for on-chain
        const snapshotMerkleRootBytes = fieldToBytes(snapshotMerkleRoot);
        const noteCommitmentBytes = fieldToBytes(noteCommitmentBigInt);

        // Generate output randomness
        const outputRandomness = generateRandomness();

        try {
          const phase0Ix = await buildVoteSnapshotPhase0Instruction(
            program,
            {
              ballotId: ballotId1,
              snapshotMerkleRoot: snapshotMerkleRootBytes,
              noteCommitment: noteCommitmentBytes,
              voteNullifier: voteNullifierBytes,
              voteCommitment: voteCommitmentBytes,
              voteChoice,
              amount: noteAmount,
              weight,
              proof: proofBytes,
              outputRandomness,
              encryptedContributions: undefined, // Public mode
              encryptedPreimage: undefined,
            },
            operationId,
            wallet.publicKey,
            wallet.publicKey,
            PROGRAM_ID
          );

          const tx = new Transaction().add(
            ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            phase0Ix
          );

          const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
          logPass("Submitted vote Phase 0 (proof verified)", sig.slice(0, 16) + "...");
          passCount++;

          // Verify PendingOperation was created
          const [pendingOpPda] = deriveVotingPendingOperationPda(operationId, PROGRAM_ID);
          const pendingOp = await (program.account as any).pendingOperation.fetch(pendingOpPda);
          logInfo(`PendingOp proof_verified: ${pendingOp.proofVerified}`);
          logInfo(`PendingOp num_inputs: ${pendingOp.numInputs}`);

          // ============================================
          // PHASE 1: Create vote_nullifier via Light Protocol
          // ============================================
          logInfo("Phase 1: Creating vote_nullifier via Light Protocol...");

          try {
            // Derive nullifier address for Light Protocol
            // Seeds: ["action_nullifier", ballot_id, vote_nullifier]
            const nullifierSeeds = [
              Buffer.from("action_nullifier"),
              Buffer.from(ballotId1),
              voteNullifierBytes,
            ];
            const nullifierAddressSeed = deriveAddressSeedV2(nullifierSeeds);
            const nullifierAddress = deriveAddressV2(nullifierAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
            logInfo(`Nullifier address: ${nullifierAddress.toBase58().slice(0, 16)}...`);

            // Get validity proof for non-inclusion (address doesn't exist yet)
            const nullifierProof = await lightRpc.getValidityProofV0(
              [], // no existing accounts
              [{
                address: bn(nullifierAddress.toBytes()),
                tree: addressTreeInfo.tree,
                queue: addressTreeInfo.queue,
              }]
            );
            logInfo("Got validity proof for nullifier");

            // Build Light Protocol accounts
            const systemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
            const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);
            const outputTreeIndex = packedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
            const addressTreeIndex = packedAccounts.insertOrGet(addressTreeInfo.tree);

            if (!nullifierProof.compressedProof) {
              throw new Error("No validity proof returned from Light Protocol");
            }
            const lightParams = {
              validityProof: {
                a: Array.from(nullifierProof.compressedProof.a),
                b: Array.from(nullifierProof.compressedProof.b),
                c: Array.from(nullifierProof.compressedProof.c),
              },
              addressTreeInfo: {
                addressMerkleTreePubkeyIndex: addressTreeIndex,
                addressQueuePubkeyIndex: addressTreeIndex, // Same for V2
                rootIndex: nullifierProof.rootIndices[0] ?? 0,
              },
              outputTreeIndex: outputTreeIndex,
            };

            const { remainingAccounts: rawAccounts } = packedAccounts.toAccountMetas();
            const remainingAccounts = rawAccounts.map((acc: any) => ({
              pubkey: acc.pubkey,
              isWritable: Boolean(acc.isWritable),
              isSigner: Boolean(acc.isSigner),
            }));

            // Call create_vote_nullifier instruction (voting-specific)
            const phase1Tx = await program.methods
              .createVoteNullifier(
                Array.from(operationId),
                Array.from(ballotId1), // ballot_id
                0, // nullifier_index (first expected nullifier)
                lightParams
              )
              .accounts({
                ballot: ballotPda1,
                pendingOperation: pendingOpPda,
                relayer: wallet.publicKey,
              })
              .remainingAccounts(remainingAccounts)
              .preInstructions([
                ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
              ])
              .rpc();

            logPass("Created vote_nullifier (Phase 1)", phase1Tx.slice(0, 16) + "...");
            passCount++;

            // ============================================
            // PHASE 2: Execute vote snapshot
            // ============================================
            logInfo("Phase 2: Executing vote snapshot...");

            const executeIx = await buildVoteSnapshotExecuteInstruction(
              program,
              operationId,
              ballotId1,
              wallet.publicKey,
              null, // encryptedContributions - null for public mode
              PROGRAM_ID
            );

            const executeTx = new Transaction().add(
              ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
              executeIx
            );

            const executeSig = await sendAndConfirmTransaction(connection, executeTx, [wallet]);
            logPass("Executed vote (Phase 2)", executeSig.slice(0, 16) + "...");
            passCount++;

            // Verify tally updated
            const updatedBallot = await (program.account as any).ballot.fetch(ballotPda1);
            logInfo(`Vote count: ${updatedBallot.voteCount.toString()}`);
            logInfo(`Total weight: ${updatedBallot.totalWeight.toString()}`);
            logInfo(`Option 0 weight: ${updatedBallot.optionWeights[0].toString()}`);

            // ============================================
            // PHASE 3: Create vote_commitment via Light Protocol
            // ============================================
            logInfo("Phase 3: Creating vote_commitment via Light Protocol...");

            // Derive commitment address
            // Seeds: ["vote_commitment", ballot_id, vote_commitment]
            const commitmentSeeds = [
              Buffer.from("vote_commitment"),
              Buffer.from(ballotId1),
              voteCommitmentBytes,
            ];
            const commitmentAddressSeed = deriveAddressSeedV2(commitmentSeeds);
            const commitmentAddress = deriveAddressV2(commitmentAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
            logInfo(`Commitment address: ${commitmentAddress.toBase58().slice(0, 16)}...`);

            // Get validity proof for commitment
            const commitmentProof = await lightRpc.getValidityProofV0(
              [],
              [{
                address: bn(commitmentAddress.toBytes()),
                tree: addressTreeInfo.tree,
                queue: addressTreeInfo.queue,
              }]
            );

            // Build accounts for commitment creation
            const commitPackedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);
            const commitOutputTreeIndex = commitPackedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
            const commitAddressTreeIndex = commitPackedAccounts.insertOrGet(addressTreeInfo.tree);

            if (!commitmentProof.compressedProof) {
              throw new Error("No validity proof returned from Light Protocol for commitment");
            }
            const commitLightParams = {
              validityProof: {
                a: Array.from(commitmentProof.compressedProof.a),
                b: Array.from(commitmentProof.compressedProof.b),
                c: Array.from(commitmentProof.compressedProof.c),
              },
              addressTreeInfo: {
                addressMerkleTreePubkeyIndex: commitAddressTreeIndex,
                addressQueuePubkeyIndex: commitAddressTreeIndex,
                rootIndex: commitmentProof.rootIndices[0] ?? 0,
              },
              outputTreeIndex: commitOutputTreeIndex,
            };

            const { remainingAccounts: commitRawAccounts } = commitPackedAccounts.toAccountMetas();
            const commitRemainingAccounts = commitRawAccounts.map((acc: any) => ({
              pubkey: acc.pubkey,
              isWritable: Boolean(acc.isWritable),
              isSigner: Boolean(acc.isSigner),
            }));

            // Create encrypted preimage (128 bytes) for claim recovery
            // In production, this would contain: vote_choice, weight, randomness encrypted with user's key
            const encryptedPreimage = new Array(128).fill(0);
            const encryptionType = 0; // 0 = user_key (for PermanentPrivate), 1 = timelock_key (for TimeLocked)

            // Call create_vote_commitment instruction (voting-specific)
            const phase3Tx = await program.methods
              .createVoteCommitment(
                Array.from(operationId),
                Array.from(ballotId1), // ballot_id
                0, // commitment_index
                encryptedPreimage,
                encryptionType,
                commitLightParams
              )
              .accounts({
                ballot: ballotPda1,
                pendingOperation: pendingOpPda,
                relayer: wallet.publicKey,
              })
              .remainingAccounts(commitRemainingAccounts)
              .preInstructions([
                ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
              ])
              .rpc();

            logPass("Created vote_commitment (Phase 3)", phase3Tx.slice(0, 16) + "...");
            passCount++;

            // ============================================
            // PHASE 4: Close pending operation
            // ============================================
            logInfo("Phase 4: Closing pending operation...");

            const phase4Tx = await program.methods
              .closePendingOperation(Array.from(operationId))
              .accounts({
                pendingOperation: pendingOpPda,
                relayer: wallet.publicKey,
                payer: wallet.publicKey,
              })
              .rpc();

            logPass("Closed pending operation (Phase 4)", phase4Tx.slice(0, 16) + "...");
            passCount++;

            logPass("FULL VOTING FLOW COMPLETE", "All 5 phases executed successfully!");

            // Save vote data for use in change vote test (Test 4b)
            test4VoteData = {
              voterSpendingKey: stealthSpendingKeyBytes,
              voterPubkeyXBigInt: stealthPubXBigInt,
              voteNullifierBigInt,
              voteCommitmentBigInt,
              oldVoteChoice: voteChoice,
              weight,
              randomnessBigInt: voteRandomnessBigInt,
              ballotIdBigInt,
              voteCommitmentBytes,
            };
            logInfo("Saved vote data for change vote test");

          } catch (lightErr: any) {
            const errMsg = lightErr.logs?.slice(-2).join(' | ') || lightErr.message || "";
            logFail("Light Protocol integration", errMsg.slice(0, 100));
            failCount++;
            if (lightErr.logs) {
              console.log("      Last logs:", lightErr.logs.slice(-5).join('\n      '));
            }
          }

        } catch (err: any) {
          const errMsg = err.logs?.slice(-3).join('\n') || err.message || "";
          logFail("Submit vote on-chain", errMsg.slice(0, 100));
          failCount++;
        }
      }
    } catch (err: any) {
      const errMsg = err.message || "";
      logFail("Vote with ZK proof", errMsg.slice(0, 100));
      failCount++;
    }
  }

  // =========================================================================
  // TEST 4b: CHANGE VOTE (Snapshot Mode) - Full On-Chain Flow
  // =========================================================================
  logSection("TEST 4b: CHANGE VOTE (SNAPSHOT)");

  // Check if we have the vote data from Test 4
  if (!test4VoteData) {
    logSkip("Change vote", "No vote data from Test 4");
    skipCount++;
  } else {
    const changeVoteVkCircuitId = Buffer.from('change_vote_snapshot____________'); // 32 bytes
    const [changeVoteVkPda] = PublicKey.findProgramAddressSync([Buffer.from("vk"), changeVoteVkCircuitId], PROGRAM_ID);
    const changeVoteVkAccount = await connection.getAccountInfo(changeVoteVkPda);

    if (!changeVoteVkAccount) {
      logSkip("Change vote", "change_vote_snapshot VK not registered");
      skipCount++;
    } else {
      try {
        logInfo("Using vote data from Test 4 to change vote...");

        const poseidon = await buildPoseidon();

        // Extract saved data from Test 4
        const {
          voterSpendingKey: savedSpendingKey,
          voterPubkeyXBigInt: savedPubkeyBigInt,
          voteNullifierBigInt: savedVoteNullifierBigInt,
          voteCommitmentBigInt: savedOldCommitmentBigInt,
          oldVoteChoice: savedOldChoice,
          weight: savedWeight,
          randomnessBigInt: savedOldRandomnessBigInt,
          ballotIdBigInt: savedBallotIdBigInt,
        } = test4VoteData;

        // Derive nullifier key from saved spending key
        const savedNullifierKey = deriveNullifierKey(savedSpendingKey);
        const savedNullifierKeyBigInt = bytesToField(savedNullifierKey);

        // Compute old vote commitment nullifier
        const oldCommitmentNullifier = poseidon([
          poseidon.F.e(BigInt(0x11)), // VOTE_COMMITMENT_DOMAIN
          poseidon.F.e(savedNullifierKeyBigInt),
          poseidon.F.e(savedOldCommitmentBigInt),
        ]);
        const oldCommitmentNullifierBigInt = poseidon.F.toObject(oldCommitmentNullifier);

        // New vote (change from option 0 to option 3)
        const newVoteChoice = 3;
        const newRandomness = generateRandomness();
        const newRandomnessBigInt = bytesToField(newRandomness);

        // Compute new vote commitment
        const newHash1 = poseidon([
          poseidon.F.e(BigInt(0x11)),
          poseidon.F.e(savedBallotIdBigInt),
          poseidon.F.e(savedVoteNullifierBigInt),
          poseidon.F.e(savedPubkeyBigInt),
        ]);
        const newVoteCommitment = poseidon([
          newHash1,
          poseidon.F.e(BigInt(newVoteChoice)),
          poseidon.F.e(savedWeight),
          poseidon.F.e(newRandomnessBigInt),
        ]);
        const newVoteCommitmentBigInt = poseidon.F.toObject(newVoteCommitment);

        logInfo(`Changing vote: option ${savedOldChoice} -> option ${newVoteChoice}`);

        // Build circuit inputs
        const changeVoteInputs: Record<string, string> = {
          // Public inputs
          ballot_id: savedBallotIdBigInt.toString(),
          vote_nullifier: savedVoteNullifierBigInt.toString(),
          old_vote_commitment: savedOldCommitmentBigInt.toString(),
          old_vote_commitment_nullifier: oldCommitmentNullifierBigInt.toString(),
          new_vote_commitment: newVoteCommitmentBigInt.toString(),
          weight: savedWeight.toString(),
          old_vote_choice: savedOldChoice.toString(),
          new_vote_choice: newVoteChoice.toString(),
          is_public_mode: "1",

          // Private inputs
          spending_key: bytesToField(savedSpendingKey).toString(),
          pubkey: savedPubkeyBigInt.toString(),
          old_randomness: savedOldRandomnessBigInt.toString(),
          private_old_vote_choice: savedOldChoice.toString(),
          new_randomness: newRandomnessBigInt.toString(),
          private_new_vote_choice: newVoteChoice.toString(),
        };

        // Load circuit artifacts
        const changeVoteCircuitDir = path.join(__dirname, "..", "circom-circuits", "build", "voting");
        const changeVoteWasmPath = path.join(changeVoteCircuitDir, "change_vote_snapshot_js", "change_vote_snapshot.wasm");
        const changeVoteZkeyPath = path.join(changeVoteCircuitDir, "change_vote_snapshot_final.zkey");

        if (!fs.existsSync(changeVoteWasmPath) || !fs.existsSync(changeVoteZkeyPath)) {
          logSkip("Change vote", "Circuit artifacts not found");
          skipCount++;
        } else {
          const changeVoteArtifacts = await loadCircomArtifacts("change_vote_snapshot", changeVoteWasmPath, changeVoteZkeyPath);
          const changeVoteProofBytes = await generateSnarkjsProof(changeVoteArtifacts, changeVoteInputs);

          logPass("Generated change vote proof", `${changeVoteProofBytes.length} bytes`);
          passCount++;

          // Now submit change vote on-chain
          logInfo("Submitting change vote on-chain...");

          const changeOperationId = generateVotingOperationId();
          const oldVoteCommitmentBytes = fieldToBytes(savedOldCommitmentBigInt);
          const oldCommitmentNullifierBytes = fieldToBytes(oldCommitmentNullifierBigInt);
          const newVoteCommitmentBytes = fieldToBytes(newVoteCommitmentBigInt);
          const voteNullifierBytes = fieldToBytes(savedVoteNullifierBigInt);

          try {
            const [changeVotePendingOpPda] = deriveVotingPendingOperationPda(changeOperationId, PROGRAM_ID);

            // Phase 0: Create pending with proof
            const phase0ChangeVoteTx = await program.methods
              .createPendingWithProofChangeVoteSnapshot(
                Array.from(changeOperationId),
                Array.from(ballotId1),
                Buffer.from(changeVoteProofBytes),
                Array.from(oldVoteCommitmentBytes),
                Array.from(oldCommitmentNullifierBytes),
                Array.from(newVoteCommitmentBytes),
                Array.from(voteNullifierBytes),
                new BN(savedOldChoice),
                new BN(newVoteChoice),
                new BN(savedWeight.toString()),
                null, // old_encrypted_contributions (public mode)
                null, // new_encrypted_contributions
                Array.from(newRandomness)
              )
              .accounts({
                ballot: ballotPda1,
                verificationKey: changeVoteVkPda,
                pendingOperation: changeVotePendingOpPda,
                relayer: wallet.publicKey,
                payer: wallet.publicKey,
                systemProgram: SystemProgram.programId,
              })
              .preInstructions([
                ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
                ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
              ])
              .rpc();

            logPass("Change vote Phase 0 (proof verified)", phase0ChangeVoteTx.slice(0, 16) + "...");
            passCount++;

            // Verify the pending operation
            const changeVotePendingOp = await (program.account as any).pendingOperation.fetch(changeVotePendingOpPda);
            logInfo(`PendingOp proof_verified: ${changeVotePendingOp.proofVerified}`);

            // Phase 1: Verify old commitment exists
            logInfo("Phase 1: Verifying old vote commitment exists...");

            // Wait a bit for Light Protocol indexer to catch up
            logInfo("Waiting for Light Protocol indexer to catch up...");
            await sleep(3000);

            // Derive old commitment address
            // IMPORTANT: Use the saved voteCommitmentBytes from test4VoteData for consistency
            const savedVoteCommitmentBytes = test4VoteData.voteCommitmentBytes;
            const oldCommitmentSeeds = [
              Buffer.from("vote_commitment"),
              Buffer.from(ballotId1),
              Buffer.from(savedVoteCommitmentBytes),
            ];
            const oldCommitmentAddressSeed = deriveAddressSeedV2(oldCommitmentSeeds);
            const oldCommitmentAddress = deriveAddressV2(oldCommitmentAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
            logInfo(`Old commitment address: ${oldCommitmentAddress.toBase58().slice(0, 16)}...`);

            // For inclusion proofs, we need to get the account first
            // Light Protocol V2 requires account data for inclusion proofs
            // Note: verifyCommitmentExists typically uses non-inclusion proof with address check
            // The on-chain instruction handles the merkle verification via Light Protocol CPI

            // ============================================
            // PHASE 1+: Full change vote flow
            // ============================================
            // NOTE: The change_vote_snapshot flow requires a voting-specific
            // verify_vote_commitment_exists instruction. The generic
            // verify_commitment_exists requires a Pool account, but voting
            // uses Ballot accounts. This is a known limitation.
            //
            // Phase 0 (proof verification) is complete and demonstrates:
            // - ZK proof generation for vote change
            // - On-chain proof verification
            // - PendingOperation creation
            //
            // Full flow would require:
            // - Phase 1: verify_vote_commitment_exists (voting-specific - not yet implemented)
            // - Phase 2: create_vote_commitment_nullifier
            // - Phase 3: execute_change_vote_snapshot
            // - Phase 4: create_vote_commitment (new)
            // - Phase 5: close_pending_operation

            logInfo("Change vote Phase 0 complete - ZK proof verified on-chain");
            logInfo("Note: Full 6-phase flow requires verify_vote_commitment_exists instruction");

            // Clean up pending operation
            try {
              await program.methods
                .closePendingOperation(Array.from(changeOperationId))
                .accounts({
                  pendingOperation: changeVotePendingOpPda,
                  relayer: wallet.publicKey,
                  payer: wallet.publicKey,
                })
                .rpc();
              logInfo("Cleaned up pending operation");
            } catch (_) {}

            logPass("Change vote ZK proof verified", "Phase 0 complete on-chain")

          } catch (changeErr: any) {
            const errMsg = changeErr.logs?.slice(-5).join('\n      ') || changeErr.message || "";
            logFail("Change vote on-chain", errMsg.slice(0, 100));
            if (changeErr.logs) {
              console.log("      Full logs:");
              changeErr.logs.slice(-10).forEach((log: string) => console.log("        ", log));
            }
            failCount++;
          }
        }
      } catch (err: any) {
        logFail("Change vote", err.message?.slice(0, 100) || "Error");
        failCount++;
      }
    }
  }

  // =========================================================================
  // TEST 4c: SPENDTOVOTE FLOW (with shielding integration)
  // =========================================================================
  logSection("TEST 4c: SPENDTOVOTE FLOW");

  logInfo("Testing Phase 0 proof verification (ZK circuit validation)");
  logInfo("Note: Full 5-phase flow requires shielded tokens in Light Protocol");
  logInfo("Phase 0 validates: commitment structure, nullifier derivation, position derivation");
  logInfo("");

  const voteSpendVkCircuitId = Buffer.from('vote_spend______________________'); // 32 bytes
  const [voteSpendVkPda] = PublicKey.findProgramAddressSync([Buffer.from("vk"), voteSpendVkCircuitId], PROGRAM_ID);
  const voteSpendVkAccount = await connection.getAccountInfo(voteSpendVkPda);

  if (!voteSpendVkAccount) {
    logSkip("SpendToVote", "vote_spend VK not registered - run: npx tsx scripts/register-vkeys.ts voting");
    skipCount++;
  } else {
    try {
      // Create a dedicated SpendToVote ballot with longer voting period
      const ballotIdSpend = generateBallotId();
      const [ballotPdaSpend] = deriveBallotPda(ballotIdSpend, PROGRAM_ID);
      const [vaultPdaSpend] = deriveBallotVaultPda(ballotIdSpend, PROGRAM_ID);

      const nowSpend = Math.floor(Date.now() / 1000);
      const currentSlotSpend = await connection.getSlot();

      // Initialize SDK client for shielding BEFORE creating ballot
      const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "88ac54a3-8850-4686-a521-70d116779182";
      const sdkClient = new CloakCraftClient({
        rpcUrl: RPC_URL,
        heliusApiKey: HELIUS_API_KEY,
        programId: PROGRAM_ID,  // Pass PublicKey directly, not string
        indexerUrl: "",  // Not used but required by interface
      });
      sdkClient.setProgram(program);

      // Initialize pool using SDK (initializes both pool AND commitment counter)
      logInfo("Initializing pool with SDK...");
      try {
        await sdkClient.initializePool(tokenMint, wallet);
        logInfo("Initialized token pool and commitment counter");
      } catch (poolErr: any) {
        if (!poolErr.message?.includes("already in use") && !poolErr.message?.includes("already_exists")) {
          throw poolErr;
        }
        logInfo("Pool already exists");
      }

      logInfo("Creating SpendToVote ballot for vote_spend test...");

      const configSpend = {
        bindingMode: { spendToVote: {} },
        revealMode: { public: {} },
        voteType: { weighted: {} },
        resolutionMode: { oracle: {} },
        numOptions: 2,
        quorumThreshold: new BN(0),
        protocolFeeBps: 100,
        protocolTreasury: wallet.publicKey,
        startTime: new BN(nowSpend - 5),
        endTime: new BN(nowSpend + 120), // 2 minute voting period
        snapshotSlot: new BN(currentSlotSpend),
        indexerPubkey: wallet.publicKey,
        eligibilityRoot: null,
        weightFormula: Buffer.from([0]),
        weightParams: [],
        timeLockPubkey: Array.from(new Uint8Array(32)),
        unlockSlot: new BN(0),
        resolver: null,
        oracle: wallet.publicKey,
        claimDeadline: new BN(nowSpend + 3600),
      };

      const createSpendTx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
      );

      const vaultAtaSpend = getAssociatedTokenAddressSync(tokenMint, vaultPdaSpend, true);
      const vaultAtaInfoSpend = await connection.getAccountInfo(vaultAtaSpend);
      if (!vaultAtaInfoSpend) {
        createSpendTx.add(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            vaultAtaSpend,
            vaultPdaSpend,
            tokenMint
          )
        );
      }

      createSpendTx.add(
        await program.methods
          .createBallot(Array.from(ballotIdSpend), configSpend)
          .accounts({
            ballot: ballotPdaSpend,
            ballotVault: vaultPdaSpend,
            tokenMint,
            authority: wallet.publicKey,
            payer: wallet.publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction()
      );

      await sendAndConfirmTransaction(connection, createSpendTx, [wallet]);
      logInfo(`Created SpendToVote ballot: ${ballotPdaSpend.toBase58().slice(0, 16)}...`);

      // ================================================
      // STEP 1: Shield tokens for vote_spend
      // ================================================
      logInfo("Shielding tokens for vote_spend...");

      // Create privacy wallet for shielding
      const privacyWallet = sdkClient.createWallet();
      const { stealthAddress } = generateStealthAddress(privacyWallet.publicKey);

      // Get user token account
      const userTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        wallet,
        tokenMint,
        wallet.publicKey
      );

      // Shield 200 tokens - NO MOCK DATA, shield must succeed
      const shieldAmount = BigInt(200_000_000);
      const shieldResult = await sdkClient.shield(
        {
          pool: tokenMint,
          amount: shieldAmount,
          recipient: stealthAddress,
          userTokenAccount: userTokenAccount.address,
        },
        wallet
      );
      logPass("Shielded tokens", `${Number(shieldAmount) / 1e6} tokens`);
      passCount++;

      // Get commitment and randomness from shield result for proof generation
      const shieldedCommitment = shieldResult.commitment;
      const shieldedRandomness = shieldResult.randomness;
      logInfo(`Commitment: ${Buffer.from(shieldedCommitment).toString('hex').slice(0, 32)}...`);
      logInfo(`Randomness: ${Buffer.from(shieldedRandomness).toString('hex').slice(0, 32)}...`);

      // Wait for Light Protocol indexing
      logInfo("Waiting for Light Protocol indexing (5 seconds)...");
      await sleep(5000);

      // Scan for shielded notes to get the stealth keys
      logInfo("Scanning for shielded note to get stealth keys...");
      // Load wallet into SDK client before scanning
      sdkClient.loadWallet(privacyWallet.exportSpendingKey());
      const scannedNotes = await sdkClient.scanNotes(tokenMint);
      if (scannedNotes.length === 0) {
        throw new Error("No shielded notes found after indexing");
      }
      const shieldedNote = scannedNotes[0];
      logInfo(`Found shielded note: amount=${shieldedNote.amount}`);

      // ================================================
      // STEP 2: Get REAL merkle proof from Light Protocol
      // ================================================
      if (!shieldedNote.accountHash) {
        throw new Error("Shielded note missing accountHash - cannot get merkle proof");
      }

      logInfo("Getting REAL merkle proof from Light Protocol...");
      const { LightProtocol: LightProtocolSpend } = await import("../packages/sdk/src/instructions/light-helpers");
      const lightProtocolSpend = new LightProtocolSpend(RPC_URL, PROGRAM_ID);
      const spendMerkleProofResult = await lightProtocolSpend.rpc.getCompressedAccountProof(bn(new PublicKey(shieldedNote.accountHash).toBytes()));

      logInfo(`Light Protocol merkle proof: leafIndex=${spendMerkleProofResult.leafIndex}, pathLength=${spendMerkleProofResult.merkleProof.length}`);
      if (spendMerkleProofResult.treeInfo) {
        logInfo(`  Tree from proof: ${spendMerkleProofResult.treeInfo.tree}`);
        logInfo(`  Queue from proof: ${spendMerkleProofResult.treeInfo.queue}`);
      } else {
        logInfo(`  treeInfo not available in proof result`);
      }

      // Convert Light Protocol merkle proof to circuit format (pad to 32 levels)
      const SPEND_MERKLE_LEVELS = 32;
      const spendLightMerklePath = spendMerkleProofResult.merkleProof.map((p: any) => p.toString());
      const spendMerklePath: bigint[] = [];
      const spendMerklePathIndices: number[] = [];

      for (let i = 0; i < SPEND_MERKLE_LEVELS; i++) {
        if (i < spendLightMerklePath.length) {
          spendMerklePath.push(BigInt(spendLightMerklePath[i]));
          spendMerklePathIndices.push((spendMerkleProofResult.leafIndex >> i) & 1);
        } else {
          spendMerklePath.push(0n);
          spendMerklePathIndices.push(0);
        }
      }

      const spendMerkleRoot = BigInt(spendMerkleProofResult.root.toString());
      const spendLeafIndex = BigInt(spendMerkleProofResult.leafIndex);
      logInfo(`REAL merkle root: ${spendMerkleRoot.toString().slice(0, 20)}...`);

      // ================================================
      // STEP 3: Generate vote_spend proof using REAL shielded data
      // ================================================
      logInfo("Generating vote_spend proof with real shielded note...");

      const poseidon = await buildPoseidon();

      // Get the STEALTH keys from the scanned note (NOT the recipient's keys)
      const spendKey = privacyWallet.exportSpendingKey();
      const recipientSpendingKeyBigInt = bytesToField(spendKey);

      // The stealth pubkey X is in the note (what was used in commitment)
      const stealthPubX = shieldedNote.stealthPubX;
      const stealthPubXBigInt = bytesToField(stealthPubX);

      // Derive stealth spending key using ephemeral pubkey
      if (!shieldedNote.stealthEphemeralPubkey) {
        throw new Error("Note missing stealthEphemeralPubkey - cannot derive stealth spending key");
      }
      const { deriveStealthPrivateKey: deriveStealthPrivateKeySpend } = await import("../packages/sdk/src/crypto/stealth");
      const stealthSpendingKey = deriveStealthPrivateKeySpend(
        recipientSpendingKeyBigInt,
        shieldedNote.stealthEphemeralPubkey
      );

      // Derive nullifier key from STEALTH spending key
      const stealthSpendingKeyBytes = fieldToBytes(stealthSpendingKey);
      const nk = deriveNullifierKey(stealthSpendingKeyBytes);
      const nkBigInt = bytesToField(nk);

      // Use the REAL commitment and randomness from shield operation
      const tokenMintBigInt = bytesToField(tokenMint.toBytes());
      const noteAmount = shieldAmount;
      const noteRandomness = shieldedRandomness;  // REAL randomness from shield
      const noteRandomnessBigInt = bytesToField(noteRandomness);

      // Use the REAL note commitment from shield operation
      const noteCommitmentBigInt = bytesToField(shieldedCommitment);
      logInfo(`Using real note commitment: ${noteCommitmentBigInt.toString(16).slice(0, 16)}...`);

      // Compute spending nullifier: Poseidon(SPENDING_NULLIFIER_DOMAIN, nullifier_key, commitment, leaf_index)
      const spendingNullifier = poseidon([
        poseidon.F.e(BigInt(2)), // SPENDING_NULLIFIER_DOMAIN
        poseidon.F.e(nkBigInt),
        poseidon.F.e(noteCommitmentBigInt),
        poseidon.F.e(spendLeafIndex),
      ]);
      const spendingNullifierBigInt = poseidon.F.toObject(spendingNullifier);

      // Vote details
      const voteChoice = 0;
      const weight = noteAmount; // weight = amount for simple formula
      const positionRandomness = generateRandomness();
      const positionRandomnessBigInt = bytesToField(positionRandomness);

      // Compute position commitment using the new ballot and STEALTH pubkey
      const posHash1 = poseidon([
        poseidon.F.e(BigInt(0x13)), // POSITION_DOMAIN
        poseidon.F.e(bytesToField(ballotIdSpend)),
        poseidon.F.e(stealthPubXBigInt),  // Use stealth pubkey, not recipient pubkey
        poseidon.F.e(BigInt(voteChoice)),
      ]);
      const positionCommitment = poseidon([
        posHash1,
        poseidon.F.e(noteAmount),
        poseidon.F.e(weight),
        poseidon.F.e(positionRandomnessBigInt),
      ]);
      const positionCommitmentBigInt = poseidon.F.toObject(positionCommitment);

      logInfo(`Note amount: ${noteAmount}, Vote choice: ${voteChoice}`);

      // Build circuit inputs with REAL merkle data
      const voteSpendInputs: Record<string, string | string[]> = {
        // Public inputs
        ballot_id: bytesToField(ballotIdSpend).toString(),
        merkle_root: spendMerkleRoot.toString(), // REAL merkle root from Light Protocol
        spending_nullifier: spendingNullifierBigInt.toString(),
        position_commitment: positionCommitmentBigInt.toString(),
        amount: noteAmount.toString(),
        weight: weight.toString(),
        token_mint: tokenMintBigInt.toString(),
        eligibility_root: "0",
        has_eligibility: "0",
        vote_choice: voteChoice.toString(),
        is_public_mode: "1",

        // Private inputs - use STEALTH keys from note and REAL merkle path
        in_stealth_pub_x: stealthPubXBigInt.toString(),
        in_amount: noteAmount.toString(),
        in_randomness: noteRandomnessBigInt.toString(),
        in_stealth_spending_key: stealthSpendingKey.toString(),
        merkle_path: spendMerklePath.map(p => p.toString()), // REAL merkle path
        merkle_path_indices: spendMerklePathIndices.map(i => i.toString()), // REAL path indices
        leaf_index: spendLeafIndex.toString(),
        position_randomness: positionRandomnessBigInt.toString(),
        private_vote_choice: voteChoice.toString(),
        eligibility_path: Array(20).fill("0"),
        eligibility_path_indices: Array(20).fill("0"),
      };

      // Load circuit artifacts
      const voteSpendCircuitDir = path.join(__dirname, "..", "circom-circuits", "build", "voting");
      const voteSpendWasmPath = path.join(voteSpendCircuitDir, "vote_spend_js", "vote_spend.wasm");
      const voteSpendZkeyPath = path.join(voteSpendCircuitDir, "vote_spend_final.zkey");

      if (!fs.existsSync(voteSpendWasmPath) || !fs.existsSync(voteSpendZkeyPath)) {
        logSkip("SpendToVote", "Circuit artifacts not found");
        skipCount++;
      } else {
        const voteSpendArtifacts = await loadCircomArtifacts("vote_spend", voteSpendWasmPath, voteSpendZkeyPath);
        const voteSpendProofBytes = await generateSnarkjsProof(voteSpendArtifacts, voteSpendInputs);

        logPass("Generated vote_spend proof", `${voteSpendProofBytes.length} bytes`);
        passCount++;

        // Submit vote_spend Phase 0 on-chain
        logInfo("Submitting vote_spend on-chain...");

        const operationIdSpend = generateVotingOperationId();
        const spendingNullifierBytes = fieldToBytes(spendingNullifierBigInt);
        const positionCommitmentBytes = fieldToBytes(positionCommitmentBigInt);
        const noteCommitmentBytes = fieldToBytes(noteCommitmentBigInt);
        const outputRandomnessSpend = generateRandomness();

        try {
          // Build Phase 0 instruction
          const [pendingOpPdaSpend] = deriveVotingPendingOperationPda(operationIdSpend, PROGRAM_ID);

          // Get pool PDA for the token
          const [poolPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool"), tokenMint.toBytes()],
            PROGRAM_ID
          );

          // Use REAL merkle root bytes
          const spendMerkleRootBytes = fieldToBytes(spendMerkleRoot);

          const phase0SpendTx = await program.methods
            .createPendingWithProofVoteSpend(
              Array.from(operationIdSpend),
              Array.from(ballotIdSpend),
              Buffer.from(voteSpendProofBytes),
              Array.from(spendMerkleRootBytes), // REAL merkle root
              Array.from(noteCommitmentBytes),
              Array.from(spendingNullifierBytes),
              Array.from(positionCommitmentBytes),
              new BN(voteChoice),
              new BN(noteAmount.toString()),
              new BN(weight.toString()),
              null, // encrypted_contributions (public mode)
              null, // encrypted_preimage
              Array.from(outputRandomnessSpend)
            )
            .accounts({
              ballot: ballotPdaSpend,
              pool: poolPda,
              verificationKey: voteSpendVkPda,
              pendingOperation: pendingOpPdaSpend,
              relayer: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Submitted vote_spend Phase 0 (proof verified)", phase0SpendTx.slice(0, 16) + "...");
          passCount++;

          // Verify PendingOperation
          const pendingOpSpend = await (program.account as any).pendingOperation.fetch(pendingOpPdaSpend);
          logInfo(`PendingOp proof_verified: ${pendingOpSpend.proofVerified}`);
          logInfo(`Operation type: vote_spend`);

          // ============================================
          // PHASE 1: Verify note commitment exists via Light Protocol
          // ============================================
          logInfo("Phase 1: Verifying note commitment exists...");

          // The note commitment should already exist from shielding
          // For vote_spend, we use verify_commitment_exists which checks the pool's merkle tree
          // This is different from vote_snapshot which uses vote-specific verification

          // Use tree information from the merkle proof
          const commitmentTreePubkey = spendMerkleProofResult.treeInfo?.tree
            ? new PublicKey(spendMerkleProofResult.treeInfo.tree)
            : V2_STATE_TREE;
          const commitmentQueuePubkey = spendMerkleProofResult.treeInfo?.queue
            ? new PublicKey(spendMerkleProofResult.treeInfo.queue)
            : V2_OUTPUT_QUEUE;

          logInfo(`Using tree: ${commitmentTreePubkey.toBase58()}`);
          logInfo(`Using queue: ${commitmentQueuePubkey.toBase58()}`);
          logInfo(`Leaf index: ${spendMerkleProofResult.leafIndex}`);
          logInfo(`Root index: ${spendMerkleProofResult.rootIndex ?? 0}`);

          // Build Light Protocol accounts for verification
          const spendSystemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
          const spendPackedAccounts = PackedAccounts.newWithSystemAccountsV2(spendSystemConfig);

          // Get indices for trees
          const commitmentTreeIndex = spendPackedAccounts.insertOrGet(commitmentTreePubkey);
          const commitmentQueueIndex = spendPackedAccounts.insertOrGet(commitmentQueuePubkey);

          // Get account hash bytes
          const accountHashBytes = new PublicKey(shieldedNote.accountHash).toBytes();

          // Build light params with correct structure
          // On-chain verification uses merkle context, not a ZK validity proof
          const phase1SpendLightParams = {
            commitmentAccountHash: Array.from(accountHashBytes),
            commitmentMerkleContext: {
              merkleTreePubkeyIndex: commitmentTreeIndex,
              queuePubkeyIndex: commitmentQueueIndex,
              leafIndex: spendMerkleProofResult.leafIndex,
              rootIndex: spendMerkleProofResult.rootIndex ?? 0,
            },
            // Note: On-chain code sets proof: None, so these values aren't used
            // but we still need to pass the struct
            commitmentInclusionProof: {
              a: Array(32).fill(0),
              b: Array(64).fill(0),
              c: Array(32).fill(0),
            },
            commitmentAddressTreeInfo: {
              addressMerkleTreePubkeyIndex: commitmentTreeIndex,
              addressQueuePubkeyIndex: commitmentQueueIndex,
              rootIndex: spendMerkleProofResult.rootIndex ?? 0,
            },
          };

          const { remainingAccounts: spendPhase1Accounts } = spendPackedAccounts.toAccountMetas();
          const spendPhase1RemainingAccounts = spendPhase1Accounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          const phase1SpendTx = await program.methods
            .verifyCommitmentExists(
              Array.from(operationIdSpend),
              0, // input_index
              phase1SpendLightParams
            )
            .accounts({
              pool: poolPda,
              pendingOperation: pendingOpPdaSpend,
              relayer: wallet.publicKey,
            })
            .remainingAccounts(spendPhase1RemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Verified note commitment exists (Phase 1)", phase1SpendTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 2: Create spending nullifier via Light Protocol
          // ============================================
          logInfo("Phase 2: Creating spending nullifier...");

          // Derive nullifier address
          // Seeds must match on-chain: ["spend_nullifier", pool, nullifier]
          const spendNullifierSeeds = [
            Buffer.from("spend_nullifier"),
            poolPda.toBuffer(),
            Buffer.from(spendingNullifierBytes),
          ];
          const spendNullifierAddressSeed = deriveAddressSeedV2(spendNullifierSeeds);
          const spendNullifierAddress = deriveAddressV2(spendNullifierAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
          logInfo(`Spending nullifier address: ${spendNullifierAddress.toBase58().slice(0, 16)}...`);

          // Get validity proof for non-inclusion
          const spendNullifierProof = await lightRpc.getValidityProofV0(
            [],
            [{
              address: bn(spendNullifierAddress.toBytes()),
              tree: addressTreeInfo.tree,
              queue: addressTreeInfo.queue,
            }]
          );

          // Build accounts
          const phase2SpendPackedAccounts = PackedAccounts.newWithSystemAccountsV2(spendSystemConfig);
          const phase2SpendOutputTreeIndex = phase2SpendPackedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
          const phase2SpendAddressTreeIndex = phase2SpendPackedAccounts.insertOrGet(addressTreeInfo.tree);

          if (!spendNullifierProof.compressedProof) {
            throw new Error("No validity proof for spending nullifier");
          }

          const phase2SpendLightParams = {
            proof: {
              a: Array.from(spendNullifierProof.compressedProof.a),
              b: Array.from(spendNullifierProof.compressedProof.b),
              c: Array.from(spendNullifierProof.compressedProof.c),
            },
            addressTreeInfo: {
              addressMerkleTreePubkeyIndex: phase2SpendAddressTreeIndex,
              addressQueuePubkeyIndex: phase2SpendAddressTreeIndex,
              rootIndex: spendNullifierProof.rootIndices[0] ?? 0,
            },
            outputTreeIndex: phase2SpendOutputTreeIndex,
          };

          const { remainingAccounts: phase2SpendRawAccounts } = phase2SpendPackedAccounts.toAccountMetas();
          const phase2SpendRemainingAccounts = phase2SpendRawAccounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          const phase2SpendTx = await program.methods
            .createNullifierAndPending(
              Array.from(operationIdSpend),
              0, // nullifier_index
              phase2SpendLightParams
            )
            .accounts({
              pool: poolPda,
              pendingOperation: pendingOpPdaSpend,
              relayer: wallet.publicKey,
            })
            .remainingAccounts(phase2SpendRemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Created spending nullifier (Phase 2)", phase2SpendTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 3: Execute vote_spend (update ballot tally)
          // ============================================
          logInfo("Phase 3: Executing vote_spend...");

          const phase3SpendTx = await program.methods
            .executeVoteSpend(
              Array.from(operationIdSpend),
              Array.from(ballotIdSpend),
              null // encrypted_contributions (public mode)
            )
            .accounts({
              ballot: ballotPdaSpend,
              ballotVault: vaultPdaSpend,
              pendingOperation: pendingOpPdaSpend,
              relayer: wallet.publicKey,
            })
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
            ])
            .rpc();

          logPass("Executed vote_spend (Phase 3)", phase3SpendTx.slice(0, 16) + "...");
          passCount++;

          // Verify tally updated
          const spendUpdatedBallot = await (program.account as any).ballot.fetch(ballotPdaSpend);
          logInfo(`Vote count: ${spendUpdatedBallot.voteCount.toString()}`);
          logInfo(`Total weight: ${spendUpdatedBallot.totalWeight.toString()}`);
          logInfo(`Option 0 weight: ${spendUpdatedBallot.optionWeights[0].toString()}`);

          // ============================================
          // PHASE 4: Create position commitment via Light Protocol
          // ============================================
          logInfo("Phase 4: Creating position commitment...");

          // Derive position commitment address (same seeds as vote_commitment)
          // Seeds: ["vote_commitment", ballot_id, commitment]
          const positionSeeds = [
            Buffer.from("vote_commitment"),
            Buffer.from(ballotIdSpend),
            positionCommitmentBytes,
          ];
          const positionAddressSeed = deriveAddressSeedV2(positionSeeds);
          const positionAddress = deriveAddressV2(positionAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
          logInfo(`Position commitment address: ${positionAddress.toBase58().slice(0, 16)}...`);

          // Get validity proof for position commitment
          const positionProof = await lightRpc.getValidityProofV0(
            [],
            [{
              address: bn(positionAddress.toBytes()),
              tree: addressTreeInfo.tree,
              queue: addressTreeInfo.queue,
            }]
          );

          // Build accounts
          const phase4SpendPackedAccounts = PackedAccounts.newWithSystemAccountsV2(spendSystemConfig);
          const phase4SpendOutputTreeIndex = phase4SpendPackedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
          const phase4SpendAddressTreeIndex = phase4SpendPackedAccounts.insertOrGet(addressTreeInfo.tree);

          if (!positionProof.compressedProof) {
            throw new Error("No validity proof for position commitment");
          }

          const phase4SpendLightParams = {
            validityProof: {
              a: Array.from(positionProof.compressedProof.a),
              b: Array.from(positionProof.compressedProof.b),
              c: Array.from(positionProof.compressedProof.c),
            },
            addressTreeInfo: {
              addressMerkleTreePubkeyIndex: phase4SpendAddressTreeIndex,
              addressQueuePubkeyIndex: phase4SpendAddressTreeIndex,
              rootIndex: positionProof.rootIndices[0] ?? 0,
            },
            outputTreeIndex: phase4SpendOutputTreeIndex,
          };

          const { remainingAccounts: phase4SpendRawAccounts } = phase4SpendPackedAccounts.toAccountMetas();
          const phase4SpendRemainingAccounts = phase4SpendRawAccounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          // Create encrypted preimage for claim recovery (128 bytes)
          const spendEncryptedPreimage = new Array(128).fill(0);
          const spendEncryptionType = 0; // 0 = user_key

          const phase4SpendTx = await program.methods
            .createVoteCommitment(
              Array.from(operationIdSpend),
              Array.from(ballotIdSpend),
              0, // commitment_index
              spendEncryptedPreimage,
              spendEncryptionType,
              phase4SpendLightParams
            )
            .accounts({
              ballot: ballotPdaSpend,
              pendingOperation: pendingOpPdaSpend,
              relayer: wallet.publicKey,
            })
            .remainingAccounts(phase4SpendRemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Created position commitment (Phase 4)", phase4SpendTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 5: Close pending operation
          // ============================================
          logInfo("Phase 5: Closing pending operation...");

          const phase5SpendTx = await program.methods
            .closePendingOperation(Array.from(operationIdSpend))
            .accounts({
              pendingOperation: pendingOpPdaSpend,
              relayer: wallet.publicKey,
              payer: wallet.publicKey,
            })
            .rpc();

          logPass("Closed pending operation (Phase 5)", phase5SpendTx.slice(0, 16) + "...");
          passCount++;

          logPass("FULL VOTE_SPEND FLOW COMPLETE", "All 6 phases executed successfully!");

          // Wait for Light Protocol indexer to index the new position commitment
          logInfo("Waiting 10 seconds for Light Protocol indexer to catch up...");
          await sleep(10000);

          // Query Light Protocol to get the position's accountHash for use in change_vote_spend
          logInfo("Querying Light Protocol for position accountHash...");
          let positionAccountHash: string | null = null;
          let positionLeafIndex: number = 0;
          let positionTreePubkey: PublicKey = addressTreeInfo.tree;
          let positionQueuePubkey: PublicKey = addressTreeInfo.queue;

          try {
            // Query by address to get the compressed account info
            const positionAccountResponse = await fetch(RPC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getCompressedAccount',
                params: {
                  address: positionAddress.toBase58(),
                },
              }),
            });
            const positionAccountResult = await positionAccountResponse.json() as any;
            if (positionAccountResult.result?.value?.hash) {
              positionAccountHash = positionAccountResult.result.value.hash;
              logInfo(`Position accountHash: ${positionAccountHash?.slice(0, 20)}...`);
            } else {
              logInfo("Position account not indexed yet - will retry in change_vote_spend");
            }
          } catch (queryErr: any) {
            logInfo(`Note: Could not query position accountHash: ${queryErr.message?.slice(0, 50)}`);
          }

          // Save position data for change_vote_spend and close_position tests
          test4cVoteSpendData = {
            ballotId: ballotIdSpend,
            ballotPda: ballotPdaSpend,
            vaultPda: vaultPdaSpend,
            stealthSpendingKey: stealthSpendingKey,
            stealthPubXBigInt: stealthPubXBigInt,
            positionCommitmentBigInt: positionCommitmentBigInt,
            positionCommitmentBytes: positionCommitmentBytes,
            positionRandomnessBigInt: positionRandomnessBigInt,
            voteChoice: voteChoice,
            amount: noteAmount,
            weight: weight,
            tokenMintBigInt: tokenMintBigInt,
            positionAccountHash: positionAccountHash,
            positionAddress: positionAddress.toBase58(),
            positionTreePubkey: positionTreePubkey,
            positionQueuePubkey: positionQueuePubkey,
          };
          logInfo("Saved position data for change_vote_spend and close_position tests");

        } catch (spendErr: any) {
          const errMsg = spendErr.logs?.slice(-5).join('\n      ') || spendErr.message || "";
          logFail("vote_spend on-chain", errMsg.slice(0, 100));
          if (spendErr.logs) {
            console.log("      Full logs:");
            spendErr.logs.slice(-10).forEach((log: string) => console.log("        ", log));
          }
          failCount++;
        }
      }
    } catch (err: any) {
      logFail("SpendToVote", err.message?.slice(0, 100) || "Error");
      failCount++;
    }
  }

  // =========================================================================
  // TEST 4d: CHANGE VOTE (SpendToVote Mode) - Uses REAL position from vote_spend
  // =========================================================================
  logSection("TEST 4d: CHANGE VOTE (SPENDTOVOTE)");

  // Check if we have real position data from vote_spend (Test 4c)
  if (!test4cVoteSpendData) {
    logSkip("Change Vote SpendToVote", "No position data from vote_spend - run Test 4c first");
    skipCount++;
  } else {
    const changeVoteSpendVkCircuitId = Buffer.from('change_vote_spend_______________'); // 32 bytes
    const [changeVoteSpendVkPda] = PublicKey.findProgramAddressSync([Buffer.from("vk"), changeVoteSpendVkCircuitId], PROGRAM_ID);
    const changeVoteSpendVkAccount = await connection.getAccountInfo(changeVoteSpendVkPda);

    if (!changeVoteSpendVkAccount) {
      logSkip("Change Vote SpendToVote", "change_vote_spend VK not registered");
      skipCount++;
    } else {
      try {
        logInfo("Using REAL position data from vote_spend test...");

        const poseidon = await buildPoseidon();

        // Extract data from the REAL position created in vote_spend
        const {
          ballotId: ballotIdChangeSpend,
          ballotPda: ballotPdaChangeSpend,
          vaultPda: vaultPdaChangeSpend,
          stealthSpendingKey,
          stealthPubXBigInt: changePubkeyBigInt,
          positionCommitmentBigInt: oldPositionCommitmentBigInt,
          positionCommitmentBytes: oldPositionCommitmentBytes,
          positionRandomnessBigInt: oldPositionRandomnessBigInt,
          voteChoice: oldVoteChoice,
          amount: positionAmount,
          weight: positionWeight,
          tokenMintBigInt,
        } = test4cVoteSpendData;

        logInfo(`Using position from ballot: ${ballotPdaChangeSpend.toBase58().slice(0, 16)}...`);
        logInfo(`Old position commitment: ${oldPositionCommitmentBigInt.toString().slice(0, 20)}...`);

        // Derive nullifier key from the REAL stealth spending key
        const changeSpendingKeyBytes = fieldToBytes(stealthSpendingKey);
        const changeNk = deriveNullifierKey(changeSpendingKeyBytes);
        const changeNkBigInt = bytesToField(changeNk);

        // Compute old position nullifier using REAL data
        const oldPositionNullifier = poseidon([
          poseidon.F.e(BigInt(0x13)), // POSITION_DOMAIN
          poseidon.F.e(changeNkBigInt),
          poseidon.F.e(oldPositionCommitmentBigInt),
        ]);
        const oldPositionNullifierBigInt = poseidon.F.toObject(oldPositionNullifier);

        // New vote (change from original vote to option 1)
        const newVoteChoice = 1;
        const newPositionRandomness = generateRandomness();
        const newPositionRandomnessBigInt = bytesToField(newPositionRandomness);

        // Compute new position commitment
        const newPosHash1 = poseidon([
          poseidon.F.e(BigInt(0x13)), // POSITION_DOMAIN
          poseidon.F.e(bytesToField(ballotIdChangeSpend)),
          poseidon.F.e(changePubkeyBigInt),
          poseidon.F.e(BigInt(newVoteChoice)),
        ]);
        const newPositionCommitment = poseidon([
          newPosHash1,
          poseidon.F.e(positionAmount),
          poseidon.F.e(positionWeight),
          poseidon.F.e(newPositionRandomnessBigInt),
        ]);
        const newPositionCommitmentBigInt = poseidon.F.toObject(newPositionCommitment);

        logInfo(`Changing vote: option ${oldVoteChoice} -> option ${newVoteChoice}`);

        // Build circuit inputs for change_vote_spend
        const changeVoteSpendInputs: Record<string, string> = {
          // Public inputs
          ballot_id: bytesToField(ballotIdChangeSpend).toString(),
          old_position_commitment: oldPositionCommitmentBigInt.toString(),
          old_position_nullifier: oldPositionNullifierBigInt.toString(),
          new_position_commitment: newPositionCommitmentBigInt.toString(),
          amount: positionAmount.toString(),
          weight: positionWeight.toString(),
          token_mint: tokenMintBigInt.toString(),
          old_vote_choice: oldVoteChoice.toString(),
          new_vote_choice: newVoteChoice.toString(),
          is_public_mode: "1",

          // Private inputs
          spending_key: stealthSpendingKey.toString(),
          pubkey: changePubkeyBigInt.toString(),
          old_position_randomness: oldPositionRandomnessBigInt.toString(),
          private_old_vote_choice: oldVoteChoice.toString(),
          new_position_randomness: newPositionRandomnessBigInt.toString(),
          private_new_vote_choice: newVoteChoice.toString(),
        };

        // Load circuit artifacts
        const changeVoteSpendCircuitDir = path.join(__dirname, "..", "circom-circuits", "build", "voting");
        const changeVoteSpendWasmPath = path.join(changeVoteSpendCircuitDir, "change_vote_spend_js", "change_vote_spend.wasm");
        const changeVoteSpendZkeyPath = path.join(changeVoteSpendCircuitDir, "change_vote_spend_final.zkey");

        if (!fs.existsSync(changeVoteSpendWasmPath) || !fs.existsSync(changeVoteSpendZkeyPath)) {
          logSkip("Change Vote SpendToVote", "Circuit artifacts not found");
          skipCount++;
        } else {
          const changeVoteSpendArtifacts = await loadCircomArtifacts("change_vote_spend", changeVoteSpendWasmPath, changeVoteSpendZkeyPath);
          const changeVoteSpendProofBytes = await generateSnarkjsProof(changeVoteSpendArtifacts, changeVoteSpendInputs);

          logPass("Generated change_vote_spend proof", `${changeVoteSpendProofBytes.length} bytes`);
          passCount++;

          // Submit change_vote_spend Phase 0 on-chain
          logInfo("Submitting change_vote_spend on-chain...");

          const operationIdChangeSpend = generateVotingOperationId();
          const oldPositionCommitmentBytes = fieldToBytes(oldPositionCommitmentBigInt);
          const oldPositionNullifierBytes = fieldToBytes(oldPositionNullifierBigInt);
          const newPositionCommitmentBytes = fieldToBytes(newPositionCommitmentBigInt);
          const outputRandomnessChangeSpend = generateRandomness();

          // Get pool PDA
          const [poolPdaChangeSpend] = PublicKey.findProgramAddressSync(
            [Buffer.from("pool"), tokenMint.toBytes()],
            PROGRAM_ID
          );

          try {
            const [pendingOpPdaChangeSpend] = deriveVotingPendingOperationPda(operationIdChangeSpend, PROGRAM_ID);

            const phase0ChangeSpendTx = await program.methods
              .createPendingWithProofChangeVoteSpend(
                Array.from(operationIdChangeSpend),
                Array.from(ballotIdChangeSpend),
                Buffer.from(changeVoteSpendProofBytes),
                Array.from(oldPositionCommitmentBytes),
                Array.from(oldPositionNullifierBytes),
                Array.from(newPositionCommitmentBytes),
                new BN(oldVoteChoice),
                new BN(newVoteChoice),
                new BN(positionAmount.toString()),
                new BN(positionWeight.toString()),
                null, // old_encrypted_contributions (public mode)
                null, // new_encrypted_contributions
                Array.from(outputRandomnessChangeSpend)
            )
            .accounts({
              ballot: ballotPdaChangeSpend,
              pool: poolPdaChangeSpend,
              verificationKey: changeVoteSpendVkPda,
              pendingOperation: pendingOpPdaChangeSpend,
              relayer: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Submitted change_vote_spend Phase 0 (proof verified)", phase0ChangeSpendTx.slice(0, 16) + "...");
          passCount++;

          // Verify PendingOperation
          const pendingOpChangeSpend = await (program.account as any).pendingOperation.fetch(pendingOpPdaChangeSpend);
          logInfo(`PendingOp proof_verified: ${pendingOpChangeSpend.proofVerified}`);
          logInfo(`Operation type: change_vote_spend`);

          // ============================================
          // PHASE 1: Verify old position commitment exists
          // ============================================
          logInfo("Phase 1: Verifying old position commitment exists in Light Protocol...");

          // Get the position's accountHash from the saved data
          const { positionAccountHash, positionAddress, positionTreePubkey, positionQueuePubkey } = test4cVoteSpendData;

          if (!positionAccountHash) {
            // Need to query Light Protocol to get the accountHash
            logInfo("Position accountHash not cached, querying Light Protocol...");
            const positionAccountResponse = await fetch(RPC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getCompressedAccount',
                params: {
                  address: positionAddress,
                },
              }),
            });
            const positionAccountResult = await positionAccountResponse.json() as any;
            if (!positionAccountResult.result?.value?.hash) {
              throw new Error("Position commitment not indexed in Light Protocol yet - try waiting longer");
            }
            test4cVoteSpendData.positionAccountHash = positionAccountResult.result.value.hash;
          }

          const accountHashToUse = test4cVoteSpendData.positionAccountHash!;
          logInfo(`Using position accountHash: ${accountHashToUse.slice(0, 20)}...`);

          // Get merkle proof using the accountHash (not the commitment value!)
          const accountHashBytes = new PublicKey(accountHashToUse).toBytes();
          const accountHashBn = bn(accountHashBytes);
          const oldPositionProofResult = await lightRpc.getCompressedAccountProof(accountHashBn);

          if (!oldPositionProofResult) {
            throw new Error("Failed to get merkle proof for position commitment");
          }

          logInfo(`Position leaf index: ${oldPositionProofResult.leafIndex}`);
          logInfo(`Position root index: ${oldPositionProofResult.rootIndex ?? 0}`);

          // Extract tree info from proof
          let changeSpendTreePubkey: PublicKey;
          let changeSpendQueuePubkey: PublicKey;
          if (oldPositionProofResult.treeInfo) {
            changeSpendTreePubkey = new PublicKey(oldPositionProofResult.treeInfo.tree);
            changeSpendQueuePubkey = new PublicKey(oldPositionProofResult.treeInfo.queue);
            logInfo(`  Tree from proof: ${changeSpendTreePubkey.toBase58()}`);
          } else {
            // Fallback to current address tree
            changeSpendTreePubkey = addressTreeInfo.tree;
            changeSpendQueuePubkey = addressTreeInfo.queue;
            logInfo(`  Using default tree: ${changeSpendTreePubkey.toBase58()}`);
          }

          // Build Light Protocol accounts for Phase 1
          const changeSpendSystemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
          const changeSpendPackedAccounts = PackedAccounts.newWithSystemAccountsV2(changeSpendSystemConfig);
          const changeSpendTreeIndex = changeSpendPackedAccounts.insertOrGet(changeSpendTreePubkey);
          const changeSpendQueueIndex = changeSpendPackedAccounts.insertOrGet(changeSpendQueuePubkey);

          // Build light params for verify_vote_commitment_exists
          const phase1ChangeSpendLightParams = {
            commitmentAccountHash: Array.from(accountHashBytes),
            commitmentMerkleContext: {
              merkleTreePubkeyIndex: changeSpendTreeIndex,
              queuePubkeyIndex: changeSpendQueueIndex,
              leafIndex: oldPositionProofResult.leafIndex,
              rootIndex: oldPositionProofResult.rootIndex ?? 0,
            },
            commitmentInclusionProof: {
              a: Array(32).fill(0),
              b: Array(64).fill(0),
              c: Array(32).fill(0),
            },
            commitmentAddressTreeInfo: {
              addressMerkleTreePubkeyIndex: changeSpendTreeIndex,
              addressQueuePubkeyIndex: changeSpendQueueIndex,
              rootIndex: oldPositionProofResult.rootIndex ?? 0,
            },
          };

          const { remainingAccounts: changeSpendPhase1Accounts } = changeSpendPackedAccounts.toAccountMetas();
          const phase1ChangeSpendRemainingAccounts = changeSpendPhase1Accounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          const phase1ChangeSpendTx = await program.methods
            .verifyVoteCommitmentExists(
              Array.from(operationIdChangeSpend),
              Array.from(ballotIdChangeSpend),
              0, // commitment_index
              phase1ChangeSpendLightParams
            )
            .accounts({
              ballot: ballotPdaChangeSpend,
              pendingOperation: pendingOpPdaChangeSpend,
              relayer: wallet.publicKey,
            })
            .remainingAccounts(phase1ChangeSpendRemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Verified old position exists (Phase 1)", phase1ChangeSpendTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 2: Create old position nullifier
          // ============================================
          logInfo("Phase 2: Creating old position nullifier...");

          // Derive nullifier address for voting (uses "action_nullifier" seed)
          const changeSpendNullifierSeeds = [
            Buffer.from("action_nullifier"),
            Buffer.from(ballotIdChangeSpend),
            oldPositionNullifierBytes,
          ];
          const changeSpendNullifierAddressSeed = deriveAddressSeedV2(changeSpendNullifierSeeds);
          const changeSpendNullifierAddress = deriveAddressV2(changeSpendNullifierAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
          logInfo(`Position nullifier address: ${changeSpendNullifierAddress.toBase58().slice(0, 16)}...`);

          // Get validity proof for non-inclusion
          const changeSpendNullifierProof = await lightRpc.getValidityProofV0(
            [],
            [{
              address: bn(changeSpendNullifierAddress.toBytes()),
              tree: addressTreeInfo.tree,
              queue: addressTreeInfo.queue,
            }]
          );

          // Build accounts for nullifier creation
          const phase2ChangeSpendPackedAccounts = PackedAccounts.newWithSystemAccountsV2(changeSpendSystemConfig);
          const phase2ChangeSpendOutputTreeIndex = phase2ChangeSpendPackedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
          const phase2ChangeSpendAddressTreeIndex = phase2ChangeSpendPackedAccounts.insertOrGet(addressTreeInfo.tree);

          if (!changeSpendNullifierProof.compressedProof) {
            throw new Error("No validity proof for position nullifier");
          }

          const phase2ChangeSpendLightParams = {
            proof: {
              a: Array.from(changeSpendNullifierProof.compressedProof.a),
              b: Array.from(changeSpendNullifierProof.compressedProof.b),
              c: Array.from(changeSpendNullifierProof.compressedProof.c),
            },
            addressTreeInfo: {
              addressMerkleTreePubkeyIndex: phase2ChangeSpendAddressTreeIndex,
              addressQueuePubkeyIndex: phase2ChangeSpendAddressTreeIndex,
              rootIndex: changeSpendNullifierProof.rootIndices[0] ?? 0,
            },
            outputTreeIndex: phase2ChangeSpendOutputTreeIndex,
          };

          const { remainingAccounts: phase2ChangeSpendRawAccounts } = phase2ChangeSpendPackedAccounts.toAccountMetas();
          const phase2ChangeSpendRemainingAccounts = phase2ChangeSpendRawAccounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          const phase2ChangeSpendTx = await program.methods
            .createNullifierAndPending(
              Array.from(operationIdChangeSpend),
              0, // nullifier_index
              phase2ChangeSpendLightParams
            )
            .accounts({
              pool: poolPdaChangeSpend,
              pendingOperation: pendingOpPdaChangeSpend,
              relayer: wallet.publicKey,
            })
            .remainingAccounts(phase2ChangeSpendRemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Created old position nullifier (Phase 2)", phase2ChangeSpendTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 3: Execute change_vote_spend (update tally)
          // ============================================
          logInfo("Phase 3: Executing change_vote_spend (updating tally)...");

          const phase3ChangeSpendTx = await program.methods
            .executeChangeVoteSpend(Array.from(operationIdChangeSpend))
            .accounts({
              ballot: ballotPdaChangeSpend,
              pendingOperation: pendingOpPdaChangeSpend,
              relayer: wallet.publicKey,
            })
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Executed change_vote_spend (Phase 3)", phase3ChangeSpendTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 4: Create new position commitment
          // ============================================
          logInfo("Phase 4: Creating new position commitment...");

          // Derive new position commitment address
          const newPositionSeeds = [
            Buffer.from("vote_commitment"),
            Buffer.from(ballotIdChangeSpend),
            newPositionCommitmentBytes,
          ];
          const newPositionAddressSeed = deriveAddressSeedV2(newPositionSeeds);
          const newPositionAddress = deriveAddressV2(newPositionAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
          logInfo(`New position commitment address: ${newPositionAddress.toBase58().slice(0, 16)}...`);

          // Get validity proof for new commitment
          const newPositionProof = await lightRpc.getValidityProofV0(
            [],
            [{
              address: bn(newPositionAddress.toBytes()),
              tree: addressTreeInfo.tree,
              queue: addressTreeInfo.queue,
            }]
          );

          // Build accounts
          const phase4ChangeSpendPackedAccounts = PackedAccounts.newWithSystemAccountsV2(changeSpendSystemConfig);
          const phase4ChangeSpendOutputTreeIndex = phase4ChangeSpendPackedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
          const phase4ChangeSpendAddressTreeIndex = phase4ChangeSpendPackedAccounts.insertOrGet(addressTreeInfo.tree);

          if (!newPositionProof.compressedProof) {
            throw new Error("No validity proof for new position commitment");
          }

          const phase4ChangeSpendLightParams = {
            validityProof: {
              a: Array.from(newPositionProof.compressedProof.a),
              b: Array.from(newPositionProof.compressedProof.b),
              c: Array.from(newPositionProof.compressedProof.c),
            },
            addressTreeInfo: {
              addressMerkleTreePubkeyIndex: phase4ChangeSpendAddressTreeIndex,
              addressQueuePubkeyIndex: phase4ChangeSpendAddressTreeIndex,
              rootIndex: newPositionProof.rootIndices[0] ?? 0,
            },
            outputTreeIndex: phase4ChangeSpendOutputTreeIndex,
          };

          const { remainingAccounts: phase4ChangeSpendRawAccounts } = phase4ChangeSpendPackedAccounts.toAccountMetas();
          const phase4ChangeSpendRemainingAccounts = phase4ChangeSpendRawAccounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          // Create encrypted preimage for claim recovery
          const changeSpendEncryptedPreimage = new Array(128).fill(0);
          const changeSpendEncryptionType = 0; // 0 = user_key

          const phase4ChangeSpendTx = await program.methods
            .createVoteCommitment(
              Array.from(operationIdChangeSpend),
              Array.from(ballotIdChangeSpend),
              0, // commitment_index
              changeSpendEncryptedPreimage,
              changeSpendEncryptionType,
              phase4ChangeSpendLightParams
            )
            .accounts({
              ballot: ballotPdaChangeSpend,
              pendingOperation: pendingOpPdaChangeSpend,
              relayer: wallet.publicKey,
            })
            .remainingAccounts(phase4ChangeSpendRemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Created new position commitment (Phase 4)", phase4ChangeSpendTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 5: Close pending operation
          // ============================================
          logInfo("Phase 5: Closing pending operation...");

          const phase5ChangeSpendTx = await program.methods
            .closePendingOperation(Array.from(operationIdChangeSpend))
            .accounts({
              pendingOperation: pendingOpPdaChangeSpend,
              relayer: wallet.publicKey,
              payer: wallet.publicKey,
            })
            .rpc();

          logPass("Closed pending operation (Phase 5)", phase5ChangeSpendTx.slice(0, 16) + "...");
          passCount++;

          logPass("FULL CHANGE_VOTE_SPEND FLOW COMPLETE", "All 6 phases executed successfully!");

          // Wait for indexer and query for accountHash
          logInfo("Waiting 5 seconds for Light Protocol indexer...");
          await sleep(5000);

          let newPositionAccountHash: string | null = null;
          try {
            const newPosAccountResponse = await fetch(RPC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getCompressedAccount',
                params: {
                  address: newPositionAddress.toBase58(),
                },
              }),
            });
            const newPosAccountResult = await newPosAccountResponse.json() as any;
            if (newPosAccountResult.result?.value?.hash) {
              newPositionAccountHash = newPosAccountResult.result.value.hash;
              logInfo(`New position accountHash: ${newPositionAccountHash?.slice(0, 20)}...`);
            }
          } catch (queryErr: any) {
            logInfo(`Note: Could not query new position accountHash: ${queryErr.message?.slice(0, 50)}`);
          }

          // Save new position data for close_position test
          test4dChangeVoteSpendData = {
            ballotId: ballotIdChangeSpend,
            ballotPda: ballotPdaChangeSpend,
            vaultPda: vaultPdaChangeSpend,
            stealthSpendingKey: stealthSpendingKey,
            stealthPubXBigInt: changePubkeyBigInt,
            positionCommitmentBigInt: newPositionCommitmentBigInt,
            positionCommitmentBytes: newPositionCommitmentBytes,
            positionRandomnessBigInt: newPositionRandomnessBigInt,
            voteChoice: newVoteChoice,
            amount: positionAmount,
            weight: positionWeight,
            tokenMintBigInt,
            positionAccountHash: newPositionAccountHash,
            positionAddress: newPositionAddress.toBase58(),
          };
          logInfo("Saved new position data for close_position test");

        } catch (changeSpendErr: any) {
          const errMsg = changeSpendErr.logs?.slice(-5).join('\n      ') || changeSpendErr.message || "";
          logFail("change_vote_spend on-chain", errMsg.slice(0, 100));
          if (changeSpendErr.logs) {
            console.log("      Full logs:");
            changeSpendErr.logs.slice(-10).forEach((log: string) => console.log("        ", log));
          }
          failCount++;
        }
      }
    } catch (err: any) {
      logFail("Change Vote SpendToVote", err.message?.slice(0, 100) || "Error");
      failCount++;
    }
    }
  }

  // =========================================================================
  // TEST 4e: CLOSE VOTE POSITION (Cancel Vote / Exit Early) - Uses REAL position
  // =========================================================================
  logSection("TEST 4e: CLOSE VOTE POSITION");

  const closePositionVkCircuitId = Buffer.from('close_position__________________'); // 32 bytes
  const [closePositionVkPda] = PublicKey.findProgramAddressSync([Buffer.from("vk"), closePositionVkCircuitId], PROGRAM_ID);
  const closePositionVkAccount = await connection.getAccountInfo(closePositionVkPda);

  if (!closePositionVkAccount) {
    logSkip("Close Vote Position", "close_position VK not registered");
    skipCount++;
  } else if (!test4dChangeVoteSpendData) {
    logSkip("Close Vote Position", "No position data from change_vote_spend - run Test 4d first");
    skipCount++;
  } else {
    try {
      logInfo("Using REAL position data from change_vote_spend test...");

      const poseidon = await buildPoseidon();

      // Extract data from the REAL position created in change_vote_spend
      const {
        ballotId: ballotIdClose,
        ballotPda: ballotPdaClose,
        vaultPda: vaultPdaClose,
        stealthSpendingKey: closeStealthSpendingKey,
        stealthPubXBigInt: closePubkeyBigInt,
        positionCommitmentBigInt: closePositionCommitmentBigInt,
        positionCommitmentBytes: closePositionCommitmentBytesRaw,
        positionRandomnessBigInt: closePositionRandomnessBigInt,
        voteChoice: closeVoteChoice,
        amount: closeAmount,
        weight: closeWeight,
        tokenMintBigInt: closeTokenMintBigInt,
      } = test4dChangeVoteSpendData;

      logInfo(`Using position from ballot: ${ballotPdaClose.toBase58().slice(0, 16)}...`);
      logInfo(`Position commitment: ${closePositionCommitmentBigInt.toString().slice(0, 20)}...`);

      // Derive nullifier key from the REAL stealth spending key
      const closeSpendingKeyBytes = fieldToBytes(closeStealthSpendingKey);
      const closeNk = deriveNullifierKey(closeSpendingKeyBytes);
      const closeNkBigInt = bytesToField(closeNk);

      // Compute position nullifier using REAL data
      const closePositionNullifier = poseidon([
        poseidon.F.e(BigInt(0x13)), // POSITION_DOMAIN
        poseidon.F.e(closeNkBigInt),
        poseidon.F.e(closePositionCommitmentBigInt),
      ]);
      const closePositionNullifierBigInt = poseidon.F.toObject(closePositionNullifier);

      // Compute NEW token commitment (fresh, different randomness)
      const newTokenRandomness = generateRandomness();
      const newTokenRandomnessBigInt = bytesToField(newTokenRandomness);

      const newTokenCommitment = poseidon([
        poseidon.F.e(BigInt(1)), // COMMITMENT_DOMAIN
        poseidon.F.e(closePubkeyBigInt),
        poseidon.F.e(closeTokenMintBigInt),
        poseidon.F.e(closeAmount), // Same amount
        poseidon.F.e(newTokenRandomnessBigInt),
      ]);
      const newTokenCommitmentBigInt = poseidon.F.toObject(newTokenCommitment);

      logInfo(`Closing position: ${closeAmount} tokens (vote choice: ${closeVoteChoice})`);

      // Build circuit inputs for close_position
      const closePositionInputs: Record<string, string> = {
        // Public inputs
        ballot_id: bytesToField(ballotIdClose).toString(),
        position_commitment: closePositionCommitmentBigInt.toString(),
        position_nullifier: closePositionNullifierBigInt.toString(),
        token_commitment: newTokenCommitmentBigInt.toString(),
        amount: closeAmount.toString(),
        weight: closeWeight.toString(),
        token_mint: closeTokenMintBigInt.toString(),
        vote_choice: closeVoteChoice.toString(),
        is_public_mode: "1",

        // Private inputs
        spending_key: closeStealthSpendingKey.toString(),
        pubkey: closePubkeyBigInt.toString(),
        position_randomness: closePositionRandomnessBigInt.toString(),
        private_vote_choice: closeVoteChoice.toString(),
        token_randomness: newTokenRandomnessBigInt.toString(),
      };

      // Load circuit artifacts
      const closePositionCircuitDir = path.join(__dirname, "..", "circom-circuits", "build", "voting");
      const closePositionWasmPath = path.join(closePositionCircuitDir, "close_position_js", "close_position.wasm");
      const closePositionZkeyPath = path.join(closePositionCircuitDir, "close_position_final.zkey");

      if (!fs.existsSync(closePositionWasmPath) || !fs.existsSync(closePositionZkeyPath)) {
        logSkip("Close Vote Position", "Circuit artifacts not found");
        skipCount++;
      } else {
        const closePositionArtifacts = await loadCircomArtifacts("close_position", closePositionWasmPath, closePositionZkeyPath);
        const closePositionProofBytes = await generateSnarkjsProof(closePositionArtifacts, closePositionInputs);

        logPass("Generated close_position proof", `${closePositionProofBytes.length} bytes`);
        passCount++;

        // Submit close_position Phase 0 on-chain
        logInfo("Submitting close_position on-chain...");

        const operationIdClose = generateVotingOperationId();
        const closePositionCommitmentBytes = fieldToBytes(closePositionCommitmentBigInt);
        const closePositionNullifierBytes = fieldToBytes(closePositionNullifierBigInt);
        const newTokenCommitmentBytes = fieldToBytes(newTokenCommitmentBigInt);
        const outputRandomnessClose = generateRandomness();

        // Get pool PDA
        const [poolPdaClose] = PublicKey.findProgramAddressSync(
          [Buffer.from("pool"), tokenMint.toBytes()],
          PROGRAM_ID
        );

        try {
          const [pendingOpPdaClose] = deriveVotingPendingOperationPda(operationIdClose, PROGRAM_ID);

          const phase0CloseTx = await program.methods
            .createPendingWithProofCloseVotePosition(
              Array.from(operationIdClose),
              Array.from(ballotIdClose),
              Buffer.from(closePositionProofBytes),
              Array.from(closePositionCommitmentBytes),
              Array.from(closePositionNullifierBytes),
              Array.from(newTokenCommitmentBytes),
              new BN(closeVoteChoice),
              new BN(closeAmount.toString()),
              new BN(closeWeight.toString()),
              null, // encrypted_contributions (public mode)
              Array.from(outputRandomnessClose)
            )
            .accounts({
              ballot: ballotPdaClose,
              verificationKey: closePositionVkPda,
              pendingOperation: pendingOpPdaClose,
              relayer: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Submitted close_position Phase 0 (proof verified)", phase0CloseTx.slice(0, 16) + "...");
          passCount++;

          // Verify PendingOperation
          const pendingOpClose = await (program.account as any).pendingOperation.fetch(pendingOpPdaClose);
          logInfo(`PendingOp proof_verified: ${pendingOpClose.proofVerified}`);
          logInfo(`Operation type: close_vote_position`);

          // ============================================
          // PHASE 1: Verify position commitment exists
          // ============================================
          logInfo("Phase 1: Verifying position commitment exists in Light Protocol...");

          // Get merkle proof for the position commitment from Light Protocol
          const { LightProtocol: LightProtocolClose } = await import("../packages/sdk/src/instructions/light-helpers");
          const lightProtocolClose = new LightProtocolClose(RPC_URL, PROGRAM_ID);

          // Look up the position commitment in Light Protocol
          const positionCommitmentBn = bn(closePositionCommitmentBytes);
          const positionProofResult = await lightProtocolClose.rpc.getCompressedAccountProof(positionCommitmentBn);

          if (!positionProofResult || !positionProofResult.merkleProof) {
            throw new Error("Position commitment not found in Light Protocol - change_vote_spend may have failed");
          }

          const positionMerkleRoot = BigInt(positionProofResult.root.toString());
          const positionMerklePath = positionProofResult.merkleProof.map((p: any) => BigInt(p.toString()));
          // Compute merkle path indices from leaf index
          const positionMerklePathIndices: number[] = [];
          for (let i = 0; i < positionMerklePath.length; i++) {
            positionMerklePathIndices.push((positionProofResult.leafIndex >> i) & 1);
          }

          logInfo(`Position merkle root: ${positionMerkleRoot.toString().slice(0, 20)}...`);

          // Build Light Protocol accounts for Phase 1 (verify exists)
          // Get validity proof for commitment verification
          const phase1CloseProof = await lightRpc.getValidityProofV0(
            [],
            [{
              address: positionCommitmentBn,
              tree: addressTreeInfo.tree,
              queue: addressTreeInfo.queue,
            }]
          );

          const phase1CloseSystemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
          const phase1ClosePackedAccounts = PackedAccounts.newWithSystemAccountsV2(phase1CloseSystemConfig);
          const phase1CloseOutputTreeIndex = phase1ClosePackedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
          const phase1CloseAddressTreeIndex = phase1ClosePackedAccounts.insertOrGet(addressTreeInfo.tree);

          if (!phase1CloseProof.compressedProof) {
            throw new Error("No validity proof returned from Light Protocol for Phase 1 close");
          }
          const phase1CloseLightParams = {
            validityProof: {
              a: Array.from(phase1CloseProof.compressedProof.a),
              b: Array.from(phase1CloseProof.compressedProof.b),
              c: Array.from(phase1CloseProof.compressedProof.c),
            },
            addressTreeInfo: {
              addressMerkleTreePubkeyIndex: phase1CloseAddressTreeIndex,
              addressQueuePubkeyIndex: phase1CloseAddressTreeIndex,
              rootIndex: phase1CloseProof.rootIndices[0] ?? 0,
            },
            outputTreeIndex: phase1CloseOutputTreeIndex,
          };

          const { remainingAccounts: phase1CloseRawAccounts } = phase1ClosePackedAccounts.toAccountMetas();
          const phase1CloseRemainingAccounts = phase1CloseRawAccounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          const phase1CloseTx = await program.methods
            .verifyVoteCommitmentExists(
              Array.from(operationIdClose),
              Array.from(closePositionCommitmentBytes),
              positionMerkleRoot.toString(),
              positionMerklePath.map((p: bigint) => p.toString()),
              positionMerklePathIndices,
              phase1CloseLightParams
            )
            .accounts({
              pendingOperation: pendingOpPdaClose,
              relayer: wallet.publicKey,
            })
            .remainingAccounts(phase1CloseRemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Verified position exists (Phase 1)", phase1CloseTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 2: Create position nullifier
          // ============================================
          logInfo("Phase 2: Creating position nullifier...");

          // Derive nullifier address
          const phase2CloseNullifierSeeds = [
            Buffer.from("nullifier"),
            Buffer.from(closePositionNullifierBytes),
          ];
          const phase2CloseNullifierAddressSeed = deriveAddressSeedV2(phase2CloseNullifierSeeds);
          const phase2CloseNullifierAddress = deriveAddressV2(phase2CloseNullifierAddressSeed, addressTreeInfo.tree, PROGRAM_ID);

          // Get validity proof for nullifier creation
          const phase2CloseProof = await lightRpc.getValidityProofV0(
            [],
            [{
              address: bn(phase2CloseNullifierAddress.toBytes()),
              tree: addressTreeInfo.tree,
              queue: addressTreeInfo.queue,
            }]
          );

          const phase2CloseSystemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
          const phase2ClosePackedAccounts = PackedAccounts.newWithSystemAccountsV2(phase2CloseSystemConfig);
          const phase2CloseOutputTreeIndex = phase2ClosePackedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
          const phase2CloseAddressTreeIndex = phase2ClosePackedAccounts.insertOrGet(addressTreeInfo.tree);

          if (!phase2CloseProof.compressedProof) {
            throw new Error("No validity proof returned from Light Protocol for Phase 2 close");
          }
          const phase2CloseLightParams = {
            validityProof: {
              a: Array.from(phase2CloseProof.compressedProof.a),
              b: Array.from(phase2CloseProof.compressedProof.b),
              c: Array.from(phase2CloseProof.compressedProof.c),
            },
            addressTreeInfo: {
              addressMerkleTreePubkeyIndex: phase2CloseAddressTreeIndex,
              addressQueuePubkeyIndex: phase2CloseAddressTreeIndex,
              rootIndex: phase2CloseProof.rootIndices[0] ?? 0,
            },
            outputTreeIndex: phase2CloseOutputTreeIndex,
          };

          const { remainingAccounts: phase2CloseRawAccounts } = phase2ClosePackedAccounts.toAccountMetas();
          const phase2CloseRemainingAccounts = phase2CloseRawAccounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          const phase2CloseTx = await program.methods
            .createNullifierAndPending(
              Array.from(operationIdClose),
              Array.from(closePositionNullifierBytes),
              phase2CloseLightParams
            )
            .accounts({
              pendingOperation: pendingOpPdaClose,
              relayer: wallet.publicKey,
              payer: wallet.publicKey,
              systemProgram: SystemProgram.programId,
            })
            .remainingAccounts(phase2CloseRemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Created position nullifier (Phase 2)", phase2CloseTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 3: Execute close_vote_position (update tally)
          // ============================================
          logInfo("Phase 3: Executing close_vote_position (decrementing tally)...");

          const phase3CloseTx = await program.methods
            .executeCloseVotePosition(Array.from(operationIdClose))
            .accounts({
              ballot: ballotPdaClose,
              pendingOperation: pendingOpPdaClose,
              relayer: wallet.publicKey,
            })
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Executed close_vote_position (Phase 3)", phase3CloseTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 4: Create NEW token commitment
          // ============================================
          logInfo("Phase 4: Creating NEW token commitment...");

          // Derive commitment address
          const phase4CloseCommitmentSeeds = [
            Buffer.from("commitment"),
            Buffer.from(newTokenCommitmentBytes),
          ];
          const phase4CloseCommitmentAddressSeed = deriveAddressSeedV2(phase4CloseCommitmentSeeds);
          const phase4CloseCommitmentAddress = deriveAddressV2(phase4CloseCommitmentAddressSeed, addressTreeInfo.tree, PROGRAM_ID);

          // Get validity proof for commitment creation
          const phase4CloseProof = await lightRpc.getValidityProofV0(
            [],
            [{
              address: bn(phase4CloseCommitmentAddress.toBytes()),
              tree: addressTreeInfo.tree,
              queue: addressTreeInfo.queue,
            }]
          );

          const phase4CloseSystemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
          const phase4ClosePackedAccounts = PackedAccounts.newWithSystemAccountsV2(phase4CloseSystemConfig);
          const phase4CloseOutputTreeIndex = phase4ClosePackedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
          const phase4CloseAddressTreeIndex = phase4ClosePackedAccounts.insertOrGet(addressTreeInfo.tree);

          if (!phase4CloseProof.compressedProof) {
            throw new Error("No validity proof returned from Light Protocol for Phase 4 close");
          }
          const phase4CloseLightParams = {
            validityProof: {
              a: Array.from(phase4CloseProof.compressedProof.a),
              b: Array.from(phase4CloseProof.compressedProof.b),
              c: Array.from(phase4CloseProof.compressedProof.c),
            },
            addressTreeInfo: {
              addressMerkleTreePubkeyIndex: phase4CloseAddressTreeIndex,
              addressQueuePubkeyIndex: phase4CloseAddressTreeIndex,
              rootIndex: phase4CloseProof.rootIndices[0] ?? 0,
            },
            outputTreeIndex: phase4CloseOutputTreeIndex,
          };

          const { remainingAccounts: phase4CloseRawAccounts } = phase4ClosePackedAccounts.toAccountMetas();
          const phase4CloseRemainingAccounts = phase4CloseRawAccounts.map((acc: any) => ({
            pubkey: acc.pubkey,
            isWritable: Boolean(acc.isWritable),
            isSigner: Boolean(acc.isSigner),
          }));

          const phase4CloseTx = await program.methods
            .createVoteCommitment(
              Array.from(operationIdClose),
              Array.from(newTokenCommitmentBytes),
              phase4CloseLightParams
            )
            .accounts({
              ballot: ballotPdaClose,
              pendingOperation: pendingOpPdaClose,
              relayer: wallet.publicKey,
            })
            .remainingAccounts(phase4CloseRemainingAccounts)
            .preInstructions([
              ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
              ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1000 }),
            ])
            .rpc();

          logPass("Created NEW token commitment (Phase 4)", phase4CloseTx.slice(0, 16) + "...");
          passCount++;

          // ============================================
          // PHASE 5: Close pending operation
          // ============================================
          logInfo("Phase 5: Closing pending operation...");

          const phase5CloseTx = await program.methods
            .closePendingOperation(Array.from(operationIdClose))
            .accounts({
              pendingOperation: pendingOpPdaClose,
              relayer: wallet.publicKey,
              payer: wallet.publicKey,
            })
            .rpc();

          logPass("Closed pending operation (Phase 5)", phase5CloseTx.slice(0, 16) + "...");
          passCount++;

          logPass("FULL CLOSE_POSITION FLOW COMPLETE", "All 6 phases executed successfully!");

        } catch (closeErr: any) {
          const errMsg = closeErr.logs?.slice(-5).join('\n      ') || closeErr.message || "";
          logFail("close_position on-chain", errMsg.slice(0, 100));
          if (closeErr.logs) {
            console.log("      Full logs:");
            closeErr.logs.slice(-10).forEach((log: string) => console.log("        ", log));
          }
          failCount++;
        }
      }
    } catch (err: any) {
      logFail("Close Vote Position", err.message?.slice(0, 100) || "Error");
      failCount++;
    }
  }

  // =========================================================================
  // TEST 5: Wait for Voting Period to End & Resolve Public Ballot
  // =========================================================================
  logSection("TEST 5: RESOLVE BALLOT (TALLYBASED)");

  // Note: Ballot 1 has 2-minute voting period for proof generation
  // This test may skip if voting period hasn't ended yet

  try {
    // First check ballot status
    const ballotAccount = await (program.account as any).ballot.fetch(ballotPda1);
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = ballotAccount.endTime.toNumber();

    if (currentTime < endTime) {
      logSkip("Resolve ballot", `Voting not ended (${endTime - currentTime}s remaining)`);
      skipCount++;
    } else {
      const ix = await buildResolveBallotInstruction(
        program,
        ballotId1,
        null, // TallyBased - let it pick winner from tally
        wallet.publicKey, // authority
        undefined, // resolver (not needed for TallyBased)
        PROGRAM_ID
      );

      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
        ix
      );

      const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
      logPass("Resolved Public ballot (TallyBased)", sig.slice(0, 16) + "...");
      passCount++;

      // Verify resolved state
      const resolvedBallot = await (program.account as any).ballot.fetch(ballotPda1);
      logInfo(`Status: ${Object.keys(resolvedBallot.status)[0]}`);
      logInfo(`Outcome: ${resolvedBallot.outcome !== null ? resolvedBallot.outcome : "null (no votes)"}`);
    }
  } catch (err: any) {
    // Check if it's an expected error
    const errMsg = err.logs?.slice(-1)[0] || err.message || "";
    if (errMsg.includes("BallotNotActive") || errMsg.includes("VotingPeriodNotEnded")) {
      logSkip("Resolve ballot", "Voting period not ended yet");
      skipCount++;
    } else {
      logFail("Resolve ballot", errMsg.slice(0, 80));
      failCount++;
    }
  }

  // =========================================================================
  // TEST 6: Resolve SpendToVote Ballot (Oracle Mode)
  // =========================================================================
  logSection("TEST 6: RESOLVE BALLOT (ORACLE)");

  try {
    const ballotAccount = await (program.account as any).ballot.fetch(ballotPda2);
    const currentTime = Math.floor(Date.now() / 1000);
    const endTime = ballotAccount.endTime.toNumber();

    if (currentTime < endTime) {
      logSkip("Resolve SpendToVote", `Voting not ended (${endTime - currentTime}s remaining)`);
      skipCount++;
    } else {
      // Oracle resolution - we are the oracle, so we can set outcome
      const ix = await buildResolveBallotInstruction(
        program,
        ballotId2,
        0, // Oracle sets outcome to option 0
        wallet.publicKey, // authority
        undefined, // resolver (Oracle uses oracle field, not resolver)
        PROGRAM_ID
      );

      const tx = new Transaction().add(
        ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
        ix
      );

      const sig = await sendAndConfirmTransaction(connection, tx, [wallet]);
      logPass("Resolved SpendToVote ballot (Oracle)", sig.slice(0, 16) + "...");
      passCount++;

      // Verify resolved state
      const resolvedBallot = await (program.account as any).ballot.fetch(ballotPda2);
      logInfo(`Status: ${Object.keys(resolvedBallot.status)[0]}`);
      logInfo(`Outcome: ${resolvedBallot.outcome}`);
    }
  } catch (err: any) {
    const errMsg = err.logs?.slice(-1)[0] || err.message || "";
    if (errMsg.includes("BallotNotActive") || errMsg.includes("VotingPeriodNotEnded")) {
      logSkip("Resolve SpendToVote", "Voting period not ended yet");
      skipCount++;
    } else {
      logFail("Resolve SpendToVote", errMsg.slice(0, 80));
      failCount++;
    }
  }

  // =========================================================================
  // TEST 7: Create Authority Resolution Ballot & Resolve
  // =========================================================================
  logSection("TEST 7: CREATE & RESOLVE (AUTHORITY MODE)");

  const ballotId3 = generateBallotId();
  const [ballotPda3] = deriveBallotPda(ballotId3, PROGRAM_ID);

  try {
    const now = Math.floor(Date.now() / 1000);
    const currentSlot = await connection.getSlot();

    // Create ballot with immediate end time
    const createIx = await buildCreateBallotInstruction(
      program,
      {
        ballotId: ballotId3,
        bindingMode: { snapshot: {} },
        revealMode: { public: {} },
        voteType: { single: {} },
        resolutionMode: { authority: {} },
        numOptions: 3,
        quorumThreshold: 0n,
        protocolFeeBps: 0,
        protocolTreasury: wallet.publicKey,
        startTime: now - 10,
        endTime: now - 5, // Already ended
        snapshotSlot: currentSlot - 10,
        indexerPubkey: wallet.publicKey,
        eligibilityRoot: null,
        weightFormula: [0],
        weightParams: [],
        timeLockPubkey: new Uint8Array(32),
        unlockSlot: 0,
        resolver: wallet.publicKey, // We are the resolver
        oracle: null,
        claimDeadline: 0,
      },
      tokenMint,
      wallet.publicKey,
      wallet.publicKey,
      PROGRAM_ID
    );

    const createTx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      createIx
    );

    const createSig = await sendAndConfirmTransaction(connection, createTx, [wallet]);
    logPass("Created Authority ballot", createSig.slice(0, 16) + "...");
    passCount++;

    // Immediately resolve as authority
    const resolveIx = await buildResolveBallotInstruction(
      program,
      ballotId3,
      2, // Authority picks option 2
      wallet.publicKey, // authority
      wallet.publicKey, // resolver (same as authority for this test)
      PROGRAM_ID
    );

    const resolveTx = new Transaction().add(
      ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
      resolveIx
    );

    const resolveSig = await sendAndConfirmTransaction(connection, resolveTx, [wallet]);
    logPass("Resolved Authority ballot", resolveSig.slice(0, 16) + "...");
    passCount++;

    // Verify
    const resolvedBallot = await (program.account as any).ballot.fetch(ballotPda3);
    logInfo(`Outcome: ${resolvedBallot.outcome} (Authority chose option 2)`);
    logInfo(`Status: ${Object.keys(resolvedBallot.status)[0]}`);
  } catch (err: any) {
    logFail("Authority ballot", err.logs?.slice(-1)[0] || err.message?.slice(0, 80) || "Error");
    failCount++;
  }

  // =========================================================================
  // TEST 8: Verify Ballot States
  // =========================================================================
  logSection("TEST 8: VERIFY ALL BALLOT STATES");

  const ballots = [
    { id: ballotId1, pda: ballotPda1, name: "Public/Snapshot" },
    { id: ballotId2, pda: ballotPda2, name: "SpendToVote" },
    { id: ballotId3, pda: ballotPda3, name: "Authority" },
  ];

  for (const ballot of ballots) {
    try {
      const account = await (program.account as any).ballot.fetch(ballot.pda);
      const status = Object.keys(account.status)[0];
      const bindingMode = Object.keys(account.bindingMode)[0];
      const revealMode = Object.keys(account.revealMode)[0];
      const voteType = Object.keys(account.voteType)[0];
      const resMode = Object.keys(account.resolutionMode)[0];

      logPass(ballot.name, `${status} | ${bindingMode}/${revealMode}/${voteType}/${resMode}`);
      passCount++;
    } catch (err: any) {
      logFail(ballot.name, err.message?.slice(0, 40) || "Error");
      failCount++;
    }
  }

  // =========================================================================
  // Summary
  // =========================================================================
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║                     TEST SUMMARY                           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log(`\n  Total: ${passCount + failCount + skipCount} | Passed: ${passCount} | Failed: ${failCount} | Skipped: ${skipCount}`);

  if (failCount > 0) {
    console.log("\n  ❌ Some tests failed");
    process.exit(1);
  } else {
    console.log("\n  ✅ All executed tests passed!");
    process.exit(0);
  }
}

// Run
main().catch(err => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});
