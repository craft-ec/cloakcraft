/**
 * End-to-end test with PROPER stealth flow (matches frontend exactly)
 *
 * This tests the REAL flow:
 * 1. Shield: Generate stealth address with ephemeral keypair
 * 2. Unshield: Derive stealthSpendingKey from base key + ephemeral
 * 3. Compute nullifier from stealthSpendingKey
 */
// @ts-nocheck
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// SDK imports - exact same as frontend
import { initPoseidon, bytesToField, fieldToBytes, DOMAIN_COMMITMENT, poseidonHashDomain } from '../packages/sdk/src/crypto/poseidon';
import { computeCommitment, generateRandomness } from '../packages/sdk/src/crypto/commitment';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';
import { generateStealthAddress, deriveStealthPrivateKey } from '../packages/sdk/src/crypto/stealth';
import { derivePublicKey } from '../packages/sdk/src/crypto/babyjubjub';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const TOKEN_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');

const FQ_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function main() {
  console.log('='.repeat(80));
  console.log('E2E TEST: FULL STEALTH FLOW (MATCHES FRONTEND)');
  console.log('='.repeat(80));

  // Initialize SDK's Poseidon
  await initPoseidon();

  // Setup connection and wallet
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const walletPath = path.join(os.homedir(), '.config', 'solana', 'id.json');
  const wallet = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync(walletPath, 'utf-8'))));
  console.log('\nWallet:', wallet.publicKey.toBase58());

  // Load IDL and create program
  const idlPath = path.join(__dirname, '..', 'target', 'idl', 'cloakcraft.json');
  const idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(wallet), { commitment: 'confirmed' });
  anchor.setProvider(provider);
  const program = new anchor.Program(idl, provider);

  // Derive PDAs
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), TOKEN_MINT.toBuffer()],
    PROGRAM_ID
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), TOKEN_MINT.toBuffer()],
    PROGRAM_ID
  );
  const [counterPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('commitment_counter'), poolPda.toBuffer()],
    PROGRAM_ID
  );
  const circuitIdBuf = Buffer.alloc(32);
  circuitIdBuf.write('transfer_1x2');
  const [vkPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vk'), circuitIdBuf],
    PROGRAM_ID
  );

  const userTokenAccount = getAssociatedTokenAddressSync(TOKEN_MINT, wallet.publicKey);
  const SHIELD_AMOUNT = 1_000_000n;

  // ============================================================
  // STEP 1: Generate user's base keypair (like wallet creation)
  // ============================================================
  console.log('\n=== STEP 1: Create base keypair ===\n');

  // User's base spending key (would come from wallet)
  const baseSpendingKeyBytes = generateRandomness();
  const baseSpendingKey = bytesToField(baseSpendingKeyBytes);
  console.log('Base spending key:', baseSpendingKey.toString(16).slice(0, 32) + '...');

  // Derive base public key
  const basePubkey = derivePublicKey(baseSpendingKey);
  console.log('Base pubkey X:', toHex(basePubkey.x).slice(0, 32) + '...');
  console.log('Base pubkey Y:', toHex(basePubkey.y).slice(0, 32) + '...');

  // ============================================================
  // STEP 2: Generate stealth address (sender side - like shield)
  // ============================================================
  console.log('\n=== STEP 2: Generate stealth address (shield) ===\n');

  // Generate stealth address for the recipient (self-shield in this test)
  const { stealthAddress, ephemeralPrivate } = generateStealthAddress(basePubkey);

  console.log('Ephemeral private:', ephemeralPrivate.toString(16).slice(0, 32) + '...');
  console.log('Ephemeral pubkey X:', toHex(stealthAddress.ephemeralPubkey.x).slice(0, 32) + '...');
  console.log('Stealth pubkey X:', toHex(stealthAddress.stealthPubkey.x).slice(0, 32) + '...');

  // ============================================================
  // STEP 3: Derive stealth spending key (recipient side - like unshield)
  // ============================================================
  console.log('\n=== STEP 3: Derive stealth spending key ===\n');

  // This is what the frontend does when it has stealthEphemeralPubkey
  const stealthSpendingKey = deriveStealthPrivateKey(baseSpendingKey, stealthAddress.ephemeralPubkey);
  console.log('Stealth spending key:', stealthSpendingKey.toString(16).slice(0, 32) + '...');

  // Verify: derived stealth pubkey should match what was generated
  const derivedStealthPubkey = derivePublicKey(stealthSpendingKey);
  console.log('Derived stealth pubkey X:', toHex(derivedStealthPubkey.x).slice(0, 32) + '...');
  console.log('Expected stealth pubkey X:', toHex(stealthAddress.stealthPubkey.x).slice(0, 32) + '...');

  const stealthMatch = toHex(derivedStealthPubkey.x) === toHex(stealthAddress.stealthPubkey.x);
  console.log('Stealth pubkey match:', stealthMatch ? '✓' : '✗ MISMATCH!');

  if (!stealthMatch) {
    console.error('\n!!! STEALTH KEY DERIVATION MISMATCH - THIS IS THE BUG !!!');
    return;
  }

  // ============================================================
  // STEP 4: Compute commitment (using stealth pubkey)
  // ============================================================
  console.log('\n=== STEP 4: Compute commitment ===\n');

  const randomness = generateRandomness();
  const note = {
    stealthPubX: stealthAddress.stealthPubkey.x, // Use stealth pubkey, not base!
    tokenMint: TOKEN_MINT,
    amount: SHIELD_AMOUNT,
    randomness: randomness,
  };
  const commitment = computeCommitment(note);
  console.log('Commitment:', toHex(commitment));

  // ============================================================
  // STEP 5: Shield tokens on-chain
  // ============================================================
  console.log('\n=== STEP 5: Shield tokens ===\n');

  const counterAccount = await connection.getAccountInfo(counterPda);
  const leafIndex = counterAccount ? Number(counterAccount.data.readBigUInt64LE(40)) : 0;
  console.log('Leaf index:', leafIndex);

  // Encode ephemeral pubkey (64 bytes: X || Y)
  const stealthEphemeralPubkey = new Uint8Array(64);
  stealthEphemeralPubkey.set(stealthAddress.ephemeralPubkey.x, 0);
  stealthEphemeralPubkey.set(stealthAddress.ephemeralPubkey.y, 32);

  try {
    const shieldTx = await program.methods
      .shield(
        Array.from(commitment),
        new anchor.BN(SHIELD_AMOUNT.toString()),
        Array.from(stealthEphemeralPubkey), // REAL ephemeral pubkey!
        Buffer.from([]),
        null
      )
      .accounts({
        pool: poolPda,
        commitmentCounter: counterPda,
        tokenVault: vaultPda,
        userTokenAccount: userTokenAccount,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    console.log('Shield SUCCESS:', shieldTx);
    await new Promise(r => setTimeout(r, 2000));
  } catch (e: any) {
    console.log('Shield ERROR:', e.message);
    if (e.logs) e.logs.forEach((l: string) => console.log(' ', l));
    return;
  }

  // ============================================================
  // STEP 6: Compute nullifier using STEALTH spending key
  // ============================================================
  console.log('\n=== STEP 6: Compute nullifier (stealth key) ===\n');

  // This is the key part - use stealth spending key, not base!
  const stealthSpendingKeyBytes = fieldToBytes(stealthSpendingKey);
  const nullifierKey = deriveNullifierKey(stealthSpendingKeyBytes);
  const nullifier = deriveSpendingNullifier(nullifierKey, commitment, leafIndex);

  console.log('Stealth spending key bytes:', toHex(stealthSpendingKeyBytes).slice(0, 32) + '...');
  console.log('Nullifier key:', toHex(nullifierKey).slice(0, 32) + '...');
  console.log('Nullifier:', toHex(nullifier));

  // ============================================================
  // STEP 7: Generate proof
  // ============================================================
  console.log('\n=== STEP 7: Generate ZK proof ===\n');

  const out1Randomness = generateRandomness();
  const out2Randomness = generateRandomness();

  const outCommitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    new Uint8Array(32),
    TOKEN_MINT.toBytes(),
    fieldToBytes(0n),
    out1Randomness
  );
  const outCommitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    new Uint8Array(32),
    TOKEN_MINT.toBytes(),
    fieldToBytes(0n),
    out2Randomness
  );

  const merkleRoot = commitment;

  const fieldToHex = (bytes: Uint8Array): string => '0x' + Buffer.from(bytes).toString('hex');

  const witnessInputs = {
    merkle_root: fieldToHex(merkleRoot),
    nullifier: fieldToHex(nullifier),
    out_commitment_1: fieldToHex(outCommitment1),
    out_commitment_2: fieldToHex(outCommitment2),
    token_mint: fieldToHex(TOKEN_MINT.toBytes()),
    unshield_amount: SHIELD_AMOUNT.toString(),
    // Use STEALTH pubkey X (from commitment) and STEALTH spending key
    in_stealth_pub_x: fieldToHex(stealthAddress.stealthPubkey.x),
    in_amount: SHIELD_AMOUNT.toString(),
    in_randomness: fieldToHex(randomness),
    in_stealth_spending_key: fieldToHex(stealthSpendingKeyBytes), // STEALTH key!
    merkle_path: Array(32).fill(fieldToHex(new Uint8Array(32))),
    merkle_path_indices: Array(32).fill('0'),
    leaf_index: leafIndex.toString(),
    out_stealth_pub_x_1: fieldToHex(new Uint8Array(32)),
    out_amount_1: '0',
    out_randomness_1: fieldToHex(out1Randomness),
    out_stealth_pub_x_2: fieldToHex(new Uint8Array(32)),
    out_amount_2: '0',
    out_randomness_2: fieldToHex(out2Randomness),
  };

  console.log('Generating proof...');
  const wasmPath = path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom', 'transfer_1x2.wasm');
  const zkeyPath = path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom', 'transfer_1x2_final.zkey');

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(witnessInputs, wasmPath, zkeyPath);
  console.log('Proof generated!');

  // Format proof for Solana
  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : FQ_MODULUS - ay;

  const bx0 = BigInt(proof.pi_b[0][0]);
  const bx1 = BigInt(proof.pi_b[0][1]);
  const by0 = BigInt(proof.pi_b[1][0]);
  const by1 = BigInt(proof.pi_b[1][1]);

  const cx = BigInt(proof.pi_c[0]);
  const cy = BigInt(proof.pi_c[1]);

  const fullProof = new Uint8Array(256);
  fullProof.set(bigIntToBytes(ax, 32), 0);
  fullProof.set(bigIntToBytes(negAy, 32), 32);
  fullProof.set(bigIntToBytes(bx1, 32), 64);
  fullProof.set(bigIntToBytes(bx0, 32), 96);
  fullProof.set(bigIntToBytes(by1, 32), 128);
  fullProof.set(bigIntToBytes(by0, 32), 160);
  fullProof.set(bigIntToBytes(cx, 32), 192);
  fullProof.set(bigIntToBytes(cy, 32), 224);

  // ============================================================
  // STEP 8: Submit unshield transaction
  // ============================================================
  console.log('\n=== STEP 8: Submit unshield ===\n');

  try {
    const tx = await program.methods
      .transact(
        Buffer.from(fullProof),
        Array.from(merkleRoot),
        Array.from(nullifier),
        [Array.from(outCommitment1), Array.from(outCommitment2)],
        [],
        new anchor.BN(SHIELD_AMOUNT.toString()),
        null
      )
      .accounts({
        pool: poolPda,
        commitmentCounter: counterPda,
        tokenVault: vaultPda,
        verificationKey: vkPda,
        unshieldRecipient: userTokenAccount,
        relayer: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    console.log('='.repeat(80));
    console.log('SUCCESS! FULL STEALTH FLOW WORKS!');
    console.log('TX:', tx);
    console.log('='.repeat(80));

  } catch (e: any) {
    console.log('ERROR:', e.message);
    if (e.logs) {
      console.log('\n=== LOGS ===');
      e.logs.forEach((l: string) => console.log(l));
    }
  }
}

main().catch(console.error);
