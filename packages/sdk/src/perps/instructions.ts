/**
 * CloakCraft Perpetual Futures Instruction Builders
 *
 * Multi-phase instruction builders for perps operations.
 * Follows the append pattern for complex operations.
 */

import {
  PublicKey,
  ComputeBudgetProgram,
  SystemProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import type { StealthAddress } from '@cloakcraft/types';

import {
  deriveVerificationKeyPda,
  PROGRAM_ID,
} from '../instructions/constants';
import { derivePendingOperationPda, generateOperationId, PendingCommitmentData } from '../instructions/swap';
import { encryptNote, serializeEncryptedNote } from '../crypto/encryption';

// =============================================================================
// Perps Seeds and Circuit IDs
// =============================================================================

export const PERPS_SEEDS = {
  PERPS_POOL: Buffer.from('perps_pool'),
  PERPS_MARKET: Buffer.from('perps_market'),
  PERPS_VAULT: Buffer.from('perps_vault'),
  PERPS_LP_MINT: Buffer.from('perps_lp'),
} as const;

export const PERPS_CIRCUIT_IDS = {
  OPEN_POSITION: 'perps_open_position',
  CLOSE_POSITION: 'perps_close_position',
  ADD_LIQUIDITY: 'perps_add_liquidity',
  REMOVE_LIQUIDITY: 'perps_remove_liquidity',
  LIQUIDATE: 'perps_liquidate',
} as const;

// =============================================================================
// PDA Derivation Functions
// =============================================================================

/**
 * Derive perps pool PDA
 */
export function derivePerpsPoolPda(
  poolId: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PERPS_SEEDS.PERPS_POOL, poolId.toBuffer()],
    programId
  );
}

/**
 * Derive perps market PDA
 */
export function derivePerpsMarketPda(
  perpsPool: PublicKey,
  marketId: Uint8Array,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PERPS_SEEDS.PERPS_MARKET, perpsPool.toBuffer(), Buffer.from(marketId)],
    programId
  );
}

/**
 * Derive perps vault PDA for a token
 */
export function derivePerpsVaultPda(
  perpsPool: PublicKey,
  tokenMint: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PERPS_SEEDS.PERPS_VAULT, perpsPool.toBuffer(), tokenMint.toBuffer()],
    programId
  );
}

/**
 * Derive perps LP mint PDA
 */
export function derivePerpsLpMintPda(
  perpsPool: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [PERPS_SEEDS.PERPS_LP_MINT, perpsPool.toBuffer()],
    programId
  );
}

// =============================================================================
// Light Protocol Types (simplified - caller provides the actual params)
// =============================================================================

/** Light params for verify commitment */
export interface LightVerifyParams {
  commitmentAccountHash: number[];
  commitmentMerkleContext: {
    merkleTreePubkeyIndex: number;
    queuePubkeyIndex: number;
    leafIndex: number;
    rootIndex: number;
  };
  commitmentInclusionProof: {
    a: number[];
    b: number[];
    c: number[];
  };
  commitmentAddressTreeInfo: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
    rootIndex: number;
  };
}

/** Light params for create nullifier */
export interface LightNullifierParams {
  nullifierNonInclusionProof: {
    a: number[];
    b: number[];
    c: number[];
  };
  nullifierAddressTreeInfo: {
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
    rootIndex: number;
  };
  outputTreeIndex: number;
}

// =============================================================================
// Open Position Instructions
// =============================================================================

