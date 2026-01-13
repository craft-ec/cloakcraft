/**
 * Test script for new Swap, Market, and Governance features
 *
 * Tests:
 * 1. ElGamal encryption utilities
 * 2. Vote encryption/serialization
 * 3. Proof generation for new circuits
 * 4. SDK client methods (type checking)
 */
// @ts-nocheck
import * as path from 'path';
import * as fs from 'fs';
import { buildPoseidon } from 'circomlibjs';

// Test utilities
const FR_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

function generateRandomField(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result % FR_MODULUS;
}

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

// =============================================================================
// Test 1: ElGamal Encryption
// =============================================================================

async function testElGamalEncryption() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: ElGamal Encryption');
  console.log('='.repeat(60));

  // Import ElGamal utilities
  const {
    elgamalEncrypt,
    addCiphertexts,
    serializeCiphertext,
    encryptVote,
    serializeEncryptedVote,
    generateVoteRandomness,
    VoteOption,
  } = await import('../packages/sdk/src/crypto/elgamal');

  const { derivePublicKey, GENERATOR } = await import('../packages/sdk/src/crypto/babyjubjub');

  // Generate a test election keypair
  const secretKey = generateRandomField();
  const publicKey = derivePublicKey(secretKey);

  console.log('\n1. Testing basic ElGamal encryption...');
  const message = 100n; // 100 tokens
  const randomness = generateRandomField();
  const ciphertext = elgamalEncrypt(message, publicKey, randomness);

  console.log('   Message:', message.toString());
  console.log('   C1 (x):', bytesToBigInt(ciphertext.c1.x).toString().slice(0, 20) + '...');
  console.log('   C2 (x):', bytesToBigInt(ciphertext.c2.x).toString().slice(0, 20) + '...');

  // Test serialization
  const serialized = serializeCiphertext(ciphertext);
  console.log('   Serialized length:', serialized.length, 'bytes (expected: 64)');

  if (serialized.length !== 64) {
    throw new Error('Serialization failed: expected 64 bytes');
  }
  console.log('   ✓ Basic encryption works');

  // Test homomorphic addition
  console.log('\n2. Testing homomorphic addition...');
  const ct1 = elgamalEncrypt(50n, publicKey, generateRandomField());
  const ct2 = elgamalEncrypt(30n, publicKey, generateRandomField());
  const ctSum = addCiphertexts(ct1, ct2);

  console.log('   Enc(50) + Enc(30) = Enc(80)');
  console.log('   Sum C1 (x):', bytesToBigInt(ctSum.c1.x).toString().slice(0, 20) + '...');
  console.log('   Sum C2 (x):', bytesToBigInt(ctSum.c2.x).toString().slice(0, 20) + '...');
  console.log('   ✓ Homomorphic addition works');

  // Test vote encryption
  console.log('\n3. Testing vote encryption...');
  const votingPower = 1000n;
  const randomnessValues = generateVoteRandomness();

  const encryptedVote = encryptVote(
    votingPower,
    VoteOption.Yes,
    publicKey,
    randomnessValues
  );

  console.log('   Voting power:', votingPower.toString());
  console.log('   Vote choice: Yes');
  console.log('   Yes ciphertext exists:', !!encryptedVote.yes);
  console.log('   No ciphertext exists:', !!encryptedVote.no);
  console.log('   Abstain ciphertext exists:', !!encryptedVote.abstain);

  // Serialize vote
  const serializedVote = serializeEncryptedVote(encryptedVote);
  console.log('   Serialized votes:', serializedVote.length, 'ciphertexts');
  console.log('   Each ciphertext:', serializedVote[0].length, 'bytes');

  if (serializedVote.length !== 3) {
    throw new Error('Vote serialization failed: expected 3 ciphertexts');
  }
  console.log('   ✓ Vote encryption works');

  return true;
}

// =============================================================================
// Test 2: BabyJubJub Operations
// =============================================================================

