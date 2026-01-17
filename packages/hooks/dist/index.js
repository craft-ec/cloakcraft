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
  TransactionStatus: () => import_sdk5.TransactionStatus,
  TransactionType: () => import_sdk5.TransactionType,
  WALLET_DERIVATION_MESSAGE: () => WALLET_DERIVATION_MESSAGE,
  formatApy: () => import_sdk9.formatApy,
  formatPrice: () => import_sdk7.formatPrice,
  formatPriceChange: () => import_sdk7.formatPriceChange,
  formatShare: () => import_sdk9.formatShare,
  formatTvl: () => import_sdk9.formatTvl,
  useAddLiquidity: () => useAddLiquidity,
  useAllBalances: () => useAllBalances,
  useAmmPools: () => useAmmPools,
  useBalance: () => useBalance,
  useCloakCraft: () => useCloakCraft,
  useImpermanentLoss: () => useImpermanentLoss,
  useInitializeAmmPool: () => useInitializeAmmPool,
  useInitializePool: () => useInitializePool,
  useNoteSelection: () => useNoteSelection,
  useNoteSelector: () => useNoteSelector,
  useNotes: () => useNotes,
  useNullifierStatus: () => useNullifierStatus,
  useOrders: () => useOrders,
  usePool: () => usePool,
  usePoolAnalytics: () => usePoolAnalytics,
  usePoolList: () => usePoolList,
  usePoolStats: () => usePoolStats,
  usePortfolioValue: () => usePortfolioValue,
  usePrivateBalance: () => usePrivateBalance,
  usePublicBalance: () => usePublicBalance,
  useRecentTransactions: () => useRecentTransactions,
  useRemoveLiquidity: () => useRemoveLiquidity,
  useScanner: () => useScanner,
  useShield: () => useShield,
  useSolBalance: () => useSolBalance,
  useSolPrice: () => useSolPrice,
  useSwap: () => useSwap,
  useSwapQuote: () => useSwapQuote,
  useTokenBalances: () => useTokenBalances,
  useTokenPrice: () => useTokenPrice,
  useTokenPrices: () => useTokenPrices,
  useTransactionHistory: () => useTransactionHistory,
  useTransfer: () => useTransfer,
  useUnshield: () => useUnshield,
  useUserPosition: () => useUserPosition,
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
  const [isProgramReady, setIsProgramReady] = (0, import_react.useState)(false);
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
    if (wallet && isProgramReady && !isSyncing && notes.length === 0) {
      console.log("[CloakCraft] Auto-syncing notes on wallet connect...");
      sync().catch((err) => {
        console.error("[CloakCraft] Auto-sync failed:", err);
      });
    }
  }, [wallet, isProgramReady]);
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
      if (tokenMint) {
        setNotes((prevNotes) => {
          const otherNotes = prevNotes.filter(
            (n) => n.tokenMint && !n.tokenMint.equals(tokenMint)
          );
          return [...otherNotes, ...scannedNotes];
        });
      } else {
        setNotes(scannedNotes);
      }
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
    setIsProgramReady(true);
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
    isProgramReady,
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
        console.log("[useShield] Starting shield...", {
          tokenMint: options.tokenMint.toBase58(),
          amount: options.amount.toString(),
          walletPublicKey: options.walletPublicKey?.toBase58()
        });
        const recipientPubkey = options.recipient ?? wallet.publicKey;
        console.log("[useShield] Generating stealth address for:", recipientPubkey);
        const { stealthAddress } = (0, import_sdk2.generateStealthAddress)(recipientPubkey);
        console.log("[useShield] Stealth address generated");
        console.log("[useShield] Calling client.shieldWithWallet...");
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
        console.log("[useShield] shieldWithWallet result:", result);
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        console.log("[useShield] Syncing notes...");
        await sync(options.tokenMint, true);
        setState({ isShielding: false, error: null, result });
        return result;
      } catch (err) {
        console.error("[useShield] ERROR:", err);
        const error = err instanceof Error ? err.message : "Shield failed";
        setState({ isShielding: false, error, result: null });
        throw err;
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
        await new Promise((resolve) => setTimeout(resolve, 2e3));
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
          console.log("[Unshield] Deriving ATA from wallet:", recipient.toBase58());
          console.log("[Unshield] Token mint:", inputs[0].tokenMint.toBase58());
          recipientTokenAccount = (0, import_spl_token.getAssociatedTokenAddressSync)(
            inputs[0].tokenMint,
            recipient,
            true
            // allowOwnerOffCurve - standard practice for flexibility
          );
          console.log("[Unshield] Derived ATA:", recipientTokenAccount.toBase58());
        } catch (err) {
          console.error("[Unshield] Failed to derive ATA:", err);
          setState({
            isUnshielding: false,
            error: `Failed to derive token account: ${err instanceof Error ? err.message : "Unknown error"}`,
            result: null
          });
          return null;
        }
      } else {
        console.log("[Unshield] Skipping ATA derivation - isWalletAddress:", isWalletAddress, "has tokenMint:", !!inputs[0]?.tokenMint);
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
        console.log("[Unshield] Total input:", totalInput.toString());
        console.log("[Unshield] Amount to unshield:", amount.toString());
        console.log("[Unshield] Change:", change.toString());
        const { generateStealthAddress: generateStealthAddress3 } = await import("@cloakcraft/sdk");
        const outputs = [];
        if (change > 0n) {
          const { stealthAddress } = generateStealthAddress3(wallet.publicKey);
          outputs.push({
            recipient: stealthAddress,
            amount: change
          });
        } else {
          const dummyStealthAddress = {
            stealthPubkey: {
              x: new Uint8Array(32),
              // zeros
              y: new Uint8Array(32)
              // zeros
            },
            ephemeralPubkey: {
              x: new Uint8Array(32),
              // zeros
              y: new Uint8Array(32)
              // zeros
            }
          };
          outputs.push({
            recipient: dummyStealthAddress,
            amount: 0n
          });
        }
        console.log("[Unshield] Matched inputs:", matchedInputs.length);
        console.log("[Unshield] Outputs:", outputs.length);
        console.log("[Unshield] Recipient token account:", recipientTokenAccount.toBase58());
        console.log("[Unshield] Calling prepareAndTransfer...");
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
        console.log("[Unshield] prepareAndTransfer result:", result);
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        if (matchedInputs.length > 0 && matchedInputs[0].tokenMint) {
          await sync(matchedInputs[0].tokenMint, true);
        }
        setState({ isUnshielding: false, error: null, result });
        return result;
      } catch (err) {
        console.error("[Unshield] Error:", err);
        const error = err instanceof Error ? err.message : "Unshield failed";
        console.error("[Unshield] Error message:", error);
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

// src/useSwap.ts
var import_react12 = require("react");
var import_sdk3 = require("@cloakcraft/sdk");
var import_web33 = require("@solana/web3.js");
function useSwap() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react12.useState)({
    isSwapping: false,
    error: null,
    result: null
  });
  const swap = (0, import_react12.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isSwapping: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isSwapping: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isSwapping: true, error: null, result: null });
      try {
        const { input, pool, swapDirection, swapAmount, slippageBps = 50 } = options;
        const reserveIn = swapDirection === "aToB" ? pool.reserveA : pool.reserveB;
        const reserveOut = swapDirection === "aToB" ? pool.reserveB : pool.reserveA;
        const { outputAmount } = (0, import_sdk3.calculateSwapOutput)(
          swapAmount,
          reserveIn,
          reserveOut,
          pool.feeBps
        );
        const minOutput = (0, import_sdk3.calculateMinOutput)(outputAmount, slippageBps);
        const outputTokenMint = swapDirection === "aToB" ? pool.tokenBMint : pool.tokenAMint;
        const { stealthAddress: outputRecipient } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: changeRecipient } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
        client.clearScanCache();
        const freshNotes = await client.scanNotes(input.tokenMint);
        const freshInput = freshNotes.find(
          (n) => n.commitment && input.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(input.commitment).toString("hex")
        );
        if (!freshInput) {
          throw new Error("Selected note not found. It may have been spent.");
        }
        const merkleRoot = freshInput.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);
        const result = await client.swap({
          input: freshInput,
          poolId: pool.address,
          swapDirection,
          swapAmount,
          outputAmount,
          minOutput,
          outputTokenMint,
          outputRecipient,
          changeRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices
        });
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        await sync(input.tokenMint, true);
        await sync(outputTokenMint, true);
        setState({ isSwapping: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Swap failed";
        setState({ isSwapping: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react12.useCallback)(() => {
    setState({ isSwapping: false, error: null, result: null });
  }, []);
  return {
    ...state,
    swap,
    reset
  };
}
function useAmmPools() {
  const { client } = useCloakCraft();
  const [pools, setPools] = (0, import_react12.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react12.useState)(false);
  const [error, setError] = (0, import_react12.useState)(null);
  const refresh = (0, import_react12.useCallback)(async () => {
    if (!client?.getProgram()) {
      setPools([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const allPools = await client.getAllAmmPools();
      setPools(allPools);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch pools");
      setPools([]);
    } finally {
      setIsLoading(false);
    }
  }, [client]);
  (0, import_react12.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    pools,
    isLoading,
    error,
    refresh
  };
}
function useSwapQuote(pool, swapDirection, inputAmount) {
  const [quote, setQuote] = (0, import_react12.useState)(null);
  (0, import_react12.useEffect)(() => {
    if (!pool || inputAmount <= 0n) {
      setQuote(null);
      return;
    }
    try {
      const reserveIn = swapDirection === "aToB" ? pool.reserveA : pool.reserveB;
      const reserveOut = swapDirection === "aToB" ? pool.reserveB : pool.reserveA;
      const { outputAmount, priceImpact } = (0, import_sdk3.calculateSwapOutput)(
        inputAmount,
        reserveIn,
        reserveOut,
        pool.feeBps
      );
      const minOutput = (0, import_sdk3.calculateMinOutput)(outputAmount, 50);
      setQuote({ outputAmount, minOutput, priceImpact });
    } catch {
      setQuote(null);
    }
  }, [pool, swapDirection, inputAmount]);
  return quote;
}
function useInitializeAmmPool() {
  const { client } = useCloakCraft();
  const [state, setState] = (0, import_react12.useState)({
    isInitializing: false,
    error: null,
    result: null
  });
  const initializePool = (0, import_react12.useCallback)(
    async (tokenAMint, tokenBMint, feeBps = 30) => {
      if (!client?.getProgram()) {
        setState({ isInitializing: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isInitializing: true, error: null, result: null });
      try {
        const lpMintKeypair = import_web33.Keypair.generate();
        const signature = await client.initializeAmmPool(
          tokenAMint,
          tokenBMint,
          lpMintKeypair,
          feeBps
        );
        setState({ isInitializing: false, error: null, result: signature });
        return signature;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Failed to initialize pool";
        setState({ isInitializing: false, error, result: null });
        return null;
      }
    },
    [client]
  );
  const reset = (0, import_react12.useCallback)(() => {
    setState({ isInitializing: false, error: null, result: null });
  }, []);
  return {
    ...state,
    initializePool,
    reset
  };
}
function useAddLiquidity() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react12.useState)({
    isAdding: false,
    error: null,
    result: null
  });
  const addLiquidity = (0, import_react12.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isAdding: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isAdding: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isAdding: true, error: null, result: null });
      try {
        const { pool, inputA, inputB, amountA, amountB, slippageBps = 50 } = options;
        const { depositA, depositB, lpAmount } = (0, import_sdk3.calculateAddLiquidityAmounts)(
          amountA,
          amountB,
          pool.reserveA,
          pool.reserveB,
          pool.lpSupply
        );
        const minLpAmount = lpAmount * BigInt(1e4 - slippageBps) / 10000n;
        const { stealthAddress: lpRecipient } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: changeARecipient } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: changeBRecipient } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
        client.clearScanCache();
        const freshNotesA = await client.scanNotes(inputA.tokenMint);
        const freshNotesB = await client.scanNotes(inputB.tokenMint);
        const freshInputA = freshNotesA.find(
          (n) => n.commitment && inputA.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(inputA.commitment).toString("hex")
        );
        const freshInputB = freshNotesB.find(
          (n) => n.commitment && inputB.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(inputB.commitment).toString("hex")
        );
        if (!freshInputA || !freshInputB) {
          throw new Error("Selected notes not found. They may have been spent.");
        }
        const result = await client.addLiquidity({
          inputA: freshInputA,
          inputB: freshInputB,
          poolId: pool.address,
          lpMint: pool.lpMint,
          depositA,
          depositB,
          lpAmount,
          minLpAmount,
          lpRecipient,
          changeARecipient,
          changeBRecipient
        });
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        await sync(inputA.tokenMint, true);
        await sync(inputB.tokenMint, true);
        await sync(pool.lpMint, true);
        setState({ isAdding: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Add liquidity failed";
        setState({ isAdding: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react12.useCallback)(() => {
    setState({ isAdding: false, error: null, result: null });
  }, []);
  return {
    ...state,
    addLiquidity,
    reset
  };
}
function useRemoveLiquidity() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react12.useState)({
    isRemoving: false,
    error: null,
    result: null
  });
  const removeLiquidity = (0, import_react12.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isRemoving: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isRemoving: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isRemoving: true, error: null, result: null });
      try {
        const { pool, lpInput, lpAmount, slippageBps = 50 } = options;
        const { outputA, outputB } = (0, import_sdk3.calculateRemoveLiquidityOutput)(
          lpAmount,
          pool.lpSupply,
          pool.reserveA,
          pool.reserveB
        );
        const { stealthAddress: outputARecipient } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: outputBRecipient } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
        client.clearScanCache();
        const freshNotes = await client.scanNotes(pool.lpMint);
        const freshLpInput = freshNotes.find(
          (n) => n.commitment && lpInput.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(lpInput.commitment).toString("hex")
        );
        if (!freshLpInput) {
          throw new Error("LP note not found. It may have been spent.");
        }
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);
        const oldPoolStateHash = (0, import_sdk3.computeAmmStateHash)(
          pool.reserveA,
          pool.reserveB,
          pool.lpSupply,
          pool.poolId
        );
        const newReserveA = pool.reserveA - outputA;
        const newReserveB = pool.reserveB - outputB;
        const newLpSupply = pool.lpSupply - lpAmount;
        const newPoolStateHash = (0, import_sdk3.computeAmmStateHash)(
          newReserveA,
          newReserveB,
          newLpSupply,
          pool.poolId
        );
        const result = await client.removeLiquidity({
          lpInput: freshLpInput,
          poolId: pool.address,
          tokenAMint: pool.tokenAMint,
          tokenBMint: pool.tokenBMint,
          lpAmount,
          outputAAmount: outputA,
          outputBAmount: outputB,
          outputARecipient,
          outputBRecipient,
          oldPoolStateHash,
          newPoolStateHash,
          merklePath: dummyPath,
          merklePathIndices: dummyIndices
        });
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        await sync(pool.lpMint, true);
        await sync(pool.tokenAMint, true);
        await sync(pool.tokenBMint, true);
        setState({ isRemoving: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Remove liquidity failed";
        setState({ isRemoving: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react12.useCallback)(() => {
    setState({ isRemoving: false, error: null, result: null });
  }, []);
  return {
    ...state,
    removeLiquidity,
    reset
  };
}

// src/useTransactionHistory.ts
var import_react13 = require("react");
var import_sdk4 = require("@cloakcraft/sdk");
var import_sdk5 = require("@cloakcraft/sdk");
function useTransactionHistory(filter) {
  const { wallet } = useCloakCraft();
  const [transactions, setTransactions] = (0, import_react13.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react13.useState)(true);
  const [error, setError] = (0, import_react13.useState)(null);
  const [history, setHistory] = (0, import_react13.useState)(null);
  (0, import_react13.useEffect)(() => {
    if (!wallet?.publicKey) {
      setHistory(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    const initHistory = async () => {
      try {
        const walletId = Buffer.from(wallet.publicKey.x).toString("hex");
        const historyManager = new import_sdk4.TransactionHistory(walletId);
        await historyManager.initialize();
        setHistory(historyManager);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize history");
        setIsLoading(false);
      }
    };
    initHistory();
  }, [wallet]);
  (0, import_react13.useEffect)(() => {
    if (!history) return;
    const loadTransactions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const txs = await history.getTransactions(filter);
        setTransactions(txs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    };
    loadTransactions();
  }, [history, filter]);
  const refresh = (0, import_react13.useCallback)(async () => {
    if (!history) return;
    setIsLoading(true);
    try {
      const txs = await history.getTransactions(filter);
      setTransactions(txs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh history");
    } finally {
      setIsLoading(false);
    }
  }, [history, filter]);
  const addTransaction = (0, import_react13.useCallback)(
    async (type, tokenMint, amount, options) => {
      if (!history) return null;
      try {
        const pending = (0, import_sdk4.createPendingTransaction)(type, tokenMint, amount, options);
        const record = await history.addTransaction(pending);
        setTransactions((prev) => [record, ...prev]);
        return record;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add transaction");
        return null;
      }
    },
    [history]
  );
  const updateTransaction = (0, import_react13.useCallback)(
    async (id, updates) => {
      if (!history) return null;
      try {
        const updated = await history.updateTransaction(id, updates);
        if (updated) {
          setTransactions(
            (prev) => prev.map((tx) => tx.id === id ? updated : tx)
          );
        }
        return updated;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update transaction");
        return null;
      }
    },
    [history]
  );
  const confirmTransaction = (0, import_react13.useCallback)(
    async (id, signature) => {
      return updateTransaction(id, {
        status: import_sdk4.TransactionStatus.CONFIRMED,
        signature
      });
    },
    [updateTransaction]
  );
  const failTransaction = (0, import_react13.useCallback)(
    async (id, errorMsg) => {
      return updateTransaction(id, {
        status: import_sdk4.TransactionStatus.FAILED,
        error: errorMsg
      });
    },
    [updateTransaction]
  );
  const clearHistory = (0, import_react13.useCallback)(async () => {
    if (!history) return;
    try {
      await history.clearHistory();
      setTransactions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    }
  }, [history]);
  const summary = (0, import_react13.useMemo)(() => {
    let pending = 0;
    let confirmed = 0;
    let failed = 0;
    for (const tx of transactions) {
      switch (tx.status) {
        case import_sdk4.TransactionStatus.PENDING:
          pending++;
          break;
        case import_sdk4.TransactionStatus.CONFIRMED:
          confirmed++;
          break;
        case import_sdk4.TransactionStatus.FAILED:
          failed++;
          break;
      }
    }
    return {
      total: transactions.length,
      pending,
      confirmed,
      failed
    };
  }, [transactions]);
  return {
    transactions,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    confirmTransaction,
    failTransaction,
    refresh,
    clearHistory,
    count: transactions.length,
    summary
  };
}
function useRecentTransactions(limit = 5) {
  return useTransactionHistory({ limit });
}

// src/useTokenPrices.ts
var import_react14 = require("react");
var import_sdk6 = require("@cloakcraft/sdk");
var import_sdk7 = require("@cloakcraft/sdk");
var sharedPriceFetcher = null;
function getPriceFetcher() {
  if (!sharedPriceFetcher) {
    sharedPriceFetcher = new import_sdk6.TokenPriceFetcher();
  }
  return sharedPriceFetcher;
}
function useTokenPrices(mints, refreshInterval) {
  const [prices, setPrices] = (0, import_react14.useState)(/* @__PURE__ */ new Map());
  const [isLoading, setIsLoading] = (0, import_react14.useState)(true);
  const [error, setError] = (0, import_react14.useState)(null);
  const [lastUpdated, setLastUpdated] = (0, import_react14.useState)(null);
  const [isAvailable, setIsAvailable] = (0, import_react14.useState)(true);
  const fetcher = (0, import_react14.useRef)(getPriceFetcher());
  const mintStrings = (0, import_react14.useMemo)(
    () => mints.map((m) => typeof m === "string" ? m : m.toBase58()),
    [mints]
  );
  const fetchPrices = (0, import_react14.useCallback)(async () => {
    if (mintStrings.length === 0) {
      setPrices(/* @__PURE__ */ new Map());
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const priceMap = await fetcher.current.getPrices(mintStrings);
      setPrices(priceMap);
      setLastUpdated(Date.now());
      setIsAvailable(fetcher.current.isAvailable());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
      setIsAvailable(fetcher.current.isAvailable());
    } finally {
      setIsLoading(false);
    }
  }, [mintStrings]);
  const forceRetry = (0, import_react14.useCallback)(async () => {
    fetcher.current.resetBackoff();
    setIsAvailable(true);
    await fetchPrices();
  }, [fetchPrices]);
  (0, import_react14.useEffect)(() => {
    fetchPrices();
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPrices, refreshInterval]);
  const getPrice = (0, import_react14.useCallback)(
    (mint) => {
      const mintStr = typeof mint === "string" ? mint : mint.toBase58();
      return prices.get(mintStr);
    },
    [prices]
  );
  const getUsdValue = (0, import_react14.useCallback)(
    (mint, amount, decimals) => {
      const price = getPrice(mint);
      if (!price) return 0;
      const amountNumber = Number(amount) / Math.pow(10, decimals);
      return amountNumber * price.priceUsd;
    },
    [getPrice]
  );
  const solPrice = (0, import_react14.useMemo)(() => {
    const sol = prices.get("So11111111111111111111111111111111111111112");
    return sol?.priceUsd ?? 0;
  }, [prices]);
  return {
    prices,
    getPrice,
    getUsdValue,
    isLoading,
    error,
    refresh: fetchPrices,
    solPrice,
    lastUpdated,
    isAvailable,
    forceRetry
  };
}
function useTokenPrice(mint) {
  const mints = (0, import_react14.useMemo)(
    () => mint ? [mint] : [],
    [mint]
  );
  const { prices, isLoading, error, refresh } = useTokenPrices(mints);
  const price = (0, import_react14.useMemo)(() => {
    if (!mint) return null;
    const mintStr = typeof mint === "string" ? mint : mint.toBase58();
    return prices.get(mintStr) ?? null;
  }, [mint, prices]);
  return {
    price,
    priceUsd: price?.priceUsd ?? 0,
    isLoading,
    error,
    refresh
  };
}
function useSolPrice(refreshInterval = 6e4) {
  const { solPrice, isLoading, error, refresh } = useTokenPrices(
    ["So11111111111111111111111111111111111111112"],
    refreshInterval
  );
  return {
    price: solPrice,
    isLoading,
    error,
    refresh
  };
}
function usePortfolioValue(balances) {
  const mints = (0, import_react14.useMemo)(
    () => balances.map((b) => b.mint),
    [balances]
  );
  const { prices, isLoading, error } = useTokenPrices(mints);
  const totalValue = (0, import_react14.useMemo)(() => {
    let total = 0;
    for (const balance of balances) {
      const mintStr = typeof balance.mint === "string" ? balance.mint : balance.mint.toBase58();
      const price = prices.get(mintStr);
      if (price) {
        const amountNumber = Number(balance.amount) / Math.pow(10, balance.decimals);
        total += amountNumber * price.priceUsd;
      }
    }
    return total;
  }, [balances, prices]);
  const breakdown = (0, import_react14.useMemo)(() => {
    return balances.map((balance) => {
      const mintStr = typeof balance.mint === "string" ? balance.mint : balance.mint.toBase58();
      const price = prices.get(mintStr);
      const amountNumber = Number(balance.amount) / Math.pow(10, balance.decimals);
      const value = price ? amountNumber * price.priceUsd : 0;
      const percentage = totalValue > 0 ? value / totalValue * 100 : 0;
      return {
        mint: mintStr,
        amount: balance.amount,
        decimals: balance.decimals,
        priceUsd: price?.priceUsd ?? 0,
        valueUsd: value,
        percentage
      };
    });
  }, [balances, prices, totalValue]);
  return {
    totalValue,
    breakdown,
    isLoading,
    error
  };
}

// src/usePoolAnalytics.ts
var import_react15 = require("react");
var import_sdk8 = require("@cloakcraft/sdk");
var import_sdk9 = require("@cloakcraft/sdk");
var sharedCalculator = null;
function getCalculator() {
  if (!sharedCalculator) {
    sharedCalculator = new import_sdk8.PoolAnalyticsCalculator();
  }
  return sharedCalculator;
}
function usePoolAnalytics(decimalsMap, refreshInterval) {
  const { pools, isLoading: poolsLoading, refresh: refreshPools } = useAmmPools();
  const [analytics, setAnalytics] = (0, import_react15.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react15.useState)(true);
  const [error, setError] = (0, import_react15.useState)(null);
  const [lastUpdated, setLastUpdated] = (0, import_react15.useState)(null);
  const calculator = (0, import_react15.useRef)(getCalculator());
  const calculateAnalytics = (0, import_react15.useCallback)(async () => {
    if (pools.length === 0) {
      setAnalytics(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await calculator.current.calculateAnalytics(pools, decimalsMap);
      setAnalytics(result);
      setLastUpdated(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate analytics");
    } finally {
      setIsLoading(false);
    }
  }, [pools, decimalsMap]);
  (0, import_react15.useEffect)(() => {
    if (!poolsLoading) {
      calculateAnalytics();
    }
  }, [pools, poolsLoading, calculateAnalytics]);
  (0, import_react15.useEffect)(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshPools();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshPools]);
  const refresh = (0, import_react15.useCallback)(async () => {
    await refreshPools();
    await calculateAnalytics();
  }, [refreshPools, calculateAnalytics]);
  return {
    analytics,
    totalTvl: analytics?.totalTvlUsd ?? 0,
    formattedTvl: (0, import_sdk8.formatTvl)(analytics?.totalTvlUsd ?? 0),
    poolCount: analytics?.poolCount ?? 0,
    poolStats: analytics?.pools ?? [],
    isLoading: isLoading || poolsLoading,
    error,
    refresh,
    lastUpdated
  };
}
function usePoolStats(pool, tokenADecimals = 9, tokenBDecimals = 9) {
  const [stats, setStats] = (0, import_react15.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react15.useState)(true);
  const [error, setError] = (0, import_react15.useState)(null);
  const calculator = (0, import_react15.useRef)(getCalculator());
  const calculateStats = (0, import_react15.useCallback)(async () => {
    if (!pool) {
      setStats(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await calculator.current.calculatePoolStats(
        pool,
        tokenADecimals,
        tokenBDecimals
      );
      setStats(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate stats");
    } finally {
      setIsLoading(false);
    }
  }, [pool, tokenADecimals, tokenBDecimals]);
  (0, import_react15.useEffect)(() => {
    calculateStats();
  }, [calculateStats]);
  return {
    stats,
    isLoading,
    error,
    refresh: calculateStats
  };
}
function useUserPosition(pool, lpBalance, tokenADecimals = 9, tokenBDecimals = 9) {
  const [position, setPosition] = (0, import_react15.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react15.useState)(true);
  const [error, setError] = (0, import_react15.useState)(null);
  const calculator = (0, import_react15.useRef)(getCalculator());
  const calculatePosition = (0, import_react15.useCallback)(async () => {
    if (!pool || lpBalance === 0n) {
      setPosition(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const result = await calculator.current.calculateUserPosition(
        pool,
        lpBalance,
        tokenADecimals,
        tokenBDecimals
      );
      setPosition(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to calculate position");
    } finally {
      setIsLoading(false);
    }
  }, [pool, lpBalance, tokenADecimals, tokenBDecimals]);
  (0, import_react15.useEffect)(() => {
    calculatePosition();
  }, [calculatePosition]);
  return {
    position,
    lpBalance,
    sharePercent: position?.sharePercent ?? 0,
    valueUsd: position?.valueUsd ?? 0,
    isLoading,
    error,
    refresh: calculatePosition
  };
}
function useImpermanentLoss(initialPriceRatio, currentPriceRatio) {
  const calculator = (0, import_react15.useRef)(getCalculator());
  const impermanentLoss = (0, import_react15.useMemo)(() => {
    return calculator.current.calculateImpermanentLoss(
      initialPriceRatio,
      currentPriceRatio
    );
  }, [initialPriceRatio, currentPriceRatio]);
  const formattedLoss = (0, import_react15.useMemo)(() => {
    return `${impermanentLoss.toFixed(2)}%`;
  }, [impermanentLoss]);
  return {
    impermanentLoss,
    formattedLoss
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CloakCraftProvider,
  TransactionStatus,
  TransactionType,
  WALLET_DERIVATION_MESSAGE,
  formatApy,
  formatPrice,
  formatPriceChange,
  formatShare,
  formatTvl,
  useAddLiquidity,
  useAllBalances,
  useAmmPools,
  useBalance,
  useCloakCraft,
  useImpermanentLoss,
  useInitializeAmmPool,
  useInitializePool,
  useNoteSelection,
  useNoteSelector,
  useNotes,
  useNullifierStatus,
  useOrders,
  usePool,
  usePoolAnalytics,
  usePoolList,
  usePoolStats,
  usePortfolioValue,
  usePrivateBalance,
  usePublicBalance,
  useRecentTransactions,
  useRemoveLiquidity,
  useScanner,
  useShield,
  useSolBalance,
  useSolPrice,
  useSwap,
  useSwapQuote,
  useTokenBalances,
  useTokenPrice,
  useTokenPrices,
  useTransactionHistory,
  useTransfer,
  useUnshield,
  useUserPosition,
  useWallet
});
