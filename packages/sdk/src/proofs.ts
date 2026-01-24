/**
 * Proof generation for ZK circuits
 *
 * Uses Circom circuits with snarkjs for Groth16 proofs.
 * Works in both browser and Node.js environments.
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
  AmmSwapParams,
  AddLiquidityParams,
  RemoveLiquidityParams,
  FillOrderParams,
  CancelOrderParams,
  ConsolidationParams,
  OpenPerpsPositionParams,
  ClosePerpsPositionParams,
  PerpsAddLiquidityClientParams,
  PerpsRemoveLiquidityClientParams,
  DecryptedNote,
} from '@cloakcraft/types';
import { deriveNullifierKey, deriveSpendingNullifier } from './crypto/nullifier';
import { computeCommitment, generateRandomness } from './crypto/commitment';
import { deriveStealthPrivateKey } from './crypto/stealth';
import { bytesToField, fieldToBytes, poseidonHash, poseidonHashDomain, DOMAIN_COMMITMENT } from './crypto/poseidon';
import { pubkeyToField } from './crypto/field';
import { PublicKey } from '@solana/web3.js';
import {
  loadCircomArtifacts,
  generateSnarkjsProof,
  bytesToFieldString,
  bigintToFieldString,
  clearCircomCache,
  type CircomArtifacts,
} from './snarkjs-prover';

// BN254 field modulus for Y-coordinate negation
const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');

/**
 * Circuit artifacts loaded from compiled Circom circuits
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
  /** Path to circom build directory */
  circomBuildDir: string;
}

/**
 * Circuit name mapping (SDK name -> file name)
 */
const CIRCUIT_FILE_MAP: Record<string, string> = {
  'transfer/1x2': 'transfer_1x2',
  'consolidate/3x1': 'consolidate_3x1',
  'adapter/1x1': 'adapter_1x1',
  'adapter/1x2': 'adapter_1x2',
  'market/order_create': 'market_order_create',
  'market/order_fill': 'market_order_fill',
  'market/order_cancel': 'market_order_cancel',
  'swap/add_liquidity': 'swap_add_liquidity',
  'swap/remove_liquidity': 'swap_remove_liquidity',
  'swap/swap': 'swap_swap',
  // Perps circuits
  'perps/open_position': 'open_position',
  'perps/close_position': 'close_position',
  'perps/add_liquidity': 'add_liquidity',
  'perps/remove_liquidity': 'remove_liquidity',
  'perps/liquidate': 'liquidate',
};

/**
 * Circuit directory mapping (SDK name -> circuit source dir)
 */
const CIRCUIT_DIR_MAP: Record<string, string> = {
  'transfer/1x2': 'transfer/1x2',
  'consolidate/3x1': 'consolidate/3x1',
  'adapter/1x1': 'adapter/1x1',
  'adapter/1x2': 'adapter/1x2',
  'market/order_create': 'market/order_create',
  'market/order_fill': 'market/order_fill',
  'market/order_cancel': 'market/order_cancel',
  'swap/add_liquidity': 'swap/add_liquidity',
  'swap/remove_liquidity': 'swap/remove_liquidity',
  'swap/swap': 'swap/swap',
  // Perps circuits
  'perps/open_position': 'perps/open_position',
  'perps/close_position': 'perps/close_position',
  'perps/add_liquidity': 'perps/add_liquidity',
  'perps/remove_liquidity': 'perps/remove_liquidity',
  'perps/liquidate': 'perps/liquidate',
};

/**
 * Proof generator using Circom circuits with snarkjs
 */
export class ProofGenerator {
  private circuits: Map<string, CircuitArtifacts> = new Map();
  private baseUrl: string;
  private nodeConfig?: NodeProverConfig;

  constructor(config?: { baseUrl?: string; nodeConfig?: NodeProverConfig }) {
    this.baseUrl = config?.baseUrl ?? '/circuits';
    this.nodeConfig = config?.nodeConfig;
  }

  /**
   * Configure for Node.js proving (auto-detects paths if not provided)
   */
  configureForNode(config?: Partial<NodeProverConfig>): void {
    this.nodeConfig = {
      circuitsDir: config?.circuitsDir ?? path.resolve(__dirname, '../../../circom-circuits/circuits'),
      circomBuildDir: config?.circomBuildDir ?? path.resolve(__dirname, '../../../circom-circuits/build'),
    };
  }

  /**
   * Clear all circuit caches
   *
   * Call this to force reloading of circuit files after they've been recompiled.
   */
  clearCache(): void {
    this.circuits.clear();
    this.circomArtifacts.clear();
    clearCircomCache();
  }

  /**
   * Initialize the prover with circuit artifacts
   */
  async initialize(circuitNames?: string[]): Promise<void> {
    const circuits = circuitNames ?? [
      'transfer/1x2',
      'consolidate/3x1',
      'adapter/1x1',
      'adapter/1x2',
      'market/order_create',
      'market/order_fill',
      'market/order_cancel',
      'swap/add_liquidity',
      'swap/remove_liquidity',
      'swap/swap',
    ];

    await Promise.all(circuits.map(name => this.loadCircuit(name)));
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
   *
   * Note: For circom circuits, we use on-demand loading via snarkjs.
   * The manifest/pk files are optional - if they don't exist, we skip
   * and rely on the .wasm/.zkey files being loaded during proof generation.
   */
  private async loadCircuitFromFs(name: string): Promise<void> {
    if (!this.nodeConfig) {
      throw new Error('Node.js prover not configured');
    }

    const circuitFileName = CIRCUIT_FILE_MAP[name];
    if (!circuitFileName) {
      // Check if this is a circom circuit path (contains /)
      if (name.includes('/')) {
        // Circom circuits are loaded on-demand via snarkjs, no pre-loading needed
        // Just verify the circuit files exist in the build directory
        const { wasmPath } = this.getCircomFilePaths(name);
        const fullWasmPath = path.join(this.nodeConfig.circomBuildDir, wasmPath);
        if (fs.existsSync(fullWasmPath)) {
          // Mark as available (empty artifacts - actual loading happens on-demand)
          this.circuits.set(name, { manifest: {}, provingKey: new Uint8Array() });
          return;
        }
      }
      throw new Error(`Unknown circuit: ${name}`);
    }

    const targetDir = path.join(this.nodeConfig.circuitsDir, 'target');
    const manifestPath = path.join(targetDir, `${circuitFileName}.json`);
    const pkPath = path.join(targetDir, `${circuitFileName}.pk`);

    // Check if manifest files exist - if not, use on-demand loading
    if (!fs.existsSync(manifestPath)) {
      // Try circom build directory instead
      const { wasmPath } = this.getCircomFilePaths(name);
      const fullWasmPath = path.join(this.nodeConfig.circomBuildDir, wasmPath);
      if (fs.existsSync(fullWasmPath)) {
        // Mark as available (empty artifacts - actual loading happens on-demand)
        this.circuits.set(name, { manifest: {}, provingKey: new Uint8Array() });
        return;
      }
      console.warn(`Circuit ${name} not found in target or build directory`);
      return;
    }

    try {
      // Load compiled circuit manifest
      const manifestData = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestData);

      // Load proving key
      const provingKey = new Uint8Array(fs.readFileSync(pkPath));

      this.circuits.set(name, { manifest, provingKey });
    } catch (err) {
      console.warn(`Failed to load circuit ${name}:`, err);
    }
  }

  /**
   * Load circuit from URL (browser)
   */
  private async loadCircuitFromUrl(name: string): Promise<void> {
    const circuitFileName = CIRCUIT_FILE_MAP[name];
    if (!circuitFileName) {
      console.warn(`Unknown circuit: ${name}`);
      return;
    }

    // Circom circuits are auto-loaded on-demand via snarkjs, skip pre-loading
    // Circom circuits are loaded directly from .wasm and .zkey files at prove time
    console.log(`[Circuit] ${name} will be auto-loaded on-demand from ${this.baseUrl}/`);
    return;
  }

  /**
   * Check if a circuit is loaded or can be auto-loaded
   *
   * Circom circuits are auto-loaded on-demand, so we return true for known circuit names.
   */
  hasCircuit(name: string): boolean {
    // Check if already loaded in circuits cache
    if (this.circuits.has(name)) {
      return true;
    }

    // Check if it's a known Circom circuit (will be auto-loaded)
    const knownCircuits = [
      'transfer/1x2',
      'consolidate/3x1',
      'adapter/1x1',
      'adapter/1x2',
      'market/order_create',
      'market/order_fill',
      'market/order_cancel',
      'swap/add_liquidity',
      'swap/remove_liquidity',
      'swap/swap',
      // Perps circuits
      'perps/open_position',
      'perps/close_position',
      'perps/add_liquidity',
      'perps/remove_liquidity',
      'perps/liquidate',
    ];

    return knownCircuits.includes(name);
  }

