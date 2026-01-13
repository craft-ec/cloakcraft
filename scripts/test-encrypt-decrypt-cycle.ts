/**
 * Test encrypt/decrypt cycle to find commitment mismatch
 */

import { PublicKey } from '@solana/web3.js';
import { initPoseidon, bytesToField } from '../packages/sdk/src/crypto/poseidon';
import { computeCommitment, generateRandomness } from '../packages/sdk/src/crypto/commitment';
import { encryptNote, decryptNote } from '../packages/sdk/src/crypto/encryption';
import { derivePublicKey } from '../packages/sdk/src/crypto/babyjubjub';
import { generateStealthAddress, deriveStealthPrivateKey } from '../packages/sdk/src/crypto/stealth';

interface Note {
  stealthPubX: Uint8Array;
  tokenMint: PublicKey;
  amount: bigint;
  randomness: Uint8Array;
}

const TOKEN_MINT = new PublicKey('28hZpf8DEpP9UrF2D9dHMJQE9kxAJ2fWZmWKVpF7pump');

async function main() {
  console.log('\n=== ENCRYPT/DECRYPT CYCLE TEST ===\n');

  await initPoseidon();

  // Create a wallet
  const spendingKey = 123456789n;
  const walletPubkey = derivePublicKey(spendingKey);

  // Generate stealth address
  const { stealthAddress, ephemeralPrivate } = generateStealthAddress(walletPubkey);

  console.log('1. Creating note...');
  const note: Note = {
    stealthPubX: stealthAddress.stealthPubkey.x,
    tokenMint: TOKEN_MINT,
    amount: 500n,
    randomness: generateRandomness(),
  };

  console.log('   stealthPubX:', Buffer.from(note.stealthPubX).toString('hex').slice(0, 16) + '...');
  console.log('   tokenMint:', note.tokenMint.toBase58());
  console.log('   amount:', note.amount.toString());
  console.log('   randomness:', Buffer.from(note.randomness).toString('hex').slice(0, 16) + '...');

  // Compute original commitment
  const originalCommitment = computeCommitment(note);
  console.log('\n2. Original commitment:', Buffer.from(originalCommitment).toString('hex').slice(0, 16) + '...');

  // Encrypt note
  console.log('\n3. Encrypting note to stealthPubkey...');
  const encrypted = encryptNote(note, stealthAddress.stealthPubkey);
  console.log('   Encryption ephemeral X:', Buffer.from(encrypted.ephemeralPubkey.x).toString('hex').slice(0, 16) + '...');

  // Decrypt note (simulating scanner)
  console.log('\n4. Decrypting note...');

  // Derive stealth private key (what scanner does)
  const stealthPrivKey = deriveStealthPrivateKey(spendingKey, stealthAddress.ephemeralPubkey);
  console.log('   Stealth private key:', stealthPrivKey.toString(16).slice(0, 16) + '...');

  const decrypted = decryptNote(encrypted, stealthPrivKey);
  console.log('   Decrypted successfully!');
  console.log('   stealthPubX:', Buffer.from(decrypted.stealthPubX).toString('hex').slice(0, 16) + '...');
  console.log('   tokenMint:', decrypted.tokenMint.toBase58());
  console.log('   amount:', decrypted.amount.toString());
  console.log('   randomness:', Buffer.from(decrypted.randomness).toString('hex').slice(0, 16) + '...');

  // Recompute commitment
  console.log('\n5. Recomputing commitment from decrypted note...');
  const recomputedCommitment = computeCommitment(decrypted);
  console.log('   Recomputed:', Buffer.from(recomputedCommitment).toString('hex').slice(0, 16) + '...');

  // Compare
  const match = Buffer.from(originalCommitment).toString('hex') === Buffer.from(recomputedCommitment).toString('hex');
  console.log('\n6. RESULT:', match ? '✓ PASS' : '✗ FAIL');

  if (!match) {
    console.log('\n=== MISMATCH DETAILS ===');
    console.log('Original:  ', Buffer.from(originalCommitment).toString('hex'));
    console.log('Recomputed:', Buffer.from(recomputedCommitment).toString('hex'));

    console.log('\n=== FIELD COMPARISON ===');
    console.log('stealthPubX match:', Buffer.from(note.stealthPubX).toString('hex') === Buffer.from(decrypted.stealthPubX).toString('hex'));
    console.log('tokenMint match:', note.tokenMint.toBase58() === decrypted.tokenMint.toBase58());
    console.log('amount match:', note.amount === decrypted.amount);
    console.log('randomness match:', Buffer.from(note.randomness).toString('hex') === Buffer.from(decrypted.randomness).toString('hex'));
  }
}

main().catch(console.error);
