/**
 * CloakCraft Client
 *
 * Main entry point for interacting with the protocol
 */

import {
  Connection,
  PublicKey,
  Transaction,
  Keypair as SolanaKeypair,
} from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';

import type {
  ShieldParams,
  TransferParams,
  AdapterSwapParams,
  OrderParams,
  TransactionResult,
  DecryptedNote,
  PoolState,
  SyncStatus,
  StealthAddress,
  PreparedInput,
  TransferOutput,
} from '@cloakcraft/types';

import { Wallet, createWallet, loadWallet } from './wallet';
import { NoteManager } from './notes';
import { ProofGenerator } from './proofs';
import { computeCommitment, generateRandomness, createNote } from './crypto/commitment';
import { derivePublicKey } from './crypto/babyjubjub';
import { poseidonHash, fieldToBytes, bytesToField, initPoseidon } from './crypto/poseidon';
import { deriveNullifierKey, deriveSpendingNullifier } from './crypto/nullifier';
import { deriveStealthPrivateKey } from './crypto/stealth';
import {
  LightCommitmentClient,
  LightNullifierParams,
  DEVNET_LIGHT_TREES,
  MAINNET_LIGHT_TREES,
} from './light';
import {
  buildShieldWithProgram,
  buildTransactWithProgram,
  storeCommitments,
  initializePool as initPool,
} from './instructions';

export interface CloakCraftClientConfig {
  /** Solana RPC URL */
  rpcUrl: string;
  /** Indexer API URL */
  indexerUrl: string;
  /** CloakCraft program ID */
  programId: PublicKey;
  /** Optional commitment level */
  commitment?: 'processed' | 'confirmed' | 'finalized';
  /** Helius API key for Light Protocol (nullifier storage) */
  heliusApiKey?: string;
  /** Network for Light Protocol */
  network?: 'mainnet-beta' | 'devnet';
  /** Base URL for circuit artifacts (browser only) */
  circuitsBaseUrl?: string;
  /** Node.js prover config (auto-detected if not provided) */
  nodeProverConfig?: {
    circuitsDir: string;
    sunspotPath: string;
    nargoPath: string;
  };
}

export class CloakCraftClient {
  readonly connection: Connection;
  readonly programId: PublicKey;
  readonly rpcUrl: string;
  readonly indexerUrl: string;
  readonly network: 'mainnet-beta' | 'devnet';

  private wallet: Wallet | null = null;
  private noteManager: NoteManager;
  private proofGenerator: ProofGenerator;
  private lightClient: LightCommitmentClient | null = null;
  private program: Program | null = null;
  private heliusRpcUrl: string | null = null;

  constructor(config: CloakCraftClientConfig) {
    this.connection = new Connection(config.rpcUrl, config.commitment ?? 'confirmed');
    this.programId = config.programId;
    this.rpcUrl = config.rpcUrl;
    this.indexerUrl = config.indexerUrl;
    this.network = config.network ?? 'devnet';
    this.noteManager = new NoteManager(config.indexerUrl);

    // Configure proof generator for environment
    this.proofGenerator = new ProofGenerator({
      baseUrl: config.circuitsBaseUrl,
      nodeConfig: config.nodeProverConfig,
    });

    // Auto-configure for Node.js if not explicitly configured
    const isNode = typeof globalThis.process !== 'undefined'
      && globalThis.process.versions != null
      && globalThis.process.versions.node != null;

    if (isNode && !config.nodeProverConfig) {
      this.proofGenerator.configureForNode();
    }

    // Initialize Light Protocol client and RPC URL if Helius API key provided
    if (config.heliusApiKey) {
      const baseUrl = this.network === 'mainnet-beta'
        ? 'https://mainnet.helius-rpc.com'
        : 'https://devnet.helius-rpc.com';
      this.heliusRpcUrl = `${baseUrl}/?api-key=${config.heliusApiKey}`;

      this.lightClient = new LightCommitmentClient({
        apiKey: config.heliusApiKey,
        network: this.network,
      });
    }
  }

