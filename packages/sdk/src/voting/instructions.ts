/**
 * Voting Instruction Builders
 *
 * High-level instruction builders for voting operations
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  TransactionSignature,
  Connection,
  Keypair,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';

import {
  BallotConfig,
  VoteSnapshotParams,
  VoteSpendParams,
  ChangeVoteSnapshotParams,
  ClosePositionParams,
  ClaimParams,
  EncryptedContributions,
  RevealMode,
} from './types';
import { PROGRAM_ID } from '../instructions/constants';
import { LightProtocol } from '../instructions/light-helpers';

// ============ PDA Derivation ============

export function deriveBallotPda(
  ballotId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ballot'), Buffer.from(ballotId)],
    programId
  );
}

export function deriveBallotVaultPda(
  ballotId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ballot_vault'), Buffer.from(ballotId)],
    programId
  );
}

export function derivePendingOperationPda(
  operationId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pending_op'), Buffer.from(operationId)],
    programId
  );
}

export function deriveVerificationKeyPda(
  circuitId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vk'), Buffer.from(circuitId)],
    programId
  );
}

// ============ Ballot Management ============

/**
 * Build create_ballot instruction
 */
export async function buildCreateBallotInstruction(
  config: BallotConfig,
  payer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[]> {
  const [ballotPda] = deriveBallotPda(config.ballotId, programId);

  // Build instruction data
  const instructions: TransactionInstruction[] = [];

  // If SpendToVote, create vault
  if (config.bindingMode === 1) {
    const [vaultPda] = deriveBallotVaultPda(config.ballotId, programId);
    // Add vault creation instruction
  }

  // Create ballot instruction
  // Note: In production, would use Anchor's instruction builder

  return instructions;
}

/**
 * Build resolve_ballot instruction
 */
export function buildResolveBallotInstruction(
  ballotId: Uint8Array,
  outcome: number | null,
  resolver: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const [ballotPda] = deriveBallotPda(ballotId, programId);

  // Note: In production, would use Anchor's instruction builder
  return {} as TransactionInstruction;
}

/**
 * Build finalize_ballot instruction
 */
export function buildFinalizeBallotInstruction(
  ballotId: Uint8Array,
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const [ballotPda] = deriveBallotPda(ballotId, programId);

  // Note: In production, would use Anchor's instruction builder
  return {} as TransactionInstruction;
}

/**
 * Build decrypt_tally instruction
 */
export function buildDecryptTallyInstruction(
  ballotId: Uint8Array,
  decryptionKey: Uint8Array,
  authority: PublicKey,
  programId: PublicKey = PROGRAM_ID
): TransactionInstruction {
  const [ballotPda] = deriveBallotPda(ballotId, programId);

  // Note: In production, would use Anchor's instruction builder
  return {} as TransactionInstruction;
}

// ============ Vote Snapshot (Multi-Phase) ============

/**
 * Build vote_snapshot instructions (all phases)
 * Returns array of instructions for each phase
 */
export async function buildVoteSnapshotInstructions(
  params: VoteSnapshotParams,
  proof: Uint8Array,
  rpcUrl: string,
  relayer: PublicKey,
  payer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [ballotPda] = deriveBallotPda(params.ballotId, programId);
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);

  // Phase 0: Create pending with proof
  const phase0Instructions: TransactionInstruction[] = [];
  // ... build phase 0 instruction

  // Phase 1: Create vote nullifier
  const phase1Instructions: TransactionInstruction[] = [];
  // ... build phase 1 instruction (create_nullifier_and_pending)

  // Phase 2: Execute vote
  const phase2Instructions: TransactionInstruction[] = [];
  // ... build phase 2 instruction (execute_vote_snapshot)

  // Phase 3: Create vote commitment
  const phase3Instructions: TransactionInstruction[] = [];
  // ... build phase 3 instruction (create_commitment via Light Protocol)

  // Phase 4: Close pending operation
  const phase4Instructions: TransactionInstruction[] = [];
  // ... build phase 4 instruction

  return [
    phase0Instructions,
    phase1Instructions,
    phase2Instructions,
    phase3Instructions,
    phase4Instructions,
  ];
}

