//! Verify Proof Phase 0 - Verify ZK proof only
//!
//! This is Phase 0 of the multi-phase transact operation.
//! It ONLY verifies the ZK proof. No state changes occur.
//!
//! If this phase fails, no rent is wasted and no cleanup is needed.
//!
//! SECURITY CRITICAL: Proof must be verified before any state changes.
//!
//! Flow:
//! Phase 0 (this): Verify ZK proof (NO state changes, NO PDA, NO Light CPI)
//! Phase 1: Verify commitment exists (NO PDA, Light CPI ~8 accounts)
//! Phase 2: Create nullifier + Create pending operation (PDA init + Light CPI ~8 accounts)
//! Phase 3: Process unshield (NO Light CPI)
//! Phase 4+: Create commitments (Light CPI ~8 accounts each)
//! Final: Close pending operation

use anchor_lang::prelude::*;

use crate::state::{Pool, VerificationKey};
use crate::constants::seeds;
use crate::helpers::verify_groth16_proof;
use crate::helpers::field::{pubkey_to_field, u64_to_field};

#[derive(Accounts)]
pub struct VerifyProofForTransact<'info> {
    /// Pool
    #[account(
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Verification key for the circuit
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,
}

/// Phase 0: Verify ZK proof only (NO state changes)
///
/// SECURITY CRITICAL: This verifies the ZK proof before any state changes.
/// The proof verifies:
/// - Input commitment exists in merkle tree with given root
/// - Nullifier is correctly derived from commitment
/// - Output commitments are correctly computed
/// - Token mint and amounts are correct
///
/// This phase has NO state changes, NO PDA creation, NO Light Protocol CPI calls.
/// Transaction size: ~300 bytes (minimal).
#[allow(clippy::too_many_arguments)]
pub fn verify_proof_for_transact<'info>(
    ctx: Context<'_, '_, '_, 'info, VerifyProofForTransact<'info>>,
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    nullifier: [u8; 32],
    out_commitments: Vec<[u8; 32]>,
    unshield_amount: u64,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    msg!("=== Phase 0: Verify ZK Proof (NO state changes) ===");
    msg!("Pool: {:?}", pool.key());
    msg!("Merkle root: {:02x?}...", &merkle_root[0..8]);
    msg!("Nullifier: {:02x?}...", &nullifier[0..8]);

    // SECURITY: Verify ZK proof
    #[cfg(not(feature = "skip-zk-verify"))]
    {
        let public_inputs = build_transact_public_inputs(
            &merkle_root,
            &nullifier,
            &out_commitments,
            &pool.token_mint,
            unshield_amount,
        );

        verify_groth16_proof(
            &proof,
            &ctx.accounts.verification_key.vk_data,
            &public_inputs,
            "Transfer",
        )?;

        msg!("✅ ZK proof verified");
    }

    #[cfg(feature = "skip-zk-verify")]
    {
        msg!("WARNING: ZK proof verification skipped (testing mode)");
        let _ = &proof;
    }

    msg!("Phase 0 complete: ZK proof verified, no state changes");
    msg!("Next: Phase 1 - verify_commitment_for_transact");

    Ok(())
}

/// Build public inputs array for proof verification
/// Order matches circuit: merkle_root, nullifier, out_commitments, token_mint, unshield_amount
fn build_transact_public_inputs(
    merkle_root: &[u8; 32],
    nullifier: &[u8; 32],
    out_commitments: &[[u8; 32]],
    token_mint: &Pubkey,
    unshield_amount: u64,
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    inputs.push(*merkle_root);
    inputs.push(*nullifier);
    for commitment in out_commitments {
        inputs.push(*commitment);
    }
    inputs.push(pubkey_to_field(token_mint));
    inputs.push(u64_to_field(unshield_amount));
    inputs
}
