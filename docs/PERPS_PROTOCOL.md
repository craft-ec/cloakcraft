# CloakCraft Perpetual Futures Protocol

Privacy-preserving perpetual futures trading with ZK proofs and multi-token liquidity pools.

## Overview

CloakCraft Perps implements a **lending-based perpetual futures system** inspired by Jupiter's JLP (Jupiter Liquidity Provider) model. The key innovation is integrating **zero-knowledge proofs** to enable private positions and liquidity operations while maintaining on-chain verifiability.

### Key Features

- **Privacy-Preserving**: Position details (margin, leverage, direction, entry price) are hidden in encrypted commitments
- **Multi-Token Liquidity Pool**: Single LP token representing share of diverse asset pool (SOL, USDC, ETH, BTC)
- **Up to 100x Leverage**: Configurable max leverage per pool
- **Bounded Profit Model**: Max profit equals margin (prevents pool drain attacks)
- **Utilization-Based Fees**: Dynamic borrow rates based on pool utilization
- **Pyth Oracle Integration**: Real-time price feeds for accurate PnL calculation

## Architecture

### Circuit Architecture

The system uses 5 Circom circuits for different operations:

| Circuit | Purpose | Public Inputs |
|---------|---------|---------------|
| `open_position` | Open leveraged position | merkle_root, nullifier, position_commitment, change_commitment, margin, leverage, etc. |
| `close_position` | Close position with settlement | position_nullifier, settlement_commitment, exit_price, pnl, is_profit |
| `add_liquidity` | Deposit tokens for LP shares | nullifier, lp_commitment, deposit_amount, lp_amount_minted |
| `remove_liquidity` | Burn LP for token withdrawal | lp_nullifier, output_commitment, withdraw_amount, lp_burned |
| `liquidate` | Liquidate undercollateralized position | position_nullifier, owner_commitment, liquidator_commitment |

### Commitment Types

**Position Commitment** (Domain: 8):
```
Poseidon(
  Poseidon(domain, stealth_pub_x, market_id, is_long, margin),
  size, leverage, entry_price, randomness
)
```

**LP Commitment** (Domain: 9):
```
Poseidon(domain, stealth_pub_x, pool_id, lp_amount, randomness)
```

### On-Chain Accounts

1. **PerpsPool**: Multi-token liquidity pool with up to 8 tokens
   - LP mint, position mint
   - Token configurations (vault, Pyth feed, balance, locked)
   - Pool parameters (max leverage, fees, utilization limits)

2. **PerpsMarket**: Trading pair within a pool
   - Base/quote token indices
   - Long/short open interest
   - Max position size

## Trading Flow

### Opening a Position

```
User                    Relayer                 Program
  │                        │                       │
  │ 1. Select margin note  │                       │
  │ 2. Generate ZK proof   │                       │
  │──── proof + inputs ───>│                       │
  │                        │ Phase 0: Verify proof │
  │                        │──────────────────────>│
  │                        │ Phase 1: Verify input │
  │                        │──────────────────────>│
  │                        │ Phase 2: Create nullifier
  │                        │──────────────────────>│
  │                        │ Phase 3: Execute (lock tokens, update OI)
  │                        │──────────────────────>│
  │                        │ Phase 4: Create position commitment
  │                        │──────────────────────>│
  │<─── tx signatures ─────│<──────────────────────│
```

**Position Opening Logic:**
1. User spends margin commitment (proves ownership via nullifier)
2. Creates position commitment with all position details
3. Pool locks tokens proportional to position size
4. Market updates open interest

### Closing a Position

1. User spends position commitment (proves ownership)
2. PnL calculated based on:
   - Entry vs exit price (from Pyth oracle)
   - Position direction (long/short)
   - Accumulated borrow fees
3. **Bounded profit**: Max profit = margin (prevents catastrophic pool losses)
4. Settlement commitment created with `margin ± PnL - fees`
5. Pool unlocks tokens, market reduces open interest

### Liquidation

Positions become liquidatable when:
```
effective_margin <= margin × liquidation_threshold_bps / 10000
```

Liquidation splits remaining margin:
- **Liquidator reward**: Incentive for triggering liquidation
- **Owner remainder**: Any leftover after liquidation penalty

## Liquidity Provision

### Single Token Deposit Model

Unlike traditional AMMs requiring token pairs, perps pools accept **any supported token**:

1. User deposits Token A (e.g., SOL)
2. Deposit value calculated via oracle: `deposit_amount × oracle_price`
3. LP tokens minted: `deposit_value × lp_supply / total_pool_value`
4. User receives LP commitment (private LP balance)

### Withdrawal

