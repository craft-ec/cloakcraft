//! Token vault transfer helpers
//!
//! Provides unified functions for transferring tokens to/from pool vaults
//! and updating pool balance tracking.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::Pool;
use crate::errors::CloakCraftError;

/// Transfer tokens from user to vault (shield operation)
///
/// This moves tokens into the shielded pool, increasing the pool's total_shielded balance.
///
/// # Arguments
/// * `token_program` - SPL Token program
/// * `from` - User's token account (source)
/// * `to` - Pool vault token account (destination)
/// * `authority` - User (signer)
/// * `amount` - Amount to transfer
pub fn transfer_to_vault<'info>(
    token_program: &Program<'info, Token>,
    from: &Account<'info, TokenAccount>,
    to: &Account<'info, TokenAccount>,
    authority: &Signer<'info>,
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: from.to_account_info(),
        to: to.to_account_info(),
        authority: authority.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    msg!("Transferred {} tokens to vault", amount);
    Ok(())
}

/// Transfer tokens from vault to recipient (unshield operation)
///
/// This moves tokens out of the shielded pool, decreasing the pool's total_shielded balance.
/// Uses PDA signer since the vault is owned by the pool PDA.
///
/// # Arguments
/// * `token_program` - SPL Token program
/// * `vault` - Pool vault token account (source)
/// * `recipient` - User's token account (destination)
/// * `pool_authority` - Pool PDA account info
/// * `pool_seeds` - Seeds for pool PDA signer
/// * `amount` - Amount to transfer
pub fn transfer_from_vault<'info>(
    token_program: &Program<'info, Token>,
    vault: &Account<'info, TokenAccount>,
    recipient: &Account<'info, TokenAccount>,
    pool_authority: &AccountInfo<'info>,
    pool_seeds: &[&[&[u8]]],
    amount: u64,
) -> Result<()> {
    let cpi_accounts = Transfer {
        from: vault.to_account_info(),
        to: recipient.to_account_info(),
        authority: pool_authority.clone(),
    };
    let cpi_ctx = CpiContext::new_with_signer(
        token_program.to_account_info(),
        cpi_accounts,
        pool_seeds,
    );
    token::transfer(cpi_ctx, amount)?;

    msg!("Transferred {} tokens from vault", amount);
    Ok(())
}

/// Update pool total_shielded balance
///
/// Tracks the total amount of tokens in the pool for accounting purposes.
///
/// # Arguments
/// * `pool` - Pool account to update
/// * `amount` - Amount to add or subtract
/// * `is_shield` - true = add (shield), false = subtract (unshield)
///
/// # Errors
/// * `AmountOverflow` - Addition overflow
/// * `InsufficientBalance` - Subtraction underflow
pub fn update_pool_balance(
    pool: &mut Pool,
    amount: u64,
    is_shield: bool,
) -> Result<()> {
    if is_shield {
        pool.total_shielded = pool.total_shielded
            .checked_add(amount)
            .ok_or(CloakCraftError::AmountOverflow)?;
        msg!("Pool total_shielded increased to {}", pool.total_shielded);
    } else {
        pool.total_shielded = pool.total_shielded
            .checked_sub(amount)
            .ok_or(CloakCraftError::InsufficientBalance)?;
        msg!("Pool total_shielded decreased to {}", pool.total_shielded);
    }

    Ok(())
}
