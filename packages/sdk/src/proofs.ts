/**
 * Proof generation for ZK circuits
 *
 * Uses Noir circuits compiled via Sunspot for Groth16 proofs
 */

import type {
  Keypair,
  TransferParams,
  AdapterSwapParams,
  OrderParams,
  Groth16Proof,
  TransferProofInputs,
  DecryptedNote,
  MerkleProof,
} from '@cloakcraft/types';
import { deriveNullifierKey, deriveSpendingNullifier } from './crypto/nullifier';
import { computeCommitment } from './crypto/commitment';
import { generateStealthAddress } from './crypto/stealth';

// BN254 field modulus for Y-coordinate negation
const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');

/**
 * Circuit artifacts loaded from compiled Noir circuits
 */
interface CircuitArtifacts {
  /** Compiled circuit manifest */
  manifest: any;
  /** Proving key bytes */
  provingKey: Uint8Array;
  /** Witness generator WASM (optional, for browser) */
  wasmBytes?: Uint8Array;
}

/**
 * Proof generator using Noir circuits compiled via Sunspot
 */
export class ProofGenerator {
  private circuits: Map<string, CircuitArtifacts> = new Map();
  private baseUrl: string;
  private isInitialized = false;

  constructor(config?: { baseUrl?: string }) {
    this.baseUrl = config?.baseUrl ?? '/circuits';
  }

  /**
   * Initialize the prover with circuit artifacts
   */
  async initialize(circuitNames?: string[]): Promise<void> {
    const circuits = circuitNames ?? [
      'transfer/1x2',
      'transfer/1x3',
      'adapter/1x1',
      'adapter/1x2',
      'market/order_create',
      'market/order_fill',
      'market/order_cancel',
      'swap/add_liquidity',
      'swap/remove_liquidity',
      'swap/swap',
      'governance/encrypted_submit',
    ];

    await Promise.all(circuits.map(name => this.loadCircuit(name)));
    this.isInitialized = true;
  }

  /**
   * Load a circuit's artifacts
   */
  async loadCircuit(name: string): Promise<void> {
    const basePath = `${this.baseUrl}/${name}/target`;

    try {
      // Load compiled circuit manifest
      const manifestRes = await fetch(`${basePath}/${name.split('/').pop()}.json`);
      if (!manifestRes.ok) throw new Error(`Failed to load manifest: ${manifestRes.status}`);
      const manifest = await manifestRes.json();

      // Load proving key
      const pkRes = await fetch(`${basePath}/${name.split('/').pop()}.pk`);
      if (!pkRes.ok) throw new Error(`Failed to load proving key: ${pkRes.status}`);
      const provingKey = new Uint8Array(await pkRes.arrayBuffer());

      // Optionally load WASM for browser witness generation
      let wasmBytes: Uint8Array | undefined;
      try {
        const wasmRes = await fetch(`${basePath}/${name.split('/').pop()}.wasm`);
        if (wasmRes.ok) {
          wasmBytes = new Uint8Array(await wasmRes.arrayBuffer());
        }
      } catch {
        // WASM is optional
      }

      this.circuits.set(name, { manifest, provingKey, wasmBytes });
    } catch (err) {
      console.warn(`Failed to load circuit ${name}:`, err);
    }
  }

  /**
   * Check if a circuit is loaded
   */
  hasCircuit(name: string): boolean {
    return this.circuits.has(name);
  }

  /**
   * Generate a transfer proof (1 input, 2 outputs)
   */
  async generateTransferProof(
    params: TransferParams,
    keypair: Keypair
  ): Promise<Uint8Array> {
    const circuitName = params.inputs.length === 1 ? 'transfer/1x2' : 'transfer/1x3';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    const nullifierKey = deriveNullifierKey(keypair.spending.sk);

    // Build witness inputs
    const witnessInputs = this.buildTransferWitness(params, nullifierKey);

    return this.prove(circuitName, witnessInputs);
  }

