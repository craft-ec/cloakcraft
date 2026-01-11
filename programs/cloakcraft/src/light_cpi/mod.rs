//! Light Protocol CPI operations for compressed accounts
//!
//! Handles storage of nullifiers and commitments using Light Protocol's
//! compressed accounts. This replaces the on-chain merkle tree with
//! Light Protocol's state tree infrastructure.
//!
//! Benefits:
//! - No rent for storage
//! - Helius Photon provides merkle proofs
//! - Scales to millions of entries

use anchor_lang::prelude::*;
use light_sdk::{
    account::LightAccount,
    address::v1::derive_address,
    cpi::{v1::{LightSystemProgramCpi, CpiAccounts}, InvokeLightSystemProgram, LightCpiInstruction},
    instruction::{PackedAddressTreeInfo, ValidityProof},
};

use crate::state::{NullifierAccount, CommitmentAccount, LightValidityProof, LightAddressTreeInfo};
use crate::errors::CloakCraftError;
use crate::LIGHT_CPI_SIGNER;

/// Create a nullifier compressed account
///
/// This function:
/// 1. Derives the compressed account address from the nullifier hash
/// 2. Creates a new compressed account at that address
/// 3. The validity proof ensures the address doesn't already exist (non-inclusion)
///
/// If the nullifier has already been spent, the validity proof will fail,
/// preventing double-spending.
pub fn create_nullifier_account<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    output_tree_index: u8,
    pool: Pubkey,
    nullifier: [u8; 32],
) -> Result<()> {
    // Convert IDL-safe types to Light SDK types
    let proof: ValidityProof = proof.into();
    let address_tree_info: PackedAddressTreeInfo = address_tree_info.into();
    // Setup Light CPI accounts
    let light_cpi_accounts = CpiAccounts::new(
        fee_payer,
        remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Get address tree pubkey
    let address_tree_pubkey = address_tree_info.get_tree_pubkey(&light_cpi_accounts)
        .map_err(|_| CloakCraftError::LightCpiError)?;

    // Derive address from nullifier hash
    // Address = hash(SEED_PREFIX || nullifier || address_tree || program_id)
    let (address, address_seed) = derive_address(
        &[NullifierAccount::SEED_PREFIX, nullifier.as_ref()],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Create new address params for the compressed account
    let new_address_params = address_tree_info
        .into_new_address_params_packed(address_seed);

    // Initialize the compressed account
    let mut nullifier_account = LightAccount::<NullifierAccount>::new_init(
        &crate::ID,
        Some(address),
        output_tree_index,
    );

    // Set account data
    let clock = Clock::get()?;
    nullifier_account.pool = pool.to_bytes();
    nullifier_account.spent_at = clock.unix_timestamp;

    // Invoke Light System Program to create the compressed account
    // This will fail if the address already exists (nullifier already spent)
    LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
        .with_light_account(nullifier_account)
        .map_err(|_| CloakCraftError::LightCpiError)?
        .with_new_addresses(&[new_address_params])
        .invoke(light_cpi_accounts)
        .map_err(|_| CloakCraftError::NullifierAlreadySpent)?;

    Ok(())
}

/// Derive the compressed account address for a nullifier
///
/// This is useful for clients to compute the expected address
/// and query the indexer for existence.
pub fn derive_nullifier_address(
    nullifier: &[u8; 32],
    address_tree: &Pubkey,
) -> [u8; 32] {
    let (address, _) = derive_address(
        &[NullifierAccount::SEED_PREFIX, nullifier.as_ref()],
        address_tree,
        &crate::ID,
    );
    address
}

// =============================================================================
// Commitment Operations
// =============================================================================

/// Create a commitment compressed account
///
/// This stores a note commitment in Light Protocol's state tree.
/// The commitment is stored as a compressed account, and Helius Photon
/// provides merkle proofs for ZK circuit verification.
pub fn create_commitment_account<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    output_tree_index: u8,
    pool: Pubkey,
    commitment: [u8; 32],
    leaf_index: u64,
    encrypted_note_hash: [u8; 32],
) -> Result<()> {
    // Convert IDL-safe types to Light SDK types
    let proof: ValidityProof = proof.into();
    let address_tree_info: PackedAddressTreeInfo = address_tree_info.into();

    // Setup Light CPI accounts
    let light_cpi_accounts = CpiAccounts::new(
        fee_payer,
        remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Get address tree pubkey
    let address_tree_pubkey = address_tree_info.get_tree_pubkey(&light_cpi_accounts)
        .map_err(|_| CloakCraftError::LightCpiError)?;

    // Derive address from commitment hash
    // Address = hash(SEED_PREFIX || pool || commitment || address_tree || program_id)
    let (address, address_seed) = derive_address(
        &[
            CommitmentAccount::SEED_PREFIX,
            pool.as_ref(),
            commitment.as_ref(),
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Create new address params for the compressed account
    let new_address_params = address_tree_info
        .into_new_address_params_packed(address_seed);

    // Initialize the compressed account
    let mut commitment_account = LightAccount::<CommitmentAccount>::new_init(
        &crate::ID,
        Some(address),
        output_tree_index,
    );

    // Set account data
    let clock = Clock::get()?;
    commitment_account.pool = pool.to_bytes();
    commitment_account.commitment = commitment;
    commitment_account.leaf_index = leaf_index;
    commitment_account.encrypted_note_hash = encrypted_note_hash;
    commitment_account.created_at = clock.unix_timestamp;

    // Invoke Light System Program to create the compressed account
    LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
        .with_light_account(commitment_account)
        .map_err(|_| CloakCraftError::LightCpiError)?
        .with_new_addresses(&[new_address_params])
        .invoke(light_cpi_accounts)
        .map_err(|_| CloakCraftError::CommitmentCreationFailed)?;

    Ok(())
}

/// Derive the compressed account address for a commitment
pub fn derive_commitment_address(
    pool: &Pubkey,
    commitment: &[u8; 32],
    address_tree: &Pubkey,
) -> [u8; 32] {
    let (address, _) = derive_address(
        &[
            CommitmentAccount::SEED_PREFIX,
            pool.as_ref(),
            commitment.as_ref(),
        ],
        address_tree,
        &crate::ID,
    );
    address
}
