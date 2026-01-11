/**
 * End-to-End Transact Test with Real ZK Proofs
 *
 * Full flow:
 * 1. Initialize pool and shield tokens
 * 2. Generate valid ZK proof using Sunspot with actual token mint
 * 3. Call transact instruction with Light Protocol
 * 4. Verify nullifier created and new commitments stored
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

// BN254 base field modulus (same as Rust on-chain code)
const BN254_FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");

function pubkeyToFieldHex(pubkey: PublicKey): string {
  // Convert pubkey bytes to a field element (take modulo field prime to fit within BN254)
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
  console.log("=== End-to-End Transact Test with ZK Proofs ===\n");

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

  // === Step 1: Check VK is registered ===
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
  console.log(`VK registered: ${vkPda.toBase58()} (${vkAccount.data.length} bytes)\n`);

  // === Step 2: Set up test token and pool ===
  console.log("Step 2: Setting up test token and pool...");

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
  await mintTo(
    connection,
    wallet,
    tokenMint,
    userAta.address,
    wallet,
    1000_000_000_000
  );
  console.log("Minted 1000 tokens");

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

  // === Step 3: Generate ZK proof with actual token mint ===
  console.log("\nStep 3: Generating ZK proof with actual token mint...");

  const circuitDir = path.join(__dirname, "..", "circuits", "transfer", "1x2");
  const targetDir = path.join(__dirname, "..", "circuits", "target");
  const nargoPath = path.join(os.homedir(), ".nargo", "bin", "nargo");
  const sunspotPath = path.join(__dirname, "sunspot");

  // Convert token mint pubkey to hex for circuit (mod field prime to fit BN254)
  const tokenMintHex = pubkeyToFieldHex(tokenMint);
  console.log("  Token mint as Field:", tokenMintHex.slice(0, 20) + "...");

  // Private input values
  const privateInputs = {
    spending_key: "123",
    in_amount: "500",
    in_randomness: "111",
    out_pub_x_1: "12345",
    out_amount_1: "300",
    out_randomness_1: "222",
    out_pub_x_2: "67890",
    out_amount_2: "200",
    out_randomness_2: "333",
  };

  // First, run the helper circuit to compute stealth pubkey and other derived values
  // The helper circuit computes: stealth_pub_x, stealth_pub_y, in_commitment, nullifier, etc.
  const helperDir = path.join(__dirname, "..", "circuits", "helpers", "compute_test_values");

  // Write helper Prover.toml to compute derived values
  const helperProverToml = `# Compute derived values for transfer circuit
spending_key = "${numberToHex64(privateInputs.spending_key)}"
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
  console.log("  Helper Prover.toml written");

  // Execute helper circuit to get derived values
  let derivedValues: {
    in_stealth_pub_x: string;
    in_stealth_pub_y: string;
    merkle_root: string;
    nullifier: string;
    out_commitment_1: string;
    out_commitment_2: string;
  };

  try {
    const result = execFileSync(nargoPath, ["execute", "compute_test_values"], {
      cwd: helperDir,
      encoding: "utf-8",
    });
    console.log("  Helper circuit executed");

    // Parse stdout for circuit output
    // Format: [compute_test_values] Circuit output: (0x..., 0x..., ...)
    const outputMatch = result.match(/Circuit output: \(([^)]+)\)/);
    if (!outputMatch) {
      throw new Error("Could not find circuit output in nargo result");
    }

    const outputValues = outputMatch[1].split(", ").map(v => v.trim());
    // Helper circuit returns: (in_stealth_pub_x, in_stealth_pub_y, in_commitment, merkle_root, nullifier, out_commitment_1, out_commitment_2, token_mint)
    derivedValues = {
      in_stealth_pub_x: outputValues[0],
      in_stealth_pub_y: outputValues[1],
      merkle_root: outputValues[3],
      nullifier: outputValues[4],
      out_commitment_1: outputValues[5],
      out_commitment_2: outputValues[6],
    };

    console.log("  Derived values from helper circuit:");
    console.log("    [0] in_stealth_pub_x:", outputValues[0]);
    console.log("    [1] in_stealth_pub_y:", outputValues[1]);
    console.log("    [2] in_commitment:", outputValues[2]);
    console.log("    [3] merkle_root:", outputValues[3]);
    console.log("    [4] nullifier:", outputValues[4]);
    console.log("    [5] out_commitment_1:", outputValues[5]);
    console.log("    [6] out_commitment_2:", outputValues[6]);
    console.log("    [7] token_mint:", outputValues[7]);
  } catch (err: any) {
    console.error("ERROR: Helper circuit execution failed");
    console.error(err.stderr?.toString() || err.stdout?.toString() || err.message);
    return;
  }

  // Write main circuit Prover.toml with all values
  const proverToml = `# Public inputs
merkle_root = "${derivedValues.merkle_root}"
nullifier = "${derivedValues.nullifier}"
out_commitment_1 = "${derivedValues.out_commitment_1}"
out_commitment_2 = "${derivedValues.out_commitment_2}"
token_mint = "${tokenMintHex}"
unshield_amount = "0x0000000000000000000000000000000000000000000000000000000000000000"

# Private inputs
in_stealth_pub_x = "${derivedValues.in_stealth_pub_x}"
in_stealth_pub_y = "${derivedValues.in_stealth_pub_y}"
in_amount = "${numberToHex64(privateInputs.in_amount)}"
in_randomness = "${numberToHex64(privateInputs.in_randomness)}"
in_stealth_spending_key = "${numberToHex64(privateInputs.spending_key)}"

# Merkle path (16 elements, all zeros for single leaf)
merkle_path = [${Array(16).fill('"0x' + "0".repeat(64) + '"').join(", ")}]
merkle_path_indices = [${Array(16).fill('"0x' + "0".repeat(64) + '"').join(", ")}]
leaf_index = "0x0000000000000000000000000000000000000000000000000000000000000000"

# Output 1
out_stealth_pub_x_1 = "${numberToHex64(privateInputs.out_pub_x_1)}"
out_amount_1 = "${numberToHex64(privateInputs.out_amount_1)}"
out_randomness_1 = "${numberToHex64(privateInputs.out_randomness_1)}"

# Output 2
out_stealth_pub_x_2 = "${numberToHex64(privateInputs.out_pub_x_2)}"
out_amount_2 = "${numberToHex64(privateInputs.out_amount_2)}"
out_randomness_2 = "${numberToHex64(privateInputs.out_randomness_2)}"
`;

  fs.writeFileSync(path.join(circuitDir, "Prover.toml"), proverToml);
  console.log("  Main Prover.toml written");

  // Generate witness with nargo
  try {
    execFileSync(nargoPath, ["execute", "transfer_1x2"], {
      cwd: circuitDir,
      stdio: "pipe",
    });
    console.log("  Witness generated");
  } catch (err: any) {
    console.error("ERROR: nargo execute failed");
    console.error(err.stderr?.toString() || err.message);
    return;
  }

  // Generate proof with sunspot
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
    console.log(`  Raw proof file: ${rawProof.length} bytes`);
    // Sunspot outputs 324 bytes (256 proof + 68 padding), take first 256
    proofBytes = rawProof.slice(0, 256);
    console.log(`  Groth16 proof used (${proofBytes.length} bytes)`);

    // Log proof components
    console.log("  Proof.A (0..64):");
    console.log("    X[0..8]:", Buffer.from(proofBytes.slice(0, 8)).toString("hex"));
    console.log("    Y[32..40]:", Buffer.from(proofBytes.slice(32, 40)).toString("hex"));
    console.log("  Proof.B (64..192):");
    console.log("    [0..8]:", Buffer.from(proofBytes.slice(64, 72)).toString("hex"));
    console.log("  Proof.C (192..256):");
    console.log("    [0..8]:", Buffer.from(proofBytes.slice(192, 200)).toString("hex"));

    // Verify locally with sunspot before sending on-chain
    // Argument order: sunspot verify VK PROOF PW
    const vkPath = path.join(targetDir, "transfer_1x2.vk");
    const pwPath = path.join(targetDir, "transfer_1x2.pw");
    try {
      const verifyResult = execFileSync(sunspotPath, ["verify", vkPath, proofPath, pwPath], {
        cwd: targetDir,
        encoding: "utf-8",
        stdio: "pipe",
      });
      console.log("  Local sunspot verify:", verifyResult.trim() || "PASSED");
    } catch (verifyErr: any) {
      console.log("  Local sunspot verify FAILED:", verifyErr.stderr?.toString() || verifyErr.message);
    }
    console.log("");
  } catch (err: any) {
    console.error("ERROR: sunspot prove failed");
    console.error(err.stderr?.toString() || err.message);
    return;
  }

  // === Step 4: Get Light Protocol validity proof for nullifier ===
  console.log("Step 4: Getting Light Protocol validity proof...");

  const addressTreeInfo = getBatchAddressTreeInfo();
  const nullifierBytes = hexToBytes(derivedValues.nullifier);

  // Derive nullifier address using Light SDK V2
  const nullifierSeeds = [
    PROGRAM_ID.toBuffer(),
    Buffer.from("nullifier"),
    poolPda.toBuffer(),
    Buffer.from(nullifierBytes),
  ];
  const nullifierAddressSeed = deriveAddressSeedV2(nullifierSeeds);
  const nullifierAddress = deriveAddressV2(nullifierAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
  console.log("  Nullifier address:", nullifierAddress.toBase58());

  // Get validity proof (proves nullifier doesn't exist yet)
  const lightProof = await lightRpc.getValidityProofV0(
    [],
    [{
      address: bn(nullifierAddress.toBytes()),
      tree: addressTreeInfo.tree,
      queue: addressTreeInfo.queue,
    }]
  );
  console.log("  Validity proof received\n");

  // Build remaining accounts using SDK
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

  // === Step 5: Call transact instruction ===
  console.log("Step 5: Calling transact instruction...");

  // Convert Light SDK proof to fixed-size arrays expected by Anchor
  const proofA = new Uint8Array(32);
  const proofB = new Uint8Array(64);
  const proofC = new Uint8Array(32);
  if (lightProof.compressedProof) {
    proofA.set(lightProof.compressedProof.a.slice(0, 32));
    proofB.set(lightProof.compressedProof.b.slice(0, 64));
    proofC.set(lightProof.compressedProof.c.slice(0, 32));
  }

  const lightParams = {
    validityProof: {
      a: Array.from(proofA),
      b: Array.from(proofB),
      c: Array.from(proofC),
    },
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex, // Same for v2
      rootIndex: lightProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex: outputTreeIndex,
  };

  const outCommitments = [
    Array.from(hexToBytes(derivedValues.out_commitment_1)),
    Array.from(hexToBytes(derivedValues.out_commitment_2)),
  ];

  // Log what we're sending as public inputs
  console.log("\n  Public inputs being sent to on-chain:");
  console.log("    merkle_root:", "0x" + Buffer.from(hexToBytes(derivedValues.merkle_root)).toString("hex"));
  console.log("    nullifier:", "0x" + Buffer.from(nullifierBytes).toString("hex"));
  console.log("    out_commitment_1:", "0x" + Buffer.from(hexToBytes(derivedValues.out_commitment_1)).toString("hex"));
  console.log("    out_commitment_2:", "0x" + Buffer.from(hexToBytes(derivedValues.out_commitment_2)).toString("hex"));
  console.log("    token_mint (from pool):", tokenMint.toBase58());
  console.log("    token_mint as field hex:", tokenMintHex);
  console.log("    unshield_amount:", 0);

  // Encrypted notes (minimal placeholder to reduce tx size)
  const encryptedNotes: Buffer[] = [];

  try {
    const tx = await program.methods
      .transact(
        Buffer.from(proofBytes),
        Array.from(hexToBytes(derivedValues.merkle_root)),
        Array.from(nullifierBytes),
        outCommitments,
        encryptedNotes,
        new anchor.BN(0), // unshield_amount
        lightParams
      )
      .accountsStrict({
        pool: poolPda,
        commitmentCounter: counterPda,
        tokenVault: vaultPda,
        verificationKey: vkPda,
        unshieldRecipient: null as any,
        relayer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
      ])
      .rpc();

    console.log("Transact successful:", tx);

    // === Step 6: Verify state ===
    console.log("\nStep 6: Verifying on-chain state...");
    const counterAccount = await connection.getAccountInfo(counterPda);
    if (counterAccount) {
      // Read commitment counter data (after 8-byte discriminator)
      const totalCommitments = counterAccount.data.readBigUInt64LE(8);
      const nextLeafIndex = counterAccount.data.readBigUInt64LE(16);
      console.log("  Total commitments:", totalCommitments.toString());
      console.log("  Next leaf index:", nextLeafIndex.toString());
    }

    console.log("\n=== SUCCESS ===");
    console.log("Full transact flow with real ZK proof completed!");

  } catch (err: any) {
    console.error("Transact failed:", err.message);
    if (err.logs) {
      console.log("\nProgram logs:");
      err.logs.slice(-20).forEach((log: string) => console.log("  ", log));
    }
  }
}

main().catch(console.error);
