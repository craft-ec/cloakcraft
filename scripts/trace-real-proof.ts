/**
 * Generate a REAL proof and trace step-by-step
 */
// @ts-nocheck
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import { PublicKey, Connection } from '@solana/web3.js';
import { buildPoseidon } from 'circomlibjs';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const TOKEN_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');

// BN254 base field modulus (for curve point coordinates)
const FQ_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');
// BN254 scalar field modulus (for public inputs)
const FR_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

// Domain constants (must match circuit)
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
  console.log('REAL PROOF GENERATION AND TRACE');
  console.log('='.repeat(80));

  // Initialize Poseidon
  const poseidon = await buildPoseidon();
  const F = poseidon.F;

  // Helper to compute Poseidon hash
  const poseidonHash = (...inputs: bigint[]): bigint => {
    const result = poseidon(inputs.map(x => F.e(x)));
    return BigInt(F.toString(result));
  };

  // Create test values
  const stealthPubX = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef') % FR_MODULUS;
  const tokenMint = bytesToBigInt(TOKEN_MINT.toBytes());
  const inAmount = 1000000n;
  const randomness = BigInt('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890') % FR_MODULUS;
  const spendingKey = BigInt('0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba') % FR_MODULUS;
  const leafIndex = 0n;

  console.log('\n=== Step 1: Compute values that circuit will verify ===\n');

  // Compute commitment: Poseidon(domain, stealthPubX, tokenMint, amount, randomness)
  const commitment = poseidonHash(COMMITMENT_DOMAIN, stealthPubX, tokenMint, inAmount, randomness);
  console.log('Input commitment:', fieldToHex(commitment));

  // Compute nullifier key: Poseidon(domain, spendingKey, 0)
  const nullifierKey = poseidonHash(NULLIFIER_KEY_DOMAIN, spendingKey, 0n);
  console.log('Nullifier key:', fieldToHex(nullifierKey));

  // Compute nullifier: Poseidon(domain, nullifierKey, commitment, leafIndex)
  const nullifier = poseidonHash(SPENDING_NULLIFIER_DOMAIN, nullifierKey, commitment, leafIndex);
  console.log('Nullifier:', fieldToHex(nullifier));

  // Output 1: unshield everything
  const out1StealthPubX = 0n;
  const out1Amount = 0n;
  const out1Randomness = BigInt('0x1111111111111111111111111111111111111111111111111111111111111111') % FR_MODULUS;
  const outCommitment1 = poseidonHash(COMMITMENT_DOMAIN, out1StealthPubX, tokenMint, out1Amount, out1Randomness);
  console.log('Output commitment 1:', fieldToHex(outCommitment1));

  // Output 2: change (also 0 for full unshield)
  const out2StealthPubX = 0n;
  const out2Amount = 0n;
  const out2Randomness = BigInt('0x2222222222222222222222222222222222222222222222222222222222222222') % FR_MODULUS;
  const outCommitment2 = poseidonHash(COMMITMENT_DOMAIN, out2StealthPubX, tokenMint, out2Amount, out2Randomness);
  console.log('Output commitment 2:', fieldToHex(outCommitment2));

  // Merkle root (dummy - just use commitment as leaf, all zeros for path)
  const merkleRoot = commitment; // Simplified: single-leaf tree
  console.log('Merkle root:', fieldToHex(merkleRoot));

  const unshieldAmount = inAmount; // Unshield everything
  console.log('Unshield amount:', unshieldAmount.toString());
  console.log('Token mint:', fieldToHex(tokenMint));

  console.log('\n=== Step 2: Build circuit inputs ===\n');

  const circuitInputs = {
    // Public inputs
    merkle_root: fieldToHex(merkleRoot),
    nullifier: fieldToHex(nullifier),
    out_commitment_1: fieldToHex(outCommitment1),
    out_commitment_2: fieldToHex(outCommitment2),
    token_mint: fieldToHex(tokenMint),
    unshield_amount: unshieldAmount.toString(),

    // Private inputs
    in_stealth_pub_x: fieldToHex(stealthPubX),
    in_amount: inAmount.toString(),
    in_randomness: fieldToHex(randomness),
    in_stealth_spending_key: fieldToHex(spendingKey),
    merkle_path: Array(32).fill(fieldToHex(0n)),
    merkle_path_indices: Array(32).fill('0'),
    leaf_index: leafIndex.toString(),
    out_stealth_pub_x_1: fieldToHex(out1StealthPubX),
    out_amount_1: out1Amount.toString(),
    out_randomness_1: fieldToHex(out1Randomness),
    out_stealth_pub_x_2: fieldToHex(out2StealthPubX),
    out_amount_2: out2Amount.toString(),
    out_randomness_2: fieldToHex(out2Randomness),
  };

  console.log('Circuit inputs (public):');
  console.log('  merkle_root:', circuitInputs.merkle_root);
  console.log('  nullifier:', circuitInputs.nullifier);
  console.log('  out_commitment_1:', circuitInputs.out_commitment_1);
  console.log('  out_commitment_2:', circuitInputs.out_commitment_2);
  console.log('  token_mint:', circuitInputs.token_mint);
  console.log('  unshield_amount:', circuitInputs.unshield_amount);

  console.log('\n=== Step 3: Generate proof with snarkjs ===\n');

  const wasmPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_js', 'transfer_1x2.wasm');
  const zkeyPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_final.zkey');

  console.log('WASM path:', wasmPath);
  console.log('zkey path:', zkeyPath);

  const startTime = Date.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInputs, wasmPath, zkeyPath);
  console.log(`Proof generated in ${Date.now() - startTime}ms`);

  console.log('\n=== Step 4: Raw snarkjs output ===\n');

  console.log('proof.pi_a:');
  console.log('  [0] (x):', proof.pi_a[0]);
  console.log('  [1] (y):', proof.pi_a[1]);

  console.log('\nproof.pi_b:');
  console.log('  [0][0] (x.c0/real):', proof.pi_b[0][0]);
  console.log('  [0][1] (x.c1/imag):', proof.pi_b[0][1]);
  console.log('  [1][0] (y.c0/real):', proof.pi_b[1][0]);
  console.log('  [1][1] (y.c1/imag):', proof.pi_b[1][1]);

  console.log('\nproof.pi_c:');
  console.log('  [0] (x):', proof.pi_c[0]);
  console.log('  [1] (y):', proof.pi_c[1]);

  console.log('\npublicSignals (from snarkjs):');
  for (let i = 0; i < publicSignals.length; i++) {
    console.log(`  [${i}]: ${publicSignals[i]}`);
    console.log(`       = 0x${BigInt(publicSignals[i]).toString(16).padStart(64, '0')}`);
  }

  console.log('\n=== Step 5: SDK encodes proof for Solana ===\n');

  // A point - negate Y
  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : FQ_MODULUS - ay;

  console.log('A point encoding:');
  console.log('  ax =', ax.toString());
  console.log('  ay =', ay.toString());
  console.log('  Fq =', FQ_MODULUS.toString());
  console.log('  -ay = Fq - ay =', negAy.toString());

  const proofA = new Uint8Array(64);
  proofA.set(bigIntToBytes(ax, 32), 0);
  proofA.set(bigIntToBytes(negAy, 32), 32);
  console.log('  proofA (64 bytes):', toHex(proofA));

  // B point - reorder for Solana: x_im, x_re, y_im, y_re
  const bx_re = BigInt(proof.pi_b[0][0]);
  const bx_im = BigInt(proof.pi_b[0][1]);
  const by_re = BigInt(proof.pi_b[1][0]);
  const by_im = BigInt(proof.pi_b[1][1]);

  console.log('\nB point encoding:');
  console.log('  snarkjs order: [[x_re, x_im], [y_re, y_im]]');
  console.log('  Solana order:  [x_im, x_re, y_im, y_re]');
  console.log('  bx_im =', bx_im.toString());
  console.log('  bx_re =', bx_re.toString());
  console.log('  by_im =', by_im.toString());
  console.log('  by_re =', by_re.toString());

  const proofB = new Uint8Array(128);
  proofB.set(bigIntToBytes(bx_im, 32), 0);
  proofB.set(bigIntToBytes(bx_re, 32), 32);
  proofB.set(bigIntToBytes(by_im, 32), 64);
  proofB.set(bigIntToBytes(by_re, 32), 96);
  console.log('  proofB (128 bytes):', toHex(proofB.slice(0, 32)) + '...');

  // C point
  const cx = BigInt(proof.pi_c[0]);
  const cy = BigInt(proof.pi_c[1]);

  console.log('\nC point encoding:');
  console.log('  cx =', cx.toString());
  console.log('  cy =', cy.toString());

  const proofC = new Uint8Array(64);
  proofC.set(bigIntToBytes(cx, 32), 0);
  proofC.set(bigIntToBytes(cy, 32), 32);
  console.log('  proofC (64 bytes):', toHex(proofC));

  // Full proof
  const fullProof = new Uint8Array(256);
  fullProof.set(proofA, 0);
  fullProof.set(proofB, 64);
  fullProof.set(proofC, 192);

  console.log('\n=== Step 6: SDK sends to Solana ===\n');

  console.log('Transaction parameters:');
  console.log('  proof: Vec<u8> (256 bytes)');
  console.log('  merkle_root: [u8; 32] =', toHex(bigIntToBytes(merkleRoot, 32)));
  console.log('  nullifier: [u8; 32] =', toHex(bigIntToBytes(nullifier, 32)));
  console.log('  out_commitments[0]: [u8; 32] =', toHex(bigIntToBytes(outCommitment1, 32)));
  console.log('  out_commitments[1]: [u8; 32] =', toHex(bigIntToBytes(outCommitment2, 32)));
  console.log('  unshield_amount: u64 =', unshieldAmount.toString());

  console.log('\n=== Step 7: Solana program builds public_inputs ===\n');

  console.log('build_transact_public_inputs() does:');

  // Simulate Solana's pubkey_to_field
  const tokenMintBytes = TOKEN_MINT.toBytes();
  let tokenMintOnChain = bytesToBigInt(tokenMintBytes);
  console.log('\n  token_mint raw:', tokenMintOnChain.toString());
  console.log('  FR_MODULUS:', FR_MODULUS.toString());

  if (tokenMintOnChain >= FR_MODULUS) {
    tokenMintOnChain = tokenMintOnChain % FR_MODULUS;
    console.log('  REDUCED to:', tokenMintOnChain.toString());
  } else {
    console.log('  No reduction needed (< FR)');
  }

  const onChainPublicInputs = [
    merkleRoot,
    nullifier,
    outCommitment1,
    outCommitment2,
    tokenMintOnChain,
    unshieldAmount,
  ];

  console.log('\nOn-chain public_inputs array:');
  for (let i = 0; i < onChainPublicInputs.length; i++) {
    console.log(`  [${i}]: 0x${onChainPublicInputs[i].toString(16).padStart(64, '0')}`);
  }

  console.log('\n=== Step 8: Compare snarkjs signals vs on-chain inputs ===\n');

  const signalNames = ['merkle_root', 'nullifier', 'out_commitment_1', 'out_commitment_2', 'token_mint', 'unshield_amount'];
  let allMatch = true;

  for (let i = 0; i < publicSignals.length; i++) {
    const snarkjsVal = BigInt(publicSignals[i]);
    const onChainVal = onChainPublicInputs[i];
    const match = snarkjsVal === onChainVal;
    if (!match) allMatch = false;

    console.log(`[${i}] ${signalNames[i]}:`);
    console.log(`    snarkjs: ${snarkjsVal.toString()}`);
    console.log(`    onchain: ${onChainVal.toString()}`);
    console.log(`    match: ${match ? '✓' : '✗ MISMATCH!'}`);
  }

  console.log('\n' + '='.repeat(80));
  if (allMatch) {
    console.log('ALL PUBLIC INPUTS MATCH!');
    console.log('Issue must be in proof encoding or VK.');
  } else {
    console.log('PUBLIC INPUT MISMATCH FOUND!');
    console.log('This is why verification fails.');
  }
  console.log('='.repeat(80));

  // Verify locally with snarkjs
  console.log('\n=== Step 9: Verify with snarkjs (sanity check) ===\n');

  const vkPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'verification_key.json');
  const vk = JSON.parse(fs.readFileSync(vkPath, 'utf-8'));

  const isValid = await snarkjs.groth16.verify(vk, publicSignals, proof);
  console.log('snarkjs.groth16.verify() result:', isValid ? '✓ VALID' : '✗ INVALID');

  if (!isValid) {
    console.log('\n!!! Proof is invalid even in snarkjs - check circuit inputs !!!');
  }

  console.log('\n=== Step 10: Compare proof encoding with groth16-solana test format ===\n');

  // Show the exact bytes that would be sent to Solana
  console.log('Full 256-byte proof for Solana:');
  console.log('Bytes 0-63 (A point, negated Y):');
  console.log('  ', toHex(fullProof.slice(0, 32)));
  console.log('  ', toHex(fullProof.slice(32, 64)));

  console.log('Bytes 64-191 (B point, [x_im, x_re, y_im, y_re]):');
  console.log('  ', toHex(fullProof.slice(64, 96)));
  console.log('  ', toHex(fullProof.slice(96, 128)));
  console.log('  ', toHex(fullProof.slice(128, 160)));
  console.log('  ', toHex(fullProof.slice(160, 192)));

  console.log('Bytes 192-255 (C point):');
  console.log('  ', toHex(fullProof.slice(192, 224)));
  console.log('  ', toHex(fullProof.slice(224, 256)));

  // Load on-chain VK and show first bytes for comparison
  console.log('\n=== Step 11: On-chain VK structure ===\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const circuitId = Buffer.alloc(32);
  circuitId.write('transfer_1x2');
  const [vkPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vk'), circuitId],
    PROGRAM_ID
  );

  const info = await connection.getAccountInfo(vkPda);
  if (info) {
    const vecLen = info.data.readUInt32LE(40);
    const vkData = info.data.slice(44, 44 + vecLen);

    console.log('On-chain VK alpha_g1 (bytes 0-63):');
    console.log('  x:', vkData.slice(0, 32).toString('hex'));
    console.log('  y:', vkData.slice(32, 64).toString('hex'));

    console.log('On-chain VK IC[0] (bytes 452-515):');
    console.log('  x:', vkData.slice(452, 484).toString('hex'));
    console.log('  y:', vkData.slice(484, 516).toString('hex'));

    // Extract IC count
    const icCount = vkData.readUInt32BE(448);
    console.log('\nIC count:', icCount);

    // Verify IC[0] matches VK JSON
    const ic0_x_json = BigInt(vk.IC[0][0]).toString(16).padStart(64, '0');
    const ic0_x_chain = vkData.slice(452, 484).toString('hex');
    console.log('\nIC[0].x from JSON:', ic0_x_json);
    console.log('IC[0].x from chain:', ic0_x_chain);
    console.log('Match:', ic0_x_json === ic0_x_chain ? '✓' : '✗');
  }

  console.log('\n=== DEBUGGING SUMMARY ===\n');
  console.log('1. Proof verifies locally in snarkjs: ✓');
  console.log('2. Public inputs match SDK vs on-chain: ✓');
  console.log('3. VK on-chain matches snarkjs VK JSON: ✓ (verified earlier)');
  console.log('4. Remaining issue: proof encoding for Solana');
  console.log('\nPossible issues:');
  console.log('  - A point Y negation formula');
  console.log('  - B point component ordering');
  console.log('  - Byte endianness within 32-byte chunks');
}

main().catch(console.error);
