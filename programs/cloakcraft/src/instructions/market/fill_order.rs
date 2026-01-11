//! Fill an order atomically

use anchor_lang::prelude::*;

use crate::state::{Pool, Order, OrderStatus, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteSpent, NoteCreated, OrderFilled, MerkleRootUpdated};
use crate::merkle::insert_leaf;
use crate::crypto::verify_proof;

#[derive(Accounts)]
#[instruction(
    maker_proof: Vec<u8>,
    taker_proof: Vec<u8>,
    escrow_nullifier: [u8; 32],
    taker_nullifier: [u8; 32],
    order_id: [u8; 32],
)]
pub struct FillOrder<'info> {
    /// Maker's offer token pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, maker_pool.token_mint.as_ref()],
        bump = maker_pool.bump,
    )]
    pub maker_pool: Box<Account<'info, Pool>>,

    /// Taker's payment token pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, taker_pool.token_mint.as_ref()],
        bump = taker_pool.bump,
    )]
    pub taker_pool: Box<Account<'info, Pool>>,

    /// Order being filled
    #[account(
        mut,
        seeds = [seeds::ORDER, order_id.as_ref()],
        bump = order.bump,
        constraint = order.is_open() @ CloakCraftError::OrderAlreadyFilled,
    )]
    pub order: Account<'info, Order>,

    /// Verification key (boxed to reduce stack usage)
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Relayer
    pub relayer: Signer<'info>,
}

pub fn fill_order(
    ctx: Context<FillOrder>,
    maker_proof: Vec<u8>,
    taker_proof: Vec<u8>,
    escrow_nullifier: [u8; 32],
    taker_nullifier: [u8; 32],
    order_id: [u8; 32],
    maker_out_commitment: [u8; 32],
    taker_out_commitment: [u8; 32],
    encrypted_notes: Vec<Vec<u8>>,
) -> Result<()> {
    let maker_pool = &mut ctx.accounts.maker_pool;
    let taker_pool = &mut ctx.accounts.taker_pool;
    let order = &mut ctx.accounts.order;
    let clock = Clock::get()?;

    // 1. Verify order not expired
    require!(
        !order.is_expired(clock.unix_timestamp),
        CloakCraftError::OrderExpired
    );

    // 2. Verify combined proof (maker escrow + taker input)
    let public_inputs = build_fill_order_inputs(
        &maker_pool.merkle_root,
        &taker_pool.merkle_root,
        &escrow_nullifier,
        &taker_nullifier,
        &order_id,
        &maker_out_commitment,
        &taker_out_commitment,
    );

    // Verify both proofs
    verify_proof(
        &maker_proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
    )?;

    verify_proof(
        &taker_proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
    )?;

    // 3. Spend escrow and taker input
    emit!(NoteSpent {
        pool: maker_pool.key(),
        nullifier: escrow_nullifier,
        timestamp: clock.unix_timestamp,
    });

    emit!(NoteSpent {
        pool: taker_pool.key(),
        nullifier: taker_nullifier,
        timestamp: clock.unix_timestamp,
    });

    // 4. Create output commitments
    // Maker receives taker's token (in taker_pool)
    require!(taker_pool.can_insert(), CloakCraftError::TreeFull);
    let maker_leaf_index = taker_pool.next_leaf_index;
    let maker_new_root = insert_leaf(
        &mut taker_pool.frontier,
        maker_leaf_index,
        maker_out_commitment,
    )?;
    taker_pool.update_root(maker_new_root);
    taker_pool.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: taker_pool.key(),
        commitment: maker_out_commitment,
        leaf_index: maker_leaf_index,
        encrypted_note: encrypted_notes.get(0).cloned().unwrap_or_default(),
        timestamp: clock.unix_timestamp,
    });

    // Taker receives maker's token (in maker_pool)
    require!(maker_pool.can_insert(), CloakCraftError::TreeFull);
    let taker_leaf_index = maker_pool.next_leaf_index;
    let taker_new_root = insert_leaf(
        &mut maker_pool.frontier,
        taker_leaf_index,
        taker_out_commitment,
    )?;
    maker_pool.update_root(taker_new_root);
    maker_pool.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: maker_pool.key(),
        commitment: taker_out_commitment,
        leaf_index: taker_leaf_index,
        encrypted_note: encrypted_notes.get(1).cloned().unwrap_or_default(),
        timestamp: clock.unix_timestamp,
    });

    // 5. Mark order as filled
    order.status = OrderStatus::Filled;

    emit!(OrderFilled {
        order_id,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

fn build_fill_order_inputs(
    maker_merkle_root: &[u8; 32],
    taker_merkle_root: &[u8; 32],
    escrow_nullifier: &[u8; 32],
    taker_nullifier: &[u8; 32],
    order_id: &[u8; 32],
    maker_out_commitment: &[u8; 32],
    taker_out_commitment: &[u8; 32],
) -> Vec<[u8; 32]> {
    vec![
        *maker_merkle_root,
        *taker_merkle_root,
        *escrow_nullifier,
        *taker_nullifier,
        *order_id,
        *maker_out_commitment,
        *taker_out_commitment,
    ]
}
