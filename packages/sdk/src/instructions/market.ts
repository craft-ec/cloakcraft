/**
 * Market Order Instruction Builders
 *
 * Builds instructions for fill order and cancel order operations.
 */

import {
  PublicKey,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import type { StealthAddress, OrderState } from '@cloakcraft/types';

import {
  derivePoolPda,
  deriveCommitmentCounterPda,
  deriveVerificationKeyPda,
  CIRCUIT_IDS,
} from './constants';
import { LightProtocol } from './light-helpers';
import { computeCommitment, generateRandomness } from '../crypto/commitment';
import { encryptNote, serializeEncryptedNote } from '../crypto/encryption';

// =============================================================================
// Order PDA Derivation
// =============================================================================

/**
 * Derive order PDA from order ID
 */
export function deriveOrderPda(
  orderId: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('order'), Buffer.from(orderId)],
    programId
  );
}

// =============================================================================
// Fill Order Types
// =============================================================================

/**
 * Fill order instruction parameters
 */
export interface FillOrderInstructionParams {
  /** Maker pool (offers this token) */
  makerPool: PublicKey;
  /** Taker pool (pays with this token) */
  takerPool: PublicKey;
  /** Order ID */
  orderId: Uint8Array;
  /** Taker input note details */
  takerInput: {
    stealthPubX: Uint8Array;
    amount: bigint;
    randomness: Uint8Array;
    leafIndex: number;
    accountHash: string;
  };
  /** Maker output recipient (receives taker's tokens) */
  makerOutputRecipient: StealthAddress;
  /** Taker output recipient (receives maker's escrowed tokens) */
  takerOutputRecipient: StealthAddress;
  /** Taker change recipient */
  takerChangeRecipient: StealthAddress;
  /** Relayer public key */
  relayer: PublicKey;
  /** Maker proof bytes */
  makerProof: Uint8Array;
  /** Taker proof bytes */
  takerProof: Uint8Array;
  /** Pre-computed escrow nullifier */
  escrowNullifier: Uint8Array;
  /** Pre-computed taker nullifier */
  takerNullifier: Uint8Array;
  /** Pre-computed maker output commitment */
  makerOutCommitment: Uint8Array;
  /** Pre-computed taker output commitment */
  takerOutCommitment: Uint8Array;
  /** Order terms */
  orderTerms: {
    offerAmount: bigint;
    requestAmount: bigint;
  };
}

/**
 * Fill order result
 */
export interface FillOrderResult {
  escrowNullifier: Uint8Array;
  takerNullifier: Uint8Array;
  makerOutCommitment: Uint8Array;
  takerOutCommitment: Uint8Array;
  encryptedNotes: Buffer[];
  randomness: Uint8Array[];
  stealthEphemeralPubkeys: Uint8Array[];
}

/**
 * Build fill order transaction
 */
