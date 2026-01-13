'use client';

import { colors } from '@cloakcraft/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0a0a0f',
      color: '#71717a',
      gap: '16px',
    }}>
      <h2>Something went wrong!</h2>
      <p style={{ color: '#ef4444' }}>{error.message}</p>
      <button
        onClick={reset}
        style={{
          padding: '8px 16px',
          background: '#8b5cf6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Try again
      </button>
    </div>
  );
}
