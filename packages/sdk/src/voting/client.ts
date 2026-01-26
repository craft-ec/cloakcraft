/**
 * Voting Client
 *
 * Complete multi-phase voting execution with Light Protocol integration.
 * Handles all voting flows: Snapshot, SpendToVote, Vote Change, Position Close, Claim.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  VersionedTransaction,
  TransactionMessage,
  ComputeBudgetProgram,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';

import {
  VoteSnapshotParams,
  VoteSpendParams,
  ChangeVoteSnapshotParams,
  ClosePositionParams,
  ClaimParams,
  RevealMode,
  VoteBindingMode,
  Ballot,
  EncryptedContributions,
} from './types';
import {
  generateVoteSnapshotInputs,
  generateChangeVoteSnapshotInputs,
  generateVoteSpendInputs,
  generateClaimInputs,
  convertInputsToSnarkjs,
} from './proofs';
import {
  deriveBallotPda,
  deriveBallotVaultPda,
  derivePendingOperationPda,
  deriveVerificationKeyPda,
  generateOperationId,
  VOTING_SEEDS,
  CIRCUIT_IDS,
  buildVoteSnapshotPhase0Instruction,
  buildVoteSnapshotExecuteInstruction,
  buildChangeVoteSnapshotPhase0Instruction,
  buildChangeVoteSnapshotExecuteInstruction,
  buildVoteSpendPhase0Instruction,
  buildVoteSpendExecuteInstruction,
  buildCloseVotePositionPhase0Instruction,
  buildCloseVotePositionExecuteInstruction,
  buildClaimPhase0Instruction,
  buildClaimExecuteInstruction,
  generateEncryptedContributions,
  generateNegatedEncryptedContributions,
  VoteSnapshotInstructionParams,
  VoteSpendInstructionParams,
  CloseVotePositionInstructionParams,
  ClaimInstructionParams,
} from './instructions';
import { encryptPreimage } from './recovery';
import { LightCommitmentClient } from '../light';
import { generateRandomness, computeCommitment } from '../crypto/commitment';
import { deriveNullifierKey, deriveSpendingNullifier } from '../crypto/nullifier';
import { bytesToField, fieldToBytes, poseidonHashDomain } from '../crypto/poseidon';
import { derivePublicKey } from '../crypto/babyjubjub';
import { generateSnarkjsProofFromCircuit } from '../snarkjs-prover';

// Domain constants (must match circuits)
const VOTE_NULLIFIER_DOMAIN = BigInt(0x10);
const VOTE_COMMITMENT_DOMAIN = BigInt(0x11);
const POSITION_DOMAIN = BigInt(0x13);

export interface VotingClientConfig {
  connection: Connection;
  program: Program;
  programId: PublicKey;
  lightClient: LightCommitmentClient;
  circuitsBuildDir: string;
  addressMerkleTree: PublicKey;
  stateMerkleTree: PublicKey;
  addressLookupTables?: PublicKey[];
}

export interface VoteSnapshotResult {
  operationId: Uint8Array;
  voteNullifier: Uint8Array;
  voteCommitment: Uint8Array;
  voteRandomness: Uint8Array;
  signatures: string[];
}

export interface VoteSpendResult {
  operationId: Uint8Array;
  spendingNullifier: Uint8Array;
  positionCommitment: Uint8Array;
  positionRandomness: Uint8Array;
  signatures: string[];
}

export interface ChangeVoteResult {
  operationId: Uint8Array;
  oldVoteCommitmentNullifier: Uint8Array;
  newVoteCommitment: Uint8Array;
  newRandomness: Uint8Array;
  signatures: string[];
}

export interface ClosePositionResult {
  operationId: Uint8Array;
  positionNullifier: Uint8Array;
  newTokenCommitment: Uint8Array;
  tokenRandomness: Uint8Array;
  signatures: string[];
}

export interface ClaimResult {
  operationId: Uint8Array;
  positionNullifier: Uint8Array;
  payoutCommitment: Uint8Array;
  grossPayout: bigint;
  netPayout: bigint;
  signatures: string[];
}

/**
 * VotingClient - Complete multi-phase voting execution
 */
