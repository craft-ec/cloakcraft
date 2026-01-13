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
  AddLiquidityForm: () => AddLiquidityForm,
  BalanceDisplay: () => BalanceDisplay,
  BalanceInline: () => BalanceInline,
  BalanceSummary: () => BalanceSummary,
  CloakCraftProvider: () => import_hooks18.CloakCraftProvider,
  DEVNET_TOKENS: () => DEVNET_TOKENS,
  InitializePoolForm: () => InitializePoolForm,
  MAINNET_TOKENS: () => MAINNET_TOKENS,
  MultiPrivateBalanceDisplay: () => MultiPrivateBalanceDisplay,
  MultiTokenBalanceDisplay: () => MultiTokenBalanceDisplay,
  NotesList: () => NotesList,
  OrderBook: () => OrderBook,
  PoolInfo: () => PoolInfo,
  PoolStatusBadge: () => PoolStatusBadge,
  PublicBalanceDisplay: () => PublicBalanceDisplay,
  RemoveLiquidityForm: () => RemoveLiquidityForm,
  ShieldForm: () => ShieldForm,
  SwapForm: () => SwapForm,
  SwapPanel: () => SwapPanel,
  TokenSelector: () => TokenSelector,
  TransactionHistory: () => TransactionHistory,
  TransferForm: () => TransferForm,
  UnshieldForm: () => UnshieldForm,
  WalletBackup: () => WalletBackup,
  WalletButton: () => WalletButton,
  WalletImport: () => WalletImport,
  WalletManager: () => WalletManager,
  colors: () => colors,
  styles: () => styles
});
module.exports = __toCommonJS(index_exports);
var import_hooks18 = require("@cloakcraft/hooks");

// src/components/WalletButton.tsx
var import_react = require("react");
var import_hooks = require("@cloakcraft/hooks");

// src/styles.ts
var colors = {
  primary: "#6366f1",
  primaryHover: "#4f46e5",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
  text: "#1f2937",
  textMuted: "#6b7280",
  textLight: "#9ca3af",
  border: "#e5e7eb",
  borderHover: "#d1d5db",
  background: "#ffffff",
  backgroundMuted: "#f9fafb",
  backgroundDark: "#f3f4f6"
};
var styles = {
  // Card container
  card: {
    padding: "24px",
    borderRadius: "12px",
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background
  },
  cardTitle: {
    margin: "0 0 8px 0",
    fontSize: "1.25rem",
    fontWeight: 600,
    color: colors.text
  },
  cardDescription: {
    margin: "0 0 20px 0",
    fontSize: "0.875rem",
    color: colors.textMuted
  },
  // Form elements
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "16px"
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: colors.text
  },
  input: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1px solid ${colors.border}`,
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.15s ease",
    boxSizing: "border-box"
  },
  inputFocused: {
    borderColor: colors.primary
  },
  textarea: {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "8px",
    border: `1px solid ${colors.border}`,
    fontSize: "0.875rem",
    fontFamily: "monospace",
    outline: "none",
    resize: "vertical",
    minHeight: "80px",
    boxSizing: "border-box"
  },
  // Buttons
  buttonPrimary: {
    padding: "12px 20px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: colors.primary,
    color: "white",
    fontSize: "0.9375rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.15s ease"
  },
  buttonSecondary: {
    padding: "12px 20px",
    borderRadius: "8px",
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: "0.9375rem",
    fontWeight: 500,
    cursor: "pointer",
    transition: "background-color 0.15s ease, border-color 0.15s ease"
  },
  buttonDisabled: {
    backgroundColor: colors.textLight,
    cursor: "not-allowed"
  },
  buttonSmall: {
    padding: "6px 12px",
    fontSize: "0.8125rem"
  },
  // Status messages
  errorText: {
    color: colors.error,
    fontSize: "0.875rem",
    marginTop: "4px"
  },
  successText: {
    color: colors.success,
    fontSize: "0.875rem",
    fontWeight: 500
  },
  successBox: {
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "#ecfdf5",
    border: `1px solid ${colors.success}`
  },
  warningBox: {
    padding: "12px 16px",
    borderRadius: "8px",
    backgroundColor: "#fffbeb",
    border: `1px solid ${colors.warning}`
  },
  // Links
  link: {
    color: colors.primary,
    textDecoration: "none",
    fontSize: "0.875rem"
  },
  txLink: {
    marginTop: "8px",
    fontSize: "0.8125rem"
  },
  // List items
  listItem: {
    padding: "12px 16px",
    border: `1px solid ${colors.border}`,
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  listItemSelected: {
    borderColor: colors.primary,
    backgroundColor: "#eef2ff"
  },
  // Badge
  badge: {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 500
  },
  badgeSuccess: {
    backgroundColor: "#ecfdf5",
    color: colors.success
  },
  badgeWarning: {
    backgroundColor: "#fffbeb",
    color: colors.warning
  },
  badgeError: {
    backgroundColor: "#fef2f2",
    color: colors.error
  },
  // Layout
  row: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  spaceBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  // Typography
  heading: {
    margin: "0 0 16px 0",
    fontSize: "1.5rem",
    fontWeight: 600,
    color: colors.text
  },
  subheading: {
    margin: 0,
    fontSize: "0.875rem",
    color: colors.textMuted
  },
  mono: {
    fontFamily: "monospace",
    fontSize: "0.8125rem"
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  // Loading spinner placeholder
  spinner: {
    display: "inline-block",
    width: "16px",
    height: "16px",
    border: "2px solid #e5e7eb",
    borderTopColor: colors.primary,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },
  // Empty state
  emptyState: {
    textAlign: "center",
    padding: "32px",
    color: colors.textMuted
  }
};

// src/components/WalletButton.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function WalletButton({
  className,
  showImport = false,
  solanaConnected = false,
  signMessage
}) {
  const {
    isConnected,
    isConnecting,
    isInitializing,
    disconnect,
    deriveFromSignature,
    createAndConnect,
    importFromKey,
    publicKey,
    error
  } = (0, import_hooks.useWallet)();
  const [showImportModal, setShowImportModal] = (0, import_react.useState)(false);
  const [importKey, setImportKey] = (0, import_react.useState)("");
  const [importError, setImportError] = (0, import_react.useState)(null);
  const handleConnect = async () => {
    if (isConnected) {
      disconnect();
    } else {
      try {
        if (solanaConnected && signMessage) {
          const messageBytes = new TextEncoder().encode(import_hooks.WALLET_DERIVATION_MESSAGE);
          const signature = await signMessage(messageBytes);
          await deriveFromSignature(signature);
        } else {
          await createAndConnect();
        }
      } catch (err) {
        console.error("handleConnect error:", err);
      }
    }
  };
  const handleImport = async () => {
    setImportError(null);
    try {
      const keyBytes = Buffer.from(importKey.trim(), "hex");
      if (keyBytes.length !== 32) {
        throw new Error("Spending key must be 32 bytes (64 hex characters)");
      }
      await importFromKey(new Uint8Array(keyBytes));
      setShowImportModal(false);
      setImportKey("");
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Import failed");
    }
  };
  const truncateKey = (key) => {
    if (!key) return "";
    const hex = Buffer.from(key.x).toString("hex");
    return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: "8px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: handleConnect,
          disabled: isConnecting || isInitializing || !isConnected && !solanaConnected,
          style: {
            ...styles.buttonPrimary,
            backgroundColor: isConnected ? colors.success : colors.primary,
            ...isConnecting || isInitializing || !isConnected && !solanaConnected ? styles.buttonDisabled : {}
          },
          children: isInitializing ? "Initializing..." : isConnecting ? "Deriving..." : isConnected ? `${truncateKey(publicKey)}` : solanaConnected ? "Derive Stealth Wallet" : "Connect Solana First"
        }
      ),
      showImport && !isConnected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: () => setShowImportModal(true),
          disabled: isConnecting || isInitializing,
          style: {
            ...styles.buttonSecondary,
            ...isConnecting || isInitializing ? styles.buttonDisabled : {}
          },
          children: "Import"
        }
      ),
      isConnected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          onClick: disconnect,
          style: styles.buttonSecondary,
          children: "Disconnect"
        }
      )
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { ...styles.errorText, marginTop: "8px" }, children: error }),
    showImportModal && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1e3
        },
        onClick: () => setShowImportModal(false),
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            style: {
              ...styles.card,
              maxWidth: "400px",
              width: "90%"
            },
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { style: styles.cardTitle, children: "Import Wallet" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.cardDescription, children: "Enter your spending key (64 hex characters)" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.form, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "textarea",
                  {
                    value: importKey,
                    onChange: (e) => setImportKey(e.target.value),
                    placeholder: "Enter spending key...",
                    style: styles.textarea
                  }
                ),
                importError && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.errorText, children: importError }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", gap: "8px", justifyContent: "flex-end" }, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      onClick: () => setShowImportModal(false),
                      style: styles.buttonSecondary,
                      children: "Cancel"
                    }
                  ),
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      onClick: handleImport,
                      disabled: !importKey.trim(),
                      style: {
                        ...styles.buttonPrimary,
                        ...!importKey.trim() ? styles.buttonDisabled : {}
                      },
                      children: "Import"
                    }
                  )
                ] })
              ] })
            ]
          }
        )
      }
    )
  ] });
}

// src/components/BalanceDisplay.tsx
var import_hooks2 = require("@cloakcraft/hooks");
var import_jsx_runtime2 = require("react/jsx-runtime");
function BalanceDisplay({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  showNoteCount = true,
  className
}) {
  const { balance, noteCount, isLoading, error, refresh } = (0, import_hooks2.usePrivateBalance)(tokenMint);
  const { isConnected } = (0, import_hooks2.useWallet)();
  const formatBalance = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fractionalStr}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: styles.spaceBetween, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginBottom: "4px" }, children: "Private Balance" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { display: "flex", alignItems: "baseline", gap: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontSize: "2rem", fontWeight: 600, color: colors.text }, children: !isConnected ? "---" : isLoading ? "..." : formatBalance(balance) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontSize: "1rem", color: colors.textMuted }, children: symbol })
        ] }),
        showNoteCount && isConnected && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginTop: "4px" }, children: [
          noteCount,
          " ",
          noteCount === 1 ? "note" : "notes"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          onClick: refresh,
          disabled: isLoading || !isConnected,
          style: {
            ...styles.buttonSecondary,
            ...styles.buttonSmall,
            ...isLoading || !isConnected ? { opacity: 0.5, cursor: "not-allowed" } : {}
          },
          children: isLoading ? "..." : "Refresh"
        }
      )
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { style: { ...styles.errorText, marginTop: "8px", fontSize: "0.75rem", wordBreak: "break-word" }, children: error })
  ] });
}
function BalanceInline({
  tokenMint,
  decimals = 9,
  symbol
}) {
  const { balance, isLoading } = (0, import_hooks2.usePrivateBalance)(tokenMint);
  const { isConnected } = (0, import_hooks2.useWallet)();
  const formatBalance = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 2)}`;
  };
  if (!isConnected) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { color: colors.textMuted }, children: "---" });
  if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { color: colors.textMuted }, children: "..." });
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { fontWeight: 500 }, children: [
    formatBalance(balance),
    " ",
    symbol
  ] });
}

