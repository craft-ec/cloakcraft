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
  AmmPoolDetails: () => AmmPoolDetails,
  BalanceDisplay: () => BalanceDisplay,
  BalanceInline: () => BalanceInline,
  BalanceSummary: () => BalanceSummary,
  CloakCraftProvider: () => import_hooks20.CloakCraftProvider,
  CreatePoolForm: () => CreatePoolForm,
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
var import_hooks20 = require("@cloakcraft/hooks");

// src/components/WalletButton.tsx
var import_react = require("react");
var import_hooks = require("@cloakcraft/hooks");

// src/styles.ts
var colors = {
  primary: "#4f46e5",
  primaryHover: "#4338ca",
  primaryLight: "#eef2ff",
  success: "#059669",
  successLight: "#d1fae5",
  error: "#dc2626",
  errorLight: "#fee2e2",
  warning: "#d97706",
  warningLight: "#fef3c7",
  text: "#2c2416",
  textMuted: "#6b5d4f",
  textLight: "#9c8b7a",
  border: "#e7e0d8",
  borderHover: "#d4c8bc",
  background: "#ffffff",
  backgroundMuted: "#faf8f5",
  backgroundDark: "#f5f3f0"
};
var styles = {
  // Card container
  card: {
    padding: "28px",
    borderRadius: "16px",
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.background,
    boxShadow: "0 1px 3px rgba(44, 36, 22, 0.06)",
    transition: "box-shadow 0.3s ease, transform 0.3s ease"
  },
  cardHover: {
    boxShadow: "0 4px 12px rgba(44, 36, 22, 0.08)",
    transform: "translateY(-2px)"
  },
  cardTitle: {
    margin: "0 0 10px 0",
    fontSize: "1.375rem",
    fontWeight: 700,
    fontFamily: "'Playfair Display', Georgia, serif",
    letterSpacing: "-0.02em",
    color: colors.text
  },
  cardDescription: {
    margin: "0 0 24px 0",
    fontSize: "0.9375rem",
    color: colors.textMuted,
    lineHeight: 1.6
  },
  // Form elements
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "0.875rem",
    fontWeight: 600,
    color: colors.text,
    letterSpacing: "0.01em"
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: `1px solid ${colors.border}`,
    fontSize: "1rem",
    outline: "none",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
    boxSizing: "border-box",
    backgroundColor: colors.background,
    color: colors.text,
    fontFamily: "inherit"
  },
  inputFocused: {
    borderColor: colors.primary,
    boxShadow: `0 0 0 3px ${colors.primaryLight}`
  },
  textarea: {
    width: "100%",
    padding: "12px 16px",
    borderRadius: "10px",
    border: `1px solid ${colors.border}`,
    fontSize: "0.9375rem",
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
    outline: "none",
    resize: "vertical",
    minHeight: "100px",
    boxSizing: "border-box",
    backgroundColor: colors.background,
    color: colors.text,
    lineHeight: 1.5
  },
  // Buttons
  buttonPrimary: {
    padding: "14px 24px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: colors.primary,
    color: "white",
    fontSize: "0.9375rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 4px rgba(79, 70, 229, 0.2)",
    letterSpacing: "0.01em"
  },
  buttonPrimaryHover: {
    backgroundColor: colors.primaryHover,
    boxShadow: "0 4px 8px rgba(79, 70, 229, 0.3)",
    transform: "translateY(-1px)"
  },
  buttonSecondary: {
    padding: "14px 24px",
    borderRadius: "10px",
    border: `1.5px solid ${colors.border}`,
    backgroundColor: colors.background,
    color: colors.text,
    fontSize: "0.9375rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.2s ease",
    letterSpacing: "0.01em"
  },
  buttonSecondaryHover: {
    borderColor: colors.borderHover,
    backgroundColor: colors.backgroundMuted,
    transform: "translateY(-1px)"
  },
  buttonDisabled: {
    backgroundColor: colors.textLight,
    cursor: "not-allowed",
    opacity: 0.5,
    boxShadow: "none"
  },
  buttonSmall: {
    padding: "8px 16px",
    fontSize: "0.8125rem"
  },
  // Status messages
  errorText: {
    color: colors.error,
    fontSize: "0.875rem",
    marginTop: "6px",
    fontWeight: 500
  },
  successText: {
    color: colors.success,
    fontSize: "0.875rem",
    fontWeight: 600
  },
  successBox: {
    padding: "16px 20px",
    borderRadius: "12px",
    backgroundColor: colors.successLight,
    border: `1px solid ${colors.success}`,
    color: colors.success
  },
  warningBox: {
    padding: "16px 20px",
    borderRadius: "12px",
    backgroundColor: colors.warningLight,
    border: `1px solid ${colors.warning}`,
    color: colors.warning
  },
  errorBox: {
    padding: "16px 20px",
    borderRadius: "12px",
    backgroundColor: colors.errorLight,
    border: `1px solid ${colors.error}`,
    color: colors.error
  },
  // Links
  link: {
    color: colors.primary,
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: 500,
    transition: "color 0.2s ease"
  },
  linkHover: {
    color: colors.primaryHover,
    textDecoration: "underline"
  },
  txLink: {
    marginTop: "10px",
    fontSize: "0.8125rem"
  },
  // List items
  listItem: {
    padding: "16px 20px",
    border: `1px solid ${colors.border}`,
    borderRadius: "12px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    transition: "all 0.2s ease",
    backgroundColor: colors.background
  },
  listItemHover: {
    borderColor: colors.borderHover,
    backgroundColor: colors.backgroundMuted,
    transform: "translateX(2px)"
  },
  listItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    boxShadow: `0 0 0 3px ${colors.primaryLight}`
  },
  // Badge
  badge: {
    display: "inline-block",
    padding: "4px 12px",
    borderRadius: "9999px",
    fontSize: "0.75rem",
    fontWeight: 600,
    letterSpacing: "0.02em"
  },
  badgeSuccess: {
    backgroundColor: colors.successLight,
    color: colors.success
  },
  badgeWarning: {
    backgroundColor: colors.warningLight,
    color: colors.warning
  },
  badgeError: {
    backgroundColor: colors.errorLight,
    color: colors.error
  },
  badgePrimary: {
    backgroundColor: colors.primaryLight,
    color: colors.primary
  },
  // Layout
  row: {
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },
  spaceBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "12px"
  },
  // Typography
  heading: {
    margin: "0 0 20px 0",
    fontSize: "1.75rem",
    fontWeight: 700,
    fontFamily: "'Playfair Display', Georgia, serif",
    letterSpacing: "-0.02em",
    color: colors.text
  },
  subheading: {
    margin: 0,
    fontSize: "0.9375rem",
    color: colors.textMuted,
    lineHeight: 1.6
  },
  mono: {
    fontFamily: "'SF Mono', 'Monaco', 'Inconsolata', monospace",
    fontSize: "0.8125rem",
    backgroundColor: colors.backgroundDark,
    padding: "2px 6px",
    borderRadius: "4px"
  },
  truncate: {
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap"
  },
  // Loading spinner
  spinner: {
    display: "inline-block",
    width: "18px",
    height: "18px",
    border: "2px solid rgba(79, 70, 229, 0.2)",
    borderTopColor: colors.primary,
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite"
  },
  // Empty state
  emptyState: {
    textAlign: "center",
    padding: "48px 32px",
    color: colors.textMuted,
    fontSize: "0.9375rem"
  },
  // Divider
  divider: {
    height: "1px",
    backgroundColor: colors.border,
    border: "none",
    margin: "24px 0"
  },
  // Info box
  infoBox: {
    padding: "16px 20px",
    borderRadius: "12px",
    backgroundColor: colors.backgroundMuted,
    border: `1px solid ${colors.border}`,
    fontSize: "0.875rem",
    color: colors.textMuted,
    lineHeight: 1.6
  },
  // Stat display
  stat: {
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  statLabel: {
    fontSize: "0.75rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: colors.textLight,
    fontWeight: 600
  },
  statValue: {
    fontSize: "1.5rem",
    fontWeight: 700,
    fontFamily: "'Playfair Display', Georgia, serif",
    color: colors.text,
    letterSpacing: "-0.02em"
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
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 8);
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
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 8);
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
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 8)}`;
  };
  const parseRecipientPublicKey = (hex) => {
    try {
      const clean2 = hex.trim().startsWith("0x") ? hex.trim().slice(2) : hex.trim();
      if (clean2.length !== 128) return null;
      const bytes = Buffer.from(clean2, "hex");
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
        "Recipient Stealth Public Key",
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
          "textarea",
          {
            value: recipientPubkey,
            onChange: (e) => setRecipientPubkey(e.target.value),
            placeholder: "Paste the recipient's stealth public key from their Account tab (128 hex characters)",
            disabled: isTransferring,
            style: { ...styles.textarea, minHeight: "80px" }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted, marginTop: "4px" }, children: `Find this in the recipient's Account tab under "Stealth Public Key"` })
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
      children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
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
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 8)}`;
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
      onError?.("Invalid recipient wallet address");
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
        walletPublicKey: walletPublicKey ?? void 0,
        isWalletAddress: true
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
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("h3", { style: styles.cardTitle, children: "Unshield Tokens" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: styles.cardDescription, children: "Unshield tokens from the privacy pool back to your public wallet." }),
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
        "Recipient Wallet Address",
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
          "input",
          {
            type: "text",
            value: recipient,
            onChange: (e) => setRecipient(e.target.value),
            placeholder: "Enter recipient's Solana wallet address",
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
          children: !isConnected ? "Connect Wallet" : !isInitialized ? "Initializing..." : isUnshielding ? "Unshielding..." : "Unshield Tokens"
        }
      ),
      error && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles.errorText, children: error }),
      result && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: styles.successBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: styles.successText, children: "Unshield successful!" }),
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
      children: tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
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
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 8);
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
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 8)}`;
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
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 8)}`;
  };
  const truncateAddress = (address) => {
    if (!address) return "---";
    const str = address.toBase58();
    return `${str.slice(0, 8)}...${str.slice(-4)}`;
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
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 8);
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
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 8);
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
  const { notes } = (0, import_hooks13.useCloakCraft)();
  const knownTokenBalances = tokens.map((token) => {
    const { totalAvailable } = (0, import_hooks13.useNoteSelector)(token.mint);
    return { token, balance: totalAvailable };
  });
  const unknownTokenBalances = import_react10.default.useMemo(() => {
    if (!notes) return [];
    const balanceMap = /* @__PURE__ */ new Map();
    notes.forEach((note) => {
      const mintStr = note.tokenMint.toBase58();
      const isKnownToken = tokens.some((t) => t.mint.equals(note.tokenMint));
      if (!isKnownToken) {
        const existing = balanceMap.get(mintStr);
        if (existing) {
          existing.balance += note.amount;
        } else {
          balanceMap.set(mintStr, {
            token: {
              mint: note.tokenMint,
              symbol: `${mintStr.slice(0, 8)}...${mintStr.slice(-4)}`,
              name: `Unknown Token (${mintStr.slice(0, 6)}...)`,
              decimals: 9
              // Assume 9 decimals for unknown tokens
            },
            balance: note.amount
          });
        }
      }
    });
    return Array.from(balanceMap.values());
  }, [tokens, notes]);
  const allBalances = [...knownTokenBalances, ...unknownTokenBalances];
  const tokensWithBalance = allBalances.filter(({ balance }) => balance > BigInt(0));
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
    const fractionalStr = fractional.toString().padStart(token.decimals, "0").slice(0, 8);
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
  const [copiedPubKey, setCopiedPubKey] = (0, import_react11.useState)(false);
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
  const handleCopyPublicKey = (0, import_react11.useCallback)(async () => {
    if (!publicKey) return;
    try {
      const pubKeyHex = Buffer.from(publicKey.x).toString("hex") + Buffer.from(publicKey.y).toString("hex");
      await navigator.clipboard.writeText(pubKeyHex);
      setCopiedPubKey(true);
      setTimeout(() => setCopiedPubKey(false), 3e3);
    } catch {
    }
  }, [publicKey]);
  const handleDownload = (0, import_react11.useCallback)(() => {
    if (!spendingKeyHex || !publicKey) return;
    const publicKeyHex = Buffer.from(publicKey.x).toString("hex");
    const backupData = {
      version: 1,
      type: "cloakcraft-spending-key",
      publicKey: publicKeyHex,
      spendingKey: spendingKeyHex,
      exportedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cloakcraft-backup-${publicKeyHex.slice(0, 8)}.json`;
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
          padding: "16px",
          background: colors.backgroundMuted,
          borderRadius: "12px",
          border: `1px solid ${colors.border}`
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px"
          }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, fontWeight: 600 }, children: "Stealth Public Key" }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
              "button",
              {
                onClick: handleCopyPublicKey,
                style: { ...styles.buttonSecondary, ...styles.buttonSmall },
                children: copiedPubKey ? "\u2713 Copied!" : "Copy"
              }
            )
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(
            "div",
            {
              style: {
                ...styles.mono,
                fontSize: "0.75rem",
                wordBreak: "break-all",
                lineHeight: 1.6,
                color: colors.text
              },
              children: publicKey ? Buffer.from(publicKey.x).toString("hex") + Buffer.from(publicKey.y).toString("hex") : "Unknown"
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { style: { fontSize: "0.7rem", color: colors.textLight, marginTop: "8px", fontStyle: "italic" }, children: "Share this key with others to receive private transfers" })
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

// src/components/CreatePoolForm.tsx
var import_react12 = require("react");
var import_web34 = require("@solana/web3.js");
var import_hooks15 = require("@cloakcraft/hooks");
var import_jsx_runtime15 = require("react/jsx-runtime");
function CreatePoolForm({
  tokens,
  onSuccess,
  onError,
  className,
  walletPublicKey
}) {
  const [tokenAMint, setTokenAMint] = (0, import_react12.useState)("");
  const [tokenBMint, setTokenBMint] = (0, import_react12.useState)("");
  const [feeBps, setFeeBps] = (0, import_react12.useState)("30");
  const [isCreating, setIsCreating] = (0, import_react12.useState)(false);
  const [error, setError] = (0, import_react12.useState)(null);
  const [result, setResult] = (0, import_react12.useState)(null);
  const { client } = (0, import_hooks15.useCloakCraft)();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!tokenAMint || !tokenBMint) {
      const err = "Please select both tokens";
      setError(err);
      onError?.(err);
      return;
    }
    if (tokenAMint === tokenBMint) {
      const err = "Cannot create pool with the same token";
      setError(err);
      onError?.(err);
      return;
    }
    const feeNum = parseFloat(feeBps);
    if (isNaN(feeNum) || feeNum < 0 || feeNum > 1e4) {
      const err = "Fee must be between 0 and 10000 basis points";
      setError(err);
      onError?.(err);
      return;
    }
    if (!client?.getProgram()) {
      const err = "Program not configured. Call setProgram() first.";
      setError(err);
      onError?.(err);
      return;
    }
    if (!walletPublicKey) {
      const err = "Wallet not connected";
      setError(err);
      onError?.(err);
      return;
    }
    setIsCreating(true);
    try {
      const tokenA = new import_web34.PublicKey(tokenAMint);
      const tokenB = new import_web34.PublicKey(tokenBMint);
      const lpMintKeypair = import_web34.Keypair.generate();
      const dummyPayer = import_web34.Keypair.generate();
      Object.defineProperty(dummyPayer, "publicKey", {
        value: walletPublicKey,
        writable: false
      });
      const signature = await client.initializeAmmPool(
        tokenA,
        tokenB,
        lpMintKeypair,
        Math.floor(feeNum),
        dummyPayer
      );
      setResult(signature);
      const selectedTokenA2 = tokens.find((t) => t.mint.equals(tokenA));
      const selectedTokenB2 = tokens.find((t) => t.mint.equals(tokenB));
      if (selectedTokenA2 && selectedTokenB2) {
        onSuccess?.(signature, selectedTokenA2, selectedTokenB2);
      }
      setTokenAMint("");
      setTokenBMint("");
      setFeeBps("30");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create pool";
      setError(message);
      onError?.(message);
    } finally {
      setIsCreating(false);
    }
  };
  const selectedTokenA = tokens.find((t) => t.mint.toBase58() === tokenAMint);
  const selectedTokenB = tokens.find((t) => t.mint.toBase58() === tokenBMint);
  const isDisabled = isCreating || !tokenAMint || !tokenBMint || !walletPublicKey;
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("h3", { style: styles.cardTitle, children: "Create Liquidity Pool" }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("p", { style: styles.cardDescription, children: "Initialize a new AMM pool for a token pair. You'll need to add initial liquidity after creating the pool." }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("label", { style: styles.label, children: [
        "Token A",
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          "select",
          {
            value: tokenAMint,
            onChange: (e) => setTokenAMint(e.target.value),
            disabled: isCreating,
            style: styles.input,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("option", { value: "", children: "Select token..." }),
              tokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("option", { value: token.mint.toBase58(), children: [
                token.symbol,
                " - ",
                token.name
              ] }, token.mint.toBase58()))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("label", { style: styles.label, children: [
        "Token B",
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)(
          "select",
          {
            value: tokenBMint,
            onChange: (e) => setTokenBMint(e.target.value),
            disabled: isCreating,
            style: styles.input,
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("option", { value: "", children: "Select token..." }),
              tokens.filter((token) => token.mint.toBase58() !== tokenAMint).map((token) => /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("option", { value: token.mint.toBase58(), children: [
                token.symbol,
                " - ",
                token.name
              ] }, token.mint.toBase58()))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("label", { style: styles.label, children: [
        "Trading Fee (basis points)",
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "input",
          {
            type: "number",
            value: feeBps,
            onChange: (e) => setFeeBps(e.target.value),
            placeholder: "30",
            min: "0",
            max: "10000",
            step: "1",
            disabled: isCreating,
            style: styles.input
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted, marginTop: "4px" }, children: feeBps ? `${parseFloat(feeBps) / 100}% trading fee` : "Default: 0.3%" })
      ] }),
      selectedTokenA && selectedTokenB && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: styles.infoBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontWeight: 600, marginBottom: "8px" }, children: "Pool Details" }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: { fontSize: "0.875rem" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { children: [
            "Pair: ",
            selectedTokenA.symbol,
            "/",
            selectedTokenB.symbol
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { children: [
            "Fee: ",
            parseFloat(feeBps) / 100,
            "%"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
        "button",
        {
          type: "submit",
          disabled: isDisabled,
          style: {
            ...styles.buttonPrimary,
            ...isDisabled ? styles.buttonDisabled : {}
          },
          children: !walletPublicKey ? "Connect Wallet" : isCreating ? "Creating Pool..." : "Create Pool"
        }
      ),
      error && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: styles.errorText, children: error }),
      result && /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("div", { style: styles.successBox, children: [
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: styles.successText, children: "Pool created successfully!" }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: styles.txLink, children: /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(
          "a",
          {
            href: `https://explorer.solana.com/tx/${result}?cluster=devnet`,
            target: "_blank",
            rel: "noopener noreferrer",
            style: styles.link,
            children: "View transaction"
          }
        ) }),
        /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("div", { style: { fontSize: "0.875rem", marginTop: "12px" }, children: "Next: Add initial liquidity to activate the pool" })
      ] })
    ] })
  ] });
}

