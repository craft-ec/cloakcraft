# Address Lookup Tables (ALTs) Guide

## Overview

Address Lookup Tables (ALTs) compress account references from **32 bytes to 1 byte**, enabling larger transactions to fit within Solana's 1232 byte limit.

**Without ALTs:**
- Add liquidity: ~75-100 accounts × 32 bytes = 2400-3200 bytes ❌
- **Result:** Serialization fails, falls back to sequential execution

**With ALTs:**
- Add liquidity: ~75-100 accounts × 1 byte = 75-100 bytes ✅
- **Result:** Atomic execution with single signature!

## Quick Start

### 1. Create an ALT

Run the provided script to create and populate an ALT:

```bash
npx ts-node scripts/create-alt.ts
```

This will:
1. Create a new Address Lookup Table
2. Add all common CloakCraft accounts (program, Light Protocol trees, etc.)
3. Save the ALT address to `.alt-config.json`
4. Print configuration code to use in your app

**Output:**
```
✅ ALT created successfully!

Address: 8yK3QmAbJz9kDvXz4QKcRfLmN5pEwVx2YqH7TvU3bKdP

📝 Add this to your CloakCraftClient config:

const client = new CloakCraftClient({
  rpcUrl: 'https://api.devnet.solana.com',
  indexerUrl: 'http://localhost:3000',
  programId: new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP'),
  heliusApiKey: 'your-api-key',
  network: 'devnet',
  addressLookupTables: [
    new PublicKey('8yK3QmAbJz9kDvXz4QKcRfLmN5pEwVx2YqH7TvU3bKdP'),
  ],
});
```

### 2. Update Your Client Configuration

Add the `addressLookupTables` field to your client config:

```typescript
import { CloakCraftClient } from '@cloakcraft/sdk';
import { PublicKey } from '@solana/web3.js';

const client = new CloakCraftClient({
  rpcUrl: 'https://api.devnet.solana.com',
  indexerUrl: 'http://localhost:3000',
  programId: new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP'),
  heliusApiKey: process.env.HELIUS_API_KEY!,
  network: 'devnet',
  // ⬇️ Add this
  addressLookupTables: [
    new PublicKey('YOUR_ALT_ADDRESS_HERE'),
  ],
});
```

### 3. That's It!

Now atomic execution will work for add liquidity:

```typescript
// This will now succeed atomically (single signature)
const result = await client.addLiquidity({
  inputA: noteA,
  inputB: noteB,
  poolId: ammPoolPubkey,
  lpMint: lpTokenMint,
  depositA: 1_000_000_000n,
  depositB: 2_000_000_000n,
  lpAmount: 1_414_213_562n,
  minLpAmount: 1_400_000_000n,
  lpRecipient: lpAddress,
  changeARecipient: changeAAddress,
  changeBRecipient: changeBAddress,
});

console.log('✅ Atomic execution succeeded!');
```

**Console output:**
```
[Add Liquidity] Attempting atomic execution with versioned transaction...
[Add Liquidity] Built 7 instructions for atomic execution
[Add Liquidity] Using 1 Address Lookup Tables for compression
[Add Liquidity] Versioned transaction size: 856/1232 bytes ✅
[Add Liquidity] Executing atomic transaction...
[Add Liquidity] Atomic execution successful!
```

## How ALTs Work

### Account Compression

**Without ALT:**
```
Transaction accounts:
  [0] Program: fBh7...RTP (32 bytes)
  [1] Pool A: GnAM...8RkW (32 bytes)
  [2] Pool B: HPYa...jeHaG (32 bytes)
  ... 95 more accounts × 32 bytes
Total: ~3000 bytes ❌ Exceeds limit
```

**With ALT:**
```
Transaction accounts:
  [0] ALT reference: 0 (1 byte)
  [1] ALT reference: 1 (1 byte)
  [2] ALT reference: 2 (1 byte)
  ... 95 more references × 1 byte
Total: ~150 bytes ✅ Fits easily!
```

### Savings

For a typical add liquidity transaction:
- **Accounts:** ~80 accounts
- **Savings:** 80 accounts × 31 bytes = **2480 bytes saved**
- **Result:** Transaction fits within 1232 byte limit

## Advanced Usage

### Manual ALT Creation

If you need custom control:

```typescript
import {
  createCloakCraftALT,
  getLightProtocolCommonAccounts,
  type CloakCraftALTAccounts,
} from '@cloakcraft/sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const authority = Keypair.generate(); // Your authority

// Get Light Protocol accounts for your network
const lightAccounts = getLightProtocolCommonAccounts('devnet');

// Define accounts to add to ALT
const accounts: CloakCraftALTAccounts = {
  program: new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP'),
  lightProtocol: new PublicKey('SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7'),
  stateTrees: lightAccounts.stateTrees,
  addressTrees: lightAccounts.addressTrees,
  nullifierQueues: lightAccounts.nullifierQueues,
  systemProgram: new PublicKey('11111111111111111111111111111111'),
  tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
};

// Create and populate ALT
const altAddress = await createCloakCraftALT(connection, authority, accounts);

console.log(`ALT created: ${altAddress.toBase58()}`);
```

### Adding Custom Accounts

If you have frequently used accounts (e.g., your pools), add them to the ALT:

