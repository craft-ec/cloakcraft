//! Test instruction for verifying proofs without pool state checks
//! This is for testing the ZK verification pipeline only

use anchor_lang::prelude::*;
use crate::helpers::verify_groth16_proof;
use crate::state::VerificationKey;
use crate::constants::GROTH16_PROOF_SIZE;

#[derive(Accounts)]
pub struct TestVerifyProof<'info> {
    /// The verification key account
    #[account(
        constraint = verification_key.vk_data.len() > 0 @ crate::errors::CloakCraftError::InvalidVerificationKey
    )]
    pub verification_key: Account<'info, VerificationKey>,

    /// Payer for the transaction
    pub payer: Signer<'info>,
}

/// Test proof verification without pool state checks
/// This is for development/testing only
pub fn test_verify_groth16_proof(
    ctx: Context<TestVerifyProof>,
    proof: Vec<u8>,
    public_inputs: Vec<[u8; 32]>,
) -> Result<()> {
    msg!("=== Test Verify Proof Instruction ===");
    msg!("Proof length: {}", proof.len());
    msg!("Public inputs count: {}", public_inputs.len());

    // Validate proof size
    require!(
        proof.len() == GROTH16_PROOF_SIZE,
        crate::errors::CloakCraftError::InvalidProofLength
    );

    // Get VK data
    let vk_data = &ctx.accounts.verification_key.vk_data;
    msg!("VK data length: {}", vk_data.len());

    // Verify the proof
    verify_groth16_proof(&proof, vk_data, &public_inputs, "Test")?;

    msg!("=== Proof Verification PASSED ===");
    Ok(())
}