// src/components/ShieldForm.tsx
var import_react2 = __toESM(require("react"));
var import_hooks3 = require("@cloakcraft/hooks");
var import_jsx_runtime3 = require("react/jsx-runtime");
function ShieldForm({
  tokenMint,
  userTokenAccount,
  decimals = 9,
  symbol = "tokens",
  onSuccess,
  onError,
  className,
  walletPublicKey,
  tokens,
  onTokenChange
}) {
  const [amount, setAmount] = (0, import_react2.useState)("");
  const { isShielding, error, result, shield, reset } = (0, import_hooks3.useShield)();
  const { isConnected, isInitialized } = (0, import_hooks3.useWallet)();
  const { client } = (0, import_hooks3.useCloakCraft)();
  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onError?.("Please enter a valid amount");
      return;
    }
    if (!walletPublicKey) {
      onError?.("No wallet connected");
      return;
    }
    if (!client?.getProgram()) {
      onError?.("Program not configured. Call setProgram() first.");
      return;
    }
    if (!userTokenAccount) {
      onError?.("Token account not found. Please ensure you have the selected token.");
      return;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));
    const txResult = await shield({
      tokenMint,
      amount: amountLamports,
      userTokenAccount,
      walletPublicKey
    });
    if (txResult) {
      onSuccess?.(txResult.signature, txResult.commitment);
      setAmount("");
    } else if (error) {
      onError?.(error);
    }
  };
  const isDisabled = !isConnected || !isInitialized || isShielding || !amount || !walletPublicKey;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { style: styles.cardTitle, children: "Shield Tokens" }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { style: styles.cardDescription, children: "Deposit tokens into the privacy pool to enable private transfers." }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      tokens && onTokenChange && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { style: styles.label, children: [
        "Token",
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          TokenSelectorWithBalance,
          {
            tokens,
            selected: tokenMint,
            onSelect: (token) => onTokenChange(token),
            disabled: isShielding,
            owner: walletPublicKey
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { style: styles.label, children: [
        "Amount (",
        symbol,
        ")",
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "input",
          {
            type: "number",
            value: amount,
            onChange: (e) => setAmount(e.target.value),
            placeholder: "0.00",
            step: "any",
            min: "0",
            disabled: isShielding,
            style: styles.input
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "button",
        {
          type: "submit",
          disabled: isDisabled,
          style: {
            ...styles.buttonPrimary,
            ...isDisabled ? styles.buttonDisabled : {}
          },
          children: !isConnected ? "Connect Wallet" : !isInitialized ? "Initializing..." : isShielding ? "Shielding..." : "Shield Tokens"
        }
      ),
      error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: styles.errorText, children: error }),
      result && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: styles.successBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: styles.successText, children: "Tokens shielded successfully!" }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: styles.txLink, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
          "a",
          {
            href: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
            target: "_blank",
            rel: "noopener noreferrer",
            style: styles.link,
            children: "View transaction"
          }
        ) })
      ] })
    ] })
  ] });
}
function TokenSelectorWithBalance({
  tokens,
  selected,
  onSelect,
  disabled,
  owner
}) {
  const tokenMints = import_react2.default.useMemo(() => tokens.map((t) => t.mint), [tokens]);
  const { getBalance } = (0, import_hooks3.useTokenBalances)(tokenMints, owner || void 0);
  const formatBalance = (balance, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fractional = balance % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "select",
    {
      value: selected.toBase58(),
      onChange: (e) => {
        const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
        if (token) onSelect(token);
      },
      disabled,
      style: styles.input,
      children: tokens.map((token) => {
        const balance = getBalance(token.mint);
        const balanceStr = formatBalance(balance, token.decimals);
        return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("option", { value: token.mint.toBase58(), children: [
          token.symbol,
          " - ",
          balanceStr
        ] }, token.mint.toBase58());
      })
    }
  );
}

// src/components/TransferForm.tsx
var import_react3 = require("react");
var import_hooks4 = require("@cloakcraft/hooks");
var import_sdk = require("@cloakcraft/sdk");
var import_jsx_runtime4 = require("react/jsx-runtime");
function TransferForm({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  onSuccess,
  onError,
  className,
  walletPublicKey,
  tokens,
  onTokenChange
}) {
  const [recipientPubkey, setRecipientPubkey] = (0, import_react3.useState)("");
  const [amount, setAmount] = (0, import_react3.useState)("");
  const { isTransferring, error, result, transfer, reset } = (0, import_hooks4.useTransfer)();
  const { isConnected, isInitialized, wallet } = (0, import_hooks4.useWallet)();
  const { client } = (0, import_hooks4.useCloakCraft)();
  const { availableNotes, totalAvailable, selectNotesForAmount } = (0, import_hooks4.useNoteSelector)(tokenMint);
  const formatAmount = (value) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 4)}`;
  };
  const parseRecipientPublicKey = (hex) => {
    try {
      const clean = hex.trim().startsWith("0x") ? hex.trim().slice(2) : hex.trim();
      if (clean.length !== 128) return null;
      const bytes = Buffer.from(clean, "hex");
      return {
        x: new Uint8Array(bytes.slice(0, 32)),
        y: new Uint8Array(bytes.slice(32, 64))
      };
    } catch {
      return null;
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onError?.("Please enter a valid amount");
      return;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));
    const recipientPoint = parseRecipientPublicKey(recipientPubkey);
    if (!recipientPoint) {
      onError?.("Invalid recipient public key. Expected 128 hex characters (x + y coordinates).");
      return;
    }
    if (!client?.getProgram()) {
      onError?.("Program not configured. Call setProgram() first.");
      return;
    }
    let selectedNotes;
    try {
      selectedNotes = selectNotesForAmount(amountLamports);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Insufficient balance");
      return;
    }
    const { stealthAddress } = (0, import_sdk.generateStealthAddress)(recipientPoint);
    const totalInput = selectedNotes.reduce((sum, n) => sum + n.amount, 0n);
    const change = totalInput - amountLamports;
    const outputs = [
      { recipient: stealthAddress, amount: amountLamports }
    ];
    if (change > 0n && wallet) {
      const { stealthAddress: changeAddress } = (0, import_sdk.generateStealthAddress)(wallet.publicKey);
      outputs.push({ recipient: changeAddress, amount: change });
    }
    const txResult = await transfer(selectedNotes, outputs, void 0, walletPublicKey ?? void 0);
    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount("");
      setRecipientPubkey("");
    } else if (error) {
      onError?.(error);
    }
  };
  const isDisabled = !isConnected || !isInitialized || isTransferring || !amount || !recipientPubkey;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { style: styles.cardTitle, children: "Private Transfer" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { style: styles.cardDescription, children: "Send tokens privately. Only the recipient can decrypt the note." }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { marginBottom: "16px", ...styles.spaceBetween }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: "Available Balance" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { fontWeight: 600 }, children: [
        formatAmount(totalAvailable),
        " ",
        symbol
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      tokens && onTokenChange && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { style: styles.label, children: [
        "Token",
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          PrivateTokenSelectorWithBalance,
          {
            tokens,
            selected: tokenMint,
            onSelect: (token) => onTokenChange(token),
            disabled: isTransferring
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { style: styles.label, children: [
        "Recipient Public Key",
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "textarea",
          {
            value: recipientPubkey,
            onChange: (e) => setRecipientPubkey(e.target.value),
            placeholder: "Enter recipient's BabyJubJub public key (128 hex chars)",
            disabled: isTransferring,
            style: styles.textarea
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { style: styles.label, children: [
        "Amount (",
        symbol,
        ")",
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "input",
          {
            type: "number",
            value: amount,
            onChange: (e) => setAmount(e.target.value),
            placeholder: "0.00",
            step: "any",
            min: "0",
            disabled: isTransferring,
            style: styles.input
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "submit",
          disabled: isDisabled,
          style: {
            ...styles.buttonPrimary,
            ...isDisabled ? styles.buttonDisabled : {}
          },
          children: !isConnected ? "Connect Wallet" : !isInitialized ? "Initializing..." : isTransferring ? "Transferring..." : "Send Private Transfer"
        }
      ),
      error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles.errorText, children: error }),
      result && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: styles.successBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles.successText, children: "Transfer sent successfully!" }),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: styles.txLink, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "a",
          {
            href: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
            target: "_blank",
            rel: "noopener noreferrer",
            style: styles.link,
            children: "View transaction"
          }
        ) })
      ] })
    ] })
  ] });
}
function PrivateTokenSelectorWithBalance({
  tokens,
  selected,
  onSelect,
  disabled
}) {
  const formatBalance = (balance, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fractional = balance % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
    "select",
    {
      value: selected.toBase58(),
      onChange: (e) => {
        const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
        if (token) onSelect(token);
      },
      disabled,
      style: styles.input,
      children: tokens.map((token) => {
        const { totalAvailable } = (0, import_hooks4.useNoteSelector)(token.mint);
        const balanceStr = formatBalance(totalAvailable, token.decimals);
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("option", { value: token.mint.toBase58(), children: [
          token.symbol,
          " - ",
          balanceStr
        ] }, token.mint.toBase58());
      })
    }
  );
}

// src/components/UnshieldForm.tsx
var import_react4 = require("react");
var import_web3 = require("@solana/web3.js");
var import_hooks5 = require("@cloakcraft/hooks");
var import_jsx_runtime5 = require("react/jsx-runtime");
function UnshieldForm({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  defaultRecipient,
  onSuccess,
  onError,
  className,
  walletPublicKey,
  tokens,
  onTokenChange
}) {
  const [recipient, setRecipient] = (0, import_react4.useState)(defaultRecipient?.toBase58() ?? "");
  const [amount, setAmount] = (0, import_react4.useState)("");
  const { isUnshielding, error, result, unshield, reset } = (0, import_hooks5.useUnshield)();
  const { isConnected, isInitialized } = (0, import_hooks5.useWallet)();
  const { client } = (0, import_hooks5.useCloakCraft)();
  const { availableNotes, totalAvailable, selectNotesForAmount } = (0, import_hooks5.useNoteSelector)(tokenMint);
  const formatAmount = (value) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 4)}`;
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onError?.("Please enter a valid amount");
      return;
    }
    let recipientPubkey;
    try {
      recipientPubkey = new import_web3.PublicKey(recipient);
    } catch {
      onError?.("Invalid recipient token account address");
      return;
    }
    if (!client?.getProgram()) {
      onError?.("Program not configured. Call setProgram() first.");
      return;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));
    let selectedNotes;
    try {
      selectedNotes = selectNotesForAmount(amountLamports);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Insufficient balance");
      return;
    }
    const txResult = await unshield(
      {
        inputs: selectedNotes,
        amount: amountLamports,
        recipient: recipientPubkey,
        walletPublicKey: walletPublicKey ?? void 0
      }
    );
    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount("");
    } else if (error) {
      onError?.(error);
    }
  };
  const handleMax = () => {
    const maxAmount = Number(totalAvailable) / 10 ** decimals;
    setAmount(maxAmount.toString());
  };
  const isDisabled = !isConnected || !isInitialized || isUnshielding || !amount || !recipient;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { style: styles.cardTitle, children: "Withdraw Tokens" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: styles.cardDescription, children: "Withdraw tokens from the privacy pool back to your public wallet." }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { marginBottom: "16px", ...styles.spaceBetween }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: "Private Balance" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { style: { fontWeight: 600 }, children: [
        formatAmount(totalAvailable),
        " ",
        symbol
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      tokens && onTokenChange && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { style: styles.label, children: [
        "Token",
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          PrivateTokenSelectorWithBalance2,
          {
            tokens,
            selected: tokenMint,
            onSelect: (token) => onTokenChange(token),
            disabled: isUnshielding
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { style: styles.label, children: [
        "Recipient Token Account",
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "input",
          {
            type: "text",
            value: recipient,
            onChange: (e) => setRecipient(e.target.value),
            placeholder: "Enter token account address",
            disabled: isUnshielding,
            style: { ...styles.input, fontFamily: "monospace", fontSize: "0.875rem" }
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { style: styles.label, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: styles.spaceBetween, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
            "Amount (",
            symbol,
            ")"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              onClick: handleMax,
              disabled: isUnshielding || totalAvailable === 0n,
              style: {
                ...styles.buttonSecondary,
                ...styles.buttonSmall,
                padding: "2px 8px",
                fontSize: "0.75rem"
              },
              children: "MAX"
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "input",
          {
            type: "number",
            value: amount,
            onChange: (e) => setAmount(e.target.value),
            placeholder: "0.00",
            step: "any",
            min: "0",
            disabled: isUnshielding,
            style: styles.input
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "button",
        {
          type: "submit",
          disabled: isDisabled,
          style: {
            ...styles.buttonPrimary,
            ...isDisabled ? styles.buttonDisabled : {}
          },
          children: !isConnected ? "Connect Wallet" : !isInitialized ? "Initializing..." : isUnshielding ? "Withdrawing..." : "Withdraw Tokens"
        }
      ),
      error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles.errorText, children: error }),
      result && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: styles.successBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles.successText, children: "Withdrawal successful!" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles.txLink, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "a",
          {
            href: `https://explorer.solana.com/tx/${result.signature}?cluster=devnet`,
            target: "_blank",
            rel: "noopener noreferrer",
            style: styles.link,
            children: "View transaction"
          }
        ) })
      ] })
    ] })
  ] });
}
function PrivateTokenSelectorWithBalance2({
  tokens,
  selected,
  onSelect,
  disabled
}) {
  const formatBalance = (balance, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = balance / divisor;
    const fractional = balance % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
    "select",
    {
      value: selected.toBase58(),
      onChange: (e) => {
        const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
        if (token) onSelect(token);
      },
      disabled,
      style: styles.input,
      children: tokens.map((token) => {
        const { totalAvailable } = (0, import_hooks5.useNoteSelector)(token.mint);
        const balanceStr = formatBalance(totalAvailable, token.decimals);
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("option", { value: token.mint.toBase58(), children: [
          token.symbol,
          " - ",
          balanceStr
        ] }, token.mint.toBase58());
      })
    }
  );
}

