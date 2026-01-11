//! CloakCraft - Privacy Protocol for Solana
//!
//! A unified shielded pool protocol enabling private transactions,
//! swaps, trading, and voting on Solana.

use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod instructions;
pub mod merkle;
pub mod crypto;
pub mod cpi;

use instructions::*;

declare_id!("HsQk1VmzbDwXZnQfevgJvHAfYioFmKJKCBgfuTFKVJAu");

#[program]
pub mod cloakcraft {
    use super::*;

    // ============ Pool Operations ============

    /// Initialize a new shielded pool for a token
    pub fn initialize_pool(ctx: Context<InitializePool>) -> Result<()> {
        pool::initialize_pool(ctx)
    }

    /// Shield tokens - deposit public tokens into the shielded pool
    pub fn shield(
        ctx: Context<Shield>,
        commitment: [u8; 32],
        amount: u64,
        encrypted_note: Vec<u8>,
    ) -> Result<()> {
        pool::shield(ctx, commitment, amount, encrypted_note)
    }

    /// Transact - private transfer with optional unshield
    pub fn transact(
        ctx: Context<Transact>,
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        nullifier: [u8; 32],
        out_commitments: Vec<[u8; 32]>,
        encrypted_notes: Vec<Vec<u8>>,
        unshield_amount: u64,
    ) -> Result<()> {
        pool::transact(ctx, proof, merkle_root, nullifier, out_commitments, encrypted_notes, unshield_amount)
    }

    // ============ Adapter Operations (External DEX) ============

    /// Transact via adapter - swap through external DEX
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
        adapter::transact_adapt(ctx, proof, nullifier, input_amount, min_output, adapt_params, out_commitment, encrypted_note)
    }

    // ============ Market Operations (Internal Orderbook) ============

    /// Create a limit order
    pub fn create_order(
        ctx: Context<CreateOrder>,
        proof: Vec<u8>,
        nullifier: [u8; 32],
        order_id: [u8; 32],
        escrow_commitment: [u8; 32],
        terms_hash: [u8; 32],
        expiry: i64,
        encrypted_escrow: Vec<u8>,
    ) -> Result<()> {
        market::create_order(ctx, proof, nullifier, order_id, escrow_commitment, terms_hash, expiry, encrypted_escrow)
    }

    /// Fill an order atomically
    pub fn fill_order(
        ctx: Context<FillOrder>,
        maker_proof: Vec<u8>,
        taker_proof: Vec<u8>,
        escrow_nullifier: [u8; 32],
        taker_nullifier: [u8; 32],
        order_id: [u8; 32],
        maker_out_commitment: [u8; 32],
        taker_out_commitment: [u8; 32],
        encrypted_notes: Vec<Vec<u8>>,
    ) -> Result<()> {
        market::fill_order(ctx, maker_proof, taker_proof, escrow_nullifier, taker_nullifier, order_id, maker_out_commitment, taker_out_commitment, encrypted_notes)
    }

    /// Cancel an order
    pub fn cancel_order(
        ctx: Context<CancelOrder>,
        proof: Vec<u8>,
        escrow_nullifier: [u8; 32],
        order_id: [u8; 32],
        refund_commitment: [u8; 32],
        encrypted_note: Vec<u8>,
    ) -> Result<()> {
        market::cancel_order(ctx, proof, escrow_nullifier, order_id, refund_commitment, encrypted_note)
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
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        proof: Vec<u8>,
        nullifier_a: [u8; 32],
        nullifier_b: [u8; 32],
        lp_commitment: [u8; 32],
        change_a_commitment: [u8; 32],
        change_b_commitment: [u8; 32],
        old_state_hash: [u8; 32],
        new_state_hash: [u8; 32],
        encrypted_notes: Vec<Vec<u8>>,
    ) -> Result<()> {
        swap::add_liquidity(ctx, proof, nullifier_a, nullifier_b, lp_commitment, change_a_commitment, change_b_commitment, old_state_hash, new_state_hash, encrypted_notes)
    }

    /// Remove liquidity from AMM pool
    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        proof: Vec<u8>,
        lp_nullifier: [u8; 32],
        out_a_commitment: [u8; 32],
        out_b_commitment: [u8; 32],
        old_state_hash: [u8; 32],
        new_state_hash: [u8; 32],
        encrypted_notes: Vec<Vec<u8>>,
    ) -> Result<()> {
        swap::remove_liquidity(ctx, proof, lp_nullifier, out_a_commitment, out_b_commitment, old_state_hash, new_state_hash, encrypted_notes)
    }

    /// Swap via internal AMM
    pub fn swap(
        ctx: Context<Swap>,
        proof: Vec<u8>,
        nullifier: [u8; 32],
        out_commitment: [u8; 32],
        change_commitment: [u8; 32],
        old_state_hash: [u8; 32],
        new_state_hash: [u8; 32],
        min_output: u64,
        encrypted_notes: Vec<Vec<u8>>,
    ) -> Result<()> {
        swap::swap(ctx, proof, nullifier, out_commitment, change_commitment, old_state_hash, new_state_hash, min_output, encrypted_notes)
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
    pub fn submit_encrypted(
        ctx: Context<SubmitEncrypted>,
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        action_nullifier: [u8; 32],
        encrypted_votes: Vec<[u8; 64]>,
    ) -> Result<()> {
        governance::submit_encrypted(ctx, proof, merkle_root, action_nullifier, encrypted_votes)
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
}
