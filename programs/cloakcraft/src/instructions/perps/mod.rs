//! Perpetual futures instructions
//!
//! Implements a lending-based perpetual futures system with:
//! - Multi-token liquidity pool (like JLP)
//! - Private positions and liquidity via ZK proofs
//! - Bounded profit model (max profit = margin)
//! - Utilization-based constraints

pub mod admin;
pub mod position;
pub mod liquidity;
pub mod keeper;

pub use admin::*;
pub use position::*;
pub use liquidity::*;
pub use keeper::*;
