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
pub mod pyth;

use instructions::*;

// Import perps Accounts structs directly to avoid Anchor namespace issues
use instructions::perps::{
    // Admin
    InitializePerpsPool, InitializePerpsPoolParams,
    AddTokenToPool, AddMarket,
    UpdatePoolConfig, UpdatePoolConfigParams,
    UpdateTokenStatus, UpdateMarketStatus,
    // Position
    CreatePendingWithProofOpenPosition, ExecuteOpenPosition,
    CreatePendingWithProofClosePosition, ExecuteClosePosition,
    // Liquidity
    CreatePendingWithProofAddPerpsLiquidity, ExecuteAddPerpsLiquidity,
    CreatePendingWithProofRemovePerpsLiquidity, ExecuteRemovePerpsLiquidity,
    // Keeper
    UpdateBorrowFees,
    CreatePendingWithProofLiquidate, ExecuteLiquidate,
    CheckProfitBound, EmitProfitBoundEvent,
};

declare_id!("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");

/// Light Protocol CPI signer for compressed account operations
pub const LIGHT_CPI_SIGNER: CpiSigner =
    derive_light_cpi_signer!("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");

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
    /// Fee amount is a public input verified in the ZK proof.
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
        transfer_amount: u64,
        unshield_amount: u64,
        fee_amount: u64,
    ) -> Result<()> {
        pool::create_pending_with_proof(ctx, operation_id, proof, merkle_root, input_commitment, nullifier, out_commitments, output_recipients, output_amounts, output_randomness, stealth_ephemeral_pubkeys, transfer_amount, unshield_amount, fee_amount)
    }

    /// Create Pending with Proof Phase 0 - Consolidation (Append Pattern)
    ///
    /// Consolidates up to 3 notes into 1 using the consolidate_3x1 circuit.
    /// This is a FREE operation (no protocol fee) - just reorganizing user's own notes.
    ///
    /// Flow:
    /// Phase 0 (this): Verify ZK consolidation proof + Create PendingOperation
    /// Phase 1: verify_commitment_exists for each input (1-3 times)
    /// Phase 2: create_nullifier_and_pending for each input (1-3 times)
    /// Phase 3: (skipped - no unshield for consolidation)
    /// Phase 4: create_commitment for single output
    /// Final: close_pending_operation
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_consolidation<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofConsolidation<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        num_inputs: u8,
        input_commitments: Vec<[u8; 32]>,
        nullifiers: Vec<[u8; 32]>,
        out_commitment: [u8; 32],
        output_recipient: [u8; 32],
        output_amount: u64,
        output_randomness: [u8; 32],
        stealth_ephemeral_pubkey: [u8; 64],
    ) -> Result<()> {
        pool::create_pending_with_proof_consolidation(ctx, operation_id, proof, merkle_root, num_inputs, input_commitments, nullifiers, out_commitment, output_recipient, output_amount, output_randomness, stealth_ephemeral_pubkey)
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
    ///
    /// Supports two pool types:
    /// - ConstantProduct (pool_type=0): x * y = k formula, best for volatile pairs
    /// - StableSwap (pool_type=1): Curve-style formula, best for pegged assets
    ///
    /// For StableSwap pools, amplification should be 100-1000 (typical: 200 for stablecoins).
    /// For ConstantProduct pools, amplification is ignored (can pass 0).
    pub fn initialize_amm_pool(
        ctx: Context<InitializeAmmPool>,
        token_a_mint: Pubkey,
        token_b_mint: Pubkey,
        fee_bps: u16,
        pool_type: state::PoolType,
        amplification: u64,
    ) -> Result<()> {
        swap::initialize_amm_pool(ctx, token_a_mint, token_b_mint, fee_bps, pool_type, amplification)
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

    // ============ Protocol Fee Configuration ============

    /// Initialize protocol configuration with fee rates
    ///
    /// Creates the global ProtocolConfig account. Can only be called once.
    /// Fee rates are in basis points. swap_fee_share_bps is protocol's share of LP fees (2000 = 20%).
    pub fn initialize_protocol_config(
        ctx: Context<InitializeProtocolConfig>,
        transfer_fee_bps: u16,
        unshield_fee_bps: u16,
        swap_fee_share_bps: u16,
        remove_liquidity_fee_bps: u16,
        fees_enabled: bool,
    ) -> Result<()> {
        admin::initialize_protocol_config(
            ctx,
            transfer_fee_bps,
            unshield_fee_bps,
            swap_fee_share_bps,
            remove_liquidity_fee_bps,
            fees_enabled,
        )
    }

    /// Update protocol fee rates
    ///
    /// Only callable by the protocol authority. Allows updating individual
    /// fee rates or toggling fees on/off.
    pub fn update_protocol_fees(
        ctx: Context<UpdateProtocolFees>,
        transfer_fee_bps: Option<u16>,
        unshield_fee_bps: Option<u16>,
        swap_fee_share_bps: Option<u16>,
        remove_liquidity_fee_bps: Option<u16>,
        fees_enabled: Option<bool>,
    ) -> Result<()> {
        admin::update_protocol_fees(
            ctx,
            transfer_fee_bps,
            unshield_fee_bps,
            swap_fee_share_bps,
            remove_liquidity_fee_bps,
            fees_enabled,
        )
    }

    /// Update protocol treasury address
    ///
    /// Only callable by the protocol authority. Changes where fees are sent.
    pub fn update_treasury(ctx: Context<UpdateTreasury>) -> Result<()> {
        admin::update_treasury(ctx)
    }

    /// Transfer protocol authority to a new account
    ///
    /// Only callable by the current authority.
    pub fn update_protocol_authority(ctx: Context<UpdateProtocolAuthority>) -> Result<()> {
        admin::update_protocol_authority(ctx)
    }

    // ============ Perpetual Futures Operations ============

    /// Initialize a perpetual futures pool
    ///
    /// Creates a multi-token pool with a single LP token.
    /// Tokens are added separately via add_token_to_pool.
    pub fn initialize_perps_pool(
        ctx: Context<InitializePerpsPool>,
        pool_id: Pubkey,
        params: InitializePerpsPoolParams,
    ) -> Result<()> {
        perps::initialize_perps_pool(ctx, pool_id, params)
    }

    /// Add a token to a perps pool
    ///
    /// Adds a new supported token with its own vault and Pyth price feed.
    pub fn add_token_to_pool(ctx: Context<AddTokenToPool>, pyth_feed_id: [u8; 32]) -> Result<()> {
        perps::add_token_to_pool(ctx, pyth_feed_id)
    }

    /// Add a trading market to a perps pool
    ///
    /// Creates a new trading pair (e.g., SOL/USD).
    pub fn add_market(
        ctx: Context<AddMarket>,
        market_id: [u8; 32],
        base_token_index: u8,
        quote_token_index: u8,
        max_position_size: u64,
    ) -> Result<()> {
        perps::add_market(ctx, market_id, base_token_index, quote_token_index, max_position_size)
    }

    /// Update perps pool configuration
    pub fn update_perps_pool_config(
        ctx: Context<UpdatePoolConfig>,
        params: UpdatePoolConfigParams,
    ) -> Result<()> {
        perps::update_pool_config(ctx, params)
    }

    /// Update token status in perps pool
    pub fn update_perps_token_status(
        ctx: Context<UpdateTokenStatus>,
        token_index: u8,
        is_active: bool,
    ) -> Result<()> {
        perps::update_token_status(ctx, token_index, is_active)
    }

    /// Update market status
    pub fn update_perps_market_status(
        ctx: Context<UpdateMarketStatus>,
        is_active: bool,
    ) -> Result<()> {
        perps::update_market_status(ctx, is_active)
    }

    // ============ Perps Position Operations (Append Pattern) ============

    /// Create Pending with Proof Phase 0 - Open Position
    ///
    /// Flow:
    /// Phase 0 (this): Verify ZK proof + Create PendingOperation
    /// Phase 1: verify_commitment_exists for margin
    /// Phase 2: create_nullifier_and_pending for margin
    /// Phase 3: execute_open_position to lock tokens
    /// Phase 4: create_commitment for position
    /// Final: close_pending_operation
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_open_position<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofOpenPosition<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        input_commitment: [u8; 32],
        nullifier: [u8; 32],
        position_commitment: [u8; 32],
        change_commitment: [u8; 32],
        is_long: bool,
        margin_amount: u64,
        leverage: u8,
        position_fee: u64,
        change_amount: u64,
    ) -> Result<()> {
        perps::create_pending_with_proof_open_position(
            ctx, operation_id, proof, merkle_root, input_commitment, nullifier,
            position_commitment, change_commitment, is_long, margin_amount, leverage, position_fee, change_amount
        )
    }

    /// Execute Open Position Phase 3
    pub fn execute_open_position<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteOpenPosition<'info>>,
        operation_id: [u8; 32],
        entry_price: u64,
    ) -> Result<()> {
        perps::execute_open_position(ctx, operation_id, entry_price)
    }

    /// Create Pending with Proof Phase 0 - Close Position
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_close_position<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofClosePosition<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        position_commitment: [u8; 32],
        position_nullifier: [u8; 32],
        settlement_commitment: [u8; 32],
        is_long: bool,
        exit_price: u64,
        close_fee: u64,
        pnl_amount: u64,
        is_profit: bool,
    ) -> Result<()> {
        perps::create_pending_with_proof_close_position(
            ctx, operation_id, proof, merkle_root, position_commitment, position_nullifier,
            settlement_commitment, is_long, exit_price, close_fee, pnl_amount, is_profit
        )
    }

    /// Execute Close Position Phase 3
    pub fn execute_close_position<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteClosePosition<'info>>,
        operation_id: [u8; 32],
        position_margin: u64,
        position_size: u64,
        entry_price: u64,
    ) -> Result<()> {
        perps::execute_close_position(ctx, operation_id, position_margin, position_size, entry_price)
    }

    // ============ Perps Liquidity Operations (Append Pattern) ============

    /// Create Pending with Proof Phase 0 - Add Perps Liquidity
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_add_perps_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofAddPerpsLiquidity<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        input_commitment: [u8; 32],
        nullifier: [u8; 32],
        lp_commitment: [u8; 32],
        token_index: u8,
        deposit_amount: u64,
        lp_amount_minted: u64,
        fee_amount: u64,
    ) -> Result<()> {
        perps::create_pending_with_proof_add_perps_liquidity(
            ctx, operation_id, proof, merkle_root, input_commitment, nullifier,
            lp_commitment, token_index, deposit_amount, lp_amount_minted, fee_amount
        )
    }

    /// Execute Add Perps Liquidity Phase 3
    pub fn execute_add_perps_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteAddPerpsLiquidity<'info>>,
        operation_id: [u8; 32],
        oracle_prices: [u64; state::MAX_PERPS_TOKENS],
    ) -> Result<()> {
        perps::execute_add_perps_liquidity(ctx, operation_id, oracle_prices)
    }

    /// Create Pending with Proof Phase 0 - Remove Perps Liquidity
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_remove_perps_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofRemovePerpsLiquidity<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        lp_commitment: [u8; 32],
        lp_nullifier: [u8; 32],
        out_commitment: [u8; 32],
        change_lp_commitment: [u8; 32],
        token_index: u8,
        withdraw_amount: u64,
        lp_amount_burned: u64,
        fee_amount: u64,
    ) -> Result<()> {
        perps::create_pending_with_proof_remove_perps_liquidity(
            ctx, operation_id, proof, merkle_root, lp_commitment, lp_nullifier,
            out_commitment, change_lp_commitment, token_index, withdraw_amount, lp_amount_burned, fee_amount
        )
    }

    /// Execute Remove Perps Liquidity Phase 3
    pub fn execute_remove_perps_liquidity<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteRemovePerpsLiquidity<'info>>,
        operation_id: [u8; 32],
        oracle_prices: [u64; state::MAX_PERPS_TOKENS],
    ) -> Result<()> {
        perps::execute_remove_perps_liquidity(ctx, operation_id, oracle_prices)
    }

    // ============ Perps Keeper Operations ============

    /// Update borrow fee accumulators for all tokens
    ///
    /// Keeper instruction - anyone can call to update fees.
    pub fn update_perps_borrow_fees(ctx: Context<UpdateBorrowFees>) -> Result<()> {
        perps::update_borrow_fees(ctx)
    }

    /// Create Pending with Proof Phase 0 - Liquidate
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_liquidate<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofLiquidate<'info>>,
        operation_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        position_commitment: [u8; 32],
        position_nullifier: [u8; 32],
        owner_commitment: [u8; 32],
        liquidator_commitment: [u8; 32],
        current_price: u64,
        liquidator_reward: u64,
        owner_remainder: u64,
    ) -> Result<()> {
        perps::create_pending_with_proof_liquidate(
            ctx, operation_id, proof, merkle_root, position_commitment, position_nullifier,
            owner_commitment, liquidator_commitment, current_price, liquidator_reward, owner_remainder
        )
    }

    /// Execute Liquidate Phase 3
    pub fn execute_liquidate<'info>(
        ctx: Context<'_, '_, '_, 'info, ExecuteLiquidate<'info>>,
        operation_id: [u8; 32],
        position_margin: u64,
        position_size: u64,
        is_long: bool,
    ) -> Result<()> {
        perps::execute_liquidate(ctx, operation_id, position_margin, position_size, is_long)
    }

    /// Check if a position is at profit bound
    pub fn check_perps_profit_bound(
        ctx: Context<CheckProfitBound>,
        position_margin: u64,
        position_size: u64,
        entry_price: u64,
        is_long: bool,
        current_price: u64,
    ) -> Result<bool> {
        perps::check_profit_bound(ctx, position_margin, position_size, entry_price, is_long, current_price)
    }

    /// Emit profit bound event for keeper detection
    pub fn emit_perps_profit_bound_event(
        ctx: Context<EmitProfitBoundEvent>,
        position_commitment: [u8; 32],
        margin: u64,
        pnl: u64,
        current_price: u64,
    ) -> Result<()> {
        perps::emit_profit_bound_event(ctx, position_commitment, margin, pnl, current_price)
    }

    // ============ Voting Operations ============

    /// Create a voting ballot
    ///
    /// Initializes a new ballot with the specified configuration.
    /// Supports Snapshot (tokens liquid) and SpendToVote (tokens locked) modes.
    /// For SpendToVote mode, creates a token vault.
    pub fn create_ballot(
        ctx: Context<CreateBallot>,
        ballot_id: [u8; 32],
        config: state::BallotConfigInput,
    ) -> Result<()> {
        voting::create_ballot(ctx, ballot_id, config)
    }

    /// Resolve a voting ballot
    ///
    /// Determines the outcome based on the configured resolution mode:
    /// - TallyBased: Winner = argmax(option_weights[])
    /// - Oracle: Reads outcome from oracle
    /// - Authority: Designated resolver sets outcome
    pub fn resolve_ballot(
        ctx: Context<ResolveBallot>,
        ballot_id: [u8; 32],
        outcome: Option<u8>,
    ) -> Result<()> {
        voting::resolve_ballot(ctx, ballot_id, outcome)
    }

    /// Finalize a voting ballot
    ///
    /// Called after claim period expires (SpendToVote only).
    /// Transfers unclaimed tokens from vault to protocol treasury.
    pub fn finalize_ballot(
        ctx: Context<FinalizeBallot>,
        ballot_id: [u8; 32],
    ) -> Result<()> {
        voting::finalize_ballot(ctx, ballot_id)
    }

    /// Decrypt voting tally
    ///
    /// Called after timelock expires for TimeLocked and PermanentPrivate modes.
    /// Decrypts the homomorphic tally to reveal aggregate vote counts.
    /// For PermanentPrivate mode, this reveals ONLY aggregates, not individual votes.
    pub fn decrypt_tally(
        ctx: Context<DecryptTally>,
        ballot_id: [u8; 32],
        decryption_key: [u8; 32],
        decrypted_weights: Vec<u64>,
    ) -> Result<()> {
        voting::decrypt_tally(ctx, ballot_id, decryption_key, decrypted_weights)
    }

    // ============ Snapshot Voting (Multi-Phase) ============

    /// Create Pending with Proof - Vote Snapshot (Phase 0)
    ///
    /// Verifies ZK proof for snapshot voting and creates PendingOperation.
    /// User proves ownership of shielded note WITHOUT spending it.
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_vote_snapshot<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofVoteSnapshot<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        proof: Vec<u8>,
        snapshot_merkle_root: [u8; 32],
        note_commitment: [u8; 32],
        vote_nullifier: [u8; 32],
        vote_commitment: [u8; 32],
        vote_choice: u64,
        amount: u64,
        weight: u64,
        encrypted_contributions: Option<voting::EncryptedContributions>,
        encrypted_preimage: Option<Vec<u8>>,
        output_randomness: [u8; 32],
    ) -> Result<()> {
        voting::create_pending_with_proof_vote_snapshot(
            ctx, operation_id, ballot_id, proof, snapshot_merkle_root, note_commitment,
            vote_nullifier, vote_commitment, vote_choice, amount, weight,
            encrypted_contributions, encrypted_preimage, output_randomness
        )
    }

    /// Create Vote Nullifier (Phase 1)
    ///
    /// Creates the vote_nullifier via Light Protocol.
    /// Uses action_nullifier with ballot_id as aggregation_id.
    pub fn create_vote_nullifier<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateVoteNullifier<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        nullifier_index: u8,
        light_params: LightCreateVoteNullifierParams,
    ) -> Result<()> {
        voting::create_vote_nullifier(ctx, operation_id, ballot_id, nullifier_index, light_params)
    }

    /// Execute Vote Snapshot (Phase 2)
    ///
    /// Updates ballot tally based on the verified vote.
    pub fn execute_vote_snapshot(
        ctx: Context<ExecuteVoteSnapshot>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        encrypted_contributions: Option<voting::EncryptedContributions>,
    ) -> Result<()> {
        voting::execute_vote_snapshot(ctx, operation_id, ballot_id, encrypted_contributions)
    }

    /// Create Vote Commitment (Phase 3)
    ///
    /// Creates the vote_commitment via Light Protocol.
    /// Uses ballot_id for commitment address derivation.
    pub fn create_vote_commitment<'info>(
        ctx: Context<'_, '_, '_, 'info, CreateVoteCommitment<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        commitment_index: u8,
        encrypted_preimage: [u8; 128],
        encryption_type: u8,
        light_params: LightCreateVoteCommitmentParams,
    ) -> Result<()> {
        voting::create_vote_commitment(ctx, operation_id, ballot_id, commitment_index, encrypted_preimage, encryption_type, light_params)
    }

    /// Verify Vote Commitment Exists (Phase 1)
    ///
    /// Voting-specific commitment verification for operations that spend existing commitments.
    /// Uses Ballot account instead of Pool account.
    pub fn verify_vote_commitment_exists<'info>(
        ctx: Context<'_, '_, '_, 'info, VerifyVoteCommitmentExists<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        commitment_index: u8,
        light_params: voting::LightVerifyVoteCommitmentParams,
    ) -> Result<()> {
        voting::verify_vote_commitment_exists(ctx, operation_id, ballot_id, commitment_index, light_params)
    }

    /// Create Pending with Proof - Change Vote Snapshot (Phase 0)
    ///
    /// Atomic vote change: nullifies old vote_commitment and creates new one.
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_change_vote_snapshot<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofChangeVoteSnapshot<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        proof: Vec<u8>,
        old_vote_commitment: [u8; 32],
        old_vote_commitment_nullifier: [u8; 32],
        new_vote_commitment: [u8; 32],
        vote_nullifier: [u8; 32],
        old_vote_choice: u64,
        new_vote_choice: u64,
        weight: u64,
        old_encrypted_contributions: Option<voting::EncryptedContributions>,
        new_encrypted_contributions: Option<voting::EncryptedContributions>,
        output_randomness: [u8; 32],
    ) -> Result<()> {
        voting::create_pending_with_proof_change_vote_snapshot(
            ctx, operation_id, ballot_id, proof, old_vote_commitment,
            old_vote_commitment_nullifier, new_vote_commitment, vote_nullifier,
            old_vote_choice, new_vote_choice, weight,
            old_encrypted_contributions, new_encrypted_contributions, output_randomness
        )
    }

    /// Execute Change Vote Snapshot (Phase 3)
    ///
    /// Updates ballot tally for vote change: decrements old, increments new.
    pub fn execute_change_vote_snapshot(
        ctx: Context<ExecuteChangeVoteSnapshot>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        old_encrypted_contributions: Option<voting::EncryptedContributions>,
        new_encrypted_contributions: Option<voting::EncryptedContributions>,
    ) -> Result<()> {
        voting::execute_change_vote_snapshot(
            ctx, operation_id, ballot_id, old_encrypted_contributions, new_encrypted_contributions
        )
    }

    // ============ SpendToVote (Multi-Phase) ============

    /// Create Pending with Proof - Vote Spend (Phase 0)
    ///
    /// SpendToVote mode: Locks tokens in ballot vault.
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_vote_spend<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofVoteSpend<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        proof: Vec<u8>,
        merkle_root: [u8; 32],
        input_commitment: [u8; 32],
        spending_nullifier: [u8; 32],
        position_commitment: [u8; 32],
        vote_choice: u64,
        amount: u64,
        weight: u64,
        encrypted_contributions: Option<voting::EncryptedContributions>,
        encrypted_preimage: Option<Vec<u8>>,
        output_randomness: [u8; 32],
    ) -> Result<()> {
        voting::create_pending_with_proof_vote_spend(
            ctx, operation_id, ballot_id, proof, merkle_root, input_commitment,
            spending_nullifier, position_commitment, vote_choice, amount, weight,
            encrypted_contributions, encrypted_preimage, output_randomness
        )
    }

    /// Execute Vote Spend (Phase 3)
    ///
    /// Updates ballot tally and locks tokens.
    pub fn execute_vote_spend(
        ctx: Context<ExecuteVoteSpend>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        encrypted_contributions: Option<voting::EncryptedContributions>,
    ) -> Result<()> {
        voting::execute_vote_spend(ctx, operation_id, ballot_id, encrypted_contributions)
    }

    // ============ SpendToVote Vote Change (Multi-Phase) ============

    /// Create Pending with Proof - Change Vote Spend (Phase 0)
    ///
    /// SpendToVote mode: Atomic vote change (old position -> new position).
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_change_vote_spend<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofChangeVoteSpend<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        proof: Vec<u8>,
        old_position_commitment: [u8; 32],
        old_position_nullifier: [u8; 32],
        new_position_commitment: [u8; 32],
        old_vote_choice: u64,
        new_vote_choice: u64,
        amount: u64,
        weight: u64,
        old_encrypted_contributions: Option<voting::EncryptedContributions>,
        new_encrypted_contributions: Option<voting::EncryptedContributions>,
        output_randomness: [u8; 32],
    ) -> Result<()> {
        voting::create_pending_with_proof_change_vote_spend(
            ctx, operation_id, ballot_id, proof,
            old_position_commitment, old_position_nullifier, new_position_commitment,
            old_vote_choice, new_vote_choice, amount, weight,
            old_encrypted_contributions, new_encrypted_contributions, output_randomness
        )
    }

    /// Execute Change Vote Spend (Phase 3)
    ///
    /// Updates ballot tally for SpendToVote vote change: decrements old, increments new.
    pub fn execute_change_vote_spend(
        ctx: Context<ExecuteChangeVoteSpend>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        old_encrypted_contributions: Option<voting::EncryptedContributions>,
        new_encrypted_contributions: Option<voting::EncryptedContributions>,
    ) -> Result<()> {
        voting::execute_change_vote_spend(
            ctx, operation_id, ballot_id, old_encrypted_contributions, new_encrypted_contributions
        )
    }

    // ============ Close Position (Multi-Phase) ============

    /// Create Pending with Proof - Close Position (Phase 0)
    ///
    /// Allows closing position during voting to change vote or exit.
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_close_vote_position<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofCloseVotePosition<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        proof: Vec<u8>,
        position_commitment: [u8; 32],
        position_nullifier: [u8; 32],
        token_commitment: [u8; 32],
        vote_choice: u64,
        amount: u64,
        weight: u64,
        encrypted_contributions: Option<voting::EncryptedContributions>,
        output_randomness: [u8; 32],
    ) -> Result<()> {
        voting::create_pending_with_proof_close_vote_position(
            ctx, operation_id, ballot_id, proof, position_commitment, position_nullifier,
            token_commitment, vote_choice, amount, weight, encrypted_contributions, output_randomness
        )
    }

    /// Execute Close Vote Position (Phase 3)
    ///
    /// Decrements ballot tally and releases tokens.
    pub fn execute_close_vote_position(
        ctx: Context<ExecuteCloseVotePosition>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        encrypted_contributions: Option<voting::EncryptedContributions>,
    ) -> Result<()> {
        voting::execute_close_vote_position(ctx, operation_id, ballot_id, encrypted_contributions)
    }

    // ============ Claim (Multi-Phase, SpendToVote Only) ============

    /// Create Pending with Proof - Claim (Phase 0)
    ///
    /// Allows winners to claim their payout.
    #[allow(clippy::too_many_arguments)]
    pub fn create_pending_with_proof_claim<'info>(
        ctx: Context<'_, '_, '_, 'info, CreatePendingWithProofClaim<'info>>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
        proof: Vec<u8>,
        position_commitment: [u8; 32],
        position_nullifier: [u8; 32],
        payout_commitment: [u8; 32],
        user_vote_choice: u64,
        user_weight: u64,
        gross_payout: u64,
        net_payout: u64,
        output_randomness: [u8; 32],
    ) -> Result<()> {
        voting::create_pending_with_proof_claim(
            ctx, operation_id, ballot_id, proof, position_commitment, position_nullifier,
            payout_commitment, user_vote_choice, user_weight, gross_payout, net_payout,
            output_randomness
        )
    }

    /// Execute Claim (Phase 3)
    ///
    /// Transfers payout from ballot vault.
    pub fn execute_claim(
        ctx: Context<ExecuteClaim>,
        operation_id: [u8; 32],
        ballot_id: [u8; 32],
    ) -> Result<()> {
        voting::execute_claim(ctx, operation_id, ballot_id)
    }
}