// ============ Change Vote Snapshot (Multi-Phase) ============

/**
 * Build change_vote_snapshot instructions (all phases)
 */
export async function buildChangeVoteSnapshotInstructions(
  params: ChangeVoteSnapshotParams,
  proof: Uint8Array,
  rpcUrl: string,
  relayer: PublicKey,
  payer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Similar structure to vote_snapshot but with old commitment verification
  // and nullification

  return [];
}

// ============ Vote Spend (Multi-Phase) ============

/**
 * Build vote_spend instructions (all phases)
 */
export async function buildVoteSpendInstructions(
  params: VoteSpendParams,
  proof: Uint8Array,
  rpcUrl: string,
  relayer: PublicKey,
  payer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Phase 0: Create pending with proof
  // Phase 1: Verify input commitment exists
  // Phase 2: Create spending nullifier
  // Phase 3: Execute vote spend (transfer tokens to vault)
  // Phase 4: Create position commitment
  // Phase 5: Close pending operation

  return [];
}

// ============ Close Position (Multi-Phase) ============

/**
 * Build close_position instructions (all phases)
 */
export async function buildClosePositionInstructions(
  params: ClosePositionParams,
  proof: Uint8Array,
  rpcUrl: string,
  relayer: PublicKey,
  payer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Phase 0: Create pending with proof
  // Phase 1: Verify position exists
  // Phase 2: Create position nullifier
  // Phase 3: Execute close position (decrement tally)
  // Phase 4: Create new token commitment
  // Phase 5: Close pending operation

  return [];
}

// ============ Claim (Multi-Phase) ============

/**
 * Build claim instructions (all phases)
 */
export async function buildClaimInstructions(
  params: ClaimParams,
  proof: Uint8Array,
  rpcUrl: string,
  relayer: PublicKey,
  payer: PublicKey,
  programId: PublicKey = PROGRAM_ID
): Promise<TransactionInstruction[][]> {
  const operationId = generateOperationId();
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Phase 0: Create pending with proof
  // Phase 1: Verify position exists
  // Phase 2: Create position nullifier (prevents double-claim)
  // Phase 3: Execute claim (transfer payout)
  // Phase 4: Create payout commitment
  // Phase 5: Close pending operation

  return [];
}

// ============ Encrypted Contributions ============

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
    const value = i === voteChoice ? weight : BigInt(0);
    const ciphertext = encryptElGamal(value, timeLockPubkey, encryptionSeed, i);
    ciphertexts.push(ciphertext);
  }

  return { ciphertexts };
}

/**
 * Generate negated encrypted contributions for close position
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
    const value = i === voteChoice ? -weight : BigInt(0);
    const ciphertext = encryptElGamal(value, timeLockPubkey, encryptionSeed, i);
    ciphertexts.push(ciphertext);
  }

  return { ciphertexts };
}

// ============ Helpers ============

/**
 * Generate a random operation ID
 */
function generateOperationId(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

/**
 * ElGamal encryption placeholder
 * In production, would use actual curve operations
 */
function encryptElGamal(
  value: bigint,
  pubkey: Uint8Array,
  seed: Uint8Array,
  index: number
): Uint8Array {
  // Placeholder - would use actual ElGamal encryption
  // C = (g^r, h^r * g^m) where h is pubkey, m is value
  const ciphertext = new Uint8Array(64);

  // In production:
  // 1. Derive per-option randomness: r = hash(seed, index)
  // 2. Compute C1 = g^r (32 bytes)
  // 3. Compute C2 = h^r * g^m (32 bytes)

  return ciphertext;
}

/**
 * Circuit IDs for verification key lookup
 */
export const CIRCUIT_IDS = {
  VOTE_SNAPSHOT: new TextEncoder().encode('vote_snapshot___________________'),
  CHANGE_VOTE_SNAPSHOT: new TextEncoder().encode('change_vote_snapshot____________'),
  VOTE_SPEND: new TextEncoder().encode('vote_spend______________________'),
  CLOSE_POSITION: new TextEncoder().encode('close_position__________________'),
  CLAIM: new TextEncoder().encode('claim___________________________'),
};
