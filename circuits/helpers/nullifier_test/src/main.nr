// Simple nullifier test circuit
// Takes spending key, commitment, and leaf index as inputs
// Outputs nullifier key and spending nullifier

use cloakcraft_lib::nullifier::{derive_nullifier_key, compute_spending_nullifier};

fn main(
    spending_key: Field,
    commitment: Field,
    leaf_index: Field
) -> pub (Field, Field) {
    // Derive nullifier key
    let nullifier_key = derive_nullifier_key(spending_key);

    // Compute spending nullifier
    let nullifier = compute_spending_nullifier(nullifier_key, commitment, leaf_index);

    (nullifier_key, nullifier)
}
