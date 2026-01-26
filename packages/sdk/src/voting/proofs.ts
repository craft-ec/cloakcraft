/**
 * Voting Proof Generation
 *
 * ZK proof generation for voting operations
 */

import {
  VoteSnapshotParams,
  VoteSpendParams,
  ChangeVoteSnapshotParams,
  ClosePositionParams,
  ClaimParams,
  VoteSnapshotProofInputs,
  ClaimProofInputs,
  BalanceAttestation,
  MerkleProof,
  RevealMode,
} from './types';
import { deriveNullifierKey, deriveSpendingNullifier } from '../crypto/nullifier';
import { generateRandomness } from '../crypto/commitment';

// Domain constants (must match circuits)
const VOTE_NULLIFIER_DOMAIN = BigInt(0x10);
const VOTE_COMMITMENT_DOMAIN = BigInt(0x11);
const POSITION_DOMAIN = BigInt(0x13);
const NULLIFIER_KEY_DOMAIN = BigInt(4);

/**
 * Generate vote_snapshot proof inputs
 *
 * Note-based ownership proof: User proves they own a shielded note WITHOUT spending it.
 * The note stays intact - user just proves ownership for voting weight via merkle proof.
 */
export async function generateVoteSnapshotInputs(
  params: VoteSnapshotParams,
  revealMode: RevealMode,
  tokenMint: Uint8Array,
  eligibilityRoot: bigint = BigInt(0)
): Promise<{
  inputs: VoteSnapshotProofInputs;
  voteNullifier: Uint8Array;
  voteCommitment: Uint8Array;
  voteRandomness: Uint8Array;
}> {
  const spendingKeyBigInt = bytesToBigInt(params.stealthSpendingKey);
  const stealthPubXBigInt = bytesToBigInt(params.stealthPubX);
  const ballotIdBigInt = bytesToBigInt(params.ballotId);
  const noteCommitmentBigInt = bytesToBigInt(params.noteCommitment);
  const snapshotMerkleRootBigInt = bytesToBigInt(params.snapshotMerkleRoot);
  const tokenMintBigInt = bytesToBigInt(tokenMint);

  // Generate vote randomness
  const voteRandomness = generateRandomness();
  const voteRandomnessBigInt = bytesToBigInt(voteRandomness);

  // Derive nullifier key
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);

  // Compute vote nullifier
  const voteNullifier = computeVoteNullifier(nullifierKey, params.ballotId);
  const voteNullifierBigInt = bytesToBigInt(voteNullifier);

  // Weight (for now, weight = amount, would use formula in production)
  const amount = params.noteAmount;
  const weight = amount; // Simplified; in production: evaluate formula

  // Compute vote commitment
  const voteCommitment = computeVoteCommitment(
    params.ballotId,
    voteNullifier,
    params.stealthPubX,
    params.voteChoice,
    weight,
    voteRandomness
  );
  const voteCommitmentBigInt = bytesToBigInt(voteCommitment);

  // Convert merkle path to bigints
  const merklePathBigInt = params.merklePath.map(p => bytesToBigInt(p));
  const merklePathIndicesBigInt = params.merklePathIndices.map(i => BigInt(i));

  // Pad to 32 levels if needed
  while (merklePathBigInt.length < 32) {
    merklePathBigInt.push(BigInt(0));
    merklePathIndicesBigInt.push(BigInt(0));
  }

  // Build inputs matching circuit order
  const inputs: VoteSnapshotProofInputs = {
    // Public inputs (must match circuit order)
    ballot_id: ballotIdBigInt,
    snapshot_merkle_root: snapshotMerkleRootBigInt,
    note_commitment: noteCommitmentBigInt,
    vote_nullifier: voteNullifierBigInt,
    vote_commitment: voteCommitmentBigInt,
    amount,
    weight,
    token_mint: tokenMintBigInt,
    eligibility_root: eligibilityRoot,
    has_eligibility: eligibilityRoot !== BigInt(0) ? BigInt(1) : BigInt(0),
    vote_choice: revealMode === RevealMode.Public ? BigInt(params.voteChoice) : BigInt(0),
    is_public_mode: revealMode === RevealMode.Public ? BigInt(1) : BigInt(0),

    // Private inputs
    in_stealth_pub_x: stealthPubXBigInt,
    in_randomness: bytesToBigInt(params.noteRandomness),
    in_stealth_spending_key: spendingKeyBigInt,
    merkle_path: merklePathBigInt,
    merkle_path_indices: merklePathIndicesBigInt,
    vote_randomness: voteRandomnessBigInt,
    eligibility_path: params.eligibilityProof?.merkleProof.map(s => BigInt(s)) || Array(20).fill(BigInt(0)),
    eligibility_path_indices: params.eligibilityProof?.pathIndices.map(i => BigInt(i)) || Array(20).fill(BigInt(0)),
    private_vote_choice: BigInt(params.voteChoice),
  };

  return {
    inputs,
    voteNullifier,
    voteCommitment,
    voteRandomness,
  };
}

