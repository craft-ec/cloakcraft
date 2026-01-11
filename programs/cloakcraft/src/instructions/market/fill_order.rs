//! Fill an order atomically
//!
//! Uses Light Protocol for nullifier and commitment storage.

use anchor_lang::prelude::*;

use crate::state::{Pool, Order, OrderStatus, VerificationKey, PoolCommitmentCounter, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteSpent, NoteCreated, OrderFilled};
use crate::crypto::verify_proof;
use crate::light_cpi::{create_nullifier_account, create_commitment_account};
use crate::merkle::hash_pair;

/// Parameters for Light Protocol operations in fill order
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightFillOrderParams {
    /// Validity proof for escrow nullifier
    pub escrow_nullifier_proof: LightValidityProof,
    /// Address tree info for escrow nullifier
    pub escrow_nullifier_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for taker nullifier
    pub taker_nullifier_proof: LightValidityProof,
    /// Address tree info for taker nullifier
    pub taker_nullifier_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for maker output commitment
    pub maker_commitment_proof: LightValidityProof,
    /// Address tree info for maker output commitment
    pub maker_commitment_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for taker output commitment
    pub taker_commitment_proof: LightValidityProof,
    /// Address tree info for taker output commitment
    pub taker_commitment_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

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

    /// Commitment counter for maker pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, maker_pool.key().as_ref()],
        bump = maker_commitment_counter.bump,
    )]
    pub maker_commitment_counter: Account<'info, PoolCommitmentCounter>,

    /// Taker's payment token pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, taker_pool.token_mint.as_ref()],
        bump = taker_pool.bump,
    )]
    pub taker_pool: Box<Account<'info, Pool>>,

    /// Commitment counter for taker pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, taker_pool.key().as_ref()],
        bump = taker_commitment_counter.bump,
    )]
    pub taker_commitment_counter: Account<'info, PoolCommitmentCounter>,

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

    /// Relayer (pays for compressed account creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    // Light Protocol accounts are passed via remaining_accounts
}

pub fn fill_order<'info>(
    ctx: Context<'_, '_, '_, 'info, FillOrder<'info>>,
    maker_proof: Vec<u8>,
    taker_proof: Vec<u8>,
    escrow_nullifier: [u8; 32],
    taker_nullifier: [u8; 32],
    order_id: [u8; 32],
    maker_out_commitment: [u8; 32],
    taker_out_commitment: [u8; 32],
    encrypted_notes: Vec<Vec<u8>>,
    light_params: Option<LightFillOrderParams>,
) -> Result<()> {
    let maker_pool = &mut ctx.accounts.maker_pool;
    let taker_pool = &mut ctx.accounts.taker_pool;
    let maker_commitment_counter = &mut ctx.accounts.maker_commitment_counter;
    let taker_commitment_counter = &mut ctx.accounts.taker_commitment_counter;
    let order = &mut ctx.accounts.order;
    let clock = Clock::get()?;

    // 1. Verify order not expired
    require!(
        !order.is_expired(clock.unix_timestamp),
        CloakCraftError::OrderExpired
    );

    // 2. Verify combined proof (maker escrow + taker input)
    // Merkle roots are now verified by Light Protocol validity proofs
    let public_inputs = build_fill_order_inputs(
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

    // 3. Create nullifier compressed accounts via Light Protocol
    if let Some(ref params) = light_params {
        // Escrow nullifier
        create_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.escrow_nullifier_proof.clone(),
            params.escrow_nullifier_address_tree_info.clone(),
            params.output_tree_index,
            maker_pool.key(),
            escrow_nullifier,
        )?;

        // Taker nullifier
        create_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.taker_nullifier_proof.clone(),
            params.taker_nullifier_address_tree_info.clone(),
            params.output_tree_index,
            taker_pool.key(),
            taker_nullifier,
        )?;
    }

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

    // 4. Create output commitments via Light Protocol
    // Maker receives taker's token (in taker_pool)
    let maker_leaf_index = taker_commitment_counter.next_leaf_index;
    taker_commitment_counter.next_leaf_index += 1;
    taker_commitment_counter.total_commitments += 1;

    let maker_encrypted_note = encrypted_notes.get(0).cloned().unwrap_or_default();
    if let Some(ref params) = light_params {
        let encrypted_note_hash = hash_pair(
            &maker_out_commitment,
            &if maker_encrypted_note.len() >= 32 {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(&maker_encrypted_note[..32]);
                arr
            } else {
                let mut arr = [0u8; 32];
                arr[..maker_encrypted_note.len()].copy_from_slice(&maker_encrypted_note);
                arr
            },
        );

        create_commitment_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.maker_commitment_proof.clone(),
            params.maker_commitment_address_tree_info.clone(),
            params.output_tree_index,
            taker_pool.key(),
            maker_out_commitment,
            maker_leaf_index,
            encrypted_note_hash,
        )?;
    }

    emit!(NoteCreated {
        pool: taker_pool.key(),
        commitment: maker_out_commitment,
        leaf_index: maker_leaf_index as u32,
        encrypted_note: maker_encrypted_note,
        timestamp: clock.unix_timestamp,
    });

    // Taker receives maker's token (in maker_pool)
    let taker_leaf_index = maker_commitment_counter.next_leaf_index;
    maker_commitment_counter.next_leaf_index += 1;
    maker_commitment_counter.total_commitments += 1;

    let taker_encrypted_note = encrypted_notes.get(1).cloned().unwrap_or_default();
    if let Some(ref params) = light_params {
        let encrypted_note_hash = hash_pair(
            &taker_out_commitment,
            &if taker_encrypted_note.len() >= 32 {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(&taker_encrypted_note[..32]);
                arr
            } else {
                let mut arr = [0u8; 32];
                arr[..taker_encrypted_note.len()].copy_from_slice(&taker_encrypted_note);
                arr
            },
        );

        create_commitment_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.taker_commitment_proof.clone(),
            params.taker_commitment_address_tree_info.clone(),
            params.output_tree_index,
            maker_pool.key(),
            taker_out_commitment,
            taker_leaf_index,
            encrypted_note_hash,
        )?;
    }

    emit!(NoteCreated {
        pool: maker_pool.key(),
        commitment: taker_out_commitment,
        leaf_index: taker_leaf_index as u32,
        encrypted_note: taker_encrypted_note,
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
    escrow_nullifier: &[u8; 32],
    taker_nullifier: &[u8; 32],
    order_id: &[u8; 32],
    maker_out_commitment: &[u8; 32],
    taker_out_commitment: &[u8; 32],
) -> Vec<[u8; 32]> {
    // Note: merkle_roots are no longer public inputs - verified by Light Protocol
    vec![
        *escrow_nullifier,
        *taker_nullifier,
        *order_id,
        *maker_out_commitment,
        *taker_out_commitment,
    ]
}
