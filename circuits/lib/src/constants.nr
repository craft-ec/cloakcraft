// Domain separation constants for Poseidon hashes
// Prevents cross-protocol attacks by ensuring different hash contexts

// Domain tags (first 8 bytes of sha256 hash of domain string, converted to Field)
pub global COMMITMENT_DOMAIN: Field = 0x01;
pub global SPENDING_NULLIFIER_DOMAIN: Field = 0x02;
pub global ACTION_NULLIFIER_DOMAIN: Field = 0x03;
pub global NULLIFIER_KEY_DOMAIN: Field = 0x04;
pub global STEALTH_DOMAIN: Field = 0x05;
pub global MERKLE_DOMAIN: Field = 0x06;
pub global EMPTY_LEAF_DOMAIN: Field = 0x07;

// Merkle tree parameters
pub global MERKLE_TREE_DEPTH: u32 = 16;
pub global MAX_LEAVES: u32 = 65536; // 2^16

// BabyJubJub curve parameters
// Curve: ax^2 + y^2 = 1 + dx^2y^2
// a = 168700, d = 168696
pub global BABY_JUBJUB_A: Field = 168700;
pub global BABY_JUBJUB_D: Field = 168696;

// BabyJubJub base point (generator)
pub global BABY_JUBJUB_BASE_X: Field = 5299619240641551281634865583518297030282874472190772894086521144482721001553;
pub global BABY_JUBJUB_BASE_Y: Field = 16950150798460657717958625567821834550301663161624707787222815936182638968203;

// BabyJubJub subgroup order
pub global BABY_JUBJUB_ORDER: Field = 2736030358979909402780800718157159386076813972158567259200215660948447373041;