// src/components/SwapPanel.tsx
var import_react16 = require("react");
var import_web35 = require("@solana/web3.js");
var import_hooks19 = require("@cloakcraft/hooks");

// src/components/SwapForm.tsx
var import_react13 = __toESM(require("react"));
var import_hooks16 = require("@cloakcraft/hooks");
var import_sdk2 = require("@cloakcraft/sdk");

// src/components/AmmPoolDetails.tsx
var import_jsx_runtime16 = require("react/jsx-runtime");
function AmmPoolDetails({
  tokenA,
  tokenB,
  pool,
  className
}) {
  if (!pool) {
    return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className, style: styles.card, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { padding: "16px", textAlign: "center", color: colors.textMuted }, children: "No AMM pool found for this pair" }) });
  }
  const formatAmount = (amount, decimals) => {
    const num = Number(amount) / Math.pow(10, decimals);
    if (num < 1e-4 && num > 0) {
      return num.toFixed(decimals);
    }
    return num.toLocaleString(void 0, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  };
  const formatCompact = (amount, decimals) => {
    const num = Number(amount) / Math.pow(10, decimals);
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}M`;
    } else if (num >= 1e3) {
      return `${(num / 1e3).toFixed(2)}K`;
    }
    return num.toFixed(2);
  };
  const reserveANum = Number(pool.reserveA) / Math.pow(10, tokenA.decimals);
  const reserveBNum = Number(pool.reserveB) / Math.pow(10, tokenB.decimals);
  const priceRatio = reserveANum > 0 ? reserveBNum / reserveANum : 0;
  const inversePriceRatio = reserveBNum > 0 ? reserveANum / reserveBNum : 0;
  const formatPrice = (price) => {
    if (price === 0) return "0";
    if (price < 1e-6) return price.toExponential(6);
    if (price < 0.01) return price.toFixed(8);
    return price.toFixed(6);
  };
  const totalValueLocked = formatCompact(pool.reserveA, tokenA.decimals);
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("h3", { style: { ...styles.cardTitle, marginBottom: "16px" }, children: [
      "Pool Details: ",
      tokenA.symbol,
      "/",
      tokenB.symbol
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: {
      padding: "16px",
      background: colors.backgroundDark,
      borderRadius: "8px",
      marginBottom: "16px"
    }, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginBottom: "4px" }, children: "Price" }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: "1.25rem", fontWeight: 600 }, children: formatPrice(priceRatio) }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginTop: "2px" }, children: [
          tokenB.symbol,
          " per ",
          tokenA.symbol
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginBottom: "4px" }, children: "Inverse Price" }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: "1.25rem", fontWeight: 600 }, children: formatPrice(inversePriceRatio) }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginTop: "2px" }, children: [
          tokenA.symbol,
          " per ",
          tokenB.symbol
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: "0.875rem", fontWeight: 600, marginBottom: "12px" }, children: "Liquidity Depth" }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { marginBottom: "8px" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: styles.spaceBetween, children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: [
            tokenA.symbol,
            " Reserve"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { fontSize: "0.875rem", fontWeight: 500 }, children: formatAmount(pool.reserveA, tokenA.decimals) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          LiquidityBar,
          {
            value: pool.reserveA,
            max: pool.reserveA + pool.reserveB,
            color: colors.primary
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: styles.spaceBetween, children: [
          /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: [
            tokenB.symbol,
            " Reserve"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { fontSize: "0.875rem", fontWeight: 500 }, children: formatAmount(pool.reserveB, tokenB.decimals) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
          LiquidityBar,
          {
            value: pool.reserveB,
            max: pool.reserveA + pool.reserveB,
            color: colors.success
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: { display: "grid", gap: "8px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        StatRow,
        {
          label: "LP Supply",
          value: formatAmount(pool.lpSupply, 9),
          unit: "LP"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        StatRow,
        {
          label: "Trading Fee",
          value: (pool.feeBps / 100).toFixed(2),
          unit: "%"
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(
        StatRow,
        {
          label: "Pool Status",
          value: pool.isActive ? "Active" : "Inactive",
          valueColor: pool.isActive ? colors.success : colors.error
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: {
      marginTop: "16px",
      padding: "12px",
      background: colors.backgroundMuted,
      borderRadius: "6px"
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { fontSize: "0.75rem", color: colors.textMuted, marginBottom: "4px" }, children: "Pool ID" }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: { ...styles.mono, fontSize: "0.75rem", wordBreak: "break-all" }, children: pool.poolId.toBase58() })
    ] })
  ] });
}
function LiquidityBar({
  value,
  max,
  color
}) {
  const percentage = max > 0n ? Number(value) / Number(max) * 100 : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: {
    width: "100%",
    height: "6px",
    background: colors.backgroundMuted,
    borderRadius: "3px",
    overflow: "hidden",
    marginTop: "4px"
  }, children: /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { style: {
    width: `${percentage}%`,
    height: "100%",
    background: color,
    transition: "width 0.3s ease"
  } }) });
}
function StatRow({
  label,
  value,
  unit,
  valueColor
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { style: styles.spaceBetween, children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("span", { style: { fontSize: "0.875rem", color: colors.textMuted }, children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("span", { style: {
      fontSize: "0.875rem",
      fontWeight: 500,
      color: valueColor || colors.text
    }, children: [
      value,
      unit ? ` ${unit}` : ""
    ] })
  ] });
}

// src/components/SwapForm.tsx
var import_jsx_runtime17 = require("react/jsx-runtime");
function SwapForm({
  tokens,
  ammPools,
  onSuccess,
  onError,
  className,
  walletPublicKey
}) {
  const { isConnected, isInitialized, wallet } = (0, import_hooks16.useWallet)();
  const { client, notes } = (0, import_hooks16.useCloakCraft)();
  const tokensWithBalance = (0, import_react13.useMemo)(() => {
    const notesByMint = /* @__PURE__ */ new Map();
    notes.forEach((note) => {
      const mintStr = note.tokenMint.toBase58();
      const current = notesByMint.get(mintStr) || BigInt(0);
      notesByMint.set(mintStr, current + note.amount);
    });
    return tokens.filter((token) => {
      const balance = notesByMint.get(token.mint.toBase58()) || BigInt(0);
      return balance > BigInt(0);
    });
  }, [tokens, notes]);
  const [inputToken, setInputToken] = (0, import_react13.useState)(tokensWithBalance[0] || tokens[0]);
  const [inputAmount, setInputAmount] = (0, import_react13.useState)("");
  const [slippageBps, setSlippageBps] = (0, import_react13.useState)(50);
  const [isSwapping, setIsSwapping] = (0, import_react13.useState)(false);
  const availableOutputTokens = (0, import_react13.useMemo)(() => {
    if (!inputToken) return [];
    const inputMintStr = inputToken.mint.toBase58();
    const pairedMints = /* @__PURE__ */ new Set();
    ammPools.forEach((pool) => {
      const tokenAStr = pool.tokenAMint.toBase58();
      const tokenBStr = pool.tokenBMint.toBase58();
      if (tokenAStr === inputMintStr) {
        pairedMints.add(tokenBStr);
      } else if (tokenBStr === inputMintStr) {
        pairedMints.add(tokenAStr);
      }
    });
    return tokens.filter((token) => pairedMints.has(token.mint.toBase58()));
  }, [inputToken, ammPools, tokens]);
  const [outputToken, setOutputToken] = (0, import_react13.useState)(availableOutputTokens[0] || tokens[0]);
  const selectedAmmPool = (0, import_react13.useMemo)(() => {
    if (!inputToken || !outputToken) return null;
    const inputMintStr = inputToken.mint.toBase58();
    const outputMintStr = outputToken.mint.toBase58();
    return ammPools.find((pool) => {
      const tokenAStr = pool.tokenAMint.toBase58();
      const tokenBStr = pool.tokenBMint.toBase58();
      return tokenAStr === inputMintStr && tokenBStr === outputMintStr || tokenAStr === outputMintStr && tokenBStr === inputMintStr;
    });
  }, [inputToken, outputToken, ammPools]);
  import_react13.default.useEffect(() => {
    if (availableOutputTokens.length > 0) {
      const isCurrentOutputAvailable = availableOutputTokens.some(
        (t) => outputToken && t.mint.equals(outputToken.mint)
      );
      if (!isCurrentOutputAvailable) {
        setOutputToken(availableOutputTokens[0]);
      }
    }
  }, [availableOutputTokens]);
  const { availableNotes, totalAvailable, selectNotesForAmount } = (0, import_hooks16.useNoteSelector)(inputToken?.mint);
  const formatAmount = (value, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 8)}`;
  };
  const swapQuote = (0, import_react13.useMemo)(() => {
    if (!inputToken || !outputToken || !selectedAmmPool) return null;
    const amountNum = parseFloat(inputAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return null;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** inputToken.decimals));
    try {
      const inputMintStr = inputToken.mint.toBase58();
      const tokenAMintStr = selectedAmmPool.tokenAMint.toBase58();
      const isInputTokenA = inputMintStr === tokenAMintStr;
      const reserveIn = isInputTokenA ? selectedAmmPool.reserveA : selectedAmmPool.reserveB;
      const reserveOut = isInputTokenA ? selectedAmmPool.reserveB : selectedAmmPool.reserveA;
      const { outputAmount, priceImpact } = (0, import_sdk2.calculateSwapOutput)(
        amountLamports,
        reserveIn,
        reserveOut,
        selectedAmmPool.feeBps || 30
        // Use pool's fee or default to 0.3%
      );
      const minOutput = (0, import_sdk2.calculateMinOutput)(outputAmount, slippageBps);
      return {
        outputAmount,
        minOutput,
        priceImpact,
        priceRatio: Number(reserveOut) / Number(reserveIn)
      };
    } catch (err) {
      return null;
    }
  }, [inputAmount, inputToken, outputToken, selectedAmmPool, slippageBps]);
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
    if (!selectedAmmPool) {
      onError?.("No AMM pool found for this token pair");
      return;
    }
    const inputMintStr = inputToken.mint.toBase58();
    const tokenAMintStr = selectedAmmPool.tokenAMint.toBase58();
    const swapDirection = inputMintStr === tokenAMintStr ? "aToB" : "bToA";
    setIsSwapping(true);
    try {
      if (!selectedNotes[0].accountHash) {
        throw new Error("Note missing accountHash. Try rescanning notes.");
      }
      const merkleProof = await client.getMerkleProof(selectedNotes[0].accountHash);
      const result = await client.swap({
        input: selectedNotes[0],
        poolId: selectedAmmPool.poolId,
        swapDirection,
        swapAmount: amountLamports,
        outputAmount: swapQuote.outputAmount,
        minOutput: swapQuote.minOutput,
        outputTokenMint: outputToken.mint,
        outputRecipient: outputAddress,
        changeRecipient: changeAddress,
        feeBps: selectedAmmPool.feeBps || 30,
        merkleRoot: merkleProof.root,
        merklePath: merkleProof.pathElements,
        merkleIndices: merkleProof.pathIndices
      });
      onSuccess?.(result.signature);
      setInputAmount("");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Swap failed");
    } finally {
      setIsSwapping(false);
    }
  };
  const isDisabled = !isConnected || !isInitialized || isSwapping || !inputAmount || !swapQuote || tokensWithBalance.length === 0;
  if (tokensWithBalance.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className, style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("h3", { style: styles.cardTitle, children: "Swap Tokens" }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { style: styles.cardDescription, children: "Exchange tokens privately using the AMM pool" }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { padding: "24px", textAlign: "center", color: colors.textMuted }, children: "No tokens available to swap. Shield some tokens first." })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(import_jsx_runtime17.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className, style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("h3", { style: styles.cardTitle, children: "Swap Tokens" }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { style: styles.cardDescription, children: "Exchange tokens privately using the AMM pool" }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("label", { style: styles.label, children: "From" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { display: "flex", gap: "8px", marginBottom: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            "select",
            {
              value: inputToken?.mint.toBase58() || "",
              onChange: (e) => {
                const token = tokensWithBalance.find((t) => t.mint.toBase58() === e.target.value);
                if (token) setInputToken(token);
              },
              disabled: isSwapping || tokensWithBalance.length === 0,
              style: { ...styles.input, flex: 1 },
              children: tokensWithBalance.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: "", children: "No tokens with balance" }) : tokensWithBalance.map((token) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { ...styles.spaceBetween, marginTop: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: "Available" }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { style: { fontSize: "0.75rem", fontWeight: 600 }, children: [
              inputToken ? formatAmount(totalAvailable, inputToken.decimals) : "0",
              " ",
              inputToken?.symbol || ""
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { display: "flex", justifyContent: "center", margin: "8px 0" }, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("label", { style: styles.label, children: "To (estimated)" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { display: "flex", gap: "8px", marginBottom: "8px" }, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
            "select",
            {
              value: outputToken?.mint.toBase58() || "",
              onChange: (e) => {
                const token = availableOutputTokens.find((t) => t.mint.toBase58() === e.target.value);
                if (token) setOutputToken(token);
              },
              disabled: isSwapping || availableOutputTokens.length === 0,
              style: { ...styles.input, flex: 1 },
              children: availableOutputTokens.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("option", { value: "", children: [
                "No pools paired with ",
                inputToken?.symbol || "selected token"
              ] }) : availableOutputTokens.map((token) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: token.mint.toBase58(), children: token.symbol }, token.mint.toBase58()))
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)(
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
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { children: swapQuote ? formatAmount(swapQuote.outputAmount, outputToken.decimals) : "0.00" }),
                /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { fontSize: "0.875rem" }, children: outputToken.symbol })
              ]
            }
          )
        ] }),
        swapQuote && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: {
          background: colors.backgroundMuted,
          padding: "12px",
          borderRadius: "8px",
          fontSize: "0.875rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { color: colors.textMuted }, children: "Price Impact" }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { style: { color: swapQuote.priceImpact > 5 ? colors.error : colors.text }, children: [
              swapQuote.priceImpact.toFixed(2),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { color: colors.textMuted }, children: "Minimum Received" }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { children: [
              formatAmount(swapQuote.minOutput, outputToken.decimals),
              " ",
              outputToken.symbol
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { style: styles.spaceBetween, children: [
            /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { style: { color: colors.textMuted }, children: "Slippage Tolerance" }),
            /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("span", { children: [
              (slippageBps / 100).toFixed(2),
              "%"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("label", { style: styles.label, children: [
          "Slippage Tolerance (%)",
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
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
        swapQuote && swapQuote.priceImpact > 10 && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { style: { ...styles.errorText, background: colors.backgroundMuted, padding: "12px", borderRadius: "8px" }, children: "Warning: High price impact! Consider reducing swap amount." })
      ] })
    ] }),
    inputToken && outputToken && selectedAmmPool && (() => {
      const poolTokenAStr = selectedAmmPool.tokenAMint.toBase58();
      const inputMintStr = inputToken.mint.toBase58();
      const outputMintStr = outputToken.mint.toBase58();
      const poolTokenA = poolTokenAStr === inputMintStr ? inputToken : outputToken;
      const poolTokenB = poolTokenAStr === inputMintStr ? outputToken : inputToken;
      return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(
        AmmPoolDetails,
        {
          tokenA: poolTokenA,
          tokenB: poolTokenB,
          pool: selectedAmmPool,
          className
        }
      );
    })()
  ] });
}

