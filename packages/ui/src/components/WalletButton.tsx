/**
 * Wallet connection button component
 */

import React from 'react';
import { useWallet } from '@cloakcraft/hooks';

interface WalletButtonProps {
  className?: string;
}

export function WalletButton({ className }: WalletButtonProps) {
  const { isConnected, connect, disconnect, publicKey, createWallet } = useWallet();

  const handleClick = () => {
    if (isConnected) {
      disconnect();
    } else {
      // Create a new wallet for demo
      const wallet = createWallet();
      connect(wallet.exportSpendingKey());
    }
  };

  const truncateKey = (key: { x: Uint8Array; y: Uint8Array } | null) => {
    if (!key) return '';
    const hex = Buffer.from(key.x).toString('hex');
    return `${hex.slice(0, 4)}...${hex.slice(-4)}`;
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      style={{
        padding: '8px 16px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: isConnected ? '#10b981' : '#6366f1',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 500,
      }}
    >
      {isConnected ? `Connected: ${truncateKey(publicKey)}` : 'Connect Wallet'}
    </button>
  );
}
