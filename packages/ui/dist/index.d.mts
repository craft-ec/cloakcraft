export { CloakCraftProvider } from '@cloakcraft/hooks';
import * as react_jsx_runtime from 'react/jsx-runtime';
import { PublicKey } from '@solana/web3.js';

/**
 * Wallet connection button component
 */
interface WalletButtonProps {
    className?: string;
}
declare function WalletButton({ className }: WalletButtonProps): react_jsx_runtime.JSX.Element;

interface BalanceDisplayProps {
    tokenMint: PublicKey;
    decimals?: number;
    symbol?: string;
    className?: string;
}
declare function BalanceDisplay({ tokenMint, decimals, symbol, className, }: BalanceDisplayProps): react_jsx_runtime.JSX.Element;

interface ShieldFormProps {
    tokenMint: PublicKey;
    decimals?: number;
    onSuccess?: (signature: string) => void;
    className?: string;
}
declare function ShieldForm({ tokenMint, decimals, onSuccess, className, }: ShieldFormProps): react_jsx_runtime.JSX.Element;

interface TransferFormProps {
    tokenMint: PublicKey;
    decimals?: number;
    onSuccess?: (signature: string) => void;
    className?: string;
}
declare function TransferForm({ tokenMint, decimals, onSuccess, className, }: TransferFormProps): react_jsx_runtime.JSX.Element;

interface NotesListProps {
    tokenMint: PublicKey;
    decimals?: number;
    symbol?: string;
    className?: string;
}
declare function NotesList({ tokenMint, decimals, symbol, className, }: NotesListProps): react_jsx_runtime.JSX.Element;

/**
 * Order book component for the private market
 */
interface OrderBookProps {
    className?: string;
}
declare function OrderBook({ className }: OrderBookProps): react_jsx_runtime.JSX.Element;

export { BalanceDisplay, NotesList, OrderBook, ShieldForm, TransferForm, WalletButton };
