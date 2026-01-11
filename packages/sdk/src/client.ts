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
} from '@cloakcraft/types';

import { Wallet, createWallet, loadWallet } from './wallet';
import { NoteManager } from './notes';
import { ProofGenerator } from './proofs';

export interface CloakCraftClientConfig {
  /** Solana RPC URL */
  rpcUrl: string;
  /** Indexer API URL */
  indexerUrl: string;
  /** CloakCraft program ID */
  programId: PublicKey;
  /** Optional commitment level */
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

export class CloakCraftClient {
  readonly connection: Connection;
  readonly programId: PublicKey;
  readonly indexerUrl: string;

  private wallet: Wallet | null = null;
  private noteManager: NoteManager;
  private proofGenerator: ProofGenerator;

  constructor(config: CloakCraftClientConfig) {
    this.connection = new Connection(config.rpcUrl, config.commitment ?? 'confirmed');
    this.programId = config.programId;
    this.indexerUrl = config.indexerUrl;
    this.noteManager = new NoteManager(config.indexerUrl);
    this.proofGenerator = new ProofGenerator();
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
}