// src/components/AddLiquidityForm.tsx
var import_react14 = require("react");
var import_hooks17 = require("@cloakcraft/hooks");
var import_sdk3 = require("@cloakcraft/sdk");
var import_jsx_runtime18 = require("react/jsx-runtime");
function AddLiquidityForm({
  tokens,
  ammPools,
  onSuccess,
  onError,
  className,
  walletPublicKey
}) {
  const [selectedPool, setSelectedPool] = (0, import_react14.useState)(ammPools[0]);
  const [amountA, setAmountA] = (0, import_react14.useState)("");
  const [amountB, setAmountB] = (0, import_react14.useState)("");
  const [lastEditedField, setLastEditedField] = (0, import_react14.useState)(null);
  const [slippageBps, setSlippageBps] = (0, import_react14.useState)(100);
  const [isAdding, setIsAdding] = (0, import_react14.useState)(false);
  const { isConnected, isInitialized, wallet } = (0, import_hooks17.useWallet)();
  const { client } = (0, import_hooks17.useCloakCraft)();
  const tokenA = (0, import_react14.useMemo)(() => {
    if (!selectedPool) return tokens[0];
    return tokens.find((t) => t.mint.equals(selectedPool.tokenAMint)) || {
      mint: selectedPool.tokenAMint,
      symbol: selectedPool.tokenAMint.toBase58().slice(0, 8) + "...",
      name: selectedPool.tokenAMint.toBase58(),
      decimals: 9
    };
  }, [selectedPool, tokens]);
  const tokenB = (0, import_react14.useMemo)(() => {
    if (!selectedPool) return tokens[1] || tokens[0];
    return tokens.find((t) => t.mint.equals(selectedPool.tokenBMint)) || {
      mint: selectedPool.tokenBMint,
      symbol: selectedPool.tokenBMint.toBase58().slice(0, 8) + "...",
      name: selectedPool.tokenBMint.toBase58(),
      decimals: 9
    };
  }, [selectedPool, tokens]);
  const { availableNotes: notesA, totalAvailable: totalA, selectNotesForAmount: selectA } = (0, import_hooks17.useNoteSelector)(tokenA.mint);
  const { availableNotes: notesB, totalAvailable: totalB, selectNotesForAmount: selectB } = (0, import_hooks17.useNoteSelector)(tokenB.mint);
  const formatAmount = (value, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 8)}`;
  };
  (0, import_react14.useEffect)(() => {
    if (!selectedPool) return;
    if (lastEditedField === "A" && amountA) {
      const amountANum = parseFloat(amountA);
      if (!isNaN(amountANum) && amountANum > 0) {
        const amountALamports = BigInt(Math.floor(amountANum * 10 ** tokenA.decimals));
        const calculatedBLamports = amountALamports * selectedPool.reserveB / selectedPool.reserveA;
        const calculatedB = Number(calculatedBLamports) / 10 ** tokenB.decimals;
        setAmountB(calculatedB.toFixed(Math.min(6, tokenB.decimals)));
      }
    } else if (lastEditedField === "B" && amountB) {
      const amountBNum = parseFloat(amountB);
      if (!isNaN(amountBNum) && amountBNum > 0) {
        const amountBLamports = BigInt(Math.floor(amountBNum * 10 ** tokenB.decimals));
        const calculatedALamports = amountBLamports * selectedPool.reserveA / selectedPool.reserveB;
        const calculatedA = Number(calculatedALamports) / 10 ** tokenA.decimals;
        setAmountA(calculatedA.toFixed(Math.min(6, tokenA.decimals)));
      }
    }
  }, [lastEditedField, amountA, amountB, selectedPool, tokenA.decimals, tokenB.decimals]);
  const liquidityQuote = (0, import_react14.useMemo)(() => {
    if (!selectedPool) return null;
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
        selectedPool.reserveA,
        selectedPool.reserveB,
        selectedPool.lpSupply
      );
      const minLpAmount = lpAmount * (10000n - BigInt(slippageBps)) / 10000n;
      return {
        depositA,
        depositB,
        lpAmount,
        minLpAmount,
        shareOfPool: Number(lpAmount * 10000n / (selectedPool.lpSupply + lpAmount)) / 100
      };
    } catch (err) {
      return null;
    }
  }, [amountA, amountB, tokenA.decimals, tokenB.decimals, selectedPool, slippageBps]);
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
      const { stealthAddress: lpAddress } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
      const { stealthAddress: changeAAddress } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
      const { stealthAddress: changeBAddress } = (0, import_sdk3.generateStealthAddress)(wallet.publicKey);
      const result = await client.addLiquidity({
        inputA: selectedNotesA[0],
        inputB: selectedNotesB[0],
        poolId: selectedPool.address,
        // Use account address, not stored poolId field
        lpMint: selectedPool.lpMint,
        depositA: liquidityQuote.depositA,
        depositB: liquidityQuote.depositB,
        lpAmount: liquidityQuote.lpAmount,
        minLpAmount: liquidityQuote.minLpAmount,
        lpRecipient: lpAddress,
        changeARecipient: changeAAddress,
        changeBRecipient: changeBAddress
      });
      onSuccess?.(result.signature);
      setAmountA("");
      setAmountB("");
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Add liquidity failed");
    } finally {
      setIsAdding(false);
    }
  };
  const isDisabled = !isConnected || !isInitialized || isAdding || !amountA || !amountB || !liquidityQuote;
  if (ammPools.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className, style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h3", { style: styles.cardTitle, children: "Add Liquidity" }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { style: styles.cardDescription, children: "Provide liquidity to earn fees from swaps" }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { padding: "24px", textAlign: "center", color: colors.textMuted }, children: "No AMM pools available. Create a pool first." })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)(import_jsx_runtime18.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { className, style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("h3", { style: styles.cardTitle, children: "Add Liquidity" }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("p", { style: styles.cardDescription, children: "Provide liquidity to earn fees from swaps" }),
      /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { style: styles.label, children: "Select Pool" }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "select",
            {
              value: selectedPool?.poolId.toBase58() || "",
              onChange: (e) => {
                const pool = ammPools.find((p) => p.poolId.toBase58() === e.target.value);
                if (pool) {
                  setSelectedPool(pool);
                  setAmountA("");
                  setAmountB("");
                  setLastEditedField(null);
                }
              },
              disabled: isAdding,
              style: styles.input,
              children: ammPools.map((pool) => {
                const tA = tokens.find((t) => t.mint.equals(pool.tokenAMint));
                const tB = tokens.find((t) => t.mint.equals(pool.tokenBMint));
                const symbolA = tA?.symbol || pool.tokenAMint.toBase58().slice(0, 6) + "...";
                const symbolB = tB?.symbol || pool.tokenBMint.toBase58().slice(0, 6) + "...";
                return /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("option", { value: pool.poolId.toBase58(), children: [
                  symbolA,
                  " / ",
                  symbolB
                ] }, pool.poolId.toBase58());
              })
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { style: styles.label, children: tokenA.symbol }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "input",
            {
              type: "number",
              value: amountA,
              onChange: (e) => {
                setAmountA(e.target.value);
                setLastEditedField("A");
              },
              placeholder: "0.00",
              step: "any",
              min: "0",
              disabled: isAdding,
              style: styles.input
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { ...styles.spaceBetween, marginTop: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: "Available" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { style: { fontSize: "0.75rem", fontWeight: 600 }, children: [
              formatAmount(totalA, tokenA.decimals),
              " ",
              tokenA.symbol
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { display: "flex", justifyContent: "center", margin: "8px 0" }, children: /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
        /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("label", { style: styles.label, children: tokenB.symbol }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "input",
            {
              type: "number",
              value: amountB,
              onChange: (e) => {
                setAmountB(e.target.value);
                setLastEditedField("B");
              },
              placeholder: "0.00",
              step: "any",
              min: "0",
              disabled: isAdding,
              style: styles.input
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { ...styles.spaceBetween, marginTop: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: "Available" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { style: { fontSize: "0.75rem", fontWeight: 600 }, children: [
              formatAmount(totalB, tokenB.decimals),
              " ",
              tokenB.symbol
            ] })
          ] })
        ] }),
        liquidityQuote && /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: {
          background: colors.backgroundMuted,
          padding: "12px",
          borderRadius: "8px",
          fontSize: "0.875rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { color: colors.textMuted }, children: "Actual Deposit A" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { children: [
              formatAmount(liquidityQuote.depositA, tokenA.decimals),
              " ",
              tokenA.symbol
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { color: colors.textMuted }, children: "Actual Deposit B" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { children: [
              formatAmount(liquidityQuote.depositB, tokenB.decimals),
              " ",
              tokenB.symbol
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { color: colors.textMuted }, children: "LP Tokens" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { children: formatAmount(liquidityQuote.lpAmount, 9) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { color: colors.textMuted }, children: "Minimum LP Tokens" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { children: formatAmount(liquidityQuote.minLpAmount, 9) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { color: colors.textMuted }, children: "Share of Pool" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { children: [
              liquidityQuote.shareOfPool.toFixed(2),
              "%"
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("div", { style: styles.spaceBetween, children: [
            /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("span", { style: { color: colors.textMuted }, children: "Slippage Tolerance" }),
            /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("span", { children: [
              (slippageBps / 100).toFixed(2),
              "%"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime18.jsxs)("label", { style: styles.label, children: [
          "Slippage Tolerance (%)",
          /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
            "input",
            {
              type: "number",
              value: slippageBps / 100,
              onChange: (e) => setSlippageBps(Math.floor(parseFloat(e.target.value || "0") * 100)),
              placeholder: "1.0",
              step: "0.1",
              min: "0.1",
              max: "50",
              disabled: isAdding,
              style: { ...styles.input, marginTop: "8px" }
            }
          )
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
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
        liquidityQuote && (liquidityQuote.depositA !== BigInt(Math.floor(parseFloat(amountA) * 10 ** tokenA.decimals)) || liquidityQuote.depositB !== BigInt(Math.floor(parseFloat(amountB) * 10 ** tokenB.decimals))) && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { style: { ...styles.errorText, background: colors.backgroundMuted, padding: "12px", borderRadius: "8px", color: colors.textMuted }, children: "Note: Amounts will be adjusted to match pool ratio" })
      ] })
    ] }),
    selectedPool && /* @__PURE__ */ (0, import_jsx_runtime18.jsx)(
      AmmPoolDetails,
      {
        tokenA,
        tokenB,
        pool: selectedPool,
        className
      }
    )
  ] });
}

// src/components/RemoveLiquidityForm.tsx
var import_react15 = require("react");
var import_hooks18 = require("@cloakcraft/hooks");
var import_sdk4 = require("@cloakcraft/sdk");

// ../../node_modules/.pnpm/@noble+hashes@1.8.0/node_modules/@noble/hashes/esm/_u64.js
var U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
var _32n = /* @__PURE__ */ BigInt(32);
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  const len = lst.length;
  let Ah = new Uint32Array(len);
  let Al = new Uint32Array(len);
  for (let i = 0; i < len; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
var rotlSH = (h, l, s) => h << s | l >>> 32 - s;
var rotlSL = (h, l, s) => l << s | h >>> 32 - s;
var rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
var rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;

// ../../node_modules/.pnpm/@noble+hashes@1.8.0/node_modules/@noble/hashes/esm/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u32(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
var isLE = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
function byteSwap(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
  return arr;
}
var swap32IfBE = isLE ? (u) => u : byteSwap32;
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  abytes(data);
  return data;
}
var Hash = class {
};
function createHasher(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}

// ../../node_modules/.pnpm/@noble+hashes@1.8.0/node_modules/@noble/hashes/esm/sha3.js
var _0n = BigInt(0);
var _1n = BigInt(1);
var _2n = BigInt(2);
var _7n = BigInt(7);
var _256n = BigInt(256);
var _0x71n = BigInt(113);
var SHA3_PI = [];
var SHA3_ROTL = [];
var _SHA3_IOTA = [];
for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
  [x, y] = [y, (2 * x + 3 * y) % 5];
  SHA3_PI.push(2 * (5 * y + x));
  SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
  let t = _0n;
  for (let j = 0; j < 7; j++) {
    R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
    if (R & _2n)
      t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
  }
  _SHA3_IOTA.push(t);
}
var IOTAS = split(_SHA3_IOTA, true);
var SHA3_IOTA_H = IOTAS[0];
var SHA3_IOTA_L = IOTAS[1];
var rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
var rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  clean(B);
}
var Keccak = class _Keccak extends Hash {
  // NOTE: we accept arguments in bytes instead of bits here.
  constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
    super();
    this.pos = 0;
    this.posOut = 0;
    this.finished = false;
    this.destroyed = false;
    this.enableXOF = false;
    this.blockLen = blockLen;
    this.suffix = suffix;
    this.outputLen = outputLen;
    this.enableXOF = enableXOF;
    this.rounds = rounds;
    anumber(outputLen);
    if (!(0 < blockLen && blockLen < 200))
      throw new Error("only keccak-f1600 function is supported");
    this.state = new Uint8Array(200);
    this.state32 = u32(this.state);
  }
  clone() {
    return this._cloneInto();
  }
  keccak() {
    swap32IfBE(this.state32);
    keccakP(this.state32, this.rounds);
    swap32IfBE(this.state32);
    this.posOut = 0;
    this.pos = 0;
  }
  update(data) {
    aexists(this);
    data = toBytes(data);
    abytes(data);
    const { blockLen, state } = this;
    const len = data.length;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      for (let i = 0; i < take; i++)
        state[this.pos++] ^= data[pos++];
      if (this.pos === blockLen)
        this.keccak();
    }
    return this;
  }
  finish() {
    if (this.finished)
      return;
    this.finished = true;
    const { state, suffix, pos, blockLen } = this;
    state[pos] ^= suffix;
    if ((suffix & 128) !== 0 && pos === blockLen - 1)
      this.keccak();
    state[blockLen - 1] ^= 128;
    this.keccak();
  }
  writeInto(out) {
    aexists(this, false);
    abytes(out);
    this.finish();
    const bufferOut = this.state;
    const { blockLen } = this;
    for (let pos = 0, len = out.length; pos < len; ) {
      if (this.posOut >= blockLen)
        this.keccak();
      const take = Math.min(blockLen - this.posOut, len - pos);
      out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
      this.posOut += take;
      pos += take;
    }
    return out;
  }
  xofInto(out) {
    if (!this.enableXOF)
      throw new Error("XOF is not possible for this instance");
    return this.writeInto(out);
  }
  xof(bytes) {
    anumber(bytes);
    return this.xofInto(new Uint8Array(bytes));
  }
  digestInto(out) {
    aoutput(out, this);
    if (this.finished)
      throw new Error("digest() was already called");
    this.writeInto(out);
    this.destroy();
    return out;
  }
  digest() {
    return this.digestInto(new Uint8Array(this.outputLen));
  }
  destroy() {
    this.destroyed = true;
    clean(this.state);
  }
  _cloneInto(to) {
    const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
    to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
    to.state32.set(this.state32);
    to.pos = this.pos;
    to.posOut = this.posOut;
    to.finished = this.finished;
    to.rounds = rounds;
    to.suffix = suffix;
    to.outputLen = outputLen;
    to.enableXOF = enableXOF;
    to.destroyed = this.destroyed;
    return to;
  }
};
var gen = (suffix, blockLen, outputLen) => createHasher(() => new Keccak(blockLen, suffix, outputLen));
var keccak_256 = /* @__PURE__ */ (() => gen(1, 136, 256 / 8))();

// src/components/RemoveLiquidityForm.tsx
var import_jsx_runtime19 = require("react/jsx-runtime");
function RemoveLiquidityForm({
  tokens,
  ammPools,
  onSuccess,
  onError,
  className,
  walletPublicKey
}) {
  const [selectedPool, setSelectedPool] = (0, import_react15.useState)(ammPools[0]);
  const [lpAmount, setLpAmount] = (0, import_react15.useState)("");
  const [exactLpAmount, setExactLpAmount] = (0, import_react15.useState)(null);
  const [isRemoving, setIsRemoving] = (0, import_react15.useState)(false);
  const { isConnected, isInitialized, wallet } = (0, import_hooks18.useWallet)();
  const { client } = (0, import_hooks18.useCloakCraft)();
  const lpTokenMint = selectedPool?.lpMint;
  const { availableNotes: lpNotes, totalAvailable: totalLp, selectNotesForAmount: selectLp } = (0, import_hooks18.useNoteSelector)(lpTokenMint);
  const tokenA = (0, import_react15.useMemo)(() => {
    if (!selectedPool) return tokens[0];
    return tokens.find((t) => t.mint.equals(selectedPool.tokenAMint)) || {
      mint: selectedPool.tokenAMint,
      symbol: selectedPool.tokenAMint.toBase58().slice(0, 8) + "...",
      name: selectedPool.tokenAMint.toBase58(),
      decimals: 9
    };
  }, [selectedPool, tokens]);
  const tokenB = (0, import_react15.useMemo)(() => {
    if (!selectedPool) return tokens[1] || tokens[0];
    return tokens.find((t) => t.mint.equals(selectedPool.tokenBMint)) || {
      mint: selectedPool.tokenBMint,
      symbol: selectedPool.tokenBMint.toBase58().slice(0, 8) + "...",
      name: selectedPool.tokenBMint.toBase58(),
      decimals: 9
    };
  }, [selectedPool, tokens]);
  const formatAmount = (value, decimals) => {
    const divisor = BigInt(10 ** decimals);
    const whole = value / divisor;
    const fractional = value % divisor;
    return `${whole}.${fractional.toString().padStart(decimals, "0").slice(0, 8)}`;
  };
  const withdrawQuote = (0, import_react15.useMemo)(() => {
    if (!selectedPool) return null;
    let lpAmountLamports;
    if (exactLpAmount !== null) {
      lpAmountLamports = exactLpAmount;
    } else {
      const lpAmountNum = parseFloat(lpAmount);
      if (isNaN(lpAmountNum) || lpAmountNum <= 0) {
        return null;
      }
      lpAmountLamports = BigInt(Math.floor(lpAmountNum * 10 ** 9));
    }
    try {
      const { outputA, outputB } = (0, import_sdk4.calculateRemoveLiquidityOutput)(
        lpAmountLamports,
        selectedPool.lpSupply,
        selectedPool.reserveA,
        selectedPool.reserveB
      );
      const shareOfPool = Number(lpAmountLamports * 10000n / selectedPool.lpSupply) / 100;
      return {
        outputA,
        outputB,
        shareOfPool,
        lpAmountLamports
        // Include exact amount in quote
      };
    } catch (err) {
      return null;
    }
  }, [lpAmount, exactLpAmount, selectedPool]);
  const handleSetMaxLp = () => {
    const maxLp = formatAmount(totalLp, 9);
    setLpAmount(maxLp);
    setExactLpAmount(totalLp);
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPool) {
      onError?.("Please select a pool");
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
    const lpAmountLamports = withdrawQuote.lpAmountLamports;
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
      const { stealthAddress: outputAAddress } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
      const { stealthAddress: outputBAddress } = (0, import_sdk4.generateStealthAddress)(wallet.publicKey);
      if (!selectedLpNotes[0].accountHash) {
        throw new Error("LP note missing accountHash. Try rescanning notes.");
      }
      const merkleProof = await client.getMerkleProof(selectedLpNotes[0].accountHash);
      const computePoolStateHash = (reserveA, reserveB, lpSupply, poolAddress) => {
        const data = new Uint8Array(8 + 8 + 8 + 32);
        const bigintToLE = (value, offset) => {
          let v = value;
          for (let i = 0; i < 8; i++) {
            data[offset + i] = Number(v & 0xFFn);
            v = v >> 8n;
          }
        };
        bigintToLE(reserveA, 0);
        bigintToLE(reserveB, 8);
        bigintToLE(lpSupply, 16);
        data.set(poolAddress.toBytes(), 24);
        return keccak_256(data);
      };
      const oldPoolStateHash = computePoolStateHash(
        selectedPool.reserveA,
        selectedPool.reserveB,
        selectedPool.lpSupply,
        selectedPool.address
      );
      const newReserveA = selectedPool.reserveA - withdrawQuote.outputA;
      const newReserveB = selectedPool.reserveB - withdrawQuote.outputB;
      const newLpSupply = selectedPool.lpSupply - lpAmountLamports;
      const newPoolStateHash = computePoolStateHash(
        newReserveA,
        newReserveB,
        newLpSupply,
        selectedPool.address
      );
      const result = await client.removeLiquidity({
        lpInput: selectedLpNotes[0],
        poolId: selectedPool.address,
        // Use account address, not stored poolId field
        lpAmount: lpAmountLamports,
        tokenAMint: tokenA.mint,
        tokenBMint: tokenB.mint,
        oldPoolStateHash,
        newPoolStateHash,
        outputARecipient: outputAAddress,
        outputBRecipient: outputBAddress,
        merklePath: merkleProof.pathElements,
        merklePathIndices: merkleProof.pathIndices,
        outputAAmount: withdrawQuote.outputA,
        outputBAmount: withdrawQuote.outputB
      });
      onSuccess?.(result.signature);
      setLpAmount("");
      setExactLpAmount(null);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : "Remove liquidity failed");
    } finally {
      setIsRemoving(false);
    }
  };
  const isDisabled = !isConnected || !isInitialized || isRemoving || !lpAmount || !withdrawQuote || ammPools.length === 0;
  if (ammPools.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className, style: styles.card, children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h3", { style: styles.cardTitle, children: "Remove Liquidity" }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { style: { ...styles.cardDescription, marginTop: "16px", color: colors.textMuted }, children: "No AMM pools available. Add liquidity to a pool first." })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className, style: styles.card, children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("h3", { style: styles.cardTitle, children: "Remove Liquidity" }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { style: styles.cardDescription, children: "Withdraw your liquidity by burning LP tokens" }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("form", { onSubmit: handleSubmit, style: styles.form, children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("label", { style: styles.label, children: "Select Pool" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "select",
          {
            value: selectedPool?.address.toBase58() || "",
            onChange: (e) => {
              const pool = ammPools.find((p) => p.address.toBase58() === e.target.value);
              if (pool) {
                setSelectedPool(pool);
                setLpAmount("");
              }
            },
            disabled: isRemoving,
            style: styles.input,
            children: ammPools.map((pool) => {
              const tA = tokens.find((t) => t.mint.equals(pool.tokenAMint));
              const tB = tokens.find((t) => t.mint.equals(pool.tokenBMint));
              const symbolA = tA?.symbol || pool.tokenAMint.toBase58().slice(0, 6) + "...";
              const symbolB = tB?.symbol || pool.tokenBMint.toBase58().slice(0, 6) + "...";
              return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("option", { value: pool.address.toBase58(), children: [
                symbolA,
                " / ",
                symbolB
              ] }, pool.address.toBase58());
            })
          }
        ),
        selectedPool && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: {
          marginTop: "12px",
          padding: "12px",
          background: colors.backgroundMuted,
          borderRadius: "8px",
          fontSize: "0.875rem"
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { style: { color: colors.textMuted }, children: [
              "Reserve ",
              tokenA.symbol
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { children: [
              formatAmount(selectedPool.reserveA, tokenA.decimals),
              " ",
              tokenA.symbol
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { style: { color: colors.textMuted }, children: [
              "Reserve ",
              tokenB.symbol
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { children: [
              formatAmount(selectedPool.reserveB, tokenB.decimals),
              " ",
              tokenB.symbol
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: styles.spaceBetween, children: [
            /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { color: colors.textMuted }, children: "Total LP Supply" }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { children: [
              formatAmount(selectedPool.lpSupply, 9),
              " LP"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("label", { style: styles.label, children: "LP Tokens to Burn" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
          "input",
          {
            type: "number",
            value: lpAmount,
            onChange: (e) => {
              setLpAmount(e.target.value);
              setExactLpAmount(null);
            },
            placeholder: "0.00",
            step: "any",
            min: "0",
            disabled: isRemoving,
            style: styles.input
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { ...styles.spaceBetween, marginTop: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { fontSize: "0.75rem", color: colors.textMuted }, children: "Available LP" }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(
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
      withdrawQuote && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: {
        background: colors.backgroundMuted,
        padding: "12px",
        borderRadius: "8px",
        fontSize: "0.875rem"
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { marginBottom: "12px", fontWeight: 600, color: colors.text }, children: "You will receive:" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "8px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { color: colors.textMuted }, children: tokenA.symbol }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { children: [
            formatAmount(withdrawQuote.outputA, tokenA.decimals),
            " ",
            tokenA.symbol
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: { ...styles.spaceBetween, marginBottom: "12px" }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { color: colors.textMuted }, children: tokenB.symbol }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { children: [
            formatAmount(withdrawQuote.outputB, tokenB.decimals),
            " ",
            tokenB.symbol
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { style: styles.spaceBetween, children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { style: { color: colors.textMuted }, children: "Your Share" }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("span", { children: [
            withdrawQuote.shareOfPool.toFixed(2),
            "% of pool"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(
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
var import_jsx_runtime20 = require("react/jsx-runtime");
function SwapPanel({ initialTab = "swap", walletPublicKey }) {
  const [activeTab, setActiveTab] = (0, import_react16.useState)(initialTab);
  const [initializedPoolMints, setInitializedPoolMints] = (0, import_react16.useState)(/* @__PURE__ */ new Set());
  const [ammPools, setAmmPools] = (0, import_react16.useState)([]);
  const [isLoadingPools, setIsLoadingPools] = (0, import_react16.useState)(true);
  const [isInitializingCircuits, setIsInitializingCircuits] = (0, import_react16.useState)(false);
  const { client, notes, sync, initializeProver } = (0, import_hooks19.useCloakCraft)();
  (0, import_react16.useEffect)(() => {
    const initCircuits = async () => {
      if (!client) return;
      setIsInitializingCircuits(true);
      try {
        await initializeProver(["swap/swap", "swap/add_liquidity", "swap/remove_liquidity"]);
        console.log("[SwapPanel] Swap circuits initialized");
      } catch (err) {
        console.error("[SwapPanel] Failed to initialize swap circuits:", err);
      } finally {
        setIsInitializingCircuits(false);
      }
    };
    initCircuits();
  }, [client, initializeProver]);
  const fetchPools = async () => {
    if (!client) return;
    if (!client.getProgram()) {
      console.log("[SwapPanel] Waiting for program to be configured...");
      return;
    }
    setIsLoadingPools(true);
    try {
      const pools = await client.getAllPools();
      const poolsWithLiquidity = pools.filter((pool) => pool.totalShielded > BigInt(0));
      const mints = new Set(poolsWithLiquidity.map((pool) => pool.tokenMint.toBase58()));
      setInitializedPoolMints(mints);
      const ammPoolList = await client.getAllAmmPools();
      const activeAmmPools = ammPoolList.filter(
        (pool) => pool.isActive && pool.reserveA > BigInt(0) && pool.reserveB > BigInt(0)
      );
      setAmmPools(activeAmmPools);
    } catch (err) {
      console.error("Error fetching pools:", err);
      setInitializedPoolMints(/* @__PURE__ */ new Set());
      setAmmPools([]);
    }
    setIsLoadingPools(false);
  };
  (0, import_react16.useEffect)(() => {
    fetchPools();
  }, [client]);
  const poolTokens = (0, import_react16.useMemo)(() => {
    const tokens = [];
    DEVNET_TOKENS.forEach((token) => {
      if (initializedPoolMints.has(token.mint.toBase58())) {
        tokens.push(token);
      }
    });
    initializedPoolMints.forEach((mintStr) => {
      const isKnown = DEVNET_TOKENS.some((t) => t.mint.toBase58() === mintStr);
      if (!isKnown) {
        tokens.push({
          mint: new import_web35.PublicKey(mintStr),
          symbol: mintStr.slice(0, 8) + "...",
          name: mintStr,
          decimals: 9
        });
      }
    });
    return tokens;
  }, [initializedPoolMints]);
  const tokensWithNotes = (0, import_react16.useMemo)(() => {
    const notesByMint = /* @__PURE__ */ new Map();
    notes.forEach((note) => {
      const mintStr = note.tokenMint.toBase58();
      notesByMint.set(mintStr, (notesByMint.get(mintStr) || 0) + 1);
    });
    return poolTokens.filter((token) => {
      const noteCount = notesByMint.get(token.mint.toBase58()) || 0;
      return noteCount > 0;
    });
  }, [poolTokens, notes]);
  const tabs = [
    { id: "swap", label: "Swap" },
    { id: "add", label: "Add Liquidity" },
    { id: "remove", label: "Remove Liquidity" }
  ];
  if (isLoadingPools || isInitializingCircuits) {
    return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { width: "100%", maxWidth: "600px", padding: "24px", textAlign: "center" }, children: isInitializingCircuits ? "Initializing swap circuits..." : "Loading pools..." });
  }
  if (poolTokens.length === 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { width: "100%", maxWidth: "600px", padding: "24px", textAlign: "center" }, children: "No initialized pools found. Please initialize a pool first." });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { style: { width: "100%", maxWidth: "600px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
      "div",
      {
        style: {
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          borderBottom: `1px solid ${colors.border}`
        },
        children: tabs.map((tab) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
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
    activeTab === "swap" && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
      SwapForm,
      {
        tokens: poolTokens,
        ammPools,
        walletPublicKey,
        onSuccess: async (signature) => {
          console.log("Swap success:", signature);
          alert(`Swap successful!
