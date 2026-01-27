/**
 * Register Circom verification keys on Solana devnet
 *
 * This script:
 * 1. Converts Circom VK JSON to groth16-solana binary format
 * 2. Registers the verification keys on-chain
 *
 * Usage:
 *   npx tsx scripts/register-circom-vkeys.ts [--circuit <name>] [--force]
 *
 * Examples:
 *   npx tsx scripts/register-circom-vkeys.ts                    # All circuits
 *   npx tsx scripts/register-circom-vkeys.ts --circuit transfer_1x2
 *   npx tsx scripts/register-circom-vkeys.ts --force            # Overwrite existing
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Program ID
const PROGRAM_ID = new PublicKey("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");
const VK_SEED = Buffer.from("vk");

// Circuit configurations
interface CircuitConfig {
  id: string;
  vkJsonPath: string;
}

const CIRCUITS: CircuitConfig[] = [
  {
    id: "transfer_1x2",
    vkJsonPath: "circom-circuits/build/transfer_1x2/verification_key.json",
  },
  {
    id: "consolidate_3x1",
    vkJsonPath: "circom-circuits/build/consolidate_3x1/verification_key.json",
  },
  // AMM circuits
  {
    id: "swap_swap",
    vkJsonPath: "circom-circuits/build/swap_verification_key.json",
  },
  {
    id: "swap_add_liquidity",
    vkJsonPath: "circom-circuits/build/add_liquidity_verification_key.json",
  },
  {
    id: "swap_remove_liquidity",
    vkJsonPath: "circom-circuits/build/remove_liquidity_verification_key.json",
  },
  // Perps circuits
  {
    id: "perps_open_position",
    vkJsonPath: "circom-circuits/build/perps/open_position_verification_key.json",
  },
  {
    id: "perps_close_position",
    vkJsonPath: "circom-circuits/build/perps/close_position_verification_key.json",
  },
  {
    id: "perps_add_liquidity",
    vkJsonPath: "circom-circuits/build/perps/add_liquidity_verification_key.json",
  },
  {
    id: "perps_remove_liquidity",
    vkJsonPath: "circom-circuits/build/perps/remove_liquidity_verification_key.json",
  },
  {
    id: "perps_liquidate",
    vkJsonPath: "circom-circuits/build/perps/liquidate_verification_key.json",
  },
  // Voting circuits
  {
    id: "vote_snapshot",
    vkJsonPath: "circom-circuits/build/voting/vote_snapshot_verification_key.json",
  },
  {
    id: "change_vote_snapshot",
    vkJsonPath: "circom-circuits/build/voting/change_vote_snapshot_verification_key.json",
  },
  {
    id: "vote_spend",
    vkJsonPath: "circom-circuits/build/voting/vote_spend_verification_key.json",
  },
  {
    id: "change_vote_spend",
    vkJsonPath: "circom-circuits/build/voting/change_vote_spend_verification_key.json",
  },
  {
    id: "close_position",
    vkJsonPath: "circom-circuits/build/voting/close_position_verification_key.json",
  },
  {
    id: "voting_claim",
    vkJsonPath: "circom-circuits/build/voting/claim_verification_key.json",
  },
];

// Convert decimal string to 32-byte big-endian buffer
function decimalTo32Bytes(decimal: string): Buffer {
  const bn = BigInt(decimal);
  const hex = bn.toString(16).padStart(64, "0");
  return Buffer.from(hex, "hex");
}

// Convert G1 point [x, y, z] to 64 bytes (x || y)
function g1ToBytes(point: string[]): Buffer {
  const x = decimalTo32Bytes(point[0]);
  const y = decimalTo32Bytes(point[1]);
  return Buffer.concat([x, y]);
}

// Convert G2 point [[x0, x1], [y0, y1], [z0, z1]] to 128 bytes
// Solana alt_bn128 / groth16-solana expects: x.c1 || x.c0 || y.c1 || y.c0
function g2ToBytes(point: string[][]): Buffer {
  const x0 = decimalTo32Bytes(point[0][0]); // real part of X
  const x1 = decimalTo32Bytes(point[0][1]); // imaginary part of X
  const y0 = decimalTo32Bytes(point[1][0]); // real part of Y
  const y1 = decimalTo32Bytes(point[1][1]); // imaginary part of Y
  // Solana order: x_im, x_re, y_im, y_re = x1, x0, y1, y0
  return Buffer.concat([x1, x0, y1, y0]);
}

// Convert Circom VK JSON to groth16-solana binary format
function convertCircomVk(vkJson: any): Buffer {
  const parts: Buffer[] = [];

  // 1. vk_alpha_g1 (64 bytes)
  parts.push(g1ToBytes(vkJson.vk_alpha_1));

  // 2. vk_beta_g2 (128 bytes)
  parts.push(g2ToBytes(vkJson.vk_beta_2));

  // 3. vk_gamma_g2 (128 bytes)
  parts.push(g2ToBytes(vkJson.vk_gamma_2));

  // 4. vk_delta_g2 (128 bytes)
  parts.push(g2ToBytes(vkJson.vk_delta_2));

  // 5. IC count (4 bytes big-endian)
  const icCount = vkJson.IC.length;
  const icCountBuf = Buffer.alloc(4);
  icCountBuf.writeUInt32BE(icCount);
  parts.push(icCountBuf);

  // 6. IC elements (64 bytes each)
  for (const ic of vkJson.IC) {
    parts.push(g1ToBytes(ic));
  }

  return Buffer.concat(parts);
}

function padCircuitId(id: string): Buffer {
  // Pad with underscores to match on-chain constants.rs format
  const padded = id.padEnd(32, '_');
  return Buffer.from(padded);
}

async function registerVk(
  program: Program,
  wallet: Keypair,
  circuitId: string,
  vkData: Buffer,
  force: boolean
): Promise<void> {
  const circuitIdBuf = padCircuitId(circuitId);
  const [vkPda] = PublicKey.findProgramAddressSync(
    [VK_SEED, circuitIdBuf],
    PROGRAM_ID
  );

  console.log(`\n=== ${circuitId} ===`);
  console.log("VK PDA:", vkPda.toBase58());
  console.log("VK size:", vkData.length, "bytes");

  // Check if account exists
  const accountInfo = await program.provider.connection.getAccountInfo(vkPda);

  if (accountInfo && !force) {
    console.log("[SKIP] VK already exists. Use --force to overwrite.");
    return;
  }

  if (!accountInfo) {
    // Create new account
    console.log("Creating new VK account...");
    await program.methods
      .registerVerificationKey(Array.from(circuitIdBuf) as any, Buffer.from([]))
      .accounts({
        verificationKey: vkPda,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Account created");
  }

  // VK data upload - check if needs chunking
  const SINGLE_TX_LIMIT = 700;

  if (vkData.length <= SINGLE_TX_LIMIT) {
    console.log("Uploading VK in single transaction...");
    await program.methods
      .setVerificationKeyData(Array.from(circuitIdBuf) as any, Buffer.from(vkData))
      .accounts({
        verificationKey: vkPda,
        authority: wallet.publicKey,
      })
      .rpc();
  } else {
    console.log("VK too large, using chunked upload...");

    // Clear first
    await program.methods
      .setVerificationKeyData(Array.from(circuitIdBuf) as any, Buffer.from([]))
      .accounts({
        verificationKey: vkPda,
        authority: wallet.publicKey,
      })
      .rpc();

    // Upload in chunks
    const CHUNK_SIZE = 500;
    const chunks: Buffer[] = [];
    for (let i = 0; i < vkData.length; i += CHUNK_SIZE) {
      chunks.push(vkData.slice(i, Math.min(i + CHUNK_SIZE, vkData.length)));
    }

    for (let i = 0; i < chunks.length; i++) {
      await program.methods
        .appendVerificationKeyData(
          Array.from(circuitIdBuf) as any,
          Buffer.from(chunks[i])
        )
        .accounts({
          verificationKey: vkPda,
          authority: wallet.publicKey,
        })
        .rpc();
      console.log(`  Chunk ${i + 1}/${chunks.length} uploaded`);
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  // Verify
  const finalAccount = await program.provider.connection.getAccountInfo(vkPda);
  if (finalAccount) {
    const finalVecLen = finalAccount.data.readUInt32LE(40);
    if (finalVecLen === vkData.length) {
      console.log("[OK] VK registered successfully!");
    } else {
      console.log(`[WARN] VK length mismatch: got ${finalVecLen}, expected ${vkData.length}`);
    }
  }
}

async function main() {
  // Parse arguments
  const args = process.argv.slice(2);
  let targetCircuit: string | undefined;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--circuit" && args[i + 1]) {
      targetCircuit = args[i + 1];
      i++;
    } else if (args[i] === "--force") {
      force = true;
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

  console.log("=== Register Circom Verification Keys ===\n");
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program:", PROGRAM_ID.toBase58());
  console.log("Force:", force);

  const balance = await connection.getBalance(wallet.publicKey);
  console.log("Balance:", balance / 1e9, "SOL");

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

  // Process circuits
  const circuitsToProcess = targetCircuit
    ? CIRCUITS.filter((c) => c.id === targetCircuit)
    : CIRCUITS;

  if (circuitsToProcess.length === 0) {
    console.error(`Circuit not found: ${targetCircuit}`);
    console.error("Available circuits:", CIRCUITS.map((c) => c.id).join(", "));
    process.exit(1);
  }

  for (const circuit of circuitsToProcess) {
    const vkJsonPath = path.join(__dirname, "..", circuit.vkJsonPath);

    if (!fs.existsSync(vkJsonPath)) {
      console.log(`\n[SKIP] ${circuit.id}: VK file not found at ${vkJsonPath}`);
      continue;
    }

    const vkJson = JSON.parse(fs.readFileSync(vkJsonPath, "utf-8"));
    const vkData = convertCircomVk(vkJson);

    await registerVk(program, wallet, circuit.id, vkData, force);
  }

  console.log("\n=== Done ===");
}

main().catch(console.error);