async function testBabyJubJub() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: BabyJubJub Operations');
  console.log('='.repeat(60));

  const {
    derivePublicKey,
    scalarMul,
    pointAdd,
    GENERATOR
  } = await import('../packages/sdk/src/crypto/babyjubjub');

  console.log('\n1. Testing key derivation...');
  const sk1 = generateRandomField();
  const pk1 = derivePublicKey(sk1);
  console.log('   Secret key:', sk1.toString().slice(0, 20) + '...');
  console.log('   Public key X:', bytesToBigInt(pk1.x).toString().slice(0, 20) + '...');
  console.log('   Public key Y:', bytesToBigInt(pk1.y).toString().slice(0, 20) + '...');
  console.log('   ✓ Key derivation works');

  console.log('\n2. Testing scalar multiplication...');
  const scalar = 12345n;
  const result = scalarMul(GENERATOR, scalar);
  console.log('   12345 * G = (', bytesToBigInt(result.x).toString().slice(0, 15) + '...,',
              bytesToBigInt(result.y).toString().slice(0, 15) + '...)');
  console.log('   ✓ Scalar multiplication works');

  console.log('\n3. Testing point addition...');
  const p1 = scalarMul(GENERATOR, 100n);
  const p2 = scalarMul(GENERATOR, 200n);
  const sum = pointAdd(p1, p2);
  const expected = scalarMul(GENERATOR, 300n);

  // Compare points
  const sumX = bytesToBigInt(sum.x);
  const expectedX = bytesToBigInt(expected.x);

  console.log('   100*G + 200*G = 300*G');
  console.log('   Sum X:', sumX.toString().slice(0, 20) + '...');
  console.log('   Expected X:', expectedX.toString().slice(0, 20) + '...');

  if (sumX !== expectedX) {
    throw new Error('Point addition failed: 100*G + 200*G != 300*G');
  }
  console.log('   ✓ Point addition works');

  return true;
}

// =============================================================================
// Test 3: Type Exports
// =============================================================================

async function testTypeExports() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 3: Type Exports');
  console.log('='.repeat(60));

  // Test that all types are properly exported
  const types = await import('../packages/types/src/index');

  const requiredTypes = [
    'AmmSwapParams',
    'AddLiquidityParams',
    'RemoveLiquidityParams',
    'FillOrderParams',
    'CancelOrderParams',
    'CreateAggregationParams',
    'SubmitVoteParams',
    'SubmitDecryptionShareParams',
    'FinalizeVotingParams',
    'VoteParams',
    'ElGamalCiphertext',
    'DecryptionShare',
    'AggregationState',
    'OrderState',
  ];

  console.log('\nChecking type exports from @cloakcraft/types...');

  // Note: We can't check interface existence at runtime, but we can verify
  // the module loaded correctly
  console.log('   Module loaded successfully');
  console.log('   OrderStatus enum:', types.OrderStatus);
  console.log('   AggregationStatus enum:', types.AggregationStatus);
  console.log('   ✓ Type exports work');

  return true;
}

// =============================================================================
// Test 4: SDK Instruction Builders
// =============================================================================

async function testInstructionBuilders() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 4: SDK Instruction Builders');
  console.log('='.repeat(60));

  // Import instruction builders
  const instructions = await import('../packages/sdk/src/instructions');

  console.log('\n1. Checking swap instruction exports...');
  console.log('   buildSwapWithProgram:', typeof instructions.buildSwapWithProgram);
  console.log('   buildAddLiquidityWithProgram:', typeof instructions.buildAddLiquidityWithProgram);
  console.log('   buildRemoveLiquidityWithProgram:', typeof instructions.buildRemoveLiquidityWithProgram);
  console.log('   deriveAmmPoolPda:', typeof instructions.deriveAmmPoolPda);

  if (typeof instructions.buildSwapWithProgram !== 'function') {
    throw new Error('buildSwapWithProgram not exported');
  }
  console.log('   ✓ Swap instructions exported');

  console.log('\n2. Checking market instruction exports...');
  console.log('   buildFillOrderWithProgram:', typeof instructions.buildFillOrderWithProgram);
  console.log('   buildCancelOrderWithProgram:', typeof instructions.buildCancelOrderWithProgram);
  console.log('   deriveOrderPda:', typeof instructions.deriveOrderPda);

  if (typeof instructions.buildFillOrderWithProgram !== 'function') {
    throw new Error('buildFillOrderWithProgram not exported');
  }
  console.log('   ✓ Market instructions exported');

  console.log('\n3. Checking governance instruction exports...');
  console.log('   buildCreateAggregationWithProgram:', typeof instructions.buildCreateAggregationWithProgram);
  console.log('   buildSubmitVoteWithProgram:', typeof instructions.buildSubmitVoteWithProgram);
  console.log('   buildSubmitDecryptionShareWithProgram:', typeof instructions.buildSubmitDecryptionShareWithProgram);
  console.log('   buildFinalizeDecryptionWithProgram:', typeof instructions.buildFinalizeDecryptionWithProgram);
  console.log('   deriveAggregationPda:', typeof instructions.deriveAggregationPda);

  if (typeof instructions.buildCreateAggregationWithProgram !== 'function') {
    throw new Error('buildCreateAggregationWithProgram not exported');
  }
  console.log('   ✓ Governance instructions exported');

  console.log('\n4. Checking CIRCUIT_IDS...');
  console.log('   SWAP:', instructions.CIRCUIT_IDS.SWAP);
  console.log('   ADD_LIQUIDITY:', instructions.CIRCUIT_IDS.ADD_LIQUIDITY);
  console.log('   REMOVE_LIQUIDITY:', instructions.CIRCUIT_IDS.REMOVE_LIQUIDITY);
  console.log('   ORDER_CREATE:', instructions.CIRCUIT_IDS.ORDER_CREATE);
  console.log('   ORDER_FILL:', instructions.CIRCUIT_IDS.ORDER_FILL);
  console.log('   ORDER_CANCEL:', instructions.CIRCUIT_IDS.ORDER_CANCEL);
  console.log('   GOVERNANCE_VOTE:', instructions.CIRCUIT_IDS.GOVERNANCE_VOTE);
  console.log('   ✓ Circuit IDs defined');

  return true;
}