// src/components/NotesList.tsx
var import_hooks6 = require("@cloakcraft/hooks");
var import_jsx_runtime6 = require("react/jsx-runtime");
function NotesList({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  className,
  autoRefreshMs = 0
}) {
  const { notes, totalAmount, isScanning, lastScanned, scan, error } = (0, import_hooks6.useScanner)(tokenMint, autoRefreshMs);
  const { isConnected } = (0, import_hooks6.useWallet)();
  const formatAmount = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fractionalStr}`;
  };
  const formatTime = (date) => {
    if (!date) return "Never";
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1e3);
    if (diffSecs < 60) return "Just now";
    const diffMins = Math.floor(diffMs / 6e4);
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { style: { ...styles.cardTitle, margin: 0 }, children: "Your Notes" }),
        lastScanned && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginTop: "2px" }, children: [
          "Updated ",
          formatTime(lastScanned)
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
        "button",
        {
          onClick: scan,
          disabled: isScanning || !isConnected,
          style: {
            ...styles.buttonSecondary,
            ...styles.buttonSmall,
            ...isScanning || !isConnected ? { opacity: 0.5 } : {}
          },
          children: isScanning ? "Scanning..." : "Refresh"
        }
      )
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { ...styles.errorText, marginBottom: "12px" }, children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: {
      marginBottom: "16px",
      padding: "12px 16px",
      background: colors.backgroundDark,
      borderRadius: "8px",
      ...styles.spaceBetween
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: "Total Balance" }) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { textAlign: "right" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { fontWeight: 600, fontSize: "1.25rem" }, children: [
          formatAmount(totalAmount),
          " ",
          symbol
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: [
          notes.length,
          " ",
          notes.length === 1 ? "note" : "notes"
        ] })
      ] })
    ] }),
    !isConnected ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: styles.emptyState, children: "Connect your wallet to view notes" }) : notes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: styles.emptyState, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { marginBottom: "8px" }, children: "No notes found" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { fontSize: "0.8125rem", color: colors.textLight }, children: "Shield some tokens to get started" })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: styles.stack, children: notes.map((note, index) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
      "div",
      {
        style: styles.listItem,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { fontWeight: 500, marginBottom: "2px" }, children: [
              formatAmount(note.amount),
              " ",
              symbol
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", gap: "8px", fontSize: "0.75rem" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { style: { color: colors.textMuted }, children: [
                "Leaf #",
                note.leafIndex.toString()
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { style: { ...styles.mono, color: colors.textLight }, children: [
                Buffer.from(note.commitment).toString("hex").slice(0, 12),
                "..."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "div",
            {
              style: {
                ...styles.badge,
                backgroundColor: "#ecfdf5",
                color: colors.success
              },
              children: "Unspent"
            }
          )
        ]
      },
      index
    )) })
  ] });
}

// src/components/TransactionHistory.tsx
var import_react5 = require("react");
var import_hooks7 = require("@cloakcraft/hooks");
var import_jsx_runtime7 = require("react/jsx-runtime");
function TransactionHistory({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  maxItems = 10,
  className
}) {
  const { client, isConnected } = (0, import_hooks7.useCloakCraft)();
  const [transactions, setTransactions] = (0, import_react5.useState)([]);
  const [isLoading, setIsLoading] = (0, import_react5.useState)(false);
  const formatAmount = (value) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 4)}`;
  };
  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1e3);
    const now = /* @__PURE__ */ new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 6e4);
    const diffHours = Math.floor(diffMs / 36e5);
    const diffDays = Math.floor(diffMs / 864e5);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };
  const getTypeLabel = (type) => {
    switch (type) {
      case "shield":
        return "Shielded";
      case "transfer":
        return "Transferred";
      case "unshield":
        return "Withdrew";
    }
  };
  const getTypeStyle = (type) => {
    switch (type) {
      case "shield":
        return { ...styles.badge, backgroundColor: "#ecfdf5", color: colors.success };
      case "transfer":
        return { ...styles.badge, backgroundColor: "#eef2ff", color: colors.primary };
      case "unshield":
        return { ...styles.badge, backgroundColor: "#fef3c7", color: colors.warning };
    }
  };
  const getStatusStyle = (status) => {
    switch (status) {
      case "confirmed":
        return { color: colors.success };
      case "pending":
        return { color: colors.warning };
      case "failed":
        return { color: colors.error };
    }
  };
  const refresh = (0, import_react5.useCallback)(async () => {
    if (!client || !isConnected) return;
    setIsLoading(true);
    try {
      setTransactions([]);
    } catch (err) {
      console.error("Failed to fetch transaction history:", err);
    } finally {
      setIsLoading(false);
    }
  }, [client, isConnected, tokenMint, maxItems]);
  (0, import_react5.useEffect)(() => {
    refresh();
  }, [refresh]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("h3", { style: { ...styles.cardTitle, margin: 0 }, children: "Transaction History" }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
        "button",
        {
          onClick: refresh,
          disabled: isLoading || !isConnected,
          style: {
            ...styles.buttonSecondary,
            ...styles.buttonSmall
          },
          children: isLoading ? "Loading..." : "Refresh"
        }
      )
    ] }),
    !isConnected ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: styles.emptyState, children: "Connect your wallet to view transaction history" }) : transactions.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: styles.emptyState, children: "No transactions yet" }) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: styles.stack, children: transactions.map((tx) => /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: styles.listItem, children: [
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: "4px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: styles.row, children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: getTypeStyle(tx.type), children: getTypeLabel(tx.type) }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { style: { fontWeight: 500 }, children: [
            formatAmount(tx.amount),
            " ",
            symbol
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { display: "flex", gap: "8px", fontSize: "0.75rem" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { style: { ...styles.mono, color: colors.textMuted }, children: [
            tx.signature.slice(0, 8),
            "...",
            tx.signature.slice(-8)
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { style: getStatusStyle(tx.status), children: tx.status })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("div", { style: { textAlign: "right" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("div", { style: { fontSize: "0.8125rem", color: colors.textMuted }, children: formatTime(tx.timestamp) }),
        /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
          "a",
          {
            href: `https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { ...styles.link, fontSize: "0.75rem" },
            children: "View"
          }
        )
      ] })
    ] }, tx.signature)) })
  ] });
}

// src/components/OrderBook.tsx
var import_hooks8 = require("@cloakcraft/hooks");
var import_jsx_runtime8 = require("react/jsx-runtime");
function OrderBook({ className }) {
  const { orders, isLoading, error, refresh } = (0, import_hooks8.useOrders)();
  const formatExpiry = (timestamp) => {
    const date = new Date(timestamp * 1e3);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };
  const getStatusBadge = (status) => {
    const styles2 = {
      0: { bg: "#dcfce7", text: "#166534", label: "Open" },
      1: { bg: "#dbeafe", text: "#1e40af", label: "Filled" },
      2: { bg: "#fee2e2", text: "#991b1b", label: "Cancelled" }
    };
    const style = styles2[status] ?? { bg: "#f3f4f6", text: "#374151", label: "Unknown" };
    return /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
      "span",
      {
        style: {
          padding: "2px 8px",
          borderRadius: "9999px",
          backgroundColor: style.bg,
          color: style.text,
          fontSize: "0.75rem",
          fontWeight: 500
        },
        children: style.label
      }
    );
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("h3", { style: { margin: 0 }, children: "Order Book" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
        "button",
        {
          onClick: refresh,
          disabled: isLoading,
          style: {
            padding: "4px 12px",
            borderRadius: "4px",
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: isLoading ? "wait" : "pointer"
          },
          children: isLoading ? "Loading..." : "Refresh"
        }
      )
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { color: "#ef4444", padding: "12px", background: "#fee2e2", borderRadius: "8px", marginBottom: "12px" }, children: error }),
    orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { style: { color: "#6b7280", textAlign: "center", padding: "24px" }, children: "No open orders. Create an order to start trading." }) : /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("tr", { style: { borderBottom: "2px solid #e5e7eb" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("th", { style: { textAlign: "left", padding: "8px" }, children: "Order ID" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("th", { style: { textAlign: "left", padding: "8px" }, children: "Status" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("th", { style: { textAlign: "left", padding: "8px" }, children: "Expiry" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("th", { style: { textAlign: "right", padding: "8px" }, children: "Actions" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("tbody", { children: orders.map((order, index) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("tr", { style: { borderBottom: "1px solid #e5e7eb" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("td", { style: { padding: "12px 8px", fontFamily: "monospace", fontSize: "0.875rem" }, children: [
          Buffer.from(order.orderId).toString("hex").slice(0, 16),
          "..."
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("td", { style: { padding: "12px 8px" }, children: getStatusBadge(order.status) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("td", { style: { padding: "12px 8px", fontSize: "0.875rem" }, children: formatExpiry(order.expiry) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("td", { style: { padding: "12px 8px", textAlign: "right" }, children: order.status === 0 && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(
          "button",
          {
            style: {
              padding: "4px 8px",
              borderRadius: "4px",
              border: "1px solid #6366f1",
              background: "white",
              color: "#6366f1",
              cursor: "pointer",
              fontSize: "0.75rem"
            },
            children: "Fill"
          }
        ) })
      ] }, index)) })
    ] }) })
  ] });
}

// src/components/InitializePoolForm.tsx
var import_react6 = require("react");
var import_web32 = require("@solana/web3.js");
var import_hooks9 = require("@cloakcraft/hooks");
var import_jsx_runtime9 = require("react/jsx-runtime");
function InitializePoolForm({
  onSuccess,
  onError,
  className,
  payer,
  walletPublicKey,
  defaultTokenMint
}) {
  const [tokenMintInput, setTokenMintInput] = (0, import_react6.useState)(defaultTokenMint?.toBase58() ?? "");
  const [validMint, setValidMint] = (0, import_react6.useState)(defaultTokenMint ?? null);
  const { isInitializing, error, result, initializePool, initializePoolWithWallet, reset } = (0, import_hooks9.useInitializePool)();
  const { pool, exists, isLoading: isCheckingPool } = (0, import_hooks9.usePool)(validMint ?? void 0);
  const { client } = (0, import_hooks9.useCloakCraft)();
  const handleMintChange = (value) => {
    setTokenMintInput(value);
    reset();
    try {
      if (value.trim().length > 0) {
        const mint = new import_web32.PublicKey(value.trim());
        setValidMint(mint);
      } else {
        setValidMint(null);
      }
    } catch {
      setValidMint(null);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    if (!validMint) {
      onError?.("Invalid token mint address");
      return;
    }
    if (!payer && !walletPublicKey) {
      onError?.("No wallet connected");
      return;
    }
    if (!client?.getProgram()) {
      onError?.("Program not configured. Call setProgram() first.");
      return;
    }
    let txResult;
    if (payer) {
      txResult = await initializePool(validMint, payer);
    } else if (walletPublicKey) {
      txResult = await initializePoolWithWallet(validMint, walletPublicKey);
    }
    if (txResult) {
      onSuccess?.(txResult.poolTx, txResult.counterTx);
      setTokenMintInput("");
      setValidMint(null);
    } else if (error) {
      onError?.(error);
    }
  };
  const isValidInput = validMint !== null;
  const poolAlreadyExists = isValidInput && exists;
  const hasWallet = !!payer || !!walletPublicKey;
  const isDisabled = !isValidInput || isInitializing || poolAlreadyExists || !hasWallet;
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("h3", { style: styles.cardTitle, children: "Initialize Pool" }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { style: styles.cardDescription, children: "Create a new privacy pool for any SPL token. Each token needs its own pool." }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("label", { style: styles.label, children: [
        "Token Mint Address",
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "input",
          {
            type: "text",
            value: tokenMintInput,
            onChange: (e) => handleMintChange(e.target.value),
            placeholder: "Enter SPL token mint address",
            disabled: isInitializing,
            style: {
              ...styles.input,
              fontFamily: "monospace",
              fontSize: "0.875rem",
              borderColor: tokenMintInput && !isValidInput ? colors.error : colors.border
            }
          }
        )
      ] }),
      tokenMintInput && !isValidInput && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: styles.errorText, children: "Invalid token mint address" }),
      isCheckingPool && validMint && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: "Checking if pool exists..." }),
      poolAlreadyExists && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: styles.warningBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: { fontWeight: 500, marginBottom: "4px" }, children: "Pool Already Exists" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { fontSize: "0.8125rem", color: colors.textMuted }, children: [
          "A pool for this token has already been initialized. Total shielded: ",
          pool?.totalShielded?.toString() ?? "0"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
        "button",
        {
          type: "submit",
          disabled: isDisabled,
          style: {
            ...styles.buttonPrimary,
            ...isDisabled ? styles.buttonDisabled : {}
          },
          children: isInitializing ? "Initializing..." : "Initialize Pool"
        }
      ),
      error && /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: styles.errorText, children: error }),
      result && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: styles.successBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { style: styles.successText, children: "Pool initialized successfully!" }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { style: { marginTop: "8px", fontSize: "0.8125rem" }, children: [
          result.poolTx !== "already_exists" && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
            "Pool TX:",
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "a",
              {
                href: `https://explorer.solana.com/tx/${result.poolTx}?cluster=devnet`,
                target: "_blank",
                rel: "noopener noreferrer",
                style: styles.link,
                children: [
                  result.poolTx.slice(0, 8),
                  "..."
                ]
              }
            )
          ] }),
          result.counterTx !== "already_exists" && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { children: [
            "Counter TX:",
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
              "a",
              {
                href: `https://explorer.solana.com/tx/${result.counterTx}?cluster=devnet`,
                target: "_blank",
                rel: "noopener noreferrer",
                style: styles.link,
                children: [
                  result.counterTx.slice(0, 8),
                  "..."
                ]
              }
            )
          ] })
        ] })
      ] })
    ] })
  ] });
}