export class VotingClient {
  private connection: Connection;
  private program: Program;
  private programId: PublicKey;
  private lightClient: LightCommitmentClient;
  private circuitsBuildDir: string;
  private addressMerkleTree: PublicKey;
  private stateMerkleTree: PublicKey;
  private addressLookupTables: PublicKey[];

  constructor(config: VotingClientConfig) {
    this.connection = config.connection;
    this.program = config.program;
    this.programId = config.programId;
    this.lightClient = config.lightClient;
    this.circuitsBuildDir = config.circuitsBuildDir;
    this.addressMerkleTree = config.addressMerkleTree;
    this.stateMerkleTree = config.stateMerkleTree;
    this.addressLookupTables = config.addressLookupTables || [];
  }

  // ============================================================================
  // VOTE SNAPSHOT - Full Multi-Phase Execution
  // ============================================================================

  /**
   * Execute complete vote_snapshot flow (all phases)
   *
   * Phase 0: Create pending with ZK proof
   * Phase 1: Create vote nullifier (Light Protocol)
   * Phase 2: Execute vote (update tally)
   * Phase 3: Create vote commitment (Light Protocol)
   * Phase 4: Close pending operation
   */
  async voteSnapshot(
    params: VoteSnapshotParams,
    ballot: Ballot,
    payer: Keypair,
    onProgress?: (phase: number, message: string) => void
  ): Promise<VoteSnapshotResult> {
    const report = (phase: number, msg: string) => {
      console.log(`[VoteSnapshot Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };

    report(0, 'Generating proof inputs...');

    // Generate proof inputs
    const { inputs, voteNullifier, voteCommitment, voteRandomness } = await generateVoteSnapshotInputs(
      params,
      ballot.revealMode,
      ballot.tokenMint.toBytes(),
      ballot.hasEligibilityRoot ? bytesToField(ballot.eligibilityRoot) : 0n
    );

    report(0, 'Generating ZK proof...');

    // Generate ZK proof
    const proofResult = await generateSnarkjsProofFromCircuit(
      'voting/vote_snapshot',
      convertInputsToSnarkjs(inputs as unknown as Record<string, bigint | bigint[]>),
      this.circuitsBuildDir
    );

    report(0, `Proof generated: ${proofResult.length} bytes`);

    // Generate encrypted contributions for encrypted modes
    let encryptedContributions: EncryptedContributions | undefined;
    if (ballot.revealMode !== RevealMode.Public) {
      const encSeed = generateRandomness();
      encryptedContributions = generateEncryptedContributions(
        params.voteChoice,
        params.noteAmount, // weight = amount for linear formula
        ballot.numOptions,
        ballot.timeLockPubkey,
        encSeed
      );
    }

    // Generate encrypted preimage for claim recovery (encrypted modes)
    let encryptedPreimage: Uint8Array | undefined;
    if (ballot.revealMode !== RevealMode.Public) {
      const preimageData = {
        voteChoice: params.voteChoice,
        weight: params.noteAmount,
        randomness: voteRandomness,
        ballotId: params.ballotId,
      };
      const encryptionKey = ballot.revealMode === RevealMode.PermanentPrivate
        ? params.stealthSpendingKey
        : ballot.timeLockPubkey;
      const isTimelockKey = ballot.revealMode === RevealMode.TimeLocked;
      encryptedPreimage = encryptPreimage(preimageData, encryptionKey, isTimelockKey);
    }

    // Generate operation ID
    const operationId = generateOperationId();
    const [pendingOpPda] = derivePendingOperationPda(operationId, this.programId);
    const [ballotPda] = deriveBallotPda(params.ballotId, this.programId);

    report(0, `Operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);

    // Build Phase 0 instruction params
    const phase0Params: VoteSnapshotInstructionParams = {
      ballotId: params.ballotId,
      snapshotMerkleRoot: params.snapshotMerkleRoot,
      noteCommitment: params.noteCommitment,
      voteNullifier,
      voteCommitment,
      voteChoice: params.voteChoice,
      amount: params.noteAmount,
      weight: params.noteAmount, // weight = amount for linear formula
      proof: proofResult,
      outputRandomness: voteRandomness,
      encryptedContributions: encryptedContributions?.ciphertexts,
      encryptedPreimage,
    };

    // Build all phase instructions
    const signatures: string[] = [];

    // ========== PHASE 0: Create Pending With Proof ==========
    report(0, 'Submitting Phase 0: Create pending with proof...');
    const phase0Ix = await buildVoteSnapshotPhase0Instruction(
      this.program,
      phase0Params,
      operationId,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );

    const phase0Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        phase0Ix,
      ],
      payer,
      'Phase 0'
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);

