/**
 * Test script for note encryption and decryption
 *
 * Tests:
 * 1. Standard token note encryption/decryption
 * 2. Position note encryption/decryption
 * 3. LP note encryption/decryption
 * 4. Encrypted note serialization/deserialization
 */

import { PublicKey, Keypair } from '@solana/web3.js';
import {
  encryptNote,
  decryptNote,
  tryDecryptNote,
  encryptPositionNote,
  encryptLpNote,
  tryDecryptAnyNote,
  serializeEncryptedNote,
} from '../packages/sdk/src/crypto/encryption';
import {
  createNote,
  createPositionNote,
  createLpNote,
  computeCommitment,
  computePositionCommitment,
  computeLpCommitment,
  serializePositionNote,
  serializeLpNote,
  deserializePositionNote,
  deserializeLpNote,
  NOTE_TYPE_POSITION,
  NOTE_TYPE_LP,
} from '../packages/sdk/src/crypto/commitment';
import { generateStealthAddress, deriveStealthPrivateKey } from '../packages/sdk/src/crypto/stealth';
import { derivePublicKey } from '../packages/sdk/src/crypto/babyjubjub';
import { initPoseidon, bytesToField, fieldToBytes } from '../packages/sdk/src/crypto/poseidon';
import type { Point } from '@cloakcraft/types';

// BabyJubJub subgroup order
const SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;

