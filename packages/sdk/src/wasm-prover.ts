/**
 * WASM-based Groth16 prover for browser
 *
 * Uses gnark compiled to WASM via TinyGo for BN254 Groth16 proving.
 * This produces proofs compatible with Solana's alt_bn128 precompiles.
 */

declare global {
  interface Window {
    Go: any;
    generateProof: (witness: Uint8Array) => { proof: Uint8Array; publicWitness: Uint8Array } | { error: string };
    getProverReady: () => boolean;
  }
}

let wasmLoaded = false;
let wasmLoading: Promise<void> | null = null;

/**
 * Load the WASM prover module
 */
export async function loadWasmProver(wasmUrl: string = '/wasm/transfer_prover.wasm'): Promise<void> {
  if (wasmLoaded) return;
  if (wasmLoading) return wasmLoading;

  wasmLoading = (async () => {
    // Load wasm_exec.js if not already loaded
    if (typeof window !== 'undefined' && !window.Go) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/wasm/wasm_exec.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load wasm_exec.js'));
        document.head.appendChild(script);
      });
    }

    // Instantiate Go runtime
    const go = new window.Go();

    // Fetch and instantiate WASM
    const response = await fetch(wasmUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch WASM: ${response.status}`);
    }

    const wasmBytes = await response.arrayBuffer();

    const result = await WebAssembly.instantiate(wasmBytes, go.importObject);

    // Run the Go program (non-blocking, sets up exports)
    go.run(result.instance);

    // Wait for prover to be ready
    let attempts = 0;
    while (!window.getProverReady?.() && attempts < 50) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }

    if (!window.getProverReady?.()) {
      throw new Error('WASM prover failed to initialize');
    }

    wasmLoaded = true;
  })();

  return wasmLoading;
}

/**
 * Check if WASM prover is loaded
 */
export function isWasmProverLoaded(): boolean {
  return wasmLoaded;
}

/**
 * Generate a Groth16 proof using the WASM prover
 *
 * @param witness - Witness bytes in gnark format
 * @returns Proof bytes and public witness bytes
 */
export async function generateGroth16Proof(witness: Uint8Array): Promise<{
  proof: Uint8Array;
  publicWitness: Uint8Array;
}> {
  if (!wasmLoaded) {
    await loadWasmProver();
  }

  if (!window.generateProof) {
    throw new Error('WASM prover not available');
  }

  const startTime = performance.now();

  const result = window.generateProof(witness);

  if ('error' in result) {
    throw new Error(`Proof generation failed: ${result.error}`);
  }

  const elapsed = performance.now() - startTime;

  return {
    proof: result.proof,
    publicWitness: result.publicWitness,
  };
}

/**
 * Convert circuit inputs to gnark witness format
 *
 * gnark witness format:
 * - 4-byte field count (big-endian)
 * - For each field: 32-byte big-endian field element
 *
 * The order must match the circuit's public and private inputs.
 */
export function encodeGnarkWitness(inputs: {
  // Public inputs (in circuit order)
  merkleRoot: Uint8Array;
  nullifier: Uint8Array;
  outCommitment1: Uint8Array;
  outCommitment2: Uint8Array;
  tokenMint: Uint8Array;
  unshieldAmount: bigint;

  // Private inputs (in circuit order)
  inStealthPubX: Uint8Array;
  inStealthPubY: Uint8Array;
  inAmount: bigint;
  inRandomness: Uint8Array;
  inStealthSpendingKey: Uint8Array;
  merklePath: Uint8Array[];
  merklePathIndices: number[];
  leafIndex: bigint;
  outStealthPubX1: Uint8Array;
  outAmount1: bigint;
  outRandomness1: Uint8Array;
  outStealthPubX2: Uint8Array;
  outAmount2: bigint;
  outRandomness2: Uint8Array;
}): Uint8Array {
  const fields: Uint8Array[] = [];

  // Helper to convert bigint to 32-byte big-endian
  const bigintToBytes = (n: bigint): Uint8Array => {
    const bytes = new Uint8Array(32);
    let val = n;
    for (let i = 31; i >= 0; i--) {
      bytes[i] = Number(val & 0xffn);
      val >>= 8n;
    }
    return bytes;
  };

  // Public inputs
  fields.push(inputs.merkleRoot);
  fields.push(inputs.nullifier);
  fields.push(inputs.outCommitment1);
  fields.push(inputs.outCommitment2);
  fields.push(inputs.tokenMint);
  fields.push(bigintToBytes(inputs.unshieldAmount));

  // Private inputs
  fields.push(inputs.inStealthPubX);
  fields.push(inputs.inStealthPubY);
  fields.push(bigintToBytes(inputs.inAmount));
  fields.push(inputs.inRandomness);
  fields.push(inputs.inStealthSpendingKey);

  // Merkle path (32 elements)
  for (const sibling of inputs.merklePath) {
    fields.push(sibling);
  }

  // Merkle path indices (32 elements)
  for (const idx of inputs.merklePathIndices) {
    fields.push(bigintToBytes(BigInt(idx)));
  }

  fields.push(bigintToBytes(inputs.leafIndex));

  // Output 1
  fields.push(inputs.outStealthPubX1);
  fields.push(bigintToBytes(inputs.outAmount1));
  fields.push(inputs.outRandomness1);

  // Output 2
  fields.push(inputs.outStealthPubX2);
  fields.push(bigintToBytes(inputs.outAmount2));
  fields.push(inputs.outRandomness2);

  // Encode as gnark witness: 4-byte count + fields
  const totalFields = fields.length;
  const witnessBytes = new Uint8Array(4 + totalFields * 32);

  // Write field count (big-endian)
  witnessBytes[0] = (totalFields >> 24) & 0xff;
  witnessBytes[1] = (totalFields >> 16) & 0xff;
  witnessBytes[2] = (totalFields >> 8) & 0xff;
  witnessBytes[3] = totalFields & 0xff;

  // Write fields
  for (let i = 0; i < fields.length; i++) {
    witnessBytes.set(fields[i], 4 + i * 32);
  }

  return witnessBytes;
}

/**
 * Format gnark Groth16 proof for Solana submission
 *
 * gnark proof format: A (64 bytes) + B (128 bytes) + C (64 bytes) = 256 bytes
 * Solana expects: -A (negated) + B + C
 */
export function formatProofForSolana(proofBytes: Uint8Array): Uint8Array {
  if (proofBytes.length < 256) {
    throw new Error(`Proof too small: ${proofBytes.length} bytes, expected 256`);
  }

  const formatted = new Uint8Array(256);

  // Copy A point (64 bytes) - X unchanged
  formatted.set(proofBytes.slice(0, 32), 0);

  // Negate A.Y for Solana's pairing equation
  const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');
  const yBytes = proofBytes.slice(32, 64);
  let y = BigInt(0);
  for (const b of yBytes) {
    y = (y << 8n) | BigInt(b);
  }
  const negY = y === 0n ? 0n : BN254_FIELD_MODULUS - y;

  // Write negated Y
  const negYBytes = new Uint8Array(32);
  let val = negY;
  for (let i = 31; i >= 0; i--) {
    negYBytes[i] = Number(val & 0xffn);
    val >>= 8n;
  }
  formatted.set(negYBytes, 32);

  // Copy B point (128 bytes) and C point (64 bytes) unchanged
  formatted.set(proofBytes.slice(64, 256), 64);

  return formatted;
}
