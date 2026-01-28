/**
 * Light Protocol Integration
 *
 * Handles interaction with Helius Photon indexer for compressed account operations.
 * Used for nullifier and commitment storage via ZK Compression.
 * Includes note scanner for finding user's notes in compressed accounts.
 */

import { PublicKey, AccountMeta } from '@solana/web3.js';
import { deriveAddressSeedV2, deriveAddressV2, createRpc, bn, Rpc } from '@lightprotocol/stateless.js';
import { sha256 } from '@noble/hashes/sha256';
import type { DecryptedNote, EncryptedNote, Point } from '@cloakcraft/types';
import { tryDecryptNote, tryDecryptAnyNote, DecryptedNoteResult } from './crypto/encryption';
import { deriveSpendingNullifier, deriveNullifierKey } from './crypto/nullifier';
import { initPoseidon, bytesToField, fieldToBytes } from './crypto/poseidon';
import { deriveStealthPrivateKey } from './crypto/stealth';
import { derivePublicKey } from './crypto/babyjubjub';
import {
  computeCommitment,
  computePositionCommitment,
  computeLpCommitment,
  NOTE_TYPE_STANDARD,
  NOTE_TYPE_POSITION,
  NOTE_TYPE_LP,
  PositionNote,
  LpNote,
} from './crypto/commitment';

// =========================================================================
// Retry Logic with Exponential Backoff
// =========================================================================

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Configuration for retry logic
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 5) */
  maxRetries: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs: number;
  /** Maximum delay in ms (default: 30000) */
  maxDelayMs: number;
  /** Whether to log retry attempts (default: true) */
  logRetries: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  logRetries: true,
};

/**
 * Check if an error is a rate limit error (HTTP 429)
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return msg.includes('429') ||
           msg.includes('rate limit') ||
           msg.includes('too many requests') ||
           msg.includes('quota exceeded');
  }
  return false;
}

/**
 * Check if a response indicates rate limiting
 */
function isRateLimitResponse(response: Response): boolean {
  return response.status === 429;
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * Automatically retries on 429 (rate limit) errors with exponential backoff.
 * Other errors are thrown immediately.
 *
 * @param fn - Async function to execute
 * @param config - Retry configuration
 * @param operation - Description of the operation (for logging)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  operation: string = 'RPC call'
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRateLimit = isRateLimitError(error);
      const isLastAttempt = attempt >= cfg.maxRetries;

      // Only retry rate limit errors
      if (!isRateLimit || isLastAttempt) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = cfg.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
      const delay = Math.min(exponentialDelay + jitter, cfg.maxDelayMs);

      if (cfg.logRetries) {
        console.warn(
          `[Light] Rate limited on ${operation}, attempt ${attempt + 1}/${cfg.maxRetries + 1}. ` +
          `Retrying in ${Math.round(delay)}ms...`
        );
      }

      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw new Error(`[Light] ${operation} failed after ${cfg.maxRetries + 1} attempts`);
}

/**
 * Fetch with automatic retry on rate limits
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: Partial<RetryConfig> = {},
  operation: string = 'fetch'
): Promise<Response> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    const response = await fetch(url, options);

    // Check for rate limiting
    if (isRateLimitResponse(response)) {
      const isLastAttempt = attempt >= cfg.maxRetries;

      if (isLastAttempt) {
        throw new Error(`Rate limit exceeded (429) after ${cfg.maxRetries + 1} attempts for ${operation}`);
      }

      // Calculate delay
      const exponentialDelay = cfg.baseDelayMs * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * exponentialDelay;
      const delay = Math.min(exponentialDelay + jitter, cfg.maxDelayMs);

      // Check for Retry-After header
      const retryAfter = response.headers.get('Retry-After');
      const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : delay;
      const actualDelay = Math.min(retryAfterMs, cfg.maxDelayMs);

      if (cfg.logRetries) {
        console.warn(
          `[Light] Rate limited (429) on ${operation}, attempt ${attempt + 1}/${cfg.maxRetries + 1}. ` +
          `Retrying in ${Math.round(actualDelay)}ms...`
        );
      }

      await sleep(actualDelay);
      continue;
    }

    return response;
  }

  throw new Error(`[Light] ${operation} failed after ${cfg.maxRetries + 1} attempts`);
}

/**
 * Helius RPC endpoint configuration
 */
export interface HeliusConfig {
  /** Helius API key */
  apiKey: string;
  /** Network: 'mainnet-beta' | 'devnet' */
  network: 'mainnet-beta' | 'devnet';
}

/**
 * Validity proof from Helius indexer
 */
export interface ValidityProof {
  /** Compressed proof bytes */
  compressedProof: {
    a: number[];
    b: number[];
    c: number[];
  };
  /** Root indices for state trees */
  rootIndices: number[];
  /** Merkle context */
  merkleTrees: PublicKey[];
}

/**
 * Packed address tree info for Light Protocol CPI
 */
export interface PackedAddressTreeInfo {
  /** Address merkle tree account */
  addressMerkleTreeAccountIndex: number;
  /** Address queue account */
  addressQueueAccountIndex: number;
}

/**
 * Light nullifier params for transaction
 */
export interface LightNullifierParams {
  /** Validity proof from indexer */
  validityProof: ValidityProof;
  /** Address tree info */
  addressTreeInfo: PackedAddressTreeInfo;
  /** Output tree index */
  outputTreeIndex: number;
}

/**
 * Compressed account info from indexer
 */
export interface CompressedAccountInfo {
  /** Account hash */
  hash: string;
  /** Address (32 bytes hex) */
  address: string | null;
  /** Owner program */
  owner: string;
  /** Lamports */
  lamports: number;
  /** Data object with discriminator and base64 data */
  data: {
    discriminator: number;
    data: string;
  } | null;
}

/**
 * Light Protocol client for Helius Photon indexer
 *
 * All RPC calls include automatic retry with exponential backoff for rate limits.
 */
export class LightClient {
  protected readonly rpcUrl: string;
  protected readonly lightRpc: Rpc;
  protected readonly retryConfig: Partial<RetryConfig>;

  constructor(config: HeliusConfig & { retryConfig?: Partial<RetryConfig> }) {
    const baseUrl = config.network === 'mainnet-beta'
      ? 'https://mainnet.helius-rpc.com'
      : 'https://devnet.helius-rpc.com';
    this.rpcUrl = `${baseUrl}/?api-key=${config.apiKey}`;
    // Create Light SDK Rpc client
    this.lightRpc = createRpc(this.rpcUrl, this.rpcUrl, this.rpcUrl);
    // Store retry config (default: 5 retries with exponential backoff)
    this.retryConfig = config.retryConfig ?? {};
  }

