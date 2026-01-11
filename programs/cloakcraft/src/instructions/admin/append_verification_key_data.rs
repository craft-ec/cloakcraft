//! Append verification key data to an existing account
//!
//! Used to upload VK data in chunks when it exceeds transaction size limits.

use anchor_lang::prelude::*;

use crate::state::VerificationKey;
use crate::constants::seeds;

#[derive(Accounts)]
#[instruction(circuit_id: [u8; 32])]
pub struct AppendVerificationKeyData<'info> {
    /// Verification key account (must already be initialized)
    #[account(
        mut,
        seeds = [seeds::VERIFICATION_KEY, circuit_id.as_ref()],
        bump = verification_key.bump,
        has_one = authority,
    )]
    pub verification_key: Account<'info, VerificationKey>,

    /// Authority
    pub authority: Signer<'info>,
}

pub fn append_verification_key_data(
    ctx: Context<AppendVerificationKeyData>,
    _circuit_id: [u8; 32],
    data_chunk: Vec<u8>,
) -> Result<()> {
    let vk = &mut ctx.accounts.verification_key;
    vk.vk_data.extend(data_chunk);
    Ok(())
}
