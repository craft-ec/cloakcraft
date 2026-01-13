/**
 * E2E Test: AMM Add Liquidity and Swap with Multiple Accounts
 *
 * Tests:
 * 1. Wrap SOL to wSOL for Token B
 * 2. Shield Token A and wSOL into pools
 * 3. Add liquidity to AMM pool
 * 4. Execute swap with multiple accounts
 */
// @ts-nocheck
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import {
  PublicKey,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  NATIVE_MINT,
} from '@solana/spl-token';

// SDK imports
import { keccak_256 } from '@noble/hashes/sha3';
import { CloakCraftClient } from '../packages/sdk/src/client';
import { initPoseidon, bytesToField, fieldToBytes, poseidonHash } from '../packages/sdk/src/crypto/poseidon';
import { computeCommitment, generateRandomness } from '../packages/sdk/src/crypto/commitment';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';
import { generateStealthAddress, deriveStealthPrivateKey } from '../packages/sdk/src/crypto/stealth';
import { derivePublicKey } from '../packages/sdk/src/crypto/babyjubjub';
import { ProofGenerator } from '../packages/sdk/src/proofs';
import {
  derivePoolPda,
  deriveAmmPoolPda,
  deriveCommitmentCounterPda,
  derivePendingOperationPda,
  CIRCUIT_IDS,
  buildSwapWithProgram,
  buildAddLiquidityWithProgram,
  buildRemoveLiquidityWithProgram,
  buildCreateNullifierWithProgram,
  buildCreateCommitmentWithProgram,
  buildClosePendingOperationWithProgram,
  initializePool as initializePoolWithProgram,
  SwapInstructionParams,
  AddLiquidityInstructionParams,
} from '../packages/sdk/src/instructions';
import { LightCommitmentClient } from '../packages/sdk/src/light';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');

// Load fresh AMM tokens from config file
const FRESH_TOKENS_PATH = './scripts/.fresh-amm-tokens.json';
let TOKEN_A_MINT: PublicKey;
let TOKEN_B_MINT: PublicKey;

if (fs.existsSync(FRESH_TOKENS_PATH)) {
  const tokenConfig = JSON.parse(fs.readFileSync(FRESH_TOKENS_PATH, 'utf-8'));
  TOKEN_A_MINT = new PublicKey(tokenConfig.tokenA);
  TOKEN_B_MINT = new PublicKey(tokenConfig.tokenB);
  console.log('Using fresh AMM tokens from config:');
  console.log(`  Token A: ${TOKEN_A_MINT.toBase58()}`);
  console.log(`  Token B: ${TOKEN_B_MINT.toBase58()}`);
} else {
  throw new Error('Fresh AMM tokens config not found. Run setup-fresh-amm-tokens.ts first.');
}

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateRandomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

interface AmmPoolState {
  poolId: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  lpMint: PublicKey;
  stateHash: Uint8Array;
  reserveA: bigint;
  reserveB: bigint;
  lpSupply: bigint;
  feeBps: number;
  authority: PublicKey;
  isActive: boolean;
  bump: number;
  lpMintBump: number;
}

/**
 * Fetch and parse AMM pool account
 */
async function fetchAmmPool(connection: Connection, ammPoolPda: PublicKey): Promise<AmmPoolState> {
  const accountInfo = await connection.getAccountInfo(ammPoolPda);
  if (!accountInfo) {
    throw new Error(`AMM pool account not found: ${ammPoolPda.toBase58()}`);
  }

  const data = accountInfo.data;
  // Skip 8-byte discriminator
  let offset = 8;

  const poolId = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const tokenAMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const tokenBMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const lpMint = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const stateHash = new Uint8Array(data.slice(offset, offset + 32));
  offset += 32;

  const view = new DataView(data.buffer, data.byteOffset);
  const reserveA = view.getBigUint64(offset, true);
  offset += 8;
  const reserveB = view.getBigUint64(offset, true);
  offset += 8;
  const lpSupply = view.getBigUint64(offset, true);
  offset += 8;
  const feeBps = view.getUint16(offset, true);
  offset += 2;

  const authority = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;
  const isActive = data[offset] === 1;
  offset += 1;
  const bump = data[offset];
  offset += 1;
  const lpMintBump = data[offset];

  return {
    poolId,
    tokenAMint,
    tokenBMint,
    lpMint,
    stateHash,
    reserveA,
    reserveB,
    lpSupply,
    feeBps,
    authority,
    isActive,
    bump,
    lpMintBump,
  };
}

/**
 * Compute AMM state hash (matches on-chain compute_state_hash)
 * State hash = keccak256(reserve_a_le || reserve_b_le || lp_supply_le || pool_id)
 */
function computeAmmStateHash(reserveA: bigint, reserveB: bigint, lpSupply: bigint, poolId: PublicKey): Uint8Array {
  const data = new Uint8Array(32);
  const view = new DataView(data.buffer);

  // reserve_a (8 bytes LE)
  view.setBigUint64(0, reserveA, true);
  // reserve_b (8 bytes LE)
  view.setBigUint64(8, reserveB, true);
  // lp_supply (8 bytes LE)
  view.setBigUint64(16, lpSupply, true);

  // Combine with pool_id (32 bytes)
  const fullData = new Uint8Array(32 + 32);
  fullData.set(data.slice(0, 24), 0);
  fullData.set(poolId.toBytes(), 24);

  // Keccak256 hash
  return keccak_256(fullData.slice(0, 24 + 32));
}

interface TestAccount {
  wallet: Keypair;
  privacyWallet: any;
  client: CloakCraftClient;
}

// =============================================================================
// Setup: Create Test Accounts
// =============================================================================

