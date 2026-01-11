/**
 * CloakCraft Client
 *
 * Main entry point for interacting with the protocol
 */

import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  Keypair as SolanaKeypair,
} from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

import type {
  Keypair,
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
import { computeCommitment, generateRandomness } from './crypto/commitment';
import { derivePublicKey } from './crypto/babyjubjub';
import {
  LightClient,
  LightNullifierParams,
  HeliusConfig,
  DEVNET_LIGHT_TREES,
  MAINNET_LIGHT_TREES,
} from './light';

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
}

export class CloakCraftClient {
  readonly connection: Connection;
  readonly programId: PublicKey;
  readonly indexerUrl: string;
  readonly network: 'mainnet-beta' | 'devnet';

  private wallet: Wallet | null = null;
  private noteManager: NoteManager;
  private proofGenerator: ProofGenerator;
  private lightClient: LightClient | null = null;

  constructor(config: CloakCraftClientConfig) {
    this.connection = new Connection(config.rpcUrl, config.commitment ?? 'confirmed');
    this.programId = config.programId;
    this.indexerUrl = config.indexerUrl;
    this.network = config.network ?? 'devnet';
    this.noteManager = new NoteManager(config.indexerUrl);
    this.proofGenerator = new ProofGenerator();

    // Initialize Light Protocol client if Helius API key provided
    if (config.heliusApiKey) {
      this.lightClient = new LightClient({
        apiKey: config.heliusApiKey,
        network: this.network,
      });
    }
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
   */
  async isNullifierSpent(nullifier: Uint8Array): Promise<boolean> {
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const trees = this.getLightTrees();
    return this.lightClient.isNullifierSpent(
      nullifier,
      this.programId,
      trees.addressMerkleTree
    );
  }

  /**
   * Prepare Light Protocol params for a transact instruction
   *
   * This fetches the validity proof from Helius for nullifier creation
   */
  async prepareLightParams(nullifier: Uint8Array): Promise<LightNullifierParams> {
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const trees = this.getLightTrees();
    return this.lightClient.prepareLightParams({
      nullifier,
      programId: this.programId,
      addressMerkleTree: trees.addressMerkleTree,
      stateMerkleTree: trees.stateMerkleTree,
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
    return this.lightClient.getRemainingAccounts(trees);
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
   */
  loadWallet(spendingKey: Uint8Array): Wallet {
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
   * Get pool state
   */
  async getPool(tokenMint: PublicKey): Promise<PoolState | null> {
    const [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), tokenMint.toBuffer()],
      this.programId
    );

    const accountInfo = await this.connection.getAccountInfo(poolPda);
    if (!accountInfo) return null;

    // Decode pool state from account data
    // In production, use Anchor's automatic decoding
    return this.decodePoolState(accountInfo.data);
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
   */
  async shield(
    params: ShieldParams,
    payer: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    // Build shield transaction
    const tx = await this.buildShieldTransaction(params);

    // Sign and send
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
   * Private transfer
   */
  async transfer(
    params: TransferParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    // Generate proof
    const proof = await this.proofGenerator.generateTransferProof(
      params,
      this.wallet.keypair
    );

    // Build transaction
    const tx = await this.buildTransferTransaction(params, proof);

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

    // Prepare inputs with Y-coordinates and merkle proofs
    const preparedInputs = await this.prepareInputs(request.inputs);

    // Prepare outputs with commitments
    const preparedOutputs = await this.prepareOutputs(request.outputs);

    // Get merkle proof for the first input (all inputs must use same root)
    const merkleProof = await this.fetchMerkleProof(request.inputs[0]);

    // Build full TransferParams
    const params: TransferParams = {
      inputs: preparedInputs,
      merkleRoot: merkleProof.root,
      merklePath: merkleProof.pathElements,
      merkleIndices: merkleProof.pathIndices,
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

    // Generate order ID and other derived values
    const { poseidonHash, fieldToBytes } = await import('./crypto/poseidon');
    const orderIdBytes = generateRandomness();
    const escrowRandomness = generateRandomness();

    // Compute escrow commitment
    const escrowNote = (await import('./crypto/commitment')).createNote(
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

    // Compute nullifier
    const { deriveNullifierKey, deriveSpendingNullifier } = await import('./crypto/nullifier');
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);
    const inputCommitment = computeCommitment(request.input);
    const nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, request.input.leafIndex);

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

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async buildShieldTransaction(params: ShieldParams): Promise<Transaction> {
    // Implementation: Build shield instruction
    const tx = new Transaction();
    // Add shield instruction
    return tx;
  }

  private async buildTransferTransaction(
    params: TransferParams,
    proof: Uint8Array
  ): Promise<Transaction> {
    // Implementation: Build transfer instruction
    const tx = new Transaction();
    // Add transfer instruction with proof
    return tx;
  }

  private async buildAdapterSwapTransaction(
    params: AdapterSwapParams,
    proof: Uint8Array
  ): Promise<Transaction> {
    // Implementation: Build adapter swap instruction
    const tx = new Transaction();
    return tx;
  }

  private async buildCreateOrderTransaction(
    params: OrderParams,
    proof: Uint8Array
  ): Promise<Transaction> {
    // Implementation: Build create order instruction
    const tx = new Transaction();
    return tx;
  }

  private async getRelayer(): Promise<SolanaKeypair> {
    // In production: Connect to TunnelCraft relay network
    throw new Error('No relayer configured');
  }

  private decodePoolState(data: Buffer): PoolState {
    // Implementation: Decode pool account data
    throw new Error('Not implemented');
  }

  /**
   * Prepare inputs by deriving Y-coordinates from the wallet's spending key
   */
  private async prepareInputs(inputs: DecryptedNote[]): Promise<PreparedInput[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    const { bytesToField } = await import('./crypto/poseidon');

    return inputs.map(input => {
      // Derive the full public key from the spending key
      const spendingKey = bytesToField(this.wallet!.keypair.spending.sk);
      const publicKey = derivePublicKey(spendingKey);

      return {
        ...input,
        stealthPubY: publicKey.y,
      };
    });
  }

  /**
   * Prepare outputs by computing commitments
   */
  private async prepareOutputs(
    outputs: Array<{ recipient: StealthAddress; amount: bigint }>
  ): Promise<TransferOutput[]> {
    const { createNote } = await import('./crypto/commitment');

    return outputs.map(output => {
      const randomness = generateRandomness();

      // Get the first pool's token mint (in production, this should be passed)
      // For now, assume outputs use same token as inputs
      const tokenMint = new PublicKey(new Uint8Array(32)); // Placeholder

      // Create note to compute commitment
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
   * Fetch merkle proof from indexer
   */
  private async fetchMerkleProof(note: DecryptedNote): Promise<{
    root: Uint8Array;
    pathElements: Uint8Array[];
    pathIndices: number[];
  }> {
    const commitmentHex = Buffer.from(note.commitment).toString('hex');
    const response = await fetch(`${this.indexerUrl}/merkle-proof/${commitmentHex}`);

    if (!response.ok) {
      throw new Error('Failed to fetch merkle proof');
    }

    const data = await response.json() as {
      root: string;
      pathElements: string[];
      pathIndices: number[];
    };

    return {
      root: Buffer.from(data.root, 'hex'),
      pathElements: data.pathElements.map((e: string) => Buffer.from(e, 'hex')),
      pathIndices: data.pathIndices,
    };
  }
}
