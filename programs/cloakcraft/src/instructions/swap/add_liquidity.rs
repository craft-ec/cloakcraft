//! Add liquidity to internal AMM pool
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

/// Parameters for Light Protocol operations in add liquidity
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightAddLiquidityParams {
    /// Validity proof for nullifier A
    pub nullifier_a_proof: LightValidityProof,
    /// Address tree info for nullifier A
    pub nullifier_a_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for nullifier B
    pub nullifier_b_proof: LightValidityProof,
    /// Address tree info for nullifier B
    pub nullifier_b_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for LP commitment
    pub lp_commitment_proof: LightValidityProof,
    /// Address tree info for LP commitment
    pub lp_commitment_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for change A commitment
    pub change_a_commitment_proof: LightValidityProof,
    /// Address tree info for change A commitment
    pub change_a_commitment_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for change B commitment
    pub change_b_commitment_proof: LightValidityProof,
    /// Address tree info for change B commitment
    pub change_b_commitment_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    /// Token A pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool_a.token_mint.as_ref()],
        bump = pool_a.bump,
    )]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Commitment counter for pool A
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool_a.key().as_ref()],
        bump = pool_a_commitment_counter.bump,
    )]
    pub pool_a_commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// Token B pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool_b.token_mint.as_ref()],
        bump = pool_b.bump,
    )]
    pub pool_b: Box<Account<'info, Pool>>,

    /// Commitment counter for pool B
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool_b.key().as_ref()],
        bump = pool_b_commitment_counter.bump,
    )]
    pub pool_b_commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// LP token pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, lp_pool.token_mint.as_ref()],
        bump = lp_pool.bump,
    )]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// Commitment counter for LP pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, lp_pool.key().as_ref()],
        bump = lp_commitment_counter.bump,
    )]
    pub lp_commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// AMM pool state
    #[account(
        mut,
        seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Relayer (pays for compressed account creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    // Light Protocol accounts are passed via remaining_accounts
}

