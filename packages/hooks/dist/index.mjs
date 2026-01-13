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
  solanaWalletPubkey
}) {
  const [wallet, setWallet] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isProverReady, setIsProverReady] = useState(false);
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
      network
    }),
    [rpcUrl, indexerUrl, programId, heliusApiKey, network]
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
  const createWallet = useCallback(() => {
    return client.createWallet();
  }, [client]);
  const setProgram = useCallback((program) => {
    client.setProgram(program);
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
        const recipientPubkey = options.recipient ?? wallet.publicKey;
        const { stealthAddress } = generateStealthAddress(recipientPubkey);
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
import { useState as useState6, useCallback as useCallback6 } from "react";
function useTransfer() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState6({
    isTransferring: false,
    error: null,
    result: null
  });
  const transfer = useCallback6(
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
  const availableNotes = notes.filter(
    (note) => note.tokenMint && note.tokenMint.equals(tokenMint)
  );
  const selectNotesForAmount = useCallback6(
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
  const clearSelection = useCallback6(() => {
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
import { useState as useState7, useCallback as useCallback7 } from "react";
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
      const { inputs, amount, recipient } = options;
      setState({ isUnshielding: true, error: null, result: null });
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
            unshield: { amount, recipient }
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
import { useState as useState10, useCallback as useCallback10, useEffect as useEffect5, useMemo as useMemo4 } from "react";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
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
      const tokenAccount = getAssociatedTokenAddressSync(tokenMint, owner);
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
  const mintsKey = useMemo4(
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
      const tokenAccounts = tokenMints.map((mint) => getAssociatedTokenAddressSync(mint, owner));
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
export {
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
};
