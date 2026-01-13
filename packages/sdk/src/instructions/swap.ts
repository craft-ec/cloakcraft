/**
 * AMM Swap Instruction Builders (Multi-Phase)
 *
 * All AMM operations use multi-phase commit due to Solana transaction size limits:
 * - Phase 1: Verify proof + Store pending operation (+ create nullifier for single-nullifier ops)
 * - Phase 2: Create each nullifier (for multi-nullifier ops like add_liquidity)
 * - Phase 3: Create each commitment
 * - Phase 4: Close pending operation
 */

import {
  PublicKey,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import type { StealthAddress } from '@cloakcraft/types';

import {
  derivePoolPda,
  deriveCommitmentCounterPda,
  deriveVerificationKeyPda,
  CIRCUIT_IDS,
} from './constants';
import { LightProtocol } from './light-helpers';
import { generateRandomness } from '../crypto/commitment';
import { encryptNote, serializeEncryptedNote } from '../crypto/encryption';

// =============================================================================
// Common Types
// =============================================================================

/**
 * AMM Pool derivation
 */
export function deriveAmmPoolPda(
  tokenAMint: PublicKey,
  tokenBMint: PublicKey,
  programId: PublicKey
): [PublicKey, number] {
  // Ensure consistent ordering (lower pubkey first)
  const [first, second] = tokenAMint.toBuffer().compare(tokenBMint.toBuffer()) < 0
    ? [tokenAMint, tokenBMint]
    : [tokenBMint, tokenAMint];

  return PublicKey.findProgramAddressSync(
    [Buffer.from('amm_pool'), first.toBuffer(), second.toBuffer()],
    programId
  );
}

/**
 * Derive pending operation PDA
 */
export function derivePendingOperationPda(
  operationId: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pending_op'), Buffer.from(operationId)],
    programId
  );
}

/**
 * Generate unique operation ID
 */
export function generateOperationId(
  nullifier: Uint8Array,
  commitment: Uint8Array,
  timestamp: number
): Uint8Array {
  const data = new Uint8Array(32 + 32 + 8);
  data.set(nullifier, 0);
  data.set(commitment, 32);
  new DataView(data.buffer).setBigUint64(64, BigInt(timestamp), true);

  const id = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    id[i] = data[i] ^ data[32 + (i % 32)] ^ data[64 + (i % 8)];
  }
  return id;
}

/**
 * Pending commitment data stored client-side between phases
 */
export interface PendingCommitmentData {
  pool: PublicKey;
  commitment: Uint8Array;
  stealthEphemeralPubkey: Uint8Array;
  encryptedNote: Uint8Array;
}

/**
 * Pending nullifier data stored client-side between phases
 */
export interface PendingNullifierData {
  pool: PublicKey;
  nullifier: Uint8Array;
}

// =============================================================================
// Swap Types
// =============================================================================

/**
 * Swap Phase 1 instruction parameters
 */
export interface SwapInstructionParams {
  /** Input token pool */
  inputPool: PublicKey;
  /** Output token pool */
  outputPool: PublicKey;
  /** AMM pool state */
  ammPool: PublicKey;
  /** Relayer public key */
  relayer: PublicKey;
  /** ZK proof bytes */
  proof: Uint8Array;
  /** Merkle root for input proof */
  merkleRoot: Uint8Array;
  /** Pre-computed nullifier */
  nullifier: Uint8Array;
  /** Pre-computed output commitment */
  outputCommitment: Uint8Array;
  /** Pre-computed change commitment */
  changeCommitment: Uint8Array;
  /** Minimum output amount */
  minOutput: bigint;
  /** Output recipient stealth address */
  outputRecipient: StealthAddress;
  /** Change recipient stealth address */
  changeRecipient: StealthAddress;
  /** Input amount for change calculation */
  inputAmount: bigint;
  /** Swap amount */
  swapAmount: bigint;
  /** Actual output amount from AMM calculation */
  outputAmount: bigint;
  /** Swap direction (aToB = true, bToA = false) */
  swapDirection: 'aToB' | 'bToA';
}

/**
 * Swap Phase 2 parameters
 */
