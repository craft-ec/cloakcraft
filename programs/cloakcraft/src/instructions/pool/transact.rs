//! Transact - private transfer with optional unshield

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::{Pool, VerificationKey};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::events::{NoteCreated, NoteSpent, Unshielded, MerkleRootUpdated};
use crate::merkle::insert_leaf;
use crate::crypto::verify_proof;

#[derive(Accounts)]
pub struct Transact<'info> {
    /// Pool (boxed to reduce stack usage)
    #[account(
        mut,
        seeds = [seeds::POOL, pool.token_mint.as_ref()],
        bump = pool.bump,
    )]
    pub pool: Box<Account<'info, Pool>>,

    /// Token vault
    #[account(
        mut,
        seeds = [seeds::VAULT, pool.token_mint.as_ref()],
        bump = pool.vault_bump,
    )]
    pub token_vault: Account<'info, TokenAccount>,

    /// Verification key for the circuit (boxed to reduce stack usage)
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Unshield recipient (optional, can be any account)
    /// CHECK: This is the recipient for unshielded tokens
    #[account(mut)]
    pub unshield_recipient: Option<Account<'info, TokenAccount>>,

    /// Relayer/submitter
    pub relayer: Signer<'info>,

    /// Token program
    pub token_program: Program<'info, Token>,

    // Light Protocol accounts for nullifier storage would go here
    // /// CHECK: Light Protocol nullifier tree
    // pub nullifier_tree: AccountInfo<'info>,
    // /// CHECK: Light Protocol program
    // pub light_program: AccountInfo<'info>,
}

pub fn transact(
    ctx: Context<Transact>,
    proof: Vec<u8>,
    merkle_root: [u8; 32],
    nullifier: [u8; 32],
    out_commitments: Vec<[u8; 32]>,
    encrypted_notes: Vec<Vec<u8>>,
    unshield_amount: u64,
) -> Result<()> {
    let pool = &mut ctx.accounts.pool;
    let clock = Clock::get()?;

    // 1. Verify merkle root is valid (current or recent)
    require!(
        pool.is_valid_root(&merkle_root),
        CloakCraftError::InvalidMerkleRoot
    );

    // 2. Verify ZK proof
    let public_inputs = build_transact_public_inputs(
        &merkle_root,
        &nullifier,
        &out_commitments,
        &pool.token_mint,
        unshield_amount,
        ctx.accounts.unshield_recipient.as_ref().map(|r| r.key()),
    );

    verify_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
    )?;

    // 3. Check and insert nullifier (via Light Protocol CPI)
    // In production, this would CPI to Light Protocol to:
    // - verify_non_inclusion(nullifier)
    // - insert_nullifier(nullifier)
    // For now, we emit the spent event for indexer to track

    emit!(NoteSpent {
        pool: pool.key(),
        nullifier,
        timestamp: clock.unix_timestamp,
    });

    // 4. Insert output commitments
    for (i, commitment) in out_commitments.iter().enumerate() {
        require!(pool.can_insert(), CloakCraftError::TreeFull);

        let leaf_index = pool.next_leaf_index;
        let new_root = insert_leaf(
            &mut pool.frontier,
            leaf_index,
            *commitment,
        )?;

        pool.update_root(new_root);
        pool.next_leaf_index += 1;

        emit!(NoteCreated {
            pool: pool.key(),
            commitment: *commitment,
            leaf_index,
            encrypted_note: encrypted_notes.get(i).cloned().unwrap_or_default(),
            timestamp: clock.unix_timestamp,
        });
    }

    // 5. Process unshield if amount > 0
    if unshield_amount > 0 {
        let recipient = ctx.accounts.unshield_recipient.as_ref()
            .ok_or(CloakCraftError::InvalidAmount)?;

        // Transfer from vault to recipient
        let pool_seeds = &[
            seeds::POOL,
            pool.token_mint.as_ref(),
            &[pool.bump],
        ];
        let signer_seeds = &[&pool_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.token_vault.to_account_info(),
            to: recipient.to_account_info(),
            authority: pool.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, unshield_amount)?;

        pool.total_shielded = pool.total_shielded.checked_sub(unshield_amount)
            .ok_or(CloakCraftError::InsufficientBalance)?;

        emit!(Unshielded {
            pool: pool.key(),
            amount: unshield_amount,
            recipient: recipient.key(),
            timestamp: clock.unix_timestamp,
        });
    }

    emit!(MerkleRootUpdated {
        pool: pool.key(),
        new_root: pool.merkle_root,
        next_leaf_index: pool.next_leaf_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

/// Build public inputs array for proof verification
fn build_transact_public_inputs(
    merkle_root: &[u8; 32],
    nullifier: &[u8; 32],
    out_commitments: &[[u8; 32]],
    token_mint: &Pubkey,
    unshield_amount: u64,
    unshield_recipient: Option<Pubkey>,
) -> Vec<[u8; 32]> {
    let mut inputs = Vec::new();
    inputs.push(*merkle_root);
    inputs.push(*nullifier);
    for commitment in out_commitments {
        inputs.push(*commitment);
    }
    inputs.push(pubkey_to_field(token_mint));
    inputs.push(u64_to_field(unshield_amount));
    if let Some(recipient) = unshield_recipient {
        inputs.push(pubkey_to_field(&recipient));
    }
    inputs
}

fn pubkey_to_field(pubkey: &Pubkey) -> [u8; 32] {
    pubkey.to_bytes()
}

fn u64_to_field(value: u64) -> [u8; 32] {
    let mut result = [0u8; 32];
    result[..8].copy_from_slice(&value.to_le_bytes());
    result
}