// src/components/PoolInfo.tsx
var import_react7 = __toESM(require("react"));
var import_hooks10 = require("@cloakcraft/hooks");
var import_jsx_runtime10 = require("react/jsx-runtime");
function PoolInfo({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  className
}) {
  const { pool, poolPda, isLoading, error, refresh, exists } = (0, import_hooks10.usePool)(tokenMint);
  const formatAmount = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 4)}`;
  };
  const truncateAddress = (address) => {
    if (!address) return "---";
    const str = address.toBase58();
    return `${str.slice(0, 4)}...${str.slice(-4)}`;
  };
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { className, style: styles.card, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: styles.emptyState, children: "Loading pool info..." }) });
  }
  if (!exists) {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className, style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h3", { style: styles.cardTitle, children: "Pool Not Found" }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: styles.emptyState, children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { marginBottom: "8px" }, children: "No pool exists for this token" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { fontSize: "0.8125rem", color: colors.textLight, marginBottom: "16px" }, children: "Initialize a pool first to enable private transfers" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "grid", gap: "12px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          InfoRow,
          {
            label: "Pool Address (PDA)",
            value: truncateAddress(poolPda),
            copyValue: poolPda?.toBase58()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          InfoRow,
          {
            label: "Token Mint",
            value: truncateAddress(tokenMint),
            copyValue: tokenMint.toBase58()
          }
        )
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("h3", { style: { ...styles.cardTitle, margin: 0 }, children: "Pool Info" }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "button",
        {
          onClick: refresh,
          disabled: isLoading,
          style: {
            ...styles.buttonSecondary,
            ...styles.buttonSmall
          },
          children: "Refresh"
        }
      )
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { ...styles.errorText, marginBottom: "12px" }, children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: styles.stack, children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: {
        padding: "16px",
        background: colors.backgroundDark,
        borderRadius: "8px",
        textAlign: "center"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginBottom: "4px" }, children: "Total Shielded" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { fontSize: "1.5rem", fontWeight: 600 }, children: [
          formatAmount(pool?.totalShielded ?? 0n),
          " ",
          symbol
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "grid", gap: "12px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          InfoRow,
          {
            label: "Pool Address",
            value: truncateAddress(poolPda),
            copyValue: poolPda?.toBase58()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          InfoRow,
          {
            label: "Token Mint",
            value: truncateAddress(tokenMint),
            copyValue: tokenMint.toBase58()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          InfoRow,
          {
            label: "Token Vault",
            value: truncateAddress(pool?.tokenVault ?? null),
            copyValue: pool?.tokenVault?.toBase58()
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          InfoRow,
          {
            label: "Authority",
            value: truncateAddress(pool?.authority ?? null),
            copyValue: pool?.authority?.toBase58()
          }
        )
      ] })
    ] })
  ] });
}
function InfoRow({
  label,
  value,
  copyValue
}) {
  const [copied, setCopied] = import_react7.default.useState(false);
  const handleCopy = async () => {
    if (!copyValue) return;
    try {
      await navigator.clipboard.writeText(copyValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch {
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: styles.spaceBetween, children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { ...styles.mono, fontSize: "0.875rem" }, children: value }),
      copyValue && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
        "button",
        {
          onClick: handleCopy,
          style: {
            ...styles.buttonSecondary,
            padding: "2px 6px",
            fontSize: "0.6875rem"
          },
          children: copied ? "Copied" : "Copy"
        }
      )
    ] })
  ] });
}
function PoolStatusBadge({ tokenMint }) {
  const { exists, isLoading } = (0, import_hooks10.usePool)(tokenMint);
  if (isLoading) {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { ...styles.badge, backgroundColor: colors.backgroundDark }, children: "..." });
  }
  if (exists) {
    return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { ...styles.badge, ...styles.badgeSuccess }, children: "Pool Active" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("span", { style: { ...styles.badge, ...styles.badgeWarning }, children: "No Pool" });
}

// src/components/TokenSelector.tsx
var import_react8 = require("react");
var import_web33 = require("@solana/web3.js");
var import_hooks11 = require("@cloakcraft/hooks");
var import_jsx_runtime11 = require("react/jsx-runtime");
function TokenSelector({
  tokens,
  selected,
  onSelect,
  showPoolStatus = true,
  allowCustom = false,
  className
}) {
  const [isOpen, setIsOpen] = (0, import_react8.useState)(false);
  const [customMint, setCustomMint] = (0, import_react8.useState)("");
  const [showCustomInput, setShowCustomInput] = (0, import_react8.useState)(false);
  const selectedToken = tokens.find((t) => selected && t.mint.equals(selected));
  const handleSelect = (token) => {
    onSelect(token);
    setIsOpen(false);
    setShowCustomInput(false);
  };
  const handleCustomSubmit = () => {
    try {
      const mint = new import_web33.PublicKey(customMint.trim());
      onSelect({
        mint,
        symbol: "CUSTOM",
        name: "Custom Token",
        decimals: 9
      });
      setIsOpen(false);
      setShowCustomInput(false);
      setCustomMint("");
    } catch {
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className, style: { position: "relative" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      "button",
      {
        onClick: () => setIsOpen(!isOpen),
        style: {
          ...styles.buttonSecondary,
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
            selectedToken?.logoUri && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
              "img",
              {
                src: selectedToken.logoUri,
                alt: selectedToken.symbol,
                style: { width: 24, height: 24, borderRadius: "50%" }
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { style: { fontWeight: 500 }, children: selectedToken?.symbol ?? "Select Token" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { style: { color: colors.textMuted }, children: isOpen ? "\u25B2" : "\u25BC" })
        ]
      }
    ),
    isOpen && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
      "div",
      {
        style: {
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: "4px",
          backgroundColor: colors.background,
          border: `1px solid ${colors.border}`,
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          zIndex: 100,
          maxHeight: "300px",
          overflowY: "auto"
        },
        children: [
          tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            TokenOption,
            {
              token,
              isSelected: selected ? token.mint.equals(selected) : false,
              showPoolStatus,
              onClick: () => handleSelect(token)
            },
            token.mint.toBase58()
          )),
          allowCustom && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { borderTop: `1px solid ${colors.border}`, margin: "4px 0" } }),
            showCustomInput ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { padding: "8px 12px" }, children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                "input",
                {
                  type: "text",
                  value: customMint,
                  onChange: (e) => setCustomMint(e.target.value),
                  placeholder: "Enter token mint address",
                  style: {
                    ...styles.input,
                    fontSize: "0.8125rem",
                    padding: "8px",
                    marginBottom: "8px"
                  },
                  autoFocus: true
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", gap: "8px" }, children: [
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  "button",
                  {
                    onClick: () => setShowCustomInput(false),
                    style: { ...styles.buttonSecondary, ...styles.buttonSmall, flex: 1 },
                    children: "Cancel"
                  }
                ),
                /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
                  "button",
                  {
                    onClick: handleCustomSubmit,
                    disabled: !customMint.trim(),
                    style: {
                      ...styles.buttonPrimary,
                      ...styles.buttonSmall,
                      flex: 1,
                      ...!customMint.trim() ? styles.buttonDisabled : {}
                    },
                    children: "Add"
                  }
                )
              ] })
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
              "button",
              {
                onClick: () => setShowCustomInput(true),
                style: {
                  width: "100%",
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  textAlign: "left",
                  cursor: "pointer",
                  color: colors.primary,
                  fontSize: "0.875rem"
                },
                children: "+ Add Custom Token"
              }
            )
          ] }),
          tokens.length === 0 && !allowCustom && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { ...styles.emptyState, padding: "16px" }, children: "No tokens available" })
        ]
      }
    ),
    isOpen && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
      "div",
      {
        style: {
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 99
        },
        onClick: () => {
          setIsOpen(false);
          setShowCustomInput(false);
        }
      }
    )
  ] });
}
function TokenOption({
  token,
  isSelected,
  showPoolStatus,
  onClick
}) {
  const { exists, isLoading } = (0, import_hooks11.usePool)(showPoolStatus ? token.mint : void 0);
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(
    "button",
    {
      onClick,
      style: {
        width: "100%",
        padding: "12px 16px",
        background: isSelected ? colors.backgroundMuted : "none",
        border: "none",
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
          token.logoUri && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            "img",
            {
              src: token.logoUri,
              alt: token.symbol,
              style: { width: 24, height: 24, borderRadius: "50%" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { fontWeight: 500 }, children: token.symbol }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: token.name })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
          showPoolStatus && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(
            "span",
            {
              style: {
                ...styles.badge,
                ...isLoading ? { backgroundColor: colors.backgroundDark } : exists ? styles.badgeSuccess : styles.badgeWarning
              },
              children: isLoading ? "..." : exists ? "Active" : "No Pool"
            }
          ),
          isSelected && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("span", { style: { color: colors.primary }, children: "\u2713" })
        ] })
      ]
    }
  );
}
var DEVNET_TOKENS = [
  {
    mint: new import_web33.PublicKey("So11111111111111111111111111111111111111112"),
    symbol: "SOL",
    name: "Wrapped SOL",
    decimals: 9
  },
  {
    mint: new import_web33.PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
    symbol: "USDC",
    name: "USD Coin (Devnet)",
    decimals: 6
  },
  {
    mint: new import_web33.PublicKey("2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm"),
    symbol: "TEST",
    name: "CloakCraft Test Token",
    decimals: 6
  }
];
var MAINNET_TOKENS = [
  {
    mint: new import_web33.PublicKey("So11111111111111111111111111111111111111112"),
    symbol: "SOL",
    name: "Wrapped SOL",
    decimals: 9
  },
  {
    mint: new import_web33.PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6
  },
  {
    mint: new import_web33.PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6
  }
];

// src/components/PublicBalanceDisplay.tsx
var import_react9 = __toESM(require("react"));
var import_hooks12 = require("@cloakcraft/hooks");
var import_jsx_runtime12 = require("react/jsx-runtime");
function PublicBalanceDisplay({
  owner,
  token,
  showSol = true,
  compact = false,
  className
}) {
  const { balance: solBalance, isLoading: solLoading } = (0, import_hooks12.useSolBalance)(owner);
  const {
    balance: tokenBalance,
    isLoading: tokenLoading,
    refresh
  } = (0, import_hooks12.usePublicBalance)(token?.mint, owner);
  const formatAmount = (amount, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };
  const formatSol = (lamports) => {
    return formatAmount(lamports, 9);
  };
  if (compact) {
    return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className, style: { display: "flex", gap: "16px", alignItems: "center" }, children: [
      showSol && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "4px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: "SOL:" }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { fontWeight: 500 }, children: solLoading ? "..." : formatSol(solBalance) })
      ] }),
      token && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "4px" }, children: [
        token.logoUri && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
          "img",
          {
            src: token.logoUri,
            alt: token.symbol,
            style: { width: 16, height: 16, borderRadius: "50%" }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: [
          token.symbol,
          ":"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { fontWeight: 500 }, children: tokenLoading ? "..." : formatAmount(tokenBalance, token.decimals) })
      ] })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { style: { ...styles.cardTitle, margin: 0 }, children: "Public Balance" }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        "button",
        {
          onClick: refresh,
          style: { ...styles.buttonSecondary, ...styles.buttonSmall },
          children: "Refresh"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "grid", gap: "12px" }, children: [
      showSol && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        BalanceRow,
        {
          symbol: "SOL",
          name: "Solana",
          balance: solBalance,
          decimals: 9,
          isLoading: solLoading
        }
      ),
      token && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        BalanceRow,
        {
          symbol: token.symbol,
          name: token.name,
          balance: tokenBalance,
          decimals: token.decimals,
          logoUri: token.logoUri,
          isLoading: tokenLoading
        }
      ),
      !token && !showSol && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: styles.emptyState, children: "No tokens to display" })
    ] })
  ] });
}
function MultiTokenBalanceDisplay({
  owner,
  tokens,
  showSol = true,
  className
}) {
  const tokenMints = import_react9.default.useMemo(() => tokens.map((t) => t.mint), [tokens]);
  const { balance: solBalance, isLoading: solLoading, refresh: refreshSol } = (0, import_hooks12.useSolBalance)(owner);
  const { balances, getBalance, isLoading, refresh } = (0, import_hooks12.useTokenBalances)(
    tokenMints,
    owner
  );
  const handleRefresh = () => {
    refresh();
    refreshSol();
  };
  const tokensWithBalance = tokens.filter((token) => {
    const balance = getBalance(token.mint);
    return balance > BigInt(0);
  });
  const hasSolBalance = solBalance > BigInt(0);
  const hasAnyBalance = hasSolBalance || tokensWithBalance.length > 0;
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { style: { ...styles.cardTitle, margin: 0 }, children: "Public Balances" }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        "button",
        {
          onClick: handleRefresh,
          disabled: isLoading || solLoading,
          style: { ...styles.buttonSecondary, ...styles.buttonSmall },
          children: "Refresh All"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "grid", gap: "8px" }, children: [
      !isLoading && !solLoading && !hasAnyBalance && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: styles.emptyState, children: "No public balances yet" }),
      showSol && hasSolBalance && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        BalanceRow,
        {
          symbol: "SOL",
          name: "Solana",
          balance: solBalance,
          decimals: 9,
          isLoading: solLoading
        }
      ),
      tokensWithBalance.map((token) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
        BalanceRow,
        {
          symbol: token.symbol,
          name: token.name,
          balance: getBalance(token.mint),
          decimals: token.decimals,
          logoUri: token.logoUri,
          isLoading
        },
        token.mint.toBase58()
      ))
    ] })
  ] });
}
function BalanceRow({
  symbol,
  name,
  balance,
  decimals,
  logoUri,
  isLoading
}) {
  const formatAmount = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px",
        background: colors.backgroundMuted,
        borderRadius: "8px"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "10px" }, children: [
          logoUri ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            "img",
            {
              src: logoUri,
              alt: symbol,
              style: { width: 28, height: 28, borderRadius: "50%" }
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)(
            "div",
            {
              style: {
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: colors.backgroundDark,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 600
              },
              children: symbol.slice(0, 2)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { fontWeight: 500 }, children: symbol }),
            /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: name })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("div", { style: { textAlign: "right" }, children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { color: colors.textMuted }, children: "Loading..." }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { fontWeight: 600, fontSize: "1.125rem" }, children: formatAmount(balance) }) })
      ]
    }
  );
}
function BalanceSummary({
  owner,
  token,
  className
}) {
  const { balance: solBalance, isLoading: solLoading } = (0, import_hooks12.useSolBalance)(owner);
  const { balance: tokenBalance, isLoading: tokenLoading } = (0, import_hooks12.usePublicBalance)(
    token?.mint,
    owner
  );
  const formatSol = (lamports) => {
    const sol = Number(lamports) / 1e9;
    return sol.toFixed(2);
  };
  const formatToken = (amount, decimals) => {
    const value = Number(amount) / 10 ** decimals;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return value.toFixed(2);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(
    "div",
    {
      className,
      style: {
        display: "flex",
        gap: "12px",
        fontSize: "0.875rem"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "4px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { color: colors.textMuted }, children: "SOL" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { fontWeight: 500 }, children: solLoading ? "..." : formatSol(solBalance) })
        ] }),
        token && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "4px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { color: colors.textMuted }, children: token.symbol }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { style: { fontWeight: 500 }, children: tokenLoading ? "..." : formatToken(tokenBalance, token.decimals) })
        ] })
      ]
    }
  );
}

// src/components/MultiPrivateBalanceDisplay.tsx
var import_react10 = __toESM(require("react"));
var import_hooks13 = require("@cloakcraft/hooks");
var import_jsx_runtime13 = require("react/jsx-runtime");
function MultiPrivateBalanceDisplay({
  tokens,
  className
}) {
  const [isRefreshing, setIsRefreshing] = import_react10.default.useState(false);
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 500);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("h3", { style: { ...styles.cardTitle, margin: 0 }, children: "Private Balances" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
        "button",
        {
          onClick: handleRefreshAll,
          disabled: isRefreshing,
          style: { ...styles.buttonSecondary, ...styles.buttonSmall },
          children: isRefreshing ? "Refreshing..." : "Refresh All"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: { display: "grid", gap: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(PrivateBalanceRows, { tokens }) })
  ] });
}
function PrivateBalanceRows({ tokens }) {
  const balances = tokens.map((token) => {
    const { totalAvailable } = (0, import_hooks13.useNoteSelector)(token.mint);
    return { token, balance: totalAvailable };
  });
  const tokensWithBalance = balances.filter(({ balance }) => balance > BigInt(0));
  if (tokensWithBalance.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: styles.emptyState, children: "No private balances yet" });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(import_jsx_runtime13.Fragment, { children: tokensWithBalance.map(({ token, balance }) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(PrivateBalanceRow, { token, totalAvailable: balance }, token.mint.toBase58())) });
}
function PrivateBalanceRow({ token, totalAvailable }) {
  const formatAmount = (amount) => {
    const divisor = BigInt(10 ** token.decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(token.decimals, "0").slice(0, 4);
    return `${whole.toLocaleString()}.${fractionalStr}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px",
        background: colors.backgroundMuted,
        borderRadius: "8px"
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { style: { display: "flex", alignItems: "center", gap: "10px" }, children: [
          token.logoUri ? /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            "img",
            {
              src: token.logoUri,
              alt: token.symbol,
              style: { width: 28, height: 28, borderRadius: "50%" }
            }
          ) : /* @__PURE__ */ (0, import_jsx_runtime13.jsx)(
            "div",
            {
              style: {
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: colors.backgroundDark,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 600
              },
              children: token.symbol.slice(0, 2)
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: { fontWeight: 500 }, children: token.symbol }),
            /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: token.name })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("div", { style: { textAlign: "right" }, children: /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("span", { style: { fontWeight: 600, fontSize: "1.125rem" }, children: formatAmount(totalAvailable) }) })
      ]
    }
  );
}