  /**
   * Get compressed account by address
   *
   * Returns null if account doesn't exist (nullifier not spent)
   * Includes automatic retry with exponential backoff on rate limits.
   */
  async getCompressedAccount(address: Uint8Array): Promise<CompressedAccountInfo | null> {
    // Helius expects base58 encoded address (like Solana public keys)
    const addressBase58 = new PublicKey(address).toBase58();

    const response = await fetchWithRetry(
      this.rpcUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getCompressedAccount',
          params: {
            address: addressBase58,
          },
        }),
      },
      this.retryConfig,
      'getCompressedAccount'
    );

    const result = await response.json() as {
      result: { context: { slot: number }; value: CompressedAccountInfo | null };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }

    // Helius returns {context: {...}, value: <account|null>}
    return result.result?.value ?? null;
  }

  /**
   * Check if a nullifier has been spent
   *
   * Returns true if the nullifier compressed account exists
   */
  async isNullifierSpent(
    nullifier: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey,
    pool: PublicKey
  ): Promise<boolean> {
    const address = this.deriveNullifierAddress(nullifier, programId, addressTree, pool);
    const account = await this.getCompressedAccount(address);
    return account !== null;
  }

  /**
   * Batch check if multiple nullifiers have been spent
   *
   * Uses getMultipleCompressedAccounts for efficiency (single API call)
   * Returns a Set of addresses that exist (are spent)
   * Includes automatic retry with exponential backoff on rate limits.
   */
  async batchCheckNullifiers(addresses: string[]): Promise<Set<string>> {
    if (addresses.length === 0) {
      return new Set();
    }

    // Helius getMultipleCompressedAccounts
    const response = await fetchWithRetry(
      this.rpcUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getMultipleCompressedAccounts',
          params: {
            addresses,
          },
        }),
      },
      this.retryConfig,
      'batchCheckNullifiers'
    );

    const result = await response.json() as {
      result: { value: { items: Array<{ address: string } | null> } };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }

    // Build set of addresses that exist (spent)
    const spentSet = new Set<string>();
    const items = result.result?.value?.items ?? [];
    for (const item of items) {
      if (item && item.address) {
        spentSet.add(item.address);
      }
    }

    return spentSet;
  }

  /**
   * Get validity proof for creating a new compressed account
   *
   * This proves that the address doesn't exist yet (non-inclusion proof)
   * Includes automatic retry with exponential backoff on rate limits.
   *
   * Helius API expects:
   * - hashes: Array of existing account hashes to verify (optional)
   * - newAddressesWithTrees: Array of {address, tree} for non-inclusion proofs
   */
  async getValidityProof(params: {
    /** New addresses to create (non-inclusion proof) */
    newAddresses: Uint8Array[];
    /** Address merkle tree for each new address */
    addressMerkleTree: PublicKey;
    /** State merkle tree for output (not used in Helius API but needed for context) */
    stateMerkleTree: PublicKey;
    /** Optional: existing account hashes to include in proof */
    hashes?: string[];
  }): Promise<ValidityProof> {
    // Build newAddressesWithTrees array - each address paired with its tree
    const newAddressesWithTrees = params.newAddresses.map(addr => ({
      address: new PublicKey(addr).toBase58(),
      tree: params.addressMerkleTree.toBase58(),
    }));

    const response = await fetchWithRetry(
      this.rpcUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getValidityProof',
          params: {
            // Helius expects hashes (for inclusion) and newAddressesWithTrees (for non-inclusion)
            hashes: params.hashes ?? [],
            newAddressesWithTrees,
          },
        }),
      },
      this.retryConfig,
      'getValidityProof'
    );

    const result = await response.json() as {
      result: {
        compressedProof: { a: number[]; b: number[]; c: number[] };
        rootIndices: number[];
        merkleTrees: string[];
      };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`failed to get validity proof for hashes ${params.hashes?.join(', ') ?? '[]'}: ${result.error.message}`);
    }

    return {
      compressedProof: result.result.compressedProof,
      rootIndices: result.result.rootIndices,
      merkleTrees: result.result.merkleTrees.map(t => new PublicKey(t)),
    };
  }

  /**
   * Prepare Light Protocol params for transact instruction
   */
  async prepareLightParams(params: {
    /** Nullifier hash */
    nullifier: Uint8Array;
    /** CloakCraft program ID */
    programId: PublicKey;
    /** Pool PDA (for nullifier address derivation) */
    pool: PublicKey;
    /** Address merkle tree account */
    addressMerkleTree: PublicKey;
    /** State merkle tree account */
    stateMerkleTree: PublicKey;
    /** Address merkle tree account index in remaining accounts */
    addressMerkleTreeAccountIndex: number;
    /** Address queue account index in remaining accounts */
    addressQueueAccountIndex: number;
    /** Output state tree index */
    outputTreeIndex: number;
  }): Promise<LightNullifierParams> {
    // Derive nullifier address (seeds: ["spend_nullifier", pool, nullifier])
    const nullifierAddress = this.deriveNullifierAddress(
      params.nullifier,
      params.programId,
      params.addressMerkleTree,
      params.pool
    );

    // Get validity proof (non-inclusion)
    const validityProof = await this.getValidityProof({
      newAddresses: [nullifierAddress],
      addressMerkleTree: params.addressMerkleTree,
      stateMerkleTree: params.stateMerkleTree,
    });

    return {
      validityProof,
      addressTreeInfo: {
        addressMerkleTreeAccountIndex: params.addressMerkleTreeAccountIndex,
        addressQueueAccountIndex: params.addressQueueAccountIndex,
      },
      outputTreeIndex: params.outputTreeIndex,
    };
  }

  /**
   * Get remaining accounts needed for Light Protocol CPI
   *
   * These accounts must be passed to the transact instruction
   */
  async getRemainingAccounts(params: {
    /** State merkle tree */
    stateMerkleTree: PublicKey;
    /** Address merkle tree */
    addressMerkleTree: PublicKey;
    /** Nullifier queue */
    nullifierQueue: PublicKey;
  }): Promise<AccountMeta[]> {
    // Light Protocol system accounts (these are constant per network)
    const LIGHT_SYSTEM_PROGRAM = new PublicKey('LightSystem111111111111111111111111111111111');
    const ACCOUNT_COMPRESSION_PROGRAM = new PublicKey('compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq');
    const NOOP_PROGRAM = new PublicKey('noopb9bkMVfRPU8AsBHBNRs27gxNvyqrDGj3zPqsR');
    const REGISTERED_PROGRAM_PDA = new PublicKey('4LfVCK1CgVbS6Xeu1RSMvKWv9NLLdwVBJ64dJpqpKbLi');

    return [
      // Light system accounts
      { pubkey: LIGHT_SYSTEM_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: ACCOUNT_COMPRESSION_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: NOOP_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: REGISTERED_PROGRAM_PDA, isSigner: false, isWritable: false },
      // Merkle trees
      { pubkey: params.stateMerkleTree, isSigner: false, isWritable: true },
      { pubkey: params.addressMerkleTree, isSigner: false, isWritable: true },
      { pubkey: params.nullifierQueue, isSigner: false, isWritable: true },
    ];
  }

  /**
   * Derive spend nullifier compressed account address
   *
   * Uses Light Protocol's Poseidon-based address derivation.
   * Must match the on-chain derivation in light_cpi/mod.rs:
   * Seeds: ["spend_nullifier", pool, nullifier]
   */
  deriveNullifierAddress(
    nullifier: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey,
    pool?: PublicKey
  ): Uint8Array {
    // Seeds must match on-chain: ["spend_nullifier", pool, nullifier]
    const seeds = pool
      ? [
          Buffer.from('spend_nullifier'),
          pool.toBuffer(),
          Buffer.from(nullifier),
        ]
      : [
          Buffer.from('spend_nullifier'),
          Buffer.from(nullifier),
        ];

    const seed = deriveAddressSeedV2(seeds);
    const address = deriveAddressV2(seed, addressTree, programId);

    return address.toBytes();
  }
}

/**
 * V2 State Tree Set - contains state tree, output queue, and CPI context
 */
export interface StateTreeSet {
  stateTree: PublicKey;
  outputQueue: PublicKey;
  cpiContext: PublicKey;
}

/**
 * Light Protocol V2 batch tree accounts for devnet
 *
 * V2 uses batch merkle trees for better throughput.
 * There are 5 parallel state tree sets to avoid contention.
 * For address trees, the tree and queue are the same account.
 *
 * Address tree from Light SDK getBatchAddressTreeInfo()
 */
export const DEVNET_LIGHT_TREES = {
  /** V2 batch address tree from Light SDK getBatchAddressTreeInfo() */
  addressTree: new PublicKey('amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx'),

  /** 5 parallel state tree sets for throughput */
  stateTrees: [
    {
      stateTree: new PublicKey('bmt1LryLZUMmF7ZtqESaw7wifBXLfXHQYoE4GAmrahU'),
      outputQueue: new PublicKey('oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto'),
      cpiContext: new PublicKey('cpi15BoVPKgEPw5o8wc2T816GE7b378nMXnhH3Xbq4y'),
    },
    {
      stateTree: new PublicKey('bmt2UxoBxB9xWev4BkLvkGdapsz6sZGkzViPNph7VFi'),
      outputQueue: new PublicKey('oq2UkeMsJLfXt2QHzim242SUi3nvjJs8Pn7Eac9H9vg'),
      cpiContext: new PublicKey('cpi2yGapXUR3As5SjnHBAVvmApNiLsbeZpF3euWnW6B'),
    },
    {
      stateTree: new PublicKey('bmt3ccLd4bqSVZVeCJnH1F6C8jNygAhaDfxDwePyyGb'),
      outputQueue: new PublicKey('oq3AxjekBWgo64gpauB6QtuZNesuv19xrhaC1ZM1THQ'),
      cpiContext: new PublicKey('cpi3mbwMpSX8FAGMZVP85AwxqCaQMfEk9Em1v8QK9Rf'),
    },
    {
      stateTree: new PublicKey('bmt4d3p1a4YQgk9PeZv5s4DBUmbF5NxqYpk9HGjQsd8'),
      outputQueue: new PublicKey('oq4ypwvVGzCUMoiKKHWh4S1SgZJ9vCvKpcz6RT6A8dq'),
      cpiContext: new PublicKey('cpi4yyPDc4bCgHAnsenunGA8Y77j3XEDyjgfyCKgcoc'),
    },
    {
      stateTree: new PublicKey('bmt5yU97jC88YXTuSukYHa8Z5Bi2ZDUtmzfkDTA2mG2'),
      outputQueue: new PublicKey('oq5oh5ZR3yGomuQgFduNDzjtGvVWfDRGLuDVjv9a96P'),
      cpiContext: new PublicKey('cpi5ZTjdgYpZ1Xr7B1cMLLUE81oTtJbNNAyKary2nV6'),
    },
  ] as StateTreeSet[],
};

