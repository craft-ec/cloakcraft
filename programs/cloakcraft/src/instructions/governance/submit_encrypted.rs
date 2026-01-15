//! Submit an encrypted vote
//!
//! Uses Light Protocol for action nullifier storage to prevent double-voting.

use anchor_lang::prelude::*;

use crate::state::{Pool, Aggregation, ElGamalCiphertext, VerificationKey, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::crypto::add_elgamal_ciphertexts;
use crate::helpers::verify_groth16_proof;
use crate::light_cpi::create_action_nullifier_account;

/// Parameters for Light Protocol nullifier storage
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightVoteParams {
    /// Validity proof for action nullifier (proves it doesn't exist)
    pub nullifier_proof: LightValidityProof,
    /// Address tree info for nullifier
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

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

    /// Voter/relayer (pays for compressed account creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    // Light Protocol accounts are passed via remaining_accounts
}

pub fn submit_encrypted<'info>(
    ctx: Context<'_, '_, '_, 'info, SubmitEncrypted<'info>>,
    proof: Vec<u8>,
    _merkle_root: [u8; 32], // Deprecated: merkle root now verified by Light Protocol
    action_nullifier: [u8; 32],
    encrypted_votes: Vec<[u8; 64]>,
    light_params: Option<LightVoteParams>,
) -> Result<()> {
    let aggregation = &mut ctx.accounts.aggregation;
    let pool = &ctx.accounts.pool;
    let clock = Clock::get()?;

    // 1. Verify aggregation is active
    require!(
        aggregation.is_active(clock.unix_timestamp),
        CloakCraftError::AggregationNotActive
    );

    // 2. Verify encrypted votes count matches options
    require!(
        encrypted_votes.len() == aggregation.num_options as usize,
        CloakCraftError::InvalidVoteOption
    );

    // 3. Build and verify ZK proof
    // Merkle root is now verified by Light Protocol validity proof
    let public_inputs = build_vote_public_inputs(
        &action_nullifier,
        &aggregation.id,
        &aggregation.token_mint,
        &aggregation.threshold_pubkey,
        &encrypted_votes,
    );

    verify_groth16_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs, "SubmitEncryptedVote")?;

    // 4. Create action nullifier compressed account via Light Protocol
    // This prevents double-voting - if the nullifier already exists, the CPI will fail
    // Seeds: ["action_nullifier", aggregation_id, nullifier]
    if let Some(params) = light_params {
        create_action_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.nullifier_proof,
            params.nullifier_address_tree_info,
            params.output_tree_index,
            aggregation.id,
            action_nullifier,
        )?;
    }

    // 5. Homomorphically add encrypted votes to tallies
    for (i, encrypted_vote) in encrypted_votes.iter().enumerate() {
        let new_cipher = parse_ciphertext(encrypted_vote);
        let current = &aggregation.encrypted_tallies[i];
        aggregation.encrypted_tallies[i] = add_ciphertexts(current, &new_cipher);
    }
    Ok(())
}

fn build_vote_public_inputs(
    action_nullifier: &[u8; 32],
    proposal_id: &[u8; 32],
    token_mint: &Pubkey,
    threshold_pubkey: &[u8; 32],
    encrypted_votes: &[[u8; 64]],
) -> Vec<[u8; 32]> {
    // Note: merkle_root is no longer a public input - verified by Light Protocol
    let mut inputs = Vec::new();
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
    // Homomorphic addition of ElGamal ciphertexts using proper BabyJubJub point addition
    add_elgamal_ciphertexts(a, b)
}
