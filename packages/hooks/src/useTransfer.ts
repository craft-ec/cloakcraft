/**
 * Transfer operation hook
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

interface TransferOutput {
  recipient: StealthAddress;
  amount: bigint;
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
      unshield?: { amount: bigint; recipient: PublicKey },
      relayer?: SolanaKeypair
    ): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isTransferring: false, error: 'Wallet not connected', result: null });
        return null;
      }

      setState({ isTransferring: true, error: null, result: null });

      try {
        const result = await client.transfer(
          {
            inputs,
            outputs,
            unshield,
          },
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
