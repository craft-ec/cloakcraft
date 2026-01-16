'use client';

import { useState, useCallback } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWallet, useCloakCraft, WALLET_DERIVATION_MESSAGE } from '@cloakcraft/hooks';
import { Eye, EyeOff, Plus, Loader2, Key } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function StealthWalletButton() {
  const { publicKey: solanaPublicKey, signMessage } = useSolanaWallet();
  const { isConnected, publicKey, deriveFromSignature, isConnecting, isInitializing } = useWallet();
  const { isProverReady } = useCloakCraft();
  const [showDialog, setShowDialog] = useState(false);
  const [isDeriving, setIsDeriving] = useState(false);

  const handleDerive = useCallback(async () => {
    if (!signMessage || !solanaPublicKey) {
      toast.error('Please connect your Solana wallet first');
      return;
    }

    setIsDeriving(true);
    try {
      const message = new TextEncoder().encode(WALLET_DERIVATION_MESSAGE);
      const signature = await signMessage(message);
      await deriveFromSignature(signature);
      toast.success('Stealth wallet created');
      setShowDialog(false);
    } catch (error) {
      console.error('Failed to derive wallet:', error);
      toast.error('Failed to create stealth wallet');
    } finally {
      setIsDeriving(false);
    }
  }, [signMessage, solanaPublicKey, deriveFromSignature]);

  // Not connected to Solana wallet
  if (!solanaPublicKey) {
    return null;
  }

  // Stealth wallet not connected
  if (!isConnected) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDialog(true)}
          disabled={isInitializing}
        >
          {isInitializing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Stealth Wallet
            </>
          )}
        </Button>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Stealth Wallet</DialogTitle>
              <DialogDescription>
                Sign a message with your Solana wallet to derive a stealth wallet.
                This wallet is used for private transactions.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">How it works:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Your Solana wallet signs a specific message</li>
                  <li>The signature is used to derive your stealth keys</li>
                  <li>Same wallet always generates the same stealth wallet</li>
                  <li>Your stealth keys are stored locally in your browser</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleDerive} disabled={isDeriving || isConnecting}>
                {isDeriving || isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing...
                  </>
                ) : (
                  <>
                    <Key className="mr-2 h-4 w-4" />
                    Sign & Create
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Stealth wallet connected
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="gap-1">
        <Eye className="h-3 w-3" />
        Stealth
      </Badge>
      {!isProverReady && (
        <Badge variant="secondary" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading ZK
        </Badge>
      )}
    </div>
  );
}
