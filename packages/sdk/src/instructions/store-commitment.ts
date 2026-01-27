/**
 * Store Commitment Instruction Builder
 *
 * Stores commitments as Light Protocol compressed accounts
 * Called after transact to store output commitments
 */

import {
  PublicKey,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';

import { derivePoolPda } from './constants';
import { LightProtocol, LightStoreCommitmentParams } from './light-helpers';

/**
 * Store commitment parameters
 */
export interface StoreCommitmentParams {
  /** Token mint */
  tokenMint: PublicKey;
  /** Commitment to store */
  commitment: Uint8Array;
  /** Leaf index in tree */
  leafIndex: bigint;
  /** Stealth ephemeral pubkey (64 bytes) for deriving decryption key */
  stealthEphemeralPubkey: Uint8Array;
  /** Encrypted note data */
  encryptedNote: Buffer;
  /** Relayer public key */
  relayer: PublicKey;
}

/**
 * Build store_commitment transaction using Anchor program
 */
export async function buildStoreCommitmentWithProgram(
  program: Program,
  params: StoreCommitmentParams,
  rpcUrl: string
): Promise<any> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);

  // Get Light Protocol validity proof for commitment address
  const commitmentAddress = lightProtocol.deriveCommitmentAddress(poolPda, params.commitment);
  const validityProof = await lightProtocol.getValidityProof([commitmentAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();

  const convertedProof = LightProtocol.convertCompressedProof(validityProof);
  const addressTreeInfo = {
    addressMerkleTreePubkeyIndex: addressTreeIndex,
    addressQueuePubkeyIndex: addressTreeIndex,
    rootIndex: validityProof.rootIndices[0] ?? 0,
  };

  // Build transaction using Anchor
  // Use Buffer for encryptedNote (Vec<u8>) - same as shield instruction
  const tx = await program.methods
    .storeCommitment({
      commitment: Array.from(params.commitment),
      leafIndex: new BN(params.leafIndex.toString()),
      stealthEphemeralPubkey: Array.from(params.stealthEphemeralPubkey),
      encryptedNote: Buffer.from(params.encryptedNote),  // Buffer, not number[]
      validityProof: convertedProof,
      addressTreeInfo,
      outputTreeIndex,
    })
    .accountsStrict({
      pool: poolPda,
      relayer: params.relayer,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return tx;
}

/**
 * Build and execute store_commitment transactions for multiple commitments
 *
 * After transact, call this to store each output commitment
 * Note: Anchor's .rpc() already handles confirmation - no extra verification needed
 */
export async function storeCommitments(
  program: Program,
  tokenMint: PublicKey,
  commitments: Array<{
    commitment: Uint8Array;
    leafIndex: bigint;
    stealthEphemeralPubkey: Uint8Array;
    encryptedNote: Buffer;
  }>,
  relayer: PublicKey,
  rpcUrl: string
): Promise<string[]> {
  const signatures: string[] = [];

  for (const commitment of commitments) {
    const tx = await buildStoreCommitmentWithProgram(
      program,
      {
        tokenMint,
        commitment: commitment.commitment,
        leafIndex: commitment.leafIndex,
        stealthEphemeralPubkey: commitment.stealthEphemeralPubkey,
        encryptedNote: commitment.encryptedNote,
        relayer,
      },
      rpcUrl
    );

    const sig = await tx.rpc();
    signatures.push(sig);
  }

  return signatures;
}
