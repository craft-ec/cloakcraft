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
 * Transact parameters (Multi-Phase)
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
  /** Pre-computed output commitments (must match ZK proof) */
  outputCommitments?: Uint8Array[];
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
 * Build transact Phase 1 transaction (Multi-Phase)
 *
 * Multi-phase approach to stay under transaction size limits:
 * - Phase 1 (transact): Verify proof + Verify commitment + Create nullifier + Store pending + Unshield
 * - Phase 2+ (create_commitment): Create each output commitment via generic instruction
 * - Final (close_pending_operation): Close pending operation to reclaim rent
 */
export async function buildTransactWithProgram(
  program: Program,
  params: TransactInstructionParams,
  rpcUrl: string,
  circuitId: string = CIRCUIT_IDS.TRANSFER_1X2
): Promise<{
  tx: any;
  result: TransactResult;
  operationId: Uint8Array;
  pendingCommitments: Array<{
    pool: PublicKey;
    commitment: Uint8Array;
    stealthEphemeralPubkey: Uint8Array;
    encryptedNote: Uint8Array;
  }>;
}> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
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
  let outputCommitments: Uint8Array[] = [];
  const encryptedNotes: Buffer[] = [];
  const outputRandomness: Uint8Array[] = [];
  const stealthEphemeralPubkeys: Uint8Array[] = [];
  const outputAmounts: bigint[] = [];

  // Use pre-computed commitments if provided, otherwise compute them
  if (params.outputCommitments && params.outputCommitments.length === params.outputs.length) {
    outputCommitments = params.outputCommitments;
  }

  for (let i = 0; i < params.outputs.length; i++) {
    const output = params.outputs[i];
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

    // Use pre-computed commitment if available, otherwise compute
    if (!outputCommitments[i]) {
      outputCommitments[i] = output.commitment ?? computeCommitment(note);
    }

    const encrypted = encryptNote(note, output.recipientPubkey);
    encryptedNotes.push(Buffer.from(serializeEncryptedNote(encrypted)));

    // Store the stealth ephemeral pubkey (64 bytes: X + Y)
    // This is used by the scanner to derive the stealth private key for decryption
    // The ECIES ephemeral key is stored inside the encrypted note itself
    if (output.ephemeralPubkey) {
      // For stealth addresses: store the stealth ephemeral for key derivation
      const ephemeralBytes = new Uint8Array(64);
      ephemeralBytes.set(output.ephemeralPubkey.x, 0);
      ephemeralBytes.set(output.ephemeralPubkey.y, 32);
      stealthEphemeralPubkeys.push(ephemeralBytes);
    } else {
      // No stealth ephemeral - for internal operations
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

  // Generate operation ID
  const { generateOperationId, derivePendingOperationPda } = await import('./swap');
  const operationId = generateOperationId(
    nullifier,
    outputCommitments[0],
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);

  console.log(`[Transact Phase 1] Generated operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);
  console.log(`[Transact Phase 1] Nullifier: ${Buffer.from(nullifier).toString('hex').slice(0, 16)}...`);

  // Build pending commitments data (for Phase 2+)
  const pendingCommitments = [];
  for (let i = 0; i < outputCommitments.length; i++) {
    // Skip zero-amount outputs (dummy commitments)
    if (outputAmounts[i] === 0n) continue;

    pendingCommitments.push({
      pool: poolPda,
      commitment: outputCommitments[i],
      stealthEphemeralPubkey: stealthEphemeralPubkeys[i],
      encryptedNote: encryptedNotes[i],
    });
  }

  // SECURITY: Fetch commitment inclusion proof and nullifier non-inclusion proof
  console.log('[Transact] Fetching commitment inclusion proof...');
  const commitmentProof = await lightProtocol.getInclusionProofByHash(params.input.accountHash);

  console.log('[Transact] Fetching nullifier non-inclusion proof...');
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);

  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } =
    lightProtocol.buildRemainingAccounts();

  // Build complete LightTransactParams with all security proofs
  const lightParams: LightTransactParams = {
    commitmentAccountHash: Array.from(new PublicKey(params.input.accountHash).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: addressTreeIndex,
      leafIndex: commitmentProof.leafIndex,
      rootIndex: commitmentProof.rootIndex,
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  // The unshieldRecipient parameter should already be the token account address
  // (not the wallet address - that should be derived by the caller)
  // So we just use it directly without deriving again
  let unshieldRecipientAta: PublicKey | null = null;
  if (params.unshieldRecipient && params.unshieldAmount && params.unshieldAmount > 0n) {
    unshieldRecipientAta = params.unshieldRecipient;
  }

  // Build Phase 1 transaction using new multi-phase signature
  const numCommitments = pendingCommitments.length;
  const tx = await program.methods
    .transact(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(nullifier),
      Array.from(inputCommitment), // Input commitment for inclusion verification
      outputCommitments.map(c => Array.from(c)),
      encryptedNotes.map(e => Buffer.from(e)), // Still passed for events but not stored
      new BN((params.unshieldAmount ?? 0n).toString()),
      numCommitments,
      lightParams
    )
    .accountsStrict({
      pool: poolPda,
      pendingOperation: pendingOpPda,
      tokenVault: vaultPda,
      verificationKey: vkPda,
      unshieldRecipient: unshieldRecipientAta ?? (null as any),
      relayer: params.relayer,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
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
    operationId,
    pendingCommitments,
  };
}

/**
 * Build transact instructions for versioned transaction (Multi-Phase)
 *
 * Transact is a multi-phase operation:
 * - Phase 1 (transact): Verify proof + Verify commitment + Create nullifier + Store pending + Unshield
 * - Phase 2+ (create_commitment): Create each output commitment via generic instruction
 * - Final (close_pending_operation): Close pending operation to reclaim rent
 *
 * This function returns all instructions for atomic execution.
 *
 * @returns Array of instructions in execution order + result data + operation ID
 */
export async function buildTransactInstructionsForVersionedTx(
  program: Program,
  params: TransactInstructionParams,
  rpcUrl: string,
  circuitId: string = CIRCUIT_IDS.TRANSFER_1X2
): Promise<{
  instructions: import('@solana/web3.js').TransactionInstruction[];
  result: TransactResult;
  operationId: Uint8Array;
}> {
  // Import generic instruction builders
  const { buildCreateCommitmentWithProgram, buildClosePendingOperationWithProgram } = await import('./swap');

  // Build Phase 1 transaction
  const { tx: phase1Tx, result, operationId, pendingCommitments } = await buildTransactWithProgram(
    program,
    params,
    rpcUrl,
    circuitId
  );

  const instructions: import('@solana/web3.js').TransactionInstruction[] = [];

  // Add Phase 1 instruction (transact - creates nullifier and stores pending operation)
  const transactIx = await phase1Tx.instruction();
  instructions.push(transactIx);

  // Add Phase 2+ instructions (create commitments)
  for (let i = 0; i < pendingCommitments.length; i++) {
    const pc = pendingCommitments[i];

    const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
      program,
      {
        operationId,
        commitmentIndex: i,
        pool: pc.pool,
        relayer: params.relayer,
        stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
        encryptedNote: pc.encryptedNote,
        commitment: pc.commitment,
      },
      rpcUrl
    );

    const commitmentIx = await commitmentTx.instruction();
    instructions.push(commitmentIx);
  }

  // Add final instruction (close pending operation)
  const { tx: closeTx } = await buildClosePendingOperationWithProgram(
    program,
    operationId,
    params.relayer
  );

  const closeIx = await closeTx.instruction();
  instructions.push(closeIx);

  return { instructions, result, operationId };
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
