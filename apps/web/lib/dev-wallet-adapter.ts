'use client';

import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletReadyState,
  WalletNotConnectedError,
} from '@solana/wallet-adapter-base';
import { Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

export const DevWalletName = 'Dev Wallet' as WalletName<'Dev Wallet'>;

/**
 * Development wallet adapter that uses a pre-configured keypair.
 * ONLY FOR DEVELOPMENT/TESTING - never use in production!
 */
export class DevWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = DevWalletName;
  url = 'https://localhost';
  icon = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzQiIGhlaWdodD0iMzQiIHZpZXdCb3g9IjAgMCAzNCAzNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNyIgY3k9IjE3IiByPSIxNyIgZmlsbD0iIzRCNUU3MiIvPjx0ZXh0IHg9IjE3IiB5PSIyMiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiPkQ8L3RleHQ+PC9zdmc+';
  supportedTransactionVersions = new Set(['legacy', 0] as const);

  private _connecting = false;
  private _keypair: Keypair | null = null;
  private _publicKey: PublicKey | null = null;
  private _readyState: WalletReadyState = WalletReadyState.Loadable;

  constructor(keypair?: Keypair) {
    super();
    if (keypair) {
      this._keypair = keypair;
    }
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get readyState(): WalletReadyState {
    return this._readyState;
  }

  async connect(): Promise<void> {
    try {
      if (this.connected || this.connecting) return;

      this._connecting = true;

      // If no keypair provided, generate a new one (burner)
      if (!this._keypair) {
        this._keypair = Keypair.generate();
        console.log('[DevWallet] Generated new keypair:', this._keypair.publicKey.toBase58());
      }

      this._publicKey = this._keypair.publicKey;
      this._readyState = WalletReadyState.Installed;

      this.emit('connect', this._publicKey);
      console.log('[DevWallet] Connected:', this._publicKey.toBase58());
    } catch (error: any) {
      this.emit('error', error);
      throw error;
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    this._publicKey = null;
    this.emit('disconnect');
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(transaction: T): Promise<T> {
    if (!this._keypair) throw new WalletNotConnectedError();

    if (transaction instanceof Transaction) {
      transaction.partialSign(this._keypair);
    } else {
      // VersionedTransaction
      transaction.sign([this._keypair]);
    }

    return transaction;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(transactions: T[]): Promise<T[]> {
    return Promise.all(transactions.map((tx) => this.signTransaction(tx)));
  }

  async signMessage(_message: Uint8Array): Promise<Uint8Array> {
    // Dev wallet adapter - signMessage not implemented
    // Use a real wallet adapter for production
    throw new Error('signMessage not supported in DevWalletAdapter');
  }
}

/**
 * Create a dev wallet from a keypair file (e.g., ~/.config/solana/id.json)
 */
export function createDevWalletFromKeypair(secretKey: number[]): DevWalletAdapter {
  const keypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
  return new DevWalletAdapter(keypair);
}
