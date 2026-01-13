/**
 * Compare Poseidon hash between SDK (circomlibjs) and Noir standard library
 *
 * This test verifies that both implementations produce the same results.
 * Run with: npx tsx scripts/compare-poseidon.ts
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { initPoseidon, poseidonHashDomain, bytesToField, fieldToBytes, DOMAIN_COMMITMENT, DOMAIN_NULLIFIER_KEY, DOMAIN_SPENDING_NULLIFIER } from '../packages/sdk/src/crypto/poseidon';
import { derivePublicKey } from '../packages/sdk/src/crypto/babyjubjub';

function toHex64(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

async function main() {
  console.log('=== Poseidon Hash Comparison Test ===\n');
  console.log('Testing if SDK (circomlibjs) and Noir produce the same hashes.\n');

  await initPoseidon();

  // Test values - same as circuit tests
  const testCases = [
    {
      name: 'Commitment (simple values)',
      domain: DOMAIN_COMMITMENT,
      inputs: [12345n, 67890n, 1000n, 99999n],
      labels: ['stealth_pub_x', 'token_mint', 'amount', 'randomness'],
    },
    {
      name: 'Commitment (with spending key 123)',
      domain: DOMAIN_COMMITMENT,
      // Use pubX derived from spending key 123
      inputs: [null, 1000n, 500n, 111n], // pubX will be computed
      labels: ['stealth_pub_x (from sk=123)', 'token_mint', 'amount', 'randomness'],
      computePubX: 123n,
    },
    {
      name: 'Nullifier key',
      domain: DOMAIN_NULLIFIER_KEY,
      inputs: [123n, 0n],
      labels: ['spending_key', 'zero'],
    },
  ];

  const nargoPath = path.join(os.homedir(), '.nargo', 'bin', 'nargo');

  for (const test of testCases) {
    console.log(`\n--- ${test.name} ---`);

    let inputs = [...test.inputs];

    // If we need to compute pubX from spending key
    if (test.computePubX !== undefined) {
      const derivedPub = derivePublicKey(test.computePubX);
      const pubX = bytesToField(derivedPub.x);
      inputs[0] = pubX;
      console.log(`Derived pubX from sk=${test.computePubX}: ${pubX.toString(16).slice(0, 20)}...`);
    }

    // Compute hash with SDK
    const inputBytes = inputs.map(v => fieldToBytes(v!));
    const sdkResult = poseidonHashDomain(test.domain, ...inputBytes);
    const sdkHash = bytesToField(sdkResult);

    console.log(`SDK inputs: domain=${test.domain}, ${inputs.map((v, i) => `${test.labels[i]}=${v}`).join(', ')}`);
    console.log(`SDK hash: ${toHex64(sdkHash)}`);
  }

  // Now test with actual circuit execution
  console.log('\n\n=== Circuit Execution Test ===\n');
  console.log('Testing circuit with spending_key=123 to compare scalar_mul and hashes.\n');

  // Values from the circuit test
  const spendingKey = 123n;
  const tokenMint = 1000n;
  const inAmount = 500n;
  const inRandomness = 111n;
  const outPubX1 = 12345n;
  const outAmount1 = 300n;
  const outRandomness1 = 222n;
  const outPubX2 = 67890n;
  const outAmount2 = 200n;
  const outRandomness2 = 333n;
  const leafIndex = 0n;

  // Derive public key
  const derivedPub = derivePublicKey(spendingKey);
  const pubX = bytesToField(derivedPub.x);
  const pubY = bytesToField(derivedPub.y);
  console.log('Derived public key from sk=123:');
  console.log(`  pubX: ${toHex64(pubX)}`);
  console.log(`  pubY: ${toHex64(pubY)}`);

  // Compute input commitment (SDK)
  const inCommitment = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(pubX),
    fieldToBytes(tokenMint),
    fieldToBytes(inAmount),
    fieldToBytes(inRandomness)
  );
  const inCommitmentField = bytesToField(inCommitment);
  console.log(`\nInput commitment (SDK): ${toHex64(inCommitmentField)}`);

  // Compute nullifier key (SDK)
  const nullifierKey = poseidonHashDomain(
    DOMAIN_NULLIFIER_KEY,
    fieldToBytes(spendingKey),
    fieldToBytes(0n)
  );
  const nullifierKeyField = bytesToField(nullifierKey);
  console.log(`Nullifier key (SDK): ${toHex64(nullifierKeyField)}`);

  // Compute nullifier (SDK)
  const nullifier = poseidonHashDomain(
    DOMAIN_SPENDING_NULLIFIER,
    nullifierKey,
    inCommitment,
    fieldToBytes(leafIndex)
  );
  const nullifierField = bytesToField(nullifier);
  console.log(`Nullifier (SDK): ${toHex64(nullifierField)}`);

  // Compute output commitments (SDK)
  const outCommitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(outPubX1),
    fieldToBytes(tokenMint),
    fieldToBytes(outAmount1),
    fieldToBytes(outRandomness1)
  );
  const outCommitmentField1 = bytesToField(outCommitment1);
  console.log(`Output commitment 1 (SDK): ${toHex64(outCommitmentField1)}`);

  const outCommitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(outPubX2),
    fieldToBytes(tokenMint),
    fieldToBytes(outAmount2),
    fieldToBytes(outRandomness2)
  );
  const outCommitmentField2 = bytesToField(outCommitment2);
  console.log(`Output commitment 2 (SDK): ${toHex64(outCommitmentField2)}`);

  // Merkle root (SDK) - for single leaf at index 0
  const merkleRoot = inCommitment; // Simple case

  // Write Prover.toml with these SDK-computed values
  const merklePathStr = Array(32).fill('"' + '0x' + '0'.repeat(64) + '"').join(', ');
  const merkleIndicesStr = Array(32).fill('"0"').join(', ');

  const proverToml = `# Public inputs (computed by SDK)
merkle_root = "${toHex64(bytesToField(merkleRoot))}"
nullifier = "${toHex64(nullifierField)}"
out_commitment_1 = "${toHex64(outCommitmentField1)}"
out_commitment_2 = "${toHex64(outCommitmentField2)}"
token_mint = "${toHex64(tokenMint)}"
unshield_amount = "${toHex64(0n)}"

# Private inputs - Input note
in_stealth_pub_x = "${toHex64(pubX)}"
in_stealth_pub_y = "${toHex64(pubY)}"
in_amount = "${toHex64(inAmount)}"
in_randomness = "${toHex64(inRandomness)}"
in_stealth_spending_key = "${toHex64(spendingKey)}"

# Merkle path (32 elements)
merkle_path = [${merklePathStr}]
merkle_path_indices = [${merkleIndicesStr}]
leaf_index = "${toHex64(leafIndex)}"

# Output 1 (recipient)
out_stealth_pub_x_1 = "${toHex64(outPubX1)}"
out_amount_1 = "${toHex64(outAmount1)}"
out_randomness_1 = "${toHex64(outRandomness1)}"

# Output 2 (change)
out_stealth_pub_x_2 = "${toHex64(outPubX2)}"
out_amount_2 = "${toHex64(outAmount2)}"
out_randomness_2 = "${toHex64(outRandomness2)}"
`;

  const circuitDir = path.join(__dirname, '..', 'circuits', 'transfer', '1x2');
  const proverPath = path.join(circuitDir, 'Prover.toml');
  fs.writeFileSync(proverPath, proverToml);
  console.log(`\nWrote Prover.toml to: ${proverPath}`);

  // Run nargo execute
  console.log('\nRunning nargo execute...');
  try {
    execFileSync(nargoPath, ['execute', 'transfer_1x2'], {
      cwd: circuitDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('\n✅ SUCCESS! Circuit executed with SDK-computed values.');
    console.log('This confirms SDK and Noir use compatible Poseidon and BabyJubJub implementations.');
  } catch (err: any) {
    console.log('\n❌ FAILED! Circuit rejected SDK-computed values.');
    console.log('This indicates a mismatch between SDK and Noir implementations.');
    console.log('\nError:', err.stderr?.toString() || err.message);

    console.log('\n=== Debugging ===');
    console.log('The circuit computes these values internally and compares:');
    console.log('1. scalar_mul(spending_key, G) vs (in_stealth_pub_x, in_stealth_pub_y)');
    console.log('2. poseidon(DOMAIN, pubX, token, amount, rand) vs input_commitment');
    console.log('3. poseidon(DOMAIN, nk, commitment, leaf_idx) vs nullifier');
    console.log('4. poseidon(DOMAIN, pubX, token, amount, rand) vs out_commitment_1');
    console.log('5. poseidon(DOMAIN, pubX, token, amount, rand) vs out_commitment_2');
    console.log('6. in_amount vs out_1 + out_2 + unshield');
    console.log('\nSince pre-verification passes in SDK, the issue is likely:');
    console.log('- Different Poseidon implementations (circomlibjs vs Noir stdlib)');
    console.log('- Different BabyJubJub scalar_mul implementations');
  }
}

main().catch(console.error);
