/**
 * Address Lookup Table (ALT) Management
 *
 * ALTs compress account references from 32 bytes to 1 byte,
 * enabling larger transactions to fit within the 1232 byte limit.
 */

import {
  Connection,
  PublicKey,
  TransactionInstruction,
  AddressLookupTableProgram,
  AddressLookupTableAccount,
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

/**
 * Common accounts that appear in most CloakCraft transactions
 * These should be added to the ALT for maximum compression benefit
 */
export interface CloakCraftALTAccounts {
  /** CloakCraft program ID */
  program: PublicKey;
  /** Light Protocol program ID */
  lightProtocol: PublicKey;
  /** Light Protocol state tree accounts (frequently used) */
  stateTrees: PublicKey[];
  /** Light Protocol address tree accounts */
  addressTrees: PublicKey[];
  /** Light Protocol nullifier queue accounts */
  nullifierQueues: PublicKey[];
  /** Light Protocol additional system accounts */
  systemAccounts: PublicKey[];
  /** System program */
  systemProgram: PublicKey;
  /** Token program */
  tokenProgram: PublicKey;
}

/**
 * Create a new Address Lookup Table
 *
 * @param connection - Solana connection
 * @param authority - ALT authority (must sign)
 * @param recentSlot - Recent slot for ALT creation
 * @returns ALT address and creation instruction
 */
export async function createAddressLookupTable(
  connection: Connection,
  authority: PublicKey,
  recentSlot?: number
): Promise<{ address: PublicKey; instruction: TransactionInstruction }> {
  const slot = recentSlot ?? (await connection.getSlot());

  const [instruction, address] = AddressLookupTableProgram.createLookupTable({
    authority,
    payer: authority,
    recentSlot: slot,
  });

  console.log(`[ALT] Created lookup table at ${address.toBase58()}`);

  return { address, instruction };
}

/**
 * Extend an Address Lookup Table with new addresses
 *
 * @param address - ALT address
 * @param authority - ALT authority (must sign)
 * @param addresses - Addresses to add
 * @returns Extend instruction
 */
export function extendAddressLookupTable(
  address: PublicKey,
  authority: PublicKey,
  addresses: PublicKey[]
): TransactionInstruction {
  console.log(`[ALT] Extending lookup table with ${addresses.length} addresses`);

  return AddressLookupTableProgram.extendLookupTable({
    lookupTable: address,
    authority,
    payer: authority,
    addresses,
  });
}

/**
 * Fetch an Address Lookup Table account
 *
 * @param connection - Solana connection
 * @param address - ALT address
 * @returns ALT account or null if doesn't exist
 */
export async function fetchAddressLookupTable(
  connection: Connection,
  address: PublicKey
): Promise<AddressLookupTableAccount | null> {
  try {
    const accountInfo = await connection.getAddressLookupTable(address);

    if (!accountInfo.value) {
      console.warn(`[ALT] Lookup table not found: ${address.toBase58()}`);
      return null;
    }

    console.log(`[ALT] Loaded lookup table with ${accountInfo.value.state.addresses.length} addresses`);
    return accountInfo.value;
  } catch (err) {
    console.error(`[ALT] Failed to fetch lookup table:`, err);
    return null;
  }
}

/**
 * Create and populate a CloakCraft ALT with common accounts
 *
 * This is a helper that creates an ALT and adds all common CloakCraft accounts.
 * Should be called once during setup.
 *
 * @param connection - Solana connection
 * @param authority - Authority keypair
 * @param accounts - Common CloakCraft accounts to add
 * @returns ALT address
 */
export async function createCloakCraftALT(
  connection: Connection,
  authority: Keypair,
  accounts: CloakCraftALTAccounts
): Promise<PublicKey> {
  console.log('[ALT] Creating CloakCraft Address Lookup Table...');

  // Step 1: Create the ALT
  const { address, instruction: createIx } = await createAddressLookupTable(
    connection,
    authority.publicKey
  );

  const createTx = new Transaction().add(createIx);
  const createSig = await sendAndConfirmTransaction(connection, createTx, [authority]);
  console.log(`[ALT] Created ALT: ${address.toBase58()} (${createSig})`);

  // Wait 1 slot for ALT to be activated
  await new Promise(resolve => setTimeout(resolve, 500));

  // Step 2: Extend with all common accounts
  const allAddresses = [
    accounts.program,
    accounts.lightProtocol,
    ...accounts.stateTrees,
    ...accounts.addressTrees,
    ...accounts.nullifierQueues,
    ...accounts.systemAccounts,
    accounts.systemProgram,
    accounts.tokenProgram,
  ];

  // ALT can hold up to 256 addresses per extend, so batch if needed
  const BATCH_SIZE = 30; // Conservative batch size
  for (let i = 0; i < allAddresses.length; i += BATCH_SIZE) {
    const batch = allAddresses.slice(i, i + BATCH_SIZE);
    const extendIx = extendAddressLookupTable(address, authority.publicKey, batch);

    const extendTx = new Transaction().add(extendIx);
    const extendSig = await sendAndConfirmTransaction(connection, extendTx, [authority]);
    console.log(`[ALT] Extended ALT with ${batch.length} addresses (${extendSig})`);

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`[ALT] CloakCraft ALT ready: ${address.toBase58()}`);
  console.log(`[ALT] Total addresses: ${allAddresses.length}`);

  return address;
}

/**
 * Get Light Protocol common accounts for ALT
 *
 * These are the Merkle tree accounts that appear in every Light Protocol operation.
 *
 * @param network - Network (mainnet-beta or devnet)
 * @returns Light Protocol account addresses
 */
export function getLightProtocolCommonAccounts(network: 'mainnet-beta' | 'devnet'): {
  stateTrees: PublicKey[];
  addressTrees: PublicKey[];
  nullifierQueues: PublicKey[];
  systemAccounts: PublicKey[];
} {
  // Light Protocol default tree accounts
  // These are the same accounts used in DEVNET_LIGHT_TREES / MAINNET_LIGHT_TREES

  if (network === 'devnet') {
    return {
      stateTrees: [
        new PublicKey('BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW'), // State tree 0
      ],
      addressTrees: [
        new PublicKey('F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A'), // Address tree 0
      ],
      nullifierQueues: [
        new PublicKey('8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z'), // Nullifier queue 0
      ],
      // Additional Light Protocol system accounts (from PackedAccounts)
      systemAccounts: [
        new PublicKey('94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3'),
        new PublicKey('35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh'),
        new PublicKey('HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA'),
        new PublicKey('compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq'),
        new PublicKey('oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto'),
      ],
    };
  } else {
    // Mainnet - will need to update with actual mainnet addresses
    return {
      stateTrees: [
        new PublicKey('BUta4jaruGP4PUGMEHtRgRwTXAc2VUEHd4Q1wjcBxmPW'), // Placeholder
      ],
      addressTrees: [
        new PublicKey('F4D5pWMHU1xWiLkhtQQ4YPF8vbL5zYMqxU6LkU5cKA4A'), // Placeholder
      ],
      nullifierQueues: [
        new PublicKey('8ahYLkPTy4BKgm8kKMPiPDEi4XLBxMHBKfHBgZH5yD6Z'), // Placeholder
      ],
      systemAccounts: [
        new PublicKey('94bRd3oaTpx8FzBJHu4EmwW18wkVN14DibDeLJqLkwD3'), // Placeholder
        new PublicKey('35hkDgaAKwMCaxRz2ocSZ6NaUrtKkyNqU6c4RV3tYJRh'), // Placeholder
        new PublicKey('HwXnGK3tPkkVY6P439H2p68AxpeuWXd5PcrAxFpbmfbA'), // Placeholder
        new PublicKey('compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq'), // Placeholder
        new PublicKey('oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto'), // Placeholder
      ],
    };
  }
}

/**
 * ALT Manager - Caches loaded ALTs for reuse
 */
export class ALTManager {
  private cache: Map<string, AddressLookupTableAccount> = new Map();
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Get an ALT account (from cache or fetch)
   */
  async get(address: PublicKey): Promise<AddressLookupTableAccount | null> {
    const key = address.toBase58();

    // Check cache
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Fetch and cache
    const alt = await fetchAddressLookupTable(this.connection, address);
    if (alt) {
      this.cache.set(key, alt);
    }

    return alt;
  }

  /**
   * Preload multiple ALTs
   */
  async preload(addresses: PublicKey[]): Promise<void> {
    await Promise.all(addresses.map(addr => this.get(addr)));
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache.clear();
  }
}
