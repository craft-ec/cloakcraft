"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CloakCraftProvider: () => CloakCraftProvider,
  useBalance: () => useBalance,
  useCloakCraft: () => useCloakCraft,
  useNotes: () => useNotes,
  useOrders: () => useOrders,
  useShield: () => useShield,
  useTransfer: () => useTransfer,
  useWallet: () => useWallet
});
module.exports = __toCommonJS(index_exports);

// src/provider.tsx
var import_react = require("react");
var import_web3 = require("@solana/web3.js");
var import_sdk = require("@cloakcraft/sdk");
var import_jsx_runtime = require("react/jsx-runtime");
var CloakCraftContext = (0, import_react.createContext)(null);
function CloakCraftProvider({
  children,
  rpcUrl,
  indexerUrl,
  programId
}) {
  const [wallet, setWallet] = (0, import_react.useState)(null);
  const [isSyncing, setIsSyncing] = (0, import_react.useState)(false);
  const [syncStatus, setSyncStatus] = (0, import_react.useState)(null);
  const [notes, setNotes] = (0, import_react.useState)([]);
  const client = (0, import_react.useMemo)(
    () => new import_sdk.CloakCraftClient({
      rpcUrl,
      indexerUrl,
      programId: new import_web3.PublicKey(programId)
    }),
    [rpcUrl, indexerUrl, programId]
  );
  const connect = (0, import_react.useCallback)(
    (spendingKey) => {
      const newWallet = spendingKey ? client.loadWallet(spendingKey) : client.createWallet();
      setWallet(newWallet);
    },
    [client]
  );
  const disconnect = (0, import_react.useCallback)(() => {
    setWallet(null);
    setNotes([]);
    setSyncStatus(null);
  }, []);
  const sync = (0, import_react.useCallback)(async () => {
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
  const createWallet = (0, import_react.useCallback)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CloakCraftContext.Provider, { value, children });
}
function useCloakCraft() {
  const context = (0, import_react.useContext)(CloakCraftContext);
  if (!context) {
    throw new Error("useCloakCraft must be used within a CloakCraftProvider");
  }
  return context;
}

// src/useWallet.ts
var import_react2 = require("react");
var import_sdk2 = require("@cloakcraft/sdk");
function useWallet() {
  const { wallet, isConnected, connect, disconnect, createWallet } = useCloakCraft();
  const importFromSeed = (0, import_react2.useCallback)(
    async (seedPhrase) => {
      const imported = await (0, import_sdk2.deriveWalletFromSeed)(seedPhrase);
      connect(imported.exportSpendingKey());
    },
    [connect]
  );
  const importFromKey = (0, import_react2.useCallback)(
    (spendingKey) => {
      connect(spendingKey);
    },
    [connect]
  );
  const exportSpendingKey = (0, import_react2.useCallback)(() => {
    if (!wallet) return null;
    return wallet.exportSpendingKey();
  }, [wallet]);
  const publicKey = (0, import_react2.useMemo)(() => {
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
var import_react3 = require("react");
function useBalance(tokenMint) {
  const { client, wallet, notes } = useCloakCraft();
  const [balance, setBalance] = (0, import_react3.useState)(0n);
  const [isLoading, setIsLoading] = (0, import_react3.useState)(false);
  const refresh = (0, import_react3.useCallback)(async () => {
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
  (0, import_react3.useEffect)(() => {
    refresh();
  }, [refresh, notes]);
  return {
    balance,
    isLoading,
    refresh
  };
}

// src/useNotes.ts
var import_react4 = require("react");
function useNotes(tokenMint) {
  const { notes, sync, isSyncing } = useCloakCraft();
  const filteredNotes = (0, import_react4.useMemo)(() => {
    if (!tokenMint) return notes;
    return notes.filter((note) => note.tokenMint.equals(tokenMint));
  }, [notes, tokenMint]);
  const totalAmount = (0, import_react4.useMemo)(() => {
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
var import_react5 = require("react");
var import_web32 = require("@solana/web3.js");
var import_sdk3 = require("@cloakcraft/sdk");
function useShield() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = (0, import_react5.useState)({
    isShielding: false,
    error: null,
    result: null
  });
  const shield = (0, import_react5.useCallback)(
    async (tokenMint, amount, payer) => {
      if (!client || !wallet) {
        setState({ isShielding: false, error: "Wallet not connected", result: null });
        return null;
      }
      setState({ isShielding: true, error: null, result: null });
      try {
        const { stealthAddress } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
        const [poolPda] = import_web32.PublicKey.findProgramAddressSync(
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
  const reset = (0, import_react5.useCallback)(() => {
    setState({ isShielding: false, error: null, result: null });
  }, []);
  return {
    ...state,
    shield,
    reset
  };
}

// src/useTransfer.ts
var import_react6 = require("react");
function useTransfer() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react6.useState)({
    isTransferring: false,
    error: null,
    result: null
  });
  const transfer = (0, import_react6.useCallback)(
    async (inputs, outputs, unshield, relayer) => {
      if (!client || !wallet) {
        setState({ isTransferring: false, error: "Wallet not connected", result: null });
        return null;
      }
      setState({ isTransferring: true, error: null, result: null });
      try {
        const result = await client.transfer(
          {
            inputs,
            outputs,
            unshield
          },
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
  const reset = (0, import_react6.useCallback)(() => {
    setState({ isTransferring: false, error: null, result: null });
  }, []);
  return {
    ...state,
    transfer,
    reset
  };
}

// src/useOrders.ts
var import_react7 = require("react");
function useOrders() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = (0, import_react7.useState)({
    orders: [],
    isLoading: false,
    error: null
  });
  const fetchOrders = (0, import_react7.useCallback)(async () => {
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
  (0, import_react7.useEffect)(() => {
    fetchOrders();
  }, [fetchOrders]);
  return {
    ...state,
    refresh: fetchOrders
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CloakCraftProvider,
  useBalance,
  useCloakCraft,
  useNotes,
  useOrders,
  useShield,
  useTransfer,
  useWallet
});
