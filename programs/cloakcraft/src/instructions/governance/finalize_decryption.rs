//! Finalize decryption and reveal results

use anchor_lang::prelude::*;

use crate::state::{Aggregation, AggregationStatus};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::AggregationFinalized;

#[derive(Accounts)]
pub struct FinalizeDecryption<'info> {
    /// Aggregation
    #[account(
        mut,
        seeds = [seeds::AGGREGATION, aggregation.id.as_ref()],
        bump = aggregation.bump,
    )]
    pub aggregation: Account<'info, Aggregation>,

    /// Anyone can finalize once threshold is met
    pub finalizer: Signer<'info>,
}

pub fn finalize_decryption(
    ctx: Context<FinalizeDecryption>,
    totals: Vec<u64>,
) -> Result<()> {
    let aggregation = &mut ctx.accounts.aggregation;
    let clock = Clock::get()?;

    // 1. Verify threshold met
    require!(
        aggregation.threshold_met(),
        CloakCraftError::ThresholdNotMet
    );

    // 2. Verify totals count matches options
    require!(
        totals.len() == aggregation.num_options as usize,
        CloakCraftError::InvalidDecryptionShare
    );

    // 3. In production: verify totals match combined decryption shares
    // This would involve Lagrange interpolation of shares
    // For now, accept the provided totals

    // 4. Store results
    aggregation.totals = totals.clone();
    aggregation.status = AggregationStatus::Finalized;

    emit!(AggregationFinalized {
        id: aggregation.id,
        totals,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
