/**
 * Order book component for the private market
 */

import React from 'react';
import { useOrders } from '@cloakcraft/hooks';
import type { OrderState, OrderStatus } from '@cloakcraft/types';

interface OrderBookProps {
  className?: string;
}

export function OrderBook({ className }: OrderBookProps) {
  const { orders, isLoading, error, refresh } = useOrders();

  const formatExpiry = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getStatusBadge = (status: OrderStatus) => {
    const styles: Record<number, { bg: string; text: string; label: string }> = {
      0: { bg: '#dcfce7', text: '#166534', label: 'Open' },
      1: { bg: '#dbeafe', text: '#1e40af', label: 'Filled' },
      2: { bg: '#fee2e2', text: '#991b1b', label: 'Cancelled' },
    };
    const style = styles[status] ?? { bg: '#f3f4f6', text: '#374151', label: 'Unknown' };
    return (
      <span
        style={{
          padding: '2px 8px',
          borderRadius: '9999px',
          backgroundColor: style.bg,
          color: style.text,
          fontSize: '0.75rem',
          fontWeight: 500,
        }}
      >
        {style.label}
      </span>
    );
  };

  return (
    <div className={className}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Order Book</h3>
        <button
          onClick={refresh}
          disabled={isLoading}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: '1px solid #e5e7eb',
            background: 'white',
            cursor: isLoading ? 'wait' : 'pointer',
          }}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div style={{ color: '#ef4444', padding: '12px', background: '#fee2e2', borderRadius: '8px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {orders.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '24px' }}>
          No open orders. Create an order to start trading.
        </p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px' }}>Order ID</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '8px' }}>Expiry</th>
                <th style={{ textAlign: 'right', padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, index) => (
                <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: '0.875rem' }}>
                    {Buffer.from(order.orderId).toString('hex').slice(0, 16)}...
                  </td>
                  <td style={{ padding: '12px 8px' }}>
                    {getStatusBadge(order.status)}
                  </td>
                  <td style={{ padding: '12px 8px', fontSize: '0.875rem' }}>
                    {formatExpiry(order.expiry)}
                  </td>
                  <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                    {order.status === 0 && (
                      <button
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #6366f1',
                          background: 'white',
                          color: '#6366f1',
                          cursor: 'pointer',
                          fontSize: '0.75rem',
                        }}
                      >
                        Fill
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