async function setupTestAccounts(
  connection: Connection,
  mainWallet: Keypair,
  program: anchor.Program,
  numAccounts: number
): Promise<TestAccount[]> {
  console.log(`\nSetting up ${numAccounts} test accounts...`);

  const accounts: TestAccount[] = [];

  for (let i = 0; i < numAccounts; i++) {
    // Generate a new keypair for each test account
    const wallet = Keypair.generate();

    console.log(`   Account ${i + 1}: ${wallet.publicKey.toBase58()}`);

    // Fund the account with SOL
    const fundTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: mainWallet.publicKey,
        toPubkey: wallet.publicKey,
        lamports: 0.5 * LAMPORTS_PER_SOL,
      })
    );

    await sendAndConfirmTransaction(connection, fundTx, [mainWallet]);
    console.log(`   Funded with 0.5 SOL`);

    // Create CloakCraft client with heliusApiKey for Light Protocol
    const client = new CloakCraftClient({
      rpcUrl: `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`,
      indexerUrl: 'http://localhost:3000',
      programId: PROGRAM_ID,
      heliusApiKey: HELIUS_API_KEY,
      network: 'devnet',
    });

    // Set program on client
    client.setProgram(program);

    // Create privacy wallet
    const privacyWallet = client.createWallet();

    accounts.push({ wallet, privacyWallet, client });
  }

  return accounts;
}

// =============================================================================
// Step 1: Wrap SOL for Token B
// =============================================================================

async function wrapSolForAccount(
  connection: Connection,
  wallet: Keypair,
  amount: number
): Promise<PublicKey> {
  console.log(`   Wrapping ${amount} SOL...`);

  const wsolAta = getAssociatedTokenAddressSync(NATIVE_MINT, wallet.publicKey);

  // Check if wSOL ATA exists
  let accountExists = false;
  try {
    await getAccount(connection, wsolAta);
    accountExists = true;
  } catch (e) {
    accountExists = false;
  }

  const tx = new Transaction();

  if (!accountExists) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        wsolAta,
        wallet.publicKey,
        NATIVE_MINT
      )
    );
  }

  // Transfer SOL to wSOL ATA
  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: wsolAta,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  // Sync native to update balance
  tx.add(createSyncNativeInstruction(wsolAta));

  await sendAndConfirmTransaction(connection, tx, [wallet]);
  console.log(`   ✓ Wrapped ${amount} SOL to wSOL`);

  return wsolAta;
}

// =============================================================================
// Step 2: Shield Tokens
// =============================================================================

