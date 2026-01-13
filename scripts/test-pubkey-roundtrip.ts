/**
 * Test PublicKey serialization roundtrip
 */

import { PublicKey } from '@solana/web3.js';

const TOKEN_A_MINT = new PublicKey('28hZpf8DEpP9UrF2D9dHMJQE9kxAJ2fWZmWKVpF7pump');

console.log('Original PublicKey:', TOKEN_A_MINT.toBase58());
console.log('Original bytes:', Buffer.from(TOKEN_A_MINT.toBytes()).toString('hex'));

// Simulate what happens during encryption/decryption
const serialized = TOKEN_A_MINT.toBytes();
const deserialized = new PublicKey(serialized);

console.log('\nDeserialized PublicKey:', deserialized.toBase58());
console.log('Deserialized bytes:', Buffer.from(deserialized.toBytes()).toString('hex'));

const match = Buffer.from(TOKEN_A_MINT.toBytes()).toString('hex') === Buffer.from(deserialized.toBytes()).toString('hex');
console.log('\nBytes match:', match ? '✓' : '✗');

// Also check base58 encoding
const base58Match = TOKEN_A_MINT.toBase58() === deserialized.toBase58();
console.log('Base58 match:', base58Match ? '✓' : '✗');
