/**
 * Compare SDK path vs CLI test path
 *
 * This script runs proof generation through both paths and compares:
 * 1. CLI path: Direct snarkjs calls (like trace-real-proof.ts) - WORKS
 * 2. SDK path: ProofGenerator class (like frontend) - FAILING?
 */
// @ts-nocheck
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import { PublicKey } from '@solana/web3.js';
import { buildPoseidon } from 'circomlibjs';

// SDK imports
import { ProofGenerator } from '../packages/sdk/src/proofs';
import { initPoseidon, bytesToField, fieldToBytes, DOMAIN_COMMITMENT, poseidonHashDomain } from '../packages/sdk/src/crypto/poseidon';
import { computeCommitment } from '../packages/sdk/src/crypto/commitment';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';

const TOKEN_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');

// BN254 field moduli
const FQ_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');
const FR_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

// Domain constants
const COMMITMENT_DOMAIN = 1n;
const SPENDING_NULLIFIER_DOMAIN = 2n;
const NULLIFIER_KEY_DOMAIN = 4n;

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fieldToHex(value: bigint): string {
  return '0x' + value.toString(16).padStart(64, '0');
}

async function main() {
  console.log('='.repeat(80));
  console.log('COMPARE CLI PATH VS SDK PATH');
  console.log('='.repeat(80));

  // Initialize Poseidon (both circomlibjs for CLI and SDK's version)
  const poseidonCli = await buildPoseidon();
  const F = poseidonCli.F;
  await initPoseidon(); // SDK's Poseidon

  // CLI path helper
  const poseidonHashCli = (...inputs: bigint[]): bigint => {
    const result = poseidonCli(inputs.map(x => F.e(x)));
    return BigInt(F.toString(result));
  };

  // Create test values (same as working test)
  const stealthPubX = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef') % FR_MODULUS;
  const tokenMint = bytesToBigInt(TOKEN_MINT.toBytes());
  const inAmount = 1000000n;
  const randomness = BigInt('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890') % FR_MODULUS;
  const spendingKey = BigInt('0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba') % FR_MODULUS;
  const leafIndex = 0n;

  console.log('\n=== Test Values ===');
  console.log('stealthPubX:', fieldToHex(stealthPubX));
  console.log('tokenMint:', fieldToHex(tokenMint));
  console.log('inAmount:', inAmount.toString());
  console.log('randomness:', fieldToHex(randomness));
  console.log('spendingKey:', fieldToHex(spendingKey));

  // =============================================================================
  // CLI PATH (working)
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('CLI PATH (direct circomlibjs)');
  console.log('='.repeat(80));

  const cliCommitment = poseidonHashCli(COMMITMENT_DOMAIN, stealthPubX, tokenMint, inAmount, randomness);
  const cliNullifierKey = poseidonHashCli(NULLIFIER_KEY_DOMAIN, spendingKey, 0n);
  const cliNullifier = poseidonHashCli(SPENDING_NULLIFIER_DOMAIN, cliNullifierKey, cliCommitment, leafIndex);

  console.log('commitment:', fieldToHex(cliCommitment));
  console.log('nullifierKey:', fieldToHex(cliNullifierKey));
  console.log('nullifier:', fieldToHex(cliNullifier));

  // Output commitments
  const out1Randomness = BigInt('0x1111111111111111111111111111111111111111111111111111111111111111') % FR_MODULUS;
  const out2Randomness = BigInt('0x2222222222222222222222222222222222222222222222222222222222222222') % FR_MODULUS;
  const cliOutCommitment1 = poseidonHashCli(COMMITMENT_DOMAIN, 0n, tokenMint, 0n, out1Randomness);
  const cliOutCommitment2 = poseidonHashCli(COMMITMENT_DOMAIN, 0n, tokenMint, 0n, out2Randomness);

  console.log('outCommitment1:', fieldToHex(cliOutCommitment1));
  console.log('outCommitment2:', fieldToHex(cliOutCommitment2));

  // =============================================================================
  // SDK PATH (frontend uses this)
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('SDK PATH (packages/sdk)');
  console.log('='.repeat(80));

  // Convert values to Uint8Array (how SDK stores them)
  const stealthPubXBytes = bigIntToBytes(stealthPubX, 32);
  const tokenMintBytes = TOKEN_MINT.toBytes();
  const randomnessBytes = bigIntToBytes(randomness, 32);
  const spendingKeyBytes = bigIntToBytes(spendingKey, 32);

  // SDK commitment computation
  const sdkNote = {
    stealthPubX: stealthPubXBytes,
    tokenMint: TOKEN_MINT,
    amount: inAmount,
    randomness: randomnessBytes,
  };
  const sdkCommitment = computeCommitment(sdkNote);
  console.log('commitment:', toHex(sdkCommitment));

  // SDK nullifier computation
  const sdkNullifierKey = deriveNullifierKey(spendingKeyBytes);
  console.log('nullifierKey:', toHex(sdkNullifierKey));

  const sdkNullifier = deriveSpendingNullifier(sdkNullifierKey, sdkCommitment, Number(leafIndex));
  console.log('nullifier:', toHex(sdkNullifier));

  // SDK output commitments
  const out1RandomnessBytes = bigIntToBytes(out1Randomness, 32);
  const out2RandomnessBytes = bigIntToBytes(out2Randomness, 32);

  const sdkOutCommitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    new Uint8Array(32), // zero stealthPubX
    tokenMintBytes,
    fieldToBytes(0n), // zero amount
    out1RandomnessBytes
  );
  const sdkOutCommitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    new Uint8Array(32),
    tokenMintBytes,
    fieldToBytes(0n),
    out2RandomnessBytes
  );

  console.log('outCommitment1:', toHex(sdkOutCommitment1));
  console.log('outCommitment2:', toHex(sdkOutCommitment2));

  // =============================================================================
  // COMPARE
  // =============================================================================
  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON');
  console.log('='.repeat(80));

  const cliCommitmentHex = fieldToHex(cliCommitment);
  const sdkCommitmentHex = '0x' + toHex(sdkCommitment);
  console.log('\nCommitment:');
  console.log('  CLI:', cliCommitmentHex);
  console.log('  SDK:', sdkCommitmentHex);
  console.log('  Match:', cliCommitmentHex === sdkCommitmentHex ? '✓' : '✗ MISMATCH!');

  const cliNullifierKeyHex = fieldToHex(cliNullifierKey);
  const sdkNullifierKeyHex = '0x' + toHex(sdkNullifierKey);
  console.log('\nNullifier Key:');
  console.log('  CLI:', cliNullifierKeyHex);
  console.log('  SDK:', sdkNullifierKeyHex);
  console.log('  Match:', cliNullifierKeyHex === sdkNullifierKeyHex ? '✓' : '✗ MISMATCH!');

  const cliNullifierHex = fieldToHex(cliNullifier);
  const sdkNullifierHex = '0x' + toHex(sdkNullifier);
  console.log('\nNullifier:');
  console.log('  CLI:', cliNullifierHex);
  console.log('  SDK:', sdkNullifierHex);
  console.log('  Match:', cliNullifierHex === sdkNullifierHex ? '✓' : '✗ MISMATCH!');

  const cliOut1Hex = fieldToHex(cliOutCommitment1);
  const sdkOut1Hex = '0x' + toHex(sdkOutCommitment1);
  console.log('\nOutput Commitment 1:');
  console.log('  CLI:', cliOut1Hex);
  console.log('  SDK:', sdkOut1Hex);
  console.log('  Match:', cliOut1Hex === sdkOut1Hex ? '✓' : '✗ MISMATCH!');

  const cliOut2Hex = fieldToHex(cliOutCommitment2);
  const sdkOut2Hex = '0x' + toHex(sdkOutCommitment2);
  console.log('\nOutput Commitment 2:');
  console.log('  CLI:', cliOut2Hex);
  console.log('  SDK:', sdkOut2Hex);
  console.log('  Match:', cliOut2Hex === sdkOut2Hex ? '✓' : '✗ MISMATCH!');

  // =============================================================================
  // GENERATE PROOFS THROUGH BOTH PATHS
  // =============================================================================
  if (cliCommitmentHex === sdkCommitmentHex && cliNullifierHex === sdkNullifierHex) {
    console.log('\n' + '='.repeat(80));
    console.log('PROOF GENERATION COMPARISON');
    console.log('='.repeat(80));

    const merkleRoot = cliCommitment;
    const unshieldAmount = inAmount;

    // CLI path proof generation
    console.log('\n--- CLI Path ---');
    const cliCircuitInputs = {
      merkle_root: fieldToHex(merkleRoot),
      nullifier: fieldToHex(cliNullifier),
      out_commitment_1: fieldToHex(cliOutCommitment1),
      out_commitment_2: fieldToHex(cliOutCommitment2),
      token_mint: fieldToHex(tokenMint),
      unshield_amount: unshieldAmount.toString(),
      in_stealth_pub_x: fieldToHex(stealthPubX),
      in_amount: inAmount.toString(),
      in_randomness: fieldToHex(randomness),
      in_stealth_spending_key: fieldToHex(spendingKey),
      merkle_path: Array(32).fill(fieldToHex(0n)),
      merkle_path_indices: Array(32).fill('0'),
      leaf_index: leafIndex.toString(),
      out_stealth_pub_x_1: fieldToHex(0n),
      out_amount_1: '0',
      out_randomness_1: fieldToHex(out1Randomness),
      out_stealth_pub_x_2: fieldToHex(0n),
      out_amount_2: '0',
      out_randomness_2: fieldToHex(out2Randomness),
    };

    const wasmPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_js', 'transfer_1x2.wasm');
    const zkeyPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_final.zkey');

    console.log('Generating CLI proof...');
    const { proof: cliProof, publicSignals: cliSignals } = await snarkjs.groth16.fullProve(cliCircuitInputs, wasmPath, zkeyPath);
    console.log('CLI proof generated!');
    console.log('CLI public signals:', cliSignals.map((s: string) => '0x' + BigInt(s).toString(16).padStart(64, '0')));

    // SDK path proof generation
    console.log('\n--- SDK Path ---');

    // Initialize proof generator (like frontend does)
    const proofGen = new ProofGenerator({ baseUrl: '/circom' });

    // Load circuit artifacts directly (simulating browser fetch)
    const wasmBuffer = fs.readFileSync(path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom', 'transfer_1x2.wasm'));
    const zkeyBuffer = fs.readFileSync(path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom', 'transfer_1x2_final.zkey'));

    // Build TransferParams like the SDK does
    const transferParams = {
      inputs: [{
        stealthPubX: stealthPubXBytes,
        tokenMint: TOKEN_MINT,
        amount: inAmount,
        randomness: randomnessBytes,
        leafIndex: Number(leafIndex),
        commitment: sdkCommitment,
        // No stealthEphemeralPubkey - test without stealth derivation
      }],
      merkleRoot: bigIntToBytes(merkleRoot, 32),
      merklePath: Array(32).fill(new Uint8Array(32)),
      merkleIndices: Array(32).fill(0),
      outputs: [{
        recipient: { stealthPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) }, ephemeralPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) } },
        amount: 0n,
        commitment: sdkOutCommitment1,
        stealthPubX: new Uint8Array(32),
        randomness: out1RandomnessBytes,
      }, {
        recipient: { stealthPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) }, ephemeralPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) } },
        amount: 0n,
        commitment: sdkOutCommitment2,
        stealthPubX: new Uint8Array(32),
        randomness: out2RandomnessBytes,
      }],
      unshield: { amount: unshieldAmount, recipient: TOKEN_MINT },
    };

    const keypair = {
      spending: { sk: spendingKeyBytes, pk: { x: stealthPubXBytes, y: new Uint8Array(32) } },
      viewing: { sk: spendingKeyBytes, pk: { x: stealthPubXBytes, y: new Uint8Array(32) } },
      publicKey: { x: stealthPubXBytes, y: new Uint8Array(32) },
    };

    // Call SDK's generateTransferProof
    console.log('Generating SDK proof...');
    try {
      // We need to manually call the SDK path that goes through snarkjs
      // Since we can't use the ProofGenerator directly without loading circuits,
      // let's manually trace through buildTransferWitness and compare

      // The SDK converts inputs like this in buildTransferWitness:
      const sdkWitness = {
        merkle_root: '0x' + toHex(bigIntToBytes(merkleRoot, 32)),
        nullifier: '0x' + toHex(sdkNullifier),
        out_commitment_1: '0x' + toHex(sdkOutCommitment1),
        out_commitment_2: '0x' + toHex(sdkOutCommitment2),
        token_mint: '0x' + toHex(tokenMintBytes),
        unshield_amount: unshieldAmount.toString(),
        in_stealth_pub_x: '0x' + toHex(stealthPubXBytes),
        in_amount: inAmount.toString(),
        in_randomness: '0x' + toHex(randomnessBytes),
        in_stealth_spending_key: '0x' + toHex(spendingKeyBytes),
        merkle_path: Array(32).fill('0x' + '0'.repeat(64)),
        merkle_path_indices: Array(32).fill('0'),
        leaf_index: leafIndex.toString(),
        out_stealth_pub_x_1: '0x' + '0'.repeat(64),
        out_amount_1: '0',
        out_randomness_1: '0x' + toHex(out1RandomnessBytes),
        out_stealth_pub_x_2: '0x' + '0'.repeat(64),
        out_amount_2: '0',
        out_randomness_2: '0x' + toHex(out2RandomnessBytes),
      };

      console.log('\n--- Witness Comparison ---');
      console.log('\nmerkle_root:');
      console.log('  CLI:', cliCircuitInputs.merkle_root);
      console.log('  SDK:', sdkWitness.merkle_root);
      console.log('  Match:', cliCircuitInputs.merkle_root === sdkWitness.merkle_root ? '✓' : '✗');

      console.log('\nnullifier:');
      console.log('  CLI:', cliCircuitInputs.nullifier);
      console.log('  SDK:', sdkWitness.nullifier);
      console.log('  Match:', cliCircuitInputs.nullifier === sdkWitness.nullifier ? '✓' : '✗');

      console.log('\nout_commitment_1:');
      console.log('  CLI:', cliCircuitInputs.out_commitment_1);
      console.log('  SDK:', sdkWitness.out_commitment_1);
      console.log('  Match:', cliCircuitInputs.out_commitment_1 === sdkWitness.out_commitment_1 ? '✓' : '✗');

      console.log('\nout_commitment_2:');
      console.log('  CLI:', cliCircuitInputs.out_commitment_2);
      console.log('  SDK:', sdkWitness.out_commitment_2);
      console.log('  Match:', cliCircuitInputs.out_commitment_2 === sdkWitness.out_commitment_2 ? '✓' : '✗');

      console.log('\ntoken_mint:');
      console.log('  CLI:', cliCircuitInputs.token_mint);
      console.log('  SDK:', sdkWitness.token_mint);
      console.log('  Match:', cliCircuitInputs.token_mint === sdkWitness.token_mint ? '✓' : '✗');

      console.log('\nin_stealth_pub_x:');
      console.log('  CLI:', cliCircuitInputs.in_stealth_pub_x);
      console.log('  SDK:', sdkWitness.in_stealth_pub_x);
      console.log('  Match:', cliCircuitInputs.in_stealth_pub_x === sdkWitness.in_stealth_pub_x ? '✓' : '✗');

      console.log('\nin_randomness:');
      console.log('  CLI:', cliCircuitInputs.in_randomness);
      console.log('  SDK:', sdkWitness.in_randomness);
      console.log('  Match:', cliCircuitInputs.in_randomness === sdkWitness.in_randomness ? '✓' : '✗');

      console.log('\nin_stealth_spending_key:');
      console.log('  CLI:', cliCircuitInputs.in_stealth_spending_key);
      console.log('  SDK:', sdkWitness.in_stealth_spending_key);
      console.log('  Match:', cliCircuitInputs.in_stealth_spending_key === sdkWitness.in_stealth_spending_key ? '✓' : '✗');

      // Now generate proof with SDK witness
      console.log('\nGenerating proof with SDK witness...');
      const { proof: sdkProof, publicSignals: sdkSignals } = await snarkjs.groth16.fullProve(sdkWitness, wasmPath, zkeyPath);
      console.log('SDK proof generated!');
      console.log('SDK public signals:', sdkSignals.map((s: string) => '0x' + BigInt(s).toString(16).padStart(64, '0')));

      // Compare public signals
      console.log('\n--- Public Signals Comparison ---');
      const signalNames = ['merkle_root', 'nullifier', 'out_commitment_1', 'out_commitment_2', 'token_mint', 'unshield_amount'];
      let allMatch = true;
      for (let i = 0; i < cliSignals.length; i++) {
        const match = cliSignals[i] === sdkSignals[i];
        if (!match) allMatch = false;
        console.log(`[${i}] ${signalNames[i]}: ${match ? '✓' : '✗ MISMATCH!'}`);
        if (!match) {
          console.log(`     CLI: ${cliSignals[i]}`);
          console.log(`     SDK: ${sdkSignals[i]}`);
        }
      }

      if (allMatch) {
        console.log('\n✓ ALL PUBLIC SIGNALS MATCH - both paths should produce valid proofs');
      } else {
        console.log('\n✗ PUBLIC SIGNAL MISMATCH - this is why verification fails');
      }

    } catch (err) {
      console.error('SDK proof generation error:', err);
    }
  } else {
    console.log('\n✗ Commitment/Nullifier mismatch - cannot compare proofs');
    console.log('Fix the cryptographic hash functions first!');
  }
}

main().catch(console.error);
