/**
 * Transaction History Module
 *
 * Tracks and persists transaction history for privacy operations.
 * Uses IndexedDB for browser storage with fallback to localStorage.
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Transaction type enum
 */
export enum TransactionType {
  SHIELD = 'shield',
  UNSHIELD = 'unshield',
  TRANSFER = 'transfer',
  SWAP = 'swap',
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
}

/**
 * Transaction status enum
 */
export enum TransactionStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * Transaction record
 */
export interface TransactionRecord {
  /** Unique transaction ID */
  id: string;
  /** Transaction type */
  type: TransactionType;
  /** Transaction status */
  status: TransactionStatus;
  /** Transaction signature (if confirmed) */
  signature?: string;
  /** Timestamp (ISO string) */
  timestamp: string;
  /** Token mint address */
  tokenMint: string;
  /** Token symbol (for display) */
  tokenSymbol?: string;
  /** Amount in lamports/smallest unit */
  amount: string; // bigint as string for serialization
  /** Secondary amount (for swaps/liquidity) */
  secondaryAmount?: string;
  /** Secondary token mint (for swaps/liquidity) */
  secondaryTokenMint?: string;
  /** Secondary token symbol */
  secondaryTokenSymbol?: string;
  /** Recipient address (for transfers/unshield) */
  recipient?: string;
  /** Error message (if failed) */
  error?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Transaction history filter options
 */
export interface TransactionFilter {
  /** Filter by type */
  type?: TransactionType;
  /** Filter by status */
  status?: TransactionStatus;
  /** Filter by token mint */
  tokenMint?: string;
  /** Filter after this date */
  after?: Date;
  /** Filter before this date */
  before?: Date;
  /** Maximum number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Storage key prefix for transaction history
 */
const STORAGE_KEY_PREFIX = 'cloakcraft_tx_history_';

/**
 * IndexedDB database name
 */
const DB_NAME = 'CloakCraftHistory';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

/**
 * Transaction history manager
 */
export class TransactionHistory {
  private readonly walletId: string;
  private db: IDBDatabase | null = null;
  private useIndexedDB: boolean = false;

  constructor(walletPublicKey: string | PublicKey) {
    this.walletId = typeof walletPublicKey === 'string'
      ? walletPublicKey
      : walletPublicKey.toBase58();
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      this.useIndexedDB = false;
      return;
    }

    try {
      this.db = await this.openDatabase();
      this.useIndexedDB = true;
    } catch (err) {
      console.warn('[TransactionHistory] IndexedDB not available, falling back to localStorage');
      this.useIndexedDB = false;
    }
  }

  /**
   * Open IndexedDB database
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('walletId', 'walletId', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('tokenMint', 'tokenMint', { unique: false });
        }
      };
    });
  }

  /**
   * Generate a unique transaction ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Add a new transaction record
   */
  async addTransaction(
    params: Omit<TransactionRecord, 'id' | 'timestamp'>
  ): Promise<TransactionRecord> {
    const record: TransactionRecord = {
      ...params,
      id: this.generateId(),
      timestamp: new Date().toISOString(),
    };

    if (this.useIndexedDB && this.db) {
      await this.saveToIndexedDB(record);
    } else {
      this.saveToLocalStorage(record);
    }

    return record;
  }

  /**
   * Update an existing transaction record
   */
  async updateTransaction(
    id: string,
    updates: Partial<Omit<TransactionRecord, 'id' | 'timestamp'>>
  ): Promise<TransactionRecord | null> {
    const existing = await this.getTransaction(id);
    if (!existing) return null;

    const updated: TransactionRecord = {
      ...existing,
      ...updates,
    };

    if (this.useIndexedDB && this.db) {
      await this.saveToIndexedDB(updated);
    } else {
      this.saveToLocalStorage(updated);
    }

    return updated;
  }

  /**
   * Get a single transaction by ID
   */
  async getTransaction(id: string): Promise<TransactionRecord | null> {
    if (this.useIndexedDB && this.db) {
      return this.getFromIndexedDB(id);
    }
    return this.getFromLocalStorage(id);
  }

  /**
   * Get transaction history with optional filters
   */
  async getTransactions(filter?: TransactionFilter): Promise<TransactionRecord[]> {
    let transactions: TransactionRecord[];

    if (this.useIndexedDB && this.db) {
      transactions = await this.getAllFromIndexedDB();
    } else {
      transactions = this.getAllFromLocalStorage();
    }

    // Apply filters
    if (filter) {
      transactions = transactions.filter((tx) => {
        if (filter.type && tx.type !== filter.type) return false;
        if (filter.status && tx.status !== filter.status) return false;
        if (filter.tokenMint && tx.tokenMint !== filter.tokenMint) return false;
        if (filter.after && new Date(tx.timestamp) < filter.after) return false;
        if (filter.before && new Date(tx.timestamp) > filter.before) return false;
        return true;
      });
    }

    // Sort by timestamp descending (most recent first)
    transactions.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    // Apply pagination
    if (filter?.offset) {
      transactions = transactions.slice(filter.offset);
    }
    if (filter?.limit) {
      transactions = transactions.slice(0, filter.limit);
    }

    return transactions;
  }

