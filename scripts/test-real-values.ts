/**
 * Test circuit execution with REAL Solana values (not simple test values)
 *
 * This tests with actual SOL mint address and realistic amounts to identify
 * what's different between test and production values.
 *
 * Run with: npx tsx scripts/test-real-values.ts
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PublicKey } from '@solana/web3.js';
import {
  initPoseidon,
  poseidonHashDomain,
  bytesToField,
  fieldToBytes,
  DOMAIN_COMMITMENT,
  DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER,
} from '../packages/sdk/src/crypto/poseidon';
import { derivePublicKey } from '../packages/sdk/src/crypto/babyjubjub';

function toHex64(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

async function main() {
  console.log('=== Circuit Test with REAL Solana Values ===\n');

  await initPoseidon();

  const nargoPath = path.join(os.homedir(), '.nargo', 'bin', 'nargo');

  // ===========================================
  // TEST 1: Simple values (should pass)
  // ===========================================
  console.log('--- TEST 1: Simple values (control) ---');
  const simpleResult = await runTest({
    spendingKey: 123n,
    tokenMint: 1000n,
    inAmount: 500n,
    inRandomness: 111n,
    outPubX1: 12345n,
    outAmount1: 300n,
    outRandomness1: 222n,
    outPubX2: 67890n,
    outAmount2: 200n,
    outRandomness2: 333n,
  }, nargoPath);
  console.log(simpleResult ? '✅ PASSED' : '❌ FAILED');

  // ===========================================
  // TEST 2: Real SOL mint (might fail)
  // ===========================================
  console.log('\n--- TEST 2: Real SOL mint address ---');
  const solMint = new PublicKey('So11111111111111111111111111111111111111112');
  const solMintBytes = solMint.toBytes();
  const solMintField = bytesToField(solMintBytes);
  console.log('SOL mint (bytes):', Buffer.from(solMintBytes).toString('hex'));
  console.log('SOL mint (field):', toHex64(solMintField));

  const realSolResult = await runTest({
    spendingKey: 123n,
    tokenMint: solMintField, // Use real SOL mint as field
    inAmount: 50000000n, // 0.05 SOL in lamports
    inRandomness: 111n,
    outPubX1: 12345n,
    outAmount1: 30000000n,
    outRandomness1: 222n,
    outPubX2: 67890n,
    outAmount2: 20000000n,
    outRandomness2: 333n,
  }, nargoPath);
  console.log(realSolResult ? '✅ PASSED' : '❌ FAILED');

  // ===========================================
  // TEST 3: Larger spending key (might fail)
  // ===========================================
  console.log('\n--- TEST 3: Larger spending key ---');
  // Generate a larger but still valid spending key
  const largeSpendingKey = 0x1234567890abcdef1234567890abcdefn;
  console.log('Large spending key:', toHex64(largeSpendingKey));

  const largeKeyResult = await runTest({
    spendingKey: largeSpendingKey,
    tokenMint: 1000n,
    inAmount: 500n,
    inRandomness: 111n,
    outPubX1: 12345n,
    outAmount1: 300n,
    outRandomness1: 222n,
    outPubX2: 67890n,
    outAmount2: 200n,
    outRandomness2: 333n,
  }, nargoPath);
  console.log(largeKeyResult ? '✅ PASSED' : '❌ FAILED');

  // ===========================================
  // TEST 4: Full unshield (all to unshield)
  // ===========================================
  console.log('\n--- TEST 4: Full unshield (zero outputs) ---');
  const fullUnshieldResult = await runTest({
    spendingKey: 123n,
    tokenMint: 1000n,
    inAmount: 500n,
    inRandomness: 111n,
    outPubX1: 0n, // Zero output
    outAmount1: 0n,
    outRandomness1: 0n,
    outPubX2: 0n, // Zero output
    outAmount2: 0n,
    outRandomness2: 0n,
    unshieldAmount: 500n, // All to unshield
  }, nargoPath);
  console.log(fullUnshieldResult ? '✅ PASSED' : '❌ FAILED');

  // ===========================================
  // TEST 5: Combined real values
  // ===========================================
  console.log('\n--- TEST 5: Real SOL + Large spending key + Full unshield ---');
  const combinedResult = await runTest({
    spendingKey: largeSpendingKey,
    tokenMint: solMintField,
    inAmount: 50000000n,
    inRandomness: 99999n,
    outPubX1: 0n,
    outAmount1: 0n,
    outRandomness1: 0n,
    outPubX2: 0n,
    outAmount2: 0n,
    outRandomness2: 0n,
    unshieldAmount: 50000000n,
  }, nargoPath);
  console.log(combinedResult ? '✅ PASSED' : '❌ FAILED');
}

interface TestParams {
  spendingKey: bigint;
  tokenMint: bigint;
  inAmount: bigint;
  inRandomness: bigint;
  outPubX1: bigint;
  outAmount1: bigint;
  outRandomness1: bigint;
  outPubX2: bigint;
  outAmount2: bigint;
  outRandomness2: bigint;
  unshieldAmount?: bigint;
}

async function runTest(params: TestParams, nargoPath: string): Promise<boolean> {
  const {
    spendingKey,
    tokenMint,
    inAmount,
    inRandomness,
    outPubX1,
    outAmount1,
    outRandomness1,
    outPubX2,
    outAmount2,
    outRandomness2,
    unshieldAmount = 0n,
  } = params;

  // Derive public key from spending key
  const derivedPub = derivePublicKey(spendingKey);
  const pubX = bytesToField(derivedPub.x);
  const pubY = bytesToField(derivedPub.y);

  console.log('  spendingKey:', toHex64(spendingKey).slice(0, 20) + '...');
  console.log('  pubX:', toHex64(pubX).slice(0, 20) + '...');
  console.log('  tokenMint:', toHex64(tokenMint).slice(0, 20) + '...');

  // Compute input commitment
  const inCommitment = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(pubX),
    fieldToBytes(tokenMint),
    fieldToBytes(inAmount),
    fieldToBytes(inRandomness)
  );
  const inCommitmentField = bytesToField(inCommitment);

  // Compute nullifier
  const nullifierKey = poseidonHashDomain(
    DOMAIN_NULLIFIER_KEY,
    fieldToBytes(spendingKey),
    fieldToBytes(0n)
  );
  const nullifier = poseidonHashDomain(
    DOMAIN_SPENDING_NULLIFIER,
    nullifierKey,
    inCommitment,
    fieldToBytes(0n)
  );
  const nullifierField = bytesToField(nullifier);

  // Compute output commitments
  const outCommitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(outPubX1),
    fieldToBytes(tokenMint),
    fieldToBytes(outAmount1),
    fieldToBytes(outRandomness1)
  );
  const outCommitmentField1 = bytesToField(outCommitment1);

  const outCommitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(outPubX2),
    fieldToBytes(tokenMint),
    fieldToBytes(outAmount2),
    fieldToBytes(outRandomness2)
  );
  const outCommitmentField2 = bytesToField(outCommitment2);

  // Merkle root
  const merkleRoot = inCommitment;

  // Write Prover.toml
  const merklePathStr = Array(32).fill('"' + '0x' + '0'.repeat(64) + '"').join(', ');
  const merkleIndicesStr = Array(32).fill('"0"').join(', ');

  const proverToml = `# Test with values:
# spendingKey=${spendingKey}
# tokenMint=${tokenMint}
# inAmount=${inAmount}
# outAmount1=${outAmount1} + outAmount2=${outAmount2} + unshield=${unshieldAmount}

# Public inputs
merkle_root = "${toHex64(bytesToField(merkleRoot))}"
nullifier = "${toHex64(nullifierField)}"
out_commitment_1 = "${toHex64(outCommitmentField1)}"
out_commitment_2 = "${toHex64(outCommitmentField2)}"
token_mint = "${toHex64(tokenMint)}"
unshield_amount = "${toHex64(unshieldAmount)}"

# Private inputs
in_stealth_pub_x = "${toHex64(pubX)}"
in_stealth_pub_y = "${toHex64(pubY)}"
in_amount = "${toHex64(inAmount)}"
in_randomness = "${toHex64(inRandomness)}"
in_stealth_spending_key = "${toHex64(spendingKey)}"

# Merkle path
merkle_path = [${merklePathStr}]
merkle_path_indices = [${merkleIndicesStr}]
leaf_index = "${toHex64(0n)}"

# Output 1
out_stealth_pub_x_1 = "${toHex64(outPubX1)}"
out_amount_1 = "${toHex64(outAmount1)}"
out_randomness_1 = "${toHex64(outRandomness1)}"

# Output 2
out_stealth_pub_x_2 = "${toHex64(outPubX2)}"
out_amount_2 = "${toHex64(outAmount2)}"
out_randomness_2 = "${toHex64(outRandomness2)}"
`;

  const circuitDir = path.join(__dirname, '..', 'circuits', 'transfer', '1x2');
  const proverPath = path.join(circuitDir, 'Prover.toml');
  fs.writeFileSync(proverPath, proverToml);

  try {
    execFileSync(nargoPath, ['execute', 'transfer_1x2'], {
      cwd: circuitDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch (err: any) {
    console.log('  Error:', err.stderr?.toString()?.slice(0, 200) || err.message);
    return false;
  }
}

main().catch(console.error);
