//! Initialize protocol configuration
//!
//! Creates the global ProtocolConfig account with initial fee rates and treasury.

use anchor_lang::prelude::*;

use crate::state::ProtocolConfig;
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct InitializeProtocolConfig<'info> {
    /// Protocol config account (singleton PDA)
    #[account(
        init,
        payer = payer,
        space = 8 + ProtocolConfig::LEN,
        seeds = [seeds::PROTOCOL_CONFIG],
        bump
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// Treasury account that will receive fees
    /// CHECK: Can be any account that can receive tokens
    pub treasury: UncheckedAccount<'info>,

    /// Authority that can update config (typically a multisig or governance)
    pub authority: Signer<'info>,

    /// Payer for account creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Initialize protocol configuration with fee rates
///
/// # Arguments
/// * `transfer_fee_bps` - Transfer fee in basis points (max 1000 = 10%)
/// * `unshield_fee_bps` - Unshield fee in basis points (max 1000 = 10%)
/// * `swap_fee_share_bps` - Protocol's share of LP fees in basis points (e.g., 2000 = 20%)
/// * `remove_liquidity_fee_bps` - Remove liquidity fee in basis points (max 1000 = 10%)
/// * `fees_enabled` - Whether fees are initially enabled
pub fn initialize_protocol_config(
    ctx: Context<InitializeProtocolConfig>,
    transfer_fee_bps: u16,
    unshield_fee_bps: u16,
    swap_fee_share_bps: u16,
    remove_liquidity_fee_bps: u16,
    fees_enabled: bool,
) -> Result<()> {
    // Validate fee rates
    require!(
        transfer_fee_bps <= ProtocolConfig::MAX_FEE_BPS,
        CloakCraftError::InvalidAmount
    );
    require!(
        unshield_fee_bps <= ProtocolConfig::MAX_FEE_BPS,
        CloakCraftError::InvalidAmount
    );
    // swap_fee_share_bps can be up to 5000 (50% of LP fees)
    require!(
        swap_fee_share_bps <= 5000,
        CloakCraftError::InvalidAmount
    );
    require!(
        remove_liquidity_fee_bps <= ProtocolConfig::MAX_FEE_BPS,
        CloakCraftError::InvalidAmount
    );

    let config = &mut ctx.accounts.protocol_config;
    config.authority = ctx.accounts.authority.key();
    config.treasury = ctx.accounts.treasury.key();
    config.transfer_fee_bps = transfer_fee_bps;
    config.unshield_fee_bps = unshield_fee_bps;
    config.swap_fee_share_bps = swap_fee_share_bps;
    config.remove_liquidity_fee_bps = remove_liquidity_fee_bps;
    config.fees_enabled = fees_enabled;
    config.bump = ctx.bumps.protocol_config;
    config._reserved = [0u8; 62];

    msg!(
        "Protocol config initialized: transfer={}bps, unshield={}bps, swap_share={}bps, remove_liq={}bps, enabled={}",
        transfer_fee_bps,
        unshield_fee_bps,
        swap_fee_share_bps,
        remove_liquidity_fee_bps,
        fees_enabled
    );

    Ok(())
}