  /**
   * Get the Helius RPC URL (required for Light Protocol operations)
   */
  getHeliusRpcUrl(): string {
    if (!this.heliusRpcUrl) {
      throw new Error('Helius API key not configured. Light Protocol operations require heliusApiKey in config.');
    }
    return this.heliusRpcUrl;
  }

  /**
   * Initialize proof generator
   *
   * Must be called before generating proofs.
   * Loads circuit artifacts (manifests, proving keys, zkeys).
   *
   * @param circuits - Optional list of circuits to load (loads all by default)
   */
  async initializeProver(circuits?: string[]): Promise<void> {
    // Initialize Poseidon hash function (required for circomlibjs)
    await initPoseidon();
    await this.proofGenerator.initialize(circuits);
  }

  /**
   * Get the proof generator instance
   *
   * For advanced usage - direct proof generation
   */
  getProofGenerator(): ProofGenerator {
    return this.proofGenerator;
  }

  /**
   * Set the Anchor program instance
   * Required for transaction building
   */
  setProgram(program: Program): void {
    this.program = program;
  }

  /**
   * Get the Anchor program instance
   */
  getProgram(): Program | null {
    return this.program;
  }

  /**
   * Get Light Protocol tree accounts for current network
   */
  getLightTrees() {
    return this.network === 'mainnet-beta' ? MAINNET_LIGHT_TREES : DEVNET_LIGHT_TREES;
  }

  /**
   * Check if a nullifier has been spent
   *
   * Returns true if the nullifier compressed account exists
   *
   * @param nullifier - The nullifier bytes
   * @param pool - The pool public key (used in address derivation seeds)
   */
  async isNullifierSpent(nullifier: Uint8Array, pool: PublicKey): Promise<boolean> {
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const trees = this.getLightTrees();
    return this.lightClient.isNullifierSpent(
      nullifier,
      this.programId,
      trees.addressTree,
      pool
    );
  }

  /**
   * Prepare Light Protocol params for a transact instruction
   *
   * This fetches the validity proof from Helius for nullifier creation
   *
   * @param nullifier - The nullifier bytes
   * @param pool - The pool public key (used in address derivation seeds)
   */
  async prepareLightParams(nullifier: Uint8Array, pool: PublicKey): Promise<LightNullifierParams> {
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const trees = this.getLightTrees();
    const stateTreeSet = trees.stateTrees[0]; // Use first state tree set
    return this.lightClient.prepareLightParams({
      nullifier,
      pool,
      programId: this.programId,
      addressMerkleTree: trees.addressTree,
      stateMerkleTree: stateTreeSet.stateTree,
      // These indices depend on how remaining_accounts is ordered
      addressMerkleTreeAccountIndex: 5,
      addressQueueAccountIndex: 6,
      outputTreeIndex: 0,
    });
  }

  /**
   * Get remaining accounts needed for Light Protocol CPI
   */
  async getLightRemainingAccounts() {
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const trees = this.getLightTrees();
    const stateTreeSet = trees.stateTrees[0]; // Use first state tree set
    return this.lightClient.getRemainingAccounts({
      stateMerkleTree: stateTreeSet.stateTree,
      addressMerkleTree: trees.addressTree,
      nullifierQueue: stateTreeSet.outputQueue,
    });
  }

  /**
   * Create a new wallet
   */
  createWallet(): Wallet {
    this.wallet = createWallet();
    return this.wallet;
  }

  /**
   * Load wallet from spending key
   * Async because it initializes Poseidon hash function if needed
   */
  async loadWallet(spendingKey: Uint8Array): Promise<Wallet> {
    // Initialize Poseidon before deriving keys
    await initPoseidon();
    this.wallet = loadWallet(spendingKey);
    return this.wallet;
  }

  /**
   * Get current wallet
   */
  getWallet(): Wallet | null {
    return this.wallet;
  }

  /**
   * Initialize a new pool for a token
   */
  async initializePool(
    tokenMint: PublicKey,
    payer: SolanaKeypair
  ): Promise<{ poolTx: string; counterTx: string }> {
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    return initPool(this.program, tokenMint, payer.publicKey, payer.publicKey);
  }

