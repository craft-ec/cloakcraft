//! Create a voting ballot
//!
//! Initializes a new ballot with the specified configuration.
//! For SpendToVote mode, also creates a token vault.

use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::state::{
    Ballot, BallotConfigInput, BallotStatus, RevealMode, VoteBindingMode,
    MAX_BALLOT_OPTIONS, MAX_WEIGHT_FORMULA_OPS, MAX_WEIGHT_PARAMS,
};

#[derive(Accounts)]
#[instruction(ballot_id: [u8; 32], config: BallotConfigInput)]
pub struct CreateBallot<'info> {
    /// Ballot account to create
    #[account(
        init,
        payer = payer,
        space = Ballot::SPACE,
        seeds = [seeds::BALLOT, ballot_id.as_ref()],
        bump
    )]
    pub ballot: Box<Account<'info, Ballot>>,

    /// Token mint for voting power
    pub token_mint: Account<'info, Mint>,

    /// Token vault for SpendToVote mode (optional, only needed for SpendToVote)
    /// Must be a PDA owned by this program
    #[account(
        init_if_needed,
        payer = payer,
        seeds = [seeds::BALLOT_VAULT, ballot_id.as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = ballot,
    )]
    pub ballot_vault: Option<Account<'info, TokenAccount>>,

    /// Authority who creates and can manage the ballot
    pub authority: Signer<'info>,

    /// Payer for account creation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn create_ballot(
    ctx: Context<CreateBallot>,
    ballot_id: [u8; 32],
    config: BallotConfigInput,
) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Validate configuration
    validate_config(&config, current_time)?;

    let ballot = &mut ctx.accounts.ballot;

    // Set identifiers
    ballot.ballot_id = ballot_id;
    ballot.authority = ctx.accounts.authority.key();
    ballot.token_mint = ctx.accounts.token_mint.key();

    // Set token pool (vault address for SpendToVote, or default for Snapshot)
    if config.binding_mode == VoteBindingMode::SpendToVote {
        if let Some(vault) = &ctx.accounts.ballot_vault {
            ballot.token_pool = vault.key();
        } else {
            return Err(CloakCraftError::InvalidBindingMode.into());
        }
    } else {
        ballot.token_pool = Pubkey::default();
    }

    // Set configuration
    ballot.binding_mode = config.binding_mode;
    ballot.reveal_mode = config.reveal_mode;
    ballot.vote_type = config.vote_type;
    ballot.resolution_mode = config.resolution_mode;

    // Set status based on timing
    if current_time >= config.start_time {
        ballot.status = BallotStatus::Active;
    } else {
        ballot.status = BallotStatus::Pending;
    }

    ballot.num_options = config.num_options;
    ballot.quorum_threshold = config.quorum_threshold;
    ballot.protocol_fee_bps = config.protocol_fee_bps;
    ballot.protocol_treasury = config.protocol_treasury;

    // Set timing
    ballot.start_time = config.start_time;
    ballot.end_time = config.end_time;
    ballot.snapshot_slot = config.snapshot_slot;
    ballot.indexer_pubkey = config.indexer_pubkey;

    // Set eligibility root
    if let Some(root) = config.eligibility_root {
        ballot.eligibility_root = root;
        ballot.has_eligibility_root = true;
    } else {
        ballot.eligibility_root = [0u8; 32];
        ballot.has_eligibility_root = false;
    }

    // Set weight formula
    let formula_len = config.weight_formula.len().min(MAX_WEIGHT_FORMULA_OPS);
    for i in 0..formula_len {
        ballot.weight_formula[i] = config.weight_formula[i];
    }
    ballot.weight_formula_len = formula_len as u8;

    // Set weight params
    let params_len = config.weight_params.len().min(MAX_WEIGHT_PARAMS);
    for i in 0..params_len {
        ballot.weight_params[i] = config.weight_params[i];
    }

    // Initialize tally arrays to zero
    ballot.option_weights = [0u64; MAX_BALLOT_OPTIONS];
    ballot.option_amounts = [0u64; MAX_BALLOT_OPTIONS];
    ballot.total_weight = 0;
    ballot.total_amount = 0;
    ballot.vote_count = 0;

    // Initialize pool state (SpendToVote only)
    ballot.pool_balance = 0;
    ballot.total_distributed = 0;
    ballot.fees_collected = 0;

    // Initialize encrypted tally (for TimeLocked/PermanentPrivate modes)
    // Set to identity ciphertexts (all zeros represents encrypted zero)
    ballot.encrypted_tally = [[0u8; 64]; MAX_BALLOT_OPTIONS];
    ballot.time_lock_pubkey = config.time_lock_pubkey;
    ballot.unlock_slot = config.unlock_slot;

    // Initialize resolution state
    ballot.outcome = 0;
    ballot.has_outcome = false;
    ballot.winner_weight = 0;

    // Set resolver (for Authority mode)
    if let Some(resolver) = config.resolver {
        ballot.resolver = resolver;
        ballot.has_resolver = true;
    } else {
        ballot.resolver = Pubkey::default();
        ballot.has_resolver = false;
    }

    // Set oracle (for Oracle mode)
    if let Some(oracle) = config.oracle {
        ballot.oracle = oracle;
        ballot.has_oracle = true;
    } else {
        ballot.oracle = Pubkey::default();
        ballot.has_oracle = false;
    }

    ballot.claim_deadline = config.claim_deadline;
    ballot.bump = ctx.bumps.ballot;

    msg!("Ballot created: {:?}", ballot_id);
    msg!("  Binding mode: {:?}", config.binding_mode);
    msg!("  Reveal mode: {:?}", config.reveal_mode);
    msg!("  Vote type: {:?}", config.vote_type);
    msg!("  Resolution mode: {:?}", config.resolution_mode);
    msg!("  Num options: {}", config.num_options);

    Ok(())
}

