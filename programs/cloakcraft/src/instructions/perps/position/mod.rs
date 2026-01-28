//! Perps position instructions
//!
//! Position lifecycle:
//! - Open: Create private commitment + public PositionMeta
//! - Close: Verify no liquidation record exists, settle PnL, create status record
//! - Liquidate: Keeper uses PositionMeta for permissionless liquidation

mod create_pending_with_proof_open_position;
mod execute_open_position;
mod create_position_meta;
mod create_pending_with_proof_close_position;
mod verify_position_meta_active;
mod execute_close_position;
mod create_position_status_closed;

pub use create_pending_with_proof_open_position::*;
pub use execute_open_position::*;
pub use create_position_meta::*;
pub use create_pending_with_proof_close_position::*;
pub use verify_position_meta_active::*;
pub use execute_close_position::*;
pub use create_position_status_closed::*;