    // ========== PHASE 1: Create Vote Nullifier (Light Protocol) ==========
    report(1, 'Creating vote nullifier...');

    // For vote_snapshot, we create a vote nullifier (not a spending nullifier)
    // This is tracked by the program, not Light Protocol directly
    // The nullifier is verified during execute_vote_snapshot

    // Wait for Phase 0 to be confirmed
    await this.waitForConfirmation(phase0Sig);

    // ========== PHASE 2: Execute Vote ==========
    report(2, 'Executing vote...');
    const phase2Ix = await buildVoteSnapshotExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      payer.publicKey,
      encryptedContributions?.ciphertexts || null,
      this.programId
    );

    const phase2Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        phase2Ix,
      ],
      payer,
      'Phase 2 (Execute)'
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);

    // ========== PHASE 3: Create Vote Commitment (Light Protocol) ==========
    report(3, 'Creating vote commitment...');

    // Get output tree for commitment creation
    const { DEVNET_LIGHT_TREES } = await import('../light');

    // Build create_commitment instruction
    const createCommitmentIx = await this.program.methods
      .createCommitment(
        Array.from(operationId),
        0 // commitment index
      )
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase3Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        createCommitmentIx,
      ],
      payer,
      'Phase 3 (Create Commitment)'
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);

    // ========== PHASE 4: Close Pending Operation ==========
    report(4, 'Closing pending operation...');
    const closeIx = await this.program.methods
      .closePendingOperation(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase4Sig = await this.sendTransaction(
      [closeIx],
      payer,
      'Phase 4 (Close)'
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);

    report(4, `Vote snapshot complete! ${signatures.length} transactions`);

    return {
      operationId,
      voteNullifier,
      voteCommitment,
      voteRandomness,
      signatures,
    };
  }

  // ============================================================================
  // VOTE SPEND - Full Multi-Phase Execution (SpendToVote)
  // ============================================================================

  /**
   * Execute complete vote_spend flow (all phases)
   *
   * Phase 0: Create pending with ZK proof
   * Phase 1: Verify input commitment exists (Light Protocol)
   * Phase 2: Create spending nullifier (Light Protocol)
   * Phase 3: Execute vote spend (update tally, transfer to vault)
   * Phase 4: Create position commitment (Light Protocol)
   * Phase 5: Close pending operation
   */
  async voteSpend(
    params: VoteSpendParams,
    ballot: Ballot,
    inputNote: {
      commitment: Uint8Array;
      accountHash: string;
      amount: bigint;
      randomness: Uint8Array;
      stealthPubX: Uint8Array;
      leafIndex: number;
    },
    payer: Keypair,
    onProgress?: (phase: number, message: string) => void
  ): Promise<VoteSpendResult> {
    const report = (phase: number, msg: string) => {
      console.log(`[VoteSpend Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };

    report(0, 'Generating proof inputs...');

    // Generate proof inputs
    const { spendingNullifier, positionCommitment, positionRandomness, inputs } = await generateVoteSpendInputs(
      params,
      ballot.revealMode,
      ballot.hasEligibilityRoot ? bytesToField(ballot.eligibilityRoot) : 0n
    );

    report(0, 'Generating ZK proof...');

    // Generate ZK proof
    const proofResult = await generateSnarkjsProofFromCircuit(
      'voting/vote_spend',
      convertInputsToSnarkjs(inputs),
      this.circuitsBuildDir
    );

    report(0, `Proof generated: ${proofResult.length} bytes`);

    // Generate encrypted contributions for encrypted modes
    let encryptedContributions: EncryptedContributions | undefined;
    if (ballot.revealMode !== RevealMode.Public) {
      const encSeed = generateRandomness();
      encryptedContributions = generateEncryptedContributions(
        params.voteChoice,
        inputNote.amount,
        ballot.numOptions,
        ballot.timeLockPubkey,
        encSeed
      );
    }

    // Generate encrypted preimage
    let encryptedPreimage: Uint8Array | undefined;
    if (ballot.revealMode !== RevealMode.Public) {
      const preimageData = {
        voteChoice: params.voteChoice,
        weight: inputNote.amount,
        amount: inputNote.amount,
        randomness: positionRandomness,
        ballotId: params.ballotId,
      };
      const encryptionKey = ballot.revealMode === RevealMode.PermanentPrivate
        ? params.stealthSpendingKey
        : ballot.timeLockPubkey;
      const isTimelockKey = ballot.revealMode === RevealMode.TimeLocked;
      encryptedPreimage = encryptPreimage(preimageData, encryptionKey, isTimelockKey);
    }

    // Generate operation ID
    const operationId = generateOperationId();
    const [pendingOpPda] = derivePendingOperationPda(operationId, this.programId);
    const [ballotPda] = deriveBallotPda(params.ballotId, this.programId);
    const [ballotVaultPda] = deriveBallotVaultPda(params.ballotId, this.programId);

    report(0, `Operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);

    // Fetch Light Protocol proofs
    report(0, 'Fetching Light Protocol proofs...');
    const commitmentProof = await this.lightClient.getMerkleProofByHash(inputNote.accountHash);

    const nullifierAddress = this.lightClient.deriveNullifierAddress(
      spendingNullifier,
      this.programId,
      this.addressMerkleTree,
      ballotPda
    );
    const nullifierProof = await this.lightClient.getValidityProof({
      newAddresses: [nullifierAddress],
      addressMerkleTree: this.addressMerkleTree,
      stateMerkleTree: this.stateMerkleTree,
    });

    const signatures: string[] = [];

    // ========== PHASE 0: Create Pending With Proof ==========
    report(0, 'Submitting Phase 0: Create pending with proof...');

    const phase0Params: VoteSpendInstructionParams = {
      ballotId: params.ballotId,
      spendingNullifier,
      positionCommitment,
      voteChoice: params.voteChoice,
      amount: inputNote.amount,
      weight: inputNote.amount,
      proof: proofResult,
      encryptedContributions: encryptedContributions?.ciphertexts,
      encryptedPreimage,
    };

    const phase0Ix = await buildVoteSpendPhase0Instruction(
      this.program,
      phase0Params,
      operationId,
      inputNote.commitment,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );

    const phase0Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        phase0Ix,
      ],
      payer,
      'Phase 0'
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);

    // ========== PHASE 1: Verify Commitment Exists ==========
    report(1, 'Verifying input commitment exists...');

    const verifyCommitmentIx = await this.program.methods
      .verifyCommitmentExists(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase1Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        verifyCommitmentIx,
      ],
      payer,
      'Phase 1 (Verify Commitment)'
    );
    signatures.push(phase1Sig);
    report(1, `Phase 1 complete: ${phase1Sig}`);

    // ========== PHASE 2: Create Spending Nullifier ==========
    report(2, 'Creating spending nullifier...');

    const createNullifierIx = await this.program.methods
      .createNullifierAndPending(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase2Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        createNullifierIx,
      ],
      payer,
      'Phase 2 (Create Nullifier)'
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);

    // ========== PHASE 3: Execute Vote Spend ==========
    report(3, 'Executing vote spend...');

    const phase3Ix = await buildVoteSpendExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      ballot.tokenMint,
      payer.publicKey,
      this.programId
    );

    const phase3Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        phase3Ix,
      ],
      payer,
      'Phase 3 (Execute Vote Spend)'
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);

    // ========== PHASE 4: Create Position Commitment ==========
    report(4, 'Creating position commitment...');

    const createCommitmentIx = await this.program.methods
      .createCommitment(Array.from(operationId), 0)
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase4Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        createCommitmentIx,
      ],
      payer,
      'Phase 4 (Create Commitment)'
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);

    // ========== PHASE 5: Close Pending Operation ==========
    report(5, 'Closing pending operation...');

    const closeIx = await this.program.methods
      .closePendingOperation(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase5Sig = await this.sendTransaction(
      [closeIx],
      payer,
      'Phase 5 (Close)'
    );
    signatures.push(phase5Sig);
    report(5, `Phase 5 complete: ${phase5Sig}`);

    report(5, `Vote spend complete! ${signatures.length} transactions`);

    return {
      operationId,
      spendingNullifier,
      positionCommitment,
      positionRandomness,
      signatures,
    };
  }

  // ============================================================================
  // CHANGE VOTE SNAPSHOT - Full Multi-Phase Execution
  // ============================================================================

  /**
   * Execute complete change_vote_snapshot flow (atomic vote change)
   */
  async changeVoteSnapshot(
    params: ChangeVoteSnapshotParams,
    ballot: Ballot,
    oldWeight: bigint,
    payer: Keypair,
    onProgress?: (phase: number, message: string) => void
  ): Promise<ChangeVoteResult> {
    const report = (phase: number, msg: string) => {
      console.log(`[ChangeVote Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };

    report(0, 'Generating proof inputs...');

    // Generate proof inputs
    const { oldVoteCommitmentNullifier, newVoteCommitment, newRandomness, inputs } =
      await generateChangeVoteSnapshotInputs(params, ballot.revealMode, oldWeight);

    report(0, 'Generating ZK proof...');

    // Generate ZK proof
    const proofResult = await generateSnarkjsProofFromCircuit(
      'voting/change_vote_snapshot',
      convertInputsToSnarkjs(inputs),
      this.circuitsBuildDir
    );

    report(0, `Proof generated: ${proofResult.length} bytes`);

    // Generate encrypted contributions for encrypted modes
    let oldEncryptedContributions: Uint8Array[] | undefined;
    let newEncryptedContributions: Uint8Array[] | undefined;
    if (ballot.revealMode !== RevealMode.Public) {
      const oldEncSeed = generateRandomness();
      const newEncSeed = generateRandomness();

      // Old contributions are negated (for tally decrement)
      oldEncryptedContributions = generateNegatedEncryptedContributions(
        params.oldVoteChoice,
        oldWeight,
        ballot.numOptions,
        ballot.timeLockPubkey,
        oldEncSeed
      ).ciphertexts;

      // New contributions are positive (for tally increment)
      newEncryptedContributions = generateEncryptedContributions(
        params.newVoteChoice,
        oldWeight, // weight unchanged in snapshot mode
        ballot.numOptions,
        ballot.timeLockPubkey,
        newEncSeed
      ).ciphertexts;
    }

    // Generate operation ID
    const operationId = generateOperationId();
    const [pendingOpPda] = derivePendingOperationPda(operationId, this.programId);

    report(0, `Operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);

    const signatures: string[] = [];

    // ========== PHASE 0: Create Pending With Proof ==========
    report(0, 'Submitting Phase 0...');

    const phase0Ix = await buildChangeVoteSnapshotPhase0Instruction(
      this.program,
      {
        ballotId: params.ballotId,
        oldVoteCommitment: params.oldVoteCommitment,
        oldVoteCommitmentNullifier,
        newVoteCommitment,
        voteNullifier: new Uint8Array(32), // Derived in circuit
        oldVoteChoice: params.oldVoteChoice,
        newVoteChoice: params.newVoteChoice,
        weight: oldWeight,
        proof: proofResult,
        oldEncryptedContributions,
        newEncryptedContributions,
      },
      operationId,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );

    const phase0Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        phase0Ix,
      ],
      payer,
      'Phase 0'
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);

    // ========== PHASE 1: Verify Old Commitment Exists ==========
    report(1, 'Verifying old vote commitment exists...');

    const verifyIx = await this.program.methods
      .verifyCommitmentExists(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase1Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        verifyIx,
      ],
      payer,
      'Phase 1 (Verify)'
    );
    signatures.push(phase1Sig);
    report(1, `Phase 1 complete: ${phase1Sig}`);

    // ========== PHASE 2: Create Old Vote Commitment Nullifier ==========
    report(2, 'Creating old vote commitment nullifier...');

    const nullifierIx = await this.program.methods
      .createNullifierAndPending(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase2Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        nullifierIx,
      ],
      payer,
      'Phase 2 (Nullifier)'
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);

    // ========== PHASE 3: Execute Change Vote ==========
    report(3, 'Executing change vote...');

    const executeIx = await buildChangeVoteSnapshotExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      payer.publicKey,
      oldEncryptedContributions || null,
      newEncryptedContributions || null,
      this.programId
    );

    const phase3Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        executeIx,
      ],
      payer,
      'Phase 3 (Execute)'
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);

    // ========== PHASE 4: Create New Vote Commitment ==========
    report(4, 'Creating new vote commitment...');

    const createCommitmentIx = await this.program.methods
      .createCommitment(Array.from(operationId), 0)
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase4Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        createCommitmentIx,
      ],
      payer,
      'Phase 4 (Create Commitment)'
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);

    // ========== PHASE 5: Close Pending Operation ==========
    report(5, 'Closing pending operation...');

    const closeIx = await this.program.methods
      .closePendingOperation(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase5Sig = await this.sendTransaction(
      [closeIx],
      payer,
      'Phase 5 (Close)'
    );
    signatures.push(phase5Sig);
    report(5, `Phase 5 complete: ${phase5Sig}`);

    report(5, `Change vote complete! ${signatures.length} transactions`);

    return {
      operationId,
      oldVoteCommitmentNullifier,
      newVoteCommitment,
      newRandomness,
      signatures,
    };
  }

  // ============================================================================
  // CLOSE POSITION - Full Multi-Phase Execution
  // ============================================================================

  /**
   * Execute complete close_position flow (exit SpendToVote position)
   */
  async closePosition(
    params: ClosePositionParams,
    ballot: Ballot,
    positionNote: {
      commitment: Uint8Array;
      accountHash: string;
    },
    newTokenRandomness: Uint8Array,
    payer: Keypair,
    onProgress?: (phase: number, message: string) => void
  ): Promise<ClosePositionResult> {
    const report = (phase: number, msg: string) => {
      console.log(`[ClosePosition Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };

    report(0, 'Generating proof inputs...');

    // Derive position nullifier
    const nullifierKey = deriveNullifierKey(params.stealthSpendingKey);
    const positionNullifier = poseidonHashDomain(
      POSITION_DOMAIN,
      nullifierKey,
      params.positionCommitment
    );

    // Derive new token commitment
    const pubkey = derivePublicKey(bytesToField(params.stealthSpendingKey)).x;
    const newTokenCommitment = computeCommitment({
      stealthPubX: pubkey,
      tokenMint: ballot.tokenMint,
      amount: params.amount,
      randomness: newTokenRandomness,
    });

    // Build circuit inputs
    const inputs = {
      ballotId: bytesToField(params.ballotId),
      positionCommitment: bytesToField(params.positionCommitment),
      positionNullifier: bytesToField(positionNullifier),
      tokenCommitment: bytesToField(newTokenCommitment),
      voteChoice: ballot.revealMode === RevealMode.Public ? BigInt(params.voteChoice) : 0n,
      amount: params.amount,
      weight: params.weight,
      isPublicMode: ballot.revealMode === RevealMode.Public ? 1n : 0n,
      // Private inputs
      spendingKey: bytesToField(params.stealthSpendingKey),
      pubkey: bytesToField(pubkey),
      positionRandomness: bytesToField(params.positionRandomness),
      tokenRandomness: bytesToField(newTokenRandomness),
      tokenMint: bytesToField(ballot.tokenMint.toBytes()),
      privateVoteChoice: BigInt(params.voteChoice),
    };

    report(0, 'Generating ZK proof...');

    // Generate ZK proof
    const proofResult = await generateSnarkjsProofFromCircuit(
      'voting/close_position',
      convertInputsToSnarkjs(inputs),
      this.circuitsBuildDir
    );

    report(0, `Proof generated: ${proofResult.length} bytes`);

    // Generate negated encrypted contributions for encrypted modes
    let encryptedContributions: Uint8Array[] | undefined;
    if (ballot.revealMode !== RevealMode.Public) {
      const encSeed = generateRandomness();
      encryptedContributions = generateNegatedEncryptedContributions(
        params.voteChoice,
        params.weight,
        ballot.numOptions,
        ballot.timeLockPubkey,
        encSeed
      ).ciphertexts;
    }

    // Generate operation ID
    const operationId = generateOperationId();
    const [pendingOpPda] = derivePendingOperationPda(operationId, this.programId);

    report(0, `Operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);

    const signatures: string[] = [];

    // ========== PHASE 0: Create Pending With Proof ==========
    report(0, 'Submitting Phase 0...');

    const phase0Params: CloseVotePositionInstructionParams = {
      ballotId: params.ballotId,
      positionNullifier,
      positionCommitment: params.positionCommitment,
      newTokenCommitment,
      voteChoice: params.voteChoice,
      amount: params.amount,
      weight: params.weight,
      proof: proofResult,
      encryptedContributions,
    };

    const phase0Ix = await buildCloseVotePositionPhase0Instruction(
      this.program,
      phase0Params,
      operationId,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );

    const phase0Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        phase0Ix,
      ],
      payer,
      'Phase 0'
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);

    // ========== PHASE 1: Verify Position Exists ==========
    report(1, 'Verifying position exists...');

    const verifyIx = await this.program.methods
      .verifyCommitmentExists(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase1Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        verifyIx,
      ],
      payer,
      'Phase 1 (Verify)'
    );
    signatures.push(phase1Sig);
    report(1, `Phase 1 complete: ${phase1Sig}`);

    // ========== PHASE 2: Create Position Nullifier ==========
    report(2, 'Creating position nullifier...');

    const nullifierIx = await this.program.methods
      .createNullifierAndPending(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase2Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        nullifierIx,
      ],
      payer,
      'Phase 2 (Nullifier)'
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);

    // ========== PHASE 3: Execute Close Position ==========
    report(3, 'Executing close position...');

    const executeIx = await buildCloseVotePositionExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      ballot.tokenMint,
      payer.publicKey,
      this.programId
    );

    const phase3Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        executeIx,
      ],
      payer,
      'Phase 3 (Execute)'
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);

    // ========== PHASE 4: Create New Token Commitment ==========
    report(4, 'Creating new token commitment...');

    const createCommitmentIx = await this.program.methods
      .createCommitment(Array.from(operationId), 0)
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase4Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        createCommitmentIx,
      ],
      payer,
      'Phase 4 (Create Commitment)'
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);

    // ========== PHASE 5: Close Pending Operation ==========
    report(5, 'Closing pending operation...');

    const closeIx = await this.program.methods
      .closePendingOperation(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase5Sig = await this.sendTransaction(
      [closeIx],
      payer,
      'Phase 5 (Close)'
    );
    signatures.push(phase5Sig);
    report(5, `Phase 5 complete: ${phase5Sig}`);

    report(5, `Close position complete! ${signatures.length} transactions`);

    return {
      operationId,
      positionNullifier,
      newTokenCommitment,
      tokenRandomness: newTokenRandomness,
      signatures,
    };
  }

  // ============================================================================
  // CLAIM - Full Multi-Phase Execution
  // ============================================================================

  /**
   * Execute complete claim flow (claim winnings from SpendToVote ballot)
   */
  async claim(
    params: ClaimParams,
    ballot: Ballot,
    positionNote: {
      commitment: Uint8Array;
      accountHash: string;
    },
    payer: Keypair,
    onProgress?: (phase: number, message: string) => void
  ): Promise<ClaimResult> {
    const report = (phase: number, msg: string) => {
      console.log(`[Claim Phase ${phase}] ${msg}`);
      onProgress?.(phase, msg);
    };

    if (!ballot.hasOutcome) {
      throw new Error('Ballot not resolved - cannot claim');
    }

    report(0, 'Generating proof inputs...');

    // Generate proof inputs
    const { positionNullifier, payoutCommitment, payoutRandomness, grossPayout, netPayout, inputs } =
      await generateClaimInputs(params, {
        outcome: ballot.outcome,
        totalPool: ballot.poolBalance,
        winnerWeight: ballot.winnerWeight,
        protocolFeeBps: ballot.protocolFeeBps,
        voteType: 3, // Weighted (SpendToVote always weighted)
        tokenMint: ballot.tokenMint.toBytes(),
        revealMode: ballot.revealMode,
      });

    report(0, `Gross payout: ${grossPayout}, Net payout: ${netPayout}`);

    report(0, 'Generating ZK proof...');

    // Generate ZK proof
    const proofResult = await generateSnarkjsProofFromCircuit(
      'voting/claim',
      convertInputsToSnarkjs(inputs as unknown as Record<string, bigint | bigint[]>),
      this.circuitsBuildDir
    );

    report(0, `Proof generated: ${proofResult.length} bytes`);

    // Generate operation ID
    const operationId = generateOperationId();
    const [pendingOpPda] = derivePendingOperationPda(operationId, this.programId);
    const [ballotVaultPda] = deriveBallotVaultPda(params.ballotId, this.programId);

    // Get protocol treasury ATA
    const protocolTreasuryAta = getAssociatedTokenAddressSync(
      ballot.tokenMint,
      ballot.protocolTreasury
    );

    report(0, `Operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);

    const signatures: string[] = [];

    // ========== PHASE 0: Create Pending With Proof ==========
    report(0, 'Submitting Phase 0...');

    const phase0Params: ClaimInstructionParams = {
      ballotId: params.ballotId,
      positionNullifier,
      positionCommitment: params.positionCommitment,
      payoutCommitment,
      voteChoice: params.voteChoice,
      grossPayout,
      netPayout,
      userWeight: params.weight,
      proof: proofResult,
    };

    const phase0Ix = await buildClaimPhase0Instruction(
      this.program,
      phase0Params,
      operationId,
      payer.publicKey,
      payer.publicKey,
      this.programId
    );

    const phase0Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
        phase0Ix,
      ],
      payer,
      'Phase 0'
    );
    signatures.push(phase0Sig);
    report(0, `Phase 0 complete: ${phase0Sig}`);

    // ========== PHASE 1: Verify Position Exists ==========
    report(1, 'Verifying position exists...');

    const verifyIx = await this.program.methods
      .verifyCommitmentExists(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase1Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        verifyIx,
      ],
      payer,
      'Phase 1 (Verify)'
    );
    signatures.push(phase1Sig);
    report(1, `Phase 1 complete: ${phase1Sig}`);

    // ========== PHASE 2: Create Position Nullifier ==========
    report(2, 'Creating position nullifier...');

    const nullifierIx = await this.program.methods
      .createNullifierAndPending(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase2Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        nullifierIx,
      ],
      payer,
      'Phase 2 (Nullifier)'
    );
    signatures.push(phase2Sig);
    report(2, `Phase 2 complete: ${phase2Sig}`);

    // ========== PHASE 3: Execute Claim ==========
    report(3, 'Executing claim...');

    const executeIx = await buildClaimExecuteInstruction(
      this.program,
      operationId,
      params.ballotId,
      ballot.tokenMint,
      protocolTreasuryAta,
      payer.publicKey,
      this.programId
    );

    const phase3Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }),
        executeIx,
      ],
      payer,
      'Phase 3 (Execute)'
    );
    signatures.push(phase3Sig);
    report(3, `Phase 3 complete: ${phase3Sig}`);

    // ========== PHASE 4: Create Payout Commitment ==========
    report(4, 'Creating payout commitment...');

    const createCommitmentIx = await this.program.methods
      .createCommitment(Array.from(operationId), 0)
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase4Sig = await this.sendTransaction(
      [
        ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }),
        createCommitmentIx,
      ],
      payer,
      'Phase 4 (Create Commitment)'
    );
    signatures.push(phase4Sig);
    report(4, `Phase 4 complete: ${phase4Sig}`);

    // ========== PHASE 5: Close Pending Operation ==========
    report(5, 'Closing pending operation...');

    const closeIx = await this.program.methods
      .closePendingOperation(Array.from(operationId))
      .accounts({
        pendingOperation: pendingOpPda,
        relayer: payer.publicKey,
      })
      .instruction();

    const phase5Sig = await this.sendTransaction(
      [closeIx],
      payer,
      'Phase 5 (Close)'
    );
    signatures.push(phase5Sig);
    report(5, `Phase 5 complete: ${phase5Sig}`);

    report(5, `Claim complete! ${signatures.length} transactions, payout: ${netPayout}`);

    return {
      operationId,
      positionNullifier,
      payoutCommitment,
      grossPayout,
      netPayout,
      signatures,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async sendTransaction(
    instructions: TransactionInstruction[],
    payer: Keypair,
    phaseName: string
  ): Promise<string> {
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash();

    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([payer]);

    const signature = await this.connection.sendTransaction(tx, {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    const confirmation = await this.connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight,
    });

    if (confirmation.value.err) {
      throw new Error(`${phaseName} transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    return signature;
  }

  private async waitForConfirmation(signature: string): Promise<void> {
    const status = await this.connection.getSignatureStatus(signature, {
      searchTransactionHistory: true,
    });

    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
  }
}

// Export the client
export default VotingClient;
