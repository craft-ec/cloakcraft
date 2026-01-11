/**
 * Transact Instruction Builder
 *
 * Private transfer with optional unshield
 */

import {
  PublicKey,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program, BN } from '@coral-xyz/anchor';
import type { Point } from '@cloakcraft/types';

import {
  derivePoolPda,
  deriveVaultPda,
  deriveCommitmentCounterPda,
  deriveVerificationKeyPda,
  PROGRAM_ID,
  CIRCUIT_IDS,
} from './constants';
import { LightProtocol, LightTransactParams } from './light-helpers';
import { computeCommitment, generateRandomness } from '../crypto/commitment';
import { encryptNote, serializeEncryptedNote } from '../crypto/encryption';
import { deriveNullifierKey, deriveSpendingNullifier } from '../crypto/nullifier';

/**
 * Input note for spending
 */
export interface TransactInput {
  /** Stealth public key X coordinate */
  stealthPubX: Uint8Array;
  /** Stealth public key Y coordinate */
  stealthPubY: Uint8Array;
  /** Amount */
  amount: bigint;
  /** Randomness */
  randomness: Uint8Array;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Spending key for this note */
  spendingKey: bigint;
}

/**
 * Output note to create
 */
export interface TransactOutput {
  /** Recipient's stealth public key */
  recipientPubkey: Point;
  /** Amount */
  amount: bigint;
}

/**
 * Transact parameters
 */
export interface TransactInstructionParams {
  /** Token mint */
  tokenMint: PublicKey;
  /** Input note to spend */
  input: TransactInput;
  /** Output notes to create */
  outputs: TransactOutput[];
  /** Merkle root for input verification */
  merkleRoot: Uint8Array;
  /** Merkle path for input */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merklePathIndices: number[];
  /** Amount to unshield (0 for pure private transfer) */
  unshieldAmount?: bigint;
  /** Unshield recipient token account */
  unshieldRecipient?: PublicKey;
  /** Relayer public key */
  relayer: PublicKey;
  /** ZK proof bytes */
  proof: Uint8Array;
}

/**
 * Transact result
 */
export interface TransactResult {
  /** Nullifier that was created */
  nullifier: Uint8Array;
  /** Output commitments */
  outputCommitments: Uint8Array[];
  /** Encrypted notes for outputs */
  encryptedNotes: Buffer[];
  /** Randomness for each output (needed for spending) */
  outputRandomness: Uint8Array[];
}

/**
 * Build transact transaction using Anchor program
 */
export async function buildTransactWithProgram(
  program: Program,
  params: TransactInstructionParams,
  rpcUrl: string,
  circuitId: string = CIRCUIT_IDS.TRANSFER_1X2
): Promise<{
  tx: any;
  result: TransactResult;
}> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);
  const [vkPda] = deriveVerificationKeyPda(circuitId, programId);

  // Derive nullifier
  const nullifierKey = deriveNullifierKey(
    new Uint8Array(new BigUint64Array([params.input.spendingKey]).buffer)
  );
  const inputCommitment = computeCommitment({
    stealthPubX: params.input.stealthPubX,
    tokenMint: params.tokenMint,
    amount: params.input.amount,
    randomness: params.input.randomness,
  });
  const nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, params.input.leafIndex);

  // Create output notes and commitments
  const outputCommitments: Uint8Array[] = [];
  const encryptedNotes: Buffer[] = [];
  const outputRandomness: Uint8Array[] = [];

  for (const output of params.outputs) {
    const randomness = generateRandomness();
    outputRandomness.push(randomness);

    const note = {
      stealthPubX: output.recipientPubkey.x,
      tokenMint: params.tokenMint,
      amount: output.amount,
      randomness,
    };

    const commitment = computeCommitment(note);
    outputCommitments.push(commitment);

    const encrypted = encryptNote(note, output.recipientPubkey);
    encryptedNotes.push(Buffer.from(serializeEncryptedNote(encrypted)));
  }

  // Get Light Protocol validity proof for nullifier
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();

  const lightParams: LightTransactParams = {
    nullifierProof: LightProtocol.convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  // Build transaction using Anchor
  const tx = await program.methods
    .transact(
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(nullifier),
      outputCommitments.map(c => Array.from(c)),
      [], // Encrypted notes passed to store_commitment separately
      new BN((params.unshieldAmount ?? 0n).toString()),
      lightParams
    )
    .accountsStrict({
      pool: poolPda,
      commitmentCounter: counterPda,
      tokenVault: vaultPda,
      verificationKey: vkPda,
      unshieldRecipient: params.unshieldRecipient ?? (null as any),
      relayer: params.relayer,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return {
    tx,
    result: {
      nullifier,
      outputCommitments,
      encryptedNotes,
      outputRandomness,
    },
  };
}

/**
 * Helper to compute derived values for circuit inputs
 */
export function computeCircuitInputs(
  input: TransactInput,
  outputs: TransactOutput[],
  tokenMint: PublicKey,
  unshieldAmount: bigint = 0n
): {
  inputCommitment: Uint8Array;
  nullifier: Uint8Array;
  outputCommitments: Uint8Array[];
} {
  // Compute input commitment
  const inputCommitment = computeCommitment({
    stealthPubX: input.stealthPubX,
    tokenMint,
    amount: input.amount,
    randomness: input.randomness,
  });

  // Derive nullifier
  const nullifierKey = deriveNullifierKey(
    new Uint8Array(new BigUint64Array([input.spendingKey]).buffer)
  );
  const nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, input.leafIndex);

  // Compute output commitments
  const outputCommitments = outputs.map(output => {
    const randomness = generateRandomness();
    return computeCommitment({
      stealthPubX: output.recipientPubkey.x,
      tokenMint,
      amount: output.amount,
      randomness,
    });
  });

  return { inputCommitment, nullifier, outputCommitments };
}