  /**
   * Generate an adapter swap proof
   */
  async generateAdapterProof(
    params: AdapterSwapParams,
    keypair: Keypair
  ): Promise<Uint8Array> {
    const circuitName = 'adapter/1x1';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    const nullifierKey = deriveNullifierKey(keypair.spending.sk);

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(deriveSpendingNullifier(
        nullifierKey,
        computeCommitment(
          params.input.stealthPubX,
          params.input.tokenMint,
          params.input.amount,
          params.input.randomness
        ),
        params.input.leafIndex
      )),
      input_amount: params.input.amount.toString(),
      output_commitment: fieldToHex(params.outputCommitment),
      change_commitment: fieldToHex(params.changeCommitment),
      adapter_program: fieldToHex(params.adapter),
      min_output: params.minOutput.toString(),

      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_stealth_pub_y: fieldToHex(params.input.stealthPubY),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(keypair.spending.sk),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map(i => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      token_mint: fieldToHex(params.input.tokenMint),
      // ... other fields
    };

    return this.prove(circuitName, witnessInputs);
  }

  /**
   * Generate an order creation proof
   */
  async generateOrderProof(
    params: OrderParams,
    keypair: Keypair
  ): Promise<Uint8Array> {
    const circuitName = 'market/order_create';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    const nullifierKey = deriveNullifierKey(keypair.spending.sk);

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(params.nullifier),
      order_id: fieldToHex(params.orderId),
      escrow_commitment: fieldToHex(params.escrowCommitment),
      terms_hash: fieldToHex(params.termsHash),
      expiry: params.expiry.toString(),

      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_stealth_pub_y: fieldToHex(params.input.stealthPubY),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(keypair.spending.sk),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map(i => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      offer_token: fieldToHex(params.terms.offerToken),
      offer_amount: params.terms.offerAmount.toString(),
      ask_token: fieldToHex(params.terms.askToken),
      ask_amount: params.terms.askAmount.toString(),
      escrow_stealth_pub_x: fieldToHex(params.escrowStealthPubX),
      escrow_randomness: fieldToHex(params.escrowRandomness),
      maker_receive_stealth_pub_x: fieldToHex(params.makerReceiveStealthPubX),
    };

    return this.prove(circuitName, witnessInputs);
  }

  /**
   * Generate a vote proof
   */
  async generateVoteProof(
    note: DecryptedNote,
    keypair: Keypair,
    proposalId: Uint8Array,
    voteChoice: number,
    electionPubkey: { x: Uint8Array; y: Uint8Array },
    encryptionRandomness: { yes: Uint8Array; no: Uint8Array; abstain: Uint8Array }
  ): Promise<Uint8Array> {
    const circuitName = 'governance/encrypted_submit';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    const nullifierKey = deriveNullifierKey(keypair.spending.sk);

    const witnessInputs = {
      // Public inputs filled by circuit
      merkle_root: fieldToHex(note.merkleRoot),
      proposal_id: fieldToHex(proposalId),
      token_mint: fieldToHex(note.tokenMint),
      election_pubkey_x: fieldToHex(electionPubkey.x),
      election_pubkey_y: fieldToHex(electionPubkey.y),
      // Encrypted vote ciphertexts computed by circuit

      // Private inputs
      in_stealth_pub_x: fieldToHex(note.stealthPubX),
      in_stealth_pub_y: fieldToHex(note.stealthPubY),
      in_amount: note.amount.toString(),
      in_randomness: fieldToHex(note.randomness),
      in_stealth_spending_key: fieldToHex(keypair.spending.sk),
      merkle_path: note.merklePath.map(fieldToHex),
      merkle_path_indices: note.merkleIndices.map(i => i.toString()),
      vote_choice: voteChoice.toString(),
      encryption_randomness_yes: fieldToHex(encryptionRandomness.yes),
      encryption_randomness_no: fieldToHex(encryptionRandomness.no),
      encryption_randomness_abstain: fieldToHex(encryptionRandomness.abstain),
    };

    return this.prove(circuitName, witnessInputs);
  }