function generateRandomScalar(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToField(bytes) % SUBGROUP_ORDER;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Note Encryption/Decryption Test');
  console.log('='.repeat(60));

  // Initialize Poseidon hash
  await initPoseidon();
  console.log('Poseidon initialized');

  // Generate test keys (simulating user's spending key)
  const spendingKey = generateRandomScalar();
  const spendingPubkey = derivePublicKey(spendingKey);

  console.log('\n--- Test Keys ---');
  console.log('Spending key:', spendingKey.toString(16).slice(0, 16) + '...');
  console.log('Spending pubkey X:', Buffer.from(spendingPubkey.x).toString('hex').slice(0, 16) + '...');

  // Generate stealth address (sender side)
  const { stealthAddress, ephemeralPrivate } = generateStealthAddress(spendingPubkey);
  console.log('\nStealth address generated:');
  console.log('  ephemeral X:', Buffer.from(stealthAddress.ephemeralPubkey.x).toString('hex').slice(0, 16) + '...');
  console.log('  stealth X:', Buffer.from(stealthAddress.stealthPubkey.x).toString('hex').slice(0, 16) + '...');

  // Derive stealth private key (recipient side)
  const stealthPrivateKey = deriveStealthPrivateKey(spendingKey, stealthAddress.ephemeralPubkey);
  console.log('Stealth private key derived:', stealthPrivateKey.toString(16).slice(0, 16) + '...');

  // Test 1: Standard Token Note
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Standard Token Note');
  console.log('='.repeat(60));

  const tokenMint = Keypair.generate().publicKey;
  const standardNote = createNote(
    stealthAddress.stealthPubkey.x,
    tokenMint,
    1000000n, // 1 token (6 decimals)
  );

  console.log('\nOriginal note:');
  console.log('  tokenMint:', tokenMint.toBase58().slice(0, 16) + '...');
  console.log('  amount:', standardNote.amount.toString());
  console.log('  randomness:', Buffer.from(standardNote.randomness).toString('hex').slice(0, 16) + '...');

  // Encrypt
  const encryptedStandard = encryptNote(standardNote, stealthAddress.stealthPubkey);
  console.log('\nEncrypted note:');
  console.log('  ephemeral X:', Buffer.from(encryptedStandard.ephemeralPubkey.x).toString('hex').slice(0, 16) + '...');
  console.log('  ciphertext length:', encryptedStandard.ciphertext.length);
  console.log('  tag length:', encryptedStandard.tag.length);

  // Serialize for on-chain storage
  const serializedStandard = serializeEncryptedNote(encryptedStandard);
  console.log('  serialized length:', serializedStandard.length, '(max 250)');

  // Decrypt
  const decryptedStandard = tryDecryptNote(encryptedStandard, stealthPrivateKey);
  if (decryptedStandard) {
    console.log('\nDecrypted note:');
    console.log('  amount:', decryptedStandard.amount.toString());
    console.log('  MATCH:', decryptedStandard.amount === standardNote.amount ? 'YES' : 'NO');
  } else {
    console.log('\nDecryption FAILED!');
  }

  // Verify commitment
  const standardCommitment = computeCommitment(standardNote);
  console.log('\nCommitment:', Buffer.from(standardCommitment).toString('hex').slice(0, 32) + '...');

  // Test 2: Position Note
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Position Note');
  console.log('='.repeat(60));

  const marketId = new Uint8Array(32);
  crypto.getRandomValues(marketId);

  const positionNote = createPositionNote(
    stealthAddress.stealthPubkey.x,
    marketId,
    true, // isLong
    1000000n, // margin
    10000000n, // size (10x leverage)
    10, // leverage
    50000000000n, // entry price
  );

  console.log('\nOriginal position note:');
  console.log('  marketId:', Buffer.from(positionNote.marketId).toString('hex').slice(0, 16) + '...');
  console.log('  isLong:', positionNote.isLong);
  console.log('  margin:', positionNote.margin.toString());
  console.log('  size:', positionNote.size.toString());
  console.log('  leverage:', positionNote.leverage);
  console.log('  entryPrice:', positionNote.entryPrice.toString());

  // Serialize position note
  const serializedPosition = serializePositionNote(positionNote);
  console.log('\nSerialized position note:');
  console.log('  length:', serializedPosition.length, 'bytes');
  console.log('  type byte:', serializedPosition[0].toString(16), `(expected 0x${NOTE_TYPE_POSITION.toString(16)})`);

  // Deserialize and verify
  const deserializedPosition = deserializePositionNote(serializedPosition);
  if (deserializedPosition) {
    console.log('  deserialize: SUCCESS');
    console.log('  margin match:', deserializedPosition.margin === positionNote.margin);
    console.log('  marketId match:', Buffer.from(deserializedPosition.marketId).equals(Buffer.from(positionNote.marketId)));
  } else {
    console.log('  deserialize: FAILED');
  }

  // Encrypt position note
  const encryptedPosition = encryptPositionNote(positionNote, stealthAddress.stealthPubkey);
  console.log('\nEncrypted position note:');
  console.log('  ciphertext length:', encryptedPosition.ciphertext.length);

  const serializedEncPosition = serializeEncryptedNote(encryptedPosition);
  console.log('  total serialized length:', serializedEncPosition.length, '(max 250)');

  // Decrypt with universal decryptor
  const decryptedPosition = tryDecryptAnyNote(encryptedPosition, stealthPrivateKey);
  if (decryptedPosition) {
    console.log('\nDecrypted with tryDecryptAnyNote:');
    console.log('  type:', decryptedPosition.type);
    if (decryptedPosition.type === 'position') {
      console.log('  margin:', decryptedPosition.note.margin.toString());
      console.log('  MATCH:', decryptedPosition.note.margin === positionNote.margin ? 'YES' : 'NO');
    }
  } else {
    console.log('\nDecryption with tryDecryptAnyNote FAILED!');
  }

  // Verify commitment
  const positionCommitment = computePositionCommitment(positionNote);
  console.log('\nPosition commitment:', Buffer.from(positionCommitment).toString('hex').slice(0, 32) + '...');

  // Test 3: LP Note
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: LP Note');
  console.log('='.repeat(60));

  const poolId = new Uint8Array(32);
  crypto.getRandomValues(poolId);

  const lpNote = createLpNote(
    stealthAddress.stealthPubkey.x,
    poolId,
    5000000n, // LP amount
  );

  console.log('\nOriginal LP note:');
  console.log('  poolId:', Buffer.from(lpNote.poolId).toString('hex').slice(0, 16) + '...');
  console.log('  lpAmount:', lpNote.lpAmount.toString());

  // Serialize LP note
  const serializedLp = serializeLpNote(lpNote);
  console.log('\nSerialized LP note:');
  console.log('  length:', serializedLp.length, 'bytes');
  console.log('  type byte:', serializedLp[0].toString(16), `(expected 0x${NOTE_TYPE_LP.toString(16)})`);

  // Deserialize and verify
  const deserializedLp = deserializeLpNote(serializedLp);
  if (deserializedLp) {
    console.log('  deserialize: SUCCESS');
    console.log('  lpAmount match:', deserializedLp.lpAmount === lpNote.lpAmount);
    console.log('  poolId match:', Buffer.from(deserializedLp.poolId).equals(Buffer.from(lpNote.poolId)));
  } else {
    console.log('  deserialize: FAILED');
  }

  // Encrypt LP note
  const encryptedLp = encryptLpNote(lpNote, stealthAddress.stealthPubkey);
  console.log('\nEncrypted LP note:');
  console.log('  ciphertext length:', encryptedLp.ciphertext.length);

  const serializedEncLp = serializeEncryptedNote(encryptedLp);
  console.log('  total serialized length:', serializedEncLp.length, '(max 250)');

  // Decrypt with universal decryptor
  const decryptedLp = tryDecryptAnyNote(encryptedLp, stealthPrivateKey);
  if (decryptedLp) {
    console.log('\nDecrypted with tryDecryptAnyNote:');
    console.log('  type:', decryptedLp.type);
    if (decryptedLp.type === 'lp') {
      console.log('  lpAmount:', decryptedLp.note.lpAmount.toString());
      console.log('  MATCH:', decryptedLp.note.lpAmount === lpNote.lpAmount ? 'YES' : 'NO');
    }
  } else {
    console.log('\nDecryption with tryDecryptAnyNote FAILED!');
  }

  // Verify commitment
  const lpCommitment = computeLpCommitment(lpNote);
  console.log('\nLP commitment:', Buffer.from(lpCommitment).toString('hex').slice(0, 32) + '...');

  // Test 4: Wrong key decryption (should fail gracefully)
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: Wrong Key Decryption');
  console.log('='.repeat(60));

  const wrongKey = generateRandomScalar();
  const wrongDecrypt = tryDecryptAnyNote(encryptedPosition, wrongKey);
  console.log('Decrypt with wrong key:', wrongDecrypt === null ? 'FAILED (expected)' : 'UNEXPECTED SUCCESS');

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log('Standard note: serialized', serializedStandard.length, 'bytes, decrypt:', decryptedStandard ? 'OK' : 'FAIL');
  console.log('Position note: serialized', serializedEncPosition.length, 'bytes, decrypt:', decryptedPosition ? 'OK' : 'FAIL');
  console.log('LP note: serialized', serializedEncLp.length, 'bytes, decrypt:', decryptedLp ? 'OK' : 'FAIL');
  console.log('Wrong key test:', wrongDecrypt === null ? 'OK' : 'FAIL');
}

main().catch(console.error);
