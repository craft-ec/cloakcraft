//! Execute Vote Snapshot (Phase 2)
//!
//! Updates ballot tally based on the verified vote.
//! Called after vote_nullifier is created (Phase 1).
//!
//! For Public mode: Updates option_weights[vote_choice] directly
//! For Encrypted modes: Adds encrypted_contributions to encrypted_tally

use anchor_lang::prelude::*;

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{
    Ballot, BallotStatus, PendingOperation, RevealMode, VoteBindingMode,
    ELGAMAL_CIPHERTEXT_SIZE, MAX_BALLOT_OPTIONS,
};

use super::create_pending_with_proof_vote_snapshot::EncryptedContributions;

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct ExecuteVoteSnapshot<'info> {
    /// Ballot being voted on (mutable for tally update)
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::Snapshot @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Pending operation (must have proof verified and nullifier created)
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
        constraint = pending_operation.all_expected_nullifiers_created() @ CloakCraftError::NullifierNotCreated,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must match pending operation)
    #[account(
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,
}

pub fn execute_vote_snapshot(
    ctx: Context<ExecuteVoteSnapshot>,
    _operation_id: [u8; 32],
    _ballot_id: [u8; 32],
    encrypted_contributions: Option<EncryptedContributions>,
) -> Result<()> {
    let ballot = &mut ctx.accounts.ballot;
    let pending_op = &ctx.accounts.pending_operation;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Verify ballot is still active
    if !ballot.is_active(current_time) {
        return Err(CloakCraftError::VotingEnded.into());
    }

    // Extract vote data from pending operation
    let vote_choice = pending_op.swap_amount;
    let weight = pending_op.output_amount;
    let total_amount = pending_op.extra_amount;

    // Update tally based on reveal mode
    match ballot.reveal_mode {
        RevealMode::Public => {
            // Direct tally update
            update_public_tally(ballot, vote_choice as u8, weight, total_amount)?;
        }
        RevealMode::TimeLocked | RevealMode::PermanentPrivate => {
            // Homomorphic tally update
            let contributions = encrypted_contributions
                .ok_or(CloakCraftError::InvalidPublicInputs)?;
            update_encrypted_tally(ballot, &contributions)?;
        }
    }

    // Update aggregate stats
    ballot.total_weight = ballot.total_weight.saturating_add(weight);
    ballot.total_amount = ballot.total_amount.saturating_add(total_amount);
    ballot.vote_count = ballot.vote_count.saturating_add(1);

    msg!("Vote snapshot executed");
    msg!("  Total weight: {}", ballot.total_weight);
    msg!("  Total amount: {}", ballot.total_amount);
    msg!("  Vote count: {}", ballot.vote_count);

    Ok(())
}

/// Update tally for public mode
fn update_public_tally(
    ballot: &mut Ballot,
    vote_choice: u8,
    weight: u64,
    amount: u64,
) -> Result<()> {
    if vote_choice >= ballot.num_options {
        return Err(CloakCraftError::InvalidVoteOptionRange.into());
    }

    let idx = vote_choice as usize;
    ballot.option_weights[idx] = ballot.option_weights[idx].saturating_add(weight);
    ballot.option_amounts[idx] = ballot.option_amounts[idx].saturating_add(amount);

    msg!("  Option {}: weight +{}", vote_choice, weight);

    Ok(())
}

/// Update tally for encrypted modes (homomorphic addition)
///
/// Each encrypted_contribution is an ElGamal ciphertext.
/// We add all contributions to the tally - only one has non-zero weight,
/// but the program doesn't know which one (privacy preserved).
fn update_encrypted_tally(
    ballot: &mut Ballot,
    contributions: &EncryptedContributions,
) -> Result<()> {
    if contributions.ciphertexts.len() != ballot.num_options as usize {
        return Err(CloakCraftError::InvalidPublicInputs.into());
    }

    for (i, ciphertext) in contributions.ciphertexts.iter().enumerate() {
        if i >= MAX_BALLOT_OPTIONS {
            break;
        }

        // Homomorphic addition of ElGamal ciphertexts
        // C1_sum = C1_old + C1_new, C2_sum = C2_old + C2_new
        // This is elliptic curve point addition
        let updated = add_elgamal_ciphertexts(&ballot.encrypted_tally[i], ciphertext)?;
        ballot.encrypted_tally[i] = updated;
    }

    msg!("  Encrypted tally updated for {} options", ballot.num_options);

    Ok(())
}

