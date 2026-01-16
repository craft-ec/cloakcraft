'use client';

import { useState, useCallback, useMemo } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWallet, useCloakCraft, WALLET_DERIVATION_MESSAGE } from '@cloakcraft/hooks';
import { Settings, Copy, Key, Eye, EyeOff, AlertTriangle, Download, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { copyToClipboard, truncateAddress } from '@/lib/utils';

export default function SettingsPage() {
  const { publicKey: solanaPublicKey, signMessage, disconnect: disconnectSolana } = useSolanaWallet();
  const {
    isConnected: isStealthConnected,
    wallet,
    publicKey: stealthPublicKey,
    exportSpendingKey,
    disconnect: disconnectStealth,
    deriveFromSignature,
    importFromKey,
  } = useWallet();
  const { isProverReady, sync, isSyncing } = useCloakCraft();

  const [showSpendingKey, setShowSpendingKey] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importKey, setImportKey] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Format stealth public key for sharing (hex encoded x + y coordinates)
  const stealthPubkeyHex = useMemo(() => {
    if (!stealthPublicKey) return '';
    const xHex = Buffer.from(stealthPublicKey.x).toString('hex');
    const yHex = Buffer.from(stealthPublicKey.y).toString('hex');
    return xHex + yHex;
  }, [stealthPublicKey]);

  // Format spending key for export
  const spendingKeyHex = useMemo(() => {
    const key = exportSpendingKey();
    if (!key) return '';
    return Buffer.from(key).toString('hex');
  }, [exportSpendingKey]);

  const handleCopyStealthPubkey = useCallback(async () => {
    const success = await copyToClipboard(stealthPubkeyHex);
    if (success) {
      toast.success('Stealth public key copied');
    } else {
      toast.error('Failed to copy');
    }
  }, [stealthPubkeyHex]);

  const handleCopySpendingKey = useCallback(async () => {
    const success = await copyToClipboard(spendingKeyHex);
    if (success) {
      toast.success('Spending key copied - keep it secret!');
    } else {
      toast.error('Failed to copy');
    }
  }, [spendingKeyHex]);

  const handleExportKey = useCallback(() => {
    const key = exportSpendingKey();
    if (!key) return;

    const hex = Buffer.from(key).toString('hex');
    const blob = new Blob([hex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cloakcraft-spending-key.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Spending key exported');
  }, [exportSpendingKey]);

  const handleImportKey = useCallback(async () => {
    if (!importKey.trim()) {
      toast.error('Please enter a spending key');
      return;
    }

    setIsImporting(true);
    try {
      const clean = importKey.trim().startsWith('0x') ? importKey.trim().slice(2) : importKey.trim();
      const keyBytes = new Uint8Array(Buffer.from(clean, 'hex'));

      if (keyBytes.length !== 32) {
        throw new Error('Invalid key length. Expected 32 bytes (64 hex characters).');
      }

      await importFromKey(keyBytes);
      toast.success('Wallet imported successfully');
      setImportDialogOpen(false);
      setImportKey('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import wallet');
    } finally {
      setIsImporting(false);
    }
  }, [importKey, importFromKey]);

  const handleReconnect = useCallback(async () => {
    if (!signMessage || !solanaPublicKey) {
      toast.error('Please connect your Solana wallet first');
      return;
    }

    try {
      const message = new TextEncoder().encode(WALLET_DERIVATION_MESSAGE);
      const signature = await signMessage(message);
      await deriveFromSignature(signature);
      toast.success('Stealth wallet reconnected');
    } catch (error) {
      toast.error('Failed to reconnect stealth wallet');
    }
  }, [signMessage, solanaPublicKey, deriveFromSignature]);

  const handleDisconnectAll = useCallback(() => {
    disconnectStealth();
    disconnectSolana();
    toast.success('Disconnected from all wallets');
  }, [disconnectStealth, disconnectSolana]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">Manage your wallet and keys.</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Solana Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Solana Wallet</CardTitle>
            <CardDescription>Your connected Solana wallet.</CardDescription>
          </CardHeader>
          <CardContent>
            {solanaPublicKey ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-mono text-sm">{truncateAddress(solanaPublicKey, 8)}</p>
                  <Badge variant="success" className="mt-1">
                    Connected
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(solanaPublicKey.toBase58()).then(() => toast.success('Address copied'))}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Not connected</p>
            )}
          </CardContent>
        </Card>

        {/* Stealth Wallet */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Stealth Wallet</CardTitle>
            <CardDescription>Your privacy-preserving stealth wallet.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isStealthConnected ? (
              <>
                {/* Status */}
                <div className="flex items-center gap-2">
                  <Badge variant="success">Connected</Badge>
                  {isProverReady ? (
                    <Badge variant="outline">ZK Ready</Badge>
                  ) : (
                    <Badge variant="secondary">Loading ZK...</Badge>
                  )}
                </div>

                {/* Stealth Public Key */}
                <div className="space-y-2">
                  <Label>Stealth Public Key (Share this)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={stealthPubkeyHex}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button variant="outline" size="icon" onClick={handleCopyStealthPubkey}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this key with others to receive private transfers.
                  </p>
                </div>

                {/* Spending Key */}
                <div className="space-y-2">
                  <Label>Spending Key (Keep Secret)</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSpendingKey ? 'text' : 'password'}
                      value={showSpendingKey ? spendingKeyHex : '••••••••••••••••••••••••••••••••'}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSpendingKey(!showSpendingKey)}
                    >
                      {showSpendingKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleCopySpendingKey}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3 mt-0.5" />
                    <span>
                      Never share your spending key. Anyone with this key can spend your private
                      tokens.
                    </span>
                  </div>
                </div>

                {/* Scan Button */}
                <Button variant="outline" onClick={() => sync(undefined, true)} disabled={isSyncing}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Scanning...' : 'Scan for Notes'}
                </Button>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-4">
                  No stealth wallet connected.
                </p>
                {solanaPublicKey && (
                  <Button onClick={handleReconnect}>
                    <Key className="mr-2 h-4 w-4" />
                    Create Stealth Wallet
                  </Button>
                )}
              </div>
            )}
          </CardContent>
          {isStealthConnected && (
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportKey}>
                <Download className="mr-2 h-4 w-4" />
                Export Key
              </Button>
              <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="mr-2 h-4 w-4" />
                    Import Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Import Spending Key</DialogTitle>
                    <DialogDescription>
                      Enter your spending key to restore access to your private tokens.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Spending Key (64 hex characters)</Label>
                      <Input
                        type="password"
                        placeholder="Enter your spending key..."
                        value={importKey}
                        onChange={(e) => setImportKey(e.target.value)}
                        className="font-mono"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleImportKey} disabled={isImporting}>
                      {isImporting ? 'Importing...' : 'Import'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          )}
        </Card>

        {/* Disconnect */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Disconnect</CardTitle>
            <CardDescription>Disconnect your wallets from this application.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {isStealthConnected && (
                <Button variant="outline" onClick={disconnectStealth}>
                  Disconnect Stealth
                </Button>
              )}
              <Button variant="destructive" onClick={handleDisconnectAll}>
                Disconnect All
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
