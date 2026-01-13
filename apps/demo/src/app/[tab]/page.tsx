'use client';

import { Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

const VALID_TABS = ['wallet', 'swap'] as const;
type Tab = typeof VALID_TABS[number];

// Dynamically import the main app to avoid SSR issues with Node.js modules
const DemoApp = dynamic(() => import('@/components/DemoApp'), {
  ssr: false,
  loading: () => (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#71717a'
    }}>
      Loading CloakCraft...
    </div>
  ),
});

interface PageProps {
  params: { tab: string };
}

export default function TabPage({ params }: PageProps) {
  const { tab } = params;
  const router = useRouter();
  const isValid = VALID_TABS.includes(tab as Tab);

  useEffect(() => {
    if (!isValid) {
      router.replace('/wallet');
    }
  }, [isValid, router]);

  if (!isValid) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        color: '#71717a'
      }}>
        Redirecting...
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0f',
        color: '#71717a'
      }}>
        Loading CloakCraft...
      </div>
    }>
      <DemoApp initialTab={tab as Tab} />
    </Suspense>
  );
}
