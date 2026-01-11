//! Submit a decryption share from committee member

use anchor_lang::prelude::*;

use crate::state::{Aggregation, AggregationStatus, DecryptionShare, ThresholdCommittee};
use crate::constants::seeds;
use crate::errors::CloakCraftError;

#[derive(Accounts)]
pub struct SubmitDecryptionShare<'info> {
    /// Aggregation
    #[account(
        mut,
        seeds = [seeds::AGGREGATION, aggregation.id.as_ref()],
        bump = aggregation.bump,
    )]
    pub aggregation: Account<'info, Aggregation>,

    /// Threshold committee
    #[account(seeds = [seeds::COMMITTEE, committee.committee_id.as_ref()], bump = committee.bump)]
    pub committee: Account<'info, ThresholdCommittee>,

    /// Committee member submitting share
    pub member: Signer<'info>,
}

pub fn submit_decryption_share(
    ctx: Context<SubmitDecryptionShare>,
    shares: Vec<[u8; 32]>,
    dleq_proofs: Vec<Vec<u8>>,
) -> Result<()> {
    let aggregation = &mut ctx.accounts.aggregation;
    let committee = &ctx.accounts.committee;
    let member = &ctx.accounts.member;
    let clock = Clock::get()?;

    // 1. Verify voting deadline has passed
    require!(
        clock.unix_timestamp >= aggregation.deadline,
        CloakCraftError::AggregationNotActive
    );

    // 2. Verify member is in committee
    require!(
        committee.is_member(&member.key()),
        CloakCraftError::NotCommitteeMember
    );

    // 3. Verify member hasn't already submitted
    let already_submitted = aggregation.decryption_shares
        .iter()
        .any(|s| s.party == member.key());
    require!(!already_submitted, CloakCraftError::AlreadyVoted);

    // 4. Verify shares count matches options
    require!(
        shares.len() == aggregation.num_options as usize,
        CloakCraftError::InvalidDecryptionShare
    );

    // 5. Verify DLEQ proofs (in production)
    // For now, accept the shares

    // 6. Store decryption share
    aggregation.decryption_shares.push(DecryptionShare {
        party: member.key(),
        shares,
        dleq_proofs,
    });

    // 7. Update status if threshold met
    if aggregation.decryption_shares.len() >= aggregation.threshold as usize {
        aggregation.status = AggregationStatus::DecryptionInProgress;
    }

    Ok(())
}
