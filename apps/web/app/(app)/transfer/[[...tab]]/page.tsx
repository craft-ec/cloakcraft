'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  useShield,
  useTransfer,
  useUnshield,
  useNoteSelector,
  useWallet,
  useCloakCraft,
  useTokenBalances,
  usePool,
  useInitializePool,
  useShouldConsolidate,
  useProtocolFees,
  useConsolidation,
  type UnshieldProgressStage,
} from '@cloakcraft/hooks';
import { generateStealthAddress } from '@cloakcraft/sdk';
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  AlertCircle,
  Info,
  Loader2,
  CheckCircle,
  XCircle,
  Coins,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TransactionStatus } from '@/components/operations/transaction-status';
import {
  TransactionOverlay,
  TransactionStep,
  ConsolidationPrompt,
  FeeBreakdown,
  useFeeBreakdown,
  FreeOperationBadge,
} from '@/components/operations';
import { SUPPORTED_TOKENS, TokenInfo } from '@/lib/constants';
import { formatAmount, parseAmount, isValidPublicKey } from '@/lib/utils';

const VALID_TABS = ['shield', 'transfer', 'unshield'] as const;
type TabValue = typeof VALID_TABS[number];

export default function TransferPage() {
  const params = useParams();
  const router = useRouter();

  // Get tab from URL path (e.g., /transfer/shield -> 'shield')
  const tabFromPath = params.tab?.[0] as string | undefined;
  const currentTab: TabValue = VALID_TABS.includes(tabFromPath as TabValue)
    ? (tabFromPath as TabValue)
    : 'shield';

  const handleTabChange = useCallback((value: string) => {
    router.push(`/transfer/${value}`);
  }, [router]);

  const { publicKey } = useSolanaWallet();
  const { isConnected: isStealthConnected, isProgramReady, isProverReady, wallet, client, notes } = useCloakCraft();

  // Show setup required message if stealth wallet not connected
  if (!isStealthConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Transfer</h1>
          <p className="text-muted-foreground">Shield, transfer, or unshield your tokens.</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Stealth wallet required</p>
                <p className="text-sm">
                  Create a stealth wallet to use transfer features. Click the "Stealth Wallet" button
                  in the header.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Transfer</h1>
        <p className="text-muted-foreground">Shield, transfer, or unshield your tokens.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="max-w-lg mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shield" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <ArrowDownToLine className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Shield</span>
          </TabsTrigger>
          <TabsTrigger value="transfer" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <ArrowRight className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Transfer</span>
          </TabsTrigger>
          <TabsTrigger value="unshield" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <ArrowUpFromLine className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Unshield</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="shield">
          <ShieldTab publicKey={publicKey} isProgramReady={isProgramReady} />
        </TabsContent>

        <TabsContent value="transfer">
          <PrivateTransferTab
            publicKey={publicKey}
            isProgramReady={isProgramReady}
            isProverReady={isProverReady}
            wallet={wallet}
            client={client}
            notes={notes}
          />
        </TabsContent>

        <TabsContent value="unshield">
          <UnshieldTab
            publicKey={publicKey}
            isProgramReady={isProgramReady}
            isProverReady={isProverReady}
            notes={notes}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Shield Tab Component
function ShieldTab({
  publicKey,
  isProgramReady,
}: {
  publicKey: PublicKey | null;
  isProgramReady: boolean;
}) {
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const tokenMints = useMemo(() => SUPPORTED_TOKENS.map((t) => t.mint), []);
  const { getBalance, isLoading: balancesLoading, refresh: refreshBalances } = useTokenBalances(
    tokenMints,
    publicKey ?? undefined
  );

  const tokensWithBalance = useMemo(() => {
    if (balancesLoading) return [];
    return SUPPORTED_TOKENS.filter((token) => {
      const balance = getBalance(token.mint);
      return balance > 0n;
    });
  }, [getBalance, balancesLoading]);

  useEffect(() => {
    if (!balancesLoading && tokensWithBalance.length > 0 && !selectedToken) {
      setSelectedToken(tokensWithBalance[0]);
    }
  }, [balancesLoading, tokensWithBalance, selectedToken]);

  const publicBalance = useMemo(() => {
    if (!selectedToken) return 0n;
    return getBalance(selectedToken.mint);
  }, [selectedToken, getBalance]);

  const tokenAccount = useMemo(() => {
    if (!selectedToken || !publicKey) return null;
    try {
      return getAssociatedTokenAddressSync(selectedToken.mint, publicKey);
    } catch {
      return null;
    }
  }, [selectedToken, publicKey]);

  const { pool, isLoading: poolLoading, exists: poolExists, refresh: refreshPool } = usePool(
    selectedToken?.mint
  );

  const {
    initializePoolWithWallet,
    isInitializing,
    error: initError,
    reset: resetInit,
  } = useInitializePool();

  const { shield, isShielding, error: shieldError } = useShield();

  const parsedAmount = useMemo(() => {
    if (!amount || !selectedToken) return 0n;
    try {
      return parseAmount(amount, selectedToken.decimals);
    } catch {
      return 0n;
    }
  }, [amount, selectedToken]);

  const validationError = useMemo(() => {
    if (!selectedToken) return 'Select a token';
    if (!poolExists && !poolLoading) return 'Pool not initialized';
    if (!amount || parsedAmount === 0n) return 'Enter an amount';
    if (parsedAmount > publicBalance) return 'Insufficient balance';
    return null;
  }, [selectedToken, amount, parsedAmount, publicBalance, poolExists, poolLoading]);

  const canSubmit =
    !validationError &&
    isProgramReady &&
    poolExists &&
    !isShielding &&
    txStatus !== 'pending';

  const handleInitializePool = useCallback(async () => {
    if (!selectedToken || !publicKey) return;
    resetInit();
    const result = await initializePoolWithWallet(selectedToken.mint, publicKey);
    if (result) {
      toast.success('Pool initialized successfully');
      refreshPool();
    } else if (initError) {
      toast.error(initError);
    }
  }, [selectedToken, publicKey, initializePoolWithWallet, resetInit, refreshPool, initError]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedToken || !publicKey || !tokenAccount) return;

    setTxStatus('pending');
    setTxError(undefined);
    setTxSignature(undefined);

    try {
      const result = await shield({
        tokenMint: selectedToken.mint,
        amount: parsedAmount,
        userTokenAccount: tokenAccount,
        walletPublicKey: publicKey,
      });

      if (result) {
        setTxSignature(result.signature);
        setTxStatus('success');
        setAmount('');
        toast.success('Tokens shielded successfully');
        refreshBalances();
      } else {
        setTxStatus('error');
        setTxError(shieldError || 'Shield operation failed');
      }
    } catch (error) {
      setTxStatus('error');
      const errorMsg = error instanceof Error ? error.message : String(error);
      setTxError(errorMsg);
    }
  }, [canSubmit, selectedToken, publicKey, tokenAccount, parsedAmount, shield, shieldError, refreshBalances]);

  const handleReset = useCallback(() => {
    setTxStatus('idle');
    setTxSignature(undefined);
    setTxError(undefined);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDownToLine className="h-5 w-5" />
          Shield
        </CardTitle>
        <CardDescription>
          Deposit tokens into the privacy pool. They will be converted to private notes.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {balancesLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading token balances...
          </div>
        ) : tokensWithBalance.length === 0 ? (
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No tokens available to shield. Make sure you have tokens in your wallet.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Token</Label>
              <Select
                value={selectedToken?.mint.toBase58() || ''}
                onValueChange={(value) => {
                  const token = tokensWithBalance.find((t) => t.mint.toBase58() === value);
                  if (token) {
                    setSelectedToken(token);
                    setAmount('');
                  }
                }}
                disabled={isShielding || txStatus === 'pending'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {tokensWithBalance.map((token) => (
                    <SelectItem key={token.mint.toBase58()} value={token.mint.toBase58()}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{token.symbol}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatAmount(getBalance(token.mint), token.decimals)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
                      setAmount(value);
                    }
                  }}
                  disabled={isShielding || txStatus === 'pending' || !poolExists}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                  onClick={() => {
                    if (selectedToken) {
                      setAmount(formatAmount(publicBalance, selectedToken.decimals));
                    }
                  }}
                  disabled={isShielding || txStatus === 'pending' || !poolExists}
                >
                  MAX
                </Button>
              </div>
              {selectedToken && (
                <p className="text-xs text-muted-foreground">
                  Available: {formatAmount(publicBalance, selectedToken.decimals)} {selectedToken.symbol}
                </p>
              )}
            </div>

            {selectedToken && !poolLoading && !poolExists && (
              <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm font-medium text-yellow-600">Pool not initialized</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  The privacy pool for {selectedToken.symbol} needs to be initialized first.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleInitializePool}
                  disabled={isInitializing || !isProgramReady}
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    'Initialize Pool'
                  )}
                </Button>
              </div>
            )}

            {parsedAmount > 0n && selectedToken && poolExists && !validationError && (
              <div className="rounded-lg bg-muted p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">You will receive</p>
                  <FreeOperationBadge />
                </div>
                <p className="text-lg font-mono">
                  {formatAmount(parsedAmount, selectedToken.decimals)} {selectedToken.symbol}
                </p>
                <p className="text-xs text-muted-foreground">as private balance</p>
              </div>
            )}
          </>
        )}

        {!isProgramReady && (
          <div className="rounded-lg bg-yellow-500/10 p-4 text-sm">
            <p className="text-yellow-600">Waiting for program initialization...</p>
          </div>
        )}

        <TransactionStatus
          status={txStatus}
          signature={txSignature}
          error={txError}
          onReset={handleReset}
        />
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!canSubmit || tokensWithBalance.length === 0}
        >
          {isShielding || txStatus === 'pending' ? 'Shielding...' : 'Shield Tokens'}
        </Button>
      </CardFooter>
    </Card>
  );
}

