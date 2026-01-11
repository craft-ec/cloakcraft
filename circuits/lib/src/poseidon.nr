// Poseidon hash wrapper
// Uses external poseidon library for Noir 1.0+

use dep::poseidon::poseidon2::Poseidon2;

// Hash with domain separation
pub fn hash_with_domain<let N: u32>(domain: Field, inputs: [Field; N]) -> Field {
    let mut all_inputs: [Field; N + 1] = [0; N + 1];
    all_inputs[0] = domain;
    for i in 0..N {
        all_inputs[i + 1] = inputs[i];
    }
    Poseidon2::hash(all_inputs, N + 1)
}

// Hash 2 elements
pub fn hash2(a: Field, b: Field) -> Field {
    Poseidon2::hash([a, b], 2)
}

// Hash 3 elements
pub fn hash3(a: Field, b: Field, c: Field) -> Field {
    Poseidon2::hash([a, b, c], 3)
}

// Hash 4 elements
pub fn hash4(a: Field, b: Field, c: Field, d: Field) -> Field {
    Poseidon2::hash([a, b, c, d], 4)
}

// Hash 5 elements
pub fn hash5(a: Field, b: Field, c: Field, d: Field, e: Field) -> Field {
    Poseidon2::hash([a, b, c, d, e], 5)
}

// Hash arbitrary array
pub fn hash_array<let N: u32>(inputs: [Field; N]) -> Field {
    Poseidon2::hash(inputs, N)
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
