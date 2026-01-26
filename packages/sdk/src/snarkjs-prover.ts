/**
 * snarkjs-based Groth16 prover for browser
 *
 * Uses circom circuits with snarkjs for BN254 Groth16 proving.
 * This produces proofs compatible with Solana's alt_bn128 precompiles.
 */

// BN254 field modulus for Y-coordinate negation
const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');

/**
 * Circuit artifacts for snarkjs proving
 */
export interface CircomArtifacts {
  /** WASM witness calculator */
  wasmBuffer: ArrayBuffer;
  /** Proving key (zkey) */
  zkeyBuffer: ArrayBuffer;
}

// Cache for loaded artifacts
const artifactsCache: Map<string, CircomArtifacts> = new Map();

/**
 * Clear the circuit artifacts cache
 *
 * Call this to force reloading of circuit files after they've been recompiled.
 */
export function clearCircomCache(): void {
  artifactsCache.clear();
}

/**
 * Load circuit artifacts from URLs or file paths
 *
 * In browser: Uses fetch with URLs
 * In Node.js: Reads from file system (resolves relative paths from project root)
 */
export async function loadCircomArtifacts(
  circuitName: string,
  wasmUrl: string,
  zkeyUrl: string
): Promise<CircomArtifacts> {
  // Check cache first
  const cached = artifactsCache.get(circuitName);
  if (cached) {
    return cached;
  }

  // Detect Node.js environment
  const isNode = typeof globalThis.process !== 'undefined'
    && globalThis.process.versions != null
    && globalThis.process.versions.node != null;

  let wasmBuffer: ArrayBuffer;
  let zkeyBuffer: ArrayBuffer;

  if (isNode) {
    // Node.js: Load from file system
    const fs = await import('fs');

    // Strip query parameters (cache busters) from file paths in Node.js
    const wasmPath = wasmUrl.split('?')[0];
    const zkeyPath = zkeyUrl.split('?')[0];

    // Use the actual paths provided (wasmUrl and zkeyUrl are file paths in Node.js)
    wasmBuffer = fs.readFileSync(wasmPath).buffer;
    zkeyBuffer = fs.readFileSync(zkeyPath).buffer;
  } else {
    // Browser: Use fetch
    const wasmRes = await fetch(wasmUrl);
    if (!wasmRes.ok) {
      throw new Error(`Failed to load WASM: ${wasmRes.status}`);
    }
    wasmBuffer = await wasmRes.arrayBuffer();

    const zkeyRes = await fetch(zkeyUrl);
    if (!zkeyRes.ok) {
      throw new Error(`Failed to load zkey: ${zkeyRes.status}`);
    }
    zkeyBuffer = await zkeyRes.arrayBuffer();
  }

  const artifacts = { wasmBuffer, zkeyBuffer };
  artifactsCache.set(circuitName, artifacts);

  return artifacts;
}

/**
 * Generate a Groth16 proof using snarkjs
 *
 * @param artifacts - Circuit WASM and zkey
 * @param inputs - Circuit inputs as key-value pairs
 * @returns Proof formatted for Solana
 */
export async function generateSnarkjsProof(
  artifacts: CircomArtifacts,
  inputs: Record<string, string | string[]>
): Promise<Uint8Array> {
  // Dynamic import snarkjs to avoid SSR issues
  const snarkjs = await import('snarkjs');

  const startTime = performance.now();

  // Generate witness using WASM
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    inputs,
    new Uint8Array(artifacts.wasmBuffer),
    new Uint8Array(artifacts.zkeyBuffer)
  );

  const elapsed = performance.now() - startTime;

  // Log public signals as hex for comparison
  console.log('[snarkjs] Public signals from proof:');
  publicSignals.forEach((sig: string, i: number) => {
    const hex = BigInt(sig).toString(16).padStart(64, '0');
    console.log(`  [${i}]: ${sig} -> 0x${hex.slice(0, 16)}...`);
  });

  // Log raw proof from snarkjs BEFORE formatting
  const typedProof = proof as { pi_a: string[]; pi_b: string[][]; pi_c: string[] };
  console.log('[snarkjs] Raw proof from snarkjs:');
  console.log('  pi_a[0] (Ax):', typedProof.pi_a[0]);
  console.log('  pi_a[1] (Ay):', typedProof.pi_a[1]);
  console.log('  pi_b[0][0] (Bx_re):', typedProof.pi_b[0][0]);
  console.log('  pi_b[0][1] (Bx_im):', typedProof.pi_b[0][1]);
  console.log('  pi_b[1][0] (By_re):', typedProof.pi_b[1][0]);
  console.log('  pi_b[1][1] (By_im):', typedProof.pi_b[1][1]);
  console.log('  pi_c[0] (Cx):', typedProof.pi_c[0]);
  console.log('  pi_c[1] (Cy):', typedProof.pi_c[1]);

  // Convert to bytes and format for Solana
  const formattedProof = formatSnarkjsProofForSolana(proof as { pi_a: string[]; pi_b: string[][]; pi_c: string[] });

  // Log formatted proof components with more detail
  const toHexStr = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

  console.log('[snarkjs] Formatted proof for Solana (first 16 bytes of each component):');
  console.log('  A.x (0-31):', toHexStr(formattedProof.slice(0, 16)) + '...');
  console.log('  A.y_neg (32-63):', toHexStr(formattedProof.slice(32, 48)) + '...');
  console.log('  B.x_im (64-95):', toHexStr(formattedProof.slice(64, 80)) + '...');
  console.log('  B.x_re (96-127):', toHexStr(formattedProof.slice(96, 112)) + '...');
  console.log('  B.y_im (128-159):', toHexStr(formattedProof.slice(128, 144)) + '...');
  console.log('  B.y_re (160-191):', toHexStr(formattedProof.slice(160, 176)) + '...');
  console.log('  C.x (192-223):', toHexStr(formattedProof.slice(192, 208)) + '...');
  console.log('  C.y (224-255):', toHexStr(formattedProof.slice(224, 240)) + '...');

  return formattedProof;
}

