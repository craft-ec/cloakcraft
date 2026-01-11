//! Cryptographic operations for proof verification
//!
//! Uses Solana's native BN254 syscalls for Groth16 verification.

use anchor_lang::prelude::*;
use solana_bn254::prelude::{
    alt_bn128_addition, alt_bn128_multiplication, alt_bn128_pairing,
    ALT_BN128_PAIRING_ELEMENT_LEN,
};

use crate::constants::GROTH16_PROOF_SIZE;
use crate::errors::CloakCraftError;

/// Groth16 proof components (A, B, C points)
/// A, C are G1 points (64 bytes each: x, y as 32-byte big-endian)
/// B is G2 point (128 bytes: x0, x1, y0, y1 as 32-byte big-endian)
#[derive(Clone, Copy)]
pub struct Groth16Proof {
    /// G1 point A
    pub a: [u8; 64],
    /// G2 point B
    pub b: [u8; 128],
    /// G1 point C
    pub c: [u8; 64],
}

impl Groth16Proof {
    pub const SIZE: usize = GROTH16_PROOF_SIZE;

    /// Parse proof from bytes
    pub fn from_bytes(bytes: &[u8]) -> Result<Self> {
        if bytes.len() != Self::SIZE {
            return Err(CloakCraftError::InvalidProofLength.into());
        }

        let mut a = [0u8; 64];
        let mut b = [0u8; 128];
        let mut c = [0u8; 64];

        a.copy_from_slice(&bytes[0..64]);
        b.copy_from_slice(&bytes[64..192]);
        c.copy_from_slice(&bytes[192..256]);

        Ok(Self { a, b, c })
    }
}

/// Verification key for Groth16
pub struct VerificationKeyData<'a> {
    /// Alpha G1 point
    pub alpha: &'a [u8; 64],
    /// Beta G2 point
    pub beta: &'a [u8; 128],
    /// Gamma G2 point
    pub gamma: &'a [u8; 128],
    /// Delta G2 point
    pub delta: &'a [u8; 128],
    /// IC (public input commitments) - G1 points
    pub ic: &'a [[u8; 64]],
}

/// Negate a G1 point (negate y coordinate in field)
fn negate_g1(point: &[u8; 64]) -> [u8; 64] {
    let mut negated = *point;

    // BN254 field modulus
    let field_modulus: [u8; 32] = [
        0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29,
        0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
        0x97, 0x81, 0x6a, 0x91, 0x68, 0x71, 0xca, 0x8d,
        0x3c, 0x20, 0x8c, 0x16, 0xd8, 0x7c, 0xfd, 0x47,
    ];

    // Subtract y from field modulus: -y = p - y
    let mut borrow = 0u16;
    for i in (0..32).rev() {
        let diff = field_modulus[i] as u16 - negated[32 + i] as u16 - borrow;
        negated[32 + i] = diff as u8;
        borrow = if diff > 0xff { 1 } else { 0 };
    }

    negated
}

/// Compute MSM (multi-scalar multiplication) for public inputs
/// Returns alpha + sum(ic[i] * public_inputs[i])
fn compute_public_input_commitment(
    ic: &[[u8; 64]],
    public_inputs: &[[u8; 32]],
) -> Result<[u8; 64]> {
    if ic.len() != public_inputs.len() + 1 {
        return Err(CloakCraftError::InvalidPublicInputs.into());
    }

    // Start with IC[0]
    let mut acc = ic[0];

    // Add IC[i] * public_inputs[i-1] for each public input
    for (i, input) in public_inputs.iter().enumerate() {
        // Scalar multiplication: IC[i+1] * input
        let mut mul_input = [0u8; 96];
        mul_input[..64].copy_from_slice(&ic[i + 1]);
        mul_input[64..96].copy_from_slice(input);

        let product = alt_bn128_multiplication(&mul_input)
            .map_err(|_| CloakCraftError::Bn254MulError)?;

        // Point addition: acc + product
        let mut add_input = [0u8; 128];
        add_input[..64].copy_from_slice(&acc);
        add_input[64..128].copy_from_slice(&product);

        let sum = alt_bn128_addition(&add_input)
            .map_err(|_| CloakCraftError::Bn254AddError)?;

        acc.copy_from_slice(&sum[..64]);
    }

    Ok(acc)
}

