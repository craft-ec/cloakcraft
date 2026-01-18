/**
 * Transfer operation hook
 *
 * Provides a simplified interface for private transfers.
 * The client handles all cryptographic preparation.
 */

import { useState, useCallback, useMemo } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import { SmartNoteSelector, SelectionStrategy } from '@cloakcraft/sdk';
import type { DecryptedNote, StealthAddress, TransactionResult } from '@cloakcraft/types';

interface TransferState {
  isTransferring: boolean;
  error: string | null;
  result: TransactionResult | null;
}

/** Simple transfer output */
interface TransferOutput {
  recipient: StealthAddress;
  amount: bigint;
}

/** Unshield option for partial withdrawal */
interface UnshieldOption {
  amount: bigint;
  recipient: PublicKey;
}

/** Progress stages for transfer operation */
export type TransferProgressStage =
  | 'scanning'      // Scanning for fresh notes
  | 'preparing'     // Preparing inputs/outputs
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming';   // Waiting for confirmation

/** Transfer options */
interface TransferOptions {
  inputs: DecryptedNote[];
  outputs: TransferOutput[];
  unshield?: UnshieldOption;
  walletPublicKey?: PublicKey;
  onProgress?: (stage: TransferProgressStage) => void;
}

export function useTransfer() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<TransferState>({
    isTransferring: false,
    error: null,
    result: null,
  });

  const transfer = useCallback(
    async (
      inputsOrOptions: DecryptedNote[] | TransferOptions,
      outputs?: TransferOutput[],
      unshield?: UnshieldOption,
      walletPublicKey?: PublicKey
    ): Promise<TransactionResult | null> => {
      // Support both old signature and new options object
      let inputs: DecryptedNote[];
      let finalOutputs: TransferOutput[];
      let finalUnshield: UnshieldOption | undefined;
      let onProgress: ((stage: TransferProgressStage) => void) | undefined;

      if (Array.isArray(inputsOrOptions)) {
        // Old signature: (inputs, outputs, unshield, walletPublicKey)
        inputs = inputsOrOptions;
        finalOutputs = outputs!;
        finalUnshield = unshield;
      } else {
        // New signature: (options)
        inputs = inputsOrOptions.inputs;
        finalOutputs = inputsOrOptions.outputs;
        finalUnshield = inputsOrOptions.unshield;
        onProgress = inputsOrOptions.onProgress;
      }

      if (!client || !wallet) {
        setState({ isTransferring: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isTransferring: false, error: 'Program not set. Call setProgram() first.', result: null });
        return null;
      }

      setState({ isTransferring: true, error: null, result: null });
      onProgress?.('scanning');

      // Force re-scan to get fresh notes with stealthEphemeralPubkey
      // Clear cache to ensure we get truly fresh data
      let freshNotes: DecryptedNote[];
      try {
        const tokenMint = inputs[0]?.tokenMint;
        client.clearScanCache();
        freshNotes = await client.scanNotes(tokenMint);
      } catch (err) {
        setState({
          isTransferring: false,
          error: `Failed to scan notes: ${err instanceof Error ? err.message : 'Unknown error'}`,
          result: null,
        });
        return null;
      }

      // Find matching fresh notes for the input commitments
      const matchedInputs: DecryptedNote[] = [];
      for (const input of inputs) {
        const fresh = freshNotes.find(n =>
          n.commitment && input.commitment &&
          Buffer.from(n.commitment).toString('hex') === Buffer.from(input.commitment).toString('hex')
        );
        if (fresh) {
          matchedInputs.push(fresh);
        } else {
          setState({
            isTransferring: false,
            error: 'Selected note not found in pool. It may have been spent or not yet synced.',
            result: null,
          });
          return null;
        }
      }

      try {
        // Client's prepareAndTransfer handles all the cryptographic prep
        // Progress is handled inside: preparing → generating → building → approving → executing → confirming

        const result = await client.prepareAndTransfer(
          { inputs: matchedInputs, outputs: finalOutputs, unshield: finalUnshield, onProgress },  // Use fresh notes
          undefined // relayer - wallet adapter will be used via provider
        );

        // Wait for indexer to pick up new compressed accounts
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes after successful transfer (clear cache for fresh data)
        if (matchedInputs.length > 0 && matchedInputs[0].tokenMint) {
          await sync(matchedInputs[0].tokenMint, true);
        }

        setState({ isTransferring: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Transfer failed';
        setState({ isTransferring: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isTransferring: false, error: null, result: null });
  }, []);

  return {
    ...state,
    transfer,
    reset,
  };
}

/**
 * Hook for selecting notes for a transfer
 *
 * Uses SmartNoteSelector for intelligent note selection based on:
 * - Available circuit types (1x2, 2x2, 3x2)
 * - Selection strategy
 * - Fee amounts
 */
export function useNoteSelector(tokenMint: PublicKey) {
  const { notes } = useCloakCraft();
  const [selected, setSelected] = useState<DecryptedNote[]>([]);

  // Create SmartNoteSelector
  const selector = useMemo(() => new SmartNoteSelector(), []);

  // Filter notes by token mint
  const availableNotes = useMemo(() =>
    notes.filter((note) => note.tokenMint && note.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );

  /**
   * Select notes for a target amount using SmartNoteSelector
   *
   * @param targetAmount - Amount needed
   * @param options - Selection options
   */
  const selectNotesForAmount = useCallback(
    (
      targetAmount: bigint,
      options?: {
        strategy?: SelectionStrategy;
        maxInputs?: number;
        feeAmount?: bigint;
      }
    ): DecryptedNote[] => {
      const result = selector.selectNotes(availableNotes, targetAmount, {
        strategy: options?.strategy ?? 'greedy',
        maxInputs: options?.maxInputs ?? 2,
        feeAmount: options?.feeAmount,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setSelected(result.notes);
      return result.notes;
    },
    [availableNotes, selector]
  );

  /**
   * Get selection result with circuit type recommendation
   */
  const getSelectionResult = useCallback(
    (
      targetAmount: bigint,
      options?: {
        strategy?: SelectionStrategy;
        maxInputs?: number;
        feeAmount?: bigint;
      }
    ) => {
      // Use smallest-first by default to reduce fragmentation
      // This uses smaller notes first, creating smaller change outputs
      return selector.selectNotes(availableNotes, targetAmount, {
        strategy: options?.strategy ?? 'smallest-first',
        maxInputs: options?.maxInputs ?? 2,
        feeAmount: options?.feeAmount,
      });
    },
    [availableNotes, selector]
  );

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  // Analyze fragmentation
  const fragmentation = useMemo(
    () => selector.analyzeFragmentation(availableNotes),
    [availableNotes, selector]
  );

  const totalAvailable = availableNotes.reduce((sum, n) => sum + n.amount, 0n);
  const totalSelected = selected.reduce((sum, n) => sum + n.amount, 0n);

  return {
    availableNotes,
    selected,
    totalAvailable,
    totalSelected,
    selectNotesForAmount,
    getSelectionResult,
    clearSelection,
    fragmentation,
    shouldConsolidate: fragmentation.shouldConsolidate,
  };
}