/**
 * Generate change_vote_snapshot proof inputs
 */
export async function generateChangeVoteSnapshotInputs(
  params: ChangeVoteSnapshotParams,
  revealMode: RevealMode,
  weight: bigint
): Promise<{
  oldVoteCommitmentNullifier: Uint8Array;
  newVoteCommitment: Uint8Array;
  newRandomness: Uint8Array;
  inputs: Record<string, bigint | bigint[]>;
}> {
  const spendingKeyBigInt = bytesToBigInt(params.stealthSpendingKey);
  const ballotIdBigInt = bytesToBigInt(params.ballotId);

  // Generate new randomness
  const newRandomness = generateRandomness();

  // Derive nullifier key
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);
  const nullifierKeyBigInt = bytesToBigInt(nullifierKey);

  // Compute vote nullifier (same as before)
  const voteNullifier = computeVoteNullifier(nullifierKey, params.ballotId);
  const voteNullifierBigInt = bytesToBigInt(voteNullifier);

  // Compute old vote commitment nullifier
  const oldVoteCommitmentNullifier = computeVoteCommitmentNullifier(
    nullifierKey,
    params.oldVoteCommitment
  );

  // Compute new vote commitment
  const pubkey = derivePublicKeyFromSpendingKey(params.stealthSpendingKey);
  const newVoteCommitment = computeVoteCommitment(
    params.ballotId,
    voteNullifier,
    pubkey,
    params.newVoteChoice,
    weight,
    newRandomness
  );

  const inputs = {
    ballotId: ballotIdBigInt,
    voteNullifier: voteNullifierBigInt,
    oldVoteCommitment: bytesToBigInt(params.oldVoteCommitment),
    oldVoteCommitmentNullifier: bytesToBigInt(oldVoteCommitmentNullifier),
    newVoteCommitment: bytesToBigInt(newVoteCommitment),
    weight,
    oldVoteChoice: revealMode === RevealMode.Public ? BigInt(params.oldVoteChoice) : BigInt(0),
    newVoteChoice: revealMode === RevealMode.Public ? BigInt(params.newVoteChoice) : BigInt(0),
    isPublicMode: revealMode === RevealMode.Public ? BigInt(1) : BigInt(0),

    // Private inputs
    spendingKey: spendingKeyBigInt,
    pubkey: bytesToBigInt(pubkey),
    oldRandomness: bytesToBigInt(params.oldRandomness),
    newRandomness: bytesToBigInt(newRandomness),
    privateOldVoteChoice: BigInt(params.oldVoteChoice),
    privateNewVoteChoice: BigInt(params.newVoteChoice),
  };

  return {
    oldVoteCommitmentNullifier,
    newVoteCommitment,
    newRandomness,
    inputs,
  };
}

/**
 * Generate vote_spend proof inputs
 */
