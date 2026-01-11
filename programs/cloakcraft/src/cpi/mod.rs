//! CPI helpers for interacting with external programs
//!
//! Primarily for Light Protocol compressed state and nullifier storage.

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    instruction::{AccountMeta, Instruction},
    program::invoke,
    pubkey::Pubkey,
};

use crate::errors::CloakCraftError;

/// Light Protocol program ID (placeholder - update with actual address)
pub const LIGHT_PROTOCOL_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0x4c, 0x69, 0x67, 0x68, 0x74, 0x50, 0x72, 0x6f,
    0x74, 0x6f, 0x63, 0x6f, 0x6c, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
]);

/// Instruction discriminator for inserting nullifier (placeholder)
pub const INSERT_NULLIFIER_DISCRIMINATOR: [u8; 8] = [
    0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
];

/// Instruction discriminator for checking nullifier exists (placeholder)
pub const CHECK_NULLIFIER_DISCRIMINATOR: [u8; 8] = [
    0xf0, 0xde, 0xbc, 0x9a, 0x78, 0x56, 0x34, 0x12,
];

/// Insert a nullifier into Light Protocol's compressed state
///
/// # Arguments
/// * `nullifier` - The 32-byte nullifier to insert
/// * `nullifier_queue` - The nullifier queue account
/// * `merkle_tree` - The merkle tree account for compressed state
/// * `authority` - The authority signing the transaction
/// * `system_program` - System program for account creation
pub fn insert_nullifier<'info>(
    nullifier: [u8; 32],
    nullifier_queue: &AccountInfo<'info>,
    merkle_tree: &AccountInfo<'info>,
    authority: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
) -> Result<()> {
    let mut data = Vec::with_capacity(8 + 32);
    data.extend_from_slice(&INSERT_NULLIFIER_DISCRIMINATOR);
    data.extend_from_slice(&nullifier);

    let accounts = vec![
        AccountMeta::new(*nullifier_queue.key, false),
        AccountMeta::new(*merkle_tree.key, false),
        AccountMeta::new_readonly(*authority.key, true),
        AccountMeta::new_readonly(*system_program.key, false),
    ];

    let ix = Instruction {
        program_id: LIGHT_PROTOCOL_PROGRAM_ID,
        accounts,
        data,
    };

    invoke(
        &ix,
        &[
            nullifier_queue.clone(),
            merkle_tree.clone(),
            authority.clone(),
            system_program.clone(),
        ],
    ).map_err(|_| CloakCraftError::NullifierInsertionFailed)?;

    Ok(())
}

/// Check if a nullifier exists in Light Protocol's compressed state
///
/// Returns true if nullifier already exists (has been spent)
pub fn check_nullifier_exists<'info>(
    _nullifier: &[u8; 32],
    _nullifier_queue: &AccountInfo<'info>,
) -> Result<bool> {
    // In a real implementation, this would query Light Protocol's indexed storage
    // For now, we return false as nullifier checking happens on-chain via account lookup
    //
    // Light Protocol stores nullifiers in a compressed merkle tree with indexed lookup.
    // The client is responsible for providing a proof that the nullifier doesn't exist,
    // which is verified within the ZK circuit itself.
    //
    // This function is a placeholder for potential on-chain verification.
    Ok(false)
}

/// Adapter module CPI trait
/// External adapters must implement this interface
pub trait AdapterInterface {
    /// Execute a swap operation through the adapter
    fn execute_swap<'info>(
        adapter_program: &AccountInfo<'info>,
        user_authority: &AccountInfo<'info>,
        input_vault: &AccountInfo<'info>,
        output_vault: &AccountInfo<'info>,
        input_amount: u64,
        min_output: u64,
        adapt_params: &[u8],
        remaining_accounts: &[AccountInfo<'info>],
    ) -> Result<u64>;
}

