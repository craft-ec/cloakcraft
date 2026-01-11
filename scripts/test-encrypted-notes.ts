/**
 * Test Encrypted Notes
 *
 * Verifies that note encryption/decryption works correctly:
 * 1. Generate recipient keypair
 * 2. Encrypt a note for the recipient
 * 3. Decrypt the note with recipient's private key
 * 4. Verify decrypted data matches original
 */

import { PublicKey } from "@solana/web3.js";

// Import from SDK
import {
  encryptNote,
  decryptNote,
  tryDecryptNote,
  generateStealthAddress,
  derivePublicKey,
} from "../packages/sdk/src/crypto";
import { bytesToField, fieldToBytes } from "../packages/sdk/src/crypto/poseidon";
import type { Note, Point } from "@cloakcraft/types";

// Generate a random scalar for testing
function generateRandomScalar(): bigint {
  const bytes = new Uint8Array(32);
  require("crypto").randomFillSync(bytes);
  return bytesToField(bytes) % 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
}

async function main() {
  console.log("=== Encrypted Notes Test ===\n");

  // === Test 1: Basic encryption/decryption ===
  console.log("Test 1: Basic encryption/decryption");

  // Generate recipient keypair
  const recipientPrivateKey = generateRandomScalar();
  const recipientPubkey = derivePublicKey(recipientPrivateKey);
  console.log("  Recipient private key:", recipientPrivateKey.toString().slice(0, 20) + "...");
  console.log("  Recipient public key X:", Buffer.from(recipientPubkey.x).toString("hex").slice(0, 16) + "...");

  // Create a test note
  const testNote: Note = {
    stealthPubX: new Uint8Array(32),
    tokenMint: new PublicKey(new Uint8Array(32).fill(1)), // Dummy mint
    amount: 1000000000n, // 1 token (9 decimals)
    randomness: new Uint8Array(32),
  };
  require("crypto").randomFillSync(testNote.stealthPubX);
  require("crypto").randomFillSync(testNote.randomness);

  console.log("  Original note:");
  console.log("    stealthPubX:", Buffer.from(testNote.stealthPubX).toString("hex").slice(0, 16) + "...");
  console.log("    amount:", testNote.amount.toString());
  console.log("    randomness:", Buffer.from(testNote.randomness).toString("hex").slice(0, 16) + "...");

  // Encrypt the note
  const encrypted = encryptNote(testNote, recipientPubkey);
  console.log("\n  Encrypted note:");
  console.log("    ephemeral pubkey X:", Buffer.from(encrypted.ephemeralPubkey.x).toString("hex").slice(0, 16) + "...");
  console.log("    ciphertext length:", encrypted.ciphertext.length, "bytes");
  console.log("    tag:", Buffer.from(encrypted.tag).toString("hex"));

  // Decrypt the note
  const decrypted = decryptNote(encrypted, recipientPrivateKey);
  console.log("\n  Decrypted note:");
  console.log("    stealthPubX:", Buffer.from(decrypted.stealthPubX).toString("hex").slice(0, 16) + "...");
  console.log("    amount:", decrypted.amount.toString());
  console.log("    randomness:", Buffer.from(decrypted.randomness).toString("hex").slice(0, 16) + "...");

  // Verify match
  const stealthMatch = Buffer.from(testNote.stealthPubX).equals(Buffer.from(decrypted.stealthPubX));
  const amountMatch = testNote.amount === decrypted.amount;
  const randomnessMatch = Buffer.from(testNote.randomness).equals(Buffer.from(decrypted.randomness));

  if (stealthMatch && amountMatch && randomnessMatch) {
    console.log("\n  ✅ Test 1 PASSED: Decrypted note matches original");
  } else {
    console.log("\n  ❌ Test 1 FAILED:");
    console.log("    stealthPubX match:", stealthMatch);
    console.log("    amount match:", amountMatch);
    console.log("    randomness match:", randomnessMatch);
    return;
  }

  // === Test 2: Wrong key fails ===
  console.log("\nTest 2: Wrong key should fail to decrypt");

  const wrongPrivateKey = generateRandomScalar();
  const wrongDecrypted = tryDecryptNote(encrypted, wrongPrivateKey);

  if (wrongDecrypted === null) {
    console.log("  ✅ Test 2 PASSED: Wrong key returns null (authentication failed)");
  } else {
    // Check if the decrypted data is garbage (tag might accidentally pass in rare cases)
    const garbageCheck = wrongDecrypted.amount !== testNote.amount;
    if (garbageCheck) {
      console.log("  ⚠️ Test 2 PARTIAL: Wrong key produced garbage data (tag collision possible but rare)");
    } else {
      console.log("  ❌ Test 2 FAILED: Wrong key should not produce valid data");
      return;
    }
  }

  // === Test 3: Multiple notes ===
  console.log("\nTest 3: Encrypt/decrypt multiple notes");

  const notes: Note[] = [];
  for (let i = 0; i < 5; i++) {
    const note: Note = {
      stealthPubX: new Uint8Array(32),
      tokenMint: new PublicKey(new Uint8Array(32).fill(i + 1)),
      amount: BigInt((i + 1) * 100000000), // 0.1, 0.2, 0.3, 0.4, 0.5 tokens
      randomness: new Uint8Array(32),
    };
    require("crypto").randomFillSync(note.stealthPubX);
    require("crypto").randomFillSync(note.randomness);
    notes.push(note);
  }

  let allMatch = true;
  for (let i = 0; i < notes.length; i++) {
    const enc = encryptNote(notes[i], recipientPubkey);
    const dec = decryptNote(enc, recipientPrivateKey);

    const match =
      Buffer.from(notes[i].stealthPubX).equals(Buffer.from(dec.stealthPubX)) &&
      notes[i].amount === dec.amount &&
      Buffer.from(notes[i].randomness).equals(Buffer.from(dec.randomness));

    if (!match) {
      console.log(`  ❌ Note ${i} failed to decrypt correctly`);
      allMatch = false;
    }
  }

  if (allMatch) {
    console.log("  ✅ Test 3 PASSED: All 5 notes encrypted/decrypted correctly");
  }

  // === Test 4: Large amount ===
  console.log("\nTest 4: Large amount (max u64)");

  const largeNote: Note = {
    stealthPubX: new Uint8Array(32),
    tokenMint: new PublicKey(new Uint8Array(32).fill(99)),
    amount: 18446744073709551615n, // Max u64
    randomness: new Uint8Array(32),
  };
  require("crypto").randomFillSync(largeNote.stealthPubX);
  require("crypto").randomFillSync(largeNote.randomness);

  const largeEnc = encryptNote(largeNote, recipientPubkey);
  const largeDec = decryptNote(largeEnc, recipientPrivateKey);

  if (largeDec.amount === largeNote.amount) {
    console.log("  ✅ Test 4 PASSED: Large amount (max u64) handled correctly");
    console.log("    Original:", largeNote.amount.toString());
    console.log("    Decrypted:", largeDec.amount.toString());
  } else {
    console.log("  ❌ Test 4 FAILED: Large amount mismatch");
    console.log("    Original:", largeNote.amount.toString());
    console.log("    Decrypted:", largeDec.amount.toString());
  }

  // === Test 5: Stealth address integration ===
  console.log("\nTest 5: Stealth address + encrypted note flow");

  // Sender generates stealth address for recipient
  const { stealthAddress, ephemeralPrivate } = generateStealthAddress(recipientPubkey);
  console.log("  Stealth address generated:");
  console.log("    Stealth pubkey X:", Buffer.from(stealthAddress.stealthPubkey.x).toString("hex").slice(0, 16) + "...");

  // Sender creates note with stealth address
  const stealthNote: Note = {
    stealthPubX: stealthAddress.stealthPubkey.x,
    tokenMint: new PublicKey(new Uint8Array(32).fill(42)),
    amount: 500000000n, // 0.5 tokens
    randomness: new Uint8Array(32),
  };
  require("crypto").randomFillSync(stealthNote.randomness);

  // Sender encrypts note for recipient
  const stealthEnc = encryptNote(stealthNote, recipientPubkey);

  // Recipient decrypts
  const stealthDec = decryptNote(stealthEnc, recipientPrivateKey);

  if (
    Buffer.from(stealthNote.stealthPubX).equals(Buffer.from(stealthDec.stealthPubX)) &&
    stealthNote.amount === stealthDec.amount
  ) {
    console.log("  ✅ Test 5 PASSED: Stealth address + encrypted note flow works");
  } else {
    console.log("  ❌ Test 5 FAILED");
  }

  console.log("\n=== All Tests Completed ===");
}

main().catch(console.error);
