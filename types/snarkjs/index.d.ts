/**
 * Type declarations for snarkjs
 * Used for browser-based Groth16 proving
 */

declare module 'snarkjs' {
  export namespace groth16 {
    /**
     * Generate a Groth16 proof
     */
    function prove(
      zkeySource: { type: 'mem'; data: Uint8Array } | string,
      witnessSource: { type: 'mem'; data: Uint8Array } | string
    ): Promise<{
      proof: {
        pi_a: [string, string, string];
        pi_b: [[string, string], [string, string], [string, string]];
        pi_c: [string, string, string];
        protocol: 'groth16';
        curve: string;
      };
      publicSignals: string[];
    }>;

    /**
     * Verify a Groth16 proof
     */
    function verify(
      vkVerifier: object,
      publicSignals: string[],
      proof: object
    ): Promise<boolean>;

    /**
     * Full prove: witness generation + proving
     */
    function fullProve(
      inputs: Record<string, any>,
      wasmSource: string | Uint8Array,
      zkeySource: string | Uint8Array
    ): Promise<{
      proof: object;
      publicSignals: string[];
    }>;

    /**
     * Export solidity calldata
     */
    function exportSolidityCallData(
      proof: object,
      publicSignals: string[]
    ): Promise<string>;
  }

  export namespace wtns {
    /**
     * Calculate witness
     */
    function calculate(
      inputs: Record<string, any>,
      wasmSource: string | Uint8Array
    ): Promise<Uint8Array>;
  }

  export namespace zKey {
    /**
     * Export verification key
     */
    function exportVerificationKey(zkeySource: string | Uint8Array): Promise<object>;
  }
}