  // =============================================================================
  // Core Proving
  // =============================================================================

  /**
   * Generate a Groth16 proof for a circuit
   */
  private async prove(circuitName: string, inputs: Record<string, any>): Promise<Uint8Array> {
    const artifacts = this.circuits.get(circuitName);
    if (!artifacts) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    // In production: Use @noir-lang/noir_js for witness generation
    // and Sunspot's Groth16 prover for proof generation
    //
    // const noir = new Noir(artifacts.manifest);
    // const { witness } = await noir.execute(inputs);
    // const proof = await sunspot.prove(witness, artifacts.provingKey);
    //
    // For now, delegate to native prover via WASM or worker

    const proof = await this.proveNative(circuitName, inputs, artifacts);

    // Format proof for Solana (negate A-component)
    return this.formatProofForSolana(proof);
  }

  /**
   * Native Groth16 prover (WASM-based)
   */
  private async proveNative(
    circuitName: string,
    inputs: Record<string, any>,
    artifacts: CircuitArtifacts
  ): Promise<{ a: Uint8Array; b: Uint8Array; c: Uint8Array }> {
    // This is where we'd call the actual prover
    // Options:
    // 1. @noir-lang/bb.js for browser
    // 2. Native Sunspot CLI via subprocess (Node.js)
    // 3. Remote proving service

    // For development, check if we have the native prover
    if (typeof window === 'undefined') {
      // Node.js environment - could call native prover
      return this.proveViaSubprocess(circuitName, inputs, artifacts);
    } else {
      // Browser environment - use WASM
      return this.proveViaWasm(circuitName, inputs, artifacts);
    }
  }

  /**
   * Prove via subprocess (Node.js)
   */
  private async proveViaSubprocess(
    circuitName: string,
    inputs: Record<string, any>,
    artifacts: CircuitArtifacts
  ): Promise<{ a: Uint8Array; b: Uint8Array; c: Uint8Array }> {
    // In production: Write inputs to temp file, run sunspot prove, read result
    // For now, return placeholder
    console.log(`Generating ${circuitName} proof via subprocess...`);
    console.log('Inputs:', JSON.stringify(inputs, null, 2).slice(0, 500) + '...');

    // Return placeholder proof
    return {
      a: new Uint8Array(64),
      b: new Uint8Array(128),
      c: new Uint8Array(64),
    };
  }

  /**
   * Prove via WASM (browser)
   */
  private async proveViaWasm(
    circuitName: string,
    inputs: Record<string, any>,
    artifacts: CircuitArtifacts
  ): Promise<{ a: Uint8Array; b: Uint8Array; c: Uint8Array }> {
    // In production: Use @noir-lang/bb.js
    // const { witness } = await Noir.execute(inputs, artifacts.manifest);
    // return bb.groth16Prove(witness, artifacts.provingKey);

    console.log(`Generating ${circuitName} proof via WASM...`);

    // Return placeholder proof
    return {
      a: new Uint8Array(64),
      b: new Uint8Array(128),
      c: new Uint8Array(64),
    };
  }

  /**
   * Format proof for Solana's alt_bn128 pairing check
   *
   * Solana uses the equation: e(-A, B) * e(alpha, beta) * e(PIC, gamma) * e(C, delta) = 1
   * This requires negating the A-component (negating Y coordinate)
   */
  private formatProofForSolana(proof: { a: Uint8Array; b: Uint8Array; c: Uint8Array }): Uint8Array {
    const formatted = new Uint8Array(256);

    // A point (64 bytes) - negate Y coordinate
    formatted.set(proof.a.slice(0, 32), 0); // X unchanged

    // Negate Y: -Y = p - Y where p is the field modulus
    const yBytes = proof.a.slice(32, 64);
    const y = bytesToBigInt(yBytes);
    const negY = y === 0n ? 0n : BN254_FIELD_MODULUS - y;
    const negYBytes = bigIntToBytes(negY, 32);
    formatted.set(negYBytes, 32);

    // B point (128 bytes) - unchanged
    formatted.set(proof.b, 64);

    // C point (64 bytes) - unchanged
    formatted.set(proof.c, 192);

    return formatted;
  }

