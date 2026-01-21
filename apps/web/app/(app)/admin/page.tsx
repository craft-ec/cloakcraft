'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  Key,
  Database,
  ArrowRightLeft,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getExplorerAddressUrl } from '@/lib/constants';
import {
  fetchProtocolFeeConfig,
  deriveVerificationKeyPda,
  derivePoolPda,
  CIRCUIT_IDS,
  PROGRAM_ID,
  CloakCraftClient,
} from '@cloakcraft/sdk';

// Known token mints for checking shielded pools
const KNOWN_TOKENS = {
  SOL: new PublicKey('So11111111111111111111111111111111111111112'),
  USDC: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), // devnet USDC
};

// Circuit categories for organized display
const CIRCUIT_CATEGORIES = {
  'Core Transfer': [
    { id: CIRCUIT_IDS.TRANSFER_1X2, name: 'Transfer 1→2', required: true },
    { id: CIRCUIT_IDS.CONSOLIDATE_3X1, name: 'Consolidate 3→1', required: true },
  ],
  'AMM Swap': [
    { id: CIRCUIT_IDS.SWAP, name: 'Swap', required: true },
    { id: CIRCUIT_IDS.ADD_LIQUIDITY, name: 'Add Liquidity', required: true },
    { id: CIRCUIT_IDS.REMOVE_LIQUIDITY, name: 'Remove Liquidity', required: true },
  ],
  'Order Book': [
    { id: CIRCUIT_IDS.ORDER_CREATE, name: 'Create Order', required: false },
    { id: CIRCUIT_IDS.ORDER_FILL, name: 'Fill Order', required: false },
    { id: CIRCUIT_IDS.ORDER_CANCEL, name: 'Cancel Order', required: false },
  ],
  'Perpetual Futures': [
    { id: CIRCUIT_IDS.PERPS_OPEN_POSITION, name: 'Open Position', required: true },
    { id: CIRCUIT_IDS.PERPS_CLOSE_POSITION, name: 'Close Position', required: true },
    { id: CIRCUIT_IDS.PERPS_ADD_LIQUIDITY, name: 'Add Liquidity', required: true },
    { id: CIRCUIT_IDS.PERPS_REMOVE_LIQUIDITY, name: 'Remove Liquidity', required: true },
    { id: CIRCUIT_IDS.PERPS_LIQUIDATE, name: 'Liquidate', required: true },
  ],
};

type CheckStatus = 'loading' | 'success' | 'error' | 'warning';

interface CheckResult {
  status: CheckStatus;
  message: string;
  details?: Record<string, any>;
  pda?: string;
}

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case 'loading':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
  }
}

function StatusBadge({ status }: { status: CheckStatus }) {
  const variants: Record<CheckStatus, string> = {
    loading: 'bg-muted text-muted-foreground',
    success: 'bg-green-500/10 text-green-500 border-green-500/20',
    error: 'bg-red-500/10 text-red-500 border-red-500/20',
    warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  };

  const labels: Record<CheckStatus, string> = {
    loading: 'Checking...',
    success: 'Ready',
    error: 'Not Initialized',
    warning: 'Partial',
  };

  return (
    <Badge variant="outline" className={cn('text-xs', variants[status])}>
      {labels[status]}
    </Badge>
  );
}

