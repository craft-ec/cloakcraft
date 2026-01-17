//! CloakCraft error codes

use anchor_lang::prelude::*;

#[error_code]
pub enum CloakCraftError {
    // ============ Proof Errors ============
    #[msg("Invalid zero-knowledge proof")]
    InvalidProof,

    #[msg("Proof verification failed")]
    ProofVerificationFailed,

    #[msg("Invalid public inputs for proof")]
    InvalidPublicInputs,

    // ============ Merkle Tree Errors ============
    #[msg("Merkle root not found in current or historical roots")]
    InvalidMerkleRoot,

    #[msg("Merkle tree is full")]
    TreeFull,

    #[msg("Invalid merkle proof")]
    InvalidMerkleProof,

    // ============ Nullifier Errors ============
    #[msg("Nullifier has already been used")]
    NullifierAlreadyUsed,

    #[msg("Invalid nullifier derivation")]
    InvalidNullifier,

    // ============ Commitment Errors ============
    #[msg("Invalid commitment")]
    InvalidCommitment,

    #[msg("Commitment already exists")]
    CommitmentExists,

    #[msg("Commitment not found in Light Protocol state tree")]
    CommitmentNotFound,

    #[msg("Commitment inclusion proof verification failed")]
    CommitmentInclusionFailed,

    #[msg("Commitment account hash does not match derived address")]
    CommitmentAccountHashMismatch,

    #[msg("Commitment value mismatch")]
    CommitmentMismatch,

    // ============ Balance Errors ============
    #[msg("Insufficient balance")]
    InsufficientBalance,

    #[msg("Amount overflow")]
    AmountOverflow,

    #[msg("Invalid amount")]
    InvalidAmount,

    // ============ Token Errors ============
    #[msg("Invalid token mint")]
    InvalidTokenMint,

    #[msg("Token mint mismatch")]
    TokenMintMismatch,

    // ============ Pool Errors ============
    #[msg("Pool already initialized")]
    PoolAlreadyInitialized,

    #[msg("Pool not found")]
    PoolNotFound,

    // ============ Order/Escrow Errors ============
    #[msg("Order not found")]
    OrderNotFound,

    #[msg("Order already filled")]
    OrderAlreadyFilled,

    #[msg("Order expired")]
    OrderExpired,

    #[msg("Order not expired yet")]
    OrderNotExpired,

    #[msg("Invalid order terms")]
    InvalidOrderTerms,

    // ============ AMM Errors ============
    #[msg("AMM pool not found")]
    AmmPoolNotFound,

    #[msg("Tokens must be in canonical order (token_a < token_b by bytes)")]
    TokensNotInCanonicalOrder,

    #[msg("Slippage exceeded")]
    SlippageExceeded,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    #[msg("Invalid pool state transition")]
    InvalidPoolState,

    #[msg("Constant product invariant violated")]
    InvariantViolated,

    #[msg("Invalid LP token amount - must match calculated amount")]
    InvalidLpAmount,

    // ============ Governance Errors ============
    #[msg("Aggregation not found")]
    AggregationNotFound,

    #[msg("Aggregation not active")]
    AggregationNotActive,

    #[msg("Aggregation deadline passed")]
    AggregationDeadlinePassed,

    #[msg("Already voted on this proposal")]
    AlreadyVoted,

    #[msg("Invalid vote option")]
    InvalidVoteOption,

    #[msg("Decryption not complete")]
    DecryptionNotComplete,

    #[msg("Invalid decryption share")]
    InvalidDecryptionShare,

    #[msg("Threshold not met")]
    ThresholdNotMet,

    // ============ Adapter Errors ============
    #[msg("Adapter module not registered")]
    AdapterNotRegistered,

    #[msg("Adapter module disabled")]
    AdapterDisabled,

    #[msg("Adapter execution failed")]
    AdapterExecutionFailed,

    // ============ Admin Errors ============
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid verification key")]
    InvalidVerificationKey,

    #[msg("Verification key not found")]
    VerificationKeyNotFound,

    #[msg("Committee not found")]
    CommitteeNotFound,

    #[msg("Not a committee member")]
    NotCommitteeMember,

    // ============ Encryption Errors ============
    #[msg("Invalid encrypted note")]
    InvalidEncryptedNote,

    #[msg("Decryption failed")]
    DecryptionFailed,

    #[msg("Invalid ciphertext")]
    InvalidCiphertext,

    // ============ Light Protocol Errors ============
    #[msg("Light Protocol CPI failed")]
    LightProtocolError,

    #[msg("Light Protocol CPI operation failed")]
    LightCpiError,

    #[msg("Nullifier tree error")]
    NullifierTreeError,

    #[msg("Failed to insert nullifier")]
    NullifierInsertionFailed,

    #[msg("Nullifier has already been spent (compressed account exists)")]
    NullifierAlreadySpent,

    #[msg("Action nullifier has already been used (already voted)")]
    ActionNullifierAlreadyUsed,

    #[msg("Failed to create commitment compressed account")]
    CommitmentCreationFailed,

    #[msg("Commitment merkle proof verification failed")]
    CommitmentProofFailed,

    // ============ Cryptographic Errors ============
    #[msg("Poseidon hash computation failed")]
    PoseidonHashError,

    #[msg("Invalid proof length")]
    InvalidProofLength,

    #[msg("BN254 scalar multiplication failed")]
    Bn254MulError,

    #[msg("BN254 point addition failed")]
    Bn254AddError,

    #[msg("BN254 pairing check failed")]
    Bn254PairingError,

    // ============ Adapter CPI Errors ============
    #[msg("Adapter swap execution failed")]
    AdapterSwapFailed,

    // ============ Two-Phase Commit Errors ============
    #[msg("Too many pending commitments")]
    TooManyPendingCommitments,

    #[msg("Pending operation has expired")]
    PendingOperationExpired,

    #[msg("Pending operation not complete or expired")]
    PendingOperationNotComplete,

    #[msg("Invalid commitment index")]
    InvalidCommitmentIndex,

    #[msg("Commitment already created")]
    CommitmentAlreadyCreated,

    #[msg("Pool mismatch for commitment")]
    PoolMismatch,

    #[msg("Invalid relayer for pending operation")]
    InvalidRelayer,

    // ============ Generic Operation Errors ============
    #[msg("Invalid nullifier index")]
    InvalidNullifierIndex,

    #[msg("Nullifier already created")]
    NullifierAlreadyCreated,

    #[msg("Not all nullifiers have been created yet")]
    NullifiersNotComplete,

    #[msg("Nullifiers have not been created - required before processing unshield")]
    NullifiersNotCreated,

    // ============ Append Pattern State Machine Errors ============
    #[msg("ZK proof has not been verified - Phase 0 required")]
    ProofNotVerified,

    #[msg("Commitment existence has not been verified - Phase 1 required")]
    CommitmentNotVerified,

    #[msg("Commitment has already been verified")]
    CommitmentAlreadyVerified,

    #[msg("Nullifier has not been created - Phase 2 required")]
    NullifierNotCreated,

    // ============ Deprecated Feature Errors ============
    #[msg("This instruction is deprecated - use append pattern instead")]
    Deprecated,
}
