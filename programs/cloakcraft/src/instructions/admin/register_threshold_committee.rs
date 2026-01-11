//! Register a threshold committee

use anchor_lang::prelude::*;

use crate::state::ThresholdCommittee;
use crate::constants::seeds;

#[derive(Accounts)]
#[instruction(committee_id: [u8; 32])]
pub struct RegisterThresholdCommittee<'info> {
    /// Committee account
    #[account(
        init,
        payer = payer,
        space = ThresholdCommittee::space(10), // up to 10 members
        seeds = [seeds::COMMITTEE, committee_id.as_ref()],
        bump
    )]
    pub committee: Account<'info, ThresholdCommittee>,

    /// Authority
    pub authority: Signer<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn register_threshold_committee(
    ctx: Context<RegisterThresholdCommittee>,
    committee_id: [u8; 32],
    members: Vec<Pubkey>,
    threshold_pubkey: [u8; 32],
    threshold: u8,
) -> Result<()> {
    let committee = &mut ctx.accounts.committee;

    committee.committee_id = committee_id;
    committee.threshold_pubkey = threshold_pubkey;
    committee.members = members;
    committee.threshold = threshold;
    committee.authority = ctx.accounts.authority.key();
    committee.is_active = true;
    committee.bump = ctx.bumps.committee;

    Ok(())
}