async function shieldTokens(
  client: CloakCraftClient,
  program: anchor.Program,
  wallet: Keypair,
  tokenMint: PublicKey,
  amount: bigint,
  privacyWallet: any
): Promise<string> {
  console.log(`   Shielding ${amount} tokens (${tokenMint.toBase58().slice(0, 8)}...)...`);

  // Use the wallet's public key (Point) for stealth address generation
  const { stealthAddress } = generateStealthAddress(privacyWallet.publicKey);

  // Get user's token ATA
  const userAta = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey);

  // Derive pool PDA
  const [poolPda] = derivePoolPda(tokenMint, PROGRAM_ID);

  // Check and initialize pool if needed
  const poolAccount = await client.connection.getAccountInfo(poolPda);
  if (!poolAccount) {
    console.log(`   Pool for ${tokenMint.toBase58().slice(0, 8)}... does not exist, initializing...`);
    // Initialize pool (no arguments, all data comes from accounts)
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault'), tokenMint.toBuffer()],
      PROGRAM_ID
    );
    const poolTx = await program.methods
      .initializePool()
      .accounts({
        pool: poolPda,
        tokenVault: vaultPda,
        tokenMint: tokenMint,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`   ✓ Pool initialized: ${poolTx.slice(0, 16)}...`);
  }

  // Check and initialize commitment counter if needed
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('commitment_counter'), poolPda.toBuffer()],
    PROGRAM_ID
  );
  const counterAccount = await client.connection.getAccountInfo(counterPda);
  if (!counterAccount) {
    console.log(`   Initializing commitment counter...`);
    const counterTx = await program.methods
      .initializeCommitmentCounter()
      .accounts({
        pool: poolPda,
        commitmentCounter: counterPda,
        authority: wallet.publicKey,
        payer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log(`   ✓ Counter initialized: ${counterTx.slice(0, 16)}...`);
  }

  // Build shield instruction
  const shieldResult = await client.shield({
    pool: tokenMint,
    amount,
    recipient: stealthAddress,
    userTokenAccount: userAta,
  }, wallet);

  console.log(`   ✓ Shielded: ${shieldResult.signature.slice(0, 20)}...`);
  return shieldResult.signature;
}

// =============================================================================
// Step 3: Add Liquidity
// =============================================================================

async function addLiquidity(
  client: CloakCraftClient,
  program: anchor.Program,
  wallet: Keypair,
  privacyWallet: any,
  prover: ProofGenerator,
  noteA: any,
  noteB: any,
  depositA: bigint,
  depositB: bigint,
  rpcUrl: string
): Promise<boolean> {
  console.log('\n[ADD LIQUIDITY]');
  console.log(`   Depositing ${depositA} Token A + ${depositB} wSOL`);

  // Derive AMM pool PDA (without sorting - matches on-chain)
  const [ammPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('amm_pool'), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
    PROGRAM_ID
  );
  console.log(`   AMM Pool: ${ammPoolPda.toBase58()}`);

  // Generate stealth addresses for outputs
  const { stealthAddress: lpRecipient } = generateStealthAddress(privacyWallet.publicKey);
  const { stealthAddress: changeARecipient } = generateStealthAddress(privacyWallet.publicKey);
  const { stealthAddress: changeBRecipient } = generateStealthAddress(privacyWallet.publicKey);

  try {
    const connection = new Connection(rpcUrl, 'confirmed');

    // Fetch LP mint from AMM pool state (it's now a regular mint, not a PDA)
    const ammPoolState = await fetchAmmPool(connection, ammPoolPda);
    const lpMint = ammPoolState.lpMint;
    console.log(`   LP Mint from AMM pool: ${lpMint.toBase58()}`);

    // Derive LP pool PDA
    const [lpPoolPda] = derivePoolPda(lpMint, PROGRAM_ID);

    // Ensure LP pool is initialized
    const lpPoolAccount = await client.connection.getAccountInfo(lpPoolPda);
    if (!lpPoolAccount) {
      console.log('   Initializing LP pool for AMM...');
      const { poolTx, counterTx } = await initializePoolWithProgram(
        program,
        lpMint,
        wallet.publicKey,
        wallet.publicKey
      );
      console.log(`   ✓ LP pool initialized: pool=${poolTx.slice(0, 16)}... counter=${counterTx.slice(0, 16)}...`);
    }

    // Step 1: Pre-generate randomness (must be same for proof and commitments!)
    console.log('   [1/4] Pre-generating randomness...');
    const lpRandomness = generateRandomness();
    const changeARandomness = generateRandomness();
    const changeBRandomness = generateRandomness();

    // Step 2: Generate proof with specific randomness
    console.log('   [2/4] Generating add_liquidity proof...');

    const proofParams = {
      inputA: noteA,
      inputB: noteB,
      poolId: ammPoolPda,
      lpMint: lpMint,
      depositA,
      depositB,
      lpRecipient,
      changeARecipient,
      changeBRecipient,
      // Pass randomness to proof generator
      lpRandomness,
      changeARandomness,
      changeBRandomness,
    };

    // Proof generator returns BOTH proof AND the computed public outputs
    const proofResult = await prover.generateAddLiquidityProof(proofParams, privacyWallet.keypair);
    console.log(`   ✓ Proof generated: ${proofResult.proof.length} bytes`);

    // Step 3: Use the SAME commitments and nullifiers from proof generation
    console.log('   [3/4] Using proof-computed nullifiers and commitments...');

    // Extract values that match what the proof used
    const { proof, nullifierA, nullifierB, lpCommitment, changeACommitment, changeBCommitment } = proofResult;
    console.log(`   Proof nullifier A: ${Buffer.from(nullifierA).toString('hex').slice(0, 16)}...`);
    console.log(`   Proof nullifier B: ${Buffer.from(nullifierB).toString('hex').slice(0, 16)}...`);

    console.log(`   ✓ Using commitments that match the proof`);

    // Step 4: Build and execute transaction
    console.log('   [4/4] Building and executing transaction...');

    const [poolAPda] = derivePoolPda(TOKEN_A_MINT, PROGRAM_ID);
    const [poolBPda] = derivePoolPda(TOKEN_B_MINT, PROGRAM_ID);

    // Calculate LP amount using the same formula as in client.ts (ammPoolState already fetched above)
    let lpAmount: bigint;
    if (ammPoolState.reserveA === 0n && ammPoolState.reserveB === 0n) {
      // Initial liquidity: LP = sqrt(depositA * depositB)
      lpAmount = BigInt(Math.floor(Math.sqrt(Number(depositA) * Number(depositB))));
      console.log(`   Calculating initial LP amount: sqrt(${depositA} * ${depositB}) = ${lpAmount}`);
    } else {
      // Subsequent deposits: LP = min(depositA * lpSupply / reserveA, depositB * lpSupply / reserveB)
      const lpFromA = (depositA * ammPoolState.lpSupply) / ammPoolState.reserveA;
      const lpFromB = (depositB * ammPoolState.lpSupply) / ammPoolState.reserveB;
      lpAmount = lpFromA < lpFromB ? lpFromA : lpFromB;
      console.log(`   Calculating LP amount: min(${lpFromA}, ${lpFromB}) = ${lpAmount}`);
    }

    const instructionParams: AddLiquidityInstructionParams = {
      poolA: poolAPda,
      poolB: poolBPda,
      tokenAMint: TOKEN_A_MINT,
      tokenBMint: TOKEN_B_MINT,
      lpPool: lpPoolPda,
      lpMint: lpMint,
      ammPool: ammPoolPda,
      relayer: wallet.publicKey,
      proof,
      nullifierA,
      nullifierB,
      lpCommitment,
      changeACommitment,
      changeBCommitment,
      lpRandomness,
      changeARandomness,
      changeBRandomness,
      lpRecipient,
      changeARecipient,
      changeBRecipient,
      inputAAmount: BigInt(noteA.amount),
      inputBAmount: BigInt(noteB.amount),
      depositA,
      depositB,
      lpAmount,
    };

    // Phase 1: Verify proof + Store pending operation (NO Light Protocol calls)
    const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildAddLiquidityWithProgram(
      program,
      instructionParams,
      rpcUrl
    );

    const phase1Sig = await phase1Tx.rpc();
    console.log(`   ✓ Phase 1 executed: ${phase1Sig.slice(0, 20)}...`);

    // Wait for transaction confirmation
    await program.provider.connection.confirmTransaction(phase1Sig, 'confirmed');

    // Phase 2a: Create each nullifier (one at a time due to tx size limits)
    for (let i = 0; i < pendingNullifiers.length; i++) {
      const pn = pendingNullifiers[i];
      const { tx: nullifierTx } = await buildCreateNullifierWithProgram(
        program,
        {
          operationId,
          nullifierIndex: i,
          pool: pn.pool,
          relayer: wallet.publicKey,
        },
        rpcUrl
      );
      await nullifierTx.rpc();
      console.log(`   ✓ Phase 2a (nullifier ${i}) executed`);
    }

    // Phase 2b: Create each commitment via generic instruction
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: wallet.publicKey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
        },
        rpcUrl
      );
      await commitmentTx.rpc();
      console.log(`   ✓ Phase 2b (commitment ${i}) executed`);
    }

    // Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      program,
      operationId,
      wallet.publicKey
    );
    await closeTx.rpc();
    console.log(`   ✓ Pending operation closed`);

    return true;
  } catch (e: any) {
    console.log(`   ✗ Add liquidity failed: ${e.message}`);
    if (e.logs) {
      console.log('   Logs:', e.logs.slice(-5).join('\n   '));
    }
    return false;
  }
}

