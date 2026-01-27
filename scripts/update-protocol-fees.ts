/**
 * Update Protocol Fee Configuration
 *
 * Updates fee rates and settings in the ProtocolConfig account.
 *
 * Usage:
 *   npx tsx scripts/update-protocol-fees.ts [options]
 *
 * Options:
 *   --transfer <bps>         Transfer fee in basis points (e.g., 10 = 0.1%)
 *   --unshield <bps>         Unshield fee in basis points (e.g., 25 = 0.25%)
 *   --swap-share <bps>       Protocol's share of LP fees (e.g., 2000 = 20%)
 *   --remove-liquidity <bps> Remove liquidity fee in basis points
 *   --enable-fees            Enable fee collection
 *   --disable-fees           Disable fee collection
 *   --show                   Show current config without updating
 *
 * Examples:
 *   npx tsx scripts/update-protocol-fees.ts --swap-share 2000
 *   npx tsx scripts/update-protocol-fees.ts --transfer 10 --unshield 25
 *   npx tsx scripts/update-protocol-fees.ts --show
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, Connection } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("2VWF9TxMFgzHwbd5WPpYKoqHvtzk3fN66Ka3tVV82nZG");
const PROTOCOL_CONFIG_SEED = Buffer.from("protocol_config");

interface ProtocolConfigData {
  authority: PublicKey;
  treasury: PublicKey;
  transferFeeBps: number;
  unshieldFeeBps: number;
  swapFeeShareBps: number;
  removeLiquidityFeeBps: number;
  feesEnabled: boolean;
  bump: number;
}

async function readProtocolConfig(connection: Connection): Promise<ProtocolConfigData | null> {
  const [configPda] = PublicKey.findProgramAddressSync(
    [PROTOCOL_CONFIG_SEED],
    PROGRAM_ID
  );

  const account = await connection.getAccountInfo(configPda);
  if (!account) return null;

  const data = account.data;
  const offset = 8 + 32 + 32; // discriminator + authority + treasury

  return {
    authority: new PublicKey(data.slice(8, 40)),
    treasury: new PublicKey(data.slice(40, 72)),
    transferFeeBps: data.readUInt16LE(offset),
    unshieldFeeBps: data.readUInt16LE(offset + 2),
    swapFeeShareBps: data.readUInt16LE(offset + 4),
    removeLiquidityFeeBps: data.readUInt16LE(offset + 6),
    feesEnabled: data[offset + 8] === 1,
    bump: data[offset + 9],
  };
}

function displayConfig(config: ProtocolConfigData) {
  console.log("\n=== Current Protocol Config ===");
  console.log("  Authority:", config.authority.toBase58());
  console.log("  Treasury:", config.treasury.toBase58());
  console.log("  Transfer Fee:", config.transferFeeBps, "bps", `(${config.transferFeeBps / 100}%)`);
  console.log("  Unshield Fee:", config.unshieldFeeBps, "bps", `(${config.unshieldFeeBps / 100}%)`);
  console.log("  Swap Fee Share:", config.swapFeeShareBps, "bps", `(${config.swapFeeShareBps / 100}% of LP fees)`);
  console.log("  Remove Liquidity Fee:", config.removeLiquidityFeeBps, "bps", `(${config.removeLiquidityFeeBps / 100}%)`);
  console.log("  Fees Enabled:", config.feesEnabled);
  console.log("  Bump:", config.bump);
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  let transferFeeBps: number | null = null;
  let unshieldFeeBps: number | null = null;
  let swapFeeShareBps: number | null = null;
  let removeLiquidityFeeBps: number | null = null;
  let feesEnabled: boolean | null = null;
  let showOnly = false;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--transfer":
        transferFeeBps = parseInt(args[++i]);
        break;
      case "--unshield":
        unshieldFeeBps = parseInt(args[++i]);
        break;
      case "--swap-share":
        swapFeeShareBps = parseInt(args[++i]);
        break;
      case "--remove-liquidity":
        removeLiquidityFeeBps = parseInt(args[++i]);
        break;
      case "--enable-fees":
        feesEnabled = true;
        break;
      case "--disable-fees":
        feesEnabled = false;
        break;
      case "--show":
        showOnly = true;
        break;
    }
  }

  // Setup connection
  const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "88ac54a3-8850-4686-a521-70d116779182";
  const RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const connection = new Connection(RPC_URL, "confirmed");

  // Load wallet
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
  const wallet = Keypair.fromSecretKey(new Uint8Array(walletData));

  console.log("=== Update Protocol Fees ===\n");
  console.log("Wallet:", wallet.publicKey.toBase58());

  // Read current config
  const currentConfig = await readProtocolConfig(connection);
  if (!currentConfig) {
    console.error("\n[ERROR] Protocol config not found!");
    console.error("Run init-protocol-config.ts first.");
    process.exit(1);
  }

  displayConfig(currentConfig);

  if (showOnly) {
    return;
  }

  // Check if any updates requested
  const hasUpdates =
    transferFeeBps !== null ||
    unshieldFeeBps !== null ||
    swapFeeShareBps !== null ||
    removeLiquidityFeeBps !== null ||
    feesEnabled !== null;

  if (!hasUpdates) {
    console.log("\nNo updates specified. Use --help for options.");
    console.log("Example: npx tsx scripts/update-protocol-fees.ts --swap-share 2000");
    return;
  }

  // Check authority
  if (!currentConfig.authority.equals(wallet.publicKey)) {
    console.error("\n[ERROR] Wallet is not the authority!");
    console.error("Current authority:", currentConfig.authority.toBase58());
    console.error("Your wallet:", wallet.publicKey.toBase58());
    process.exit(1);
  }

  // Show proposed changes
  console.log("\n=== Proposed Changes ===");
  if (transferFeeBps !== null) {
    console.log(`  Transfer Fee: ${currentConfig.transferFeeBps} -> ${transferFeeBps} bps`);
  }
  if (unshieldFeeBps !== null) {
    console.log(`  Unshield Fee: ${currentConfig.unshieldFeeBps} -> ${unshieldFeeBps} bps`);
  }
  if (swapFeeShareBps !== null) {
    console.log(`  Swap Fee Share: ${currentConfig.swapFeeShareBps} -> ${swapFeeShareBps} bps (${swapFeeShareBps / 100}% of LP fees)`);
  }
  if (removeLiquidityFeeBps !== null) {
    console.log(`  Remove Liquidity Fee: ${currentConfig.removeLiquidityFeeBps} -> ${removeLiquidityFeeBps} bps`);
  }
  if (feesEnabled !== null) {
    console.log(`  Fees Enabled: ${currentConfig.feesEnabled} -> ${feesEnabled}`);
  }

  // Load IDL and setup program
  const idlPath = path.join(__dirname, "..", "target", "idl", "cloakcraft.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = new anchor.Program(idl, provider);

  const [protocolConfigPda] = PublicKey.findProgramAddressSync(
    [PROTOCOL_CONFIG_SEED],
    PROGRAM_ID
  );

  console.log("\nUpdating protocol fees...");

  try {
    const tx = await program.methods
      .updateProtocolFees(
        transferFeeBps,
        unshieldFeeBps,
        swapFeeShareBps,
        removeLiquidityFeeBps,
        feesEnabled
      )
      .accounts({
        protocolConfig: protocolConfigPda,
        authority: wallet.publicKey,
      })
      .rpc();

    console.log("\n[OK] Protocol fees updated!");
    console.log("Transaction:", tx);
    console.log("\nView on explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);

    // Read and display new config
    const newConfig = await readProtocolConfig(connection);
    if (newConfig) {
      displayConfig(newConfig);
    }
  } catch (err) {
    console.error("\n[ERROR] Failed to update protocol fees:");
    console.error(err);
    process.exit(1);
  }
}

main().catch(console.error);
