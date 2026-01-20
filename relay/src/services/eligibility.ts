/**
 * Eligibility service for voting whitelist management
 *
 * Generates and manages eligibility merkle trees for ballot access control.
 */

import { PublicKey, Connection } from '@solana/web3.js';

// Simplified Poseidon hash placeholder - would use actual implementation in production
function poseidonHash(inputs: bigint[]): bigint {
  // Placeholder - in production, use light-poseidon or similar
  let hash = BigInt(0);
  for (const input of inputs) {
    hash = hash ^ input;
    hash = (hash * BigInt('0x9e3779b97f4a7c15')) & ((BigInt(1) << BigInt(254)) - BigInt(1));
  }
  return hash;
}

export interface EligibilityCriteria {
  minBalance?: number;        // Minimum token balance
  nftCollection?: string;     // Required NFT collection
  customAddresses?: string[]; // Additional addresses to include
}

export interface EligibilityResult {
  eligibilityRoot: string;    // Merkle root (hex)
  eligibleCount: number;
  treeData: EligibilityTreeData;
}

export interface EligibilityTreeData {
  root: string;
  leaves: string[];
  depth: number;
}

export interface MerkleProof {
  pubkey: string;
  isEligible: boolean;
  merkleProof: string[];
  pathIndices: number[];
  leafIndex: number;
}

/**
 * Eligibility service for ballot whitelist management
 */
export class EligibilityService {
  private connection: Connection;
  private trees: Map<string, EligibilityTreeData> = new Map();

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  /**
   * Generate eligibility whitelist based on criteria
   */
  async generateEligibilityTree(
    tokenMint: string,
    snapshotSlot: number,
    criteria: EligibilityCriteria
  ): Promise<EligibilityResult> {
    const eligibleAddresses: Set<string> = new Set();

    // Add custom addresses first
    if (criteria.customAddresses) {
      for (const addr of criteria.customAddresses) {
        eligibleAddresses.add(addr);
      }
    }

    // Query token holders at snapshot slot if min balance specified
    if (criteria.minBalance !== undefined && criteria.minBalance > 0) {
      const holders = await this.getTokenHolders(tokenMint, snapshotSlot, criteria.minBalance);
      for (const holder of holders) {
        eligibleAddresses.add(holder);
      }
    }

    // Query NFT holders if collection specified
    if (criteria.nftCollection) {
      const nftHolders = await this.getNftHolders(criteria.nftCollection, snapshotSlot);
      for (const holder of nftHolders) {
        eligibleAddresses.add(holder);
      }
    }

    // Build merkle tree from eligible addresses
    const leaves = Array.from(eligibleAddresses).sort();
    const treeData = this.buildMerkleTree(leaves);

    // Store tree for later proof generation
    this.trees.set(treeData.root, treeData);

    return {
      eligibilityRoot: treeData.root,
      eligibleCount: leaves.length,
      treeData,
    };
  }

  /**
   * Get merkle proof for a pubkey
   */
  getMerkleProof(eligibilityRoot: string, pubkey: string): MerkleProof | null {
    const tree = this.trees.get(eligibilityRoot);
    if (!tree) {
      return null;
    }

    const leafIndex = tree.leaves.indexOf(pubkey);
    if (leafIndex === -1) {
      return {
        pubkey,
        isEligible: false,
        merkleProof: [],
        pathIndices: [],
        leafIndex: -1,
      };
    }

    const { proof, pathIndices } = this.generateProof(tree, leafIndex);

    return {
      pubkey,
      isEligible: true,
      merkleProof: proof,
      pathIndices,
      leafIndex,
    };
  }

  /**
   * Build merkle tree from leaves
   */
  private buildMerkleTree(leaves: string[]): EligibilityTreeData {
    if (leaves.length === 0) {
      return {
        root: '0x' + BigInt(0).toString(16).padStart(64, '0'),
        leaves: [],
        depth: 0,
      };
    }

    // Pad to power of 2
    const depth = Math.ceil(Math.log2(Math.max(leaves.length, 2)));
    const paddedSize = Math.pow(2, depth);
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < paddedSize) {
      paddedLeaves.push('0x' + BigInt(0).toString(16).padStart(64, '0'));
    }

    // Convert leaves to bigints
    const leafHashes = paddedLeaves.map(addr => {
      const bytes = new PublicKey(addr).toBytes();
      return BigInt('0x' + Buffer.from(bytes).toString('hex'));
    });

    // Build tree level by level
    let currentLevel = leafHashes;
    while (currentLevel.length > 1) {
      const nextLevel: bigint[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || BigInt(0);
        nextLevel.push(poseidonHash([left, right]));
      }
      currentLevel = nextLevel;
    }

    const root = '0x' + currentLevel[0].toString(16).padStart(64, '0');

    return {
      root,
      leaves: paddedLeaves,
      depth,
    };
  }

  /**
   * Generate merkle proof for a leaf index
   */
  private generateProof(
    tree: EligibilityTreeData,
    leafIndex: number
  ): { proof: string[]; pathIndices: number[] } {
    const proof: string[] = [];
    const pathIndices: number[] = [];

    const leafHashes = tree.leaves.map(addr => {
      try {
        const bytes = new PublicKey(addr).toBytes();
        return BigInt('0x' + Buffer.from(bytes).toString('hex'));
      } catch {
        return BigInt(0);
      }
    });

    let currentLevel = leafHashes;
    let index = leafIndex;

    while (currentLevel.length > 1) {
      const siblingIndex = index % 2 === 0 ? index + 1 : index - 1;
      const sibling = currentLevel[siblingIndex] || BigInt(0);
      proof.push('0x' + sibling.toString(16).padStart(64, '0'));
      pathIndices.push(index % 2);

      // Move to next level
      const nextLevel: bigint[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] || BigInt(0);
        nextLevel.push(poseidonHash([left, right]));
      }
      currentLevel = nextLevel;
      index = Math.floor(index / 2);
    }

    return { proof, pathIndices };
  }

  /**
   * Get token holders above minimum balance at snapshot slot
   */
  private async getTokenHolders(
    tokenMint: string,
    snapshotSlot: number,
    minBalance: number
  ): Promise<string[]> {
    // In production, would query Helius/Photon API for historical data
    // or use on-chain token accounts
    try {
      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(tokenMint),
        { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') }
      );

      const holders: string[] = [];
      for (const account of tokenAccounts.value) {
        const info = account.account.data.parsed?.info;
        if (info && Number(info.tokenAmount?.amount || 0) >= minBalance) {
          holders.push(info.owner);
        }
      }

      return holders;
    } catch (error) {
      console.error('Error fetching token holders:', error);
      return [];
    }
  }

  /**
   * Get NFT holders of a collection at snapshot slot
   */
  private async getNftHolders(
    collection: string,
    snapshotSlot: number
  ): Promise<string[]> {
    // In production, would query Helius/Photon NFT API
    // Placeholder implementation
    console.log(`Querying NFT holders for collection ${collection} at slot ${snapshotSlot}`);
    return [];
  }

  /**
   * Load a previously generated tree
   */
  loadTree(treeData: EligibilityTreeData): void {
    this.trees.set(treeData.root, treeData);
  }

  /**
   * Get tree by root
   */
  getTree(eligibilityRoot: string): EligibilityTreeData | undefined {
    return this.trees.get(eligibilityRoot);
  }
}