  // =============================================================================
  // Witness Building Helpers
  // =============================================================================

  private buildTransferWitness(
    params: TransferParams,
    nullifierKey: Uint8Array
  ): Record<string, any> {
    const input = params.inputs[0];
    const commitment = computeCommitment(
      input.stealthPubX,
      input.tokenMint,
      input.amount,
      input.randomness
    );
    const nullifier = deriveSpendingNullifier(nullifierKey, commitment, input.leafIndex);

    return {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      out_commitment_1: fieldToHex(params.outputs[0].commitment),
      out_commitment_2: fieldToHex(params.outputs[1]?.commitment ?? new Uint8Array(32)),
      unshield_amount: (params.unshield?.amount ?? 0n).toString(),
      unshield_recipient: fieldToHex(params.unshield?.recipient ?? new Uint8Array(32)),

      // Private inputs
      in_stealth_pub_x: fieldToHex(input.stealthPubX),
      in_stealth_pub_y: fieldToHex(input.stealthPubY),
      in_amount: input.amount.toString(),
      in_randomness: fieldToHex(input.randomness),
      in_stealth_spending_key: fieldToHex(input.spendingKey),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map(i => i.toString()),
      leaf_index: input.leafIndex.toString(),
      token_mint: fieldToHex(input.tokenMint),

      // Output 1
      out_1_stealth_pub_x: fieldToHex(params.outputs[0].stealthPubX),
      out_1_amount: params.outputs[0].amount.toString(),
      out_1_randomness: fieldToHex(params.outputs[0].randomness),

      // Output 2
      out_2_stealth_pub_x: fieldToHex(params.outputs[1]?.stealthPubX ?? new Uint8Array(32)),
      out_2_amount: (params.outputs[1]?.amount ?? 0n).toString(),
      out_2_randomness: fieldToHex(params.outputs[1]?.randomness ?? new Uint8Array(32)),
    };
  }

  private buildMerkleProof(note: DecryptedNote): MerkleProof {
    return {
      root: note.merkleRoot,
      pathElements: note.merklePath,
      pathIndices: note.merkleIndices,
      leafIndex: note.leafIndex,
    };
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert field element (Uint8Array) to hex string for Noir
 */
function fieldToHex(bytes: Uint8Array | bigint | number): string {
  if (typeof bytes === 'bigint') {
    return '0x' + bytes.toString(16).padStart(64, '0');
  }
  if (typeof bytes === 'number') {
    return '0x' + bytes.toString(16).padStart(64, '0');
  }
  return '0x' + Buffer.from(bytes).toString('hex');
}

/**
 * Convert bytes to BigInt (big-endian)
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

/**
 * Convert BigInt to bytes (big-endian)
 */
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

/**
 * Parse a Groth16 proof from bytes
 */
export function parseGroth16Proof(bytes: Uint8Array): Groth16Proof {
  if (bytes.length !== 256) {
    throw new Error(`Invalid proof length: ${bytes.length}`);
  }

  return {
    a: bytes.slice(0, 64),
    b: bytes.slice(64, 192),
    c: bytes.slice(192, 256),
  };
}

/**
 * Serialize a Groth16 proof to bytes
 */
export function serializeGroth16Proof(proof: Groth16Proof): Uint8Array {
  const bytes = new Uint8Array(256);
  bytes.set(proof.a, 0);
  bytes.set(proof.b, 64);
  bytes.set(proof.c, 192);
  return bytes;
}
