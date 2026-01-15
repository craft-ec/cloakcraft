//! Create a limit order in the private market
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
pub struct LightOrderParams {
    /// Validity proof for nullifier
    pub nullifier_proof: LightValidityProof,
    /// Address tree info for nullifier
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for commitment
    pub commitment_proof: LightValidityProof,
    /// Address tree info for commitment
    pub commitment_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

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

    /// Commitment counter for this pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, pool.key().as_ref()],
        bump = commitment_counter.bump,
    )]
    pub commitment_counter: Account<'info, PoolCommitmentCounter>,

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

    /// Payer (pays for compressed account creation)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,

    // Light Protocol accounts are passed via remaining_accounts
}

pub fn create_order<'info>(
    ctx: Context<'_, '_, '_, 'info, CreateOrder<'info>>,
    proof: Vec<u8>,
    nullifier: [u8; 32],
    order_id: [u8; 32],
    escrow_commitment: [u8; 32],
    terms_hash: [u8; 32],
    expiry: i64,
    encrypted_escrow: Vec<u8>,
    light_params: Option<LightOrderParams>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let commitment_counter = &mut ctx.accounts.commitment_counter;
    let order = &mut ctx.accounts.order;
    let clock = Clock::get()?;

    // 1. Verify ZK proof
    // Merkle root is now verified by Light Protocol validity proof
    let public_inputs = build_create_order_inputs(
        &nullifier,
        &order_id,
        &escrow_commitment,
        &terms_hash,
        expiry,
    );

    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "CreateOrder",
    )?;

    // 2. Create nullifier compressed account via Light Protocol
    if let Some(ref params) = light_params {
        create_spend_nullifier_account(
            &ctx.accounts.payer.to_account_info(),
            ctx.remaining_accounts,
            params.nullifier_proof.clone(),
            params.nullifier_address_tree_info.clone(),
            params.output_tree_index,
            pool.key(),
            nullifier,
        )?;
    }
    // 3. Create escrow commitment via Light Protocol
    // Encrypted note is stored inline for direct scanning
    let leaf_index = commitment_counter.next_leaf_index;
    commitment_counter.next_leaf_index += 1;
    commitment_counter.total_commitments += 1;

    if let Some(ref params) = light_params {
        let (escrow_arr, escrow_len) = vec_to_fixed_note(&encrypted_escrow);
        create_commitment_account(
            &ctx.accounts.payer.to_account_info(),
            ctx.remaining_accounts,
            params.commitment_proof.clone(),
            params.commitment_address_tree_info.clone(),
            params.output_tree_index,
            pool.key(),
            escrow_commitment,
            leaf_index,
            [0u8; 64],
            escrow_arr,
            escrow_len,
        )?;
    }

    // 4. Initialize order account
    order.order_id = order_id;
    order.escrow_commitment = escrow_commitment;
    order.terms_hash = terms_hash;
    order.encrypted_escrow = encrypted_escrow;
    order.expiry = expiry;
    order.status = OrderStatus::Open;
    order.created_at = clock.unix_timestamp;
    order.bump = ctx.bumps.order;
    Ok(())
}

fn build_create_order_inputs(
    nullifier: &[u8; 32],
    order_id: &[u8; 32],
    escrow_commitment: &[u8; 32],
    terms_hash: &[u8; 32],
    expiry: i64,
) -> Vec<[u8; 32]> {
    // Note: merkle_root is no longer a public input - verified by Light Protocol
    let mut inputs = Vec::new();
    inputs.push(*nullifier);
    inputs.push(*order_id);
    inputs.push(*escrow_commitment);
    inputs.push(*terms_hash);
    let mut expiry_bytes = [0u8; 32];
    expiry_bytes[..8].copy_from_slice(&expiry.to_le_bytes());
    inputs.push(expiry_bytes);
    inputs
}
