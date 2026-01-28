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
  derivePoolPda,
  PROGRAM_ID,
} from '../instructions/constants';
import { derivePendingOperationPda, generateOperationId, PendingCommitmentData } from '../instructions/swap';
import { encryptNote, serializeEncryptedNote, encryptPositionNote, encryptLpNote } from '../crypto/encryption';
import {
  createPositionNote,
  createLpNote,
  NOTE_TYPE_POSITION,
  NOTE_TYPE_LP,
} from '../crypto/commitment';
import { bytesToField, fieldToBytes } from '../crypto/poseidon';

// =============================================================================
// Pyth Price Feed IDs
// =============================================================================

/**
 * Well-known Pyth price feed IDs for common trading pairs.
 * These can be used when adding tokens to a perps pool.
 *
 * Feed IDs sourced from: https://pyth.network/developers/price-feed-ids
 */
export const PYTH_FEED_IDS = {
  /** SOL/USD price feed */
  SOL_USD: new Uint8Array([
    0xef, 0x0d, 0x8b, 0x6f, 0xda, 0x2c, 0xeb, 0xa4,
    0x1d, 0xa1, 0x5d, 0x40, 0x95, 0xd1, 0xda, 0x39,
    0x2a, 0x0d, 0x2f, 0x8e, 0xd0, 0xc6, 0xc7, 0xbc,
    0x0f, 0x4c, 0xfa, 0xc8, 0xc2, 0x80, 0xb5, 0x6d,
  ]),
  /** BTC/USD price feed */
  BTC_USD: new Uint8Array([
    0xe6, 0x2d, 0xf6, 0xc8, 0xb4, 0xa8, 0x5f, 0xe1,
    0xa6, 0x7d, 0xb4, 0x4d, 0xc1, 0x2d, 0xe5, 0xdb,
    0x33, 0x0f, 0x7a, 0xc6, 0x6b, 0x72, 0xdc, 0x65,
    0x8a, 0xfe, 0xdf, 0x0f, 0x4a, 0x41, 0x5b, 0x43,
  ]),
  /** ETH/USD price feed */
  ETH_USD: new Uint8Array([
    0xff, 0x61, 0x49, 0x1a, 0x93, 0x11, 0x12, 0xdd,
    0xf1, 0xbd, 0x81, 0x47, 0xcd, 0x1b, 0x64, 0x13,
    0x75, 0xf7, 0x9f, 0x58, 0x25, 0x12, 0x6d, 0x66,
    0x54, 0x80, 0x87, 0x46, 0x34, 0xfd, 0x0a, 0xce,
  ]),
  /** USDC/USD price feed (stablecoin) */
  USDC_USD: new Uint8Array([
    0xea, 0xa0, 0x20, 0xc6, 0x1c, 0xc4, 0x79, 0x71,
    0x2a, 0x35, 0x7a, 0xb5, 0xe4, 0xc7, 0x9a, 0x98,
    0xed, 0x97, 0x9e, 0xd4, 0x30, 0x24, 0xf7, 0x50,
    0x56, 0xbe, 0x2d, 0xb8, 0xbf, 0x6a, 0x43, 0x58,
  ]),
} as const;

// =============================================================================
// Perps Seeds and Circuit IDs
// =============================================================================

