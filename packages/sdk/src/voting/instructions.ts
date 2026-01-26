/**
 * Voting Instruction Builders
 *
 * High-level instruction builders for voting operations.
 * Uses multi-phase pattern for complex ZK operations.
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Program, BN } from '@coral-xyz/anchor';

import {
  BallotConfig,
  VoteSnapshotParams,
  VoteSpendParams,
  ChangeVoteSnapshotParams,
  ClosePositionParams,
  ClaimParams,
  EncryptedContributions,
  RevealMode,
  VoteBindingMode,
} from './types';
import { PROGRAM_ID } from '../instructions/constants';
import { fieldToBytes, bytesToField, poseidonHashDomain } from '../crypto/poseidon';
import { generateRandomness } from '../crypto/commitment';

// ============ Voting Seeds ============

export const VOTING_SEEDS = {
  BALLOT: Buffer.from('ballot'),
  BALLOT_VAULT: Buffer.from('ballot_vault'),
  PENDING_OP: Buffer.from('pending_op'),
  VK: Buffer.from('vk'),
} as const;

// ============ Circuit IDs ============
// Must match on-chain constants in constants.rs with underscore padding

export const CIRCUIT_IDS = {
  // Voting circuits - 32 bytes, underscore-padded (must match constants.rs)
  VOTE_SNAPSHOT: Buffer.from('vote_snapshot___________________'), // 32 chars
  CHANGE_VOTE_SNAPSHOT: Buffer.from('change_vote_snapshot____________'), // 32 chars
  VOTE_SPEND: Buffer.from('vote_spend______________________'), // 32 chars
  CLOSE_POSITION: Buffer.from('close_position__________________'), // 32 chars - shared with perps
  CLAIM: Buffer.from('claim___________________________'), // 32 chars
};

// ============ PDA Derivation ============

export function deriveBallotPda(
  ballotId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VOTING_SEEDS.BALLOT, Buffer.from(ballotId)],
    programId
  );
}

export function deriveBallotVaultPda(
  ballotId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VOTING_SEEDS.BALLOT_VAULT, Buffer.from(ballotId)],
    programId
  );
}

export function derivePendingOperationPda(
  operationId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VOTING_SEEDS.PENDING_OP, Buffer.from(operationId)],
    programId
  );
}

export function deriveVerificationKeyPda(
  circuitId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [VOTING_SEEDS.VK, Buffer.from(circuitId)],
    programId
  );
}

// ============ Operation ID Generation ============

export function generateOperationId(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

// ============ Ballot Management ============

export interface CreateBallotInstructionParams {
  ballotId: Uint8Array;
  bindingMode: { snapshot: {} } | { spendToVote: {} };
  revealMode: { public: {} } | { timeLocked: {} } | { permanentPrivate: {} };
  voteType: { single: {} } | { approval: {} } | { ranked: {} } | { weighted: {} };
  resolutionMode: { tallyBased: {} } | { oracle: {} } | { authority: {} };
  numOptions: number;
  quorumThreshold: bigint;
  protocolFeeBps: number;
  protocolTreasury: PublicKey;
  startTime: number;
  endTime: number;
  snapshotSlot: number;
  indexerPubkey: PublicKey;
  eligibilityRoot: Uint8Array | null;
  weightFormula: number[];
  weightParams: bigint[];
  timeLockPubkey: Uint8Array;
  unlockSlot: number;
  resolver: PublicKey | null;
  oracle: PublicKey | null;
  claimDeadline: number;
}

/**
 * Build create_ballot instruction using Anchor program
 */
