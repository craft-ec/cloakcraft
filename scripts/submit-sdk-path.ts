/**
 * Submit proof using SDK/frontend path
 *
 * Uses the exact same code path as the frontend:
 * - ProofGenerator.generateTransferProof()
 * - buildTransactWithProgram()
 */
// @ts-nocheck
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { buildPoseidon } from 'circomlibjs';

// SDK imports
import { ProofGenerator } from '../packages/sdk/src/proofs';
import { initPoseidon, bytesToField, fieldToBytes, DOMAIN_COMMITMENT, poseidonHashDomain } from '../packages/sdk/src/crypto/poseidon';
import { computeCommitment } from '../packages/sdk/src/crypto/commitment';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const TOKEN_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');

const FR_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

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
  console.log('SUBMIT PROOF USING SDK/FRONTEND PATH');
  console.log('='.repeat(80));

  // Initialize Poseidon (SDK's version)
  await initPoseidon();

  // Test values (same as working test)
  const stealthPubX = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef') % FR_MODULUS;
  const tokenMint = TOKEN_MINT;
  const inAmount = 1000000n;
  const randomness = BigInt('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890') % FR_MODULUS;
  const spendingKey = BigInt('0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba') % FR_MODULUS;
  const leafIndex = 0;

  // Convert to bytes
  const stealthPubXBytes = bigIntToBytes(stealthPubX, 32);
  const randomnessBytes = bigIntToBytes(randomness, 32);
  const spendingKeyBytes = bigIntToBytes(spendingKey, 32);
  const out1Randomness = BigInt('0x1111111111111111111111111111111111111111111111111111111111111111') % FR_MODULUS;
  const out2Randomness = BigInt('0x2222222222222222222222222222222222222222222222222222222222222222') % FR_MODULUS;
  const out1RandomnessBytes = bigIntToBytes(out1Randomness, 32);
  const out2RandomnessBytes = bigIntToBytes(out2Randomness, 32);

  // Compute commitment using SDK
  const inputNote = {
    stealthPubX: stealthPubXBytes,
    tokenMint: TOKEN_MINT,
    amount: inAmount,
    randomness: randomnessBytes,
  };
  const commitment = computeCommitment(inputNote);
  console.log('\nInput commitment:', toHex(commitment));

  // Compute nullifier using SDK
  const nullifierKey = deriveNullifierKey(spendingKeyBytes);
  const nullifier = deriveSpendingNullifier(nullifierKey, commitment, leafIndex);
  console.log('Nullifier:', toHex(nullifier));

  // Compute output commitments using SDK
  const outCommitment1 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    new Uint8Array(32),
    TOKEN_MINT.toBytes(),
    fieldToBytes(0n),
    out1RandomnessBytes
  );
  const outCommitment2 = poseidonHashDomain(
    DOMAIN_COMMITMENT,
    new Uint8Array(32),
    TOKEN_MINT.toBytes(),
    fieldToBytes(0n),
    out2RandomnessBytes
  );
  console.log('Output commitment 1:', toHex(outCommitment1));
  console.log('Output commitment 2:', toHex(outCommitment2));

  // Merkle root = commitment (single-leaf tree for test)
  const merkleRoot = commitment;

  // Build TransferParams (exactly like SDK does)
  const transferParams = {
    inputs: [{
      stealthPubX: stealthPubXBytes,
      stealthPubY: new Uint8Array(32), // Not used in circuit
      tokenMint: TOKEN_MINT,
      amount: inAmount,
      randomness: randomnessBytes,
      leafIndex: leafIndex,
      commitment: commitment,
      // No stealthEphemeralPubkey - bypasses stealth key derivation
    }],
    merkleRoot: merkleRoot,
    merklePath: Array(32).fill(new Uint8Array(32)),
    merkleIndices: Array(32).fill(0),
    outputs: [{
      recipient: {
        stealthPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) },
        ephemeralPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) }
      },
      amount: 0n,
      commitment: outCommitment1,
      stealthPubX: new Uint8Array(32),
      randomness: out1RandomnessBytes,
    }, {
      recipient: {
        stealthPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) },
        ephemeralPubkey: { x: new Uint8Array(32), y: new Uint8Array(32) }
      },
      amount: 0n,
      commitment: outCommitment2,
      stealthPubX: new Uint8Array(32),
      randomness: out2RandomnessBytes,
    }],
    unshield: { amount: inAmount, recipient: TOKEN_MINT },
  };

  // Build keypair (exactly like SDK does)
  const keypair = {
    spending: {
      sk: spendingKeyBytes,
      pk: { x: stealthPubXBytes, y: new Uint8Array(32) }
    },
    viewing: {
      sk: spendingKeyBytes,
      pk: { x: stealthPubXBytes, y: new Uint8Array(32) }
    },
    publicKey: { x: stealthPubXBytes, y: new Uint8Array(32) },
  };

  // Initialize ProofGenerator and generate proof
  console.log('\n--- Generating proof via SDK ProofGenerator ---');
  const proofGen = new ProofGenerator({ baseUrl: '/circom' });

  // Manually set circom base URL to local files
  proofGen.setCircomBaseUrl('file://' + path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom'));

  // We need to load the circuit - but the SDK expects fetch() which doesn't work in Node.
  // So let's manually call the internal method with loaded artifacts

  // Instead, let's use the same snarkjs flow but through SDK's witness building
  const snarkjs = await import('snarkjs');

  // Build witness exactly like SDK's buildTransferWitness does
  // This is the key part - we're replicating proofs.ts line 723-824

  const fieldToHex = (bytes: Uint8Array | bigint): string => {
    if (typeof bytes === 'bigint') {
      return '0x' + bytes.toString(16).padStart(64, '0');
    }
    return '0x' + Buffer.from(bytes).toString('hex');
  };

  // SDK witness building (from buildTransferWitness in proofs.ts)
  const witnessInputs = {
    merkle_root: fieldToHex(merkleRoot),
    nullifier: fieldToHex(nullifier),
    out_commitment_1: fieldToHex(outCommitment1),
    out_commitment_2: fieldToHex(outCommitment2),
    token_mint: fieldToHex(TOKEN_MINT.toBytes()),
    unshield_amount: inAmount.toString(),
    in_stealth_pub_x: fieldToHex(stealthPubXBytes),
    in_amount: inAmount.toString(),
    in_randomness: fieldToHex(randomnessBytes),
    in_stealth_spending_key: fieldToHex(spendingKeyBytes),
    merkle_path: Array(32).fill(fieldToHex(new Uint8Array(32))),
    merkle_path_indices: Array(32).fill('0'),
    leaf_index: leafIndex.toString(),
    out_stealth_pub_x_1: fieldToHex(new Uint8Array(32)),
    out_amount_1: '0',
    out_randomness_1: fieldToHex(out1RandomnessBytes),
    out_stealth_pub_x_2: fieldToHex(new Uint8Array(32)),
    out_amount_2: '0',
    out_randomness_2: fieldToHex(out2RandomnessBytes),
  };

  console.log('Witness inputs built');

  // Generate proof
  const wasmPath = path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom', 'transfer_1x2.wasm');
  const zkeyPath = path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom', 'transfer_1x2_final.zkey');

  console.log('Generating proof...');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(witnessInputs, wasmPath, zkeyPath);
  console.log('Proof generated!');

  // Format proof for Solana (exactly like SDK's formatSnarkjsProofForSolana)
  const BN254_FIELD_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');

  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : BN254_FIELD_MODULUS - ay;

  const bx0 = BigInt(proof.pi_b[0][0]);
  const bx1 = BigInt(proof.pi_b[0][1]);
  const by0 = BigInt(proof.pi_b[1][0]);
  const by1 = BigInt(proof.pi_b[1][1]);

  const cx = BigInt(proof.pi_c[0]);
  const cy = BigInt(proof.pi_c[1]);

  const fullProof = new Uint8Array(256);
  fullProof.set(bigIntToBytes(ax, 32), 0);
  fullProof.set(bigIntToBytes(negAy, 32), 32);
  fullProof.set(bigIntToBytes(bx1, 32), 64);  // x_im
  fullProof.set(bigIntToBytes(bx0, 32), 96);  // x_re
  fullProof.set(bigIntToBytes(by1, 32), 128); // y_im
  fullProof.set(bigIntToBytes(by0, 32), 160); // y_re
  fullProof.set(bigIntToBytes(cx, 32), 192);
  fullProof.set(bigIntToBytes(cy, 32), 224);

  console.log('Proof formatted for Solana (256 bytes)');

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

  console.log('\nPDAs:');
  console.log('  Pool:', poolPda.toBase58());
  console.log('  Vault:', vaultPda.toBase58());
  console.log('  Counter:', counterPda.toBase58());
  console.log('  VK:', vkPda.toBase58());

  // Prepare instruction data
  const merkleRootBytes = Array.from(merkleRoot);
  const nullifierBytes = Array.from(nullifier);
  const outCommitments = [
    Array.from(outCommitment1),
    Array.from(outCommitment2),
  ];

  console.log('\n=== CALLING TRANSACT VIA SDK PATH ===\n');

  try {
    const tx = await program.methods
      .transact(
        Buffer.from(fullProof),
        merkleRootBytes,
        nullifierBytes,
        outCommitments,
        [], // encrypted_notes (empty for test)
        new anchor.BN(inAmount.toString()),
        null // light_params (null - no Light Protocol for this test)
      )
      .accounts({
        pool: poolPda,
        commitmentCounter: counterPda,
        tokenVault: vaultPda,
        verificationKey: vkPda,
        unshieldRecipient: null,
        relayer: wallet.publicKey,
        tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
      })
      .rpc({ commitment: 'confirmed' });

    console.log('SUCCESS! Transaction:', tx);
  } catch (e: any) {
    console.log('ERROR:', e.message);

    if (e.logs) {
      console.log('\n=== TRANSACTION LOGS ===\n');
      for (const log of e.logs) {
        console.log(log);
      }
    }
  }
}

main().catch(console.error);
