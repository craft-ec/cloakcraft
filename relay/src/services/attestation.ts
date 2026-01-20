/**
 * Attestation service for balance attestations
 *
 * Signs balance attestations for snapshot mode voting.
 * The indexer attests to a user's token balance at a specific slot.
 */

import { Keypair, PublicKey, Connection } from '@solana/web3.js';
import * as nacl from 'tweetnacl';

export interface BalanceAttestation {
  pubkey: string;
  ballotId: string;
  tokenMint: string;
  totalAmount: string;       // BigInt as string
  snapshotSlot: number;
  timestamp: number;
  signature: string;         // Ed25519 signature
  indexerPubkey: string;
}

export interface AttestationRequest {
  ballotId: string;
  pubkey: string;
  tokenMint: string;
  snapshotSlot: number;
}

/**
 * Attestation service for signing balance attestations
 */
export class AttestationService {
  private connection: Connection;
  private indexerKeypair: Keypair;

  constructor(rpcUrl: string, indexerSecretKey: Uint8Array) {
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.indexerKeypair = Keypair.fromSecretKey(indexerSecretKey);
  }

  /**
   * Get the indexer's public key (for ballot configuration)
   */
  getIndexerPubkey(): PublicKey {
    return this.indexerKeypair.publicKey;
  }

  /**
   * Generate a balance attestation for a user
   */
  async generateAttestation(request: AttestationRequest): Promise<BalanceAttestation | null> {
    const { ballotId, pubkey, tokenMint, snapshotSlot } = request;

    try {
      // Fetch user's token balance at snapshot slot
      const totalAmount = await this.getBalanceAtSlot(pubkey, tokenMint, snapshotSlot);

      if (totalAmount === null) {
        return null;
      }

      // Build attestation message
      const message = this.buildAttestationMessage(pubkey, ballotId, tokenMint, totalAmount, snapshotSlot);

      // Sign the message
      const signature = nacl.sign.detached(message, this.indexerKeypair.secretKey);

      return {
        pubkey,
        ballotId,
        tokenMint,
        totalAmount: totalAmount.toString(),
        snapshotSlot,
        timestamp: Date.now(),
        signature: Buffer.from(signature).toString('hex'),
        indexerPubkey: this.indexerKeypair.publicKey.toBase58(),
      };
    } catch (error) {
      console.error('Error generating attestation:', error);
      return null;
    }
  }

  /**
   * Verify an attestation signature
   */
  verifyAttestation(attestation: BalanceAttestation): boolean {
    try {
      const message = this.buildAttestationMessage(
        attestation.pubkey,
        attestation.ballotId,
        attestation.tokenMint,
        BigInt(attestation.totalAmount),
        attestation.snapshotSlot
      );

      const signature = Buffer.from(attestation.signature, 'hex');
      const pubkey = new PublicKey(attestation.indexerPubkey).toBytes();

      return nacl.sign.detached.verify(message, signature, pubkey);
    } catch (error) {
      console.error('Error verifying attestation:', error);
      return false;
    }
  }

  /**
   * Build the message to sign for an attestation
   * Format: pubkey || ballot_id || token_mint || total_amount || snapshot_slot
   */
  private buildAttestationMessage(
    pubkey: string,
    ballotId: string,
    tokenMint: string,
    totalAmount: bigint,
    snapshotSlot: number
  ): Uint8Array {
    const pubkeyBytes = new PublicKey(pubkey).toBytes();
    const ballotIdBytes = Buffer.from(ballotId.replace('0x', ''), 'hex');
    const tokenMintBytes = new PublicKey(tokenMint).toBytes();

    // Amount as 8 bytes (u64)
    const amountBuffer = Buffer.alloc(8);
    amountBuffer.writeBigUInt64LE(totalAmount);

    // Slot as 8 bytes (u64)
    const slotBuffer = Buffer.alloc(8);
    slotBuffer.writeBigUInt64LE(BigInt(snapshotSlot));

    return Buffer.concat([
      pubkeyBytes,
      ballotIdBytes,
      tokenMintBytes,
      amountBuffer,
      slotBuffer,
    ]);
  }

  /**
   * Get user's total token balance at a specific slot
   * In production, this would use Helius/Photon historical API
   */
  private async getBalanceAtSlot(
    pubkey: string,
    tokenMint: string,
    snapshotSlot: number
  ): Promise<bigint | null> {
    try {
      // For production, use historical balance API from Helius/Photon
      // This implementation gets current balance as a placeholder

      const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
        new PublicKey(pubkey),
        { mint: new PublicKey(tokenMint) }
      );

      let totalBalance = BigInt(0);
      for (const account of tokenAccounts.value) {
        const amount = account.account.data.parsed?.info?.tokenAmount?.amount;
        if (amount) {
          totalBalance += BigInt(amount);
        }
      }

      // Also check for shielded notes (would query indexer in production)
      const shieldedBalance = await this.getShieldedBalance(pubkey, tokenMint, snapshotSlot);
      totalBalance += shieldedBalance;

      return totalBalance;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return null;
    }
  }

  /**
   * Get user's shielded balance from indexed notes
   * In production, would scan and aggregate note commitments
   */
  private async getShieldedBalance(
    pubkey: string,
    tokenMint: string,
    snapshotSlot: number
  ): Promise<bigint> {
    // Placeholder - would query shielded notes index
    // This requires the user to have scanned their notes and provided
    // the decryption to the indexer, or use ZK proofs

    // For privacy-preserving balance attestation, the actual approach would:
    // 1. User scans their own notes locally
    // 2. User provides encrypted note details to indexer
    // 3. Indexer verifies notes exist but doesn't learn amounts
    // 4. Use ZK proof to attest balance without revealing individual notes

    return BigInt(0);
  }
}

/**
 * Create a new indexer keypair (for initial setup)
 */
export function createIndexerKeypair(): { publicKey: string; secretKey: string } {
  const keypair = Keypair.generate();
  return {
    publicKey: keypair.publicKey.toBase58(),
    secretKey: Buffer.from(keypair.secretKey).toString('hex'),
  };
}
