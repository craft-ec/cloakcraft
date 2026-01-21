//! Helper functions for common operations
//!
//! This module consolidates shared logic across instructions to maintain DRY principles
//! and provide a single source of truth for critical operations.

pub mod proof;
pub mod vault;
pub mod amm_math;
pub mod field;

pub use proof::verify_groth16_proof;
pub use vault::{transfer_to_vault, transfer_from_vault, update_pool_balance};
pub use amm_math::{calculate_initial_lp, calculate_proportional_lp, validate_lp_amount};
pub use field::{pubkey_to_field, u64_to_field, bytes_to_field};