/**
 * Get a random state tree set for load balancing
 */
export function getRandomStateTreeSet(): StateTreeSet {
  const index = Math.floor(Math.random() * DEVNET_LIGHT_TREES.stateTrees.length);
  return DEVNET_LIGHT_TREES.stateTrees[index];
}

/**
 * Get state tree set by index (0-4)
 */
export function getStateTreeSet(index: number): StateTreeSet {
  if (index < 0 || index >= DEVNET_LIGHT_TREES.stateTrees.length) {
    throw new Error(`Invalid state tree index: ${index}. Must be 0-4.`);
  }
  return DEVNET_LIGHT_TREES.stateTrees[index];
}

/**
 * Light Protocol V2 batch tree accounts for mainnet
 * Note: Update these with mainnet addresses when available
 */
export const MAINNET_LIGHT_TREES = {
  addressTree: new PublicKey('amt2kaJA14v3urZbZvnc5v2np8jqvc4Z8zDep5wbtzx'),
  stateTrees: DEVNET_LIGHT_TREES.stateTrees,
};

/**
 * Scanned note with spent status
 */
export interface ScannedNote extends DecryptedNote {
  /** Whether this note has been spent */
  spent: boolean;
  /** Nullifier for this note (derived from nullifier key) */
  nullifier: Uint8Array;
}

/**
 * Scanned position note with spent status
 */
export interface ScannedPositionNote extends PositionNote {
  /** Whether this position has been closed */
  spent: boolean;
  /** Nullifier for this position */
  nullifier: Uint8Array;
  /** Commitment hash */
  commitment: Uint8Array;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Pool this position belongs to */
  pool: PublicKey;
  /** Account hash for merkle proof */
  accountHash: string;
  /** Stealth ephemeral pubkey for key derivation */
  stealthEphemeralPubkey?: Point;
}

/**
 * Scanned LP note with spent status
 */
export interface ScannedLpNote extends LpNote {
  /** Whether this LP position has been spent */
  spent: boolean;
  /** Nullifier for this LP position */
  nullifier: Uint8Array;
  /** Commitment hash */
  commitment: Uint8Array;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Pool this LP belongs to */
  pool: PublicKey;
  /** Account hash for merkle proof */
  accountHash: string;
  /** Stealth ephemeral pubkey for key derivation */
  stealthEphemeralPubkey?: Point;
}

/**
 * Commitment merkle proof from Helius
 */
export interface CommitmentMerkleProof {
  /** Merkle root */
  root: Uint8Array;
  /** Path elements (siblings) */
  pathElements: Uint8Array[];
  /** Path indices (0 = left, 1 = right) */
  pathIndices: number[];
  /** Leaf index in tree */
  leafIndex: number;
}

/**
 * Scanner statistics for performance tracking
 */
export interface ScannerStats {
  totalAccounts: number;
  cachedHits: number;
  decryptAttempts: number;
  successfulDecrypts: number;
  scanDurationMs: number;
  rpcCalls: number;
}

/**
 * Incremental scan options
 */
export interface IncrementalScanOptions {
  /** Only scan accounts created after this slot */
  sinceSlot?: number;
  /** Maximum accounts to process per scan (for pagination) */
  maxAccounts?: number;
  /** Parallel decryption batch size (default: 10) */
  parallelBatchSize?: number;
}

/**
 * Extended Light client with commitment operations
 */
export class LightCommitmentClient extends LightClient {
  // Cache for decrypted notes - keyed by viewing key hash
  private noteCache: Map<string, Map<string, DecryptedNote | null>> = new Map();

  // Track highest slot seen for incremental scanning
  private lastScannedSlot: Map<string, number> = new Map(); // pool -> slot

  // Scanner statistics (reset each scan)
  private stats: ScannerStats = {
    totalAccounts: 0,
    cachedHits: 0,
    decryptAttempts: 0,
    successfulDecrypts: 0,
    scanDurationMs: 0,
    rpcCalls: 0,
  };

  /**
   * Get scanner statistics from last scan
   */
  getLastScanStats(): ScannerStats {
    return { ...this.stats };
  }

  /**
   * Get the last scanned slot for a pool (for incremental scanning)
   */
  getLastScannedSlot(pool?: PublicKey): number {
    const key = pool?.toBase58() ?? 'all';
    return this.lastScannedSlot.get(key) ?? 0;
  }

  /**
   * Set the last scanned slot (for restoring from persistent storage)
   */
  setLastScannedSlot(slot: number, pool?: PublicKey): void {
    const key = pool?.toBase58() ?? 'all';
    this.lastScannedSlot.set(key, slot);
  }

  /**
   * Clear note cache (call when wallet changes)
   */
  clearCache(): void {
    this.noteCache.clear();
    this.lastScannedSlot.clear();
  }

  /**
   * Export cache state for persistent storage
   */
  exportCacheState(): { notes: Record<string, Record<string, any>>; slots: Record<string, number> } {
    const notes: Record<string, Record<string, any>> = {};
    for (const [viewKey, cache] of this.noteCache.entries()) {
      notes[viewKey] = {};
      for (const [hash, note] of cache.entries()) {
        if (note) {
          // Serialize note (convert Uint8Array to hex, PublicKey to base58)
          notes[viewKey][hash] = {
            ...note,
            commitment: Buffer.from(note.commitment).toString('hex'),
            pool: note.pool.toBase58(),
            tokenMint: note.tokenMint.toBase58(),
            stealthPubX: Buffer.from(note.stealthPubX).toString('hex'),
            randomness: Buffer.from(note.randomness).toString('hex'),
            amount: note.amount.toString(), // BigInt to string
          };
        }
      }
    }
    const slots: Record<string, number> = {};
    for (const [key, slot] of this.lastScannedSlot.entries()) {
      slots[key] = slot;
    }
    return { notes, slots };
  }

  /**
   * Import cache state from persistent storage
   */
  importCacheState(state: { notes: Record<string, Record<string, any>>; slots: Record<string, number> }): void {
    // Import slots
    for (const [key, slot] of Object.entries(state.slots)) {
      this.lastScannedSlot.set(key, slot);
    }
    // Import notes (deserialize)
    for (const [viewKey, cache] of Object.entries(state.notes)) {
      if (!this.noteCache.has(viewKey)) {
        this.noteCache.set(viewKey, new Map());
      }
      const noteMap = this.noteCache.get(viewKey)!;
      for (const [hash, noteData] of Object.entries(cache)) {
        if (noteData) {
          noteMap.set(hash, {
            ...noteData,
            commitment: new Uint8Array(Buffer.from(noteData.commitment, 'hex')),
            pool: new PublicKey(noteData.pool),
            tokenMint: new PublicKey(noteData.tokenMint),
            stealthPubX: new Uint8Array(Buffer.from(noteData.stealthPubX, 'hex')),
            randomness: new Uint8Array(Buffer.from(noteData.randomness, 'hex')),
            amount: BigInt(noteData.amount),
          });
        }
      }
    }
  }

  /**
   * Get cache key from viewing key
   */
  private getCacheKey(viewingKey: bigint): string {
    return viewingKey.toString(16).slice(0, 16);
  }

