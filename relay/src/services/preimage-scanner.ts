/**
 * Preimage scanner service for vote/position recovery
 *
 * Scans on-chain data to find encrypted vote preimages
 * that allow users to recover their vote details for claims.
 */

import { Connection, PublicKey } from '@solana/web3.js';

export interface VotePreimage {
  ballotId: string;
  voteCommitment: string;      // or position_commitment for SpendToVote
  encryptedPreimage: string;   // hex encoded
  encryptionType: number;      // 0 = user_key, 1 = timelock_key
  bindingMode: number;         // 0 = Snapshot, 1 = SpendToVote
  createdSlot: number;
  isNullified: boolean;
}

export interface DecryptedPreimage {
  voteChoice: number;
  weight: string;              // BigInt as string
  randomness: string;          // hex encoded
  ballotId: string;
  amount?: string;             // For SpendToVote only
}

export interface ScanOptions {
  ballotId?: string;           // Filter by ballot
  includeNullified?: boolean;  // Include already claimed/changed
  limit?: number;
}

/**
 * Preimage scanner for vote/position recovery
 */
export class PreimageScannerService {
  private connection: Connection;
  private programId: PublicKey;

  // In-memory index of preimages (in production, would use database)
  private preimageIndex: Map<string, VotePreimage[]> = new Map();

  constructor(rpcUrl: string, programId: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.programId = new PublicKey(programId);
  }

  /**
   * Scan for a user's encrypted vote preimages
   */
  async scanUserPreimages(
    pubkey: string,
    options: ScanOptions = {}
  ): Promise<VotePreimage[]> {
    const userPreimages = this.preimageIndex.get(pubkey) || [];

    let filtered = userPreimages;

    // Filter by ballot if specified
    if (options.ballotId) {
      filtered = filtered.filter(p => p.ballotId === options.ballotId);
    }

    // Filter out nullified unless requested
    if (!options.includeNullified) {
      filtered = filtered.filter(p => !p.isNullified);
    }

    // Apply limit
    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * Index a new vote preimage (called when vote/position is created)
   */
  indexPreimage(
    pubkey: string,
    preimage: VotePreimage
  ): void {
    const existing = this.preimageIndex.get(pubkey) || [];
    existing.push(preimage);
    this.preimageIndex.set(pubkey, existing);
  }

  /**
   * Mark a preimage as nullified (vote changed or position claimed)
   */
  markNullified(
    pubkey: string,
    commitment: string
  ): void {
    const preimages = this.preimageIndex.get(pubkey);
    if (!preimages) return;

    for (const p of preimages) {
      if (p.voteCommitment === commitment) {
        p.isNullified = true;
        break;
      }
    }
  }

  /**
   * Sync preimages from on-chain data
   * Called periodically to update the index
   */
  async syncFromChain(startSlot?: number): Promise<number> {
    let syncedCount = 0;

    try {
      // In production, would:
      // 1. Fetch transaction logs for the program
      // 2. Parse VotePreimageAccount creations
      // 3. Index by pubkey

      // Placeholder implementation
      const signatures = await this.connection.getSignaturesForAddress(
        this.programId,
        { limit: 1000 }
      );

      for (const sig of signatures) {
        if (startSlot && sig.slot < startSlot) continue;

        try {
          const tx = await this.connection.getParsedTransaction(sig.signature, {
            maxSupportedTransactionVersion: 0,
          });

          if (!tx?.meta?.logMessages) continue;

          // Parse logs for preimage events
          for (const log of tx.meta.logMessages) {
            if (log.includes('Vote preimage stored:')) {
              // Would parse the log and extract preimage data
              syncedCount++;
            }
          }
        } catch (e) {
          // Skip invalid transactions
        }
      }
    } catch (error) {
      console.error('Error syncing preimages:', error);
    }

    return syncedCount;
  }

  /**
   * Get preimage by commitment (for debugging/verification)
   */
  getByCommitment(commitment: string): VotePreimage | null {
    for (const [, preimages] of this.preimageIndex) {
      for (const p of preimages) {
        if (p.voteCommitment === commitment) {
          return p;
        }
      }
    }
    return null;
  }

  /**
   * Clear index (for testing)
   */
  clearIndex(): void {
    this.preimageIndex.clear();
  }

  /**
   * Get index stats
   */
  getStats(): { userCount: number; preimageCount: number } {
    let preimageCount = 0;
    for (const preimages of this.preimageIndex.values()) {
      preimageCount += preimages.length;
    }
    return {
      userCount: this.preimageIndex.size,
      preimageCount,
    };
  }
}

/**
 * Decrypt a preimage using user's private key
 * In production, this would use proper ElGamal/ECIES decryption
 */
export function decryptPreimage(
  encryptedPreimage: string,
  privateKey: Uint8Array,
  encryptionType: number
): DecryptedPreimage | null {
  try {
    // Placeholder - in production would use actual decryption
    // The encryption format depends on encryptionType:
    // 0 = User's public key (ECIES or similar)
    // 1 = Timelock public key (ElGamal with timelock)

    const encrypted = Buffer.from(encryptedPreimage, 'hex');

    // Would perform actual decryption here based on encryptionType
    // For now, return null to indicate decryption not implemented

    return null;
  } catch (error) {
    console.error('Error decrypting preimage:', error);
    return null;
  }
}

/**
 * Decrypt preimages for TimeLocked mode after unlock
 * The timelock key would be released after unlock_slot
 */
export async function decryptTimelockPreimages(
  preimages: VotePreimage[],
  timelockPrivateKey: Uint8Array
): Promise<Map<string, DecryptedPreimage>> {
  const results = new Map<string, DecryptedPreimage>();

  for (const preimage of preimages) {
    if (preimage.encryptionType !== 1) continue; // Only timelock-encrypted

    const decrypted = decryptPreimage(
      preimage.encryptedPreimage,
      timelockPrivateKey,
      preimage.encryptionType
    );

    if (decrypted) {
      results.set(preimage.voteCommitment, decrypted);
    }
  }

  return results;
}