// src/components/WalletBackup.tsx
var import_react11 = __toESM(require("react"));
var import_hooks14 = require("@cloakcraft/hooks");
var import_jsx_runtime14 = require("react/jsx-runtime");
function WalletBackup({ className, onBackupComplete }) {
  const { wallet, publicKey, isConnected, exportSpendingKey } = (0, import_hooks14.useWallet)();
  const [showKey, setShowKey] = (0, import_react11.useState)(false);
  const [copied, setCopied] = (0, import_react11.useState)(false);
  const [acknowledged, setAcknowledged] = (0, import_react11.useState)(false);
  const spendingKeyHex = import_react11.default.useMemo(() => {
    if (!showKey) return null;
    const key = exportSpendingKey();
    if (!key) return null;
    return Buffer.from(key).toString("hex");
  }, [showKey, exportSpendingKey]);
  const handleCopy = (0, import_react11.useCallback)(async () => {
    if (!spendingKeyHex) return;
    try {
      await navigator.clipboard.writeText(spendingKeyHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 3e3);
    } catch {
    }
  }, [spendingKeyHex]);
  const handleDownload = (0, import_react11.useCallback)(() => {
    if (!spendingKeyHex || !publicKey) return;
    const backupData = {
      version: 1,
      type: "cloakcraft-spending-key",
      publicKey: publicKey.toString(),
      spendingKey: spendingKeyHex,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cloakcraft-backup-${publicKey.toString().slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onBackupComplete?.();
  }, [spendingKeyHex, publicKey, onBackupComplete]);
  if (!isConnected || !wallet) {
    return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className, style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h3", { style: styles.cardTitle, children: "Wallet Backup" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: styles.emptyState, children: "Connect your wallet to backup your keys" })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h3", { style: styles.cardTitle, children: "Wallet Backup" }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { style: styles.cardDescription, children: "Export your spending key to backup your wallet. This key controls all your shielded funds - keep it safe!" }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { ...styles.stack, marginBottom: "16px" }, children: /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
      "div",
      {
        style: {
          padding: "12px",
          background: colors.backgroundMuted,
          borderRadius: "8px"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginBottom: "4px" }, children: "Stealth Public Key" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            "div",
            {
              style: {
                ...styles.mono,
                fontSize: "0.8125rem",
                wordBreak: "break-all"
              },
              children: publicKey?.toString() ?? "Unknown"
            }
          )
        ]
      }
    ) }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { ...styles.warningBox, marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontWeight: 500, marginBottom: "4px" }, children: "Security Warning" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("ul", { style: { margin: 0, paddingLeft: "20px", fontSize: "0.8125rem" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("li", { children: "Never share your spending key with anyone" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("li", { children: "Anyone with this key can spend your shielded funds" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("li", { children: "Store backups in a secure, offline location" })
      ] })
    ] }),
    !showKey && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
      "label",
      {
        style: {
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          marginBottom: "16px",
          cursor: "pointer",
          fontSize: "0.875rem"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            "input",
            {
              type: "checkbox",
              checked: acknowledged,
              onChange: (e) => setAcknowledged(e.target.checked),
              style: { marginTop: "2px" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { children: "I understand that my spending key gives full access to my shielded funds and I will store it securely" })
        ]
      }
    ),
    !showKey ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
      "button",
      {
        onClick: () => setShowKey(true),
        disabled: !acknowledged,
        style: {
          ...styles.buttonSecondary,
          width: "100%",
          ...!acknowledged ? styles.buttonDisabled : {}
        },
        children: "Reveal Spending Key"
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: styles.stack, children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
        "div",
        {
          style: {
            padding: "12px",
            background: colors.backgroundDark,
            borderRadius: "8px",
            border: `1px solid ${colors.warning}`
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
              "div",
              {
                style: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px"
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { style: { fontSize: "0.75rem", color: colors.warning }, children: "Spending Key (64 bytes hex)" }),
                  /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
                    "button",
                    {
                      onClick: handleCopy,
                      style: { ...styles.buttonSecondary, ...styles.buttonSmall },
                      children: copied ? "Copied!" : "Copy"
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              "div",
              {
                style: {
                  ...styles.mono,
                  fontSize: "0.6875rem",
                  wordBreak: "break-all",
                  color: colors.text,
                  lineHeight: 1.5
                },
                children: spendingKeyHex
              }
            )
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", gap: "8px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
          "button",
          {
            onClick: () => {
              setShowKey(false);
              setAcknowledged(false);
            },
            style: { ...styles.buttonSecondary, flex: 1 },
            children: "Hide Key"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: handleDownload, style: { ...styles.buttonPrimary, flex: 1 }, children: "Download Backup" })
      ] })
    ] })
  ] });
}
function WalletImport({ className, onImportSuccess, onError }) {
  const { importFromKey, isConnecting } = (0, import_hooks14.useWallet)();
  const [keyInput, setKeyInput] = (0, import_react11.useState)("");
  const [importMethod, setImportMethod] = (0, import_react11.useState)("paste");
  const [error, setError] = (0, import_react11.useState)(null);
  const handlePasteImport = async () => {
    setError(null);
    try {
      const trimmed = keyInput.trim();
      let keyHex = trimmed;
      if (trimmed.startsWith("{")) {
        const backup = JSON.parse(trimmed);
        if (backup.spendingKey) {
          keyHex = backup.spendingKey;
        } else {
          throw new Error("Invalid backup format: missing spendingKey");
        }
      }
      const keyBytes = new Uint8Array(
        keyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
      );
      if (keyBytes.length !== 32) {
        throw new Error("Invalid key length: expected 32 bytes");
      }
      await importFromKey(keyBytes);
      setKeyInput("");
      onImportSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import wallet";
      setError(message);
      onError?.(message);
    }
  };
  const handleFileImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      if (!backup.spendingKey) {
        throw new Error("Invalid backup file: missing spendingKey");
      }
      const keyBytes = new Uint8Array(
        backup.spendingKey.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
      );
      if (keyBytes.length !== 32) {
        throw new Error("Invalid key length in backup file");
      }
      await importFromKey(keyBytes);
      onImportSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to import backup file";
      setError(message);
      onError?.(message);
    }
    e.target.value = "";
  };
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h3", { style: styles.cardTitle, children: "Import Wallet" }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { style: styles.cardDescription, children: "Restore your wallet from a backup file or spending key" }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: { display: "flex", gap: "8px", marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
        "button",
        {
          onClick: () => setImportMethod("paste"),
          style: {
            ...styles.buttonSecondary,
            flex: 1,
            ...importMethod === "paste" ? { background: colors.primary, color: "#fff" } : {}
          },
          children: "Paste Key"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
        "button",
        {
          onClick: () => setImportMethod("file"),
          style: {
            ...styles.buttonSecondary,
            flex: 1,
            ...importMethod === "file" ? { background: colors.primary, color: "#fff" } : {}
          },
          children: "Upload File"
        }
      )
    ] }),
    importMethod === "paste" ? /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: styles.stack, children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
        "textarea",
        {
          value: keyInput,
          onChange: (e) => setKeyInput(e.target.value),
          placeholder: "Paste your spending key (hex) or backup JSON...",
          rows: 4,
          style: {
            ...styles.input,
            fontFamily: "monospace",
            fontSize: "0.75rem",
            resize: "vertical"
          }
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
        "button",
        {
          onClick: handlePasteImport,
          disabled: !keyInput.trim() || isConnecting,
          style: {
            ...styles.buttonPrimary,
            ...!keyInput.trim() || isConnecting ? styles.buttonDisabled : {}
          },
          children: isConnecting ? "Importing..." : "Import Wallet"
        }
      )
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
      "label",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "32px",
          border: `2px dashed ${colors.border}`,
          borderRadius: "8px",
          cursor: "pointer",
          textAlign: "center"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            "input",
            {
              type: "file",
              accept: ".json",
              onChange: handleFileImport,
              style: { display: "none" }
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: "2rem", marginBottom: "8px" }, children: "+" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontWeight: 500 }, children: "Choose Backup File" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: ".json files only" })
        ]
      }
    ) }),
    error && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { ...styles.errorText, marginTop: "12px" }, children: error })
  ] });
}
function WalletManager({ className }) {
  const { isConnected } = (0, import_hooks14.useWallet)();
  const [activeTab, setActiveTab] = (0, import_react11.useState)(
    isConnected ? "backup" : "import"
  );
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(
      "div",
      {
        style: {
          display: "flex",
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: "16px"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            "button",
            {
              onClick: () => setActiveTab("backup"),
              style: {
                flex: 1,
                padding: "12px",
                background: "none",
                border: "none",
                borderBottom: activeTab === "backup" ? `2px solid ${colors.primary}` : "none",
                color: activeTab === "backup" ? colors.primary : colors.textMuted,
                fontWeight: activeTab === "backup" ? 500 : 400,
                cursor: "pointer"
              },
              children: "Backup"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            "button",
            {
              onClick: () => setActiveTab("import"),
              style: {
                flex: 1,
                padding: "12px",
                background: "none",
                border: "none",
                borderBottom: activeTab === "import" ? `2px solid ${colors.primary}` : "none",
                color: activeTab === "import" ? colors.primary : colors.textMuted,
                fontWeight: activeTab === "import" ? 500 : 400,
                cursor: "pointer"
              },
              children: "Import"
            }
          )
        ]
      }
    ),
    activeTab === "backup" ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(WalletBackup, {}) : /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(WalletImport, {})
  ] });
}

