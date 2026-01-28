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
  TransactionStatus: () => import_sdk6.TransactionStatus,
  TransactionType: () => import_sdk6.TransactionType,
  WALLET_DERIVATION_MESSAGE: () => WALLET_DERIVATION_MESSAGE,
  formatApy: () => import_sdk10.formatApy,
  formatPrice: () => import_sdk8.formatPrice,
  formatPriceChange: () => import_sdk8.formatPriceChange,
  formatShare: () => import_sdk10.formatShare,
  formatTvl: () => import_sdk10.formatTvl,
  useActiveBallots: () => useActiveBallots,
  useAddLiquidity: () => useAddLiquidity,
  useAllBalances: () => useAllBalances,
  useAmmPools: () => useAmmPools,
  useAutoConsolidation: () => useAutoConsolidation,
  useBalance: () => useBalance,
  useBallot: () => useBallot,
  useBallotTally: () => useBallotTally,
  useBallotTimeStatus: () => useBallotTimeStatus,
  useBallots: () => useBallots,
  useCanClaim: () => useCanClaim,
  useChangeVote: () => useChangeVote,
  useClaim: () => useClaim,
  useCloakCraft: () => useCloakCraft,
  useClosePosition: () => useClosePosition,
  useCloseVotePosition: () => useCloseVotePosition,
  useConsolidation: () => useConsolidation,
  useDecryptTally: () => useDecryptTally,
  useFinalizeBallot: () => useFinalizeBallot,
  useFragmentationScore: () => useFragmentationScore,
  useImpermanentLoss: () => useImpermanentLoss,
  useInitializeAmmPool: () => useInitializeAmmPool,
  useInitializePool: () => useInitializePool,
  useIsBallotAuthority: () => useIsBallotAuthority,
  useIsConsolidationRecommended: () => useIsConsolidationRecommended,
  useIsFreeOperation: () => useIsFreeOperation,
  useKeeperMonitor: () => useKeeperMonitor,
  useLiquidate: () => useLiquidate,
  useLiquidationPrice: () => useLiquidationPrice,
  useLpMintPreview: () => useLpMintPreview,
  useLpValue: () => useLpValue,
  useNoteSelection: () => useNoteSelection,
  useNoteSelector: () => useNoteSelector,
  useNotes: () => useNotes,
  useNullifierStatus: () => useNullifierStatus,
  useOpenPosition: () => useOpenPosition,
  useOrders: () => useOrders,
  usePayoutPreview: () => usePayoutPreview,
  usePerpsAddLiquidity: () => usePerpsAddLiquidity,
  usePerpsMarkets: () => usePerpsMarkets,
  usePerpsPool: () => usePerpsPool,
  usePerpsPools: () => usePerpsPools,
  usePerpsPositions: () => usePerpsPositions,
  usePerpsRemoveLiquidity: () => usePerpsRemoveLiquidity,
  usePool: () => usePool,
  usePoolAnalytics: () => usePoolAnalytics,
  usePoolList: () => usePoolList,
  usePoolStats: () => usePoolStats,
  usePortfolioValue: () => usePortfolioValue,
  usePositionPnL: () => usePositionPnL,
  usePositionValidation: () => usePositionValidation,
  usePrivateBalance: () => usePrivateBalance,
  useProtocolFees: () => useProtocolFees,
  usePublicBalance: () => usePublicBalance,
  usePythPrice: () => usePythPrice,
  usePythPrices: () => usePythPrices,
  useRecentTransactions: () => useRecentTransactions,
  useRemoveLiquidity: () => useRemoveLiquidity,
  useResolveBallot: () => useResolveBallot,
  useScanner: () => useScanner,
  useShield: () => useShield,
  useShouldConsolidate: () => useShouldConsolidate,
  useSolBalance: () => useSolBalance,
  useSolPrice: () => useSolPrice,
  useSwap: () => useSwap,
  useSwapQuote: () => useSwapQuote,
  useTokenBalances: () => useTokenBalances,
  useTokenPrice: () => useTokenPrice,
  useTokenPrices: () => useTokenPrices,
  useTokenUtilization: () => useTokenUtilization,
  useTransactionHistory: () => useTransactionHistory,
  useTransfer: () => useTransfer,
  useUnshield: () => useUnshield,
  useUserPosition: () => useUserPosition,
  useVoteSnapshot: () => useVoteSnapshot,
  useVoteSpend: () => useVoteSpend,
  useVoteValidation: () => useVoteValidation,
  useWallet: () => useWallet,
  useWithdrawPreview: () => useWithdrawPreview
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
  connection,
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
  const syncLockRef = (0, import_react.useRef)(false);
  const hasAutoSyncedRef = (0, import_react.useRef)(false);
  const syncRef = (0, import_react.useRef)(null);
  const STORAGE_KEY = solanaWalletPubkey ? `cloakcraft_spending_key_${solanaWalletPubkey}` : "cloakcraft_spending_key";
  const prevWalletPubkeyRef = (0, import_react.useRef)(void 0);
  (0, import_react.useEffect)(() => {
    if (solanaWalletPubkey) {
      if (prevWalletPubkeyRef.current && prevWalletPubkeyRef.current !== solanaWalletPubkey) {
        console.log("[CloakCraft] Wallet changed, clearing stealth wallet...");
        setWallet(null);
        setNotes([]);
        setIsProverReady(false);
        hasAutoSyncedRef.current = false;
      }
      prevWalletPubkeyRef.current = solanaWalletPubkey;
    }
  }, [solanaWalletPubkey]);
  const client = (0, import_react.useMemo)(
    () => new import_sdk.CloakCraftClient({
      // Use connection if provided (matches scalecraft pattern), otherwise use rpcUrl
      connection,
      rpcUrl,
      indexerUrl,
      programId: new import_web3.PublicKey(programId),
      heliusApiKey,
      network,
      circuitsBaseUrl: "/circom",
      // Circom circuits in /public/circom/
      addressLookupTables: addressLookupTables?.map((addr) => new import_web3.PublicKey(addr))
    }),
    [connection, rpcUrl, indexerUrl, programId, heliusApiKey, network, addressLookupTables]
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
    if (isInitialized && !wallet && solanaWalletPubkey) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          console.log("[CloakCraft] Restoring stealth wallet from localStorage...");
          const spendingKey = new Uint8Array(JSON.parse(stored));
          client.loadWallet(spendingKey).then((restoredWallet) => {
            console.log("[CloakCraft] Stealth wallet restored successfully");
            setWallet(restoredWallet);
          }).catch((err) => {
            console.error("[CloakCraft] Failed to restore wallet:", err);
            localStorage.removeItem(STORAGE_KEY);
          });
        }
      } catch {
      }
    }
  }, [isInitialized, wallet, client, solanaWalletPubkey, STORAGE_KEY]);
  (0, import_react.useEffect)(() => {
    if (wallet && isProgramReady && !hasAutoSyncedRef.current && !syncLockRef.current && syncRef.current) {
      hasAutoSyncedRef.current = true;
      console.log("[CloakCraft] Auto-syncing notes on wallet connect...");
      syncRef.current().catch((err) => {
        console.error("[CloakCraft] Auto-sync failed:", err);
        hasAutoSyncedRef.current = false;
      });
    }
  }, [wallet, isProgramReady]);
  (0, import_react.useEffect)(() => {
    if (wallet && isInitialized && !isInitializing && !isProverReady) {
      console.log("[CloakCraft] Initializing prover...");
      client.initializeProver(["transfer/1x2"]).then(() => {
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
    hasAutoSyncedRef.current = false;
    syncLockRef.current = false;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  }, []);
  const sync = (0, import_react.useCallback)(async (tokenMint, clearCache = false) => {
    if (!wallet) return;
    if (syncLockRef.current) {
      console.log("[CloakCraft] Sync already in progress, skipping...");
      return;
    }
    syncLockRef.current = true;
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
          const seen = /* @__PURE__ */ new Set();
          const uniqueNotes = scannedNotes.filter((note) => {
            const key = Buffer.from(note.commitment).toString("hex");
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return [...otherNotes, ...uniqueNotes];
        });
      } else {
        const seen = /* @__PURE__ */ new Set();
        const uniqueNotes = scannedNotes.filter((note) => {
          const key = Buffer.from(note.commitment).toString("hex");
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setNotes(uniqueNotes);
      }
      const status = await client.getSyncStatus();
      setSyncStatus(status);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sync failed";
      setError(message);
    } finally {
      syncLockRef.current = false;
      setIsSyncing(false);
    }
  }, [client, wallet]);
  (0, import_react.useEffect)(() => {
    syncRef.current = sync;
  }, [sync]);
  const createWallet = (0, import_react.useCallback)(() => {
    return client.createWallet();
  }, [client]);
  const setProgram = (0, import_react.useCallback)((program) => {
    client.setProgram(program);
    setIsProgramReady(true);
  }, [client]);
  const setAnchorWallet = (0, import_react.useCallback)((anchorWallet) => {
    client.setWallet(anchorWallet);
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
    setWallet: setAnchorWallet,
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
var import_sdk3 = require("@cloakcraft/sdk");
function useTransfer() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react6.useState)({
    isTransferring: false,
    error: null,
    result: null
  });
  const transfer = (0, import_react6.useCallback)(
    async (inputsOrOptions, outputs, unshield, walletPublicKey) => {
      let inputs;
      let finalOutputs;
      let finalUnshield;
      let onProgress;
      if (Array.isArray(inputsOrOptions)) {
        inputs = inputsOrOptions;
        finalOutputs = outputs;
        finalUnshield = unshield;
      } else {
        inputs = inputsOrOptions.inputs;
        finalOutputs = inputsOrOptions.outputs;
        finalUnshield = inputsOrOptions.unshield;
        onProgress = inputsOrOptions.onProgress;
      }
      if (!client || !wallet) {
        setState({ isTransferring: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isTransferring: false, error: "Program not set. Call setProgram() first.", result: null });
        return null;
      }
      setState({ isTransferring: true, error: null, result: null });
      onProgress?.("scanning");
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
          { inputs: matchedInputs, outputs: finalOutputs, unshield: finalUnshield, onProgress },
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
  const selector = (0, import_react6.useMemo)(() => new import_sdk3.SmartNoteSelector(), []);
  const availableNotes = (0, import_react6.useMemo)(
    () => notes.filter((note) => note.tokenMint && note.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  const selectNotesForAmount = (0, import_react6.useCallback)(
    (targetAmount, options) => {
      const result = selector.selectNotes(availableNotes, targetAmount, {
        strategy: options?.strategy ?? "greedy",
        maxInputs: options?.maxInputs ?? 2,
        feeAmount: options?.feeAmount
      });
      if (result.error) {
        throw new Error(result.error);
      }
      setSelected(result.notes);
      return result.notes;
    },
    [availableNotes, selector]
  );
  const getSelectionResult = (0, import_react6.useCallback)(
    (targetAmount, options) => {
      return selector.selectNotes(availableNotes, targetAmount, {
        strategy: options?.strategy ?? "smallest-first",
        maxInputs: options?.maxInputs ?? 2,
        feeAmount: options?.feeAmount
      });
    },
    [availableNotes, selector]
  );
  const clearSelection = (0, import_react6.useCallback)(() => {
    setSelected([]);
  }, []);
  const fragmentation = (0, import_react6.useMemo)(
    () => selector.analyzeFragmentation(availableNotes),
    [availableNotes, selector]
  );
  const totalAvailable = availableNotes.reduce((sum, n) => sum + n.amount, 0n);
  const totalSelected = selected.reduce((sum, n) => sum + n.amount, 0n);
  return {
    availableNotes,
    selected,
    totalAvailable,
    totalSelected,
    selectNotesForAmount,
    getSelectionResult,
    clearSelection,
    fragmentation,
    shouldConsolidate: fragmentation.shouldConsolidate
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
      const { inputs, amount, recipient, isWalletAddress, onProgress } = options;
      setState({ isUnshielding: true, error: null, result: null });
      onProgress?.("scanning");
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
        onProgress?.("preparing");
        const change = totalInput - amount;
        console.log("[Unshield] Total input:", totalInput.toString());
        console.log("[Unshield] Amount to unshield:", amount.toString());
        console.log("[Unshield] Change:", change.toString());
        const { generateStealthAddress: generateStealthAddress4 } = await import("@cloakcraft/sdk");
        const outputs = [];
        if (change > 0n) {
          const { stealthAddress } = generateStealthAddress4(wallet.publicKey);
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
            unshield: { amount, recipient: recipientTokenAccount },
            onProgress
            // Pass progress callback to client
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
function useDebounce(fn, delayMs) {
  const timeoutRef = (0, import_react8.useRef)(null);
  const fnRef = (0, import_react8.useRef)(fn);
  fnRef.current = fn;
  return (0, import_react8.useCallback)(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delayMs);
    }),
    [delayMs]
  );
}
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
function useScanner(tokenMint, autoRefreshMs, debounceMs = 500) {
  const { client, wallet, notes, sync } = useCloakCraft();
  const [state, setState] = (0, import_react8.useState)({
    isScanning: false,
    lastScanned: null,
    error: null
  });
  const [stats, setStats] = (0, import_react8.useState)(null);
  const intervalRef = (0, import_react8.useRef)(null);
  const isScanningRef = (0, import_react8.useRef)(false);
  const scanImpl = (0, import_react8.useCallback)(async () => {
    if (!client || !wallet) {
      setState((s) => ({ ...s, error: "Wallet not connected" }));
      return;
    }
    if (isScanningRef.current) {
      return;
    }
    isScanningRef.current = true;
    setState((s) => ({ ...s, isScanning: true, error: null }));
    try {
      await sync(tokenMint);
      try {
        const lightClient = client.lightClient;
        if (lightClient?.getLastScanStats) {
          setStats(lightClient.getLastScanStats());
        }
      } catch {
      }
      setState({
        isScanning: false,
        lastScanned: /* @__PURE__ */ new Date(),
        error: null
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scan failed";
      setState((s) => ({ ...s, isScanning: false, error: message }));
    } finally {
      isScanningRef.current = false;
    }
  }, [client, wallet, sync, tokenMint]);
  const scan = useDebounce(scanImpl, debounceMs);
  const scanNow = scanImpl;
  (0, import_react8.useEffect)(() => {
    if (autoRefreshMs && autoRefreshMs > 0 && client && wallet) {
      scanNow();
      intervalRef.current = setInterval(scanNow, autoRefreshMs);
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefreshMs, client, wallet, scanNow]);
  const filteredNotes = (0, import_react8.useMemo)(() => {
    return tokenMint ? notes.filter((n) => n.tokenMint && n.tokenMint.equals(tokenMint)) : notes;
  }, [notes, tokenMint]);
  const totalAmount = (0, import_react8.useMemo)(() => {
    return filteredNotes.reduce((sum, n) => sum + n.amount, 0n);
  }, [filteredNotes]);
  return {
    ...state,
    notes: filteredNotes,
    totalAmount,
    noteCount: filteredNotes.length,
    scan,
    // Debounced
    scanNow,
    // Immediate
    stats
    // Performance stats
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
var import_sdk4 = require("@cloakcraft/sdk");
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
        const { input, pool, swapDirection, swapAmount, slippageBps = 50, onProgress } = options;
        onProgress?.("preparing");
        const reserveIn = swapDirection === "aToB" ? pool.reserveA : pool.reserveB;
        const reserveOut = swapDirection === "aToB" ? pool.reserveB : pool.reserveA;
        const poolType = pool.poolType ?? import_sdk4.PoolType.ConstantProduct;
        const amplification = pool.amplification ?? 0n;
        const { outputAmount } = (0, import_sdk4.calculateSwapOutputUnified)(
          swapAmount,
          reserveIn,
          reserveOut,
          poolType,
          pool.feeBps,
          amplification
        );
        const minOutput = (0, import_sdk4.calculateMinOutput)(outputAmount, slippageBps);
        const outputTokenMint = swapDirection === "aToB" ? pool.tokenBMint : pool.tokenAMint;
        const { stealthAddress: outputRecipient } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: changeRecipient } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
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
          merkleIndices: dummyIndices,
          onProgress
        });
        onProgress?.("confirming");
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
      const poolType = pool.poolType ?? import_sdk4.PoolType.ConstantProduct;
      const amplification = pool.amplification ?? 0n;
      const { outputAmount, priceImpact } = (0, import_sdk4.calculateSwapOutputUnified)(
        inputAmount,
        reserveIn,
        reserveOut,
        poolType,
        pool.feeBps,
        amplification
      );
      const minOutput = (0, import_sdk4.calculateMinOutput)(outputAmount, 50);
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
    async (tokenAMint, tokenBMint, feeBps = 30, poolType = "constantProduct", amplification = 200) => {
      if (!client?.getProgram()) {
        setState({ isInitializing: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isInitializing: true, error: null, result: null });
      try {
        const signature = await client.initializeAmmPool(
          tokenAMint,
          tokenBMint,
          feeBps,
          poolType,
          amplification
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
        const { pool, inputA, inputB, amountA, amountB, slippageBps = 50, onProgress } = options;
        onProgress?.("preparing");
        const { depositA, depositB, lpAmount } = (0, import_sdk4.calculateAddLiquidityAmounts)(
          amountA,
          amountB,
          pool.reserveA,
          pool.reserveB,
          pool.lpSupply
        );
        const minLpAmount = lpAmount * BigInt(1e4 - slippageBps) / 10000n;
        const { stealthAddress: lpRecipient } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: changeARecipient } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: changeBRecipient } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
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
          changeBRecipient,
          onProgress
        });
        onProgress?.("confirming");
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
        const { pool, lpInput, lpAmount, slippageBps = 50, onProgress } = options;
        onProgress?.("preparing");
        const { outputA, outputB } = (0, import_sdk4.calculateRemoveLiquidityOutput)(
          lpAmount,
          pool.lpSupply,
          pool.reserveA,
          pool.reserveB
        );
        const { stealthAddress: outputARecipient } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: outputBRecipient } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
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
        const oldPoolStateHash = (0, import_sdk4.computeAmmStateHash)(
          pool.reserveA,
          pool.reserveB,
          pool.lpSupply,
          pool.poolId
        );
        const newReserveA = pool.reserveA - outputA;
        const newReserveB = pool.reserveB - outputB;
        const newLpSupply = pool.lpSupply - lpAmount;
        const newPoolStateHash = (0, import_sdk4.computeAmmStateHash)(
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
          merklePathIndices: dummyIndices,
          onProgress
        });
        onProgress?.("confirming");
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
var import_sdk5 = require("@cloakcraft/sdk");
var import_sdk6 = require("@cloakcraft/sdk");
function useTransactionHistory(filter) {
  const { wallet } = useCloakCraft();
  const [transactions, setTransactions] = (0, import_react13.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react13.useState)(true);
  const [error, setError] = (0, import_react13.useState)(null);
  const [history, setHistory] = (0, import_react13.useState)(null);
  const filterKey = (0, import_react13.useMemo)(
    () => JSON.stringify(filter ?? {}),
    [filter?.type, filter?.status, filter?.limit, filter?.tokenMint, filter?.after?.getTime(), filter?.before?.getTime()]
  );
  const filterRef = (0, import_react13.useRef)(filter);
  filterRef.current = filter;
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
        const historyManager = new import_sdk5.TransactionHistory(walletId);
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
        const txs = await history.getTransactions(filterRef.current);
        setTransactions(txs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    };
    loadTransactions();
  }, [history, filterKey]);
  const refresh = (0, import_react13.useCallback)(async () => {
    if (!history) return;
    setIsLoading(true);
    try {
      const txs = await history.getTransactions(filterRef.current);
      setTransactions(txs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh history");
    } finally {
      setIsLoading(false);
    }
  }, [history]);
  const addTransaction = (0, import_react13.useCallback)(
    async (type, tokenMint, amount, options) => {
      if (!history) return null;
      try {
        const pending = (0, import_sdk5.createPendingTransaction)(type, tokenMint, amount, options);
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
        status: import_sdk5.TransactionStatus.CONFIRMED,
        signature
      });
    },
    [updateTransaction]
  );
  const failTransaction = (0, import_react13.useCallback)(
    async (id, errorMsg) => {
      return updateTransaction(id, {
        status: import_sdk5.TransactionStatus.FAILED,
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
        case import_sdk5.TransactionStatus.PENDING:
          pending++;
          break;
        case import_sdk5.TransactionStatus.CONFIRMED:
          confirmed++;
          break;
        case import_sdk5.TransactionStatus.FAILED:
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
var import_sdk7 = require("@cloakcraft/sdk");
var import_sdk8 = require("@cloakcraft/sdk");
var sharedPriceFetcher = null;
function getPriceFetcher() {
  if (!sharedPriceFetcher) {
    sharedPriceFetcher = new import_sdk7.TokenPriceFetcher();
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
var import_sdk9 = require("@cloakcraft/sdk");
var import_sdk10 = require("@cloakcraft/sdk");
var sharedCalculator = null;
function getCalculator() {
  if (!sharedCalculator) {
    sharedCalculator = new import_sdk9.PoolAnalyticsCalculator();
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
    formattedTvl: (0, import_sdk9.formatTvl)(analytics?.totalTvlUsd ?? 0),
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

// src/useConsolidation.ts
var import_react16 = require("react");
var import_sdk11 = require("@cloakcraft/sdk");
function useConsolidation(options) {
  const { notes, sync, client, wallet, isProverReady } = useCloakCraft();
  const { tokenMint, dustThreshold = 1000n, maxNotesPerBatch = 3 } = options;
  const [state, setState] = (0, import_react16.useState)({
    isAnalyzing: false,
    isConsolidating: false,
    currentBatch: 0,
    totalBatches: 0,
    error: null
  });
  const isConsolidatingRef = (0, import_react16.useRef)(false);
  const service = (0, import_react16.useMemo)(
    () => new import_sdk11.ConsolidationService(dustThreshold),
    [dustThreshold]
  );
  const tokenNotes = (0, import_react16.useMemo)(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  const fragmentationReport = (0, import_react16.useMemo)(
    () => service.analyzeNotes(tokenNotes),
    [service, tokenNotes]
  );
  const suggestions = (0, import_react16.useMemo)(
    () => service.suggestConsolidation(tokenNotes, { maxNotesPerBatch }),
    [service, tokenNotes, maxNotesPerBatch]
  );
  const consolidationPlan = (0, import_react16.useMemo)(
    () => service.planConsolidation(tokenNotes, { maxNotesPerBatch }),
    [service, tokenNotes, maxNotesPerBatch]
  );
  const summary = (0, import_react16.useMemo)(
    () => service.getConsolidationSummary(tokenNotes),
    [service, tokenNotes]
  );
  const consolidate = (0, import_react16.useCallback)(async (onProgress, targetAmount, maxInputs = 2) => {
    if (isConsolidatingRef.current) {
      console.log("[useConsolidation] Already consolidating, skipping...");
      return;
    }
    if (!wallet || !client || !isProverReady) {
      setState((s) => ({
        ...s,
        error: "Wallet or prover not ready"
      }));
      return;
    }
    if (tokenNotes.length <= 1) {
      setState((s) => ({
        ...s,
        error: "Nothing to consolidate"
      }));
      return;
    }
    isConsolidatingRef.current = true;
    let estimatedBatches;
    if (targetAmount !== void 0) {
      const sortedNotes = [...tokenNotes].sort((a, b) => Number(a.amount - b.amount));
      let sum = 0n;
      let notesNeeded = 0;
      for (const note of sortedNotes) {
        sum += note.amount;
        notesNeeded++;
        if (sum >= targetAmount) break;
      }
      if (notesNeeded <= maxInputs) {
        estimatedBatches = 0;
      } else {
        estimatedBatches = Math.ceil((notesNeeded - maxInputs) / 2);
      }
    } else {
      estimatedBatches = Math.ceil(Math.log(tokenNotes.length) / Math.log(3));
    }
    setState({
      isAnalyzing: false,
      isConsolidating: true,
      currentBatch: 0,
      totalBatches: estimatedBatches,
      error: null
    });
    try {
      console.log("[useConsolidation] Starting recursive consolidation...", {
        noteCount: tokenNotes.length,
        notesForTarget: targetAmount !== void 0 ? "calculated" : "all",
        estimatedBatches
      });
      let batchNumber = 0;
      let currentTotalBatches = estimatedBatches;
      const maxIterations = 10;
      while (batchNumber < maxIterations) {
        console.log("[useConsolidation] Fetching fresh notes from client...");
        client.clearScanCache();
        const freshNotes = await client.scanNotes(tokenMint);
        const currentNotes = freshNotes.filter((n) => n.tokenMint.equals(tokenMint));
        console.log(`[useConsolidation] Fresh notes for token: ${currentNotes.length}`);
        await sync(tokenMint, true);
        if (currentNotes.length <= 1) {
          console.log("[useConsolidation] Consolidation complete - only 1 note remaining");
          break;
        }
        const sortedBySmallest = [...currentNotes].sort((a, b) => Number(a.amount - b.amount));
        let notesToConsolidate;
        if (targetAmount !== void 0) {
          let sum = 0n;
          let notesNeeded = 0;
          for (const note of sortedBySmallest) {
            sum += note.amount;
            notesNeeded++;
            if (sum >= targetAmount) break;
          }
          if (notesNeeded <= maxInputs && sum >= targetAmount) {
            console.log(`[useConsolidation] Target achievable with ${notesNeeded} smallest notes (max ${maxInputs}), stopping early`);
            break;
          }
          const notesForTarget = sortedBySmallest.slice(0, notesNeeded);
          notesToConsolidate = notesForTarget.slice(0, Math.min(3, notesForTarget.length));
          console.log(`[useConsolidation] Need ${notesNeeded} notes for target, consolidating ${notesToConsolidate.length} smallest...`);
        } else {
          notesToConsolidate = sortedBySmallest.slice(0, Math.min(3, sortedBySmallest.length));
        }
        if (notesToConsolidate.length < 2) {
          console.log("[useConsolidation] Not enough notes to consolidate");
          break;
        }
        batchNumber++;
        const remainingAfterBatch = currentNotes.length - notesToConsolidate.length + 1;
        const willStopAfterBatch = targetAmount !== void 0 && remainingAfterBatch <= maxInputs;
        const additionalBatches = willStopAfterBatch ? 0 : remainingAfterBatch > 1 ? Math.ceil(Math.log(remainingAfterBatch) / Math.log(3)) : 0;
        currentTotalBatches = Math.max(currentTotalBatches, batchNumber + additionalBatches);
        console.log(`[useConsolidation] Processing batch ${batchNumber} of ${currentTotalBatches}...`, {
          notesToConsolidate: notesToConsolidate.length,
          remainingNotes: currentNotes.length
        });
        setState((s) => ({
          ...s,
          currentBatch: batchNumber,
          totalBatches: currentTotalBatches
        }));
        const batchInfo = { current: batchNumber, total: currentTotalBatches };
        const wrappedOnProgress = onProgress ? (stage) => onProgress(stage, batchInfo) : void 0;
        const result = await client.prepareAndConsolidate(notesToConsolidate, tokenMint, wrappedOnProgress);
        console.log(`[useConsolidation] Batch ${batchNumber} completed:`, result.signature);
        onProgress?.("syncing", batchInfo);
        console.log("[useConsolidation] Waiting for indexer sync...");
        await new Promise((resolve) => setTimeout(resolve, 5e3));
      }
      await sync(tokenMint, true);
      setState((s) => ({
        ...s,
        isConsolidating: false,
        currentBatch: batchNumber,
        error: null
      }));
      console.log("[useConsolidation] Consolidation complete!");
    } catch (err) {
      console.error("[useConsolidation] Consolidation failed:", err);
      setState((s) => ({
        ...s,
        isConsolidating: false,
        error: err instanceof Error ? err.message : "Consolidation failed"
      }));
      throw err;
    } finally {
      isConsolidatingRef.current = false;
    }
  }, [wallet, client, isProverReady, tokenNotes, sync, tokenMint]);
  const consolidateBatch = (0, import_react16.useCallback)(async (batchIndex) => {
    if (!wallet || !client || !isProverReady) {
      setState((s) => ({
        ...s,
        error: "Wallet or prover not ready"
      }));
      return;
    }
    const batch = consolidationPlan[batchIndex];
    if (!batch) {
      setState((s) => ({
        ...s,
        error: "Invalid batch index"
      }));
      return;
    }
    setState((s) => ({
      ...s,
      isConsolidating: true,
      currentBatch: batchIndex,
      error: null
    }));
    try {
      console.log(`[useConsolidation] Consolidating batch ${batchIndex + 1}...`, batch);
      const batchNotes = batch.notes.slice(0, 3);
      if (batchNotes.length === 0) {
        throw new Error("Empty batch");
      }
      const result = await client.prepareAndConsolidate(batchNotes, tokenMint);
      console.log(`[useConsolidation] Batch ${batchIndex + 1} completed:`, result.signature);
      await sync(tokenMint, true);
      setState((s) => ({
        ...s,
        isConsolidating: false,
        currentBatch: batchIndex + 1
      }));
    } catch (err) {
      console.error("[useConsolidation] Batch consolidation failed:", err);
      setState((s) => ({
        ...s,
        isConsolidating: false,
        error: err instanceof Error ? err.message : "Batch consolidation failed"
      }));
    }
  }, [wallet, client, isProverReady, consolidationPlan, tokenMint, sync]);
  const estimatedCost = (0, import_react16.useMemo)(() => {
    return service.estimateConsolidationCost(
      consolidationPlan.reduce((sum, batch) => sum + batch.notes.length, 0)
    );
  }, [service, consolidationPlan]);
  return {
    // State
    ...state,
    // Analysis
    fragmentationReport,
    suggestions,
    consolidationPlan,
    summary,
    // Data
    tokenNotes,
    noteCount: tokenNotes.length,
    shouldConsolidate: fragmentationReport.shouldConsolidate,
    // Costs
    estimatedCost,
    // Actions
    consolidate,
    consolidateBatch,
    // Helpers
    canConsolidate: wallet !== null && isProverReady && tokenNotes.length > 1
  };
}
function useShouldConsolidate(tokenMint) {
  const { notes } = useCloakCraft();
  const service = (0, import_react16.useMemo)(() => new import_sdk11.ConsolidationService(), []);
  return (0, import_react16.useMemo)(() => {
    const tokenNotes = notes.filter((n) => n.tokenMint.equals(tokenMint));
    return service.shouldConsolidate(tokenNotes);
  }, [notes, tokenMint, service]);
}
function useFragmentationScore(tokenMint) {
  const { notes } = useCloakCraft();
  const service = (0, import_react16.useMemo)(() => new import_sdk11.ConsolidationService(), []);
  return (0, import_react16.useMemo)(() => {
    const tokenNotes = notes.filter((n) => n.tokenMint.equals(tokenMint));
    const report = service.analyzeNotes(tokenNotes);
    return report.fragmentationScore;
  }, [notes, tokenMint, service]);
}

// src/useAutoConsolidation.ts
var import_react17 = require("react");
var import_sdk12 = require("@cloakcraft/sdk");
function useAutoConsolidation(options) {
  const { notes } = useCloakCraft();
  const {
    tokenMint,
    initialEnabled = false,
    fragmentationThreshold = 60,
    maxNoteCount = 8,
    maxDustNotes = 3,
    dustThreshold = 1000n,
    checkIntervalMs = 6e4
  } = options;
  const tokenNotes = (0, import_react17.useMemo)(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  const [consolidator] = (0, import_react17.useState)(() => new import_sdk12.AutoConsolidator({
    enabled: initialEnabled,
    fragmentationThreshold,
    maxNoteCount,
    maxDustNotes,
    dustThreshold,
    checkIntervalMs
  }));
  const [state, setState] = (0, import_react17.useState)(
    consolidator.getState()
  );
  const [estimatedCost, setEstimatedCost] = (0, import_react17.useState)(0n);
  (0, import_react17.useEffect)(() => {
    consolidator.setNoteProvider(() => tokenNotes);
  }, [consolidator, tokenNotes]);
  (0, import_react17.useEffect)(() => {
    consolidator.updateConfig({
      onConsolidationRecommended: () => {
        setState(consolidator.getState());
      }
    });
  }, [consolidator]);
  (0, import_react17.useEffect)(() => {
    const interval = setInterval(() => {
      setState(consolidator.getState());
      setEstimatedCost(consolidator.estimateCost());
    }, 5e3);
    return () => clearInterval(interval);
  }, [consolidator]);
  const enable = (0, import_react17.useCallback)(() => {
    consolidator.start();
    setState(consolidator.getState());
  }, [consolidator]);
  const disable = (0, import_react17.useCallback)(() => {
    consolidator.stop();
    setState(consolidator.getState());
  }, [consolidator]);
  const toggle = (0, import_react17.useCallback)(() => {
    if (consolidator.getState().enabled) {
      consolidator.stop();
    } else {
      consolidator.start();
    }
    setState(consolidator.getState());
  }, [consolidator]);
  const checkNow = (0, import_react17.useCallback)(() => {
    consolidator.check();
    setState(consolidator.getState());
    setEstimatedCost(consolidator.estimateCost());
  }, [consolidator]);
  (0, import_react17.useEffect)(() => {
    return () => {
      consolidator.stop();
    };
  }, [consolidator]);
  return {
    state,
    isEnabled: state.enabled,
    isRecommended: state.isRecommended,
    lastReport: state.lastReport,
    enable,
    disable,
    toggle,
    checkNow,
    estimatedCost
  };
}
function useIsConsolidationRecommended(tokenMint) {
  const { notes } = useCloakCraft();
  const [consolidator] = (0, import_react17.useState)(() => new import_sdk12.AutoConsolidator());
  const tokenNotes = (0, import_react17.useMemo)(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  (0, import_react17.useEffect)(() => {
    consolidator.setNoteProvider(() => tokenNotes);
  }, [consolidator, tokenNotes]);
  const [isRecommended, setIsRecommended] = (0, import_react17.useState)(false);
  (0, import_react17.useEffect)(() => {
    consolidator.check();
    setIsRecommended(consolidator.isConsolidationRecommended());
  }, [consolidator, tokenNotes]);
  return isRecommended;
}

// src/useProtocolFees.ts
var import_react18 = require("react");
var import_web33 = require("@solana/web3.js");
var import_sdk13 = require("@cloakcraft/sdk");
var DEFAULT_FEES = {
  transferFeeBps: 10,
  // 0.1%
  unshieldFeeBps: 25,
  // 0.25%
  swapFeeShareBps: 2e3,
  // 20% of LP fees
  removeLiquidityFeeBps: 25,
  // 0.25%
  feesEnabled: true
};
function useProtocolFees() {
  const { client, isProgramReady } = useCloakCraft();
  const [config, setConfig] = (0, import_react18.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react18.useState)(true);
  const [error, setError] = (0, import_react18.useState)(null);
  const fetchConfig = (0, import_react18.useCallback)(async () => {
    if (!client || !isProgramReady) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const program = client.getProgram();
      if (!program) {
        throw new Error("Program not initialized");
      }
      const [configPda] = (0, import_sdk13.deriveProtocolConfigPda)(import_sdk13.PROGRAM_ID);
      const accountInfo = await program.provider.connection.getAccountInfo(configPda);
      if (!accountInfo) {
        console.log("[useProtocolFees] Protocol config not found, using defaults");
        setConfig(null);
        setIsLoading(false);
        return;
      }
      const data = accountInfo.data;
      const authority = new import_web33.PublicKey(data.subarray(8, 40));
      const treasury = new import_web33.PublicKey(data.subarray(40, 72));
      const transferFeeBps = data.readUInt16LE(72);
      const unshieldFeeBps = data.readUInt16LE(74);
      const swapFeeShareBps = data.readUInt16LE(76);
      const removeLiquidityFeeBps = data.readUInt16LE(78);
      const feesEnabled = data[80] !== 0;
      setConfig({
        authority,
        treasury,
        transferFeeBps,
        unshieldFeeBps,
        swapFeeShareBps,
        removeLiquidityFeeBps,
        feesEnabled
      });
    } catch (err) {
      console.error("[useProtocolFees] Failed to fetch config:", err);
      setError(err instanceof Error ? err.message : "Failed to load fee config");
      setConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, isProgramReady]);
  (0, import_react18.useEffect)(() => {
    fetchConfig();
  }, [fetchConfig]);
  const calculateFee = (0, import_react18.useCallback)(
    (amount, operation) => {
      const cfg = config ?? {
        ...DEFAULT_FEES,
        authority: import_web33.PublicKey.default,
        treasury: import_web33.PublicKey.default
      };
      if (!cfg.feesEnabled) {
        return 0n;
      }
      if (operation === "swap") {
        return 0n;
      }
      const bps = {
        transfer: cfg.transferFeeBps,
        unshield: cfg.unshieldFeeBps,
        remove_liquidity: cfg.removeLiquidityFeeBps
      }[operation];
      return amount * BigInt(bps) / 10000n;
    },
    [config]
  );
  return {
    config,
    isLoading,
    error,
    refresh: fetchConfig,
    calculateFee
  };
}
function useIsFreeOperation(operation) {
  return (0, import_react18.useMemo)(() => {
    const freeOperations = ["shield", "add_liquidity", "consolidate"];
    return freeOperations.includes(operation);
  }, [operation]);
}

// src/usePerps.ts
var import_react19 = require("react");
var import_sdk14 = require("@cloakcraft/sdk");
function usePerpsPools() {
  const { client } = useCloakCraft();
  const [pools, setPools] = (0, import_react19.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react19.useState)(false);
  const [error, setError] = (0, import_react19.useState)(null);
  const refresh = (0, import_react19.useCallback)(async () => {
    if (!client?.getProgram()) {
      setPools([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const program = client.getProgram();
      if (!program) {
        throw new Error("Program not available");
      }
      const accounts = await program.account.perpsPool.all();
      const poolData = accounts.map((acc) => ({
        ...acc.account,
        address: acc.publicKey
      })).filter((pool) => pool.numTokens > 0);
      setPools(poolData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch perps pools");
      setPools([]);
    } finally {
      setIsLoading(false);
    }
  }, [client]);
  (0, import_react19.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    pools,
    isLoading,
    error,
    refresh
  };
}
function usePerpsPool(poolAddress) {
  const { client } = useCloakCraft();
  const [pool, setPool] = (0, import_react19.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react19.useState)(false);
  const [error, setError] = (0, import_react19.useState)(null);
  const refresh = (0, import_react19.useCallback)(async () => {
    if (!client?.getProgram() || !poolAddress) {
      setPool(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const program = client.getProgram();
      if (!program) {
        throw new Error("Program not available");
      }
      const account = await program.account.perpsPool.fetch(poolAddress);
      setPool({ ...account, address: poolAddress });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch perps pool");
      setPool(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, poolAddress]);
  (0, import_react19.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    pool,
    isLoading,
    error,
    refresh
  };
}
function usePerpsMarkets(poolAddress) {
  const { client } = useCloakCraft();
  const [markets, setMarkets] = (0, import_react19.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react19.useState)(false);
  const [error, setError] = (0, import_react19.useState)(null);
  const refresh = (0, import_react19.useCallback)(async () => {
    if (!client?.getProgram() || !poolAddress) {
      setMarkets([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const program = client.getProgram();
      if (!program) {
        throw new Error("Program not available");
      }
      const accounts = await program.account.perpsMarket.all([
        { memcmp: { offset: 8 + 32, bytes: poolAddress.toBase58() } }
        // pool field offset
      ]);
      const marketData = accounts.map((acc) => ({
        ...acc.account,
        address: acc.publicKey
      }));
      setMarkets(marketData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch perps markets");
      setMarkets([]);
    } finally {
      setIsLoading(false);
    }
  }, [client, poolAddress]);
  (0, import_react19.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    markets,
    isLoading,
    error,
    refresh
  };
}
function useOpenPosition() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react19.useState)({
    isOpening: false,
    error: null,
    result: null
  });
  const openPosition = (0, import_react19.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isOpening: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isOpening: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isOpening: true, error: null, result: null });
      try {
        const {
          marginInput,
          pool,
          market,
          direction,
          marginAmount,
          leverage,
          oraclePrice,
          onProgress
        } = options;
        onProgress?.("preparing");
        if (!(0, import_sdk14.isValidLeverage)(leverage, pool.maxLeverage)) {
          throw new Error(`Invalid leverage. Must be between 1 and ${pool.maxLeverage}`);
        }
        const positionSize = marginAmount * BigInt(leverage);
        const tokenIndex = direction === "long" ? market.quoteTokenIndex : market.baseTokenIndex;
        const token = pool.tokens[tokenIndex];
        if (token && (0, import_sdk14.wouldExceedUtilization)(token, positionSize, pool.maxUtilizationBps)) {
          throw new Error("Position would exceed pool utilization limit");
        }
        const { stealthAddress: positionRecipient } = (0, import_sdk14.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: changeRecipient } = (0, import_sdk14.generateStealthAddress)(wallet.publicKey);
        client.clearScanCache();
        const freshNotes = await client.scanNotes(marginInput.tokenMint);
        const freshInput = freshNotes.find(
          (n) => n.commitment && marginInput.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(marginInput.commitment).toString("hex")
        );
        if (!freshInput) {
          throw new Error("Margin note not found. It may have been spent.");
        }
        onProgress?.("generating");
        const marketId = market.marketId || new Uint8Array(32);
        const merkleRoot = freshInput.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);
        const result = await client.openPerpsPosition({
          input: freshInput,
          poolId: pool.address,
          marketId,
          direction,
          marginAmount,
          leverage,
          oraclePrice,
          positionRecipient,
          changeRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress
        });
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        await sync(marginInput.tokenMint, true);
        setState({ isOpening: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Open position failed";
        setState({ isOpening: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react19.useCallback)(() => {
    setState({ isOpening: false, error: null, result: null });
  }, []);
  return {
    ...state,
    openPosition,
    reset
  };
}
function useClosePosition() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react19.useState)({
    isClosing: false,
    error: null,
    result: null
  });
  const closePosition = (0, import_react19.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isClosing: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isClosing: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isClosing: true, error: null, result: null });
      try {
        const { position, pool, market, oraclePrice, onProgress } = options;
        onProgress?.("preparing");
        const currentTimestamp = Math.floor(Date.now() / 1e3);
        const pnlResult = (0, import_sdk14.calculatePnL)(position, oraclePrice, pool, currentTimestamp);
        const { stealthAddress: settlementRecipient } = (0, import_sdk14.generateStealthAddress)(wallet.publicKey);
        onProgress?.("generating");
        const marketId = market.marketId || new Uint8Array(32);
        const settlementTokenIndex = position.direction === "long" ? market.quoteTokenIndex : market.baseTokenIndex;
        const settlementToken = pool.tokens[settlementTokenIndex];
        if (!settlementToken) {
          throw new Error("Settlement token not found in pool");
        }
        const merkleRoot = position.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);
        const result = await client.closePerpsPosition({
          positionInput: position,
          poolId: pool.address,
          marketId,
          settlementTokenMint: settlementToken.mint,
          oraclePrice,
          settlementRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress
        });
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        if (settlementToken) {
          await sync(settlementToken.mint, true);
        }
        setState({ isClosing: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Close position failed";
        setState({ isClosing: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react19.useCallback)(() => {
    setState({ isClosing: false, error: null, result: null });
  }, []);
  return {
    ...state,
    closePosition,
    reset
  };
}
function usePerpsAddLiquidity() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react19.useState)({
    isAdding: false,
    error: null,
    result: null
  });
  const addLiquidity = (0, import_react19.useCallback)(
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
        const { tokenInput, pool, tokenIndex, depositAmount, oraclePrices, onProgress } = options;
        onProgress?.("preparing");
        if (tokenIndex >= pool.numTokens) {
          throw new Error("Invalid token index");
        }
        const token = pool.tokens[tokenIndex];
        if (!token?.isActive) {
          throw new Error("Token not active in pool");
        }
        const lpAmount = (0, import_sdk14.calculateLpMintAmount)(pool, depositAmount, tokenIndex, oraclePrices);
        const { stealthAddress: lpRecipient } = (0, import_sdk14.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: changeRecipient } = (0, import_sdk14.generateStealthAddress)(wallet.publicKey);
        client.clearScanCache();
        const freshNotes = await client.scanNotes(tokenInput.tokenMint);
        const freshInput = freshNotes.find(
          (n) => n.commitment && tokenInput.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(tokenInput.commitment).toString("hex")
        );
        if (!freshInput) {
          throw new Error("Token note not found. It may have been spent.");
        }
        onProgress?.("generating");
        const merkleRoot = freshInput.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);
        const result = await client.addPerpsLiquidity({
          input: freshInput,
          poolId: pool.address,
          tokenIndex,
          depositAmount,
          lpAmount,
          oraclePrices,
          lpRecipient,
          changeRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress
        });
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        await sync(tokenInput.tokenMint, true);
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
  const reset = (0, import_react19.useCallback)(() => {
    setState({ isAdding: false, error: null, result: null });
  }, []);
  return {
    ...state,
    addLiquidity,
    reset
  };
}
function usePerpsRemoveLiquidity() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react19.useState)({
    isRemoving: false,
    error: null,
    result: null
  });
  const removeLiquidity = (0, import_react19.useCallback)(
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
        const { lpInput, pool, tokenIndex, lpAmount, oraclePrices, onProgress } = options;
        onProgress?.("preparing");
        if (tokenIndex >= pool.numTokens) {
          throw new Error("Invalid token index");
        }
        const token = pool.tokens[tokenIndex];
        if (!token?.isActive) {
          throw new Error("Token not active in pool");
        }
        const withdrawAmount = (0, import_sdk14.calculateWithdrawAmount)(pool, lpAmount, tokenIndex, oraclePrices);
        const { maxAmount, utilizationAfter } = (0, import_sdk14.calculateMaxWithdrawable)(
          pool,
          tokenIndex,
          lpAmount,
          oraclePrices
        );
        if (withdrawAmount > maxAmount) {
          throw new Error("Withdrawal would exceed available balance");
        }
        const { stealthAddress: withdrawRecipient } = (0, import_sdk14.generateStealthAddress)(wallet.publicKey);
        const { stealthAddress: lpChangeRecipient } = (0, import_sdk14.generateStealthAddress)(wallet.publicKey);
        client.clearScanCache();
        const freshNotes = await client.scanNotes(pool.lpMint);
        const freshInput = freshNotes.find(
          (n) => n.commitment && lpInput.commitment && Buffer.from(n.commitment).toString("hex") === Buffer.from(lpInput.commitment).toString("hex")
        );
        if (!freshInput) {
          throw new Error("LP note not found. It may have been spent.");
        }
        onProgress?.("generating");
        const merkleRoot = freshInput.commitment;
        const dummyPath = Array(32).fill(new Uint8Array(32));
        const dummyIndices = Array(32).fill(0);
        const result = await client.removePerpsLiquidity({
          lpInput: freshInput,
          poolId: pool.address,
          tokenIndex,
          lpAmount,
          withdrawAmount,
          oraclePrices,
          withdrawRecipient,
          lpChangeRecipient,
          merkleRoot,
          merklePath: dummyPath,
          merkleIndices: dummyIndices,
          onProgress
        });
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        await sync(pool.lpMint, true);
        await sync(token.mint, true);
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
  const reset = (0, import_react19.useCallback)(() => {
    setState({ isRemoving: false, error: null, result: null });
  }, []);
  return {
    ...state,
    removeLiquidity,
    reset
  };
}
function usePositionPnL(position, currentPrice, pool) {
  return (0, import_react19.useMemo)(() => {
    if (!position || !pool || currentPrice <= 0n) {
      return null;
    }
    try {
      const currentTimestamp = Math.floor(Date.now() / 1e3);
      return (0, import_sdk14.calculatePnL)(position, currentPrice, pool, currentTimestamp);
    } catch {
      return null;
    }
  }, [position, currentPrice, pool]);
}
function useLiquidationPrice(position, pool) {
  return (0, import_react19.useMemo)(() => {
    if (!position || !pool) {
      return null;
    }
    try {
      const currentTimestamp = Math.floor(Date.now() / 1e3);
      return (0, import_sdk14.calculateLiquidationPrice)(position, pool, currentTimestamp);
    } catch {
      return null;
    }
  }, [position, pool]);
}
function useLpValue(pool, oraclePrices) {
  return (0, import_react19.useMemo)(() => {
    if (!pool || oraclePrices.length === 0) {
      return null;
    }
    try {
      return (0, import_sdk14.calculateLpValue)(pool, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, oraclePrices]);
}
function useLpMintPreview(pool, depositAmount, tokenIndex, oraclePrices) {
  return (0, import_react19.useMemo)(() => {
    if (!pool || depositAmount <= 0n || oraclePrices.length === 0) {
      return null;
    }
    try {
      return (0, import_sdk14.calculateLpMintAmount)(pool, depositAmount, tokenIndex, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, depositAmount, tokenIndex, oraclePrices]);
}
function useWithdrawPreview(pool, lpAmount, tokenIndex, oraclePrices) {
  return (0, import_react19.useMemo)(() => {
    if (!pool || lpAmount <= 0n || oraclePrices.length === 0) {
      return null;
    }
    try {
      return (0, import_sdk14.calculateMaxWithdrawable)(pool, tokenIndex, lpAmount, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, lpAmount, tokenIndex, oraclePrices]);
}
function useTokenUtilization(pool) {
  return (0, import_react19.useMemo)(() => {
    if (!pool) {
      return [];
    }
    return pool.tokens.filter((t) => t?.isActive).map((token, index) => ({
      tokenIndex: index,
      mint: token.mint,
      utilization: (0, import_sdk14.calculateUtilization)(token),
      borrowRate: (0, import_sdk14.calculateBorrowRate)(
        (0, import_sdk14.calculateUtilization)(token),
        pool.baseBorrowRateBps
      )
    }));
  }, [pool]);
}
function usePositionValidation(pool, market, marginAmount, leverage, direction) {
  return (0, import_react19.useMemo)(() => {
    if (!pool || !market) {
      return { isValid: false, error: "Pool or market not loaded" };
    }
    if (!(0, import_sdk14.isValidLeverage)(leverage, pool.maxLeverage)) {
      return { isValid: false, error: `Leverage must be between 1 and ${pool.maxLeverage}` };
    }
    const positionSize = marginAmount * BigInt(leverage);
    const tokenIndex = direction === "long" ? market.quoteTokenIndex : market.baseTokenIndex;
    const token = pool.tokens[tokenIndex];
    if (!token?.isActive) {
      return { isValid: false, error: "Token not active" };
    }
    if ((0, import_sdk14.wouldExceedUtilization)(token, positionSize, pool.maxUtilizationBps)) {
      return { isValid: false, error: "Would exceed pool utilization limit" };
    }
    return { isValid: true, error: null, positionSize };
  }, [pool, market, marginAmount, leverage, direction]);
}
function toPositionStatus(status) {
  switch (status) {
    case 0:
      return "active";
    case 1:
      return "liquidated";
    case 2:
      return "closed";
    default:
      return "unknown";
  }
}
function derivePositionId(commitment, randomness) {
  return commitment;
}
function usePerpsPositions(positionPool) {
  const { client, wallet } = useCloakCraft();
  const [positions, setPositions] = (0, import_react19.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react19.useState)(false);
  const [error, setError] = (0, import_react19.useState)(null);
  const refresh = (0, import_react19.useCallback)(async () => {
    if (!client || !wallet || !positionPool) {
      setPositions([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const scannedPositions = await client.scanPositionNotes(positionPool);
      if (scannedPositions.length === 0) {
        setPositions([]);
        return;
      }
      const positionIds = scannedPositions.map(
        (pos) => derivePositionId(pos.commitment, pos.randomness)
      );
      let metadataMap = /* @__PURE__ */ new Map();
      try {
        metadataMap = await client.fetchPositionMetas(positionPool, positionIds);
      } catch (metaErr) {
        console.warn("[usePerpsPositions] Failed to fetch position metadata:", metaErr);
      }
      const uiPositions = scannedPositions.map((pos) => {
        const positionIdHex = Buffer.from(derivePositionId(pos.commitment, pos.randomness)).toString("hex");
        const meta = metadataMap.get(positionIdHex);
        return {
          commitment: pos.commitment,
          accountHash: pos.accountHash,
          marketId: pos.marketId,
          isLong: pos.isLong,
          margin: pos.margin,
          size: pos.size,
          leverage: pos.leverage,
          entryPrice: pos.entryPrice,
          randomness: pos.randomness,
          pool: pos.pool,
          spent: pos.spent,
          // Metadata fields
          status: meta ? toPositionStatus(meta.status) : pos.spent ? "closed" : "active",
          liquidationPrice: meta?.liquidationPrice,
          createdAt: meta?.createdAt,
          hasMetadata: !!meta
        };
      });
      setPositions(uiPositions.filter((p) => !p.spent && p.status !== "closed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to scan positions");
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, [client, wallet, positionPool]);
  (0, import_react19.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    positions,
    isLoading,
    error,
    refresh
  };
}
function usePythPrice(symbol, refreshInterval = 1e4) {
  const [price, setPrice] = (0, import_react19.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react19.useState)(false);
  const [error, setError] = (0, import_react19.useState)(null);
  const refresh = (0, import_react19.useCallback)(async () => {
    if (!symbol) {
      setPrice(null);
      return;
    }
    const feedId = (0, import_sdk14.getFeedIdBySymbol)(symbol);
    if (!feedId) {
      setError(`Unknown symbol: ${symbol}`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const priceUsd = await (0, import_sdk14.fetchPythPriceUsd)(feedId, 9);
      setPrice(priceUsd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch price");
      setPrice(null);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);
  (0, import_react19.useEffect)(() => {
    refresh();
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, refreshInterval]);
  return {
    price,
    isLoading,
    error,
    refresh
  };
}
function usePythPrices(symbols, refreshInterval = 1e4) {
  const [prices, setPrices] = (0, import_react19.useState)(/* @__PURE__ */ new Map());
  const [isLoading, setIsLoading] = (0, import_react19.useState)(false);
  const [error, setError] = (0, import_react19.useState)(null);
  const refresh = (0, import_react19.useCallback)(async () => {
    if (!symbols.length) {
      setPrices(/* @__PURE__ */ new Map());
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const priceMap = /* @__PURE__ */ new Map();
      await Promise.all(
        symbols.map(async (symbol) => {
          const feedId = (0, import_sdk14.getFeedIdBySymbol)(symbol);
          if (feedId) {
            const priceUsd = await (0, import_sdk14.fetchPythPriceUsd)(feedId, 9);
            priceMap.set(symbol, priceUsd);
          }
        })
      );
      setPrices(priceMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch prices");
    } finally {
      setIsLoading(false);
    }
  }, [symbols]);
  (0, import_react19.useEffect)(() => {
    refresh();
    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refresh, refreshInterval]);
  return {
    prices,
    isLoading,
    error,
    refresh
  };
}
function useKeeperMonitor(pool, positionPool, pollInterval = 5e3) {
  const { positions, isLoading: isScanning, refresh: refreshPositions } = usePerpsPositions(positionPool);
  const [liquidatable, setLiquidatable] = (0, import_react19.useState)([]);
  const [isChecking, setIsChecking] = (0, import_react19.useState)(false);
  const [lastCheck, setLastCheck] = (0, import_react19.useState)(0);
  const tokenSymbols = (0, import_react19.useMemo)(() => {
    if (!pool) return [];
    return pool.tokens.filter((t) => t.isActive).map((t) => {
      const mintStr = t.mint.toBase58();
      if (mintStr.includes("So1")) return "SOL";
      if (mintStr.includes("USDC") || mintStr.includes("EPj")) return "USDC";
      return "SOL";
    });
  }, [pool]);
  const { prices, refresh: refreshPrices } = usePythPrices(tokenSymbols, pollInterval);
  const checkPositions = (0, import_react19.useCallback)(async () => {
    if (!pool || !positions.length || !prices.size) {
      setLiquidatable([]);
      return;
    }
    setIsChecking(true);
    try {
      const sdk = await import("@cloakcraft/sdk");
      const shouldLiquidateFn = sdk.shouldLiquidate;
      const calculateLiquidationAmountsFn = sdk.calculateLiquidationAmounts;
      if (!shouldLiquidateFn || !calculateLiquidationAmountsFn) {
        console.warn("Liquidation functions not available in SDK");
        setLiquidatable([]);
        return;
      }
      const liquidatablePositions = [];
      for (const position of positions) {
        if (position.spent) continue;
        const currentPrice = prices.values().next().value || 0n;
        if (currentPrice === 0n) continue;
        const result = shouldLiquidateFn(
          {
            margin: position.margin,
            size: position.size,
            entryPrice: position.entryPrice,
            direction: position.isLong ? "long" : "short"
          },
          currentPrice,
          { liquidationThresholdBps: pool.liquidationThresholdBps }
        );
        if (result.shouldLiquidate && result.reason) {
          const amounts = calculateLiquidationAmountsFn(
            position.margin,
            result.pnl,
            result.isProfit,
            pool.liquidationPenaltyBps
          );
          liquidatablePositions.push({
            position,
            reason: result.reason,
            currentPrice,
            pnl: result.pnl,
            isProfit: result.isProfit,
            ownerRemainder: amounts.ownerRemainder,
            liquidatorReward: amounts.liquidatorReward
          });
        }
      }
      setLiquidatable(liquidatablePositions);
      setLastCheck(Date.now());
    } finally {
      setIsChecking(false);
    }
  }, [pool, positions, prices]);
  (0, import_react19.useEffect)(() => {
    checkPositions();
    if (pollInterval > 0) {
      const interval = setInterval(() => {
        refreshPositions();
        refreshPrices();
        checkPositions();
      }, pollInterval);
      return () => clearInterval(interval);
    }
  }, [checkPositions, pollInterval, refreshPositions, refreshPrices]);
  return {
    /** All scanned positions */
    positions,
    /** Positions ready for liquidation */
    liquidatable,
    /** Is currently scanning/checking */
    isLoading: isScanning || isChecking,
    /** Last check timestamp */
    lastCheck,
    /** Manual refresh */
    refresh: checkPositions
  };
}
function useLiquidate() {
  const { client, wallet } = useCloakCraft();
  const [isLiquidating, setIsLiquidating] = (0, import_react19.useState)(false);
  const liquidate = (0, import_react19.useCallback)(async (options) => {
    const { position, pool, market, liquidatorRecipient, onProgress } = options;
    const program = client?.getProgram();
    if (!program || !wallet) {
      throw new Error("Program or wallet not available");
    }
    setIsLiquidating(true);
    try {
      onProgress?.("building");
      throw new Error("Liquidation proof generation not yet implemented");
    } finally {
      setIsLiquidating(false);
    }
  }, [client, wallet]);
  return { liquidate, isLiquidating };
}

// src/useVoting.ts
var import_react20 = require("react");
var import_web34 = require("@solana/web3.js");
function useBallots() {
  const { client } = useCloakCraft();
  const [ballots, setBallots] = (0, import_react20.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react20.useState)(false);
  const [error, setError] = (0, import_react20.useState)(null);
  const refresh = (0, import_react20.useCallback)(async () => {
    if (!client?.getProgram()) {
      setBallots([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const program = client.getProgram();
      if (!program) {
        throw new Error("Program not available");
      }
      const accounts = await program.account.ballot.all();
      const ballotData = accounts.map((acc) => ({
        ...acc.account,
        address: acc.publicKey
      }));
      setBallots(ballotData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch ballots");
      setBallots([]);
    } finally {
      setIsLoading(false);
    }
  }, [client]);
  (0, import_react20.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    ballots,
    isLoading,
    error,
    refresh
  };
}
function useActiveBallots() {
  const { ballots, isLoading, error, refresh } = useBallots();
  const activeBallots = (0, import_react20.useMemo)(() => {
    return ballots.filter(
      (b) => b.status === 1
      // BallotStatus.Active
    );
  }, [ballots]);
  return {
    ballots: activeBallots,
    isLoading,
    error,
    refresh
  };
}
function useBallot(ballotAddress) {
  const { client } = useCloakCraft();
  const [ballot, setBallot] = (0, import_react20.useState)(null);
  const [isLoading, setIsLoading] = (0, import_react20.useState)(false);
  const [error, setError] = (0, import_react20.useState)(null);
  const address = (0, import_react20.useMemo)(() => {
    if (!ballotAddress) return null;
    if (typeof ballotAddress === "string") {
      try {
        return new import_web34.PublicKey(ballotAddress);
      } catch {
        return null;
      }
    }
    return ballotAddress;
  }, [ballotAddress]);
  const refresh = (0, import_react20.useCallback)(async () => {
    if (!client?.getProgram() || !address) {
      setBallot(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const program = client.getProgram();
      if (!program) {
        throw new Error("Program not available");
      }
      const account = await program.account.ballot.fetch(address);
      setBallot({ ...account, address });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch ballot");
      setBallot(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, address]);
  (0, import_react20.useEffect)(() => {
    refresh();
  }, [refresh]);
  return {
    ballot,
    isLoading,
    error,
    refresh
  };
}
function toBigInt(value) {
  if (value === null || value === void 0) return 0n;
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return BigInt(value.toString());
}
function useBallotTally(ballot) {
  return (0, import_react20.useMemo)(() => {
    if (!ballot) {
      return null;
    }
    const totalVotes = Number(toBigInt(ballot.voteCount));
    const totalWeight = toBigInt(ballot.totalWeight);
    const totalAmount = toBigInt(ballot.totalAmount);
    const quorumThreshold = toBigInt(ballot.quorumThreshold);
    const optionStats = (ballot.optionWeights || []).map((w, index) => {
      const weight = toBigInt(w);
      const amount = toBigInt(ballot.optionAmounts?.[index]);
      const percentage = totalWeight > 0n ? Number(weight * 10000n / totalWeight) / 100 : 0;
      return {
        index,
        weight,
        amount,
        percentage
      };
    });
    const leadingOption = optionStats.reduce(
      (max, opt) => opt.weight > max.weight ? opt : max,
      optionStats[0] || { index: 0, weight: 0n, amount: 0n, percentage: 0 }
    );
    return {
      totalVotes,
      totalWeight,
      totalAmount,
      optionStats,
      leadingOption,
      hasQuorum: totalWeight >= quorumThreshold,
      quorumProgress: quorumThreshold > 0n ? Number(totalWeight * 10000n / quorumThreshold) / 100 : 100
    };
  }, [ballot]);
}
function useBallotTimeStatus(ballot) {
  const [now, setNow] = (0, import_react20.useState)(() => Math.floor(Date.now() / 1e3));
  (0, import_react20.useEffect)(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1e3));
    }, 1e3);
    return () => clearInterval(interval);
  }, []);
  return (0, import_react20.useMemo)(() => {
    if (!ballot) {
      return null;
    }
    const toNumber = (val) => {
      if (val === null || val === void 0) return 0;
      if (typeof val === "number") return val;
      if (typeof val === "object" && "toNumber" in val && typeof val.toNumber === "function") {
        return val.toNumber();
      }
      return Number(val.toString());
    };
    const startTime = toNumber(ballot.startTime);
    const endTime = toNumber(ballot.endTime);
    const claimDeadline = toNumber(ballot.claimDeadline);
    const hasStarted = now >= startTime;
    const hasEnded = now >= endTime;
    const canClaim = ballot.hasOutcome && now < claimDeadline;
    const claimExpired = ballot.hasOutcome && now >= claimDeadline;
    const timeUntilStart = Math.max(0, startTime - now);
    const timeUntilEnd = Math.max(0, endTime - now);
    const timeUntilClaimDeadline = Math.max(0, claimDeadline - now);
    return {
      now,
      startTime,
      endTime,
      claimDeadline,
      hasStarted,
      hasEnded,
      canClaim,
      claimExpired,
      timeUntilStart,
      timeUntilEnd,
      timeUntilClaimDeadline,
      isVotingPeriod: hasStarted && !hasEnded
    };
  }, [ballot, now]);
}
function useVoteSnapshot() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react20.useState)({
    isVoting: false,
    error: null,
    result: null
  });
  const vote = (0, import_react20.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isVoting: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isVoting: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isVoting: true, error: null, result: null });
      try {
        const { ballot, note, voteChoice, snapshotMerkleRoot, merklePath, merklePathIndices, eligibilityProof, onProgress } = options;
        onProgress?.("preparing", 0);
        if (voteChoice < 0 || voteChoice >= ballot.numOptions) {
          throw new Error(`Invalid vote choice. Must be 0-${ballot.numOptions - 1}`);
        }
        if (ballot.status !== 1) {
          throw new Error("Ballot is not active");
        }
        if (ballot.bindingMode !== 0) {
          throw new Error("This ballot requires spend-to-vote");
        }
        onProgress?.("generating", 0);
        onProgress?.("building", 0);
        onProgress?.("approving", 0);
        onProgress?.("executing", 0);
        const result = {
          operationId: new Uint8Array(32),
          voteNullifier: new Uint8Array(32),
          voteCommitment: new Uint8Array(32),
          voteRandomness: new Uint8Array(32),
          signatures: ["pending_implementation"]
        };
        onProgress?.("confirming", 0);
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        setState({ isVoting: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Vote failed";
        setState({ isVoting: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react20.useCallback)(() => {
    setState({ isVoting: false, error: null, result: null });
  }, []);
  return {
    ...state,
    vote,
    reset
  };
}
function useVoteSpend() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react20.useState)({
    isVoting: false,
    error: null,
    result: null
  });
  const vote = (0, import_react20.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isVoting: false, error: "Wallet not connected", result: null });
        return null;
      }
      if (!client.getProgram()) {
        setState({ isVoting: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isVoting: true, error: null, result: null });
      try {
        const { ballot, note, voteChoice, merklePath, merklePathIndices, leafIndex, eligibilityProof, onProgress } = options;
        onProgress?.("preparing", 0);
        if (voteChoice < 0 || voteChoice >= ballot.numOptions) {
          throw new Error(`Invalid vote choice. Must be 0-${ballot.numOptions - 1}`);
        }
        if (ballot.status !== 1) {
          throw new Error("Ballot is not active");
        }
        if (ballot.bindingMode !== 1) {
          throw new Error("This ballot uses snapshot voting");
        }
        if (!note.tokenMint.equals(ballot.tokenMint)) {
          throw new Error("Note token does not match ballot token");
        }
        onProgress?.("generating", 0);
        onProgress?.("building", 0);
        onProgress?.("approving", 0);
        onProgress?.("executing", 0);
        const result = {
          operationId: new Uint8Array(32),
          spendingNullifier: new Uint8Array(32),
          positionCommitment: new Uint8Array(32),
          positionRandomness: new Uint8Array(32),
          signatures: ["pending_implementation"]
        };
        onProgress?.("confirming", 0);
        await new Promise((resolve) => setTimeout(resolve, 2e3));
        await sync(note.tokenMint, true);
        setState({ isVoting: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Vote failed";
        setState({ isVoting: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react20.useCallback)(() => {
    setState({ isVoting: false, error: null, result: null });
  }, []);
  return {
    ...state,
    vote,
    reset
  };
}
function useChangeVote() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = (0, import_react20.useState)({
    isChanging: false,
    error: null,
    result: null
  });
  const changeVote = (0, import_react20.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isChanging: false, error: "Wallet not connected", result: null });
        return null;
      }
      setState({ isChanging: true, error: null, result: null });
      try {
        const { ballot, oldVoteCommitment, oldVoteChoice, oldRandomness, newVoteChoice, onProgress } = options;
        onProgress?.("preparing", 0);
        if (newVoteChoice < 0 || newVoteChoice >= ballot.numOptions) {
          throw new Error(`Invalid vote choice. Must be 0-${ballot.numOptions - 1}`);
        }
        if (ballot.status !== 1) {
          throw new Error("Ballot is not active");
        }
        if (ballot.bindingMode !== 0) {
          throw new Error("Can only change vote in snapshot mode");
        }
        onProgress?.("generating", 0);
        onProgress?.("building", 0);
        onProgress?.("approving", 0);
        onProgress?.("executing", 0);
        const result = {
          operationId: new Uint8Array(32),
          voteCommitment: new Uint8Array(32),
          voteRandomness: new Uint8Array(32),
          signatures: ["pending_implementation"]
        };
        onProgress?.("confirming", 0);
        setState({ isChanging: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Change vote failed";
        setState({ isChanging: false, error, result: null });
        return null;
      }
    },
    [client, wallet]
  );
  const reset = (0, import_react20.useCallback)(() => {
    setState({ isChanging: false, error: null, result: null });
  }, []);
  return {
    ...state,
    changeVote,
    reset
  };
}
function useCloseVotePosition() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react20.useState)({
    isClosing: false,
    error: null,
    result: null
  });
  const closePosition = (0, import_react20.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isClosing: false, error: "Wallet not connected", result: null });
        return null;
      }
      setState({ isClosing: true, error: null, result: null });
      try {
        const { ballot, positionCommitment, voteChoice, amount, weight, positionRandomness, onProgress } = options;
        onProgress?.("preparing", 0);
        if (ballot.status >= 3) {
          throw new Error("Cannot close position after ballot is resolved");
        }
        if (ballot.bindingMode !== 1) {
          throw new Error("Only spend-to-vote positions can be closed");
        }
        onProgress?.("generating", 0);
        onProgress?.("building", 0);
        onProgress?.("approving", 0);
        onProgress?.("executing", 0);
        const result = {
          operationId: new Uint8Array(32),
          signatures: ["pending_implementation"]
        };
        onProgress?.("confirming", 0);
        await sync(ballot.tokenMint, true);
        setState({ isClosing: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Close position failed";
        setState({ isClosing: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react20.useCallback)(() => {
    setState({ isClosing: false, error: null, result: null });
  }, []);
  return {
    ...state,
    closePosition,
    reset
  };
}
function useClaim() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = (0, import_react20.useState)({
    isClaiming: false,
    error: null,
    result: null
  });
  const claim = (0, import_react20.useCallback)(
    async (options) => {
      if (!client || !wallet) {
        setState({ isClaiming: false, error: "Wallet not connected", result: null });
        return null;
      }
      setState({ isClaiming: true, error: null, result: null });
      try {
        const { ballot, positionCommitment, voteChoice, amount, weight, positionRandomness, onProgress } = options;
        onProgress?.("preparing", 0);
        if (!ballot.hasOutcome) {
          throw new Error("Ballot not resolved yet");
        }
        if (voteChoice !== ballot.outcome) {
          throw new Error("Cannot claim - did not vote for winning option");
        }
        if (ballot.bindingMode !== 1) {
          throw new Error("Only spend-to-vote ballots have claims");
        }
        onProgress?.("generating", 0);
        onProgress?.("building", 0);
        onProgress?.("approving", 0);
        onProgress?.("executing", 0);
        const result = {
          operationId: new Uint8Array(32),
          positionNullifier: new Uint8Array(32),
          payoutCommitment: new Uint8Array(32),
          grossPayout: amount,
          netPayout: amount * 99n / 100n,
          // After fees
          signatures: ["pending_implementation"]
        };
        onProgress?.("confirming", 0);
        await sync(ballot.tokenMint, true);
        setState({ isClaiming: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : "Claim failed";
        setState({ isClaiming: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );
  const reset = (0, import_react20.useCallback)(() => {
    setState({ isClaiming: false, error: null, result: null });
  }, []);
  return {
    ...state,
    claim,
    reset
  };
}
function usePayoutPreview(ballot, voteChoice, weight) {
  return (0, import_react20.useMemo)(() => {
    if (!ballot || !ballot.hasOutcome || voteChoice !== ballot.outcome) {
      return null;
    }
    const winnerWeight = toBigInt(ballot.winnerWeight);
    if (winnerWeight === 0n) {
      return null;
    }
    const totalPool = toBigInt(ballot.poolBalance);
    const userWeight = toBigInt(weight);
    const grossPayout = userWeight * totalPool / winnerWeight;
    const feeAmount = grossPayout * BigInt(ballot.protocolFeeBps) / 10000n;
    const netPayout = grossPayout - feeAmount;
    const multiplier = userWeight > 0n ? Number(grossPayout * 1000n / userWeight) / 1e3 : 0;
    return {
      grossPayout,
      netPayout,
      multiplier
    };
  }, [ballot, voteChoice, weight]);
}
function useVoteValidation(ballot, note, voteChoice) {
  return (0, import_react20.useMemo)(() => {
    if (!ballot) {
      return { isValid: false, error: "Ballot not loaded" };
    }
    if (!note) {
      return { isValid: false, error: "No note selected" };
    }
    if (voteChoice < 0 || voteChoice >= ballot.numOptions) {
      return { isValid: false, error: `Vote choice must be 0-${ballot.numOptions - 1}` };
    }
    if (ballot.status !== 1) {
      return { isValid: false, error: "Ballot is not active" };
    }
    if (!note.tokenMint.equals(ballot.tokenMint)) {
      return { isValid: false, error: "Note token does not match ballot token" };
    }
    if (note.amount <= 0n) {
      return { isValid: false, error: "Note has no balance" };
    }
    return { isValid: true, error: null, weight: note.amount };
  }, [ballot, note, voteChoice]);
}
function useCanClaim(ballot, voteChoice) {
  return (0, import_react20.useMemo)(() => {
    if (!ballot) {
      return { canClaim: false, reason: "Ballot not loaded" };
    }
    if (!ballot.hasOutcome) {
      return { canClaim: false, reason: "Ballot not resolved yet" };
    }
    if (voteChoice === null) {
      return { canClaim: false, reason: "No vote recorded" };
    }
    if (voteChoice !== ballot.outcome) {
      return { canClaim: false, reason: "Did not vote for winning option" };
    }
    if (ballot.bindingMode !== 1) {
      return { canClaim: false, reason: "Only spend-to-vote ballots have claims" };
    }
    const now = Math.floor(Date.now() / 1e3);
    if (now >= ballot.claimDeadline) {
      return { canClaim: false, reason: "Claim deadline passed" };
    }
    return { canClaim: true, reason: null };
  }, [ballot, voteChoice]);
}
function useResolveBallot() {
  const { client } = useCloakCraft();
  const [isResolving, setIsResolving] = (0, import_react20.useState)(false);
  const resolve = (0, import_react20.useCallback)(async (options) => {
    const { ballot, outcome, onProgress } = options;
    const program = client?.getProgram();
    if (!program) {
      throw new Error("Program not available");
    }
    setIsResolving(true);
    try {
      onProgress?.("building");
      const { buildResolveBallotInstruction } = await import("@cloakcraft/sdk");
      const { Transaction: Transaction2, ComputeBudgetProgram } = await import("@solana/web3.js");
      const payer = program.provider.wallet;
      const ix = await buildResolveBallotInstruction(
        program,
        ballot.ballotId,
        outcome ?? null,
        payer.publicKey,
        ballot.resolutionMode === 2 ? payer.publicKey : void 0
        // Authority mode needs resolver
      );
      const tx = new Transaction2();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }));
      tx.add(ix);
      onProgress?.("approving");
      const connection = program.provider.connection;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer.publicKey;
      const signed = await payer.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      onProgress?.("confirming");
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });
      return { signature };
    } finally {
      setIsResolving(false);
    }
  }, [client]);
  return { resolve, isResolving };
}
function useFinalizeBallot() {
  const { client } = useCloakCraft();
  const [isFinalizing, setIsFinalizing] = (0, import_react20.useState)(false);
  const finalize = (0, import_react20.useCallback)(async (options) => {
    const { ballot, onProgress } = options;
    const program = client?.getProgram();
    if (!program) {
      throw new Error("Program not available");
    }
    setIsFinalizing(true);
    try {
      onProgress?.("building");
      const { buildFinalizeBallotInstruction } = await import("@cloakcraft/sdk");
      const { Transaction: Transaction2, ComputeBudgetProgram } = await import("@solana/web3.js");
      const payer = program.provider.wallet;
      const ix = await buildFinalizeBallotInstruction(
        program,
        ballot.ballotId,
        ballot.tokenMint,
        ballot.protocolTreasury,
        payer.publicKey
      );
      const tx = new Transaction2();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 2e5 }));
      tx.add(ix);
      onProgress?.("approving");
      const connection = program.provider.connection;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer.publicKey;
      const signed = await payer.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      onProgress?.("confirming");
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });
      return { signature };
    } finally {
      setIsFinalizing(false);
    }
  }, [client]);
  return { finalize, isFinalizing };
}
function useDecryptTally() {
  const { client } = useCloakCraft();
  const [isDecrypting, setIsDecrypting] = (0, import_react20.useState)(false);
  const decrypt = (0, import_react20.useCallback)(async (options) => {
    const { ballot, decryptionKey, onProgress } = options;
    const program = client?.getProgram();
    if (!program) {
      throw new Error("Program not available");
    }
    setIsDecrypting(true);
    try {
      onProgress?.("building");
      const { buildDecryptTallyInstruction } = await import("@cloakcraft/sdk");
      const { Transaction: Transaction2, ComputeBudgetProgram } = await import("@solana/web3.js");
      const payer = program.provider.wallet;
      const ix = await buildDecryptTallyInstruction(
        program,
        ballot.ballotId,
        decryptionKey,
        payer.publicKey
      );
      const tx = new Transaction2();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 3e5 }));
      tx.add(ix);
      onProgress?.("approving");
      const connection = program.provider.connection;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer.publicKey;
      const signed = await payer.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());
      onProgress?.("confirming");
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      });
      return { signature };
    } finally {
      setIsDecrypting(false);
    }
  }, [client]);
  return { decrypt, isDecrypting };
}
function useIsBallotAuthority(ballot, walletPubkey) {
  return (0, import_react20.useMemo)(() => {
    if (!ballot || !walletPubkey) return false;
    return ballot.authority.equals(walletPubkey);
  }, [ballot, walletPubkey]);
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
  useActiveBallots,
  useAddLiquidity,
  useAllBalances,
  useAmmPools,
  useAutoConsolidation,
  useBalance,
  useBallot,
  useBallotTally,
  useBallotTimeStatus,
  useBallots,
  useCanClaim,
  useChangeVote,
  useClaim,
  useCloakCraft,
  useClosePosition,
  useCloseVotePosition,
  useConsolidation,
  useDecryptTally,
  useFinalizeBallot,
  useFragmentationScore,
  useImpermanentLoss,
  useInitializeAmmPool,
  useInitializePool,
  useIsBallotAuthority,
  useIsConsolidationRecommended,
  useIsFreeOperation,
  useKeeperMonitor,
  useLiquidate,
  useLiquidationPrice,
  useLpMintPreview,
  useLpValue,
  useNoteSelection,
  useNoteSelector,
  useNotes,
  useNullifierStatus,
  useOpenPosition,
  useOrders,
  usePayoutPreview,
  usePerpsAddLiquidity,
  usePerpsMarkets,
  usePerpsPool,
  usePerpsPools,
  usePerpsPositions,
  usePerpsRemoveLiquidity,
  usePool,
  usePoolAnalytics,
  usePoolList,
  usePoolStats,
  usePortfolioValue,
  usePositionPnL,
  usePositionValidation,
  usePrivateBalance,
  useProtocolFees,
  usePublicBalance,
  usePythPrice,
  usePythPrices,
  useRecentTransactions,
  useRemoveLiquidity,
  useResolveBallot,
  useScanner,
  useShield,
  useShouldConsolidate,
  useSolBalance,
  useSolPrice,
  useSwap,
  useSwapQuote,
  useTokenBalances,
  useTokenPrice,
  useTokenPrices,
  useTokenUtilization,
  useTransactionHistory,
  useTransfer,
  useUnshield,
  useUserPosition,
  useVoteSnapshot,
  useVoteSpend,
  useVoteValidation,
  useWallet,
  useWithdrawPreview
});
