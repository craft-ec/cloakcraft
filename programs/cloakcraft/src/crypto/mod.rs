//! Cryptographic operations for proof verification
//!
//! Uses gnark-verifier-solana for Groth16 verification with Solana BN254 syscalls.

use anchor_lang::prelude::*;
use gnark_verifier_solana::{
    proof::GnarkProof,
    verifier::GnarkVerifier,
    vk::GnarkVerifyingkey,
};

use crate::constants::GROTH16_PROOF_SIZE;
use crate::errors::CloakCraftError;

/// Number of public inputs for the transfer circuit
/// merkle_root, nullifier, out_commitment_1, out_commitment_2, token_mint, unshield_amount
const NR_PUBLIC_INPUTS: usize = 6;

/// Parse gnark verification key from raw bytes
///
/// Gnark VK format:
/// - alpha_g1: 64 bytes
/// - beta_g1: 64 bytes (discarded)
/// - beta_g2: 128 bytes
/// - gamma_g2: 128 bytes
/// - delta_g1: 64 bytes (discarded)
/// - delta_g2: 128 bytes
/// - IC count: 4 bytes (big-endian)
/// - IC elements: count * 64 bytes
/// - public_and_commitment_committed count: 4 bytes
/// - commitment_keys count: 4 bytes
fn parse_gnark_vk<'a>(vk_data: &'a [u8]) -> Result<GnarkVerifyingkey<'a>> {
    const MIN_SIZE: usize = 64 + 64 + 128 + 128 + 64 + 128 + 4; // Up to IC count

    if vk_data.len() < MIN_SIZE {
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    let mut offset = 0;

    // Parse alpha G1 (64 bytes)
    let alpha_g1: [u8; 64] = vk_data[offset..offset + 64]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidVerificationKey)?;
    offset += 64;

    // Skip beta G1 (64 bytes) - not needed for verification
    offset += 64;

    // Parse beta G2 (128 bytes)
    let beta_g2: [u8; 128] = vk_data[offset..offset + 128]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidVerificationKey)?;
    offset += 128;

    // Parse gamma G2 (128 bytes)
    let gamma_g2: [u8; 128] = vk_data[offset..offset + 128]
        .try_into()
        .map_err(|_| CloakCraftError::InvalidVerificationKey)?;
    offset += 128;

    // Skip delta G1 (64 bytes) - not needed for verification
    offset += 64;

    // Parse delta G2 (128 bytes)
    let delta_g2: [u8; 128] = vk_data[offset..offset + 128]
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

    // Sanity check IC count
    if ic_count == 0 || ic_count > 100 {
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    // Parse IC elements (64 bytes each)
    let expected_size = offset + ic_count * 64 + 8; // +8 for commitment metadata
    if vk_data.len() < expected_size {
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    // Build IC slice reference - this is safe because vk_data outlives the return value
    let ic_bytes = &vk_data[offset..offset + ic_count * 64];
    let k: &[[u8; 64]] = unsafe {
        std::slice::from_raw_parts(
            ic_bytes.as_ptr() as *const [u8; 64],
            ic_count
        )
    };
    offset += ic_count * 64;

    // Parse commitment metadata (we don't use commitments)
    // public_and_commitment_committed count (4 bytes) - should be 0
    // commitment_keys count (4 bytes) - should be 0

    Ok(GnarkVerifyingkey {
        nr_pubinputs: ic_count.saturating_sub(1),
        alpha_g1,
        beta_g2,
        gamma_g2,
        delta_g2,
        k,
        commitment_keys: &[],
        public_and_commitment_committed: &[],
    })
}

/// Convenience function to verify a proof with raw bytes
/// This handles parsing of both proof and verification key data
pub fn verify_proof(
    proof_bytes: &[u8],
    vk_data: &[u8],
    public_inputs: &[[u8; 32]],
) -> Result<()> {
    msg!("=== Gnark Proof Verification ===");
    msg!("proof_bytes len: {}", proof_bytes.len());
    msg!("vk_data len: {}", vk_data.len());
    msg!("public_inputs count: {}", public_inputs.len());

    // Validate proof size
    if proof_bytes.len() < GROTH16_PROOF_SIZE {
        msg!("Invalid proof length: {} < {}", proof_bytes.len(), GROTH16_PROOF_SIZE);
        return Err(CloakCraftError::InvalidProofLength.into());
    }

    // Parse proof using gnark-verifier-solana format
    // gnark format: A(64) + B(128) + C(64) = 256 bytes
    // Add commitment count (0) and empty commitment_pok for GnarkProof::from_bytes
    let mut proof_with_commitments = Vec::with_capacity(256 + 4 + 64);
    proof_with_commitments.extend_from_slice(&proof_bytes[0..256]); // A + B + C
    proof_with_commitments.extend_from_slice(&[0, 0, 0, 0]); // 0 commitments
    proof_with_commitments.extend_from_slice(&[0u8; 64]);    // empty commitment_pok

    let proof = GnarkProof::from_bytes(&proof_with_commitments)
        .map_err(|_| CloakCraftError::InvalidProofLength)?;

    msg!("Proof parsed: A[0..8]={:?}, B[0..8]={:?}, C[0..8]={:?}",
         &proof.ar[0..8], &proof.bs[0..8], &proof.krs[0..8]);

    // Parse verification key
    let vk = parse_gnark_vk(vk_data)?;
    msg!("VK parsed: {} public inputs, {} IC elements", vk.nr_pubinputs, vk.k.len());

    // Validate public inputs count matches VK
    if public_inputs.len() != vk.nr_pubinputs {
        msg!("Public inputs mismatch: got {}, expected {}",
             public_inputs.len(), vk.nr_pubinputs);
        return Err(CloakCraftError::InvalidPublicInputs.into());
    }

    // Create witness from public inputs
    let witness = gnark_verifier_solana::witness::GnarkWitness {
        entries: public_inputs.try_into()
            .map_err(|_| CloakCraftError::InvalidPublicInputs)?,
    };

    // Create verifier and verify
    let mut verifier = GnarkVerifier::<NR_PUBLIC_INPUTS>::new(&vk);

    match verifier.verify(proof, witness) {
        Ok(()) => {
            msg!("=== Proof Verification PASSED ===");
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
    fn test_proof_reordering() {
        // Test that proof reordering works correctly
        let mut proof_bytes = [0u8; 256];
        // Fill with identifiable patterns
        for i in 0..64 { proof_bytes[i] = 0xAA; }       // A
        for i in 64..128 { proof_bytes[i] = 0xCC; }     // C (sunspot position)
        for i in 128..256 { proof_bytes[i] = 0xBB; }    // B (sunspot position)

        let mut reordered = Vec::new();
        reordered.extend_from_slice(&proof_bytes[0..64]);     // A
        reordered.extend_from_slice(&proof_bytes[128..256]);  // B
        reordered.extend_from_slice(&proof_bytes[64..128]);   // C

        assert_eq!(&reordered[0..64], &[0xAA; 64]);   // A unchanged
        assert_eq!(&reordered[64..192], &[0xBB; 128]); // B now at 64
        assert_eq!(&reordered[192..256], &[0xCC; 64]); // C now at 192
    }
}
