/**
 * Debug tokenMint byte transformations
 *
 * Run with: npx tsx scripts/debug-token-mint.ts
 */

import { PublicKey } from '@solana/web3.js';
import { initPoseidon, bytesToField, fieldToBytes, poseidonHashDomain, DOMAIN_COMMITMENT } from '../packages/sdk/src/crypto/poseidon';

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

async function main() {
  await initPoseidon();

  console.log('=== Token Mint Byte Transformation Debug ===\n');

  // SOL mint
  const tokenMint = new PublicKey('So11111111111111111111111111111111111111112');
  const tokenMintBytes = tokenMint.toBytes();
  const tokenMintField = bytesToField(tokenMintBytes);
  const tokenMintFieldBytes = fieldToBytes(tokenMintField);

  console.log('tokenMintBytes (raw):      ', toHex(tokenMintBytes));
  console.log('tokenMintField (bigint):   ', tokenMintField.toString(16));
  console.log('tokenMintFieldBytes (conv):', toHex(tokenMintFieldBytes));
  console.log('');
  console.log('Are bytes identical?:', toHex(tokenMintBytes) === toHex(tokenMintFieldBytes));

  // Compare hashes
  console.log('\n=== Hash Comparison ===');

  const testPubX = fieldToBytes(12345n);
  const testAmount = fieldToBytes(1000n);
  const testRandomness = fieldToBytes(99999n);

  // Hash using raw tokenMintBytes
  const hash1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    testPubX,
    tokenMintBytes,  // RAW bytes
    testAmount,
    testRandomness
  );
  console.log('Hash with tokenMintBytes:     ', toHex(hash1));

  // Hash using field-reduced tokenMintFieldBytes
  const hash2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    testPubX,
    tokenMintFieldBytes,  // Field-reduced bytes
    testAmount,
    testRandomness
  );
  console.log('Hash with tokenMintFieldBytes:', toHex(hash2));

  console.log('');
  console.log('Hashes match?:', toHex(hash1) === toHex(hash2));

  if (toHex(hash1) !== toHex(hash2)) {
    console.log('\n!!! MISMATCH FOUND !!!');
    console.log('This is the bug - tokenMintBytes and tokenMintFieldBytes produce different hashes');

    // Debug why
    console.log('\n--- Debugging byte difference ---');
    for (let i = 0; i < 32; i++) {
      if (tokenMintBytes[i] !== tokenMintFieldBytes[i]) {
        console.log(`Byte ${i}: ${tokenMintBytes[i].toString(16)} vs ${tokenMintFieldBytes[i].toString(16)}`);
      }
    }
  }
}

main().catch(console.error);
