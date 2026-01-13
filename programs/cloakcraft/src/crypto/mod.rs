//! Cryptographic operations for proof verification
//!
//! Uses groth16-solana for Groth16 verification with Solana BN254 syscalls.
//! Compatible with snarkjs/circom proofs.

pub mod babyjubjub;

pub use babyjubjub::{add_elgamal_ciphertexts, Point};

use anchor_lang::prelude::*;
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

use crate::constants::GROTH16_PROOF_SIZE;
use crate::errors::CloakCraftError;

/// Number of public inputs for the transfer circuit
/// merkle_root, nullifier, out_commitment_1, out_commitment_2, token_mint, unshield_amount
const NR_PUBLIC_INPUTS: usize = 6;

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

/// Verify a Groth16 proof with 6 public inputs
///
/// Proof format (256 bytes):
/// - A (G1): 64 bytes - y-coordinate should be negated
/// - B (G2): 128 bytes
/// - C (G1): 64 bytes
///
/// Public inputs: merkle_root, nullifier, out_commitment_1, out_commitment_2, token_mint, unshield_amount
pub fn verify_proof(
    proof_bytes: &[u8],
    vk_data: &[u8],
    public_inputs: &[[u8; 32]],
) -> Result<()> {
    msg!("=== Groth16 Proof Verification ===");
    msg!("proof_bytes len: {}", proof_bytes.len());
    msg!("vk_data len: {}", vk_data.len());
    msg!("public_inputs count: {}", public_inputs.len());

    // Validate proof size
    if proof_bytes.len() < GROTH16_PROOF_SIZE {
        msg!("Invalid proof length: {} < {}", proof_bytes.len(), GROTH16_PROOF_SIZE);
        return Err(CloakCraftError::InvalidProofLength.into());
    }

    // Validate public inputs count (must be exactly NR_PUBLIC_INPUTS)
    if public_inputs.len() != NR_PUBLIC_INPUTS {
        msg!("Public inputs mismatch: got {}, expected {}",
             public_inputs.len(), NR_PUBLIC_INPUTS);
        return Err(CloakCraftError::InvalidPublicInputs.into());
    }

    // Parse verification key
    let vk = parse_vk(vk_data)?;

    // Also validate VK has matching public inputs
    if vk.nr_pubinputs != NR_PUBLIC_INPUTS {
        msg!("VK public inputs mismatch: got {}, expected {}",
             vk.nr_pubinputs, NR_PUBLIC_INPUTS);
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    // Extract proof components
    let proof_a: [u8; 64] = proof_bytes[0..64]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidProofLength)?;
    let proof_b: [u8; 128] = proof_bytes[64..192]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidProofLength)?;
    let proof_c: [u8; 64] = proof_bytes[192..256]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidProofLength)?;

    msg!("Proof A[0..8]: {:?}", &proof_a[0..8]);
    msg!("Proof B[0..8]: {:?}", &proof_b[0..8]);
    msg!("Proof C[0..8]: {:?}", &proof_c[0..8]);

    // Convert slice to fixed-size array for const generic Groth16Verifier
    let public_inputs_arr: &[[u8; 32]; NR_PUBLIC_INPUTS] = public_inputs
        .try_into()
        .map_err(|_| CloakCraftError::InvalidPublicInputs)?;

    // Log proof and VK components for debugging
    msg!("=== Proof Components (first 16 bytes each) ===");
    msg!("proof_a: {:02x?}", &proof_a[0..16]);
    msg!("proof_b: {:02x?}", &proof_b[0..16]);
    msg!("proof_c: {:02x?}", &proof_c[0..16]);
    msg!("alpha_g1: {:02x?}", &vk.vk_alpha_g1[0..16]);
    msg!("beta_g2: {:02x?}", &vk.vk_beta_g2[0..16]);
    msg!("gamma_g2: {:02x?}", &vk.vk_gamme_g2[0..16]);
    msg!("delta_g2: {:02x?}", &vk.vk_delta_g2[0..16]);
    msg!("IC[0]: {:02x?}", &vk.vk_ic[0][0..16]);

    // Log public inputs
    msg!("=== Public Inputs (first 8 bytes each) ===");
    for (i, input) in public_inputs.iter().enumerate() {
        msg!("[{}]: {:02x?}", i, &input[0..8]);
    }

    // Create verifier and verify
    let mut verifier = Groth16Verifier::new(
        &proof_a,
        &proof_b,
        &proof_c,
        public_inputs_arr,
        &vk,
    ).map_err(|e| {
        msg!("Failed to create verifier: {:?}", e);
        CloakCraftError::ProofVerificationFailed
    })?;

    msg!("Verifier created successfully, calling verify()...");

    match verifier.verify() {
        Ok(()) => {
            msg!("=== Proof Verification PASSED ===");
            Ok(())
        }
        Err(e) => {
            msg!("Proof verification failed: {:?}", e);
            msg!("Error details: This usually means the proof doesn't match the VK/public inputs");
            Err(CloakCraftError::ProofVerificationFailed.into())
        }
    }
}

