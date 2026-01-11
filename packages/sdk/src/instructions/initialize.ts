/**
 * Pool Initialization Instructions
 *
 * Initialize pool and commitment counter
 */

import {
  PublicKey,
  SystemProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program } from '@coral-xyz/anchor';

import {
  derivePoolPda,
  deriveVaultPda,
  deriveCommitmentCounterPda,
  PROGRAM_ID,
} from './constants';

/**
 * Initialize pool parameters
 */
export interface InitializePoolParams {
  /** Token mint for this pool */
  tokenMint: PublicKey;
  /** Authority (usually the payer) */
  authority: PublicKey;
  /** Payer for account creation */
  payer: PublicKey;
}

/**
 * Build initialize_pool transaction using Anchor program
 */
export async function buildInitializePoolWithProgram(
  program: Program,
  params: InitializePoolParams
): Promise<any> {
  const programId = program.programId;

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);

  // Build transaction using Anchor
  const tx = await program.methods
    .initializePool()
    .accounts({
      pool: poolPda,
      tokenVault: vaultPda,
      tokenMint: params.tokenMint,
      authority: params.authority,
      payer: params.payer,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    });

  return tx;
}

/**
 * Build initialize_commitment_counter transaction using Anchor program
 */
export async function buildInitializeCommitmentCounterWithProgram(
  program: Program,
  params: {
    tokenMint: PublicKey;
    authority: PublicKey;
    payer: PublicKey;
  }
): Promise<any> {
  const programId = program.programId;

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);

  // Build transaction using Anchor
  const tx = await program.methods
    .initializeCommitmentCounter()
    .accounts({
      pool: poolPda,
      commitmentCounter: counterPda,
      authority: params.authority,
      payer: params.payer,
      systemProgram: SystemProgram.programId,
    });

  return tx;
}

/**
 * Initialize a new pool with commitment counter
 *
 * Combines both initialization instructions
 */
export async function initializePool(
  program: Program,
  tokenMint: PublicKey,
  authority: PublicKey,
  payer: PublicKey
): Promise<{ poolTx: string; counterTx: string }> {
  // Initialize pool
  const poolTxBuilder = await buildInitializePoolWithProgram(program, {
    tokenMint,
    authority,
    payer,
  });

  let poolTx: string;
  try {
    poolTx = await poolTxBuilder.rpc();
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      poolTx = 'already_exists';
    } else {
      throw e;
    }
  }

  // Initialize commitment counter
  const counterTxBuilder = await buildInitializeCommitmentCounterWithProgram(program, {
    tokenMint,
    authority,
    payer,
  });

  let counterTx: string;
  try {
    counterTx = await counterTxBuilder.rpc();
  } catch (e: any) {
    if (e.message?.includes('already in use')) {
      counterTx = 'already_exists';
    } else {
      throw e;
    }
  }

  return { poolTx, counterTx };
}
