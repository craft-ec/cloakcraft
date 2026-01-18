// src/provider.tsx
import { createContext, useContext, useMemo, useState, useCallback, useEffect } from "react";
import { PublicKey } from "@solana/web3.js";
import { CloakCraftClient, initPoseidon } from "@cloakcraft/sdk";
import { jsx } from "react/jsx-runtime";
var CloakCraftContext = createContext(null);
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
  const [wallet, setWallet] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProverReady, setIsProverReady] = useState(false);
  const [isProgramReady, setIsProgramReady] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [notes, setNotes] = useState([]);
  const [error, setError] = useState(null);
  const STORAGE_KEY = solanaWalletPubkey ? `cloakcraft_spending_key_${solanaWalletPubkey}` : "cloakcraft_spending_key";
  useEffect(() => {
    if (solanaWalletPubkey) {
      setWallet(null);
      setNotes([]);
      setIsProverReady(false);
    }
  }, [solanaWalletPubkey]);
  const client = useMemo(
    () => new CloakCraftClient({
      rpcUrl,
      indexerUrl,
      programId: new PublicKey(programId),
      heliusApiKey,
      network,
      circuitsBaseUrl: "/circom",
      // Circom circuits in /public/circom/
      addressLookupTables: addressLookupTables?.map((addr) => new PublicKey(addr))
    }),
    [rpcUrl, indexerUrl, programId, heliusApiKey, network, addressLookupTables]
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
  useEffect(() => {
    if (wallet && isProgramReady && !isSyncing && notes.length === 0) {
      console.log("[CloakCraft] Auto-syncing notes on wallet connect...");
      sync().catch((err) => {
        console.error("[CloakCraft] Auto-sync failed:", err);
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
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
    }
  }, []);
  const sync = useCallback(async (tokenMint, clearCache = false) => {
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
  const createWallet = useCallback(() => {
    return client.createWallet();
  }, [client]);
  const setProgram = useCallback((program) => {
    client.setProgram(program);
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
import { useState as useState8, useCallback as useCallback8, useEffect as useEffect3, useRef } from "react";
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
function useScanner(tokenMint, autoRefreshMs) {
  const { client, wallet, notes, sync } = useCloakCraft();
  const [state, setState] = useState8({
    isScanning: false,
    lastScanned: null,
    error: null
  });
  const intervalRef = useRef(null);
  const scan = useCallback8(async () => {
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
  useEffect3(() => {
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
import { useState as useState10, useCallback as useCallback10, useEffect as useEffect5, useMemo as useMemo5 } from "react";
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
  const mintsKey = useMemo5(
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
  calculateSwapOutput,
  calculateMinOutput,
  calculateAddLiquidityAmounts,
  calculateRemoveLiquidityOutput,
  generateStealthAddress as generateStealthAddress2,
  computeAmmStateHash
} from "@cloakcraft/sdk";
import { Keypair as SolanaKeypair3 } from "@solana/web3.js";
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
        const { input, pool, swapDirection, swapAmount, slippageBps = 50 } = options;
        const reserveIn = swapDirection === "aToB" ? pool.reserveA : pool.reserveB;
        const reserveOut = swapDirection === "aToB" ? pool.reserveB : pool.reserveA;
        const { outputAmount } = calculateSwapOutput(
          swapAmount,
          reserveIn,
          reserveOut,
          pool.feeBps
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
      const { outputAmount, priceImpact } = calculateSwapOutput(
        inputAmount,
        reserveIn,
        reserveOut,
        pool.feeBps
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
    async (tokenAMint, tokenBMint, feeBps = 30) => {
      if (!client?.getProgram()) {
        setState({ isInitializing: false, error: "Program not set", result: null });
        return null;
      }
      setState({ isInitializing: true, error: null, result: null });
      try {
        const lpMintKeypair = SolanaKeypair3.generate();
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
        const { pool, inputA, inputB, amountA, amountB, slippageBps = 50 } = options;
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
        const { pool, lpInput, lpAmount, slippageBps = 50 } = options;
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
import { useState as useState13, useEffect as useEffect8, useCallback as useCallback13, useMemo as useMemo6, useRef as useRef2 } from "react";
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
  const filterKey = useMemo6(
    () => JSON.stringify(filter ?? {}),
    [filter?.type, filter?.status, filter?.limit, filter?.tokenMint, filter?.after?.getTime(), filter?.before?.getTime()]
  );
  const filterRef = useRef2(filter);
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
  const summary = useMemo6(() => {
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
import { useState as useState14, useEffect as useEffect9, useCallback as useCallback14, useMemo as useMemo7, useRef as useRef3 } from "react";
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
  const fetcher = useRef3(getPriceFetcher());
  const mintStrings = useMemo7(
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
  const solPrice = useMemo7(() => {
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
  const mints = useMemo7(
    () => mint ? [mint] : [],
    [mint]
  );
  const { prices, isLoading, error, refresh } = useTokenPrices(mints);
  const price = useMemo7(() => {
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
  const mints = useMemo7(
    () => balances.map((b) => b.mint),
    [balances]
  );
  const { prices, isLoading, error } = useTokenPrices(mints);
  const totalValue = useMemo7(() => {
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
  const breakdown = useMemo7(() => {
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
import { useState as useState15, useEffect as useEffect10, useCallback as useCallback15, useMemo as useMemo8, useRef as useRef4 } from "react";
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
  const calculator = useRef4(getCalculator());
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
  const calculator = useRef4(getCalculator());
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
  const calculator = useRef4(getCalculator());
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
  const calculator = useRef4(getCalculator());
  const impermanentLoss = useMemo8(() => {
    return calculator.current.calculateImpermanentLoss(
      initialPriceRatio,
      currentPriceRatio
    );
  }, [initialPriceRatio, currentPriceRatio]);
  const formattedLoss = useMemo8(() => {
    return `${impermanentLoss.toFixed(2)}%`;
  }, [impermanentLoss]);
  return {
    impermanentLoss,
    formattedLoss
  };
}

// src/useConsolidation.ts
import { useState as useState16, useCallback as useCallback16, useMemo as useMemo9, useRef as useRef5 } from "react";
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
  const isConsolidatingRef = useRef5(false);
  const service = useMemo9(
    () => new ConsolidationService(dustThreshold),
    [dustThreshold]
  );
  const tokenNotes = useMemo9(
    () => notes.filter((n) => n.tokenMint.equals(tokenMint)),
    [notes, tokenMint]
  );
  const fragmentationReport = useMemo9(
    () => service.analyzeNotes(tokenNotes),
    [service, tokenNotes]
  );
  const suggestions = useMemo9(
    () => service.suggestConsolidation(tokenNotes, { maxNotesPerBatch }),
    [service, tokenNotes, maxNotesPerBatch]
  );
  const consolidationPlan = useMemo9(
    () => service.planConsolidation(tokenNotes, { maxNotesPerBatch }),
    [service, tokenNotes, maxNotesPerBatch]
  );
  const summary = useMemo9(
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
  const estimatedCost = useMemo9(() => {
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
  const service = useMemo9(() => new ConsolidationService(), []);
  return useMemo9(() => {
    const tokenNotes = notes.filter((n) => n.tokenMint.equals(tokenMint));
    return service.shouldConsolidate(tokenNotes);
  }, [notes, tokenMint, service]);
}
function useFragmentationScore(tokenMint) {
  const { notes } = useCloakCraft();
  const service = useMemo9(() => new ConsolidationService(), []);
  return useMemo9(() => {
    const tokenNotes = notes.filter((n) => n.tokenMint.equals(tokenMint));
    const report = service.analyzeNotes(tokenNotes);
    return report.fragmentationScore;
  }, [notes, tokenMint, service]);
}

// src/useAutoConsolidation.ts
import { useState as useState17, useEffect as useEffect11, useCallback as useCallback17, useMemo as useMemo10 } from "react";
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
  const tokenNotes = useMemo10(
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
  const tokenNotes = useMemo10(
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
import { useState as useState18, useEffect as useEffect12, useCallback as useCallback18, useMemo as useMemo11 } from "react";
import { PublicKey as PublicKey3 } from "@solana/web3.js";
import { deriveProtocolConfigPda, PROGRAM_ID } from "@cloakcraft/sdk";
var DEFAULT_FEES = {
  transferFeeBps: 10,
  // 0.1%
  unshieldFeeBps: 25,
  // 0.25%
  swapFeeBps: 30,
  // 0.3%
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
      const swapFeeBps = data.readUInt16LE(76);
      const removeLiquidityFeeBps = data.readUInt16LE(78);
      const feesEnabled = data[80] !== 0;
      setConfig({
        authority,
        treasury,
        transferFeeBps,
        unshieldFeeBps,
        swapFeeBps,
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
      const bps = {
        transfer: cfg.transferFeeBps,
        unshield: cfg.unshieldFeeBps,
        swap: cfg.swapFeeBps,
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
  return useMemo11(() => {
    const freeOperations = ["shield", "add_liquidity", "consolidate"];
    return freeOperations.includes(operation);
  }, [operation]);
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
  useAddLiquidity,
  useAllBalances,
  useAmmPools,
  useAutoConsolidation,
  useBalance,
  useCloakCraft,
  useConsolidation,
  useFragmentationScore,
  useImpermanentLoss,
  useInitializeAmmPool,
  useInitializePool,
  useIsConsolidationRecommended,
  useIsFreeOperation,
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
  useProtocolFees,
  usePublicBalance,
  useRecentTransactions,
  useRemoveLiquidity,
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
  useTransactionHistory,
  useTransfer,
  useUnshield,
  useUserPosition,
  useWallet
};
