// src/provider.tsx
import { createContext, useContext, useMemo, useState, useCallback, useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { CloakCraftClient, initPoseidon } from "@cloakcraft/sdk";
import { jsx } from "react/jsx-runtime";
var CloakCraftContext = createContext(null);
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
  const [wallet, setWallet] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProverReady, setIsProverReady] = useState(false);
  const [isProgramReady, setIsProgramReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState(null);
  const syncLockRef = useRef(false);
  const hasAutoSyncedRef = useRef(false);
  const syncRef = useRef(null);
  const STORAGE_KEY = solanaWalletPubkey ? `cloakcraft_spending_key_${solanaWalletPubkey}` : "cloakcraft_spending_key";
  const prevWalletPubkeyRef = useRef(void 0);
  useEffect(() => {
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
  const client = useMemo(
    () => new CloakCraftClient({
      // Use connection if provided (matches scalecraft pattern), otherwise use rpcUrl
      connection,
      rpcUrl,
      indexerUrl,
      programId: new PublicKey(programId),
      heliusApiKey,
      network,
      circuitsBaseUrl: "/circom",
      // Circom circuits in /public/circom/
      addressLookupTables: addressLookupTables?.map((addr) => new PublicKey(addr))
    }),
    [connection, rpcUrl, indexerUrl, programId, heliusApiKey, network, addressLookupTables]
  );
  useEffect(() => {
    if (autoInitialize && !isInitialized && !isInitializing) {
      setIsInitializing(true);
      initPoseidon().then(() => {
        setIsInitialized(true);
        setError(null);
      }).catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to initialize");
      }).finally(() => {
        setIsInitializing(false);
      });
    }
  }, [autoInitialize, isInitialized, isInitializing]);
  useEffect(() => {
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
  useEffect(() => {
    if (wallet && isProgramReady && !hasAutoSyncedRef.current && !syncLockRef.current && syncRef.current) {
      hasAutoSyncedRef.current = true;
      console.log("[CloakCraft] Auto-syncing notes on wallet connect...");
      syncRef.current().catch((err) => {
        console.error("[CloakCraft] Auto-sync failed:", err);
        hasAutoSyncedRef.current = false;
      });
    }
  }, [wallet, isProgramReady]);
  useEffect(() => {
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
  const connect = useCallback(
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
  const disconnect = useCallback(() => {
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
  const sync = useCallback(async (tokenMint, clearCache = false) => {
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
  useEffect(() => {
    syncRef.current = sync;
  }, [sync]);
  const createWallet = useCallback(() => {
    return client.createWallet();
  }, [client]);
  const setProgram = useCallback((program) => {
    client.setProgram(program);
    setIsProgramReady(true);
  }, [client]);
  const setAnchorWallet = useCallback((anchorWallet) => {
    client.setWallet(anchorWallet);
    setIsProgramReady(true);
  }, [client]);
  const initializeProver = useCallback(async (circuits) => {
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
import { useCallback as useCallback2, useMemo as useMemo2, useState as useState2 } from "react";
function useWallet() {
  const { wallet, isConnected, isInitialized, isInitializing, connect, disconnect, createWallet, error } = useCloakCraft();
  const [isConnecting, setIsConnecting] = useState2(false);
  const [connectError, setConnectError] = useState2(null);
  const importFromSeed = useCallback2(
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
  const importFromKey = useCallback2(
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
  const createAndConnect = useCallback2(async () => {
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
  const deriveFromSignature = useCallback2(async (signature) => {
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
import { useState as useState3, useEffect as useEffect2, useCallback as useCallback3 } from "react";
function useBalance(tokenMint) {
  const { client, wallet, notes } = useCloakCraft();
  const [balance, setBalance] = useState3(0n);
  const [isLoading, setIsLoading] = useState3(false);
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
  useEffect2(() => {
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
  const [balances, setBalances] = useState3([]);
  const [isLoading, setIsLoading] = useState3(false);
  const refresh = useCallback3(async () => {
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
  useEffect2(() => {
    refresh();
  }, [refresh]);
  return {
    balances,
    isLoading,
    refresh
  };
}

// src/useNotes.ts
import { useState as useState4, useCallback as useCallback4, useMemo as useMemo3 } from "react";
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
function useNoteSelection(tokenMint) {
  const { notes } = useNotes(tokenMint);
  const [selectedNotes, setSelectedNotes] = useState4([]);
  const toggleNote = useCallback4((note) => {
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
  const selectAll = useCallback4(() => {
    setSelectedNotes(notes);
  }, [notes]);
  const clearSelection = useCallback4(() => {
    setSelectedNotes([]);
  }, []);
  const selectedAmount = useMemo3(() => {
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
import { useState as useState5, useCallback as useCallback5 } from "react";
import { generateStealthAddress } from "@cloakcraft/sdk";
function useShield() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState5({
    isShielding: false,
    error: null,
    result: null
  });
  const shield = useCallback5(
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
        const { stealthAddress } = generateStealthAddress(recipientPubkey);
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
import { useState as useState6, useCallback as useCallback6, useMemo as useMemo4 } from "react";
import { SmartNoteSelector } from "@cloakcraft/sdk";
function useTransfer() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState6({
    isTransferring: false,
    error: null,
    result: null
  });
  const transfer = useCallback6(
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
  const reset = useCallback6(() => {
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
  const [selected, setSelected] = useState6([]);
  const selector = useMemo4(() => new SmartNoteSelector(), []);
  const availableNotes = useMemo4(
    () => notes.filter((note) => note.tokenMint && note.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  const selectNotesForAmount = useCallback6(
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
  const getSelectionResult = useCallback6(
    (targetAmount, options) => {
      return selector.selectNotes(availableNotes, targetAmount, {
        strategy: options?.strategy ?? "smallest-first",
        maxInputs: options?.maxInputs ?? 2,
        feeAmount: options?.feeAmount
      });
    },
    [availableNotes, selector]
  );
  const clearSelection = useCallback6(() => {
    setSelected([]);
  }, []);
  const fragmentation = useMemo4(
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
import { useState as useState7, useCallback as useCallback7 } from "react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
function useUnshield() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState7({
    isUnshielding: false,
    error: null,
    result: null
  });
  const unshield = useCallback7(
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
          recipientTokenAccount = getAssociatedTokenAddressSync(
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
  const reset = useCallback7(() => {
    setState({ isUnshielding: false, error: null, result: null });
  }, []);
  return {
    ...state,
    unshield,
    reset
  };
}

// src/useScanner.ts
import { useState as useState8, useCallback as useCallback8, useEffect as useEffect3, useRef as useRef2, useMemo as useMemo5 } from "react";
function useDebounce(fn, delayMs) {
  const timeoutRef = useRef2(null);
  const fnRef = useRef2(fn);
  fnRef.current = fn;
  return useCallback8(
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
  const [balance, setBalance] = useState8(0n);
  const [noteCount, setNoteCount] = useState8(0);
  const [isLoading, setIsLoading] = useState8(false);
  const [error, setError] = useState8(null);
  const refresh = useCallback8(async () => {
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
  useEffect3(() => {
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
  const [state, setState] = useState8({
    isScanning: false,
    lastScanned: null,
    error: null
  });
  const [stats, setStats] = useState8(null);
  const intervalRef = useRef2(null);
  const isScanningRef = useRef2(false);
  const scanImpl = useCallback8(async () => {
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
  useEffect3(() => {
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
  const filteredNotes = useMemo5(() => {
    return tokenMint ? notes.filter((n) => n.tokenMint && n.tokenMint.equals(tokenMint)) : notes;
  }, [notes, tokenMint]);
  const totalAmount = useMemo5(() => {
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
  const [isSpent, setIsSpent] = useState8(null);
  const [isChecking, setIsChecking] = useState8(false);
  const [error, setError] = useState8(null);
  const check = useCallback8(async () => {
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
  useEffect3(() => {
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
import { useState as useState9, useCallback as useCallback9, useEffect as useEffect4 } from "react";
import { PublicKey as PublicKey2 } from "@solana/web3.js";
function usePool(tokenMint) {
  const { client } = useCloakCraft();
  const [pool, setPool] = useState9(null);
  const [isLoading, setIsLoading] = useState9(false);
  const [error, setError] = useState9(null);
  const refresh = useCallback9(async () => {
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
  useEffect4(() => {
    refresh();
  }, [refresh]);
  const poolPda = tokenMint && client ? PublicKey2.findProgramAddressSync(
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
  const [state, setState] = useState9({
    isInitializing: false,
    error: null,
    result: null
  });
  const initializePool = useCallback9(
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
  const initializePoolWithWallet = useCallback9(
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
  const reset = useCallback9(() => {
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
  const [pools, setPools] = useState9([]);
  const [isLoading, setIsLoading] = useState9(false);
  const [error, setError] = useState9(null);
  const addPool = useCallback9((tokenMint) => {
    if (!client) return;
    const [poolPda] = PublicKey2.findProgramAddressSync(
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
  const removePool = useCallback9((tokenMint) => {
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
import { useState as useState10, useCallback as useCallback10, useEffect as useEffect5, useMemo as useMemo6 } from "react";
import { getAssociatedTokenAddressSync as getAssociatedTokenAddressSync2 } from "@solana/spl-token";
function usePublicBalance(tokenMint, owner) {
  const { client } = useCloakCraft();
  const [state, setState] = useState10({
    balance: 0n,
    tokenAccount: null,
    isLoading: false,
    error: null
  });
  const refresh = useCallback10(async () => {
    if (!client || !tokenMint || !owner) {
      setState((s) => ({ ...s, balance: 0n, tokenAccount: null }));
      return;
    }
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const tokenAccount = getAssociatedTokenAddressSync2(tokenMint, owner);
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
  useEffect5(() => {
    refresh();
  }, [refresh]);
  return {
    ...state,
    refresh
  };
}
function useSolBalance(owner) {
  const { client } = useCloakCraft();
  const [balance, setBalance] = useState10(0n);
  const [isLoading, setIsLoading] = useState10(false);
  const [error, setError] = useState10(null);
  const refresh = useCallback10(async () => {
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
  useEffect5(() => {
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
  const [balances, setBalances] = useState10(/* @__PURE__ */ new Map());
  const [isLoading, setIsLoading] = useState10(false);
  const [error, setError] = useState10(null);
  const mintsKey = useMemo6(
    () => tokenMints.map((m) => m.toBase58()).join(","),
    [tokenMints]
  );
  const refresh = useCallback10(async () => {
    if (!client || !owner || tokenMints.length === 0) {
      setBalances(/* @__PURE__ */ new Map());
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const newBalances = /* @__PURE__ */ new Map();
      const tokenAccounts = tokenMints.map((mint) => getAssociatedTokenAddressSync2(mint, owner));
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
  useEffect5(() => {
    refresh();
  }, [refresh]);
  const getBalance = useCallback10(
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
import { useState as useState11, useCallback as useCallback11, useEffect as useEffect6 } from "react";
function useOrders() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = useState11({
    orders: [],
    isLoading: false,
    error: null
  });
  const fetchOrders = useCallback11(async () => {
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
  useEffect6(() => {
    fetchOrders();
  }, [fetchOrders]);
  return {
    ...state,
    refresh: fetchOrders
  };
}

// src/useSwap.ts
import { useState as useState12, useCallback as useCallback12, useEffect as useEffect7 } from "react";
import {
  calculateSwapOutputUnified,
  calculateMinOutput,
  calculateAddLiquidityAmounts,
  calculateRemoveLiquidityOutput,
  generateStealthAddress as generateStealthAddress2,
  computeAmmStateHash,
  PoolType
} from "@cloakcraft/sdk";
function useSwap() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState12({
    isSwapping: false,
    error: null,
    result: null
  });
  const swap = useCallback12(
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
        const poolType = pool.poolType ?? PoolType.ConstantProduct;
        const amplification = pool.amplification ?? 0n;
        const { outputAmount } = calculateSwapOutputUnified(
          swapAmount,
          reserveIn,
          reserveOut,
          poolType,
          pool.feeBps,
          amplification
        );
        const minOutput = calculateMinOutput(outputAmount, slippageBps);
        const outputTokenMint = swapDirection === "aToB" ? pool.tokenBMint : pool.tokenAMint;
        const { stealthAddress: outputRecipient } = generateStealthAddress2(wallet.publicKey);
        const { stealthAddress: changeRecipient } = generateStealthAddress2(wallet.publicKey);
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
  const reset = useCallback12(() => {
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
  const [pools, setPools] = useState12([]);
  const [isLoading, setIsLoading] = useState12(false);
  const [error, setError] = useState12(null);
  const refresh = useCallback12(async () => {
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
  useEffect7(() => {
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
  const [quote, setQuote] = useState12(null);
  useEffect7(() => {
    if (!pool || inputAmount <= 0n) {
      setQuote(null);
      return;
    }
    try {
      const reserveIn = swapDirection === "aToB" ? pool.reserveA : pool.reserveB;
      const reserveOut = swapDirection === "aToB" ? pool.reserveB : pool.reserveA;
      const poolType = pool.poolType ?? PoolType.ConstantProduct;
      const amplification = pool.amplification ?? 0n;
      const { outputAmount, priceImpact } = calculateSwapOutputUnified(
        inputAmount,
        reserveIn,
        reserveOut,
        poolType,
        pool.feeBps,
        amplification
      );
      const minOutput = calculateMinOutput(outputAmount, 50);
      setQuote({ outputAmount, minOutput, priceImpact });
    } catch {
      setQuote(null);
    }
  }, [pool, swapDirection, inputAmount]);
  return quote;
}
function useInitializeAmmPool() {
  const { client } = useCloakCraft();
  const [state, setState] = useState12({
    isInitializing: false,
    error: null,
    result: null
  });
  const initializePool = useCallback12(
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
  const reset = useCallback12(() => {
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
  const [state, setState] = useState12({
    isAdding: false,
    error: null,
    result: null
  });
  const addLiquidity = useCallback12(
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
        const { depositA, depositB, lpAmount } = calculateAddLiquidityAmounts(
          amountA,
          amountB,
          pool.reserveA,
          pool.reserveB,
          pool.lpSupply
        );
        const minLpAmount = lpAmount * BigInt(1e4 - slippageBps) / 10000n;
        const { stealthAddress: lpRecipient } = generateStealthAddress2(wallet.publicKey);
        const { stealthAddress: changeARecipient } = generateStealthAddress2(wallet.publicKey);
        const { stealthAddress: changeBRecipient } = generateStealthAddress2(wallet.publicKey);
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
  const reset = useCallback12(() => {
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
  const [state, setState] = useState12({
    isRemoving: false,
    error: null,
    result: null
  });
  const removeLiquidity = useCallback12(
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
        const { outputA, outputB } = calculateRemoveLiquidityOutput(
          lpAmount,
          pool.lpSupply,
          pool.reserveA,
          pool.reserveB
        );
        const { stealthAddress: outputARecipient } = generateStealthAddress2(wallet.publicKey);
        const { stealthAddress: outputBRecipient } = generateStealthAddress2(wallet.publicKey);
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
        const oldPoolStateHash = computeAmmStateHash(
          pool.reserveA,
          pool.reserveB,
          pool.lpSupply,
          pool.poolId
        );
        const newReserveA = pool.reserveA - outputA;
        const newReserveB = pool.reserveB - outputB;
        const newLpSupply = pool.lpSupply - lpAmount;
        const newPoolStateHash = computeAmmStateHash(
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
  const reset = useCallback12(() => {
    setState({ isRemoving: false, error: null, result: null });
  }, []);
  return {
    ...state,
    removeLiquidity,
    reset
  };
}

// src/useTransactionHistory.ts
import { useState as useState13, useEffect as useEffect8, useCallback as useCallback13, useMemo as useMemo7, useRef as useRef3 } from "react";
import {
  TransactionHistory,
  TransactionStatus,
  createPendingTransaction
} from "@cloakcraft/sdk";
import { TransactionType as TransactionType2, TransactionStatus as TransactionStatus2 } from "@cloakcraft/sdk";
function useTransactionHistory(filter) {
  const { wallet } = useCloakCraft();
  const [transactions, setTransactions] = useState13([]);
  const [isLoading, setIsLoading] = useState13(true);
  const [error, setError] = useState13(null);
  const [history, setHistory] = useState13(null);
  const filterKey = useMemo7(
    () => JSON.stringify(filter ?? {}),
    [filter?.type, filter?.status, filter?.limit, filter?.tokenMint, filter?.after?.getTime(), filter?.before?.getTime()]
  );
  const filterRef = useRef3(filter);
  filterRef.current = filter;
  useEffect8(() => {
    if (!wallet?.publicKey) {
      setHistory(null);
      setTransactions([]);
      setIsLoading(false);
      return;
    }
    const initHistory = async () => {
      try {
        const walletId = Buffer.from(wallet.publicKey.x).toString("hex");
        const historyManager = new TransactionHistory(walletId);
        await historyManager.initialize();
        setHistory(historyManager);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to initialize history");
        setIsLoading(false);
      }
    };
    initHistory();
  }, [wallet]);
  useEffect8(() => {
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
  const refresh = useCallback13(async () => {
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
  const addTransaction = useCallback13(
    async (type, tokenMint, amount, options) => {
      if (!history) return null;
      try {
        const pending = createPendingTransaction(type, tokenMint, amount, options);
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
  const updateTransaction = useCallback13(
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
  const confirmTransaction = useCallback13(
    async (id, signature) => {
      return updateTransaction(id, {
        status: TransactionStatus.CONFIRMED,
        signature
      });
    },
    [updateTransaction]
  );
  const failTransaction = useCallback13(
    async (id, errorMsg) => {
      return updateTransaction(id, {
        status: TransactionStatus.FAILED,
        error: errorMsg
      });
    },
    [updateTransaction]
  );
  const clearHistory = useCallback13(async () => {
    if (!history) return;
    try {
      await history.clearHistory();
      setTransactions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear history");
    }
  }, [history]);
  const summary = useMemo7(() => {
    let pending = 0;
    let confirmed = 0;
    let failed = 0;
    for (const tx of transactions) {
      switch (tx.status) {
        case TransactionStatus.PENDING:
          pending++;
          break;
        case TransactionStatus.CONFIRMED:
          confirmed++;
          break;
        case TransactionStatus.FAILED:
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
import { useState as useState14, useEffect as useEffect9, useCallback as useCallback14, useMemo as useMemo8, useRef as useRef4 } from "react";
import {
  TokenPriceFetcher
} from "@cloakcraft/sdk";
import { formatPrice as formatPrice2, formatPriceChange as formatPriceChange2 } from "@cloakcraft/sdk";
var sharedPriceFetcher = null;
function getPriceFetcher() {
  if (!sharedPriceFetcher) {
    sharedPriceFetcher = new TokenPriceFetcher();
  }
  return sharedPriceFetcher;
}
function useTokenPrices(mints, refreshInterval) {
  const [prices, setPrices] = useState14(/* @__PURE__ */ new Map());
  const [isLoading, setIsLoading] = useState14(true);
  const [error, setError] = useState14(null);
  const [lastUpdated, setLastUpdated] = useState14(null);
  const [isAvailable, setIsAvailable] = useState14(true);
  const fetcher = useRef4(getPriceFetcher());
  const mintStrings = useMemo8(
    () => mints.map((m) => typeof m === "string" ? m : m.toBase58()),
    [mints]
  );
  const fetchPrices = useCallback14(async () => {
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
  const forceRetry = useCallback14(async () => {
    fetcher.current.resetBackoff();
    setIsAvailable(true);
    await fetchPrices();
  }, [fetchPrices]);
  useEffect9(() => {
    fetchPrices();
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(fetchPrices, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchPrices, refreshInterval]);
  const getPrice = useCallback14(
    (mint) => {
      const mintStr = typeof mint === "string" ? mint : mint.toBase58();
      return prices.get(mintStr);
    },
    [prices]
  );
  const getUsdValue = useCallback14(
    (mint, amount, decimals) => {
      const price = getPrice(mint);
      if (!price) return 0;
      const amountNumber = Number(amount) / Math.pow(10, decimals);
      return amountNumber * price.priceUsd;
    },
    [getPrice]
  );
  const solPrice = useMemo8(() => {
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
  const mints = useMemo8(
    () => mint ? [mint] : [],
    [mint]
  );
  const { prices, isLoading, error, refresh } = useTokenPrices(mints);
  const price = useMemo8(() => {
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
  const mints = useMemo8(
    () => balances.map((b) => b.mint),
    [balances]
  );
  const { prices, isLoading, error } = useTokenPrices(mints);
  const totalValue = useMemo8(() => {
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
  const breakdown = useMemo8(() => {
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
import { useState as useState15, useEffect as useEffect10, useCallback as useCallback15, useMemo as useMemo9, useRef as useRef5 } from "react";
import {
  PoolAnalyticsCalculator,
  formatTvl
} from "@cloakcraft/sdk";
import { formatTvl as formatTvl2, formatApy as formatApy2, formatShare as formatShare2 } from "@cloakcraft/sdk";
var sharedCalculator = null;
function getCalculator() {
  if (!sharedCalculator) {
    sharedCalculator = new PoolAnalyticsCalculator();
  }
  return sharedCalculator;
}
function usePoolAnalytics(decimalsMap, refreshInterval) {
  const { pools, isLoading: poolsLoading, refresh: refreshPools } = useAmmPools();
  const [analytics, setAnalytics] = useState15(null);
  const [isLoading, setIsLoading] = useState15(true);
  const [error, setError] = useState15(null);
  const [lastUpdated, setLastUpdated] = useState15(null);
  const calculator = useRef5(getCalculator());
  const calculateAnalytics = useCallback15(async () => {
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
  useEffect10(() => {
    if (!poolsLoading) {
      calculateAnalytics();
    }
  }, [pools, poolsLoading, calculateAnalytics]);
  useEffect10(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(() => {
        refreshPools();
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshPools]);
  const refresh = useCallback15(async () => {
    await refreshPools();
    await calculateAnalytics();
  }, [refreshPools, calculateAnalytics]);
  return {
    analytics,
    totalTvl: analytics?.totalTvlUsd ?? 0,
    formattedTvl: formatTvl(analytics?.totalTvlUsd ?? 0),
    poolCount: analytics?.poolCount ?? 0,
    poolStats: analytics?.pools ?? [],
    isLoading: isLoading || poolsLoading,
    error,
    refresh,
    lastUpdated
  };
}
function usePoolStats(pool, tokenADecimals = 9, tokenBDecimals = 9) {
  const [stats, setStats] = useState15(null);
  const [isLoading, setIsLoading] = useState15(true);
  const [error, setError] = useState15(null);
  const calculator = useRef5(getCalculator());
  const calculateStats = useCallback15(async () => {
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
  useEffect10(() => {
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
  const [position, setPosition] = useState15(null);
  const [isLoading, setIsLoading] = useState15(true);
  const [error, setError] = useState15(null);
  const calculator = useRef5(getCalculator());
  const calculatePosition = useCallback15(async () => {
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
  useEffect10(() => {
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
  const calculator = useRef5(getCalculator());
  const impermanentLoss = useMemo9(() => {
    return calculator.current.calculateImpermanentLoss(
      initialPriceRatio,
      currentPriceRatio
    );
  }, [initialPriceRatio, currentPriceRatio]);
  const formattedLoss = useMemo9(() => {
    return `${impermanentLoss.toFixed(2)}%`;
  }, [impermanentLoss]);
  return {
    impermanentLoss,
    formattedLoss
  };
}

// src/useConsolidation.ts
import { useState as useState16, useCallback as useCallback16, useMemo as useMemo10, useRef as useRef6 } from "react";
import {
  ConsolidationService
} from "@cloakcraft/sdk";
function useConsolidation(options) {
  const { notes, sync, client, wallet, isProverReady } = useCloakCraft();
  const { tokenMint, dustThreshold = 1000n, maxNotesPerBatch = 3 } = options;
  const [state, setState] = useState16({
    isAnalyzing: false,
    isConsolidating: false,
    currentBatch: 0,
    totalBatches: 0,
    error: null
  });
  const isConsolidatingRef = useRef6(false);
  const service = useMemo10(
    () => new ConsolidationService(dustThreshold),
    [dustThreshold]
  );
  const tokenNotes = useMemo10(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  const fragmentationReport = useMemo10(
    () => service.analyzeNotes(tokenNotes),
    [service, tokenNotes]
  );
  const suggestions = useMemo10(
    () => service.suggestConsolidation(tokenNotes, { maxNotesPerBatch }),
    [service, tokenNotes, maxNotesPerBatch]
  );
  const consolidationPlan = useMemo10(
    () => service.planConsolidation(tokenNotes, { maxNotesPerBatch }),
    [service, tokenNotes, maxNotesPerBatch]
  );
  const summary = useMemo10(
    () => service.getConsolidationSummary(tokenNotes),
    [service, tokenNotes]
  );
  const consolidate = useCallback16(async (onProgress, targetAmount, maxInputs = 2) => {
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
  const consolidateBatch = useCallback16(async (batchIndex) => {
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
  const estimatedCost = useMemo10(() => {
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
  const service = useMemo10(() => new ConsolidationService(), []);
  return useMemo10(() => {
    const tokenNotes = notes.filter((n) => n.tokenMint.equals(tokenMint));
    return service.shouldConsolidate(tokenNotes);
  }, [notes, tokenMint, service]);
}
function useFragmentationScore(tokenMint) {
  const { notes } = useCloakCraft();
  const service = useMemo10(() => new ConsolidationService(), []);
  return useMemo10(() => {
    const tokenNotes = notes.filter((n) => n.tokenMint.equals(tokenMint));
    const report = service.analyzeNotes(tokenNotes);
    return report.fragmentationScore;
  }, [notes, tokenMint, service]);
}

// src/useAutoConsolidation.ts
import { useState as useState17, useEffect as useEffect11, useCallback as useCallback17, useMemo as useMemo11 } from "react";
import {
  AutoConsolidator
} from "@cloakcraft/sdk";
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
  const tokenNotes = useMemo11(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  const [consolidator] = useState17(() => new AutoConsolidator({
    enabled: initialEnabled,
    fragmentationThreshold,
    maxNoteCount,
    maxDustNotes,
    dustThreshold,
    checkIntervalMs
  }));
  const [state, setState] = useState17(
    consolidator.getState()
  );
  const [estimatedCost, setEstimatedCost] = useState17(0n);
  useEffect11(() => {
    consolidator.setNoteProvider(() => tokenNotes);
  }, [consolidator, tokenNotes]);
  useEffect11(() => {
    consolidator.updateConfig({
      onConsolidationRecommended: () => {
        setState(consolidator.getState());
      }
    });
  }, [consolidator]);
  useEffect11(() => {
    const interval = setInterval(() => {
      setState(consolidator.getState());
      setEstimatedCost(consolidator.estimateCost());
    }, 5e3);
    return () => clearInterval(interval);
  }, [consolidator]);
  const enable = useCallback17(() => {
    consolidator.start();
    setState(consolidator.getState());
  }, [consolidator]);
  const disable = useCallback17(() => {
    consolidator.stop();
    setState(consolidator.getState());
  }, [consolidator]);
  const toggle = useCallback17(() => {
    if (consolidator.getState().enabled) {
      consolidator.stop();
    } else {
      consolidator.start();
    }
    setState(consolidator.getState());
  }, [consolidator]);
  const checkNow = useCallback17(() => {
    consolidator.check();
    setState(consolidator.getState());
    setEstimatedCost(consolidator.estimateCost());
  }, [consolidator]);
  useEffect11(() => {
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
  const [consolidator] = useState17(() => new AutoConsolidator());
  const tokenNotes = useMemo11(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  useEffect11(() => {
    consolidator.setNoteProvider(() => tokenNotes);
  }, [consolidator, tokenNotes]);
  const [isRecommended, setIsRecommended] = useState17(false);
  useEffect11(() => {
    consolidator.check();
    setIsRecommended(consolidator.isConsolidationRecommended());
  }, [consolidator, tokenNotes]);
  return isRecommended;
}

// src/useProtocolFees.ts
import { useState as useState18, useEffect as useEffect12, useCallback as useCallback18, useMemo as useMemo12 } from "react";
import { PublicKey as PublicKey3 } from "@solana/web3.js";
import { deriveProtocolConfigPda, PROGRAM_ID } from "@cloakcraft/sdk";
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
  const [config, setConfig] = useState18(null);
  const [isLoading, setIsLoading] = useState18(true);
  const [error, setError] = useState18(null);
  const fetchConfig = useCallback18(async () => {
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
      const [configPda] = deriveProtocolConfigPda(PROGRAM_ID);
      const accountInfo = await program.provider.connection.getAccountInfo(configPda);
      if (!accountInfo) {
        console.log("[useProtocolFees] Protocol config not found, using defaults");
        setConfig(null);
        setIsLoading(false);
        return;
      }
      const data = accountInfo.data;
      const authority = new PublicKey3(data.subarray(8, 40));
      const treasury = new PublicKey3(data.subarray(40, 72));
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
  useEffect12(() => {
    fetchConfig();
  }, [fetchConfig]);
  const calculateFee = useCallback18(
    (amount, operation) => {
      const cfg = config ?? {
        ...DEFAULT_FEES,
        authority: PublicKey3.default,
        treasury: PublicKey3.default
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
  return useMemo12(() => {
    const freeOperations = ["shield", "add_liquidity", "consolidate"];
    return freeOperations.includes(operation);
  }, [operation]);
}

// src/usePerps.ts
import { useState as useState19, useCallback as useCallback19, useEffect as useEffect13, useMemo as useMemo13 } from "react";
import {
  generateStealthAddress as generateStealthAddress3,
  calculatePnL,
  calculateLiquidationPrice,
  calculateLpValue,
  calculateLpMintAmount,
  calculateWithdrawAmount,
  calculateMaxWithdrawable,
  calculateUtilization,
  calculateBorrowRate,
  isValidLeverage,
  wouldExceedUtilization,
  fetchPythPriceUsd,
  getFeedIdBySymbol
} from "@cloakcraft/sdk";
function usePerpsPools() {
  const { client } = useCloakCraft();
  const [pools, setPools] = useState19([]);
  const [isLoading, setIsLoading] = useState19(false);
  const [error, setError] = useState19(null);
  const refresh = useCallback19(async () => {
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
  useEffect13(() => {
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
  const [pool, setPool] = useState19(null);
  const [isLoading, setIsLoading] = useState19(false);
  const [error, setError] = useState19(null);
  const refresh = useCallback19(async () => {
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
  useEffect13(() => {
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
  const [markets, setMarkets] = useState19([]);
  const [isLoading, setIsLoading] = useState19(false);
  const [error, setError] = useState19(null);
  const refresh = useCallback19(async () => {
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
  useEffect13(() => {
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
  const [state, setState] = useState19({
    isOpening: false,
    error: null,
    result: null
  });
  const openPosition = useCallback19(
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
        if (!isValidLeverage(leverage, pool.maxLeverage)) {
          throw new Error(`Invalid leverage. Must be between 1 and ${pool.maxLeverage}`);
        }
        const positionSize = marginAmount * BigInt(leverage);
        const tokenIndex = direction === "long" ? market.quoteTokenIndex : market.baseTokenIndex;
        const token = pool.tokens[tokenIndex];
        if (token && wouldExceedUtilization(token, positionSize, pool.maxUtilizationBps)) {
          throw new Error("Position would exceed pool utilization limit");
        }
        const { stealthAddress: positionRecipient } = generateStealthAddress3(wallet.publicKey);
        const { stealthAddress: changeRecipient } = generateStealthAddress3(wallet.publicKey);
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
  const reset = useCallback19(() => {
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
  const [state, setState] = useState19({
    isClosing: false,
    error: null,
    result: null
  });
  const closePosition = useCallback19(
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
        const pnlResult = calculatePnL(position, oraclePrice, pool, currentTimestamp);
        const { stealthAddress: settlementRecipient } = generateStealthAddress3(wallet.publicKey);
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
  const reset = useCallback19(() => {
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
  const [state, setState] = useState19({
    isAdding: false,
    error: null,
    result: null
  });
  const addLiquidity = useCallback19(
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
        const lpAmount = calculateLpMintAmount(pool, depositAmount, tokenIndex, oraclePrices);
        const { stealthAddress: lpRecipient } = generateStealthAddress3(wallet.publicKey);
        const { stealthAddress: changeRecipient } = generateStealthAddress3(wallet.publicKey);
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
  const reset = useCallback19(() => {
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
  const [state, setState] = useState19({
    isRemoving: false,
    error: null,
    result: null
  });
  const removeLiquidity = useCallback19(
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
        const withdrawAmount = calculateWithdrawAmount(pool, lpAmount, tokenIndex, oraclePrices);
        const { maxAmount, utilizationAfter } = calculateMaxWithdrawable(
          pool,
          tokenIndex,
          lpAmount,
          oraclePrices
        );
        if (withdrawAmount > maxAmount) {
          throw new Error("Withdrawal would exceed available balance");
        }
        const { stealthAddress: withdrawRecipient } = generateStealthAddress3(wallet.publicKey);
        const { stealthAddress: lpChangeRecipient } = generateStealthAddress3(wallet.publicKey);
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
  const reset = useCallback19(() => {
    setState({ isRemoving: false, error: null, result: null });
  }, []);
  return {
    ...state,
    removeLiquidity,
    reset
  };
}
function usePositionPnL(position, currentPrice, pool) {
  return useMemo13(() => {
    if (!position || !pool || currentPrice <= 0n) {
      return null;
    }
    try {
      const currentTimestamp = Math.floor(Date.now() / 1e3);
      return calculatePnL(position, currentPrice, pool, currentTimestamp);
    } catch {
      return null;
    }
  }, [position, currentPrice, pool]);
}
function useLiquidationPrice(position, pool) {
  return useMemo13(() => {
    if (!position || !pool) {
      return null;
    }
    try {
      const currentTimestamp = Math.floor(Date.now() / 1e3);
      return calculateLiquidationPrice(position, pool, currentTimestamp);
    } catch {
      return null;
    }
  }, [position, pool]);
}
function useLpValue(pool, oraclePrices) {
  return useMemo13(() => {
    if (!pool || oraclePrices.length === 0) {
      return null;
    }
    try {
      return calculateLpValue(pool, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, oraclePrices]);
}
function useLpMintPreview(pool, depositAmount, tokenIndex, oraclePrices) {
  return useMemo13(() => {
    if (!pool || depositAmount <= 0n || oraclePrices.length === 0) {
      return null;
    }
    try {
      return calculateLpMintAmount(pool, depositAmount, tokenIndex, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, depositAmount, tokenIndex, oraclePrices]);
}
function useWithdrawPreview(pool, lpAmount, tokenIndex, oraclePrices) {
  return useMemo13(() => {
    if (!pool || lpAmount <= 0n || oraclePrices.length === 0) {
      return null;
    }
    try {
      return calculateMaxWithdrawable(pool, tokenIndex, lpAmount, oraclePrices);
    } catch {
      return null;
    }
  }, [pool, lpAmount, tokenIndex, oraclePrices]);
}
function useTokenUtilization(pool) {
  return useMemo13(() => {
    if (!pool) {
      return [];
    }
    return pool.tokens.filter((t) => t?.isActive).map((token, index) => ({
      tokenIndex: index,
      mint: token.mint,
      utilization: calculateUtilization(token),
      borrowRate: calculateBorrowRate(
        calculateUtilization(token),
        pool.baseBorrowRateBps
      )
    }));
  }, [pool]);
}
function usePositionValidation(pool, market, marginAmount, leverage, direction) {
  return useMemo13(() => {
    if (!pool || !market) {
      return { isValid: false, error: "Pool or market not loaded" };
    }
    if (!isValidLeverage(leverage, pool.maxLeverage)) {
      return { isValid: false, error: `Leverage must be between 1 and ${pool.maxLeverage}` };
    }
    const positionSize = marginAmount * BigInt(leverage);
    const tokenIndex = direction === "long" ? market.quoteTokenIndex : market.baseTokenIndex;
    const token = pool.tokens[tokenIndex];
    if (!token?.isActive) {
      return { isValid: false, error: "Token not active" };
    }
    if (wouldExceedUtilization(token, positionSize, pool.maxUtilizationBps)) {
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
  const [positions, setPositions] = useState19([]);
  const [isLoading, setIsLoading] = useState19(false);
  const [error, setError] = useState19(null);
  const refresh = useCallback19(async () => {
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
  useEffect13(() => {
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
  const [price, setPrice] = useState19(null);
  const [isLoading, setIsLoading] = useState19(false);
  const [error, setError] = useState19(null);
  const refresh = useCallback19(async () => {
    if (!symbol) {
      setPrice(null);
      return;
    }
    const feedId = getFeedIdBySymbol(symbol);
    if (!feedId) {
      setError(`Unknown symbol: ${symbol}`);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const priceUsd = await fetchPythPriceUsd(feedId, 9);
      setPrice(priceUsd);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch price");
      setPrice(null);
    } finally {
      setIsLoading(false);
    }
  }, [symbol]);
  useEffect13(() => {
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
  const [prices, setPrices] = useState19(/* @__PURE__ */ new Map());
  const [isLoading, setIsLoading] = useState19(false);
  const [error, setError] = useState19(null);
  const refresh = useCallback19(async () => {
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
          const feedId = getFeedIdBySymbol(symbol);
          if (feedId) {
            const priceUsd = await fetchPythPriceUsd(feedId, 9);
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
  useEffect13(() => {
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
  const [liquidatable, setLiquidatable] = useState19([]);
  const [isChecking, setIsChecking] = useState19(false);
  const [lastCheck, setLastCheck] = useState19(0);
  const tokenSymbols = useMemo13(() => {
    if (!pool) return [];
    return pool.tokens.filter((t) => t.isActive).map((t) => {
      const mintStr = t.mint.toBase58();
      if (mintStr.includes("So1")) return "SOL";
      if (mintStr.includes("USDC") || mintStr.includes("EPj")) return "USDC";
      return "SOL";
    });
  }, [pool]);
  const { prices, refresh: refreshPrices } = usePythPrices(tokenSymbols, pollInterval);
  const checkPositions = useCallback19(async () => {
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
  useEffect13(() => {
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
  const [isLiquidating, setIsLiquidating] = useState19(false);
  const liquidate = useCallback19(async (options) => {
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
import { useState as useState20, useCallback as useCallback20, useEffect as useEffect14, useMemo as useMemo14 } from "react";
import { PublicKey as PublicKey4 } from "@solana/web3.js";
function useBallots() {
  const { client } = useCloakCraft();
  const [ballots, setBallots] = useState20([]);
  const [isLoading, setIsLoading] = useState20(false);
  const [error, setError] = useState20(null);
  const refresh = useCallback20(async () => {
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
  useEffect14(() => {
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
  const activeBallots = useMemo14(() => {
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
  const [ballot, setBallot] = useState20(null);
  const [isLoading, setIsLoading] = useState20(false);
  const [error, setError] = useState20(null);
  const address = useMemo14(() => {
    if (!ballotAddress) return null;
    if (typeof ballotAddress === "string") {
      try {
        return new PublicKey4(ballotAddress);
      } catch {
        return null;
      }
    }
    return ballotAddress;
  }, [ballotAddress]);
  const refresh = useCallback20(async () => {
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
  useEffect14(() => {
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
  return useMemo14(() => {
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
  const [now, setNow] = useState20(() => Math.floor(Date.now() / 1e3));
  useEffect14(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1e3));
    }, 1e3);
    return () => clearInterval(interval);
  }, []);
  return useMemo14(() => {
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
  const [state, setState] = useState20({
    isVoting: false,
    error: null,
    result: null
  });
  const vote = useCallback20(
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
  const reset = useCallback20(() => {
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
  const [state, setState] = useState20({
    isVoting: false,
    error: null,
    result: null
  });
  const vote = useCallback20(
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
  const reset = useCallback20(() => {
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
  const [state, setState] = useState20({
    isChanging: false,
    error: null,
    result: null
  });
  const changeVote = useCallback20(
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
  const reset = useCallback20(() => {
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
  const [state, setState] = useState20({
    isClosing: false,
    error: null,
    result: null
  });
  const closePosition = useCallback20(
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
  const reset = useCallback20(() => {
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
  const [state, setState] = useState20({
    isClaiming: false,
    error: null,
    result: null
  });
  const claim = useCallback20(
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
  const reset = useCallback20(() => {
    setState({ isClaiming: false, error: null, result: null });
  }, []);
  return {
    ...state,
    claim,
    reset
  };
}
function usePayoutPreview(ballot, voteChoice, weight) {
  return useMemo14(() => {
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
  return useMemo14(() => {
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
  return useMemo14(() => {
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
  const [isResolving, setIsResolving] = useState20(false);
  const resolve = useCallback20(async (options) => {
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
  const [isFinalizing, setIsFinalizing] = useState20(false);
  const finalize = useCallback20(async (options) => {
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
  const [isDecrypting, setIsDecrypting] = useState20(false);
  const decrypt = useCallback20(async (options) => {
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
  return useMemo14(() => {
    if (!ballot || !walletPubkey) return false;
    return ballot.authority.equals(walletPubkey);
  }, [ballot, walletPubkey]);
}
export {
  CloakCraftProvider,
  TransactionStatus2 as TransactionStatus,
  TransactionType2 as TransactionType,
  WALLET_DERIVATION_MESSAGE,
  formatApy2 as formatApy,
  formatPrice2 as formatPrice,
  formatPriceChange2 as formatPriceChange,
  formatShare2 as formatShare,
  formatTvl2 as formatTvl,
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
};
