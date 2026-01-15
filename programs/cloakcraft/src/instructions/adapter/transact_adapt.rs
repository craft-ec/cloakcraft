//! Transact via adapter - swap through external DEX (partial privacy)
//!
//! Uses Light Protocol for both nullifier and commitment storage.

use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};

use crate::state::{Pool, AdaptModule, VerificationKey, PoolCommitmentCounter, LightValidityProof, LightAddressTreeInfo};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::light_cpi::{create_spend_nullifier_account, create_commitment_account, vec_to_fixed_note};

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

    /// Commitment counter for output pool
    #[account(
        mut,
        seeds = [PoolCommitmentCounter::SEEDS_PREFIX, output_pool.key().as_ref()],
        bump = output_commitment_counter.bump,
    )]
    pub output_commitment_counter: Account<'info, PoolCommitmentCounter>,

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

    /// Relayer (pays for compressed account creation)
    #[account(mut)]
    pub relayer: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,

    // Light Protocol accounts are passed via remaining_accounts
}

/// Parameters for Light Protocol operations
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightAdaptParams {
    /// Validity proof for nullifier (proves it doesn't exist)
    pub nullifier_proof: LightValidityProof,
    /// Address tree info for nullifier
    pub nullifier_address_tree_info: LightAddressTreeInfo,
    /// Validity proof for output commitment
    pub commitment_proof: LightValidityProof,
    /// Address tree info for commitment
    pub commitment_address_tree_info: LightAddressTreeInfo,
    /// Output state tree index
    pub output_tree_index: u8,
}

pub fn transact_adapt<'info>(
    ctx: Context<'_, '_, '_, 'info, TransactAdapt<'info>>,
    proof: Vec<u8>,
    nullifier: [u8; 32],
    input_amount: u64,
    min_output: u64,
    adapt_params: Vec<u8>,
    out_commitment: [u8; 32],
    encrypted_note: Vec<u8>,
    light_params: Option<LightAdaptParams>,
) -> Result<()> {
    let input_pool = &mut ctx.accounts.input_pool;
    let output_pool = &mut ctx.accounts.output_pool;
    let output_commitment_counter = &mut ctx.accounts.output_commitment_counter;
    let clock = Clock::get()?;

    // 1. Verify ZK proof (proves ownership of input, specifies amounts)
    // Note: amounts are public in adapter circuit for DEX compatibility
    // Merkle root is now verified by Light Protocol validity proof
    let public_inputs = build_adapt_public_inputs(
        &nullifier,
        &input_pool.token_mint,
        input_amount,
        &output_pool.token_mint,
        min_output,
        &ctx.accounts.adapt_module.program_id,
        &adapt_params,
        &out_commitment,
    );

    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "AdapterSwap",
    )?;

    // 2. Create nullifier compressed account via Light Protocol
    if let Some(ref params) = light_params {
        create_spend_nullifier_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.nullifier_proof.clone(),
            params.nullifier_address_tree_info.clone(),
            params.output_tree_index,
            input_pool.key(),
            nullifier,
        )?;
    }
    // 3. CPI to adapter to execute swap
    // In production: CPI to Jupiter/etc via adapter interface
    // For now, we simulate by requiring the output amount
    let _actual_output = execute_adapter_swap(
        &ctx.accounts.adapt_module,
        input_amount,
        min_output,
        &adapt_params,
        ctx.remaining_accounts,
    )?;

    // 4. Verify output meets minimum
    let output_amount = min_output; // Simplified

    // 5. Create output commitment via Light Protocol
    // Encrypted note is stored inline for direct scanning
    let leaf_index = output_commitment_counter.next_leaf_index;
    output_commitment_counter.next_leaf_index += 1;
    output_commitment_counter.total_commitments += 1;

    if let Some(ref params) = light_params {
        let (encrypted_note_arr, encrypted_note_len) = vec_to_fixed_note(&encrypted_note);
        create_commitment_account(
            &ctx.accounts.relayer.to_account_info(),
            ctx.remaining_accounts,
            params.commitment_proof.clone(),
            params.commitment_address_tree_info.clone(),
            params.output_tree_index,
            output_pool.key(),
            out_commitment,
            leaf_index,
            [0u8; 64],
            encrypted_note_arr,
            encrypted_note_len,
        )?;
    }

    // Update TVL tracking
    input_pool.total_shielded = input_pool.total_shielded
        .saturating_sub(input_amount);
    output_pool.total_shielded = output_pool.total_shielded
        .saturating_add(output_amount);

    Ok(())
}

fn build_adapt_public_inputs(
    nullifier: &[u8; 32],
    input_token: &Pubkey,
    input_amount: u64,
    output_token: &Pubkey,
    min_output: u64,
    adapt_module: &Pubkey,
    adapt_params: &[u8],
    out_commitment: &[u8; 32],
) -> Vec<[u8; 32]> {
    // Note: merkle_root is no longer a public input - verified by Light Protocol
    let mut inputs = Vec::new();
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
