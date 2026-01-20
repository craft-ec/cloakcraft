//! Finalize a voting ballot
//!
//! Called after the claim period expires (SpendToVote only).
//! Transfers unclaimed tokens from vault to protocol treasury.
//! This includes losers' stakes and unclaimed winner stakes.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{Ballot, BallotStatus, VoteBindingMode};

#[derive(Accounts)]
#[instruction(ballot_id: [u8; 32])]
pub struct FinalizeBallot<'info> {
    /// Ballot to finalize
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::SpendToVote @ CloakCraftError::InvalidBindingMode,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Ballot vault holding remaining tokens
    #[account(
        mut,
        seeds = [seeds::BALLOT_VAULT, ballot_id.as_ref()],
        bump,
        token::mint = ballot.token_mint,
        token::authority = ballot,
    )]
    pub ballot_vault: Account<'info, TokenAccount>,

    /// Protocol treasury to receive unclaimed tokens
    #[account(
        mut,
        constraint = protocol_treasury.key() == ballot.protocol_treasury @ CloakCraftError::InvalidTreasury,
    )]
    pub protocol_treasury: Account<'info, TokenAccount>,

    /// Authority (anyone can call finalize after deadline)
    pub authority: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn finalize_ballot(ctx: Context<FinalizeBallot>, ballot_id: [u8; 32]) -> Result<()> {
    let ballot = &mut ctx.accounts.ballot;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Verify ballot is resolved
    if ballot.status != BallotStatus::Resolved {
        return Err(CloakCraftError::BallotNotResolved.into());
    }

    // Verify claim deadline has passed
    if ballot.claim_deadline > 0 && current_time < ballot.claim_deadline {
        return Err(CloakCraftError::ClaimDeadlinePassed.into());
    }

    // Calculate unclaimed amount
    // unclaimed = pool_balance - total_distributed
    // Note: This represents tokens that were never claimed by winners
    // plus all tokens from losers (which were never claimable)
    let unclaimed = ballot
        .pool_balance
        .saturating_sub(ballot.total_distributed);

    // Transfer unclaimed tokens to treasury
    if unclaimed > 0 {
        let ballot_id_ref = ballot_id.as_ref();
        let bump_bytes = &[ballot.bump];
        let signer_seeds: &[&[&[u8]]] = &[&[seeds::BALLOT, ballot_id_ref, bump_bytes]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.ballot_vault.to_account_info(),
                to: ctx.accounts.protocol_treasury.to_account_info(),
                authority: ballot.to_account_info(),
            },
            signer_seeds,
        );

        token::transfer(transfer_ctx, unclaimed)?;
    }

    // Update ballot status
    ballot.status = BallotStatus::Finalized;

    msg!("Ballot finalized");
    msg!("  Pool balance: {}", ballot.pool_balance);
    msg!("  Total distributed: {}", ballot.total_distributed);
    msg!("  Fees collected: {}", ballot.fees_collected);
    msg!("  Unclaimed to treasury: {}", unclaimed);

    Ok(())
}
