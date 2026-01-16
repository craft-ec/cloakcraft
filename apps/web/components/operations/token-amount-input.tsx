'use client';

import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUPPORTED_TOKENS, TokenInfo, getTokenDecimals } from '@/lib/constants';
import { formatAmount, parseAmount } from '@/lib/utils';

interface TokenAmountInputProps {
  label?: string;
  selectedToken: TokenInfo | null;
  onTokenChange: (token: TokenInfo) => void;
  amount: string;
  onAmountChange: (amount: string) => void;
  maxAmount?: bigint;
  disabled?: boolean;
  tokens?: TokenInfo[];
  error?: string;
}

export function TokenAmountInput({
  label = 'Amount',
  selectedToken,
  onTokenChange,
  amount,
  onAmountChange,
  maxAmount,
  disabled = false,
  tokens = SUPPORTED_TOKENS,
  error,
}: TokenAmountInputProps) {
  const handleMaxClick = useCallback(() => {
    if (maxAmount !== undefined && selectedToken) {
      onAmountChange(formatAmount(maxAmount, selectedToken.decimals));
    }
  }, [maxAmount, selectedToken, onAmountChange]);

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      // Only allow numbers and one decimal point
      if (/^[0-9]*\.?[0-9]*$/.test(value) || value === '') {
        onAmountChange(value);
      }
    },
    [onAmountChange]
  );

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Select
          value={selectedToken?.mint.toBase58() || ''}
          onValueChange={(value) => {
            const token = tokens.find((t) => t.mint.toBase58() === value);
            if (token) onTokenChange(token);
          }}
          disabled={disabled}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Token" />
          </SelectTrigger>
          <SelectContent>
            {tokens.map((token) => (
              <SelectItem key={token.mint.toBase58()} value={token.mint.toBase58()}>
                {token.symbol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Input
            type="text"
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={handleAmountChange}
            disabled={disabled || !selectedToken}
            className={error ? 'border-destructive' : ''}
          />
          {maxAmount !== undefined && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2 text-xs"
              onClick={handleMaxClick}
              disabled={disabled}
            >
              MAX
            </Button>
          )}
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {maxAmount !== undefined && selectedToken && !error && (
        <p className="text-xs text-muted-foreground">
          Available: {formatAmount(maxAmount, selectedToken.decimals)} {selectedToken.symbol}
        </p>
      )}
    </div>
  );
}
