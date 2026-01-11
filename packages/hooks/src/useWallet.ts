/**
 * Wallet management hook
 */

import { useCallback, useMemo } from 'react';
import { useCloakCraft } from './provider';
import { deriveWalletFromSeed } from '@cloakcraft/sdk';

export function useWallet() {
  const { wallet, isConnected, connect, disconnect, createWallet } = useCloakCraft();

  const importFromSeed = useCallback(
    async (seedPhrase: string) => {
      const imported = await deriveWalletFromSeed(seedPhrase);
      connect(imported.exportSpendingKey());
    },
    [connect]
  );

  const importFromKey = useCallback(
    (spendingKey: Uint8Array) => {
      connect(spendingKey);
    },
    [connect]
  );

  const exportSpendingKey = useCallback(() => {
    if (!wallet) return null;
    return wallet.exportSpendingKey();
  }, [wallet]);

  const publicKey = useMemo(() => {
    return wallet?.publicKey ?? null;
  }, [wallet]);

  return {
    wallet,
    publicKey,
    isConnected,
    connect,
    disconnect,
    createWallet,
    importFromSeed,
    importFromKey,
    exportSpendingKey,
  };
}
