/**
 * Governance Instruction Builders
 *
 * Builds instructions for encrypted voting operations.
 */

import {
  PublicKey,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import type { Point, SubmitVoteParams, CreateAggregationParams } from '@cloakcraft/types';

import {
  derivePoolPda,
  deriveVerificationKeyPda,
  CIRCUIT_IDS,
} from './constants';
import { LightProtocol } from './light-helpers';

// =============================================================================
// PDA Derivation
// =============================================================================

/**
 * Derive aggregation PDA from ID
 */
export function deriveAggregationPda(
  id: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('aggregation'), Buffer.from(id)],
    programId
  );
}

// =============================================================================
// Create Aggregation
// =============================================================================

/**
 * Create aggregation instruction parameters
 */
export interface CreateAggregationInstructionParams {
  /** Unique aggregation ID */
  id: Uint8Array;
  /** Token mint for voting power */
  tokenMint: PublicKey;
  /** Election/threshold public key (32 bytes, compressed) */
  thresholdPubkey: Uint8Array;
  /** Threshold for decryption (t of n) */
  threshold: number;
  /** Number of voting options */
  numOptions: number;
  /** Voting deadline (unix timestamp) */
  deadline: number;
  /** Action domain for nullifier derivation */
  actionDomain: Uint8Array;
  /** Authority (can finalize) */
  authority: PublicKey;
  /** Payer for account creation */
  payer: PublicKey;
}

/**
 * Build create aggregation transaction
 */
export async function buildCreateAggregationWithProgram(
  program: Program,
  params: CreateAggregationInstructionParams
): Promise<any> {
  const programId = program.programId;

  // Derive PDAs
  const [aggregationPda] = deriveAggregationPda(params.id, programId);
  const [tokenPoolPda] = derivePoolPda(params.tokenMint, programId);

  // Build transaction
  const tx = await program.methods
    .createAggregation(
      Array.from(params.id),
      Array.from(params.thresholdPubkey),
      params.threshold,
      params.numOptions,
      new BN(params.deadline),
      Array.from(params.actionDomain)
    )
    .accountsStrict({
      aggregation: aggregationPda,
      tokenPool: tokenPoolPda,
      authority: params.authority,
      payer: params.payer,
      systemProgram: PublicKey.default,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ]);

  return tx;
}

// =============================================================================
// Submit Encrypted Vote
// =============================================================================

/**
 * Submit vote instruction parameters
 */
export interface SubmitVoteInstructionParams {
  /** Aggregation ID */
  aggregationId: Uint8Array;
  /** Token pool (for voting power verification) */
  tokenPool: PublicKey;
  /** Input note for voting power proof */
  input: {
    stealthPubX: Uint8Array;
    amount: bigint;
    randomness: Uint8Array;
    leafIndex: number;
    accountHash: string;
  };
  /** Action nullifier (prevents double voting) */
  actionNullifier: Uint8Array;
  /** Encrypted votes (one per option) */
  encryptedVotes: Uint8Array[];
  /** ZK proof */
  proof: Uint8Array;
  /** Relayer public key */
  relayer: PublicKey;
}

/**
 * Build submit vote transaction
 */
export async function buildSubmitVoteWithProgram(
  program: Program,
  params: SubmitVoteInstructionParams,
  rpcUrl: string
): Promise<any> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [aggregationPda] = deriveAggregationPda(params.aggregationId, programId);
  const [vkPda] = deriveVerificationKeyPda(CIRCUIT_IDS.GOVERNANCE_VOTE, programId);

  // Get Light Protocol validity proof for action nullifier
  const nullifierAddress = lightProtocol.deriveNullifierAddress(
    aggregationPda, // Use aggregation as the "pool" for nullifier derivation
    params.actionNullifier
  );

  const validityProof = await lightProtocol.getValidityProof([nullifierAddress]);
  const { accounts: remainingAccounts, outputTreeIndex, addressTreeIndex } =
    lightProtocol.buildRemainingAccounts();

  const convertedProof = LightProtocol.convertCompressedProof(validityProof);
  const lightParams = {
    nullifierProof: convertedProof,
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: validityProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex,
  };

  // Convert encrypted votes to the expected format (Vec<[u8; 64]>)
  const encryptedVotesArray = params.encryptedVotes.map(ev => Array.from(ev));

  // Build transaction
  const tx = await program.methods
    .submitEncrypted(
      Array.from(params.proof),
      Array(32).fill(0), // merkle_root (deprecated, verified by Light Protocol)
      Array.from(params.actionNullifier),
      encryptedVotesArray,
      lightParams
    )
    .accountsStrict({
      aggregation: aggregationPda,
      pool: params.tokenPool,
      verificationKey: vkPda,
      relayer: params.relayer,
    })
    .remainingAccounts(remainingAccounts)
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 800_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  return tx;
}

// =============================================================================
// Submit Decryption Share
// =============================================================================

/**
 * Submit decryption share instruction parameters
 */
export interface SubmitDecryptionShareInstructionParams {
  /** Aggregation ID */
  aggregationId: Uint8Array;
  /** Committee member index */
  memberIndex: number;
  /** Decryption shares (one per option) */
  shares: Uint8Array[];
  /** DLEQ proofs */
  dleqProofs: Uint8Array[];
  /** Committee member (signer) */
  member: PublicKey;
}

/**
 * Build submit decryption share transaction
 */
export async function buildSubmitDecryptionShareWithProgram(
  program: Program,
  params: SubmitDecryptionShareInstructionParams
): Promise<any> {
  const programId = program.programId;

  // Derive PDA
  const [aggregationPda] = deriveAggregationPda(params.aggregationId, programId);

  // Convert shares and proofs to arrays
  const sharesArray = params.shares.map(s => Array.from(s));
  const proofsArray = params.dleqProofs.map(p => Array.from(p));

  // Build transaction
  const tx = await program.methods
    .submitDecryptionShare(
      params.memberIndex,
      sharesArray,
      proofsArray
    )
    .accountsStrict({
      aggregation: aggregationPda,
      member: params.member,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
    ]);

  return tx;
}

// =============================================================================
// Finalize Decryption
// =============================================================================

/**
 * Finalize decryption instruction parameters
 */
export interface FinalizeDecryptionInstructionParams {
  /** Aggregation ID */
  aggregationId: Uint8Array;
  /** Final decrypted totals */
  totals: bigint[];
  /** Authority (signer) */
  authority: PublicKey;
}

/**
 * Build finalize decryption transaction
 */
export async function buildFinalizeDecryptionWithProgram(
  program: Program,
  params: FinalizeDecryptionInstructionParams
): Promise<any> {
  const programId = program.programId;

  // Derive PDA
  const [aggregationPda] = deriveAggregationPda(params.aggregationId, programId);

  // Convert totals to BN array
  const totalsArray = params.totals.map(t => new BN(t.toString()));

  // Build transaction
  const tx = await program.methods
    .finalizeDecryption(totalsArray)
    .accountsStrict({
      aggregation: aggregationPda,
      authority: params.authority,
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
    ]);

  return tx;
}
