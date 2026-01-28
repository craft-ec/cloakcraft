'use client';

import { useState, useCallback, useMemo } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useCloakCraft } from '@cloakcraft/hooks';
import {
  buildCreateBallotInstruction,
  VoteBindingMode,
  RevealMode,
  VoteType,
  ResolutionMode,
  WeightOp,
} from '@cloakcraft/sdk';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Plus, Vote, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { SUPPORTED_TOKENS } from '@/lib/constants';

interface CreateBallotDialogProps {
  children?: React.ReactNode;
  onSuccess?: (ballotId: Uint8Array) => void;
}

export function CreateBallotDialog({ children, onSuccess }: CreateBallotDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { connection } = useConnection();
  const wallet = useWallet();
  const { client, isProgramReady } = useCloakCraft();

  // Form state
  const [tokenMint, setTokenMint] = useState<string>(SUPPORTED_TOKENS[0]?.mint.toBase58() || '');
  const [numOptions, setNumOptions] = useState(2);
  const [bindingMode, setBindingMode] = useState<VoteBindingMode>(VoteBindingMode.Snapshot);
  const [revealMode, setRevealMode] = useState<RevealMode>(RevealMode.Public);
  const [voteType, setVoteType] = useState<VoteType>(VoteType.Single);
  const [resolutionMode, setResolutionMode] = useState<ResolutionMode>(ResolutionMode.TallyBased);
  
  // Timing
  const [startInMinutes, setStartInMinutes] = useState(0); // 0 = start immediately
  const [durationHours, setDurationHours] = useState(24);
  
  // Advanced settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [quorumThreshold, setQuorumThreshold] = useState('0');
  const [protocolFeeBps, setProtocolFeeBps] = useState(100); // 1%
  const [useEligibilityRoot, setUseEligibilityRoot] = useState(false);

  const selectedToken = useMemo(() => {
    return SUPPORTED_TOKENS.find(t => t.mint.toBase58() === tokenMint);
  }, [tokenMint]);
  
  const program = client?.getProgram();

  const handleCreate = useCallback(async () => {
    if (!program || !wallet.publicKey || !wallet.signTransaction) {
      toast.error('Wallet not connected');
      return;
    }

    setIsCreating(true);
    try {
      // Generate random ballot ID
      const ballotId = crypto.getRandomValues(new Uint8Array(32));
      
      // Calculate timestamps
      const now = Math.floor(Date.now() / 1000);
      const startTime = now + (startInMinutes * 60);
      const endTime = startTime + (durationHours * 3600);
      
      // Get current slot for snapshot (approximate)
      const slot = await connection.getSlot();
      const snapshotSlot = slot + (startInMinutes * 2); // ~2 slots per minute on Solana

      // Parse quorum
      const decimals = selectedToken?.decimals || 6;
      const quorum = BigInt(Math.floor(parseFloat(quorumThreshold || '0') * (10 ** decimals)));

      // Build instruction
      const instruction = await buildCreateBallotInstruction(
        program,
        {
          ballotId,
          bindingMode: bindingMode === VoteBindingMode.Snapshot 
            ? { snapshot: {} } 
            : { spendToVote: {} },
          revealMode: revealMode === RevealMode.Public 
            ? { public: {} } 
            : revealMode === RevealMode.TimeLocked 
              ? { timeLocked: {} } 
              : { permanentPrivate: {} },
          voteType: voteType === VoteType.Single 
            ? { single: {} }
            : voteType === VoteType.Approval
              ? { approval: {} }
              : voteType === VoteType.Ranked
                ? { ranked: {} }
                : { weighted: {} },
          resolutionMode: resolutionMode === ResolutionMode.TallyBased
            ? { tallyBased: {} }
            : resolutionMode === ResolutionMode.Oracle
              ? { oracle: {} }
              : { authority: {} },
          numOptions,
          quorumThreshold: quorum,
          protocolFeeBps,
          protocolTreasury: wallet.publicKey, // Use wallet as treasury for now
          startTime,
          endTime,
          snapshotSlot,
          indexerPubkey: wallet.publicKey, // Use wallet as indexer for now
          eligibilityRoot: useEligibilityRoot ? new Uint8Array(32) : null,
          weightFormula: [WeightOp.PushAmount], // Simple: weight = amount
          weightParams: [],
          timeLockPubkey: new Uint8Array(32),
          unlockSlot: 0,
          resolver: resolutionMode === ResolutionMode.Authority ? wallet.publicKey : null,
          oracle: resolutionMode === ResolutionMode.Oracle ? wallet.publicKey : null,
          claimDeadline: bindingMode === VoteBindingMode.SpendToVote 
            ? endTime + (7 * 24 * 3600) // 7 days after end
            : 0,
        },
        new PublicKey(tokenMint),
        wallet.publicKey,
        wallet.publicKey,
      );

      // Build and send transaction
      const { Transaction, ComputeBudgetProgram } = await import('@solana/web3.js');
      const tx = new Transaction();
      tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));
      tx.add(instruction);
      
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      const signed = await wallet.signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize());
      
      await connection.confirmTransaction({
        signature: sig,
        blockhash,
        lastValidBlockHeight,
      });

      toast.success('Ballot created successfully!');
      setOpen(false);
      onSuccess?.(ballotId);
    } catch (err) {
      console.error('Create ballot error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create ballot');
    } finally {
      setIsCreating(false);
    }
  }, [
    program, wallet, connection, tokenMint, numOptions, bindingMode, revealMode,
    voteType, resolutionMode, startInMinutes, durationHours, quorumThreshold,
    protocolFeeBps, useEligibilityRoot, selectedToken, onSuccess,
  ]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Ballot
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Create New Ballot
          </DialogTitle>
          <DialogDescription>
            Set up a new governance vote. Voters can participate using their shielded tokens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Token Selection */}
          <div className="space-y-2">
            <Label>Voting Token</Label>
            <Select value={tokenMint} onValueChange={setTokenMint}>
              <SelectTrigger>
                <SelectValue placeholder="Select token" />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_TOKENS.map((token) => (
                  <SelectItem key={token.mint.toBase58()} value={token.mint.toBase58()}>
                    {token.symbol} - {token.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Number of Options */}
          <div className="space-y-2">
            <Label>Number of Options</Label>
            <Select value={numOptions.toString()} onValueChange={(v) => setNumOptions(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <SelectItem key={n} value={n.toString()}>
                    {n} options
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Binding Mode */}
          <div className="space-y-2">
            <Label>Voting Mode</Label>
            <Select 
              value={bindingMode.toString()} 
              onValueChange={(v) => setBindingMode(parseInt(v) as VoteBindingMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VoteBindingMode.Snapshot.toString()}>
                  Snapshot (tokens stay liquid)
                </SelectItem>
                <SelectItem value={VoteBindingMode.SpendToVote.toString()}>
                  Spend-to-Vote (tokens locked, winners share pool)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {bindingMode === VoteBindingMode.Snapshot 
                ? "Voters prove ownership without locking tokens."
                : "Tokens are locked and redistributed to winners (prediction market style)."}
            </p>
          </div>

          {/* Reveal Mode */}
          <div className="space-y-2">
            <Label>Privacy Level</Label>
            <Select 
              value={revealMode.toString()} 
              onValueChange={(v) => setRevealMode(parseInt(v) as RevealMode)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={RevealMode.Public.toString()}>
                  Public (votes visible immediately)
                </SelectItem>
                <SelectItem value={RevealMode.TimeLocked.toString()}>
                  Time-Locked (revealed after voting ends)
                </SelectItem>
                <SelectItem value={RevealMode.PermanentPrivate.toString()}>
                  Permanent Private (only aggregates revealed)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Delay</Label>
              <Select 
                value={startInMinutes.toString()} 
                onValueChange={(v) => setStartInMinutes(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Immediately</SelectItem>
                  <SelectItem value="5">In 5 minutes</SelectItem>
                  <SelectItem value="30">In 30 minutes</SelectItem>
                  <SelectItem value="60">In 1 hour</SelectItem>
                  <SelectItem value="1440">In 1 day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Duration</Label>
              <Select 
                value={durationHours.toString()} 
                onValueChange={(v) => setDurationHours(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="6">6 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="72">3 days</SelectItem>
                  <SelectItem value="168">7 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <Button 
            variant="ghost" 
            type="button"
            className="w-full justify-between text-sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            Advanced Settings
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
              {/* Vote Type */}
              <div className="space-y-2">
                <Label>Vote Type</Label>
                <Select 
                  value={voteType.toString()} 
                  onValueChange={(v) => setVoteType(parseInt(v) as VoteType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={VoteType.Single.toString()}>Single Choice</SelectItem>
                    <SelectItem value={VoteType.Approval.toString()}>Approval (multi-select)</SelectItem>
                    <SelectItem value={VoteType.Ranked.toString()}>Ranked Choice</SelectItem>
                    <SelectItem value={VoteType.Weighted.toString()}>Weighted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Resolution Mode */}
              <div className="space-y-2">
                <Label>Resolution</Label>
                <Select 
                  value={resolutionMode.toString()} 
                  onValueChange={(v) => setResolutionMode(parseInt(v) as ResolutionMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ResolutionMode.TallyBased.toString()}>
                      Tally-Based (highest wins)
                    </SelectItem>
                    <SelectItem value={ResolutionMode.Authority.toString()}>
                      Authority (you decide outcome)
                    </SelectItem>
                    <SelectItem value={ResolutionMode.Oracle.toString()}>
                      Oracle (external source)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quorum */}
              <div className="space-y-2">
                <Label>Quorum Threshold ({selectedToken?.symbol || 'tokens'})</Label>
                <Input
                  type="number"
                  value={quorumThreshold}
                  onChange={(e) => setQuorumThreshold(e.target.value)}
                  placeholder="0 = no quorum"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum participation required for valid outcome
                </p>
              </div>

              {/* Protocol Fee (SpendToVote only) */}
              {bindingMode === VoteBindingMode.SpendToVote && (
                <div className="space-y-2">
                  <Label>Protocol Fee</Label>
                  <Select 
                    value={protocolFeeBps.toString()} 
                    onValueChange={(v) => setProtocolFeeBps(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0%</SelectItem>
                      <SelectItem value="50">0.5%</SelectItem>
                      <SelectItem value="100">1%</SelectItem>
                      <SelectItem value="250">2.5%</SelectItem>
                      <SelectItem value="500">5%</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || !isProgramReady || !wallet.publicKey}
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Create Ballot
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
