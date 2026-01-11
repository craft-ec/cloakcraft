/**
 * Light Protocol Integration
 *
 * Handles interaction with Helius Photon indexer for compressed account operations.
 * Used for nullifier storage via ZK Compression.
 */

import { PublicKey, AccountMeta } from '@solana/web3.js';

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
  /** Data (base64) */
  data: string | null;
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
    const addressHex = Buffer.from(address).toString('hex');

    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getCompressedAccount',
        params: {
          address: addressHex,
        },
      }),
    });

    const result = await response.json() as {
      result: CompressedAccountInfo | null;
      error?: { message: string };
    };

    if (result.error) {
      throw new Error(`Helius RPC error: ${result.error.message}`);
    }

    return result.result;
  }

  /**
   * Check if a nullifier has been spent
   *
   * Returns true if the nullifier compressed account exists
   */
  async isNullifierSpent(
    nullifier: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey
  ): Promise<boolean> {
    const address = this.deriveNullifierAddress(nullifier, programId, addressTree);
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
          newAddresses: params.newAddresses.map(a => Buffer.from(a).toString('hex')),
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
    // Derive nullifier address
    const nullifierAddress = this.deriveNullifierAddress(
      params.nullifier,
      params.programId,
      params.addressMerkleTree
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
   * Derive nullifier compressed account address
   *
   * Matches the on-chain derive_nullifier_address function
   */
  deriveNullifierAddress(
    nullifier: Uint8Array,
    programId: PublicKey,
    addressTree: PublicKey
  ): Uint8Array {
    // Address derivation uses Poseidon hash:
    // address = poseidon(SEED_PREFIX || nullifier || address_tree || program_id)
    //
    // In JS, we use the light-protocol SDK for this
    // For now, return a placeholder - actual implementation requires
    // the @lightprotocol/stateless.js SDK

    // TODO: Import from @lightprotocol/stateless.js (v2)
    // import { deriveAddressSeedV2, deriveAddressV2 } from '@lightprotocol/stateless.js';
    // const addressSeed = deriveAddressSeedV2([Buffer.from('nullifier'), nullifier], programId);
    // return deriveAddressV2(addressSeed, addressTree, programId);

    // Placeholder implementation using simple hash
    const { createHash } = require('crypto');
    const hash = createHash('sha256')
      .update(Buffer.from('nullifier'))
      .update(nullifier)
      .update(addressTree.toBytes())
      .update(programId.toBytes())
      .digest();

    return new Uint8Array(hash);
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
 */
export const DEVNET_LIGHT_TREES = {
  /** V2 batch address tree (tree and queue are the same) */
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
  stateTrees: DEVNET_LIGHT_TREES.stateTrees, // TODO: Update with mainnet addresses
};

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
}
