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
import { Program, BN } from '@coral-xyz/anchor';

import { derivePoolPda, PROGRAM_ID } from './constants';
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

  const storeParams: LightStoreCommitmentParams = {
    commitment: Array.from(params.commitment),
    leafIndex: params.leafIndex,
    encryptedNote: params.encryptedNote,
    validityProof: LightProtocol.convertCompressedProof(validityProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: validityProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  // Build transaction using Anchor
  const tx = await program.methods
    .storeCommitment({
      commitment: storeParams.commitment,
      leafIndex: new BN(storeParams.leafIndex.toString()),
      encryptedNote: storeParams.encryptedNote,
      validityProof: storeParams.validityProof,
      addressTreeInfo: storeParams.addressTreeInfo,
      outputTreeIndex: storeParams.outputTreeIndex,
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
 */
export async function storeCommitments(
  program: Program,
  tokenMint: PublicKey,
  commitments: Array<{
    commitment: Uint8Array;
    leafIndex: bigint;
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
