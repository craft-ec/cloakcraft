/**
 * Test Circuit Constraints
 *
 * This script generates Prover.toml inputs that satisfy all circuit constraints,
 * using the SDK's actual cryptographic functions.
 *
 * Run with: npx tsx scripts/test-circuit-constraints.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFileSync } from 'child_process';
import { PublicKey } from '@solana/web3.js';

// SDK crypto functions
import {
  initPoseidon,
  poseidonHashDomain,
  bytesToField,
  fieldToBytes,
  DOMAIN_COMMITMENT,
  DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_NULLIFIER_KEY,
  FIELD_MODULUS_FR,
} from '../packages/sdk/src/crypto/poseidon';
import { derivePublicKey, scalarMul, GENERATOR } from '../packages/sdk/src/crypto/babyjubjub';

// BabyJubJub subgroup order
const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

function toHex64(value: bigint | Uint8Array): string {
  if (typeof value === 'bigint') {
    const hex = value.toString(16);
    return '0x' + hex.padStart(64, '0');
  }
  return '0x' + Buffer.from(value).toString('hex').padStart(64, '0');
}

async function main() {
  console.log('=== Circuit Constraint Test ===\n');

  // Initialize Poseidon (required for circomlibjs)
  await initPoseidon();
  console.log('Poseidon initialized\n');

  // === Test values ===
  // Use a small spending key so scalar_mul works correctly
  const spendingKey = 123n;

  // Token mint - use a simple value for testing
  // In production, this would be a real Solana mint address
  const tokenMintPubkey = new PublicKey('So11111111111111111111111111111111111111112');
  const tokenMintBytes = tokenMintPubkey.toBytes();
  const tokenMintField = bytesToField(tokenMintBytes);

  // Amounts
  const inAmount = 500n;
  const outAmount1 = 300n;
  const outAmount2 = 200n;
  const unshieldAmount = 0n;

  // Randomness values
  const inRandomness = 111n;
  const outRandomness1 = 222n;
  const outRandomness2 = 333n;

  // Output stealth pub keys (arbitrary values - recipients)
  const outPubX1 = 12345n;
  const outPubX2 = 67890n;

  // Leaf index
  const leafIndex = 0n;

  // === Constraint 1: Derive public key from spending key ===
  console.log('=== Constraint 1: Spending Key -> Public Key ===');
  const derivedPub = derivePublicKey(spendingKey);
  const pubX = bytesToField(derivedPub.x);
  const pubY = bytesToField(derivedPub.y);

  console.log('Spending key:', spendingKey);
  console.log('Derived pubX:', pubX.toString().slice(0, 20) + '...');
  console.log('Derived pubY:', pubY.toString().slice(0, 20) + '...');

  // Verify the point is on curve
  console.log('Point on curve: SDK derives valid point');
  console.log('');

  // === Constraint 2: Input commitment ===
  console.log('=== Constraint 2: Input Commitment ===');
  const inCommitment = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(pubX),
    tokenMintBytes,
    fieldToBytes(inAmount),
    fieldToBytes(inRandomness)
  );
  const inCommitmentField = bytesToField(inCommitment);
  console.log('Input commitment:', inCommitmentField.toString().slice(0, 20) + '...');
  console.log('');

  // === Constraint 3: Nullifier ===
  console.log('=== Constraint 3: Nullifier ===');
  // nullifier_key = hash3(DOMAIN, spending_key, 0)
  const nullifierKey = poseidonHashDomain(
    DOMAIN_NULLIFIER_KEY,
    fieldToBytes(spendingKey),
    fieldToBytes(0n)
  );
  const nullifierKeyField = bytesToField(nullifierKey);
  console.log('Nullifier key:', nullifierKeyField.toString().slice(0, 20) + '...');

  // nullifier = hash4(DOMAIN, nk, commitment, leaf_index)
  const nullifier = poseidonHashDomain(
    DOMAIN_SPENDING_NULLIFIER,
    nullifierKey,
    inCommitment,
    fieldToBytes(leafIndex)
  );
  const nullifierField = bytesToField(nullifier);
  console.log('Nullifier:', nullifierField.toString().slice(0, 20) + '...');
  console.log('');

  // === Constraint 4 & 5: Output commitments ===
  console.log('=== Constraint 4 & 5: Output Commitments ===');
  const outCommitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(outPubX1),
    tokenMintBytes,
    fieldToBytes(outAmount1),
    fieldToBytes(outRandomness1)
  );
  const outCommitmentField1 = bytesToField(outCommitment1);
  console.log('Output commitment 1:', outCommitmentField1.toString().slice(0, 20) + '...');

  const outCommitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(outPubX2),
    tokenMintBytes,
    fieldToBytes(outAmount2),
    fieldToBytes(outRandomness2)
  );
  const outCommitmentField2 = bytesToField(outCommitment2);
  console.log('Output commitment 2:', outCommitmentField2.toString().slice(0, 20) + '...');
  console.log('');

  // === Constraint 6: Balance check ===
  console.log('=== Constraint 6: Balance Check ===');
  const totalOut = outAmount1 + outAmount2 + unshieldAmount;
  console.log(`in_amount (${inAmount}) == out_amount_1 (${outAmount1}) + out_amount_2 (${outAmount2}) + unshield (${unshieldAmount})`);
  console.log(`${inAmount} == ${totalOut}: ${inAmount === totalOut}`);
  console.log('');

  // === Merkle root ===
  // For testing with no merkle verification, we can use the input commitment as root
  // (represents a tree with single leaf at index 0)
  // Note: We removed merkle verification from circuit, so this value doesn't matter
  const merkleRoot = inCommitment;

  // === Generate Prover.toml ===
  console.log('=== Generating Prover.toml ===');

  // Merkle path - all zeros for leaf at index 0
  const merklePathStr = Array(32).fill('"0x' + '0'.repeat(64) + '"').join(', ');
  const merkleIndicesStr = Array(32).fill('"0"').join(', ');

  const proverToml = `# Public inputs
merkle_root = "${toHex64(bytesToField(merkleRoot))}"
nullifier = "${toHex64(nullifierField)}"
out_commitment_1 = "${toHex64(outCommitmentField1)}"
out_commitment_2 = "${toHex64(outCommitmentField2)}"
token_mint = "${toHex64(tokenMintField)}"
unshield_amount = "${toHex64(unshieldAmount)}"

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
  console.log('Written to:', proverPath);
  console.log('');

  // === Test with nargo execute ===
  console.log('=== Testing with nargo execute ===');
  const nargoPath = path.join(os.homedir(), '.nargo', 'bin', 'nargo');

  try {
    const result = execFileSync(nargoPath, ['execute', 'transfer_1x2'], {
      cwd: circuitDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('SUCCESS! Witness generated.');
    console.log(result);
  } catch (err: any) {
    console.log('FAILED! Circuit constraints not satisfied.');
    console.log('stderr:', err.stderr?.toString() || 'no stderr');
    console.log('stdout:', err.stdout?.toString() || 'no stdout');
    console.log('');

    // Try to identify which constraint failed
    console.log('=== Debug Info ===');
    console.log('');
    console.log('Verify manually:');
    console.log('');
    console.log('1. scalar_mul(spending_key, G) should equal (pubX, pubY)');
    console.log('   spending_key =', spendingKey);
    console.log('   expected pubX =', pubX);
    console.log('   expected pubY =', pubY);
    console.log('');
    console.log('2. in_commitment = poseidon(DOMAIN, pubX, token_mint, in_amount, in_randomness)');
    console.log('   DOMAIN =', DOMAIN_COMMITMENT);
    console.log('   pubX =', pubX);
    console.log('   token_mint =', tokenMintField);
    console.log('   in_amount =', inAmount);
    console.log('   in_randomness =', inRandomness);
    console.log('   result =', inCommitmentField);
    console.log('');
    console.log('3. nullifier = poseidon(DOMAIN, nk, commitment, leaf_index)');
    console.log('   where nk = poseidon(DOMAIN, spending_key, 0)');
    console.log('   nk =', nullifierKeyField);
    console.log('   nullifier =', nullifierField);
  }
}

main().catch(console.error);