  /**
   * Reset scanner stats
   */
  private resetStats(): void {
    this.stats = {
      totalAccounts: 0,
      cachedHits: 0,
      decryptAttempts: 0,
      successfulDecrypts: 0,
      scanDurationMs: 0,
      rpcCalls: 0,
    };
  }

  /**
   * Get commitment by its address
   */
  async getCommitment(
    pool: PublicKey,
    commitment: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey
  ): Promise<CompressedAccountInfo | null> {
    const address = this.deriveCommitmentAddress(pool, commitment, programId, addressTree);
    return this.getCompressedAccount(address);
  }

  /**
   * Check if a commitment exists in the tree
   */
  async commitmentExists(
    pool: PublicKey,
    commitment: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey
  ): Promise<boolean> {
    const account = await this.getCommitment(pool, commitment, programId, addressTree);
    return account !== null;
  }

  /**
   * Get merkle proof for a commitment using account hash
   *
   * This is the preferred method - uses the hash stored during scanning.
   * Uses Light SDK for proper API handling.
   */
  async getMerkleProofByHash(accountHash: string): Promise<CommitmentMerkleProof> {

    // Convert base58 hash to BN254 for SDK
    const hashBytes = new PublicKey(accountHash).toBytes();
    const hashBn = bn(hashBytes);

    // Use Light SDK's proper method
    const proofResult = await this.lightRpc.getCompressedAccountProof(hashBn);

    // Convert proof to our format
    const pathElements = proofResult.merkleProof.map((p: any) => {
      // Handle both BN and Uint8Array formats
      if (p.toArray) {
        return new Uint8Array(p.toArray('be', 32));
      }
      return new Uint8Array(p);
    });

    const pathIndices = this.leafIndexToPathIndices(proofResult.leafIndex, pathElements.length);

    // Convert root
    let rootBytes: Uint8Array;
    if (proofResult.root.toArray) {
      rootBytes = new Uint8Array(proofResult.root.toArray('be', 32));
    } else if (proofResult.root instanceof Uint8Array) {
      rootBytes = proofResult.root;
    } else if (Array.isArray(proofResult.root)) {
      rootBytes = new Uint8Array(proofResult.root);
    } else {
      rootBytes = new Uint8Array(32);
    }

    return {
      root: rootBytes,
      pathElements,
      pathIndices,
      leafIndex: proofResult.leafIndex,
    };
  }

  /**
   * Get merkle proof for a commitment (legacy - derives address)
   *
   * Prefer getMerkleProofByHash if you have the account hash from scanning.
   */
  async getCommitmentMerkleProof(
    pool: PublicKey,
    commitment: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey,
    _stateMerkleTree: PublicKey
  ): Promise<CommitmentMerkleProof> {
    // Derive commitment address and fetch account to get hash
    const address = this.deriveCommitmentAddress(pool, commitment, programId, addressTree);
    const addressBase58 = new PublicKey(address).toBase58();

    const account = await this.getCompressedAccount(address);
    if (!account) {
      throw new Error(`Commitment account not found at address: ${addressBase58}`);
    }

    // Use the hash-based method
    return this.getMerkleProofByHash(account.hash);
  }

  /**
   * Prepare Light params for shield instruction
   */
  async prepareShieldParams(params: {
    commitment: Uint8Array;
    pool: PublicKey;
    programId: PublicKey;
    addressMerkleTree: PublicKey;
    stateMerkleTree: PublicKey;
    addressMerkleTreeAccountIndex: number;
    addressQueueAccountIndex: number;
    outputTreeIndex: number;
  }): Promise<LightNullifierParams> {
    // For shield, we need to create a new commitment (non-inclusion proof)
    const address = this.deriveCommitmentAddress(
      params.pool,
      params.commitment,
      params.programId,
      params.addressMerkleTree
    );

    const validityProof = await this.getValidityProof({
      newAddresses: [address],
      addressMerkleTree: params.addressMerkleTree,
      stateMerkleTree: params.stateMerkleTree,
    });

    return {
      validityProof,
      addressTreeInfo: {
        addressMerkleTreeAccountIndex: params.addressMerkleTreeAccountIndex,
        addressQueueAccountIndex: params.addressQueueAccountIndex,
      },
      outputTreeIndex: params.outputTreeIndex,
    };
  }

  /**
   * Derive commitment compressed account address
   *
   * Uses Light Protocol's address derivation (same as nullifier).
   * Seeds: ["commitment", pool, commitment_hash]
   */
  deriveCommitmentAddress(
    pool: PublicKey,
    commitment: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey
  ): Uint8Array {
    // Use Light Protocol's address derivation (same as nullifier)
    // Seeds must match on-chain: ["commitment", pool, commitment_hash]
    const seeds = [
      Buffer.from('commitment'),
      pool.toBuffer(),
      Buffer.from(commitment),
    ];

    const seed = deriveAddressSeedV2(seeds);
    const address = deriveAddressV2(seed, addressTree, programId);

    return address.toBytes();
  }

  /**
   * Convert leaf index to path indices (bit representation)
   */
  private leafIndexToPathIndices(leafIndex: number, depth: number): number[] {
    const indices: number[] = [];
    let idx = leafIndex;
    for (let i = 0; i < depth; i++) {
      indices.push(idx & 1);
      idx >>= 1;
    }
    return indices;
  }

  // =========================================================================
  // Note Scanner
  // =========================================================================

  /**
   * Scan for notes belonging to a user and check spent status
   *
   * Queries all commitment accounts, decrypts with viewing key,
   * then checks nullifier status for each note.
   *
   * @param viewingKey - User's viewing private key (for decryption)
   * @param nullifierKey - User's nullifier key (for deriving nullifiers)
   * @param programId - CloakCraft program ID
   * @param pool - Pool to scan (optional, scans all if not provided)
   * @returns Array of notes with spent status
   */
  async scanNotesWithStatus(
    viewingKey: bigint,
    nullifierKey: Uint8Array,
    programId: PublicKey,
    pool?: PublicKey
  ): Promise<ScannedNote[]> {
    // Initialize Poseidon (required for nullifier computation)
    await initPoseidon();

    // First scan for notes
    const notes = await this.scanNotes(viewingKey, programId, pool);

    if (notes.length === 0) {
      return [];
    }

    // Derive all nullifiers first (CPU-bound, fast)
    const addressTree = DEVNET_LIGHT_TREES.addressTree;
    const nullifierData: Array<{ note: DecryptedNote; nullifier: Uint8Array; address: Uint8Array }> = [];

    for (const note of notes) {
      // Derive stealth spending key if ephemeral pubkey exists
      let effectiveNullifierKey = nullifierKey;
      if (note.stealthEphemeralPubkey) {
        const stealthSpendingKey = deriveStealthPrivateKey(viewingKey, note.stealthEphemeralPubkey);
        effectiveNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
      }

      const nullifier = deriveSpendingNullifier(
        effectiveNullifierKey,
        note.commitment,
        note.leafIndex
      );

      const address = this.deriveNullifierAddress(nullifier, programId, addressTree, note.pool);
      const addressStr = new PublicKey(address).toBase58();
      nullifierData.push({ note, nullifier, address });
    }

    // Batch check all nullifiers in one API call
    const addresses = nullifierData.map(d => new PublicKey(d.address).toBase58());
    const spentSet = await this.batchCheckNullifiers(addresses);

    // Build results
    return nullifierData.map(({ note, nullifier, address }) => {
      const addressStr = new PublicKey(address).toBase58();
      const isSpent = spentSet.has(addressStr);
      return {
        ...note,
        spent: isSpent,
        nullifier,
      };
    });
  }

  /**
   * Get only unspent notes (available balance)
   */
  async getUnspentNotes(
    viewingKey: bigint,
    nullifierKey: Uint8Array,
    programId: PublicKey,
    pool?: PublicKey
  ): Promise<DecryptedNote[]> {
    const notes = await this.scanNotesWithStatus(viewingKey, nullifierKey, programId, pool);
    return notes.filter(n => !n.spent);
  }

  /**
   * Calculate total balance from unspent notes
   */
  async getBalance(
    viewingKey: bigint,
    nullifierKey: Uint8Array,
    programId: PublicKey,
    pool?: PublicKey
  ): Promise<bigint> {
    const unspent = await this.getUnspentNotes(viewingKey, nullifierKey, programId, pool);
    return unspent.reduce((sum, note) => sum + note.amount, 0n);
  }

