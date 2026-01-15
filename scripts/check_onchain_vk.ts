import { Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

const PROGRAM_ID = new PublicKey("fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP");
const VK_SEED = Buffer.from("vk");

function padCircuitId(id: string): Buffer {
  const buf = Buffer.alloc(32);
  buf.write(id);
  return buf;
}

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const circuitName = process.argv[2] || "transfer_1x2";
  const circuitId = padCircuitId(circuitName);
  const [vkPda] = PublicKey.findProgramAddressSync([VK_SEED, circuitId], PROGRAM_ID);

  console.log("Checking VK for:", circuitName);
  console.log("VK PDA:", vkPda.toBase58());

  const accountInfo = await connection.getAccountInfo(vkPda);
  if (!accountInfo) {
    console.log("Account not found");
    return;
  }

  console.log("Account data length:", accountInfo.data.length);

  // Load file VK for comparison
  const vkPath = path.join(__dirname, "..", "keys", `${circuitName}.vk`);
  const fileVk = fs.readFileSync(vkPath);
  console.log("File VK length:", fileVk.length);
  console.log("File alpha first 8:", fileVk.slice(0, 8).toString("hex"));
  
  // First 8 bytes are discriminator
  console.log("\nDiscriminator:", accountInfo.data.slice(0, 8).toString("hex"));
  
  // Search for file alpha pattern in account data
  const alphaPattern = fileVk.slice(0, 8).toString("hex");
  for (let i = 0; i < accountInfo.data.length - 8; i++) {
    if (accountInfo.data.slice(i, i+8).toString("hex") === alphaPattern) {
      console.log("\nFound VK data at offset:", i);
      
      // Check if all bytes match
      let matchLen = 0;
      for (let j = 0; j < Math.min(fileVk.length, accountInfo.data.length - i); j++) {
        if (fileVk[j] === accountInfo.data[i + j]) {
          matchLen++;
        } else {
          console.log("Mismatch at byte", j);
          break;
        }
      }
      console.log("Consecutive matching bytes:", matchLen);
      console.log("VK on-chain matches file:", matchLen >= fileVk.length - 8);
      break;
    }
  }
}

main().catch(console.error);
