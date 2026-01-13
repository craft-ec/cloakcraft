//! Register a verification key for a circuit

use anchor_lang::prelude::*;

use crate::state::VerificationKey;
use crate::constants::seeds;

#[derive(Accounts)]
#[instruction(circuit_id: [u8; 32])]
pub struct RegisterVerificationKey<'info> {
    /// Verification key account
    #[account(
        init,
        payer = payer,
        space = VerificationKey::space(crate::state::MAX_VK_DATA_SIZE),
        seeds = [seeds::VERIFICATION_KEY, circuit_id.as_ref()],
        bump
    )]
    pub verification_key: Account<'info, VerificationKey>,

    /// Authority
    pub authority: Signer<'info>,

    /// Payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// System program
    pub system_program: Program<'info, System>,
}

pub fn register_verification_key(
    ctx: Context<RegisterVerificationKey>,
    circuit_id: [u8; 32],
    vk_data: Vec<u8>,
) -> Result<()> {
    let vk = &mut ctx.accounts.verification_key;
    let clock = Clock::get()?;

    vk.circuit_id = circuit_id;
    vk.vk_data = vk_data;
    vk.authority = ctx.accounts.authority.key();
    vk.is_active = true;
    vk.bump = ctx.bumps.verification_key;
    Ok(())
}
