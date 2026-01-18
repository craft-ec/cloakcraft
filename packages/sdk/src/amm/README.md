# AMM Module

Provides calculation utilities for CloakCraft's Automated Market Maker (AMM) functionality.

## Features

- **Swap Calculations**: Calculate output amounts, price impact, and slippage
- **Liquidity Management**: Add and remove liquidity with optimal ratios
- **Pool State Management**: Fetch and manage AMM pool state
- **Price Discovery**: Calculate price ratios and total liquidity

## Usage

### Swap Calculations

```typescript
import { calculateSwapOutputUnified, calculateMinOutput, PoolType } from '@cloakcraft/sdk';

// Calculate expected output for a swap (supports both ConstantProduct and StableSwap)
const { outputAmount, priceImpact } = calculateSwapOutputUnified(
  1000n, // input amount
  100000n, // input token reserve
  200000n, // output token reserve
  PoolType.ConstantProduct, // or PoolType.StableSwap for stablecoins
  30 // fee in basis points (0.3%)
);

// For StableSwap pools, include amplification parameter
const stableOutput = calculateSwapOutputUnified(
  1000n,
  100000n,
  100000n,
  PoolType.StableSwap,
  4, // lower fee for stables (0.04%)
  200n // amplification coefficient
);

// Calculate minimum output with slippage tolerance
const minOutput = calculateMinOutput(
  outputAmount,
  50 // 0.5% slippage tolerance
);

console.log(`Output: ${outputAmount}, Min: ${minOutput}, Impact: ${priceImpact}%`);
```

### Add Liquidity

```typescript
import { calculateAddLiquidityAmounts } from '@cloakcraft/sdk';

// Calculate optimal deposit amounts
const { depositA, depositB, lpAmount } = calculateAddLiquidityAmounts(
  10000n, // desired token A
  20000n, // desired token B
  50000n, // current reserve A
  100000n, // current reserve B
  70710n // current LP supply
);

console.log(`Deposit: ${depositA} A, ${depositB} B`);
console.log(`Receive: ${lpAmount} LP tokens`);
```

### Remove Liquidity

```typescript
import { calculateRemoveLiquidityOutput } from '@cloakcraft/sdk';

// Calculate output amounts for burning LP tokens
const { outputA, outputB } = calculateRemoveLiquidityOutput(
  10000n, // LP tokens to burn
  100000n, // total LP supply
  500000n, // reserve A
  1000000n // reserve B
);

console.log(`Receive: ${outputA} token A, ${outputB} token B`);
```

### Fetch Pool State

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { fetchAmmPool, formatAmmPool } from '@cloakcraft/sdk';

const connection = new Connection('https://api.devnet.solana.com');
const poolPda = new PublicKey('...');

const pool = await fetchAmmPool(connection, poolPda);
const formatted = formatAmmPool(pool);

console.log('Pool:', {
  reserveA: formatted.reserveA,
  reserveB: formatted.reserveB,
  priceRatio: formatted.priceRatio,
  lpSupply: formatted.lpSupply,
});
```

### Compute State Hash

```typescript
import { computeAmmStateHash } from '@cloakcraft/sdk';
import { PublicKey } from '@solana/web3.js';

const stateHash = computeAmmStateHash(
  500000n, // reserve A
  1000000n, // reserve B
  70710n, // LP supply
  new PublicKey('...') // pool ID
);

console.log('State hash:', Buffer.from(stateHash).toString('hex'));
```

## Validation

```typescript
import { validateSwapAmount, validateLiquidityAmounts } from '@cloakcraft/sdk';

// Validate swap parameters
const error = validateSwapAmount(
  1000n, // amount to swap
  5000n, // max balance
  50 // slippage in bps
);

if (error) {
  console.error('Invalid swap:', error);
}

// Validate liquidity parameters
const liquidityError = validateLiquidityAmounts(
  10000n, // amount A
  20000n, // amount B
  50000n, // balance A
  100000n // balance B
);

if (liquidityError) {
  console.error('Invalid liquidity:', liquidityError);
}
```

## Constants

- Default fee: 30 basis points (0.3%)
- LP token decimals: 9
- Price ratio: Token B per Token A

## Formulas

### Constant Product (for volatile pairs)

Uses the constant product formula: `x * y = k`

**Swap output:**
```
output = (reserveOut * inputAmount * (10000 - fee)) /
         ((reserveIn * 10000) + (inputAmount * (10000 - fee)))
```

### StableSwap (for pegged assets)

Uses Curve-style invariant optimized for assets that should trade near 1:1:
```
A * n² * sum(x) + D = A * D * n² + D³ / (n² * prod(x))
```

Where A is the amplification coefficient (higher = flatter curve near peg).

**Price impact:**
```
impact = |priceAfter - priceBefore| / priceBefore * 100
```

### Liquidity

**Add liquidity:**
```
lpAmount = min(
  depositA * lpSupply / reserveA,
  depositB * lpSupply / reserveB
)
```

**Remove liquidity:**
```
outputA = lpAmount * reserveA / lpSupply
outputB = lpAmount * reserveB / lpSupply
```

**Bootstrap (first liquidity):**
```
lpAmount = sqrt(depositA * depositB)
```

## Types

All functions use bigint for token amounts to avoid precision loss.

See `@cloakcraft/types` for full type definitions:
- `AmmPoolState`
- `SwapParams`
- `AddLiquidityParams`
- `RemoveLiquidityParams`
