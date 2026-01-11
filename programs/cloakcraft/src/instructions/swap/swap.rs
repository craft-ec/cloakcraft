//! Swap via internal AMM
//!
//! Uses Light Protocol for nullifier and commitment storage.

use anchor_lang::prelude::*;

use crate::state::{Pool, AmmPool, VerificationKey, PoolCommitmentCounter, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteSpent, NoteCreated, AmmPoolStateChanged};
use crate::crypto::verify_proof;
use crate::light_cpi::{create_nullifier_account, create_commitment_account};
use crate::merkle::hash_pair;

/// Parameters for Light Protocol operations in swap
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightSwapParams {
    /// Validity proof for input nullifier
    pub nullifier_proof: LightValidityProof,
    /// Address tree info for input nullifier
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for output commitment
    pub out_commitment_proof: LightValidityProof,
    /// Address tree info for output commitment
    pub out_commitment_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for change commitment
    pub change_commitment_proof: LightValidityProof,
    /// Address tree info for change commitment
    pub change_commitment_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    /// Input token pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, input_pool.token_mint.as_ref()], bump = input_pool.bump)]
    pub input_pool: Box<Account<'info, Pool>>,

    /// Commitment counter for input pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, input_pool.key().as_ref()],
        bump = input_commitment_counter.bump,
    )]
    pub input_commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// Output token pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, output_pool.token_mint.as_ref()], bump = output_pool.bump)]
    pub output_pool: Box<Account<'info, Pool>>,

    /// Commitment counter for output pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, output_pool.key().as_ref()],
        bump = output_commitment_counter.bump,
    )]
    pub output_commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// AMM pool state
    #[account(mut, seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()], bump = amm_pool.bump)]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key
    #[account(seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()], bump = verification_key.bump)]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Relayer (pays for compressed account creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    // Light Protocol accounts are passed via remaining_accounts
}

#[allow(clippy::too_many_arguments)]
pub fn swap<'info>(
    ctx: Context<'_, '_, '_, 'info, Swap<'info>>,
    proof: Vec<u8>,
    nullifier: [u8; 32],
    out_commitment: [u8; 32],
    change_commitment: [u8; 32],
    old_state_hash: [u8; 32],
    new_state_hash: [u8; 32],
    min_output: u64,
    encrypted_notes: Vec<Vec<u8>>,
    light_params: Option<LightSwapParams>,
) -> Result<()> {
    let input_pool = &mut ctx.accounts.input_pool;
    let output_pool = &mut ctx.accounts.output_pool;
    let input_counter = &mut ctx.accounts.input_commitment_counter;
    let output_counter = &mut ctx.accounts.output_commitment_counter;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let clock = Clock::get()?;

    // 1. Verify state
    require!(amm_pool.verify_state_hash(&old_state_hash), CloakCraftError::InvalidPoolState);

    // 2. Verify proof (includes slippage check)
    // Merkle root is now verified by Light Protocol validity proof
    let mut min_output_bytes = [0u8; 32];
    min_output_bytes[..8].copy_from_slice(&min_output.to_le_bytes());

    let public_inputs = vec![
        nullifier,
        amm_pool.pool_id.to_bytes(),
        out_commitment,
        change_commitment,
        old_state_hash,
        new_state_hash,
        min_output_bytes,
    ];

    verify_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs)?;

    // 3. Create nullifier compressed account via Light Protocol
    if let Some(ref params) = light_params {
        create_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.nullifier_proof.clone(),
            params.nullifier_address_tree_info.clone(),
            params.output_tree_index,
            input_pool.key(),
            nullifier,
        )?;
    }

    emit!(NoteSpent { pool: input_pool.key(), nullifier, timestamp: clock.unix_timestamp });

    // 4. Create output commitment via Light Protocol
    let out_leaf = output_counter.next_leaf_index;
    output_counter.next_leaf_index += 1;
    output_counter.total_commitments += 1;

    let out_note = encrypted_notes.get(0).cloned().unwrap_or_default();
    if let Some(ref params) = light_params {
        let encrypted_note_hash = compute_note_hash(&out_commitment, &out_note);
        create_commitment_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.out_commitment_proof.clone(),
            params.out_commitment_address_tree_info.clone(),
            params.output_tree_index,
            output_pool.key(),
            out_commitment,
            out_leaf,
            encrypted_note_hash,
        )?;
    }

    emit!(NoteCreated {
        pool: output_pool.key(),
        commitment: out_commitment,
        leaf_index: out_leaf as u32,
        encrypted_note: out_note,
        timestamp: clock.unix_timestamp,
    });

    // 5. Create change commitment if non-zero
    if change_commitment != [0u8; 32] {
        let change_leaf = input_counter.next_leaf_index;
        input_counter.next_leaf_index += 1;
        input_counter.total_commitments += 1;

        let change_note = encrypted_notes.get(1).cloned().unwrap_or_default();
        if let Some(ref params) = light_params {
            let encrypted_note_hash = compute_note_hash(&change_commitment, &change_note);
            create_commitment_account(
                &ctx.accounts.relayer.to_account_info(),
                ctx.remaining_accounts,
                params.change_commitment_proof.clone(),
                params.change_commitment_address_tree_info.clone(),
                params.output_tree_index,
                input_pool.key(),
                change_commitment,
                change_leaf,
                encrypted_note_hash,
            )?;
        }

        emit!(NoteCreated {
            pool: input_pool.key(),
            commitment: change_commitment,
            leaf_index: change_leaf as u32,
            encrypted_note: change_note,
            timestamp: clock.unix_timestamp,
        });
    }

    // 6. Update state
    amm_pool.state_hash = new_state_hash;

    emit!(AmmPoolStateChanged {
        pool_id: amm_pool.pool_id,
        state_hash: new_state_hash,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

fn compute_note_hash(commitment: &[u8; 32], encrypted_note: &[u8]) -> [u8; 32] {
    let note_bytes = if encrypted_note.len() >= 32 {
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&encrypted_note[..32]);
        arr
    } else {
        let mut arr = [0u8; 32];
        arr[..encrypted_note.len()].copy_from_slice(encrypted_note);
        arr
    };
    hash_pair(commitment, &note_bytes)
}
