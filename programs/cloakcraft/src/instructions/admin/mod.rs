//! Admin instructions

mod register_adapt_module;
mod disable_adapt_module;
mod register_verification_key;
mod set_verification_key_data;
mod append_verification_key_data;
mod register_threshold_committee;
mod test_verify_proof;

pub use register_adapt_module::*;
pub use disable_adapt_module::*;
pub use register_verification_key::*;
pub use set_verification_key_data::*;
pub use append_verification_key_data::*;
pub use register_threshold_committee::*;
pub use test_verify_proof::*;
