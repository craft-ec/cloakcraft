/**
 * CloakCraft Client
 *
 * Main entry point for interacting with the protocol
 */

import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  Keypair as SolanaKeypair,
} from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { IDL } from './idl';

import type {
  ShieldParams,
  TransferParams,
  TransferProgressStage,
  AdapterSwapParams,
  OrderParams,
  TransactionResult,
  DecryptedNote,
  PoolState,
  AmmPoolState,
  SyncStatus,
  StealthAddress,
  PreparedInput,
  TransferOutput,
  AmmSwapParams,
  AddLiquidityParams,
  RemoveLiquidityParams,
  FillOrderParams,
  CancelOrderParams,
  OpenPerpsPositionParams,
  ClosePerpsPositionParams,
  PerpsAddLiquidityClientParams,
  PerpsRemoveLiquidityClientParams,
} from '@cloakcraft/types';

import { Wallet, createWallet, loadWallet } from './wallet';
import { NoteManager } from './notes';
import { ProofGenerator } from './proofs';
import { computeCommitment, computePositionCommitment, computeLpCommitment, generateRandomness, createNote } from './crypto/commitment';
import { derivePublicKey } from './crypto/babyjubjub';
import { poseidonHash, fieldToBytes, bytesToField, initPoseidon } from './crypto/poseidon';
import { deriveNullifierKey, deriveSpendingNullifier } from './crypto/nullifier';
import { deriveStealthPrivateKey, generateStealthAddress, checkStealthOwnership } from './crypto/stealth';
import {
  LightCommitmentClient,
  LightNullifierParams,
  DEVNET_LIGHT_TREES,
  MAINNET_LIGHT_TREES,
} from './light';
import { PythPriceService, PYTH_FEED_IDS } from './pyth';
import {
  buildShieldWithProgram,
  buildTransactWithProgram,
  buildConsolidationWithProgram,
  storeCommitments,
  initializePool as initPool,
  buildInitializeAmmPoolWithProgram,
  buildSwapWithProgram,
  buildAddLiquidityWithProgram,
  buildRemoveLiquidityWithProgram,
  buildFillOrderWithProgram,
  buildCancelOrderWithProgram,
  deriveAmmPoolPda,
  derivePoolPda,
  deriveOrderPda,
  deriveProtocolConfigPda,
  CIRCUIT_IDS,
} from './instructions';
import {
  buildOpenPositionWithProgram,
  buildClosePositionWithProgram,
  buildAddPerpsLiquidityWithProgram,
  buildRemovePerpsLiquidityWithProgram,
  derivePerpsPoolPda,
  derivePerpsMarketPda,
  derivePerpsVaultPda,
  derivePerpsLpMintPda,
  PERPS_CIRCUIT_IDS,
} from './perps';
import {
  buildVersionedTransaction,
  executeVersionedTransaction,
  estimateTransactionSize,
  MAX_TRANSACTION_SIZE,
} from './versioned-transaction';
import { ALTManager } from './address-lookup-table';

/**
 * Verify transaction didn't revert after Anchor's .rpc() returns
 * Anchor's .rpc() only waits for confirmation, not successful execution
 */
async function verifyTransactionSuccess(
  connection: Connection,
  signature: string,
  operationName: string
): Promise<void> {
  const status = await connection.getSignatureStatus(signature, {
    searchTransactionHistory: true,
  });

  if (status.value?.err) {
    throw new Error(`[${operationName}] Transaction reverted: ${JSON.stringify(status.value.err)}`);
  }
}

export interface CloakCraftClientConfig {
  /** Solana RPC URL (required if connection not provided) */
  rpcUrl?: string;
  /** Solana Connection object (preferred - use same connection as wallet adapter) */
  connection?: Connection;
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
    circomBuildDir: string;
  };
  /** Address Lookup Table addresses for atomic transaction compression (optional) */
  addressLookupTables?: PublicKey[];
}

/**
 * Wallet interface for Anchor (matches wallet adapter structure)
 */
export interface AnchorWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]>;
}

export class CloakCraftClient {
  readonly connection: Connection;
  readonly programId: PublicKey;
  readonly rpcUrl: string;
  readonly indexerUrl: string;
  readonly network: 'mainnet-beta' | 'devnet';

  private wallet: Wallet | null = null;
  private anchorWallet: AnchorWallet | null = null;
  private noteManager: NoteManager;
  private proofGenerator: ProofGenerator;
  private lightClient: LightCommitmentClient | null = null;
  private program: Program | null = null;
  private heliusRpcUrl: string | null = null;
  private altManager: ALTManager;
  private altAddresses: PublicKey[];

