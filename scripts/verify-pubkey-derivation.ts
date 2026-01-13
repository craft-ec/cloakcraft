/**
 * Verify that wallet publicKey derivation is correct
 */

import { initPoseidon, bytesToField } from '../packages/sdk/src/crypto/poseidon';
import { derivePublicKey } from '../packages/sdk/src/crypto/babyjubjub';
import { createWallet } from '../packages/sdk/src/wallet';

async function main() {
  console.log('\n=== VERIFY PUBLIC KEY DERIVATION ===\n');

  // Initialize Poseidon
  await initPoseidon();

  // Create a wallet
  const wallet = createWallet();

  const sk = bytesToField(wallet.keypair.spending.sk);
  const storedPubkey = wallet.publicKey;
  const derivedPubkey = derivePublicKey(sk);

  console.log('Spending key:', sk.toString(16).slice(0, 32) + '...');
  console.log('\nStored publicKey:');
  console.log('  X:', Buffer.from(storedPubkey.x).toString('hex').slice(0, 32) + '...');
  console.log('  Y:', Buffer.from(storedPubkey.y).toString('hex').slice(0, 32) + '...');

  console.log('\nDerived publicKey (from sk * G):');
  console.log('  X:', Buffer.from(derivedPubkey.x).toString('hex').slice(0, 32) + '...');
  console.log('  Y:', Buffer.from(derivedPubkey.y).toString('hex').slice(0, 32) + '...');

  const xMatch = Buffer.from(storedPubkey.x).toString('hex') === Buffer.from(derivedPubkey.x).toString('hex');
  const yMatch = Buffer.from(storedPubkey.y).toString('hex') === Buffer.from(derivedPubkey.y).toString('hex');

  console.log('\nVerification:');
  console.log('  X matches:', xMatch ? '✓' : '✗');
  console.log('  Y matches:', yMatch ? '✓' : '✗');

  if (xMatch && yMatch) {
    console.log('\n✓ PUBLIC KEY DERIVATION IS CORRECT');
  } else {
    console.log('\n✗ PUBLIC KEY DERIVATION IS BROKEN!');
    process.exit(1);
  }
}

main().catch(console.error);
