import * as fs from 'fs';
import * as path from 'path';

// Load original snarkjs VK
const vkJsonPath = path.join(__dirname, '..', 'circom-circuits', 'build', 'transfer_1x2', 'verification_key.json');
const vkJson = JSON.parse(fs.readFileSync(vkJsonPath, 'utf-8'));

// Load converted binary VK
const vkBinPath = path.join(__dirname, '..', 'circuits', 'target', 'transfer_1x2.vk');
const vkBin = fs.readFileSync(vkBinPath);

console.log('=== VK Encoding Verification ===\n');
console.log('Binary VK size:', vkBin.length, 'bytes\n');

// Helper to convert decimal string to 32-byte hex
function decToHex(dec: string): string {
  return BigInt(dec).toString(16).padStart(64, '0');
}

// Helper to read 32 bytes from buffer as hex
function readHex(buf: Buffer, offset: number): string {
  return buf.slice(offset, offset + 32).toString('hex');
}

// Check alpha_g1 (offset 0-63)
console.log('=== alpha_g1 (G1, 64 bytes) ===');
const alpha_x_json = decToHex(vkJson.vk_alpha_1[0]);
const alpha_y_json = decToHex(vkJson.vk_alpha_1[1]);
const alpha_x_bin = readHex(vkBin, 0);
const alpha_y_bin = readHex(vkBin, 32);
console.log('JSON X:', alpha_x_json);
console.log('BIN  X:', alpha_x_bin);
console.log('Match:', alpha_x_json === alpha_x_bin ? '✓' : '✗');
console.log('JSON Y:', alpha_y_json);
console.log('BIN  Y:', alpha_y_bin);
console.log('Match:', alpha_y_json === alpha_y_bin ? '✓' : '✗');

// Check gamma_g2 (offset 192-319)
// Solana expects: x_im || x_re || y_im || y_re
console.log('\n=== gamma_g2 (G2, 128 bytes) ===');
const gamma_x0_json = decToHex(vkJson.vk_gamma_2[0][0]); // x_re
const gamma_x1_json = decToHex(vkJson.vk_gamma_2[0][1]); // x_im
const gamma_y0_json = decToHex(vkJson.vk_gamma_2[1][0]); // y_re
const gamma_y1_json = decToHex(vkJson.vk_gamma_2[1][1]); // y_im

const gamma_xim_bin = readHex(vkBin, 192);
const gamma_xre_bin = readHex(vkBin, 224);
const gamma_yim_bin = readHex(vkBin, 256);
const gamma_yre_bin = readHex(vkBin, 288);

console.log('Solana order: x_im, x_re, y_im, y_re');
console.log('');
console.log('x_im (from JSON x1):', gamma_x1_json);
console.log('x_im (from BIN):    ', gamma_xim_bin);
console.log('Match:', gamma_x1_json === gamma_xim_bin ? '✓' : '✗');
console.log('');
console.log('x_re (from JSON x0):', gamma_x0_json);
console.log('x_re (from BIN):    ', gamma_xre_bin);
console.log('Match:', gamma_x0_json === gamma_xre_bin ? '✓' : '✗');
console.log('');
console.log('y_im (from JSON y1):', gamma_y1_json);
console.log('y_im (from BIN):    ', gamma_yim_bin);
console.log('Match:', gamma_y1_json === gamma_yim_bin ? '✓' : '✗');
console.log('');
console.log('y_re (from JSON y0):', gamma_y0_json);
console.log('y_re (from BIN):    ', gamma_yre_bin);
console.log('Match:', gamma_y0_json === gamma_yre_bin ? '✓' : '✗');

// Check beta_g2 (offset 64-191)
console.log('\n=== beta_g2 (G2, 128 bytes) ===');
const beta_x0_json = decToHex(vkJson.vk_beta_2[0][0]); // x_re
const beta_x1_json = decToHex(vkJson.vk_beta_2[0][1]); // x_im
const beta_y0_json = decToHex(vkJson.vk_beta_2[1][0]); // y_re
const beta_y1_json = decToHex(vkJson.vk_beta_2[1][1]); // y_im

const beta_xim_bin = readHex(vkBin, 64);
const beta_xre_bin = readHex(vkBin, 96);
const beta_yim_bin = readHex(vkBin, 128);
const beta_yre_bin = readHex(vkBin, 160);

console.log('x_im (from JSON x1):', beta_x1_json);
console.log('x_im (from BIN):    ', beta_xim_bin);
console.log('Match:', beta_x1_json === beta_xim_bin ? '✓' : '✗');
console.log('');
console.log('x_re (from JSON x0):', beta_x0_json);
console.log('x_re (from BIN):    ', beta_xre_bin);
console.log('Match:', beta_x0_json === beta_xre_bin ? '✓' : '✗');
