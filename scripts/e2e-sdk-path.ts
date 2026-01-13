/**
 * End-to-end test using SDK/frontend path
 *
 * Uses the same code paths as the frontend:
 * - SDK's computeCommitment, deriveNullifierKey, deriveSpendingNullifier
 * - SDK's proof formatting via snarkjs-prover logic
 */
// @ts-nocheck
import * as snarkjs from 'snarkjs';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';

// SDK imports - exact same as frontend uses
import { initPoseidon, bytesToField, fieldToBytes, DOMAIN_COMMITMENT, poseidonHashDomain } from '../packages/sdk/src/crypto/poseidon';
import { computeCommitment, generateRandomness } from '../packages/sdk/src/crypto/commitment';
import { deriveNullifierKey, deriveSpendingNullifier } from '../packages/sdk/src/crypto/nullifier';

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
  console.log('END-TO-END TEST: SDK/FRONTEND PATH');
  console.log('='.repeat(80));

  // Initialize SDK's Poseidon (same as frontend does)
  await initPoseidon();
  console.log('SDK Poseidon initialized');

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

  // Shield amount
  const SHIELD_AMOUNT = 1_000_000n;
  console.log('\nShield amount:', SHIELD_AMOUNT.toString());

  // Generate values using SDK functions (exactly like frontend)
  const stealthPubX = generateRandomness(); // SDK function
  const randomness = generateRandomness();  // SDK function
  const spendingKey = generateRandomness(); // Would come from wallet keypair

  console.log('\n=== STEP 1: SHIELD (SDK path) ===\n');

  // Compute commitment using SDK's computeCommitment (exact frontend path)
  const note = {
    stealthPubX: stealthPubX,
    tokenMint: TOKEN_MINT,
    amount: SHIELD_AMOUNT,
    randomness: randomness,
  };
  const commitment = computeCommitment(note);
  console.log('Commitment (SDK):', toHex(commitment));

  // Get current leaf index
  const counterAccount = await connection.getAccountInfo(counterPda);
  const leafIndex = counterAccount ? Number(counterAccount.data.readBigUInt64LE(40)) : 0;
  console.log('Leaf index:', leafIndex);

  // Shield
  const stealthEphemeralPubkey = new Uint8Array(64);

  try {
    const shieldTx = await program.methods
      .shield(
        Array.from(commitment),
        new anchor.BN(SHIELD_AMOUNT.toString()),
        Array.from(stealthEphemeralPubkey),
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

  console.log('\n=== STEP 2: UNSHIELD (SDK path) ===\n');

  // Compute nullifier using SDK functions (exact frontend path)
  const nullifierKey = deriveNullifierKey(spendingKey);
  const nullifier = deriveSpendingNullifier(nullifierKey, commitment, leafIndex);
  console.log('Nullifier (SDK):', toHex(nullifier));

  // Compute output commitments using SDK's poseidonHashDomain
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

  console.log('Output commitment 1:', toHex(outCommitment1));
  console.log('Output commitment 2:', toHex(outCommitment2));

  // Merkle root = commitment (single-leaf approximation)
  const merkleRoot = commitment;

  // Build witness using SDK's fieldToHex pattern (exact frontend path)
  const fieldToHex = (bytes: Uint8Array): string => {
    return '0x' + Buffer.from(bytes).toString('hex');
  };

  const witnessInputs = {
    merkle_root: fieldToHex(merkleRoot),
    nullifier: fieldToHex(nullifier),
    out_commitment_1: fieldToHex(outCommitment1),
    out_commitment_2: fieldToHex(outCommitment2),
    token_mint: fieldToHex(TOKEN_MINT.toBytes()),
    unshield_amount: SHIELD_AMOUNT.toString(),
    in_stealth_pub_x: fieldToHex(stealthPubX),
    in_amount: SHIELD_AMOUNT.toString(),
    in_randomness: fieldToHex(randomness),
    in_stealth_spending_key: fieldToHex(spendingKey),
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

  // Generate proof using same paths as frontend
  console.log('Generating proof (SDK path)...');
  const wasmPath = path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom', 'transfer_1x2.wasm');
  const zkeyPath = path.join(__dirname, '..', 'apps', 'demo', 'public', 'circom', 'transfer_1x2_final.zkey');

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(witnessInputs, wasmPath, zkeyPath);
  console.log('Proof generated!');

  // Format proof using SDK's formatSnarkjsProofForSolana logic
  const ax = BigInt(proof.pi_a[0]);
  const ay = BigInt(proof.pi_a[1]);
  const negAy = ay === 0n ? 0n : FQ_MODULUS - ay;

  const bx0 = BigInt(proof.pi_b[0][0]); // real
  const bx1 = BigInt(proof.pi_b[0][1]); // imaginary
  const by0 = BigInt(proof.pi_b[1][0]); // real
  const by1 = BigInt(proof.pi_b[1][1]); // imaginary

  const cx = BigInt(proof.pi_c[0]);
  const cy = BigInt(proof.pi_c[1]);

  const fullProof = new Uint8Array(256);
  fullProof.set(bigIntToBytes(ax, 32), 0);
  fullProof.set(bigIntToBytes(negAy, 32), 32);
  fullProof.set(bigIntToBytes(bx1, 32), 64);  // x_im first (SDK order)
  fullProof.set(bigIntToBytes(bx0, 32), 96);  // x_re second
  fullProof.set(bigIntToBytes(by1, 32), 128); // y_im third
  fullProof.set(bigIntToBytes(by0, 32), 160); // y_re fourth
  fullProof.set(bigIntToBytes(cx, 32), 192);
  fullProof.set(bigIntToBytes(cy, 32), 224);

  console.log('Proof formatted for Solana');

  // Submit transaction
  console.log('\nSubmitting unshield transaction...');

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

    console.log('\n' + '='.repeat(80));
    console.log('SUCCESS! SDK PATH WORKS END-TO-END');
    console.log('TX:', tx);
    console.log('='.repeat(80));

    // Check balances
    const vaultBalance = await connection.getTokenAccountBalance(vaultPda);
    console.log('\nVault balance:', vaultBalance.value.uiAmount);

  } catch (e: any) {
    console.log('ERROR:', e.message);
    if (e.logs) {
      console.log('\n=== LOGS ===');
      e.logs.forEach((l: string) => console.log(l));
    }
  }
}

main().catch(console.error);
