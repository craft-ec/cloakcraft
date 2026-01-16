'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg border shadow-sm p-6 text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
          <p className="text-gray-600 mb-4">
            An unexpected error occurred. Please try again.
          </p>
          <div className="bg-gray-100 rounded p-3 mb-4">
            <p className="text-sm font-mono text-gray-700 break-all">
              {error.message || 'Unknown error'}
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 border rounded-md hover:bg-gray-50"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
