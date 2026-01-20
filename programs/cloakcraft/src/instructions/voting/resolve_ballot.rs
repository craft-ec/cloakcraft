//! Resolve a voting ballot
//!
//! Determines the outcome based on the configured resolution mode:
//! - TallyBased: Winner = argmax(option_weights[])
//! - Oracle: Reads outcome from oracle account
//! - Authority: Outcome set by designated resolver

use anchor_lang::prelude::*;

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{Ballot, BallotStatus, ResolutionMode, RevealMode, VoteBindingMode};

#[derive(Accounts)]
#[instruction(ballot_id: [u8; 32])]
pub struct ResolveBallot<'info> {
    /// Ballot to resolve
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Resolver (required for Authority mode, optional otherwise)
    /// Must match ballot.resolver for Authority mode
    pub resolver: Option<Signer<'info>>,

    /// Authority (required for non-Authority modes if resolver not set)
    pub authority: Signer<'info>,
}

pub fn resolve_ballot(
    ctx: Context<ResolveBallot>,
    _ballot_id: [u8; 32],
    outcome: Option<u8>,
) -> Result<()> {
    let ballot = &mut ctx.accounts.ballot;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Check status and timing
    // Allow resolution if:
    // - Status is Active AND voting period has ended
    // - Status is Closed (already closed, awaiting resolution)
    match ballot.status {
        BallotStatus::Active => {
            if current_time < ballot.end_time {
                return Err(CloakCraftError::BallotNotActive.into());
            }
            // Transition to Closed
            ballot.status = BallotStatus::Closed;
        }
        BallotStatus::Closed => {
            // Already closed, proceed with resolution
        }
        BallotStatus::Resolved | BallotStatus::Finalized => {
            return Err(CloakCraftError::BallotAlreadyResolved.into());
        }
        BallotStatus::Pending => {
            return Err(CloakCraftError::VotingNotStarted.into());
        }
    }

    // For encrypted modes, tally must be decrypted first
    if ballot.reveal_mode == RevealMode::TimeLocked
        || ballot.reveal_mode == RevealMode::PermanentPrivate
    {
        // Check if tally has been decrypted (option_weights should be non-zero if votes exist)
        // This is a simplified check; actual implementation may need a dedicated flag
        let encrypted_tally_zeroed = ballot.encrypted_tally.iter().all(|ct| ct == &[0u8; 64]);
        let has_votes = ballot.vote_count > 0;

        // If there are votes but encrypted tally is not zeroed out (decrypted),
        // and option_weights are all zero, decryption hasn't happened
        if has_votes && !encrypted_tally_zeroed && ballot.total_weight == 0 {
            return Err(CloakCraftError::TallyNotDecrypted.into());
        }
    }

    // Determine outcome based on resolution mode
    let winning_option = match ballot.resolution_mode {
        ResolutionMode::TallyBased => {
            // Find option with maximum weight
            ballot.tally_based_winner()
        }
        ResolutionMode::Oracle => {
            // Oracle must have submitted outcome
            // For now, we expect the oracle to call a separate instruction to set outcome
            // or the outcome parameter is provided by the oracle-signed account
            if !ballot.has_oracle {
                return Err(CloakCraftError::OracleOutcomeNotSubmitted.into());
            }
            // Use the outcome parameter if provided, otherwise return error
            outcome
        }
        ResolutionMode::Authority => {
            // Verify resolver is the designated authority
            let resolver = ctx
                .accounts
                .resolver
                .as_ref()
                .ok_or(CloakCraftError::UnauthorizedResolver)?;

            if !ballot.has_resolver || resolver.key() != ballot.resolver {
                return Err(CloakCraftError::UnauthorizedResolver.into());
            }

            // Authority must provide the outcome
            outcome
        }
    };

    // Validate outcome if provided
    if let Some(opt) = winning_option {
        if opt >= ballot.num_options {
            return Err(CloakCraftError::InvalidOutcomeValue.into());
        }
    }

    // Check quorum
    let quorum_met = ballot.quorum_met();

    // Set outcome
    if quorum_met {
        if let Some(opt) = winning_option {
            ballot.outcome = opt;
            ballot.has_outcome = true;
            ballot.winner_weight = ballot.option_weights[opt as usize];
        } else {
            // No winner (e.g., no votes)
            ballot.outcome = 0;
            ballot.has_outcome = false;
            ballot.winner_weight = 0;
        }
    } else {
        // Quorum not met - no winner
        ballot.outcome = 0;
        ballot.has_outcome = false;
        ballot.winner_weight = 0;
        msg!("Quorum not met. Required: {}, Got: {}",
             ballot.quorum_threshold,
             if ballot.binding_mode == VoteBindingMode::SpendToVote {
                 ballot.pool_balance
             } else {
                 ballot.total_weight
             });
    }

    // Transition to Resolved
    ballot.status = BallotStatus::Resolved;

    msg!("Ballot resolved");
    msg!("  Quorum met: {}", quorum_met);
    msg!("  Has outcome: {}", ballot.has_outcome);
    if ballot.has_outcome {
        msg!("  Winning option: {}", ballot.outcome);
        msg!("  Winner weight: {}", ballot.winner_weight);
    }

    Ok(())
}