  /**
   * Scan for notes belonging to a user
   *
   * Queries all commitment accounts for a pool and attempts to decrypt
   * the encrypted notes with the user's viewing key.
   *
   * OPTIMIZED: Uses parallel decryption with configurable batch size.
   *
   * @param viewingKey - User's viewing private key (for decryption)
   * @param programId - CloakCraft program ID
   * @param pool - Pool to scan (optional, scans all if not provided)
   * @param options - Incremental scan options
   * @returns Array of decrypted notes owned by the user
   */
  async scanNotes(
    viewingKey: bigint,
    programId: PublicKey,
    pool?: PublicKey,
    options?: IncrementalScanOptions
  ): Promise<DecryptedNote[]> {
    const startTime = performance.now();
    this.resetStats();

    // Query commitment accounts from Helius
    this.stats.rpcCalls++;
    const accounts = await this.getCommitmentAccounts(programId, pool);
    this.stats.totalAccounts = accounts.length;

    // Get or create cache for this viewing key
    const cacheKey = this.getCacheKey(viewingKey);
    if (!this.noteCache.has(cacheKey)) {
      this.noteCache.set(cacheKey, new Map());
    }
    const cache = this.noteCache.get(cacheKey)!;

    // Commitment account discriminator
    // Note: JavaScript loses precision for large integers, so we use approximate match
    // Actual value: 15491678376909512437, JS sees: ~15491678376909513000
    const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513000;

    const decryptedNotes: DecryptedNote[] = [];
    const accountsToProcess: CompressedAccountInfo[] = [];
    let highestSlot = options?.sinceSlot ?? 0;

    // First pass: filter accounts and check cache
    for (const account of accounts) {
      if (!account.data?.data) {
        continue;
      }

      // Track highest slot for incremental scanning
      const accountSlot = (account as any).slotCreated || 0;
      if (accountSlot > highestSlot) {
        highestSlot = accountSlot;
      }

      // Skip if before our scan window (incremental scanning)
      if (options?.sinceSlot && accountSlot <= options.sinceSlot) {
        // But still return cached notes
        if (cache.has(account.hash)) {
          const cachedNote = cache.get(account.hash);
          if (cachedNote) {
            this.stats.cachedHits++;
            decryptedNotes.push(cachedNote);
          }
        }
        continue;
      }

      // Check cache first - skip expensive decryption if already processed
      if (cache.has(account.hash)) {
        const cachedNote = cache.get(account.hash);
        if (cachedNote) {
          this.stats.cachedHits++;
          decryptedNotes.push(cachedNote);
        }
        continue;
      }

      // Filter by commitment discriminator (approximate match due to JS number precision)
      const disc = account.data.discriminator;
      if (!disc || Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) > 1000) {
        cache.set(account.hash, null); // Cache as not-ours
        continue;
      }

      // Skip accounts with truncated data (must be full CommitmentAccount struct)
      // Use atob for browser compatibility (Buffer.from doesn't work in browsers)
      // Layout: pool(32) + commitment(32) + leaf_index(8) + stealth_ephemeral(64) + encrypted_note(250) + len(2) + created_at(8) = 396
      const dataLen = atob(account.data.data).length;
      if (dataLen < 396) {
        cache.set(account.hash, null); // Cache as not-ours
        continue;
      }

      accountsToProcess.push(account);

      // Respect maxAccounts limit
      if (options?.maxAccounts && accountsToProcess.length >= options.maxAccounts) {
        break;
      }
    }

    // OPTIMIZATION: Parallel decryption in batches
    const batchSize = options?.parallelBatchSize ?? 10;
    for (let i = 0; i < accountsToProcess.length; i += batchSize) {
      const batch = accountsToProcess.slice(i, i + batchSize);

      const results = await Promise.all(
        batch.map(account => this.processAccount(account, viewingKey, cache))
      );

      for (const result of results) {
        this.stats.decryptAttempts++;
        if (result) {
          this.stats.successfulDecrypts++;
          decryptedNotes.push(result);
        }
      }
    }

    // Update last scanned slot for incremental scanning
    const poolKey = pool?.toBase58() ?? 'all';
    this.lastScannedSlot.set(poolKey, highestSlot);

