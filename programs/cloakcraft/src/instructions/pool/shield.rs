//! Shield tokens - deposit public tokens into the shielded pool
//!
//! Uses Light Protocol compressed accounts for commitment storage.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{Pool, PoolCommitmentCounter, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::vault::{transfer_to_vault, update_pool_balance};
use crate::light_cpi::{create_commitment_account, vec_to_fixed_note};

#[derive(Accounts)]
pub struct Shield<'info> {
    /// Pool to shield into (boxed to reduce stack usage)
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

    /// Token vault
    #[account(
        mut,
        seeds = [seeds::VAULT, pool.token_mint.as_ref()],
        bump = pool.vault_bump,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// User's token account (source)
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    /// User (pays for compressed account creation)
    #[account(mut)]
    pub user: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,

    // Light Protocol accounts are passed via remaining_accounts
}

/// Parameters for Light Protocol commitment creation
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightCommitmentParams {
    /// Validity proof from Helius indexer
    pub validity_proof: LightValidityProof,
    /// Address tree info for compressed account address derivation
    pub address_tree_info: LightAddressTreeInfo,
    /// Output state tree index for the new compressed account
    pub output_tree_index: u8,
}

pub fn shield<'info>(
    ctx: Context<'_, '_, '_, 'info, Shield<'info>>,
    commitment: [u8; 32],
    amount: u64,
    stealth_ephemeral_pubkey: [u8; 64],
    encrypted_note: Vec<u8>,
    light_params: Option<LightCommitmentParams>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let commitment_counter = &mut ctx.accounts.commitment_counter;
    let clock = Clock::get()?;

    // Transfer tokens to vault
    transfer_to_vault(
        &ctx.accounts.token_program,
        &ctx.accounts.user_token_account,
        &ctx.accounts.token_vault,
        &ctx.accounts.user,
        amount,
    )?;

    // Get leaf index and increment counter
    let leaf_index = commitment_counter.next_leaf_index;
    commitment_counter.next_leaf_index += 1;
    commitment_counter.total_commitments += 1;

    // Create commitment compressed account via Light Protocol
    // Encrypted note is stored inline for direct scanning via Light Protocol API
    // Stealth ephemeral pubkey is stored so recipient can derive stealthPrivateKey for decryption
    if let Some(params) = light_params {
        let (encrypted_note_arr, encrypted_note_len) = vec_to_fixed_note(&encrypted_note);
        create_commitment_account(
            &ctx.accounts.user.to_account_info(),
            ctx.remaining_accounts,
            params.validity_proof,
            params.address_tree_info,
            params.output_tree_index,
            pool.key(),
            commitment,
            leaf_index,
            stealth_ephemeral_pubkey,
            encrypted_note_arr,
            encrypted_note_len,
        )?;
    }

    // Update pool totals (merkle tree is now in Light Protocol)
    update_pool_balance(pool, amount, true)?;

    // Emit shielded event (for public tracking)
    Ok(())
}
