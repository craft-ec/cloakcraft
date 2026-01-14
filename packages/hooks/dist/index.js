"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  CloakCraftProvider: () => CloakCraftProvider,
  WALLET_DERIVATION_MESSAGE: () => WALLET_DERIVATION_MESSAGE,
  useAllBalances: () => useAllBalances,
  useBalance: () => useBalance,
  useCloakCraft: () => useCloakCraft,
  useInitializePool: () => useInitializePool,
  useNoteSelection: () => useNoteSelection,
  useNoteSelector: () => useNoteSelector,
  useNotes: () => useNotes,
  useNullifierStatus: () => useNullifierStatus,
  useOrders: () => useOrders,
  usePool: () => usePool,
  usePoolList: () => usePoolList,
  usePrivateBalance: () => usePrivateBalance,
  usePublicBalance: () => usePublicBalance,
  useScanner: () => useScanner,
  useShield: () => useShield,
  useSolBalance: () => useSolBalance,
  useTokenBalances: () => useTokenBalances,
  useTransfer: () => useTransfer,
  useUnshield: () => useUnshield,
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
  programId,
  heliusApiKey,
  network = "devnet",
  autoInitialize = true,
  solanaWalletPubkey,
  addressLookupTables
}) {
  const [wallet, setWallet] = (0, import_react.useState)(null);
  const [isInitialized, setIsInitialized] = (0, import_react.useState)(false);
  const [isInitializing, setIsInitializing] = (0, import_react.useState)(false);
  const [isProverReady, setIsProverReady] = (0, import_react.useState)(false);
  const [isSyncing, setIsSyncing] = (0, import_react.useState)(false);
  const [syncStatus, setSyncStatus] = (0, import_react.useState)(null);
  const [notes, setNotes] = (0, import_react.useState)([]);
  const [error, setError] = (0, import_react.useState)(null);
  const STORAGE_KEY = solanaWalletPubkey ? `cloakcraft_spending_key_${solanaWalletPubkey}` : "cloakcraft_spending_key";
  (0, import_react.useEffect)(() => {
    if (solanaWalletPubkey) {
      setWallet(null);
      setNotes([]);
      setIsProverReady(false);
    }
  }, [solanaWalletPubkey]);
  const client = (0, import_react.useMemo)(
    () => new import_sdk.CloakCraftClient({
      rpcUrl,
      indexerUrl,
      programId: new import_web3.PublicKey(programId),
      heliusApiKey,
      network,
      circuitsBaseUrl: "/circom",
      // Circom circuits in /public/circom/
      addressLookupTables: addressLookupTables?.map((addr) => new import_web3.PublicKey(addr))
    }),
    [rpcUrl, indexerUrl, programId, heliusApiKey, network, addressLookupTables]
  );
  (0, import_react.useEffect)(() => {
    if (autoInitialize && !isInitialized && !isInitializing) {
      setIsInitializing(true);
      (0, import_sdk.initPoseidon)().then(() => {
        setIsInitialized(true);
        setError(null);
      }).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to initialize");
      }).finally(() => {
        setIsInitializing(false);
      });
    }
  }, [autoInitialize, isInitialized, isInitializing]);
  (0, import_react.useEffect)(() => {
    if (isInitialized && !wallet) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const spendingKey = new Uint8Array(JSON.parse(stored));
          client.loadWallet(spendingKey).then(setWallet).catch(() => {
            localStorage.removeItem(STORAGE_KEY);
          });
        }
      } catch {
      }
    }
  }, [isInitialized, wallet, client]);
  (0, import_react.useEffect)(() => {
    if (wallet && isInitialized && !isInitializing && !isProverReady) {
      console.log("[CloakCraft] Initializing prover...");
      client.initializeProver(["transfer/1x2", "transfer/1x3"]).then(() => {
        console.log("[CloakCraft] Prover initialized successfully");
        setIsProverReady(true);
      }).catch((err) => {
        console.error("[CloakCraft] Prover init failed:", err);
        setError(`Prover initialization failed: ${err.message}`);
      });
    }
  }, [wallet, isInitialized, isInitializing, isProverReady, client]);
  const connect = (0, import_react.useCallback)(
    async (spendingKey) => {
      try {
        setError(null);
        const newWallet = await client.loadWallet(spendingKey);
        setWallet(newWallet);
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(spendingKey)));
        } catch {
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to connect wallet";
        setError(message);
        throw err;
      }
    },
    [client]
  );
  const disconnect = (0, import_react.useCallback)(() => {
    setWallet(null);
    setNotes([]);
    setSyncStatus(null);
    setError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  }, []);
  const sync = (0, import_react.useCallback)(async (tokenMint, clearCache = false) => {
    if (!wallet) return;
    setIsSyncing(true);
    setError(null);
    try {
      if (clearCache) {
        client.clearScanCache();
      }
      const scannedNotes = await client.scanNotes(tokenMint);
      setNotes(scannedNotes);
      const status = await client.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setError(message);
    } finally {
      setIsSyncing(false);
    }
  }, [client, wallet]);
  const createWallet = (0, import_react.useCallback)(() => {
    return client.createWallet();
  }, [client]);
  const setProgram = (0, import_react.useCallback)((program) => {
    client.setProgram(program);
  }, [client]);
  const initializeProver = (0, import_react.useCallback)(async (circuits) => {
    setIsInitializing(true);
    try {
      await client.initializeProver(circuits);
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to initialize prover";
      setError(message);
      throw err;
    } finally {
      setIsInitializing(false);
    }
  }, [client]);
  const value = {
    client,
    wallet,
    isConnected: wallet !== null,
    isInitialized,
    isInitializing,
    isProverReady,
    isSyncing,
    syncStatus,
    notes,
    error,
    connect,
    disconnect,
    sync,
    createWallet,
    setProgram,
    initializeProver
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
function useWallet() {
  const { wallet, isConnected, isInitialized, isInitializing, connect, disconnect, createWallet, error } = useCloakCraft();
  const [isConnecting, setIsConnecting] = (0, import_react2.useState)(false);
  const [connectError, setConnectError] = (0, import_react2.useState)(null);
  const importFromSeed = (0, import_react2.useCallback)(
    async (seedPhrase) => {
      setIsConnecting(true);
      setConnectError(null);
      try {
        const { deriveWalletFromSeed } = await import("@cloakcraft/sdk");
        const imported = await deriveWalletFromSeed(seedPhrase);
        await connect(imported.exportSpendingKey());
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to import wallet";
        setConnectError(message);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [connect]
  );
  const importFromKey = (0, import_react2.useCallback)(
    async (spendingKey) => {
      setIsConnecting(true);
      setConnectError(null);
      try {
        await connect(spendingKey);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to connect wallet";
        setConnectError(message);
        throw err;
      } finally {
        setIsConnecting(false);
      }
    },
    [connect]
  );
  const createAndConnect = (0, import_react2.useCallback)(async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const newWallet = createWallet();
      await connect(newWallet.exportSpendingKey());
      return newWallet;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create wallet";
      setConnectError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [createWallet, connect]);
  const deriveFromSignature = (0, import_react2.useCallback)(async (signature) => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const { deriveWalletFromSignature } = await import("@cloakcraft/sdk");
      const derivedWallet = deriveWalletFromSignature(signature);
      await connect(derivedWallet.exportSpendingKey());
      return derivedWallet;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to derive wallet";
      setConnectError(message);
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, [connect]);
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
    isConnecting,
    isInitialized,
    isInitializing,
    error: connectError || error,
    // Actions
    connect: importFromKey,
    disconnect,
    createWallet,
    createAndConnect,
    deriveFromSignature,
    importFromSeed,
    importFromKey,
    exportSpendingKey
  };
}
var WALLET_DERIVATION_MESSAGE = "CloakCraft Stealth Wallet v1";

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
function useAllBalances() {
  const { client, wallet, notes } = useCloakCraft();
  const [balances, setBalances] = (0, import_react3.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react3.useState)(false);
  const refresh = (0, import_react3.useCallback)(async () => {
    if (!client || !wallet) return;
    setIsLoading(true);
    try {
      const byMint = /* @__PURE__ */ new Map();
      for (const note of notes) {
        const mintStr = note.tokenMint.toBase58();
        const existing = byMint.get(mintStr);
        if (existing) {
          existing.amount += note.amount;
          existing.count += 1;
        } else {
          byMint.set(mintStr, {
            mint: note.tokenMint,
            amount: note.amount,
            count: 1
          });
        }
      }
      setBalances(
        Array.from(byMint.values()).map((b) => ({
          mint: b.mint,
          amount: b.amount,
          noteCount: b.count
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet, notes]);
  (0, import_react3.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    balances,
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
function useNoteSelection(tokenMint) {
  const { notes } = useNotes(tokenMint);
  const [selectedNotes, setSelectedNotes] = (0, import_react4.useState)([]);
  const toggleNote = (0, import_react4.useCallback)((note) => {
    setSelectedNotes((prev) => {
      const index = prev.findIndex(
        (n) => Buffer.from(n.commitment).toString("hex") === Buffer.from(note.commitment).toString("hex")
      );
      if (index >= 0) {
        return [...prev.slice(0, index), ...prev.slice(index + 1)];
      }
      return [...prev, note];
    });
  }, []);
  const selectAll = (0, import_react4.useCallback)(() => {
    setSelectedNotes(notes);
  }, [notes]);
  const clearSelection = (0, import_react4.useCallback)(() => {
    setSelectedNotes([]);
  }, []);
  const selectedAmount = (0, import_react4.useMemo)(() => {
    return selectedNotes.reduce((sum, note) => sum + note.amount, 0n);
  }, [selectedNotes]);
  return {
    selectedNotes,
    selectedAmount,
    toggleNote,
    selectAll,
    clearSelection
  };
}

// src/useShield.ts
var import_react5 = require("react");
var import_sdk2 = require("@cloakcraft/sdk");
function useShield() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react5.useState)({
    isShielding: false,
    error: null,
    result: null
  });
  const shield = (0, import_react5.useCallback)(
    async (options, payer) => {
      if (!client || !wallet) {
        setState({ isShielding: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isShielding: false, error: "Program not set. Call setProgram() first.", result: null });
        return null;
      }
      setState({ isShielding: true, error: null, result: null });
      try {
        const recipientPubkey = options.recipient ?? wallet.publicKey;
        const { stealthAddress } = (0, import_sdk2.generateStealthAddress)(recipientPubkey);
        const result = await client.shieldWithWallet(
          {
            pool: options.tokenMint,
            // This is the token mint, not the pool PDA
            amount: options.amount,
            recipient: stealthAddress,
            // Contains both stealthPubkey and ephemeralPubkey
            userTokenAccount: options.userTokenAccount
          },
          options.walletPublicKey
        );
        await sync(options.tokenMint, true);
        setState({ isShielding: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Shield failed";
        setState({ isShielding: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
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
    async (inputs, outputs, unshield, walletPublicKey) => {
      if (!client || !wallet) {
        setState({ isTransferring: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isTransferring: false, error: "Program not set. Call setProgram() first.", result: null });
        return null;
      }
      setState({ isTransferring: true, error: null, result: null });
      let freshNotes;
      try {
        const tokenMint = inputs[0]?.tokenMint;
        client.clearScanCache();
        freshNotes = await client.scanNotes(tokenMint);
      } catch (err) {
        setState({
          isTransferring: false,
          error: `Failed to scan notes: ${err instanceof Error ? err.message : "Unknown error"}`,
          result: null
        });
        return null;
      }
      const matchedInputs = [];
      for (const input of inputs) {
        const fresh = freshNotes.find(
          (n) => n.commitment && input.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(input.commitment).toString("hex")
        );
        if (fresh) {
          matchedInputs.push(fresh);
        } else {
          setState({
            isTransferring: false,
            error: "Selected note not found in pool. It may have been spent or not yet synced.",
            result: null
          });
          return null;
        }
      }
      try {
        const result = await client.prepareAndTransfer(
          { inputs: matchedInputs, outputs, unshield },
          // Use fresh notes
          void 0
          // relayer - wallet adapter will be used via provider
        );
        if (matchedInputs.length > 0 && matchedInputs[0].tokenMint) {
          await sync(matchedInputs[0].tokenMint, true);
        }
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
function useNoteSelector(tokenMint) {
  const { notes } = useCloakCraft();
  const [selected, setSelected] = (0, import_react6.useState)([]);
  const availableNotes = notes.filter(
    (note) => note.tokenMint && note.tokenMint.equals(tokenMint)
  );
  const selectNotesForAmount = (0, import_react6.useCallback)(
    (targetAmount) => {
      let total = 0n;
      const selectedNotes = [];
      const sorted = [...availableNotes].sort(
        (a, b) => a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : 0
      );
      for (const note of sorted) {
        if (total >= targetAmount) break;
        selectedNotes.push(note);
        total += note.amount;
      }
      if (total < targetAmount) {
        throw new Error(`Insufficient balance. Have ${total}, need ${targetAmount}`);
      }
      setSelected(selectedNotes);
      return selectedNotes;
    },
    [availableNotes]
  );
  const clearSelection = (0, import_react6.useCallback)(() => {
    setSelected([]);
  }, []);
  const totalAvailable = availableNotes.reduce((sum, n) => sum + n.amount, 0n);
  const totalSelected = selected.reduce((sum, n) => sum + n.amount, 0n);
  return {
    availableNotes,
    selected,
    totalAvailable,
    totalSelected,
    selectNotesForAmount,
    clearSelection
  };
}

// src/useUnshield.ts
var import_react7 = require("react");
var import_spl_token = require("@solana/spl-token");
function useUnshield() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react7.useState)({
    isUnshielding: false,
    error: null,
    result: null
  });
  const unshield = (0, import_react7.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isUnshielding: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isUnshielding: false, error: "Program not set. Call setProgram() first.", result: null });
        return null;
      }
      const { inputs, amount, recipient, isWalletAddress } = options;
      setState({ isUnshielding: true, error: null, result: null });
      let recipientTokenAccount = recipient;
      if (isWalletAddress && inputs[0]?.tokenMint) {
        try {
          recipientTokenAccount = (0, import_spl_token.getAssociatedTokenAddressSync)(
            inputs[0].tokenMint,
            recipient
          );
        } catch (err) {
          setState({
            isUnshielding: false,
            error: `Failed to derive token account: ${err instanceof Error ? err.message : "Unknown error"}`,
            result: null
          });
          return null;
        }
      }
      let freshNotes;
      try {
        const tokenMint = inputs[0]?.tokenMint;
        client.clearScanCache();
        freshNotes = await client.scanNotes(tokenMint);
      } catch (err) {
        setState({
          isUnshielding: false,
          error: `Failed to scan notes: ${err instanceof Error ? err.message : "Unknown error"}`,
          result: null
        });
        return null;
      }
      const matchedInputs = [];
      for (const input of inputs) {
        const fresh = freshNotes.find(
          (n) => n.commitment && input.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(input.commitment).toString("hex")
        );
        if (fresh) {
          matchedInputs.push(fresh);
        } else {
          setState({
            isUnshielding: false,
            error: "Selected note not found in pool. It may have been spent or not yet synced.",
            result: null
          });
          return null;
        }
      }
      const totalInput = matchedInputs.reduce((sum, n) => sum + n.amount, 0n);
      if (totalInput < amount) {
        setState({
          isUnshielding: false,
          error: `Insufficient balance. Have ${totalInput}, need ${amount}`,
          result: null
        });
        return null;
      }
      try {
        const change = totalInput - amount;
        const { generateStealthAddress: generateStealthAddress2 } = await import("@cloakcraft/sdk");
        const { stealthAddress } = generateStealthAddress2(wallet.publicKey);
        const outputs = [{
          recipient: stealthAddress,
          amount: change > 0n ? change : 0n
        }];
        const result = await client.prepareAndTransfer(
          {
            inputs: matchedInputs,
            // Use fresh notes with stealthEphemeralPubkey
            outputs,
            unshield: { amount, recipient: recipientTokenAccount }
          },
          void 0
          // relayer - wallet adapter will be used via provider
        );
        if (matchedInputs.length > 0 && matchedInputs[0].tokenMint) {
          await sync(matchedInputs[0].tokenMint, true);
        }
        setState({ isUnshielding: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Unshield failed";
        setState({ isUnshielding: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react7.useCallback)(() => {
    setState({ isUnshielding: false, error: null, result: null });
  }, []);
  return {
    ...state,
    unshield,
    reset
  };
}

// src/useScanner.ts
var import_react8 = require("react");
function usePrivateBalance(tokenMint) {
  const { client, wallet } = useCloakCraft();
  const [balance, setBalance] = (0, import_react8.useState)(0n);
  const [noteCount, setNoteCount] = (0, import_react8.useState)(0);
  const [isLoading, setIsLoading] = (0, import_react8.useState)(false);
  const [error, setError] = (0, import_react8.useState)(null);
  const refresh = (0, import_react8.useCallback)(async () => {
    if (!client || !wallet) {
      setError("Stealth wallet not connected");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const privateBalance = await client.getPrivateBalance(tokenMint);
      setBalance(privateBalance);
      const notes = await client.scanNotes(tokenMint);
      setNoteCount(notes.length);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch balance";
      if (message.includes("Light Protocol not configured")) {
        setError("Note scanning unavailable - Helius API not configured");
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet, tokenMint]);
  (0, import_react8.useEffect)(() => {
    if (client && wallet) {
      refresh();
    }
  }, [client, wallet, tokenMint]);
  return {
    balance,
    noteCount,
    isLoading,
    error,
    refresh
  };
}
function useScanner(tokenMint, autoRefreshMs) {
  const { client, wallet, notes, sync } = useCloakCraft();
  const [state, setState] = (0, import_react8.useState)({
    isScanning: false,
    lastScanned: null,
    error: null
  });
  const intervalRef = (0, import_react8.useRef)(null);
  const scan = (0, import_react8.useCallback)(async () => {
    if (!client || !wallet) {
      setState((s) => ({ ...s, error: "Wallet not connected" }));
      return;
    }
    setState((s) => ({ ...s, isScanning: true, error: null }));
    try {
      await sync(tokenMint);
      setState({
        isScanning: false,
        lastScanned: /* @__PURE__ */ new Date(),
        error: null
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed";
      setState((s) => ({ ...s, isScanning: false, error: message }));
    }
  }, [client, wallet, sync, tokenMint]);
  (0, import_react8.useEffect)(() => {
    if (autoRefreshMs && autoRefreshMs > 0 && client && wallet) {
      scan();
      intervalRef.current = setInterval(scan, autoRefreshMs);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefreshMs, client, wallet, scan]);
  const filteredNotes = tokenMint ? notes.filter((n) => n.tokenMint && n.tokenMint.equals(tokenMint)) : notes;
  const totalAmount = filteredNotes.reduce((sum, n) => sum + n.amount, 0n);
  return {
    ...state,
    notes: filteredNotes,
    totalAmount,
    noteCount: filteredNotes.length,
    scan
  };
}
function useNullifierStatus(note, pool) {
  const { client } = useCloakCraft();
  const [isSpent, setIsSpent] = (0, import_react8.useState)(null);
  const [isChecking, setIsChecking] = (0, import_react8.useState)(false);
  const [error, setError] = (0, import_react8.useState)(null);
  const check = (0, import_react8.useCallback)(async () => {
    if (!client || !note || !pool) {
      return;
    }
    setIsChecking(true);
    setError(null);
    try {
      const { deriveNullifierKey, deriveSpendingNullifier, computeCommitment } = await import("@cloakcraft/sdk");
      const wallet = client.getWallet();
      if (!wallet) {
        throw new Error("Wallet not connected");
      }
      const nullifierKey = deriveNullifierKey(wallet.keypair.spending.sk);
      const commitment = computeCommitment(note);
      const nullifier = deriveSpendingNullifier(nullifierKey, commitment, note.leafIndex);
      const spent = await client.isNullifierSpent(nullifier, pool);
      setIsSpent(spent);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to check nullifier";
      setError(message);
    } finally {
      setIsChecking(false);
    }
  }, [client, note, pool]);
  (0, import_react8.useEffect)(() => {
    if (note && pool) {
      check();
    }
  }, [note, pool]);
  return {
    isSpent,
    isChecking,
    error,
    check
  };
}

// src/usePool.ts
var import_react9 = require("react");
var import_web32 = require("@solana/web3.js");
function usePool(tokenMint) {
  const { client } = useCloakCraft();
  const [pool, setPool] = (0, import_react9.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react9.useState)(false);
  const [error, setError] = (0, import_react9.useState)(null);
  const refresh = (0, import_react9.useCallback)(async () => {
    if (!client || !tokenMint) {
      setPool(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const poolState = await client.getPool(tokenMint);
      setPool(poolState);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch pool";
      setError(message);
      setPool(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, tokenMint]);
  (0, import_react9.useEffect)(() => {
    refresh();
  }, [refresh]);
  const poolPda = tokenMint && client ? import_web32.PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), tokenMint.toBuffer()],
    client.programId
  )[0] : null;
  return {
    pool,
    poolPda,
    isLoading,
    error,
    refresh,
    exists: pool !== null
  };
}
function useInitializePool() {
  const { client } = useCloakCraft();
  const [state, setState] = (0, import_react9.useState)({
    isInitializing: false,
    error: null,
    result: null
  });
  const initializePool = (0, import_react9.useCallback)(
    async (tokenMint, payer) => {
      if (!client) {
        setState({ isInitializing: false, error: "Client not initialized", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isInitializing: false, error: "Program not set. Call setProgram() first.", result: null });
        return null;
      }
      setState({ isInitializing: true, error: null, result: null });
      try {
        const result = await client.initializePool(tokenMint, payer);
        setState({ isInitializing: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed to initialize pool";
        setState({ isInitializing: false, error, result: null });
        return null;
      }
    },
    [client]
  );
  const initializePoolWithWallet = (0, import_react9.useCallback)(
    async (tokenMint, walletPublicKey) => {
      if (!client) {
        setState({ isInitializing: false, error: "Client not initialized", result: null });
        return null;
      }
      const program = client.getProgram();
      if (!program) {
        setState({ isInitializing: false, error: "Program not set. Call setProgram() first.", result: null });
        return null;
      }
      setState({ isInitializing: true, error: null, result: null });
      try {
        const { initializePool: initPoolFn } = await import("@cloakcraft/sdk");
        const result = await initPoolFn(program, tokenMint, walletPublicKey, walletPublicKey);
        setState({ isInitializing: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed to initialize pool";
        setState({ isInitializing: false, error, result: null });
        return null;
      }
    },
    [client]
  );
  const reset = (0, import_react9.useCallback)(() => {
    setState({ isInitializing: false, error: null, result: null });
  }, []);
  return {
    ...state,
    initializePool,
    initializePoolWithWallet,
    reset
  };
}
function usePoolList() {
  const { client } = useCloakCraft();
  const [pools, setPools] = (0, import_react9.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react9.useState)(false);
  const [error, setError] = (0, import_react9.useState)(null);
  const addPool = (0, import_react9.useCallback)((tokenMint) => {
    if (!client) return;
    const [poolPda] = import_web32.PublicKey.findProgramAddressSync(
      [Buffer.from("pool"), tokenMint.toBuffer()],
      client.programId
    );
    setPools((prev) => {
      if (prev.some((p) => p.tokenMint.equals(tokenMint))) {
        return prev;
      }
      return [...prev, { tokenMint, poolPda }];
    });
  }, [client]);
  const removePool = (0, import_react9.useCallback)((tokenMint) => {
    setPools((prev) => prev.filter((p) => !p.tokenMint.equals(tokenMint)));
  }, []);
  return {
    pools,
    isLoading,
    error,
    addPool,
    removePool
  };
}

// src/usePublicBalance.ts
var import_react10 = require("react");
var import_spl_token2 = require("@solana/spl-token");
function usePublicBalance(tokenMint, owner) {
  const { client } = useCloakCraft();
  const [state, setState] = (0, import_react10.useState)({
    balance: 0n,
    tokenAccount: null,
    isLoading: false,
    error: null
  });
  const refresh = (0, import_react10.useCallback)(async () => {
    if (!client || !tokenMint || !owner) {
      setState((s) => ({ ...s, balance: 0n, tokenAccount: null }));
      return;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const tokenAccount = (0, import_spl_token2.getAssociatedTokenAddressSync)(tokenMint, owner);
      const accountInfo = await client.connection.getAccountInfo(tokenAccount);
      if (!accountInfo) {
        setState({
          balance: 0n,
          tokenAccount: null,
          isLoading: false,
          error: null
        });
        return;
      }
      const amount = accountInfo.data.readBigUInt64LE(64);
      setState({
        balance: amount,
        tokenAccount,
        isLoading: false,
        error: null
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch balance";
      setState((s) => ({
        ...s,
        isLoading: false,
        error: message
      }));
    }
  }, [client, tokenMint, owner]);
  (0, import_react10.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    ...state,
    refresh
  };
}
function useSolBalance(owner) {
  const { client } = useCloakCraft();
  const [balance, setBalance] = (0, import_react10.useState)(0n);
  const [isLoading, setIsLoading] = (0, import_react10.useState)(false);
  const [error, setError] = (0, import_react10.useState)(null);
  const refresh = (0, import_react10.useCallback)(async () => {
    if (!client || !owner) {
      setBalance(0n);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const lamports = await client.connection.getBalance(owner);
      setBalance(BigInt(lamports));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch SOL balance";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [client, owner]);
  (0, import_react10.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    balance,
    isLoading,
    error,
    refresh
  };
}
function useTokenBalances(tokenMints, owner) {
  const { client } = useCloakCraft();
  const [balances, setBalances] = (0, import_react10.useState)(/* @__PURE__ */ new Map());
  const [isLoading, setIsLoading] = (0, import_react10.useState)(false);
  const [error, setError] = (0, import_react10.useState)(null);
  const mintsKey = (0, import_react10.useMemo)(
    () => tokenMints.map((m) => m.toBase58()).join(","),
    [tokenMints]
  );
  const refresh = (0, import_react10.useCallback)(async () => {
    if (!client || !owner || tokenMints.length === 0) {
      setBalances(/* @__PURE__ */ new Map());
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const newBalances = /* @__PURE__ */ new Map();
      const tokenAccounts = tokenMints.map((mint) => (0, import_spl_token2.getAssociatedTokenAddressSync)(mint, owner));
      const accountInfos = await client.connection.getMultipleAccountsInfo(tokenAccounts);
      for (let i = 0; i < tokenMints.length; i++) {
        const mint = tokenMints[i];
        const accountInfo = accountInfos[i];
        if (accountInfo) {
          const amount = accountInfo.data.readBigUInt64LE(64);
          newBalances.set(mint.toBase58(), amount);
        } else {
          newBalances.set(mint.toBase58(), 0n);
        }
      }
      setBalances(newBalances);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to fetch balances";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [client, owner, mintsKey]);
  (0, import_react10.useEffect)(() => {
    refresh();
  }, [refresh]);
  const getBalance = (0, import_react10.useCallback)(
    (tokenMint) => {
      return balances.get(tokenMint.toBase58()) ?? 0n;
    },
    [balances]
  );
  return {
    balances,
    getBalance,
    isLoading,
    error,
    refresh
  };
}

// src/useOrders.ts
var import_react11 = require("react");
function useOrders() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = (0, import_react11.useState)({
    orders: [],
    isLoading: false,
    error: null
  });
  const fetchOrders = (0, import_react11.useCallback)(async () => {
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
  (0, import_react11.useEffect)(() => {
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
  WALLET_DERIVATION_MESSAGE,
  useAllBalances,
  useBalance,
  useCloakCraft,
  useInitializePool,
  useNoteSelection,
  useNoteSelector,
  useNotes,
  useNullifierStatus,
  useOrders,
  usePool,
  usePoolList,
  usePrivateBalance,
  usePublicBalance,
  useScanner,
  useShield,
  useSolBalance,
  useTokenBalances,
  useTransfer,
  useUnshield,
  useWallet
});
