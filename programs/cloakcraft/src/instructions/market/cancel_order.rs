//! Cancel an order and return escrowed funds
//!
//! Uses Light Protocol for nullifier and commitment storage.

use anchor_lang::prelude::*;

use crate::state::{Pool, Order, OrderStatus, VerificationKey, PoolCommitmentCounter, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::light_cpi::{create_spend_nullifier_account, create_commitment_account, vec_to_fixed_note};

/// Parameters for Light Protocol operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCancelOrderParams {
    /// Validity proof for nullifier
    pub nullifier_proof: LightValidityProof,
    /// Address tree info for nullifier
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for refund commitment
    pub commitment_proof: LightValidityProof,
    /// Address tree info for refund commitment
    pub commitment_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

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

    /// Commitment counter for this pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool.key().as_ref()],
        bump = commitment_counter.bump,
    )]
    pub commitment_counter: Account<'info, PoolCommitmentCounter>,

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

    /// Relayer/maker (pays for compressed account creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    // Light Protocol accounts are passed via remaining_accounts
}

pub fn cancel_order<'info>(
    ctx: Context<'_, '_, '_, 'info, CancelOrder<'info>>,
    proof: Vec<u8>,
    escrow_nullifier: [u8; 32],
    order_id: [u8; 32],
    refund_commitment: [u8; 32],
    encrypted_note: Vec<u8>,
    light_params: Option<LightCancelOrderParams>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let commitment_counter = &mut ctx.accounts.commitment_counter;
    let order = &mut ctx.accounts.order;
    let clock = Clock::get()?;

    // 1. Verify ZK proof (proves ownership of escrow)
    // Merkle root is now verified by Light Protocol validity proof
    let public_inputs = build_cancel_order_inputs(
        &escrow_nullifier,
        &order_id,
        &refund_commitment,
        clock.unix_timestamp,
    );

    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "CancelOrder",
    )?;

    // 2. Create nullifier compressed account via Light Protocol
    if let Some(ref params) = light_params {
        create_spend_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.nullifier_proof.clone(),
            params.nullifier_address_tree_info.clone(),
            params.output_tree_index,
            pool.key(),
            escrow_nullifier,
        )?;
    }
    // 3. Create refund commitment via Light Protocol
    // Encrypted note is stored inline for direct scanning
    let leaf_index = commitment_counter.next_leaf_index;
    commitment_counter.next_leaf_index += 1;
    commitment_counter.total_commitments += 1;

    if let Some(ref params) = light_params {
        let (note_arr, note_len) = vec_to_fixed_note(&encrypted_note);
        create_commitment_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.commitment_proof.clone(),
            params.commitment_address_tree_info.clone(),
            params.output_tree_index,
            pool.key(),
            refund_commitment,
            leaf_index,
            [0u8; 64],
            note_arr,
            note_len,
        )?;
    }

    // 4. Mark order as cancelled
    order.status = OrderStatus::Cancelled;
    Ok(())
}

fn build_cancel_order_inputs(
    escrow_nullifier: &[u8; 32],
    order_id: &[u8; 32],
    refund_commitment: &[u8; 32],
    current_timestamp: i64,
) -> Vec<[u8; 32]> {
    // Note: merkle_root is no longer a public input - verified by Light Protocol
    let mut inputs = Vec::new();
    inputs.push(*escrow_nullifier);
    inputs.push(*order_id);
    inputs.push(*refund_commitment);
    let mut ts_bytes = [0u8; 32];
    ts_bytes[..8].copy_from_slice(&current_timestamp.to_le_bytes());
    inputs.push(ts_bytes);
    inputs
}
