# CLAUDE.md - CloakCraft

This file provides context for AI assistants working with this codebase.

## Project Overview

**CloakCraft** is a privacy-preserving DeFi protocol on Solana using zero-knowledge proofs. It enables private token transfers, swaps, trading, and governance without revealing transaction details.

**Key Innovation**: UTXO-like note system with Groth16 proofs on Solana, using Light Protocol for compressed state storage.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Circuits | Circom 2.1 (Groth16) |
| On-chain | Anchor/Rust |
| SDK | TypeScript |
| Crypto | BabyJubJub, Poseidon, ChaCha20 |
| Compression | Light Protocol |

## Key Commands

```bash
# Setup
pnpm install
cd circom-circuits && ./build-all.sh  # First time only

# Development
anchor localnet                        # Start validator
anchor build && anchor deploy          # Deploy program
npx ts-node scripts/register-vkeys.ts  # Register verification keys
anchor test                            # Run tests

# Testing
anchor test                            # All tests
npx ts-node scripts/e2e-full-system.ts # E2E test
npx ts-node scripts/e2e-amm-swap-test.ts

# SDK
cd packages/sdk && pnpm build
cd packages/sdk && pnpm test
```

## Architecture Summary

```
User → SDK (generates ZK proof) → Anchor Program (verifies proof) → Light Protocol (stores commitments)
```

**Core Flow:**
1. **Shield**: Deposit public tokens → create private note
2. **Transfer**: Spend notes → create new notes (ZK proof ensures validity)
3. **Unshield**: Destroy note → receive public tokens

## Directory Structure

```
cloakcraft/
├── circom-circuits/          # ZK circuits (CRITICAL - security-sensitive)
│   ├── transfer/             # transfer_1x2, transfer_2x2
│   ├── swap/                 # AMM swap circuits
│   ├── market/               # Order book circuits
│   └── lib/                  # Shared: poseidon, eddsa, merkle
├── programs/cloakcraft/      # Anchor program
│   └── src/
│       ├── instructions/     # shield, unshield, transact, swap
│       ├── state/            # Pool, Note, Verifier accounts
│       └── crypto/           # On-chain Groth16 verifier
├── packages/
│   ├── sdk/                  # Main client library
│   ├── hooks/                # React hooks
│   └── types/                # Shared TypeScript types
└── apps/demo/                # Next.js demo app
```

## Important Files

| File | Purpose |
|------|---------|
| `programs/cloakcraft/src/lib.rs` | Program entry point |
| `programs/cloakcraft/src/instructions/transact.rs` | Private transfer logic |
| `packages/sdk/src/client.ts` | Main SDK API |
| `packages/sdk/src/proofs.ts` | Proof generation |
| `circom-circuits/transfer/transfer_1x2.circom` | Core transfer circuit |
| `circom-circuits/lib/poseidon.circom` | Poseidon hash |

## Code Quality Rules

1. **No Placeholders**: Never use stubs or TODO for core functionality
2. **Real Dependencies**: Install and use proper libraries (e.g., @lightprotocol/stateless.js for Poseidon)
3. **No Workarounds**: Don't substitute (e.g., SHA256 instead of Poseidon)
4. **Clean Commits**: No signatures or co-authored-by in commits

## Common Patterns

### Adding New Circuit
1. Create in `circom-circuits/new-circuit/`
2. Add to `build-all.sh`
3. Create corresponding instruction in program
4. Add SDK methods
5. Register verification key

### Private Transfer Flow
```typescript
// SDK usage pattern
const client = new CloakCraftClient(connection, keypair);
await client.setProgram(programId);

// Shield → Transfer → Unshield
const { note } = await client.shield({ tokenMint, amount, recipient });
const { outputNotes } = await client.transact({ inputs: [note], outputs: [...] });
await client.unshield({ input: outputNotes[0], publicRecipient });
```

## Security Notes

- **Circuits are security-critical** - any change requires careful review
- **Trusted setup** - Groth16 requires ceremony for production
- **Key storage** - Notes contain secrets, must be encrypted client-side
- **Nullifiers** - Prevent double-spending, must be checked on-chain

## Testing Approach

- **Unit tests**: `anchor test` for program, `pnpm test` for SDK
- **E2E tests**: Scripts in `scripts/e2e-*.ts`
- **Circuit tests**: `circom-circuits/test/`

## Known Issues / TODOs

- Governance SDK implementation in progress (circuits complete)
- Scanner performance optimization needed
- PLONK migration planned (remove trusted setup)