export async function buildCreateBallotInstruction(
  program: Program,
  params: CreateBallotInstructionParams,
  tokenMint: PublicKey,
  authority: PublicKey,
  payer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [vaultPda] = deriveBallotVaultPda(params.ballotId, programId);

  // Determine if vault is needed
  const isSpendToVote = 'spendToVote' in params.bindingMode;

  const accounts: any = {
    ballot: ballotPda,
    tokenMint,
    authority,
    payer,
    systemProgram: SystemProgram.programId,
    tokenProgram: TOKEN_PROGRAM_ID,
  };

  // Only include vault for SpendToVote mode
  if (isSpendToVote) {
    accounts.ballotVault = vaultPda;
  }

  return program.methods
    .createBallot(
      Array.from(params.ballotId),
      {
        bindingMode: params.bindingMode,
        revealMode: params.revealMode,
        voteType: params.voteType,
        resolutionMode: params.resolutionMode,
        numOptions: params.numOptions,
        quorumThreshold: new BN(params.quorumThreshold.toString()),
        protocolFeeBps: params.protocolFeeBps,
        protocolTreasury: params.protocolTreasury,
        startTime: new BN(params.startTime),
        endTime: new BN(params.endTime),
        snapshotSlot: new BN(params.snapshotSlot),
        indexerPubkey: params.indexerPubkey,
        eligibilityRoot: params.eligibilityRoot ? Array.from(params.eligibilityRoot) : null,
        weightFormula: Buffer.from(params.weightFormula),
        weightParams: params.weightParams.map(p => new BN(p.toString())),
        timeLockPubkey: Array.from(params.timeLockPubkey),
        unlockSlot: new BN(params.unlockSlot),
        resolver: params.resolver,
        oracle: params.oracle,
        claimDeadline: new BN(params.claimDeadline),
      }
    )
    .accounts(accounts)
    .instruction();
}

/**
 * Build resolve_ballot instruction
 *
 * @param resolver - Optional resolver (required for Authority mode)
 * @param authority - Signer (required for all modes)
 */
export async function buildResolveBallotInstruction(
  program: Program,
  ballotId: Uint8Array,
  outcome: number | null,
  authority: PublicKey,
  resolver?: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);

  // Build accounts - resolver is optional
  const accounts: Record<string, PublicKey> = {
    ballot: ballotPda,
    authority,
  };

  // Only add resolver if provided (for Authority mode)
  if (resolver) {
    accounts.resolver = resolver;
  }

  return program.methods
    .resolveBallot(Array.from(ballotId), outcome !== null ? outcome : null)
    .accounts(accounts)
    .instruction();
}

/**
 * Build finalize_ballot instruction
 */