export async function buildFillOrderWithProgram(
  program: Program,
  params: FillOrderInstructionParams,
  rpcUrl: string
): Promise<{
  tx: any;
  result: FillOrderResult;
}> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [orderPda] = deriveOrderPda(params.orderId, programId);
  const [makerCounterPda] = deriveCommitmentCounterPda(params.makerPool, programId);
  const [takerCounterPda] = deriveCommitmentCounterPda(params.takerPool, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.ORDER_FILL, programId);

  // Generate randomness for outputs
  const makerOutRandomness = generateRandomness();
  const takerOutRandomness = generateRandomness();

  // Encrypt output notes
  const makerNote = {
    stealthPubX: params.makerOutputRecipient.stealthPubkey.x,
    tokenMint: params.takerPool, // Maker receives taker's tokens
    amount: params.orderTerms.requestAmount,
    randomness: makerOutRandomness,
  };

  const takerNote = {
    stealthPubX: params.takerOutputRecipient.stealthPubkey.x,
    tokenMint: params.makerPool, // Taker receives maker's tokens
    amount: params.orderTerms.offerAmount,
    randomness: takerOutRandomness,
  };

  const encryptedMakerNote = encryptNote(makerNote, params.makerOutputRecipient.stealthPubkey);
  const encryptedTakerNote = encryptNote(takerNote, params.takerOutputRecipient.stealthPubkey);

  // Get Light Protocol validity proofs for all addresses
  const addresses = [
    lightProtocol.deriveNullifierAddress(params.makerPool, params.escrowNullifier),
    lightProtocol.deriveNullifierAddress(params.takerPool, params.takerNullifier),
    lightProtocol.deriveCommitmentAddress(params.takerPool, params.makerOutCommitment),
    lightProtocol.deriveCommitmentAddress(params.makerPool, params.takerOutCommitment),
  ];

  const validityProof = await lightProtocol.getValidityProof(addresses);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } =
    lightProtocol.buildRemainingAccounts();

  // Build Light params (simplified - actual struct matches on-chain)
  const convertedProof = LightProtocol.convertCompressedProof(validityProof);
  const baseAddressTreeInfo = {
    addressMerkleTreePubkeyIndex: addressTreeIndex,
    addressQueuePubkeyIndex: addressTreeIndex,
    rootIndex: validityProof.rootIndices[0] ?? 0,
  };

  const lightParams = {
    escrowNullifierProof: convertedProof,
    escrowNullifierAddressTreeInfo: baseAddressTreeInfo,
    takerNullifierProof: convertedProof,
    takerNullifierAddressTreeInfo: baseAddressTreeInfo,
    makerCommitmentProof: convertedProof,
    makerCommitmentAddressTreeInfo: baseAddressTreeInfo,
    takerCommitmentProof: convertedProof,
    takerCommitmentAddressTreeInfo: baseAddressTreeInfo,
    outputTreeIndex,
  };

  // Build transaction
  const tx = await program.methods
    .fillOrder(
      Array.from(params.makerProof),
      Array.from(params.takerProof),
      Array.from(params.escrowNullifier),
      Array.from(params.takerNullifier),
      Array.from(params.orderId),
      Array.from(params.makerOutCommitment),
      Array.from(params.takerOutCommitment),
      [
        Buffer.from(serializeEncryptedNote(encryptedMakerNote)),
        Buffer.from(serializeEncryptedNote(encryptedTakerNote)),
      ],
      lightParams
    )
    .accountsStrict({
      makerPool: params.makerPool,
      makerCommitmentCounter: makerCounterPda,
      takerPool: params.takerPool,
      takerCommitmentCounter: takerCounterPda,
      order: orderPda,
      verificationKey: vkPda,
      relayer: params.relayer,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return {
    tx,
    result: {
      escrowNullifier: params.escrowNullifier,
      takerNullifier: params.takerNullifier,
      makerOutCommitment: params.makerOutCommitment,
      takerOutCommitment: params.takerOutCommitment,
      encryptedNotes: [
        Buffer.from(serializeEncryptedNote(encryptedMakerNote)),
        Buffer.from(serializeEncryptedNote(encryptedTakerNote)),
      ],
      randomness: [makerOutRandomness, takerOutRandomness],
      stealthEphemeralPubkeys: [],
    },
  };
}

// =============================================================================
// Cancel Order Types
// =============================================================================

/**
 * Cancel order instruction parameters
 */
export interface CancelOrderInstructionParams {
  /** Pool */
  pool: PublicKey;
  /** Order ID */
  orderId: Uint8Array;
  /** Refund recipient */
  refundRecipient: StealthAddress;
  /** Relayer public key */
  relayer: PublicKey;
  /** ZK proof */
  proof: Uint8Array;
  /** Pre-computed escrow nullifier */
  escrowNullifier: Uint8Array;
  /** Pre-computed refund commitment */
  refundCommitment: Uint8Array;
  /** Escrowed amount (for encrypted note) */
  escrowedAmount: bigint;
}

/**
 * Cancel order result
 */
export interface CancelOrderResult {
  escrowNullifier: Uint8Array;
  refundCommitment: Uint8Array;
  encryptedNote: Buffer;
  randomness: Uint8Array;
  stealthEphemeralPubkey: Uint8Array;
}

/**
 * Build cancel order transaction
 */
export async function buildCancelOrderWithProgram(
  program: Program,
  params: CancelOrderInstructionParams,
  rpcUrl: string
): Promise<{
  tx: any;
  result: CancelOrderResult;
}> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [orderPda] = deriveOrderPda(params.orderId, programId);
  const [counterPda] = deriveCommitmentCounterPda(params.pool, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.ORDER_CANCEL, programId);

  // Generate randomness for refund output
  const refundRandomness = generateRandomness();

  // Encrypt refund note
  const refundNote = {
    stealthPubX: params.refundRecipient.stealthPubkey.x,
    tokenMint: params.pool,
    amount: params.escrowedAmount,
    randomness: refundRandomness,
  };

  const encryptedRefundNote = encryptNote(refundNote, params.refundRecipient.stealthPubkey);

  // Serialize ephemeral pubkey
  const ephemeralBytes = new Uint8Array(64);
  ephemeralBytes.set(params.refundRecipient.ephemeralPubkey.x, 0);
  ephemeralBytes.set(params.refundRecipient.ephemeralPubkey.y, 32);

  // Get Light Protocol validity proofs
  const addresses = [
    lightProtocol.deriveNullifierAddress(params.pool, params.escrowNullifier),
    lightProtocol.deriveCommitmentAddress(params.pool, params.refundCommitment),
  ];

  const validityProof = await lightProtocol.getValidityProof(addresses);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } =
    lightProtocol.buildRemainingAccounts();

  const convertedProof = LightProtocol.convertCompressedProof(validityProof);
  const baseAddressTreeInfo = {
    addressMerkleTreePubkeyIndex: addressTreeIndex,
    addressQueuePubkeyIndex: addressTreeIndex,
    rootIndex: validityProof.rootIndices[0] ?? 0,
  };

  const lightParams = {
    nullifierProof: convertedProof,
    nullifierAddressTreeInfo: baseAddressTreeInfo,
    commitmentProof: convertedProof,
    commitmentAddressTreeInfo: baseAddressTreeInfo,
    outputTreeIndex,
  };

  // Build transaction
  const tx = await program.methods
    .cancelOrder(
      Array.from(params.proof),
      Array.from(params.escrowNullifier),
      Array.from(params.orderId),
      Array.from(params.refundCommitment),
      Buffer.from(serializeEncryptedNote(encryptedRefundNote)),
      lightParams
    )
    .accountsStrict({
      pool: params.pool,
      commitmentCounter: counterPda,
      order: orderPda,
      verificationKey: vkPda,
      relayer: params.relayer,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return {
    tx,
    result: {
      escrowNullifier: params.escrowNullifier,
      refundCommitment: params.refundCommitment,
      encryptedNote: Buffer.from(serializeEncryptedNote(encryptedRefundNote)),
      randomness: refundRandomness,
      stealthEphemeralPubkey: ephemeralBytes,
    },
  };
}
