/**
 * Transact Instruction Builder
 *
 * Private transfer with optional unshield
 */

import {
  PublicKey,
  TransactionInstruction,
  ComputeBudgetProgram,
  SystemProgram,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import { Program } from '@coral-xyz/anchor';
import BN from 'bn.js';
import type { Point } from '@cloakcraft/types';

import {
  derivePoolPda,
  deriveVaultPda,
  deriveCommitmentCounterPda,
  deriveVerificationKeyPda,
  PROGRAM_ID,
  CIRCUIT_IDS,
} from './constants';
import { LightProtocol, LightTransactParams } from './light-helpers';
import { computeCommitment, generateRandomness } from '../crypto/commitment';
import { encryptNote, serializeEncryptedNote } from '../crypto/encryption';
import { deriveNullifierKey, deriveSpendingNullifier } from '../crypto/nullifier';

/**
 * Input note for spending
 */
export interface TransactInput {
  /** Stealth public key X coordinate */
  stealthPubX: Uint8Array;
  /** Amount */
  amount: bigint;
  /** Randomness */
  randomness: Uint8Array;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Spending key for this note */
  spendingKey: bigint;
  /** Account hash from scanning (REQUIRED - this is where commitment exists in state tree) */
  accountHash: string;
}

/**
 * Output note to create
 */
export interface TransactOutput {
  /** Recipient's stealth public key */
  recipientPubkey: Point;
  /** Ephemeral public key for stealth derivation (stored on-chain for recipient scanning) */
  ephemeralPubkey?: Point;
  /** Amount */
  amount: bigint;
  /** Pre-computed commitment (if already computed for ZK proof) */
  commitment?: Uint8Array;
  /** Pre-computed randomness (if already computed for ZK proof) */
  randomness?: Uint8Array;
}

/**
 * Transact parameters (Multi-Phase)
 */
export interface TransactInstructionParams {
  /** Token mint */
  tokenMint: PublicKey;
  /** Input note to spend */
  input: TransactInput;
  /** Output notes to create */
  outputs: TransactOutput[];
  /** Merkle root for input verification */
  merkleRoot: Uint8Array;
  /** Merkle path for input */
  merklePath: Uint8Array[];
  /** Merkle path indices */
  merklePathIndices: number[];
  /** Amount to unshield (0 for pure private transfer) */
  unshieldAmount?: bigint;
  /** Unshield recipient token account */
  unshieldRecipient?: PublicKey;
  /** Protocol fee amount (verified in ZK proof) */
  feeAmount?: bigint;
  /** Treasury wallet address (owner of treasury token account) */
  treasuryWallet?: PublicKey;
  /** Treasury token account for receiving fees (required if feeAmount > 0) */
  treasuryTokenAccount?: PublicKey;
  /** Protocol config PDA (optional, used for fee verification) */
  protocolConfig?: PublicKey;
  /** Relayer public key */
  relayer: PublicKey;
  /** ZK proof bytes */
  proof: Uint8Array;
  /** Pre-computed nullifier (must match ZK proof) */
  nullifier?: Uint8Array;
  /** Pre-computed input commitment (must match ZK proof) */
  inputCommitment?: Uint8Array;
  /** Pre-computed output commitments (must match ZK proof) */
  outputCommitments?: Uint8Array[];
}

/**
 * Transact result
 */
export interface TransactResult {
  /** Nullifier that was created */
  nullifier: Uint8Array;
  /** Output commitments */
  outputCommitments: Uint8Array[];
  /** Encrypted notes for outputs */
  encryptedNotes: Buffer[];
  /** Randomness for each output (needed for spending) */
  outputRandomness: Uint8Array[];
  /** Stealth ephemeral pubkeys for each output (64 bytes each: X + Y) */
  stealthEphemeralPubkeys: Uint8Array[];
  /** Output amounts (for filtering 0-amount outputs) */
  outputAmounts: bigint[];
}

/**
 * Build transact Phase 1 transaction (Multi-Phase)
 *
 * Multi-phase approach to stay under transaction size limits:
 * - Phase 1 (transact): Verify proof + Verify commitment + Create nullifier + Store pending + Unshield
 * - Phase 2+ (create_commitment): Create each output commitment via generic instruction
 * - Final (close_pending_operation): Close pending operation to reclaim rent
 */
export async function buildTransactWithProgram(
  program: Program,
  params: TransactInstructionParams,
  rpcUrl: string,
  circuitId: string = CIRCUIT_IDS.TRANSFER_1X2
): Promise<{
  tx: any;  // Phase 0
  phase1Tx: any;  // Phase 1
  phase2Tx: any;  // Phase 2
  phase3Tx: any | null;  // Phase 3 (optional unshield)
  result: TransactResult;
  operationId: Uint8Array;
  pendingCommitments: Array<{
    pool: PublicKey;
    commitment: Uint8Array;
    stealthEphemeralPubkey: Uint8Array;
    encryptedNote: Uint8Array;
  }>;
}> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vaultPda] = deriveVaultPda(params.tokenMint, programId);
  const [vkPda] = deriveVerificationKeyPda(circuitId, programId);

  // Use pre-computed nullifier and commitment if provided (must match ZK proof)
  // Otherwise compute them (but this may not match if stealth keys are involved)
  let nullifier: Uint8Array;
  let inputCommitment: Uint8Array;

  if (params.nullifier && params.inputCommitment) {
    nullifier = params.nullifier;
    inputCommitment = params.inputCommitment;
  } else {
    // Fallback: compute locally (may not work with stealth addresses)
    const nullifierKey = deriveNullifierKey(
      new Uint8Array(new BigUint64Array([params.input.spendingKey]).buffer)
    );
    inputCommitment = computeCommitment({
      stealthPubX: params.input.stealthPubX,
      tokenMint: params.tokenMint,
      amount: params.input.amount,
      randomness: params.input.randomness,
    });
    nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, params.input.leafIndex);
  }

  // Create output notes and commitments
  let outputCommitments: Uint8Array[] = [];
  const encryptedNotes: Buffer[] = [];
  const outputRandomness: Uint8Array[] = [];
  const stealthEphemeralPubkeys: Uint8Array[] = [];
  const outputAmounts: bigint[] = [];

  // Use pre-computed commitments if provided, otherwise compute them
  if (params.outputCommitments && params.outputCommitments.length === params.outputs.length) {
    outputCommitments = params.outputCommitments;
  }

  for (let i = 0; i < params.outputs.length; i++) {
    const output = params.outputs[i];
    outputAmounts.push(output.amount);

    // Use pre-computed randomness if provided (must match ZK proof), otherwise generate new
    const randomness = output.randomness ?? generateRandomness();
    outputRandomness.push(randomness);

    const note = {
      stealthPubX: output.recipientPubkey.x,
      tokenMint: params.tokenMint,
      amount: output.amount,
      randomness,
    };

    // Use pre-computed commitment if available, otherwise compute
    if (!outputCommitments[i]) {
      outputCommitments[i] = output.commitment ?? computeCommitment(note);
    }

    const encrypted = encryptNote(note, output.recipientPubkey);
    encryptedNotes.push(Buffer.from(serializeEncryptedNote(encrypted)));

    // Store the stealth ephemeral pubkey (64 bytes: X + Y)
    // This is used by the scanner to derive the stealth private key for decryption
    // The ECIES ephemeral key is stored inside the encrypted note itself
    if (output.ephemeralPubkey) {
      // For stealth addresses: store the stealth ephemeral for key derivation
      const ephemeralBytes = new Uint8Array(64);
      ephemeralBytes.set(output.ephemeralPubkey.x, 0);
      ephemeralBytes.set(output.ephemeralPubkey.y, 32);
      stealthEphemeralPubkeys.push(ephemeralBytes);
    } else {
      // No stealth ephemeral - for internal operations
      stealthEphemeralPubkeys.push(new Uint8Array(64));
    }
  }

  // For transfer_1x2 circuit, pad with dummy second output if only 1 output provided
  // The dummy commitment must match what the ZK proof computed: Poseidon(domain, 0, tokenMint, 0, 0)
  if (circuitId === CIRCUIT_IDS.TRANSFER_1X2 && outputCommitments.length === 1) {
    const dummyCommitment = computeCommitment({
      stealthPubX: new Uint8Array(32), // zeros
      tokenMint: params.tokenMint,
      amount: 0n,
      randomness: new Uint8Array(32), // zeros
    });
    outputCommitments.push(dummyCommitment);
    outputRandomness.push(new Uint8Array(32));
    stealthEphemeralPubkeys.push(new Uint8Array(64)); // zeros for dummy output
    encryptedNotes.push(Buffer.alloc(0)); // empty for dummy output
    outputAmounts.push(0n); // dummy has 0 amount
  }

  // Generate operation ID
  const { generateOperationId, derivePendingOperationPda } = await import('./swap');
  const operationId = generateOperationId(
    nullifier,
    outputCommitments[0],
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);

  console.log(`[Transact Phase 1] Generated operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);
  console.log(`[Transact Phase 1] Nullifier: ${Buffer.from(nullifier).toString('hex').slice(0, 16)}...`);

  // Build pending commitments data (for Phase 4+)
  // IMPORTANT: Include ALL commitments, even zero commitments
  // Zero commitments (all zeros) are handled by the on-chain instruction which marks them complete without creating Light accounts
  const pendingCommitments = [];
  for (let i = 0; i < outputCommitments.length; i++) {
    // Include all commitments - on-chain instruction handles zero commitments efficiently
    pendingCommitments.push({
      pool: poolPda,
      commitment: outputCommitments[i],
      stealthEphemeralPubkey: stealthEphemeralPubkeys[i],
      encryptedNote: encryptedNotes[i],
    });
  }

  // SECURITY: Fetch commitment inclusion proof and nullifier non-inclusion proof
  // Use the scanner's accountHash - this is where the commitment actually exists
  // (The scanner found it in the state tree, so this is the correct address)
  if (!params.input.accountHash) {
    throw new Error('Input note missing accountHash. Ensure notes are from scanNotes() which includes accountHash.');
  }

  console.log('[Transact] Input commitment:', Buffer.from(inputCommitment).toString('hex').slice(0, 16) + '...');
  console.log('[Transact] Account hash from scanner:', params.input.accountHash);
  console.log('[Transact] Pool:', poolPda.toBase58());

  console.log('[Transact] Fetching commitment inclusion proof...');
  const commitmentProof = await lightProtocol.getInclusionProofByHash(params.input.accountHash);
  console.log('[Transact] Commitment proof:', JSON.stringify(commitmentProof, null, 2));

  console.log('[Transact] Fetching nullifier non-inclusion proof...');
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, nullifier);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);

  // Extract tree, queue, and CPI context from commitment proof (where it was actually created)
  const commitmentTree = new PublicKey(commitmentProof.treeInfo.tree);
  const commitmentQueue = new PublicKey(commitmentProof.treeInfo.queue);
  const commitmentCpiContext = commitmentProof.treeInfo.cpiContext
    ? new PublicKey(commitmentProof.treeInfo.cpiContext)
    : null;

  // Build packed accounts manually
  const { SystemAccountMetaConfig, PackedAccounts } = await import('@lightprotocol/stateless.js');
  const { DEVNET_V2_TREES } = await import('./constants');
  const systemConfig = SystemAccountMetaConfig.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

  // Add output queue
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);

  // Add address tree (for address derivation - both commitment and nullifier)
  const addressTree = DEVNET_V2_TREES.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);

  // Add commitment STATE tree from proof (for merkle verification)
  const commitmentStateTreeIndex = packedAccounts.insertOrGet(commitmentTree);
  const commitmentQueueIndex = packedAccounts.insertOrGet(commitmentQueue);

  // Add CPI context if present (Light Protocol V2 batched operations)
  if (commitmentCpiContext) {
    packedAccounts.insertOrGet(commitmentCpiContext);
    console.log('[Transact] Added CPI context from proof:', commitmentCpiContext.toBase58());
  }

  console.log('[Transact] STATE tree from proof:', commitmentTree.toBase58(), 'index:', commitmentStateTreeIndex);
  console.log('[Transact] ADDRESS tree (current):', addressTree.toBase58(), 'index:', addressTreeIndex);

  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();

  // Build complete LightTransactParams with all security proofs
  const lightParams: LightTransactParams = {
    commitmentAccountHash: Array.from(new PublicKey(params.input.accountHash).toBytes()),
    commitmentMerkleContext: {
      merkleTreePubkeyIndex: commitmentStateTreeIndex, // STATE tree from proof (for data/merkle verification)
      queuePubkeyIndex: commitmentQueueIndex,          // Queue from proof
      leafIndex: commitmentProof.leafIndex,
      rootIndex: commitmentProof.rootIndex,
    },
    // SECURITY: Convert commitment inclusion proof (Groth16 SNARK)
    commitmentInclusionProof: LightProtocol.convertCompressedProof(commitmentProof),
    // VERIFY existing commitment: Address tree for CPI address derivation
    commitmentAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,           // CURRENT address tree (for CPI address derivation)
      addressQueuePubkeyIndex: addressTreeIndex,                // CURRENT address tree queue
      rootIndex: nullifierProof.rootIndices[0] ?? 0,            // Current address tree root
    },
    nullifierNonInclusionProof: LightProtocol.convertCompressedProof(nullifierProof),
    // CREATE new nullifier: Use current address tree
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,   // CURRENT address tree
      addressQueuePubkeyIndex: addressTreeIndex,        // CURRENT address tree queue
      rootIndex: nullifierProof.rootIndices[0] ?? 0,    // Current root
    },
    outputTreeIndex,
  };

  // The unshieldRecipient parameter should already be the token account address
  // (not the wallet address - that should be derived by the caller)
  // So we just use it directly without deriving again
  let unshieldRecipientAta: PublicKey | null = null;
  if (params.unshieldRecipient && params.unshieldAmount && params.unshieldAmount > 0n) {
    unshieldRecipientAta = params.unshieldRecipient;
  }

  // ====================================================================
  // MULTI-PHASE APPEND PATTERN
  // ====================================================================
  // Phase 0: Create pending operation with ZK proof verification
  // Phase 1: Verify commitment exists
  // Phase 2: Create nullifier (point of no return)
  // Phase 3: Process unshield (if unshield_amount > 0)
  // Phase 4+: Create output commitments
  // Final: Close pending operation
  // ====================================================================

  // Prepare output recipients (stealth pubkey X coordinates)
  const outputRecipients = params.outputs.map(output => Array.from(output.recipientPubkey.x));

  // Debug: log amounts for instruction
  const transferAmountForInstruction = outputAmounts[0] ?? 0n; // First output = transfer to recipient
  const unshieldAmountForInstruction = params.unshieldAmount ?? 0n;
  const feeAmountForInstruction = params.feeAmount ?? 0n;
  console.log('[Phase 0] transfer_amount for instruction:', transferAmountForInstruction.toString());
  console.log('[Phase 0] unshield_amount for instruction:', unshieldAmountForInstruction.toString());
  console.log('[Phase 0] fee_amount for instruction:', feeAmountForInstruction.toString());
  console.log('[Phase 0] params.unshieldAmount:', params.unshieldAmount);
  console.log('[Phase 0] params.feeAmount:', params.feeAmount);

  // Log all public inputs being sent on-chain for comparison with snarkjs
  console.log('[Phase 0] Public inputs for on-chain verification:');
  console.log('  [0] merkle_root:', Buffer.from(params.merkleRoot).toString('hex').slice(0, 32) + '...');
  console.log('  [1] nullifier:', Buffer.from(nullifier).toString('hex').slice(0, 32) + '...');
  for (let i = 0; i < outputCommitments.length; i++) {
    console.log(`  [${2+i}] out_commitment_${i+1}:`, Buffer.from(outputCommitments[i]).toString('hex').slice(0, 32) + '...');
  }
  console.log(`  [${2+outputCommitments.length}] token_mint:`, params.tokenMint.toBase58());
  console.log(`  [${3+outputCommitments.length}] transfer_amount:`, transferAmountForInstruction.toString());
  console.log(`  [${4+outputCommitments.length}] unshield_amount:`, unshieldAmountForInstruction.toString());
  console.log(`  [${5+outputCommitments.length}] fee_amount:`, feeAmountForInstruction.toString());

  // Debug: Log FULL commitment bytes for comparison with proof
  console.log('[Phase 0] === FULL commitment bytes for on-chain ===');
  for (let i = 0; i < outputCommitments.length; i++) {
    console.log(`  out_commitment_${i+1} (full):`, Buffer.from(outputCommitments[i]).toString('hex'));
  }

  // Phase 0: Create Pending with Proof
  const phase0Tx = await program.methods
    .createPendingWithProof(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      Array.from(inputCommitment),
      Array.from(nullifier),
      outputCommitments.map(c => Array.from(c)),
      outputRecipients,
      outputAmounts.map(a => new BN(a.toString())),
      outputRandomness.map(r => Array.from(r)),
      stealthEphemeralPubkeys.map(e => Array.from(e)),
      new BN(transferAmountForInstruction.toString()),
      new BN(unshieldAmountForInstruction.toString()),
      new BN(feeAmountForInstruction.toString())
    )
    .accountsStrict({
      pool: poolPda,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 450_000 }), // Reduced: smaller PDA (192 bytes saved) = less serialization
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  // Phase 1: Verify Commitment Exists
  const phase1Tx = await program.methods
    .verifyCommitmentExists(
      Array.from(operationId),
      0, // commitment_index (always 0 for single-input transfer)
      {
        commitmentAccountHash: lightParams.commitmentAccountHash,
        commitmentMerkleContext: lightParams.commitmentMerkleContext,
        commitmentInclusionProof: lightParams.commitmentInclusionProof,
        commitmentAddressTreeInfo: lightParams.commitmentAddressTreeInfo,
      }
    )
    .accountsStrict({
      pool: poolPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }), // Light Protocol inclusion proof (simple CPI)
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  // Phase 2: Create Nullifier
  const phase2Tx = await program.methods
    .createNullifierAndPending(
      Array.from(operationId),
      0, // nullifier_index (always 0 for single-input transfer)
      {
        proof: lightParams.nullifierNonInclusionProof,
        addressTreeInfo: lightParams.nullifierAddressTreeInfo,
        outputTreeIndex: lightParams.outputTreeIndex,
      }
    )
    .accountsStrict({
      pool: poolPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
    })
    .remainingAccounts(finalRemainingAccounts.map((acc: any) => ({
      pubkey: acc.pubkey,
      isSigner: acc.isSigner,
      isWritable: acc.isWritable,
    })))
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }), // Light Protocol non-inclusion proof (simple CPI)
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  // Phase 3: Process Unshield (optional - but required if unshield_amount > 0 OR fee_amount > 0)
  let phase3Tx = null;
  const needsPhase3 = (params.unshieldAmount && params.unshieldAmount > 0n) ||
                      (params.feeAmount && params.feeAmount > 0n);

  if (needsPhase3) {
    console.log('[Phase 3] Building with:');
    console.log('  pool:', poolPda.toBase58());
    console.log('  tokenVault:', vaultPda.toBase58());
    console.log('  pendingOperation:', pendingOpPda.toBase58());
    console.log('  unshieldRecipient:', unshieldRecipientAta?.toBase58() ?? 'null');
    console.log('  protocolConfig:', params.protocolConfig?.toBase58() ?? 'null');
    console.log('  treasuryTokenAccount:', params.treasuryTokenAccount?.toBase58() ?? 'null');
    console.log('  relayer:', params.relayer.toBase58());
    console.log('  feeAmount:', feeAmountForInstruction.toString());
    console.log('  unshieldAmount:', unshieldAmountForInstruction.toString());

    // Build accounts object - Anchor's Option<Account> maps to optional fields
    const phase3Accounts: Record<string, PublicKey | null> = {
      pool: poolPda,
      tokenVault: vaultPda,
      pendingOperation: pendingOpPda,
      protocolConfig: params.protocolConfig ?? null,
      treasuryTokenAccount: params.treasuryTokenAccount ?? null,
      unshieldRecipient: unshieldRecipientAta ?? null,
      relayer: params.relayer,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    // Build pre-instructions for Phase 3
    const phase3PreInstructions: TransactionInstruction[] = [
      ComputeBudgetProgram.setComputeUnitLimit({ units: 150_000 }), // Increased for fee transfer
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ];

    // Add create treasury ATA instruction if treasury wallet is provided
    // This uses idempotent version which succeeds whether or not account exists
    if (params.treasuryWallet && params.treasuryTokenAccount && params.feeAmount && params.feeAmount > 0n) {
      console.log('[Phase 3] Adding create treasury ATA instruction (idempotent)');
      phase3PreInstructions.push(
        createAssociatedTokenAccountIdempotentInstruction(
          params.relayer,           // payer
          params.treasuryTokenAccount, // associated token account
          params.treasuryWallet,    // owner
          params.tokenMint,         // mint
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    phase3Tx = await program.methods
      .processUnshield(
        Array.from(operationId),
        new BN(unshieldAmountForInstruction.toString()) // unshield_amount parameter
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .accounts(phase3Accounts as any)
      .preInstructions(phase3PreInstructions);
    console.log('[Phase 3] Transaction builder created');
  }

  // Return single Phase 0 transaction (others will be built in client.ts)
  return {
    tx: phase0Tx,
    phase1Tx,
    phase2Tx,
    phase3Tx,
    result: {
      nullifier,
      outputCommitments,
      encryptedNotes,
      outputRandomness,
      stealthEphemeralPubkeys,
      outputAmounts,
    },
    operationId,
    pendingCommitments,
  };
}

/**
 * Helper to compute derived values for circuit inputs
 */
export function computeCircuitInputs(
  input: TransactInput,
  outputs: TransactOutput[],
  tokenMint: PublicKey,
  unshieldAmount: bigint = 0n
): {
  inputCommitment: Uint8Array;
  nullifier: Uint8Array;
  outputCommitments: Uint8Array[];
} {
  // Compute input commitment
  const inputCommitment = computeCommitment({
    stealthPubX: input.stealthPubX,
    tokenMint,
    amount: input.amount,
    randomness: input.randomness,
  });

  // Derive nullifier
  const nullifierKey = deriveNullifierKey(
    new Uint8Array(new BigUint64Array([input.spendingKey]).buffer)
  );
  const nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, input.leafIndex);

  // Compute output commitments
  const outputCommitments = outputs.map(output => {
    const randomness = generateRandomness();
    return computeCommitment({
      stealthPubX: output.recipientPubkey.x,
      tokenMint,
      amount: output.amount,
      randomness,
    });
  });

  return { inputCommitment, nullifier, outputCommitments };
}

/**
 * Consolidation input (prepared note with all required fields)
 */
export interface ConsolidationInput {
  /** Stealth public key X coordinate */
  stealthPubX: Uint8Array;
  /** Amount */
  amount: bigint;
  /** Randomness */
  randomness: Uint8Array;
  /** Leaf index in merkle tree */
  leafIndex: number;
  /** Pre-computed commitment */
  commitment: Uint8Array;
  /** Account hash from scanning */
  accountHash: string;
}

/**
 * Consolidation instruction parameters
 */
export interface ConsolidationInstructionParams {
  /** Token mint */
  tokenMint: PublicKey;
  /** Input notes to consolidate (2-3) */
  inputs: ConsolidationInput[];
  /** Pre-computed nullifiers (from ZK proof) */
  nullifiers: Uint8Array[];
  /** Pre-computed output commitment (from ZK proof) */
  outputCommitment: Uint8Array;
  /** Output randomness (from ZK proof) */
  outputRandomness: Uint8Array;
  /** Output amount (from ZK proof) */
  outputAmount: bigint;
  /** Output stealth recipient */
  outputRecipient: {
    stealthPubkey: { x: Uint8Array; y: Uint8Array };
    ephemeralPubkey: { x: Uint8Array; y: Uint8Array };
  };
  /** Merkle root (for ZK proof - dummy, Light Protocol verifies on-chain) */
  merkleRoot: Uint8Array;
  /** Relayer public key */
  relayer: PublicKey;
  /** ZK proof bytes */
  proof: Uint8Array;
}

/**
 * Build consolidation multi-phase transaction
 *
 * Uses the consolidate_3x1 circuit which has different public inputs than transfer:
 * - merkle_root
 * - nullifier_1, nullifier_2, nullifier_3
 * - out_commitment (single)
 * - token_mint
 *
 * NO unshield or fee (consolidation is free)
 */
export async function buildConsolidationWithProgram(
  program: Program,
  params: ConsolidationInstructionParams,
  rpcUrl: string
): Promise<{
  phase0Tx: any;
  phase1Txs: any[];
  phase2Txs: any[];
  operationId: Uint8Array;
  pendingCommitments: Array<{
    pool: PublicKey;
    commitment: Uint8Array;
    stealthEphemeralPubkey: Uint8Array;
    encryptedNote: Uint8Array;
  }>;
}> {
  const programId = program.programId;
  const lightProtocol = new LightProtocol(rpcUrl, programId);
  const circuitId = 'consolidate_3x1';

  // Validate inputs
  if (params.inputs.length < 2 || params.inputs.length > 3) {
    throw new Error('Consolidation requires 2-3 input notes');
  }

  // Derive PDAs
  const [poolPda] = derivePoolPda(params.tokenMint, programId);
  const [vkPda] = deriveVerificationKeyPda(circuitId, programId);

  // Generate operation ID
  const { generateOperationId, derivePendingOperationPda } = await import('./swap');
  const operationId = generateOperationId(
    params.nullifiers[0],
    params.outputCommitment,
    Date.now()
  );
  const [pendingOpPda] = derivePendingOperationPda(operationId, programId);

  console.log(`[Consolidation Phase 0] Generated operation ID: ${Buffer.from(operationId).toString('hex').slice(0, 16)}...`);
  console.log(`[Consolidation Phase 0] Num inputs: ${params.inputs.length}`);
  console.log(`[Consolidation Phase 0] Nullifiers: ${params.nullifiers.length}`);

  // Prepare output
  const stealthEphemeralPubkey = new Uint8Array(64);
  stealthEphemeralPubkey.set(params.outputRecipient.ephemeralPubkey.x, 0);
  stealthEphemeralPubkey.set(params.outputRecipient.ephemeralPubkey.y, 32);

  // Build encrypted note for output
  const outputNote = {
    stealthPubX: params.outputRecipient.stealthPubkey.x,
    tokenMint: params.tokenMint,
    amount: params.outputAmount,
    randomness: params.outputRandomness,
  };
  const encrypted = encryptNote(outputNote, params.outputRecipient.stealthPubkey);
  const encryptedNote = Buffer.from(serializeEncryptedNote(encrypted));

  // Pending commitments (single output for consolidation)
  const pendingCommitments = [{
    pool: poolPda,
    commitment: params.outputCommitment,
    stealthEphemeralPubkey,
    encryptedNote: new Uint8Array(encryptedNote),
  }];

  // Fetch Light Protocol proofs for each input
  const { SystemAccountMetaConfig, PackedAccounts } = await import('@lightprotocol/stateless.js');
  const { DEVNET_V2_TREES } = await import('./constants');
  const systemConfig = SystemAccountMetaConfig.new(lightProtocol.programId);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

  // Add output queue and address tree
  const outputTreeIndex = packedAccounts.insertOrGet(DEVNET_V2_TREES.OUTPUT_QUEUE);
  const addressTree = DEVNET_V2_TREES.ADDRESS_TREE;
  const addressTreeIndex = packedAccounts.insertOrGet(addressTree);

  // Get proofs for all inputs
  const inputProofs = await Promise.all(
    params.inputs.map(async (input, i) => {
      console.log(`[Consolidation] Fetching proof for input ${i}: ${input.accountHash}`);
      const commitmentProof = await lightProtocol.getInclusionProofByHash(input.accountHash);

      // Add tree and queue for this input
      const commitmentTree = new PublicKey(commitmentProof.treeInfo.tree);
      const commitmentQueue = new PublicKey(commitmentProof.treeInfo.queue);
      const treeIndex = packedAccounts.insertOrGet(commitmentTree);
      const queueIndex = packedAccounts.insertOrGet(commitmentQueue);

      if (commitmentProof.treeInfo.cpiContext) {
        packedAccounts.insertOrGet(new PublicKey(commitmentProof.treeInfo.cpiContext));
      }

      return {
        commitmentProof,
        treeIndex,
        queueIndex,
      };
    })
  );

  // Get nullifier non-inclusion proof for first nullifier (we need any valid proof for Light accounts)
  const nullifierAddress = lightProtocol.deriveNullifierAddress(poolPda, params.nullifiers[0]);
  const nullifierProof = await lightProtocol.getValidityProof([nullifierAddress]);

  const { remainingAccounts: finalRemainingAccounts } = packedAccounts.toAccountMetas();

  // ====================================================================
  // PHASE 0: Create Pending with Consolidation Proof
  // ====================================================================
  const phase0Tx = await program.methods
    .createPendingWithProofConsolidation(
      Array.from(operationId),
      Buffer.from(params.proof),
      Array.from(params.merkleRoot),
      params.inputs.length, // num_inputs
      params.inputs.map(i => Array.from(i.commitment)), // input_commitments
      params.nullifiers.map(n => Array.from(n)), // nullifiers
      Array.from(params.outputCommitment), // out_commitment
      Array.from(params.outputRecipient.stealthPubkey.x), // output_recipient
      new BN(params.outputAmount.toString()), // output_amount
      Array.from(params.outputRandomness), // output_randomness
      Array.from(stealthEphemeralPubkey) // stealth_ephemeral_pubkey
    )
    .accountsStrict({
      pool: poolPda,
      verificationKey: vkPda,
      pendingOperation: pendingOpPda,
      relayer: params.relayer,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .preInstructions([
      ComputeBudgetProgram.setComputeUnitLimit({ units: 450_000 }),
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
    ]);

  // ====================================================================
  // PHASE 1: Verify Commitment Exists (for each input)
  // ====================================================================
  const phase1Txs = await Promise.all(
    params.inputs.map(async (input, i) => {
      const proof = inputProofs[i];
      const lightParams = {
        commitmentAccountHash: Array.from(new PublicKey(input.accountHash).toBytes()),
        commitmentMerkleContext: {
          merkleTreePubkeyIndex: proof.treeIndex,
          queuePubkeyIndex: proof.queueIndex,
          leafIndex: proof.commitmentProof.leafIndex,
          rootIndex: proof.commitmentProof.rootIndex,
        },
        commitmentInclusionProof: LightProtocol.convertCompressedProof(proof.commitmentProof),
        commitmentAddressTreeInfo: {
          addressMerkleTreePubkeyIndex: addressTreeIndex,
          addressQueuePubkeyIndex: addressTreeIndex,
          rootIndex: nullifierProof.rootIndices[0] ?? 0,
        },
      };

      return program.methods
        .verifyCommitmentExists(
          Array.from(operationId),
          i, // commitment_index
          lightParams
        )
        .accountsStrict({
          pool: poolPda,
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
    })
  );

  // ====================================================================
  // PHASE 2: Create Nullifier (for each input)
  // ====================================================================
  const phase2Txs = await Promise.all(
    params.inputs.map(async (input, i) => {
      // Get nullifier non-inclusion proof for this specific nullifier
      const nullifierAddr = lightProtocol.deriveNullifierAddress(poolPda, params.nullifiers[i]);
      const nullProof = await lightProtocol.getValidityProof([nullifierAddr]);

      const lightParams = {
        proof: LightProtocol.convertCompressedProof(nullProof),
        addressTreeInfo: {
          addressMerkleTreePubkeyIndex: addressTreeIndex,
          addressQueuePubkeyIndex: addressTreeIndex,
          rootIndex: nullProof.rootIndices[0] ?? 0,
        },
        outputTreeIndex,
      };

      return program.methods
        .createNullifierAndPending(
          Array.from(operationId),
          i, // nullifier_index
          lightParams
        )
        .accountsStrict({
          pool: poolPda,
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
    })
  );

  console.log(`[Consolidation] Built Phase 0 + ${phase1Txs.length} Phase 1 + ${phase2Txs.length} Phase 2 transactions`);

  return {
    phase0Tx,
    phase1Txs,
    phase2Txs,
    operationId,
    pendingCommitments,
  };
}