export interface OpenPositionInstructionParams {
  /** Settlement pool (where margin comes from) */
  settlementPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Market */
  market: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Merkle root */
  merkleRoot: Uint8Array;
  /** Input commitment (margin) */
  inputCommitment: Uint8Array;
  /** Nullifier */
  nullifier: Uint8Array;
  /** Position commitment */
  positionCommitment: Uint8Array;
  /** Is long position */
  isLong: boolean;
  /** Margin amount */
  marginAmount: bigint;
  /** Leverage */
  leverage: number;
  /** Position fee */
  positionFee: bigint;
  /** Entry price */
  entryPrice: bigint;
  /** Relayer/payer */
  relayer: PublicKey;
  /** Position stealth address for encryption */
  positionRecipient: StealthAddress;
  /** Change stealth address */
  changeRecipient: StealthAddress;
  /** Position randomness (from proof generation) */
  positionRandomness: Uint8Array;
  /** Change randomness */
  changeRandomness: Uint8Array;
  /** Change amount */
  changeAmount: bigint;
  /** Token mint for margin */
  tokenMint: PublicKey;
  /** Light params for verify commitment */
  lightVerifyParams: LightVerifyParams;
  /** Light params for create nullifier */
  lightNullifierParams: LightNullifierParams;
  /** Remaining accounts for Light Protocol */
  remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[];
}

/**
 * Build open position multi-phase instructions
 */
export async function buildOpenPositionWithProgram(
  program: Program,
  params: OpenPositionInstructionParams
): Promise<{
  tx: any;
  phase1Tx: any;
  phase2Tx: any;
  phase3Tx: any;
  operationId: Uint8Array;
  pendingCommitments: PendingCommitmentData[];
}> {
  const programId = program.programId;

  // Generate operation ID
  const operationId = generateOperationId(
    params.nullifier,
    params.positionCommitment,
    Date.now()
  );

  // Derive PDAs
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(PERPS_CIRCUIT_IDS.OPEN_POSITION, programId);

  // Phase 0: Create pending with proof
  const phase0Tx = await program.methods
    .createPendingWithProofOpenPosition(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(params.inputCommitment),
      Array.from(params.nullifier),
      Array.from(params.positionCommitment),
      params.isLong,
      new BN(params.marginAmount.toString()),
      params.leverage,
      new BN(params.positionFee.toString())
    )
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      perpsMarket: params.market,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
    ]);

  // Phase 1: Verify commitment exists (generic instruction)
  const phase1Tx = await program.methods
    .verifyCommitmentExists(
      Array.from(operationId),
      0, // commitment_index
      params.lightVerifyParams
    )
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 2: Create nullifier (generic instruction)
  const phase2Tx = await program.methods
    .createNullifierAndPending(
      Array.from(operationId),
      0, // nullifier_index
      params.lightNullifierParams
    )
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 3: Execute open position
  const phase3Tx = await program.methods
    .executeOpenPosition(
      Array.from(operationId),
      new BN(params.entryPrice.toString())
    )
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      perpsMarket: params.market,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ]);

  // Build encrypted notes for commitments
  const positionNote = {
    stealthPubX: params.positionRecipient.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.marginAmount, // Position stores margin as amount
    randomness: params.positionRandomness,
  };
  const positionEncrypted = encryptNote(positionNote as any, params.positionRecipient.stealthPubkey);

  // Prepare pending commitments for Phase 4+ (create_commitment calls)
  const pendingCommitments: PendingCommitmentData[] = [
    {
      pool: params.settlementPool,
      commitment: params.positionCommitment,
      stealthEphemeralPubkey: new Uint8Array([
        ...params.positionRecipient.ephemeralPubkey.x,
        ...params.positionRecipient.ephemeralPubkey.y,
      ]),
      encryptedNote: serializeEncryptedNote(positionEncrypted),
    },
  ];

  // Only add change commitment if change amount > 0
  if (params.changeAmount > 0n) {
    const changeNote = {
      stealthPubX: params.changeRecipient.stealthPubkey.x,
      tokenMint: params.tokenMint,
      amount: params.changeAmount,
      randomness: params.changeRandomness,
    };
    const changeEncrypted = encryptNote(changeNote as any, params.changeRecipient.stealthPubkey);

    pendingCommitments.push({
      pool: params.settlementPool,
      commitment: new Uint8Array(32), // Change commitment computed during proof
      stealthEphemeralPubkey: new Uint8Array([
        ...params.changeRecipient.ephemeralPubkey.x,
        ...params.changeRecipient.ephemeralPubkey.y,
      ]),
      encryptedNote: serializeEncryptedNote(changeEncrypted),
    });
  }

  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments,
  };
}

