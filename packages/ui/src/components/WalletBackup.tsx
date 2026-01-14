/**
 * Wallet Backup component
 *
 * Allows users to backup/export their spending key and view wallet info
 */

import React, { useState, useCallback } from 'react';
import { useWallet } from '@cloakcraft/hooks';
import { styles, colors } from '../styles';

interface WalletBackupProps {
  className?: string;
  onBackupComplete?: () => void;
}

export function WalletBackup({ className, onBackupComplete }: WalletBackupProps) {
  const { wallet, publicKey, isConnected, exportSpendingKey } = useWallet();
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedPubKey, setCopiedPubKey] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  const spendingKeyHex = React.useMemo(() => {
    if (!showKey) return null;
    const key = exportSpendingKey();
    if (!key) return null;
    return Buffer.from(key).toString('hex');
  }, [showKey, exportSpendingKey]);

  const handleCopy = useCallback(async () => {
    if (!spendingKeyHex) return;
    try {
      await navigator.clipboard.writeText(spendingKeyHex);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Clipboard API not available
    }
  }, [spendingKeyHex]);

  const handleCopyPublicKey = useCallback(async () => {
    if (!publicKey) return;
    try {
      const pubKeyHex = Buffer.from(publicKey.x).toString('hex') + Buffer.from(publicKey.y).toString('hex');
      await navigator.clipboard.writeText(pubKeyHex);
      setCopiedPubKey(true);
      setTimeout(() => setCopiedPubKey(false), 3000);
    } catch {
      // Clipboard API not available
    }
  }, [publicKey]);

  const handleDownload = useCallback(() => {
    if (!spendingKeyHex || !publicKey) return;

    const publicKeyHex = Buffer.from(publicKey.x).toString('hex');
    const backupData = {
      version: 1,
      type: 'cloakcraft-spending-key',
      publicKey: publicKeyHex,
      spendingKey: spendingKeyHex,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloakcraft-backup-${publicKeyHex.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onBackupComplete?.();
  }, [spendingKeyHex, publicKey, onBackupComplete]);

  if (!isConnected || !wallet) {
    return (
      <div className={className} style={styles.card}>
        <h3 style={styles.cardTitle}>Wallet Backup</h3>
        <div style={styles.emptyState}>Connect your wallet to backup your keys</div>
      </div>
    );
  }

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Wallet Backup</h3>
      <p style={styles.cardDescription}>
        Export your spending key to backup your wallet. This key controls all your
        shielded funds - keep it safe!
      </p>

      {/* Wallet Info */}
      <div style={{ ...styles.stack, marginBottom: '16px' }}>
        <div
          style={{
            padding: '16px',
            background: colors.backgroundMuted,
            borderRadius: '12px',
            border: `1px solid ${colors.border}`,
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: 600 }}>
              Stealth Public Key
            </div>
            <button
              onClick={handleCopyPublicKey}
              style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
            >
              {copiedPubKey ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <div
            style={{
              ...styles.mono,
              fontSize: '0.75rem',
              wordBreak: 'break-all',
              lineHeight: 1.6,
              color: colors.text,
            }}
          >
            {publicKey ? Buffer.from(publicKey.x).toString('hex') + Buffer.from(publicKey.y).toString('hex') : 'Unknown'}
          </div>
          <div style={{ fontSize: '0.7rem', color: colors.textLight, marginTop: '8px', fontStyle: 'italic' }}>
            Share this key with others to receive private transfers
          </div>
        </div>
      </div>

      {/* Warning */}
      <div style={{ ...styles.warningBox, marginBottom: '16px' }}>
        <div style={{ fontWeight: 500, marginBottom: '4px' }}>Security Warning</div>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8125rem' }}>
          <li>Never share your spending key with anyone</li>
          <li>Anyone with this key can spend your shielded funds</li>
          <li>Store backups in a secure, offline location</li>
        </ul>
      </div>

      {/* Acknowledgment */}
      {!showKey && (
        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '16px',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ marginTop: '2px' }}
          />
          <span>
            I understand that my spending key gives full access to my shielded funds
            and I will store it securely
          </span>
        </label>
      )}

      {/* Actions */}
      {!showKey ? (
        <button
          onClick={() => setShowKey(true)}
          disabled={!acknowledged}
          style={{
            ...styles.buttonSecondary,
            width: '100%',
            ...(!acknowledged ? styles.buttonDisabled : {}),
          }}
        >
          Reveal Spending Key
        </button>
      ) : (
        <div style={styles.stack}>
          {/* Spending Key Display */}
          <div
            style={{
              padding: '12px',
              background: colors.backgroundDark,
              borderRadius: '8px',
              border: `1px solid ${colors.warning}`,
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: colors.warning }}>
                Spending Key (64 bytes hex)
              </span>
              <button
                onClick={handleCopy}
                style={{ ...styles.buttonSecondary, ...styles.buttonSmall }}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <div
              style={{
                ...styles.mono,
                fontSize: '0.6875rem',
                wordBreak: 'break-all',
                color: colors.text,
                lineHeight: 1.5,
              }}
            >
              {spendingKeyHex}
            </div>
          </div>

          {/* Download & Hide Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => {
                setShowKey(false);
                setAcknowledged(false);
              }}
              style={{ ...styles.buttonSecondary, flex: 1 }}
            >
              Hide Key
            </button>
            <button onClick={handleDownload} style={{ ...styles.buttonPrimary, flex: 1 }}>
              Download Backup
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Import wallet from backup file
 */
interface WalletImportProps {
  className?: string;
  onImportSuccess?: () => void;
  onError?: (error: string) => void;
}

export function WalletImport({ className, onImportSuccess, onError }: WalletImportProps) {
  const { importFromKey, isConnecting } = useWallet();
  const [keyInput, setKeyInput] = useState('');
  const [importMethod, setImportMethod] = useState<'paste' | 'file'>('paste');
  const [error, setError] = useState<string | null>(null);

  const handlePasteImport = async () => {
    setError(null);
    try {
      const trimmed = keyInput.trim();
      // Support both hex and JSON backup format
      let keyHex = trimmed;

      if (trimmed.startsWith('{')) {
        // JSON backup file
        const backup = JSON.parse(trimmed);
        if (backup.spendingKey) {
          keyHex = backup.spendingKey;
        } else {
          throw new Error('Invalid backup format: missing spendingKey');
        }
      }

      // Convert hex to bytes
      const keyBytes = new Uint8Array(
        keyHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) ?? []
      );

      if (keyBytes.length !== 32) {
        throw new Error('Invalid key length: expected 32 bytes');
      }

      await importFromKey(keyBytes);
      setKeyInput('');
      onImportSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import wallet';
      setError(message);
      onError?.(message);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      if (!backup.spendingKey) {
        throw new Error('Invalid backup file: missing spendingKey');
      }

      const keyBytes = new Uint8Array(
        backup.spendingKey.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) ?? []
      );

      if (keyBytes.length !== 32) {
        throw new Error('Invalid key length in backup file');
      }

      await importFromKey(keyBytes);
      onImportSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import backup file';
      setError(message);
      onError?.(message);
    }

    // Reset file input
    e.target.value = '';
  };

  return (
    <div className={className} style={styles.card}>
      <h3 style={styles.cardTitle}>Import Wallet</h3>
      <p style={styles.cardDescription}>
        Restore your wallet from a backup file or spending key
      </p>

      {/* Method Selection */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        <button
          onClick={() => setImportMethod('paste')}
          style={{
            ...styles.buttonSecondary,
            flex: 1,
            ...(importMethod === 'paste'
              ? { background: colors.primary, color: '#fff' }
              : {}),
          }}
        >
          Paste Key
        </button>
        <button
          onClick={() => setImportMethod('file')}
          style={{
            ...styles.buttonSecondary,
            flex: 1,
            ...(importMethod === 'file'
              ? { background: colors.primary, color: '#fff' }
              : {}),
          }}
        >
          Upload File
        </button>
      </div>

      {importMethod === 'paste' ? (
        <div style={styles.stack}>
          <textarea
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder="Paste your spending key (hex) or backup JSON..."
            rows={4}
            style={{
              ...styles.input,
              fontFamily: 'monospace',
              fontSize: '0.75rem',
              resize: 'vertical',
            }}
          />
          <button
            onClick={handlePasteImport}
            disabled={!keyInput.trim() || isConnecting}
            style={{
              ...styles.buttonPrimary,
              ...(!keyInput.trim() || isConnecting ? styles.buttonDisabled : {}),
            }}
          >
            {isConnecting ? 'Importing...' : 'Import Wallet'}
          </button>
        </div>
      ) : (
        <div>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px',
              border: `2px dashed ${colors.border}`,
              borderRadius: '8px',
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: '2rem', marginBottom: '8px' }}>+</div>
            <div style={{ fontWeight: 500 }}>Choose Backup File</div>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted }}>
              .json files only
            </div>
          </label>
        </div>
      )}

      {error && <div style={{ ...styles.errorText, marginTop: '12px' }}>{error}</div>}
    </div>
  );
}

/**
 * Combined backup/import component
 */
export function WalletManager({ className }: { className?: string }) {
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'backup' | 'import'>(
    isConnected ? 'backup' : 'import'
  );

  return (
    <div className={className}>
      {/* Tab Selection */}
      <div
        style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.border}`,
          marginBottom: '16px',
        }}
      >
        <button
          onClick={() => setActiveTab('backup')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'backup' ? `2px solid ${colors.primary}` : 'none',
            color: activeTab === 'backup' ? colors.primary : colors.textMuted,
            fontWeight: activeTab === 'backup' ? 500 : 400,
            cursor: 'pointer',
          }}
        >
          Backup
        </button>
        <button
          onClick={() => setActiveTab('import')}
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'import' ? `2px solid ${colors.primary}` : 'none',
            color: activeTab === 'import' ? colors.primary : colors.textMuted,
            fontWeight: activeTab === 'import' ? 500 : 400,
            cursor: 'pointer',
          }}
        >
          Import
        </button>
      </div>

      {activeTab === 'backup' ? <WalletBackup /> : <WalletImport />}
    </div>
  );
}
