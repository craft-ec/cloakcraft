# CloakCraft Development Guide

## Quick Start

```bash
# Clone repository
git clone https://github.com/craft-ec/cloakcraft.git
cd cloakcraft

# Install dependencies
pnpm install

# Build circuits (first time only, ~30 minutes)
cd circom-circuits && ./build-all.sh && cd ..

# Start local validator
anchor localnet

# In another terminal: deploy and test
anchor build
anchor deploy
npx ts-node scripts/register-vkeys.ts
anchor test
```

## Project Structure

```
cloakcraft/
├── circom-circuits/        # ZK circuits
│   ├── transfer/           # Private transfers
│   ├── swap/              # AMM operations
│   ├── market/            # Order book
│   ├── governance/        # Voting
│   └── lib/               # Shared components
├── programs/
│   └── cloakcraft/        # Anchor program
├── packages/
│   ├── sdk/               # TypeScript SDK
│   ├── hooks/             # React hooks
│   ├── ui/                # UI components
│   └── types/             # Shared types
├── apps/
│   └── demo/              # Next.js demo
├── scripts/               # Development scripts
├── tests/                 # Integration tests
└── keys/                  # Circuit keys (generated)
```

## Development Workflow

### 1. Circuit Development

```bash
cd circom-circuits

# Edit circuit
vim transfer/transfer_1x2.circom

# Compile single circuit
circom transfer/transfer_1x2.circom --r1cs --wasm --sym -o build/

# Generate test keys (faster, smaller params)
snarkjs groth16 setup build/transfer_1x2.r1cs pot12_final.ptau transfer_1x2.zkey
snarkjs zkey export verificationkey transfer_1x2.zkey keys/transfer_1x2.vk

# Test circuit
node test-circuit.js transfer_1x2
```

**Circuit Guidelines:**
- Minimize constraints for gas efficiency
- Use Poseidon hash (not SHA256/Keccak)
- Test with edge cases (0 values, max values)
- Document constraint count

### 2. Program Development

```bash
cd programs/cloakcraft

# Edit program
vim src/instructions/transfer.rs

# Build
anchor build

# Run unit tests
cargo test

# Run integration tests
anchor test --skip-build
```

**Program Guidelines:**
- Use `#[error_code]` for custom errors
- Validate all inputs thoroughly
- Emit events for indexing
- Keep instructions composable

### 3. SDK Development

```bash
cd packages/sdk

# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Generate types from IDL
pnpm generate:types
```

**SDK Guidelines:**
- Maintain backwards compatibility
- Export TypeScript types
- Document public APIs
- Handle errors gracefully

### 4. Frontend Development

```bash
cd apps/demo

# Start dev server
pnpm dev

# Build
pnpm build

# Type check
pnpm type-check
```

## Testing

### Unit Tests

```bash
# Program tests
anchor test

# SDK tests
cd packages/sdk && pnpm test

# Circuit tests
cd circom-circuits && pnpm test
```

### Integration Tests

```bash
# Full system test
npx ts-node scripts/e2e-full-system.ts

# AMM test
npx ts-node scripts/e2e-amm-swap-test.ts

# Scanner test
npx ts-node scripts/e2e-scanner-test.ts
```

### Test Coverage

```bash
# Program coverage (requires cargo-llvm-cov)
cargo llvm-cov --lib

# SDK coverage
cd packages/sdk && pnpm test:coverage
```

## Local Development Environment

### Required Services

1. **Solana Localnet**
   ```bash
   anchor localnet
   # or
   solana-test-validator
   ```

2. **Light Protocol** (for compressed accounts)
   ```bash
   # Light Protocol test validator
   light-protocol-test-validator
   ```

### Environment Variables

```bash
# .env.local
SOLANA_RPC_URL=http://localhost:8899
PROGRAM_ID=<your-local-program-id>
LIGHT_PROGRAM_ID=<light-program-id>
```

### Database (Optional)

For indexing and note scanning:
```bash
# Start Postgres
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password postgres

# Run migrations
npx prisma migrate dev
```

## Debugging

### Circuit Debugging

```bash
# Print witness values
circom circuit.circom --wasm --r1cs --sym -o build/
node build/circuit_js/generate_witness.js build/circuit_js/circuit.wasm input.json witness.wtns

# Inspect witness
snarkjs wtns export json witness.wtns witness.json
cat witness.json
```

### Program Debugging

```bash
# Enable verbose logging
RUST_LOG=solana_runtime::system_instruction_processor=trace anchor test

# Check program logs
solana logs --url localhost
```

### SDK Debugging

```typescript
// Enable debug mode
const client = new CloakCraftClient(connection, keypair, {
  debug: true,
  logProofs: true,
});
```

## Common Tasks

### Adding a New Instruction

1. **Define state** (`programs/cloakcraft/src/state/`)
2. **Create instruction** (`programs/cloakcraft/src/instructions/`)
3. **Add to lib.rs**
4. **Rebuild**: `anchor build`
5. **Update SDK** (`packages/sdk/src/instructions/`)
6. **Update types** (`packages/types/`)
7. **Add tests**

### Adding a New Circuit

1. **Create circuit** (`circom-circuits/new-circuit/`)
2. **Add build script** (`circom-circuits/build-new-circuit.sh`)
3. **Generate keys**
4. **Add instruction for circuit**
5. **Update SDK proof generation**
6. **Add tests**

### Updating IDL

```bash
# After changing program
anchor build

# Copy IDL to packages
cp target/idl/cloakcraft.json packages/sdk/src/idl/
cp target/types/cloakcraft.ts packages/types/src/
```

## Performance Optimization

### Circuit Optimization

- Use `<--` (non-quadratic) where possible
- Batch multiple operations in single proof
- Minimize public inputs

### Program Optimization

- Use `zero_copy` for large accounts
- Batch CPI calls
- Use compute budget wisely

### SDK Optimization

- Cache proving keys in IndexedDB
- Use Web Workers for proof generation
- Implement proof batching

## Code Style

### Rust (Program)

```bash
# Format
cargo fmt

# Lint
cargo clippy -- -D warnings
```

### TypeScript (SDK/Frontend)

```bash
# Format
pnpm prettier --write .

# Lint
pnpm eslint .
```

### Circom

- Use consistent indentation (2 spaces)
- Document inputs/outputs
- Name signals descriptively

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push -u origin feature/new-feature
gh pr create
```

## Resources

- [Circom Docs](https://docs.circom.io/)
- [Anchor Book](https://www.anchor-lang.com/)
- [Light Protocol](https://www.lightprotocol.com/docs)
- [SnarkJS](https://github.com/iden3/snarkjs)
