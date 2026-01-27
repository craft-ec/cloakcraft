# CloakCraft Deployment Guide

## Overview

CloakCraft deployment involves:
1. Building and deploying Circom circuits
2. Deploying Anchor program to Solana
3. Registering verification keys on-chain
4. Deploying frontend application

## Prerequisites

```bash
# Verify installations
node --version        # 18+
pnpm --version        # 8+
solana --version      # 1.17+
anchor --version      # 0.29+
circom --version      # 2.1+
```

## Circuit Deployment

### Build Circuits

Circuit keys must be generated before program deployment.

```bash
cd circom-circuits

# Build all circuits (creates .wasm, .r1cs, .sym files)
./build-all.sh

# Generate proving and verification keys
# WARNING: This takes 10-30 minutes and requires 16GB+ RAM
./generate-keys.sh
```

**Output:**
```
keys/
├── transfer_1x2.pk      # Proving key (~50MB)
├── transfer_1x2.vk      # Verification key (~1KB)
├── transfer_2x2.pk
├── transfer_2x2.vk
├── shield.pk
├── shield.vk
├── unshield.pk
├── unshield.vk
├── swap.pk
├── swap.vk
└── ...
```

### Trusted Setup

For production, use a proper trusted setup ceremony:

```bash
# Phase 1: Powers of Tau (can use existing)
snarkjs powersoftau new bn128 20 pot20_0000.ptau -v

# Phase 2: Circuit-specific
snarkjs groth16 setup circuit.r1cs pot20_final.ptau circuit_0000.zkey

# Contribute entropy
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey

# Export verification key
snarkjs zkey export verificationkey circuit_final.zkey circuit.vk
```

## Program Deployment

### Configure Solana CLI

```bash
# Set network
solana config set --url https://api.devnet.solana.com  # or mainnet-beta

# Create/import deployer keypair
solana-keygen new -o deployer.json
# or
solana-keygen recover -o deployer.json

# Fund deployer (devnet)
solana airdrop 5 deployer.json

# Verify balance
solana balance deployer.json
```

### Build Program

```bash
# Build Anchor program
anchor build

# Note the program ID from target/deploy/cloakcraft-keypair.json
solana address -k target/deploy/cloakcraft-keypair.json
```

### Update Program ID

If deploying fresh, update program ID in:

```toml
# Anchor.toml
[programs.devnet]
cloakcraft = "YOUR_PROGRAM_ID"

# programs/cloakcraft/src/lib.rs
declare_id!("YOUR_PROGRAM_ID");
```

Then rebuild:
```bash
anchor build
```

### Deploy

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet (requires SOL)
anchor deploy --provider.cluster mainnet
```

**Deployment costs (approximate):**
- Devnet: Free (airdrop)
- Mainnet: ~2-5 SOL depending on program size

### Register Verification Keys

After program deployment, register circuit verification keys:

```bash
# Register all verification keys
npx ts-node scripts/register-vkeys.ts

# Or register individually
npx ts-node scripts/register-vkey.ts transfer_1x2
npx ts-node scripts/register-vkey.ts transfer_2x2
# ...
```

This stores verification keys on-chain in PDAs for proof verification.

## Frontend Deployment

### Environment Setup

Create `.env.local`:

```bash
# Network
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://api.devnet.solana.com

# Program
NEXT_PUBLIC_PROGRAM_ID=YOUR_PROGRAM_ID

# Optional: Custom RPC (recommended for production)
NEXT_PUBLIC_RPC_URL=https://your-rpc-provider.com
```

### Build and Deploy

```bash
cd apps/demo

# Install dependencies
pnpm install

# Build
pnpm build

# Deploy to Vercel
vercel --prod

# Or deploy to other platforms
pnpm export  # generates static files in out/
```

### Vercel Configuration

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["sfo1"]
}
```

## Production Checklist

### Before Mainnet

- [ ] Circuits audited by cryptography experts
- [ ] Program audited by Solana security firm
- [ ] Trusted setup ceremony completed (multi-party)
- [ ] Verification keys match audited circuits
- [ ] Rate limiting on frontend
- [ ] Error monitoring (Sentry, etc.)
- [ ] RPC provider with high limits
- [ ] Backup RPC endpoints configured

### Security Hardening

```bash
# Verify program is immutable (optional but recommended)
solana program set-upgrade-authority <PROGRAM_ID> --final

# Or set multisig upgrade authority
solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <MULTISIG>
```

### Monitoring

Set up monitoring for:
- Program invocation errors
- RPC endpoint health
- Frontend availability
- Unusual transaction patterns

## Network Configuration

### Devnet

```bash
solana config set --url https://api.devnet.solana.com
```

- Free airdrop for testing
- Frequent resets possible
- Lower reliability

### Mainnet-Beta

```bash
solana config set --url https://api.mainnet-beta.solana.com
```

- Real SOL required
- Higher reliability
- Use dedicated RPC provider

### Recommended RPC Providers

| Provider | Free Tier | Notes |
|----------|-----------|-------|
| Helius | 100k req/day | Good Solana support |
| QuickNode | Limited | Multi-chain |
| Triton | Limited | Dedicated Solana |
| Alchemy | 300M CU/mo | Enterprise features |

## Troubleshooting

### "Program deployment failed"

```bash
# Check balance
solana balance

# Extend program size if needed
solana program extend <PROGRAM_ID> <BYTES>
```

### "Verification key registration failed"

```bash
# Check program is deployed
solana program show <PROGRAM_ID>

# Ensure correct network
solana config get
```

### "Circuit build out of memory"

```bash
# Increase Node.js memory
NODE_OPTIONS="--max-old-space-size=16384" ./build-all.sh
```

## Upgrade Process

### Program Upgrades

```bash
# Build new version
anchor build

# Deploy upgrade
anchor upgrade target/deploy/cloakcraft.so --program-id <PROGRAM_ID>
```

### Circuit Upgrades

When upgrading circuits:
1. Generate new verification keys
2. Register new keys on-chain
3. Update SDK to use new circuits
4. Deprecate old circuits after migration period

## Rollback

### Program Rollback

If upgrade fails:
```bash
# Deploy previous version
anchor deploy --program-keypair path/to/previous-keypair.json
```

### Verification Key Rollback

```bash
# Re-register old verification keys
npx ts-node scripts/register-vkey.ts transfer_1x2 --keyfile keys/old/transfer_1x2.vk
```
