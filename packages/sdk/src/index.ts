/**
 * CloakCraft SDK
 *
 * Client library for interacting with the CloakCraft privacy protocol
 */

// Re-export types
export * from '@cloakcraft/types';

// Export client
export { CloakCraftClient } from './client';
export type { CloakCraftClientConfig, AnchorWallet } from './client';

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

// Export AMM utilities
export * from './amm';

// Export versioned transaction utilities
export * from './versioned-transaction';

// Export Address Lookup Table utilities
export * from './address-lookup-table';

// Export transaction history
export * from './history';

// Export token prices
export * from './prices';

// Export pool analytics
export * from './analytics';

// Export protocol fees
export * from './fees';

// Export smart note selector
export * from './note-selector';

// Export consolidation service
export * from './consolidation';

// Export auto-consolidator
export * from './auto-consolidator';

// Export perpetual futures module
export * from './perps';

// Export Pyth oracle integration
export * from './pyth';

// Export voting module
export * from './voting';
