//! Execute Claim (Phase 3)
//!
//! Transfers payout from ballot vault to user.
//! Called after position_nullifier is created (Phase 2).

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{Ballot, BallotStatus, PendingOperation, VoteBindingMode};

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32], ballot_id: [u8; 32])]
pub struct ExecuteClaim<'info> {
    /// Ballot (must be resolved)
    #[account(
        mut,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump = ballot.bump,
        constraint = ballot.binding_mode == VoteBindingMode::SpendToVote @ CloakCraftError::ClaimsNotAllowed,
        constraint = ballot.status == BallotStatus::Resolved @ CloakCraftError::BallotNotResolved,
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Ballot vault (source of payout)
    #[account(
        mut,
        seeds = [seeds::BALLOT_VAULT, ballot_id.as_ref()],
        bump,
        token::mint = ballot.token_mint,
        token::authority = ballot,
    )]
    pub ballot_vault: Account<'info, TokenAccount>,

    /// Protocol treasury (receives fee)
    #[account(
        mut,
        constraint = protocol_treasury.key() == ballot.protocol_treasury @ CloakCraftError::InvalidTreasury,
    )]
    pub protocol_treasury: Account<'info, TokenAccount>,

    /// Pending operation
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = pending_operation.proof_verified @ CloakCraftError::ProofNotVerified,
        constraint = pending_operation.all_inputs_verified() @ CloakCraftError::CommitmentNotVerified,
        constraint = pending_operation.all_expected_nullifiers_created() @ CloakCraftError::NullifierNotCreated,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (must match pending operation)
    #[account(
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

pub fn execute_claim(
    ctx: Context<ExecuteClaim>,
    _operation_id: [u8; 32],
    ballot_id: [u8; 32],
) -> Result<()> {
    let ballot = &mut ctx.accounts.ballot;
    let pending_op = &ctx.accounts.pending_operation;
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Verify claim deadline hasn't passed
    if ballot.claim_deadline > 0 && current_time >= ballot.claim_deadline {
        return Err(CloakCraftError::ClaimDeadlinePassed.into());
    }

    // Extract claim data from pending operation
    let gross_payout = pending_op.swap_amount;
    let net_payout = pending_op.output_amount;
    let fee_amount = pending_op.fee_amount;

    // Verify vault has sufficient balance
    if ctx.accounts.ballot_vault.amount < gross_payout {
        return Err(CloakCraftError::InsufficientBalance.into());
    }

    // Prepare signer seeds for vault transfer
    let ballot_id_ref = ballot_id.as_ref();
    let bump_bytes = &[ballot.bump];
    let signer_seeds: &[&[&[u8]]] = &[&[seeds::BALLOT, ballot_id_ref, bump_bytes]];

    // Transfer fee to treasury (if any)
    if fee_amount > 0 {
        let fee_transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.ballot_vault.to_account_info(),
                to: ctx.accounts.protocol_treasury.to_account_info(),
                authority: ballot.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(fee_transfer_ctx, fee_amount)?;

        ballot.fees_collected = ballot.fees_collected.saturating_add(fee_amount);
    }

    // Note: The net_payout goes to the payout_commitment created in Phase 4
    // This is handled by the shielded pool mechanism - the tokens become
    // a new shielded note. The actual SPL transfer for shielded output
    // happens as part of the Light Protocol commitment creation.
    //
    // For now, we track the distribution in the ballot state.
    // The vault balance is managed by the shielded pool mechanism.

    // Update ballot state
    ballot.total_distributed = ballot.total_distributed.saturating_add(gross_payout);

    msg!("Claim executed");
    msg!("  Gross payout: {}", gross_payout);
    msg!("  Net payout: {}", net_payout);
    msg!("  Fee: {}", fee_amount);
    msg!("  Total distributed: {}", ballot.total_distributed);
    msg!("  Fees collected: {}", ballot.fees_collected);

    Ok(())
}
