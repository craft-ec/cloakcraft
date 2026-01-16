'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidPublicKey } from '@/lib/utils';

interface RecipientInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  helperText?: string;
}

export function RecipientInput({
  label = 'Recipient',
  value,
  onChange,
  placeholder = 'Enter wallet address',
  disabled = false,
  helperText,
}: RecipientInputProps) {
  const [touched, setTouched] = useState(false);
  const isValid = !value || isValidPublicKey(value);
  const showError = touched && value && !isValid;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const handleBlur = useCallback(() => {
    setTouched(true);
  }, []);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        className={`font-mono text-sm ${showError ? 'border-destructive' : ''}`}
      />
      {showError && (
        <p className="text-sm text-destructive">Invalid Solana address</p>
      )}
      {helperText && !showError && (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
