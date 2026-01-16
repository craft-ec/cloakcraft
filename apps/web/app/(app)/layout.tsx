'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Header } from '@/components/layout/header';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();
  const router = useRouter();

  // Redirect to landing if not connected
  useEffect(() => {
    if (!connected) {
      router.push('/');
    }
  }, [connected, router]);

  if (!connected) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
