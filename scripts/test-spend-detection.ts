/**
 * Test nullifier spend detection
 *
 * Tests that the SDK correctly identifies spent notes by:
 * 1. Scanning for unspent notes and getting balance
 * 2. Performing a transact (spend) to create a nullifier
 * 3. Scanning again to verify the spent note is excluded from balance
 */

import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import {
  PublicKey,
  Keypair,
  Connection,
  SystemProgram,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import {
  createRpc,
  bn,
  deriveAddressSeedV2,
  deriveAddressV2,
  getBatchAddressTreeInfo,
  PackedAccounts,
  SystemAccountMetaConfig,
} from '@lightprotocol/stateless.js';
import 'dotenv/config';

// Import SDK
import { CloakCraftClient } from '../packages/sdk/src';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';
import { bytesToField, initPoseidon } from '../packages/sdk/src/crypto/poseidon';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const V2_OUTPUT_QUEUE = new PublicKey('oq1na8gojfdUhsfCpyjNt6h4JaDWtHf1yQj4koBWfto');

const SEEDS = {
  POOL: Buffer.from('pool'),
  VAULT: Buffer.from('vault'),
  VK: Buffer.from('vk'),
  COMMITMENT_COUNTER: Buffer.from('commitment_counter'),
};

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const padded = cleanHex.padStart(64, '0');
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

// BN254 scalar field modulus (Fr) - for circuit inputs
const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

function pubkeyToFieldHex(pubkey: PublicKey): string {
  const bytes = pubkey.toBytes();
  const value = BigInt('0x' + Buffer.from(bytes).toString('hex'));
  const fieldValue = value % BN254_FIELD_MODULUS;
  return '0x' + fieldValue.toString(16).padStart(64, '0');
}

function numberToHex64(num: number | string): string {
  const val = BigInt(num);
  return '0x' + val.toString(16).padStart(64, '0');
}

async function main() {
  console.log('=== Test Nullifier Spend Detection ===\n');

  const apiKey = process.env.HELIUS_API_KEY;
  if (!apiKey) {
    console.error('ERROR: HELIUS_API_KEY not set');
    return;
  }

  const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  const connection = new Connection(rpcUrl, 'confirmed');
  const lightRpc = createRpc(rpcUrl, rpcUrl);

  // Load wallet keypair
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));
  console.log('Wallet:', wallet.publicKey.toBase58());

  // Load Anchor program
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'cloakcraft.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: 'confirmed' }
  );
  anchor.setProvider(provider);
  const program = new Program(idl, provider);

  // Load test wallet (CloakCraft wallet with spending key)
  const testWalletPath = path.join(__dirname, '.test-wallet.json');
  if (!fs.existsSync(testWalletPath)) {
    console.error('ERROR: No test wallet found. Run e2e-sdk-test.ts first.');
    return;
  }
  const savedKey = Buffer.from(
    JSON.parse(fs.readFileSync(testWalletPath, 'utf-8')).spendingKey,
    'hex'
  );

  // Load test token mint
  const mintPath = path.join(__dirname, '.test-mint.json');
  if (!fs.existsSync(mintPath)) {
    console.error('ERROR: No test mint found. Run e2e-sdk-test.ts first.');
    return;
  }
  const tokenMint = new PublicKey(
    JSON.parse(fs.readFileSync(mintPath, 'utf-8')).mint
  );
  console.log('Token mint:', tokenMint.toBase58());

  // Derive pool PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [SEEDS.POOL, tokenMint.toBuffer()],
    PROGRAM_ID
  );
  console.log('Pool PDA:', poolPda.toBase58());

  // Initialize SDK client
  const client = new CloakCraftClient({
    rpcUrl,
    indexerUrl: 'http://localhost:3000',
    programId: PROGRAM_ID,
    heliusApiKey: apiKey,
    network: 'devnet',
  });
  client.setProgram(program);
  const cloakWallet = await client.loadWallet(new Uint8Array(savedKey));

  // === Step 1: Get balance BEFORE spend ===
  console.log('\n[Step 1] Checking balance before spend...');
  const notesBefore = await client.scanNotes(tokenMint);
  const balanceBefore = await client.getPrivateBalance(tokenMint);
  console.log(`  Notes found: ${notesBefore.length}`);
  console.log(`  Balance: ${balanceBefore} (${Number(balanceBefore) / 1e9} tokens)`);

  if (notesBefore.length === 0) {
    console.log('\nNo notes to spend. Run e2e-sdk-test.ts first to shield some tokens.');
    return;
  }

  // Log each note
  for (let i = 0; i < notesBefore.length; i++) {
    const note = notesBefore[i];
    console.log(`  Note ${i}: amount=${note.amount}, leafIndex=${note.leafIndex}`);
  }

  // Pick LAST note to spend (to avoid notes already spent with old Poseidon2)
  const noteToSpend = notesBefore[notesBefore.length - 1];
  console.log(`\n  Will spend note with amount=${noteToSpend.amount}, leafIndex=${noteToSpend.leafIndex}`);

  // === Step 2: Generate and submit transact (spend) ===
  console.log('\n[Step 2] Generating ZK proof and executing spend...');

  // Check VK is registered
  const circuitId = padCircuitId('transfer_1x2');
  const [vkPda] = PublicKey.findProgramAddressSync([SEEDS.VK, circuitId], PROGRAM_ID);
  const vkAccount = await connection.getAccountInfo(vkPda);
  if (!vkAccount) {
    console.error('ERROR: Verification key not registered');
    return;
  }

  // Setup paths
  const circuitDir = path.join(__dirname, '..', 'circuits', 'transfer', '1x2');
  const targetDir = path.join(__dirname, '..', 'circuits', 'target');
  const nargoPath = path.join(os.homedir(), '.nargo', 'bin', 'nargo');
  const sunspotPath = path.join(__dirname, 'sunspot');
  const helperDir = path.join(__dirname, '..', 'circuits', 'helpers', 'compute_test_values');

  // Use the actual spending key from the wallet
  const spendingKeyBigInt = bytesToField(cloakWallet.keypair.spending.sk);
  const tokenMintHex = pubkeyToFieldHex(tokenMint);

  // Use actual note values
  const privateInputs = {
    spending_key: spendingKeyBigInt.toString(),
    in_amount: noteToSpend.amount.toString(),
    in_randomness: bytesToField(noteToSpend.randomness).toString(),
    leaf_index: noteToSpend.leafIndex.toString(),  // Use actual leaf index!
    out_pub_x_1: '12345',  // Output recipient 1 (can be anyone)
    out_amount_1: (noteToSpend.amount / 2n).toString(),  // Split in half
    out_randomness_1: '222',
    out_pub_x_2: '67890',  // Output recipient 2
    out_amount_2: (noteToSpend.amount - noteToSpend.amount / 2n).toString(),  // Remainder
    out_randomness_2: '333',
  };

  console.log('  Private inputs:');
  console.log(`    spending_key: ${privateInputs.spending_key.slice(0, 10)}...`);
  console.log(`    in_amount: ${privateInputs.in_amount}`);
  console.log(`    leaf_index: ${privateInputs.leaf_index}`);
  console.log(`    out_amount_1: ${privateInputs.out_amount_1}`);
  console.log(`    out_amount_2: ${privateInputs.out_amount_2}`);

  // Write helper Prover.toml
  const helperProverToml = `spending_key = "${numberToHex64(privateInputs.spending_key)}"
token_mint = "${tokenMintHex}"
in_amount = "${numberToHex64(privateInputs.in_amount)}"
in_randomness = "${numberToHex64(privateInputs.in_randomness)}"
leaf_index = "${numberToHex64(privateInputs.leaf_index)}"
out_pub_x_1 = "${numberToHex64(privateInputs.out_pub_x_1)}"
out_amount_1 = "${numberToHex64(privateInputs.out_amount_1)}"
out_randomness_1 = "${numberToHex64(privateInputs.out_randomness_1)}"
out_pub_x_2 = "${numberToHex64(privateInputs.out_pub_x_2)}"
out_amount_2 = "${numberToHex64(privateInputs.out_amount_2)}"
out_randomness_2 = "${numberToHex64(privateInputs.out_randomness_2)}"
`;

  fs.writeFileSync(path.join(helperDir, 'Prover.toml'), helperProverToml);
  console.log('  Helper Prover.toml written');

  // Execute helper circuit
  let derivedValues: {
    in_stealth_pub_x: string;
    in_stealth_pub_y: string;
    in_commitment: string;
    merkle_root: string;
    nullifier: string;
    out_commitment_1: string;
    out_commitment_2: string;
  };

  try {
    const result = execFileSync(nargoPath, ['execute', 'compute_test_values'], {
      cwd: helperDir,
      encoding: 'utf-8',
    });
    console.log('  Helper circuit executed');

    const outputMatch = result.match(/Circuit output: \(([^)]+)\)/);
    if (!outputMatch) throw new Error('Could not find circuit output');

    const outputValues = outputMatch[1].split(', ').map(v => v.trim());
    derivedValues = {
      in_stealth_pub_x: outputValues[0],
      in_stealth_pub_y: outputValues[1],
      in_commitment: outputValues[2],
      merkle_root: outputValues[3],
      nullifier: outputValues[4],
      out_commitment_1: outputValues[5],
      out_commitment_2: outputValues[6],
    };
    console.log(`  Nullifier: ${derivedValues.nullifier.slice(0, 20)}...`);

    // Debug: Compare commitments
    const storedCommitmentHex = Buffer.from(noteToSpend.commitment).toString('hex');
    const circuitCommitmentHex = derivedValues.in_commitment.startsWith('0x')
      ? derivedValues.in_commitment.slice(2)
      : derivedValues.in_commitment;
    console.log(`  Circuit commitment: ${circuitCommitmentHex.slice(0, 20)}...`);
    console.log(`  Stored commitment:  ${storedCommitmentHex.slice(0, 20)}...`);
    if (circuitCommitmentHex.toLowerCase() !== storedCommitmentHex.toLowerCase()) {
      console.log('  WARNING: Commitment mismatch! Circuit computes different commitment than stored.');
    } else {
      console.log('  Commitments match!');
    }
  } catch (err: any) {
    console.error('ERROR: Helper circuit failed');
    console.error(err.stderr?.toString() || err.message);
    return;
  }

  // Write main Prover.toml
  const proverToml = `merkle_root = "${derivedValues.merkle_root}"
nullifier = "${derivedValues.nullifier}"
out_commitment_1 = "${derivedValues.out_commitment_1}"
out_commitment_2 = "${derivedValues.out_commitment_2}"
token_mint = "${tokenMintHex}"
unshield_amount = "0x${'0'.repeat(64)}"
in_stealth_pub_x = "${derivedValues.in_stealth_pub_x}"
in_stealth_pub_y = "${derivedValues.in_stealth_pub_y}"
in_amount = "${numberToHex64(privateInputs.in_amount)}"
in_randomness = "${numberToHex64(privateInputs.in_randomness)}"
in_stealth_spending_key = "${numberToHex64(privateInputs.spending_key)}"
merkle_path = [${Array(16).fill('"0x' + '0'.repeat(64) + '"').join(', ')}]
merkle_path_indices = [${Array(16).fill('"0x' + '0'.repeat(64) + '"').join(', ')}]
leaf_index = "${numberToHex64(privateInputs.leaf_index)}"
out_stealth_pub_x_1 = "${numberToHex64(privateInputs.out_pub_x_1)}"
out_amount_1 = "${numberToHex64(privateInputs.out_amount_1)}"
out_randomness_1 = "${numberToHex64(privateInputs.out_randomness_1)}"
out_stealth_pub_x_2 = "${numberToHex64(privateInputs.out_pub_x_2)}"
out_amount_2 = "${numberToHex64(privateInputs.out_amount_2)}"
out_randomness_2 = "${numberToHex64(privateInputs.out_randomness_2)}"
`;

  fs.writeFileSync(path.join(circuitDir, 'Prover.toml'), proverToml);
  console.log('  Main Prover.toml written');

  // Generate witness
  try {
    execFileSync(nargoPath, ['execute', 'transfer_1x2'], {
      cwd: circuitDir,
      stdio: 'pipe',
    });
    console.log('  Witness generated');
  } catch (err: any) {
    console.error('ERROR: nargo execute failed');
    console.error(err.stderr?.toString() || err.message);
    return;
  }

  // Generate proof
  const acirPath = path.join(targetDir, 'transfer_1x2.json');
  const witnessPath = path.join(targetDir, 'transfer_1x2.gz');
  const ccsPath = path.join(targetDir, 'transfer_1x2.ccs');
  const pkPath = path.join(targetDir, 'transfer_1x2.pk');
  const proofPath = path.join(targetDir, 'transfer_1x2.proof');

  let proofBytes: Uint8Array;
  try {
    execFileSync(sunspotPath, ['prove', acirPath, witnessPath, ccsPath, pkPath], {
      cwd: targetDir,
      stdio: 'pipe',
    });
    const rawProof = new Uint8Array(fs.readFileSync(proofPath));
    proofBytes = rawProof.slice(0, 256);
    console.log(`  Proof generated (${proofBytes.length} bytes)`);
  } catch (err: any) {
    console.error('ERROR: sunspot prove failed');
    console.error(err.stderr?.toString() || err.message);
    return;
  }

  // Get Light Protocol validity proof
  console.log('  Getting Light validity proof...');
  const addressTreeInfo = getBatchAddressTreeInfo();
  const nullifierBytes = hexToBytes(derivedValues.nullifier);

  // Derive nullifier address - must match program seeds
  const nullifierSeeds = [
    Buffer.from('spend_nullifier'),
    poolPda.toBuffer(),
    Buffer.from(nullifierBytes),
  ];
  const nullifierAddressSeed = deriveAddressSeedV2(nullifierSeeds);
  const nullifierAddress = deriveAddressV2(nullifierAddressSeed, addressTreeInfo.tree, PROGRAM_ID);
  console.log(`  Nullifier address: ${nullifierAddress.toBase58()}`);

  const nullifierProof = await lightRpc.getValidityProofV0(
    [],
    [{
      address: bn(nullifierAddress.toBytes()),
      tree: addressTreeInfo.tree,
      queue: addressTreeInfo.queue,
    }]
  );
  console.log('  Validity proof received');

  // Build remaining accounts using SDK
  const systemConfig = SystemAccountMetaConfig.new(PROGRAM_ID);
  const packedAccounts = PackedAccounts.newWithSystemAccountsV2(systemConfig);

  const outputTreeIndex = packedAccounts.insertOrGet(V2_OUTPUT_QUEUE);
  const addressTreeIndex = packedAccounts.insertOrGet(addressTreeInfo.tree);

  const { remainingAccounts: rawAccounts } = packedAccounts.toAccountMetas();
  const remainingAccounts = rawAccounts.map((acc: any) => ({
    pubkey: acc.pubkey,
    isWritable: Boolean(acc.isWritable),
    isSigner: Boolean(acc.isSigner),
  }));

  // Get counter and vault PDAs
  const [counterPda] = PublicKey.findProgramAddressSync(
    [SEEDS.COMMITMENT_COUNTER, poolPda.toBuffer()],
    PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [SEEDS.VAULT, tokenMint.toBuffer()],
    PROGRAM_ID
  );

  // Convert proof format
  function convertCompressedProof(proof: any) {
    const proofA = new Uint8Array(32);
    const proofB = new Uint8Array(64);
    const proofC = new Uint8Array(32);
    if (proof.compressedProof) {
      proofA.set(proof.compressedProof.a.slice(0, 32));
      proofB.set(proof.compressedProof.b.slice(0, 64));
      proofC.set(proof.compressedProof.c.slice(0, 32));
    }
    return { a: Array.from(proofA), b: Array.from(proofB), c: Array.from(proofC) };
  }

  const lightParams = {
    nullifierProof: convertCompressedProof(nullifierProof),
    nullifierAddressTreeInfo: {
      addressMerkleTreePubkeyIndex: addressTreeIndex,
      addressQueuePubkeyIndex: addressTreeIndex,
      rootIndex: nullifierProof.rootIndices[0] ?? 0,
    },
    outputTreeIndex: outputTreeIndex,
  };

  const outCommitments = [
    Array.from(hexToBytes(derivedValues.out_commitment_1)),
    Array.from(hexToBytes(derivedValues.out_commitment_2)),
  ];

  // Execute transact
  console.log('  Submitting transact transaction...');
  try {
    const tx = await program.methods
      .transact(
        Buffer.from(proofBytes),
        Array.from(hexToBytes(derivedValues.merkle_root)),
        Array.from(nullifierBytes),
        outCommitments,
        [], // encrypted notes
        new anchor.BN(0), // unshield amount
        lightParams
      )
      .accountsStrict({
        pool: poolPda,
        commitmentCounter: counterPda,
        tokenVault: vaultPda,
        verificationKey: vkPda,
        unshieldRecipient: null as any,
        relayer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(remainingAccounts)
      .preInstructions([
        ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }),
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
      ])
      .rpc();

    console.log(`  Transact tx: ${tx}`);
    console.log('  Nullifier created on-chain!');

    // Debug: Compare circuit nullifier vs SDK nullifier
    console.log('\n  === Nullifier Debug ===');
    await initPoseidon();
    const sdkNullifierKey = deriveNullifierKey(cloakWallet.keypair.spending.sk);
    console.log(`  SDK nullifierKey: ${Buffer.from(sdkNullifierKey).toString('hex').slice(0, 20)}...`);

    // SDK nullifier from stored commitment
    const sdkNullifier = deriveSpendingNullifier(
      sdkNullifierKey,
      noteToSpend.commitment,
      noteToSpend.leafIndex
    );
    console.log(`  SDK nullifier (from stored commitment): ${Buffer.from(sdkNullifier).toString('hex').slice(0, 20)}...`);
    console.log(`  Circuit nullifier (sent to tx): ${Buffer.from(nullifierBytes).toString('hex').slice(0, 20)}...`);
    console.log(`  noteToSpend.commitment: ${Buffer.from(noteToSpend.commitment).toString('hex').slice(0, 20)}...`);
    console.log(`  noteToSpend.leafIndex: ${noteToSpend.leafIndex}`);

    const match = Buffer.from(sdkNullifier).equals(Buffer.from(nullifierBytes));
    console.log(`  Nullifiers match: ${match}`);
    if (!match) {
      console.log('  WARNING: Nullifiers do not match! Scanner will not find the spent note.');
    }
    console.log('  =========================');
  } catch (err: any) {
    console.error('Transact failed:', err.message);
    if (err.logs) {
      console.log('Logs:', err.logs.slice(-10));
    }
    return;
  }

  // Wait for confirmation
  console.log('\n  Waiting for indexer to catch up (10s)...');
  await new Promise(resolve => setTimeout(resolve, 10000));

  // === Step 3: Get balance AFTER spend ===
  console.log('\n[Step 3] Checking balance after spend...');
  const notesAfter = await client.scanNotes(tokenMint);
  const balanceAfter = await client.getPrivateBalance(tokenMint);
  console.log(`  Notes found: ${notesAfter.length}`);
  console.log(`  Balance: ${balanceAfter} (${Number(balanceAfter) / 1e9} tokens)`);

  // === Results ===
  console.log('\n=== RESULTS ===');
  console.log(`Before: ${notesBefore.length} notes, balance = ${balanceBefore}`);
  console.log(`After:  ${notesAfter.length} notes, balance = ${balanceAfter}`);

  const spentAmount = noteToSpend.amount;
  const expectedBalanceAfter = balanceBefore - spentAmount;

  if (balanceAfter === expectedBalanceAfter) {
    console.log(`\nSUCCESS: Nullifier detection working correctly!`);
    console.log(`  Spent note (amount=${spentAmount}) correctly excluded from balance`);
  } else if (balanceAfter === balanceBefore) {
    console.log(`\nFAILED: Nullifier NOT detected - spent note still counted`);
    console.log(`  SDK thinks balance is still ${balanceBefore}, should be ${expectedBalanceAfter}`);
  } else {
    console.log(`\nUNEXPECTED: Balance changed but not as expected`);
    console.log(`  Expected: ${expectedBalanceAfter}, Got: ${balanceAfter}`);
  }
}

main().catch(console.error);