export async function buildFinalizeBallotInstruction(
  program: Program,
  ballotId: Uint8Array,
  tokenMint: PublicKey,
  protocolTreasury: PublicKey,
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [vaultPda] = deriveBallotVaultPda(ballotId, programId);
  const treasuryAta = getAssociatedTokenAddressSync(tokenMint, protocolTreasury);

  return program.methods
    .finalizeBallot()
    .accounts({
      ballot: ballotPda,
      ballotVault: vaultPda,
      treasury: treasuryAta,
      authority,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

/**
 * Build decrypt_tally instruction
 */
export async function buildDecryptTallyInstruction(
  program: Program,
  ballotId: Uint8Array,
  decryptionKey: Uint8Array,
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);

  return program.methods
    .decryptTally(Array.from(decryptionKey))
    .accounts({
      ballot: ballotPda,
      authority,
    })
    .instruction();
}

// ============ Vote Snapshot (Multi-Phase) ============

export interface VoteSnapshotInstructionParams {
  ballotId: Uint8Array;
  snapshotMerkleRoot: Uint8Array; // 32-byte merkle root at snapshot slot
  noteCommitment: Uint8Array; // 32-byte commitment of the shielded note being used
  voteNullifier: Uint8Array;
  voteCommitment: Uint8Array;
  voteChoice: number;
  amount: bigint; // Note amount (voting weight base)
  weight: bigint;
  proof: Uint8Array;
  outputRandomness: Uint8Array; // 32-byte randomness for output commitment
  encryptedContributions?: Uint8Array[]; // For encrypted modes
  encryptedPreimage?: Uint8Array; // For claim recovery
}

/**
 * Build vote_snapshot Phase 0 instruction (create pending with proof)
 *
 * Note-based ownership proof: User proves they own a shielded note WITHOUT spending it.
 * The note stays intact - user just proves ownership for voting weight via merkle proof.
 *
 * On-chain expects:
 * - operation_id: [u8; 32]
 * - ballot_id: [u8; 32]
 * - proof: Vec<u8>
 * - snapshot_merkle_root: [u8; 32]
 * - note_commitment: [u8; 32]
 * - vote_nullifier: [u8; 32]
 * - vote_commitment: [u8; 32]
 * - vote_choice: u64
 * - amount: u64
 * - weight: u64
 * - encrypted_contributions: Option<EncryptedContributions>
 * - encrypted_preimage: Option<Vec<u8>>
 * - output_randomness: [u8; 32]
 */
export async function buildVoteSnapshotPhase0Instruction(
  program: Program,
  params: VoteSnapshotInstructionParams,
  operationId: Uint8Array,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.VOTE_SNAPSHOT, programId);

  return program.methods
    .createPendingWithProofVoteSnapshot(
      Array.from(operationId),
      Array.from(params.ballotId),
      Buffer.from(params.proof), // bytes type needs Buffer
      Array.from(params.snapshotMerkleRoot),
      Array.from(params.noteCommitment),
      Array.from(params.voteNullifier),
      Array.from(params.voteCommitment),
      new BN(params.voteChoice),
      new BN(params.amount.toString()),
      new BN(params.weight.toString()),
      params.encryptedContributions ? { ciphertexts: params.encryptedContributions.map(c => Array.from(c)) } : null,
      params.encryptedPreimage ? Buffer.from(params.encryptedPreimage) : null, // bytes type needs Buffer
      Array.from(params.outputRandomness)
    )
    .accounts({
      ballot: ballotPda,
      pendingOperation: pendingOpPda,
      verificationKey: vkPda,
      relayer,
      payer,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Build vote_snapshot Phase 2 instruction (execute vote)
 */
export async function buildVoteSnapshotExecuteInstruction(
  program: Program,
  operationId: Uint8Array,
  ballotId: Uint8Array,
  relayer: PublicKey,
  encryptedContributions: Uint8Array[] | null = null,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);

  return program.methods
    .executeVoteSnapshot(
      Array.from(operationId),
      Array.from(ballotId),
      encryptedContributions ? { ciphertexts: encryptedContributions.map(c => Array.from(c)) } : null
    )
    .accounts({
      ballot: ballotPda,
      pendingOperation: pendingOpPda,
      relayer,
    })
    .instruction();
}

// ============ Change Vote Snapshot (Multi-Phase) ============

export interface ChangeVoteSnapshotInstructionParams {
  ballotId: Uint8Array;
  oldVoteCommitment: Uint8Array;
  oldVoteCommitmentNullifier: Uint8Array;
  newVoteCommitment: Uint8Array;
  voteNullifier: Uint8Array;
  oldVoteChoice: number;
  newVoteChoice: number;
  weight: bigint;
  proof: Uint8Array;
  oldEncryptedContributions?: Uint8Array[]; // Negated for tally decrement
  newEncryptedContributions?: Uint8Array[];
}

/**
 * Build change_vote_snapshot Phase 0 instruction
 */
export async function buildChangeVoteSnapshotPhase0Instruction(
  program: Program,
  params: ChangeVoteSnapshotInstructionParams,
  operationId: Uint8Array,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.CHANGE_VOTE_SNAPSHOT, programId);

  return program.methods
    .createPendingWithProofChangeVoteSnapshot(
      Array.from(operationId),
      Array.from(params.oldVoteCommitment),
      Array.from(params.oldVoteCommitmentNullifier),
      Array.from(params.newVoteCommitment),
      Array.from(params.voteNullifier),
      params.oldVoteChoice,
      params.newVoteChoice,
      new BN(params.weight.toString()),
      Array.from(params.proof),
      params.oldEncryptedContributions?.map(c => Array.from(c)) || null,
      params.newEncryptedContributions?.map(c => Array.from(c)) || null
    )
    .accounts({
      ballot: ballotPda,
      pendingOperation: pendingOpPda,
      verificationKey: vkPda,
      relayer,
      payer,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Build change_vote_snapshot execute instruction
 */
export async function buildChangeVoteSnapshotExecuteInstruction(
  program: Program,
  operationId: Uint8Array,
  ballotId: Uint8Array,
  relayer: PublicKey,
  oldEncryptedContributions: Uint8Array[] | null = null,
  newEncryptedContributions: Uint8Array[] | null = null,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);

  return program.methods
    .executeChangeVoteSnapshot(
      Array.from(operationId),
      Array.from(ballotId),
      oldEncryptedContributions ? { ciphertexts: oldEncryptedContributions.map(c => Array.from(c)) } : null,
      newEncryptedContributions ? { ciphertexts: newEncryptedContributions.map(c => Array.from(c)) } : null
    )
    .accounts({
      ballot: ballotPda,
      pendingOperation: pendingOpPda,
      relayer,
    })
    .instruction();
}

// ============ Verify Vote Commitment Exists (Phase 1) ============

/**
 * Merkle context for vote commitment verification
 */
export interface VoteCommitmentMerkleContext {
  merkleTreePubkeyIndex: number;
  queuePubkeyIndex: number;
  leafIndex: number;
  rootIndex: number;
}

/**
 * Parameters for verifying vote commitment exists
 */
export interface LightVerifyVoteCommitmentParams {
  commitmentAccountHash: Uint8Array;
  commitmentMerkleContext: VoteCommitmentMerkleContext;
  commitmentInclusionProof: {
    rootIndices: number[];
    proof: Uint8Array[];
  };
  commitmentAddressTreeInfo: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
  };
}

/**
 * Build verify_vote_commitment_exists instruction (Phase 1)
 *
 * Voting-specific commitment verification for operations that spend existing commitments.
 * Uses Ballot account instead of Pool account.
 *
 * Required for:
 * - change_vote_snapshot: Verify old_vote_commitment exists
 * - vote_spend: Verify token note commitment exists
 * - change_vote_spend: Verify old position commitment exists
 * - close_position: Verify position commitment exists
 * - claim: Verify position commitment exists
 */
export async function buildVerifyVoteCommitmentExistsInstruction(
  program: Program,
  operationId: Uint8Array,
  ballotId: Uint8Array,
  commitmentIndex: number,
  lightParams: LightVerifyVoteCommitmentParams,
  relayer: PublicKey,
  remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[],
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);

  // Convert params to on-chain format
  const onChainParams = {
    commitmentAccountHash: Array.from(lightParams.commitmentAccountHash),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: lightParams.commitmentMerkleContext.merkleTreePubkeyIndex,
      queuePubkeyIndex: lightParams.commitmentMerkleContext.queuePubkeyIndex,
      leafIndex: lightParams.commitmentMerkleContext.leafIndex,
      rootIndex: lightParams.commitmentMerkleContext.rootIndex,
    },
    commitmentInclusionProof: {
      rootIndices: lightParams.commitmentInclusionProof.rootIndices,
      proof: lightParams.commitmentInclusionProof.proof.map(p => Array.from(p)),
    },
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: lightParams.commitmentAddressTreeInfo.addressMerkleTreePubkeyIndex,
      addressQueuePubkeyIndex: lightParams.commitmentAddressTreeInfo.addressQueuePubkeyIndex,
    },
  };

  return program.methods
    .verifyVoteCommitmentExists(
      Array.from(operationId),
      Array.from(ballotId),
      commitmentIndex,
      onChainParams
    )
    .accounts({
      ballot: ballotPda,
      pendingOperation: pendingOpPda,
      relayer,
    })
    .remainingAccounts(remainingAccounts)
    .instruction();
}