export interface SwapPhase2Params {
  /** Operation ID from Phase 1 */
  operationId: Uint8Array;
  /** Index of commitment to create (0 = output, 1 = change) */
  commitmentIndex: number;
  /** Pool for this commitment */
  pool: PublicKey;
  /** Relayer public key */
  relayer: PublicKey;
  /** Stealth ephemeral pubkey (64 bytes: x || y) */
  stealthEphemeralPubkey: Uint8Array;
  /** Encrypted note */
  encryptedNote: Uint8Array;
}

/**
 * Build Swap Phase 1 transaction
 */
export async function buildSwapWithProgram(
  program: Program,
  params: SwapInstructionParams,
  rpcUrl: string
): Promise<{
  tx: any;
  operationId: Uint8Array;
  pendingNullifiers: PendingNullifierData[];
  pendingCommitments: PendingCommitmentData[];
}> {
  console.log('[DEBUG] buildSwapWithProgram params:', {
    inputPool: params.inputPool?.toBase58(),
    outputPool: params.outputPool?.toBase58(),
    ammPool: params.ammPool?.toBase58(),
    relayer: params.relayer?.toBase58(),
  });
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Generate operation ID
  const operationId = generateOperationId(
    params.nullifier,
    params.outputCommitment,
    Date.now()
  );

  // Derive PDAs
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.SWAP, programId);

  // Generate randomness for outputs
  const outputRandomness = generateRandomness();
  const changeRandomness = generateRandomness();

  // Create output notes for encryption
  const outputNote = {
    stealthPubX: params.outputRecipient.stealthPubkey.x,
    tokenMint: params.outputPool,
    amount: params.minOutput,
    randomness: outputRandomness,
  };

  const changeNote = {
    stealthPubX: params.changeRecipient.stealthPubkey.x,
    tokenMint: params.inputPool,
    amount: params.inputAmount - params.swapAmount,
    randomness: changeRandomness,
  };

  // Encrypt notes
  const encryptedOutputNote = encryptNote(outputNote, params.outputRecipient.stealthPubkey);
  const encryptedChangeNote = encryptNote(changeNote, params.changeRecipient.stealthPubkey);

  // Serialize stealth ephemeral pubkeys (for stealth key derivation, NOT for ECIES)
  const outputEphemeralBytes = new Uint8Array(64);
  outputEphemeralBytes.set(params.outputRecipient.ephemeralPubkey.x, 0);
  outputEphemeralBytes.set(params.outputRecipient.ephemeralPubkey.y, 32);

  const changeEphemeralBytes = new Uint8Array(64);
  changeEphemeralBytes.set(params.changeRecipient.ephemeralPubkey.x, 0);
  changeEphemeralBytes.set(params.changeRecipient.ephemeralPubkey.y, 32);

  // Build pending nullifiers data (for Phase 2)
  const pendingNullifiers: PendingNullifierData[] = [
    {
      pool: params.inputPool,
      nullifier: params.nullifier,
    },
  ];

  // Build pending commitments data (for Phase 3)
  const pendingCommitments: PendingCommitmentData[] = [
    {
      pool: params.outputPool,
      commitment: params.outputCommitment,
      stealthEphemeralPubkey: outputEphemeralBytes,
      encryptedNote: serializeEncryptedNote(encryptedOutputNote),
    },
    {
      pool: params.inputPool,
      commitment: params.changeCommitment,
      stealthEphemeralPubkey: changeEphemeralBytes,
      encryptedNote: serializeEncryptedNote(encryptedChangeNote),
    },
  ];

  // NO Light Protocol calls in Phase 1 (to keep transaction size small)
  const outputTreeIndex = 0; // Will be used in Phase 2/3
  const lightParams = {
    outputTreeIndex,
  };

  const numCommitments = 2; // Output + Change
  const tx = await program.methods
    .swap(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(params.nullifier),
      Array.from(params.outputCommitment),
      Array.from(params.changeCommitment),
      new BN(params.swapAmount.toString()),
      new BN(params.outputAmount.toString()),
      new BN(params.minOutput.toString()),
      params.swapDirection === 'aToB',
      numCommitments,
      lightParams
    )
    .accountsStrict({
      inputPool: params.inputPool,
      outputPool: params.outputPool,
      ammPool: params.ammPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: PublicKey.default,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return {
    tx,
    operationId,
    pendingNullifiers,
    pendingCommitments,
  };
}


// =============================================================================
// Add Liquidity Types
// =============================================================================

/**
 * Add Liquidity Phase 1 parameters
 */
export interface AddLiquidityInstructionParams {
  /** Token A pool */
  poolA: PublicKey;
  /** Token B pool */
  poolB: PublicKey;
  /** Token A mint */
  tokenAMint: PublicKey;
  /** Token B mint */
  tokenBMint: PublicKey;
  /** LP token pool */
  lpPool: PublicKey;
  /** LP token mint */
  lpMint: PublicKey;
  /** AMM pool state */
  ammPool: PublicKey;
  /** Relayer */
  relayer: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Pre-computed values */
  nullifierA: Uint8Array;
  nullifierB: Uint8Array;
  lpCommitment: Uint8Array;
  changeACommitment: Uint8Array;
  changeBCommitment: Uint8Array;
  /** Randomness used in proof generation (MUST be same for encryption) */
  lpRandomness: Uint8Array;
  changeARandomness: Uint8Array;
  changeBRandomness: Uint8Array;
  /** Recipients */
  lpRecipient: StealthAddress;
  changeARecipient: StealthAddress;
  changeBRecipient: StealthAddress;
  /** Input amounts for change calculation */
  inputAAmount: bigint;
  inputBAmount: bigint;
  depositA: bigint;
  depositB: bigint;
  lpAmount: bigint;
}

/**
 * Add Liquidity Phase 2 parameters
 */
export interface AddLiquidityPhase2Params {
  /** Operation ID from Phase 1 */
  operationId: Uint8Array;
  /** Index of commitment (0 = LP, 1 = Change A, 2 = Change B) */
  commitmentIndex: number;
  /** Pool for this commitment */
  pool: PublicKey;
  /** Relayer */
  relayer: PublicKey;
  /** Stealth ephemeral pubkey */
  stealthEphemeralPubkey: Uint8Array;
  /** Encrypted note */
  encryptedNote: Uint8Array;
}

/**
 * Build Add Liquidity Phase 1 transaction
 */
export async function buildAddLiquidityWithProgram(
  program: Program,
  params: AddLiquidityInstructionParams,
  _rpcUrl: string // Not needed for Phase 1 anymore
): Promise<{
  tx: any;
  operationId: Uint8Array;
  pendingNullifiers: PendingNullifierData[];
  pendingCommitments: PendingCommitmentData[];
}> {
  const programId = program.programId;

  // Generate operation ID
  const operationId = generateOperationId(
    params.nullifierA,
    params.lpCommitment,
    Date.now()
  );
  console.log(`[Phase 1] Generated operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);
  console.log(`[Phase 1] Nullifier A: ${Buffer.from(params.nullifierA).toString('hex').slice(0, 16)}...`);
  console.log(`[Phase 1] Nullifier B: ${Buffer.from(params.nullifierB).toString('hex').slice(0, 16)}...`);

  // Derive PDAs
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.ADD_LIQUIDITY, programId);

  // Use the SAME randomness that was used in proof generation
  // This is critical so encrypted notes can be decrypted correctly
  const lpRandomness = params.lpRandomness;
  const changeARandomness = params.changeARandomness;
  const changeBRandomness = params.changeBRandomness;

  // Create and encrypt notes using the SAME randomness from proof
  const lpNote = {
    stealthPubX: params.lpRecipient.stealthPubkey.x,
    tokenMint: params.lpMint,
    amount: params.lpAmount, // Use the actual LP amount, not 0
    randomness: lpRandomness,
  };
  const changeANote = {
    stealthPubX: params.changeARecipient.stealthPubkey.x,
    tokenMint: params.tokenAMint,
    amount: params.inputAAmount - params.depositA,
    randomness: changeARandomness,
  };
  const changeBNote = {
    stealthPubX: params.changeBRecipient.stealthPubkey.x,
    tokenMint: params.tokenBMint,
    amount: params.inputBAmount - params.depositB,
    randomness: changeBRandomness,
  };

  const encryptedLp = encryptNote(lpNote, params.lpRecipient.stealthPubkey);
  const encryptedChangeA = encryptNote(changeANote, params.changeARecipient.stealthPubkey);
  const encryptedChangeB = encryptNote(changeBNote, params.changeBRecipient.stealthPubkey);

  // Serialize stealth ephemeral pubkeys (for stealth key derivation, NOT for ECIES)
  // The ECIES ephemeral is stored inside the encrypted note itself
  const lpEphemeral = new Uint8Array(64);
  lpEphemeral.set(params.lpRecipient.ephemeralPubkey.x, 0);
  lpEphemeral.set(params.lpRecipient.ephemeralPubkey.y, 32);

  const changeAEphemeral = new Uint8Array(64);
  changeAEphemeral.set(params.changeARecipient.ephemeralPubkey.x, 0);
  changeAEphemeral.set(params.changeARecipient.ephemeralPubkey.y, 32);

  const changeBEphemeral = new Uint8Array(64);
  changeBEphemeral.set(params.changeBRecipient.ephemeralPubkey.x, 0);
  changeBEphemeral.set(params.changeBRecipient.ephemeralPubkey.y, 32);

  // Build pending commitments data (for Phase 2)
  const pendingCommitments: PendingCommitmentData[] = [
    {
      pool: params.lpPool,
      commitment: params.lpCommitment,
      stealthEphemeralPubkey: lpEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedLp),
    },
    {
      pool: params.poolA,
      commitment: params.changeACommitment,
      stealthEphemeralPubkey: changeAEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedChangeA),
    },
    {
      pool: params.poolB,
      commitment: params.changeBCommitment,
      stealthEphemeralPubkey: changeBEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedChangeB),
    },
  ];

  // Phase 1 no longer makes Light Protocol calls - those are done via create_nullifier
  // Just needs outputTreeIndex placeholder
  const lightParams = {
    outputTreeIndex: 0, // Not used in Phase 1
  };

  const numCommitments = 3; // LP + Change A + Change B
  const tx = await program.methods
    .addLiquidity(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.nullifierA),
      Array.from(params.nullifierB),
      Array.from(params.lpCommitment),
      Array.from(params.changeACommitment),
      Array.from(params.changeBCommitment),
      new BN(params.depositA.toString()),
      new BN(params.depositB.toString()),
      new BN(params.lpAmount.toString()),
      numCommitments,
      lightParams
    )
    .accountsStrict({
      poolA: params.poolA,
      poolB: params.poolB,
      lpPool: params.lpPool,
      ammPool: params.ammPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: PublicKey.default,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  // Pending nullifiers that need to be created via create_nullifier
  const pendingNullifiers: PendingNullifierData[] = [
    { pool: params.poolA, nullifier: params.nullifierA },
    { pool: params.poolB, nullifier: params.nullifierB },
  ];

  return {
    tx,
    operationId,
    pendingNullifiers,
    pendingCommitments,
  };
}

// =============================================================================
// Create Nullifier (Generic)
// =============================================================================

/**
 * Create Nullifier instruction parameters
 */
export interface CreateNullifierParams {
  /** Operation ID from Phase 1 */
  operationId: Uint8Array;
  /** Index of nullifier to create */
  nullifierIndex: number;
  /** Pool for this nullifier */
  pool: PublicKey;
  /** Relayer */
  relayer: PublicKey;
}

/**
 * Build Create Nullifier instruction (generic)
 *
 * Call this for each nullifier in a multi-nullifier operation like add_liquidity.
 */
export async function buildCreateNullifierWithProgram(
  program: Program,
  params: CreateNullifierParams,
  rpcUrl: string
): Promise<{ tx: any }> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [pendingOpPda] = derivePendingOperationPda(params.operationId, programId);
  console.log(`[Phase 2] Fetching PendingOperation: ${pendingOpPda.toBase58()}`);
  console.log(`[Phase 2] Operation ID: ${Buffer.from(params.operationId).toString('hex').slice(0, 16)}...`);

  // Fetch pending operation to get nullifier
  const pendingOp = await (program.account as any).pendingOperation.fetch(pendingOpPda);
  const nullifier = new Uint8Array(pendingOp.nullifiers[params.nullifierIndex]);
  console.log(`[Phase 2] Fetched nullifier from PendingOp: ${Buffer.from(nullifier).toString('hex').slice(0, 16)}...`);

  // Get Light Protocol validity proof for this nullifier
  const nullifierAddress = lightProtocol.deriveNullifierAddress(params.pool, nullifier);
  console.log(`[Instruction] Trying to create nullifier address: ${nullifierAddress.toBase58()}`);
  console.log(`[Instruction] Pool: ${params.pool.toBase58()}`);
  console.log(`[Instruction] Nullifier: ${Buffer.from(nullifier).toString('hex').slice(0, 16)}...`);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } =
    lightProtocol.buildRemainingAccounts();

  const lightParams = {
    proof: LightProtocol.convertCompressedProof(nullifierProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  const tx = await program.methods
    .createNullifier(
      Array.from(params.operationId),
      params.nullifierIndex,
      lightParams
    )
    .accountsStrict({
      pool: params.pool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return { tx };
}

// =============================================================================
// Create Commitment (Generic)
// =============================================================================

/**
 * Create Commitment instruction parameters
 */
export interface CreateCommitmentParams {
  /** Operation ID from Phase 1 */
  operationId: Uint8Array;
  /** Index of commitment to create */
  commitmentIndex: number;
  /** Pool for this commitment */
  pool: PublicKey;
  /** Relayer */
  relayer: PublicKey;
  /** Stealth ephemeral pubkey (64 bytes: x || y) */
  stealthEphemeralPubkey: Uint8Array;
  /** Encrypted note */
  encryptedNote: Uint8Array;
}

/**
 * Build Create Commitment instruction (generic)
 *
 * Call this for each commitment in a multi-commitment operation.
 */
export async function buildCreateCommitmentWithProgram(
  program: Program,
  params: CreateCommitmentParams,
  rpcUrl: string
): Promise<{ tx: any }> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [pendingOpPda] = derivePendingOperationPda(params.operationId, programId);
  const [counterPda] = deriveCommitmentCounterPda(params.pool, programId);

  // Fetch pending operation to get commitment
  const pendingOp = await (program.account as any).pendingOperation.fetch(pendingOpPda);
  const commitment = new Uint8Array(pendingOp.commitments[params.commitmentIndex]);

  // Get Light Protocol validity proof for this commitment
  const commitmentAddress = lightProtocol.deriveCommitmentAddress(params.pool, commitment);
  const commitmentProof = await lightProtocol.getValidityProof([commitmentAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } =
    lightProtocol.buildRemainingAccounts();

  const lightParams = {
    proof: LightProtocol.convertCompressedProof(commitmentProof),
    addressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: commitmentProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  const tx = await program.methods
    .createCommitment(
      Array.from(params.operationId),
      params.commitmentIndex,
      Array.from(params.stealthEphemeralPubkey),
      Buffer.from(params.encryptedNote),
      lightParams
    )
    .accountsStrict({
      pool: params.pool,
      commitmentCounter: counterPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return { tx };
}

// =============================================================================
// Close Pending Operation (Generic)
// =============================================================================

/**
 * Build Close Pending Operation instruction (generic)
 */
export async function buildClosePendingOperationWithProgram(
  program: Program,
  operationId: Uint8Array,
  relayer: PublicKey
): Promise<{ tx: any }> {
  const programId = program.programId;
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);

  const tx = await program.methods
    .closePendingOperation(Array.from(operationId))
    .accountsStrict({
      pendingOperation: pendingOpPda,
      relayer,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return { tx };
}


// =============================================================================
// Remove Liquidity Types (Two-Phase)
// =============================================================================

/**
 * Remove Liquidity Phase 1 parameters
 */
export interface RemoveLiquidityInstructionParams {
  /** LP token pool */
  lpPool: PublicKey;
  /** Token A pool */
  poolA: PublicKey;
  /** Token B pool */
  poolB: PublicKey;
  /** AMM pool state */
  ammPool: PublicKey;
  /** Relayer */
  relayer: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Pre-computed values */
  lpNullifier: Uint8Array;
  outputACommitment: Uint8Array;
  outputBCommitment: Uint8Array;
  oldPoolStateHash: Uint8Array;
  newPoolStateHash: Uint8Array;
  /** Recipients */
  outputARecipient: StealthAddress;
  outputBRecipient: StealthAddress;
  /** LP amount being removed */
  lpAmount: bigint;
}

/**
 * Remove Liquidity Phase 2 parameters
 */
export interface RemoveLiquidityPhase2Params {
  /** Operation ID from Phase 1 */
  operationId: Uint8Array;
  /** Index of commitment (0 = Output A, 1 = Output B) */
  commitmentIndex: number;
  /** Pool for this commitment */
  pool: PublicKey;
  /** Relayer */
  relayer: PublicKey;
  /** Stealth ephemeral pubkey */
  stealthEphemeralPubkey: Uint8Array;
  /** Encrypted note */
  encryptedNote: Uint8Array;
}

/**
 * Build Remove Liquidity Phase 1 transaction
 */
export async function buildRemoveLiquidityWithProgram(
  program: Program,
  params: RemoveLiquidityInstructionParams,
  rpcUrl: string
): Promise<{
  tx: any;
  operationId: Uint8Array;
  pendingNullifiers: PendingNullifierData[];
  pendingCommitments: PendingCommitmentData[];
}> {
  const programId = program.programId;

  // Generate operation ID
  const operationId = generateOperationId(
    params.lpNullifier,
    params.outputACommitment,
    Date.now()
  );

  // Derive PDAs
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.REMOVE_LIQUIDITY, programId);

  // Generate randomness for outputs
  const outputARandomness = generateRandomness();
  const outputBRandomness = generateRandomness();

  // Create and encrypt notes
  const outputANote = {
    stealthPubX: params.outputARecipient.stealthPubkey.x,
    tokenMint: params.poolA,
    amount: 0n, // Computed by circuit
    randomness: outputARandomness,
  };
  const outputBNote = {
    stealthPubX: params.outputBRecipient.stealthPubkey.x,
    tokenMint: params.poolB,
    amount: 0n, // Computed by circuit
    randomness: outputBRandomness,
  };

  const encryptedOutputA = encryptNote(outputANote, params.outputARecipient.stealthPubkey);
  const encryptedOutputB = encryptNote(outputBNote, params.outputBRecipient.stealthPubkey);

  // Serialize stealth ephemeral pubkeys (for stealth key derivation, NOT for ECIES)
  const outputAEphemeral = new Uint8Array(64);
  outputAEphemeral.set(params.outputARecipient.ephemeralPubkey.x, 0);
  outputAEphemeral.set(params.outputARecipient.ephemeralPubkey.y, 32);

  const outputBEphemeral = new Uint8Array(64);
  outputBEphemeral.set(params.outputBRecipient.ephemeralPubkey.x, 0);
  outputBEphemeral.set(params.outputBRecipient.ephemeralPubkey.y, 32);

  // Build pending nullifiers data (for Phase 2)
  const pendingNullifiers: PendingNullifierData[] = [
    {
      pool: params.lpPool,
      nullifier: params.lpNullifier,
    },
  ];

  // Build pending commitments data (for Phase 3)
  const pendingCommitments: PendingCommitmentData[] = [
    {
      pool: params.poolA,
      commitment: params.outputACommitment,
      stealthEphemeralPubkey: outputAEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedOutputA),
    },
    {
      pool: params.poolB,
      commitment: params.outputBCommitment,
      stealthEphemeralPubkey: outputBEphemeral,
      encryptedNote: serializeEncryptedNote(encryptedOutputB),
    },
  ];

  // NO Light Protocol calls in Phase 1 (to keep transaction size small)
  const outputTreeIndex = 0; // Will be used in Phase 2/3
  const lightParams = {
    outputTreeIndex,
  };

  const numCommitments = 2; // Output A + Output B
  const tx = await program.methods
    .removeLiquidity(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.lpNullifier),
      Array.from(params.outputACommitment),
      Array.from(params.outputBCommitment),
      Array.from(params.oldPoolStateHash),
      Array.from(params.newPoolStateHash),
      numCommitments,
      lightParams
    )
    .accountsStrict({
      lpPool: params.lpPool,
      poolA: params.poolA,
      poolB: params.poolB,
      ammPool: params.ammPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: PublicKey.default,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return {
    tx,
    operationId,
    pendingNullifiers,
    pendingCommitments,
  };
}


// =============================================================================
// Close Pending Operation
// =============================================================================

