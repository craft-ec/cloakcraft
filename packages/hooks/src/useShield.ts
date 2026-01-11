/**
 * Shield operation hook
 */

import { useState, useCallback } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import { generateStealthAddress } from '@cloakcraft/sdk';
import type { TransactionResult } from '@cloakcraft/types';

interface ShieldState {
  isShielding: boolean;
  error: string | null;
  result: TransactionResult | null;
}

export function useShield() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = useState<ShieldState>({
    isShielding: false,
    error: null,
    result: null,
  });

  const shield = useCallback(
    async (
      tokenMint: PublicKey,
      amount: bigint,
      payer: SolanaKeypair
    ): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isShielding: false, error: 'Wallet not connected', result: null });
        return null;
      }

      setState({ isShielding: true, error: null, result: null });

      try {
        // Generate stealth address for self
        const { stealthAddress } = generateStealthAddress(wallet.publicKey);

        // Get pool PDA
        const [poolPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('pool'), tokenMint.toBuffer()],
          client.programId
        );

        const result = await client.shield(
          {
            pool: poolPda,
            amount,
            recipient: stealthAddress,
          },
          payer
        );

        setState({ isShielding: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Shield failed';
        setState({ isShielding: false, error, result: null });
        return null;
      }
    },
    [client, wallet]
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
