# CloakCraft API Reference

## SDK Installation

```bash
npm install @cloakcraft/sdk
# or
pnpm add @cloakcraft/sdk
```

## Quick Start

```typescript
import { CloakCraftClient } from '@cloakcraft/sdk';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com');
const keypair = Keypair.generate();
const client = new CloakCraftClient(connection, keypair);

await client.setProgram(programId);
```

---

## Client API

### CloakCraftClient

Main entry point for all operations.

#### Constructor

```typescript
new CloakCraftClient(
  connection: Connection,
  keypair: Keypair,
  options?: {
    commitment?: Commitment;
    skipPreflight?: boolean;
  }
)
```

#### setProgram

Initialize client with program ID.

```typescript
await client.setProgram(programId: PublicKey): Promise<void>
```

---

## Pool Operations

### initializePool

Create a new private token pool.

```typescript
await client.initializePool(
  tokenMint: PublicKey,
  payer: Keypair
): Promise<{
  signature: string;
  pool: PublicKey;
}>
```

### getPool

Fetch pool information.

```typescript
await client.getPool(
  pool: PublicKey
): Promise<{
  mint: PublicKey;
  vault: PublicKey;
  totalDeposited: bigint;
  commitmentRoot: Uint8Array;
}>
```

---

## Shield Operations

### shield

Deposit public tokens into private pool.

```typescript
await client.shield(
  params: {
    tokenMint: PublicKey;
    amount: bigint;
    recipient: StealthAddress;
  },
  payer: Keypair
): Promise<{
  signature: string;
  note: PrivateNote;
  commitment: Uint8Array;
}>
```

**Parameters:**
- `tokenMint`: SPL token to deposit
- `amount`: Amount in smallest units (lamports)
- `recipient`: Stealth address to receive note

**Returns:**
- `note`: Store this securely - needed to spend

---

## Transfer Operations

### transact

Private transfer between stealth addresses.

```typescript
await client.transact(
  params: {
    inputs: PrivateNote[];
    outputs: {
      recipient: StealthAddress;
      amount: bigint;
      tokenMint: PublicKey;
    }[];
    circuitType: 'transfer_1x2' | 'transfer_2x2';
  },
  payer?: Keypair
): Promise<{
  signature: string;
  outputNotes: PrivateNote[];
  proof: Groth16Proof;
}>
```

**Circuit Selection:**
- `transfer_1x2`: 1 input note → 2 output notes
- `transfer_2x2`: 2 input notes → 2 output notes

**Note:** Output notes are automatically created. The second output is typically "change" back to sender.

---

## Unshield Operations

### unshield

Withdraw private tokens to public account.

```typescript
await client.unshield(
  params: {
    input: PrivateNote;
    publicRecipient: PublicKey;
    amount: bigint;
    changeRecipient?: StealthAddress;
    tokenMint: PublicKey;
  }
): Promise<{
  signature: string;
  changeNote?: PrivateNote;
}>
```

---

## AMM Operations

### initializeAmmPool

Create a new AMM liquidity pool.

```typescript
await client.initializeAmmPool(
  params: {
    tokenA: PublicKey;
    tokenB: PublicKey;
    initialLiquidityA: bigint;
    initialLiquidityB: bigint;
  },
  payer: Keypair
): Promise<{
  signature: string;
  poolId: PublicKey;
}>
```

### swap

Execute a private AMM swap.

```typescript
await client.swap(
  params: {
    input: PrivateNote;
    poolId: PublicKey;
    swapDirection: 'aToB' | 'bToA';
    inputAmount: bigint;
    minOutput: bigint;
    outputRecipient: StealthAddress;
    changeRecipient: StealthAddress;
  }
): Promise<{
  signature: string;
  outputNote: PrivateNote;
  changeNote: PrivateNote;
  actualOutput: bigint;
}>
```

---

## Order Book Operations

### createOrder

Place a private limit order.

```typescript
await client.createOrder(
  params: {
    input: PrivateNote;
    orderType: 'buy' | 'sell';
    price: bigint;
    amount: bigint;
    tokenPair: [PublicKey, PublicKey];
  }
): Promise<{
  signature: string;
  orderId: Uint8Array;
}>
```

### cancelOrder