/// Verify a Groth16 proof using Solana's BN254 pairing syscall
///
/// Verification equation:
/// e(A, B) = e(alpha, beta) * e(public_input_commitment, gamma) * e(C, delta)
///
/// Or equivalently (for pairing check):
/// e(-A, B) * e(alpha, beta) * e(public_input_commitment, gamma) * e(C, delta) = 1
pub fn verify_groth16_proof(
    proof: &Groth16Proof,
    vk: &VerificationKeyData,
    public_inputs: &[[u8; 32]],
) -> Result<bool> {
    // Compute public input commitment: IC[0] + sum(IC[i] * input[i-1])
    let pic = compute_public_input_commitment(vk.ic, public_inputs)?;

    // Negate proof.A for pairing check
    let neg_a = negate_g1(&proof.a);

    // Prepare pairing input: 4 pairs of (G1, G2) points
    // Each pair is 192 bytes: 64 bytes G1 + 128 bytes G2
    let mut pairing_input = [0u8; 4 * ALT_BN128_PAIRING_ELEMENT_LEN];

    // Pair 1: e(-A, B)
    pairing_input[0..64].copy_from_slice(&neg_a);
    pairing_input[64..192].copy_from_slice(&proof.b);

    // Pair 2: e(alpha, beta)
    pairing_input[192..256].copy_from_slice(vk.alpha);
    pairing_input[256..384].copy_from_slice(vk.beta);

    // Pair 3: e(public_input_commitment, gamma)
    pairing_input[384..448].copy_from_slice(&pic);
    pairing_input[448..576].copy_from_slice(vk.gamma);

    // Pair 4: e(C, delta)
    pairing_input[576..640].copy_from_slice(&proof.c);
    pairing_input[640..768].copy_from_slice(vk.delta);

    // Perform pairing check
    let result = alt_bn128_pairing(&pairing_input)
        .map_err(|_| CloakCraftError::Bn254PairingError)?;

    // Result is 1 if pairing product equals identity
    Ok(result[31] == 1 && result[..31].iter().all(|&b| b == 0))
}

/// Parse verification key data from raw bytes
pub fn parse_verification_key(vk_data: &[u8]) -> Result<(
    [u8; 64],    // alpha
    [u8; 128],   // beta
    [u8; 128],   // gamma
    [u8; 128],   // delta
    Vec<[u8; 64]>, // ic
)> {
    // Minimum size: alpha(64) + beta(128) + gamma(128) + delta(128) + num_ic(4) + ic[0](64)
    const MIN_SIZE: usize = 64 + 128 + 128 + 128 + 4 + 64;

    if vk_data.len() < MIN_SIZE {
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    let mut offset = 0;

    // Parse alpha
    let mut alpha = [0u8; 64];
    alpha.copy_from_slice(&vk_data[offset..offset + 64]);
    offset += 64;

    // Parse beta
    let mut beta = [0u8; 128];
    beta.copy_from_slice(&vk_data[offset..offset + 128]);
    offset += 128;

    // Parse gamma
    let mut gamma = [0u8; 128];
    gamma.copy_from_slice(&vk_data[offset..offset + 128]);
    offset += 128;

    // Parse delta
    let mut delta = [0u8; 128];
    delta.copy_from_slice(&vk_data[offset..offset + 128]);
    offset += 128;

    // Parse IC count
    let num_ic = u32::from_le_bytes([
        vk_data[offset], vk_data[offset + 1],
        vk_data[offset + 2], vk_data[offset + 3]
    ]) as usize;
    offset += 4;

    // Parse IC points
    let expected_size = offset + num_ic * 64;
    if vk_data.len() < expected_size {
        return Err(CloakCraftError::InvalidVerificationKey.into());
    }

    let mut ic = Vec::with_capacity(num_ic);
    for _ in 0..num_ic {
        let mut point = [0u8; 64];
        point.copy_from_slice(&vk_data[offset..offset + 64]);
        ic.push(point);
        offset += 64;
    }

    Ok((alpha, beta, gamma, delta, ic))
}

/// Convenience function to verify a proof with raw bytes
/// This handles parsing of both proof and verification key data
pub fn verify_proof(
    proof_bytes: &[u8],
    vk_data: &[u8],
    public_inputs: &[[u8; 32]],
) -> Result<()> {
    // Parse proof
    let proof = Groth16Proof::from_bytes(proof_bytes)?;

    // Parse verification key
    let (alpha, beta, gamma, delta, ic) = parse_verification_key(vk_data)?;

    // Create verification key data struct
    let vk = VerificationKeyData {
        alpha: &alpha,
        beta: &beta,
        gamma: &gamma,
        delta: &delta,
        ic: &ic,
    };

    // Verify proof
    let valid = verify_groth16_proof(&proof, &vk, public_inputs)?;

    if valid {
        Ok(())
    } else {
        Err(crate::errors::CloakCraftError::ProofVerificationFailed.into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proof_parsing() {
        let bytes = [0u8; 256];
        let proof = Groth16Proof::from_bytes(&bytes).unwrap();
        assert_eq!(proof.a, [0u8; 64]);
        assert_eq!(proof.b, [0u8; 128]);
        assert_eq!(proof.c, [0u8; 64]);
    }

    #[test]
    fn test_invalid_proof_length() {
        let bytes = [0u8; 100];
        assert!(Groth16Proof::from_bytes(&bytes).is_err());
    }
}
