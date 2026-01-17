'use client';

import { useMemo } from 'react';
import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useSolBalance, useTokenBalances, useCloakCraft } from '@cloakcraft/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TokenBalance, TokenBalanceSkeleton } from './token-balance';
import { RefreshCw, Eye, EyeOff } from 'lucide-react';
import { SUPPORTED_TOKENS, getTokenDecimals } from '@/lib/constants';
import { formatAmount } from '@/lib/utils';

export function PublicBalanceList() {
  const { publicKey } = useSolanaWallet();
  const { balance: solBalance, isLoading: solLoading, refresh: refreshSol } = useSolBalance(publicKey ?? undefined);
  const tokenMints = useMemo(() => SUPPORTED_TOKENS.map((t) => t.mint), []);
  const {
    getBalance,
    isLoading: tokensLoading,
    refresh: refreshTokens,
  } = useTokenBalances(tokenMints, publicKey ?? undefined);

  const isLoading = solLoading || tokensLoading;

  // Filter to only show tokens with balance > 0
  const tokensWithBalance = useMemo(() => {
    if (tokensLoading) return [];
    return SUPPORTED_TOKENS.filter((token) => {
      const balance = getBalance(token.mint);
      return balance > 0n;
    });
  }, [getBalance, tokensLoading]);

  const handleRefresh = () => {
    refreshSol();
    refreshTokens();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Public Balances
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* SOL Balance */}
        <TokenBalance
          symbol="SOL"
          name="Solana"
          balance={solBalance}
          decimals={9}
          isLoading={solLoading}
        />

        {/* Token Balances - only show tokens with balance > 0 */}
        {tokensLoading ? (
          <>
            <TokenBalanceSkeleton />
            <TokenBalanceSkeleton />
          </>
        ) : tokensWithBalance.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No token balances found.
          </p>
        ) : (
          tokensWithBalance.map((token) => (
            <TokenBalance
              key={token.mint.toBase58()}
              symbol={token.symbol}
              name={token.name}
              balance={getBalance(token.mint)}
              decimals={token.decimals}
              mint={token.mint}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function PrivateBalanceList() {
  const { notes, isSyncing, sync, isConnected } = useCloakCraft();

  // Group notes by token mint and sum balances
  const privateBalances = useMemo(() => {
    const balanceMap = new Map<string, bigint>();

    for (const note of notes) {
      if (note.tokenMint) {
        const mintStr = note.tokenMint.toBase58();
        const current = balanceMap.get(mintStr) ?? 0n;
        balanceMap.set(mintStr, current + note.amount);
      }
    }

    return Array.from(balanceMap.entries()).map(([mint, balance]) => {
      const tokenInfo = SUPPORTED_TOKENS.find((t) => t.mint.toBase58() === mint);
      return {
        mint,
        symbol: tokenInfo?.symbol ?? 'Unknown',
        name: tokenInfo?.name,
        decimals: tokenInfo?.decimals ?? 9,
        balance,
      };
    });
  }, [notes]);

  const handleRefresh = () => {
    sync(undefined, true);
  };

  if (!isConnected) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <EyeOff className="h-5 w-5" />
            Private Balances
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Create a stealth wallet to view private balances.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <EyeOff className="h-5 w-5" />
          Private Balances
        </CardTitle>
        <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isSyncing}>
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {isSyncing && privateBalances.length === 0 ? (
          <>
            <TokenBalanceSkeleton />
            <TokenBalanceSkeleton />
          </>
        ) : privateBalances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No private balances. Shield tokens to get started.
          </p>
        ) : (
          privateBalances.map((balance) => (
            <TokenBalance
              key={balance.mint}
              symbol={balance.symbol}
              name={balance.name}
              balance={balance.balance}
              decimals={balance.decimals}
              mint={balance.mint}
              isPrivate
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
