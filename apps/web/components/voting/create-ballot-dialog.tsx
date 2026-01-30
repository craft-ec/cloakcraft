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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Vote, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { SUPPORTED_TOKENS } from '@/lib/constants';
import { useBallotUpload } from '@/hooks/useBallotContent';
import type { BallotOptionContent } from '@/lib/ballot-content';
import { saveBallotMetadataCid } from '@/lib/ballot-metadata-store';

interface CreateBallotDialogProps {
  children?: React.ReactNode;
  onSuccess?: (ballotId: Uint8Array, metadataCid?: string) => void;
}

export function CreateBallotDialog({ children, onSuccess }: CreateBallotDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const { connection } = useConnection();
  const wallet = useWallet();
  const { client, isProgramReady } = useCloakCraft();
  const { uploadBallot, isUploading, error: uploadError } = useBallotUpload();

  // Form state - Metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<BallotOptionContent[]>([
    { label: '', description: '' },
    { label: '', description: '' },
  ]);

  // Form state - On-chain settings
  const [tokenMint, setTokenMint] = useState<string>(SUPPORTED_TOKENS[0]?.mint.toBase58() || '');
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

  // Handle number of options change
  const handleNumOptionsChange = useCallback((num: number) => {
    setOptions((prev) => {
      if (num > prev.length) {
        // Add more options
        const newOptions = [...prev];
        for (let i = prev.length; i < num; i++) {
          newOptions.push({ label: '', description: '' });
        }
        return newOptions;
      } else if (num < prev.length) {
        // Remove options from the end
        return prev.slice(0, num);
      }
      return prev;
    });
  }, []);

  // Update a specific option
  const updateOption = useCallback((index: number, field: 'label' | 'description', value: string) => {
    setOptions((prev) => {
      const newOptions = [...prev];
      newOptions[index] = { ...newOptions[index], [field]: value };
      return newOptions;
    });
  }, []);

  // Validate form
  const isFormValid = useMemo(() => {
    if (!title.trim()) return false;
    if (!description.trim()) return false;
    if (options.length < 2) return false;
    // All options must have labels
    if (options.some(opt => !opt.label.trim())) return false;
    return true;
  }, [title, description, options]);

  const handleCreate = useCallback(async () => {
    if (!program || !wallet.publicKey || !wallet.signTransaction) {
      toast.error('Wallet not connected');
      return;
    }

    if (!isFormValid) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsCreating(true);
    try {
      // Step 1: Upload metadata to IPFS
      toast.info('Uploading ballot metadata to IPFS...');
      const uploadResult = await uploadBallot({
        title: title.trim(),
        description: description.trim(),
        options: options.map(opt => ({
          label: opt.label.trim(),
          description: opt.description?.trim() || undefined,
        })),
      });

      if (!uploadResult) {
        throw new Error(uploadError || 'Failed to upload metadata to IPFS');
      }

      toast.info(`Metadata uploaded! CID: ${uploadResult.cid.slice(0, 8)}...`);

      // Step 2: Generate random ballot ID
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

      // Step 3: Build instruction with metadata CID
      // Note: The CID is stored as the ballot's "detailsCid" or similar field
      // This depends on your on-chain program structure
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
          numOptions: options.length,
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
          // Store the IPFS CID for metadata lookup
          // If your program supports it, pass it here
          // metadataCid: uploadResult.cid,
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

      // Save the metadata CID mapping for later retrieval
      saveBallotMetadataCid(ballotId, uploadResult.cid);

      toast.success('Ballot created successfully!');
      
      // Reset form
      setTitle('');
      setDescription('');
      setOptions([{ label: '', description: '' }, { label: '', description: '' }]);
      setOpen(false);
      
      onSuccess?.(ballotId, uploadResult.cid);
    } catch (err) {
      console.error('Create ballot error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to create ballot');
    } finally {
      setIsCreating(false);
    }
  }, [
    program, wallet, connection, tokenMint, bindingMode, revealMode,
    voteType, resolutionMode, startInMinutes, durationHours, quorumThreshold,
    protocolFeeBps, useEligibilityRoot, selectedToken, onSuccess,
    title, description, options, isFormValid, uploadBallot, uploadError,
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Vote className="h-5 w-5" />
            Create New Ballot
          </DialogTitle>
          <DialogDescription>
            Set up a new governance vote. Metadata is stored on IPFS for decentralization.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Ballot Metadata Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold text-sm">Ballot Information</h3>
            
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="ballot-title">Title *</Label>
              <Input
                id="ballot-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Proposal #42: Treasury Allocation"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="ballot-description">Description *</Label>
              <Textarea
                id="ballot-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this vote is about and provide any relevant context..."
                className="min-h-[100px]"
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground text-right">
                {description.length}/2000
              </p>
            </div>
          </div>

          {/* Options Section */}
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Voting Options</h3>
              <Select 
                value={options.length.toString()} 
                onValueChange={(v) => handleNumOptionsChange(parseInt(v))}
              >
                <SelectTrigger className="w-32">
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

            <div className="space-y-4">
              {options.map((option, index) => (
                <div key={index} className="space-y-2 p-3 bg-muted/30 rounded-lg">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Option {index + 1}
                  </Label>
                  <Input
                    value={option.label}
                    onChange={(e) => updateOption(index, 'label', e.target.value)}
                    placeholder={`Option ${index + 1} label (e.g., "Yes", "No", "Abstain")`}
                    maxLength={50}
                  />
                  <Textarea
                    value={option.description || ''}
                    onChange={(e) => updateOption(index, 'description', e.target.value)}
                    placeholder="Optional: Describe what selecting this option means..."
                    className="min-h-[60px] text-sm"
                    maxLength={500}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* On-Chain Settings */}
          <div className="space-y-4">
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

          {/* Validation Warning */}
          {!isFormValid && (
            <div className="flex items-center gap-2 text-sm text-yellow-600 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                {!title.trim() 
                  ? 'Please enter a ballot title' 
                  : !description.trim() 
                    ? 'Please enter a ballot description'
                    : options.some(opt => !opt.label.trim())
                      ? 'All options must have labels'
                      : 'Please complete all required fields'}
              </span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={isCreating || isUploading || !isProgramReady || !wallet.publicKey || !isFormValid}
          >
            {isCreating || isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isUploading ? 'Uploading...' : 'Creating...'}
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
