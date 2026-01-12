/**
 * CloakCraft SDK
 *
 * Client library for interacting with the CloakCraft privacy protocol
 */

// Re-export types
export * from '@cloakcraft/types';

// Export client
export { CloakCraftClient } from './client';
export type { CloakCraftClientConfig } from './client';

// Export crypto utilities
export * from './crypto';

// Export note management
export * from './notes';

// Export proof generation
export * from './proofs';

// Export snarkjs prover utilities (browser Groth16)
export * from './snarkjs-prover';

// Export wallet
export * from './wallet';

// Export Light Protocol / Helius integration
export * from './light';

// Export instruction builders
export * from './instructions';
