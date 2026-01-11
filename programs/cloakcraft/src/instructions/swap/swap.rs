//! Swap via internal AMM

use anchor_lang::prelude::*;

use crate::state::{Pool, AmmPool, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteSpent, NoteCreated, AmmPoolStateChanged};
use crate::merkle::insert_leaf;
use crate::crypto::verify_proof;

#[derive(Accounts)]
pub struct Swap<'info> {
    /// Input token pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, input_pool.token_mint.as_ref()], bump = input_pool.bump)]
    pub input_pool: Box<Account<'info, Pool>>,

    /// Output token pool (boxed to reduce stack usage)
    #[account(mut, seeds = [seeds::POOL, output_pool.token_mint.as_ref()], bump = output_pool.bump)]
    pub output_pool: Box<Account<'info, Pool>>,

    /// AMM pool state
    #[account(mut, seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()], bump = amm_pool.bump)]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key
    #[account(seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()], bump = verification_key.bump)]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    pub relayer: Signer<'info>,
}

#[allow(clippy::too_many_arguments)]
pub fn swap(
    ctx: Context<Swap>,
    proof: Vec<u8>,
    nullifier: [u8; 32],
    out_commitment: [u8; 32],
    change_commitment: [u8; 32],
    old_state_hash: [u8; 32],
    new_state_hash: [u8; 32],
    min_output: u64,
    encrypted_notes: Vec<Vec<u8>>,
) -> Result<()> {
    let input_pool = &mut ctx.accounts.input_pool;
    let output_pool = &mut ctx.accounts.output_pool;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let clock = Clock::get()?;

    // 1. Verify state
    require!(amm_pool.verify_state_hash(&old_state_hash), CloakCraftError::InvalidPoolState);

    // 2. Verify proof (includes slippage check)
    let mut min_output_bytes = [0u8; 32];
    min_output_bytes[..8].copy_from_slice(&min_output.to_le_bytes());

    let public_inputs = vec![
        input_pool.merkle_root,
        nullifier,
        amm_pool.pool_id.to_bytes(),
        out_commitment,
        change_commitment,
        old_state_hash,
        new_state_hash,
        min_output_bytes,
    ];

    verify_proof(&proof, &ctx.accounts.verification_key.vk_data, &public_inputs)?;

    // 3. Spend input
    emit!(NoteSpent { pool: input_pool.key(), nullifier, timestamp: clock.unix_timestamp });

    // 4. Create output commitment
    require!(output_pool.can_insert(), CloakCraftError::TreeFull);
    let out_leaf = output_pool.next_leaf_index;
    let out_root = insert_leaf(&mut output_pool.frontier, out_leaf, out_commitment)?;
    output_pool.update_root(out_root);
    output_pool.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: output_pool.key(),
        commitment: out_commitment,
        leaf_index: out_leaf,
        encrypted_note: encrypted_notes.get(0).cloned().unwrap_or_default(),
        timestamp: clock.unix_timestamp,
    });

    // 5. Create change commitment if non-zero
    if change_commitment != [0u8; 32] {
        require!(input_pool.can_insert(), CloakCraftError::TreeFull);
        let change_leaf = input_pool.next_leaf_index;
        let change_root = insert_leaf(&mut input_pool.frontier, change_leaf, change_commitment)?;
        input_pool.update_root(change_root);
        input_pool.next_leaf_index += 1;

        emit!(NoteCreated {
            pool: input_pool.key(),
            commitment: change_commitment,
            leaf_index: change_leaf,
            encrypted_note: encrypted_notes.get(1).cloned().unwrap_or_default(),
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
