'use client';

import { AlertTriangle } from 'lucide-react';
import { NETWORK } from '@/lib/constants';

/**
 * Warning banner that displays on devnet to warn users not to use real funds.
 * Only shows when NETWORK is 'devnet', hidden on mainnet.
 */
export function DevnetWarningBanner() {
  // Only show on devnet
  if (NETWORK !== 'devnet') {
    return null;
  }

  return (
    <div className="bg-yellow-500/90 text-yellow-950 px-4 py-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>
          <strong>Demo Mode (Devnet)</strong> — Do not send real tokens from mainnet wallets. Any funds sent will be lost.
        </span>
      </div>
    </div>
  );
}
