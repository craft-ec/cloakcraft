/**
 * Submit the exact test proof to Solana and capture detailed logs
 */
// @ts-nocheck
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { buildPoseidon } from 'circomlibjs';
import * as os from 'os';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const TOKEN_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');

const FQ_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');
const FR_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

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
  console.log('SUBMIT TEST PROOF TO SOLANA');
  console.log('='.repeat(80));

  // Initialize Poseidon
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const poseidonHash = (...inputs: bigint[]): bigint => {
    const result = poseidon(inputs.map(x => F.e(x)));
    return BigInt(F.toString(result));
  };

  // Create test values (same as trace script)
  const stealthPubX = BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef') % FR_MODULUS;
  const tokenMint = bytesToBigInt(TOKEN_MINT.toBytes());
  const inAmount = 1000000n;
  const randomness = BigInt('0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890') % FR_MODULUS;
  const spendingKey = BigInt('0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba') % FR_MODULUS;
  const leafIndex = 0n;

  // Compute values
  const commitment = poseidonHash(COMMITMENT_DOMAIN, stealthPubX, tokenMint, inAmount, randomness);
  const nullifierKey = poseidonHash(NULLIFIER_KEY_DOMAIN, spendingKey, 0n);
  const nullifier = poseidonHash(SPENDING_NULLIFIER_DOMAIN, nullifierKey, commitment, leafIndex);

  const out1StealthPubX = 0n;
  const out1Amount = 0n;
  const out1Randomness = BigInt('0x1111111111111111111111111111111111111111111111111111111111111111') % FR_MODULUS;
  const outCommitment1 = poseidonHash(COMMITMENT_DOMAIN, out1StealthPubX, tokenMint, out1Amount, out1Randomness);

  const out2StealthPubX = 0n;
  const out2Amount = 0n;
  const out2Randomness = BigInt('0x2222222222222222222222222222222222222222222222222222222222222222') % FR_MODULUS;
  const outCommitment2 = poseidonHash(COMMITMENT_DOMAIN, out2StealthPubX, tokenMint, out2Amount, out2Randomness);

  const merkleRoot = commitment;
  const unshieldAmount = inAmount;

  // Build circuit inputs
  const circuitInputs = {
    merkle_root: fieldToHex(merkleRoot),
    nullifier: fieldToHex(nullifier),
    out_commitment_1: fieldToHex(outCommitment1),
    out_commitment_2: fieldToHex(outCommitment2),
    token_mint: fieldToHex(tokenMint),
    unshield_amount: unshieldAmount.toString(),
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

  // Generate proof
  console.log('\nGenerating proof...');
  const wasmPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_js', 'transfer_1x2.wasm');
  const zkeyPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_final.zkey');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInputs, wasmPath, zkeyPath);
  console.log('Proof generated!');

  // Encode proof for Solana
  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : FQ_MODULUS - ay;

  const bx_re = BigInt(proof.pi_b[0][0]);
  const bx_im = BigInt(proof.pi_b[0][1]);
  const by_re = BigInt(proof.pi_b[1][0]);
  const by_im = BigInt(proof.pi_b[1][1]);

  const cx = BigInt(proof.pi_c[0]);
  const cy = BigInt(proof.pi_c[1]);

  const fullProof = new Uint8Array(256);
  fullProof.set(bigIntToBytes(ax, 32), 0);
  fullProof.set(bigIntToBytes(negAy, 32), 32);
  fullProof.set(bigIntToBytes(bx_im, 32), 64);
  fullProof.set(bigIntToBytes(bx_re, 32), 96);
  fullProof.set(bigIntToBytes(by_im, 32), 128);
  fullProof.set(bigIntToBytes(by_re, 32), 160);
  fullProof.set(bigIntToBytes(cx, 32), 192);
  fullProof.set(bigIntToBytes(cy, 32), 224);

  console.log('\nProof encoded (256 bytes)');
  console.log('A.x:', toHex(fullProof.slice(0, 32)));
  console.log('A.y (neg):', toHex(fullProof.slice(32, 64)));
  console.log('B.x_im:', toHex(fullProof.slice(64, 96)));
  console.log('B.x_re:', toHex(fullProof.slice(96, 128)));
  console.log('B.y_im:', toHex(fullProof.slice(128, 160)));
  console.log('B.y_re:', toHex(fullProof.slice(160, 192)));
  console.log('C.x:', toHex(fullProof.slice(192, 224)));
  console.log('C.y:', toHex(fullProof.slice(224, 256)));

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
  const merkleRootBytes = Array.from(bigIntToBytes(merkleRoot, 32));
  const nullifierBytes = Array.from(bigIntToBytes(nullifier, 32));
  const outCommitments = [
    Array.from(bigIntToBytes(outCommitment1, 32)),
    Array.from(bigIntToBytes(outCommitment2, 32)),
  ];

  console.log('\n=== CALLING TRANSACT ===\n');

  try {
    const tx = await program.methods
      .transact(
        Buffer.from(fullProof),
        merkleRootBytes,
        nullifierBytes,
        outCommitments,
        [], // encrypted_notes (empty for test)
        new anchor.BN(unshieldAmount.toString()),
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

    // Try to get logs
    if (e.logs) {
      console.log('\n=== TRANSACTION LOGS ===\n');
      for (const log of e.logs) {
        console.log(log);
      }
    }
  }
}

main().catch(console.error);
