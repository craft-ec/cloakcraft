/**
 * Transfer operation hook
 *
 * Provides a simplified interface for private transfers.
 * The client handles all cryptographic preparation.
 */

import { useState, useCallback } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useCloakCraft } from './provider';
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

export function useTransfer() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<TransferState>({
    isTransferring: false,
    error: null,
    result: null,
  });

  const transfer = useCallback(
    async (
      inputs: DecryptedNote[],
      outputs: TransferOutput[],
      unshield?: UnshieldOption,
      relayer?: SolanaKeypair
    ): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isTransferring: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isTransferring: false, error: 'Program not set. Call setProgram() first.', result: null });
        return null;
      }

      setState({ isTransferring: true, error: null, result: null });

      try {
        // Client's prepareAndTransfer handles all the cryptographic prep
        const result = await client.prepareAndTransfer(
          { inputs, outputs, unshield },
          relayer
        );

        // Sync notes after successful transfer
        if (inputs.length > 0 && inputs[0].tokenMint) {
          await sync(inputs[0].tokenMint);
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
 */
export function useNoteSelector(tokenMint: PublicKey) {
  const { notes } = useCloakCraft();
  const [selected, setSelected] = useState<DecryptedNote[]>([]);

  // Filter notes by token mint
  const availableNotes = notes.filter(
    (note) => note.tokenMint && note.tokenMint.equals(tokenMint)
  );

  const selectNotesForAmount = useCallback(
    (targetAmount: bigint): DecryptedNote[] => {
      let total = 0n;
      const selectedNotes: DecryptedNote[] = [];

      // Sort by amount descending for efficient selection
      const sorted = [...availableNotes].sort((a, b) =>
        a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0
      );

      for (const note of sorted) {
        if (total >= targetAmount) break;
        selectedNotes.push(note);
        total += note.amount;
      }

      if (total < targetAmount) {
        throw new Error(`Insufficient balance. Have ${total}, need ${targetAmount}`);
      }

      setSelected(selectedNotes);
      return selectedNotes;
    },
    [availableNotes]
  );

  const clearSelection = useCallback(() => {
    setSelected([]);
  }, []);

  const totalAvailable = availableNotes.reduce((sum, n) => sum + n.amount, 0n);
  const totalSelected = selected.reduce((sum, n) => sum + n.amount, 0n);

  return {
    availableNotes,
    selected,
    totalAvailable,
    totalSelected,
    selectNotesForAmount,
    clearSelection,
  };
}