// src/components/SwapPanel.tsx
var import_react15 = require("react");

// src/components/SwapForm.tsx
var import_react12 = require("react");
var import_hooks15 = require("@cloakcraft/hooks");
var import_sdk2 = require("@cloakcraft/sdk");
var import_jsx_runtime15 = require("react/jsx-runtime");
function SwapForm({
  tokens,
  onSuccess,
  onError,
  className,
  walletPublicKey
}) {
  const [inputToken, setInputToken] = (0, import_react12.useState)(tokens[0]);
  const [outputToken, setOutputToken] = (0, import_react12.useState)(tokens[1] || tokens[0]);
  const [inputAmount, setInputAmount] = (0, import_react12.useState)("");
  const [slippageBps, setSlippageBps] = (0, import_react12.useState)(50);
  const [isSwapping, setIsSwapping] = (0, import_react12.useState)(false);
  const { isConnected, isInitialized, wallet } = (0, import_hooks15.useWallet)();
  const { client } = (0, import_hooks15.useCloakCraft)();
  const { availableNotes, totalAvailable, selectNotesForAmount } = (0, import_hooks15.useNoteSelector)(inputToken.mint);
  const mockReserveIn = 1000000n * BigInt(10 ** inputToken.decimals);
  const mockReserveOut = 1000000n * BigInt(10 ** outputToken.decimals);
  const formatAmount = (value, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 4)}`;
  };
  const swapQuote = (0, import_react12.useMemo)(() => {
    const amountNum = parseFloat(inputAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return null;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** inputToken.decimals));
    try {
      const { outputAmount, priceImpact } = (0, import_sdk2.calculateSwapOutput)(
        amountLamports,
        mockReserveIn,
        mockReserveOut,
        30
        // 0.3% fee
      );
      const minOutput = (0, import_sdk2.calculateMinOutput)(outputAmount, slippageBps);
      return {
        outputAmount,
        minOutput,
        priceImpact,
        priceRatio: Number(mockReserveOut) / Number(mockReserveIn)
      };
    } catch (err) {
      return null;
    }
  }, [inputAmount, inputToken.decimals, mockReserveIn, mockReserveOut, slippageBps]);
  const handleSwapTokens = () => {
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setInputAmount("");
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(inputAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      onError?.("Please enter a valid amount");
      return;
    }
    if (inputToken.mint.equals(outputToken.mint)) {
      onError?.("Input and output tokens must be different");
      return;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** inputToken.decimals));
    if (!client?.getProgram()) {
      onError?.("Program not configured. Call setProgram() first.");
      return;
    }
    if (!swapQuote) {
      onError?.("Unable to calculate swap quote");
      return;
    }
    let selectedNotes;
    try {
      selectedNotes = selectNotesForAmount(amountLamports);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Insufficient balance");
      return;
    }
    if (selectedNotes.length !== 1) {
      onError?.("Swap requires exactly 1 input note. Please consolidate notes first.");
      return;
    }
    if (!wallet) {
      onError?.("Wallet not connected");
      return;
    }
    const { stealthAddress: outputAddress } = (0, import_sdk2.generateStealthAddress)(wallet.publicKey);
    const { stealthAddress: changeAddress } = (0, import_sdk2.generateStealthAddress)(wallet.publicKey);
    setIsSwapping(true);
    try {
      onError?.("Swap functionality not yet implemented");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setIsSwapping(false);
    }
  };
  const isDisabled = !isConnected || !isInitialized || isSwapping || !inputAmount || !swapQuote;
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("h3", { style: styles.cardTitle, children: "Swap Tokens" }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("p", { style: styles.cardDescription, children: "Exchange tokens privately using the AMM pool" }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("label", { style: styles.label, children: "From" }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", gap: "8px", marginBottom: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "select",
          {
            value: inputToken.mint.toBase58(),
            onChange: (e) => {
              const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
              if (token) setInputToken(token);
            },
            disabled: isSwapping,
            style: { ...styles.input, flex: 1 },
            children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "input",
          {
            type: "number",
            value: inputAmount,
            onChange: (e) => setInputAmount(e.target.value),
            placeholder: "0.00",
            step: "any",
            min: "0",
            disabled: isSwapping,
            style: styles.input
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { ...styles.spaceBetween, marginTop: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: "Available" }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { style: { fontSize: "0.75rem", fontWeight: 600 }, children: [
            formatAmount(totalAvailable, inputToken.decimals),
            " ",
            inputToken.symbol
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", justifyContent: "center", margin: "8px 0" }, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        "button",
        {
          type: "button",
          onClick: handleSwapTokens,
          disabled: isSwapping,
          style: {
            background: colors.backgroundMuted,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            padding: "8px",
            cursor: "pointer",
            color: colors.text
          },
          children: "\u2193"
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("label", { style: styles.label, children: "To (estimated)" }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { display: "flex", gap: "8px", marginBottom: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "select",
          {
            value: outputToken.mint.toBase58(),
            onChange: (e) => {
              const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
              if (token) setOutputToken(token);
            },
            disabled: isSwapping,
            style: { ...styles.input, flex: 1 },
            children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          "div",
          {
            style: {
              ...styles.input,
              background: colors.backgroundMuted,
              color: colors.textMuted,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { children: swapQuote ? formatAmount(swapQuote.outputAmount, outputToken.decimals) : "0.00" }),
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: "0.875rem" }, children: outputToken.symbol })
            ]
          }
        )
      ] }),
      swapQuote && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: {
        background: colors.backgroundMuted,
        padding: "12px",
        borderRadius: "8px",
        fontSize: "0.875rem"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: colors.textMuted }, children: "Price Impact" }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { style: { color: swapQuote.priceImpact > 5 ? colors.error : colors.text }, children: [
            swapQuote.priceImpact.toFixed(2),
            "%"
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: colors.textMuted }, children: "Minimum Received" }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { children: [
            formatAmount(swapQuote.minOutput, outputToken.decimals),
            " ",
            outputToken.symbol
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: styles.spaceBetween, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { color: colors.textMuted }, children: "Slippage Tolerance" }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { children: [
            (slippageBps / 100).toFixed(2),
            "%"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("label", { style: styles.label, children: [
        "Slippage Tolerance (%)",
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "input",
          {
            type: "number",
            value: slippageBps / 100,
            onChange: (e) => setSlippageBps(Math.floor(parseFloat(e.target.value || "0") * 100)),
            placeholder: "0.5",
            step: "0.1",
            min: "0.1",
            max: "50",
            disabled: isSwapping,
            style: styles.input
          }
        )
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        "button",
        {
          type: "submit",
          disabled: isDisabled,
          style: {
            ...styles.buttonPrimary,
            ...isDisabled ? styles.buttonDisabled : {}
          },
          children: !isConnected ? "Connect Wallet" : !isInitialized ? "Initializing..." : isSwapping ? "Swapping..." : "Swap Tokens"
        }
      ),
      swapQuote && swapQuote.priceImpact > 10 && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { ...styles.errorText, background: colors.backgroundMuted, padding: "12px", borderRadius: "8px" }, children: "Warning: High price impact! Consider reducing swap amount." })
    ] })
  ] });
}

// src/components/AddLiquidityForm.tsx
var import_react13 = require("react");
var import_hooks16 = require("@cloakcraft/hooks");
var import_sdk3 = require("@cloakcraft/sdk");
var import_jsx_runtime16 = require("react/jsx-runtime");
function AddLiquidityForm({
  tokens,
  onSuccess,
  onError,
  className,
  walletPublicKey
}) {
  const [tokenA, setTokenA] = (0, import_react13.useState)(tokens[0]);
  const [tokenB, setTokenB] = (0, import_react13.useState)(tokens[1] || tokens[0]);
  const [amountA, setAmountA] = (0, import_react13.useState)("");
  const [amountB, setAmountB] = (0, import_react13.useState)("");
  const [isAdding, setIsAdding] = (0, import_react13.useState)(false);
  const { isConnected, isInitialized, wallet } = (0, import_hooks16.useWallet)();
  const { client } = (0, import_hooks16.useCloakCraft)();
  const { availableNotes: notesA, totalAvailable: totalA, selectNotesForAmount: selectA } = (0, import_hooks16.useNoteSelector)(tokenA.mint);
  const { availableNotes: notesB, totalAvailable: totalB, selectNotesForAmount: selectB } = (0, import_hooks16.useNoteSelector)(tokenB.mint);
  const mockReserveA = 1000000n * BigInt(10 ** tokenA.decimals);
  const mockReserveB = 1000000n * BigInt(10 ** tokenB.decimals);
  const mockLpSupply = 1000000n * 1000000000n;
  const formatAmount = (value, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 4)}`;
  };
  const liquidityQuote = (0, import_react13.useMemo)(() => {
    const amountANum = parseFloat(amountA);
    const amountBNum = parseFloat(amountB);
    if (isNaN(amountANum) || amountANum <= 0 || isNaN(amountBNum) || amountBNum <= 0) {
      return null;
    }
    const desiredA = BigInt(Math.floor(amountANum * 10 ** tokenA.decimals));
    const desiredB = BigInt(Math.floor(amountBNum * 10 ** tokenB.decimals));
    try {
      const { depositA, depositB, lpAmount } = (0, import_sdk3.calculateAddLiquidityAmounts)(
        desiredA,
        desiredB,
        mockReserveA,
        mockReserveB,
        mockLpSupply
      );
      return {
        depositA,
        depositB,
        lpAmount,
        shareOfPool: Number(lpAmount * 10000n / (mockLpSupply + lpAmount)) / 100
      };
    } catch (err) {
      return null;
    }
  }, [amountA, amountB, tokenA.decimals, tokenB.decimals, mockReserveA, mockReserveB, mockLpSupply]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountANum = parseFloat(amountA);
    const amountBNum = parseFloat(amountB);
    if (isNaN(amountANum) || amountANum <= 0 || isNaN(amountBNum) || amountBNum <= 0) {
      onError?.("Please enter valid amounts for both tokens");
      return;
    }
    if (tokenA.mint.equals(tokenB.mint)) {
      onError?.("Token A and Token B must be different");
      return;
    }
    if (!client?.getProgram()) {
      onError?.("Program not configured. Call setProgram() first.");
      return;
    }
    if (!liquidityQuote) {
      onError?.("Unable to calculate liquidity quote");
      return;
    }
    if (!wallet) {
      onError?.("Wallet not connected");
      return;
    }
    let selectedNotesA, selectedNotesB;
    try {
      selectedNotesA = selectA(liquidityQuote.depositA);
      selectedNotesB = selectB(liquidityQuote.depositB);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Insufficient balance");
      return;
    }
    if (selectedNotesA.length !== 1 || selectedNotesB.length !== 1) {
      onError?.("Add liquidity requires exactly 1 note per token. Please consolidate notes first.");
      return;
    }
    setIsAdding(true);
    try {
      onError?.("Add liquidity functionality not yet implemented");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Add liquidity failed");
    } finally {
      setIsAdding(false);
    }
  };
  const isDisabled = !isConnected || !isInitialized || isAdding || !amountA || !amountB || !liquidityQuote;
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("h3", { style: styles.cardTitle, children: "Add Liquidity" }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { style: styles.cardDescription, children: "Provide liquidity to earn fees from swaps" }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("label", { style: styles.label, children: "Token A" }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { display: "flex", gap: "8px", marginBottom: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          "select",
          {
            value: tokenA.mint.toBase58(),
            onChange: (e) => {
              const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
              if (token) setTokenA(token);
            },
            disabled: isAdding,
            style: { ...styles.input, flex: 1 },
            children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          "input",
          {
            type: "number",
            value: amountA,
            onChange: (e) => setAmountA(e.target.value),
            placeholder: "0.00",
            step: "any",
            min: "0",
            disabled: isAdding,
            style: styles.input
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { ...styles.spaceBetween, marginTop: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: "Available" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { style: { fontSize: "0.75rem", fontWeight: 600 }, children: [
            formatAmount(totalA, tokenA.decimals),
            " ",
            tokenA.symbol
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { display: "flex", justifyContent: "center", margin: "8px 0" }, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        "div",
        {
          style: {
            background: colors.backgroundMuted,
            border: `1px solid ${colors.border}`,
            borderRadius: "8px",
            padding: "8px",
            color: colors.text
          },
          children: "+"
        }
      ) }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("label", { style: styles.label, children: "Token B" }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { display: "flex", gap: "8px", marginBottom: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          "select",
          {
            value: tokenB.mint.toBase58(),
            onChange: (e) => {
              const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
              if (token) setTokenB(token);
            },
            disabled: isAdding,
            style: { ...styles.input, flex: 1 },
            children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          "input",
          {
            type: "number",
            value: amountB,
            onChange: (e) => setAmountB(e.target.value),
            placeholder: "0.00",
            step: "any",
            min: "0",
            disabled: isAdding,
            style: styles.input
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { ...styles.spaceBetween, marginTop: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: "Available" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { style: { fontSize: "0.75rem", fontWeight: 600 }, children: [
            formatAmount(totalB, tokenB.decimals),
            " ",
            tokenB.symbol
          ] })
        ] })
      ] }),
      liquidityQuote && /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: {
        background: colors.backgroundMuted,
        padding: "12px",
        borderRadius: "8px",
        fontSize: "0.875rem"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: colors.textMuted }, children: "Actual Deposit A" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { children: [
            formatAmount(liquidityQuote.depositA, tokenA.decimals),
            " ",
            tokenA.symbol
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: colors.textMuted }, children: "Actual Deposit B" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { children: [
            formatAmount(liquidityQuote.depositB, tokenB.decimals),
            " ",
            tokenB.symbol
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: colors.textMuted }, children: "LP Tokens" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { children: formatAmount(liquidityQuote.lpAmount, 9) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: styles.spaceBetween, children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { color: colors.textMuted }, children: "Share of Pool" }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { children: [
            liquidityQuote.shareOfPool.toFixed(2),
            "%"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        "button",
        {
          type: "submit",
          disabled: isDisabled,
          style: {
            ...styles.buttonPrimary,
            ...isDisabled ? styles.buttonDisabled : {}
          },
          children: !isConnected ? "Connect Wallet" : !isInitialized ? "Initializing..." : isAdding ? "Adding Liquidity..." : "Add Liquidity"
        }
      ),
      liquidityQuote && (liquidityQuote.depositA !== BigInt(Math.floor(parseFloat(amountA) * 10 ** tokenA.decimals)) || liquidityQuote.depositB !== BigInt(Math.floor(parseFloat(amountB) * 10 ** tokenB.decimals))) && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { ...styles.errorText, background: colors.backgroundMuted, padding: "12px", borderRadius: "8px", color: colors.textMuted }, children: "Note: Amounts will be adjusted to match pool ratio" })
    ] })
  ] });
}

