//! Generic Light Protocol operations
//!
//! These instructions provide reusable building blocks for multi-phase
//! operations that need to create nullifiers and commitments via Light Protocol.
//!
//! Usage pattern:
//! 1. verify_operation - Verify ZK proof, store pending operation (NO Light calls)
//! 2. create_nullifier - Create ONE nullifier (call N times for N nullifiers)
//! 3. create_commitment - Create ONE commitment (call M times for M commitments)
//! 4. close_operation - Close pending operation, reclaim rent

mod create_nullifier;
mod create_commitment;
mod close_pending_operation;

pub use create_nullifier::*;
pub use create_commitment::*;
pub use close_pending_operation::*;
