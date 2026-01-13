/**
 * Step-by-step trace of proof verification
 * Compares SDK encoding vs what on-chain expects
 */
import * as fs from 'fs';
import * as path from 'path';

// BN254 field moduli
const FQ_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583'); // base field (for coords)
const FR_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617'); // scalar field (for inputs)

// Helper functions
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

function decToHex(dec: string): string {
  return BigInt(dec).toString(16).padStart(64, '0');
}

async function main() {
  console.log('='.repeat(80));
  console.log('STEP-BY-STEP PROOF VERIFICATION TRACE');
  console.log('='.repeat(80));

  // Load a sample proof from snarkjs (we'll use the test proof if available, or generate one)
  const snarkjs = await import('snarkjs');

  // Load circuit artifacts
  const wasmPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_js', 'transfer_1x2.wasm');
  const zkeyPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2.zkey');
  const vkPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'verification_key.json');

  const vkJson = JSON.parse(fs.readFileSync(vkPath, 'utf-8'));

  // Create dummy inputs for testing
  const testInputs = {
    // Public inputs
    merkle_root: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    nullifier: '0x2345678901bcdef02345678901bcdef02345678901bcdef02345678901bcdef0',
    out_commitment_1: '0x3456789012cdef013456789012cdef013456789012cdef013456789012cdef01',
    out_commitment_2: '0x456789012def0124567890123def0124567890123def0124567890123def012',
    token_mint: '0x17af5cab77a2c17a285d5a17b3b9619e1e73ad20e7f50c9097c29cafd9e97ad9', // actual token
    unshield_amount: '1000000',

    // Private inputs (dummy)
    in_stealth_pub_x: '0x1111111111111111111111111111111111111111111111111111111111111111',
    in_amount: '1000000',
    in_randomness: '0x2222222222222222222222222222222222222222222222222222222222222222',
    in_stealth_spending_key: '0x3333333333333333333333333333333333333333333333333333333333333333',
    merkle_path: Array(32).fill('0x0000000000000000000000000000000000000000000000000000000000000000'),
    merkle_path_indices: Array(32).fill('0'),
    leaf_index: '0',
    out_stealth_pub_x_1: '0x4444444444444444444444444444444444444444444444444444444444444444',
    out_amount_1: '0',
    out_randomness_1: '0x5555555555555555555555555555555555555555555555555555555555555555',
    out_stealth_pub_x_2: '0x6666666666666666666666666666666666666666666666666666666666666666',
    out_amount_2: '0',
    out_randomness_2: '0x7777777777777777777777777777777777777777777777777777777777777777',
  };

  console.log('\n' + '='.repeat(80));
  console.log('STEP 1: Generate proof with snarkjs');
  console.log('='.repeat(80));

  let proof: any;
  let publicSignals: string[];

  try {
    const result = await snarkjs.groth16.fullProve(testInputs, wasmPath, zkeyPath);
    proof = result.proof;
    publicSignals = result.publicSignals;
    console.log('Proof generated successfully!\n');
  } catch (e: any) {
    console.log('Error generating proof:', e.message);
    console.log('\nUsing mock proof data for demonstration...\n');
    // Use mock data to show the encoding process
    proof = {
      pi_a: ['12345678901234567890', '98765432109876543210', '1'],
      pi_b: [['11111111111111111111', '22222222222222222222'], ['33333333333333333333', '44444444444444444444'], ['1', '0']],
      pi_c: ['55555555555555555555', '66666666666666666666', '1'],
    };
    publicSignals = [
      '8271056982379102734', // merkle_root
      '1623847561234876512', // nullifier
      '2345678901234567890', // out_commitment_1
      '3456789012345678901', // out_commitment_2
      '10742458626396116296827668155068741261009655952165098574963099785178399300313', // token_mint
      '1000000', // unshield_amount
    ];
  }

  console.log('SNARKJS RAW OUTPUT:');
  console.log('-'.repeat(40));
  console.log('proof.pi_a[0] (A.x):', proof.pi_a[0]);
  console.log('proof.pi_a[1] (A.y):', proof.pi_a[1]);
  console.log('proof.pi_b[0][0] (B.x real):', proof.pi_b[0][0]);
  console.log('proof.pi_b[0][1] (B.x imag):', proof.pi_b[0][1]);
  console.log('proof.pi_b[1][0] (B.y real):', proof.pi_b[1][0]);
  console.log('proof.pi_b[1][1] (B.y imag):', proof.pi_b[1][1]);
  console.log('proof.pi_c[0] (C.x):', proof.pi_c[0]);
  console.log('proof.pi_c[1] (C.y):', proof.pi_c[1]);
  console.log('\npublicSignals:', publicSignals);

  console.log('\n' + '='.repeat(80));
  console.log('STEP 2: SDK converts proof to bytes');
  console.log('='.repeat(80));

  // Convert proof exactly as SDK does
  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : FQ_MODULUS - ay;

  console.log('\nA point (G1):');
  console.log('  ax (decimal):', ax.toString());
  console.log('  ay (decimal):', ay.toString());
  console.log('  negAy = Fq - ay:', negAy.toString());
  console.log('  ax (hex):', ax.toString(16).padStart(64, '0'));
  console.log('  negAy (hex):', negAy.toString(16).padStart(64, '0'));

  const proofA = new Uint8Array(64);
  proofA.set(bigIntToBytes(ax, 32), 0);
  proofA.set(bigIntToBytes(negAy, 32), 32);
  console.log('  SDK proof_a bytes:', toHex(proofA));

  console.log('\nB point (G2):');
  const bx0 = BigInt(proof.pi_b[0][0]); // real
  const bx1 = BigInt(proof.pi_b[0][1]); // imag
  const by0 = BigInt(proof.pi_b[1][0]); // real
  const by1 = BigInt(proof.pi_b[1][1]); // imag
  console.log('  bx0 (x real):', bx0.toString());
  console.log('  bx1 (x imag):', bx1.toString());
  console.log('  by0 (y real):', by0.toString());
  console.log('  by1 (y imag):', by1.toString());

  const proofB = new Uint8Array(128);
  // SDK order: x_im, x_re, y_im, y_re
  proofB.set(bigIntToBytes(bx1, 32), 0);   // x_im first
  proofB.set(bigIntToBytes(bx0, 32), 32);  // x_re second
  proofB.set(bigIntToBytes(by1, 32), 64);  // y_im third
  proofB.set(bigIntToBytes(by0, 32), 96);  // y_re fourth
  console.log('  SDK order: [x_im, x_re, y_im, y_re]');
  console.log('  SDK proof_b bytes (first 32):', toHex(proofB.slice(0, 32)));

  console.log('\nC point (G1):');
  const cx = BigInt(proof.pi_c[0]);
  const cy = BigInt(proof.pi_c[1]);
  console.log('  cx:', cx.toString());
  console.log('  cy:', cy.toString());

  const proofC = new Uint8Array(64);
  proofC.set(bigIntToBytes(cx, 32), 0);
  proofC.set(bigIntToBytes(cy, 32), 32);
  console.log('  SDK proof_c bytes:', toHex(proofC));

  console.log('\n' + '='.repeat(80));
  console.log('STEP 3: SDK formats public inputs');
  console.log('='.repeat(80));

  console.log('\nPublic signals from snarkjs (in circuit order):');
  for (let i = 0; i < publicSignals.length; i++) {
    const val = BigInt(publicSignals[i]);
    const hex = val.toString(16).padStart(64, '0');
    console.log(`  [${i}]: ${publicSignals[i]}`);
    console.log(`       hex: 0x${hex}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('STEP 4: What Solana program receives');
  console.log('='.repeat(80));

  console.log('\nSolana receives these as instruction parameters:');
  console.log('  proof: 256 bytes (A + B + C)');
  console.log('  merkle_root: [u8; 32]');
  console.log('  nullifier: [u8; 32]');
  console.log('  out_commitments: Vec<[u8; 32]> (2 elements)');
  console.log('  unshield_amount: u64');
  console.log('  token_mint: comes from pool.token_mint (NOT passed directly)');

  console.log('\n' + '='.repeat(80));
  console.log('STEP 5: Solana builds public_inputs array');
  console.log('='.repeat(80));

  console.log('\nIn build_transact_public_inputs():');
  console.log('  inputs.push(*merkle_root);         // signal[0]');
  console.log('  inputs.push(*nullifier);           // signal[1]');
  console.log('  inputs.push(out_commitments[0]);   // signal[2]');
  console.log('  inputs.push(out_commitments[1]);   // signal[3]');
  console.log('  inputs.push(pubkey_to_field(token_mint)); // signal[4]');
  console.log('  inputs.push(u64_to_field(unshield_amount)); // signal[5]');

  console.log('\nKEY QUESTION: Does SDK send same values that snarkjs used?');

  // Simulate what Solana would compute for token_mint
  const tokenMintBytes = Buffer.from('17af5cab77a2c17a285d5a17b3b9619e1e73ad20e7f50c9097c29cafd9e97ad9', 'hex');
  const tokenMintBigInt = BigInt('0x' + tokenMintBytes.toString('hex'));

  console.log('\nToken mint analysis:');
  console.log('  Raw bytes (hex):', tokenMintBytes.toString('hex'));
  console.log('  As BigInt:', tokenMintBigInt.toString());
  console.log('  FR_MODULUS:', FR_MODULUS.toString());
  console.log('  tokenMint < FR_MODULUS?', tokenMintBigInt < FR_MODULUS);

  if (tokenMintBigInt >= FR_MODULUS) {
    const reduced = tokenMintBigInt % FR_MODULUS;
    console.log('  REDUCED value:', reduced.toString());
    console.log('  !!! MISMATCH: SDK uses raw, Solana uses reduced !!!');
  } else {
    console.log('  OK: No reduction needed, values match');
  }

  console.log('\n' + '='.repeat(80));
  console.log('STEP 6: groth16-solana verification');
  console.log('='.repeat(80));

  console.log('\nGroth16Verifier::new() receives:');
  console.log('  proof_a: 64 bytes (should be negated A)');
  console.log('  proof_b: 128 bytes (G2 in Solana order)');
  console.log('  proof_c: 64 bytes');
  console.log('  public_inputs: &[[u8; 32]; 6]');
  console.log('  vk: Groth16Verifyingkey');

  console.log('\nverifier.verify() does:');
  console.log('  1. prepare_inputs(): IC[0] + sum(input[i] * IC[i+1])');
  console.log('  2. pairing check: e(A,B) * e(prepared,gamma) * e(C,delta) * e(alpha,beta) = 1');

  console.log('\n' + '='.repeat(80));
  console.log('VERIFICATION CHECKLIST');
  console.log('='.repeat(80));

  console.log('\n[ ] VK on-chain matches snarkjs VK? (Run debug-full-verification.ts)');
  console.log('[ ] Proof A is negated (y = Fq - y)?');
  console.log('[ ] Proof B order is [x_im, x_re, y_im, y_re]?');
  console.log('[ ] Public inputs match between SDK and Solana?');
  console.log('[ ] Token mint doesn\'t need reduction (< FR)?');
  console.log('[ ] All values are big-endian 32-byte arrays?');

  console.log('\n' + '='.repeat(80));
  console.log('COMPARISON WITH GROTH16-SOLANA TEST');
  console.log('='.repeat(80));

  console.log('\nIn groth16-solana test, proof_a negation is done by:');
  console.log('  1. change_endianness(PROOF[0..64]) -> little-endian');
  console.log('  2. Deserialize as arkworks G1');
  console.log('  3. .neg() -> (x, -y)');
  console.log('  4. Serialize back to little-endian');
  console.log('  5. change_endianness() -> big-endian');
  console.log('');
  console.log('Our SDK does:');
  console.log('  1. Get decimal strings from snarkjs');
  console.log('  2. negAy = Fq - ay');
  console.log('  3. Convert to big-endian bytes');
  console.log('');
  console.log('These should be mathematically equivalent!');

  console.log('\n' + '='.repeat(80));
  console.log('NEXT STEPS FOR DEBUGGING');
  console.log('='.repeat(80));
  console.log('\n1. Run a transaction and capture full Solana logs');
  console.log('2. Compare logged values with SDK values above');
  console.log('3. If values match, issue is in proof generation');
  console.log('4. If values differ, issue is in SDK->Solana encoding');
}

main().catch(console.error);