  /**
   * Get recent transactions
   */
  async getRecentTransactions(limit: number = 10): Promise<TransactionRecord[]> {
    return this.getTransactions({ limit });
  }

  /**
   * Delete a transaction record
   */
  async deleteTransaction(id: string): Promise<boolean> {
    if (this.useIndexedDB && this.db) {
      return this.deleteFromIndexedDB(id);
    }
    return this.deleteFromLocalStorage(id);
  }

  /**
   * Clear all transaction history
   */
  async clearHistory(): Promise<void> {
    if (this.useIndexedDB && this.db) {
      await this.clearIndexedDB();
    } else {
      this.clearLocalStorage();
    }
  }

  /**
   * Get transaction count
   */
  async getTransactionCount(filter?: TransactionFilter): Promise<number> {
    const transactions = await this.getTransactions(filter);
    return transactions.length;
  }

  /**
   * Get transaction summary (counts by type and status)
   */
  async getSummary(): Promise<{
    total: number;
    byType: Record<TransactionType, number>;
    byStatus: Record<TransactionStatus, number>;
  }> {
    const transactions = await this.getTransactions();

    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const tx of transactions) {
      byType[tx.type] = (byType[tx.type] || 0) + 1;
      byStatus[tx.status] = (byStatus[tx.status] || 0) + 1;
    }

    return {
      total: transactions.length,
      byType: byType as Record<TransactionType, number>,
      byStatus: byStatus as Record<TransactionStatus, number>,
    };
  }

  // =========================================================================
  // IndexedDB Methods
  // =========================================================================

  private async saveToIndexedDB(record: TransactionRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ ...record, walletId: this.walletId });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  private async getFromIndexedDB(id: string): Promise<TransactionRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.walletId === this.walletId) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { walletId, ...record } = result;
          resolve(record as TransactionRecord);
        } else {
          resolve(null);
        }
      };
    });
  }

  private async getAllFromIndexedDB(): Promise<TransactionRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('walletId');
      const request = index.getAll(this.walletId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const results = request.result.map((r: any) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { walletId, ...record } = r;
          return record as TransactionRecord;
        });
        resolve(results);
      };
    });
  }

  private async deleteFromIndexedDB(id: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    // First check if it belongs to this wallet
    const existing = await this.getFromIndexedDB(id);
    if (!existing) return false;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(true);
    });
  }

  private async clearIndexedDB(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Get all records for this wallet and delete them
    const records = await this.getAllFromIndexedDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      let completed = 0;
      const total = records.length;

      if (total === 0) {
        resolve();
        return;
      }

      for (const record of records) {
        const request = store.delete(record.id);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
      }
    });
  }

  // =========================================================================
  // LocalStorage Methods (fallback)
  // =========================================================================

  private getStorageKey(): string {
    return `${STORAGE_KEY_PREFIX}${this.walletId}`;
  }

  private saveToLocalStorage(record: TransactionRecord): void {
    const key = this.getStorageKey();
    const existing = this.getAllFromLocalStorage();
    const index = existing.findIndex((t) => t.id === record.id);

    if (index >= 0) {
      existing[index] = record;
    } else {
      existing.push(record);
    }

    try {
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (err) {
      console.error('[TransactionHistory] Failed to save to localStorage:', err);
    }
  }

  private getFromLocalStorage(id: string): TransactionRecord | null {
    const all = this.getAllFromLocalStorage();
    return all.find((t) => t.id === id) || null;
  }

  private getAllFromLocalStorage(): TransactionRecord[] {
    const key = this.getStorageKey();
    try {
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data) as TransactionRecord[];
    } catch {
      return [];
    }
  }

  private deleteFromLocalStorage(id: string): boolean {
    const key = this.getStorageKey();
    const existing = this.getAllFromLocalStorage();
    const filtered = existing.filter((t) => t.id !== id);

    if (filtered.length === existing.length) return false;

    try {
      localStorage.setItem(key, JSON.stringify(filtered));
      return true;
    } catch {
      return false;
    }
  }

  private clearLocalStorage(): void {
    const key = this.getStorageKey();
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  }
}

/**
 * Create a pending transaction record
 */
export function createPendingTransaction(
  type: TransactionType,
  tokenMint: string | PublicKey,
  amount: bigint,
  options?: {
    tokenSymbol?: string;
    secondaryAmount?: bigint;
    secondaryTokenMint?: string | PublicKey;
    secondaryTokenSymbol?: string;
    recipient?: string;
    metadata?: Record<string, unknown>;
  }
): Omit<TransactionRecord, 'id' | 'timestamp'> {
  return {
    type,
    status: TransactionStatus.PENDING,
    tokenMint: typeof tokenMint === 'string' ? tokenMint : tokenMint.toBase58(),
    tokenSymbol: options?.tokenSymbol,
    amount: amount.toString(),
    secondaryAmount: options?.secondaryAmount?.toString(),
    secondaryTokenMint: options?.secondaryTokenMint
      ? (typeof options.secondaryTokenMint === 'string'
          ? options.secondaryTokenMint
          : options.secondaryTokenMint.toBase58())
      : undefined,
    secondaryTokenSymbol: options?.secondaryTokenSymbol,
    recipient: options?.recipient,
    metadata: options?.metadata,
  };
}
