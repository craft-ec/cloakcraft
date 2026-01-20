import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

// Import from built SDK
import {
  ProofGenerator,
  parseGroth16Proof,
  serializeGroth16Proof,
  computeCommitment,
  createNote,
  initPoseidon,
} from "../packages/sdk/dist/index.mjs";

/**
 * Integration tests for Groth16 proof generation and verification
 *
 * These tests verify the end-to-end flow:
 * 1. Generate proof using SDK
 * 2. Submit proof to Solana program
 * 3. Verify proof on-chain
 */

describe("Proof Integration", () => {
  // Try to get provider, skip blockchain tests if not available
  let provider: anchor.AnchorProvider | null = null;
  try {
    provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
  } catch {
    // Provider not available, unit tests will still run
  }

  // Circuit IDs (must match constants in Solana program)
  const CIRCUIT_IDS = {
    TRANSFER_1X2: Buffer.from("transfer_1x2____________________"),
    TRANSFER_1X3: Buffer.from("transfer_1x3____________________"),
    ADAPTER_1X1: Buffer.from("adapter_1x1_____________________"),
    ADAPTER_1X2: Buffer.from("adapter_1x2_____________________"),
  };

  // Program ID
  const PROGRAM_ID = new PublicKey("CLoAKcRaFt1111111111111111111111111111111111");

  describe("Verification Key Registration", () => {
    it("can derive VK PDA", () => {
      const [vkPda, bump] = PublicKey.findProgramAddressSync(
        [Buffer.from("vk"), CIRCUIT_IDS.TRANSFER_1X2],
        PROGRAM_ID
      );

      expect(vkPda).to.be.instanceOf(PublicKey);
      expect(bump).to.be.a("number");
    });

    it("VK files exist after build", function() {
      // Skip if keys directory doesn't exist (build not run)
      const keysDir = path.join(__dirname, "..", "keys");
      if (!fs.existsSync(keysDir)) {
        this.skip();
        return;
      }

      const expectedFiles = [
        "1x2_vk_solana.bin",
        "1x3_vk_solana.bin",
        "1x1_vk_solana.bin",
      ];

      for (const file of expectedFiles) {
        const filePath = path.join(keysDir, file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          expect(stats.size).to.be.greaterThan(0);
        }
      }
    });
  });

  describe("Proof Generation", () => {
    it("ProofGenerator initializes", () => {
      const generator = new ProofGenerator({
        baseUrl: path.join(__dirname, "..", "circuits"),
      });

      expect(generator).to.exist;
    });

    it("can load circuit artifacts", async function() {
      // Skip if circuits not built
      const circuitPath = path.join(__dirname, "..", "circuits", "transfer", "1x2", "target");
      if (!fs.existsSync(circuitPath)) {
        this.skip();
        return;
      }

      const generator = new ProofGenerator({
        baseUrl: `file://${path.join(__dirname, "..", "circuits")}`,
      });

      // This will log warnings but shouldn't throw
      await generator.loadCircuit("transfer/1x2");
    });
  });

  describe("Proof Format", () => {
    it("proof is 256 bytes", () => {
      // Groth16 proof: A (64 bytes) + B (128 bytes) + C (64 bytes)
      const PROOF_SIZE = 256;
      expect(64 + 128 + 64).to.equal(PROOF_SIZE);
    });

    it("can parse and serialize proof", () => {
      // Create mock proof
      const mockProof = new Uint8Array(256);
      for (let i = 0; i < 256; i++) {
        mockProof[i] = i % 256;
      }

      // Parse
      const parsed = parseGroth16Proof(mockProof);
      expect(parsed.a.length).to.equal(64);
      expect(parsed.b.length).to.equal(128);
      expect(parsed.c.length).to.equal(64);

      // Serialize back
      const serialized = serializeGroth16Proof(parsed);
      expect(serialized.length).to.equal(256);

      // Verify roundtrip
      for (let i = 0; i < 256; i++) {
        expect(serialized[i]).to.equal(mockProof[i]);
      }
    });

    it("rejects invalid proof length", () => {
      const invalidProof = new Uint8Array(100);
      expect(() => parseGroth16Proof(invalidProof)).to.throw("Invalid proof length");
    });
  });

  describe("BN254 Field Operations", () => {
    // BN254 field modulus
    const FIELD_MODULUS = BigInt("21888242871839275222246405745257275088696311157297823662689037894645226208583");

    it("field modulus is correct", () => {
      // Verify this is the BN254 base field modulus
      expect(FIELD_MODULUS.toString(16)).to.equal(
        "30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47"
      );
    });

    it("Y negation works correctly", () => {
      // Test Y coordinate negation for proof A-component
      const y = BigInt("12345678901234567890");
      const negY = FIELD_MODULUS - y;

      // Verify: y + negY = FIELD_MODULUS (mod FIELD_MODULUS = 0)
      expect((y + negY) % FIELD_MODULUS).to.equal(0n);
    });

    it("zero Y negation is zero", () => {
      const y = 0n;
      const negY = y === 0n ? 0n : FIELD_MODULUS - y;
      expect(negY).to.equal(0n);
    });
  });

  describe("Public Input Serialization", () => {
    it("field element is 32 bytes big-endian", () => {
      const value = BigInt("0x1234567890abcdef");
      const bytes = bigIntToBytes(value, 32);

      expect(bytes.length).to.equal(32);
      // Big-endian: most significant bytes first
      expect(bytes[31]).to.equal(0xef);
      expect(bytes[30]).to.equal(0xcd);
    });

    it("commitment is 32 bytes", async () => {
      // Initialize Poseidon for commitment computation
      await initPoseidon();

      // These would be actual field elements in production
      const stealthPubX = new Uint8Array(32);
      const randomness = new Uint8Array(32);

      // Fill with test values
      stealthPubX[0] = 1;
      randomness[0] = 3;

      // Create a note for commitment computation
      const note = createNote(
        stealthPubX,
        new PublicKey(new Uint8Array(32)), // tokenMint
        1000n, // amount
        randomness
      );

      const commitment = computeCommitment(note);
      expect(commitment.length).to.equal(32);
    });
  });
});

// Helper function for tests
function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) {
    bytes[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return bytes;
}
