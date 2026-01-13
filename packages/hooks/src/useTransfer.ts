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
      walletPublicKey?: PublicKey
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
        const result = await client.prepareAndTransfer(
          { inputs: matchedInputs, outputs, unshield },  // Use fresh notes
          undefined // relayer - wallet adapter will be used via provider
        );

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
