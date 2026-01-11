//! Remove liquidity from internal AMM pool

use anchor_lang::prelude::*;

use crate::state::{Pool, AmmPool, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteSpent, NoteCreated, AmmPoolStateChanged};
use crate::merkle::insert_leaf;
use crate::crypto::verify_proof;

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    /// Token A pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, pool_a.token_mint.as_ref()], bump = pool_a.bump)]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Token B pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, pool_b.token_mint.as_ref()], bump = pool_b.bump)]
    pub pool_b: Box<Account<'info, Pool>>,

    /// LP token pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, lp_pool.token_mint.as_ref()], bump = lp_pool.bump)]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// AMM pool state
    #[account(mut, seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()], bump = amm_pool.bump)]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key
    #[account(seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()], bump = verification_key.bump)]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    pub relayer: Signer<'info>,
}

#[allow(clippy::too_many_arguments)]
pub fn remove_liquidity(
    ctx: Context<RemoveLiquidity>,
    proof: Vec<u8>,
    lp_nullifier: [u8; 32],
    out_a_commitment: [u8; 32],
    out_b_commitment: [u8; 32],
    old_state_hash: [u8; 32],
    new_state_hash: [u8; 32],
    encrypted_notes: Vec<Vec<u8>>,
) -> Result<()> {
    let pool_a = &mut ctx.accounts.pool_a;
    let pool_b = &mut ctx.accounts.pool_b;
    let lp_pool = &mut ctx.accounts.lp_pool;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let clock = Clock::get()?;

    // 1. Verify state
    require!(amm_pool.verify_state_hash(&old_state_hash), CloakCraftError::InvalidPoolState);

    // 2. Verify proof
    let public_inputs = vec![
        lp_pool.merkle_root,
        lp_nullifier,
        amm_pool.pool_id.to_bytes(),
        out_a_commitment,
        out_b_commitment,
        old_state_hash,
        new_state_hash,
    ];

    verify_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs)?;

    // 3. Spend LP tokens
    emit!(NoteSpent { pool: lp_pool.key(), nullifier: lp_nullifier, timestamp: clock.unix_timestamp });

    // 4. Create output commitments
    require!(pool_a.can_insert(), CloakCraftError::TreeFull);
    let leaf_a = pool_a.next_leaf_index;
    let root_a = insert_leaf(&mut pool_a.frontier, leaf_a, out_a_commitment)?;
    pool_a.update_root(root_a);
    pool_a.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: pool_a.key(),
        commitment: out_a_commitment,
        leaf_index: leaf_a,
        encrypted_note: encrypted_notes.get(0).cloned().unwrap_or_default(),
        timestamp: clock.unix_timestamp,
    });

    require!(pool_b.can_insert(), CloakCraftError::TreeFull);
    let leaf_b = pool_b.next_leaf_index;
    let root_b = insert_leaf(&mut pool_b.frontier, leaf_b, out_b_commitment)?;
    pool_b.update_root(root_b);
    pool_b.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: pool_b.key(),
        commitment: out_b_commitment,
        leaf_index: leaf_b,
        encrypted_note: encrypted_notes.get(1).cloned().unwrap_or_default(),
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
