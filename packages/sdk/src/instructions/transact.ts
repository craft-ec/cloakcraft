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
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
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
  /** Amount */
  amount: bigint;
  /** Randomness */
  randomness: Uint8Array;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Spending key for this note */
  spendingKey: bigint;
  /** Account hash from scanning (for commitment existence proof) */
  accountHash: string;
}

/**
 * Output note to create
 */
export interface TransactOutput {
  /** Recipient's stealth public key */
  recipientPubkey: Point;
  /** Ephemeral public key for stealth derivation (stored on-chain for recipient scanning) */
  ephemeralPubkey?: Point;
  /** Amount */
  amount: bigint;
  /** Pre-computed commitment (if already computed for ZK proof) */
  commitment?: Uint8Array;
  /** Pre-computed randomness (if already computed for ZK proof) */
  randomness?: Uint8Array;
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
  /** Pre-computed nullifier (must match ZK proof) */
  nullifier?: Uint8Array;
  /** Pre-computed input commitment (must match ZK proof) */
  inputCommitment?: Uint8Array;
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
  /** Stealth ephemeral pubkeys for each output (64 bytes each: X + Y) */
  stealthEphemeralPubkeys: Uint8Array[];
  /** Output amounts (for filtering 0-amount outputs) */
  outputAmounts: bigint[];
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

  // Use pre-computed nullifier and commitment if provided (must match ZK proof)
  // Otherwise compute them (but this may not match if stealth keys are involved)
  let nullifier: Uint8Array;
  let inputCommitment: Uint8Array;

  if (params.nullifier && params.inputCommitment) {
    nullifier = params.nullifier;
    inputCommitment = params.inputCommitment;
  } else {
    // Fallback: compute locally (may not work with stealth addresses)
    const nullifierKey = deriveNullifierKey(
      new Uint8Array(new BigUint64Array([params.input.spendingKey]).buffer)
    );
    inputCommitment = computeCommitment({
      stealthPubX: params.input.stealthPubX,
      tokenMint: params.tokenMint,
      amount: params.input.amount,
      randomness: params.input.randomness,
    });
    nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, params.input.leafIndex);
  }

  // Create output notes and commitments
  const outputCommitments: Uint8Array[] = [];
  const encryptedNotes: Buffer[] = [];
  const outputRandomness: Uint8Array[] = [];
  const stealthEphemeralPubkeys: Uint8Array[] = [];
  const outputAmounts: bigint[] = [];

  for (const output of params.outputs) {
    outputAmounts.push(output.amount);
    // Use pre-computed randomness if provided (must match ZK proof), otherwise generate new
    const randomness = output.randomness ?? generateRandomness();
    outputRandomness.push(randomness);

    const note = {
      stealthPubX: output.recipientPubkey.x,
      tokenMint: params.tokenMint,
      amount: output.amount,
      randomness,
    };

    // Use pre-computed commitment if provided (must match ZK proof), otherwise compute
    const commitment = output.commitment ?? computeCommitment(note);
    outputCommitments.push(commitment);

    const encrypted = encryptNote(note, output.recipientPubkey);
    encryptedNotes.push(Buffer.from(serializeEncryptedNote(encrypted)));

    // Store the stealth ephemeral pubkey (64 bytes: X + Y)
    // This allows recipients to derive the stealth private key for decryption
    if (output.ephemeralPubkey) {
      const ephemeralBytes = new Uint8Array(64);
      ephemeralBytes.set(output.ephemeralPubkey.x, 0);
      ephemeralBytes.set(output.ephemeralPubkey.y, 32);
      stealthEphemeralPubkeys.push(ephemeralBytes);
    } else {
      // No ephemeral pubkey - use zeros (internal operation)
      stealthEphemeralPubkeys.push(new Uint8Array(64));
    }
  }

  // For transfer_1x2 circuit, pad with dummy second output if only 1 output provided
  // The dummy commitment must match what the ZK proof computed: Poseidon(domain, 0, tokenMint, 0, 0)
  if (circuitId === CIRCUIT_IDS.TRANSFER_1X2 && outputCommitments.length === 1) {
    const dummyCommitment = computeCommitment({
      stealthPubX: new Uint8Array(32), // zeros
      tokenMint: params.tokenMint,
      amount: 0n,
      randomness: new Uint8Array(32), // zeros
    });
    outputCommitments.push(dummyCommitment);
    outputRandomness.push(new Uint8Array(32));
    stealthEphemeralPubkeys.push(new Uint8Array(64)); // zeros for dummy output
    encryptedNotes.push(Buffer.alloc(0)); // empty for dummy output
    outputAmounts.push(0n); // dummy has 0 amount
  }

  // Get combined validity proof:
  // - Commitment exists (inclusion) - prevents fake commitment attacks
  // - Nullifier doesn't exist (non-inclusion) - prevents double-spend
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
  const combinedProof = await lightProtocol.getCombinedValidityProof(
    params.input.accountHash,
    nullifierAddress
  );
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();

  const lightParams: LightTransactParams = {
    validityProof: LightProtocol.convertCompressedProof(combinedProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: combinedProof.rootIndices[1] ?? 0, // Index 1 is for address tree (nullifier)
    },
    outputTreeIndex,
  };

  // Derive unshield recipient token account (ATA) if wallet address provided
  let unshieldRecipientAta: PublicKey | null = null;
  if (params.unshieldRecipient && params.unshieldAmount && params.unshieldAmount > 0n) {
    // Derive the associated token account for the recipient wallet
    unshieldRecipientAta = getAssociatedTokenAddressSync(
      params.tokenMint,
      params.unshieldRecipient,
      true // allowOwnerOffCurve - in case recipient is a PDA
    );
  }

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
      unshieldRecipient: unshieldRecipientAta ?? (null as any),
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
      stealthEphemeralPubkeys,
      outputAmounts,
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
