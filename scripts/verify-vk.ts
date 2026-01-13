import { PublicKey, Connection } from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const VK_SEED = Buffer.from('vk');

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

async function main() {
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  const circuitId = padCircuitId('transfer_1x2');
  const [vkPda] = PublicKey.findProgramAddressSync(
    [VK_SEED, circuitId],
    PROGRAM_ID
  );

  console.log('VK PDA:', vkPda.toBase58());

  const info = await connection.getAccountInfo(vkPda);
  if (!info) {
    console.log('VK not found!');
    return;
  }

  console.log('Account data length:', info.data.length);

  // Skip discriminator (8) + circuit_id (32) = 40 bytes, then read vec length
  const vecLen = info.data.readUInt32LE(40);
  console.log('VK data vec length:', vecLen);

  // Read VK data starting at offset 44
  const vkData = info.data.slice(44, 44 + vecLen);
  console.log('VK data length:', vkData.length);

  // Parse VK structure
  console.log('\n=== VK Structure ===');
  let offset = 0;

  console.log('alpha_g1 (64 bytes):', vkData.slice(offset, offset + 64).toString('hex').slice(0, 32) + '...');
  offset += 64;

  console.log('beta_g2 (128 bytes):', vkData.slice(offset, offset + 128).toString('hex').slice(0, 32) + '...');
  offset += 128;

  console.log('gamma_g2 (128 bytes):', vkData.slice(offset, offset + 128).toString('hex').slice(0, 32) + '...');
  offset += 128;

  console.log('delta_g2 (128 bytes):', vkData.slice(offset, offset + 128).toString('hex').slice(0, 32) + '...');
  offset += 128;

  const icCount = vkData.readUInt32BE(offset);
  console.log('IC count:', icCount);
  offset += 4;

  console.log('IC[0]:', vkData.slice(offset, offset + 64).toString('hex').slice(0, 32) + '...');

  console.log('\nExpected VK size: 64 + 128 + 128 + 128 + 4 + (7 * 64) =', 64 + 128 + 128 + 128 + 4 + (7 * 64));
  console.log('Actual VK size:', vkData.length);
}

main().catch(console.error);
