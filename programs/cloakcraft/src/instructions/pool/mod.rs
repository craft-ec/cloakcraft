//! Pool instructions: initialize, shield, transact (multi-phase append pattern), store_commitment

mod initialize_pool;
mod initialize_commitment_counter;
mod shield;
mod create_pending_with_proof;
mod create_pending_with_proof_consolidation;
mod process_unshield;
mod transact; // DEPRECATED - use append pattern instead
mod verify_proof_for_transact; // DEPRECATED - use create_pending_with_proof instead
mod store_commitment;

pub use initialize_pool::*;
pub use initialize_commitment_counter::*;
pub use shield::*;
pub use create_pending_with_proof::*;
pub use create_pending_with_proof_consolidation::*;
pub use process_unshield::*;
pub use transact::*; // DEPRECATED
pub use verify_proof_for_transact::*; // DEPRECATED
pub use store_commitment::*;
