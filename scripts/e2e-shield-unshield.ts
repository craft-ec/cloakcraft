/**
 * End-to-end test: Shield tokens then Unshield them
 */
// @ts-nocheck
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { buildPoseidon } from 'circomlibjs';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const TOKEN_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');

const FR_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
const FQ_MODULUS = BigInt('21888242871839275222246405745257275088696311157297823662689037894645226208583');

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

function generateRandomField(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBigInt(bytes) % FR_MODULUS;
}

async function main() {
  console.log('='.repeat(80));
  console.log('END-TO-END: SHIELD THEN UNSHIELD');
  console.log('='.repeat(80));

  // Initialize Poseidon
  const poseidon = await buildPoseidon();
  const F = poseidon.F;
  const poseidonHash = (...inputs: bigint[]): bigint => {
    const result = poseidon(inputs.map(x => F.e(x)));
    return BigInt(F.toString(result));
  };

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

  // Get user's token account
  const userTokenAccount = getAssociatedTokenAddressSync(TOKEN_MINT, wallet.publicKey);
  console.log('User token account:', userTokenAccount.toBase58());

  // Check user's token balance
  const userBalance = await connection.getTokenAccountBalance(userTokenAccount);
  console.log('User token balance:', userBalance.value.uiAmount);

  // Shield amount (use small amount for test)
  const SHIELD_AMOUNT = 1_000_000n; // 1 token (assuming 6 decimals)
  console.log('\nShield amount:', SHIELD_AMOUNT.toString());

  // Generate random values for the shielded note
  const stealthPubX = generateRandomField();
  const randomness = generateRandomField();
  const spendingKey = generateRandomField(); // This would normally come from user's keypair
  const tokenMint = bytesToBigInt(TOKEN_MINT.toBytes());

  console.log('\n=== STEP 1: SHIELD TOKENS ===\n');

  // Compute commitment for the shield
  const commitment = poseidonHash(COMMITMENT_DOMAIN, stealthPubX, tokenMint, SHIELD_AMOUNT, randomness);
  console.log('Shield commitment:', fieldToHex(commitment));

  // Get current leaf index
  const counterAccount = await connection.getAccountInfo(counterPda);
  const leafIndex = counterAccount ? Number(counterAccount.data.readBigUInt64LE(40)) : 0;
  console.log('Current leaf index:', leafIndex);

  // Shield instruction
  // Args: commitment [u8;32], amount u64, stealth_ephemeral_pubkey [u8;64], encrypted_note bytes, light_params Option
  const commitmentBytes = Array.from(bigIntToBytes(commitment, 32));
  const stealthEphemeralPubkey = new Uint8Array(64); // Dummy for test

  try {
    const shieldTx = await program.methods
      .shield(
        commitmentBytes,
        new anchor.BN(SHIELD_AMOUNT.toString()),
        Array.from(stealthEphemeralPubkey),
        Buffer.from([]), // encrypted_note (empty for test)
        null // light_params (null - no Light Protocol)
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

    console.log('Shield SUCCESS! TX:', shieldTx);
    console.log('Waiting for confirmation...');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e: any) {
    console.log('Shield ERROR:', e.message);
    if (e.logs) {
      console.log('\nShield logs:');
      e.logs.forEach((log: string) => console.log(' ', log));
    }
    return;
  }

  // Check vault balance after shield
  const vaultBalance = await connection.getTokenAccountBalance(vaultPda);
  console.log('\nVault balance after shield:', vaultBalance.value.uiAmount);

  console.log('\n=== STEP 2: UNSHIELD TOKENS ===\n');

  // Now unshield the tokens we just shielded
  // The commitment is now in the pool at leafIndex

  // Compute nullifier
  const nullifierKey = poseidonHash(NULLIFIER_KEY_DOMAIN, spendingKey, 0n);
  const nullifier = poseidonHash(SPENDING_NULLIFIER_DOMAIN, nullifierKey, commitment, BigInt(leafIndex));
  console.log('Nullifier:', fieldToHex(nullifier));

  // Output commitments (dummy - we're unshielding everything)
  const out1Randomness = generateRandomField();
  const out2Randomness = generateRandomField();
  const outCommitment1 = poseidonHash(COMMITMENT_DOMAIN, 0n, tokenMint, 0n, out1Randomness);
  const outCommitment2 = poseidonHash(COMMITMENT_DOMAIN, 0n, tokenMint, 0n, out2Randomness);

  // Merkle root = commitment (single-leaf tree approximation)
  // In production, this would come from the actual merkle tree
  const merkleRoot = commitment;

  // Build circuit inputs
  const circuitInputs = {
    merkle_root: fieldToHex(merkleRoot),
    nullifier: fieldToHex(nullifier),
    out_commitment_1: fieldToHex(outCommitment1),
    out_commitment_2: fieldToHex(outCommitment2),
    token_mint: fieldToHex(tokenMint),
    unshield_amount: SHIELD_AMOUNT.toString(),
    in_stealth_pub_x: fieldToHex(stealthPubX),
    in_amount: SHIELD_AMOUNT.toString(),
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

  // Generate proof
  console.log('Generating ZK proof...');
  const wasmPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_js', 'transfer_1x2.wasm');
  const zkeyPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'transfer_1x2_final.zkey');
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(circuitInputs, wasmPath, zkeyPath);
  console.log('Proof generated!');

  // Format proof for Solana
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

  // Prepare instruction data
  const merkleRootBytes = Array.from(bigIntToBytes(merkleRoot, 32));
  const nullifierBytes = Array.from(bigIntToBytes(nullifier, 32));
  const outCommitments = [
    Array.from(bigIntToBytes(outCommitment1, 32)),
    Array.from(bigIntToBytes(outCommitment2, 32)),
  ];

  console.log('\nCalling transact (unshield)...');

  try {
    const tx = await program.methods
      .transact(
        Buffer.from(fullProof),
        merkleRootBytes,
        nullifierBytes,
        outCommitments,
        [], // encrypted_notes
        new anchor.BN(SHIELD_AMOUNT.toString()),
        null // light_params
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

    console.log('\n' + '='.repeat(80));
    console.log('UNSHIELD SUCCESS! TX:', tx);
    console.log('='.repeat(80));

    // Check final balances
    const finalUserBalance = await connection.getTokenAccountBalance(userTokenAccount);
    const finalVaultBalance = await connection.getTokenAccountBalance(vaultPda);
    console.log('\nFinal user balance:', finalUserBalance.value.uiAmount);
    console.log('Final vault balance:', finalVaultBalance.value.uiAmount);

  } catch (e: any) {
    console.log('Unshield ERROR:', e.message);
    if (e.logs) {
      console.log('\n=== TRANSACTION LOGS ===\n');
      for (const log of e.logs) {
        console.log(log);
      }
    }
  }
}

main().catch(console.error);