Cancel an existing order.

```typescript
await client.cancelOrder(
  params: {
    orderId: Uint8Array;
    refundRecipient: StealthAddress;
  }
): Promise<{
  signature: string;
  refundNote: PrivateNote;
}>
```

---

## Governance Operations

### vote

Cast a private vote.

```typescript
await client.vote(
  params: {
    proposalId: PublicKey;
    choice: number;
    weight: bigint;
    voterNote: PrivateNote;
  }
): Promise<{
  signature: string;
  voteCommitment: Uint8Array;
}>
```

---

## Cryptographic Utilities

### generateStealthAddress

Create a new stealth address for receiving.

```typescript
import { generateStealthAddress } from '@cloakcraft/sdk';

const { stealthAddress, viewingKey, spendingKey } = generateStealthAddress();
```

### deriveSharedSecret

Derive shared secret for note encryption.

```typescript
import { deriveSharedSecret } from '@cloakcraft/sdk';

const secret = deriveSharedSecret(
  privateKey: Uint8Array,
  publicKey: Uint8Array
): Uint8Array
```

### poseidonHash

Compute Poseidon hash (ZK-friendly).

```typescript
import { poseidonHash } from '@cloakcraft/sdk';

const hash = poseidonHash(inputs: bigint[]): bigint
```

---

## Scanner

### NoteScanner

Detect and track notes belonging to a viewing key.

```typescript
import { NoteScanner } from '@cloakcraft/sdk';

const scanner = new NoteScanner(connection, programId);

// Scan for notes
const notes = await scanner.scan(
  viewingKey: Uint8Array,
  fromSlot?: number
): Promise<PrivateNote[]>

// Get total balance
const balance = await scanner.getBalance(
  viewingKey: Uint8Array,
  tokenMint: PublicKey
): Promise<bigint>

// Subscribe to new notes
scanner.subscribe(
  viewingKey: Uint8Array,
  callback: (note: PrivateNote) => void
): () => void // returns unsubscribe function
```

---

## Types

### PrivateNote

```typescript
interface PrivateNote {
  commitment: Uint8Array;
  amount: bigint;
  tokenMint: PublicKey;
  owner: StealthAddress;
  blinding: bigint;
  nullifier: Uint8Array;
}
```

### StealthAddress

```typescript
interface StealthAddress {
  publicKey: Uint8Array;
  viewingKey: Uint8Array;
}
```

### Groth16Proof

```typescript
interface Groth16Proof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  publicSignals: string[];
}
```

---

## Error Codes

| Code | Name | Description |
|------|------|-------------|
| 6000 | InvalidProof | ZK proof verification failed |
| 6001 | NullifierExists | Note already spent |
| 6002 | InsufficientBalance | Pool lacks funds |
| 6003 | InvalidCommitment | Commitment not in tree |
| 6004 | AmountMismatch | Input/output sums differ |
| 6005 | InvalidRecipient | Malformed stealth address |

---

## Examples

### Full Private Transfer Flow

```typescript
import { CloakCraftClient, generateStealthAddress, NoteScanner } from '@cloakcraft/sdk';

// Setup
const client = new CloakCraftClient(connection, keypair);
await client.setProgram(programId);

// Generate addresses
const alice = generateStealthAddress();
const bob = generateStealthAddress();

// Shield tokens (public → private)
const { note: aliceNote } = await client.shield({
  tokenMint: USDC_MINT,
  amount: 1_000_000n, // 1 USDC
  recipient: alice.stealthAddress,
}, keypair);

// Private transfer Alice → Bob
const { outputNotes } = await client.transact({
  inputs: [aliceNote],
  outputs: [
    { recipient: bob.stealthAddress, amount: 700_000n, tokenMint: USDC_MINT },
    { recipient: alice.stealthAddress, amount: 300_000n, tokenMint: USDC_MINT }, // change
  ],
  circuitType: 'transfer_1x2',
});

// Bob scans for his note
const scanner = new NoteScanner(connection, programId);
const bobNotes = await scanner.scan(bob.viewingKey);

// Bob unshields to public
await client.unshield({
  input: bobNotes[0],
  publicRecipient: bobPublicKey,
  amount: 700_000n,
  tokenMint: USDC_MINT,
});
```
