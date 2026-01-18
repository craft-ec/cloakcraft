//! Update protocol fee rates
//!
//! Allows the authority to update fee rates and toggle fee collection.

use anchor_lang::prelude::*;

use crate::state::ProtocolConfig;
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct UpdateProtocolFees<'info> {
    /// Protocol config account
    #[account(
        mut,
        seeds = [seeds::PROTOCOL_CONFIG],
        bump = protocol_config.bump,
        has_one = authority @ CloakCraftError::Unauthorized
    )]
    pub protocol_config: Account<'info, ProtocolConfig>,

    /// Authority that can update fees
    pub authority: Signer<'info>,
}

/// Update protocol fee rates
///
/// # Arguments
/// * `transfer_fee_bps` - New transfer fee in basis points (None to keep current)
/// * `unshield_fee_bps` - New unshield fee in basis points (None to keep current)
/// * `swap_fee_share_bps` - Protocol's share of LP fees (None to keep current, e.g., 2000 = 20%)
/// * `remove_liquidity_fee_bps` - New remove liquidity fee in basis points (None to keep current)
/// * `fees_enabled` - New fees enabled state (None to keep current)
pub fn update_protocol_fees(
    ctx: Context<UpdateProtocolFees>,
    transfer_fee_bps: Option<u16>,
    unshield_fee_bps: Option<u16>,
    swap_fee_share_bps: Option<u16>,
    remove_liquidity_fee_bps: Option<u16>,
    fees_enabled: Option<bool>,
) -> Result<()> {
    let config = &mut ctx.accounts.protocol_config;

    // Update transfer fee if provided
    if let Some(fee) = transfer_fee_bps {
        require!(
            fee <= ProtocolConfig::MAX_FEE_BPS,
            CloakCraftError::InvalidAmount
        );
        config.transfer_fee_bps = fee;
        msg!("Transfer fee updated to {} bps", fee);
    }

    // Update unshield fee if provided
    if let Some(fee) = unshield_fee_bps {
        require!(
            fee <= ProtocolConfig::MAX_FEE_BPS,
            CloakCraftError::InvalidAmount
        );
        config.unshield_fee_bps = fee;
        msg!("Unshield fee updated to {} bps", fee);
    }

    // Update swap fee share if provided (max 50% of LP fees)
    if let Some(fee) = swap_fee_share_bps {
        require!(
            fee <= 5000,
            CloakCraftError::InvalidAmount
        );
        config.swap_fee_share_bps = fee;
        msg!("Swap fee share updated to {} bps ({}% of LP fees)", fee, fee as f64 / 100.0);
    }

    // Update remove liquidity fee if provided
    if let Some(fee) = remove_liquidity_fee_bps {
        require!(
            fee <= ProtocolConfig::MAX_FEE_BPS,
            CloakCraftError::InvalidAmount
        );
        config.remove_liquidity_fee_bps = fee;
        msg!("Remove liquidity fee updated to {} bps", fee);
    }

    // Update fees enabled state if provided
    if let Some(enabled) = fees_enabled {
        config.fees_enabled = enabled;
        msg!("Fees enabled state updated to {}", enabled);
    }

    Ok(())
}