  /**
   * Get pool state
   */
  async getPool(tokenMint: PublicKey): Promise<PoolState | null> {
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenMint.toBuffer()],
      this.programId
    );

    // Use Anchor program if available for automatic decoding
    if (this.program) {
      try {
        const pool = await (this.program.account as any).pool.fetch(poolPda);
        return {
          tokenMint: pool.tokenMint,
          tokenVault: pool.tokenVault,
          totalShielded: BigInt(pool.totalShielded.toString()),
          authority: pool.authority,
          bump: pool.bump,
          vaultBump: pool.vaultBump,
        };
      } catch (e: any) {
        // Account doesn't exist - check various error patterns
        const msg = e.message?.toLowerCase() ?? '';
        if (
          msg.includes('account does not exist') ||
          msg.includes('could not find') ||
          msg.includes('not found') ||
          msg.includes('null') ||
          e.toString().includes('AccountNotFound')
        ) {
          return null;
        }
        throw e;
      }
    }

    // Fallback to raw account fetch (no program available)
    const accountInfo = await this.connection.getAccountInfo(poolPda);
    if (!accountInfo) return null;

    // Manual decoding when Anchor program not available
    // Pool account layout: 8 (discriminator) + 32 (token_mint) + 32 (token_vault) + 8 (total_shielded) + 32 (authority) + 1 (bump) + 1 (vault_bump)
    const data = accountInfo.data;
    if (data.length < 114) return null;

    return {
      tokenMint: new PublicKey(data.subarray(8, 40)),
      tokenVault: new PublicKey(data.subarray(40, 72)),
      totalShielded: data.readBigUInt64LE(72),
      authority: new PublicKey(data.subarray(80, 112)),
      bump: data[112],
      vaultBump: data[113],
    };
  }

  /**
   * Sync notes for the current wallet
   */
  async syncNotes(): Promise<DecryptedNote[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    return this.noteManager.syncNotes(this.wallet.keypair);
  }

  /**
   * Get unspent notes for a token
   */
  async getUnspentNotes(tokenMint: PublicKey): Promise<DecryptedNote[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    return this.noteManager.getUnspentNotes(this.wallet.keypair, tokenMint);
  }

  /**
   * Shield tokens into the pool
   *
   * Uses the new instruction builder for full Light Protocol integration
   */
  async shield(
    params: ShieldParams,
    payer: SolanaKeypair
  ): Promise<TransactionResult & { commitment: Uint8Array; randomness: Uint8Array }> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Build shield using instruction builder
    // Note encrypts to stealthPubkey; ephemeralPubkey stored on-chain for decryption key derivation
    // Use Helius RPC URL for Light Protocol operations
    const { tx, commitment, randomness } = await buildShieldWithProgram(
      this.program,
      {
        tokenMint: params.pool,
        amount: params.amount,
        stealthPubkey: params.recipient.stealthPubkey,
        stealthEphemeralPubkey: params.recipient.ephemeralPubkey,
        userTokenAccount: params.userTokenAccount!,
        user: payer.publicKey,
      },
      this.getHeliusRpcUrl()
    );

    // Execute transaction
    const signature = await tx.rpc();

    return {
      signature,
      slot: 0, // Slot is not available from rpc()
      commitment,
      randomness,
    };
  }

  /**
   * Shield tokens into the pool using wallet adapter
   *
   * Uses the program's provider wallet for signing
   */
  async shieldWithWallet(
    params: ShieldParams,
    walletPublicKey: PublicKey
  ): Promise<TransactionResult & { commitment: Uint8Array; randomness: Uint8Array }> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Build shield using instruction builder
    // Note encrypts to stealthPubkey; ephemeralPubkey stored on-chain for decryption key derivation
    // Use Helius RPC URL for Light Protocol operations
    const { tx, commitment, randomness } = await buildShieldWithProgram(
      this.program,
      {
        tokenMint: params.pool,
        amount: params.amount,
        stealthPubkey: params.recipient.stealthPubkey,
        stealthEphemeralPubkey: params.recipient.ephemeralPubkey,
        userTokenAccount: params.userTokenAccount!,
        user: walletPublicKey,
      },
      this.getHeliusRpcUrl()
    );

    // Execute transaction using wallet adapter
    const signature = await tx.rpc();

    return {
      signature,
      slot: 0,
      commitment,
      randomness,
    };
  }

  /**
   * Private transfer
   *
   * Generates ZK proof client-side (privacy-preserving) and submits transaction.
   * The proof generation happens entirely in the browser/local environment.
   *
   * @param params - Transfer parameters with prepared inputs
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async transfer(
    params: TransferParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the required circuit is loaded
    const circuitName = params.inputs.length === 1 ? 'transfer/1x2' : 'transfer/1x3';
    if (!this.proofGenerator.hasCircuit(circuitName)) {
      throw new Error(`Prover not initialized. Call initializeProver(['${circuitName}']) first.`);
    }

    // Get the token mint as PublicKey
    const tokenMint = params.inputs[0].tokenMint instanceof Uint8Array
      ? new PublicKey(params.inputs[0].tokenMint)
      : params.inputs[0].tokenMint;

    // Fetch current leaf index from PoolCommitmentCounter before transaction
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenMint.toBuffer()],
      this.programId
    );
    const [counterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('commitment_counter'), poolPda.toBuffer()],
      this.programId
    );
    const counterAccount = await this.connection.getAccountInfo(counterPda);
    if (!counterAccount) {
      throw new Error('PoolCommitmentCounter not found. Initialize pool first.');
    }
    // Decode: 8 (discriminator) + 32 (pool) + 8 (next_leaf_index)
    const baseLeafIndex = counterAccount.data.readBigUInt64LE(40);

    // Generate proof client-side (all private data stays local)
    const proof = await this.proofGenerator.generateTransferProof(
      params,
      this.wallet.keypair
    );

    // Require accountHash for commitment existence proof
    const accountHash = params.inputs[0].accountHash;
    if (!accountHash) {
      throw new Error('Input note missing accountHash. Use scanNotes() to get notes with accountHash.');
    }

    // Compute nullifier using same logic as proof generator (stealth key derivation)
    const input = params.inputs[0];
    let stealthSpendingKey: bigint;
    if (input.stealthEphemeralPubkey) {
      const baseSpendingKey = bytesToField(this.wallet.keypair.spending.sk);
      stealthSpendingKey = deriveStealthPrivateKey(baseSpendingKey, input.stealthEphemeralPubkey);
    } else {
      stealthSpendingKey = bytesToField(this.wallet.keypair.spending.sk);
    }
    const stealthNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
    const inputCommitment = computeCommitment(input);
    const nullifier = deriveSpendingNullifier(stealthNullifierKey, inputCommitment, input.leafIndex);

    // Debug: print public inputs for comparison with snarkjs output
    const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    const toFieldBigInt = (arr: Uint8Array) => BigInt('0x' + toHex(arr));

    // Compute dummy commitment if needed
    let out2Commitment: Uint8Array;
    if (params.outputs[1]?.commitment) {
      out2Commitment = params.outputs[1].commitment;
    } else {
      out2Commitment = computeCommitment({
        stealthPubX: new Uint8Array(32),
        tokenMint,
        amount: 0n,
        randomness: new Uint8Array(32),
      });
    }

    // Convert token mint to field element (same as circuit)
    const tokenMintBytes = tokenMint.toBytes();
    const tokenMintField = toFieldBigInt(tokenMintBytes);


    // Build transaction using instruction builder
    // Use Helius RPC URL for Light Protocol operations
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const { tx, result } = await buildTransactWithProgram(
      this.program,
      {
        tokenMint,
        input: {
          stealthPubX: params.inputs[0].stealthPubX,
          amount: params.inputs[0].amount,
          randomness: params.inputs[0].randomness,
          leafIndex: params.inputs[0].leafIndex,
          spendingKey: BigInt('0x' + Buffer.from(this.wallet.keypair.spending.sk).toString('hex')),
          accountHash,
        },
        outputs: params.outputs.map(o => ({
          recipientPubkey: o.recipient.stealthPubkey,
          ephemeralPubkey: o.recipient.ephemeralPubkey,
          amount: o.amount,
          commitment: o.commitment,
          randomness: o.randomness,
        })),
        merkleRoot: params.merkleRoot,
        merklePath: params.merklePath,
        merklePathIndices: params.merkleIndices,
        unshieldAmount: params.unshield?.amount,
        unshieldRecipient: params.unshield?.recipient,
        relayer: relayer?.publicKey ?? (await this.getRelayerPubkey()),
        proof,
        nullifier,
        inputCommitment,
      },
      heliusRpcUrl,
      circuitName === 'transfer/1x2' ? 'transfer_1x2' : 'transfer_1x3'
    );

    // Execute transaction
    const signature = await tx.rpc();

    // Store output commitments with correct leaf indices
    // Filter out dummy outputs (empty encrypted notes) and 0-amount outputs
    const realOutputs = result.outputCommitments
      .map((c, i) => ({
        commitment: c,
        leafIndex: baseLeafIndex + BigInt(i),
        stealthEphemeralPubkey: result.stealthEphemeralPubkeys[i],
        encryptedNote: result.encryptedNotes[i],
        amount: result.outputAmounts[i],
      }))
      .filter(o => o.encryptedNote.length > 0 && o.amount > 0n);

    if (realOutputs.length > 0) {
      await storeCommitments(
        this.program,
        tokenMint,
        realOutputs,
        relayer?.publicKey ?? (await this.getRelayerPubkey()),
        heliusRpcUrl
      );
    }

    return {
      signature,
      slot: 0,
    };
  }

  /**
   * Get relayer public key (without requiring keypair)
   * Falls back to self-relay mode (provider wallet pays own fees) if no relayer configured
   */
  private async getRelayerPubkey(): Promise<PublicKey> {
    // Self-relay mode: use the Anchor provider's wallet as relayer
    // Less private but works for testing
    if (this.program?.provider && 'publicKey' in this.program.provider) {
      const providerWallet = this.program.provider as { publicKey: PublicKey };
      console.warn('[getRelayerPubkey] No relayer configured - using self-relay mode (provider wallet pays fees)');
      return providerWallet.publicKey;
    }
    throw new Error('No relayer configured and no provider wallet available.');
  }

  /**
   * Prepare simple transfer inputs and execute transfer
   *
   * This is a convenience method that handles all cryptographic preparation:
   * - Derives Y-coordinates from spending key
   * - Fetches merkle proofs from indexer
   * - Computes output commitments
   */
  async prepareAndTransfer(
    request: {
      inputs: DecryptedNote[];
      outputs: Array<{ recipient: StealthAddress; amount: bigint }>;
      unshield?: { amount: bigint; recipient: PublicKey };
    },
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    // Get tokenMint from first input (all inputs in a transfer must use same token)
    const tokenMint = request.inputs[0].tokenMint;

    // Prepare inputs with Y-coordinates and merkle proofs
    const preparedInputs = await this.prepareInputs(request.inputs);

    // Prepare outputs with commitments (using same tokenMint as inputs)
    const preparedOutputs = await this.prepareOutputs(request.outputs, tokenMint);

    // Use commitment as merkle_root with dummy path
    // The circuit doesn't verify merkle path (it's for ABI compatibility only).
    // Commitment existence is verified on-chain via Light Protocol account lookup.
    // DO NOT use Light Protocol's merkle proof leafIndex - it's for the state tree,
    // not CloakCraft's commitment counter. The scanned note has the correct leafIndex.
    const commitment = preparedInputs[0].commitment;
    const dummyPath = Array(32).fill(new Uint8Array(32));
    const dummyIndices = Array(32).fill(0);


    // Build full TransferParams
    const params: TransferParams = {
      inputs: preparedInputs,
      merkleRoot: commitment,
      merklePath: dummyPath,
      merkleIndices: dummyIndices,
      outputs: preparedOutputs,
      unshield: request.unshield,
    };

    return this.transfer(params, relayer);
  }

  /**
   * Swap through external adapter (partial privacy)
   */
  async swapViaAdapter(
    params: AdapterSwapParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    // Generate proof
    const proof = await this.proofGenerator.generateAdapterProof(
      params,
      this.wallet.keypair
    );

    // Build transaction
    const tx = await this.buildAdapterSwapTransaction(params, proof);

    // Sign and send
    const payer = relayer ?? (await this.getRelayer());
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);

    const signature = await this.connection.sendRawTransaction(tx.serialize());
    const confirmation = await this.connection.confirmTransaction(signature);

    return {
      signature,
      slot: confirmation.context.slot,
    };
  }

  /**
   * Create a market order
   */
  async createOrder(
    params: OrderParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    // Generate proof
    const proof = await this.proofGenerator.generateOrderProof(
      params,
      this.wallet.keypair
    );

    // Build transaction
    const tx = await this.buildCreateOrderTransaction(params, proof);

    // Sign and send
    const payer = relayer ?? (await this.getRelayer());
    tx.feePayer = payer.publicKey;
    tx.recentBlockhash = (await this.connection.getLatestBlockhash()).blockhash;
    tx.sign(payer);

    const signature = await this.connection.sendRawTransaction(tx.serialize());
    const confirmation = await this.connection.confirmTransaction(signature);

    return {
      signature,
      slot: confirmation.context.slot,
    };
  }

  /**
   * Prepare and create a market order (convenience method)
   */
  async prepareAndCreateOrder(
    request: {
      input: DecryptedNote;
      terms: {
        offerMint: PublicKey;
        offerAmount: bigint;
        requestMint: PublicKey;
        requestAmount: bigint;
      };
      expiry: number;
    },
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    // Prepare input
    const [preparedInput] = await this.prepareInputs([request.input]);

    // Fetch merkle proof
    const merkleProof = await this.fetchMerkleProof(request.input);

    // CRITICAL: Use the actual leafIndex from the merkle proof
    preparedInput.leafIndex = merkleProof.leafIndex;

    // Generate order ID and other derived values

    const orderIdBytes = generateRandomness();
    const escrowRandomness = generateRandomness();

    // Compute escrow commitment
    const escrowNote = createNote(
      preparedInput.stealthPubX,
      request.terms.offerMint,
      request.terms.offerAmount,
      escrowRandomness
    );
    const escrowCommitment = computeCommitment(escrowNote);

    // Compute terms hash (convert all values to FieldElement bytes)
    const termsHash = poseidonHash([
      request.terms.offerMint.toBytes(),
      fieldToBytes(request.terms.offerAmount),
      request.terms.requestMint.toBytes(),
      fieldToBytes(request.terms.requestAmount),
    ]);

    // Compute nullifier (use proof's leafIndex)
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    const inputCommitment = computeCommitment(request.input);
    const nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, merkleProof.leafIndex);

    // Build full OrderParams
    const params: OrderParams = {
      input: preparedInput,
      merkleRoot: merkleProof.root,
      merklePath: merkleProof.pathElements,
      merkleIndices: merkleProof.pathIndices,
      nullifier,
      orderId: orderIdBytes,
      escrowCommitment,
      termsHash, // poseidonHash already returns FieldElement
      escrowStealthPubX: preparedInput.stealthPubX,
      escrowRandomness,
      makerReceiveStealthPubX: preparedInput.stealthPubX, // Self
      terms: request.terms,
      expiry: request.expiry,
    };

    return this.createOrder(params, relayer);
  }

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return this.noteManager.getSyncStatus();
  }

  /**
   * Scan for unspent notes belonging to the current wallet
   *
   * Uses the Light Protocol scanner to find and decrypt notes,
   * then filters out spent notes using nullifier detection.
   *
   * @param tokenMint - Optional token mint to filter by (derives pool PDA internally)
   */
  async scanNotes(tokenMint?: PublicKey): Promise<DecryptedNote[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);

    // Derive pool PDA from token mint if provided
    // Commitment accounts store pool PDA, not token mint
    let poolPda: PublicKey | undefined;
    if (tokenMint) {
      [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), tokenMint.toBuffer()],
        this.programId
      );
    }

    // Use getUnspentNotes to filter out spent notes
    return this.lightClient.getUnspentNotes(viewingKey, nullifierKey, this.programId, poolPda);
  }

  /**
   * Get balance for the current wallet
   *
   * Scans for unspent notes and sums their amounts
   *
   * @param tokenMint - Optional token mint to filter by (derives pool PDA internally)
   */
  async getPrivateBalance(tokenMint?: PublicKey): Promise<bigint> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);

    // Derive pool PDA from token mint if provided
    // Commitment accounts store pool PDA, not token mint
    let poolPda: PublicKey | undefined;
    if (tokenMint) {
      [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), tokenMint.toBuffer()],
        this.programId
      );
    }

    return this.lightClient.getBalance(viewingKey, nullifierKey, this.programId, poolPda);
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async buildAdapterSwapTransaction(
    _params: AdapterSwapParams,
    _proof: Uint8Array
  ): Promise<Transaction> {
    // Implementation: Build adapter swap instruction
    const tx = new Transaction();
    return tx;
  }

  private async buildCreateOrderTransaction(
    _params: OrderParams,
    _proof: Uint8Array
  ): Promise<Transaction> {
    // Implementation: Build create order instruction
    const tx = new Transaction();
    return tx;
  }

  private async getRelayer(): Promise<SolanaKeypair> {
    // In production: Connect to TunnelCraft relay network
    throw new Error('No relayer configured');
  }

  private decodePoolState(_data: Buffer): PoolState {
    // Implementation: Decode pool account data
    throw new Error('Not implemented');
  }

  /**
   * Prepare inputs for proving
   */
  private async prepareInputs(inputs: DecryptedNote[]): Promise<PreparedInput[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    return inputs.map(input => ({ ...input }));
  }

  /**
   * Prepare outputs by computing commitments
   *
   * @param outputs - Output recipients and amounts
   * @param tokenMint - Token mint for all outputs (must match inputs)
   */
  private async prepareOutputs(
    outputs: Array<{ recipient: StealthAddress; amount: bigint }>,
    tokenMint: PublicKey
  ): Promise<TransferOutput[]> {

    return outputs.map(output => {
      const randomness = generateRandomness();

      // Create note to compute commitment with actual tokenMint
      const note = createNote(
        output.recipient.stealthPubkey.x,
        tokenMint,
        output.amount,
        randomness
      );

      const commitment = computeCommitment(note);

      return {
        recipient: output.recipient,
        amount: output.amount,
        commitment,
        stealthPubX: output.recipient.stealthPubkey.x,
        randomness,
      };
    });
  }

  /**
   * Fetch merkle proof from Light Protocol
   *
   * Uses accountHash if available (from scanner), otherwise derives address.
   */
  private async fetchMerkleProof(note: DecryptedNote): Promise<{
    root: Uint8Array;
    pathElements: Uint8Array[];
    pathIndices: number[];
    leafIndex: number;
  }> {
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    // Prefer using stored hash (same data flow as scanner - guaranteed to work)
    if (note.accountHash) {
      const proof = await this.lightClient.getMerkleProofByHash(note.accountHash);
      return {
        root: proof.root,
        pathElements: proof.pathElements,
        pathIndices: proof.pathIndices,
        leafIndex: proof.leafIndex,
      };
    }

    // Fallback: derive address and fetch hash
    const trees = this.getLightTrees();
    const stateTreeSet = trees.stateTrees[0];

    const proof = await this.lightClient.getCommitmentMerkleProof(
      note.pool,
      note.commitment,
      this.programId,
      trees.addressTree,
      stateTreeSet.stateTree
    );

    return {
      root: proof.root,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
      leafIndex: proof.leafIndex,
    };
  }
}
