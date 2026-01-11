/**
 * End-to-End Unshield Test
 *
 * Tests the complete privacy flow:
 * 1. Shield tokens into pool
 * 2. Transact with unshield (ZK proof that spends input and withdraws partial amount)
 *
 * This proves the full cycle: deposit -> private transfer -> withdraw works.
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
import { execFileSync } from "child_process";
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
const PROGRAM_ID = new PublicKey("HsQk1VmzbDwXZnQfevgJvHAfYioFmKJKCBgfuTFKVJAu");

// V2 Batch Trees (Devnet)
const V2_OUTPUT_QUEUE = new PublicKey("oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto");

// Seeds
const SEEDS = {
  POOL: Buffer.from("pool"),
  VAULT: Buffer.from("vault"),
  VK: Buffer.from("vk"),
  COMMITMENT_COUNTER: Buffer.from("commitment_counter"),
};

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  const padded = cleanHex.padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// BN254 field modulus
const BN254_FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");

function pubkeyToFieldHex(pubkey: PublicKey): string {
  const bytes = pubkey.toBytes();
  const value = BigInt("0x" + Buffer.from(bytes).toString("hex"));
  const fieldValue = value % BN254_FIELD_MODULUS;
  return "0x" + fieldValue.toString(16).padStart(64, "0");
}

function numberToHex64(num: number | string): string {
  const val = BigInt(num);
  return "0x" + val.toString(16).padStart(64, "0");
}

async function main() {
  console.log("=== End-to-End Unshield Test ===\n");
  console.log("Flow: Shield -> Transact with Unshield -> Verify withdrawal\n");

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

  // === Step 1: Check VK ===
  console.log("Step 1: Checking verification key...");
  const circuitId = padCircuitId("transfer_1x2");
  const [vkPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VK, circuitId],
    PROGRAM_ID
  );
  const vkAccount = await connection.getAccountInfo(vkPda);
  if (!vkAccount) {
    console.error("ERROR: Verification key not registered");
    return;
  }
  console.log("VK registered\n");

  // === Step 2: Create pool and shield tokens ===
  console.log("Step 2: Creating pool and shielding tokens...");

  const tokenMint = await createMint(connection, wallet, wallet.publicKey, null, 9);
  console.log("Token mint:", tokenMint.toBase58());

  const userAta = await getOrCreateAssociatedTokenAccount(
    connection,
    wallet,
    tokenMint,
    wallet.publicKey
  );

  const INITIAL_AMOUNT = 500_000_000_000n; // 500 tokens
  const UNSHIELD_AMOUNT = 200_000_000_000n; // 200 tokens to withdraw
  const CHANGE_AMOUNT = INITIAL_AMOUNT - UNSHIELD_AMOUNT; // 300 tokens change

  await mintTo(connection, wallet, tokenMint, userAta.address, wallet, Number(INITIAL_AMOUNT));
  console.log("Minted", Number(INITIAL_AMOUNT) / 1e9, "tokens");

  const [poolPda] = PublicKey.findProgramAddressSync([SEEDS.POOL, tokenMint.toBuffer()], PROGRAM_ID);
  const [vaultPda] = PublicKey.findProgramAddressSync([SEEDS.VAULT, tokenMint.toBuffer()], PROGRAM_ID);
  const [counterPda] = PublicKey.findProgramAddressSync([SEEDS.COMMITMENT_COUNTER, poolPda.toBuffer()], PROGRAM_ID);

  // Initialize pool
  try {
    await program.methods.initializePool().accounts({
      pool: poolPda,
      tokenVault: vaultPda,
      tokenMint: tokenMint,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    }).rpc();
    console.log("Pool initialized");
  } catch (e: any) {
    if (!e.message?.includes("already in use")) throw e;
    console.log("Pool exists");
  }

  try {
    await program.methods.initializeCommitmentCounter().accounts({
      pool: poolPda,
      commitmentCounter: counterPda,
      authority: wallet.publicKey,
      payer: wallet.publicKey,
      systemProgram: SystemProgram.programId,
    }).rpc();
    console.log("Counter initialized");
  } catch (e: any) {
    if (!e.message?.includes("already in use")) throw e;
    console.log("Counter exists");
  }

  // Shield tokens
  const addressTreeInfo = getBatchAddressTreeInfo();
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

  // Generate input commitment (what we'll spend)
  const shieldRandomness = new Uint8Array(32);
  require("crypto").randomFillSync(shieldRandomness);
  const shieldStealthPubX = new Uint8Array(32);
  require("crypto").randomFillSync(shieldStealthPubX);

  // Simple commitment hash
  const crypto = require("crypto");
  const inputCommitment = new Uint8Array(
    crypto.createHash("sha256")
      .update(shieldStealthPubX)
      .update(tokenMint.toBytes())
      .update(Buffer.from(INITIAL_AMOUNT.toString()))
      .update(shieldRandomness)
      .digest()
  );

  // Derive commitment address
  const commitmentSeeds = [Buffer.from("commitment"), poolPda.toBuffer(), Buffer.from(inputCommitment)];
  const commitmentAddressSeed = deriveAddressSeedV2(commitmentSeeds);
  const commitmentAddress = deriveAddressV2(commitmentAddressSeed, addressTreeInfo.tree, PROGRAM_ID);

  // Get validity proof for shield
  const shieldProof = await lightRpc.getValidityProofV0([], [{
    address: bn(commitmentAddress.toBytes()),
    tree: addressTreeInfo.tree,
    queue: addressTreeInfo.queue,
  }]);

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

  await program.methods.shield(
    Array.from(inputCommitment),
    new anchor.BN(INITIAL_AMOUNT.toString()),
    Buffer.from(shieldRandomness),
    {
      validityProof: convertCompressedProof(shieldProof),
      addressTreeInfo: {
        addressMerkleTreePubkeyIndex: addressTreeIndex,
        addressQueuePubkeyIndex: addressTreeIndex,
        rootIndex: shieldProof.rootIndices[0] ?? 0,
      },
      outputTreeIndex: outputTreeIndex,
    }
  ).accountsStrict({
    pool: poolPda,
    commitmentCounter: counterPda,
    tokenVault: vaultPda,
    userTokenAccount: userAta.address,
    user: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  }).remainingAccounts(remainingAccounts).preInstructions([
    ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
  ]).rpc();

  console.log("Shielded", Number(INITIAL_AMOUNT) / 1e9, "tokens");

  const vaultAfterShield = await getAccount(connection, vaultPda);
  console.log("Vault balance:", Number(vaultAfterShield.amount) / 1e9, "tokens\n");

  // === Step 3: Generate ZK proof for unshield ===
  console.log("Step 3: Generating ZK proof with unshield...");

  const circuitDir = path.join(__dirname, "..", "circuits", "transfer", "1x2");
  const targetDir = path.join(__dirname, "..", "circuits", "target");
  const nargoPath = path.join(os.homedir(), ".nargo", "bin", "nargo");
  const sunspotPath = path.join(__dirname, "sunspot");

  const tokenMintHex = pubkeyToFieldHex(tokenMint);

  const privateInputs = {
    spending_key: "999",
    in_amount: INITIAL_AMOUNT.toString(),
    in_randomness: "111",
    out_pub_x_1: "12345",
    out_amount_1: CHANGE_AMOUNT.toString(), // 300 tokens change
    out_randomness_1: "222",
    out_pub_x_2: "67890",
    out_amount_2: "0", // No second output (or could be another recipient)
    out_randomness_2: "333",
  };

  // Run helper circuit
  const helperDir = path.join(__dirname, "..", "circuits", "helpers", "compute_test_values");
  const helperProverToml = `spending_key = "${numberToHex64(privateInputs.spending_key)}"
token_mint = "${tokenMintHex}"
in_amount = "${numberToHex64(privateInputs.in_amount)}"
in_randomness = "${numberToHex64(privateInputs.in_randomness)}"
out_pub_x_1 = "${numberToHex64(privateInputs.out_pub_x_1)}"
out_amount_1 = "${numberToHex64(privateInputs.out_amount_1)}"
out_randomness_1 = "${numberToHex64(privateInputs.out_randomness_1)}"
out_pub_x_2 = "${numberToHex64(privateInputs.out_pub_x_2)}"
out_amount_2 = "${numberToHex64(privateInputs.out_amount_2)}"
out_randomness_2 = "${numberToHex64(privateInputs.out_randomness_2)}"
`;

  fs.writeFileSync(path.join(helperDir, "Prover.toml"), helperProverToml);

  let derivedValues: any;
  try {
    const result = execFileSync(nargoPath, ["execute", "compute_test_values"], {
      cwd: helperDir,
      encoding: "utf-8",
    });
    const outputMatch = result.match(/Circuit output: \(([^)]+)\)/);
    if (!outputMatch) throw new Error("Could not parse helper output");
    const outputValues = outputMatch[1].split(", ").map(v => v.trim());
    derivedValues = {
      in_stealth_pub_x: outputValues[0],
      in_stealth_pub_y: outputValues[1],
      merkle_root: outputValues[3],
      nullifier: outputValues[4],
      out_commitment_1: outputValues[5],
      out_commitment_2: outputValues[6],
    };
    console.log("Helper circuit computed derived values");
  } catch (err: any) {
    console.error("Helper circuit failed:", err.message);
    return;
  }

  // Write main circuit with unshield_amount
  const proverToml = `merkle_root = "${derivedValues.merkle_root}"
nullifier = "${derivedValues.nullifier}"
out_commitment_1 = "${derivedValues.out_commitment_1}"
out_commitment_2 = "${derivedValues.out_commitment_2}"
token_mint = "${tokenMintHex}"
unshield_amount = "${numberToHex64(UNSHIELD_AMOUNT.toString())}"

in_stealth_pub_x = "${derivedValues.in_stealth_pub_x}"
in_stealth_pub_y = "${derivedValues.in_stealth_pub_y}"
in_amount = "${numberToHex64(privateInputs.in_amount)}"
in_randomness = "${numberToHex64(privateInputs.in_randomness)}"
in_stealth_spending_key = "${numberToHex64(privateInputs.spending_key)}"

merkle_path = [${Array(16).fill('"0x' + "0".repeat(64) + '"').join(", ")}]
merkle_path_indices = [${Array(16).fill('"0x' + "0".repeat(64) + '"').join(", ")}]
leaf_index = "0x0000000000000000000000000000000000000000000000000000000000000000"

out_stealth_pub_x_1 = "${numberToHex64(privateInputs.out_pub_x_1)}"
out_amount_1 = "${numberToHex64(privateInputs.out_amount_1)}"
out_randomness_1 = "${numberToHex64(privateInputs.out_randomness_1)}"

out_stealth_pub_x_2 = "${numberToHex64(privateInputs.out_pub_x_2)}"
out_amount_2 = "${numberToHex64(privateInputs.out_amount_2)}"
out_randomness_2 = "${numberToHex64(privateInputs.out_randomness_2)}"
`;

  fs.writeFileSync(path.join(circuitDir, "Prover.toml"), proverToml);
  console.log("Circuit includes unshield_amount:", Number(UNSHIELD_AMOUNT) / 1e9, "tokens");

  // Generate witness and proof
  try {
    execFileSync(nargoPath, ["execute", "transfer_1x2"], { cwd: circuitDir, stdio: "pipe" });
    console.log("Witness generated");
  } catch (err: any) {
    console.error("nargo failed:", err.message);
    return;
  }

  const acirPath = path.join(targetDir, "transfer_1x2.json");
  const witnessPath = path.join(targetDir, "transfer_1x2.gz");
  const ccsPath = path.join(targetDir, "transfer_1x2.ccs");
  const pkPath = path.join(targetDir, "transfer_1x2.pk");
  const proofPath = path.join(targetDir, "transfer_1x2.proof");

  let proofBytes: Uint8Array;
  try {
    execFileSync(sunspotPath, ["prove", acirPath, witnessPath, ccsPath, pkPath], {
      cwd: targetDir,
      stdio: "pipe",
    });
    const rawProof = new Uint8Array(fs.readFileSync(proofPath));
    proofBytes = rawProof.slice(0, 256);
    console.log("Groth16 proof generated\n");
  } catch (err: any) {
    console.error("sunspot failed:", err.message);
    return;
  }

  // === Step 4: Call transact with unshield ===
  console.log("Step 4: Calling transact with unshield...");

  const nullifierBytes = hexToBytes(derivedValues.nullifier);

  // Derive nullifier address
  const nullifierSeeds = [Buffer.from("spend_nullifier"), poolPda.toBuffer(), Buffer.from(nullifierBytes)];
  const nullifierAddressSeed = deriveAddressSeedV2(nullifierSeeds);
  const nullifierAddress = deriveAddressV2(nullifierAddressSeed, addressTreeInfo.tree, PROGRAM_ID);

  const nullifierProof = await lightRpc.getValidityProofV0([], [{
    address: bn(nullifierAddress.toBytes()),
    tree: addressTreeInfo.tree,
    queue: addressTreeInfo.queue,
  }]);

  const lightParams = {
    nullifierProof: convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex: outputTreeIndex,
  };

  const outCommitments = [
    Array.from(hexToBytes(derivedValues.out_commitment_1)),
    Array.from(hexToBytes(derivedValues.out_commitment_2)),
  ];

  console.log("User token balance before:", Number((await getAccount(connection, userAta.address)).amount) / 1e9, "tokens");

  try {
    const tx = await program.methods.transact(
      Buffer.from(proofBytes),
      Array.from(hexToBytes(derivedValues.merkle_root)),
      Array.from(nullifierBytes),
      outCommitments,
      [],
      new anchor.BN(UNSHIELD_AMOUNT.toString()),
      lightParams
    ).accountsStrict({
      pool: poolPda,
      commitmentCounter: counterPda,
      tokenVault: vaultPda,
      verificationKey: vkPda,
      unshieldRecipient: userAta.address, // Withdraw to user's token account
      relayer: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    }).remainingAccounts(remainingAccounts).preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]).rpc();

    console.log("Transact with unshield successful:", tx);

    // Verify balances
    const vaultAfter = await getAccount(connection, vaultPda);
    const userAfter = await getAccount(connection, userAta.address);

    console.log("\n=== RESULTS ===");
    console.log("Vault balance after:", Number(vaultAfter.amount) / 1e9, "tokens");
    console.log("User token balance after:", Number(userAfter.amount) / 1e9, "tokens");
    console.log("");
    console.log("Expected vault:", Number(CHANGE_AMOUNT) / 1e9, "tokens (300)");
    console.log("Expected user:", Number(UNSHIELD_AMOUNT) / 1e9, "tokens (200)");

    if (Number(vaultAfter.amount) === Number(CHANGE_AMOUNT) &&
        Number(userAfter.amount) === Number(UNSHIELD_AMOUNT)) {
      console.log("\n=== SUCCESS ===");
      console.log("Full privacy cycle completed: Shield -> Transact with Unshield");
    } else {
      console.log("\n=== UNEXPECTED BALANCES ===");
    }

  } catch (err: any) {
    console.error("Transact failed:", err.message);
    if (err.logs) {
      console.log("\nProgram logs:");
      err.logs.slice(-30).forEach((log: string) => console.log("  ", log));
    }
  }
}

main().catch(console.error);