  constructor(config: CloakCraftClientConfig) {
    // Use provided connection or create from rpcUrl (like scalecraft pattern)
    if (config.connection) {
      this.connection = config.connection;
      this.rpcUrl = ''; // Not needed when connection is provided
    } else if (config.rpcUrl) {
      this.connection = new Connection(config.rpcUrl, config.commitment ?? 'confirmed');
      this.rpcUrl = config.rpcUrl;
    } else {
      throw new Error('Either connection or rpcUrl must be provided');
    }
    this.programId = config.programId;
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

    // Initialize ALT manager and addresses
    this.altManager = new ALTManager(this.connection);
    this.altAddresses = config.addressLookupTables ?? [];

    // Preload ALTs if provided
    if (this.altAddresses.length > 0) {
      console.log(`[Client] Preloading ${this.altAddresses.length} Address Lookup Tables...`);
      this.altManager.preload(this.altAddresses).catch(err => {
        console.error('[Client] Failed to preload ALTs:', err);
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
   * Build Light Protocol params for spending operations (perps, swaps, etc.)
   *
   * This is a centralized helper that:
   * 1. Gets commitment inclusion proof (proves input exists)
   * 2. Gets nullifier non-inclusion proof (proves not double-spent)
   * 3. Builds packed accounts with correct tree indices
   *
   * @param accountHash - Account hash of the commitment (from scanNotes)
   * @param nullifier - Nullifier to be created
   * @param pool - Pool PDA (used for nullifier address derivation)
   * @param rpcUrl - Helius RPC URL for Light Protocol queries
   */
  async buildLightProtocolParams(
    accountHash: string,
    nullifier: Uint8Array,
    pool: PublicKey,
    rpcUrl: string
  ): Promise<{
    lightVerifyParams: {
      commitmentAccountHash: number[];
      commitmentMerkleContext: {
        merkleTreePubkeyIndex: number;
        queuePubkeyIndex: number;
        leafIndex: number;
        rootIndex: number;
      };
      commitmentInclusionProof: { a: number[]; b: number[]; c: number[] };
      commitmentAddressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
        rootIndex: number;
      };
    };
    lightNullifierParams: {
      proof: { a: number[]; b: number[]; c: number[] };
      addressTreeInfo: {
        addressMerkleTreePubkeyIndex: number;
        addressQueuePubkeyIndex: number;
        rootIndex: number;
      };
      outputTreeIndex: number;
    };
    remainingAccounts: import('@solana/web3.js').AccountMeta[];
  }> {
    const { LightProtocol } = await import('./instructions/light-helpers');
    const { SystemAccountMetaConfig, PackedAccounts } = await import('@lightprotocol/stateless.js');
    const { DEVNET_V2_TREES } = await import('./instructions/constants');

    const lightProtocol = new LightProtocol(rpcUrl, this.programId);

    // Get commitment inclusion proof
    console.log('[buildLightProtocolParams] Fetching commitment inclusion proof...');
    const commitmentProof = await lightProtocol.getInclusionProofByHash(accountHash);
    console.log('[buildLightProtocolParams] Commitment proof leaf index:', commitmentProof.leafIndex);

    // Get nullifier non-inclusion proof
    console.log('[buildLightProtocolParams] Fetching nullifier non-inclusion proof...');
    const nullifierAddress = lightProtocol.deriveNullifierAddress(pool, nullifier);
    const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);

    // Extract trees from proof
    const commitmentTree = new PublicKey(commitmentProof.treeInfo.tree);
    const commitmentQueue = new PublicKey(commitmentProof.treeInfo.queue);

    // Build packed accounts
    const systemConfig = SystemAccountMetaConfig.new(this.programId);
    const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

    // Add output queue
    const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);

    // Add address tree (for both commitment and nullifier)
    const addressTree = DEVNET_V2_TREES.ADDRESS_TREE;
    const addressTreeIndex = packedAccounts.insertOrGet(addressTree);

    // Add commitment STATE tree from proof
    const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
    const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);

    // Add CPI context if present
    const commitmentCpiContext = commitmentProof.treeInfo.cpiContext
      ? new PublicKey(commitmentProof.treeInfo.cpiContext)
      : null;
    if (commitmentCpiContext) {
      packedAccounts.insertOrGet(commitmentCpiContext);
    }

    const { remainingAccounts } = packedAccounts.toAccountMetas();
    const accounts = remainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isWritable: Boolean(acc.isWritable),
      isSigner: Boolean(acc.isSigner),
    }));

    // Build verify params
    const lightVerifyParams = {
      commitmentAccountHash: Array.from(new PublicKey(accountHash).toBytes()),
      commitmentMerkleContext: {
        merkleTreePubkeyIndex: commitmentStateTreeIndex,
        queuePubkeyIndex: commitmentQueueIndex,
        leafIndex: commitmentProof.leafIndex,
        rootIndex: commitmentProof.rootIndex,
      },
      commitmentInclusionProof: LightProtocol.convertCompressedProof(commitmentProof),
      commitmentAddressTreeInfo: {
        addressMerkleTreePubkeyIndex: addressTreeIndex,
        addressQueuePubkeyIndex: addressTreeIndex,
        rootIndex: nullifierProof.rootIndices[0] ?? 0,
      },
    };

    // Build nullifier params (field names must match createNullifierAndPending instruction)
    const lightNullifierParams = {
      proof: LightProtocol.convertCompressedProof(nullifierProof),
      addressTreeInfo: {
        addressMerkleTreePubkeyIndex: addressTreeIndex,
        addressQueuePubkeyIndex: addressTreeIndex,
        rootIndex: nullifierProof.rootIndices[0] ?? 0,
      },
      outputTreeIndex,
    };

    return {
      lightVerifyParams,
      lightNullifierParams,
      remainingAccounts: accounts,
    };
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
   * Get loaded Address Lookup Tables
   *
   * Returns null if no ALTs configured or failed to load
   */
  async getAddressLookupTables(): Promise<import('@solana/web3.js').AddressLookupTableAccount[]> {
    if (this.altAddresses.length === 0) {
      return [];
    }

    const alts = await Promise.all(
      this.altAddresses.map(addr => this.altManager.get(addr))
    );

    return alts.filter((alt): alt is import('@solana/web3.js').AddressLookupTableAccount => alt !== null);
  }

  /**
   * Set the Anchor program instance
   * Required for transaction building
   * @deprecated Use setWallet() instead for proper wallet integration
   */
  setProgram(program: Program): void {
    this.program = program;
  }

  /**
   * Set the wallet and create AnchorProvider/Program internally
   * This matches scalecraft's pattern where the SDK owns the program creation
   * @param wallet - Wallet adapter wallet with signTransaction/signAllTransactions
   */
  setWallet(wallet: AnchorWallet): void {
    this.anchorWallet = wallet;
    this.initProgram();
  }

  /**
   * Initialize the Anchor program with the current wallet
   * Called internally by setWallet (matches scalecraft pattern exactly)
   */
  private initProgram(): void {
    if (!this.anchorWallet) return;

    const provider = new AnchorProvider(this.connection, this.anchorWallet, {
      commitment: 'confirmed',
    });

    // Use IDL directly without modification (scalecraft pattern)
    // IDL already contains the correct program address
    this.program = new Program(IDL as any, provider);
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

    // Derive commitment counter PDA
    const [counterPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('commitment_counter'), poolPda.toBuffer()],
      this.programId
    );

    // Use Anchor program if available for automatic decoding
    if (this.program) {
      try {
        const pool = await (this.program.account as any).pool.fetch(poolPda);

        // Try to fetch commitment counter
        let commitmentCounter: bigint | undefined;
        try {
          const counter = await (this.program.account as any).poolCommitmentCounter.fetch(counterPda);
          // Field is total_commitments in Rust, becomes totalCommitments in JS
          commitmentCounter = BigInt((counter.totalCommitments || counter.total_commitments || 0).toString());
        } catch (e) {
          // Counter might not exist yet
          console.log('[getPool] Could not fetch commitment counter:', e);
          commitmentCounter = 0n;
        }

        return {
          tokenMint: pool.tokenMint,
          tokenVault: pool.tokenVault,
          totalShielded: BigInt(pool.totalShielded.toString()),
          authority: pool.authority,
          bump: pool.bump,
          vaultBump: pool.vaultBump,
          commitmentCounter,
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

    // Try to fetch commitment counter
    let commitmentCounter: bigint | undefined;
    const counterInfo = await this.connection.getAccountInfo(counterPda);
    if (counterInfo && counterInfo.data.length >= 16) {
      // Counter layout: 8 (discriminator) + 8 (count)
      commitmentCounter = counterInfo.data.readBigUInt64LE(8);
    }

    return {
      tokenMint: new PublicKey(data.subarray(8, 40)),
      tokenVault: new PublicKey(data.subarray(40, 72)),
      totalShielded: data.readBigUInt64LE(72),
      authority: new PublicKey(data.subarray(80, 112)),
      bump: data[112],
      vaultBump: data[113],
      commitmentCounter,
    };
  }

  /**
   * Get all initialized pools
   */
  async getAllPools(): Promise<Array<PoolState & { address: PublicKey }>> {
    if (!this.program) {
      throw new Error('Program not configured. Call setProgram() first.');
    }

    try {
      const pools = await (this.program.account as any).pool.all();
      return pools.map((pool: any) => ({
        address: pool.publicKey,
        tokenMint: pool.account.tokenMint,
        tokenVault: pool.account.tokenVault,
        totalShielded: BigInt(pool.account.totalShielded.toString()),
        authority: pool.account.authority,
        bump: pool.account.bump,
        vaultBump: pool.account.vaultBump,
      }));
    } catch (e: any) {
      console.error('Error fetching all pools:', e);
      return [];
    }
  }

  /**
   * Get all AMM pools
   */
  async getAllAmmPools(): Promise<Array<AmmPoolState & { address: PublicKey }>> {
    if (!this.program) {
      throw new Error('Program not configured. Call setProgram() first.');
    }

    try {
      const pools = await (this.program.account as any).ammPool.all();
      return pools.map((pool: any) => ({
        address: pool.publicKey,
        poolId: pool.account.poolId,
        tokenAMint: pool.account.tokenAMint,
        tokenBMint: pool.account.tokenBMint,
        lpMint: pool.account.lpMint,
        stateHash: pool.account.stateHash,
        reserveA: BigInt(pool.account.reserveA.toString()),
        reserveB: BigInt(pool.account.reserveB.toString()),
        lpSupply: BigInt(pool.account.lpSupply.toString()),
        feeBps: pool.account.feeBps,
        authority: pool.account.authority,
        isActive: pool.account.isActive,
        bump: pool.account.bump,
        lpMintBump: pool.account.lpMintBump,
        poolType: pool.account.poolType?.stableSwap !== undefined ? 1 : 0,
        amplification: BigInt(pool.account.amplification?.toString() ?? '0'),
      }));
    } catch (e: any) {
      console.error('Error fetching all AMM pools:', e);
      return [];
    }
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
   * Get merkle proof for a note
   */
  async getMerkleProof(accountHash: string): Promise<{
    root: Uint8Array;
    pathElements: Uint8Array[];
    pathIndices: number[];
    leafIndex: number;
  }> {
    if (!this.lightClient) {
      throw new Error('Light client not initialized');
    }

    const proof = await this.lightClient.getMerkleProofByHash(accountHash);
    return {
      root: proof.root,
      pathElements: proof.pathElements,
      pathIndices: proof.pathIndices,
      leafIndex: proof.leafIndex,
    };
  }

  /**
   * Shield tokens into the pool
   *
   * Uses versioned transactions for atomic execution with Address Lookup Tables
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

    const heliusRpcUrl = this.getHeliusRpcUrl();
    const instructionParams = {
      tokenMint: params.pool,
      amount: params.amount,
      stealthPubkey: params.recipient.stealthPubkey,
      stealthEphemeralPubkey: params.recipient.ephemeralPubkey,
      userTokenAccount: params.userTokenAccount!,
      user: payer.publicKey,
    };

    console.log('[Shield] Building transaction with Anchor...');
    const { buildShieldWithProgram } = await import('./instructions/shield');
    const { tx: anchorTx, commitment, randomness } = await buildShieldWithProgram(
      this.program,
      instructionParams,
      heliusRpcUrl
    );

    // Convert to legacy Transaction
    const { Transaction } = await import('@solana/web3.js');
    const tx = await anchorTx.transaction();

    // Set fee payer and recent blockhash
    tx.feePayer = payer.publicKey;
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;

    // Sign and send
    tx.sign(payer);
    const rawTransaction = tx.serialize();
    const signature = await this.connection.sendRawTransaction(rawTransaction, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    // Wait for confirmation
    const confirmation = await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    }, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('[Shield] ✅ Transaction confirmed:', signature);

    return {
      signature,
      slot: 0,
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

    // Execute transaction using Anchor's RPC
    console.log('[Shield] Sending transaction...');
    const signature = await tx.rpc({
      skipPreflight: false,
      commitment: 'confirmed',
    });
    console.log('[Shield] Transaction sent:', signature);

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

    // Always use transfer_1x2 - consolidate notes first if multiple inputs needed
    const circuitName = 'transfer/1x2';
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
    params.onProgress?.('generating');
    const proof = await this.proofGenerator.generateTransferProof(
      params,
      this.wallet.keypair
    );
    params.onProgress?.('building');

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


    // Build instruction parameters
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? (await this.getRelayerPubkey());

    // Get protocol config and treasury token account if there's a fee
    let protocolConfig: PublicKey | undefined;
    let treasuryWallet: PublicKey | undefined;
    let treasuryTokenAccount: PublicKey | undefined;

    if (params.fee && params.fee > 0n) {
      const [configPda] = deriveProtocolConfigPda(this.programId);
      protocolConfig = configPda;

      // Fetch the treasury wallet from protocol config
      const { fetchProtocolFeeConfig } = await import('./fees');
      const feeConfig = await fetchProtocolFeeConfig(this.connection, this.programId);
      if (feeConfig?.treasury) {
        treasuryWallet = feeConfig.treasury;
        // Derive the treasury's token account for this token
        treasuryTokenAccount = getAssociatedTokenAddressSync(
          tokenMint,
          treasuryWallet,
          true // allowOwnerOffCurve
        );
        console.log('[Transfer] Treasury wallet:', treasuryWallet.toBase58());
        console.log('[Transfer] Treasury token account:', treasuryTokenAccount.toBase58());
      }
    }

    const instructionParams = {
      tokenMint,
      input: {
        stealthPubX: params.inputs[0].stealthPubX,
        amount: params.inputs[0].amount,
        randomness: params.inputs[0].randomness,
        leafIndex: params.inputs[0].leafIndex,
        spendingKey: BigInt('0x' + Buffer.from(this.wallet.keypair.spending.sk).toString('hex')),
        accountHash, // Scanner's accountHash - where commitment actually exists
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
      feeAmount: params.fee,
      protocolConfig,
      treasuryWallet,
      treasuryTokenAccount,
      relayer: relayerPubkey,
      proof,
      nullifier,
      inputCommitment,
    };

    const circuitId = 'transfer_1x2';

    console.log('[Transfer] === Starting Multi-Phase Transfer ===');
    console.log('[Transfer] Circuit:', circuitName);
    console.log('[Transfer] Token:', params.inputs[0].tokenMint.toBase58());
    console.log('[Transfer] Inputs:', params.inputs.length);
    console.log('[Transfer] Outputs:', params.outputs.length);
    console.log('[Transfer] Unshield:', instructionParams.unshieldAmount?.toString() || 'none');
    if (instructionParams.unshieldRecipient) {
      console.log('[Transfer] Unshield recipient:', instructionParams.unshieldRecipient.toBase58());
    }
    console.log('[Transfer] Fee:', instructionParams.feeAmount?.toString() || '0');
    if (protocolConfig) {
      console.log('[Transfer] Protocol config:', protocolConfig.toBase58());
    }
    if (treasuryTokenAccount) {
      console.log('[Transfer] Treasury token account:', treasuryTokenAccount.toBase58());
    }

    // Multi-phase execution with ALT compression
    console.log('[Transfer] Building phase transactions...');

    let phase0Tx, phase1Tx, phase2Tx, phase3Tx, result, operationId, pendingCommitments;
    try {
      const buildResult = await buildTransactWithProgram(
        this.program,
        instructionParams,
        heliusRpcUrl,
        circuitId
      );
      phase0Tx = buildResult.tx;
      phase1Tx = buildResult.phase1Tx;
      phase2Tx = buildResult.phase2Tx;
      phase3Tx = buildResult.phase3Tx;
      result = buildResult.result;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log('[Transfer] Phase transactions built successfully');
    } catch (error: any) {
      console.error('[Transfer] FAILED to build phase transactions:', error);
      throw error;
    }

    // Import generic builders
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Build all transactions upfront for batch signing
    console.log('[Transfer] Building all transactions for batch signing...');
    const transactionBuilders = [];

    // Phase 0: Create pending with proof
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: phase0Tx });

    // Phase 1: Verify commitment exists
    transactionBuilders.push({ name: 'Phase 1 (Verify Commitment)', builder: phase1Tx });

    // Phase 2: Create nullifier
    transactionBuilders.push({ name: 'Phase 2 (Create Nullifier)', builder: phase2Tx });

    // Phase 3: Process unshield (optional)
    if (phase3Tx) {
      transactionBuilders.push({ name: 'Phase 3 (Unshield)', builder: phase3Tx });
    }

    // Phase 4+: Create commitments
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4+i} (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    console.log(`[Transfer] Built ${transactionBuilders.length} transactions`);

    // Get ALTs for address compression
    const lookupTables = await this.getAddressLookupTables();
    if (lookupTables.length === 0) {
      console.warn('[Transfer] No Address Lookup Tables configured! Phase 1 may exceed size limit.');
      console.warn('[Transfer] Run: pnpm tsx scripts/create-alt.ts to create an ALT');
    } else {
      console.log(`[Transfer] Using ${lookupTables.length} Address Lookup Tables for compression`);
      lookupTables.forEach((alt, i) => {
        console.log(`[Transfer] ALT ${i}: ${alt.state.addresses.length} addresses`);
      });
    }

    // Build transactions with ALT compression
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          // Extract ALL instructions (preInstructions + main instruction)
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];

          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);

          return new VersionedTransaction(
            new TransactionMessage({
              payerKey: relayerPubkey,
              recentBlockhash: blockhash,
              instructions: allInstructions, // Include compute budget + main instruction
            }).compileToV0Message(lookupTables) // V0 = ALT-enabled format
          );
        } catch (error: any) {
          console.error(`[Transfer] Failed to build transaction: ${name}`, error);
          throw new Error(`Failed to build ${name}: ${error?.message || String(error)}`);
        }
      })
    );

    // Sign all transactions at once (ONE wallet popup)
    console.log('[Transfer] Requesting signature for all transactions...');
    params.onProgress?.('approving');
    let signedTransactions;
    if (relayer) {
      signedTransactions = transactions.map(tx => {
        tx.sign([relayer]);
        return tx;
      });
    } else if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === 'function') {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error('Wallet does not support batch signing');
      }
    } else {
      throw new Error('No signing method available');
    }
    console.log(`[Transfer] All ${signedTransactions.length} transactions signed!`);
    params.onProgress?.('executing');

    // Execute signed transactions sequentially
    console.log('[Transfer] Executing signed transactions sequentially...');
    let phase1Signature = '';
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;

      console.log(`[Transfer] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation and check for execution errors
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[Transfer] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[Transfer] ${name} confirmed: ${signature}`);

      if (i === 0) {
        phase1Signature = signature;
      }
    }

    params.onProgress?.('confirming');
    return {
      signature: phase1Signature,
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
   * Sign all transactions at once (batch signing)
   *
   * @param transactions - Array of transactions to sign
   * @param relayer - Optional relayer keypair. If not provided, uses wallet adapter's signAllTransactions
   * @returns Array of signed transactions
   */
  private async signAllTransactions(
    transactions: Transaction[],
    relayer?: SolanaKeypair
  ): Promise<Transaction[]> {
    const { Transaction } = await import('@solana/web3.js');

    // Case 1: Relayer keypair provided - sign directly
    if (relayer) {
      const signedTxs = transactions.map(tx => {
        const signedTx = new Transaction();
        signedTx.recentBlockhash = tx.recentBlockhash;
        signedTx.feePayer = tx.feePayer;
        signedTx.instructions = tx.instructions;
        signedTx.sign(relayer);
        return signedTx;
      });
      return signedTxs;
    }

    // Case 2: Use wallet adapter's signAllTransactions (ONE popup)
    if (this.program?.provider && 'wallet' in this.program.provider) {
      const provider = this.program.provider as any;
      const wallet = provider.wallet;

      // Check if wallet supports signAllTransactions
      if (wallet && typeof wallet.signAllTransactions === 'function') {
        console.log('[Batch Sign] Using wallet adapter signAllTransactions');
        const signedTxs = await wallet.signAllTransactions(transactions);
        return signedTxs;
      }

      // Fallback: Sign one by one if wallet doesn't support batch signing
      if (wallet && typeof wallet.signTransaction === 'function') {
        console.warn('[Batch Sign] Wallet does not support signAllTransactions, signing individually');
        const signedTxs = [];
        for (const tx of transactions) {
          const signedTx = await wallet.signTransaction(tx);
          signedTxs.push(signedTx);
        }
        return signedTxs;
      }
    }

    throw new Error('No signing method available - provide relayer keypair or ensure wallet adapter is connected');
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
      onProgress?: (stage: TransferProgressStage) => void;
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
    let preparedOutputs = await this.prepareOutputs(request.outputs, tokenMint);

    // Debug: Log prepared outputs
    console.log('[prepareAndTransfer] Prepared outputs:');
    preparedOutputs.forEach((o, i) => {
      console.log(`  Output ${i}: amount=${o.amount}, commitment=${Buffer.from(o.commitment).toString('hex').slice(0, 16)}...`);
    });

    // Detect pure unshield scenario:
    // - Has unshield (withdrawing to public wallet)
    // - NO outputs OR ALL outputs are to self (no transfer to others)
    // For pure unshield, we restructure outputs so transfer_amount = 0 (fair fee)
    const hasUnshield = request.unshield && request.unshield.amount > 0n;
    const allOutputsToSelf = preparedOutputs.length === 0 || preparedOutputs.every(output =>
      checkStealthOwnership(
        output.recipient.stealthPubkey,
        output.recipient.ephemeralPubkey,
        this.wallet!.keypair
      )
    );
    const isPureUnshield = hasUnshield && allOutputsToSelf;

    if (isPureUnshield) {
      console.log('[prepareAndTransfer] Pure unshield detected - restructuring outputs for fair fee');
      // For pure unshield, structure outputs so transfer_amount = 0:
      // out_1 = dummy (amount = 0) → transfer_amount = 0 → fee only on unshield
      // out_2 = actual change back to self

      // Create dummy output for out_1
      const dummyStealthAddress: StealthAddress = {
        stealthPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) },
        ephemeralPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) },
      };
      const dummyNote = createNote(
        new Uint8Array(32),
        tokenMint,
        0n,
        new Uint8Array(32)
      );
      const dummyCommitment = computeCommitment(dummyNote);

      const dummyOutput: TransferOutput = {
        recipient: dummyStealthAddress,
        amount: 0n,
        commitment: dummyCommitment,
        stealthPubX: new Uint8Array(32),
        randomness: new Uint8Array(32),
      };

      // Put dummy first (out_1), then actual change or another dummy (out_2)
      if (preparedOutputs.length > 0) {
        // Has change output
        preparedOutputs = [dummyOutput, preparedOutputs[0]];
        console.log('[prepareAndTransfer] Restructured: out_1=dummy(0), out_2=change');
      } else {
        // Full unshield with no change - need two dummy outputs for 1x2 circuit
        // Generate a self-stealth address for the zero-amount "dust" output
        const selfStealth = generateStealthAddress(this.wallet.keypair.publicKey);
        const dustNote = createNote(
          selfStealth.stealthAddress.stealthPubkey.x,
          tokenMint,
          0n,
          generateRandomness()
        );
        const dustCommitment = computeCommitment(dustNote);
        const dustOutput: TransferOutput = {
          recipient: selfStealth.stealthAddress,
          amount: 0n,
          commitment: dustCommitment,
          stealthPubX: selfStealth.stealthAddress.stealthPubkey.x,
          randomness: dustNote.randomness,
        };
        preparedOutputs = [dummyOutput, dustOutput];
        console.log('[prepareAndTransfer] Full unshield: out_1=dummy(0), out_2=dust(0)');
      }
    }

    // Use commitment as merkle_root with dummy path
    // The circuit doesn't verify merkle path (it's for ABI compatibility only).
    // Commitment existence is verified on-chain via Light Protocol account lookup.
    // DO NOT use Light Protocol's merkle proof leafIndex - it's for the state tree,
    // not CloakCraft's commitment counter. The scanned note has the correct leafIndex.
    const commitment = preparedInputs[0].commitment;
    const dummyPath = Array(32).fill(new Uint8Array(32));
    const dummyIndices = Array(32).fill(0);


    // Calculate protocol fee from on-chain config
    const { fetchProtocolFeeConfig, calculateProtocolFee } = await import('./fees');
    const feeConfig = await fetchProtocolFeeConfig(this.connection, this.programId);

    // Calculate total input amount
    const totalInputAmount = preparedInputs.reduce((sum, input) => sum + input.amount, 0n);

    // Fee calculation must match on-chain logic (process_unshield.rs:130-137):
    // total_taxable = transfer_amount + unshield_amount
    // expected_fee = calculate_fee(total_taxable, transfer_fee_bps)
    //
    // transfer_amount = first output amount (recipient)
    // unshield_amount = amount being withdrawn to public wallet
    // Fee rate is ALWAYS transfer_fee_bps (not unshield_fee_bps)
    const transferAmount = preparedOutputs[0]?.amount ?? 0n;
    const unshieldAmount = request.unshield?.amount ?? 0n;
    const feeableAmount = transferAmount + unshieldAmount;
    const feeCalc = calculateProtocolFee(feeableAmount, 'transfer', feeConfig);

    console.log('[prepareAndTransfer] Fee calculation:', {
      transferAmount: transferAmount.toString(),
      unshieldAmount: unshieldAmount.toString(),
      feeableAmount: feeableAmount.toString(),
      feeAmount: feeCalc.feeAmount.toString(),
      feeBps: feeCalc.feeBps,
      feesEnabled: feeConfig?.feesEnabled ?? false,
      totalInput: totalInputAmount.toString(),
    });

    // Adjust amounts to account for fee
    // Balance equation: input = out_1 + out_2 + unshield + fee
    let adjustedOutputs = preparedOutputs;
    let adjustedUnshield = request.unshield;

    if (feeCalc.feeAmount > 0n) {
      if (request.unshield && request.unshield.amount > 0n) {
        // For unshield: fee is deducted from the unshield amount (user receives less)
        // This is standard - withdrawal fees reduce what you receive
        if (request.unshield.amount < feeCalc.feeAmount) {
          throw new Error(
            `Insufficient unshield amount to pay protocol fee. Unshield: ${request.unshield.amount}, Fee: ${feeCalc.feeAmount}.`
          );
        }

        adjustedUnshield = {
          ...request.unshield,
          amount: request.unshield.amount - feeCalc.feeAmount,
        };

        console.log('[prepareAndTransfer] Adjusted unshield for fee:', {
          originalAmount: request.unshield.amount.toString(),
          adjustedAmount: adjustedUnshield.amount.toString(),
          feeDeducted: feeCalc.feeAmount.toString(),
        });
      } else if (preparedOutputs.length > 0) {
        // For transfer: fee is deducted from the change output
        // Find the change output (last output if multiple, or first if single)
        const changeOutputIndex = preparedOutputs.length > 1 ? 1 : 0;
        const changeOutput = preparedOutputs[changeOutputIndex];

        // Verify there's enough change to cover the fee
        if (changeOutput.amount < feeCalc.feeAmount) {
          throw new Error(
            `Insufficient balance to pay protocol fee. Change: ${changeOutput.amount}, Fee: ${feeCalc.feeAmount}. ` +
            `Please use a larger input amount or reduce the transfer amount.`
          );
        }

        // Create new output with fee deducted from change
        const adjustedChangeOutput = {
          ...changeOutput,
          amount: changeOutput.amount - feeCalc.feeAmount,
        };

        // Recompute commitment for adjusted change output
        const adjustedNote = {
          stealthPubX: adjustedChangeOutput.stealthPubX,
          tokenMint,
          amount: adjustedChangeOutput.amount,
          randomness: adjustedChangeOutput.randomness,
        };
        adjustedChangeOutput.commitment = computeCommitment(adjustedNote as any);

        // Replace the change output with adjusted version
        adjustedOutputs = [...preparedOutputs];
        adjustedOutputs[changeOutputIndex] = adjustedChangeOutput;

        console.log('[prepareAndTransfer] Adjusted change output for fee:', {
          originalAmount: changeOutput.amount.toString(),
          adjustedAmount: adjustedChangeOutput.amount.toString(),
          feeDeducted: feeCalc.feeAmount.toString(),
        });
      }
    }

    // Build full TransferParams
    request.onProgress?.('preparing');
    const params: TransferParams = {
      inputs: preparedInputs,
      merkleRoot: commitment,
      merklePath: dummyPath,
      merkleIndices: dummyIndices,
      outputs: adjustedOutputs,
      unshield: adjustedUnshield,
      fee: feeCalc.feeAmount,
      onProgress: request.onProgress,
    };

    return this.transfer(params, relayer);
  }

  /**
   * Prepare and consolidate notes
   *
   * Consolidates multiple notes into a single note.
   * This is used to reduce wallet fragmentation.
   *
   * @param inputs - Notes to consolidate (1-3)
   * @param tokenMint - Token mint (all inputs must use same token)
   * @param onProgress - Optional progress callback
   * @returns Transaction result with signature
   */
  async prepareAndConsolidate(
    inputs: DecryptedNote[],
    tokenMint: PublicKey,
    onProgress?: (stage: TransferProgressStage) => void
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    if (!this.program) {
      throw new Error('Program not set. Call setProgram() first.');
    }

    if (inputs.length === 0 || inputs.length > 3) {
      throw new Error('Consolidation requires 1-3 input notes');
    }

    onProgress?.('preparing');
    console.log(`[prepareAndConsolidate] Consolidating ${inputs.length} notes...`);

    // Force re-scan to get fresh notes with stealthEphemeralPubkey
    this.clearScanCache();
    const freshNotes = await this.scanNotes(tokenMint);

    // Find matching fresh notes for the input commitments
    const matchedInputs: DecryptedNote[] = [];
    for (const input of inputs) {
      const fresh = freshNotes.find(n =>
        n.commitment && input.commitment &&
        Buffer.from(n.commitment).toString('hex') === Buffer.from(input.commitment).toString('hex')
      );
      if (fresh) {
        matchedInputs.push(fresh);
      } else {
        throw new Error('Selected note not found in pool. It may have been spent or not yet synced.');
      }
    }

    // Prepare inputs with all required fields
    const preparedInputs = await this.prepareInputs(matchedInputs);

    // Generate stealth address for output (back to self)
    const { stealthAddress } = generateStealthAddress(this.wallet.keypair.publicKey);

    // Use commitment as merkle_root with dummy path
    // The circuit doesn't verify merkle path (it's for ABI compatibility only)
    const commitment = preparedInputs[0].commitment;

    // Build consolidation params
    const consolidationParams = {
      inputs: preparedInputs,
      merkleRoot: commitment,
      tokenMint,
      outputRecipient: stealthAddress,
    };

    // Generate consolidation proof
    onProgress?.('generating');
    console.log('[prepareAndConsolidate] Generating consolidation proof...');
    const proofResult = await this.proofGenerator.generateConsolidationProof(
      consolidationParams,
      this.wallet.keypair
    );

    console.log(`[prepareAndConsolidate] Proof generated. Output amount: ${proofResult.outputAmount}`);
    console.log(`[prepareAndConsolidate] Nullifiers: ${proofResult.nullifiers.length}`);

    // Build and execute multi-phase transaction
    // Similar to transfer, but using consolidation circuit
    onProgress?.('building');
    const result = await this.executeConsolidation(
      preparedInputs,
      proofResult,
      tokenMint,
      stealthAddress,
      onProgress
    );

    // Sync notes after consolidation (clear cache and rescan)
    onProgress?.('confirming');
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.clearScanCache();
    await this.scanNotes(tokenMint);

    return result;
  }

  /**
   * Execute consolidation transaction (multi-phase)
   *
   * Uses the consolidate_3x1 circuit and pre-generated proof.
   */
  private async executeConsolidation(
    inputs: PreparedInput[],
    proofResult: {
      proof: Uint8Array;
      nullifiers: Uint8Array[];
      outputCommitment: Uint8Array;
      outputRandomness: Uint8Array;
      outputAmount: bigint;
    },
    tokenMint: PublicKey,
    outputRecipient: StealthAddress,
    onProgress?: (stage: TransferProgressStage) => void
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set');
    }

    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = await this.getRelayerPubkey();

    // Validate all inputs have accountHash
    for (let i = 0; i < inputs.length; i++) {
      if (!inputs[i].accountHash) {
        throw new Error(`Input note ${i} missing accountHash`);
      }
    }

    console.log('[Consolidation] === Starting Multi-Phase Consolidation ===');
    console.log('[Consolidation] Token:', tokenMint.toBase58());
    console.log('[Consolidation] Inputs:', inputs.length);
    console.log('[Consolidation] Output amount:', proofResult.outputAmount.toString());

    // Build consolidation instruction parameters
    const consolidationParams = {
      tokenMint,
      inputs: inputs.map(input => ({
        stealthPubX: input.stealthPubX,
        amount: input.amount,
        randomness: input.randomness,
        leafIndex: input.leafIndex,
        commitment: input.commitment,
        accountHash: input.accountHash!,
      })),
      nullifiers: proofResult.nullifiers,
      outputCommitment: proofResult.outputCommitment,
      outputRandomness: proofResult.outputRandomness,
      outputAmount: proofResult.outputAmount,
      outputRecipient,
      merkleRoot: inputs[0].commitment, // Dummy - Light Protocol verifies on-chain
      relayer: relayerPubkey,
      proof: proofResult.proof,
    };

    // Build multi-phase transactions using consolidation-specific builder
    let phase0Tx, phase1Txs, phase2Txs, operationId, pendingCommitments;
    try {
      const buildResult = await buildConsolidationWithProgram(
        this.program,
        consolidationParams,
        heliusRpcUrl
      );
      phase0Tx = buildResult.phase0Tx;
      phase1Txs = buildResult.phase1Txs;
      phase2Txs = buildResult.phase2Txs;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log('[Consolidation] Phase transactions built successfully');
      console.log(`[Consolidation] Phase 0: 1, Phase 1: ${phase1Txs.length}, Phase 2: ${phase2Txs.length}`);
    } catch (error: any) {
      console.error('[Consolidation] FAILED to build phase transactions:', error);
      throw error;
    }

    // Import generic builders
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Build all transactions
    const transactionBuilders: { name: string; builder: any }[] = [];

    // Phase 0: Create pending with consolidation proof
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: phase0Tx });

    // Phase 1: Verify commitment exists (for each input)
    for (let i = 0; i < phase1Txs.length; i++) {
      transactionBuilders.push({ name: `Phase 1.${i} (Verify Commitment ${i})`, builder: phase1Txs[i] });
    }

    // Phase 2: Create nullifier (for each input)
    for (let i = 0; i < phase2Txs.length; i++) {
      transactionBuilders.push({ name: `Phase 2.${i} (Create Nullifier ${i})`, builder: phase2Txs[i] });
    }

    // Phase 3: Skipped for consolidation (no unshield, no fees)

    // Phase 4+: Create output commitment (single for consolidation)
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase 4 (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    console.log(`[Consolidation] Built ${transactionBuilders.length} transactions total`);

    // Get ALTs for address compression
    const lookupTables = await this.getAddressLookupTables();

    // Build versioned transactions
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        const mainIx = await builder.instruction();
        const preIxs = builder._preInstructions || [];
        const allInstructions = [...preIxs, mainIx];

        return new VersionedTransaction(
          new TransactionMessage({
            payerKey: relayerPubkey,
            recentBlockhash: blockhash,
            instructions: allInstructions,
          }).compileToV0Message(lookupTables)
        );
      })
    );

    // Sign all transactions
    console.log('[Consolidation] Requesting signature for all transactions...');
    onProgress?.('approving');
    let signedTransactions;
    if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === 'function') {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error('Wallet does not support batch signing');
      }
    } else {
      throw new Error('No signing method available');
    }
    console.log(`[Consolidation] All ${signedTransactions.length} transactions signed!`);
    onProgress?.('executing');

    // Execute transactions sequentially
    let finalSignature = '';
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;

      console.log(`[Consolidation] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[Consolidation] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[Consolidation] ${name} confirmed: ${signature}`);
      finalSignature = signature;
    }

    console.log('[Consolidation] === Consolidation Complete ===');

    return {
      signature: finalSignature,
      slot: 0, // Could fetch from confirmation if needed
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
    if (confirmation.value.err) {
      throw new Error(`[AdapterSwap] Transaction reverted: ${JSON.stringify(confirmation.value.err)}`);
    }

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
    if (confirmation.value.err) {
      throw new Error(`[CreateOrder] Transaction reverted: ${JSON.stringify(confirmation.value.err)}`);
    }

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
   *
   * Uses direct RPC scanning via Helius, so sync status is always current
   */
  async getSyncStatus(): Promise<SyncStatus> {
    // Get current slot from RPC
    const slot = await this.connection.getSlot();
    return {
      latestSlot: slot,
      indexedSlot: slot,
      isSynced: true,
    };
  }

  // =============================================================================
  // AMM Swap Methods
  // =============================================================================

  /**
   * Initialize a new AMM liquidity pool
   *
   * Creates a new AMM pool for a token pair. This must be done before
   * anyone can add liquidity or swap between these tokens.
   *
   * LP mint is now a PDA derived from the AMM pool, no keypair needed.
   *
   * @param tokenAMint - First token mint
   * @param tokenBMint - Second token mint
   * @param feeBps - Trading fee in basis points (e.g., 30 = 0.3%)
   * @param poolType - Pool type: 'constantProduct' (default) or 'stableSwap'
   * @param amplification - Amplification coefficient for StableSwap (100-10000, default: 200)
   * @param payer - Payer for transaction fees and rent
   * @returns Transaction signature
   */
  async initializeAmmPool(
    tokenAMint: PublicKey,
    tokenBMint: PublicKey,
    feeBps: number,
    poolType: 'constantProduct' | 'stableSwap' = 'constantProduct',
    amplification: number = 200,
    payer?: SolanaKeypair
  ): Promise<string> {
    console.log('[initializeAmmPool] ======== START ========');
    console.log('[initializeAmmPool] tokenAMint:', tokenAMint.toBase58());
    console.log('[initializeAmmPool] tokenBMint:', tokenBMint.toBase58());
    console.log('[initializeAmmPool] feeBps:', feeBps);
    console.log('[initializeAmmPool] poolType:', poolType);
    console.log('[initializeAmmPool] amplification:', amplification);

    if (!this.program) {
      console.log('[initializeAmmPool] ERROR: No program set');
      throw new Error('No program set. Call setProgram() first.');
    }

    console.log('[initializeAmmPool] Program exists:', !!this.program);
    console.log('[initializeAmmPool] Program.programId:', this.program.programId.toBase58());
    console.log('[initializeAmmPool] Provider exists:', !!this.program.provider);
    console.log('[initializeAmmPool] Provider.publicKey:', this.program.provider.publicKey?.toBase58());
    console.log('[initializeAmmPool] Connection RPC:', this.program.provider.connection.rpcEndpoint);

    // Sort tokens into canonical order (lower pubkey first)
    const [canonicalA, canonicalB] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0
      ? [tokenAMint, tokenBMint]
      : [tokenBMint, tokenAMint];

    console.log('[initializeAmmPool] Canonical order:');
    console.log('[initializeAmmPool]   canonicalA:', canonicalA.toBase58());
    console.log('[initializeAmmPool]   canonicalB:', canonicalB.toBase58());

    // Convert pool type to Anchor enum
    const poolTypeEnum = poolType === 'stableSwap' ? { stableSwap: {} } : { constantProduct: {} };
    const amp = poolType === 'stableSwap' ? amplification : 0;

    // Derive LP mint PDA (needed for return value and LP pool init)
    const [lpMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), canonicalA.toBuffer(), canonicalB.toBuffer()],
      this.programId
    );

    console.log('[initializeAmmPool] Derived lpMintPda:', lpMintPda.toBase58());
    console.log('[initializeAmmPool] Building MethodsBuilder...');

    const methodsBuilder = this.program.methods
      .initializeAmmPool(
        canonicalA,
        canonicalB,
        feeBps,
        poolTypeEnum,
        new BN(amp)
      )
      .accountsPartial({
        tokenAMintAccount: canonicalA,
        tokenBMintAccount: canonicalB,
      });

    console.log('[initializeAmmPool] MethodsBuilder created');
    console.log('[initializeAmmPool] CALLING .rpc() - This will trigger wallet.signTransaction()');
    console.log('[initializeAmmPool] ======== BEFORE .rpc() ========');

    let signature: string;
    try {
      // Skip preflight simulation - transaction is valid but Phantom/RPC simulation may fail
      // due to rate limiting or network detection issues
      signature = await methodsBuilder.rpc({ skipPreflight: true });
      console.log('[initializeAmmPool] ======== AFTER .rpc() SUCCESS ========');
      console.log('[initializeAmmPool] Signature:', signature);
    } catch (rpcError: any) {
      console.log('[initializeAmmPool] ======== AFTER .rpc() ERROR ========');
      console.log('[initializeAmmPool] Error name:', rpcError?.name);
      console.log('[initializeAmmPool] Error message:', rpcError?.message);
      console.log('[initializeAmmPool] Error logs:', rpcError?.logs);
      console.log('[initializeAmmPool] Full error:', JSON.stringify(rpcError, Object.getOwnPropertyNames(rpcError || {}), 2));
      throw rpcError;
    }

    console.log(`[AMM] Pool initialized: ${signature}`);

    // Initialize LP pool for storing LP token commitments
    const payerPubkey = payer?.publicKey ?? this.program.provider.publicKey;
    if (payerPubkey) {
      try {
        await initPool(this.program, lpMintPda, payerPubkey, payerPubkey);
        console.log(`[AMM] LP pool initialized`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes('already in use') && !errMsg.includes('already_exists')) {
          console.warn(`[AMM] LP pool init failed: ${errMsg}`);
        }
      }
    }

    return signature;
  }

  /**
   * Initialize LP pool for an existing AMM pool
   *
   * Call this if you have an AMM pool whose LP token pool wasn't created.
   * This is required for LP tokens to be scannable after adding liquidity.
   *
   * @param ammPoolAddress - Address of the AMM pool
   * @returns Transaction signature
   */
  async initializeLpPool(
    ammPoolAddress: PublicKey
  ): Promise<{ poolTx: string; counterTx: string }> {
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Fetch AMM pool to get LP mint
    const ammPoolAccount = await (this.program.account as any).ammPool.fetch(ammPoolAddress);
    const lpMint = ammPoolAccount.lpMint as PublicKey;

    // Get payer from provider
    const payer = this.program.provider.publicKey;
    if (!payer) {
      throw new Error('No wallet connected');
    }

    console.log(`[AMM] Initializing LP pool for mint: ${lpMint.toBase58()}`);
    return initPool(this.program, lpMint, payer, payer);
  }

  /**
   * Initialize LP pools for all existing AMM pools
   *
   * Useful for ensuring all LP tokens are scannable.
   */
  async initializeAllLpPools(): Promise<void> {
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    const pools = await this.getAllAmmPools();
    console.log(`[AMM] Initializing LP pools for ${pools.length} AMM pools...`);

    for (const pool of pools) {
      try {
        const result = await this.initializeLpPool(pool.address);
        console.log(`[AMM] LP pool for ${pool.lpMint.toBase58()}: pool=${result.poolTx}, counter=${result.counterTx}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (!errMsg.includes('already in use') && !errMsg.includes('already_exists')) {
          console.error(`[AMM] Failed to init LP pool for ${pool.lpMint.toBase58()}: ${errMsg}`);
        }
      }
    }
  }

  /**
   * Execute an AMM swap
   *
   * Swaps tokens through the private AMM pool.
   *
   * @param params - Swap parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async swap(
    params: AmmSwapParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the swap circuit is loaded
    if (!this.proofGenerator.hasCircuit('swap/swap')) {
      throw new Error("Prover not initialized. Call initializeProver(['swap/swap']) first.");
    }

    params.onProgress?.('generating');

    // Generate proof (returns both proof and computed commitments/nullifier)
    const proofResult = await this.proofGenerator.generateSwapProof(
      params,
      this.wallet.keypair
    );

    params.onProgress?.('building');

    // Derive pool PDAs
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array
      ? new PublicKey(params.input.tokenMint)
      : params.input.tokenMint;

    // Determine output token based on swap direction
    // This requires fetching the AMM pool state to get the token mints
    const ammPoolAccount = await (this.program.account as any).ammPool.fetch(params.poolId);
    const outputTokenMint = params.swapDirection === 'aToB'
      ? ammPoolAccount.tokenBMint
      : ammPoolAccount.tokenAMint;

    const [inputPoolPda] = derivePoolPda(inputTokenMint, this.programId);
    const [outputPoolPda] = derivePoolPda(outputTokenMint, this.programId);

    // Fetch input pool to get vault address
    const inputPoolAccount = await (this.program.account as any).pool.fetch(inputPoolPda);
    const inputVault = inputPoolAccount.tokenVault;

    // Get protocol config (required) and treasury ATA for fee collection
    const [protocolConfigPda] = deriveProtocolConfigPda(this.programId);
    let treasuryAta: PublicKey | undefined;

    try {
      const configAccount = await (this.program.account as any).protocolConfig.fetch(protocolConfigPda);
      if (configAccount && configAccount.feesEnabled) {
        // Get treasury's ATA for input token (needed for fee transfer)
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        treasuryAta = await getAssociatedTokenAddress(inputTokenMint, configAccount.treasury);
      }
    } catch {
      // Protocol config doesn't exist - will fail on-chain if not initialized
      console.warn('[Swap] Protocol config not found - swap will fail if not initialized');
    }

    // Require accountHash for commitment existence proof
    const accountHash = params.input.accountHash;
    if (!accountHash) {
      throw new Error('Input note missing accountHash. Use scanNotes() to get notes with accountHash.');
    }

    // Use SAME commitments, nullifier, AND randomness that the proof used
    const { proof, nullifier, outCommitment, changeCommitment, outRandomness, changeRandomness } = proofResult;

    // Build instruction parameters
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? (await this.getRelayerPubkey());

    // Compute input commitment for verification
    const inputCommitment = computeCommitment(params.input);

    const instructionParams = {
      inputPool: inputPoolPda,
      outputPool: outputPoolPda,
      inputTokenMint,
      outputTokenMint,
      ammPool: params.poolId,
      inputVault,
      protocolConfig: protocolConfigPda, // Required
      treasuryAta, // Optional - only if fees enabled
      relayer: relayerPubkey,
      proof,
      merkleRoot: params.merkleRoot,
      nullifier,
      inputCommitment,
      accountHash,
      leafIndex: params.input.leafIndex,
      outputCommitment: outCommitment,
      changeCommitment,
      minOutput: params.minOutput,
      outputRecipient: params.outputRecipient,
      changeRecipient: params.changeRecipient,
      inputAmount: params.input.amount,
      swapAmount: params.swapAmount,
      outputAmount: params.outputAmount,
      swapDirection: params.swapDirection,
      outRandomness,
      changeRandomness,
    };

    // Multi-phase execution with ALT compression (same pattern as transfer)
    console.log('[Swap] === Starting Multi-Phase Swap ===');
    console.log('[Swap] Input token:', inputTokenMint.toBase58());
    console.log('[Swap] Output token:', outputTokenMint.toBase58());
    console.log('[Swap] Swap amount:', params.swapAmount.toString());
    console.log('[Swap] Min output:', params.minOutput.toString());

    // Build all phase transactions
    console.log('[Swap] Building phase transactions...');
    let phase0Tx, phase1Tx, phase2Tx, phase3Tx, operationId, pendingCommitments;
    try {
      const buildResult = await buildSwapWithProgram(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      phase0Tx = buildResult.tx;
      phase1Tx = buildResult.phase1Tx;
      phase2Tx = buildResult.phase2Tx;
      phase3Tx = buildResult.phase3Tx;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log('[Swap] Phase transactions built successfully');
    } catch (error: any) {
      console.error('[Swap] FAILED to build phase transactions:', error);
      throw error;
    }

    // Import generic builders
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Build all transactions upfront for batch signing
    console.log('[Swap] Building all transactions for batch signing...');
    const transactionBuilders = [];

    // Phase 0: Create pending with proof (swap-specific)
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: phase0Tx });

    // Phase 1: Verify commitment exists
    transactionBuilders.push({ name: 'Phase 1 (Verify Commitment)', builder: phase1Tx });

    // Phase 2: Create nullifier (point of no return)
    transactionBuilders.push({ name: 'Phase 2 (Create Nullifier)', builder: phase2Tx });

    // Phase 3: Execute swap (AMM state update)
    transactionBuilders.push({ name: 'Phase 3 (Execute Swap)', builder: phase3Tx });

    // Phase 4+: Create commitments (output + change)
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      // Skip dummy commitments
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4+i} (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    console.log(`[Swap] Built ${transactionBuilders.length} transactions`);

    // Get ALTs for address compression
    const lookupTables = await this.getAddressLookupTables();
    if (lookupTables.length === 0) {
      console.warn('[Swap] No Address Lookup Tables configured! May exceed size limit.');
      console.warn('[Swap] Run: pnpm tsx scripts/create-alt.ts to create an ALT');
    } else {
      console.log(`[Swap] Using ${lookupTables.length} Address Lookup Tables for compression`);
      lookupTables.forEach((alt, i) => {
        console.log(`[Swap] ALT ${i}: ${alt.state.addresses.length} addresses`);
      });
    }

    // Build transactions with ALT compression
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          // Extract ALL instructions (preInstructions + main instruction)
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];

          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);

          return new VersionedTransaction(
            new TransactionMessage({
              payerKey: relayerPubkey,
              recentBlockhash: blockhash,
              instructions: allInstructions,
            }).compileToV0Message(lookupTables)
          );
        } catch (error: any) {
          console.error(`[Swap] Failed to build transaction: ${name}`, error);
          throw new Error(`Failed to build ${name}: ${error?.message || String(error)}`);
        }
      })
    );

    // Sign all transactions at once (ONE wallet popup)
    console.log('[Swap] Requesting signature for all transactions...');
    params.onProgress?.('approving');
    let signedTransactions;
    if (relayer) {
      signedTransactions = transactions.map(tx => {
        tx.sign([relayer]);
        return tx;
      });
    } else if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === 'function') {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error('Wallet does not support batch signing');
      }
    } else {
      throw new Error('No signing method available');
    }
    console.log(`[Swap] All ${signedTransactions.length} transactions signed!`);

    // Execute signed transactions sequentially
    console.log('[Swap] Executing signed transactions sequentially...');
    params.onProgress?.('executing');
    let phase0Signature = '';
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;

      console.log(`[Swap] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation and check for execution errors
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[Swap] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[Swap] ${name} confirmed: ${signature}`);

      if (i === 0) {
        phase0Signature = signature;
      }
    }

    return {
      signature: phase0Signature,
      slot: 0,
    };
  }

  /**
   * Add liquidity to an AMM pool
   *
   * @param params - Add liquidity parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async addLiquidity(
    params: AddLiquidityParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the circuit is loaded
    if (!this.proofGenerator.hasCircuit('swap/add_liquidity')) {
      throw new Error("Prover not initialized. Call initializeProver(['swap/add_liquidity']) first.");
    }

    params.onProgress?.('generating');

    // CRITICAL: lpAmount was already calculated and passed in params
    // We must use the SAME value in the proof that will be used in encryption
    // (This is the same pattern as swap where we pass outputAmount)
    const lpAmount = params.lpAmount;

    // Generate proof (returns both proof and computed commitments/nullifiers)
    const proofResult = await this.proofGenerator.generateAddLiquidityProof(
      params,
      this.wallet.keypair
    );

    params.onProgress?.('building');

    // Derive pool PDAs
    const tokenAMint = params.inputA.tokenMint instanceof Uint8Array
      ? new PublicKey(params.inputA.tokenMint)
      : params.inputA.tokenMint;
    const tokenBMint = params.inputB.tokenMint instanceof Uint8Array
      ? new PublicKey(params.inputB.tokenMint)
      : params.inputB.tokenMint;

    const [poolA] = derivePoolPda(tokenAMint, this.programId);
    const [poolB] = derivePoolPda(tokenBMint, this.programId);
    const [lpPool] = derivePoolPda(params.lpMint, this.programId);

    // Use SAME commitments, nullifiers, AND randomness that the proof used
    const { proof, nullifierA, nullifierB, lpCommitment, changeACommitment, changeBCommitment,
            lpRandomness, changeARandomness, changeBRandomness } = proofResult;

    // Compute input commitments for verification
    const inputCommitmentA = computeCommitment(params.inputA);
    const inputCommitmentB = computeCommitment(params.inputB);

    // Validate required fields
    if (!params.inputA.accountHash || !params.inputB.accountHash) {
      throw new Error('Input notes must have accountHash for commitment verification');
    }

    // Build instruction parameters
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? (await this.getRelayerPubkey());

    const instructionParams = {
      poolA,
      poolB,
      tokenAMint: params.inputA.tokenMint,
      tokenBMint: params.inputB.tokenMint,
      lpPool,
      lpMint: params.lpMint,
      ammPool: params.poolId,
      relayer: relayerPubkey,
      proof,
      nullifierA,
      nullifierB,
      inputCommitmentA,
      inputCommitmentB,
      accountHashA: params.inputA.accountHash,
      accountHashB: params.inputB.accountHash,
      leafIndexA: params.inputA.leafIndex,
      leafIndexB: params.inputB.leafIndex,
      lpCommitment,
      changeACommitment,
      changeBCommitment,
      lpRandomness,
      changeARandomness,
      changeBRandomness,
      lpRecipient: params.lpRecipient,
      changeARecipient: params.changeARecipient,
      changeBRecipient: params.changeBRecipient,
      inputAAmount: params.inputA.amount,
      inputBAmount: params.inputB.amount,
      depositA: params.depositA,
      depositB: params.depositB,
      lpAmount,
      minLpAmount: params.minLpAmount,
    };

    // Multi-phase execution with ALT compression (same pattern as transfer)
    console.log('[Add Liquidity] === Starting Multi-Phase Add Liquidity ===');
    console.log('[Add Liquidity] Token A:', tokenAMint.toBase58());
    console.log('[Add Liquidity] Token B:', tokenBMint.toBase58());
    console.log('[Add Liquidity] Deposit A:', params.depositA.toString());
    console.log('[Add Liquidity] Deposit B:', params.depositB.toString());
    console.log('[Add Liquidity] LP amount:', lpAmount.toString());

    // Build all phase transactions
    console.log('[Add Liquidity] Building phase transactions...');
    let phase0Tx, phase1aTx, phase1bTx, phase2aTx, phase2bTx, phase3Tx, operationId, pendingCommitments;
    try {
      const buildResult = await buildAddLiquidityWithProgram(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      phase0Tx = buildResult.tx;
      phase1aTx = buildResult.phase1aTx;
      phase1bTx = buildResult.phase1bTx;
      phase2aTx = buildResult.phase2aTx;
      phase2bTx = buildResult.phase2bTx;
      phase3Tx = buildResult.phase3Tx;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log('[Add Liquidity] Phase transactions built successfully');
    } catch (error: any) {
      console.error('[Add Liquidity] FAILED to build phase transactions:', error);
      throw error;
    }

    // Import generic builders
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Build all transactions upfront for batch signing
    console.log('[Add Liquidity] Building all transactions for batch signing...');
    const transactionBuilders = [];

    // Phase 0: Create pending with proof (add liquidity-specific)
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: phase0Tx });

    // Phase 1a: Verify deposit A commitment exists
    transactionBuilders.push({ name: 'Phase 1a (Verify Commit A)', builder: phase1aTx });

    // Phase 1b: Verify deposit B commitment exists
    transactionBuilders.push({ name: 'Phase 1b (Verify Commit B)', builder: phase1bTx });

    // Phase 2a: Create nullifier A (point of no return for input A)
    transactionBuilders.push({ name: 'Phase 2a (Create Null A)', builder: phase2aTx });

    // Phase 2b: Create nullifier B (point of no return for input B)
    transactionBuilders.push({ name: 'Phase 2b (Create Null B)', builder: phase2bTx });

    // Phase 3: Execute add liquidity (AMM state update)
    transactionBuilders.push({ name: 'Phase 3 (Execute Add Liq)', builder: phase3Tx });

    // Phase 4+: Create commitments (LP, change A, change B)
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      // Skip dummy commitments
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${6+i} (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    console.log(`[Add Liquidity] Built ${transactionBuilders.length} transactions`);

    // Get ALTs for address compression
    const lookupTables = await this.getAddressLookupTables();
    if (lookupTables.length === 0) {
      console.warn('[Add Liquidity] No Address Lookup Tables configured! May exceed size limit.');
      console.warn('[Add Liquidity] Run: pnpm tsx scripts/create-alt.ts to create an ALT');
    } else {
      console.log(`[Add Liquidity] Using ${lookupTables.length} Address Lookup Tables for compression`);
      lookupTables.forEach((alt, i) => {
        console.log(`[Add Liquidity] ALT ${i}: ${alt.state.addresses.length} addresses`);
      });
    }

    // Build transactions with ALT compression
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          // Extract ALL instructions (preInstructions + main instruction)
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];

          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);

          return new VersionedTransaction(
            new TransactionMessage({
              payerKey: relayerPubkey,
              recentBlockhash: blockhash,
              instructions: allInstructions,
            }).compileToV0Message(lookupTables)
          );
        } catch (error: any) {
          console.error(`[Add Liquidity] Failed to build transaction: ${name}`, error);
          throw new Error(`Failed to build ${name}: ${error?.message || String(error)}`);
        }
      })
    );

    // Sign all transactions at once (ONE wallet popup)
    console.log('[Add Liquidity] Requesting signature for all transactions...');
    params.onProgress?.('approving');
    let signedTransactions;
    if (relayer) {
      signedTransactions = transactions.map(tx => {
        tx.sign([relayer]);
        return tx;
      });
    } else if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === 'function') {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error('Wallet does not support batch signing');
      }
    } else {
      throw new Error('No signing method available');
    }
    console.log(`[Add Liquidity] All ${signedTransactions.length} transactions signed!`);

    // Execute signed transactions sequentially
    console.log('[Add Liquidity] Executing signed transactions sequentially...');
    params.onProgress?.('executing');
    let phase0Signature = '';
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;

      console.log(`[Add Liquidity] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation and check for execution errors
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[Add Liquidity] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[Add Liquidity] ${name} confirmed: ${signature}`);

      if (i === 0) {
        phase0Signature = signature;
      }
    }

    console.log('[Add Liquidity] All transactions executed successfully!');
    return {
      signature: phase0Signature,
      slot: 0,
    };
  }

  /**
   * Remove liquidity from an AMM pool
   *
   * @param params - Remove liquidity parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async removeLiquidity(
    params: RemoveLiquidityParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the circuit is loaded
    if (!this.proofGenerator.hasCircuit('swap/remove_liquidity')) {
      throw new Error("Prover not initialized. Call initializeProver(['swap/remove_liquidity']) first.");
    }

    params.onProgress?.('generating');

    // Use token mints from params (no need to fetch account)
    const tokenAMint = params.tokenAMint;
    const tokenBMint = params.tokenBMint;
    const lpMint = params.lpInput.tokenMint instanceof Uint8Array
      ? new PublicKey(params.lpInput.tokenMint)
      : params.lpInput.tokenMint;

    const [poolA] = derivePoolPda(tokenAMint, this.programId);
    const [poolB] = derivePoolPda(tokenBMint, this.programId);
    const [lpPool] = derivePoolPda(lpMint, this.programId);

    console.log('[Remove Liquidity] Pool PDAs:');
    console.log(`  Token A Pool: ${poolA.toBase58()}`);
    console.log(`  Token B Pool: ${poolB.toBase58()}`);
    console.log(`  LP Token Pool: ${lpPool.toBase58()}`);

    // Fetch pool accounts to get vault addresses
    const poolAAccount = await (this.program.account as any).pool.fetch(poolA);
    const poolBAccount = await (this.program.account as any).pool.fetch(poolB);
    const vaultA = poolAAccount.tokenVault;
    const vaultB = poolBAccount.tokenVault;

    // Get protocol config (required) and treasury ATAs for fee collection
    const [protocolConfigPda] = deriveProtocolConfigPda(this.programId);
    let treasuryAtaA: PublicKey | undefined;
    let treasuryAtaB: PublicKey | undefined;

    try {
      // Get protocol config to check if fees are enabled
      const configAccount = await this.connection.getAccountInfo(protocolConfigPda);
      if (configAccount) {
        const data = configAccount.data;
        const treasury = new PublicKey(data.subarray(40, 72));
        const feesEnabled = data[80] === 1;

        if (feesEnabled) {
          // Derive treasury ATAs for both tokens
          const { getAssociatedTokenAddress } = await import('@solana/spl-token');
          treasuryAtaA = await getAssociatedTokenAddress(tokenAMint, treasury, true);
          treasuryAtaB = await getAssociatedTokenAddress(tokenBMint, treasury, true);
          console.log('[Remove Liquidity] Fees enabled, treasury ATAs:', treasuryAtaA.toBase58(), treasuryAtaB.toBase58());
        }
      }
    } catch (e) {
      console.warn('[Remove Liquidity] Could not fetch protocol config:', e);
    }

    // Generate proof (returns proof + computed nullifier and commitments)
    const { proof, lpNullifier, outputACommitment, outputBCommitment, outputARandomness, outputBRandomness } = await this.proofGenerator.generateRemoveLiquidityProof(
      params,
      this.wallet.keypair
    );

    params.onProgress?.('building');

    // Compute LP input commitment for verification
    const lpInputCommitment = computeCommitment(params.lpInput);

    // Validate required fields
    if (!params.lpInput.accountHash) {
      throw new Error('LP input note must have accountHash for commitment verification');
    }

    // Build instruction parameters
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? (await this.getRelayerPubkey());

    const instructionParams = {
      lpPool,
      poolA,
      poolB,
      tokenAMint: params.tokenAMint,  // Use raw format like addLiquidity
      tokenBMint: params.tokenBMint,  // Use raw format like addLiquidity
      ammPool: params.poolId,
      vaultA,
      vaultB,
      protocolConfig: protocolConfigPda,
      treasuryAtaA,
      treasuryAtaB,
      relayer: relayerPubkey,
      proof,
      lpNullifier,
      lpInputCommitment,
      accountHash: params.lpInput.accountHash,
      leafIndex: params.lpInput.leafIndex,
      outputACommitment,
      outputBCommitment,
      oldPoolStateHash: params.oldPoolStateHash,
      newPoolStateHash: params.newPoolStateHash,
      outputARecipient: params.outputARecipient,
      outputBRecipient: params.outputBRecipient,
      lpAmount: params.lpAmount,
      outputAAmount: params.outputAAmount,
      outputBAmount: params.outputBAmount,
      outputARandomness,
      outputBRandomness,
    };

    // Multi-phase execution with ALT compression (same pattern as transfer)
    console.log('[Remove Liquidity] === Starting Multi-Phase Remove Liquidity ===');
    console.log('[Remove Liquidity] LP mint:', lpMint.toBase58());
    console.log('[Remove Liquidity] LP amount:', params.lpAmount.toString());
    console.log('[Remove Liquidity] Output A:', params.outputAAmount.toString());
    console.log('[Remove Liquidity] Output B:', params.outputBAmount.toString());

    // Build all phase transactions
    console.log('[Remove Liquidity] Building phase transactions...');
    let phase0Tx, phase1Tx, phase2Tx, phase3Tx, operationId, pendingCommitments;
    try {
      const buildResult = await buildRemoveLiquidityWithProgram(
        this.program,
        instructionParams,
        heliusRpcUrl
      );
      phase0Tx = buildResult.tx;
      phase1Tx = buildResult.phase1Tx;
      phase2Tx = buildResult.phase2Tx;
      phase3Tx = buildResult.phase3Tx;
      operationId = buildResult.operationId;
      pendingCommitments = buildResult.pendingCommitments;
      console.log('[Remove Liquidity] Phase transactions built successfully');
    } catch (error: any) {
      console.error('[Remove Liquidity] FAILED to build phase transactions:', error);
      throw error;
    }

    // Import generic builders
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Build all transactions upfront for batch signing
    console.log('[Remove Liquidity] Building all transactions for batch signing...');
    const transactionBuilders = [];

    // Phase 0: Create pending with proof (remove liquidity-specific)
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: phase0Tx });

    // Phase 1: Verify LP commitment exists
    transactionBuilders.push({ name: 'Phase 1 (Verify LP Commit)', builder: phase1Tx });

    // Phase 2: Create LP nullifier (point of no return)
    transactionBuilders.push({ name: 'Phase 2 (Create LP Null)', builder: phase2Tx });

    // Phase 3: Execute remove liquidity (AMM state update)
    transactionBuilders.push({ name: 'Phase 3 (Execute Remove Liq)', builder: phase3Tx });

    // Phase 4+: Create commitments (output A, output B)
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      // Skip dummy commitments
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4+i} (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    console.log(`[Remove Liquidity] Built ${transactionBuilders.length} transactions`);

    // Get ALTs for address compression
    const lookupTables = await this.getAddressLookupTables();
    if (lookupTables.length === 0) {
      console.warn('[Remove Liquidity] No Address Lookup Tables configured! May exceed size limit.');
      console.warn('[Remove Liquidity] Run: pnpm tsx scripts/create-alt.ts to create an ALT');
    } else {
      console.log(`[Remove Liquidity] Using ${lookupTables.length} Address Lookup Tables for compression`);
      lookupTables.forEach((alt, i) => {
        console.log(`[Remove Liquidity] ALT ${i}: ${alt.state.addresses.length} addresses`);
      });
    }

    // Build transactions with ALT compression
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');

    const transactions = await Promise.all(
      transactionBuilders.map(async ({ name, builder }) => {
        try {
          // Extract ALL instructions (preInstructions + main instruction)
          const mainIx = await builder.instruction();
          const preIxs = builder._preInstructions || [];
          const allInstructions = [...preIxs, mainIx];

          console.log(`[${name}] Including ${preIxs.length} pre-instructions + 1 main instruction`);

          return new VersionedTransaction(
            new TransactionMessage({
              payerKey: relayerPubkey,
              recentBlockhash: blockhash,
              instructions: allInstructions,
            }).compileToV0Message(lookupTables)
          );
        } catch (error: any) {
          console.error(`[Remove Liquidity] Failed to build transaction: ${name}`, error);
          throw new Error(`Failed to build ${name}: ${error?.message || String(error)}`);
        }
      })
    );

    // Sign all transactions at once (ONE wallet popup)
    console.log('[Remove Liquidity] Requesting signature for all transactions...');
    params.onProgress?.('approving');
    let signedTransactions;
    if (relayer) {
      signedTransactions = transactions.map(tx => {
        tx.sign([relayer]);
        return tx;
      });
    } else if (this.program?.provider?.wallet) {
      const wallet = this.program.provider.wallet;
      if (typeof wallet.signAllTransactions === 'function') {
        signedTransactions = await wallet.signAllTransactions(transactions);
      } else {
        throw new Error('Wallet does not support batch signing');
      }
    } else {
      throw new Error('No signing method available');
    }
    console.log(`[Remove Liquidity] All ${signedTransactions.length} transactions signed!`);

    // Execute signed transactions sequentially
    console.log('[Remove Liquidity] Executing signed transactions sequentially...');
    params.onProgress?.('executing');
    let phase0Signature = '';
    for (let i = 0; i < signedTransactions.length; i++) {
      const tx = signedTransactions[i];
      const name = transactionBuilders[i].name;

      console.log(`[Remove Liquidity] Sending ${name}...`);
      const signature = await this.connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // Wait for confirmation and check for execution errors
      const confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[Remove Liquidity] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[Remove Liquidity] ${name} confirmed: ${signature}`);

      if (i === 0) {
        phase0Signature = signature;
      }
    }

    console.log('[Remove Liquidity] All transactions executed successfully!');
    return {
      signature: phase0Signature,
      slot: 0,
    };
  }

  // =============================================================================
  // Market Order Methods
  // =============================================================================

  /**
   * Fill a market order
   *
   * Atomically fills a maker's order by spending taker's input note
   * and exchanging tokens.
   *
   * @param params - Fill order parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async fillOrder(
    params: FillOrderParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the circuit is loaded
    if (!this.proofGenerator.hasCircuit('market/order_fill')) {
      throw new Error("Prover not initialized. Call initializeProver(['market/order_fill']) first.");
    }

    // Generate proof
    const proof = await this.proofGenerator.generateFillOrderProof(
      params,
      this.wallet.keypair
    );

    // Fetch order state
    const [orderPda] = deriveOrderPda(params.orderId, this.programId);
    const orderAccount = await (this.program.account as any).order.fetch(orderPda);

    // Derive pool PDAs from order
    // Order stores terms hash, so we need to derive from stored data
    const makerPool = new PublicKey(orderAccount.makerPool || params.order.escrowCommitment);
    const takerInputMint = params.takerInput.tokenMint instanceof Uint8Array
      ? new PublicKey(params.takerInput.tokenMint)
      : params.takerInput.tokenMint;
    const [takerPool] = derivePoolPda(takerInputMint, this.programId);

    // Compute nullifiers
    const escrowNullifier = new Uint8Array(32); // From order escrow
    const takerNullifier = this.computeInputNullifier(params.takerInput);

    // Compute output commitments
    const makerOutCommitment = computeCommitment({
      stealthPubX: params.takerReceiveRecipient.stealthPubkey.x,
      tokenMint: takerInputMint, // Maker receives taker's payment
      amount: 0n, // Based on order terms
      randomness: generateRandomness(),
    });

    const takerOutCommitment = computeCommitment({
      stealthPubX: params.takerReceiveRecipient.stealthPubkey.x,
      tokenMint: makerPool, // Taker receives maker's escrowed tokens
      amount: 0n, // Based on order terms
      randomness: generateRandomness(),
    });

    // Build transaction
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const { tx, result } = await buildFillOrderWithProgram(
      this.program,
      {
        makerPool,
        takerPool,
        orderId: params.orderId,
        takerInput: {
          stealthPubX: params.takerInput.stealthPubX,
          amount: params.takerInput.amount,
          randomness: params.takerInput.randomness,
          leafIndex: params.takerInput.leafIndex,
          accountHash: params.takerInput.accountHash!,
        },
        makerOutputRecipient: params.takerReceiveRecipient, // Maker gets paid
        takerOutputRecipient: params.takerReceiveRecipient, // Taker gets offer
        takerChangeRecipient: params.takerChangeRecipient,
        relayer: relayer?.publicKey ?? (await this.getRelayerPubkey()),
        makerProof: proof, // Same proof for simplified case
        takerProof: proof,
        escrowNullifier,
        takerNullifier,
        makerOutCommitment,
        takerOutCommitment,
        orderTerms: {
          offerAmount: 0n,
          requestAmount: 0n,
        },
      },
      heliusRpcUrl
    );

    // Execute transaction
    const signature = await tx.rpc();

    // Verify transaction didn't revert
    await verifyTransactionSuccess(this.connection, signature, 'FillOrder');

    return {
      signature,
      slot: 0,
    };
  }

  /**
   * Cancel a market order
   *
   * Cancels an open order and refunds the escrowed tokens to the maker.
   *
   * @param params - Cancel order parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async cancelOrder(
    params: CancelOrderParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the circuit is loaded
    if (!this.proofGenerator.hasCircuit('market/order_cancel')) {
      throw new Error("Prover not initialized. Call initializeProver(['market/order_cancel']) first.");
    }

    // Generate proof
    const proof = await this.proofGenerator.generateCancelOrderProof(
      params,
      this.wallet.keypair
    );

    // Fetch order state to get pool
    const [orderPda] = deriveOrderPda(params.orderId, this.programId);
    const orderAccount = await (this.program.account as any).order.fetch(orderPda);

    // Pool is determined by the escrowed token
    const pool = new PublicKey(orderAccount.pool || orderAccount.makerPool);

    // Compute escrow nullifier (from order's escrow commitment)
    const escrowNullifier = new Uint8Array(32); // Derived from order

    // Compute refund commitment
    const refundCommitment = computeCommitment({
      stealthPubX: params.refundRecipient.stealthPubkey.x,
      tokenMint: pool,
      amount: 0n, // Full escrow amount
      randomness: generateRandomness(),
    });

    // Build transaction
    const heliusRpcUrl = this.getHeliusRpcUrl();
    const { tx, result } = await buildCancelOrderWithProgram(
      this.program,
      {
        pool,
        orderId: params.orderId,
        refundRecipient: params.refundRecipient,
        relayer: relayer?.publicKey ?? (await this.getRelayerPubkey()),
        proof,
        escrowNullifier,
        refundCommitment,
        escrowedAmount: 0n, // From order
      },
      heliusRpcUrl
    );

    // Execute transaction
    const signature = await tx.rpc();

    // Verify transaction didn't revert
    await verifyTransactionSuccess(this.connection, signature, 'CancelOrder');

    return {
      signature,
      slot: 0,
    };
  }

  /**
   * Helper to compute input nullifier
   */
  private computeInputNullifier(input: PreparedInput): Uint8Array {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }

    let stealthSpendingKey: bigint;
    if (input.stealthEphemeralPubkey) {
      const baseSpendingKey = bytesToField(this.wallet.keypair.spending.sk);
      stealthSpendingKey = deriveStealthPrivateKey(baseSpendingKey, input.stealthEphemeralPubkey);
    } else {
      stealthSpendingKey = bytesToField(this.wallet.keypair.spending.sk);
    }
    const stealthNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
    const inputCommitment = computeCommitment(input);
    return deriveSpendingNullifier(stealthNullifierKey, inputCommitment, input.leafIndex);
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

  /**
   * Clear the note scanning cache
   *
   * Call this after transactions to ensure fresh data on next scan.
   * The cache improves performance by skipping already-processed accounts,
   * but should be cleared after state changes.
   */
  clearScanCache(): void {
    this.lightClient?.clearCache();
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
      // Check if this is a dummy output (stealthPubX is all zeros)
      const isDummy = output.recipient.stealthPubkey.x.every(b => b === 0);

      // For dummy outputs, use zero randomness so commitment matches SDK's padding
      // Commitment = Poseidon(domain, zeros, tokenMint, 0, zeros)
      const randomness = isDummy ? new Uint8Array(32) : generateRandomness();

      // Create note to compute commitment with actual tokenMint
      const note = createNote(
        output.recipient.stealthPubkey.x,
        tokenMint,
        output.amount,
        randomness
      );

      const commitment = computeCommitment(note);

      if (isDummy) {
        console.log('[prepareOutputs] Dummy output detected - using zero randomness');
        console.log('[prepareOutputs] Dummy commitment:', Buffer.from(commitment).toString('hex').slice(0, 32) + '...');
      }

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

  // =============================================================================
  // Perpetual Futures Operations
  // =============================================================================

  /**
   * Open a perpetual futures position
   *
   * @param params - Open position parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async openPerpsPosition(
    params: OpenPerpsPositionParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the perps circuit is loaded
    if (!this.proofGenerator.hasCircuit('perps/open_position')) {
      throw new Error("Prover not initialized. Call initializeProver(['perps/open_position']) first.");
    }

    params.onProgress?.('preparing');

    // Calculate position size
    const positionSize = params.marginAmount * BigInt(params.leverage);

    // Require accountHash for commitment existence proof
    const accountHash = params.input.accountHash;
    if (!accountHash) {
      throw new Error('Input note missing accountHash. Use scanNotes() to get notes with accountHash.');
    }

    // Get price from Pyth if not provided
    const feedId = params.pythFeedId || PYTH_FEED_IDS.BTC_USD;
    let oraclePrice = params.oraclePrice;
    const pythPriceUpdate = params.priceUpdate;

    if (!oraclePrice) {
      // Fetch current price from Pyth Hermes API
      const pythService = new PythPriceService(this.connection);
      oraclePrice = await pythService.getPriceUsd(feedId, 9); // 9 decimals for price
    }

    if (!pythPriceUpdate) {
      throw new Error('priceUpdate account is required. Use @pythnetwork/pyth-solana-receiver to create one.');
    }

    params.onProgress?.('generating');

    // Calculate position fee (0.06% of position size)
    const positionFee = (positionSize * 6n) / 10000n;

    // Convert input note to proof generator format
    const tokenMint = params.input.tokenMint instanceof Uint8Array
      ? params.input.tokenMint
      : params.input.tokenMint.toBytes();

    // Fetch the PerpsPool account to get the actual pool_id used in proofs
    // IMPORTANT: The on-chain verification uses perps_pool.pool_id, not the PDA address
    const perpsPoolAccount = await (this.program.account as any).perpsPool.fetch(params.poolId);
    const actualPoolId = perpsPoolAccount.poolId as PublicKey;

    // Transform client params to proof generator format
    const proofParams = {
      input: {
        stealthPubX: params.input.stealthPubX,
        tokenMint: tokenMint,
        amount: params.input.amount,
        randomness: params.input.randomness,
        leafIndex: params.input.leafIndex,
        stealthEphemeralPubkey: params.input.stealthEphemeralPubkey,
      },
      perpsPoolId: actualPoolId.toBytes(),
      marketId: bytesToField(params.marketId),
      isLong: params.direction === 'long',
      marginAmount: params.marginAmount,
      leverage: params.leverage,
      positionSize,
      entryPrice: oraclePrice,
      positionFee,
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merkleIndices: params.merkleIndices,
    };

    const proofResult = await this.proofGenerator.generateOpenPositionProof(
      proofParams,
      this.wallet.keypair
    );

    params.onProgress?.('building');

    // Derive PDAs
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array
      ? new PublicKey(params.input.tokenMint)
      : params.input.tokenMint;

    const [inputPoolPda] = derivePoolPda(inputTokenMint, this.programId);
    const inputPoolAccount = await (this.program.account as any).pool.fetch(inputPoolPda);
    const inputVault = inputPoolAccount.tokenVault;

    // Derive position pool from position mint stored in perps pool
    const positionMint = perpsPoolAccount.positionMint as PublicKey;
    const [positionPoolPda] = derivePoolPda(positionMint, this.programId);
    console.log(`[OpenPosition] Position mint from perps pool: ${positionMint.toBase58()}`);
    console.log(`[OpenPosition] Position pool derived: ${positionPoolPda.toBase58()}`);

    // Get protocol config
    const [protocolConfigPda] = deriveProtocolConfigPda(this.programId);

    // Compute input commitment
    const inputCommitment = computeCommitment(params.input);

    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? (await this.getRelayerPubkey());

    const { proof, nullifier, positionCommitment, positionRandomness, changeCommitment, changeRandomness, changeAmount } = proofResult;

    // Derive the perps market PDA
    const [perpsMarketPda] = derivePerpsMarketPda(params.poolId, params.marketId, this.programId);

    // Build Light Protocol params
    const lightParams = await this.buildLightProtocolParams(
      accountHash,
      nullifier,
      inputPoolPda,
      heliusRpcUrl
    );

    const instructionParams = {
      // Required fields matching OpenPositionInstructionParams
      settlementPool: inputPoolPda,
      positionPool: positionPoolPda,
      perpsPool: params.poolId,
      market: perpsMarketPda,
      marketId: params.marketId, // 32 bytes for position note encryption
      priceUpdate: pythPriceUpdate!,
      proof,
      merkleRoot: params.merkleRoot,
      inputCommitment,
      nullifier,
      positionCommitment,
      changeCommitment,
      isLong: params.direction === 'long',
      marginAmount: params.marginAmount,
      positionSize, // margin * leverage for position note
      leverage: params.leverage,
      positionFee,
      entryPrice: oraclePrice,
      relayer: relayerPubkey,
      positionRecipient: params.positionRecipient,
      changeRecipient: params.changeRecipient,
      positionRandomness,
      changeRandomness,
      changeAmount,
      tokenMint: inputTokenMint,
      // IMPORTANT: Circuit uses input note's stealthPubX for position commitment
      inputStealthPubX: params.input.stealthPubX,
      lightVerifyParams: lightParams.lightVerifyParams,
      lightNullifierParams: lightParams.lightNullifierParams,
      remainingAccounts: lightParams.remainingAccounts,
    };

    // Build multi-phase transactions
    console.log('[OpenPosition] === Starting Multi-Phase Open Position ===');
    console.log('[OpenPosition] Direction:', params.direction);
    console.log('[OpenPosition] Margin:', params.marginAmount.toString());
    console.log('[OpenPosition] Leverage:', params.leverage);

    const buildResult = await buildOpenPositionWithProgram(
      this.program,
      instructionParams as any
    );

    params.onProgress?.('approving');

    // Import generic builders for Phase 4+ and Final
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Execute multi-phase transactions
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    const lookupTables = await this.getAddressLookupTables();

    // Build all transactions including Phase 3, 4+, and Final
    const transactionBuilders: { name: string; builder: any }[] = [];

    // Phases 0-2: Create Pending, Verify, Nullifier
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: buildResult.tx });
    transactionBuilders.push({ name: 'Phase 1 (Verify Commitment)', builder: buildResult.phase1Tx });
    transactionBuilders.push({ name: 'Phase 2 (Create Nullifier)', builder: buildResult.phase2Tx });

    // Phase 3: Execute Open Position
    transactionBuilders.push({ name: 'Phase 3 (Execute Open Position)', builder: buildResult.phase3Tx });

    // Phase 4+: Create commitments (position + change)
    const { operationId, pendingCommitments } = buildResult;
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      // Skip dummy commitments (all zeros)
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4 + i} (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    // Build all versioned transactions
    // Jupiter-style bundling: prepend Pyth post to Phase 3, append Pyth close to Final
    const transactions: { name: string; tx: any; extraSigners?: any[] }[] = [];
    for (const { name, builder } of transactionBuilders) {
      const mainIx = await builder.instruction();
      const preIxs = builder._preInstructions || [];
      let allInstructions = [...preIxs, mainIx];
      let extraSigners: any[] = [];

      // Bundle Pyth post instructions into Phase 3
      if (name.includes('Phase 3') && params.pythPostInstructions?.length) {
        allInstructions = [...params.pythPostInstructions, ...allInstructions];
        if (params.priceUpdateKeypair) {
          extraSigners.push(params.priceUpdateKeypair);
        }
      }

      // Bundle Pyth close instructions into Final
      if (name.includes('Final') && params.pythCloseInstructions?.length) {
        allInstructions = [...allInstructions, ...params.pythCloseInstructions];
      }

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: relayerPubkey,
          recentBlockhash: blockhash,
          instructions: allInstructions,
        }).compileToV0Message(lookupTables)
      );
      transactions.push({ name, tx, extraSigners });
    }

    params.onProgress?.('executing');

    // Execute transactions in order
    let finalSignature = '';
    for (const { name, tx, extraSigners } of transactions) {
      console.log(`[OpenPosition] Executing ${name}...`);
      const signers = relayer ? [relayer] : [];
      if (extraSigners?.length) {
        signers.push(...extraSigners);
      }
      if (signers.length > 0) {
        tx.sign(signers);
      }
      const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
      const confirmation = await this.connection.confirmTransaction(sig, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[OpenPosition] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[OpenPosition] ${name} confirmed: ${sig}`);
      finalSignature = sig;
    }

    return {
      signature: finalSignature,
      slot: 0,
    };
  }

  /**
   * Close a perpetual futures position
   *
   * @param params - Close position parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async closePerpsPosition(
    params: ClosePerpsPositionParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the perps circuit is loaded
    if (!this.proofGenerator.hasCircuit('perps/close_position')) {
      throw new Error("Prover not initialized. Call initializeProver(['perps/close_position']) first.");
    }

    params.onProgress?.('preparing');

    // Require accountHash for commitment existence proof
    const accountHash = params.positionInput.accountHash;
    if (!accountHash) {
      throw new Error('Position note missing accountHash. Use scanNotes() to get notes with accountHash.');
    }

    // Get price from Pyth if not provided
    const feedId = params.pythFeedId || PYTH_FEED_IDS.BTC_USD;
    let oraclePrice = params.oraclePrice;
    const pythPriceUpdate = params.priceUpdate;

    if (!oraclePrice) {
      const pythService = new PythPriceService(this.connection);
      oraclePrice = await pythService.getPriceUsd(feedId, 9);
    }

    if (!pythPriceUpdate) {
      throw new Error('priceUpdate account is required. Use @pythnetwork/pyth-solana-receiver to create one.');
    }

    params.onProgress?.('generating');

    // Calculate PnL and fees based on entry/exit prices
    const closeFee = (params.positionInput.margin * 6n) / 10000n; // 0.06%

    // Determine profit/loss based on position direction and price movement
    const entryPrice = params.positionInput.entryPrice;
    const exitPrice = oraclePrice;
    const isLong = params.positionInput.isLong;

    // For long: profit if exit > entry. For short: profit if exit < entry
    const isProfit = isLong ? exitPrice > entryPrice : exitPrice < entryPrice;

    // Calculate PnL amount: |price_diff| * size / entry_price
    const priceDiff = isProfit
      ? (isLong ? exitPrice - entryPrice : entryPrice - exitPrice)
      : (isLong ? entryPrice - exitPrice : exitPrice - entryPrice);
    const pnlAmount = (priceDiff * params.positionInput.size) / entryPrice;

    // Use settlement token mint from params
    const tokenMint = params.settlementTokenMint.toBytes();

    // Fetch the PerpsPool account to get the actual pool_id used in proofs
    // IMPORTANT: The on-chain verification uses perps_pool.pool_id, not the PDA address
    const perpsPoolAccount = await (this.program.account as any).perpsPool.fetch(params.poolId);
    const actualPoolId = perpsPoolAccount.poolId as PublicKey;

    const proofParams = {
      position: {
        stealthPubX: params.positionInput.stealthPubX,
        marketId: bytesToField(params.positionInput.marketId),
        isLong: params.positionInput.isLong,
        margin: params.positionInput.margin,
        size: params.positionInput.size,
        leverage: params.positionInput.leverage,
        entryPrice: params.positionInput.entryPrice,
        randomness: params.positionInput.randomness,
        leafIndex: params.positionInput.leafIndex,
        spendingKey: this.wallet.keypair.spending.sk,
      },
      perpsPoolId: actualPoolId.toBytes(),
      exitPrice: oraclePrice, // Use resolved oracle price
      pnlAmount,
      isProfit,
      closeFee,
      settlementRecipient: params.settlementRecipient,
      tokenMint,
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merkleIndices: params.merkleIndices,
    };

    const proofResult = await this.proofGenerator.generateClosePositionProof(
      proofParams,
      this.wallet.keypair
    );

    params.onProgress?.('building');

    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? (await this.getRelayerPubkey());

    const { proof, positionNullifier: nullifier, settlementCommitment, settlementRandomness, settlementAmount } = proofResult;

    // Compute position commitment using position-specific formula
    // Cast to SDK's PositionNote type (noteType is only needed for serialization, not commitment)
    const positionCommitment = computePositionCommitment(params.positionInput as any);

    // Derive PDAs
    const settlementTokenMint = params.settlementTokenMint;
    const [settlementPoolPda] = derivePoolPda(settlementTokenMint, this.programId);
    const [perpsMarketPda] = derivePerpsMarketPda(params.poolId, params.marketId, this.programId);

    // Derive position pool from position mint stored in perps pool
    const positionMint = perpsPoolAccount.positionMint as PublicKey;
    const [positionPoolPda] = derivePoolPda(positionMint, this.programId);

    // Build Light Protocol params - use position pool since that's where position is stored
    const lightParams = await this.buildLightProtocolParams(
      accountHash,
      nullifier,
      positionPoolPda, // Position is in position pool
      heliusRpcUrl
    );

    const instructionParams = {
      positionPool: positionPoolPda,
      settlementPool: settlementPoolPda,
      perpsPool: params.poolId,
      market: perpsMarketPda,
      priceUpdate: pythPriceUpdate!,
      proof,
      merkleRoot: params.merkleRoot,
      positionCommitment,
      positionNullifier: nullifier,
      settlementCommitment,
      isLong: params.positionInput.isLong,
      exitPrice: oraclePrice,
      closeFee,
      pnlAmount,
      isProfit,
      positionMargin: params.positionInput.margin,
      positionSize: params.positionInput.size,
      entryPrice: params.positionInput.entryPrice,
      relayer: relayerPubkey,
      settlementRecipient: params.settlementRecipient,
      settlementRandomness,
      settlementAmount: settlementAmount ?? params.positionInput.margin,
      tokenMint: settlementTokenMint,
      lightVerifyParams: lightParams.lightVerifyParams,
      lightNullifierParams: lightParams.lightNullifierParams,
      remainingAccounts: lightParams.remainingAccounts,
    };

    // Build multi-phase transactions
    console.log('[ClosePosition] === Starting Multi-Phase Close Position ===');

    const buildResult = await buildClosePositionWithProgram(
      this.program,
      instructionParams as any
    );

    params.onProgress?.('approving');

    // Import generic builders for Phase 4+ and Final
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Execute multi-phase transactions
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    const lookupTables = await this.getAddressLookupTables();

    // Build all transactions including Phase 3, 4+, and Final
    const transactionBuilders: { name: string; builder: any }[] = [];

    // Phases 0-2: Create Pending, Verify, Nullifier
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: buildResult.tx });
    transactionBuilders.push({ name: 'Phase 1 (Verify Commitment)', builder: buildResult.phase1Tx });
    transactionBuilders.push({ name: 'Phase 2 (Create Nullifier)', builder: buildResult.phase2Tx });

    // Phase 3: Execute Close Position
    transactionBuilders.push({ name: 'Phase 3 (Execute Close Position)', builder: buildResult.phase3Tx });

    // Phase 4+: Create commitments (settlement payout)
    const { operationId, pendingCommitments } = buildResult;
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      // Skip dummy commitments (all zeros)
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4 + i} (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    // Build all versioned transactions
    // Jupiter-style bundling: prepend Pyth post to Phase 3, append Pyth close to Final
    const transactions: { name: string; tx: any; extraSigners?: any[] }[] = [];
    for (const { name, builder } of transactionBuilders) {
      const mainIx = await builder.instruction();
      const preIxs = builder._preInstructions || [];
      let allInstructions = [...preIxs, mainIx];
      let extraSigners: any[] = [];

      // Bundle Pyth post instructions into Phase 3
      if (name.includes('Phase 3') && params.pythPostInstructions?.length) {
        allInstructions = [...params.pythPostInstructions, ...allInstructions];
        if (params.priceUpdateKeypair) {
          extraSigners.push(params.priceUpdateKeypair);
        }
      }

      // Bundle Pyth close instructions into Final
      if (name.includes('Final') && params.pythCloseInstructions?.length) {
        allInstructions = [...allInstructions, ...params.pythCloseInstructions];
      }

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: relayerPubkey,
          recentBlockhash: blockhash,
          instructions: allInstructions,
        }).compileToV0Message(lookupTables)
      );
      transactions.push({ name, tx, extraSigners });
    }

    params.onProgress?.('executing');

    // Execute transactions in order
    let finalSignature = '';
    for (const { name, tx, extraSigners } of transactions) {
      console.log(`[ClosePosition] Executing ${name}...`);
      const signers = relayer ? [relayer] : [];
      if (extraSigners?.length) {
        signers.push(...extraSigners);
      }
      if (signers.length > 0) {
        tx.sign(signers);
      }
      const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
      const confirmation = await this.connection.confirmTransaction(sig, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[ClosePosition] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[ClosePosition] ${name} confirmed: ${sig}`);
      finalSignature = sig;
    }

    return {
      signature: finalSignature,
      slot: 0,
    };
  }

  /**
   * Add liquidity to a perpetual futures pool
   *
   * @param params - Add liquidity parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async addPerpsLiquidity(
    params: PerpsAddLiquidityClientParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the perps circuit is loaded
    if (!this.proofGenerator.hasCircuit('perps/add_liquidity')) {
      throw new Error("Prover not initialized. Call initializeProver(['perps/add_liquidity']) first.");
    }

    params.onProgress?.('preparing');

    // Require accountHash for commitment existence proof
    const accountHash = params.input.accountHash;
    if (!accountHash) {
      throw new Error('Input note missing accountHash. Use scanNotes() to get notes with accountHash.');
    }

    // Get price from Pyth if not provided
    const feedId = params.pythFeedId || PYTH_FEED_IDS.BTC_USD;
    let oraclePrices = params.oraclePrices;
    const pythPriceUpdate = params.priceUpdate;

    if (!oraclePrices) {
      const pythService = new PythPriceService(this.connection);
      const price = await pythService.getPriceUsd(feedId, 9);
      oraclePrices = [price];
    }

    if (!pythPriceUpdate) {
      throw new Error('priceUpdate account is required. Use @pythnetwork/pyth-solana-receiver to create one.');
    }

    params.onProgress?.('generating');

    // Calculate fee (if any)
    const feeAmount = 0n; // No deposit fee currently

    // Fetch the PerpsPool account to get the actual pool_id used in proofs
    // IMPORTANT: The on-chain verification uses perps_pool.pool_id, not the PDA address
    const perpsPoolAccount = await (this.program.account as any).perpsPool.fetch(params.poolId);
    const actualPoolId = perpsPoolAccount.poolId as PublicKey;

    // Convert input note to proof generator format
    const tokenMint = params.input.tokenMint instanceof Uint8Array
      ? params.input.tokenMint
      : params.input.tokenMint.toBytes();

    // Transform client params to proof generator format
    const proofParams = {
      input: {
        stealthPubX: params.input.stealthPubX,
        tokenMint: tokenMint,
        amount: params.input.amount,
        randomness: params.input.randomness,
        leafIndex: params.input.leafIndex,
        stealthEphemeralPubkey: params.input.stealthEphemeralPubkey,
      },
      perpsPoolId: actualPoolId.toBytes(),
      tokenIndex: params.tokenIndex,
      depositAmount: params.depositAmount,
      lpAmountMinted: params.lpAmount,
      feeAmount,
      lpRecipient: params.lpRecipient,
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merkleIndices: params.merkleIndices,
    };

    const proofResult = await this.proofGenerator.generateAddPerpsLiquidityProof(
      proofParams,
      this.wallet.keypair
    );

    // Generate change commitment (for remaining input after deposit + fee)
    const changeRandomness = generateRandomness();
    const changeCommitment = new Uint8Array(32); // No change in current design

    params.onProgress?.('building');

    // Derive PDAs
    const inputTokenMint = params.input.tokenMint instanceof Uint8Array
      ? new PublicKey(params.input.tokenMint)
      : params.input.tokenMint;

    const [depositPoolPda] = derivePoolPda(inputTokenMint, this.programId);
    const depositPoolAccount = await (this.program.account as any).pool.fetch(depositPoolPda);
    const [perpsVaultPda] = derivePerpsVaultPda(params.poolId, inputTokenMint, this.programId);

    // Get LP mint from already-fetched perps pool account (stored during initialization)
    const lpMint = perpsPoolAccount.lpMint as PublicKey;

    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? (await this.getRelayerPubkey());

    const { proof, nullifier, lpCommitment, lpRandomness } = proofResult;

    // Compute input commitment
    const inputCommitment = computeCommitment(params.input);

    // Build Light Protocol params
    const lightParams = await this.buildLightProtocolParams(
      accountHash,
      nullifier,
      depositPoolPda,
      heliusRpcUrl
    );

    const instructionParams = {
      depositPool: depositPoolPda,
      perpsPool: params.poolId,
      perpsPoolId: actualPoolId.toBytes(), // 32 bytes for LP note encryption
      priceUpdate: pythPriceUpdate!,
      lpMintAccount: lpMint,
      tokenVault: depositPoolAccount.tokenVault,
      proof,
      merkleRoot: params.merkleRoot,
      inputCommitment,
      nullifier,
      lpCommitment,
      tokenIndex: params.tokenIndex,
      depositAmount: params.depositAmount,
      lpAmountMinted: params.lpAmount,
      feeAmount: 0n,
      oraclePrices: oraclePrices!,
      relayer: relayerPubkey,
      lpRecipient: params.lpRecipient,
      lpRandomness,
      tokenMint: inputTokenMint,
      lpMint: lpMint,
      lightVerifyParams: lightParams.lightVerifyParams,
      lightNullifierParams: lightParams.lightNullifierParams,
      remainingAccounts: lightParams.remainingAccounts,
    };

    console.log('[AddPerpsLiquidity] === Starting Multi-Phase Add Liquidity ===');
    console.log('[AddPerpsLiquidity] Token index:', params.tokenIndex);
    console.log('[AddPerpsLiquidity] Deposit amount:', params.depositAmount.toString());

    const buildResult = await buildAddPerpsLiquidityWithProgram(
      this.program,
      instructionParams as any
    );

    params.onProgress?.('approving');

    // Import generic builders for Phase 4+ and Final
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Execute multi-phase transactions
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    const lookupTables = await this.getAddressLookupTables();

    // Build all transactions including Phase 3, 4+, and Final
    const transactionBuilders: { name: string; builder: any }[] = [];

    // Phases 0-2: Create Pending, Verify, Nullifier
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: buildResult.tx });
    transactionBuilders.push({ name: 'Phase 1 (Verify Commitment)', builder: buildResult.phase1Tx });
    transactionBuilders.push({ name: 'Phase 2 (Create Nullifier)', builder: buildResult.phase2Tx });

    // Phase 3: Execute Add Liquidity
    transactionBuilders.push({ name: 'Phase 3 (Execute Add Liquidity)', builder: buildResult.phase3Tx });

    // Phase 4+: Create commitments (LP token + change)
    const { operationId, pendingCommitments } = buildResult;
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      // Skip dummy commitments (all zeros)
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4 + i} (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    // Build all versioned transactions
    // Jupiter-style bundling: prepend Pyth post to Phase 3, append Pyth close to Final
    const transactions: { name: string; tx: any; extraSigners?: any[] }[] = [];
    for (const { name, builder } of transactionBuilders) {
      const mainIx = await builder.instruction();
      const preIxs = builder._preInstructions || [];
      let allInstructions = [...preIxs, mainIx];
      let extraSigners: any[] = [];

      // Bundle Pyth post instructions into Phase 3
      if (name.includes('Phase 3') && params.pythPostInstructions?.length) {
        allInstructions = [...params.pythPostInstructions, ...allInstructions];
        if (params.priceUpdateKeypair) {
          extraSigners.push(params.priceUpdateKeypair);
        }
      }

      // Bundle Pyth close instructions into Final
      if (name.includes('Final') && params.pythCloseInstructions?.length) {
        allInstructions = [...allInstructions, ...params.pythCloseInstructions];
      }

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: relayerPubkey,
          recentBlockhash: blockhash,
          instructions: allInstructions,
        }).compileToV0Message(lookupTables)
      );
      transactions.push({ name, tx, extraSigners });
    }

    params.onProgress?.('executing');

    // Execute transactions in order
    let finalSignature = '';
    for (const { name, tx, extraSigners } of transactions) {
      console.log(`[AddPerpsLiquidity] Executing ${name}...`);
      const signers = relayer ? [relayer] : [];
      if (extraSigners?.length) {
        signers.push(...extraSigners);
      }
      if (signers.length > 0) {
        tx.sign(signers);
      }
      const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
      const confirmation = await this.connection.confirmTransaction(sig, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[AddPerpsLiquidity] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[AddPerpsLiquidity] ${name} confirmed: ${sig}`);
      finalSignature = sig;
    }

    return {
      signature: finalSignature,
      slot: 0,
    };
  }

  /**
   * Remove liquidity from a perpetual futures pool
   *
   * @param params - Remove liquidity parameters
   * @param relayer - Optional relayer keypair for transaction fees
   */
  async removePerpsLiquidity(
    params: PerpsRemoveLiquidityClientParams,
    relayer?: SolanaKeypair
  ): Promise<TransactionResult> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Ensure the perps circuit is loaded
    if (!this.proofGenerator.hasCircuit('perps/remove_liquidity')) {
      throw new Error("Prover not initialized. Call initializeProver(['perps/remove_liquidity']) first.");
    }

    params.onProgress?.('preparing');

    // Require accountHash for commitment existence proof
    const accountHash = params.lpInput.accountHash;
    if (!accountHash) {
      throw new Error('LP note missing accountHash. Use scanNotes() to get notes with accountHash.');
    }

    // Get price from Pyth if not provided
    const feedId = params.pythFeedId || PYTH_FEED_IDS.BTC_USD;
    let oraclePrices = params.oraclePrices;
    const pythPriceUpdate = params.priceUpdate;

    if (!oraclePrices) {
      const pythService = new PythPriceService(this.connection);
      const price = await pythService.getPriceUsd(feedId, 9);
      oraclePrices = [price];
    }

    if (!pythPriceUpdate) {
      throw new Error('priceUpdate account is required. Use @pythnetwork/pyth-solana-receiver to create one.');
    }

    params.onProgress?.('generating');

    // Derive PDAs first to get token mint
    const [perpsPoolAccount] = derivePerpsPoolPda(params.poolId, this.programId);

    // Fetch pool to get token info and actual pool_id for proofs
    // IMPORTANT: The on-chain verification uses perps_pool.pool_id, not the PDA address
    const poolData = await (this.program.account as any).perpsPool.fetch(params.poolId);
    const actualPoolId = poolData.poolId as PublicKey;
    const tokenMint = poolData.tokens[params.tokenIndex].mint;
    const tokenMintBytes = tokenMint.toBytes();

    // Calculate fee (if any)
    const feeAmount = 0n; // No withdrawal fee currently
    const changeLpAmount = params.lpInput.lpAmount - params.lpAmount; // LP tokens remaining after burn

    // Transform client params to proof generator format
    const proofParams = {
      lpInput: {
        stealthPubX: params.lpInput.stealthPubX,
        lpAmount: params.lpInput.lpAmount,
        randomness: params.lpInput.randomness,
        leafIndex: params.lpInput.leafIndex,
        spendingKey: this.wallet.keypair.spending.sk,
      },
      perpsPoolId: actualPoolId.toBytes(),
      tokenIndex: params.tokenIndex,
      lpAmountBurned: params.lpAmount,
      withdrawAmount: params.withdrawAmount,
      feeAmount,
      outputRecipient: params.withdrawRecipient,
      outputTokenMint: tokenMintBytes,
      changeLpAmount,
      merkleRoot: params.merkleRoot,
      merklePath: params.merklePath,
      merkleIndices: params.merkleIndices,
    };

    const proofResult = await this.proofGenerator.generateRemovePerpsLiquidityProof(
      proofParams,
      this.wallet.keypair
    );

    params.onProgress?.('building');

    const [withdrawalPoolPda] = derivePoolPda(tokenMint, this.programId);
    const withdrawalPoolAccount = await (this.program.account as any).pool.fetch(withdrawalPoolPda);
    const [perpsVaultPda] = derivePerpsVaultPda(params.poolId, tokenMint, this.programId);

    // Get LP mint from already-fetched perps pool data (stored during initialization)
    const lpMint = poolData.lpMint as PublicKey;

    const heliusRpcUrl = this.getHeliusRpcUrl();
    const relayerPubkey = relayer?.publicKey ?? (await this.getRelayerPubkey());

    const {
      proof,
      lpNullifier: nullifier,
      outputCommitment: withdrawCommitment,
      changeLpCommitment: lpChangeCommitment,
      outputRandomness: withdrawRandomness,
      changeLpRandomness: lpChangeRandomness
    } = proofResult;

    // Compute LP commitment using LP-specific formula
    const lpCommitment = computeLpCommitment(params.lpInput);

    // Derive LP pool - this is where the LP commitment is stored
    const [lpPoolPda] = derivePoolPda(lpMint, this.programId);

    // Build Light Protocol params using LP pool (not withdrawal pool!)
    // The LP commitment is in the LP pool, not the withdrawal token pool
    const lightParams = await this.buildLightProtocolParams(
      accountHash,
      nullifier,
      lpPoolPda,  // LP commitment is in LP pool
      heliusRpcUrl
    );

    const instructionParams = {
      withdrawalPool: withdrawalPoolPda,
      perpsPool: params.poolId,
      perpsPoolId: actualPoolId.toBytes(), // 32 bytes for LP note encryption
      priceUpdate: pythPriceUpdate!,
      lpMintAccount: lpMint,
      tokenVault: withdrawalPoolAccount.tokenVault,
      proof,
      merkleRoot: params.merkleRoot,
      lpCommitment,
      lpNullifier: nullifier,
      outputCommitment: withdrawCommitment,
      changeLpCommitment: lpChangeCommitment,
      tokenIndex: params.tokenIndex,
      withdrawAmount: params.withdrawAmount,
      lpAmountBurned: params.lpAmount,
      feeAmount: 0n,
      oraclePrices: oraclePrices!,
      relayer: relayerPubkey,
      outputRecipient: params.withdrawRecipient,
      lpChangeRecipient: params.lpChangeRecipient,
      outputRandomness: withdrawRandomness,
      lpChangeRandomness,
      tokenMint,
      lpMint: lpMint,
      lpChangeAmount: changeLpAmount,
      lightVerifyParams: lightParams.lightVerifyParams,
      lightNullifierParams: lightParams.lightNullifierParams,
      remainingAccounts: lightParams.remainingAccounts,
    };

    console.log('[RemovePerpsLiquidity] === Starting Multi-Phase Remove Liquidity ===');
    console.log('[RemovePerpsLiquidity] Token index:', params.tokenIndex);
    console.log('[RemovePerpsLiquidity] LP amount:', params.lpAmount.toString());

    const buildResult = await buildRemovePerpsLiquidityWithProgram(
      this.program,
      instructionParams as any
    );

    params.onProgress?.('approving');

    // Import generic builders for Phase 4+ and Final
    const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./instructions/swap');

    // Execute multi-phase transactions
    const { VersionedTransaction, TransactionMessage } = await import('@solana/web3.js');
    const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
    const lookupTables = await this.getAddressLookupTables();

    // Build all transactions including Phase 3, 4+, and Final
    const transactionBuilders: { name: string; builder: any }[] = [];

    // Phases 0-2: Create Pending, Verify, Nullifier
    transactionBuilders.push({ name: 'Phase 0 (Create Pending)', builder: buildResult.tx });
    transactionBuilders.push({ name: 'Phase 1 (Verify Commitment)', builder: buildResult.phase1Tx });
    transactionBuilders.push({ name: 'Phase 2 (Create Nullifier)', builder: buildResult.phase2Tx });

    // Phase 3: Execute Remove Liquidity
    transactionBuilders.push({ name: 'Phase 3 (Execute Remove Liquidity)', builder: buildResult.phase3Tx });

    // Phase 4+: Create commitments (output tokens + LP change)
    const { operationId, pendingCommitments } = buildResult;
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      // Skip dummy commitments (all zeros)
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        this.program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: relayerPubkey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
          commitment: pc.commitment,
        },
        heliusRpcUrl
      );
      transactionBuilders.push({ name: `Phase ${4 + i} (Commitment ${i})`, builder: commitmentTx });
    }

    // Final: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      this.program,
      operationId,
      relayerPubkey
    );
    transactionBuilders.push({ name: 'Final (Close Pending)', builder: closeTx });

    // Build all versioned transactions
    // Jupiter-style bundling: prepend Pyth post to Phase 3, append Pyth close to Final
    const transactions: { name: string; tx: any; extraSigners?: any[] }[] = [];
    for (const { name, builder } of transactionBuilders) {
      const mainIx = await builder.instruction();
      const preIxs = builder._preInstructions || [];
      let allInstructions = [...preIxs, mainIx];
      let extraSigners: any[] = [];

      // Bundle Pyth post instructions into Phase 3
      if (name.includes('Phase 3') && params.pythPostInstructions?.length) {
        allInstructions = [...params.pythPostInstructions, ...allInstructions];
        if (params.priceUpdateKeypair) {
          extraSigners.push(params.priceUpdateKeypair);
        }
      }

      // Bundle Pyth close instructions into Final
      if (name.includes('Final') && params.pythCloseInstructions?.length) {
        allInstructions = [...allInstructions, ...params.pythCloseInstructions];
      }

      const tx = new VersionedTransaction(
        new TransactionMessage({
          payerKey: relayerPubkey,
          recentBlockhash: blockhash,
          instructions: allInstructions,
        }).compileToV0Message(lookupTables)
      );
      transactions.push({ name, tx, extraSigners });
    }

    params.onProgress?.('executing');

    // Execute transactions in order
    let finalSignature = '';
    for (const { name, tx, extraSigners } of transactions) {
      console.log(`[RemovePerpsLiquidity] Executing ${name}...`);
      const signers = relayer ? [relayer] : [];
      if (extraSigners?.length) {
        signers.push(...extraSigners);
      }
      if (signers.length > 0) {
        tx.sign(signers);
      }
      const sig = await this.connection.sendTransaction(tx, { skipPreflight: false });
      const confirmation = await this.connection.confirmTransaction(sig, 'confirmed');
      if (confirmation.value.err) {
        throw new Error(`[RemovePerpsLiquidity] ${name} reverted: ${JSON.stringify(confirmation.value.err)}`);
      }
      console.log(`[RemovePerpsLiquidity] ${name} confirmed: ${sig}`);
      finalSignature = sig;
    }

    return {
      signature: finalSignature,
      slot: 0,
    };
  }

  /**
   * Fetch all perps pools
   */
  async getAllPerpsPools(): Promise<Array<{ address: PublicKey; data: any }>> {
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    const accounts = await (this.program.account as any).perpsPool.all();
    return accounts.map((acc: any) => ({
      address: acc.publicKey,
      data: acc.account,
    }));
  }

  /**
   * Fetch a specific perps pool
   */
  async getPerpsPool(poolAddress: PublicKey): Promise<any> {
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    return await (this.program.account as any).perpsPool.fetch(poolAddress);
  }

  /**
   * Fetch perps markets for a pool
   */
  async getPerpsMarkets(poolAddress: PublicKey): Promise<Array<{ address: PublicKey; data: any }>> {
    if (!this.program) {
      throw new Error('No program set. Call setProgram() first.');
    }

    // Filter markets by pool
    const accounts = await (this.program.account as any).perpsMarket.all([
      { memcmp: { offset: 8 + 32, bytes: poolAddress.toBase58() } },
    ]);

    return accounts.map((acc: any) => ({
      address: acc.publicKey,
      data: acc.account,
    }));
  }

  // =============================================================================
  // Perps Note Scanning
  // =============================================================================

  /**
   * Scan for position notes belonging to the current wallet
   *
   * Scans the position pool for encrypted position notes and attempts to decrypt
   * them with the user's viewing key. Returns only unspent positions.
   *
   * @param positionMint - The position mint (from perps pool's positionMint field)
   * @returns Array of decrypted position notes owned by the user
   */
  async scanPositionNotes(positionMint: PublicKey): Promise<import('./light').ScannedPositionNote[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);

    // Derive position pool PDA from position mint
    const [positionPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), positionMint.toBuffer()],
      this.programId
    );

    // Use getUnspentPositionNotes to filter out spent positions
    return this.lightClient.getUnspentPositionNotes(viewingKey, nullifierKey, this.programId, positionPoolPda);
  }

  /**
   * Scan for LP notes belonging to the current wallet
   *
   * Scans the LP pool for encrypted LP notes and attempts to decrypt
   * them with the user's viewing key. Returns only unspent LP positions.
   *
   * @param lpMint - The LP mint (from perps pool's lpMint field)
   * @returns Array of decrypted LP notes owned by the user
   */
  async scanLpNotes(lpMint: PublicKey): Promise<import('./light').ScannedLpNote[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);

    // Derive LP pool PDA from LP mint
    const [lpPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), lpMint.toBuffer()],
      this.programId
    );

    // Use getUnspentLpNotes to filter out spent LP tokens
    return this.lightClient.getUnspentLpNotes(viewingKey, nullifierKey, this.programId, lpPoolPda);
  }

  /**
   * Scan for all position notes (including spent) for advanced use cases
   *
   * @param positionMint - The position mint
   * @returns Array of position notes with spent status
   */
  async scanPositionNotesWithStatus(positionMint: PublicKey): Promise<import('./light').ScannedPositionNote[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);

    const [positionPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), positionMint.toBuffer()],
      this.programId
    );

    return this.lightClient.scanPositionNotesWithStatus(viewingKey, nullifierKey, this.programId, positionPoolPda);
  }

  /**
   * Scan for all LP notes (including spent) for advanced use cases
   *
   * @param lpMint - The LP mint
   * @returns Array of LP notes with spent status
   */
  async scanLpNotesWithStatus(lpMint: PublicKey): Promise<import('./light').ScannedLpNote[]> {
    if (!this.wallet) {
      throw new Error('No wallet loaded');
    }
    if (!this.lightClient) {
      throw new Error('Light Protocol not configured. Provide heliusApiKey in config.');
    }

    const viewingKey = bytesToField(this.wallet.keypair.spending.sk);
    const nullifierKey = deriveNullifierKey(this.wallet.keypair.spending.sk);

    const [lpPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), lpMint.toBuffer()],
      this.programId
    );

    return this.lightClient.scanLpNotesWithStatus(viewingKey, nullifierKey, this.programId, lpPoolPda);
  }

  /**
   * Fetch position metadata for given position IDs
   *
   * Queries public PositionMeta compressed accounts to get status,
   * liquidation price, and other metadata for positions.
   *
   * @param poolId - Pool address (will be converted to bytes)
   * @param positionIds - Array of position IDs to fetch
   * @returns Map of position ID (hex) to PositionMeta
   */
  async fetchPositionMetas(
    poolId: PublicKey,
    positionIds: Uint8Array[]
  ): Promise<Map<string, import('./light').PositionMetaData>> {
    if (!this.lightClient) {
      throw new Error('Light client not initialized');
    }
    return this.lightClient.fetchPositionMetas(
      this.programId,
      poolId.toBytes(),
      positionIds
    );
  }

  /**
   * Fetch all active position metas for a pool
   *
   * Useful for keepers to monitor all positions for liquidation.
   *
   * @param poolId - Pool address to scan
   * @returns Array of active PositionMeta
   */
  async fetchActivePositionMetas(
    poolId: PublicKey
  ): Promise<import('./light').PositionMetaData[]> {
    if (!this.lightClient) {
      throw new Error('Light client not initialized');
    }
    return this.lightClient.fetchActivePositionMetas(
      this.programId,
      poolId.toBytes()
    );
  }
}
