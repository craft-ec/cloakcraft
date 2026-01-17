/**
 * Shield operation hook
 *
 * Shields tokens into the privacy pool
 */

import { useState, useCallback } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import { generateStealthAddress } from '@cloakcraft/sdk';
import type { TransactionResult } from '@cloakcraft/types';

interface ShieldState {
  isShielding: boolean;
  error: string | null;
  result: (TransactionResult & { commitment: Uint8Array; randomness: Uint8Array }) | null;
}

interface ShieldOptions {
  /** Token mint to shield */
  tokenMint: PublicKey;
  /** Amount to shield (in lamports/smallest unit) */
  amount: bigint;
  /** User's token account (source of tokens) */
  userTokenAccount: PublicKey;
  /** Wallet public key (for wallet adapter) */
  walletPublicKey?: PublicKey;
  /** Optional: Shield to a different recipient */
  recipient?: { x: Uint8Array; y: Uint8Array };
}

export function useShield() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<ShieldState>({
    isShielding: false,
    error: null,
    result: null,
  });

  const shield = useCallback(
    async (
      options: ShieldOptions,
      payer?: SolanaKeypair
    ): Promise<(TransactionResult & { commitment: Uint8Array; randomness: Uint8Array }) | null> => {
      if (!client || !wallet) {
        setState({ isShielding: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isShielding: false, error: 'Program not set. Call setProgram() first.', result: null });
        return null;
      }

      setState({ isShielding: true, error: null, result: null });

      try {
        console.log('[useShield] Starting shield...', {
          tokenMint: options.tokenMint.toBase58(),
          amount: options.amount.toString(),
          walletPublicKey: options.walletPublicKey?.toBase58(),
        });

        // Generate stealth address for recipient (self if not specified)
        const recipientPubkey = options.recipient ?? wallet.publicKey;
        console.log('[useShield] Generating stealth address for:', recipientPubkey);
        const { stealthAddress } = generateStealthAddress(recipientPubkey);
        console.log('[useShield] Stealth address generated');

        // The stealthAddress includes ephemeralPubkey which is stored on-chain
        // for the recipient to derive their stealthPrivateKey for decryption
        console.log('[useShield] Calling client.shieldWithWallet...');
        const result = await client.shieldWithWallet(
          {
            pool: options.tokenMint, // This is the token mint, not the pool PDA
            amount: options.amount,
            recipient: stealthAddress, // Contains both stealthPubkey and ephemeralPubkey
            userTokenAccount: options.userTokenAccount,
          },
          options.walletPublicKey!
        );
        console.log('[useShield] shieldWithWallet result:', result);

        // Wait for indexer to pick up new compressed accounts
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes after successful shield (clear cache to pick up new commitment)
        console.log('[useShield] Syncing notes...');
        await sync(options.tokenMint, true);

        setState({ isShielding: false, error: null, result });
        return result;
      } catch (err) {
        console.error('[useShield] ERROR:', err);
        const error = err instanceof Error ? err.message : 'Shield failed';
        setState({ isShielding: false, error, result: null });
        // Re-throw so caller can catch it
        throw err;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isShielding: false, error: null, result: null });
  }, []);

  return {
    ...state,
    shield,
    reset,
  };
}
