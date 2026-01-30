'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PublicKey } from '@solana/web3.js';
import {
  useCloakCraft,
  useBallots,
  useActiveBallots,
  useBallot,
  useBallotTally,
  useBallotTimeStatus,
  useVoteSnapshot,
  useVoteSpend,
  useClaim,
  useVoteValidation,
  useCanClaim,
  useResolveBallot,
  useFinalizeBallot,
  useDecryptTally,
  useChangeVote,
  useCloseVotePosition,
  useIsBallotAuthority,
  type VotingProgressStage,
  type BallotWithAddress,
} from '@cloakcraft/hooks';
import { useWallet } from '@solana/wallet-adapter-react';
import type { DecryptedNote } from '@cloakcraft/sdk';
import {
  Vote,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Trophy,
  Users,
  Coins,
  Eye,
  Lock,
  LockKeyhole,
  Settings,
  Unlock,
  LogOut,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  TransactionOverlay,
  TransactionStep,
} from '@/components/operations';
import { CreateBallotDialog } from '@/components/voting';
import { SUPPORTED_TOKENS, TokenInfo } from '@/lib/constants';
import { formatAmount, parseAmount, toBigInt } from '@/lib/utils';
import { useBallotContentFetch, useBallotContentFetcher } from '@/hooks/useBallotContent';
import type { BallotContent } from '@/lib/ballot-content';
import { getBallotMetadataCid } from '@/lib/ballot-metadata-store';

const VALID_TABS = ['active', 'all', 'my-votes'] as const;
type TabValue = (typeof VALID_TABS)[number];

// Status badge colors
const statusColors: Record<number, string> = {
  0: 'bg-gray-500', // Pending
  1: 'bg-green-500', // Active
  2: 'bg-yellow-500', // Closed
  3: 'bg-blue-500', // Resolved
  4: 'bg-gray-400', // Finalized
};

const statusLabels: Record<number, string> = {
  0: 'Pending',
  1: 'Active',
  2: 'Closed',
  3: 'Resolved',
  4: 'Finalized',
};

// Binding mode labels
const bindingLabels: Record<number, { label: string; icon: React.ReactNode }> = {
  0: { label: 'Snapshot', icon: <Eye className="h-3 w-3" /> },
  1: { label: 'Spend-to-Vote', icon: <Lock className="h-3 w-3" /> },
};

// Reveal mode labels
const revealLabels: Record<number, { label: string; icon: React.ReactNode }> = {
  0: { label: 'Public', icon: <Eye className="h-3 w-3" /> },
  1: { label: 'Time-Locked', icon: <Clock className="h-3 w-3" /> },
  2: { label: 'Private', icon: <LockKeyhole className="h-3 w-3" /> },
};

// Vote type labels
const voteTypeLabels: Record<number, string> = {
  0: 'Single Choice',
  1: 'Approval',
  2: 'Ranked Choice',
  3: 'Weighted',
};

