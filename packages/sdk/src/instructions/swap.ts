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
  SystemProgram,
} from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import type { StealthAddress } from '@cloakcraft/types';

import {
  derivePoolPda,
  deriveCommitmentCounterPda,
  deriveVerificationKeyPda,
  deriveAmmPoolPda,
  deriveLpMintPda,
  CIRCUIT_IDS,
} from './constants';
import { LightProtocol } from './light-helpers';
import { generateRandomness } from '../crypto/commitment';
import { encryptNote, serializeEncryptedNote } from '../crypto/encryption';

// =============================================================================
// Common Types
// =============================================================================

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
// Initialize AMM Pool
// =============================================================================

/**
 * Initialize AMM pool instruction parameters
 */
/**
 * Pool type for AMM
 * 0 = ConstantProduct (x * y = k)
 * 1 = StableSwap (Curve style)
 */
export type PoolTypeParam = { constantProduct: {} } | { stableSwap: {} };

export interface InitializeAmmPoolParams {
  /** Token A mint */
  tokenAMint: PublicKey;
  /** Token B mint */
  tokenBMint: PublicKey;
  /** Fee in basis points (e.g., 30 = 0.3%) */
  feeBps: number;
  /** Authority */
  authority: PublicKey;
  /** Payer */
  payer: PublicKey;
  /** Pool type: 'constantProduct' or 'stableSwap' */
  poolType?: 'constantProduct' | 'stableSwap';
  /** Amplification coefficient for StableSwap pools (100-10000, typical: 200) */
  amplification?: number;
}

/**
 * Returns tokens in canonical order (lower pubkey first by bytes).
 * This ensures USDC-SOL and SOL-USDC always derive the same pool PDA.
 */
export function canonicalTokenOrder(
  tokenA: PublicKey,
  tokenB: PublicKey
): [PublicKey, PublicKey] {
  return tokenA.toBuffer().compare(tokenB.toBuffer()) < 0
    ? [tokenA, tokenB]
    : [tokenB, tokenA];
}

/**
 * Build initialize AMM pool transaction
 */
