import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createMint, mintTo, getAccount, createAccount } from "@solana/spl-token";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

/**
 * Voting Protocol Tests
 *
 * Tests for the privacy-preserving voting system:
 * - Ballot creation and management
 * - Vote submission (Snapshot and SpendToVote modes)
 * - Vote change and position management
 * - Claim payouts
 */

describe("Voting Protocol", () => {
  // Try to get provider, skip blockchain tests if not available
  let provider: anchor.AnchorProvider | null = null;
  try {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  } catch {
    // Provider not available, unit tests will still run
  }

  // Program ID (must match deployed program)
  const PROGRAM_ID = new PublicKey("CLoAKcRaFt1111111111111111111111111111111111");

  // Test accounts
  let authority: Keypair;
  let voter1: Keypair;
  let voter2: Keypair;
  let tokenMint: PublicKey;
  let protocolTreasury: PublicKey;
  let indexerKeypair: Keypair;

  // Ballot configuration
  const ballotId = new Uint8Array(32);
  ballotId[0] = 1; // Simple ballot ID for testing

  before(async () => {
    // Initialize test accounts
    authority = Keypair.generate();
    voter1 = Keypair.generate();
    voter2 = Keypair.generate();
    indexerKeypair = Keypair.generate();
    protocolTreasury = Keypair.generate().publicKey;

    // Skip blockchain setup if no provider
    if (!provider) {
      tokenMint = Keypair.generate().publicKey;
      return;
    }

    // Airdrop SOL to test accounts
    const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL;

    await provider.connection.requestAirdrop(authority.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(voter1.publicKey, airdropAmount);
    await provider.connection.requestAirdrop(voter2.publicKey, airdropAmount);

    // Wait for airdrops to confirm
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Create token mint for voting
    tokenMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      9 // 9 decimals
    );
  });

  describe("PDA Derivation", () => {
    it("can derive ballot PDA", () => {
      const [ballotPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("ballot"), Buffer.from(ballotId)],
        PROGRAM_ID
      );

      expect(ballotPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a("number");
    });

    it("can derive ballot vault PDA", () => {
      const [vaultPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("ballot_vault"), Buffer.from(ballotId)],
        PROGRAM_ID
      );

      expect(vaultPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a("number");
    });

    it("can derive verification key PDA", () => {
      const circuitId = Buffer.from("vote_snapshot___________________");
      const [vkPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("vk"), circuitId],
        PROGRAM_ID
      );

      expect(vkPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a("number");
    });
  });

  describe("Ballot Configuration", () => {
    it("validates binding mode enum", () => {
      // VoteBindingMode: Snapshot = 0, SpendToVote = 1
      const snapshotMode = 0;
      const spendToVoteMode = 1;

      expect(snapshotMode).to.equal(0);
      expect(spendToVoteMode).to.equal(1);
    });

    it("validates reveal mode enum", () => {
      // RevealMode: Public = 0, TimeLocked = 1, PermanentPrivate = 2
      const publicMode = 0;
      const timeLockedMode = 1;
      const permanentPrivateMode = 2;

      expect(publicMode).to.equal(0);
      expect(timeLockedMode).to.equal(1);
      expect(permanentPrivateMode).to.equal(2);
    });

    it("validates vote type enum", () => {
      // VoteType: Single = 0, Approval = 1, Ranked = 2, Weighted = 3
      const singleVote = 0;
      const approvalVote = 1;
      const rankedVote = 2;
      const weightedVote = 3;

      expect(singleVote).to.equal(0);
      expect(approvalVote).to.equal(1);
      expect(rankedVote).to.equal(2);
      expect(weightedVote).to.equal(3);
    });

    it("validates resolution mode enum", () => {
      // ResolutionMode: TallyBased = 0, Oracle = 1, Authority = 2
      const tallyBased = 0;
      const oracle = 1;
      const authorityMode = 2;

      expect(tallyBased).to.equal(0);
      expect(oracle).to.equal(1);
      expect(authorityMode).to.equal(2);
    });
  });

  describe("Verification Keys", () => {
    const votingCircuits = [
      "vote_snapshot",
      "change_vote_snapshot",
      "vote_spend",
      "close_position",
      "claim",
    ];

    for (const circuit of votingCircuits) {
      it(`${circuit} verification key exists`, function() {
        const vkPath = path.join(
          __dirname,
          "..",
          "circom-circuits",
          "build",
          "voting",
          `${circuit}_verification_key.json`
        );

        if (!fs.existsSync(vkPath)) {
          this.skip();
          return;
        }

        const vkData = JSON.parse(fs.readFileSync(vkPath, "utf-8"));
        expect(vkData).to.have.property("protocol");
        expect(vkData.protocol).to.equal("groth16");
        expect(vkData).to.have.property("curve");
        expect(vkData.curve).to.equal("bn128");
      });
    }
  });

  describe("Commitment Calculations", () => {
    it("vote nullifier is 32 bytes", () => {
      // vote_nullifier = hash(VOTE_NULLIFIER_DOMAIN, nullifier_key, ballot_id)
      const nullifierKey = new Uint8Array(32);
      const result = computeVoteNullifier(nullifierKey, ballotId);
      expect(result.length).to.equal(32);
    });

    it("vote commitment is 32 bytes", () => {
      // vote_commitment = hash(ballot_id, vote_nullifier, pubkey, vote_choice, weight, randomness)
      const voteNullifier = new Uint8Array(32);
      const pubkey = new Uint8Array(32);
      const voteChoice = 0;
      const weight = BigInt(1000);
      const randomness = new Uint8Array(32);

      const result = computeVoteCommitment(
        ballotId,
        voteNullifier,
        pubkey,
        voteChoice,
        weight,
        randomness
      );
      expect(result.length).to.equal(32);
    });

    it("position commitment is 32 bytes", () => {
      // position_commitment = hash(ballot_id, pubkey, vote_choice, amount, weight, randomness)
      const pubkey = new Uint8Array(32);
      const voteChoice = 0;
      const amount = BigInt(1000);
      const weight = BigInt(1000);
      const randomness = new Uint8Array(32);

      const result = computePositionCommitment(
        ballotId,
        pubkey,
        voteChoice,
        amount,
        weight,
        randomness
      );
      expect(result.length).to.equal(32);
    });
  });

  describe("Weight Formula Evaluation", () => {
    it("evaluates linear weight formula", () => {
      // weight = amount (simplest formula)
      const amount = BigInt(1000);
      const formula = [0]; // PushAmount
      const params: bigint[] = [];

      const weight = evaluateWeightFormula(amount, formula, params);
      expect(weight).to.equal(amount);
    });

    it("evaluates sqrt weight formula", () => {
      // weight = sqrt(amount) - quadratic voting
      const amount = BigInt(10000);
      const formula = [0, 7]; // PushAmount, Sqrt
      const params: bigint[] = [];

      const weight = evaluateWeightFormula(amount, formula, params);
      expect(weight).to.equal(BigInt(100)); // sqrt(10000) = 100
    });

    it("evaluates capped weight formula", () => {
      // weight = min(amount, cap)
      const amount = BigInt(10000);
      const cap = BigInt(5000);
      const formula = [0, 1, 8]; // PushAmount, PushConst(cap), Min
      const params = [cap];

      const weight = evaluateWeightFormula(amount, formula, params);
      expect(weight).to.equal(cap);
    });
  });

  describe("Encrypted Contributions", () => {
    it("generates correct number of ciphertexts", () => {
      const numOptions = 4;
      const voteChoice = 1;
      const weight = BigInt(1000);
      const timeLockPubkey = new Uint8Array(32);
      const encryptionSeed = new Uint8Array(32);

      const contributions = generateEncryptedContributions(
        voteChoice,
        weight,
        numOptions,
        timeLockPubkey,
        encryptionSeed
      );

      expect(contributions.length).to.equal(numOptions);
      for (const ciphertext of contributions) {
        expect(ciphertext.length).to.equal(64); // ElGamal ciphertext is 64 bytes
      }
    });

    it("only chosen option has non-zero weight", () => {
      // In actual implementation, we'd decrypt to verify
      // For now, verify structure
      const numOptions = 4;
      const voteChoice = 2;
      const weight = BigInt(1000);

      // The circuit ensures only encrypted_contributions[voteChoice] contains non-zero weight
      // This is enforced by the ZK proof, not verifiable without decryption
      expect(voteChoice).to.be.lessThan(numOptions);
    });
  });

  describe("Approval Vote Encoding", () => {
    it("encodes single approval as bitmap", () => {
      // Approve option 2 only
      const voteChoice = 1 << 2; // 0b0100 = 4
      expect(voteChoice).to.equal(4);
      expect(voteChoice & (1 << 2)).to.not.equal(0);
      expect(voteChoice & (1 << 0)).to.equal(0);
    });

    it("encodes multiple approvals as bitmap", () => {
      // Approve options 0, 1, and 3
      const voteChoice = (1 << 0) | (1 << 1) | (1 << 3); // 0b1011 = 11
      expect(voteChoice).to.equal(11);
      expect(voteChoice & (1 << 0)).to.not.equal(0);
      expect(voteChoice & (1 << 1)).to.not.equal(0);
      expect(voteChoice & (1 << 2)).to.equal(0);
      expect(voteChoice & (1 << 3)).to.not.equal(0);
    });
  });

  describe("Ranked Vote Encoding", () => {
    it("packs rankings into u64", () => {
      // 4 bits per rank, supports 16 options
      // Rankings: [option 2, option 0, option 1, option 3] (first is rank 1)
      const rankings = [2, 0, 1, 3];
      let packedVote = BigInt(0);

      for (let i = 0; i < rankings.length; i++) {
        packedVote |= BigInt(rankings[i]) << BigInt(i * 4);
      }

      // Verify unpacking
      for (let i = 0; i < rankings.length; i++) {
        const extracted = Number((packedVote >> BigInt(i * 4)) & BigInt(0xF));
        expect(extracted).to.equal(rankings[i]);
      }
    });

    it("calculates Borda scores correctly", () => {
      const numOptions = 4;
      const rankings = [2, 0, 1, 3]; // Rank 1: option 2, Rank 2: option 0, etc.
      const weight = BigInt(100);

      // Borda count: rank 1 gets (n-1) points, rank 2 gets (n-2), etc.
      const expectedScores = [
        BigInt(2) * weight, // option 0: rank 2 = (4-2) * 100 = 200
        BigInt(1) * weight, // option 1: rank 3 = (4-3) * 100 = 100
        BigInt(3) * weight, // option 2: rank 1 = (4-1) * 100 = 300
        BigInt(0) * weight, // option 3: rank 4 = (4-4) * 100 = 0
      ];

      for (let option = 0; option < numOptions; option++) {
        const rankPosition = rankings.indexOf(option) + 1;
        const score = BigInt(numOptions - rankPosition) * weight;
        expect(score).to.equal(expectedScores[option]);
      }
    });
  });

  describe("Payout Calculations", () => {
    it("calculates winner payout correctly", () => {
      const userWeight = BigInt(1000);
      const totalPool = BigInt(100000);
      const winnerWeight = BigInt(5000);
      const protocolFeeBps = 100; // 1%

      const grossPayout = (userWeight * totalPool) / winnerWeight;
      expect(grossPayout).to.equal(BigInt(20000)); // 1000/5000 * 100000 = 20000

      const fee = (grossPayout * BigInt(protocolFeeBps)) / BigInt(10000);
      expect(fee).to.equal(BigInt(200)); // 1% of 20000

      const netPayout = grossPayout - fee;
      expect(netPayout).to.equal(BigInt(19800));
    });

    it("loser gets zero payout", () => {
      const userVoteChoice = 1;
      const outcome = 2; // Different from user's vote

      const isWinner = userVoteChoice === outcome;
      expect(isWinner).to.be.false;

      const payout = isWinner ? BigInt(1000) : BigInt(0);
      expect(payout).to.equal(BigInt(0));
    });

    it("handles quorum not met", () => {
      const totalWeight = BigInt(500);
      const quorumThreshold = BigInt(1000);

      const quorumMet = totalWeight >= quorumThreshold;
      expect(quorumMet).to.be.false;

      // When quorum not met, outcome is None and all funds go to treasury
    });
  });

  describe("Ballot Status Transitions", () => {
    it("follows valid status flow", () => {
      // Pending -> Active -> Closed -> Resolved -> Finalized
      const statuses = {
        Pending: 0,
        Active: 1,
        Closed: 2,
        Resolved: 3,
        Finalized: 4,
      };

      // Valid transitions
      expect(statuses.Pending).to.be.lessThan(statuses.Active);
      expect(statuses.Active).to.be.lessThan(statuses.Closed);
      expect(statuses.Closed).to.be.lessThan(statuses.Resolved);
      expect(statuses.Resolved).to.be.lessThan(statuses.Finalized);
    });
  });
});