// =============================================================================
// Step 4: Execute Swap
// =============================================================================

async function executeSwap(
  client: CloakCraftClient,
  program: anchor.Program,
  wallet: Keypair,
  privacyWallet: any,
  prover: ProofGenerator,
  note: any,
  swapAmount: bigint,
  direction: 'aToB' | 'bToA',
  rpcUrl: string
): Promise<boolean> {
  console.log('\n[SWAP]');
  console.log(`   Swapping ${swapAmount} tokens (${direction})`);

  // Derive AMM pool PDA
  const [ammPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('amm_pool'), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
    PROGRAM_ID
  );

  // Generate stealth addresses for outputs
  const { stealthAddress: outputRecipient } = generateStealthAddress(privacyWallet.publicKey);
  const { stealthAddress: changeRecipient } = generateStealthAddress(privacyWallet.publicKey);

  // Determine input/output pools based on direction
  const inputMint = direction === 'aToB' ? TOKEN_A_MINT : TOKEN_B_MINT;
  const outputMint = direction === 'aToB' ? TOKEN_B_MINT : TOKEN_A_MINT;
  const [inputPool] = derivePoolPda(inputMint, PROGRAM_ID);
  const [outputPool] = derivePoolPda(outputMint, PROGRAM_ID);

  try {
    // Step 0: Fetch merkle proof for input note
    console.log('   [0/4] Fetching merkle proof...');
    const lightClient = new LightCommitmentClient({
      apiKey: HELIUS_API_KEY!,
      network: 'devnet',
    });

    if (!note.accountHash) {
      throw new Error('Note is missing accountHash - cannot fetch merkle proof');
    }

    const merkleProof = await lightClient.getMerkleProofByHash(note.accountHash);
    console.log(`   ✓ Merkle proof fetched: root=${toHex(merkleProof.root).slice(0, 16)}..., depth=${merkleProof.pathElements.length}`);

    // Step 1: Fetch AMM pool state to calculate output amount
    console.log('   [1/4] Fetching AMM pool state...');
    const connection = new Connection(rpcUrl, 'confirmed');
    const ammPoolState = await fetchAmmPool(connection, ammPoolPda);
    console.log(`   AMM Pool: reserve_a=${ammPoolState.reserveA}, reserve_b=${ammPoolState.reserveB}, lp=${ammPoolState.lpSupply}`);

    // Calculate expected output and new reserves using constant product formula
    // For aToB: output = reserve_b - (reserve_a * reserve_b) / (reserve_a + input)
    // Apply fee: effective_input = input * (10000 - fee_bps) / 10000
    const feeBps = BigInt(ammPoolState.feeBps);
    const effectiveInput = (swapAmount * (10000n - feeBps)) / 10000n;

    let newReserveA: bigint;
    let newReserveB: bigint;
    let outputAmount: bigint;

    if (direction === 'aToB') {
      // Input Token A, output Token B
      newReserveA = ammPoolState.reserveA + effectiveInput;
      const k = ammPoolState.reserveA * ammPoolState.reserveB;
      newReserveB = k / newReserveA;
      outputAmount = ammPoolState.reserveB - newReserveB;
    } else {
      // Input Token B, output Token A
      newReserveB = ammPoolState.reserveB + effectiveInput;
      const k = ammPoolState.reserveA * ammPoolState.reserveB;
      newReserveA = k / newReserveB;
      outputAmount = ammPoolState.reserveA - newReserveA;
    }

    console.log(`   Expected output: ${outputAmount}`);
    console.log(`   New reserves: a=${newReserveA}, b=${newReserveB}`);

    const oldPoolStateHash = ammPoolState.stateHash;
    const newPoolStateHash = computeAmmStateHash(newReserveA, newReserveB, ammPoolState.lpSupply, ammPoolPda);
    console.log(`   Old state hash: ${toHex(oldPoolStateHash).slice(0, 16)}...`);
    console.log(`   New state hash: ${toHex(newPoolStateHash).slice(0, 16)}...`);

    // Step 2: Generate proof with calculated output amount
    console.log('   [2/4] Generating swap proof...');

    // Pre-generate randomness to ensure consistency between proof and instruction
    const outputRandomness = generateRandomness();
    const changeRandomness = generateRandomness();

    const proofParams = {
      input: note,
      poolId: ammPoolPda,
      swapAmount,
      swapDirection: direction,
      outputAmount,
      minOutput: 1n,
      outputTokenMint: outputMint,
      outputRecipient,
      changeRecipient,
      merkleRoot: merkleProof.root,
      merklePath: merkleProof.pathElements,
      merkleIndices: merkleProof.pathIndices,
      // Pass randomness to proof generator
      outRandomness: outputRandomness,
      changeRandomness,
    };

    // Proof generator returns BOTH proof AND computed public outputs
    const proofResult = await prover.generateSwapProof(proofParams, privacyWallet.keypair);
    console.log(`   ✓ Proof generated: ${proofResult.proof.length} bytes`);

    // Step 3: Use proof-computed values
    console.log('   [3/4] Using proof-computed nullifier and commitments...');

    // Extract values that match what the proof used
    const { proof, nullifier, outCommitment: outputCommitment, changeCommitment } = proofResult;

    console.log(`   ✓ Nullifier and commitments from proof`);
    console.log('   Debug: Proof length:', proof.length);
    console.log('   Debug: Nullifier length:', nullifier.length);

    // Use actual merkle root from Light Protocol merkle proof
    const merkleRoot = merkleProof.root;
    console.log('   [4/4] Building and executing two-phase swap...');

    // Use two-phase swap to avoid transaction size limits
    const phase1Params: SwapInstructionParams = {
      inputPool,
      outputPool,
      ammPool: ammPoolPda,
      relayer: wallet.publicKey,
      proof,
      merkleRoot,
      nullifier,
      outputCommitment,
      changeCommitment,
      oldPoolStateHash,
      newPoolStateHash,
      minOutput: 1n,
      outputRecipient,
      changeRecipient,
      inputAmount: BigInt(note.amount),
      swapAmount,
      outputAmount,
      swapDirection: direction,
    };

    try {
      // Phase 1: Verify proof + Store pending operation (NO Light Protocol calls)
      const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildSwapWithProgram(
        program,
        phase1Params,
        rpcUrl
      );

      const phase1Sig = await phase1Tx.rpc();
      console.log(`   ✓ Phase 1 executed: ${phase1Sig.slice(0, 20)}...`);

      // Wait for transaction confirmation
      await program.provider.connection.confirmTransaction(phase1Sig, 'confirmed');

      // Phase 2: Create nullifier via generic instruction
      for (let i = 0; i < pendingNullifiers.length; i++) {
        const pn = pendingNullifiers[i];
        const { tx: nullifierTx } = await buildCreateNullifierWithProgram(
          program,
          {
            operationId,
            nullifierIndex: i,
            pool: pn.pool,
            relayer: wallet.publicKey,
            nullifier: pn.nullifier,
          },
          rpcUrl
        );
        await nullifierTx.rpc();
        console.log(`   ✓ Phase 2 (nullifier ${i}) executed`);
      }

      // Phase 3: Create each commitment via generic instruction
      for (let i = 0; i < pendingCommitments.length; i++) {
        const pc = pendingCommitments[i];
        if (pc.commitment.every((b: number) => b === 0)) continue;

        const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
          program,
          {
            operationId,
            commitmentIndex: i,
            pool: pc.pool,
            relayer: wallet.publicKey,
            stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
            encryptedNote: pc.encryptedNote,
          },
          rpcUrl
        );
        await commitmentTx.rpc();
        console.log(`   ✓ Phase 3 (commitment ${i}) executed`);
      }

      // Phase 4: Close pending operation
      const { tx: closeTx } = await buildClosePendingOperationWithProgram(
        program,
        operationId,
        wallet.publicKey
      );
      await closeTx.rpc();
      console.log(`   ✓ Pending operation closed`);
    } catch (buildError: any) {
      console.log('   Build/Send error:', buildError.message);
      if (buildError.stack) {
        console.log('   Stack:', buildError.stack.split('\n').slice(0, 5).join('\n'));
      }
      throw buildError;
    }

    return true;
  } catch (e: any) {
    console.log(`   ✗ Swap failed: ${e.message}`);
    if (e.logs) {
      console.log('   Logs:', e.logs.slice(-5).join('\n   '));
    }
    return false;
  }
}

