/**
 * Light Protocol Account Order Analysis
 *
 * Documents the correct remaining_accounts order for Light Protocol CPI calls.
 * Based on CompressionCpiAccountIndex enum from light-sdk-types.
 */

import {
  createRpc,
  bn,
  defaultTestStateTreeAccounts,
  defaultStaticAccountsStruct,
  deriveAddressSeed,
  deriveAddress,
} from "@lightprotocol/stateless.js";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey("HsQk1VmzbDwXZnQfevgJvHAfYioFmKJKCBgfuTFKVJAu");

// Light Protocol program IDs
const LIGHT_SYSTEM_PROGRAM = new PublicKey("SySTEM1eSU2p4BGQfQpimFEWWSC1XDFeun3Nqzz3rT7");
const ACCOUNT_COMPRESSION_PROGRAM = new PublicKey("compr6CUsB5m2jS4Y3831ztGSTnDpnKJTKS95d64XVq");
const NOOP_PROGRAM = new PublicKey("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV");

// CPI Signer PDA - derived with seeds ["cpi_authority"] from program ID
// This is the PDA that signs Light System Program CPIs
const [CPI_SIGNER_PDA] = PublicKey.findProgramAddressSync(
  [Buffer.from("cpi_authority")],
  PROGRAM_ID
);

async function main() {
  const treeAccounts = defaultTestStateTreeAccounts();
  const staticAccounts = defaultStaticAccountsStruct();

  console.log("Light Protocol Account Order Analysis\n");
  console.log("=".repeat(60));

  console.log("\n1. Tree Accounts (from defaultTestStateTreeAccounts):");
  console.log(`   merkleTree: ${treeAccounts.merkleTree.toBase58()}`);
  console.log(`   nullifierQueue: ${treeAccounts.nullifierQueue.toBase58()}`);
  console.log(`   addressTree: ${treeAccounts.addressTree.toBase58()}`);
  console.log(`   addressQueue: ${treeAccounts.addressQueue.toBase58()}`);

  console.log("\n2. Static Accounts (from defaultStaticAccountsStruct):");
  console.log(`   registeredProgramPda: ${staticAccounts.registeredProgramPda.toBase58()}`);
  console.log(`   noopProgram: ${staticAccounts.noopProgram.toBase58()}`);
  console.log(`   accountCompressionProgram: ${staticAccounts.accountCompressionProgram.toBase58()}`);
  console.log(`   accountCompressionAuthority: ${staticAccounts.accountCompressionAuthority.toBase58()}`);

  console.log("\n3. Program IDs:");
  console.log(`   Light System Program: ${LIGHT_SYSTEM_PROGRAM.toBase58()}`);
  console.log(`   Account Compression: ${ACCOUNT_COMPRESSION_PROGRAM.toBase58()}`);
  console.log(`   Noop Program: ${NOOP_PROGRAM.toBase58()}`);
  console.log(`   CPI Signer PDA: ${CPI_SIGNER_PDA.toBase58()}`);

  console.log("\n4. CORRECT remaining_accounts order:");
  console.log("   Based on CompressionCpiAccountIndex enum from light-sdk-types");
  console.log("");

  const remainingAccounts = [
    { name: "LightSystemProgram", pubkey: LIGHT_SYSTEM_PROGRAM },
    { name: "Authority (CPI Signer PDA)", pubkey: CPI_SIGNER_PDA },
    { name: "RegisteredProgramPda", pubkey: staticAccounts.registeredProgramPda },
    { name: "NoopProgram", pubkey: NOOP_PROGRAM },
    { name: "AccountCompressionAuthority", pubkey: staticAccounts.accountCompressionAuthority },
    { name: "AccountCompressionProgram", pubkey: ACCOUNT_COMPRESSION_PROGRAM },
    { name: "InvokingProgram (our program)", pubkey: PROGRAM_ID },
    { name: "SolPoolPda (placeholder)", pubkey: LIGHT_SYSTEM_PROGRAM },
    { name: "DecompressionRecipient (placeholder)", pubkey: LIGHT_SYSTEM_PROGRAM },
    { name: "SystemProgram", pubkey: SystemProgram.programId },
    { name: "CpiContext (placeholder)", pubkey: LIGHT_SYSTEM_PROGRAM },
    { name: "State Merkle Tree (output tree)", pubkey: treeAccounts.merkleTree },
    { name: "Nullifier Queue", pubkey: treeAccounts.nullifierQueue },
    { name: "Address Tree", pubkey: treeAccounts.addressTree },
    { name: "Address Queue", pubkey: treeAccounts.addressQueue },
  ];

  remainingAccounts.forEach((acc, i) => {
    console.log(`   [${i.toString().padStart(2)}] ${acc.name}: ${acc.pubkey.toBase58()}`);
  });

  console.log("\n5. Tree index calculation:");
  console.log("   The SDK adds an offset of 8 to tree indices.");
  console.log("   For a tree at remaining_accounts[X], pass index: X - 8");
  console.log("");

  const SDK_TREE_OFFSET = 8;
  const stateTreeIndex = 11;
  const addressTreeIndex = 13;
  const addressQueueIndex = 14;

  console.log(`   State Merkle Tree at [${stateTreeIndex}]: pass outputTreeIndex = ${stateTreeIndex - SDK_TREE_OFFSET}`);
  console.log(`   Address Tree at [${addressTreeIndex}]: pass addressMerkleTreePubkeyIndex = ${addressTreeIndex - SDK_TREE_OFFSET}`);
  console.log(`   Address Queue at [${addressQueueIndex}]: pass addressQueuePubkeyIndex = ${addressQueueIndex - SDK_TREE_OFFSET}`);

  console.log("\n6. Example LightParams:");
  console.log(`   {
     validityProof: { a: [...], b: [...], c: [...] },
     addressTreeInfo: {
       addressMerkleTreePubkeyIndex: ${addressTreeIndex - SDK_TREE_OFFSET},  // Address tree
       addressQueuePubkeyIndex: ${addressQueueIndex - SDK_TREE_OFFSET},      // Address queue
       rootIndex: <from getValidityProofV0 response>,
     },
     outputTreeIndex: ${stateTreeIndex - SDK_TREE_OFFSET},  // State merkle tree
   }`);
}

main().catch(console.error);
