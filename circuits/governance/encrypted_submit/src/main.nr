// Governance Encrypted Submit Circuit
// Proves token ownership and submits encrypted vote
// Full privacy: vote choice and power hidden via ElGamal encryption
// Note does NOT get spent (uses action nullifier, not spending nullifier)

use cloakcraft_lib::commitment::{compute_commitment, constrain_amount_64bit};
use cloakcraft_lib::nullifier::derive_action_nullifier;
use cloakcraft_lib::merkle::verify_merkle_proof;
use cloakcraft_lib::babyjubjub::{Point, scalar_mul};
use cloakcraft_lib::elgamal::encrypt;

pub struct PublicInputs {
    merkle_root: Field,
    action_nullifier: Field,
    proposal_id: Field,
    token_mint: Field,
    election_pubkey_x: Field,
    election_pubkey_y: Field,
    encrypted_yes_c1_x: Field,
    encrypted_yes_c1_y: Field,
    encrypted_yes_c2_x: Field,
    encrypted_yes_c2_y: Field,
    encrypted_no_c1_x: Field,
    encrypted_no_c1_y: Field,
    encrypted_no_c2_x: Field,
    encrypted_no_c2_y: Field,
    encrypted_abstain_c1_x: Field,
    encrypted_abstain_c1_y: Field,
    encrypted_abstain_c2_x: Field,
    encrypted_abstain_c2_y: Field,
}

fn main(
    // Public inputs - marked with pub for Sunspot/gnark compatibility
    merkle_root: pub Field,
    action_nullifier: pub Field,
    proposal_id: pub Field,
    token_mint: pub Field,
    election_pubkey_x: pub Field,
    election_pubkey_y: pub Field,
    encrypted_yes_c1_x: pub Field,
    encrypted_yes_c1_y: pub Field,
    encrypted_yes_c2_x: pub Field,
    encrypted_yes_c2_y: pub Field,
    encrypted_no_c1_x: pub Field,
    encrypted_no_c1_y: pub Field,
    encrypted_no_c2_x: pub Field,
    encrypted_no_c2_y: pub Field,
    encrypted_abstain_c1_x: pub Field,
    encrypted_abstain_c1_y: pub Field,
    encrypted_abstain_c2_x: pub Field,
    encrypted_abstain_c2_y: pub Field,

    // Private inputs - Note ownership
    in_stealth_pub_x: Field,
    in_stealth_pub_y: Field,
    in_amount: Field,
    in_randomness: Field,
    in_stealth_spending_key: Field,

    // Merkle proof
    merkle_path: [Field; 16],
    merkle_path_indices: [Field; 16],

    // Vote choice: 0 = Yes, 1 = No, 2 = Abstain
    vote_choice: Field,

    // ElGamal encryption randomness
    encryption_randomness_yes: Field,
    encryption_randomness_no: Field,
    encryption_randomness_abstain: Field
) -> pub PublicInputs {
    // 1. Verify Note Ownership
    let derived_pub = scalar_mul(in_stealth_spending_key, Point::generator());
    assert(derived_pub.x == in_stealth_pub_x);
    assert(derived_pub.y == in_stealth_pub_y);

    let in_commitment = compute_commitment(
        in_stealth_pub_x,
        token_mint,
        in_amount,
        in_randomness
    );

    // 2. Verify Merkle Inclusion
    assert(verify_merkle_proof(
        in_commitment,
        merkle_path,
        merkle_path_indices,
        merkle_root
    ));

    // 3. Verify Action Nullifier
    let computed_nullifier = derive_action_nullifier(
        in_stealth_spending_key,
        in_commitment,
        proposal_id
    );
    assert(action_nullifier == computed_nullifier);

    // 4. Verify Vote Choice is Valid
    assert(vote_choice * (vote_choice - 1) * (vote_choice - 2) == 0);

    // 5. Compute Vote Power Distribution
    let power_yes = if vote_choice == 0 { in_amount } else { 0 };
    let power_no = if vote_choice == 1 { in_amount } else { 0 };
    let power_abstain = if vote_choice == 2 { in_amount } else { 0 };

    // 6. Verify ElGamal Encryptions
    let election_pubkey = Point {
        x: election_pubkey_x,
        y: election_pubkey_y,
    };

    // Encrypt YES vote
    let expected_yes = encrypt(power_yes, election_pubkey, encryption_randomness_yes);
    assert(encrypted_yes_c1_x == expected_yes.c1.x);
    assert(encrypted_yes_c1_y == expected_yes.c1.y);
    assert(encrypted_yes_c2_x == expected_yes.c2.x);
    assert(encrypted_yes_c2_y == expected_yes.c2.y);

    // Encrypt NO vote
    let expected_no = encrypt(power_no, election_pubkey, encryption_randomness_no);
    assert(encrypted_no_c1_x == expected_no.c1.x);
    assert(encrypted_no_c1_y == expected_no.c1.y);
    assert(encrypted_no_c2_x == expected_no.c2.x);
    assert(encrypted_no_c2_y == expected_no.c2.y);

    // Encrypt ABSTAIN vote
    let expected_abstain = encrypt(power_abstain, election_pubkey, encryption_randomness_abstain);
    assert(encrypted_abstain_c1_x == expected_abstain.c1.x);
    assert(encrypted_abstain_c1_y == expected_abstain.c1.y);
    assert(encrypted_abstain_c2_x == expected_abstain.c2.x);
    assert(encrypted_abstain_c2_y == expected_abstain.c2.y);

    // 7. Range Checks
    constrain_amount_64bit(in_amount);

    PublicInputs {
        merkle_root,
        action_nullifier,
        proposal_id,
        token_mint,
        election_pubkey_x,
        election_pubkey_y,
        encrypted_yes_c1_x,
        encrypted_yes_c1_y,
        encrypted_yes_c2_x,
        encrypted_yes_c2_y,
        encrypted_no_c1_x,
        encrypted_no_c1_y,
        encrypted_no_c2_x,
        encrypted_no_c2_y,
        encrypted_abstain_c1_x,
        encrypted_abstain_c1_y,
        encrypted_abstain_c2_x,
        encrypted_abstain_c2_y,
    }
}

