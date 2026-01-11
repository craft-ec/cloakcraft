//! Add liquidity to internal AMM pool

use anchor_lang::prelude::*;

use crate::state::{Pool, AmmPool, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteSpent, NoteCreated, AmmPoolStateChanged};
use crate::merkle::insert_leaf;
use crate::crypto::verify_proof;

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    /// Token A pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool_a.token_mint.as_ref()],
        bump = pool_a.bump,
    )]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Token B pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool_b.token_mint.as_ref()],
        bump = pool_b.bump,
    )]
    pub pool_b: Box<Account<'info, Pool>>,

    /// LP token pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, lp_pool.token_mint.as_ref()],
        bump = lp_pool.bump,
    )]
    pub lp_pool: Box<Account<'info, Pool>>,

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

    /// Relayer
    pub relayer: Signer<'info>,
}

#[allow(clippy::too_many_arguments)]
pub fn add_liquidity(
    ctx: Context<AddLiquidity>,
    proof: Vec<u8>,
    nullifier_a: [u8; 32],
    nullifier_b: [u8; 32],
    lp_commitment: [u8; 32],
    change_a_commitment: [u8; 32],
    change_b_commitment: [u8; 32],
    old_state_hash: [u8; 32],
    new_state_hash: [u8; 32],
    encrypted_notes: Vec<Vec<u8>>,
) -> Result<()> {
    let pool_a = &mut ctx.accounts.pool_a;
    let pool_b = &mut ctx.accounts.pool_b;
    let lp_pool = &mut ctx.accounts.lp_pool;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let clock = Clock::get()?;

    // 1. Verify current pool state matches
    require!(
        amm_pool.verify_state_hash(&old_state_hash),
        CloakCraftError::InvalidPoolState
    );

    // 2. Verify ZK proof
    let public_inputs = build_add_liquidity_inputs(
        &pool_a.merkle_root,
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

    // 3. Spend input notes
    emit!(NoteSpent { pool: pool_a.key(), nullifier: nullifier_a, timestamp: clock.unix_timestamp });
    emit!(NoteSpent { pool: pool_b.key(), nullifier: nullifier_b, timestamp: clock.unix_timestamp });

    // 4. Create LP token commitment
    require!(lp_pool.can_insert(), CloakCraftError::TreeFull);
    let lp_leaf = lp_pool.next_leaf_index;
    let lp_root = insert_leaf(&mut lp_pool.frontier, lp_leaf, lp_commitment)?;
    lp_pool.update_root(lp_root);
    lp_pool.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: lp_pool.key(),
        commitment: lp_commitment,
        leaf_index: lp_leaf,
        encrypted_note: encrypted_notes.get(0).cloned().unwrap_or_default(),
        timestamp: clock.unix_timestamp,
    });

    // 5. Create change commitments if non-zero
    if change_a_commitment != [0u8; 32] {
        require!(pool_a.can_insert(), CloakCraftError::TreeFull);
        let leaf = pool_a.next_leaf_index;
        let root = insert_leaf(&mut pool_a.frontier, leaf, change_a_commitment)?;
        pool_a.update_root(root);
        pool_a.next_leaf_index += 1;

        emit!(NoteCreated {
            pool: pool_a.key(),
            commitment: change_a_commitment,
            leaf_index: leaf,
            encrypted_note: encrypted_notes.get(1).cloned().unwrap_or_default(),
            timestamp: clock.unix_timestamp,
        });
    }

    if change_b_commitment != [0u8; 32] {
        require!(pool_b.can_insert(), CloakCraftError::TreeFull);
        let leaf = pool_b.next_leaf_index;
        let root = insert_leaf(&mut pool_b.frontier, leaf, change_b_commitment)?;
        pool_b.update_root(root);
        pool_b.next_leaf_index += 1;

        emit!(NoteCreated {
            pool: pool_b.key(),
            commitment: change_b_commitment,
            leaf_index: leaf,
            encrypted_note: encrypted_notes.get(2).cloned().unwrap_or_default(),
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

fn build_add_liquidity_inputs(
    merkle_root: &[u8; 32],
    nullifier_a: &[u8; 32],
    nullifier_b: &[u8; 32],
    pool_id: &Pubkey,
    lp_commitment: &[u8; 32],
    change_a_commitment: &[u8; 32],
    change_b_commitment: &[u8; 32],
    old_state_hash: &[u8; 32],
    new_state_hash: &[u8; 32],
) -> Vec<[u8; 32]> {
    vec![
        *merkle_root,
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
