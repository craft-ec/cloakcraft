//! Remove liquidity from internal AMM pool
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

/// Parameters for Light Protocol operations in remove liquidity
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightRemoveLiquidityParams {
    /// Validity proof for LP nullifier
    pub lp_nullifier_proof: LightValidityProof,
    /// Address tree info for LP nullifier
    pub lp_nullifier_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for output A commitment
    pub out_a_commitment_proof: LightValidityProof,
    /// Address tree info for output A commitment
    pub out_a_commitment_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for output B commitment
    pub out_b_commitment_proof: LightValidityProof,
    /// Address tree info for output B commitment
    pub out_b_commitment_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    /// Token A pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, pool_a.token_mint.as_ref()], bump = pool_a.bump)]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Commitment counter for pool A
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool_a.key().as_ref()],
        bump = pool_a_commitment_counter.bump,
    )]
    pub pool_a_commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// Token B pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, pool_b.token_mint.as_ref()], bump = pool_b.bump)]
    pub pool_b: Box<Account<'info, Pool>>,

    /// Commitment counter for pool B
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool_b.key().as_ref()],
        bump = pool_b_commitment_counter.bump,
    )]
    pub pool_b_commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// LP token pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, lp_pool.token_mint.as_ref()], bump = lp_pool.bump)]
    pub lp_pool: Box<Account<'info, Pool>>,

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
pub fn remove_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, RemoveLiquidity<'info>>,
    proof: Vec<u8>,
    lp_nullifier: [u8; 32],
    out_a_commitment: [u8; 32],
    out_b_commitment: [u8; 32],
    old_state_hash: [u8; 32],
    new_state_hash: [u8; 32],
    encrypted_notes: Vec<Vec<u8>>,
    light_params: Option<LightRemoveLiquidityParams>,
) -> Result<()> {
    let pool_a = &mut ctx.accounts.pool_a;
    let pool_b = &mut ctx.accounts.pool_b;
    let lp_pool = &mut ctx.accounts.lp_pool;
    let pool_a_counter = &mut ctx.accounts.pool_a_commitment_counter;
    let pool_b_counter = &mut ctx.accounts.pool_b_commitment_counter;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let clock = Clock::get()?;

    // 1. Verify state
    require!(amm_pool.verify_state_hash(&old_state_hash), CloakCraftError::InvalidPoolState);

    // 2. Verify proof
    // Merkle root is now verified by Light Protocol validity proof
    let public_inputs = vec![
        lp_nullifier,
        amm_pool.pool_id.to_bytes(),
        out_a_commitment,
        out_b_commitment,
        old_state_hash,
        new_state_hash,
    ];

    verify_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs)?;

    // 3. Create LP nullifier compressed account via Light Protocol
    if let Some(ref params) = light_params {
        create_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.lp_nullifier_proof.clone(),
            params.lp_nullifier_address_tree_info.clone(),
            params.output_tree_index,
            lp_pool.key(),
            lp_nullifier,
        )?;
    }

    emit!(NoteSpent { pool: lp_pool.key(), nullifier: lp_nullifier, timestamp: clock.unix_timestamp });

    // 4. Create output commitments via Light Protocol
    let leaf_a = pool_a_counter.next_leaf_index;
    pool_a_counter.next_leaf_index += 1;
    pool_a_counter.total_commitments += 1;

    let out_a_note = encrypted_notes.get(0).cloned().unwrap_or_default();
    if let Some(ref params) = light_params {
        let encrypted_note_hash = compute_note_hash(&out_a_commitment, &out_a_note);
        create_commitment_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.out_a_commitment_proof.clone(),
            params.out_a_commitment_address_tree_info.clone(),
            params.output_tree_index,
            pool_a.key(),
            out_a_commitment,
            leaf_a,
            encrypted_note_hash,
        )?;
    }

    emit!(NoteCreated {
        pool: pool_a.key(),
        commitment: out_a_commitment,
        leaf_index: leaf_a as u32,
        encrypted_note: out_a_note,
        timestamp: clock.unix_timestamp,
    });

    let leaf_b = pool_b_counter.next_leaf_index;
    pool_b_counter.next_leaf_index += 1;
    pool_b_counter.total_commitments += 1;

    let out_b_note = encrypted_notes.get(1).cloned().unwrap_or_default();
    if let Some(ref params) = light_params {
        let encrypted_note_hash = compute_note_hash(&out_b_commitment, &out_b_note);
        create_commitment_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.out_b_commitment_proof.clone(),
            params.out_b_commitment_address_tree_info.clone(),
            params.output_tree_index,
            pool_b.key(),
            out_b_commitment,
            leaf_b,
            encrypted_note_hash,
        )?;
    }

    emit!(NoteCreated {
        pool: pool_b.key(),
        commitment: out_b_commitment,
        leaf_index: leaf_b as u32,
        encrypted_note: out_b_note,
        timestamp: clock.unix_timestamp,
    });

    // 5. Update state
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
