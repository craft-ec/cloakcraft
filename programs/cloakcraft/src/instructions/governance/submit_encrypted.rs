//! Submit an encrypted vote

use anchor_lang::prelude::*;

use crate::state::{Pool, Aggregation, ElGamalCiphertext, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::VoteSubmitted;
use crate::crypto::verify_proof;

#[derive(Accounts)]
pub struct SubmitEncrypted<'info> {
    /// Aggregation
    #[account(
        mut,
        seeds = [seeds::AGGREGATION, aggregation.id.as_ref()],
        bump = aggregation.bump,
    )]
    pub aggregation: Account<'info, Aggregation>,

    /// Token pool (boxed to reduce stack usage)
    #[account(seeds = [seeds::POOL, pool.token_mint.as_ref()], bump = pool.bump)]
    pub pool: Box<Account<'info, Pool>>,

    /// Verification key (boxed to reduce stack usage)
    #[account(seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()], bump = verification_key.bump)]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Voter/relayer
    pub relayer: Signer<'info>,
}

pub fn submit_encrypted(
    ctx: Context<SubmitEncrypted>,
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    action_nullifier: [u8; 32],
    encrypted_votes: Vec<[u8; 64]>,
) -> Result<()> {
    let aggregation = &mut ctx.accounts.aggregation;
    let pool = &ctx.accounts.pool;
    let clock = Clock::get()?;

    // 1. Verify aggregation is active
    require!(
        aggregation.is_active(clock.unix_timestamp),
        CloakCraftError::AggregationNotActive
    );

    // 2. Verify merkle root
    require!(
        pool.is_valid_root(&merkle_root),
        CloakCraftError::InvalidMerkleRoot
    );

    // 3. Verify encrypted votes count matches options
    require!(
        encrypted_votes.len() == aggregation.num_options as usize,
        CloakCraftError::InvalidVoteOption
    );

    // 4. Build and verify ZK proof
    let public_inputs = build_vote_public_inputs(
        &merkle_root,
        &action_nullifier,
        &aggregation.id,
        &aggregation.token_mint,
        &aggregation.threshold_pubkey,
        &encrypted_votes,
    );

    verify_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs)?;

    // 5. Homomorphically add encrypted votes to tallies
    for (i, encrypted_vote) in encrypted_votes.iter().enumerate() {
        let new_cipher = parse_ciphertext(encrypted_vote);
        let current = &aggregation.encrypted_tallies[i];
        aggregation.encrypted_tallies[i] = add_ciphertexts(current, &new_cipher);
    }

    // 6. Record action nullifier spent (via Light Protocol in production)
    // For now, emit event for indexer

    emit!(VoteSubmitted {
        aggregation_id: aggregation.id,
        action_nullifier,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

fn build_vote_public_inputs(
    merkle_root: &[u8; 32],
    action_nullifier: &[u8; 32],
    proposal_id: &[u8; 32],
    token_mint: &Pubkey,
    threshold_pubkey: &[u8; 32],
    encrypted_votes: &[[u8; 64]],
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    inputs.push(*merkle_root);
    inputs.push(*action_nullifier);
    inputs.push(*proposal_id);
    inputs.push(token_mint.to_bytes());
    inputs.push(*threshold_pubkey);
    for ev in encrypted_votes {
        let (c1, c2) = ev.split_at(32);
        inputs.push(c1.try_into().unwrap());
        inputs.push(c2.try_into().unwrap());
    }
    inputs
}

fn parse_ciphertext(data: &[u8; 64]) -> ElGamalCiphertext {
    let mut c1 = [0u8; 32];
    let mut c2 = [0u8; 32];
    c1.copy_from_slice(&data[..32]);
    c2.copy_from_slice(&data[32..]);
    ElGamalCiphertext { c1, c2 }
}

fn add_ciphertexts(a: &ElGamalCiphertext, b: &ElGamalCiphertext) -> ElGamalCiphertext {
    // Homomorphic addition of ElGamal ciphertexts
    // In production, use proper curve point addition
    // For now, simple XOR as placeholder
    let mut c1 = [0u8; 32];
    let mut c2 = [0u8; 32];
    for i in 0..32 {
        c1[i] = a.c1[i] ^ b.c1[i];
        c2[i] = a.c2[i] ^ b.c2[i];
    }
    ElGamalCiphertext { c1, c2 }
}
