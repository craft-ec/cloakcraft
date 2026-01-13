/**
 * Type declarations for circomlibjs
 */
declare module 'circomlibjs' {
  export interface F {
    toObject(element: Uint8Array): bigint;
    fromObject(value: bigint): Uint8Array;
  }

  export interface Poseidon {
    (inputs: bigint[]): Uint8Array;
    F: F;
  }

  export function buildPoseidon(): Promise<Poseidon>;
}