#[allow(clippy::too_many_arguments)]
pub fn add_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, AddLiquidity<'info>>,
    proof: Vec<u8>,
    nullifier_a: [u8; 32],
    nullifier_b: [u8; 32],
    lp_commitment: [u8; 32],
    change_a_commitment: [u8; 32],
    change_b_commitment: [u8; 32],
    old_state_hash: [u8; 32],
    new_state_hash: [u8; 32],
    encrypted_notes: Vec<Vec<u8>>,
    light_params: Option<LightAddLiquidityParams>,
) -> Result<()> {
    let pool_a = &mut ctx.accounts.pool_a;
    let pool_b = &mut ctx.accounts.pool_b;
    let lp_pool = &mut ctx.accounts.lp_pool;
    let pool_a_counter = &mut ctx.accounts.pool_a_commitment_counter;
    let pool_b_counter = &mut ctx.accounts.pool_b_commitment_counter;
    let lp_counter = &mut ctx.accounts.lp_commitment_counter;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let clock = Clock::get()?;

    // 1. Verify current pool state matches
    require!(
        amm_pool.verify_state_hash(&old_state_hash),
        CloakCraftError::InvalidPoolState
    );

    // 2. Verify ZK proof
    // Merkle root is now verified by Light Protocol validity proof
    let public_inputs = build_add_liquidity_inputs(
        &nullifier_a,
        &nullifier_b,
        &amm_pool.pool_id,
        &lp_commitment,
        &change_a_commitment,
        &change_b_commitment,
        &old_state_hash,
        &new_state_hash,
    );

    verify_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
    )?;

    // 3. Create nullifier compressed accounts via Light Protocol
    if let Some(ref params) = light_params {
        create_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.nullifier_a_proof.clone(),
            params.nullifier_a_address_tree_info.clone(),
            params.output_tree_index,
            pool_a.key(),
            nullifier_a,
        )?;

        create_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.nullifier_b_proof.clone(),
            params.nullifier_b_address_tree_info.clone(),
            params.output_tree_index,
            pool_b.key(),
            nullifier_b,
        )?;
    }

    emit!(NoteSpent { pool: pool_a.key(), nullifier: nullifier_a, timestamp: clock.unix_timestamp });
    emit!(NoteSpent { pool: pool_b.key(), nullifier: nullifier_b, timestamp: clock.unix_timestamp });

    // 4. Create LP token commitment via Light Protocol
    let lp_leaf = lp_counter.next_leaf_index;
    lp_counter.next_leaf_index += 1;
    lp_counter.total_commitments += 1;

    let lp_encrypted_note = encrypted_notes.get(0).cloned().unwrap_or_default();
    if let Some(ref params) = light_params {
        let encrypted_note_hash = compute_note_hash(&lp_commitment, &lp_encrypted_note);
        create_commitment_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.lp_commitment_proof.clone(),
            params.lp_commitment_address_tree_info.clone(),
            params.output_tree_index,
            lp_pool.key(),
            lp_commitment,
            lp_leaf,
            encrypted_note_hash,
        )?;
    }

    emit!(NoteCreated {
        pool: lp_pool.key(),
        commitment: lp_commitment,
        leaf_index: lp_leaf as u32,
        encrypted_note: lp_encrypted_note,
        timestamp: clock.unix_timestamp,
    });

    // 5. Create change commitments if non-zero
    if change_a_commitment != [0u8; 32] {
        let leaf = pool_a_counter.next_leaf_index;
        pool_a_counter.next_leaf_index += 1;
        pool_a_counter.total_commitments += 1;

        let change_a_note = encrypted_notes.get(1).cloned().unwrap_or_default();
        if let Some(ref params) = light_params {
            let encrypted_note_hash = compute_note_hash(&change_a_commitment, &change_a_note);
            create_commitment_account(
                &ctx.accounts.relayer.to_account_info(),
                ctx.remaining_accounts,
                params.change_a_commitment_proof.clone(),
                params.change_a_commitment_address_tree_info.clone(),
                params.output_tree_index,
                pool_a.key(),
                change_a_commitment,
                leaf,
                encrypted_note_hash,
            )?;
        }

        emit!(NoteCreated {
            pool: pool_a.key(),
            commitment: change_a_commitment,
            leaf_index: leaf as u32,
            encrypted_note: change_a_note,
            timestamp: clock.unix_timestamp,
        });
    }

    if change_b_commitment != [0u8; 32] {
        let leaf = pool_b_counter.next_leaf_index;
        pool_b_counter.next_leaf_index += 1;
        pool_b_counter.total_commitments += 1;

        let change_b_note = encrypted_notes.get(2).cloned().unwrap_or_default();
        if let Some(ref params) = light_params {
            let encrypted_note_hash = compute_note_hash(&change_b_commitment, &change_b_note);
            create_commitment_account(
                &ctx.accounts.relayer.to_account_info(),
                ctx.remaining_accounts,
                params.change_b_commitment_proof.clone(),
                params.change_b_commitment_address_tree_info.clone(),
                params.output_tree_index,
                pool_b.key(),
                change_b_commitment,
                leaf,
                encrypted_note_hash,
            )?;
        }

        emit!(NoteCreated {
            pool: pool_b.key(),
            commitment: change_b_commitment,
            leaf_index: leaf as u32,
            encrypted_note: change_b_note,
            timestamp: clock.unix_timestamp,
        });
    }

    // 6. Update AMM pool state
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

fn build_add_liquidity_inputs(
    nullifier_a: &[u8; 32],
    nullifier_b: &[u8; 32],
    pool_id: &Pubkey,
    lp_commitment: &[u8; 32],
    change_a_commitment: &[u8; 32],
    change_b_commitment: &[u8; 32],
    old_state_hash: &[u8; 32],
    new_state_hash: &[u8; 32],
) -> Vec<[u8; 32]> {
    // Note: merkle_root is no longer a public input - verified by Light Protocol
    vec![
        *nullifier_a,
        *nullifier_b,
        pool_id.to_bytes(),
        *lp_commitment,
        *change_a_commitment,
        *change_b_commitment,
        *old_state_hash,
        *new_state_hash,
    ]
}
