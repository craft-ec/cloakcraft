//! Shield tokens - deposit public tokens into the shielded pool

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::Pool;
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{Shielded, NoteCreated, MerkleRootUpdated};
use crate::merkle::insert_leaf;

#[derive(Accounts)]
pub struct Shield<'info> {
    /// Pool to shield into (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

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

    /// User
    pub user: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn shield(
    ctx: Context<Shield>,
    commitment: [u8; 32],
    amount: u64,
    encrypted_note: Vec<u8>,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    // Verify pool can accept more leaves
    require!(pool.can_insert(), CloakCraftError::TreeFull);

    // Transfer tokens to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.token_vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Insert commitment into merkle tree
    let leaf_index = pool.next_leaf_index;
    let new_root = insert_leaf(
        &mut pool.frontier,
        leaf_index,
        commitment,
    )?;

    // Update pool state
    pool.update_root(new_root);
    pool.next_leaf_index += 1;
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
        leaf_index,
        encrypted_note,
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