```typescript
import { extendAddressLookupTable } from '@cloakcraft/sdk';
import { Transaction, sendAndConfirmTransaction } from '@solana/web3.js';

// Your custom pool addresses
const customAccounts = [
  new PublicKey('YourPool1...'),
  new PublicKey('YourPool2...'),
  new PublicKey('YourPool3...'),
];

// Extend the existing ALT
const extendIx = extendAddressLookupTable(
  altAddress,
  authority.publicKey,
  customAccounts
);

const tx = new Transaction().add(extendIx);
const sig = await sendAndConfirmTransaction(connection, tx, [authority]);

console.log(`Extended ALT: ${sig}`);
```

### Multiple ALTs

You can use multiple ALTs if needed:

```typescript
const client = new CloakCraftClient({
  // ... other config
  addressLookupTables: [
    new PublicKey('ALT_1_ADDRESS'), // Common accounts
    new PublicKey('ALT_2_ADDRESS'), // Custom pools
    new PublicKey('ALT_3_ADDRESS'), // Additional accounts
  ],
});
```

**Note:** Each transaction can reference up to 256 ALTs, but typically 1-2 is sufficient.

## Costs

Creating and populating an ALT has one-time costs:

- **Create ALT:** ~0.002 SOL
- **Extend with 30 accounts:** ~0.00002 SOL per account = ~0.0006 SOL
- **Total:** ~0.003 SOL (< $0.001 at current prices)

**This is a one-time setup cost.** The ALT can be reused forever by all users of your application.

## Best Practices

### 1. Create One ALT Per Network

Create separate ALTs for devnet and mainnet:

```typescript
// Devnet ALT
const devnetALT = new PublicKey('...');

// Mainnet ALT (when deploying)
const mainnetALT = new PublicKey('...');

const client = new CloakCraftClient({
  // ... other config
  network: isMainnet ? 'mainnet-beta' : 'devnet',
  addressLookupTables: [
    isMainnet ? mainnetALT : devnetALT,
  ],
});
```

### 2. Include All Frequently Used Accounts

Add accounts that appear in most transactions:
- ✅ Program IDs
- ✅ Light Protocol Merkle trees
- ✅ System/Token programs
- ✅ Common pools
- ❌ User-specific accounts (defeats the purpose)

### 3. Share ALTs Across Users

ALTs are **public and reusable**. Once created, all users can reference the same ALT to get compression benefits.

Store the ALT address in your config and share it across all client instances:

```typescript
// config.ts
export const CLOAKCRAFT_ALT_DEVNET = new PublicKey('8yK3QmAbJz9kDvXz4QKcRfLmN5pEwVx2YqH7TvU3bKdP');

// app.ts
const client = new CloakCraftClient({
  // ... other config
  addressLookupTables: [CLOAKCRAFT_ALT_DEVNET],
});
```

### 4. Monitor ALT Performance

Check console logs to verify ALT is being used:

```
[Add Liquidity] Using 1 Address Lookup Tables for compression
[Add Liquidity] Versioned transaction size: 856/1232 bytes
```

If you don't see these logs, ALT may not be loaded correctly.

## Troubleshooting

### "ALT not found" Warning

```
[ALT] Lookup table not found: 8yK3QmAbJz9kDvXz4QKcRfLmN5pEwVx2YqH7TvU3bKdP
```

**Cause:** ALT doesn't exist at that address

**Solution:** Run `npx ts-node scripts/create-alt.ts` to create it

### "Failed to preload ALTs" Error

**Cause:** Network connection issue or invalid ALT address

**Solution:**
1. Check your RPC URL is correct
2. Verify the ALT address is valid
3. Check you're on the right network (devnet vs mainnet)

### Still Falls Back to Sequential

```
[Add Liquidity] Transaction serialization failed, falling back to sequential execution
```

**Possible causes:**
1. ALT not loaded (check for "Using N Address Lookup Tables" log)
2. ALT doesn't contain all necessary accounts
3. Transaction is still too large (rare with proper ALT)

**Solution:**
1. Verify ALT is configured in client
2. Check ALT was created successfully
3. Ensure all Light Protocol accounts are in the ALT

### Transaction Size Didn't Decrease Much

**Cause:** Most accounts are not in the ALT

**Solution:** Verify the ALT contains:
- CloakCraft program ID
- Light Protocol program ID
- All Light Protocol Merkle tree accounts
- System and Token programs

Run `scripts/create-alt.ts` to ensure proper setup.

## Performance Impact

With ALTs enabled:

| Operation | Without ALT | With ALT | Result |
|-----------|-------------|----------|--------|
| **Swap** | ~1000 bytes | ~600 bytes | ✅ Atomic |
| **Add Liquidity** | ~3000 bytes (fails) | ~850 bytes | ✅ Atomic |
| **Remove Liquidity** | ~1200 bytes | ~700 bytes | ✅ Atomic |
| **Transfer** | ~900 bytes | ~550 bytes | ✅ Atomic |

**Signatures required:**
- Without ALT: 4-5 signatures (sequential fallback)
- With ALT: **1 signature** (atomic execution)

## Conclusion

Address Lookup Tables are **essential** for atomic execution of complex operations like add liquidity. They:

- ✅ Enable single-signature atomic transactions
- ✅ Reduce transaction size by ~70%
- ✅ Cost < $0.001 for one-time setup
- ✅ Can be shared across all users
- ✅ Are required for production deployments

**Setup time:** 5 minutes
**Cost:** ~0.003 SOL
**Benefit:** Atomic execution for all operations

Run `npx ts-node scripts/create-alt.ts` now to enable atomic transactions!
