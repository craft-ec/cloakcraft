// src/index.ts
import { CloakCraftProvider } from "@cloakcraft/hooks";

// src/components/WalletButton.tsx
import { useWallet } from "@cloakcraft/hooks";
import { jsx } from "react/jsx-runtime";
function WalletButton({ className }) {
  const { isConnected, connect, disconnect, publicKey, createWallet } = useWallet();
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
  return /* @__PURE__ */ jsx(
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
import { useBalance } from "@cloakcraft/hooks";
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
function BalanceDisplay({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  className
}) {
  const { balance, isLoading, refresh } = useBalance(tokenMint);
  const formatBalance = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fractionalStr}`;
  };
  return /* @__PURE__ */ jsxs("div", { className, style: { display: "flex", alignItems: "center", gap: "8px" }, children: [
    /* @__PURE__ */ jsx2("span", { style: { fontSize: "1.5rem", fontWeight: 600 }, children: isLoading ? "..." : formatBalance(balance) }),
    /* @__PURE__ */ jsx2("span", { style: { color: "#6b7280" }, children: symbol }),
    /* @__PURE__ */ jsx2(
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
import { useState } from "react";
import { Keypair as SolanaKeypair } from "@solana/web3.js";
import { useShield } from "@cloakcraft/hooks";
import { jsx as jsx3, jsxs as jsxs2 } from "react/jsx-runtime";
function ShieldForm({
  tokenMint,
  decimals = 9,
  onSuccess,
  className
}) {
  const [amount, setAmount] = useState("");
  const { isShielding, error, result, shield, reset } = useShield();
  const handleSubmit = async (e) => {
    e.preventDefault();
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return;
    }
    const amountLamports = BigInt(Math.floor(amountNum * 10 ** decimals));
    const payer = SolanaKeypair.generate();
    const txResult = await shield(tokenMint, amountLamports, payer);
    if (txResult) {
      onSuccess?.(txResult.signature);
      setAmount("");
    }
  };
  return /* @__PURE__ */ jsx3("div", { className, children: /* @__PURE__ */ jsxs2("form", { onSubmit: handleSubmit, style: { display: "flex", flexDirection: "column", gap: "12px" }, children: [
    /* @__PURE__ */ jsxs2("label", { style: { fontWeight: 500 }, children: [
      "Amount to Shield",
      /* @__PURE__ */ jsx3(
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
    /* @__PURE__ */ jsx3(
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
    error && /* @__PURE__ */ jsx3("div", { style: { color: "#ef4444", fontSize: "0.875rem" }, children: error }),
    result && /* @__PURE__ */ jsxs2("div", { style: { color: "#10b981", fontSize: "0.875rem" }, children: [
      "Success! Tx: ",
      result.signature.slice(0, 8),
      "..."
    ] })
  ] }) });
}

// src/components/TransferForm.tsx
import { useState as useState2 } from "react";
import { useTransfer, useNotes } from "@cloakcraft/hooks";
import { generateStealthAddress } from "@cloakcraft/sdk";
import { jsx as jsx4, jsxs as jsxs3 } from "react/jsx-runtime";
function TransferForm({
  tokenMint,
  decimals = 9,
  onSuccess,
  className
}) {
  const [recipientPubkey, setRecipientPubkey] = useState2("");
  const [amount, setAmount] = useState2("");
  const { isTransferring, error, result, transfer, reset } = useTransfer();
  const { notes } = useNotes(tokenMint);
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
    const { stealthAddress } = generateStealthAddress(recipientPoint);
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
  return /* @__PURE__ */ jsx4("div", { className, children: /* @__PURE__ */ jsxs3("form", { onSubmit: handleSubmit, style: { display: "flex", flexDirection: "column", gap: "12px" }, children: [
    /* @__PURE__ */ jsxs3("label", { style: { fontWeight: 500 }, children: [
      "Recipient Public Key",
      /* @__PURE__ */ jsx4(
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
    /* @__PURE__ */ jsxs3("label", { style: { fontWeight: 500 }, children: [
      "Amount",
      /* @__PURE__ */ jsx4(
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
    /* @__PURE__ */ jsx4(
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
    error && /* @__PURE__ */ jsx4("div", { style: { color: "#ef4444", fontSize: "0.875rem" }, children: error }),
    result && /* @__PURE__ */ jsxs3("div", { style: { color: "#10b981", fontSize: "0.875rem" }, children: [
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
import { useNotes as useNotes2 } from "@cloakcraft/hooks";
import { jsx as jsx5, jsxs as jsxs4 } from "react/jsx-runtime";
function NotesList({
  tokenMint,
  decimals = 9,
  symbol = "tokens",
  className
}) {
  const { notes, totalAmount, isSyncing, sync } = useNotes2(tokenMint);
  const formatAmount = (amount) => {
    const divisor = BigInt(10 ** decimals);
    const whole = amount / divisor;
    const fractional = amount % divisor;
    const fractionalStr = fractional.toString().padStart(decimals, "0").slice(0, 4);
    return `${whole}.${fractionalStr}`;
  };
  return /* @__PURE__ */ jsxs4("div", { className, children: [
    /* @__PURE__ */ jsxs4("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }, children: [
      /* @__PURE__ */ jsxs4("h3", { style: { margin: 0 }, children: [
        "Your Notes (",
        notes.length,
        ")"
      ] }),
      /* @__PURE__ */ jsx5(
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
    /* @__PURE__ */ jsxs4("div", { style: { marginBottom: "12px", padding: "12px", background: "#f3f4f6", borderRadius: "8px" }, children: [
      /* @__PURE__ */ jsx5("span", { style: { fontWeight: 500 }, children: "Total: " }),
      /* @__PURE__ */ jsxs4("span", { children: [
        formatAmount(totalAmount),
        " ",
        symbol
      ] })
    ] }),
    notes.length === 0 ? /* @__PURE__ */ jsx5("p", { style: { color: "#6b7280", textAlign: "center", padding: "24px" }, children: "No notes found. Shield some tokens to get started." }) : /* @__PURE__ */ jsx5("div", { style: { display: "flex", flexDirection: "column", gap: "8px" }, children: notes.map((note, index) => /* @__PURE__ */ jsxs4(
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
          /* @__PURE__ */ jsxs4("div", { children: [
            /* @__PURE__ */ jsxs4("div", { style: { fontWeight: 500 }, children: [
              formatAmount(note.amount),
              " ",
              symbol
            ] }),
            /* @__PURE__ */ jsxs4("div", { style: { fontSize: "0.75rem", color: "#6b7280", fontFamily: "monospace" }, children: [
              "Leaf #",
              note.leafIndex
            ] })
          ] }),
          /* @__PURE__ */ jsxs4("div", { style: { fontSize: "0.75rem", color: "#6b7280" }, children: [
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
import { useOrders } from "@cloakcraft/hooks";
import { jsx as jsx6, jsxs as jsxs5 } from "react/jsx-runtime";
function OrderBook({ className }) {
  const { orders, isLoading, error, refresh } = useOrders();
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
    return /* @__PURE__ */ jsx6(
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
  return /* @__PURE__ */ jsxs5("div", { className, children: [
    /* @__PURE__ */ jsxs5("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }, children: [
      /* @__PURE__ */ jsx6("h3", { style: { margin: 0 }, children: "Order Book" }),
      /* @__PURE__ */ jsx6(
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
    error && /* @__PURE__ */ jsx6("div", { style: { color: "#ef4444", padding: "12px", background: "#fee2e2", borderRadius: "8px", marginBottom: "12px" }, children: error }),
    orders.length === 0 ? /* @__PURE__ */ jsx6("p", { style: { color: "#6b7280", textAlign: "center", padding: "24px" }, children: "No open orders. Create an order to start trading." }) : /* @__PURE__ */ jsx6("div", { style: { overflowX: "auto" }, children: /* @__PURE__ */ jsxs5("table", { style: { width: "100%", borderCollapse: "collapse" }, children: [
      /* @__PURE__ */ jsx6("thead", { children: /* @__PURE__ */ jsxs5("tr", { style: { borderBottom: "2px solid #e5e7eb" }, children: [
        /* @__PURE__ */ jsx6("th", { style: { textAlign: "left", padding: "8px" }, children: "Order ID" }),
        /* @__PURE__ */ jsx6("th", { style: { textAlign: "left", padding: "8px" }, children: "Status" }),
        /* @__PURE__ */ jsx6("th", { style: { textAlign: "left", padding: "8px" }, children: "Expiry" }),
        /* @__PURE__ */ jsx6("th", { style: { textAlign: "right", padding: "8px" }, children: "Actions" })
      ] }) }),
      /* @__PURE__ */ jsx6("tbody", { children: orders.map((order, index) => /* @__PURE__ */ jsxs5("tr", { style: { borderBottom: "1px solid #e5e7eb" }, children: [
        /* @__PURE__ */ jsxs5("td", { style: { padding: "12px 8px", fontFamily: "monospace", fontSize: "0.875rem" }, children: [
          Buffer.from(order.orderId).toString("hex").slice(0, 16),
          "..."
        ] }),
        /* @__PURE__ */ jsx6("td", { style: { padding: "12px 8px" }, children: getStatusBadge(order.status) }),
        /* @__PURE__ */ jsx6("td", { style: { padding: "12px 8px", fontSize: "0.875rem" }, children: formatExpiry(order.expiry) }),
        /* @__PURE__ */ jsx6("td", { style: { padding: "12px 8px", textAlign: "right" }, children: order.status === 0 && /* @__PURE__ */ jsx6(
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
export {
  BalanceDisplay,
  CloakCraftProvider,
  NotesList,
  OrderBook,
  ShieldForm,
  TransferForm,
  WalletButton
};
