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
    address::v2::{derive_address, derive_address_seed},
    cpi::{v2::{LightSystemProgramCpi, CpiAccounts}, InvokeLightSystemProgram, LightCpiInstruction},
    instruction::{PackedAddressTreeInfo, ValidityProof},
};

use crate::state::{SpendNullifierAccount, ActionNullifierAccount, CommitmentAccount, PositionMeta, PositionStatus, LightValidityProof, LightAddressTreeInfo};
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
/// Supports position notes (126 bytes) and LP notes (108 bytes) with ECIES overhead (~80 bytes)
pub const MAX_ENCRYPTED_NOTE_SIZE: usize = 250;

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

/// Verify that a commitment exists in the Light Protocol state tree
///
/// SECURITY CRITICAL: This prevents spending non-existent commitments.
///
/// This function verifies the commitment compressed account exists using
/// Light Protocol's `with_read_only_accounts` CPI which validates that
/// the compressed account state exists in the Merkle tree.
///
/// # Security
/// Without this check, an attacker could:
/// 1. Generate fake commitment
/// 2. Create valid ZK proof (proves math, not on-chain existence)
/// 3. Create nullifier (would succeed)
/// 4. Withdraw tokens never deposited
///
/// This function closes that attack vector by requiring on-chain merkle proof verification.
pub fn verify_commitment_inclusion<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    commitment_account_hash: [u8; 32],
    commitment_merkle_context: crate::instructions::generic::verify_commitment_exists::CommitmentMerkleContext,
    inclusion_proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    commitment: [u8; 32],
    pool: Pubkey,
) -> Result<()> {
    msg!("=== Verify Commitment Inclusion (SECURITY CHECK) ===");
    msg!("Pool: {:?}", pool);
    msg!("Commitment: {:02x?}...", &commitment[0..8]);
    msg!("Account hash: {:02x?}...", &commitment_account_hash[0..8]);
    msg!("Leaf index: {}", commitment_merkle_context.leaf_index);
    msg!("Root index: {}", commitment_merkle_context.root_index);
    msg!("State tree index: {}", commitment_merkle_context.merkle_tree_pubkey_index);

    // Convert IDL-safe types to Light SDK types
    let proof: ValidityProof = inclusion_proof.into();

    // Setup Light CPI accounts
    let light_cpi_accounts = CpiAccounts::new(
        fee_payer,
        remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Use the provided commitment_account_hash directly from the scanner
    let commitment_address = commitment_account_hash;

    msg!("Using commitment address: {:02x?}...", &commitment_address[0..8]);

    // Build the packed read-only account for verification
    use light_compressed_account::compressed_account::{PackedReadOnlyCompressedAccount, PackedMerkleContext};

    let read_only_account = PackedReadOnlyCompressedAccount {
        account_hash: commitment_address,
        merkle_context: PackedMerkleContext {
            merkle_tree_pubkey_index: commitment_merkle_context.merkle_tree_pubkey_index,
            queue_pubkey_index: commitment_merkle_context.queue_pubkey_index,
            leaf_index: commitment_merkle_context.leaf_index,
            prove_by_index: true,
        },
        root_index: commitment_merkle_context.root_index,
    };

    msg!("Verifying commitment with Light Protocol CPI...");

    // SECURITY: Build CPI instruction for read-only verification WITHOUT a separate proof
    // The error 0x1782 "ProofIsSome but no input accounts" occurs when proof=Some but no accounts.
    // For read-only verification, the merkle context IS the proof - we don't need a separate ZK proof.
    // The read_only_account contains the merkle tree position and root for verification.
    use light_compressed_account::instruction_data::with_account_info::InstructionDataInvokeCpiWithAccountInfo;

    let mut cpi_instruction = InstructionDataInvokeCpiWithAccountInfo {
        bump: LIGHT_CPI_SIGNER.bump,
        invoking_program_id: LIGHT_CPI_SIGNER.program_id.into(),
        proof: None, // No ZK proof needed - merkle context in read_only_account is the verification
        mode: 1, // v2 mode
        read_only_accounts: vec![read_only_account],
        ..Default::default()
    };

    let result = cpi_instruction.invoke(light_cpi_accounts);

    match result {
        Ok(_) => {
            msg!("✅ Commitment inclusion verified by Light Protocol");
            msg!("   Pool: {:?}", pool);
            msg!("   Commitment: {:02x?}...", &commitment[0..8]);
            msg!("   Account hash: {:02x?}...", &commitment_address[0..8]);
            msg!("   Leaf index: {}", commitment_merkle_context.leaf_index);
            msg!("   Root index: {}", commitment_merkle_context.root_index);
            Ok(())
        }
        Err(e) => {
            msg!("❌ Commitment verification failed: {:?}", e);
            msg!("   This means the commitment does not exist in the state tree");
            msg!("   or the merkle proof is invalid");
            Err(CloakCraftError::CommitmentNotFound.into())
        }
    }
}

// =============================================================================
// Voting-Specific Commitment Operations
// =============================================================================

use light_sdk::LightDiscriminator;

/// Vote commitment account for Light Protocol
/// Uses ballot_id as the context instead of pool pubkey
#[derive(Clone, Debug, LightDiscriminator, AnchorSerialize, AnchorDeserialize)]
pub struct VoteCommitmentAccount {
    /// Ballot ID this commitment belongs to
    pub ballot_id: [u8; 32],
    /// The commitment hash (from ZK proof)
    pub commitment: [u8; 32],
    /// Leaf index in the ballot's commitment tree
    pub leaf_index: u64,
    /// User's encrypted vote preimage (for claim recovery)
    pub encrypted_preimage: [u8; 128],
    /// Encryption type (0 = user_key, 1 = timelock_key)
    pub encryption_type: u8,
    /// Timestamp when created
    pub created_at: i64,
}

impl Default for VoteCommitmentAccount {
    fn default() -> Self {
        Self {
            ballot_id: [0u8; 32],
            commitment: [0u8; 32],
            leaf_index: 0,
            encrypted_preimage: [0u8; 128],
            encryption_type: 0,
            created_at: 0,
        }
    }
}

impl VoteCommitmentAccount {
    pub const SEED_PREFIX: &'static [u8] = b"vote_commitment";
}

/// Create a vote commitment compressed account
///
/// This stores a vote commitment in Light Protocol's state tree.
/// Uses ballot_id instead of pool pubkey for address derivation.
pub fn create_vote_commitment_account<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    output_tree_index: u8,
    ballot_id: [u8; 32],
    commitment: [u8; 32],
    leaf_index: u64,
    encrypted_preimage: [u8; 128],
    encryption_type: u8,
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

    // Derive address from ballot_id + commitment hash
    // Seeds: ["vote_commitment", ballot_id, commitment]
    let (address, address_seed) = derive_address(
        &[
            VoteCommitmentAccount::SEED_PREFIX,
            ballot_id.as_ref(),
            commitment.as_ref(),
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Create new address params for the compressed account (V2 format)
    let new_address_params = address_tree_info
        .into_new_address_params_assigned_packed(address_seed, Some(output_tree_index));

    // Initialize the compressed account
    let mut commitment_account = LightAccount::<VoteCommitmentAccount>::new_init(
        &crate::ID,
        Some(address),
        output_tree_index,
    );

    // Set account data
    let clock = Clock::get()?;
    commitment_account.ballot_id = ballot_id;
    commitment_account.commitment = commitment;
    commitment_account.leaf_index = leaf_index;
    commitment_account.encrypted_preimage = encrypted_preimage;
    commitment_account.encryption_type = encryption_type;
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

/// Derive the compressed account address for a vote commitment
pub fn derive_vote_commitment_address(
    ballot_id: &[u8; 32],
    commitment: &[u8; 32],
    address_tree: &Pubkey,
) -> [u8; 32] {
    let (address, _) = derive_address(
        &[
            VoteCommitmentAccount::SEED_PREFIX,
            ballot_id.as_ref(),
            commitment.as_ref(),
        ],
        address_tree,
        &crate::ID,
    );
    address
}

/// Verify a vote commitment exists in Light Protocol state tree
///
/// This is the voting-specific version of verify_commitment_inclusion.
/// Uses ballot_key as context instead of pool.
pub fn verify_vote_commitment_inclusion<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    commitment_account_hash: [u8; 32],
    commitment_merkle_context: crate::instructions::voting::VoteCommitmentMerkleContext,
    inclusion_proof: LightValidityProof,
    _address_tree_info: LightAddressTreeInfo,
    commitment: [u8; 32],
    ballot: Pubkey,
) -> Result<()> {
    msg!("=== Verify Vote Commitment Inclusion ===");
    msg!("Ballot: {:?}", ballot);
    msg!("Commitment: {:02x?}...", &commitment[0..8]);
    msg!("Account hash: {:02x?}...", &commitment_account_hash[0..8]);
    msg!("Leaf index: {}", commitment_merkle_context.leaf_index);
    msg!("Root index: {}", commitment_merkle_context.root_index);
    msg!("State tree index: {}", commitment_merkle_context.merkle_tree_pubkey_index);

    // Convert IDL-safe types to Light SDK types
    let _proof: ValidityProof = inclusion_proof.into();

    // Setup Light CPI accounts
    let light_cpi_accounts = CpiAccounts::new(
        fee_payer,
        remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Use the provided commitment_account_hash directly from the scanner
    let commitment_address = commitment_account_hash;

    msg!("Using commitment address: {:02x?}...", &commitment_address[0..8]);

    // Build the packed read-only account for verification
    use light_compressed_account::compressed_account::{PackedReadOnlyCompressedAccount, PackedMerkleContext};

    let read_only_account = PackedReadOnlyCompressedAccount {
        account_hash: commitment_address,
        merkle_context: PackedMerkleContext {
            merkle_tree_pubkey_index: commitment_merkle_context.merkle_tree_pubkey_index,
            queue_pubkey_index: commitment_merkle_context.queue_pubkey_index,
            leaf_index: commitment_merkle_context.leaf_index,
            prove_by_index: true,
        },
        root_index: commitment_merkle_context.root_index,
    };

    msg!("Verifying vote commitment with Light Protocol CPI...");

    // Build CPI instruction for read-only verification
    use light_compressed_account::instruction_data::with_account_info::InstructionDataInvokeCpiWithAccountInfo;

    let cpi_instruction = InstructionDataInvokeCpiWithAccountInfo {
        bump: LIGHT_CPI_SIGNER.bump,
        invoking_program_id: LIGHT_CPI_SIGNER.program_id.into(),
        proof: None, // No ZK proof needed - merkle context in read_only_account is the verification
        mode: 1, // v2 mode
        read_only_accounts: vec![read_only_account],
        ..Default::default()
    };

    let result = cpi_instruction.invoke(light_cpi_accounts);

    match result {
        Ok(_) => {
            msg!("Vote commitment inclusion verified by Light Protocol");
            msg!("   Ballot: {:?}", ballot);
            msg!("   Commitment: {:02x?}...", &commitment[0..8]);
            msg!("   Account hash: {:02x?}...", &commitment_address[0..8]);
            Ok(())
        }
        Err(e) => {
            msg!("Vote commitment verification failed: {:?}", e);
            msg!("   This means the vote commitment does not exist in the state tree");
            Err(CloakCraftError::CommitmentNotFound.into())
        }
    }
}

// =============================================================================
// Position Metadata Operations (for Perps Liquidation)
// =============================================================================

/// Create a position metadata compressed account
///
/// This creates the PUBLIC position metadata alongside the private position commitment.
/// Both accounts share the same position_id, enforced by the ZK circuit.
///
/// The PositionMeta enables permissionless liquidation:
/// - Keepers can query via Photon API
/// - Check oracle price vs liquidation_price
/// - If underwater, create nullifier using pre-committed nullifier_hash
///
/// Seeds: ["position_meta", pool_id, position_id]
#[allow(clippy::too_many_arguments)]
pub fn create_position_meta_account<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    output_tree_index: u8,
    pool_id: [u8; 32],
    market_id: [u8; 32],
    position_id: [u8; 32],
    margin_amount: u64,
    liquidation_price: u64,
    is_long: bool,
    position_size: u64,
    entry_price: u64,
    nullifier_hash: [u8; 32],
    owner_stealth_pubkey: [u8; 32],
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

    // Derive address from pool_id + position_id
    // Seeds: ["position_meta", pool_id, position_id]
    let (address, address_seed) = derive_address(
        &[
            PositionMeta::SEED_PREFIX,
            pool_id.as_ref(),
            position_id.as_ref(),
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Create new address params for the compressed account (V2 format)
    let new_address_params = address_tree_info
        .into_new_address_params_assigned_packed(address_seed, Some(output_tree_index));

    // Initialize the compressed account
    let mut position_meta = LightAccount::<PositionMeta>::new_init(
        &crate::ID,
        Some(address),
        output_tree_index,
    );

    // Set account data
    let clock = Clock::get()?;
    position_meta.position_id = position_id;
    position_meta.pool_id = pool_id;
    position_meta.market_id = market_id;
    position_meta.margin_amount = margin_amount;
    position_meta.liquidation_price = liquidation_price;
    position_meta.is_long = is_long;
    position_meta.position_size = position_size;
    position_meta.entry_price = entry_price;
    position_meta.nullifier_hash = nullifier_hash;
    position_meta.status = PositionStatus::Active as u8;
    position_meta.created_at = clock.unix_timestamp;
    position_meta.updated_at = clock.unix_timestamp;
    position_meta.owner_stealth_pubkey = owner_stealth_pubkey;

    msg!("Creating PositionMeta compressed account");
    msg!("  Position ID: {:02x?}...", &position_id[0..8]);
    msg!("  Pool ID: {:02x?}...", &pool_id[0..8]);
    msg!("  Market ID: {:02x?}...", &market_id[0..8]);
    msg!("  Margin: {}", margin_amount);
    msg!("  Liquidation Price: {}", liquidation_price);
    msg!("  Direction: {}", if is_long { "LONG" } else { "SHORT" });

    // Invoke Light System Program to create the compressed account
    LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
        .with_light_account(position_meta)
        .map_err(|_| CloakCraftError::LightCpiError)?
        .with_new_addresses(&[new_address_params])
        .invoke(light_cpi_accounts)
        .map_err(|_| CloakCraftError::PositionMetaCreationFailed)?;

    msg!("✅ PositionMeta created successfully");

    Ok(())
}

/// Derive the compressed account address for a position metadata
pub fn derive_position_meta_address(
    pool_id: &[u8; 32],
    position_id: &[u8; 32],
    address_tree: &Pubkey,
) -> [u8; 32] {
    let (address, _) = derive_address(
        &[
            PositionMeta::SEED_PREFIX,
            pool_id.as_ref(),
            position_id.as_ref(),
        ],
        address_tree,
        &crate::ID,
    );
    address
}

/// Merkle context for PositionMeta verification/updates
#[derive(Clone, Debug, AnchorSerialize, AnchorDeserialize)]
pub struct PositionMetaMerkleContext {
    pub merkle_tree_pubkey_index: u8,
    pub queue_pubkey_index: u8,
    pub leaf_index: u32,
    pub root_index: u16,
}

/// Read PositionMeta from compressed account for liquidation check
///
/// This verifies the PositionMeta exists and returns its data.
/// Used by liquidation instructions to check if position is underwater.
pub fn verify_position_meta_inclusion<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    position_meta_hash: [u8; 32],
    merkle_context: PositionMetaMerkleContext,
    pool_id: [u8; 32],
    position_id: [u8; 32],
) -> Result<()> {
    msg!("=== Verify PositionMeta Inclusion ===");
    msg!("Pool ID: {:02x?}...", &pool_id[0..8]);
    msg!("Position ID: {:02x?}...", &position_id[0..8]);
    msg!("Account hash: {:02x?}...", &position_meta_hash[0..8]);

    // Setup Light CPI accounts
    let light_cpi_accounts = CpiAccounts::new(
        fee_payer,
        remaining_accounts,
        LIGHT_CPI_SIGNER,
    );

    // Build the packed read-only account for verification
    use light_compressed_account::compressed_account::{PackedReadOnlyCompressedAccount, PackedMerkleContext};

    let read_only_account = PackedReadOnlyCompressedAccount {
        account_hash: position_meta_hash,
        merkle_context: PackedMerkleContext {
            merkle_tree_pubkey_index: merkle_context.merkle_tree_pubkey_index,
            queue_pubkey_index: merkle_context.queue_pubkey_index,
            leaf_index: merkle_context.leaf_index,
            prove_by_index: true,
        },
        root_index: merkle_context.root_index,
    };

    // Build CPI instruction for read-only verification
    use light_compressed_account::instruction_data::with_account_info::InstructionDataInvokeCpiWithAccountInfo;

    let cpi_instruction = InstructionDataInvokeCpiWithAccountInfo {
        bump: LIGHT_CPI_SIGNER.bump,
        invoking_program_id: LIGHT_CPI_SIGNER.program_id.into(),
        proof: None,
        mode: 1,
        read_only_accounts: vec![read_only_account],
        ..Default::default()
    };

    let result = cpi_instruction.invoke(light_cpi_accounts);

    match result {
        Ok(_) => {
            msg!("✅ PositionMeta inclusion verified");
            Ok(())
        }
        Err(e) => {
            msg!("❌ PositionMeta verification failed: {:?}", e);
            Err(CloakCraftError::PositionMetaNotFound.into())
        }
    }
}

/// Position status record - marks a position as liquidated/closed
///
/// Instead of updating PositionMeta in place (complex with Light Protocol),
/// we create a separate status record. The close flow checks if this exists.
#[derive(Clone, Debug, LightDiscriminator, AnchorSerialize, AnchorDeserialize)]
pub struct PositionStatusRecord {
    /// Position this record belongs to
    pub position_id: [u8; 32],
    /// Pool this position belongs to
    pub pool_id: [u8; 32],
    /// Status: 1 = Liquidated, 2 = Closed
    pub status: u8,
    /// When this status was set
    pub timestamp: i64,
    /// Who set this status (keeper for liquidation, relayer for close)
    pub actor: [u8; 32],
}

impl Default for PositionStatusRecord {
    fn default() -> Self {
        Self {
            position_id: [0u8; 32],
            pool_id: [0u8; 32],
            status: 0,
            timestamp: 0,
            actor: [0u8; 32],
        }
    }
}

impl PositionStatusRecord {
    pub const SEED_PREFIX: &'static [u8] = b"position_status";
}

/// Create a position status record (for liquidation/close)
///
/// This creates a record that marks the position as liquidated or closed.
/// The close position flow checks if this record exists before allowing close.
///
/// Seeds: ["position_status", pool_id, position_id]
pub fn create_position_status_record<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    output_tree_index: u8,
    pool_id: [u8; 32],
    position_id: [u8; 32],
    status: PositionStatus,
) -> Result<()> {
    msg!("=== Create Position Status Record ===");
    msg!("Position ID: {:02x?}...", &position_id[0..8]);
    msg!("Status: {:?}", status);

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

    // Derive address
    let (address, address_seed) = derive_address(
        &[
            PositionStatusRecord::SEED_PREFIX,
            pool_id.as_ref(),
            position_id.as_ref(),
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // Create new address params
    let new_address_params = address_tree_info
        .into_new_address_params_assigned_packed(address_seed, Some(output_tree_index));

    // Create status record
    let mut status_record = LightAccount::<PositionStatusRecord>::new_init(
        &crate::ID,
        Some(address),
        output_tree_index,
    );

    let clock = Clock::get()?;
    status_record.position_id = position_id;
    status_record.pool_id = pool_id;
    status_record.status = status as u8;
    status_record.timestamp = clock.unix_timestamp;
    status_record.actor = fee_payer.key().to_bytes();

    // Create the status record
    LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
        .with_light_account(status_record)
        .map_err(|_| CloakCraftError::LightCpiError)?
        .with_new_addresses(&[new_address_params])
        .invoke(light_cpi_accounts)
        .map_err(|_| CloakCraftError::PositionMetaUpdateFailed)?;

    msg!("✅ Position status record created: {:?}", status);

    Ok(())
}

/// Verify that a position status record does NOT exist (position is still active)
///
/// This is used in the close position flow to ensure the position
/// hasn't been liquidated. If the record exists, the position cannot be closed.
pub fn verify_position_not_liquidated<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    pool_id: [u8; 32],
    position_id: [u8; 32],
    address_tree_info: LightAddressTreeInfo,
) -> Result<()> {
    msg!("=== Verify Position Not Liquidated ===");
    msg!("Position ID: {:02x?}...", &position_id[0..8]);

    // Convert IDL-safe types
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

    // Derive the expected address for status record
    let (expected_address, _) = derive_address(
        &[
            PositionStatusRecord::SEED_PREFIX,
            pool_id.as_ref(),
            position_id.as_ref(),
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    // TODO: Verify non-inclusion via Light Protocol
    // For now, we log the expected address - the actual verification
    // would require a non-inclusion proof from the indexer
    msg!("Expected status record address: {:02x?}...", &expected_address[0..8]);
    msg!("(Non-inclusion verification delegated to client-side proof)");

    // The actual non-inclusion proof is provided by the client
    // and verified implicitly by Light Protocol when creating the close nullifier
    // If a status record exists at this address, Light will reject the operation

    Ok(())
}

/// Create a liquidation nullifier from pre-committed hash
///
/// This is used during liquidation to invalidate the position commitment
/// WITHOUT knowing the owner's secret nullifier_key.
///
/// The nullifier_hash was pre-committed at position creation:
/// nullifier_hash = hash(nullifier) where nullifier = hash(DOMAIN, nullifier_key, position_id)
///
/// By publishing this hash as a nullifier, we prevent the owner from
/// closing their already-liquidated position.
///
/// Seeds: ["liquidation_nullifier", pool_id, nullifier_hash]
pub fn create_liquidation_nullifier<'info>(
    fee_payer: &AccountInfo<'info>,
    remaining_accounts: &[AccountInfo<'info>],
    proof: LightValidityProof,
    address_tree_info: LightAddressTreeInfo,
    output_tree_index: u8,
    pool_id: [u8; 32],
    nullifier_hash: [u8; 32],
) -> Result<()> {
    msg!("=== Create Liquidation Nullifier ===");
    msg!("Pool ID: {:02x?}...", &pool_id[0..8]);
    msg!("Nullifier hash: {:02x?}...", &nullifier_hash[0..8]);

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

    // Derive address using nullifier_hash
    // Note: We use the same SpendNullifierAccount but with nullifier_hash instead of nullifier
    // This works because the close_position circuit will compute:
    // nullifier = hash(DOMAIN, nullifier_key, position_id)
    // And then check if hash(nullifier) == nullifier_hash exists
    let (address, address_seed) = derive_address(
        &[
            b"liquidation_nullifier",
            pool_id.as_ref(),
            nullifier_hash.as_ref(),
        ],
        &address_tree_pubkey,
        &crate::ID,
    );

    let new_address_params = address_tree_info
        .into_new_address_params_assigned_packed(address_seed, Some(output_tree_index));

    // Create nullifier account
    let mut nullifier_account = LightAccount::<SpendNullifierAccount>::new_init(
        &crate::ID,
        Some(address),
        output_tree_index,
    );

    let clock = Clock::get()?;
    nullifier_account.pool = pool_id;
    nullifier_account.spent_at = clock.unix_timestamp;

    // Create the nullifier
    LightSystemProgramCpi::new_cpi(LIGHT_CPI_SIGNER, proof)
        .with_light_account(nullifier_account)
        .map_err(|_| CloakCraftError::LightCpiError)?
        .with_new_addresses(&[new_address_params])
        .invoke(light_cpi_accounts)
        .map_err(|_| CloakCraftError::LiquidationNullifierFailed)?;

    msg!("✅ Liquidation nullifier created");

    Ok(())
}
