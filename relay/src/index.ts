/**
 * CloakCraft Relay - TunnelCraft Integration
 *
 * Provides IP-layer privacy for transaction submission via
 * Hyperswarm DHT and Protomux multiplexing.
 */

export { RelayClient, RelayClientConfig } from './client';
export { RelayServer, RelayServerConfig } from './server';
export {
  MessageType,
  PROTOCOL_VERSION,
  PROTOCOL_NAME,
  encodeMessage,
  decodeMessage,
  generateRequestId,
  type RelayMessage,
  type SubmitTxMessage,
  type TxResultMessage,
  type StatusMessage,
  type StatusResponseMessage,
  type PingMessage,
  type PongMessage,
  type ErrorMessage,
} from './protocol';
export { DiscoveryService, RELAY_TOPIC, type DiscoveryConfig } from './discovery';

// Voting services
export { EligibilityService, type EligibilityCriteria, type EligibilityResult, type MerkleProof } from './services/eligibility';
export { AttestationService, type BalanceAttestation, createIndexerKeypair } from './services/attestation';
export { PreimageScannerService, type VotePreimage, type DecryptedPreimage, decryptPreimage } from './services/preimage-scanner';
export { VotingApi, type VotingApiConfig, createVotingRouteHandlers } from './routes/voting';
