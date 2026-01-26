//! Voting instructions for privacy-preserving ballot protocol
//!
//! Supports:
//! - **Snapshot voting** (tokens stay liquid) and **SpendToVote** (tokens locked)
//! - **Public**, **TimeLocked**, and **PermanentPrivate** reveal modes
//! - **Single**, **Approval**, **Ranked**, and **Weighted** vote types
//! - **TallyBased**, **Oracle**, and **Authority** resolution

// Admin instructions
mod create_ballot;
mod resolve_ballot;
mod finalize_ballot;
mod decrypt_tally;

// Snapshot voting (multi-phase)
mod create_pending_with_proof_vote_snapshot;
mod create_vote_nullifier;
mod execute_vote_snapshot;
mod create_vote_commitment;

// Snapshot vote change (atomic, multi-phase)
mod create_pending_with_proof_change_vote_snapshot;
mod verify_vote_commitment_exists;
mod execute_change_vote_snapshot;

// SpendToVote (multi-phase)
mod create_pending_with_proof_vote_spend;
mod execute_vote_spend;

// SpendToVote vote change (atomic, multi-phase)
mod create_pending_with_proof_change_vote_spend;
mod execute_change_vote_spend;

// Close vote position (multi-phase)
mod create_pending_with_proof_close_vote_position;
mod execute_close_vote_position;

// Claim (multi-phase, SpendToVote only)
mod create_pending_with_proof_claim;
mod execute_claim;

// Admin exports
pub use create_ballot::*;
pub use resolve_ballot::*;
pub use finalize_ballot::*;
pub use decrypt_tally::*;

// Snapshot voting exports
pub use create_pending_with_proof_vote_snapshot::*;
pub use create_vote_nullifier::*;
pub use execute_vote_snapshot::*;
pub use create_vote_commitment::*;

// Snapshot vote change exports
pub use create_pending_with_proof_change_vote_snapshot::*;
pub use verify_vote_commitment_exists::*;
pub use execute_change_vote_snapshot::*;

// SpendToVote exports
pub use create_pending_with_proof_vote_spend::*;
pub use execute_vote_spend::*;

// SpendToVote vote change exports
pub use create_pending_with_proof_change_vote_spend::*;
pub use execute_change_vote_spend::*;

// Close vote position exports
pub use create_pending_with_proof_close_vote_position::*;
pub use execute_close_vote_position::*;

// Claim exports
pub use create_pending_with_proof_claim::*;
pub use execute_claim::*;
