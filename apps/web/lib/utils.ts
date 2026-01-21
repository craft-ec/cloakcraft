import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { PublicKey } from '@solana/web3.js';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert BN or number-like to BigInt
 * Handles Anchor BN objects, strings, numbers, and BigInt
 */
export function toBigInt(value: unknown): bigint {
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  if (typeof value === 'string') return BigInt(value);
  if (value && typeof (value as any).toString === 'function') {
    return BigInt((value as any).toString());
  }
  return 0n;
}

/**
 * Format a token amount with decimals
 * Accepts BigInt, BN, or number-like values
 */
export function formatAmount(amount: bigint | unknown, decimals: number = 9): string {
  const amountBigInt = toBigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = amountBigInt / divisor;
  const fraction = amountBigInt % divisor;

  if (fraction === 0n) {
    return whole.toString();
  }

  const fractionStr = fraction.toString().padStart(decimals, '0');
  // Remove trailing zeros
  const trimmed = fractionStr.replace(/0+$/, '');
  return `${whole}.${trimmed}`;
}

/**
 * Parse a user-input amount string to bigint
 */
export function parseAmount(input: string, decimals: number = 9): bigint {
  const trimmed = input.trim();
  if (!trimmed || trimmed === '.') return 0n;

  const parts = trimmed.split('.');
  const whole = BigInt(parts[0] || '0');

  let fraction = 0n;
  if (parts[1]) {
    const fractionStr = parts[1].slice(0, decimals).padEnd(decimals, '0');
    fraction = BigInt(fractionStr);
  }

  return whole * BigInt(10 ** decimals) + fraction;
}

/**
 * Truncate an address for display
 */
export function truncateAddress(address: string | PublicKey, chars: number = 4): string {
  const str = typeof address === 'string' ? address : address.toBase58();
  if (str.length <= chars * 2 + 3) return str;
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

/**
 * Format SOL amount (always 9 decimals)
 */
export function formatSol(lamports: bigint): string {
  return formatAmount(lamports, 9);
}

/**
 * Validate a Solana public key
 */
export function isValidPublicKey(input: string): boolean {
  try {
    new PublicKey(input);
    return true;
  } catch {
    return false;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format a transaction signature for display
 */
export function formatSignature(signature: string, chars: number = 8): string {
  if (signature.length <= chars * 2 + 3) return signature;
  return `${signature.slice(0, chars)}...${signature.slice(-chars)}`;
}

/**
 * Get Solana explorer URL
 */
export function getExplorerUrl(
  signature: string,
  network: 'devnet' | 'mainnet-beta' = 'devnet'
): string {
  const base = 'https://explorer.solana.com/tx';
  const cluster = network === 'devnet' ? '?cluster=devnet' : '';
  return `${base}/${signature}${cluster}`;
}

/**
 * Format a date as relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) {
    return 'just now';
  } else if (diffMin < 60) {
    return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
  } else if (diffHour < 24) {
    return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
  } else if (diffDay < 7) {
    return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
}

/**
 * Format USD amount for display
 */
export function formatUsd(amount: number): string {
  if (amount === 0) return '$0.00';

  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(2)}M`;
  }

  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(2)}K`;
  }

  if (amount < 0.01) {
    return `$${amount.toFixed(6)}`;
  }

  return `$${amount.toFixed(2)}`;
}
