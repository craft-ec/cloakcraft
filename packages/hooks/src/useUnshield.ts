/**
 * Unshield operation hook
 *
 * Withdraws tokens from the privacy pool back to a public wallet.
 * This is done via a transfer with an unshield output (no recipient, just withdrawal).
 */

import { useState, useCallback } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
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
  /** Recipient wallet address (will derive token account) or token account directly */
  recipient: PublicKey;
  /** Wallet public key (for wallet adapter) */
  walletPublicKey?: PublicKey;
  /** If true, recipient is a wallet address and token account will be derived */
  isWalletAddress?: boolean;
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
      options: UnshieldOptions
    ): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isUnshielding: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isUnshielding: false, error: 'Program not set. Call setProgram() first.', result: null });
        return null;
      }

      const { inputs, amount, recipient, isWalletAddress } = options;

      setState({ isUnshielding: true, error: null, result: null });

      // Derive token account from wallet address if needed
      let recipientTokenAccount = recipient;
      if (isWalletAddress && inputs[0]?.tokenMint) {
        try {
          recipientTokenAccount = getAssociatedTokenAddressSync(
            inputs[0].tokenMint,
            recipient,
            true // allowOwnerOffCurve - standard practice for flexibility
          );
        } catch (err) {
          setState({
            isUnshielding: false,
            error: `Failed to derive token account: ${err instanceof Error ? err.message : 'Unknown error'}`,
            result: null,
          });
          return null;
        }
      }

      // Force re-scan to get fresh notes with stealthEphemeralPubkey
      // Clear cache to ensure we get truly fresh data
      let freshNotes: DecryptedNote[];
      try {
        const tokenMint = inputs[0]?.tokenMint;
        client.clearScanCache();
        freshNotes = await client.scanNotes(tokenMint);
      } catch (err) {
        setState({
          isUnshielding: false,
          error: `Failed to scan notes: ${err instanceof Error ? err.message : 'Unknown error'}`,
          result: null,
        });
        return null;
      }

      // Find matching fresh notes for the input commitments
      // The UI-selected notes may be stale (missing stealthEphemeralPubkey)
      // We need to match by commitment to find the fresh versions
      const matchedInputs: DecryptedNote[] = [];
      for (const input of inputs) {
        // Match by commitment (unique identifier for a note)
        const fresh = freshNotes.find(n =>
          n.commitment && input.commitment &&
          Buffer.from(n.commitment).toString('hex') === Buffer.from(input.commitment).toString('hex')
        );
        if (fresh) {
          matchedInputs.push(fresh);
        } else {
          setState({
            isUnshielding: false,
            error: 'Selected note not found in pool. It may have been spent or not yet synced.',
            result: null,
          });
          return null;
        }
      }

      // Validate inputs
      const totalInput = matchedInputs.reduce((sum, n) => sum + n.amount, 0n);
      if (totalInput < amount) {
        setState({
          isUnshielding: false,
          error: `Insufficient balance. Have ${totalInput}, need ${amount}`,
          result: null,
        });
        return null;
      }

      try {
        // Calculate change (if any)
        const change = totalInput - amount;

        // Import generateStealthAddress here to avoid circular deps
        const { generateStealthAddress } = await import('@cloakcraft/sdk');
        const { stealthAddress } = generateStealthAddress(wallet.publicKey);

        // Circuit always requires at least one output commitment
        // If no change, create a dummy zero-amount output
        const outputs = [{
          recipient: stealthAddress,
          amount: change > 0n ? change : 0n,
        }];

        // Execute transfer with unshield using FRESH notes
        const result = await client.prepareAndTransfer(
          {
            inputs: matchedInputs,  // Use fresh notes with stealthEphemeralPubkey
            outputs,
            unshield: { amount, recipient: recipientTokenAccount },
          },
          undefined // relayer - wallet adapter will be used via provider
        );

        // Sync notes after successful unshield (clear cache for fresh data)
        if (matchedInputs.length > 0 && matchedInputs[0].tokenMint) {
          await sync(matchedInputs[0].tokenMint, true);
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
