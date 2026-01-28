/**
 * Debug script to check if field values are within BN254 Fr modulus
 */

import { PublicKey } from '@solana/web3.js';

// BN254 scalar field modulus (Fr)
const BN254_FR_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// Modulus bytes in big-endian
const BN254_FIELD_MODULUS = new Uint8Array([
  0x30, 0x64, 0x4e, 0x72, 0xe1, 0x31, 0xa0, 0x29,
  0xb8, 0x50, 0x45, 0xb6, 0x81, 0x81, 0x58, 0x5d,
  0x28, 0x33, 0xe8, 0x48, 0x79, 0xb9, 0x70, 0x91,
  0x43, 0xe1, 0xf5, 0x93, 0xf0, 0x00, 0x00, 0x01,
]);

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

function bigIntToBytes(value: bigint): Uint8Array {
  const bytes = new Uint8Array(32);
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}

function geModulus(value: Uint8Array): boolean {
  for (let i = 0; i < 32; i++) {
    if (value[i] > BN254_FIELD_MODULUS[i]) {
      return true;
    } else if (value[i] < BN254_FIELD_MODULUS[i]) {
      return false;
    }
  }
  return true; // equal
}

function subtractModulus(value: Uint8Array): Uint8Array {
  const result = new Uint8Array(32);
  let borrow = 0;

  // Big-endian subtraction
  for (let i = 31; i >= 0; i--) {
    const diff = value[i] - BN254_FIELD_MODULUS[i] - borrow;
    if (diff < 0) {
      result[i] = diff + 256;
      borrow = 1;
    } else {
      result[i] = diff;
      borrow = 0;
    }
  }

  return result;
}

function pubkeyToField(pubkey: PublicKey): Uint8Array {
  const pubkeyBytes = pubkey.toBytes();
  const result = new Uint8Array(32);
  result.set(pubkeyBytes);

  for (let i = 0; i < 4; i++) {
    if (geModulus(result)) {
      const reduced = subtractModulus(result);
      result.set(reduced);
    } else {
      break;
    }
  }

  return result;
}

function isLessThanFieldSize(bytes: Uint8Array): boolean {
  const value = bytesToBigInt(bytes);
  return value < BN254_FR_MODULUS;
}

// Test with some example pubkeys
async function main() {
  console.log('=== BN254 Field Size Validation Test ===\n');
  
  // Verify modulus bytes match
  const modulusBigInt = bytesToBigInt(BN254_FIELD_MODULUS);
  console.log('Modulus from bytes:', modulusBigInt.toString());
  console.log('Expected Fr:', BN254_FR_MODULUS.toString());
  console.log('Match:', modulusBigInt === BN254_FR_MODULUS);
  console.log('');

  // Test some pubkeys
  const testPubkeys = [
    new PublicKey('11111111111111111111111111111111'),
    new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    new PublicKey('2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG'), // Program ID
    PublicKey.default,
  ];

  for (const pubkey of testPubkeys) {
    console.log(`\nPubkey: ${pubkey.toBase58()}`);
    const bytes = pubkey.toBytes();
    const bytesHex = Buffer.from(bytes).toString('hex');
    console.log(`  Raw bytes: 0x${bytesHex}`);
    
    const asBigInt = bytesToBigInt(bytes);
    console.log(`  As BigInt: ${asBigInt}`);
    console.log(`  >= modulus? ${asBigInt >= BN254_FR_MODULUS}`);
    
    const reduced = pubkeyToField(pubkey);
    const reducedHex = Buffer.from(reduced).toString('hex');
    console.log(`  After reduction: 0x${reducedHex}`);
    
    const reducedBigInt = bytesToBigInt(reduced);
    console.log(`  Reduced BigInt: ${reducedBigInt}`);
    console.log(`  Is < modulus? ${reducedBigInt < BN254_FR_MODULUS}`);
    
    // Verify using same check as groth16-solana
    console.log(`  isLessThanFieldSize? ${isLessThanFieldSize(reduced)}`);
  }

  // Test edge cases
  console.log('\n=== Edge Cases ===');
  
  // Maximum value (all 0xff)
  const maxValue = new Uint8Array(32).fill(0xff);
  console.log('\nMax value (0xff...ff):');
  console.log(`  >= modulus? ${bytesToBigInt(maxValue) >= BN254_FR_MODULUS}`);
  
  // Value equal to modulus
  console.log('\nValue equal to modulus:');
  console.log(`  geModulus? ${geModulus(BN254_FIELD_MODULUS)}`);
  
  // Value one less than modulus
  const almostModulus = bigIntToBytes(BN254_FR_MODULUS - 1n);
  console.log('\nValue = modulus - 1:');
  console.log(`  geModulus? ${geModulus(almostModulus)}`);
  console.log(`  isLessThanFieldSize? ${isLessThanFieldSize(almostModulus)}`);
  
  console.log('\n=== Test Complete ===');
}

main().catch(console.error);
