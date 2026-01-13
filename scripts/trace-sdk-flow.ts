/**
 * Trace the EXACT SDK flow to identify where values diverge
 *
 * This simulates a real transfer/unshield to find the mismatch.
 * Run with: npx tsx scripts/trace-sdk-flow.ts
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PublicKey, Keypair as SolanaKeypair } from '@solana/web3.js';
import {
  initPoseidon,
  poseidonHashDomain,
  bytesToField,
  fieldToBytes,
  DOMAIN_COMMITMENT,
  DOMAIN_NULLIFIER_KEY,
  DOMAIN_SPENDING_NULLIFIER,
  DOMAIN_STEALTH,
} from '../packages/sdk/src/crypto/poseidon';
import { derivePublicKey, scalarMul, GENERATOR, pointAdd } from '../packages/sdk/src/crypto/babyjubjub';

const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

function toHex64(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

function toHex(bytes: Uint8Array): string {
  return '0x' + Buffer.from(bytes).toString('hex');
}

async function main() {
  console.log('=== SDK Flow Trace ===\n');
  console.log('This traces through the exact flow of a real transfer/unshield.\n');

  await initPoseidon();

  const nargoPath = path.join(os.homedir(), '.nargo', 'bin', 'nargo');

  // ===========================================
  // Simulate user keypair and note creation
  // ===========================================
  console.log('--- 1. Create User Keypair ---');

  // In real usage, this is a BabyJubJub keypair derived from wallet signature
  const baseSpendingKey = 0xdeadbeef12345678n; // Example spending key
  const basePubkey = derivePublicKey(baseSpendingKey);

  console.log('Base spending key:', toHex64(baseSpendingKey));
  console.log('Base pubkey X:', toHex(basePubkey.x));
  console.log('Base pubkey Y:', toHex(basePubkey.y));

  // ===========================================
  // Create a note with stealth address
  // ===========================================
  console.log('\n--- 2. Generate Stealth Address (simulating shield/receive) ---');

  // When someone sends to us, they generate an ephemeral keypair
  const ephemeralPrivate = 0x1234567890abcdefn;
  const ephemeralPubkey = derivePublicKey(ephemeralPrivate);

  console.log('Ephemeral private:', toHex64(ephemeralPrivate));
  console.log('Ephemeral pubkey X:', toHex(ephemeralPubkey.x));

  // Sender computes shared secret: S = ephemeral_private * recipient_pubkey
  const sharedSecret = scalarMul(basePubkey, ephemeralPrivate);
  console.log('Shared secret X:', toHex(sharedSecret.x));

  // Derive stealth factor: f = H(S.x) mod subgroup_order
  const factorHash = poseidonHashDomain(DOMAIN_STEALTH, sharedSecret.x);
  const factor = bytesToField(factorHash) % SUBGROUP_ORDER;
  console.log('Stealth factor:', toHex64(factor));

  // Stealth public key: P' = recipient_pubkey + factor * G
  const factorPoint = scalarMul(GENERATOR, factor);
  const stealthPubkey = pointAdd(basePubkey, factorPoint);
  const stealthPubX = bytesToField(stealthPubkey.x);
  const stealthPubY = bytesToField(stealthPubkey.y);
  console.log('Stealth pubkey X:', toHex64(stealthPubX));
  console.log('Stealth pubkey Y:', toHex64(stealthPubY));

  // ===========================================
  // Create the input note (as stored on-chain)
  // ===========================================
  console.log('\n--- 3. Create Input Note ---');

  const tokenMint = new PublicKey('So11111111111111111111111111111111111111112');
  const tokenMintBytes = tokenMint.toBytes();
  const tokenMintField = bytesToField(tokenMintBytes);

  const inAmount = 50000000n; // 0.05 SOL
  const inRandomness = fieldToBytes(99999n);
  const leafIndex = 5; // Some leaf index

  // Commitment computed by the sender when creating the note
  // commitment = H(domain, stealth_pub_x, token_mint, amount, randomness)
  const inputCommitment = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    stealthPubkey.x, // Note: uses stealth pubkey X
    tokenMintBytes,
    fieldToBytes(inAmount),
    inRandomness
  );
  const inputCommitmentField = bytesToField(inputCommitment);

  console.log('Token mint (field):', toHex64(tokenMintField));
  console.log('Amount:', inAmount);
  console.log('Randomness:', toHex(inRandomness));
  console.log('Leaf index:', leafIndex);
  console.log('Input commitment:', toHex64(inputCommitmentField));

  // Store the ephemeral pubkey with the note (needed to derive stealth private key)
  const storedNote = {
    commitment: inputCommitment,
    stealthPubX: stealthPubkey.x,
    stealthPubY: stealthPubkey.y,
    tokenMint: tokenMintBytes,
    amount: inAmount,
    randomness: inRandomness,
    leafIndex: leafIndex,
    ephemeralPubkey: ephemeralPubkey, // Critical for recovery
  };

  // ===========================================
  // Recipient derives stealth private key
  // ===========================================
  console.log('\n--- 4. Derive Stealth Private Key (recipient side) ---');

  // Recipient computes: S = base_spending_key * ephemeral_pubkey
  const recipientSharedSecret = scalarMul(ephemeralPubkey, baseSpendingKey);
  console.log('Recipient shared secret X:', toHex(recipientSharedSecret.x));

  // Should match sender's shared secret
  const senderSharedSecretX = toHex(sharedSecret.x);
  const recipientSharedSecretX = toHex(recipientSharedSecret.x);
  console.log('Shared secrets match:', senderSharedSecretX === recipientSharedSecretX);

  if (senderSharedSecretX !== recipientSharedSecretX) {
    console.error('ERROR: ECDH shared secret mismatch!');
    return;
  }

  // Derive same factor
  const recipientFactorHash = poseidonHashDomain(DOMAIN_STEALTH, recipientSharedSecret.x);
  const recipientFactor = bytesToField(recipientFactorHash) % SUBGROUP_ORDER;
  console.log('Recipient factor:', toHex64(recipientFactor));
  console.log('Factors match:', factor === recipientFactor);

  // Stealth private key: sk' = base_sk + factor mod subgroup_order
  const stealthSpendingKey = (baseSpendingKey + recipientFactor) % SUBGROUP_ORDER;
  console.log('Stealth spending key:', toHex64(stealthSpendingKey));

  // Verify: derive public key from stealth spending key
  const derivedStealthPub = derivePublicKey(stealthSpendingKey);
  const derivedStealthPubX = bytesToField(derivedStealthPub.x);
  const derivedStealthPubY = bytesToField(derivedStealthPub.y);

  console.log('Derived stealth pubkey X:', toHex64(derivedStealthPubX));
  console.log('Stored stealth pubkey X: ', toHex64(stealthPubX));
  console.log('PubX match:', derivedStealthPubX === stealthPubX);
  console.log('PubY match:', derivedStealthPubY === stealthPubY);

  if (derivedStealthPubX !== stealthPubX) {
    console.error('ERROR: Stealth pubkey mismatch! Circuit will fail.');
    console.error('This means the stealth key derivation is broken.');
    return;
  }

  // ===========================================
  // Build witness for circuit
  // ===========================================
  console.log('\n--- 5. Build Circuit Witness ---');

  // For full unshield - all amount goes to unshield, zero outputs
  const unshieldAmount = inAmount;
  const outAmount1 = 0n;
  const outAmount2 = 0n;
  const outPubX1 = 0n;
  const outPubX2 = 0n;
  const outRandomness1 = fieldToBytes(0n);
  const outRandomness2 = fieldToBytes(0n);

  // Compute nullifier using STEALTH spending key
  const nullifierKeyHash = poseidonHashDomain(
    DOMAIN_NULLIFIER_KEY,
    fieldToBytes(stealthSpendingKey),
    fieldToBytes(0n)
  );
  const nullifierKeyField = bytesToField(nullifierKeyHash);
  console.log('Nullifier key:', toHex64(nullifierKeyField));

  const nullifierHash = poseidonHashDomain(
    DOMAIN_SPENDING_NULLIFIER,
    nullifierKeyHash,
    inputCommitment,
    fieldToBytes(BigInt(leafIndex))
  );
  const nullifierField = bytesToField(nullifierHash);
  console.log('Nullifier:', toHex64(nullifierField));

  // Output commitments (zero for full unshield)
  const outCommitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(outPubX1),
    fieldToBytes(tokenMintField), // Use field-reduced token mint
    fieldToBytes(outAmount1),
    outRandomness1
  );
  const outCommitmentField1 = bytesToField(outCommitment1);

  const outCommitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    fieldToBytes(outPubX2),
    fieldToBytes(tokenMintField), // Use field-reduced token mint
    fieldToBytes(outAmount2),
    outRandomness2
  );
  const outCommitmentField2 = bytesToField(outCommitment2);

  console.log('Output commitment 1:', toHex64(outCommitmentField1));
  console.log('Output commitment 2:', toHex64(outCommitmentField2));

  // Merkle root (using input commitment for simplicity)
  const merkleRoot = inputCommitment;

  // ===========================================
  // Write Prover.toml and test
  // ===========================================
  console.log('\n--- 6. Test Circuit Execution ---');

  const merklePathStr = Array(32).fill('"' + '0x' + '0'.repeat(64) + '"').join(', ');
  const merkleIndicesStr = Array(32).fill('"0"').join(', ');

  const proverToml = `# Real SDK flow test
# Base spending key: ${toHex64(baseSpendingKey)}
# Stealth spending key: ${toHex64(stealthSpendingKey)}
# Ephemeral pubkey X: ${toHex(ephemeralPubkey.x)}

# Public inputs
merkle_root = "${toHex64(bytesToField(merkleRoot))}"
nullifier = "${toHex64(nullifierField)}"
out_commitment_1 = "${toHex64(outCommitmentField1)}"
out_commitment_2 = "${toHex64(outCommitmentField2)}"
token_mint = "${toHex64(tokenMintField)}"
unshield_amount = "${toHex64(unshieldAmount)}"

# Private inputs
in_stealth_pub_x = "${toHex64(stealthPubX)}"
in_stealth_pub_y = "${toHex64(stealthPubY)}"
in_amount = "${toHex64(inAmount)}"
in_randomness = "${toHex(inRandomness)}"
in_stealth_spending_key = "${toHex64(stealthSpendingKey)}"

# Merkle path
merkle_path = [${merklePathStr}]
merkle_path_indices = [${merkleIndicesStr}]
leaf_index = "${toHex64(BigInt(leafIndex))}"

# Output 1 (zero for unshield)
out_stealth_pub_x_1 = "${toHex64(outPubX1)}"
out_amount_1 = "${toHex64(outAmount1)}"
out_randomness_1 = "${toHex(outRandomness1)}"

# Output 2 (zero for unshield)
out_stealth_pub_x_2 = "${toHex64(outPubX2)}"
out_amount_2 = "${toHex64(outAmount2)}"
out_randomness_2 = "${toHex(outRandomness2)}"
`;

  const circuitDir = path.join(__dirname, '..', 'circuits', 'transfer', '1x2');
  const proverPath = path.join(circuitDir, 'Prover.toml');
  fs.writeFileSync(proverPath, proverToml);
  console.log('Wrote Prover.toml');

  try {
    execFileSync(nargoPath, ['execute', 'transfer_1x2'], {
      cwd: circuitDir,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    console.log('\n✅ SUCCESS! Full SDK flow with stealth addresses works.');
  } catch (err: any) {
    console.log('\n❌ FAILED! Circuit rejected values.');
    console.log('Error:', err.stderr?.toString() || err.message);

    // Debug: manually verify all constraints
    console.log('\n=== Manual Constraint Verification ===');

    // Constraint 1: scalar_mul(sk, G) == (pubX, pubY)
    console.log('\n1. Spending Key -> Public Key:');
    console.log('   sk:', toHex64(stealthSpendingKey));
    console.log('   expected pubX:', toHex64(stealthPubX));
    console.log('   derived pubX: ', toHex64(derivedStealthPubX));
    console.log('   MATCH:', derivedStealthPubX === stealthPubX);

    // Constraint 2: commitment verification
    console.log('\n2. Input Commitment:');
    console.log('   Recompute with circuit inputs...');
    const recomputedCommitment = poseidonHashDomain(
      DOMAIN_COMMITMENT,
      fieldToBytes(stealthPubX), // as passed to circuit
      fieldToBytes(tokenMintField),
      fieldToBytes(inAmount),
      inRandomness
    );
    const recomputedCommitmentField = bytesToField(recomputedCommitment);
    console.log('   original:    ', toHex64(inputCommitmentField));
    console.log('   recomputed:  ', toHex64(recomputedCommitmentField));
    console.log('   MATCH:', inputCommitmentField === recomputedCommitmentField);

    // Check if the issue is tokenMint field vs bytes
    console.log('\n   Debug tokenMint:');
    console.log('   tokenMintBytes:', toHex(tokenMintBytes));
    console.log('   tokenMintField:', toHex64(tokenMintField));
    console.log('   fieldToBytes(field):', toHex(fieldToBytes(tokenMintField)));
  }
}

main().catch(console.error);
