// Poseidon hash wrapper
// Uses external poseidon library for Noir 1.0+
// Using Poseidon (not Poseidon2) for circomlibjs compatibility

use dep::poseidon::poseidon::bn254::{hash_2, hash_3, hash_4, hash_5, hash_6};

// Hash with domain separation
// Domain is prepended as first element
pub fn hash_with_domain<let N: u32>(domain: Field, inputs: [Field; N]) -> Field {
    // For domain separation, we prepend domain to inputs
    // This requires calling the appropriate hash_N function based on total size
    let mut all_inputs: [Field; N + 1] = [0; N + 1];
    all_inputs[0] = domain;
    for i in 0..N {
        all_inputs[i + 1] = inputs[i];
    }
    hash_array(all_inputs)
}

// Hash 2 elements
pub fn hash2(a: Field, b: Field) -> Field {
    hash_2([a, b])
}

// Hash 3 elements
pub fn hash3(a: Field, b: Field, c: Field) -> Field {
    hash_3([a, b, c])
}

// Hash 4 elements
pub fn hash4(a: Field, b: Field, c: Field, d: Field) -> Field {
    hash_4([a, b, c, d])
}

// Hash 5 elements
pub fn hash5(a: Field, b: Field, c: Field, d: Field, e: Field) -> Field {
    hash_5([a, b, c, d, e])
}

// Hash arbitrary array (up to 6 elements for now)
pub fn hash_array<let N: u32>(inputs: [Field; N]) -> Field {
    // Poseidon bn254 provides hash_2 through hash_6
    // We need to match the input size
    if N == 2 {
        hash_2([inputs[0], inputs[1]])
    } else if N == 3 {
        hash_3([inputs[0], inputs[1], inputs[2]])
    } else if N == 4 {
        hash_4([inputs[0], inputs[1], inputs[2], inputs[3]])
    } else if N == 5 {
        hash_5([inputs[0], inputs[1], inputs[2], inputs[3], inputs[4]])
    } else if N == 6 {
        hash_6([inputs[0], inputs[1], inputs[2], inputs[3], inputs[4], inputs[5]])
    } else {
        // For larger inputs, we'd need to implement sponge construction
        // For now, assert this doesn't happen
        assert(false, "hash_array only supports up to 6 elements");
        0
    }
}

#[test]
fn test_hash2() {
    let result = hash2(1, 2);
    assert(result != 0);
}

#[test]
fn test_hash_with_domain() {
    let result1 = hash_with_domain(0x01, [1, 2]);
    let result2 = hash_with_domain(0x02, [1, 2]);
    // Different domains should produce different hashes
    assert(result1 != result2);
}