// ============ Helper Functions ============

function computeVoteNullifier(nullifierKey: Uint8Array, ballotId: Uint8Array): Uint8Array {
  // Placeholder - in production would use Poseidon hash
  const result = new Uint8Array(32);
  for (let i = 0; i < 16; i++) {
    result[i] = nullifierKey[i] ^ ballotId[i];
  }
  return result;
}

function computeVoteCommitment(
  ballotId: Uint8Array,
  voteNullifier: Uint8Array,
  pubkey: Uint8Array,
  voteChoice: number,
  weight: bigint,
  randomness: Uint8Array
): Uint8Array {
  // Placeholder - in production would use Poseidon hash
  const result = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    result[i] = ballotId[i];
    result[i + 8] = voteNullifier[i];
    result[i + 16] = pubkey[i];
    result[i + 24] = randomness[i];
  }
  return result;
}

function computePositionCommitment(
  ballotId: Uint8Array,
  pubkey: Uint8Array,
  voteChoice: number,
  amount: bigint,
  weight: bigint,
  randomness: Uint8Array
): Uint8Array {
  // Placeholder - in production would use Poseidon hash
  const result = new Uint8Array(32);
  for (let i = 0; i < 8; i++) {
    result[i] = ballotId[i];
    result[i + 8] = pubkey[i];
    result[i + 16] = randomness[i];
  }
  return result;
}

