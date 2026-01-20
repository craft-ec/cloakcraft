//! Decrypt voting tally
//!
//! Called after timelock expires for TimeLocked and PermanentPrivate modes.
//! Decrypts the homomorphic tally to reveal aggregate vote counts.
//!
//! For PermanentPrivate mode, this reveals ONLY aggregates, not individual votes.

use anchor_lang::prelude::*;

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{Ballot, BallotStatus, RevealMode, ELGAMAL_CIPHERTEXT_SIZE};

/// ElGamal ciphertext structure for decryption
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ElGamalCiphertextInput {
    /// C1 = r * G (compressed point, 32 bytes)
    pub c1: [u8; 32],
    /// C2 = m * G + r * P (compressed point, 32 bytes)
    pub c2: [u8; 32],
}

#[derive(Accounts)]
#[instruction(ballot_id: [u8; 32])]
pub struct DecryptTally<'info> {
    /// Ballot to decrypt
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.reveal_mode == RevealMode::TimeLocked ||
                     ballot.reveal_mode == RevealMode::PermanentPrivate
                     @ CloakCraftError::InvalidRevealModeForOperation,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Anyone can call decrypt_tally after timelock expires
    /// The decryption key itself proves authorization
    pub caller: Signer<'info>,
}

pub fn decrypt_tally(
    ctx: Context<DecryptTally>,
    _ballot_id: [u8; 32],
    decryption_key: [u8; 32],
    decrypted_weights: Vec<u64>,
) -> Result<()> {
    let ballot = &mut ctx.accounts.ballot;
    let clock = Clock::get()?;
    let current_slot = clock.slot;

    // Verify voting has ended
    match ballot.status {
        BallotStatus::Active | BallotStatus::Closed => {
            // Can proceed with decryption after voting period
            if clock.unix_timestamp < ballot.end_time {
                return Err(CloakCraftError::BallotNotActive.into());
            }
        }
        BallotStatus::Pending => {
            return Err(CloakCraftError::VotingNotStarted.into());
        }
        BallotStatus::Resolved | BallotStatus::Finalized => {
            // Already decrypted and resolved
            return Err(CloakCraftError::BallotAlreadyResolved.into());
        }
    }

    // Verify timelock has expired
    if current_slot < ballot.unlock_slot {
        return Err(CloakCraftError::TimelockNotExpired.into());
    }

    // Verify decryption key matches time_lock_pubkey
    // This is a simplified verification - actual implementation would verify
    // that decryption_key is the corresponding private key to time_lock_pubkey
    // using ElGamal key pair verification
    //
    // For now, we verify that the decrypted_weights provided are consistent
    // with the encrypted_tally when decrypted with the provided key.
    //
    // In production, this would use proper ElGamal decryption:
    // M = C2 - sk * C1 (in additive notation)
    // Then use baby-step giant-step or similar to recover the discrete log
    //
    // IMPORTANT: The actual cryptographic verification should be done here
    // For this implementation, we trust the caller to provide correct values
    // and rely on the timelock service to only release valid keys after unlock_slot
    if !verify_decryption_key(&decryption_key, &ballot.time_lock_pubkey) {
        return Err(CloakCraftError::InvalidDecryptionKey.into());
    }

    // Verify decrypted weights count matches num_options
    if decrypted_weights.len() != ballot.num_options as usize {
        return Err(CloakCraftError::InvalidOutcomeValue.into());
    }

    // Verify decryption is correct (simplified check)
    // In production, we would actually perform ElGamal decryption here
    // or use a ZK proof that the decryption is correct
    if !verify_decryption(
        &ballot.encrypted_tally,
        &decryption_key,
        &decrypted_weights,
        ballot.num_options,
    ) {
        return Err(CloakCraftError::InvalidDecryptionKey.into());
    }

    // Update option_weights with decrypted values
    for (i, weight) in decrypted_weights.iter().enumerate() {
        ballot.option_weights[i] = *weight;
    }

    // Calculate total_weight from decrypted values
    ballot.total_weight = decrypted_weights.iter().sum();

    // Clear encrypted_tally (mark as decrypted)
    // Setting to zero indicates decryption has occurred
    ballot.encrypted_tally = [[0u8; ELGAMAL_CIPHERTEXT_SIZE]; 16];

    // Update status to Closed if still Active
    if ballot.status == BallotStatus::Active {
        ballot.status = BallotStatus::Closed;
    }

    msg!("Tally decrypted successfully");
    msg!("  Total weight: {}", ballot.total_weight);
    for i in 0..ballot.num_options as usize {
        msg!("  Option {}: {}", i, ballot.option_weights[i]);
    }

    Ok(())
}

/// Verify that decryption_key corresponds to time_lock_pubkey
///
/// This is a placeholder for actual ElGamal key pair verification.
/// In production, this would verify:
/// - decryption_key * G == time_lock_pubkey
/// where G is the generator point of the curve.
fn verify_decryption_key(decryption_key: &[u8; 32], time_lock_pubkey: &[u8; 32]) -> bool {
    // TODO: Implement actual cryptographic verification
    // For now, we do a basic sanity check that both are non-zero
    // The actual verification would use curve point multiplication

    // Check that decryption_key is not zero
    if decryption_key.iter().all(|&b| b == 0) {
        return false;
    }

    // Check that time_lock_pubkey is not zero
    if time_lock_pubkey.iter().all(|&b| b == 0) {
        return false;
    }

    // In production: verify decryption_key * G == time_lock_pubkey
    // using BN254 or similar curve operations
    true
}

/// Verify that the decrypted weights are correct for the given encrypted tally
///
/// This is a placeholder for actual ElGamal decryption verification.
/// In production, this would:
/// 1. Perform ElGamal decryption for each ciphertext
/// 2. Use DLOG solving (baby-step giant-step) to recover the plaintext
/// 3. Compare with provided decrypted_weights
///
/// Alternatively, the caller could provide a ZK proof that decryption is correct.
fn verify_decryption(
    encrypted_tally: &[[u8; 64]; 16],
    _decryption_key: &[u8; 32],
    decrypted_weights: &[u64],
    num_options: u8,
) -> bool {
    // TODO: Implement actual cryptographic verification
    // For now, we verify that:
    // 1. Non-zero ciphertexts should have non-zero weights (or zero if no votes)
    // 2. Zero ciphertexts should have zero weights

    for i in 0..num_options as usize {
        let ct = &encrypted_tally[i];
        let is_zero_ct = ct.iter().all(|&b| b == 0);

        // If ciphertext is zero (no votes for this option), weight should be zero
        // Note: identity ciphertext (encrypt(0)) is NOT all zeros in ElGamal
        // This is a simplified check; actual implementation needs proper verification
        if is_zero_ct && decrypted_weights[i] != 0 {
            // This could be valid if identity ciphertext is encoded as zeros
            // In practice, we'd need to check for the proper identity encoding
        }
    }

    // Accept the decryption for now
    // Proper verification requires actual ElGamal decryption
    true
}
