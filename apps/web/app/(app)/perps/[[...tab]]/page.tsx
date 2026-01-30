'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import {
  useCloakCraft,
  usePerpsPools,
  usePerpsMarkets,
  useOpenPosition,
  useClosePosition,
  usePerpsAddLiquidity,
  usePerpsRemoveLiquidity,
  usePerpsPositions,
  usePositionPnL,
  useLiquidationPrice,
  useLpValue,
  useTokenUtilization,
  usePythPrice,
  usePythPrices,
  // Admin hooks
  useInitializePerpsPool,
  useAddPerpsToken,
  useAddPerpsMarket,
  useUpdatePerpsPoolConfig,
  type PerpsProgressStage,
  type ScannedPerpsPosition,
} from '@cloakcraft/hooks';
import type {
  PerpsPoolState,
  PerpsMarketState,
  DecryptedNote,
} from '@cloakcraft/sdk';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  Wallet,
  BarChart3,
  Droplets,
  Info,
  Skull,
  Activity,
  Settings,
  Plus,
  RefreshCw,
  ExternalLink,
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
import { Slider } from '@/components/ui/slider';
import {
  TransactionOverlay,
  TransactionStep,
} from '@/components/operations';
import { SUPPORTED_TOKENS, TokenInfo, getExplorerAddressUrl, PROGRAM_ID } from '@/lib/constants';
import { formatAmount, parseAmount, toBigInt } from '@/lib/utils';

const VALID_TABS = ['trade', 'positions', 'liquidity', 'admin'] as const;
type TabValue = (typeof VALID_TABS)[number];

