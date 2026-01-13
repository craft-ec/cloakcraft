/**
 * Full debug script to trace proof/VK/public inputs through the entire flow
 */
import * as fs from 'fs';
import * as path from 'path';
import { PublicKey, Connection } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');

// BN254 scalar field modulus (Fr)
const FR_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

function decToBytes(dec: string): Buffer {
  const bn = BigInt(dec);
  const hex = bn.toString(16).padStart(64, '0');
  return Buffer.from(hex, 'hex');
}

function decToHex(dec: string): string {
  return BigInt(dec).toString(16).padStart(64, '0');
}

async function main() {
  // Load snarkjs VK
  const vkJsonPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'verification_key.json');
  const vkJson = JSON.parse(fs.readFileSync(vkJsonPath, 'utf-8'));

  console.log('=== snarkjs VK Analysis ===\n');
  console.log('nPublic:', vkJson.nPublic);
  console.log('IC count:', vkJson.IC.length, '(should be nPublic + 1 =', vkJson.nPublic + 1, ')');

  // Load on-chain VK
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const circuitId = padCircuitId('transfer_1x2');
  const [vkPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vk'), circuitId],
    PROGRAM_ID
  );

  const info = await connection.getAccountInfo(vkPda);
  if (!info) {
    console.log('VK not found on-chain!');
    return;
  }

  // Parse on-chain VK
  const vecLen = info.data.readUInt32LE(40);
  const vkData = info.data.slice(44, 44 + vecLen);

  console.log('\n=== On-chain VK Structure ===');
  console.log('Total length:', vkData.length, 'bytes');

  // Extract components
  let offset = 0;
  const alpha_g1 = vkData.slice(offset, offset + 64); offset += 64;
  const beta_g2 = vkData.slice(offset, offset + 128); offset += 128;
  const gamma_g2 = vkData.slice(offset, offset + 128); offset += 128;
  const delta_g2 = vkData.slice(offset, offset + 128); offset += 128;
  const icCount = vkData.readUInt32BE(offset); offset += 4;
  console.log('IC count from on-chain:', icCount);

  // Compare alpha_g1
  console.log('\n=== alpha_g1 comparison ===');
  const json_alpha_x = decToHex(vkJson.vk_alpha_1[0]);
  const json_alpha_y = decToHex(vkJson.vk_alpha_1[1]);
  const onchain_alpha_x = alpha_g1.slice(0, 32).toString('hex');
  const onchain_alpha_y = alpha_g1.slice(32, 64).toString('hex');
  console.log('JSON x:', json_alpha_x);
  console.log('Chain x:', onchain_alpha_x);
  console.log('Match:', json_alpha_x === onchain_alpha_x ? '✓' : '✗ MISMATCH!');
  console.log('JSON y:', json_alpha_y);
  console.log('Chain y:', onchain_alpha_y);
  console.log('Match:', json_alpha_y === onchain_alpha_y ? '✓' : '✗ MISMATCH!');

  // Compare IC[0]
  console.log('\n=== IC[0] comparison ===');
  const json_ic0_x = decToHex(vkJson.IC[0][0]);
  const json_ic0_y = decToHex(vkJson.IC[0][1]);
  const onchain_ic0 = vkData.slice(offset, offset + 64);
  const onchain_ic0_x = onchain_ic0.slice(0, 32).toString('hex');
  const onchain_ic0_y = onchain_ic0.slice(32, 64).toString('hex');
  console.log('JSON x:', json_ic0_x);
  console.log('Chain x:', onchain_ic0_x);
  console.log('Match:', json_ic0_x === onchain_ic0_x ? '✓' : '✗ MISMATCH!');
  console.log('JSON y:', json_ic0_y);
  console.log('Chain y:', onchain_ic0_y);
  console.log('Match:', json_ic0_y === onchain_ic0_y ? '✓' : '✗ MISMATCH!');

  // Compare all IC points
  console.log('\n=== All IC points comparison ===');
  let allICMatch = true;
  for (let i = 0; i < icCount; i++) {
    const json_ic_x = decToHex(vkJson.IC[i][0]);
    const json_ic_y = decToHex(vkJson.IC[i][1]);
    const ic_offset = offset + i * 64;
    const onchain_ic_x = vkData.slice(ic_offset, ic_offset + 32).toString('hex');
    const onchain_ic_y = vkData.slice(ic_offset + 32, ic_offset + 64).toString('hex');

    const xMatch = json_ic_x === onchain_ic_x;
    const yMatch = json_ic_y === onchain_ic_y;

    if (!xMatch || !yMatch) {
      allICMatch = false;
      console.log(`IC[${i}] MISMATCH!`);
      console.log('  JSON x:', json_ic_x);
      console.log('  Chain x:', onchain_ic_x);
      console.log('  JSON y:', json_ic_y);
      console.log('  Chain y:', onchain_ic_y);
    } else {
      console.log(`IC[${i}]: ✓`);
    }
  }

  if (allICMatch) {
    console.log('\nAll IC points match! ✓');
  } else {
    console.log('\nSome IC points MISMATCH! This would cause verification failure.');
  }

  // Compare G2 points (beta, gamma, delta)
  console.log('\n=== G2 points comparison ===');

  // Function to compare G2 points
  const compareG2 = (name: string, jsonPoint: string[][], onchainData: Buffer) => {
    console.log(`\n${name}:`);
    // JSON format: [[x0, x1], [y0, y1], [z0, z1]] where x0=real, x1=imaginary
    // On-chain format: x_im || x_re || y_im || y_re
    const json_x_re = decToHex(jsonPoint[0][0]);
    const json_x_im = decToHex(jsonPoint[0][1]);
    const json_y_re = decToHex(jsonPoint[1][0]);
    const json_y_im = decToHex(jsonPoint[1][1]);

    const onchain_x_im = onchainData.slice(0, 32).toString('hex');
    const onchain_x_re = onchainData.slice(32, 64).toString('hex');
    const onchain_y_im = onchainData.slice(64, 96).toString('hex');
    const onchain_y_re = onchainData.slice(96, 128).toString('hex');

    console.log('x_im: JSON=' + json_x_im.slice(0, 16) + '..., Chain=' + onchain_x_im.slice(0, 16) + '...', json_x_im === onchain_x_im ? '✓' : '✗');
    console.log('x_re: JSON=' + json_x_re.slice(0, 16) + '..., Chain=' + onchain_x_re.slice(0, 16) + '...', json_x_re === onchain_x_re ? '✓' : '✗');
    console.log('y_im: JSON=' + json_y_im.slice(0, 16) + '..., Chain=' + onchain_y_im.slice(0, 16) + '...', json_y_im === onchain_y_im ? '✓' : '✗');
    console.log('y_re: JSON=' + json_y_re.slice(0, 16) + '..., Chain=' + onchain_y_re.slice(0, 16) + '...', json_y_re === onchain_y_re ? '✓' : '✗');
  };

  compareG2('beta_g2', vkJson.vk_beta_2, beta_g2);
  compareG2('gamma_g2', vkJson.vk_gamma_2, gamma_g2);
  compareG2('delta_g2', vkJson.vk_delta_2, delta_g2);

  console.log('\n=== Summary ===');
  console.log('If all points match above, the VK on-chain is correct.');
  console.log('The issue would then be in the proof encoding or public inputs.');
}

main().catch(console.error);
