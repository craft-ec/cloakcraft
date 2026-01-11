/**
 * Unshield operation hook
 *
 * Withdraws tokens from the privacy pool back to a public wallet.
 * This is done via a transfer with an unshield output (no recipient, just withdrawal).
 */

import { useState, useCallback } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import type { DecryptedNote, TransactionResult } from '@cloakcraft/types';

interface UnshieldState {
  isUnshielding: boolean;
  error: string | null;
  result: TransactionResult | null;
}

interface UnshieldOptions {
  /** Notes to spend */
  inputs: DecryptedNote[];
  /** Amount to withdraw */
  amount: bigint;
  /** Recipient token account for withdrawn tokens */
  recipient: PublicKey;
}

export function useUnshield() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<UnshieldState>({
    isUnshielding: false,
    error: null,
    result: null,
  });

  const unshield = useCallback(
    async (
      options: UnshieldOptions,
      relayer?: SolanaKeypair
    ): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isUnshielding: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isUnshielding: false, error: 'Program not set. Call setProgram() first.', result: null });
        return null;
      }

      const { inputs, amount, recipient } = options;

      // Validate inputs
      const totalInput = inputs.reduce((sum, n) => sum + n.amount, 0n);
      if (totalInput < amount) {
        setState({
          isUnshielding: false,
          error: `Insufficient balance. Have ${totalInput}, need ${amount}`,
          result: null,
        });
        return null;
      }

      setState({ isUnshielding: true, error: null, result: null });

      try {
        // Calculate change (if any)
        const change = totalInput - amount;

        // Prepare outputs: only change back to self (if any)
        const outputs = [];
        if (change > 0n) {
          // Import generateStealthAddress here to avoid circular deps
          const { generateStealthAddress } = await import('@cloakcraft/sdk');
          const { stealthAddress } = generateStealthAddress(wallet.publicKey);
          outputs.push({
            recipient: stealthAddress,
            amount: change,
          });
        }

        // Execute transfer with unshield
        const result = await client.prepareAndTransfer(
          {
            inputs,
            outputs,
            unshield: { amount, recipient },
          },
          relayer
        );

        // Sync notes after successful unshield
        if (inputs.length > 0 && inputs[0].tokenMint) {
          await sync(inputs[0].tokenMint);
        }

        setState({ isUnshielding: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Unshield failed';
        setState({ isUnshielding: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isUnshielding: false, error: null, result: null });
  }, []);

  return {
    ...state,
    unshield,
    reset,
  };
}
