/**
 * Debug script to trace ZK proof constraint values
 *
 * Computes all intermediate values that the circuit checks
 * and logs them for comparison with circuit expectations.
 */

import { initPoseidon, poseidonHashDomain, bytesToField, fieldToBytes, DOMAIN_COMMITMENT, DOMAIN_STEALTH, DOMAIN_NULLIFIER_KEY, DOMAIN_SPENDING_NULLIFIER } from '../packages/sdk/src/crypto/poseidon';
import { scalarMul, derivePublicKey, GENERATOR } from '../packages/sdk/src/crypto/babyjubjub';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';
import { computeCommitment } from '../packages/sdk/src/crypto/commitment';
import { deriveStealthPrivateKey } from '../packages/sdk/src/crypto/stealth';
import { PublicKey } from '@solana/web3.js';

const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

function toHex(value: Uint8Array | bigint): string {
  if (typeof value === 'bigint') {
    return '0x' + value.toString(16).padStart(64, '0');
  }
  return '0x' + Buffer.from(value).toString('hex');
}

function truncate(s: string, len: number = 24): string {
  return s.slice(0, len) + '...';
}

async function main() {
  await initPoseidon();

  console.log('=== ZK Proof Constraint Debug ===\n');

  // Example test values - replace with actual values from your failing proof
  // These should match what you pass to the proof generator

  // 1. Input note details
  const baseSpendingKey = 12345n; // Your actual spending key as bigint
  const tokenMintPubkey = new PublicKey('So11111111111111111111111111111111111111112'); // SOL
  const inAmount = 1000000000n; // 1 SOL in lamports
  const inRandomness = fieldToBytes(99999n);
  const leafIndex = 0;

  // For stealth address, we need an ephemeral pubkey
  // If this is a non-stealth note, just use base key
  const hasEphemeralPubkey = false;

  let stealthSpendingKey: bigint;
  let stealthPubkey: { x: Uint8Array; y: Uint8Array };

  if (hasEphemeralPubkey) {
    // Example ephemeral pubkey - replace with actual
    const ephemeralPubkey = {
      x: fieldToBytes(123456n),
      y: fieldToBytes(789012n),
    };
    stealthSpendingKey = deriveStealthPrivateKey(baseSpendingKey, ephemeralPubkey);
    console.log('[Stealth] Derived stealth spending key from ephemeral');
  } else {
    stealthSpendingKey = baseSpendingKey % SUBGROUP_ORDER;
    console.log('[Stealth] Using base spending key (no stealth)');
  }

  // 2. Derive public key from spending key
  console.log('\n--- CONSTRAINT 1: Spending Key -> Public Key ---');
  console.log('SDK input:');
  console.log('  stealthSpendingKey:', stealthSpendingKey.toString(16).slice(0, 16) + '...');

  // SDK computation
  const derivedPubkey = derivePublicKey(stealthSpendingKey);
  const derivedPubX = bytesToField(derivedPubkey.x);
  const derivedPubY = bytesToField(derivedPubkey.y);

  console.log('\nSDK output (derivedPublicKey):');
  console.log('  x:', truncate(toHex(derivedPubX)));
  console.log('  y:', truncate(toHex(derivedPubY)));

  console.log('\nCircuit will compute:');
  console.log('  scalar_mul(in_stealth_spending_key, G) where G =');
  console.log('    G.x:', truncate(toHex(bytesToField(GENERATOR.x))));
  console.log('    G.y:', truncate(toHex(bytesToField(GENERATOR.y))));
  console.log('\nCircuit expects in_stealth_pub_x == derived_pub.x');
  console.log('Circuit expects in_stealth_pub_y == derived_pub.y');

  // The stealth pub values for the note
  const inStealthPubX = derivedPubkey.x; // Use derived values
  const inStealthPubY = derivedPubkey.y;

  // 3. Compute input commitment
  console.log('\n--- CONSTRAINT 2: Input Commitment ---');
  const tokenMintBytes = tokenMintPubkey.toBytes();
  const tokenMintField = bytesToField(tokenMintBytes);
  const tokenMintFieldBytes = fieldToBytes(tokenMintField);

  console.log('SDK inputs:');
  console.log('  DOMAIN_COMMITMENT:', DOMAIN_COMMITMENT.toString(16));
  console.log('  stealthPubX:', truncate(toHex(inStealthPubX)));
  console.log('  tokenMint (raw):', truncate(toHex(tokenMintBytes)));
  console.log('  tokenMint (field):', truncate(toHex(tokenMintField)));
  console.log('  amount:', inAmount.toString());
  console.log('  amount (field bytes):', truncate(toHex(fieldToBytes(inAmount))));
  console.log('  randomness:', truncate(toHex(inRandomness)));

  // Compute commitment
  const inputCommitment = computeCommitment({
    stealthPubX: inStealthPubX,
    tokenMint: tokenMintPubkey,
    amount: inAmount,
    randomness: inRandomness,
  });

  console.log('\nSDK computed commitment:', truncate(toHex(inputCommitment)));

  // Also compute manually to verify
  const manualCommitment = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    inStealthPubX,
    tokenMintBytes,
    fieldToBytes(inAmount),
    inRandomness
  );
  console.log('Manual computed commitment:', truncate(toHex(manualCommitment)));

  // 4. Derive nullifier
  console.log('\n--- CONSTRAINT 3: Nullifier ---');

  // Nullifier key derivation
  const stealthKeyBytes = fieldToBytes(stealthSpendingKey);
  const nullifierKey = deriveNullifierKey(stealthKeyBytes);
  console.log('SDK inputs:');
  console.log('  DOMAIN_NULLIFIER_KEY:', DOMAIN_NULLIFIER_KEY.toString(16));
  console.log('  stealthSpendingKey:', truncate(toHex(stealthKeyBytes)));
  console.log('  nullifierKey:', truncate(toHex(nullifierKey)));

  // Spending nullifier
  const nullifier = deriveSpendingNullifier(nullifierKey, inputCommitment, leafIndex);
  console.log('  DOMAIN_SPENDING_NULLIFIER:', DOMAIN_SPENDING_NULLIFIER.toString(16));
  console.log('  commitment:', truncate(toHex(inputCommitment)));
  console.log('  leafIndex:', leafIndex);
  console.log('  leafIndex (field):', truncate(toHex(fieldToBytes(BigInt(leafIndex)))));

  console.log('\nSDK computed nullifier:', truncate(toHex(nullifier)));

  // Circuit formula:
  // nk = hash3(NULLIFIER_KEY_DOMAIN, stealth_spending_key, 0)
  // nullifier = hash4(SPENDING_NULLIFIER_DOMAIN, nk, commitment, leaf_index)

  // 5. Output commitments
  console.log('\n--- CONSTRAINT 4 & 5: Output Commitments ---');

  const outAmount1 = 500000000n; // 0.5 SOL
  const outAmount2 = 500000000n; // 0.5 SOL (change)
  const outRandomness1 = fieldToBytes(111111n);
  const outRandomness2 = fieldToBytes(222222n);
  const outStealthPubX1 = fieldToBytes(12345n); // recipient
  const outStealthPubX2 = inStealthPubX; // change back to self

  const outCommitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    outStealthPubX1,
    tokenMintBytes,
    fieldToBytes(outAmount1),
    outRandomness1
  );

  const outCommitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    outStealthPubX2,
    tokenMintBytes,
    fieldToBytes(outAmount2),
    outRandomness2
  );

  console.log('Output 1:');
  console.log('  stealthPubX:', truncate(toHex(outStealthPubX1)));
  console.log('  amount:', outAmount1.toString());
  console.log('  randomness:', truncate(toHex(outRandomness1)));
  console.log('  commitment:', truncate(toHex(outCommitment1)));

  console.log('\nOutput 2:');
  console.log('  stealthPubX:', truncate(toHex(outStealthPubX2)));
  console.log('  amount:', outAmount2.toString());
  console.log('  randomness:', truncate(toHex(outRandomness2)));
  console.log('  commitment:', truncate(toHex(outCommitment2)));

  // 6. Balance check
  console.log('\n--- CONSTRAINT 6: Balance Check ---');
  const unshieldAmount = 0n;
  const totalOut = outAmount1 + outAmount2 + unshieldAmount;
  console.log('in_amount:', inAmount.toString());
  console.log('out_amount_1 + out_amount_2 + unshield:', totalOut.toString());
  console.log('Balance matches:', inAmount === totalOut);

  // 7. Range checks
  console.log('\n--- CONSTRAINT 7: Range Checks (64-bit) ---');
  const MAX_64_BIT = (1n << 64n) - 1n;
  console.log('in_amount fits 64 bits:', inAmount <= MAX_64_BIT);
  console.log('out_amount_1 fits 64 bits:', outAmount1 <= MAX_64_BIT);
  console.log('out_amount_2 fits 64 bits:', outAmount2 <= MAX_64_BIT);
  console.log('unshield_amount fits 64 bits:', unshieldAmount <= MAX_64_BIT);

  // Summary of what to pass to circuit
  console.log('\n=== PROVER.TOML VALUES ===');
  console.log('# Public inputs');
  console.log(`merkle_root = "0x${'0'.repeat(64)}"`); // Replace with actual
  console.log(`nullifier = "${toHex(nullifier)}"`);
  console.log(`out_commitment_1 = "${toHex(outCommitment1)}"`);
  console.log(`out_commitment_2 = "${toHex(outCommitment2)}"`);
  console.log(`token_mint = "${toHex(tokenMintField)}"`);
  console.log(`unshield_amount = "${unshieldAmount}"`);
  console.log('');
  console.log('# Private inputs');
  console.log(`in_stealth_pub_x = "${toHex(inStealthPubX)}"`);
  console.log(`in_stealth_pub_y = "${toHex(inStealthPubY)}"`);
  console.log(`in_amount = "${inAmount}"`);
  console.log(`in_randomness = "${toHex(inRandomness)}"`);
  console.log(`in_stealth_spending_key = "${toHex(stealthSpendingKey)}"`);
  console.log(`leaf_index = "${leafIndex}"`);
  console.log(`out_stealth_pub_x_1 = "${toHex(outStealthPubX1)}"`);
  console.log(`out_amount_1 = "${outAmount1}"`);
  console.log(`out_randomness_1 = "${toHex(outRandomness1)}"`);
  console.log(`out_stealth_pub_x_2 = "${toHex(outStealthPubX2)}"`);
  console.log(`out_amount_2 = "${outAmount2}"`);
  console.log(`out_randomness_2 = "${toHex(outRandomness2)}"`);

  console.log('\n=== Debug Complete ===');
}

main().catch(console.error);
