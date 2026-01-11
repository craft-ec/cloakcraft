/**
 * Proof generation tests
 *
 * Tests the proof generation infrastructure using Sunspot
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { ProofGenerator, parseGroth16Proof, serializeGroth16Proof } from './proofs';

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let v = value;
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return bytes;
}

describe('ProofGenerator', () => {
  let generator: ProofGenerator;
  const circuitsDir = path.resolve(__dirname, '../../../circuits');

  beforeAll(() => {
    generator = new ProofGenerator();
    generator.configureForNode({
      circuitsDir,
      sunspotPath: path.resolve(__dirname, '../../../scripts/sunspot'),
      nargoPath: path.join(os.homedir(), '.nargo/bin/nargo'),
    });
  });

  describe('circuit loading', () => {
    it('loads transfer/1x2 circuit from filesystem', async () => {
      await generator.loadCircuit('transfer/1x2');
      expect(generator.hasCircuit('transfer/1x2')).toBe(true);
    });

    it('loads adapter/1x1 circuit from filesystem', async () => {
      await generator.loadCircuit('adapter/1x1');
      expect(generator.hasCircuit('adapter/1x1')).toBe(true);
    });

    it('loads market/order_create circuit from filesystem', async () => {
      await generator.loadCircuit('market/order_create');
      expect(generator.hasCircuit('market/order_create')).toBe(true);
    });

    it('returns false for unloaded circuit', () => {
      expect(generator.hasCircuit('nonexistent/circuit')).toBe(false);
    });

    it('initializes all circuits', async () => {
      const newGenerator = new ProofGenerator();
      newGenerator.configureForNode({ circuitsDir });

      await newGenerator.initialize();

      // Check all circuits are loaded
      expect(newGenerator.hasCircuit('transfer/1x2')).toBe(true);
      expect(newGenerator.hasCircuit('transfer/1x3')).toBe(true);
      expect(newGenerator.hasCircuit('adapter/1x1')).toBe(true);
      expect(newGenerator.hasCircuit('adapter/1x2')).toBe(true);
      expect(newGenerator.hasCircuit('market/order_create')).toBe(true);
      expect(newGenerator.hasCircuit('market/order_fill')).toBe(true);
      expect(newGenerator.hasCircuit('market/order_cancel')).toBe(true);
      expect(newGenerator.hasCircuit('swap/add_liquidity')).toBe(true);
      expect(newGenerator.hasCircuit('swap/remove_liquidity')).toBe(true);
      expect(newGenerator.hasCircuit('swap/swap')).toBe(true);
      expect(newGenerator.hasCircuit('governance/encrypted_submit')).toBe(true);
    }, 10000);
  });

  describe('circuit artifacts verification', () => {
    it('verifies circuit artifacts exist on filesystem', () => {
      const targetDir = path.join(circuitsDir, 'target');

      // Check that key files exist for a circuit
      expect(fs.existsSync(path.join(targetDir, 'transfer_1x2.json'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'transfer_1x2.ccs'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'transfer_1x2.pk'))).toBe(true);
      expect(fs.existsSync(path.join(targetDir, 'transfer_1x2.vk'))).toBe(true);
    });

    it('verifies sunspot binary exists', () => {
      const sunspotPath = path.resolve(__dirname, '../../../scripts/sunspot');
      expect(fs.existsSync(sunspotPath)).toBe(true);
    });

    it('verifies nargo binary exists', () => {
      const nargoPath = path.join(os.homedir(), '.nargo/bin/nargo');
      expect(fs.existsSync(nargoPath)).toBe(true);
    });
  });

  describe('proof serialization', () => {
    it('parses and serializes Groth16 proofs', () => {
      // Create a mock proof
      const mockProof = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        mockProof[i] = i % 256;
      }

      // Parse into components
      const parsed = parseGroth16Proof(mockProof);
      expect(parsed.a.length).toBe(64);
      expect(parsed.b.length).toBe(128);
      expect(parsed.c.length).toBe(64);

      // Serialize back
      const serialized = serializeGroth16Proof(parsed);
      expect(serialized.length).toBe(256);

      // Verify round-trip
      for (let i = 0; i < 256; i++) {
        expect(serialized[i]).toBe(mockProof[i]);
      }
    });

    it('rejects invalid proof length', () => {
      const invalidProof = new Uint8Array(100);
      expect(() => parseGroth16Proof(invalidProof)).toThrow('Invalid proof length');
    });
  });

  describe('node configuration', () => {
    it('configures for Node.js with auto-detected paths', () => {
      const newGenerator = new ProofGenerator();
      newGenerator.configureForNode();

      // After configuration, should be able to load circuits
      // (the actual paths are configured internally)
      expect(() => newGenerator.configureForNode()).not.toThrow();
    });

    it('configures for Node.js with custom paths', () => {
      const newGenerator = new ProofGenerator();
      newGenerator.configureForNode({
        circuitsDir: '/custom/circuits',
        sunspotPath: '/custom/sunspot',
        nargoPath: '/custom/nargo',
      });

      expect(() => newGenerator.configureForNode()).not.toThrow();
    });
  });
});