export async function generateVoteSpendInputs(
  params: VoteSpendParams,
  revealMode: RevealMode,
  eligibilityRoot: bigint = BigInt(0)
): Promise<{
  spendingNullifier: Uint8Array;
  positionCommitment: Uint8Array;
  positionRandomness: Uint8Array;
  inputs: Record<string, bigint | bigint[]>;
}> {
  const spendingKeyBigInt = bytesToBigInt(params.stealthSpendingKey);
  const ballotIdBigInt = bytesToBigInt(params.ballotId);

  // Generate position randomness
  const positionRandomness = generateRandomness();

  // Derive nullifier key
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);

  // Compute spending nullifier for the input note
  const spendingNullifier = deriveSpendingNullifier(
    nullifierKey,
    params.noteCommitment,
    params.leafIndex
  );

  // Compute position commitment
  const pubkey = derivePublicKeyFromSpendingKey(params.stealthSpendingKey);
  const weight = params.noteAmount; // Simplified; would use formula
  const positionCommitment = computePositionCommitment(
    params.ballotId,
    pubkey,
    params.voteChoice,
    params.noteAmount,
    weight,
    positionRandomness
  );

  const inputs = {
    ballotId: ballotIdBigInt,
    merkleRoot: BigInt(0), // Would be fetched from Light Protocol
    spendingNullifier: bytesToBigInt(spendingNullifier),
    positionCommitment: bytesToBigInt(positionCommitment),
    amount: params.noteAmount,
    weight,
    tokenMint: BigInt(0), // Would be ballot.tokenMint
    eligibilityRoot,
    hasEligibility: eligibilityRoot !== BigInt(0) ? BigInt(1) : BigInt(0),
    voteChoice: revealMode === RevealMode.Public ? BigInt(params.voteChoice) : BigInt(0),
    isPublicMode: revealMode === RevealMode.Public ? BigInt(1) : BigInt(0),

    // Private inputs
    inStealthPubX: bytesToBigInt(pubkey),
    inAmount: params.noteAmount,
    inRandomness: bytesToBigInt(params.noteRandomness),
    inStealthSpendingKey: spendingKeyBigInt,
    merklePath: params.merklePath.map(p => bytesToBigInt(p)),
    merklePathIndices: params.merklePathIndices.map(i => BigInt(i)),
    leafIndex: BigInt(params.leafIndex),
    positionRandomness: bytesToBigInt(positionRandomness),
    privateVoteChoice: BigInt(params.voteChoice),
    eligibilityPath: params.eligibilityProof?.merkleProof.map(s => BigInt(s)) || Array(20).fill(BigInt(0)),
    eligibilityPathIndices: params.eligibilityProof?.pathIndices.map(i => BigInt(i)) || Array(20).fill(BigInt(0)),
  };

  return {
    spendingNullifier,
    positionCommitment,
    positionRandomness,
    inputs,
  };
}

/**
 * Generate claim proof inputs
 */
