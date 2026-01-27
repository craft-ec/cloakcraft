# CloakCraft Architecture

## System Overview

CloakCraft is a privacy-preserving DeFi protocol on Solana using zero-knowledge proofs.

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface                          │
│                    (React + Next.js)                         │
├─────────────────────────────────────────────────────────────┤
│                      SDK / Hooks                             │
│                     (TypeScript)                             │
├─────────────────────────────────────────────────────────────┤
│                    Anchor Program                            │
│                  (Rust on Solana)                            │
├─────────────────────────────────────────────────────────────┤
│                   Light Protocol                             │
│              (Compressed State Trees)                        │
├─────────────────────────────────────────────────────────────┤
│                   Circom Circuits                            │
│                 (ZK Proof Generation)                        │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Circom Circuits (`circom-circuits/`)

Zero-knowledge circuits that prove transaction validity without revealing details.

| Circuit | Purpose | Constraints |
|---------|---------|-------------|
| `transfer_1x2` | 1 input → 2 outputs | ~15k |
| `transfer_2x2` | 2 inputs → 2 outputs | ~25k |
| `shield` | Public → Private | ~8k |
| `unshield` | Private → Public | ~12k |
| `swap` | AMM swap | ~30k |
| `order` | Limit order | ~20k |
| `vote` | Private vote | ~18k |

**Cryptographic Primitives:**
- **Curve**: BabyJubJub (twisted Edwards)
- **Hash**: Poseidon (ZK-friendly)
- **Proof System**: Groth16 (SnarkJS)

### 2. Anchor Program (`programs/cloakcraft/`)

On-chain logic for verifying proofs and managing state.

```
programs/cloakcraft/src/
├── lib.rs                 # Program entry
├── instructions/
│   ├── initialize.rs      # Pool setup
│   ├── shield.rs          # Deposit tokens
│   ├── unshield.rs        # Withdraw tokens
│   ├── transact.rs        # Private transfer
│   ├── swap.rs            # AMM operations
│   └── governance/        # Voting system
├── state/
│   ├── pool.rs            # Token pool state
│   ├── note.rs            # UTXO note structure
│   └── verifier.rs        # Proof verification keys
└── crypto/
    └── groth16.rs         # On-chain verifier
```

### 3. TypeScript SDK (`packages/sdk/`)

Client library for proof generation and transaction building.

```typescript
// Core modules
client.ts       // Main API
proofs.ts       // Proof generation with snarkjs
crypto/         // Key derivation, stealth addresses
instructions/   // Transaction builders
scanner.ts      // Note detection and balance tracking
```

### 4. Light Protocol Integration

Compressed accounts reduce storage costs by 5000x.

```
Traditional Account: 128 bytes × $0.00089/byte = $0.11/account
Compressed Account:  ~32 bytes in Merkle tree   = $0.00002/account
```

**State Trees:**
- `commitment_tree`: Active note commitments
- `nullifier_tree`: Spent note nullifiers

## Data Flow

### Shield (Public → Private)

```
1. User has public SPL tokens
2. SDK generates commitment = Poseidon(amount, token, owner, blinding)
3. SDK builds shield transaction
4. Program transfers tokens to pool vault
5. Program inserts commitment into Merkle tree
6. User stores note locally (encrypted)
```

### Private Transfer

```
1. User selects input notes (knows secrets)
2. SDK generates ZK proof proving:
   - Ownership of input notes
   - Input amounts = Output amounts
   - Notes exist in commitment tree
   - Nullifiers are fresh (not spent)
3. Program verifies proof on-chain
4. Program inserts output commitments
5. Program inserts input nullifiers
6. Recipients scan for their notes
```

### Unshield (Private → Public)

```
1. User proves ownership of private note
2. SDK generates unshield proof
3. Program verifies and nullifies input
4. Program transfers SPL tokens from vault
5. Recipient receives public tokens
```

## Security Model

### What's Private

| Data | Visibility |
|------|------------|
| Transaction amounts | Hidden (in proof) |
| Sender identity | Hidden (stealth address) |
| Recipient identity | Hidden (stealth address) |
| Token type | Public (pool-specific) |
| Transaction existence | Public (on-chain) |

### Trust Assumptions

1. **Trusted Setup**: Groth16 requires ceremony (future: PLONK migration)
2. **Light Protocol**: Compressed state correctness
3. **Solana Validators**: Transaction ordering
4. **Client Security**: Local key storage

### Attack Vectors & Mitigations

| Attack | Mitigation |
|--------|------------|
| Double spend | Nullifier tree |
| Note forgery | Commitment verification in ZK |
| Amount manipulation | Sum equality in circuit |
| Metadata leakage | Fixed transaction sizes |

## Performance

### Proof Generation (Client-side)

| Circuit | Time (M1 Mac) | Memory |
|---------|---------------|--------|
| transfer_1x2 | ~3s | ~500MB |
| transfer_2x2 | ~5s | ~800MB |
| swap | ~6s | ~1GB |

### On-chain Verification

| Operation | Compute Units |
|-----------|---------------|
| Groth16 verify | ~200k CU |
| Merkle insert | ~50k CU |
| Total transfer | ~300k CU |

## Diagrams

### Note Lifecycle

```
┌──────────┐     shield      ┌──────────┐     transfer    ┌──────────┐
│  Public  │ ───────────────►│  Active  │ ──────────────►│  Spent   │
│  Tokens  │                 │   Note   │                 │  (null)  │
└──────────┘                 └──────────┘                 └──────────┘
                                  │                            
                                  │ unshield                   
                                  ▼                            
                             ┌──────────┐                      
                             │  Public  │                      
                             │  Tokens  │                      
                             └──────────┘                      
```

### Account Structure

```
Pool
├── vault (SPL token account)
├── commitment_tree (Light Protocol)
├── nullifier_tree (Light Protocol)
└── verifier_keys[]

Note (off-chain, encrypted)
├── amount
├── token_mint
├── owner_pubkey
├── blinding
└── commitment
```

## Future Architecture

### Planned Improvements

1. **PLONK Migration**: Remove trusted setup
2. **Recursive Proofs**: Batch multiple operations
3. **Multi-chain**: Bridge to other chains
4. **Hardware Wallet**: Secure key derivation
