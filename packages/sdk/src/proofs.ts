/**
 * Proof generation for ZK circuits
 *
 * Uses Noir circuits compiled via Sunspot for Groth16 proofs
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type {
  Keypair,
  TransferParams,
  AdapterSwapParams,
  OrderParams,
  VoteParams,
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
 * Configuration for Node.js proof generation
 */
interface NodeProverConfig {
  /** Path to circuits directory */
  circuitsDir: string;
  /** Path to sunspot binary */
  sunspotPath: string;
  /** Path to nargo binary */
  nargoPath: string;
}

/**
 * Circuit name mapping (SDK name -> file name)
 */
const CIRCUIT_FILE_MAP: Record<string, string> = {
  'transfer/1x2': 'transfer_1x2',
  'transfer/1x3': 'transfer_1x3',
  'adapter/1x1': 'adapter_1x1',
  'adapter/1x2': 'adapter_1x2',
  'market/order_create': 'market_order_create',
  'market/order_fill': 'market_order_fill',
  'market/order_cancel': 'market_order_cancel',
  'swap/add_liquidity': 'swap_add_liquidity',
  'swap/remove_liquidity': 'swap_remove_liquidity',
  'swap/swap': 'swap_swap',
  'governance/encrypted_submit': 'governance_encrypted_submit',
};

/**
 * Circuit directory mapping (SDK name -> circuit source dir)
 */
const CIRCUIT_DIR_MAP: Record<string, string> = {
  'transfer/1x2': 'transfer/1x2',
  'transfer/1x3': 'transfer/1x3',
  'adapter/1x1': 'adapter/1x1',
  'adapter/1x2': 'adapter/1x2',
  'market/order_create': 'market/order_create',
  'market/order_fill': 'market/order_fill',
  'market/order_cancel': 'market/order_cancel',
  'swap/add_liquidity': 'swap/add_liquidity',
  'swap/remove_liquidity': 'swap/remove_liquidity',
  'swap/swap': 'swap/swap',
  'governance/encrypted_submit': 'governance/encrypted_submit',
};

/**
 * Proof generator using Noir circuits compiled via Sunspot
 */
export class ProofGenerator {
  private circuits: Map<string, CircuitArtifacts> = new Map();
  private baseUrl: string;
  private isInitialized = false;
  private nodeConfig?: NodeProverConfig;

  constructor(config?: { baseUrl?: string; nodeConfig?: NodeProverConfig }) {
    this.baseUrl = config?.baseUrl ?? '/circuits';
    this.nodeConfig = config?.nodeConfig;
  }

  /**
   * Configure for Node.js proving (auto-detects paths if not provided)
   */
  configureForNode(config?: Partial<NodeProverConfig>): void {
    const homeDir = os.homedir();
    this.nodeConfig = {
      circuitsDir: config?.circuitsDir ?? path.resolve(__dirname, '../../../circuits'),
      sunspotPath: config?.sunspotPath ?? path.resolve(__dirname, '../../../scripts/sunspot'),
      nargoPath: config?.nargoPath ?? path.join(homeDir, '.nargo/bin/nargo'),
    };
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
   *
   * In Node.js with nodeConfig set, loads from file system.
   * In browser, loads via fetch from baseUrl.
   */
  async loadCircuit(name: string): Promise<void> {
    // Detect environment: Node.js vs browser
    const isNode = typeof globalThis.process !== 'undefined'
      && globalThis.process.versions != null
      && globalThis.process.versions.node != null;

    if (isNode && this.nodeConfig) {
      return this.loadCircuitFromFs(name);
    } else {
      return this.loadCircuitFromUrl(name);
    }
  }

  /**
   * Load circuit from file system (Node.js)
   */
  private async loadCircuitFromFs(name: string): Promise<void> {
    if (!this.nodeConfig) {
      throw new Error('Node.js prover not configured');
    }

    const circuitFileName = CIRCUIT_FILE_MAP[name];
    if (!circuitFileName) {
      throw new Error(`Unknown circuit: ${name}`);
    }

    const targetDir = path.join(this.nodeConfig.circuitsDir, 'target');
    const manifestPath = path.join(targetDir, `${circuitFileName}.json`);
    const pkPath = path.join(targetDir, `${circuitFileName}.pk`);

    try {
      // Load compiled circuit manifest
      const manifestData = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestData);

      // Load proving key
      const provingKey = new Uint8Array(fs.readFileSync(pkPath));

      this.circuits.set(name, { manifest, provingKey });
      console.log(`[${name}] Loaded circuit from ${targetDir}`);
    } catch (err) {
      console.warn(`Failed to load circuit ${name}:`, err);
    }
  }