// src/components/RemoveLiquidityForm.tsx
var import_react14 = require("react");
var import_hooks17 = require("@cloakcraft/hooks");
var import_sdk4 = require("@cloakcraft/sdk");
var import_jsx_runtime17 = require("react/jsx-runtime");
function RemoveLiquidityForm({
  tokens,
  onSuccess,
  onError,
  className,
  walletPublicKey
}) {
  const [tokenA, setTokenA] = (0, import_react14.useState)(tokens[0]);
  const [tokenB, setTokenB] = (0, import_react14.useState)(tokens[1] || tokens[0]);
  const [lpAmount, setLpAmount] = (0, import_react14.useState)("");
  const [isRemoving, setIsRemoving] = (0, import_react14.useState)(false);
  const { isConnected, isInitialized, wallet } = (0, import_hooks17.useWallet)();
  const { client } = (0, import_hooks17.useCloakCraft)();
  const lpTokenMint = tokenA.mint;
  const { availableNotes: lpNotes, totalAvailable: totalLp, selectNotesForAmount: selectLp } = (0, import_hooks17.useNoteSelector)(lpTokenMint);
  const mockReserveA = 1000000n * BigInt(10 ** tokenA.decimals);
  const mockReserveB = 1000000n * BigInt(10 ** tokenB.decimals);
  const mockLpSupply = 1000000n * 1000000000n;
  const formatAmount = (value, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 4)}`;
  };
  const withdrawQuote = (0, import_react14.useMemo)(() => {
    const lpAmountNum = parseFloat(lpAmount);
    if (isNaN(lpAmountNum) || lpAmountNum <= 0) {
      return null;
    }
    const lpAmountLamports = BigInt(Math.floor(lpAmountNum * 10 ** 9));
    try {
      const { outputA, outputB } = (0, import_sdk4.calculateRemoveLiquidityOutput)(
        lpAmountLamports,
        mockLpSupply,
        mockReserveA,
        mockReserveB
      );
      return {
        outputA,
        outputB,
        shareOfPool: Number(lpAmountLamports * 10000n / mockLpSupply) / 100
      };
    } catch (err) {
      return null;
    }
  }, [lpAmount, mockLpSupply, mockReserveA, mockReserveB]);
  const handleSetMaxLp = () => {
    const maxLp = formatAmount(totalLp, 9);
    setLpAmount(maxLp);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    const lpAmountNum = parseFloat(lpAmount);
    if (isNaN(lpAmountNum) || lpAmountNum <= 0) {
      onError?.("Please enter a valid LP token amount");
      return;
    }
    if (tokenA.mint.equals(tokenB.mint)) {
      onError?.("Token A and Token B must be different");
      return;
    }
    if (!client?.getProgram()) {
      onError?.("Program not configured. Call setProgram() first.");
      return;
    }
    if (!withdrawQuote) {
      onError?.("Unable to calculate withdraw quote");
      return;
    }
    if (!wallet) {
      onError?.("Wallet not connected");
      return;
    }
    const lpAmountLamports = BigInt(Math.floor(lpAmountNum * 10 ** 9));
    let selectedLpNotes;
    try {
      selectedLpNotes = selectLp(lpAmountLamports);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Insufficient LP balance");
      return;
    }
    if (selectedLpNotes.length !== 1) {
      onError?.("Remove liquidity requires exactly 1 LP note. Please consolidate notes first.");
      return;
    }
    setIsRemoving(true);
    try {
      onError?.("Remove liquidity functionality not yet implemented");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Remove liquidity failed");
    } finally {
      setIsRemoving(false);
    }
  };
  const isDisabled = !isConnected || !isInitialized || isRemoving || !lpAmount || !withdrawQuote;
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("h3", { style: styles.cardTitle, children: "Remove Liquidity" }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { style: styles.cardDescription, children: "Withdraw your liquidity by burning LP tokens" }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("label", { style: styles.label, children: "Pool" }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { display: "flex", gap: "8px", marginBottom: "16px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            "select",
            {
              value: tokenA.mint.toBase58(),
              onChange: (e) => {
                const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
                if (token) setTokenA(token);
              },
              disabled: isRemoving,
              style: { ...styles.input, flex: 1 },
              children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { padding: "12px 0", color: colors.textMuted }, children: "-" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            "select",
            {
              value: tokenB.mint.toBase58(),
              onChange: (e) => {
                const token = tokens.find((t) => t.mint.toBase58() === e.target.value);
                if (token) setTokenB(token);
              },
              disabled: isRemoving,
              style: { ...styles.input, flex: 1 },
              children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("label", { style: styles.label, children: "LP Tokens to Burn" }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
          "input",
          {
            type: "number",
            value: lpAmount,
            onChange: (e) => setLpAmount(e.target.value),
            placeholder: "0.00",
            step: "any",
            min: "0",
            disabled: isRemoving,
            style: styles.input
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { ...styles.spaceBetween, marginTop: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: "Available LP" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
            "button",
            {
              type: "button",
              onClick: handleSetMaxLp,
              disabled: isRemoving,
              style: {
                fontSize: "0.75rem",
                fontWeight: 600,
                background: "none",
                border: "none",
                color: colors.primary,
                cursor: "pointer",
                padding: 0
              },
              children: [
                formatAmount(totalLp, 9),
                " LP (MAX)"
              ]
            }
          )
        ] })
      ] }),
      withdrawQuote && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: {
        background: colors.backgroundMuted,
        padding: "12px",
        borderRadius: "8px",
        fontSize: "0.875rem"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { marginBottom: "12px", fontWeight: 600, color: colors.text }, children: "You will receive:" }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { color: colors.textMuted }, children: tokenA.symbol }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { children: [
            formatAmount(withdrawQuote.outputA, tokenA.decimals),
            " ",
            tokenA.symbol
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "12px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { color: colors.textMuted }, children: tokenB.symbol }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { children: [
            formatAmount(withdrawQuote.outputB, tokenB.decimals),
            " ",
            tokenB.symbol
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: styles.spaceBetween, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { color: colors.textMuted }, children: "Your Share" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { children: [
            withdrawQuote.shareOfPool.toFixed(2),
            "% of pool"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        "button",
        {
          type: "submit",
          disabled: isDisabled,
          style: {
            ...styles.buttonPrimary,
            ...isDisabled ? styles.buttonDisabled : {}
          },
          children: !isConnected ? "Connect Wallet" : !isInitialized ? "Initializing..." : isRemoving ? "Removing Liquidity..." : "Remove Liquidity"
        }
      )
    ] })
  ] });
}

// src/components/SwapPanel.tsx
var import_jsx_runtime18 = require("react/jsx-runtime");
function SwapPanel({ initialTab = "swap", walletPublicKey }) {
  const [activeTab, setActiveTab] = (0, import_react15.useState)(initialTab);
  const tabs = [
    { id: "swap", label: "Swap" },
    { id: "add", label: "Add Liquidity" },
    { id: "remove", label: "Remove Liquidity" }
  ];
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { width: "100%", maxWidth: "600px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      "div",
      {
        style: {
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          borderBottom: `1px solid ${colors.border}`
        },
        children: tabs.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
          "button",
          {
            onClick: () => setActiveTab(tab.id),
            style: {
              padding: "12px 24px",
              background: "transparent",
              border: "none",
              borderBottom: activeTab === tab.id ? `2px solid ${colors.primary}` : "2px solid transparent",
              color: activeTab === tab.id ? colors.text : colors.textMuted,
              fontWeight: activeTab === tab.id ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.2s",
              fontSize: "14px"
            },
            children: tab.label
          },
          tab.id
        ))
      }
    ),
    activeTab === "swap" && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      SwapForm,
      {
        tokens: DEVNET_TOKENS,
        walletPublicKey,
        onSuccess: (signature) => {
          console.log("Swap success:", signature);
          alert(`Swap successful!