// =============================================================================
// Close Position Instructions
// =============================================================================

export interface ClosePositionInstructionParams {
  /** Settlement pool */
  settlementPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Market */
  market: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Merkle root */
  merkleRoot: Uint8Array;
  /** Position commitment */
  positionCommitment: Uint8Array;
  /** Position nullifier */
  positionNullifier: Uint8Array;
  /** Settlement commitment */
  settlementCommitment: Uint8Array;
  /** Is long */
  isLong: boolean;
  /** Exit price */
  exitPrice: bigint;
  /** Close fee */
  closeFee: bigint;
  /** PnL amount */
  pnlAmount: bigint;
  /** Is profit */
  isProfit: boolean;
  /** Position margin */
  positionMargin: bigint;
  /** Position size */
  positionSize: bigint;
  /** Entry price */
  entryPrice: bigint;
  /** Relayer */
  relayer: PublicKey;
  /** Settlement recipient */
  settlementRecipient: StealthAddress;
  /** Settlement randomness */
  settlementRandomness: Uint8Array;
  /** Settlement amount */
  settlementAmount: bigint;
  /** Token mint */
  tokenMint: PublicKey;
  /** Light verify params */
  lightVerifyParams: LightVerifyParams;
  /** Light nullifier params */
  lightNullifierParams: LightNullifierParams;
  /** Remaining accounts */
  remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[];
}

/**
 * Build close position multi-phase instructions
 */
export async function buildClosePositionWithProgram(
  program: Program,
  params: ClosePositionInstructionParams
): Promise<{
  tx: any;
  phase1Tx: any;
  phase2Tx: any;
  phase3Tx: any;
  operationId: Uint8Array;
  pendingCommitments: PendingCommitmentData[];
}> {
  const programId = program.programId;

  const operationId = generateOperationId(
    params.positionNullifier,
    params.settlementCommitment,
    Date.now()
  );

  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(PERPS_CIRCUIT_IDS.CLOSE_POSITION, programId);

  // Phase 0
  const phase0Tx = await program.methods
    .createPendingWithProofClosePosition(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(params.positionCommitment),
      Array.from(params.positionNullifier),
      Array.from(params.settlementCommitment),
      params.isLong,
      new BN(params.exitPrice.toString()),
      new BN(params.closeFee.toString()),
      new BN(params.pnlAmount.toString()),
      params.isProfit
    )
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      perpsMarket: params.market,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
    ]);

  // Phase 1
  const phase1Tx = await program.methods
    .verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams)
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 2
  const phase2Tx = await program.methods
    .createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams)
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 3
  const phase3Tx = await program.methods
    .executeClosePosition(
      Array.from(operationId),
      new BN(params.positionMargin.toString()),
      new BN(params.positionSize.toString()),
      new BN(params.entryPrice.toString())
    )
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      perpsMarket: params.market,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ]);

  // Encrypted settlement note
  const settlementNote = {
    stealthPubX: params.settlementRecipient.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.settlementAmount,
    randomness: params.settlementRandomness,
  };
  const settlementEncrypted = encryptNote(settlementNote as any, params.settlementRecipient.stealthPubkey);

  const pendingCommitments: PendingCommitmentData[] = [{
    pool: params.settlementPool,
    commitment: params.settlementCommitment,
    stealthEphemeralPubkey: new Uint8Array([
      ...params.settlementRecipient.ephemeralPubkey.x,
      ...params.settlementRecipient.ephemeralPubkey.y,
    ]),
    encryptedNote: serializeEncryptedNote(settlementEncrypted),
  }];

  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments,
  };
}

// =============================================================================
// Add Perps Liquidity Instructions
// =============================================================================