    this.stats.scanDurationMs = performance.now() - startTime;
    return decryptedNotes;
  }

  /**
   * Process a single account for decryption (extracted for parallelization)
   */
  private async processAccount(
    account: CompressedAccountInfo,
    viewingKey: bigint,
    cache: Map<string, DecryptedNote | null>
  ): Promise<DecryptedNote | null> {
    try {
      // Parse commitment account data (discriminator already filtered above)
      const parsed = this.parseCommitmentAccountData(account.data!.data);
      if (!parsed) {
        cache.set(account.hash, null);
        return null;
      }

      // Deserialize encrypted note
      const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
      if (!encryptedNote) {
        cache.set(account.hash, null);
        return null;
      }

      // Derive decryption key:
      // - If stealthEphemeralPubkey is present, derive stealthPrivateKey from it
      // - Otherwise (internal ops), use the original viewing key
      let decryptionKey: bigint;
      if (parsed.stealthEphemeralPubkey) {
        // Derive: stealthPrivateKey = spendingKey + H(spendingKey * ephemeralPubkey)
        decryptionKey = deriveStealthPrivateKey(viewingKey, parsed.stealthEphemeralPubkey);
      } else {
        // Internal operation (swap/remove_liquidity) - use original key
        decryptionKey = viewingKey;
      }

      // Try to decrypt with universal decryption (handles all note types)
      const decryptResult = tryDecryptAnyNote(encryptedNote, decryptionKey);

      if (!decryptResult) {
        cache.set(account.hash, null); // Not our note
        return null;
      }

      // Verify decryption was correct by recomputing commitment based on note type
      let recomputed: Uint8Array;
      let noteAmount: bigint;

      if (decryptResult.type === 'standard') {
        recomputed = computeCommitment(decryptResult.note);
        noteAmount = decryptResult.note.amount;
      } else if (decryptResult.type === 'position') {
        recomputed = computePositionCommitment(decryptResult.note);
        noteAmount = decryptResult.note.margin; // Use margin as the "amount" for positions
      } else if (decryptResult.type === 'lp') {
        recomputed = computeLpCommitment(decryptResult.note);
        noteAmount = decryptResult.note.lpAmount;
      } else {
        cache.set(account.hash, null);
        return null;
      }

      const matches = Buffer.from(recomputed).toString('hex') === Buffer.from(parsed.commitment).toString('hex');
      if (!matches) {
        // Invalid decryption - commitment mismatch
        cache.set(account.hash, null);
        return null;
      }

      // Skip 0-amount notes (change outputs with no value)
      if (noteAmount === 0n) {
        cache.set(account.hash, null);
        return null;
      }

      // For non-standard note types, we skip them in this method
      // (scanNotes only returns standard token notes for backwards compatibility)
      // Use scanPositionNotes or scanLpNotes for perps notes
      if (decryptResult.type !== 'standard') {
        cache.set(account.hash, null);
        return null;
      }

      const note = decryptResult.note;

      // Successfully decrypted - this note belongs to user
      const decryptedNote: DecryptedNote = {
        ...note,
        commitment: parsed.commitment,
        leafIndex: parsed.leafIndex,
        pool: new PublicKey(parsed.pool),
        accountHash: account.hash, // Store for merkle proof fetching
        stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? undefined, // Store for stealth key derivation
      };

      cache.set(account.hash, decryptedNote); // Cache our note
      return decryptedNote;
    } catch (err) {
      // Failed to parse or decrypt - cache as not-ours
      cache.set(account.hash, null);
      return null;
    }
  }

  /**
   * Get all commitment compressed accounts
   *
   * Includes automatic retry with exponential backoff on rate limits.
   *
   * @param programId - CloakCraft program ID
   * @param poolPda - Pool PDA to filter by (optional). Note: pass the pool PDA, not the token mint.
   */
  async getCommitmentAccounts(
    programId: PublicKey,
    poolPda?: PublicKey
  ): Promise<CompressedAccountInfo[]> {
    // Query all compressed accounts owned by the program
    // Note: Helius returns discriminator separately, so pool is at offset 0 in data
    console.log(`[getCommitmentAccounts] Querying with pool filter: ${poolPda?.toBase58() ?? 'none'}`);

    const response = await fetchWithRetry(
      this['rpcUrl'],
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getCompressedAccountsByOwner',
          params: {
            owner: programId.toBase58(),
            // Pool is first 32 bytes of data (Helius provides discriminator separately)
            filters: poolPda ? [
              { memcmp: { offset: 0, bytes: poolPda.toBase58() } }
            ] : undefined,
          },
        }),
      },
      this.retryConfig,
      'getCompressedAccountsByOwner'
    );

    const result = await response.json() as {
      result: { value?: { items: CompressedAccountInfo[] }; items?: CompressedAccountInfo[] };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }

    // Helius returns items in result.value.items or result.items depending on version
    const items = result.result?.value?.items ?? result.result?.items ?? [];
    console.log(`[getCommitmentAccounts] Helius returned ${items.length} accounts`);

    // Debug: If filtering by pool and no results, try without filter to see total accounts
    if (poolPda && items.length === 0) {
      const debugResponse = await fetchWithRetry(
        this['rpcUrl'],
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getCompressedAccountsByOwner',
            params: { owner: programId.toBase58() },
          }),
        },
        this.retryConfig,
        'getCompressedAccountsByOwner (debug)'
      );
      const debugResult = await debugResponse.json() as any;
      const totalItems = debugResult.result?.value?.items ?? debugResult.result?.items ?? [];
      console.log(`[getCommitmentAccounts] DEBUG: Total accounts without filter: ${totalItems.length}`);

      // Show first few pools to see what's stored
      if (totalItems.length > 0) {
        console.log(`[getCommitmentAccounts] DEBUG: First 3 account pools:`);
        for (let i = 0; i < Math.min(3, totalItems.length); i++) {
          const item = totalItems[i];
          if (item.data?.data) {
            try {
              const dataBytes = Uint8Array.from(atob(item.data.data), c => c.charCodeAt(0));
              if (dataBytes.length >= 32) {
                const storedPool = new PublicKey(dataBytes.slice(0, 32));
                console.log(`  [${i}] Pool: ${storedPool.toBase58()}`);
              }
            } catch (e) {
              console.log(`  [${i}] Failed to parse pool`);
            }
          }
        }
      }
    }

    return items;
  }

  /**
   * Parse commitment account data from base64
   *
   * Note: Helius returns discriminator separately, so data doesn't include it
   * Layout (after discriminator) - matches CommitmentAccount struct:
   * - pool: 32 bytes
   * - commitment: 32 bytes
   * - leaf_index: 8 bytes (u64)
   * - stealth_ephemeral_pubkey: 64 bytes (X + Y coordinates)
   * - encrypted_note: 200 bytes (FIXED SIZE array)
   * - encrypted_note_len: 2 bytes (u16) - actual length of data in encrypted_note
   * - created_at: 8 bytes (i64)
   *
   * Total: 32 + 32 + 8 + 64 + 200 + 2 + 8 = 346 bytes
   */
  private parseCommitmentAccountData(dataBase64: string): {
    pool: Uint8Array;
    commitment: Uint8Array;
    leafIndex: number;
    stealthEphemeralPubkey: Point | null;
    encryptedNote: Uint8Array;
  } | null {
    try {
      // Decode base64 to Uint8Array (works in browser and Node.js)
      const binaryString = atob(dataBase64);
      const data = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        data[i] = binaryString.charCodeAt(i);
      }

      // Helius provides discriminator separately, so data starts directly with pool
      // Account size: 32 + 32 + 8 + 64 + 250 + 2 + 8 = 396 bytes
      const MIN_SIZE = 396;
      const MAX_NOTE_SIZE = 250;

      if (data.length < MIN_SIZE) {
        console.log(`[parseCommitmentAccountData] Data too short: ${data.length} < ${MIN_SIZE}`);
        return null;
      }

      // Pool (32 bytes) - offset 0
      const pool = data.slice(0, 32);

      // Commitment (32 bytes) - offset 32
      const commitment = data.slice(32, 64);

      // Use DataView for reading multi-byte integers (works in browser)
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

      // Leaf index (8 bytes u64 LE) - offset 64
      const leafIndex = Number(view.getBigUint64(64, true));

      // Stealth ephemeral pubkey (64 bytes: X + Y) - offset 72
      const ephemeralX = data.slice(72, 104);
      const ephemeralY = data.slice(104, 136);

      // Check if ephemeral pubkey is non-zero (internal ops have all zeros)
      const isNonZero = ephemeralX.some(b => b !== 0) || ephemeralY.some(b => b !== 0);
      const stealthEphemeralPubkey: Point | null = isNonZero
        ? { x: new Uint8Array(ephemeralX), y: new Uint8Array(ephemeralY) }
        : null;

      // encrypted_note: 250 bytes FIXED - offset 136
      // encrypted_note_len: 2 bytes (u16 LE) - offset 386
      const encryptedNoteLen = view.getUint16(386, true);

      if (encryptedNoteLen > MAX_NOTE_SIZE) {
        console.log(`[parseCommitmentAccountData] Invalid note length: ${encryptedNoteLen} > ${MAX_NOTE_SIZE}`);
        return null;
      }

      // Get the actual encrypted note data
      const encryptedNote = data.slice(136, 136 + encryptedNoteLen);

      return {
        pool: new Uint8Array(pool),
        commitment: new Uint8Array(commitment),
        leafIndex,
        stealthEphemeralPubkey,
        encryptedNote: new Uint8Array(encryptedNote),
      };
    } catch (err) {
      return null;
    }
  }

  /**
   * Deserialize encrypted note from bytes
   *
   * Format:
   * - ephemeral_pubkey_x: 32 bytes
   * - ephemeral_pubkey_y: 32 bytes
   * - ciphertext_len: 4 bytes (u32 LE)
   * - ciphertext: variable (includes 12-byte nonce)
   * - tag: 16 bytes
   */
  private deserializeEncryptedNote(data: Uint8Array): EncryptedNote | null {
    try {
      if (data.length < 32 + 32 + 4 + 16) {
        return null;
      }

      let offset = 0;

      // Ephemeral pubkey X (32 bytes)
      const ephemeralX = data.slice(offset, offset + 32);
      offset += 32;

      // Ephemeral pubkey Y (32 bytes)
      const ephemeralY = data.slice(offset, offset + 32);
      offset += 32;

      // Ciphertext length (4 bytes)
      const ciphertextLen = new DataView(data.buffer, data.byteOffset + offset).getUint32(0, true);
      offset += 4;

      // Ciphertext (variable)
      const ciphertext = data.slice(offset, offset + ciphertextLen);
      offset += ciphertextLen;

      // Tag (16 bytes)
      const tag = data.slice(offset, offset + 16);

      const ephemeralPubkey: Point = {
        x: new Uint8Array(ephemeralX),
        y: new Uint8Array(ephemeralY),
      };

      return {
        ephemeralPubkey,
        ciphertext: new Uint8Array(ciphertext),
        tag: new Uint8Array(tag),
      };
    } catch {
      return null;
    }
  }

  // =========================================================================
  // Position Note Scanner (Perps)
  // =========================================================================

  /**
   * Scan for position notes belonging to a user
   *
   * Similar to scanNotes but specifically for perps position commitments.
   * Uses the position commitment formula for verification.
   *
   * @param viewingKey - User's viewing private key (for decryption)
   * @param programId - CloakCraft program ID
   * @param positionPool - Position pool to scan
   * @returns Array of decrypted position notes owned by the user
   */
  async scanPositionNotes(
    viewingKey: bigint,
    programId: PublicKey,
    positionPool: PublicKey
  ): Promise<ScannedPositionNote[]> {
    // Initialize Poseidon
    await initPoseidon();

    // Query commitment accounts from Helius
    const accounts = await this.getCommitmentAccounts(programId, positionPool);
    console.log(`[scanPositionNotes] Found ${accounts.length} accounts in position pool`);

    const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513000;
    const positionNotes: ScannedPositionNote[] = [];

    for (const account of accounts) {
      if (!account.data?.data) {
        continue;
      }

      // Filter by commitment discriminator
      const disc = account.data.discriminator;
      if (!disc || Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) > 1000) {
        continue;
      }

      // Check data length
      const dataLen = atob(account.data.data).length;
      if (dataLen < 346) {
        continue;
      }

      try {
        // Parse commitment account data
        const parsed = this.parseCommitmentAccountData(account.data.data);
        if (!parsed) continue;

        // Deserialize encrypted note
        const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
        if (!encryptedNote) continue;

        // Derive decryption key
        let decryptionKey: bigint;
        if (parsed.stealthEphemeralPubkey) {
          decryptionKey = deriveStealthPrivateKey(viewingKey, parsed.stealthEphemeralPubkey);
        } else {
          decryptionKey = viewingKey;
        }

        // Try to decrypt
        const decryptResult = tryDecryptAnyNote(encryptedNote, decryptionKey);
        if (!decryptResult || decryptResult.type !== 'position') {
          continue;
        }

        // Verify commitment
        const recomputed = computePositionCommitment(decryptResult.note);
        const matches = Buffer.from(recomputed).toString('hex') === Buffer.from(parsed.commitment).toString('hex');
        if (!matches) {
          console.log(`[scanPositionNotes] Commitment mismatch for account ${account.hash.slice(0, 8)}...`);
          console.log(`  Stored commitment:    ${Buffer.from(parsed.commitment).toString('hex')}`);
          console.log(`  Recomputed commitment: ${Buffer.from(recomputed).toString('hex')}`);
          console.log(`  Note fields:`);
          console.log(`    stealthPubX: ${Buffer.from(decryptResult.note.stealthPubX).toString('hex').slice(0, 16)}...`);
          console.log(`    marketId: ${Buffer.from(decryptResult.note.marketId).toString('hex')}`);
          console.log(`    isLong: ${decryptResult.note.isLong}`);
          console.log(`    margin: ${decryptResult.note.margin}`);
          console.log(`    size: ${decryptResult.note.size}`);
          console.log(`    leverage: ${decryptResult.note.leverage}`);
          console.log(`    entryPrice: ${decryptResult.note.entryPrice}`);
          console.log(`    randomness: ${Buffer.from(decryptResult.note.randomness).toString('hex').slice(0, 16)}...`);
          continue;
        }

        // Skip 0-margin positions
        if (decryptResult.note.margin === 0n) {
          continue;
        }

        console.log(`[scanPositionNotes] FOUND valid position: margin=${decryptResult.note.margin}, size=${decryptResult.note.size}`);

        // Build scanned position note (without spent status - that requires nullifier check)
        const scannedNote: ScannedPositionNote = {
          ...decryptResult.note,
          spent: false, // Will be set by scanPositionNotesWithStatus
          nullifier: new Uint8Array(32), // Will be computed by scanPositionNotesWithStatus
          commitment: parsed.commitment,
          leafIndex: parsed.leafIndex,
          pool: positionPool,
          accountHash: account.hash,
          stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? undefined,
        };

        positionNotes.push(scannedNote);
      } catch {
        continue;
      }
    }

    return positionNotes;
  }

  /**
   * Scan for position notes with spent status
   */
  async scanPositionNotesWithStatus(
    viewingKey: bigint,
    nullifierKey: Uint8Array,
    programId: PublicKey,
    positionPool: PublicKey
  ): Promise<ScannedPositionNote[]> {
    const notes = await this.scanPositionNotes(viewingKey, programId, positionPool);

    if (notes.length === 0) {
      return [];
    }

    // Derive nullifiers and check spent status
    const addressTree = DEVNET_LIGHT_TREES.addressTree;
    const nullifierData: Array<{ note: ScannedPositionNote; nullifier: Uint8Array; address: Uint8Array }> = [];

    for (const note of notes) {
      // Derive stealth spending key if ephemeral pubkey exists
      let effectiveNullifierKey = nullifierKey;
      if (note.stealthEphemeralPubkey) {
        const stealthSpendingKey = deriveStealthPrivateKey(viewingKey, note.stealthEphemeralPubkey);
        effectiveNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
      }

      const nullifier = deriveSpendingNullifier(
        effectiveNullifierKey,
        note.commitment,
        note.leafIndex
      );

      const address = this.deriveNullifierAddress(nullifier, programId, addressTree, note.pool);
      nullifierData.push({ note, nullifier, address });
    }

    // Batch check nullifiers
    const addresses = nullifierData.map(d => new PublicKey(d.address).toBase58());
    const spentSet = await this.batchCheckNullifiers(addresses);

    // Build results with spent status
    return nullifierData.map(({ note, nullifier, address }) => {
      const addressStr = new PublicKey(address).toBase58();
      return {
        ...note,
        spent: spentSet.has(addressStr),
        nullifier,
      };
    });
  }

  /**
   * Get unspent position notes
   */
  async getUnspentPositionNotes(
    viewingKey: bigint,
    nullifierKey: Uint8Array,
    programId: PublicKey,
    positionPool: PublicKey
  ): Promise<ScannedPositionNote[]> {
    const notes = await this.scanPositionNotesWithStatus(viewingKey, nullifierKey, programId, positionPool);
    return notes.filter(n => !n.spent);
  }

  // =========================================================================
  // LP Note Scanner (Perps)
  // =========================================================================

  /**
   * Scan for LP notes belonging to a user
   *
   * Similar to scanNotes but specifically for perps LP commitments.
   * Uses the LP commitment formula for verification.
   *
   * @param viewingKey - User's viewing private key (for decryption)
   * @param programId - CloakCraft program ID
   * @param lpPool - LP pool to scan
   * @returns Array of decrypted LP notes owned by the user
   */
  async scanLpNotes(
    viewingKey: bigint,
    programId: PublicKey,
    lpPool: PublicKey
  ): Promise<ScannedLpNote[]> {
    // Initialize Poseidon
    await initPoseidon();

    // Query commitment accounts from Helius
    const accounts = await this.getCommitmentAccounts(programId, lpPool);
    console.log(`[scanLpNotes] Found ${accounts.length} accounts in LP pool`);

    const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513000;
    const lpNotes: ScannedLpNote[] = [];

    for (const account of accounts) {
      if (!account.data?.data) {
        continue;
      }

      // Filter by commitment discriminator
      const disc = account.data.discriminator;
      if (!disc || Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) > 1000) {
        continue;
      }

      // Check data length
      const dataLen = atob(account.data.data).length;
      if (dataLen < 346) {
        continue;
      }

      try {
        // Parse commitment account data
        const parsed = this.parseCommitmentAccountData(account.data.data);
        if (!parsed) continue;

        // Deserialize encrypted note
        const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
        if (!encryptedNote) continue;

        // Derive decryption key
        let decryptionKey: bigint;
        if (parsed.stealthEphemeralPubkey) {
          decryptionKey = deriveStealthPrivateKey(viewingKey, parsed.stealthEphemeralPubkey);
        } else {
          decryptionKey = viewingKey;
        }

        // Try to decrypt
        const decryptResult = tryDecryptAnyNote(encryptedNote, decryptionKey);
        if (!decryptResult || decryptResult.type !== 'lp') {
          continue;
        }

        // Verify commitment
        const recomputed = computeLpCommitment(decryptResult.note);
        const matches = Buffer.from(recomputed).toString('hex') === Buffer.from(parsed.commitment).toString('hex');
        if (!matches) {
          console.log(`[scanLpNotes] Commitment mismatch for account ${account.hash.slice(0, 8)}...`);
          continue;
        }

        // Skip 0-amount LP notes
        if (decryptResult.note.lpAmount === 0n) {
          continue;
        }

        console.log(`[scanLpNotes] FOUND valid LP note: lpAmount=${decryptResult.note.lpAmount}`);

        // Build scanned LP note (without spent status)
        const scannedNote: ScannedLpNote = {
          ...decryptResult.note,
          spent: false,
          nullifier: new Uint8Array(32),
          commitment: parsed.commitment,
          leafIndex: parsed.leafIndex,
          pool: lpPool,
          accountHash: account.hash,
          stealthEphemeralPubkey: parsed.stealthEphemeralPubkey ?? undefined,
        };

        lpNotes.push(scannedNote);
      } catch {
        continue;
      }
    }

    return lpNotes;
  }

  /**
   * Scan for LP notes with spent status
   */
  async scanLpNotesWithStatus(
    viewingKey: bigint,
    nullifierKey: Uint8Array,
    programId: PublicKey,
    lpPool: PublicKey
  ): Promise<ScannedLpNote[]> {
    const notes = await this.scanLpNotes(viewingKey, programId, lpPool);

    if (notes.length === 0) {
      return [];
    }

    // Derive nullifiers and check spent status
    const addressTree = DEVNET_LIGHT_TREES.addressTree;
    const nullifierData: Array<{ note: ScannedLpNote; nullifier: Uint8Array; address: Uint8Array }> = [];

    for (const note of notes) {
      // Derive stealth spending key if ephemeral pubkey exists
      let effectiveNullifierKey = nullifierKey;
      if (note.stealthEphemeralPubkey) {
        const stealthSpendingKey = deriveStealthPrivateKey(viewingKey, note.stealthEphemeralPubkey);
        effectiveNullifierKey = deriveNullifierKey(fieldToBytes(stealthSpendingKey));
      }

      const nullifier = deriveSpendingNullifier(
        effectiveNullifierKey,
        note.commitment,
        note.leafIndex
      );

      const address = this.deriveNullifierAddress(nullifier, programId, addressTree, note.pool);
      nullifierData.push({ note, nullifier, address });
    }

    // Batch check nullifiers
    const addresses = nullifierData.map(d => new PublicKey(d.address).toBase58());
    const spentSet = await this.batchCheckNullifiers(addresses);

    // Build results with spent status
    return nullifierData.map(({ note, nullifier, address }) => {
      const addressStr = new PublicKey(address).toBase58();
      return {
        ...note,
        spent: spentSet.has(addressStr),
        nullifier,
      };
    });
  }

  /**
   * Get unspent LP notes
   */
  async getUnspentLpNotes(
    viewingKey: bigint,
    nullifierKey: Uint8Array,
    programId: PublicKey,
    lpPool: PublicKey
  ): Promise<ScannedLpNote[]> {
    const notes = await this.scanLpNotesWithStatus(viewingKey, nullifierKey, programId, lpPool);
    return notes.filter(n => !n.spent);
  }

  // =========================================================================
  // Position Metadata Operations
  // =========================================================================

  /**
   * Fetch position metadata for given position IDs
   *
   * Queries compressed PositionMeta accounts via Photon API.
   * These accounts are public and enable permissionless liquidation monitoring.
   *
   * @param programId - CloakCraft program ID
   * @param poolId - Pool ID (32 bytes)
   * @param positionIds - Array of position IDs to fetch metadata for
   * @returns Map of position ID (hex) to PositionMeta
   */
  async fetchPositionMetas(
    programId: PublicKey,
    poolId: Uint8Array,
    positionIds: Uint8Array[]
  ): Promise<Map<string, PositionMetaData>> {
    if (positionIds.length === 0) {
      return new Map();
    }

    // Derive addresses for each position_id
    // Seeds: ["position_meta", pool_id, position_id]
    const addressTree = DEVNET_LIGHT_TREES.addressTree;
    const addresses: string[] = [];
    const positionIdMap: Map<string, string> = new Map(); // address -> positionId hex

    for (const positionId of positionIds) {
      const seeds = [
        Buffer.from('position_meta'),
        Buffer.from(poolId),
        Buffer.from(positionId),
      ];

      const seed = deriveAddressSeedV2(seeds);
      const address = deriveAddressV2(
        seed,
        new PublicKey(addressTree),
        programId
      );

      const addressStr = new PublicKey(address).toBase58();
      addresses.push(addressStr);
      positionIdMap.set(addressStr, Buffer.from(positionId).toString('hex'));
    }

    // Batch fetch compressed accounts
    const response = await fetchWithRetry(
      this.rpcUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getMultipleCompressedAccounts',
          params: { addresses },
        }),
      },
      this.retryConfig,
      'fetchPositionMetas'
    );

    const result = await response.json() as {
      result: { value: { items: Array<CompressedAccountInfo | null> } };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }

    const metas = new Map<string, PositionMetaData>();
    const items = result.result?.value?.items ?? [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item || !item.data?.data) continue;

      const positionIdHex = positionIdMap.get(addresses[i]);
      if (!positionIdHex) continue;

      try {
        const meta = this.parsePositionMetaData(item.data.data);
        if (meta) {
          metas.set(positionIdHex, meta);
        }
      } catch {
        // Skip malformed accounts
        continue;
      }
    }

    return metas;
  }

  /**
   * Parse PositionMeta from base64-encoded compressed account data
   */
  private parsePositionMetaData(base64Data: string): PositionMetaData | null {
    try {
      const data = Buffer.from(base64Data, 'base64');

      // PositionMeta layout:
      // position_id: [u8; 32]      offset 0
      // pool_id: [u8; 32]          offset 32
      // market_id: [u8; 32]        offset 64
      // margin_amount: u64         offset 96
      // liquidation_price: u64     offset 104
      // is_long: bool              offset 112
      // position_size: u64         offset 113
      // entry_price: u64           offset 121
      // nullifier_hash: [u8; 32]   offset 129
      // status: u8                 offset 161
      // created_at: i64            offset 162
      // updated_at: i64            offset 170
      // owner_stealth_pubkey: [u8; 32]  offset 178
      // Total: 210 bytes

      if (data.length < 210) {
        return null;
      }

      const positionId = new Uint8Array(data.subarray(0, 32));
      const poolId = new Uint8Array(data.subarray(32, 64));
      const marketId = new Uint8Array(data.subarray(64, 96));
      const marginAmount = data.readBigUInt64LE(96);
      const liquidationPrice = data.readBigUInt64LE(104);
      const isLong = data[112] === 1;
      const positionSize = data.readBigUInt64LE(113);
      const entryPrice = data.readBigUInt64LE(121);
      const nullifierHash = new Uint8Array(data.subarray(129, 161));
      const status = data[161] as 0 | 1 | 2;
      const createdAt = Number(data.readBigInt64LE(162));
      const updatedAt = Number(data.readBigInt64LE(170));
      const ownerStealthPubkey = new Uint8Array(data.subarray(178, 210));

      return {
        positionId,
        poolId,
        marketId,
        marginAmount,
        liquidationPrice,
        isLong,
        positionSize,
        entryPrice,
        nullifierHash,
        status,
        createdAt,
        updatedAt,
        ownerStealthPubkey,
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch all active position metas for a pool
   *
   * Useful for keepers to monitor all positions for liquidation.
   *
   * @param programId - CloakCraft program ID
   * @param poolId - Pool ID to scan
   * @returns Array of active PositionMeta
   */
  async fetchActivePositionMetas(
    programId: PublicKey,
    poolId: Uint8Array
  ): Promise<PositionMetaData[]> {
    // Query all PositionMeta accounts owned by program with pool filter
    const response = await fetchWithRetry(
      this.rpcUrl,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getCompressedAccountsByOwner',
          params: {
            owner: programId.toBase58(),
            filters: [
              // Filter by pool_id at offset 32 (after position_id)
              { memcmp: { offset: 32, bytes: Buffer.from(poolId).toString('base64') } }
            ],
          },
        }),
      },
      this.retryConfig,
      'fetchActivePositionMetas'
    );

    const result = await response.json() as {
      result: { value?: { items: CompressedAccountInfo[] }; items?: CompressedAccountInfo[] };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }

    const items = result.result?.value?.items ?? result.result?.items ?? [];
    const metas: PositionMetaData[] = [];

    for (const item of items) {
      if (!item.data?.data) continue;

      try {
        const meta = this.parsePositionMetaData(item.data.data);
        // Only include active positions
        if (meta && meta.status === 0) {
          metas.push(meta);
        }
      } catch {
        continue;
      }
    }

    return metas;
  }
}

/** Position metadata data structure (matches on-chain PositionMeta) */
export interface PositionMetaData {
  positionId: Uint8Array;
  poolId: Uint8Array;
  marketId: Uint8Array;
  marginAmount: bigint;
  liquidationPrice: bigint;
  isLong: boolean;
  positionSize: bigint;
  entryPrice: bigint;
  nullifierHash: Uint8Array;
  status: 0 | 1 | 2; // Active = 0, Liquidated = 1, Closed = 2
  createdAt: number;
  updatedAt: number;
  ownerStealthPubkey: Uint8Array;
}
