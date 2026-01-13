//! Disable an adapter module

use anchor_lang::prelude::*;

use crate::state::AdaptModule;
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct DisableAdaptModule<'info> {
    /// Adapter module
    #[account(
        mut,
        seeds = [seeds::ADAPT_MODULE, adapt_module.program_id.as_ref()],
        bump = adapt_module.bump,
        has_one = authority @ CloakCraftError::Unauthorized,
    )]
    pub adapt_module: Account<'info, AdaptModule>,

    /// Authority
    pub authority: Signer<'info>,
}

pub fn disable_adapt_module(ctx: Context<DisableAdaptModule>) -> Result<()> {
    ctx.accounts.adapt_module.enabled = false;
    Ok(())
}