export const PERPS_SEEDS = {
  PERPS_POOL: Buffer.from('perps_pool'),
  PERPS_MARKET: Buffer.from('perps_market'),
  PERPS_VAULT: Buffer.from('perps_vault'),
  PERPS_LP_MINT: Buffer.from('perps_lp_mint'),
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
  proof: {
    a: number[];
    b: number[];
    c: number[];
  };
  addressTreeInfo: {
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
  /** Settlement pool (where margin comes from and change goes to) */
  settlementPool: PublicKey;
  /** Position pool (where position commitments are stored) */
  positionPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Market */
  market: PublicKey;
  /** Market ID (32 bytes, for position note encryption and commitment) */
  marketId: Uint8Array;
  /** Pyth price update account for the base token */
  priceUpdate: PublicKey;
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
  /** Change commitment (0x00...00 if no change) */
  changeCommitment: Uint8Array;
  /** Is long position */
  isLong: boolean;
  /** Margin amount */
  marginAmount: bigint;
  /** Position size (margin * leverage) */
  positionSize: bigint;
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
  /** Input note's stealthPubX (circuit uses this for position commitment) */
  inputStealthPubX: Uint8Array;
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
      Array.from(params.changeCommitment),
      params.isLong,
      new BN(params.marginAmount.toString()),
      params.leverage,
      new BN(params.positionFee.toString()),
      new BN(params.changeAmount.toString())
    )
    .accountsStrict({
      marginPool: params.settlementPool,
      positionPool: params.positionPool,
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
      marginPool: params.settlementPool,
      perpsPool: params.perpsPool,
      perpsMarket: params.market,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      priceUpdate: params.priceUpdate,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ]);

  // Build encrypted position note (fits in 250-byte limit with full marketId)
  // IMPORTANT: Use field-reduced marketId to match commitment computation in proofs.ts
  // The proof generator uses bytesToField(raw_marketId) which may reduce large values
  const fieldReducedMarketId = fieldToBytes(bytesToField(params.marketId));
  // IMPORTANT: Circuit uses INPUT note's stealthPubX for position commitment (open_position.circom line 177)
  // We must use inputStealthPubX here to match the circuit's commitment computation
  const positionNote = createPositionNote(
    params.inputStealthPubX,  // Use input's stealthPubX to match circuit
    fieldReducedMarketId,  // Field-reduced marketId for commitment computation match
    params.isLong,
    params.marginAmount,
    params.positionSize,
    params.leverage,
    params.entryPrice,
    params.positionRandomness
  );
  const positionEncrypted = encryptPositionNote(positionNote, params.positionRecipient.stealthPubkey);

  // Prepare pending commitments for Phase 4+ (create_commitment calls)
  const pendingCommitments: PendingCommitmentData[] = [
    {
      pool: params.positionPool, // Position commitment goes to position pool
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
    // IMPORTANT: Circuit uses INPUT note's stealthPubX for change commitment (open_position.circom line 202)
    // The encrypted note must use the same stealthPubX so scanning computes the matching commitment
    const changeNote = {
      stealthPubX: params.inputStealthPubX,  // Use input's stealthPubX to match circuit
      tokenMint: params.tokenMint,
      amount: params.changeAmount,
      randomness: params.changeRandomness,
    };
    const changeEncrypted = encryptNote(changeNote as any, params.changeRecipient.stealthPubkey);

    pendingCommitments.push({
      pool: params.settlementPool, // Change goes back to margin pool
      commitment: params.changeCommitment, // Use change commitment from params
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
  /** Position pool (where position commitment is read from) */
  positionPool: PublicKey;
  /** Settlement pool (where settlement commitment goes) */
  settlementPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Market */
  market: PublicKey;
  /** Pyth price update account for the base token */
  priceUpdate: PublicKey;
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
      positionPool: params.positionPool,
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

  // Phase 1 - verify position exists in position pool
  const phase1Tx = await program.methods
    .verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams)
    .accountsStrict({
      pool: params.positionPool, // Position is in position pool
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 2 - nullify position in position pool
  const phase2Tx = await program.methods
    .createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams)
    .accountsStrict({
      pool: params.positionPool, // Nullify position in position pool
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
      priceUpdate: params.priceUpdate,
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
  /** Deposit token pool */
  depositPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Perps pool ID (32 bytes, for LP note encryption) */
  perpsPoolId: Uint8Array;
  /** Pyth price update account for the deposit token */
  priceUpdate: PublicKey;
  /** LP mint for LP tokens */
  lpMintAccount: PublicKey;
  /** Token vault for the deposited token */
  tokenVault: PublicKey;
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
  // LP tokens are tracked in the LP pool (derived from LP mint)
  const [lpPoolPda] = derivePoolPda(params.lpMint, programId);

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
      depositPool: params.depositPool,
      lpPool: lpPoolPda,
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
      pool: params.depositPool,
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
      pool: params.depositPool,
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
      depositPool: params.depositPool,
      perpsPool: params.perpsPool,
      lpMint: params.lpMintAccount,
      tokenVault: params.tokenVault,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      priceUpdate: params.priceUpdate,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ]);

  // LP note with all required fields for commitment verification
  const lpNote = createLpNote(
    params.lpRecipient.stealthPubkey.x,
    params.perpsPoolId,
    params.lpAmountMinted,
    params.lpRandomness
  );
  const lpEncrypted = encryptLpNote(lpNote, params.lpRecipient.stealthPubkey);

  const pendingCommitments: PendingCommitmentData[] = [{
    pool: lpPoolPda,
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
  /** Withdrawal token pool */
  withdrawalPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Perps pool ID (32 bytes, for LP note encryption) */
  perpsPoolId: Uint8Array;
  /** Pyth price update account for the withdrawal token */
  priceUpdate: PublicKey;
  /** LP mint for LP tokens */
  lpMintAccount: PublicKey;
  /** Token vault for the withdrawal token */
  tokenVault: PublicKey;
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
  // LP tokens are tracked in the LP pool (derived from LP mint)
  const [lpPoolPda] = derivePoolPda(params.lpMint, programId);

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
      withdrawalPool: params.withdrawalPool,
      lpPool: lpPoolPda,
      perpsPool: params.perpsPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
    ]);

  // Phase 1 - Verify LP commitment exists (LP tokens are in LP pool)
  const phase1Tx = await program.methods
    .verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams)
    .accountsStrict({
      pool: lpPoolPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 2 - Create nullifier for LP commitment (LP tokens are in LP pool)
  const phase2Tx = await program.methods
    .createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams)
    .accountsStrict({
      pool: lpPoolPda,
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
      withdrawalPool: params.withdrawalPool,
      perpsPool: params.perpsPool,
      lpMint: params.lpMintAccount,
      tokenVault: params.tokenVault,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      priceUpdate: params.priceUpdate,
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
    pool: params.withdrawalPool,
    commitment: params.outputCommitment,
    stealthEphemeralPubkey: new Uint8Array([
      ...params.outputRecipient.ephemeralPubkey.x,
      ...params.outputRecipient.ephemeralPubkey.y,
    ]),
    encryptedNote: serializeEncryptedNote(outputEncrypted),
  }];

  // LP change commitment if any
  if (params.lpChangeAmount > 0n) {
    const lpChangeNote = createLpNote(
      params.lpChangeRecipient.stealthPubkey.x,
      params.perpsPoolId,
      params.lpChangeAmount,
      params.lpChangeRandomness
    );
    const lpChangeEncrypted = encryptLpNote(lpChangeNote, params.lpChangeRecipient.stealthPubkey);

    pendingCommitments.push({
      pool: lpPoolPda,  // LP change goes back to LP pool
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
  /** Pyth price feed ID (32 bytes) for this token */
  pythFeedId: Uint8Array;
  authority: PublicKey;
  payer: PublicKey;
}

/**
 * Build add token to pool instruction
 *
 * @param program - Anchor program instance
 * @param params - Instruction parameters including Pyth feed ID
 */
export async function buildAddTokenToPoolWithProgram(
  program: Program,
  params: AddTokenToPoolParams
): Promise<{ tx: any }> {
  const programId = program.programId;

  // Token vault is an ATA (Associated Token Account) owned by the perps pool
  const { getAssociatedTokenAddressSync } = await import('@solana/spl-token');
  const vaultPda = getAssociatedTokenAddressSync(params.tokenMint, params.perpsPool, true);

  const tx = await program.methods
    .addTokenToPool(Array.from(params.pythFeedId))
    .accountsStrict({
      perpsPool: params.perpsPool,
      tokenMint: params.tokenMint,
      tokenVault: vaultPda,
      authority: params.authority,
      payer: params.payer,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
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
// Pool Config Update Instructions
// =============================================================================

/** Parameters that can be updated on a perps pool */
export interface UpdatePoolConfigParams {
  perpsPool: PublicKey;
  authority: PublicKey;
  /** Maximum leverage (1-100), undefined to keep current */
  maxLeverage?: number;
  /** Position fee in basis points, undefined to keep current */
  positionFeeBps?: number;
  /** Maximum utilization per token in basis points, undefined to keep current */
  maxUtilizationBps?: number;
  /** Liquidation threshold in basis points, undefined to keep current */
  liquidationThresholdBps?: number;
  /** Liquidation penalty in basis points, undefined to keep current */
  liquidationPenaltyBps?: number;
  /** Base borrow rate per hour in basis points, undefined to keep current */
  baseBorrowRateBps?: number;
  /** Maximum imbalance fee in basis points, undefined to keep current */
  maxImbalanceFeeBps?: number;
  /** Pool active status (true = active, false = paused), undefined to keep current */
  isActive?: boolean;
}

/**
 * Build update pool config instruction
 *
 * Allows admin to update pool parameters such as fees, leverage limits, etc.
 * Pass undefined for any parameter to keep its current value.
 *
 * @example
 * ```ts
 * // Pause the pool
 * const { tx } = await buildUpdatePoolConfigWithProgram(program, {
 *   perpsPool,
 *   authority: wallet.publicKey,
 *   isActive: false,
 * });
 *
 * // Update fees and leverage
 * const { tx } = await buildUpdatePoolConfigWithProgram(program, {
 *   perpsPool,
 *   authority: wallet.publicKey,
 *   maxLeverage: 50,
 *   positionFeeBps: 10,
 * });
 * ```
 */
export async function buildUpdatePoolConfigWithProgram(
  program: Program,
  params: UpdatePoolConfigParams
): Promise<{ tx: any }> {
  const updateParams = {
    maxLeverage: params.maxLeverage ?? null,
    positionFeeBps: params.positionFeeBps ?? null,
    maxUtilizationBps: params.maxUtilizationBps ?? null,
    liquidationThresholdBps: params.liquidationThresholdBps ?? null,
    liquidationPenaltyBps: params.liquidationPenaltyBps ?? null,
    baseBorrowRateBps: params.baseBorrowRateBps ?? null,
    maxImbalanceFeeBps: params.maxImbalanceFeeBps ?? null,
    isActive: params.isActive ?? null,
  };

  const tx = await program.methods
    .updatePerpsPoolConfig(updateParams)
    .accountsStrict({
      perpsPool: params.perpsPool,
      authority: params.authority,
    });

  return { tx };
}

// =============================================================================
// Token Status Update Instructions
// =============================================================================

export interface UpdateTokenStatusParams {
  perpsPool: PublicKey;
  authority: PublicKey;
  /** Token index in the pool (0-7) */
  tokenIndex: number;
  /** Whether the token should be active */
  isActive: boolean;
}

/**
 * Build update token status instruction
 *
 * Allows admin to pause/unpause a specific token in the pool.
 * Paused tokens cannot be used for new positions or liquidity operations.
 *
 * @example
 * ```ts
 * // Pause token at index 1
 * const { tx } = await buildUpdateTokenStatusWithProgram(program, {
 *   perpsPool,
 *   authority: wallet.publicKey,
 *   tokenIndex: 1,
 *   isActive: false,
 * });
 * ```
 */
export async function buildUpdateTokenStatusWithProgram(
  program: Program,
  params: UpdateTokenStatusParams
): Promise<{ tx: any }> {
  const tx = await program.methods
    .updatePerpsTokenStatus(params.tokenIndex, params.isActive)
    .accountsStrict({
      perpsPool: params.perpsPool,
      authority: params.authority,
    });

  return { tx };
}

// =============================================================================
// Market Status Update Instructions
// =============================================================================

export interface UpdateMarketStatusParams {
  perpsPool: PublicKey;
  market: PublicKey;
  authority: PublicKey;
  /** Whether the market should be active */
  isActive: boolean;
}

/**
 * Build update market status instruction
 *
 * Allows admin to pause/unpause a specific market.
 * Paused markets cannot accept new positions but existing positions can still be closed.
 *
 * @example
 * ```ts
 * // Pause the SOL-PERP market
 * const { tx } = await buildUpdateMarketStatusWithProgram(program, {
 *   perpsPool,
 *   market: solPerpMarket,
 *   authority: wallet.publicKey,
 *   isActive: false,
 * });
 * ```
 */
export async function buildUpdateMarketStatusWithProgram(
  program: Program,
  params: UpdateMarketStatusParams
): Promise<{ tx: any }> {
  const tx = await program.methods
    .updatePerpsMarketStatus(params.isActive)
    .accountsStrict({
      perpsPool: params.perpsPool,
      perpsMarket: params.market,
      authority: params.authority,
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

// =============================================================================
// Liquidation Instructions (Keeper)
// =============================================================================

export interface LiquidatePositionInstructionParams {
  /** Settlement pool (where position margin comes from) */
  settlementPool: PublicKey;
  /** Perps pool */
  perpsPool: PublicKey;
  /** Market */
  market: PublicKey;
  /** Oracle for current price */
  oracle: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Merkle root */
  merkleRoot: Uint8Array;
  /** Position commitment being liquidated */
  positionCommitment: Uint8Array;
  /** Position nullifier */
  positionNullifier: Uint8Array;
  /** Owner's remainder commitment (margin - loss - penalty) */
  ownerCommitment: Uint8Array;
  /** Liquidator's reward commitment */
  liquidatorCommitment: Uint8Array;
  /** Current price from oracle */
  currentPrice: bigint;
  /** Liquidator reward amount */
  liquidatorReward: bigint;
  /** Owner remainder amount */
  ownerRemainder: bigint;
  /** Position margin */
  positionMargin: bigint;
  /** Position size */
  positionSize: bigint;
  /** Is long position */
  isLong: boolean;
  /** Keeper/liquidator */
  keeper: PublicKey;
  /** Owner stealth address (for remainder commitment) */
  ownerRecipient: StealthAddress;
  /** Liquidator stealth address (for reward commitment) */
  liquidatorRecipient: StealthAddress;
  /** Owner randomness */
  ownerRandomness: Uint8Array;
  /** Liquidator randomness */
  liquidatorRandomness: Uint8Array;
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
 * Build liquidate position multi-phase instructions
 *
 * Liquidation can happen when:
 * 1. Position is underwater (effective margin < liquidation threshold)
 * 2. Position hit profit bound (PnL >= margin, 100% gain)
 *
 * Liquidator receives penalty as reward, owner receives remainder.
 */
export async function buildLiquidatePositionWithProgram(
  program: Program,
  params: LiquidatePositionInstructionParams
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
    params.ownerCommitment,
    Date.now()
  );

  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda('perps_liquidate', programId);

  // Phase 0: Create pending with proof
  const phase0Tx = await program.methods
    .createPendingWithProofLiquidate(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(params.positionCommitment),
      Array.from(params.positionNullifier),
      Array.from(params.ownerCommitment),
      Array.from(params.liquidatorCommitment),
      new BN(params.currentPrice.toString()),
      new BN(params.liquidatorReward.toString()),
      new BN(params.ownerRemainder.toString())
    )
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      perpsMarket: params.market,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      keeper: params.keeper,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
    ]);

  // Phase 1: Verify position commitment exists
  const phase1Tx = await program.methods
    .verifyCommitmentExists(Array.from(operationId), 0, params.lightVerifyParams)
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.keeper,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 2: Create nullifier for position
  const phase2Tx = await program.methods
    .createNullifierAndPending(Array.from(operationId), 0, params.lightNullifierParams)
    .accountsStrict({
      pool: params.settlementPool,
      pendingOperation: pendingOpPda,
      relayer: params.keeper,
    })
    .remainingAccounts(params.remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  // Phase 3: Execute liquidation
  const phase3Tx = await program.methods
    .executeLiquidate(
      Array.from(operationId),
      new BN(params.positionMargin.toString()),
      new BN(params.positionSize.toString()),
      params.isLong
    )
    .accountsStrict({
      settlementPool: params.settlementPool,
      perpsPool: params.perpsPool,
      perpsMarket: params.market,
      pendingOperation: pendingOpPda,
      keeper: params.keeper,
      oracle: params.oracle,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
    ]);

  // Prepare output commitments (owner remainder + liquidator reward)
  const pendingCommitments: PendingCommitmentData[] = [];

  // Owner remainder note (if any)
  if (params.ownerRemainder > 0n) {
    const ownerNote = {
      stealthPubX: params.ownerRecipient.stealthPubkey.x,
      tokenMint: params.tokenMint,
      amount: params.ownerRemainder,
      randomness: params.ownerRandomness,
    };
    const ownerEncrypted = encryptNote(ownerNote as any, params.ownerRecipient.stealthPubkey);

    pendingCommitments.push({
      pool: params.settlementPool,
      commitment: params.ownerCommitment,
      stealthEphemeralPubkey: new Uint8Array([
        ...params.ownerRecipient.ephemeralPubkey.x,
        ...params.ownerRecipient.ephemeralPubkey.y,
      ]),
      encryptedNote: serializeEncryptedNote(ownerEncrypted),
    });
  }

  // Liquidator reward note
  if (params.liquidatorReward > 0n) {
    const liquidatorNote = {
      stealthPubX: params.liquidatorRecipient.stealthPubkey.x,
      tokenMint: params.tokenMint,
      amount: params.liquidatorReward,
      randomness: params.liquidatorRandomness,
    };
    const liquidatorEncrypted = encryptNote(liquidatorNote as any, params.liquidatorRecipient.stealthPubkey);

    pendingCommitments.push({
      pool: params.settlementPool,
      commitment: params.liquidatorCommitment,
      stealthEphemeralPubkey: new Uint8Array([
        ...params.liquidatorRecipient.ephemeralPubkey.x,
        ...params.liquidatorRecipient.ephemeralPubkey.y,
      ]),
      encryptedNote: serializeEncryptedNote(liquidatorEncrypted),
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

/**
 * Check if a position should be liquidated
 *
 * Returns true if:
 * 1. Underwater: effectiveMargin < liquidationThreshold
 * 2. At profit bound: PnL >= margin (100% gain)
 */
export function shouldLiquidate(
  position: {
    margin: bigint;
    size: bigint;
    entryPrice: bigint;
    direction: 'long' | 'short';
  },
  currentPrice: bigint,
  pool: {
    liquidationThresholdBps: number;
  }
): { shouldLiquidate: boolean; reason: 'underwater' | 'profit_bound' | null; pnl: bigint; isProfit: boolean } {
  const { margin, size, entryPrice, direction } = position;

  // Calculate PnL
  let pnl: bigint;
  let isProfit: boolean;

  if (direction === 'long') {
    if (currentPrice > entryPrice) {
      pnl = (currentPrice - entryPrice) * size / entryPrice;
      isProfit = true;
    } else {
      pnl = (entryPrice - currentPrice) * size / entryPrice;
      isProfit = false;
    }
  } else {
    if (currentPrice < entryPrice) {
      pnl = (entryPrice - currentPrice) * size / entryPrice;
      isProfit = true;
    } else {
      pnl = (currentPrice - entryPrice) * size / entryPrice;
      isProfit = false;
    }
  }

  // Check profit bound (PnL >= margin = 100% gain)
  if (isProfit && pnl >= margin) {
    return { shouldLiquidate: true, reason: 'profit_bound', pnl, isProfit };
  }

  // Check underwater (effective margin < threshold)
  const effectiveMargin = isProfit ? margin + pnl : margin - pnl;
  const liquidationThreshold = margin * BigInt(pool.liquidationThresholdBps) / 10000n;

  if (effectiveMargin < liquidationThreshold) {
    return { shouldLiquidate: true, reason: 'underwater', pnl, isProfit };
  }

  return { shouldLiquidate: false, reason: null, pnl, isProfit };
}

/**
 * Calculate liquidation amounts
 *
 * @returns Owner remainder and liquidator reward
 */
export function calculateLiquidationAmounts(
  margin: bigint,
  pnl: bigint,
  isProfit: boolean,
  liquidationPenaltyBps: number
): { ownerRemainder: bigint; liquidatorReward: bigint } {
  // Effective margin after PnL
  const effectiveMargin = isProfit ? margin + pnl : margin > pnl ? margin - pnl : 0n;

  // Liquidator reward = penalty % of original margin
  const liquidatorReward = margin * BigInt(liquidationPenaltyBps) / 10000n;

  // Owner gets remainder after penalty
  const ownerRemainder = effectiveMargin > liquidatorReward ? effectiveMargin - liquidatorReward : 0n;

  return { ownerRemainder, liquidatorReward };
}
