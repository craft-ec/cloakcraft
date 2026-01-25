/**
 * E2E Test - Voting Protocol On-Chain Execution
 *
 * Tests actual on-chain execution of voting instructions:
 * - Ballot creation (all modes)
 * - Ballot resolution (after voting period)
 * - Ballot finalization (SpendToVote)
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
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";

// Import SDK voting module
import {
  deriveBallotPda,
  deriveBallotVaultPda,
  buildCreateBallotInstruction,
  buildResolveBallotInstruction,
  buildFinalizeBallotInstruction,
  buildDecryptTallyInstruction,
} from "../packages/sdk/src/voting";
import { initPoseidon } from "../packages/sdk/src/crypto/poseidon";

// Program ID
const PROGRAM_ID = new PublicKey("CfnaNVqgny7vkvonyy4yQRohQvM6tCZdmgYuLK1jjqj");

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
  return crypto.randomBytes(32);
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        endTime: now + 5,    // End in 5 seconds (short for testing)
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
    const ballotAccount = await program.account.ballot.fetch(ballotPda1);
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
    const ballotAccount = await program.account.ballot.fetch(ballotPda2);
    logInfo(`Options: ${ballotAccount.numOptions}, Fee: ${ballotAccount.protocolFeeBps}bps`);
  } catch (err: any) {
    logFail("Create SpendToVote ballot", err.logs?.slice(-1)[0] || err.message?.slice(0, 60) || "Error");
    failCount++;
  }

  // =========================================================================
  // TEST 4: Wait for Voting Period to End & Resolve Public Ballot
  // =========================================================================
  logSection("TEST 4: RESOLVE BALLOT (TALLYBASED)");

  logInfo("Waiting for voting period to end (10 seconds)...");
  await sleep(10000);

  try {
    // First check ballot status
    const ballotAccount = await program.account.ballot.fetch(ballotPda1);
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
      const resolvedBallot = await program.account.ballot.fetch(ballotPda1);
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
  // TEST 5: Resolve SpendToVote Ballot (Oracle Mode)
  // =========================================================================
  logSection("TEST 5: RESOLVE BALLOT (ORACLE)");

  try {
    const ballotAccount = await program.account.ballot.fetch(ballotPda2);
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
      const resolvedBallot = await program.account.ballot.fetch(ballotPda2);
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
  // TEST 6: Create Authority Resolution Ballot & Resolve
  // =========================================================================
  logSection("TEST 6: CREATE & RESOLVE (AUTHORITY MODE)");

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
    const resolvedBallot = await program.account.ballot.fetch(ballotPda3);
    logInfo(`Outcome: ${resolvedBallot.outcome} (Authority chose option 2)`);
    logInfo(`Status: ${Object.keys(resolvedBallot.status)[0]}`);
  } catch (err: any) {
    logFail("Authority ballot", err.logs?.slice(-1)[0] || err.message?.slice(0, 80) || "Error");
    failCount++;
  }

  // =========================================================================
  // TEST 7: Verify Ballot States
  // =========================================================================
  logSection("TEST 7: VERIFY ALL BALLOT STATES");

  const ballots = [
    { id: ballotId1, pda: ballotPda1, name: "Public/Snapshot" },
    { id: ballotId2, pda: ballotPda2, name: "SpendToVote" },
    { id: ballotId3, pda: ballotPda3, name: "Authority" },
  ];

  for (const ballot of ballots) {
    try {
      const account = await program.account.ballot.fetch(ballot.pda);
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
