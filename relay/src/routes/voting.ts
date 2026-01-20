/**
 * Voting API routes
 *
 * REST API endpoints for voting-related services:
 * - Eligibility whitelist generation
 * - Balance attestation
 * - Vote preimage scanning
 */

import { EligibilityService, type EligibilityCriteria, type MerkleProof } from '../services/eligibility';
import { AttestationService, type BalanceAttestation } from '../services/attestation';
import { PreimageScannerService, type VotePreimage, type ScanOptions } from '../services/preimage-scanner';

export interface VotingApiConfig {
  rpcUrl: string;
  indexerSecretKey: Uint8Array;
  programId: string;
}

export interface EligibilityRequest {
  tokenMint: string;
  snapshotSlot: number;
  criteria: EligibilityCriteria;
}

export interface EligibilityResponse {
  eligibilityRoot: string;
  eligibleCount: number;
  treeUrl?: string;
}

export interface AttestationResponse extends BalanceAttestation {}

export interface PreimageResponse {
  preimages: VotePreimage[];
}

/**
 * Voting API handler
 */
export class VotingApi {
  private eligibilityService: EligibilityService;
  private attestationService: AttestationService;
  private preimageScannerService: PreimageScannerService;

  constructor(config: VotingApiConfig) {
    this.eligibilityService = new EligibilityService(config.rpcUrl);
    this.attestationService = new AttestationService(config.rpcUrl, config.indexerSecretKey);
    this.preimageScannerService = new PreimageScannerService(config.rpcUrl, config.programId);
  }

  /**
   * Get indexer public key for ballot configuration
   */
  getIndexerPubkey(): string {
    return this.attestationService.getIndexerPubkey().toBase58();
  }

  // ============ Eligibility Endpoints ============

  /**
   * POST /api/voting/eligibility
   *
   * Generate eligibility whitelist based on criteria
   */
  async generateEligibility(request: EligibilityRequest): Promise<EligibilityResponse> {
    const result = await this.eligibilityService.generateEligibilityTree(
      request.tokenMint,
      request.snapshotSlot,
      request.criteria
    );

    return {
      eligibilityRoot: result.eligibilityRoot,
      eligibleCount: result.eligibleCount,
      // In production, would upload tree data to IPFS/Arweave
      treeUrl: undefined,
    };
  }

  /**
   * GET /api/voting/eligibility-proof/:eligibilityRoot/:pubkey
   *
   * Get eligibility merkle proof for a pubkey
   */
  getEligibilityProof(eligibilityRoot: string, pubkey: string): MerkleProof | null {
    return this.eligibilityService.getMerkleProof(eligibilityRoot, pubkey);
  }

  // ============ Attestation Endpoints ============

  /**
   * GET /api/voting/attestation/:ballotId/:pubkey
   *
   * Get balance attestation for a user
   */
  async getAttestation(
    ballotId: string,
    pubkey: string,
    tokenMint: string,
    snapshotSlot: number
  ): Promise<AttestationResponse | null> {
    return this.attestationService.generateAttestation({
      ballotId,
      pubkey,
      tokenMint,
      snapshotSlot,
    });
  }

  /**
   * POST /api/voting/attestation/verify
   *
   * Verify an attestation signature
   */
  verifyAttestation(attestation: BalanceAttestation): boolean {
    return this.attestationService.verifyAttestation(attestation);
  }

  // ============ Preimage Endpoints ============

  /**
   * GET /api/voting/preimages/:pubkey
   *
   * Scan for user's encrypted vote preimages
   */
  async getPreimages(
    pubkey: string,
    options: ScanOptions = {}
  ): Promise<PreimageResponse> {
    const preimages = await this.preimageScannerService.scanUserPreimages(pubkey, options);
    return { preimages };
  }

  /**
   * POST /api/voting/preimages/sync
   *
   * Sync preimages from on-chain data (admin only)
   */
  async syncPreimages(startSlot?: number): Promise<{ syncedCount: number }> {
    const syncedCount = await this.preimageScannerService.syncFromChain(startSlot);
    return { syncedCount };
  }

  /**
   * POST /api/voting/preimages/index
   *
   * Index a new preimage (called by relayer after vote/position creation)
   */
  indexPreimage(pubkey: string, preimage: VotePreimage): void {
    this.preimageScannerService.indexPreimage(pubkey, preimage);
  }

  /**
   * POST /api/voting/preimages/nullify
   *
   * Mark a preimage as nullified (called by relayer after vote change/claim)
   */
  markPreimageNullified(pubkey: string, commitment: string): void {
    this.preimageScannerService.markNullified(pubkey, commitment);
  }

  // ============ Stats Endpoints ============

  /**
   * GET /api/voting/stats
   *
   * Get indexer statistics
   */
  getStats(): {
    indexerPubkey: string;
    preimageStats: { userCount: number; preimageCount: number };
  } {
    return {
      indexerPubkey: this.getIndexerPubkey(),
      preimageStats: this.preimageScannerService.getStats(),
    };
  }
}

/**
 * Express/Hono route handler factory
 *
 * Example usage with Hono:
 * ```typescript
 * import { Hono } from 'hono';
 * import { createVotingRoutes, VotingApiConfig } from './routes/voting';
 *
 * const app = new Hono();
 * const votingRoutes = createVotingRoutes(config);
 * app.route('/api/voting', votingRoutes);
 * ```
 */
export function createVotingRouteHandlers(api: VotingApi) {
  return {
    // Eligibility
    'POST /eligibility': async (req: { body: EligibilityRequest }) => {
      return api.generateEligibility(req.body);
    },

    'GET /eligibility-proof/:root/:pubkey': (req: { params: { root: string; pubkey: string } }) => {
      const proof = api.getEligibilityProof(req.params.root, req.params.pubkey);
      if (!proof) {
        throw new Error('Eligibility root not found');
      }
      return proof;
    },

    // Attestation
    'GET /attestation/:ballotId/:pubkey': async (req: {
      params: { ballotId: string; pubkey: string };
      query: { tokenMint: string; snapshotSlot: string };
    }) => {
      const attestation = await api.getAttestation(
        req.params.ballotId,
        req.params.pubkey,
        req.query.tokenMint,
        parseInt(req.query.snapshotSlot, 10)
      );
      if (!attestation) {
        throw new Error('Could not generate attestation');
      }
      return attestation;
    },

    'POST /attestation/verify': (req: { body: BalanceAttestation }) => {
      return { valid: api.verifyAttestation(req.body) };
    },

    // Preimages
    'GET /preimages/:pubkey': async (req: {
      params: { pubkey: string };
      query: { ballotId?: string; includeNullified?: string };
    }) => {
      return api.getPreimages(req.params.pubkey, {
        ballotId: req.query.ballotId,
        includeNullified: req.query.includeNullified === 'true',
      });
    },

    // Stats
    'GET /stats': () => {
      return api.getStats();
    },
  };
}
