/**
 * Voting Module
 *
 * Privacy-preserving voting protocol supporting:
 * - Snapshot voting (tokens stay liquid) and SpendToVote (tokens locked)
 * - Public, TimeLocked, and PermanentPrivate reveal modes
 * - Single, Approval, Ranked, and Weighted vote types
 * - TallyBased, Oracle, and Authority resolution
 */

// Export types with voting prefix to avoid conflicts
export {
  // Enums
  VoteBindingMode,
  RevealMode,
  VoteType,
  ResolutionMode,
  BallotStatus,
  WeightOp,

  // Types - export with aliases to avoid conflicts
  type BallotConfig as VotingBallotConfig,
  type Ballot,
  type VoteSnapshotParams,
  type VoteSpendParams,
  type ChangeVoteSnapshotParams,
  type ClosePositionParams as VotingClosePositionParams,
  type ClaimParams as VotingClaimParams,
  type Position as VotingPosition,
  type VoteStatus,
  type BalanceAttestation as VotingBalanceAttestation,
  type MerkleProof as VotingMerkleProof,
  type EncryptedContributions,
  type VotePreimage,
  type DecryptedVotePreimage,
  type VoteSnapshotProofInputs,
  type ClaimProofInputs as VotingClaimProofInputs,
} from './types';

// Export instruction builders with voting prefix where needed
export {
  // Seeds and circuit IDs
  VOTING_SEEDS,
  CIRCUIT_IDS as VOTING_CIRCUIT_IDS,

  // PDA derivation - voting specific
  deriveBallotPda,
  deriveBallotVaultPda,
  derivePendingOperationPda as deriveVotingPendingOperationPda,
  deriveVerificationKeyPda as deriveVotingVerificationKeyPda,
  generateOperationId as generateVotingOperationId,

  // Ballot management instruction builders
  buildCreateBallotInstruction,
  buildResolveBallotInstruction,
  buildFinalizeBallotInstruction,
  buildDecryptTallyInstruction,

  // Vote snapshot instruction builders
  buildVoteSnapshotPhase0Instruction,
  buildVoteSnapshotExecuteInstruction,

  // Change vote snapshot instruction builders
  buildChangeVoteSnapshotPhase0Instruction,
  buildChangeVoteSnapshotExecuteInstruction,

  // Vote spend instruction builders
  buildVoteSpendPhase0Instruction,
  buildVoteSpendExecuteInstruction,

  // Close vote position instruction builders
  buildCloseVotePositionPhase0Instruction,
  buildCloseVotePositionExecuteInstruction,

  // Claim instruction builders
  buildClaimPhase0Instruction,
  buildClaimExecuteInstruction,

  // High-level multi-phase builders
  buildVoteSnapshotInstructions,
  buildChangeVoteSnapshotInstructions,
  buildVoteSpendInstructions,
  buildClosePositionInstructions as buildCloseVotingPositionInstructions,
  buildClaimInstructions as buildVotingClaimInstructions,

  // Encrypted contributions
  generateEncryptedContributions,
  generateNegatedEncryptedContributions,

  // Verify vote commitment exists (Phase 1)
  buildVerifyVoteCommitmentExistsInstruction,

  // Param types
  type CreateBallotInstructionParams,
  type VoteSnapshotInstructionParams,
  type ChangeVoteSnapshotInstructionParams,
  type VoteSpendInstructionParams,
  type CloseVotePositionInstructionParams,
  type ClaimInstructionParams,
  type VoteCommitmentMerkleContext,
  type LightVerifyVoteCommitmentParams,
} from './instructions';

// Export proof generation
export {
  generateVoteSnapshotInputs,
  generateChangeVoteSnapshotInputs,
  generateVoteSpendInputs,
  generateClaimInputs as generateVotingClaimInputs,
  convertInputsToSnarkjs,
} from './proofs';

// Export recovery utilities
export {
  VoteRecoveryManager,
  encryptPreimage,
  type VoteRecoveryConfig,
  type RecoveredClaim,
  type RecoveredVote,
} from './recovery';

// Export voting client for complete multi-phase execution
export {
  VotingClient,
  type VotingClientConfig,
  type VoteSnapshotResult,
  type VoteSpendResult,
  type ChangeVoteResult,
  type ClosePositionResult,
  type ClaimResult,
} from './client';
