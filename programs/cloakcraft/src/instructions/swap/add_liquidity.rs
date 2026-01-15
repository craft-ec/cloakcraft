//! Add liquidity to internal AMM pool (Multi-Phase)
//!
//! Phase 1 (add_liquidity): Verify proof + Store pending operation
//! Phase 2 (create_nullifier): Create each nullifier via generic instruction
//! Phase 3 (create_commitment): Create each commitment via generic instruction
//! Phase 4 (close_pending_operation): Close pending operation, reclaim rent
//!
//! Uses generic Light Protocol instructions for nullifier and commitment storage.
//! This allows each Light Protocol operation to fit in a single transaction.

use anchor_lang::prelude::*;

use crate::state::{
    Pool, AmmPool, VerificationKey, PoolCommitmentCounter,
    LightValidityProof, LightAddressTreeInfo, PendingOperation,
    PENDING_OPERATION_EXPIRY_SECONDS,
};
use crate::constants::seeds;
use crate::errors::CloakCraftError;
use crate::helpers::verify_groth16_proof;
use crate::light_cpi::vec_to_fixed_note;

// =============================================================================
// Phase 1: Verify Proof + Store Pending Operation (NO Light Protocol calls)
// =============================================================================

/// Parameters for add liquidity Phase 1 (no Light Protocol params needed)
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct LightAddLiquidityParams {
    /// Output state tree index (stored for Phase 2/3)
    pub output_tree_index: u8,
}

#[derive(Accounts)]
#[instruction(
    operation_id: [u8; 32],
    _proof: Vec<u8>,
    _nullifier_a: [u8; 32],
    _nullifier_b: [u8; 32]
)]
pub struct AddLiquidity<'info> {
    /// Token A pool
    #[account(
        seeds = [seeds::POOL, pool_a.token_mint.as_ref()],
        bump = pool_a.bump,
    )]
    pub pool_a: Box<Account<'info, Pool>>,

    /// Token B pool
    #[account(
        seeds = [seeds::POOL, pool_b.token_mint.as_ref()],
        bump = pool_b.bump,
    )]
    pub pool_b: Box<Account<'info, Pool>>,

    /// LP token pool (for LP commitment)
    #[account(
        seeds = [seeds::POOL, lp_pool.token_mint.as_ref()],
        bump = lp_pool.bump,
    )]
    pub lp_pool: Box<Account<'info, Pool>>,

    /// AMM pool state
    #[account(
        mut,
        seeds = [seeds::AMM_POOL, amm_pool.token_a_mint.as_ref(), amm_pool.token_b_mint.as_ref()],
        bump = amm_pool.bump,
    )]
    pub amm_pool: Box<Account<'info, AmmPool>>,

    /// Verification key
    #[account(
        seeds = [seeds::VERIFICATION_KEY, verification_key.circuit_id.as_ref()],
        bump = verification_key.bump,
    )]
    pub verification_key: Box<Account<'info, VerificationKey>>,

    /// Pending operation PDA (created in this instruction)
    #[account(
        init,
        payer = relayer,
        space = PendingOperation::SPACE,
        seeds = [PendingOperation::SEEDS_PREFIX, operation_id.as_ref()],
        bump,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,

    /// Relayer (pays for accounts)
    #[account(mut)]
    pub relayer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Operation type constant for add_liquidity
pub const OP_TYPE_ADD_LIQUIDITY: u8 = 2;

