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
  // PDA derivation - voting specific
  deriveBallotPda,
  deriveBallotVaultPda,
  derivePendingOperationPda as deriveVotingPendingOperationPda,
  deriveVerificationKeyPda as deriveVotingVerificationKeyPda,

  // Ballot management
  buildCreateBallotInstruction,
  buildResolveBallotInstruction,
  buildFinalizeBallotInstruction,
  buildDecryptTallyInstruction,

  // Snapshot mode voting
  buildVoteSnapshotInstructions,
  buildChangeVoteSnapshotInstructions,

  // SpendToVote mode
  buildVoteSpendInstructions,
  buildClosePositionInstructions as buildCloseVotingPositionInstructions,

  // Claims
  buildClaimInstructions as buildVotingClaimInstructions,

  // Encrypted contributions
  generateEncryptedContributions,
  generateNegatedEncryptedContributions,

  // Circuit IDs - with voting prefix
  CIRCUIT_IDS as VOTING_CIRCUIT_IDS,
} from './instructions';

// Export proof generation
export {
  generateVoteSnapshotInputs,
  generateChangeVoteSnapshotInputs,
  generateVoteSpendInputs,
  generateClaimInputs as generateVotingClaimInputs,
} from './proofs';

// Export recovery utilities
export {
  VoteRecoveryManager,
  encryptPreimage,
  type VoteRecoveryConfig,
  type RecoveredClaim,
  type RecoveredVote,
} from './recovery';
