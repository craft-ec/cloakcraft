//! Admin instructions

mod register_adapt_module;
mod disable_adapt_module;
mod register_verification_key;
mod set_verification_key_data;
mod append_verification_key_data;
mod register_threshold_committee;
mod test_verify_proof;
mod reset_amm_pool;
mod initialize_protocol_config;
mod update_protocol_fees;
mod update_treasury;
mod update_protocol_authority;

pub use register_adapt_module::*;
pub use disable_adapt_module::*;
pub use register_verification_key::*;
pub use set_verification_key_data::*;
pub use append_verification_key_data::*;
pub use register_threshold_committee::*;
pub use test_verify_proof::*;
pub use reset_amm_pool::*;
pub use initialize_protocol_config::*;
pub use update_protocol_fees::*;
pub use update_treasury::*;
pub use update_protocol_authority::*;