export async function generateClaimInputs(
  params: ClaimParams,
  ballot: {
    outcome: number;
    totalPool: bigint;
    winnerWeight: bigint;
    protocolFeeBps: number;
    voteType: number;
    tokenMint: Uint8Array;
    revealMode: RevealMode;
  }
): Promise<{
  positionNullifier: Uint8Array;
  payoutCommitment: Uint8Array;
  payoutRandomness: Uint8Array;
  grossPayout: bigint;
  netPayout: bigint;
  inputs: ClaimProofInputs;
}> {
  const spendingKeyBigInt = bytesToBigInt(params.stealthSpendingKey);
  const ballotIdBigInt = bytesToBigInt(params.ballotId);

  // Generate payout randomness
  const payoutRandomness = generateRandomness();

  // Derive nullifier key
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);

  // Compute position nullifier
  const positionNullifier = computePositionNullifier(
    nullifierKey,
    params.positionCommitment
  );

  // Check if winner
  const isWinner = checkIsWinner(params.voteChoice, ballot.outcome, ballot.voteType);

  // Calculate payout
  let grossPayout = BigInt(0);
  let netPayout = BigInt(0);

  if (isWinner && ballot.winnerWeight > BigInt(0)) {
    grossPayout = (params.weight * ballot.totalPool) / ballot.winnerWeight;
    const fee = (grossPayout * BigInt(ballot.protocolFeeBps)) / BigInt(10000);
    netPayout = grossPayout - fee;
  }

  // Compute payout commitment
  const pubkey = derivePublicKeyFromSpendingKey(params.stealthSpendingKey);
  const payoutCommitment = computeTokenCommitment(
    pubkey,
    ballot.tokenMint,
    netPayout,
    payoutRandomness
  );

  const isPrivateMode = ballot.revealMode === RevealMode.PermanentPrivate;

  const inputs: ClaimProofInputs = {
    ballotId: ballotIdBigInt,
    positionCommitment: bytesToBigInt(params.positionCommitment),
    positionNullifier: bytesToBigInt(positionNullifier),
    payoutCommitment: bytesToBigInt(payoutCommitment),
    grossPayout,
    netPayout,
    voteType: BigInt(ballot.voteType),
    userWeight: params.weight,
    outcome: BigInt(ballot.outcome),
    totalPool: ballot.totalPool,
    winnerWeight: ballot.winnerWeight,
    protocolFeeBps: BigInt(ballot.protocolFeeBps),
    tokenMint: bytesToBigInt(ballot.tokenMint),
    userVoteChoice: isPrivateMode ? BigInt(0) : BigInt(params.voteChoice),
    isPrivateMode: isPrivateMode ? BigInt(1) : BigInt(0),

    spendingKey: spendingKeyBigInt,
    pubkey: bytesToBigInt(pubkey),
    positionAmount: params.amount,
    positionRandomness: bytesToBigInt(params.positionRandomness),
    privateVoteChoice: BigInt(params.voteChoice),
    payoutRandomness: bytesToBigInt(payoutRandomness),
  };

  return {
    positionNullifier,
    payoutCommitment,
    payoutRandomness,
    grossPayout,
    netPayout,
    inputs,
  };
}

// ============ Helper Functions ============

import { poseidonHashDomain, fieldToBytes, bytesToField, initPoseidon } from '../crypto/poseidon';
import { derivePublicKey } from '../crypto/babyjubjub';

// BN254 scalar field modulus
const FIELD_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = BigInt(0);
  for (let i = 0; i < bytes.length; i++) {
    result = (result << BigInt(8)) | BigInt(bytes[i]);
  }
  return result;
}

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(v & BigInt(0xff));
    v >>= BigInt(8);
  }
  return bytes;
}

/**
 * Compute vote nullifier using Poseidon hash
 * vote_nullifier = hash(VOTE_NULLIFIER_DOMAIN, nullifier_key, ballot_id)
 */
function computeVoteNullifier(nullifierKey: Uint8Array, ballotId: Uint8Array): Uint8Array {
  return poseidonHashDomain(VOTE_NULLIFIER_DOMAIN, nullifierKey, ballotId);
}

/**
 * Compute vote commitment using Poseidon hash
 * vote_commitment = hash(VOTE_COMMITMENT_DOMAIN, ballot_id, vote_nullifier, pubkey, vote_choice, weight, randomness)
 */
function computeVoteCommitment(
  ballotId: Uint8Array,
  voteNullifier: Uint8Array,
  pubkey: Uint8Array,
  voteChoice: number,
  weight: bigint,
  randomness: Uint8Array
): Uint8Array {
  return poseidonHashDomain(
    VOTE_COMMITMENT_DOMAIN,
    ballotId,
    voteNullifier,
    pubkey,
    fieldToBytes(BigInt(voteChoice)),
    fieldToBytes(weight),
    randomness
  );
}

/**
 * Compute vote commitment nullifier using Poseidon hash
 * vote_commitment_nullifier = hash(VOTE_COMMITMENT_DOMAIN, nullifier_key, vote_commitment)
 */
function computeVoteCommitmentNullifier(
  nullifierKey: Uint8Array,
  voteCommitment: Uint8Array
): Uint8Array {
  return poseidonHashDomain(VOTE_COMMITMENT_DOMAIN, nullifierKey, voteCommitment);
}

