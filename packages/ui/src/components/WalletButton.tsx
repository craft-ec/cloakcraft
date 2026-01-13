/**
 * Wallet connection button component
 */

import React, { useState } from 'react';
import { useWallet, WALLET_DERIVATION_MESSAGE } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface WalletButtonProps {
  className?: string;
  /** Show import option */
  showImport?: boolean;
  /** Solana wallet connection status */
  solanaConnected?: boolean;
  /** Sign message function from Solana wallet */
  signMessage?: (message: Uint8Array) => Promise<Uint8Array>;
}

export function WalletButton({
  className,
  showImport = false,
  solanaConnected = false,
  signMessage,
}: WalletButtonProps) {
  const {
    isConnected,
    isConnecting,
    isInitializing,
    disconnect,
    deriveFromSignature,
    createAndConnect,
    importFromKey,
    publicKey,
    error,
  } = useWallet();

  const [showImportModal, setShowImportModal] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (isConnected) {
      disconnect();
    } else {
      try {
        // If Solana wallet is connected and can sign, derive from it
        if (solanaConnected && signMessage) {
          const messageBytes = new TextEncoder().encode(WALLET_DERIVATION_MESSAGE);
          const signature = await signMessage(messageBytes);
          await deriveFromSignature(signature);
        } else {
          await createAndConnect();
        }
      } catch (err) {
        console.error('handleConnect error:', err);
      }
    }
  };

  const handleImport = async () => {
    setImportError(null);
    try {
      const keyBytes = Buffer.from(importKey.trim(), 'hex');
      if (keyBytes.length !== 32) {
        throw new Error('Spending key must be 32 bytes (64 hex characters)');
      }
      await importFromKey(new Uint8Array(keyBytes));
      setShowImportModal(false);
      setImportKey('');
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    }
  };

  const truncateKey = (key: { x: Uint8Array; y: Uint8Array } | null) => {
    if (!key) return '';
    const hex = Buffer.from(key.x).toString('hex');
    return `${hex.slice(0, 6)}...${hex.slice(-4)}`;
  };

  return (
    <div className={className}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleConnect}
          disabled={isConnecting || isInitializing || (!isConnected && !solanaConnected)}
          style={{
            ...styles.buttonPrimary,
            backgroundColor: isConnected ? colors.success : colors.primary,
            ...((isConnecting || isInitializing || (!isConnected && !solanaConnected)) ? styles.buttonDisabled : {}),
          }}
        >
          {isInitializing
            ? 'Initializing...'
            : isConnecting
            ? 'Deriving...'
            : isConnected
            ? `${truncateKey(publicKey)}`
            : solanaConnected
            ? 'Derive Stealth Wallet'
            : 'Connect Solana First'}
        </button>

        {showImport && !isConnected && (
          <button
            onClick={() => setShowImportModal(true)}
            disabled={isConnecting || isInitializing}
            style={{
              ...styles.buttonSecondary,
              ...(isConnecting || isInitializing ? styles.buttonDisabled : {}),
            }}
          >
            Import
          </button>
        )}

        {isConnected && (
          <button
            onClick={disconnect}
            style={styles.buttonSecondary}
          >
            Disconnect
          </button>
        )}
      </div>

      {error && <div style={{ ...styles.errorText, marginTop: '8px' }}>{error}</div>}

      {/* Import Modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowImportModal(false)}
        >
          <div
            style={{
              ...styles.card,
              maxWidth: '400px',
              width: '90%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={styles.cardTitle}>Import Wallet</h3>
            <p style={styles.cardDescription}>
              Enter your spending key (64 hex characters)
            </p>

            <div style={styles.form}>
              <textarea
                value={importKey}
                onChange={(e) => setImportKey(e.target.value)}
                placeholder="Enter spending key..."
                style={styles.textarea}
              />

              {importError && <div style={styles.errorText}>{importError}</div>}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowImportModal(false)}
                  style={styles.buttonSecondary}
                >
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importKey.trim()}
                  style={{
                    ...styles.buttonPrimary,
                    ...(!importKey.trim() ? styles.buttonDisabled : {}),
                  }}
                >
                  Import
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
