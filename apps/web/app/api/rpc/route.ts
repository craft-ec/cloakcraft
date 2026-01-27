import { NextRequest, NextResponse } from 'next/server';

// Increase max duration for long-running RPC requests
export const maxDuration = 60;

// Server-side RPC endpoint (uses public env var since it's already exposed)
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';

/**
 * POST /api/rpc
 * Proxy JSON-RPC requests to the Solana RPC endpoint
 * Using same-origin proxy ensures wallet uses correct network for simulation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log all RPC requests to debug wallet simulation
    console.log('[RPC Proxy] Request:', JSON.stringify(body, null, 2));

    // Use AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

    try {
      const response = await fetch(RPC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      // Log response for debugging
      if (body.method === 'simulateTransaction' || body.method === 'getGenesisHash') {
        console.log('[RPC Proxy] Response for', body.method, ':', JSON.stringify(data, null, 2));
      }

      return NextResponse.json(data, {
        status: response.status,
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
  } catch (error) {
    console.error('RPC proxy error:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'RPC request timed out' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'RPC request failed' },
      { status: 502 }
    );
  }
}