function formatBigIntValue(value: bigint | { toString(): string } | number | null | undefined, decimals: number = 6): string {
  const val = toBigInt(value);
  if (val === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const intPart = val / divisor;
  const fracPart = Math.abs(Number((val % divisor) * 100n / divisor));
  if (fracPart === 0) return intPart.toLocaleString();
  return `${intPart.toLocaleString()}.${fracPart.toString().padStart(2, '0')}`;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return 'Ended';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

// Ballot Card Component
function BallotCard({
  ballot,
  tokenInfo,
  onClick,
}: {
  ballot: BallotWithAddress;
  tokenInfo?: TokenInfo;
  onClick?: () => void;
}) {
  const timeStatus = useBallotTimeStatus(ballot);
  const tally = useBallotTally(ballot);
  const decimals = tokenInfo?.decimals || 6;
  const symbol = tokenInfo?.symbol || 'TOKEN';

  // Fetch ballot metadata from IPFS
  const metadataCid = useMemo(() => getBallotMetadataCid(ballot.ballotId), [ballot.ballotId]);
  const { content: metadata, isLoading: metadataLoading } = useBallotContentFetch(metadataCid || undefined);

  // Get option labels from metadata or fallback to generic
  const getOptionLabel = useCallback((index: number) => {
    if (metadata?.options?.[index]?.label) {
      return metadata.options[index].label;
    }
    return `Option ${index + 1}`;
  }, [metadata]);

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-2">
            {metadataLoading ? (
              <Skeleton className="h-5 w-40" />
            ) : metadata?.title ? (
              metadata.title
            ) : (
              `Ballot #${Buffer.from(ballot.ballotId).toString('hex').slice(0, 8)}`
            )}
          </CardTitle>
          <Badge className={statusColors[ballot.status]}>
            {statusLabels[ballot.status]}
          </Badge>
        </div>
        {metadata?.description && (
          <CardDescription className="line-clamp-2 text-xs">
            {metadata.description}
          </CardDescription>
        )}
        <div className="flex gap-2 flex-wrap mt-1">
          <Badge variant="outline" className="text-xs gap-1">
            {bindingLabels[ballot.bindingMode]?.icon}
            {bindingLabels[ballot.bindingMode]?.label}
          </Badge>
          <Badge variant="outline" className="text-xs gap-1">
            {revealLabels[ballot.revealMode]?.icon}
            {revealLabels[ballot.revealMode]?.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Options Preview */}
        <div className="space-y-2 mb-4">
          {tally?.optionStats.slice(0, 3).map((opt, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="truncate max-w-[60%]">{getOptionLabel(i)}</span>
                <span className="text-muted-foreground">{opt.percentage.toFixed(1)}%</span>
              </div>
              <Progress value={opt.percentage} className="h-1.5" />
            </div>
          ))}
          {ballot.numOptions > 3 && (
            <div className="text-xs text-muted-foreground text-center">
              +{ballot.numOptions - 3} more options
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {Number(ballot.voteCount)} votes
          </span>
          <span className="flex items-center gap-1">
            <Coins className="h-3 w-3" />
            {formatBigIntValue(ballot.totalWeight, decimals)} {symbol}
          </span>
        </div>

        {/* Time */}
        {timeStatus && (
          <div className="mt-2 text-xs text-muted-foreground">
            {timeStatus.isVotingPeriod
              ? `Ends in ${formatTimeRemaining(timeStatus.timeUntilEnd)}`
              : timeStatus.hasStarted
                ? 'Voting ended'
                : `Starts in ${formatTimeRemaining(timeStatus.timeUntilStart)}`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Ballot Detail Component
function BallotDetail({
  ballot,
  tokenInfo,
  onBack,
  onRefresh,
}: {
  ballot: BallotWithAddress;
  tokenInfo?: TokenInfo;
  onBack: () => void;
  onRefresh?: () => void;
}) {
  const { notes, isConnected } = useCloakCraft();
  const { publicKey: walletPubkey } = useWallet();
  const timeStatus = useBallotTimeStatus(ballot);
  const tally = useBallotTally(ballot);
  const decimals = tokenInfo?.decimals || 6;
  const symbol = tokenInfo?.symbol || 'TOKEN';

  // Fetch ballot metadata from IPFS
  const metadataCid = useMemo(() => getBallotMetadataCid(ballot.ballotId), [ballot.ballotId]);
  const { content: metadata, isLoading: metadataLoading } = useBallotContentFetch(metadataCid || undefined);

  // Get option label from metadata or fallback
  const getOptionLabel = useCallback((index: number) => {
    if (metadata?.options?.[index]?.label) {
      return metadata.options[index].label;
    }
    return `Option ${index + 1}`;
  }, [metadata]);

  // Get option description from metadata
  const getOptionDescription = useCallback((index: number) => {
    return metadata?.options?.[index]?.description || null;
  }, [metadata]);

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showVoteForm, setShowVoteForm] = useState(false);
  
  // Vote type-specific state
  const [approvalSelections, setApprovalSelections] = useState<Set<number>>(new Set());
  const [rankings, setRankings] = useState<number[]>([]);
  
  // Change vote state
  const [showChangeVoteForm, setShowChangeVoteForm] = useState(false);
  const [hasVoted, setHasVoted] = useState(false); // TODO: Track from on-chain data
  const [userVoteChoice, setUserVoteChoice] = useState<number | null>(null);
  
  // SpendToVote position state
  const [hasPosition, setHasPosition] = useState(false); // TODO: Track from on-chain data
  const [userPositionAmount, setUserPositionAmount] = useState<bigint>(0n);
  
  // Admin state
  const [resolveOutcome, setResolveOutcome] = useState<number>(0);

  // Filter notes that match the ballot token
  const eligibleNotes = useMemo(() => {
    return notes.filter(n => n.tokenMint.equals(ballot.tokenMint));
  }, [notes, ballot.tokenMint]);

  // Voter hooks
  const { vote: voteSnapshot, isVoting: isSnapshotVoting } = useVoteSnapshot();
  const { vote: voteSpend, isVoting: isSpendVoting } = useVoteSpend();
  const { claim, isClaiming: isClaimInProgress } = useClaim();
  const { changeVote, isChanging } = useChangeVote();
  const { closePosition, isClosing } = useCloseVotePosition();
  
  // Admin hooks
  const { resolve, isResolving } = useResolveBallot();
  const { finalize, isFinalizing } = useFinalizeBallot();
  const { decrypt, isDecrypting } = useDecryptTally();
  const isAuthority = useIsBallotAuthority(ballot, walletPubkey);

  // Compute effective vote choice based on vote type
  const effectiveVoteChoice = useMemo(() => {
    switch (ballot.voteType) {
      case 0: // Single Choice
      case 3: // Weighted (same as single for now)
        return selectedOption ?? 0;
      case 1: // Approval - encode as bitmap
        return Array.from(approvalSelections).reduce((acc, i) => acc | (1 << i), 0);
      case 2: // Ranked Choice - pack into u64 (4 bits per position)
        return rankings.reduce((acc, optIdx, rankPos) => acc | (optIdx << (rankPos * 4)), 0);
      default:
        return selectedOption ?? 0;
    }
  }, [ballot.voteType, selectedOption, approvalSelections, rankings]);

  const validation = useVoteValidation(ballot, selectedNote, effectiveVoteChoice);
  const canClaim = useCanClaim(ballot, null); // TODO: track user's vote

  const isSnapshot = ballot.bindingMode === 0;
  const canVote = timeStatus?.isVotingPeriod && isConnected;
  
  // Conditions for change vote and close position
  const canChangeVote = isSnapshot && hasVoted && timeStatus?.isVotingPeriod;
  const canClosePosition = ballot.bindingMode === 1 && hasPosition && ballot.status < 3;
  
  // Admin action conditions
  const canResolve = isAuthority && ballot.status === 2; // Closed
  const canFinalize = isAuthority && ballot.status === 3; // Resolved
  const canDecrypt = isAuthority && ballot.revealMode === 1 && ballot.status >= 2; // TimeLocked after voting

  const handleVote = useCallback(async () => {
    // Validate based on vote type
    const hasValidSelection = (() => {
      switch (ballot.voteType) {
        case 0: // Single Choice
        case 3: // Weighted
          return selectedOption !== null;
        case 1: // Approval
          return approvalSelections.size > 0;
        case 2: // Ranked Choice
          return rankings.length === ballot.numOptions;
        default:
          return selectedOption !== null;
      }
    })();
    
    if (!selectedNote || !hasValidSelection) return;

    setIsVoting(true);
    try {
      const voteFunc = isSnapshot ? voteSnapshot : voteSpend;
      // Would need proper merkle proof data in production
      const result = await voteFunc({
        ballot,
        note: selectedNote,
        voteChoice: effectiveVoteChoice,
        ...(isSnapshot
          ? {
            snapshotMerkleRoot: new Uint8Array(32),
            merklePath: Array(32).fill(new Uint8Array(32)),
            merklePathIndices: Array(32).fill(0),
          }
          : {
            merklePath: Array(32).fill(new Uint8Array(32)),
            merklePathIndices: Array(32).fill(0),
            leafIndex: 0,
          }),
        onProgress: (stage: VotingProgressStage) => {
          console.log('Vote progress:', stage);
        },
      } as any);

      if (result) {
        toast.success('Vote submitted successfully!');
        setShowVoteForm(false);
        setHasVoted(true);
        setUserVoteChoice(effectiveVoteChoice);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vote failed');
    } finally {
      setIsVoting(false);
    }
  }, [selectedNote, selectedOption, approvalSelections, rankings, isSnapshot, voteSnapshot, voteSpend, ballot, effectiveVoteChoice]);

  // Handle change vote
  const handleChangeVote = useCallback(async () => {
    if (!selectedNote) return;
    
    try {
      const result = await changeVote({
        ballot,
        note: selectedNote,
        newVoteChoice: effectiveVoteChoice,
        // Would need actual vote position data
        oldVoteCommitment: new Uint8Array(32),
        merklePath: Array(32).fill(new Uint8Array(32)),
        merklePathIndices: Array(32).fill(0),
        onProgress: (stage: VotingProgressStage) => {
          console.log('Change vote progress:', stage);
        },
      } as any);

      if (result) {
        toast.success('Vote changed successfully!');
        setShowChangeVoteForm(false);
        setUserVoteChoice(effectiveVoteChoice);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change vote');
    }
  }, [changeVote, ballot, selectedNote, effectiveVoteChoice]);

  // Handle close position (exit SpendToVote)
  const handleClosePosition = useCallback(async () => {
    try {
      const result = await closePosition({
        ballot,
        // Would need actual position data
        positionCommitment: new Uint8Array(32),
        voteChoice: userVoteChoice ?? 0,
        amount: userPositionAmount,
        weight: userPositionAmount,
        positionRandomness: new Uint8Array(32),
        onProgress: (stage: VotingProgressStage) => {
          console.log('Close position progress:', stage);
        },
      } as any);

      if (result) {
        toast.success('Position closed successfully! Tokens returned.');
        setHasPosition(false);
        onRefresh?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close position');
    }
  }, [closePosition, ballot, userVoteChoice, userPositionAmount, decimals, symbol, onRefresh]);

  const handleClaim = useCallback(async () => {
    setIsClaiming(true);
    try {
      // Would need actual position data in production
      const result = await claim({
        ballot,
        positionCommitment: new Uint8Array(32),
        voteChoice: ballot.outcome,
        amount: 0n,
        weight: 0n,
        positionRandomness: new Uint8Array(32),
        onProgress: (stage: VotingProgressStage) => {
          console.log('Claim progress:', stage);
        },
      });

      if (result) {
        toast.success(`Claimed ${formatBigIntValue(result.netPayout, decimals)} ${symbol}!`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setIsClaiming(false);
    }
  }, [claim, ballot, decimals, symbol]);

  // Admin: Resolve ballot
  const handleResolve = useCallback(async () => {
    try {
      const result = await resolve({
        ballot,
        outcome: ballot.resolutionMode === 2 ? resolveOutcome : undefined, // Authority mode needs outcome
        onProgress: (stage) => {
          console.log('Resolve progress:', stage);
        },
      });

      if (result) {
        toast.success('Ballot resolved successfully!');
        onRefresh?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve ballot');
    }
  }, [resolve, ballot, resolveOutcome, onRefresh]);

  // Admin: Finalize ballot
  const handleFinalize = useCallback(async () => {
    try {
      const result = await finalize({
        ballot,
        onProgress: (stage) => {
          console.log('Finalize progress:', stage);
        },
      });

      if (result) {
        toast.success('Ballot finalized successfully!');
        onRefresh?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to finalize ballot');
    }
  }, [finalize, ballot, onRefresh]);

  // Admin: Decrypt tally (would need actual decryption key)
  const handleDecrypt = useCallback(async () => {
    try {
      // In production, you'd get this from a timelock service
      const decryptionKey = new Uint8Array(32); // Placeholder
      
      const result = await decrypt({
        ballot,
        decryptionKey,
        onProgress: (stage) => {
          console.log('Decrypt progress:', stage);
        },
      });

      if (result) {
        toast.success('Tally decrypted successfully!');
        onRefresh?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to decrypt tally');
    }
  }, [decrypt, ballot, onRefresh]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            {metadataLoading ? (
              <Skeleton className="h-6 w-64" />
            ) : metadata?.title ? (
              metadata.title
            ) : (
              `Ballot #${Buffer.from(ballot.ballotId).toString('hex').slice(0, 8)}`
            )}
          </h2>
          <div className="flex gap-2 mt-1 flex-wrap">
            <Badge className={statusColors[ballot.status]}>
              {statusLabels[ballot.status]}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              {bindingLabels[ballot.bindingMode]?.icon}
              {bindingLabels[ballot.bindingMode]?.label}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              {revealLabels[ballot.revealMode]?.icon}
              {revealLabels[ballot.revealMode]?.label}
            </Badge>
          </div>
        </div>
      </div>

      {/* Ballot Description */}
      {metadata?.description && (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {metadata.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Time Status */}
      {timeStatus && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {timeStatus.isVotingPeriod
                  ? `Voting ends in ${formatTimeRemaining(timeStatus.timeUntilEnd)}`
                  : timeStatus.hasStarted
                    ? 'Voting has ended'
                    : `Voting starts in ${formatTimeRemaining(timeStatus.timeUntilStart)}`}
              </div>
              {ballot.hasOutcome && (
                <Badge className="bg-green-500">
                  <Trophy className="h-3 w-3 mr-1" />
                  Winner: Option {ballot.outcome + 1}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      {isAuthority && (canResolve || canFinalize || canDecrypt) && (
        <Card className="border-blue-500/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Authority Actions
            </CardTitle>
            <CardDescription>
              You are the ballot authority
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resolve Ballot */}
            {canResolve && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Voting has ended. Resolve the ballot to determine the outcome.
                </p>
                {ballot.resolutionMode === 2 && ( // Authority mode
                  <div className="flex gap-2 items-center">
                    <Label>Winner:</Label>
                    <Select 
                      value={resolveOutcome.toString()} 
                      onValueChange={(v) => setResolveOutcome(parseInt(v))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: ballot.numOptions }).map((_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            Option {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {ballot.resolutionMode === 0 && ( // TallyBased
                  <p className="text-xs text-muted-foreground">
                    Winner will be determined by highest vote weight.
                  </p>
                )}
                <Button 
                  onClick={handleResolve} 
                  disabled={isResolving}
                  className="w-full"
                >
                  {isResolving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve Ballot
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Finalize Ballot */}
            {canFinalize && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Ballot resolved. Finalize to distribute remaining funds to treasury.
                </p>
                <Button 
                  onClick={handleFinalize} 
                  disabled={isFinalizing}
                  className="w-full"
                  variant="secondary"
                >
                  {isFinalizing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Finalize Ballot
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Decrypt Tally */}
            {canDecrypt && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Time-locked ballot. Decrypt to reveal vote tallies.
                </p>
                <Button 
                  onClick={handleDecrypt} 
                  disabled={isDecrypting}
                  className="w-full"
                  variant="outline"
                >
                  {isDecrypting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Decrypting...
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      Decrypt Tally
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tally Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tally?.optionStats.map((opt, i) => {
            const isWinner = ballot.hasOutcome && ballot.outcome === i;
            const optionDesc = getOptionDescription(i);
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{getOptionLabel(i)}</span>
                    {isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {opt.percentage.toFixed(1)}%
                  </span>
                </div>
                {optionDesc && (
                  <p className="text-xs text-muted-foreground mb-1 line-clamp-2">
                    {optionDesc}
                  </p>
                )}
                <Progress
                  value={opt.percentage}
                  className={`h-2 ${isWinner ? '[&>div]:bg-yellow-500' : ''}`}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {formatBigIntValue(opt.weight, decimals)} {symbol}
                </div>
              </div>
            );
          })}

          {/* Quorum */}
          <div className="pt-4 border-t">
            <div className="flex justify-between text-sm mb-1">
              <span>Quorum</span>
              <span className={tally?.hasQuorum ? 'text-green-500' : 'text-muted-foreground'}>
                {tally?.hasQuorum ? '✓ Reached' : `${tally?.quorumProgress.toFixed(0)}%`}
              </span>
            </div>
            <Progress value={tally?.quorumProgress || 0} className="h-1.5" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{formatBigIntValue(ballot.totalWeight, decimals)} {symbol}</span>
              <span>{formatBigIntValue(ballot.quorumThreshold, decimals)} {symbol} required</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vote Action */}
      {canVote && !showVoteForm && (
        <Button className="w-full" onClick={() => setShowVoteForm(true)}>
          <Vote className="h-4 w-4 mr-2" />
          Cast Your Vote
        </Button>
      )}

      {/* Vote Form */}
      {showVoteForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cast Your Vote</CardTitle>
            {!isSnapshot && (
              <CardDescription className="text-yellow-600">
                ⚠️ Spend-to-Vote: Your tokens will be locked until resolution
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Note Selection */}
            <div>
              <Label>Voting With</Label>
              <Select
                value={selectedNote?.commitment ? Buffer.from(selectedNote.commitment).toString('hex') : ''}
                onValueChange={(v) => {
                  const note = eligibleNotes.find(n =>
                    n.commitment && Buffer.from(n.commitment).toString('hex') === v
                  );
                  setSelectedNote(note || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a note" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleNotes.length === 0 ? (
                    <SelectItem value="" disabled>
                      No eligible notes
                    </SelectItem>
                  ) : (
                    eligibleNotes.map((note) => (
                      <SelectItem
                        key={note.commitment ? Buffer.from(note.commitment).toString('hex') : ''}
                        value={note.commitment ? Buffer.from(note.commitment).toString('hex') : ''}
                      >
                        {formatBigIntValue(note.amount, decimals)} {symbol}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedNote && (
                <div className="text-xs text-muted-foreground mt-1">
                  Voting weight: {formatBigIntValue(selectedNote.amount, decimals)} {symbol}
                </div>
              )}
            </div>

            {/* Option Selection - varies by vote type */}
            <div className="space-y-2">
              <Label>
                {ballot.voteType === 0 && 'Select One Option'}
                {ballot.voteType === 1 && 'Select All That Apply'}
                {ballot.voteType === 2 && 'Rank Options (drag or use numbers)'}
                {ballot.voteType === 3 && 'Select Option'}
              </Label>
              
              {/* Single Choice (voteType=0) or Weighted (voteType=3) */}
              {(ballot.voteType === 0 || ballot.voteType === 3) && (
                <>
                  {Array.from({ length: ballot.numOptions }).map((_, i) => {
                    const optionDesc = getOptionDescription(i);
                    return (
                      <div key={i} className="space-y-1">
                        <Button
                          variant={selectedOption === i ? 'default' : 'outline'}
                          className="w-full justify-start"
                          onClick={() => setSelectedOption(i)}
                        >
                          {getOptionLabel(i)}
                          {tally?.optionStats[i] && (
                            <span className="ml-auto text-xs text-muted-foreground">
                              {tally.optionStats[i].percentage.toFixed(1)}%
                            </span>
                          )}
                        </Button>
                        {optionDesc && selectedOption !== i && (
                          <p className="text-xs text-muted-foreground pl-3 line-clamp-2">{optionDesc}</p>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              
              {/* Approval Vote (voteType=1) - Multi-select checkboxes */}
              {ballot.voteType === 1 && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Select all options you approve of
                  </p>
                  {Array.from({ length: ballot.numOptions }).map((_, i) => {
                    const optionDesc = getOptionDescription(i);
                    return (
                      <div key={i} className="space-y-1">
                        <Button
                          variant={approvalSelections.has(i) ? 'default' : 'outline'}
                          className="w-full justify-start"
                          onClick={() => {
                            const newSelections = new Set(approvalSelections);
                            if (newSelections.has(i)) {
                              newSelections.delete(i);
                            } else {
                              newSelections.add(i);
                            }
                            setApprovalSelections(newSelections);
                          }}
                        >
                          <div className="flex items-center gap-2 w-full">
                            <div className={`w-4 h-4 border rounded flex items-center justify-center ${approvalSelections.has(i) ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                              {approvalSelections.has(i) && <CheckCircle className="h-3 w-3 text-primary-foreground" />}
                            </div>
                            <span>{getOptionLabel(i)}</span>
                            {tally?.optionStats[i] && (
                              <span className="ml-auto text-xs text-muted-foreground">
                                {tally.optionStats[i].percentage.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </Button>
                        {optionDesc && (
                          <p className="text-xs text-muted-foreground pl-8 line-clamp-2">{optionDesc}</p>
                        )}
                      </div>
                    );
                  })}
                  {approvalSelections.size > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Selected: {Array.from(approvalSelections).map(i => getOptionLabel(i)).join(', ')}
                    </p>
                  )}
                </>
              )}
              
              {/* Ranked Choice (voteType=2) - Number inputs for ranking */}
              {ballot.voteType === 2 && (
                <>
                  <p className="text-xs text-muted-foreground mb-2">
                    Assign a rank to each option (1 = most preferred)
                  </p>
                  {Array.from({ length: ballot.numOptions }).map((_, i) => {
                    const currentRank = rankings.indexOf(i);
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <Select
                          value={currentRank >= 0 ? (currentRank + 1).toString() : ''}
                          onValueChange={(v) => {
                            const newRank = parseInt(v) - 1;
                            const newRankings = [...rankings];
                            // Remove this option from current position
                            const existingPos = newRankings.indexOf(i);
                            if (existingPos >= 0) {
                              newRankings.splice(existingPos, 1);
                            }
                            // Insert at new rank position
                            newRankings.splice(newRank, 0, i);
                            setRankings(newRankings);
                          }}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue placeholder="#" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: ballot.numOptions }).map((_, rank) => (
                              <SelectItem key={rank} value={(rank + 1).toString()}>
                                {rank + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex-1 p-2 border rounded-md">
                          {getOptionLabel(i)}
                          {tally?.optionStats[i] && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({tally.optionStats[i].percentage.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {rankings.length > 0 && rankings.length < ballot.numOptions && (
                    <p className="text-xs text-yellow-600">
                      ⚠️ Rank all {ballot.numOptions} options to submit
                    </p>
                  )}
                  {rankings.length === ballot.numOptions && (
                    <p className="text-xs text-muted-foreground">
                      Your ranking: {rankings.map((optIdx, rank) => `${rank + 1}. ${getOptionLabel(optIdx)}`).join(' → ')}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Validation Error */}
            {!validation.isValid && selectedNote && (
              (ballot.voteType === 0 && selectedOption !== null) ||
              (ballot.voteType === 1 && approvalSelections.size > 0) ||
              (ballot.voteType === 2 && rankings.length === ballot.numOptions) ||
              (ballot.voteType === 3 && selectedOption !== null)
            ) && (
              <div className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {validation.error}
              </div>
            )}
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowVoteForm(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleVote}
              disabled={!validation.isValid || isVoting}
              className="flex-1"
            >
              {isVoting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Voting...
                </>
              ) : (
                'Submit Vote'
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Change Vote Section (for Snapshot voters who already voted) */}
      {canChangeVote && !showChangeVoteForm && (
        <Card className="border-blue-500/50">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  You voted for Option {(userVoteChoice ?? 0) + 1}
                </p>
                <p className="text-sm text-muted-foreground">
                  Snapshot voting allows you to change your vote
                </p>
              </div>
              <Button variant="outline" onClick={() => setShowChangeVoteForm(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Change Vote
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Vote Form */}
      {showChangeVoteForm && (
        <Card className="border-blue-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Change Your Vote
            </CardTitle>
            <CardDescription>
              Current vote: Option {(userVoteChoice ?? 0) + 1}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Note Selection */}
            <div>
              <Label>Voting With</Label>
              <Select
                value={selectedNote?.commitment ? Buffer.from(selectedNote.commitment).toString('hex') : ''}
                onValueChange={(v) => {
                  const note = eligibleNotes.find(n =>
                    n.commitment && Buffer.from(n.commitment).toString('hex') === v
                  );
                  setSelectedNote(note || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a note" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleNotes.map((note) => (
                    <SelectItem
                      key={note.commitment ? Buffer.from(note.commitment).toString('hex') : ''}
                      value={note.commitment ? Buffer.from(note.commitment).toString('hex') : ''}
                    >
                      {formatBigIntValue(note.amount, decimals)} {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* New Option Selection */}
            <div className="space-y-2">
              <Label>New Vote</Label>
              {Array.from({ length: ballot.numOptions }).map((_, i) => (
                <Button
                  key={i}
                  variant={selectedOption === i ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedOption(i)}
                  disabled={i === userVoteChoice}
                >
                  Option {i + 1}
                  {i === userVoteChoice && (
                    <span className="ml-auto text-xs">(current)</span>
                  )}
                  {tally?.optionStats[i] && i !== userVoteChoice && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {tally.optionStats[i].percentage.toFixed(1)}%
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
          <CardFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowChangeVoteForm(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleChangeVote}
              disabled={selectedOption === null || selectedOption === userVoteChoice || isChanging || !selectedNote}
              className="flex-1"
            >
              {isChanging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Vote'
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* Close Position Section (for SpendToVote before resolution) */}
      {canClosePosition && (
        <Card className="border-yellow-500/50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-5 w-5 text-yellow-500" />
              Active Position
            </CardTitle>
            <CardDescription>
              You have {formatBigIntValue(userPositionAmount, decimals)} {symbol} locked in this ballot
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Exit your position early to recover your tokens. Note: Early exit may incur a fee
              and you forfeit potential winnings.
            </p>
            <Button 
              variant="outline" 
              onClick={handleClosePosition} 
              disabled={isClosing}
              className="w-full"
            >
              {isClosing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Closing Position...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Exit Position Early
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Claim Section (for resolved SpendToVote ballots) */}
      {ballot.hasOutcome && ballot.bindingMode === 1 && canClaim.canClaim && (
        <Card className="border-green-500">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Claim Your Winnings!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              You voted for the winning option. Claim your share of the pool!
            </p>
            <Button onClick={handleClaim} disabled={isClaiming} className="w-full">
              {isClaiming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Claiming...
                </>
              ) : (
                'Claim Winnings'
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Total Votes</div>
              <div className="font-medium">{Number(ballot.voteCount)}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Total Weight</div>
              <div className="font-medium">{formatBigIntValue(ballot.totalWeight, decimals)} {symbol}</div>
            </div>
            {ballot.bindingMode === 1 && (
              <>
                <div>
                  <div className="text-muted-foreground">Pool Balance</div>
                  <div className="font-medium">{formatBigIntValue(ballot.poolBalance, decimals)} {symbol}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fees Collected</div>
                  <div className="font-medium">{formatBigIntValue(ballot.feesCollected, decimals)} {symbol}</div>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VotingPage() {
  const params = useParams();
  const router = useRouter();

  // Get tab from URL path
  const tabFromPath = params.tab?.[0] as string | undefined;
  const currentTab: TabValue = VALID_TABS.includes(tabFromPath as TabValue)
    ? (tabFromPath as TabValue)
    : 'active';

  const [selectedBallotAddress, setSelectedBallotAddress] = useState<string | null>(null);

  const handleTabChange = useCallback(
    (value: string) => {
      router.push(`/voting/${value}`);
      setSelectedBallotAddress(null);
    },
    [router]
  );

  const {
    isConnected: isStealthConnected,
    isProgramReady,
    wallet,
    notes,
  } = useCloakCraft();

  // Fetch ballots
  const { ballots: allBallots, isLoading: ballotsLoading, refresh: refreshBallots } = useBallots();
  const { ballots: activeBallots } = useActiveBallots();

  // Get selected ballot
  const selectedBallot = useMemo(() => {
    if (!selectedBallotAddress) return null;
    return allBallots.find(b => b.address.toString() === selectedBallotAddress) || null;
  }, [allBallots, selectedBallotAddress]);

  // Get token info for selected ballot
  const selectedTokenInfo = useMemo(() => {
    if (!selectedBallot) return undefined;
    return SUPPORTED_TOKENS.find(t =>
      new PublicKey(t.mint).equals(selectedBallot.tokenMint)
    );
  }, [selectedBallot]);

  // Track user's voted ballots (placeholder - would come from on-chain data)
  const [userVotedBallots, setUserVotedBallots] = useState<Set<string>>(new Set());
  const [userPositions, setUserPositions] = useState<Map<string, bigint>>(new Map());
  
  // Ballots to display based on tab
  const displayBallots = useMemo(() => {
    if (currentTab === 'active') return activeBallots;
    if (currentTab === 'all') return allBallots;
    if (currentTab === 'my-votes') {
      // Filter to ballots where user has voted or has a position
      return allBallots.filter(b => 
        userVotedBallots.has(b.address.toString()) || 
        userPositions.has(b.address.toString())
      );
    }
    return [];
  }, [currentTab, activeBallots, allBallots, userVotedBallots, userPositions]);

  // Show setup required message if stealth wallet not connected
  if (!isStealthConnected) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Voting</h1>
          <p className="text-muted-foreground">
            Participate in private governance votes.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Stealth wallet required</p>
                <p className="text-sm">
                  Create a stealth wallet to participate in voting. Click the
                  &quot;Stealth Wallet&quot; button in the header.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show ballot detail if one is selected
  if (selectedBallot) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <BallotDetail
          ballot={selectedBallot}
          tokenInfo={selectedTokenInfo}
          onBack={() => setSelectedBallotAddress(null)}
          onRefresh={refreshBallots}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Voting</h1>
          <p className="text-muted-foreground">
            Participate in private governance votes.
          </p>
        </div>
        <CreateBallotDialog onSuccess={() => refreshBallots()} />
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <Vote className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">Active</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <Clock className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">All Ballots</span>
          </TabsTrigger>
          <TabsTrigger value="my-votes" className="gap-1 xs:gap-2 px-2 xs:px-3 text-xs xs:text-sm">
            <CheckCircle className="h-4 w-4 shrink-0" />
            <span className="hidden xs:inline">My Votes</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {ballotsLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : displayBallots.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Vote className="h-12 w-12 mx-auto mb-4 opacity-50" />
                {currentTab === 'my-votes' ? (
                  <>
                    <p className="font-medium">No votes recorded yet</p>
                    <p className="text-sm mt-1 max-w-sm mx-auto">
                      Your voting history will appear here after you cast votes on active ballots.
                    </p>
                    <div className="mt-4 rounded-lg bg-muted/50 p-4 text-left text-sm max-w-sm mx-auto">
                      <p className="font-medium text-foreground mb-2">How voting works</p>
                      <ul className="space-y-1 list-disc list-inside text-xs">
                        <li><strong>Snapshot:</strong> Prove balance, keep tokens liquid</li>
                        <li><strong>Spend-to-Vote:</strong> Lock tokens, earn from winning</li>
                        <li>All votes are private using ZK proofs</li>
                      </ul>
                    </div>
                  </>
                ) : currentTab === 'active' ? (
                  <>
                    <p className="font-medium">No active ballots</p>
                    <p className="text-sm mt-1">Check back later for new governance votes</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">No ballots found</p>
                    <p className="text-sm mt-1">No governance ballots have been created yet</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {displayBallots.map((ballot) => {
                const tokenInfo = SUPPORTED_TOKENS.find(t =>
                  new PublicKey(t.mint).equals(ballot.tokenMint)
                );
                return (
                  <BallotCard
                    key={ballot.address.toString()}
                    ballot={ballot}
                    tokenInfo={tokenInfo}
                    onClick={() => setSelectedBallotAddress(ballot.address.toString())}
                  />
                );
              })}
            </div>
          )}
        </div>
      </Tabs>
    </div>
  );
}
