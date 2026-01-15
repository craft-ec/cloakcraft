//! Generic Light Protocol operations
//!
//! These instructions provide reusable building blocks for multi-phase
//! operations that need to create nullifiers and commitments via Light Protocol.
//!
//! NEW Append Pattern (recommended, with security bindings):
//! 0. create_pending_with_proof_{operation} - Verify ZK proof + Create PendingOperation (operation-specific)
//! 1. verify_commitment_exists - Verify commitment exists (GENERIC, binds to Phase 0)
//! 2. create_nullifier_and_pending - Create nullifier (GENERIC, binds to Phase 0)
//! 3. execute_{operation} - Execute operation logic (operation-specific)
//! 4. create_commitment - Create commitments (GENERIC, call M times)
//! 5. close_pending_operation - Close pending operation (GENERIC)
//!
//! SECURITY: Phases are bound together via PendingOperation state:
//! - Phase 0 stores: input_commitment, expected_nullifier
//! - Phase 1 verifies: input_commitment matches
//! - Phase 2 creates: expected_nullifier matches
//! This prevents commitment/nullifier swap attacks.
//!
//! OLD Usage pattern (deprecated, for backwards compatibility):
//! 1. verify_operation - Verify ZK proof, store pending operation
//! 2. create_nullifier - Create ONE nullifier (call N times for N nullifiers)
//! 3. create_commitment - Create ONE commitment (call M times for M commitments)
//! 4. close_operation - Close pending operation, reclaim rent

pub mod verify_commitment_exists;
pub mod create_nullifier_and_pending;
pub mod create_nullifier;
pub mod create_commitment;
pub mod close_pending_operation;

pub use verify_commitment_exists::*;
pub use create_nullifier_and_pending::*;
pub use create_nullifier::*;
pub use create_commitment::*;
pub use close_pending_operation::*;
