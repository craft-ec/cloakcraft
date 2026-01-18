//! Process Unshield Phase 3 - Process unshield and protocol fees
//!
//! This is Phase 3 of the multi-phase transact operation.
//! It processes the unshield (if any) and transfers protocol fees to the treasury.
//!
//! Flow:
//! Phase 0: Verify ZK proof + Create pending operation
//! Phase 1: Verify commitment exists
//! Phase 2: Create nullifier via generic instruction
//! Phase 3 (this): Process unshield + Protocol fees
//! Phase 4+: Create output commitments via generic instruction
//! Final: Close pending operation

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{Pool, PendingOperation, ProtocolConfig};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::vault::{transfer_from_vault, update_pool_balance};

#[derive(Accounts)]
#[instruction(operation_id: [u8; 32])]
pub struct ProcessUnshield<'info> {
    /// Pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Token vault (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::VAULT, pool.token_mint.as_ref()],
        bump = pool.vault_bump,
    )]
    pub token_vault: Box<Account<'info, TokenAccount>>,

    /// Pending operation PDA (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump = pending_operation.bump,
        constraint = !pending_operation.is_expired(Clock::get()?.unix_timestamp) @ CloakCraftError::PendingOperationExpired,
        constraint = pending_operation.all_inputs_verified() @ CloakCraftError::CommitmentNotVerified,
        constraint = pending_operation.all_expected_nullifiers_created() @ CloakCraftError::NullifierNotCreated,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Protocol config (required - enforces fee verification)
    #[account(
        seeds = [seeds::PROTOCOL_CONFIG],
        bump = protocol_config.bump,
    )]
    pub protocol_config: Box<Account<'info, ProtocolConfig>>,

    /// Treasury token account for receiving fees (required if fee > 0)
    /// CHECK: Verified to match treasury in protocol_config
    #[account(mut)]
    pub treasury_token_account: Option<Box<Account<'info, TokenAccount>>>,

    /// Unshield recipient (optional, boxed to reduce stack usage)
    /// CHECK: This is the recipient for unshielded tokens
    #[account(mut)]
    pub unshield_recipient: Option<Box<Account<'info, TokenAccount>>>,

    /// Relayer (must match operation creator)
    #[account(
        mut,
        constraint = relayer.key() == pending_operation.relayer @ CloakCraftError::InvalidRelayer,
    )]
    pub relayer: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,
}

/// Phase 3: Process unshield and protocol fees
///
/// This phase:
/// 1. Verifies nullifier was created in Phase 2
/// 2. Processes unshield if requested (transfer tokens from vault)
/// 3. Transfers protocol fee to treasury if fee_amount > 0
///
/// NO encrypted notes stored - they will be regenerated in Phase 4 from:
/// - output_recipients (stored in Phase 2)
/// - output_amounts (stored in Phase 2)
/// - output_randomness (stored in Phase 2)
///
/// This saves ~1680 bytes PDA storage (~0.012 SOL temporary rent).
/// No Light Protocol CPI calls, keeping transaction size minimal.
pub fn process_unshield<'info>(
    ctx: Context<'_, '_, '_, 'info, ProcessUnshield<'info>>,
    _operation_id: [u8; 32],
    unshield_amount: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let pending_op = &mut ctx.accounts.pending_operation;

    msg!("=== Phase 3: Process Unshield + Fees ===");
    msg!("Unshield amount: {} (stored: {})", unshield_amount, pending_op.unshield_amount);
    msg!("Fee amount: {}", pending_op.fee_amount);
    msg!("Output commitments pending: {}", pending_op.num_commitments);

    // Verify nullifier was created
    require!(
        pending_op.all_nullifiers_created(),
        CloakCraftError::NullifiersNotCreated
    );

    // Copy pool values for signer seeds (to avoid borrow conflicts)
    let token_mint_bytes = pool.token_mint.to_bytes();
    let pool_bump = pool.bump;

    // Prepare pool signer seeds for token transfers
    let pool_seeds = &[
        seeds::POOL,
        token_mint_bytes.as_ref(),
        &[pool_bump],
    ];
    let signer_seeds = &[&pool_seeds[..]];

    // Verify protocol fee is correct (on-chain enforcement)
    let fee_amount = pending_op.fee_amount;
    let protocol_config = &ctx.accounts.protocol_config;

    if protocol_config.fees_enabled {
        // Calculate expected fee based on transfer_amount + unshield_amount
        // Fee is charged on the total value leaving the sender's control
        let transfer_amount = pending_op.transfer_amount;
        let total_taxable = transfer_amount
            .checked_add(unshield_amount)
            .ok_or(CloakCraftError::AmountOverflow)?;

        let expected_fee = protocol_config.calculate_fee(total_taxable, protocol_config.transfer_fee_bps);

        msg!("Fee verification: transfer={}, unshield={}, total={}, expected={}, provided={}",
            transfer_amount, unshield_amount, total_taxable, expected_fee, fee_amount);

        // ENFORCE: fee must be >= expected
        require!(
            fee_amount >= expected_fee,
            CloakCraftError::InsufficientFee
        );
    }

    // Process protocol fee if amount > 0 and not already processed
    if fee_amount > 0 && !pending_op.fee_processed {
        // Verify treasury account is provided
        let treasury = ctx.accounts.treasury_token_account.as_ref()
            .ok_or(CloakCraftError::InvalidTreasury)?;

        msg!("Transferring {} fee to treasury {:?}", fee_amount, treasury.key());

        transfer_from_vault(
            &ctx.accounts.token_program,
            &*ctx.accounts.token_vault,
            &**treasury,
            &pool.to_account_info(),
            signer_seeds,
            fee_amount,
        )?;

        update_pool_balance(pool, fee_amount, false)?;
        pending_op.fee_processed = true;

        msg!("✅ Fee transfer complete");
    }

    // Process unshield if amount > 0
    if unshield_amount > 0 {
        let recipient = ctx.accounts.unshield_recipient.as_ref()
            .ok_or(CloakCraftError::InvalidAmount)?;

        msg!("Unshielding {} tokens to {:?}", unshield_amount, recipient.key());

        transfer_from_vault(
            &ctx.accounts.token_program,
            &*ctx.accounts.token_vault,
            &**recipient,
            &pool.to_account_info(),
            signer_seeds,
            unshield_amount,
        )?;

        update_pool_balance(pool, unshield_amount, false)?;

        msg!("✅ Unshield complete");
    }

    msg!("Phase 3 complete: unshield and fees processed");
    msg!("Next: Phase 4+ - create_commitment (SDK regenerates encrypted notes from randomness)");

    Ok(())
}
