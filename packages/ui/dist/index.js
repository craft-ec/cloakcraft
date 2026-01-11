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
  BalanceDisplay: () => BalanceDisplay,
  CloakCraftProvider: () => import_hooks7.CloakCraftProvider,
  NotesList: () => NotesList,
  OrderBook: () => OrderBook,
  ShieldForm: () => ShieldForm,
  TransferForm: () => TransferForm,
  WalletButton: () => WalletButton
});
module.exports = __toCommonJS(index_exports);
var import_hooks7 = require("@cloakcraft/hooks");

// src/components/WalletButton.tsx
var import_hooks = require("@cloakcraft/hooks");
var import_jsx_runtime = require("react/jsx-runtime");
function WalletButton({ className }) {
  const { isConnected, connect, disconnect, publicKey, createWallet } = (0, import_hooks.useWallet)();
  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      const wallet = createWallet();
      connect(wallet.exportSpendingKey());
    }
  };
  const truncateKey = (key) => {
    if (!key) return "";
    const hex = Buffer.from(key.x).toString("hex");
    return `${hex.slice(0, 4)}...${hex.slice(-4)}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      onClick: handleClick,
      className,
      style: {
        padding: "8px 16px",
        borderRadius: "8px",
        border: "none",
        backgroundColor: isConnected ? "#10b981" : "#6366f1",
        color: "white",
        cursor: "pointer",
        fontWeight: 500
      },
      children: isConnected ? `Connected: ${truncateKey(publicKey)}` : "Connect Wallet"
    }
  );
}

// src/components/BalanceDisplay.tsx
var import_hooks2 = require("@cloakcraft/hooks");
var import_jsx_runtime2 = require("react/jsx-runtime");
function BalanceDisplay({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  className
}) {
  const { balance, isLoading, refresh } = (0, import_hooks2.useBalance)(tokenMint);
  const formatBalance = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fractionalStr}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className, style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { fontSize: "1.5rem", fontWeight: 600 }, children: isLoading ? "..." : formatBalance(balance) }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { style: { color: "#6b7280" }, children: symbol }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "button",
      {
        onClick: refresh,
        disabled: isLoading,
        style: {
          padding: "4px 8px",
          borderRadius: "4px",
          border: "1px solid #e5e7eb",
          background: "white",
          cursor: "pointer"
        },
        children: "\u21BB"
      }
    )
  ] });
}

// src/components/ShieldForm.tsx
var import_react = require("react");
var import_web3 = require("@solana/web3.js");
var import_hooks3 = require("@cloakcraft/hooks");
var import_jsx_runtime3 = require("react/jsx-runtime");
function ShieldForm({
  tokenMint,
  decimals = 9,
  onSuccess,
  className
}) {
  const [amount, setAmount] = (0, import_react.useState)("");
  const { isShielding, error, result, shield, reset } = (0, import_hooks3.useShield)();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));
    const payer = import_web3.Keypair.generate();
    const txResult = await shield(tokenMint, amountLamports, payer);
    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount("");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className, children: /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("form", { onSubmit: handleSubmit, style: { display: "flex", flexDirection: "column", gap: "12px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { style: { fontWeight: 500 }, children: [
      "Amount to Shield",
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        "input",
        {
          type: "number",
          value: amount,
          onChange: (e) => setAmount(e.target.value),
          placeholder: "0.00",
          step: "0.000001",
          min: "0",
          disabled: isShielding,
          style: {
            width: "100%",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            marginTop: "4px"
          }
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      "button",
      {
        type: "submit",
        disabled: isShielding || !amount,
        style: {
          padding: "12px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: isShielding ? "#9ca3af" : "#6366f1",
          color: "white",
          cursor: isShielding ? "wait" : "pointer",
          fontWeight: 500
        },
        children: isShielding ? "Shielding..." : "Shield Tokens"
      }
    ),
    error && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { style: { color: "#ef4444", fontSize: "0.875rem" }, children: error }),
    result && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { style: { color: "#10b981", fontSize: "0.875rem" }, children: [
      "Success! Tx: ",
      result.signature.slice(0, 8),
      "..."
    ] })
  ] }) });
}

// src/components/TransferForm.tsx
var import_react2 = require("react");
var import_hooks4 = require("@cloakcraft/hooks");
var import_sdk = require("@cloakcraft/sdk");
var import_jsx_runtime4 = require("react/jsx-runtime");
function TransferForm({
  tokenMint,
  decimals = 9,
  onSuccess,
  className
}) {
  const [recipientPubkey, setRecipientPubkey] = (0, import_react2.useState)("");
  const [amount, setAmount] = (0, import_react2.useState)("");
  const { isTransferring, error, result, transfer, reset } = (0, import_hooks4.useTransfer)();
  const { notes } = (0, import_hooks4.useNotes)(tokenMint);
  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));
    let total = 0n;
    const selectedNotes = [];
    for (const note of notes) {
      if (total >= amountLamports) break;
      selectedNotes.push(note);
      total += note.amount;
    }
    if (total < amountLamports) {
      return;
    }
    const recipientPoint = parsePublicKey(recipientPubkey);
    if (!recipientPoint) {
      return;
    }
    const { stealthAddress } = (0, import_sdk.generateStealthAddress)(recipientPoint);
    const txResult = await transfer(
      selectedNotes,
      [{ recipient: stealthAddress, amount: amountLamports }]
    );
    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount("");
      setRecipientPubkey("");
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className, children: /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("form", { onSubmit: handleSubmit, style: { display: "flex", flexDirection: "column", gap: "12px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { style: { fontWeight: 500 }, children: [
      "Recipient Public Key",
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "input",
        {
          type: "text",
          value: recipientPubkey,
          onChange: (e) => setRecipientPubkey(e.target.value),
          placeholder: "Enter recipient's BabyJubJub public key",
          disabled: isTransferring,
          style: {
            width: "100%",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            marginTop: "4px",
            fontFamily: "monospace",
            fontSize: "0.875rem"
          }
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { style: { fontWeight: 500 }, children: [
      "Amount",
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "input",
        {
          type: "number",
          value: amount,
          onChange: (e) => setAmount(e.target.value),
          placeholder: "0.00",
          step: "0.000001",
          min: "0",
          disabled: isTransferring,
          style: {
            width: "100%",
            padding: "8px 12px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            marginTop: "4px"
          }
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "button",
      {
        type: "submit",
        disabled: isTransferring || !amount || !recipientPubkey,
        style: {
          padding: "12px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: isTransferring ? "#9ca3af" : "#6366f1",
          color: "white",
          cursor: isTransferring ? "wait" : "pointer",
          fontWeight: 500
        },
        children: isTransferring ? "Transferring..." : "Send Private Transfer"
      }
    ),
    error && /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { style: { color: "#ef4444", fontSize: "0.875rem" }, children: error }),
    result && /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { style: { color: "#10b981", fontSize: "0.875rem" }, children: [
      "Success! Tx: ",
      result.signature.slice(0, 8),
      "..."
    ] })
  ] }) });
}
function parsePublicKey(hex) {
  try {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    if (clean.length !== 128) return null;
    const bytes = Buffer.from(clean, "hex");
    return {
      x: new Uint8Array(bytes.slice(0, 32)),
      y: new Uint8Array(bytes.slice(32, 64))
    };
  } catch {
    return null;
  }
}

// src/components/NotesList.tsx
var import_hooks5 = require("@cloakcraft/hooks");
var import_jsx_runtime5 = require("react/jsx-runtime");
function NotesList({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  className
}) {
  const { notes, totalAmount, isSyncing, sync } = (0, import_hooks5.useNotes)(tokenMint);
  const formatAmount = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fractionalStr}`;
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("h3", { style: { margin: 0 }, children: [
        "Your Notes (",
        notes.length,
        ")"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "button",
        {
          onClick: sync,
          disabled: isSyncing,
          style: {
            padding: "4px 12px",
            borderRadius: "4px",
            border: "1px solid #e5e7eb",
            background: "white",
            cursor: isSyncing ? "wait" : "pointer"
          },
          children: isSyncing ? "Syncing..." : "Refresh"
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { marginBottom: "12px", padding: "12px", background: "#f3f4f6", borderRadius: "8px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { style: { fontWeight: 500 }, children: "Total: " }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
        formatAmount(totalAmount),
        " ",
        symbol
      ] })
    ] }),
    notes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("p", { style: { color: "#6b7280", textAlign: "center", padding: "24px" }, children: "No notes found. Shield some tokens to get started." }) : /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: notes.map((note, index) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "div",
      {
        style: {
          padding: "12px",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        },
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { fontWeight: 500 }, children: [
              formatAmount(note.amount),
              " ",
              symbol
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }, children: [
              "Leaf #",
              note.leafIndex
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { style: { fontSize: "0.75rem", color: "#6b7280" }, children: [
            Buffer.from(note.commitment).toString("hex").slice(0, 8),
            "..."
          ] })
        ]
      },
      index
    )) })
  ] });
}

