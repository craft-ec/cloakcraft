//! Update perpetual futures pool configuration
//!
//! Allows admin to update pool parameters such as fees, leverage limits, etc.

use anchor_lang::prelude::*;

use crate::state::PerpsPool;
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct UpdatePoolConfig<'info> {
    /// Perps pool account (boxed due to large size)
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
        has_one = authority @ CloakCraftError::Unauthorized
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Pool authority
    pub authority: Signer<'info>,
}

/// Parameters that can be updated
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdatePoolConfigParams {
    /// Maximum leverage (1-100), None to keep current
    pub max_leverage: Option<u8>,
    /// Position fee in basis points, None to keep current
    pub position_fee_bps: Option<u16>,
    /// Maximum utilization per token in basis points, None to keep current
    pub max_utilization_bps: Option<u16>,
    /// Liquidation threshold in basis points, None to keep current
    pub liquidation_threshold_bps: Option<u16>,
    /// Liquidation penalty in basis points, None to keep current
    pub liquidation_penalty_bps: Option<u16>,
    /// Base borrow rate per hour in basis points, None to keep current
    pub base_borrow_rate_bps: Option<u16>,
    /// Maximum imbalance fee in basis points, None to keep current
    pub max_imbalance_fee_bps: Option<u16>,
    /// Pool active status, None to keep current
    pub is_active: Option<bool>,
}

pub fn update_pool_config(
    ctx: Context<UpdatePoolConfig>,
    params: UpdatePoolConfigParams,
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;

    if let Some(max_leverage) = params.max_leverage {
        require!(
            max_leverage >= 1 && max_leverage <= 100,
            CloakCraftError::InvalidLeverage
        );
        perps_pool.max_leverage = max_leverage;
        msg!("Updated max_leverage: {}", max_leverage);
    }

    if let Some(position_fee_bps) = params.position_fee_bps {
        perps_pool.position_fee_bps = position_fee_bps;
        msg!("Updated position_fee_bps: {}", position_fee_bps);
    }

    if let Some(max_utilization_bps) = params.max_utilization_bps {
        require!(
            max_utilization_bps <= 10000,
            CloakCraftError::UtilizationLimitExceeded
        );
        perps_pool.max_utilization_bps = max_utilization_bps;
        msg!("Updated max_utilization_bps: {}", max_utilization_bps);
    }

    if let Some(liquidation_threshold_bps) = params.liquidation_threshold_bps {
        perps_pool.liquidation_threshold_bps = liquidation_threshold_bps;
        msg!("Updated liquidation_threshold_bps: {}", liquidation_threshold_bps);
    }

    if let Some(liquidation_penalty_bps) = params.liquidation_penalty_bps {
        perps_pool.liquidation_penalty_bps = liquidation_penalty_bps;
        msg!("Updated liquidation_penalty_bps: {}", liquidation_penalty_bps);
    }

    if let Some(base_borrow_rate_bps) = params.base_borrow_rate_bps {
        perps_pool.base_borrow_rate_bps = base_borrow_rate_bps;
        msg!("Updated base_borrow_rate_bps: {}", base_borrow_rate_bps);
    }

    if let Some(max_imbalance_fee_bps) = params.max_imbalance_fee_bps {
        perps_pool.max_imbalance_fee_bps = max_imbalance_fee_bps;
        msg!("Updated max_imbalance_fee_bps: {}", max_imbalance_fee_bps);
    }

    if let Some(is_active) = params.is_active {
        perps_pool.is_active = is_active;
        msg!("Updated is_active: {}", is_active);
    }

    Ok(())
}

/// Pause/unpause a specific token in the pool
#[derive(Accounts)]
pub struct UpdateTokenStatus<'info> {
    /// Perps pool account (boxed due to large size)
    #[account(
        mut,
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
        has_one = authority @ CloakCraftError::Unauthorized
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Pool authority
    pub authority: Signer<'info>,
}

pub fn update_token_status(
    ctx: Context<UpdateTokenStatus>,
    token_index: u8,
    is_active: bool,
) -> Result<()> {
    let perps_pool = &mut ctx.accounts.perps_pool;

    require!(
        token_index < perps_pool.num_tokens,
        CloakCraftError::InvalidTokenIndex
    );

    perps_pool.tokens[token_index as usize].is_active = is_active;

    msg!(
        "Token {} status updated: is_active={}",
        token_index,
        is_active
    );

    Ok(())
}

/// Pause/unpause a specific market
#[derive(Accounts)]
pub struct UpdateMarketStatus<'info> {
    /// Perps pool account (boxed due to large size)
    #[account(
        seeds = [seeds::PERPS_POOL, perps_pool.pool_id.as_ref()],
        bump = perps_pool.bump,
        has_one = authority @ CloakCraftError::Unauthorized
    )]
    pub perps_pool: Box<Account<'info, PerpsPool>>,

    /// Market account
    #[account(
        mut,
        seeds = [seeds::PERPS_MARKET, perps_pool.key().as_ref(), perps_market.market_id.as_ref()],
        bump = perps_market.bump,
        constraint = perps_market.pool == perps_pool.key() @ CloakCraftError::PerpsMarketNotFound
    )]
    pub perps_market: Account<'info, crate::state::PerpsMarket>,

    /// Pool authority
    pub authority: Signer<'info>,
}

pub fn update_market_status(ctx: Context<UpdateMarketStatus>, is_active: bool) -> Result<()> {
    let perps_market = &mut ctx.accounts.perps_market;

    perps_market.is_active = is_active;

    msg!(
        "Market {:?} status updated: is_active={}",
        perps_market.market_id,
        is_active
    );

    Ok(())
}
