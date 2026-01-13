# CloakCraft Development Guidelines

## Code Quality Rules

### No Placeholders or Stubs
- NEVER use placeholder implementations, stubs, or TODO comments for core functionality
- If a feature requires an external dependency, install and use it properly
- If implementation is complex, implement it correctly the first time
- Do not defer work with comments like "TODO: implement later" or "placeholder for now"

### Dependencies
- When functionality requires a library (e.g., @lightprotocol/stateless.js for Poseidon hashing), install it and implement properly
- Do not substitute with incorrect workarounds (e.g., SHA256 instead of Poseidon)

## Project Structure

- `packages/sdk/` - TypeScript SDK for client-side operations
- `programs/cloakcraft/` - Solana program (Rust/Anchor)
- `circuits/` - Noir ZK circuits
- `scripts/` - Development and testing scripts
- `types/` - Shared TypeScript type declarations

## Git Commits

- NEVER include signature or co-authored-by in git commits
- Keep commit messages clean without any attribution