TX: ${signature}`);
        },
        onError: (error) => {
          console.error("Swap error:", error);
          alert(`Swap error: ${error}`);
        }
      }
    ),
    activeTab === "add" && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AddLiquidityForm,
      {
        tokens: DEVNET_TOKENS,
        walletPublicKey,
        onSuccess: (signature) => {
          console.log("Add liquidity success:", signature);
          alert(`Liquidity added successfully!
TX: ${signature}`);
        },
        onError: (error) => {
          console.error("Add liquidity error:", error);
          alert(`Add liquidity error: ${error}`);
        }
      }
    ),
    activeTab === "remove" && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      RemoveLiquidityForm,
      {
        tokens: DEVNET_TOKENS,
        walletPublicKey,
        onSuccess: (signature) => {
          console.log("Remove liquidity success:", signature);
          alert(`Liquidity removed successfully!
TX: ${signature}`);
        },
        onError: (error) => {
          console.error("Remove liquidity error:", error);
          alert(`Remove liquidity error: ${error}`);
        }
      }
    )
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AddLiquidityForm,
  BalanceDisplay,
  BalanceInline,
  BalanceSummary,
  CloakCraftProvider,
  DEVNET_TOKENS,
  InitializePoolForm,
  MAINNET_TOKENS,
  MultiPrivateBalanceDisplay,
  MultiTokenBalanceDisplay,
  NotesList,
  OrderBook,
  PoolInfo,
  PoolStatusBadge,
  PublicBalanceDisplay,
  RemoveLiquidityForm,
  ShieldForm,
  SwapForm,
  SwapPanel,
  TokenSelector,
  TransactionHistory,
  TransferForm,
  UnshieldForm,
  WalletBackup,
  WalletButton,
  WalletImport,
  WalletManager,
  colors,
  styles
});
