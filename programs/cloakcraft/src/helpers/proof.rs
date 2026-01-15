//! Unified Groth16 proof verification
//!
//! Consolidates proof verification logic for all circuits (transfer, swap, AMM, market, governance).
//! Replaces separate verify_proof() and verify_proof_swap() functions with a single implementation.

use anchor_lang::prelude::*;
use groth16_solana::groth16::{Groth16Verifier, Groth16Verifyingkey};

use crate::constants::GROTH16_PROOF_SIZE;
use crate::errors::CloakCraftError;

/// Verify a Groth16 proof with variable public input count
///
/// This function handles all circuit types by accepting a dynamic public input count.
/// The verification key must match the expected number of public inputs.
///
/// # Arguments
/// * `proof_bytes` - 256-byte Groth16 proof (A: 64, B: 128, C: 64)
/// * `vk_data` - Verification key in groth16-solana format
/// * `public_inputs` - Slice of 32-byte field elements
/// * `operation_name` - Name for logging (e.g., "Transfer", "Swap", "AddLiquidity")
///
/// # Errors
/// * `InvalidProofLength` - Proof is not 256 bytes
/// * `InvalidPublicInputs` - Public input count doesn't match VK
/// * `InvalidVerificationKey` - VK parsing failed
/// * `ProofVerificationFailed` - Cryptographic verification failed
pub fn verify_groth16_proof(
    proof_bytes: &[u8],
    vk_data: &[u8],
    public_inputs: &[[u8; 32]],
    operation_name: &str,
) -> Result<()> {
    msg!("=== Groth16 {} Proof Verification ===", operation_name);
    msg!("proof_bytes len: {}", proof_bytes.len());
    msg!("vk_data len: {}", vk_data.len());
    msg!("public_inputs count: {}", public_inputs.len());

    // Validate proof size
    if proof_bytes.len() < GROTH16_PROOF_SIZE {
        msg!("Invalid proof length: {} < {}", proof_bytes.len(), GROTH16_PROOF_SIZE);
        return Err(CloakCraftError::InvalidProofLength.into());
    }

    // Parse verification key
    let vk = parse_vk(vk_data)?;

    // Validate public inputs count matches VK
    if vk.nr_pubinputs != public_inputs.len() {
        msg!("Public inputs mismatch: got {}, expected {}",
             public_inputs.len(), vk.nr_pubinputs);
        return Err(CloakCraftError::InvalidPublicInputs.into());
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

    // Verify proof using dynamic input count
    verify_with_dynamic_inputs(&proof_a, &proof_b, &proof_c, public_inputs, &vk, operation_name)
}

/// Internal verification with dynamic public input count
///
/// Uses const generics dispatch based on runtime input count.
/// Supports 1-20 public inputs (covers all current circuits).
fn verify_with_dynamic_inputs(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    public_inputs: &[[u8; 32]],
    vk: &Groth16Verifyingkey,
    operation_name: &str,
) -> Result<()> {
    match public_inputs.len() {
        1 => verify_with_count::<1>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        2 => verify_with_count::<2>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        3 => verify_with_count::<3>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        4 => verify_with_count::<4>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        5 => verify_with_count::<5>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        6 => verify_with_count::<6>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        7 => verify_with_count::<7>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        8 => verify_with_count::<8>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        9 => verify_with_count::<9>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        10 => verify_with_count::<10>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        11 => verify_with_count::<11>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        12 => verify_with_count::<12>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        13 => verify_with_count::<13>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        14 => verify_with_count::<14>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        15 => verify_with_count::<15>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        16 => verify_with_count::<16>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        17 => verify_with_count::<17>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        18 => verify_with_count::<18>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        19 => verify_with_count::<19>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        20 => verify_with_count::<20>(proof_a, proof_b, proof_c, public_inputs, vk, operation_name),
        _ => {
            msg!("Unsupported public input count: {}", public_inputs.len());
            Err(CloakCraftError::InvalidPublicInputs.into())
        }
    }
}

/// Verify proof with const generic input count
///
/// Required because Groth16Verifier uses const generics for the public input array size.
fn verify_with_count<const N: usize>(
    proof_a: &[u8; 64],
    proof_b: &[u8; 128],
    proof_c: &[u8; 64],
    public_inputs: &[[u8; 32]],
    vk: &Groth16Verifyingkey,
    operation_name: &str,
) -> Result<()> {
    // Convert slice to fixed-size array for const generic Groth16Verifier
    let public_inputs_arr: &[[u8; 32]; N] = public_inputs
        .try_into()
        .map_err(|_| CloakCraftError::InvalidPublicInputs)?;

    // Create verifier and verify
    let mut verifier = Groth16Verifier::new(
        proof_a,
        proof_b,
        proof_c,
        public_inputs_arr,
        vk,
    ).map_err(|e| {
        msg!("Failed to create {} verifier: {:?}", operation_name, e);
        CloakCraftError::ProofVerificationFailed
    })?;

    msg!("Verifier created successfully, calling verify()...");

    match verifier.verify() {
        Ok(()) => {
            msg!("=== {} Proof Verification PASSED ===", operation_name);
            Ok(())
        }
        Err(e) => {
            msg!("{} proof verification failed: {:?}", operation_name, e);
            msg!("Error details: This usually means the proof doesn't match the VK/public inputs");
            Err(CloakCraftError::ProofVerificationFailed.into())
        }
    }
}

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
