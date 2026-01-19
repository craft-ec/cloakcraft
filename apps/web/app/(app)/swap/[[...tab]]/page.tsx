'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PublicKey, Keypair } from '@solana/web3.js';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import {
  useSwap,
  useAmmPools,
  useSwapQuote,
  useNoteSelector,
  useCloakCraft,
  useInitializeAmmPool,
  useAddLiquidity,
  useRemoveLiquidity,
  useTokenBalances,
  useShouldConsolidate,
  useProtocolFees,
  useConsolidation,
} from '@cloakcraft/hooks';
import {
  calculateAddLiquidityAmounts,
  calculateRemoveLiquidityOutput,
  calculatePriceRatio,
  PoolType,
} from '@cloakcraft/sdk';
import {
  ArrowDownUp,
  AlertCircle,
  Loader2,
  RefreshCw,
  Plus,
  Droplets,
  Minus,
  TrendingUp,
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
import { SUPPORTED_TOKENS, TokenInfo, getTokenInfo } from '@/lib/constants';
import { formatAmount, parseAmount } from '@/lib/utils';
import type { AmmPoolState } from '@cloakcraft/sdk';

const VALID_TABS = ['swap', 'create', 'add', 'remove'] as const;
type TabValue = typeof VALID_TABS[number];

export default function SwapPage() {
  const params = useParams();
  const router = useRouter();

  // Get tab from URL path (e.g., /swap/create -> 'create')
  const tabFromPath = params.tab?.[0] as string | undefined;
  const currentTab: TabValue = VALID_TABS.includes(tabFromPath as TabValue)
    ? (tabFromPath as TabValue)
    : 'swap';

  const handleTabChange = useCallback((value: string) => {
    router.push(`/swap/${value}`);
  }, [router]);

  const { publicKey } = useSolanaWallet();
  const { isConnected: isStealthConnected, isProgramReady, isProverReady, notes } = useCloakCraft();

  if (!isStealthConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Swap</h1>
          <p className="text-muted-foreground">Swap tokens and manage AMM liquidity.</p>
        </div>

        <Card className="max-w-lg mx-auto">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Stealth wallet required</p>
                <p className="text-sm">
                  Create a stealth wallet to use swap features. Click the "Stealth Wallet" button
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
        <h1 className="text-2xl font-semibold">Swap</h1>
        <p className="text-muted-foreground">Swap tokens and manage AMM liquidity.</p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="max-w-lg mx-auto">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="swap" className="gap-1 xs:gap-2 px-2 xs:px-3">
            <ArrowDownUp className="h-4 w-4" />
            <span className="hidden xs:inline">Swap</span>
          </TabsTrigger>
          <TabsTrigger value="create" className="gap-1 xs:gap-2 px-2 xs:px-3">
            <Plus className="h-4 w-4" />
            <span className="hidden xs:inline">Create</span>
          </TabsTrigger>
          <TabsTrigger value="add" className="gap-1 xs:gap-2 px-2 xs:px-3">
            <Droplets className="h-4 w-4" />
            <span className="hidden xs:inline">Add</span>
          </TabsTrigger>
          <TabsTrigger value="remove" className="gap-1 xs:gap-2 px-2 xs:px-3">
            <Minus className="h-4 w-4" />
            <span className="hidden xs:inline">Remove</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="swap">
          <SwapTab
            publicKey={publicKey}
            isProgramReady={isProgramReady}
            isProverReady={isProverReady}
            notes={notes}
          />
        </TabsContent>

        <TabsContent value="create">
          <CreatePoolTab isProgramReady={isProgramReady} walletPublicKey={publicKey} />
        </TabsContent>

        <TabsContent value="add">
          <AddLiquidityTab
            isProgramReady={isProgramReady}
            isProverReady={isProverReady}
            notes={notes}
          />
        </TabsContent>

        <TabsContent value="remove">
          <RemoveLiquidityTab
            isProgramReady={isProgramReady}
            isProverReady={isProverReady}
            notes={notes}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========================================
// Pool Rate Card with Graph
// ========================================

function PoolRateCard({
  pool,
  swapDirection,
  swapAmount,
}: {
  pool: AmmPoolState & { address: PublicKey };
  swapDirection: 'aToB' | 'bToA';
  swapAmount: bigint;
}) {
  const tokenAInfo = useMemo(() => getTokenInfo(pool.tokenAMint), [pool.tokenAMint]);
  const tokenBInfo = useMemo(() => getTokenInfo(pool.tokenBMint), [pool.tokenBMint]);

  // Calculate exchange rates
  const rateAtoB = useMemo(() => {
    if (pool.reserveA === 0n || pool.reserveB === 0n) return 0;
    const decimalsA = tokenAInfo?.decimals ?? 9;
    const decimalsB = tokenBInfo?.decimals ?? 9;
    // Rate: how many B per 1 A
    const rateRaw = (Number(pool.reserveB) / Number(pool.reserveA));
    // Adjust for decimal differences
    const decimalAdjust = Math.pow(10, decimalsA - decimalsB);
    return rateRaw * decimalAdjust;
  }, [pool.reserveA, pool.reserveB, tokenAInfo, tokenBInfo]);

  const rateBtoA = useMemo(() => {
    if (rateAtoB === 0) return 0;
    return 1 / rateAtoB;
  }, [rateAtoB]);

  // StableSwap helper: calculate D (invariant) using Newton-Raphson
  const getStableSwapD = (x: number, y: number, amp: number): number => {
    const sum = x + y;
    if (sum === 0) return 0;
    const ann = amp * 4; // A * n^n where n=2
    let d = sum;
    for (let i = 0; i < 255; i++) {
      const dP = (d * d * d) / (4 * x * y);
      const dPrev = d;
      d = ((ann * sum + dP * 2) * d) / ((ann - 1) * d + dP * 3);
      if (Math.abs(d - dPrev) <= 1) return d;
    }
    return d;
  };

  // StableSwap helper: calculate y given x and D
  const getStableSwapY = (x: number, d: number, amp: number): number => {
    const ann = amp * 4;
    const c = (d * d * d) / (4 * x * ann);
    const b = x + d / ann;
    let y = d;
    for (let i = 0; i < 255; i++) {
      const yPrev = y;
      y = (y * y + c) / (2 * y + b - d);
      if (Math.abs(y - yPrev) <= 1) return y;
    }
    return y;
  };

  // Calculate price curve points for the graph
  const curveData = useMemo(() => {
    const k = Number(pool.reserveA) * Number(pool.reserveB);
    if (k === 0) return [];

    const currentReserveA = Number(pool.reserveA);
    const currentReserveB = Number(pool.reserveB);
    const isStableSwap = pool.poolType === PoolType.StableSwap;
    const amp = isStableSwap ? Number(pool.amplification ?? 200n) : 0;
    const d = isStableSwap ? getStableSwapD(currentReserveA, currentReserveB, amp) : 0;

    // Generate points around current reserves (50% to 200%)
    const points: { x: number; y: number; isCurrent: boolean; isSwap?: boolean }[] = [];
    const minX = currentReserveA * 0.3;
    const maxX = currentReserveA * 2.5;
    const steps = 50;

    for (let i = 0; i <= steps; i++) {
      const x = minX + (maxX - minX) * (i / steps);
      // Use appropriate formula based on pool type
      const y = isStableSwap ? getStableSwapY(x, d, amp) : k / x;
      points.push({
        x,
        y,
        isCurrent: Math.abs(x - currentReserveA) < (maxX - minX) / steps,
      });
    }

    // Add swap point if there's a swap amount
    if (swapAmount > 0n) {
      const swapAmountNum = Number(swapAmount);
      let newReserveA: number;
      let newReserveB: number;

      if (swapDirection === 'aToB') {
        newReserveA = currentReserveA + swapAmountNum;
        newReserveB = isStableSwap ? getStableSwapY(newReserveA, d, amp) : k / newReserveA;
      } else {
        newReserveB = currentReserveB + swapAmountNum;
        newReserveA = isStableSwap ? getStableSwapY(newReserveB, d, amp) : k / newReserveB;
      }

      // Find and mark the swap point
      const swapPointIndex = points.findIndex(p =>
        (swapDirection === 'aToB' && p.x >= newReserveA) ||
        (swapDirection === 'bToA' && p.x <= newReserveA)
      );
      if (swapPointIndex !== -1) {
        points[swapPointIndex] = {
          x: newReserveA,
          y: newReserveB,
          isCurrent: false,
          isSwap: true,
        };
      }
    }

    return points;
  }, [pool.reserveA, pool.reserveB, pool.poolType, pool.amplification, swapAmount, swapDirection]);

  // SVG dimensions
  const width = 280;
  const height = 140;
  const padding = 20;

  // Scale points to SVG coordinates
  const scaledPoints = useMemo(() => {
    if (curveData.length === 0) return [];

    const xValues = curveData.map(p => p.x);
    const yValues = curveData.map(p => p.y);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);

    // Prevent division by zero (happens with bad pool data)
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;

    return curveData.map(p => ({
      ...p,
      svgX: padding + ((p.x - minX) / rangeX) * (width - 2 * padding),
      svgY: height - padding - ((p.y - minY) / rangeY) * (height - 2 * padding),
    }));
  }, [curveData]);

  const pathD = useMemo(() => {
    if (scaledPoints.length === 0) return '';
    return scaledPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.svgX} ${p.svgY}`)
      .join(' ');
  }, [scaledPoints]);

  const currentPoint = scaledPoints.find(p => p.isCurrent);
  const swapPoint = scaledPoints.find(p => p.isSwap);

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      {/* Exchange Rates */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          Exchange Rate
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">1 {tokenAInfo?.symbol} = </span>
            <span className="font-mono font-medium">
              {rateAtoB > 0 ? rateAtoB.toFixed(6) : '—'} {tokenBInfo?.symbol}
            </span>
          </div>
          <div className="rounded bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">1 {tokenBInfo?.symbol} = </span>
            <span className="font-mono font-medium">
              {rateBtoA > 0 ? rateBtoA.toFixed(6) : '—'} {tokenAInfo?.symbol}
            </span>
          </div>
        </div>
      </div>

      {/* Pool Reserves */}
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">Pool Reserves</div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">{tokenAInfo?.symbol}</span>
            <span className="font-mono">
              {formatAmount(pool.reserveA, tokenAInfo?.decimals ?? 9)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded bg-muted/50 px-3 py-2">
            <span className="text-muted-foreground">{tokenBInfo?.symbol}</span>
            <span className="font-mono">
              {formatAmount(pool.reserveB, tokenBInfo?.decimals ?? 9)}
            </span>
          </div>
        </div>
      </div>

      {/* Pool Type Badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          pool.poolType === PoolType.StableSwap
            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        }`}>
          {pool.poolType === PoolType.StableSwap ? 'StableSwap' : 'Constant Product'}
        </span>
        {pool.poolType === PoolType.StableSwap && pool.amplification && (
          <span className="text-xs text-muted-foreground">
            A = {pool.amplification.toString()}
          </span>
        )}
      </div>

      {/* Price Curve Graph */}
      <div className="space-y-2">
        <div className="text-sm text-muted-foreground">
          Price Curve {pool.poolType === PoolType.StableSwap ? '(StableSwap)' : '(x·y = k)'}
        </div>
        <div className="rounded bg-muted/30 p-2">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto"
          >
            {/* Grid lines */}
            <line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />
            <line
              x1={padding}
              y1={padding}
              x2={padding}
              y2={height - padding}
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={1}
            />

            {/* Curve */}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Current position marker */}
            {currentPoint && (
              <g>
                <circle
                  cx={currentPoint.svgX}
                  cy={currentPoint.svgY}
                  r={6}
                  fill="hsl(var(--primary))"
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={currentPoint.svgX}
                  y={currentPoint.svgY - 12}
                  textAnchor="middle"
                  fontSize={10}
                  fill="currentColor"
                  className="font-medium"
                >
                  Current
                </text>
              </g>
            )}

            {/* Swap position marker */}
            {swapPoint && swapAmount > 0n && (
              <g>
                {/* Line from current to swap */}
                {currentPoint && (
                  <line
                    x1={currentPoint.svgX}
                    y1={currentPoint.svgY}
                    x2={swapPoint.svgX}
                    y2={swapPoint.svgY}
                    stroke="hsl(var(--destructive))"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                  />
                )}
                <circle
                  cx={swapPoint.svgX}
                  cy={swapPoint.svgY}
                  r={5}
                  fill="hsl(var(--destructive))"
                  stroke="white"
                  strokeWidth={2}
                />
                <text
                  x={swapPoint.svgX}
                  y={swapPoint.svgY + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="hsl(var(--destructive))"
                  className="font-medium"
                >
                  After
                </text>
              </g>
            )}

            {/* Axis labels */}
            <text
              x={width / 2}
              y={height - 4}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              className="text-muted-foreground"
            >
              {tokenAInfo?.symbol} Reserve
            </text>
            <text
              x={8}
              y={height / 2}
              textAnchor="middle"
              fontSize={9}
              fill="currentColor"
              className="text-muted-foreground"
              transform={`rotate(-90, 8, ${height / 2})`}
            >
              {tokenBInfo?.symbol} Reserve
            </text>
          </svg>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {pool.poolType === PoolType.StableSwap
            ? 'StableSwap AMM: optimized for pegged assets with low slippage'
            : 'Constant product AMM: larger trades have more price impact'}
        </p>
      </div>
    </div>
  );
}

function SwapTab({
  publicKey,
  isProgramReady,
  isProverReady,
  notes,
}: {
  publicKey: PublicKey | null;
  isProgramReady: boolean;
  isProverReady: boolean;
  notes: any[];
}) {
  const { client, sync } = useCloakCraft();
  const { pools, isLoading: poolsLoading, refresh: refreshPools } = useAmmPools();
  const { swap, isSwapping, error: swapError } = useSwap();
  const { config: protocolFees } = useProtocolFees();

  const [selectedPool, setSelectedPool] = useState<(AmmPoolState & { address: PublicKey }) | null>(null);
  const [swapDirection, setSwapDirection] = useState<'aToB' | 'bToA'>('aToB');
  const [amount, setAmount] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<TransactionStep[]>([]);
  const [overlayStatus, setOverlayStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();

  // Get token info for selected pool
  const inputToken = useMemo(() => {
    if (!selectedPool) return null;
    const mint = swapDirection === 'aToB' ? selectedPool.tokenAMint : selectedPool.tokenBMint;
    return getTokenInfo(mint) || { symbol: mint.toBase58().slice(0, 6), decimals: 9, mint, name: 'Unknown' };
  }, [selectedPool, swapDirection]);

  const outputToken = useMemo(() => {
    if (!selectedPool) return null;
    const mint = swapDirection === 'aToB' ? selectedPool.tokenBMint : selectedPool.tokenAMint;
    return getTokenInfo(mint) || { symbol: mint.toBase58().slice(0, 6), decimals: 9, mint, name: 'Unknown' };
  }, [selectedPool, swapDirection]);

  // Note selector for input token
  const { totalAvailable, selectNotesForAmount, getSelectionResult } = useNoteSelector(
    inputToken?.mint || SUPPORTED_TOKENS[0]?.mint
  );

  const shouldConsolidate = useShouldConsolidate(inputToken?.mint || SUPPORTED_TOKENS[0]?.mint);
  const { consolidate, isConsolidating } = useConsolidation({ tokenMint: inputToken?.mint || SUPPORTED_TOKENS[0]?.mint });

  // Parse amount
  const parsedAmount = useMemo(() => {
    if (!amount || !inputToken) return 0n;
    try {
      return parseAmount(amount, inputToken.decimals);
    } catch {
      return 0n;
    }
  }, [amount, inputToken]);

  // Fee calculation for display - protocol takes swapFeeShareBps% of pool's LP fee
  const effectiveSwapFeeBps = useMemo(() => {
    const poolFeeBps = selectedPool?.feeBps ?? 30;
    const protocolShareBps = protocolFees?.swapFeeShareBps ?? 2000;
    return Math.floor((poolFeeBps * protocolShareBps) / 10000);
  }, [selectedPool?.feeBps, protocolFees?.swapFeeShareBps]);

  const feeBreakdown = useFeeBreakdown({
    amount: parsedAmount,
    feeRateBps: effectiveSwapFeeBps,
    feesEnabled: protocolFees?.feesEnabled ?? true,
    symbol: inputToken?.symbol ?? '',
    decimals: inputToken?.decimals ?? 9,
  });

  // Get swap quote
  const quote = useSwapQuote(selectedPool, swapDirection, parsedAmount);

  // Select pool when pools load
  useEffect(() => {
    if (pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  // Tokens with private balance for input selection
  const tokensWithPrivateBalance = useMemo(() => {
    const balanceMap = new Map<string, bigint>();
    for (const note of notes) {
      if (note.tokenMint) {
        const mintStr = note.tokenMint.toBase58();
        const current = balanceMap.get(mintStr) ?? 0n;
        balanceMap.set(mintStr, current + note.amount);
      }
    }
    return balanceMap;
  }, [notes]);

  // Check if user has balance for selected input token
  const hasInputBalance = useMemo(() => {
    if (!inputToken) return false;
    const balance = tokensWithPrivateBalance.get(inputToken.mint.toBase58()) ?? 0n;
    return balance > 0n;
  }, [inputToken, tokensWithPrivateBalance]);

  // Validation
  const validationError = useMemo(() => {
    if (!selectedPool) return 'Select a pool';
    if (!hasInputBalance) return 'No private balance for input token';
    if (!amount || parsedAmount === 0n) return 'Enter an amount';
    if (parsedAmount > totalAvailable) return 'Insufficient private balance';
    if (!quote) return 'Unable to calculate output';
    return null;
  }, [selectedPool, hasInputBalance, amount, parsedAmount, totalAvailable, quote]);

  const canSubmit =
    !validationError &&
    isProgramReady &&
    isProverReady &&
    !isSwapping &&
    overlayStatus !== 'pending' &&
    selectedPool !== null;

  const handleFlipDirection = useCallback(() => {
    setSwapDirection((d) => (d === 'aToB' ? 'bToA' : 'aToB'));
    setAmount('');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedPool || !inputToken || !client) return;

    // Check if consolidation is needed first (maxInputs=1 for swap)
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
      { id: 'prepare', name: 'Preparing swap', description: 'Selecting notes...', status: selectionResult.needsConsolidation ? 'pending' : 'active' },
      { id: 'proof', name: 'Generating proof', description: 'Creating zero-knowledge proof...', status: 'pending' },
      { id: 'submit', name: 'Executing swap', description: 'Approve in wallet...', status: 'pending' },
      { id: 'confirm', name: 'Confirming', description: 'Waiting for confirmation...', status: 'pending' },
    );

    setOverlaySteps(steps);
    setOverlayStatus('pending');
    setShowOverlay(true);
    setTxSignature(undefined);

    try {
      let selectedNotes = selectionResult.notes;

      // If consolidation is needed, call consolidate() once (it handles all batches internally)
      if (selectionResult.needsConsolidation) {
        await consolidate((stage, batchInfo) => {
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
        }, parsedAmount, 1);  // maxInputs=1 for swap

        // Mark consolidation done
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'consolidate-confirm-1' ? { ...s, status: 'completed' } :
          s.id === 'prepare' ? { ...s, status: 'active' } : s
        ));

        // Get fresh notes directly from client (bypasses React state)
        console.log('[Swap] Fetching fresh notes from client after consolidation...');
        client.clearScanCache();
        const freshNotes = await client.scanNotes(inputToken.mint);
        const tokenNotes = freshNotes.filter((n: any) => n.tokenMint.equals(inputToken.mint));
        console.log(`[Swap] Fresh notes for token: ${tokenNotes.length}`);

        if (tokenNotes.length === 0) {
          throw new Error('No notes found after consolidation');
        }

        // For swap, we need a SINGLE note that covers the amount
        const sortedNotes = [...tokenNotes].sort((a: any, b: any) => Number(b.amount - a.amount));
        const singleNote = sortedNotes.find((n: any) => n.amount >= parsedAmount);
        if (!singleNote) {
          throw new Error('No single note large enough after consolidation. Try consolidating more notes.');
        }
        selectedNotes = [singleNote];

        // Also trigger a background sync to update React state
        sync(inputToken.mint, true);
      } else {
        // No consolidation needed, use the original selection
        if (selectionResult.error) {
          throw new Error(selectionResult.error);
        }
        selectedNotes = selectionResult.notes;
      }

      // Use first note as input
      const input = selectedNotes[0];
      if (!input) {
        throw new Error('No notes selected');
      }

      // Start the swap operation with progress callback
      const result = await swap({
        input,
        pool: selectedPool,
        swapDirection,
        swapAmount: parsedAmount,
        slippageBps: 50, // 0.5% slippage
        onProgress: (stage) => {
          if (stage === 'preparing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'active', description: 'Preparing swap...' } : s
            ));
          } else if (stage === 'generating') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'completed' } :
              s.id === 'proof' ? { ...s, status: 'active', description: 'Creating zero-knowledge proof...' } : s
            ));
          } else if (stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'proof' ? { ...s, status: 'active', description: 'Building transactions...' } : s
            ));
          } else if (stage === 'approving') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'proof' ? { ...s, status: 'completed' } :
              s.id === 'submit' ? { ...s, status: 'active', description: 'Approve in wallet...' } : s
            ));
          } else if (stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'active', description: 'Executing transactions...' } : s
            ));
          } else if (stage === 'confirming') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'completed' } :
              s.id === 'confirm' ? { ...s, status: 'active', description: 'Waiting for confirmation...' } : s
            ));
          }
        },
      });

      if (result) {
        // Mark proof and submit as completed, move to confirm
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'proof' ? { ...s, status: 'completed' } :
          s.id === 'submit' ? { ...s, status: 'completed' } :
          s.id === 'confirm' ? { ...s, status: 'active', description: 'Waiting for confirmation...' } : s
        ));

        // Mark all as completed
        setOverlaySteps(prev => prev.map(s => ({
          ...s,
          status: 'completed' as const,
          signature: s.id === 'confirm' ? result.signature : undefined
        })));
        setTxSignature(result.signature);
        setOverlayStatus('success');
        setAmount('');
        toast.success('Swap completed successfully');
      } else {
        throw new Error(swapError || 'Swap failed');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setOverlaySteps(prev => {
        const activeIndex = prev.findIndex(s => s.status === 'active');
        return prev.map((s, i) => i === activeIndex ? { ...s, status: 'error', error: errorMsg } : s);
      });
      setOverlayStatus('error');
    }
  }, [canSubmit, selectedPool, inputToken, parsedAmount, getSelectionResult, consolidate, swap, swapDirection, swapError, client, sync]);

  const handleCloseOverlay = useCallback(() => {
    setShowOverlay(false);
    if (overlayStatus === 'success' || overlayStatus === 'error') {
      setOverlayStatus('idle');
    }
  }, [overlayStatus]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            <CardTitle>Private Swap</CardTitle>
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
        <CardDescription>
          Swap tokens privately through the AMM pool.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {poolsLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading pools...
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No AMM pools available. Create a pool first using the Create tab.
            </p>
          </div>
        ) : (
          <>
            {/* Pool Selection */}
            <div className="space-y-2">
              <Label>Pool</Label>
              <Select
                value={selectedPool?.address.toBase58() || ''}
                onValueChange={(value) => {
                  const pool = pools.find((p) => p.address.toBase58() === value);
                  if (pool) {
                    setSelectedPool(pool);
                    setAmount('');
                  }
                }}
                disabled={isSwapping || overlayStatus === 'pending'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pool" />
                </SelectTrigger>
                <SelectContent>
                  {pools.map((pool) => {
                    const tokenA = getTokenInfo(pool.tokenAMint);
                    const tokenB = getTokenInfo(pool.tokenBMint);
                    const isStable = pool.poolType === PoolType.StableSwap;
                    return (
                      <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                        {tokenA?.symbol || 'Unknown'} / {tokenB?.symbol || 'Unknown'}
                        {isStable ? ' (Stable)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPool && (
              <>
                {/* Consolidation recommendation */}
                {inputToken && shouldConsolidate && (
                  <ConsolidationPrompt
                    tokenMint={inputToken.mint}
                    tokenSymbol={inputToken.symbol}
                    variant="alert"
                  />
                )}

                {/* Input Token */}
                <div className="space-y-2">
                  <Label>From</Label>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium">{inputToken?.symbol}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleFlipDirection}
                        disabled={isSwapping || overlayStatus === 'pending'}
                      >
                        <ArrowDownUp className="h-4 w-4" />
                      </Button>
                    </div>
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
                      disabled={isSwapping || overlayStatus === 'pending'}
                      className="text-xl font-mono"
                    />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Private balance: {inputToken ? formatAmount(totalAvailable, inputToken.decimals) : '0'}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          if (inputToken) {
                            setAmount(formatAmount(totalAvailable, inputToken.decimals));
                          }
                        }}
                        disabled={isSwapping || overlayStatus === 'pending'}
                      >
                        MAX
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Output Token */}
                <div className="space-y-2">
                  <Label>To</Label>
                  <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
                    <span className="text-lg font-medium">{outputToken?.symbol}</span>
                    <p className="text-xl font-mono">
                      {quote && outputToken
                        ? formatAmount(quote.outputAmount, outputToken.decimals)
                        : '0.00'}
                    </p>
                    {quote && (
                      <p className="text-xs text-muted-foreground">
                        Min received: {outputToken ? formatAmount(quote.minOutput, outputToken.decimals) : '0'} (0.5% slippage)
                      </p>
                    )}
                  </div>
                </div>

                {/* Quote Info with Protocol Fee */}
                {quote && parsedAmount > 0n && (
                  <div className="rounded-lg bg-muted p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price Impact</span>
                      <span className={quote.priceImpact > 5 ? 'text-destructive' : ''}>
                        {quote.priceImpact.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pool Fee</span>
                      <span>{selectedPool.feeBps / 100}%</span>
                    </div>
                    {feeBreakdown?.protocolFee && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Protocol Fee</span>
                        <span className="text-orange-500">
                          {feeBreakdown.protocolFee} {inputToken?.symbol}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {!hasInputBalance && (
                  <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
                    <div className="flex items-center gap-2 text-sm text-yellow-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>No private balance for {inputToken?.symbol}. Shield tokens first.</span>
                    </div>
                  </div>
                )}

                {/* Pool Rate Card with Graph - below form */}
                <PoolRateCard
                  pool={selectedPool}
                  swapDirection={swapDirection}
                  swapAmount={parsedAmount}
                />
              </>
            )}
          </>
        )}

        {!isProverReady && (
          <div className="rounded-lg bg-yellow-500/10 p-4 text-sm">
            <p className="text-yellow-600">Loading ZK prover for swaps...</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={!canSubmit || pools.length === 0}
        >
          {isSwapping || overlayStatus === 'pending' ? 'Swapping...' : 'Swap'}
        </Button>
      </CardFooter>

      {/* Transaction Overlay */}
      <TransactionOverlay
        isOpen={showOverlay}
        onClose={handleCloseOverlay}
        title="Private Swap"
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

function CreatePoolTab({
  isProgramReady,
  walletPublicKey,
}: {
  isProgramReady: boolean;
  walletPublicKey: PublicKey | null;
}) {
  const [tokenA, setTokenA] = useState<string>('');
  const [tokenB, setTokenB] = useState<string>('');
  const [feeBps, setFeeBps] = useState('30');
  const [poolType, setPoolType] = useState<'constantProduct' | 'stableSwap'>('constantProduct');
  const [amplification, setAmplification] = useState('200');
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const { initializePool, isInitializing, error: initError } = useInitializeAmmPool();
  const { refresh: refreshPools } = useAmmPools();

  // Get token mints to check balances for
  const tokenMints = useMemo(() => SUPPORTED_TOKENS.map((t) => t.mint), []);
  const { balances: tokenBalanceMap } = useTokenBalances(tokenMints, walletPublicKey ?? undefined);

  // Filter to only tokens the user owns
  const availableTokens = useMemo(() => {
    if (!tokenBalanceMap || tokenBalanceMap.size === 0) return [];
    return SUPPORTED_TOKENS.filter((t) => {
      const balance = tokenBalanceMap.get(t.mint.toBase58());
      return balance && balance > 0n;
    });
  }, [tokenBalanceMap]);

  const validationError = useMemo(() => {
    if (!tokenA) return 'Select token A';
    if (!tokenB) return 'Select token B';
    if (tokenA === tokenB) return 'Tokens must be different';
    const fee = parseInt(feeBps);
    if (isNaN(fee) || fee < 0 || fee > 1000) return 'Fee must be 0-1000 bps';
    if (poolType === 'stableSwap') {
      const amp = parseInt(amplification);
      if (isNaN(amp) || amp < 1 || amp > 10000) return 'Amplification must be 1-10000';
    }
    return null;
  }, [tokenA, tokenB, feeBps, poolType, amplification]);

  const canSubmit = !validationError && isProgramReady && !isInitializing && txStatus !== 'pending';

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    setTxStatus('pending');
    setTxError(undefined);
    setTxSignature(undefined);

    try {
      const tokenAMint = new PublicKey(tokenA);
      const tokenBMint = new PublicKey(tokenB);
      const fee = parseInt(feeBps);
      const amp = parseInt(amplification) || 200;

      const signature = await initializePool(tokenAMint, tokenBMint, fee, poolType, amp);

      if (signature) {
        setTxSignature(signature);
        setTxStatus('success');
        toast.success(`${poolType === 'stableSwap' ? 'StableSwap' : 'Constant Product'} pool created successfully`);
        refreshPools();
      } else {
        setTxStatus('error');
        setTxError(initError || 'Failed to create pool');
      }
    } catch (error) {
      setTxStatus('error');
      setTxError(error instanceof Error ? error.message : 'Unknown error');
    }
  }, [canSubmit, tokenA, tokenB, feeBps, poolType, amplification, initializePool, initError, refreshPools]);

  const handleReset = useCallback(() => {
    setTxStatus('idle');
    setTxSignature(undefined);
    setTxError(undefined);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create Pool
        </CardTitle>
        <CardDescription>
          Initialize a new AMM liquidity pool for a token pair.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {availableTokens.length < 2 ? (
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              You need at least 2 different tokens in your wallet to create a pool.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Token A</Label>
              <Select value={tokenA} onValueChange={setTokenA} disabled={isInitializing || txStatus === 'pending'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {availableTokens.map((token) => (
                    <SelectItem key={token.mint.toBase58()} value={token.mint.toBase58()}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Token B</Label>
              <Select value={tokenB} onValueChange={setTokenB} disabled={isInitializing || txStatus === 'pending'}>
                <SelectTrigger>
                  <SelectValue placeholder="Select token" />
                </SelectTrigger>
                <SelectContent>
                  {availableTokens.filter((t) => t.mint.toBase58() !== tokenA).map((token) => (
                    <SelectItem key={token.mint.toBase58()} value={token.mint.toBase58()}>
                      {token.symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pool Type</Label>
              <Select
                value={poolType}
                onValueChange={(value: 'constantProduct' | 'stableSwap') => setPoolType(value)}
                disabled={isInitializing || txStatus === 'pending'}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="constantProduct">Constant Product (x*y=k)</SelectItem>
                  <SelectItem value="stableSwap">StableSwap (Curve-style)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {poolType === 'stableSwap'
                  ? 'Best for pegged assets (stablecoins). Low slippage near peg.'
                  : 'Best for volatile pairs (e.g., SOL/USDC).'}
              </p>
            </div>

            {poolType === 'stableSwap' && (
              <div className="space-y-2">
                <Label>Amplification (A)</Label>
                <Input
                  type="number"
                  value={amplification}
                  onChange={(e) => setAmplification(e.target.value)}
                  placeholder="200"
                  disabled={isInitializing || txStatus === 'pending'}
                />
                <p className="text-xs text-muted-foreground">
                  Higher = more like constant sum (lower slippage at peg). Typical: 100-1000.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Fee (basis points)</Label>
              <Input
                type="number"
                value={feeBps}
                onChange={(e) => setFeeBps(e.target.value)}
                placeholder={poolType === 'stableSwap' ? '4' : '30'}
                disabled={isInitializing || txStatus === 'pending'}
              />
              <p className="text-xs text-muted-foreground">
                {poolType === 'stableSwap'
                  ? '4 bps = 0.04% (typical for stables)'
                  : '30 bps = 0.3% fee per swap'}
              </p>
            </div>
          </>
        )}

        <TransactionStatus
          status={txStatus}
          signature={txSignature}
          error={txError}
          onReset={handleReset}
        />
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || availableTokens.length < 2}>
          {isInitializing || txStatus === 'pending' ? 'Creating...' : 'Create Pool'}
        </Button>
      </CardFooter>
    </Card>
  );
}

function AddLiquidityTab({
  isProgramReady,
  isProverReady,
  notes,
}: {
  isProgramReady: boolean;
  isProverReady: boolean;
  notes: any[];
}) {
  const { client, sync } = useCloakCraft();
  const { pools, isLoading: poolsLoading, refresh: refreshPools } = useAmmPools();
  const { addLiquidity, isAdding, error: addError } = useAddLiquidity();

  const [selectedPool, setSelectedPool] = useState<(AmmPoolState & { address: PublicKey }) | null>(null);
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  const [lastChanged, setLastChanged] = useState<'A' | 'B' | null>(null);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<TransactionStep[]>([]);
  const [overlayStatus, setOverlayStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();

  const tokenAInfo = useMemo(() => selectedPool ? getTokenInfo(selectedPool.tokenAMint) : null, [selectedPool]);
  const tokenBInfo = useMemo(() => selectedPool ? getTokenInfo(selectedPool.tokenBMint) : null, [selectedPool]);

  const { totalAvailable: balanceA, selectNotesForAmount: selectNotesA, getSelectionResult: getSelectionResultA } = useNoteSelector(
    selectedPool?.tokenAMint || SUPPORTED_TOKENS[0]?.mint
  );
  const { totalAvailable: balanceB, selectNotesForAmount: selectNotesB, getSelectionResult: getSelectionResultB } = useNoteSelector(
    selectedPool?.tokenBMint || SUPPORTED_TOKENS[0]?.mint
  );

  // Consolidation hooks for both tokens
  const shouldConsolidateA = useShouldConsolidate(selectedPool?.tokenAMint || SUPPORTED_TOKENS[0]?.mint);
  const shouldConsolidateB = useShouldConsolidate(selectedPool?.tokenBMint || SUPPORTED_TOKENS[0]?.mint);
  const { consolidate: consolidateA, isConsolidating: isConsolidatingA } = useConsolidation({ tokenMint: selectedPool?.tokenAMint || SUPPORTED_TOKENS[0]?.mint });
  const { consolidate: consolidateB, isConsolidating: isConsolidatingB } = useConsolidation({ tokenMint: selectedPool?.tokenBMint || SUPPORTED_TOKENS[0]?.mint });

  // Check if this is the first deposit (empty pool)
  const isFirstDeposit = useMemo(() => {
    if (!selectedPool) return false;
    return selectedPool.reserveA === 0n && selectedPool.reserveB === 0n;
  }, [selectedPool]);

  // Calculate exchange rate for display
  const exchangeRate = useMemo(() => {
    if (!selectedPool || isFirstDeposit) return null;
    const decimalsA = tokenAInfo?.decimals ?? 9;
    const decimalsB = tokenBInfo?.decimals ?? 9;
    return calculatePriceRatio(selectedPool.reserveA, selectedPool.reserveB, decimalsA, decimalsB);
  }, [selectedPool, isFirstDeposit, tokenAInfo, tokenBInfo]);

  useEffect(() => {
    if (pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  const parsedAmountA = useMemo(() => {
    if (!amountA || !tokenAInfo) return 0n;
    try {
      return parseAmount(amountA, tokenAInfo.decimals);
    } catch {
      return 0n;
    }
  }, [amountA, tokenAInfo]);

  const parsedAmountB = useMemo(() => {
    if (!amountB || !tokenBInfo) return 0n;
    try {
      return parseAmount(amountB, tokenBInfo.decimals);
    } catch {
      return 0n;
    }
  }, [amountB, tokenBInfo]);

  // Auto-calculate the other amount based on pool ratio (for non-empty pools)
  const handleAmountAChange = useCallback((value: string) => {
    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
      setAmountA(value);
      setLastChanged('A');

      // Auto-calculate B if pool has liquidity
      if (!isFirstDeposit && selectedPool && tokenAInfo && tokenBInfo && value && value !== '0') {
        try {
          const parsedA = parseAmount(value, tokenAInfo.decimals);
          if (parsedA > 0n && selectedPool.reserveA > 0n) {
            // Calculate proportional B: amountB = amountA * reserveB / reserveA
            const calculatedB = (parsedA * selectedPool.reserveB) / selectedPool.reserveA;
            setAmountB(formatAmount(calculatedB, tokenBInfo.decimals));
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [isFirstDeposit, selectedPool, tokenAInfo, tokenBInfo]);

  const handleAmountBChange = useCallback((value: string) => {
    if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
      setAmountB(value);
      setLastChanged('B');

      // Auto-calculate A if pool has liquidity
      if (!isFirstDeposit && selectedPool && tokenAInfo && tokenBInfo && value && value !== '0') {
        try {
          const parsedB = parseAmount(value, tokenBInfo.decimals);
          if (parsedB > 0n && selectedPool.reserveB > 0n) {
            // Calculate proportional A: amountA = amountB * reserveA / reserveB
            const calculatedA = (parsedB * selectedPool.reserveA) / selectedPool.reserveB;
            setAmountA(formatAmount(calculatedA, tokenAInfo.decimals));
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [isFirstDeposit, selectedPool, tokenAInfo, tokenBInfo]);

  // Calculate LP tokens and deposit details
  const liquidityCalc = useMemo(() => {
    if (!selectedPool || parsedAmountA === 0n || parsedAmountB === 0n) return null;
    try {
      return calculateAddLiquidityAmounts(
        parsedAmountA,
        parsedAmountB,
        selectedPool.reserveA,
        selectedPool.reserveB,
        selectedPool.lpSupply
      );
    } catch {
      return null;
    }
  }, [selectedPool, parsedAmountA, parsedAmountB]);

  // Pool share calculation
  const poolShare = useMemo(() => {
    if (!liquidityCalc || !selectedPool) return 0;
    const newLpSupply = selectedPool.lpSupply + liquidityCalc.lpAmount;
    if (newLpSupply === 0n) return 100;
    return (Number(liquidityCalc.lpAmount) / Number(newLpSupply)) * 100;
  }, [liquidityCalc, selectedPool]);

  const validationError = useMemo(() => {
    if (!selectedPool) return 'Select a pool';
    if (!amountA || parsedAmountA === 0n) return 'Enter amount A';
    if (!amountB || parsedAmountB === 0n) return 'Enter amount B';
    if (parsedAmountA > balanceA) return 'Insufficient token A balance';
    if (parsedAmountB > balanceB) return 'Insufficient token B balance';
    return null;
  }, [selectedPool, amountA, amountB, parsedAmountA, parsedAmountB, balanceA, balanceB]);

  const canSubmit = !validationError && isProgramReady && isProverReady && !isAdding && overlayStatus !== 'pending';

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedPool || !tokenAInfo || !tokenBInfo || !client) return;

    // Check if consolidation is needed for either token (maxInputs=1 for each)
    let selectionResultA = getSelectionResultA(parsedAmountA, { maxInputs: 1 });
    let selectionResultB = getSelectionResultB(parsedAmountB, { maxInputs: 1 });

    // Build initial steps based on whether consolidation is needed
    const steps: TransactionStep[] = [];

    if (selectionResultA.needsConsolidation) {
      steps.push(
        { id: 'consolidate-a-prepare', name: `Consolidating ${tokenAInfo.symbol}`, description: 'Preparing notes...', status: 'active' },
        { id: 'consolidate-a-execute', name: `Consolidating ${tokenAInfo.symbol}`, description: 'Approve in wallet...', status: 'pending' },
        { id: 'consolidate-a-confirm', name: `Confirming ${tokenAInfo.symbol}`, description: 'Waiting for confirmation...', status: 'pending' },
      );
    }

    if (selectionResultB.needsConsolidation) {
      steps.push(
        { id: 'consolidate-b-prepare', name: `Consolidating ${tokenBInfo.symbol}`, description: 'Preparing notes...', status: selectionResultA.needsConsolidation ? 'pending' : 'active' },
        { id: 'consolidate-b-execute', name: `Consolidating ${tokenBInfo.symbol}`, description: 'Approve in wallet...', status: 'pending' },
        { id: 'consolidate-b-confirm', name: `Confirming ${tokenBInfo.symbol}`, description: 'Waiting for confirmation...', status: 'pending' },
      );
    }

    const hasConsolidation = selectionResultA.needsConsolidation || selectionResultB.needsConsolidation;
    steps.push(
      { id: 'prepare', name: 'Preparing liquidity', description: 'Selecting notes...', status: hasConsolidation ? 'pending' : 'active' },
      { id: 'proof', name: 'Generating proof', description: 'Creating zero-knowledge proof...', status: 'pending' },
      { id: 'submit', name: 'Adding liquidity', description: 'Approve in wallet...', status: 'pending' },
      { id: 'confirm', name: 'Confirming', description: 'Waiting for confirmation...', status: 'pending' },
    );

    setOverlaySteps(steps);
    setOverlayStatus('pending');
    setShowOverlay(true);
    setTxSignature(undefined);

    try {
      let selectedNoteA: any = null;
      let selectedNoteB: any = null;

      // Consolidate token A if needed
      if (selectionResultA.needsConsolidation) {
        await consolidateA((stage, batchInfo) => {
          const batchLabel = batchInfo && batchInfo.total > 1 ? ` (batch ${batchInfo.current}/${batchInfo.total})` : '';
          if (stage === 'generating' || stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-a-prepare' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-a-execute' ? { ...s, status: 'active', description: `Generating proof${batchLabel}...` } : s
            ));
          } else if (stage === 'approving' || stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-a-execute' ? { ...s, status: 'active', description: `Executing${batchLabel}...` } : s
            ));
          } else if (stage === 'confirming' || stage === 'syncing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-a-execute' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-a-confirm' ? { ...s, status: 'active', description: `Confirming${batchLabel}...` } : s
            ));
          }
        }, parsedAmountA, 1);

        // Mark token A consolidation done
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'consolidate-a-confirm' ? { ...s, status: 'completed' } :
          s.id === 'consolidate-b-prepare' ? { ...s, status: 'active' } : s
        ));

        // Fetch fresh notes for token A
        client.clearScanCache();
        const freshNotesA = await client.scanNotes(selectedPool.tokenAMint);
        const tokenNotesA = freshNotesA.filter((n: any) => n.tokenMint.equals(selectedPool.tokenAMint));
        const sortedNotesA = [...tokenNotesA].sort((a: any, b: any) => Number(b.amount - a.amount));
        selectedNoteA = sortedNotesA.find((n: any) => n.amount >= parsedAmountA);
        if (!selectedNoteA) {
          throw new Error(`No single ${tokenAInfo.symbol} note large enough after consolidation.`);
        }
        sync(selectedPool.tokenAMint, true);
      } else {
        selectedNoteA = selectionResultA.notes[0];
      }

      // Consolidate token B if needed
      if (selectionResultB.needsConsolidation) {
        // Update step to show we're starting B consolidation
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'consolidate-b-prepare' ? { ...s, status: 'active' } : s
        ));

        await consolidateB((stage, batchInfo) => {
          const batchLabel = batchInfo && batchInfo.total > 1 ? ` (batch ${batchInfo.current}/${batchInfo.total})` : '';
          if (stage === 'generating' || stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-b-prepare' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-b-execute' ? { ...s, status: 'active', description: `Generating proof${batchLabel}...` } : s
            ));
          } else if (stage === 'approving' || stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-b-execute' ? { ...s, status: 'active', description: `Executing${batchLabel}...` } : s
            ));
          } else if (stage === 'confirming' || stage === 'syncing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-b-execute' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-b-confirm' ? { ...s, status: 'active', description: `Confirming${batchLabel}...` } : s
            ));
          }
        }, parsedAmountB, 1);

        // Mark token B consolidation done
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'consolidate-b-confirm' ? { ...s, status: 'completed' } :
          s.id === 'prepare' ? { ...s, status: 'active' } : s
        ));

        // Fetch fresh notes for token B
        client.clearScanCache();
        const freshNotesB = await client.scanNotes(selectedPool.tokenBMint);
        const tokenNotesB = freshNotesB.filter((n: any) => n.tokenMint.equals(selectedPool.tokenBMint));
        const sortedNotesB = [...tokenNotesB].sort((a: any, b: any) => Number(b.amount - a.amount));
        selectedNoteB = sortedNotesB.find((n: any) => n.amount >= parsedAmountB);
        if (!selectedNoteB) {
          throw new Error(`No single ${tokenBInfo.symbol} note large enough after consolidation.`);
        }
        sync(selectedPool.tokenBMint, true);
      } else {
        selectedNoteB = selectionResultB.notes[0];
      }

      if (!selectedNoteA || !selectedNoteB) {
        throw new Error('Could not select notes');
      }

      // Start the add liquidity operation with progress callback
      const result = await addLiquidity({
        pool: selectedPool,
        inputA: selectedNoteA,
        inputB: selectedNoteB,
        amountA: parsedAmountA,
        amountB: parsedAmountB,
        onProgress: (stage) => {
          if (stage === 'preparing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'active', description: 'Preparing add liquidity...' } : s
            ));
          } else if (stage === 'generating') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'completed' } :
              s.id === 'proof' ? { ...s, status: 'active', description: 'Creating zero-knowledge proof...' } : s
            ));
          } else if (stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'proof' ? { ...s, status: 'active', description: 'Building transactions...' } : s
            ));
          } else if (stage === 'approving') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'proof' ? { ...s, status: 'completed' } :
              s.id === 'submit' ? { ...s, status: 'active', description: 'Approve in wallet...' } : s
            ));
          } else if (stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'active', description: 'Executing transactions...' } : s
            ));
          } else if (stage === 'confirming') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'completed' } :
              s.id === 'confirm' ? { ...s, status: 'active', description: 'Waiting for confirmation...' } : s
            ));
          }
        },
      });

      if (result) {
        // Mark proof and submit as completed, move to confirm
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'proof' ? { ...s, status: 'completed' } :
          s.id === 'submit' ? { ...s, status: 'completed' } :
          s.id === 'confirm' ? { ...s, status: 'active', description: 'Waiting for confirmation...' } : s
        ));

        // Mark all as completed
        setOverlaySteps(prev => prev.map(s => ({
          ...s,
          status: 'completed' as const,
          signature: s.id === 'confirm' ? result.signature : undefined
        })));
        setTxSignature(result.signature);
        setOverlayStatus('success');
        setAmountA('');
        setAmountB('');
        toast.success('Liquidity added successfully');
        refreshPools();
      } else {
        throw new Error(addError || 'Failed to add liquidity');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setOverlaySteps(prev => {
        const activeIndex = prev.findIndex(s => s.status === 'active');
        return prev.map((s, i) => i === activeIndex ? { ...s, status: 'error', error: errorMsg } : s);
      });
      setOverlayStatus('error');
    }
  }, [canSubmit, selectedPool, tokenAInfo, tokenBInfo, parsedAmountA, parsedAmountB, getSelectionResultA, getSelectionResultB, consolidateA, consolidateB, addLiquidity, addError, refreshPools, client, sync]);

  const handleCloseOverlay = useCallback(() => {
    setShowOverlay(false);
    if (overlayStatus === 'success' || overlayStatus === 'error') {
      setOverlayStatus('idle');
    }
  }, [overlayStatus]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            <CardTitle>Add Liquidity</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={refreshPools} disabled={poolsLoading}>
            <RefreshCw className={`h-4 w-4 ${poolsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Add tokens to a pool to earn trading fees.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {poolsLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading pools...
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No pools available. Create a pool first.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Pool</Label>
              <Select
                value={selectedPool?.address.toBase58() || ''}
                onValueChange={(v) => {
                  const pool = pools.find((p) => p.address.toBase58() === v);
                  if (pool) {
                    setSelectedPool(pool);
                    setAmountA('');
                    setAmountB('');
                  }
                }}
                disabled={isAdding || overlayStatus === 'pending'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pool" />
                </SelectTrigger>
                <SelectContent>
                  {pools.map((pool) => {
                    const tA = getTokenInfo(pool.tokenAMint);
                    const tB = getTokenInfo(pool.tokenBMint);
                    const isEmpty = pool.reserveA === 0n && pool.reserveB === 0n;
                    const isStable = pool.poolType === PoolType.StableSwap;
                    return (
                      <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                        {tA?.symbol || 'Unknown'} / {tB?.symbol || 'Unknown'}
                        {isStable ? ' (Stable)' : ''}{isEmpty && ' (Empty)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPool && (
              <>
                {/* First Deposit Notice */}
                {isFirstDeposit && (
                  <div className="rounded-lg border border-blue-500/50 bg-blue-500/10 p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium text-blue-600">First Deposit - You Set the Price</p>
                        <p className="text-sm text-blue-600/80">
                          This pool is empty. Your deposit ratio will set the initial exchange rate between tokens.
                          For example, depositing 100 {tokenAInfo?.symbol} and 1 {tokenBInfo?.symbol} means
                          1 {tokenBInfo?.symbol} = 100 {tokenAInfo?.symbol}.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Token A Input */}
                <div className="space-y-2">
                  <Label>{tokenAInfo?.symbol || 'Token A'} Amount</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountA}
                    onChange={(e) => handleAmountAChange(e.target.value)}
                    disabled={isAdding || overlayStatus === 'pending'}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Private balance: {tokenAInfo ? formatAmount(balanceA, tokenAInfo.decimals) : '0'}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-xs"
                      onClick={() => tokenAInfo && handleAmountAChange(formatAmount(balanceA, tokenAInfo.decimals))}
                      disabled={isAdding || overlayStatus === 'pending'}
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                {/* Token B Input */}
                <div className="space-y-2">
                  <Label>{tokenBInfo?.symbol || 'Token B'} Amount</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amountB}
                    onChange={(e) => handleAmountBChange(e.target.value)}
                    disabled={isAdding || overlayStatus === 'pending'}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Private balance: {tokenBInfo ? formatAmount(balanceB, tokenBInfo.decimals) : '0'}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 px-2 text-xs"
                      onClick={() => tokenBInfo && handleAmountBChange(formatAmount(balanceB, tokenBInfo.decimals))}
                      disabled={isAdding || overlayStatus === 'pending'}
                    >
                      MAX
                    </Button>
                  </div>
                </div>

                {/* Deposit Summary */}
                {liquidityCalc && parsedAmountA > 0n && parsedAmountB > 0n && (
                  <div className="rounded-lg bg-muted p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Deposit Summary</span>
                      <FreeOperationBadge />
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">LP Tokens to Receive</span>
                        <span className="font-mono font-medium">
                          {formatAmount(liquidityCalc.lpAmount, 9)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pool Share</span>
                        <span className="font-medium">{poolShare.toFixed(2)}%</span>
                      </div>
                      {!isFirstDeposit && exchangeRate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Current Rate</span>
                          <span className="font-mono text-xs">
                            1 {tokenAInfo?.symbol} = {exchangeRate.toFixed(6)} {tokenBInfo?.symbol}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Pool Rate Card with Graph */}
                {!isFirstDeposit && (
                  <PoolRateCard
                    pool={selectedPool}
                    swapDirection="aToB"
                    swapAmount={0n}
                  />
                )}
              </>
            )}
          </>
        )}

        {/* Consolidation recommendations */}
        {selectedPool && tokenAInfo && shouldConsolidateA && (
          <ConsolidationPrompt
            tokenMint={selectedPool.tokenAMint}
            tokenSymbol={tokenAInfo.symbol}
            variant="alert"
          />
        )}
        {selectedPool && tokenBInfo && shouldConsolidateB && (
          <ConsolidationPrompt
            tokenMint={selectedPool.tokenBMint}
            tokenSymbol={tokenBInfo.symbol}
            variant="alert"
          />
        )}

        {!isProverReady && (
          <div className="rounded-lg bg-yellow-500/10 p-4 text-sm">
            <p className="text-yellow-600">Loading ZK prover...</p>
          </div>
        )}
      </CardContent>

      <CardFooter>
        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || pools.length === 0}>
          {isAdding || overlayStatus === 'pending' ? 'Adding...' : 'Add Liquidity'}
        </Button>
      </CardFooter>

      {/* Transaction Overlay */}
      <TransactionOverlay
        isOpen={showOverlay}
        onClose={handleCloseOverlay}
        title="Add Liquidity"
        steps={overlaySteps}
        status={overlayStatus}
        finalSignature={txSignature}
        onRetry={handleSubmit}
      />
    </Card>
  );
}

function RemoveLiquidityTab({
  isProgramReady,
  isProverReady,
  notes,
}: {
  isProgramReady: boolean;
  isProverReady: boolean;
  notes: any[];
}) {
  const { client, sync } = useCloakCraft();
  const { pools, isLoading: poolsLoading, refresh: refreshPools } = useAmmPools();
  const { removeLiquidity, isRemoving, error: removeError } = useRemoveLiquidity();
  const { config: protocolFees } = useProtocolFees();

  const [selectedPool, setSelectedPool] = useState<(AmmPoolState & { address: PublicKey }) | null>(null);
  const [amount, setAmount] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlaySteps, setOverlaySteps] = useState<TransactionStep[]>([]);
  const [overlayStatus, setOverlayStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [txSignature, setTxSignature] = useState<string | undefined>();

  const tokenAInfo = useMemo(() => selectedPool ? getTokenInfo(selectedPool.tokenAMint) : null, [selectedPool]);
  const tokenBInfo = useMemo(() => selectedPool ? getTokenInfo(selectedPool.tokenBMint) : null, [selectedPool]);

  const { totalAvailable: lpBalance, selectNotesForAmount: selectLpNotes, getSelectionResult: getSelectionResultLp } = useNoteSelector(
    selectedPool?.lpMint || SUPPORTED_TOKENS[0]?.mint
  );

  // Consolidation for LP tokens
  const shouldConsolidateLp = useShouldConsolidate(selectedPool?.lpMint || SUPPORTED_TOKENS[0]?.mint);
  const { consolidate: consolidateLp, isConsolidating: isConsolidatingLp } = useConsolidation({ tokenMint: selectedPool?.lpMint || SUPPORTED_TOKENS[0]?.mint });

  useEffect(() => {
    if (pools.length > 0 && !selectedPool) {
      setSelectedPool(pools[0]);
    }
  }, [pools, selectedPool]);

  const parsedAmount = useMemo(() => {
    if (!amount) return 0n;
    try {
      return parseAmount(amount, 9); // LP tokens typically have 9 decimals
    } catch {
      return 0n;
    }
  }, [amount]);

  // Fee calculation for display - moved after parsedAmount
  const feeBreakdown = useFeeBreakdown({
    amount: parsedAmount,
    feeRateBps: protocolFees?.removeLiquidityFeeBps ?? 25,
    feesEnabled: protocolFees?.feesEnabled ?? true,
    symbol: 'LP',
    decimals: 9,
  });

  // Calculate expected output amounts
  const outputCalc = useMemo(() => {
    if (!selectedPool || parsedAmount === 0n || selectedPool.lpSupply === 0n) return null;
    try {
      return calculateRemoveLiquidityOutput(
        parsedAmount,
        selectedPool.lpSupply,
        selectedPool.reserveA,
        selectedPool.reserveB
      );
    } catch {
      return null;
    }
  }, [selectedPool, parsedAmount]);

  // Calculate current pool share
  const currentPoolShare = useMemo(() => {
    if (!selectedPool || selectedPool.lpSupply === 0n || lpBalance === 0n) return 0;
    return (Number(lpBalance) / Number(selectedPool.lpSupply)) * 100;
  }, [selectedPool, lpBalance]);

  // Calculate pool share after removal
  const newPoolShare = useMemo(() => {
    if (!selectedPool || selectedPool.lpSupply === 0n) return 0;
    const remainingLp = lpBalance - parsedAmount;
    if (remainingLp <= 0n) return 0;
    const newSupply = selectedPool.lpSupply - parsedAmount;
    if (newSupply <= 0n) return 0;
    return (Number(remainingLp) / Number(newSupply)) * 100;
  }, [selectedPool, lpBalance, parsedAmount]);

  const validationError = useMemo(() => {
    if (!selectedPool) return 'Select a pool';
    if (!amount || parsedAmount === 0n) return 'Enter amount';
    if (parsedAmount > lpBalance) return 'Insufficient LP balance';
    if (selectedPool.lpSupply === 0n) return 'Pool has no liquidity';
    return null;
  }, [selectedPool, amount, parsedAmount, lpBalance]);

  const canSubmit = !validationError && isProgramReady && isProverReady && !isRemoving && overlayStatus !== 'pending';

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !selectedPool || !client) return;

    // Check if consolidation is needed (maxInputs=1 for remove liquidity)
    let selectionResult = getSelectionResultLp(parsedAmount, { maxInputs: 1 });

    // Build initial steps based on whether consolidation is needed
    const steps: TransactionStep[] = [];

    if (selectionResult.needsConsolidation) {
      steps.push(
        { id: 'consolidate-prepare', name: 'Consolidating LP tokens', description: 'Preparing notes...', status: 'active' },
        { id: 'consolidate-execute', name: 'Consolidating LP tokens', description: 'Approve in wallet...', status: 'pending' },
        { id: 'consolidate-confirm', name: 'Confirming consolidation', description: 'Waiting for confirmation...', status: 'pending' },
      );
    }

    steps.push(
      { id: 'prepare', name: 'Preparing removal', description: 'Selecting notes...', status: selectionResult.needsConsolidation ? 'pending' : 'active' },
      { id: 'proof', name: 'Generating proof', description: 'Creating zero-knowledge proof...', status: 'pending' },
      { id: 'submit', name: 'Removing liquidity', description: 'Approve in wallet...', status: 'pending' },
      { id: 'confirm', name: 'Confirming', description: 'Waiting for confirmation...', status: 'pending' },
    );

    setOverlaySteps(steps);
    setOverlayStatus('pending');
    setShowOverlay(true);
    setTxSignature(undefined);

    try {
      let selectedNote: any = null;

      // Consolidate LP tokens if needed
      if (selectionResult.needsConsolidation) {
        await consolidateLp((stage, batchInfo) => {
          const batchLabel = batchInfo && batchInfo.total > 1 ? ` (batch ${batchInfo.current}/${batchInfo.total})` : '';
          if (stage === 'generating' || stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-prepare' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-execute' ? { ...s, status: 'active', description: `Generating proof${batchLabel}...` } : s
            ));
          } else if (stage === 'approving' || stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-execute' ? { ...s, status: 'active', description: `Executing${batchLabel}...` } : s
            ));
          } else if (stage === 'confirming' || stage === 'syncing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'consolidate-execute' ? { ...s, status: 'completed' } :
              s.id === 'consolidate-confirm' ? { ...s, status: 'active', description: `Confirming${batchLabel}...` } : s
            ));
          }
        }, parsedAmount, 1);

        // Mark consolidation done
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'consolidate-confirm' ? { ...s, status: 'completed' } :
          s.id === 'prepare' ? { ...s, status: 'active' } : s
        ));

        // Fetch fresh LP notes
        client.clearScanCache();
        const freshNotes = await client.scanNotes(selectedPool.lpMint);
        const lpNotes = freshNotes.filter((n: any) => n.tokenMint.equals(selectedPool.lpMint));
        const sortedNotes = [...lpNotes].sort((a: any, b: any) => Number(b.amount - a.amount));
        selectedNote = sortedNotes.find((n: any) => n.amount >= parsedAmount);
        if (!selectedNote) {
          throw new Error('No single LP note large enough after consolidation.');
        }
        sync(selectedPool.lpMint, true);
      } else {
        selectedNote = selectionResult.notes[0];
      }

      if (!selectedNote) {
        throw new Error('Could not select LP notes');
      }

      // Start the remove liquidity operation with progress callback
      const result = await removeLiquidity({
        pool: selectedPool,
        lpInput: selectedNote,
        lpAmount: parsedAmount,
        onProgress: (stage) => {
          if (stage === 'preparing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'active', description: 'Preparing remove liquidity...' } : s
            ));
          } else if (stage === 'generating') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'prepare' ? { ...s, status: 'completed' } :
              s.id === 'proof' ? { ...s, status: 'active', description: 'Creating zero-knowledge proof...' } : s
            ));
          } else if (stage === 'building') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'proof' ? { ...s, status: 'active', description: 'Building transactions...' } : s
            ));
          } else if (stage === 'approving') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'proof' ? { ...s, status: 'completed' } :
              s.id === 'submit' ? { ...s, status: 'active', description: 'Approve in wallet...' } : s
            ));
          } else if (stage === 'executing') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'active', description: 'Executing transactions...' } : s
            ));
          } else if (stage === 'confirming') {
            setOverlaySteps(prev => prev.map(s =>
              s.id === 'submit' ? { ...s, status: 'completed' } :
              s.id === 'confirm' ? { ...s, status: 'active', description: 'Waiting for confirmation...' } : s
            ));
          }
        },
      });

      if (result) {
        // Mark proof and submit as completed, move to confirm
        setOverlaySteps(prev => prev.map(s =>
          s.id === 'proof' ? { ...s, status: 'completed' } :
          s.id === 'submit' ? { ...s, status: 'completed' } :
          s.id === 'confirm' ? { ...s, status: 'active', description: 'Waiting for confirmation...' } : s
        ));

        // Mark all as completed
        setOverlaySteps(prev => prev.map(s => ({
          ...s,
          status: 'completed' as const,
          signature: s.id === 'confirm' ? result.signature : undefined
        })));
        setTxSignature(result.signature);
        setOverlayStatus('success');
        setAmount('');
        toast.success('Liquidity removed successfully');
        refreshPools();
      } else {
        throw new Error(removeError || 'Failed to remove liquidity');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setOverlaySteps(prev => {
        const activeIndex = prev.findIndex(s => s.status === 'active');
        return prev.map((s, i) => i === activeIndex ? { ...s, status: 'error', error: errorMsg } : s);
      });
      setOverlayStatus('error');
    }
  }, [canSubmit, selectedPool, parsedAmount, getSelectionResultLp, consolidateLp, removeLiquidity, removeError, refreshPools, client, sync]);

  const handleCloseOverlay = useCallback(() => {
    setShowOverlay(false);
    if (overlayStatus === 'success' || overlayStatus === 'error') {
      setOverlayStatus('idle');
    }
  }, [overlayStatus]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Minus className="h-5 w-5" />
            <CardTitle>Remove Liquidity</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={refreshPools} disabled={poolsLoading}>
            <RefreshCw className={`h-4 w-4 ${poolsLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          Withdraw your tokens from the pool.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {poolsLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading pools...
          </div>
        ) : pools.length === 0 ? (
          <div className="rounded-lg bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">
              No pools available.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Pool</Label>
              <Select
                value={selectedPool?.address.toBase58() || ''}
                onValueChange={(v) => {
                  const pool = pools.find((p) => p.address.toBase58() === v);
                  if (pool) {
                    setSelectedPool(pool);
                    setAmount('');
                  }
                }}
                disabled={isRemoving || overlayStatus === 'pending'}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pool" />
                </SelectTrigger>
                <SelectContent>
                  {pools.map((pool) => {
                    const tA = getTokenInfo(pool.tokenAMint);
                    const tB = getTokenInfo(pool.tokenBMint);
                    const isStable = pool.poolType === PoolType.StableSwap;
                    return (
                      <SelectItem key={pool.address.toBase58()} value={pool.address.toBase58()}>
                        {tA?.symbol || 'Unknown'} / {tB?.symbol || 'Unknown'}
                        {isStable ? ' (Stable)' : ''}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {selectedPool && (
              <>
                {/* LP Token Input */}
                <div className="space-y-2">
                  <Label>LP Token Amount</Label>
                  <div className="relative">
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        if (/^[0-9]*\.?[0-9]*$/.test(e.target.value) || e.target.value === '') {
                          setAmount(e.target.value);
                        }
                      }}
                      disabled={isRemoving || overlayStatus === 'pending'}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
                      onClick={() => setAmount(formatAmount(lpBalance, 9))}
                      disabled={isRemoving || overlayStatus === 'pending'}
                    >
                      MAX
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>LP balance: {formatAmount(lpBalance, 9)}</span>
                    <span>Your pool share: {currentPoolShare.toFixed(2)}%</span>
                  </div>
                </div>

                {/* Output Preview */}
                {outputCalc && parsedAmount > 0n && (
                  <div className="rounded-lg bg-muted p-4 space-y-3">
                    <div className="text-sm font-medium">You Will Receive</div>
                    <div className="space-y-2">
                      {/* Token A Output */}
                      <div className="flex items-center justify-between rounded bg-background p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tokenAInfo?.symbol || 'Token A'}</span>
                        </div>
                        <span className="font-mono text-lg">
                          {tokenAInfo ? formatAmount(outputCalc.outputA, tokenAInfo.decimals) : '0'}
                        </span>
                      </div>

                      {/* Token B Output */}
                      <div className="flex items-center justify-between rounded bg-background p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{tokenBInfo?.symbol || 'Token B'}</span>
                        </div>
                        <span className="font-mono text-lg">
                          {tokenBInfo ? formatAmount(outputCalc.outputB, tokenBInfo.decimals) : '0'}
                        </span>
                      </div>
                    </div>

                    {/* Pool Share Change */}
                    <div className="pt-2 border-t space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Pool share after</span>
                        <span>{newPoolShare.toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>LP tokens remaining</span>
                        <span className="font-mono">{formatAmount(lpBalance - parsedAmount, 9)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pool Rate Card with Graph */}
                {selectedPool.reserveA > 0n && selectedPool.reserveB > 0n && (
                  <PoolRateCard
                    pool={selectedPool}
                    swapDirection="aToB"
                    swapAmount={0n}
                  />
                )}

                {/* Consolidation recommendation */}
                {shouldConsolidateLp && (
                  <ConsolidationPrompt
                    tokenMint={selectedPool.lpMint}
                    tokenSymbol="LP"
                    variant="alert"
                  />
                )}

                {/* Fee info */}
                {feeBreakdown?.protocolFee && parsedAmount > 0n && (
                  <FeeBreakdown data={feeBreakdown} />
                )}
              </>
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
        <Button className="w-full" onClick={handleSubmit} disabled={!canSubmit || pools.length === 0}>
          {isRemoving || overlayStatus === 'pending' ? 'Removing...' : 'Remove Liquidity'}
        </Button>
      </CardFooter>

      {/* Transaction Overlay */}
      <TransactionOverlay
        isOpen={showOverlay}
        onClose={handleCloseOverlay}
        title="Remove Liquidity"
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
