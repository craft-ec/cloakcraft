/**
 * Light Protocol Helpers
 *
 * Utilities for working with Light Protocol compressed accounts
 */

import { PublicKey, AccountMeta } from '@solana/web3.js';
import {
  createRpc,
  bn,
  deriveAddressSeedV2,
  deriveAddressV2,
  PackedAccounts,
  SystemAccountMetaConfig,
  getBatchAddressTreeInfo,
  Rpc,
} from '@lightprotocol/stateless.js';
import { DEVNET_V2_TREES, PROGRAM_ID } from './constants';

/**
 * Light Protocol RPC client wrapper
 */
export class LightProtocol {
  readonly rpc: Rpc;
  readonly programId: PublicKey;

  constructor(rpcUrl: string, programId: PublicKey = PROGRAM_ID) {
    this.rpc = createRpc(rpcUrl, rpcUrl);
    this.programId = programId;
  }

  /**
   * Get batch address tree info
   */
  getAddressTreeInfo() {
    return getBatchAddressTreeInfo();
  }

  /**
   * Derive commitment address using Light SDK V2
   */
  deriveCommitmentAddress(pool: PublicKey, commitment: Uint8Array): PublicKey {
    const addressTreeInfo = this.getAddressTreeInfo();
    const seeds = [
      Buffer.from('commitment'),
      pool.toBuffer(),
      Buffer.from(commitment),
    ];
    const addressSeed = deriveAddressSeedV2(seeds);
    return deriveAddressV2(addressSeed, addressTreeInfo.tree, this.programId);
  }

  /**
   * Derive nullifier address using Light SDK V2
   */
  deriveNullifierAddress(pool: PublicKey, nullifier: Uint8Array): PublicKey {
    const addressTreeInfo = this.getAddressTreeInfo();
    const seeds = [
      Buffer.from('spend_nullifier'),
      pool.toBuffer(),
      Buffer.from(nullifier),
    ];
    const addressSeed = deriveAddressSeedV2(seeds);
    return deriveAddressV2(addressSeed, addressTreeInfo.tree, this.programId);
  }

  /**
   * Get validity proof for creating a new compressed account (non-inclusion)
   */
  async getValidityProof(addresses: PublicKey[]) {
    const addressTreeInfo = this.getAddressTreeInfo();
    return this.rpc.getValidityProofV0(
      [], // No existing hashes
      addresses.map(addr => ({
        address: bn(addr.toBytes()),
        tree: addressTreeInfo.tree,
        queue: addressTreeInfo.queue,
      }))
    );
  }

  /**
   * Get inclusion proof for existing compressed account
   *
   * Uses Light SDK's getCompressedAccountProof which properly proves
   * the account hash exists in the state tree.
   */
  async getInclusionProofByHash(accountHash: string) {
    const hashBytes = new PublicKey(accountHash).toBytes();
    const hashBn = bn(hashBytes);
    return this.rpc.getCompressedAccountProof(hashBn);
  }

  /**
   * Build remaining accounts for Light Protocol CPI (simple version - no commitment)
   */
  buildRemainingAccounts(): { accounts: AccountMeta[]; outputTreeIndex: number; addressTreeIndex: number } {
    const systemConfig = SystemAccountMetaConfig.new(this.programId);
    const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

    const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);
    const addressTreeInfo = this.getAddressTreeInfo();
    const addressTreeIndex = packedAccounts.insertOrGet(addressTreeInfo.tree);