  /**
   * Generate a transfer proof (1 input, 2 outputs)
   */
  async generateTransferProof(
    params: TransferParams,
    keypair: Keypair
  ): Promise<Uint8Array> {
    // Always use transfer_1x2 - consolidate notes first if multiple inputs needed
    const circuitName = 'transfer/1x2';

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

  // =============================================================================
  // AMM Swap Proof Generation
  // =============================================================================

  /**
   * Generate a swap proof
   *
   * Returns both the proof and the computed commitments/nullifier
   * so the caller can pass the SAME values to the instruction.
   */
  async generateSwapProof(
    params: AmmSwapParams,
    keypair: Keypair
  ): Promise<{
    proof: Uint8Array;
    nullifier: Uint8Array;
    outCommitment: Uint8Array;
    changeCommitment: Uint8Array;
    outRandomness: Uint8Array;
    changeRandomness: Uint8Array;
  }> {
    const circuitName = 'swap/swap';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    const nullifierKey = deriveNullifierKey(keypair.spending.sk);

    // Derive stealth spending key if ephemeral pubkey exists
    let effectiveSpendingKey: bigint;
    if (params.input.stealthEphemeralPubkey) {
      effectiveSpendingKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.input.stealthEphemeralPubkey
      );
    } else {
      effectiveSpendingKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveSpendingKey));

    // Compute input commitment and nullifier
    const inputCommitment = computeCommitment(params.input);
    const nullifier = deriveSpendingNullifier(effectiveNullifierKey, inputCommitment, params.input.leafIndex);

    // Convert PublicKeys to bytes
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array
      ? params.input.tokenMint
      : params.input.tokenMint.toBytes();
    const outputTokenMint = params.outputTokenMint.toBytes();
    // Reduce pool_id to field element using modular reduction (matches on-chain helpers/field.rs)
    const poolIdBytes = pubkeyToField(params.poolId);

    // Use provided randomness or generate new values
    // IMPORTANT: Caller must use the same randomness for computing commitments!
    const outRandomness = (params as any).outRandomness ?? generateRandomness();
    const changeRandomness = (params as any).changeRandomness ?? generateRandomness();

    // Calculate change amount
    const changeAmount = params.input.amount - params.swapAmount;

    // Build output notes with correct token mints:
    // - Output uses the output token mint (different from input)
    // - Change uses the input token mint (same as spent input)
    const outputNoteWithRandomness = {
      stealthPubX: params.outputRecipient.stealthPubkey.x,
      tokenMint: outputTokenMint as any,
      amount: params.outputAmount,
      randomness: outRandomness,
    };

    const changeNoteWithRandomness = {
      stealthPubX: params.changeRecipient.stealthPubkey.x,
      tokenMint: inputTokenMint as any,
      amount: changeAmount,
      randomness: changeRandomness,
    };

    // Compute output commitments
    const outCommitment = computeCommitment(outputNoteWithRandomness as any);
    const changeCommitment = computeCommitment(changeNoteWithRandomness as any);

