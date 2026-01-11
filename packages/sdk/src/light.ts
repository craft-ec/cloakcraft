/**
 * Light Protocol Integration
 *
 * Handles interaction with Helius Photon indexer for compressed account operations.
 * Used for nullifier and commitment storage via ZK Compression.
 * Includes note scanner for finding user's notes in compressed accounts.
 */

import { PublicKey, AccountMeta } from '@solana/web3.js';
import type { DecryptedNote, EncryptedNote, Point } from '@cloakcraft/types';
import { tryDecryptNote } from './crypto/encryption';
import { deriveSpendingNullifier } from './crypto/nullifier';
import { initPoseidon } from './crypto/poseidon';

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
 */
export class LightClient {
  private readonly rpcUrl: string;

  constructor(config: HeliusConfig) {
    const baseUrl = config.network === 'mainnet-beta'
      ? 'https://mainnet.helius-rpc.com'
      : 'https://devnet.helius-rpc.com';
    this.rpcUrl = `${baseUrl}/?api-key=${config.apiKey}`;
  }

  /**
   * Get compressed account by address
   *
   * Returns null if account doesn't exist (nullifier not spent)
   */
  async getCompressedAccount(address: Uint8Array): Promise<CompressedAccountInfo | null> {
    // Helius expects base58 encoded address (like Solana public keys)
    const addressBase58 = new PublicKey(address).toBase58();

    const response = await fetch(this.rpcUrl, {
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
    });

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
   * Get validity proof for creating a new compressed account
   *
   * This proves that the address doesn't exist yet (non-inclusion proof)
   */
  async getValidityProof(params: {
    /** New address to create (nullifier address) */
    newAddresses: Uint8Array[];
    /** Address merkle tree */
    addressMerkleTree: PublicKey;
    /** State merkle tree for output */
    stateMerkleTree: PublicKey;
  }): Promise<ValidityProof> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getValidityProof',
        params: {
          // Helius expects base58 encoded addresses
          newAddresses: params.newAddresses.map(a => new PublicKey(a).toBase58()),
          addressMerkleTree: params.addressMerkleTree.toBase58(),
          stateMerkleTree: params.stateMerkleTree.toBase58(),
        },
      }),
    });

    const result = await response.json() as {
      result: {
        compressedProof: { a: number[]; b: number[]; c: number[] };
        rootIndices: number[];
        merkleTrees: string[];
      };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
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
    const { deriveAddressSeedV2, deriveAddressV2 } = require('@lightprotocol/stateless.js');

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
 * Extended Light client with commitment operations
 */
export class LightCommitmentClient extends LightClient {
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
   * Get merkle proof for a commitment
   *
   * This fetches the inclusion proof from Helius Photon indexer
   */
  async getCommitmentMerkleProof(
    pool: PublicKey,
    commitment: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey,
    stateMerkleTree: PublicKey
  ): Promise<CommitmentMerkleProof> {
    const address = this.deriveCommitmentAddress(pool, commitment, programId, addressTree);

    // Get validity proof (inclusion proof)
    const response = await fetch(this['rpcUrl'], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getValidityProof',
        params: {
          hashes: [Buffer.from(address).toString('hex')],
          stateMerkleTree: stateMerkleTree.toBase58(),
        },
      }),
    });

    const result = await response.json() as {
      result: {
        root: string;
        proof: string[];
        leafIndex: number;
      };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }

    // Convert proof to path elements and indices
    const pathElements = result.result.proof.map(p => Buffer.from(p, 'hex'));
    const pathIndices = this.leafIndexToPathIndices(result.result.leafIndex, pathElements.length);

    return {
      root: Buffer.from(result.result.root, 'hex'),
      pathElements,
      pathIndices,
      leafIndex: result.result.leafIndex,
    };
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
   */
  deriveCommitmentAddress(
    pool: PublicKey,
    commitment: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey
  ): Uint8Array {
    // Address derivation uses Poseidon hash:
    // address = poseidon(SEED_PREFIX || pool || commitment || address_tree || program_id)
    const { createHash } = require('crypto');
    const hash = createHash('sha256')
      .update(Buffer.from('commitment'))
      .update(pool.toBytes())
      .update(commitment)
      .update(addressTree.toBytes())
      .update(programId.toBytes())
      .digest();

    return new Uint8Array(hash);
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

    // Check spent status for each note
    const addressTree = DEVNET_LIGHT_TREES.addressTree;
    const results: ScannedNote[] = [];

    for (const note of notes) {
      // Derive nullifier from note
      const nullifier = deriveSpendingNullifier(
        nullifierKey,
        note.commitment,
        note.leafIndex
      );

      // Check if nullifier has been spent (uses note.pool for address derivation)
      const spent = await this.isNullifierSpent(nullifier, programId, addressTree, note.pool);

      results.push({
        ...note,
        spent,
        nullifier,
      });
    }

    return results;
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
   * @param viewingKey - User's viewing private key (for decryption)
   * @param programId - CloakCraft program ID
   * @param pool - Pool to scan (optional, scans all if not provided)
   * @returns Array of decrypted notes owned by the user
   */
  async scanNotes(
    viewingKey: bigint,
    programId: PublicKey,
    pool?: PublicKey
  ): Promise<DecryptedNote[]> {
    // Query commitment accounts from Helius
    console.log(`[scanNotes] Scanning for notes. Pool: ${pool?.toBase58() ?? 'all'}`);
    const accounts = await this.getCommitmentAccounts(programId, pool);
    console.log(`[scanNotes] Found ${accounts.length} accounts from Helius`);

    // Commitment account discriminator
    // Note: JavaScript loses precision for large integers, so we use approximate match
    // Actual value: 15491678376909512437, JS sees: ~15491678376909513000
    const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513000;

    const decryptedNotes: DecryptedNote[] = [];

    for (const account of accounts) {
      if (!account.data?.data) continue;

      // Filter by commitment discriminator (approximate match due to JS number precision)
      const disc = account.data.discriminator;
      if (!disc || Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) > 1000) continue;

      // Skip accounts with truncated encrypted notes (older format)
      const dataLen = Buffer.from(account.data.data, 'base64').length;
      if (dataLen < 200) continue;

      try {
        // Parse commitment account data (discriminator already filtered above)
        const parsed = this.parseCommitmentAccountData(account.data.data);
        if (!parsed) continue;

        // Deserialize encrypted note
        const encryptedNote = this.deserializeEncryptedNote(parsed.encryptedNote);
        if (!encryptedNote) continue;

        // Try to decrypt with viewing key
        const note = tryDecryptNote(encryptedNote, viewingKey);
        if (!note) continue;

        // Successfully decrypted - this note belongs to user
        decryptedNotes.push({
          ...note,
          commitment: parsed.commitment,
          leafIndex: parsed.leafIndex,
          pool: new PublicKey(parsed.pool),
        });
      } catch {
        // Failed to parse or decrypt - skip this account
        continue;
      }
    }

    return decryptedNotes;
  }

  /**
   * Get all commitment compressed accounts
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
    const response = await fetch(this['rpcUrl'], {
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
    });

    const result = await response.json() as {
      result: { value?: { items: CompressedAccountInfo[] }; items?: CompressedAccountInfo[] };
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }

    // Helius returns items in result.value.items or result.items depending on version
    return result.result?.value?.items ?? result.result?.items ?? [];
  }

  /**
   * Parse commitment account data from base64
   *
   * Note: Helius returns discriminator separately, so data doesn't include it
   * Layout (after discriminator):
   * - pool: 32 bytes
   * - commitment: 32 bytes
   * - leaf_index: 8 bytes (u64)
   * - encrypted_note_len: 4 bytes (u32)
   * - encrypted_note: variable bytes
   * - created_at: 8 bytes (i64)
   */
  private parseCommitmentAccountData(dataBase64: string): {
    pool: Uint8Array;
    commitment: Uint8Array;
    leafIndex: number;
    encryptedNote: Uint8Array;
  } | null {
    try {
      const data = Buffer.from(dataBase64, 'base64');

      // Helius provides discriminator separately, so data starts directly with pool
      if (data.length < 76) return null;

      // Pool (32 bytes)
      const pool = data.slice(0, 32);

      // Commitment (32 bytes)
      const commitment = data.slice(32, 64);

      // Leaf index (8 bytes u64 LE)
      const leafIndex = Number(data.readBigUInt64LE(64));

      // Encrypted note length (4 bytes u32 LE)
      const encryptedNoteLen = data.readUInt32LE(72);

      // Encrypted note (variable)
      const encryptedNote = data.slice(76, 76 + encryptedNoteLen);

      return {
        pool: new Uint8Array(pool),
        commitment: new Uint8Array(commitment),
        leafIndex,
        encryptedNote: new Uint8Array(encryptedNote),
      };
    } catch {
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
}
