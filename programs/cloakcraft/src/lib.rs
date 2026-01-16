//! CloakCraft - Privacy Protocol for Solana
//!
//! A unified shielded pool protocol enabling private transactions,
//! swaps, trading, and voting on Solana.

use anchor_lang::prelude::*;
use light_sdk::{derive_light_cpi_signer, CpiSigner};

pub mod constants;
pub mod errors;
pub mod state;
pub mod instructions;
pub mod merkle;
pub mod crypto;
pub mod cpi;
pub mod light_cpi;
pub mod helpers;

use instructions::*;

declare_id!("DsCP619hPxpvY1SKfCqoKMB7om52UJBKBewevvoNN7Ha");

/// Light Protocol CPI signer for compressed account operations
pub const LIGHT_CPI_SIGNER: CpiSigner =
    derive_light_cpi_signer!("DsCP619hPxpvY1SKfCqoKMB7om52UJBKBewevvoNN7Ha");

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
    /// The stealth_ephemeral_pubkey is stored so recipient can derive
    /// the stealth private key for decryption.
    pub fn shield<'info>(
        ctx: Context<'_, '_, '_, 'info, Shield<'info>>,
        commitment: [u8; 32],
        amount: u64,
        stealth_ephemeral_pubkey: [u8; 64],
        encrypted_note: Vec<u8>,
        light_params: Option<pool::LightCommitmentParams>,
    ) -> Result<()> {
        pool::shield(ctx, commitment, amount, stealth_ephemeral_pubkey, encrypted_note, light_params)
    }

    /// Initialize commitment counter for a pool
    ///
    /// Must be called after initialize_pool to enable commitment tracking.
    pub fn initialize_commitment_counter(ctx: Context<InitializeCommitmentCounter>) -> Result<()> {
        pool::initialize_commitment_counter(ctx)
    }

    /// Create Pending with Proof Phase 0 - verify ZK proof and create PendingOperation (Transfer-specific)
    ///
    /// Append Pattern multi-phase operation flow:
    /// Phase 0 (this): Verify ZK proof + Create PendingOperation (binds all phases)
    /// Phase 1: Verify commitment exists (GENERIC, binds to Phase 0)
    /// Phase 2: Create nullifier (GENERIC, binds to Phase 0)
    /// Phase 3: Process unshield (operation-specific)
    /// Phase 4+: Create commitments (GENERIC)
    /// Final: Close pending operation (GENERIC)
    ///
    /// SECURITY: ZK proof verified, binding fields stored in PendingOperation.
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProof<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        input_commitment: [u8; 32],
        nullifier: [u8; 32],
        out_commitments: Vec<[u8; 32]>,
        output_recipients: Vec<[u8; 32]>,
        output_amounts: Vec<u64>,
        output_randomness: Vec<[u8; 32]>,
        stealth_ephemeral_pubkeys: Vec<[u8; 64]>,
        unshield_amount: u64,
    ) -> Result<()> {
        pool::create_pending_with_proof(ctx, operation_id, proof, merkle_root, input_commitment, nullifier, out_commitments, output_recipients, output_amounts, output_randomness, stealth_ephemeral_pubkeys, unshield_amount)
    }

    /// Process Unshield Phase 3 - process unshield only (Transfer-specific)
    ///
    /// Must be called after create_nullifier_and_pending (Phase 2) and before create_commitment (Phase 4+).
    /// This phase has NO Light Protocol CPI calls.
    ///
    /// NOTE: Encrypted notes are NOT stored in PDA (saves ~1680 bytes).
    /// SDK must regenerate encrypted notes in Phase 4 from randomness stored in PendingOperation.
    pub fn process_unshield<'info>(
        ctx: Context<'_, '_, '_, 'info, ProcessUnshield<'info>>,
        operation_id: [u8; 32],
        unshield_amount: u64,
    ) -> Result<()> {
        pool::process_unshield(ctx, operation_id, unshield_amount)
    }

    /// Transact Phase 1 (DEPRECATED) - private transfer with optional unshield
    ///
    /// DEPRECATED: Use the new multi-phase flow instead:
    /// 1. verify_proof_for_transact (Phase 0)
    /// 2. verify_commitment_for_transact (Phase 1)
    /// 3. create_nullifier (Phase 2)
    /// 4. process_unshield (Phase 3)
    /// 5. create_commitment (Phase 4+)
    /// 6. close_pending_operation (Final)
    ///
    /// This old instruction exceeds transaction size limits and should not be used.
    pub fn transact<'info>(
        ctx: Context<'_, '_, '_, 'info, Transact<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        nullifier: [u8; 32],
        input_commitment: [u8; 32],
        out_commitments: Vec<[u8; 32]>,
        encrypted_notes: Vec<Vec<u8>>,
        unshield_amount: u64,
        num_commitments: u8,
        light_params: pool::LightTransactParams,
    ) -> Result<()> {
        pool::transact(ctx, operation_id, proof, merkle_root, nullifier, input_commitment, out_commitments, encrypted_notes, unshield_amount, num_commitments, light_params)
    }

    /// Store a commitment as a Light Protocol compressed account
    ///
    /// Called after transact to persist commitments on-chain.
    /// Can be called in separate transactions to avoid size limits.
    pub fn store_commitment<'info>(
        ctx: Context<'_, '_, '_, 'info, StoreCommitment<'info>>,
        params: pool::StoreCommitmentParams,
    ) -> Result<()> {
        pool::store_commitment(ctx, params)
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

    // ============ Append Pattern Swap Operations ============

    /// Create Pending with Proof Phase 0 - Swap (Append Pattern)
    ///
    /// Flow:
    /// Phase 0 (this): Verify ZK proof + Create PendingOperation
    /// Phase 1: verify_commitment_exists for input
    /// Phase 2: create_nullifier_and_pending for input
    /// Phase 3: execute_swap to update AMM state
    /// Phase 4+: create_commitment for outputs
    /// Final: close_pending_operation
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_swap<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofSwap<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        input_commitment: [u8; 32],
        nullifier: [u8; 32],
        out_commitment: [u8; 32],
        change_commitment: [u8; 32],
        min_output: u64,
        swap_amount: u64,
        output_amount: u64,
        swap_a_to_b: bool,
        num_commitments: u8,
    ) -> Result<()> {
        swap::create_pending_with_proof_swap(ctx, operation_id, proof, merkle_root, input_commitment, nullifier, out_commitment, change_commitment, min_output, swap_amount, output_amount, swap_a_to_b, num_commitments)
    }

    /// Execute Swap Phase 3 - Update AMM state (Append Pattern)
    ///
    /// Must be called after verify_commitment_exists and create_nullifier_and_pending.
    /// Updates AMM pool reserves based on verified swap.
    pub fn execute_swap<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteSwap<'info>>,
        operation_id: [u8; 32],
    ) -> Result<()> {
        swap::execute_swap(ctx, operation_id)
    }

    /// Create Pending with Proof Phase 0 - Remove Liquidity (Append Pattern)
    ///
    /// Flow:
    /// Phase 0 (this): Verify ZK proof + Create PendingOperation
    /// Phase 1: verify_commitment_exists for LP input
    /// Phase 2: create_nullifier_and_pending for LP input
    /// Phase 3: execute_remove_liquidity to update AMM state
    /// Phase 4+: create_commitment for token outputs
    /// Final: close_pending_operation
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_remove_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofRemoveLiquidity<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        lp_input_commitment: [u8; 32],
        lp_nullifier: [u8; 32],
        out_a_commitment: [u8; 32],
        out_b_commitment: [u8; 32],
        old_state_hash: [u8; 32],
        new_state_hash: [u8; 32],
        lp_amount_burned: u64,
        withdraw_a_amount: u64,
        withdraw_b_amount: u64,
        num_commitments: u8,
    ) -> Result<()> {
        swap::create_pending_with_proof_remove_liquidity(ctx, operation_id, proof, lp_input_commitment, lp_nullifier, out_a_commitment, out_b_commitment, old_state_hash, new_state_hash, lp_amount_burned, withdraw_a_amount, withdraw_b_amount, num_commitments)
    }

    /// Execute Remove Liquidity Phase 3 - Update AMM state (Append Pattern)
    ///
    /// Must be called after verify_commitment_exists and create_nullifier_and_pending.
    /// Updates AMM pool reserves and LP supply based on verified liquidity removal.
    pub fn execute_remove_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteRemoveLiquidity<'info>>,
        operation_id: [u8; 32],
        new_state_hash: [u8; 32],
    ) -> Result<()> {
        swap::execute_remove_liquidity(ctx, operation_id, new_state_hash)
    }

    /// Create Pending with Proof Phase 0 - Add Liquidity (Append Pattern)
    ///
    /// Flow:
    /// Phase 0 (this): Verify ZK proof + Create PendingOperation
    /// Phase 1a: verify_commitment_exists(index=0) for deposit A
    /// Phase 1b: verify_commitment_exists(index=1) for deposit B
    /// Phase 2a: create_nullifier_and_pending(index=0) for deposit A
    /// Phase 2b: create_nullifier_and_pending(index=1) for deposit B
    /// Phase 3: execute_add_liquidity to update AMM state
    /// Phase 4+: create_commitment for LP token and change outputs
    /// Final: close_pending_operation
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_add_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofAddLiquidity<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        input_commitment_a: [u8; 32],
        input_commitment_b: [u8; 32],
        nullifier_a: [u8; 32],
        nullifier_b: [u8; 32],
        lp_commitment: [u8; 32],
        change_a_commitment: [u8; 32],
        change_b_commitment: [u8; 32],
        deposit_a: u64,
        deposit_b: u64,
        lp_amount: u64,
        min_lp_amount: u64,
        num_commitments: u8,
    ) -> Result<()> {
        swap::create_pending_with_proof_add_liquidity(ctx, operation_id, proof, input_commitment_a, input_commitment_b, nullifier_a, nullifier_b, lp_commitment, change_a_commitment, change_b_commitment, deposit_a, deposit_b, lp_amount, min_lp_amount, num_commitments)
    }

    /// Execute Add Liquidity Phase 3 - Update AMM state (Append Pattern)
    ///
    /// Must be called after verify_commitment_exists and create_nullifier_and_pending for both deposits.
    /// Updates AMM pool reserves and LP supply based on verified liquidity addition.
    pub fn execute_add_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteAddLiquidity<'info>>,
        operation_id: [u8; 32],
        min_lp_amount: u64,
    ) -> Result<()> {
        swap::execute_add_liquidity(ctx, operation_id, min_lp_amount)
    }

    // ============ Generic Light Protocol Operations ============

    /// Verify Commitment Exists Phase 1 - verify commitment in Light Protocol state tree (GENERIC)
    ///
    /// SECURITY CRITICAL: This prevents spending non-existent commitments.
    /// Works for ALL spend operations: transfer, swap, remove liquidity, market operations.
    ///
    /// This phase uses Light Protocol CPI with inclusion proof (~8 Light accounts).
    /// NO state changes - if fails, no cleanup needed.
    ///
    /// For multi-input operations (add_liquidity), call this instruction multiple times:
    /// - First call with commitment_index=0 for input A
    /// - Second call with commitment_index=1 for input B
    pub fn verify_commitment_exists<'info>(
        ctx: Context<'_, '_, '_, 'info, VerifyCommitmentExists<'info>>,
        operation_id: [u8; 32],
        commitment_index: u8,
        light_params: generic::LightVerifyCommitmentParams,
    ) -> Result<()> {
        generic::verify_commitment_exists(ctx, operation_id, commitment_index, light_params)
    }

    /// Create Nullifier and Pending Operation Phase 2 (GENERIC)
    ///
    /// CRITICAL POINT: After this, nullifier exists and outputs MUST be created.
    /// Works for ALL operations: transfer, swap, add/remove liquidity, market.
    ///
    /// Phase 2: Create nullifier from pending operation (APPEND PATTERN)
    ///
    /// SECURITY: Reads nullifier from PendingOperation (created in Phase 0).
    /// This prevents nullifier swap attacks - attacker cannot substitute a different nullifier.
    ///
    /// For multi-input operations (add_liquidity), call this instruction multiple times:
    /// - First call with nullifier_index=0 for input A
    /// - Second call with nullifier_index=1 for input B
    pub fn create_nullifier_and_pending<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateNullifierAndPending<'info>>,
        operation_id: [u8; 32],
        nullifier_index: u8,
        light_params: generic::LightCreateNullifierAndPendingParams,
    ) -> Result<()> {
        generic::create_nullifier_and_pending(ctx, operation_id, nullifier_index, light_params)
    }

    /// Close pending operation after all nullifiers and commitments created or expired
    pub fn close_pending_operation(
        ctx: Context<ClosePendingOperation>,
        operation_id: [u8; 32],
    ) -> Result<()> {
        generic::close_pending_operation(ctx, operation_id)
    }

    // ============ Generic Light Protocol Operations ============

    /// Create a nullifier for a pending operation
    ///
    /// This is a generic instruction that can be used by any multi-phase operation
    /// to create nullifiers one at a time. Each call creates ONE nullifier to stay
    /// within transaction size limits.
    ///
    /// Must be called after the operation's Phase 1 (e.g., add_liquidity) and before
    /// any commitments can be created.
    pub fn create_nullifier<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateNullifier<'info>>,
        operation_id: [u8; 32],
        nullifier_index: u8,
        light_params: generic::LightCreateNullifierParams,
    ) -> Result<()> {
        generic::create_nullifier(ctx, operation_id, nullifier_index, light_params)
    }

    /// Create a commitment for a pending operation
    ///
    /// This is a generic instruction that can be used by any multi-phase operation
    /// to create commitments one at a time. Each call creates ONE commitment to stay
    /// within transaction size limits.
    ///
    /// IMPORTANT: All nullifiers must be created before any commitments.
    pub fn create_commitment<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateCommitment<'info>>,
        operation_id: [u8; 32],
        commitment_index: u8,
        stealth_ephemeral_pubkey: [u8; 64],
        encrypted_note: Vec<u8>,
        light_params: generic::LightCreateCommitmentParams,
    ) -> Result<()> {
        generic::create_commitment(ctx, operation_id, commitment_index, stealth_ephemeral_pubkey, encrypted_note, light_params)
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
        admin::test_verify_groth16_proof(ctx, proof, public_inputs)
    }

    /// Reset AMM pool state (admin only)
    /// Used to fix corrupted pool state
    pub fn reset_amm_pool(ctx: Context<ResetAmmPool>) -> Result<()> {
        admin::reset_amm_pool(ctx)
    }
}