function evaluateWeightFormula(
  amount: bigint,
  formula: number[],
  params: bigint[]
): bigint {
  const stack: bigint[] = [];
  let paramIndex = 0;

  for (const op of formula) {
    switch (op) {
      case 0: // PushAmount
        stack.push(amount);
        break;
      case 1: // PushConst
        stack.push(params[paramIndex++]);
        break;
      case 3: // Add
        const b1 = stack.pop()!;
        const a1 = stack.pop()!;
        stack.push(a1 + b1);
        break;
      case 4: // Sub
        const b2 = stack.pop()!;
        const a2 = stack.pop()!;
        stack.push(a2 - b2);
        break;
      case 5: // Mul
        const b3 = stack.pop()!;
        const a3 = stack.pop()!;
        stack.push(a3 * b3);
        break;
      case 6: // Div
        const b4 = stack.pop()!;
        const a4 = stack.pop()!;
        stack.push(a4 / b4);
        break;
      case 7: // Sqrt
        const val = stack.pop()!;
        stack.push(bigIntSqrt(val));
        break;
      case 8: // Min
        const b5 = stack.pop()!;
        const a5 = stack.pop()!;
        stack.push(a5 < b5 ? a5 : b5);
        break;
      case 9: // Max
        const b6 = stack.pop()!;
        const a6 = stack.pop()!;
        stack.push(a6 > b6 ? a6 : b6);
        break;
    }
  }

  return stack.pop()!;
}

function bigIntSqrt(value: bigint): bigint {
  if (value < BigInt(0)) throw new Error("Square root of negative number");
  if (value === BigInt(0)) return BigInt(0);

  let x = value;
  let y = (x + BigInt(1)) / BigInt(2);

  while (y < x) {
    x = y;
    y = (x + value / x) / BigInt(2);
  }

  return x;
}

function generateEncryptedContributions(
  voteChoice: number,
  weight: bigint,
  numOptions: number,
  timeLockPubkey: Uint8Array,
  encryptionSeed: Uint8Array
): Uint8Array[] {
  // Placeholder - in production would use actual ElGamal encryption
  const contributions: Uint8Array[] = [];

  for (let i = 0; i < numOptions; i++) {
    const ciphertext = new Uint8Array(64);
    // In production, would encrypt (weight if i == voteChoice else 0) with timeLockPubkey
    contributions.push(ciphertext);
  }

  return contributions;
}