export async function buildInitializeAmmPoolWithProgram(
  program: Program,
  params: InitializeAmmPoolParams
): Promise<{ tx: any; lpMint: PublicKey; ammPool: PublicKey }> {
  const programId = program.programId;

  // Sort tokens into canonical order (enforced on-chain)
  const [canonicalA, canonicalB] = canonicalTokenOrder(params.tokenAMint, params.tokenBMint);

  // Derive AMM pool PDA (uses same canonical ordering)
  const [ammPoolPda] = deriveAmmPoolPda(canonicalA, canonicalB, programId);

  // Derive LP mint PDA from token pair (same canonical ordering)
  const [lpMintPda] = deriveLpMintPda(canonicalA, canonicalB, programId);

  // Convert pool type string to Anchor enum format
  const poolTypeEnum: PoolTypeParam = params.poolType === 'stableSwap'
    ? { stableSwap: {} }
    : { constantProduct: {} };

  // Amplification: default to 0 for constant product, require value for stable
  const amplification = params.amplification ?? (params.poolType === 'stableSwap' ? 200 : 0);

  // Build transaction with tokens in canonical order (use accountsPartial like scalecraft)
  const tx = program.methods
    .initializeAmmPool(
      canonicalA,
      canonicalB,
      params.feeBps,
      poolTypeEnum,
      new BN(amplification)
    )
    .accountsPartial({
      ammPool: ammPoolPda,
      lpMint: lpMintPda,
      tokenAMintAccount: canonicalA,
      tokenBMintAccount: canonicalB,
      authority: params.authority,
      payer: params.payer,
    });

  return { tx, lpMint: lpMintPda, ammPool: ammPoolPda };
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
  /** Input token mint (SPL token address) */
  inputTokenMint: PublicKey;
  /** Output token mint (SPL token address) */
  outputTokenMint: PublicKey;
  /** AMM pool state */
  ammPool: PublicKey;
  /** Input token vault (for protocol fee transfer) */
  inputVault: PublicKey;
  /** Protocol config PDA (required - enforces fee collection) */
  protocolConfig: PublicKey;
  /** Treasury ATA for input token (required if fees enabled and > 0) */
  treasuryAta?: PublicKey;
  /** Relayer public key */
  relayer: PublicKey;
  /** ZK proof bytes */
  proof: Uint8Array;
  /** Merkle root for input proof */
  merkleRoot: Uint8Array;
  /** Pre-computed nullifier */
  nullifier: Uint8Array;
  /** Pre-computed input commitment (for verification) */
  inputCommitment: Uint8Array;
  /** Input commitment account hash (from scanning) */
  accountHash: string;
  /** Input commitment leaf index */
  leafIndex: number;
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
  /** Randomness used in proof generation (MUST be same for encryption) */
  outRandomness: Uint8Array;
  changeRandomness: Uint8Array;
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
 * Build Swap Multi-Phase Transactions
 *
 * Returns all phase transactions for the multi-phase swap operation:
 * - Phase 0: createPendingWithProofSwap (verify proof + create pending)
 * - Phase 1: verifyCommitmentExists (verify input commitment)
 * - Phase 2: createNullifierAndPending (create nullifier)
 * - Phase 3: executeSwap (execute AMM swap logic)
 * - Phase 4+: createCommitment (handled by caller)
 * - Final: closePendingOperation (handled by caller)
 */
export async function buildSwapWithProgram(
  program: Program,
  params: SwapInstructionParams,
  rpcUrl: string
): Promise<{
  tx: any;           // Phase 0: createPendingWithProofSwap
  phase1Tx: any;     // Phase 1: verifyCommitmentExists
  phase2Tx: any;     // Phase 2: createNullifierAndPending
  phase3Tx: any;     // Phase 3: executeSwap
  operationId: Uint8Array;
  pendingCommitments: PendingCommitmentData[];
}> {
  console.log('[Swap] Building multi-phase transactions...');
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

  // Use the SAME randomness that was used in proof generation
  const outputRandomness = params.outRandomness;
  const changeRandomness = params.changeRandomness;

  // Create output notes for encryption
  const outputNote = {
    stealthPubX: params.outputRecipient.stealthPubkey.x,
    tokenMint: params.outputTokenMint,
    amount: params.outputAmount,
    randomness: outputRandomness,
  };

  const changeNote = {
    stealthPubX: params.changeRecipient.stealthPubkey.x,
    tokenMint: params.inputTokenMint,
    amount: params.inputAmount - params.swapAmount,
    randomness: changeRandomness,
  };

  console.log('[Swap] Output note: tokenMint:', params.outputTokenMint.toBase58(), 'amount:', params.outputAmount.toString());
  console.log('[Swap] Change note: tokenMint:', params.inputTokenMint.toBase58(), 'amount:', (params.inputAmount - params.swapAmount).toString());

  // Encrypt notes
  const encryptedOutputNote = encryptNote(outputNote, params.outputRecipient.stealthPubkey);
  const encryptedChangeNote = encryptNote(changeNote, params.changeRecipient.stealthPubkey);

  // Serialize stealth ephemeral pubkeys
  const outputEphemeralBytes = new Uint8Array(64);
  outputEphemeralBytes.set(params.outputRecipient.ephemeralPubkey.x, 0);
  outputEphemeralBytes.set(params.outputRecipient.ephemeralPubkey.y, 32);

  const changeEphemeralBytes = new Uint8Array(64);
  changeEphemeralBytes.set(params.changeRecipient.ephemeralPubkey.x, 0);
  changeEphemeralBytes.set(params.changeRecipient.ephemeralPubkey.y, 32);

  // Build pending commitments data (for Phase 4+)
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

  // SECURITY: Fetch commitment inclusion proof and nullifier non-inclusion proof
  console.log('[Swap] Fetching commitment inclusion proof...');
  const commitmentProof = await lightProtocol.getInclusionProofByHash(params.accountHash);

  console.log('[Swap] Fetching nullifier non-inclusion proof...');
  const nullifierAddress = lightProtocol.deriveNullifierAddress(params.inputPool, params.nullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);

  // Extract tree info from commitment proof
  const commitmentTree = new PublicKey(commitmentProof.treeInfo.tree);
  const commitmentQueue = new PublicKey(commitmentProof.treeInfo.queue);
  const commitmentCpiContext = commitmentProof.treeInfo.cpiContext
    ? new PublicKey(commitmentProof.treeInfo.cpiContext)
    : null;

  // Build packed accounts
  const { SystemAccountMetaConfig, PackedAccounts } = await import('@lightprotocol/stateless.js');
  const { DEVNET_V2_TREES } = await import('./constants');
  const systemConfig = SystemAccountMetaConfig.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

  // Add trees
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
  const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);

  if (commitmentCpiContext) {
    packedAccounts.insertOrGet(commitmentCpiContext);
  }

  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();

  // Build Light params for multi-phase
  const lightParams = {
    commitmentAccountHash: Array.from(new PublicKey(params.accountHash).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentStateTreeIndex,
      queuePubkeyIndex: commitmentQueueIndex,
      leafIndex: commitmentProof.leafIndex,
      rootIndex: commitmentProof.rootIndex,
    },
    commitmentInclusionProof: LightProtocol.convertCompressedProof(commitmentProof),
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  const numCommitments = 2; // Output + Change

  // ====================================================================
  // MULTI-PHASE APPEND PATTERN (same as transfer)
  // ====================================================================
  // Phase 0: Create pending operation with ZK proof verification
  // Phase 1: Verify commitment exists
  // Phase 2: Create nullifier (point of no return)
  // Phase 3: Execute swap (AMM state update)
  // Phase 4+: Create output commitments
  // Final: Close pending operation
  // ====================================================================

  console.log('[Swap Phase 0] Building createPendingWithProofSwap...');

  // Phase 0: Create Pending with Proof (Swap-specific)
  const phase0Tx = await program.methods
    .createPendingWithProofSwap(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(params.inputCommitment),
      Array.from(params.nullifier),
      Array.from(params.outputCommitment),
      Array.from(params.changeCommitment),
      new BN(params.minOutput.toString()),
      new BN(params.swapAmount.toString()),
      new BN(params.outputAmount.toString()),
      params.swapDirection === 'aToB',
      numCommitments
    )
    .accountsStrict({
      inputPool: params.inputPool,
      outputPool: params.outputPool,
      ammPool: params.ammPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 450_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[Swap Phase 1] Building verifyCommitmentExists...');

  // Phase 1: Verify Commitment Exists
  const phase1Tx = await program.methods
    .verifyCommitmentExists(
      Array.from(operationId),
      0, // commitment_index (single input for swap)
      {
        commitmentAccountHash: lightParams.commitmentAccountHash,
        commitmentMerkleContext: lightParams.commitmentMerkleContext,
        commitmentInclusionProof: lightParams.commitmentInclusionProof,
        commitmentAddressTreeInfo: lightParams.commitmentAddressTreeInfo,
      }
    )
    .accountsStrict({
      pool: params.inputPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[Swap Phase 2] Building createNullifierAndPending...');

  // Phase 2: Create Nullifier
  const phase2Tx = await program.methods
    .createNullifierAndPending(
      Array.from(operationId),
      0, // nullifier_index (single nullifier for swap)
      {
        proof: lightParams.nullifierNonInclusionProof,
        addressTreeInfo: lightParams.nullifierAddressTreeInfo,
        outputTreeIndex: lightParams.outputTreeIndex,
      }
    )
    .accountsStrict({
      pool: params.inputPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[Swap Phase 3] Building executeSwap...');

  // Phase 3: Execute Swap (AMM state update + protocol fee transfer)
  const phase3Accounts: Record<string, PublicKey> = {
    inputPool: params.inputPool,
    outputPool: params.outputPool,
    ammPool: params.ammPool,
    inputVault: params.inputVault,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    protocolConfig: params.protocolConfig, // Required
    tokenProgram: TOKEN_PROGRAM_ID,
  };

  // Treasury ATA only needed if fees are enabled
  if (params.treasuryAta) {
    phase3Accounts.treasuryAta = params.treasuryAta;
  }

  const phase3Tx = await program.methods
    .executeSwap(
      Array.from(operationId)
    )
    .accounts(phase3Accounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[Swap] All phase transactions built successfully');

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
  /** Pre-computed input commitments (for verification) */
  inputCommitmentA: Uint8Array;
  inputCommitmentB: Uint8Array;
  /** Input commitment account hashes (from scanning) */
  accountHashA: string;
  accountHashB: string;
  /** Input commitment leaf indices */
  leafIndexA: number;
  leafIndexB: number;
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
  minLpAmount: bigint;
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
 * Build Add Liquidity Multi-Phase Transactions
 *
 * Returns all phase transactions for the multi-phase add liquidity operation:
 * - Phase 0: createPendingWithProofAddLiquidity (verify proof + create pending)
 * - Phase 1a: verifyCommitmentExists (verify deposit A commitment)
 * - Phase 1b: verifyCommitmentExists (verify deposit B commitment)
 * - Phase 2a: createNullifierAndPending (create nullifier A)
 * - Phase 2b: createNullifierAndPending (create nullifier B)
 * - Phase 3: executeAddLiquidity (update AMM state)
 * - Phase 4+: createCommitment (handled by caller)
 * - Final: closePendingOperation (handled by caller)
 */
export async function buildAddLiquidityWithProgram(
  program: Program,
  params: AddLiquidityInstructionParams,
  rpcUrl: string
): Promise<{
  tx: any;           // Phase 0: createPendingWithProofAddLiquidity
  phase1aTx: any;    // Phase 1a: verifyCommitmentExists (deposit A)
  phase1bTx: any;    // Phase 1b: verifyCommitmentExists (deposit B)
  phase2aTx: any;    // Phase 2a: createNullifierAndPending (nullifier A)
  phase2bTx: any;    // Phase 2b: createNullifierAndPending (nullifier B)
  phase3Tx: any;     // Phase 3: executeAddLiquidity
  operationId: Uint8Array;
  pendingCommitments: PendingCommitmentData[];
}> {
  console.log('[AddLiquidity] Building multi-phase transactions...');
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Generate operation ID
  const operationId = generateOperationId(
    params.nullifierA,
    params.lpCommitment,
    Date.now()
  );

  // Derive PDAs
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.ADD_LIQUIDITY, programId);

  // Use the SAME randomness that was used in proof generation
  const lpRandomness = params.lpRandomness;
  const changeARandomness = params.changeARandomness;
  const changeBRandomness = params.changeBRandomness;

  // Create output notes for encryption
  const lpNote = {
    stealthPubX: params.lpRecipient.stealthPubkey.x,
    tokenMint: params.lpMint,
    amount: params.lpAmount,
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

  console.log('[AddLiquidity] LP note: amount:', params.lpAmount.toString());
  console.log('[AddLiquidity] Change A note: amount:', (params.inputAAmount - params.depositA).toString());
  console.log('[AddLiquidity] Change B note: amount:', (params.inputBAmount - params.depositB).toString());

  // Encrypt notes
  const encryptedLp = encryptNote(lpNote, params.lpRecipient.stealthPubkey);
  const encryptedChangeA = encryptNote(changeANote, params.changeARecipient.stealthPubkey);
  const encryptedChangeB = encryptNote(changeBNote, params.changeBRecipient.stealthPubkey);

  // Serialize stealth ephemeral pubkeys
  const lpEphemeral = new Uint8Array(64);
  lpEphemeral.set(params.lpRecipient.ephemeralPubkey.x, 0);
  lpEphemeral.set(params.lpRecipient.ephemeralPubkey.y, 32);

  const changeAEphemeral = new Uint8Array(64);
  changeAEphemeral.set(params.changeARecipient.ephemeralPubkey.x, 0);
  changeAEphemeral.set(params.changeARecipient.ephemeralPubkey.y, 32);

  const changeBEphemeral = new Uint8Array(64);
  changeBEphemeral.set(params.changeBRecipient.ephemeralPubkey.x, 0);
  changeBEphemeral.set(params.changeBRecipient.ephemeralPubkey.y, 32);

  // Build pending commitments data (for Phase 4+)
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

  // SECURITY: Fetch commitment inclusion proofs for BOTH inputs
  console.log('[AddLiquidity] Fetching commitment A inclusion proof...');
  const commitmentAProof = await lightProtocol.getInclusionProofByHash(params.accountHashA);

  console.log('[AddLiquidity] Fetching commitment B inclusion proof...');
  const commitmentBProof = await lightProtocol.getInclusionProofByHash(params.accountHashB);

  console.log('[AddLiquidity] Fetching nullifier A non-inclusion proof...');
  const nullifierAAddress = lightProtocol.deriveNullifierAddress(params.poolA, params.nullifierA);
  const nullifierAProof = await lightProtocol.getValidityProof([nullifierAAddress]);

  console.log('[AddLiquidity] Fetching nullifier B non-inclusion proof...');
  const nullifierBAddress = lightProtocol.deriveNullifierAddress(params.poolB, params.nullifierB);
  const nullifierBProof = await lightProtocol.getValidityProof([nullifierBAddress]);

  // Extract tree info from commitment proofs
  const commitmentATree = new PublicKey(commitmentAProof.treeInfo.tree);
  const commitmentAQueue = new PublicKey(commitmentAProof.treeInfo.queue);
  const commitmentACpiContext = commitmentAProof.treeInfo.cpiContext
    ? new PublicKey(commitmentAProof.treeInfo.cpiContext)
    : null;

  const commitmentBTree = new PublicKey(commitmentBProof.treeInfo.tree);
  const commitmentBQueue = new PublicKey(commitmentBProof.treeInfo.queue);
  const commitmentBCpiContext = commitmentBProof.treeInfo.cpiContext
    ? new PublicKey(commitmentBProof.treeInfo.cpiContext)
    : null;

  // Build packed accounts
  const { SystemAccountMetaConfig, PackedAccounts } = await import('@lightprotocol/stateless.js');
  const { DEVNET_V2_TREES } = await import('./constants');
  const systemConfig = SystemAccountMetaConfig.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

  // Add trees
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const commitmentAStateTreeIndex = packedAccounts.insertOrGet(commitmentATree);
  const commitmentAQueueIndex = packedAccounts.insertOrGet(commitmentAQueue);
  const commitmentBStateTreeIndex = packedAccounts.insertOrGet(commitmentBTree);
  const commitmentBQueueIndex = packedAccounts.insertOrGet(commitmentBQueue);

  if (commitmentACpiContext) {
    packedAccounts.insertOrGet(commitmentACpiContext);
  }
  if (commitmentBCpiContext) {
    packedAccounts.insertOrGet(commitmentBCpiContext);
  }

  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();

  // Build Light params for commitment A verification
  const lightParamsA = {
    commitmentAccountHash: Array.from(new PublicKey(params.accountHashA).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentAStateTreeIndex,
      queuePubkeyIndex: commitmentAQueueIndex,
      leafIndex: commitmentAProof.leafIndex,
      rootIndex: commitmentAProof.rootIndex,
    },
    commitmentInclusionProof: LightProtocol.convertCompressedProof(commitmentAProof),
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierAProof.rootIndices[0] ?? 0,
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierAProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierAProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  // Build Light params for commitment B verification
  const lightParamsB = {
    commitmentAccountHash: Array.from(new PublicKey(params.accountHashB).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentBStateTreeIndex,
      queuePubkeyIndex: commitmentBQueueIndex,
      leafIndex: commitmentBProof.leafIndex,
      rootIndex: commitmentBProof.rootIndex,
    },
    commitmentInclusionProof: LightProtocol.convertCompressedProof(commitmentBProof),
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierBProof.rootIndices[0] ?? 0,
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierBProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierBProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  const numCommitments = 3; // LP + Change A + Change B

  // ====================================================================
  // MULTI-PHASE APPEND PATTERN (same as transfer, but with 2 inputs)
  // ====================================================================
  // Phase 0: Create pending operation with ZK proof verification
  // Phase 1a: Verify deposit A commitment exists
  // Phase 1b: Verify deposit B commitment exists
  // Phase 2a: Create nullifier A (point of no return for input A)
  // Phase 2b: Create nullifier B (point of no return for input B)
  // Phase 3: Execute add liquidity (AMM state update)
  // Phase 4+: Create output commitments
  // Final: Close pending operation
  // ====================================================================

  console.log('[AddLiquidity Phase 0] Building createPendingWithProofAddLiquidity...');

  // Phase 0: Create Pending with Proof (AddLiquidity-specific)
  const phase0Tx = await program.methods
    .createPendingWithProofAddLiquidity(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.inputCommitmentA),
      Array.from(params.inputCommitmentB),
      Array.from(params.nullifierA),
      Array.from(params.nullifierB),
      Array.from(params.lpCommitment),
      Array.from(params.changeACommitment),
      Array.from(params.changeBCommitment),
      new BN(params.depositA.toString()),
      new BN(params.depositB.toString()),
      new BN(params.lpAmount.toString()),
      new BN(params.minLpAmount.toString()),
      numCommitments
    )
    .accountsStrict({
      poolA: params.poolA,
      poolB: params.poolB,
      lpPool: params.lpPool,
      ammPool: params.ammPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 450_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[AddLiquidity Phase 1a] Building verifyCommitmentExists for deposit A...');

  // Phase 1a: Verify Deposit A Commitment Exists
  const phase1aTx = await program.methods
    .verifyCommitmentExists(
      Array.from(operationId),
      0, // commitment_index for input A
      {
        commitmentAccountHash: lightParamsA.commitmentAccountHash,
        commitmentMerkleContext: lightParamsA.commitmentMerkleContext,
        commitmentInclusionProof: lightParamsA.commitmentInclusionProof,
        commitmentAddressTreeInfo: lightParamsA.commitmentAddressTreeInfo,
      }
    )
    .accountsStrict({
      pool: params.poolA,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[AddLiquidity Phase 1b] Building verifyCommitmentExists for deposit B...');

  // Phase 1b: Verify Deposit B Commitment Exists
  const phase1bTx = await program.methods
    .verifyCommitmentExists(
      Array.from(operationId),
      1, // commitment_index for input B
      {
        commitmentAccountHash: lightParamsB.commitmentAccountHash,
        commitmentMerkleContext: lightParamsB.commitmentMerkleContext,
        commitmentInclusionProof: lightParamsB.commitmentInclusionProof,
        commitmentAddressTreeInfo: lightParamsB.commitmentAddressTreeInfo,
      }
    )
    .accountsStrict({
      pool: params.poolB,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[AddLiquidity Phase 2a] Building createNullifierAndPending for deposit A...');

  // Phase 2a: Create Nullifier A
  const phase2aTx = await program.methods
    .createNullifierAndPending(
      Array.from(operationId),
      0, // nullifier_index for input A
      {
        proof: lightParamsA.nullifierNonInclusionProof,
        addressTreeInfo: lightParamsA.nullifierAddressTreeInfo,
        outputTreeIndex: lightParamsA.outputTreeIndex,
      }
    )
    .accountsStrict({
      pool: params.poolA,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[AddLiquidity Phase 2b] Building createNullifierAndPending for deposit B...');

  // Phase 2b: Create Nullifier B
  const phase2bTx = await program.methods
    .createNullifierAndPending(
      Array.from(operationId),
      1, // nullifier_index for input B
      {
        proof: lightParamsB.nullifierNonInclusionProof,
        addressTreeInfo: lightParamsB.nullifierAddressTreeInfo,
        outputTreeIndex: lightParamsB.outputTreeIndex,
      }
    )
    .accountsStrict({
      pool: params.poolB,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[AddLiquidity Phase 3] Building executeAddLiquidity...');

  // Phase 3: Execute Add Liquidity (AMM state update)
  const phase3Tx = await program.methods
    .executeAddLiquidity(
      Array.from(operationId),
      new BN(params.minLpAmount.toString())
    )
    .accountsStrict({
      poolA: params.poolA,
      poolB: params.poolB,
      lpPool: params.lpPool,
      ammPool: params.ammPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 100_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[AddLiquidity] All phase transactions built successfully');

  return {
    tx: phase0Tx,
    phase1aTx,
    phase1bTx,
    phase2aTx,
    phase2bTx,
    phase3Tx,
    operationId,
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
  /** Nullifier value (optional, if not provided will fetch from PendingOperation) */
  nullifier?: Uint8Array;
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

  // Get nullifier (either from params or fetch from PendingOperation)
  let nullifier: Uint8Array;
  if (params.nullifier) {
    // Versioned transaction: nullifier provided directly
    nullifier = params.nullifier;
    console.log(`[Phase 2] Using provided nullifier: ${Buffer.from(nullifier).toString('hex').slice(0, 16)}...`);
  } else {
    // Sequential execution: fetch from PendingOperation
    console.log(`[Phase 2] Fetching PendingOperation: ${pendingOpPda.toBase58()}`);
    console.log(`[Phase 2] Operation ID: ${Buffer.from(params.operationId).toString('hex').slice(0, 16)}...`);
    const pendingOp = await (program.account as any).pendingOperation.fetch(pendingOpPda);
    nullifier = new Uint8Array(pendingOp.nullifiers[params.nullifierIndex]);
    console.log(`[Phase 2] Fetched nullifier from PendingOp: ${Buffer.from(nullifier).toString('hex').slice(0, 16)}...`);
  }

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
  /** Commitment value (optional, if not provided will fetch from PendingOperation) */
  commitment?: Uint8Array;
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

  // Get commitment (either from params or fetch from PendingOperation)
  let commitment: Uint8Array;
  if (params.commitment) {
    // Versioned transaction: commitment provided directly
    commitment = params.commitment;
    console.log(`[Phase 3] Using provided commitment: ${Buffer.from(commitment).toString('hex').slice(0, 16)}...`);
  } else {
    // Sequential execution: fetch from PendingOperation
    const pendingOp = await (program.account as any).pendingOperation.fetch(pendingOpPda);
    commitment = new Uint8Array(pendingOp.commitments[params.commitmentIndex]);
    console.log(`[Phase 3] Fetched commitment from PendingOp: ${Buffer.from(commitment).toString('hex').slice(0, 16)}...`);
  }

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
  /** Token A mint (SPL token address) */
  tokenAMint: PublicKey;
  /** Token B mint (SPL token address) */
  tokenBMint: PublicKey;
  /** AMM pool state */
  ammPool: PublicKey;
  /** Token A vault (for protocol fee transfer) */
  vaultA: PublicKey;
  /** Token B vault (for protocol fee transfer) */
  vaultB: PublicKey;
  /** Protocol config PDA (required - enforces fee collection) */
  protocolConfig: PublicKey;
  /** Treasury ATA for token A (required if fees enabled and > 0) */
  treasuryAtaA?: PublicKey;
  /** Treasury ATA for token B (required if fees enabled and > 0) */
  treasuryAtaB?: PublicKey;
  /** Relayer */
  relayer: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Pre-computed values */
  lpNullifier: Uint8Array;
  /** Pre-computed LP input commitment (for verification) */
  lpInputCommitment: Uint8Array;
  /** LP input commitment account hash (from scanning) */
  accountHash: string;
  /** LP input commitment leaf index */
  leafIndex: number;
  outputACommitment: Uint8Array;
  outputBCommitment: Uint8Array;
  oldPoolStateHash: Uint8Array;
  newPoolStateHash: Uint8Array;
  /** Recipients */
  outputARecipient: StealthAddress;
  outputBRecipient: StealthAddress;
  /** LP amount being removed */
  lpAmount: bigint;
  /** Output amounts */
  outputAAmount: bigint;
  outputBAmount: bigint;
  /** Randomness used in proof generation */
  outputARandomness: Uint8Array;
  outputBRandomness: Uint8Array;
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
 * Build Remove Liquidity Multi-Phase Transactions
 *
 * Returns all phase transactions for the multi-phase remove liquidity operation:
 * - Phase 0: createPendingWithProofRemoveLiquidity (verify proof + create pending)
 * - Phase 1: verifyCommitmentExists (verify LP commitment)
 * - Phase 2: createNullifierAndPending (create LP nullifier)
 * - Phase 3: executeRemoveLiquidity (update AMM state)
 * - Phase 4+: createCommitment (handled by caller)
 * - Final: closePendingOperation (handled by caller)
 */
export async function buildRemoveLiquidityWithProgram(
  program: Program,
  params: RemoveLiquidityInstructionParams,
  rpcUrl: string
): Promise<{
  tx: any;           // Phase 0: createPendingWithProofRemoveLiquidity
  phase1Tx: any;     // Phase 1: verifyCommitmentExists
  phase2Tx: any;     // Phase 2: createNullifierAndPending
  phase3Tx: any;     // Phase 3: executeRemoveLiquidity
  operationId: Uint8Array;
  pendingCommitments: PendingCommitmentData[];
}> {
  console.log('[RemoveLiquidity] Building multi-phase transactions...');
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Generate operation ID
  const operationId = generateOperationId(
    params.lpNullifier,
    params.outputACommitment,
    Date.now()
  );

  // Derive PDAs
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.REMOVE_LIQUIDITY, programId);

  // Use randomness from proof generation (to match commitments)
  const outputARandomness = params.outputARandomness;
  const outputBRandomness = params.outputBRandomness;

  // Create output notes for encryption
  const outputANote = {
    stealthPubX: params.outputARecipient.stealthPubkey.x,
    tokenMint: params.tokenAMint,
    amount: params.outputAAmount,
    randomness: outputARandomness,
  };
  const outputBNote = {
    stealthPubX: params.outputBRecipient.stealthPubkey.x,
    tokenMint: params.tokenBMint,
    amount: params.outputBAmount,
    randomness: outputBRandomness,
  };

  console.log('[RemoveLiquidity] Output A note: amount:', params.outputAAmount.toString());
  console.log('[RemoveLiquidity] Output B note: amount:', params.outputBAmount.toString());

  // Encrypt notes
  const encryptedOutputA = encryptNote(outputANote, params.outputARecipient.stealthPubkey);
  const encryptedOutputB = encryptNote(outputBNote, params.outputBRecipient.stealthPubkey);

  // Serialize stealth ephemeral pubkeys
  const outputAEphemeral = new Uint8Array(64);
  outputAEphemeral.set(params.outputARecipient.ephemeralPubkey.x, 0);
  outputAEphemeral.set(params.outputARecipient.ephemeralPubkey.y, 32);

  const outputBEphemeral = new Uint8Array(64);
  outputBEphemeral.set(params.outputBRecipient.ephemeralPubkey.x, 0);
  outputBEphemeral.set(params.outputBRecipient.ephemeralPubkey.y, 32);

  // Build pending commitments data (for Phase 4+)
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

  // SECURITY: Fetch commitment inclusion proof and nullifier non-inclusion proof
  console.log('[RemoveLiquidity] Fetching LP commitment inclusion proof...');
  const commitmentProof = await lightProtocol.getInclusionProofByHash(params.accountHash);

  console.log('[RemoveLiquidity] Fetching LP nullifier non-inclusion proof...');
  const nullifierAddress = lightProtocol.deriveNullifierAddress(params.lpPool, params.lpNullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);

  // Extract tree info from commitment proof
  const commitmentTree = new PublicKey(commitmentProof.treeInfo.tree);
  const commitmentQueue = new PublicKey(commitmentProof.treeInfo.queue);
  const commitmentCpiContext = commitmentProof.treeInfo.cpiContext
    ? new PublicKey(commitmentProof.treeInfo.cpiContext)
    : null;

  // Build packed accounts
  const { SystemAccountMetaConfig, PackedAccounts } = await import('@lightprotocol/stateless.js');
  const { DEVNET_V2_TREES } = await import('./constants');
  const systemConfig = SystemAccountMetaConfig.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

  // Add trees
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);
  const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
  const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);

  if (commitmentCpiContext) {
    packedAccounts.insertOrGet(commitmentCpiContext);
  }

  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();

  // Build Light params for multi-phase
  const lightParams = {
    commitmentAccountHash: Array.from(new PublicKey(params.accountHash).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentStateTreeIndex,
      queuePubkeyIndex: commitmentQueueIndex,
      leafIndex: commitmentProof.leafIndex,
      rootIndex: commitmentProof.rootIndex,
    },
    commitmentInclusionProof: LightProtocol.convertCompressedProof(commitmentProof),
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  const numCommitments = 2; // Output A + Output B

  // ====================================================================
  // MULTI-PHASE APPEND PATTERN (same as transfer, with 1 input)
  // ====================================================================
  // Phase 0: Create pending operation with ZK proof verification
  // Phase 1: Verify LP commitment exists
  // Phase 2: Create LP nullifier (point of no return)
  // Phase 3: Execute remove liquidity (AMM state update)
  // Phase 4+: Create output commitments
  // Final: Close pending operation
  // ====================================================================

  console.log('[RemoveLiquidity Phase 0] Building createPendingWithProofRemoveLiquidity...');

  // Phase 0: Create Pending with Proof (RemoveLiquidity-specific)
  const phase0Tx = await program.methods
    .createPendingWithProofRemoveLiquidity(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.lpInputCommitment),
      Array.from(params.lpNullifier),
      Array.from(params.outputACommitment),
      Array.from(params.outputBCommitment),
      Array.from(params.oldPoolStateHash),
      Array.from(params.newPoolStateHash),
      new BN(params.lpAmount.toString()),
      new BN(params.outputAAmount.toString()),
      new BN(params.outputBAmount.toString()),
      numCommitments
    )
    .accountsStrict({
      lpPool: params.lpPool,
      poolA: params.poolA,
      poolB: params.poolB,
      ammPool: params.ammPool,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 450_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[RemoveLiquidity Phase 1] Building verifyCommitmentExists...');

  // Phase 1: Verify LP Commitment Exists
  const phase1Tx = await program.methods
    .verifyCommitmentExists(
      Array.from(operationId),
      0, // commitment_index (single LP input)
      {
        commitmentAccountHash: lightParams.commitmentAccountHash,
        commitmentMerkleContext: lightParams.commitmentMerkleContext,
        commitmentInclusionProof: lightParams.commitmentInclusionProof,
        commitmentAddressTreeInfo: lightParams.commitmentAddressTreeInfo,
      }
    )
    .accountsStrict({
      pool: params.lpPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[RemoveLiquidity Phase 2] Building createNullifierAndPending...');

  // Phase 2: Create LP Nullifier
  const phase2Tx = await program.methods
    .createNullifierAndPending(
      Array.from(operationId),
      0, // nullifier_index (single LP nullifier)
      {
        proof: lightParams.nullifierNonInclusionProof,
        addressTreeInfo: lightParams.nullifierAddressTreeInfo,
        outputTreeIndex: lightParams.outputTreeIndex,
      }
    )
    .accountsStrict({
      pool: params.lpPool,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[RemoveLiquidity Phase 3] Building executeRemoveLiquidity...');

  // Phase 3: Execute Remove Liquidity (AMM state update + protocol fee transfer)
  const phase3Accounts: Record<string, PublicKey> = {
    lpPool: params.lpPool,
    poolA: params.poolA,
    poolB: params.poolB,
    ammPool: params.ammPool,
    vaultA: params.vaultA,
    vaultB: params.vaultB,
    pendingOperation: pendingOpPda,
    relayer: params.relayer,
    protocolConfig: params.protocolConfig,
    tokenProgram: TOKEN_PROGRAM_ID,
  };

  // Treasury ATAs only needed if fees are enabled
  if (params.treasuryAtaA) {
    phase3Accounts.treasuryAtaA = params.treasuryAtaA;
  }
  if (params.treasuryAtaB) {
    phase3Accounts.treasuryAtaB = params.treasuryAtaB;
  }

  const phase3Tx = await program.methods
    .executeRemoveLiquidity(
      Array.from(operationId),
      Array.from(params.newPoolStateHash)
    )
    .accounts(phase3Accounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  console.log('[RemoveLiquidity] All phase transactions built successfully');

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
// Close Pending Operation
// =============================================================================

// NOTE: buildClosePendingOperationWithProgram is defined earlier in this file

// =============================================================================
// Versioned Transaction Support
// =============================================================================

/**
 * Build all swap instructions for atomic execution (Versioned Transaction)
 *
 * This builds all phases (1-4) as individual instructions that can be combined
 * into a single versioned transaction for atomic execution.
 *
 * @returns Array of instructions in execution order
 */

