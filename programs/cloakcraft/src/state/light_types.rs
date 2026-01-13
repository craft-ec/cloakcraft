//! IDL-safe Light Protocol types
//!
//! These wrapper types use raw bytes to ensure Anchor IDL compatibility.
//! The Light SDK types don't implement Anchor's IDL traits, so we need
//! intermediate types that can be serialized in the IDL and converted
//! to Light SDK types at runtime.

use anchor_lang::prelude::*;
use light_compressed_account::instruction_data::compressed_proof::CompressedProof;
use light_sdk::instruction::{PackedAddressTreeInfo, ValidityProof};

/// IDL-safe wrapper for Light Protocol validity proof
///
/// Contains the serialized proof data that can be deserialized
/// into a ValidityProof for Light CPI operations.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightValidityProof {
    /// Compressed proof point A (32 bytes)
    pub a: [u8; 32],
    /// Compressed proof point B (64 bytes)
    pub b: [u8; 64],
    /// Compressed proof point C (32 bytes)
    pub c: [u8; 32],
}

impl Default for LightValidityProof {
    fn default() -> Self {
        Self {
            a: [0u8; 32],
            b: [0u8; 64],
            c: [0u8; 32],
        }
    }
}

impl From<LightValidityProof> for ValidityProof {
    fn from(proof: LightValidityProof) -> Self {
        ValidityProof(Some(CompressedProof {
            a: proof.a,
            b: proof.b,
            c: proof.c,
        }))
    }
}

/// IDL-safe wrapper for Light Protocol address tree info
///
/// Contains tree configuration for compressed account address derivation.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct LightAddressTreeInfo {
    /// Index of the address merkle tree pubkey in remaining_accounts
    pub address_merkle_tree_pubkey_index: u8,
    /// Index of the address queue pubkey in remaining_accounts
    pub address_queue_pubkey_index: u8,
    /// Root index for the merkle tree
    pub root_index: u16,
}

impl From<LightAddressTreeInfo> for PackedAddressTreeInfo {
    fn from(info: LightAddressTreeInfo) -> Self {
        PackedAddressTreeInfo {
            address_merkle_tree_pubkey_index: info.address_merkle_tree_pubkey_index,
            address_queue_pubkey_index: info.address_queue_pubkey_index,
            root_index: info.root_index,
        }
    }
}