    const { remainingAccounts } = packedAccounts.toAccountMetas();
    const accounts = remainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isWritable: Boolean(acc.isWritable),
      isSigner: Boolean(acc.isSigner),
    }));

    return { accounts, outputTreeIndex, addressTreeIndex };
  }

  /**
   * Build remaining accounts for spending operations (with commitment verification)
   *
   * CENTRALIZED TREE HANDLING - Use this for all spend operations!
   * Handles tree/queue extraction from commitment proof and builds correct indices.
   *
   * @param commitmentProof - Inclusion proof for commitment (from getInclusionProofByHash)
   * @param nullifierProof - Non-inclusion proof for nullifier (from getValidityProof)
   * @returns Everything needed for Light Protocol CPI with commitment verification
   */
  buildRemainingAccountsWithCommitment(commitmentProof: any, nullifierProof: any): {
    accounts: AccountMeta[];
    outputTreeIndex: number;
    commitmentStateTreeIndex: number;
    commitmentAddressTreeIndex: number;
    commitmentQueueIndex: number;
    nullifierAddressTreeIndex: number;
  } {
    const systemConfig = SystemAccountMetaConfig.new(this.programId);
    const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

    // Add output queue (for nullifier creation)
    const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);

    // Add current address tree for nullifier (nullifier uses current tree)
    const currentAddressTree = this.getAddressTreeInfo().tree;
    const nullifierAddressTreeIndex = packedAccounts.insertOrGet(currentAddressTree);

    // Extract commitment's tree and queue from proof (where it was created)
    const commitmentTree = new PublicKey(commitmentProof.treeInfo.tree);
    const commitmentQueue = new PublicKey(commitmentProof.treeInfo.queue);

    // Add commitment's tree and queue
    const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
    const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);

    // For Light Protocol V2, use SAME tree for both state and address
    // The proof.treeInfo.tree is the address tree that was active when commitment was created
    const commitmentAddressTreeIndex = commitmentStateTreeIndex;

    const { remainingAccounts } = packedAccounts.toAccountMetas();
    const accounts = remainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isWritable: Boolean(acc.isWritable),
      isSigner: Boolean(acc.isSigner),
    }));

    return {
      accounts,
      outputTreeIndex,
      commitmentStateTreeIndex,
      commitmentAddressTreeIndex,
      commitmentQueueIndex,
      nullifierAddressTreeIndex,
    };
  }

  /**
   * Convert Light SDK compressed proof to Anchor format
   */
  static convertCompressedProof(proof: any): { a: number[]; b: number[]; c: number[] } {
    const proofA = new Uint8Array(32);
    const proofB = new Uint8Array(64);
    const proofC = new Uint8Array(32);
    if (proof.compressedProof) {
      proofA.set(proof.compressedProof.a.slice(0, 32));
      proofB.set(proof.compressedProof.b.slice(0, 64));
      proofC.set(proof.compressedProof.c.slice(0, 32));
    }
    return {
      a: Array.from(proofA),
      b: Array.from(proofB),
      c: Array.from(proofC),
    };
  }
}

/**
 * Light params for shield instruction
 */
export interface LightShieldParams {
  validityProof: { a: number[]; b: number[]; c: number[] };
  addressTreeInfo: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
    rootIndex: number;
  };
  outputTreeIndex: number;
}

/**
 * Light params for transact instruction
 *
 * SECURITY CRITICAL: Requires TWO separate proofs to prevent fake commitment attacks
 * - Commitment inclusion proof: Verifies input commitment EXISTS in Light Protocol tree
 * - Nullifier non-inclusion proof: Verifies nullifier DOESN'T exist (prevents double-spend)
 *
 * Light Protocol validates both proofs automatically via CPI.
 */
export interface LightTransactParams {
  /** Account hash of input commitment (for state tree verification) */
  commitmentAccountHash: number[];
  /** Commitment merkle context (proves commitment exists in state tree) */
  commitmentMerkleContext: {
    merkleTreePubkeyIndex: number;
    queuePubkeyIndex: number;
    leafIndex: number;
    rootIndex: number;
  };
  /** Commitment inclusion proof (SECURITY: proves commitment exists) */
  commitmentInclusionProof: { a: number[]; b: number[]; c: number[] };
  /** Address tree info for commitment verification */
  commitmentAddressTreeInfo: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
    rootIndex: number;
  };
  /** Nullifier non-inclusion proof (prevents double-spend) */
  nullifierNonInclusionProof: { a: number[]; b: number[]; c: number[] };
  /** Address tree info for nullifier creation */
  nullifierAddressTreeInfo: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
    rootIndex: number;
  };
  /** Output state tree index for new nullifier account */
  outputTreeIndex: number;
}

/**
 * Light params for store_commitment instruction
 */
export interface LightStoreCommitmentParams {
  commitment: number[];
  leafIndex: bigint;
  stealthEphemeralPubkey: number[];
  encryptedNote: number[];
  validityProof: { a: number[]; b: number[]; c: number[] };
  addressTreeInfo: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
    rootIndex: number;
  };
  outputTreeIndex: number;
}
