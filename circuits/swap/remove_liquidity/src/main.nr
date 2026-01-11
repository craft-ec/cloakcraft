// Swap Remove Liquidity Circuit
// Burns LP tokens and withdraws proportional share of pool assets
// Full privacy

use cloakcraft_lib::commitment::{compute_commitment, constrain_amount_64bit};
use cloakcraft_lib::nullifier::derive_spending_nullifier;
use cloakcraft_lib::merkle::verify_merkle_proof;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};
use cloakcraft_lib::poseidon::hash4;

pub struct PublicInputs {
    merkle_root: Field,
    lp_nullifier: Field,
    pool_id: Field,
    out_token_a_commitment: Field,
    out_token_b_commitment: Field,
    old_pool_state_hash: Field,
    new_pool_state_hash: Field,
}

fn main(
    // Public inputs
    merkle_root: Field,
    lp_nullifier: Field,
    pool_id: Field,
    out_token_a_commitment: Field,
    out_token_b_commitment: Field,
    old_pool_state_hash: Field,
    new_pool_state_hash: Field,

    // Private inputs - LP Token
    lp_stealth_pub_x: Field,
    lp_stealth_pub_y: Field,
    lp_amount: Field,
    lp_randomness: Field,
    lp_spending_key: Field,
    lp_merkle_path: [Field; 16],
    lp_merkle_indices: [Field; 16],
    lp_leaf_index: Field,

    // Pool parameters
    token_a_mint: Field,
    token_b_mint: Field,
    lp_token_mint: Field,

    // Old pool state
    old_reserve_a: Field,
    old_reserve_b: Field,
    old_lp_supply: Field,

    // Withdrawal amounts
    withdraw_a: Field,
    withdraw_b: Field,

    // Output details
    out_a_stealth_pub_x: Field,
    out_a_randomness: Field,
    out_b_stealth_pub_x: Field,
    out_b_randomness: Field
) -> pub PublicInputs {
    // 1. Verify LP Token Input
    let lp_derived_pub = scalar_mul(lp_spending_key, Point::generator());
    assert(lp_derived_pub.x == lp_stealth_pub_x);
    assert(lp_derived_pub.y == lp_stealth_pub_y);

    let lp_commitment = compute_commitment(
        lp_stealth_pub_x,
        lp_token_mint,
        lp_amount,
        lp_randomness
    );

    assert(verify_merkle_proof(
        lp_commitment,
        lp_merkle_path,
        lp_merkle_indices,
        merkle_root
    ));

    let computed_nullifier = derive_spending_nullifier(
        lp_spending_key,
        lp_commitment,
        lp_leaf_index
    );
    assert(lp_nullifier == computed_nullifier);

    // 2. Verify Pool State
    let computed_old_state = hash4(
        old_reserve_a,
        old_reserve_b,
        old_lp_supply,
        pool_id
    );
    assert(old_pool_state_hash == computed_old_state);

    // 3. Verify Proportional Withdrawal
    let expected_a_times_supply = lp_amount * old_reserve_a;
    let actual_a_times_supply = withdraw_a * old_lp_supply;
    assert(actual_a_times_supply == expected_a_times_supply);

    let expected_b_times_supply = lp_amount * old_reserve_b;
    let actual_b_times_supply = withdraw_b * old_lp_supply;
    assert(actual_b_times_supply == expected_b_times_supply);

    // 4. Verify New Pool State
    let new_reserve_a = old_reserve_a - withdraw_a;
    let new_reserve_b = old_reserve_b - withdraw_b;
    let new_lp_supply = old_lp_supply - lp_amount;

    let computed_new_state = hash4(
        new_reserve_a,
        new_reserve_b,
        new_lp_supply,
        pool_id
    );
    assert(new_pool_state_hash == computed_new_state);

    // 5. Verify Output Commitments
    let computed_out_a = compute_commitment(
        out_a_stealth_pub_x,
        token_a_mint,
        withdraw_a,
        out_a_randomness
    );
    assert(out_token_a_commitment == computed_out_a);

    let computed_out_b = compute_commitment(
        out_b_stealth_pub_x,
        token_b_mint,
        withdraw_b,
        out_b_randomness
    );
    assert(out_token_b_commitment == computed_out_b);

    // 6. Range Checks
    constrain_amount_64bit(lp_amount);
    constrain_amount_64bit(withdraw_a);
    constrain_amount_64bit(withdraw_b);

    PublicInputs {
        merkle_root,
        lp_nullifier,
        pool_id,
        out_token_a_commitment,
        out_token_b_commitment,
        old_pool_state_hash,
        new_pool_state_hash,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_remove_liquidity_basic() {
    // Test removing liquidity from pool
    let lp_spending_key: Field = 333;
    let token_a_mint: Field = 1000;
    let token_b_mint: Field = 2000;
    let lp_token_mint: Field = 3000;
    let pool_id: Field = 8888;

    // Pool state: 10000 A, 10000 B, 1000 LP
    let old_reserve_a: Field = 10000;
    let old_reserve_b: Field = 10000;
    let old_lp_supply: Field = 1000;

    // LP token input: burn 100 LP
    let lp_amount: Field = 100;
    let lp_randomness: Field = 111;
    let lp_derived_pub = scalar_mul(lp_spending_key, Point::generator());
    let lp_stealth_pub_x = lp_derived_pub.x;
    let lp_stealth_pub_y = lp_derived_pub.y;
    let lp_commitment = compute_commitment(lp_stealth_pub_x, lp_token_mint, lp_amount, lp_randomness);
    let lp_merkle_path: [Field; 16] = [0; 16];
    let lp_merkle_indices: [Field; 16] = [0; 16];
    let lp_leaf_index: Field = 0;
    let merkle_root = compute_merkle_root(lp_commitment, lp_merkle_path, lp_merkle_indices);
    let lp_nullifier = derive_spending_nullifier(lp_spending_key, lp_commitment, lp_leaf_index);

    // Proportional withdrawal: 100/1000 * 10000 = 1000 each
    let withdraw_a: Field = 1000;
    let withdraw_b: Field = 1000;

    // Pool state hashes
    let old_pool_state_hash = hash4(old_reserve_a, old_reserve_b, old_lp_supply, pool_id);
    let new_reserve_a = old_reserve_a - withdraw_a;
    let new_reserve_b = old_reserve_b - withdraw_b;
    let new_lp_supply = old_lp_supply - lp_amount;
    let new_pool_state_hash = hash4(new_reserve_a, new_reserve_b, new_lp_supply, pool_id);

    // Output commitments
    let out_a_stealth_pub_x: Field = 44444;
    let out_a_randomness: Field = 222;
    let out_token_a_commitment = compute_commitment(out_a_stealth_pub_x, token_a_mint, withdraw_a, out_a_randomness);

    let out_b_stealth_pub_x: Field = 55555;
    let out_b_randomness: Field = 333;
    let out_token_b_commitment = compute_commitment(out_b_stealth_pub_x, token_b_mint, withdraw_b, out_b_randomness);

    let result = main(
        merkle_root,
        lp_nullifier,
        pool_id,
        out_token_a_commitment,
        out_token_b_commitment,
        old_pool_state_hash,
        new_pool_state_hash,
        lp_stealth_pub_x,
        lp_stealth_pub_y,
        lp_amount,
        lp_randomness,
        lp_spending_key,
        lp_merkle_path,
        lp_merkle_indices,
        lp_leaf_index,
        token_a_mint,
        token_b_mint,
        lp_token_mint,
        old_reserve_a,
        old_reserve_b,
        old_lp_supply,
        withdraw_a,
        withdraw_b,
        out_a_stealth_pub_x,
        out_a_randomness,
        out_b_stealth_pub_x,
        out_b_randomness
    );

    assert(result.pool_id == pool_id);
    assert(result.lp_nullifier == lp_nullifier);
}
