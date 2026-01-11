//! Store a commitment as a Light Protocol compressed account
//!
//! Called after transact to persist output commitments on-chain.
//! Each commitment requires its own validity proof and transaction.
//!
//! Note: Light Protocol validity proofs with multiple addresses are designed
//! for cross-program operations (e.g., Program A + Program B sharing one proof),
//! NOT for batching multiple creations in a single CPI call.

use anchor_lang::prelude::*;

use crate::state::{Pool, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::light_cpi::create_commitment_account;
use crate::merkle::hash_pair;

#[derive(Accounts)]
pub struct StoreCommitment<'info> {
    /// Pool
    #[account(
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Account<'info, Pool>,

    /// Relayer/submitter (pays for compressed account creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    // Light Protocol accounts are passed via remaining_accounts
}

/// Parameters for storing a single commitment
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StoreCommitmentParams {
    /// The commitment hash
    pub commitment: [u8; 32],
    /// Leaf index (read from commitment counter before transact)
    pub leaf_index: u64,
    /// Encrypted note data (or hash)
    pub encrypted_note: Vec<u8>,
    /// Validity proof for the commitment address (non-inclusion)
    pub validity_proof: LightValidityProof,
    /// Address tree info
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

pub fn store_commitment<'info>(
    ctx: Context<'_, '_, '_, 'info, StoreCommitment<'info>>,
    params: StoreCommitmentParams,
) -> Result<()> {
    let pool = &ctx.accounts.pool;

    // Compute encrypted note hash
    let encrypted_note_hash = if params.encrypted_note.len() >= 32 {
        let mut arr = [0u8; 32];
        arr.copy_from_slice(&params.encrypted_note[..32]);
        hash_pair(&params.commitment, &arr)
    } else {
        let mut arr = [0u8; 32];
        arr[..params.encrypted_note.len()].copy_from_slice(&params.encrypted_note);
        hash_pair(&params.commitment, &arr)
    };

    // Create commitment compressed account
    create_commitment_account(
        &ctx.accounts.relayer.to_account_info(),
        ctx.remaining_accounts,
        params.validity_proof,
        params.address_tree_info,
        params.output_tree_index,
        pool.key(),
        params.commitment,
        params.leaf_index,
        encrypted_note_hash,
    )?;

    msg!("Commitment stored: leaf_index={}", params.leaf_index);

    Ok(())
}
