# CloakCraft

Privacy-preserving decentralized finance protocol on Solana using zero-knowledge proofs.

## Overview

CloakCraft enables private token transfers, swaps, trading, and governance on Solana using zero-knowledge proofs and stealth addresses. Built with Circom circuits, Light Protocol compression, and Anchor programs.

## Features

### Core Privacy
- **Private Transfers**: Zero-knowledge proofs hide transaction amounts and participants
- **Stealth Addresses**: Recipient privacy through one-time addresses
- **Note System**: UTXO-like model with encrypted notes on-chain
- **Multi-token Support**: Works with any SPL token

### DeFi Primitives
- **AMM Swaps**: Private automated market maker with liquidity pools
- **Order Book**: Private limit orders with encrypted order creation
- **Governance**: Encrypted voting with threshold decryption

## Architecture

```
┌─────────────────┐
│   React UI      │  Next.js demo app
├─────────────────┤
│   SDK/Hooks     │  TypeScript client library
├─────────────────┤
│ Anchor Program  │  Solana on-chain logic
├─────────────────┤
│ Light Protocol  │  Compressed state trees
├─────────────────┤
│ Circom Circuits │  ZK proof generation
└─────────────────┘
```

### Tech Stack

- **Circuits**: Circom for zero-knowledge proof circuits
- **On-chain**: Anchor (Rust) for Solana programs
- **SDK**: TypeScript with Solana Web3.js
- **UI**: React + Next.js
- **Privacy**: Light Protocol for compressed accounts
- **Crypto**: BabyJubJub curve, Poseidon hash, Groth16 proofs

## Setup

### Prerequisites

```bash
# Node.js 18+
node --version

# pnpm package manager
npm install -g pnpm

# Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Anchor framework
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest

# Circom and snarkjs
npm install -g circom snarkjs
```

### Installation

```bash
# Clone repository
git clone https://github.com/craft-ec/cloakcraft.git
cd cloakcraft

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Generate Circuit Keys

Circuit proving and verification keys are excluded from git (224MB). Regenerate them:

```bash
# Build all Circom circuits and generate keys
cd circom-circuits
./build-all.sh

