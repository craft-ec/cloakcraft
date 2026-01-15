/**
 * Test add_liquidity proof generation with new circuit
 */

import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Testing add_liquidity proof generation...\n');

  // Load circuit artifacts
  const wasmPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'add_liquidity_js', 'add_liquidity.wasm');
  const zkeyPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'add_liquidity_final.zkey');
  const vkPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'add_liquidity_verification_key.json');

  console.log('WASM:', wasmPath);
  console.log('Zkey:', zkeyPath);
  console.log('VK:', vkPath);

  // Create dummy inputs (all zeros for testing)
  const dummyField = '0';
  const dummyArray32 = Array(32).fill('0');

  const inputs = {
    // Public inputs
    nullifier_a: dummyField,
    nullifier_b: dummyField,
    pool_id: dummyField,
    lp_commitment: dummyField,
    change_a_commitment: dummyField,
    change_b_commitment: dummyField,

    // Private inputs - Token A
    in_a_stealth_pub_x: dummyField,
    in_a_amount: '1000000000', // 1 SOL
    in_a_randomness: dummyField,
    in_a_stealth_spending_key: dummyField,
    token_a_mint: dummyField,
    in_a_leaf_index: '0',
    merkle_path_a: dummyArray32,
    merkle_path_indices_a: dummyArray32,

    // Private inputs - Token B
    in_b_stealth_pub_x: dummyField,
    in_b_amount: '1000000', // 1 USDC
    in_b_randomness: dummyField,
    in_b_stealth_spending_key: dummyField,
    token_b_mint: dummyField,
    in_b_leaf_index: '0',
    merkle_path_b: dummyArray32,
    merkle_path_indices_b: dummyArray32,

    // Deposit amounts
    deposit_a: '10000000', // 0.01 SOL
    deposit_b: '1000', // 0.001 USDC

    // LP output
    lp_stealth_pub_x: dummyField,
    lp_token_mint: dummyField,
    lp_amount: '100000', // 0.0001 LP
    lp_randomness: dummyField,

    // Change A
    change_a_stealth_pub_x: dummyField,
    change_a_amount: '990000000', // 0.99 SOL
    change_a_randomness: dummyField,

    // Change B
    change_b_stealth_pub_x: dummyField,
    change_b_amount: '999000', // 0.999 USDC
    change_b_randomness: dummyField,
  };

  console.log('\nGenerating proof with dummy inputs...');

  try {
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      inputs,
      wasmPath,
      zkeyPath
    );

    console.log('✅ Proof generated successfully!');
    console.log('Public signals:', publicSignals.length);
    console.log('Proof:', JSON.stringify(proof).substring(0, 100) + '...');

    // Verify the proof
    const vkJson = JSON.parse(fs.readFileSync(vkPath, 'utf-8'));
    const isValid = await snarkjs.groth16.verify(vkJson, publicSignals, proof);

    console.log('\nVerification result:', isValid ? '✅ VALID' : '❌ INVALID');

    if (isValid) {
      console.log('\n✅ Circuit is working correctly!');
      console.log('The issue must be with how the SDK is generating inputs or formatting the proof.');
    } else {
      console.log('\n❌ Circuit has issues - proof cannot even verify with the VK!');
    }

  } catch (err: any) {
    console.error('❌ Proof generation failed:', err.message);
    console.error('Stack:', err.stack);
  }
}

main().catch(console.error);
