// Nullifier Derivation
// Nullifiers prevent double-spending and double-voting

use crate::poseidon::{hash3, hash4};
use crate::constants::{SPENDING_NULLIFIER_DOMAIN, ACTION_NULLIFIER_DOMAIN, NULLIFIER_KEY_DOMAIN};

// Derive nullifier key from stealth spending key
// nullifier_key = Poseidon(NULLIFIER_KEY_DOMAIN, stealth_spending_key)
pub fn derive_nullifier_key(stealth_spending_key: Field) -> Field {
    hash3(NULLIFIER_KEY_DOMAIN, stealth_spending_key, 0)
}

// Spending nullifier - consumes the note permanently
// Used for: transfers, swaps, escrow creation
// spending_nullifier = Poseidon(SPENDING_DOMAIN, nullifier_key, commitment, leaf_index)
pub fn compute_spending_nullifier(
    nullifier_key: Field,
    commitment: Field,
    leaf_index: Field
) -> Field {
    hash4(SPENDING_NULLIFIER_DOMAIN, nullifier_key, commitment, leaf_index)
}

// Action nullifier - uses note without consuming it
// Used for: voting (same note can vote on different proposals)
// action_nullifier = Poseidon(ACTION_DOMAIN, nullifier_key, commitment, action_id)
pub fn compute_action_nullifier(
    nullifier_key: Field,
    commitment: Field,
    action_id: Field
) -> Field {
    hash4(ACTION_NULLIFIER_DOMAIN, nullifier_key, commitment, action_id)
}

// Full nullifier derivation from spending key
pub fn derive_spending_nullifier(
    stealth_spending_key: Field,
    commitment: Field,
    leaf_index: Field
) -> Field {
    let nullifier_key = derive_nullifier_key(stealth_spending_key);
    compute_spending_nullifier(nullifier_key, commitment, leaf_index)
}

// Full action nullifier derivation from spending key
pub fn derive_action_nullifier(
    stealth_spending_key: Field,
    commitment: Field,
    action_id: Field
) -> Field {
    let nullifier_key = derive_nullifier_key(stealth_spending_key);
    compute_action_nullifier(nullifier_key, commitment, action_id)
}

#[test]
fn test_spending_nullifier() {
    let spending_key: Field = 12345;
    let commitment: Field = 67890;
    let leaf_index: Field = 100;

    let nullifier = derive_spending_nullifier(spending_key, commitment, leaf_index);
    assert(nullifier != 0);
}

#[test]
fn test_action_nullifier() {
    let spending_key: Field = 12345;
    let commitment: Field = 67890;
    let action_id: Field = 1; // Proposal ID

    let nullifier = derive_action_nullifier(spending_key, commitment, action_id);
    assert(nullifier != 0);
}

#[test]
fn test_different_nullifier_types() {
    let spending_key: Field = 12345;
    let commitment: Field = 67890;
    let index_or_action: Field = 100;

    let spending_null = derive_spending_nullifier(spending_key, commitment, index_or_action);
    let action_null = derive_action_nullifier(spending_key, commitment, index_or_action);

    // Different domains should produce different nullifiers
    assert(spending_null != action_null);
}

#[test]
fn test_same_note_different_actions() {
    let spending_key: Field = 12345;
    let commitment: Field = 67890;

    let null_action1 = derive_action_nullifier(spending_key, commitment, 1);
    let null_action2 = derive_action_nullifier(spending_key, commitment, 2);

    // Same note can have different action nullifiers
    assert(null_action1 != null_action2);
}