// ============ Vote Spend (Multi-Phase) ============

export interface VoteSpendInstructionParams {
  ballotId: Uint8Array;
  spendingNullifier: Uint8Array;
  positionCommitment: Uint8Array;
  voteChoice: number;
  amount: bigint;
  weight: bigint;
  proof: Uint8Array;
  encryptedContributions?: Uint8Array[];
  encryptedPreimage?: Uint8Array;
}

/**
 * Build vote_spend Phase 0 instruction
 */
export async function buildVoteSpendPhase0Instruction(
  program: Program,
  params: VoteSpendInstructionParams,
  operationId: Uint8Array,
  inputCommitment: Uint8Array,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.VOTE_SPEND, programId);

  return program.methods
    .createPendingWithProofVoteSpend(
      Array.from(operationId),
      Array.from(inputCommitment),
      Array.from(params.spendingNullifier),
      Array.from(params.positionCommitment),
      params.voteChoice,
      new BN(params.amount.toString()),
      new BN(params.weight.toString()),
      Array.from(params.proof),
      params.encryptedContributions?.map(c => Array.from(c)) || null,
      params.encryptedPreimage ? Array.from(params.encryptedPreimage) : null
    )
    .accounts({
      ballot: ballotPda,
      pendingOperation: pendingOpPda,
      verificationKey: vkPda,
      relayer,
      payer,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Build vote_spend execute instruction
 */
export async function buildVoteSpendExecuteInstruction(
  program: Program,
  operationId: Uint8Array,
  ballotId: Uint8Array,
  tokenMint: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vaultPda] = deriveBallotVaultPda(ballotId, programId);

  return program.methods
    .executeVoteSpend()
    .accounts({
      ballot: ballotPda,
      ballotVault: vaultPda,
      pendingOperation: pendingOpPda,
      relayer,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

// ============ Close Vote Position (Multi-Phase) ============

export interface CloseVotePositionInstructionParams {
  ballotId: Uint8Array;
  positionCommitment: Uint8Array;
  positionNullifier: Uint8Array;
  newTokenCommitment: Uint8Array;
  voteChoice: number;
  amount: bigint;
  weight: bigint;
  proof: Uint8Array;
  encryptedContributions?: Uint8Array[]; // Negated for tally decrement
}

/**
 * Build close_vote_position Phase 0 instruction
 */
export async function buildCloseVotePositionPhase0Instruction(
  program: Program,
  params: CloseVotePositionInstructionParams,
  operationId: Uint8Array,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.CLOSE_POSITION, programId);

  return program.methods
    .createPendingWithProofCloseVotePosition(
      Array.from(operationId),
      Array.from(params.positionCommitment),
      Array.from(params.positionNullifier),
      Array.from(params.newTokenCommitment),
      params.voteChoice,
      new BN(params.amount.toString()),
      new BN(params.weight.toString()),
      Array.from(params.proof),
      params.encryptedContributions?.map(c => Array.from(c)) || null
    )
    .accounts({
      ballot: ballotPda,
      pendingOperation: pendingOpPda,
      verificationKey: vkPda,
      relayer,
      payer,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Build close_vote_position execute instruction
 */
export async function buildCloseVotePositionExecuteInstruction(
  program: Program,
  operationId: Uint8Array,
  ballotId: Uint8Array,
  tokenMint: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vaultPda] = deriveBallotVaultPda(ballotId, programId);

  return program.methods
    .executeCloseVotePosition()
    .accounts({
      ballot: ballotPda,
      ballotVault: vaultPda,
      pendingOperation: pendingOpPda,
      relayer,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

// ============ Claim (Multi-Phase) ============

export interface ClaimInstructionParams {
  ballotId: Uint8Array;
  positionCommitment: Uint8Array;
  positionNullifier: Uint8Array;
  payoutCommitment: Uint8Array;
  voteChoice: number;
  grossPayout: bigint;
  netPayout: bigint;
  userWeight: bigint;
  proof: Uint8Array;
}

/**
 * Build claim Phase 0 instruction
 */
export async function buildClaimPhase0Instruction(
  program: Program,
  params: ClaimInstructionParams,
  operationId: Uint8Array,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.CLAIM, programId);

  return program.methods
    .createPendingWithProofClaim(
      Array.from(operationId),
      Array.from(params.positionCommitment),
      Array.from(params.positionNullifier),
      Array.from(params.payoutCommitment),
      params.voteChoice,
      new BN(params.grossPayout.toString()),
      new BN(params.netPayout.toString()),
      new BN(params.userWeight.toString()),
      Array.from(params.proof)
    )
    .accounts({
      ballot: ballotPda,
      pendingOperation: pendingOpPda,
      verificationKey: vkPda,
      relayer,
      payer,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
}

/**
 * Build claim execute instruction
 */
export async function buildClaimExecuteInstruction(
  program: Program,
  operationId: Uint8Array,
  ballotId: Uint8Array,
  tokenMint: PublicKey,
  protocolTreasury: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction> {
  const [ballotPda] = deriveBallotPda(ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vaultPda] = deriveBallotVaultPda(ballotId, programId);
  const treasuryAta = getAssociatedTokenAddressSync(tokenMint, protocolTreasury);

  return program.methods
    .executeClaim()
    .accounts({
      ballot: ballotPda,
      ballotVault: vaultPda,
      treasury: treasuryAta,
      pendingOperation: pendingOpPda,
      relayer,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .instruction();
}

// ============ Encrypted Contributions ============

// BN254 scalar field modulus
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Generate encrypted contributions for encrypted modes
 * Each option gets an ElGamal ciphertext of the weight (or 0 if not voted for)
 */
export function generateEncryptedContributions(
  voteChoice: number,
  weight: bigint,
  numOptions: number,
  timeLockPubkey: Uint8Array,
  encryptionSeed: Uint8Array
): EncryptedContributions {
  const ciphertexts: Uint8Array[] = [];

  for (let i = 0; i < numOptions; i++) {
    // Encrypt weight for chosen option, 0 for others
    const value = i === voteChoice ? weight : 0n;
    const ciphertext = encryptElGamal(value, timeLockPubkey, encryptionSeed, i);
    ciphertexts.push(ciphertext);
  }

  return { ciphertexts };
}

/**
 * Generate negated encrypted contributions for close position / vote change
 */
export function generateNegatedEncryptedContributions(
  voteChoice: number,
  weight: bigint,
  numOptions: number,
  timeLockPubkey: Uint8Array,
  encryptionSeed: Uint8Array
): EncryptedContributions {
  const ciphertexts: Uint8Array[] = [];

  for (let i = 0; i < numOptions; i++) {
    // Encrypt negated weight for chosen option
    // In the field, negation is: -x = p - x where p is the field modulus
    const value = i === voteChoice ? (FIELD_MODULUS - weight) % FIELD_MODULUS : 0n;
    const ciphertext = encryptElGamal(value, timeLockPubkey, encryptionSeed, i);
    ciphertexts.push(ciphertext);
  }

  return { ciphertexts };
}

/**
 * ElGamal encryption on BabyJubJub curve
 *
 * C = (g^r, h^r * g^m) where:
 * - g is the generator
 * - h is the public key
 * - r is random
 * - m is the message (weight)
 */
function encryptElGamal(
  value: bigint,
  pubkey: Uint8Array,
  seed: Uint8Array,
  index: number
): Uint8Array {
  // Derive per-option randomness deterministically from seed
  const indexBytes = new Uint8Array(4);
  new DataView(indexBytes.buffer).setUint32(0, index, true);
  const combined = new Uint8Array(seed.length + 4);
  combined.set(seed);
  combined.set(indexBytes, seed.length);

  // Hash to get randomness r
  const rHash = poseidonHashDomain(0x42n, combined);
  const r = bytesToField(rHash);

  // Convert pubkey to point (h)
  const h = bytesToField(pubkey);

  // ElGamal encryption:
  // C1 = r (scalar) - would be g^r in actual implementation
  // C2 = h*r + m - simplified additive ElGamal
  const c1 = r % FIELD_MODULUS;
  const c2 = ((h * r) % FIELD_MODULUS + value) % FIELD_MODULUS;

  // Pack into 64 bytes (32 for C1, 32 for C2)
  const ciphertext = new Uint8Array(64);
  const c1Bytes = fieldToBytes(c1);
  const c2Bytes = fieldToBytes(c2);
  ciphertext.set(c1Bytes, 0);
  ciphertext.set(c2Bytes, 32);

  return ciphertext;
}

// ============ High-Level Multi-Phase Builders ============

/**
 * Build all vote_snapshot instructions for multi-phase execution
 * Returns array of instruction arrays for each phase
 */
export async function buildVoteSnapshotInstructions(
  program: Program,
  params: VoteSnapshotInstructionParams,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();

  // Phase 0: Create pending with proof
  const phase0 = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    await buildVoteSnapshotPhase0Instruction(program, params, operationId, payer, relayer, programId),
  ];

  // Phase 1-2 would include Light Protocol CPI for nullifier creation
  // and execute vote - simplified for now

  // Phase 2: Execute vote
  const phase2 = [
    await buildVoteSnapshotExecuteInstruction(program, operationId, params.ballotId, relayer, params.encryptedContributions || null, programId),
  ];

  // Phase 3-4 would include Light Protocol CPI for commitment creation
  // and close pending operation

  return [phase0, phase2];
}

/**
 * Build all change_vote_snapshot instructions for multi-phase execution
 */
export async function buildChangeVoteSnapshotInstructions(
  program: Program,
  params: ChangeVoteSnapshotInstructionParams,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();

  // Phase 0: Create pending with proof
  const phase0 = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    await buildChangeVoteSnapshotPhase0Instruction(program, params, operationId, payer, relayer, programId),
  ];

  // Phase 2: Execute change vote
  const phase2 = [
    await buildChangeVoteSnapshotExecuteInstruction(
      program,
      operationId,
      params.ballotId,
      relayer,
      params.oldEncryptedContributions || null,
      params.newEncryptedContributions || null,
      programId
    ),
  ];

  return [phase0, phase2];
}

/**
 * Build all vote_spend instructions for multi-phase execution
 */
export async function buildVoteSpendInstructions(
  program: Program,
  params: VoteSpendInstructionParams,
  inputCommitment: Uint8Array,
  tokenMint: PublicKey,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();

  // Phase 0: Create pending with proof
  const phase0 = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    await buildVoteSpendPhase0Instruction(program, params, operationId, inputCommitment, payer, relayer, programId),
  ];

  // Phase 2: Execute vote spend
  const phase2 = [
    await buildVoteSpendExecuteInstruction(program, operationId, params.ballotId, tokenMint, relayer, programId),
  ];

  return [phase0, phase2];
}

/**
 * Build all close_position instructions for multi-phase execution
 */
export async function buildClosePositionInstructions(
  program: Program,
  params: CloseVotePositionInstructionParams,
  tokenMint: PublicKey,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();

  // Phase 0: Create pending with proof
  const phase0 = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    await buildCloseVotePositionPhase0Instruction(program, params, operationId, payer, relayer, programId),
  ];

  // Phase 2: Execute close position
  const phase2 = [
    await buildCloseVotePositionExecuteInstruction(program, operationId, params.ballotId, tokenMint, relayer, programId),
  ];

  return [phase0, phase2];
}

/**
 * Build all claim instructions for multi-phase execution
 */
export async function buildClaimInstructions(
  program: Program,
  params: ClaimInstructionParams,
  tokenMint: PublicKey,
  protocolTreasury: PublicKey,
  payer: PublicKey,
  relayer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();

  // Phase 0: Create pending with proof
  const phase0 = [
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    await buildClaimPhase0Instruction(program, params, operationId, payer, relayer, programId),
  ];

  // Phase 2: Execute claim
  const phase2 = [
    await buildClaimExecuteInstruction(program, operationId, params.ballotId, tokenMint, protocolTreasury, relayer, programId),
  ];

  return [phase0, phase2];
}
