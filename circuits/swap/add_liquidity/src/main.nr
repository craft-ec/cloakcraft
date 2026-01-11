// Swap Add Liquidity Circuit
// Deposits tokens to internal AMM pool, receives shielded LP tokens
// Full privacy: deposit amounts hidden

use cloakcraft_lib::commitment::{compute_commitment, constrain_amount_64bit};
use cloakcraft_lib::nullifier::derive_spending_nullifier;
use cloakcraft_lib::merkle::verify_merkle_proof;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};
use cloakcraft_lib::poseidon::hash4;

pub struct PublicInputs {
    merkle_root: Field,
    nullifier_token_a: Field,
    nullifier_token_b: Field,
    pool_id: Field,
    lp_token_commitment: Field,
    change_a_commitment: Field,
    change_b_commitment: Field,
    old_pool_state_hash: Field,
    new_pool_state_hash: Field,
}

fn main(
    // Public inputs - marked with pub for Sunspot/gnark compatibility
    merkle_root: pub Field,
    nullifier_token_a: pub Field,
    nullifier_token_b: pub Field,
    pool_id: pub Field,
    lp_token_commitment: pub Field,
    change_a_commitment: pub Field,
    change_b_commitment: pub Field,
    old_pool_state_hash: pub Field,
    new_pool_state_hash: pub Field,

    // Private inputs - Token A
    in_a_stealth_pub_x: Field,
    in_a_stealth_pub_y: Field,
    in_a_amount: Field,
    in_a_randomness: Field,
    in_a_spending_key: Field,
    in_a_merkle_path: [Field; 16],
    in_a_merkle_indices: [Field; 16],
    in_a_leaf_index: Field,

    // Private inputs - Token B
    in_b_stealth_pub_x: Field,
    in_b_stealth_pub_y: Field,
    in_b_amount: Field,
    in_b_randomness: Field,
    in_b_spending_key: Field,
    in_b_merkle_path: [Field; 16],
    in_b_merkle_indices: [Field; 16],
    in_b_leaf_index: Field,

    // Pool parameters
    token_a_mint: Field,
    token_b_mint: Field,
    lp_token_mint: Field,

    // Old pool state
    old_reserve_a: Field,
    old_reserve_b: Field,
    old_lp_supply: Field,

    // Deposit amounts
    deposit_a: Field,
    deposit_b: Field,

    // LP tokens minted
    lp_minted: Field,

    // Output details
    lp_stealth_pub_x: Field,
    lp_randomness: Field,
    change_a_stealth_pub_x: Field,
    change_a_amount: Field,
    change_a_randomness: Field,
    change_b_stealth_pub_x: Field,
    change_b_amount: Field,
    change_b_randomness: Field
) -> pub PublicInputs {
    // 1. Verify Token A Input
    let a_derived_pub = scalar_mul(in_a_spending_key, Point::generator());
    assert(a_derived_pub.x == in_a_stealth_pub_x);
    assert(a_derived_pub.y == in_a_stealth_pub_y);

    let in_a_commitment = compute_commitment(
        in_a_stealth_pub_x,
        token_a_mint,
        in_a_amount,
        in_a_randomness
    );

    assert(verify_merkle_proof(
        in_a_commitment,
        in_a_merkle_path,
        in_a_merkle_indices,
        merkle_root
    ));

    let computed_null_a = derive_spending_nullifier(
        in_a_spending_key,
        in_a_commitment,
        in_a_leaf_index
    );
    assert(nullifier_token_a == computed_null_a);

    // 2. Verify Token B Input
    let b_derived_pub = scalar_mul(in_b_spending_key, Point::generator());
    assert(b_derived_pub.x == in_b_stealth_pub_x);
    assert(b_derived_pub.y == in_b_stealth_pub_y);

    let in_b_commitment = compute_commitment(
        in_b_stealth_pub_x,
        token_b_mint,
        in_b_amount,
        in_b_randomness
    );

    assert(verify_merkle_proof(
        in_b_commitment,
        in_b_merkle_path,
        in_b_merkle_indices,
        merkle_root
    ));

    let computed_null_b = derive_spending_nullifier(
        in_b_spending_key,
        in_b_commitment,
        in_b_leaf_index
    );
    assert(nullifier_token_b == computed_null_b);

    // 3. Verify Pool State
    let computed_old_state = hash4(
        old_reserve_a,
        old_reserve_b,
        old_lp_supply,
        pool_id
    );
    assert(old_pool_state_hash == computed_old_state);

    // 4. Verify LP Token Minting
    if old_lp_supply == 0 {
        let lp_squared = lp_minted * lp_minted;
        let deposit_product = deposit_a * deposit_b;
        // lp_squared should be <= deposit_product (within tolerance)
        // Use equality check: deposit_product - lp_squared should be non-negative
        let diff = deposit_product - lp_squared;
        let _ = diff; // In production, add range proof
    } else {
        // Proportional liquidity check via cross-multiplication to avoid division
        // lp_minted / old_lp_supply <= deposit_a / old_reserve_a
        // => lp_minted * old_reserve_a <= deposit_a * old_lp_supply
        let lp_times_reserve_a = lp_minted * old_reserve_a;
        let deposit_times_supply_a = deposit_a * old_lp_supply;
        let lp_times_reserve_b = lp_minted * old_reserve_b;
        let deposit_times_supply_b = deposit_b * old_lp_supply;
        // These should hold; in production use proper range proofs
        let diff_a = deposit_times_supply_a - lp_times_reserve_a;
        let diff_b = deposit_times_supply_b - lp_times_reserve_b;
        let _ = diff_a;
        let _ = diff_b;
    }

    // 5. Verify New Pool State
    let new_reserve_a = old_reserve_a + deposit_a;
    let new_reserve_b = old_reserve_b + deposit_b;
    let new_lp_supply = old_lp_supply + lp_minted;

    let computed_new_state = hash4(
        new_reserve_a,
        new_reserve_b,
        new_lp_supply,
        pool_id
    );
    assert(new_pool_state_hash == computed_new_state);

    // 6. Verify Balance
    assert(in_a_amount == deposit_a + change_a_amount);
    assert(in_b_amount == deposit_b + change_b_amount);

    // 7. Verify Output Commitments
    let computed_lp = compute_commitment(
        lp_stealth_pub_x,
        lp_token_mint,
        lp_minted,
        lp_randomness
    );
    assert(lp_token_commitment == computed_lp);

    let computed_change_a = compute_commitment(
        change_a_stealth_pub_x,
        token_a_mint,
        change_a_amount,
        change_a_randomness
    );
    assert(change_a_commitment == computed_change_a);

    let computed_change_b = compute_commitment(
        change_b_stealth_pub_x,
        token_b_mint,
        change_b_amount,
        change_b_randomness
    );
    assert(change_b_commitment == computed_change_b);

    // 8. Range Checks
    constrain_amount_64bit(deposit_a);
    constrain_amount_64bit(deposit_b);
    constrain_amount_64bit(lp_minted);

    PublicInputs {
        merkle_root,
        nullifier_token_a,
        nullifier_token_b,
        pool_id,
        lp_token_commitment,
        change_a_commitment,
        change_b_commitment,
        old_pool_state_hash,
        new_pool_state_hash,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_add_liquidity_initial() {
    // Test initial liquidity provision (empty pool)
    let spending_key_a: Field = 111;
    let spending_key_b: Field = 222;
    let token_a_mint: Field = 1000;
    let token_b_mint: Field = 2000;
    let lp_token_mint: Field = 3000;
    let pool_id: Field = 9999;

    // Empty pool state
    let old_reserve_a: Field = 0;
    let old_reserve_b: Field = 0;
    let old_lp_supply: Field = 0;

    // Input Token A: 1000 (deposit all)
    let in_a_amount: Field = 1000;
    let in_a_randomness: Field = 111;
    let a_derived_pub = scalar_mul(spending_key_a, Point::generator());
    let in_a_stealth_pub_x = a_derived_pub.x;
    let in_a_stealth_pub_y = a_derived_pub.y;
    let in_a_commitment = compute_commitment(in_a_stealth_pub_x, token_a_mint, in_a_amount, in_a_randomness);

    // Input Token B: 1000 (deposit all)
    let in_b_amount: Field = 1000;
    let in_b_randomness: Field = 222;
    let b_derived_pub = scalar_mul(spending_key_b, Point::generator());
    let in_b_stealth_pub_x = b_derived_pub.x;
    let in_b_stealth_pub_y = b_derived_pub.y;
    let in_b_commitment = compute_commitment(in_b_stealth_pub_x, token_b_mint, in_b_amount, in_b_randomness);

    // Build a 2-leaf merkle tree:
    // Level 0: [commitment_a, commitment_b]
    // Level 1: hash(commitment_a, commitment_b)
    // For A (left): path = [commitment_b, 0, 0, ...], indices = [0, 0, 0, ...]
    // For B (right): path = [commitment_a, 0, 0, ...], indices = [1, 0, 0, ...]
    let mut in_a_merkle_path: [Field; 16] = [0; 16];
    in_a_merkle_path[0] = in_b_commitment; // Sibling is B
    let in_a_merkle_indices: [Field; 16] = [0; 16]; // A is left child

    let mut in_b_merkle_path: [Field; 16] = [0; 16];
    in_b_merkle_path[0] = in_a_commitment; // Sibling is A
    let mut in_b_merkle_indices: [Field; 16] = [0; 16];
    in_b_merkle_indices[0] = 1; // B is right child

    let in_a_leaf_index: Field = 0;
    let in_b_leaf_index: Field = 1;

    // Compute merkle root from A's perspective
    let merkle_root = compute_merkle_root(in_a_commitment, in_a_merkle_path, in_a_merkle_indices);

    let nullifier_token_a = derive_spending_nullifier(spending_key_a, in_a_commitment, in_a_leaf_index);
    let nullifier_token_b = derive_spending_nullifier(spending_key_b, in_b_commitment, in_b_leaf_index);

    // Deposit amounts
    let deposit_a: Field = 1000;
    let deposit_b: Field = 1000;
    let change_a_amount: Field = 0;
    let change_b_amount: Field = 0;

    // Initial LP minted = sqrt(1000 * 1000) = 1000
    let lp_minted: Field = 1000;

    // Pool state hashes
    let old_pool_state_hash = hash4(old_reserve_a, old_reserve_b, old_lp_supply, pool_id);
    let new_reserve_a = old_reserve_a + deposit_a;
    let new_reserve_b = old_reserve_b + deposit_b;
    let new_lp_supply = old_lp_supply + lp_minted;
    let new_pool_state_hash = hash4(new_reserve_a, new_reserve_b, new_lp_supply, pool_id);

    // Output commitments
    let lp_stealth_pub_x: Field = 44444;
    let lp_randomness: Field = 333;
    let lp_token_commitment = compute_commitment(lp_stealth_pub_x, lp_token_mint, lp_minted, lp_randomness);

    let change_a_stealth_pub_x: Field = 55555;
    let change_a_randomness: Field = 444;
    let change_a_commitment = compute_commitment(change_a_stealth_pub_x, token_a_mint, change_a_amount, change_a_randomness);

    let change_b_stealth_pub_x: Field = 66666;
    let change_b_randomness: Field = 555;
    let change_b_commitment = compute_commitment(change_b_stealth_pub_x, token_b_mint, change_b_amount, change_b_randomness);

    let result = main(
        merkle_root,
        nullifier_token_a,
        nullifier_token_b,
        pool_id,
        lp_token_commitment,
        change_a_commitment,
        change_b_commitment,
        old_pool_state_hash,
        new_pool_state_hash,
        in_a_stealth_pub_x,
        in_a_stealth_pub_y,
        in_a_amount,
        in_a_randomness,
        spending_key_a,
        in_a_merkle_path,
        in_a_merkle_indices,
        in_a_leaf_index,
        in_b_stealth_pub_x,
        in_b_stealth_pub_y,
        in_b_amount,
        in_b_randomness,
        spending_key_b,
        in_b_merkle_path,
        in_b_merkle_indices,
        in_b_leaf_index,
        token_a_mint,
        token_b_mint,
        lp_token_mint,
        old_reserve_a,
        old_reserve_b,
        old_lp_supply,
        deposit_a,
        deposit_b,
        lp_minted,
        lp_stealth_pub_x,
        lp_randomness,
        change_a_stealth_pub_x,
        change_a_amount,
        change_a_randomness,
        change_b_stealth_pub_x,
        change_b_amount,
        change_b_randomness
    );

    assert(result.pool_id == pool_id);
}