    // Use real merkle proof from Light Protocol
    // Pad merkle path to 32 elements (circuit expects fixed size)
    const merklePath = [...params.merklePath];
    while (merklePath.length < 32) {
      merklePath.push(new Uint8Array(32));
    }
    const merkleIndices = [...params.merkleIndices];
    while (merkleIndices.length < 32) {
      merkleIndices.push(0);
    }

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      pool_id: fieldToHex(poolIdBytes),
      out_commitment: fieldToHex(outCommitment),
      change_commitment: fieldToHex(changeCommitment),
      min_output: params.minOutput.toString(),

      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(effectiveSpendingKey)),
      token_mint: fieldToHex(inputTokenMint),

      // Merkle proof from Light Protocol
      merkle_path: merklePath.map(p => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map(i => i.toString()),
      leaf_index: params.input.leafIndex.toString(),

      // Swap parameters
      swap_in_amount: params.swapAmount.toString(),
      swap_a_to_b: params.swapDirection === 'aToB' ? '1' : '0',
      fee_bps: (params.feeBps ?? 30).toString(),

      // Output details
      out_stealth_pub_x: fieldToHex(params.outputRecipient.stealthPubkey.x),
      out_token_mint: fieldToHex(outputTokenMint),
      out_amount: params.outputAmount.toString(),
      out_randomness: fieldToHex(outRandomness),

      // Change details
      change_stealth_pub_x: fieldToHex(params.changeRecipient.stealthPubkey.x),
      change_amount: changeAmount.toString(),
      change_randomness: fieldToHex(changeRandomness),
    };

    const proof = await this.prove(circuitName, witnessInputs);

    // Return proof along with public outputs so caller can use SAME values
    // CRITICAL: Return randomness so encryption uses same values as proof!
    return {
      proof,
      nullifier,
      outCommitment,
      changeCommitment,
      outRandomness,
      changeRandomness,
    };
  }

  /**
   * Generate an add liquidity proof
   *
   * Returns both the proof and the computed commitments/nullifiers
   * so the caller can pass the SAME values to the instruction.
   */
  async generateAddLiquidityProof(
    params: AddLiquidityParams,
    keypair: Keypair
  ): Promise<{
    proof: Uint8Array;
    nullifierA: Uint8Array;
    nullifierB: Uint8Array;
    lpCommitment: Uint8Array;
    changeACommitment: Uint8Array;
    changeBCommitment: Uint8Array;
    lpRandomness: Uint8Array;
    changeARandomness: Uint8Array;
    changeBRandomness: Uint8Array;
  }> {
    const circuitName = 'swap/add_liquidity';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    // Derive effective spending keys for both inputs
    const deriveEffectiveKey = (input: typeof params.inputA) => {
      if (input.stealthEphemeralPubkey) {
        return deriveStealthPrivateKey(
          bytesToField(keypair.spending.sk),
          input.stealthEphemeralPubkey
        );
      }
      return bytesToField(keypair.spending.sk);
    };

    const effectiveKeyA = deriveEffectiveKey(params.inputA);
    const effectiveKeyB = deriveEffectiveKey(params.inputB);
    const nullifierKeyA = deriveNullifierKey(fieldToBytes(effectiveKeyA));
    const nullifierKeyB = deriveNullifierKey(fieldToBytes(effectiveKeyB));

    // Compute commitments and nullifiers - Debug field by field
    console.log(`[Proof Gen] stealthPubX: ${Buffer.from(params.inputA.stealthPubX).toString('hex').slice(0, 16)}...`);
    console.log(`[Proof Gen] amount: ${params.inputA.amount}`);
    console.log(`[Proof Gen] randomness: ${Buffer.from(params.inputA.randomness).toString('hex').slice(0, 16)}...`);
    const mintBytes = params.inputA.tokenMint instanceof Uint8Array ? params.inputA.tokenMint : params.inputA.tokenMint.toBytes();
    console.log(`[Proof Gen] tokenMint bytes: ${Buffer.from(mintBytes).toString('hex').slice(0, 16)}...`);
    const commitmentA = computeCommitment(params.inputA);
    const commitmentB = computeCommitment(params.inputB);
    console.log(`[Proof Gen] COMPUTED: ${Buffer.from(commitmentA).toString('hex').slice(0, 16)}...`);
    console.log(`[Proof Gen] ORIGINAL: ${Buffer.from(params.inputA.commitment).toString('hex').slice(0, 16)}...`);
    if (Buffer.from(commitmentA).toString('hex') !== Buffer.from(params.inputA.commitment).toString('hex')) {
      console.log(`[Proof Gen] ❌ COMMITMENT MISMATCH! This will cause nullifier collision!`);
    }
    const nullifierA = deriveSpendingNullifier(nullifierKeyA, commitmentA, params.inputA.leafIndex);
    const nullifierB = deriveSpendingNullifier(nullifierKeyB, commitmentB, params.inputB.leafIndex);
    console.log(`[Proof Gen] Computed nullifier A: ${Buffer.from(nullifierA).toString('hex').slice(0, 16)}...`);

    // Reduce pool_id to field element using modular reduction (matches on-chain helpers/field.rs)
    const poolIdBytes = pubkeyToField(params.poolId);

    // Use provided randomness or generate new values
    // IMPORTANT: Caller must use the same randomness for computing commitments!
    const lpRandomness = (params as any).lpRandomness ?? generateRandomness();
    const changeARandomness = (params as any).changeARandomness ?? generateRandomness();
    const changeBRandomness = (params as any).changeBRandomness ?? generateRandomness();

    // Calculate change amounts
    const changeAAmount = params.inputA.amount - params.depositA;
    const changeBAmount = params.inputB.amount - params.depositB;

    // Use the actual LP amount provided by caller (calculated from pool state)
    // CRITICAL: Must match the amount used in encryption!
    const lpAmount = params.lpAmount;

    // Token mints
    const tokenAMint = params.inputA.tokenMint instanceof Uint8Array
      ? params.inputA.tokenMint
      : params.inputA.tokenMint.toBytes();
    const tokenBMint = params.inputB.tokenMint instanceof Uint8Array
      ? params.inputB.tokenMint
      : params.inputB.tokenMint.toBytes();

    // LP token mint
    const lpTokenMint = params.lpMint instanceof Uint8Array
      ? params.lpMint
      : params.lpMint.toBytes();

    // Build output notes (cast tokenMint to any since computeCommitment handles both Uint8Array and PublicKey)
    const lpNote = {
      stealthPubX: params.lpRecipient.stealthPubkey.x,
      tokenMint: lpTokenMint as any,
      amount: lpAmount,
      randomness: lpRandomness,
    };

    const changeANote = {
      stealthPubX: params.changeARecipient.stealthPubkey.x,
      tokenMint: tokenAMint as any,
      amount: changeAAmount,
      randomness: changeARandomness,
    };

    const changeBNote = {
      stealthPubX: params.changeBRecipient.stealthPubkey.x,
      tokenMint: tokenBMint as any,
      amount: changeBAmount,
      randomness: changeBRandomness,
    };

    // Compute output commitments
    const lpCommitment = computeCommitment(lpNote as any);
    const changeACommitment = computeCommitment(changeANote as any);
    const changeBCommitment = computeCommitment(changeBNote as any);

    // Dummy merkle proofs (verified on-chain via Light Protocol)
    const dummyMerklePath = Array(32).fill(new Uint8Array(32));
    const dummyMerkleIndices = Array(32).fill(0);

    const witnessInputs = {
      // Public inputs
      nullifier_a: fieldToHex(nullifierA),
      nullifier_b: fieldToHex(nullifierB),
      pool_id: fieldToHex(poolIdBytes),
      lp_commitment: fieldToHex(lpCommitment),
      change_a_commitment: fieldToHex(changeACommitment),
      change_b_commitment: fieldToHex(changeBCommitment),

      // Private inputs - Token A
      in_a_stealth_pub_x: fieldToHex(params.inputA.stealthPubX),
      in_a_amount: params.inputA.amount.toString(),
      in_a_randomness: fieldToHex(params.inputA.randomness),
      in_a_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKeyA)),
      token_a_mint: fieldToHex(tokenAMint),
      in_a_leaf_index: params.inputA.leafIndex.toString(),
      merkle_path_a: dummyMerklePath.map(p => fieldToHex(p)),
      merkle_path_indices_a: dummyMerkleIndices.map(i => i.toString()),

      // Private inputs - Token B
      in_b_stealth_pub_x: fieldToHex(params.inputB.stealthPubX),
      in_b_amount: params.inputB.amount.toString(),
      in_b_randomness: fieldToHex(params.inputB.randomness),
      in_b_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKeyB)),
      token_b_mint: fieldToHex(tokenBMint),
      in_b_leaf_index: params.inputB.leafIndex.toString(),
      merkle_path_b: dummyMerklePath.map(p => fieldToHex(p)),
      merkle_path_indices_b: dummyMerkleIndices.map(i => i.toString()),

      // Deposit amounts
      deposit_a: params.depositA.toString(),
      deposit_b: params.depositB.toString(),

      // LP output
      lp_stealth_pub_x: fieldToHex(params.lpRecipient.stealthPubkey.x),
      lp_token_mint: fieldToHex(lpTokenMint),
      lp_amount: lpAmount.toString(),
      lp_randomness: fieldToHex(lpRandomness),

      // Change A output
      change_a_stealth_pub_x: fieldToHex(params.changeARecipient.stealthPubkey.x),
      change_a_amount: changeAAmount.toString(),
      change_a_randomness: fieldToHex(changeARandomness),

      // Change B output
      change_b_stealth_pub_x: fieldToHex(params.changeBRecipient.stealthPubkey.x),
      change_b_amount: changeBAmount.toString(),
      change_b_randomness: fieldToHex(changeBRandomness),
    };

    const proof = await this.prove(circuitName, witnessInputs);

    // Return proof along with public outputs AND randomness so caller can use SAME values
    return {
      proof,
      nullifierA,
      nullifierB,
      lpCommitment,
      changeACommitment,
      changeBCommitment,
      lpRandomness,
      changeARandomness,
      changeBRandomness,
    };
  }

  /**
   * Generate a remove liquidity proof
   */
  async generateRemoveLiquidityProof(
    params: RemoveLiquidityParams,
    keypair: Keypair
  ): Promise<{
    proof: Uint8Array;
    lpNullifier: Uint8Array;
    outputACommitment: Uint8Array;
    outputBCommitment: Uint8Array;
    outputARandomness: Uint8Array;
    outputBRandomness: Uint8Array;
  }> {
    const circuitName = 'swap/remove_liquidity';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    // Derive effective spending key for LP input
    let effectiveKey: bigint;
    if (params.lpInput.stealthEphemeralPubkey) {
      effectiveKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.lpInput.stealthEphemeralPubkey
      );
    } else {
      effectiveKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));

    // Compute commitment and nullifier
    const lpCommitment = computeCommitment(params.lpInput);
    const lpNullifier = deriveSpendingNullifier(effectiveNullifierKey, lpCommitment, params.lpInput.leafIndex);

    // Reduce pool_id to field element using modular reduction (matches on-chain helpers/field.rs)
    const poolIdBytes = pubkeyToField(params.poolId);

    // Reduce state hashes to field elements (keccak256 can produce values >= BN254 modulus)
    // keccak256 outputs big-endian bytes, so byte[0] is the MSB
    // Must match on-chain to_field_element: result[0] &= 0x1F
    const oldStateHash = new Uint8Array(params.oldPoolStateHash);
    const newStateHash = new Uint8Array(params.newPoolStateHash);
    oldStateHash[0] &= 0x1F;
    newStateHash[0] &= 0x1F;

    // Use provided randomness or generate new values
    const outputARandomness = (params as any).outputARandomness ?? generateRandomness();
    const outputBRandomness = (params as any).outputBRandomness ?? generateRandomness();

    // Get token mints from AMM pool (Token A and Token B, not LP)
    const tokenAMint = params.tokenAMint.toBytes();
    const tokenBMint = params.tokenBMint.toBytes();
    const lpTokenMint = params.lpInput.tokenMint instanceof Uint8Array ? params.lpInput.tokenMint : params.lpInput.tokenMint.toBytes();

    // Build output notes with actual amounts
    const outputANote = {
      stealthPubX: params.outputARecipient.stealthPubkey.x,
      tokenMint: tokenAMint as any,
      amount: params.outputAAmount,
      randomness: outputARandomness,
    };

    const outputBNote = {
      stealthPubX: params.outputBRecipient.stealthPubkey.x,
      tokenMint: tokenBMint as any,
      amount: params.outputBAmount,
      randomness: outputBRandomness,
    };

    // Compute output commitments with actual amounts
    const outputACommitment = computeCommitment(outputANote as any);
    const outputBCommitment = computeCommitment(outputBNote as any);

    const witnessInputs = {
      // Public inputs
      lp_nullifier: fieldToHex(lpNullifier),
      pool_id: fieldToHex(poolIdBytes),
      out_a_commitment: fieldToHex(outputACommitment),
      out_b_commitment: fieldToHex(outputBCommitment),
      old_state_hash: fieldToHex(oldStateHash),
      new_state_hash: fieldToHex(newStateHash),

      // Private inputs - LP token
      lp_stealth_pub_x: fieldToHex(params.lpInput.stealthPubX),
      lp_amount: params.lpInput.amount.toString(),
      lp_randomness: fieldToHex(params.lpInput.randomness),
      lp_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),
      lp_token_mint: fieldToHex(lpTokenMint),
      lp_leaf_index: params.lpInput.leafIndex.toString(),

      // Merkle proof
      merkle_path: params.merklePath.map(p => fieldToHex(p)),
      merkle_path_indices: params.merklePathIndices.map(idx => idx.toString()),

      // Output details
      out_a_stealth_pub_x: fieldToHex(params.outputARecipient.stealthPubkey.x),
      out_a_amount: params.outputAAmount.toString(),
      out_a_randomness: fieldToHex(outputARandomness),
      token_a_mint: fieldToHex(tokenAMint),

      out_b_stealth_pub_x: fieldToHex(params.outputBRecipient.stealthPubkey.x),
      out_b_amount: params.outputBAmount.toString(),
      out_b_randomness: fieldToHex(outputBRandomness),
      token_b_mint: fieldToHex(tokenBMint),
    };

    const proof = await this.prove(circuitName, witnessInputs);

    return {
      proof,
      lpNullifier,
      outputACommitment,
      outputBCommitment,
      outputARandomness,
      outputBRandomness,
    };
  }

  // =============================================================================
  // Consolidation Proof Generation
  // =============================================================================

  /**
   * Generate a consolidation proof (3 inputs -> 1 output)
   *
   * Consolidation merges multiple notes into a single note.
   * - No fees (consolidation is free to encourage wallet cleanup)
   * - Supports 1-3 input notes (unused inputs are zeroed)
   * - Single output back to self
   */
  async generateConsolidationProof(
    params: ConsolidationParams,
    keypair: Keypair
  ): Promise<{
    proof: Uint8Array;
    nullifiers: Uint8Array[];
    outputCommitment: Uint8Array;
    outputRandomness: Uint8Array;
    outputAmount: bigint;
  }> {
    const circuitName = 'consolidate/3x1';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    if (params.inputs.length === 0 || params.inputs.length > 3) {
      throw new Error('Consolidation requires 1-3 input notes');
    }

    // Generate output randomness if not provided
    const outputRandomness = params.outputRandomness ?? generateRandomness();

    // Calculate total output amount
    const outputAmount = params.inputs.reduce((sum, input) => sum + input.amount, 0n);

    // Get token mint bytes
    const tokenMintBytes = params.tokenMint.toBytes();

    // Build output commitment
    const outputNote = {
      stealthPubX: params.outputRecipient.stealthPubkey.x,
      tokenMint: tokenMintBytes as any,
      amount: outputAmount,
      randomness: outputRandomness,
    };
    const outputCommitment = computeCommitment(outputNote as any);

    // Process each input (up to 3)
    const processedInputs: Array<{
      nullifier: Uint8Array;
      stealthPubX: Uint8Array;
      amount: bigint;
      randomness: Uint8Array;
      spendingKey: Uint8Array;
      leafIndex: number;
      merklePath: Uint8Array[];
      merklePathIndices: number[];
    }> = [];

    for (const input of params.inputs) {
      // Derive effective spending key for this input
      let effectiveKey: bigint;
      if (input.stealthEphemeralPubkey) {
        effectiveKey = deriveStealthPrivateKey(
          bytesToField(keypair.spending.sk),
          input.stealthEphemeralPubkey
        );
      } else {
        effectiveKey = bytesToField(keypair.spending.sk);
      }
      const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));

      // Compute commitment and nullifier
      const commitment = computeCommitment(input);
      const nullifier = deriveSpendingNullifier(effectiveNullifierKey, commitment, input.leafIndex);

      // Circuit doesn't verify merkle paths (Light Protocol verifies on-chain)
      // Use dummy paths for circuit compatibility
      const dummyPath = Array(32).fill(new Uint8Array(32));
      const dummyIndices = Array(32).fill(0);

      processedInputs.push({
        nullifier,
        stealthPubX: input.stealthPubX,
        amount: input.amount,
        randomness: input.randomness,
        spendingKey: fieldToBytes(effectiveKey),
        leafIndex: input.leafIndex,
        merklePath: dummyPath,
        merklePathIndices: dummyIndices,
      });
    }

    // Pad to 3 inputs with zeros if needed
    while (processedInputs.length < 3) {
      processedInputs.push({
        nullifier: new Uint8Array(32),
        stealthPubX: new Uint8Array(32),
        amount: 0n,
        randomness: new Uint8Array(32),
        spendingKey: new Uint8Array(32),
        leafIndex: 0,
        merklePath: Array(32).fill(new Uint8Array(32)),
        merklePathIndices: Array(32).fill(0),
      });
    }

    // Build witness inputs matching the circuit
    const witnessInputs: Record<string, any> = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier_1: fieldToHex(processedInputs[0].nullifier),
      nullifier_2: fieldToHex(processedInputs[1].nullifier),
      nullifier_3: fieldToHex(processedInputs[2].nullifier),
      out_commitment: fieldToHex(outputCommitment),
      token_mint: fieldToHex(tokenMintBytes),

      // Input 1 (always active)
      in_stealth_pub_x_1: fieldToHex(processedInputs[0].stealthPubX),
      in_amount_1: processedInputs[0].amount.toString(),
      in_randomness_1: fieldToHex(processedInputs[0].randomness),
      in_stealth_spending_key_1: fieldToHex(processedInputs[0].spendingKey),
      merkle_path_1: processedInputs[0].merklePath.map(p => fieldToHex(p)),
      merkle_path_indices_1: processedInputs[0].merklePathIndices.map(i => i.toString()),
      leaf_index_1: processedInputs[0].leafIndex.toString(),

      // Input 2 (optional - can be zeros)
      in_stealth_pub_x_2: fieldToHex(processedInputs[1].stealthPubX),
      in_amount_2: processedInputs[1].amount.toString(),
      in_randomness_2: fieldToHex(processedInputs[1].randomness),
      in_stealth_spending_key_2: fieldToHex(processedInputs[1].spendingKey),
      merkle_path_2: processedInputs[1].merklePath.map(p => fieldToHex(p)),
      merkle_path_indices_2: processedInputs[1].merklePathIndices.map(i => i.toString()),
      leaf_index_2: processedInputs[1].leafIndex.toString(),

      // Input 3 (optional - can be zeros)
      in_stealth_pub_x_3: fieldToHex(processedInputs[2].stealthPubX),
      in_amount_3: processedInputs[2].amount.toString(),
      in_randomness_3: fieldToHex(processedInputs[2].randomness),
      in_stealth_spending_key_3: fieldToHex(processedInputs[2].spendingKey),
      merkle_path_3: processedInputs[2].merklePath.map(p => fieldToHex(p)),
      merkle_path_indices_3: processedInputs[2].merklePathIndices.map(i => i.toString()),
      leaf_index_3: processedInputs[2].leafIndex.toString(),

      // Output
      out_stealth_pub_x: fieldToHex(params.outputRecipient.stealthPubkey.x),
      out_amount: outputAmount.toString(),
      out_randomness: fieldToHex(outputRandomness),
    };

    const proof = await this.prove(circuitName, witnessInputs);

    return {
      proof,
      nullifiers: processedInputs.filter(i => i.amount > 0n).map(i => i.nullifier),
      outputCommitment,
      outputRandomness,
      outputAmount,
    };
  }

  // =============================================================================
  // Market Order Proof Generation
  // =============================================================================

  /**
   * Generate a fill order proof
   */
  async generateFillOrderProof(
    params: FillOrderParams,
    keypair: Keypair
  ): Promise<Uint8Array> {
    const circuitName = 'market/order_fill';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    // Derive effective spending key for taker input
    let effectiveKey: bigint;
    if (params.takerInput.stealthEphemeralPubkey) {
      effectiveKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.takerInput.stealthEphemeralPubkey
      );
    } else {
      effectiveKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));

    // Compute taker commitment and nullifier
    const takerCommitment = computeCommitment(params.takerInput);
    const takerNullifier = deriveSpendingNullifier(effectiveNullifierKey, takerCommitment, params.takerInput.leafIndex);

    const witnessInputs = {
      // Public inputs
      taker_nullifier: fieldToHex(takerNullifier),
      order_id: fieldToHex(params.orderId),
      current_timestamp: params.currentTimestamp.toString(),

      // Private inputs - Taker
      taker_stealth_pub_x: fieldToHex(params.takerInput.stealthPubX),
      taker_amount: params.takerInput.amount.toString(),
      taker_randomness: fieldToHex(params.takerInput.randomness),
      taker_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),

      // Output recipients
      taker_receive_stealth_pub_x: fieldToHex(params.takerReceiveRecipient.stealthPubkey.x),
      taker_change_stealth_pub_x: fieldToHex(params.takerChangeRecipient.stealthPubkey.x),
    };

    return this.prove(circuitName, witnessInputs);
  }

  /**
   * Generate a cancel order proof
   */
  async generateCancelOrderProof(
    params: CancelOrderParams,
    keypair: Keypair
  ): Promise<Uint8Array> {
    const circuitName = 'market/order_cancel';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`Circuit not loaded: ${circuitName}`);
    }

    // For cancel, we need the escrow spending key
    // This is derived from the order's escrow commitment
    const escrowSpendingKey = bytesToField(keypair.spending.sk);
    const escrowNullifierKey = deriveNullifierKey(fieldToBytes(escrowSpendingKey));

    const witnessInputs = {
      // Public inputs
      order_id: fieldToHex(params.orderId),
      current_timestamp: params.currentTimestamp.toString(),

      // Private inputs
      escrow_spending_key: fieldToHex(fieldToBytes(escrowSpendingKey)),

      // Output recipient
      refund_stealth_pub_x: fieldToHex(params.refundRecipient.stealthPubkey.x),
    };

    return this.prove(circuitName, witnessInputs);
  }

  // =============================================================================
  // Core Proving
  // =============================================================================

  /**
   * Generate a Groth16 proof for a circuit
   *
   * Returns 256-byte proof formatted for Solana's alt_bn128 verifier
   */
  private async prove(circuitName: string, inputs: Record<string, any>): Promise<Uint8Array> {
    const artifacts = this.circuits.get(circuitName);

    // For Circom circuits, artifacts are auto-loaded on-demand in proveViaWasm()
    // So we pass through even if artifacts is undefined
    if (!artifacts) {
      // Use dummy artifacts - proveViaWasm will load real Circom artifacts
      const dummyArtifacts: CircuitArtifacts = {
        manifest: {},
        provingKey: new Uint8Array(0),
      };
      return this.proveNative(circuitName, inputs, dummyArtifacts);
    }

    // Generate proof via snarkjs (already formatted for Solana)
    // snarkjs-prover handles A-component negation internally
    return this.proveNative(circuitName, inputs, artifacts);
  }

  /**
   * Native Groth16 prover (WASM-based)
   *
   * Returns proof bytes already formatted for Solana (256 bytes)
   */
  private async proveNative(
    circuitName: string,
    inputs: Record<string, any>,
    artifacts: CircuitArtifacts
  ): Promise<Uint8Array> {
    // Always use snarkjs with Circom circuits
    // Works in both Node.js and browser environments
    // Returns proof already formatted for Solana (A negated)
    return this.proveViaWasm(circuitName, inputs, artifacts);
  }

  /** Circom circuit base URL for browser proving */
  private circomBaseUrl: string = '/circom';

  /** Cached circom artifacts */
  private circomArtifacts: Map<string, CircomArtifacts> = new Map();

  /**
   * Set custom circom base URL
   */
  setCircomBaseUrl(url: string): void {
    this.circomBaseUrl = url;
  }

  /**
   * Prove via snarkjs (browser) using Circom circuits
   *
   * Privacy-preserving: All proving happens client-side.
   * The witness (containing spending keys) never leaves the browser.
   *
   * Workflow:
   * 1. Load circom WASM (witness calculator) and zkey (proving key)
   * 2. Convert inputs to circom format (field element strings)
   * 3. Generate Groth16 proof using snarkjs
   * 4. Return proof already formatted for Solana (snarkjs-prover handles A negation)
   */
  private async proveViaWasm(
    circuitName: string,
    inputs: Record<string, any>,
    _artifacts: CircuitArtifacts
  ): Promise<Uint8Array> {
    // Map circuit name to circom file paths (wasm and zkey have different structures)
    const { wasmPath, zkeyPath } = this.getCircomFilePaths(circuitName);
    // Add cache-busting timestamp (v2 = circuit update on Jan 15, 2026)
    const cacheBuster = 'v2';

    // In Node.js mode with nodeConfig, use circomBuildDir for file paths
    const baseUrl = this.nodeConfig?.circomBuildDir ?? this.circomBaseUrl;
    const wasmUrl = `${baseUrl}/${wasmPath}?${cacheBuster}`;
    const zkeyUrl = `${baseUrl}/${zkeyPath}?${cacheBuster}`;


    // Load or get cached artifacts
    let artifacts = this.circomArtifacts.get(circuitName);
    if (!artifacts) {
      artifacts = await loadCircomArtifacts(circuitName, wasmUrl, zkeyUrl);
      this.circomArtifacts.set(circuitName, artifacts);
    }

    // Convert inputs to circom format (string field elements)
    const circomInputs = this.convertToCircomInputs(inputs);

    // Generate proof using snarkjs - already formatted for Solana with A negated
    const proofBytes = await generateSnarkjsProof(artifacts, circomInputs);

    // Return directly - snarkjs-prover already handles Solana formatting
    return proofBytes;
  }

  /**
   * Get circom file paths from circuit name
   * WASM files are in {name}_js/ subdirectories, zkey files are directly in the parent dir
   *
   * Examples:
   *   transfer/1x2: wasm=transfer_1x2_js/transfer_1x2.wasm, zkey=transfer_1x2_final.zkey
   *   perps/open_position: wasm=perps/open_position_js/open_position.wasm, zkey=perps/open_position_final.zkey
   */
  private getCircomFilePaths(circuitName: string): { wasmPath: string; zkeyPath: string } {
    // Mapping for circuits with non-standard paths
    const mapping: Record<string, { wasmPath: string; zkeyPath: string }> = {
      // Transfer circuits
      'transfer/1x2': { wasmPath: 'transfer_1x2_js/transfer_1x2.wasm', zkeyPath: 'transfer_1x2_final.zkey' },
      // Consolidation circuits
      'consolidate/3x1': { wasmPath: 'consolidate_3x1/consolidate_3x1_js/consolidate_3x1.wasm', zkeyPath: 'consolidate_3x1/consolidate_3x1_final.zkey' },
      // Swap/AMM circuits
      'swap/swap': { wasmPath: 'swap_js/swap.wasm', zkeyPath: 'swap_final.zkey' },
      'swap/add_liquidity': { wasmPath: 'add_liquidity_js/add_liquidity.wasm', zkeyPath: 'add_liquidity_final.zkey' },
      'swap/remove_liquidity': { wasmPath: 'remove_liquidity_js/remove_liquidity.wasm', zkeyPath: 'remove_liquidity_final.zkey' },
      // Perps circuits
      'perps/open_position': { wasmPath: 'perps/open_position_js/open_position.wasm', zkeyPath: 'perps/open_position_final.zkey' },
      'perps/close_position': { wasmPath: 'perps/close_position_js/close_position.wasm', zkeyPath: 'perps/close_position_final.zkey' },
      'perps/add_liquidity': { wasmPath: 'perps/add_liquidity_js/add_liquidity.wasm', zkeyPath: 'perps/add_liquidity_final.zkey' },
      'perps/remove_liquidity': { wasmPath: 'perps/remove_liquidity_js/remove_liquidity.wasm', zkeyPath: 'perps/remove_liquidity_final.zkey' },
      'perps/liquidate': { wasmPath: 'perps/liquidate_js/liquidate.wasm', zkeyPath: 'perps/liquidate_final.zkey' },
      // Voting circuits
      'voting/vote_snapshot': { wasmPath: 'voting/vote_snapshot_js/vote_snapshot.wasm', zkeyPath: 'voting/vote_snapshot_final.zkey' },
      'voting/change_vote_snapshot': { wasmPath: 'voting/change_vote_snapshot_js/change_vote_snapshot.wasm', zkeyPath: 'voting/change_vote_snapshot_final.zkey' },
      'voting/vote_spend': { wasmPath: 'voting/vote_spend_js/vote_spend.wasm', zkeyPath: 'voting/vote_spend_final.zkey' },
      'voting/close_position': { wasmPath: 'voting/close_position_js/close_position.wasm', zkeyPath: 'voting/close_position_final.zkey' },
      'voting/claim': { wasmPath: 'voting/claim_js/claim.wasm', zkeyPath: 'voting/claim_final.zkey' },
    };

    if (mapping[circuitName]) {
      return mapping[circuitName];
    }

    // Default: assume {name}_js/{name}.wasm and {name}_final.zkey structure
    const baseName = circuitName.replace('/', '_');
    return {
      wasmPath: `${baseName}_js/${baseName}.wasm`,
      zkeyPath: `${baseName}_final.zkey`,
    };
  }

  /**
   * Convert SDK inputs to circom format (string field elements)
   */
  private convertToCircomInputs(inputs: Record<string, any>): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};

    for (const [key, value] of Object.entries(inputs)) {
      if (Array.isArray(value)) {
        // Array of values
        result[key] = value.map(v => this.valueToFieldString(v));
      } else {
        result[key] = this.valueToFieldString(value);
      }
    }

    return result;
  }

  /**
   * Convert a value to field element string
   */
  private valueToFieldString(value: any): string {
    if (typeof value === 'string') {
      // Already a string (hex or decimal)
      if (value.startsWith('0x')) {
        return BigInt(value).toString();
      }
      return value;
    }
    if (typeof value === 'bigint') {
      return value.toString();
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (value instanceof Uint8Array) {
      return bytesToFieldString(value);
    }
    throw new Error(`Cannot convert ${typeof value} to field string`);
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
    // Validate params
    if (!params.inputs || params.inputs.length === 0) {
      throw new Error('TransferParams.inputs is empty. At least one input required.');
    }
    if (!params.outputs || params.outputs.length === 0) {
      throw new Error('TransferParams.outputs is empty. At least one output required.');
    }
    if (!params.outputs[0].commitment) {
      throw new Error('TransferParams.outputs[0].commitment is undefined. Use prepareAndTransfer() or ensure outputs have commitment, stealthPubX, and randomness.');
    }

    const input = params.inputs[0];

    // Derive the stealth spending key from base spending key + ephemeral pubkey
    // Where stealthSpendingKey = baseSpendingKey + hash(sharedSecret)
    let stealthSpendingKey: bigint;
    if (input.stealthEphemeralPubkey) {
      // Derive stealth private key: sk' = sk + f where f = hash(sk * E)
      const baseSpendingKey = bytesToField(spendingKey);
      stealthSpendingKey = deriveStealthPrivateKey(baseSpendingKey, input.stealthEphemeralPubkey);
    } else {
      // Fallback: assume spendingKey is already the stealth key (for non-stealth notes)
      stealthSpendingKey = bytesToField(spendingKey);
      console.warn('[buildTransferWitness] No ephemeral pubkey - using base spending key directly');
    }

    // Compute nullifier key from STEALTH spending key (must match circuit)
    // Circuit: nk = Poseidon(NULLIFIER_KEY_DOMAIN, in_stealth_spending_key, 0)
    const stealthNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));

    // input is a DecryptedNote which extends Note, so we can pass it directly
    const commitment = computeCommitment(input);
    const nullifier = deriveSpendingNullifier(stealthNullifierKey, commitment, input.leafIndex);

    // Debug: print values for comparison

    // Convert PublicKey to field if present
    const tokenMint = input.tokenMint instanceof Uint8Array
      ? input.tokenMint
      : input.tokenMint.toBytes();

    // Handle output 2 (change) - if missing, use zeros but compute correct commitment
    const out2StealthPubX = params.outputs[1]?.stealthPubX ?? new Uint8Array(32);
    const out2Amount = params.outputs[1]?.amount ?? 0n;
    const out2Randomness = params.outputs[1]?.randomness ?? new Uint8Array(32);

    // Compute output 2 commitment (must match circuit even when zero)
    // Circuit: Poseidon(COMMITMENT_DOMAIN, stealthPubX, tokenMint, amount, randomness)
    let out2Commitment: Uint8Array;
    if (params.outputs[1]?.commitment) {
      out2Commitment = params.outputs[1].commitment;
    } else {
      // Compute commitment for dummy output (zeros except token_mint)
      out2Commitment = poseidonHashDomain(
        DOMAIN_COMMITMENT,
        out2StealthPubX,
        tokenMint,
        fieldToBytes(out2Amount),
        out2Randomness
      );
    }

    // Debug: log unshield and fee amounts for proof generation
    const unshieldAmountForProof = params.unshield?.amount ?? 0n;
    const feeAmountForProof = params.fee ?? 0n;
    console.log('[buildTransferWitness] unshield_amount for proof:', unshieldAmountForProof.toString());
    console.log('[buildTransferWitness] fee_amount for proof:', feeAmountForProof.toString());
    console.log('[buildTransferWitness] params.unshield:', params.unshield);
    console.log('[buildTransferWitness] output 1 amount:', params.outputs[0].amount.toString());
    console.log('[buildTransferWitness] output 2 amount:', out2Amount.toString());
    console.log('[buildTransferWitness] input amount:', input.amount.toString());

    // Verify balance: input = out1 + out2 + unshield + fee
    const expectedTotal = params.outputs[0].amount + out2Amount + unshieldAmountForProof + feeAmountForProof;
    console.log('[buildTransferWitness] Balance check: input=', input.amount.toString(),
                'expected=', expectedTotal.toString(),
                'match=', input.amount === expectedTotal);

    // Debug: Log exact commitment bytes for comparison with on-chain
    console.log('[buildTransferWitness] === Commitment bytes for proof ===');
    console.log('  out_commitment_1 (full):', Buffer.from(params.outputs[0].commitment).toString('hex'));
    console.log('  out_commitment_2 (full):', Buffer.from(out2Commitment).toString('hex'));
    console.log('  out_stealth_pub_x_1:', Buffer.from(params.outputs[0].stealthPubX).toString('hex').slice(0, 32) + '...');
    console.log('  out_amount_1:', params.outputs[0].amount.toString());
    console.log('  out_randomness_1:', Buffer.from(params.outputs[0].randomness).toString('hex').slice(0, 32) + '...');

    return {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      out_commitment_1: fieldToHex(params.outputs[0].commitment),
      out_commitment_2: fieldToHex(out2Commitment),
      token_mint: fieldToHex(tokenMint),
      transfer_amount: params.outputs[0].amount.toString(), // NEW: Public for on-chain fee verification
      unshield_amount: unshieldAmountForProof.toString(),
      fee_amount: feeAmountForProof.toString(),

      // Private inputs (Circom circuit - no in_stealth_pub_y)
      in_stealth_pub_x: fieldToHex(input.stealthPubX),
      in_amount: input.amount.toString(),
      in_randomness: fieldToHex(input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(stealthSpendingKey)),
      merkle_path: params.merklePath.map(fieldToHex),
      merkle_path_indices: params.merkleIndices.map(i => i.toString()),
      leaf_index: input.leafIndex.toString(),

      // Output 1 (recipient)
      out_stealth_pub_x_1: fieldToHex(params.outputs[0].stealthPubX),
      out_amount_1: params.outputs[0].amount.toString(),
      out_randomness_1: fieldToHex(params.outputs[0].randomness),

      // Output 2 (change)
      out_stealth_pub_x_2: fieldToHex(out2StealthPubX),
      out_amount_2: out2Amount.toString(),
      out_randomness_2: fieldToHex(out2Randomness),
    };
  }

  // =============================================================================
  // Perpetual Futures Proof Generation
  // =============================================================================

  /**
   * Generate proof for opening a perps position
   *
   * Circuit proves:
   * - Ownership of margin commitment
   * - Correct nullifier derivation
   * - Correct position commitment computation
   * - Balance check: input = margin + fee
   */
  async generateOpenPositionProof(
    params: {
      /** Input note (margin source) */
      input: {
        stealthPubX: Uint8Array;
        tokenMint: any;
        amount: bigint;
        randomness: Uint8Array;
        leafIndex: number;
        stealthEphemeralPubkey?: { x: Uint8Array; y: Uint8Array };
      };
      /** Perps pool ID (Pubkey bytes) */
      perpsPoolId: Uint8Array;
      /** Market ID */
      marketId: bigint;
      /** Is long position */
      isLong: boolean;
      /** Margin amount */
      marginAmount: bigint;
      /** Leverage (1-100) */
      leverage: number;
      /** Position size */
      positionSize: bigint;
      /** Entry price */
      entryPrice: bigint;
      /** Position fee */
      positionFee: bigint;
      /** Merkle root */
      merkleRoot: Uint8Array;
      /** Merkle path */
      merklePath: Uint8Array[];
      /** Merkle path indices */
      merkleIndices: number[];
    },
    keypair: Keypair
  ): Promise<{
    proof: Uint8Array;
    nullifier: Uint8Array;
    positionCommitment: Uint8Array;
    positionRandomness: Uint8Array;
    changeCommitment: Uint8Array;
    changeRandomness: Uint8Array;
    changeAmount: bigint;
  }> {
    const circuitName = 'perps/open_position';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`${circuitName} circuit not loaded. Circuits need to be compiled first.`);
    }

    // Derive effective spending key
    let effectiveKey: bigint;
    if (params.input.stealthEphemeralPubkey) {
      effectiveKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.input.stealthEphemeralPubkey
      );
    } else {
      effectiveKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));

    // Compute input commitment and nullifier
    const inputCommitment = computeCommitment(params.input);
    const nullifier = deriveSpendingNullifier(effectiveNullifierKey, inputCommitment, params.input.leafIndex);

    // Generate position randomness
    const positionRandomness = generateRandomness();

    // Convert token mint to bytes
    const tokenMint = params.input.tokenMint instanceof Uint8Array
      ? params.input.tokenMint
      : params.input.tokenMint.toBytes();

    // Calculate change amount (input - margin - fee)
    const totalRequired = params.marginAmount + params.positionFee;
    const changeAmount = params.input.amount - totalRequired;

    console.log('[OpenPosition] Change amount debug:');
    console.log('  input.amount:', params.input.amount.toString());
    console.log('  marginAmount:', params.marginAmount.toString());
    console.log('  positionFee:', params.positionFee.toString());
    console.log('  totalRequired:', totalRequired.toString());
    console.log('  changeAmount:', changeAmount.toString());
    console.log('  changeAmount > 0n:', changeAmount > 0n);

    // Validate input covers required amount
    if (changeAmount < 0n) {
      throw new Error(
        `Insufficient input amount: input (${params.input.amount}) < required (${totalRequired}). ` +
        `Need at least ${totalRequired} to cover margin (${params.marginAmount}) + fee (${params.positionFee}).`
      );
    }

    // Generate change randomness and compute change commitment
    const changeRandomness = generateRandomness();
    let changeCommitment: Uint8Array;
    if (changeAmount > 0n) {
      // Compute change commitment using the standard commitment formula
      // commitment = poseidon(DOMAIN_COMMITMENT, stealth_pub_x, token_mint, amount, randomness)
      const COMMITMENT_DOMAIN = 1n;
      console.log('[OpenPosition] Computing change commitment:');
      console.log('  stealthPubX:', Buffer.from(params.input.stealthPubX).toString('hex').slice(0, 16) + '...');
      console.log('  tokenMint:', Buffer.from(tokenMint).toString('hex').slice(0, 16) + '...');
      console.log('  changeAmount (bigint):', changeAmount.toString());
      console.log('  changeAmount (bytes):', Buffer.from(fieldToBytes(changeAmount)).toString('hex').slice(0, 16) + '...');
      console.log('  changeRandomness:', Buffer.from(changeRandomness).toString('hex').slice(0, 16) + '...');
      changeCommitment = poseidonHashDomain(
        COMMITMENT_DOMAIN,
        params.input.stealthPubX,
        tokenMint,
        fieldToBytes(changeAmount),
        changeRandomness
      );
      console.log('  computed changeCommitment:', Buffer.from(changeCommitment).toString('hex'));
    } else {
      // No change - commitment is zero
      changeCommitment = new Uint8Array(32);
      console.log('[OpenPosition] No change (changeAmount <= 0), using zero commitment');
    }

    // Compute position commitment using Poseidon hash (matches circuit)
    // PositionCommitment: two-stage hash
    // Stage 1: H(POSITION_COMMITMENT_DOMAIN, stealth_pub_x, market_id, is_long, margin)
    // Stage 2: H(stage1_out, size, leverage, entry_price, randomness)
    // NOTE: Circuit uses INPUT note's stealthPubX - position owner = margin owner
    const POSITION_COMMITMENT_DOMAIN = 8n;
    const stage1 = poseidonHashDomain(
      POSITION_COMMITMENT_DOMAIN,
      params.input.stealthPubX,
      fieldToBytes(params.marketId),
      fieldToBytes(BigInt(params.isLong ? 1 : 0)),
      fieldToBytes(params.marginAmount)
    );
    const positionCommitment = poseidonHash([
      stage1,
      fieldToBytes(params.positionSize),
      fieldToBytes(BigInt(params.leverage)),
      fieldToBytes(params.entryPrice),
      positionRandomness,
    ]);

    // Pad merkle path to 32 elements
    const merklePath = [...params.merklePath];
    while (merklePath.length < 32) {
      merklePath.push(new Uint8Array(32));
    }
    const merkleIndices = [...params.merkleIndices];
    while (merkleIndices.length < 32) {
      merkleIndices.push(0);
    }

    // Debug: Log market_id value
    console.log('[OpenPosition] market_id debug:');
    console.log('  params.marketId (bigint):', params.marketId.toString());
    console.log('  params.marketId (hex):', '0x' + params.marketId.toString(16).padStart(64, '0'));

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      // IMPORTANT: Use pubkeyToField to match on-chain pubkey_to_field reduction
      perps_pool_id: fieldToHex(pubkeyToField(new PublicKey(params.perpsPoolId))),
      // IMPORTANT: market_id is already reduced by bytesToField in client.ts, convert to hex format
      market_id: '0x' + params.marketId.toString(16).padStart(64, '0'),
      position_commitment: fieldToHex(positionCommitment),
      change_commitment: fieldToHex(changeCommitment),
      is_long: params.isLong ? '1' : '0',
      margin_amount: params.marginAmount.toString(),
      leverage: params.leverage.toString(),
      position_fee: params.positionFee.toString(),
      change_amount: changeAmount.toString(),

      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),
      token_mint: fieldToHex(tokenMint),
      merkle_path: merklePath.map(p => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map(i => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      position_size: params.positionSize.toString(),
      entry_price: params.entryPrice.toString(),
      position_randomness: fieldToHex(positionRandomness),
      change_randomness: fieldToHex(changeRandomness),
    };

    console.log('[OpenPosition] Public inputs for circuit:');
    console.log('  merkle_root:', witnessInputs.merkle_root);
    console.log('  nullifier:', witnessInputs.nullifier);
    console.log('  perps_pool_id:', witnessInputs.perps_pool_id);
    console.log('  market_id:', witnessInputs.market_id);
    console.log('  position_commitment:', witnessInputs.position_commitment);
    console.log('  change_commitment:', witnessInputs.change_commitment);

    const proof = await this.prove(circuitName, witnessInputs);

    return {
      proof,
      nullifier,
      positionCommitment,
      positionRandomness,
      changeCommitment,
      changeRandomness,
      changeAmount,
    };
  }

  /**
   * Generate proof for closing a perps position
   *
   * Circuit proves:
   * - Ownership of position commitment
   * - Correct nullifier derivation
   * - Correct settlement calculation (margin +/- PnL - fees)
   * - Bounded profit (max profit = margin)
   */
  async generateClosePositionProof(
    params: {
      /** Position details */
      position: {
        stealthPubX: Uint8Array;
        marketId: bigint;
        isLong: boolean;
        margin: bigint;
        size: bigint;
        leverage: number;
        entryPrice: bigint;
        randomness: Uint8Array;
        leafIndex: number;
        spendingKey: Uint8Array;
      };
      /** Perps pool ID */
      perpsPoolId: Uint8Array;
      /** Exit price from oracle */
      exitPrice: bigint;
      /** PnL amount (absolute value) */
      pnlAmount: bigint;
      /** Is profit (true) or loss (false) */
      isProfit: boolean;
      /** Close fee */
      closeFee: bigint;
      /** Settlement recipient stealth address */
      settlementRecipient: { stealthPubkey: { x: Uint8Array } };
      /** Token mint for settlement */
      tokenMint: Uint8Array;
      /** Merkle root */
      merkleRoot: Uint8Array;
      /** Merkle path */
      merklePath: Uint8Array[];
      /** Merkle path indices */
      merkleIndices: number[];
    },
    keypair: Keypair
  ): Promise<{
    proof: Uint8Array;
    positionNullifier: Uint8Array;
    settlementCommitment: Uint8Array;
    settlementRandomness: Uint8Array;
    settlementAmount: bigint;
  }> {
    const circuitName = 'perps/close_position';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`${circuitName} circuit not loaded. Circuits need to be compiled first.`);
    }

    // Derive nullifier key from position spending key
    const effectiveNullifierKey = deriveNullifierKey(params.position.spendingKey);

    // Recompute position commitment
    const POSITION_COMMITMENT_DOMAIN = 8n;
    const stage1 = poseidonHashDomain(
      POSITION_COMMITMENT_DOMAIN,
      params.position.stealthPubX,
      fieldToBytes(params.position.marketId),
      fieldToBytes(BigInt(params.position.isLong ? 1 : 0)),
      fieldToBytes(params.position.margin)
    );
    const positionCommitment = poseidonHash([
      stage1,
      fieldToBytes(params.position.size),
      fieldToBytes(BigInt(params.position.leverage)),
      fieldToBytes(params.position.entryPrice),
      params.position.randomness,
    ]);

    // Compute position nullifier
    const positionNullifier = deriveSpendingNullifier(
      effectiveNullifierKey,
      positionCommitment,
      params.position.leafIndex
    );

    // Calculate settlement amount
    // If profit: settlement = margin + min(pnl, margin) - closeFee
    // If loss: settlement = margin - pnl - closeFee
    let settlementAmount: bigint;
    if (params.isProfit) {
      const cappedPnl = params.pnlAmount > params.position.margin ? params.position.margin : params.pnlAmount;
      settlementAmount = params.position.margin + cappedPnl - params.closeFee;
    } else {
      settlementAmount = params.position.margin - params.pnlAmount - params.closeFee;
    }

    // Ensure non-negative
    if (settlementAmount < 0n) {
      settlementAmount = 0n;
    }

    // Generate settlement randomness and commitment
    const settlementRandomness = generateRandomness();
    const settlementCommitment = computeCommitment({
      stealthPubX: params.settlementRecipient.stealthPubkey.x,
      tokenMint: params.tokenMint,
      amount: settlementAmount,
      randomness: settlementRandomness,
    } as any);

    // Pad merkle path
    const merklePath = [...params.merklePath];
    while (merklePath.length < 32) {
      merklePath.push(new Uint8Array(32));
    }
    const merkleIndices = [...params.merkleIndices];
    while (merkleIndices.length < 32) {
      merkleIndices.push(0);
    }

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      position_nullifier: fieldToHex(positionNullifier),
      // IMPORTANT: Use pubkeyToField to match on-chain pubkey_to_field reduction
      perps_pool_id: fieldToHex(pubkeyToField(new PublicKey(params.perpsPoolId))),
      out_commitment: fieldToHex(settlementCommitment),
      is_long: params.position.isLong ? '1' : '0',
      exit_price: params.exitPrice.toString(),
      close_fee: params.closeFee.toString(),
      pnl_amount: params.pnlAmount.toString(),
      is_profit: params.isProfit ? '1' : '0',

      // Private inputs
      position_stealth_pub_x: fieldToHex(params.position.stealthPubX),
      // IMPORTANT: market_id must be in hex format to match circuit expectations
      market_id: '0x' + params.position.marketId.toString(16).padStart(64, '0'),
      position_margin: params.position.margin.toString(),
      position_size: params.position.size.toString(),
      position_leverage: params.position.leverage.toString(),
      entry_price: params.position.entryPrice.toString(),
      position_randomness: fieldToHex(params.position.randomness),
      position_spending_key: fieldToHex(params.position.spendingKey),
      merkle_path: merklePath.map(p => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map(i => i.toString()),
      leaf_index: params.position.leafIndex.toString(),
      out_stealth_pub_x: fieldToHex(params.settlementRecipient.stealthPubkey.x),
      out_token_mint: fieldToHex(params.tokenMint),
      out_amount: settlementAmount.toString(),
      out_randomness: fieldToHex(settlementRandomness),
    };

    const proof = await this.prove(circuitName, witnessInputs);

    return {
      proof,
      positionNullifier,
      settlementCommitment,
      settlementRandomness,
      settlementAmount,
    };
  }

  /**
   * Generate proof for adding perps liquidity (single token deposit)
   *
   * Circuit proves:
   * - Ownership of deposit commitment
   * - Correct nullifier derivation
   * - Correct LP commitment computation
   * - Balance check: input = deposit + fee
   */
  async generateAddPerpsLiquidityProof(
    params: {
      /** Input note (deposit token) */
      input: {
        stealthPubX: Uint8Array;
        tokenMint: any;
        amount: bigint;
        randomness: Uint8Array;
        leafIndex: number;
        stealthEphemeralPubkey?: { x: Uint8Array; y: Uint8Array };
      };
      /** Perps pool ID */
      perpsPoolId: Uint8Array;
      /** Token index in pool (0-7) */
      tokenIndex: number;
      /** Deposit amount */
      depositAmount: bigint;
      /** LP amount to mint (calculated on-chain) */
      lpAmountMinted: bigint;
      /** Fee amount */
      feeAmount: bigint;
      /** LP recipient stealth address */
      lpRecipient: { stealthPubkey: { x: Uint8Array } };
      /** Merkle root */
      merkleRoot: Uint8Array;
      /** Merkle path */
      merklePath: Uint8Array[];
      /** Merkle path indices */
      merkleIndices: number[];
    },
    keypair: Keypair
  ): Promise<{
    proof: Uint8Array;
    nullifier: Uint8Array;
    lpCommitment: Uint8Array;
    lpRandomness: Uint8Array;
  }> {
    const circuitName = 'perps/add_liquidity';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`${circuitName} circuit not loaded. Circuits need to be compiled first.`);
    }

    // Derive effective spending key
    let effectiveKey: bigint;
    if (params.input.stealthEphemeralPubkey) {
      effectiveKey = deriveStealthPrivateKey(
        bytesToField(keypair.spending.sk),
        params.input.stealthEphemeralPubkey
      );
    } else {
      effectiveKey = bytesToField(keypair.spending.sk);
    }
    const effectiveNullifierKey = deriveNullifierKey(fieldToBytes(effectiveKey));

    // Compute input commitment and nullifier
    const inputCommitment = computeCommitment(params.input);
    const nullifier = deriveSpendingNullifier(effectiveNullifierKey, inputCommitment, params.input.leafIndex);

    // Generate LP randomness
    const lpRandomness = generateRandomness();

    // Convert token mint to bytes
    const tokenMint = params.input.tokenMint instanceof Uint8Array
      ? params.input.tokenMint
      : params.input.tokenMint.toBytes();

    // Compute LP commitment using LpCommitment template
    // LpCommitment: H(LP_COMMITMENT_DOMAIN, stealth_pub_x, pool_id, lp_amount, randomness)
    const LP_COMMITMENT_DOMAIN = 9n;
    const lpCommitment = poseidonHashDomain(
      LP_COMMITMENT_DOMAIN,
      params.lpRecipient.stealthPubkey.x,
      params.perpsPoolId,
      fieldToBytes(params.lpAmountMinted),
      lpRandomness
    );

    // Pad merkle path
    const merklePath = [...params.merklePath];
    while (merklePath.length < 32) {
      merklePath.push(new Uint8Array(32));
    }
    const merkleIndices = [...params.merkleIndices];
    while (merkleIndices.length < 32) {
      merkleIndices.push(0);
    }

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      nullifier: fieldToHex(nullifier),
      // IMPORTANT: Use pubkeyToField to match on-chain pubkey_to_field reduction
      perps_pool_id: fieldToHex(pubkeyToField(new PublicKey(params.perpsPoolId))),
      lp_commitment: fieldToHex(lpCommitment),
      token_index: params.tokenIndex.toString(),
      deposit_amount: params.depositAmount.toString(),
      lp_amount_minted: params.lpAmountMinted.toString(),
      fee_amount: params.feeAmount.toString(),

      // Private inputs
      in_stealth_pub_x: fieldToHex(params.input.stealthPubX),
      in_amount: params.input.amount.toString(),
      in_randomness: fieldToHex(params.input.randomness),
      in_stealth_spending_key: fieldToHex(fieldToBytes(effectiveKey)),
      token_mint: fieldToHex(tokenMint),
      merkle_path: merklePath.map(p => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map(i => i.toString()),
      leaf_index: params.input.leafIndex.toString(),
      lp_stealth_pub_x: fieldToHex(params.lpRecipient.stealthPubkey.x),
      lp_randomness: fieldToHex(lpRandomness),
    };

    const proof = await this.prove(circuitName, witnessInputs);

    return {
      proof,
      nullifier,
      lpCommitment,
      lpRandomness,
    };
  }

  /**
   * Generate proof for removing perps liquidity
   *
   * Circuit proves:
   * - Ownership of LP commitment
   * - Correct LP nullifier derivation
   * - Correct output token commitment
   * - Correct change LP commitment
   * - LP balance: lp_amount = burned + change
   */
  async generateRemovePerpsLiquidityProof(
    params: {
      /** LP token input */
      lpInput: {
        stealthPubX: Uint8Array;
        lpAmount: bigint;
        randomness: Uint8Array;
        leafIndex: number;
        spendingKey: Uint8Array;
      };
      /** Perps pool ID */
      perpsPoolId: Uint8Array;
      /** Token index to withdraw (0-7) */
      tokenIndex: number;
      /** LP amount to burn */
      lpAmountBurned: bigint;
      /** Withdraw amount */
      withdrawAmount: bigint;
      /** Fee amount */
      feeAmount: bigint;
      /** Output token recipient */
      outputRecipient: { stealthPubkey: { x: Uint8Array } };
      /** Output token mint */
      outputTokenMint: Uint8Array;
      /** Change LP amount */
      changeLpAmount: bigint;
      /** Merkle root */
      merkleRoot: Uint8Array;
      /** Merkle path */
      merklePath: Uint8Array[];
      /** Merkle path indices */
      merkleIndices: number[];
    },
    keypair: Keypair
  ): Promise<{
    proof: Uint8Array;
    lpNullifier: Uint8Array;
    outputCommitment: Uint8Array;
    changeLpCommitment: Uint8Array;
    outputRandomness: Uint8Array;
    changeLpRandomness: Uint8Array;
  }> {
    const circuitName = 'perps/remove_liquidity';

    if (!this.hasCircuit(circuitName)) {
      throw new Error(`${circuitName} circuit not loaded. Circuits need to be compiled first.`);
    }

    // Derive nullifier key from LP spending key
    const effectiveNullifierKey = deriveNullifierKey(params.lpInput.spendingKey);

    // Recompute LP commitment
    const LP_COMMITMENT_DOMAIN = 9n;
    const lpCommitment = poseidonHashDomain(
      LP_COMMITMENT_DOMAIN,
      params.lpInput.stealthPubX,
      params.perpsPoolId,
      fieldToBytes(params.lpInput.lpAmount),
      params.lpInput.randomness
    );

    // Compute LP nullifier
    const lpNullifier = deriveSpendingNullifier(
      effectiveNullifierKey,
      lpCommitment,
      params.lpInput.leafIndex
    );

    // Generate output randomness
    const outputRandomness = generateRandomness();
    const changeLpRandomness = generateRandomness();

    // Compute output token commitment
    const outputCommitment = computeCommitment({
      stealthPubX: params.outputRecipient.stealthPubkey.x,
      tokenMint: params.outputTokenMint,
      amount: params.withdrawAmount,
      randomness: outputRandomness,
    } as any);

    // Compute change LP commitment
    const changeLpCommitment = poseidonHashDomain(
      LP_COMMITMENT_DOMAIN,
      params.lpInput.stealthPubX, // Same owner
      params.perpsPoolId,
      fieldToBytes(params.changeLpAmount),
      changeLpRandomness
    );

    // Pad merkle path
    const merklePath = [...params.merklePath];
    while (merklePath.length < 32) {
      merklePath.push(new Uint8Array(32));
    }
    const merkleIndices = [...params.merkleIndices];
    while (merkleIndices.length < 32) {
      merkleIndices.push(0);
    }

    const witnessInputs = {
      // Public inputs
      merkle_root: fieldToHex(params.merkleRoot),
      lp_nullifier: fieldToHex(lpNullifier),
      // IMPORTANT: Use pubkeyToField to match on-chain pubkey_to_field reduction
      perps_pool_id: fieldToHex(pubkeyToField(new PublicKey(params.perpsPoolId))),
      out_commitment: fieldToHex(outputCommitment),
      token_index: params.tokenIndex.toString(),
      withdraw_amount: params.withdrawAmount.toString(),
      lp_amount_burned: params.lpAmountBurned.toString(),
      fee_amount: params.feeAmount.toString(),

      // Private inputs
      lp_stealth_pub_x: fieldToHex(params.lpInput.stealthPubX),
      lp_amount: params.lpInput.lpAmount.toString(),
      lp_randomness: fieldToHex(params.lpInput.randomness),
      lp_spending_key: fieldToHex(params.lpInput.spendingKey),
      merkle_path: merklePath.map(p => fieldToHex(p)),
      merkle_path_indices: merkleIndices.map(i => i.toString()),
      leaf_index: params.lpInput.leafIndex.toString(),
      out_stealth_pub_x: fieldToHex(params.outputRecipient.stealthPubkey.x),
      out_token_mint: fieldToHex(params.outputTokenMint),
      out_randomness: fieldToHex(outputRandomness),
      change_lp_commitment: fieldToHex(changeLpCommitment),
      change_lp_amount: params.changeLpAmount.toString(),
      change_lp_randomness: fieldToHex(changeLpRandomness),
    };

    const proof = await this.prove(circuitName, witnessInputs);

    return {
      proof,
      lpNullifier,
      outputCommitment,
      changeLpCommitment,
      outputRandomness,
      changeLpRandomness,
    };
  }

}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert field element (Uint8Array) to hex string for circuit inputs
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