1. User burns LP tokens (LP nullifier)
2. Can withdraw **any** supported token (up to available balance)
3. Withdrawal amount: `lp_burned × total_value / lp_supply` converted to token
4. Constrained by utilization limit (e.g., can't push utilization > 80%)

### LP Value Calculation

```typescript
// Total pool value = sum of all token balances × oracle prices
total_value = Σ(token.balance × token.oracle_price / 10^token.decimals)

// Value per LP token
value_per_lp = total_value / lp_supply
```

## Fee Structure

| Fee Type | Description | Typical Value |
|----------|-------------|---------------|
| Position Fee | Opening/closing positions | 6 bps (0.06%) |
| Imbalance Fee | Opening in dominant direction | 0-3 bps |
| Borrow Fee | Hourly rate on borrowed capital | 1 bps/hour base |
| Liquidation Penalty | Deducted from liquidated margin | 50 bps (0.5%) |

### Borrow Fee Scaling

```
borrow_rate = base_rate × (1 + utilization_ratio)
```

At 80% utilization: rate = 1.8× base rate

## Security Model

### What's Private

- Position owner identity (via stealth addresses)
- Position details (margin, leverage, size, entry price)
- LP balances
- Transaction graph between operations

### What's Public

- Merkle roots (commitment membership)
- Nullifiers (spent note tracking)
- Pool-level aggregates (total OI, LP supply, token balances)
- Oracle prices

### ZK Proof Guarantees

1. **Balance Conservation**: Input amounts = output amounts + fees
2. **Commitment Validity**: All commitments follow correct structure
3. **Ownership**: Only spending key holder can create valid nullifier
4. **Range Bounds**: All values fit in 64 bits (no overflow attacks)
5. **Leverage Limits**: Leverage within pool-defined bounds (1-100)

## SDK Reference

### Types

```typescript
interface PerpsPosition {
  commitment: Uint8Array;
  market: PublicKey;
  direction: 'long' | 'short';
  margin: bigint;
  size: bigint;
  leverage: number;
  entryPrice: bigint;
  entryBorrowFee: bigint;
  leafIndex: number;
}

interface PerpsPoolState {
  poolId: PublicKey;
  lpMint: PublicKey;
  lpSupply: bigint;
  numTokens: number;
  tokens: PerpsToken[];
  maxLeverage: number;
  positionFeeBps: number;
  maxUtilizationBps: number;
  // ...
}
```

### Calculations

```typescript
import {
  calculatePnL,
  calculateLiquidationPrice,
  calculateLpValue,
  calculateLpMintAmount,
  calculateWithdrawAmount,
  isValidLeverage,
  wouldExceedUtilization,
} from '@cloakcraft/sdk';

// PnL calculation
const pnl = calculatePnL(position, currentPrice, pool, timestamp);
// Returns: { pnl, isProfit, pnlBps, effectiveMargin, borrowFees, settlementAmount, isLiquidatable }

// Liquidation price
const liqPrice = calculateLiquidationPrice(position, pool, timestamp);
// Returns: { price, distanceBps }
```

### Instructions

```typescript
import {
  buildOpenPositionWithProgram,
  buildClosePositionWithProgram,
  buildAddPerpsLiquidityWithProgram,
  buildRemovePerpsLiquidityWithProgram,
  buildInitializePerpsPoolWithProgram,
  buildAddTokenToPoolWithProgram,
  buildAddMarketWithProgram,
} from '@cloakcraft/sdk';
```

## Admin Operations

### Initialize Pool

```typescript
await buildInitializePerpsPoolWithProgram(program, {
  poolId: Keypair.generate().publicKey,
  authority: adminPubkey,
  payer: adminPubkey,
  maxLeverage: 100,
  positionFeeBps: 6,
  maxUtilizationBps: 8000,
  liquidationThresholdBps: 50,
  liquidationPenaltyBps: 50,
  baseBorrowRateBps: 1,
});
```

### Add Token to Pool

```typescript
import { PYTH_FEED_IDS } from '@cloakcraft/sdk';

await buildAddTokenToPoolWithProgram(program, {
  perpsPool: poolPda,
  tokenMint: SOL_MINT,
  pythFeedId: PYTH_FEED_IDS.SOL_USD, // 32-byte Pyth price feed ID
  authority: adminPubkey,
  payer: adminPubkey,
});
```

### Add Market

```typescript
const marketId = new Uint8Array(32);
marketId.set(Buffer.from('SOL/USD'));

await buildAddMarketWithProgram(program, {
  perpsPool: poolPda,
  marketId,
  baseTokenIndex: 0,  // SOL
  quoteTokenIndex: 1, // USDC
  maxPositionSize: 1_000_000_000_000n, // 1M USD
  authority: adminPubkey,
  payer: adminPubkey,
});
```

## Testing

The e2e test suite covers:

| Test | Description |
|------|-------------|
| `init-perps-pool` | Pool initialization with config |
| `add-perps-liq` | Adding single-token liquidity |
| `open-long` | Opening long position |
| `open-short` | Opening short position |
| `close-position` | Closing position with PnL |
| `leverage-2x`, `leverage-10x` | Different leverage levels |
| `loss-close` | Closing at a loss |
| `remove-perps-liq` | Removing liquidity |

Run specific category:
```bash
pnpm run test:e2e -- --category=perps
```

## Future Enhancements

1. **Funding Rate**: Periodic payments between longs and shorts
2. **Partial Close**: Close portion of position
3. **Add/Remove Margin**: Adjust position collateral
4. **Keeper Network**: Automated liquidation and fee updates
5. **Cross-Margin**: Share collateral across positions
6. **Advanced Order Types**: Stop loss, take profit orders

---

*Last updated: January 2025*
