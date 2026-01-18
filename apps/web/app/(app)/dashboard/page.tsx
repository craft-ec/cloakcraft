'use client';

import { PublicBalanceList, PrivateBalanceList } from '@/components/balance/balance-list';
import { ProtocolAnalytics } from '@/components/pool/pool-analytics';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your public and private token balances.
        </p>
      </div>

      {/* Balances */}
      <div className="grid gap-6 lg:grid-cols-2">
        <PublicBalanceList />
        <PrivateBalanceList />
      </div>

      {/* Protocol Analytics */}
      <ProtocolAnalytics />
    </div>
  );
}
