import { PublicKey } from '@solana/web3.js';

// CloakCraft Program
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || 'FKaC6fnSJYBrssPCtwh94hwg3C38xKzUDAxaK8mfjX3a'
);

// Network Configuration
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
export const INDEXER_URL = process.env.NEXT_PUBLIC_INDEXER_URL || 'https://indexer.cloakcraft.io';
export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as 'devnet' | 'mainnet-beta';
export const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

// Address Lookup Tables for transaction compression
export const ADDRESS_LOOKUP_TABLES = [
  '3B7MRpzeNnX9uaf1SuJqgNwjtJLLCKQp2Go2hexcxGHa', // Devnet ALT
];

// Supported Tokens (Devnet)
export interface TokenInfo {
  symbol: string;
  name: string;
  mint: PublicKey;
  decimals: number;
  logoUri?: string;
}

export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    symbol: 'WSOL',
    name: 'Wrapped SOL',
    mint: new PublicKey('So11111111111111111111111111111111111111112'),
    decimals: 9,
    logoUri: '/tokens/sol.svg',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'), // Devnet USDC
    decimals: 6,
    logoUri: '/tokens/usdc.svg',
  },
  {
    symbol: 'TEST',
    name: 'CloakCraft Test Token',
    mint: new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm'),
    decimals: 6,
    logoUri: '/tokens/test.svg',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'), // Devnet USDT
    decimals: 6,
    logoUri: '/tokens/usdt.svg',
  },
];

// Get token info by mint
export function getTokenInfo(mint: PublicKey | string): TokenInfo | undefined {
  const mintStr = typeof mint === 'string' ? mint : mint.toBase58();
  return SUPPORTED_TOKENS.find((t) => t.mint.toBase58() === mintStr);
}

// Get token decimals (defaults to 9 if unknown)
export function getTokenDecimals(mint: PublicKey | string): number {
  return getTokenInfo(mint)?.decimals ?? 9;
}

// Explorer URLs
export const EXPLORER_BASE_URL = 'https://explorer.solana.com';

export function getExplorerTxUrl(signature: string): string {
  const cluster = NETWORK === 'devnet' ? '?cluster=devnet' : '';
  return `${EXPLORER_BASE_URL}/tx/${signature}${cluster}`;
}

export function getExplorerAddressUrl(address: string | PublicKey): string {
  const addr = typeof address === 'string' ? address : address.toBase58();
  const cluster = NETWORK === 'devnet' ? '?cluster=devnet' : '';
  return `${EXPLORER_BASE_URL}/address/${addr}${cluster}`;
}
