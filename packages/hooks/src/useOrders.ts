/**
 * Market orders hook
 */

import { useState, useCallback, useEffect } from 'react';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import type { DecryptedNote, OrderTerms, OrderState, TransactionResult } from '@cloakcraft/types';

interface OrdersState {
  orders: OrderState[];
  isLoading: boolean;
  error: string | null;
}

export function useOrders() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = useState<OrdersState>({
    orders: [],
    isLoading: false,
    error: null,
  });

  const fetchOrders = useCallback(async () => {
    if (!client) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Fetch open orders from indexer
      const response = await fetch(`${client.indexerUrl}/orders?status=open`);
      if (!response.ok) throw new Error('Failed to fetch orders');
      const orders = await response.json();
      setState({ orders, isLoading: false, error: null });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch orders';
      setState((prev) => ({ ...prev, isLoading: false, error }));
    }
  }, [client]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return {
    ...state,
    refresh: fetchOrders,
  };
}

interface CreateOrderState {
  isCreating: boolean;
  error: string | null;
  result: TransactionResult | null;
}

export function useCreateOrder() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<CreateOrderState>({
    isCreating: false,
    error: null,
    result: null,
  });

  const createOrder = useCallback(
    async (
      input: DecryptedNote,
      terms: OrderTerms,
      expiry: number,
      relayer?: SolanaKeypair
    ): Promise<TransactionResult | null> => {
      if (!client || !wallet) {
        setState({ isCreating: false, error: 'Wallet not connected', result: null });
        return null;
      }

      setState({ isCreating: true, error: null, result: null });

      try {
        // prepareAndCreateOrder handles all cryptographic preparation
        const result = await client.prepareAndCreateOrder(
          {
            input,
            terms,
            expiry,
          },
          relayer
        );

        await sync();
        setState({ isCreating: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to create order';
        setState({ isCreating: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isCreating: false, error: null, result: null });
  }, []);

  return {
    ...state,
    createOrder,
    reset,
  };
}