export interface AddPerpsLiquidityInstructionParams {
  /** Settlement pool */
  settlementPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Merkle root */
  merkleRoot: Uint8Array;
  /** Input commitment */
  inputCommitment: Uint8Array;
  /** Nullifier */
  nullifier: Uint8Array;
  /** LP commitment */
  lpCommitment: Uint8Array;
  /** Token index */
  tokenIndex: number;
  /** Deposit amount */
  depositAmount: bigint;
  /** LP amount to mint */
  lpAmountMinted: bigint;
  /** Fee amount */
  feeAmount: bigint;
  /** Oracle prices for all tokens (8 elements) */
  oraclePrices: bigint[];
  /** Relayer */
  relayer: PublicKey;
  /** LP recipient */
  lpRecipient: StealthAddress;
  /** LP randomness */
  lpRandomness: Uint8Array;
  /** Token mint */
  tokenMint: PublicKey;
  /** LP mint */
  lpMint: PublicKey;
  /** Light verify params */
  lightVerifyParams: LightVerifyParams;
  /** Light nullifier params */
  lightNullifierParams: LightNullifierParams;
  /** Remaining accounts */
  remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[];
}

/**
 * Build add perps liquidity multi-phase instructions
 */
export async function buildAddPerpsLiquidityWithProgram(
  program: Program,
  params: AddPerpsLiquidityInstructionParams
): Promise<{
  tx: any;
  phase1Tx: any;
  phase2Tx: any;
  phase3Tx: any;
  operationId: Uint8Array;
  pendingCommitments: PendingCommitmentData[];
}> {
  const programId = program.programId;

  const operationId = generateOperationId(params.nullifier, params.lpCommitment, Date.now());

  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(PERPS_CIRCUIT_IDS.ADD_LIQUIDITY, programId);

  // Convert oracle prices to BN array (pad to 8)
  const oraclePricesBN: BN[] = [];
  for (let i = 0; i < 8; i++) {
    oraclePricesBN.push(new BN((params.oraclePrices[i] ?? 0n).toString()));
  }

  // Phase 0
  const phase0Tx = await program.methods
    .createPendingWithProofAddPerpsLiquidity(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(params.inputCommitment),
      Array.from(params.nullifier),
      Array.from(params.lpCommitment),
      params.tokenIndex,
      new BN(params.depositAmount.toString()),
      new BN(params.lpAmountMinted.toString()),
      new BN(params.feeAmount.toString())
    )
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
    ]);

  // Phase 1
  const phase1Tx = await program.methods
    .verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams)
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 2
  const phase2Tx = await program.methods
    .createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams)
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 3
  const phase3Tx = await program.methods
    .executeAddPerpsLiquidity(Array.from(operationId), oraclePricesBN)
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ]);

  // LP note
  const lpNote = {
    stealthPubX: params.lpRecipient.stealthPubkey.x,
    tokenMint: params.lpMint,
    amount: params.lpAmountMinted,
    randomness: params.lpRandomness,
  };
  const lpEncrypted = encryptNote(lpNote as any, params.lpRecipient.stealthPubkey);

  const pendingCommitments: PendingCommitmentData[] = [{
    pool: params.settlementPool,
    commitment: params.lpCommitment,
    stealthEphemeralPubkey: new Uint8Array([
      ...params.lpRecipient.ephemeralPubkey.x,
      ...params.lpRecipient.ephemeralPubkey.y,
    ]),
    encryptedNote: serializeEncryptedNote(lpEncrypted),
  }];

  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments,
  };
}

// =============================================================================
// Remove Perps Liquidity Instructions
// =============================================================================