# Keys will be generated in keys/ directory
```

This creates:
- `keys/*.pk` - Proving keys for client-side proof generation
- `keys/*.vk` - Verification keys for on-chain verification

### Start Local Development

```bash
# Terminal 1: Start Solana localnet
anchor localnet

# Terminal 2: Deploy program
anchor build
anchor deploy

# Terminal 3: Register verification keys on-chain
npx ts-node scripts/register-vkeys.ts

# Terminal 4: Start demo app
cd apps/demo
pnpm dev
```

Visit `http://localhost:3000` to use the demo app.

## Usage

### Initialize a Token Pool

```typescript
import { CloakCraftClient } from '@cloakcraft/sdk';
import { Keypair } from '@solana/web3.js';

const client = new CloakCraftClient(connection, keypair);
await client.setProgram(programId);

// Initialize pool for token
await client.initializePool(tokenMint, payer);
```

### Shield Tokens (Public → Private)

```typescript
// Deposit public tokens into private pool
const result = await client.shield({
  tokenMint,
  amount: BigInt(1000000), // 1 token with 6 decimals
  recipient: myStealthAddress,
}, payer);
```

### Private Transfer

```typescript
// Transfer private notes to another user
const result = await client.transact({
  inputs: [myNote1, myNote2],
  outputs: [
    {
      recipient: recipientStealthAddress,
      amount: BigInt(1500000),
      tokenMint,
    },
    {
      recipient: myChangeAddress,
      amount: BigInt(500000),
      tokenMint,
    }
  ],
  circuitType: 'transfer_1x2',
});
```

### Unshield (Private → Public)

```typescript
// Withdraw to public Solana account
const result = await client.unshield({
  input: myPrivateNote,
  publicRecipient: publicKey,
  amount: BigInt(1000000),
  changeRecipient: myStealthAddress,
  tokenMint,
});
```

### AMM Swap

```typescript
// Swap tokens using private AMM
const result = await client.swap({
  input: myNote,
  poolId: poolPublicKey,
  swapDirection: 'aToB',
  inputAmount: BigInt(1000000),
  minOutput: BigInt(990000),
  outputRecipient: myStealthAddress,
  changeRecipient: myStealthAddress,
});
```

## Project Structure

```
cloakcraft/
├── circom-circuits/        # ZK circuit definitions
│   ├── transfer/           # Private transfer circuits
│   ├── swap/              # AMM swap circuits
│   ├── market/            # Order book circuits
│   ├── governance/        # Voting circuits
│   └── lib/               # Shared circuit components
├── programs/
│   └── cloakcraft/        # Anchor Solana program
│       ├── src/
│       │   ├── instructions/  # Program instructions
│       │   ├── state/        # Account state definitions
│       │   └── crypto/       # On-chain crypto helpers
├── packages/
│   ├── sdk/               # TypeScript SDK
│   │   ├── src/
│   │   │   ├── client.ts     # Main client API
│   │   │   ├── proofs.ts     # Proof generation
│   │   │   ├── crypto/       # Cryptographic primitives
│   │   │   └── instructions/ # Instruction builders
│   ├── hooks/             # React hooks
│   ├── ui/               # React UI components
│   └── types/            # Shared TypeScript types
├── apps/
│   └── demo/             # Next.js demo application
├── scripts/              # Testing and deployment scripts
└── keys/                # Circuit keys (generated)
```

## Testing

### Unit Tests

```bash
# Test SDK
cd packages/sdk
pnpm test

# Test Anchor program
anchor test
```

### E2E Tests

```bash
# Full system test: shield → transfer → unshield
npx ts-node scripts/e2e-full-system.ts

# AMM swap test
npx ts-node scripts/e2e-amm-swap-test.ts

# Order book test
npx ts-node scripts/e2e-market-test.ts

# Scanner test
npx ts-node scripts/e2e-scanner-test.ts
```

## How It Works

### Note System

CloakCraft uses a UTXO-like model where tokens exist as "notes" - encrypted records on-chain:

```
Note = {
  amount: encrypted,
  token: public,
  owner: stealth_address,
  commitment: Poseidon(amount, token, owner, blinding)
}
```

### Zero-Knowledge Proofs

Every private transaction proves:
1. **Ownership**: "I know the private key for these input notes"
2. **Validity**: "Input amounts equal output amounts"
3. **Uniqueness**: "These notes haven't been spent before"

All without revealing amounts or identities.

### Stealth Addresses

Recipients generate one-time addresses using:
```
stealth_address = hash(recipient_public_key, ephemeral_public_key)
```

Only the recipient can detect and decrypt notes sent to their stealth addresses.

### Light Protocol Integration

CloakCraft uses Light Protocol's compressed accounts to store commitments and nullifiers efficiently in Merkle trees, reducing storage costs by 5000x.

## Security Considerations

- **Audits**: Not yet audited - use at your own risk
- **Testnet Only**: Currently designed for devnet/testnet
- **Key Management**: Store private keys securely
- **Circuit Trust**: Trusted setup required for Groth16 circuits

## Development Status

### Complete
- Core transfer circuits and instructions
- Shield/unshield functionality
- Note scanning and balance tracking
- AMM swap circuits and programs
- Order book circuits and programs
- React UI components

### In Progress
- Governance SDK implementation (circuits complete)
- Enhanced scanner performance
- Multi-chain support

### Planned
- Mobile wallet
- Hardware wallet support
- Mainnet deployment
- External audit

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## Resources

- [Circom Documentation](https://docs.circom.io/)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Light Protocol](https://www.lightprotocol.com/)
- [Solana Documentation](https://docs.solana.com/)

## License

MIT

## Acknowledgments

Built with:
- [Light Protocol](https://www.lightprotocol.com/) for compressed state
- [Circom](https://docs.circom.io/) for ZK circuits
- [Anchor](https://www.anchor-lang.com/) for Solana programs
- [SnarkJS](https://github.com/iden3/snarkjs) for proof generation

---

**Warning**: This software is experimental and has not been audited. Use at your own risk.
