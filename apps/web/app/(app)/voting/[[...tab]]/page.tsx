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
  type VotingProgressStage,
  type BallotWithAddress,
} from '@cloakcraft/hooks';
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
import { SUPPORTED_TOKENS, TokenInfo } from '@/lib/constants';
import { formatAmount, parseAmount, toBigInt } from '@/lib/utils';

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

function formatBigInt(value: bigint, decimals: number = 6): string {
  if (value === 0n) return '0';
  const divisor = BigInt(10 ** decimals);
  const intPart = value / divisor;
  const fracPart = Math.abs(Number((value % divisor) * 100n / divisor));
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

  return (
    <Card
      className="cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base line-clamp-1">
            Ballot #{Buffer.from(ballot.ballotId).toString('hex').slice(0, 8)}
          </CardTitle>
          <Badge className={statusColors[ballot.status]}>
            {statusLabels[ballot.status]}
          </Badge>
        </div>
        <div className="flex gap-2 flex-wrap">
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
                <span>Option {i + 1}</span>
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
            {formatBigInt(ballot.totalWeight, decimals)} {symbol}
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
}: {
  ballot: BallotWithAddress;
  tokenInfo?: TokenInfo;
  onBack: () => void;
}) {
  const { notes, isConnected } = useCloakCraft();
  const timeStatus = useBallotTimeStatus(ballot);
  const tally = useBallotTally(ballot);
  const decimals = tokenInfo?.decimals || 6;
  const symbol = tokenInfo?.symbol || 'TOKEN';

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState<DecryptedNote | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showVoteForm, setShowVoteForm] = useState(false);

  // Filter notes that match the ballot token
  const eligibleNotes = useMemo(() => {
    return notes.filter(n => n.tokenMint.equals(ballot.tokenMint));
  }, [notes, ballot.tokenMint]);

  // Hooks
  const { vote: voteSnapshot, isVoting: isSnapshotVoting } = useVoteSnapshot();
  const { vote: voteSpend, isVoting: isSpendVoting } = useVoteSpend();
  const { claim, isClaiming: isClaimInProgress } = useClaim();

  const validation = useVoteValidation(ballot, selectedNote, selectedOption || 0);
  const canClaim = useCanClaim(ballot, null); // TODO: track user's vote

  const isSnapshot = ballot.bindingMode === 0;
  const canVote = timeStatus?.isVotingPeriod && isConnected;

  const handleVote = useCallback(async () => {
    if (!selectedNote || selectedOption === null) return;

    setIsVoting(true);
    try {
      const voteFunc = isSnapshot ? voteSnapshot : voteSpend;
      // Would need proper merkle proof data in production
      const result = await voteFunc({
        ballot,
        note: selectedNote,
        voteChoice: selectedOption,
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
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Vote failed');
    } finally {
      setIsVoting(false);
    }
  }, [selectedNote, selectedOption, isSnapshot, voteSnapshot, voteSpend, ballot]);

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
        toast.success(`Claimed ${formatBigInt(result.netPayout, decimals)} ${symbol}!`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed');
    } finally {
      setIsClaiming(false);
    }
  }, [claim, ballot, decimals, symbol]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">
            Ballot #{Buffer.from(ballot.ballotId).toString('hex').slice(0, 8)}
          </h2>
          <div className="flex gap-2 mt-1">
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

      {/* Tally Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tally?.optionStats.map((opt, i) => {
            const isWinner = ballot.hasOutcome && ballot.outcome === i;
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Option {i + 1}</span>
                    {isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {opt.percentage.toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={opt.percentage}
                  className={`h-2 ${isWinner ? '[&>div]:bg-yellow-500' : ''}`}
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {formatBigInt(opt.weight, decimals)} {symbol}
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
              <span>{formatBigInt(ballot.totalWeight, decimals)} {symbol}</span>
              <span>{formatBigInt(ballot.quorumThreshold, decimals)} {symbol} required</span>
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
                        {formatBigInt(note.amount, decimals)} {symbol}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedNote && (
                <div className="text-xs text-muted-foreground mt-1">
                  Voting weight: {formatBigInt(selectedNote.amount, decimals)} {symbol}
                </div>
              )}
            </div>

            {/* Option Selection */}
            <div className="space-y-2">
              <Label>Select Option</Label>
              {Array.from({ length: ballot.numOptions }).map((_, i) => (
                <Button
                  key={i}
                  variant={selectedOption === i ? 'default' : 'outline'}
                  className="w-full justify-start"
                  onClick={() => setSelectedOption(i)}
                >
                  Option {i + 1}
                  {tally?.optionStats[i] && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      {tally.optionStats[i].percentage.toFixed(1)}%
                    </span>
                  )}
                </Button>
              ))}
            </div>

            {/* Validation Error */}
            {!validation.isValid && selectedNote && selectedOption !== null && (
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
              <div className="font-medium">{formatBigInt(ballot.totalWeight, decimals)} {symbol}</div>
            </div>
            {ballot.bindingMode === 1 && (
              <>
                <div>
                  <div className="text-muted-foreground">Pool Balance</div>
                  <div className="font-medium">{formatBigInt(ballot.poolBalance, decimals)} {symbol}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Fees Collected</div>
                  <div className="font-medium">{formatBigInt(ballot.feesCollected, decimals)} {symbol}</div>
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

  // Ballots to display based on tab
  const displayBallots = useMemo(() => {
    if (currentTab === 'active') return activeBallots;
    if (currentTab === 'all') return allBallots;
    // TODO: Implement my-votes filtering
    return [];
  }, [currentTab, activeBallots, allBallots]);

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
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Voting</h1>
        <p className="text-muted-foreground">
          Participate in private governance votes.
        </p>
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