export interface RemovePerpsLiquidityInstructionParams {
  /** Settlement pool */
  settlementPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Merkle root */
  merkleRoot: Uint8Array;
  /** LP commitment */
  lpCommitment: Uint8Array;
  /** LP nullifier */
  lpNullifier: Uint8Array;
  /** Output commitment */
  outputCommitment: Uint8Array;
  /** Change LP commitment */
  changeLpCommitment: Uint8Array;
  /** Token index to withdraw */
  tokenIndex: number;
  /** Withdraw amount */
  withdrawAmount: bigint;
  /** LP amount to burn */
  lpAmountBurned: bigint;
  /** Fee amount */
  feeAmount: bigint;
  /** Oracle prices */
  oraclePrices: bigint[];
  /** Relayer */
  relayer: PublicKey;
  /** Output recipient */
  outputRecipient: StealthAddress;
  /** LP change recipient */
  lpChangeRecipient: StealthAddress;
  /** Output randomness */
  outputRandomness: Uint8Array;
  /** LP change randomness */
  lpChangeRandomness: Uint8Array;
  /** Token mint */
  tokenMint: PublicKey;
  /** LP mint */
  lpMint: PublicKey;
  /** LP change amount */
  lpChangeAmount: bigint;
  /** Light verify params */
  lightVerifyParams: LightVerifyParams;
  /** Light nullifier params */
  lightNullifierParams: LightNullifierParams;
  /** Remaining accounts */
  remainingAccounts: { pubkey: PublicKey; isSigner: boolean; isWritable: boolean }[];
}

/**
 * Build remove perps liquidity multi-phase instructions
 */
export async function buildRemovePerpsLiquidityWithProgram(
  program: Program,
  params: RemovePerpsLiquidityInstructionParams
): Promise<{
  tx: any;
  phase1Tx: any;
  phase2Tx: any;
  phase3Tx: any;
  operationId: Uint8Array;
  pendingCommitments: PendingCommitmentData[];
}> {
  const programId = program.programId;

  const operationId = generateOperationId(params.lpNullifier, params.outputCommitment, Date.now());

  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(PERPS_CIRCUIT_IDS.REMOVE_LIQUIDITY, programId);

  const oraclePricesBN: BN[] = [];
  for (let i = 0; i < 8; i++) {
    oraclePricesBN.push(new BN((params.oraclePrices[i] ?? 0n).toString()));
  }

  // Phase 0
  const phase0Tx = await program.methods
    .createPendingWithProofRemovePerpsLiquidity(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(params.lpCommitment),
      Array.from(params.lpNullifier),
      Array.from(params.outputCommitment),
      Array.from(params.changeLpCommitment),
      params.tokenIndex,
      new BN(params.withdrawAmount.toString()),
      new BN(params.lpAmountBurned.toString()),
      new BN(params.feeAmount.toString())
    )
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
    ]);

  // Phase 1
  const phase1Tx = await program.methods
    .verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams)
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 2
  const phase2Tx = await program.methods
    .createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams)
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 3
  const phase3Tx = await program.methods
    .executeRemovePerpsLiquidity(Array.from(operationId), oraclePricesBN)
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ]);

  // Output note
  const outputNote = {
    stealthPubX: params.outputRecipient.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.withdrawAmount,
    randomness: params.outputRandomness,
  };
  const outputEncrypted = encryptNote(outputNote as any, params.outputRecipient.stealthPubkey);

  const pendingCommitments: PendingCommitmentData[] = [{
    pool: params.settlementPool,
    commitment: params.outputCommitment,
    stealthEphemeralPubkey: new Uint8Array([
      ...params.outputRecipient.ephemeralPubkey.x,
      ...params.outputRecipient.ephemeralPubkey.y,
    ]),
    encryptedNote: serializeEncryptedNote(outputEncrypted),
  }];

  // LP change commitment if any
  if (params.lpChangeAmount > 0n) {
    const lpChangeNote = {
      stealthPubX: params.lpChangeRecipient.stealthPubkey.x,
      tokenMint: params.lpMint,
      amount: params.lpChangeAmount,
      randomness: params.lpChangeRandomness,
    };
    const lpChangeEncrypted = encryptNote(lpChangeNote as any, params.lpChangeRecipient.stealthPubkey);

    pendingCommitments.push({
      pool: params.settlementPool,
      commitment: params.changeLpCommitment,
      stealthEphemeralPubkey: new Uint8Array([
        ...params.lpChangeRecipient.ephemeralPubkey.x,
        ...params.lpChangeRecipient.ephemeralPubkey.y,
      ]),
      encryptedNote: serializeEncryptedNote(lpChangeEncrypted),
    });
  }

  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    operationId,
    pendingCommitments,
  };
}

