/**
 * Debug scanner - understand why notes aren't being found
 *
 * Uses SDK's retry logic with exponential backoff for rate limits.
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PublicKey } from '@solana/web3.js';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
if (!HELIUS_API_KEY) {
  console.error('ERROR: HELIUS_API_KEY environment variable not set');
  console.error('Usage: HELIUS_API_KEY=xxx pnpm tsx scripts/debug-scanner.ts');
  process.exit(1);
}
const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');

// Import SDK internals
import { bytesToField } from '../packages/sdk/src/crypto/poseidon';
import { tryDecryptNote } from '../packages/sdk/src/crypto/encryption';
import { LightCommitmentClient, sleep } from '../packages/sdk/src/light';

/**
 * Fetch with retry logic for rate limits (429 errors)
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      if (attempt >= maxRetries) {
        throw new Error(`Rate limit exceeded after ${maxRetries + 1} attempts`);
      }
      const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      console.log(`[Retry] Rate limited (429), attempt ${attempt + 1}/${maxRetries + 1}. Waiting ${Math.round(delay)}ms...`);
      await sleep(delay);
      continue;
    }

    return response;
  }
  throw new Error('Unexpected retry loop exit');
}

async function main() {
  console.log('Debug Scanner\n');
  console.log('Using retry logic with exponential backoff for rate limits.\n');

  // Load wallet - use same file as e2e-amm-swap-test
  const walletPath = path.join(__dirname, '.test-privacy-wallet.json');
  if (!fs.existsSync(walletPath)) {
    console.log('No wallet found. Run e2e-amm-swap-test first.');
    return;
  }
  const savedKey = Buffer.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')).spendingKey, 'hex');
  const viewingKey = bytesToField(new Uint8Array(savedKey));
  console.log(`Viewing key: ${viewingKey.toString(16).slice(0, 16)}...`);

  // Query accounts directly with retry
  console.log('\nQuerying compressed accounts...');
  const response = await fetchWithRetry(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getCompressedAccountsByOwner',
      params: { owner: PROGRAM_ID.toBase58() },
    }),
  });

  // Parse JSON with BigInt support for discriminators
  const text = await response.text();
  // Replace large numbers with BigInt in the parsed JSON
  const result = JSON.parse(text, (key, value) => {
    if (key === 'discriminator' && typeof value === 'number') {
      // Re-parse from raw text to get exact value
      return value;
    }
    return value;
  }) as any;
  const items = result.result?.value?.items || [];
  console.log(`Found ${items.length} total accounts`);

  // Check discriminators - use approximate comparison due to JS precision
  const discriminators = new Set(items.map((a: any) => a.data?.discriminator));
  console.log(`Unique discriminators: ${[...discriminators].join(', ')}`);

  // Filter by commitment discriminator (use approximate match)
  // 15491678376909512437 becomes ~15491678376909513000 in JS
  const COMMITMENT_DISCRIMINATOR_APPROX = 15491678376909513000;
  const allCommitmentAccounts = items.filter((a: any) => {
    const disc = a.data?.discriminator;
    // Check if it's approximately the commitment discriminator
    return disc && Math.abs(disc - COMMITMENT_DISCRIMINATOR_APPROX) < 1000;
  });
  console.log(`Found ${allCommitmentAccounts.length} total commitment accounts`);

  // Filter for accounts with full encrypted notes (data > 200 bytes)
  const commitmentAccounts = allCommitmentAccounts.filter((a: any) => {
    const dataLen = Buffer.from(a.data?.data || '', 'base64').length;
    return dataLen > 200;
  });
  console.log(`Found ${commitmentAccounts.length} with full encrypted notes`);

  // Try to parse and decrypt each
  let decrypted = 0;
  let parseErrors = 0;
  let decryptErrors = 0;

  // Filter for Token A pool (used by e2e-amm-swap-test)
  const TOKEN_A_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');
  const [testPoolPda] = PublicKey.findProgramAddressSync([Buffer.from('pool'), TOKEN_A_MINT.toBuffer()], PROGRAM_ID);
  const testPool = testPoolPda.toBase58();
  const poolAccounts = commitmentAccounts.filter((a: any) => {
    const data = Buffer.from(a.data?.data || '', 'base64');
    if (data.length < 32) return false;
    const poolKey = new PublicKey(data.slice(0, 32)).toBase58();
    return poolKey === testPool;
  });
  console.log(`Found ${poolAccounts.length} accounts for test pool ${testPool}`);

  // Sort by slot (newest first)
  poolAccounts.sort((a: any, b: any) => (b.slotCreated || 0) - (a.slotCreated || 0));

  for (const account of poolAccounts.slice(0, 5)) {
    console.log(`\n--- Account ${account.address} ---`);

    try {
      const dataBase64 = account.data.data;
      const data = Buffer.from(dataBase64, 'base64');
      console.log(`Data length: ${data.length} bytes`);
      console.log(`First 16 bytes: ${data.slice(0, 16).toString('hex')}`);

      // Parse commitment account structure
      // pool (32) + commitment (32) + leaf_index (8) + encrypted_note_len (4) + encrypted_note (variable) + created_at (8)
      const pool = data.slice(0, 32);
      const commitment = data.slice(32, 64);
      const leafIndex = data.readBigUInt64LE(64);
      const encryptedNoteLen = data.readUInt32LE(72);
      const encryptedNoteData = data.slice(76, 76 + encryptedNoteLen);
      // created_at is at data.slice(76 + encryptedNoteLen, 76 + encryptedNoteLen + 8)

      console.log(`Pool: ${new PublicKey(pool).toBase58()}`);
      console.log(`Commitment: ${commitment.toString('hex').slice(0, 16)}...`);
      console.log(`Leaf index: ${leafIndex}`);
      console.log(`Encrypted note length: ${encryptedNoteData.length}`);

      // Parse encrypted note format:
      // ephemeral_pubkey_x: 32 bytes
      // ephemeral_pubkey_y: 32 bytes
      // ciphertext_len: 4 bytes (u32 LE)
      // ciphertext: variable (includes 12-byte nonce)
      // tag: 16 bytes
      if (encryptedNoteData.length < 32 + 32 + 4 + 16) {
        console.log(`ERROR: Encrypted note too short (${encryptedNoteData.length} < 84)`);
        parseErrors++;
        continue;
      }

      const ephemeralPubkey = {
        x: new Uint8Array(encryptedNoteData.slice(0, 32)),
        y: new Uint8Array(encryptedNoteData.slice(32, 64)),
      };
      // Read ciphertext length correctly from the slice
      const lenView = new DataView(new Uint8Array(encryptedNoteData.slice(64, 68)).buffer);
      const ciphertextLen = lenView.getUint32(0, true);
      const ciphertext = new Uint8Array(encryptedNoteData.slice(68, 68 + ciphertextLen));
      const tag = new Uint8Array(encryptedNoteData.slice(68 + ciphertextLen, 68 + ciphertextLen + 16));

      console.log(`Ephemeral X: ${Buffer.from(ephemeralPubkey.x).toString('hex').slice(0, 16)}...`);
      console.log(`Ciphertext length: ${ciphertext.length} (header said ${ciphertextLen})`);
      console.log(`Tag length: ${tag.length}`);

      // Try decryption
      const encryptedNote = { ephemeralPubkey, ciphertext, tag };
      const note = tryDecryptNote(encryptedNote, viewingKey);

      if (note) {
        console.log(`SUCCESS: Decrypted note - amount: ${note.amount}`);
        decrypted++;
      } else {
        console.log(`FAILED: Could not decrypt (wrong key or corrupted)`);
        decryptErrors++;
      }
    } catch (err: any) {
      console.log(`ERROR: ${err.message}`);
      parseErrors++;
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Commitment accounts: ${commitmentAccounts.length}`);
  console.log(`Successfully decrypted: ${decrypted}`);
  console.log(`Parse errors: ${parseErrors}`);
  console.log(`Decrypt errors: ${decryptErrors}`);
}

main().catch(console.error);
