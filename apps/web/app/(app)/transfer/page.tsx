'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
import { SUPPORTED_TOKENS, TokenInfo } from '@/lib/constants';
import { formatAmount, parseAmount, isValidPublicKey } from '@/lib/utils';

export default function TransferPage() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const defaultTab = ['shield', 'transfer', 'unshield'].includes(tabParam || '') ? tabParam! : 'shield';

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

      <Tabs defaultValue={defaultTab} className="max-w-lg mx-auto">
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
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">You will receive</p>
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
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [recipientPubkey, setRecipientPubkey] = useState('');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const { transfer, isTransferring, error: transferError } = useTransfer();

  const { totalAvailable, selectNotesForAmount } = useNoteSelector(
    selectedToken?.mint || SUPPORTED_TOKENS[0]?.mint
  );

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
    txStatus !== 'pending' &&
    tokensWithBalance.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedToken || !recipientPoint || !wallet || !client?.getProgram()) return;

    setTxStatus('pending');
    setTxError(undefined);
    setTxSignature(undefined);

    try {
      let selectedNotes;
      try {
        selectedNotes = selectNotesForAmount(parsedAmount);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Insufficient balance');
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

      const result = await transfer(selectedNotes, outputs, undefined, publicKey ?? undefined);

      if (result) {
        setTxSignature(result.signature);
        setTxStatus('success');
        setAmount('');
        setRecipientPubkey('');
        toast.success('Transfer sent successfully');
      } else {
        setTxStatus('error');
        setTxError(transferError || 'Transfer failed');
      }
    } catch (error) {
      setTxStatus('error');
      setTxError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [
    canSubmit,
    selectedToken,
    recipientPoint,
    wallet,
    client,
    parsedAmount,
    selectNotesForAmount,
    transfer,
    publicKey,
    transferError,
  ]);

  const handleReset = useCallback(() => {
    setTxStatus('idle');
    setTxSignature(undefined);
    setTxError(undefined);
  }, []);

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
                disabled={isTransferring || txStatus === 'pending'}
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
                  disabled={isTransferring || txStatus === 'pending'}
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
                  disabled={isTransferring || txStatus === 'pending'}
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
                disabled={isTransferring || txStatus === 'pending'}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5" />
                <span>
                  Ask the recipient for their stealth public key from their Settings page.
                </span>
              </div>
            </div>

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

        <TransactionStatus
          status={txStatus}
          signature={txSignature}
          error={txError}
          onReset={handleReset}
        />
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
          {isTransferring || txStatus === 'pending' ? 'Transferring...' : 'Send Private Transfer'}
        </Button>
      </CardFooter>
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
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [useSelfRecipient, setUseSelfRecipient] = useState(true);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const { unshield, isUnshielding, error: unshieldError } = useUnshield();

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

  const { totalAvailable, selectNotesForAmount } = useNoteSelector(
    selectedToken?.mint || SUPPORTED_TOKENS[0]?.mint
  );

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
    txStatus !== 'pending' &&
    tokensWithPrivateBalance.length > 0;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedToken) return;

    setTxStatus('pending');
    setTxError(undefined);
    setTxSignature(undefined);

    try {
      let selectedNotes;
      try {
        selectedNotes = selectNotesForAmount(parsedAmount);
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Insufficient balance');
      }

      const recipientPubkey = new PublicKey(recipientAddress);

      const result = await unshield({
        inputs: selectedNotes,
        amount: parsedAmount,
        recipient: recipientPubkey,
        isWalletAddress: true,
        walletPublicKey: solanaPublicKey ?? undefined,
      });

      if (result) {
        setTxSignature(result.signature);
        setTxStatus('success');
        setAmount('');
        toast.success('Tokens unshielded successfully');
      } else {
        setTxStatus('error');
        setTxError(unshieldError || 'Unshield failed');
      }
    } catch (error) {
      setTxStatus('error');
      setTxError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [
    canSubmit,
    selectedToken,
    parsedAmount,
    selectNotesForAmount,
    recipientAddress,
    unshield,
    solanaPublicKey,
    unshieldError,
  ]);

  const handleReset = useCallback(() => {
    setTxStatus('idle');
    setTxSignature(undefined);
    setTxError(undefined);
  }, []);

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
                disabled={isUnshielding || txStatus === 'pending'}
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
                  disabled={isUnshielding || txStatus === 'pending'}
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
                  disabled={isUnshielding || txStatus === 'pending'}
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
                  disabled={isUnshielding || txStatus === 'pending'}
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
                  disabled={isUnshielding || txStatus === 'pending'}
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
                disabled={useSelfRecipient || isUnshielding || txStatus === 'pending'}
                className="font-mono text-sm"
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5" />
                <span>
                  The token account will be derived automatically.
                </span>
              </div>
            </div>

            {validationError && amount && (
              <p className="text-sm text-destructive">{validationError}</p>
            )}

            {parsedAmount > 0n && selectedToken && !validationError && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm font-medium">You will receive</p>
                <p className="text-lg font-mono">
                  {formatAmount(parsedAmount, selectedToken.decimals)} {selectedToken.symbol}
                </p>
                <p className="text-xs text-muted-foreground">in your public wallet</p>
              </div>
            )}
          </>
        )}

        {!isProverReady && (
          <div className="rounded-lg bg-yellow-500/10 p-4 text-sm">
            <p className="text-yellow-600">Loading ZK prover...</p>
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
        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit}>
          {isUnshielding || txStatus === 'pending' ? 'Unshielding...' : 'Unshield Tokens'}
        </Button>
      </CardFooter>
    </Card>
  );
}
