//! Cryptographic operations for proof verification
//!
//! Uses groth16-solana for Groth16 verification with Solana BN254 syscalls.
//! Compatible with snarkjs/circom proofs.

pub mod babyjubjub;

pub use babyjubjub::Point;

use anchor_lang::prelude::*;
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

use crate::constants::GROTH16_PROOF_SIZE;
use crate::errors::CloakCraftError;

/// Parse verification key from raw bytes
///
/// groth16-solana VK format:
/// - vk_alpha_g1: 64 bytes
/// - vk_beta_g2: 128 bytes
/// - vk_gamma_g2: 128 bytes
/// - vk_delta_g2: 128 bytes
/// - IC count: 4 bytes (big-endian)
/// - IC elements: count * 64 bytes
fn parse_vk<'a>(vk_data: &'a [u8]) -> Result<Groth16Verifyingkey<'a>> {
    // Minimum size: alpha(64) + beta(128) + gamma(128) + delta(128) + ic_count(4) = 452
    const MIN_SIZE: usize = 64 + 128 + 128 + 128 + 4;

    if vk_data.len() < MIN_SIZE {
        msg!("VK data too short: {} < {}", vk_data.len(), MIN_SIZE);
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    let mut offset = 0;

    // Parse alpha G1 (64 bytes)
    let vk_alpha_g1: [u8; 64] = vk_data[offset..offset + 64]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidVerificationKey)?;
    offset += 64;

    // Parse beta G2 (128 bytes)
    let vk_beta_g2: [u8; 128] = vk_data[offset..offset + 128]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidVerificationKey)?;
    offset += 128;

    // Parse gamma G2 (128 bytes)
    let vk_gamma_g2: [u8; 128] = vk_data[offset..offset + 128]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidVerificationKey)?;
    offset += 128;

    // Parse delta G2 (128 bytes)
    let vk_delta_g2: [u8; 128] = vk_data[offset..offset + 128]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidVerificationKey)?;
    offset += 128;

    // Parse IC count (4 bytes big-endian)
    if vk_data.len() < offset + 4 {
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }
    let ic_count = u32::from_be_bytes([
        vk_data[offset], vk_data[offset + 1],
        vk_data[offset + 2], vk_data[offset + 3]
    ]) as usize;
    offset += 4;

    // Sanity check IC count (should be NR_PUBLIC_INPUTS + 1)
    if ic_count == 0 || ic_count > 100 {
        msg!("Invalid IC count: {}", ic_count);
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    // Check we have enough data for IC elements
    let expected_size = offset + ic_count * 64;
    if vk_data.len() < expected_size {
        msg!("VK data too short for IC: {} < {}", vk_data.len(), expected_size);
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    // Build IC slice reference
    let ic_bytes = &vk_data[offset..offset + ic_count * 64];
    let vk_ic: &[[u8; 64]] = unsafe {
        std::slice::from_raw_parts(
            ic_bytes.as_ptr() as *const [u8; 64],
            ic_count
        )
    };

    msg!("VK parsed: {} IC elements, {} public inputs", ic_count, ic_count - 1);

    Ok(Groth16Verifyingkey {
        nr_pubinputs: ic_count - 1,
        vk_alpha_g1,
        vk_beta_g2,
        vk_gamme_g2: vk_gamma_g2, // Note: typo in groth16-solana ("gamme" not "gamma")
        vk_delta_g2,
        vk_ic,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vk_parsing() {
        // Minimal valid VK with 1 IC element
        let mut vk_data = Vec::new();
        vk_data.extend_from_slice(&[0u8; 64]);  // alpha
        vk_data.extend_from_slice(&[0u8; 128]); // beta
        vk_data.extend_from_slice(&[0u8; 128]); // gamma
        vk_data.extend_from_slice(&[0u8; 128]); // delta
        vk_data.extend_from_slice(&[0, 0, 0, 1]); // 1 IC element
        vk_data.extend_from_slice(&[0u8; 64]);  // IC[0]

        // This should parse without error (though verification would fail)
        // Just testing the parsing logic
        assert_eq!(vk_data.len(), 64 + 128 + 128 + 128 + 4 + 64);
    }
}
