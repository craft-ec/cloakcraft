//! Cancel an order and return escrowed funds

use anchor_lang::prelude::*;

use crate::state::{Pool, Order, OrderStatus, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteSpent, NoteCreated, OrderCancelled, MerkleRootUpdated};
use crate::merkle::insert_leaf;
use crate::crypto::verify_proof;

#[derive(Accounts)]
#[instruction(
    proof: Vec<u8>,
    escrow_nullifier: [u8; 32],
    order_id: [u8; 32],
)]
pub struct CancelOrder<'info> {
    /// Pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Order being cancelled
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

    /// Relayer/maker
    pub relayer: Signer<'info>,
}

pub fn cancel_order(
    ctx: Context<CancelOrder>,
    proof: Vec<u8>,
    escrow_nullifier: [u8; 32],
    order_id: [u8; 32],
    refund_commitment: [u8; 32],
    encrypted_note: Vec<u8>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let order = &mut ctx.accounts.order;
    let clock = Clock::get()?;

    // 1. Verify ZK proof (proves ownership of escrow)
    let public_inputs = build_cancel_order_inputs(
        &pool.merkle_root,
        &escrow_nullifier,
        &order_id,
        &refund_commitment,
        clock.unix_timestamp,
    );

    verify_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
    )?;

    // 2. Spend escrow
    emit!(NoteSpent {
        pool: pool.key(),
        nullifier: escrow_nullifier,
        timestamp: clock.unix_timestamp,
    });

    // 3. Create refund commitment
    require!(pool.can_insert(), CloakCraftError::TreeFull);

    let leaf_index = pool.next_leaf_index;
    let new_root = insert_leaf(
        &mut pool.frontier,
        leaf_index,
        refund_commitment,
    )?;

    pool.update_root(new_root);
    pool.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: pool.key(),
        commitment: refund_commitment,
        leaf_index,
        encrypted_note,
        timestamp: clock.unix_timestamp,
    });

    // 4. Mark order as cancelled
    order.status = OrderStatus::Cancelled;

    emit!(OrderCancelled {
        order_id,
        timestamp: clock.unix_timestamp,
    });

    emit!(MerkleRootUpdated {
        pool: pool.key(),
        new_root,
        next_leaf_index: pool.next_leaf_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

fn build_cancel_order_inputs(
    merkle_root: &[u8; 32],
    escrow_nullifier: &[u8; 32],
    order_id: &[u8; 32],
    refund_commitment: &[u8; 32],
    current_timestamp: i64,
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    inputs.push(*merkle_root);
    inputs.push(*escrow_nullifier);
    inputs.push(*order_id);
    inputs.push(*refund_commitment);
    let mut ts_bytes = [0u8; 32];
    ts_bytes[..8].copy_from_slice(&current_timestamp.to_le_bytes());
    inputs.push(ts_bytes);
    inputs
}
