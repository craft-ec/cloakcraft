//! Create a voting aggregation

use anchor_lang::prelude::*;

use crate::state::{Pool, Aggregation, AggregationStatus, ElGamalCiphertext};
use crate::constants::seeds;
use crate::events::AggregationCreated;

#[derive(Accounts)]
#[instruction(id: [u8; 32])]
pub struct CreateAggregation<'info> {
    /// Aggregation account
    #[account(
        init,
        payer = payer,
        space = Aggregation::space(10, 10), // up to 10 options, 10 committee members
        seeds = [seeds::AGGREGATION, id.as_ref()],
        bump
    )]
    pub aggregation: Account<'info, Aggregation>,

    /// Token pool (for verifying voting power) (boxed to reduce stack usage)
    #[account(seeds = [seeds::POOL, token_pool.token_mint.as_ref()], bump = token_pool.bump)]
    pub token_pool: Box<Account<'info, Pool>>,

    /// Authority
    pub authority: Signer<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn create_aggregation(
    ctx: Context<CreateAggregation>,
    id: [u8; 32],
    threshold_pubkey: [u8; 32],
    threshold: u8,
    num_options: u8,
    deadline: i64,
    action_domain: [u8; 32],
) -> Result<()> {
    let aggregation = &mut ctx.accounts.aggregation;
    let clock = Clock::get()?;

    aggregation.id = id;
    aggregation.threshold_pubkey = threshold_pubkey;
    aggregation.token_mint = ctx.accounts.token_pool.token_mint;
    aggregation.num_options = num_options;
    aggregation.threshold = threshold;
    aggregation.deadline = deadline;
    aggregation.action_domain = action_domain;
    aggregation.status = AggregationStatus::Active;
    aggregation.created_at = clock.unix_timestamp;
    aggregation.bump = ctx.bumps.aggregation;

    // Initialize encrypted tallies to zero (identity ciphertexts)
    aggregation.encrypted_tallies = vec![
        ElGamalCiphertext { c1: [0u8; 32], c2: [0u8; 32] };
        num_options as usize
    ];

    aggregation.decryption_shares = Vec::new();
    aggregation.totals = Vec::new();

    emit!(AggregationCreated {
        id,
        token_mint: aggregation.token_mint,
        num_options,
        deadline,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