function CheckItem({
  name,
  result,
  required = true,
}: {
  name: string;
  result: CheckResult;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <StatusIcon status={result.status} />
        <div>
          <p className="text-sm font-medium">
            {name}
            {!required && (
              <span className="ml-2 text-xs text-muted-foreground">(optional)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{result.message}</p>
        </div>
      </div>
      {result.pda && (
        <a
          href={getExplorerAddressUrl(result.pda)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          View
          <ExternalLink className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

function CollapsibleSection({
  title,
  icon: Icon,
  children,
  status,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  status: CheckStatus;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Card>
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={status} />
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CardHeader>
      {isOpen && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  );
}

export default function AdminPage() {
  const { connection } = useConnection();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check results
  const [protocolConfig, setProtocolConfig] = useState<CheckResult>({
    status: 'loading',
    message: 'Checking...',
  });
  const [vkResults, setVkResults] = useState<Record<string, CheckResult>>({});
  const [poolResults, setPoolResults] = useState<Record<string, CheckResult>>({});
  const [ammPoolResults, setAmmPoolResults] = useState<CheckResult>({
    status: 'loading',
    message: 'Checking...',
  });
  const [perpsResults, setPerpsResults] = useState<CheckResult>({
    status: 'loading',
    message: 'Checking...',
  });

  const checkProtocolConfig = useCallback(async () => {
    try {
      const config = await fetchProtocolFeeConfig(connection, PROGRAM_ID);
      if (config) {
        setProtocolConfig({
          status: 'success',
          message: `Fees ${config.feesEnabled ? 'enabled' : 'disabled'} - Transfer: ${config.transferFeeBps}bps, Unshield: ${config.unshieldFeeBps}bps`,
          details: config,
        });
      } else {
        setProtocolConfig({
          status: 'error',
          message: 'Protocol config not initialized',
        });
      }
    } catch (e) {
      setProtocolConfig({
        status: 'error',
        message: 'Failed to fetch protocol config',
      });
    }
  }, [connection]);

  const checkVerificationKeys = useCallback(async () => {
    const results: Record<string, CheckResult> = {};

    for (const [category, circuits] of Object.entries(CIRCUIT_CATEGORIES)) {
      for (const circuit of circuits) {
        const [vkPda] = deriveVerificationKeyPda(circuit.id, PROGRAM_ID);
        try {
          const accountInfo = await connection.getAccountInfo(vkPda);
          if (accountInfo && accountInfo.data.length > 40) {
            // Check VK data length (discriminator + account data + vk_data vec)
            const vkDataLen = accountInfo.data.readUInt32LE(40); // Vec length at offset 40
            results[circuit.id] = {
              status: 'success',
              message: `Registered (${vkDataLen} bytes)`,
              pda: vkPda.toBase58(),
            };
          } else if (accountInfo) {
            results[circuit.id] = {
              status: 'warning',
              message: 'Account exists but no VK data',
              pda: vkPda.toBase58(),
            };
          } else {
            results[circuit.id] = {
              status: circuit.required ? 'error' : 'warning',
              message: 'Not registered',
            };
          }
        } catch (e) {
          results[circuit.id] = {
            status: 'error',
            message: 'Failed to check',
          };
        }
      }
    }

    setVkResults(results);
  }, [connection]);

  const checkShieldedPools = useCallback(async () => {
    const results: Record<string, CheckResult> = {};

    for (const [name, mint] of Object.entries(KNOWN_TOKENS)) {
      const [poolPda] = derivePoolPda(mint, PROGRAM_ID);
      try {
        const accountInfo = await connection.getAccountInfo(poolPda);
        if (accountInfo) {
          results[name] = {
            status: 'success',
            message: 'Pool initialized',
            pda: poolPda.toBase58(),
          };
        } else {
          results[name] = {
            status: 'error',
            message: 'Pool not initialized',
          };
        }
      } catch (e) {
        results[name] = {
          status: 'error',
          message: 'Failed to check',
        };
      }
    }

    setPoolResults(results);
  }, [connection]);

  const checkAmmPools = useCallback(async () => {
    try {
      const client = new CloakCraftClient({
        connection,
        // We don't need wallet for read operations
      } as any);

      const pools = await client.getAllAmmPools();
      if (pools.length > 0) {
        const activeCount = pools.filter(p => p.isActive).length;
        const withLiquidity = pools.filter(p => p.reserveA > 0n && p.reserveB > 0n).length;
        setAmmPoolResults({
          status: withLiquidity > 0 ? 'success' : 'warning',
          message: `${pools.length} pool(s) found, ${activeCount} active, ${withLiquidity} with liquidity`,
          details: { pools: pools.length, active: activeCount, withLiquidity },
        });
      } else {
        setAmmPoolResults({
          status: 'warning',
          message: 'No AMM pools found',
        });
      }
    } catch (e) {
      setAmmPoolResults({
        status: 'error',
        message: 'Failed to fetch AMM pools',
      });
    }
  }, [connection]);

  const checkPerpsPools = useCallback(async () => {
    try {
      const client = new CloakCraftClient({
        connection,
      } as any);

      const pools = await client.getAllPerpsPools();
      if (pools.length > 0) {
        let totalMarkets = 0;
        for (const pool of pools) {
          try {
            const markets = await client.getPerpsMarkets(pool.address);
            totalMarkets += markets.length;
          } catch {
            // Ignore market fetch errors
          }
        }

        setPerpsResults({
          status: 'success',
          message: `${pools.length} pool(s), ${totalMarkets} market(s)`,
          details: { pools: pools.length, markets: totalMarkets },
        });
      } else {
        setPerpsResults({
          status: 'warning',
          message: 'No perps pools found',
        });
      }
    } catch (e) {
      setPerpsResults({
        status: 'error',
        message: 'Failed to fetch perps pools',
      });
    }
  }, [connection]);

  const runAllChecks = useCallback(async () => {
    setIsRefreshing(true);

    // Reset all to loading
    setProtocolConfig({ status: 'loading', message: 'Checking...' });
    setVkResults({});
    setPoolResults({});
    setAmmPoolResults({ status: 'loading', message: 'Checking...' });
    setPerpsResults({ status: 'loading', message: 'Checking...' });

    // Run all checks in parallel
    await Promise.all([
      checkProtocolConfig(),
      checkVerificationKeys(),
      checkShieldedPools(),
      checkAmmPools(),
      checkPerpsPools(),
    ]);

    setLastChecked(new Date());
    setIsRefreshing(false);
  }, [checkProtocolConfig, checkVerificationKeys, checkShieldedPools, checkAmmPools, checkPerpsPools]);

  // Run checks on mount
  useEffect(() => {
    runAllChecks();
  }, [runAllChecks]);

  // Calculate overall VK status
  const vkOverallStatus = (): CheckStatus => {
    const results = Object.values(vkResults);
    if (results.length === 0) return 'loading';

    const allCircuits = Object.values(CIRCUIT_CATEGORIES).flat();
    const requiredCircuits = allCircuits.filter(c => c.required);
    const requiredResults = requiredCircuits.map(c => vkResults[c.id]);

    if (requiredResults.some(r => !r || r.status === 'loading')) return 'loading';
    if (requiredResults.every(r => r?.status === 'success')) return 'success';
    if (requiredResults.some(r => r?.status === 'error')) return 'error';
    return 'warning';
  };

  // Calculate overall pool status
  const poolOverallStatus = (): CheckStatus => {
    const results = Object.values(poolResults);
    if (results.length === 0) return 'loading';
    if (results.every(r => r.status === 'success')) return 'success';
    if (results.some(r => r.status === 'error')) return 'error';
    return 'warning';
  };

  // Count VK stats
  const vkStats = () => {
    const allCircuits = Object.values(CIRCUIT_CATEGORIES).flat();
    const total = allCircuits.length;
    const registered = allCircuits.filter(c => vkResults[c.id]?.status === 'success').length;
    const required = allCircuits.filter(c => c.required).length;
    const requiredRegistered = allCircuits.filter(
      c => c.required && vkResults[c.id]?.status === 'success'
    ).length;
    return { total, registered, required, requiredRegistered };
  };

  const stats = vkStats();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">System Status</h1>
          <p className="text-muted-foreground">
            Check initialization status of all system components.
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastChecked && (
            <p className="text-xs text-muted-foreground">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
          <Button onClick={runAllChecks} disabled={isRefreshing} size="sm">
            <RefreshCw className={cn('mr-2 h-4 w-4', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Protocol Config</p>
                <p className="text-2xl font-bold">
                  {protocolConfig.status === 'success' ? 'Ready' : 'Missing'}
                </p>
              </div>
              <StatusIcon status={protocolConfig.status} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verification Keys</p>
                <p className="text-2xl font-bold">
                  {stats.requiredRegistered}/{stats.required}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    required
                  </span>
                </p>
              </div>
              <StatusIcon status={vkOverallStatus()} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Shielded Pools</p>
                <p className="text-2xl font-bold">
                  {Object.values(poolResults).filter(r => r.status === 'success').length}/
                  {Object.keys(KNOWN_TOKENS).length}
                </p>
              </div>
              <StatusIcon status={poolOverallStatus()} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AMM & Perps</p>
                <p className="text-2xl font-bold">
                  {ammPoolResults.details?.pools ?? 0} / {perpsResults.details?.pools ?? 0}
                </p>
              </div>
              <StatusIcon
                status={
                  ammPoolResults.status === 'success' || perpsResults.status === 'success'
                    ? 'success'
                    : ammPoolResults.status === 'loading' || perpsResults.status === 'loading'
                    ? 'loading'
                    : 'warning'
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-4">
        {/* Protocol Config */}
        <CollapsibleSection
          title="Protocol Configuration"
          icon={Shield}
          status={protocolConfig.status}
          defaultOpen={protocolConfig.status !== 'success'}
        >
          <div className="space-y-2">
            <CheckItem name="Protocol Config" result={protocolConfig} />
            {protocolConfig.status === 'success' && protocolConfig.details && (
              <div className="ml-7 p-3 rounded-lg bg-muted/50 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fees Enabled</span>
                  <span>{protocolConfig.details.feesEnabled ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transfer Fee</span>
                  <span>{protocolConfig.details.transferFeeBps} bps ({(protocolConfig.details.transferFeeBps / 100).toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Unshield Fee</span>
                  <span>{protocolConfig.details.unshieldFeeBps} bps ({(protocolConfig.details.unshieldFeeBps / 100).toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Swap Fee Share</span>
                  <span>{protocolConfig.details.swapFeeShareBps} bps ({(protocolConfig.details.swapFeeShareBps / 100).toFixed(2)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Remove Liquidity Fee</span>
                  <span>{protocolConfig.details.removeLiquidityFeeBps} bps ({(protocolConfig.details.removeLiquidityFeeBps / 100).toFixed(2)}%)</span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Verification Keys */}
        <CollapsibleSection
          title={`Verification Keys (${stats.registered}/${stats.total})`}
          icon={Key}
          status={vkOverallStatus()}
          defaultOpen={vkOverallStatus() !== 'success'}
        >
          <div className="space-y-4">
            {Object.entries(CIRCUIT_CATEGORIES).map(([category, circuits]) => (
              <div key={category}>
                <p className="text-sm font-medium text-muted-foreground mb-2">{category}</p>
                <div className="space-y-1">
                  {circuits.map(circuit => (
                    <CheckItem
                      key={circuit.id}
                      name={circuit.name}
                      result={vkResults[circuit.id] || { status: 'loading', message: 'Checking...' }}
                      required={circuit.required}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Shielded Pools */}
        <CollapsibleSection
          title="Shielded Pools"
          icon={Database}
          status={poolOverallStatus()}
          defaultOpen={poolOverallStatus() !== 'success'}
        >
          <div className="space-y-1">
            {Object.entries(KNOWN_TOKENS).map(([name, mint]) => (
              <CheckItem
                key={name}
                name={`${name} Pool`}
                result={poolResults[name] || { status: 'loading', message: 'Checking...' }}
              />
            ))}
          </div>
        </CollapsibleSection>

        {/* AMM Pools */}
        <CollapsibleSection
          title="AMM Pools"
          icon={ArrowRightLeft}
          status={ammPoolResults.status}
          defaultOpen={ammPoolResults.status !== 'success'}
        >
          <CheckItem name="AMM Pool Registry" result={ammPoolResults} />
        </CollapsibleSection>

        {/* Perps Pools */}
        <CollapsibleSection
          title="Perpetual Futures"
          icon={TrendingUp}
          status={perpsResults.status}
          defaultOpen={perpsResults.status !== 'success'}
        >
          <CheckItem name="Perps Pool & Markets" result={perpsResults} />
        </CollapsibleSection>
      </div>

      {/* Program Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Program Information</CardTitle>
          <CardDescription>Deployed program details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Program ID</span>
              <a
                href={getExplorerAddressUrl(PROGRAM_ID.toBase58())}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-primary hover:underline flex items-center gap-1"
              >
                {PROGRAM_ID.toBase58().slice(0, 8)}...{PROGRAM_ID.toBase58().slice(-8)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Network</span>
              <span>Devnet</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