export default function PerpsPage() {
  const params = useParams();
  const router = useRouter();

  // Get tab from URL path
  const tabFromPath = params.tab?.[0] as string | undefined;
  const currentTab: TabValue = VALID_TABS.includes(tabFromPath as TabValue)
    ? (tabFromPath as TabValue)
    : 'trade';

  const handleTabChange = useCallback(
    (value: string) => {
      router.push(`/perps/${value}`);
    },
    [router]
  );

  const {
    isConnected: isStealthConnected,
    isProgramReady,
    isProverReady,
    wallet,
    client,
    notes,
  } = useCloakCraft();

  // Fetch pools and markets
  const { pools, isLoading: poolsLoading, refresh: refreshPools } = usePerpsPools();

  // Show setup required message if stealth wallet not connected
  if (!isStealthConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Perpetuals</h1>
          <p className="text-muted-foreground">
            Trade perpetual futures with up to 100x leverage.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Stealth wallet required</p>
                <p className="text-sm">
                  Create a stealth wallet to trade perpetuals. Click the
                  &quot;Stealth Wallet&quot; button in the header.
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
        <h1 className="text-2xl font-semibold">Perpetuals</h1>
        <p className="text-muted-foreground">
          Trade perpetual futures with up to 100x leverage.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="trade" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <TrendingUp className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Trade</span>
          </TabsTrigger>
          <TabsTrigger value="positions" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <BarChart3 className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Positions</span>
          </TabsTrigger>
          <TabsTrigger value="liquidity" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <Droplets className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Liquidity</span>
          </TabsTrigger>
          <TabsTrigger value="admin" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <Settings className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Admin</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trade">
          <TradeTab
            pools={pools}
            poolsLoading={poolsLoading}
            isProgramReady={isProgramReady}
            isProverReady={isProverReady}
            notes={notes}
            refreshPools={refreshPools}
          />
        </TabsContent>

        <TabsContent value="positions">
          <PositionsTab
            pools={pools}
            poolsLoading={poolsLoading}
            isProgramReady={isProgramReady}
            isProverReady={isProverReady}
            notes={notes}
          />
        </TabsContent>

        <TabsContent value="liquidity">
          <LiquidityTab
            pools={pools}
            poolsLoading={poolsLoading}
            isProgramReady={isProgramReady}
            isProverReady={isProverReady}
            notes={notes}
            refreshPools={refreshPools}
          />
        </TabsContent>

        <TabsContent value="admin">
          <AdminTab
            pools={pools}
            poolsLoading={poolsLoading}
            refreshPools={refreshPools}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// =============================================================================
// Trade Tab - Open/Close Positions
// =============================================================================

function TradeTab({
  pools,
  poolsLoading,
  isProgramReady,
  isProverReady,
  notes,
  refreshPools,
}: {
  pools: Array<PerpsPoolState & { address: PublicKey }>;
  poolsLoading: boolean;
  isProgramReady: boolean;
  isProverReady: boolean;
  notes: DecryptedNote[];
  refreshPools: () => void;
}) {
  const [selectedPool, setSelectedPool] = useState<(PerpsPoolState & { address: PublicKey }) | null>(null);
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [marginAmount, setMarginAmount] = useState('');
  const [leverage, setLeverage] = useState(10);
  const [selectedMarginNote, setSelectedMarginNote] = useState<DecryptedNote | null>(null);

  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [txSteps, setTxSteps] = useState<TransactionStep[]>([]);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  // Fetch markets for selected pool
  const { markets, isLoading: marketsLoading } = usePerpsMarkets(selectedPool?.address ?? null);
  const [selectedMarket, setSelectedMarket] = useState<(PerpsMarketState & { address: PublicKey }) | null>(null);

  // Open position hook
  const { openPosition, isOpening } = useOpenPosition();

  // Fetch oracle price for the base token (e.g., SOL, BTC, ETH)
  // Default to SOL if no market selected
  const baseTokenSymbol = useMemo(() => {
    if (!selectedPool || !selectedMarket) return 'SOL';
    const baseToken = selectedPool.tokens[selectedMarket.baseTokenIndex];
    if (!baseToken) return 'SOL';
    // Try to find matching token in SUPPORTED_TOKENS to get symbol
    const supportedToken = SUPPORTED_TOKENS.find(t => t.mint.equals(baseToken.mint));
    return supportedToken?.symbol || 'SOL';
  }, [selectedPool, selectedMarket]);

  const { price: oraclePrice, isLoading: priceLoading } = usePythPrice(baseTokenSymbol);

  // Set default pool
  useEffect(() => {
    if (!poolsLoading && pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [poolsLoading, pools, selectedPool]);

  // Set default market
  useEffect(() => {
    if (!marketsLoading && markets.length > 0 && !selectedMarket) {
      setSelectedMarket(markets[0]);
    }
  }, [marketsLoading, markets, selectedMarket]);

  // Get margin token (quote token for longs, base token for shorts)
  const marginToken = useMemo(() => {
    if (!selectedPool || !selectedMarket) return null;
    const tokenIndex = direction === 'long'
      ? selectedMarket.quoteTokenIndex
      : selectedMarket.baseTokenIndex;
    const token = selectedPool.tokens[tokenIndex];
    if (!token) return null;
    return SUPPORTED_TOKENS.find(t => t.mint.equals(token.mint)) || null;
  }, [selectedPool, selectedMarket, direction]);

  // Filter notes for margin token
  const marginNotes = useMemo(() => {
    if (!marginToken) return [];
    return notes.filter(note => {
      const noteMint = note.tokenMint instanceof Uint8Array
        ? new PublicKey(note.tokenMint)
        : note.tokenMint;
      return noteMint.equals(marginToken.mint);
    });
  }, [notes, marginToken]);

  // Calculate position size
  const positionSize = useMemo(() => {
    if (!marginAmount || !leverage) return 0n;
    try {
      const margin = parseAmount(marginAmount, marginToken?.decimals || 6);
      return margin * BigInt(leverage);
    } catch {
      return 0n;
    }
  }, [marginAmount, leverage, marginToken]);

  // Validation
  const validationError = useMemo(() => {
    if (!selectedPool) return 'Select a pool';
    if (!selectedMarket) return 'Select a market';
    if (!marginAmount || parseFloat(marginAmount) <= 0) return 'Enter margin amount';
    if (!selectedMarginNote) return 'Select margin note';

    const marginBigInt = parseAmount(marginAmount, marginToken?.decimals || 6);
    if (marginBigInt > selectedMarginNote.amount) return 'Insufficient balance';
    if (leverage < 1 || leverage > 100) return 'Leverage must be 1-100';

    return null;
  }, [selectedPool, selectedMarket, marginAmount, selectedMarginNote, leverage, marginToken]);

  const handleOpenPosition = async () => {
    if (validationError || !selectedPool || !selectedMarket || !selectedMarginNote) return;

    setIsSubmitting(true);
    setShowOverlay(true);
    setTxStatus('pending');
    setTxError(undefined);
    setTxSignature(undefined);

    const steps: TransactionStep[] = [
      { id: 'prepare', name: 'Preparing...', status: 'active' },
      { id: 'proof', name: 'Generating ZK proof', status: 'pending' },
      { id: 'submit', name: 'Opening position', status: 'pending' },
      { id: 'confirm', name: 'Confirming', status: 'pending' },
    ];
    setTxSteps(steps);

    try {
      const result = await openPosition({
        marginInput: selectedMarginNote,
        pool: selectedPool,
        market: selectedMarket,
        direction,
        marginAmount: parseAmount(marginAmount, marginToken?.decimals || 6),
        leverage,
        oraclePrice: oraclePrice || 100_000_000n, // Real oracle price from Pyth
        onProgress: (stage: PerpsProgressStage) => {
          setTxSteps(prev => prev.map(step => {
            if (stage === 'preparing' && step.id === 'prepare') {
              return { ...step, status: 'active' };
            }
            if (stage === 'generating' && step.id === 'proof') {
              return { ...step, status: 'active' };
            }
            if (stage === 'building' && step.id === 'submit') {
              return { ...step, status: 'active' };
            }
            if (stage === 'confirming' && step.id === 'confirm') {
              return { ...step, status: 'active' };
            }
            return step;
          }));
        },
      });

      setTxStatus('success');
      if (result?.signature) {
        setTxSignature(result.signature);
      }
      setTxSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
      toast.success('Position opened successfully!');

      // Reset form
      setMarginAmount('');
      setSelectedMarginNote(null);
      refreshPools();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to open position';
      setTxStatus('error');
      setTxError(errorMsg);
      setTxSteps(prev => prev.map(s =>
        s.status === 'active' ? { ...s, status: 'error' } : s
      ));
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (poolsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pools.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">No perps pools available</p>
              <p className="text-sm">
                No perpetual futures pools have been created yet.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Open Position</CardTitle>
          <CardDescription>
            Open a leveraged long or short position
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Direction Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={direction === 'long' ? 'default' : 'outline'}
              className={direction === 'long' ? 'bg-green-600 hover:bg-green-700' : ''}
              onClick={() => setDirection('long')}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Long
            </Button>
            <Button
              variant={direction === 'short' ? 'default' : 'outline'}
              className={direction === 'short' ? 'bg-red-600 hover:bg-red-700' : ''}
              onClick={() => setDirection('short')}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              Short
            </Button>
          </div>

          {/* Pool Selection */}
          <div className="space-y-2">
            <Label>Pool</Label>
            <Select
              value={selectedPool?.address.toBase58()}
              onValueChange={(value) => {
                const pool = pools.find(p => p.address.toBase58() === value);
                setSelectedPool(pool || null);
                setSelectedMarket(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pool" />
              </SelectTrigger>
              <SelectContent>
                {pools.map((pool) => (
                  <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                    Pool {pool.address.toBase58().slice(0, 8)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Market Selection */}
          {selectedPool && (
            <div className="space-y-2">
              <Label>Market</Label>
              <Select
                value={selectedMarket?.address.toBase58()}
                onValueChange={(value) => {
                  const market = markets.find(m => m.address.toBase58() === value);
                  setSelectedMarket(market || null);
                }}
                disabled={marketsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={marketsLoading ? 'Loading...' : 'Select market'} />
                </SelectTrigger>
                <SelectContent>
                  {markets.map((market) => (
                    <SelectItem key={market.address.toBase58()} value={market.address.toBase58()}>
                      Market {market.address.toBase58().slice(0, 8)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Margin Note Selection */}
          {marginToken && (
            <div className="space-y-2">
              <Label>Margin ({marginToken.symbol})</Label>
              <Select
                value={selectedMarginNote?.accountHash}
                onValueChange={(value) => {
                  const note = marginNotes.find(n => n.accountHash === value);
                  setSelectedMarginNote(note || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select margin note" />
                </SelectTrigger>
                <SelectContent>
                  {marginNotes.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No {marginToken.symbol} notes available
                    </SelectItem>
                  ) : (
                    marginNotes.map((note) => (
                      <SelectItem key={note.accountHash} value={note.accountHash || ''}>
                        {formatAmount(note.amount, marginToken.decimals)} {marginToken.symbol}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Margin Amount */}
          <div className="space-y-2">
            <Label>Margin Amount</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={marginAmount}
                onChange={(e) => setMarginAmount(e.target.value)}
              />
              {selectedMarginNote && marginToken && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                  onClick={() => setMarginAmount(formatAmount(selectedMarginNote.amount, marginToken.decimals))}
                >
                  MAX
                </Button>
              )}
            </div>
          </div>

          {/* Leverage Slider */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Leverage</Label>
              <span className="text-sm font-medium">{leverage}x</span>
            </div>
            <Slider
              value={[leverage]}
              onValueChange={([value]) => setLeverage(value)}
              min={1}
              max={100}
              step={1}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1x</span>
              <span>25x</span>
              <span>50x</span>
              <span>75x</span>
              <span>100x</span>
            </div>
          </div>

          {/* Position Size Display */}
          {positionSize > 0n && marginToken && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Position Size</span>
                <span className="font-medium">
                  {formatAmount(positionSize, marginToken.decimals)} {marginToken.symbol}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Direction</span>
                <Badge variant={direction === 'long' ? 'default' : 'destructive'}>
                  {direction.toUpperCase()}
                </Badge>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && marginAmount && (
            <p className="text-sm text-destructive">{validationError}</p>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            size="lg"
            disabled={!!validationError || isSubmitting || !isProverReady}
            onClick={handleOpenPosition}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Opening Position...
              </>
            ) : !isProverReady ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Prover...
              </>
            ) : (
              <>
                <TrendingUp className="h-4 w-4 mr-2" />
                Open {direction === 'long' ? 'Long' : 'Short'} Position
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <TransactionOverlay
        isOpen={showOverlay}
        title="Opening Position"
        steps={txSteps}
        status={txStatus}
        finalSignature={txSignature}
        onClose={() => setShowOverlay(false)}
      />
    </>
  );
}

// =============================================================================
// Positions Tab
// =============================================================================

function PositionsTab({
  pools,
  poolsLoading,
  isProgramReady,
  isProverReady,
  notes,
}: {
  pools: Array<PerpsPoolState & { address: PublicKey }>;
  poolsLoading: boolean;
  isProgramReady: boolean;
  isProverReady: boolean;
  notes: DecryptedNote[];
}) {
  const [selectedPool, setSelectedPool] = useState<(PerpsPoolState & { address: PublicKey }) | null>(null);

  // Set default pool for position scanning
  useEffect(() => {
    if (!poolsLoading && pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [poolsLoading, pools, selectedPool]);

  // Scan for positions in the selected pool
  // Position pool is derived from the perps pool address
  const { positions, isLoading: positionsLoading, refresh: refreshPositions } = usePerpsPositions(
    selectedPool?.address ?? null
  );

  // Format price for display
  const formatPrice = (price: bigint): string => {
    // Assuming price is in 1e8 (standard oracle precision)
    const num = Number(price) / 1e8;
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  // Format margin/size for display
  const formatMargin = (amount: bigint, decimals: number = 6): string => {
    const num = Number(amount) / Math.pow(10, decimals);
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  if (poolsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Your Positions</CardTitle>
            <CardDescription>
              View and manage your open leveraged positions
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshPositions}
            disabled={positionsLoading}
          >
            <Loader2 className={`h-4 w-4 ${positionsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pool selector for scanning */}
        {pools.length > 1 && (
          <div className="space-y-2">
            <Label>Pool</Label>
            <Select
              value={selectedPool?.address.toBase58()}
              onValueChange={(value) => {
                const pool = pools.find(p => p.address.toBase58() === value);
                setSelectedPool(pool || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pool" />
              </SelectTrigger>
              <SelectContent>
                {pools.map((pool) => (
                  <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                    Pool {pool.address.toBase58().slice(0, 8)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Positions list */}
        {positionsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">Scanning positions...</span>
          </div>
        ) : positions.length === 0 ? (
          <>
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground font-medium">No open positions</p>
              <p className="text-sm text-muted-foreground/70 max-w-sm mt-1">
                Open a position in the Trade tab to start trading perpetual futures
                with up to 100x leverage.
              </p>
            </div>

            {/* Position tracking info */}
            <div className="rounded-lg bg-muted/50 p-4 space-y-2">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">How positions work</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside text-xs">
                    <li>Positions are stored as private encrypted notes</li>
                    <li>Only you can view and manage your positions</li>
                    <li>PnL is calculated based on oracle prices</li>
                    <li>Positions can be liquidated if margin falls below threshold</li>
                  </ul>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {positions.map((position, index) => (
              <div
                key={`${position.accountHash}-${index}`}
                className={`rounded-lg border p-4 space-y-3 ${
                  position.status === 'liquidated' ? 'border-red-500/50 bg-red-500/5' : ''
                }`}
              >
                {/* Position header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {position.isLong ? (
                      <Badge className="bg-green-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        LONG
                      </Badge>
                    ) : (
                      <Badge className="bg-red-600">
                        <TrendingDown className="h-3 w-3 mr-1" />
                        SHORT
                      </Badge>
                    )}
                    <span className="text-sm font-medium">{position.leverage}x</span>
                    {/* Status badge */}
                    {position.status === 'active' && (
                      <Badge variant="outline" className="text-green-600 border-green-600/50">
                        <Activity className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    {position.status === 'liquidated' && (
                      <Badge variant="destructive">
                        <Skull className="h-3 w-3 mr-1" />
                        Liquidated
                      </Badge>
                    )}
                    {position.status === 'closed' && (
                      <Badge variant="secondary">
                        <XCircle className="h-3 w-3 mr-1" />
                        Closed
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">
                    {position.accountHash.slice(0, 8)}...
                  </span>
                </div>

                {/* Liquidation warning */}
                {position.liquidationPrice && position.status === 'active' && (
                  <div className="flex items-center gap-2 rounded-md bg-amber-500/10 border border-amber-500/30 p-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      Liquidation at ${formatPrice(position.liquidationPrice)}
                    </span>
                  </div>
                )}

                {/* Position details */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Margin</p>
                    <p className="font-medium">{formatMargin(position.margin)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="font-medium">{formatMargin(position.size)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entry Price</p>
                    <p className="font-medium">${formatPrice(position.entryPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {position.liquidationPrice ? 'Liq. Price' : 'Leverage'}
                    </p>
                    <p className="font-medium">
                      {position.liquidationPrice
                        ? `$${formatPrice(position.liquidationPrice)}`
                        : `${position.leverage}x`}
                    </p>
                  </div>
                </div>

                {/* Position opened time */}
                {position.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    Opened {new Date(position.createdAt * 1000).toLocaleDateString()}
                  </p>
                )}

                {/* Close position button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={position.status !== 'active'}
                >
                  {position.status === 'liquidated'
                    ? 'Position Liquidated'
                    : position.status === 'closed'
                    ? 'Position Closed'
                    : 'Close Position (Coming Soon)'}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Quick stats */}
        {pools.length > 0 && positions.length === 0 && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-muted-foreground text-xs">Available Pools</p>
              <p className="font-medium">{pools.length}</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-3">
              <p className="text-muted-foreground text-xs">Max Leverage</p>
              <p className="font-medium">{pools[0]?.maxLeverage || 100}x</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Liquidity Tab
// =============================================================================

function LiquidityTab({
  pools,
  poolsLoading,
  isProgramReady,
  isProverReady,
  notes,
  refreshPools,
}: {
  pools: Array<PerpsPoolState & { address: PublicKey }>;
  poolsLoading: boolean;
  isProgramReady: boolean;
  isProverReady: boolean;
  notes: DecryptedNote[];
  refreshPools: () => void;
}) {
  const [mode, setMode] = useState<'add' | 'remove'>('add');
  const [selectedPool, setSelectedPool] = useState<(PerpsPoolState & { address: PublicKey }) | null>(null);
  const [selectedTokenIndex, setSelectedTokenIndex] = useState<number>(0);
  const [amount, setAmount] = useState('');
  const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);

  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [txSteps, setTxSteps] = useState<TransactionStep[]>([]);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  // Hooks
  const { addLiquidity, isAdding } = usePerpsAddLiquidity();
  const { removeLiquidity, isRemoving } = usePerpsRemoveLiquidity();

  // Get token symbols for oracle price fetching
  const poolTokenSymbols = useMemo(() => {
    if (!selectedPool) return [];
    return selectedPool.tokens
      .filter(t => t?.isActive)
      .map(token => {
        const supportedToken = SUPPORTED_TOKENS.find(st => st.mint.equals(token.mint));
        return supportedToken?.symbol || 'SOL';
      });
  }, [selectedPool]);

  // Fetch oracle prices for all pool tokens
  const { prices: oraclePrices } = usePythPrices(poolTokenSymbols);

  // Convert prices map to array matching pool token order
  const oraclePricesArray = useMemo(() => {
    if (!selectedPool || oraclePrices.size === 0) {
      return selectedPool?.tokens.map(() => 100_000_000n) || [];
    }
    return selectedPool.tokens.map((token, i) => {
      if (!token?.isActive) return 100_000_000n;
      const supportedToken = SUPPORTED_TOKENS.find(st => st.mint.equals(token.mint));
      const symbol = supportedToken?.symbol || 'SOL';
      return oraclePrices.get(symbol) || 100_000_000n;
    });
  }, [selectedPool, oraclePrices]);

  // Set default pool
  useEffect(() => {
    if (!poolsLoading && pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [poolsLoading, pools, selectedPool]);

  // Get selected token info
  const selectedToken = useMemo(() => {
    if (!selectedPool) return null;
    const token = selectedPool.tokens[selectedTokenIndex];
    if (!token) return null;
    return SUPPORTED_TOKENS.find(t => t.mint.equals(token.mint)) || null;
  }, [selectedPool, selectedTokenIndex]);

  // Filter notes for selected token (for add) or LP token (for remove)
  const relevantNotes = useMemo(() => {
    if (!selectedPool) return [];

    if (mode === 'add' && selectedToken) {
      return notes.filter(note => {
        const noteMint = note.tokenMint instanceof Uint8Array
          ? new PublicKey(note.tokenMint)
          : note.tokenMint;
        return noteMint.equals(selectedToken.mint);
      });
    } else if (mode === 'remove') {
      // Filter for LP token notes
      return notes.filter(note => {
        const noteMint = note.tokenMint instanceof Uint8Array
          ? new PublicKey(note.tokenMint)
          : note.tokenMint;
        return noteMint.equals(selectedPool.lpMint);
      });
    }
    return [];
  }, [notes, selectedPool, selectedToken, mode]);

  // Utilization display
  const utilization = useMemo(() => {
    if (!selectedPool) return null;
    const token = selectedPool.tokens[selectedTokenIndex];
    if (!token) return 0;
    // Convert BN to BigInt (Anchor returns BN objects)
    const balance = toBigInt(token.balance);
    const locked = toBigInt(token.locked);
    if (balance === 0n) return 0;
    return Number((locked * 100n) / balance);
  }, [selectedPool, selectedTokenIndex]);

  const handleSubmit = async () => {
    if (!selectedPool || !selectedNote || !amount) return;

    setIsSubmitting(true);
    setShowOverlay(true);
    setTxStatus('pending');
    setTxError(undefined);
    setTxSignature(undefined);

    const steps: TransactionStep[] = [
      { id: 'prepare', name: 'Preparing...', status: 'active' },
      { id: 'proof', name: 'Generating ZK proof', status: 'pending' },
      { id: 'submit', name: mode === 'add' ? 'Adding liquidity' : 'Removing liquidity', status: 'pending' },
      { id: 'confirm', name: 'Confirming', status: 'pending' },
    ];
    setTxSteps(steps);

    try {
      const decimals = mode === 'add' ? (selectedToken?.decimals || 6) : 6;
      const amountBigInt = parseAmount(amount, decimals);

      const onProgress = (stage: PerpsProgressStage) => {
        setTxSteps(prev => prev.map(step => {
          if (stage === 'preparing' && step.id === 'prepare') return { ...step, status: 'active' };
          if (stage === 'generating' && step.id === 'proof') return { ...step, status: 'active' };
          if (stage === 'building' && step.id === 'submit') return { ...step, status: 'active' };
          if (stage === 'confirming' && step.id === 'confirm') return { ...step, status: 'active' };
          return step;
        }));
      };

      let result;
      if (mode === 'add') {
        result = await addLiquidity({
          tokenInput: selectedNote,
          pool: selectedPool,
          tokenIndex: selectedTokenIndex,
          depositAmount: amountBigInt,
          oraclePrices: oraclePricesArray,
          onProgress,
        });
      } else {
        result = await removeLiquidity({
          lpInput: selectedNote as any, // LP note type cast - hook handles validation
          pool: selectedPool,
          tokenIndex: selectedTokenIndex,
          lpAmount: amountBigInt,
          oraclePrices: oraclePricesArray,
          onProgress,
        });
      }

      setTxStatus('success');
      if (result?.signature) {
        setTxSignature(result.signature);
      }
      setTxSteps(prev => prev.map(s => ({ ...s, status: 'completed' })));
      toast.success(mode === 'add' ? 'Liquidity added!' : 'Liquidity removed!');

      setAmount('');
      setSelectedNote(null);
      refreshPools();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transaction failed';
      setTxStatus('error');
      setTxError(errorMsg);
      setTxSteps(prev => prev.map(s =>
        s.status === 'active' ? { ...s, status: 'error' } : s
      ));
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (poolsLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pools.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">No perps pools available</p>
              <p className="text-sm">No pools to provide liquidity to.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Liquidity</CardTitle>
          <CardDescription>
            Provide liquidity to earn trading fees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mode Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={mode === 'add' ? 'default' : 'outline'}
              onClick={() => {
                setMode('add');
                setSelectedNote(null);
                setAmount('');
              }}
            >
              Add Liquidity
            </Button>
            <Button
              variant={mode === 'remove' ? 'default' : 'outline'}
              onClick={() => {
                setMode('remove');
                setSelectedNote(null);
                setAmount('');
              }}
            >
              Remove Liquidity
            </Button>
          </div>

          {/* Pool Selection */}
          <div className="space-y-2">
            <Label>Pool</Label>
            <Select
              value={selectedPool?.address.toBase58()}
              onValueChange={(value) => {
                const pool = pools.find(p => p.address.toBase58() === value);
                setSelectedPool(pool || null);
                setSelectedTokenIndex(0);
                setSelectedNote(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select pool" />
              </SelectTrigger>
              <SelectContent>
                {pools.map((pool) => (
                  <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                    Pool {pool.address.toBase58().slice(0, 8)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Token Selection (for add) */}
          {mode === 'add' && selectedPool && (
            <div className="space-y-2">
              <Label>Token</Label>
              <Select
                value={selectedTokenIndex.toString()}
                onValueChange={(value) => {
                  setSelectedTokenIndex(parseInt(value));
                  setSelectedNote(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {selectedPool.tokens.slice(0, selectedPool.numTokens).map((token, index) => {
                    const tokenInfo = SUPPORTED_TOKENS.find(t => t.mint.equals(token.mint));
                    return (
                      <SelectItem key={index} value={index.toString()}>
                        {tokenInfo?.symbol || token.mint.toBase58().slice(0, 8)}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Note Selection */}
          <div className="space-y-2">
            <Label>{mode === 'add' ? 'From Note' : 'LP Note'}</Label>
            <Select
              value={selectedNote?.accountHash}
              onValueChange={(value) => {
                const note = relevantNotes.find(n => n.accountHash === value);
                setSelectedNote(note || null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${mode === 'add' ? 'token' : 'LP'} note`} />
              </SelectTrigger>
              <SelectContent>
                {relevantNotes.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No notes available
                  </SelectItem>
                ) : (
                  relevantNotes.map((note) => {
                    const decimals = mode === 'add' ? (selectedToken?.decimals || 6) : 6;
                    const symbol = mode === 'add' ? selectedToken?.symbol : 'LP';
                    return (
                      <SelectItem key={note.accountHash} value={note.accountHash || ''}>
                        {formatAmount(note.amount, decimals)} {symbol}
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Amount</Label>
            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              {selectedNote && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                  onClick={() => {
                    const decimals = mode === 'add' ? (selectedToken?.decimals || 6) : 6;
                    setAmount(formatAmount(selectedNote.amount, decimals));
                  }}
                >
                  MAX
                </Button>
              )}
            </div>
          </div>

          {/* Pool Stats */}
          {selectedPool && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">LP Supply</span>
                <span className="font-medium">
                  {formatAmount(selectedPool.lpSupply, 6)} LP
                </span>
              </div>
              {utilization !== null && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Utilization</span>
                  <span className="font-medium">{utilization.toFixed(1)}%</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full"
            size="lg"
            disabled={!selectedNote || !amount || isSubmitting || !isProverReady}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {mode === 'add' ? 'Adding...' : 'Removing...'}
              </>
            ) : !isProverReady ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading Prover...
              </>
            ) : (
              <>
                <Droplets className="h-4 w-4 mr-2" />
                {mode === 'add' ? 'Add Liquidity' : 'Remove Liquidity'}
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      <TransactionOverlay
        isOpen={showOverlay}
        title={mode === 'add' ? 'Adding Liquidity' : 'Removing Liquidity'}
        steps={txSteps}
        status={txStatus}
        finalSignature={txSignature}
        onClose={() => setShowOverlay(false)}
      />
    </>
  );
}

// =============================================================================
// Admin Tab - Pool Management
// =============================================================================

function AdminTab({
  pools,
  poolsLoading,
  refreshPools,
}: {
  pools: Array<PerpsPoolState & { address: PublicKey }>;
  poolsLoading: boolean;
  refreshPools: () => void;
}) {
  const { solanaPublicKey } = useCloakCraft();
  
  // Admin hooks
  const { initialize, isInitializing, error: initError } = useInitializePerpsPool();
  const { addToken, isAdding: isAddingToken, error: addTokenError } = useAddPerpsToken();
  const { addMarket, isAdding: isAddingMarket, error: addMarketError } = useAddPerpsMarket();
  const { updateConfig, isUpdating, error: updateError } = useUpdatePerpsPoolConfig();

  // Initialize pool form state
  const [showInitForm, setShowInitForm] = useState(false);
  const [initPoolId, setInitPoolId] = useState('');
  const [initMaxLeverage, setInitMaxLeverage] = useState('100');
  const [initPositionFeeBps, setInitPositionFeeBps] = useState('10');
  const [initMaxUtilizationBps, setInitMaxUtilizationBps] = useState('8000');
  const [initLiquidationThresholdBps, setInitLiquidationThresholdBps] = useState('500');
  const [initLiquidationPenaltyBps, setInitLiquidationPenaltyBps] = useState('200');
  const [initBaseBorrowRateBps, setInitBaseBorrowRateBps] = useState('100');

  // Add token form state
  const [showAddTokenForm, setShowAddTokenForm] = useState(false);
  const [selectedPoolForToken, setSelectedPoolForToken] = useState<string>('');
  const [tokenMint, setTokenMint] = useState('');
  const [pythFeedId, setPythFeedId] = useState('');

  // Add market form state
  const [showAddMarketForm, setShowAddMarketForm] = useState(false);
  const [selectedPoolForMarket, setSelectedPoolForMarket] = useState<string>('');
  const [marketId, setMarketId] = useState('');
  const [baseTokenIndex, setBaseTokenIndex] = useState('0');
  const [quoteTokenIndex, setQuoteTokenIndex] = useState('1');
  const [maxPositionSize, setMaxPositionSize] = useState('1000000000000'); // 1M with 6 decimals

  // Update config form state
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [selectedPoolForUpdate, setSelectedPoolForUpdate] = useState<string>('');
  const [updateMaxLeverage, setUpdateMaxLeverage] = useState('');
  const [updatePositionFeeBps, setUpdatePositionFeeBps] = useState('');
  const [updateMaxUtilizationBps, setUpdateMaxUtilizationBps] = useState('');
  const [updateIsActive, setUpdateIsActive] = useState<boolean | null>(null);

  // Handle initialize pool
  const handleInitializePool = async () => {
    if (!initPoolId) {
      toast.error('Pool ID is required');
      return;
    }

    try {
      const poolIdPubkey = new PublicKey(initPoolId);
      const result = await initialize({
        poolId: poolIdPubkey,
        maxLeverage: parseInt(initMaxLeverage),
        positionFeeBps: parseInt(initPositionFeeBps),
        maxUtilizationBps: parseInt(initMaxUtilizationBps),
        liquidationThresholdBps: parseInt(initLiquidationThresholdBps),
        liquidationPenaltyBps: parseInt(initLiquidationPenaltyBps),
        baseBorrowRateBps: parseInt(initBaseBorrowRateBps),
      });

      if (result) {
        toast.success('Pool initialized successfully!');
        setShowInitForm(false);
        setInitPoolId('');
        refreshPools();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to initialize pool');
    }
  };

  // Handle add token
  const handleAddToken = async () => {
    if (!selectedPoolForToken || !tokenMint || !pythFeedId) {
      toast.error('All fields are required');
      return;
    }

    try {
      // Convert hex string to Uint8Array for Pyth feed ID
      const feedIdBytes = new Uint8Array(
        pythFeedId.replace('0x', '').match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );

      const result = await addToken({
        perpsPool: new PublicKey(selectedPoolForToken),
        tokenMint: new PublicKey(tokenMint),
        pythFeedId: feedIdBytes,
      });

      if (result) {
        toast.success('Token added successfully!');
        setShowAddTokenForm(false);
        setTokenMint('');
        setPythFeedId('');
        refreshPools();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add token');
    }
  };

  // Handle add market
  const handleAddMarket = async () => {
    if (!selectedPoolForMarket || !marketId) {
      toast.error('All fields are required');
      return;
    }

    try {
      // Convert market ID string to bytes (padded to 32 bytes)
      const marketIdBytes = new Uint8Array(32);
      const encoder = new TextEncoder();
      const encoded = encoder.encode(marketId);
      marketIdBytes.set(encoded.slice(0, 32));

      const result = await addMarket({
        perpsPool: new PublicKey(selectedPoolForMarket),
        marketId: marketIdBytes,
        baseTokenIndex: parseInt(baseTokenIndex),
        quoteTokenIndex: parseInt(quoteTokenIndex),
        maxPositionSize: BigInt(maxPositionSize),
      });

      if (result) {
        toast.success('Market added successfully!');
        setShowAddMarketForm(false);
        setMarketId('');
        refreshPools();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add market');
    }
  };

  // Handle update config
  const handleUpdateConfig = async () => {
    if (!selectedPoolForUpdate) {
      toast.error('Select a pool');
      return;
    }

    try {
      const result = await updateConfig({
        perpsPool: new PublicKey(selectedPoolForUpdate),
        maxLeverage: updateMaxLeverage ? parseInt(updateMaxLeverage) : undefined,
        positionFeeBps: updatePositionFeeBps ? parseInt(updatePositionFeeBps) : undefined,
        maxUtilizationBps: updateMaxUtilizationBps ? parseInt(updateMaxUtilizationBps) : undefined,
        isActive: updateIsActive !== null ? updateIsActive : undefined,
      });

      if (result) {
        toast.success('Pool config updated!');
        setShowUpdateForm(false);
        refreshPools();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update config');
    }
  };

  // Check if user is admin (has Solana wallet connected)
  if (!solanaPublicKey) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <div>
              <p className="font-medium">Wallet required</p>
              <p className="text-sm">
                Connect your Solana wallet to access admin functions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pool Administration</CardTitle>
              <CardDescription>
                Manage perpetual futures pools, tokens, and markets
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshPools}
              disabled={poolsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${poolsLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowInitForm(!showInitForm)}
              className="justify-start"
            >
              <Plus className="h-4 w-4 mr-2" />
              Initialize Pool
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddTokenForm(!showAddTokenForm)}
              disabled={pools.length === 0}
              className="justify-start"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Token
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddMarketForm(!showAddMarketForm)}
              disabled={pools.length === 0}
              className="justify-start"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Market
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowUpdateForm(!showUpdateForm)}
              disabled={pools.length === 0}
              className="justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Update Config
            </Button>
          </div>

          {/* Initialize Pool Form */}
          {showInitForm && (
            <div className="rounded-lg border p-4 space-y-4">
              <h4 className="font-medium">Initialize New Pool</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Pool ID (PublicKey)</Label>
                  <Input
                    placeholder="Enter pool ID public key"
                    value={initPoolId}
                    onChange={(e) => setInitPoolId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate a new keypair and use its public key as the pool ID
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Max Leverage</Label>
                    <Input
                      type="number"
                      value={initMaxLeverage}
                      onChange={(e) => setInitMaxLeverage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position Fee (bps)</Label>
                    <Input
                      type="number"
                      value={initPositionFeeBps}
                      onChange={(e) => setInitPositionFeeBps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Utilization (bps)</Label>
                    <Input
                      type="number"
                      value={initMaxUtilizationBps}
                      onChange={(e) => setInitMaxUtilizationBps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Liq. Threshold (bps)</Label>
                    <Input
                      type="number"
                      value={initLiquidationThresholdBps}
                      onChange={(e) => setInitLiquidationThresholdBps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Liq. Penalty (bps)</Label>
                    <Input
                      type="number"
                      value={initLiquidationPenaltyBps}
                      onChange={(e) => setInitLiquidationPenaltyBps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Base Borrow Rate (bps)</Label>
                    <Input
                      type="number"
                      value={initBaseBorrowRateBps}
                      onChange={(e) => setInitBaseBorrowRateBps(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleInitializePool}
                  disabled={isInitializing || !initPoolId}
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    'Initialize Pool'
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setShowInitForm(false)}>
                  Cancel
                </Button>
              </div>
              {initError && (
                <p className="text-sm text-destructive">{initError}</p>
              )}
            </div>
          )}

          {/* Add Token Form */}
          {showAddTokenForm && (
            <div className="rounded-lg border p-4 space-y-4">
              <h4 className="font-medium">Add Token to Pool</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Pool</Label>
                  <Select
                    value={selectedPoolForToken}
                    onValueChange={setSelectedPoolForToken}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {pools.map((pool) => (
                        <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                          Pool {pool.address.toBase58().slice(0, 8)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Token Mint</Label>
                  <Select
                    value={tokenMint}
                    onValueChange={setTokenMint}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_TOKENS.map((token) => (
                        <SelectItem key={token.mint.toBase58()} value={token.mint.toBase58()}>
                          {token.symbol} - {token.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pyth Feed ID (hex)</Label>
                  <Input
                    placeholder="0x..."
                    value={pythFeedId}
                    onChange={(e) => setPythFeedId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Get feed IDs from{' '}
                    <a
                      href="https://pyth.network/developers/price-feed-ids"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Pyth Network
                    </a>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddToken}
                  disabled={isAddingToken || !selectedPoolForToken || !tokenMint || !pythFeedId}
                >
                  {isAddingToken ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Token'
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setShowAddTokenForm(false)}>
                  Cancel
                </Button>
              </div>
              {addTokenError && (
                <p className="text-sm text-destructive">{addTokenError}</p>
              )}
            </div>
          )}

          {/* Add Market Form */}
          {showAddMarketForm && (
            <div className="rounded-lg border p-4 space-y-4">
              <h4 className="font-medium">Add Market to Pool</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Pool</Label>
                  <Select
                    value={selectedPoolForMarket}
                    onValueChange={setSelectedPoolForMarket}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {pools.map((pool) => (
                        <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                          Pool {pool.address.toBase58().slice(0, 8)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Market ID</Label>
                  <Input
                    placeholder="e.g., SOL-USDC-PERP"
                    value={marketId}
                    onChange={(e) => setMarketId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Base Token Index</Label>
                    <Input
                      type="number"
                      value={baseTokenIndex}
                      onChange={(e) => setBaseTokenIndex(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quote Token Index</Label>
                    <Input
                      type="number"
                      value={quoteTokenIndex}
                      onChange={(e) => setQuoteTokenIndex(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Max Position Size</Label>
                  <Input
                    type="text"
                    value={maxPositionSize}
                    onChange={(e) => setMaxPositionSize(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    In base units (e.g., 1000000000000 for 1M with 6 decimals)
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddMarket}
                  disabled={isAddingMarket || !selectedPoolForMarket || !marketId}
                >
                  {isAddingMarket ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    'Add Market'
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setShowAddMarketForm(false)}>
                  Cancel
                </Button>
              </div>
              {addMarketError && (
                <p className="text-sm text-destructive">{addMarketError}</p>
              )}
            </div>
          )}

          {/* Update Config Form */}
          {showUpdateForm && (
            <div className="rounded-lg border p-4 space-y-4">
              <h4 className="font-medium">Update Pool Configuration</h4>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Pool</Label>
                  <Select
                    value={selectedPoolForUpdate}
                    onValueChange={(value) => {
                      setSelectedPoolForUpdate(value);
                      const pool = pools.find(p => p.address.toBase58() === value);
                      if (pool) {
                        setUpdateMaxLeverage(pool.maxLeverage.toString());
                        setUpdatePositionFeeBps(pool.positionFeeBps?.toString() || '');
                        setUpdateMaxUtilizationBps(pool.maxUtilizationBps?.toString() || '');
                        setUpdateIsActive(pool.isActive ?? true);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pool" />
                    </SelectTrigger>
                    <SelectContent>
                      {pools.map((pool) => (
                        <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                          Pool {pool.address.toBase58().slice(0, 8)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Max Leverage</Label>
                    <Input
                      type="number"
                      placeholder="Leave empty to keep current"
                      value={updateMaxLeverage}
                      onChange={(e) => setUpdateMaxLeverage(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Position Fee (bps)</Label>
                    <Input
                      type="number"
                      placeholder="Leave empty to keep current"
                      value={updatePositionFeeBps}
                      onChange={(e) => setUpdatePositionFeeBps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Utilization (bps)</Label>
                    <Input
                      type="number"
                      placeholder="Leave empty to keep current"
                      value={updateMaxUtilizationBps}
                      onChange={(e) => setUpdateMaxUtilizationBps(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pool Active</Label>
                    <Select
                      value={updateIsActive === null ? '' : updateIsActive.toString()}
                      onValueChange={(v) => setUpdateIsActive(v === '' ? null : v === 'true')}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Keep current" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Keep current</SelectItem>
                        <SelectItem value="true">Active</SelectItem>
                        <SelectItem value="false">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUpdateConfig}
                  disabled={isUpdating || !selectedPoolForUpdate}
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Config'
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setShowUpdateForm(false)}>
                  Cancel
                </Button>
              </div>
              {updateError && (
                <p className="text-sm text-destructive">{updateError}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Existing Pools Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Existing Pools</CardTitle>
          <CardDescription>
            {pools.length} pool(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {poolsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pools.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No pools found. Initialize a new pool to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pools.map((pool) => (
                <PoolCard key={pool.address.toBase58()} pool={pool} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Pool card component for displaying pool info
function PoolCard({ pool }: { pool: PerpsPoolState & { address: PublicKey } }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { markets, isLoading: marketsLoading } = usePerpsMarkets(pool.address);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={pool.isActive ? 'default' : 'secondary'}>
            {pool.isActive ? 'Active' : 'Inactive'}
          </Badge>
          <span className="font-mono text-sm">
            {pool.address.toBase58().slice(0, 8)}...{pool.address.toBase58().slice(-8)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={getExplorerAddressUrl(pool.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1"
          >
            Explorer
            <ExternalLink className="h-3 w-3" />
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? 'Hide' : 'Details'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-muted-foreground">Max Leverage</p>
          <p className="font-medium">{pool.maxLeverage}x</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tokens</p>
          <p className="font-medium">{pool.numTokens}</p>
        </div>
        <div>
          <p className="text-muted-foreground">LP Supply</p>
          <p className="font-medium">{formatAmount(pool.lpSupply, 6)}</p>
        </div>
      </div>

      {isExpanded && (
        <div className="pt-3 border-t space-y-3">
          {/* Pool Config */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Position Fee</p>
              <p className="font-medium">{pool.positionFeeBps || 0} bps</p>
            </div>
            <div>
              <p className="text-muted-foreground">Max Utilization</p>
              <p className="font-medium">{(pool.maxUtilizationBps || 0) / 100}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Liq. Threshold</p>
              <p className="font-medium">{(pool.liquidationThresholdBps || 0) / 100}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Liq. Penalty</p>
              <p className="font-medium">{(pool.liquidationPenaltyBps || 0) / 100}%</p>
            </div>
          </div>

          {/* Tokens */}
          <div>
            <p className="text-sm font-medium mb-2">Tokens</p>
            <div className="space-y-2">
              {pool.tokens.slice(0, pool.numTokens).map((token, idx) => {
                const tokenInfo = SUPPORTED_TOKENS.find(t => t.mint.equals(token.mint));
                return (
                  <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                    <span>{tokenInfo?.symbol || token.mint.toBase58().slice(0, 8)}</span>
                    <span className="text-muted-foreground">
                      Balance: {formatAmount(token.balance, tokenInfo?.decimals || 6)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Markets */}
          <div>
            <p className="text-sm font-medium mb-2">
              Markets {marketsLoading && <Loader2 className="h-3 w-3 animate-spin inline ml-1" />}
            </p>
            {markets.length === 0 ? (
              <p className="text-sm text-muted-foreground">No markets configured</p>
            ) : (
              <div className="space-y-2">
                {markets.map((market, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                    <span className="font-mono">{market.address.toBase58().slice(0, 8)}...</span>
                    <span className="text-muted-foreground">
                      Base: {market.baseTokenIndex} / Quote: {market.quoteTokenIndex}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