/**
 * Remove liquidity from AMM pool
 */
async function removeLiquidity(
  client: CloakCraftClient,
  program: anchor.Program,
  wallet: Keypair,
  privacyWallet: any,
  prover: ProofGenerator,
  lpNote: any,
  lpAmount: bigint,
  rpcUrl: string
): Promise<boolean> {
  try {
    console.log('\n[REMOVE LIQUIDITY]');
    console.log(`   Removing ${lpAmount} LP tokens`);

    // Derive AMM pool PDA
    const [ammPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('amm_pool'), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
      PROGRAM_ID
    );
    console.log(`   AMM Pool: ${ammPoolPda.toBase58()}`);

    // Derive pool PDAs
    const [lpPoolPda] = derivePoolPda(lpNote.tokenMint, PROGRAM_ID);
    const [poolAPda] = derivePoolPda(TOKEN_A_MINT, PROGRAM_ID);
    const [poolBPda] = derivePoolPda(TOKEN_B_MINT, PROGRAM_ID);

    // Generate stealth addresses for outputs
    const { stealthAddress: outputARecipient } = generateStealthAddress(privacyWallet.publicKey);
    const { stealthAddress: outputBRecipient } = generateStealthAddress(privacyWallet.publicKey);

    // Fetch AMM pool state
    const connection = new Connection(rpcUrl, 'confirmed');
    const ammPoolState = await fetchAmmPool(connection, ammPoolPda);
    console.log(`   AMM Pool: reserve_a=${ammPoolState.reserveA}, reserve_b=${ammPoolState.reserveB}, lp=${ammPoolState.lpSupply}`);

    // Calculate expected outputs (proportional to LP share)
    const lpShare = Number(lpAmount) / Number(ammPoolState.lpSupply);
    const outputA = BigInt(Math.floor(Number(ammPoolState.reserveA) * lpShare));
    const outputB = BigInt(Math.floor(Number(ammPoolState.reserveB) * lpShare));
    console.log(`   Expected outputs: ${outputA} Token A, ${outputB} wSOL`);

    const oldPoolStateHash = ammPoolState.stateHash;
    const newReserveA = ammPoolState.reserveA - outputA;
    const newReserveB = ammPoolState.reserveB - outputB;
    const newLpSupply = ammPoolState.lpSupply - lpAmount;
    const newPoolStateHash = computeAmmStateHash(newReserveA, newReserveB, newLpSupply, ammPoolPda);

    // Get merkle proof for LP input
    const lightClient = new LightCommitmentClient({
      apiKey: HELIUS_API_KEY!,
      network: 'devnet',
    });

    if (!lpNote.accountHash) {
      throw new Error('LP note is missing accountHash - cannot fetch merkle proof');
    }

    const merkleProof = await lightClient.getMerkleProofByHash(lpNote.accountHash);
    console.log(`   ✓ Merkle proof fetched for LP note`);

    // Generate proof using prover
    console.log('   Generating remove_liquidity proof...');

    const proofResult = await prover.generateRemoveLiquidityProof(
      {
        lpInput: lpNote,
        poolId: ammPoolPda,
        lpAmount,
        tokenAMint: TOKEN_A_MINT,
        tokenBMint: TOKEN_B_MINT,
        oldPoolStateHash,
        newPoolStateHash,
        outputARecipient,
        outputBRecipient,
        merklePath: merkleProof.pathElements,
        merklePathIndices: merkleProof.pathIndices,
        outputAAmount: outputA,
        outputBAmount: outputB,
      },
      privacyWallet.keypair
    );

    const { proof, lpNullifier, outputACommitment, outputBCommitment } = proofResult;
    console.log(`   ✓ Proof generated: ${proof.length} bytes`);

    // Build and execute Phase 1
    const { tx: phase1Tx, operationId, pendingNullifiers, pendingCommitments } = await buildRemoveLiquidityWithProgram(
      program,
      {
        lpPool: lpPoolPda,
        poolA: poolAPda,
        poolB: poolBPda,
        ammPool: ammPoolPda,
        relayer: wallet.publicKey,
        proof,
        lpNullifier,
        outputACommitment,
        outputBCommitment,
        oldPoolStateHash,
        newPoolStateHash,
        outputARecipient,
        outputBRecipient,
        lpAmount,
      },
      rpcUrl
    );

    const phase1Sig = await phase1Tx.rpc();
    console.log(`   ✓ Phase 1 executed: ${phase1Sig.slice(0, 20)}...`);

    // Wait for confirmation
    await program.provider.connection.confirmTransaction(phase1Sig, 'confirmed');

    // Phase 2: Create nullifiers
    for (let i = 0; i < pendingNullifiers.length; i++) {
      const pn = pendingNullifiers[i];
      const { tx: nullifierTx } = await buildCreateNullifierWithProgram(
        program,
        {
          operationId,
          nullifierIndex: i,
          pool: pn.pool,
          relayer: wallet.publicKey,
        },
        rpcUrl
      );
      await nullifierTx.rpc();
      console.log(`   ✓ Phase 2 (nullifier ${i}) executed`);
    }

    // Phase 3: Create commitments
    for (let i = 0; i < pendingCommitments.length; i++) {
      const pc = pendingCommitments[i];
      if (pc.commitment.every((b: number) => b === 0)) continue;

      const { tx: commitmentTx } = await buildCreateCommitmentWithProgram(
        program,
        {
          operationId,
          commitmentIndex: i,
          pool: pc.pool,
          relayer: wallet.publicKey,
          stealthEphemeralPubkey: pc.stealthEphemeralPubkey,
          encryptedNote: pc.encryptedNote,
        },
        rpcUrl
      );
      await commitmentTx.rpc();
      console.log(`   ✓ Phase 3 (commitment ${i}) executed`);
    }

    // Phase 4: Close pending operation
    const { tx: closeTx } = await buildClosePendingOperationWithProgram(
      program,
      operationId,
      wallet.publicKey
    );
    await closeTx.rpc();
    console.log(`   ✓ Pending operation closed`);

    return true;
  } catch (e: any) {
    console.log(`   ✗ Remove liquidity failed: ${e.message}`);
    if (e.logs) {
      console.log('   Logs:', e.logs.slice(-5).join('\n   '));
    }
    return false;
  }
}

