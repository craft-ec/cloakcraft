//! Internal AMM pool state
//!
//! Private liquidity pools with constant product formula (x * y = k).

use anchor_lang::prelude::*;

/// AMM pool for a token pair
#[account]
#[derive(Default, InitSpace)]
pub struct AmmPool {
    /// Pool ID (PDA seed)
    pub pool_id: Pubkey,

    /// Token A mint
    pub token_a_mint: Pubkey,

    /// Token B mint
    pub token_b_mint: Pubkey,

    /// LP token mint (created by pool)
    pub lp_mint: Pubkey,

    /// Current state hash (hash of reserves + lp_supply)
    /// Used for ZK proof verification of state transitions
    pub state_hash: [u8; 32],

    /// Reserve A (committed, updated via ZK proofs)
    pub reserve_a: u64,

    /// Reserve B (committed, updated via ZK proofs)
    pub reserve_b: u64,

    /// Total LP token supply
    pub lp_supply: u64,

    /// Fee in basis points (e.g., 30 = 0.3%)
    pub fee_bps: u16,

    /// Pool authority
    pub authority: Pubkey,

    /// Is pool active
    pub is_active: bool,

    /// PDA bump
    pub bump: u8,

    /// LP mint bump
    pub lp_mint_bump: u8,
}

impl AmmPool {
    /// Account space
    pub const LEN: usize = 8  // discriminator
        + 32  // pool_id
        + 32  // token_a_mint
        + 32  // token_b_mint
        + 32  // lp_mint
        + 32  // state_hash
        + 8   // reserve_a
        + 8   // reserve_b
        + 8   // lp_supply
        + 2   // fee_bps
        + 32  // authority
        + 1   // is_active
        + 1   // bump
        + 1;  // lp_mint_bump

    /// Compute state hash from reserves
    pub fn compute_state_hash(&self) -> [u8; 32] {
        let mut data = Vec::with_capacity(32);
        data.extend_from_slice(&self.reserve_a.to_le_bytes());
        data.extend_from_slice(&self.reserve_b.to_le_bytes());
        data.extend_from_slice(&self.lp_supply.to_le_bytes());
        data.extend_from_slice(self.pool_id.as_ref());
        solana_keccak_hasher::hash(&data).to_bytes()
    }

    /// Verify state hash matches current reserves
    pub fn verify_state_hash(&self, expected: &[u8; 32]) -> bool {
        &self.compute_state_hash() == expected
    }
}
