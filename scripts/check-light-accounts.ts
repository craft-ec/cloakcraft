import {
  createRpc,
  LightSystemProgram,
  defaultTestStateTreeAccounts,
  defaultStaticAccountsStruct,
} from "@lightprotocol/stateless.js";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";

async function main() {
  // Check what accounts LightSystemProgram uses
  console.log("LightSystemProgram.programId:", LightSystemProgram.programId?.toBase58());

  // Check the structure
  const staticAccounts = defaultStaticAccountsStruct();
  const treeAccounts = defaultTestStateTreeAccounts();

  console.log("\nStatic accounts:");
  for (const [key, value] of Object.entries(staticAccounts)) {
    if (value instanceof PublicKey) {
      console.log(`  ${key}: ${value.toBase58()}`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }

  console.log("\nTree accounts:");
  for (const [key, value] of Object.entries(treeAccounts)) {
    if (value instanceof PublicKey) {
      console.log(`  ${key}: ${value.toBase58()}`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }

  // Try to see what compress instruction does
  try {
    const ix = await LightSystemProgram.compress({
      payer: Keypair.generate().publicKey,
      toAddress: Keypair.generate().publicKey,
      lamports: 1000,
      outputStateTree: treeAccounts.merkleTree,
    });
    console.log("\nCompress instruction keys:");
    ix.keys.forEach((k, i) => {
      console.log(`  ${i}: ${k.pubkey.toBase58()} (signer: ${k.isSigner}, writable: ${k.isWritable})`);
    });
  } catch (e: any) {
    console.log("Error creating instruction:", e.message);
  }
}

main().catch(console.error);