use cloakcraft_lib::merkle::compute_merkle_root;

#[test]
fn test_encrypted_submit_vote_yes() {
    // Test submitting a YES vote
    let spending_key: Field = 666;
    let token_mint: Field = 1000;
    let proposal_id: Field = 42;

    // Token holder's note
    let in_amount: Field = 100; // 100 tokens voting power
    let in_randomness: Field = 111;
    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;
    let in_commitment = compute_commitment(in_stealth_pub_x, token_mint, in_amount, in_randomness);

    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);

    // Action nullifier (not spending - note can be reused for other proposals)
    let action_nullifier = derive_action_nullifier(spending_key, in_commitment, proposal_id);

    // Election public key (for encrypting votes)
    let election_secret: Field = 12345;
    let election_pubkey = scalar_mul(election_secret, Point::generator());
    let election_pubkey_x = election_pubkey.x;
    let election_pubkey_y = election_pubkey.y;

    // Vote choice: 0 = Yes
    let vote_choice: Field = 0;

    // Encryption randomness
    let encryption_randomness_yes: Field = 777;
    let encryption_randomness_no: Field = 888;
    let encryption_randomness_abstain: Field = 999;

    // Compute encrypted votes
    // YES gets the full amount (100), NO and ABSTAIN get 0
    let encrypted_yes = encrypt(in_amount, election_pubkey, encryption_randomness_yes);
    let encrypted_no = encrypt(0, election_pubkey, encryption_randomness_no);
    let encrypted_abstain = encrypt(0, election_pubkey, encryption_randomness_abstain);

    let result = main(
        merkle_root,
        action_nullifier,
        proposal_id,
        token_mint,
        election_pubkey_x,
        election_pubkey_y,
        encrypted_yes.c1.x,
        encrypted_yes.c1.y,
        encrypted_yes.c2.x,
        encrypted_yes.c2.y,
        encrypted_no.c1.x,
        encrypted_no.c1.y,
        encrypted_no.c2.x,
        encrypted_no.c2.y,
        encrypted_abstain.c1.x,
        encrypted_abstain.c1.y,
        encrypted_abstain.c2.x,
        encrypted_abstain.c2.y,
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_amount,
        in_randomness,
        spending_key,
        merkle_path,
        merkle_path_indices,
        vote_choice,
        encryption_randomness_yes,
        encryption_randomness_no,
        encryption_randomness_abstain
    );

    assert(result.proposal_id == proposal_id);
    assert(result.action_nullifier == action_nullifier);
}

#[test]
fn test_encrypted_submit_vote_no() {
    // Test submitting a NO vote
    let spending_key: Field = 777;
    let token_mint: Field = 2000;
    let proposal_id: Field = 99;

    let in_amount: Field = 50;
    let in_randomness: Field = 222;
    let derived_pub = scalar_mul(spending_key, Point::generator());
    let in_stealth_pub_x = derived_pub.x;
    let in_stealth_pub_y = derived_pub.y;
    let in_commitment = compute_commitment(in_stealth_pub_x, token_mint, in_amount, in_randomness);

    let merkle_path: [Field; 16] = [0; 16];
    let merkle_path_indices: [Field; 16] = [0; 16];
    let merkle_root = compute_merkle_root(in_commitment, merkle_path, merkle_path_indices);
    let action_nullifier = derive_action_nullifier(spending_key, in_commitment, proposal_id);

    let election_secret: Field = 54321;
    let election_pubkey = scalar_mul(election_secret, Point::generator());

    // Vote choice: 1 = No
    let vote_choice: Field = 1;

    let encryption_randomness_yes: Field = 111;
    let encryption_randomness_no: Field = 222;
    let encryption_randomness_abstain: Field = 333;

    // NO gets the full amount (50), YES and ABSTAIN get 0
    let encrypted_yes = encrypt(0, election_pubkey, encryption_randomness_yes);
    let encrypted_no = encrypt(in_amount, election_pubkey, encryption_randomness_no);
    let encrypted_abstain = encrypt(0, election_pubkey, encryption_randomness_abstain);

    let result = main(
        merkle_root,
        action_nullifier,
        proposal_id,
        token_mint,
        election_pubkey.x,
        election_pubkey.y,
        encrypted_yes.c1.x,
        encrypted_yes.c1.y,
        encrypted_yes.c2.x,
        encrypted_yes.c2.y,
        encrypted_no.c1.x,
        encrypted_no.c1.y,
        encrypted_no.c2.x,
        encrypted_no.c2.y,
        encrypted_abstain.c1.x,
        encrypted_abstain.c1.y,
        encrypted_abstain.c2.x,
        encrypted_abstain.c2.y,
        in_stealth_pub_x,
        in_stealth_pub_y,
        in_amount,
        in_randomness,
        spending_key,
        merkle_path,
        merkle_path_indices,
        vote_choice,
        encryption_randomness_yes,
        encryption_randomness_no,
        encryption_randomness_abstain
    );

    assert(result.proposal_id == proposal_id);
}