// Private Transfer Tab Component
function PrivateTransferTab({
  publicKey,
  isProgramReady,
  isProverReady,
  wallet,
  client,
  notes,
}: {
  publicKey: PublicKey | null;
  isProgramReady: boolean;
  isProverReady: boolean;
  wallet: any;
  client: any;
  notes: any[];
}) {
  const { sync } = useCloakCraft();
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [recipientPubkey, setRecipientPubkey] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<TransactionStep[]>([]);
  const [overlayStatus, setOverlayStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();

  const { transfer, isTransferring, error: transferError } = useTransfer();
  const { config: protocolFees } = useProtocolFees();
  const { consolidate, isConsolidating } = useConsolidation({ tokenMint: selectedToken?.mint || SUPPORTED_TOKENS[0]?.mint });

  const { totalAvailable, selectNotesForAmount, getSelectionResult } = useNoteSelector(
    selectedToken?.mint || SUPPORTED_TOKENS[0]?.mint
  );

  const shouldConsolidate = useShouldConsolidate(selectedToken?.mint || SUPPORTED_TOKENS[0]?.mint);

  const tokensWithBalance = useMemo(() => {
    const balanceMap = new Map<string, bigint>();
    for (const note of notes) {
      if (note.tokenMint) {
        const mintStr = note.tokenMint.toBase58();
        const current = balanceMap.get(mintStr) ?? 0n;
        balanceMap.set(mintStr, current + note.amount);
      }
    }
    return SUPPORTED_TOKENS.filter((token) => {
      const balance = balanceMap.get(token.mint.toBase58()) ?? 0n;
      return balance > 0n;
    });
  }, [notes]);

  useEffect(() => {
    if (tokensWithBalance.length > 0 && !selectedToken) {
      setSelectedToken(tokensWithBalance[0]);
    }
  }, [tokensWithBalance, selectedToken]);

  const parsedAmount = useMemo(() => {
    if (!amount || !selectedToken) return 0n;
    try {
      return parseAmount(amount, selectedToken.decimals);
    } catch {
      return 0n;
    }
  }, [amount, selectedToken]);

  // Fee calculation for display - transfer fee is typically 0.1%
  const feeBreakdown = useFeeBreakdown({
    amount: parsedAmount,
    feeRateBps: protocolFees?.transferFeeBps ?? 10,
    feesEnabled: protocolFees?.feesEnabled ?? true,
    symbol: selectedToken?.symbol ?? '',
    decimals: selectedToken?.decimals ?? 9,
  });

  const parseRecipientPublicKey = useCallback(
    (hex: string): { x: Uint8Array; y: Uint8Array } | null => {
      try {
        const clean = hex.trim().startsWith('0x') ? hex.trim().slice(2) : hex.trim();
        if (clean.length !== 128) return null;
        const bytes = Buffer.from(clean, 'hex');
        return {
          x: new Uint8Array(bytes.slice(0, 32)),
          y: new Uint8Array(bytes.slice(32, 64)),
        };
      } catch {
        return null;
      }
    },
    []
  );

  const recipientPoint = useMemo(() => {
    if (!recipientPubkey) return null;
    return parseRecipientPublicKey(recipientPubkey);
  }, [recipientPubkey, parseRecipientPublicKey]);

  const validationError = useMemo(() => {
    if (!selectedToken) return 'Select a token';
    if (!amount || parsedAmount === 0n) return 'Enter an amount';
    if (parsedAmount > totalAvailable) return 'Insufficient private balance';
    if (!recipientPubkey) return 'Enter recipient address';
    if (!recipientPoint) return 'Invalid recipient stealth key';
    return null;
  }, [selectedToken, amount, parsedAmount, totalAvailable, recipientPubkey, recipientPoint]);

  const canSubmit =
    !validationError &&
    isProgramReady &&
    isProverReady &&
    !isTransferring &&
    overlayStatus !== 'pending' &&
    tokensWithBalance.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedToken || !recipientPoint || !wallet || !client?.getProgram()) return;

    // Check if consolidation is needed first
    // Use maxInputs: 1 because transfer_1x2 circuit only supports 1 input
    let selectionResult = getSelectionResult(parsedAmount, { maxInputs: 1 });

    // Build initial steps based on whether consolidation is needed
    const steps: TransactionStep[] = [];

    if (selectionResult.needsConsolidation) {
      steps.push(
        { id: 'consolidate-prepare-1', name: 'Preparing consolidation', description: 'Analyzing fragmented notes...', status: 'active' },
        { id: 'consolidate-approve-1', name: 'Consolidating notes', description: 'Approve in wallet...', status: 'pending' },
        { id: 'consolidate-confirm-1', name: 'Confirming consolidation', description: 'Waiting for confirmation...', status: 'pending' },
      );
    }

    steps.push(
      { id: 'prepare', name: 'Preparing transfer', description: 'Selecting notes...', status: selectionResult.needsConsolidation ? 'pending' : 'active' },
      { id: 'proof', name: 'Generating proof', description: 'Creating zero-knowledge proof...', status: 'pending' },
      { id: 'submit', name: 'Sending transfer', description: 'Approve in wallet...', status: 'pending' },
      { id: 'confirm', name: 'Confirming', description: 'Waiting for confirmation...', status: 'pending' },
    );

    setOverlaySteps(steps);
    setOverlayStatus('pending');
    setShowOverlay(true);
    setTxSignature(undefined);

    try {
      let selectedNotes = selectionResult.notes;

      // If consolidation is needed, call consolidate() once (it handles all batches internally)
      // Pass targetAmount so it stops early when we have enough notes for the transaction
      if (selectionResult.needsConsolidation) {
        await consolidate((stage, batchInfo) => {
          // Update overlay steps based on consolidation progress stage
          const batchLabel = batchInfo && batchInfo.total > 1 ? ` (batch ${batchInfo.current}/${batchInfo.total})` : '';

          if (stage === 'preparing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-prepare-1' ? { ...s, status: 'active', description: `Preparing notes${batchLabel}...` } : s
            ));
          } else if (stage === 'generating') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-prepare-1' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-approve-1' ? { ...s, status: 'active', description: `Generating proof${batchLabel}...` } : s
            ));
          } else if (stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-approve-1' ? { ...s, status: 'active', description: `Building transactions${batchLabel}...` } : s
            ));
          } else if (stage === 'approving') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-approve-1' ? { ...s, status: 'active', description: `Approve in wallet${batchLabel}...` } : s
            ));
          } else if (stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-approve-1' ? { ...s, status: 'active', description: `Executing transactions${batchLabel}...` } : s
            ));
          } else if (stage === 'confirming') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-approve-1' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-confirm-1' ? { ...s, status: 'active', description: `Confirming${batchLabel}...` } : s
            ));
          } else if (stage === 'syncing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-confirm-1' ? { ...s, status: 'active', description: `Syncing notes${batchLabel}...` } : s
            ));
          }
        }, parsedAmount, 1);  // maxInputs=1 because transfer_1x2 needs a single note

        // Mark consolidation done
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'consolidate-confirm-1' ? { ...s, status: 'completed' } :
          s.id === 'prepare' ? { ...s, status: 'active' } : s
        ));

        // Get fresh notes directly from client (bypasses React state)
        // This is the same approach used by useConsolidation internally
        console.log('[Transfer] Fetching fresh notes from client after consolidation...');
        client.clearScanCache();
        const freshNotes = await client.scanNotes(selectedToken.mint);
        const tokenNotes = freshNotes.filter((n: any) => n.tokenMint.equals(selectedToken.mint));
        console.log(`[Transfer] Fresh notes for token: ${tokenNotes.length}`);

        if (tokenNotes.length === 0) {
          throw new Error('No notes found after consolidation');
        }

        // For transfer_1x2, we need a SINGLE note that covers the amount
        // Sort by amount descending and find the first note >= parsedAmount
        const sortedNotes = [...tokenNotes].sort((a: any, b: any) => Number(b.amount - a.amount));
        const singleNote = sortedNotes.find((n: any) => n.amount >= parsedAmount);
        if (!singleNote) {
          throw new Error('No single note large enough after consolidation. Try consolidating more notes.');
        }
        selectedNotes = [singleNote];

        // Also trigger a background sync to update React state
        sync(selectedToken.mint, true);
      } else {
        // No consolidation needed, use the original selection
        if (selectionResult.error) {
          throw new Error(selectionResult.error);
        }
        selectedNotes = selectionResult.notes;
      }

      const { stealthAddress } = generateStealthAddress(recipientPoint);
      const totalInput = selectedNotes.reduce((sum: bigint, n: any) => sum + n.amount, 0n);
      const change = totalInput - parsedAmount;

      const outputs: Array<{ recipient: typeof stealthAddress; amount: bigint }> = [
        { recipient: stealthAddress, amount: parsedAmount },
      ];

      if (change > 0n) {
        const { stealthAddress: changeAddress } = generateStealthAddress(wallet.publicKey);
        outputs.push({ recipient: changeAddress, amount: change });
      }

      const result = await transfer({
        inputs: selectedNotes,
        outputs,
        onProgress: (stage) => {
          // Update overlay steps based on progress stage
          if (stage === 'preparing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'active', description: 'Preparing inputs and outputs...' } : s
            ));
          } else if (stage === 'generating') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'completed' } :
              s.id === 'proof' ? { ...s, status: 'active' } : s
            ));
          } else if (stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'proof' ? { ...s, status: 'completed' } :
              s.id === 'submit' ? { ...s, status: 'active', description: 'Building transactions...' } : s
            ));
          } else if (stage === 'approving') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'active', description: 'Approve in wallet...' } : s
            ));
          } else if (stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'active', description: 'Executing transactions...' } : s
            ));
          } else if (stage === 'confirming') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'completed' } :
              s.id === 'confirm' ? { ...s, status: 'active' } : s
            ));
          }
        },
      });

      if (result) {
        // Mark all as completed
        setOverlaySteps(prev => prev.map(s => ({
          ...s,
          status: 'completed' as const,
          signature: s.id === 'submit' ? result.signature : undefined
        })));
        setTxSignature(result.signature);
        setOverlayStatus('success');
        setAmount('');
        setRecipientPubkey('');
        toast.success('Transfer sent successfully');
      } else {
        throw new Error(transferError || 'Transfer failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setOverlaySteps(prev => {
        const activeIndex = prev.findIndex(s => s.status === 'active');
        return prev.map((s, i) => i === activeIndex ? { ...s, status: 'error', error: errorMsg } : s);
      });
      setOverlayStatus('error');
    }
  }, [
    canSubmit,
    selectedToken,
    recipientPoint,
    wallet,
    client,
    parsedAmount,
    getSelectionResult,
    consolidate,
    transfer,
    publicKey,
    transferError,
    sync,
  ]);

  const handleCloseOverlay = useCallback(() => {
    setShowOverlay(false);
    if (overlayStatus === 'success' || overlayStatus === 'error') {
      setOverlayStatus('idle');
    }
  }, [overlayStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Private Transfer
        </CardTitle>
        <CardDescription>
          Send tokens privately to another stealth address.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Token</Label>
          {tokensWithBalance.length === 0 ? (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No private balances found. Shield tokens first.
              </p>
            </div>
          ) : (
            <>
              <Select
                value={selectedToken?.mint.toBase58() || ''}
                onValueChange={(value) => {
                  const token = tokensWithBalance.find((t) => t.mint.toBase58() === value);
                  if (token) {
                    setSelectedToken(token);
                    setAmount('');
                  }
                }}
                disabled={isTransferring || overlayStatus === 'pending'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {tokensWithBalance.map((token) => (
                    <SelectItem key={token.mint.toBase58()} value={token.mint.toBase58()}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedToken && (
                <p className="text-xs text-muted-foreground">
                  Private balance: {formatAmount(totalAvailable, selectedToken.decimals)}{' '}
                  {selectedToken.symbol}
                </p>
              )}
            </>
          )}
        </div>

        {/* Consolidation recommendation */}
        {selectedToken && shouldConsolidate && (
          <ConsolidationPrompt
            tokenMint={selectedToken.mint}
            tokenSymbol={selectedToken.symbol}
            variant="alert"
          />
        )}

        {tokensWithBalance.length > 0 && (
          <>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
                      setAmount(value);
                    }
                  }}
                  disabled={isTransferring || overlayStatus === 'pending'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                  onClick={() => {
                    if (selectedToken) {
                      setAmount(formatAmount(totalAvailable, selectedToken.decimals));
                    }
                  }}
                  disabled={isTransferring || overlayStatus === 'pending'}
                >
                  MAX
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recipient Stealth Public Key</Label>
              <textarea
                value={recipientPubkey}
                onChange={(e) => setRecipientPubkey(e.target.value)}
                placeholder="Paste the recipient's stealth public key (128 hex characters)"
                disabled={isTransferring || overlayStatus === 'pending'}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5" />
                <span>
                  Ask the recipient for their stealth public key from their Settings page.
                </span>
              </div>
            </div>

            {/* Fee breakdown */}
            {feeBreakdown && parsedAmount > 0n && !validationError && (
              <FeeBreakdown
                data={feeBreakdown}
                totalLabel="Recipient receives"
              />
            )}

            {validationError && amount && recipientPubkey && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </>
        )}

        {!isProverReady && (
          <div className="rounded-lg bg-yellow-500/10 p-4 text-sm">
            <p className="text-yellow-600">Loading ZK prover for transfers...</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
          {isTransferring || overlayStatus === 'pending' ? 'Transferring...' : 'Send Private Transfer'}
        </Button>
      </CardFooter>

      {/* Transaction Overlay */}
      <TransactionOverlay
        isOpen={showOverlay}
        onClose={handleCloseOverlay}
        title="Private Transfer"
        steps={overlaySteps}
        status={overlayStatus}
        finalSignature={txSignature}
        onRetry={handleSubmit}
      />
    </Card>
  );
}

// Unshield Tab Component
function UnshieldTab({
  publicKey: solanaPublicKey,
  isProgramReady,
  isProverReady,
  notes,
}: {
  publicKey: PublicKey | null;
  isProgramReady: boolean;
  isProverReady: boolean;
  notes: any[];
}) {
  const { sync, client } = useCloakCraft();
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [useSelfRecipient, setUseSelfRecipient] = useState(true);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<TransactionStep[]>([]);
  const [overlayStatus, setOverlayStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();

  const { unshield, isUnshielding, error: unshieldError } = useUnshield();
  const { config: protocolFees } = useProtocolFees();
  const { consolidate, isConsolidating } = useConsolidation({ tokenMint: selectedToken?.mint || SUPPORTED_TOKENS[0]?.mint });

  const tokensWithPrivateBalance = useMemo(() => {
    const balanceMap = new Map<string, bigint>();
    for (const note of notes) {
      if (note.tokenMint) {
        const mintStr = note.tokenMint.toBase58();
        const current = balanceMap.get(mintStr) ?? 0n;
        balanceMap.set(mintStr, current + note.amount);
      }
    }
    return SUPPORTED_TOKENS.filter((token) => {
      const balance = balanceMap.get(token.mint.toBase58()) ?? 0n;
      return balance > 0n;
    });
  }, [notes]);

  const { totalAvailable, selectNotesForAmount, getSelectionResult } = useNoteSelector(
    selectedToken?.mint || SUPPORTED_TOKENS[0]?.mint
  );

  const shouldConsolidate = useShouldConsolidate(selectedToken?.mint || SUPPORTED_TOKENS[0]?.mint);

  useEffect(() => {
    if (tokensWithPrivateBalance.length > 0 && !selectedToken) {
      setSelectedToken(tokensWithPrivateBalance[0]);
    }
  }, [tokensWithPrivateBalance, selectedToken]);

  useEffect(() => {
    if (useSelfRecipient && solanaPublicKey) {
      setRecipientAddress(solanaPublicKey.toBase58());
    }
  }, [useSelfRecipient, solanaPublicKey]);

  const parsedAmount = useMemo(() => {
    if (!amount || !selectedToken) return 0n;
    try {
      return parseAmount(amount, selectedToken.decimals);
    } catch {
      return 0n;
    }
  }, [amount, selectedToken]);

  // Fee calculation for display - unshield fee is typically 0.25%
  const feeBreakdown = useFeeBreakdown({
    amount: parsedAmount,
    feeRateBps: protocolFees?.unshieldFeeBps ?? 25,
    feesEnabled: protocolFees?.feesEnabled ?? true,
    symbol: selectedToken?.symbol ?? '',
    decimals: selectedToken?.decimals ?? 9,
  });

  const validationError = useMemo(() => {
    if (!selectedToken) return 'Select a token';
    if (!amount || parsedAmount === 0n) return 'Enter an amount';
    if (parsedAmount > totalAvailable) return 'Insufficient private balance';
    if (!recipientAddress) return 'Enter recipient address';
    if (!isValidPublicKey(recipientAddress)) return 'Invalid Solana address';
    return null;
  }, [selectedToken, amount, parsedAmount, totalAvailable, recipientAddress]);

  const canSubmit =
    !validationError &&
    isProgramReady &&
    isProverReady &&
    !isUnshielding &&
    overlayStatus !== 'pending' &&
    tokensWithPrivateBalance.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedToken) return;

    // Check if consolidation is needed first
    // Use maxInputs: 1 because transfer_1x2 circuit only supports 1 input
    let selectionResult = getSelectionResult(parsedAmount, { maxInputs: 1 });

    // Build initial steps based on whether consolidation is needed
    const steps: TransactionStep[] = [];

    if (selectionResult.needsConsolidation) {
      steps.push(
        { id: 'consolidate-prepare-1', name: 'Preparing consolidation', description: 'Analyzing fragmented notes...', status: 'active' },
        { id: 'consolidate-approve-1', name: 'Consolidating notes', description: 'Approve in wallet...', status: 'pending' },
        { id: 'consolidate-confirm-1', name: 'Confirming consolidation', description: 'Waiting for confirmation...', status: 'pending' },
      );
    }

    steps.push(
      { id: 'prepare', name: 'Preparing unshield', description: 'Selecting notes...', status: selectionResult.needsConsolidation ? 'pending' : 'active' },
      { id: 'proof', name: 'Generating proof', description: 'Creating zero-knowledge proof...', status: 'pending' },
      { id: 'submit', name: 'Withdrawing tokens', description: 'Approve in wallet...', status: 'pending' },
      { id: 'confirm', name: 'Confirming', description: 'Waiting for confirmation...', status: 'pending' },
    );

    setOverlaySteps(steps);
    setOverlayStatus('pending');
    setShowOverlay(true);
    setTxSignature(undefined);

    try {
      let selectedNotes = selectionResult.notes;

      // If consolidation is needed, call consolidate() once (it handles all batches internally)
      // Pass targetAmount so it stops early when we have enough notes for the transaction
      if (selectionResult.needsConsolidation) {
        await consolidate((stage, batchInfo) => {
          // Update overlay steps based on consolidation progress stage
          const batchLabel = batchInfo && batchInfo.total > 1 ? ` (batch ${batchInfo.current}/${batchInfo.total})` : '';

          if (stage === 'preparing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-prepare-1' ? { ...s, status: 'active', description: `Preparing notes${batchLabel}...` } : s
            ));
          } else if (stage === 'generating') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-prepare-1' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-approve-1' ? { ...s, status: 'active', description: `Generating proof${batchLabel}...` } : s
            ));
          } else if (stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-approve-1' ? { ...s, status: 'active', description: `Building transactions${batchLabel}...` } : s
            ));
          } else if (stage === 'approving') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-approve-1' ? { ...s, status: 'active', description: `Approve in wallet${batchLabel}...` } : s
            ));
          } else if (stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-approve-1' ? { ...s, status: 'active', description: `Executing transactions${batchLabel}...` } : s
            ));
          } else if (stage === 'confirming') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-approve-1' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-confirm-1' ? { ...s, status: 'active', description: `Confirming${batchLabel}...` } : s
            ));
          } else if (stage === 'syncing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-confirm-1' ? { ...s, status: 'active', description: `Syncing notes${batchLabel}...` } : s
            ));
          }
        }, parsedAmount, 1);  // maxInputs=1 because transfer_1x2 needs a single note

        // Mark consolidation done
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'consolidate-confirm-1' ? { ...s, status: 'completed' } :
          s.id === 'prepare' ? { ...s, status: 'active' } : s
        ));

        // Get fresh notes directly from client (bypasses React state)
        // This is the same approach used by useConsolidation internally
        console.log('[Unshield] Fetching fresh notes from client after consolidation...');
        client!.clearScanCache();
        const freshNotes = await client!.scanNotes(selectedToken.mint);
        const tokenNotes = freshNotes.filter((n: any) => n.tokenMint.equals(selectedToken.mint));
        console.log(`[Unshield] Fresh notes for token: ${tokenNotes.length}`);

        if (tokenNotes.length === 0) {
          throw new Error('No notes found after consolidation');
        }

        // For transfer_1x2, we need a SINGLE note that covers the amount
        // Sort by amount descending and find the first note >= parsedAmount
        const sortedNotes = [...tokenNotes].sort((a: any, b: any) => Number(b.amount - a.amount));
        const singleNote = sortedNotes.find((n: any) => n.amount >= parsedAmount);
        if (!singleNote) {
          throw new Error('No single note large enough after consolidation. Try consolidating more notes.');
        }
        selectedNotes = [singleNote];

        // Also trigger a background sync to update React state
        sync(selectedToken.mint, true);
      } else {
        // No consolidation needed, use the original selection
        if (selectionResult.error) {
          throw new Error(selectionResult.error);
        }
        selectedNotes = selectionResult.notes;
      }

      const recipientPubkey = new PublicKey(recipientAddress);

      const result = await unshield({
        inputs: selectedNotes,
        amount: parsedAmount,
        recipient: recipientPubkey,
        isWalletAddress: true,
        walletPublicKey: solanaPublicKey ?? undefined,
        onProgress: (stage) => {
          // Update overlay steps based on progress stage
          if (stage === 'preparing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'active', description: 'Preparing inputs and outputs...' } : s
            ));
          } else if (stage === 'generating') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'completed' } :
              s.id === 'proof' ? { ...s, status: 'active' } : s
            ));
          } else if (stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'proof' ? { ...s, status: 'completed' } :
              s.id === 'submit' ? { ...s, status: 'active', description: 'Building transactions...' } : s
            ));
          } else if (stage === 'approving') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'active', description: 'Approve in wallet...' } : s
            ));
          } else if (stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'active', description: 'Executing transactions...' } : s
            ));
          } else if (stage === 'confirming') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'completed' } :
              s.id === 'confirm' ? { ...s, status: 'active' } : s
            ));
          }
        },
      });

      if (result) {
        // Mark all as completed
        setOverlaySteps(prev => prev.map(s => ({
          ...s,
          status: 'completed' as const,
          signature: s.id === 'submit' ? result.signature : undefined
        })));
        setTxSignature(result.signature);
        setOverlayStatus('success');
        setAmount('');
        toast.success('Tokens unshielded successfully');
      } else {
        throw new Error(unshieldError || 'Unshield failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setOverlaySteps(prev => {
        const activeIndex = prev.findIndex(s => s.status === 'active');
        return prev.map((s, i) => i === activeIndex ? { ...s, status: 'error', error: errorMsg } : s);
      });
      setOverlayStatus('error');
    }
  }, [
    canSubmit,
    selectedToken,
    parsedAmount,
    getSelectionResult,
    consolidate,
    recipientAddress,
    unshield,
    solanaPublicKey,
    unshieldError,
    sync,
    client,
  ]);

  const handleCloseOverlay = useCallback(() => {
    setShowOverlay(false);
    if (overlayStatus === 'success' || overlayStatus === 'error') {
      setOverlayStatus('idle');
    }
  }, [overlayStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpFromLine className="h-5 w-5" />
          Unshield
        </CardTitle>
        <CardDescription>
          Withdraw your private tokens to a public Solana wallet.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Token</Label>
          {tokensWithPrivateBalance.length === 0 ? (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No private balances found. Shield tokens first.
              </p>
            </div>
          ) : (
            <>
              <Select
                value={selectedToken?.mint.toBase58() || ''}
                onValueChange={(value) => {
                  const token = tokensWithPrivateBalance.find((t) => t.mint.toBase58() === value);
                  if (token) {
                    setSelectedToken(token);
                    setAmount('');
                  }
                }}
                disabled={isUnshielding || overlayStatus === 'pending'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {tokensWithPrivateBalance.map((token) => (
                    <SelectItem key={token.mint.toBase58()} value={token.mint.toBase58()}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedToken && (
                <p className="text-xs text-muted-foreground">
                  Private balance: {formatAmount(totalAvailable, selectedToken.decimals)}{' '}
                  {selectedToken.symbol}
                </p>
              )}
            </>
          )}
        </div>

        {/* Consolidation recommendation */}
        {selectedToken && shouldConsolidate && (
          <ConsolidationPrompt
            tokenMint={selectedToken.mint}
            tokenSymbol={selectedToken.symbol}
            variant="alert"
          />
        )}

        {tokensWithPrivateBalance.length > 0 && (
          <>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
                      setAmount(value);
                    }
                  }}
                  disabled={isUnshielding || overlayStatus === 'pending'}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                  onClick={() => {
                    if (selectedToken) {
                      setAmount(formatAmount(totalAvailable, selectedToken.decimals));
                    }
                  }}
                  disabled={isUnshielding || overlayStatus === 'pending'}
                >
                  MAX
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recipient</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={useSelfRecipient ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setUseSelfRecipient(true);
                    if (solanaPublicKey) {
                      setRecipientAddress(solanaPublicKey.toBase58());
                    }
                  }}
                  disabled={isUnshielding || overlayStatus === 'pending'}
                >
                  My Wallet
                </Button>
                <Button
                  type="button"
                  variant={!useSelfRecipient ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setUseSelfRecipient(false);
                    setRecipientAddress('');
                  }}
                  disabled={isUnshielding || overlayStatus === 'pending'}
                >
                  Custom Address
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Wallet Address</Label>
              <Input
                type="text"
                placeholder="Enter Solana wallet address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                disabled={useSelfRecipient || isUnshielding || overlayStatus === 'pending'}
                className="font-mono text-sm"
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5" />
                <span>
                  The token account will be derived automatically.
                </span>
              </div>
            </div>

            {/* Fee breakdown */}
            {feeBreakdown && parsedAmount > 0n && !validationError && (
              <FeeBreakdown
                data={feeBreakdown}
                totalLabel="You receive"
              />
            )}

            {validationError && amount && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}
          </>
        )}

        {!isProverReady && (
          <div className="rounded-lg bg-yellow-500/10 p-4 text-sm">
            <p className="text-yellow-600">Loading ZK prover...</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
          {isUnshielding || overlayStatus === 'pending' ? 'Unshielding...' : 'Unshield Tokens'}
        </Button>
      </CardFooter>

      {/* Transaction Overlay */}
      <TransactionOverlay
        isOpen={showOverlay}
        onClose={handleCloseOverlay}
        title="Unshield Tokens"
        steps={overlaySteps}
        status={overlayStatus}
        finalSignature={txSignature}
        feeBreakdown={feeBreakdown ? {
          amount: feeBreakdown.amount,
          protocolFee: feeBreakdown.protocolFee,
          total: feeBreakdown.total,
          symbol: feeBreakdown.symbol,
        } : undefined}
        onRetry={handleSubmit}
      />
    </Card>
  );
}