// =============================================================================
// Admin Instructions (Single-Phase)
// =============================================================================

export interface InitializePerpsPoolParams {
  poolId: PublicKey;
  authority: PublicKey;
  payer: PublicKey;
  maxLeverage?: number;
  positionFeeBps?: number;
  maxUtilizationBps?: number;
  liquidationThresholdBps?: number;
  liquidationPenaltyBps?: number;
  baseBorrowRateBps?: number;
}

/**
 * Build initialize perps pool instruction
 */
export async function buildInitializePerpsPoolWithProgram(
  program: Program,
  params: InitializePerpsPoolParams
): Promise<{ tx: any }> {
  const programId = program.programId;
  const [perpsPoolPda] = derivePerpsPoolPda(params.poolId, programId);
  const [lpMintPda] = derivePerpsLpMintPda(perpsPoolPda, programId);

  const initParams = {
    maxLeverage: params.maxLeverage ?? 100,
    positionFeeBps: params.positionFeeBps ?? 6,
    maxUtilizationBps: params.maxUtilizationBps ?? 8000,
    liquidationThresholdBps: params.liquidationThresholdBps ?? 50,
    liquidationPenaltyBps: params.liquidationPenaltyBps ?? 50,
    baseBorrowRateBps: params.baseBorrowRateBps ?? 10,
  };

  const tx = await program.methods
    .initializePerpsPool(params.poolId, initParams)
    .accountsStrict({
      perpsPool: perpsPoolPda,
      lpMint: lpMintPda,
      authority: params.authority,
      payer: params.payer,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    });

  return { tx };
}

export interface AddTokenToPoolParams {
  perpsPool: PublicKey;
  tokenMint: PublicKey;
  oracle: PublicKey;
  authority: PublicKey;
  payer: PublicKey;
}

/**
 * Build add token to pool instruction
 */
export async function buildAddTokenToPoolWithProgram(
  program: Program,
  params: AddTokenToPoolParams
): Promise<{ tx: any }> {
  const programId = program.programId;
  const [vaultPda] = derivePerpsVaultPda(params.perpsPool, params.tokenMint, programId);

  const tx = await program.methods
    .addTokenToPool()
    .accountsStrict({
      perpsPool: params.perpsPool,
      tokenMint: params.tokenMint,
      vault: vaultPda,
      oracle: params.oracle,
      authority: params.authority,
      payer: params.payer,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    });

  return { tx };
}

export interface AddMarketParams {
  perpsPool: PublicKey;
  marketId: Uint8Array;
  baseTokenIndex: number;
  quoteTokenIndex: number;
  maxPositionSize: bigint;
  authority: PublicKey;
  payer: PublicKey;
}

/**
 * Build add market instruction
 */
export async function buildAddMarketWithProgram(
  program: Program,
  params: AddMarketParams
): Promise<{ tx: any }> {
  const programId = program.programId;
  const [marketPda] = derivePerpsMarketPda(params.perpsPool, params.marketId, programId);

  const tx = await program.methods
    .addMarket(
      Array.from(params.marketId),
      params.baseTokenIndex,
      params.quoteTokenIndex,
      new BN(params.maxPositionSize.toString())
    )
    .accountsStrict({
      perpsPool: params.perpsPool,
      perpsMarket: marketPda,
      authority: params.authority,
      payer: params.payer,
      systemProgram: SystemProgram.programId,
    });

  return { tx };
}

// =============================================================================
// Keeper Instructions
// =============================================================================

/**
 * Build update borrow fees instruction
 */
export async function buildUpdateBorrowFeesWithProgram(
  program: Program,
  perpsPool: PublicKey,
  keeper: PublicKey
): Promise<{ tx: any }> {
  const tx = await program.methods
    .updatePerpsBorrowFees()
    .accountsStrict({
      perpsPool,
      keeper,
    });

  return { tx };
}
