/**
 * Scanner Performance Benchmark
 *
 * Measures scanner performance and identifies bottlenecks.
 *
 * Run: npx ts-node scripts/benchmark-scanner.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { PublicKey } from '@solana/web3.js';
import { LightCommitmentClient, IncrementalScanOptions } from '../packages/sdk/src/light';
import { bytesToField } from '../packages/sdk/src/crypto/poseidon';
import { deriveNullifierKey } from '../packages/sdk/src/crypto/nullifier';
import { initPoseidon } from '../packages/sdk/src/crypto/poseidon';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
const PROGRAM_ID = new PublicKey('fBh7FvBZpex64Qp7i45yuyxh7sH8YstYyxGLmToLRTP');
const TOKEN_A_MINT = new PublicKey('2wuebVsaAWDSRQQkgmYjCMXrmGyuUWe5Uc5Kv8XG4SZm');

if (!HELIUS_API_KEY) {
  console.error('ERROR: HELIUS_API_KEY not set');
  process.exit(1);
}

interface BenchmarkResult {
  name: string;
  duration: number;
  notes: number;
  stats: any;
}

async function runBenchmark(
  name: string,
  fn: () => Promise<any[]>
): Promise<BenchmarkResult> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  return {
    name,
    duration,
    notes: result.length,
    stats: null,
  };
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         CloakCraft Scanner Performance Benchmark        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // Initialize Poseidon
  await initPoseidon();

  // Load wallet
  const walletPath = path.join(__dirname, '.test-privacy-wallet.json');
  if (!fs.existsSync(walletPath)) {
    console.log('No wallet found. Run e2e-amm-swap-test first to create one.');
    console.log('Creating a test viewing key for benchmark...\n');
  }

  let viewingKey: bigint;
  let nullifierKey: Uint8Array;

  if (fs.existsSync(walletPath)) {
    // Wallet can be JSON array of bytes or object with spendingKey
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    let keyBytes: Uint8Array;

    if (Array.isArray(walletData)) {
      // Raw key bytes array
      keyBytes = new Uint8Array(walletData);
    } else if (walletData.spendingKey) {
      // Object with hex-encoded spendingKey
      keyBytes = new Uint8Array(Buffer.from(walletData.spendingKey, 'hex'));
    } else {
      throw new Error('Unknown wallet format');
    }

    viewingKey = bytesToField(keyBytes);
    nullifierKey = deriveNullifierKey(keyBytes);
    console.log(`Loaded wallet: ${viewingKey.toString(16).slice(0, 16)}...`);
  } else {
    // Create random test key for benchmarking
    const testKey = new Uint8Array(32);
    crypto.getRandomValues(testKey);
    viewingKey = bytesToField(testKey);
    nullifierKey = deriveNullifierKey(testKey);
    console.log(`Using random test key: ${viewingKey.toString(16).slice(0, 16)}...`);
  }

  // Create Light client
  const client = new LightCommitmentClient({
    apiKey: HELIUS_API_KEY,
    network: 'devnet',
  });

  // Derive pool PDA
  const [poolPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), TOKEN_A_MINT.toBuffer()],
    PROGRAM_ID
  );

  const results: BenchmarkResult[] = [];

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Benchmark 1: Full Scan (Cold Cache)                    │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  // Clear cache
  client.clearCache();

  const fullScanResult = await runBenchmark('Full Scan (Cold)', async () => {
    return client.scanNotes(viewingKey, PROGRAM_ID, poolPda);
  });
  fullScanResult.stats = client.getLastScanStats();
  results.push(fullScanResult);

  console.log(`Duration: ${fullScanResult.duration.toFixed(2)}ms`);
  console.log(`Notes found: ${fullScanResult.notes}`);
  console.log(`Stats:`, fullScanResult.stats);

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Benchmark 2: Cached Scan (Warm Cache)                  │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  const cachedScanResult = await runBenchmark('Cached Scan (Warm)', async () => {
    return client.scanNotes(viewingKey, PROGRAM_ID, poolPda);
  });
  cachedScanResult.stats = client.getLastScanStats();
  results.push(cachedScanResult);

  console.log(`Duration: ${cachedScanResult.duration.toFixed(2)}ms`);
  console.log(`Notes found: ${cachedScanResult.notes}`);
  console.log(`Stats:`, cachedScanResult.stats);
  console.log(`Cache speedup: ${(fullScanResult.duration / cachedScanResult.duration).toFixed(2)}x`);

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Benchmark 3: Incremental Scan (Since Last Slot)        │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  const lastSlot = client.getLastScannedSlot(poolPda);
  console.log(`Last scanned slot: ${lastSlot}`);

  const incrementalResult = await runBenchmark('Incremental Scan', async () => {
    return client.scanNotes(viewingKey, PROGRAM_ID, poolPda, { sinceSlot: lastSlot });
  });
  incrementalResult.stats = client.getLastScanStats();
  results.push(incrementalResult);

  console.log(`Duration: ${incrementalResult.duration.toFixed(2)}ms`);
  console.log(`New notes found: ${incrementalResult.notes}`);
  console.log(`Stats:`, incrementalResult.stats);

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Benchmark 4: Parallel Batch Sizes                      │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  // Test different batch sizes
  const batchSizes = [1, 5, 10, 20];

  for (const batchSize of batchSizes) {
    client.clearCache();
    const result = await runBenchmark(`Batch Size ${batchSize}`, async () => {
      return client.scanNotes(viewingKey, PROGRAM_ID, poolPda, { parallelBatchSize: batchSize });
    });
    result.stats = client.getLastScanStats();
    results.push(result);

    console.log(`Batch ${batchSize}: ${result.duration.toFixed(2)}ms`);
  }

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Benchmark 5: Full Scan With Status (Nullifier Check)   │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  client.clearCache();

  const statusScanResult = await runBenchmark('Scan With Status', async () => {
    return client.scanNotesWithStatus(viewingKey, nullifierKey, PROGRAM_ID, poolPda);
  });
  statusScanResult.stats = client.getLastScanStats();
  results.push(statusScanResult);

  console.log(`Duration: ${statusScanResult.duration.toFixed(2)}ms`);
  console.log(`Notes found: ${statusScanResult.notes}`);
  console.log(`Stats:`, statusScanResult.stats);

  console.log('\n┌─────────────────────────────────────────────────────────┐');
  console.log('│  Benchmark 6: All Pools Scan (No Filter)                │');
  console.log('└─────────────────────────────────────────────────────────┘\n');

  client.clearCache();

  const allPoolsResult = await runBenchmark('All Pools Scan', async () => {
    return client.scanNotes(viewingKey, PROGRAM_ID);
  });
  allPoolsResult.stats = client.getLastScanStats();
  results.push(allPoolsResult);

  console.log(`Duration: ${allPoolsResult.duration.toFixed(2)}ms`);
  console.log(`Notes found: ${allPoolsResult.notes}`);
  console.log(`Stats:`, allPoolsResult.stats);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                      SUMMARY                            ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('┌────────────────────────────┬───────────┬───────┬────────┐');
  console.log('│ Benchmark                  │ Time (ms) │ Notes │ RPC    │');
  console.log('├────────────────────────────┼───────────┼───────┼────────┤');

  for (const r of results) {
    const name = r.name.padEnd(26);
    const time = r.duration.toFixed(0).padStart(9);
    const notes = r.notes.toString().padStart(5);
    const rpc = (r.stats?.rpcCalls || '?').toString().padStart(6);
    console.log(`│ ${name} │ ${time} │ ${notes} │ ${rpc} │`);
  }

  console.log('└────────────────────────────┴───────────┴───────┴────────┘');

  // Performance insights
  console.log('\n📊 Performance Insights:\n');

  if (cachedScanResult.duration < fullScanResult.duration / 2) {
    console.log('✅ Cache is working well - warm scans are significantly faster');
  } else {
    console.log('⚠️  Cache benefit is limited - may need more notes to see improvement');
  }

  const stats = fullScanResult.stats;
  if (stats) {
    const hitRate = stats.cachedHits / (stats.totalAccounts || 1) * 100;
    console.log(`📈 Cache hit rate: ${hitRate.toFixed(1)}%`);
    console.log(`🔍 Total accounts scanned: ${stats.totalAccounts}`);
    console.log(`🔓 Decrypt attempts: ${stats.decryptAttempts}`);
    console.log(`✅ Successful decrypts: ${stats.successfulDecrypts}`);
    console.log(`🌐 RPC calls: ${stats.rpcCalls}`);
  }

  // Save results
  const reportPath = path.join(__dirname, 'benchmark-results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    results: results.map(r => ({
      name: r.name,
      durationMs: r.duration,
      notesFound: r.notes,
      stats: r.stats,
    })),
  }, null, 2));
  console.log(`\n📄 Results saved to: ${reportPath}`);
}

main().catch(console.error);
