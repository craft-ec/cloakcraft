/**
 * Voting hooks
 *
 * Provides interface for voting operations: ballots, voting, and claims
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { useCloakCraft } from './provider';
import type { DecryptedNote, TransactionResult } from '@cloakcraft/types';
import type {
  Ballot,
  BallotStatus,
  VoteBindingMode,
  RevealMode,
  VoteType,
  ResolutionMode,
  VoteSnapshotParams,
  VoteSpendParams,
  VotingClosePositionParams,
  VotingClaimParams,
  VotingPosition,
} from '@cloakcraft/sdk';

// =============================================================================
// Types
// =============================================================================

/** Progress stages for voting operations */
export type VotingProgressStage =
  | 'preparing'     // Preparing inputs/outputs
  | 'generating'    // Generating ZK proof
  | 'building'      // Building transactions
  | 'approving'     // Awaiting wallet approval
  | 'executing'     // Executing transactions
  | 'confirming';   // Waiting for confirmation

export interface BallotWithAddress extends Ballot {
  address: PublicKey;
}

export interface VoteSnapshotOptions {
  /** Ballot to vote on */
  ballot: BallotWithAddress;
  /** Input note for snapshot voting (proves balance) */
  note: DecryptedNote;
  /** Vote choice (option index) */
  voteChoice: number;
  /** Merkle proof for note inclusion in snapshot */
  snapshotMerkleRoot: Uint8Array;
  merklePath: Uint8Array[];
  merklePathIndices: number[];
  /** Optional eligibility proof */
  eligibilityProof?: {
    merkleProof: Uint8Array[];
    pathIndices: number[];
    leafIndex: number;
  };
  /** Optional progress callback */
  onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}

export interface VoteSpendOptions {
  /** Ballot to vote on */
  ballot: BallotWithAddress;
  /** Input note to spend (locks tokens) */
  note: DecryptedNote;
  /** Vote choice (option index) */
  voteChoice: number;
  /** Merkle proof for note */
  merklePath: Uint8Array[];
  merklePathIndices: number[];
  leafIndex: number;
  /** Optional eligibility proof */
  eligibilityProof?: {
    merkleProof: Uint8Array[];
    pathIndices: number[];
    leafIndex: number;
  };
  /** Optional progress callback */
  onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}

export interface ChangeVoteOptions {
  /** Ballot */
  ballot: BallotWithAddress;
  /** Old vote commitment */
  oldVoteCommitment: Uint8Array;
  /** Old vote choice */
  oldVoteChoice: number;
  /** Old randomness */
  oldRandomness: Uint8Array;
  /** New vote choice */
  newVoteChoice: number;
  /** Optional progress callback */
  onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}

export interface ClosePositionOptions {
  /** Ballot */
  ballot: BallotWithAddress;
  /** Position commitment */
  positionCommitment: Uint8Array;
  /** Vote choice */
  voteChoice: number;
  /** Amount locked */
  amount: bigint;
  /** Vote weight */
  weight: bigint;
  /** Position randomness */
  positionRandomness: Uint8Array;
  /** Optional progress callback */
  onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}

export interface ClaimOptions {
  /** Ballot */
  ballot: BallotWithAddress;
  /** Position commitment */
  positionCommitment: Uint8Array;
  /** Vote choice */
  voteChoice: number;
  /** Amount locked */
  amount: bigint;
  /** Vote weight */
  weight: bigint;
  /** Position randomness */
  positionRandomness: Uint8Array;
  /** Optional progress callback */
  onProgress?: (stage: VotingProgressStage, phase?: number) => void;
}

export interface VoteResult {
  operationId: Uint8Array;
  voteNullifier?: Uint8Array;
  voteCommitment?: Uint8Array;
  voteRandomness?: Uint8Array;
  signatures: string[];
}

export interface SpendResult {
  operationId: Uint8Array;
  spendingNullifier: Uint8Array;
  positionCommitment: Uint8Array;
  positionRandomness: Uint8Array;
  signatures: string[];
}

