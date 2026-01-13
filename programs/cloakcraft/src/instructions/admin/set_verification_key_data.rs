//! Set verification key data on an existing account
//!
//! Used for VKs that exceed transaction size limits when combined with account initialization.
//! Supports reallocation when VK size increases.

use anchor_lang::prelude::*;

use crate::state::{VerificationKey, MAX_VK_DATA_SIZE};
use crate::constants::seeds;

#[derive(Accounts)]
#[instruction(circuit_id: [u8; 32])]
pub struct SetVerificationKeyData<'info> {
    /// Verification key account (must already be initialized)
    /// Realloc to max size to support larger VK updates
    #[account(
        mut,
        seeds = [seeds::VERIFICATION_KEY, circuit_id.as_ref()],
        bump = verification_key.bump,
        has_one = authority,
        realloc = VerificationKey::space(MAX_VK_DATA_SIZE),
        realloc::payer = payer,
        realloc::zero = false,
    )]
    pub verification_key: Account<'info, VerificationKey>,

    /// Authority
    pub authority: Signer<'info>,

    /// Payer for reallocation
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program for reallocation
    pub system_program: Program<'info, System>,
}

pub fn set_verification_key_data(
    ctx: Context<SetVerificationKeyData>,
    _circuit_id: [u8; 32],
    vk_data: Vec<u8>,
) -> Result<()> {
    let vk = &mut ctx.accounts.verification_key;
    vk.vk_data = vk_data;
    Ok(())
}