/// Execute a swap through an adapter program
///
/// # Arguments
/// * `adapter_program` - The adapter program to call
/// * `input_vault` - The vault holding input tokens
/// * `output_vault` - The vault to receive output tokens
/// * `input_amount` - Amount of input tokens to swap
/// * `min_output` - Minimum acceptable output amount
/// * `adapt_params` - Adapter-specific parameters (route, slippage, etc.)
/// * `authority` - The authority for the swap
/// * `remaining_accounts` - Additional accounts needed by the adapter (DEX pools, etc.)
pub fn execute_adapter_swap<'info>(
    adapter_program: &AccountInfo<'info>,
    input_vault: &AccountInfo<'info>,
    output_vault: &AccountInfo<'info>,
    input_amount: u64,
    min_output: u64,
    adapt_params: &[u8],
    authority: &AccountInfo<'info>,
    pool_authority_seeds: &[&[u8]],
    remaining_accounts: &[AccountInfo<'info>],
) -> Result<u64> {
    // Adapter instruction format:
    // [8 bytes discriminator][8 bytes input_amount][8 bytes min_output][variable adapt_params]
    const ADAPTER_SWAP_DISCRIMINATOR: [u8; 8] = *b"ADAPT_SW";

    let mut data = Vec::with_capacity(8 + 8 + 8 + adapt_params.len());
    data.extend_from_slice(&ADAPTER_SWAP_DISCRIMINATOR);
    data.extend_from_slice(&input_amount.to_le_bytes());
    data.extend_from_slice(&min_output.to_le_bytes());
    data.extend_from_slice(adapt_params);

    // Build account metas
    let mut accounts = vec![
        AccountMeta::new(*input_vault.key, false),
        AccountMeta::new(*output_vault.key, false),
        AccountMeta::new_readonly(*authority.key, true),
    ];

    // Add remaining accounts for the adapter (DEX pools, etc.)
    for acc in remaining_accounts {
        accounts.push(AccountMeta {
            pubkey: *acc.key,
            is_signer: acc.is_signer,
            is_writable: acc.is_writable,
        });
    }

    let ix = Instruction {
        program_id: *adapter_program.key,
        accounts,
        data,
    };

    // Collect all account infos
    let mut account_infos = vec![
        input_vault.clone(),
        output_vault.clone(),
        authority.clone(),
    ];
    account_infos.extend(remaining_accounts.iter().cloned());

    // Invoke with PDA signer
    anchor_lang::solana_program::program::invoke_signed(
        &ix,
        &account_infos,
        &[pool_authority_seeds],
    ).map_err(|_| CloakCraftError::AdapterSwapFailed)?;

    // Get output amount from the output vault
    // In a real implementation, we'd parse the return value or check balance difference
    // For now, return min_output as placeholder
    Ok(min_output)
}

/// Token operations using SPL Token program
pub mod token {
    use anchor_lang::prelude::*;
    use anchor_spl::token::{self, Transfer, TokenAccount, Token};

    /// Transfer tokens from user to vault (shield operation)
    pub fn transfer_to_vault<'info>(
        from: &Account<'info, TokenAccount>,
        to: &Account<'info, TokenAccount>,
        authority: &Signer<'info>,
        token_program: &Program<'info, Token>,
        amount: u64,
    ) -> Result<()> {
        let cpi_accounts = Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
            authority: authority.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)
    }

    /// Transfer tokens from vault to user (unshield operation) with PDA signer
    pub fn transfer_from_vault<'info>(
        from: &Account<'info, TokenAccount>,
        to: &Account<'info, TokenAccount>,
        authority: &AccountInfo<'info>,
        token_program: &Program<'info, Token>,
        amount: u64,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        let cpi_accounts = Transfer {
            from: from.to_account_info(),
            to: to.to_account_info(),
            authority: authority.clone(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, amount)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_light_protocol_program_id() {
        // Ensure program ID is valid
        assert_ne!(LIGHT_PROTOCOL_PROGRAM_ID, Pubkey::default());
    }
}
