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

/** Progress stages for unshield operation */
export type UnshieldProgressStage =
  | 'scanning'      // Scanning for fresh notes
  | 'preparing'     // Preparing inputs/outputs
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming';   // Waiting for confirmation

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
  /** Optional progress callback */
  onProgress?: (stage: UnshieldProgressStage) => void;
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

      const { inputs, amount, recipient, isWalletAddress, onProgress } = options;

      setState({ isUnshielding: true, error: null, result: null });
      onProgress?.('scanning');

      // Derive token account from wallet address if needed
      let recipientTokenAccount = recipient;
      if (isWalletAddress && inputs[0]?.tokenMint) {
        try {
          console.log('[Unshield] Deriving ATA from wallet:', recipient.toBase58());
          console.log('[Unshield] Token mint:', inputs[0].tokenMint.toBase58());
          recipientTokenAccount = getAssociatedTokenAddressSync(
            inputs[0].tokenMint,
            recipient,
            true // allowOwnerOffCurve - standard practice for flexibility
          );
          console.log('[Unshield] Derived ATA:', recipientTokenAccount.toBase58());
        } catch (err) {
          console.error('[Unshield] Failed to derive ATA:', err);
          setState({
            isUnshielding: false,
            error: `Failed to derive token account: ${err instanceof Error ? err.message : 'Unknown error'}`,
            result: null,
          });
          return null;
        }
      } else {
        console.log('[Unshield] Skipping ATA derivation - isWalletAddress:', isWalletAddress, 'has tokenMint:', !!inputs[0]?.tokenMint);
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
        onProgress?.('preparing');

        // Calculate change (if any)
        const change = totalInput - amount;
        console.log('[Unshield] Total input:', totalInput.toString());
        console.log('[Unshield] Amount to unshield:', amount.toString());
        console.log('[Unshield] Change:', change.toString());

        // Import generateStealthAddress here to avoid circular deps
        const { generateStealthAddress } = await import('@cloakcraft/sdk');

        // Circuit always requires at least one output commitment
        // If change > 0, create a real change output
        // If change = 0 (full unshield), we still need an output for the circuit
        // but it will be a zero-amount note to self
        const outputs: Array<{ recipient: ReturnType<typeof generateStealthAddress>['stealthAddress']; amount: bigint }> = [];

        if (change > 0n) {
          // Real change output
          const { stealthAddress } = generateStealthAddress(wallet.publicKey);
          outputs.push({
            recipient: stealthAddress,
            amount: change,
          });
        } else {
          // Full unshield - create a TRUE dummy output with all zeros
          // This ensures the commitment matches what the circuit expects for a dummy
          // Commitment = Poseidon(domain, zeros, tokenMint, 0, zeros)
          const dummyStealthAddress = {
            stealthPubkey: {
              x: new Uint8Array(32),  // zeros
              y: new Uint8Array(32),  // zeros
            },
            ephemeralPubkey: {
              x: new Uint8Array(32),  // zeros
              y: new Uint8Array(32),  // zeros
            },
          };
          outputs.push({
            recipient: dummyStealthAddress as ReturnType<typeof generateStealthAddress>['stealthAddress'],
            amount: 0n,
          });
        }

        console.log('[Unshield] Matched inputs:', matchedInputs.length);
        console.log('[Unshield] Outputs:', outputs.length);
        console.log('[Unshield] Recipient token account:', recipientTokenAccount.toBase58());

        // Execute transfer with unshield using FRESH notes
        // Progress is handled inside prepareAndTransfer → transfer:
        // preparing → generating → building → approving → executing → confirming
        console.log('[Unshield] Calling prepareAndTransfer...');

        const result = await client.prepareAndTransfer(
          {
            inputs: matchedInputs,  // Use fresh notes with stealthEphemeralPubkey
            outputs,
            unshield: { amount, recipient: recipientTokenAccount },
            onProgress,  // Pass progress callback to client
          },
          undefined // relayer - wallet adapter will be used via provider
        );

        console.log('[Unshield] prepareAndTransfer result:', result);

        // Wait for indexer to pick up new compressed accounts
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes after successful unshield (clear cache for fresh data)
        if (matchedInputs.length > 0 && matchedInputs[0].tokenMint) {
          await sync(matchedInputs[0].tokenMint, true);
        }

        setState({ isUnshielding: false, error: null, result });
        return result;
      } catch (err) {
        console.error('[Unshield] Error:', err);
        const error = err instanceof Error ? err.message : 'Unshield failed';
        console.error('[Unshield] Error message:', error);
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
