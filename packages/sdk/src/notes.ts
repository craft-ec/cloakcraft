/**
 * Note management - syncing, scanning, and tracking notes
 */

import { PublicKey } from '@solana/web3.js';
import type {
  Keypair,
  DecryptedNote,
  EncryptedNote,
  Commitment,
  Nullifier,
  SyncStatus,
} from '@cloakcraft/types';
import { tryDecryptNote } from './crypto/encryption';
import { computeCommitment } from './crypto/commitment';
import { deriveSpendingNullifier, deriveNullifierKey, checkNullifierSpent } from './crypto/nullifier';
import { bytesToField } from './crypto/poseidon';

/**
 * Note manager for syncing and managing wallet notes
 */
export class NoteManager {
  private indexerUrl: string;
  private cachedNotes: Map<string, DecryptedNote> = new Map();
  private spentNullifiers: Set<string> = new Set();
  private lastSyncSlot: number = 0;

  constructor(indexerUrl: string) {
    this.indexerUrl = indexerUrl;
  }

  /**
   * Sync notes from the indexer for a keypair
   */
  async syncNotes(keypair: Keypair): Promise<DecryptedNote[]> {
    const syncStatus = await this.getSyncStatus();
    const newNotes: DecryptedNote[] = [];

    // Fetch new commitments since last sync
    const commitments = await this.fetchCommitments(this.lastSyncSlot);

    for (const entry of commitments) {
      // Try to decrypt each note
      const encryptedNote = this.parseEncryptedNote(entry.encryptedNote);
      const privateKey = bytesToField(keypair.spending.sk);
      const decrypted = tryDecryptNote(encryptedNote, privateKey);

      if (decrypted) {
        // Verify commitment matches
        const commitment = computeCommitment(decrypted);
        if (Buffer.from(commitment).toString('hex') === entry.commitment) {
          const note: DecryptedNote = {
            ...decrypted,
            commitment,
            leafIndex: entry.leafIndex,
            pool: new PublicKey(entry.pool),
          };

          const key = this.noteKey(commitment);
          if (!this.cachedNotes.has(key)) {
            this.cachedNotes.set(key, note);
            newNotes.push(note);
          }
        }
      }
    }

    // Check for spent notes
    await this.checkSpentNotes(keypair);

    this.lastSyncSlot = syncStatus.latestSlot;
    return newNotes;
  }

  /**
   * Get all unspent notes for a token
   */
  async getUnspentNotes(keypair: Keypair, tokenMint: PublicKey): Promise<DecryptedNote[]> {
    const notes: DecryptedNote[] = [];
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);

    for (const note of this.cachedNotes.values()) {
      if (note.tokenMint.equals(tokenMint)) {
        const nullifier = deriveSpendingNullifier(nullifierKey, note.commitment, note.leafIndex);
        const nullifierHex = Buffer.from(nullifier).toString('hex');

        if (!this.spentNullifiers.has(nullifierHex)) {
          // Double-check with indexer
          const isSpent = await checkNullifierSpent(this.indexerUrl, nullifier);
          if (isSpent) {
            this.spentNullifiers.add(nullifierHex);
          } else {
            notes.push(note);
          }
        }
      }
    }

    return notes;
  }

  /**
   * Get total balance for a token
   */
  async getBalance(keypair: Keypair, tokenMint: PublicKey): Promise<bigint> {
    const notes = await this.getUnspentNotes(keypair, tokenMint);
    return notes.reduce((sum, note) => sum + note.amount, 0n);
  }

  /**
   * Select notes for a transfer
   */
  async selectNotesForAmount(
    keypair: Keypair,
    tokenMint: PublicKey,
    targetAmount: bigint
  ): Promise<{ notes: DecryptedNote[]; totalAmount: bigint }> {
    const available = await this.getUnspentNotes(keypair, tokenMint);

    // Sort by amount descending for greedy selection
    available.sort((a, b) => {
      if (a.amount > b.amount) return -1;
      if (a.amount < b.amount) return 1;
      return 0;
    });

    const selected: DecryptedNote[] = [];
    let total = 0n;

    for (const note of available) {
      if (total >= targetAmount) break;
      selected.push(note);
      total += note.amount;
    }

    if (total < targetAmount) {
      throw new Error(`Insufficient balance: need ${targetAmount}, have ${total}`);
    }

    return { notes: selected, totalAmount: total };
  }

  /**
   * Get sync status
   *
   * Note: This method is deprecated. Use direct RPC scanning instead.
   * @deprecated Use client.getSyncStatus() which queries RPC directly
   */
  async getSyncStatus(): Promise<SyncStatus> {
    // Return a dummy status since we're using direct RPC scanning
    return {
      latestSlot: 0,
      indexedSlot: 0,
      isSynced: true,
    };
  }

  /**
   * Mark notes as spent locally
   */
  markSpent(nullifiers: Nullifier[]): void {
    for (const nullifier of nullifiers) {
      this.spentNullifiers.add(Buffer.from(nullifier).toString('hex'));
    }
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  private async fetchCommitments(sinceSlot: number): Promise<CommitmentEntry[]> {
    // Fetch from all pools
    // In production: paginate and handle multiple pools
    const response = await fetch(
      `${this.indexerUrl}/commitments?since_slot=${sinceSlot}&limit=10000`
    );
    if (!response.ok) {
      throw new Error('Failed to fetch commitments');
    }
    return response.json() as Promise<CommitmentEntry[]>;
  }

  private async checkSpentNotes(keypair: Keypair): Promise<void> {
    const nullifierKey = deriveNullifierKey(keypair.spending.sk);

    for (const note of this.cachedNotes.values()) {
      const nullifier = deriveSpendingNullifier(nullifierKey, note.commitment, note.leafIndex);
      const nullifierHex = Buffer.from(nullifier).toString('hex');

      if (!this.spentNullifiers.has(nullifierHex)) {
        const isSpent = await checkNullifierSpent(this.indexerUrl, nullifier);
        if (isSpent) {
          this.spentNullifiers.add(nullifierHex);
        }
      }
    }
  }

  private parseEncryptedNote(data: string): EncryptedNote {
    const bytes = Buffer.from(data, 'hex');
    // Parse encrypted note structure
    // ephemeralPubkey (64 bytes) + ciphertext (variable) + tag (16 bytes)
    return {
      ephemeralPubkey: {
        x: new Uint8Array(bytes.slice(0, 32)),
        y: new Uint8Array(bytes.slice(32, 64)),
      },
      ciphertext: new Uint8Array(bytes.slice(64, bytes.length - 16)),
      tag: new Uint8Array(bytes.slice(bytes.length - 16)),
    };
  }

  private noteKey(commitment: Commitment): string {
    return Buffer.from(commitment).toString('hex');
  }
}

interface CommitmentEntry {
  commitment: string;
  leafIndex: number;
  pool: string;
  encryptedNote: string;
  slot: number;
}
