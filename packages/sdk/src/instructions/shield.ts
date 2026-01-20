/**
 * Shield Instruction Builder
 *
 * Deposits tokens into the privacy pool and creates a commitment
 */

import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import type { Point } from '@cloakcraft/types';

import { derivePoolPda, deriveVaultPda, deriveCommitmentCounterPda, PROGRAM_ID } from './constants';
import { LightProtocol, LightShieldParams } from './light-helpers';
import { computeCommitment, generateRandomness } from '../crypto/commitment';
import { encryptNote, serializeEncryptedNote } from '../crypto/encryption';

/**
 * Shield parameters
 */
export interface ShieldInstructionParams {
  /** Token mint to shield */
  tokenMint: PublicKey;
  /** Amount to shield (in token base units) */
  amount: bigint;
  /** Recipient's stealth public key (for commitment and encryption) */
  stealthPubkey: Point;
  /** Stealth address ephemeral pubkey (stored on-chain for decryption key derivation) */
  stealthEphemeralPubkey: Point;
  /** User's token account */
  userTokenAccount: PublicKey;
  /** User's wallet public key */
  user: PublicKey;
}

/**
 * Shield result containing the generated note data
 */
export interface ShieldResult {
  /** Transaction instructions */
  instructions: TransactionInstruction[];
  /** The commitment hash */
  commitment: Uint8Array;
  /** Randomness used (needed for spending) */
  randomness: Uint8Array;
  /** Serialized encrypted note (stored on-chain) */
  encryptedNote: Buffer;
}

/**
 * Build shield transaction instructions
 */
export async function buildShieldInstructions(
  params: ShieldInstructionParams,
  rpcUrl: string,
  programId: PublicKey = PROGRAM_ID
): Promise<ShieldResult> {
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);

  // Generate randomness for commitment
  const randomness = generateRandomness();

  // Create note with stealth pubkey X (for on-chain commitment)
  const note = {
    stealthPubX: params.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.amount,
    randomness,
  };

  // Compute commitment
  const commitment = computeCommitment(note);

  // Encrypt note to stealth pubkey (recipient derives stealthPrivateKey for decryption)
  const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  const encryptedNote = encryptNote(note, params.stealthPubkey);
  const serializedNote = serializeEncryptedNote(encryptedNote);

  // Serialize stealth ephemeral pubkey (64 bytes: X + Y)
  const stealthEphemeralBytes = new Uint8Array(64);
  stealthEphemeralBytes.set(params.stealthEphemeralPubkey.x, 0);
  stealthEphemeralBytes.set(params.stealthEphemeralPubkey.y, 32);

  // Derive commitment address for Light Protocol
  const commitmentAddress = lightProtocol.deriveCommitmentAddress(poolPda, commitment);

  // Get validity proof (non-inclusion - commitment doesn't exist yet)
  const validityProof = await lightProtocol.getValidityProof([commitmentAddress]);

  // Build remaining accounts
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();

  // Build Light params
  const lightParams: LightShieldParams = {
    validityProof: LightProtocol.convertCompressedProof(validityProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: validityProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  // Build instructions
  const instructions: TransactionInstruction[] = [];

  // Add compute budget
  instructions.push(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 })
  );

  // Note: The actual shield instruction is built using Anchor's program interface
  // This creates the instruction data structure that matches the on-chain program

  return {
    instructions,
    commitment,
    randomness,
    encryptedNote: Buffer.from(serializedNote),
  };
}

/**
 * Build shield instruction using Anchor program
 */
export async function buildShieldWithProgram(
  program: Program,
  params: ShieldInstructionParams,
  rpcUrl: string
): Promise<{
  tx: any;
  commitment: Uint8Array;
  randomness: Uint8Array;
}> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const [counterPda] = deriveCommitmentCounterPda(poolPda, programId);

  // Generate randomness and create note with stealth pubkey X (for on-chain commitment)
  const randomness = generateRandomness();
  const note = {
    stealthPubX: params.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.amount,
    randomness,
  };

  // Compute commitment and encrypt note to stealthPubkey
  // Recipient derives stealthPrivateKey using the stored ephemeral pubkey
  const commitment = computeCommitment(note);
  const toHex = (arr: Uint8Array) => Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');

  // Debug: log what we're encrypting
  console.log(`[Shield] Creating note with:`);
  console.log(`[Shield]   stealthPubX: ${Buffer.from(note.stealthPubX).toString('hex').slice(0, 16)}...`);
  console.log(`[Shield]   tokenMint: ${note.tokenMint.toBase58().slice(0, 16)}...`);
  console.log(`[Shield]   amount: ${note.amount}`);
  console.log(`[Shield]   randomness: ${Buffer.from(note.randomness).toString('hex').slice(0, 16)}...`);
  console.log(`[Shield]   Commitment: ${Buffer.from(commitment).toString('hex').slice(0, 16)}...`);
  console.log(`[Shield]   Encrypting to stealthPubkey X: ${Buffer.from(params.stealthPubkey.x).toString('hex').slice(0, 16)}...`);
  console.log(`[Shield]   Stealth ephemeral X: ${Buffer.from(params.stealthEphemeralPubkey.x).toString('hex').slice(0, 16)}...`);

  const encryptedNote = encryptNote(note, params.stealthPubkey);
  const serializedNote = serializeEncryptedNote(encryptedNote);

  // Serialize stealth ephemeral pubkey (64 bytes: X + Y)
  const stealthEphemeralBytes = new Uint8Array(64);
  stealthEphemeralBytes.set(params.stealthEphemeralPubkey.x, 0);
  stealthEphemeralBytes.set(params.stealthEphemeralPubkey.y, 32);

  // Get Light Protocol validity proof
  const commitmentAddress = lightProtocol.deriveCommitmentAddress(poolPda, commitment);
  const validityProof = await lightProtocol.getValidityProof([commitmentAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } = lightProtocol.buildRemainingAccounts();

  const lightParams = {
    validityProof: LightProtocol.convertCompressedProof(validityProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: validityProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  // Build transaction using Anchor
  // Pass stealth ephemeral pubkey so recipient can derive decryption key
  const tx = await program.methods
    .shield(
      Array.from(commitment),
      new BN(params.amount.toString()),
      Array.from(stealthEphemeralBytes),
      Buffer.from(serializedNote),
      lightParams
    )
    .accountsStrict({
      pool: poolPda,
      commitmentCounter: counterPda,
      tokenVault: vaultPda,
      userTokenAccount: params.userTokenAccount,
      user: params.user,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return { tx, commitment, randomness };
}

/**
 * Build shield instruction for versioned transaction
 *
 * Shield is a single-phase operation - it creates the commitment on-chain directly.
 * This function returns the instruction for atomic execution with other operations.
 *
 * @returns Shield instruction ready for versioned transaction
 */
export async function buildShieldInstructionsForVersionedTx(
  program: Program,
  params: ShieldInstructionParams,
  rpcUrl: string
): Promise<{
  instructions: import('@solana/web3.js').TransactionInstruction[];
  commitment: Uint8Array;
  randomness: Uint8Array;
}> {
  // Build shield transaction
  const { tx, commitment, randomness } = await buildShieldWithProgram(program, params, rpcUrl);

  // Extract instruction from transaction
  const shieldIx = await tx.instruction();

  return {
    instructions: [shieldIx],
    commitment,
    randomness,
  };
}
