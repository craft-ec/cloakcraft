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
 */
export async function generateVoteSnapshotInputs(
  params: VoteSnapshotParams,
  revealMode: RevealMode,
  numOptions: number,
  indexerPubkeyX: bigint,
  indexerPubkeyY: bigint,
  eligibilityRoot: bigint = BigInt(0)
): Promise<{
  inputs: VoteSnapshotProofInputs;
  voteNullifier: Uint8Array;
  voteCommitment: Uint8Array;
  randomness: Uint8Array;
}> {
  const spendingKeyBigInt = bytesToBigInt(params.stealthSpendingKey);
  const pubkeyBigInt = bytesToBigInt(params.pubkey.toBytes());
  const ballotIdBigInt = bytesToBigInt(params.ballotId);

  // Generate randomness
  const randomness = generateRandomness();
  const randomnessBigInt = bytesToBigInt(randomness);

  // Derive nullifier key
  const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);
  const nullifierKeyBigInt = bytesToBigInt(nullifierKey);

  // Compute vote nullifier
  const voteNullifier = computeVoteNullifier(nullifierKey, params.ballotId);
  const voteNullifierBigInt = bytesToBigInt(voteNullifier);

  // Compute vote commitment
  const voteCommitment = computeVoteCommitment(
    params.ballotId,
    voteNullifier,
    params.pubkey.toBytes(),
    params.voteChoice,
    BigInt(params.attestation.totalAmount),
    randomness
  );
  const voteCommitmentBigInt = bytesToBigInt(voteCommitment);

  // Weight (for now, weight = amount, would use formula in production)
  const totalAmount = BigInt(params.attestation.totalAmount);
  const weight = totalAmount; // Simplified; in production: evaluate formula

  // Parse attestation signature
  const sigParts = parseEdDSASignature(params.attestation.signature);

  // Build inputs
  const inputs: VoteSnapshotProofInputs = {
    // Public inputs
    ballotId: ballotIdBigInt,
    voteNullifier: voteNullifierBigInt,
    voteCommitment: voteCommitmentBigInt,
    totalAmount,
    weight,
    tokenMint: bytesToBigInt(new Uint8Array(Buffer.from(params.attestation.tokenMint))),
    snapshotSlot: BigInt(params.attestation.snapshotSlot),
    indexerPubkeyX,
    indexerPubkeyY,
    eligibilityRoot,
    hasEligibility: eligibilityRoot !== BigInt(0) ? BigInt(1) : BigInt(0),
    voteChoice: revealMode === RevealMode.Public ? BigInt(params.voteChoice) : BigInt(0),
    isPublicMode: revealMode === RevealMode.Public ? BigInt(1) : BigInt(0),

    // Private inputs
    spendingKey: spendingKeyBigInt,
    pubkey: pubkeyBigInt,
    attestationSignatureR8x: sigParts.r8x,
    attestationSignatureR8y: sigParts.r8y,
    attestationSignatureS: sigParts.s,
    randomness: randomnessBigInt,
    eligibilityPath: params.eligibilityProof?.merkleProof.map(s => BigInt(s)) || Array(20).fill(BigInt(0)),
    eligibilityPathIndices: params.eligibilityProof?.pathIndices.map(i => BigInt(i)) || Array(20).fill(BigInt(0)),
    privateVoteChoice: BigInt(params.voteChoice),
  };

  return {
    inputs,
    voteNullifier,
    voteCommitment,
    randomness,
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

function computeVoteNullifier(nullifierKey: Uint8Array, ballotId: Uint8Array): Uint8Array {
  // hash(VOTE_NULLIFIER_DOMAIN, nullifier_key, ballot_id)
  // Placeholder - would use Poseidon hash
  const result = new Uint8Array(32);
  result.set(nullifierKey.slice(0, 16), 0);
  result.set(ballotId.slice(0, 16), 16);
  return result;
}

function computeVoteCommitment(
  ballotId: Uint8Array,
  voteNullifier: Uint8Array,
  pubkey: Uint8Array,
  voteChoice: number,
  weight: bigint,
  randomness: Uint8Array
): Uint8Array {
  // hash(VOTE_COMMITMENT_DOMAIN, ballot_id, vote_nullifier, pubkey, vote_choice, weight, randomness)
  // Placeholder - would use Poseidon hash
  const result = new Uint8Array(32);
  result.set(ballotId.slice(0, 8), 0);
  result.set(voteNullifier.slice(0, 8), 8);
  result.set(randomness.slice(0, 16), 16);
  return result;
}

function computeVoteCommitmentNullifier(
  nullifierKey: Uint8Array,
  voteCommitment: Uint8Array
): Uint8Array {
  // hash(VOTE_COMMITMENT_DOMAIN, nullifier_key, vote_commitment)
  const result = new Uint8Array(32);
  result.set(nullifierKey.slice(0, 16), 0);
  result.set(voteCommitment.slice(0, 16), 16);
  return result;
}

function computePositionCommitment(
  ballotId: Uint8Array,
  pubkey: Uint8Array,
  voteChoice: number,
  amount: bigint,
  weight: bigint,
  randomness: Uint8Array
): Uint8Array {
  // hash(POSITION_DOMAIN, ballot_id, pubkey, vote_choice, amount, weight, randomness)
  const result = new Uint8Array(32);
  result.set(ballotId.slice(0, 8), 0);
  result.set(pubkey.slice(0, 8), 8);
  result.set(randomness.slice(0, 16), 16);
  return result;
}

function computePositionNullifier(
  nullifierKey: Uint8Array,
  positionCommitment: Uint8Array
): Uint8Array {
  // hash(POSITION_DOMAIN, nullifier_key, position_commitment)
  const result = new Uint8Array(32);
  result.set(nullifierKey.slice(0, 16), 0);
  result.set(positionCommitment.slice(0, 16), 16);
  return result;
}

function computeTokenCommitment(
  pubkey: Uint8Array,
  tokenMint: Uint8Array,
  amount: bigint,
  randomness: Uint8Array
): Uint8Array {
  // hash(COMMITMENT_DOMAIN, pubkey, token_mint, amount, randomness)
  const result = new Uint8Array(32);
  result.set(pubkey.slice(0, 8), 0);
  result.set(tokenMint.slice(0, 8), 8);
  result.set(randomness.slice(0, 16), 16);
  return result;
}

function derivePublicKeyFromSpendingKey(spendingKey: Uint8Array): Uint8Array {
  // In production, would derive on BabyJubJub curve
  // pubkey = spendingKey * G
  return new Uint8Array(32); // Placeholder
}

function parseEdDSASignature(sigHex: string): { r8x: bigint; r8y: bigint; s: bigint } {
  // Parse EdDSA signature components
  // Placeholder
  return {
    r8x: BigInt(0),
    r8y: BigInt(0),
    s: BigInt(0),
  };
}

function checkIsWinner(voteChoice: number, outcome: number, voteType: number): boolean {
  switch (voteType) {
    case 0: // Single
    case 3: // Weighted
      return voteChoice === outcome;
    case 1: // Approval
      return (voteChoice & (1 << outcome)) !== 0;
    case 2: // Ranked
      // Check if outcome appears in ranking
      return true; // Simplified
    default:
      return false;
  }
}
