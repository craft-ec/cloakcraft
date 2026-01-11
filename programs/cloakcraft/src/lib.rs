//! CloakCraft - Privacy Protocol for Solana
//!
//! A unified shielded pool protocol enabling private transactions,
//! swaps, trading, and voting on Solana.

use anchor_lang::prelude::*;
use light_sdk::{derive_light_cpi_signer, CpiSigner};

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod instructions;
pub mod merkle;
pub mod crypto;
pub mod cpi;
pub mod light_cpi;

use instructions::*;

declare_id!("HsQk1VmzbDwXZnQfevgJvHAfYioFmKJKCBgfuTFKVJAu");

/// Light Protocol CPI signer for compressed account operations
pub const LIGHT_CPI_SIGNER: CpiSigner =
    derive_light_cpi_signer!("HsQk1VmzbDwXZnQfevgJvHAfYioFmKJKCBgfuTFKVJAu");

#[program]
pub mod cloakcraft {
    use super::*;

    // ============ Pool Operations ============

    /// Initialize a new shielded pool for a token
    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        pool::initialize_pool(ctx)
    }

    /// Shield tokens - deposit public tokens into the shielded pool
    ///
    /// Uses Light Protocol compressed accounts for commitment storage.
    /// The light_params enable on-chain commitment storage via Light Protocol.
    pub fn shield<'info>(
        ctx: Context<'_, '_, '_, 'info, Shield<'info>>,
        commitment: [u8; 32],
        amount: u64,
        encrypted_note: Vec<u8>,
        light_params: Option<pool::LightCommitmentParams>,
    ) -> Result<()> {
        pool::shield(ctx, commitment, amount, encrypted_note, light_params)
    }

    /// Initialize commitment counter for a pool
    ///
    /// Must be called after initialize_pool to enable commitment tracking.
    pub fn initialize_commitment_counter(ctx: Context<InitializeCommitmentCounter>) -> Result<()> {
        pool::initialize_commitment_counter(ctx)
    }

    /// Transact - private transfer with optional unshield
    ///
    /// The light_params parameter enables Light Protocol compressed account
    /// storage for nullifiers. If provided, a compressed account is created
    /// to prevent double-spending. If None, legacy event-only tracking is used.
    pub fn transact<'info>(
        ctx: Context<'_, '_, '_, 'info, Transact<'info>>,
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        nullifier: [u8; 32],
        out_commitments: Vec<[u8; 32]>,
        encrypted_notes: Vec<Vec<u8>>,
        unshield_amount: u64,
        light_params: Option<pool::LightNullifierParams>,
    ) -> Result<()> {
        pool::transact(ctx, proof, merkle_root, nullifier, out_commitments, encrypted_notes, unshield_amount, light_params)
    }

    // ============ Adapter Operations (External DEX) ============

    /// Transact via adapter - swap through external DEX
    pub fn transact_adapt<'info>(
        ctx: Context<'_, '_, '_, 'info, TransactAdapt<'info>>,
        proof: Vec<u8>,
        nullifier: [u8; 32],
        input_amount: u64,
        min_output: u64,
        adapt_params: Vec<u8>,
        out_commitment: [u8; 32],
        encrypted_note: Vec<u8>,
        light_params: Option<adapter::LightAdaptParams>,
    ) -> Result<()> {
        adapter::transact_adapt(ctx, proof, nullifier, input_amount, min_output, adapt_params, out_commitment, encrypted_note, light_params)
    }

    // ============ Market Operations (Internal Orderbook) ============

    /// Create a limit order
    pub fn create_order<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateOrder<'info>>,
        proof: Vec<u8>,
        nullifier: [u8; 32],
        order_id: [u8; 32],
        escrow_commitment: [u8; 32],
        terms_hash: [u8; 32],
        expiry: i64,
        encrypted_escrow: Vec<u8>,
        light_params: Option<market::LightOrderParams>,
    ) -> Result<()> {
        market::create_order(ctx, proof, nullifier, order_id, escrow_commitment, terms_hash, expiry, encrypted_escrow, light_params)
    }

    /// Fill an order atomically
    pub fn fill_order<'info>(
        ctx: Context<'_, '_, '_, 'info, FillOrder<'info>>,
        maker_proof: Vec<u8>,
        taker_proof: Vec<u8>,
        escrow_nullifier: [u8; 32],
        taker_nullifier: [u8; 32],
        order_id: [u8; 32],
        maker_out_commitment: [u8; 32],
        taker_out_commitment: [u8; 32],
        encrypted_notes: Vec<Vec<u8>>,
        light_params: Option<market::LightFillOrderParams>,
    ) -> Result<()> {
        market::fill_order(ctx, maker_proof, taker_proof, escrow_nullifier, taker_nullifier, order_id, maker_out_commitment, taker_out_commitment, encrypted_notes, light_params)
    }

    /// Cancel an order
    pub fn cancel_order<'info>(
        ctx: Context<'_, '_, '_, 'info, CancelOrder<'info>>,
        proof: Vec<u8>,
        escrow_nullifier: [u8; 32],
        order_id: [u8; 32],
        refund_commitment: [u8; 32],
        encrypted_note: Vec<u8>,
        light_params: Option<market::LightCancelOrderParams>,
    ) -> Result<()> {
        market::cancel_order(ctx, proof, escrow_nullifier, order_id, refund_commitment, encrypted_note, light_params)
    }

    // ============ Swap Operations (Internal AMM) ============

    /// Initialize a liquidity pool
    pub fn initialize_amm_pool(
        ctx: Context<InitializeAmmPool>,
        token_a_mint: Pubkey,
        token_b_mint: Pubkey,
        fee_bps: u16,
    ) -> Result<()> {
        swap::initialize_amm_pool(ctx, token_a_mint, token_b_mint, fee_bps)
    }

    /// Add liquidity to AMM pool
    pub fn add_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, AddLiquidity<'info>>,
        proof: Vec<u8>,
        nullifier_a: [u8; 32],
        nullifier_b: [u8; 32],
        lp_commitment: [u8; 32],
        change_a_commitment: [u8; 32],
        change_b_commitment: [u8; 32],
        old_state_hash: [u8; 32],
        new_state_hash: [u8; 32],
        encrypted_notes: Vec<Vec<u8>>,
        light_params: Option<swap::LightAddLiquidityParams>,
    ) -> Result<()> {
        swap::add_liquidity(ctx, proof, nullifier_a, nullifier_b, lp_commitment, change_a_commitment, change_b_commitment, old_state_hash, new_state_hash, encrypted_notes, light_params)
    }

    /// Remove liquidity from AMM pool
    pub fn remove_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, RemoveLiquidity<'info>>,
        proof: Vec<u8>,
        lp_nullifier: [u8; 32],
        out_a_commitment: [u8; 32],
        out_b_commitment: [u8; 32],
        old_state_hash: [u8; 32],
        new_state_hash: [u8; 32],
        encrypted_notes: Vec<Vec<u8>>,
        light_params: Option<swap::LightRemoveLiquidityParams>,
    ) -> Result<()> {
        swap::remove_liquidity(ctx, proof, lp_nullifier, out_a_commitment, out_b_commitment, old_state_hash, new_state_hash, encrypted_notes, light_params)
    }

    /// Swap via internal AMM
    pub fn swap<'info>(
        ctx: Context<'_, '_, '_, 'info, Swap<'info>>,
        proof: Vec<u8>,
        nullifier: [u8; 32],
        out_commitment: [u8; 32],
        change_commitment: [u8; 32],
        old_state_hash: [u8; 32],
        new_state_hash: [u8; 32],
        min_output: u64,
        encrypted_notes: Vec<Vec<u8>>,
        light_params: Option<swap::LightSwapParams>,
    ) -> Result<()> {
        swap::swap(ctx, proof, nullifier, out_commitment, change_commitment, old_state_hash, new_state_hash, min_output, encrypted_notes, light_params)
    }

    // ============ Governance Operations ============

    /// Create a voting aggregation
    pub fn create_aggregation(
        ctx: Context<CreateAggregation>,
        id: [u8; 32],
        threshold_pubkey: [u8; 32],
        threshold: u8,
        num_options: u8,
        deadline: i64,
        action_domain: [u8; 32],
    ) -> Result<()> {
        governance::create_aggregation(ctx, id, threshold_pubkey, threshold, num_options, deadline, action_domain)
    }

    /// Submit an encrypted vote
    ///
    /// Uses Light Protocol for action nullifier storage to prevent double-voting.
    pub fn submit_encrypted<'info>(
        ctx: Context<'_, '_, '_, 'info, SubmitEncrypted<'info>>,
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        action_nullifier: [u8; 32],
        encrypted_votes: Vec<[u8; 64]>,
        light_params: Option<governance::LightVoteParams>,
    ) -> Result<()> {
        governance::submit_encrypted(ctx, proof, merkle_root, action_nullifier, encrypted_votes, light_params)
    }

    /// Submit a decryption share
    pub fn submit_decryption_share(
        ctx: Context<SubmitDecryptionShare>,
        shares: Vec<[u8; 32]>,
        dleq_proofs: Vec<Vec<u8>>,
    ) -> Result<()> {
        governance::submit_decryption_share(ctx, shares, dleq_proofs)
    }

    /// Finalize decryption and reveal results
    pub fn finalize_decryption(
        ctx: Context<FinalizeDecryption>,
        totals: Vec<u64>,
    ) -> Result<()> {
        governance::finalize_decryption(ctx, totals)
    }

    // ============ Admin Operations ============

    /// Register an adapter module
    pub fn register_adapt_module(
        ctx: Context<RegisterAdaptModule>,
        interface_version: u8,
    ) -> Result<()> {
        admin::register_adapt_module(ctx, interface_version)
    }

    /// Disable an adapter module
    pub fn disable_adapt_module(ctx: Context<DisableAdaptModule>) -> Result<()> {
        admin::disable_adapt_module(ctx)
    }

    /// Register a verification key for a circuit
    pub fn register_verification_key(
        ctx: Context<RegisterVerificationKey>,
        circuit_id: [u8; 32],
        vk_data: Vec<u8>,
    ) -> Result<()> {
        admin::register_verification_key(ctx, circuit_id, vk_data)
    }

    /// Set verification key data on an existing account
    /// Used for large VKs that exceed transaction size limits
    pub fn set_verification_key_data(
        ctx: Context<SetVerificationKeyData>,
        circuit_id: [u8; 32],
        vk_data: Vec<u8>,
    ) -> Result<()> {
        admin::set_verification_key_data(ctx, circuit_id, vk_data)
    }

    /// Append verification key data to an existing account
    /// Used for chunked upload of large VKs
    pub fn append_verification_key_data(
        ctx: Context<AppendVerificationKeyData>,
        circuit_id: [u8; 32],
        data_chunk: Vec<u8>,
    ) -> Result<()> {
        admin::append_verification_key_data(ctx, circuit_id, data_chunk)
    }

    /// Register a threshold committee
    pub fn register_threshold_committee(
        ctx: Context<RegisterThresholdCommittee>,
        committee_id: [u8; 32],
        members: Vec<Pubkey>,
        threshold_pubkey: [u8; 32],
        threshold: u8,
    ) -> Result<()> {
        admin::register_threshold_committee(ctx, committee_id, members, threshold_pubkey, threshold)
    }

    /// Test proof verification (development only)
    /// Verifies a proof without pool state checks
    pub fn test_verify_proof(
        ctx: Context<TestVerifyProof>,
        proof: Vec<u8>,
        public_inputs: Vec<[u8; 32]>,
    ) -> Result<()> {
        admin::test_verify_proof(ctx, proof, public_inputs)
    }
}