// =============================================================================
// Main Test
// =============================================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           E2E TEST: FULL AMM LIFECYCLE (ADD/SWAP/REMOVE)          ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');

  if (!HELIUS_API_KEY) {
    console.error('ERROR: Set HELIUS_API_KEY environment variable');
    process.exit(1);
  }

  // Initialize
  await initPoseidon();

  const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const connection = new Connection(rpcUrl, 'confirmed');

  // Load main wallet
  const walletPath = path.join(os.homedir(), '.config/solana/id.json');
  const mainWallet = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf8')))
  );
  console.log('\nMain wallet:', mainWallet.publicKey.toBase58());

  const balance = await connection.getBalance(mainWallet.publicKey);
  console.log(`SOL balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  // Setup Anchor
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(mainWallet),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);

  const idl = JSON.parse(
    fs.readFileSync('./packages/sdk/src/idl/cloakcraft.json', 'utf8')
  );
  const program = new anchor.Program(idl, provider);

  // Create main client with heliusApiKey for Light Protocol
  const mainClient = new CloakCraftClient({
    rpcUrl,
    indexerUrl: 'http://localhost:3000',
    programId: PROGRAM_ID,
    heliusApiKey: HELIUS_API_KEY,
    network: 'devnet',
  });

  // Set the program on the client
  mainClient.setProgram(program);

  // Use the fresh AMM wallet that has the shielded tokens
  const WALLET_FILE = path.resolve('./scripts/.fresh-amm-wallet.json');
  let mainPrivacyWallet: any;

  if (!fs.existsSync(WALLET_FILE)) {
    throw new Error('Fresh AMM wallet not found. Run setup-fresh-amm-tokens.ts first.');
  }

  console.log('Loading fresh AMM privacy wallet...');
  const sk = new Uint8Array(JSON.parse(fs.readFileSync(WALLET_FILE, 'utf-8')));
  mainPrivacyWallet = await mainClient.loadWallet(sk);
  console.log(`Privacy wallet pubkey X: ${Buffer.from(mainPrivacyWallet.publicKey.x).toString('hex').slice(0, 16)}...`);

  // Initialize proof generator
  // Configure to use Circom circuits from circom-circuits/build/ directory
  const prover = new ProofGenerator({});
  prover.setCircomBaseUrl(path.resolve(__dirname, '../circom-circuits/build'));

  // Results tracking
  const results: { name: string; passed: boolean; error?: string }[] = [];

  // ==========================================================================
  // TEST 1: Scan for Existing Shielded Tokens
  // ==========================================================================

  console.log('\n' + '='.repeat(70));
  console.log('TEST 1: SCAN FOR EXISTING SHIELDED TOKENS');
  console.log('='.repeat(70));

  try {
    // Fresh tokens are already shielded by setup-fresh-amm-tokens.ts
    // Just scan for the existing notes
    console.log('\nScanning for existing shielded notes...');

    // Debug: Show pool PDAs being used
    const [tokenAPoolPda] = derivePoolPda(TOKEN_A_MINT, PROGRAM_ID);
    const [tokenBPoolPda] = derivePoolPda(TOKEN_B_MINT, PROGRAM_ID);
    console.log(`   Token A Pool PDA: ${tokenAPoolPda.toBase58()}`);
    console.log(`   Token B Pool PDA: ${tokenBPoolPda.toBase58()}`);

    // Debug: Query Helius directly to see if accounts exist for our pool
    const checkPoolAccounts = async (poolPda: PublicKey, name: string) => {
      const response = await fetch(`https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getCompressedAccountsByOwner',
          params: {
            owner: PROGRAM_ID.toBase58(),
            filters: [{ memcmp: { offset: 0, bytes: poolPda.toBase58() } }]
          }
        })
      });
      const data = await response.json() as any;
      const count = data.result?.value?.items?.length ?? 0;
      console.log(`   ${name} pool accounts in Helius: ${count}`);
      return count;
    };

    console.log('   Waiting for Helius indexing (10s)...');
    await new Promise(r => setTimeout(r, 10000));

    await checkPoolAccounts(tokenAPoolPda, 'Token A');
    await checkPoolAccounts(tokenBPoolPda, 'Token B');

    // Retry scan with delay
    const scanWithRetry = async (mint: PublicKey, name: string, maxRetries = 5): Promise<any[]> => {
      for (let i = 0; i < maxRetries; i++) {
        const notes = await mainClient.scanNotes(mint);
        if (notes.length > 0) {
          return notes;
        }
        if (i < maxRetries - 1) {
          console.log(`   ${name}: 0 notes, retrying in 5s... (${i + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, 5000));
        }
      }
      return [];
    };

    // Scan Token A pool
    const notesA = await scanWithRetry(TOKEN_A_MINT, 'Token A');
    console.log(`   Token A notes: ${notesA.length}`);

    // Scan Token B pool
    const notesB = await scanWithRetry(TOKEN_B_MINT, 'Token B');
    console.log(`   Token B notes: ${notesB.length}`);

    if (notesA.length === 0 || notesB.length === 0) {
      throw new Error('No notes found. Run setup-fresh-amm-tokens.ts first.');
    }

    results.push({ name: 'Scan Existing Notes', passed: true });
  } catch (e: any) {
    console.log(`   ✗ Error: ${e.message}`);
    results.push({ name: 'Scan Existing Notes', passed: false, error: e.message });
  }

  // ==========================================================================
  // Initialize AMM Pool (if needed)
  // ==========================================================================

  const [ammPoolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('amm_pool'), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
    PROGRAM_ID
  );

  const ammPoolAccount = await mainClient.connection.getAccountInfo(ammPoolPda);
  if (!ammPoolAccount) {
    console.log('\n[INITIALIZING AMM POOL]');
    // Generate a new keypair for the LP mint (regular mint, not PDA)
    const lpMintKeypair = Keypair.generate();

    const feeBps = 30; // 0.3% fee
    const initAmmTx = await program.methods
      .initializeAmmPool(TOKEN_A_MINT, TOKEN_B_MINT, feeBps)
      .accounts({
        ammPool: ammPoolPda,
        lpMint: lpMintKeypair.publicKey,
        tokenAMintAccount: TOKEN_A_MINT,
        tokenBMintAccount: TOKEN_B_MINT,
        authority: mainWallet.publicKey,
        payer: mainWallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([lpMintKeypair])
      .rpc();

    console.log(`   ✓ AMM Pool initialized: ${initAmmTx.slice(0, 16)}...`);
    console.log(`   AMM Pool: ${ammPoolPda.toBase58()}`);
    console.log(`   LP Mint (regular): ${lpMintKeypair.publicKey.toBase58()}`);
  }

  // ==========================================================================
  // TEST 2: Add Liquidity
  // ==========================================================================

  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: ADD LIQUIDITY TO AMM POOL');
  console.log('='.repeat(70));

  try {
    // Circom circuits are loaded automatically when proving
    console.log('\n[1/3] Preparing proof generation...');
    console.log('   ✓ Proof generator ready (Circom/snarkjs)');

    // Scan for notes
    console.log('\n[2/3] Scanning for notes...');

    const notesA = await mainClient.scanNotes(TOKEN_A_MINT);
    const notesB = await mainClient.scanNotes(TOKEN_B_MINT);

    if (notesA.length === 0 || notesB.length === 0) {
      throw new Error('Need notes in both pools for add_liquidity');
    }

    const noteA = notesA[0];
    const noteB = notesB[0];

    console.log(`   Using Token A note: ${noteA.amount} tokens, commitment: ${Buffer.from(noteA.commitment).toString('hex').slice(0, 16)}...`);
    console.log(`   Using wSOL note: ${noteB.amount} lamports, commitment: ${Buffer.from(noteB.commitment).toString('hex').slice(0, 16)}...`);

    // Generate proof
    console.log('\n[3/3] Generating add_liquidity proof...');
    const depositA = BigInt(Math.min(Number(noteA.amount) / 2, 500));
    const depositB = BigInt(Math.min(Number(noteB.amount) / 2, 25000000));

    const success = await addLiquidity(
      mainClient,
      program,
      mainWallet,
      mainPrivacyWallet,
      prover,
      noteA,
      noteB,
      depositA,
      depositB,
      rpcUrl
    );

    results.push({ name: 'Add Liquidity', passed: success });
  } catch (e: any) {
    console.log(`   ✗ Error: ${e.message}`);
    results.push({ name: 'Add Liquidity', passed: false, error: e.message });
  }

  // ==========================================================================
  // TEST 3: Multi-Account Swap
  // ==========================================================================

  console.log('\n' + '='.repeat(70));
  console.log('TEST 3: MULTI-ACCOUNT SWAP');
  console.log('='.repeat(70));

  try {
    // Circom circuits are loaded automatically when proving
    console.log('\n[1/3] Preparing swap proof generation...');
    console.log('   ✓ Proof generator ready (Circom/snarkjs)');

    // Use main wallet's notes for swap proof generation
    console.log('\n[2/3] Scanning for notes...');
    const notesA = await mainClient.scanNotes(TOKEN_A_MINT);

    if (notesA.length === 0) {
      throw new Error('No Token A notes available for swap test');
    }

    console.log(`   Found ${notesA.length} Token A note(s)`);
    const note = notesA[0];
    console.log(`   Using note with amount: ${note.amount}`);

    // Execute swap
    console.log('\n[3/3] Executing swap...');
    const swapSuccess = await executeSwap(
      mainClient,
      program,
      mainWallet,
      mainPrivacyWallet,
      prover,
      note,
      100n,
      'aToB',
      rpcUrl
    );

    if (swapSuccess) {
      console.log('   ✓ Swap executed successfully');
    }

    results.push({ name: 'Swap Execution', passed: swapSuccess });
  } catch (e: any) {
    console.log(`   ✗ Error: ${e.message}`);
    results.push({ name: 'Swap Proof Generation', passed: false, error: e.message });
  }

  // ==========================================================================
  // TEST 4: Remove Liquidity
  // ==========================================================================

  console.log('\n' + '='.repeat(70));
  console.log('TEST 4: REMOVE LIQUIDITY');
  console.log('='.repeat(70));

  try {
    console.log('\n[1/3] Scanning for LP tokens...');

    // Get LP mint from AMM pool
    const [ammPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('amm_pool'), TOKEN_A_MINT.toBuffer(), TOKEN_B_MINT.toBuffer()],
      PROGRAM_ID
    );
    const ammPoolAccount = await program.account.ammPool.fetch(ammPoolPda);
    const lpMint = ammPoolAccount.lpMint;

    console.log(`   LP Mint: ${lpMint.toBase58()}`);

    // Debug: Check if LP pool has any commitments at all
    const connection = new Connection(rpcUrl, 'confirmed');
    const [lpPoolPda] = derivePoolPda(lpMint, PROGRAM_ID);
    console.log(`   LP Pool PDA: ${lpPoolPda.toBase58()}`);

    // Check Helius for LP pool accounts
    const checkLpPoolAccounts = async () => {
      const response = await fetch(`https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getCompressedAccountsByOwner',
          params: {
            owner: PROGRAM_ID.toBase58(),
            filters: [{ memcmp: { offset: 0, bytes: lpPoolPda.toBase58() } }]
          }
        })
      });
      const data = await response.json() as any;
      const count = data.result?.value?.items?.length ?? 0;
      console.log(`   LP pool accounts in Helius: ${count}`);
      return count;
    };

    // Wait for Helius to index LP tokens
    console.log('   Waiting for Helius indexing (10s)...');
    await new Promise(r => setTimeout(r, 10000));

    await checkLpPoolAccounts();

    // Scan for LP notes with retry
    const scanWithRetry = async (mint: PublicKey, maxRetries = 5): Promise<any[]> => {
      for (let i = 0; i < maxRetries; i++) {
        const notes = await mainClient.scanNotes(mint);
        console.log(`   Attempt ${i + 1}: Found ${notes.length} LP notes`);
        if (notes.length > 0) {
          return notes;
        }
        if (i < maxRetries - 1) {
          console.log(`   No LP notes found, retrying in 5s... (${i + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, 5000));
          await checkLpPoolAccounts(); // Check again
        }
      }
      return [];
    };

    const lpNotes = await scanWithRetry(lpMint);

    if (lpNotes.length === 0) {
      throw new Error('No LP tokens available for remove_liquidity test after retries');
    }

    console.log(`   Found ${lpNotes.length} LP note(s)`);
    const lpNote = lpNotes[0];
    console.log(`   Using LP note with amount: ${lpNote.amount}`);

    // Remove half of the LP tokens
    const lpAmount = BigInt(Math.floor(Number(lpNote.amount) / 2));
    console.log(`   Removing ${lpAmount} LP tokens (50%)`);

    console.log('\n[2/3] Executing remove_liquidity...');
    const removeLiquiditySuccess = await removeLiquidity(
      mainClient,
      program,
      mainWallet,
      mainPrivacyWallet,
      prover,
      lpNote,
      lpAmount,
      rpcUrl
    );

    if (removeLiquiditySuccess) {
      console.log('   ✓ Remove liquidity executed successfully');
    }

    results.push({ name: 'Remove Liquidity', passed: removeLiquiditySuccess });
  } catch (e: any) {
    console.log(`   ✗ Error: ${e.message}`);
    results.push({ name: 'Remove Liquidity', passed: false, error: e.message });
  }

  // ==========================================================================
  // Summary
  // ==========================================================================

  console.log('\n' + '='.repeat(70));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const result of results) {
    const status = result.passed ? '✓' : '✗';
    console.log(`   ${status} ${result.name}`);
    if (result.error) {
      console.log(`     Error: ${result.error}`);
    }
  }

  console.log('\n' + '-'.repeat(70));
  console.log(`   Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-'.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }

  console.log('\n✓ All AMM tests passed!\n');
}

main().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
