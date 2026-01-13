/**
 * Convert Circom/snarkjs verification key to groth16-solana binary format
 *
 * Circom VK (JSON):
 * - vk_alpha_1: [x, y, 1] G1 point
 * - vk_beta_2: [[x0, x1], [y0, y1], [1, 0]] G2 point
 * - vk_gamma_2: G2 point
 * - vk_delta_2: G2 point
 * - IC: Array of G1 points
 *
 * groth16-solana VK (binary):
 * - vk_alpha_g1: 64 bytes (x: 32 BE, y: 32 BE)
 * - vk_beta_g2: 128 bytes (x0: 32, x1: 32, y0: 32, y1: 32)
 * - vk_gamma_g2: 128 bytes
 * - vk_delta_g2: 128 bytes
 * - IC count: 4 bytes (big-endian)
 * - IC elements: 64 bytes each
 *
 * Note: groth16-solana is designed specifically for snarkjs/circom proofs
 * and uses the same G2 point encoding as snarkjs.
 */

import * as fs from "fs";
import * as path from "path";

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
// In snarkjs terms: x1 || x0 || y1 || y0 (imaginary first, then real)
function g2ToBytes(point: string[][]): Buffer {
  const x0 = decimalTo32Bytes(point[0][0]); // real part of X
  const x1 = decimalTo32Bytes(point[0][1]); // imaginary part of X
  const y0 = decimalTo32Bytes(point[1][0]); // real part of Y
  const y1 = decimalTo32Bytes(point[1][1]); // imaginary part of Y
  // Solana order: x_im, x_re, y_im, y_re = x1, x0, y1, y0
  return Buffer.concat([x1, x0, y1, y0]);
}

async function main() {
  const circomVkPath = process.argv[2] || path.join(
    __dirname,
    "..",
    "circom-circuits",
    "build",
    "transfer_1x2",
    "verification_key.json"
  );

  const outputPath = process.argv[3] || path.join(
    __dirname,
    "..",
    "circuits",
    "target",
    "transfer_1x2_groth16solana.vk"
  );

  console.log("Converting Circom VK to groth16-solana format...");
  console.log("Input:", circomVkPath);
  console.log("Output:", outputPath);

  const vk = JSON.parse(fs.readFileSync(circomVkPath, "utf-8"));

  const parts: Buffer[] = [];

  // 1. vk_alpha_g1 (64 bytes)
  const alpha = g1ToBytes(vk.vk_alpha_1);
  parts.push(alpha);
  console.log("vk_alpha_g1:", alpha.toString("hex").slice(0, 32) + "...");

  // 2. vk_beta_g2 (128 bytes)
  const beta = g2ToBytes(vk.vk_beta_2);
  parts.push(beta);
  console.log("vk_beta_g2:", beta.toString("hex").slice(0, 32) + "...");

  // 3. vk_gamma_g2 (128 bytes)
  const gamma = g2ToBytes(vk.vk_gamma_2);
  parts.push(gamma);
  console.log("vk_gamma_g2:", gamma.toString("hex").slice(0, 32) + "...");

  // 4. vk_delta_g2 (128 bytes)
  const delta = g2ToBytes(vk.vk_delta_2);
  parts.push(delta);
  console.log("vk_delta_g2:", delta.toString("hex").slice(0, 32) + "...");

  // 5. IC count (4 bytes big-endian)
  const icCount = vk.IC.length;
  const icCountBuf = Buffer.alloc(4);
  icCountBuf.writeUInt32BE(icCount);
  parts.push(icCountBuf);
  console.log("IC count:", icCount, "(public inputs:", icCount - 1 + ")");

  // 6. IC elements (64 bytes each)
  for (let i = 0; i < icCount; i++) {
    const ic = g1ToBytes(vk.IC[i]);
    parts.push(ic);
    if (i < 3) {
      console.log(`IC[${i}]:`, ic.toString("hex").slice(0, 32) + "...");
    }
  }

  const groth16SolanaVk = Buffer.concat(parts);

  // Expected size: 64 + 128 + 128 + 128 + 4 + (icCount * 64)
  const expectedSize = 64 + 128 + 128 + 128 + 4 + (icCount * 64);
  console.log("\nTotal VK size:", groth16SolanaVk.length, "bytes");
  console.log("Expected size:", expectedSize, "bytes");

  if (groth16SolanaVk.length !== expectedSize) {
    console.error("ERROR: Size mismatch!");
    process.exit(1);
  }

  // Write to file
  fs.writeFileSync(outputPath, groth16SolanaVk);
  console.log("Written to:", outputPath);

  // Also output to circuits/target/transfer_1x2.vk to replace the old one
  const defaultPath = path.join(__dirname, "..", "circuits", "target", "transfer_1x2.vk");
  fs.writeFileSync(defaultPath, groth16SolanaVk);
  console.log("Also written to:", defaultPath);

  console.log("\nDone! Now run: npx ts-node scripts/register-vkeys.ts --force");
}

main().catch(console.error);
