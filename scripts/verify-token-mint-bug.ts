/**
 * Verify the token mint byte representation bug
 *
 * The hypothesis:
 * - Shield computes commitment with raw tokenMint.toBytes()
 * - Circuit receives tokenMintField = bytesToField(tokenMint.toBytes())
 * - If these produce different commitment hashes, that's the bug
 *
 * Run with: npx tsx scripts/verify-token-mint-bug.ts
 */

import { PublicKey } from '@solana/web3.js';
import {
  initPoseidon,
  poseidonHashDomain,
  bytesToField,
  fieldToBytes,
  DOMAIN_COMMITMENT,
} from '../packages/sdk/src/crypto/poseidon';

async function main() {
  await initPoseidon();

  console.log('=== Token Mint Bug Verification ===\n');

  // SOL mint
  const tokenMint = new PublicKey('So11111111111111111111111111111111111111112');

  // Method 1: Raw bytes (what shield uses)
  const rawBytes = tokenMint.toBytes();

  // Method 2: Field-reduced bytes (what circuit would interpret)
  const asField = bytesToField(rawBytes);
  const fieldBytes = fieldToBytes(asField);

  const toHex = (arr: Uint8Array) => Buffer.from(arr).toString('hex');

  console.log('Raw tokenMint.toBytes():');
  console.log('  ', toHex(rawBytes));

  console.log('\nField value (bytesToField):');
  console.log('  ', asField.toString(16));

  console.log('\nField bytes (fieldToBytes):');
  console.log('  ', toHex(fieldBytes));

  console.log('\nBytes identical:', toHex(rawBytes) === toHex(fieldBytes));

  // Now test commitment computation
  const testPubX = fieldToBytes(12345n);
  const amount = 50000000n;
  const randomness = fieldToBytes(99999n);

  console.log('\n=== Commitment Comparison ===\n');

  // SDK (shield) style - raw bytes
  const commitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    testPubX,
    rawBytes,  // Raw token mint bytes
    fieldToBytes(amount),
    randomness
  );

  // Circuit style - field value converted back
  const commitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    testPubX,
    fieldBytes,  // Field-reduced bytes
    fieldToBytes(amount),
    randomness
  );

  console.log('Commitment with RAW bytes:   ', toHex(commitment1));
  console.log('Commitment with FIELD bytes: ', toHex(commitment2));
  console.log('Commitments match:', toHex(commitment1) === toHex(commitment2));

  // KEY QUESTION: What does the circuit use?
  // The circuit receives token_mint as a Field (from hex string)
  // It then uses this Field value directly in hash computation
  // But Poseidon in Noir operates on Field elements, not bytes
  //
  // SDK's poseidonHashDomain:
  // - Takes byte arrays
  // - Converts each to a Field via bytesToField
  // - Passes Fields to poseidon
  //
  // So if we pass rawBytes to SDK, it becomes bytesToField(rawBytes) = asField
  // If we pass fieldBytes to SDK, it becomes bytesToField(fieldBytes) = asField
  // These should be the same!

  console.log('\n=== Verifying bytesToField consistency ===');
  const field1 = bytesToField(rawBytes);
  const field2 = bytesToField(fieldBytes);
  console.log('bytesToField(rawBytes):  ', field1.toString(16));
  console.log('bytesToField(fieldBytes):', field2.toString(16));
  console.log('Fields match:', field1 === field2);

  // HMMMM but wait, does the circuit's token_mint Field match what the SDK computed the commitment with?
  // Let me trace this more carefully

  console.log('\n=== Tracing the Full Flow ===\n');

  // 1. Shield phase:
  //    - SDK calls computeCommitment(note)
  //    - computeCommitment does: poseidonHashDomain(DOMAIN, pubX, tokenMint.toBytes(), amount, randomness)
  //    - Inside poseidonHashDomain: each input is converted via bytesToField
  //    - So the hash inputs are: [domain, bytesToField(pubX), bytesToField(tokenMint.toBytes()), bytesToField(amount), bytesToField(randomness)]

  console.log('Shield phase hash inputs:');
  console.log('  domain:', DOMAIN_COMMITMENT);
  console.log('  pubX field:', bytesToField(testPubX));
  console.log('  tokenMint field:', bytesToField(rawBytes));
  console.log('  amount field:', bytesToField(fieldToBytes(amount)));
  console.log('  randomness field:', bytesToField(randomness));

  // 2. Prove phase (circuit):
  //    - Circuit receives token_mint as a hex string, e.g., "0x069b..."
  //    - Noir parses this as a Field directly
  //    - Circuit computes: hash5(domain, in_stealth_pub_x, token_mint, in_amount, in_randomness)
  //    - All values are already Fields

  // The key is: does Noir parse "0x069b..." the same way as SDK's bytesToField(tokenMint.toBytes())?

  // SDK's bytesToField is big-endian:
  // let result = 0n;
  // for (const byte of bytes) { result = (result << 8n) | BigInt(byte); }
  // return result % FIELD_MODULUS;

  // Noir parses hex strings as big-endian Fields

  // So if the hex string represents the same number as bytesToField(tokenMint.toBytes()), they match!

  // Let's verify:
  const tokenMintFieldFromSDK = bytesToField(rawBytes);
  const hexFromSDK = '0x' + tokenMintFieldFromSDK.toString(16).padStart(64, '0');

  console.log('\n=== Final Verification ===');
  console.log('SDK computes bytesToField(tokenMint.toBytes()):', tokenMintFieldFromSDK.toString(16));
  console.log('Hex string for circuit:', hexFromSDK);

  // What we pass to circuit in buildTransferWitness:
  // token_mint: fieldToHex(tokenMintField)
  // where tokenMintField = bytesToField(tokenMintBytes)

  console.log('\nConclusion: If these match, the token mint is not the bug.');
  console.log('If they differ, that is the bug.');
}

main().catch(console.error);
