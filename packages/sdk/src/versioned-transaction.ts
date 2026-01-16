/**
 * Versioned Transaction Utilities
 *
 * Enables atomic multi-phase execution by combining all instructions
 * into a single versioned transaction.
 *
 * Benefits:
 * - Single signature (vs 5 separate signatures)
 * - Atomic execution (all succeed or all revert)
 * - Works on devnet and mainnet
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
  AddressLookupTableAccount,
  ComputeBudgetProgram,
} from '@solana/web3.js';

/**
 * Maximum transaction size in bytes
 * Solana's limit is 1232 bytes for versioned transactions
 */
export const MAX_TRANSACTION_SIZE = 1232;

/**
 * Configuration for versioned transaction builder
 */
export interface VersionedTransactionConfig {
  /** Compute unit limit (default: 1.4M for complex ZK operations) */
  computeUnits?: number;
  /** Compute unit price in micro-lamports (default: auto) */
  computeUnitPrice?: number;
  /** Address lookup tables for address compression (enables larger transactions) */
  lookupTables?: AddressLookupTableAccount[];
}

/**
 * Build a versioned transaction from instructions
 *
 * @param connection - Solana connection
 * @param instructions - Instructions to include
 * @param payer - Transaction fee payer
 * @param config - Configuration options
 * @returns Versioned transaction
 */
export async function buildVersionedTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  config: VersionedTransactionConfig = {}
): Promise<VersionedTransaction> {
  // Add compute budget instructions
  const computeBudgetIxs: TransactionInstruction[] = [];

  // Set compute unit limit (default 1.4M for complex operations)
  const computeUnits = config.computeUnits ?? 1_400_000;
  computeBudgetIxs.push(
    ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits })
  );

  // Set compute unit price if specified
  if (config.computeUnitPrice !== undefined) {
    computeBudgetIxs.push(
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: config.computeUnitPrice })
    );
  }

  // Combine all instructions
  const allInstructions = [...computeBudgetIxs, ...instructions];

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();

  // Build versioned transaction message
  const messageV0 = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(config.lookupTables);

  // Create versioned transaction
  const versionedTx = new VersionedTransaction(messageV0);

  return versionedTx;
}

/**
 * Estimate the size of a versioned transaction
 *
 * @param tx - Versioned transaction
 * @returns Estimated size in bytes, or -1 if serialization fails
 */
export function estimateTransactionSize(tx: VersionedTransaction): number {
  try {
    // Serialize the transaction to get actual size
    const serialized = tx.serialize();
    return serialized.length;
  } catch (err) {
    console.error('[Versioned TX] Failed to serialize transaction:', err);
    // Return -1 to indicate serialization failed (transaction too large or malformed)
    return -1;
  }
}

/**
 * Check if instructions will fit in a single versioned transaction
 *
 * @param connection - Solana connection
 * @param instructions - Instructions to check
 * @param payer - Transaction fee payer
 * @param config - Configuration options
 * @returns True if instructions fit within size limit
 */
export async function canFitInSingleTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  config: VersionedTransactionConfig = {}
): Promise<boolean> {
  try {
    // Build unsigned transaction
    const tx = await buildVersionedTransaction(connection, instructions, payer, config);

    // Check size
    const size = estimateTransactionSize(tx);

    if (size === -1) {
      console.log('[Versioned TX] Transaction serialization failed - too large or malformed');
      return false;
    }

    console.log(`[Versioned TX] Estimated size: ${size}/${MAX_TRANSACTION_SIZE} bytes`);

    return size <= MAX_TRANSACTION_SIZE;
  } catch (err) {
    console.error('[Versioned TX] Size check failed:', err);
    return false;
  }
}

/**
 * Multi-phase operation instructions
 */
export interface MultiPhaseInstructions {
  /** Phase 1: Verify proof + update state */
  phase1: TransactionInstruction;
  /** Phase 2: Create nullifiers */
  nullifiers: TransactionInstruction[];
  /** Phase 3: Create commitments */
  commitments: TransactionInstruction[];
  /** Phase 4: Close pending operation */
  cleanup: TransactionInstruction;
}

/**
 * Build atomic multi-phase transaction
 *
 * Combines all phases into a single versioned transaction for atomic execution.
 *
 * @param connection - Solana connection
 * @param phases - Multi-phase instructions
 * @param payer - Transaction fee payer
 * @param config - Configuration options
 * @returns Versioned transaction or null if too large
 */
export async function buildAtomicMultiPhaseTransaction(
  connection: Connection,
  phases: MultiPhaseInstructions,
  payer: PublicKey,
  config: VersionedTransactionConfig = {}
): Promise<VersionedTransaction | null> {
  // Combine all instructions in order
  const allInstructions = [
    phases.phase1,
    ...phases.nullifiers,
    ...phases.commitments,
    phases.cleanup,
  ];

  console.log(`[Atomic TX] Building transaction with ${allInstructions.length} instructions`);
  console.log(`  - Phase 1: 1 instruction`);
  console.log(`  - Nullifiers: ${phases.nullifiers.length} instructions`);
  console.log(`  - Commitments: ${phases.commitments.length} instructions`);
  console.log(`  - Cleanup: 1 instruction`);

  // Check if it fits
  const canFit = await canFitInSingleTransaction(connection, allInstructions, payer, config);

  if (!canFit) {
    console.log('[Atomic TX] Transaction too large, falling back to sequential execution');
    return null;
  }

  // Build the transaction
  const tx = await buildVersionedTransaction(connection, allInstructions, payer, config);

  console.log('[Atomic TX] Transaction built successfully');
  return tx;
}

/**
 * Execute versioned transaction with retry logic
 *
 * @param connection - Solana connection
 * @param tx - Versioned transaction (must be signed)
 * @param options - Send options
 * @returns Transaction signature
 */
export async function executeVersionedTransaction(
  connection: Connection,
  tx: VersionedTransaction,
  options: {
    maxRetries?: number;
    skipPreflight?: boolean;
  } = {}
): Promise<string> {
  const maxRetries = options.maxRetries ?? 3;
  const skipPreflight = options.skipPreflight ?? false;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Versioned TX] Sending transaction (attempt ${attempt + 1}/${maxRetries})...`);

      const rawTransaction = tx.serialize();
      const signature = await connection.sendRawTransaction(rawTransaction, {
        skipPreflight,
        maxRetries: 0, // Handle retries ourselves
        preflightCommitment: 'confirmed',
      });

      console.log(`[Versioned TX] Transaction sent: ${signature}`);
      console.log(`[Versioned TX] Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);

      // Get latest blockhash for confirmation
      const latestBlockhash = await connection.getLatestBlockhash('confirmed');

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction({
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      }, 'confirmed');

      if (confirmation.value.err) {
        console.error('[Versioned TX] Transaction failed:', confirmation.value.err);
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log(`[Versioned TX] ✅ Transaction confirmed successfully: ${signature}`);
      return signature;

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[Versioned TX] Attempt ${attempt + 1} failed:`, lastError.message);

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        console.log(`[Versioned TX] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw new Error(`Transaction failed after ${maxRetries} attempts: ${lastError?.message}`);
}

/**
 * Build instruction from Anchor method builder
 *
 * Helper to extract TransactionInstruction from Anchor's method builder.
 *
 * @param methodBuilder - Anchor method builder (with .instruction())
 * @returns TransactionInstruction
 */
export async function getInstructionFromAnchorMethod(
  methodBuilder: any
): Promise<TransactionInstruction> {
  return await methodBuilder.instruction();
}
