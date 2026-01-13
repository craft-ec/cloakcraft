/**
 * Verify VK data was uploaded correctly
 */
import { Connection, PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");
const VK_SEED = Buffer.from("vk");

const CIRCUITS = [
  { id: "transfer_1x2", expectedSize: 652 },
  { id: "transfer_1x3", expectedSize: 652 },
  { id: "adapter_1x1", expectedSize: 976 },
  { id: "adapter_1x2", expectedSize: 976 },
  { id: "market_order_create", expectedSize: 652 },
  { id: "market_order_fill", expectedSize: 976 },
  { id: "market_order_cancel", expectedSize: 652 },
  { id: "swap_add_liquidity", expectedSize: 652 },
  { id: "swap_remove_liquidity", expectedSize: 900 },
  { id: "swap_swap", expectedSize: 976 },
  { id: "governance_encrypted_submit", expectedSize: 652 },
];

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("Verifying VK accounts on devnet...\n");

  let allOk = true;
  for (const circuit of CIRCUITS) {
    const circuitId = padCircuitId(circuit.id);
    const [vkPda] = PublicKey.findProgramAddressSync(
      [VK_SEED, circuitId],
      PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(vkPda);
    if (accountInfo) {
      // Account structure: 8 (discriminator) + 32 (circuit_id) + 4 (vec len) + vk_data + 32 (authority) + 1 (is_active) + 1 (bump)
      // The vec len is at offset 40
      const vecLen = accountInfo.data.readUInt32LE(40);
      const status = vecLen === circuit.expectedSize ? "✓" : `✗ (got ${vecLen})`;
      console.log(`[${circuit.id}] VK data: ${vecLen}/${circuit.expectedSize} bytes ${status}`);
      if (vecLen !== circuit.expectedSize) {
        allOk = false;
      }
    } else {
      console.log(`[${circuit.id}] Account not found! ✗`);
      allOk = false;
    }
  }

  console.log(allOk ? "\nAll VKs verified ✓" : "\nSome VKs need attention!");
}

main().catch(console.error);