/**
 * Compute position commitment using Poseidon hash
 * position_commitment = hash(POSITION_DOMAIN, ballot_id, pubkey, vote_choice, amount, weight, randomness)
 */
function computePositionCommitment(
  ballotId: Uint8Array,
  pubkey: Uint8Array,
  voteChoice: number,
  amount: bigint,
  weight: bigint,
  randomness: Uint8Array
): Uint8Array {
  return poseidonHashDomain(
    POSITION_DOMAIN,
    ballotId,
    pubkey,
    fieldToBytes(BigInt(voteChoice)),
    fieldToBytes(amount),
    fieldToBytes(weight),
    randomness
  );
}

/**
 * Compute position nullifier using Poseidon hash
 * position_nullifier = hash(POSITION_DOMAIN, nullifier_key, position_commitment)
 */
function computePositionNullifier(
  nullifierKey: Uint8Array,
  positionCommitment: Uint8Array
): Uint8Array {
  return poseidonHashDomain(POSITION_DOMAIN, nullifierKey, positionCommitment);
}

/**
 * Compute token commitment using Poseidon hash
 * token_commitment = hash(COMMITMENT_DOMAIN, pubkey, token_mint, amount, randomness)
 */
function computeTokenCommitment(
  pubkey: Uint8Array,
  tokenMint: Uint8Array,
  amount: bigint,
  randomness: Uint8Array
): Uint8Array {
  const COMMITMENT_DOMAIN = 0x01n;
  return poseidonHashDomain(
    COMMITMENT_DOMAIN,
    pubkey,
    tokenMint,
    fieldToBytes(amount),
    randomness
  );
}

/**
 * Derive public key from spending key using BabyJubJub curve
 */
function derivePublicKeyFromSpendingKey(spendingKey: Uint8Array): Uint8Array {
  // Convert spending key to bigint
  const sk = bytesToField(spendingKey);
  // Derive public key on BabyJubJub curve
  const pk = derivePublicKey(sk);
  // Return x-coordinate as bytes (32 bytes) - pk.x is already Uint8Array
  return pk.x;
}

/**
 * Parse EdDSA signature from hex string
 * Format: R8x (32) + R8y (32) + S (32) = 96 bytes total
 */
function parseEdDSASignature(sigHex: string): { r8x: bigint; r8y: bigint; s: bigint } {
  // Remove 0x prefix if present
  const hex = sigHex.startsWith('0x') ? sigHex.slice(2) : sigHex;

  if (hex.length !== 192) {
    // Return zeros for invalid signature (circuit will reject)
    return { r8x: 0n, r8y: 0n, s: 0n };
  }

  const r8xHex = hex.slice(0, 64);
  const r8yHex = hex.slice(64, 128);
  const sHex = hex.slice(128, 192);

  return {
    r8x: BigInt('0x' + r8xHex),
    r8y: BigInt('0x' + r8yHex),
    s: BigInt('0x' + sHex),
  };
}

/**
 * Convert proof inputs with bigint values to snarkjs-compatible string format
 */
export function convertInputsToSnarkjs(inputs: Record<string, bigint | bigint[]>): Record<string, string | string[]> {
  const result: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(inputs)) {
    if (Array.isArray(value)) {
      result[key] = value.map(v => v.toString());
    } else {
      result[key] = value.toString();
    }
  }
  return result;
}

/**
 * Check if a vote choice won based on vote type
 */
function checkIsWinner(voteChoice: number, outcome: number, voteType: number): boolean {
  switch (voteType) {
    case 0: // Single
    case 3: // Weighted
      return voteChoice === outcome;
    case 1: // Approval
      // vote_choice is a bitmap, check if outcome bit is set
      return (voteChoice & (1 << outcome)) !== 0;
    case 2: // Ranked (Borda count)
      // Check if outcome appears in the ranking (4 bits per rank position)
      for (let rank = 0; rank < 16; rank++) {
        const rankedOption = (voteChoice >> (rank * 4)) & 0xF;
        if (rankedOption === outcome) {
          return true;
        }
      }
      return false;
    default:
      return false;
  }
}
