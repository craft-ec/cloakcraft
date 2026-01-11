//! Shield tokens - deposit public tokens into the shielded pool
//!
//! Uses Light Protocol compressed accounts for commitment storage.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{Pool, PoolCommitmentCounter, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{Shielded, NoteCreated};
use crate::light_cpi::create_commitment_account;
use crate::merkle::hash_pair;

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
    encrypted_note: Vec<u8>,
    light_params: Option<LightCommitmentParams>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let commitment_counter = &mut ctx.accounts.commitment_counter;
    let clock = Clock::get()?;

    // Transfer tokens to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.token_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Get leaf index and increment counter
    let leaf_index = commitment_counter.next_leaf_index;
    commitment_counter.next_leaf_index += 1;
    commitment_counter.total_commitments += 1;

    // Create commitment compressed account via Light Protocol
    if let Some(params) = light_params {
        // Hash the encrypted note for storage reference
        let encrypted_note_hash = hash_pair(
            &commitment,
            &if encrypted_note.len() >= 32 {
                let mut arr = [0u8; 32];
                arr.copy_from_slice(&encrypted_note[..32]);
                arr
            } else {
                let mut arr = [0u8; 32];
                arr[..encrypted_note.len()].copy_from_slice(&encrypted_note);
                arr
            },
        );

        create_commitment_account(
            &ctx.accounts.user.to_account_info(),
            ctx.remaining_accounts,
            params.validity_proof,
            params.address_tree_info,
            params.output_tree_index,
            pool.key(),
            commitment,
            leaf_index,
            encrypted_note_hash,
        )?;
    }
    // Note: If light_params is None, we're in legacy mode (event-only)
    // This allows backwards compatibility during migration

    // Update pool totals (merkle tree is now in Light Protocol)
    pool.total_shielded = pool.total_shielded.checked_add(amount)
        .ok_or(CloakCraftError::AmountOverflow)?;

    // Emit events
    emit!(Shielded {
        pool: pool.key(),
        amount,
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
    });

    emit!(NoteCreated {
        pool: pool.key(),
        commitment,
        leaf_index: leaf_index as u32,
        encrypted_note,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