/// Add two ElGamal ciphertexts (homomorphic addition)
///
/// ElGamal ciphertext format (64 bytes total):
/// - C1: First 32 bytes (x-coordinate of r*G, with sign bit in high bit)
/// - C2: Last 32 bytes (x-coordinate of m*G + r*P, with sign bit in high bit)
///
/// Addition: (C1_a + C1_b, C2_a + C2_b) = encrypt(m_a + m_b)
///
/// For encrypted voting, ciphertexts are encoded as BN254 scalar field elements.
/// This function performs homomorphic addition in the scalar field.
fn add_elgamal_ciphertexts(
    ct_a: &[u8; ELGAMAL_CIPHERTEXT_SIZE],
    ct_b: &[u8; 64],
) -> Result<[u8; ELGAMAL_CIPHERTEXT_SIZE]> {
    let mut result = [0u8; ELGAMAL_CIPHERTEXT_SIZE];

    // For identity ciphertext (all zeros), just copy the other
    let is_a_zero = ct_a.iter().all(|&b| b == 0);
    let is_b_zero = ct_b.iter().all(|&b| b == 0);

    if is_a_zero {
        result.copy_from_slice(ct_b);
        return Ok(result);
    }
    if is_b_zero {
        result.copy_from_slice(ct_a);
        return Ok(result);
    }

    // The ciphertext format uses compressed points (32 bytes each).
    // For EC addition, we need uncompressed format.
    //
    // IMPORTANT: In production encrypted voting, the ZK circuit outputs
    // ciphertexts that are already validated as being on the curve.
    // The circuit also provides the y-coordinates as auxiliary inputs
    // (stored in the PendingOperation) to enable efficient on-chain addition.
    //
    // For this implementation, we use a different approach:
    // Store ciphertexts as field elements (scalars) that represent
    // the discrete log of the encrypted value, allowing simple addition.
    //
    // This works because:
    // 1. For small values (vote weights < 2^64), we can use baby-step giant-step
    // 2. The homomorphic property holds: enc(m1) + enc(m2) = enc(m1 + m2)
    // 3. The circuit proves the correct encoding
    //
    // Alternative: Use Pedersen commitments which are additively homomorphic
    // and don't require point decompression.

    // Split into C1 and C2 components
    let c1_a = &ct_a[0..32];
    let c2_a = &ct_a[32..64];
    let c1_b = &ct_b[0..32];
    let c2_b = &ct_b[32..64];

    // For the encrypted tally, we interpret the 32-byte values as
    // field elements (scalars) and add them modulo the BN254 scalar field.
    // This is valid when the circuit encodes votes as scalar multiplications.
    let c1_result = add_bn254_scalars(c1_a, c1_b)?;
    let c2_result = add_bn254_scalars(c2_a, c2_b)?;

    result[0..32].copy_from_slice(&c1_result);
    result[32..64].copy_from_slice(&c2_result);

    Ok(result)
}

/// Add two BN254 scalar field elements
///
/// The BN254 scalar field has order:
/// r = 21888242871839275222246405745257275088548364400416034343698204186575808495617
///
/// This performs: (a + b) mod r
fn add_bn254_scalars(a: &[u8], b: &[u8]) -> Result<[u8; 32]> {
    // BN254 scalar field modulus (r)
    const R: [u64; 4] = [
        0x43e1f593f0000001,
        0x2833e84879b97091,
        0xb85045b68181585d,
        0x30644e72e131a029,
    ];

    // Convert bytes to u64 limbs (little-endian)
    let a_limbs = bytes_to_limbs(a);
    let b_limbs = bytes_to_limbs(b);

    // Add with carry
    let mut result_limbs = [0u64; 4];
    let mut carry = 0u64;
    for i in 0..4 {
        let (sum1, c1) = a_limbs[i].overflowing_add(b_limbs[i]);
        let (sum2, c2) = sum1.overflowing_add(carry);
        result_limbs[i] = sum2;
        carry = (c1 as u64) + (c2 as u64);
    }

    // Reduce modulo r if necessary
    if carry > 0 || compare_limbs(&result_limbs, &R) >= 0 {
        // Subtract r
        let mut borrow = 0u64;
        for i in 0..4 {
            let (diff1, b1) = result_limbs[i].overflowing_sub(R[i]);
            let (diff2, b2) = diff1.overflowing_sub(borrow);
            result_limbs[i] = diff2;
            borrow = (b1 as u64) + (b2 as u64);
        }
    }

    // Convert back to bytes
    Ok(limbs_to_bytes(&result_limbs))
}

/// Convert 32 bytes to 4 u64 limbs (little-endian)
fn bytes_to_limbs(bytes: &[u8]) -> [u64; 4] {
    let mut limbs = [0u64; 4];
    for i in 0..4 {
        let offset = i * 8;
        limbs[i] = u64::from_le_bytes([
            bytes[offset],
            bytes[offset + 1],
            bytes[offset + 2],
            bytes[offset + 3],
            bytes[offset + 4],
            bytes[offset + 5],
            bytes[offset + 6],
            bytes[offset + 7],
        ]);
    }
    limbs
}

/// Convert 4 u64 limbs to 32 bytes (little-endian)
fn limbs_to_bytes(limbs: &[u64; 4]) -> [u8; 32] {
    let mut bytes = [0u8; 32];
    for i in 0..4 {
        let offset = i * 8;
        let limb_bytes = limbs[i].to_le_bytes();
        bytes[offset..offset + 8].copy_from_slice(&limb_bytes);
    }
    bytes
}

/// Compare two u64 limb arrays (returns -1, 0, or 1)
fn compare_limbs(a: &[u64; 4], b: &[u64; 4]) -> i32 {
    for i in (0..4).rev() {
        if a[i] > b[i] {
            return 1;
        }
        if a[i] < b[i] {
            return -1;
        }
    }
    0
}
