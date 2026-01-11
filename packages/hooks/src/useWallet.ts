/**
 * Wallet management hook
 */

import { useCallback, useMemo, useState } from 'react';
import { useCloakCraft } from './provider';

export function useWallet() {
  const { wallet, isConnected, isInitialized, isInitializing, connect, disconnect, createWallet, error } = useCloakCraft();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const importFromSeed = useCallback(
    async (seedPhrase: string) => {
      setIsConnecting(true);
      setConnectError(null);
      try {
        const { deriveWalletFromSeed } = await import('@cloakcraft/sdk');
        const imported = await deriveWalletFromSeed(seedPhrase);
        await connect(imported.exportSpendingKey());
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import wallet';
        setConnectError(message);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [connect]
  );

  const importFromKey = useCallback(
    async (spendingKey: Uint8Array) => {
      setIsConnecting(true);
      setConnectError(null);
      try {
        await connect(spendingKey);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to connect wallet';
        setConnectError(message);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [connect]
  );

  const createAndConnect = useCallback(async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const newWallet = createWallet();
      await connect(newWallet.exportSpendingKey());
      return newWallet;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create wallet';
      setConnectError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [createWallet, connect]);

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
    isConnecting,
    isInitialized,
    isInitializing,
    error: connectError || error,
    connect: importFromKey,
    disconnect,
    createWallet,
    createAndConnect,
    importFromSeed,
    importFromKey,
    exportSpendingKey,
  };
}
