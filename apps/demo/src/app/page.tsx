'use client';

import dynamic from 'next/dynamic';

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

export default function Home() {
  return <DemoApp />;
}
