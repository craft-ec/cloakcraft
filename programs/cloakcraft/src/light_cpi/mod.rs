//! Light Protocol CPI operations for compressed accounts (V2)
//!
//! Handles storage of nullifiers and commitments using Light Protocol's
//! compressed accounts. This replaces the on-chain merkle tree with
//! Light Protocol's batch state tree infrastructure.
//!
//! Benefits:
//! - No rent for storage
//! - Helius Photon provides merkle proofs
//! - Scales to millions of entries
//! - V2 batch trees for better throughput

use anchor_lang::prelude::*;
use light_sdk::{
    account::LightAccount,
    address::v2::derive_address,
    cpi::{v2::{LightSystemProgramCpi, CpiAccounts}, InvokeLightSystemProgram, LightCpiInstruction},
    instruction::{PackedAddressTreeInfo, ValidityProof},
};

use crate::state::{SpendNullifierAccount, ActionNullifierAccount, CommitmentAccount, LightValidityProof, LightAddressTreeInfo};
use crate::errors::CloakCraftError;
use crate::LIGHT_CPI_SIGNER;

/// Create a spend nullifier compressed account
///
/// This function:
/// 1. Derives the compressed account address from pool + nullifier hash
/// 2. Creates a new compressed account at that address
/// 3. The validity proof ensures the address doesn't already exist (non-inclusion)
///
/// If the nullifier has already been spent in this pool, the validity proof will fail,
/// preventing double-spending.
///
/// Seeds: ["spend_nullifier", pool, nullifier]
pub fn create_spend_nullifier_account<'info>(
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

    // Setup Light CPI accounts (v2)
    let light_cpi_accounts = CpiAccounts::new(
        fee_payer,
        remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Get address tree pubkey
    let address_tree_pubkey = address_tree_info.get_tree_pubkey(&light_cpi_accounts)
        .map_err(|_| CloakCraftError::LightCpiError)?;

    // Derive address from pool + nullifier hash
    // Seeds: ["spend_nullifier", pool, nullifier]
    let (address, address_seed) = derive_address(
        &[
            SpendNullifierAccount::SEED_PREFIX,
            pool.as_ref(),
            nullifier.as_ref(),
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Create new address params for the compressed account (V2 format)
    let new_address_params = address_tree_info
        .into_new_address_params_assigned_packed(address_seed, Some(output_tree_index));

    // Initialize the compressed account
    let mut nullifier_account = LightAccount::<SpendNullifierAccount>::new_init(
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

/// Create an action nullifier compressed account
///
/// This function:
/// 1. Derives the compressed account address from aggregation + nullifier hash
/// 2. Creates a new compressed account at that address
/// 3. The validity proof ensures the address doesn't already exist (non-inclusion)
///
/// If the nullifier has already been used in this aggregation, the validity proof will fail,
/// preventing double-voting.
///
/// Seeds: ["action_nullifier", aggregation, nullifier]
pub fn create_action_nullifier_account<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    output_tree_index: u8,
    aggregation_id: [u8; 32],
    nullifier: [u8; 32],
) -> Result<()> {
    // Convert IDL-safe types to Light SDK types
    let proof: ValidityProof = proof.into();
    let address_tree_info: PackedAddressTreeInfo = address_tree_info.into();

    // Setup Light CPI accounts (v2)
    let light_cpi_accounts = CpiAccounts::new(
        fee_payer,
        remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Get address tree pubkey
    let address_tree_pubkey = address_tree_info.get_tree_pubkey(&light_cpi_accounts)
        .map_err(|_| CloakCraftError::LightCpiError)?;

    // Derive address from aggregation + nullifier hash
    // Seeds: ["action_nullifier", aggregation, nullifier]
    let (address, address_seed) = derive_address(
        &[
            ActionNullifierAccount::SEED_PREFIX,
            aggregation_id.as_ref(),
            nullifier.as_ref(),
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Create new address params for the compressed account (V2 format)
    let new_address_params = address_tree_info
        .into_new_address_params_assigned_packed(address_seed, Some(output_tree_index));

    // Initialize the compressed account
    let mut nullifier_account = LightAccount::<ActionNullifierAccount>::new_init(
        &crate::ID,
        Some(address),
        output_tree_index,
    );

    // Set account data
    let clock = Clock::get()?;
    nullifier_account.aggregation = aggregation_id;
    nullifier_account.voted_at = clock.unix_timestamp;

    // Invoke Light System Program to create the compressed account
    // This will fail if the address already exists (already voted)
    LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
        .with_light_account(nullifier_account)
        .map_err(|_| CloakCraftError::LightCpiError)?
        .with_new_addresses(&[new_address_params])
        .invoke(light_cpi_accounts)
        .map_err(|_| CloakCraftError::ActionNullifierAlreadyUsed)?;

    Ok(())
}


/// Derive the compressed account address for a spend nullifier
///
/// This is useful for clients to compute the expected address
/// and query the indexer for existence.
///
/// Seeds: ["spend_nullifier", pool, nullifier]
pub fn derive_spend_nullifier_address(
    pool: &Pubkey,
    nullifier: &[u8; 32],
    address_tree: &Pubkey,
) -> [u8; 32] {
    let (address, _) = derive_address(
        &[
            SpendNullifierAccount::SEED_PREFIX,
            pool.as_ref(),
            nullifier.as_ref(),
        ],
        address_tree,
        &crate::ID,
    );
    address
}

/// Derive the compressed account address for an action nullifier
///
/// This is useful for clients to compute the expected address
/// and query the indexer for existence.
///
/// Seeds: ["action_nullifier", aggregation, nullifier]
pub fn derive_action_nullifier_address(
    aggregation_id: &[u8; 32],
    nullifier: &[u8; 32],
    address_tree: &Pubkey,
) -> [u8; 32] {
    let (address, _) = derive_address(
        &[
            ActionNullifierAccount::SEED_PREFIX,
            aggregation_id.as_ref(),
            nullifier.as_ref(),
        ],
        address_tree,
        &crate::ID,
    );
    address
}


// =============================================================================
// Commitment Operations
// =============================================================================

/// Maximum encrypted note size matching CommitmentAccount
pub const MAX_ENCRYPTED_NOTE_SIZE: usize = 200;

/// Helper to convert Vec<u8> to fixed array with length
#[inline]
pub fn vec_to_fixed_note(note: &[u8]) -> ([u8; MAX_ENCRYPTED_NOTE_SIZE], u16) {
    let len = note.len().min(MAX_ENCRYPTED_NOTE_SIZE) as u16;
    let mut arr = [0u8; MAX_ENCRYPTED_NOTE_SIZE];
    arr[..len as usize].copy_from_slice(&note[..len as usize]);
    (arr, len)
}

/// Create a commitment compressed account
///
/// This stores a note commitment in Light Protocol's state tree.
/// The commitment is stored as a compressed account, and Helius Photon
/// provides merkle proofs for ZK circuit verification.
/// Encrypted note is stored inline for direct scanning via Light Protocol API.
/// The stealth ephemeral pubkey is stored so recipients can derive the
/// stealth private key for decryption.
pub fn create_commitment_account<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    output_tree_index: u8,
    pool: Pubkey,
    commitment: [u8; 32],
    leaf_index: u64,
    stealth_ephemeral_pubkey: [u8; 64],
    encrypted_note: [u8; MAX_ENCRYPTED_NOTE_SIZE],
    encrypted_note_len: u16,
) -> Result<()> {
    // Convert IDL-safe types to Light SDK types
    let proof: ValidityProof = proof.into();
    let address_tree_info: PackedAddressTreeInfo = address_tree_info.into();

    // Setup Light CPI accounts (v2)
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

    // Create new address params for the compressed account (V2 format)
    // Second param is the output state tree index where the address will be created
    let new_address_params = address_tree_info
        .into_new_address_params_assigned_packed(address_seed, Some(output_tree_index));

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
    commitment_account.stealth_ephemeral_pubkey = stealth_ephemeral_pubkey;
    commitment_account.encrypted_note = encrypted_note;
    commitment_account.encrypted_note_len = encrypted_note_len;
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