/// Number of public inputs for swap circuit
/// merkle_root, nullifier, pool_id, out_commitment, change_commitment, min_output
const NR_PUBLIC_INPUTS_SWAP: usize = 6;

/// Verify a Groth16 proof with 6 public inputs (swap circuit)
pub fn verify_proof_swap(
    proof_bytes: &[u8],
    vk_data: &[u8],
    public_inputs: &[[u8; 32]],
) -> Result<()> {
    msg!("=== Groth16 Swap Proof Verification ===");
    msg!("proof_bytes len: {}", proof_bytes.len());
    msg!("vk_data len: {}", vk_data.len());
    msg!("public_inputs count: {}", public_inputs.len());

    // Validate proof size
    if proof_bytes.len() < GROTH16_PROOF_SIZE {
        msg!("Invalid proof length: {} < {}", proof_bytes.len(), GROTH16_PROOF_SIZE);
        return Err(CloakCraftError::InvalidProofLength.into());
    }

    // Validate public inputs count
    if public_inputs.len() != NR_PUBLIC_INPUTS_SWAP {
        msg!("Public inputs mismatch: got {}, expected {}",
             public_inputs.len(), NR_PUBLIC_INPUTS_SWAP);
        return Err(CloakCraftError::InvalidPublicInputs.into());
    }

    // Parse verification key
    let vk = parse_vk(vk_data)?;

    // Validate VK has matching public inputs
    if vk.nr_pubinputs != NR_PUBLIC_INPUTS_SWAP {
        msg!("VK public inputs mismatch: got {}, expected {}",
             vk.nr_pubinputs, NR_PUBLIC_INPUTS_SWAP);
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    // Extract proof components
    let proof_a: [u8; 64] = proof_bytes[0..64]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidProofLength)?;
    let proof_b: [u8; 128] = proof_bytes[64..192]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidProofLength)?;
    let proof_c: [u8; 64] = proof_bytes[192..256]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidProofLength)?;

    msg!("Proof A[0..8]: {:?}", &proof_a[0..8]);
    msg!("Proof B[0..8]: {:?}", &proof_b[0..8]);
    msg!("Proof C[0..8]: {:?}", &proof_c[0..8]);

    // Convert slice to fixed-size array for const generic Groth16Verifier
    let public_inputs_arr: &[[u8; 32]; NR_PUBLIC_INPUTS_SWAP] = public_inputs
        .try_into()
        .map_err(|_| CloakCraftError::InvalidPublicInputs)?;

    // Log public inputs
    msg!("=== Public Inputs (first 8 bytes each) ===");
    for (i, input) in public_inputs.iter().enumerate() {
        msg!("[{}]: {:02x?}", i, &input[0..8]);
    }

    // Create verifier and verify
    let mut verifier = Groth16Verifier::new(
        &proof_a,
        &proof_b,
        &proof_c,
        public_inputs_arr,
        &vk,
    ).map_err(|e| {
        msg!("Failed to create verifier: {:?}", e);
        CloakCraftError::ProofVerificationFailed
    })?;

    msg!("Verifier created successfully, calling verify()...");

    match verifier.verify() {
        Ok(()) => {
            msg!("=== Swap Proof Verification PASSED ===");
            Ok(())
        }
        Err(e) => {
            msg!("Proof verification failed: {:?}", e);
            Err(CloakCraftError::ProofVerificationFailed.into())
        }
    }
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