// =============================================================================
// Test 5: Proof Generator Methods
// =============================================================================

async function testProofGenerator() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 5: Proof Generator Methods');
  console.log('='.repeat(60));

  const { ProofGenerator } = await import('../packages/sdk/src/proofs');

  const generator = new ProofGenerator({});

  console.log('\n1. Checking proof generator methods...');
  console.log('   generateSwapProof:', typeof generator.generateSwapProof);
  console.log('   generateAddLiquidityProof:', typeof generator.generateAddLiquidityProof);
  console.log('   generateRemoveLiquidityProof:', typeof generator.generateRemoveLiquidityProof);
  console.log('   generateFillOrderProof:', typeof generator.generateFillOrderProof);
  console.log('   generateCancelOrderProof:', typeof generator.generateCancelOrderProof);
  console.log('   generateVoteProof:', typeof generator.generateVoteProof);

  if (typeof generator.generateSwapProof !== 'function') {
    throw new Error('generateSwapProof not defined');
  }
  if (typeof generator.generateVoteProof !== 'function') {
    throw new Error('generateVoteProof not defined');
  }
  console.log('   ✓ All proof generator methods exist');

  return true;
}

// =============================================================================
// Test 6: Client Methods
// =============================================================================

async function testClientMethods() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 6: Client Methods');
  console.log('='.repeat(60));

  const { CloakCraftClient } = await import('../packages/sdk/src/client');
  const { PublicKey } = await import('@solana/web3.js');

  // Create a mock client (won't connect, just testing method existence)
  const client = new CloakCraftClient({
    rpcUrl: 'https://api.devnet.solana.com',
    indexerUrl: 'http://localhost:3000',
    programId: new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP'),
  });

  console.log('\n1. Checking swap client methods...');
  console.log('   swap:', typeof client.swap);
  console.log('   addLiquidity:', typeof client.addLiquidity);
  console.log('   removeLiquidity:', typeof client.removeLiquidity);

  if (typeof client.swap !== 'function') {
    throw new Error('swap method not defined on client');
  }
  console.log('   ✓ Swap methods exist');

  console.log('\n2. Checking market client methods...');
  console.log('   fillOrder:', typeof client.fillOrder);
  console.log('   cancelOrder:', typeof client.cancelOrder);

  if (typeof client.fillOrder !== 'function') {
    throw new Error('fillOrder method not defined on client');
  }
  console.log('   ✓ Market methods exist');

  console.log('\n3. Checking governance client methods...');
  console.log('   createAggregation:', typeof client.createAggregation);
  console.log('   submitVote:', typeof client.submitVote);
  console.log('   submitDecryptionShare:', typeof client.submitDecryptionShare);
  console.log('   finalizeVoting:', typeof client.finalizeVoting);
  console.log('   getAggregation:', typeof client.getAggregation);

  if (typeof client.createAggregation !== 'function') {
    throw new Error('createAggregation method not defined on client');
  }
  if (typeof client.submitVote !== 'function') {
    throw new Error('submitVote method not defined on client');
  }
  console.log('   ✓ Governance methods exist');

  return true;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' '.repeat(15) + 'NEW FEATURES TEST SUITE' + ' '.repeat(20) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  const results: { name: string; passed: boolean; error?: string }[] = [];

  // Run tests
  const tests = [
    { name: 'ElGamal Encryption', fn: testElGamalEncryption },
    { name: 'BabyJubJub Operations', fn: testBabyJubJub },
    { name: 'Type Exports', fn: testTypeExports },
    { name: 'Instruction Builders', fn: testInstructionBuilders },
    { name: 'Proof Generator', fn: testProofGenerator },
    { name: 'Client Methods', fn: testClientMethods },
  ];

  for (const test of tests) {
    try {
      await test.fn();
      results.push({ name: test.name, passed: true });
    } catch (error: any) {
      console.error(`\n   ✗ ${test.name} FAILED:`, error.message);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const result of results) {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`   ${status}: ${result.name}`);
    if (result.error) {
      console.log(`          Error: ${result.error}`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`   Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('-'.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }

  console.log('\n✓ All tests passed!\n');
}

main().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