/**
 * Format snarkjs proof for Solana's alt_bn128 pairing check
 *
 * snarkjs proof format:
 * {
 *   pi_a: [x, y, "1"],
 *   pi_b: [[x1, y1], [x2, y2], ["1", "0"]],
 *   pi_c: [x, y, "1"]
 * }
 *
 * Solana expects: A (negated) + B + C = 256 bytes
 */
function formatSnarkjsProofForSolana(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}): Uint8Array {
  const formatted = new Uint8Array(256);

  // A point (64 bytes) - negate Y coordinate for Solana's pairing equation
  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : BN254_FIELD_MODULUS - ay;

  formatted.set(bigIntToBytes(ax, 32), 0);
  formatted.set(bigIntToBytes(negAy, 32), 32);

  // B point (128 bytes) - G2 point with specific encoding
  // snarkjs format: [[x0, x1], [y0, y1], [z0, z1]] where x0=real, x1=imaginary
  // Solana alt_bn128 expects: x_im || x_re || y_im || y_re = x1 || x0 || y1 || y0
  const bx0 = BigInt(proof.pi_b[0][0]); // real part of X
  const bx1 = BigInt(proof.pi_b[0][1]); // imaginary part of X
  const by0 = BigInt(proof.pi_b[1][0]); // real part of Y
  const by1 = BigInt(proof.pi_b[1][1]); // imaginary part of Y

  formatted.set(bigIntToBytes(bx1, 32), 64);  // x_im first
  formatted.set(bigIntToBytes(bx0, 32), 96);  // x_re second
  formatted.set(bigIntToBytes(by1, 32), 128); // y_im third
  formatted.set(bigIntToBytes(by0, 32), 160); // y_re fourth

  // C point (64 bytes)
  const cx = BigInt(proof.pi_c[0]);
  const cy = BigInt(proof.pi_c[1]);

  formatted.set(bigIntToBytes(cx, 32), 192);
  formatted.set(bigIntToBytes(cy, 32), 224);

  return formatted;
}

/**
 * Convert BigInt to bytes (big-endian)
 */
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

/**
 * Generate a Groth16 proof using snarkjs with automatic artifact loading
 *
 * @param circuitName - Circuit name (e.g., 'voting/claim')
 * @param inputs - Circuit inputs as key-value pairs
 * @param buildDir - Directory containing circuit build artifacts
 * @returns Proof formatted for Solana
 */
export async function generateSnarkjsProofFromCircuit(
  circuitName: string,
  inputs: Record<string, string | string[]>,
  buildDir: string
): Promise<Uint8Array> {
  // Construct paths to WASM and zkey files
  const wasmPath = `${buildDir}/${circuitName}/${circuitName.split('/').pop()}_js/${circuitName.split('/').pop()}.wasm`;
  const zkeyPath = `${buildDir}/${circuitName}/${circuitName.split('/').pop()}_0001.zkey`;

  // Load artifacts
  const artifacts = await loadCircomArtifacts(circuitName, wasmPath, zkeyPath);

  // Generate proof
  return generateSnarkjsProof(artifacts, inputs);
}

/**
 * Convert Uint8Array to field element string for circom
 */
export function bytesToFieldString(bytes: Uint8Array): string {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result.toString();
}

/**
 * Convert bigint to field element string for circom
 */
export function bigintToFieldString(value: bigint): string {
  return value.toString();
}
