/**
 * Transfer operation hook
 *
 * Provides a simplified interface for transfers. The client handles
 * the complex cryptographic preparation (deriving Y-coordinates,
 * computing commitments, fetching merkle proofs, etc.)
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

/** Simple transfer output (client prepares the full cryptographic details) */
interface SimpleTransferOutput {
  recipient: StealthAddress;
  amount: bigint;
}

/** Simple transfer request (client converts to full TransferParams) */
interface SimpleTransferRequest {
  inputs: DecryptedNote[];
  outputs: SimpleTransferOutput[];
  unshield?: { amount: bigint; recipient: PublicKey };
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
      outputs: SimpleTransferOutput[],
      unshield?: { amount: bigint; recipient: PublicKey },
      relayer?: SolanaKeypair
    ): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isTransferring: false, error: 'Wallet not connected', result: null });
        return null;
      }

      setState({ isTransferring: true, error: null, result: null });

      try {
        // Client's prepareAndTransfer handles all the cryptographic prep
        const result = await client.prepareAndTransfer(
          { inputs, outputs, unshield },
          relayer
        );

        // Sync after successful transfer
        await sync();

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