  /**
   * Load circuit from URL (browser)
   */
  private async loadCircuitFromUrl(name: string): Promise<void> {
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
    const witnessInputs = this.buildTransferWitness(params, keypair.spending.sk, nullifierKey);

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

    // Convert PublicKeys to bytes
    const adapterBytes = params.adapter.toBytes();
    const tokenMint = params.input.tokenMint instanceof Uint8Array
      ? params.input.tokenMint
      : params.input.tokenMint.toBytes();

    // Compute commitment and nullifier from input note
    const inputCommitment = computeCommitment(params.input);
    const inputNullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, params.input.leafIndex);

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(inputNullifier),
      input_amount: params.input.amount.toString(),
      output_commitment: fieldToHex(params.outputCommitment),
      change_commitment: fieldToHex(params.changeCommitment),
      adapter_program: fieldToHex(adapterBytes),
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
      token_mint: fieldToHex(tokenMint),
      out_stealth_pub_x: fieldToHex(params.outputStealthPubX),
      out_randomness: fieldToHex(params.outputRandomness),
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

    // Convert PublicKeys to bytes
    const offerMintBytes = params.terms.offerMint.toBytes();
    const requestMintBytes = params.terms.requestMint.toBytes();

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
      offer_token: fieldToHex(offerMintBytes),
      offer_amount: params.terms.offerAmount.toString(),
      ask_token: fieldToHex(requestMintBytes),
      ask_amount: params.terms.requestAmount.toString(),
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
    params: VoteParams,
    keypair: Keypair
  ): Promise<Uint8Array> {
    const circuitName = 'governance/encrypted_submit';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    // Convert PublicKey to bytes if needed
    const tokenMint = params.input.tokenMint instanceof Uint8Array
      ? params.input.tokenMint
      : params.input.tokenMint.toBytes();

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      proposal_id: fieldToHex(params.proposalId),
      token_mint: fieldToHex(tokenMint),
      election_pubkey_x: fieldToHex(params.electionPubkey.x),
      election_pubkey_y: fieldToHex(params.electionPubkey.y),

      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_stealth_pub_y: fieldToHex(params.input.stealthPubY),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(keypair.spending.sk),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map((i: number) => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      vote_choice: params.voteChoice.toString(),
      encryption_randomness_yes: fieldToHex(params.encryptionRandomness.yes),
      encryption_randomness_no: fieldToHex(params.encryptionRandomness.no),
      encryption_randomness_abstain: fieldToHex(params.encryptionRandomness.abstain),
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

    // Detect environment: Node.js vs browser
    const isNode = typeof globalThis.process !== 'undefined'
      && globalThis.process.versions != null
      && globalThis.process.versions.node != null;

    if (isNode) {
      // Node.js environment - use native Sunspot CLI
      return this.proveViaSubprocess(circuitName, inputs, artifacts);
    } else {
      // Browser environment - use WASM
      return this.proveViaWasm(circuitName, inputs, artifacts);
    }
  }

  /**
   * Prove via subprocess (Node.js)
   *
   * Workflow:
   * 1. Write Prover.toml with inputs
   * 2. Run nargo execute to generate witness
   * 3. Run sunspot prove with witness, ACIR, CCS, PK
   * 4. Parse proof output
   */
  private async proveViaSubprocess(
    circuitName: string,
    inputs: Record<string, any>,
    artifacts: CircuitArtifacts
  ): Promise<{ a: Uint8Array; b: Uint8Array; c: Uint8Array }> {
    // Dynamic import for Node.js child_process (avoids bundling issues)
    const { execFileSync } = await import('child_process');

    if (!this.nodeConfig) {
      throw new Error('Node.js prover not configured. Call configureForNode() first.');
    }

    const { circuitsDir, sunspotPath, nargoPath } = this.nodeConfig;
    const circuitFileName = CIRCUIT_FILE_MAP[circuitName];
    const circuitDirName = CIRCUIT_DIR_MAP[circuitName];

    if (!circuitFileName || !circuitDirName) {
      throw new Error(`Unknown circuit: ${circuitName}`);
    }

    // Paths to circuit artifacts
    const circuitDir = path.join(circuitsDir, circuitDirName);
    const targetDir = path.join(circuitsDir, 'target');
    const acirPath = path.join(targetDir, `${circuitFileName}.json`);
    const ccsPath = path.join(targetDir, `${circuitFileName}.ccs`);
    const pkPath = path.join(targetDir, `${circuitFileName}.pk`);

    // Verify all required files exist
    if (!fs.existsSync(acirPath)) throw new Error(`ACIR not found: ${acirPath}`);
    if (!fs.existsSync(ccsPath)) throw new Error(`CCS not found: ${ccsPath}`);
    if (!fs.existsSync(pkPath)) throw new Error(`PK not found: ${pkPath}`);

    // Create temp directory for this proof
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cloakcraft-proof-'));

    try {
      // Step 1: Write Prover.toml
      const proverToml = this.inputsToProverToml(inputs);
      const proverPath = path.join(circuitDir, 'Prover.toml');
      fs.writeFileSync(proverPath, proverToml);

      // Step 2: Run nargo execute to generate witness
      console.log(`[${circuitName}] Generating witness...`);
      const witnessName = circuitFileName;

      try {
        execFileSync(nargoPath, ['execute', witnessName], {
          cwd: circuitDir,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (err: any) {
        const stderr = err.stderr?.toString() || '';
        const stdout = err.stdout?.toString() || '';
        throw new Error(`nargo execute failed: ${stderr || stdout || err.message}`);
      }

      // Witness is output to target/<name>.gz
      const witnessPath = path.join(targetDir, `${circuitFileName}.gz`);
      if (!fs.existsSync(witnessPath)) {
        throw new Error(`Witness not generated at ${witnessPath}`);
      }

      // Step 3: Run sunspot prove
      console.log(`[${circuitName}] Generating Groth16 proof...`);
      const proofPath = path.join(tempDir, 'proof.bin');

      try {
        // sunspot prove [acir] [witness] [ccs] [pk]
        // Outputs proof.bin and public.bin in current directory
        execFileSync(sunspotPath, ['prove', acirPath, witnessPath, ccsPath, pkPath], {
          cwd: tempDir,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (err: any) {
        const stderr = err.stderr?.toString() || '';
        const stdout = err.stdout?.toString() || '';
        throw new Error(`sunspot prove failed: ${stderr || stdout || err.message}`);
      }

      // Step 4: Parse proof output
      if (!fs.existsSync(proofPath)) {
        throw new Error(`Proof not generated at ${proofPath}`);
      }

      const proofBytes = fs.readFileSync(proofPath);
      console.log(`[${circuitName}] Proof generated (${proofBytes.length} bytes)`);

      // Parse Groth16 proof structure
      // Format: A (64 bytes) + B (128 bytes) + C (64 bytes) = 256 bytes
      if (proofBytes.length !== 256) {
        throw new Error(`Unexpected proof size: ${proofBytes.length} (expected 256)`);
      }

      return {
        a: new Uint8Array(proofBytes.slice(0, 64)),
        b: new Uint8Array(proofBytes.slice(64, 192)),
        c: new Uint8Array(proofBytes.slice(192, 256)),
      };
    } finally {
      // Cleanup temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }

  /**
   * Convert witness inputs to Prover.toml format
   */
  private inputsToProverToml(inputs: Record<string, any>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(inputs)) {
      if (Array.isArray(value)) {
        // Array format: key = ["value1", "value2", ...]
        const values = value.map(v => `"${v}"`).join(', ');
        lines.push(`${key} = [${values}]`);
      } else {
        // Scalar format: key = "value"
        lines.push(`${key} = "${value}"`);
      }
    }

    return lines.join('\n') + '\n';
  }

  /** URL for remote Groth16 proving service (browser only) */
  private remoteProverUrl?: string;

  /**
   * Configure remote prover for browser environments
   *
   * Since Groth16 proving requires heavy computation,
   * browser environments should use a remote proving service.
   */
  configureRemoteProver(url: string): void {
    this.remoteProverUrl = url;
  }

  /**
   * Prove via WASM/remote service (browser)
   *
   * Workflow:
   * 1. Use @noir-lang/noir_js to generate witness from inputs
   * 2. Send witness + circuit artifacts to remote prover
   * 3. Receive Groth16 proof
   */
  private async proveViaWasm(
    circuitName: string,
    inputs: Record<string, any>,
    artifacts: CircuitArtifacts
  ): Promise<{ a: Uint8Array; b: Uint8Array; c: Uint8Array }> {
    console.log(`[${circuitName}] Generating witness via noir_js...`);

    // Dynamic import to avoid bundling issues in Node.js
    const { Noir } = await import('@noir-lang/noir_js');

    // Create Noir instance from circuit manifest
    const noir = new Noir(artifacts.manifest);

    // Execute circuit to generate witness
    const { witness } = await noir.execute(inputs);
    console.log(`[${circuitName}] Witness generated (${witness.length} bytes)`);

    // Use remote prover if configured
    if (this.remoteProverUrl) {
      return this.proveViaRemote(circuitName, witness, artifacts);
    }

    // Fallback: return error for browser without remote prover
    throw new Error(
      `Browser Groth16 proving requires a remote prover. ` +
      `Call configureRemoteProver(url) before generating proofs.`
    );
  }

  /**
   * Send witness to remote Groth16 prover
   */
  private async proveViaRemote(
    circuitName: string,
    witness: Uint8Array,
    artifacts: CircuitArtifacts
  ): Promise<{ a: Uint8Array; b: Uint8Array; c: Uint8Array }> {
    if (!this.remoteProverUrl) {
      throw new Error('Remote prover URL not configured');
    }

    console.log(`[${circuitName}] Sending to remote prover...`);

    const response = await fetch(`${this.remoteProverUrl}/prove`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-Circuit-Name': circuitName,
      },
      body: new Blob([
        // Pack witness length (4 bytes) + witness + proving key
        new Uint32Array([witness.length]),
        witness,
        artifacts.provingKey,
      ]),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Remote prover error: ${error}`);
    }

    const proofBytes = new Uint8Array(await response.arrayBuffer());
    console.log(`[${circuitName}] Received proof (${proofBytes.length} bytes)`);

    if (proofBytes.length !== 256) {
      throw new Error(`Invalid proof size from remote prover: ${proofBytes.length}`);
    }

    return {
      a: proofBytes.slice(0, 64),
      b: proofBytes.slice(64, 192),
      c: proofBytes.slice(192, 256),
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
    spendingKey: Uint8Array,
    nullifierKey: Uint8Array
  ): Record<string, any> {
    const input = params.inputs[0];
    // input is a DecryptedNote which extends Note, so we can pass it directly
    const commitment = computeCommitment(input);
    const nullifier = deriveSpendingNullifier(nullifierKey, commitment, input.leafIndex);

    // Convert PublicKey to field if present
    const tokenMint = input.tokenMint instanceof Uint8Array
      ? input.tokenMint
      : input.tokenMint.toBytes();

    return {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      out_commitment_1: fieldToHex(params.outputs[0].commitment),
      out_commitment_2: fieldToHex(params.outputs[1]?.commitment ?? new Uint8Array(32)),
      token_mint: fieldToHex(tokenMint),
      unshield_amount: (params.unshield?.amount ?? 0n).toString(),

      // Private inputs
      in_stealth_pub_x: fieldToHex(input.stealthPubX),
      in_stealth_pub_y: fieldToHex(input.stealthPubY),
      in_amount: input.amount.toString(),
      in_randomness: fieldToHex(input.randomness),
      in_stealth_spending_key: fieldToHex(spendingKey),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map(i => i.toString()),
      leaf_index: input.leafIndex.toString(),

      // Output 1 (recipient)
      out_stealth_pub_x_1: fieldToHex(params.outputs[0].stealthPubX),
      out_amount_1: params.outputs[0].amount.toString(),
      out_randomness_1: fieldToHex(params.outputs[0].randomness),

      // Output 2 (change)
      out_stealth_pub_x_2: fieldToHex(params.outputs[1]?.stealthPubX ?? new Uint8Array(32)),
      out_amount_2: (params.outputs[1]?.amount ?? 0n).toString(),
      out_randomness_2: fieldToHex(params.outputs[1]?.randomness ?? new Uint8Array(32)),
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