TX: ${signature}`);
          await sync(void 0, true);
          await fetchPools();
        },
        onError: (error) => {
          console.error("Swap error:", error);
          alert(`Swap error: ${error}`);
        }
      }
    ),
    activeTab === "add" && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
      AddLiquidityForm,
      {
        tokens: poolTokens,
        ammPools,
        walletPublicKey,
        onSuccess: async (signature) => {
          console.log("Add liquidity success:", signature);
          alert(`Liquidity added successfully!
TX: ${signature}`);
          await sync(void 0, true);
          await fetchPools();
        },
        onError: (error) => {
          console.error("Add liquidity error:", error);
          alert(`Add liquidity error: ${error}`);
        }
      }
    ),
    activeTab === "remove" && tokensWithNotes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { style: { padding: "24px", textAlign: "center", color: colors.textMuted }, children: "No LP tokens found. Add liquidity to a pool first." }) : activeTab === "remove" ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(
      RemoveLiquidityForm,
      {
        tokens: tokensWithNotes,
        ammPools,
        walletPublicKey,
        onSuccess: async (signature) => {
          console.log("Remove liquidity success:", signature);
          alert(`Liquidity removed successfully!
TX: ${signature}`);
          await sync(void 0, true);
          await fetchPools();
        },
        onError: (error) => {
          console.error("Remove liquidity error:", error);
          alert(`Remove liquidity error: ${error}`);
        }
      }
    ) : null
  ] });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AddLiquidityForm,
  AmmPoolDetails,
  BalanceDisplay,
  BalanceInline,
  BalanceSummary,
  CloakCraftProvider,
  CreatePoolForm,
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
/*! Bundled license information:

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/
