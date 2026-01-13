//! Register an adapter module

use anchor_lang::prelude::*;

use crate::state::AdaptModule;
use crate::constants::seeds;

#[derive(Accounts)]
pub struct RegisterAdaptModule<'info> {
    /// Adapter module account
    #[account(
        init,
        payer = payer,
        space = AdaptModule::LEN,
        seeds = [seeds::ADAPT_MODULE, adapter_program.key().as_ref()],
        bump
    )]
    pub adapt_module: Account<'info, AdaptModule>,

    /// Adapter program
    /// CHECK: This is the adapter program being registered
    pub adapter_program: AccountInfo<'info>,

    /// Authority
    pub authority: Signer<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn register_adapt_module(
    ctx: Context<RegisterAdaptModule>,
    interface_version: u8,
) -> Result<()> {
    let adapt_module = &mut ctx.accounts.adapt_module;
    let clock = Clock::get()?;

    adapt_module.program_id = ctx.accounts.adapter_program.key();
    adapt_module.interface_version = interface_version;
    adapt_module.enabled = true;
    adapt_module.authority = ctx.accounts.authority.key();
    adapt_module.registered_at = clock.unix_timestamp;
    adapt_module.bump = ctx.bumps.adapt_module;
    Ok(())
}
