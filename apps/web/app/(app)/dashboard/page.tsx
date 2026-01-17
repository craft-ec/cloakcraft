'use client';

import Link from 'next/link';
import { ArrowDownToLine, ArrowRight, ArrowUpFromLine, ArrowDownUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PublicBalanceList, PrivateBalanceList } from '@/components/balance/balance-list';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your public and private token balances.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickActionCard
          href="/transfer?tab=shield"
          icon={<ArrowDownToLine className="h-5 w-5" />}
          title="Shield"
          description="Deposit tokens into the privacy pool"
        />
        <QuickActionCard
          href="/transfer?tab=transfer"
          icon={<ArrowRight className="h-5 w-5" />}
          title="Transfer"
          description="Send tokens privately"
        />
        <QuickActionCard
          href="/transfer?tab=unshield"
          icon={<ArrowUpFromLine className="h-5 w-5" />}
          title="Unshield"
          description="Withdraw to public wallet"
        />
        <QuickActionCard
          href="/swap"
          icon={<ArrowDownUp className="h-5 w-5" />}
          title="Swap"
          description="Swap tokens and manage liquidity"
        />
      </div>

      {/* Balances */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PublicBalanceList />
        <PrivateBalanceList />
      </div>
    </div>
  );
}

function QuickActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:border-foreground/20 hover:bg-accent/50">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
