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

    #[msg("Swap output amount does not match AMM formula calculation")]
    InvalidSwapOutput,

    #[msg("Invalid amplification coefficient for StableSwap pool")]
    InvalidAmplification,

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

    // ============ Consolidation Errors ============
    #[msg("Invalid input count - must be between 2 and 3 for consolidation")]
    InvalidInputCount,

    // ============ Protocol Fee Errors ============
    #[msg("Invalid vault account")]
    InvalidVault,

    #[msg("Treasury ATA required when protocol fees are enabled")]
    InvalidTreasury,

    #[msg("Fee amount is less than required minimum")]
    InsufficientFee,

    // ============ Perpetual Futures Errors ============
    #[msg("Perps pool not found")]
    PerpsPoolNotFound,

    #[msg("Perps pool is not active")]
    PerpsPoolNotActive,

    #[msg("Perps market not found")]
    PerpsMarketNotFound,

    #[msg("Perps market is not active")]
    PerpsMarketNotActive,

    #[msg("Maximum tokens in pool reached")]
    MaxTokensReached,

    #[msg("Token already exists in pool")]
    TokenAlreadyInPool,

    #[msg("Token not found in pool")]
    TokenNotInPool,

    #[msg("Token is not active")]
    TokenNotActive,

    #[msg("Utilization limit exceeded")]
    UtilizationLimitExceeded,

    #[msg("Insufficient available liquidity")]
    InsufficientAvailableLiquidity,

    #[msg("Position size exceeds maximum")]
    PositionSizeExceeded,

    #[msg("Leverage exceeds maximum allowed")]
    LeverageExceeded,

    #[msg("Invalid leverage value")]
    InvalidLeverage,

    #[msg("Position not liquidatable")]
    PositionNotLiquidatable,

    #[msg("Position at profit bound - must close")]
    PositionAtProfitBound,

    #[msg("Invalid oracle price")]
    InvalidOraclePrice,

    #[msg("Oracle price is stale")]
    StaleOraclePrice,

    #[msg("Invalid Pyth price feed - feed ID mismatch")]
    InvalidPriceFeed,

    #[msg("Pyth price is stale - exceeds maximum age")]
    PriceStale,

    #[msg("Pyth price confidence interval too high")]
    PriceConfidenceTooHigh,

    #[msg("Invalid position direction")]
    InvalidPositionDirection,

    #[msg("Invalid margin amount")]
    InvalidMarginAmount,

    #[msg("Invalid position size")]
    InvalidPositionSize,

    #[msg("LP token amount mismatch")]
    LpAmountMismatch,

    #[msg("Withdrawal exceeds available balance")]
    WithdrawalExceedsAvailable,

    #[msg("Invalid borrow fee calculation")]
    InvalidBorrowFee,

    #[msg("Market base and quote tokens must be different")]
    SameBaseQuoteToken,

    #[msg("Invalid token index")]
    InvalidTokenIndex,

    // ============ Position Metadata Errors ============
    #[msg("Position metadata not found")]
    PositionMetaNotFound,

    #[msg("Failed to create position metadata")]
    PositionMetaCreationFailed,

    #[msg("Failed to update position metadata")]
    PositionMetaUpdateFailed,

    #[msg("Position is not active - may be liquidated or closed")]
    PositionNotActive,

    #[msg("Position has already been liquidated")]
    PositionAlreadyLiquidated,

    #[msg("Position has already been closed")]
    PositionAlreadyClosed,

    #[msg("Failed to create liquidation nullifier")]
    LiquidationNullifierFailed,

    #[msg("Position ID mismatch between commitment and metadata")]
    PositionIdMismatch,

    #[msg("Nullifier hash mismatch")]
    NullifierHashMismatch,

    // ============ Voting/Ballot Errors ============
    #[msg("Ballot not found")]
    BallotNotFound,

    #[msg("Ballot is not active for voting")]
    BallotNotActive,

    #[msg("Ballot has not been resolved yet")]
    BallotNotResolved,

    #[msg("Ballot has not been finalized yet")]
    BallotNotFinalized,

    #[msg("Ballot has already been finalized")]
    BallotAlreadyFinalized,

    #[msg("Ballot is already resolved")]
    BallotAlreadyResolved,

    #[msg("Invalid vote option - exceeds num_options")]
    InvalidVoteOptionRange,

    #[msg("Vote nullifier not found - user must vote before changing")]
    VoteNullifierNotFound,

    #[msg("Invalid binding mode for this operation")]
    InvalidBindingMode,

    #[msg("Invalid vote type for this ballot")]
    InvalidVoteTypeForBallot,

    #[msg("Invalid reveal mode for this operation")]
    InvalidRevealModeForOperation,

    #[msg("User not eligible to vote (not in whitelist)")]
    NotEligible,

    #[msg("Cannot vote with zero amount")]
    ZeroAmount,

    #[msg("Quorum threshold not met")]
    QuorumNotMet,

    #[msg("Invalid outcome value")]
    InvalidOutcomeValue,

    #[msg("Claims not allowed for Snapshot mode")]
    ClaimsNotAllowed,

    #[msg("Position already claimed (nullifier exists)")]
    ClaimAlreadyProcessed,

    #[msg("Claim deadline has passed")]
    ClaimDeadlinePassed,

    #[msg("Timelock has not expired yet")]
    TimelockNotExpired,

    #[msg("Invalid decryption key - does not match time_lock_pubkey")]
    InvalidDecryptionKey,

    #[msg("Invalid attestation signature")]
    InvalidAttestationSignature,

    #[msg("Invalid weight formula - evaluation error")]
    InvalidWeightFormula,

    #[msg("Position close not allowed outside voting period")]
    PositionCloseNotAllowed,

    #[msg("Invalid snapshot slot")]
    InvalidSnapshotSlot,

    #[msg("Invalid ballot timing - start_time must be before end_time")]
    InvalidBallotTiming,

    #[msg("Invalid number of options - must be between 1 and 16")]
    InvalidNumOptions,

    #[msg("Voting period has not started yet")]
    VotingNotStarted,

    #[msg("Voting period has ended")]
    VotingEnded,

    #[msg("Only authority can resolve in Authority mode")]
    UnauthorizedResolver,

    #[msg("Oracle has not submitted outcome")]
    OracleOutcomeNotSubmitted,

    #[msg("Tally must be decrypted before resolution")]
    TallyNotDecrypted,

    #[msg("Invalid eligibility proof")]
    InvalidEligibilityProof,

    #[msg("Weight formula too long")]
    WeightFormulaTooLong,

    #[msg("Too many weight parameters")]
    TooManyWeightParams,

    #[msg("Protocol fee exceeds maximum (10000 bps = 100%)")]
    ProtocolFeeExceedsMax,

    #[msg("Ballot ID mismatch - does not match expected ballot")]
    BallotIdMismatch,
}
