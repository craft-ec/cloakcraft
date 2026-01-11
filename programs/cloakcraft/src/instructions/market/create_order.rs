//! Create a limit order in the private market

use anchor_lang::prelude::*;

use crate::state::{Pool, Order, OrderStatus, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteSpent, NoteCreated, OrderCreated, MerkleRootUpdated};
use crate::merkle::insert_leaf;
use crate::crypto::verify_proof;

#[derive(Accounts)]
#[instruction(
    proof: Vec<u8>,
    nullifier: [u8; 32],
    order_id: [u8; 32],
)]
pub struct CreateOrder<'info> {
    /// Pool for the offer token (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Order account
    #[account(
        init,
        payer = payer,
        space = Order::space(184), // encrypted note size
        seeds = [seeds::ORDER, order_id.as_ref()],
        bump
    )]
    pub order: Account<'info, Order>,

    /// Verification key (boxed to reduce stack usage)
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn create_order(
    ctx: Context<CreateOrder>,
    proof: Vec<u8>,
    nullifier: [u8; 32],
    order_id: [u8; 32],
    escrow_commitment: [u8; 32],
    terms_hash: [u8; 32],
    expiry: i64,
    encrypted_escrow: Vec<u8>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let order = &mut ctx.accounts.order;
    let clock = Clock::get()?;

    // 1. Verify ZK proof
    let public_inputs = build_create_order_inputs(
        &pool.merkle_root,
        &nullifier,
        &order_id,
        &escrow_commitment,
        &terms_hash,
        expiry,
    );

    verify_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
    )?;

    // 2. Spend input note
    emit!(NoteSpent {
        pool: pool.key(),
        nullifier,
        timestamp: clock.unix_timestamp,
    });

    // 3. Create escrow commitment in merkle tree
    require!(pool.can_insert(), CloakCraftError::TreeFull);

    let leaf_index = pool.next_leaf_index;
    let new_root = insert_leaf(
        &mut pool.frontier,
        leaf_index,
        escrow_commitment,
    )?;

    pool.update_root(new_root);
    pool.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: pool.key(),
        commitment: escrow_commitment,
        leaf_index,
        encrypted_note: encrypted_escrow.clone(),
        timestamp: clock.unix_timestamp,
    });

    // 4. Initialize order account
    order.order_id = order_id;
    order.escrow_commitment = escrow_commitment;
    order.terms_hash = terms_hash;
    order.encrypted_escrow = encrypted_escrow;
    order.expiry = expiry;
    order.status = OrderStatus::Open;
    order.created_at = clock.unix_timestamp;
    order.bump = ctx.bumps.order;

    emit!(OrderCreated {
        order_id,
        escrow_commitment,
        terms_hash,
        expiry,
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

fn build_create_order_inputs(
    merkle_root: &[u8; 32],
    nullifier: &[u8; 32],
    order_id: &[u8; 32],
    escrow_commitment: &[u8; 32],
    terms_hash: &[u8; 32],
    expiry: i64,
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    inputs.push(*merkle_root);
    inputs.push(*nullifier);
    inputs.push(*order_id);
    inputs.push(*escrow_commitment);
    inputs.push(*terms_hash);
    let mut expiry_bytes = [0u8; 32];
    expiry_bytes[..8].copy_from_slice(&expiry.to_le_bytes());
    inputs.push(expiry_bytes);
    inputs
}