// src/components/OrderBook.tsx
var import_hooks6 = require("@cloakcraft/hooks");
var import_jsx_runtime6 = require("react/jsx-runtime");
function OrderBook({ className }) {
  const { orders, isLoading, error, refresh } = (0, import_hooks6.useOrders)();
  const formatExpiry = (timestamp) => {
    const date = new Date(timestamp * 1e3);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };
  const getStatusBadge = (status) => {
    const styles = {
      0: { bg: "#dcfce7", text: "#166534", label: "Open" },
      1: { bg: "#dbeafe", text: "#1e40af", label: "Filled" },
      2: { bg: "#fee2e2", text: "#991b1b", label: "Cancelled" }
    };
    const style = styles[status] ?? { bg: "#f3f4f6", text: "#374151", label: "Unknown" };
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className, children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { style: { margin: 0 }, children: "Order Book" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
    error && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { color: "#ef4444", padding: "12px", background: "#fee2e2", borderRadius: "8px", marginBottom: "12px" }, children: error }),
    orders.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { style: { color: "#6b7280", textAlign: "center", padding: "24px" }, children: "No open orders. Create an order to start trading." }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("thead", { children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("tr", { style: { borderBottom: "2px solid #e5e7eb" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { style: { textAlign: "left", padding: "8px" }, children: "Order ID" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { style: { textAlign: "left", padding: "8px" }, children: "Status" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { style: { textAlign: "left", padding: "8px" }, children: "Expiry" }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("th", { style: { textAlign: "right", padding: "8px" }, children: "Actions" })
      ] }) }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("tbody", { children: orders.map((order, index) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("tr", { style: { borderBottom: "1px solid #e5e7eb" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("td", { style: { padding: "12px 8px", fontFamily: "monospace", fontSize: "0.875rem" }, children: [
          Buffer.from(order.orderId).toString("hex").slice(0, 16),
          "..."
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { style: { padding: "12px 8px" }, children: getStatusBadge(order.status) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { style: { padding: "12px 8px", fontSize: "0.875rem" }, children: formatExpiry(order.expiry) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("td", { style: { padding: "12px 8px", textAlign: "right" }, children: order.status === 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  BalanceDisplay,
  CloakCraftProvider,
  NotesList,
  OrderBook,
  ShieldForm,
  TransferForm,
  WalletButton
});