/// Validate ballot configuration
fn validate_config(config: &BallotConfigInput, current_time: i64) -> Result<()> {
    // Validate timing
    if config.start_time >= config.end_time {
        return Err(CloakCraftError::InvalidBallotTiming.into());
    }

    // Validate num_options
    if config.num_options == 0 || config.num_options as usize > MAX_BALLOT_OPTIONS {
        return Err(CloakCraftError::InvalidNumOptions.into());
    }

    // Validate protocol fee
    if config.protocol_fee_bps > 10000 {
        return Err(CloakCraftError::ProtocolFeeExceedsMax.into());
    }

    // Validate weight formula length
    if config.weight_formula.len() > MAX_WEIGHT_FORMULA_OPS {
        return Err(CloakCraftError::WeightFormulaTooLong.into());
    }

    // Validate weight params length
    if config.weight_params.len() > MAX_WEIGHT_PARAMS {
        return Err(CloakCraftError::TooManyWeightParams.into());
    }

    // Validate timelock settings for encrypted modes
    if config.reveal_mode == RevealMode::TimeLocked
        || config.reveal_mode == RevealMode::PermanentPrivate
    {
        // time_lock_pubkey must be set
        if config.time_lock_pubkey == [0u8; 32] {
            return Err(CloakCraftError::InvalidDecryptionKey.into());
        }

        // unlock_slot must be after end_time (converted to slot estimate)
        // Note: This is a rough check; actual slot timing may vary
        if config.unlock_slot == 0 {
            return Err(CloakCraftError::TimelockNotExpired.into());
        }
    }

    // Validate snapshot_slot for Snapshot mode
    if config.binding_mode == VoteBindingMode::Snapshot {
        // For Snapshot mode, snapshot_slot should be set
        // (could be in the past or future depending on use case)
        if config.snapshot_slot == 0 {
            return Err(CloakCraftError::InvalidSnapshotSlot.into());
        }
    }

    // Validate claim_deadline for SpendToVote mode
    if config.binding_mode == VoteBindingMode::SpendToVote {
        // claim_deadline should be after end_time if set
        if config.claim_deadline != 0 && config.claim_deadline <= config.end_time {
            return Err(CloakCraftError::InvalidBallotTiming.into());
        }
    }

    Ok(())
}
