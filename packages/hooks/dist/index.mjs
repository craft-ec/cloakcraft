// src/provider.tsx
import { createContext, useContext, useMemo, useState, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { CloakCraftClient } from "@cloakcraft/sdk";
import { jsx } from "react/jsx-runtime";
var CloakCraftContext = createContext(null);
function CloakCraftProvider({
  children,
  rpcUrl,
  indexerUrl,
  programId
}) {
  const [wallet, setWallet] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [notes, setNotes] = useState([]);
  const client = useMemo(
    () => new CloakCraftClient({
      rpcUrl,
      indexerUrl,
      programId: new PublicKey(programId)
    }),
    [rpcUrl, indexerUrl, programId]
  );
  const connect = useCallback(
    (spendingKey) => {
      const newWallet = spendingKey ? client.loadWallet(spendingKey) : client.createWallet();
      setWallet(newWallet);
    },
    [client]
  );
  const disconnect = useCallback(() => {
    setWallet(null);
    setNotes([]);
    setSyncStatus(null);
  }, []);
  const sync = useCallback(async () => {
    if (!wallet) return;
    setIsSyncing(true);
    try {
      const newNotes = await client.syncNotes();
      setNotes((prev) => [...prev, ...newNotes]);
      const status = await client.getSyncStatus();
      setSyncStatus(status);
    } finally {
      setIsSyncing(false);
    }
  }, [client, wallet]);
  const createWallet = useCallback(() => {
    return client.createWallet();
  }, [client]);
  const value = {
    client,
    wallet,
    isConnected: wallet !== null,
    isSyncing,
    syncStatus,
    notes,
    connect,
    disconnect,
    sync,
    createWallet
  };
  return /* @__PURE__ */ jsx(CloakCraftContext.Provider, { value, children });
}
function useCloakCraft() {
  const context = useContext(CloakCraftContext);
  if (!context) {
    throw new Error("useCloakCraft must be used within a CloakCraftProvider");
  }
  return context;
}

// src/useWallet.ts
import { useCallback as useCallback2, useMemo as useMemo2 } from "react";
import { deriveWalletFromSeed } from "@cloakcraft/sdk";
function useWallet() {
  const { wallet, isConnected, connect, disconnect, createWallet } = useCloakCraft();
  const importFromSeed = useCallback2(
    async (seedPhrase) => {
      const imported = await deriveWalletFromSeed(seedPhrase);
      connect(imported.exportSpendingKey());
    },
    [connect]
  );
  const importFromKey = useCallback2(
    (spendingKey) => {
      connect(spendingKey);
    },
    [connect]
  );
  const exportSpendingKey = useCallback2(() => {
    if (!wallet) return null;
    return wallet.exportSpendingKey();
  }, [wallet]);
  const publicKey = useMemo2(() => {
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
    exportSpendingKey
  };
}

// src/useBalance.ts
import { useState as useState2, useEffect, useCallback as useCallback3 } from "react";
function useBalance(tokenMint) {
  const { client, wallet, notes } = useCloakCraft();
  const [balance, setBalance] = useState2(0n);
  const [isLoading, setIsLoading] = useState2(false);
  const refresh = useCallback3(async () => {
    if (!client || !wallet || !tokenMint) return;
    setIsLoading(true);
    try {
      const unspentNotes = await client.getUnspentNotes(tokenMint);
      const total = unspentNotes.reduce((sum, note) => sum + note.amount, 0n);
      setBalance(total);
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet, tokenMint]);
  useEffect(() => {
    refresh();
  }, [refresh, notes]);
  return {
    balance,
    isLoading,
    refresh
  };
}

// src/useNotes.ts
import { useState as useState3, useCallback as useCallback4, useMemo as useMemo3 } from "react";
function useNotes(tokenMint) {
  const { notes, sync, isSyncing } = useCloakCraft();
  const filteredNotes = useMemo3(() => {
    if (!tokenMint) return notes;
    return notes.filter((note) => note.tokenMint.equals(tokenMint));
  }, [notes, tokenMint]);
  const totalAmount = useMemo3(() => {
    return filteredNotes.reduce((sum, note) => sum + note.amount, 0n);
  }, [filteredNotes]);
  return {
    notes: filteredNotes,
    totalAmount,
    noteCount: filteredNotes.length,
    sync,
    isSyncing
  };
}

// src/useShield.ts
import { useState as useState4, useCallback as useCallback5 } from "react";
import { PublicKey as PublicKey2 } from "@solana/web3.js";
import { generateStealthAddress } from "@cloakcraft/sdk";
function useShield() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = useState4({
    isShielding: false,
    error: null,
    result: null
  });
  const shield = useCallback5(
    async (tokenMint, amount, payer) => {
      if (!client || !wallet) {
        setState({ isShielding: false, error: "Wallet not connected", result: null });
        return null;
      }
      setState({ isShielding: true, error: null, result: null });
      try {
        const { stealthAddress } = generateStealthAddress(wallet.publicKey);
        const [poolPda] = PublicKey2.findProgramAddressSync(
          [Buffer.from("pool"), tokenMint.toBuffer()],
          client.programId
        );
        const result = await client.shield(
          {
            pool: poolPda,
            amount,
            recipient: stealthAddress
          },
          payer
        );
        setState({ isShielding: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Shield failed";
        setState({ isShielding: false, error, result: null });
        return null;
      }
    },
    [client, wallet]
  );
  const reset = useCallback5(() => {
    setState({ isShielding: false, error: null, result: null });
  }, []);
  return {
    ...state,
    shield,
    reset
  };
}

// src/useTransfer.ts
import { useState as useState5, useCallback as useCallback6 } from "react";
function useTransfer() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState5({
    isTransferring: false,
    error: null,
    result: null
  });
  const transfer = useCallback6(
    async (inputs, outputs, unshield, relayer) => {
      if (!client || !wallet) {
        setState({ isTransferring: false, error: "Wallet not connected", result: null });
        return null;
      }
      setState({ isTransferring: true, error: null, result: null });
      try {
        const result = await client.prepareAndTransfer(
          { inputs, outputs, unshield },
          relayer
        );
        await sync();
        setState({ isTransferring: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Transfer failed";
        setState({ isTransferring: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = useCallback6(() => {
    setState({ isTransferring: false, error: null, result: null });
  }, []);
  return {
    ...state,
    transfer,
    reset
  };
}

// src/useOrders.ts
import { useState as useState6, useCallback as useCallback7, useEffect as useEffect2 } from "react";
function useOrders() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = useState6({
    orders: [],
    isLoading: false,
    error: null
  });
  const fetchOrders = useCallback7(async () => {
    if (!client) return;
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await fetch(`${client.indexerUrl}/orders?status=open`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      const orders = await response.json();
      setState({ orders, isLoading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to fetch orders";
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, [client]);
  useEffect2(() => {
    fetchOrders();
  }, [fetchOrders]);
  return {
    ...state,
    refresh: fetchOrders
  };
}
export {
  CloakCraftProvider,
  useBalance,
  useCloakCraft,
  useNotes,
  useOrders,
  useShield,
  useTransfer,
  useWallet
};
