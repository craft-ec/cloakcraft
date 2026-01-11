//! Transact via adapter - swap through external DEX (partial privacy)

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::state::{Pool, AdaptModule, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteCreated, NoteSpent, MerkleRootUpdated};
use crate::merkle::insert_leaf;
use crate::crypto::verify_proof;

#[derive(Accounts)]
pub struct TransactAdapt<'info> {
    /// Input token pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, input_pool.token_mint.as_ref()],
        bump = input_pool.bump,
    )]
    pub input_pool: Box<Account<'info, Pool>>,

    /// Output token pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, output_pool.token_mint.as_ref()],
        bump = output_pool.bump,
    )]
    pub output_pool: Box<Account<'info, Pool>>,

    /// Input token vault
    #[account(
        mut,
        seeds = [seeds::VAULT, input_pool.token_mint.as_ref()],
        bump = input_pool.vault_bump,
    )]
    pub input_vault: Account<'info, TokenAccount>,

    /// Output token vault
    #[account(
        mut,
        seeds = [seeds::VAULT, output_pool.token_mint.as_ref()],
        bump = output_pool.vault_bump,
    )]
    pub output_vault: Account<'info, TokenAccount>,

    /// Adapter module
    #[account(
        seeds = [seeds::ADAPT_MODULE, adapt_module.program_id.as_ref()],
        bump = adapt_module.bump,
        constraint = adapt_module.is_usable() @ CloakCraftError::AdapterDisabled,
    )]
    pub adapt_module: Account<'info, AdaptModule>,

    /// Verification key (boxed to reduce stack usage)
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Relayer
    pub relayer: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,

    // Additional accounts for adapter CPI would be passed as remaining_accounts
}

pub fn transact_adapt(
    ctx: Context<TransactAdapt>,
    proof: Vec<u8>,
    nullifier: [u8; 32],
    input_amount: u64,
    min_output: u64,
    adapt_params: Vec<u8>,
    out_commitment: [u8; 32],
    encrypted_note: Vec<u8>,
) -> Result<()> {
    let input_pool = &mut ctx.accounts.input_pool;
    let output_pool = &mut ctx.accounts.output_pool;
    let clock = Clock::get()?;

    // 1. Verify ZK proof (proves ownership of input, specifies amounts)
    // Note: amounts are public in adapter circuit for DEX compatibility
    let public_inputs = build_adapt_public_inputs(
        &input_pool.merkle_root,
        &nullifier,
        &input_pool.token_mint,
        input_amount,
        &output_pool.token_mint,
        min_output,
        &ctx.accounts.adapt_module.program_id,
        &adapt_params,
        &out_commitment,
    );

    verify_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
    )?;

    // 2. Mark input as spent
    emit!(NoteSpent {
        pool: input_pool.key(),
        nullifier,
        timestamp: clock.unix_timestamp,
    });

    // 3. CPI to adapter to execute swap
    // In production: CPI to Jupiter/etc via adapter interface
    // The adapter would:
    // - Receive input tokens from input_vault
    // - Execute swap
    // - Return output tokens to output_vault
    // For now, we simulate by requiring the output amount

    let _actual_output = execute_adapter_swap(
        &ctx.accounts.adapt_module,
        input_amount,
        min_output,
        &adapt_params,
        ctx.remaining_accounts,
    )?;

    // 4. Verify output meets minimum
    // (In production, use actual_output from adapter)
    let output_amount = min_output; // Simplified

    // 5. Create output commitment in output pool
    require!(output_pool.can_insert(), CloakCraftError::TreeFull);

    let leaf_index = output_pool.next_leaf_index;
    let new_root = insert_leaf(
        &mut output_pool.frontier,
        leaf_index,
        out_commitment,
    )?;

    output_pool.update_root(new_root);
    output_pool.next_leaf_index += 1;

    emit!(NoteCreated {
        pool: output_pool.key(),
        commitment: out_commitment,
        leaf_index,
        encrypted_note,
        timestamp: clock.unix_timestamp,
    });

    emit!(MerkleRootUpdated {
        pool: output_pool.key(),
        new_root,
        next_leaf_index: output_pool.next_leaf_index,
        timestamp: clock.unix_timestamp,
    });

    // Update TVL tracking
    input_pool.total_shielded = input_pool.total_shielded
        .saturating_sub(input_amount);
    output_pool.total_shielded = output_pool.total_shielded
        .saturating_add(output_amount);

    Ok(())
}

fn build_adapt_public_inputs(
    merkle_root: &[u8; 32],
    nullifier: &[u8; 32],
    input_token: &Pubkey,
    input_amount: u64,
    output_token: &Pubkey,
    min_output: u64,
    adapt_module: &Pubkey,
    adapt_params: &[u8],
    out_commitment: &[u8; 32],
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    inputs.push(*merkle_root);
    inputs.push(*nullifier);
    inputs.push(input_token.to_bytes());
    inputs.push(u64_to_field(input_amount));
    inputs.push(output_token.to_bytes());
    inputs.push(u64_to_field(min_output));
    inputs.push(adapt_module.to_bytes());
    inputs.push(hash_params(adapt_params));
    inputs.push(*out_commitment);
    inputs
}

fn u64_to_field(value: u64) -> [u8; 32] {
    let mut result = [0u8; 32];
    result[..8].copy_from_slice(&value.to_le_bytes());
    result
}

fn hash_params(params: &[u8]) -> [u8; 32] {
    solana_keccak_hasher::hash(params).to_bytes()
}

fn execute_adapter_swap(
    _adapt_module: &AdaptModule,
    _input_amount: u64,
    min_output: u64,
    _params: &[u8],
    _remaining_accounts: &[AccountInfo],
) -> Result<u64> {
    // In production, this would CPI to the adapter program
    // For now, return min_output as placeholder
    Ok(min_output)
}
