//! Perps keeper instructions
//!
//! Keeper operations that maintain pool health:
//! - Update borrow fees: Accrue borrow fees based on time and utilization
//! - Liquidate: Close underwater positions
//! - Trigger bound close: Close positions at profit bound

mod update_borrow_fees;
mod liquidate;
mod trigger_bound_close;

pub use update_borrow_fees::*;
pub use liquidate::*;
pub use trigger_bound_close::*;
