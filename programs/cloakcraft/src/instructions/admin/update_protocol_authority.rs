//! Update protocol authority
//!
//! Allows the current authority to transfer control to a new authority.

use anchor_lang::prelude::*;

use crate::state::ProtocolConfig;
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct UpdateProtocolAuthority<'info> {
    /// Protocol config account
    #[account(
        mut,
        seeds = [seeds::PROTOCOL_CONFIG],
        bump = protocol_config.bump,
        has_one = authority @ CloakCraftError::Unauthorized
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// New authority
    /// CHECK: Can be any valid pubkey
    pub new_authority: UncheckedAccount<'info>,

    /// Current authority
    pub authority: Signer<'info>,
}

/// Transfer authority to a new account
///
/// # Arguments
/// * `ctx` - The context containing the accounts
pub fn update_protocol_authority(ctx: Context<UpdateProtocolAuthority>) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;
    let old_authority = config.authority;
    config.authority = ctx.accounts.new_authority.key();

    msg!(
        "Authority transferred from {} to {}",
        old_authority,
        config.authority
    );

    Ok(())
}
