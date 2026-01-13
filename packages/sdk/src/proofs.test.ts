/**
 * Proof generation tests
 *
 * Tests the proof generation infrastructure using Circom/snarkjs
 */

import { describe, it, expect, beforeAll } from 'vitest';
import * as path from 'path';
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
  const circomBuildDir = path.resolve(__dirname, '../../../circom-circuits/build');

  beforeAll(() => {
    generator = new ProofGenerator();
    generator.configureForNode({
      circuitsDir: path.resolve(__dirname, '../../../circom-circuits/circuits'),
      circomBuildDir,
    });
  });

  describe('circuit artifacts verification', () => {
    it('verifies circom circuit artifacts exist', () => {
      // Check that key files exist for a circuit
      expect(fs.existsSync(path.join(circomBuildDir, 'transfer_1x2.wasm'))).toBe(true);
      expect(fs.existsSync(path.join(circomBuildDir, 'transfer_1x2_final.zkey'))).toBe(true);
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
        circomBuildDir: '/custom/build',
      });

      expect(() => newGenerator.configureForNode()).not.toThrow();
    });
  });
});