export interface ClaimResult {
  operationId: Uint8Array;
  positionNullifier: Uint8Array;
  payoutCommitment: Uint8Array;
  grossPayout: bigint;
  netPayout: bigint;
  signatures: string[];
}

// =============================================================================
// Ballot Fetching Hooks
// =============================================================================

/**
 * Hook for fetching all ballots
 */
export function useBallots() {
  const { client } = useCloakCraft();
  const [ballots, setBallots] = useState<BallotWithAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!client?.getProgram()) {
      setBallots([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = client.getProgram() as any;
      if (!program) {
        throw new Error('Program not available');
      }
      // Fetch all Ballot accounts
      const accounts = await program.account.ballot.all();
      const ballotData = accounts.map((acc: { publicKey: PublicKey; account: Ballot }) => ({
        ...acc.account,
        address: acc.publicKey,
      }));
      setBallots(ballotData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ballots');
      setBallots([]);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ballots,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching active ballots only
 */
export function useActiveBallots() {
  const { ballots, isLoading, error, refresh } = useBallots();

  const activeBallots = useMemo(() => {
    return ballots.filter(
      (b) => b.status === 1 // BallotStatus.Active
    );
  }, [ballots]);

  return {
    ballots: activeBallots,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for fetching a single ballot
 */
export function useBallot(ballotAddress: PublicKey | string | null) {
  const { client } = useCloakCraft();
  const [ballot, setBallot] = useState<BallotWithAddress | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = useMemo(() => {
    if (!ballotAddress) return null;
    if (typeof ballotAddress === 'string') {
      try {
        return new PublicKey(ballotAddress);
      } catch {
        return null;
      }
    }
    return ballotAddress;
  }, [ballotAddress]);

  const refresh = useCallback(async () => {
    if (!client?.getProgram() || !address) {
      setBallot(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const program = client.getProgram() as any;
      if (!program) {
        throw new Error('Program not available');
      }
      const account = await program.account.ballot.fetch(address);
      setBallot({ ...account, address });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch ballot');
      setBallot(null);
    } finally {
      setIsLoading(false);
    }
  }, [client, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    ballot,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Hook for ballot tally information
 */
// Helper to convert BN or bigint to native bigint
function toBigInt(value: bigint | { toString(): string } | number | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;
  if (typeof value === 'bigint') return value;
  if (typeof value === 'number') return BigInt(value);
  // Handle BN objects from Anchor
  return BigInt(value.toString());
}

export function useBallotTally(ballot: Ballot | null) {
  return useMemo(() => {
    if (!ballot) {
      return null;
    }

    const totalVotes = Number(toBigInt(ballot.voteCount));
    const totalWeight = toBigInt(ballot.totalWeight);
    const totalAmount = toBigInt(ballot.totalAmount);
    const quorumThreshold = toBigInt(ballot.quorumThreshold);

    // Calculate percentages for each option
    const optionStats = (ballot.optionWeights || []).map((w, index) => {
      const weight = toBigInt(w);
      const amount = toBigInt(ballot.optionAmounts?.[index]);
      const percentage = totalWeight > 0n
        ? Number((weight * 10000n) / totalWeight) / 100
        : 0;

      return {
        index,
        weight,
        amount,
        percentage,
      };
    });

    // Find leading option
    const leadingOption = optionStats.reduce(
      (max, opt) => (opt.weight > max.weight ? opt : max),
      optionStats[0] || { index: 0, weight: 0n, amount: 0n, percentage: 0 }
    );

    return {
      totalVotes,
      totalWeight,
      totalAmount,
      optionStats,
      leadingOption,
      hasQuorum: totalWeight >= quorumThreshold,
      quorumProgress: quorumThreshold > 0n
        ? Number((totalWeight * 10000n) / quorumThreshold) / 100
        : 100,
    };
  }, [ballot]);
}

/**
 * Hook for ballot time status
 */
export function useBallotTimeStatus(ballot: Ballot | null) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (!ballot) {
      return null;
    }

    // Convert potential BN to number for time fields
    const toNumber = (val: number | { toNumber?(): number; toString(): string } | null | undefined): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === 'number') return val;
      if (typeof val === 'object' && 'toNumber' in val && typeof val.toNumber === 'function') {
        return val.toNumber();
      }
      return Number(val.toString());
    };

    const startTime = toNumber(ballot.startTime);
    const endTime = toNumber(ballot.endTime);
    const claimDeadline = toNumber(ballot.claimDeadline);

    const hasStarted = now >= startTime;
    const hasEnded = now >= endTime;
    const canClaim = ballot.hasOutcome && now < claimDeadline;
    const claimExpired = ballot.hasOutcome && now >= claimDeadline;

    const timeUntilStart = Math.max(0, startTime - now);
    const timeUntilEnd = Math.max(0, endTime - now);
    const timeUntilClaimDeadline = Math.max(0, claimDeadline - now);

    return {
      now,
      startTime,
      endTime,
      claimDeadline,
      hasStarted,
      hasEnded,
      canClaim,
      claimExpired,
      timeUntilStart,
      timeUntilEnd,
      timeUntilClaimDeadline,
      isVotingPeriod: hasStarted && !hasEnded,
    };
  }, [ballot, now]);
}

// =============================================================================
// Voting Operations
// =============================================================================

/**
 * Hook for snapshot voting (tokens stay liquid)
 */
export function useVoteSnapshot() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<{
    isVoting: boolean;
    error: string | null;
    result: VoteResult | null;
  }>({
    isVoting: false,
    error: null,
    result: null,
  });

  const vote = useCallback(
    async (options: VoteSnapshotOptions): Promise<VoteResult | null> => {
      if (!client || !wallet) {
        setState({ isVoting: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isVoting: false, error: 'Program not set', result: null });
        return null;
      }

      setState({ isVoting: true, error: null, result: null });

      try {
        const { ballot, note, voteChoice, snapshotMerkleRoot, merklePath, merklePathIndices, eligibilityProof, onProgress } = options;

        onProgress?.('preparing', 0);

        // Validate vote choice
        if (voteChoice < 0 || voteChoice >= ballot.numOptions) {
          throw new Error(`Invalid vote choice. Must be 0-${ballot.numOptions - 1}`);
        }

        // Validate ballot is active
        if (ballot.status !== 1) { // BallotStatus.Active
          throw new Error('Ballot is not active');
        }

        // Validate binding mode is Snapshot
        if (ballot.bindingMode !== 0) { // VoteBindingMode.Snapshot
          throw new Error('This ballot requires spend-to-vote');
        }

        onProgress?.('generating', 0);
        onProgress?.('building', 0);
        onProgress?.('approving', 0);
        onProgress?.('executing', 0);

        // Placeholder for actual voting execution
        // Would call VotingClient.voteSnapshot()
        const result: VoteResult = {
          operationId: new Uint8Array(32),
          voteNullifier: new Uint8Array(32),
          voteCommitment: new Uint8Array(32),
          voteRandomness: new Uint8Array(32),
          signatures: ['pending_implementation'],
        };

        onProgress?.('confirming', 0);

        // Wait for indexer
        await new Promise(resolve => setTimeout(resolve, 2000));

        setState({ isVoting: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Vote failed';
        setState({ isVoting: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isVoting: false, error: null, result: null });
  }, []);

  return {
    ...state,
    vote,
    reset,
  };
}

/**
 * Hook for spend-to-vote (tokens locked until outcome)
 */
export function useVoteSpend() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<{
    isVoting: boolean;
    error: string | null;
    result: SpendResult | null;
  }>({
    isVoting: false,
    error: null,
    result: null,
  });

  const vote = useCallback(
    async (options: VoteSpendOptions): Promise<SpendResult | null> => {
      if (!client || !wallet) {
        setState({ isVoting: false, error: 'Wallet not connected', result: null });
        return null;
      }

      if (!client.getProgram()) {
        setState({ isVoting: false, error: 'Program not set', result: null });
        return null;
      }

      setState({ isVoting: true, error: null, result: null });

      try {
        const { ballot, note, voteChoice, merklePath, merklePathIndices, leafIndex, eligibilityProof, onProgress } = options;

        onProgress?.('preparing', 0);

        // Validate vote choice
        if (voteChoice < 0 || voteChoice >= ballot.numOptions) {
          throw new Error(`Invalid vote choice. Must be 0-${ballot.numOptions - 1}`);
        }

        // Validate ballot is active
        if (ballot.status !== 1) { // BallotStatus.Active
          throw new Error('Ballot is not active');
        }

        // Validate binding mode is SpendToVote
        if (ballot.bindingMode !== 1) { // VoteBindingMode.SpendToVote
          throw new Error('This ballot uses snapshot voting');
        }

        // Validate note token matches ballot token
        if (!note.tokenMint.equals(ballot.tokenMint)) {
          throw new Error('Note token does not match ballot token');
        }

        onProgress?.('generating', 0);
        onProgress?.('building', 0);
        onProgress?.('approving', 0);
        onProgress?.('executing', 0);

        // Placeholder for actual voting execution
        // Would call VotingClient.voteSpend()
        const result: SpendResult = {
          operationId: new Uint8Array(32),
          spendingNullifier: new Uint8Array(32),
          positionCommitment: new Uint8Array(32),
          positionRandomness: new Uint8Array(32),
          signatures: ['pending_implementation'],
        };

        onProgress?.('confirming', 0);

        // Wait for indexer
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Sync notes
        await sync(note.tokenMint, true);

        setState({ isVoting: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Vote failed';
        setState({ isVoting: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isVoting: false, error: null, result: null });
  }, []);

  return {
    ...state,
    vote,
    reset,
  };
}

/**
 * Hook for changing vote (snapshot mode only)
 */
export function useChangeVote() {
  const { client, wallet } = useCloakCraft();
  const [state, setState] = useState<{
    isChanging: boolean;
    error: string | null;
    result: VoteResult | null;
  }>({
    isChanging: false,
    error: null,
    result: null,
  });

  const changeVote = useCallback(
    async (options: ChangeVoteOptions): Promise<VoteResult | null> => {
      if (!client || !wallet) {
        setState({ isChanging: false, error: 'Wallet not connected', result: null });
        return null;
      }

      setState({ isChanging: true, error: null, result: null });

      try {
        const { ballot, oldVoteCommitment, oldVoteChoice, oldRandomness, newVoteChoice, onProgress } = options;

        onProgress?.('preparing', 0);

        // Validate new vote choice
        if (newVoteChoice < 0 || newVoteChoice >= ballot.numOptions) {
          throw new Error(`Invalid vote choice. Must be 0-${ballot.numOptions - 1}`);
        }

        // Validate ballot is active
        if (ballot.status !== 1) { // BallotStatus.Active
          throw new Error('Ballot is not active');
        }

        // Validate binding mode is Snapshot
        if (ballot.bindingMode !== 0) { // VoteBindingMode.Snapshot
          throw new Error('Can only change vote in snapshot mode');
        }

        onProgress?.('generating', 0);
        onProgress?.('building', 0);
        onProgress?.('approving', 0);
        onProgress?.('executing', 0);

        // Placeholder for actual change vote execution
        // Would call VotingClient.changeVoteSnapshot()
        const result: VoteResult = {
          operationId: new Uint8Array(32),
          voteCommitment: new Uint8Array(32),
          voteRandomness: new Uint8Array(32),
          signatures: ['pending_implementation'],
        };

        onProgress?.('confirming', 0);

        setState({ isChanging: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Change vote failed';
        setState({ isChanging: false, error, result: null });
        return null;
      }
    },
    [client, wallet]
  );

  const reset = useCallback(() => {
    setState({ isChanging: false, error: null, result: null });
  }, []);

  return {
    ...state,
    changeVote,
    reset,
  };
}

/**
 * Hook for closing a vote position (exit before resolution)
 */
export function useCloseVotePosition() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<{
    isClosing: boolean;
    error: string | null;
    result: VoteResult | null;
  }>({
    isClosing: false,
    error: null,
    result: null,
  });

  const closePosition = useCallback(
    async (options: ClosePositionOptions): Promise<VoteResult | null> => {
      if (!client || !wallet) {
        setState({ isClosing: false, error: 'Wallet not connected', result: null });
        return null;
      }

      setState({ isClosing: true, error: null, result: null });

      try {
        const { ballot, positionCommitment, voteChoice, amount, weight, positionRandomness, onProgress } = options;

        onProgress?.('preparing', 0);

        // Validate ballot is still active (can only close before resolution)
        if (ballot.status >= 3) { // BallotStatus.Resolved
          throw new Error('Cannot close position after ballot is resolved');
        }

        // Validate binding mode is SpendToVote
        if (ballot.bindingMode !== 1) { // VoteBindingMode.SpendToVote
          throw new Error('Only spend-to-vote positions can be closed');
        }

        onProgress?.('generating', 0);
        onProgress?.('building', 0);
        onProgress?.('approving', 0);
        onProgress?.('executing', 0);

        // Placeholder for actual close position execution
        // Would call VotingClient.closePosition()
        const result: VoteResult = {
          operationId: new Uint8Array(32),
          signatures: ['pending_implementation'],
        };

        onProgress?.('confirming', 0);

        // Sync notes
        await sync(ballot.tokenMint, true);

        setState({ isClosing: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Close position failed';
        setState({ isClosing: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isClosing: false, error: null, result: null });
  }, []);

  return {
    ...state,
    closePosition,
    reset,
  };
}

/**
 * Hook for claiming winnings from resolved ballot
 */
export function useClaim() {
  const { client, wallet, sync } = useCloakCraft();
  const [state, setState] = useState<{
    isClaiming: boolean;
    error: string | null;
    result: ClaimResult | null;
  }>({
    isClaiming: false,
    error: null,
    result: null,
  });

  const claim = useCallback(
    async (options: ClaimOptions): Promise<ClaimResult | null> => {
      if (!client || !wallet) {
        setState({ isClaiming: false, error: 'Wallet not connected', result: null });
        return null;
      }

      setState({ isClaiming: true, error: null, result: null });

      try {
        const { ballot, positionCommitment, voteChoice, amount, weight, positionRandomness, onProgress } = options;

        onProgress?.('preparing', 0);

        // Validate ballot is resolved
        if (!ballot.hasOutcome) {
          throw new Error('Ballot not resolved yet');
        }

        // Validate user voted for winning option
        if (voteChoice !== ballot.outcome) {
          throw new Error('Cannot claim - did not vote for winning option');
        }

        // Validate binding mode is SpendToVote
        if (ballot.bindingMode !== 1) { // VoteBindingMode.SpendToVote
          throw new Error('Only spend-to-vote ballots have claims');
        }

        onProgress?.('generating', 0);
        onProgress?.('building', 0);
        onProgress?.('approving', 0);
        onProgress?.('executing', 0);

        // Placeholder for actual claim execution
        // Would call VotingClient.claim()
        const result: ClaimResult = {
          operationId: new Uint8Array(32),
          positionNullifier: new Uint8Array(32),
          payoutCommitment: new Uint8Array(32),
          grossPayout: amount,
          netPayout: amount * 99n / 100n, // After fees
          signatures: ['pending_implementation'],
        };

        onProgress?.('confirming', 0);

        // Sync notes
        await sync(ballot.tokenMint, true);

        setState({ isClaiming: false, error: null, result });
        return result;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Claim failed';
        setState({ isClaiming: false, error, result: null });
        return null;
      }
    },
    [client, wallet, sync]
  );

  const reset = useCallback(() => {
    setState({ isClaiming: false, error: null, result: null });
  }, []);

  return {
    ...state,
    claim,
    reset,
  };
}

// =============================================================================
// Calculation Hooks
// =============================================================================

/**
 * Hook for calculating potential payout from a position
 */
export function usePayoutPreview(
  ballot: Ballot | null,
  voteChoice: number,
  weight: bigint | { toString(): string }
): { grossPayout: bigint; netPayout: bigint; multiplier: number } | null {
  return useMemo(() => {
    if (!ballot || !ballot.hasOutcome || voteChoice !== ballot.outcome) {
      return null;
    }

    const winnerWeight = toBigInt(ballot.winnerWeight);
    if (winnerWeight === 0n) {
      return null;
    }

    // Calculate share of winning pool
    const totalPool = toBigInt(ballot.poolBalance);
    const userWeight = toBigInt(weight);
    const grossPayout = (userWeight * totalPool) / winnerWeight;

    // Deduct protocol fee
    const feeAmount = (grossPayout * BigInt(ballot.protocolFeeBps)) / 10000n;
    const netPayout = grossPayout - feeAmount;

    // Calculate multiplier (return on investment)
    const multiplier = userWeight > 0n
      ? Number(grossPayout * 1000n / userWeight) / 1000
      : 0;

    return {
      grossPayout,
      netPayout,
      multiplier,
    };
  }, [ballot, voteChoice, weight]);
}

/**
 * Hook for vote validation
 */
export function useVoteValidation(
  ballot: Ballot | null,
  note: DecryptedNote | null,
  voteChoice: number
) {
  return useMemo(() => {
    if (!ballot) {
      return { isValid: false, error: 'Ballot not loaded' };
    }

    if (!note) {
      return { isValid: false, error: 'No note selected' };
    }

    // Validate vote choice
    if (voteChoice < 0 || voteChoice >= ballot.numOptions) {
      return { isValid: false, error: `Vote choice must be 0-${ballot.numOptions - 1}` };
    }

    // Validate ballot is active
    if (ballot.status !== 1) { // BallotStatus.Active
      return { isValid: false, error: 'Ballot is not active' };
    }

    // Validate note token matches ballot token
    if (!note.tokenMint.equals(ballot.tokenMint)) {
      return { isValid: false, error: 'Note token does not match ballot token' };
    }

    // Validate note has balance
    if (note.amount <= 0n) {
      return { isValid: false, error: 'Note has no balance' };
    }

    return { isValid: true, error: null, weight: note.amount };
  }, [ballot, note, voteChoice]);
}

/**
 * Hook for determining if user can claim
 */
export function useCanClaim(
  ballot: Ballot | null,
  voteChoice: number | null
) {
  return useMemo(() => {
    if (!ballot) {
      return { canClaim: false, reason: 'Ballot not loaded' };
    }

    if (!ballot.hasOutcome) {
      return { canClaim: false, reason: 'Ballot not resolved yet' };
    }

    if (voteChoice === null) {
      return { canClaim: false, reason: 'No vote recorded' };
    }

    if (voteChoice !== ballot.outcome) {
      return { canClaim: false, reason: 'Did not vote for winning option' };
    }

    if (ballot.bindingMode !== 1) { // VoteBindingMode.SpendToVote
      return { canClaim: false, reason: 'Only spend-to-vote ballots have claims' };
    }

    const now = Math.floor(Date.now() / 1000);
    if (now >= ballot.claimDeadline) {
      return { canClaim: false, reason: 'Claim deadline passed' };
    }

    return { canClaim: true, reason: null };
  }, [ballot, voteChoice]);
}

// =============================================================================
// Admin Operations
// =============================================================================

/**
 * Hook for resolving a ballot
 */
export function useResolveBallot() {
  const { client } = useCloakCraft();
  const [isResolving, setIsResolving] = useState(false);

  const resolve = useCallback(async (options: {
    ballot: BallotWithAddress;
    outcome?: number; // Required for Authority mode, optional for TallyBased
    onProgress?: (stage: 'building' | 'approving' | 'confirming') => void;
  }): Promise<{ signature: string } | null> => {
    const { ballot, outcome, onProgress } = options;
    const program = client?.getProgram();

    if (!program) {
      throw new Error('Program not available');
    }

    setIsResolving(true);
    try {
      onProgress?.('building');

      // Import SDK function
      const { buildResolveBallotInstruction } = await import('@cloakcraft/sdk');
      const { Transaction, ComputeBudgetProgram } = await import('@solana/web3.js');

      const payer = (program.provider as any).wallet;
      
      // Build instruction
      const ix = await buildResolveBallotInstruction(
        program as any,
        ballot.ballotId,
        outcome ?? null,
        payer.publicKey,
        ballot.resolutionMode === 2 ? payer.publicKey : undefined, // Authority mode needs resolver
      );

      // Build transaction
      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(ix);

      onProgress?.('approving');

      // Send transaction
      const connection = (program.provider as any).connection;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer.publicKey;

      const signed = await payer.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());

      onProgress?.('confirming');

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return { signature };
    } finally {
      setIsResolving(false);
    }
  }, [client]);

  return { resolve, isResolving };
}

/**
 * Hook for finalizing a ballot
 */
export function useFinalizeBallot() {
  const { client } = useCloakCraft();
  const [isFinalizing, setIsFinalizing] = useState(false);

  const finalize = useCallback(async (options: {
    ballot: BallotWithAddress;
    onProgress?: (stage: 'building' | 'approving' | 'confirming') => void;
  }): Promise<{ signature: string } | null> => {
    const { ballot, onProgress } = options;
    const program = client?.getProgram();

    if (!program) {
      throw new Error('Program not available');
    }

    setIsFinalizing(true);
    try {
      onProgress?.('building');

      const { buildFinalizeBallotInstruction } = await import('@cloakcraft/sdk');
      const { Transaction, ComputeBudgetProgram } = await import('@solana/web3.js');

      const payer = (program.provider as any).wallet;
      
      const ix = await buildFinalizeBallotInstruction(
        program as any,
        ballot.ballotId,
        ballot.tokenMint,
        ballot.protocolTreasury,
        payer.publicKey,
      );

      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 200_000 }));
      tx.add(ix);

      onProgress?.('approving');

      const connection = (program.provider as any).connection;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer.publicKey;

      const signed = await payer.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());

      onProgress?.('confirming');

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return { signature };
    } finally {
      setIsFinalizing(false);
    }
  }, [client]);

  return { finalize, isFinalizing };
}

/**
 * Hook for decrypting time-locked tally
 */
export function useDecryptTally() {
  const { client } = useCloakCraft();
  const [isDecrypting, setIsDecrypting] = useState(false);

  const decrypt = useCallback(async (options: {
    ballot: BallotWithAddress;
    decryptionKey: Uint8Array;
    onProgress?: (stage: 'building' | 'approving' | 'confirming') => void;
  }): Promise<{ signature: string } | null> => {
    const { ballot, decryptionKey, onProgress } = options;
    const program = client?.getProgram();

    if (!program) {
      throw new Error('Program not available');
    }

    setIsDecrypting(true);
    try {
      onProgress?.('building');

      const { buildDecryptTallyInstruction } = await import('@cloakcraft/sdk');
      const { Transaction, ComputeBudgetProgram } = await import('@solana/web3.js');

      const payer = (program.provider as any).wallet;
      
      const ix = await buildDecryptTallyInstruction(
        program as any,
        ballot.ballotId,
        decryptionKey,
        payer.publicKey,
      );

      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));
      tx.add(ix);

      onProgress?.('approving');

      const connection = (program.provider as any).connection;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = payer.publicKey;

      const signed = await payer.signTransaction(tx);
      const signature = await connection.sendRawTransaction(signed.serialize());

      onProgress?.('confirming');

      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight,
      });

      return { signature };
    } finally {
      setIsDecrypting(false);
    }
  }, [client]);

  return { decrypt, isDecrypting };
}

/**
 * Hook to check if current user is ballot authority
 */
export function useIsBallotAuthority(ballot: Ballot | null, walletPubkey: PublicKey | null) {
  return useMemo(() => {
    if (!ballot || !walletPubkey) return false;
    return ballot.authority.equals(walletPubkey);
  }, [ballot, walletPubkey]);
}