/// Phase 1: Verify proof + Update AMM state + Store pending operation
///
/// This instruction verifies the ZK proof, updates AMM reserves, and stores data for subsequent phases.
/// NO Light Protocol calls are made here to stay within transaction size limits.
///
/// After this, call:
/// 1. create_nullifier (index 0) for nullifier A
/// 2. create_nullifier (index 1) for nullifier B
/// 3. create_commitment (index 0) for LP commitment
/// 4. create_commitment (index 1) for change A commitment
/// 5. create_commitment (index 2) for change B commitment
/// 6. close_pending_operation to reclaim rent
#[allow(clippy::too_many_arguments)]
pub fn add_liquidity<'info>(
    ctx: Context<'_, '_, '_, 'info, AddLiquidity<'info>>,
    operation_id: [u8; 32],
    proof: Vec<u8>,
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
    _light_params: LightAddLiquidityParams,
) -> Result<()> {
    let pool_a = &ctx.accounts.pool_a;
    let pool_b = &ctx.accounts.pool_b;
    let lp_pool = &ctx.accounts.lp_pool;
    let amm_pool = &mut ctx.accounts.amm_pool;
    let pending_op = &mut ctx.accounts.pending_operation;
    let clock = Clock::get()?;

    // 1. Verify ZK proof (Circom circuit has 6 public inputs)
    let public_inputs = build_add_liquidity_inputs(
        &nullifier_a,
        &nullifier_b,
        &amm_pool.pool_id,
        &lp_commitment,
        &change_a_commitment,
        &change_b_commitment,
    );

    verify_groth16_proof(
        &proof,
        &ctx.accounts.verification_key.vk_data,
        &public_inputs,
        "AddLiquidity",
    )?;

    // 2. CRITICAL SECURITY CHECK: Validate LP amount calculation
    // This prevents attackers from minting arbitrary LP tokens
    let calculated_lp = if amm_pool.lp_supply == 0 {
        // Initial liquidity: LP = sqrt(depositA * depositB)
        integer_sqrt((deposit_a as u128).checked_mul(deposit_b as u128)
            .ok_or(CloakCraftError::AmountOverflow)?) as u64
    } else {
        // Subsequent deposits: LP = min(depositA * lpSupply / reserveA, depositB * lpSupply / reserveB)
        let lp_from_a = ((deposit_a as u128)
            .checked_mul(amm_pool.lp_supply as u128)
            .ok_or(CloakCraftError::AmountOverflow)?
            .checked_div(amm_pool.reserve_a as u128)
            .ok_or(CloakCraftError::InsufficientLiquidity)?) as u64;

        let lp_from_b = ((deposit_b as u128)
            .checked_mul(amm_pool.lp_supply as u128)
            .ok_or(CloakCraftError::AmountOverflow)?
            .checked_div(amm_pool.reserve_b as u128)
            .ok_or(CloakCraftError::InsufficientLiquidity)?) as u64;

        lp_from_a.min(lp_from_b)
    };

    // CRITICAL: Require exact match to prevent LP token inflation attacks
    require!(
        lp_amount == calculated_lp,
        CloakCraftError::InvalidLpAmount
    );

    msg!("LP amount validated: provided={}, calculated={}", lp_amount, calculated_lp);

    // SLIPPAGE PROTECTION: Ensure user gets at least min_lp_amount (front-running protection)
    require!(
        lp_amount >= min_lp_amount,
        CloakCraftError::SlippageExceeded
    );

    msg!("Slippage check passed: lp_amount={}, min_lp_amount={}", lp_amount, min_lp_amount);

    // 3. Update AMM pool state
    amm_pool.reserve_a = amm_pool.reserve_a.checked_add(deposit_a).ok_or(CloakCraftError::AmountOverflow)?;
    amm_pool.reserve_b = amm_pool.reserve_b.checked_add(deposit_b).ok_or(CloakCraftError::AmountOverflow)?;
    amm_pool.lp_supply = amm_pool.lp_supply.checked_add(lp_amount).ok_or(CloakCraftError::AmountOverflow)?;
    amm_pool.state_hash = amm_pool.compute_state_hash();

    msg!("Updated AMM state: reserve_a={}, reserve_b={}, lp_supply={}",
         amm_pool.reserve_a, amm_pool.reserve_b, amm_pool.lp_supply);

    // 4. Initialize pending operation PDA
    pending_op.bump = ctx.bumps.pending_operation;
    pending_op.operation_id = operation_id;
    pending_op.relayer = ctx.accounts.relayer.key();
    pending_op.operation_type = OP_TYPE_ADD_LIQUIDITY;
    pending_op.created_at = clock.unix_timestamp;
    pending_op.expires_at = clock.unix_timestamp + PENDING_OPERATION_EXPIRY_SECONDS;

    // 5. Store nullifier data for Phase 2 (create_nullifier calls)
    pending_op.num_nullifiers = 2;
    pending_op.nullifier_pools[0] = pool_a.key().to_bytes();
    pending_op.nullifier_pools[1] = pool_b.key().to_bytes();
    pending_op.nullifiers[0] = nullifier_a;
    pending_op.nullifiers[1] = nullifier_b;
    pending_op.nullifier_completed_mask = 0;

    // 6. Store commitment data for Phase 3 (create_commitment calls)
    pending_op.num_commitments = num_commitments;
    // Index 0: LP commitment (goes to LP pool)
    pending_op.pools[0] = lp_pool.key().to_bytes();
    pending_op.commitments[0] = lp_commitment;
    // Index 1: Change A commitment (goes to pool A)
    pending_op.pools[1] = pool_a.key().to_bytes();
    pending_op.commitments[1] = change_a_commitment;
    // Index 2: Change B commitment (goes to pool B)
    pending_op.pools[2] = pool_b.key().to_bytes();
    pending_op.commitments[2] = change_b_commitment;
    pending_op.completed_mask = 0;

    Ok(())
}

/// Integer square root using Newton's method (Babylonian method)
/// Returns floor(sqrt(n))
fn integer_sqrt(n: u128) -> u128 {
    if n == 0 {
        return 0;
    }
    if n <= 3 {
        return 1;
    }

    // Initial guess: use bit length / 2
    let mut x = n;
    let mut y = (x + 1) / 2;

    // Newton iteration: y = (x + n/x) / 2
    while y < x {
        x = y;
        y = (x + n / x) / 2;
    }

    x
}

/// Reduce a PublicKey to a field element by zeroing the top byte
/// This ensures the value is always less than the BN254 field modulus
fn pubkey_to_field_element(pubkey: &Pubkey) -> [u8; 32] {
    let mut bytes = pubkey.to_bytes();
    // Zero the most significant byte to ensure value < field modulus
    bytes[0] = 0;
    bytes
}

fn build_add_liquidity_inputs(
    nullifier_a: &[u8; 32],
    nullifier_b: &[u8; 32],
    pool_id: &Pubkey,
    lp_commitment: &[u8; 32],
    change_a_commitment: &[u8; 32],
    change_b_commitment: &[u8; 32],
) -> Vec<[u8; 32]> {
    vec![
        *nullifier_a,
        *nullifier_b,
        pubkey_to_field_element(pool_id),
        *lp_commitment,
        *change_a_commitment,
        *change_b_commitment,
    ]
}

// =============================================================================
// Phase 2/3/4 are now handled by generic instructions:
// - create_nullifier (from generic module) for each nullifier
// - create_commitment (from generic module) for each commitment
// - close_pending_operation (from generic module) to reclaim rent
// =============================================================================
