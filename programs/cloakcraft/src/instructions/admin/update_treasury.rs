//! Update protocol treasury
//!
//! Allows the authority to update the treasury address that receives fees.

use anchor_lang::prelude::*;

use crate::state::ProtocolConfig;
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct UpdateTreasury<'info> {
    /// Protocol config account
    #[account(
        mut,
        seeds = [seeds::PROTOCOL_CONFIG],
        bump = protocol_config.bump,
        has_one = authority @ CloakCraftError::Unauthorized
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// New treasury account
    /// CHECK: Can be any account that can receive tokens
    pub new_treasury: UncheckedAccount<'info>,

    /// Authority that can update treasury
    pub authority: Signer<'info>,
}

/// Update the treasury address
///
/// # Arguments
/// * `ctx` - The context containing the accounts
pub fn update_treasury(ctx: Context<UpdateTreasury>) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    let old_treasury = config.treasury;
    config.treasury = ctx.accounts.new_treasury.key();

    msg!(
        "Treasury updated from {} to {}",
        old_treasury,
        config.treasury
    );

    Ok(())
}
