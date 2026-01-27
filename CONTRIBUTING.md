# Contributing to CloakCraft

Thank you for your interest in contributing to CloakCraft! This guide will help you get started.

## Code of Conduct

Be respectful and constructive. We're building privacy infrastructure together.

## Development Setup

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
avm install latest && avm use latest

# Circom and snarkjs
npm install -g circom snarkjs
```

### Local Development

```bash
# Clone and install
git clone https://github.com/craft-ec/cloakcraft.git
cd cloakcraft
pnpm install

# Build circuits (required first time)
cd circom-circuits && ./build-all.sh && cd ..

# Start local validator
anchor localnet

# Deploy and test
anchor build && anchor deploy
```

## Git Workflow

### Branch Naming

```
feature/description   # New features
fix/description       # Bug fixes
docs/description      # Documentation
circuit/description   # Circuit changes
```

### Commit Messages

Use conventional commits:

```
feat: add stealth address generation
fix: correct nullifier computation
docs: update SDK examples
circuit: optimize transfer circuit constraints
test: add AMM swap integration tests
```

### Pull Request Process

1. Create a feature branch from `main`
2. Make your changes with tests
3. Ensure all tests pass: `anchor test`
4. Submit PR with clear description
5. Address review feedback
6. Squash and merge after approval

## Project Areas

### Circuits (`circom-circuits/`)

ZK circuits are security-critical. Changes require:
- Constraint count analysis
- Security review
- Regenerating proving/verification keys

### Program (`programs/cloakcraft/`)

Anchor program changes require:
- Unit tests in `tests/`
- Integration test coverage
- IDL regeneration

### SDK (`packages/sdk/`)

TypeScript SDK changes should:
- Maintain backwards compatibility
- Include type definitions
- Update documentation

## Testing

```bash
# Run all tests
anchor test

# Run specific test file
anchor test --skip-build tests/transfer.ts

# E2E system tests
npx ts-node scripts/e2e-full-system.ts
```

## Security

CloakCraft handles private financial transactions. Please:

- **Report vulnerabilities privately** to security@craft.ec
- Don't include sensitive data in commits
- Review cryptographic changes carefully
- Never commit proving keys or secrets

## Questions?

- Open a GitHub issue for bugs/features
- Join our Discord for discussions

## License

By contributing, you agree that your contributions will be licensed under MIT.
